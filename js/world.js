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
// 월드마다 스테이지 8개 + ? 보너스 + 보스 성
const STAGE_KEYS = ['1', '2', '3', 'B', '4', '5', '6', '7', '8', 'C'];
const PREV = { 2: '1', 3: '2', B: '3', 4: '3', 5: '4', 6: '5', 7: '6', 8: '7', C: '8' };
const REGULAR = STAGE_KEYS.filter((k) => k !== 'B');
// 스테이지별 기본 난이도 (1 쉬움 · 2 보통 · 3 어려움). 정후 수준에 맞춰 처음부터 보통 이상.
// 실제로는 adaptDiffs() 가 최근 정답률에 따라 한 단계 올리거나 내린다.
const STAGE_DIFF = { 1: [2], 2: [2], 3: [2, 3], 4: [2, 3], 5: [2, 3], 6: [3], 7: [3], 8: [3], C: [2, 3] }; // 월드 1~2
const MID_DIFF = { 1: [2, 3], 2: [2, 3], 3: [2, 3], 4: [3], 5: [3], 6: [3], 7: [3], 8: [3], C: [3] };     // 월드 3~6
const HARD_DIFF = { 1: [3], 2: [3], 3: [3], 4: [3], 5: [3], 6: [3], 7: [3], 8: [3], C: [3] };            // 월드 8
const MAP_DIFF = { 1: [1, 2], 2: [2], 3: [2, 3], 4: [2, 3], 5: [2, 3], 6: [3], 7: [3], 8: [3], C: [2, 3] }; // 월드 7 (도시 난이도)
const MAP_REGION = { 1: 'kr', 2: 'world', 3: 'kr', 4: 'world', 5: null, 6: 'kr', 7: 'world', 8: null };
const TOTAL_STARS = WORLDS.length * REGULAR.length * 3;

// ───────── 진행 상태 ─────────
const sid = (w, k) => `${w.id}-${k}`;
const cleared = (w, k) => !!save.stages[sid(w, k)];
function unlocked(w, k) {
  const wi = WORLDS.indexOf(w);
  if (k === '1') return wi === 0 || cleared(WORLDS[wi - 1], 'C');
  return cleared(w, PREV[k]);
}
function currentNode() { // 정후가 서 있을 자리: 아직 안 깬 첫 스테이지
  for (const w of WORLDS) for (const k of STAGE_KEYS) if (k !== 'B' && unlocked(w, k) && !cleared(w, k)) return sid(w, k);
  return sid(WORLDS[WORLDS.length - 1], 'C');
}
const totalStars = () => Object.entries(save.stages).filter(([k]) => !k.endsWith('-B')).reduce((s, [, v]) => s + v, 0);
const worldOf = (id) => WORLDS.find((w) => w.id === +id.split('-')[0]);

