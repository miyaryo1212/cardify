import { fetchOgp } from "./ogp";
import { verify } from "./sign";
import { mirrorImage, putCached } from "./storage";
import type { Env } from "./index";

export async function handleRegister(
  req: Request,
  env: Env,
  url: URL,
): Promise<Response> {
  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405 });
  }
  const target = url.searchParams.get("url");
  const sig = url.searchParams.get("sig");
  if (!target || !sig) {
    return new Response("missing url or sig", { status: 400 });
  }
  try {
    new URL(target);
  } catch {
    return new Response("invalid url", { status: 400 });
  }
  const ok = await verify(target, sig, env.HMAC_SECRET);
  if (!ok) return new Response("invalid signature", { status: 401 });

  const ogp = await fetchOgp(target);

  const originalImage =
    ogp.meta["og:image"] ?? ogp.meta["twitter:image"] ?? null;
  if (originalImage) {
    const mirrored = await mirrorImage(
      env.OGP_IMAGES,
      originalImage,
      env.PUBLIC_IMAGE_BASE,
    );
    if (mirrored) {
      if (ogp.meta["og:image"]) ogp.meta["og:image"] = mirrored;
      if (ogp.meta["twitter:image"]) ogp.meta["twitter:image"] = mirrored;
    }
  }

  await putCached(env.OGP_CACHE, target, ogp);

  const wrapperUrl = new URL(url);
  wrapperUrl.pathname = "/";
  wrapperUrl.search = `?url=${encodeURIComponent(target)}`;

  return Response.json({
    wrapperUrl: wrapperUrl.toString(),
    ogp,
  });
}
