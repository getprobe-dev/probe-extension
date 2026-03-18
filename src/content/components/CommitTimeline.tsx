import { useState } from "react";
import type { CommitDetail } from "../../shared/types";

interface CommitTimelineProps {
  commits: CommitDetail[];
}

export function CommitTimeline({ commits }: CommitTimelineProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (commits.length === 0) return null;

  const maxChange = Math.max(...commits.map((c) => c.additions + c.deletions), 1);
  const minR = 4;
  const maxR = 10;

  const paddingX = maxR + 2;
  const svgWidth = 340;
  const svgHeight = 72;
  const usableWidth = svgWidth - paddingX * 2;
  const centerY = svgHeight / 2;
  const step = commits.length > 1 ? usableWidth / (commits.length - 1) : 0;

  const getX = (i: number) => paddingX + (commits.length === 1 ? usableWidth / 2 : i * step);
  const getR = (c: CommitDetail) => {
    const total = c.additions + c.deletions;
    return minR + (total / maxChange) * (maxR - minR);
  };

  return (
    <div className="dash-card p-3 space-y-1.5">
      <h4 className="text-[0.65rem] font-semibold text-muted-foreground uppercase tracking-wider">
        Commits
      </h4>
      <div className="relative">
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full" style={{ height: "72px" }}>
          {/* Spine line */}
          <line
            x1={getX(0)}
            y1={centerY}
            x2={getX(commits.length - 1)}
            y2={centerY}
            stroke="#94a3b8"
            strokeWidth={1.5}
            strokeLinecap="round"
            opacity={0.3}
          />

          {/* Per-commit segments colored by add/del ratio */}
          {commits.map((c, i) => {
            if (i === 0) return null;
            const total = c.additions + c.deletions;
            const addRatio = total > 0 ? c.additions / total : 0.5;
            const r = Math.round(220 - addRatio * 186);
            const g = Math.round(100 + addRatio * 134);
            const b = Math.round(100 + addRatio * 112);
            return (
              <line
                key={`seg-${c.sha}`}
                x1={getX(i - 1)}
                y1={centerY}
                x2={getX(i)}
                y2={centerY}
                stroke={`rgb(${r},${g},${b})`}
                strokeWidth={1.5}
                strokeLinecap="round"
                opacity={0.5}
              />
            );
          })}

          {/* Dots */}
          {commits.map((c, i) => {
            const cx = getX(i);
            const r = getR(c);
            const isLatest = i === commits.length - 1;
            const isHovered = hoveredIdx === i;
            const total = c.additions + c.deletions;
            const addRatio = total > 0 ? c.additions / total : 0.5;
            const fillG = Math.round(180 + addRatio * 54);
            const fill = total === 0 ? "#94a3b8" : `rgb(34,${fillG},180)`;

            return (
              <g key={c.sha}>
                {isLatest && (
                  <circle
                    cx={cx}
                    cy={centerY}
                    r={r + 4}
                    fill="none"
                    stroke="#5eead4"
                    strokeWidth={1.5}
                    opacity={0.35}
                  >
                    <animate
                      attributeName="r"
                      values={`${r + 3};${r + 6};${r + 3}`}
                      dur="2s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      values="0.35;0.12;0.35"
                      dur="2s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}
                {isHovered && (
                  <circle
                    cx={cx}
                    cy={centerY}
                    r={r + 3}
                    fill="none"
                    stroke="#5eead4"
                    strokeWidth={1}
                    opacity={0.5}
                  />
                )}
                <circle
                  cx={cx}
                  cy={centerY}
                  r={isHovered ? r + 1 : r}
                  fill={isLatest ? "#5eead4" : fill}
                  opacity={isHovered ? 1 : 0.85}
                  style={{ cursor: "pointer", transition: "r 0.15s, opacity 0.15s" }}
                  onMouseEnter={() => setHoveredIdx(i)}
                  onMouseLeave={() => setHoveredIdx(null)}
                />
              </g>
            );
          })}
        </svg>

        {hoveredIdx !== null && (
          <div
            className="absolute bg-[#1a2e2b] text-white rounded-lg px-2.5 py-1.5 text-[0.65rem] leading-snug shadow-lg pointer-events-none max-w-[240px] z-10"
            style={{
              left: `${Math.min(Math.max((getX(hoveredIdx) / svgWidth) * 100, 15), 85)}%`,
              transform: "translateX(-50%)",
              bottom: "calc(100% - 4px)",
            }}
          >
            <div className="font-medium truncate">{commits[hoveredIdx].message.split("\n")[0]}</div>
            <div className="flex items-center gap-2 mt-0.5 text-white/60">
              <span>{commits[hoveredIdx].author}</span>
              <span className="text-[#5eead4]">+{commits[hoveredIdx].additions}</span>
              <span className="text-[#f87171]">−{commits[hoveredIdx].deletions}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
