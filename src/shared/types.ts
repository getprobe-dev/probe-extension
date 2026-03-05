export interface PRContext {
  owner: string;
  repo: string;
  number: number;
  title: string;
  description: string;
  diff: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export type BackgroundMessage =
  | { type: "chat"; payload: { messages: ChatMessage[]; context: PRContext } }
  | { type: "stop" };

export interface FetchDiffRequest {
  type: "fetch-diff";
  owner: string;
  repo: string;
  number: number;
}

export interface FetchDiffResponse {
  ok: boolean;
  diff?: string;
  error?: string;
}

export type StreamEvent =
  | { type: "chunk"; content: string }
  | { type: "done" }
  | { type: "error"; message: string };

export const DEFAULT_PROXY_URL = "https://pr-sidekick-proxy.sgunturi.workers.dev";

export const STORAGE_KEYS = {
  API_KEY: "anthropic_api_key",
  PROXY_URL: "proxy_url",
  chatHistory: (owner: string, repo: string, number: number) =>
    `chat:${owner}/${repo}#${number}`,
} as const;
