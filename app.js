'use strict';

// ───────── 저장 (기기별 진행 상황) ─────────
const STORE_KEY = 'jeonghu-quiz-v1';
const save = {
  xp: 0, answered: 0, correct: 0, bestStreak: 0,
  seen: {},        // 문제 키 → true (최근에 본 문제는 덜 나오게)
  wrong: [],       // 오답 노트
  perCat: {},      // 카테고리별 { n, ok }
  mapBest: {},     // 지역별 최고 점수
  stamps: {},      // 여행지별 받은 도장 수
};
try { Object.assign(save, JSON.parse(localStorage.getItem(STORE_KEY)) || {}); } catch (e) { /* 저장소 없음 */ }
function persist() { try { localStorage.setItem(STORE_KEY, JSON.stringify(save)); } catch (e) { /* 무시 */ } }

// ───────── 유틸 ─────────
const $app = document.getElementById('app');
const rnd = (n) => Math.floor(Math.random() * n);
const pick = (arr) => arr[rnd(arr.length)];
function shuffle(arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const stars = (d) => '★'.repeat(d) + '☆'.repeat(3 - d);
const DIFF_NAME = { 0: '섞어서', 1: '쉬움', 2: '보통', 3: '어려움' };
function levelOf(xp) { const lv = Math.floor(Math.sqrt(xp / 60)) + 1; const cur = 60 * (lv - 1) ** 2, next = 60 * lv ** 2; return { lv, pct: (xp - cur) / (next - cur), toNext: next - xp }; }
const RANKS = ['꼬마 여행자', '견습 승무원', '승무원', '부기장', '기장', '베테랑 기장', '세계 탐험가', '지구 박사', '전설의 탐험가'];
const rankOf = (lv) => RANKS[Math.min(RANKS.length - 1, Math.floor((lv - 1) / 3))];
function toast(msg) {
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
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
  wave: () => art('jeonghu-wave', '🧒', 'who'),
  think: () => art('jeonghu-think', '🤔', 'who'),
  correct: () => art('jeonghu-correct', '🥳', 'who pop'),
  wrong: () => art('jeonghu-wrong', '😅', 'who pop'),
  king: () => art('jeonghu-king', '🤴', 'who'),
  explorer: () => art('jeonghu-explorer', '🕵️', 'who'),
};
if (ASSETS['bg-sky']) { document.body.classList.add('has-bg'); document.body.style.setProperty('--bg-img', `url(${ASSETS['bg-sky']})`); }

// ───────── 모션 ─────────
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
function show(render) { // 화면 전환: 새 화면이 톡 튀어 오른다
  render();
  $app.classList.remove('screen-in'); void $app.offsetWidth; $app.classList.add('screen-in');
  window.scrollTo(0, 0);
}
function flyTo(render) { // 비행기가 화면을 가로지르며 다음 화면으로
  if (reduced) return show(render);
  const p = document.createElement('div');
  p.className = 'flyby';
  p.innerHTML = art('jeonghu-plane', '🛩️', '');
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
    x: innerWidth / 2 + (Math.random() - .5) * 120, y: innerHeight * .35,
    vx: (Math.random() - .5) * 14, vy: -Math.random() * 14 - 4, r: Math.random() * 6.28, vr: (Math.random() - .5) * .4,
    w: 7 + Math.random() * 7, h: 4 + Math.random() * 5, c: pick(colors),
  }));
  let t = 0;
  (function frame() {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const b of bits) {
      b.vy += .35; b.vx *= .99; b.x += b.vx; b.y += b.vy; b.r += b.vr;
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.r); ctx.fillStyle = b.c; ctx.strokeStyle = '#1f2a5a'; ctx.lineWidth = 1.5;
      ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h); ctx.strokeRect(-b.w / 2, -b.h / 2, b.w, b.h); ctx.restore();
    }
    if (++t < 130) requestAnimationFrame(frame); else c.remove();
  })();
}
function floaty(text, el) {
  const r = el.getBoundingClientRect();
  const f = document.createElement('div'); f.className = 'floaty'; f.textContent = text;
  f.style.left = `${r.left + r.width / 2 - 20}px`; f.style.top = `${r.top}px`;
  document.body.appendChild(f); setTimeout(() => f.remove(), 1000);
}
function celebrate(title, body, who = JH.king()) {
  confetti(140);
  const o = document.createElement('div'); o.className = 'overlay';
  o.innerHTML = `<div class="card">${who}<h2>${title}</h2><p>${body}</p><button class="go">좋아요!</button></div>`;
  document.body.appendChild(o);
  o.querySelector('.go').onclick = () => o.remove();
}
function addXp(gain) {
  const before = levelOf(save.xp).lv;
  save.xp += gain;
  const after = levelOf(save.xp).lv;
  if (after > before) setTimeout(() => celebrate(`레벨 업! Lv.${after}`, `이제 정후는 <b>${rankOf(after)}</b>!`), 500);
}

