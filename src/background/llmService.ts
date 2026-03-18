import { STORAGE_KEYS, DEFAULT_PROXY_URL, DEFAULT_MODELS } from "../shared/config";
import type { LLMProvider } from "../shared/config";
import {
  buildSystemPrompt,
  buildFileSystemPrompt,
  buildEnrichedSystemPrompt,
} from "../shared/constants";
import { parsePromptSuggestions } from "../shared/parsing";
import { resolveSkillsForDiff } from "./skillResolver";
import { sendToPort } from "./helpers";
import type {
  ChatMessage,
  PRContext,
  EnrichedPRContext,
  GeneratePRSummaryRequest,
  GeneratePRSummaryResponse,
  PromptSuggestion,
} from "../shared/types";

const ANTHROPIC_API_VERSION = "2023-06-01";
const SUMMARY_MAX_TOKENS = 500;
const CHAT_MAX_TOKENS = 4096;
const SUMMARY_DESCRIPTION_LIMIT = 500;
const SUMMARY_TOP_FILES_LIMIT = 10;

interface LLMSettings {
  provider: LLMProvider;
  apiKey: string | null;
  modelName: string;
  proxyUrl: string;
}

export async function getSettings(): Promise<LLMSettings> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(
      [
        STORAGE_KEYS.API_KEY,
        STORAGE_KEYS.LLM_PROVIDER,
        STORAGE_KEYS.MODEL_NAME,
        STORAGE_KEYS.PROXY_URL,
      ],
      (result) => {
        const provider = (result[STORAGE_KEYS.LLM_PROVIDER] as LLMProvider) || "anthropic";
        const raw = (result[STORAGE_KEYS.PROXY_URL] as string) || "";
        const modelName = (result[STORAGE_KEYS.MODEL_NAME] as string) || DEFAULT_MODELS[provider];
        resolve({
          provider,
          apiKey: (result[STORAGE_KEYS.API_KEY] as string) ?? null,
          modelName,
          proxyUrl: raw.startsWith("https://") ? raw : DEFAULT_PROXY_URL,
        });
      },
    );
  });
}

export function buildAnthropicRequest(
  apiKey: string,
  proxyUrl: string,
  body: Record<string, unknown>,
  signal?: AbortSignal,
): { endpoint: string; init: RequestInit } {
  return {
    endpoint: `${proxyUrl.replace(/\/$/, "")}/v1/messages`,
    init: {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_API_VERSION,
      },
      body: JSON.stringify(body),
      signal,
    },
  };
}

export function buildOpenAIRequest(
  apiKey: string,
  proxyUrl: string,
  body: Record<string, unknown>,
  signal?: AbortSignal,
): { endpoint: string; init: RequestInit } {
  return {
    endpoint: `${proxyUrl.replace(/\/$/, "")}/openai/v1/chat/completions`,
    init: {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal,
    },
  };
}

export function extractTextFromResponse(
  provider: LLMProvider,
  data: Record<string, unknown>,
): string {
  if (provider === "openai") {
    const choices = data.choices as Array<{ message?: { content?: string } }> | undefined;
    return choices?.[0]?.message?.content ?? "";
  }
  const content = data.content as Array<{ text?: string }> | undefined;
  return content?.[0]?.text ?? "";
}

export function extractStreamDelta(
  provider: LLMProvider,
  event: Record<string, unknown>,
): string | null {
  if (provider === "openai") {
    const choices = event.choices as Array<{ delta?: { content?: string } }> | undefined;
    return choices?.[0]?.delta?.content ?? null;
  }
  if (event.type === "content_block_delta") {
    const delta = event.delta as { type?: string; text?: string } | undefined;
    if (delta?.type === "text_delta") return delta.text ?? null;
  }
  return null;
}

export async function fetchModels(
  provider: LLMProvider,
  apiKey: string,
  proxyUrl: string,
): Promise<string[]> {
  const endpoint =
    provider === "openai"
      ? `${proxyUrl.replace(/\/$/, "")}/openai/v1/models`
      : `${proxyUrl.replace(/\/$/, "")}/v1/models`;

  const headers: Record<string, string> =
    provider === "openai"
      ? { Authorization: `Bearer ${apiKey}` }
      : { "x-api-key": apiKey, "anthropic-version": ANTHROPIC_API_VERSION };

  const response = await fetch(endpoint, { method: "GET", headers });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const data = (await response.json()) as { data: { id: string; created?: number }[] };

  // Sort newest-first using the `created` timestamp every provider includes.
  // This naturally surfaces the latest models without any provider-specific logic.
  return data.data
    .slice()
    .sort((a, b) => (b.created ?? 0) - (a.created ?? 0))
    .map((m) => m.id);
}

export async function handleFetchModels(
  provider: LLMProvider,
  apiKey: string,
): Promise<{ ok: boolean; models?: string[]; error?: string }> {
  try {
    const { proxyUrl } = await getSettings();
    const models = await fetchModels(provider, apiKey, proxyUrl);
    return { ok: true, models };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to fetch models" };
  }
}

