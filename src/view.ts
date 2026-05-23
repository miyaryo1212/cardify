import { renderHtml } from "./ogp";
import { getCached } from "./storage";
import type { Env } from "./index";

export async function handleView(
  req: Request,
  env: Env,
  url: URL,
): Promise<Response> {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return new Response("method not allowed", { status: 405 });
  }
  const target = url.searchParams.get("url");
  if (!target) {
    return new Response("missing url", { status: 400 });
  }
  try {
    new URL(target);
  } catch {
    return new Response("invalid url", { status: 400 });
  }

  const cached = await getCached(env.OGP_CACHE, target);
  if (!cached) {
    // Unregistered URL: pass the visitor through without an OGP card.
    return Response.redirect(target, 302);
  }

  const html = renderHtml(cached, target);
  return new Response(html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=300",
    },
  });
}
