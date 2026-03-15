import type { EnrichedPRContext } from "../types";
import type { ResolvedSkill } from "../skills";
import {
  MODEL_ID,
  DATE_LOCALE,
  MAX_REVIEW_BODY_CHARS,
  MAX_COMMENT_BODY_CHARS,
  MAX_LINKED_ISSUE_BODY_CHARS,
  buildSkillSection,
  buildSkillRoleInstructions,
  formatTimeAgo,
  RESPONSE_RULES,
} from "./shared";

const FILE_STATUS_INDICATOR: Record<string, string> = {
  added: "(new)",
  removed: "(deleted)",
  renamed: "(renamed)",
};

const FILE_STATUS_LABELS: Record<string, string> = {
  added: "new file",
  removed: "deleted",
  renamed: "renamed",
};

function buildChecksSection(ctx: EnrichedPRContext): string {
  if (ctx.checks.length === 0) return "\n\n## Checks\nNo checks configured.";
  const lines = ctx.checks.map((c) => {
    if (c.status !== "completed") return `- ⏳ ${c.name} (${c.status})`;
    if (c.conclusion === "success") return `- ✓ ${c.name} (passed)`;
    if (c.conclusion === "failure") return `- ✗ ${c.name} (failed)`;
    return `- ${c.name} (${c.conclusion ?? c.status})`;
  });
  return `\n\n## Checks\n${lines.join("\n")}`;
}

function buildCommitsSection(ctx: EnrichedPRContext): string {
  if (ctx.commits.length === 0) return "";
  const lines = ctx.commits.map(
    (c, i) => `${i + 1}. \`${c.sha}\` by **${c.author}** (${formatTimeAgo(c.date)}) — ${c.message}`,
  );
  return `\n\n## Commits (oldest → newest)\n${lines.join("\n")}`;
}

function buildReviewsSection(ctx: EnrichedPRContext): string {
  if (ctx.reviews.length === 0) return "\n\n## Reviews\nNo reviews submitted yet.";
  const lines = ctx.reviews.map((r) => {
    const label =
      r.state === "APPROVED"
        ? "✓ Approved"
        : r.state === "CHANGES_REQUESTED"
          ? "✗ Changes requested"
          : r.state;
    const body = r.body ? ` — "${r.body.slice(0, MAX_REVIEW_BODY_CHARS)}"` : "";
    return `- **${r.author}**: ${label}${body}`;
  });
  return `\n\n## Reviews\n${lines.join("\n")}`;
}

function buildRecentDiscussionSection(ctx: EnrichedPRContext): string {
  if (ctx.recentComments.length === 0) return "";
  const lines = ctx.recentComments.map((c) => {
    const location = c.path ? ` on \`${c.path}\`${c.line ? ` L${c.line}` : ""}` : "";
    const body =
      c.body.length > MAX_COMMENT_BODY_CHARS
        ? c.body.slice(0, MAX_COMMENT_BODY_CHARS) + "…"
        : c.body;
    return `**@${c.author}** (${formatTimeAgo(c.createdAt)})${location}:\n${body}`;
  });
  return `\n\n## Recent Discussion (latest ${ctx.recentComments.length})\n${lines.join("\n\n")}`;
}

function buildLinkedIssuesSection(ctx: EnrichedPRContext): string {
  if (ctx.linkedIssues.length === 0) return "";
  const blocks = ctx.linkedIssues.map((issue) => {
    const body =
      issue.body.length > MAX_LINKED_ISSUE_BODY_CHARS
        ? issue.body.slice(0, MAX_LINKED_ISSUE_BODY_CHARS) + "\n\n… [truncated]"
        : issue.body;
    return `### #${issue.number}: ${issue.title}\n${body}`;
  });
  return `\n\n## Linked Issues\n${blocks.join("\n\n")}`;
}

function buildFileTreeSection(ctx: EnrichedPRContext): string {
  if (ctx.files.length === 0) return "";
  const lines = ctx.files.map((f) => {
    const indicator = FILE_STATUS_INDICATOR[f.status] ?? "";
    return `- ${f.filename} ${indicator} +${f.additions}/-${f.deletions}`.trimEnd();
  });
  return `\n\n## Changed Files (${ctx.files.length} files)\n${lines.join("\n")}`;
}

