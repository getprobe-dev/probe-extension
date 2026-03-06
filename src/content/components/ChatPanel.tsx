import { useState, useEffect, useCallback, useRef } from "react";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";
import { ReviewQueue } from "./ReviewQueue";
import { X, Plus } from "lucide-react";
import { getIconUrl } from "../utils/theme";
import type { ChatMessage, PRContext, StreamEvent, BackgroundMessage, ReviewPendingComment, FocusedItem } from "../../shared/types";
import { STORAGE_KEYS } from "../../shared/types";
import { extractPRContext, extractDiffForFile, fetchFileContent, extractFirstChangedLine } from "../../shared/context";

interface ChatPanelProps {
  onClose: () => void;
  focusedItems: FocusedItem[];
  onClearFocus: () => void;
  onRemoveItem: (index: number) => void;
  onDiffLoaded: (diff: string) => void;
}

export function ChatPanel({ onClose, focusedItems, onClearFocus, onRemoveItem, onDiffLoaded }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prContext, setPrContext] = useState<PRContext | null>(null);
  const [pendingReview, setPendingReview] = useState<ReviewPendingComment[]>([]);
  const [focusBullets, setFocusBullets] = useState<string[] | null>(null);
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

  const focusKey = focusedItems.map((it) =>
    it.lineRange ? `${it.file}:${it.lineRange.startLine}-${it.lineRange.endLine}` : it.file
  ).join("\0");
  useEffect(() => {
    setMessages([]);
    setError(null);
  }, [focusKey]);

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

  const primaryFile = focusedItems.length > 0 ? focusedItems[0].file : null;

  const fileLine = prContext && primaryFile
    ? extractFirstChangedLine(prContext.diff, primaryFile)
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

      if (focusedItems.length > 0) {
        const diffs: string[] = [];
        const contents: string[] = [];
        const fileNames: string[] = [];
        const lineRanges: string[] = [];

        const uniqueFiles = [...new Set(focusedItems.map((it) => it.file))];
        for (const file of uniqueFiles) {
          diffs.push(extractDiffForFile(prContext.diff, file));
          const fc = await fetchFileContent(prContext.owner, prContext.repo, prContext.headBranch, file);
          if (fc) contents.push(`// ${file}\n${fc}`);
        }

        for (const item of focusedItems) {
          if (item.lineRange) {
            lineRanges.push(`${item.file} L${item.lineRange.startLine}-${item.lineRange.endLine}`);
            fileNames.push(item.file);
          } else {
            fileNames.push(item.file);
          }
        }

        contextToSend = {
          ...prContext,
          diff: diffs.join("\n"),
          focusedFile: [...new Set(fileNames)].join(", "),
        };

        const itemsWithLines = focusedItems.filter((it) => it.lineRange);
        if (itemsWithLines.length === 1) {
          contextToSend.focusedLineRange = itemsWithLines[0].lineRange;
        } else if (itemsWithLines.length > 1) {
          const lineContext = itemsWithLines
            .map((it) => `[${it.file} L${it.lineRange!.startLine}-${it.lineRange!.endLine}]:\n${it.lineRange!.content}`)
            .join("\n\n");
          contextToSend.focusedFileContent = [
            lineContext,
            ...(contents.length > 0 ? contents : []),
          ].join("\n\n");
        }

        if (itemsWithLines.length <= 1 && contents.length > 0) {
          contextToSend.focusedFileContent = contents.join("\n\n");
        }
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
    [prContext, isStreaming, messages, persistMessages, focusedItems]
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

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full bg-background text-foreground">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-12 bg-[#1a2e2b] text-white shrink-0 border-b border-[#5eead4]/10">
        <div className="flex items-center gap-2.5 min-w-0">
          <img
            src={getIconUrl(48)}
            alt="PRobe"
            width={22}
            height={22}
            className="rounded-md shrink-0"
          />
          <span className="text-sm font-bold tracking-tight text-white" style={{ fontFamily: "'Outfit', sans-serif" }}>
            PRobe
          </span>
          {prContext && (
            <span className="text-xs font-medium text-white/40" style={{ fontFamily: "'Outfit', sans-serif" }}>
              #{prContext.number}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
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
            <button
              onClick={handleClear}
              className="header-btn"
              title="New chat"
            >
              <Plus className="size-3.5" />
            </button>
          )}
          <button
            onClick={onClose}
            className="header-btn"
            title="Close panel"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="px-3 py-1.5 bg-destructive/10 border-b border-destructive/20 text-xs text-destructive">
          {error}
        </div>
      )}

      {/* Main content */}
      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2">
          <div className="size-5 border-2 border-[#5eead4]/30 border-t-[#5eead4] rounded-full animate-spin" />
          <span className="text-xs text-muted-foreground">Loading PR context…</span>
        </div>
      ) : (
        <MessageList
          messages={messages}
          isStreaming={isStreaming}
          focusedFile={primaryFile}
          focusedLineRange={focusedItems.find((it) => it.lineRange)?.lineRange ?? null}
          prContext={prContext}
          fileLine={fileLine.line}
          fileSide={fileLine.side}
          onAddToReview={handleAddToReview}
          onSummaryReady={setFocusBullets}
        />
      )}

      {/* Input */}
      <ChatInput
        onSend={handleSend}
        onStop={handleStop}
        disabled={isLoading || !prContext}
        isStreaming={isStreaming}
        showStarters={isEmpty && !isLoading}
        focusedItems={focusedItems}
        focusBullets={focusBullets}
        onRemoveItem={onRemoveItem}
        onClearFocus={onClearFocus}
      />
    </div>
  );
}
