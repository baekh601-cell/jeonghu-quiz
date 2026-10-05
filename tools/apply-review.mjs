// 검증 결과(review/*.json)를 문제은행(data/*.js)에 반영하고 파일을 다시 쓴다.
// 사용: node tools/apply-review.mjs <묶음>   예) node tools/apply-review.mjs batch2
// review/overrides.json 에 같은 질문(q)이 있으면 그 내용이 우선한다 (사람이 최종 판단한 수정).
// 한 번 반영한 묶음을 다시 돌리면 이미 바뀐 질문은 "못 찾음"으로 건너뛴다.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const read = (f) => readFileSync(new URL(f, root), 'utf8');
const BATCHES = {
  batch1: [
    { file: 'history', cat: 'history', reviews: ['history-korea', 'history-world'] },
    { file: 'science', cat: 'science', reviews: ['science'] },
    { file: 'kbo', cat: 'kbo', reviews: ['kbo'] },
    { file: 'nonsense', cat: 'nonsense', reviews: ['nonsense'] },
  ],
  batch2: [
    { file: 'history2', cat: 'history', reviews: ['history2a', 'history2b', 'history2c'] },
    { file: 'science2', cat: 'science', reviews: ['science2a', 'science2b'] },
    { file: 'kbo2', cat: 'kbo', reviews: ['kbo2'] },
    { file: 'nonsense2', cat: 'nonsense', reviews: ['nonsense2'] },
  ],
  minecraft: [
    { file: 'minecraft', cat: 'minecraft', reviews: ['minecraft'] },
    { file: 'minecraft2', cat: 'minecraft', reviews: ['minecraft2'] },
  ],
  samguk: [
    { file: 'samguk', cat: 'samguk', reviews: ['samguk'] },
    { file: 'samguk2', cat: 'samguk', reviews: ['samguk2'] },
  ],
};
const batch = BATCHES[process.argv[2]];
if (!batch) { console.error(`사용: node tools/apply-review.mjs <${Object.keys(BATCHES).join('|')}>`); process.exit(1); }
const overrides = existsSync(new URL('review/overrides.json', root)) ? JSON.parse(read('review/overrides.json')) : {};

function load(file, cat) {
  const ctx = { QB: { banks: {}, add(c, a) { (this.banks[c] = this.banks[c] || []).push(...a); } } };
  vm.runInNewContext(read(`data/${file}.js`), ctx);
  return ctx.QB.banks[cat];
}
const lit = (v) => JSON.stringify(v);
function dump(file, cat, list) {
  const row = (x) => `  {q:${lit(x.q)}, a:${lit(x.a)}, w:${lit(x.w)}, d:${x.d}, e:${lit(x.e || '')}},`;
  return `// 문제은행: ${cat} (${file}.js, ${list.length}문제). 검증 반영: tools/apply-review.mjs\nQB.add('${cat}', [\n${list.map(row).join('\n')}\n]);\n`;
}

let total = 0;
for (const { file, cat, reviews } of batch) {
  let list = load(file, cat);
  const byQ = new Map(list.map((x) => [x.q, x]));
  const issues = reviews.flatMap((f) => (existsSync(new URL(`review/${f}.json`, root)) ? JSON.parse(read(`review/${f}.json`)).issues : (console.warn(`검증 파일 없음: ${f}`), [])));
  for (const it of issues) {
    const fix = { ...it, ...(overrides[it.q] || {}) };
    const x = byQ.get(fix.q);
    if (!x) { console.warn(`[${file}] 못 찾음: ${fix.q}`); continue; }
    if (fix.action === 'delete') { x._del = true; total++; continue; }
    for (const k of ['a', 'w', 'e', 'd']) if (fix[k] !== undefined) x[k] = fix[k];
    const nq = fix.q_new || fix.newQ;
    if (nq) x.q = nq;
    if (x.w.includes(x.a) || new Set(x.w).size !== 3) throw new Error(`보기 오류: ${x.q}`);
    total++;
  }
  list = list.filter((x) => !x._del);
  writeFileSync(new URL(`data/${file}.js`, root), dump(file, cat, list));
  console.log(`${file}: ${list.length}문제`);
}
console.log(`반영 ${total}건`);
