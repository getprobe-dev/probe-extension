import { useEffect, useRef } from "react";
import type { FocusedLineRange } from "../../shared/types";
import { parseLineRangeFromHash, getFilePathFromDiffId, extractLinesFromDiff } from "../../shared/context";
import { getIconUrl } from "../utils/theme";

interface LineCommentButtonProps {
  onLineSelect: (filePath: string, lineRange: FocusedLineRange) => void;
  diff: string | null;
}

const BUTTON_CLASS = "prs-line-probe-btn";

const EDITOR_SELECTOR = '[class*="AddCommentEditor-module__AddCommentEditor"]';
const FOOTER_SELECTOR = '[class*="Footer-module__childrenStyling"]';

function findFilePath(editor: Element): string | null {
  let node: Element | null = editor;
  for (let i = 0; i < 25; i++) {
    node = node.parentElement;
    if (!node) break;
    if (node.id?.startsWith("diff-")) {
      return getFilePathFromDiffId(node.id);
    }
  }
  return null;
}

export function LineCommentButton({ onLineSelect, diff }: LineCommentButtonProps) {
  const callbackRef = useRef(onLineSelect);
  callbackRef.current = onLineSelect;
  const diffRef = useRef(diff);
  diffRef.current = diff;

  useEffect(() => {
    let rafId = 0;

    function handleClick(editor: Element) {
      const filePath = findFilePath(editor);
      if (!filePath) return;

      const range = parseLineRangeFromHash();
      if (!range) return;

      let content = "";
      if (diffRef.current) {
        content = extractLinesFromDiff(
          diffRef.current, filePath,
          range.startLine, range.endLine, range.side
        );
      }

      callbackRef.current(filePath, {
        startLine: range.startLine,
        endLine: range.endLine,
        side: range.side,
        content,
      });
    }

    function injectButton(editor: Element) {
      if (editor.querySelector(`.${BUTTON_CLASS}`)) return;

      const footer = editor.querySelector(FOOTER_SELECTOR);
      if (!footer) return;

      const btn = document.createElement("button");
      btn.className = BUTTON_CLASS;
      btn.type = "button";

      const img = document.createElement("img");
      img.src = getIconUrl(16);
      img.width = 16;
      img.height = 16;
      img.style.borderRadius = "3px";
      img.style.display = "block";
      btn.appendChild(img);

      const label = document.createElement("span");
      label.textContent = "PRobe";
      btn.appendChild(label);

      Object.assign(btn.style, {
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "5px 12px",
        borderRadius: "6px",
        border: "1px solid rgba(31,35,40,0.15)",
        background: "transparent",
        color: "inherit",
        cursor: "pointer",
        fontFamily: "inherit",
        fontSize: "inherit",
        fontWeight: "inherit",
        lineHeight: "inherit",
        transition: "background 0.12s ease",
      });

      btn.addEventListener("mouseenter", () => {
        btn.style.background = "rgba(31,35,40,0.04)";
      });
      btn.addEventListener("mouseleave", () => {
        btn.style.background = "transparent";
      });

      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleClick(editor);
      });

      footer.insertBefore(btn, footer.firstChild);
    }

    function inject() {
      document.querySelectorAll(EDITOR_SELECTOR).forEach(injectButton);
    }

    function scheduleInject() {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(inject);
    }

    inject();
    const observer = new MutationObserver(scheduleInject);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
      document.querySelectorAll(`.${BUTTON_CLASS}`).forEach((b) => b.remove());
    };
  }, []);

  return null;
}
