'use strict';
// 게임 엔진: 4지선다 퀴즈(runQuiz) 와 지도 도시 찾기(runMap)
// 왕국 스테이지와 자유 여행이 같은 엔진을 쓴다.

// only: 쓸 수 있는 상황 (hearts=하트 모드, timer=제한 시간, text=글자 답)
const ITEMS = {
  half: { name: '반반', ic: '🌓', desc: '틀린 보기 2개를 지워요', price: 12 },
  hint: { name: '초성 돋보기', ic: '🔍', desc: '정답의 초성을 보여 줘요', price: 10, only: 'text' },
  owl: { name: '부엉이 찬스', ic: '🦉', desc: '부엉이 할아버지가 답을 찍어 줘요 (80% 확률로 정답!)', price: 14 },
  pass: { name: '패스', ic: '⏭️', desc: '이 문제를 건너뛰어요', price: 15 },
  shield: { name: '방패', ic: '🛡️', desc: '다음에 틀려도 하트가 안 깎여요', price: 18, only: 'hearts' },
  heart: { name: '하트', ic: '❤️', desc: '하트 1개 회복', price: 20, only: 'hearts' },
  boost: { name: '번개 부스터', ic: '⚡', desc: '다음 3번 정답은 데미지·코인 2배', price: 22 },
  magnet: { name: '코인 자석', ic: '🧲', desc: '이번 스테이지 동안 코인 2배', price: 25 },
  dice: { name: '운명의 주사위', ic: '🎲', desc: '굴려 봐! 꽝부터 정답 공개까지', price: 8 },
  clock: { name: '시간 멈춤', ic: '⏸️', desc: '보스전 시간을 멈춰요', price: 10, only: 'timer' },
};

/**
 * cfg: {
 *   title, qs,                     문제 목록
 *   hearts: 3 | null,              null 이면 목숨 없음
 *   boss: { name, emoji, img, hp } 보스전이면 대결 무대 (정답마다 데미지)
 *   timer: 초 | null,              문제당 제한 시간
 *   speed: 초 | null,              스피드 게임 (전체 제한 시간, 문제 무한)
 *   items: true,                   아이템 사용 가능
 *   onEnd(result), onQuit()
 * }
 */
