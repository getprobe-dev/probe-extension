import { useState } from "react";
import type { ReviewPendingComment, SubmitReviewRequest, SubmitReviewResponse } from "../../shared/types";

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
      const res = await new Promise<SubmitReviewResponse>((resolve, reject) => {
        chrome.runtime.sendMessage(msg, (r: SubmitReviewResponse) => {
          if (chrome.runtime.lastError) { reject(new Error(chrome.runtime.lastError.message)); return; }
          resolve(r);
        });
      });

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

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="prs-review-badge"
        title={`${pending.length} pending review comment${pending.length > 1 ? "s" : ""}`}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
        <span>{pending.length}</span>
      </button>

      {isOpen && (
        <div className="prs-review-dialog">
          <div className="prs-review-dialog-header">
            <span className="prs-text-sm prs-font-semibold">
              {state === "submitted" ? "Review submitted" : "Submit Review"}
            </span>
            <button onClick={() => setIsOpen(false)} className="prs-msg-action-btn" title="Close">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {state === "submitted" ? (
            <div className="prs-comment-composer-success" style={{ padding: "16px" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>Review submitted successfully</span>
            </div>
          ) : (
            <>
              <div className="prs-review-comments-list">
                {pending.map((c, i) => (
                  <div key={i} className="prs-review-comment-item">
                    <div className="prs-review-comment-file">
                      {c.path.split("/").pop()}
                      <button
                        onClick={() => onRemove(i)}
                        className="prs-review-comment-remove"
                        title="Remove"
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                    <div className="prs-review-comment-body">{c.body.slice(0, 120)}{c.body.length > 120 ? "..." : ""}</div>
                  </div>
                ))}
              </div>

              <div className="prs-review-body-section">
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="prs-comment-composer-textarea"
                  rows={3}
                  placeholder="Overall review summary (optional)..."
                  disabled={state === "submitting"}
                />
              </div>

              <div className="prs-review-event-selector">
                {(["COMMENT", "APPROVE", "REQUEST_CHANGES"] as const).map((ev) => (
                  <button
                    key={ev}
                    onClick={() => setEvent(ev)}
                    className={`prs-review-event-btn ${event === ev ? "prs-review-event-btn-active" : ""}`}
                  >
                    {ev === "COMMENT" ? "Comment" : ev === "APPROVE" ? "Approve" : "Request Changes"}
                  </button>
                ))}
              </div>

              {state === "error" && (
                <div className="prs-comment-composer-error">{error}</div>
              )}

              <div className="prs-comment-composer-actions">
                <button
                  onClick={() => { onClear(); setIsOpen(false); }}
                  className="prs-comment-composer-btn prs-comment-composer-btn-cancel"
                >
                  Discard All
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={state === "submitting"}
                  className="prs-comment-composer-btn prs-comment-composer-btn-post"
                >
                  {state === "submitting" ? "Submitting..." : `Submit Review (${pending.length})`}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
