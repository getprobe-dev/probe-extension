import type { StreamEvent } from "../shared/types";

/**
 * Wraps an async message handler so the caller only needs:
 *   `return dispatchAsync(handlerFn(msg), sendResponse);`
 * instead of duplicating .then/.catch error‑handling for every message type.
 */
export function dispatchAsync<T extends { ok: boolean; error?: string }>(
  promise: Promise<T>,
  sendResponse: (response: T) => void,
): true {
  promise
    .then(sendResponse)
    .catch((err: unknown) => {
      sendResponse({
        ok: false,
        error: err instanceof Error ? err.message : "Unknown error",
      } as T);
    });
  return true;
}

export function sendToPort(port: chrome.runtime.Port, event: StreamEvent) {
  try {
    port.postMessage(event);
  } catch {
    /* port already disconnected */
  }
}
