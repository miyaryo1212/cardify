import type { OgpMeta } from "./ogp";

export async function urlKey(url: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(url),
  );
  const bytes = new Uint8Array(buf);
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out;
}

export async function getCached(
  kv: KVNamespace,
  url: string,
): Promise<OgpMeta | null> {
  const key = await urlKey(url);
  return kv.get<OgpMeta>(key, "json");
}

export async function putCached(
  kv: KVNamespace,
  url: string,
  ogp: OgpMeta,
): Promise<void> {
  const key = await urlKey(url);
  await kv.put(key, JSON.stringify(ogp));
}

// Mirror og:image into R2 so the wrapped card never breaks if the upstream
// image disappears or blocks hotlinks. Returns the rewritten image URL, or
// null if the copy failed (caller should keep the original URL as fallback).
export async function mirrorImage(
  r2: R2Bucket,
  imageUrl: string,
  publicBase: string,
): Promise<string | null> {
  try {
    const res = await fetch(imageUrl, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; CardifyBot/0.1; +https://cardify.miyaryo1212.com)",
      },
    });
    if (!res.ok || !res.body) return null;
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const ext = contentType.split("/")[1]?.split(";")[0] ?? "bin";
    const hashBuf = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(imageUrl),
    );
    const hashHex = Array.from(new Uint8Array(hashBuf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const objectKey = `${hashHex}.${ext}`;
    const body = await res.arrayBuffer();
    await r2.put(objectKey, body, { httpMetadata: { contentType } });
    return `${publicBase.replace(/\/$/, "")}/${objectKey}`;
  } catch {
    return null;
  }
}
