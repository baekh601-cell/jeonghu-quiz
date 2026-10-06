'use strict';
// 실시간 온라인 대전 (versus-online 브랜치). 두 폰이 같은 방 번호로 접속해서 같은 문제를 동시에 풀고 서로의 HP 를 깎는다.
//
// 규칙
//  · 둘 다 HP 100. 한 라운드에 문제 하나, 제한 15초.
//  · 맞히면 상대 HP -14, 상대보다 먼저(또는 혼자) 맞히면 "선공" +6. 마지막 3라운드는 데미지 2배(역전 찬스).
//  · 3라운드마다 아이템 상자. 지고 있는 쪽은 공격 아이템이 더 잘 나온다.
//  · HP 가 0 이 되거나 12라운드가 끝나면 HP 가 많은 쪽 승리.
//
// 통신 (js/net.js 의 방 메시지). 판정은 두 폰이 같은 입력(두 사람의 답)으로 똑같이 계산한다.
//  hello{pid,char,role}  대기실에서 서로 찾기        start{to,qs}   방장이 문제 묶음을 보내며 시작
//  ans{r,ok,ms,bolt}     내 답                        next{r}        방장이 다음 라운드 신호
//  item{k} emo{e}        아이템·이모티콘              ping / bye / rematch
const OV = { ROUNDS: 12, HP: 100, BASE: 14, FIRST: 6, TIME: 15 };
const V_ITEMS = {
  ink: { ic: '🐙', name: '먹물 폭탄', desc: '상대 보기를 먹물로 가려요', attack: true },
  ice: { ic: '🧊', name: '꽁꽁 얼음', desc: '상대 버튼이 3초 동안 얼어요', attack: true },
  flip: { ic: '🙃', name: '거꾸로', desc: '상대 문제가 뒤집혀요', attack: true },
  bolt: { ic: '⚡', name: '번개', desc: '이번 문제를 맞히면 데미지 2배' },
  shield: { ic: '🛡️', name: '방패', desc: '다음 공격 한 번을 막아요' },
  heal: { ic: '💚', name: '회복', desc: 'HP +15' },
};
const EMOTES = ['😝', '🤣', '👍', '😭', '🔥', '🫵'];

window.VERSUS_ONLINE = () => show(onlineMenu);

// ───────── 방 만들기 / 참가 ─────────
function onlineMenu() {
  let code = '';
  const draw = () => {
    $app.innerHTML = `${topBar('📡 실시간 대전')}
      <div class="setup-hero card">${JH.wave()}<div><b>${charName()} 출전!</b><span>한 명이 방을 만들고, 다른 한 명이 그 방 번호로 들어와요. 둘 다 인터넷이 연결돼 있어야 해요.</span></div></div>
      <button class="go press" data-make>🏠 방 만들기</button>
      <div class="label">🤖 로봇과 연습 (인터넷 없이도 돼요)</div>
      <div class="opts bots">${Object.entries(BOTS).map(([k, b]) => `<button class="opt press" data-bot="${k}">${b.ic} ${b.name}</button>`).join('')}</div>
      <div class="label">방 번호로 들어가기</div>
      <div class="code-box">${[0, 1, 2, 3].map((i) => `<i class="${code[i] ? 'on' : ''}">${code[i] || ''}</i>`).join('')}</div>
      <div class="keypad">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 'del', 0, 'go'].map((k) => `<button class="press" data-k="${k}" ${k === 'go' && code.length < 4 ? 'disabled' : ''}>${k === 'del' ? '⌫' : k === 'go' ? '입장' : k}</button>`).join('')}</div>`;
    bindBack(() => show(versusMenu));
    $app.querySelector('[data-make]').onclick = () => { sfx('power'); onlineSession(String(1000 + rnd(9000)), 'host'); };
    $app.querySelectorAll('[data-bot]').forEach((b) => (b.onclick = () => { sfx('power'); onlineSession('BOT', 'host', b.dataset.bot); }));
    $app.querySelectorAll('[data-k]').forEach((b) => (b.onclick = () => {
      const k = b.dataset.k; sfx('tap');
      if (k === 'del') code = code.slice(0, -1);
      else if (k === 'go') { if (code.length === 4) return onlineSession(code, 'guest'); } else if (code.length < 4) code += k;
      draw();
    }));
  };
  draw();
}

