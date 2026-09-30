'use strict';
// 퀴즈 왕국: 월드맵, 스테이지, 보스, 상점, 자유 여행, 기록

const WORLDS = [
  { id: 1, name: '수도 초원', cat: 'capital', ic: '🌼', sky: '#bdf0a2', ground: '#8fd86b', deco: ['🌳', '🌼', '🏡', '🐑', '🌻'], boss: { name: '멧돼지 대장 붕붕', emoji: '🐗', img: 'boss-1' } },
  { id: 2, name: '깃발 해변', cat: 'flag', ic: '🏖️', sky: '#bfeaff', ground: '#ffe29a', deco: ['🌴', '🐚', '⛱️', '🦀', '⛵'], boss: { name: '꽃게 선장 집게리', emoji: '🦀', img: 'boss-2' } },
  { id: 3, name: '역사 고궁 마을', cat: 'history', ic: '🏯', sky: '#ffe3c2', ground: '#f3c58f', deco: ['🏯', '🌸', '🎎', '🏮', '⛩️'], boss: { name: '심술 이무기', emoji: '🐉', img: 'boss-3' } },
  { id: 4, name: '과학 화산섬', cat: 'science', ic: '🌋', sky: '#ffd0c2', ground: '#e8896b', deco: ['🌋', '🪨', '🦕', '🔭', '⚗️'], boss: { name: '용암 공룡 뜨거라', emoji: '🦖', img: 'boss-4' } },
  { id: 5, name: '홈런 스타디움', cat: 'kbo', ic: '🏟️', sky: '#c9f2d4', ground: '#5fcf86', deco: ['⚾', '🧢', '🏟️', '🥎', '🏆'], boss: { name: '홈런 고릴라 빵빵', emoji: '🦍', img: 'boss-5' } },
  { id: 6, name: '넌센스 구름나라', cat: 'nonsense', ic: '☁️', sky: '#f6d6ff', ground: '#ffc2e2', deco: ['☁️', '🍭', '🌈', '🎈', '🦄'], boss: { name: '장난꾸러기 문어 꼬물', emoji: '🐙', img: 'boss-6' } },
  { id: 7, name: '탐험 정글', cat: 'map', ic: '🌴', sky: '#c6f0c0', ground: '#56b870', deco: ['🌴', '🐒', '🦜', '🗿', '🍌'], boss: { name: '정글 대왕뱀 스르륵', emoji: '🐍', img: 'boss-7' } },
  { id: 8, name: '모르쇠 대왕의 성', cat: 'mix', ic: '🏰', sky: '#d9ccff', ground: '#8f7ad8', deco: ['🏰', '⚡', '🦇', '💎', '🔮'], boss: { name: '모르쇠 대왕', emoji: '😈', img: 'boss-8' } },
];
const STAGE_KEYS = ['1', '2', '3', 'B', '4', '5', 'C'];
const STAGE_DIFF = { 1: [1], 2: [1], 3: [1, 2], 4: [2], 5: [2, 3], C: [2, 3] };
const HARD_DIFF = { 1: [2], 2: [2, 3], 3: [2, 3], 4: [3], 5: [3], C: [3] };
const TOTAL_STARS = WORLDS.length * 6 * 3;

// ───────── 진행 상태 ─────────
const sid = (w, k) => `${w.id}-${k}`;
const cleared = (w, k) => !!save.stages[sid(w, k)];
function unlocked(w, k) {
  const wi = WORLDS.indexOf(w);
  if (k === '1') return wi === 0 || cleared(WORLDS[wi - 1], 'C');
  const prev = { 2: '1', 3: '2', B: '3', 4: '3', 5: '4', C: '5' }[k];
  return cleared(w, prev);
}
function currentNode() { // 정후가 서 있을 자리: 아직 안 깬 첫 스테이지
  for (const w of WORLDS) for (const k of STAGE_KEYS) if (k !== 'B' && unlocked(w, k) && !cleared(w, k)) return sid(w, k);
  return sid(WORLDS[WORLDS.length - 1], 'C');
}
const totalStars = () => Object.entries(save.stages).filter(([k]) => !k.endsWith('-B')).reduce((s, [, v]) => s + v, 0);
const worldOf = (id) => WORLDS.find((w) => w.id === +id.split('-')[0]);

