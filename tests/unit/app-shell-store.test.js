import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { addTest } from '../harness/runner.js';

// The UI reads the store only through the selector in useAppShell. An action
// the UI calls but the selector forgets is `undefined` at runtime — that is how
// editing operations from history silently stopped working. This pins it.

const collectFiles = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return collectFiles(path);
    return /\.(js|jsx)$/.test(name) ? [path] : [];
  });

addTest('every store field the UI uses is exposed by the app shell selector', () => {
  const uiFiles = ['src/components', 'src/hooks', 'src/app'].flatMap(collectFiles);
  const used = new Set();
  uiFiles.forEach((file) => {
    for (const match of readFileSync(file, 'utf8').matchAll(/\bstore\.([a-zA-Z]+)/g)) used.add(match[1]);
  });

  const shell = readFileSync('src/app/useAppShell.js', 'utf8');
  const missing = [...used].filter((name) => !new RegExp(`^ +${name}: state[.]${name},?$`, 'm').test(shell));

  assert.deepEqual(missing, []);
});
