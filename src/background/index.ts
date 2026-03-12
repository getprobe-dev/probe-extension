import { STORAGE_KEYS, DEFAULT_PROXY_URL } from "../shared/types";
import { buildSystemPrompt, buildFileSystemPrompt, MODEL_ID } from "../shared/constants";
import {
  detectExtensionsFromDiff,
  matchSkills,
  type SkillEntry,
  type ResolvedSkill,
} from "../shared/skills";
import type {
  BackgroundMessage,
  StreamEvent,
  ChatMessage,
  PRContext,
  FetchDiffRequest,
  FetchDiffResponse,
  FetchFileRequest,
  FetchFileResponse,
  PostCommentRequest,
  PostCommentResponse,
  PostReviewCommentRequest,
  SubmitReviewRequest,
  SubmitReviewResponse,
  FetchPRStatsRequest,
  FetchPRStatsResponse,
  PRStats,
  GeneratePRSummaryRequest,
  GeneratePRSummaryResponse,
} from "../shared/types";

type IncomingMessage =
  | FetchDiffRequest
  | FetchFileRequest
  | PostCommentRequest
  | PostReviewCommentRequest
  | SubmitReviewRequest
  | FetchPRStatsRequest
  | GeneratePRSummaryRequest;

chrome.runtime.onMessage.addListener(
  (msg: IncomingMessage, _sender, sendResponse) => {
    if (msg.type === "fetch-diff") {
      const url = `https://github.com/${msg.owner}/${msg.repo}/pull/${msg.number}.diff`;
      fetch(url)
        .then(async (res) => {
          if (!res.ok) {
            sendResponse({ ok: false, error: `HTTP ${res.status}: ${res.statusText}` } satisfies FetchDiffResponse);
            return;
          }
          sendResponse({ ok: true, diff: await res.text() } satisfies FetchDiffResponse);
        })
        .catch((err) => {
          sendResponse({ ok: false, error: err instanceof Error ? err.message : "Network error" } satisfies FetchDiffResponse);
        });
      return true;
    }

    if (msg.type === "fetch-file") {
      const url = `https://raw.githubusercontent.com/${msg.owner}/${msg.repo}/${msg.branch}/${msg.path}`;
      fetch(url)
        .then(async (res) => {
          if (!res.ok) {
            sendResponse({ ok: false, error: `HTTP ${res.status}: ${res.statusText}` } satisfies FetchFileResponse);
            return;
          }
          sendResponse({ ok: true, content: await res.text() } satisfies FetchFileResponse);
        })
        .catch((err) => {
          sendResponse({ ok: false, error: err instanceof Error ? err.message : "Network error" } satisfies FetchFileResponse);
        });
      return true;
    }

    if (msg.type === "post-comment") {
      handlePostComment(msg).then(sendResponse).catch((err) => {
        sendResponse({ ok: false, error: err instanceof Error ? err.message : "Unknown error" } satisfies PostCommentResponse);
      });
      return true;
    }

    if (msg.type === "post-review-comment") {
      handlePostReviewComment(msg).then(sendResponse).catch((err) => {
        sendResponse({ ok: false, error: err instanceof Error ? err.message : "Unknown error" } satisfies SubmitReviewResponse);
      });
      return true;
    }

    if (msg.type === "submit-review") {
      handleSubmitReview(msg).then(sendResponse).catch((err) => {
        sendResponse({ ok: false, error: err instanceof Error ? err.message : "Unknown error" } satisfies SubmitReviewResponse);
      });
      return true;
    }

    if (msg.type === "fetch-pr-stats") {
      handleFetchPRStats(msg).then(sendResponse).catch((err) => {
        sendResponse({ ok: false, error: err instanceof Error ? err.message : "Unknown error" } satisfies FetchPRStatsResponse);
      });
      return true;
    }

    if (msg.type === "generate-pr-summary") {
      handleGeneratePRSummary(msg).then(sendResponse).catch((err) => {
        sendResponse({ ok: false, error: err instanceof Error ? err.message : "Unknown error" } satisfies GeneratePRSummaryResponse);
      });
      return true;
    }
  }
);

