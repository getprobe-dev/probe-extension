import { useEffect, useRef } from "react";
import { MessageBubble } from "./MessageBubble";
import type { ChatMessage } from "../../shared/types";

interface MessageListProps {
  messages: ChatMessage[];
  isStreaming: boolean;
}

export function MessageList({ messages, isStreaming }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, messages[messages.length - 1]?.content]);

  if (messages.length === 0) {
    return (
      <div className="prs-flex-1 prs-flex prs-flex-col prs-items-center prs-justify-center prs-p-6 prs-text-center">
        <div className="prs-w-12 prs-h-12 prs-rounded-full prs-bg-purple-100 prs-flex prs-items-center prs-justify-center prs-mb-3">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
        </div>
        <p className="prs-text-sm prs-font-medium prs-text-neutral-700 prs-mb-1">
          Chat with this PR
        </p>
        <p className="prs-text-xs prs-text-neutral-400 prs-max-w-[200px]">
          Ask questions about the changes, understand the intent, or spot issues.
        </p>
      </div>
    );
  }

  return (
    <div className="prs-flex-1 prs-overflow-y-auto prs-p-4">
      {messages.map((msg, i) => (
        <MessageBubble
          key={i}
          message={msg}
          isStreaming={isStreaming && i === messages.length - 1 && msg.role === "assistant"}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
