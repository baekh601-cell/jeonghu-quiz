'use strict';
// 둘이 한 기기로 하는 파티 게임 (모두 인터넷 없이)
//  ⚡ 숫자 빨리 누르기 · 🏅 순발력 올림픽(숫자/총잡이 결투/국기 찾기, 3판 2선승) — 화면을 반으로 나눠 마주 보고
//  🎯 지도 다트 대결 · 🗺️ 땅따먹기 퀴즈 — 번갈아 가며
// 반으로 나누는 게임은 화면 전체를 쓰려고 #app 대신 고정 레이어(#ui)에 그린다
// (#app 은 화면 전환 애니메이션 때문에 position:fixed 가 어긋남).

const RUSH_SIZES = [16, 25];
const RUSH_LOCK = 600; // 숫자 누르기에서 틀렸을 때 멈추는 시간(ms)
save.rushBest = save.rushBest || {}; // 혼자 연습 최고 기록 { 16: 초, 25: 초 }
const otherChar = () => Object.keys(CHARS).find((id) => id !== myChar());
const secs = (ms) => (ms / 1000).toFixed(1);
const partyUi = () => document.getElementById('ui');
const duoIds = () => [otherChar(), myChar()]; // 0번 = 위(가로 화면은 왼쪽, 뒤집혀 보임), 1번 = 아래(오른쪽)

// ───────── 공용: 반으로 나눈 무대 ─────────
// inner(id, pi): 반쪽 안쪽 HTML, info(id, pi): 이름 옆 정보
function partyStage(ids, midText, inner, info = () => '') {
  const duo = ids.length === 2;
  const half = (id, pi) => `<section class="rush-half p${pi}" data-p="${pi}" style="--c:${CHARS[id].color}">
      <header>${charArt(id, 'wave')}<b>${CHARS[id].name}</b><span class="rush-info">${info(id, pi)}</span></header>
      ${inner(id, pi)}
      <div class="rush-msg"></div>
    </section>`;
  // 가운데 띠: 나가기 버튼 (안드로이드 뒤로 가기도 이 버튼을 누른다 — data-back)
  const mid = `<div class="rush-mid"><button class="rush-quit press" data-back aria-label="나가기"><svg viewBox="0 0 10 10" width="16" height="16"><path d="M2 2L8 8M8 2L2 8" stroke="#1f2a5a" stroke-width="2" stroke-linecap="round"/></svg></button><span class="mid-text">${midText}</span></div>`;
  $app.innerHTML = '';
  partyUi().innerHTML = `<div class="rush ${duo ? 'duo' : 'solo'}">${duo ? half(ids[0], 0) + mid + half(ids[1], 1) : mid + half(ids[0], 0)}</div>`;
  const root = partyUi().querySelector('.rush');
  fitBoards();
  return {
    root, halves: [...root.querySelectorAll('.rush-half')],
    alive: () => root.isConnected,
    setMid: (t) => { root.querySelector('.mid-text').textContent = t; },
    msg(pi, html, cls) { const h = this.halves[pi]; h.classList.add(cls); h.querySelector('.rush-msg').innerHTML = html; },
    buttons(list) { // 가운데에 버튼들 [{ label, cls, fn }]
      root.querySelector('.rush-again')?.remove();
      root.insertAdjacentHTML('beforeend', `<div class="rush-again">${list.map((b, i) => `<button class="${b.cls || 'go'} press" data-b="${i}">${b.label}</button>`).join('')}</div>`);
      root.querySelectorAll('.rush-again [data-b]').forEach((el) => (el.onclick = () => { sfx('tap'); list[+el.dataset.b].fn(); }));
    },
  };
}
function fitBoards() { // 숫자판·국기판을 자기 칸에 맞는 정사각형으로
  partyUi().querySelectorAll('.rush-area').forEach((a) => {
    const s = Math.floor(Math.min(a.clientWidth, a.clientHeight)), b = a.firstElementChild, cols = +b.dataset.cols || 4;
    b.style.width = b.style.height = `${s}px`;
    b.style.fontSize = `${Math.round((s / cols) * 0.42)}px`;
  });
}
addEventListener('resize', () => setTimeout(fitBoards, 150));
function countdown(S, go) { // 3, 2, 1, 시작!
  const el = document.createElement('div');
  el.className = 'rush-count';
  S.root.appendChild(el);
  let c = 3;
  const tick = () => {
    if (!S.alive()) return;
    if (c > 0) { el.textContent = c; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); sfx('tick'); c--; setTimeout(tick, 700); return; }
    el.textContent = '시작!'; sfx('power'); buzz(40); go();
    setTimeout(() => el.remove(), 500);
  };
  setTimeout(tick, 300);
}
const winFx = () => { confetti(110); sfx('clear'); buzz([30, 40, 60]); };

