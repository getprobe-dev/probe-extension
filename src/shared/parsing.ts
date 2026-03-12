import type { PromptSuggestion } from "./types";

export function parsePromptSuggestions(raw: unknown): PromptSuggestion[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (s): s is PromptSuggestion =>
        typeof s === "object" &&
        s !== null &&
        typeof (s as Record<string, unknown>).label === "string" &&
        typeof (s as Record<string, unknown>).prompt === "string",
    )
    .slice(0, 2);
}