// ───────── 월드맵 ─────────
const NODE_GAP = 100, WORLD_GAP = 150;
const XS = [70, 78, 62, 42, 24, 30, 52]; // 스테이지별 가로 위치 (%)
function layout() {
  const nodes = [];
  let y = 190; // 아래 메뉴에 가리지 않게
  WORLDS.forEach((w, wi) => {
    const start = y - 60;
    STAGE_KEYS.forEach((k, i) => {
      nodes.push({ w, k, id: sid(w, k), x: XS[i] + (wi % 2 ? -4 : 4) * (i % 3 === 1 ? 1 : 0), y });
      y += NODE_GAP;
    });
    w._band = [start, y - NODE_GAP + WORLD_GAP / 2 + 10];
    y += WORLD_GAP - NODE_GAP;
  });
  return { nodes, height: y + 60 };
}
// 같은 결과가 나오는 난수 (장식 위치 고정)
function seeded(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }

function kingdom(opts = {}) {
  const { nodes, height: H } = layout();
  const cur = currentNode();
  const toTop = (y) => H - y; // 아래에서 위로 올라가는 지도
  const pts = nodes.map((n) => [n.x, toTop(n.y)]);
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    d += ` C${x0},${(y0 + y1) / 2} ${x1},${(y0 + y1) / 2} ${x1},${y1}`;
  }
  const bands = WORLDS.map((w, wi) => {
    const [a, b] = w._band;
    const rand = seeded(w.id * 97);
    const locked = !unlocked(w, '1');
    const deco = Array.from({ length: 7 }, (_, i) => {
      const side = i % 2 ? 4 + rand() * 12 : 84 + rand() * 12;
      return `<span class="deco" style="left:${side}%;top:${(0.1 + rand() * 0.8) * (b - a)}px;font-size:${26 + rand() * 18}px;animation-delay:${-rand() * 4}s">${w.deco[i % w.deco.length]}</span>`;
    }).join('');
    return `<div class="band ${locked ? 'locked' : ''}" style="top:${toTop(b)}px;height:${b - a}px;--sky:${w.sky};--ground:${w.ground}">
      ${deco}
      <div class="world-sign">WORLD ${w.id} · ${w.ic} ${w.name}</div>
      ${locked ? `<div class="fog"><b>🔒 WORLD ${w.id}</b><span>${wi ? `월드 ${w.id - 1}의 성을 깨면 열려요` : ''}</span></div>` : ''}
    </div>`;
  }).join('');
  const nodeHtml = nodes.map((n) => {
    const open = unlocked(n.w, n.k), s = save.stages[n.id] || 0;
    const cls = n.k === 'C' ? 'castle' : n.k === 'B' ? 'qblock' : 'dot';
    const label = n.k === 'C' ? art(n.w.boss.img, '🏰', 'nodeimg') : n.k === 'B' ? '?' : `${n.w.id}-${n.k}`;
    return `<button class="node ${cls} ${open ? 'open' : 'locked'} ${s ? 'done' : ''} ${n.id === cur ? 'cur' : ''}" data-node="${n.id}" style="left:${n.x}%;top:${toTop(n.y)}px">
      <span class="face">${n.k === 'C' ? (s ? '🏳️' : open ? label : '🏰') : label}</span>
      ${n.k !== 'B' && s ? `<span class="nstars">${'⭐'.repeat(s)}</span>` : ''}
      ${n.k === 'B' && s ? '<span class="nstars">✔</span>' : ''}
    </button>`;
  }).join('');
  const curNode = nodes.find((n) => n.id === cur);
  const from = opts.from && nodes.find((n) => n.id === opts.from);
  const start = from && from.id !== cur ? from : curNode;

  const ui = document.getElementById('ui');
  ui.innerHTML = `
    <div class="hud">
      <span class="chip">🪙 <b data-coins>${save.coins.toLocaleString()}</b></span>
      <span class="chip">⭐ ${totalStars()}/${TOTAL_STARS}</span>
      <span class="chip lv">Lv.${levelOf(save.xp).lv}</span>
      <button class="chip press" data-sound>${save.sound ? '🔊' : '🔇'}</button>
    </div>
    <nav class="dock">
      <button class="press" data-go="shop"><span>🏪</span>상점</button>
      <button class="press" data-go="free"><span>🎒</span>자유 여행</button>
      <button class="press" data-go="stats"><span>🏆</span>기록</button>
    </nav>`;
  $app.innerHTML = `
    <div class="kingdom" style="height:${H}px">
      ${bands}
      <svg class="road" viewBox="0 0 100 ${H}" preserveAspectRatio="none"><path d="${d}"/><path class="dash" d="${d}"/></svg>
      ${nodeHtml}
      <div class="hero-pin" id="hero" style="left:${start.x}%;top:${toTop(start.y)}px">
        <span class="ride">${rideIcon()}</span>${JH.walk()}
      </div>
    </div>`;
  $app.classList.add('on-map');

  // 현재 위치로 스크롤
  const target = toTop(start.y) - innerHeight * 0.55;
  setTimeout(() => window.scrollTo(0, Math.max(0, target)), 0); // show() 가 맨 위로 올린 뒤에
  if (start !== curNode) { // 다음 스테이지로 걸어가기
    const hero = document.getElementById('hero');
    setTimeout(async () => {
      for (let i = 0; i < 3; i++) { sfx('step'); await wait(120); }
      hero.style.left = `${curNode.x}%`; hero.style.top = `${toTop(curNode.y)}px`;
      hero.classList.add('walking');
      window.scrollTo({ top: Math.max(0, toTop(curNode.y) - innerHeight * 0.55), behavior: reduced ? 'auto' : 'smooth' });
      setTimeout(() => hero.classList.remove('walking'), 900);
      if (opts.unlockedWorld) setTimeout(() => { sfx('unlock'); toast(`🎉 WORLD ${opts.unlockedWorld.id} ${opts.unlockedWorld.name} 열림!`); }, 900);
    }, 500);
  }

  $app.querySelectorAll('[data-node]').forEach((b) => (b.onclick = () => {
    const id = b.dataset.node, w = worldOf(id), k = id.split('-')[1];
    if (!unlocked(w, k)) { sfx('wrong'); return toast(k === '1' ? `월드 ${w.id - 1}의 성을 먼저 깨야 해요 🔒` : '앞 스테이지를 먼저 깨야 해요 🔒'); }
    sfx('tap');
    stageIntro(w, k);
  }));
  ui.querySelector('[data-sound]').onclick = (e) => { save.sound = !save.sound; persist(); e.currentTarget.textContent = save.sound ? '🔊' : '🔇'; sfx('tap'); };
  ui.querySelector('[data-go=shop]').onclick = () => { sfx('tap'); goto(shop); };
  ui.querySelector('[data-go=free]').onclick = () => { sfx('tap'); goto(freeMenu); };
  ui.querySelector('[data-go=stats]').onclick = () => { sfx('tap'); goto(stats); };
}
function goto(render) { $app.classList.remove('on-map'); show(render); }
function toMap(opts) { $app.classList.remove('on-map'); show(() => kingdom(opts)); }

