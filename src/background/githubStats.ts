import { ghHeaders, extractGhError, apiBase, API_PAGE_SIZE } from "./githubHelpers";
import type {
  FetchPRStatsRequest,
  FetchPRStatsResponse,
  PRStats,
  CommitDetail,
} from "../shared/types";

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

export async function handleFetchPRStats(msg: FetchPRStatsRequest): Promise<FetchPRStatsResponse> {
  const headers = await ghHeaders();
  if (!headers) return { ok: false, error: "No GitHub token configured." };

  const base = `${apiBase(msg.owner, msg.repo)}/pulls/${msg.number}`;

  const [prRes, filesRes, commitsRes, reviewsRes] = await Promise.all([
    fetch(base, { headers }),
    fetch(`${base}/files?per_page=${API_PAGE_SIZE}`, { headers }),
    fetch(`${base}/commits?per_page=${API_PAGE_SIZE}`, { headers }),
    fetch(`${base}/reviews?per_page=${API_PAGE_SIZE}`, { headers }),
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
        const res = await fetch(`${apiBase(msg.owner, msg.repo)}/commits/${c.sha}`, { headers });
        if (!res.ok) return null;
        return res.json();
      } catch {
        console.warn(`[PRobe] Failed to fetch commit detail for ${c.sha}`);
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