// ───────── 여행지(카테고리) ─────────
const CATS = {
  capital: { name: '나라와 수도', ic: '🏛️', icon: 'icon-capital', desc: '수도·대륙 맞히기', c: '#4fb3ff' },
  flag: { name: '국기', ic: '🚩', icon: 'icon-flag', desc: '어느 나라 국기일까?', c: '#ff6b6b' },
  history: { name: '역사', ic: '📜', icon: 'icon-history', desc: '한국사·세계사', c: '#c48a3a' },
  science: { name: '과학 상식', ic: '🔬', icon: 'icon-science', desc: '우주·인체·자연', c: '#3ddc97' },
  kbo: { name: '프로야구', ic: '⚾', icon: 'icon-kbo', desc: 'KBO 선수·구단', c: '#1f2a5a' },
  nonsense: { name: '넌센스', ic: '🤪', icon: 'icon-nonsense', desc: '머리를 말랑말랑', c: '#b57cff' },
};
const MAPCAT = { name: '지도에서 도시 찾기', ic: '🗺️', icon: 'icon-map', desc: '도시 위치를 콕! 가까울수록 고득점', c: '#ffd43b' };
const STAMP_KEYS = [...Object.keys(CATS), 'map'];
const catInfo = (k) => (k === 'map' ? MAPCAT : k === 'mix' ? { name: '전부 섞기', ic: '🌏', icon: 'icon-mix', desc: '모든 주제에서 골고루', c: '#3ddc97' } : k === 'wrong' ? { name: '오답 노트', ic: '📒', icon: 'icon-wrongnote' } : CATS[k]);
const stampCount = () => STAMP_KEYS.filter((k) => save.stamps[k]).length;
const isKing = () => stampCount() === STAMP_KEYS.length;
function giveStamp(k) {
  const first = !save.stamps[k];
  save.stamps[k] = (save.stamps[k] || 0) + 1;
  persist();
  if (first && isKing()) setTimeout(() => celebrate('👑 퀴즈왕 등극!', '모든 여행지 도장을 모았어요!<br>정후는 이제 세계일주 퀴즈왕!'), 1400);
}

const COUNTRIES = (window.COUNTRIES || []);
const CITIES = (window.CITIES || []);

