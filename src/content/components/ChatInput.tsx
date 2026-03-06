import { ArrowUp, Square } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import type { FocusedLineRange } from "../../shared/types";

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop: () => void;
  disabled: boolean;
  isStreaming: boolean;
  showStarters?: boolean;
  focusedFile?: string | null;
  focusedLineRange?: FocusedLineRange | null;
  focusBullets?: string[] | null;
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

export function ChatInput({ onSend, onStop, disabled, isStreaming, showStarters, focusedFile, focusedLineRange, focusBullets }: ChatInputProps) {
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

  const contextStarters = focusedLineRange
    ? LINE_STARTERS
    : focusedFile
      ? FILE_STARTERS
      : null;

  const hasFocusBullets = !contextStarters && focusBullets && focusBullets.length > 0;

  const hasContent = value.trim().length > 0;

  return (
    <div className="shrink-0 border-t border-border bg-background">
      {showStarters && (
        <div className="px-3 pt-3 space-y-2">
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

      <div className="p-3">
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
                className="flex items-center justify-center size-8 rounded-xl bg-[#1a2e2b] text-white cursor-pointer transition-all shadow-[0_2px_0_0_rgba(0,0,0,0.2)] active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)] active:translate-y-px"
                title="Stop generating"
              >
                <Square className="size-3" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!hasContent || disabled}
                className="flex items-center justify-center size-8 rounded-xl cursor-pointer transition-all disabled:opacity-20 disabled:cursor-not-allowed bg-[#1a2e2b] text-[#5eead4] shadow-[0_2px_0_0_rgba(0,0,0,0.2)] hover:bg-[#243d39] active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)] active:translate-y-px"
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
