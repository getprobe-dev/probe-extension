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
    "Access-Control-Allow-Headers": "Content-Type, x-api-key, anthropic-version",
    Vary: "Origin",
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

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: cors });
    }

    const url = new URL(request.url);
    const target = `https://api.anthropic.com${url.pathname}${url.search}`;

    const headers = new Headers();
    for (const key of ["content-type", "x-api-key", "anthropic-version"]) {
      const val = request.headers.get(key);
      if (val) headers.set(key, val);
    }

    const response = await fetch(target, {
      method: "POST",
      headers,
      body: request.body,
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
