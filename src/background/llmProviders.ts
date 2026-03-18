import type { LLMProvider } from "../shared/config";

export const ANTHROPIC_API_VERSION = "2023-06-01";

export function buildAnthropicRequest(
  apiKey: string,
  proxyUrl: string,
  body: Record<string, unknown>,
  signal?: AbortSignal,
): { endpoint: string; init: RequestInit } {
  return {
    endpoint: `${proxyUrl.replace(/\/$/, "")}/v1/messages`,
    init: {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_API_VERSION,
      },
      body: JSON.stringify(body),
      signal,
    },
  };
}

export function buildOpenAIRequest(
  apiKey: string,
  proxyUrl: string,
  body: Record<string, unknown>,
  signal?: AbortSignal,
): { endpoint: string; init: RequestInit } {
  return {
    endpoint: `${proxyUrl.replace(/\/$/, "")}/openai/v1/chat/completions`,
    init: {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal,
    },
  };
}

export function extractTextFromResponse(
  provider: LLMProvider,
  data: Record<string, unknown>,
): string {
  if (provider === "openai") {
    const choices = data.choices as Array<{ message?: { content?: string } }> | undefined;
    return choices?.[0]?.message?.content ?? "";
  }
  const content = data.content as Array<{ text?: string }> | undefined;
  return content?.[0]?.text ?? "";
}

export function extractStreamDelta(
  provider: LLMProvider,
  event: Record<string, unknown>,
): string | null {
  if (provider === "openai") {
    const choices = event.choices as Array<{ delta?: { content?: string } }> | undefined;
    return choices?.[0]?.delta?.content ?? null;
  }
  if (event.type === "content_block_delta") {
    const delta = event.delta as { type?: string; text?: string } | undefined;
    if (delta?.type === "text_delta") return delta.text ?? null;
  }
  return null;
}
