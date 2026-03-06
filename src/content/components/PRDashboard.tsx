import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import type { PRContext, PRStats, FetchPRStatsResponse, GeneratePRSummaryResponse } from "../../shared/types";
import { getIconUrl } from "../utils/theme";

interface PRDashboardProps {
  prContext: PRContext;
  onSummaryReady?: (bullets: string[]) => void;
}

function formatNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

const REVIEW_STATE_LABELS: Record<string, string> = {
  APPROVED: "Approved",
  CHANGES_REQUESTED: "Changes requested",
  COMMENTED: "Commented",
  DISMISSED: "Dismissed",
  PENDING: "Pending",
};

export function PRDashboard({ prContext, onSummaryReady }: PRDashboardProps) {
  const [stats, setStats] = useState<PRStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<string[] | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    chrome.runtime.sendMessage(
      { type: "fetch-pr-stats", owner: prContext.owner, repo: prContext.repo, number: prContext.number },
      (res: FetchPRStatsResponse) => {
        if (cancelled) return;
        if (res?.ok && res.stats) {
          setStats(res.stats);
          setSummaryLoading(true);
          chrome.runtime.sendMessage(
            {
              type: "generate-pr-summary",
              owner: prContext.owner,
              repo: prContext.repo,
              number: prContext.number,
              title: prContext.title,
              description: prContext.description,
              stats: res.stats,
            },
            (sumRes: GeneratePRSummaryResponse) => {
              if (cancelled) return;
              if (sumRes?.ok && sumRes.bullets) {
                setSummary(sumRes.bullets);
                onSummaryReady?.(sumRes.bullets);
              }
              setSummaryLoading(false);
            }
          );
        }
        setLoading(false);
      }
    );

    return () => { cancelled = true; };
  }, [prContext.owner, prContext.repo, prContext.number]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <img
          src={getIconUrl(128)}
          alt="PRobe"
          className="size-14 rounded-2xl animate-logo-pulse"
        />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <p className="text-xs text-muted-foreground text-center">
          Add a GitHub token for rich PR stats.
        </p>
      </div>
    );
  }

  const totalLines = stats.additions + stats.deletions;
  const addPct = totalLines > 0 ? (stats.additions / totalLines) * 100 : 50;

  const topFiles = [...stats.files]
    .sort((a, b) => (b.additions + b.deletions) - (a.additions + a.deletions))
    .slice(0, 5);
  const maxFileChange = topFiles.length > 0 ? topFiles[0].additions + topFiles[0].deletions : 1;

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 animate-fade-in">
      {/* Stats row: files, lines, comments */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard value={stats.changedFiles} label="files" />
        <StatCard value={totalLines} label="lines" />
        <StatCard value={stats.comments} label="comments" />
      </div>

      {/* Additions / deletions bar */}
      <div className="dash-card p-3">
        <div className="flex items-center justify-between text-[0.65rem] font-medium mb-1.5">
          <span className="text-[#16a34a]">+{formatNumber(stats.additions)}</span>
          <span className="text-[#dc2626]">−{formatNumber(stats.deletions)}</span>
        </div>
        <div className="h-2 rounded-full bg-[#fecaca] overflow-hidden flex">
          <div
            className="h-full bg-[#5eead4] rounded-full transition-all"
            style={{ width: `${addPct}%` }}
          />
        </div>
      </div>

      {/* People */}
      <div className="dash-card p-3 space-y-2">
        <h4 className="text-[0.65rem] font-semibold text-muted-foreground uppercase tracking-wider">
          People
        </h4>
        <div className="flex items-center gap-2">
          {stats.author.avatarUrl && (
            <img
              src={stats.author.avatarUrl}
              alt={stats.author.login}
              className="size-5 rounded-full ring-2 ring-[#5eead4]/30 shrink-0"
            />
          )}
          <span className="text-[0.7rem] font-medium text-foreground">
            {stats.author.login}
          </span>
          <span className="text-[0.6rem] text-[#5eead4] font-medium bg-[#5eead4]/10 px-1.5 py-0.5 rounded">
            author
          </span>
          {stats.createdAt && (
            <span className="text-[0.6rem] text-muted-foreground ml-auto">
              {timeAgo(stats.createdAt)}
            </span>
          )}
        </div>
        {stats.commitAuthors.length > 1 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[0.6rem] text-muted-foreground">Co-authors:</span>
            {stats.commitAuthors
              .filter((a) => a.login !== stats.author.login)
              .map((a) => (
                <span key={a.login} className="inline-flex items-center gap-1 text-[0.65rem] text-foreground">
                  {a.avatarUrl && <img src={a.avatarUrl} alt={a.login} className="size-4 rounded-full" />}
                  {a.login}
                </span>
              ))}
          </div>
        )}
        {stats.reviewers.length > 0 && (
          <div className="space-y-1 pt-1 border-t border-border/50">
            {stats.reviewers.map((r) => (
              <div key={r.login} className="flex items-center gap-2">
                {r.avatarUrl && <img src={r.avatarUrl} alt={r.login} className="size-4 rounded-full shrink-0" />}
                <span className="text-[0.7rem] text-foreground">{r.login}</span>
                <span className={`text-[0.6rem] ml-auto ${
                  r.state === "APPROVED" ? "text-[#16a34a]"
                  : r.state === "CHANGES_REQUESTED" ? "text-[#dc2626]"
                  : "text-muted-foreground"
                }`}>
                  {REVIEW_STATE_LABELS[r.state] ?? r.state}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top changed files */}
      {topFiles.length > 0 && (
        <div className="dash-card p-3 space-y-1.5">
          <h4 className="text-[0.65rem] font-semibold text-muted-foreground uppercase tracking-wider">
            Most changed
          </h4>
          {topFiles.map((f) => {
            const name = f.filename.split("/").pop() ?? f.filename;
            const total = f.additions + f.deletions;
            return (
              <div key={f.filename} className="flex items-center gap-2 text-[0.7rem]">
                <span className="flex-1 truncate font-mono text-foreground" title={f.filename}>
                  {name}
                </span>
                <div className="w-16 h-1.5 rounded-full bg-border overflow-hidden shrink-0">
                  <div
                    className="h-full rounded-full bg-[#5eead4]"
                    style={{ width: `${(total / maxFileChange) * 100}%` }}
                  />
                </div>
                <span className="w-10 text-right text-muted-foreground shrink-0">
                  +{f.additions}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* AI suggested prompts loading indicator */}
      {summaryLoading && (
        <div className="dash-card p-3 border-l-2 border-l-[#5eead4]">
          <div className="flex items-center gap-2 py-1">
            <Sparkles className="size-3 text-[#5eead4]" />
            <div className="size-3 border border-[#5eead4]/30 border-t-[#5eead4] rounded-full animate-spin" />
            <span className="text-[0.7rem] text-muted-foreground">Generating suggested prompts…</span>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ value, label }: { value: number; label: string }) {
  return (
    <div className="dash-card p-3 text-center">
      <div className="text-xl font-bold text-foreground tracking-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>
        {formatNumber(value)}
      </div>
      <div className="text-[0.6rem] text-muted-foreground uppercase tracking-wider mt-0.5">{label}</div>
    </div>
  );
}
