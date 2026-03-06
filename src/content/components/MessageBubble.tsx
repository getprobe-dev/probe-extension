import { useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CommentComposer } from "./CommentComposer";
import type { ChatMessage, ReviewPendingComment } from "../../shared/types";

interface MessageBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
  prOwner?: string;
  prRepo?: string;
  prNumber?: number;
  focusedFile: string | null;
  fileLine: number;
  fileSide: "LEFT" | "RIGHT";
  onAddToReview: (comment: ReviewPendingComment) => void;
}

export function MessageBubble({
  message,
  isStreaming,
  prOwner,
  prRepo,
  prNumber,
  focusedFile,
  fileLine,
  fileSide,
  onAddToReview,
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const [showComposer, setShowComposer] = useState(false);
  const [copied, setCopied] = useState(false);

  const canPost = !isUser && !isStreaming && message.content.length > 0;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className={`prs-flex prs-flex-col ${isUser ? "prs-items-end" : "prs-items-start"} prs-mb-3`}>
      <div className="prs-msg-bubble-wrapper">
        <div
          className={`prs-max-w-[85%] prs-rounded-xl prs-px-3.5 prs-py-2.5 prs-text-sm prs-leading-relaxed ${
            isUser
              ? "prs-bg-teal-600 prs-text-white"
              : "prs-bg-neutral-100 prs-text-neutral-900"
          }`}
        >
          {isUser ? (
            <p className="prs-whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prs-prose prs-prose-sm prs-max-w-none">
              <Markdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </Markdown>
              {isStreaming && (
                <span className="prs-inline-block prs-w-1.5 prs-h-4 prs-bg-teal-500 prs-animate-pulse prs-ml-0.5 prs-align-middle prs-rounded-sm" />
              )}
            </div>
          )}
        </div>

        {canPost && (
          <div className="prs-msg-actions">
            <button
              onClick={handleCopy}
              className="prs-msg-action-btn"
              title={copied ? "Copied!" : "Copy to clipboard"}
            >
              {copied ? (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
              )}
            </button>
            <button
              onClick={() => setShowComposer(true)}
              className="prs-msg-action-btn"
              title="Post as PR comment"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {showComposer && prOwner && prRepo && prNumber && (
        <div className="prs-composer-container">
          <CommentComposer
            initialContent={message.content}
            owner={prOwner}
            repo={prRepo}
            number={prNumber}
            focusedFile={focusedFile}
            fileLine={fileLine}
            fileSide={fileSide}
            onClose={() => setShowComposer(false)}
            onAddToReview={onAddToReview}
          />
        </div>
      )}
    </div>
  );
}