// 나라 데이터로 문제 자동 생성
function countryQuestions() {
  const out = [];
  const withCap = COUNTRIES.filter((c) => c.c);
  const others = (c, list, key, sameCont) => {
    const pool = list.filter((x) => x !== c && x[key] && x[key] !== c[key]);
    const near = sameCont ? pool.filter((x) => x.cont === c.cont) : [];
    const src = near.length >= 3 && Math.random() < 0.8 ? near : pool;
    return [...new Set(shuffle(src).map((x) => x[key]))].slice(0, 3);
  };
  for (const c of withCap) {
    out.push({ k: 'cap:' + c.iso, q: `${c.n}의 수도는?`, a: c.c, w: others(c, withCap, 'c', true), d: c.d, e: `${c.f} ${c.n}의 수도는 ${c.c}예요.` });
    out.push({ k: 'capr:' + c.iso, q: `${c.c}은(는) 어느 나라의 수도일까?`, a: c.n, w: others(c, withCap, 'n', true), d: Math.min(3, c.d + (c.d === 1 ? 0 : 1)), e: `${c.c}은(는) ${c.f} ${c.n}의 수도예요.` });
  }
  const conts = ['아시아', '유럽', '아프리카', '북아메리카', '남아메리카', '오세아니아'];
  for (const c of COUNTRIES) {
    if (c.d === 1) continue; // 너무 쉬운 대륙 문제는 제외
    out.push({ k: 'cont:' + c.iso, q: `${c.n}은(는) 어느 대륙에 있을까?`, a: c.cont, w: shuffle(conts.filter((x) => x !== c.cont)).slice(0, 3), d: c.d, e: `${c.f} ${c.n}은(는) ${c.cont}에 있어요.` });
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
  if (cat === 'capital') return countryQuestions();
  if (cat === 'flag') return flagQuestions();
  return bankQuestions(cat);
}
const countFor = (cat) => (cat === 'capital' ? COUNTRIES.filter((c) => c.c).length * 2 + COUNTRIES.filter((c) => c.d !== 1).length
  : cat === 'flag' ? COUNTRIES.length * 2 : (QB.banks[cat] || []).length);

// 안 본 문제 우선으로 n개 고르기
function drawQuestions(list, n, diff) {
  let pool = diff ? list.filter((q) => q.d === diff) : list;
  if (!pool.length) pool = list;
  let fresh = pool.filter((q) => !save.seen[q.k]);
  if (fresh.length < n) { // 다 풀었으면 이 묶음의 '본 문제' 기록을 초기화
    pool.forEach((q) => delete save.seen[q.k]);
    fresh = pool;
  }
  return shuffle(fresh).slice(0, n);
}

// ───────── 화면: 홈 ─────────
const GREETINGS = [
  '안녕! 나는 정후야. 오늘은 어디로 떠나볼까? ✈️',
  '도장을 전부 모으면 퀴즈왕이 될 수 있어!',
  '지도 게임에서 1000점 도전해 볼래?',
  '틀린 문제는 오답 노트에 모아 뒀어!',
  '비행기 안에서도 퀴즈는 계속된다!',
  '이번엔 어려움(★★★)에 도전?',
];
function home() {
  const L = levelOf(save.xp);
  const got = stampCount();
  const ticket = (k, wide = false) => {
    const c = catInfo(k);
    const count = k === 'map' ? `최고 ${(save.mapBest.world || 0).toLocaleString()}점` : k === 'mix' ? '' : `${countFor(k)}문제`;
    return `<button class="ticket card press ${wide ? 'wide' : ''}" data-cat="${k}" style="--c:${c.c}">
      ${art(c.icon, c.ic)}<div><b>${c.name}</b><br><span>${c.desc}${count ? ' · ' + count : ''}</span></div>
      ${save.stamps[k] ? '<i class="done">도장 ✔</i>' : ''}</button>`;
  };
  $app.innerHTML = `
    <div class="logo"><small>JEONGHU'S WORLD TOUR</small><h1>정후의 <b>세계일주</b><br>퀴즈왕</h1></div>
    <div class="hello">${isKing() ? JH.king() : JH.wave()}<div class="bubble">${pick(GREETINGS)}</div></div>
    <div class="passport card">
      <div class="row"><span class="lv">Lv.${L.lv} ${isKing() ? '👑 ' : ''}${rankOf(L.lv)}</span><span class="rank">🛂 도장 ${got}/${STAMP_KEYS.length}</span></div>
      <div class="xp"><i style="width:${(L.pct * 100).toFixed(0)}%"></i></div>
      <div class="stamps">${STAMP_KEYS.map((k) => { const c = catInfo(k); return `<div class="stamp-slot ${save.stamps[k] ? 'on' : ''}">${art(c.icon, c.ic)}${save.stamps[k] > 1 ? `<em>${save.stamps[k]}</em>` : ''}</div>`; }).join('')}</div>
      <div class="goal">${isKing() ? '👑 세계일주 퀴즈왕! 도장을 더 모아 보자' : `70점 이상이면 도장 쾅! 모든 도장을 모으면 퀴즈왕 👑 · 다음 레벨까지 ${L.toNext}점`}</div>
    </div>
    <div class="label">🎫 어디로 떠날까?</div>
    <div class="tickets">
      ${ticket('map', true)}
      ${Object.keys(CATS).map((k) => ticket(k)).join('')}
      ${ticket('mix', true)}
    </div>
    <div class="label">🧳 내 가방</div>
    <div class="tickets">
      <button class="ticket card press" data-go="wrong" style="--c:var(--coral)">${art('icon-wrongnote', '📒')}<div><b>오답 노트</b><br><span>틀린 문제 ${save.wrong.length}개</span></div></button>
      <button class="ticket card press" data-go="stats" style="--c:var(--sun)">${art('icon-trophy', '🏆')}<div><b>기록 보기</b><br><span>최고 연속 ${save.bestStreak}개</span></div></button>
    </div>`;
  $app.querySelectorAll('[data-cat]').forEach((b) => (b.onclick = () => (b.dataset.cat === 'map' ? show(mapSetup) : show(() => setup(b.dataset.cat)))));
  $app.querySelector('[data-go=wrong]').onclick = () => (save.wrong.length ? flyTo(() => startQuiz('wrong', 0, Math.min(10, save.wrong.length))) : toast('아직 틀린 문제가 없어요! 👍'));
  $app.querySelector('[data-go=stats]').onclick = () => show(stats);
}

function topBar(title, right = '') {
  return `<div class="top"><button class="back press" data-back aria-label="뒤로">‹</button><h1>${title}</h1>${right}</div>`;
}
function bindBack(fn = () => show(home)) { const b = $app.querySelector('[data-back]'); if (b) b.onclick = fn; }
const quitBack = () => bindBack(() => { if (confirm('여행을 멈추고 처음으로 갈까요?')) show(home); });

// ───────── 화면: 설정 ─────────
function setup(cat) {
  const c = catInfo(cat);
  let diff = 0, count = 10;
  const draw = () => {
    $app.innerHTML = `${topBar('탑승 준비')}
      <div class="setup-hero card">${art(c.icon, c.ic)}<div><b>${c.name}</b><span>${c.desc}</span></div></div>
      <div class="label">난이도</div>
      <div class="opts">${[0, 1, 2, 3].map((d) => `<button class="opt press ${d === diff ? 'on' : ''}" data-d="${d}">${d ? stars(d) + ' ' : ''}${DIFF_NAME[d]}</button>`).join('')}</div>
      <div class="label">문제 수</div>
      <div class="opts">${[10, 20, 30].map((n) => `<button class="opt press ${n === count ? 'on' : ''}" data-n="${n}">${n}문제</button>`).join('')}</div>
      <button class="go press">출발! 🛫</button>`;
    bindBack();
    $app.querySelectorAll('[data-d]').forEach((b) => (b.onclick = () => { diff = +b.dataset.d; draw(); }));
    $app.querySelectorAll('[data-n]').forEach((b) => (b.onclick = () => { count = +b.dataset.n; draw(); }));
    $app.querySelector('.go').onclick = () => flyTo(() => startQuiz(cat, diff, count));
  };
  draw();
}

// ───────── 화면: 퀴즈 ─────────
function startQuiz(cat, diff, count) {
  let qs;
  if (cat === 'wrong') {
    qs = shuffle(save.wrong).slice(0, count);
  } else if (cat === 'mix') {
    const all = Object.keys(CATS).flatMap((k) => drawQuestions(questionsFor(k).map((q) => ({ ...q, cat: k })), count, diff));
    qs = shuffle(all).slice(0, count);
  } else {
    qs = drawQuestions(questionsFor(cat).map((q) => ({ ...q, cat })), count, diff);
  }
  if (!qs.length) { toast('문제가 아직 없어요'); home(); return; }
  showQuestion({ cat, diff, qs, i: 0, results: [], streak: 0, gained: 0 });
}

function showQuestion(st) {
  const q = st.qs[st.i];
  const opts = shuffle([q.a, ...q.w]);
  const c = q.cat && CATS[q.cat];
  $app.innerHTML = `${topBar(`${st.i + 1} / ${st.qs.length}`, `<span class="chip">🔥${st.streak} ⭐${st.gained}</span>`)}
    <div class="progress">${st.qs.map((_, j) => `<i class="${j < st.i ? (st.results[j] ? 'ok' : 'no') : j === st.i ? 'now' : ''}"></i>`).join('')}</div>
    <div class="stage"><span id="who">${JH.think()}</span>
      <div class="qcard card">
        <div class="qmeta"><span>${c ? `${c.ic} ${c.name}` : ''}</span><span class="stars">${stars(q.d)}</span></div>
        ${q.flag ? `<div class="big-flag">${q.flag}</div>` : ''}
        <div class="q">${esc(q.q)}</div>
      </div>
    </div>
    <div class="choices ${q.flags ? 'flags' : ''}">${opts.map((o, i) => `<button class="choice press ${q.flags ? 'flag' : ''}">${q.flags ? '' : `<span class="k">${'ABCD'[i]}</span>`}<span>${esc(o)}</span></button>`).join('')}</div>
    <div id="fb"></div>`;
  quitBack();
  const btns = [...$app.querySelectorAll('.choice')];
  btns.forEach((b, idx) => (b.onclick = () => answer(st, q, opts[idx], btns, opts, b)));
}

function answer(st, q, chosen, btns, opts, el) {
  const ok = chosen === q.a;
  btns.forEach((b, idx) => {
    b.disabled = true;
    if (opts[idx] === q.a) b.classList.add('ok');
    else if (opts[idx] === chosen) b.classList.add('no');
    else b.classList.add('dim');
  });
  document.getElementById('who').innerHTML = ok ? JH.correct() : JH.wrong();
  st.results.push(ok);
  save.answered++;
  save.seen[q.k] = true;
  const pc = (save.perCat[q.cat] = save.perCat[q.cat] || { n: 0, ok: 0 });
  pc.n++;
  let gain = 0;
  if (ok) {
    st.streak++;
    save.correct++;
    gain = q.d * 10 + Math.min(st.streak - 1, 5) * 2;
    st.gained += gain;
    pc.ok++;
    save.bestStreak = Math.max(save.bestStreak, st.streak);
    if (st.cat === 'wrong') save.wrong = save.wrong.filter((w) => w.k !== q.k);
    floaty(`+${gain}`, el);
    if (st.streak >= 3 && st.streak % 3 === 0) { confetti(50); toast(`🔥 ${st.streak}연속 정답!`); }
  } else {
    st.streak = 0;
    if (!save.wrong.some((w) => w.k === q.k)) save.wrong.unshift({ k: q.k, q: q.q, a: q.a, w: q.w, d: q.d, e: q.e, flag: q.flag, flags: q.flags, cat: q.cat });
    save.wrong = save.wrong.slice(0, 300);
  }
  addXp(gain);
  persist();
  const last = st.i === st.qs.length - 1;
  document.getElementById('fb').innerHTML = `
    <div class="feedback card ${ok ? 'ok' : 'no'}">
      <b>${ok ? pick(['정답! 🎉', '맞았어! 👏', '대단해! 🌟', '역시 정후! 😎']) : `아깝다! 정답은 "${esc(q.a)}"`}</b>
      ${q.e ? esc(q.e) : ''}
    </div>
    <button class="go press ${ok ? 'mint' : ''}">${last ? '도착! 결과 보기 🛬' : '다음 문제 ›'}</button>`;
  const next = document.querySelector('#fb .go');
  next.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  next.onclick = () => { if (last) flyTo(() => result(st)); else show(() => { st.i++; showQuestion(st); }); };
}

function result(st) {
  const n = st.results.filter(Boolean).length, t = st.results.length;
  const r = n / t;
  const pass = r >= 0.7 && STAMP_KEYS.includes(st.cat);
  if (pass) giveStamp(st.cat);
  const msg = r === 1 ? '완벽해! 만점이야!' : r >= 0.8 ? '엄청 잘했어!' : r >= 0.7 ? '도장 획득! 잘했어!' : r >= 0.4 ? '조금만 더 하면 도장!' : '다음엔 더 잘할 수 있어!';
  const c = catInfo(st.cat);
  const wrongs = st.qs.filter((_, i) => !st.results[i]);
  $app.innerHTML = `${topBar('여행 도착 🛬')}
    <div class="pp-page card ${ASSETS['bg-passport'] ? 'has-img' : ''}" style="${ASSETS['bg-passport'] ? `--pp-img:url(${ASSETS['bg-passport']})` : ''}">
      ${r >= 0.7 ? (r === 1 ? JH.king() : JH.correct()) : JH.wrong()}
      <h2>${t}문제 중 ${n}개 정답</h2>
      <p>${msg}</p>
      <p>이번 여행 점수 ⭐ ${st.gained}</p>
      ${STAMP_KEYS.includes(st.cat) ? `<div class="stamp ${pass ? '' : 'miss'}">${art(c.icon, c.ic)}${pass ? `${c.name}<br>통과!` : '70점<br>도전!'}</div>` : ''}
    </div>
    <button class="go press" data-again>한 번 더 떠나기! 🔁</button>
    <button class="ghost press" data-home>공항으로 (처음으로)</button>
    ${wrongs.length ? `<div class="label">📒 틀린 문제 (오답 노트에 저장됨)</div>
    <div class="review">${wrongs.map((q) => `<div>${q.flag ? q.flag + ' ' : ''}${esc(q.q)}<br>→ <em>${esc(q.a)}</em></div>`).join('')}</div>` : ''}`;
  if (r >= 0.8) setTimeout(() => confetti(r === 1 ? 160 : 90), 450);
  bindBack();
  $app.querySelector('[data-home]').onclick = () => show(home);
  $app.querySelector('[data-again]').onclick = () => (st.cat === 'wrong' && !save.wrong.length ? show(home) : flyTo(() => startQuiz(st.cat, st.diff, st.qs.length)));
}

// ───────── 화면: 기록 ─────────
function stats() {
  const rows = Object.entries(CATS).map(([k, c]) => {
    const p = save.perCat[k] || { n: 0, ok: 0 };
    return `<div><span>${c.ic} ${c.name} ${save.stamps[k] ? '🛂' + save.stamps[k] : ''}</span><b>${p.n ? Math.round((p.ok / p.n) * 100) + '%' : '-'} <small>(${p.ok}/${p.n})</small></b></div>`;
  }).join('');
  const L = levelOf(save.xp);
  $app.innerHTML = `${topBar('🏆 기록')}
    <div class="stat-list">
      <div><span>레벨</span><b>Lv.${L.lv} ${rankOf(L.lv)}</b></div>
      <div><span>총 점수</span><b>${save.xp.toLocaleString()}</b></div>
      <div><span>푼 문제 / 정답률</span><b>${save.answered}개 / ${save.answered ? Math.round((save.correct / save.answered) * 100) : 0}%</b></div>
      <div><span>최고 연속 정답</span><b>${save.bestStreak}개</b></div>
      <div><span>🗺️ 세계 지도 최고점</span><b>${(save.mapBest.world || 0).toLocaleString()}</b></div>
      <div><span>🗺️ 한국 지도 최고점</span><b>${(save.mapBest.kr || 0).toLocaleString()}</b></div>
    </div>
    <div class="label">주제별 정답률</div>
    <div class="stat-list">${rows}</div>
    <button class="ghost press" data-reset>기록 모두 지우기</button>`;
  bindBack();
  $app.querySelector('[data-reset]').onclick = () => {
    if (confirm('정말 모든 기록을 지울까요? 되돌릴 수 없어요.')) {
      Object.assign(save, { xp: 0, answered: 0, correct: 0, bestStreak: 0, seen: {}, wrong: [], perCat: {}, mapBest: {}, stamps: {} });
      persist(); show(home);
    }
  };
}

// ───────── 지도 게임 ─────────
const REGIONS = {
  world: { name: '세계', ic: '🌍', box: [-170, -58, 190, 140], kx: 1, scale: 1500, rounds: 10 },
  kr: { name: '대한민국', ic: '🇰🇷', box: [124.4, -38.9, 7.6, 5.9], kx: Math.cos((36 * Math.PI) / 180), scale: 40, rounds: 10 },
};
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad, dLon = (lon2 - lon1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
const cityList = (region) => CITIES.filter((c) => c.r === region).map((c) => ({ ...c, k: `city:${region}:${c.n}:${c.co}` }));

function mapSetup() {
  let region = 'world', diff = 0;
  const draw = () => {
    const n = CITIES.filter((c) => c.r === region && (!diff || c.d === diff)).length;
    $app.innerHTML = `${topBar('탑승 준비')}
      <div class="setup-hero card">${JH.explorer()}<div><b>${MAPCAT.name}</b><span>도시 이름이 나오면 지도에서 위치를 톡! 누르고 [확인]. 가까울수록 점수가 높아요 (한 도시 최대 1000점).</span></div></div>
      <div class="label">지도</div>
      <div class="opts">${Object.entries(REGIONS).map(([k, r]) => `<button class="opt press ${k === region ? 'on' : ''}" data-r="${k}">${r.ic} ${r.name}</button>`).join('')}</div>
      <div class="label">난이도</div>
      <div class="opts">${[0, 1, 2, 3].map((d) => `<button class="opt press ${d === diff ? 'on' : ''}" data-d="${d}">${d ? stars(d) + ' ' : ''}${DIFF_NAME[d]}</button>`).join('')}</div>
      <p class="hint">도시 ${n}곳 · 최고 점수 ${(save.mapBest[region] || 0).toLocaleString()} · 7,000점 이상이면 도장!</p>
      <button class="go press" ${n ? '' : 'disabled'}>출발! 🛫</button>`;
    bindBack();
    $app.querySelectorAll('[data-r]').forEach((b) => (b.onclick = () => { region = b.dataset.r; draw(); }));
    $app.querySelectorAll('[data-d]').forEach((b) => (b.onclick = () => { diff = +b.dataset.d; draw(); }));
    $app.querySelector('.go').onclick = () => flyTo(() => mapRound({ region, diff, cities: drawQuestions(cityList(region), REGIONS[region].rounds, diff), i: 0, total: 0, log: [] }));
  };
  draw();
}

function mapRound(st) {
  const R = REGIONS[st.region];
  const city = st.cities[st.i];
  const land = window.MAP_DATA || { world: [], korea: [] };
  const paths = land.world.map((d) => `<path class="land" d="${d}"/>`).join('')
    + (st.region === 'kr' ? land.korea.map((d) => `<path class="land kr" d="${d}"/>`).join('') : '');
  const label = st.region === 'kr' ? esc(city.n) : `${esc(city.n)} <small>(${esc(city.co)})</small>`;
  $app.innerHTML = `${topBar(`${st.i + 1} / ${st.cities.length}`, `<span class="chip">⭐ ${st.total.toLocaleString()}</span>`)}
    <div class="stage"><span id="who">${JH.explorer()}</span>
      <div class="qcard card">
        <div class="qmeta"><span>${R.ic} ${R.name} 지도</span><span class="stars">${stars(city.d)}</span></div>
        <div class="maptarget">📍 ${label}</div>
      </div>
    </div>
    <div class="mapwrap">
      <svg preserveAspectRatio="xMidYMid meet"><g id="world" transform="scale(${R.kx},1)">${paths}<g id="marks"></g></g></svg>
      <div class="zoom"><button data-z="in" aria-label="확대">+</button><button data-z="out" aria-label="축소">−</button></div>
    </div>
    <div id="mapfb"></div>
    <button class="go press" id="confirm" disabled>지도에서 위치를 눌러 줘</button>`;
  quitBack();

  const svg = $app.querySelector('svg'), g = svg.querySelector('#world'), marks = svg.querySelector('#marks');
  // 보이는 영역(viewBox)은 변환 후 좌표 기준
  let vb = [R.box[0] * R.kx, R.box[1], R.box[2] * R.kx, R.box[3]];
  const home0 = vb.slice();
  const setVB = () => svg.setAttribute('viewBox', vb.join(' '));
  setVB();
  const toMap = (cx, cy) => { const p = svg.createSVGPoint(); p.x = cx; p.y = cy; const m = p.matrixTransform(g.getScreenCTM().inverse()); return { lon: m.x, lat: -m.y }; };
  const pxPerUnit = () => svg.getScreenCTM().a; // viewBox 1단위당 화면 px
  const toVB = (cx, cy) => { const p = svg.createSVGPoint(); p.x = cx; p.y = cy; return p.matrixTransform(svg.getScreenCTM().inverse()); };

  let guess = null, done = false;
  const pinR = () => 8 / pxPerUnit(); // 확대해도 화면에서 항상 비슷한 크기
  // g 가 가로로 kx 배 줄어 있으니 rx 를 늘려서 동그랗게 보이게 한다
  function pin(cls, lon, lat) { return `<ellipse class="${cls}" cx="${lon}" cy="${-lat}" rx="${pinR() / R.kx}" ry="${pinR()}"/>`; }
  function redraw() {
    if (!done) { marks.innerHTML = guess ? pin('pin-guess', guess.lon, guess.lat) : ''; return; }
    marks.innerHTML = `<line class="pin-line" x1="${guess.lon}" y1="${-guess.lat}" x2="${city.lon}" y2="${-city.lat}"/>`
      + pin('pin-guess', guess.lon, guess.lat) + pin('pin-real', city.lon, city.lat);
  }

  // 확대/이동 (포인터 1개 = 드래그 이동, 2개 = 핀치 확대, 짧게 탭 = 위치 선택)
  const pointers = new Map();
  let startDist = 0, startVB = null, moved = false, downAt = null;
  function zoomAt(factor, cx, cy) {
    const newW = Math.min(home0[2] * 1.5, Math.max(home0[2] / 40, vb[2] / factor));
    const f = vb[2] / newW;
    const m = toVB(cx, cy); // 손가락 아래 지점을 고정한 채 확대
    vb = [m.x - (m.x - vb[0]) / f, m.y - (m.y - vb[1]) / f, newW, vb[3] / f];
    setVB(); redraw();
  }
  const wrap = $app.querySelector('.mapwrap');
  wrap.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.zoom')) return;
    wrap.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) { moved = false; downAt = { x: e.clientX, y: e.clientY, vb: vb.slice(), ppu: pxPerUnit() }; }
    if (pointers.size === 2) { const [a, b] = [...pointers.values()]; startDist = Math.hypot(a.x - b.x, a.y - b.y); startVB = vb.slice(); moved = true; }
  });
  wrap.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2 && startVB) {
      const [a, b] = [...pointers.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      vb = startVB.slice();
      zoomAt(dist / startDist, (a.x + b.x) / 2, (a.y + b.y) / 2);
    } else if (pointers.size === 1 && downAt) {
      const dx = e.clientX - downAt.x, dy = e.clientY - downAt.y;
      if (Math.hypot(dx, dy) > 8) moved = true;
      if (moved) { const u = 1 / downAt.ppu; vb = [downAt.vb[0] - dx * u, downAt.vb[1] - dy * u, vb[2], vb[3]]; setVB(); }
    }
  });
  const up = (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    if (pointers.size < 2) startVB = null;
    if (pointers.size === 0 && !moved && !done) {
      guess = toMap(e.clientX, e.clientY);
      redraw();
      const c = document.getElementById('confirm'); c.disabled = false; c.textContent = '여기야! 확인 📍';
    }
    if (pointers.size === 0) downAt = null;
  };
  wrap.addEventListener('pointerup', up);
  wrap.addEventListener('pointercancel', up);
  wrap.addEventListener('wheel', (e) => { e.preventDefault(); zoomAt(e.deltaY < 0 ? 1.25 : 0.8, e.clientX, e.clientY); }, { passive: false });
  $app.querySelectorAll('[data-z]').forEach((b) => (b.onclick = () => {
    const r = svg.getBoundingClientRect(); zoomAt(b.dataset.z === 'in' ? 1.6 : 1 / 1.6, r.left + r.width / 2, r.top + r.height / 2);
  }));

  document.getElementById('confirm').onclick = function () {
    if (done) {
      if (st.i === st.cities.length - 1) flyTo(() => mapResult(st)); else show(() => { st.i++; mapRound(st); });
      return;
    }
    done = true;
    const km = haversine(guess.lat, guess.lon, city.lat, city.lon);
    const pts = Math.round(1000 * Math.exp(-km / R.scale));
    st.total += pts;
    st.log.push({ city, km, pts });
    save.seen[city.k] = true;
    addXp(Math.round(pts / 50));
    persist();
    // 두 점이 다 보이게 화면 이동
    const xs = [guess.lon, city.lon].map((x) => x * R.kx), ys = [-guess.lat, -city.lat];
    const pad = Math.max(home0[2] / 20, (Math.max(...xs) - Math.min(...xs)) * 0.4, (Math.max(...ys) - Math.min(...ys)) * 0.4);
    const w = Math.min(home0[2], Math.max(...xs) - Math.min(...xs) + pad * 2);
    const h = Math.min(home0[3], Math.max(...ys) - Math.min(...ys) + pad * 2);
    const s = Math.max(w / home0[2], h / home0[3]);
    const cx = (Math.max(...xs) + Math.min(...xs)) / 2, cy = (Math.max(...ys) + Math.min(...ys)) / 2;
    vb = [cx - (home0[2] * s) / 2, cy - (home0[3] * s) / 2, home0[2] * s, home0[3] * s];
    setVB(); redraw();
    document.getElementById('who').innerHTML = pts >= 300 ? JH.correct() : JH.wrong();
    if (pts >= 900) confetti(60);
    const dist = km < 1 ? '1km 이내' : `${Math.round(km).toLocaleString()}km`;
    const cheer = pts >= 900 ? '거의 정확해! 🎯' : pts >= 600 ? '아주 가까워! 👏' : pts >= 300 ? '괜찮아! 🙂' : '조금 멀었어 😅';
    document.getElementById('mapfb').innerHTML = `<div class="feedback card ${pts >= 300 ? 'ok' : 'no'}"><b>${cheer} +${pts}점</b>실제 위치(빨간 점)와 ${dist} 떨어졌어요.</div>`;
    this.textContent = st.i === st.cities.length - 1 ? '도착! 결과 보기 🛬' : '다음 도시 ›';
  };
}