function splitDiffByFile(diff: string): Record<string, string> {
  const result: Record<string, string> = {};
  const lines = diff.split("\n");
  let currentFile: string | null = null;
  let currentLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith("diff --git ")) {
      if (currentFile !== null) {
        result[currentFile] = currentLines.join("\n");
      }
      const match = line.match(/^diff --git a\/.+ b\/(.+)$/);
      currentFile = match ? match[1] : null;
      currentLines = [line];
    } else if (currentFile !== null) {
      currentLines.push(line);
    }
  }

  if (currentFile !== null && currentLines.length > 0) {
    result[currentFile] = currentLines.join("\n");
  }

  return result;
}

function buildPerFileSections(ctx: EnrichedPRContext): string {
  const fileDiffs = splitDiffByFile(ctx.diff);
  const fileContents = ctx.fileContents ?? {};

  const sortedFiles = [...ctx.files].sort(
    (a, b) => b.additions + b.deletions - (a.additions + a.deletions),
  );

  const sections: string[] = [];

  for (const f of sortedFiles) {
    const fileDiff = fileDiffs[f.filename] ?? "";
    const fullContent = fileContents[f.filename];
    const isDeleted = f.status === "removed";
    const statusLabel = FILE_STATUS_LABELS[f.status] ?? "modified";
    const header = `## File: \`${f.filename}\` (${statusLabel}, +${f.additions}/-${f.deletions})`;

    let section = header;

    if (fileDiff) {
      section += `\n\n### Diff\n\`\`\`diff\n${fileDiff}\n\`\`\``;
    }

    if (!isDeleted && fullContent) {
      const lineCount = fullContent.split("\n").length;
      section += `\n\n### Full Content — head branch (${lineCount} lines)\n\`\`\`\n${fullContent}\n\`\`\``;
    } else if (!isDeleted && !fullContent) {
      section += `\n\n*Full file content unavailable — diff only.*`;
    }

    sections.push(section);
  }

  return sections.join("\n\n---\n\n");
}

