import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { STORAGE_KEYS, DEFAULT_MODELS } from "../shared/config";
import type { LLMProvider } from "../shared/config";
import { useModels } from "./hooks/useModels";
import { ProviderSelector } from "./components/ProviderSelector";
import { ModelSelector } from "./components/ModelSelector";

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

const inputClass =
  "w-full px-3 py-2.5 text-sm border border-input rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary/40 transition-all";

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

  const { availableModels, modelsLoading, modelsFetchFailed, fetchModels, clearModels } =
    useModels();

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
    clearModels();
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
        clearModels();
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

  const meta = PROVIDER_META[provider];
  const showSave = hasDelta && apiKey.trim().length > 0 && githubToken.trim().length > 0;
  const showClear = hasStored || apiKey.trim().length > 0;

  return (
    <div className="w-80">
      {/* Branded header */}
      <div className="flex items-center gap-2.5 px-5 pt-5 pb-4 bg-[#1a2e2b] text-white rounded-b-2xl mb-4">
        <img
          src={chrome.runtime.getURL("icon-48.png")}
          alt="PRobe"
          width={30}
          height={30}
          className="rounded-lg ring-1 ring-white/10"
        />
        <h1 className="text-lg font-bold tracking-tight">PRobe</h1>
      </div>

      <div className="px-5 pb-5">
        <ProviderSelector provider={provider} onChange={handleProviderChange} />

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

        <ModelSelector
          provider={provider}
          modelName={modelName}
          availableModels={availableModels}
          modelsLoading={modelsLoading}
          modelsFetchFailed={modelsFetchFailed}
          apiKey={apiKey}
          onModelChange={(m) => {
            setModelName(m);
            setSaved(false);
          }}
          onRefresh={() => fetchModels(provider, apiKey.trim(), true)}
        />

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