// ───────── ⚡ 숫자 빨리 누르기 ─────────
// onDone(winnerPi, { time }) — 혼자면 winnerPi = 0
function numbersGame({ ids, n, mid, onDone, onQuit }) {
  const cols = Math.round(Math.sqrt(n));
  const order = shuffle([...Array(n)].map((_, i) => i + 1)); // 둘 다 같은 배치 (공평하게)
  const P = ids.map(() => ({ next: 1, lock: 0, done: false }));
  let started = false, over = false, t0 = 0, raf = 0;
  const S = partyStage(ids, mid,
    () => `<div class="rush-area"><div class="rush-board" data-cols="${cols}" style="--cols:${cols}">${order.map((v) => `<button class="rush-cell" data-v="${v}">${v}</button>`).join('')}</div></div>`,
    () => `<span class="rush-next">다음 <em>1</em></span><span class="rush-time">0.0초</span>`);
  S.root.querySelector('.rush-quit').onclick = () => { sfx('tap'); cancelAnimationFrame(raf); onQuit(); };
  countdown(S, () => { started = true; t0 = performance.now(); loop(); });
  function loop() {
    const now = performance.now();
    S.halves.forEach((h, pi) => { if (!P[pi].done) h.querySelector('.rush-time').textContent = `${secs(now - t0)}초`; });
    if (!over && S.alive()) raf = requestAnimationFrame(loop);
  }
  S.halves.forEach((h, pi) => h.querySelector('.rush-board').addEventListener('pointerdown', (e) => {
    const cell = e.target.closest('.rush-cell');
    if (!cell) return;
    e.preventDefault();
    const p = P[pi], now = performance.now();
    if (!started || over || p.done || now < p.lock || cell.classList.contains('hit')) return;
    if (+cell.dataset.v === p.next) {
      cell.classList.add('hit');
      tone(330 + p.next * (600 / n), 0.06, { type: 'triangle', vol: 0.07 });
      p.next++;
      h.querySelector('.rush-next em').textContent = p.next > n ? '🏁' : p.next;
      if (p.next > n) {
        p.done = true; over = true; cancelAnimationFrame(raf);
        const time = now - t0;
        h.querySelector('.rush-time').textContent = `${secs(time)}초`;
        winFx();
        onDone(pi, { time, left: P.map((x) => n - x.next + 1) }, S);
      }
    } else { // 틀림: 잠깐 멈춤
      p.lock = now + RUSH_LOCK;
      h.classList.remove('miss'); void h.offsetWidth; h.classList.add('miss');
      tone(150, 0.15, { type: 'sawtooth', vol: 0.05 }); buzz(60);
    }
  }));
}

