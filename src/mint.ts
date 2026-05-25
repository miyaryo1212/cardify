const HTML = `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>cardify mint</title>
<style>
  :root { color-scheme: light dark; }
  body { font: 16px/1.5 system-ui, sans-serif; max-width: 36rem; margin: 2rem auto; padding: 0 1rem; }
  h1 { font-size: 1.25rem; margin: 0 0 1rem; }
  label { display: block; margin: .75rem 0; }
  label span { display: block; font-size: .85rem; opacity: .7; margin-bottom: .25rem; }
  input { width: 100%; padding: .5rem .6rem; font: inherit; box-sizing: border-box; border: 1px solid #888; border-radius: .25rem; background: transparent; color: inherit; }
  button { padding: .5rem 1rem; font: inherit; border: 1px solid #888; border-radius: .25rem; background: transparent; color: inherit; cursor: pointer; }
  button:hover { background: rgba(127,127,127,.15); }
  button[disabled] { opacity: .5; cursor: progress; }
  #out { margin-top: 1.5rem; padding: .75rem; border: 1px solid #888; border-radius: .25rem; word-break: break-all; display: none; }
  #out.show { display: block; }
  #out .url { font-family: ui-monospace, monospace; margin-bottom: .5rem; }
  #out.err { border-color: #c33; color: #c33; }
  .row { display: flex; gap: .5rem; align-items: center; }
  .row .url { flex: 1; }
</style>
</head>
<body>
<h1>cardify mint</h1>
<form id="f">
  <label><span>Target URL</span><input id="u" type="url" required placeholder="https://example.com/article" autofocus></label>
  <label><span>HMAC token</span><input id="t" type="password" required autocomplete="off"></label>
  <button id="b" type="submit">Mint wrapper URL</button>
</form>
<div id="out"></div>
<script>
(() => {
  const $ = (id) => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const tokenParam = params.get("token");
  if (tokenParam) $("t").value = tokenParam;
  if (params.get("url")) $("u").value = params.get("url");

  async function hmacHex(secret, data) {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw", enc.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false, ["sign"]
    );
    const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
    return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
  }

  function show(html, isErr) {
    const out = $("out");
    out.innerHTML = html;
    out.className = "show" + (isErr ? " err" : "");
  }

  $("f").addEventListener("submit", async (e) => {
    e.preventDefault();
    const target = $("u").value.trim();
    const secret = $("t").value;
    if (!target || !secret) return;
    $("b").disabled = true;
    show("Minting…", false);
    try {
      const sig = await hmacHex(secret, target);
      const res = await fetch("/register?url=" + encodeURIComponent(target) + "&sig=" + sig, { method: "POST" });
      if (!res.ok) {
        const text = await res.text();
        show("Error " + res.status + ": " + text, true);
        return;
      }
      const data = await res.json();
      const wrapper = data.wrapperUrl;
      const safe = wrapper.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
      show(
        '<div class="url"><a href="' + safe + '">' + safe + '</a></div>' +
        '<div class="row"><button id="cp" type="button">Copy</button><span id="cpmsg"></span></div>',
        false
      );
      $("cp").addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(wrapper);
          $("cpmsg").textContent = "Copied";
          setTimeout(() => { $("cpmsg").textContent = ""; }, 1500);
        } catch (err) {
          $("cpmsg").textContent = "Copy failed: " + err.message;
        }
      });
    } catch (err) {
      show("Error: " + err.message, true);
    } finally {
      $("b").disabled = false;
    }
  });
})();
</script>
</body>
</html>
`;

export function handleMint(): Response {
  return new Response(HTML, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "referrer-policy": "no-referrer",
    },
  });
}
