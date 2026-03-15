import { STORAGE_KEYS } from "../shared/config";

export const GITHUB_API_VERSION = "2022-11-28";
export const API_PAGE_SIZE = 100;
export const NO_TOKEN_ERROR =
  "No GitHub token configured. Click the PRobe extension icon to add one.";

export function apiBase(owner: string, repo: string): string {
  return `https://api.github.com/repos/${owner}/${repo}`;
}

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
    const msg = parsed?.message;
    const errors: unknown[] | undefined = parsed?.errors;
    if (errors?.length) {
      const reasons = errors
        .map((e: unknown) =>
          e && typeof e === "object" && "message" in e
            ? (e as { message: string }).message
            : null,
        )
        .filter(Boolean);
      detail = reasons.length ? reasons.join("; ") : (msg ?? detail);
    } else {
      detail = msg ?? detail;
    }
  } catch {
    console.warn("[PRobe] Failed to parse GitHub API error body");
  }
  return detail;
}
