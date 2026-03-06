import { useState, useEffect, useCallback, useRef } from "react";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";
import { ReviewQueue } from "./ReviewQueue";
import { Button } from "@/components/ui/button";
import { X, Trash2, FileText } from "lucide-react";
import { getIconUrl } from "../utils/theme";
import type { ChatMessage, PRContext, StreamEvent, BackgroundMessage, ReviewPendingComment, FocusedLineRange } from "../../shared/types";
import { STORAGE_KEYS } from "../../shared/types";
import { extractPRContext, extractDiffForFile, fetchFileContent, extractFirstChangedLine } from "../../shared/context";

interface ChatPanelProps {
  onClose: () => void;
  focusedFile: string | null;
  focusedLineRange: FocusedLineRange | null;
  onClearFocus: () => void;
  onDiffLoaded: (diff: string) => void;
}

export function ChatPanel({ onClose, focusedFile, focusedLineRange, onClearFocus, onDiffLoaded }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prContext, setPrContext] = useState<PRContext | null>(null);
  const [pendingReview, setPendingReview] = useState<ReviewPendingComment[]>([]);
  const portRef = useRef<chrome.runtime.Port | null>(null);
  const storageKeyRef = useRef<string>("");
  const reviewKeyRef = useRef<string>("");

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const context = await extractPRContext();
        if (cancelled) return;
        setPrContext(context);
        onDiffLoaded(context.diff);

        const key = STORAGE_KEYS.chatHistory(context.owner, context.repo, context.number);
        storageKeyRef.current = key;

        const rKey = STORAGE_KEYS.pendingReview(context.owner, context.repo, context.number);
        reviewKeyRef.current = rKey;

        chrome.storage.local.get([key, rKey], (result) => {
          if (cancelled) return;
          if (result[key]) setMessages(result[key] as ChatMessage[]);
          if (result[rKey]) setPendingReview(result[rKey] as ReviewPendingComment[]);
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
  }, [focusedFile, focusedLineRange]);

  const persistMessages = useCallback((msgs: ChatMessage[]) => {
    if (!storageKeyRef.current) return;
    chrome.storage.local.set({ [storageKeyRef.current]: msgs });
  }, []);

  const persistReview = useCallback((comments: ReviewPendingComment[]) => {
    if (!reviewKeyRef.current) return;
    if (comments.length === 0) {
      chrome.storage.local.remove(reviewKeyRef.current);
    } else {
      chrome.storage.local.set({ [reviewKeyRef.current]: comments });
    }
  }, []);

  const handleAddToReview = useCallback((comment: ReviewPendingComment) => {
    setPendingReview((prev) => {
      const next = [...prev, comment];
      persistReview(next);
      return next;
    });
  }, [persistReview]);

  const handleRemoveFromReview = useCallback((index: number) => {
    setPendingReview((prev) => {
      const next = prev.filter((_, i) => i !== index);
      persistReview(next);
      return next;
    });
  }, [persistReview]);

  const handleClearReview = useCallback(() => {
    setPendingReview([]);
    persistReview([]);
  }, [persistReview]);

  const fileLine = prContext && focusedFile
    ? extractFirstChangedLine(prContext.diff, focusedFile)
    : { line: 1, side: "RIGHT" as const };

  const handleSend = useCallback(
    async (content: string) => {
      if (!prContext || isStreaming) return;

      const userMessage: ChatMessage = { role: "user", content, timestamp: Date.now() };
      const assistantMessage: ChatMessage = { role: "assistant", content: "", timestamp: Date.now() };
      const newMessages = [...messages, userMessage, assistantMessage];
      setMessages(newMessages);
      setIsStreaming(true);
      setError(null);

      let contextToSend: PRContext = { ...prContext };

      if (focusedFile) {
        const fileDiff = extractDiffForFile(prContext.diff, focusedFile);
        contextToSend = { ...prContext, diff: fileDiff, focusedFile };
        if (focusedLineRange) {
          contextToSend.focusedLineRange = focusedLineRange;
        }
        const fileContent = await fetchFileContent(prContext.owner, prContext.repo, prContext.headBranch, focusedFile);
        if (fileContent) contextToSend.focusedFileContent = fileContent;
      }

      let port: chrome.runtime.Port;
      try {
        port = chrome.runtime.connect({ name: "probe-chat" });
      } catch {
        setIsStreaming(false);
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: "assistant" as const, content: "Extension was reloaded. Please refresh the page.", timestamp: Date.now() },
        ]);
        return;
      }
      portRef.current = port;

      port.onMessage.addListener((event: StreamEvent) => {
        if (event.type === "chunk") {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last.role === "assistant") {
              updated[updated.length - 1] = { ...last, content: last.content + event.content };
            }
            return updated;
          });
        } else if (event.type === "done") {
          setIsStreaming(false);
          setMessages((prev) => { persistMessages(prev); return prev; });
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
        payload: { messages: [...messages, userMessage], context: contextToSend },
      };
      port.postMessage(payload);
    },
    [prContext, isStreaming, messages, persistMessages, focusedFile, focusedLineRange]
  );

  const handleStop = useCallback(() => {
    portRef.current?.postMessage({ type: "stop" });
    portRef.current?.disconnect();
    setIsStreaming(false);
    setMessages((prev) => { persistMessages(prev); return prev; });
  }, [persistMessages]);

  const handleClear = useCallback(() => {
    setMessages([]);
    setError(null);
    if (storageKeyRef.current) chrome.storage.local.remove(storageKeyRef.current);
  }, []);

  const fileName = focusedFile?.split("/").pop() ?? focusedFile;

  return (
    <div className="flex flex-col h-full bg-background text-foreground">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 bg-navy text-white shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <img
            src={getIconUrl(48)}
            alt="PRobe"
            width={24}
            height={24}
            className="rounded-md shrink-0"
          />
          <span className="text-sm font-medium text-white/60 truncate">
            {prContext ? `#${prContext.number} ${prContext.title}` : ""}
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          {prContext && (
            <ReviewQueue
              pending={pendingReview}
              owner={prContext.owner}
              repo={prContext.repo}
              number={prContext.number}
              onClear={handleClearReview}
              onRemove={handleRemoveFromReview}
            />
          )}
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={handleClear}
              className="text-white/50 hover:text-white hover:bg-white/10"
              title="Clear chat"
            >
              <Trash2 className="size-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onClose}
            className="text-white/50 hover:text-white hover:bg-white/10"
            title="Close panel"
          >
            <X className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* File focus pill */}
      {focusedFile && (
        <div className="flex items-center px-4 py-2 border-b border-border bg-mint-faint">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-mint-light/50 border border-mint/30 text-navy text-xs font-medium max-w-full leading-tight">
            <FileText className="size-3 shrink-0" />
            <span className="truncate" title={focusedFile}>
              {fileName}
              {focusedLineRange && (
                <span className="text-primary font-semibold">
                  {" "}L{focusedLineRange.startLine}
                  {focusedLineRange.endLine !== focusedLineRange.startLine
                    ? `\u2013L${focusedLineRange.endLine}`
                    : ""}
                </span>
              )}
            </span>
            <button
              onClick={onClearFocus}
              className="inline-flex items-center justify-center size-4 rounded-full hover:bg-mint/30 text-navy/60 hover:text-navy transition-colors shrink-0"
              title="Return to whole-PR mode"
            >
              <X className="size-2.5" />
            </button>
          </div>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="px-4 py-2 bg-destructive/10 border-b border-destructive/20 text-xs text-destructive">
          {error}
        </div>
      )}

      {/* Messages */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
          Loading PR context…
        </div>
      ) : (
        <MessageList
          messages={messages}
          isStreaming={isStreaming}
          focusedFile={focusedFile}
          focusedLineRange={focusedLineRange}
          onPromptSelect={handleSend}
          prOwner={prContext?.owner}
          prRepo={prContext?.repo}
          prNumber={prContext?.number}
          fileLine={fileLine.line}
          fileSide={fileLine.side}
          onAddToReview={handleAddToReview}
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