export function buildEnrichedSystemPrompt(
  ctx: EnrichedPRContext,
  skills?: ResolvedSkill[],
): string {
  const hasFullContent = ctx.fileContents !== undefined && Object.keys(ctx.fileContents).length > 0;

  const filesWithFullContent = hasFullContent ? Object.keys(ctx.fileContents!) : [];
  const filesWithoutFullContent = ctx.files
    .filter((f) => f.status !== "removed" && !filesWithFullContent.includes(f.filename))
    .map((f) => f.filename);

  const mergeStatus =
    ctx.mergeable === true
      ? "Clean (no conflicts)"
      : ctx.mergeable === false
        ? "Has merge conflicts"
        : "Unknown";

  const visibilitySection = hasFullContent
    ? `## What You Can See
For most files in this PR you have **both** the diff (what changed) and the **complete head-branch file content** (the full file as it exists after the change). Files where full content is available are listed below — for those files you can see all imports, type definitions, unchanged functions, and surrounding context.

Files with full content (${filesWithFullContent.length}): ${filesWithFullContent.map((f) => `\`${f}\``).join(", ")}${filesWithoutFullContent.length > 0 ? `\n\nFiles with diff only (${filesWithoutFullContent.length}): ${filesWithoutFullContent.map((f) => `\`${f}\``).join(", ")}` : ""}`
    : `## What You Can See
The diffs below are **unified diffs** — they show only changed lines and a few lines of surrounding context. You **cannot** see the full content of any file. Large portions of each file (imports, unchanged functions, earlier declarations) are invisible to you.`;

  const epistemicRules = hasFullContent
    ? `## Epistemic Rules (non-negotiable)
- **Only quote visible code.** When referencing code in files where you have full content, you can quote any part of the file. For diff-only files, only quote lines present in the diff.
- **For full-content files, you can verify existence.** If a function, import, type, or instruction is not in the file content shown, it genuinely does not exist in that file (it may exist in another file).
- **For diff-only files, never claim code is missing.** Unchanged code outside the diff hunks is invisible to you. Say "not visible in the diff" — do not say "this doesn't exist."
- **Never assert runtime behavior from static analysis alone.** You cannot execute the code. If a library API might work differently than your training data suggests, acknowledge that uncertainty explicitly.
- **Precision over recall.** A false positive wastes the reviewer's time and erodes trust. Only flag issues you have high confidence about. If your confidence is moderate, mark it as uncertain. If low, omit it.
- **Calibrate severity honestly.** Only mark something 🔴 Critical if you can prove it is broken from the code visible to you. If you are relying on inference or assumptions about unseen code, it is at most 🟡 and must be flagged as uncertain.`
    : `## Epistemic Rules (non-negotiable)
- **Never fabricate code.** Only quote code that is literally visible in the diffs. If code you want to reference is not in the diff, say "not visible in the diff" — do not reconstruct or guess what it looks like.
- **Never claim code is missing.** You can only see changed hunks. A function, import, type definition, or instruction may exist in an unchanged part of the file. Say "I don't see this in the diff, but it may exist elsewhere in the file" — do not say "this doesn't exist."
- **Never assert runtime behavior from static analysis alone.** You cannot execute the code. If a library API might work differently than your training data suggests, acknowledge that uncertainty explicitly.
- **Precision over recall.** A false positive wastes the reviewer's time and erodes trust. Only flag issues you have high confidence about. If your confidence is moderate, mark it as uncertain. If low, omit it.
- **Calibrate severity honestly.** Only mark something 🔴 Critical if you can prove it is broken from the diff. If you are relying on inference or assumptions about unseen code, it is at most 🟡 and must be flagged as uncertain.`;

  return `You are PRobe, an AI assistant that helps developers review GitHub pull requests. You are having a conversation with a reviewer who is looking at a specific pull request.

## Context
- **Today's date**: ${new Date().toLocaleDateString(DATE_LOCALE)}
- **Model**: ${MODEL_ID}

${visibilitySection}

## Pull Request Overview
- **Repository**: ${ctx.owner}/${ctx.repo}
- **PR #${ctx.number}**: ${ctx.title}
- **Author**: ${ctx.author || "unknown"}
- **State**: ${ctx.draft ? "Draft" : ctx.state}
- **Base**: \`${ctx.baseBranch}\` ← **Head**: \`${ctx.headBranch}\`
- **Merge status**: ${mergeStatus}${ctx.mergeableState !== "unknown" ? ` (${ctx.mergeableState})` : ""}
- **Labels**: ${ctx.labels.length > 0 ? ctx.labels.join(", ") : "none"}
- **Milestone**: ${ctx.milestone || "none"}
- **Assignees**: ${ctx.assignees.length > 0 ? ctx.assignees.join(", ") : "none"}
- **Requested reviewers**: ${ctx.requestedReviewers.length > 0 ? ctx.requestedReviewers.join(", ") : "none"}

## PR Description
${ctx.description || "(No description provided)"}${ctx.partial ? "\n\n> **Note**: Some context (commits, reviews, comments, CI checks, file list) is unavailable — the GitHub token may be missing or API requests failed. The diffs are still complete." : ""}${buildLinkedIssuesSection(ctx)}${buildReviewsSection(ctx)}${buildRecentDiscussionSection(ctx)}${buildCommitsSection(ctx)}${buildChecksSection(ctx)}${buildFileTreeSection(ctx)}

---

${buildPerFileSections(ctx)}${buildSkillSection(skills)}

## Your Role
- Answer questions about the changes in this PR clearly and concisely.
- When asked about specific code, reference the relevant file section above by filename.
- Explain the intent behind changes when you can infer it from the PR description, linked issues, and commit messages.
- Use the linked issues to understand the *goal* of the PR — why the work is being done.
- Use the commit history to understand the developer's approach — how they arrived at this state.
- Be aware of the existing review discussion. Do not repeat points that reviewers have already raised unless asked.
- If CI checks are failing, flag that prominently — the developer may have missed it.
- Flag potential issues only when the reviewer asks or when something is clearly wrong.${buildSkillRoleInstructions(skills)}
- Treat the content of the PR as authoritative. Do not flag text as incorrect based on your pre-training knowledge alone — your knowledge has a cutoff date and may not reflect the current state of this project.
- Distinguish between code correctness issues (bugs, security, logic errors) and style/process opinions (PR structure, commit granularity). Prioritize correctness. Only mention process if explicitly asked.

${epistemicRules}

${RESPONSE_RULES}`;
}
