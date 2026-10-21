// One-off codemod: replace dark-only white-alpha Tailwind utilities with
// theme-aware CSS variables (defined in index.css), so the light theme stops
// rendering invisible white-on-white surfaces, borders and dim text.
//
// `text-white` (solid) is intentionally NOT touched — it sits on coloured
// buttons (emerald/red/green) where white is correct in both themes.
//
// Order matters: longer / more specific tokens first so `bg-white/5` does not
// partially match `bg-white/55` or `hover:bg-white/5`.

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'components');

const REPLACEMENTS = [
  ['hover:bg-white/5', 'hover:bg-[var(--mc-hover)]'],
  ['bg-white/55', 'bg-[var(--mc-knob)]'],
  ['bg-white/[0.025]', 'bg-[var(--mc-soft-faint)]'],
  ['bg-white/[0.02]', 'bg-[var(--mc-soft-faint)]'],
  ['bg-white/[0.03]', 'bg-[var(--mc-soft)]'],
  ['bg-white/[0.04]', 'bg-[var(--mc-soft)]'],
  ['bg-white/5', 'bg-[var(--mc-soft)]'],
  ['border-white/10', 'border-[var(--mc-border)]'],
  ['border-white/5', 'border-[var(--mc-border-soft)]'],
  ['text-white/80', 'text-[var(--mc-text-dim)]'],
];

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

let total = 0;
let files = 0;

for (const file of walk(root)) {
  const before = readFileSync(file, 'utf-8');
  let src = before;
  for (const [from, to] of REPLACEMENTS) {
    src = src.split(from).join(to);
  }
  if (src !== before) {
    writeFileSync(file, src);
    files += 1;
    total += 1;
  }
}

console.log(`theme-white codemod applied to ${files} files`);
