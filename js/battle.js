'use strict';
// 보스 대결 연출: 보스별 대사·공격, VS 등장 화면, 발사체, 말풍선, 초성 힌트

// 보스별 성격. atk = 정후가 틀렸을 때 보스가 날리는 공격
const BOSS_LINES = {
  'boss-1': { atk: '💨', start: '킁킁! 내 초원에서 퀴즈를 풀겠다고? 어림없지!', hit: ['꾸엑!', '아야, 내 엄니!', '킁! 제법인데?'], mock: ['킁킁킁! 그것도 몰라?', '초원 지도나 다시 봐라!'], rage: '화났다! 붕붕 돌진이다!', ko: '꾸에에엑… 초원을 돌려줄게…', win: '킁! 공부 더 하고 와라!' },
  'boss-2': { atk: '🫧', start: '집게 집게! 이 깃발들은 전부 내 거야!', hit: ['앗 따가!', '내 집게발!', '으윽, 모자가!'], mock: ['집게집게~ 틀렸지롱!', '바닷물 먹고 정신 차려!'], rage: '거품 대포 발사 준비!', ko: '으아악, 깃발 다 돌려줄게~', win: '집게! 내 보물은 안 뺏겨!' },
  'boss-3': { atk: '🔥', start: '흥, 이 두루마리의 역사는 아무도 모를걸!', hit: ['크윽!', '내 비늘이!', '제법이구나…'], mock: ['역사를 모르면 용이 될 수 없지!', '흥, 교과서나 다시 읽어!'], rage: '용이 되기 전에 널 막겠다!', ko: '크으… 나도 용이 되고 싶었는데…', win: '흥! 역사는 내 거야!' },
  'boss-4': { atk: '🌋', start: '크아앙! 과학 따위 내 용암에 녹아 버려라!', hit: ['앗 뜨거… 아니 아파!', '크앙!', '내 고글이!'], mock: ['크하하, 뜨거운 맛 좀 봐라!', '과학 공부 다시 해!'], rage: '화산 폭발 모드!', ko: '치이익… 식어 버렸다…', win: '크앙! 여기는 내 화산이야!' },
  'boss-5': { atk: '⚾', start: '빵빵! 내 강속구를 칠 수 있겠어?', hit: ['헛스윙!', '으악, 삼진이다!', '빵! 풍선껌 터졌잖아!'], mock: ['홈런이다~ 빵빵!', '야구 공부 더 하고 와!'], rage: '만루 홈런 모드다!', ko: '경기 끝… 네가 MVP야…', win: '빵빵! 내가 홈런왕!' },
  'boss-6': { atk: '🖤', start: '꼬물꼬물~ 내 넌센스를 풀 수 있을까?', hit: ['꼬물?!', '간지러워!', '내 다리 하나가!'], mock: ['메롱~ 먹물 맛 좀 봐!', '꼬물꼬물 틀렸지~'], rage: '먹물 폭탄이다! 앞이 안 보이지?', ko: '꼬무울… 항복 항복!', win: '꼬물꼬물~ 내가 이겼다!' },
  'boss-7': { atk: '🐍', start: '스르륵… 이 보물 지도는 내 거다…', hit: ['스스슥!', '내 모노클!', '쉬익!'], mock: ['쉬이익… 길을 잃었구나?', '지도 보는 법도 모르다니…'], rage: '정글의 독이다! 쉬익!', ko: '스르르… 보물 지도는 네 거야…', win: '스르륵… 정글은 넓단다…' },
  'boss-8': { atk: '⚡', start: '모른다 몰라~ 지식 별은 전부 내 거다!', hit: ['으악! 내 왕관이!', '별이 떨어진다!', '모, 모른다고!'], mock: ['몰라도 돼~ 몰라도 돼~', '내가 바로 모르쇠 대왕이다!'], rage: '모르쇠 대왕 분노 모드! 번개다!', ko: '으아아… 지식 별을 전부 돌려줄게!', win: '모른다 몰라~ 다시 오너라!' },
};
const bossLines = (boss) => BOSS_LINES[boss.img] || BOSS_LINES['boss-1'];

