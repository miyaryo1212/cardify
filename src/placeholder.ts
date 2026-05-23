// Fallback OGP image for sources that don't ship one. Rendered as SVG so the
// Worker can stamp the title + hostname onto it without bundling a font or
// rasteriser.

const WIDTH = 1200;
const HEIGHT = 630;
const CHARS_PER_LINE = 22;
const MAX_LINES = 3;

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Character-based wrap so CJK (no spaces) renders correctly. Last line gets
// an ellipsis when the title overflows.
function wrap(text: string, perLine: number, maxLines: number): string[] {
  const chars = Array.from(text);
  const lines: string[] = [];
  for (let i = 0; i < chars.length; ) {
    const isLast = lines.length === maxLines - 1;
    const overflows = i + perLine < chars.length;
    if (isLast && overflows) {
      lines.push(chars.slice(i, i + perLine - 1).join("") + "…");
      break;
    }
    lines.push(chars.slice(i, i + perLine).join(""));
    i += perLine;
    if (lines.length >= maxLines) break;
  }
  return lines.length ? lines : [""];
}

export function generatePlaceholder(title: string, host: string): string {
  const lines = wrap(title.trim(), CHARS_PER_LINE, MAX_LINES);
  const lineHeight = 96;
  const blockHeight = lines.length * lineHeight;
  const firstBaseline = (HEIGHT - blockHeight) / 2 + lineHeight * 0.75;

  const titleTexts = lines
    .map(
      (line, i) =>
        `<text x="80" y="${firstBaseline + i * lineHeight}" font-size="80" font-weight="700">${escapeXml(line)}</text>`,
    )
    .join("\n    ");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" width="${WIDTH}" height="${HEIGHT}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>
  <g font-family="-apple-system, BlinkMacSystemFont, 'Hiragino Sans', 'Yu Gothic', 'Noto Sans JP', sans-serif" fill="#f1f5f9">
    ${titleTexts}
    <text x="80" y="560" font-size="32" fill="#94a3b8">${escapeXml(host)}</text>
    <text x="${WIDTH - 80}" y="560" font-size="28" fill="#64748b" text-anchor="end" font-weight="600">cardify</text>
  </g>
</svg>
`;
}

export function placeholderUrl(
  origin: string,
  title: string,
  host: string,
): string {
  const params = new URLSearchParams({ title, host });
  return `${origin}/placeholder.svg?${params.toString()}`;
}
