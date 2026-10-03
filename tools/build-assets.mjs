// assets/raw/*.png (GPT 원본) → assets/img/*.webp 로 줄이고 압축,
// 글꼴 복사, 그리고 앱/서비스워커가 쓰는 목록 data/assets.js 를 만든다.
// 실행: npm run build:assets
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync, copyFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = new URL('../', import.meta.url);
const p = (rel) => new URL(rel, root);
mkdirSync(p('assets/img'), { recursive: true });
mkdirSync(p('assets/fonts'), { recursive: true });

// 1) 글꼴: fontsource 의 Jua (woff2 만)
const fontDir = p('node_modules/@fontsource/jua/');
const css = readFileSync(new URL('400.css', fontDir), 'utf8')
  .replace(/url\(\.\/files\/([^)]+\.woff2)\) format\('woff2'\), url\([^)]+\) format\('woff'\)/g, "url($1) format('woff2')");
writeFileSync(p('assets/fonts/jua.css'), css);
const fonts = readdirSync(new URL('files/', fontDir)).filter((f) => f.endsWith('-400-normal.woff2'));
fonts.forEach((f) => copyFileSync(new URL(`files/${f}`, fontDir), p(`assets/fonts/${f}`)));

// 2) 이미지: 이름 규칙별 목표 가로 크기 (화면 표시 크기의 약 2배, 레티나 대응)
const WIDTH = (name) =>
  name === 'bg-sky' ? 1080 : name === 'bg-passport' ? 1200 : /-plane$/.test(name) ? 520
  : /^(jeonghu|geonhee)-/.test(name) ? 480 : name.startsWith('icon-') ? 200 : 600;
const images = {};
const rawDir = p('assets/raw/');
const raws = existsSync(rawDir) ? readdirSync(rawDir).filter((f) => /\.(png|jpe?g|webp)$/i.test(f)) : [];
for (const f of raws) {
  const name = f.replace(/\.[^.]+$/, '').toLowerCase();
  const src = fileURLToPath(new URL(f, rawDir));
  if (name === 'app-icon') { // 홈 화면 아이콘은 PNG 로
    for (const s of [192, 512]) await sharp(src).resize(s, s).png().toFile(fileURLToPath(p(`icon-${s}.png`)));
    continue;
  }
  const out = `assets/img/${name}.webp`;
  await sharp(src).resize({ width: WIDTH(name), withoutEnlargement: true }).webp({ quality: 82 }).toFile(fileURLToPath(p(out)));
  images[name] = out;
}

// 3) 목록 + 빌드 버전 (내용이 바뀌면 버전이 바뀌어 설치된 앱이 새로 받는다)
const core = ['index.html', 'style.css', 'js/core.js', 'js/battle.js', 'js/play.js', 'js/world.js', 'js/versus.js', 'js/badges.js', 'js/minigames.js', 'js/update.js', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png',
  'data/countries.js', 'data/cities.js', 'data/history.js', 'data/science.js', 'data/nonsense.js', 'data/kbo.js', 'data/history2.js', 'data/science2.js', 'data/nonsense2.js', 'data/kbo2.js', 'data/minecraft.js', 'data/minecraft2.js', 'data/map.js',
  'assets/fonts/jua.css'];
const precache = [...core, ...fonts.map((f) => `assets/fonts/${f}`), ...Object.values(images)];
const h = createHash('sha1');
for (const f of precache) { const u = p(f); if (existsSync(u)) h.update(readFileSync(u)); }
const out = `// 자동 생성 (tools/build-assets.mjs). 직접 고치지 마세요.
self.BUILD = '${h.digest('hex').slice(0, 10)}';
self.ASSETS = ${JSON.stringify(images, null, 1)};
self.PRECACHE = ${JSON.stringify(precache)};
`;
writeFileSync(p('data/assets.js'), out);
console.log(`images ${Object.keys(images).length}, fonts ${fonts.length}, precache ${precache.length} files, build ${out.match(/BUILD = '(\w+)'/)[1]}`);
