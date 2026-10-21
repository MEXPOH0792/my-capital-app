import { readFileSync } from 'node:fs';

const data = JSON.parse(readFileSync(process.argv[2] || 'eslint-report.json', 'utf8'));
const errors = [];
const warnings = [];
for (const file of data) {
  for (const msg of file.messages) {
    const short = file.filePath.replace(/.*src/, 'src').replace(/\\/g, '/');
    const row = `${short}:${msg.line} [${msg.ruleId}] ${msg.message.slice(0, 100)}`;
    if (msg.severity === 2) errors.push(row);
    else warnings.push(row);
  }
}
console.log(`ERRORS (${errors.length}):`);
errors.forEach((r) => console.log('  ' + r));
console.log(`\nWARNINGS (${warnings.length}):`);
warnings.forEach((r) => console.log('  ' + r));
