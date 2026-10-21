// Generate branded Android launcher icons + splash from the existing logo.
//
// Produces:
//   - mipmap-{mdpi..xxxhdpi}/ic_launcher.png        (square, 48..192)
//   - mipmap-{mdpi..xxxhdpi}/ic_launcher_round.png  (round mask, 48..192)
//   - mipmap-{mdpi..xxxhdpi}/ic_launcher_foreground.png (adaptive, 162..648)
//   - drawable/ic_launcher_background.xml           (brand-color background)
//   - drawable/splash.png                           (1080x1920 brand splash)
//
// Adaptive-icon safe zone: foreground is rendered at 60% of the canvas with
// centered padding so the OS mask never clips the mark.

import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const logoPath = resolve(repoRoot, 'src/assets/app-logo.jpg');
const resRoot = resolve(repoRoot, 'android/app/src/main/res');

const BRAND_DARK = { r: 2, g: 4, b: 2, alpha: 1 };
const BRAND_ACCENT = '#42B741';

const launcherSizes = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
};

const foregroundSizes = {
  'mipmap-mdpi': 162,
  'mipmap-hdpi': 243,
  'mipmap-xhdpi': 324,
  'mipmap-xxhdpi': 486,
  'mipmap-xxxhdpi': 648,
};

const ensureDir = (path) => mkdirSync(path, { recursive: true });

const composeOnDark = async (size, padding) => {
  // Inner content area for the logo (adaptive icons clip to ~66% inner circle).
  const inner = Math.round(size * (1 - padding * 2));
  const logoBuffer = await sharp(logoPath).resize(inner, inner, { fit: 'contain' }).toBuffer();
  const offset = Math.round((size - inner) / 2);
  return sharp({
    create: { width: size, height: size, channels: 4, background: BRAND_DARK },
  })
    .composite([{ input: logoBuffer, top: offset, left: offset }])
    .png()
    .toBuffer();
};

const composeRound = async (size) => {
  // Square version on dark, then mask with a circle.
  const square = await composeOnDark(size, 0.16);
  const mask = Buffer.from(
    `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="white"/></svg>`,
  );
  return sharp(square)
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer();
};

const composeForeground = async (size) => {
  // Adaptive foreground draws into a 108×108dp canvas but only the inner
  // 72×72dp is guaranteed visible after masking. We place the logo at 50%
  // of the canvas so it sits comfortably inside the visible region on all
  // mask shapes.
  const inner = Math.round(size * 0.5);
  const logoBuffer = await sharp(logoPath).resize(inner, inner, { fit: 'contain' }).toBuffer();
  const offset = Math.round((size - inner) / 2);
  return sharp({
    create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: logoBuffer, top: offset, left: offset }])
    .png()
    .toBuffer();
};

const composeSplash = async () => {
  const w = 1080;
  const h = 1920;
  const inner = 360;
  const logoBuffer = await sharp(logoPath).resize(inner, inner, { fit: 'contain' }).toBuffer();
  return sharp({
    create: { width: w, height: h, channels: 4, background: BRAND_DARK },
  })
    .composite([{ input: logoBuffer, top: Math.round((h - inner) / 2), left: Math.round((w - inner) / 2) }])
    .png()
    .toBuffer();
};

if (!existsSync(logoPath)) {
  console.error(`Logo not found: ${logoPath}`);
  process.exit(1);
}

for (const [folder, size] of Object.entries(launcherSizes)) {
  const dir = resolve(resRoot, folder);
  ensureDir(dir);
  const square = await composeOnDark(size, 0.16);
  writeFileSync(resolve(dir, 'ic_launcher.png'), square);
  const round = await composeRound(size);
  writeFileSync(resolve(dir, 'ic_launcher_round.png'), round);
  console.log(`Wrote ${folder}/ic_launcher.png (${size}x${size}) and ic_launcher_round.png`);
}

for (const [folder, size] of Object.entries(foregroundSizes)) {
  const dir = resolve(resRoot, folder);
  ensureDir(dir);
  const fg = await composeForeground(size);
  writeFileSync(resolve(dir, 'ic_launcher_foreground.png'), fg);
  console.log(`Wrote ${folder}/ic_launcher_foreground.png (${size}x${size})`);
}

// Flat brand-coloured adaptive background.
const bgXml = `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <solid android:color="#020402" />
</shape>
`;
ensureDir(resolve(resRoot, 'drawable'));
writeFileSync(resolve(resRoot, 'drawable/ic_launcher_background.xml'), bgXml);
console.log('Wrote drawable/ic_launcher_background.xml (solid brand dark)');

// Splash 1080x1920 PNG.
const splash = await composeSplash();
writeFileSync(resolve(resRoot, 'drawable/splash.png'), splash);
console.log('Wrote drawable/splash.png (1080x1920)');

// Drop the legacy v24 vector foreground — we now ship raster PNGs so the
// adaptive-icon XML in mipmap-anydpi-v26 picks the mipmap variant directly.
console.log(
  'NOTE: drawable-v24/ic_launcher_foreground.xml is no longer referenced and can be deleted manually if you wish.',
);

console.log('\nIcons regenerated. Brand accent reference: ' + BRAND_ACCENT);
