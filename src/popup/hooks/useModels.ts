import { useState, useCallback } from "react";
import { STORAGE_KEYS, MODELS_CACHE_TTL_MS } from "../../shared/config";
import type { LLMProvider } from "../../shared/config";
import type { FetchModelsResponse } from "../../shared/types";

interface ModelsCacheEntry {
  models: string[];
  cachedAt: number;
}

interface UseModelsResult {
  availableModels: string[];
  modelsLoading: boolean;
  modelsFetchFailed: boolean;
  fetchModels: (provider: LLMProvider, apiKey: string, bustCache?: boolean) => void;
  clearModels: () => void;
}

export function useModels(): UseModelsResult {
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsFetchFailed, setModelsFetchFailed] = useState(false);

  const fetchModels = useCallback((provider: LLMProvider, apiKey: string, bustCache = false) => {
    if (!apiKey.trim()) return;

    const cacheKey = STORAGE_KEYS.modelsCache(provider);

    chrome.storage.local.get([cacheKey], (result) => {
      const cached = result[cacheKey] as ModelsCacheEntry | undefined;
      if (
        !bustCache &&
        cached &&
        Date.now() - cached.cachedAt < MODELS_CACHE_TTL_MS &&
        cached.models.length > 0
      ) {
        setAvailableModels(cached.models);
        return;
      }

      setModelsLoading(true);
      setModelsFetchFailed(false);

      chrome.runtime.sendMessage(
        { type: "fetch-models", provider, apiKey },
        (response: FetchModelsResponse) => {
          setModelsLoading(false);
          if (response?.ok && response.models && response.models.length > 0) {
            setAvailableModels(response.models);
            setModelsFetchFailed(false);
            chrome.storage.local.set({
              [cacheKey]: { models: response.models, cachedAt: Date.now() },
            });
          } else {
            setModelsFetchFailed(true);
          }
        },
      );
    });
  }, []);

  const clearModels = useCallback(() => {
    setAvailableModels([]);
    setModelsFetchFailed(false);
  }, []);

  return { availableModels, modelsLoading, modelsFetchFailed, fetchModels, clearModels };
}
