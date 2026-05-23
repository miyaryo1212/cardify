// Mint a signed register URL locally.
//
// Usage:
//   HMAC_SECRET=xxx BASE=https://ogp.miyaryo1212.com \
//     npm run mint -- https://twitter.com/...
//
// Outputs the curl command to register the URL and the resulting wrapper URL.

import { createHmac } from "node:crypto";

function sign(url: string, secret: string): string {
  return createHmac("sha256", secret).update(url).digest("hex");
}

function main() {
  const target = process.argv[2];
  if (!target) {
    console.error("usage: mint-url <target-url>");
    process.exit(1);
  }
  const secret = process.env["HMAC_SECRET"];
  if (!secret) {
    console.error("HMAC_SECRET env var required");
    process.exit(1);
  }
  const base = process.env["BASE"] ?? "https://ogp.miyaryo1212.com";

  const sig = sign(target, secret);
  const registerUrl =
    `${base}/register?url=${encodeURIComponent(target)}&sig=${sig}`;
  const wrapperUrl = `${base}/?url=${encodeURIComponent(target)}`;

  console.log("# register (one-time):");
  console.log(`curl -X POST '${registerUrl}'`);
  console.log();
  console.log("# wrapper URL to share:");
  console.log(wrapperUrl);
}

main();