function runQuiz(cfg) {
  const st = {
    i: 0, results: [], streak: 0, maxStreak: 0, gained: 0, coins: 0,
    hearts: cfg.hearts ?? null, maxHearts: cfg.hearts ?? 0,
    hp: cfg.boss ? cfg.boss.hp : 0, over: false, timerId: null, left: 0, frozen: false,
    timerLen: cfg.timer || 0, speedLeft: cfg.speed || 0,
    gauge: 0, rage: false, shield: false, boost: 0, magnet: false,
  };
  const L = cfg.boss ? bossLines(cfg.boss) : null;
  const correctCount = () => st.results.filter((r) => r === true).length;
  const wrongCount = () => st.results.filter((r) => r === false).length;
  const heartsHtml = (cls = '') => `<span class="hearts ${cls}">${'❤️'.repeat(Math.max(0, st.hearts))}${'🤍'.repeat(Math.max(0, st.maxHearts - st.hearts))}${st.shield ? '🛡️' : ''}</span>`;

  function end(cleared) {
    if (st.over) return;
    st.over = true;
    clearInterval(st.timerId); clearInterval(st.speedId);
    document.body.classList.remove('fever');
    persist();
    cfg.onEnd({ cleared, correct: correctCount(), wrong: wrongCount(), total: st.results.length, coins: st.coins, gained: st.gained, maxStreak: st.maxStreak, heartsLeft: st.hearts, qs: cfg.qs, results: st.results });
  }

  function hud() {
    return topBar(cfg.title, `${st.hearts === null ? '' : heartsHtml()}<span class="chip">🪙 <b data-coins>${save.coins.toLocaleString()}</b></span>`);
  }
  const usable = (k) => {
    const only = ITEMS[k].only, q = cfg.qs[st.i];
    if (only === 'hearts' && st.hearts === null) return false;
    if (only === 'timer' && !cfg.timer) return false;
    if (only === 'text' && q && q.flags) return false;
    return (save.items[k] || 0) > 0;
  };
  const itemState = (k) => (k === 'shield' && st.shield) || (k === 'magnet' && st.magnet) || (k === 'boost' && st.boost > 0) ? 'active' : '';

  function arena() {
    return `<div class="arena card ${st.rage ? 'rage' : ''}" id="arena">
      <div class="fighter me" id="me"><span id="who">${JH.think()}</span><b>정후</b>
        <div class="gauge" title="필살기 게이지">${[0, 1, 2].map((i) => `<i class="${i < st.gauge ? 'on' : ''}"></i>`).join('')}<span>${st.gauge >= 3 ? '필살기 준비!' : '필살기'}</span></div></div>
      <div class="vs-mark">VS</div>
      <div class="fighter foe" id="boss"><div class="taunt" id="taunt"></div>
        <div class="boss-art">${art(cfg.boss.img, cfg.boss.emoji, 'bossimg')}</div><b>${cfg.boss.name}</b>
        <div class="hpbar"><i style="width:${(st.hp / cfg.boss.hp) * 100}%"></i></div><small>HP ${st.hp} / ${cfg.boss.hp}</small></div>
    </div>`;
  }

  function render() {
    if (st.over) return;
    if (st.i >= cfg.qs.length) return end(!cfg.boss); // 문제를 다 풀었다 (보스가 살아 있으면 실패)
    const q = cfg.qs[st.i];
    const opts = shuffle([q.a, ...q.w]);
    const c = q.cat && CATS[q.cat];
    const progress = cfg.speed
      ? `<div class="speedbar"><i style="width:${(st.speedLeft / cfg.speed) * 100}%"></i><span>⏱️ ${Math.ceil(st.speedLeft)}초 · 정답 ${correctCount()}개</span></div>`
      : cfg.boss ? '' : `<div class="progress">${cfg.qs.map((_, j) => `<i class="${j < st.i ? (st.results[j] === true ? 'ok' : st.results[j] === false ? 'no' : 'skip') : j === st.i ? 'now' : ''}"></i>`).join('')}</div>`;
    const qcard = `<div class="qcard card">
          <div class="qmeta"><span>${c ? `${c.ic} ${c.name}` : ''}${cfg.speed ? '' : ` · ${st.i + 1}/${cfg.qs.length}`}</span><span class="stars">${stars(q.d)}</span></div>
          ${q.flag ? `<div class="big-flag">${q.flag}</div>` : ''}
          <div class="q">${esc(q.q)}</div><div id="hintbox"></div>
        </div>`;
    const owned = cfg.items === false ? [] : Object.keys(ITEMS).filter(usable);
    const itemBar = owned.length ? `<div class="itembar">${owned.map((k) => `<button class="item press ${itemState(k)}" data-item="${k}" title="${ITEMS[k].desc}"><span>${ITEMS[k].ic}</span>${ITEMS[k].name}<em>${save.items[k]}</em></button>`).join('')}</div>` : '';
    // .qa-l(문제) / .qa-r(보기): 넓은 가로 화면에서는 좌우 두 칸, 그 외에는 위아래
    $app.innerHTML = `${hud()}<div class="qa"><div class="qa-l">${progress}
      ${cfg.boss ? arena() + qcard : `<div class="stage"><span id="who">${JH.think()}</span>${qcard}</div>`}
      ${cfg.timer ? `<div class="timer"><i id="tbar" class="${st.frozen ? 'frozen' : ''}"></i></div>` : ''}</div>
      <div class="qa-r"><div class="choices ${q.flags ? 'flags' : ''}">${opts.map((o, i) => `<button class="choice press ${q.flags ? 'flag' : ''}" data-i="${i}">${q.flags ? '' : `<span class="k">${'ABCD'[i]}</span>`}<span>${esc(o)}</span></button>`).join('')}</div>
      ${itemBar}
      <div id="fb"></div></div></div>`;
    bindBack(async () => {
      st.paused = true; // 고민하는 동안 타이머 멈춤
      const v = await modal(`<h2>그만할까?</h2><p>지금 나가면 이 스테이지는 처음부터 다시 해야 해요.</p><button class="go press" data-v="stay">계속하기</button><button class="ghost press" data-v="quit">나가기</button>`);
      st.paused = false;
      if (v === 'quit') { st.over = true; clearInterval(st.timerId); clearInterval(st.speedId); persist(); cfg.onQuit(); }
    });
    const btns = [...$app.querySelectorAll('.choice')];
    btns.forEach((b) => (b.onclick = () => answer(q, opts[+b.dataset.i], btns, opts, b)));
    $app.querySelectorAll('[data-item]').forEach((b) => (b.onclick = () => useItem(b.dataset.item, q, btns, opts)));
    if (cfg.boss) {
      if (st.i === 0) setTimeout(() => say(L.start), 300);
      if (st.rage && cfg.boss.img === 'boss-6') inkSplat(); // 문어 보스 분노: 먹물
    }
    if (cfg.timer) startTimer(q, btns, opts);
  }

  function inkSplat() {
    const box = $app.querySelector('.qa-r');
    if (!box || reduced) return;
    box.style.position = 'relative';
    for (let i = 0; i < 3; i++) {
      const s = document.createElement('div');
      s.className = 'ink';
      s.style.left = `${10 + Math.random() * 60}%`; s.style.top = `${Math.random() * 55}%`;
      s.style.animationDelay = `${i * 0.12}s`;
      box.appendChild(s);
    }
  }

  function startTimer(q, btns, opts) {
    clearInterval(st.timerId);
    st.left = st.timerLen; st.frozen = false;
    const bar = document.getElementById('tbar');
    st.timerId = setInterval(() => {
      if (!bar || !bar.isConnected) return clearInterval(st.timerId); // 화면이 바뀌었으면 멈춤
      if (st.frozen || st.paused) return;
      st.left -= 0.1;
      bar.style.width = `${Math.max(0, st.left / st.timerLen) * 100}%`; bar.classList.toggle('low', st.left < 4);
      if (st.left <= 3 && Math.abs(st.left - Math.round(st.left)) < 0.05) sfx('tick');
      if (st.left <= 0) { clearInterval(st.timerId); answer(q, null, btns, opts, btns[0]); }
    }, 100);
  }

  // ── 아이템 ──
  const live = (btns) => btns.filter((b) => !b.classList.contains('gone'));
  function applyHalf(q, btns, opts) {
    const wrong = shuffle(live(btns).filter((b) => opts[+b.dataset.i] !== q.a)).slice(0, 2);
    wrong.forEach((b) => { b.disabled = true; b.classList.add('gone'); });
  }
  function applyOwl(q, btns, opts) {
    const cands = live(btns);
    const right = cands.find((b) => opts[+b.dataset.i] === q.a);
    const pickB = Math.random() < 0.8 ? right : pick(cands.filter((b) => b !== right)) || right;
    pickB.classList.add('owl');
    toast('🦉 부엉이: "음… 이게 답 같구나!"');
  }
  function applyReveal(q, btns, opts) {
    btns.find((b) => opts[+b.dataset.i] === q.a).classList.add('reveal');
  }
  async function rollDice(q, btns, opts) {
    const face = 1 + rnd(6);
    const d = document.createElement('div');
    d.className = 'dice-roll';
    document.body.appendChild(d);
    const faces = '⚀⚁⚂⚃⚄⚅';
    for (let i = 0; i < 8; i++) { d.textContent = faces[rnd(6)]; sfx('tick'); await wait(70 + i * 12); }
    d.textContent = faces[face - 1]; d.classList.add('stop');
    await wait(500); d.remove();
    if (face === 1) toast('🎲 1: 꽝! 아무 일도 없었다 😅');
    if (face === 2) { addCoins(15); toast('🎲 2: 코인 +15!'); }
    if (face === 3) { applyHalf(q, btns, opts); toast('🎲 3: 반반 발동!'); }
    if (face === 4) { st.shield = true; refreshHearts('bump'); toast('🎲 4: 방패 획득! 🛡️'); }
    if (face === 5) { applyOwl(q, btns, opts); }
    if (face === 6) { applyReveal(q, btns, opts); confetti(40); toast('🎲 6: 대박! 정답 공개! ✨'); }
    sfx(face === 1 ? 'wrong' : 'power');
  }
  function refreshHearts(cls) {
    const h = document.querySelector('.hearts');
    if (h) h.outerHTML = heartsHtml(cls);
  }
  function useItem(k, q, btns, opts) {
    if (!save.items[k] || document.querySelector('.choice[data-done]')) return;
    if (k === 'heart' && st.hearts >= st.maxHearts) return toast('하트가 이미 가득해요');
    if (k === 'shield' && st.shield) return toast('방패를 이미 들고 있어요 🛡️');
    if (k === 'magnet' && st.magnet) return toast('코인 자석이 이미 켜져 있어요 🧲');
    if (k === 'hint' && document.querySelector('#hintbox b')) return;
    save.items[k]--;
    sfx('power');
    const btn = document.querySelector(`[data-item=${k}]`);
    if (k === 'half') { applyHalf(q, btns, opts); btn.disabled = true; }
    else if (k === 'owl') { applyOwl(q, btns, opts); btn.disabled = true; }
    else if (k === 'hint') { document.getElementById('hintbox').innerHTML = `<b>🔍 초성 힌트: ${esc(choseong(q.a))}</b>`; }
    else if (k === 'pass') { clearInterval(st.timerId); st.results.push(null); st.i++; persist(); return render(); }
    else if (k === 'heart') { st.hearts++; refreshHearts('bump'); }
    else if (k === 'shield') { st.shield = true; refreshHearts('bump'); toast('🛡️ 방패! 다음 실수 한 번은 괜찮아'); }
    else if (k === 'boost') { st.boost = 3; toast('⚡ 번개 부스터! 다음 3번 정답은 2배!'); }
    else if (k === 'magnet') { st.magnet = true; toast('🧲 코인 자석! 이번 스테이지 코인 2배!'); }
    else if (k === 'clock') { st.frozen = true; document.getElementById('tbar')?.classList.add('frozen'); }
    else if (k === 'dice') { rollDice(q, btns, opts); }
    if (btn) {
      btn.querySelector('em').textContent = save.items[k];
      btn.className = `item press ${itemState(k)}`;
      if (!save.items[k] && !itemState(k)) btn.disabled = true;
    }
    persist();
  }

  // ── 보스 대결 ──
  async function bossHit(dmg, tags) {
    const boss = document.getElementById('boss'), me = document.getElementById('me');
    await shoot(me.querySelector('#who'), boss.querySelector('.boss-art'), tags.special ? '🌟' : '⭐', { big: tags.special || tags.crit });
    st.hp = Math.max(0, st.hp - dmg);
    sfx('hit');
    boss.querySelector('.hpbar i').style.width = `${(st.hp / cfg.boss.hp) * 100}%`;
    boss.querySelector('small').textContent = `HP ${st.hp} / ${cfg.boss.hp}`;
    boss.classList.remove('hit'); void boss.offsetWidth; boss.classList.add('hit');
    burst(boss.querySelector('.boss-art'), `-${dmg}${tags.special ? '<small>필살기! 지식 폭발!</small>' : tags.crit ? '<small>크리티컬!</small>' : ''}`, tags.special ? 'special' : tags.crit ? 'crit' : '');
    if (tags.special) { confetti(60); shake(); }
    if (st.hp <= 0) {
      boss.querySelector('.boss-art').classList.add('ko');
      document.getElementById('arena').insertAdjacentHTML('beforeend', '<div class="ko-text">K.O.!</div>');
      say(L.ko, 4000);
      sfx('clear'); confetti(120);
    } else if (!st.rage && st.hp <= cfg.boss.hp / 2) {
      st.rage = true; st.timerLen = Math.min(st.timerLen || 20, 15);
      document.getElementById('arena').classList.add('rage');
      say(`😡 ${L.rage}`, 2600);
      toast('보스가 화났다! 제한 시간 15초');
    } else say(pick(L.hit), 1500);
  }
  async function bossAttack(blocked) {
    const boss = document.getElementById('boss'), me = document.getElementById('me');
    boss.classList.remove('attack'); void boss.offsetWidth; boss.classList.add('attack');
    say(pick(L.mock), 1800);
    await shoot(boss.querySelector('.boss-art'), me.querySelector('#who'), L.atk, { spin: L.atk !== '⚾' ? false : true });
    if (blocked) { burst(me, '🛡️ 막았다!', 'crit'); sfx('coin'); return; }
    me.classList.remove('hurt'); void me.offsetWidth; me.classList.add('hurt');
    sfx('hurt');
    if (st.hearts !== null && st.hearts <= 0) say(L.win, 4000);
  }

  function answer(q, chosen, btns, opts, el) {
    if (st.over || btns[0].dataset.done || !btns[0].isConnected) return;
    btns.forEach((b) => (b.dataset.done = 1));
    clearInterval(st.timerId);
    const spent = st.timerLen - st.left;
    const ok = chosen === q.a;
    btns.forEach((b, idx) => {
      b.disabled = true;
      if (opts[idx] === q.a) b.classList.add('ok');
      else if (opts[idx] === chosen) b.classList.add('no');
      else b.classList.add('dim');
    });
    $app.querySelectorAll('.item').forEach((b) => (b.disabled = true));
    document.getElementById('who').innerHTML = ok ? JH.correct() : JH.wrong();
    st.results.push(ok);
    save.recent = [...(save.recent || []), ok].slice(-30);
    save.answered++;
    save.seen[q.k] = true;
    const pc = (save.perCat[q.cat] = save.perCat[q.cat] || { n: 0, ok: 0 });
    pc.n++;
    let gain = 0;
    let blocked = false;
    if (ok) {
      st.streak++; st.maxStreak = Math.max(st.maxStreak, st.streak);
      save.correct++; pc.ok++;
      save.bestStreak = Math.max(save.bestStreak, st.streak);
      gain = q.d * 10 + Math.min(st.streak - 1, 5) * 2;
      st.gained += gain;
      const fever = st.streak >= 5;
      const boosted = st.boost > 0;
      if (boosted) st.boost--;
      const coins = q.d * (fever ? 2 : 1) * (st.magnet ? 2 : 1) * (boosted ? 2 : 1);
      st.coins += coins;
      addCoins(coins, el);
      if (cfg.onWrongFixed) cfg.onWrongFixed(q);
      sfx(fever ? 'fever' : 'correct');
      if (st.streak === 5) { document.body.classList.add('fever'); toast('🔥 피버 타임! 코인 2배!'); }
      else if (st.streak > 5 && st.streak % 5 === 0) { confetti(50); toast(`🔥 ${st.streak}연속!`); }
      if (cfg.boss) {
        const special = st.gauge >= 3;
        const crit = !!cfg.timer && spent <= 5;
        st.gauge = special ? 0 : st.gauge + 1;
        let dmg = 1 + (crit ? 1 : 0) + (special ? 2 : 0);
        if (boosted) dmg *= 2;
        st.pending = dmg;
        bossHit(dmg, { crit, special });
        const g = document.querySelector('.gauge');
        if (g) g.innerHTML = [0, 1, 2].map((i) => `<i class="${i < st.gauge ? 'on' : ''}"></i>`).join('') + `<span>${st.gauge >= 3 ? '필살기 준비!' : '필살기'}</span>`;
      }
    } else {
      st.streak = 0;
      document.body.classList.remove('fever');
      sfx('wrong');
      if (!save.wrong.some((w) => w.k === q.k)) save.wrong.unshift({ k: q.k, q: q.q, a: q.a, w: q.w, d: q.d, e: q.e, flag: q.flag, flags: q.flags, cat: q.cat });
      save.wrong = save.wrong.slice(0, 300);
      if (st.hearts !== null) {
        if (st.shield) { st.shield = false; blocked = true; toast('🛡️ 방패가 막아 줬어!'); refreshHearts('bump'); }
        else { st.hearts--; shake(); refreshHearts('hurt'); }
      }
      if (cfg.boss) bossAttack(blocked);
    }
    addXp(gain);
    persist();

    // 보스 HP 는 발사체가 닿은 뒤 줄어들므로, 여기서는 줄어들 값으로 판정
    const bossDown = cfg.boss && ok && st.hp - (st.pending || 0) <= 0;
    st.pending = 0;
    const dead = st.hearts !== null && st.hearts <= 0;
    const last = st.i === cfg.qs.length - 1;
    if (cfg.speed) { // 스피드 게임은 해설 없이 바로 다음 문제
      setTimeout(() => { st.i++; if (st.i >= cfg.qs.length) end(true); else render(); }, ok ? 350 : 900);
      return;
    }
    const nextLabel = bossDown ? '보스 격파! 🎉' : dead ? '하트가 다 떨어졌어… 💔' : last ? '결과 보기 🏁' : '다음 문제 ›';
    const timeout = chosen === null ? '⏰ 시간 초과! ' : '';
    document.getElementById('fb').innerHTML = `
      <div class="feedback card ${ok ? 'ok' : 'no'}">
        <b>${ok ? pick(['정답! 🎉', '맞았어! 👏', '대단해! 🌟', '역시 정후! 😎']) : `${timeout}정답은 "${esc(q.a)}"`}</b>
        ${q.e ? esc(q.e) : ''}
      </div>
      <button class="go press ${ok ? 'mint' : ''}" ${cfg.boss ? 'disabled' : ''}>${nextLabel}</button>`;
    const next = document.querySelector('#fb .go');
    if (cfg.boss) setTimeout(() => (next.disabled = false), bossDown ? 1400 : 700); // 공격 연출이 끝난 뒤
    next.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'nearest' });
    next.onclick = () => {
      sfx('tap');
      if (bossDown) return end(true);
      if (dead) return end(false);
      st.i++; render();
      $app.classList.remove('screen-in'); void $app.offsetWidth; $app.classList.add('screen-in');
      window.scrollTo(0, 0);
    };
  }

  if (cfg.speed) {
    st.speedId = setInterval(() => {
      if (st.paused) return;
      if (!document.querySelector('.speedbar')) { st.over = true; return clearInterval(st.speedId); } // 화면이 바뀌었으면 조용히 끝
      st.speedLeft -= 0.1;
      const bar = document.querySelector('.speedbar i'), lab = document.querySelector('.speedbar span');
      if (bar) bar.style.width = `${Math.max(0, st.speedLeft / cfg.speed) * 100}%`;
      if (lab) lab.textContent = `⏱️ ${Math.max(0, Math.ceil(st.speedLeft))}초 · 정답 ${correctCount()}개`;
      if (st.speedLeft <= 0) end(true);
    }, 100);
  }
  render();
}