// ───────── 스테이지 ─────────
function stageInfo(w, k) {
  const hard = w.cat === 'mix';
  const diffs = (hard ? HARD_DIFF : STAGE_DIFF)[k] || [1, 2, 3];
  if (k === 'B') return { kind: 'bonus', title: `${w.id}-? 보너스`, desc: '45초 스피드 퀴즈! 맞힐 때마다 코인을 받아요.', diffs: [1, 2] };
  if (k === 'C') {
    const hp = w.cat === 'map' ? 4500 : hard ? 12 : 8;
    return { kind: 'boss', title: `${w.id}-🏰 ${w.boss.name}`, desc: w.cat === 'map' ? `도시 위치를 맞혀서 보스의 HP ${hp.toLocaleString()}을 깎아라!` : `문제를 맞혀서 보스의 HP ${hp}을 깎아라! 문제마다 20초 제한, 하트 3개.`, diffs, hp };
  }
  if (w.cat === 'map') {
    const region = { 1: 'kr', 2: 'world', 3: 'kr', 4: 'world', 5: null }[k];
    return { kind: 'map', title: `${w.id}-${k}`, desc: `${region === 'kr' ? '🇰🇷 대한민국' : region === 'world' ? '🌍 세계' : '🇰🇷+🌍 섞어서'} 도시 5곳. 평균 300점 이상이면 클리어!`, diffs, region };
  }
  return { kind: 'quiz', title: `${w.id}-${k}`, desc: `문제 8개 · 하트 3개. 3번 틀리면 실패!`, diffs };
}

async function stageIntro(w, k) {
  const info = stageInfo(w, k);
  const best = save.stages[sid(w, k)] || 0;
  const catName = w.cat === 'mix' ? '🌏 모든 주제' : w.cat === 'map' ? '🗺️ 지도에서 도시 찾기' : `${CATS[w.cat].ic} ${CATS[w.cat].name}`;
  const face = info.kind === 'boss' ? `<div class="intro-boss">${art(w.boss.img, w.boss.emoji, 'bossimg')}</div>` : info.kind === 'bonus' ? '<div class="qbig">?</div>' : JH.wave();
  const v = await modal(`
    <div class="intro-tag">WORLD ${w.id} · ${w.name}</div>
    ${face}
    <h2>${info.title}</h2>
    <p class="intro-cat">${catName} · 난이도 ${info.diffs.map((d) => stars(d)).join(' ~ ')}</p>
    <p>${info.desc}</p>
    ${best && info.kind !== 'bonus' ? `<p>최고 기록 ${'⭐'.repeat(best)}${'☆'.repeat(3 - best)}</p>` : ''}
    <button class="go press" data-v="go">${info.kind === 'boss' ? '보스에게 도전! ⚔️' : '출발! 🏁'}</button>
    <button class="ghost press" data-v="no">지도로</button>`);
  if (v === 'go') flyTo(() => playStage(w, k));
}