// 요소 중심에서 요소 중심으로 이모지를 날린다 (확대 배율 Z 반영)
function shoot(fromEl, toEl, emoji, { big = false, spin = true } = {}) {
  return new Promise((resolve) => {
    if (!fromEl || !toEl || reduced) return resolve();
    const a = fromEl.getBoundingClientRect(), b = toEl.getBoundingClientRect();
    const p = document.createElement('div');
    p.className = 'missile' + (big ? ' big' : '');
    p.textContent = emoji;
    document.body.appendChild(p);
    const x0 = (a.left + a.width / 2) / Z, y0 = (a.top + a.height / 2) / Z;
    const x1 = (b.left + b.width / 2) / Z, y1 = (b.top + b.height / 2) / Z;
    const arc = -Math.min(120, Math.abs(x1 - x0) * 0.4 + 40);
    const anim = p.animate([
      { transform: `translate(${x0}px, ${y0}px) translate(-50%, -50%) scale(.6) rotate(0deg)` },
      { transform: `translate(${(x0 + x1) / 2}px, ${(y0 + y1) / 2 + arc}px) translate(-50%, -50%) scale(${big ? 1.8 : 1.2}) rotate(${spin ? 360 : 0}deg)` },
      { transform: `translate(${x1}px, ${y1}px) translate(-50%, -50%) scale(${big ? 2.2 : 1}) rotate(${spin ? 720 : 0}deg)` },
    ], { duration: big ? 650 : 450, easing: 'ease-in' });
    anim.onfinish = () => { p.remove(); resolve(); };
  });
}
function burst(el, text, cls = '') { // 맞은 자리에 터지는 글자
  if (!el) return;
  const r = el.getBoundingClientRect();
  const f = document.createElement('div');
  f.className = 'burst ' + cls; f.innerHTML = text;
  f.style.left = `${(r.left + r.width / 2) / Z}px`; f.style.top = `${(r.top + r.height / 3) / Z}px`;
  document.body.appendChild(f); setTimeout(() => f.remove(), 1100);
}
function say(text, ms = 2200) { // 보스 말풍선
  const t = document.getElementById('taunt');
  if (!t) return;
  t.textContent = text;
  t.classList.remove('show'); void t.offsetWidth; t.classList.add('show');
  clearTimeout(say.t); say.t = setTimeout(() => t.classList.remove('show'), ms);
}

// VS 등장 화면. 눌러서 건너뛸 수 있다
function vsIntro(boss) {
  // 1) 경고 사이렌 → 2) 보스 그림자가 쿵 떨어짐 → 3) 번쩍! 정체 공개 + 이름표 → 4) 정후 VS 보스
  // 화면을 누르면 다음 장면으로 건너뛴다.
  return new Promise((resolve) => {
    if (reduced) return resolve();
    const L = bossLines(boss);
    const worldNo = (boss.img || '').replace('boss-', '');
    const o = document.createElement('div');
    o.className = 'cut';
    const warn = '⚠ WARNING ⚠ 보스 등장 ⚠ WARNING ⚠ 보스 등장 '.repeat(3);
    o.innerHTML = `
      <div class="cut-warn top"><span>${warn}</span></div><div class="cut-warn bot"><span>${warn}</span></div>
      <div class="cut-title">보스 등장!</div>
      <div class="cut-boss">${art(boss.img, boss.emoji, 'bossimg')}</div>
      <div class="cut-plate"><small>WORLD ${worldNo} BOSS</small><b>${boss.name}</b></div>
      <div class="cut-flash"></div>`;
    document.body.appendChild(o);
    const timers = [];
    const at = (ms, fn) => timers.push(setTimeout(fn, ms));
    let stage = 0, done = false;
    const toVs = () => {
      if (stage >= 4) return;
      stage = 4; timers.forEach(clearTimeout); timers.length = 0;
      o.className = 'vs-screen';
      o.innerHTML = `
        <div class="vs-side me">${JH.wave()}<b>${charName()}</b></div>
        <div class="vs-side foe">${art(boss.img, boss.emoji, 'bossimg')}<b>${boss.name}</b></div>
        <div class="vs-text">VS</div>
        <div class="vs-line">“${L.start}”</div>
        <div class="vs-go">대결 시작!</div>`;
      sfx('step'); at(550, () => { sfx('hit'); buzz(40); }); at(1900, () => sfx('power'));
      at(2800, finish);
    };
    const finish = () => { if (done) return; done = true; timers.forEach(clearTimeout); o.classList.add('out'); setTimeout(() => { o.remove(); resolve(); }, 250); };
    o.onclick = () => (stage < 4 ? toVs() : finish());
    // 장면 1: 경고
    o.classList.add('p1'); sfx('siren'); at(500, () => sfx('siren'));
    // 장면 2: 그림자 낙하
    at(1100, () => { stage = 2; o.classList.add('p2'); });
    at(1550, () => { sfx('thud'); buzz(80); o.classList.add('quake'); });
    // 장면 3: 공개
    at(2200, () => { stage = 3; o.classList.add('p3'); sfx('roar'); buzz([40, 30, 40]); });
    // 장면 4: VS
    at(3700, toVs);
  });
}

