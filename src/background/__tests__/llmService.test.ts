import { describe, it, expect } from "vitest";
import {
  buildAnthropicRequest,
  buildOpenAIRequest,
  extractTextFromResponse,
  extractStreamDelta,
} from "../llmService";

describe("buildAnthropicRequest", () => {
  const result = buildAnthropicRequest(
    "sk-ant-test",
    "https://proxy.example.com",
    { model: "claude-opus-4-6", max_tokens: 500, messages: [{ role: "user", content: "hi" }] },
  );

  it("routes through the proxy to /v1/messages", () => {
    expect(result.endpoint).toBe("https://proxy.example.com/v1/messages");
  });

  it("sets x-api-key and anthropic-version headers", () => {
    const headers = result.init.headers as Record<string, string>;
    expect(headers["x-api-key"]).toBe("sk-ant-test");
    expect(headers["anthropic-version"]).toBe("2023-06-01");
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("does not set Authorization header", () => {
    const headers = result.init.headers as Record<string, string>;
    expect(headers["Authorization"]).toBeUndefined();
  });

  it("serialises the body as JSON", () => {
    const body = JSON.parse(result.init.body as string);
    expect(body.model).toBe("claude-opus-4-6");
    expect(body.max_tokens).toBe(500);
  });

  it("strips trailing slash from proxy URL", () => {
    const r = buildAnthropicRequest("key", "https://proxy.example.com/", { model: "x" });
    expect(r.endpoint).toBe("https://proxy.example.com/v1/messages");
  });

  it("passes through signal when provided", () => {
    const controller = new AbortController();
    const r = buildAnthropicRequest("key", "https://proxy.example.com", { model: "x" }, controller.signal);
    expect(r.init.signal).toBe(controller.signal);
  });
});

describe("buildOpenAIRequest", () => {
  const result = buildOpenAIRequest(
    "sk-test",
    "https://proxy.example.com",
    { model: "gpt-4o", max_tokens: 500, messages: [{ role: "user", content: "hi" }] },
  );

  it("routes through the proxy with /openai/ prefix", () => {
    expect(result.endpoint).toBe("https://proxy.example.com/openai/v1/chat/completions");
  });

  it("sets Authorization Bearer header", () => {
    const headers = result.init.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer sk-test");
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("does not set x-api-key header", () => {
    const headers = result.init.headers as Record<string, string>;
    expect(headers["x-api-key"]).toBeUndefined();
  });

  it("serialises the body as JSON", () => {
    const body = JSON.parse(result.init.body as string);
    expect(body.model).toBe("gpt-4o");
    expect(body.max_tokens).toBe(500);
  });

  it("passes through signal when provided", () => {
    const controller = new AbortController();
    const r = buildOpenAIRequest("key", "https://proxy.example.com", { model: "x" }, controller.signal);
    expect(r.init.signal).toBe(controller.signal);
  });
});

describe("extractTextFromResponse", () => {
  it("extracts text from an Anthropic response", () => {
    const data = { content: [{ type: "text", text: "Hello from Claude" }] };
    expect(extractTextFromResponse("anthropic", data)).toBe("Hello from Claude");
  });

  it("extracts text from an OpenAI response", () => {
    const data = { choices: [{ message: { role: "assistant", content: "Hello from GPT" } }] };
    expect(extractTextFromResponse("openai", data)).toBe("Hello from GPT");
  });

  it("returns empty string for empty Anthropic content", () => {
    expect(extractTextFromResponse("anthropic", { content: [] })).toBe("");
    expect(extractTextFromResponse("anthropic", {})).toBe("");
  });

  it("returns empty string for empty OpenAI choices", () => {
    expect(extractTextFromResponse("openai", { choices: [] })).toBe("");
    expect(extractTextFromResponse("openai", {})).toBe("");
  });
});

describe("extractStreamDelta", () => {
  it("extracts delta from an Anthropic content_block_delta event", () => {
    const event = { type: "content_block_delta", delta: { type: "text_delta", text: "chunk" } };
    expect(extractStreamDelta("anthropic", event)).toBe("chunk");
  });

  it("returns null for non-text Anthropic events", () => {
    expect(extractStreamDelta("anthropic", { type: "message_start" })).toBeNull();
    expect(extractStreamDelta("anthropic", { type: "content_block_start" })).toBeNull();
  });

  it("extracts delta from an OpenAI streaming event", () => {
    const event = { choices: [{ delta: { content: "chunk" } }] };
    expect(extractStreamDelta("openai", event)).toBe("chunk");
  });

  it("returns null for OpenAI events without content delta", () => {
    expect(extractStreamDelta("openai", { choices: [{ delta: {} }] })).toBeNull();
    expect(extractStreamDelta("openai", { choices: [] })).toBeNull();
  });
});
