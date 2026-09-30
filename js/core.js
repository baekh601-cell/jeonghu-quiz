'use strict';
// 공통: 저장, 유틸, 에셋, 모션, 효과음, 문제 출처

// ───────── 저장 (기기별 진행 상황) ─────────
const STORE_KEY = 'jeonghu-quiz-v1';
const save = {
  xp: 0, answered: 0, correct: 0, bestStreak: 0,
  seen: {},          // 문제 키 → true (최근에 본 문제는 덜 나오게)
  wrong: [],         // 오답 노트
  perCat: {},        // 카테고리별 { n, ok }
  mapBest: {},       // 자유 여행 지도 최고 점수
  stamps: {},        // (이전 버전 호환)
  stages: {},        // 왕국 스테이지 id → 별 개수 (1~3)
  bonus: {},         // ? 블록 첫 보상 받았는지
  coins: 0,
  items: { half: 1, pass: 1, heart: 1, clock: 1 },
  rides: ['plane'],  // 가진 탈것
  ride: 'plane',     // 타고 있는 탈것
  sound: true,
  bosses: 0,         // 쓰러뜨린 보스 수 (중복 포함)
  speedBest: 0,
  story: false,      // 첫 이야기 봤는지
  recent: [],        // 최근 정답 여부 (난이도 자동 조정용)
};
try {
  const old = JSON.parse(localStorage.getItem(STORE_KEY)) || {};
  Object.assign(save, old, { items: { ...save.items, ...(old.items || {}) } });
} catch (e) { /* 저장소 없음 */ }
function persist() { try { localStorage.setItem(STORE_KEY, JSON.stringify(save)); } catch (e) { /* 무시 */ } }

