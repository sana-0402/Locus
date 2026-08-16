/**
 * Locus API proxy — deploy this on Cloudflare Workers (free tier).
 *
 * Why this exists: locus.html can't call api.anthropic.com directly with a
 * key baked into the page, because anyone who opens dev tools could read it
 * straight out of the JavaScript. This worker sits in between: it holds the
 * real key as a server-side secret, and the page only ever talks to this
 * worker's public URL.
 *
 * Setup (no coding needed beyond pasting this file):
 *   1. Go to https://dash.cloudflare.com → Workers & Pages → Create → Worker.
 *   2. Delete the sample code it gives you, paste in this whole file, click Deploy.
 *   3. Go to the worker's Settings → Variables and Secrets:
 *        - Add a SECRET named  ANTHROPIC_API_KEY   → your real Anthropic API key.
 *        - (optional but recommended) Add a plain variable named
 *          ALLOWED_ORIGIN → the exact URL your site is hosted at,
 *          e.g. https://locus-databases.netlify.app  (no trailing slash).
 *          This stops random strangers from using your key through this URL.
 *   4. Copy the worker's URL (looks like https://locus-proxy.<you>.workers.dev)
 *      and paste it into the API_PROXY_URL constant near the top of the
 *      <script> in locus.html.
 */

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request, env);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors });
    }
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: cors });
    }

    // Optional origin lock — only enforced if ALLOWED_ORIGIN is set.
    const origin = request.headers.get("Origin") || "";
    if (env.ALLOWED_ORIGIN && origin !== env.ALLOWED_ORIGIN) {
      return new Response("Forbidden", { status: 403, headers: cors });
    }

    if (!env.ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: "Server missing ANTHROPIC_API_KEY secret" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...cors },
      });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response("Bad JSON", { status: 400, headers: cors });
    }

    const prompt = body && typeof body.prompt === "string" ? body.prompt.slice(0, 24000) : "";
    if (!prompt) {
      return new Response("Missing prompt", { status: 400, headers: cors });
    }

    // Model and max_tokens are fixed here, not taken from the client —
    // keeps this endpoint from being used for arbitrary/expensive requests.
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await anthropicRes.text();
    return new Response(data, {
      status: anthropicRes.status,
      headers: { "Content-Type": "application/json", ...cors },
    });
  },
};

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowed = env.ALLOWED_ORIGIN;
  return {
    "Access-Control-Allow-Origin": allowed ? (origin === allowed ? origin : "null") : "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}
