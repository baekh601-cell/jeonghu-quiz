'use strict';
// 2인 대전 — 캐릭터 고르기, 같은 문제 대결(연결 없이: 같은 방 번호 → 같은 문제 → 점수 비교)
// 실시간 온라인 대전은 versus-online 브랜치의 js/versus-online.js 가 window.VERSUS_ONLINE 으로 끼워 넣는다.

// ───────── 같은 번호면 같은 결과가 나오는 난수 ─────────
function seedOf(text) { let h = 2166136261; for (const ch of String(text)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function rngOf(seed) { // mulberry32
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const pickR = (rng, arr) => arr[Math.floor(rng() * arr.length)];
function sampleR(rng, arr, n) { // 겹치지 않게 n개
  const pool = arr.slice(), out = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  return out;
}

// 대전용 문제 묶음. 같은 seed 면 두 폰에서 똑같은 문제가 똑같은 순서로 나온다 (앱 버전이 같아야 함).
// 구성: 문제은행 7 + 세계 지리 2 + 지도 찾기 1 (n=10 기준), 난이도는 보통·어려움
function duelQuestions(seed, n = 10) {
  const rng = rngOf(seed);
  const bank = ['history', 'science', 'kbo', 'nonsense', 'minecraft', 'samguk'].flatMap((cat) => (QB.banks[cat] || []).filter((q) => q.d >= 2).map((q, i) => ({ ...q, cat, k: `duel:${cat}:${i}` })));
  const withCap = COUNTRIES.filter((c) => c.c && c.d >= 2 && !c.c.startsWith(c.n.replace(/ .*/, '')));
  const geo = sampleR(rng, withCap, Math.max(1, Math.round(n * 0.2))).map((c) => {
    const near = withCap.filter((x) => x !== c && x.cont === c.cont);
    return { k: 'duel:cap:' + c.iso, cat: 'capital', q: `${c.n}의 수도는?`, a: c.c, w: sampleR(rng, near, 3).map((x) => x.c), d: c.d, e: `${c.f ? c.f + ' ' : ''}${c.n}의 수도는 ${c.c}예요.` };
  });
  const maps = sampleR(rng, cityList().filter((c) => c.d <= 2), Math.max(1, Math.round(n * 0.1))).map(mapQuestion);
  const rest = sampleR(rng, bank, n - geo.length - maps.length);
  const all = [...rest, ...geo];
  // 섞기 (지도 문제는 첫 문제로 오지 않게 뒤쪽에 끼워 넣기)
  for (let i = all.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [all[i], all[j]] = [all[j], all[i]]; }
  maps.forEach((m) => all.splice(2 + Math.floor(rng() * (all.length - 1)), 0, m));
  return all;
}
// 대전 점수: 정답 100점 + 빨리 맞힐수록 최대 +60점
const DUEL_TIME = 15;
const duelPoints = (ok, spent) => (ok ? 100 + Math.round(Math.max(0, DUEL_TIME - (spent ?? DUEL_TIME)) * 4) : 0);

// ───────── 캐릭터 고르기 ─────────
function charPicker(onChange) {
  return `<div class="char-pick">${Object.entries(CHARS).map(([id, c]) => `
    <button class="char-card card press ${id === myChar() ? 'on' : ''}" data-char="${id}" style="--c:${c.color}">
      ${charArt(id, 'wave')}<b>${c.name}</b></button>`).join('')}</div>`;
}
function bindCharPicker(redraw) {
  $app.querySelectorAll('[data-char]').forEach((b) => (b.onclick = () => { save.char = b.dataset.char; persist(); sfx('power'); redraw(); }));
}

// ───────── 2인 대전 메뉴 ─────────
function versusMenu() {
  $app.classList.remove('on-map');
  document.getElementById('ui').innerHTML = '';
  const d = save.duel || (save.duel = { win: 0, lose: 0, draw: 0 });
  const draw = () => {
    $app.innerHTML = `${topBar('⚔️ 2인 대전')}
      <div class="label">내 캐릭터</div>
      ${charPicker()}
      <div class="label">대전 방식</div>
      <div class="tickets">
        ${window.VERSUS_ONLINE ? `<button class="ticket card press wide" data-mode="online" style="--c:#ff6b6b"><span class="art ph">📡</span><div><b>실시간 대전</b><br><span>인터넷으로 연결해서 서로 공격! 아이템·이모티콘</span></div></button>` : ''}
        <button class="ticket card press wide" data-mode="same" style="--c:#ffd43b"><span class="art ph">🤝</span><div><b>같은 문제 대결</b><br><span>인터넷 없이! 같은 방 번호를 넣으면 같은 문제가 나와요</span></div></button>
        <button class="ticket card press wide" data-mode="rush" style="--c:#4fb3ff"><span class="art ph">⚡</span><div><b>순발력 대결 · 숫자 빨리 누르기</b><br><span>한 기기에서 마주 보고! 1부터 순서대로 먼저 누르면 승리</span></div></button>
      </div>
      <p class="hint" style="text-align:center">전적 ${d.win}승 ${d.lose}패 ${d.draw}무</p>`;
    bindBack(() => show(title));
    bindCharPicker(draw);
    $app.querySelector('[data-mode=same]').onclick = () => { sfx('tap'); show(sameSetup); };
    $app.querySelector('[data-mode=rush]').onclick = () => { sfx('tap'); show(() => rushSetup(versusMenu)); };
    const on = $app.querySelector('[data-mode=online]');
    if (on) on.onclick = () => { sfx('tap'); window.VERSUS_ONLINE(); };
  };
  draw();
}

// ───────── 같은 문제 대결 (연결 없음) ─────────
function sameSetup() {
  let code = '';
  const draw = () => {
    $app.innerHTML = `${topBar('🤝 같은 문제 대결')}
      <div class="setup-hero card">${JH.wave()}<div><b>방 번호 정하기</b><span>둘이 같은 번호 4자리를 넣고, "하나 둘 셋!" 하고 동시에 시작해요. 똑같은 10문제가 나와요.</span></div></div>
      <div class="code-box">${[0, 1, 2, 3].map((i) => `<i class="${code[i] ? 'on' : ''}">${code[i] || ''}</i>`).join('')}</div>
      <div class="keypad">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 'del', 0, 'rand'].map((k) => `<button class="press" data-k="${k}">${k === 'del' ? '⌫' : k === 'rand' ? '🎲' : k}</button>`).join('')}</div>
      <button class="go press" ${code.length === 4 ? '' : 'disabled'}>시작! ⚔️</button>
      <p class="hint" style="text-align:center">문제마다 ${DUEL_TIME}초 · 빨리 맞힐수록 높은 점수 · 두 폰의 앱 버전이 같아야 같은 문제가 나와요</p>`;
    bindBack(() => show(versusMenu));
    $app.querySelectorAll('[data-k]').forEach((b) => (b.onclick = () => {
      const k = b.dataset.k; sfx('tap');
      if (k === 'del') code = code.slice(0, -1);
      else if (k === 'rand') code = String(1000 + rnd(9000));
      else if (code.length < 4) code += k;
      draw();
    }));
    $app.querySelector('.go').onclick = () => flyTo(() => sameDuel(code));
  };
  draw();
}

function sameDuel(code) {
  keepAwake(true);
  runQuiz({
    title: `🤝 방 ${code}`, qs: duelQuestions(seedOf('same:' + code)), hearts: null, timer: DUEL_TIME, items: false,
    onQuit: () => { keepAwake(false); show(versusMenu); },
    onEnd: (r) => {
      keepAwake(false);
      const score = r.results.reduce((s, ok, i) => s + duelPoints(ok, r.times[i]), 0) + r.maxStreak * 10;
      sameResult(code, score, r);
    },
  });
}

function sameResult(code, score, r) {
  let outcome = null; // 'win' | 'lose' | 'draw' — 상대 점수를 넣으면 정해진다
  const draw = () => {
    const who = outcome === 'win' ? JH.king() : outcome === 'lose' ? JH.wrong() : JH.correct();
    const head = outcome === 'win' ? `${charName()} 승리!` : outcome === 'lose' ? '아깝다, 졌어!' : outcome === 'draw' ? '무승부!' : '내 점수';
    $app.innerHTML = `<div class="result-screen">
        <div class="intro-tag">🤝 방 ${code} · ${charName()}</div>
        <h1 class="result-title ${outcome === 'lose' ? 'fail' : ''}">${head}</h1>
        ${who}
        <div class="duel-score">${score.toLocaleString()}<small>점</small></div>
        <p>정답 ${r.correct}/${r.total} · 최고 ${r.maxStreak}연속</p>
        ${outcome ? '' : `<div class="label">상대 점수를 넣으면 승패를 알려 줘요</div>
        <div class="opp-row"><input id="opp" inputmode="numeric" pattern="[0-9]*" placeholder="상대 점수" maxlength="5"><button class="buy press" data-cmp>비교!</button></div>`}
        <button class="go press" data-a="again">새 번호로 한 판 더! 🔁</button>
        <button class="ghost press" data-a="menu">대전 메뉴로</button>
        ${wrongReview(r)}
      </div>`;
    $app.querySelector('[data-a=again]').onclick = () => { sfx('tap'); show(sameSetup); };
    $app.querySelector('[data-a=menu]').onclick = () => { sfx('tap'); show(versusMenu); };
    const cmp = $app.querySelector('[data-cmp]');
    if (cmp) cmp.onclick = () => {
      const v = parseInt(document.getElementById('opp').value, 10);
      if (Number.isNaN(v)) return toast('상대 점수를 숫자로 넣어 줘');
      outcome = score > v ? 'win' : score < v ? 'lose' : 'draw';
      const d = save.duel || (save.duel = { win: 0, lose: 0, draw: 0 });
      d[outcome]++; persist();
      draw();
      if (outcome === 'win') { sfx('clear'); confetti(160); setTimeout(() => sikseven($app.querySelector('.result-screen > .who')), 500); } else sfx(outcome === 'lose' ? 'fail' : 'coin');
    };
  };
  draw();
  sfx('clear'); confetti(70);
}
