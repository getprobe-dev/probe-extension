import type { ResolvedSkill } from "../skills";

export const MODEL_ID = "claude-opus-4-6";
export const DATE_LOCALE = "en-CA";

// ── Truncation limits ──
export const MAX_DIFF_CHARS = 80_000;
export const MAX_FILE_DIFF_CHARS = 40_000;
export const MAX_FILE_CONTENT_CHARS = 30_000;
export const MAX_REVIEW_BODY_CHARS = 200;
export const MAX_COMMENT_BODY_CHARS = 300;
export const MAX_LINKED_ISSUE_BODY_CHARS = 1_000;

export function formatTimeAgo(dateStr: string): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function buildSkillSection(skills?: ResolvedSkill[]): string {
  if (!skills || skills.length === 0) return "";
  const blocks = skills.map((s) => `### ${s.name}\n${s.content}`).join("\n\n");
  return `

## Review Guidelines
The following best-practice guidelines apply to the technologies detected in this PR.
When reviewing, check the diff against these rules and **cite specific rule names** when flagging issues.

${blocks}`;
}

export function buildSkillRoleInstructions(skills?: ResolvedSkill[]): string {
  if (!skills || skills.length === 0) return "";
  return `\n- When the Review Guidelines section is present, proactively check the diff against those rules and cite rule names (e.g. "async-parallel", "architecture-avoid-boolean-props") when flagging issues.`;
}

export const EPISTEMIC_RULES_DIFF_ONLY = `## Epistemic Rules (non-negotiable)
- **Never fabricate code.** Only quote code that is literally visible in the diff above. If you need to reference code to make a point and it is not in the diff, say "not visible in the diff" — do not reconstruct or guess what it looks like.
- **Never claim code is missing.** You can only see changed hunks. A function, import, type definition, or instruction may exist in an unchanged part of the file that is invisible to you. If you cannot find something in the diff, say "I don't see this in the diff, but it may exist in an unchanged part of the file" — do not say "this doesn't exist" or "there is no instruction for this."
- **Never assert runtime behavior from static analysis alone.** You cannot test the code. If a library API might work differently than your training data suggests, acknowledge that uncertainty. Do not state that something "will always fail" or "will silently break" unless the failure is provable from the diff context alone (e.g. a type mismatch, a missing required argument, an unreachable branch).
- **Precision over recall.** A false positive (flagging something that works correctly) wastes the reviewer's time and erodes trust in the tool. Only flag issues you have high confidence about. If your confidence is moderate, explicitly mark it as uncertain. If your confidence is low, omit it entirely. It is perfectly acceptable — and preferred — to report fewer issues if that means every reported issue is real.
- **Calibrate severity honestly.** Only mark something 🔴 Critical if you can prove it is broken from the diff. If you are relying on inference, API documentation memory, or assumptions about unseen code, it is at most 🟡 and must be flagged as uncertain.`;

export const RESPONSE_RULES = `## Response Rules (non-negotiable)
- **Be brief.** Answer in as few words as the question requires. One sentence is better than five if it covers the point.
- **When listing issues, hard cap at 3.** Pick the single most important finding in each tier: at most 1 critical, 1 significant, 1 minor. If there is nothing worth flagging in a tier, omit that tier entirely. Never pad with weak findings to fill a list. Zero issues is a valid and good answer.
- **If the reviewer asks a specific question** (not "review this PR"), answer that question only. Do not append unsolicited issue lists.
- Use markdown formatting for readability.
- End every response with a new line containing exactly this and nothing after it: %%SUGGESTIONS:[{"label":"<2–4 word label>","prompt":"<detailed follow-up question>"},{"label":"<2–4 word label>","prompt":"<detailed follow-up question>"}] — exactly 2 entries. Each label must start with an action verb (e.g. Explain, Analyze, Verify, Find, Check, Review, Show). Each prompt is a full detailed question. No spaces inside the JSON.`;
