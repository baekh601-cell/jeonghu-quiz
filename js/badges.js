'use strict';
// 도전 과제 배지: 조건을 채우면 배지와 코인을 준다. 획득한 배지는 save.badges { id: 획득 시각 }.
// 판정은 checkBadges() 한 곳에서 save 상태만 보고 한다. 문제를 풀 때·결과 화면·화면 전환 때 불린다.
// 수도·국기처럼 "어떤 나라를 맞혔는지"가 필요한 것은 save.ach 에 따로 모은다 (noteAnswer).

save.badges = save.badges || {};
save.ach = { caps: {}, flags: {}, bull: 0, crit: 0, fever: 0, fixed: 0, nohit: 0, gold: 0, memo: 0, puzzle: 0, ...(save.ach || {}) };
save.bellBest = save.bellBest || 0; // 골든벨 최고 기록 (맞힌 문제 수)
save.bellWins = save.bellWins || 0; // 골든벨을 울린 횟수

const TIER = { // 등급별 보상 코인과 테두리 색
  b: { name: '브론즈', coins: 10, c: '#d08a4c' },
  s: { name: '실버', coins: 30, c: '#9fb3c8' },
  g: { name: '골드', coins: 80, c: '#ffc21a' },
  r: { name: '레전드', coins: 200, c: '#b57cff' },
};

// 수도 문제가 나오는 나라 (수도 이름이 나라 이름과 같은 싱가포르 같은 곳은 문제가 없으니 제외 — countryQuestions 와 같은 기준)
const firstWord = (s) => s.replace(/ .*/, '');
const capCountries = (cont) => COUNTRIES.filter((c) => c.c && firstWord(c.c) !== firstWord(c.n) && (!cont || c.cont === cont));
const flagCountries = () => COUNTRIES.filter((c) => c.f);
const count = (obj, list) => list.filter((c) => obj[c.iso]).length;
const okIn = (cat) => (save.perCat[cat] || { ok: 0 }).ok;

