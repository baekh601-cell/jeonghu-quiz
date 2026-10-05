// data/landmarks.js 점검: 나라 이름, 좌표 범위, 난이도, 중복, 너무 가까운 두 곳
// 실행: node tools/check-landmarks.cjs
const path = require('path');
const root = path.join(__dirname, '..');
global.window = {};
require(path.join(root, 'data/countries.js'));
require(path.join(root, 'data/landmarks.js'));
const names = new Set(window.COUNTRIES.map((c) => c.n));
const L = window.LANDMARKS;
const errs = [], seen = new Set();
for (const x of L) {
  const id = x.n;
  if (!names.has(x.co)) errs.push(`${id}: 나라 이름이 countries.js 에 없음 ${x.co}`);
  if (!(typeof x.lat === 'number' && x.lat >= -90 && x.lat <= 90)) errs.push(`${id}: 위도 오류`);
  if (!(typeof x.lon === 'number' && x.lon >= -180 && x.lon <= 180)) errs.push(`${id}: 경도 오류`);
  if (![1, 2, 3].includes(x.d)) errs.push(`${id}: 난이도 오류`);
  if (!['world', 'kr'].includes(x.r)) errs.push(`${id}: 지역 오류`);
  if (x.r === 'kr' && !(x.lat >= 33 && x.lat <= 38.7 && x.lon >= 124.5 && x.lon <= 131.9)) errs.push(`${id}: 한국 지도 범위 밖`);
  if (x.r === 'kr' && x.co !== '대한민국') errs.push(`${id}: 한국 지도인데 나라가 대한민국이 아님`);
  if (seen.has(x.n)) errs.push(`${id}: 이름 중복`);
  seen.add(x.n);
  if (!x.e || !x.e.trim()) errs.push(`${id}: 설명 없음`);
  if (!x.ic || !x.ic.trim()) errs.push(`${id}: 이모지 없음`);
}
const rad = Math.PI / 180;
const dist = (a, b) => { const dl = (b.lat - a.lat) * rad, dn = (b.lon - a.lon) * rad; const h = Math.sin(dl / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dn / 2) ** 2; return 2 * 6371 * Math.asin(Math.sqrt(h)); };
const close = [];
for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) if (L[i].r === L[j].r && dist(L[i], L[j]) < 1.5) close.push(`${L[i].n}~${L[j].n} ${dist(L[i], L[j]).toFixed(2)}km`);
const cnt = {};
for (const x of L) { cnt[x.r] = cnt[x.r] || { total: 0, 1: 0, 2: 0, 3: 0 }; cnt[x.r].total++; cnt[x.r][x.d]++; }
console.log(JSON.stringify(cnt), '총', L.length);
console.log('1.5km 안에 붙어 있는 곳:', close.join(' | ') || '없음');
console.log(errs.length ? `오류:\n${errs.join('\n')}` : '모두 통과');
process.exit(errs.length ? 1 : 0);
