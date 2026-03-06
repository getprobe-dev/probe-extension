import type { PRContext, FetchDiffRequest, FetchDiffResponse, FetchFileRequest, FetchFileResponse } from "./types";

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

export function scrapeHeadBranch(): string {
  const headRef = document.querySelector<HTMLElement>(".head-ref");
  if (headRef) {
    const branchName = headRef.getAttribute("title") || headRef.textContent?.trim();
    if (branchName) return branchName;
  }
  const clipboardCopy = document.querySelector<HTMLElement>(".head-ref clipboard-copy");
  if (clipboardCopy) {
    const val = clipboardCopy.getAttribute("value");
    if (val) return val;
  }
  return "main";
}

export function extractDiffForFile(fullDiff: string, filePath: string): string {
  const lines = fullDiff.split("\n");
  const result: string[] = [];
  let capturing = false;

  for (const line of lines) {
    if (line.startsWith("diff --git")) {
      if (capturing) break;
      if (line.includes(`b/${filePath}`)) {
        capturing = true;
      }
    }
    if (capturing) {
      result.push(line);
    }
  }

  return result.join("\n");
}

export function extractFirstChangedLine(
  fullDiff: string,
  filePath: string
): { line: number; side: "LEFT" | "RIGHT" } {
  const fileDiff = extractDiffForFile(fullDiff, filePath);
  const lines = fileDiff.split("\n");

  let currentNewLine = 0;
  let currentOldLine = 0;

  for (const line of lines) {
    const hunkMatch = line.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunkMatch) {
      currentOldLine = parseInt(hunkMatch[1], 10);
      currentNewLine = parseInt(hunkMatch[2], 10);
      continue;
    }

    if (line.startsWith("+") && !line.startsWith("+++")) {
      return { line: currentNewLine, side: "RIGHT" };
    }
    if (line.startsWith("-") && !line.startsWith("---")) {
      currentOldLine++;
      continue;
    }
    if (!line.startsWith("\\")) {
      currentNewLine++;
      currentOldLine++;
    }
  }

  return { line: 1, side: "RIGHT" };
}

export function extractLinesFromDiff(
  fullDiff: string,
  filePath: string,
  startLine: number,
  endLine: number,
  side: "LEFT" | "RIGHT"
): string {
  const fileDiff = extractDiffForFile(fullDiff, filePath);
  const lines = fileDiff.split("\n");
  const result: string[] = [];

  let currentNewLine = 0;
  let currentOldLine = 0;

  for (const line of lines) {
    const hunkMatch = line.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunkMatch) {
      currentOldLine = parseInt(hunkMatch[1], 10);
      currentNewLine = parseInt(hunkMatch[2], 10);
      continue;
    }

    const currentLine = side === "RIGHT" ? currentNewLine : currentOldLine;

    if (line.startsWith("+") && !line.startsWith("+++")) {
      if (side === "RIGHT" && currentNewLine >= startLine && currentNewLine <= endLine) {
        result.push(line.slice(1));
      }
      currentNewLine++;
    } else if (line.startsWith("-") && !line.startsWith("---")) {
      if (side === "LEFT" && currentOldLine >= startLine && currentOldLine <= endLine) {
        result.push(line.slice(1));
      }
      currentOldLine++;
    } else if (!line.startsWith("\\") && !line.startsWith("diff") && !line.startsWith("index") && !line.startsWith("---") && !line.startsWith("+++")) {
      if (currentLine >= startLine && currentLine <= endLine) {
        result.push(line.startsWith(" ") ? line.slice(1) : line);
      }
      currentNewLine++;
      currentOldLine++;
    }
  }

  return result.join("\n");
}

export function parseLineRangeFromHash(): {
  diffId: string;
  startLine: number;
  endLine: number;
  side: "LEFT" | "RIGHT";
} | null {
  const hash = location.hash;
  const match = hash.match(/#(diff-[a-f0-9]+)([LR])(\d+)(?:-[LR](\d+))?/);
  if (!match) return null;

  const diffId = match[1];
  const side = match[2] === "L" ? "LEFT" as const : "RIGHT" as const;
  const startLine = parseInt(match[3], 10);
  const endLine = match[4] ? parseInt(match[4], 10) : startLine;

  return { diffId, startLine, endLine, side };
}

export function getFilePathFromDiffId(diffId: string): string | null {
  const el = document.getElementById(diffId);
  if (!el) return null;

  const codeEl = el.querySelector<HTMLElement>(
    '[class*="file-path"] code, a[class*="Link--primary"] code, code'
  );
  if (codeEl) {
    const cleaned = (codeEl.textContent ?? "")
      .replace(/[\u200B-\u200F\u2028\u2029\uFEFF]/g, "")
      .trim();
    if (cleaned) return cleaned;
  }

  return null;
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

export async function fetchFileContent(
  owner: string,
  repo: string,
  branch: string,
  path: string
): Promise<string | null> {
  const msg: FetchFileRequest = { type: "fetch-file", owner, repo, branch, path };
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(msg, (response: FetchFileResponse) => {
      if (chrome.runtime.lastError || !response?.ok) {
        resolve(null);
        return;
      }
      resolve(response.content!);
    });
  });
}

export async function extractPRContext(): Promise<PRContext> {
  const parsed = parsePRUrl(window.location.href);
  if (!parsed) throw new Error("Not on a GitHub PR page");

  const { title, description } = scrapePRMetadata();
  const diff = await fetchDiff(parsed.owner, parsed.repo, parsed.number);
  const headBranch = scrapeHeadBranch();

  return { ...parsed, title, description, diff, headBranch };
}
