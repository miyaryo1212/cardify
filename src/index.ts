import { generatePlaceholder } from "./placeholder";
import { handleRegister } from "./register";
import { handleView } from "./view";

export type Env = {
  OGP_CACHE: KVNamespace;
  OGP_IMAGES: R2Bucket;
  HMAC_SECRET: string;
  PUBLIC_IMAGE_BASE: string;
};

function handlePlaceholder(url: URL): Response {
  const title = url.searchParams.get("title") ?? "";
  const host = url.searchParams.get("host") ?? "";
  return new Response(generatePlaceholder(title, host), {
    status: 200,
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname === "/register") return handleRegister(req, env, url);
    if (url.pathname === "/placeholder.svg") return handlePlaceholder(url);
    if (url.pathname === "/") return handleView(req, env, url);
    return new Response("not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;
