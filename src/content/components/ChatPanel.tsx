import { useState, useEffect, useCallback, useRef } from "react";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";
import type { ChatMessage, PRContext, StreamEvent, BackgroundMessage } from "../../shared/types";
import { STORAGE_KEYS } from "../../shared/types";
import { extractPRContext, extractDiffForFile, fetchFileContent } from "../../shared/context";

interface ChatPanelProps {
  onClose: () => void;
  focusedFile: string | null;
  onClearFocus: () => void;
}

export function ChatPanel({ onClose, focusedFile, onClearFocus }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prContext, setPrContext] = useState<PRContext | null>(null);
  const portRef = useRef<chrome.runtime.Port | null>(null);
  const storageKeyRef = useRef<string>("");

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const context = await extractPRContext();
        if (cancelled) return;
        setPrContext(context);

        const key = STORAGE_KEYS.chatHistory(context.owner, context.repo, context.number);
        storageKeyRef.current = key;

        chrome.storage.local.get(key, (result) => {
          if (cancelled) return;
          if (result[key]) {
            setMessages(result[key] as ChatMessage[]);
          }
          setIsLoading(false);
        });
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load PR context");
        setIsLoading(false);
      }
    }

    init();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    setMessages([]);
    setError(null);
  }, [focusedFile]);

  const persistMessages = useCallback((msgs: ChatMessage[]) => {
    if (!storageKeyRef.current) return;
    chrome.storage.local.set({ [storageKeyRef.current]: msgs });
  }, []);

  const handleSend = useCallback(
    async (content: string) => {
      if (!prContext || isStreaming) return;

      const userMessage: ChatMessage = {
        role: "user",
        content,
        timestamp: Date.now(),
      };

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: "",
        timestamp: Date.now(),
      };

      const newMessages = [...messages, userMessage, assistantMessage];
      setMessages(newMessages);
      setIsStreaming(true);
      setError(null);

      let contextToSend: PRContext = { ...prContext };

      if (focusedFile) {
        const fileDiff = extractDiffForFile(prContext.diff, focusedFile);
        contextToSend = {
          ...prContext,
          diff: fileDiff,
          focusedFile,
        };

        const fileContent = await fetchFileContent(
          prContext.owner,
          prContext.repo,
          prContext.headBranch,
          focusedFile
        );
        if (fileContent) {
          contextToSend.focusedFileContent = fileContent;
        }
      }

      const port = chrome.runtime.connect({ name: "sidekick-chat" });
      portRef.current = port;

      port.onMessage.addListener((event: StreamEvent) => {
        if (event.type === "chunk") {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last.role === "assistant") {
              updated[updated.length - 1] = {
                ...last,
                content: last.content + event.content,
              };
            }
            return updated;
          });
        } else if (event.type === "done") {
          setIsStreaming(false);
          setMessages((prev) => {
            persistMessages(prev);
            return prev;
          });
          port.disconnect();
        } else if (event.type === "error") {
          setIsStreaming(false);
          setError(event.message);
          setMessages((prev) => {
            const updated = prev.filter(
              (_, i) => !(i === prev.length - 1 && prev[i].role === "assistant" && prev[i].content === "")
            );
            persistMessages(updated);
            return updated;
          });
          port.disconnect();
        }
      });

      const payload: BackgroundMessage = {
        type: "chat",
        payload: {
          messages: [...messages, userMessage],
          context: contextToSend,
        },
      };
      port.postMessage(payload);
    },
    [prContext, isStreaming, messages, persistMessages, focusedFile]
  );

  const handleStop = useCallback(() => {
    portRef.current?.postMessage({ type: "stop" });
    portRef.current?.disconnect();
    setIsStreaming(false);
    setMessages((prev) => {
      persistMessages(prev);
      return prev;
    });
  }, [persistMessages]);

  const handleClear = useCallback(() => {
    setMessages([]);
    setError(null);
    if (storageKeyRef.current) {
      chrome.storage.local.remove(storageKeyRef.current);
    }
  }, []);

  const fileName = focusedFile?.split("/").pop() ?? focusedFile;

  return (
    <div className="prs-flex prs-flex-col prs-h-full prs-bg-white prs-text-neutral-900">
      {/* Header */}
      <div className="prs-flex prs-items-center prs-justify-between prs-px-4 prs-py-3 prs-border-b prs-border-neutral-200 prs-bg-white">
        <div className="prs-flex prs-items-center prs-gap-2 prs-min-w-0">
          <div className="prs-w-6 prs-h-6 prs-rounded-md prs-bg-purple-600 prs-flex prs-items-center prs-justify-center prs-text-white prs-text-[10px] prs-font-bold prs-shrink-0">
            PR
          </div>
          <span className="prs-text-sm prs-font-semibold prs-truncate">
            {prContext ? `#${prContext.number} ${prContext.title}` : "PR Sidekick"}
          </span>
        </div>
        <div className="prs-flex prs-items-center prs-gap-1">
          {messages.length > 0 && (
            <button
              onClick={handleClear}
              className="prs-p-1.5 prs-rounded-md hover:prs-bg-neutral-100 prs-text-neutral-400 hover:prs-text-neutral-600 prs-transition-colors"
              title="Clear chat"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
            </button>
          )}
          <button
            onClick={onClose}
            className="prs-p-1.5 prs-rounded-md hover:prs-bg-neutral-100 prs-text-neutral-400 hover:prs-text-neutral-600 prs-transition-colors"
            title="Close panel"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* File focus pill */}
      {focusedFile && (
        <div className="prs-flex prs-items-center prs-px-4 prs-py-2 prs-border-b prs-border-neutral-200 prs-bg-neutral-100">
          <div className="prs-file-focus-pill">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z" />
              <polyline points="13 2 13 9 20 9" />
            </svg>
            <span className="prs-truncate" title={focusedFile}>{fileName}</span>
            <button
              onClick={onClearFocus}
              className="prs-file-focus-clear"
              title="Return to whole-PR mode"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="prs-px-4 prs-py-2 prs-bg-red-50 prs-border-b prs-border-red-100 prs-text-xs prs-text-red-600">
          {error}
        </div>
      )}

      {/* Messages */}
      {isLoading ? (
        <div className="prs-flex-1 prs-flex prs-items-center prs-justify-center prs-text-sm prs-text-neutral-400">
          Loading PR context…
        </div>
      ) : (
        <MessageList
          messages={messages}
          isStreaming={isStreaming}
          focusedFile={focusedFile}
          onPromptSelect={handleSend}
        />
      )}

      {/* Input */}
      <ChatInput
        onSend={handleSend}
        onStop={handleStop}
        disabled={isLoading || !prContext}
        isStreaming={isStreaming}
      />
    </div>
  );
}