function stageQuestions(w, info, n) {
  if (w.cat === 'mix') return mixedQuestions(n, info.diffs);
  const cat = w.cat === 'map' ? pick(['capital', 'flag']) : w.cat;
  return drawQuestions(questionsFor(cat), n, info.diffs);
}

function playStage(w, k) {
  $app.classList.remove('on-map');
  document.getElementById('ui').innerHTML = '';
  const info = stageInfo(w, k);
  const id = sid(w, k);
  const quit = () => toMap();
  if (info.kind === 'bonus') {
    return runQuiz({
      title: `${w.id}-? 보너스`, qs: stageQuestions(w, info, 80), speed: 45, items: false,
      onQuit: quit, onEnd: (r) => stageResult(w, k, { ...r, cleared: true, stars: 1 }),
    });
  }
  if (w.cat === 'map') {
    const cities = info.kind === 'boss'
      ? drawQuestions(cityList(), 8, info.diffs)
      : drawQuestions(cityList(info.region), 5, info.diffs);
    return runMap({
      title: info.kind === 'boss' ? `${w.id}-🏰 보스전` : `스테이지 ${info.title}`, cities, boss: info.kind === 'boss' ? { ...w.boss, hp: info.hp } : null,
      onQuit: quit,
      onEnd: (r) => {
        const avg = r.total / Math.max(1, r.log.length);
        const s = info.kind === 'boss' ? (r.cleared ? (avg >= 700 ? 3 : avg >= 600 ? 2 : 1) : 0) : avg >= 700 ? 3 : avg >= 500 ? 2 : avg >= 300 ? 1 : 0;
        stageResult(w, k, { cleared: s > 0, stars: s, coins: 0, map: r });
      },
    });
  }
  const boss = info.kind === 'boss' ? { ...w.boss, hp: info.hp } : null;
  runQuiz({
    title: boss ? `${w.id}-🏰 보스전` : `스테이지 ${info.title}`,
    qs: stageQuestions(w, info, boss ? info.hp + 5 : 8),
    hearts: 3, boss, timer: boss ? 20 : null,
    onQuit: quit,
    onEnd: (r) => {
      const s = !r.cleared ? 0 : boss ? r.heartsLeft : Math.max(1, 3 - r.wrong);
      stageResult(w, k, { ...r, stars: s });
    },
  });
}