// p(): [지금, 목표]  — 목표 이상이면 획득
const capBadge = (id, cont, ic, name) => ({ id, ic, name, t: 'g', sec: 'geo', desc: `${cont} 나라 수도를 전부 맞히기`, p: () => [count(save.ach.caps, capCountries(cont)), capCountries(cont).length] });
const BADGES = [
  // 기본
  { id: 'first', ic: '👣', name: '첫걸음', t: 'b', sec: 'basic', desc: '첫 정답!', p: () => [save.correct, 1] },
  { id: 'c100', ic: '💯', name: '100문제 정답', t: 'b', sec: 'basic', desc: '정답 100개', p: () => [save.correct, 100] },
  { id: 'c500', ic: '📚', name: '지식 창고', t: 's', sec: 'basic', desc: '정답 500개', p: () => [save.correct, 500] },
  { id: 'c1500', ic: '🧠', name: '걸어다니는 백과사전', t: 'g', sec: 'basic', desc: '정답 1,500개', p: () => [save.correct, 1500] },
  { id: 's10', ic: '🔥', name: '10연속', t: 'b', sec: 'basic', desc: '한 번도 안 틀리고 10문제 연속 정답', p: () => [save.bestStreak, 10] },
  { id: 's20', ic: '☄️', name: '20연속', t: 's', sec: 'basic', desc: '20문제 연속 정답', p: () => [save.bestStreak, 20] },
  { id: 's40', ic: '🌋', name: '멈출 수 없어', t: 'g', sec: 'basic', desc: '40문제 연속 정답', p: () => [save.bestStreak, 40] },
  { id: 'fever', ic: '🤲', name: '식세븐 장인', t: 's', sec: 'basic', desc: '피버 타임(5연속) 20번', p: () => [save.ach.fever, 20] },
  { id: 'lv10', ic: '🎖️', name: '레벨 10', t: 's', sec: 'basic', desc: 'Lv.10 달성', p: () => [levelOf(save.xp).lv, 10] },
  { id: 'lv20', ic: '👑', name: '레벨 20', t: 'g', sec: 'basic', desc: 'Lv.20 달성', p: () => [levelOf(save.xp).lv, 20] },
  // 세계 지리·국기
  { id: 'cap50', ic: '🏛️', name: '수도 50', t: 's', sec: 'geo', desc: '서로 다른 나라 수도 50곳 맞히기', p: () => [count(save.ach.caps, capCountries()), 50] },
  capBadge('capAS', '아시아', '🐼', '아시아 수도 마스터'),
  capBadge('capEU', '유럽', '🏰', '유럽 수도 마스터'),
  capBadge('capAF', '아프리카', '🦁', '아프리카 수도 마스터'),
  capBadge('capNA', '북아메리카', '🗽', '북아메리카 수도 마스터'),
  capBadge('capSA', '남아메리카', '🦙', '남아메리카 수도 마스터'),
  capBadge('capOC', '오세아니아', '🦘', '오세아니아 수도 마스터'),
  { id: 'capAll', ic: '🌐', name: '세계 수도 정복', t: 'r', sec: 'geo', desc: '모든 나라 수도 맞히기', p: () => [count(save.ach.caps, capCountries()), capCountries().length] },
  { id: 'fl30', ic: '🚩', name: '국기 30', t: 'b', sec: 'geo', desc: '서로 다른 나라 국기 30개 맞히기', p: () => [count(save.ach.flags, flagCountries()), 30] },
  { id: 'fl100', ic: '🎌', name: '국기 100', t: 's', sec: 'geo', desc: '서로 다른 나라 국기 100개 맞히기', p: () => [count(save.ach.flags, flagCountries()), 100] },
  { id: 'flAll', ic: '🏁', name: '국기 박사', t: 'r', sec: 'geo', desc: '모든 나라 국기 맞히기', p: () => [count(save.ach.flags, flagCountries()), flagCountries().length] },
  { id: 'shape10', ic: '🧩', name: '실루엣 탐정', t: 's', sec: 'geo', desc: '나라 모양 맞히기 10연속', p: () => [save.shapeBest, 10] },
  // 지도
  { id: 'bull1', ic: '🎯', name: '명사수', t: 'b', sec: 'map', desc: '지도 문제에서 900점 이상', p: () => [save.ach.bull, 1] },
  { id: 'bull20', ic: '🛰️', name: '인간 GPS', t: 's', sec: 'map', desc: '지도 900점 이상 20번', p: () => [save.ach.bull, 20] },
  { id: 'bull100', ic: '🧭', name: '살아 있는 지도', t: 'g', sec: 'map', desc: '지도 900점 이상 100번', p: () => [save.ach.bull, 100] },
  { id: 'land30', ic: '🗽', name: '세계 여행가', t: 's', sec: 'map', desc: '랜드마크 찾기에서 600점 이상 30번', p: () => [save.ach.land || 0, 30] },
  { id: 'surv5k', ic: '🏃', name: '서바이벌 5천', t: 's', sec: 'map', desc: '지도 서바이벌 5,000점', p: () => [save.survivalBest, 5000] },
  { id: 'surv15k', ic: '🦸', name: '서바이벌 전설', t: 'g', sec: 'map', desc: '지도 서바이벌 15,000점', p: () => [save.survivalBest, 15000] },
  // 주제 박사
  { id: 'catCap', ic: '🗺️', name: '지리 탐험가', t: 's', sec: 'cat', desc: '세계 지리 정답 100개', p: () => [okIn('capital'), 100] },
  { id: 'catFlag', ic: '🏳️', name: '깃발 수집가', t: 's', sec: 'cat', desc: '국기 정답 100개', p: () => [okIn('flag'), 100] },
  { id: 'catHis', ic: '📜', name: '역사 박사', t: 's', sec: 'cat', desc: '역사 정답 100개', p: () => [okIn('history'), 100] },
  { id: 'catSci', ic: '🔬', name: '꼬마 과학자', t: 's', sec: 'cat', desc: '과학 상식 정답 100개', p: () => [okIn('science'), 100] },
  { id: 'catKbo', ic: '⚾', name: '야구 해설위원', t: 's', sec: 'cat', desc: '프로야구 정답 100개', p: () => [okIn('kbo'), 100] },
  { id: 'catNon', ic: '🤪', name: '넌센스 왕', t: 's', sec: 'cat', desc: '넌센스 정답 100개', p: () => [okIn('nonsense'), 100] },
  { id: 'catSam', ic: '🏹', name: '삼국지 군사', t: 's', sec: 'cat', desc: '삼국지 정답 100개', p: () => [okIn('samguk'), 100] },
  { id: 'catMc', ic: '⛏️', name: '마크 박사', t: 's', sec: 'cat', desc: '마인크래프트 정답 100개', p: () => [okIn('minecraft'), 100] },
  { id: 'fixed', ic: '📒', name: '오답 정복자', t: 's', sec: 'cat', desc: '오답 노트에서 30문제 다시 맞히기', p: () => [save.ach.fixed, 30] },
  // 보스·도전
  { id: 'boss1', ic: '⚔️', name: '첫 보스 격파', t: 'b', sec: 'boss', desc: '보스를 한 번 쓰러뜨리기', p: () => [save.bosses, 1] },
  { id: 'nohit', ic: '🛡️', name: '노히트 보스전', t: 's', sec: 'boss', desc: '하트를 하나도 안 잃고 보스 격파', p: () => [save.ach.nohit, 1] },
  { id: 'crit30', ic: '⚡', name: '번개 손', t: 's', sec: 'boss', desc: '보스전 크리티컬(빨리 맞히기) 30번', p: () => [save.ach.crit, 30] },
  { id: 'speed15', ic: '⏱️', name: '스피드 15', t: 'b', sec: 'boss', desc: '스피드 챌린지 15개 이상', p: () => [save.speedBest, 15] },
  { id: 'speed25', ic: '🚀', name: '스피드 25', t: 's', sec: 'boss', desc: '스피드 챌린지 25개 이상', p: () => [save.speedBest, 25] },
  { id: 'castles', ic: '🏳️', name: '왕국 해방', t: 'g', sec: 'boss', desc: '8개 월드의 성을 모두 깨기', p: () => [WORLDS.filter((w) => save.stages[`${w.id}-C`]).length, WORLDS.length] },
  { id: 'allstar', ic: '🌟', name: '올스타', t: 'r', sec: 'boss', desc: '모든 스테이지 별 3개', p: () => [totalStars(), TOTAL_STARS] },
  // 이벤트·미니게임
  { id: 'gold1', ic: '🌟', name: '반짝반짝', t: 'b', sec: 'fun', desc: '황금 문제 맞히기', p: () => [save.ach.gold, 1] },
  { id: 'gold10', ic: '💰', name: '황금 손', t: 's', sec: 'fun', desc: '황금 문제 10번 맞히기', p: () => [save.ach.gold, 10] },
  { id: 'bell20', ic: '🔔', name: '골든벨 20', t: 's', sec: 'fun', desc: '골든벨 20문제 통과', p: () => [save.bellBest, 20] },
  { id: 'bell50', ic: '🛎️', name: '골든벨을 울려라', t: 'r', sec: 'fun', desc: '골든벨 50문제 전부 통과', p: () => [save.bellWins, 1] },
  { id: 'memo10', ic: '🃏', name: '짝맞추기 달인', t: 's', sec: 'fun', desc: '국기 짝맞추기 10번 완성', p: () => [save.ach.memo, 10] },
  { id: 'puzzle10', ic: '🧩', name: '지도 퍼즐 왕', t: 's', sec: 'fun', desc: '지도 퍼즐 10번 완성', p: () => [save.ach.puzzle, 10] },
  { id: 'rush16', ic: '👆', name: '번개 손가락', t: 'b', sec: 'fun', desc: '숫자 빨리 누르기 1~16을 혼자 10초 안에', p: () => [save.rushBest && save.rushBest[16] <= 10 ? 1 : 0, 1] },
  { id: 'rush25', ic: '⚡', name: '초스피드', t: 's', sec: 'fun', desc: '숫자 빨리 누르기 1~25를 혼자 18초 안에', p: () => [save.rushBest && save.rushBest[25] <= 18 ? 1 : 0, 1] },
  // 수집·대전
  { id: 'rides', ic: '🐉', name: '탈것 컬렉터', t: 'g', sec: 'etc', desc: '탈것을 전부 모으기', p: () => [save.rides.length, Object.keys(RIDES).length] },
  { id: 'duel1', ic: '🤝', name: '첫 대전 승리', t: 'b', sec: 'etc', desc: '2인 대전에서 이기기', p: () => [(save.duel || {}).win || 0, 1] },
  { id: 'duel10', ic: '🥊', name: '대전 챔피언', t: 's', sec: 'etc', desc: '2인 대전 10번 이기기', p: () => [(save.duel || {}).win || 0, 10] },
];
const BADGE_SECS = { basic: '⭐ 기본', geo: '🌏 세계 지리·국기', map: '🗺️ 지도', cat: '🎓 주제 박사', boss: '⚔️ 보스·도전', fun: '🎉 이벤트·미니게임', etc: '🎒 수집·대전' };

