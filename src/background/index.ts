import { STORAGE_KEYS, DEFAULT_PROXY_URL } from "../shared/types";
import { buildSystemPrompt, buildFileSystemPrompt } from "../shared/constants";
import type {
  BackgroundMessage,
  StreamEvent,
  ChatMessage,
  PRContext,
  FetchDiffRequest,
  FetchDiffResponse,
  FetchFileRequest,
  FetchFileResponse,
} from "../shared/types";

chrome.runtime.onMessage.addListener((msg: FetchDiffRequest | FetchFileRequest, _sender, sendResponse) => {
  if (msg.type === "fetch-diff") {
    const url = `https://github.com/${msg.owner}/${msg.repo}/pull/${msg.number}.diff`;

    fetch(url)
      .then(async (res) => {
        if (!res.ok) {
          sendResponse({ ok: false, error: `HTTP ${res.status}: ${res.statusText}` } satisfies FetchDiffResponse);
          return;
        }
        const diff = await res.text();
        sendResponse({ ok: true, diff } satisfies FetchDiffResponse);
      })
      .catch((err) => {
        sendResponse({
          ok: false,
          error: err instanceof Error ? err.message : "Network error",
        } satisfies FetchDiffResponse);
      });

    return true;
  }

  if (msg.type === "fetch-file") {
    const url = `https://raw.githubusercontent.com/${msg.owner}/${msg.repo}/${msg.branch}/${msg.path}`;

    fetch(url)
      .then(async (res) => {
        if (!res.ok) {
          sendResponse({ ok: false, error: `HTTP ${res.status}: ${res.statusText}` } satisfies FetchFileResponse);
          return;
        }
        const content = await res.text();
        sendResponse({ ok: true, content } satisfies FetchFileResponse);
      })
      .catch((err) => {
        sendResponse({
          ok: false,
          error: err instanceof Error ? err.message : "Network error",
        } satisfies FetchFileResponse);
      });

    return true;
  }
});

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== "sidekick-chat") return;

  let abortController: AbortController | null = null;

  port.onMessage.addListener(async (msg: BackgroundMessage) => {
    if (msg.type === "stop") {
      abortController?.abort();
      return;
    }

    if (msg.type === "chat") {
      abortController = new AbortController();
      await handleChat(port, msg.payload.messages, msg.payload.context, abortController.signal);
    }
  });

  port.onDisconnect.addListener(() => {
    abortController?.abort();
  });
});

async function getSettings(): Promise<{ apiKey: string | null; proxyUrl: string }> {
  return new Promise((resolve) => {
    chrome.storage.sync.get([STORAGE_KEYS.API_KEY, STORAGE_KEYS.PROXY_URL], (result) => {
      resolve({
        apiKey: (result[STORAGE_KEYS.API_KEY] as string) ?? null,
        proxyUrl: (result[STORAGE_KEYS.PROXY_URL] as string) || DEFAULT_PROXY_URL,
      });
    });
  });
}

function send(port: chrome.runtime.Port, event: StreamEvent) {
  try {
    port.postMessage(event);
  } catch {
    // Port disconnected
  }
}

async function handleChat(
  port: chrome.runtime.Port,
  messages: ChatMessage[],
  context: PRContext,
  signal: AbortSignal
) {
  const { apiKey, proxyUrl } = await getSettings();
  if (!apiKey) {
    send(port, { type: "error", message: "No API key configured. Click the PR Sidekick extension icon to add your Anthropic API key." });
    return;
  }

  let systemPrompt: string;
  if (context.focusedFile) {
    const fileDiff = context.diff;
    systemPrompt = buildFileSystemPrompt(context, context.focusedFile, fileDiff, context.focusedFileContent);
  } else {
    systemPrompt = buildSystemPrompt(context);
  }

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
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
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
        // Use default error message
      }
      send(port, { type: "error", message: errorMessage });
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      send(port, { type: "error", message: "No response body" });
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
          if (
            event.type === "content_block_delta" &&
            event.delta?.type === "text_delta"
          ) {
            send(port, { type: "chunk", content: event.delta.text });
          }
        } catch {
          // Skip malformed SSE events
        }
      }
    }

    send(port, { type: "done" });
  } catch (err: unknown) {
    if (signal.aborted) return;
    const message = err instanceof Error ? err.message : "Unknown error";
    send(port, { type: "error", message });
  }
}