async function stageResult(w, k, r) {
  const id = sid(w, k);
  const info = stageInfo(w, k);
  const firstClear = r.cleared && !save.stages[id];
  const prevStars = save.stages[id] || 0;
  const beforeCur = currentNode();
  if (r.cleared) save.stages[id] = Math.max(prevStars, r.stars);
  let bonus = 0;
  if (r.cleared) bonus = info.kind === 'bonus' ? 0 : 5 + r.stars * 2 + (firstClear ? 10 : 0);
  if (info.kind === 'bonus') { save.speedBest = Math.max(save.speedBest, r.correct); }
  if (info.kind === 'boss' && r.cleared) save.bosses++;
  addCoins(bonus);
  persist();

  const title = !r.cleared ? (info.kind === 'boss' ? '보스에게 졌어…' : '아쉽다!') : info.kind === 'boss' ? '보스 격파!' : info.kind === 'bonus' ? '보너스 끝!' : '스테이지 클리어!';
  const who = !r.cleared ? JH.wrong() : info.kind === 'boss' ? JH.king() : JH.correct();
  const statLine = r.map
    ? `총 ${r.map.total.toLocaleString()}점 · 도시 평균 ${Math.round(r.map.total / Math.max(1, r.map.log.length))}점`
    : info.kind === 'bonus' ? `45초 동안 ${r.correct}개 정답!` : `정답 ${r.correct} · 오답 ${r.wrong}${r.maxStreak >= 3 ? ` · 최고 ${r.maxStreak}연속` : ''}`;
  $app.innerHTML = `
    <div class="result-screen">
      <div class="intro-tag">WORLD ${w.id} · ${w.name}</div>
      <h1 class="result-title ${r.cleared ? '' : 'fail'}">${title}</h1>
      ${who}
      ${info.kind !== 'bonus' ? `<div class="bigstars">${[1, 2, 3].map((i) => `<span class="${r.cleared && i <= r.stars ? 'on' : ''}" style="animation-delay:${0.3 + i * 0.25}s">★</span>`).join('')}</div>` : ''}
      <p>${statLine}</p>
      <div class="coinline">🪙 +${(r.coins || 0) + bonus} ${bonus ? `<small>(클리어 보너스 ${bonus}${firstClear ? ', 첫 클리어!' : ''})</small>` : ''}</div>
      ${r.cleared ? '' : `<p class="hint">${info.kind === 'map' ? '평균 300점을 넘으면 클리어!' : '상점에서 ❤️ 하트나 🌓 반반 아이템을 사 가면 쉬워져요.'}</p>`}
      <button class="go press" data-a="${r.cleared ? 'next' : 'retry'}">${r.cleared ? '지도로 🗺️' : '다시 도전! 🔁'}</button>
      <button class="ghost press" data-a="${r.cleared ? 'retry' : 'map'}">${r.cleared ? '한 번 더 하기' : '지도로'}</button>
      ${r.qs && r.results ? wrongReview(r) : ''}
    </div>`;
  if (r.cleared) {
    sfx('clear');
    if (!reduced) [1, 2, 3].forEach((i) => i <= r.stars && setTimeout(() => sfx('coin'), 300 + i * 250 + 100));
    setTimeout(() => confetti(r.stars === 3 ? 140 : 70), 350);
  } else sfx('fail');

  const again = () => flyTo(() => playStage(w, k));
  const back = async () => {
    if (info.kind === 'bonus' && r.cleared && !save.bonus[id]) { save.bonus[id] = 1; persist(); await openChest(false); }
    if (info.kind === 'boss' && firstClear) {
      await openChest(true);
      const next = WORLDS[WORLDS.indexOf(w) + 1];
      if (!next) { await ending(); return toMap(); }
      return toMap({ from: beforeCur, unlockedWorld: next });
    }
    toMap({ from: beforeCur });
  };
  $app.querySelector('[data-a=next]')?.addEventListener('click', () => { sfx('tap'); back(); });
  $app.querySelector('[data-a=map]')?.addEventListener('click', () => { sfx('tap'); toMap(); });
  $app.querySelectorAll('[data-a=retry]').forEach((b) => b.addEventListener('click', () => { sfx('tap'); again(); }));
}
function wrongReview(r) {
  const wrongs = r.qs.filter((_, i) => r.results[i] === false);
  if (!wrongs.length) return '';
  return `<div class="label">📒 틀린 문제 (오답 노트에 저장됨)</div>
    <div class="review">${wrongs.map((q) => `<div>${q.flag ? q.flag + ' ' : ''}${esc(q.q)}<br>→ <em>${esc(q.a)}</em></div>`).join('')}</div>`;
}

async function openChest(big) {
  const coins = big ? 25 + rnd(26) : 10 + rnd(16);
  const item = pick(Object.keys(ITEMS));
  const count = big ? 2 : 1;
  const v = modal(`<div class="chest" id="chest">🎁</div><h2>${big ? '보스의 보물상자!' : '보너스 보물상자!'}</h2><p>눌러서 열어 봐!</p><button class="go press" data-v="ok" id="chestbtn" style="visibility:hidden">받기!</button>`, { close: false });
  const chest = document.getElementById('chest');
  chest.onclick = () => {
    if (chest.classList.contains('opened')) return;
    chest.classList.add('opened'); sfx('open'); confetti(80);
    chest.textContent = '✨';
    chest.insertAdjacentHTML('afterend', `<div class="loot"><span>🪙 ${coins}</span><span>${ITEMS[item].ic} ${ITEMS[item].name} ×${count}</span></div>`);
    save.coins += coins; save.items[item] = (save.items[item] || 0) + count; persist();
    chest.parentElement.querySelector('p').textContent = '보물을 얻었다!';
    document.getElementById('chestbtn').style.visibility = 'visible';
  };
  await v;
}

async function ending() {
  confetti(200); sfx('clear');
  await modal(`${JH.king()}<h2>👑 퀴즈왕 등극!</h2><p>정후가 모르쇠 대왕을 물리치고 왕국의 지식 별을 모두 되찾았어요!<br>이제 정후는 <b>퀴즈 왕국의 퀴즈왕</b>!</p><p class="hint">별 3개를 전부 모으는 것에도 도전해 봐! (⭐ ${totalStars()}/${TOTAL_STARS})</p><button class="go press" data-v="ok">만세! 🎉</button>`, { close: false });
}

