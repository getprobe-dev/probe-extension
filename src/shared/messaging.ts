/**
 * Promise wrapper around chrome.runtime.sendMessage with
 * proper error handling for invalidated extension contexts.
 */
export function sendMessage<T>(msg: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage(msg, (res: T) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(res);
      });
    } catch {
      reject(new Error("Extension context invalidated. Please refresh the page."));
    }
  });
}
