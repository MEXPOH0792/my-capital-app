// One-off codemod: remove the "everything is a tiny ALL-CAPS wide-tracked
// label" look — the single most recognizable AI-dashboard tell.
//
// Safe because `uppercase` / letter-spacing are CSS-only: the DOM text content
// is unchanged, so tests that match visible text keep passing.
//
// Transformations (Tailwind classes):
//   font-black uppercase     -> font-semibold
//   font-extrabold uppercase -> font-semibold
//   uppercase                -> (removed)
//   tracking-[0.NNem]        -> (removed)   positive em tracking = the "wide" tell
//   tracking-widest|wider    -> (removed)
//
// Negative tracking on big numbers (tracking-tighter / tracking-[-..]) is kept.
// Run prettier afterwards to tidy whitespace left in className strings.

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
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

let files = 0;

for (const file of walk(root)) {
  const before = readFileSync(file, 'utf-8');
  let src = before;

  src = src
    .replace(/font-black uppercase/g, 'font-semibold')
    .replace(/font-extrabold uppercase/g, 'font-semibold')
    .replace(/\buppercase\b ?/g, '')
    .replace(/tracking-\[0\.[0-9]+em\] ?/g, '')
    .replace(/tracking-widest ?/g, '')
    .replace(/tracking-wider ?/g, '')
    // tidy doubled spaces left inside class strings
    .replace(/(\sclassName=(?:"|`|{`)[^"`]*?) {2,}/g, '$1 ');

  if (src !== before) {
    writeFileSync(file, src);
    files += 1;
  }
}

console.log(`de-caps applied to ${files} files`);
