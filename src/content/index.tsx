import { createRoot } from "react-dom/client";
import { App } from "./App";

function mount() {
  const hostId = "pr-sidekick-root";
  if (document.getElementById(hostId)) return;

  const host = document.createElement("div");
  host.id = hostId;
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: "open" });

  const styleEl = document.createElement("style");
  styleEl.textContent = getShadowStyles();
  shadow.appendChild(styleEl);

  const appContainer = document.createElement("div");
  appContainer.id = "pr-sidekick-app";
  shadow.appendChild(appContainer);

  createRoot(appContainer).render(<App />);
}

function getShadowStyles(): string {
  return `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    :host {
      all: initial;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    #pr-sidekick-app {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: #171717;
      -webkit-font-smoothing: antialiased;
    }

    /* Animation */
    @keyframes slideIn {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }
    .prs-animate-slide-in {
      animation: slideIn 0.2s ease-out;
    }

    /* Cursor blinking */
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0; }
    }
    .prs-animate-pulse {
      animation: pulse 0.8s ease-in-out infinite;
    }

    /* Scrollbar */
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #d4d4d4; border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: #a3a3a3; }

    /* Prose styling for markdown */
    .prs-prose { }
    .prs-prose p { margin: 0.5em 0; }
    .prs-prose p:first-child { margin-top: 0; }
    .prs-prose p:last-child { margin-bottom: 0; }
    .prs-prose code {
      background: #f5f5f5;
      padding: 0.15em 0.35em;
      border-radius: 4px;
      font-size: 0.85em;
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
    }
    .prs-prose pre {
      background: #1e1e1e;
      color: #d4d4d4;
      padding: 0.75em 1em;
      border-radius: 8px;
      overflow-x: auto;
      margin: 0.5em 0;
      font-size: 0.85em;
    }
    .prs-prose pre code {
      background: none;
      padding: 0;
      color: inherit;
    }
    .prs-prose ul, .prs-prose ol {
      margin: 0.5em 0;
      padding-left: 1.5em;
    }
    .prs-prose li { margin: 0.25em 0; }
    .prs-prose strong { font-weight: 600; }
    .prs-prose h1, .prs-prose h2, .prs-prose h3 {
      font-weight: 600;
      margin: 0.75em 0 0.25em;
    }
    .prs-prose h1 { font-size: 1.2em; }
    .prs-prose h2 { font-size: 1.1em; }
    .prs-prose h3 { font-size: 1em; }
    .prs-prose blockquote {
      border-left: 3px solid #d4d4d4;
      padding-left: 0.75em;
      margin: 0.5em 0;
      color: #737373;
    }
    .prs-prose table {
      border-collapse: collapse;
      margin: 0.5em 0;
      font-size: 0.9em;
    }
    .prs-prose th, .prs-prose td {
      border: 1px solid #e5e5e5;
      padding: 0.35em 0.65em;
    }
    .prs-prose th {
      background: #f5f5f5;
      font-weight: 600;
    }
    .prs-prose a {
      color: #7c3aed;
      text-decoration: underline;
    }
    .prs-prose hr {
      border: none;
      border-top: 1px solid #e5e5e5;
      margin: 0.75em 0;
    }

    /* === Tailwind-like utility classes with prs- prefix === */

    /* Layout */
    .prs-fixed { position: fixed; }
    .prs-top-0 { top: 0; }
    .prs-right-0 { right: 0; }
    .prs-bottom-6 { bottom: 1.5rem; }
    .prs-right-6 { right: 1.5rem; }
    .prs-h-full { height: 100%; }
    .prs-w-\\[400px\\] { width: 400px; }

    /* Flexbox */
    .prs-flex { display: flex; }
    .prs-flex-col { flex-direction: column; }
    .prs-flex-1 { flex: 1 1 0%; min-height: 0; }
    .prs-items-center { align-items: center; }
    .prs-items-end { align-items: flex-end; }
    .prs-justify-center { justify-content: center; }
    .prs-justify-between { justify-content: space-between; }
    .prs-justify-start { justify-content: flex-start; }
    .prs-justify-end { justify-content: flex-end; }
    .prs-shrink-0 { flex-shrink: 0; }
    .prs-gap-1 { gap: 0.25rem; }
    .prs-gap-2 { gap: 0.5rem; }
    .prs-min-w-0 { min-width: 0; }

    /* Sizing */
    .prs-w-6 { width: 1.5rem; }
    .prs-h-6 { height: 1.5rem; }
    .prs-w-9 { width: 2.25rem; }
    .prs-h-9 { height: 2.25rem; }
    .prs-w-12 { width: 3rem; }
    .prs-h-12 { height: 3rem; }
    .prs-h-4 { height: 1rem; }
    .prs-w-1\\.5 { width: 0.375rem; }
    .prs-max-w-none { max-width: none; }
    .prs-max-w-\\[85\\%\\] { max-width: 85%; }
    .prs-max-w-\\[200px\\] { max-width: 200px; }

    /* Spacing */
    .prs-p-1\\.5 { padding: 0.375rem; }
    .prs-p-3 { padding: 0.75rem; }
    .prs-p-4 { padding: 1rem; }
    .prs-p-6 { padding: 1.5rem; }
    .prs-px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
    .prs-px-3\\.5 { padding-left: 0.875rem; padding-right: 0.875rem; }
    .prs-px-4 { padding-left: 1rem; padding-right: 1rem; }
    .prs-py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
    .prs-py-2\\.5 { padding-top: 0.625rem; padding-bottom: 0.625rem; }
    .prs-py-3 { padding-top: 0.75rem; padding-bottom: 0.75rem; }
    .prs-mb-1 { margin-bottom: 0.25rem; }
    .prs-mb-3 { margin-bottom: 0.75rem; }
    .prs-ml-0\\.5 { margin-left: 0.125rem; }

    /* Typography */
    .prs-text-\\[10px\\] { font-size: 10px; }
    .prs-text-xs { font-size: 0.75rem; line-height: 1rem; }
    .prs-text-sm { font-size: 0.875rem; line-height: 1.25rem; }
    .prs-font-bold { font-weight: 700; }
    .prs-font-medium { font-weight: 500; }
    .prs-font-semibold { font-weight: 600; }
    .prs-text-center { text-align: center; }
    .prs-leading-relaxed { line-height: 1.625; }
    .prs-truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .prs-whitespace-pre-wrap { white-space: pre-wrap; }
    .prs-inline-block { display: inline-block; }
    .prs-align-middle { vertical-align: middle; }

    /* Colors */
    .prs-text-white { color: #ffffff; }
    .prs-text-neutral-400 { color: #a3a3a3; }
    .prs-text-neutral-600 { color: #525252; }
    .prs-text-neutral-700 { color: #404040; }
    .prs-text-neutral-900 { color: #171717; }
    .prs-text-red-600 { color: #dc2626; }
    .prs-bg-white { background-color: #ffffff; }
    .prs-bg-neutral-100 { background-color: #f5f5f5; }
    .prs-bg-purple-100 { background-color: #f3e8ff; }
    .prs-bg-purple-500 { background-color: #a855f7; }
    .prs-bg-purple-600 { background-color: #7c3aed; }
    .prs-bg-red-50 { background-color: #fef2f2; }
    .prs-bg-red-500 { background-color: #ef4444; }
    .prs-placeholder-neutral-400::placeholder { color: #a3a3a3; }

    /* Borders */
    .prs-border { border-width: 1px; border-style: solid; }
    .prs-border-l { border-left-width: 1px; border-left-style: solid; }
    .prs-border-t { border-top-width: 1px; border-top-style: solid; }
    .prs-border-b { border-bottom-width: 1px; border-bottom-style: solid; }
    .prs-border-neutral-200 { border-color: #e5e5e5; }
    .prs-border-neutral-300 { border-color: #d4d4d4; }
    .prs-border-red-100 { border-color: #fee2e2; }
    .prs-border-transparent { border-color: transparent; }
    .prs-border-0 { border: 0; }
    .prs-rounded-md { border-radius: 0.375rem; }
    .prs-rounded-lg { border-radius: 0.5rem; }
    .prs-rounded-xl { border-radius: 0.75rem; }
    .prs-rounded-full { border-radius: 9999px; }
    .prs-rounded-sm { border-radius: 0.125rem; }

    /* Effects */
    .prs-shadow-lg { box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1); }
    .prs-shadow-2xl { box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); }
    .prs-transition-all { transition: all 0.15s ease; }
    .prs-transition-colors { transition: color 0.15s ease, background-color 0.15s ease, border-color 0.15s ease; }
    .prs-outline-none { outline: none; }
    .prs-resize-none { resize: none; }
    .prs-overflow-y-auto { overflow-y: auto; }
    .prs-cursor-pointer { cursor: pointer; }
    .prs-overflow-hidden { overflow: hidden; }

    /* Z-index */
    .prs-z-\\[2147483646\\] { z-index: 2147483646; }
    .prs-z-\\[2147483647\\] { z-index: 2147483647; }

    /* Hover */
    .hover\\:prs-bg-purple-700:hover { background-color: #6d28d9; }
    .hover\\:prs-bg-red-600:hover { background-color: #dc2626; }
    .hover\\:prs-bg-neutral-100:hover { background-color: #f5f5f5; }
    .hover\\:prs-text-neutral-600:hover { color: #525252; }
    .hover\\:prs-shadow-xl:hover { box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1); }

    /* Focus */
    .focus\\:prs-ring-2:focus { box-shadow: 0 0 0 2px #a855f7; }
    .focus\\:prs-border-transparent:focus { border-color: transparent; }

    /* Disabled */
    .disabled\\:prs-opacity-40:disabled { opacity: 0.4; }
    .disabled\\:prs-opacity-50:disabled { opacity: 0.5; }
    .disabled\\:prs-cursor-not-allowed:disabled { cursor: not-allowed; }
  `;
}

mount();
