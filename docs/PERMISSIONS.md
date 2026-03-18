# PRobe Extension Permissions Reference

This document provides a granular, line-level justification for every permission,
host permission, content script match pattern, and web-accessible resource declared
in `manifest.json`. Every entry maps to specific code paths. Nothing is declared
speculatively or for future use.

Use this file when:
- Auditing permissions before a Chrome Web Store submission.
- Responding to a CWS reviewer inquiry.
- Evaluating whether a future feature requires a new permission.

---

## Permissions (`"permissions"`)

### `storage`

**What it grants:** Access to `chrome.storage.sync` and `chrome.storage.local`.

**Why it is required:**

`chrome.storage.sync` — persists user configuration across devices:
- `src/background/githubHelpers.ts` `ghHeaders()`: reads `GITHUB_TOKEN` to authenticate GitHub API calls.
- `src/background/llmService.ts` `getSettings()`: reads `API_KEY`, `LLM_PROVIDER`, `MODEL_NAME`, and `PROXY_URL` to configure LLM API calls.
- `src/popup/App.tsx`: reads and writes all settings from the popup.

`chrome.storage.local` — persists per-PR state locally on the device:
- `src/content/components/ChatPanel.tsx` `persistMessages()` / `persistReview()`: reads and writes per-PR chat history and pending review comments.
- `src/background/skillResolver.ts` lines 23, 48: reads and writes the 24-hour skill content cache, keyed by skill ID.

**What breaks without it:** Chat history is lost on every page reload. API keys must be re-entered every session. The skill cache always fetches from the network, ignoring the 24-hour TTL.

**Why `chrome.storage` rather than `localStorage`:** Content scripts and background service workers share the same `chrome.storage` namespace, which makes it the only mechanism for sharing settings between the popup, background worker, and content script. `localStorage` is origin-scoped to the page and not accessible from the background worker.

---

## Host Permissions (`"host_permissions"`)

### `https://github.com/*/*/pull/*`

**What it grants:** The background service worker can `fetch()` URLs matching this pattern. The content script `matches` field (see below) uses the same pattern to control injection.

**Why it is required:**