// ───────── 로봇 상대 (혼자 연습용, 인터넷 필요 없음) ─────────
// 진짜 방 대신 쓰는 가짜 방: 내가 보낸 메시지를 로봇이 받아서, 사람처럼 조금 있다가 답·아이템·이모티콘을 보낸다.
const BOTS = {
  easy: { name: '쉬움', ic: '🐣', acc: 0.5, min: 5, max: 12 },
  normal: { name: '보통', ic: '🤖', acc: 0.7, min: 3.5, max: 9.5 },
  hard: { name: '어려움', ic: '👾', acc: 0.88, min: 2, max: 6.5 },
};
function botRoom(level, onMsg, onState) {
  const bot = BOTS[level] || BOTS.normal;
  const timers = new Set();
  let closed = false;
  const say = (type, d = {}, ms = 0) => { const t = setTimeout(() => { timers.delete(t); if (!closed) onMsg(type, { ...d, pid: 'bot' }); }, ms); timers.add(t); };
  const playRound = (r, startDelay) => {
    const think = (bot.min + Math.random() * (bot.max - bot.min)) * 1000;
    if (Math.random() < 0.22) say('item', { k: pick(['ink', 'ice', 'flip', 'shield', 'heal']) }, startDelay + 600 + Math.random() * 1500);
    if (Math.random() < 0.3) say('emo', { e: pick(EMOTES) }, startDelay + think * Math.random());
    say('ans', { r, ok: Math.random() < bot.acc, ms: Math.round(think), bolt: Math.random() < 0.12 }, startDelay + think);
  };
  setTimeout(() => onState('open'), 0);
  return {
    send(type, d) {
      if (closed) return;
      if (type === 'hello') say('hello', { char: myChar() === 'jeonghu' ? 'geonhee' : 'jeonghu', role: 'guest' }, 500);
      else if (type === 'start') playRound(0, 2700); // 3·2·1 카운트다운 뒤
      else if (type === 'next') playRound(d.r, 0);
      else if (type === 'rematch') say('rematch', {}, 900);
      else if (type === 'emo' && Math.random() < 0.5) say('emo', { e: pick(EMOTES) }, 800 + Math.random() * 1200);
    },
    close() { closed = true; timers.forEach(clearTimeout); },
  };
}

