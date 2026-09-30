// 검증 결과(review/*.json)를 문제은행(data/*.js)에 반영하고 파일을 다시 쓴다.
// 사용: node tools/apply-review.mjs   (review/overrides.json 이 있으면 그 내용이 우선)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const read = (f) => readFileSync(new URL(f, root), 'utf8');
const REVIEWS = { history: ['history-korea', 'history-world'], science: ['science'], kbo: ['kbo'], nonsense: ['nonsense'] };
const overrides = existsSync(new URL('review/overrides.json', root)) ? JSON.parse(read('review/overrides.json')) : {};

function load(cat) {
  const ctx = { QB: { banks: {}, add(c, a) { (this.banks[c] = this.banks[c] || []).push(...a); } } };
  vm.runInNewContext(read(`data/${cat}.js`), ctx);
  return ctx.QB.banks[cat];
}
const lit = (v) => JSON.stringify(v);
function dump(cat, list) {
  const row = (x) => `  {q:${lit(x.q)}, a:${lit(x.a)}, w:${lit(x.w)}, d:${x.d}, e:${lit(x.e || '')}},`;
  return `// 문제은행: ${cat} (${list.length}문제). 검증 반영: tools/apply-review.mjs\nQB.add('${cat}', [\n${list.map(row).join('\n')}\n]);\n`;
}

let total = 0;
for (const [cat, files] of Object.entries(REVIEWS)) {
  let list = load(cat);
  const byQ = new Map(list.map((x) => [x.q, x]));
  const issues = files.flatMap((f) => (existsSync(new URL(`review/${f}.json`, root)) ? JSON.parse(read(`review/${f}.json`)).issues : []));
  for (const it of issues) {
    const fix = { ...it, ...(overrides[it.q] || {}) };
    const x = byQ.get(fix.q);
    if (!x) { console.warn(`[${cat}] 못 찾음: ${fix.q}`); continue; }
    if (fix.action === 'delete') { x._del = true; total++; continue; }
    for (const k of ['a', 'w', 'e', 'd']) if (fix[k] !== undefined) x[k] = fix[k];
    const nq = fix.q_new || fix.newQ;
    if (nq) x.q = nq;
    if (x.w.includes(x.a) || new Set(x.w).size !== 3) throw new Error(`보기 오류: ${x.q}`);
    total++;
  }
  list = list.filter((x) => !x._del);
  writeFileSync(new URL(`data/${cat}.js`, root), dump(cat, list));
  console.log(`${cat}: ${list.length}문제`);
}
console.log(`반영 ${total}건`);
