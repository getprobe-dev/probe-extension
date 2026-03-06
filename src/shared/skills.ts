export interface SkillEntry {
  id: string;
  name: string;
  description: string;
  triggerExtensions: string[];
  rawUrl: string;
  sourceUrl: string;
  maxContentLength: number;
  priority: number;
}

export interface ResolvedSkill {
  name: string;
  content: string;
  sourceUrl: string;
  description: string;
}

/**
 * Curated registry of review skills, ordered by priority within each tech domain.
 *
 * Sources:
 * - vercel-labs/agent-skills  → React, composition, web design (frontend)
 * - wshobson/agents           → Python, API design, backend patterns
 * - github/awesome-copilot    → tertiary / future expansion
 */
export const SKILL_REGISTRY: SkillEntry[] = [
  // ── Frontend (React / Next.js) ──
  {
    id: "react-best-practices",
    name: "React & Next.js Best Practices",
    description:
      "58 performance rules across 8 categories from Vercel Engineering — waterfalls, bundle size, SSR, re-renders, and more.",
    triggerExtensions: [".tsx", ".jsx"],
    rawUrl:
      "https://raw.githubusercontent.com/vercel-labs/agent-skills/main/skills/react-best-practices/SKILL.md",
    sourceUrl:
      "https://github.com/vercel-labs/agent-skills/blob/main/skills/react-best-practices/SKILL.md",
    maxContentLength: 6_000,
    priority: 1,
  },
  {
    id: "react-composition",
    name: "React Composition Patterns",
    description:
      "Avoid boolean-prop proliferation with compound components, state lifting, and internal composition. Includes React 19 API changes.",
    triggerExtensions: [".tsx", ".jsx"],
    rawUrl:
      "https://raw.githubusercontent.com/vercel-labs/agent-skills/main/skills/composition-patterns/SKILL.md",
    sourceUrl:
      "https://github.com/vercel-labs/agent-skills/blob/main/skills/composition-patterns/SKILL.md",
    maxContentLength: 4_000,
    priority: 2,
  },

  // ── Backend (Python) ──
  {
    id: "python-async-patterns",
    name: "Python Async & Concurrency",
    description:
      "asyncio, concurrent programming, and async/await patterns for high-performance Python — event loops, tasks, error handling.",
    triggerExtensions: [".py"],
    rawUrl:
      "https://raw.githubusercontent.com/wshobson/agents/main/plugins/python-development/skills/async-python-patterns/SKILL.md",
    sourceUrl:
      "https://github.com/wshobson/agents/blob/main/plugins/python-development/skills/async-python-patterns/SKILL.md",
    maxContentLength: 5_000,
    priority: 1,
  },
  {
    id: "python-testing",
    name: "Python Testing Patterns",
    description:
      "pytest fixtures, mocking, parameterization, TDD, and integration testing strategies for robust Python test suites.",
    triggerExtensions: [".py"],
    rawUrl:
      "https://raw.githubusercontent.com/wshobson/agents/main/plugins/python-development/skills/python-testing-patterns/SKILL.md",
    sourceUrl:
      "https://github.com/wshobson/agents/blob/main/plugins/python-development/skills/python-testing-patterns/SKILL.md",
    maxContentLength: 5_000,
    priority: 2,
  },

  // ── Backend (API Design — cross-language) ──
  {
    id: "api-design-principles",
    name: "API Design Principles",
    description:
      "REST and GraphQL design patterns — resource modeling, pagination, error handling, versioning, and DataLoader N+1 prevention.",
    triggerExtensions: [".py", ".ts", ".js", ".go", ".java", ".rb", ".rs"],
    rawUrl:
      "https://raw.githubusercontent.com/wshobson/agents/main/plugins/backend-development/skills/api-design-principles/SKILL.md",
    sourceUrl:
      "https://github.com/wshobson/agents/blob/main/plugins/backend-development/skills/api-design-principles/SKILL.md",
    maxContentLength: 5_000,
    priority: 3,
  },
];

const DIFF_FILE_HEADER = /^\+\+\+ b\/(.+)$/gm;

/**
 * Extract unique file extensions from a unified diff.
 */
export function detectExtensionsFromDiff(diff: string): Set<string> {
  const extensions = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = DIFF_FILE_HEADER.exec(diff)) !== null) {
    const filePath = match[1];
    const dotIdx = filePath.lastIndexOf(".");
    if (dotIdx !== -1) {
      extensions.add(filePath.slice(dotIdx).toLowerCase());
    }
  }

  return extensions;
}

/**
 * Collect filenames from the diff to help with secondary signal matching.
 */
export function extractFilePathsFromDiff(diff: string): string[] {
  const paths: string[] = [];
  let match: RegExpExecArray | null;
  const re = /^\+\+\+ b\/(.+)$/gm;
  while ((match = re.exec(diff)) !== null) {
    paths.push(match[1]);
  }
  return paths;
}

/**
 * Match the best skills for the detected extensions, capped at `maxSkills`.
 * Higher priority (lower number) wins. Within the same priority, registry order wins.
 */
export function matchSkills(
  extensions: Set<string>,
  maxSkills = 3
): SkillEntry[] {
  if (extensions.size === 0) return [];

  const candidates = SKILL_REGISTRY.filter((s) =>
    s.triggerExtensions.some((ext) => extensions.has(ext))
  );

  candidates.sort((a, b) => a.priority - b.priority);
  return candidates.slice(0, maxSkills);
}
