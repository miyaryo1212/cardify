const encoder = new TextEncoder();

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function toHex(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out;
}

function fromHex(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) throw new Error("invalid hex");
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export async function sign(url: string, secret: string): Promise<string> {
  const key = await importKey(secret);
  const mac = await crypto.subtle.sign("HMAC", key, encoder.encode(url));
  return toHex(mac);
}

export async function verify(
  url: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  if (!signature) return false;
  let sig: Uint8Array;
  try {
    sig = fromHex(signature);
  } catch {
    return false;
  }
  const key = await importKey(secret);
  return crypto.subtle.verify("HMAC", key, sig, encoder.encode(url));
}
