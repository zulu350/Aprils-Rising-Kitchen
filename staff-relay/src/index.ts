const DESK_HEADER = "x-ark-desk-key";

const ALLOWED: Array<{ method: string; pattern: RegExp }> = [
  { method: "GET", pattern: /^\/api\/staff\/health$/ },
  { method: "GET", pattern: /^\/api\/staff\/menu$/ },
  { method: "GET", pattern: /^\/api\/staff\/orders\/active$/ },
  { method: "GET", pattern: /^\/api\/staff\/orders\/ARK-\d+$/i },
  { method: "PATCH", pattern: /^\/api\/staff\/orders\/ARK-\d+$/i },
  { method: "POST", pattern: /^\/api\/staff\/orders\/preview$/ },
  { method: "GET", pattern: /^\/api\/staff\/orders$/ },
  { method: "POST", pattern: /^\/api\/staff\/orders$/ },
];

function json(error: string, status: number): Response {
  return Response.json(
    { error },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

function pathAllowed(method: string, pathname: string): boolean {
  return ALLOWED.some(
    (rule) => rule.method === method && rule.pattern.test(pathname),
  );
}

async function deskKeyOk(provided: string, expected: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [providedHash, expectedHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(provided)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  return crypto.subtle.timingSafeEqual(providedHash, expectedHash);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      if (!env.DESK_SHARED_SECRET || !env.STAFF_API_TOKEN) {
        return json("Staff relay is not configured.", 503);
      }

      const url = new URL(request.url);
      const method = request.method.toUpperCase();
      if (method === "OPTIONS") {
        return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
      }

      if (!pathAllowed(method, url.pathname)) {
        return json("Not found.", 404);
      }

      const deskKey = request.headers.get(DESK_HEADER)?.trim() ?? "";
      if (!deskKey || !(await deskKeyOk(deskKey, env.DESK_SHARED_SECRET))) {
        return json("Unauthorized", 401);
      }

      const origin = (env.ORIGIN || "https://www.aprilsrisingkitchen.com").replace(
        /\/$/,
        "",
      );
      const target = new URL(url.pathname + url.search, origin);

      const headers = new Headers();
      const contentType = request.headers.get("content-type");
      if (contentType) headers.set("content-type", contentType);
      headers.set("authorization", `Bearer ${env.STAFF_API_TOKEN}`);
      headers.set("accept", "application/json");

      const init: RequestInit = {
        method,
        headers,
        redirect: "manual",
      };
      if (method !== "GET" && method !== "HEAD") {
        init.body = request.body;
      }

      const upstream = await fetch(target, init);
      const outHeaders = new Headers();
      const pass = ["content-type", "cache-control"];
      for (const name of pass) {
        const value = upstream.headers.get(name);
        if (value) outHeaders.set(name, value);
      }
      outHeaders.set("Cache-Control", "no-store");

      return new Response(upstream.body, {
        status: upstream.status,
        headers: outHeaders,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error(
        JSON.stringify({ message: "relay failed", error: message }),
      );
      return json("Relay could not reach the bakery API.", 502);
    }
  },
} satisfies ExportedHandler<Env>;
