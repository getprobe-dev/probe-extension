import { memo, useEffect, useMemo, useRef, useState } from "react";
import { CommitTimeline } from "./CommitTimeline";
import { DashboardSkeleton } from "./DashboardSkeleton";
import { formatNumber, timeAgo } from "../utils/format";
import type {
  PRContext,
  PRStats,
  FetchPRStatsResponse,
  GeneratePRSummaryResponse,
  PromptSuggestion,
} from "../../shared/types";

interface PRDashboardProps {
  prContext: PRContext;
  onSummaryLoading?: () => void;
  onSummaryReady?: (bullets: PromptSuggestion[]) => void;
}

const REVIEW_STATE_LABELS: Record<string, string> = {
  APPROVED: "Approved",
  CHANGES_REQUESTED: "Changes requested",
  COMMENTED: "Commented",
  DISMISSED: "Dismissed",
  PENDING: "Pending",
};

const REVIEW_STATE_COLORS: Record<string, string> = {
  APPROVED: "text-[#16a34a]",
  CHANGES_REQUESTED: "text-[#dc2626]",
};

function StatCard({ value, label }: { value: number; label: string }) {
  return (
    <div className="dash-card p-3 text-center">
      <div className="text-xl font-bold text-foreground tracking-tight">{formatNumber(value)}</div>
      <div className="text-[0.6rem] text-muted-foreground uppercase tracking-wider mt-0.5">
        {label}
      </div>
    </div>
  );
}

export const PRDashboard = memo(function PRDashboard({
  prContext,
  onSummaryLoading,
  onSummaryReady,
}: PRDashboardProps) {
  const [stats, setStats] = useState<PRStats | null>(null);
  const [loading, setLoading] = useState(true);

  const onSummaryLoadingRef = useRef(onSummaryLoading);
  const onSummaryReadyRef = useRef(onSummaryReady);
  useEffect(() => {
    onSummaryLoadingRef.current = onSummaryLoading;
    onSummaryReadyRef.current = onSummaryReady;
  }, [onSummaryLoading, onSummaryReady]);

  useEffect(() => {
    let cancelled = false;

    chrome.runtime.sendMessage(
      {
        type: "fetch-pr-stats",
        owner: prContext.owner,
        repo: prContext.repo,
        number: prContext.number,
      },
      (res: FetchPRStatsResponse) => {
        if (cancelled) return;
        if (res?.ok && res.stats) {
          setStats(res.stats);
          onSummaryLoadingRef.current?.();
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
                onSummaryReadyRef.current?.(sumRes.bullets);
              }
            },
          );
        }
        setLoading(false);
      },
    );

    return () => {
      cancelled = true;
    };
  }, [prContext.owner, prContext.repo, prContext.number, prContext.title, prContext.description]);

  const topFiles = useMemo(
    () =>
      stats
        ? [...stats.files]
            .sort((a, b) => b.additions + b.deletions - (a.additions + a.deletions))
            .slice(0, 5)
        : [],
    [stats],
  );
  const maxFileChange = useMemo(
    () => (topFiles.length > 0 ? topFiles[0].additions + topFiles[0].deletions : 1),
    [topFiles],
  );

  if (loading) return <DashboardSkeleton />;

  if (!stats) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <p className="text-xs text-muted-foreground text-center leading-relaxed">
          Couldn't load PR stats. Check that your GitHub token has{" "}
          <code className="text-[0.65rem] bg-muted px-1 py-0.5 rounded-md font-medium">repo</code>{" "}
          scope and try refreshing the page.
        </p>
      </div>
    );
  }

  const totalLines = stats.additions + stats.deletions;
  const addPct = totalLines > 0 ? (stats.additions / totalLines) * 100 : 50;

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 animate-fade-in">
      <div className="grid grid-cols-3 gap-2">
        <StatCard value={stats.changedFiles} label="files" />
        <StatCard value={totalLines} label="lines" />
        <StatCard value={stats.comments} label="comments" />
      </div>

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

      {stats.commitDetails.length > 0 && <CommitTimeline commits={stats.commitDetails} />}

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
          <span className="text-[0.7rem] font-medium text-foreground">{stats.author.login}</span>
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
                <span
                  key={a.login}
                  className="inline-flex items-center gap-1 text-[0.65rem] text-foreground"
                >
                  {a.avatarUrl && (
                    <img src={a.avatarUrl} alt={a.login} className="size-4 rounded-full" />
                  )}
                  {a.login}
                </span>
              ))}
          </div>
        )}
        {stats.reviewers.length > 0 && (
          <div className="space-y-1 pt-1 border-t border-border/50">
            {stats.reviewers.map((r) => (
              <div key={r.login} className="flex items-center gap-2">
                {r.avatarUrl && (
                  <img src={r.avatarUrl} alt={r.login} className="size-4 rounded-full shrink-0" />
                )}
                <span className="text-[0.7rem] text-foreground">{r.login}</span>
                <span
                  className={`text-[0.6rem] ml-auto ${REVIEW_STATE_COLORS[r.state] ?? "text-muted-foreground"}`}
                >
                  {REVIEW_STATE_LABELS[r.state] ?? r.state}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

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
    </div>
  );
});
