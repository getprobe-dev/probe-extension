import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { STORAGE_KEYS, DEFAULT_PROXY_URL } from "../shared/types";

export function PopupApp() {
  const [apiKey, setApiKey] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  const storedRef = useRef({ apiKey: "", githubToken: "" });

  useEffect(() => {
    chrome.storage.sync.get(
      [STORAGE_KEYS.API_KEY, STORAGE_KEYS.GITHUB_TOKEN],
      (result) => {
        const key = (result[STORAGE_KEYS.API_KEY] as string) ?? "";
        const token = (result[STORAGE_KEYS.GITHUB_TOKEN] as string) ?? "";
        setApiKey(key);
        setGithubToken(token);
        storedRef.current = { apiKey: key, githubToken: token };
        setLoading(false);
      }
    );
  }, []);

  const hasDelta =
    apiKey.trim() !== storedRef.current.apiKey ||
    githubToken.trim() !== storedRef.current.githubToken;

  const hasStored = !!storedRef.current.apiKey;

  const handleSave = () => {
    const trimmedKey = apiKey.trim();
    if (!trimmedKey) return;

    const settings: Record<string, string> = {
      [STORAGE_KEYS.API_KEY]: trimmedKey,
    };

    const trimmedGithub = githubToken.trim();
    if (trimmedGithub) {
      settings[STORAGE_KEYS.GITHUB_TOKEN] = trimmedGithub;
    } else {
      chrome.storage.sync.remove(STORAGE_KEYS.GITHUB_TOKEN);
    }

    chrome.storage.sync.set(settings, () => {
      storedRef.current = { apiKey: trimmedKey, githubToken: trimmedGithub };
      setSaved(true);
    });
  };

  const handleClear = () => {
    chrome.storage.sync.remove(
      [STORAGE_KEYS.API_KEY, STORAGE_KEYS.PROXY_URL, STORAGE_KEYS.GITHUB_TOKEN],
      () => {
        setApiKey("");
        setGithubToken("");
        storedRef.current = { apiKey: "", githubToken: "" };
        setSaved(false);
      }
    );
  };

  if (loading) {
    return (
      <div className="w-80 p-5 font-sans text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }

  const logoUrl = chrome.runtime.getURL("icon-48.png");
  const inputClass = "w-full px-3 py-2.5 text-sm border border-input rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary/40 transition-all";

  const showSave = hasDelta && apiKey.trim().length > 0;
  const showClear = hasStored || apiKey.trim().length > 0;

  return (
    <div className="w-80 font-sans">
      {/* Branded header */}
      <div className="flex items-center gap-2.5 px-5 pt-5 pb-4 bg-[#1a2e2b] text-white rounded-b-2xl mb-4">
        <img
          src={logoUrl}
          alt="PRobe"
          width={30}
          height={30}
          className="rounded-lg ring-1 ring-white/10"
        />
        <h1 className="text-lg font-bold tracking-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>PRobe</h1>
      </div>

      <div className="px-5 pb-5">
        <label className="block text-xs font-semibold text-foreground mb-1.5 tracking-wide uppercase opacity-70">
          Anthropic API Key
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => { setApiKey(e.target.value); setSaved(false); }}
          placeholder="sk-ant-..."
          className={inputClass}
        />
        <p className="mt-1.5 text-[0.68rem] text-muted-foreground leading-relaxed">
          Your key is stored locally and sent only through the proxy to
          Anthropic's API.
        </p>

        <label className="block text-xs font-semibold text-foreground mb-1.5 mt-4 tracking-wide uppercase opacity-70">
          GitHub Classic Token
          <span className="text-muted-foreground font-normal normal-case tracking-normal"> (optional)</span>
        </label>
        <input
          type="password"
          value={githubToken}
          onChange={(e) => { setGithubToken(e.target.value); setSaved(false); }}
          placeholder="ghp_..."
          className={inputClass}
        />
        <p className="mt-1.5 text-[0.68rem] text-muted-foreground leading-relaxed">
          Enables posting comments to PRs. Needs <code className="text-[0.65rem] bg-muted px-1 py-0.5 rounded-md font-medium">repo</code> scope.
        </p>

        <div className="flex gap-2 mt-5">
          {saved ? (
            <Button
              disabled
              className="flex-1 rounded-xl text-white bg-teal-700 shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)] translate-y-px transition-all"
            >
              Saved!
            </Button>
          ) : showSave ? (
            <Button
              onClick={handleSave}
              className="flex-1 rounded-xl text-white cursor-pointer bg-gradient-to-b from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 shadow-[0_2px_0_0_rgba(0,0,0,0.15),0_2px_6px_rgba(0,0,0,0.1)] active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)] active:translate-y-px transition-all"
            >
              Save
            </Button>
          ) : null}
          {showClear && !saved && (
            <Button
              variant="secondary"
              onClick={handleClear}
              className={`rounded-xl cursor-pointer shadow-[0_2px_0_0_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.06)] active:shadow-[inset_0_2px_3px_rgba(0,0,0,0.1)] active:translate-y-px transition-all ${!showSave ? "flex-1" : ""}`}
            >
              Clear
            </Button>
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-border/50 text-[0.7rem] text-muted-foreground/70 text-center space-y-2">
          <p>Open any GitHub PR and click the floating button to start chatting.</p>
          <div className="flex items-center justify-center gap-1">
            <kbd className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 rounded-md border border-border bg-gradient-to-b from-white to-muted text-[0.6rem] font-semibold text-foreground/70 shadow-[0_2px_0_0_oklch(0.85_0_0),0_2px_3px_oklch(0_0_0/0.1)]">&#x2318;</kbd>
            <kbd className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 rounded-md border border-border bg-gradient-to-b from-white to-muted text-[0.6rem] font-semibold text-foreground/70 shadow-[0_2px_0_0_oklch(0.85_0_0),0_2px_3px_oklch(0_0_0/0.1)]">&#x21E7;</kbd>
            <kbd className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 rounded-md border border-border bg-gradient-to-b from-white to-muted text-[0.6rem] font-semibold text-foreground/70 shadow-[0_2px_0_0_oklch(0.85_0_0),0_2px_3px_oklch(0_0_0/0.1)]">P</kbd>
          </div>
        </div>
      </div>
    </div>
  );
}