// ───────── 타이틀 ─────────
function title() {
  $app.classList.remove('on-map');
  $app.innerHTML = `
    <div class="title-screen">
      <div class="logo"><small>JEONGHU'S QUIZ KINGDOM</small><h1>정후의<br><b>퀴즈 왕국</b></h1></div>
      <div class="title-hero">${save.bosses >= WORLDS.length ? JH.king() : JH.wave()}<span class="ride big">${rideIcon()}</span></div>
      <button class="go press big" data-start>${Object.keys(save.stages).length ? '이어서 모험하기 ▶' : '모험 시작! ▶'}</button>
      <p class="hint">⭐ ${totalStars()}/${TOTAL_STARS} · 🪙 ${save.coins.toLocaleString()} · Lv.${levelOf(save.xp).lv} ${rankOf(levelOf(save.xp).lv)}</p>
    </div>`;
  $app.querySelector('[data-start]').onclick = async () => {
    sfx('power');
    if (!save.story) {
      await modal(`<div class="intro-boss">${art('boss-8', '😈', 'bossimg')}</div><h2>큰일이야!</h2>
        <p>심술쟁이 <b>모르쇠 대왕</b>이 퀴즈 왕국의 <b>지식 별</b>을 전부 훔쳐 갔어!</p>
        <p>8개의 월드를 지나 대왕의 성까지 가서 별을 되찾아 줘.<br>각 월드의 성에는 보스가 기다리고 있어!</p>
        <button class="go press" data-v="ok">내가 할게! 💪</button>`, { close: false });
      save.story = true; persist();
    }
    flyTo(() => kingdom());
  };
}

// ───────── 상점 ─────────
function shop() {
  const draw = () => {
    $app.innerHTML = `${topBar('🏪 여행자 가게', `<span class="chip">🪙 <b data-coins>${save.coins.toLocaleString()}</b></span>`)}
      <div class="shopkeeper card">${art('shopkeeper', '🦉', 'who')}<div class="bubble-in">어서 와! 스테이지에서 모은 코인으로 아이템을 살 수 있단다.</div></div>
      <div class="label">🧪 아이템</div>
      <div class="shop-grid">${Object.entries(ITEMS).map(([k, it]) => `
        <div class="shop-item card"><span class="big">${it.ic}</span><b>${it.name}</b><small>${it.desc}</small><small>가진 개수 ${save.items[k] || 0}</small>
        <button class="buy press" data-buy="${k}" ${save.coins < it.price ? 'disabled' : ''}>🪙 ${it.price}</button></div>`).join('')}</div>
      <div class="label">🛩️ 탈것 (지도에서 정후와 함께 다녀요)</div>
      <div class="shop-grid">${Object.entries(RIDES).map(([k, r]) => {
        const own = save.rides.includes(k), on = save.ride === k;
        return `<div class="shop-item card ${on ? 'on' : ''}"><span class="big">${r.ic}</span><b>${r.name}</b>
          ${own ? `<button class="buy press ${on ? 'using' : ''}" data-ride="${k}">${on ? '타는 중' : '타기'}</button>`
            : `<button class="buy press" data-rbuy="${k}" ${save.coins < r.price ? 'disabled' : ''}>🪙 ${r.price}</button>`}</div>`;
      }).join('')}</div>`;
    bindBack(() => toMap());
    $app.querySelectorAll('[data-buy]').forEach((b) => (b.onclick = () => {
      const k = b.dataset.buy, it = ITEMS[k];
      if (save.coins < it.price) return;
      save.coins -= it.price; save.items[k] = (save.items[k] || 0) + 1; persist(); sfx('coin');
      toast(`${it.ic} ${it.name} 샀다!`); draw();
    }));
    $app.querySelectorAll('[data-rbuy]').forEach((b) => (b.onclick = () => {
      const k = b.dataset.rbuy, r = RIDES[k];
      if (save.coins < r.price) return;
      save.coins -= r.price; save.rides.push(k); save.ride = k; persist(); sfx('power'); confetti(60);
      toast(`${r.ic} ${r.name} 획득!`); draw();
    }));
    $app.querySelectorAll('[data-ride]').forEach((b) => (b.onclick = () => { save.ride = b.dataset.ride; persist(); sfx('tap'); draw(); }));
  };
  draw();
}

