import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatMessage } from "../../shared/types";

interface MessageBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
}

export function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div className={`prs-flex ${isUser ? "prs-justify-end" : "prs-justify-start"} prs-mb-3`}>
      <div
        className={`prs-max-w-[85%] prs-rounded-xl prs-px-3.5 prs-py-2.5 prs-text-sm prs-leading-relaxed ${
          isUser
            ? "prs-bg-purple-600 prs-text-white"
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
              <span className="prs-inline-block prs-w-1.5 prs-h-4 prs-bg-purple-500 prs-animate-pulse prs-ml-0.5 prs-align-middle prs-rounded-sm" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
