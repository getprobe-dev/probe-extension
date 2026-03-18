export const DEFAULT_PROXY_URL: string =
  import.meta.env.VITE_PROXY_URL || "https://probe-proxy.sgunturi.workers.dev";

export type LLMProvider = "anthropic" | "openai";

export const DEFAULT_MODELS: Record<LLMProvider, string> = {
  anthropic: "claude-opus-4-6",
  openai: "gpt-4o",
};

export const STORAGE_KEYS = {
  API_KEY: "llm_api_key",
  LLM_PROVIDER: "llm_provider",
  MODEL_NAME: "llm_model_name",
  PROXY_URL: "proxy_url",
  GITHUB_TOKEN: "github_token",
  chatHistory: (owner: string, repo: string, number: number) => `chat:${owner}/${repo}#${number}`,
  pendingReview: (owner: string, repo: string, number: number) =>
    `review:${owner}/${repo}#${number}`,
  modelsCache: (provider: string) => `models_cache_${provider}`,
} as const;

export const MODELS_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
