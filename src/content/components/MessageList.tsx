import { memo, useEffect, useRef } from "react";
import { MessageBubble } from "./MessageBubble";
import { PRDashboard } from "./PRDashboard";
import { getIconUrl } from "../utils/iconUtils";
import type { ChatMessage, PRContext, PromptSuggestion } from "../../shared/types";

interface MessageListProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  prContext?: PRContext | null;
  onSummaryLoading?: () => void;
  onSummaryReady?: (bullets: PromptSuggestion[]) => void;
}

export const MessageList = memo(function MessageList({
  messages,
  isStreaming,
  prContext,
  onSummaryLoading,
  onSummaryReady,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastMsg = messages.length > 0 ? messages[messages.length - 1] : null;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, lastMsg?.content]);

  if (messages.length === 0) {
    if (prContext)
      return (
        <PRDashboard
          prContext={prContext}
          onSummaryLoading={onSummaryLoading}
          onSummaryReady={onSummaryReady}
        />
      );
    return (
      <div className="flex-1 flex items-center justify-center">
        <img src={getIconUrl(128)} alt="PRobe" className="size-14 rounded-2xl animate-logo-pulse" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3" aria-live="polite" aria-label="Chat messages">
      {messages.map((msg, i) => (
        <MessageBubble
          key={`${msg.role}-${msg.timestamp}-${i}`}
          message={msg}
          isStreaming={isStreaming && i === messages.length - 1 && msg.role === "assistant"}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  );
});
