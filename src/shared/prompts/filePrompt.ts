import type { PRContext, FocusedLineRange } from "../types";
import type { ResolvedSkill } from "../skills";
import {
  MODEL_ID,
  DATE_LOCALE,
  MAX_FILE_DIFF_CHARS,
  MAX_FILE_CONTENT_CHARS,
  buildSkillSection,
  buildSkillRoleInstructions,
  RESPONSE_RULES,
} from "./shared";

const EPISTEMIC_RULES_WITH_FULL_FILE = `## Epistemic Rules (non-negotiable)
- **Never fabricate code.** Only quote code that is literally visible in the diff or full file content above. If you need to reference code to make a point and it is not visible, say so — do not reconstruct or guess what it looks like.
- **Never assert runtime behavior from static analysis alone.** You cannot test the code. If a library API might work differently than your training data suggests, acknowledge that uncertainty.
- **Precision over recall.** A false positive wastes the reviewer's time and erodes trust. Only flag issues you have high confidence about. If your confidence is moderate, explicitly mark it as uncertain. If low, omit it entirely.
- **Calibrate severity honestly.** Only mark something 🔴 Critical if you can prove it is broken from the code visible to you. If you are relying on inference or assumptions about unseen code, it is at most 🟡 and must be flagged as uncertain.`;

const EPISTEMIC_RULES_DIFF_ONLY_FILE = `## Epistemic Rules (non-negotiable)
- **Never fabricate code.** Only quote code that is literally visible in the diff or full file content above. If you need to reference code to make a point and it is not visible, say so — do not reconstruct or guess what it looks like.
- **Never claim code is missing.** You can only see changed hunks. A function, import, type definition, or instruction may exist in an unchanged part of the file that is invisible to you. Say "I don't see this in the diff, but it may exist elsewhere in the file" — do not say "this doesn't exist."
- **Never assert runtime behavior from static analysis alone.** You cannot test the code. If a library API might work differently than your training data suggests, acknowledge that uncertainty.
- **Precision over recall.** A false positive wastes the reviewer's time and erodes trust. Only flag issues you have high confidence about. If your confidence is moderate, explicitly mark it as uncertain. If low, omit it entirely.
- **Calibrate severity honestly.** Only mark something 🔴 Critical if you can prove it is broken from the code visible to you. If you are relying on inference or assumptions about unseen code, it is at most 🟡 and must be flagged as uncertain.`;

export function buildFileSystemPrompt(
  context: PRContext,
  filePath: string,
  fileDiff: string,
  fileContent?: string,
  lineRange?: FocusedLineRange,
  skills?: ResolvedSkill[],
  modelId?: string,
): string {
  const diffSection =
    fileDiff.length > MAX_FILE_DIFF_CHARS
      ? fileDiff.slice(0, MAX_FILE_DIFF_CHARS) + "\n\n... [diff truncated due to length] ..."
      : fileDiff;

  let fullFileSection = "";
  if (fileContent) {
    const truncated =
      fileContent.length > MAX_FILE_CONTENT_CHARS
        ? fileContent.slice(0, MAX_FILE_CONTENT_CHARS) +
          "\n\n... [file truncated due to length] ..."
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

  const epistemicRules = fileContent
    ? EPISTEMIC_RULES_WITH_FULL_FILE
    : EPISTEMIC_RULES_DIFF_ONLY_FILE;

  return `You are PRobe, an AI assistant that helps developers review GitHub pull requests. ${focusDescription}

## Context
- **Today's date**: ${new Date().toLocaleDateString(DATE_LOCALE)}
- **Model**: ${modelId ?? MODEL_ID}
${fileContent ? "" : "\n## What You Can See\nThe diff below shows only changed lines and a few lines of surrounding context. You **cannot** see the full content of this file — only the hunks that were modified.\n"}
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

${epistemicRules}

${RESPONSE_RULES}`;
}