// 문제 하나를 풀 때마다 (runQuiz settle 에서)
function noteAnswer(q, ok, { map, crit, fever } = {}) {
  if (map && map.pts >= 900) save.ach.bull++;
  if (!ok) return;
  const m = /^(cap|capr|flag|flagr):(\w+)$/.exec(q.k || '');
  if (m) save.ach[m[1].startsWith('cap') ? 'caps' : 'flags'][m[2]] = 1;
  if (crit) save.ach.crit++;
  if (fever) save.ach.fever++;
}

// 새로 채운 배지를 찾아 보상을 주고 알림. 여러 개를 한꺼번에 받으면 한 번에 묶어서 보여 준다.
const badgeQueue = [];
let badgeShowing = false;
function checkBadges() {
  const got = BADGES.filter((b) => !save.badges[b.id] && (() => { const [cur, goal] = b.p(); return goal > 0 && cur >= goal; })());
  if (!got.length) return;
  const now = Date.now();
  let coins = 0;
  for (const b of got) { save.badges[b.id] = now; coins += TIER[b.t].coins; }
  save.coins += coins;
  persist();
  const hud = document.querySelector('[data-coins]');
  if (hud) hud.textContent = save.coins.toLocaleString();
  if (got.length > 2) badgeQueue.push({ many: got, coins }); else badgeQueue.push(...got);
  if (!badgeShowing) nextBadgePop();
}
// 화면 위에서 내려오는 배지 알림 (문제 푸는 것을 막지 않음)
function nextBadgePop() {
  const b = badgeQueue.shift();
  if (!b) { badgeShowing = false; return; }
  badgeShowing = true;
  const el = document.createElement('div');
  el.className = 'badge-pop';
  el.innerHTML = b.many
    ? `<span class="bdg-ic" style="--tc:${TIER.g.c}">🏅</span><div><small>배지 ${b.many.length}개 획득!</small><b>${b.many.slice(0, 3).map((x) => x.ic).join(' ')}${b.many.length > 3 ? ' …' : ''}</b><em>🪙 +${b.coins}</em></div>`
    : `<span class="bdg-ic" style="--tc:${TIER[b.t].c}">${b.ic}</span><div><small>${TIER[b.t].name} 배지 획득!</small><b>${b.name}</b><em>🪙 +${TIER[b.t].coins}</em></div>`;
  el.onclick = () => { el.remove(); goto(badgeRoom); };
  document.body.appendChild(el);
  sfx('unlock'); buzz([20, 40, 20]);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => { el.remove(); nextBadgePop(); }, 350); }, 2600);
}

