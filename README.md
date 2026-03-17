# PRobe

**PRobe it, before you merge it.** AI-powered code review, right inside GitHub.

PRobe is a Chrome extension that adds a streaming AI chat panel to every GitHub pull request. Instead of copy-pasting diffs into a separate chat window, you get context-aware conversations grounded in the actual PR — scoped to any file, line range, or the full diff — without ever leaving the page.

[![PRobe Demo](https://img.youtube.com/vi/iErUTRXXKQg/maxresdefault.jpg)](https://www.youtube.com/watch?v=iErUTRXXKQg)

> See the full visual tour at [getprobe.dev](https://getprobe.dev).

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](LICENSE)

---

## Highlights

- **Context-aware chat** — Ask anything about a PR, scoped to the full diff, a single file, or specific lines.
- **Auto-loaded review skills** — Detects file types and injects best-practice guidelines (React, Python, API design) into the AI's context.
- **X-Ray mode** — Inspect the full system prompt the AI receives — every instruction, every piece of context, every skill.
- **Post comments & submit reviews** — Turn AI responses into GitHub comments, or batch inline comments into a single review.
- **PR dashboard** — Stats, reviewers, top changed files, and AI-generated focus prompts at a glance.
- **Your keys, your control** — Uses your own Anthropic or OpenAI API key. No account, no subscription, no data on external servers.

See the full feature list and version history in the [Changelog](CHANGELOG.md).

---

## Getting Started

### Prerequisites

- Chrome (or Chromium-based browser)
- [Node.js](https://nodejs.org/) 18+
- An [Anthropic API key](https://platform.claude.com/settings/keys) or [OpenAI API key](https://platform.openai.com/api-keys)

### Install & Build

```bash
git clone https://github.com/getprobe-dev/probe-extension.git
cd probe-extension
npm install
npm run build
```

### Load the Extension

1. Open `chrome://extensions` in Chrome.
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select the `dist/` folder.
4. Click the PRobe extension icon, choose your **LLM provider** (Anthropic or OpenAI), enter the corresponding **API key**, and your **GitHub Classic Token** (with `repo` scope).
5. Navigate to any GitHub pull request and click the floating PRobe button (or press `Cmd+Shift+P`).

### Development

```bash
npm run dev
```

This starts Vite in watch mode. Changes hot-reload into the `dist/` folder — just refresh the GitHub tab to pick them up.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  GitHub PR Page                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Content Script (Shadow DOM)                           │  │
│  │  ┌──────────┐  ┌─────────────────┐  ┌──────────────┐  │  │
│  │  │FileButtons│  │LineCommentButton│  │  ChatPanel    │  │  │
│  │  └──────────┘  └─────────────────┘  │  MessageList  │  │  │
│  │                                     │  ChatInput    │  │  │
│  │                                     │  ReviewQueue  │  │  │
│  │                                     │  PRDashboard  │  │  │
│  │                                     └──────────────┘  │  │
│  └───────────────────────┬────────────────────────────────┘  │
└──────────────────────────┼───────────────────────────────────┘
                           │  chrome.runtime messages / port
                           ▼
┌──────────────────────────────────────────────────────────────┐
│  Background Service Worker                                   │
│  - Fetches PR diffs and file content from GitHub             │
│  - Posts comments and reviews via the GitHub API             │
│  - Resolves review skills based on file extensions           │
│  - Streams chat responses from Anthropic or OpenAI           │
└──────────────────────────┬───────────────────────────────────┘
                           │  fetch (via proxy)
                           ▼
┌──────────────────────────────────────────────────────────────┐
│  CORS Proxy (Cloudflare Worker)                              │
│  - Routes to api.anthropic.com or api.openai.com             │
│  - Adds CORS headers for the extension context               │
│  - No LLM domains in manifest host_permissions               │
└──────────────────────────────────────────────────────────────┘
```

The **content script** renders inside a Shadow DOM to avoid CSS conflicts with GitHub. The **background service worker** handles all network requests (GitHub API, Anthropic API) and streams SSE chunks back to the UI over a long-lived `chrome.runtime.connect` port. The **proxy** is a lightweight Cloudflare Worker that adds CORS headers — your API key is passed through and never stored server-side.

---

## How Chat Works

1. The content script parses the PR URL and scrapes the title and description from the page.
2. The background worker fetches the unified diff from GitHub.
3. File extensions are matched against the skill registry to load relevant review guidelines (cached 24 hours).
4. A system prompt is assembled from the PR metadata, diff (up to 80K chars), focused file/lines (if any), and matched skills.
5. Messages are sent to the selected LLM provider via the CORS proxy with streaming enabled.
6. SSE chunks are forwarded through the port to the content script and rendered incrementally.

### Review Skills

PRobe automatically detects file extensions in the diff and injects domain-specific review guidelines into the system prompt. The registry lives in `src/shared/skills.ts` — adding a new skill is a one-liner. Current skills cover React/Next.js, Python async & testing patterns, and API design.

---

## Tech Stack

| Layer | Technology |
|---|---|
| UI | React 19, TypeScript, Tailwind CSS 4, shadcn/ui, Radix UI, Lucide icons |
| Markdown | react-markdown, remark-gfm, rehype-highlight |
| Build | Vite 7, vite-plugin-web-extension |
| Extension | Chrome Manifest V3 |
| AI | Anthropic or OpenAI (user-configurable model, streaming) |
| Proxy | Cloudflare Workers |

---

## Configuration

All configuration is stored in `chrome.storage.sync` — no `.env` files needed.

| Setting | Required | Description |
|---|---|---|
| LLM Provider | Yes | Choose between Anthropic and OpenAI. Set via the extension popup. |
| API Key | Yes | Your Anthropic or OpenAI API key (depending on provider). Set via the extension popup. |
| Model | Yes | Model name to use (e.g. `claude-opus-4-6`, `gpt-4o`). Defaults per provider; user-configurable. |
| GitHub Classic Token | Yes | Required for PR stats, reviews, and comments. Needs `repo` scope. |

The proxy URL defaults to a hosted Cloudflare Worker — no setup required. To self-host, deploy the `proxy/` directory:

```bash
cd proxy
npm install
npm run deploy   # deploys via wrangler
```

---

## Permissions

PRobe requests the minimum permissions needed:

- **`storage`** — Persist API keys and per-PR chat/review state.
- **Host permissions** — `github.com/*/*/pull/*` (PR diff fetch), `raw.githubusercontent.com/*` (raw file content), `api.github.com/*` (PR stats + posting comments/reviews).

---

## Contributing

PRobe welcomes contributions through a proposal-first workflow. See [CONTRIBUTING.md](CONTRIBUTING.md) for details on how to get started.

For UI contributions, see [docs/DESIGN.md](docs/DESIGN.md) for the visual language, color tokens, and component patterns.

---

## License

PRobe is licensed under the [GNU Affero General Public License v3.0 (AGPL-3.0)](LICENSE).

You are free to use, modify, and distribute this software under the terms of the AGPL-3.0. Any modified versions must also be made available under the same license.

For commercial licensing inquiries, contact [sgunturi@protonmail.com](mailto:sgunturi@protonmail.com).
