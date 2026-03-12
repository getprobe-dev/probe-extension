import { useState, useEffect, useCallback, useRef } from "react";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";
import { ReviewQueue } from "./ReviewQueue";
import { SetupGuide } from "./SetupGuide";
import { X, ArrowLeft, Zap, ExternalLink, ScanEye } from "lucide-react";
import { ContextInspector } from "./ContextInspector";
import { getIconUrl } from "../utils/theme";
import type {
  ChatMessage,
  PRContext,
  EnrichedPRContext,
  StreamEvent,
  BackgroundMessage,
  ReviewPendingComment,
  FocusedItem,
  SkillIndicator,
  FetchEnrichedContextResponse,
  PromptSuggestion,
} from "../../shared/types";
import { STORAGE_KEYS } from "../../shared/types";
import {
  extractPRContext,
  extractDiffForFile,
  fetchFileContent,
  extractFirstChangedLine,
} from "../../shared/context";
import { sendMessage } from "../../shared/messaging";

interface ChatPanelProps {
  onClose: () => void;
  focusedItems: FocusedItem[];
  onClearFocus: () => void;
  onRemoveItem: (index: number) => void;
  onDiffLoaded: (diff: string) => void;
}

export function ChatPanel({
  onClose,
  focusedItems,
  onClearFocus,
  onRemoveItem,
  onDiffLoaded,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prContext, setPrContext] = useState<PRContext | null>(null);
  const [enrichedContext, setEnrichedContext] = useState<EnrichedPRContext | null>(null);
  const [pendingReview, setPendingReview] = useState<ReviewPendingComment[]>([]);
  const [focusBullets, setFocusBullets] = useState<PromptSuggestion[] | null>(null);
  const [focusBulletsLoading, setFocusBulletsLoading] = useState(false);
  const [activeSkills, setActiveSkills] = useState<SkillIndicator[]>([]);
  const [systemPrompt, setSystemPrompt] = useState<string>("");
  const [showInspector, setShowInspector] = useState(false);
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const [hasGithubToken, setHasGithubToken] = useState<boolean | null>(null);
  const [followUpSuggestions, setFollowUpSuggestions] = useState<PromptSuggestion[] | null>(null);
  const portRef = useRef<chrome.runtime.Port | null>(null);
  const storageKeyRef = useRef<string>("");
  const lastAssistantContentRef = useRef<string>("");
  const reviewKeyRef = useRef<string>("");

  const checkKeys = useCallback(() => {
    chrome.storage.sync.get([STORAGE_KEYS.API_KEY, STORAGE_KEYS.GITHUB_TOKEN], (result) => {
      setHasApiKey(!!result[STORAGE_KEYS.API_KEY]);
      setHasGithubToken(!!result[STORAGE_KEYS.GITHUB_TOKEN]);
    });
  }, []);

  useEffect(() => {
    checkKeys();
  }, [checkKeys]);

  const needsSetup = hasApiKey === false || hasGithubToken === false;

  useEffect(() => {
    return () => {
      portRef.current?.disconnect();
      portRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (needsSetup) return;
    let cancelled = false;
    let enrichedContextRequestId: string | null = null;

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

        const requestId = `ec-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        enrichedContextRequestId = requestId;

        sendMessage<FetchEnrichedContextResponse>({
          type: "fetch-enriched-context",
          owner: context.owner,
          repo: context.repo,
          number: context.number,
          requestId,
        })
          .then((res) => {
            enrichedContextRequestId = null;
            if (cancelled) return;
            if (res.ok && res.context) setEnrichedContext(res.context);
          })
          .catch(() => {
            enrichedContextRequestId = null;
            /* enriched context is best-effort */
          });
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load PR context");
        setIsLoading(false);
      }
    }

    init();
    return () => {
      cancelled = true;
      if (enrichedContextRequestId) {
        chrome.runtime.sendMessage({ type: "cancel-enriched-context", requestId: enrichedContextRequestId });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsSetup]);

  const focusKey = focusedItems
    .map((it) =>
      it.lineRange ? `${it.file}:${it.lineRange.startLine}-${it.lineRange.endLine}` : it.file,
    )
    .join("\0");
  useEffect(() => {
    setMessages([]);
    setError(null);
  }, [focusKey]);

  const MAX_STORED_MESSAGES = 100;

  const persistMessages = useCallback((msgs: ChatMessage[]) => {
    if (!storageKeyRef.current) return;
    const capped = msgs.length > MAX_STORED_MESSAGES ? msgs.slice(-MAX_STORED_MESSAGES) : msgs;
    chrome.storage.local.set({ [storageKeyRef.current]: capped });
  }, []);

  const persistReview = useCallback((comments: ReviewPendingComment[]) => {
    if (!reviewKeyRef.current) return;
    if (comments.length === 0) {
      chrome.storage.local.remove(reviewKeyRef.current);
    } else {
      chrome.storage.local.set({ [reviewKeyRef.current]: comments });
    }
  }, []);

  const handleAddToReview = useCallback(
    (comment: ReviewPendingComment) => {
      setPendingReview((prev) => {
        const next = [...prev, comment];
        persistReview(next);
        return next;
      });
    },
    [persistReview],
  );

  const handleRemoveFromReview = useCallback(
    (index: number) => {
      setPendingReview((prev) => {
        const next = prev.filter((_, i) => i !== index);
        persistReview(next);
        return next;
      });
    },
    [persistReview],
  );

  const handleClearReview = useCallback(() => {
    setPendingReview([]);
    persistReview([]);
  }, [persistReview]);

  const primaryFile = focusedItems.length > 0 ? focusedItems[0].file : null;

  const fileLine =
    prContext && primaryFile
      ? extractFirstChangedLine(prContext.diff, primaryFile)
      : { line: 1, side: "RIGHT" as const };

  const handleSend = useCallback(
    async (content: string) => {
      if (!prContext || isStreaming) return;

      setFollowUpSuggestions(null);
      lastAssistantContentRef.current = "";

      const userMessage: ChatMessage = { role: "user", content, timestamp: Date.now() };
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

      if (focusedItems.length > 0) {
        const diffs: string[] = [];
        const contents: string[] = [];
        const fileNames: string[] = [];
        const lineRanges: string[] = [];

        const uniqueFiles = [...new Set(focusedItems.map((it) => it.file))];
        for (const file of uniqueFiles) {
          diffs.push(extractDiffForFile(prContext.diff, file));
          const fc = await fetchFileContent(
            prContext.owner,
            prContext.repo,
            prContext.headBranch,
            file,
          );
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

        const itemsWithLines = focusedItems.filter(
          (it): it is FocusedItem & { lineRange: NonNullable<FocusedItem["lineRange"]> } =>
            !!it.lineRange,
        );
        if (itemsWithLines.length === 1) {
          contextToSend.focusedLineRange = itemsWithLines[0].lineRange;
        } else if (itemsWithLines.length > 1) {
          const lineContext = itemsWithLines
            .map(
              (it) =>
                `[${it.file} L${it.lineRange.startLine}-${it.lineRange.endLine}]:\n${it.lineRange.content}`,
            )
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
          {
            role: "assistant" as const,
            content: "Extension was reloaded. Please refresh the page.",
            timestamp: Date.now(),
          },
        ]);
        return;
      }
      portRef.current = port;

      port.onMessage.addListener((event: StreamEvent) => {
        if (event.type === "skills") {
          setActiveSkills(event.skills);
          return;
        }
        if (event.type === "system-prompt") {
          setSystemPrompt(event.content);
          return;
        }
        if (event.type === "chunk") {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last.role === "assistant") {
              const newContent = last.content + event.content;
              lastAssistantContentRef.current = newContent;
              updated[updated.length - 1] = { ...last, content: newContent };
            }
            return updated;
          });
        } else if (event.type === "done") {
          setIsStreaming(false);
          const fullContent = lastAssistantContentRef.current;
          const match = fullContent.match(/\n*%%SUGGESTIONS:(\[[\s\S]*?\])\s*$/);
          let cleanContent = fullContent;
          if (match) {
            try {
              const parsed: unknown = JSON.parse(match[1]);
              if (Array.isArray(parsed)) {
                const suggestions = parsed
                  .filter(
                    (s): s is PromptSuggestion =>
                      typeof s === "object" &&
                      s !== null &&
                      typeof (s as Record<string, unknown>).label === "string" &&
                      typeof (s as Record<string, unknown>).prompt === "string",
                  )
                  .slice(0, 2);
                if (suggestions.length > 0) setFollowUpSuggestions(suggestions);
              }
            } catch { /* malformed JSON — skip */ }
            cleanContent = fullContent.slice(0, fullContent.length - match[0].length).trimEnd();
          }
          lastAssistantContentRef.current = "";
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last?.role === "assistant" && match) {
              updated[updated.length - 1] = { ...last, content: cleanContent };
            }
            persistMessages(updated);
            return updated;
          });
          port.disconnect();
        } else if (event.type === "error") {
          setIsStreaming(false);
          setError(event.message);
          setMessages((prev) => {
            const updated = prev.filter(
              (_, i) =>
                !(i === prev.length - 1 && prev[i].role === "assistant" && prev[i].content === ""),
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
          enrichedContext: enrichedContext ?? undefined,
        },
      };
      port.postMessage(payload);
    },
    [prContext, isStreaming, messages, persistMessages, focusedItems, enrichedContext],
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
    if (storageKeyRef.current) chrome.storage.local.remove(storageKeyRef.current);
  }, []);

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full bg-background text-foreground">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-12 bg-[#1a2e2b] text-white shrink-0 border-b border-[#5eead4]/10">
        <div className="flex items-center gap-2 min-w-0">
          {messages.length > 0 && (
            <button
              onClick={handleClear}
              className="header-btn shrink-0"
              title="New chat"
            >
              <ArrowLeft className="size-4" />
            </button>
          )}
          <img
            src={getIconUrl(48)}
            alt="PRobe"
            width={22}
            height={22}
            className="rounded-md shrink-0"
          />
          <span className="text-sm font-bold tracking-tight text-white">
            PRobe
          </span>
          {prContext && (
            <span className="text-xs font-medium text-white/40">
              #{prContext.number}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {systemPrompt && (
            <button
              onClick={() => setShowInspector((v) => !v)}
              className={`header-btn ${showInspector ? "text-mint" : ""}`}
              title="X-Ray"
            >
              <ScanEye className="size-4" />
            </button>
          )}
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
          <button onClick={onClose} className="header-btn header-btn-close" title="Close panel">
            <X className="size-4" />
          </button>
        </div>
      </div>

      {/* Active skills indicator */}
      {activeSkills.length > 0 && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#15231f] border-b border-mint/10 overflow-x-auto shrink-0">
          <Zap className="size-3 text-mint shrink-0" />
          {activeSkills.map((skill) => (
            <a
              key={skill.name}
              href={skill.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              title={skill.description}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-mint/15 text-mint whitespace-nowrap hover:bg-mint/25 transition-colors cursor-pointer"
            >
              {skill.name}
              <ExternalLink className="size-2.5" />
            </a>
          ))}
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="px-3 py-1.5 bg-destructive/10 border-b border-destructive/20 text-xs text-destructive">
          {error}
        </div>
      )}

      {/* Main content */}
      {needsSetup ? (
        <SetupGuide onKeysReady={checkKeys} />
      ) : showInspector ? (
        <ContextInspector
          systemPrompt={systemPrompt}
          messages={messages}
          onClose={() => setShowInspector(false)}
        />
      ) : (
        <>
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <img src={getIconUrl(128)} alt="PRobe" className="size-14 rounded-2xl animate-logo-pulse" />
            </div>
          ) : (
            <MessageList
              messages={messages}
              isStreaming={isStreaming}
              focusedFile={primaryFile}
              prContext={prContext}
              fileLine={fileLine.line}
              fileSide={fileLine.side}
              onAddToReview={handleAddToReview}
              onSummaryLoading={() => setFocusBulletsLoading(true)}
              onSummaryReady={(bullets) => {
                setFocusBullets(bullets);
                setFocusBulletsLoading(false);
              }}
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
            focusBulletsLoading={focusBulletsLoading}
            followUpSuggestions={followUpSuggestions}
            onRemoveItem={onRemoveItem}
            onClearFocus={onClearFocus}
          />
        </>
      )}
    </div>
  );
}
