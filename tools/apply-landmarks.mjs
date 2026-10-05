// 랜드마크 검증 결과(review/landmarks.json)를 data/landmarks.js 에 반영한다 (고친 줄만 바꾸고 나머지·주석은 그대로).
// 실행: node tools/apply-landmarks.mjs   (반영 뒤 node tools/check-landmarks.cjs 로 점검)
import { readFileSync, writeFileSync } from 'node:fs';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const file = new URL('data/landmarks.js', root);
const src = readFileSync(file, 'utf8');
const ctx = { window: {} };
vm.runInNewContext(src, ctx);
const byN = new Map(ctx.window.LANDMARKS.map((x) => [x.n, x]));
const { fixes } = JSON.parse(readFileSync(new URL('review/landmarks.json', root), 'utf8'));
const q = (s) => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
const row = (x) => `  {n:${q(x.n)}, co:${q(x.co)}, lat:${x.lat}, lon:${x.lon}, d:${x.d}, r:${q(x.r)}, ic:${q(x.ic)}, e:${q(x.e)}},`;
const lines = src.split(/\r?\n/);
const lineOf = (n) => lines.findIndex((l) => l.trimStart().startsWith(`{n:${q(n)},`) || l.trimStart().startsWith(`{n:"${n}",`));
let done = 0;
for (const f of fixes) {
  const x = byN.get(f.n), i = lineOf(f.n);
  if (!x || i < 0) { console.warn(`못 찾음: ${f.n}`); continue; }
  if (f.delete) { lines[i] = null; done++; continue; }
  for (const k of ['lat', 'lon', 'co', 'e', 'd', 'ic']) if (f[k] !== undefined) x[k] = f[k];
  if (f.n_new) x.n = f.n_new;
  lines[i] = row(x);
  done++;
}
writeFileSync(file, lines.filter((l) => l !== null).join('\n'));
console.log(`반영 ${done}건`);
