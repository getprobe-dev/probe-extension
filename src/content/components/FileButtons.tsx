import { useRef, useEffect } from "react";
import { useInjectButton } from "../hooks/useInjectButton";

interface FileButtonsProps {
  onFileSelect: (filePath: string) => void;
}

const BUTTON_CLASS = "prs-file-chat-btn";

// New GitHub UI (Jan 2026): uses CSS Modules with hashed suffixes.
// Match on the stable prefix — the hash (e.g. __Zcm) changes per deploy.
const FILE_PATH_SELECTOR = [
  '[class*="DiffFileHeader-module__file-path-section"]',
  ".file-header",
  "[data-tagsearch-path]",
].join(", ");

function extractFilePath(el: Element): string | null {
  const codeEl = el.querySelector<HTMLElement>('a[class*="Link--primary"] code, code');
  if (codeEl) {
    const cleaned = (codeEl.textContent ?? "")
      .replace(/[\u200B-\u200F\u2028\u2029\uFEFF]/g, "")
      .trim();
    if (cleaned) return cleaned;
  }

  const dataPath =
    el.getAttribute("data-path") ??
    el.querySelector<HTMLElement>("[data-path]")?.getAttribute("data-path");
  if (dataPath) return dataPath;

  const link = el.querySelector<HTMLAnchorElement>("a[title]");
  if (link?.title) return link.title;

  return null;
}

export function FileButtons({ onFileSelect }: FileButtonsProps) {
  const callbackRef = useRef(onFileSelect);
  useEffect(() => {
    callbackRef.current = onFileSelect;
  }, [onFileSelect]);

  useInjectButton({
    containerSelector: FILE_PATH_SELECTOR,
    buttonClass: BUTTON_CLASS,
    insertMode: "append",
    styles: {
      width: "28px",
      height: "28px",
      borderRadius: "8px",
      borderBottom: "3px solid rgba(0,0,0,0.2)",
      hoverBorderBottom: "3px solid #5eead4",
      marginLeft: "8px",
    },
    extractFilePath,
    buildTitle: (filePath) => `PRobe ${filePath}`,
    onClick: (_container, filePath) => callbackRef.current(filePath),
  });

  return null;
}
