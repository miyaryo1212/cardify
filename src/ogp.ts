export type OgpMeta = {
  // Original URL the metadata describes
  originalUrl: string;
  // Captured at fetch time
  fetchedAt: string;
  // Arbitrary meta key → content. Keys preserved as-is (e.g. "og:title").
  meta: Record<string, string>;
  // Page <title> as a fallback
  title?: string;
};

const ALLOWED_PREFIXES = ["og:", "twitter:", "article:", "fb:"];

function isAllowedMetaName(name: string): boolean {
  const lower = name.toLowerCase();
  return ALLOWED_PREFIXES.some((p) => lower.startsWith(p));
}

class MetaHandler {
  constructor(private out: Record<string, string>) {}

  element(el: Element) {
    const property = el.getAttribute("property");
    const name = el.getAttribute("name");
    const content = el.getAttribute("content");
    if (!content) return;
    const key = property ?? name;
    if (!key) return;
    if (!isAllowedMetaName(key)) return;
    // First write wins; OGP spec says first occurrence is canonical.
    if (this.out[key] === undefined) this.out[key] = content;
  }
}

class TitleHandler {
  buffer = "";
  text(t: Text) {
    this.buffer += t.text;
  }
}

export async function fetchOgp(url: string): Promise<OgpMeta> {
  const res = await fetch(url, {
    redirect: "follow",
    headers: {
      "user-agent":
        "Mozilla/5.0 (compatible; CardifyBot/0.1; +https://ogp.miyaryo1212.com)",
      accept: "text/html,application/xhtml+xml",
    },
  });
  if (!res.ok) {
    throw new Error(`upstream ${res.status} for ${url}`);
  }
  const meta: Record<string, string> = {};
  const titleHandler = new TitleHandler();

  const rewriter = new HTMLRewriter()
    .on("meta", new MetaHandler(meta))
    .on("title", titleHandler);

  // Drain the response through the rewriter.
  await new Response(rewriter.transform(res).body).arrayBuffer();

  return {
    originalUrl: url,
    fetchedAt: new Date().toISOString(),
    meta,
    title: titleHandler.buffer.trim() || undefined,
  };
}

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function renderHtml(ogp: OgpMeta, redirectTo: string): string {
  const title =
    ogp.meta["og:title"] ?? ogp.meta["twitter:title"] ?? ogp.title ?? redirectTo;
  const metaTags = Object.entries(ogp.meta)
    .map(([k, v]) => {
      const attr = k.startsWith("twitter:") ? "name" : "property";
      return `    <meta ${attr}="${escapeAttr(k)}" content="${escapeAttr(v)}">`;
    })
    .join("\n");

  return `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8">
    <title>${escapeHtml(title)}</title>
${metaTags}
    <meta http-equiv="refresh" content="0; url=${escapeAttr(redirectTo)}">
    <link rel="canonical" href="${escapeAttr(redirectTo)}">
  </head>
  <body>
    <p>Redirecting to <a href="${escapeAttr(redirectTo)}">${escapeHtml(redirectTo)}</a>…</p>
  </body>
</html>
`;
}