// ───────── 유틸 ─────────
const $app = document.getElementById('app');
const rnd = (n) => Math.floor(Math.random() * n);
const pick = (arr) => arr[rnd(arr.length)];
function shuffle(arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const stars = (d) => '★'.repeat(d) + '☆'.repeat(3 - d);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const DIFF_NAME = { 0: '섞어서', 1: '쉬움', 2: '보통', 3: '어려움' };
function levelOf(xp) { const lv = Math.floor(Math.sqrt(xp / 60)) + 1; const cur = 60 * (lv - 1) ** 2, next = 60 * lv ** 2; return { lv, pct: (xp - cur) / (next - cur), toNext: next - xp }; }
const RANKS = ['꼬마 여행자', '견습 모험가', '모험가', '용감한 모험가', '기사', '왕국 기사', '대기사', '왕국의 영웅', '전설의 영웅'];
const rankOf = (lv) => RANKS[Math.min(RANKS.length - 1, Math.floor((lv - 1) / 3))];
function toast(msg) {
  const t = document.createElement('div'); t.className = 'toast'; t.innerHTML = msg;
  document.body.appendChild(t); setTimeout(() => t.remove(), 1700);
}

// ───────── 이미지 에셋 (없으면 이모지로 대신) ─────────
const ASSETS = window.ASSETS || {};
function art(name, emoji, cls = '') {
  return ASSETS[name]
    ? `<img class="art ${cls}" src="${ASSETS[name]}" alt="">`
    : `<span class="art ph ${cls}" aria-hidden="true">${emoji}</span>`;
}
const JH = { // 정후 표정
  wave: (c = '') => art('jeonghu-wave', '🧒', 'who ' + c),
  think: (c = '') => art('jeonghu-think', '🤔', 'who ' + c),
  correct: (c = '') => art('jeonghu-correct', '🥳', 'who pop ' + c),
  wrong: (c = '') => art('jeonghu-wrong', '😅', 'who pop ' + c),
  king: (c = '') => art('jeonghu-king', '🤴', 'who ' + c),
  explorer: (c = '') => art('jeonghu-explorer', '🕵️', 'who ' + c),
  walk: (c = '') => art(ASSETS['jeonghu-walk'] ? 'jeonghu-walk' : 'jeonghu-wave', '🧒', 'who ' + c), // 걷는 그림이 없으면 손 흔드는 그림

};
if (ASSETS['bg-sky']) { document.body.classList.add('has-bg'); document.body.style.setProperty('--bg-img', `url(${ASSETS['bg-sky']})`); }

// 탈것 (상점에서 산다) — 지도에서 정후 옆에, 화면 전환 때 날아간다
const RIDES = {
  plane: { name: '꼬마 비행기', ic: '🛩️', price: 0 },
  balloon: { name: '열기구', ic: '🎈', price: 60 },
  heli: { name: '헬리콥터', ic: '🚁', price: 100 },
  ship: { name: '해적선', ic: '🏴‍☠️', price: 150 },
  rocket: { name: '로켓', ic: '🚀', price: 220 },
  ufo: { name: 'UFO', ic: '🛸', price: 320 },
  dragon: { name: '드래곤', ic: '🐉', price: 500 },
};
const rideIcon = () => (RIDES[save.ride] || RIDES.plane).ic;

// ───────── 효과음 (WebAudio 로 직접 만든 8비트 소리, 파일 없음) ─────────
let actx = null;
function audio() {
  if (!save.sound) return null;
  if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
  if (actx.state === 'suspended') actx.resume();
  return actx;
}
function tone(freq, dur, { type = 'square', vol = 0.06, at = 0, slide = 0 } = {}) {
  const a = audio(); if (!a) return;
  const t0 = a.currentTime + at;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t0 + dur);
  g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(a.destination); o.start(t0); o.stop(t0 + dur + 0.02);
}
const seq = (notes, step = 0.09, opt = {}) => notes.forEach((f, i) => f && tone(f, step * 1.3, { ...opt, at: i * step }));
const SFX = {
  tap: () => tone(660, 0.05, { vol: 0.03 }),
  coin: () => { tone(988, 0.07); tone(1319, 0.25, { at: 0.07 }); },
  correct: () => seq([523, 659, 784, 1047], 0.07),
  wrong: () => { tone(220, 0.18, { type: 'sawtooth', vol: 0.05 }); tone(156, 0.3, { type: 'sawtooth', vol: 0.05, at: 0.16 }); },
  step: () => tone(440, 0.05, { type: 'triangle', vol: 0.08 }),
  clear: () => seq([523, 523, 523, 659, 0, 784, 0, 1047], 0.1),
  fail: () => seq([392, 370, 349, 330], 0.18, { type: 'triangle', vol: 0.08 }),
  hit: () => { tone(180, 0.12, { type: 'square', vol: 0.07, slide: 0.4 }); tone(90, 0.2, { type: 'sawtooth', vol: 0.05, at: 0.05 }); },
  hurt: () => tone(300, 0.3, { type: 'square', vol: 0.05, slide: 0.3 }),
  power: () => seq([392, 523, 659, 784, 1047, 1319], 0.05),
  open: () => seq([262, 330, 392, 523, 659, 784, 1047], 0.06, { type: 'triangle', vol: 0.09 }),
  fever: () => seq([784, 988, 1175, 1568], 0.06),
  tick: () => tone(1200, 0.03, { vol: 0.03 }),
  unlock: () => seq([659, 0, 659, 784, 1047], 0.08),
};
function sfx(name) { try { SFX[name] && SFX[name](); } catch (e) { /* 소리 실패는 무시 */ } }
document.addEventListener('pointerdown', () => audio(), { once: true });

// ───────── 화면 크기 맞추기 (폰·폴드·태블릿) ─────────
// 레이아웃은 폰(약 400px 폭) 기준으로 짜여 있고, 큰 화면에서는 통째로 확대한다.
// 가로로 넓은 화면(태블릿 가로, 폴드 펼침 가로)은 문제와 보기를 좌우 두 칸으로 나눈다.
let Z = 1;
if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; // 새로 열 때 예전 스크롤 위치로 덮어쓰지 않게
function fitScreen() {
  const w = innerWidth, h = innerHeight;
  const wide = w >= 700 && w > h * 1.05;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  Z = wide ? clamp(Math.min(w / 1040, h / 640), 1, 1.45) : clamp(Math.min(w / 440, h / 700), 1, 1.6);
  Z = Math.round(Z * 100) / 100;
  document.body.style.zoom = Z === 1 ? '' : Z;
  document.documentElement.style.setProperty('--z', Z);
  document.body.classList.toggle('wide', wide);
}
fitScreen();
let fitTimer;
addEventListener('resize', () => { clearTimeout(fitTimer); fitTimer = setTimeout(fitScreen, 120); }); // 폴드를 접고 펼 때도

