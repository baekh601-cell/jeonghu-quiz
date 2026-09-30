'use strict';

// ───────── 저장 (기기별 진행 상황) ─────────
const STORE_KEY = 'jeonghu-quiz-v1';
const save = {
  xp: 0, answered: 0, correct: 0, bestStreak: 0,
  seen: {},        // 문제 키 → true (최근에 본 문제는 덜 나오게)
  wrong: [],       // 오답 노트
  perCat: {},      // 카테고리별 { n, ok }
  mapBest: {},     // 지역별 최고 점수
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
const TITLES = ['견습 승무원', '승무원', '부기장', '기장', '베테랑 기장', '지리 박사', '역사 박사', '퀴즈 마스터', '세계 탐험가', '살아있는 백과사전'];
const titleOf = (lv) => TITLES[Math.min(TITLES.length - 1, Math.floor((lv - 1) / 3))];
function toast(msg) {
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t); setTimeout(() => t.remove(), 1600);
}

// ───────── 카테고리 ─────────
const CATS = {
  capital: { name: '나라와 수도', ic: '🏛️', desc: '수도·대륙 맞히기' },
  flag: { name: '국기', ic: '🚩', desc: '어느 나라 국기일까?' },
  history: { name: '역사', ic: '📜', desc: '한국사·세계사' },
  science: { name: '과학 상식', ic: '🔬', desc: '우주·인체·자연' },
  kbo: { name: '프로야구', ic: '⚾', desc: 'KBO 선수·구단' },
  nonsense: { name: '넌센스', ic: '🤪', desc: '머리를 말랑말랑하게' },
};
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
    // 반대로: 나라 이름 보고 국기 고르기 (보기에 비슷한 대륙 국기)
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
function home() {
  const L = levelOf(save.xp);
  const acc = save.answered ? Math.round((save.correct / save.answered) * 100) : 0;
  $app.innerHTML = `
    <div class="hero">
      <div class="row"><h1>✈️ 정후의 비행 퀴즈</h1><span class="lv">Lv.${L.lv}</span></div>
      <div class="bar"><i style="width:${(L.pct * 100).toFixed(0)}%"></i></div>
      <small>${titleOf(L.lv)} · 다음 레벨까지 ${L.toNext}점 · 푼 문제 ${save.answered}개 · 정답률 ${acc}%</small>
    </div>
    <div class="grid">
      <button class="cat wide" data-go="map"><span class="ic">🗺️</span><div><b>지도에서 도시 찾기</b><br><span>도시 위치를 콕! 가까울수록 높은 점수</span></div></button>
      ${Object.entries(CATS).map(([k, c]) => `
        <button class="cat" data-cat="${k}"><span class="ic">${c.ic}</span><b>${c.name}</b><span>${c.desc} · ${countFor(k)}문제</span></button>`).join('')}
      <button class="cat wide" data-cat="mix"><span class="ic">🎲</span><div><b>전부 섞기</b><br><span>모든 주제에서 골고루</span></div></button>
    </div>
    <div class="section-title">나의 기록</div>
    <div class="grid">
      <button class="cat" data-go="wrong"><span class="ic">📒</span><b>오답 노트</b><span>틀린 문제 ${save.wrong.length}개 다시 풀기</span></button>
      <button class="cat" data-go="stats"><span class="ic">🏆</span><b>기록 보기</b><span>최고 연속 정답 ${save.bestStreak}개</span></button>
    </div>`;
  $app.querySelectorAll('[data-cat]').forEach((b) => (b.onclick = () => setup(b.dataset.cat)));
  $app.querySelector('[data-go=map]').onclick = mapSetup;
  $app.querySelector('[data-go=wrong]').onclick = () => (save.wrong.length ? startQuiz('wrong', 0, Math.min(10, save.wrong.length)) : toast('아직 틀린 문제가 없어요! 👍'));
  $app.querySelector('[data-go=stats]').onclick = stats;
  window.scrollTo(0, 0);
}

function topBar(title, right = '') {
  return `<div class="top"><button class="back" data-back>‹</button><h1>${title}</h1>${right}</div>`;
}
function bindBack(fn = home) { const b = $app.querySelector('[data-back]'); if (b) b.onclick = fn; }

