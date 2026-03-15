import { useRef, useEffect } from "react";
import { useInjectButton } from "../hooks/useInjectButton";
import type { FocusedLineRange } from "../../shared/types";
import {
  parseLineRangeFromHash,
  getFilePathFromDiffId,
  extractLinesFromDiff,
} from "../../shared/context";

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
  }, [onLineSelect, diff]);

  useInjectButton({
    containerSelector: EDITOR_SELECTOR,
    buttonClass: BUTTON_CLASS,
    insertMode: "prepend",
    styles: {
      width: "32px",
      height: "31px",
      borderRadius: "6px",
      borderBottom: "2px solid rgba(0,0,0,0.2)",
      hoverBorderBottom: "2px solid #5eead4",
    },
    extractFilePath: findFilePath,
    getInsertionTarget: (editor) => editor.querySelector(FOOTER_SELECTOR),
    onClick: (editor) => {
      const filePath = findFilePath(editor);
      if (!filePath) return;

      const range = parseLineRangeFromHash();
      if (!range) return;

      let content = "";
      if (diffRef.current) {
        content = extractLinesFromDiff(
          diffRef.current,
          filePath,
          range.startLine,
          range.endLine,
          range.side,
        );
      }

      callbackRef.current(filePath, {
        startLine: range.startLine,
        endLine: range.endLine,
        side: range.side,
        content,
      });
    },
  });

  return null;
}