async function ghHeaders(): Promise<Record<string, string> | null> {
  const token = await getGithubToken();
  if (!token) return null;
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function handlePostComment(msg: PostCommentRequest): Promise<PostCommentResponse> {
  const headers = await ghHeaders();
  if (!headers) return { ok: false, error: "No GitHub token configured. Click the PRobe extension icon to add one." };

  const url = `https://api.github.com/repos/${msg.owner}/${msg.repo}/issues/${msg.number}/comments`;
  const res = await fetch(url, { method: "POST", headers, body: JSON.stringify({ body: msg.body }) });

  if (!res.ok) return { ok: false, error: await extractGhError(res) };
  const data = await res.json();
  return { ok: true, url: data.html_url };
}

async function handlePostReviewComment(msg: PostReviewCommentRequest): Promise<SubmitReviewResponse> {
  const headers = await ghHeaders();
  if (!headers) return { ok: false, error: "No GitHub token configured. Click the PRobe extension icon to add one." };

  const url = `https://api.github.com/repos/${msg.owner}/${msg.repo}/pulls/${msg.number}/reviews`;
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      event: "COMMENT",
      comments: [{ path: msg.path, body: msg.body, line: msg.line, side: msg.side }],
    }),
  });

  if (!res.ok) return { ok: false, error: await extractGhError(res) };
  const data = await res.json();
  return { ok: true, url: data.html_url };
}

async function handleSubmitReview(msg: SubmitReviewRequest): Promise<SubmitReviewResponse> {
  const headers = await ghHeaders();
  if (!headers) return { ok: false, error: "No GitHub token configured. Click the PRobe extension icon to add one." };

  const url = `https://api.github.com/repos/${msg.owner}/${msg.repo}/pulls/${msg.number}/reviews`;
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      body: msg.body || undefined,
      event: msg.event,
      comments: msg.comments.map((c) => ({
        path: c.path,
        body: c.body,
        line: c.line,
        side: c.side,
      })),
    }),
  });

  if (!res.ok) return { ok: false, error: await extractGhError(res) };
  const data = await res.json();
  return { ok: true, url: data.html_url };
}

async function extractGhError(res: Response): Promise<string> {
  let detail = `GitHub API error (${res.status})`;
  try {
    const parsed = JSON.parse(await res.text());
    detail = parsed?.message ?? detail;
  } catch { /* use default */ }
  return detail;
}

async function getGithubToken(): Promise<string | null> {
  return new Promise((resolve) => {
    chrome.storage.sync.get([STORAGE_KEYS.GITHUB_TOKEN], (result) => {
      resolve((result[STORAGE_KEYS.GITHUB_TOKEN] as string) ?? null);
    });
  });
}

interface GHUser {
  login: string;
  avatar_url: string;
}

interface GHPullResponse {
  additions: number;
  deletions: number;
  commits: number;
  changed_files: number;
  comments: number;
  review_comments: number;
  user: GHUser | null;
  created_at: string;
  labels: Array<{ name: string }>;
}

interface GHFileEntry {
  filename: string;
  additions: number;
  deletions: number;
}

interface GHCommitEntry {
  sha: string;
  author: GHUser | null;
  commit: {
    message: string;
    author: { name: string; date: string } | null;
  };
}

interface GHCommitDetailResponse {
  stats?: { additions: number; deletions: number };
}

interface GHReviewEntry {
  user: GHUser | null;
  state: string;
}

