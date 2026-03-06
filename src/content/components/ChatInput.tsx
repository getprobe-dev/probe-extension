import { useState, useRef, useCallback } from "react";

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop: () => void;
  disabled: boolean;
  isStreaming: boolean;
}

export function ChatInput({ onSend, onStop, disabled, isStreaming }: ChatInputProps) {
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
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  return (
    <div className="prs-border-t prs-border-neutral-200 prs-p-3 prs-bg-white">
      <div className="prs-flex prs-gap-2 prs-items-end">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Ask about this PR…"
          rows={1}
          disabled={disabled && !isStreaming}
          className="prs-flex-1 prs-resize-none prs-rounded-lg prs-border prs-border-neutral-300 prs-px-3 prs-py-2 prs-text-sm prs-leading-relaxed prs-outline-none focus:prs-ring-2 focus:prs-ring-teal-500 focus:prs-border-transparent disabled:prs-opacity-50 prs-bg-white prs-text-neutral-900 prs-placeholder-neutral-400"
        />
        {isStreaming ? (
          <button
            onClick={onStop}
            className="prs-shrink-0 prs-w-9 prs-h-9 prs-flex prs-items-center prs-justify-center prs-rounded-lg prs-bg-red-500 hover:prs-bg-red-600 prs-text-white prs-transition-colors"
            title="Stop generating"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <rect x="2" y="2" width="10" height="10" rx="1" />
            </svg>
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!value.trim() || disabled}
            className="prs-shrink-0 prs-w-9 prs-h-9 prs-flex prs-items-center prs-justify-center prs-rounded-lg prs-bg-teal-600 hover:prs-bg-teal-700 disabled:prs-opacity-40 disabled:prs-cursor-not-allowed prs-text-white prs-transition-colors"
            title="Send message"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2L7 9" />
              <path d="M14 2L9.5 14L7 9L2 6.5L14 2Z" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
