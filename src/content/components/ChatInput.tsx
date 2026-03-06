import { Button } from "@/components/ui/button";
import { ArrowUp, Square } from "lucide-react";
import { useCallback, useRef, useState } from "react";

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

  const hasContent = value.trim().length > 0;

  return (
    <div className="chat-input-area px-3 pb-3 pt-2 shrink-0 border-t border-border/50">
      <div className="flex gap-2 items-end relative">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Ask about this PR…"
            rows={1}
            disabled={disabled && !isStreaming}
            className="w-full resize-none rounded-2xl border border-border bg-surface pl-3.5 pr-12 py-2.5 text-sm leading-relaxed outline-none transition-all placeholder:text-muted-foreground/70 focus:bg-surface-elevated focus:border-primary/30 focus:shadow-[0_0_0_3px_oklch(0.55_0.14_175/0.08)] disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <div className="absolute right-1.5 bottom-1.5">
            {isStreaming ? (
              <Button
                onClick={onStop}
                size="icon-xs"
                className="bg-foreground hover:bg-foreground/80 text-background rounded-xl transition-all"
                title="Stop generating"
              >
                <Square className="size-3" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={!hasContent || disabled}
                size="icon-xs"
                className="bg-primary hover:bg-primary/85 text-primary-foreground rounded-xl transition-all disabled:opacity-25 disabled:bg-muted-foreground"
                title="Send message"
              >
                <ArrowUp className="size-3.5" strokeWidth={2.5} />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
