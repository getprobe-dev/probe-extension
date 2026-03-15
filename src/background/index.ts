import { dispatchAsync } from "./helpers";
import { handlePostComment, handlePostReviewComment, handleSubmitReview } from "./githubComments";
import { handleFetchEnrichedContext } from "./githubEnrichedContext";
import { handleFetchPRStats } from "./githubStats";
import { handleChat, handleGeneratePRSummary } from "./llmService";
import { apiBase } from "./githubHelpers";
import type {
  BackgroundMessage,
  FetchDiffRequest,
  FetchDiffResponse,
  FetchFileRequest,
  FetchFileResponse,
  FetchEnrichedContextRequest,
  CancelEnrichedContextRequest,
  FetchEnrichedContextResponse,
  PostCommentRequest,
  PostReviewCommentRequest,
  SubmitReviewRequest,
  FetchPRStatsRequest,
  GeneratePRSummaryRequest,
} from "../shared/types";

type IncomingMessage =
  | { type: "open-popup" }
  | FetchDiffRequest
  | FetchFileRequest
  | FetchEnrichedContextRequest
  | CancelEnrichedContextRequest
  | PostCommentRequest
  | PostReviewCommentRequest
  | SubmitReviewRequest
  | FetchPRStatsRequest
  | GeneratePRSummaryRequest;

// ── Enriched‑context cancellation registry ──

const enrichedContextControllers = new Map<string, AbortController>();

// ── One‑shot message handlers (keyed by msg.type) ──
// Each entry receives (msg, sendResponse) and returns `true` to keep the
// message channel open for async responses. The dispatch table makes
// adding new message types a one‑line change (Open/Closed principle).

type MessageHandler = (msg: IncomingMessage, sendResponse: (r: unknown) => void) => boolean | void;

function handleFetchDiff(msg: FetchDiffRequest, sendResponse: (r: FetchDiffResponse) => void) {
  const url = `https://github.com/${msg.owner}/${msg.repo}/pull/${msg.number}.diff`;
  return dispatchAsync(
    fetch(url).then(async (res) => {
      if (!res.ok) return { ok: false as const, error: `HTTP ${res.status}: ${res.statusText}` };
      return { ok: true as const, diff: await res.text() };
    }),
    sendResponse,
  );
}

function handleFetchFile(msg: FetchFileRequest, sendResponse: (r: FetchFileResponse) => void) {
  const url = `https://raw.githubusercontent.com/${msg.owner}/${msg.repo}/${msg.branch}/${msg.path}`;
  return dispatchAsync(
    fetch(url).then(async (res) => {
      if (!res.ok) return { ok: false as const, error: `HTTP ${res.status}: ${res.statusText}` };
      return { ok: true as const, content: await res.text() };
    }),
    sendResponse,
  );
}

function handleEnrichedContext(
  msg: FetchEnrichedContextRequest,
  sendResponse: (r: FetchEnrichedContextResponse) => void,
) {
  const controller = new AbortController();
  enrichedContextControllers.set(msg.requestId, controller);

  handleFetchEnrichedContext(msg, controller.signal)
    .then((res) => {
      enrichedContextControllers.delete(msg.requestId);
      sendResponse(res);
    })
    .catch((err: unknown) => {
      enrichedContextControllers.delete(msg.requestId);
      if (controller.signal.aborted) return;
      sendResponse({
        ok: false,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    });
  return true;
}

const messageHandlers: Record<string, MessageHandler> = {
  "open-popup": (_msg, sendResponse) => {
    chrome.action
      .openPopup()
      .then(() => sendResponse({ ok: true }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  },
  "fetch-diff": (msg, sendResponse) =>
    handleFetchDiff(msg as FetchDiffRequest, sendResponse as (r: FetchDiffResponse) => void),
  "fetch-file": (msg, sendResponse) =>
    handleFetchFile(msg as FetchFileRequest, sendResponse as (r: FetchFileResponse) => void),
  "fetch-enriched-context": (msg, sendResponse) =>
    handleEnrichedContext(
      msg as FetchEnrichedContextRequest,
      sendResponse as (r: FetchEnrichedContextResponse) => void,
    ),
  "cancel-enriched-context": (msg) => {
    const m = msg as CancelEnrichedContextRequest;
    enrichedContextControllers.get(m.requestId)?.abort();
    enrichedContextControllers.delete(m.requestId);
  },
  "post-comment": (msg, sendResponse) =>
    dispatchAsync(handlePostComment(msg as PostCommentRequest), sendResponse),
  "post-review-comment": (msg, sendResponse) =>
    dispatchAsync(handlePostReviewComment(msg as PostReviewCommentRequest), sendResponse),
  "submit-review": (msg, sendResponse) =>
    dispatchAsync(handleSubmitReview(msg as SubmitReviewRequest), sendResponse),
  "fetch-pr-stats": (msg, sendResponse) =>
    dispatchAsync(handleFetchPRStats(msg as FetchPRStatsRequest), sendResponse),
  "generate-pr-summary": (msg, sendResponse) =>
    dispatchAsync(handleGeneratePRSummary(msg as GeneratePRSummaryRequest), sendResponse),
};

chrome.runtime.onMessage.addListener((msg: IncomingMessage, _sender, sendResponse) => {
  const handler = messageHandlers[msg.type];
  if (handler) return handler(msg, sendResponse);
});

// ── Streaming chat port ──

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
      await handleChat(
        port,
        msg.payload.messages,
        msg.payload.context,
        abortController.signal,
        msg.payload.enrichedContext,
      );
    }
  });

  port.onDisconnect.addListener(() => {
    abortController?.abort();
  });
});

// Keep apiBase exported to avoid unused import linting warnings; it is used
// by other background modules via their own imports.
export { apiBase };
