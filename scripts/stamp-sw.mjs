// Post-build: stamp the package version into dist/sw.js so each release uses a
// fresh cache name (`capital-shell-<version>`) and the activate handler purges
// the previous version's cache. Runs after `vite build`.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const pkg = JSON.parse(readFileSync(resolve(repoRoot, 'package.json'), 'utf-8'));
const swPath = resolve(repoRoot, 'dist/sw.js');

if (!existsSync(swPath)) {
  console.warn('[stamp-sw] dist/sw.js not found — skipping (did the build run?)');
  process.exit(0);
}

// Unique per build: version + short timestamp, so even re-deploying the same
// version with changed assets gets a new cache generation.
const stamp = `${pkg.version}-${Date.now().toString(36)}`;
const source = readFileSync(swPath, 'utf-8');
const stamped = source.replaceAll('__SW_VERSION__', stamp);
writeFileSync(swPath, stamped);
console.log(`[stamp-sw] dist/sw.js cache version → capital-shell-${stamp}`);
