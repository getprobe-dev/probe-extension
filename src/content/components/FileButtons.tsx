import { useEffect, useRef } from "react";

interface FileButtonsProps {
  onFileSelect: (filePath: string) => void;
}

const BUTTON_CLASS = "prs-file-chat-btn";

import { getIconUrl } from "../utils/theme";

// New GitHub UI (Jan 2026): uses CSS Modules with hashed suffixes.
// Match on the stable prefix — the hash (e.g. __Zcm) changes per deploy.
const FILE_PATH_SELECTOR = [
  '[class*="DiffFileHeader-module__file-path-section"]',
  '.file-header',
  '[data-tagsearch-path]',
].join(", ");

function extractFilePath(el: Element): string | null {
  // New UI: full path inside <code> within a Link--primary anchor
  const codeEl = el.querySelector<HTMLElement>('a[class*="Link--primary"] code, code');
  if (codeEl) {
    const cleaned = (codeEl.textContent ?? "")
      .replace(/[\u200B-\u200F\u2028\u2029\uFEFF]/g, "")
      .trim();
    if (cleaned) return cleaned;
  }

  // Legacy: data-path attribute
  const dataPath =
    el.getAttribute("data-path") ??
    el.querySelector<HTMLElement>("[data-path]")?.getAttribute("data-path");
  if (dataPath) return dataPath;

  // Legacy fallback: anchor with title
  const link = el.querySelector<HTMLAnchorElement>("a[title]");
  if (link?.title) return link.title;

  return null;
}

function injectButton(container: Element, onFileSelect: (filePath: string) => void) {
  if (container.querySelector(`.${BUTTON_CLASS}`)) return;

  const filePath = extractFilePath(container);
  if (!filePath) return;

  const btn = document.createElement("button");
  btn.className = BUTTON_CLASS;
  btn.title = `PRobe ${filePath}`;

  const img = document.createElement("img");
  img.src = getIconUrl(48);
  img.width = 20;
  img.height = 20;
  img.style.borderRadius = "4px";
  img.style.display = "block";
  btn.appendChild(img);

  Object.assign(btn.style, {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "28px",
    height: "28px",
    borderRadius: "8px",
    borderTop: "1px solid rgba(255,255,255,0.1)",
    borderLeft: "1px solid rgba(0,0,0,0.05)",
    borderRight: "1px solid rgba(0,0,0,0.05)",
    borderBottom: "3px solid rgba(0,0,0,0.2)",
    background: "transparent",
    cursor: "pointer",
    marginLeft: "8px",
    padding: "0",
    transition: "all 0.15s cubic-bezier(0.16, 1, 0.3, 1)",
    verticalAlign: "middle",
    flexShrink: "0",
    boxShadow: "none",
    position: "relative",
  });

  btn.addEventListener("mouseenter", () => {
    btn.style.borderBottom = "3px solid #5eead4";
    btn.style.transform = "scale(1.06)";
  });
  btn.addEventListener("mouseleave", () => {
    btn.style.borderBottom = "3px solid rgba(0,0,0,0.2)";
    btn.style.transform = "";
  });
  btn.addEventListener("mousedown", () => {
    btn.style.transform = "translateY(2px) scale(1)";
    btn.style.borderBottom = "1px solid rgba(0,0,0,0.1)";
    btn.style.boxShadow = "inset 0 1px 3px rgba(0,0,0,0.15)";
  });
  btn.addEventListener("mouseup", () => {
    btn.style.transform = "scale(1.06)";
    btn.style.borderBottom = "3px solid #5eead4";
    btn.style.boxShadow = "none";
  });
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    onFileSelect(filePath);
  });

  container.appendChild(btn);
}

export function FileButtons({ onFileSelect }: FileButtonsProps) {
  const callbackRef = useRef(onFileSelect);
  callbackRef.current = onFileSelect;

  useEffect(() => {
    let rafId = 0;

    function inject() {
      const headers = document.querySelectorAll(FILE_PATH_SELECTOR);
      headers.forEach((header) => {
        injectButton(header, (path) => callbackRef.current(path));
      });
    }

    function scheduleInject() {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(inject);
    }

    inject();

    // GitHub lazy-loads diffs as you scroll; #files no longer exists in the
    // new UI, so observe document.body. RAF debounces the high mutation volume.
    const observer = new MutationObserver(scheduleInject);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
      document.querySelectorAll(`.${BUTTON_CLASS}`).forEach((btn) => btn.remove());
    };
  }, []);

  return null;
}