// ───────── 화면: 설정 ─────────
function setup(cat) {
  const c = cat === 'mix' ? { name: '전부 섞기', ic: '🎲' } : CATS[cat];
  let diff = 0, count = 10;
  const draw = () => {
    $app.innerHTML = `${topBar(`${c.ic} ${c.name}`)}
      <div class="section-title">난이도</div>
      <div class="opts">${[0, 1, 2, 3].map((d) => `<button class="opt ${d === diff ? 'on' : ''}" data-d="${d}">${d ? stars(d) + ' ' : ''}${DIFF_NAME[d]}</button>`).join('')}</div>
      <div class="section-title">문제 수</div>
      <div class="opts">${[10, 20, 30].map((n) => `<button class="opt ${n === count ? 'on' : ''}" data-n="${n}">${n}문제</button>`).join('')}</div>
      <button class="go">시작! 🛫</button>`;
    bindBack();
    $app.querySelectorAll('[data-d]').forEach((b) => (b.onclick = () => { diff = +b.dataset.d; draw(); }));
    $app.querySelectorAll('[data-n]').forEach((b) => (b.onclick = () => { count = +b.dataset.n; draw(); }));
    $app.querySelector('.go').onclick = () => startQuiz(cat, diff, count);
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
  if (!qs.length) { toast('문제가 아직 없어요'); return; }
  const state = { cat, diff, qs, i: 0, results: [], streak: 0, gained: 0 };
  showQuestion(state);
}

function showQuestion(st) {
  const q = st.qs[st.i];
  const opts = shuffle([q.a, ...q.w]);
  const catName = q.cat && CATS[q.cat] ? `${CATS[q.cat].ic} ${CATS[q.cat].name}` : '';
  $app.innerHTML = `${topBar(`${st.i + 1} / ${st.qs.length}`, `<span class="pill">🔥 ${st.streak} · ⭐ ${st.gained}</span>`)}
    <div class="progress">${st.qs.map((_, j) => `<i class="${j < st.i ? (st.results[j] ? 'ok' : 'no') : j === st.i ? 'now' : ''}"></i>`).join('')}</div>
    <div class="qcard">
      <div class="qmeta"><span>${catName}</span><span class="stars">${stars(q.d)}</span></div>
      ${q.flag ? `<div class="big-flag">${q.flag}</div>` : ''}
      <div class="q">${esc(q.q)}</div>
    </div>
    <div class="choices ${q.flags ? 'flags' : ''}">${opts.map((o) => `<button class="choice ${q.flags ? 'flag' : ''}">${esc(o)}</button>`).join('')}</div>
    <div id="fb"></div>`;
  bindBack(() => { if (confirm('그만하고 처음으로 갈까요?')) home(); });
  const btns = [...$app.querySelectorAll('.choice')];
  btns.forEach((b, idx) => (b.onclick = () => answer(st, q, opts[idx], btns, opts)));
}

function answer(st, q, chosen, btns, opts) {
  const ok = chosen === q.a;
  btns.forEach((b, idx) => {
    b.disabled = true;
    if (opts[idx] === q.a) b.classList.add('ok');
    else if (opts[idx] === chosen) b.classList.add('no');
  });
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
  } else {
    st.streak = 0;
    if (!save.wrong.some((w) => w.k === q.k)) save.wrong.unshift({ k: q.k, q: q.q, a: q.a, w: q.w, d: q.d, e: q.e, flag: q.flag, flags: q.flags, cat: q.cat });
    save.wrong = save.wrong.slice(0, 300);
  }
  const before = levelOf(save.xp).lv;
  save.xp += gain;
  persist();
  if (levelOf(save.xp).lv > before) toast(`🎉 레벨 업! Lv.${levelOf(save.xp).lv}`);
  const last = st.i === st.qs.length - 1;
  document.getElementById('fb').innerHTML = `
    <div class="feedback ${ok ? 'ok' : 'no'}">
      <b>${ok ? pick(['정답! 🎉', '맞았어요! 👏', '대단해요! 🌟', '역시! 😎']) + ` +${gain}` : `아쉬워요 😢 정답은 "${esc(q.a)}"`}</b>
      ${q.e ? esc(q.e) : ''}
    </div>
    <button class="go">${last ? '결과 보기' : '다음 문제 ›'}</button>`;
  const next = document.querySelector('#fb .go');
  next.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  next.onclick = () => { if (last) result(st); else { st.i++; showQuestion(st); } };
}

function result(st) {
  const n = st.results.filter(Boolean).length, t = st.results.length;
  const r = n / t;
  const [emoji, msg] = r === 1 ? ['🏆', '완벽해요! 만점!'] : r >= 0.8 ? ['🥇', '엄청 잘했어요!'] : r >= 0.6 ? ['🥈', '잘했어요!'] : r >= 0.4 ? ['🥉', '좋아요, 조금만 더!'] : ['💪', '다음엔 더 잘할 수 있어요!'];
  const wrongs = st.qs.filter((_, i) => !st.results[i]);
  $app.innerHTML = `${topBar('결과')}
    <div class="result">
      <div class="emoji">${emoji}</div>
      <h2>${t}문제 중 ${n}개 정답</h2>
      <p>${msg}</p>
      <p>이번 판 점수 ⭐ ${st.gained}</p>
    </div>
    <button class="go" data-again>한 판 더! 🔁</button>
    <button class="ghost" data-home>처음으로</button>
    ${wrongs.length ? `<div class="section-title">틀린 문제 (오답 노트에 저장됨)</div>
    <div class="review">${wrongs.map((q) => `<div>${q.flag ? q.flag + ' ' : ''}${esc(q.q)}<br>→ <em>${esc(q.a)}</em></div>`).join('')}</div>` : ''}`;
  bindBack();
  $app.querySelector('[data-home]').onclick = home;
  $app.querySelector('[data-again]').onclick = () => (st.cat === 'wrong' && !save.wrong.length ? home() : startQuiz(st.cat, st.diff, st.qs.length));
  window.scrollTo(0, 0);
}

