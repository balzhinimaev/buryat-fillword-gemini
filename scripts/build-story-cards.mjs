// Deterministic, locally rendered story artwork; no user data or remote assets.
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
await mkdir('public/story', { recursive: true });
for (const kind of ['invite', 'win']) {
  const title = kind === 'win' ? 'Ещё одна победа' : 'Давай играть';
  const subtitle = kind === 'win' ? 'Слова найдены. Теперь твоя очередь.' : 'Находи слова. Узнавай бурятский.';
  const letters = ['Б','У','Р','Я','А','Д','Ү','Г','Э','Н','Ү','Ү','Д','А','Б','В'];
  const cells = letters.map((letter, i) => {
    const x = 150 + (i % 4) * 200, y = 680 + Math.floor(i / 4) * 200;
    return `<rect x="${x}" y="${y}" width="180" height="180" rx="32" fill="${i < 6 ? '#a7d8be' : '#303a34'}"/><text x="${x + 90}" y="${y + 116}" text-anchor="middle" font-size="76" font-weight="600" fill="${i < 6 ? '#193c2e' : '#f5f7f5'}">${letter}</text>`;
  }).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920"><rect width="1080" height="1920" fill="#191c1a"/><g font-family="DejaVu Sans, sans-serif"><text x="90" y="265" font-size="34" letter-spacing="5" fill="#a7d8be">БУРЯАД ҮГЭНҮҮД</text><text x="90" y="420" font-size="68" font-weight="700" fill="#f5f7f5">${title}</text><text x="90" y="505" font-size="34" fill="#c2ccc5">${subtitle}</text>${cells}<text x="540" y="1630" text-anchor="middle" font-size="40" fill="#a7d8be">Филлворд на бурятском</text><text x="540" y="1700" text-anchor="middle" font-size="30" fill="#c2ccc5">@buryat_fillword_bot</text></g></svg>`;
  await sharp(Buffer.from(svg)).png().toFile(`public/story/story-${kind}-v3.png`);
}