// ───────── 월드맵 ─────────
const NODE_GAP = 100, WORLD_GAP = 150;
const XS = [70, 80, 64, 44, 24, 20, 36, 58, 76, 52]; // 스테이지별 가로 위치 (%) — 지그재그 길
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
      <button class="press" data-go="badges"><span>🏅</span>배지</button>
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
  // 확대 배율과 상관없이 실제 화면 좌표로 계산해서, 대상이 화면 아래쪽 45% 지점에 오게 스크롤
  const scrollToEl = (el, smooth) => {
    const r = el.getBoundingClientRect();
    window.scrollBy({ top: r.top - innerHeight * 0.55, behavior: smooth && !reduced ? 'smooth' : 'auto' });
  };
  setTimeout(() => scrollToEl(document.getElementById('hero'), false), 0); // show() 가 맨 위로 올린 뒤에
  if (start !== curNode) { // 다음 스테이지로 걸어가기
    const hero = document.getElementById('hero');
    setTimeout(async () => {
      for (let i = 0; i < 3; i++) { sfx('step'); await wait(120); }
      hero.style.left = `${curNode.x}%`; hero.style.top = `${toTop(curNode.y)}px`;
      hero.classList.add('walking');
      scrollToEl($app.querySelector(`[data-node="${cur}"]`), true);
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
  ui.querySelector('[data-go=badges]').onclick = () => { sfx('tap'); goto(badgeRoom); };
}
function goto(render) { $app.classList.remove('on-map'); show(render); }
function toMap(opts) { $app.classList.remove('on-map'); show(() => kingdom(opts)); }

// ───────── 스테이지 ─────────
function stageInfo(w, k) {
  const hard = w.cat === 'mix';
  const base = w.cat === 'map' ? MAP_DIFF : hard ? HARD_DIFF : w.id <= 2 ? STAGE_DIFF : MID_DIFF;
  const diffs = w.cat === 'map' ? base[k] : adaptDiffs(base[k] || [2, 3]); // 지도는 도시 난이도, 나머지는 실력 따라 조정
  const mixNote = CATS[w.cat] ? `${CATS[w.cat].name} 절반 + 여러 주제 섞어서` : '모든 주제 섞어서';
  if (k === 'B' && w.cat === 'map') return { kind: 'bonus', title: `${w.id}-? 보너스`, desc: '🎯 지도 서바이벌! 하트 3개로 도시를 계속 찍어요. 연속으로 가까이 찍으면 점수가 최대 2배!', diffs: [1, 2, 3] };
  if (k === 'B') return { kind: 'bonus', title: `${w.id}-? 보너스`, desc: `45초 스피드 퀴즈! ${mixNote}. 맞힐 때마다 코인을 받아요.`, diffs: adaptDiffs([2]) };
  if (k === 'C') {
    const hp = w.cat === 'map' ? 4500 : hard ? 20 : w.id <= 2 ? 14 : 16; // 크리티컬·필살기가 있어서 약 7~10문제 대결
    return {
      kind: 'boss', title: `${w.id}-🏰 ${w.boss.name}`, diffs, hp,
      desc: w.cat === 'map' ? `도시 위치를 맞혀서 보스의 HP ${hp.toLocaleString()}을 깎아라!`
        : `보스 HP ${hp}! 문제마다 20초 · 하트 3개.<br>⚡ 5초 안에 맞히면 크리티컬(2배) · 3번 맞히면 필살기(+2)<br>HP가 절반이 되면 보스가 화내요!`,
    };
  }
  if (w.cat === 'map') {
    const region = MAP_REGION[k];
    return { kind: 'map', title: `${w.id}-${k}`, desc: `${region === 'kr' ? '🇰🇷 대한민국' : region === 'world' ? '🌍 세계' : '🇰🇷+🌍 섞어서'} 도시 5곳. 평균 300점 이상이면 클리어!`, diffs, region };
  }
  return { kind: 'quiz', title: `${w.id}-${k}`, desc: `문제 8개 (${mixNote} + 🗺️ 지도 찾기 1문제) · 하트 3개. 3번 틀리면 실패!`, diffs };
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
    <p class="ride-note">${rideNote()}</p>
    ${best && info.kind !== 'bonus' ? `<p>최고 기록 ${'⭐'.repeat(best)}${'☆'.repeat(3 - best)}</p>` : ''}
    ${save.run && save.run.id === sid(w, k) ? `<button class="go press" data-v="resume">▶ 하던 데서 이어하기 (${save.run.state.i + 1}번째 문제)</button>` : ''}
    <button class="${save.run && save.run.id === sid(w, k) ? 'ghost' : 'go'} press" data-v="go">${info.kind === 'boss' ? '보스에게 도전! ⚔️' : '출발! 🏁'}</button>
    <button class="ghost press" data-v="no">지도로</button>`);
  if (v === 'resume') resumeRun();
  if (v === 'go') flyTo(() => playStage(w, k));
}

// 지도 문제 n개를 섞어 넣는다 (첫 문제는 피해서)
function withMapQuestions(qs, n, diffs) {
  const region = Math.random() < 0.4 ? 'kr' : 'world';
  const pool = Math.random() < 0.3 && landmarkList(region).length ? landmarkList(region) : cityList(region); // 가끔은 랜드마크
  const cities = drawQuestions(pool, n, diffs.map((d) => Math.min(3, d)));
  const out = qs.slice(0, qs.length - n);
  cities.forEach((c) => out.splice(2 + rnd(Math.max(1, out.length - 1)), 0, mapQuestion(c)));
  return out;
}
function stageQuestions(w, info, n, boss) {
  const base = w.cat === 'mix' || w.cat === 'map' ? mixedQuestions(n, info.diffs) : themedQuestions(w.cat, n, info.diffs); // 월드 주제 절반 + 다른 주제 절반
  if (info.kind === 'bonus') return base;
  return withMapQuestions(base, boss ? 2 : 1, info.diffs); // 🗺️ 지도 찾기가 중간중간 등장
}

// 타고 있는 탈것의 능력을 퀴즈·지도 엔진 설정으로 (core.js RIDES 참고)
function rideAbilities(boss) {
  return {
    revive: rideIs('heli'),                                                   // 🚁 한 번 부활
    rageTimer: rideIs('balloon') ? 20 : 15,                                   // 🎈 화났을 때도 +5초
    gaugeMax: rideIs('rocket') ? 2 : 3, critWindow: rideIs('rocket') ? 8 : 5, // 🚀 로켓 부스터
    startDamage: boss && rideIs('dragon') ? Math.round(boss.hp * 0.2) : 0,     // 🐉 시작 데미지
    specialBonus: rideIs('dragon') ? 2 : 0,                                   // 🐉 필살기 +2
  };
}

// 하던 스테이지 저장/삭제 (이어하기)
const saveRun = (w, k, kind, state) => { save.run = { id: sid(w, k), kind, state }; persist(); };
const clearRun = () => { save.run = null; persist(); keepAwake(false); };

async function playStage(w, k, resume) {
  $app.classList.remove('on-map');
  document.getElementById('ui').innerHTML = '';
  keepAwake(true);
  const info = stageInfo(w, k);
  const quit = () => { keepAwake(false); toMap(); }; // 나가도 save.run 은 남겨서 이어하기 가능
  if (info.kind === 'boss' && !resume) { $app.innerHTML = ''; await vsIntro(w.boss); } // 보스 등장 컷신
  if (info.kind === 'bonus' && w.cat === 'map') {
    return runMap({
      title: `${w.id}-? 지도 서바이벌`, cities: survivalCities(), lives: 3, revive: rideIs('heli'),
      onQuit: quit, onEnd: (r) => { clearRun(); recordSurvival(r); stageResult(w, k, { cleared: true, stars: 1, coins: 0, map: r }); },
    });
  }
  if (info.kind === 'bonus') {
    return runQuiz({
      title: `${w.id}-? 보너스`, qs: stageQuestions(w, info, 80), speed: 45, items: false,
      onQuit: quit, onEnd: (r) => { clearRun(); stageResult(w, k, { ...r, cleared: true, stars: 1 }); },
    });
  }
  if (w.cat === 'map') {
    const cities = resume ? resume.cities : info.kind === 'boss'
      ? drawQuestions(cityList(), 8, info.diffs)
      : drawQuestions(cityList(info.region), 5, info.diffs);
    return runMap({
      title: info.kind === 'boss' ? `🏰 ${w.id}-보스` : `스테이지 ${info.title}`, cities, boss: info.kind === 'boss' ? { ...w.boss, hp: info.hp } : null,
      startDamage: info.kind === 'boss' && rideIs('dragon') ? Math.round(info.hp * 0.2) : 0, // 🐉
      resume, onSnapshot: (s) => saveRun(w, k, 'map', s),
      onQuit: quit,
      onEnd: (r) => {
        clearRun();
        const avg = r.total / Math.max(1, r.log.length);
        const s = info.kind === 'boss' ? (r.cleared ? (avg >= 700 ? 3 : avg >= 600 ? 2 : 1) : 0) : avg >= 700 ? 3 : avg >= 500 ? 2 : avg >= 300 ? 1 : 0;
        stageResult(w, k, { cleared: s > 0, stars: s, coins: 0, map: r });
      },
    });
  }
  const boss = info.kind === 'boss' ? { ...w.boss, hp: info.hp } : null;
  runQuiz({
    title: boss ? `🏰 ${w.id}-보스` : `스테이지 ${info.title}`,
    qs: resume ? resume.qs : stageQuestions(w, info, boss ? info.hp + 6 : 8, !!boss),
    hearts: 3, boss, timer: boss ? (rideIs('balloon') ? 25 : 20) : null, // 🎈 +5초
    events: true, // 🌟 깜짝 이벤트
    ...rideAbilities(boss),
    resume, onSnapshot: (s) => saveRun(w, k, 'quiz', s),
    onQuit: quit,
    onEnd: (r) => {
      clearRun();
      const s = !r.cleared ? 0 : boss ? r.heartsLeft : Math.max(1, 3 - r.wrong);
      stageResult(w, k, { ...r, stars: s });
    },
  });
}
// 지도 서바이벌용 도시 순서: 쉬운 곳부터 점점 어렵게 (세계·한국 섞어서)
function survivalCities() {
  const all = cityList();
  return [...drawQuestions(all, 8, [1]), ...drawQuestions(all, 16, [2]), ...drawQuestions(all, 60, [3])];
}
function recordSurvival(r) {
  const best = r.total > save.survivalBest;
  if (best) { save.survivalBest = r.total; persist(); }
  return best;
}
function resumeRun() {
  const run = save.run;
  if (!run) return;
  const w = worldOf(run.id), k = run.id.split('-')[1];
  flyTo(() => playStage(w, k, run.state));
}
// 깬 뒤 바로 이어서 할 다음 스테이지 (보너스는 건너뜀)
function nextStageOf(w, k) {
  const i = STAGE_KEYS.indexOf(k);
  for (let j = i + 1; j < STAGE_KEYS.length; j++) if (STAGE_KEYS[j] !== 'B') return { w, k: STAGE_KEYS[j] };
  return null;
}

async function stageResult(w, k, r) {
  const id = sid(w, k);
  const info = stageInfo(w, k);
  const firstClear = r.cleared && !save.stages[id];
  const prevStars = save.stages[id] || 0;
  const beforeCur = currentNode();
  if (r.cleared) save.stages[id] = Math.max(prevStars, r.stars);
  let bonus = 0;
  if (r.cleared) bonus = info.kind === 'bonus' ? 0 : 5 + r.stars * 2 + (firstClear ? 10 : 0) + (rideIs('plane') ? 3 : 0); // 🛩️ 알뜰 비행
  if (info.kind === 'bonus') { save.speedBest = Math.max(save.speedBest, r.correct); }
  if (info.kind === 'boss' && r.cleared) save.bosses++;
  if (info.kind === 'boss' && r.cleared && !r.map && r.heartsLeft === 3) save.ach.nohit++; // 🏅 노히트
  bonus = addCoins(bonus); // 🏴‍☠️ 해적선이면 1.5배로 들어옴
  persist();
  // 일반 스테이지를 깼으면 지도로 안 돌아가고 바로 다음 스테이지로 갈 수 있다 (보스 성 직전까지)
  const nx = r.cleared && info.kind !== 'boss' && info.kind !== 'bonus' ? nextStageOf(w, k) : null;
  const quickNext = nx && nx.k !== 'C' && unlocked(nx.w, nx.k) ? nx : null;
  // 🎮 가끔(35%) 쉬어 가는 미니게임
  const breakGame = r.cleared && info.kind !== 'boss' && info.kind !== 'bonus' && Math.random() < 0.35 ? pick(Object.keys(MINIGAMES)) : null;

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
      ${r.cleared ? '' : `<p class="hint">${info.kind === 'map' ? '평균 300점을 넘으면 클리어!' : '상점에서 ❤️ 하트나 🛡️ 방패 아이템을 사 가면 쉬워져요.'}</p>`}
      ${breakGame ? `<button class="mini-offer press" data-a="mini"><span>🎮 쉬어 가기 미니게임!</span>${MINIGAMES[breakGame].ic} ${MINIGAMES[breakGame].name}</button>` : ''}
      ${quickNext ? `<button class="go press" data-a="quick">다음 스테이지 ${quickNext.w.id}-${quickNext.k} ▶</button>` : ''}
      <button class="${quickNext ? 'ghost' : 'go'} press" data-a="${r.cleared ? 'next' : 'retry'}">${r.cleared ? '지도로 🗺️' : '다시 도전! 🔁'}</button>
      <button class="ghost press" data-a="${r.cleared ? 'retry' : 'map'}">${r.cleared ? '한 번 더 하기 🔁' : '지도로'}</button>
      ${r.qs && r.results ? wrongReview(r) : ''}
    </div>`;
  if (r.cleared) {
    sfx('clear');
    if (!reduced) [1, 2, 3].forEach((i) => i <= r.stars && setTimeout(() => sfx('coin'), 300 + i * 250 + 100));
    setTimeout(() => confetti(r.stars === 3 ? 140 : 70), 350);
    if (info.kind !== 'bonus') setTimeout(() => sikseven($app.querySelector('.result-screen > .who')), 900);
  } else sfx('fail');
  setTimeout(checkBadges, 1200); // 결과 화면이 뜬 뒤에 배지 알림

  const again = () => flyTo(() => playStage(w, k));
  $app.querySelector('[data-a=quick]')?.addEventListener('click', () => { sfx('tap'); flyTo(() => playStage(quickNext.w, quickNext.k)); });
  $app.querySelector('[data-a=mini]')?.addEventListener('click', () => {
    sfx('power');
    flyTo(() => MINIGAMES[breakGame].run({ onQuit: () => toMap({ from: beforeCur }), onEnd: (m) => breakResult(m, quickNext, beforeCur) }));
  });
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
// 스테이지 사이 미니게임을 끝낸 뒤
function breakResult(m, next, from) {
  $app.innerHTML = `<div class="result-screen">
      <h1 class="result-title">${m.title}</h1>
      ${JH.correct()}
      <p>${m.sub}</p>
      <div class="coinline">🪙 +${m.coins}</div>
      ${next ? `<button class="go press" data-a="quick">다음 스테이지 ${next.w.id}-${next.k} ▶</button>` : ''}
      <button class="${next ? 'ghost' : 'go'} press" data-a="map">지도로 🗺️</button>
    </div>`;
  $app.querySelector('[data-a=quick]')?.addEventListener('click', () => { sfx('tap'); flyTo(() => playStage(next.w, next.k)); });
  $app.querySelector('[data-a=map]').onclick = () => { sfx('tap'); toMap({ from }); };
  setTimeout(checkBadges, 800);
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
  await modal(`${JH.king()}<h2>👑 퀴즈왕 등극!</h2><p>${charJosa('이', '가')} 모르쇠 대왕을 물리치고 왕국의 지식 별을 모두 되찾았어요!<br>이제 ${charJosa('은', '는')} <b>퀴즈 왕국의 퀴즈왕</b>!</p><p class="hint">별 3개를 전부 모으는 것에도 도전해 봐! (⭐ ${totalStars()}/${TOTAL_STARS})</p><button class="go press" data-v="ok">만세! 🎉</button>`, { close: false });
}

// ───────── 타이틀 ─────────
function title() {
  $app.classList.remove('on-map');
  const run = save.run;
  const runLabel = run ? (() => {
    const w = worldOf(run.id), k = run.id.split('-')[1];
    const n = run.state.qs ? run.state.qs.length : run.state.cities.length;
    return `${k === 'C' ? `🏰 ${w.id}-보스` : `스테이지 ${run.id}`} (${run.state.i + 1}/${n}번째 문제부터)`;
  })() : '';
  const started = Object.keys(save.stages).length || run;
  $app.innerHTML = `
    <div class="title-screen">
      <div class="logo"><small>JEONGHU'S QUIZ KINGDOM</small><h1>정후의<br><b>퀴즈 왕국</b></h1></div>
      <div class="title-hero">${save.bosses >= WORLDS.length ? JH.king() : JH.wave()}<span class="ride big">${rideIcon()}</span></div>
      ${run ? `<button class="go press big" data-resume>▶ 이어하기<small>${runLabel}</small></button>` : ''}
      <button class="${run ? 'ghost' : 'go big'} press" data-start>${started ? '🗺️ 왕국 지도로' : '모험 시작! ▶'}</button>
      <div class="title-row">
        <button class="ghost press" data-badges>🏅 배지<small>${Object.keys(save.badges).length} / ${BADGES.length}</small></button>
        <button class="ghost press" data-versus>⚔️ 2인 대전<small>지금: ${charName()}</small></button>
      </div>
      <p class="hint">⭐ ${totalStars()}/${TOTAL_STARS} · 🪙 ${save.coins.toLocaleString()} · Lv.${levelOf(save.xp).lv} ${rankOf(levelOf(save.xp).lv)}</p>
      ${started ? '<button class="linkbtn" data-restart>처음부터 다시하기</button>' : ''}
      ${AppP ? '<div class="updline" id="updline"></div>' : ''}
      ${STORAGE_OK ? '' : '<p class="warnbox">⚠️ 이 브라우저에서는 기록이 저장되지 않아요.<br>Chrome이나 삼성 인터넷에서 열고, 홈 화면에 추가해서 써 주세요.</p>'}
    </div>`;
  $app.querySelector('[data-resume]')?.addEventListener('click', () => { sfx('power'); resumeRun(); });
  $app.querySelector('[data-versus]').onclick = () => { sfx('tap'); show(versusMenu); };
  $app.querySelector('[data-badges]').onclick = () => { sfx('tap'); show(badgeRoom); };
  if (typeof paintUpd === 'function') paintUpd(); // 앱 버전 줄 (js/update.js)
  $app.querySelector('[data-restart]')?.addEventListener('click', async () => {
    const v = await modal('<h2>처음부터 다시할까?</h2><p>별, 코인, 아이템, 레벨이 전부 사라지고 월드 1부터 다시 시작해요. 되돌릴 수 없어요!</p><button class="go press" data-v="no">아니, 계속할래</button><button class="ghost press" data-v="yes">처음부터 다시하기</button>');
    if (v !== 'yes') return;
    try { localStorage.removeItem(STORE_KEY); } catch (e) { /* 무시 */ }
    location.reload();
  });
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
      <div class="label">🛩️ 탈것 (지도에서 함께 다녀요)</div>
      <div class="shop-grid">${Object.entries(RIDES).map(([k, r]) => {
        const own = save.rides.includes(k), on = save.ride === k;
        return `<div class="shop-item card ${on ? 'on' : ''}"><span class="big">${r.ic}</span><b>${r.name}</b><small class="ab">✨ ${r.ab}</small><small>${r.desc}</small>
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
      toast(`${r.ic} ${r.name} 획득!`); draw(); checkBadges();
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
      ${t('landmark', '세계 랜드마크 찾기', '🗽', 'icon-landmark', '에펠탑·피라미드·경복궁은 어디?', '#ff8f3d', true)}
      ${t('survival', '지도 서바이벌', '🎯', 'icon-map', `하트 3개로 어디까지? 최고 ${save.survivalBest.toLocaleString()}점`, '#ff6b6b')}
      ${t('shape', '나라 모양 맞히기', '🧩', 'icon-capital', `실루엣만 보고! 최고 ${save.shapeBest}연속`, '#1f2a5a')}
      ${t('bell', '도전! 골든벨', '🔔', 'icon-bell', `50문제, 틀리면 끝! 최고 ${save.bellBest}문제${save.bellWins ? ` · 🔔×${save.bellWins}` : ''}`, '#ffb000', true)}
      ${t('memo', '국기 짝맞추기', '🃏', 'icon-memo', '국기와 나라 이름 짝 찾기', '#ff8fb1')}
      ${t('puzzle', '지도 퍼즐', '🗺️', 'icon-puzzle', '이웃 나라 5곳을 제자리에', '#3ddc97')}
      ${t('rush', '숫자 빨리 누르기', '⚡', 'icon-rush', `혼자 또는 둘이! ${save.rushBest[16] ? `최고 ${save.rushBest[16]}초` : '1부터 순서대로'}`, '#4fb3ff')}
      ${Object.entries(CATS).map(([k, c]) => t(k, c.name, c.ic, c.icon, `${countFor(k)}문제`, c.c)).join('')}
      ${t('mix', '전부 섞기', '🌏', 'icon-mix', '모든 주제에서', '#4fb3ff')}
      ${t('wrong', '오답 노트', '📒', 'icon-wrongnote', `${save.wrong.length}개`, '#ff6b6b')}
    </div>`;
  bindBack(() => toMap());
  $app.querySelectorAll('[data-free]').forEach((b) => (b.onclick = () => {
    sfx('tap');
    const k = b.dataset.free;
    if (k === 'map') return show(() => freeMapSetup(false));
    if (k === 'landmark') return show(() => freeMapSetup(true));
    if (k === 'bell') return flyTo(goldenBell);
    if (k === 'rush') return show(() => rushSetup(freeMenu));
    if (MINIGAMES[k]) {
      const start = () => MINIGAMES[k].run({ onQuit: () => show(freeMenu), onEnd: (r) => freeResult({ ...r, good: true, again: start }) });
      return flyTo(start);
    }
    if (k === 'survival') {
      const start = () => runMap({
        title: '🎯 지도 서바이벌', cities: survivalCities(), lives: 3, revive: rideIs('heli'), onQuit: () => show(freeMenu),
        onEnd: (r) => {
          const best = recordSurvival(r);
          freeResult({ correct: 0, total: 0, coins: 0, title: `${r.total.toLocaleString()}점!`, sub: `도시 ${r.log.length}곳 · 최고 ${r.bestStreak}연속${best ? ' · 🎉 새 최고 기록!' : ` · 최고 기록 ${save.survivalBest.toLocaleString()}점`}`, again: start });
        },
      });
      return flyTo(start);
    }
    if (k === 'shape') {
      // 나라 모양만 연속으로. 하트 3개, 틀리면 끝나는 도전
      const pool = questionsFor('capital').filter((q) => q.shape);
      const qs = [...drawQuestions(pool, 8, [2]), ...drawQuestions(pool, 40, [3])];
      const start = () => runQuiz({
        title: '🧩 나라 모양 맞히기', qs, hearts: 3, onQuit: () => show(freeMenu),
        onEnd: (r) => {
          const streak = r.maxStreak, best = streak > save.shapeBest;
          save.shapeBest = Math.max(save.shapeBest, streak); persist();
          freeResult({ ...r, title: `${r.correct}개 맞혔어!`, sub: `최고 ${streak}연속${best ? ' · 🎉 새 기록!' : ` · 최고 기록 ${save.shapeBest}연속`}`, again: () => b.click() });
        },
      });
      return flyTo(start);
    }
    if (k === 'speed') return flyTo(() => runQuiz({
      title: '⚡ 스피드 챌린지', qs: mixedQuestions(150, [1, 2]), speed: 60, items: false,
      onQuit: () => show(freeMenu),
      onEnd: (r) => { const best = r.correct > save.speedBest; save.speedBest = Math.max(save.speedBest, r.correct); persist(); freeResult({ ...r, title: `60초 동안 ${r.correct}개 정답!`, sub: best ? '🎉 새 최고 기록!' : `최고 기록 ${save.speedBest}개`, again: () => b.click() }); },
    }));
    if (k === 'wrong') {
      if (!save.wrong.length) return toast('아직 틀린 문제가 없어요! 👍');
      return flyTo(() => runQuiz({
        title: '📒 오답 노트', qs: shuffle(save.wrong).slice(0, 10), hearts: null,
        onWrongFixed: (q) => { save.wrong = save.wrong.filter((w) => w.k !== q.k); save.ach.fixed++; },
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
        title: `${c.ic} ${c.name}`, qs: cat === 'mix' ? mixedQuestions(count, diff) : drawQuestions(questionsFor(cat), count, diff), hearts: null, events: true,
        onQuit: () => show(freeMenu), onEnd: (r) => freeResult({ ...r, again: start }),
      });
      flyTo(start);
    };
  };
  draw();
}
function freeResult(r) {
  const pct = r.total ? r.correct / r.total : 0;
  const good = r.good ?? pct >= 0.7;
  $app.innerHTML = `<div class="result-screen">
      <h1 class="result-title">${r.title || `${r.total}문제 중 ${r.correct}개 정답`}</h1>
      ${good ? JH.correct() : JH.wrong()}
      <p>${r.sub || (pct === 1 ? '완벽해! 만점이야!' : pct >= 0.7 ? '잘했어!' : '다음엔 더 잘할 수 있어!')}</p>
      <div class="coinline">🪙 +${r.coins || 0}</div>
      <button class="go press" data-a="again">한 번 더! 🔁</button>
      <button class="ghost press" data-a="menu">자유 여행 메뉴로</button>
      ${r.qs ? wrongReview(r) : ''}
    </div>`;
  if (pct >= 0.8) { sfx('clear'); confetti(); }
  setTimeout(checkBadges, 800);
  $app.querySelector('[data-a=again]').onclick = () => { sfx('tap'); flyTo(r.again); };
  $app.querySelector('[data-a=menu]').onclick = () => { sfx('tap'); show(freeMenu); };
}
// ───────── 🔔 도전! 골든벨 ─────────
// 모든 주제에서 50문제, 점점 어려워진다. 하트 1개(틀리면 끝)지만 딱 한 번 패자부활전 기회가 있다.
function goldenBell() {
  const seen = new Set();
  const uniq = (list) => list.filter((q) => !seen.has(q.k) && seen.add(q.k));
  const qs = [...uniq(mixedQuestions(15, [2])), ...uniq(mixedQuestions(20, [2, 3])), ...uniq(mixedQuestions(15, [3]))];
  const TOTAL = qs.length;
  let solved = 0, coins = 0, revived = false;

  const finish = (won) => {
    const best = solved > save.bellBest;
    save.bellBest = Math.max(save.bellBest, solved);
    let prize = 0;
    if (won) { save.bellWins++; prize = addCoins(100); }
    persist();
    if (won) celebrate('🔔 골든벨을 울렸다!', `${TOTAL}문제를 전부 통과했어요!<br>${charJosa('이', '가')} 오늘의 골든벨 주인공! 🪙 +${prize}`);
    freeResult({
      good: won || best, correct: solved, total: TOTAL, coins: coins + prize, again: goldenBell,
      title: won ? '🔔 골든벨을 울렸다!' : `${solved}문제 통과!`,
      sub: won ? '완벽해! 진짜 퀴즈왕!' : best ? '🎉 새 최고 기록!' : `최고 기록 ${save.bellBest}문제`,
    });
  };
  const run = (from) => runQuiz({
    title: '🔔 도전! 골든벨', qs: qs.slice(from), hearts: 1, items: false, bell: { start: from + 1, total: TOTAL }, events: true,
    onQuit: () => show(freeMenu),
    onEnd: async (r) => {
      solved += r.correct; coins += r.coins;
      if (r.cleared) return finish(true);
      if (revived) return finish(false);
      const next = from + r.total; // 틀린 문제 다음부터
      const v = await modal(`<div class="upd-ic">🔔</div><h2>패자부활전!</h2><p>어려운 문제 하나를 맞히면 다시 살아나요.<br>기회는 딱 한 번!</p><button class="go press" data-v="go">도전! 💪</button><button class="ghost press" data-v="no">여기까지 할래</button>`, { close: false });
      if (v !== 'go') return finish(false);
      revived = true;
      const rq = mixedQuestions(6, [3]).find((q) => !seen.has(q.k)) || mixedQuestions(1, [3])[0];
      flyTo(() => runQuiz({
        title: '🔔 패자부활전', qs: [rq], hearts: null, items: false, onQuit: () => show(freeMenu),
        onEnd: (r2) => {
          if (!r2.correct) return finish(false);
          solved += 1; coins += r2.coins;
          if (next >= TOTAL) return finish(true);
          toast('🔔 부활! 다시 도전!'); sfx('power');
          flyTo(() => run(next));
        },
      }));
    },
  });
  run(0);
}

// lm: true 면 🗽 랜드마크 찾기 (data/landmarks.js), 아니면 도시 찾기
function freeMapSetup(lm = false) {
  let region = 'world', diff = 0;
  const list = (r) => (lm ? landmarkList(r) : cityList(r));
  const bestKey = (r) => (lm ? `lm-${r}` : r);
  const what = lm ? '랜드마크' : '도시';
  const draw = () => {
    const n = list(region).filter((c) => !diff || c.d === diff).length;
    $app.innerHTML = `${topBar('탑승 준비')}
      <div class="setup-hero card">${lm ? '<span class="art ph">🗽</span>' : JH.explorer()}<div><b>${lm ? '세계 랜드마크 찾기' : '지도에서 도시 찾기'}</b><span>${lm ? '에펠탑, 피라미드, 경복궁…! 어디 있는지 지도에서 톡! 누르고 [확인]. 맞히면 재미있는 이야기도 알려 줘요.' : '도시 위치를 톡! 누르고 [확인]. 가까울수록 점수가 높아요 (한 도시 최대 1000점).'}</span></div></div>
      <div class="label">지도</div>
      <div class="opts">${Object.entries(REGIONS).map(([k, r]) => `<button class="opt press ${k === region ? 'on' : ''}" data-r="${k}">${r.ic} ${r.name}</button>`).join('')}</div>
      <div class="label">난이도</div>
      <div class="opts">${[0, 1, 2, 3].map((d) => `<button class="opt press ${d === diff ? 'on' : ''}" data-d="${d}">${d ? stars(d) + ' ' : ''}${DIFF_NAME[d]}</button>`).join('')}</div>
      <p class="hint">${what} ${n}곳 · 최고 점수 ${(save.mapBest[bestKey(region)] || 0).toLocaleString()}</p>
      <button class="go press">출발! 🛫</button>`;
    bindBack(() => show(freeMenu));
    $app.querySelectorAll('[data-r]').forEach((b) => (b.onclick = () => { sfx('tap'); region = b.dataset.r; draw(); }));
    $app.querySelectorAll('[data-d]').forEach((b) => (b.onclick = () => { sfx('tap'); diff = +b.dataset.d; draw(); }));
    $app.querySelector('.go').onclick = () => {
      const key = bestKey(region);
      const start = () => runMap({
        title: `${lm ? '🗽' : REGIONS[region].ic} ${REGIONS[region].name} ${lm ? '랜드마크' : '지도'}`, cities: drawQuestions(list(region), 10, diff),
        onQuit: () => show(freeMenu),
        onEnd: (r) => {
          const best = r.total > (save.mapBest[key] || 0);
          if (best) { save.mapBest[key] = r.total; }
          if (lm) save.ach.land = (save.ach.land || 0) + r.log.filter((x) => x.pts >= 600).length; // 🏅 세계 여행가
          persist();
          freeResult({ correct: 0, total: 0, coins: 0, good: r.total >= 5000, title: `${r.total.toLocaleString()}점`, sub: best ? '🎉 새 최고 기록!' : `최고 기록 ${(save.mapBest[key] || 0).toLocaleString()}점`, again: start });
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
    return `<div><span>${w.ic} ${w.id}. ${w.name}</span><b>${cleared(w, 'C') ? '🏳️ ' : ''}⭐ ${s}/${REGULAR.length * 3}</b></div>`;
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
      <div><span>🎯 지도 서바이벌 최고</span><b>${save.survivalBest.toLocaleString()}점</b></div>
      <div><span>🧩 나라 모양 최고</span><b>${save.shapeBest}연속</b></div>
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