function rushSetup(back = versusMenu) {
  let n = 16;
  const draw = () => {
    const best = save.rushBest[n];
    $app.innerHTML = `${topBar('⚡ 숫자 빨리 누르기')}
      <div class="setup-hero card"><span class="art ph">⚡</span><div><b>순발력 대결</b><span>1부터 순서대로 먼저 다 누르면 승리! 틀린 숫자를 누르면 잠깐 멈춰요.</span></div></div>
      <div class="rush-vs card">${charArt(otherChar(), 'wave')}<b>VS</b>${charArt(myChar(), 'wave')}</div>
      <p class="hint" style="text-align:center">태블릿(또는 폰)을 둘 사이에 놓고 마주 보고 해요. 세로로 두면 ${charName(otherChar())} 쪽 화면은 거꾸로 보여요.</p>
      <div class="label">숫자 개수</div>
      <div class="opts">${RUSH_SIZES.map((s) => `<button class="opt press ${s === n ? 'on' : ''}" data-n="${s}">1~${s}</button>`).join('')}</div>
      <button class="go press" data-a="duo">둘이 대결! ⚔️</button>
      <button class="ghost press" data-a="solo">혼자 연습 🏃 <small>${best ? `최고 ${best}초` : '기록 없음'}</small></button>`;
    bindBack(() => show(back));
    $app.querySelectorAll('[data-n]').forEach((b) => (b.onclick = () => { sfx('tap'); n = +b.dataset.n; draw(); }));
    $app.querySelector('[data-a=duo]').onclick = () => { sfx('power'); numberRush(n, true, back); };
    $app.querySelector('[data-a=solo]').onclick = () => { sfx('power'); numberRush(n, false, back); };
  };
  draw();
}

function numberRush(n, duo, back) {
  const ids = duo ? duoIds() : [myChar()];
  const wins = [0, 0];
  const leave = () => { keepAwake(false); partyUi().innerHTML = ''; show(() => rushSetup(back)); };
  keepAwake(true);
  const round = () => numbersGame({
    ids, n, mid: `⚡ 1~${n}${duo ? ` · ${wins[0]} : ${wins[1]}` : ' 혼자 연습'}`, onQuit: leave,
    onDone(pi, { time, left }, S) {
      if (duo) {
        wins[pi]++;
        S.setMid(`⚡ 1~${n} · ${wins[0]} : ${wins[1]}`);
        S.msg(pi, `<b>🏆 ${CHARS[ids[pi]].name} 승리!</b><span>${secs(time)}초 · ${CHARS[ids[pi]].shout}</span>`, 'won');
        S.msg(1 - pi, `<b>아깝다!</b><span>${left[1 - pi]}개 남았어요</span>`, 'lost');
      } else {
        const best = save.rushBest[n], record = !best || time / 1000 < best;
        if (record) { save.rushBest[n] = +secs(time); persist(); }
        S.msg(0, `<b>${record ? '🎉 새 기록!' : '완주!'}</b><span>${secs(time)}초${record ? '' : ` · 최고 ${best}초`}</span>`, 'won');
        checkBadges();
      }
      S.buttons([{ label: '한 판 더! 🔁', fn: round }, { label: '그만하기', cls: 'ghost', fn: leave }]);
    },
  });
  round();
}