// 배지 방 (모아 보기)
function badgeRoom() {
  const have = BADGES.filter((b) => save.badges[b.id]).length;
  const card = (b) => {
    const [cur, goal] = b.p(), on = !!save.badges[b.id];
    const pct = Math.min(1, cur / goal);
    return `<div class="bdg card ${on ? 'on' : ''}" style="--tc:${TIER[b.t].c}">
      <span class="bdg-ic">${on ? b.ic : '🔒'}</span><b>${b.name}</b><small>${b.desc}</small>
      ${on ? `<em>${TIER[b.t].name} · 획득!</em>` : `<div class="bdg-bar"><i style="width:${pct * 100}%"></i></div><em>${Math.min(cur, goal).toLocaleString()} / ${goal.toLocaleString()} · 🪙${TIER[b.t].coins}</em>`}
    </div>`;
  };
  $app.innerHTML = `${topBar(`🏅 배지 ${have}/${BADGES.length}`)}
    <p class="hint">조건을 채우면 배지와 코인을 받아요. 브론즈 🪙${TIER.b.coins} · 실버 🪙${TIER.s.coins} · 골드 🪙${TIER.g.coins} · 레전드 🪙${TIER.r.coins}</p>
    ${Object.entries(BADGE_SECS).map(([k, name]) => `<div class="label">${name}</div><div class="bdg-grid">${BADGES.filter((b) => b.sec === k).map(card).join('')}</div>`).join('')}`;
  bindBack(() => toMap());
}
