// Generate PWA web icons from the app logo into public/.
//
// Produces:
//   public/icon-192.png            (any-purpose, 192x192)
//   public/icon-512.png            (any-purpose, 512x512)
//   public/icon-512-maskable.png   (maskable, logo inside safe area on brand bg)
//   public/icon-180.png            (apple-touch-icon, 180x180, solid bg)
//   public/favicon.png             (32x32)
//
// Brand background #020402 so the maskable/apple icons look intentional on
// light launchers instead of showing a transparent square.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const logoPath = resolve(repoRoot, 'src/assets/app-logo.jpg');
const outDir = resolve(repoRoot, 'public');
const BRAND_DARK = { r: 2, g: 4, b: 2, alpha: 1 };

mkdirSync(outDir, { recursive: true });

const transparentContain = async (size) =>
  sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: await sharp(logoPath).resize(size, size, { fit: 'contain' }).toBuffer(), top: 0, left: 0 }])
    .png()
    .toBuffer();

const onBrandBg = async (size, logoFraction) => {
  const inner = Math.round(size * logoFraction);
  const offset = Math.round((size - inner) / 2);
  const logo = await sharp(logoPath).resize(inner, inner, { fit: 'contain' }).toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background: BRAND_DARK } })
    .composite([{ input: logo, top: offset, left: offset }])
    .png()
    .toBuffer();
};

const write = (name, buf) => {
  writeFileSync(resolve(outDir, name), buf);
  console.log(`Wrote public/${name}`);
};

write('icon-192.png', await transparentContain(192));
write('icon-512.png', await transparentContain(512));
// Maskable: keep the mark within the ~80% safe zone on a filled background.
write('icon-512-maskable.png', await onBrandBg(512, 0.6));
write('icon-180.png', await onBrandBg(180, 0.78));
write('favicon.png', await transparentContain(32));

console.log('Web icons generated.');
