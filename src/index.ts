import { handleRegister } from "./register";
import { handleView } from "./view";

export type Env = {
  OGP_CACHE: KVNamespace;
  OGP_IMAGES: R2Bucket;
  HMAC_SECRET: string;
  PUBLIC_IMAGE_BASE: string;
};

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname === "/register") return handleRegister(req, env, url);
    if (url.pathname === "/") return handleView(req, env, url);
    return new Response("not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;
