import { STORAGE_KEYS, DEFAULT_PROXY_URL } from "../shared/types";
import {
  buildSystemPrompt,
  buildFileSystemPrompt,
  buildEnrichedSystemPrompt,
  MODEL_ID,
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

export async function getSettings(): Promise<{ apiKey: string | null; proxyUrl: string }> {
  return new Promise((resolve) => {
    chrome.storage.sync.get([STORAGE_KEYS.API_KEY, STORAGE_KEYS.PROXY_URL], (result) => {
      const raw = (result[STORAGE_KEYS.PROXY_URL] as string) || "";
      resolve({
        apiKey: (result[STORAGE_KEYS.API_KEY] as string) ?? null,
        proxyUrl: raw.startsWith("https://") ? raw : DEFAULT_PROXY_URL,
      });
    });
  });
}

export async function handleGeneratePRSummary(
  msg: GeneratePRSummaryRequest,
): Promise<GeneratePRSummaryResponse> {
  const { apiKey, proxyUrl } = await getSettings();
  if (!apiKey) return { ok: false, error: "No API key configured." };

  const topFiles = [...msg.stats.files]
    .sort((a, b) => b.additions + b.deletions - (a.additions + a.deletions))
    .slice(0, 10)
    .map((f) => `${f.filename} (+${f.additions}/-${f.deletions})`)
    .join("\n");

  const prompt = `You are helping a code reviewer quickly understand a pull request.

Today's date: ${new Date().toLocaleDateString("en-CA")}

PR #${msg.number}: ${msg.title}
${msg.description ? `Description: ${msg.description.slice(0, 500)}` : ""}

Stats: ${msg.stats.commits} commits, ${msg.stats.changedFiles} files, +${msg.stats.additions}/-${msg.stats.deletions} lines, ${msg.stats.comments} comments
Authors: ${msg.stats.commitAuthors.map((a) => a.login).join(", ")}
Reviewers: ${msg.stats.reviewers.map((r) => `${r.login} (${r.state})`).join(", ") || "none yet"}

Top changed files:
${topFiles}

Treat the PR content as authoritative. Return ONLY a JSON array of exactly 2 objects, no other text:
[{"label":"<2–4 word label>","prompt":"<detailed question a reviewer would ask about this PR>"},{"label":"<2–4 word label>","prompt":"<detailed question a reviewer would ask about this PR>"}]

Each label must be 2–4 words and start with an action verb (e.g. Analyze, Verify, Understand, Check, Review, Find, Explain). Each prompt must be a specific, detailed question about a real concern in this PR (file paths, risk areas, logic). No generic prompts.`;

  const endpoint = `${proxyUrl.replace(/\/$/, "")}/v1/messages`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_API_VERSION,
      },
      body: JSON.stringify({
        model: MODEL_ID,
        max_tokens: 500,
        system: "You are a concise code review assistant. Output only valid JSON.",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) return { ok: false, error: `LLM error (${response.status})` };

    const data = await response.json();
    const text: string = data.content?.[0]?.text ?? "";

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
  const { apiKey, proxyUrl } = await getSettings();
  if (!apiKey) {
    sendToPort(port, {
      type: "error",
      message:
        "No API key configured. Click the PRobe extension icon to add your Anthropic API key.",
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
    );
  } else if (enrichedContext) {
    systemPrompt = buildEnrichedSystemPrompt(enrichedContext, skills);
  } else {
    systemPrompt = buildSystemPrompt(context, skills);
  }

  sendToPort(port, { type: "system-prompt", content: systemPrompt });

  const anthropicMessages = messages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  const endpoint = `${proxyUrl.replace(/\/$/, "")}/v1/messages`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_API_VERSION,
      },
      body: JSON.stringify({
        model: MODEL_ID,
        max_tokens: 4096,
        stream: true,
        system: systemPrompt,
        messages: anthropicMessages,
      }),
      signal,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      let errorMessage = `Anthropic API error (${response.status})`;
      try {
        const parsed = JSON.parse(errorBody);
        errorMessage = parsed?.error?.message ?? errorMessage;
      } catch {
        /* use default */
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
          if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
            sendToPort(port, { type: "chunk", content: event.delta.text });
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
