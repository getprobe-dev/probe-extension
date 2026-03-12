import {
  detectExtensionsFromDiff,
  matchSkills,
  type SkillEntry,
  type ResolvedSkill,
} from "../shared/skills";

const SKILL_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 h

interface CachedSkill {
  content: string;
  fetchedAt: number;
}

function stripYamlFrontmatter(md: string): string {
  return md.replace(/^---[\s\S]*?---\s*/, "");
}

async function fetchSkillContent(skill: SkillEntry): Promise<string | null> {
  const cacheKey = `skill:${skill.id}`;

  const cached = await new Promise<CachedSkill | null>((resolve) => {
    chrome.storage.local.get([cacheKey], (result) => {
      const data = result[cacheKey] as CachedSkill | undefined;
      if (data && Date.now() - data.fetchedAt < SKILL_CACHE_TTL) {
        resolve(data);
      } else {
        resolve(null);
      }
    });
  });

  if (cached) return cached.content;

  try {
    const res = await fetch(skill.rawUrl);
    if (!res.ok) return null;

    let content = stripYamlFrontmatter(await res.text());

    if (content.length > skill.maxContentLength) {
      const cutoff = content.lastIndexOf("\n", skill.maxContentLength);
      content =
        content.slice(0, cutoff > 0 ? cutoff : skill.maxContentLength) +
        "\n\n… [truncated for brevity]";
    }

    chrome.storage.local.set({
      [cacheKey]: { content, fetchedAt: Date.now() } satisfies CachedSkill,
    });

    return content;
  } catch {
    return null;
  }
}

export async function resolveSkillsForDiff(diff: string): Promise<ResolvedSkill[]> {
  const extensions = detectExtensionsFromDiff(diff);
  const matched = matchSkills(extensions);
  if (matched.length === 0) return [];

  const results = await Promise.all(
    matched.map(async (skill) => {
      const content = await fetchSkillContent(skill);
      return content
        ? { name: skill.name, content, sourceUrl: skill.sourceUrl, description: skill.description }
        : null;
    }),
  );

  return results.filter((r): r is ResolvedSkill => r !== null);
}