`src/background/index.ts` line 50:
```typescript
const url = `https://github.com/${msg.owner}/${msg.repo}/pull/${msg.number}.diff`;
fetch(url)
```
The unified `.diff` file is not available through the GitHub REST API — it is only served at this URL. It is the foundation of every review feature: all AI context, focused-file diffs, and line-level discussions derive from this fetch.

**Why this exact pattern:** The path `/*/*/pull/*` is `/{owner}/{repo}/pull/{number}`. It restricts access to pull request URLs only. The extension never accesses github.com root, profile pages, repo pages, or any other path.

**What breaks without it:** The background worker cannot fetch the PR diff. The entire extension stops functioning.

---

### `https://patch-diff.githubusercontent.com/raw/*`

**What it grants:** The background service worker can `fetch()` URLs under the `/raw/` path on `patch-diff.githubusercontent.com`.

**Why it is required:**

`src/background/index.ts` line 50:
```typescript
const url = `https://github.com/${msg.owner}/${msg.repo}/pull/${msg.number}.diff`;
fetch(url)
```
GitHub's PR `.diff` URLs 302-redirect to `https://patch-diff.githubusercontent.com/raw/{owner}/{repo}/pull/{number}.diff` as the actual delivery CDN. The redirect target always starts with `/raw/`.

**Why `/raw/*` rather than `/*`:** Every observed redirect lands under `/raw/`. Restricting to this path prefix excludes any other content that may exist on this CDN host, applying the same path-narrowing strategy used for `api.github.com/repos/*`.

**Why this exact subdomain and not `*.githubusercontent.com/*`:** The previous manifest used the wildcard `*.githubusercontent.com/*`, which granted access to every subdomain including `avatars.githubusercontent.com`, `codeload.githubusercontent.com`, `objects.githubusercontent.com`, and others. Only two subdomains are actually used: `patch-diff` (here) and `raw` (below). Explicitly listing both is strictly narrower than the wildcard.

**What breaks without it:** The diff cannot be fetched. The entire extension becomes non-functional — no chat, no review, no PR dashboard.

---

### `https://raw.githubusercontent.com/*`

**What it grants:** The background service worker can `fetch()` any URL on `raw.githubusercontent.com`.

**Why it is required:**

Two fetch patterns use this host, both directly serving the extension's core purpose of producing high-quality AI code reviews:

1. **Raw file content for focused-file review** — `src/background/index.ts` line 61:
```typescript
const url = `https://raw.githubusercontent.com/${msg.owner}/${msg.repo}/${msg.branch}/${path}`;
fetch(url)
```
When a user focuses on a specific file, the extension fetches its full content so the AI has complete context beyond the diff hunks. The path includes owner, repo, branch, and file path — all dynamic values unknown at manifest-declaration time.

2. **Full head-branch file content for enriched context** — `src/background/githubEnrichedContext.ts` line 221:
```typescript
const rawBase = `https://raw.githubusercontent.com/${msg.owner}/${msg.repo}/${headSha}`;
```
When enriched context is loaded, the extension fetches the complete content of every changed file (up to a 400K char budget) to give the AI full visibility into imports, types, and surrounding code.

3. **Review skill knowledge** — `src/background/skillResolver.ts` (via `fetchSkillContent`):
The extension's review quality depends on domain-specific knowledge (e.g., React performance patterns, Python async best practices, API design principles). These "skills" are curated `SKILL.md` files hosted in public GitHub repositories (`vercel-labs/agent-skills`, `wshobson/agents`) and registered in `src/shared/skills.ts`. Skills are matched to a PR based on the file extensions present in its diff, fetched on demand, and cached locally for 24 hours via `chrome.storage.local`. The fetched content is injected into the AI system prompt so reviews cite specific, authoritative guidelines rather than generic advice.

**Why `/*` rather than a narrower path:** All three uses require arbitrary `/{owner}/{repo}/{ref}/{path}` combinations that are unknown at build time. No narrower path prefix covers the reviewed repository's files, the enriched context files, and the skill source repositories. The host itself (`raw.githubusercontent.com`) is a read-only content delivery endpoint with no authenticated write operations, no user data exposure, and no side effects.

**What breaks without it:** Focused-file context is unavailable — the AI only sees diff hunks, not full file context. Enriched context loses full file content. Review skills cannot be loaded — the AI produces generic reviews without domain-specific guidance. All three directly degrade the extension's core value proposition.

---

### `https://api.github.com/repos/*/*/pulls/*`

**What it grants:** The background service worker can make authenticated `fetch()` calls to GitHub REST API pull request endpoints.

**Why it is required:**

| Handler | File | Endpoint | Purpose |
|---|---|---|---|
| `handlePostReviewComment` | `githubComments.ts` | `POST /repos/{o}/{r}/pulls/{n}/reviews` | Post an inline review comment |
| `handleSubmitReview` | `githubComments.ts` | `POST /repos/{o}/{r}/pulls/{n}/reviews` | Submit a full review (Comment / Approve / Request Changes) |
| `handleFetchEnrichedContext` | `githubEnrichedContext.ts` | `GET /repos/{o}/{r}/pulls/{n}` | Fetch PR metadata (title, description, merge status, labels) |
| `handleFetchEnrichedContext` | `githubEnrichedContext.ts` | `GET /repos/{o}/{r}/pulls/{n}/commits` | Fetch commit list for enriched context |
| `handleFetchEnrichedContext` | `githubEnrichedContext.ts` | `GET /repos/{o}/{r}/pulls/{n}/reviews` | Fetch reviewer states for enriched context |
| `handleFetchEnrichedContext` | `githubEnrichedContext.ts` | `GET /repos/{o}/{r}/pulls/{n}/comments` | Fetch inline review comments |
| `handleFetchEnrichedContext` | `githubEnrichedContext.ts` | `GET /repos/{o}/{r}/pulls/{n}/files` | Fetch changed files list |
| `handleFetchPRStats` | `githubStats.ts` | `GET /repos/{o}/{r}/pulls/{n}` | Fetch PR metadata for dashboard |
| `handleFetchPRStats` | `githubStats.ts` | `GET /repos/{o}/{r}/pulls/{n}/files` | Fetch per-file change stats |
| `handleFetchPRStats` | `githubStats.ts` | `GET /repos/{o}/{r}/pulls/{n}/commits` | Fetch commit list for dashboard |
| `handleFetchPRStats` | `githubStats.ts` | `GET /repos/{o}/{r}/pulls/{n}/reviews` | Fetch reviewer states for dashboard |

**What breaks without it:** Review submission fails. PR metadata, file stats, commit list, and reviewer states cannot load. Both the enriched AI context and the PR dashboard become non-functional.

---

### `https://api.github.com/repos/*/*/issues/*`

**What it grants:** The background service worker can make authenticated `fetch()` calls to individual issue endpoints on the GitHub REST API.

**Why it is required:**

| Handler | File | Endpoint | Purpose |
|---|---|---|---|
| `handleFetchEnrichedContext` | `githubEnrichedContext.ts` | `GET /repos/{o}/{r}/issues/{n}` | Fetch linked issue details (title, body) |

When a PR description references issues (e.g. "Closes #42", "Fixes #17"), the extension resolves each reference by fetching the issue's title and body. This context is included in the AI system prompt so the model understands *why* the PR exists, not just *what* it changes.

**Why this is separate from `/issues/*/comments`:** The bare `/issues/{n}` endpoint returns the issue itself (title, body, labels). The `/issues/{n}/comments` endpoint (below) returns the comment thread. These are different API resources with different URL paths and serve different purposes.

**What breaks without it:** Linked issues referenced in the PR description cannot be resolved. The AI loses context about the motivation and requirements behind the PR.

---

### `https://api.github.com/repos/*/*/issues/*/comments`

