import { useState, useEffect, useRef, useCallback } from "react";
import type {
  PRContext,
  EnrichedPRContext,
  FetchEnrichedContextResponse,
} from "../../shared/types";
import { STORAGE_KEYS } from "../../shared/config";
import { extractPRContext } from "../../shared/context";
import { sendMessage } from "../../shared/messaging";

interface PRLoaderResult {
  prContext: PRContext | null;
  enrichedContext: EnrichedPRContext | null;
  isLoading: boolean;
  error: string | null;
  storageKeyRef: React.MutableRefObject<string>;
  reviewKeyRef: React.MutableRefObject<string>;
  setInitialMessages: (callback: (stored: Record<string, unknown>) => void) => void;
}

export function usePRLoader(
  needsSetup: boolean,
  onDiffLoaded: (diff: string) => void,
): PRLoaderResult {
  const [prContext, setPrContext] = useState<PRContext | null>(null);
  const [enrichedContext, setEnrichedContext] = useState<EnrichedPRContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const storageKeyRef = useRef<string>("");
  const reviewKeyRef = useRef<string>("");
  const onDiffLoadedRef = useRef(onDiffLoaded);
  const setInitialMessagesRef = useRef<((stored: Record<string, unknown>) => void) | null>(null);

  useEffect(() => {
    onDiffLoadedRef.current = onDiffLoaded;
  }, [onDiffLoaded]);

  useEffect(() => {
    if (needsSetup) return;
    let cancelled = false;
    let enrichedContextRequestId: string | null = null;

    async function init() {
      try {
        const context = await extractPRContext();
        if (cancelled) return;
        setPrContext(context);
        onDiffLoadedRef.current(context.diff);

        const key = STORAGE_KEYS.chatHistory(context.owner, context.repo, context.number);
        storageKeyRef.current = key;
        const rKey = STORAGE_KEYS.pendingReview(context.owner, context.repo, context.number);
        reviewKeyRef.current = rKey;

        chrome.storage.local.get([key, rKey], (result) => {
          if (cancelled) return;
          setInitialMessagesRef.current?.(result);
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
        chrome.runtime.sendMessage({
          type: "cancel-enriched-context",
          requestId: enrichedContextRequestId,
        });
      }
    };
  }, [needsSetup]);

  const setInitialMessages = useCallback((callback: (stored: Record<string, unknown>) => void) => {
    setInitialMessagesRef.current = callback;
  }, []);

  return {
    prContext,
    enrichedContext,
    isLoading,
    error,
    storageKeyRef,
    reviewKeyRef,
    setInitialMessages,
  };
}
