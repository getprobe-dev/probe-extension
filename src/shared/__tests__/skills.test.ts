import { describe, it, expect } from "vitest";
import {
  detectExtensionsFromDiff,
  extractFilePathsFromDiff,
  matchSkills,
  SKILL_REGISTRY,
} from "../skills";

const SAMPLE_DIFF = `diff --git a/src/App.tsx b/src/App.tsx
--- a/src/App.tsx
+++ b/src/App.tsx
@@ -1 +1 @@
-old
+new
diff --git a/server/main.py b/server/main.py
--- a/server/main.py
+++ b/server/main.py
@@ -1 +1 @@
-old
+new
diff --git a/README.md b/README.md
--- a/README.md
+++ b/README.md
@@ -1 +1 @@
-old
+new`;

describe("detectExtensionsFromDiff", () => {
  it("extracts unique file extensions from a diff", () => {
    const exts = detectExtensionsFromDiff(SAMPLE_DIFF);
    expect(exts).toContain(".tsx");
    expect(exts).toContain(".py");
    expect(exts).toContain(".md");
    expect(exts.size).toBe(3);
  });

  it("returns empty set for empty diff", () => {
    expect(detectExtensionsFromDiff("")).toEqual(new Set());
  });

  it("handles files without extensions", () => {
    const diff = `diff --git a/Makefile b/Makefile\n--- a/Makefile\n+++ b/Makefile\n@@ -1 +1 @@\n-old\n+new`;
    const exts = detectExtensionsFromDiff(diff);
    expect(exts.size).toBe(0);
  });

  it("can be called multiple times without global regex state issues", () => {
    const first = detectExtensionsFromDiff(SAMPLE_DIFF);
    const second = detectExtensionsFromDiff(SAMPLE_DIFF);
    expect(first).toEqual(second);
  });
});

describe("extractFilePathsFromDiff", () => {
  it("returns all file paths", () => {
    const paths = extractFilePathsFromDiff(SAMPLE_DIFF);
    expect(paths).toEqual(["src/App.tsx", "server/main.py", "README.md"]);
  });
});

describe("matchSkills", () => {
  it("returns matching skills for tsx extensions", () => {
    const exts = new Set([".tsx"]);
    const matched = matchSkills(exts);
    expect(matched.length).toBeGreaterThan(0);
    expect(matched.every((s) => s.triggerExtensions.includes(".tsx"))).toBe(true);
  });

  it("returns matching skills for py extensions", () => {
    const exts = new Set([".py"]);
    const matched = matchSkills(exts);
    expect(matched.length).toBeGreaterThan(0);
    expect(matched.every((s) => s.triggerExtensions.includes(".py"))).toBe(true);
  });

  it("returns empty for unknown extensions", () => {
    const exts = new Set([".xyz"]);
    expect(matchSkills(exts)).toEqual([]);
  });

  it("returns empty for empty extensions set", () => {
    expect(matchSkills(new Set())).toEqual([]);
  });

  it("respects maxSkills cap", () => {
    const exts = new Set([".tsx", ".py", ".ts"]);
    const result = matchSkills(exts, 2);
    expect(result.length).toBeLessThanOrEqual(2);
  });

  it("returns skills sorted by priority", () => {
    const exts = new Set([".tsx"]);
    const matched = matchSkills(exts);
    for (let i = 1; i < matched.length; i++) {
      expect(matched[i].priority).toBeGreaterThanOrEqual(matched[i - 1].priority);
    }
  });

  it("SKILL_REGISTRY has valid entries", () => {
    for (const skill of SKILL_REGISTRY) {
      expect(skill.id).toBeTruthy();
      expect(skill.name).toBeTruthy();
      expect(skill.triggerExtensions.length).toBeGreaterThan(0);
      expect(skill.rawUrl).toMatch(/^https:\/\//);
      expect(skill.maxContentLength).toBeGreaterThan(0);
    }
  });
});