// ───────── 🤠 총잡이 결투: 신호가 나오면 먼저 누르기 (미리 누르면 반칙) ─────────
function quickDraw({ ids, mid, onDone, onQuit, goal = 2 }) {
  const pts = [0, 0];
  let phase = 'ready', tGo = 0, timer = 0;
  const S = partyStage(ids, mid, () => `<button class="draw-pad"><b>🤠</b><span>준비…</span></button>`, () => `<span class="rush-stars"></span>`);
  S.root.querySelector('.rush-quit').onclick = () => { sfx('tap'); clearTimeout(timer); onQuit(); };
  const pads = S.halves.map((h) => h.querySelector('.draw-pad'));
  const say = (pi, big, small) => { pads[pi].querySelector('b').innerHTML = big; pads[pi].querySelector('span').innerHTML = small; };
  const stars = () => S.halves.forEach((h, pi) => { h.querySelector('.rush-stars').textContent = '⭐'.repeat(pts[pi]) + '☆'.repeat(goal - pts[pi]); });
  stars();
  function round() {
    if (!S.alive()) return;
    phase = 'wait';
    pads.forEach((p, pi) => { p.className = 'draw-pad wait'; say(pi, '🤠', '기다려… 아직 누르면 반칙!'); });
    timer = setTimeout(() => {
      if (!S.alive()) return;
      phase = 'go'; tGo = performance.now();
      pads.forEach((p, pi) => { p.className = 'draw-pad go'; say(pi, '지금!', '빨리 눌러!'); });
      tone(1046, 0.25, { type: 'square', vol: 0.08 }); buzz(30);
    }, 1500 + Math.random() * 3000);
  }
  pads.forEach((p, pi) => p.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (phase !== 'wait' && phase !== 'go') return;
    const foul = phase === 'wait';
    clearTimeout(timer);
    phase = 'result';
    const w = foul ? 1 - pi : pi;
    pts[w]++; stars();
    const ms = Math.round(performance.now() - tGo);
    pads.forEach((pd, j) => { pd.className = `draw-pad ${j === w ? 'win' : 'lose'}`; });
    if (foul) { say(pi, '반칙! 😵', '너무 빨랐어'); say(1 - pi, '+1점 🎉', `${CHARS[ids[1 - pi]].name} 득점!`); sfx('wrong'); }
    else { say(pi, `${ms}ms ⚡`, '빵! 먼저 쐈다!'); say(1 - pi, '느렸어…', `${CHARS[ids[pi]].name}가 더 빨랐어`); sfx('hit'); }
    buzz(40);
    if (pts[w] >= goal) { setTimeout(() => { if (S.alive()) { winFx(); onDone(w, {}, S); } }, 900); }
    else timer = setTimeout(round, 1800);
  }));
  countdown(S, round);
}

// ───────── 🚩 국기 찾기: 나라 이름을 보고 그 나라 국기를 먼저 누르기 ─────────
function flagSnap({ ids, mid, onDone, onQuit, goal = 3 }) {
  const pool = COUNTRIES.filter((c) => c.f && c.d <= 2);
  const pts = [0, 0];
  let lock = [0, 0], target = null, live = false;
  const S = partyStage(ids, mid, () => `<div class="snap-target"></div><div class="rush-area"><div class="rush-board snap-board" data-cols="3" style="--cols:3"></div></div>`, () => `<span class="rush-stars"></span>`);
  S.root.querySelector('.rush-quit').onclick = () => { sfx('tap'); onQuit(); };
  const stars = () => S.halves.forEach((h, pi) => { h.querySelector('.rush-stars').textContent = '⭐'.repeat(pts[pi]) + '☆'.repeat(goal - pts[pi]); });
  stars();
  function round() {
    if (!S.alive()) return;
    target = pick(pool);
    const others = shuffle(pool.filter((c) => c !== target && c.f !== target.f)).slice(0, 8);
    S.halves.forEach((h) => {
      h.querySelector('.snap-target').innerHTML = `<b>${esc(target.n)}</b>의 국기를 찾아라!`;
      h.querySelector('.snap-board').innerHTML = shuffle([target, ...others]).map((c) => `<button class="rush-cell snap" data-iso="${c.iso}">${c.f}</button>`).join('');
    });
    fitBoards();
    lock = [0, 0]; live = true;
  }
  S.halves.forEach((h, pi) => h.querySelector('.snap-board').addEventListener('pointerdown', (e) => {
    const cell = e.target.closest('.snap');
    if (!cell) return;
    e.preventDefault();
    const now = performance.now();
    if (!live || now < lock[pi]) return;
    if (cell.dataset.iso === target.iso) {
      live = false; pts[pi]++; stars();
      cell.classList.add('hit');
      S.halves.forEach((hh, j) => { hh.querySelector('.snap-target').innerHTML = j === pi ? '찾았다! +1점 🎉' : `${CHARS[ids[pi]].name}가 먼저 찾았어!`; });
      sfx('correct'); buzz(20);
      if (pts[pi] >= goal) setTimeout(() => { if (S.alive()) { winFx(); onDone(pi, {}, S); } }, 700);
      else setTimeout(round, 1300);
    } else {
      lock[pi] = now + 800;
      h.classList.remove('miss'); void h.offsetWidth; h.classList.add('miss');
      tone(150, 0.15, { type: 'sawtooth', vol: 0.05 }); buzz(60);
    }
  }));
  countdown(S, round);
}

