import { ArrowUp, Square, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import type { FocusedItem } from "../../shared/types";

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop: () => void;
  disabled: boolean;
  isStreaming: boolean;
  showStarters?: boolean;
  focusedItems?: FocusedItem[];
  focusBullets?: string[] | null;
  onRemoveItem?: (index: number) => void;
  onClearFocus?: () => void;
}

const QUICK_STARTERS = [
  "Summarize this PR",
  "Any potential issues?",
];

const FILE_STARTERS = [
  "Explain these changes",
  "Any bugs or edge cases?",
  "How does this fit the PR?",
];

const LINE_STARTERS = [
  "What does this do?",
  "Any edge cases?",
  "How to improve this?",
];

export function ChatInput({ onSend, onStop, disabled, isStreaming, showStarters, focusedItems = [], focusBullets, onRemoveItem, onClearFocus }: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [value, disabled, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  };

  const hasLineRange = focusedItems.some((it) => it.lineRange);
  const contextStarters = hasLineRange
    ? LINE_STARTERS
    : focusedItems.length > 0
      ? FILE_STARTERS
      : null;

  const hasFocusBullets = !contextStarters && focusBullets && focusBullets.length > 0;

  const hasContent = value.trim().length > 0;

  return (
    <div className="shrink-0 bg-background">
      {showStarters && (
        <div className="px-3 pt-3 space-y-2 border-t border-border">
          {hasFocusBullets && (
            <div className="flex flex-col gap-1.5">
              {focusBullets!.map((text, i) => (
                <button
                  key={i}
                  onClick={() => onSend(text)}
                  className="starter-pill w-full px-3 py-2 rounded-xl text-xs text-left truncate"
                  title={text}
                >
                  {text}
                </button>
              ))}
            </div>
          )}
          <div className={`grid gap-2 ${contextStarters ? "grid-cols-1" : "grid-cols-2"}`}>
            {(contextStarters ?? QUICK_STARTERS).map((text) => (
              <button
                key={text}
                onClick={() => onSend(text)}
                className="starter-pill px-3 py-2 rounded-xl text-xs truncate"
              >
                {text}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="p-3 border-t border-border">
        {focusedItems.length > 0 && (
          <div className="flex items-center gap-1.5 mb-2 flex-wrap">
            {focusedItems.map((item, idx) => (
              <div
                key={`${item.file}-${item.lineRange?.startLine ?? "f"}-${idx}`}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#5eead4]/10 border border-[#5eead4]/20 text-foreground text-xs font-medium"
              >
                <span className="truncate max-w-[160px]" title={item.file}>
                  {item.file.split("/").pop() ?? item.file}
                  {item.lineRange && (
                    <span className="text-[#1a2e2b] font-semibold">
                      {" "}L{item.lineRange.startLine}
                      {item.lineRange.endLine !== item.lineRange.startLine
                        ? `\u2013L${item.lineRange.endLine}`
                        : ""}
                    </span>
                  )}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    if (focusedItems.length === 1) onClearFocus?.();
                    else onRemoveItem?.(idx);
                  }}
                  className="inline-flex items-center justify-center size-4 rounded hover:bg-[#5eead4]/20 text-muted-foreground hover:text-foreground transition-colors shrink-0 cursor-pointer"
                  title="Remove"
                >
                  <X className="size-2.5" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="relative rounded-xl border border-[#94a3b8] bg-[#f1f5f9] shadow-sm focus-within:border-[#5eead4] focus-within:shadow-[0_0_0_3px_rgb(94_234_212/0.15)] transition-all">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Probe this PR…"
            rows={3}
            disabled={disabled && !isStreaming}
            className="block w-full resize-none bg-transparent px-3.5 pt-3 pb-10 text-sm leading-relaxed outline-none placeholder:text-muted-foreground/60 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <div className="absolute right-2.5 bottom-2.5">
            {isStreaming ? (
              <button
                onClick={onStop}
                className="send-btn"
                title="Stop generating"
              >
                <Square className="size-3" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!hasContent || disabled}
                className="send-btn"
                title="Send message"
              >
                <ArrowUp className="size-4" strokeWidth={2.5} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
