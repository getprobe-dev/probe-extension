import { describe, it, expect } from "vitest";
import {
  parsePRUrl,
  extractDiffForFile,
  extractFirstChangedLine,
  extractLinesFromDiff,
  parseLineRangeFromHash,
} from "../context";

describe("parsePRUrl", () => {
  it("parses a standard GitHub PR URL", () => {
    const result = parsePRUrl("https://github.com/owner/repo/pull/42");
    expect(result).toEqual({ owner: "owner", repo: "repo", number: 42 });
  });

  it("parses a PR URL with file tab", () => {
    const result = parsePRUrl("https://github.com/org/project/pull/123/files");
    expect(result).toEqual({ owner: "org", repo: "project", number: 123 });
  });

  it("returns null for non-PR URLs", () => {
    expect(parsePRUrl("https://github.com/owner/repo")).toBeNull();
    expect(parsePRUrl("https://github.com/owner/repo/issues/1")).toBeNull();
    expect(parsePRUrl("https://google.com")).toBeNull();
  });
});

const SAMPLE_DIFF = `diff --git a/src/App.tsx b/src/App.tsx
index abc123..def456 100644
--- a/src/App.tsx
+++ b/src/App.tsx
@@ -1,5 +1,6 @@
 import React from 'react';
+import { NewComponent } from './NewComponent';
 
 function App() {
   return <div>Hello</div>;
 }
diff --git a/src/utils.ts b/src/utils.ts
index 111aaa..222bbb 100644
--- a/src/utils.ts
+++ b/src/utils.ts
@@ -10,3 +10,7 @@
 export function helper() {
   return true;
 }
+
+export function newHelper() {
+  return false;
+}`;

describe("extractDiffForFile", () => {
  it("extracts the diff for a specific file", () => {
    const result = extractDiffForFile(SAMPLE_DIFF, "src/utils.ts");
    expect(result).toContain("diff --git a/src/utils.ts");
    expect(result).toContain("newHelper");
    expect(result).not.toContain("NewComponent");
  });

  it("extracts the first file", () => {
    const result = extractDiffForFile(SAMPLE_DIFF, "src/App.tsx");
    expect(result).toContain("NewComponent");
    expect(result).not.toContain("newHelper");
  });

  it("returns empty string for a non-existent file", () => {
    const result = extractDiffForFile(SAMPLE_DIFF, "nonexistent.ts");
    expect(result).toBe("");
  });
});

describe("extractFirstChangedLine", () => {
  it("finds the first added line", () => {
    const result = extractFirstChangedLine(SAMPLE_DIFF, "src/App.tsx");
    expect(result).toEqual({ line: 2, side: "RIGHT" });
  });

  it("returns default for non-existent file", () => {
    const result = extractFirstChangedLine(SAMPLE_DIFF, "nope.ts");
    expect(result).toEqual({ line: 1, side: "RIGHT" });
  });
});

describe("extractLinesFromDiff", () => {
  it("extracts added lines from the RIGHT side", () => {
    const result = extractLinesFromDiff(SAMPLE_DIFF, "src/utils.ts", 13, 16, "RIGHT");
    expect(result).toContain("newHelper");
  });

  it("returns empty for out-of-range lines", () => {
    const result = extractLinesFromDiff(SAMPLE_DIFF, "src/utils.ts", 999, 1000, "RIGHT");
    expect(result).toBe("");
  });
});

describe("parseLineRangeFromHash", () => {
  it("returns null when no matching hash", () => {
    // parseLineRangeFromHash depends on browser `location` global;
    // skip in node environments
    if (typeof location === "undefined") return;
    expect(parseLineRangeFromHash()).toBeNull();
  });
});
