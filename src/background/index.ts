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
  PostCommentRequest,
  PostCommentResponse,
  PostReviewCommentRequest,
  SubmitReviewRequest,
  SubmitReviewResponse,
} from "../shared/types";

type IncomingMessage =
  | FetchDiffRequest
  | FetchFileRequest
  | PostCommentRequest
  | PostReviewCommentRequest
  | SubmitReviewRequest;

chrome.runtime.onMessage.addListener(
  (msg: IncomingMessage, _sender, sendResponse) => {
    if (msg.type === "fetch-diff") {
      const url = `https://github.com/${msg.owner}/${msg.repo}/pull/${msg.number}.diff`;
      fetch(url)
        .then(async (res) => {
          if (!res.ok) {
            sendResponse({ ok: false, error: `HTTP ${res.status}: ${res.statusText}` } satisfies FetchDiffResponse);
            return;
          }
          sendResponse({ ok: true, diff: await res.text() } satisfies FetchDiffResponse);
        })
        .catch((err) => {
          sendResponse({ ok: false, error: err instanceof Error ? err.message : "Network error" } satisfies FetchDiffResponse);
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
          sendResponse({ ok: true, content: await res.text() } satisfies FetchFileResponse);
        })
        .catch((err) => {
          sendResponse({ ok: false, error: err instanceof Error ? err.message : "Network error" } satisfies FetchFileResponse);
        });
      return true;
    }

    if (msg.type === "post-comment") {
      handlePostComment(msg).then(sendResponse).catch((err) => {
        sendResponse({ ok: false, error: err instanceof Error ? err.message : "Unknown error" } satisfies PostCommentResponse);
      });
      return true;
    }

    if (msg.type === "post-review-comment") {
      handlePostReviewComment(msg).then(sendResponse).catch((err) => {
        sendResponse({ ok: false, error: err instanceof Error ? err.message : "Unknown error" } satisfies SubmitReviewResponse);
      });
      return true;
    }

    if (msg.type === "submit-review") {
      handleSubmitReview(msg).then(sendResponse).catch((err) => {
        sendResponse({ ok: false, error: err instanceof Error ? err.message : "Unknown error" } satisfies SubmitReviewResponse);
      });
      return true;
    }
  }
);

async function ghHeaders(): Promise<Record<string, string> | null> {
  const token = await getGithubToken();
  if (!token) return null;
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function handlePostComment(msg: PostCommentRequest): Promise<PostCommentResponse> {
  const headers = await ghHeaders();
  if (!headers) return { ok: false, error: "No GitHub token configured. Click the PRobe extension icon to add one." };

  const url = `https://api.github.com/repos/${msg.owner}/${msg.repo}/issues/${msg.number}/comments`;
  const res = await fetch(url, { method: "POST", headers, body: JSON.stringify({ body: msg.body }) });

  if (!res.ok) return { ok: false, error: await extractGhError(res) };
  const data = await res.json();
  return { ok: true, url: data.html_url };
}

async function handlePostReviewComment(msg: PostReviewCommentRequest): Promise<SubmitReviewResponse> {
  const headers = await ghHeaders();
  if (!headers) return { ok: false, error: "No GitHub token configured. Click the PRobe extension icon to add one." };

  const url = `https://api.github.com/repos/${msg.owner}/${msg.repo}/pulls/${msg.number}/reviews`;
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      event: "COMMENT",
      comments: [{ path: msg.path, body: msg.body, line: msg.line, side: msg.side }],
    }),
  });

  if (!res.ok) return { ok: false, error: await extractGhError(res) };
  const data = await res.json();
  return { ok: true, url: data.html_url };
}

async function handleSubmitReview(msg: SubmitReviewRequest): Promise<SubmitReviewResponse> {
  const headers = await ghHeaders();
  if (!headers) return { ok: false, error: "No GitHub token configured. Click the PRobe extension icon to add one." };

  const url = `https://api.github.com/repos/${msg.owner}/${msg.repo}/pulls/${msg.number}/reviews`;
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      body: msg.body || undefined,
      event: msg.event,
      comments: msg.comments.map((c) => ({
        path: c.path,
        body: c.body,
        line: c.line,
        side: c.side,
      })),
    }),
  });

  if (!res.ok) return { ok: false, error: await extractGhError(res) };
  const data = await res.json();
  return { ok: true, url: data.html_url };
}

async function extractGhError(res: Response): Promise<string> {
  let detail = `GitHub API error (${res.status})`;
  try {
    const parsed = JSON.parse(await res.text());
    detail = parsed?.message ?? detail;
  } catch { /* use default */ }
  return detail;
}

async function getGithubToken(): Promise<string | null> {
  return new Promise((resolve) => {
    chrome.storage.sync.get([STORAGE_KEYS.GITHUB_TOKEN], (result) => {
      resolve((result[STORAGE_KEYS.GITHUB_TOKEN] as string) ?? null);
    });
  });
}

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== "probe-chat") return;

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
  try { port.postMessage(event); } catch { /* Port disconnected */ }
}

async function handleChat(
  port: chrome.runtime.Port,
  messages: ChatMessage[],
  context: PRContext,
  signal: AbortSignal
) {
  const { apiKey, proxyUrl } = await getSettings();
  if (!apiKey) {
    send(port, { type: "error", message: "No API key configured. Click the PRobe extension icon to add your Anthropic API key." });
    return;
  }

  const systemPrompt = context.focusedFile
    ? buildFileSystemPrompt(context, context.focusedFile, context.diff, context.focusedFileContent)
    : buildSystemPrompt(context);

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
      } catch { /* use default */ }
      send(port, { type: "error", message: errorMessage });
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) { send(port, { type: "error", message: "No response body" }); return; }

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
            send(port, { type: "chunk", content: event.delta.text });
          }
        } catch { /* skip malformed SSE */ }
      }
    }

    send(port, { type: "done" });
  } catch (err: unknown) {
    if (signal.aborted) return;
    send(port, { type: "error", message: err instanceof Error ? err.message : "Unknown error" });
  }
}
