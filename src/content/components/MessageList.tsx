import { useEffect, useRef } from "react";
import { MessageBubble } from "./MessageBubble";
import { PRDashboard } from "./PRDashboard";
import type { ChatMessage, PRContext, ReviewPendingComment, FocusedLineRange } from "../../shared/types";

interface MessageListProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  focusedFile: string | null;
  focusedLineRange: FocusedLineRange | null;
  prContext?: PRContext | null;
  fileLine: number;
  fileSide: "LEFT" | "RIGHT";
  onAddToReview: (comment: ReviewPendingComment) => void;
  onSummaryReady?: (bullets: string[]) => void;
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
      <div className="flex-1 flex items-center justify-center p-6">
        <p className="text-xs text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3">
      {messages.map((msg, i) => (
        <MessageBubble
          key={i}
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
