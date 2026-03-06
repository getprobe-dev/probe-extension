# PRobe

**Chat with any GitHub pull request.** Your AI-powered PR review companion.

PRobe is a Chrome extension that adds an AI-powered chat panel to GitHub pull requests. Ask questions about the diff, drill into specific files or line ranges, and post review comments — all without leaving the browser.

## Features

- **PR-wide chat** — Have a conversation grounded in the full PR diff, title, and description.
- **File-level focus** — Click a file header in the diff view to scope the AI's context to that file.
- **Line-level focus** — Select specific lines via GitHub's "Add comment" UI to discuss a precise code region.
- **Multi-focus** — Pin up to 3 files/line-ranges simultaneously as context for your question.
- **Review skills** — Automatically loads best-practice review guidelines (React, Python, API design) based on the file types in the diff. Skills are sourced from open repos like [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) and [wshobson/agents](https://github.com/wshobson/agents).
- **Post comments** — Turn any AI response into a GitHub PR comment (issue comment or inline review comment) with one click.
- **Review queue** — Collect multiple inline comments and submit them as a single GitHub review (Comment, Approve, or Request Changes).
- **PR dashboard** — When you first open the panel, see stats (additions/deletions, commits, reviewers, top files) and an AI-generated 3-bullet summary of what to focus on.
- **Chat history** — Conversations are persisted per-PR in local storage so you can pick up where you left off.
- **Keyboard shortcut** — `Cmd+Shift+P` (macOS) / `Ctrl+Shift+P` (Windows/Linux) to toggle the panel.

## Getting Started

### Prerequisites

- Chrome (or Chromium-based browser)
- [Node.js](https://nodejs.org/) 18+
- An [Anthropic API key](https://console.anthropic.com/)

### Install & Build

```bash
git clone https://github.com/<your-username>/probe.git
cd probe
npm install
npm run build
```

### Load the Extension

1. Open `chrome://extensions` in Chrome.
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select the `dist/` folder.
4. Click the PRobe extension icon and enter your **Anthropic API key**.
5. (Optional) Add a **GitHub Classic Token** with `repo` scope to enable posting comments.
6. Navigate to any GitHub pull request and click the floating PRobe button (or press `Cmd+Shift+P`).

### Development

```bash
npm run dev
```

This starts Vite in watch mode. Changes hot-reload into the `dist/` folder — just refresh the GitHub tab to pick them up.

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
│  - Streams chat responses from Anthropic via the proxy       │
└──────────────────────────┬───────────────────────────────────┘
                           │  fetch (Anthropic Messages API)
                           ▼
┌──────────────────────────────────────────────────────────────┐
│  CORS Proxy (Cloudflare Worker)                              │
│  - Forwards requests to api.anthropic.com                    │
│  - Adds CORS headers for the extension context               │
└──────────────────────────────────────────────────────────────┘
```

**Content script** renders inside a Shadow DOM to avoid CSS conflicts with GitHub. It injects PRobe buttons on file headers and line-comment forms, and renders the chat panel as a fixed sidebar.

**Background service worker** handles all network requests (GitHub API, Anthropic API) since content scripts can't make cross-origin requests directly. Chat uses a long-lived `chrome.runtime.connect` port to stream SSE chunks back to the UI in real time.

**Proxy** is a lightweight Cloudflare Worker that adds CORS headers and forwards requests to the Anthropic API. Your API key is passed through and never stored server-side.

## How Chat Works

1. The content script parses the PR URL (`owner/repo/number`) and scrapes the title and description from the page.
2. The background worker fetches the unified diff from GitHub.
3. File extensions in the diff are matched against a skill registry to load relevant review guidelines (e.g., React best practices for `.tsx` files). Skills are cached for 24 hours.
4. A system prompt is assembled from the PR metadata, diff (up to 80K chars), focused file/lines (if any), and matched skills.
5. Messages are sent to the Anthropic Messages API (Claude Sonnet) via the proxy with streaming enabled.
6. SSE chunks are forwarded through the port to the content script, which renders them incrementally.

## Project Structure

```
probe/
├── manifest.json                 # Chrome Extension Manifest V3
├── package.json
├── vite.config.ts
├── components.json               # shadcn/ui configuration
├── public/
│   ├── icon-{16,48,128}.png      # Extension icons
│   └── rules.json                # Declarative net request rules (CORS)
├── src/
│   ├── background/
│   │   └── index.ts              # Service worker: GitHub API, chat streaming, skills
│   ├── content/
│   │   ├── index.tsx             # Mounts React app in Shadow DOM on PR pages
│   │   ├── App.tsx               # Root: panel toggle, focus state, keyboard shortcut
│   │   ├── components/
│   │   │   ├── ChatPanel.tsx     # Main chat surface: context loading, message management
│   │   │   ├── ChatInput.tsx     # Text input with prompt starters and focus pills
│   │   │   ├── MessageList.tsx   # Renders messages or the PR dashboard
│   │   │   ├── MessageBubble.tsx # Single message: markdown, copy, post-as-comment
│   │   │   ├── CommentComposer.tsx  # Inline editor for posting/queuing comments
│   │   │   ├── ReviewQueue.tsx   # Pending comments queue with batch submit
│   │   │   ├── PRDashboard.tsx   # Stats, commits, people, top files, AI summary
│   │   │   ├── FileButtons.tsx   # Injects PRobe button on each changed file header
│   │   │   ├── LineCommentButton.tsx  # Injects PRobe button in line-comment UI
│   │   │   └── PromptStarters.tsx    # Contextual starter prompts
│   │   └── utils/
│   │       └── theme.ts          # Icon URL helpers
│   ├── popup/
│   │   ├── index.html            # Extension popup entry
│   │   ├── index.tsx
│   │   └── App.tsx               # Settings UI: API key, GitHub token
│   ├── shared/
│   │   ├── types.ts              # Shared types and storage key constants
│   │   ├── constants.ts          # System prompt builders
│   │   ├── context.ts            # PR URL parsing and diff helpers
│   │   └── skills.ts             # Skill registry, extension detection, matching
│   ├── components/ui/            # shadcn/ui primitives
│   └── styles/
│       ├── content.css           # Injected into the page
│       └── content-shadow.css    # Scoped inside the Shadow DOM
├── proxy/                        # Cloudflare Worker (CORS proxy)
│   ├── src/index.ts
│   ├── wrangler.json
│   └── package.json
└── docs/
    └── VISION.md                 # Product vision and future ideas
```

## Tech Stack

| Layer | Technology |
|---|---|
| UI | React 19, TypeScript, Tailwind CSS 4, shadcn/ui, Radix UI, Lucide icons |
| Markdown | react-markdown, remark-gfm, rehype-highlight |
| Build | Vite 7, vite-plugin-web-extension |
| Extension | Chrome Manifest V3 |
| AI | Anthropic Claude Sonnet (streaming) |
| Proxy | Cloudflare Workers |

## Design

PRobe's visual language is designed to feel like a native part of GitHub while remaining instantly recognizable as a separate tool. The entire UI renders inside a **Shadow DOM** to fully isolate its styles from GitHub's CSS.

### Logo

The icon is typographic — the letters **P** and **R** set in **Outfit ExtraBold (800)** on a deep teal-black (`#1a2e2b`) rounded-square background. "P" is rendered in mint (`#5eead4`), "R" in slate (`#f1f5f9`), and a subtle glass/glow layer in mint (`#5eead4`) adds depth. The result reads as "PR" at a glance — a direct nod to "pull request" — while the teal-and-mint treatment ties it to the rest of the UI palette.

| Element | Value |
|---|---|
| Background | `#1a2e2b` (deep teal-black) |
| "P" | `#5eead4` (mint) |
| "R" | `#f1f5f9` (slate) |
| Glass / glow | `#5eead4` (mint) |
| Typeface | Outfit 800 (ExtraBold) |

### Color Palette

The palette is built around a **dark teal/navy** and **mint** pairing — warm enough to feel approachable, cool enough to sit comfortably alongside GitHub's neutral UI. The logo's background, mint, and slate carry directly into every surface in the extension.

| Token | Hex | Usage |
|---|---|---|
| **Navy** | `#1a2e2b` | Panel header, code block backgrounds, tooltips, foreground text |
| **Navy Light** | `#243d39` | Code block borders, gradient stops on primary buttons |
| **Mint** | `#5eead4` | Primary accent — user message bubbles, focus rings, streaming cursor, hover states, addition bars, commit glow |
| **Mint Light** | `#a7f3d0` | Secondary accent highlights |
| **Mint Faint** | `#ecfdf5` | Hover background on starter pills |
| **Surface** | `#f8fafb` | Input backgrounds, comment composer, dashboard cards |
| **Surface Elevated** | `#fdfefe` | Elevated card backgrounds |
| **Slate 100** | `#f1f5f9` | Assistant message bubbles, inline code backgrounds, muted/secondary fills |
| **Slate 200** | `#e2e8f0` | Borders, dividers, scrollbar thumbs |
| **Slate 400** | `#94a3b8` | Input borders (resting), starter pill borders |
| **Slate 500** | `#64748b` | Muted foreground text, secondary labels |
| **Slate 600** | `#475569` | Starter pill text |
| **Green 600** | `#16a34a` | Additions count |
| **Red 600** | `#dc2626` | Deletions count |
| **Red 400** | `#f87171` | Deletion text in tooltips, destructive hover |

### Typography

- **Body font**: Inter (loaded from Google Fonts), falling back to the system font stack (`-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `Roboto`).
- **Brand/display font**: Outfit (Medium–ExtraBold) for the "PRobe" wordmark and stat card numbers.
- **Monospace**: `SFMono-Regular`, Consolas, `Liberation Mono`, Menlo — used in code blocks, the comment composer, and inline `code` spans.
- **Base size**: 14px / 1.5 line height inside the panel.

### Components & Surfaces

- **Panel** — Fixed 400px-wide sidebar that slides in from the right with a `cubic-bezier(0.16, 1, 0.3, 1)` ease. A subtle left border-shadow separates it from the page. The GitHub page content reflows by adding a matching `margin-right`.
- **Header bar** — Solid navy (`#1a2e2b`) with white text. Action buttons use a frosted-glass gradient (`rgba(255,255,255,0.18)` → `0.06`) with a deep drop-shadow for a tactile "raised" feel.
- **Message bubbles** — User messages are mint (`#5eead4`) with navy text, rounded with a flattened bottom-right corner. Assistant messages are slate (`#f1f5f9`) with a flattened bottom-left corner.
- **Streaming cursor** — A 6px mint bar that pulses at the end of the last rendered element while the response streams in.
- **Send button** — Navy gradient (`#243d39` → `#1a2e2b`) with a mint icon, a `3px` bottom shadow for depth, and an active state that translates down to simulate a physical press.
- **Starter pills** — White background with a slate border and `2px` bottom shadow. On hover they shift to a mint border with a mint faint background, giving an "illuminate" effect.
- **Focus pills** (file/line chips in the input) — `#5eead4` at 10% opacity background with a 20% opacity border, keeping them present but non-distracting.
- **Dashboard cards** — Surface background (`#f8fafb`) with a 1px slate border and 12px border-radius.
- **Code blocks** (in markdown) — Navy background (`#1a2e2b`) with slate-200 text. Inline code is slate-100 with a 1px border.
- **Blockquotes** — 3px mint left border with slate-500 text.
- **Links** — Navy text with a mint underline that transitions to navy on hover.
- **Floating action button** — The PRobe icon with a `4px` bottom shadow and a mint glow ring on hover. Press pushes it down with an inset shadow.

### Button Depth System

All interactive elements use a consistent "physical" depth system:

1. **Resting** — A `box-shadow` on the bottom edge simulates the button sitting above the surface.
2. **Hover** — Shadow deepens slightly or border color shifts to mint.
3. **Active/pressed** — `translateY` pushes the element down, shadow switches to `inset`, simulating a button press into the surface.
4. **Disabled** — Reduced opacity, no shadow, `cursor: not-allowed`.

This is applied consistently across the send button, header buttons, starter pills, composer buttons, review submit, and the floating action button.

### Animations

| Animation | Easing | Duration | Usage |
|---|---|---|---|
| `slideIn` | `cubic-bezier(0.16, 1, 0.3, 1)` | 280ms | Panel entrance |
| `fadeIn` | `ease-out` | 250ms | Message bubbles, dashboard |
| `logoPulse` | `ease-in-out` | 1.6s loop | Loading state (PRobe icon) |
| `pulse-cursor` | `ease-in-out` | 800ms loop | Streaming cursor |
| Margin transition | `cubic-bezier(0.16, 1, 0.3, 1)` | 250ms | GitHub page reflow when panel opens/closes |

### Scrollbar

Custom WebKit scrollbar: 5px wide, transparent track, `#cbd5e1` thumb that darkens to `#94a3b8` on hover. Keeps the panel feeling lightweight.

## Configuration

All configuration is stored in Chrome's `chrome.storage.sync` — no `.env` files needed.

| Setting | Required | Description |
|---|---|---|
| Anthropic API Key | Yes | Powers chat and PR summaries. Set via the extension popup. |
| GitHub Classic Token | No | Enables posting PR comments and reviews. Needs `repo` scope. |

The proxy URL defaults to a hosted Cloudflare Worker. You can self-host by deploying the `proxy/` directory:

```bash
cd proxy
npm install
npm run deploy   # deploys via wrangler
```

## Permissions

PRobe requests the minimum permissions needed:

- **`storage`** — Persist API keys and chat history.
- **`activeTab`** — Access the current GitHub tab.
- **`declarativeNetRequest`** — Add CORS headers for patch diff fetches.
- **Host permissions** — `github.com`, `api.github.com`, `*.githubusercontent.com`, `*.workers.dev`.

## License

MIT
