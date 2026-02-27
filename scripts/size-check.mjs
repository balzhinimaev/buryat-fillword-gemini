import fs from 'node:fs';
import path from 'node:path';

const distAssetsDir = path.resolve(process.cwd(), 'dist/assets');

if (!fs.existsSync(distAssetsDir)) {
  console.error('❌ dist/assets not found. Run `npm run build` before `npm run size:check`.');
  process.exit(1);
}

const files = fs.readdirSync(distAssetsDir);

const findByPattern = (re) => files.find((name) => re.test(name));

const mainJs = findByPattern(/^index-.*\.js$/);
const mainCss = findByPattern(/^index-.*\.css$/);

if (!mainJs || !mainCss) {
  console.error('❌ Could not find main index JS/CSS assets in dist/assets');
  process.exit(1);
}

const getSize = (name) => fs.statSync(path.join(distAssetsDir, name)).size;

const jsSize = getSize(mainJs);
const cssSize = getSize(mainCss);

const maxJs = Number(process.env.MAX_MAIN_JS_BYTES ?? 400 * 1024); // 400KB
const maxCss = Number(process.env.MAX_MAIN_CSS_BYTES ?? 160 * 1024); // 160KB

const fmt = (bytes) => `${(bytes / 1024).toFixed(2)} KB`;

console.log('📦 Bundle size check');
console.log(`- Main JS : ${mainJs} -> ${fmt(jsSize)} (limit ${fmt(maxJs)})`);
console.log(`- Main CSS: ${mainCss} -> ${fmt(cssSize)} (limit ${fmt(maxCss)})`);

let ok = true;
if (jsSize > maxJs) {
  console.error(`❌ Main JS exceeds limit by ${fmt(jsSize - maxJs)}`);
  ok = false;
}
if (cssSize > maxCss) {
  console.error(`❌ Main CSS exceeds limit by ${fmt(cssSize - maxCss)}`);
  ok = false;
}

if (!ok) {
  process.exit(1);
}

console.log('✅ Bundle size check passed');
