import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { STORAGE_KEYS, DEFAULT_PROXY_URL } from "../shared/types";

export function PopupApp() {
  const [apiKey, setApiKey] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [proxyUrl, setProxyUrl] = useState(DEFAULT_PROXY_URL);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    chrome.storage.sync.get(
      [STORAGE_KEYS.API_KEY, STORAGE_KEYS.PROXY_URL, STORAGE_KEYS.GITHUB_TOKEN],
      (result) => {
        if (result[STORAGE_KEYS.API_KEY]) {
          setApiKey(result[STORAGE_KEYS.API_KEY] as string);
        }
        if (result[STORAGE_KEYS.GITHUB_TOKEN]) {
          setGithubToken(result[STORAGE_KEYS.GITHUB_TOKEN] as string);
        }
        if (result[STORAGE_KEYS.PROXY_URL]) {
          setProxyUrl(result[STORAGE_KEYS.PROXY_URL] as string);
          setShowAdvanced(true);
        }
        setLoading(false);
      }
    );
  }, []);

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

    const trimmedProxy = proxyUrl.trim();
    if (trimmedProxy && trimmedProxy !== DEFAULT_PROXY_URL) {
      settings[STORAGE_KEYS.PROXY_URL] = trimmedProxy;
    } else {
      chrome.storage.sync.remove(STORAGE_KEYS.PROXY_URL);
    }

    chrome.storage.sync.set(settings, () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  };

  const handleClear = () => {
    chrome.storage.sync.remove(
      [STORAGE_KEYS.API_KEY, STORAGE_KEYS.PROXY_URL, STORAGE_KEYS.GITHUB_TOKEN],
      () => {
        setApiKey("");
        setGithubToken("");
        setProxyUrl(DEFAULT_PROXY_URL);
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

  return (
    <div className="w-80 p-5 font-sans">
      <div className="flex items-center gap-2 mb-4">
        <h1 className="text-base font-bold tracking-tight text-foreground">
          PRobe
        </h1>
      </div>

      <label className="block text-sm font-medium text-foreground mb-1.5">
        Anthropic API Key
      </label>
      <input
        type="password"
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        placeholder="sk-ant-..."
        className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-shadow"
      />
      <p className="mt-1 text-xs text-muted-foreground">
        Your key is stored locally and sent only through the proxy to
        Anthropic's API.
      </p>

      <label className="block text-sm font-medium text-foreground mb-1.5 mt-4">
        GitHub Token
        <span className="text-muted-foreground font-normal"> (optional)</span>
      </label>
      <input
        type="password"
        value={githubToken}
        onChange={(e) => setGithubToken(e.target.value)}
        placeholder="ghp_..."
        className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-shadow"
      />
      <p className="mt-1 text-xs text-muted-foreground">
        Enables posting comments to PRs. Needs <code className="text-xs bg-muted px-1 rounded">repo</code> scope.
      </p>

      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {showAdvanced ? "Hide" : "Show"} advanced settings
      </button>

      {showAdvanced && (
        <div className="mt-2">
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Proxy URL
          </label>
          <input
            type="url"
            value={proxyUrl}
            onChange={(e) => setProxyUrl(e.target.value)}
            placeholder={DEFAULT_PROXY_URL}
            className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-shadow"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Requests are routed through this proxy to avoid browser CORS
            restrictions. You can self-host your own.
          </p>
        </div>
      )}

      <div className="flex gap-2 mt-4">
        <Button
          onClick={handleSave}
          disabled={!apiKey.trim()}
          className="flex-1 bg-linear-to-br from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white"
        >
          {saved ? "Saved!" : "Save"}
        </Button>
        {apiKey && (
          <Button
            variant="secondary"
            onClick={handleClear}
          >
            Clear
          </Button>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-border text-xs text-muted-foreground">
        Open any GitHub PR and click the floating button to start chatting.
      </div>
    </div>
  );
}
