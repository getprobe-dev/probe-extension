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
    <div className="p-3 bg-background shrink-0">
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
            className="w-full resize-none rounded-2xl border border-input bg-secondary/40 pl-3.5 pr-12 py-2.5 text-sm leading-relaxed outline-none transition-all placeholder:text-muted-foreground focus:bg-background focus:border-ring/50 focus:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <div className="absolute right-1.5 bottom-1.5">
            {isStreaming ? (
              <Button
                onClick={onStop}
                size="icon-xs"
                className="bg-foreground hover:bg-foreground/80 text-background rounded-lg"
                title="Stop generating"
              >
                <Square className="size-3" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={!hasContent || disabled}
                size="icon-xs"
                className="bg-foreground hover:bg-foreground/80 text-background rounded-lg disabled:opacity-30"
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
