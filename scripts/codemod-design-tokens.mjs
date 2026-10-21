// One-off design-token codemod.
//
// Collapses the sprawl of bespoke border-radii and arbitrary opacity values
// (a strong "AI-generated UI" tell) into small, consistent scales:
//
//   radius:  any rounded[-side]-[Npx]  ->  12 / 16 / 22
//            0–13 -> 12, 14–18 -> 16, 19+ -> 22
//
//   opacity: any opacity-NN (Tailwind 0–100, excluding 100) -> 40 / 55 / 70
//            <=42 -> 40 (tertiary), 43–62 -> 55 (secondary), 63–99 -> 70
//
// Runs over src/**/*.{jsx,tsx}. Prints a per-bucket count. Idempotent.

import { readFileSync, writeFileSync } from 'node:fs';
import { readdirSync, statSync } from 'node:fs';
import { join, extname, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'src');

const walk = (dir) => {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walk(full));
    else if (['.jsx', '.tsx'].includes(extname(full))) out.push(full);
  }
  return out;
};

const radiusToken = (n) => (n <= 13 ? 12 : n <= 18 ? 16 : 22);
const opacityToken = (n) => (n <= 42 ? 40 : n <= 62 ? 55 : 70);

let radiusHits = 0;
let opacityHits = 0;

for (const file of walk(root)) {
  let src = readFileSync(file, 'utf-8');
  const before = src;

  // rounded-[Npx], rounded-t-[Npx], rounded-tl-[Npx], etc.
  src = src.replace(/rounded(-[a-z]{1,2})?-\[(\d+)px\]/g, (_m, side = '', px) => {
    radiusHits += 1;
    return `rounded${side || ''}-[${radiusToken(Number(px))}px]`;
  });

  // opacity-NN (skip 100 — used for full/hover states)
  src = src.replace(/\bopacity-(\d{1,3})\b/g, (m, nn) => {
    const n = Number(nn);
    if (n === 100) return m;
    opacityHits += 1;
    return `opacity-${opacityToken(n)}`;
  });

  if (src !== before) writeFileSync(file, src);
}

console.log(`radius replacements: ${radiusHits}`);
console.log(`opacity replacements: ${opacityHits}`);
console.log('Tokens — radius: 12/16/22 · opacity: 40/55/70');
