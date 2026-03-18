import { createRoot } from "react-dom/client";
import { App } from "./App";
import { subscribeMutation } from "./utils/domObserver";
import shadowStyles from "../styles/content-shadow.css?inline";

const PR_URL_RE = /github\.com\/[^/]+\/[^/]+\/pull\/\d+/;
const ROOT_HOST_ID = "probe-root";
const APP_CONTAINER_ID = "probe-app";

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

  if (document.getElementById(ROOT_HOST_ID)) return;

  const host = document.createElement("div");
  host.id = ROOT_HOST_ID;
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: "open" });

  const outfitUrl = chrome.runtime.getURL("fonts/outfit-latin-wght-normal.woff2");
  const face = new FontFace("Outfit", `url(${outfitUrl}) format('woff2')`, {
    weight: "100 900",
    style: "normal",
  });
  document.fonts.add(face);
  face.load();

  const styleEl = document.createElement("style");
  styleEl.textContent = shadowStyles;
  shadow.appendChild(styleEl);

  const appContainer = document.createElement("div");
  appContainer.id = APP_CONTAINER_ID;
  shadow.appendChild(appContainer);

  createRoot(appContainer).render(<App />);
}

function unmount() {
  document.getElementById(ROOT_HOST_ID)?.remove();
}

let unsubscribe: (() => void) | null = null;

function syncWithUrl() {
  if (!isContextValid()) {
    unmount();
    unsubscribe?.();
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
unsubscribe = subscribeMutation(() => {
  if (location.href !== lastHref) {
    lastHref = location.href;
    syncWithUrl();
  }
});
