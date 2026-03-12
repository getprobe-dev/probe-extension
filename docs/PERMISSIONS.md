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
- `src/background/index.ts` line 188: reads `GITHUB_TOKEN` to authenticate GitHub API calls.
- `src/background/index.ts` line 399: reads `API_KEY` and `PROXY_URL` to authenticate Anthropic API calls.
- `src/popup/App.tsx` lines 13, 47, 54: reads and writes all three settings from the popup.

`chrome.storage.local` — persists per-PR state locally on the device:
- `src/content/components/ChatPanel.tsx` lines 55, 86, 92, 94, 250: reads and writes per-PR chat history and pending review comments.
- `src/background/index.ts` lines 430, 455: reads and writes the 24-hour skill content cache, keyed by skill ID.

**What breaks without it:** Chat history is lost on every page reload. API keys must be re-entered every session. The skill cache always fetches from the network, ignoring the 24-hour TTL.

**Why `chrome.storage` rather than `localStorage`:** Content scripts and background service workers share the same `chrome.storage` namespace, which makes it the only mechanism for sharing settings between the popup, background worker, and content script. `localStorage` is origin-scoped to the page and not accessible from the background worker.

---

## Host Permissions (`"host_permissions"`)

### `https://github.com/*/*/pull/*`

**What it grants:** The background service worker can `fetch()` URLs matching this pattern. The content script `matches` field (see below) uses the same pattern to control injection.

**Why it is required:**