// ───────── 모션 ─────────
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
function show(render) { // 화면 전환: 새 화면이 톡 튀어 오른다
  document.body.classList.remove('fever');
  document.getElementById('ui').innerHTML = ''; // 월드맵 전용 HUD 지우기
  render();
  $app.classList.remove('screen-in'); void $app.offsetWidth; $app.classList.add('screen-in');
  window.scrollTo(0, 0);
}
function flyTo(render) { // 탈것이 화면을 가로지르며 다음 화면으로
  if (reduced) return show(render);
  const p = document.createElement('div');
  p.className = 'flyby';
  p.innerHTML = save.ride === 'plane' ? art('jeonghu-plane', '🛩️', '') : `<span class="art ph">${rideIcon()}</span>`;
  p.firstElementChild.style.cssText = 'width:100%;height:100%';
  document.body.appendChild(p);
  setTimeout(() => show(render), 420);
  setTimeout(() => p.remove(), 1150);
}
function confetti(n = 90) {
  if (reduced) return;
  const c = document.createElement('canvas'); c.className = 'confetti';
  const dpr = devicePixelRatio || 1; c.width = innerWidth * dpr; c.height = innerHeight * dpr;
  document.body.appendChild(c);
  const ctx = c.getContext('2d'); ctx.scale(dpr, dpr);
  const colors = ['#ffd43b', '#ff6b6b', '#3ddc97', '#4fb3ff', '#ffffff'];
  const bits = Array.from({ length: n }, () => ({
    x: innerWidth / 2 + (Math.random() - 0.5) * 120, y: innerHeight * 0.35,
    vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 14 - 4, r: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.4,
    w: 7 + Math.random() * 7, h: 4 + Math.random() * 5, c: pick(colors),
  }));
  let t = 0;
  (function frame() {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const b of bits) {
      b.vy += 0.35; b.vx *= 0.99; b.x += b.vx; b.y += b.vy; b.r += b.vr;
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.r); ctx.fillStyle = b.c; ctx.strokeStyle = '#1f2a5a'; ctx.lineWidth = 1.5;
      ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h); ctx.strokeRect(-b.w / 2, -b.h / 2, b.w, b.h); ctx.restore();
    }
    if (++t < 130) requestAnimationFrame(frame); else c.remove();
  })();
}
function floaty(text, el, cls = '') {
  const r = el.getBoundingClientRect();
  const f = document.createElement('div'); f.className = 'floaty ' + cls; f.innerHTML = text;
  f.style.left = `${(r.left + r.width / 2) / Z - 20}px`; f.style.top = `${r.top / Z}px`; // 화면 좌표 → 확대 전 좌표
  document.body.appendChild(f); setTimeout(() => f.remove(), 1000);
}
function shake() { if (reduced) return; document.body.classList.remove('shake'); void document.body.offsetWidth; document.body.classList.add('shake'); }
function modal(html, { close = true } = {}) { // 가운데 카드 팝업. 닫히면 resolve
  return new Promise((resolve) => {
    const o = document.createElement('div'); o.className = 'overlay';
    o.innerHTML = `<div class="card pop-card">${html}</div>`;
    document.body.appendChild(o);
    const done = (v) => { o.remove(); resolve(v); };
    o.querySelectorAll('[data-v]').forEach((b) => (b.onclick = () => { sfx('tap'); done(b.dataset.v); }));
    if (close) o.addEventListener('click', (e) => { if (e.target === o) done(null); });
  });
}
function celebrate(title, body, who = JH.king()) {
  confetti(140); sfx('clear');
  return modal(`${who}<h2>${title}</h2><p>${body}</p><button class="go press" data-v="ok">좋아요!</button>`);
}
function addXp(gain) {
  const before = levelOf(save.xp).lv;
  save.xp += gain;
  const after = levelOf(save.xp).lv;
  if (after > before) setTimeout(() => celebrate(`레벨 업! Lv.${after}`, `이제 정후는 <b>${rankOf(after)}</b>!`), 600);
}
function addCoins(n, el) {
  if (!n) return;
  save.coins += n;
  if (el) floaty(`🪙+${n}`, el, 'coin-float');
  const hud = document.querySelector('[data-coins]');
  if (hud) { hud.textContent = save.coins.toLocaleString(); hud.parentElement.classList.remove('bump'); void hud.offsetWidth; hud.parentElement.classList.add('bump'); }
}