**What it grants:** The background service worker can read and post PR-level comments via the GitHub Issues API.

**Why it is required:**

| Handler | File | Endpoint | Purpose |
|---|---|---|---|
| `handlePostComment` | `githubComments.ts` | `POST /repos/{o}/{r}/issues/{n}/comments` | Post a PR-level comment |
| `handleFetchEnrichedContext` | `githubEnrichedContext.ts` | `GET /repos/{o}/{r}/issues/{n}/comments` | Fetch PR-level discussion comments for enriched context |

GitHub models PR comments through the Issues API (`/issues/{number}/comments`), not the Pulls API. This requires a separate host permission pattern because the path contains `/issues/` rather than `/pulls/`.

**What breaks without it:** The "Post comment" action in the chat panel fails. PR-level discussion comments are not included in the enriched AI context.

---

### `https://api.github.com/repos/*/*/commits/*`

**What it grants:** The background service worker can fetch per-commit statistics from the GitHub Commits API.

**Why it is required:**

| Handler | File | Endpoint | Purpose |
|---|---|---|---|
| `handleFetchPRStats` | `githubStats.ts` | `GET /repos/{o}/{r}/commits/{sha}` | Fetch per-commit stats (additions, deletions) |
| `handleFetchEnrichedContext` | `githubEnrichedContext.ts` | `GET /repos/{o}/{r}/commits/{sha}/check-runs` | Fetch CI check status for the head commit |

The PR dashboard shows per-commit change statistics in the commit timeline. The enriched context includes CI check status. These endpoints are under `/commits/{sha}`, which is not covered by the `/pulls/*` pattern.

**What breaks without it:** Per-commit stats in the PR dashboard show as unavailable. CI check status is excluded from the enriched AI context.

---

**Why separate patterns rather than `/repos/*`:** The previous pattern `repos/*` granted access to every endpoint under `/repos/`, including destructive operations the extension never uses (e.g. `DELETE /repos/{o}/{r}`, `PUT /repos/{o}/{r}/collaborators/{username}`, `POST /repos/{o}/{r}/hooks`). Splitting into the four endpoint families actually used — `pulls`, `issues`, `issues/*/comments`, and `commits` — ensures the host permission cannot reach repository settings, webhooks, collaborators, branch protection, or any other administrative endpoint. Note: Chrome's `*` wildcard matches across `/` separators, so each pattern still requires its literal path segment (`/pulls/`, `/issues/`, `/commits/`) to appear in the URL.

---

## Content Scripts (`"content_scripts"`)

### `matches: ["https://github.com/*/*/pull/*"]`

**What it grants:** Chrome injects `src/content/index.tsx` and `src/styles/content.css` into GitHub pull request pages.

**Why it is required:** The entire extension UI (chat panel, file focus buttons, line comment button, PR dashboard) is rendered by the content script inside a Shadow DOM attached to the PR page. Without injection, the extension has no user interface.

