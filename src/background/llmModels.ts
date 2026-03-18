import { ANTHROPIC_API_VERSION } from "./llmProviders";
import { getSettings } from "./llmService";
import type { LLMProvider } from "../shared/config";

export async function fetchModels(
  provider: LLMProvider,
  apiKey: string,
  proxyUrl: string,
): Promise<string[]> {
  const endpoint =
    provider === "openai"
      ? `${proxyUrl.replace(/\/$/, "")}/openai/v1/models`
      : `${proxyUrl.replace(/\/$/, "")}/v1/models`;

  const headers: Record<string, string> =
    provider === "openai"
      ? { Authorization: `Bearer ${apiKey}` }
      : { "x-api-key": apiKey, "anthropic-version": ANTHROPIC_API_VERSION };

  const response = await fetch(endpoint, { method: "GET", headers });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const data = (await response.json()) as { data: { id: string; created?: number }[] };

  // Sort newest-first using the `created` timestamp every provider includes.
  // This naturally surfaces the latest models without any provider-specific logic.
  return data.data
    .slice()
    .sort((a, b) => (b.created ?? 0) - (a.created ?? 0))
    .map((m) => m.id);
}

export async function handleFetchModels(
  provider: LLMProvider,
  apiKey: string,
): Promise<{ ok: boolean; models?: string[]; error?: string }> {
  try {
    const { proxyUrl } = await getSettings();
    const models = await fetchModels(provider, apiKey, proxyUrl);
    return { ok: true, models };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to fetch models" };
  }
}
