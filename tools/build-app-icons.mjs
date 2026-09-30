// 안드로이드 앱 아이콘·시작 화면 원본을 resources/ 에 만든다 (@capacitor/assets 가 여기서 크기별로 생성).
// 원본: assets/raw/app-icon.png (GPT 로 만든 앱 아이콘)
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const p = (rel) => fileURLToPath(new URL(`../${rel}`, import.meta.url));
mkdirSync(p('resources'), { recursive: true });
const src = p('assets/raw/app-icon.png');
const SKY = { r: 79, g: 179, b: 255, alpha: 1 }; // #4fb3ff

// 1) 예전 방식 아이콘 (정사각형 꽉 차게)
await sharp(src).resize(1024, 1024).png().toFile(p('resources/icon-only.png'));
// 2) 적응형 아이콘: 기기마다 동그라미·둥근 사각형으로 잘리므로 가운데 66% 안에 그림을 둔다
const fg = await sharp(src).resize(680, 680).png().toBuffer();
await sharp({ create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([{ input: fg, gravity: 'center' }]).png().toFile(p('resources/icon-foreground.png'));
await sharp({ create: { width: 1024, height: 1024, channels: 4, background: SKY } }).png().toFile(p('resources/icon-background.png'));
// 3) 시작 화면: 하늘색 바탕 가운데 아이콘
const logo = await sharp(src).resize(900, 900).png().toBuffer();
for (const name of ['splash.png', 'splash-dark.png']) {
  await sharp({ create: { width: 2732, height: 2732, channels: 4, background: SKY } })
    .composite([{ input: logo, gravity: 'center' }]).png().toFile(p(`resources/${name}`));
}
console.log('resources/ 아이콘·시작 화면 준비 완료');
