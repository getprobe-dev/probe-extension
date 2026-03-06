import { useState, useRef, useEffect } from "react";
import type {
  PostCommentRequest,
  PostCommentResponse,
  PostReviewCommentRequest,
  SubmitReviewResponse,
  ReviewPendingComment,
} from "../../shared/types";

interface CommentComposerProps {
  initialContent: string;
  owner: string;
  repo: string;
  number: number;
  focusedFile: string | null;
  fileLine: number;
  fileSide: "LEFT" | "RIGHT";
  onClose: () => void;
  onAddToReview: (comment: ReviewPendingComment) => void;
}

type PostState = "idle" | "posting" | "posted" | "added" | "error";

export function CommentComposer({
  initialContent,
  owner,
  repo,
  number,
  focusedFile,
  fileLine,
  fileSide,
  onClose,
  onAddToReview,
}: CommentComposerProps) {
  const [content, setContent] = useState(initialContent);
  const [state, setState] = useState<PostState>("idle");
  const [error, setError] = useState("");
  const [commentUrl, setCommentUrl] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
    if (textareaRef.current) {
      textareaRef.current.selectionStart = 0;
      textareaRef.current.selectionEnd = 0;
    }
  }, []);

  const handlePost = async () => {
    if (!content.trim() || state === "posting") return;
    setState("posting");
    setError("");

    try {
      let response: PostCommentResponse | SubmitReviewResponse;

      if (focusedFile) {
        const msg: PostReviewCommentRequest = {
          type: "post-review-comment",
          owner,
          repo,
          number,
          body: content.trim(),
          path: focusedFile,
          line: fileLine,
          side: fileSide,
        };
        response = await sendMessage<SubmitReviewResponse>(msg);
      } else {
        const msg: PostCommentRequest = {
          type: "post-comment",
          owner,
          repo,
          number,
          body: content.trim(),
        };
        response = await sendMessage<PostCommentResponse>(msg);
      }

      if (response.ok) {
        setState("posted");
        setCommentUrl(response.url ?? "");
        setTimeout(onClose, 2000);
      } else {
        setState("error");
        setError(response.error ?? "Failed to post comment");
      }
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Failed to post comment");
    }
  };

  const handleAddToReview = () => {
    if (!content.trim() || !focusedFile) return;
    onAddToReview({
      path: focusedFile,
      body: content.trim(),
      line: fileLine,
      side: fileSide,
      timestamp: Date.now(),
    });
    setState("added");
    setTimeout(onClose, 1500);
  };

  if (state === "posted") {
    return (
      <div className="prs-comment-composer">
        <div className="prs-comment-composer-success">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>
            {focusedFile ? "Review comment posted" : "Comment posted"}
            {commentUrl && (
              <>{" — "}<a href={commentUrl} target="_blank" rel="noopener noreferrer" className="prs-comment-composer-link">view</a></>
            )}
          </span>
        </div>
      </div>
    );
  }

  if (state === "added") {
    return (
      <div className="prs-comment-composer">
        <div className="prs-comment-composer-success">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>Added to review</span>
        </div>
      </div>
    );
  }

  const fileName = focusedFile?.split("/").pop() ?? focusedFile;

  return (
    <div className="prs-comment-composer">
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="prs-comment-composer-textarea"
        rows={6}
        disabled={state === "posting"}
        placeholder="Edit your comment before posting..."
      />

      {state === "error" && (
        <div className="prs-comment-composer-error">{error}</div>
      )}

      <div className="prs-comment-composer-actions">
        <span className="prs-comment-composer-hint">
          {focusedFile ? `On ${fileName}` : `PR #${number}`}
        </span>
        <div className="prs-flex prs-gap-2">
          <button
            onClick={onClose}
            disabled={state === "posting"}
            className="prs-comment-composer-btn prs-comment-composer-btn-cancel"
          >
            Cancel
          </button>
          {focusedFile && (
            <button
              onClick={handleAddToReview}
              disabled={!content.trim() || state === "posting"}
              className="prs-comment-composer-btn prs-comment-composer-btn-cancel"
            >
              Add to Review
            </button>
          )}
          <button
            onClick={handlePost}
            disabled={!content.trim() || state === "posting"}
            className="prs-comment-composer-btn prs-comment-composer-btn-post"
          >
            {state === "posting" ? "Posting..." : "Post Comment"}
          </button>
        </div>
      </div>
    </div>
  );
}

function sendMessage<T>(msg: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(msg, (res: T) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(res);
    });
  });
}
