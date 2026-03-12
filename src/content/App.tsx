import { useCallback, useEffect, useRef, useState } from "react";
import type { FocusedLineRange, FocusedItem } from "../shared/types";
import { ChatPanel } from "./components/ChatPanel";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { FileButtons } from "./components/FileButtons";
import { LineCommentButton } from "./components/LineCommentButton";
import { getIconUrl } from "./utils/theme";

const DEFAULT_PANEL_WIDTH = 400;
const MIN_PANEL_WIDTH = 320;
const MAX_PANEL_WIDTH = 800;

const MAX_FOCUSED_ITEMS = 3;

export function App() {
  const [isOpen, setIsOpen] = useState(false);
  const [panelWidth, setPanelWidth] = useState(DEFAULT_PANEL_WIDTH);
  const [focusedItems, setFocusedItems] = useState<FocusedItem[]>([]);
  const [prDiff, setPrDiff] = useState<string | null>(null);
  const isResizingRef = useRef(false);
  const dragListenersRef = useRef<{ move: (e: MouseEvent) => void; up: () => void } | null>(null);

  useEffect(() => {
    if (isOpen) setPanelWidth(DEFAULT_PANEL_WIDTH);
  }, [isOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "p") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    if (!html.style.transition.includes("margin-right")) {
      html.style.transition = [
        html.style.transition,
        "margin-right 0.25s cubic-bezier(0.16,1,0.3,1)",
      ]
        .filter(Boolean)
        .join(", ");
    }
    html.style.marginRight = isOpen ? `${panelWidth}px` : "";
    return () => {
      html.style.marginRight = "";
    };
  }, [isOpen, panelWidth]);

  useEffect(() => {
    return () => {
      if (dragListenersRef.current) {
        document.removeEventListener("mousemove", dragListenersRef.current.move);
        document.removeEventListener("mouseup", dragListenersRef.current.up);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        dragListenersRef.current = null;
      }
    };
  }, []);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;

    const html = document.documentElement;
    html.style.transition = html.style.transition
      .split(",")
      .filter((t) => !t.includes("margin-right"))
      .join(",");

    const onMouseMove = (ev: MouseEvent) => {
      if (!isResizingRef.current) return;
      const newWidth = Math.min(
        MAX_PANEL_WIDTH,
        Math.max(MIN_PANEL_WIDTH, window.innerWidth - ev.clientX),
      );
      setPanelWidth(newWidth);
    };

    const onMouseUp = () => {
      isResizingRef.current = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      dragListenersRef.current = null;

      if (!html.style.transition.includes("margin-right")) {
        html.style.transition = [
          html.style.transition,
          "margin-right 0.25s cubic-bezier(0.16,1,0.3,1)",
        ]
          .filter(Boolean)
          .join(", ");
      }
    };

    dragListenersRef.current = { move: onMouseMove, up: onMouseUp };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, []);

  const handleFileSelect = useCallback((filePath: string) => {
    setFocusedItems((prev) => {
      if (prev.some((it) => it.file === filePath && !it.lineRange)) return prev;
      const next = [...prev, { file: filePath }];
      if (next.length > MAX_FOCUSED_ITEMS) next.shift();
      return next;
    });
    setIsOpen(true);
  }, []);

  const handleLineSelect = useCallback((filePath: string, lineRange: FocusedLineRange) => {
    setFocusedItems((prev) => {
      const next = [...prev, { file: filePath, lineRange }];
      if (next.length > MAX_FOCUSED_ITEMS) next.shift();
      return next;
    });
    setIsOpen(true);
  }, []);

  const handleClearFocus = useCallback(() => {
    setFocusedItems([]);
  }, []);

  const handleRemoveItem = useCallback((index: number) => {
    setFocusedItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  return (
    <>
      <FileButtons onFileSelect={handleFileSelect} />
      <LineCommentButton onLineSelect={handleLineSelect} diff={prDiff} />

      {/* Floating toggle button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fab-glow fixed bottom-6 right-6 size-12 rounded-2xl flex items-center justify-center border-0 cursor-pointer overflow-hidden p-0"
          style={{ zIndex: 2147483646, background: "transparent" }}
          title="Open PRobe (Ctrl+Shift+P)"
        >
          <img
            src={getIconUrl(48)}
            alt="PRobe"
            width={48}
            height={48}
            style={{ borderRadius: "16px", display: "block" }}
          />
        </button>
      )}

      {/* Side panel */}
      {isOpen && (
        <div
          className="fixed top-0 right-0 h-full panel-border-left bg-background flex flex-col animate-slide-in"
          style={{ zIndex: 2147483647, width: `${panelWidth}px` }}
          onKeyDown={(e) => e.stopPropagation()}
          onKeyUp={(e) => e.stopPropagation()}
        >
          {/* Resize handle */}
          <div className="resize-handle" onMouseDown={handleResizeStart} />
          <ErrorBoundary>
            <ChatPanel
              onClose={() => setIsOpen(false)}
              focusedItems={focusedItems}
              onClearFocus={handleClearFocus}
              onRemoveItem={handleRemoveItem}
              onDiffLoaded={setPrDiff}
            />
          </ErrorBoundary>
        </div>
      )}
    </>
  );
}
