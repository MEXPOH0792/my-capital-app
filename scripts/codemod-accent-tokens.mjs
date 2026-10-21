// Maps accent TEXT colours onto semantic, theme-aware tokens.
//
// Backgrounds and borders are left alone: they are used at low alpha, which
// reads acceptably on both surfaces. Only text was failing — the 300/400-level
// shades sit at roughly 2:1 contrast on white.
//
// Run: node scripts/codemod-accent-tokens.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = 'src';
const EXTENSIONS = new Set(['.jsx', '.js']);

// Longest first so `text-red-300/85` is not partially eaten by `text-red-300`.
const REPLACEMENTS = [
  [/text-emerald-(?:300|400|500)(?:\/\d+)?\b/g, 'text-[var(--mc-positive)]'],
  [/text-green-(?:300|400|500)(?:\/\d+)?\b/g, 'text-[var(--mc-positive)]'],
  [/text-red-(?:300|400|500)(?:\/\d+)?\b/g, 'text-[var(--mc-negative)]'],
  [/text-amber-(?:300|400|500)(?:\/\d+)?\b/g, 'text-[var(--mc-warning)]'],
];

const walk = (dir) => {
  const found = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) found.push(...walk(full));
    else if (EXTENSIONS.has(extname(full))) found.push(full);
  }
  return found;
};

let changedFiles = 0;
let changedHits = 0;

for (const file of walk(ROOT)) {
  const before = readFileSync(file, 'utf8');
  let after = before;

  for (const [pattern, token] of REPLACEMENTS) {
    after = after.replace(pattern, () => {
      changedHits += 1;
      return token;
    });
  }

  if (after !== before) {
    writeFileSync(file, after, 'utf8');
    changedFiles += 1;
    console.log(`  ${file}`);
  }
}

console.log(`\n${changedHits} accent text classes in ${changedFiles} files.`);
