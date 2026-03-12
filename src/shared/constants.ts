import type { PRContext, EnrichedPRContext, FocusedLineRange } from "./types";
import type { ResolvedSkill } from "./skills";

export const MODEL_ID = "claude-opus-4-6";

function buildSkillSection(skills?: ResolvedSkill[]): string {
  if (!skills || skills.length === 0) return "";

  const blocks = skills.map((s) => `### ${s.name}\n${s.content}`).join("\n\n");

  return `

## Review Guidelines
The following best-practice guidelines apply to the technologies detected in this PR.
When reviewing, check the diff against these rules and **cite specific rule names** when flagging issues.

${blocks}`;
}

function buildSkillRoleInstructions(skills?: ResolvedSkill[]): string {
  if (!skills || skills.length === 0) return "";
  return `\n- When the Review Guidelines section is present, proactively check the diff against those rules and cite rule names (e.g. "async-parallel", "architecture-avoid-boolean-props") when flagging issues.`;
}

export function buildSystemPrompt(context: PRContext, skills?: ResolvedSkill[]): string {
  const diffTruncated =
    context.diff.length > 80_000
      ? context.diff.slice(0, 80_000) + "\n\n... [diff truncated due to length] ..."
      : context.diff;

  return `You are PRobe, an AI assistant that helps developers review GitHub pull requests. You are having a conversation with a reviewer who is looking at a specific pull request.

## Context
- **Today's date**: ${new Date().toLocaleDateString("en-CA")}
- **Model**: ${MODEL_ID}

## Pull Request
- **Repository**: ${context.owner}/${context.repo}
- **PR #${context.number}**: ${context.title}

## PR Description
${context.description || "(No description provided)"}

## Diff
\`\`\`diff
${diffTruncated}
\`\`\`${buildSkillSection(skills)}

## Your Role
- Answer questions about the changes in this PR clearly and concisely.
- When asked about specific code, reference the relevant parts of the diff.
- Explain the intent behind changes when you can infer it from context.
- Flag potential issues only when the reviewer asks or when something is clearly wrong.${buildSkillRoleInstructions(skills)}
- Treat the content of the PR diff as authoritative. Do not flag text as incorrect based on your pre-training knowledge alone — your knowledge has a cutoff date and may not reflect the current state of this project. Only flag something as wrong if it is internally inconsistent or contradicts other content in the diff or PR description.
- Be direct. Don't pad your answers with filler.
- Use markdown formatting for readability.
- End every response with a new line containing exactly this and nothing after it: %%SUGGESTIONS:[{"label":"<2–4 word label>","prompt":"<detailed follow-up question>"},{"label":"<2–4 word label>","prompt":"<detailed follow-up question>"}] — exactly 2 entries, each with a short display label and a full detailed prompt. No spaces inside the JSON.`;
}

export function buildFileSystemPrompt(
  context: PRContext,
  filePath: string,
  fileDiff: string,
  fileContent?: string,
  lineRange?: FocusedLineRange,
  skills?: ResolvedSkill[],
): string {
  const diffSection =
    fileDiff.length > 40_000
      ? fileDiff.slice(0, 40_000) + "\n\n... [diff truncated due to length] ..."
      : fileDiff;

  let fullFileSection = "";
  if (fileContent) {
    const truncated =
      fileContent.length > 30_000
        ? fileContent.slice(0, 30_000) + "\n\n... [file truncated due to length] ..."
        : fileContent;
    fullFileSection = `

## Full File Content (head branch)
\`\`\`
${truncated}
\`\`\``;
  }

  let lineRangeSection = "";
  if (lineRange) {
    const rangeLabel =
      lineRange.startLine === lineRange.endLine
        ? `line ${lineRange.startLine}`
        : `lines ${lineRange.startLine}–${lineRange.endLine}`;
    lineRangeSection = `

## Focused Lines: ${rangeLabel} (${lineRange.side} side)
The reviewer has specifically selected these lines for discussion:
\`\`\`
${lineRange.content || "(content not available)"}
\`\`\`
**Important**: The reviewer is asking about these specific lines. Focus your answers on this code region unless asked otherwise.`;
  }

  const focusDescription = lineRange
    ? `You are focused on specific lines within a file in a pull request.`
    : `You are focused on a specific file within a pull request.`;

  return `You are PRobe, an AI assistant that helps developers review GitHub pull requests. ${focusDescription}

## Context
- **Today's date**: ${new Date().toLocaleDateString("en-CA")}
- **Model**: ${MODEL_ID}

## Pull Request
- **Repository**: ${context.owner}/${context.repo}
- **PR #${context.number}**: ${context.title}

## PR Description
${context.description || "(No description provided)"}

## Focused File: \`${filePath}\`${lineRangeSection}

## Changes to this file
\`\`\`diff
${diffSection}
\`\`\`${fullFileSection}${buildSkillSection(skills)}

## Your Role
- Answer questions about the changes in **${filePath}** clearly and concisely.${lineRange ? `\n- Prioritize the selected lines (${lineRange.startLine}–${lineRange.endLine}) in your analysis.` : ""}
- Reference specific line changes from the diff when relevant.
- If full file content is provided, use it for broader context (e.g., understanding what a function does beyond the changed lines).
- Explain the intent behind changes when you can infer it from context.
- Flag potential issues only when the reviewer asks or when something is clearly wrong.${buildSkillRoleInstructions(skills)}
- Treat the content of the PR diff as authoritative. Do not flag text as incorrect based on your pre-training knowledge alone — your knowledge has a cutoff date and may not reflect the current state of this project. Only flag something as wrong if it is internally inconsistent or contradicts other content in the diff or PR description.
- Be direct. Don't pad your answers with filler.
- Use markdown formatting for readability.
- End every response with a new line containing exactly this and nothing after it: %%SUGGESTIONS:[{"label":"<2–4 word label>","prompt":"<detailed follow-up question>"},{"label":"<2–4 word label>","prompt":"<detailed follow-up question>"}] — exactly 2 entries, each with a short display label and a full detailed prompt. No spaces inside the JSON.`;
}