// ───────── 문제 출처 ─────────
const CATS = {
  capital: { name: '세계 지리', ic: '🏛️', icon: 'icon-capital', desc: '수도·대륙·도시·방위', c: '#4fb3ff' },
  flag: { name: '국기', ic: '🚩', icon: 'icon-flag', desc: '어느 나라 국기일까?', c: '#ff6b6b' },
  history: { name: '역사', ic: '📜', icon: 'icon-history', desc: '한국사·세계사', c: '#c48a3a' },
  science: { name: '과학 상식', ic: '🔬', icon: 'icon-science', desc: '우주·인체·자연', c: '#3ddc97' },
  kbo: { name: '프로야구', ic: '⚾', icon: 'icon-kbo', desc: 'KBO 선수·구단', c: '#1f2a5a' },
  nonsense: { name: '넌센스', ic: '🤪', icon: 'icon-nonsense', desc: '머리를 말랑말랑', c: '#b57cff' },
};
// 받침에 따라 은/는, 이/가 붙이기 (괄호 뒤는 괄호 앞 글자 기준)
function josa(word, withJong, noJong) {
  const ch = word.replace(/\s*\(.*\)$/, '').slice(-1).charCodeAt(0);
  const jong = ch >= 0xac00 && ch <= 0xd7a3 ? (ch - 0xac00) % 28 : 0;
  return word + (jong ? withJong : noJong);
}
const COUNTRIES = (window.COUNTRIES || []);
const CITIES = (window.CITIES || []);

