import { STORAGE_KEYS } from "../shared/types";
import type {
  PostCommentRequest,
  PostCommentResponse,
  PostReviewCommentRequest,
  SubmitReviewRequest,
  SubmitReviewResponse,
  FetchEnrichedContextRequest,
  FetchEnrichedContextResponse,
  EnrichedPRContext,
  FetchPRStatsRequest,
  FetchPRStatsResponse,
  PRStats,
  PRCommitSummary,
  PRReviewVerdict,
  PRReviewComment,
  PRCheckRun,
  PRFileEntry,
  LinkedIssue,
  CommitDetail,
} from "../shared/types";

const GITHUB_API_VERSION = "2022-11-28";

// ── Auth helpers ──

export async function getGithubToken(): Promise<string | null> {
  return new Promise((resolve) => {
    chrome.storage.sync.get([STORAGE_KEYS.GITHUB_TOKEN], (result) => {
      resolve((result[STORAGE_KEYS.GITHUB_TOKEN] as string) ?? null);
    });
  });
}

export async function ghHeaders(): Promise<Record<string, string> | null> {
  const token = await getGithubToken();
  if (!token) return null;
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": GITHUB_API_VERSION,
  };
}

export async function extractGhError(res: Response): Promise<string> {
  let detail = `GitHub API error (${res.status})`;
  try {
    const parsed = JSON.parse(await res.text());
    detail = parsed?.message ?? detail;
  } catch {
    /* use default */
  }
  return detail;
}

const NO_TOKEN_ERROR = "No GitHub token configured. Click the PRobe extension icon to add one.";

// ── Comment / Review endpoints ──

export async function handlePostComment(msg: PostCommentRequest): Promise<PostCommentResponse> {
  const headers = await ghHeaders();
  if (!headers) return { ok: false, error: NO_TOKEN_ERROR };

  const url = `https://api.github.com/repos/${msg.owner}/${msg.repo}/issues/${msg.number}/comments`;
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ body: msg.body }),
  });

  if (!res.ok) return { ok: false, error: await extractGhError(res) };
  const data = await res.json();
  return { ok: true, url: data.html_url };
}

