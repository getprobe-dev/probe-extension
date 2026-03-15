export function getIconUrl(size: 48 | 128 = 48): string {
  try {
    return chrome.runtime.getURL(`icon-${size}.png`);
  } catch {
    return "";
  }
}
