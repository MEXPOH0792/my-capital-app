// Raises the typography floor and drops the stray step.
//
// The app had ten text sizes between 7px and 16px — every single pixel step,
// which is not a scale. The real defect was the bottom: 7-8px is below what is
// readable on a phone, and it was used for badges and hints that carry real
// information (percentages, account names, warnings).
//
// 10px is the app's existing workhorse (126 uses), so raising the floor to it
// fixes readability without inventing a new visual language.
//
// Resulting steps: 10 / 11 / 12 / 13 / 14 / 16.
//
// Run: node scripts/codemod-type-scale.mjs

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = 'src';
const EXTENSIONS = new Set(['.jsx', '.js']);

const REPLACEMENTS = [
  ['text-[7px]', 'text-[10px]'],
  ['text-[8px]', 'text-[10px]'],
  ['text-[9px]', 'text-[10px]'],
  // 15px appeared exactly once; 14px already covers that step.
  ['text-[15px]', 'text-[14px]'],
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

  for (const [from, to] of REPLACEMENTS) {
    after = after.split(from).join(to);
  }

  if (after !== before) {
    const hits = REPLACEMENTS.reduce((sum, [from]) => sum + before.split(from).length - 1, 0);
    changedHits += hits;
    writeFileSync(file, after, 'utf8');
    changedFiles += 1;
  }
}

console.log(`${changedHits} text sizes normalised in ${changedFiles} files.`);
