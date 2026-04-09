import sharp from "sharp";
import path from "path";

const OUTPUT = path.resolve("/Users/iseung-u/Projects/sw-blog/public/og-default.png");

// Layout constants (all in px on a 1200x630 canvas)
const LOGO_W = 280;
const LOGO_H = (LOGO_W * 540) / 780; // preserve logo.svg aspect (780x540) → ~194
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

  <svg x="${LOGO_X}" y="${LOGO_Y}" width="${LOGO_W}" height="${LOGO_H}"
       viewBox="100 240 780 540" preserveAspectRatio="xMidYMid meet">
    <g transform="translate(0, 1024) scale(0.1, -0.1)" fill="#6b9dc2" stroke="none">
      <path d="M2780 6939 c-147 -19 -328 -89 -460 -179 -204 -138 -355 -358 -421
-609 -26 -100 -36 -322 -19 -428 71 -444 409 -794 849 -877 69 -13 171 -16
605 -16 316 0 546 -4 586 -11 144 -23 279 -124 352 -264 20 -38 120 -308 223
-600 102 -291 196 -559 209 -595 l24 -65 290 -3 c269 -2 290 -1 297 15 6 15
85 235 280 778 23 66 83 233 133 370 49 138 116 323 147 413 32 90 61 160 65
155 4 -4 48 -123 98 -263 116 -326 438 -1223 488 -1360 l39 -105 294 0 293 0
144 425 c276 812 1074 3203 1074 3216 0 12 -53 14 -305 14 l-304 0 -454 -1366
c-250 -752 -457 -1362 -461 -1356 -3 5 -67 180 -142 389 -74 208 -157 439
-184 513 -86 238 -340 953 -340 957 0 2 -109 2 -242 1 l-243 -3 -327 -915
c-180 -503 -330 -924 -334 -934 -9 -28 -12 -22 -109 255 -47 134 -101 276
-119 316 -39 82 -115 197 -174 264 -100 113 -267 223 -419 279 -157 56 -203
60 -782 60 -337 0 -549 4 -586 11 -146 27 -278 129 -342 266 -31 64 -37 87
-41 169 -6 117 14 199 68 282 43 67 121 142 176 170 104 53 86 52 950 52 629
0 804 3 811 13 6 6 68 120 138 252 70 132 138 259 152 283 l24 42 -968 -1
c-532 -1 -997 -5 -1033 -10z"/>
      <path d="M4225 4074 c-45 -65 -115 -121 -200 -161 l-60 -28 -886 -3 -886 -2
-159 -287 c-87 -157 -161 -290 -162 -295 -2 -5 464 -7 1070 -6 l1073 3 95 26
c113 31 208 73 307 135 l72 45 -55 154 c-29 85 -79 226 -109 312 -31 86 -57
158 -59 160 -1 2 -20 -22 -41 -53z"/>
    </g>
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