// ───────── 🏅 순발력 올림픽: 세 종목 중 2경기 먼저 이기면 금메달 ─────────
const OLYMPIC = {
  numbers: { ic: '⚡', name: '숫자 빨리 누르기', desc: '1부터 16까지 순서대로 먼저 누르면 승리! 틀리면 잠깐 멈춰요.', run: (o) => numbersGame({ ...o, n: 16 }) },
  draw: { ic: '🤠', name: '총잡이 결투', desc: '"지금!" 신호가 나오면 먼저 눌러! 미리 누르면 반칙. 2점 먼저 내면 승리.', run: quickDraw },
  snap: { ic: '🚩', name: '국기 찾기', desc: '나라 이름을 보고 그 나라 국기를 먼저 찾아 눌러! 3점 먼저 내면 승리.', run: flagSnap },
};
function olympics(back = versusMenu) {
  const ids = duoIds();
  const score = [0, 0];
  const order = shuffle(Object.keys(OLYMPIC));
  let k = 0;
  const leave = () => { keepAwake(false); partyUi().innerHTML = ''; show(back); };
  keepAwake(true);
  function intro() {
    const g = OLYMPIC[order[k]];
    $app.innerHTML = '';
    partyUi().innerHTML = `<div class="olymp"><div class="olymp-card card">
        <small>🏅 순발력 올림픽 · ${k + 1}경기</small>
        <div class="olymp-score">${charArt(ids[0], 'wave')}<b>${score[0]} : ${score[1]}</b>${charArt(ids[1], 'wave')}</div>
        <div class="olymp-ic">${g.ic}</div><h2>${g.name}</h2><p>${g.desc}</p>
        <button class="go press" data-a="go">시작! ▶</button><button class="linkbtn" data-back>그만하기</button>
      </div></div>`;
    partyUi().querySelector('[data-a=go]').onclick = () => { sfx('power'); play(); };
    partyUi().querySelector('[data-back]').onclick = () => { sfx('tap'); leave(); };
  }
  function play() {
    const g = OLYMPIC[order[k]];
    g.run({
      ids, mid: `🏅 ${k + 1}경기 ${g.ic} · ${score[0]} : ${score[1]}`, onQuit: leave,
      onDone(pi, info, S) {
        score[pi]++;
        S.setMid(`🏅 ${score[0]} : ${score[1]}`);
        S.msg(pi, `<b>🏆 ${CHARS[ids[pi]].name} 승리!</b><span>${g.name} · ${CHARS[ids[pi]].shout}</span>`, 'won');
        S.msg(1 - pi, '<b>아깝다!</b><span>다음 경기에서 역전하자!</span>', 'lost');
        const champ = score[pi] >= 2;
        S.buttons(champ ? [{ label: '🏅 시상식', fn: () => podium(pi) }] : [{ label: '다음 경기 ▶', fn: () => { k++; intro(); } }]);
      },
    });
  }
  function podium(pi) {
    partyUi().innerHTML = '';
    $app.innerHTML = `<div class="result-screen">
        <div class="intro-tag">🏅 순발력 올림픽</div>
        <h1 class="result-title">${CHARS[ids[pi]].name} 금메달!</h1>
        <div class="podium"><div class="gold">${charArt(ids[pi], 'king')}<b>🥇</b></div><div class="silver">${charArt(ids[1 - pi], 'wave')}<b>🥈</b></div></div>
        <div class="duel-score">${score[pi]} : ${score[1 - pi]}</div>
        <button class="go press" data-a="again">한 번 더! 🔁</button>
        <button class="ghost press" data-a="menu">대전 메뉴로</button>
      </div>`;
    confetti(160); sfx('clear');
    $app.querySelector('[data-a=again]').onclick = () => { sfx('tap'); olympics(back); };
    $app.querySelector('[data-a=menu]').onclick = () => { sfx('tap'); keepAwake(false); show(back); };
  }
  intro();
}

