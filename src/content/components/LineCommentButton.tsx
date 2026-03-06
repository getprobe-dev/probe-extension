import { useEffect, useRef } from "react";
import { subscribeMutation } from "../utils/domObserver";
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
  const diffRef = useRef(diff);
  useEffect(() => {
    callbackRef.current = onLineSelect;
    diffRef.current = diff;
  });

  useEffect(() => {
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
      img.width = 20;
      img.height = 20;
      img.style.borderRadius = "4px";
      img.style.display = "block";
      btn.appendChild(img);

      Object.assign(btn.style, {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: "32px",
        height: "31px",
        borderRadius: "6px",
        borderTop: "1px solid rgba(255,255,255,0.1)",
        borderLeft: "1px solid rgba(0,0,0,0.05)",
        borderRight: "1px solid rgba(0,0,0,0.05)",
        borderBottom: "2px solid rgba(0,0,0,0.2)",
        background: "transparent",
        cursor: "pointer",
        padding: "0",
        transition: "all 0.15s cubic-bezier(0.16, 1, 0.3, 1)",
        boxSizing: "border-box",
      });

      btn.addEventListener("mouseenter", () => {
        btn.style.borderBottom = "2px solid #5eead4";
      });
      btn.addEventListener("mouseleave", () => {
        btn.style.borderBottom = "2px solid rgba(0,0,0,0.2)";
        btn.style.transform = "";
        btn.style.boxShadow = "none";
      });
      btn.addEventListener("mousedown", () => {
        btn.style.transform = "translateY(2px)";
        btn.style.borderBottom = "1px solid rgba(0,0,0,0.1)";
        btn.style.boxShadow = "inset 0 1px 3px rgba(0,0,0,0.15)";
      });
      btn.addEventListener("mouseup", () => {
        btn.style.transform = "";
        btn.style.borderBottom = "2px solid #5eead4";
        btn.style.boxShadow = "none";
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

    inject();
    const unsubscribe = subscribeMutation(inject);

    return () => {
      unsubscribe();
      document.querySelectorAll(`.${BUTTON_CLASS}`).forEach((b) => b.remove());
    };
  }, []);

  return null;
}