function mapResult(st) {
  const R = REGIONS[st.region];
  const max = st.cities.length * 1000;
  const best = save.mapBest[st.region] || 0;
  const isBest = st.total > best;
  if (isBest) { save.mapBest[st.region] = st.total; persist(); }
  const r = st.total / max;
  const pass = r >= 0.7;
  if (pass) giveStamp('map');
  $app.innerHTML = `${topBar('여행 도착 🛬')}
    <div class="pp-page card ${ASSETS['bg-passport'] ? 'has-img' : ''}" style="${ASSETS['bg-passport'] ? `--pp-img:url(${ASSETS['bg-passport']})` : ''}">
      ${pass ? JH.king() : JH.explorer()}
      <h2>${st.total.toLocaleString()}점</h2>
      <p>${R.ic} ${R.name} 지도 · 만점 ${max.toLocaleString()}점</p>
      <p>${isBest ? '🎉 새 최고 기록!' : `최고 기록 ${best.toLocaleString()}점`}</p>
      <div class="stamp ${pass ? '' : 'miss'}">${art(MAPCAT.icon, MAPCAT.ic)}${pass ? '지도<br>통과!' : '7,000점<br>도전!'}</div>
    </div>
    <button class="go press" data-again>한 번 더 떠나기! 🔁</button>
    <button class="ghost press" data-home>공항으로 (처음으로)</button>
    <div class="label">도시별 결과</div>
    <div class="review">${st.log.map((l) => `<div>${esc(l.city.n)} <small class="hint">${esc(l.city.co)}</small><br><em>${l.pts}점</em> · ${Math.round(l.km).toLocaleString()}km 차이</div>`).join('')}</div>`;
  if (isBest || pass) setTimeout(() => confetti(), 450);
  bindBack();
  $app.querySelector('[data-home]').onclick = () => show(home);
  $app.querySelector('[data-again]').onclick = () => flyTo(() => mapRound({ region: st.region, diff: st.diff, cities: drawQuestions(cityList(st.region), R.rounds, st.diff), i: 0, total: 0, log: [] }));
}

show(home);