// ───────── 자유 여행 (주제 골라서 연습) ─────────
function freeMenu() {
  const t = (k, name, ic, icon, desc, c, wide) => `<button class="ticket card press ${wide ? 'wide' : ''}" data-free="${k}" style="--c:${c}">${art(icon, ic)}<div><b>${name}</b><br><span>${desc}</span></div></button>`;
  $app.innerHTML = `${topBar('🎒 자유 여행')}
    <p class="hint">왕국 모험과 별개로, 좋아하는 주제만 골라서 마음껏 풀 수 있어요.</p>
    <div class="tickets">
      ${t('speed', '스피드 챌린지', '⚡', 'icon-speed', `60초 동안 몇 개나? 최고 ${save.speedBest}개`, '#ffd43b', true)}
      ${t('map', '지도에서 도시 찾기', '🗺️', 'icon-map', '세계·한국 지도', '#3ddc97', true)}
      ${Object.entries(CATS).map(([k, c]) => t(k, c.name, c.ic, c.icon, `${countFor(k)}문제`, c.c)).join('')}
      ${t('mix', '전부 섞기', '🌏', 'icon-mix', '모든 주제에서', '#4fb3ff')}
      ${t('wrong', '오답 노트', '📒', 'icon-wrongnote', `${save.wrong.length}개`, '#ff6b6b')}
    </div>`;
  bindBack(() => toMap());
  $app.querySelectorAll('[data-free]').forEach((b) => (b.onclick = () => {
    sfx('tap');
    const k = b.dataset.free;
    if (k === 'map') return show(freeMapSetup);
    if (k === 'speed') return flyTo(() => runQuiz({
      title: '⚡ 스피드 챌린지', qs: mixedQuestions(150, [1, 2]), speed: 60, items: false,
      onQuit: () => show(freeMenu),
      onEnd: (r) => { const best = r.correct > save.speedBest; save.speedBest = Math.max(save.speedBest, r.correct); persist(); freeResult({ ...r, title: `60초 동안 ${r.correct}개 정답!`, sub: best ? '🎉 새 최고 기록!' : `최고 기록 ${save.speedBest}개`, again: () => b.click() }); },
    }));
    if (k === 'wrong') {
      if (!save.wrong.length) return toast('아직 틀린 문제가 없어요! 👍');
      return flyTo(() => runQuiz({
        title: '📒 오답 노트', qs: shuffle(save.wrong).slice(0, 10), hearts: null,
        onWrongFixed: (q) => { save.wrong = save.wrong.filter((w) => w.k !== q.k); },
        onQuit: () => show(freeMenu), onEnd: (r) => freeResult({ ...r, again: () => (save.wrong.length ? b.click() : show(freeMenu)) }),
      }));
    }
    show(() => freeSetup(k));
  }));
}
function freeSetup(cat) {
  const c = cat === 'mix' ? { name: '전부 섞기', ic: '🌏', icon: 'icon-mix' } : CATS[cat];
  let diff = 0, count = 10;
  const draw = () => {
    $app.innerHTML = `${topBar('탑승 준비')}
      <div class="setup-hero card">${art(c.icon, c.ic)}<div><b>${c.name}</b><span>${c.desc || '모든 주제에서 골고루'}</span></div></div>
      <div class="label">난이도</div>
      <div class="opts">${[0, 1, 2, 3].map((d) => `<button class="opt press ${d === diff ? 'on' : ''}" data-d="${d}">${d ? stars(d) + ' ' : ''}${DIFF_NAME[d]}</button>`).join('')}</div>
      <div class="label">문제 수</div>
      <div class="opts">${[10, 20, 30].map((n) => `<button class="opt press ${n === count ? 'on' : ''}" data-n="${n}">${n}문제</button>`).join('')}</div>
      <button class="go press">출발! 🛫</button>`;
    bindBack(() => show(freeMenu));
    $app.querySelectorAll('[data-d]').forEach((b) => (b.onclick = () => { sfx('tap'); diff = +b.dataset.d; draw(); }));
    $app.querySelectorAll('[data-n]').forEach((b) => (b.onclick = () => { sfx('tap'); count = +b.dataset.n; draw(); }));
    $app.querySelector('.go').onclick = () => {
      const start = () => runQuiz({
        title: `${c.ic} ${c.name}`, qs: cat === 'mix' ? mixedQuestions(count, diff) : drawQuestions(questionsFor(cat), count, diff), hearts: null,
        onQuit: () => show(freeMenu), onEnd: (r) => freeResult({ ...r, again: start }),
      });
      flyTo(start);
    };
  };
  draw();
}
function freeResult(r) {
  const pct = r.total ? r.correct / r.total : 0;
  $app.innerHTML = `<div class="result-screen">
      <h1 class="result-title">${r.title || `${r.total}문제 중 ${r.correct}개 정답`}</h1>
      ${pct >= 0.7 ? JH.correct() : JH.wrong()}
      <p>${r.sub || (pct === 1 ? '완벽해! 만점이야!' : pct >= 0.7 ? '잘했어!' : '다음엔 더 잘할 수 있어!')}</p>
      <div class="coinline">🪙 +${r.coins || 0}</div>
      <button class="go press" data-a="again">한 번 더! 🔁</button>
      <button class="ghost press" data-a="menu">자유 여행 메뉴로</button>
      ${r.qs ? wrongReview(r) : ''}
    </div>`;
  if (pct >= 0.8) { sfx('clear'); confetti(); }
  $app.querySelector('[data-a=again]').onclick = () => { sfx('tap'); flyTo(r.again); };
  $app.querySelector('[data-a=menu]').onclick = () => { sfx('tap'); show(freeMenu); };
}
function freeMapSetup() {
  let region = 'world', diff = 0;
  const draw = () => {
    const n = CITIES.filter((c) => c.r === region && (!diff || c.d === diff)).length;
    $app.innerHTML = `${topBar('탑승 준비')}
      <div class="setup-hero card">${JH.explorer()}<div><b>지도에서 도시 찾기</b><span>도시 위치를 톡! 누르고 [확인]. 가까울수록 점수가 높아요 (한 도시 최대 1000점).</span></div></div>
      <div class="label">지도</div>
      <div class="opts">${Object.entries(REGIONS).map(([k, r]) => `<button class="opt press ${k === region ? 'on' : ''}" data-r="${k}">${r.ic} ${r.name}</button>`).join('')}</div>
      <div class="label">난이도</div>
      <div class="opts">${[0, 1, 2, 3].map((d) => `<button class="opt press ${d === diff ? 'on' : ''}" data-d="${d}">${d ? stars(d) + ' ' : ''}${DIFF_NAME[d]}</button>`).join('')}</div>
      <p class="hint">도시 ${n}곳 · 최고 점수 ${(save.mapBest[region] || 0).toLocaleString()}</p>
      <button class="go press">출발! 🛫</button>`;
    bindBack(() => show(freeMenu));
    $app.querySelectorAll('[data-r]').forEach((b) => (b.onclick = () => { sfx('tap'); region = b.dataset.r; draw(); }));
    $app.querySelectorAll('[data-d]').forEach((b) => (b.onclick = () => { sfx('tap'); diff = +b.dataset.d; draw(); }));
    $app.querySelector('.go').onclick = () => {
      const start = () => runMap({
        title: `${REGIONS[region].ic} ${REGIONS[region].name} 지도`, cities: drawQuestions(cityList(region), 10, diff),
        onQuit: () => show(freeMenu),
        onEnd: (r) => {
          const best = r.total > (save.mapBest[region] || 0);
          if (best) { save.mapBest[region] = r.total; persist(); }
          freeResult({ correct: 0, total: 0, coins: 0, title: `${r.total.toLocaleString()}점`, sub: best ? '🎉 새 최고 기록!' : `최고 기록 ${(save.mapBest[region] || 0).toLocaleString()}점`, again: start });
        },
      });
      flyTo(start);
    };
  };
  draw();
}