// K.O. 연출: 번쩍번쩍(맞는 순간 멈칫) → 뒤로 털썩 쓰러짐 → 머리 위 💫 → 되찾은 지식 별이 정후에게 → 식세븐!
function koEffect(bossEl, meEl, L) {
  const artEl = bossEl.querySelector('.boss-art');
  artEl.classList.add('ko');
  const arena = document.getElementById('arena') || bossEl;
  arena.insertAdjacentHTML('beforeend', '<div class="ko-text">K.O.!</div>');
  say(L.ko, 4200);
  sfx('hit'); buzz([100, 50, 140]);
  // 💫 는 쓰러진 몸과 같이 돌아가지 않도록 바깥(부모)에 붙인다
  setTimeout(() => { if (artEl.isConnected) { artEl.parentElement.insertAdjacentHTML('beforeend', '<span class="dizzy">💫</span>'); burst(artEl, '💨', ''); sfx('thud'); shake(); } }, 1150);
  const who = meEl && (meEl.querySelector ? meEl.querySelector('#who') || meEl : meEl);
  [0, 1, 2].forEach((i) => setTimeout(() => {
    if (!artEl.isConnected) return;
    shoot(artEl, who, '⭐', { big: i === 2 }).then(() => sfx('coin'));
  }, 1200 + i * 220));
  setTimeout(() => { if (artEl.isConnected) { toast('⭐ 지식 별을 되찾았다!'); sfx('clear'); confetti(120); sikseven(who); } }, 2000);
}

// 정후의 승리 외침: 식세븐~!
function sikseven(anchor) {
  if (!anchor || !anchor.isConnected) return;
  const r = anchor.getBoundingClientRect();
  const b = document.createElement('div');
  b.className = 'sik';
  b.innerHTML = `${CHARS[myChar()].shout} <span>${CHARS[myChar()].shoutIc}</span>`;
  b.style.left = `${(r.left + r.width / 2) / Z}px`;
  b.style.top = `${Math.max(40, r.top) / Z}px`;
  document.body.appendChild(b);
  setTimeout(() => b.remove(), 2000);
  seq([784, 988, 784, 1319], 0.08, { type: 'triangle', vol: 0.08 });
  // 기기에 한국어 음성이 있으면 소리 내어 외치기 (없으면 조용히 넘어감)
  try {
    if (save.sound && 'speechSynthesis' in window && speechSynthesis.getVoices().some((v) => v.lang.startsWith('ko'))) {
      const u = new SpeechSynthesisUtterance(CHARS[myChar()].shout.replace(/[~!]/g, '') + '!');
      u.lang = 'ko-KR'; u.rate = 1.1; u.pitch = 1.6;
      speechSynthesis.cancel(); speechSynthesis.speak(u);
    }
  } catch (e) { /* 음성 없음 */ }
}

// 초성 힌트: 이순신 → ㅇㅅㅅ (한글이 아닌 글자는 그대로)
const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
function choseong(s) {
  // 숫자가 든 답(1998년)은 첫 숫자만 보여 준다: 1□□□년
  if (/\d/.test(s)) { let first = true; return String(s).replace(/\d/g, (d) => (first ? ((first = false), d) : '□')); }
  return [...String(s)].map((ch) => {
    const c = ch.charCodeAt(0);
    return c >= 0xac00 && c <= 0xd7a3 ? CHO[Math.floor((c - 0xac00) / 588)] : ch;
  }).join('');
}
