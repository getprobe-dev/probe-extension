const ALLOWED_ORIGINS: string[] = [
  // Chrome extensions use chrome-extension://<id> as origin.
  // Add your published extension ID here after publishing.
  // During development any chrome-extension:// origin is allowed.
];

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (origin.startsWith("chrome-extension://")) return true;
  return ALLOWED_ORIGINS.includes(origin);
}

function corsHeaders(origin: string): HeadersInit {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-api-key, anthropic-version, Authorization",
    Vary: "Origin",
  };
}

interface RouteConfig {
  targetBase: string;
  forwardHeaders: string[];
}

const OPENAI_PREFIX = "/openai/";

function resolveRoute(pathname: string): RouteConfig {
  if (pathname.startsWith(OPENAI_PREFIX)) {
    return {
      targetBase: "https://api.openai.com",
      forwardHeaders: ["content-type", "authorization"],
    };
  }
  return {
    targetBase: "https://api.anthropic.com",
    forwardHeaders: ["content-type", "x-api-key", "anthropic-version"],
  };
}

export default {
  async fetch(request: Request): Promise<Response> {
    const origin = request.headers.get("Origin");

    if (!origin || !isAllowedOrigin(origin)) {
      return new Response("Forbidden", { status: 403 });
    }

    const cors = corsHeaders(origin);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    const url = new URL(request.url);

    if (request.method === "GET") {
      // Only allow GET for models listing endpoints.
      if (!url.pathname.endsWith("/models")) {
        return new Response("Method not allowed", { status: 405, headers: cors });
      }
    } else if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: cors });
    }

    const route = resolveRoute(url.pathname);

    const upstreamPath = url.pathname.startsWith(OPENAI_PREFIX)
      ? url.pathname.slice(OPENAI_PREFIX.length - 1)
      : url.pathname;

    const target = `${route.targetBase}${upstreamPath}${url.search}`;

    const headers = new Headers();
    for (const key of route.forwardHeaders) {
      const val = request.headers.get(key);
      if (val) headers.set(key, val);
    }

    const response = await fetch(target, {
      method: request.method,
      headers,
      body: request.method === "GET" ? undefined : request.body,
    });

    const responseHeaders = new Headers(response.headers);
    for (const [k, v] of Object.entries(cors)) {
      responseHeaders.set(k, v);
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  },
} satisfies ExportedHandler;