**Why this exact pattern:** Identical to the host permission above — `/{owner}/{repo}/pull/{number}`. Injection is scoped to PR pages only. The content script never runs on github.com root, profile pages, repo code pages, or any other path.

**What breaks without it:** The extension has no visible UI on any GitHub page.

---

## Web Accessible Resources (`"web_accessible_resources"`)

### `["icon-48.png", "icon-128.png", "fonts/outfit-latin-wght-normal.woff2"]` on `https://github.com/*`

**What it grants:** Content scripts running on GitHub pages can reference these files via `chrome.runtime.getURL()`, producing `chrome-extension://` URLs that the browser will serve from the extension package.

**Why each file is required:**

#### Icons — `icon-48.png`, `icon-128.png`

`src/content/utils/iconUtils.ts` line 3:
```typescript
return chrome.runtime.getURL(`icon-${size}.png`);
```

This function is called from six content script components, all using size 48 or 128:

| Component | Size |
|---|---|
| `src/content/components/ChatPanel.tsx` (panel header logo) | 48 |
| `src/content/components/PRDashboard.tsx` (loading spinner logo) | 128 |
| `src/content/components/ErrorBoundary.tsx` (error state logo) | 48 |
| `src/content/App.tsx` (floating trigger button) | 48 |
| `src/content/components/FileButtons.tsx` (file focus button) | 48 |
| `src/content/components/LineCommentButton.tsx` (line comment button) | 48 |

`icon-16.png` is used in `manifest.json` for the toolbar icon and extension metadata, but is never referenced via `chrome.runtime.getURL()` in any content script. It therefore does not need to be web-accessible.

#### Font — `fonts/outfit-latin-wght-normal.woff2`

`src/content/index.tsx` (mount function):
```typescript
const outfitUrl = chrome.runtime.getURL("fonts/outfit-latin-wght-normal.woff2");
const face = new FontFace("Outfit", `url(${outfitUrl}) format('woff2')`, {
  weight: "100 900",
  style: "normal",
});
document.fonts.add(face);
face.load();
```

The Outfit variable font is registered via the `FontFace` API using a `chrome-extension://` URL. This is required because GitHub enforces a strict Content Security Policy (`font-src github.githubassets.com`) that blocks all external font sources including Google Fonts. Loading the font from a `chrome-extension://` URL bypasses the host page's CSP, which is the only reliable mechanism for a content script to load a custom typeface on GitHub. The font is a read-only static asset — a subset of the Outfit variable font (latin glyphs, full weight axis) from the Fontsource project.

**Why only these three files:** These are the only extension-packaged assets loaded by `chrome.runtime.getURL()` in content scripts. No other assets are referenced this way.

**Why `https://github.com/*` and not narrower:** The `web_accessible_resources` `matches` field does not support path-restricted patterns (e.g. `/*/*/pull/*`) — Chrome rejects them as invalid match patterns. `https://github.com/*` is the narrowest valid pattern. In practice, only the content script (which injects exclusively on PR pages) references these files, so exposure is limited to two read-only PNGs and one read-only font file on a single host.

---

## Not Requested (and why)

| Permission | Reason not requested |
|---|---|
| `activeTab` | Not used. Extension has explicit `host_permissions` for all required origins. `activeTab` grants overlapping temporary access that serves no additional purpose. |
| `declarativeNetRequest` | Not used. The diff is fetched directly by the background service worker using its `patch-diff.githubusercontent.com` host permission. No client-side header rewriting is needed. |
| `tabs` | Not used. The extension never reads tab URLs, titles, or favicons via the `tabs` API. Tab context (owner/repo/PR number) is parsed from `window.location.href` inside the content script. |
| `scripting` | Not used. Content scripts are declared statically in the manifest. No dynamic script injection occurs. |
| `cookies` | Not used. Authentication uses API keys stored in `chrome.storage`, not cookies. |
| `identity` | Not used. No OAuth flow is implemented. |
| `notifications` | Not used. The extension has no notification UI. |
| `https://api.anthropic.com/*` | Not used as a host permission. The Anthropic API is accessed through the CORS proxy (`probe-proxy.sgunturi.workers.dev`), which is a first-party URL and does not require a separate host permission. |
| `https://api.openai.com/*` | Not used as a host permission. OpenAI API calls are routed through the same CORS proxy (via the `/openai/` path prefix), so no additional host permission is needed. |
