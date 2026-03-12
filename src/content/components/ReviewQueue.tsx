import { Check, FileText, X } from "lucide-react";
import { useState } from "react";
import type {
  ReviewPendingComment,
  SubmitReviewRequest,
  SubmitReviewResponse,
} from "../../shared/types";
import { sendMessage } from "../../shared/messaging";

interface ReviewQueueProps {
  pending: ReviewPendingComment[];
  owner: string;
  repo: string;
  number: number;
  onClear: () => void;
  onRemove: (index: number) => void;
}

type SubmitState = "idle" | "submitting" | "submitted" | "error";
type ReviewEvent = "COMMENT" | "APPROVE" | "REQUEST_CHANGES";

export function ReviewQueue({ pending, owner, repo, number, onClear, onRemove }: ReviewQueueProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [body, setBody] = useState("");
  const [event, setEvent] = useState<ReviewEvent>("COMMENT");
  const [state, setState] = useState<SubmitState>("idle");
  const [error, setError] = useState("");

  if (pending.length === 0) return null;

  const handleSubmit = async () => {
    if (state === "submitting") return;
    setState("submitting");
    setError("");

    const msg: SubmitReviewRequest = {
      type: "submit-review",
      owner,
      repo,
      number,
      body: body.trim(),
      event,
      comments: pending.map((c) => ({
        path: c.path,
        body: c.body,
        line: c.line,
        side: c.side,
      })),
    };

    try {
      const res = await sendMessage<SubmitReviewResponse>(msg);

      if (res.ok) {
        setState("submitted");
        setTimeout(() => {
          onClear();
          setIsOpen(false);
          setState("idle");
          setBody("");
        }, 2000);
      } else {
        setState("error");
        setError(res.error ?? "Failed to submit review");
      }
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Failed to submit review");
    }
  };

  const eventLabel = (ev: ReviewEvent) =>
    ev === "COMMENT" ? "Comment" : ev === "APPROVE" ? "Approve" : "Changes";

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="header-btn gap-1 text-[0.68rem] font-semibold"
        title={`${pending.length} pending review comment${pending.length > 1 ? "s" : ""}`}
      >
        <FileText className="size-3" />
        <span>{pending.length}</span>
      </button>

      {isOpen && (
        <div className="review-dialog animate-fade-in">
          {state === "submitted" ? (
            <div className="flex items-center gap-2 px-4 py-5 text-sm font-medium text-navy">
              <div className="flex items-center justify-center size-5 rounded-full bg-mint/20">
                <Check className="size-3 text-navy" />
              </div>
              Review submitted
            </div>
          ) : (
            <>
              {/* Pending comments */}
              <div className="max-h-[160px] overflow-y-auto p-2 space-y-1">
                {pending.map((c, i) => (
                  <div
                    key={`${c.path}:${c.line}:${c.timestamp}`}
                    className="group flex items-start gap-2 p-2 rounded-lg bg-surface border border-border hover:border-mint/40 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="text-[0.68rem] font-semibold text-navy">
                        {c.path.split("/").pop()}
                      </span>
                      <p className="text-[0.66rem] text-muted-foreground leading-snug mt-0.5 wrap-break-word">
                        {c.body.slice(0, 100)}
                        {c.body.length > 100 ? "..." : ""}
                      </p>
                    </div>
                    <button
                      onClick={() => onRemove(i)}
                      className="shrink-0 mt-0.5 inline-flex items-center justify-center size-4 rounded opacity-0 group-hover:opacity-100 hover:bg-[#fee2e2] text-[#94a3b8] hover:text-[#ef4444] transition-all cursor-pointer"
                      title="Remove"
                    >
                      <X className="size-2.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Summary textarea */}
              <div className="px-2 pt-1 pb-2">
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="review-summary-textarea"
                  rows={2}
                  placeholder="Review summary (optional)..."
                  disabled={state === "submitting"}
                />
              </div>

              {/* Event selector */}
              <div className="mx-2 mb-2 flex rounded-lg bg-[#f1f5f9] border border-[#e2e8f0] p-0.5">
                {(["COMMENT", "APPROVE", "REQUEST_CHANGES"] as const).map((ev) => (
                  <button
                    key={ev}
                    onClick={() => setEvent(ev)}
                    className={`flex-1 py-1 rounded-md text-[0.65rem] font-semibold text-center cursor-pointer transition-all ${
                      event === ev
                        ? "bg-white text-navy shadow-sm border border-border"
                        : "text-[#94a3b8] hover:text-[#64748b] border border-transparent"
                    }`}
                  >
                    {eventLabel(ev)}
                  </button>
                ))}
              </div>

              {state === "error" && (
                <div className="mx-2 mb-2 px-2.5 py-1.5 text-[0.68rem] text-[#ef4444] bg-[#fef2f2] border border-[#fecaca] rounded-lg">
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between px-2 pb-2 gap-2">
                <button
                  onClick={() => {
                    onClear();
                    setIsOpen(false);
                  }}
                  className="review-discard-btn"
                >
                  Discard All
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={state === "submitting"}
                  className="review-submit-btn"
                >
                  {state === "submitting" ? (
                    <span className="inline-flex items-center gap-1.5">
                      Submitting
                      <span className="flex gap-0.5">
                        <span className="size-1 rounded-full bg-current animate-pulse" />
                        <span className="size-1 rounded-full bg-current animate-pulse" style={{ animationDelay: "0.15s" }} />
                        <span className="size-1 rounded-full bg-current animate-pulse" style={{ animationDelay: "0.3s" }} />
                      </span>
                    </span>
                  ) : `Submit Review (${pending.length})`}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