async function handleFetchPRStats(msg: FetchPRStatsRequest): Promise<FetchPRStatsResponse> {
  const headers = await ghHeaders();
  if (!headers) return { ok: false, error: "No GitHub token configured." };

  const base = `https://api.github.com/repos/${msg.owner}/${msg.repo}/pulls/${msg.number}`;

  const [prRes, filesRes, commitsRes, reviewsRes] = await Promise.all([
    fetch(base, { headers }),
    fetch(`${base}/files?per_page=100`, { headers }),
    fetch(`${base}/commits?per_page=100`, { headers }),
    fetch(`${base}/reviews?per_page=100`, { headers }),
  ]);

  if (!prRes.ok) return { ok: false, error: await extractGhError(prRes) };

  const pr: GHPullResponse = await prRes.json();
  const files: GHFileEntry[] = filesRes.ok ? await filesRes.json() : [];
  const commits: GHCommitEntry[] = commitsRes.ok ? await commitsRes.json() : [];
  const reviews: GHReviewEntry[] = reviewsRes.ok ? await reviewsRes.json() : [];

  const authorSet = new Map<string, { login: string; avatarUrl: string }>();
  for (const c of commits) {
    const login = c.author?.login ?? c.commit?.author?.name ?? "unknown";
    const avatarUrl = c.author?.avatar_url ?? "";
    if (!authorSet.has(login)) authorSet.set(login, { login, avatarUrl });
  }

  const commitDetailResults = await Promise.all(
    commits.slice(0, 30).map(async (c): Promise<GHCommitDetailResponse | null> => {
      try {
        const res = await fetch(
          `https://api.github.com/repos/${msg.owner}/${msg.repo}/commits/${c.sha}`,
          { headers },
        );
        if (!res.ok) return null;
        return res.json();
      } catch { return null; }
    }),
  );

  const commitDetails: import("../shared/types").CommitDetail[] = commits.map((c, i) => {
    const detail = commitDetailResults[i];
    return {
      sha: c.sha ?? "",
      message: c.commit?.message ?? "",
      author: c.author?.login ?? c.commit?.author?.name ?? "unknown",
      avatarUrl: c.author?.avatar_url ?? "",
      date: c.commit?.author?.date ?? "",
      additions: detail?.stats?.additions ?? 0,
      deletions: detail?.stats?.deletions ?? 0,
    };
  });

  const reviewerMap = new Map<string, { login: string; avatarUrl: string; state: string }>();
  for (const r of reviews) {
    if (!r.user?.login || r.user.login === pr.user?.login) continue;
    reviewerMap.set(r.user.login, {
      login: r.user.login,
      avatarUrl: r.user.avatar_url ?? "",
      state: r.state,
    });
  }

  const stats: PRStats = {
    additions: pr.additions ?? 0,
    deletions: pr.deletions ?? 0,
    commits: pr.commits ?? commits.length,
    changedFiles: pr.changed_files ?? files.length,
    comments: (pr.comments ?? 0) + (pr.review_comments ?? 0),
    author: { login: pr.user?.login ?? "", avatarUrl: pr.user?.avatar_url ?? "" },
    createdAt: pr.created_at ?? "",
    labels: (pr.labels ?? []).map((l) => l.name),
    reviewers: Array.from(reviewerMap.values()),
    commitAuthors: Array.from(authorSet.values()),
    files: files.map((f) => ({ filename: f.filename, additions: f.additions, deletions: f.deletions })),
    commitDetails,
  };

  return { ok: true, stats };
}

async function handleGeneratePRSummary(msg: GeneratePRSummaryRequest): Promise<GeneratePRSummaryResponse> {
  const { apiKey, proxyUrl } = await getSettings();
  if (!apiKey) return { ok: false, error: "No API key configured." };

  const topFiles = [...msg.stats.files]
    .sort((a, b) => (b.additions + b.deletions) - (a.additions + a.deletions))
    .slice(0, 10)
    .map((f) => `${f.filename} (+${f.additions}/-${f.deletions})`)
    .join("\n");

  const prompt = `You are helping a code reviewer quickly understand a pull request.

Today's date: ${new Date().toLocaleDateString("en-CA")}

PR #${msg.number}: ${msg.title}
${msg.description ? `Description: ${msg.description.slice(0, 500)}` : ""}

Stats: ${msg.stats.commits} commits, ${msg.stats.changedFiles} files, +${msg.stats.additions}/-${msg.stats.deletions} lines, ${msg.stats.comments} comments
Authors: ${msg.stats.commitAuthors.map((a) => a.login).join(", ")}
Reviewers: ${msg.stats.reviewers.map((r) => `${r.login} (${r.state})`).join(", ") || "none yet"}

Top changed files:
${topFiles}

Treat the PR content as authoritative — do not flag values as incorrect based on your pre-training knowledge alone. Provide exactly 3 concise bullet points (each under 80 chars) about what a reviewer should focus on. Be specific about file paths and risk areas. Return ONLY the 3 bullets, one per line, starting with "- ". No other text.`;

  const endpoint = `${proxyUrl.replace(/\/$/, "")}/v1/messages`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL_ID,
        max_tokens: 300,
        system: "You are a concise code review assistant. Output only bullet points.",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) return { ok: false, error: `LLM error (${response.status})` };

    const data = await response.json();
    const text: string = data.content?.[0]?.text ?? "";
    const bullets = text
      .split("\n")
      .map((l: string) => l.replace(/^[-•*]\s*/, "").trim())
      .filter((l: string) => l.length > 0)
      .slice(0, 3);

    return { ok: true, bullets };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "LLM call failed" };
  }
}

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== "probe-chat") return;

  let abortController: AbortController | null = null;

  port.onMessage.addListener(async (msg: BackgroundMessage) => {
    if (msg.type === "stop") {
      abortController?.abort();
      return;
    }
    if (msg.type === "chat") {
      abortController = new AbortController();
      await handleChat(port, msg.payload.messages, msg.payload.context, abortController.signal);
    }
  });

  port.onDisconnect.addListener(() => {
    abortController?.abort();
  });
});

