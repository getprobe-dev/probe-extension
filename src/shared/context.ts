import type { PRContext, FetchDiffRequest, FetchDiffResponse } from "./types";

export function parsePRUrl(
  url: string
): { owner: string; repo: string; number: number } | null {
  const match = url.match(
    /github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/
  );
  if (!match) return null;
  return { owner: match[1], repo: match[2], number: parseInt(match[3], 10) };
}

export function scrapePRMetadata(): { title: string; description: string } {
  const titleEl = document.querySelector<HTMLElement>(
    ".gh-header-title .js-issue-title"
  );
  const title = titleEl?.textContent?.trim() ?? "";

  const descriptionEl = document.querySelector<HTMLElement>(
    ".comment-body"
  );
  const description = descriptionEl?.textContent?.trim() ?? "";

  return { title, description };
}

async function fetchDiff(
  owner: string,
  repo: string,
  number: number
): Promise<string> {
  const msg: FetchDiffRequest = { type: "fetch-diff", owner, repo, number };
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(msg, (response: FetchDiffResponse) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (!response.ok) {
        reject(new Error(`Failed to fetch diff: ${response.error}`));
        return;
      }
      resolve(response.diff!);
    });
  });
}

export async function extractPRContext(): Promise<PRContext> {
  const parsed = parsePRUrl(window.location.href);
  if (!parsed) throw new Error("Not on a GitHub PR page");

  const { title, description } = scrapePRMetadata();
  const diff = await fetchDiff(parsed.owner, parsed.repo, parsed.number);

  return { ...parsed, title, description, diff };
}
