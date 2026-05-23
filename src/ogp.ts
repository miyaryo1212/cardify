export type OgpMeta = {
  // Original URL the metadata describes
  originalUrl: string;
  // Captured at fetch time
  fetchedAt: string;
  // Final, render-ready meta map. og:* / twitter:* fields are populated from
  // the upstream page, with fallbacks synthesised from <title> and
  // <meta name="description"> when the source has no OGP of its own.
  meta: Record<string, string>;
};

const OGP_PREFIXES = ["og:", "twitter:", "article:", "fb:"];

function isOgpKey(name: string): boolean {
  const lower = name.toLowerCase();
  return OGP_PREFIXES.some((p) => lower.startsWith(p));
}

class MetaHandler {
  constructor(
    private ogp: Record<string, string>,
    private extras: { description?: string },
  ) {}

  element(el: Element) {
    const property = el.getAttribute("property");
    const name = el.getAttribute("name");
    const content = el.getAttribute("content");
    if (!content) return;

    const key = property ?? name;
    if (!key) return;

    if (isOgpKey(key)) {
      // First write wins; OGP spec says first occurrence is canonical.
      if (this.ogp[key] === undefined) this.ogp[key] = content;
      return;
    }
    if (name?.toLowerCase() === "description" && !this.extras.description) {
      this.extras.description = content;
    }
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
        "Mozilla/5.0 (compatible; CardifyBot/0.1; +https://cardify.miyaryo1212.com)",
      accept: "text/html,application/xhtml+xml",
    },
  });
  if (!res.ok) {
    throw new Error(`upstream ${res.status} for ${url}`);
  }
  const meta: Record<string, string> = {};
  const extras: { description?: string } = {};
  const titleHandler = new TitleHandler();

  const rewriter = new HTMLRewriter()
    .on("meta", new MetaHandler(meta, extras))
    .on("title", titleHandler);

  await new Response(rewriter.transform(res).body).arrayBuffer();

  const pageTitle = titleHandler.buffer.trim();
  const hostname = new URL(url).hostname;

  // Synthesise OGP from <title>/<meta description> for pages that don't
  // ship their own. og:image is intentionally left empty — better no image
  // than a wrong one (e.g. favicon).
  if (!meta["og:title"]) {
    meta["og:title"] = pageTitle || hostname;
  }
  if (!meta["og:description"] && extras.description) {
    meta["og:description"] = extras.description;
  }
  if (!meta["og:url"]) meta["og:url"] = url;
  if (!meta["og:site_name"]) meta["og:site_name"] = hostname;
  if (!meta["og:type"]) meta["og:type"] = "website";

  return { originalUrl: url, fetchedAt: new Date().toISOString(), meta };
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
  const title = ogp.meta["og:title"] ?? redirectTo;
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