// ───────── 🎯 지도 다트 대결: 같은 곳을 번갈아 찍고 더 가까운 사람이 이긴다 ─────────
function mapDarts(back = versusMenu) {
  const ids = [myChar(), otherChar()];
  const ROUNDS = 5;
  const pool = shuffle([...cityList('world'), ...landmarkList('world'), ...cityList('kr'), ...landmarkList('kr')].filter((c) => c.d <= 2)).slice(0, ROUNDS);
  const total = [0, 0], won = [0, 0];
  let r = 0;
  keepAwake(true);
  const label = (c) => `${c.ic || '📍'} ${esc(c.n)}${c.r === 'kr' ? '' : ` <small>(${esc(c.co)})</small>`}`;
  const chips = () => ids.map((id, i) => `<span class="chip" style="background:${CHARS[id].color}">${CHARS[id].name} ${won[i]}승</span>`).join('');
  const quit = () => { keepAwake(false); show(back); };
  function turn(step, guesses) { // step 0: 먼저 찍는 사람, 1: 나중 사람
    const order = r % 2 ? [1, 0] : [0, 1];
    const who = order[step], city = pool[r];
    $app.innerHTML = `${topBar(`🎯 지도 다트 ${r + 1}/${ROUNDS}`, chips())}
      <div class="dart-turn card" style="--c:${CHARS[ids[who]].color}">${charArt(ids[who], 'explorer')}<div><b>${CHARS[ids[who]].name} 차례!</b><span>${label(city)}</span></div></div>
      <div class="mapwrap dartmap"></div>
      <button class="go press" id="dartok" disabled>지도에서 위치를 눌러 줘</button>`;
    bindBack(quit);
    const ok = document.getElementById('dartok');
    const picker = mapPicker($app.querySelector('.dartmap'), city, () => { ok.disabled = false; ok.textContent = '여기야! 확인 📍'; }, { beam: false });
    ok.onclick = () => {
      if (!picker.hasGuess()) return;
      sfx('tap');
      const g = { ...picker.guessOf(), who };
      if (step === 0) return cover(ids[order[1]], () => turn(1, [g]));
      reveal(picker, [...guesses, g]);
    };
  }
  function cover(next, go) { // 다음 사람이 앞사람이 찍은 곳을 못 보게
    $app.innerHTML = `<div class="result-screen"><h1 class="result-title">${CHARS[next].name} 차례!</h1>${charArt(next, 'think')}
      <p>앞사람이 찍은 곳은 비밀이에요 🙈<br>${CHARS[next].name}에게 기기를 넘겨 줘!</p>
      <button class="go press">준비됐어! ▶</button></div>`;
    $app.querySelector('.go').onclick = () => { sfx('power'); go(); };
  }
  function reveal(picker, gs) {
    const city = pool[r], R = REGIONS[city.r] || REGIONS.world;
    const km = gs.map((g) => haversine(g.lat, g.lon, city.lat, city.lon));
    const pts = km.map((d) => Math.round(1000 * Math.exp(-d / R.scale)));
    const first = gs[0];
    picker.reveal([{ lon: first.lon, lat: first.lat, cls: 'pin-guess2' }]); // 나중 사람 = 파랑, 먼저 찍은 사람 = 초록
    gs.forEach((g, i) => { total[g.who] += pts[i]; });
    const best = km[0] === km[1] ? -1 : km[0] < km[1] ? gs[0].who : gs[1].who;
    if (best >= 0) won[best]++;
    const line = (i) => `${i === 0 ? '🟢' : '🔵'} ${CHARS[ids[gs[i].who]].name} ${distText(km[i])} (${pts[i]}점)`;
    $app.querySelector('.dart-turn').outerHTML = `<div class="feedback card ok"><b>${best < 0 ? '무승부!' : `🎯 ${CHARS[ids[best]].name} 승!`} <small>${label(city)}</small></b>${line(0)}<br>${line(1)}${city.e ? `<br><small>${esc(city.e)}</small>` : ''}</div>`;
    $app.querySelector('.top').outerHTML = topBar(`🎯 지도 다트 ${r + 1}/${ROUNDS}`, chips());
    bindBack(quit);
    sfx(best >= 0 ? 'correct' : 'coin');
    const ok = document.getElementById('dartok');
    ok.disabled = false;
    ok.textContent = r + 1 < ROUNDS ? '다음 도시 ›' : '최종 결과 🏁';
    ok.onclick = () => { sfx('tap'); r++; if (r < ROUNDS) cover(ids[r % 2 ? 1 : 0], () => turn(0, [])); else finish(); };
  }
  function finish() {
    const w = won[0] === won[1] ? (total[0] === total[1] ? -1 : total[0] > total[1] ? 0 : 1) : won[0] > won[1] ? 0 : 1;
    $app.innerHTML = `<div class="result-screen">
        <div class="intro-tag">🎯 지도 다트 대결</div>
        <h1 class="result-title">${w < 0 ? '무승부!' : `${CHARS[ids[w]].name} 승리!`}</h1>
        ${w < 0 ? JH.correct() : charArt(ids[w], 'king')}
        <div class="duel-score">${won[0]} : ${won[1]}</div>
        <p>${ids.map((id, i) => `${CHARS[id].name} 총 ${total[i].toLocaleString()}점`).join(' · ')}</p>
        <button class="go press" data-a="again">한 판 더! 🔁</button>
        <button class="ghost press" data-a="menu">대전 메뉴로</button>
      </div>`;
    confetti(140); sfx('clear');
    $app.querySelector('[data-a=again]').onclick = () => { sfx('tap'); mapDarts(back); };
    $app.querySelector('[data-a=menu]').onclick = () => { sfx('tap'); quit(); };
  }
  turn(0, []);
}

