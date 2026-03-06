import { useState, useRef, useEffect } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CommentComposer } from "./CommentComposer";
import { Copy, Check, MessageSquare } from "lucide-react";
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
  const composerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showComposer && composerRef.current) {
      composerRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [showComposer]);

  const canPost = !isUser && !isStreaming && message.content.length > 0;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className={`flex flex-col ${isUser ? "items-end" : "items-start"} mb-3 animate-fade-in`}>
      <div className="msg-bubble-wrapper">
        <div
          className={`px-3.5 py-2.5 text-[0.84rem] leading-relaxed overflow-hidden ${
            isUser
              ? "bg-[#5eead4] text-[#1a2e2b] rounded-2xl rounded-br-md"
              : "bg-[#f1f5f9] text-[#1a2e2b] rounded-2xl rounded-bl-md"
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : message.content.length === 0 && isStreaming ? (
            <div className="flex items-center gap-1.5 py-0.5">
              <span className="size-1.5 rounded-full bg-[#5eead4] animate-bounce [animation-delay:0ms]" />
              <span className="size-1.5 rounded-full bg-[#5eead4] animate-bounce [animation-delay:150ms]" />
              <span className="size-1.5 rounded-full bg-[#5eead4] animate-bounce [animation-delay:300ms]" />
            </div>
          ) : (
            <div className={`prose-chat max-w-none ${isStreaming ? "prose-chat-streaming" : ""}`}>
              <Markdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </Markdown>
            </div>
          )}
        </div>

        {canPost && (
          <div className="msg-actions">
            <button
              onClick={handleCopy}
              className="p-1 rounded-md text-muted-foreground hover:text-[#1a2e2b] hover:bg-[#f1f5f9] cursor-pointer transition-colors"
              title={copied ? "Copied!" : "Copy to clipboard"}
            >
              {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
            </button>
            <button
              onClick={() => setShowComposer(true)}
              className="p-1 rounded-md text-muted-foreground hover:text-[#1a2e2b] hover:bg-[#f1f5f9] cursor-pointer transition-colors"
              title="Post as PR comment"
            >
              <MessageSquare className="size-3" />
            </button>
          </div>
        )}
      </div>

      {showComposer && prOwner && prRepo && prNumber && (
        <div ref={composerRef} className="w-full max-w-[85%] mt-1.5">
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
