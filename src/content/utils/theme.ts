/**
 * Detects GitHub's active color scheme and returns the correct icon URL.
 *
 * GitHub sets `data-color-mode` on <html>:
 *   "light" | "dark" | "auto" (follows OS preference)
 */
function isGitHubDarkMode(): boolean {
  const html = document.documentElement;
  const mode = html.getAttribute("data-color-mode");

  if (mode === "dark") return true;
  if (mode === "light") return false;

  // "auto" — fall back to OS-level preference
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function getIconUrl(size: 16 | 48 | 128 = 48): string {
  const folder = isGitHubDarkMode() ? "dark-mode" : "light-mode";
  return chrome.runtime.getURL(`${folder}/icon-${size}.png`);
}