// ───────── 🗺️ 땅따먹기 퀴즈: 칸의 주제 문제를 맞히면 내 땅, 한 줄 먼저 만들면 승리 ─────────
const LAND_LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
function landGrab(back = versusMenu) {
  const ids = [myChar(), otherChar()];
  const cells = shuffle(Object.keys(CATS)).slice(0, 8);
  cells.splice(4, 0, 'mix'); // 가운데는 🎲 아무 주제
  const owner = Array(9).fill(-1);
  let turn = 0, sel = -1, q = null, opts = [];
  const catOf = (c) => (c === 'mix' ? { ic: '🎲', name: '아무거나' } : CATS[c]);
  const quit = () => show(back);
  function draw(fb = '') {
    const p = ids[turn];
    $app.innerHTML = `${topBar('🗺️ 땅따먹기 퀴즈')}
      <div class="land-turn card" style="--c:${CHARS[p].color}">${charArt(p, q ? 'think' : 'wave')}<div><b>${CHARS[p].name} 차례!</b><span>${q ? '문제를 맞히면 이 땅은 내 것!' : '갖고 싶은 칸을 골라!'}</span></div></div>
      <div class="land-board">${cells.map((c, i) => {
        const o = owner[i], k = catOf(c);
        return `<button class="land-cell press ${o >= 0 ? 'own' : ''} ${i === sel ? 'sel' : ''}" data-i="${i}" ${o >= 0 || q ? 'disabled' : ''} style="${o >= 0 ? `--c:${CHARS[ids[o]].color}` : ''}">${o >= 0 ? `${charArt(ids[o], 'correct')}` : `<span>${k.ic}</span><small>${k.name}</small>`}</button>`;
      }).join('')}</div>
      <div id="landq">${q ? questionHtml() : fb || '<p class="hint" style="text-align:center">가로·세로·대각선 한 줄을 먼저 차지하면 승리!</p>'}</div>`;
    bindBack(quit);
    $app.querySelectorAll('.land-cell:not([disabled])').forEach((b) => (b.onclick = () => pickCell(+b.dataset.i)));
    if (q) $app.querySelectorAll('#landq .choice').forEach((b) => (b.onclick = () => answer(opts[+b.dataset.i])));
  }
  function pickCell(i) {
    sfx('tap');
    sel = i;
    const c = cells[i];
    q = (c === 'mix' ? mixedQuestions(1, [2, 3]) : drawQuestions(questionsFor(c), 1, [2, 3]))[0];
    opts = shuffle([q.a, ...q.w]);
    draw();
    document.getElementById('landq').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'nearest' });
  }
  function questionHtml() {
    return `<div class="qcard card">
        ${q.flag ? `<div class="big-flag">${q.flag}</div>` : ''}
        ${q.shape && SHAPES[q.shape] ? `<div class="silhouette">${shapeSvg(q.shape)}</div>` : ''}
        <div class="q">${esc(q.q)}</div></div>
      <div class="choices ${q.flags ? 'flags' : ''}">${opts.map((o, i) => `<button class="choice press ${q.flags ? 'flag' : ''}" data-i="${i}">${q.flags ? '' : `<span class="k">${'ABCD'[i]}</span>`}<span>${esc(o)}</span></button>`).join('')}</div>`;
  }
  function answer(chosen) {
    const ok = chosen === q.a, p = ids[turn];
    save.seen[q.k] = true;
    if (ok) { owner[sel] = turn; sfx('correct'); buzz(20); } else { sfx('wrong'); buzz([60, 40, 60]); }
    const fb = `<div class="feedback card ${ok ? 'ok' : 'no'}"><b>${ok ? `정답! ${CHARS[p].name} 땅이 됐어! 🚩` : `땡! 정답은 "${esc(q.a)}"`}</b>${q.e ? esc(q.e) : ''}</div>`;
    const line = LAND_LINES.find((L) => L.every((i) => owner[i] === turn));
    q = null; sel = -1;
    if (line) return finish(turn, line, fb);
    if (owner.every((o) => o >= 0)) return finish(owner.filter((o) => o === 0).length > 4 ? 0 : 1, null, fb);
    turn = 1 - turn;
    draw(`${fb}<button class="go press" id="landnext">${CHARS[ids[turn]].name} 차례 ▶</button>`);
    document.getElementById('landnext').onclick = () => { sfx('tap'); draw(); };
  }
  function finish(w, line, fb) {
    draw(fb);
    line?.forEach((i) => $app.querySelector(`.land-cell[data-i="${i}"]`)?.classList.add('line'));
    const win = CHARS[ids[w]];
    $app.querySelector('.land-turn').outerHTML = `<div class="land-turn card win" style="--c:${win.color}">${charArt(ids[w], 'king')}<div><b>🏆 ${win.name} 승리!</b><span>${line ? '한 줄 완성! ' : '땅을 더 많이 차지했어! '}${win.shout}</span></div></div>`;
    $app.querySelector('#landq').insertAdjacentHTML('beforeend', `<button class="go press" data-a="again">한 판 더! 🔁</button><button class="ghost press" data-a="menu">대전 메뉴로</button>`);
    $app.querySelector('[data-a=again]').onclick = () => { sfx('tap'); landGrab(back); };
    $app.querySelector('[data-a=menu]').onclick = () => { sfx('tap'); quit(); };
    confetti(140); sfx('clear');
  }
  draw();
}