// ───────── 기록 ─────────
function stats() {
  const rows = Object.entries(CATS).map(([k, c]) => {
    const p = save.perCat[k] || { n: 0, ok: 0 };
    return `<div><span>${c.ic} ${c.name}</span><b>${p.n ? Math.round((p.ok / p.n) * 100) + '%' : '-'} <small>(${p.ok}/${p.n})</small></b></div>`;
  }).join('');
  const worlds = WORLDS.map((w) => {
    const s = STAGE_KEYS.filter((k) => k !== 'B').reduce((a, k) => a + (save.stages[sid(w, k)] || 0), 0);
    return `<div><span>${w.ic} ${w.id}. ${w.name}</span><b>${cleared(w, 'C') ? '🏳️ ' : ''}⭐ ${s}/18</b></div>`;
  }).join('');
  const L = levelOf(save.xp);
  $app.innerHTML = `${topBar('🏆 기록')}
    <div class="stat-list">
      <div><span>레벨</span><b>Lv.${L.lv} ${rankOf(L.lv)}</b></div>
      <div><span>모은 별</span><b>⭐ ${totalStars()} / ${TOTAL_STARS}</b></div>
      <div><span>코인</span><b>🪙 ${save.coins.toLocaleString()}</b></div>
      <div><span>쓰러뜨린 보스</span><b>${save.bosses}번</b></div>
      <div><span>푼 문제 / 정답률</span><b>${save.answered}개 / ${save.answered ? Math.round((save.correct / save.answered) * 100) : 0}%</b></div>
      <div><span>최고 연속 정답</span><b>${save.bestStreak}개</b></div>
      <div><span>⚡ 스피드 최고</span><b>${save.speedBest}개</b></div>
    </div>
    <div class="label">월드별 별</div>
    <div class="stat-list">${worlds}</div>
    <div class="label">주제별 정답률</div>
    <div class="stat-list">${rows}</div>
    <button class="ghost press" data-reset>기록 모두 지우기</button>`;
  bindBack(() => toMap());
  $app.querySelector('[data-reset]').onclick = async () => {
    const v = await modal('<h2>정말 지울까요?</h2><p>별, 코인, 아이템, 기록이 모두 사라지고 되돌릴 수 없어요.</p><button class="go press" data-v="no">아니요</button><button class="ghost press" data-v="yes">모두 지우기</button>');
    if (v !== 'yes') return;
    try { localStorage.removeItem(STORE_KEY); } catch (e) { /* 무시 */ }
    location.reload();
  };
}

title();
