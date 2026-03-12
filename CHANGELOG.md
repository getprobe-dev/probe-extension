# Changelog

All notable changes to PRobe are documented here. Each entry corresponds to a Chrome Web Store submission.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.1.0] — 2026-03-13

### Added
- **X-Ray mode** — inspect the full system prompt the AI receives: every instruction, every piece of context, every review skill that was loaded. Toggle it from the header to see exactly what the AI sees.
- **Intelligent suggested prompts** — context-aware follow-up suggestions appear after each AI response. Prompts adapt to scope: PR-level when viewing the full diff, file-specific when focused on a file, line-level when discussing selected code.
- **Syntax highlighting in AI responses** — code blocks in the chat panel are now syntax-highlighted using `rehype-highlight` with auto-language detection and a PRobe-themed color scheme.
- **Enriched PR context** — when a GitHub token is configured, the system prompt now includes commits, reviews, recent comments, CI check status, file list, and linked issues fetched from the GitHub API.
- **Per-file full content in AI reviews** — the system prompt includes complete head-branch file content for each changed file (up to 400K chars total, 30K per file, sorted by change volume), eliminating false positives caused by diff-only reviews.
- **Enriched context cancellation** — navigating away or closing the panel mid-fetch now cleanly aborts in-flight enriched context requests.
- **Setup guide** — in-panel onboarding guides users to configure API keys and GitHub token on first use.
- **Resizable chat panel** — the side panel can be dragged to resize between 320px and 800px.
- **Bundled Outfit font** — the Outfit typeface is bundled as a WOFF2 web-accessible resource, ensuring consistent rendering regardless of GitHub's CSP.
- **PR dashboard skeleton states** — loading skeletons replace blank space while PR stats are being fetched.

### Fixed
- **External resource loading in popup** — replaced the external Google Fonts `<link>` with a local `@font-face` declaration using the bundled font. MV3's CSP blocks external stylesheets.
- **Missing host permission for issues endpoint** — added `https://api.github.com/repos/*/*/issues/*` to cover the bare `/issues/{n}` fetch used in linked-issue resolution.
- **CWS permissions scope** — manifest host permissions narrowed to the exact GitHub API endpoints used. Removed overly broad patterns that caused the v1.0.0 CWS rejection.
- **System prompt grounding** — current date is now injected into all system prompts, preventing false positives when reviewing documentation PRs with version numbers or dates.
- **Scrollbar clipping on code blocks** — `overflow-x` is now applied to the inner `code` element, allowing the `pre` container to clip cleanly.
- **Resize listener cleanup** — drag listeners on `document` are properly removed if the panel unmounts mid-drag.
- **Enriched context degradation** — when the GitHub token is missing or API calls fail, the system prompt explicitly notes that some context is unavailable.

### Changed
- **Model upgraded to `claude-opus-4-6`** — upgraded from `claude-sonnet-4-20250514` for higher-quality reviews.
- **Version bumped to 1.1.0** — minor version increment reflecting new capabilities and the CWS resubmission.
- **Code formatting** — Prettier applied across all source files for consistent style.

### Internal
- **Background service worker decomposed** — split the 1025-line `background/index.ts` into 5 focused modules: `helpers.ts`, `githubApi.ts`, `llmService.ts`, `skillResolver.ts`, and a slim dispatcher with a handler registry.
- **Message dispatch table** — replaced the 137-line if-chain with a `Record<string, handler>` dispatch table. Adding a new message type is now a one-line change.
- **Shared parsing utility** — extracted `parsePromptSuggestions()` to `shared/parsing.ts`, eliminating duplication between background and content scripts.
- **React correctness fixes** — replaced suppressed `exhaustive-deps` warnings with proper ref patterns, wrapped inline JSX callbacks in `useCallback`, replaced array-index keys with stable keys.
- **Lookup maps over ternaries** — replaced nested ternary chains with `FILE_STATUS_LABELS`, `FILE_STATUS_INDICATOR`, and `REVIEW_STATE_COLORS` lookup objects.
- **Named constants** — extracted `GITHUB_API_VERSION`, `ANTHROPIC_API_VERSION`, `MAX_COMMIT_DETAILS`, `FILE_CONTENT_BUDGET`, `PER_FILE_CONTENT_CAP`.
- `WORKFLOW.md` updated with branch protection rules: direct commits to `main` are prohibited; issues are the source of truth for all work.

---

## [1.0.0] — 2026-03-06

Initial Chrome Web Store submission.

### Added
- AI chat panel injected into GitHub PR pages via Shadow DOM
- Full PR diff loaded as context for every conversation
- File-level focus: click the PRobe button on any diff file header to scope the chat to that file
- Line-level focus: click the PRobe button in GitHub's inline comment editor to scope to specific lines
- Multi-focus: up to 3 files or line ranges active simultaneously
- Review skills: auto-detected domain guidelines (React/Next.js, Python async, API design) fetched from curated skill registries and injected into the system prompt
- Post AI responses as PR comments or inline review comments directly from the chat panel
- Review queue: batch pending inline comments into a single submitted review (Comment / Approve / Request Changes)
- PR dashboard: stats (files, lines, comments), add/del bar, commit timeline, co-authors, top changed files, AI-generated 3-bullet focus summary
- Chat history persisted per PR in `chrome.storage.local`
- Keyboard shortcut: `Cmd+Shift+P` / `Ctrl+Shift+P` to toggle the panel
- Cloudflare Worker CORS proxy for Anthropic API calls
