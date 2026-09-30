// 배포·앱에 들어갈 파일만 www/ 로 모은다 (GitHub Pages 와 안드로이드 앱이 같은 결과물을 쓴다).
// 실행: npm run build:www   (먼저 npm run build:assets)
import { cpSync, rmSync, mkdirSync, existsSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const out = new URL('www/', root);
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
const files = ['index.html', 'style.css', 'sw.js', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png'];
for (const f of files) cpSync(new URL(f, root), new URL(f, out));
for (const dir of ['js', 'data', 'assets/fonts', 'assets/img']) {
  if (existsSync(new URL(dir, root))) cpSync(new URL(dir, root), new URL(dir, out), { recursive: true });
}
console.log('www/ 준비 완료');
