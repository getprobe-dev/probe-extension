# Changelog

All notable changes to PRobe are documented here. Each entry corresponds to a Chrome Web Store submission.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.1.0] — unreleased

### Added
- **Syntax highlighting in AI responses** — code blocks in the chat panel are now syntax-highlighted using `rehype-highlight` with auto-language detection. A PRobe-themed color scheme (navy background, mint keywords, blue types, amber numbers) is applied consistently across all languages.

### Fixed
- **Scrollbar clipping on code blocks** — the horizontal scrollbar no longer overflows outside the rounded corners of code blocks. `overflow-x` is now applied to the inner `code` element, allowing the `pre` container to clip cleanly.
- **Code block border-radius** — reduced from `12px` to `8px` to prevent text near the left/right edges from appearing visually clipped by the corners.
- **CWS permissions scope** — manifest host permissions narrowed to the exact GitHub API endpoints used (PR diffs, files, commits, reviews, comments). Removed overly broad patterns that caused the previous CWS rejection.
- **System prompt grounding** — current date is now injected into all system prompts, preventing false positives when reviewing documentation PRs with version numbers or dates.

### Changed
- **Version bumped to 1.1.0** — minor version increment reflecting new user-facing capability (syntax highlighting) and the CWS resubmission.
- **Code formatting** — Prettier applied across all source files for consistent style.

### Internal
- `WORKFLOW.md` updated with non-negotiable branch protection rules: direct commits to `main` are prohibited; issues are the source of truth for all work; multiple PRs per issue is expected and documented.

---

## [1.0.0] — 2026-02-xx

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
