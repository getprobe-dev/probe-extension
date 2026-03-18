import type { LLMProvider } from "../../shared/config";

interface ProviderSelectorProps {
  provider: LLMProvider;
  onChange: (provider: LLMProvider) => void;
}

const PROVIDERS: { value: LLMProvider; label: string }[] = [
  { value: "anthropic", label: "Anthropic" },
  { value: "openai", label: "OpenAI" },
];

export function ProviderSelector({ provider, onChange }: ProviderSelectorProps) {
  const tabClass = (p: LLMProvider) =>
    `flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
      provider === p
        ? "bg-background text-foreground shadow-sm"
        : "text-muted-foreground hover:text-foreground"
    }`;

  return (
    <div>
      <span className="block mb-1.5 text-xs font-semibold text-foreground tracking-wide uppercase opacity-70">
        LLM Provider
      </span>
      <div
        className="flex gap-1 p-1 mb-4 rounded-xl bg-muted/60 border border-border/50"
        role="group"
        aria-label="LLM Provider"
      >
        {PROVIDERS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            className={tabClass(value)}
            onClick={() => onChange(value)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