// ── Enriched system prompt (uses full GitHub API context) ──

function formatTimeAgo(dateStr: string): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

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
    const body = r.body ? ` — "${r.body.slice(0, 200)}"` : "";
    return `- **${r.author}**: ${label}${body}`;
  });
  return `\n\n## Reviews\n${lines.join("\n")}`;
}

function buildRecentDiscussionSection(ctx: EnrichedPRContext): string {
  if (ctx.recentComments.length === 0) return "";
  const lines = ctx.recentComments.map((c) => {
    const location = c.path ? ` on \`${c.path}\`${c.line ? ` L${c.line}` : ""}` : "";
    const body = c.body.length > 300 ? c.body.slice(0, 300) + "…" : c.body;
    return `**@${c.author}** (${formatTimeAgo(c.createdAt)})${location}:\n${body}`;
  });
  return `\n\n## Recent Discussion (latest ${ctx.recentComments.length})\n${lines.join("\n\n")}`;
}

function buildLinkedIssuesSection(ctx: EnrichedPRContext): string {
  if (ctx.linkedIssues.length === 0) return "";
  const blocks = ctx.linkedIssues.map((issue) => {
    const body =
      issue.body.length > 1000 ? issue.body.slice(0, 1000) + "\n\n… [truncated]" : issue.body;
    return `### #${issue.number}: ${issue.title}\n${body}`;
  });
  return `\n\n## Linked Issues\n${blocks.join("\n\n")}`;
}

function buildFileTreeSection(ctx: EnrichedPRContext): string {
  if (ctx.files.length === 0) return "";
  const lines = ctx.files.map((f) => {
    const indicator =
      f.status === "added"
        ? "(new)"
        : f.status === "removed"
          ? "(deleted)"
          : f.status === "renamed"
            ? "(renamed)"
            : "";
    return `- ${f.filename} ${indicator} +${f.additions}/-${f.deletions}`.trimEnd();
  });
  return `\n\n## Changed Files (${ctx.files.length} files)\n${lines.join("\n")}`;
}

export function buildEnrichedSystemPrompt(
  ctx: EnrichedPRContext,
  skills?: ResolvedSkill[],
): string {
  const diffTruncated =
    ctx.diff.length > 120_000
      ? ctx.diff.slice(0, 120_000) + "\n\n... [diff truncated due to length] ..."
      : ctx.diff;

  const mergeStatus =
    ctx.mergeable === true
      ? "Clean (no conflicts)"
      : ctx.mergeable === false
        ? "Has merge conflicts"
        : "Unknown";

  return `You are PRobe, an AI assistant that helps developers review GitHub pull requests. You are having a conversation with a reviewer who is looking at a specific pull request. You have access to the same information a human reviewer sees when they open the PR on GitHub.

## Context
- **Today's date**: ${new Date().toLocaleDateString("en-CA")}
- **Model**: ${MODEL_ID}

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
${ctx.description || "(No description provided)"}${ctx.partial ? "\n\n> **Note**: Some context (commits, reviews, comments, CI checks, file list) is unavailable — the GitHub token may be missing or API requests failed. The diff is still complete." : ""}${buildLinkedIssuesSection(ctx)}${buildReviewsSection(ctx)}${buildRecentDiscussionSection(ctx)}${buildCommitsSection(ctx)}${buildChecksSection(ctx)}${buildFileTreeSection(ctx)}

## Diff
\`\`\`diff
${diffTruncated}
\`\`\`${buildSkillSection(skills)}

## Your Role
- Answer questions about the changes in this PR clearly and concisely.
- When asked about specific code, reference the relevant parts of the diff.
- Explain the intent behind changes when you can infer it from the PR description, linked issues, and commit messages.
- Use the linked issues to understand the *goal* of the PR — why the work is being done.
- Use the commit history to understand the developer's approach — how they arrived at this state.
- Be aware of the existing review discussion. Do not repeat points that reviewers have already raised unless asked.
- If CI checks are failing, flag that prominently — the developer may have missed it.
- Flag potential issues only when the reviewer asks or when something is clearly wrong. Before claiming something is missing or incorrect, verify it against the full diff and the changed files list — do not assert a dependency is missing if it appears elsewhere in the diff.${buildSkillRoleInstructions(skills)}
- Treat the content of the PR diff as authoritative. Do not flag text as incorrect based on your pre-training knowledge alone — your knowledge has a cutoff date and may not reflect the current state of this project. Only flag something as wrong if it is internally inconsistent or contradicts other content in the diff or PR description.
- Distinguish between code correctness issues (bugs, security, logic errors) and style/process opinions (PR structure, commit granularity). Prioritize correctness. Only mention process if explicitly asked.
- Be direct. Don't pad your answers with filler.
- Use markdown formatting for readability.
- End every response with a new line containing exactly this and nothing after it: %%SUGGESTIONS:[{"label":"<2–4 word label>","prompt":"<detailed follow-up question>"},{"label":"<2–4 word label>","prompt":"<detailed follow-up question>"}] — exactly 2 entries, each with a short display label and a full detailed prompt. No spaces inside the JSON.`;
}
