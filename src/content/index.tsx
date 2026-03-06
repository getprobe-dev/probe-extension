import { createRoot } from "react-dom/client";
import { App } from "./App";
import shadowStyles from "../styles/content-shadow.css?inline";

const PR_URL_RE = /github\.com\/[^/]+\/[^/]+\/pull\/\d+/;

function isContextValid(): boolean {
  try {
    return !!chrome.runtime?.id;
  } catch {
    return false;
  }
}

function mount() {
  if (!isContextValid()) {
    unmount();
    return;
  }

  const hostId = "probe-root";
  if (document.getElementById(hostId)) return;

  const host = document.createElement("div");
  host.id = hostId;
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: "open" });

  const fontLink = document.createElement("link");
  fontLink.rel = "stylesheet";
  fontLink.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap";
  shadow.appendChild(fontLink);

  const styleEl = document.createElement("style");
  styleEl.textContent = shadowStyles;
  shadow.appendChild(styleEl);

  const appContainer = document.createElement("div");
  appContainer.id = "probe-app";
  shadow.appendChild(appContainer);

  createRoot(appContainer).render(<App />);
}

function unmount() {
  document.getElementById("probe-root")?.remove();
}

function syncWithUrl() {
  if (!isContextValid()) {
    unmount();
    observer.disconnect();
    return;
  }
  if (PR_URL_RE.test(location.href)) {
    mount();
  } else {
    unmount();
  }
}

syncWithUrl();

let lastHref = location.href;
const observer = new MutationObserver(() => {
  if (location.href !== lastHref) {
    lastHref = location.href;
    syncWithUrl();
  }
});
observer.observe(document.body, { childList: true, subtree: true });
