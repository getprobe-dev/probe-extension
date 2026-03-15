export const DEFAULT_PROXY_URL: string =
  import.meta.env.VITE_PROXY_URL || "https://pr-sidekick-proxy.sgunturi.workers.dev";

export const STORAGE_KEYS = {
  API_KEY: "anthropic_api_key",
  PROXY_URL: "proxy_url",
  GITHUB_TOKEN: "github_token",
  chatHistory: (owner: string, repo: string, number: number) => `chat:${owner}/${repo}#${number}`,
  pendingReview: (owner: string, repo: string, number: number) =>
    `review:${owner}/${repo}#${number}`,
} as const;