export async function handleGeneratePRSummary(
  msg: GeneratePRSummaryRequest,
): Promise<GeneratePRSummaryResponse> {
  const { provider, apiKey, modelName, proxyUrl } = await getSettings();
  if (!apiKey) return { ok: false, error: "No API key configured." };

  const topFiles = [...msg.stats.files]
    .sort((a, b) => b.additions + b.deletions - (a.additions + a.deletions))
    .slice(0, SUMMARY_TOP_FILES_LIMIT)
    .map((f) => `${f.filename} (+${f.additions}/-${f.deletions})`)
    .join("\n");

  const prompt = `You are helping a code reviewer quickly understand a pull request.

Today's date: ${new Date().toLocaleDateString("en-CA")}

PR #${msg.number}: ${msg.title}
${msg.description ? `Description: ${msg.description.slice(0, SUMMARY_DESCRIPTION_LIMIT)}` : ""}

Stats: ${msg.stats.commits} commits, ${msg.stats.changedFiles} files, +${msg.stats.additions}/-${msg.stats.deletions} lines, ${msg.stats.comments} comments
Authors: ${msg.stats.commitAuthors.map((a) => a.login).join(", ")}
Reviewers: ${msg.stats.reviewers.map((r) => `${r.login} (${r.state})`).join(", ") || "none yet"}

Top changed files:
${topFiles}

Treat the PR content as authoritative. Return ONLY a JSON array of exactly 2 objects, no other text:
[{"label":"<2–4 word label>","prompt":"<detailed question a reviewer would ask about this PR>"},{"label":"<2–4 word label>","prompt":"<detailed question a reviewer would ask about this PR>"}]

Each label must be 2–4 words and start with an action verb (e.g. Analyze, Verify, Understand, Check, Review, Find, Explain). Each prompt must be a specific, detailed question about a real concern in this PR (file paths, risk areas, logic). No generic prompts.`;

  const systemContent = "You are a concise code review assistant. Output only valid JSON.";

  let endpoint: string;
  let init: RequestInit;

  if (provider === "openai") {
    ({ endpoint, init } = buildOpenAIRequest(apiKey, proxyUrl, {
      model: modelName,
      max_tokens: SUMMARY_MAX_TOKENS,
      messages: [
        { role: "system", content: systemContent },
        { role: "user", content: prompt },
      ],
    }));
  } else {
    ({ endpoint, init } = buildAnthropicRequest(apiKey, proxyUrl, {
      model: modelName,
      max_tokens: SUMMARY_MAX_TOKENS,
      system: systemContent,
      messages: [{ role: "user", content: prompt }],
    }));
  }

  try {
    const response = await fetch(endpoint, init);

    if (!response.ok) return { ok: false, error: `LLM error (${response.status})` };

    const data = await response.json();
    const text = extractTextFromResponse(provider, data);

    let bullets: PromptSuggestion[] = [];
    try {
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        bullets = parsePromptSuggestions(JSON.parse(jsonMatch[0]));
      }
    } catch {
      /* malformed JSON — return empty */
    }

    return { ok: true, bullets };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "LLM call failed" };
  }
}

export async function handleChat(
  port: chrome.runtime.Port,
  messages: ChatMessage[],
  context: PRContext,
  signal: AbortSignal,
  enrichedContext?: EnrichedPRContext,
) {
  const { provider, apiKey, modelName, proxyUrl } = await getSettings();
  if (!apiKey) {
    sendToPort(port, {
      type: "error",
      message: "No API key configured. Click the PRobe extension icon to add your API key.",
    });
    return;
  }

  const skills = await resolveSkillsForDiff(context.diff);

  if (skills.length > 0) {
    sendToPort(port, {
      type: "skills",
      skills: skills.map((s) => ({
        name: s.name,
        sourceUrl: s.sourceUrl,
        description: s.description,
      })),
    });
  }

  let systemPrompt: string;
  if (context.focusedFile) {
    systemPrompt = buildFileSystemPrompt(
      context,
      context.focusedFile,
      context.diff,
      context.focusedFileContent,
      context.focusedLineRange,
      skills,
      modelName,
    );
  } else if (enrichedContext) {
    systemPrompt = buildEnrichedSystemPrompt(enrichedContext, skills, modelName);
  } else {
    systemPrompt = buildSystemPrompt(context, skills, modelName);
  }

  sendToPort(port, { type: "system-prompt", content: systemPrompt });

  const formattedMessages = messages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  let endpoint: string;
  let init: RequestInit;

  if (provider === "openai") {
    ({ endpoint, init } = buildOpenAIRequest(
      apiKey,
      proxyUrl,
      {
        model: modelName,
        max_tokens: CHAT_MAX_TOKENS,
        stream: true,
        messages: [{ role: "system", content: systemPrompt }, ...formattedMessages],
      },
      signal,
    ));
  } else {
    ({ endpoint, init } = buildAnthropicRequest(
      apiKey,
      proxyUrl,
      {
        model: modelName,
        max_tokens: CHAT_MAX_TOKENS,
        stream: true,
        system: systemPrompt,
        messages: formattedMessages,
      },
      signal,
    ));
  }

  try {
    const response = await fetch(endpoint, init);

    if (!response.ok) {
      const errorBody = await response.text();
      const providerLabel = provider === "openai" ? "OpenAI" : "Anthropic";
      let errorMessage = `${providerLabel} API error (${response.status})`;
      try {
        const parsed = JSON.parse(errorBody);
        errorMessage = parsed?.error?.message ?? errorMessage;
      } catch {
        /* use default error message */
      }
      sendToPort(port, { type: "error", message: errorMessage });
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      sendToPort(port, { type: "error", message: "No response body" });
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (data === "[DONE]") continue;
        try {
          const event = JSON.parse(data);
          const delta = extractStreamDelta(provider, event);
          if (delta) {
            sendToPort(port, { type: "chunk", content: delta });
          }
        } catch {
          /* skip malformed SSE */
        }
      }
    }

    sendToPort(port, { type: "done" });
  } catch (err: unknown) {
    if (signal.aborted) return;
    sendToPort(port, {
      type: "error",
      message: err instanceof Error ? err.message : "Unknown error",
    });
  }
}
