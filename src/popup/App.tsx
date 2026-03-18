import { useEffect, useState, useCallback } from "react";
import { ChevronDown, ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { STORAGE_KEYS, DEFAULT_MODELS, MODELS_CACHE_TTL_MS } from "../shared/config";
import type { LLMProvider } from "../shared/config";
import type { FetchModelsResponse } from "../shared/types";

const PROVIDER_META: Record<LLMProvider, { label: string; keyUrl: string; placeholder: string }> = {
  anthropic: {
    label: "Anthropic API Key",
    keyUrl: "https://platform.claude.com/settings/keys",
    placeholder: "sk-ant-...",
  },
  openai: {
    label: "OpenAI API Key",
    keyUrl: "https://platform.openai.com/api-keys",
    placeholder: "sk-...",
  },
};

interface ModelsCacheEntry {
  models: string[];
  cachedAt: number;
}

export function PopupApp() {
  const [provider, setProvider] = useState<LLMProvider>("anthropic");
  const [apiKey, setApiKey] = useState("");
  const [modelName, setModelName] = useState(DEFAULT_MODELS.anthropic);
  const [githubToken, setGithubToken] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [storedValues, setStoredValues] = useState({
    provider: "anthropic" as LLMProvider,
    apiKey: "",
    modelName: DEFAULT_MODELS.anthropic,
    githubToken: "",
  });

  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsFetchFailed, setModelsFetchFailed] = useState(false);

  const fetchModels = useCallback((forProvider: LLMProvider, forKey: string, bustCache = false) => {
    if (!forKey.trim()) return;

    const cacheKey = STORAGE_KEYS.modelsCache(forProvider);

    chrome.storage.local.get([cacheKey], (result) => {
      const cached = result[cacheKey] as ModelsCacheEntry | undefined;
      if (
        !bustCache &&
        cached &&
        Date.now() - cached.cachedAt < MODELS_CACHE_TTL_MS &&
        cached.models.length > 0
      ) {
        setAvailableModels(cached.models);
        return;
      }

      setModelsLoading(true);
      setModelsFetchFailed(false);

      chrome.runtime.sendMessage(
        { type: "fetch-models", provider: forProvider, apiKey: forKey },
        (response: FetchModelsResponse) => {
          setModelsLoading(false);
          if (response?.ok && response.models && response.models.length > 0) {
            setAvailableModels(response.models);
            setModelsFetchFailed(false);
            chrome.storage.local.set({
              [cacheKey]: { models: response.models, cachedAt: Date.now() },
            });
          } else {
            setModelsFetchFailed(true);
          }
        },
      );
    });
  }, []);

  useEffect(() => {
    chrome.storage.sync.get(
      [
        STORAGE_KEYS.API_KEY,
        STORAGE_KEYS.LLM_PROVIDER,
        STORAGE_KEYS.MODEL_NAME,
        STORAGE_KEYS.GITHUB_TOKEN,
      ],
      (result) => {
        const prov = (result[STORAGE_KEYS.LLM_PROVIDER] as LLMProvider) || "anthropic";
        const key = (result[STORAGE_KEYS.API_KEY] as string) ?? "";
        const model = (result[STORAGE_KEYS.MODEL_NAME] as string) || DEFAULT_MODELS[prov];
        const token = (result[STORAGE_KEYS.GITHUB_TOKEN] as string) ?? "";
        setProvider(prov);
        setApiKey(key);
        setModelName(model);
        setGithubToken(token);
        setStoredValues({ provider: prov, apiKey: key, modelName: model, githubToken: token });
        setLoading(false);
        if (key) fetchModels(prov, key);
      },
    );
  }, [fetchModels]);

  const hasDelta =
    provider !== storedValues.provider ||
    apiKey.trim() !== storedValues.apiKey ||
    modelName.trim() !== storedValues.modelName ||
    githubToken.trim() !== storedValues.githubToken;

  const hasStored = !!storedValues.apiKey && !!storedValues.githubToken;

  const handleProviderChange = (p: LLMProvider) => {
    setProvider(p);
    setModelName(DEFAULT_MODELS[p]);
    setAvailableModels([]);
    setModelsFetchFailed(false);
    setSaved(false);
    if (apiKey.trim()) fetchModels(p, apiKey.trim());
  };

  const handleApiKeyBlur = () => {
    if (apiKey.trim()) fetchModels(provider, apiKey.trim());
  };

  const handleSave = () => {
    const trimmedKey = apiKey.trim();
    const trimmedModel = modelName.trim() || DEFAULT_MODELS[provider];
    const trimmedGithub = githubToken.trim();
    if (!trimmedKey || !trimmedGithub) return;

    const settings: Record<string, string> = {
      [STORAGE_KEYS.LLM_PROVIDER]: provider,
      [STORAGE_KEYS.API_KEY]: trimmedKey,
      [STORAGE_KEYS.MODEL_NAME]: trimmedModel,
      [STORAGE_KEYS.GITHUB_TOKEN]: trimmedGithub,
    };

    chrome.storage.sync.set(settings, () => {
      setStoredValues({
        provider,
        apiKey: trimmedKey,
        modelName: trimmedModel,
        githubToken: trimmedGithub,
      });
      setSaved(true);
      setTimeout(() => window.close(), 2000);
    });
  };

  const handleClear = () => {
    chrome.storage.sync.remove(
      [
        STORAGE_KEYS.API_KEY,
        STORAGE_KEYS.LLM_PROVIDER,
        STORAGE_KEYS.MODEL_NAME,
        STORAGE_KEYS.PROXY_URL,
        STORAGE_KEYS.GITHUB_TOKEN,
      ],
      () => {
        setProvider("anthropic");
        setApiKey("");
        setModelName(DEFAULT_MODELS.anthropic);
        setGithubToken("");
        setAvailableModels([]);
        setModelsFetchFailed(false);
        setStoredValues({
          provider: "anthropic",
          apiKey: "",
          modelName: DEFAULT_MODELS.anthropic,
          githubToken: "",
        });
        setSaved(false);
      },
    );
  };

  if (loading) {
    return (
      <div className="w-80 p-10 flex items-center justify-center">
        <img
          src={chrome.runtime.getURL("icon-48.png")}
          alt="PRobe"
          width={40}
          height={40}
          className="rounded-xl animate-pulse"
        />
      </div>
    );
  }

  const logoUrl = chrome.runtime.getURL("icon-48.png");
  const inputClass =
    "w-full px-3 py-2.5 text-sm border border-input rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary/40 transition-all";
  const selectClass =
    "w-full pl-3 pr-8 py-2.5 text-sm border border-input rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary/40 transition-all appearance-none cursor-pointer";

  const showSave = hasDelta && apiKey.trim().length > 0 && githubToken.trim().length > 0;
  const showClear = hasStored || apiKey.trim().length > 0;

  const meta = PROVIDER_META[provider];

  const providerTabClass = (p: LLMProvider) =>
    `flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
      provider === p
        ? "bg-background text-foreground shadow-sm"
        : "text-muted-foreground hover:text-foreground"
    }`;

  const showDropdown = availableModels.length > 0;
  const modelsToShow = showDropdown
    ? availableModels.includes(modelName)
      ? availableModels
      : [modelName, ...availableModels]
    : [];

  return (
    <div className="w-80">
      {/* Branded header */}
      <div className="flex items-center gap-2.5 px-5 pt-5 pb-4 bg-[#1a2e2b] text-white rounded-b-2xl mb-4">
        <img
          src={logoUrl}
          alt="PRobe"
          width={30}
          height={30}
          className="rounded-lg ring-1 ring-white/10"
        />
        <h1 className="text-lg font-bold tracking-tight">PRobe</h1>
      </div>

      <div className="px-5 pb-5">
        {/* Provider selector */}
        <span className="block mb-1.5 text-xs font-semibold text-foreground tracking-wide uppercase opacity-70">
          LLM Provider
        </span>
        <div
          className="flex gap-1 p-1 mb-4 rounded-xl bg-muted/60 border border-border/50"
          role="group"
          aria-label="LLM Provider"
        >
          <button
            type="button"
            className={providerTabClass("anthropic")}
            onClick={() => handleProviderChange("anthropic")}
          >
            Anthropic
          </button>
          <button
            type="button"
            className={providerTabClass("openai")}
            onClick={() => handleProviderChange("openai")}
          >
            OpenAI
          </button>
        </div>

        <a
          href={meta.keyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 mb-1.5 text-xs font-semibold text-foreground tracking-wide uppercase opacity-70 hover:opacity-100 transition-opacity w-fit"
        >
          {meta.label}
          <ExternalLink className="size-2.5 opacity-40" />
        </a>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => {
            setApiKey(e.target.value);
            setSaved(false);
          }}
          onBlur={handleApiKeyBlur}
          placeholder={meta.placeholder}
          className={inputClass}
        />

        {/* Model selector */}
        <div className="flex items-center justify-between mb-1.5 mt-4">
          <label
            htmlFor="model-name"
            className="text-xs font-semibold text-foreground tracking-wide uppercase opacity-70"
          >
            Model
          </label>
          {apiKey.trim() && (
            <button
              type="button"
              onClick={() => fetchModels(provider, apiKey.trim(), true)}
              disabled={modelsLoading}
              aria-label="Refresh models"
              className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
            >
              <RefreshCw className={`size-3 ${modelsLoading ? "animate-spin" : ""}`} />
            </button>
          )}
        </div>

        {showDropdown ? (
          <div className="relative">
            <select
              id="model-name"
              value={modelName}
              onChange={(e) => {
                setModelName(e.target.value);
                setSaved(false);
              }}
              className={selectClass}
            >
              {modelsToShow.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground"
              aria-hidden
            />
          </div>
        ) : (
          <input
            id="model-name"
            type="text"
            value={modelName}
            onChange={(e) => {
              setModelName(e.target.value);
              setSaved(false);
            }}
            placeholder={
              modelsLoading
                ? "Loading models…"
                : modelsFetchFailed
                  ? DEFAULT_MODELS[provider]
                  : DEFAULT_MODELS[provider]
            }
            disabled={modelsLoading}
            className={inputClass}
          />
        )}
        {modelsFetchFailed && !showDropdown && (
          <p className="mt-1 text-[0.62rem] text-muted-foreground">
            Could not fetch models — enter a model name manually.
          </p>
        )}

        <a
          href="https://github.com/settings/tokens/new?scopes=repo&description=PRobe"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 mb-1.5 mt-4 text-xs font-semibold text-foreground tracking-wide uppercase opacity-70 hover:opacity-100 transition-opacity w-fit"
        >
          GitHub Token
          <ExternalLink className="size-2.5 opacity-40" />
        </a>
        <input
          type="password"
          value={githubToken}
          onChange={(e) => {
            setGithubToken(e.target.value);
            setSaved(false);
          }}
          placeholder="ghp_..."
          className={inputClass}
        />
        <p className="mt-1 text-[0.62rem] text-muted-foreground">
          Classic token with{" "}
          <code className="text-[0.6rem] bg-muted px-1 py-0.5 rounded font-medium">repo</code> scope
        </p>

        <div className="flex gap-2 mt-4">
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

        {saved && (
          <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-center gap-1 animate-in fade-in duration-300">
            <kbd className="inline-flex items-center justify-center min-w-6 h-5 px-1 rounded border border-border bg-gradient-to-b from-white to-muted text-[0.55rem] font-semibold text-foreground/50 shadow-[0_1px_0_0_oklch(0.85_0_0)]">
              &#x2318;
            </kbd>
            <kbd className="inline-flex items-center justify-center min-w-6 h-5 px-1 rounded border border-border bg-gradient-to-b from-white to-muted text-[0.55rem] font-semibold text-foreground/50 shadow-[0_1px_0_0_oklch(0.85_0_0)]">
              &#x21E7;
            </kbd>
            <kbd className="inline-flex items-center justify-center min-w-6 h-5 px-1 rounded border border-border bg-gradient-to-b from-white to-muted text-[0.55rem] font-semibold text-foreground/50 shadow-[0_1px_0_0_oklch(0.85_0_0)]">
              P
            </kbd>
          </div>
        )}
      </div>
    </div>
  );
}
