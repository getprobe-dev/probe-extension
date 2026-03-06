import { useState, useRef, useEffect } from "react";
import { Check } from "lucide-react";
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
      <div className="comment-composer">
        <div className="flex items-center gap-1.5 p-3 text-sm font-medium text-emerald-600">
          <Check className="size-3.5" />
          <span>
            {focusedFile ? "Review comment posted" : "Comment posted"}
            {commentUrl && (
              <>{" \u2014 "}<a href={commentUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 hover:text-primary/80">view</a></>
            )}
          </span>
        </div>
      </div>
    );
  }

  if (state === "added") {
    return (
      <div className="comment-composer">
        <div className="flex items-center gap-1.5 p-3 text-sm font-medium text-emerald-600">
          <Check className="size-3.5" />
          <span>Added to review</span>
        </div>
      </div>
    );
  }

  const fileName = focusedFile?.split("/").pop() ?? focusedFile;

  return (
    <div className="comment-composer">
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="comment-composer-textarea"
        rows={6}
        disabled={state === "posting"}
        placeholder="Edit your comment before posting..."
      />

      {state === "error" && (
        <div className="px-3 py-1.5 text-xs text-destructive bg-destructive/10 border-t border-destructive/20">
          {error}
        </div>
      )}

      <div className="p-2.5 border-t border-border/50 bg-background space-y-2">
        <span className="block text-[0.68rem] text-muted-foreground truncate">
          {focusedFile ? `On ${fileName}` : `PR #${number}`}
        </span>
        <div className="flex justify-end gap-1.5">
          <button
            onClick={onClose}
            disabled={state === "posting"}
            className="composer-secondary-btn"
          >
            Cancel
          </button>
          {focusedFile && (
            <button
              onClick={handleAddToReview}
              disabled={!content.trim() || state === "posting"}
              className="composer-secondary-btn"
            >
              Add to Review
            </button>
          )}
          <button
            onClick={handlePost}
            disabled={!content.trim() || state === "posting"}
            className="review-submit-btn"
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
    try {
      chrome.runtime.sendMessage(msg, (res: T) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(res);
      });
    } catch {
      reject(new Error("Extension context invalidated. Please refresh the page."));
    }
  });
}