// ───────── 한 번의 접속(대기실 → 대전 → 결과 → 재대결) ─────────
// botLevel 을 주면 진짜 연결 대신 로봇과 대결한다.
function onlineSession(code, role, botLevel) {
  const pid = Math.random().toString(36).slice(2, 10);
  const S = { alive: true, peer: null, lastSeen: Date.now(), phase: 'lobby', net: 'retry', re: { me: false, op: false }, timers: new Set() };
  let B = null; // 대전 상태
  const later = (fn, ms) => { const t = setTimeout(() => { S.timers.delete(t); if (S.alive) fn(); }, ms); S.timers.add(t); return t; };
  const send = (type, data = {}) => room.send(type, { ...data, pid });
  const opChar = () => (S.peer && CHARS[S.peer.char] ? S.peer.char : 'geonhee');
  const opName = () => (botLevel ? `로봇 ${charName(opChar())}` : opChar() === myChar() ? `${charName(opChar())}(상대)` : charName(opChar()));

  const room = (botLevel ? (m, s) => botRoom(botLevel, m, s) : (m, s) => openRoom(code, m, s))(onMsg, (state) => { S.net = state; const el = document.getElementById('netstate'); if (el) el.textContent = state === 'open' ? '' : '📡 연결 중…'; if (S.phase === 'lobby') lobby(); });
  const helloTimer = setInterval(() => { if (S.phase === 'lobby') send('hello', { char: myChar(), role }); else send('ping'); }, 1500);
  const watch = setInterval(() => {
    if (!S.peer || S.phase === 'done' || botLevel) return; // 로봇은 연결이 끊길 일이 없음
    const gap = Date.now() - S.lastSeen;
    const warn = document.getElementById('peerwarn');
    if (warn) warn.textContent = gap > 8000 ? `📡 ${opName()}의 연결이 불안해요… (${Math.round(gap / 1000)}초)` : '';
    if (gap > 30000) leave(`${opName()}의 연결이 끊겼어요.`);
  }, 2000);
  keepAwake(true);

  function cleanup() {
    S.alive = false; clearInterval(helloTimer); clearInterval(watch);
    S.timers.forEach(clearTimeout); S.timers.clear();
    if (B) clearInterval(B.tick);
    room.close(); keepAwake(false);
    document.body.classList.remove('fever');
  }
  function leave(msg) { // 대전을 끝내고 메뉴로
    if (!S.alive) return;
    try { send('bye'); } catch (e) { /* 무시 */ }
    cleanup();
    show(versusMenu);
    if (msg) toast(msg);
  }
  const askQuit = async () => {
    const v = await modal(`<h2>대전에서 나갈까?</h2><p>나가면 상대와의 연결이 끊겨요.</p><button class="go press" data-v="stay">계속하기</button><button class="ghost press" data-v="quit">나가기</button>`);
    if (v === 'quit') leave();
  };

  // ── 메시지 받기 ──
  function onMsg(type, d) {
    if (!S.alive || d.pid === pid) return;
    if (S.peer && d.pid !== S.peer.pid) return; // 이미 짝이 있으면 다른 기기는 무시
    if (type === 'hello') {
      if (d.role === role) return; // 방장끼리/손님끼리는 짝이 될 수 없음
      if (!S.peer) {
        S.peer = { pid: d.pid, char: d.char }; S.lastSeen = Date.now(); sfx('unlock');
        if (botLevel) { const qs = duelQuestions((Math.random() * 2 ** 32) >>> 0, OV.ROUNDS); send('start', { to: d.pid, qs }); return startMatch(qs); } // 로봇은 대기실 없이 바로 시작
        send('hello', { char: myChar(), role }); if (S.phase === 'lobby') lobby();
      }
      else if (S.peer.char !== d.char) { S.peer.char = d.char; if (S.phase === 'lobby') lobby(); }
      S.lastSeen = Date.now();
      return;
    }
    if (!S.peer) return;
    S.lastSeen = Date.now();
    if (type === 'start' && role === 'guest' && d.to === pid) return startMatch(d.qs);
    if (type === 'bye') return leave(`${opName()}가 나갔어요.`);
    if (type === 'emo') return emote('op', d.e);
    if (type === 'rematch') { S.re.op = true; return rematchCheck(); }
    if (!B) return;
    if (type === 'ans') { B.ans.op[d.r] = { ok: !!d.ok, ms: +d.ms || OV.TIME * 1000, bolt: !!d.bolt }; if (d.r === B.r) { opStatus('answered'); tryResolve(); } }
    else if (type === 'item') gotItem(d.k);
    else if (type === 'next' && role === 'guest' && d.r === B.r + 1) round(d.r);
  }

  // ── 대기실 ──
  function lobby() {
    if (!S.alive || S.phase !== 'lobby') return;
    const card = (id, name, sub) => `<div class="char-card card" style="--c:${CHARS[id].color}">${charArt(id, 'wave')}<b>${name}</b><small>${sub}</small></div>`;
    $app.innerHTML = `${topBar('📡 대기실')}
      <div class="room-code"><small>방 번호</small><b>${code}</b></div>
      <p class="hint" id="netstate" style="text-align:center">${S.net === 'open' ? '' : '📡 연결 중…'}</p>
      <div class="char-pick">
        ${card(myChar(), charName(), role === 'host' ? '방장 (나)' : '나')}
        ${S.peer ? card(opChar(), opName(), role === 'host' ? '도전자' : '방장') : `<div class="char-card card waiting"><span class="art ph who">❓</span><b>기다리는 중…</b><small>${role === 'host' ? '친구에게 방 번호를 알려 줘요' : '방장을 찾고 있어요'}</small></div>`}
      </div>
      ${emoteBar()}
      ${role === 'host'
        ? `<button class="go press" data-start ${S.peer ? '' : 'disabled'}>${S.peer ? '대결 시작! ⚔️' : '상대를 기다리는 중…'}</button>`
        : `<p class="hint" style="text-align:center">${S.peer ? '방장이 시작하면 바로 대결이 시작돼요!' : '방 번호가 맞는지 확인해 줘요'}</p>`}
      <p class="hint" id="peerwarn" style="text-align:center"></p>`;
    bindBack(askQuit);
    bindEmotes();
    const st = $app.querySelector('[data-start]');
    if (st) st.onclick = () => { if (!S.peer) return; const qs = duelQuestions((Math.random() * 2 ** 32) >>> 0, OV.ROUNDS); send('start', { to: S.peer.pid, qs }); startMatch(qs); };
  }

  // ── 이모티콘 ──
  const emoteBar = () => `<div class="emote-bar">${EMOTES.map((e) => `<button class="press" data-emo="${e}">${e}</button>`).join('')}</div>`;
  let emoCool = 0;
  function bindEmotes() {
    $app.querySelectorAll('[data-emo]').forEach((b) => (b.onclick = () => {
      if (Date.now() < emoCool) return;
      emoCool = Date.now() + 1200;
      send('emo', { e: b.dataset.emo }); emote('me', b.dataset.emo);
    }));
  }
  function emote(who, e) {
    if (!EMOTES.includes(e)) return;
    const anchor = document.querySelector(who === 'me' ? '#me .who, .char-pick .char-card:first-child .who' : '#op .who, .char-pick .char-card:last-child .who');
    sfx('tap');
    if (anchor) burst(anchor, e, 'emote');
    if (who === 'op') buzz(15);
  }

  // ── 대전 시작 ──
  async function startMatch(qs) {
    S.phase = 'battle'; S.re = { me: false, op: false };
    B = { qs, r: -1, hp: { me: OV.HP, op: OV.HP }, shield: { me: false, op: false }, item: null, bolt: false, ans: { me: {}, op: {} }, resolved: false, fx: [], streak: 0, tick: 0, firstHits: { me: 0, op: 0 } };
    $app.innerHTML = `<div class="vs-screen static">
      <div class="vs-side me">${charArt(myChar(), 'wave')}<b>${charName()}</b></div>
      <div class="vs-side foe">${charArt(opChar(), 'wave')}<b>${opName()}</b></div>
      <div class="vs-text">VS</div><div class="vs-go" id="count">3</div></div>`;
    document.getElementById('ui').innerHTML = '';
    for (const n of ['3', '2', '1', '시작!']) { const c = document.getElementById('count'); if (c) c.textContent = n; sfx(n === '시작!' ? 'power' : 'tick'); await wait(650); if (!S.alive) return; }
    round(0);
  }

  // ── 한 라운드 ──
  function arenaHtml() {
    const side = (who, id, name) => `<div class="fighter ${who === 'me' ? 'me' : 'foe'}" id="${who}">
        <span class="whobox">${charArt(id, 'think')}</span><b>${name}</b>
        <div class="hpbar"><i style="width:${B.hp[who]}%"></i></div><small><span class="hpnum">${B.hp[who]}</span> HP ${B.shield[who] ? '🛡️' : ''}</small>
        ${who === 'op' ? '<span class="opstat" id="opstat">고민 중…</span>' : ''}</div>`;
    return `<div class="arena card duel ${B.r >= OV.ROUNDS - 3 ? 'rage' : ''}" id="arena">${side('me', myChar(), charName())}<div class="vs-mark">VS</div>${side('op', opChar(), opName())}</div>`;
  }
  function opStatus(s) { const el = document.getElementById('opstat'); if (el) { el.textContent = s === 'answered' ? '답했어! ✔' : '고민 중…'; el.classList.toggle('done', s === 'answered'); } }
  function refreshHp() {
    for (const who of ['me', 'op']) {
      const el = document.getElementById(who); if (!el) continue;
      el.querySelector('.hpbar i').style.width = `${B.hp[who]}%`;
      el.querySelector('small').innerHTML = `<span class="hpnum">${B.hp[who]}</span> HP ${B.shield[who] ? '🛡️' : ''}`;
    }
  }
  function itemBtn() {
    const it = B.item && V_ITEMS[B.item];
    return `<button class="item press vitem ${it ? '' : 'empty'}" id="vitem" ${it ? '' : 'disabled'} title="${it ? it.desc : ''}"><span>${it ? it.ic : '📦'}</span>${it ? it.name : '아이템 없음'}</button>`;
  }

  function round(r) {
    if (!S.alive || !B || r <= B.r) return;
    B.r = r; B.resolved = false; B.bolt = false; B.left = OV.TIME; B.t0 = Date.now();
    const q = B.qs[r], isMap = !!q.map;
    const opts = isMap ? [] : shuffle([q.a, ...q.w]);
    const last3 = r >= OV.ROUNDS - 3;
    const meta = isMap ? '🗺️ 지도 찾기' : q.cat && CATS[q.cat] ? `${CATS[q.cat].ic} ${CATS[q.cat].name}` : '';
    $app.innerHTML = `${topBar(`라운드 ${r + 1}/${OV.ROUNDS}`, `${last3 ? '<span class="chip hot">🔥 데미지 2배</span>' : ''}`)}
      <div class="qa ${isMap ? 'has-map' : ''}"><div class="qa-l">${arenaHtml()}
        <div class="qcard card" id="qcard"><div class="qmeta"><span>${meta}</span><span class="stars">${stars(q.d)}</span></div>
          ${q.flag ? `<div class="big-flag">${q.flag}</div>` : ''}<div class="q">${esc(q.q)}</div></div>
        <div class="timer"><i id="tbar"></i></div></div>
      <div class="qa-r" id="ansbox">${isMap
        ? `<div class="mapwrap quizmap"></div><button class="go press" id="mapok" disabled>지도에서 위치를 눌러 줘</button>`
        : `<div class="choices">${opts.map((o, i) => `<button class="choice press" data-i="${i}"><span class="k">${'ABCD'[i]}</span><span>${esc(o)}</span></button>`).join('')}</div>`}
        <div class="itembar">${itemBtn()}</div>${emoteBar()}
        <p class="hint" id="peerwarn" style="text-align:center"></p><div id="fb"></div></div></div>`;
    $app.classList.remove('screen-in'); void $app.offsetWidth; $app.classList.add('screen-in');
    window.scrollTo(0, 0);
    bindBack(askQuit); bindEmotes();
    document.getElementById('vitem').onclick = useItem;
    if (last3 && r === OV.ROUNDS - 3) toast('🔥 역전 찬스! 지금부터 데미지 2배!');
    if (B.ans.op[r]) opStatus('answered');

    const answered = () => !!B.ans.me[r];
    const submit = (ok) => {
      if (answered() || !S.alive) return;
      const ms = Math.min(OV.TIME * 1000, Date.now() - B.t0);
      B.ans.me[r] = { ok, ms, bolt: B.bolt };
      send('ans', { r, ok, ms, bolt: B.bolt });
      document.getElementById('vitem').disabled = true;
      const fb = document.getElementById('fb');
      if (fb && !B.ans.op[r]) fb.innerHTML = `<div class="feedback card wait">답을 골랐어! ${opName()}를 기다리는 중…</div>`;
      tryResolve();
    };
    if (isMap) {
      const okBtn = document.getElementById('mapok');
      const picker = mapPicker($app.querySelector('.quizmap'), q.map, () => { okBtn.disabled = false; okBtn.textContent = '여기야! 확인 📍'; }, { beam: false }); // 대전은 공평하게: 탈것 능력 없이
      B.cur = { q, picker };
      okBtn.onclick = () => { if (answered()) return; okBtn.disabled = true; const { pts, km } = picker.reveal(); B.cur.map = { pts, km }; submit(pts >= MAP_OK); okBtn.remove(); };
    } else {
      const btns = [...$app.querySelectorAll('.choice')];
      B.cur = { q, btns, opts };
      btns.forEach((b) => (b.onclick = () => {
        if (answered() || b.classList.contains('frozen')) return;
        const chosen = opts[+b.dataset.i];
        btns.forEach((x) => { x.disabled = true; if (x === b) x.classList.add('picked'); });
        B.cur.chosen = chosen;
        submit(chosen === q.a);
      }));
    }
    // 상대가 보낸 방해가 밀려 있으면 지금 적용
    B.fx.splice(0).forEach(applyFx);

    clearInterval(B.tick);
    const bar = document.getElementById('tbar');
    B.tick = setInterval(() => {
      if (!S.alive || !bar.isConnected) return clearInterval(B.tick);
      const left = OV.TIME - (Date.now() - B.t0) / 1000;
      bar.style.width = `${Math.max(0, left / OV.TIME) * 100}%`; bar.classList.toggle('low', left < 4);
      if (left <= 0 && !answered()) {
        if (isMap && B.cur.picker) { const { pts, km } = B.cur.picker.reveal(); B.cur.map = { pts, km }; document.getElementById('mapok')?.remove(); submit(pts >= MAP_OK); } else submit(false);
      }
      // 상대 답이 한참 안 오면(연결 문제) 오답으로 치고 넘어간다
      if (left <= -7 && !B.ans.op[r]) { B.ans.op[r] = { ok: false, ms: OV.TIME * 1000, bolt: false }; tryResolve(); }
    }, 100);
  }

  // ── 아이템 ──
  function useItem() {
    const k = B.item; if (!k || B.ans.me[B.r]) return;
    B.item = null; sfx('power'); buzz(20);
    document.getElementById('vitem').outerHTML = itemBtn();
    document.getElementById('vitem').onclick = useItem;
    burst(document.querySelector('#me .who'), V_ITEMS[k].ic, 'emote');
    if (k === 'bolt') { B.bolt = true; toast('⚡ 번개! 이번 문제를 맞히면 데미지 2배'); document.getElementById('me').classList.add('charged'); return; }
    if (k === 'shield') B.shield.me = true;
    if (k === 'heal') B.hp.me = Math.min(OV.HP, B.hp.me + 15);
    send('item', { k });
    refreshHp();
    toast(`${V_ITEMS[k].ic} ${V_ITEMS[k].name}!`);
  }
  function gotItem(k) {
    if (!V_ITEMS[k]) return;
    burst(document.querySelector('#op .who'), V_ITEMS[k].ic, 'emote');
    if (k === 'shield') { B.shield.op = true; return refreshHp(); }
    if (k === 'heal') { B.hp.op = Math.min(OV.HP, B.hp.op + 15); return refreshHp(); }
    if (!V_ITEMS[k].attack) return;
    toast(`${V_ITEMS[k].ic} ${opName()}의 ${V_ITEMS[k].name}!`); buzz([40, 30, 40]);
    if (B.ans.me[B.r] || B.resolved) B.fx.push(k); else applyFx(k); // 이미 답했으면 다음 라운드에
  }
  function applyFx(k) {
    const box = document.getElementById('ansbox'), qcard = document.getElementById('qcard');
    if (!box) return;
    if (k === 'ink') {
      box.style.position = 'relative';
      for (let i = 0; i < 4; i++) { const s = document.createElement('div'); s.className = 'ink'; s.style.left = `${5 + Math.random() * 62}%`; s.style.top = `${Math.random() * 45}%`; s.style.animationDelay = `${i * 0.1}s`; box.appendChild(s); }
    } else if (k === 'ice') {
      const btns = [...box.querySelectorAll('.choice'), ...box.querySelectorAll('#mapok')];
      btns.forEach((b) => b.classList.add('frozen'));
      box.classList.add('iced');
      later(() => { btns.forEach((b) => b.classList.remove('frozen')); box.classList.remove('iced'); }, 3000);
    } else if (k === 'flip' && qcard) {
      qcard.classList.add('flipped');
    }
  }
  function giveItem() {
    if (B.item) return;
    const behind = B.hp.me < B.hp.op;
    const pool = behind ? ['ink', 'ice', 'flip', 'bolt', 'bolt', 'heal', 'shield'] : ['ink', 'ice', 'flip', 'bolt', 'shield', 'shield', 'heal'];
    B.item = pick(pool);
    toast(`📦 아이템 획득: ${V_ITEMS[B.item].ic} ${V_ITEMS[B.item].name}`); sfx('open');
  }

  // ── 판정: 두 사람의 답이 모이면 두 폰이 똑같이 계산 ──
  function tryResolve() {
    const r = B.r;
    if (B.resolved || !B.ans.me[r] || !B.ans.op[r]) return;
    B.resolved = true; clearInterval(B.tick);
    const me = B.ans.me[r], op = B.ans.op[r], q = B.qs[r];
    const mult = r >= OV.ROUNDS - 3 ? 2 : 1;
    const first = (a, b) => a.ok && (!b.ok || a.ms < b.ms);
    const dmgOf = (a, b) => (a.ok ? (OV.BASE + (first(a, b) ? OV.FIRST : 0)) * (a.bolt ? 2 : 1) * mult : 0);
    let out = dmgOf(me, op), inc = dmgOf(op, me), blockedOut = false, blockedIn = false;
    if (out > 0 && B.shield.op) { out = 0; B.shield.op = false; blockedOut = true; }
    if (inc > 0 && B.shield.me) { inc = 0; B.shield.me = false; blockedIn = true; }
    B.hp.op = Math.max(0, B.hp.op - out); B.hp.me = Math.max(0, B.hp.me - inc);
    if (first(me, op)) B.firstHits.me++; if (first(op, me)) B.firstHits.op++;
    B.lastFirst = first(me, op) ? 'me' : first(op, me) ? 'op' : null;
    B.streak = me.ok ? B.streak + 1 : 0;
    save.answered++; if (me.ok) save.correct++; save.seen[q.k] = true;

    // 화면: 정답 표시 → 공격 주고받기
    if (B.cur.btns) B.cur.btns.forEach((b, i) => { b.disabled = true; b.classList.remove('frozen'); if (B.cur.opts[i] === q.a) b.classList.add('ok'); else if (B.cur.opts[i] === B.cur.chosen) b.classList.add('no'); else b.classList.add('dim'); });
    document.getElementById('qcard')?.classList.remove('flipped');
    const meEl = document.getElementById('me'), opEl = document.getElementById('op');
    const face = (el, id, pose) => { const b = el && el.querySelector('.whobox'); if (b) b.innerHTML = charArt(id, pose); };
    face(meEl, myChar(), me.ok ? 'correct' : 'wrong'); face(opEl, opChar(), op.ok ? 'correct' : 'wrong');
    sfx(me.ok ? 'correct' : 'wrong'); buzz(me.ok ? 15 : [60, 40, 60]);
    const lines = [];
    if (me.ok) lines.push(blockedOut ? `🛡️ ${opName()}의 방패가 막았어!` : `${first(me, op) ? '⚡ 선공! ' : ''}${opName()}에게 -${out}${me.bolt ? ' (번개 2배)' : ''}`);
    if (op.ok) lines.push(blockedIn ? '🛡️ 내 방패가 막았어!' : `${first(op, me) ? '⚡ 선공! ' : ''}${opName()}의 공격 -${inc}${op.bolt ? ' (번개 2배)' : ''}`);
    if (!me.ok && !op.ok) lines.push('둘 다 틀렸어! 😵');
    const mapNote = B.cur.map ? `내 위치: ${distText(B.cur.map.km)} 차이 (${B.cur.map.pts}점)<br>` : '';
    document.getElementById('fb').innerHTML = `<div class="feedback card ${me.ok ? 'ok' : 'no'}"><b>${me.ok ? '정답!' : `정답은 "${esc(q.a)}"`}</b>${mapNote}${lines.join('<br>')}${q.e ? `<br><small>${esc(q.e)}</small>` : ''}</div>`;
    (async () => {
      const mine = () => shoot(meEl.querySelector('.who'), opEl.querySelector('.who'), me.bolt ? '⚡' : '⭐', { big: me.bolt || first(me, op) }).then(() => { if (!opEl.isConnected) return; sfx('hit'); opEl.classList.add('hurt'); burst(opEl.querySelector('.who'), blockedOut ? '🛡️' : `-${out}`, first(me, op) ? 'crit' : ''); });
      const theirs = () => shoot(opEl.querySelector('.who'), meEl.querySelector('.who'), op.bolt ? '⚡' : '💥', { big: op.bolt || first(op, me) }).then(() => { if (!meEl.isConnected) return; sfx('hurt'); meEl.classList.add('hurt'); shake(); buzz([60, 40, 60]); burst(meEl.querySelector('.who'), blockedIn ? '🛡️' : `-${inc}`, ''); });
      const order = B.lastFirst === 'op' ? [op.ok && theirs, me.ok && mine] : [me.ok && mine, op.ok && theirs];
      for (const f of order) { if (f) { await f(); if (!S.alive) return; await wait(250); } }
      refreshHp();
      if (B.streak === 3) { toast('🔥 3연속 정답! 보너스 아이템'); giveItem(); }
    })();

    const over = B.hp.me <= 0 || B.hp.op <= 0 || r === OV.ROUNDS - 1;
    persist();
    if (over) return later(finish, 3600);
    if (r % 3 === 1) later(giveItem, 2600);
    if (role === 'host') later(() => { send('next', { r: r + 1 }); round(r + 1); }, 4600);
    else later(() => round(r + 1), 9000); // 방장의 신호가 안 오면 스스로 넘어감
  }

  // ── 결과 ──
  function finish() {
    if (!S.alive || S.phase === 'done') return;
    S.phase = 'done'; clearInterval(B.tick);
    const { me, op } = B.hp;
    let outcome = me > op ? 'win' : me < op ? 'lose' : 'draw';
    if (me <= 0 && op <= 0 && B.lastFirst) outcome = B.lastFirst === 'me' ? 'win' : 'lose'; // 동시에 쓰러지면 먼저 맞힌 쪽 승
    const d = save.duel || (save.duel = { win: 0, lose: 0, draw: 0 });
    if (!botLevel) d[outcome]++; // 로봇과의 연습은 전적에 넣지 않는다
    addXp(outcome === 'win' ? 60 : 25);
    const coins = addCoins(botLevel ? (outcome === 'win' ? 12 : 4) : outcome === 'win' ? 30 : outcome === 'draw' ? 15 : 8);
    persist();
    const myCorrect = Object.values(B.ans.me).filter((a) => a.ok).length;
    $app.innerHTML = `<div class="result-screen">
        <div class="intro-tag">${botLevel ? `🤖 로봇 대결 · ${BOTS[botLevel].name}` : `📡 방 ${code}`}</div>
        <h1 class="result-title ${outcome === 'lose' ? 'fail' : ''}">${outcome === 'win' ? `${charName()} 승리!` : outcome === 'lose' ? `${opName()} 승리!` : '무승부!'}</h1>
        <div class="duel-final">
          <div>${charArt(myChar(), outcome === 'win' ? 'king' : outcome === 'lose' ? 'wrong' : 'correct')}<b>${charName()}</b><span>HP ${me}</span></div>
          <div class="vs-mark">VS</div>
          <div>${charArt(opChar(), outcome === 'lose' ? 'king' : outcome === 'win' ? 'wrong' : 'correct')}<b>${opName()}</b><span>HP ${op}</span></div>
        </div>
        <p>정답 ${myCorrect}/${Object.keys(B.ans.me).length} · 선공 ${B.firstHits.me}번 · 🪙 +${coins}</p>
        <p class="hint">${botLevel ? '로봇과의 연습은 전적에 들어가지 않아요' : `전적 ${d.win}승 ${d.lose}패 ${d.draw}무`}</p>
        ${emoteBar()}
        <button class="go press" data-re>한 판 더! 🔁</button>
        <p class="hint" id="restat"></p>
        <button class="ghost press" data-out>나가기</button>
        <p class="hint" id="peerwarn"></p>
      </div>`;
    bindEmotes();
    if (outcome === 'win') { sfx('clear'); confetti(180); later(() => sikseven($app.querySelector('.duel-final .who')), 600); } else sfx(outcome === 'lose' ? 'fail' : 'coin');
    $app.querySelector('[data-out]').onclick = () => leave();
    $app.querySelector('[data-re]').onclick = (e) => { S.re.me = true; send('rematch'); e.currentTarget.disabled = true; rematchCheck(); };
    rematchCheck();
  }
  function rematchCheck() {
    const el = document.getElementById('restat');
    if (el) el.textContent = S.re.me && !S.re.op ? `${opName()}의 대답을 기다리는 중…` : !S.re.me && S.re.op ? `${opName()}가 한 판 더 하재요!` : '';
    if (S.re.me && S.re.op && S.phase === 'done' && role === 'host') {
      const qs = duelQuestions((Math.random() * 2 ** 32) >>> 0, OV.ROUNDS);
      send('start', { to: S.peer.pid, qs }); startMatch(qs);
    }
  }

  lobby();
}
