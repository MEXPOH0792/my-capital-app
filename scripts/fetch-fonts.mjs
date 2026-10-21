import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = `${dirname(fileURLToPath(import.meta.url))}/../public/fonts`;
mkdirSync(__dirname, { recursive: true });
const CSS_URL =
  'https://fonts.googleapis.com/css2?family=Golos+Text:wght@400;500;600;700&family=Manrope:wght@600;700;800&display=swap';
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

const cssText = await fetch(CSS_URL, { headers: { 'User-Agent': UA } }).then((r) => r.text());

const urls = [...new Set([...cssText.matchAll(/url\((https:\/\/[^)]+\.woff2)\)/g)].map((m) => m[1]))];
console.log(`Found ${urls.length} unique font URLs`);

const seenNames = new Set();
const renamed = new Map();
for (const url of urls) {
  let name = basename(url);
  let counter = 1;
  while (seenNames.has(name)) {
    name = `${basename(url, '.woff2')}-${counter++}.woff2`;
  }
  seenNames.add(name);
  renamed.set(url, name);

  if (!existsSync(`${__dirname}/${name}`)) {
    const buf = Buffer.from(await fetch(url, { headers: { 'User-Agent': UA } }).then((r) => r.arrayBuffer()));
    writeFileSync(`${__dirname}/${name}`, buf);
    console.log(`Downloaded ${name} (${buf.length} bytes)`);
  } else {
    console.log(`Skipped ${name} (exists)`);
  }
}

let rewritten = cssText;
for (const [remote, local] of renamed.entries()) {
  rewritten = rewritten.replaceAll(remote, `/fonts/${local}`);
}
writeFileSync(`${__dirname}/fonts.css`, rewritten);
console.log('Wrote fonts.css');
