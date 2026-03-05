import { useEffect, useRef } from "react";
import { MessageBubble } from "./MessageBubble";
import { PromptStarters } from "./PromptStarters";
import type { ChatMessage, ReviewPendingComment } from "../../shared/types";

interface MessageListProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  focusedFile: string | null;
  onPromptSelect: (prompt: string) => void;
  prOwner?: string;
  prRepo?: string;
  prNumber?: number;
  fileLine: number;
  fileSide: "LEFT" | "RIGHT";
  onAddToReview: (comment: ReviewPendingComment) => void;
}

export function MessageList({
  messages,
  isStreaming,
  focusedFile,
  onPromptSelect,
  prOwner,
  prRepo,
  prNumber,
  fileLine,
  fileSide,
  onAddToReview,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, messages[messages.length - 1]?.content]);

  if (messages.length === 0) {
    return (
      <PromptStarters focusedFile={focusedFile} onSelect={onPromptSelect} />
    );
  }

  return (
    <div className="prs-flex-1 prs-overflow-y-auto prs-p-4">
      {messages.map((msg, i) => (
        <MessageBubble
          key={i}
          message={msg}
          isStreaming={isStreaming && i === messages.length - 1 && msg.role === "assistant"}
          prOwner={prOwner}
          prRepo={prRepo}
          prNumber={prNumber}
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
