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
import {
  buildAnthropicRequest,
  buildOpenAIRequest,
  extractTextFromResponse,
  extractStreamDelta,
} from "./llmProviders";
import type {
  ChatMessage,
  PRContext,
  EnrichedPRContext,
  GeneratePRSummaryRequest,
  GeneratePRSummaryResponse,
  PromptSuggestion,
  SimTestRequest,
  SimTestResponse,
  SimulatedTestRunData,
} from "../shared/types";

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

export async function handleSimTest(msg: SimTestRequest): Promise<SimTestResponse> {
  const { provider, apiKey, modelName, proxyUrl } = await getSettings();
  if (!apiKey) return { ok: false, error: "No API key configured." };

  const contextSnippet = msg.fileContent.slice(0, 4000);

  const prompt = `You are simulating code execution for a pull request reviewer.

File: ${msg.filePath}

Surrounding file context (for function signatures and variable types):
\`\`\`
${contextSnippet}
\`\`\`

Selected code block to simulate:
\`\`\`
${msg.lineContent}
\`\`\`

Instructions:
- Identify the function/logic being tested.
- Generate 3 representative test cases: 1 happy path, 1-2 edge cases.
- For each test case, simulate input → expected output → actual output.
- If a test case reveals a bug, set passed=false and provide rootCause.
- If the code looks correct, all cases should pass.

Return ONLY a JSON object matching this exact schema, no other text:
{
  "totalCases": 3,
  "passedCases": 3,
  "codeSnippet": "<the selected code being tested>",
  "functionName": "<name of the function or logic block>",
  "testCases": [
    {
      "id": 1,
      "passed": true,
      "input": [{"label": "paramName", "value": "\"hello\"", "type": "string"}],
      "expectedOutput": [{"label": "result", "value": "5", "type": "number"}],
      "actualOutput": [{"label": "result", "value": "5", "type": "number"}],
      "explanation": "optional short note"
    },
    {
      "id": 2,
      "passed": false,
      "input": [{"label": "paramName", "value": "null", "type": "object"}],
      "expectedOutput": [{"label": "result", "value": "0", "type": "number"}],
      "actualOutput": [{"label": "result", "value": "TypeError", "type": "string"}],
      "explanation": "null is not handled",
      "rootCause": "The function does not check for null input before accessing .length property"
    }
  ]
}`;

  const systemContent = "You are a precise code execution simulator. Output only valid JSON.";
  const SIM_TEST_MAX_TOKENS = 2048;

  let endpoint: string;
  let init: RequestInit;

  if (provider === "openai") {
    ({ endpoint, init } = buildOpenAIRequest(apiKey, proxyUrl, {
      model: modelName,
      max_tokens: SIM_TEST_MAX_TOKENS,
      messages: [
        { role: "system", content: systemContent },
        { role: "user", content: prompt },
      ],
    }));
  } else {
    ({ endpoint, init } = buildAnthropicRequest(apiKey, proxyUrl, {
      model: modelName,
      max_tokens: SIM_TEST_MAX_TOKENS,
      system: systemContent,
      messages: [{ role: "user", content: prompt }],
    }));
  }

  try {
    const response = await fetch(endpoint, init);

    if (!response.ok) return { ok: false, error: `LLM error (${response.status})` };

    const result = await response.json();
    const text = extractTextFromResponse(provider, result);

    let data: SimulatedTestRunData | undefined;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed.testCases)) {
          data = parsed as SimulatedTestRunData;
        }
      }
    } catch {
      /* malformed JSON */
    }

    if (!data) return { ok: false, error: "Failed to parse test results" };
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Sim test failed" };
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
