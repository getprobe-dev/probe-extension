export interface PRContext {
  owner: string;
  repo: string;
  number: number;
  title: string;
  description: string;
  diff: string;
  headBranch: string;
  focusedFile?: string;
  focusedFileContent?: string;
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

export interface FetchFileRequest {
  type: "fetch-file";
  owner: string;
  repo: string;
  branch: string;
  path: string;
}

export interface FetchFileResponse {
  ok: boolean;
  content?: string;
  error?: string;
}

export interface PostCommentRequest {
  type: "post-comment";
  owner: string;
  repo: string;
  number: number;
  body: string;
}

export interface PostCommentResponse {
  ok: boolean;
  url?: string;
  error?: string;
}

export interface PostReviewCommentRequest {
  type: "post-review-comment";
  owner: string;
  repo: string;
  number: number;
  body: string;
  path: string;
  line: number;
  side: "LEFT" | "RIGHT";
}

export interface SubmitReviewRequest {
  type: "submit-review";
  owner: string;
  repo: string;
  number: number;
  body: string;
  event: "COMMENT" | "APPROVE" | "REQUEST_CHANGES";
  comments: Array<{
    path: string;
    body: string;
    line: number;
    side: "LEFT" | "RIGHT";
  }>;
}

export interface SubmitReviewResponse {
  ok: boolean;
  url?: string;
  error?: string;
}

export interface ReviewPendingComment {
  path: string;
  body: string;
  line: number;
  side: "LEFT" | "RIGHT";
  timestamp: number;
}

export type StreamEvent =
  | { type: "chunk"; content: string }
  | { type: "done" }
  | { type: "error"; message: string };

export const DEFAULT_PROXY_URL = "https://pr-sidekick-proxy.sgunturi.workers.dev";

export const STORAGE_KEYS = {
  API_KEY: "anthropic_api_key",
  PROXY_URL: "proxy_url",
  GITHUB_TOKEN: "github_token",
  chatHistory: (owner: string, repo: string, number: number) =>
    `chat:${owner}/${repo}#${number}`,
  pendingReview: (owner: string, repo: string, number: number) =>
    `review:${owner}/${repo}#${number}`,
} as const;
