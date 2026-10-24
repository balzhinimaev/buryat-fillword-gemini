import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const event = process.env.GITHUB_EVENT_PATH ? JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8')) : {};
let base = event.pull_request?.base?.sha || event.before;
if (!base || /^0+$/.test(base)) base = process.env.BASE_REF || 'origin/master';
if (git('rev-parse', base) === git('rev-parse', 'HEAD')) base = 'HEAD^';
const files = new Set([
  ...git('diff', '--name-only', '--diff-filter=ACMR', `${base}...HEAD`).split('\n'),
  ...git('diff', '--name-only', '--diff-filter=ACMR', 'HEAD').split('\n'),
  ...git('ls-files', '--others', '--exclude-standard').split('\n'),
].filter(f => /\.(ts|tsx|js|jsx|mjs)$/.test(f) && existsSync(f)));
if (!files.size) console.log('No changed JS/TS files');
else execFileSync('npx', ['--no-install', 'eslint', ...files], { stdio: 'inherit' });
