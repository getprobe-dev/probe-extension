import { ChevronDown, RefreshCw } from "lucide-react";
import { DEFAULT_MODELS } from "../../shared/config";
import type { LLMProvider } from "../../shared/config";

interface ModelSelectorProps {
  provider: LLMProvider;
  modelName: string;
  availableModels: string[];
  modelsLoading: boolean;
  modelsFetchFailed: boolean;
  apiKey: string;
  onModelChange: (model: string) => void;
  onRefresh: () => void;
}

const inputClass =
  "w-full px-3 py-2.5 text-sm border border-input rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary/40 transition-all";

const selectClass =
  "w-full pl-3 pr-8 py-2.5 text-sm border border-input rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary/40 transition-all appearance-none cursor-pointer";

export function ModelSelector({
  provider,
  modelName,
  availableModels,
  modelsLoading,
  modelsFetchFailed,
  apiKey,
  onModelChange,
  onRefresh,
}: ModelSelectorProps) {
  const showDropdown = availableModels.length > 0;
  const modelsToShow =
    showDropdown && !availableModels.includes(modelName)
      ? [modelName, ...availableModels]
      : availableModels;

  return (
    <div>
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
            onClick={onRefresh}
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
            onChange={(e) => onModelChange(e.target.value)}
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
          onChange={(e) => onModelChange(e.target.value)}
          placeholder={modelsLoading ? "Loading models…" : DEFAULT_MODELS[provider]}
          disabled={modelsLoading}
          className={inputClass}
        />
      )}

      {modelsFetchFailed && !showDropdown && (
        <p className="mt-1 text-[0.62rem] text-muted-foreground">
          Could not fetch models — enter a model name manually.
        </p>
      )}
    </div>
  );
}
