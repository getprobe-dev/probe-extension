import { useEffect, useRef } from "react";
import type { FocusedLineRange } from "../../shared/types";
import { parseLineRangeFromHash, getFilePathFromDiffId, extractLinesFromDiff } from "../../shared/context";

interface LineCommentButtonProps {
  onLineSelect: (filePath: string, lineRange: FocusedLineRange) => void;
  diff: string | null;
}

import { getIconUrl } from "../utils/theme";

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
      img.src = getIconUrl(48);
      img.width = 18;
      img.height = 18;
      img.style.borderRadius = "3px";
      img.style.display = "block";
      btn.appendChild(img);

      const label = document.createElement("span");
      label.textContent = "PRobe";
      label.style.fontSize = "12px";
      label.style.fontWeight = "600";
      btn.appendChild(label);

      Object.assign(btn.style, {
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        padding: "4px 10px",
        borderRadius: "6px",
        border: "1px solid #99f6e4",
        background: "#ccfbf1",
        color: "#0f766e",
        cursor: "pointer",
        fontFamily: "inherit",
        transition: "all 0.15s ease",
        marginRight: "auto",
      });

      btn.addEventListener("mouseenter", () => {
        btn.style.background = "#99f6e4";
        btn.style.borderColor = "#2dd4bf";
      });
      btn.addEventListener("mouseleave", () => {
        btn.style.background = "#ccfbf1";
        btn.style.borderColor = "#99f6e4";
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
