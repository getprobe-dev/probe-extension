import type { PRContext } from "./types";

export function buildSystemPrompt(context: PRContext): string {
  const diffTruncated =
    context.diff.length > 80_000
      ? context.diff.slice(0, 80_000) +
        "\n\n... [diff truncated due to length] ..."
      : context.diff;

  return `You are PRobe, an AI assistant that helps developers review GitHub pull requests. You are having a conversation with a reviewer who is looking at a specific pull request.

## Pull Request
- **Repository**: ${context.owner}/${context.repo}
- **PR #${context.number}**: ${context.title}

## PR Description
${context.description || "(No description provided)"}

## Diff
\`\`\`diff
${diffTruncated}
\`\`\`

## Your Role
- Answer questions about the changes in this PR clearly and concisely.
- When asked about specific code, reference the relevant parts of the diff.
- Explain the intent behind changes when you can infer it from context.
- Flag potential issues only when the reviewer asks or when something is clearly wrong.
- Be direct. Don't pad your answers with filler.
- Use markdown formatting for readability.`;
}

export function buildFileSystemPrompt(
  context: PRContext,
  filePath: string,
  fileDiff: string,
  fileContent?: string
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

  return `You are PRobe, an AI assistant that helps developers review GitHub pull requests. You are focused on a specific file within a pull request.

## Pull Request
- **Repository**: ${context.owner}/${context.repo}
- **PR #${context.number}**: ${context.title}

## PR Description
${context.description || "(No description provided)"}

## Focused File: \`${filePath}\`

## Changes to this file
\`\`\`diff
${diffSection}
\`\`\`${fullFileSection}

## Your Role
- Answer questions about the changes in **${filePath}** clearly and concisely.
- Reference specific line changes from the diff when relevant.
- If full file content is provided, use it for broader context (e.g., understanding what a function does beyond the changed lines).
- Explain the intent behind changes when you can infer it from context.
- Flag potential issues only when the reviewer asks or when something is clearly wrong.
- Be direct. Don't pad your answers with filler.
- Use markdown formatting for readability.`;
}
