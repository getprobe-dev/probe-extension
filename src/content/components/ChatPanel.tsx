import { useState, useEffect, useCallback, useMemo } from "react";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";
import { SetupGuide } from "./SetupGuide";
import { ContextInspector } from "./ContextInspector";
import { ChatHeader } from "./ChatHeader";
import { ActiveSkillsBar } from "./ActiveSkillsBar";
import { ChatErrorBanner } from "./ChatErrorBanner";
import { getIconUrl } from "../utils/iconUtils";
import { usePRLoader } from "../hooks/usePRLoader";
import { useChatStreaming } from "../hooks/useChatStreaming";
import { ReviewContext } from "../context/ReviewContext";
import { extractFirstChangedLine, scrapeViewerLogin, fetchFileContent } from "../../shared/context";
import { sendMessage } from "../../shared/messaging";
import { STORAGE_KEYS } from "../../shared/config";
import type {
  ChatMessage,
  ReviewPendingComment,
  FocusedItem,
  PromptSuggestion,
  SimTestResponse,
} from "../../shared/types";

const MAX_STORED_MESSAGES = 100;

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
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const [hasGithubToken, setHasGithubToken] = useState<boolean | null>(null);

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

  // PR context loading
  const {
    prContext,
    enrichedContext,
    isLoading,
    error: contextError,
    storageKeyRef,
    reviewKeyRef,
    setInitialMessages,
  } = usePRLoader(needsSetup, onDiffLoaded);

  // Messages and persistence
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pendingReview, setPendingReview] = useState<ReviewPendingComment[]>([]);
  const [focusBullets, setFocusBullets] = useState<PromptSuggestion[] | null>(null);
  const [focusBulletsLoading, setFocusBulletsLoading] = useState(false);
  const [showInspector, setShowInspector] = useState(false);

  // Load stored messages + review once storage key is available
  useEffect(() => {
    setInitialMessages((result) => {
      const key = storageKeyRef.current;
      const rKey = reviewKeyRef.current;
      if (result[key]) setMessages(result[key] as ChatMessage[]);
      if (result[rKey]) setPendingReview(result[rKey] as ReviewPendingComment[]);
    });
  }, [setInitialMessages, storageKeyRef, reviewKeyRef]);

  const persistMessages = useCallback(
    (msgs: ChatMessage[]) => {
      if (!storageKeyRef.current) return;
      const capped = msgs.length > MAX_STORED_MESSAGES ? msgs.slice(-MAX_STORED_MESSAGES) : msgs;
      chrome.storage.local.set({ [storageKeyRef.current]: capped });
    },
    [storageKeyRef],
  );

  const persistReview = useCallback(
    (comments: ReviewPendingComment[]) => {
      if (!reviewKeyRef.current) return;
      if (comments.length === 0) {
        chrome.storage.local.remove(reviewKeyRef.current);
      } else {
        chrome.storage.local.set({ [reviewKeyRef.current]: comments });
      }
    },
    [reviewKeyRef],
  );

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

  const handleSummaryLoading = useCallback(() => setFocusBulletsLoading(true), []);
  const handleSummaryReady = useCallback((bullets: PromptSuggestion[]) => {
    setFocusBullets(bullets);
    setFocusBulletsLoading(false);
  }, []);

  // Streaming
  const {
    isStreaming,
    activeSkills,
    systemPrompt,
    followUpSuggestions,
    setFollowUpSuggestions,
    handleSend,
    handleStop,
    streamError,
    setStreamError,
  } = useChatStreaming({
    prContext,
    enrichedContext,
    focusedItems,
    messages,
    setMessages,
    persistMessages,
  });

  // Clear chat state when focused items change
  const focusKey = focusedItems
    .map((it) =>
      it.lineRange ? `${it.file}:${it.lineRange.startLine}-${it.lineRange.endLine}` : it.file,
    )
    .join("\0");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMessages([]);
    setStreamError(null);
  }, [focusKey, setStreamError]);

  const handleSimTest = useCallback(async () => {
    if (!prContext || isStreaming) return;

    const lineItem = focusedItems.find((it) => it.lineRange);
    if (!lineItem?.lineRange) return;

    const { startLine, endLine, content: lineContent } = lineItem.lineRange;
    const label =
      startLine === endLine ? `L${startLine}` : `L${startLine}\u2013L${endLine}`;
    const assembledPrompt = `Simulated Test Run \u2014 ${lineItem.file.split("/").pop()} ${label}\n\n${lineContent}`;

    const userMsg: ChatMessage = {
      role: "user",
      content: assembledPrompt,
      timestamp: Date.now(),
    };
    const placeholderMsg: ChatMessage = {
      role: "assistant",
      content: "",
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg, placeholderMsg]);
    // Use a local flag — isStreaming from the hook is for chat streaming
    setStreamError(null);

    let response: SimTestResponse;
    try {
      const fileContent =
        (await fetchFileContent(
          prContext.owner,
          prContext.repo,
          prContext.headBranch,
          lineItem.file,
        )) ?? "";

      response = await sendMessage<SimTestResponse>({
        type: "sim-test",
        lineContent,
        fileContent,
        filePath: lineItem.file,
      });
    } catch (err) {
      setStreamError(err instanceof Error ? err.message : "Sim test failed");
      setMessages((prev) => prev.slice(0, -2));
      return;
    }

    if (response.ok && response.data) {
      const simData = response.data;
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          content: `Analyzed **${simData.functionName}** with ${simData.totalCases} test cases.`,
          simTestData: simData,
        };
        persistMessages(updated);
        return updated;
      });
    } else {
      setStreamError(response.error ?? "Sim test returned no results");
      setMessages((prev) => {
        const trimmed = prev.slice(0, -2);
        persistMessages(trimmed);
        return trimmed;
      });
    }
  }, [prContext, isStreaming, focusedItems, persistMessages, setStreamError]);

  const handleClear = useCallback(() => {
    setShowInspector(false);
    setMessages([]);
    setStreamError(null);
    setFollowUpSuggestions(null);
    if (storageKeyRef.current) chrome.storage.local.remove(storageKeyRef.current);
  }, [setStreamError, setFollowUpSuggestions, storageKeyRef]);

  const viewerLogin = useMemo(() => scrapeViewerLogin(), []);
  const isSelfReview = !!(prContext?.author && viewerLogin && prContext.author === viewerLogin);
  const primaryFile = focusedItems.length > 0 ? focusedItems[0].file : null;
  const fileLine = useMemo(
    () =>
      prContext && primaryFile
        ? extractFirstChangedLine(prContext.diff, primaryFile)
        : { line: 1, side: "RIGHT" as const },
    [prContext, primaryFile],
  );

  const displayError = streamError ?? contextError;
  const isEmpty = messages.length === 0;

  const reviewContextValue = useMemo(
    () => ({
      prOwner: prContext?.owner ?? "",
      prRepo: prContext?.repo ?? "",
      prNumber: prContext?.number ?? 0,
      focusedFile: primaryFile,
      fileLine: fileLine.line,
      fileSide: fileLine.side,
      onAddToReview: handleAddToReview,
    }),
    [
      prContext?.owner,
      prContext?.repo,
      prContext?.number,
      primaryFile,
      fileLine.line,
      fileLine.side,
      handleAddToReview,
    ],
  );

  return (
    <ReviewContext.Provider value={reviewContextValue}>
      <div className="flex flex-col h-full bg-background text-foreground">
        <ChatHeader
          prContext={prContext}
          showInspector={showInspector}
          systemPrompt={systemPrompt}
          pendingReview={pendingReview}
          isSelfReview={isSelfReview}
          hasMessages={messages.length > 0}
          onToggleInspector={() => setShowInspector((v) => !v)}
          onClear={handleClear}
          onClose={onClose}
          onClearReview={handleClearReview}
          onRemoveFromReview={handleRemoveFromReview}
        />

        <ActiveSkillsBar skills={activeSkills} />

        {displayError && <ChatErrorBanner error={displayError} />}

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
                <img
                  src={getIconUrl(128)}
                  alt="PRobe"
                  className="size-14 rounded-2xl animate-logo-pulse"
                />
              </div>
            ) : (
              <MessageList
                messages={messages}
                isStreaming={isStreaming}
                prContext={prContext}
                onSend={handleSend}
                onSummaryLoading={handleSummaryLoading}
                onSummaryReady={handleSummaryReady}
              />
            )}

            <ChatInput
              onSend={handleSend}
              onStop={handleStop}
              onSimTest={handleSimTest}
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
    </ReviewContext.Provider>
  );
}
