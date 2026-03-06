/**
 * Detects GitHub's active color scheme and returns the correct icon URL.
 *
 * GitHub sets attributes on <html>:
 *   data-color-mode: "light" | "dark" | "auto"
 *   data-light-theme / data-dark-theme: the specific theme names
 *
 * When mode is "auto", GitHub applies a theme via a [data-color-mode=auto]
 * media-query rule. We check the resolved background color to know which
 * theme is actually visible.
 */
function isGitHubDarkMode(): boolean {
  const html = document.documentElement;
  const mode = html.getAttribute("data-color-mode");

  if (mode === "dark") return true;
  if (mode === "light") return false;

  // "auto" or unset — check the actual rendered background luminance
  const bg = getComputedStyle(document.body).backgroundColor;
  const match = bg.match(/\d+/g);
  if (match && match.length >= 3) {
    const [r, g, b] = match.map(Number);
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    return luminance < 128;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function getIconUrl(size: 16 | 48 | 128 = 48): string {
  const folder = isGitHubDarkMode() ? "dark-mode" : "light-mode";
  return chrome.runtime.getURL(`${folder}/icon-${size}.png`);
}
