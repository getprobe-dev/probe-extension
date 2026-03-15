import { ghHeaders, extractGhError, NO_TOKEN_ERROR, apiBase } from "./githubHelpers";
import type {
  PostCommentRequest,
  PostCommentResponse,
  PostReviewCommentRequest,
  SubmitReviewRequest,
  SubmitReviewResponse,
} from "../shared/types";

export async function handlePostComment(msg: PostCommentRequest): Promise<PostCommentResponse> {
  const headers = await ghHeaders();
  if (!headers) return { ok: false, error: NO_TOKEN_ERROR };

  const url = `${apiBase(msg.owner, msg.repo)}/issues/${msg.number}/comments`;
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ body: msg.body }),
  });

  if (!res.ok) return { ok: false, error: await extractGhError(res) };
  const data = await res.json();
  return { ok: true, url: data.html_url };
}

export async function handlePostReviewComment(
  msg: PostReviewCommentRequest,
): Promise<SubmitReviewResponse> {
  const headers = await ghHeaders();
  if (!headers) return { ok: false, error: NO_TOKEN_ERROR };

  const url = `${apiBase(msg.owner, msg.repo)}/pulls/${msg.number}/reviews`;
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      event: "COMMENT",
      comments: [{ path: msg.path, body: msg.body, line: msg.line, side: msg.side }],
    }),
  });

  if (!res.ok) return { ok: false, error: await extractGhError(res) };
  const data = await res.json();
  return { ok: true, url: data.html_url };
}

export async function handleSubmitReview(msg: SubmitReviewRequest): Promise<SubmitReviewResponse> {
  const headers = await ghHeaders();
  if (!headers) return { ok: false, error: NO_TOKEN_ERROR };

  const reviewBody =
    msg.body || (msg.event === "REQUEST_CHANGES" ? "Changes requested." : undefined);

  const url = `${apiBase(msg.owner, msg.repo)}/pulls/${msg.number}/reviews`;
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      body: reviewBody,
      event: msg.event,
      comments: msg.comments.map((c) => ({
        path: c.path,
        body: c.body,
        line: c.line,
        side: c.side,
      })),
    }),
  });

  if (!res.ok) return { ok: false, error: await extractGhError(res) };
  const data = await res.json();
  return { ok: true, url: data.html_url };
}
