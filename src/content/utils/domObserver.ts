type Listener = () => void;

const listeners = new Set<Listener>();
let observer: MutationObserver | null = null;
let rafId = 0;

function flush() {
  cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(() => {
    for (const fn of listeners) fn();
  });
}

function ensureObserver() {
  if (observer) return;
  observer = new MutationObserver(flush);
  observer.observe(document.body, { childList: true, subtree: true });
}

export function subscribeMutation(fn: Listener): () => void {
  listeners.add(fn);
  ensureObserver();
  return () => {
    listeners.delete(fn);
    if (listeners.size === 0 && observer) {
      cancelAnimationFrame(rafId);
      observer.disconnect();
      observer = null;
    }
  };
}
