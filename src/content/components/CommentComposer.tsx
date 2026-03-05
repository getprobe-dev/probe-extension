import { useState, useRef, useEffect } from "react";
import type { PostCommentRequest, PostCommentResponse } from "../../shared/types";

interface CommentComposerProps {
  initialContent: string;
  owner: string;
  repo: string;
  number: number;
  onClose: () => void;
}

type PostState = "idle" | "posting" | "posted" | "error";

export function CommentComposer({
  initialContent,
  owner,
  repo,
  number,
  onClose,
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

    const msg: PostCommentRequest = {
      type: "post-comment",
      owner,
      repo,
      number,
      body: content.trim(),
    };

    try {
      const response = await new Promise<PostCommentResponse>((resolve, reject) => {
        chrome.runtime.sendMessage(msg, (res: PostCommentResponse) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          resolve(res);
        });
      });

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

  if (state === "posted") {
    return (
      <div className="prs-comment-composer">
        <div className="prs-comment-composer-success">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>
            Comment posted
            {commentUrl && (
              <>
                {" — "}
                <a
                  href={commentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="prs-comment-composer-link"
                >
                  view
                </a>
              </>
            )}
          </span>
        </div>
      </div>
    );
  }

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
          Posting to PR #{number}
        </span>
        <div className="prs-flex prs-gap-2">
          <button
            onClick={onClose}
            disabled={state === "posting"}
            className="prs-comment-composer-btn prs-comment-composer-btn-cancel"
          >
            Cancel
          </button>
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