`src/background/index.ts` line 42:
```typescript
const url = `https://github.com/${msg.owner}/${msg.repo}/pull/${msg.number}.diff`;
fetch(url)
```
The unified `.diff` file is not available through the GitHub REST API — it is only served at this URL. It is the foundation of every review feature: all AI context, focused-file diffs, and line-level discussions derive from this fetch.

**Why this exact pattern:** The path `/*/*/pull/*` is `/{owner}/{repo}/pull/{number}`. It restricts access to pull request URLs only. The extension never accesses github.com root, profile pages, repo pages, or any other path.

**What breaks without it:** The background worker cannot fetch the PR diff. The entire extension stops functioning.

---

### `https://raw.githubusercontent.com/*`

**What it grants:** The background service worker can `fetch()` any URL on `raw.githubusercontent.com`.

**Why it is required:**

Two distinct fetch patterns use this host:

1. **Raw file content for focused-file review** — `src/background/index.ts` line 58:
```typescript
const url = `https://raw.githubusercontent.com/${msg.owner}/${msg.repo}/${msg.branch}/${path}`;
fetch(url)
```
When a user focuses on a specific file, the extension fetches its full content so the AI has complete context, not just the diff hunks. The path includes owner, repo, branch, and file path — all of which are dynamic and not known at manifest-declaration time.

2. **Review skill markdown** — `src/background/index.ts` line 442 (via `fetchSkillContent`):
The skill registry in `src/shared/skills.ts` stores `rawUrl` fields pointing to public `SKILL.md` files on `raw.githubusercontent.com` (e.g. `vercel-labs/agent-skills`, `wshobson/agents`). These are fetched on demand and cached locally for 24 hours.

**Why `/*` rather than a narrower path:** Both uses require arbitrary owner/repo/branch/path combinations that are unknown at build time. The host itself (`raw.githubusercontent.com`) is the narrowing — it is a read-only content delivery host with no authenticated write operations.

**What breaks without it:** Focused-file context is unavailable. Review skills cannot be loaded. AI responses become less accurate for file-level reviews.

---

### `https://api.github.com/repos/*`

**What it grants:** The background service worker can make authenticated `fetch()` calls to the GitHub REST API under the `/repos/` path.

**Why it is required:**

All GitHub REST API calls in `src/background/index.ts` are under `/repos/`:

| Handler | Endpoint | Purpose |
|---|---|---|
| `handlePostComment` (line 125) | `POST /repos/{owner}/{repo}/issues/{number}/comments` | Post a PR-level comment |
| `handlePostReviewComment` (line 137) | `POST /repos/{owner}/{repo}/pulls/{number}/reviews` | Post an inline review comment |
| `handleSubmitReview` (line 156) | `POST /repos/{owner}/{repo}/pulls/{number}/reviews` | Submit a full review (Comment / Approve / Request Changes) |
| `handleFetchPRStats` (line 239) | `GET /repos/{owner}/{repo}/pulls/{number}` | Fetch PR metadata (additions, deletions, labels, author) |
| `handleFetchPRStats` (line 243) | `GET /repos/{owner}/{repo}/pulls/{number}/files` | Fetch per-file change stats |
| `handleFetchPRStats` (line 244) | `GET /repos/{owner}/{repo}/pulls/{number}/commits` | Fetch commit list |
| `handleFetchPRStats` (line 245) | `GET /repos/{owner}/{repo}/pulls/{number}/reviews` | Fetch reviewer states |
| `handleFetchPRStats` (line 265) | `GET /repos/{owner}/{repo}/commits/{sha}` | Fetch per-commit stats |

**Why `/repos/*` rather than `/*`:** No call accesses `/user`, `/orgs`, `/gists`, `/search`, `/notifications`, or any other top-level GitHub API path. Restricting to `/repos/*` ensures the host permission cannot be used to read or write anything outside repository data.

**What breaks without it:** Posting comments and reviews fails. The PR dashboard (stats, commit timeline, reviewer states) cannot load.

---

## Content Scripts (`"content_scripts"`)

### `matches: ["https://github.com/*/*/pull/*"]`

**What it grants:** Chrome injects `src/content/index.tsx` and `src/styles/content.css` into GitHub pull request pages.

**Why it is required:** The entire extension UI (chat panel, file focus buttons, line comment button, PR dashboard) is rendered by the content script inside a Shadow DOM attached to the PR page. Without injection, the extension has no user interface.

**Why this exact pattern:** Identical to the host permission above — `/{owner}/{repo}/pull/{number}`. Injection is scoped to PR pages only. The content script never runs on github.com root, profile pages, repo code pages, or any other path.

**What breaks without it:** The extension has no visible UI on any GitHub page.

---

## Web Accessible Resources (`"web_accessible_resources"`)

### `["icon-16.png", "icon-48.png", "icon-128.png"]` on `https://github.com/*`

**What it grants:** Content scripts running on `github.com` can reference these three files via `chrome.runtime.getURL()`, making them loadable in `<img>` `src` attributes inside the Shadow DOM.

**Why it is required:**

`src/content/utils/theme.ts` line 3:
```typescript
return chrome.runtime.getURL(`icon-${size}.png`);
```

This function is called from six content script components:
- `src/content/components/ChatPanel.tsx` (panel header logo)
- `src/content/components/PRDashboard.tsx` (loading spinner logo)
- `src/content/components/ErrorBoundary.tsx` (error state logo)
- `src/content/App.tsx` (floating trigger button)
- `src/content/components/FileButtons.tsx` (file focus button)
- `src/content/components/LineCommentButton.tsx` (line comment button)

Extension-packaged resources are blocked by default in web page contexts. Without `web_accessible_resources`, every `chrome.runtime.getURL()` call returns an inaccessible URL and all icons fail to load.

**Why only these three files:** These are the only extension-packaged assets loaded by `getURL()`. No other file in the package is accessed this way.

**Why only on `https://github.com/*`:** The content script only runs on GitHub. No other origin needs to load these icons.

---

## Not Requested (and why)

| Permission | Reason not requested |
|---|---|
| `activeTab` | Not used. Extension has explicit `host_permissions` for all required origins. `activeTab` grants overlapping temporary access that serves no additional purpose. |
| `declarativeNetRequest` | Not used. The CORS proxy (`pr-sidekick-proxy.sgunturi.workers.dev`) handles CORS headers server-side, so no client-side header rewriting is needed. |
| `tabs` | Not used. The extension never reads tab URLs, titles, or favicons via the `tabs` API. Tab context (owner/repo/PR number) is parsed from `window.location.href` inside the content script. |
| `scripting` | Not used. Content scripts are declared statically in the manifest. No dynamic script injection occurs. |
| `cookies` | Not used. Authentication uses API keys stored in `chrome.storage`, not cookies. |
| `identity` | Not used. No OAuth flow is implemented. |
| `notifications` | Not used. The extension has no notification UI. |
| `https://api.anthropic.com/*` | Not used as a host permission. The Anthropic API is accessed through the CORS proxy (`pr-sidekick-proxy.sgunturi.workers.dev`), which is a first-party URL and does not require a separate host permission. |
