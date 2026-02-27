import { execSync } from 'node:child_process';

const run = (cmd) => execSync(cmd, { stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim();

const baseRef = process.env.BASE_REF || process.env.GITHUB_BASE_REF || 'master';
const remoteBase = `origin/${baseRef}`;

let diffRange = `${remoteBase}...HEAD`;

try {
  run(`git rev-parse --verify ${remoteBase}`);
} catch {
  // Fallback for local runs without fetched remote branch
  diffRange = 'HEAD~1...HEAD';
}

let changed = '';
try {
  changed = run(`git diff --name-only --diff-filter=ACMR ${diffRange}`);
} catch {
  changed = '';
}

const files = changed
  .split('\n')
  .map((s) => s.trim())
  .filter(Boolean)
  .filter((f) => /\.(ts|tsx|js|jsx)$/.test(f));

if (files.length === 0) {
  console.log('✅ No changed JS/TS files to lint');
  process.exit(0);
}

console.log(`🔎 Linting changed files (${files.length}) against ${diffRange}`);

const escaped = files.map((f) => `'${f.replace(/'/g, "'\\''")}'`).join(' ');
execSync(`npx eslint ${escaped}`, { stdio: 'inherit' });
