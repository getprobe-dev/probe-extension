import { X } from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import type { ChatMessage } from "../../shared/types";

interface ContextInspectorProps {
  systemPrompt: string;
  messages: ChatMessage[];
  onClose: () => void;
}

export function ContextInspector({ systemPrompt, messages, onClose }: ContextInspectorProps) {
  return (
    <div className="flex flex-col h-full animate-fade-in" style={{ background: "#0b1a18" }}>
      <div className="flex items-center justify-between px-4 h-10 bg-navy text-white shrink-0 border-b border-mint/10">
        <span className="text-xs font-bold tracking-tight text-mint uppercase">
          X-Ray
        </span>
        <button onClick={onClose} className="header-btn header-btn-close" title="Close X-Ray">
          <X className="size-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* System prompt */}
        <section>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[0.6rem] font-bold uppercase tracking-widest text-mint">
              System Prompt
            </span>
            <span className="text-[0.55rem]" style={{ color: "#64748b" }}>
              ({systemPrompt.length.toLocaleString()} chars)
            </span>
          </div>
          <div className="inspector-block">
            <div className="prose-xray max-w-none text-[0.75rem] leading-relaxed">
              <Markdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[[rehypeHighlight, { detect: true }]]}
              >
                {systemPrompt}
              </Markdown>
            </div>
          </div>
        </section>

        {/* Messages */}
        {messages.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[0.6rem] font-bold uppercase tracking-widest text-mint">
                Messages
              </span>
              <span className="text-[0.55rem]" style={{ color: "#64748b" }}>
                ({messages.length} message{messages.length !== 1 ? "s" : ""})
              </span>
            </div>
            <div className="space-y-2">
              {messages.map((msg, i) => (
                <div key={`${msg.role}-${msg.timestamp}-${i}`} className="inspector-block">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-[0.6rem] font-bold uppercase tracking-wider ${
                        msg.role === "user" ? "text-mint" : "text-[#93c5fd]"
                      }`}
                    >
                      {msg.role}
                    </span>
                  </div>
                  <div className="prose-xray max-w-none text-[0.75rem] leading-relaxed">
                    <Markdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[[rehypeHighlight, { detect: true }]]}
                    >
                      {msg.content || "(empty — awaiting response)"}
                    </Markdown>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
