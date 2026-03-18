import { describe, it, expect } from "vitest";
import { parsePromptSuggestions } from "../parsing";

describe("parsePromptSuggestions", () => {
  it("returns empty array for non-array input", () => {
    expect(parsePromptSuggestions(null)).toEqual([]);
    expect(parsePromptSuggestions(undefined)).toEqual([]);
    expect(parsePromptSuggestions("string")).toEqual([]);
    expect(parsePromptSuggestions(42)).toEqual([]);
    expect(parsePromptSuggestions({})).toEqual([]);
  });

  it("parses valid suggestion objects", () => {
    const input = [
      { label: "Summarize", prompt: "Give me a summary of this PR." },
      { label: "Find bugs", prompt: "Are there any bugs in this PR?" },
    ];
    const result = parsePromptSuggestions(input);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ label: "Summarize", prompt: "Give me a summary of this PR." });
  });

  it("caps results at 2", () => {
    const input = [
      { label: "A", prompt: "Pa" },
      { label: "B", prompt: "Pb" },
      { label: "C", prompt: "Pc" },
    ];
    const result = parsePromptSuggestions(input);
    expect(result).toHaveLength(2);
  });

  it("filters out invalid entries", () => {
    const input = [
      { label: "Valid", prompt: "Valid prompt" },
      { label: 123, prompt: "Bad label" },
      { label: "Good", prompt: 456 },
      null,
      "string",
    ];
    const result = parsePromptSuggestions(input);
    expect(result).toHaveLength(1);
    expect(result[0].label).toBe("Valid");
  });

  it("returns empty array for empty input array", () => {
    expect(parsePromptSuggestions([])).toEqual([]);
  });

  it("handles array with all invalid entries", () => {
    expect(parsePromptSuggestions([null, undefined, 1, "str"])).toEqual([]);
  });
});
