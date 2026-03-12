import { useEffect, useRef } from "react";
import { MessageBubble } from "./MessageBubble";
import { PRDashboard } from "./PRDashboard";
import { getIconUrl } from "../utils/theme";
import type { ChatMessage, PRContext, ReviewPendingComment, PromptSuggestion } from "../../shared/types";

interface MessageListProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  focusedFile: string | null;
  prContext?: PRContext | null;
  fileLine: number;
  fileSide: "LEFT" | "RIGHT";
  onAddToReview: (comment: ReviewPendingComment) => void;
  onSummaryReady?: (bullets: PromptSuggestion[]) => void;
}

export function MessageList({
  messages,
  isStreaming,
  focusedFile,
  prContext,
  fileLine,
  fileSide,
  onAddToReview,
  onSummaryReady,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  const lastMsg = messages.length > 0 ? messages[messages.length - 1] : null;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, lastMsg?.content]);

  if (messages.length === 0) {
    if (prContext) return <PRDashboard prContext={prContext} onSummaryReady={onSummaryReady} />;
    return (
      <div className="flex-1 flex items-center justify-center">
        <img src={getIconUrl(128)} alt="PRobe" className="size-14 rounded-2xl animate-logo-pulse" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3">
      {messages.map((msg, i) => (
        <MessageBubble
          key={`${msg.role}-${msg.timestamp}-${i}`}
          message={msg}
          isStreaming={isStreaming && i === messages.length - 1 && msg.role === "assistant"}
          prOwner={prContext?.owner}
          prRepo={prContext?.repo}
          prNumber={prContext?.number}
          focusedFile={focusedFile}
          fileLine={fileLine}
          fileSide={fileSide}
          onAddToReview={onAddToReview}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