async function getSettings(): Promise<{ apiKey: string | null; proxyUrl: string }> {
  return new Promise((resolve) => {
    chrome.storage.sync.get([STORAGE_KEYS.API_KEY, STORAGE_KEYS.PROXY_URL], (result) => {
      const raw = (result[STORAGE_KEYS.PROXY_URL] as string) || "";
      resolve({
        apiKey: (result[STORAGE_KEYS.API_KEY] as string) ?? null,
        proxyUrl: raw.startsWith("https://") ? raw : DEFAULT_PROXY_URL,
      });
    });
  });
}

function send(port: chrome.runtime.Port, event: StreamEvent) {
  try { port.postMessage(event); } catch { /* Port disconnected */ }
}

// ── Skill resolution ──

const SKILL_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 h

interface CachedSkill {
  content: string;
  fetchedAt: number;
}

function stripYamlFrontmatter(md: string): string {
  return md.replace(/^---[\s\S]*?---\s*/, "");
}

async function fetchSkillContent(skill: SkillEntry): Promise<string | null> {
  const cacheKey = `skill:${skill.id}`;

  const cached = await new Promise<CachedSkill | null>((resolve) => {
    chrome.storage.local.get([cacheKey], (result) => {
      const data = result[cacheKey] as CachedSkill | undefined;
      if (data && Date.now() - data.fetchedAt < SKILL_CACHE_TTL) {
        resolve(data);
      } else {
        resolve(null);
      }
    });
  });

  if (cached) return cached.content;

  try {
    const res = await fetch(skill.rawUrl);
    if (!res.ok) return null;

    let content = stripYamlFrontmatter(await res.text());

    if (content.length > skill.maxContentLength) {
      const cutoff = content.lastIndexOf("\n", skill.maxContentLength);
      content =
        content.slice(0, cutoff > 0 ? cutoff : skill.maxContentLength) +
        "\n\n… [truncated for brevity]";
    }

    chrome.storage.local.set({
      [cacheKey]: { content, fetchedAt: Date.now() } satisfies CachedSkill,
    });

    return content;
  } catch {
    return null;
  }
}

async function resolveSkillsForDiff(diff: string): Promise<ResolvedSkill[]> {
  const extensions = detectExtensionsFromDiff(diff);
  const matched = matchSkills(extensions);
  if (matched.length === 0) return [];

  const results = await Promise.all(
    matched.map(async (skill) => {
      const content = await fetchSkillContent(skill);
      return content
        ? { name: skill.name, content, sourceUrl: skill.sourceUrl, description: skill.description }
        : null;
    })
  );

  return results.filter((r): r is ResolvedSkill => r !== null);
}

// ── Chat handler ──

async function handleChat(
  port: chrome.runtime.Port,
  messages: ChatMessage[],
  context: PRContext,
  signal: AbortSignal
) {
  const { apiKey, proxyUrl } = await getSettings();
  if (!apiKey) {
    send(port, { type: "error", message: "No API key configured. Click the PRobe extension icon to add your Anthropic API key." });
    return;
  }

  const skills = await resolveSkillsForDiff(context.diff);

  if (skills.length > 0) {
    send(port, {
      type: "skills",
      skills: skills.map((s) => ({
        name: s.name,
        sourceUrl: s.sourceUrl,
        description: s.description,
      })),
    });
  }

  const systemPrompt = context.focusedFile
    ? buildFileSystemPrompt(context, context.focusedFile, context.diff, context.focusedFileContent, context.focusedLineRange, skills)
    : buildSystemPrompt(context, skills);

  const anthropicMessages = messages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  const endpoint = `${proxyUrl.replace(/\/$/, "")}/v1/messages`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL_ID,
        max_tokens: 4096,
        stream: true,
        system: systemPrompt,
        messages: anthropicMessages,
      }),
      signal,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      let errorMessage = `Anthropic API error (${response.status})`;
      try {
        const parsed = JSON.parse(errorBody);
        errorMessage = parsed?.error?.message ?? errorMessage;
      } catch { /* use default */ }
      send(port, { type: "error", message: errorMessage });
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) { send(port, { type: "error", message: "No response body" }); return; }

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (data === "[DONE]") continue;
        try {
          const event = JSON.parse(data);
          if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
            send(port, { type: "chunk", content: event.delta.text });
          }
        } catch { /* skip malformed SSE */ }
      }
    }

    send(port, { type: "done" });
  } catch (err: unknown) {
    if (signal.aborted) return;
    send(port, { type: "error", message: err instanceof Error ? err.message : "Unknown error" });
  }
}