export async function handlePostReviewComment(
  msg: PostReviewCommentRequest,
): Promise<SubmitReviewResponse> {
  const headers = await ghHeaders();
  if (!headers) return { ok: false, error: NO_TOKEN_ERROR };

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

export async function handleSubmitReview(msg: SubmitReviewRequest): Promise<SubmitReviewResponse> {
  const headers = await ghHeaders();
  if (!headers) return { ok: false, error: NO_TOKEN_ERROR };

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

// ── Enriched context assembly ──

interface GHPull {
  title: string;
  body: string | null;
  state: string;
  draft: boolean;
  mergeable: boolean | null;
  mergeable_state: string;
  user: { login: string } | null;
  base: { ref: string };
  head: { ref: string; sha: string };
  labels: Array<{ name: string }>;
  milestone: { title: string } | null;
  assignees: Array<{ login: string }>;
  requested_reviewers: Array<{ login: string }>;
}

interface GHCommitListEntry {
  sha: string;
  commit: { message: string; author: { name: string; date: string } | null };
  author: { login: string } | null;
}

interface GHIssueComment {
  user: { login: string } | null;
  body: string;
  created_at: string;
}

interface GHReviewComment {
  user: { login: string } | null;
  body: string;
  path: string;
  line: number | null;
  created_at: string;
}

interface GHReview {
  user: { login: string } | null;
  state: string;
  body: string | null;
}

interface GHFileListEntry {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
}

const FILE_CONTENT_BUDGET = 400_000;
const PER_FILE_CONTENT_CAP = 30_000;

export async function handleFetchEnrichedContext(
  msg: FetchEnrichedContextRequest,
  signal: AbortSignal,
): Promise<FetchEnrichedContextResponse> {
  const headers = await ghHeaders();
  if (signal.aborted) return { ok: false, error: "Cancelled" };

  const base = `https://api.github.com/repos/${msg.owner}/${msg.repo}`;
  const diffUrl = `https://github.com/${msg.owner}/${msg.repo}/pull/${msg.number}.diff`;

  const fetches: Record<string, Promise<Response>> = {
    diff: fetch(diffUrl, { signal }),
    pr: headers
      ? fetch(`${base}/pulls/${msg.number}`, { headers, signal })
      : Promise.reject("no token"),
    commits: headers
      ? fetch(`${base}/pulls/${msg.number}/commits?per_page=100`, { headers, signal })
      : Promise.reject("no token"),
    reviews: headers
      ? fetch(`${base}/pulls/${msg.number}/reviews?per_page=100`, { headers, signal })
      : Promise.reject("no token"),
    issueComments: headers
      ? fetch(`${base}/issues/${msg.number}/comments?per_page=100`, { headers, signal })
      : Promise.reject("no token"),
    reviewComments: headers
      ? fetch(`${base}/pulls/${msg.number}/comments?per_page=100`, { headers, signal })
      : Promise.reject("no token"),
    files: headers
      ? fetch(`${base}/pulls/${msg.number}/files?per_page=100`, { headers, signal })
      : Promise.reject("no token"),
  };

  const results = await Promise.allSettled(Object.values(fetches));
  const keys = Object.keys(fetches);
  const settled: Record<string, Response | null> = {};
  for (let i = 0; i < keys.length; i++) {
    const r = results[i];
    settled[keys[i]] = r.status === "fulfilled" && r.value.ok ? r.value : null;
  }

  const diff = settled.diff ? await settled.diff.text() : "";
  if (!diff) return { ok: false, error: "Failed to fetch PR diff" };

  const pr: GHPull | null = settled.pr ? await settled.pr.json() : null;

  const title = pr?.title ?? `PR #${msg.number}`;
  const description = pr?.body ?? "";
  const author = pr?.user?.login ?? "";
  const baseBranch = pr?.base?.ref ?? "main";
  const headBranch = pr?.head?.ref ?? "";
  const headSha = pr?.head?.sha ?? "";

  const rawCommits: GHCommitListEntry[] = settled.commits ? await settled.commits.json() : [];
  const commits: PRCommitSummary[] = rawCommits.map((c) => ({
    sha: c.sha.slice(0, 7),
    message: c.commit.message.split("\n")[0],
    author: c.author?.login ?? c.commit.author?.name ?? "unknown",
    date: c.commit.author?.date ?? "",
  }));

  const rawReviews: GHReview[] = settled.reviews ? await settled.reviews.json() : [];
  const reviewMap = new Map<string, PRReviewVerdict>();
  for (const r of rawReviews) {
    if (!r.user?.login) continue;
    reviewMap.set(r.user.login, {
      author: r.user.login,
      state: r.state,
      body: r.body ?? "",
    });
  }
  const reviews = Array.from(reviewMap.values());

  const rawIssueComments: GHIssueComment[] = settled.issueComments
    ? await settled.issueComments.json()
    : [];
  const rawReviewComments: GHReviewComment[] = settled.reviewComments
    ? await settled.reviewComments.json()
    : [];

  const allComments: PRReviewComment[] = [
    ...rawIssueComments.map((c) => ({
      author: c.user?.login ?? "unknown",
      body: c.body,
      createdAt: c.created_at,
    })),
    ...rawReviewComments.map((c) => ({
      author: c.user?.login ?? "unknown",
      body: c.body,
      path: c.path,
      line: c.line ?? undefined,
      createdAt: c.created_at,
    })),
  ];
  allComments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const recentComments = allComments.slice(0, 5);

  const rawFiles: GHFileListEntry[] = settled.files ? await settled.files.json() : [];
  const files: PRFileEntry[] = rawFiles.map((f) => ({
    filename: f.filename,
    status: f.status,
    additions: f.additions,
    deletions: f.deletions,
  }));

  let checks: PRCheckRun[] = [];
  if (headers && headSha && !signal.aborted) {
    try {
      const checkRes = await fetch(`${base}/commits/${headSha}/check-runs?per_page=100`, {
        headers,
        signal,
      });
      if (checkRes.ok) {
        const checkData: {
          check_runs: Array<{ name: string; status: string; conclusion: string | null }>;
        } = await checkRes.json();
        checks = checkData.check_runs.map((cr) => ({
          name: cr.name,
          status: cr.status as PRCheckRun["status"],
          conclusion: cr.conclusion,
        }));
      }
    } catch {
      /* checks endpoint unavailable */
    }
  }

  const linkedIssues: LinkedIssue[] = [];
  if (headers && description && !signal.aborted) {
    const issueRefs = new Set<number>();
    const refRe = /(?:closes|fixes|resolves|part of|related:?)\s+#(\d+)/gi;
    let refMatch: RegExpExecArray | null;
    while ((refMatch = refRe.exec(description)) !== null) {
      issueRefs.add(parseInt(refMatch[1], 10));
    }
    const issueResults = await Promise.allSettled(
      [...issueRefs].map(async (n) => {
        const res = await fetch(`${base}/issues/${n}`, { headers: headers!, signal });
        if (!res.ok) return null;
        const data: { number: number; title: string; body: string | null } = await res.json();
        return { number: data.number, title: data.title, body: data.body ?? "" };
      }),
    );
    for (const r of issueResults) {
      if (r.status === "fulfilled" && r.value) linkedIssues.push(r.value);
    }
  }

  const partial =
    !headers || (!pr && commits.length === 0 && reviews.length === 0 && files.length === 0);

  const fetchableFiles = [...files]
    .filter((f) => f.status !== "removed")
    .sort((a, b) => b.additions + b.deletions - (a.additions + a.deletions));

  const rawBase = `https://raw.githubusercontent.com/${msg.owner}/${msg.repo}/${headSha}`;

  const fileContents: Record<string, string> = {};
  let contentBudgetRemaining = FILE_CONTENT_BUDGET;

  if (headSha && !signal.aborted) {
    const contentResults = await Promise.allSettled(
      fetchableFiles.map((f) => fetch(`${rawBase}/${f.filename}`, { signal })),
    );

    for (let i = 0; i < fetchableFiles.length; i++) {
      if (contentBudgetRemaining <= 0) break;
      const result = contentResults[i];
      if (result.status !== "fulfilled" || !result.value.ok) continue;
      const text = await result.value.text();
      if (text.slice(0, 1024).includes("\0")) continue;
      const capped =
        text.length > PER_FILE_CONTENT_CAP
          ? text.slice(0, PER_FILE_CONTENT_CAP) + "\n… [truncated]"
          : text;
      if (capped.length > contentBudgetRemaining) break;
      fileContents[fetchableFiles[i].filename] = capped;
      contentBudgetRemaining -= capped.length;
    }
  }

  const context: EnrichedPRContext = {
    owner: msg.owner,
    repo: msg.repo,
    number: msg.number,
    title,
    description,
    diff,
    headBranch,
    baseBranch,
    author,
    state: pr?.state ?? "open",
    draft: pr?.draft ?? false,
    mergeable: pr?.mergeable ?? null,
    mergeableState: pr?.mergeable_state ?? "unknown",
    labels: (pr?.labels ?? []).map((l) => l.name),
    milestone: pr?.milestone?.title ?? "",
    assignees: (pr?.assignees ?? []).map((a) => a.login),
    requestedReviewers: (pr?.requested_reviewers ?? []).map((r) => r.login),
    commits,
    reviews,
    recentComments,
    checks,
    files,
    linkedIssues,
    fileContents: Object.keys(fileContents).length > 0 ? fileContents : undefined,
    ...(partial ? { partial: true } : {}),
  };

  return { ok: true, context };
}

// ── PR Stats ──

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

const MAX_COMMIT_DETAILS = 30;

export async function handleFetchPRStats(
  msg: FetchPRStatsRequest,
): Promise<FetchPRStatsResponse> {
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
    commits.slice(0, MAX_COMMIT_DETAILS).map(async (c): Promise<GHCommitDetailResponse | null> => {
      try {
        const res = await fetch(
          `https://api.github.com/repos/${msg.owner}/${msg.repo}/commits/${c.sha}`,
          { headers },
        );
        if (!res.ok) return null;
        return res.json();
      } catch {
        return null;
      }
    }),
  );

  const commitDetails: CommitDetail[] = commits.map((c, i) => {
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
    files: files.map((f) => ({
      filename: f.filename,
      additions: f.additions,
      deletions: f.deletions,
    })),
    commitDetails,
  };

  return { ok: true, stats };
}