// ───────── 지도 도시 찾기 ─────────
const REGIONS = {
  world: { name: '세계', ic: '🌍', box: [-170, -58, 190, 140], kx: 1, scale: 1500 },
  kr: { name: '대한민국', ic: '🇰🇷', box: [124.4, -38.9, 7.6, 5.9], kx: Math.cos((36 * Math.PI) / 180), scale: 40 },
};
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad, dLon = (lon2 - lon1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * cfg: { title, cities (각 도시의 r 로 지도 결정), boss: {name, emoji, img, hp(점수)}, onEnd(result), onQuit() }
 * result: { total, log, cleared(보스일 때만 의미) }
 */
function runMap(cfg) {
  const st = { i: 0, total: 0, log: [], bossHp: cfg.boss ? cfg.boss.hp : 0, over: false };
  const land = window.MAP_DATA || { world: [], korea: [] };

  function end() {
    if (st.over) return;
    st.over = true; persist();
    cfg.onEnd({ total: st.total, log: st.log, cleared: cfg.boss ? st.bossHp <= 0 : true, max: cfg.cities.length * 1000 });
  }

  function round() {
    if (st.i >= cfg.cities.length || (cfg.boss && st.bossHp <= 0)) return end();
    if (cfg.boss && st.i === 0) setTimeout(() => say(bossLines(cfg.boss).start), 400);
    const city = cfg.cities[st.i];
    const R = REGIONS[city.r] || REGIONS.world;
    const paths = land.world.map((d) => `<path class="land" d="${d}"/>`).join('')
      + (city.r === 'kr' ? land.korea.map((d) => `<path class="land kr" d="${d}"/>`).join('') : '');
    const label = city.r === 'kr' ? esc(city.n) : `${esc(city.n)} <small>(${esc(city.co)})</small>`;
    const bossBox = cfg.boss ? `<div class="boss card mini" id="boss"><div class="taunt" id="taunt"></div><div class="boss-art">${art(cfg.boss.img, cfg.boss.emoji, 'bossimg')}</div>
      <div class="boss-info"><b>${cfg.boss.name}</b><div class="hpbar"><i style="width:${(Math.max(0, st.bossHp) / cfg.boss.hp) * 100}%"></i></div><small>HP ${Math.max(0, st.bossHp).toLocaleString()}</small></div></div>` : '';
    $app.innerHTML = `${topBar(cfg.title, `<span class="chip">⭐ ${st.total.toLocaleString()}</span>`)}
      <div class="qa map"><div class="qa-l">
      ${bossBox}
      <div class="stage"><span id="who">${JH.explorer()}</span>
        <div class="qcard card">
          <div class="qmeta"><span>${R.ic} ${R.name} 지도 · ${st.i + 1}/${cfg.cities.length}</span><span class="stars">${stars(city.d)}</span></div>
          <div class="maptarget">📍 ${label}</div>
        </div>
      </div></div>
      <div class="qa-r"><div class="mapwrap">
        <svg preserveAspectRatio="xMidYMid meet"><g id="world" transform="scale(${R.kx},1)">${paths}<g id="marks"></g></g></svg>
        <div class="zoom"><button data-z="in" aria-label="확대">+</button><button data-z="out" aria-label="축소">−</button></div>
      </div></div>
      <div class="qa-b"><div id="mapfb"></div>
      <button class="go press" id="confirm" disabled>지도에서 위치를 눌러 줘</button></div></div>`;
    bindBack(async () => {
      const v = await modal(`<h2>그만할까?</h2><p>지금 나가면 처음부터 다시 해야 해요.</p><button class="go press" data-v="stay">계속하기</button><button class="ghost press" data-v="quit">나가기</button>`);
      if (v === 'quit') { st.over = true; persist(); cfg.onQuit(); }
    });

    const svg = $app.querySelector('svg'), g = svg.querySelector('#world'), marks = svg.querySelector('#marks');
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
    const pin = (cls, lon, lat) => `<ellipse class="${cls}" cx="${lon}" cy="${-lat}" rx="${pinR() / R.kx}" ry="${pinR()}"/>`;
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
      try { wrap.setPointerCapture(e.pointerId); } catch (err) { /* 일부 기기에서 실패해도 터치는 계속 받는다 */ }
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 1) { moved = false; downAt = { x: e.clientX, y: e.clientY, vb: vb.slice(), ppu: pxPerUnit() }; }
      if (pointers.size === 2) { const [a, b] = [...pointers.values()]; startDist = Math.hypot(a.x - b.x, a.y - b.y); startVB = vb.slice(); moved = true; }
    });
    wrap.addEventListener('pointermove', (e) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2 && startVB) {
        const [a, b] = [...pointers.values()];
        vb = startVB.slice();
        zoomAt(Math.hypot(a.x - b.x, a.y - b.y) / startDist, (a.x + b.x) / 2, (a.y + b.y) / 2);
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
        redraw(); sfx('tap');
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
        sfx('tap');
        st.i++;
        if (st.i >= cfg.cities.length || (cfg.boss && st.bossHp <= 0)) return end();
        return show(round);
      }
      done = true;
      const km = haversine(guess.lat, guess.lon, city.lat, city.lon);
      const pts = Math.round(1000 * Math.exp(-km / R.scale));
      st.total += pts;
      st.log.push({ city, km, pts });
      save.seen[city.k] = true;
      addXp(Math.round(pts / 50));
      const coins = pts >= 900 ? 5 : pts >= 600 ? 3 : pts >= 300 ? 1 : 0;
      addCoins(coins, this);
      sfx(pts >= 600 ? 'correct' : pts >= 300 ? 'coin' : 'wrong');
      if (cfg.boss) {
        st.bossHp -= pts;
        const b = document.getElementById('boss'), me = document.getElementById('who'), BL = bossLines(cfg.boss);
        const hpNow = st.bossHp;
        if (pts >= 300) { // 정후의 공격
          shoot(me, b.querySelector('.boss-art'), pts >= 900 ? '🌟' : '⭐', { big: pts >= 900 }).then(() => {
            sfx('hit'); b.classList.remove('hit'); void b.offsetWidth; b.classList.add('hit');
            b.querySelector('.hpbar i').style.width = `${(Math.max(0, hpNow) / cfg.boss.hp) * 100}%`;
            b.querySelector('small').textContent = `HP ${Math.max(0, hpNow).toLocaleString()}`;
            burst(b.querySelector('.boss-art'), `-${pts}${pts >= 900 ? '<small>크리티컬!</small>' : ''}`, pts >= 900 ? 'crit' : '');
            if (hpNow <= 0) { b.querySelector('.boss-art').classList.add('ko'); say(BL.ko, 4000); } else say(pick(BL.hit), 1500);
          });
        } else { // 너무 멀면 보스의 반격
          b.querySelector('.hpbar i').style.width = `${(Math.max(0, hpNow) / cfg.boss.hp) * 100}%`;
          b.querySelector('small').textContent = `HP ${Math.max(0, hpNow).toLocaleString()}`;
          b.classList.remove('attack'); void b.offsetWidth; b.classList.add('attack');
          say(pick(BL.mock), 1800);
          shoot(b.querySelector('.boss-art'), me, BL.atk).then(() => { sfx('hurt'); shake(); });
        }
      }
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
      const bossDown = cfg.boss && st.bossHp <= 0;
      this.textContent = bossDown ? '보스 격파! 🎉' : st.i === cfg.cities.length - 1 ? '결과 보기 🏁' : '다음 도시 ›';
    };
  }
  round();
}
