import { useEffect, useRef } from "react";

interface FileButtonsProps {
  onFileSelect: (filePath: string) => void;
}

const BUTTON_CLASS = "prs-file-chat-btn";

const CHAT_ICON_SVG = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>`;

function injectButton(header: Element, onFileSelect: (filePath: string) => void) {
  if (header.querySelector(`.${BUTTON_CLASS}`)) return;

  const filePath =
    header.getAttribute("data-path") ??
    header.querySelector<HTMLElement>("[data-path]")?.getAttribute("data-path") ??
    header.querySelector<HTMLAnchorElement>(".Link--primary")?.title ??
    header.querySelector<HTMLAnchorElement>("a[title]")?.title;

  if (!filePath) return;

  const btn = document.createElement("button");
  btn.className = BUTTON_CLASS;
  btn.title = `Chat about ${filePath}`;
  btn.innerHTML = CHAT_ICON_SVG;

  Object.assign(btn.style, {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "28px",
    height: "28px",
    borderRadius: "6px",
    border: "1px solid transparent",
    background: "transparent",
    color: "#7c3aed",
    cursor: "pointer",
    marginLeft: "8px",
    padding: "0",
    transition: "all 0.15s ease",
    verticalAlign: "middle",
    flexShrink: "0",
  });

  btn.addEventListener("mouseenter", () => {
    btn.style.background = "#f3e8ff";
    btn.style.borderColor = "#c084fc";
  });
  btn.addEventListener("mouseleave", () => {
    btn.style.background = "transparent";
    btn.style.borderColor = "transparent";
  });
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    onFileSelect(filePath);
  });

  const actionsContainer = header.querySelector(".file-actions");
  if (actionsContainer) {
    actionsContainer.insertBefore(btn, actionsContainer.firstChild);
  } else {
    header.appendChild(btn);
  }
}

export function FileButtons({ onFileSelect }: FileButtonsProps) {
  const callbackRef = useRef(onFileSelect);
  callbackRef.current = onFileSelect;

  useEffect(() => {
    function inject() {
      const headers = document.querySelectorAll(".file-header, [data-tagsearch-path]");
      headers.forEach((header) => {
        injectButton(header, (path) => callbackRef.current(path));
      });
    }

    inject();

    const container = document.querySelector("#files") ?? document.body;
    const observer = new MutationObserver(() => inject());
    observer.observe(container, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      document.querySelectorAll(`.${BUTTON_CLASS}`).forEach((btn) => btn.remove());
    };
  }, []);

  return null;
}
