// 개발용 반응형 점검 (배포되지 않음). 브라우저 콘솔에서:
//   await import('/tools/responsive-audit.js'); await audit()
// 모든 화면을 차례로 띄우고, 화면 밖으로 넘치거나 글자가 잘리는 요소를 찾아낸다.
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const SCREENS = {
  title: () => title(),
  map: () => toMap(),
  intro: async () => { toMap(); await wait(300); stageIntro(WORLDS[0], '1'); },
  quiz: () => playStage(WORLDS[2], '1'),
  flagQuiz: () => { document.getElementById('ui').innerHTML = ''; runQuiz({ title: '🚩 국기', qs: flagQuestions().filter((q) => q.flags).slice(0, 3), hearts: 3, onEnd() {}, onQuit() {} }); },
  cut: async () => { playStage(WORLDS[7], 'C'); await wait(2600); },
  vs: async () => { playStage(WORLDS[7], 'C'); await wait(4300); },
  quizMap: () => { document.getElementById('ui').innerHTML = ''; runQuiz({ title: '스테이지 1-1', qs: [mapQuestion(cityList('world')[0])], hearts: 3, onEnd() {}, onQuit() {} }); },
  titleResume: () => { save.run = { id: '3-2', kind: 'quiz', state: { i: 5, qs: Array(8).fill({}) } }; title(); },
  boss: async () => { playStage(WORLDS[7], 'C'); await wait(7000); },
  mapBoss: async () => { playStage(WORLDS[6], 'C'); await wait(7000); },
  speed: () => playStage(WORLDS[1], 'B'),
  mapGame: () => playStage(WORLDS[6], '1'),
  result: () => stageResult(WORLDS[2], '2', { cleared: true, stars: 3, correct: 8, wrong: 0, total: 8, coins: 12, maxStreak: 8, qs: [], results: [] }),
  shop: () => goto(shop),
  free: () => goto(freeMenu),
  freeSetup: () => show(() => freeSetup('history')),
  stats: () => goto(stats),
};
const SKIP = '.cut-warn, .flyby, .deco, canvas, svg *, .band, .fog, .kingdom, .road, .toast, .floaty';

function check() {
  const W = innerWidth, issues = [];
  if (document.documentElement.scrollWidth > W + 1) issues.push(`가로 스크롤 생김 (문서 폭 ${document.documentElement.scrollWidth} > ${W})`);
  for (const el of document.querySelectorAll('body *')) {
    if (el.closest(SKIP) || !el.getClientRects().length) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0) continue;
    const name = `${el.tagName.toLowerCase()}.${[...el.classList].join('.')} "${(el.textContent || '').trim().slice(0, 18)}"`;
    if (r.right > W + 1 || r.left < -1) issues.push(`화면 밖: ${name} (${Math.round(r.left)}~${Math.round(r.right)})`);
    const cs = getComputedStyle(el);
    if (['BUTTON', 'SPAN', 'B', 'DIV', 'H1', 'H2'].includes(el.tagName) && el.children.length === 0 && el.scrollWidth > el.clientWidth + 2 && cs.overflow !== 'visible') {
      issues.push(`글자 잘림: ${name}`);
    }
  }
  // 고정 HUD/메뉴가 서로 겹치는지
  const fixed = [...document.querySelectorAll('.hud > *, .dock > *')].map((e) => e.getBoundingClientRect());
  for (let i = 0; i < fixed.length; i++) for (let j = i + 1; j < fixed.length; j++) {
    const a = fixed[i], b = fixed[j];
    if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) issues.push('HUD/메뉴 버튼끼리 겹침');
  }
  return [...new Set(issues)].slice(0, 12);
}

window.audit = async (only) => {
  const out = {};
  // 애니메이션 중간 상태(옆에서 미끄러져 들어오는 중 등)를 잘못 재지 않도록 끈다
  if (!document.getElementById('audit-still')) document.head.insertAdjacentHTML('beforeend', '<style id="audit-still">*,*::before,*::after{animation:none!important;transition:none!important}</style>');
  for (const [name, fn] of Object.entries(SCREENS)) {
    if (only && !only.includes(name)) continue;
    document.querySelectorAll('.overlay').forEach((o) => o.remove());
    await fn();
    await wait(name === 'result' ? 1600 : 700);
    const found = check();
    if (found.length) out[name] = found;
  }
  document.querySelectorAll('.overlay').forEach((o) => o.remove());
  return { size: `${innerWidth}x${innerHeight}`, ok: !Object.keys(out).length, issues: out };
};