function countryQuestions() {
  const out = [];
  const withCap = COUNTRIES.filter((c) => c.c);
  const others = (c, list, key, sameCont) => {
    const pool = list.filter((x) => x !== c && x[key] && x[key] !== c[key]);
    const near = sameCont ? pool.filter((x) => x.cont === c.cont) : [];
    const src = near.length >= 3 && Math.random() < 0.8 ? near : pool;
    return [...new Set(shuffle(src).map((x) => x[key]))].slice(0, 3);
  };
  const flag = (c) => (c.f ? c.f + ' ' : '');
  for (const c of withCap) {
    const sameName = c.c.startsWith(c.n.replace(/ .*/, '')); // 싱가포르, 멕시코시티처럼 수도에 나라 이름이 들어 있음
    if (sameName && c.c.replace(/ .*/, '') === c.n.replace(/ .*/, '')) continue; // 완전히 같으면 문제가 안 됨
    out.push({ k: 'cap:' + c.iso, q: `${c.n}의 수도는?`, a: c.c, w: others(c, withCap, 'c', true), d: c.d, e: `${flag(c)}${c.n}의 수도는 ${c.c}예요.` });
    if (!sameName) out.push({ k: 'capr:' + c.iso, q: `${josa(c.c, '은', '는')} 어느 나라의 수도일까?`, a: c.n, w: others(c, withCap, 'n', true), d: Math.min(3, c.d + (c.d === 1 ? 0 : 1)), e: `${josa(c.c, '은', '는')} ${flag(c)}${c.n}의 수도예요.` });
  }
  const conts = ['아시아', '유럽', '아프리카', '북아메리카', '남아메리카', '오세아니아'];
  for (const c of COUNTRIES) {
    if (c.d === 1 || c.noCont) continue; // 너무 쉽거나, 대륙 구분이 애매한 나라는 제외
    out.push({ k: 'cont:' + c.iso, q: `${josa(c.n, '은', '는')} 어느 대륙에 있을까?`, a: c.cont, w: shuffle(conts.filter((x) => x !== c.cont)).slice(0, 3), d: c.d, e: `${flag(c)}${josa(c.n, '은', '는')} ${c.cont}에 있어요.` });
  }
  // 이 도시는 어느 나라? (수도와 폭포·산 같은 명소는 제외 — 수도는 위에서 이미 묻고, 명소는 국경에 걸친 곳이 있음)
  const capSet = new Set(COUNTRIES.map((c) => c.c));
  const contOf = Object.fromEntries(COUNTRIES.map((c) => [c.n, c.cont]));
  const SPOT = /폭포|캐니언|울루루|마추픽추|킬리만자로|\(|^예루살렘$/; // 예루살렘: 소속이 국제 분쟁 중
  const world = CITIES.filter((c) => c.r === 'world' && contOf[c.co] && !SPOT.test(c.n));
  for (const c of world) {
    if (capSet.has(c.n) || c.n.startsWith(c.co)) continue;
    const near = COUNTRIES.filter((x) => x.n !== c.co && x.cont === contOf[c.co]);
    const w = shuffle(near.length >= 3 ? near : COUNTRIES.filter((x) => x.n !== c.co)).slice(0, 3).map((x) => x.n);
    out.push({ k: 'cityco:' + c.n, q: `${josa(c.n, '은', '는')} 어느 나라에 있는 도시일까?`, a: c.co, w, d: Math.max(2, c.d), e: `${josa(c.n, '은', '는')} ${c.co}의 도시예요.` });
  }
  // 가장 북/남/동/서쪽은? — 좌표로 정답이 확실하게 갈리도록 서로 충분히 떨어진 곳만 고른다
  const fmt = (c, dp) => `${c.n}(${c.lat >= 0 ? '북위' : '남위'} ${Math.abs(c.lat).toFixed(dp)}°, ${c.lon >= 0 ? '동경' : '서경'} ${Math.abs(c.lon).toFixed(dp)}°)`;
  const DIRS = [['북', 'lat', 1], ['남', 'lat', -1], ['동', 'lon', 1], ['서', 'lon', -1]];
  const spread = (pool, key, gap) => {
    for (let t = 0; t < 40; t++) {
      const s = shuffle(pool).slice(0, 4);
      const v = s.map((c) => c[key]).sort((a, b) => a - b);
      if (s.length === 4 && v.every((x, i) => !i || x - v[i - 1] >= gap)) return s;
    }
    return null;
  };
  const kr = CITIES.filter((c) => c.r === 'kr');
  for (let i = 0; i < 80; i++) {
    const isKr = i % 3 === 0;
    const [dir, key, sign] = DIRS[i % 4];
    // 동/서는 태평양을 건너면 헷갈리므로 한 대륙 안에서만 비교
    const cont = pick(conts);
    const sameCont = isKr || key === 'lon' || i % 2 === 0;
    const pool = isKr ? kr : sameCont ? world.filter((c) => contOf[c.co] === cont) : world;
    const set = spread(pool, key, isKr ? 0.4 : sameCont ? 3 : 6);
    if (!set) continue;
    const ans = set.reduce((a, b) => (sign * b[key] > sign * a[key] ? b : a));
    out.push({
      k: `dir:${dir}:${set.map((c) => c.n).sort().join(',')}`,
      q: `다음 중 가장 ${dir}쪽에 있는 ${isKr ? '곳은' : '도시는'}?`, a: ans.n, w: set.filter((c) => c !== ans).map((c) => c.n),
      d: isKr || sameCont ? 3 : 2, e: `${josa(ans.n, '이', '가')} 가장 ${dir}쪽이에요! ` + set.map((c) => fmt(c, isKr ? 1 : 0)).join(', '),
    });
  }
  return out;
}
function flagQuestions() {
  const out = [];
  for (const c of COUNTRIES) {
    if (!c.f) continue;
    const pool = COUNTRIES.filter((x) => x !== c && x.f);
    const near = pool.filter((x) => x.cont === c.cont);
    const w = shuffle(near.length >= 3 ? near : pool).slice(0, 3);
    out.push({ k: 'flag:' + c.iso, flag: c.f, q: '이 국기는 어느 나라일까?', a: c.n, w: w.map((x) => x.n), d: c.d, e: `${c.f} ${c.n}의 국기예요. 수도는 ${c.c || '-'}.` });
    out.push({ k: 'flagr:' + c.iso, q: `${c.n}의 국기는 어느 것일까?`, a: c.f, w: w.map((x) => x.f), flags: true, d: Math.min(3, c.d + 1), e: `${c.f} 이게 ${c.n}의 국기예요.` });
  }
  return out;
}
function bankQuestions(cat) { return (QB.banks[cat] || []).map((x, i) => ({ ...x, k: `${cat}:${i}:${x.q.slice(0, 12)}` })); }
function questionsFor(cat) {
  const list = cat === 'capital' ? countryQuestions() : cat === 'flag' ? flagQuestions() : bankQuestions(cat);
  return list.map((q) => ({ ...q, cat }));
}
const COUNT_CACHE = {};
const countFor = (cat) => (COUNT_CACHE[cat] ??= questionsFor(cat).length);

// 안 본 문제 우선으로 n개 고르기. diff: 0=전부, 숫자, 또는 [1,2] 같은 배열
function drawQuestions(list, n, diff) {
  const ok = Array.isArray(diff) ? (q) => diff.includes(q.d) : diff ? (q) => q.d === diff : () => true;
  let pool = list.filter(ok);
  if (pool.length < n) pool = list;
  let fresh = pool.filter((q) => !save.seen[q.k]);
  if (fresh.length < n) { // 다 풀었으면 이 묶음의 '본 문제' 기록을 초기화
    pool.forEach((q) => delete save.seen[q.k]);
    fresh = pool;
  }
  return shuffle(fresh).slice(0, n);
}
function mixedQuestions(n, diff) {
  const all = Object.keys(CATS).flatMap((k) => drawQuestions(questionsFor(k), n, diff));
  return shuffle(all).slice(0, n);
}
// 주제 섞기: 절반은 main 주제, 나머지는 다른 주제들에서 골고루
function themedQuestions(main, n, diff) {
  if (!CATS[main]) return mixedQuestions(n, diff);
  const half = Math.ceil(n / 2);
  const others = shuffle(Object.keys(CATS).filter((k) => k !== main));
  const each = Math.ceil((n - half) / others.length) + 1;
  const rest = shuffle(others.flatMap((k) => drawQuestions(questionsFor(k), each, diff))).slice(0, n - half);
  return shuffle([...drawQuestions(questionsFor(main), half, diff), ...rest]);
}
// 최근 실력에 맞춰 난이도 조정: 최근 20문제 정답률 85% 이상이면 한 단계 올리고, 50% 미만이면 한 단계 쉬운 문제도 섞는다
function adaptDiffs(diffs) {
  const r = (save.recent || []).slice(-20);
  if (r.length < 10) return diffs;
  const acc = r.filter(Boolean).length / r.length;
  if (acc >= 0.85) return [...new Set(diffs.map((d) => Math.min(3, d + 1)))];
  if (acc < 0.5) return [...new Set([Math.max(1, Math.min(...diffs) - 1), ...diffs])];
  return diffs;
}
const cityList = (region) => CITIES.filter((c) => !region || c.r === region).map((c) => ({ ...c, k: `city:${c.r}:${c.n}:${c.co}` }));

function topBar(title, right = '') {
  return `<div class="top"><button class="back press" data-back aria-label="뒤로">‹</button><h1>${title}</h1>${right}</div>`;
}
function bindBack(fn) { const b = $app.querySelector('[data-back]'); if (b) b.onclick = () => { sfx('tap'); fn(); }; }
