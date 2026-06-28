import sharp from "sharp";
import path from "path";

const OUTPUT = path.resolve("public/og-default.png");

// Layout constants (all in px on a 1200x630 canvas)
const LOGO_W = 200;
const LOGO_H = LOGO_W; // square mark
const TITLE_SIZE = 76;
const SUBTITLE_SIZE = 26;
const GAP_LOGO_TITLE = 40;   // visual gap from logo bottom to title cap top
const GAP_TITLE_SUB = 22;    // visual gap from title baseline to subtitle cap top

// Approximate cap height (visual height of uppercase letters)
const TITLE_CAP = TITLE_SIZE * 0.72;
const SUBTITLE_CAP = SUBTITLE_SIZE * 0.72;

const BLOCK_H = LOGO_H + GAP_LOGO_TITLE + TITLE_CAP + GAP_TITLE_SUB + SUBTITLE_CAP;
const BLOCK_TOP = (630 - BLOCK_H) / 2;

const LOGO_X = (1200 - LOGO_W) / 2;
const LOGO_Y = BLOCK_TOP;
const TITLE_BASELINE_Y = LOGO_Y + LOGO_H + GAP_LOGO_TITLE + TITLE_CAP;
const SUBTITLE_BASELINE_Y = TITLE_BASELINE_Y + GAP_TITLE_SUB + SUBTITLE_CAP;

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#0a0a0a"/>

  <svg x="${LOGO_X}" y="${LOGO_Y}" width="${LOGO_W}" height="${LOGO_H}" viewBox="0 0 64 64">
    <path d="M32 50 L19 20 M32 50 L32 15 M32 50 L45 20" stroke="#6b9dc2" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    <circle cx="32" cy="50" r="3.6" fill="#6b9dc2"/>
    <circle cx="18" cy="16" r="3.6" fill="#6b9dc2"/>
    <circle cx="32" cy="13" r="3.6" fill="#6b9dc2"/>
    <circle cx="46" cy="16" r="3.6" fill="#6b9dc2"/>
  </svg>

  <text x="600" y="${TITLE_BASELINE_Y}"
        font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif"
        font-size="${TITLE_SIZE}"
        font-weight="700"
        fill="#ffffff"
        text-anchor="middle"
        letter-spacing="-1">Seungwoo Lee</text>

  <text x="600" y="${SUBTITLE_BASELINE_Y}"
        font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif"
        font-size="${SUBTITLE_SIZE}"
        font-weight="400"
        fill="#9a9a9a"
        text-anchor="middle"
        letter-spacing="0.5">seung-woo.me</text>
</svg>`;

await sharp(Buffer.from(svg))
  .png()
  .toFile(OUTPUT);

console.log(`Generated ${OUTPUT}`);
