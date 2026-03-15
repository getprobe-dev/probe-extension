import { X } from "lucide-react";
import { MarkdownContent } from "./MarkdownContent";
import type { ChatMessage } from "../../shared/types";

const INSPECTOR_BG = "#0b1a18";
const MUTED_COLOR = "#64748b";

interface ContextInspectorProps {
  systemPrompt: string;
  messages: ChatMessage[];
  onClose: () => void;
}

export function ContextInspector({ systemPrompt, messages, onClose }: ContextInspectorProps) {
  return (
    <div
      className="flex flex-col h-full animate-fade-in"
      style={{ background: INSPECTOR_BG }}
      role="dialog"
      aria-label="X-Ray inspector"
    >
      <div className="flex items-center justify-between px-4 h-10 bg-navy text-white shrink-0 border-b border-mint/10">
        <span className="text-xs font-bold tracking-tight text-mint uppercase">X-Ray</span>
        <button
          onClick={onClose}
          className="header-btn header-btn-close"
          title="Close X-Ray"
          type="button"
          aria-label="Close X-Ray inspector"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <section>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[0.6rem] font-bold uppercase tracking-widest text-mint">
              System Prompt
            </span>
            <span className="text-[0.55rem]" style={{ color: MUTED_COLOR }}>
              ({systemPrompt.length.toLocaleString()} chars)
            </span>
          </div>
          <div className="inspector-block">
            <MarkdownContent
              content={systemPrompt}
              className="prose-xray max-w-none text-[0.75rem] leading-relaxed"
            />
          </div>
        </section>

        {messages.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[0.6rem] font-bold uppercase tracking-widest text-mint">
                Messages
              </span>
              <span className="text-[0.55rem]" style={{ color: MUTED_COLOR }}>
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
                  <MarkdownContent
                    content={msg.content || "(empty — awaiting response)"}
                    className="prose-xray max-w-none text-[0.75rem] leading-relaxed"
                  />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