// ───────── 화면: 기록 ─────────
function stats() {
  const rows = Object.entries(CATS).map(([k, c]) => {
    const p = save.perCat[k] || { n: 0, ok: 0 };
    return `<div><span>${c.ic} ${c.name}</span><b>${p.n ? Math.round((p.ok / p.n) * 100) + '%' : '-'} <small>(${p.ok}/${p.n})</small></b></div>`;
  }).join('');
  const L = levelOf(save.xp);
  $app.innerHTML = `${topBar('🏆 기록')}
    <div class="stat-list">
      <div><span>레벨</span><b>Lv.${L.lv} ${titleOf(L.lv)}</b></div>
      <div><span>총 점수</span><b>${save.xp}</b></div>
      <div><span>최고 연속 정답</span><b>${save.bestStreak}개</b></div>
      <div><span>🗺️ 세계 지도 최고점</span><b>${save.mapBest.world || 0}</b></div>
      <div><span>🗺️ 한국 지도 최고점</span><b>${save.mapBest.kr || 0}</b></div>
    </div>
    <div class="section-title">주제별 정답률</div>
    <div class="stat-list">${rows}</div>
    <button class="ghost" data-reset>기록 모두 지우기</button>`;
  bindBack();
  $app.querySelector('[data-reset]').onclick = () => {
    if (confirm('정말 모든 기록을 지울까요? 되돌릴 수 없어요.')) {
      Object.assign(save, { xp: 0, answered: 0, correct: 0, bestStreak: 0, seen: {}, wrong: [], perCat: {}, mapBest: {} });
      persist(); home();
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

function mapSetup() {
  let region = 'world', diff = 0;
  const draw = () => {
    const n = CITIES.filter((c) => c.r === region && (!diff || c.d === diff)).length;
    $app.innerHTML = `${topBar('🗺️ 지도에서 도시 찾기')}
      <p class="hint">도시 이름이 나오면 지도에서 그 위치를 톡 누르고 [확인]! 실제 위치와 가까울수록 점수가 높아요 (한 문제 최대 1000점).</p>
      <div class="section-title">지도</div>
      <div class="opts">${Object.entries(REGIONS).map(([k, r]) => `<button class="opt ${k === region ? 'on' : ''}" data-r="${k}">${r.ic} ${r.name}</button>`).join('')}</div>
      <div class="section-title">난이도</div>
      <div class="opts">${[0, 1, 2, 3].map((d) => `<button class="opt ${d === diff ? 'on' : ''}" data-d="${d}">${d ? stars(d) + ' ' : ''}${DIFF_NAME[d]}</button>`).join('')}</div>
      <p class="hint">도시 ${n}곳 · 최고 점수 ${save.mapBest[region] || 0}</p>
      <button class="go" ${n ? '' : 'disabled'}>시작! 🛫</button>`;
    bindBack();
    $app.querySelectorAll('[data-r]').forEach((b) => (b.onclick = () => { region = b.dataset.r; draw(); }));
    $app.querySelectorAll('[data-d]').forEach((b) => (b.onclick = () => { diff = +b.dataset.d; draw(); }));
    $app.querySelector('.go').onclick = () => {
      const list = CITIES.filter((c) => c.r === region).map((c) => ({ ...c, k: `city:${region}:${c.n}:${c.co}` }));
      const cities = drawQuestions(list, REGIONS[region].rounds, diff);
      mapRound({ region, diff, cities, i: 0, total: 0, log: [] });
    };
  };
  draw();
}

function mapRound(st) {
  const R = REGIONS[st.region];
  const city = st.cities[st.i];
  const land = window.MAP_DATA || { world: [], korea: [] };
  const paths = land.world.map((d) => `<path class="land" d="${d}"/>`).join('')
    + (st.region === 'kr' ? land.korea.map((d) => `<path class="land kr" d="${d}"/>`).join('') : '');
  const label = st.region === 'kr' ? city.n : `${city.n} <small class="hint">(${city.co})</small>`;
  $app.innerHTML = `${topBar(`${st.i + 1} / ${st.cities.length}`, `<span class="pill">⭐ ${st.total}</span>`)}
    <div class="qcard" style="padding:14px 18px;margin-bottom:10px">
      <div class="qmeta"><span>${R.ic} ${R.name} 지도</span><span class="stars">${stars(city.d)}</span></div>
      <div class="maptarget">📍 ${label}</div>
    </div>
    <div class="mapwrap">
      <svg preserveAspectRatio="xMidYMid meet"><g id="world" transform="scale(${R.kx},1)">${paths}<g id="marks"></g></g></svg>
      <div class="zoom"><button data-z="in">+</button><button data-z="out">−</button></div>
    </div>
    <div id="mapfb"></div>
    <div class="maprow"><button class="go" id="confirm" disabled>위치를 눌러 주세요</button></div>`;
  bindBack(() => { if (confirm('그만하고 처음으로 갈까요?')) home(); });

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
  const pinR = () => 7 / pxPerUnit(); // 확대해도 화면에서 항상 비슷한 크기
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
      const c = document.getElementById('confirm'); c.disabled = false; c.textContent = '확인! 📍';
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
      if (st.i === st.cities.length - 1) mapResult(st); else { st.i++; mapRound(st); }
      return;
    }
    done = true;
    const km = haversine(guess.lat, guess.lon, city.lat, city.lon);
    const pts = Math.round(1000 * Math.exp(-km / R.scale));
    st.total += pts;
    st.log.push({ city, km, pts });
    save.seen[city.k] = true;
    const gain = Math.round(pts / 50);
    save.xp += gain;
    persist();
    redraw();
    // 두 점이 다 보이게 화면 이동
    const xs = [guess.lon, city.lon].map((x) => x * R.kx), ys = [-guess.lat, -city.lat];
    const pad = Math.max(home0[2] / 20, (Math.max(...xs) - Math.min(...xs)) * 0.4, (Math.max(...ys) - Math.min(...ys)) * 0.4);
    const w = Math.min(home0[2], Math.max(...xs) - Math.min(...xs) + pad * 2);
    const h = Math.min(home0[3], Math.max(...ys) - Math.min(...ys) + pad * 2);
    const s = Math.max(w / home0[2], h / home0[3]);
    const cx = (Math.max(...xs) + Math.min(...xs)) / 2, cy = (Math.max(...ys) + Math.min(...ys)) / 2;
    vb = [cx - (home0[2] * s) / 2, cy - (home0[3] * s) / 2, home0[2] * s, home0[3] * s];
    setVB(); redraw();
    const dist = km < 1 ? '1km 이내' : `${Math.round(km).toLocaleString()}km`;
    const cheer = pts >= 900 ? '거의 정확해요! 🎯' : pts >= 600 ? '아주 가까워요! 👏' : pts >= 300 ? '괜찮아요! 🙂' : '조금 멀었어요 😅';
    document.getElementById('mapfb').innerHTML = `<div class="feedback ${pts >= 300 ? 'ok' : 'no'}"><b>${cheer} +${pts}점</b>실제 위치(빨간 점)와 ${dist} 떨어졌어요.</div>`;
    this.textContent = st.i === st.cities.length - 1 ? '결과 보기' : '다음 도시 ›';
  };
}

function mapResult(st) {
  const R = REGIONS[st.region];
  const max = st.cities.length * 1000;
  const best = save.mapBest[st.region] || 0;
  const isBest = st.total > best;
  if (isBest) { save.mapBest[st.region] = st.total; persist(); }
  const r = st.total / max;
  const emoji = r >= 0.85 ? '🏆' : r >= 0.65 ? '🥇' : r >= 0.45 ? '🥈' : '🧭';
  $app.innerHTML = `${topBar('결과')}
    <div class="result">
      <div class="emoji">${emoji}</div>
      <h2>${st.total.toLocaleString()}점</h2>
      <p>${R.ic} ${R.name} 지도 · 만점 ${max.toLocaleString()}점</p>
      <p>${isBest ? '🎉 새 최고 기록!' : `최고 기록 ${best.toLocaleString()}점`}</p>
    </div>
    <button class="go" data-again>한 판 더! 🔁</button>
    <button class="ghost" data-home>처음으로</button>
    <div class="section-title">도시별 결과</div>
    <div class="review">${st.log.map((l) => `<div>${esc(l.city.n)} <small class="hint">${esc(l.city.co)}</small><br><em>${l.pts}점</em> · ${Math.round(l.km).toLocaleString()}km 차이</div>`).join('')}</div>`;
  bindBack();
  $app.querySelector('[data-home]').onclick = home;
  $app.querySelector('[data-again]').onclick = () => {
    const list = CITIES.filter((c) => c.r === st.region).map((c) => ({ ...c, k: `city:${st.region}:${c.n}:${c.co}` }));
    mapRound({ region: st.region, diff: st.diff, cities: drawQuestions(list, R.rounds, st.diff), i: 0, total: 0, log: [] });
  };
  window.scrollTo(0, 0);
}

home();
