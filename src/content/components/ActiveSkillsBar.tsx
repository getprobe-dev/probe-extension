import { Zap, ExternalLink } from "lucide-react";
import type { SkillIndicator } from "../../shared/types";

interface ActiveSkillsBarProps {
  skills: SkillIndicator[];
}

export function ActiveSkillsBar({ skills }: ActiveSkillsBarProps) {
  if (skills.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#15231f] border-b border-mint/10 overflow-x-auto shrink-0">
      <Zap className="size-3 text-mint shrink-0" />
      {skills.map((skill) => (
        <a
          key={skill.name}
          href={skill.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          title={skill.description}
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-mint/15 text-mint whitespace-nowrap hover:bg-mint/25 transition-colors cursor-pointer"
        >
          {skill.name}
          <ExternalLink className="size-2.5" />
        </a>
      ))}
    </div>
  );
}
