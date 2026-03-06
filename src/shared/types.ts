export interface FocusedLineRange {
  startLine: number;
  endLine: number;
  side: "LEFT" | "RIGHT";
  content: string;
}

export interface FocusedItem {
  file: string;
  lineRange?: FocusedLineRange;
}

export interface PRContext {
  owner: string;
  repo: string;
  number: number;
  title: string;
  description: string;
  diff: string;
  headBranch: string;
  author?: string;
  focusedFile?: string;
  focusedFileContent?: string;
  focusedLineRange?: FocusedLineRange;
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

export interface FetchPRStatsRequest {
  type: "fetch-pr-stats";
  owner: string;
  repo: string;
  number: number;
}

export interface CommitDetail {
  sha: string;
  message: string;
  author: string;
  avatarUrl: string;
  date: string;
  additions: number;
  deletions: number;
}

export interface PRStats {
  additions: number;
  deletions: number;
  commits: number;
  changedFiles: number;
  comments: number;
  author: { login: string; avatarUrl: string };
  createdAt: string;
  labels: string[];
  reviewers: Array<{ login: string; avatarUrl: string; state: string }>;
  commitAuthors: Array<{ login: string; avatarUrl: string }>;
  files: Array<{ filename: string; additions: number; deletions: number }>;
  commitDetails: CommitDetail[];
}

export interface FetchPRStatsResponse {
  ok: boolean;
  stats?: PRStats;
  error?: string;
}

export interface GeneratePRSummaryRequest {
  type: "generate-pr-summary";
  owner: string;
  repo: string;
  number: number;
  title: string;
  description: string;
  stats: PRStats;
}

export interface GeneratePRSummaryResponse {
  ok: boolean;
  bullets?: string[];
  error?: string;
}

export interface ReviewPendingComment {
  path: string;
  body: string;
  line: number;
  side: "LEFT" | "RIGHT";
  timestamp: number;
}

export interface SkillIndicator {
  name: string;
  sourceUrl: string;
  description: string;
}

export type StreamEvent =
  | { type: "skills"; skills: SkillIndicator[] }
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
