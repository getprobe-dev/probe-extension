import { ArrowUp, Square, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import type { FocusedItem, PromptSuggestion } from "../../shared/types";

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop: () => void;
  disabled: boolean;
  isStreaming: boolean;
  showStarters?: boolean;
  focusedItems?: FocusedItem[];
  focusBullets?: PromptSuggestion[] | null;
  focusBulletsLoading?: boolean;
  followUpSuggestions?: PromptSuggestion[] | null;
  onRemoveItem?: (index: number) => void;
  onClearFocus?: () => void;
}

const QUICK_STARTERS: PromptSuggestion[] = [
  {
    label: "Summarize",
    prompt:
      "Give me a concise summary of this pull request — what it changes, why, and any notable technical decisions.",
  },
  {
    label: "Find issues",
    prompt:
      "Review this PR for potential issues: bugs, security vulnerabilities, edge cases, performance problems, or anything that could break in production.",
  },
];

const FILE_STARTERS: PromptSuggestion[] = [
  {
    label: "Explain changes",
    prompt:
      "Explain what changed in this file and why — what was the intent behind these modifications?",
  },
  {
    label: "Find bugs",
    prompt:
      "Look at the changes to this file and identify any bugs, edge cases, or scenarios that could cause unexpected behavior.",
  },
  {
    label: "Assess PR fit",
    prompt:
      "Do this file's changes fit well with the overall PR goal? Are they cohesive and complete?",
  },
];

const LINE_STARTERS: PromptSuggestion[] = [
  {
    label: "Explain this code",
    prompt:
      "Explain what these specific lines do — their purpose, logic, and how they fit into the surrounding code.",
  },
  {
    label: "Find edge cases",
    prompt:
      "Are there any edge cases or error conditions that these specific lines don't handle correctly?",
  },
  {
    label: "Suggest improvements",
    prompt:
      "How could these specific lines be improved? Consider readability, performance, correctness, or best practices.",
  },
];

export function ChatInput({
  onSend,
  onStop,
  disabled,
  isStreaming,
  showStarters,
  focusedItems = [],
  focusBullets,
  focusBulletsLoading,
  followUpSuggestions,
  onRemoveItem,
  onClearFocus,
}: ChatInputProps) {
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

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, []);

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
          {!contextStarters && focusBulletsLoading && !focusBullets && (
            <div className="grid grid-cols-2 gap-2">
              <div className="shimmer h-[34px] rounded-xl" />
              <div className="shimmer h-[34px] rounded-xl" />
            </div>
          )}
          {hasFocusBullets && focusBullets && (
            <div className="grid grid-cols-2 gap-2">
              {focusBullets.map((item) => (
                <button
                  key={item.label}
                  onClick={() => onSend(item.prompt)}
                  className="starter-pill px-3 py-2 rounded-xl text-xs truncate"
                  title={item.prompt}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
          <div className={`grid gap-2 ${contextStarters ? "grid-cols-1" : "grid-cols-2"}`}>
            {(contextStarters ?? QUICK_STARTERS).map((item) => (
              <button
                key={item.label}
                onClick={() => onSend(item.prompt)}
                className="starter-pill px-3 py-2 rounded-xl text-xs truncate"
                title={item.prompt}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {!showStarters && !isStreaming && followUpSuggestions && followUpSuggestions.length > 0 && (
        <div className="flex gap-2 px-3 py-2.5 border-t border-border">
          {followUpSuggestions.map((item) => (
            <button
              key={item.label}
              onClick={() => onSend(item.prompt)}
              className="starter-pill flex-1 px-3 py-2 rounded-xl text-xs truncate"
              title={item.prompt}
            >
              {item.label}
            </button>
          ))}
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
                      {" "}
                      L{item.lineRange.startLine}
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
                  type="button"
                  aria-label="Remove focused item"
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
            aria-label="Message input"
          />
          <div className="absolute right-2.5 bottom-2.5">
            {isStreaming ? (
              <button
                onClick={onStop}
                className="send-btn"
                title="Stop generating"
                type="button"
                aria-label="Stop generating"
              >
                <Square className="size-3" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!hasContent || disabled}
                className="send-btn"
                title="Send message"
                type="button"
                aria-label="Send message"
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
