import { ghHeaders, apiBase, API_PAGE_SIZE } from "./githubHelpers";
import type {
  FetchEnrichedContextRequest,
  FetchEnrichedContextResponse,
  EnrichedPRContext,
  PRCommitSummary,
  PRReviewVerdict,
  PRReviewComment,
  PRCheckRun,
  PRFileEntry,
  LinkedIssue,
} from "../shared/types";

const FILE_CONTENT_BUDGET = 400_000;
const PER_FILE_CONTENT_CAP = 30_000;

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

const LINKED_ISSUE_RE = /(?:closes|fixes|resolves|part of|related:?)\s+#(\d+)/gi;
const RECENT_COMMENTS_LIMIT = 5;

export async function handleFetchEnrichedContext(
  msg: FetchEnrichedContextRequest,
  signal: AbortSignal,
): Promise<FetchEnrichedContextResponse> {
  const headers = await ghHeaders();
  if (signal.aborted) return { ok: false, error: "Cancelled" };

  const base = apiBase(msg.owner, msg.repo);
  const diffUrl = `https://github.com/${msg.owner}/${msg.repo}/pull/${msg.number}.diff`;

  const fetches: Record<string, Promise<Response>> = {
    diff: fetch(diffUrl, { signal }),
    pr: headers
      ? fetch(`${base}/pulls/${msg.number}`, { headers, signal })
      : Promise.reject("no token"),
    commits: headers
      ? fetch(`${base}/pulls/${msg.number}/commits?per_page=${API_PAGE_SIZE}`, { headers, signal })
      : Promise.reject("no token"),
    reviews: headers
      ? fetch(`${base}/pulls/${msg.number}/reviews?per_page=${API_PAGE_SIZE}`, { headers, signal })
      : Promise.reject("no token"),
    issueComments: headers
      ? fetch(`${base}/issues/${msg.number}/comments?per_page=${API_PAGE_SIZE}`, {
          headers,
          signal,
        })
      : Promise.reject("no token"),
    reviewComments: headers
      ? fetch(`${base}/pulls/${msg.number}/comments?per_page=${API_PAGE_SIZE}`, { headers, signal })
      : Promise.reject("no token"),
    files: headers
      ? fetch(`${base}/pulls/${msg.number}/files?per_page=${API_PAGE_SIZE}`, { headers, signal })
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
    reviewMap.set(r.user.login, { author: r.user.login, state: r.state, body: r.body ?? "" });
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
  const recentComments = allComments.slice(0, RECENT_COMMENTS_LIMIT);

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
      const checkRes = await fetch(
        `${base}/commits/${headSha}/check-runs?per_page=${API_PAGE_SIZE}`,
        { headers, signal },
      );
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
      console.warn("[PRobe] Checks endpoint unavailable");
    }
  }

  const linkedIssues: LinkedIssue[] = [];
  if (headers && description && !signal.aborted) {
    const issueRefs = new Set<number>();
    let refMatch: RegExpExecArray | null;
    while ((refMatch = LINKED_ISSUE_RE.exec(description)) !== null) {
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
