import { useEffect } from "react";
import { getIconUrl } from "../utils/iconUtils";
import { STORAGE_KEYS } from "../../shared/config";

interface SetupGuideProps {
  onKeysReady: () => void;
}

function ChromeExtensionsIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M20.5 11H19V7c0-1.1-.9-2-2-2h-4V3.5a2.5 2.5 0 0 0-5 0V5H4c-1.1 0-2 .9-2 2v3.8h1.5c1.5 0 2.7 1.2 2.7 2.7s-1.2 2.7-2.7 2.7H2V20c0 1.1.9 2 2 2h3.8v-1.5c0-1.5 1.2-2.7 2.7-2.7s2.7 1.2 2.7 2.7V22H17c1.1 0 2-.9 2-2v-4h1.5a2.5 2.5 0 0 0 0-5Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function SetupGuide({ onKeysReady }: SetupGuideProps) {
  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area !== "sync") return;
      if (changes[STORAGE_KEYS.API_KEY] || changes[STORAGE_KEYS.GITHUB_TOKEN]) {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(onKeysReady, 100);
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => {
      chrome.storage.onChanged.removeListener(listener);
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [onKeysReady]);

  const handleOpenSettings = () => {
    chrome.runtime.sendMessage({ type: "open-popup" });
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 animate-fade-in">
      <img
        src={getIconUrl(128)}
        alt="PRobe"
        className="size-16 rounded-2xl mb-4 shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
      />
      <h2 className="text-base font-bold text-foreground tracking-tight mb-6">Welcome to PRobe</h2>

      <button
        onClick={handleOpenSettings}
        className="setup-btn w-full max-w-[240px] flex items-center gap-3 p-3.5 rounded-xl cursor-pointer"
      >
        <div className="shrink-0 size-9 rounded-lg bg-navy flex items-center justify-center">
          <ChromeExtensionsIcon className="size-5 text-mint" />
        </div>
        <div className="text-left min-w-0">
          <span className="text-[0.75rem] font-bold text-foreground block">
            Open PRobe Settings
          </span>
          <span className="text-[0.62rem] text-muted-foreground">Enter your keys and hit save</span>
        </div>
      </button>
    </div>
  );
}
