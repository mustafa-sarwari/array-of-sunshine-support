// Fails the build if the standalone widget grows past its size budget.
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const FILE = 'dist/widget.js';
const BUDGET_KB = 40;

const raw = readFileSync(FILE);
const gzipKb = gzipSync(raw, { level: 9 }).length / 1024;
const summary = `${FILE}: ${(raw.length / 1024).toFixed(1)} KB raw, ${gzipKb.toFixed(1)} KB gzip (budget ${BUDGET_KB} KB gzip)`;

if (gzipKb > BUDGET_KB) {
  console.error(`Widget too large. ${summary}`);
  process.exit(1);
}
console.log(summary);
