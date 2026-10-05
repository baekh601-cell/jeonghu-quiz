'use strict';
// ⚡ 순발력 대결: 숫자 빨리 누르기
//  · 둘이: 한 기기 화면을 반으로 나눈다. 세로 화면은 위쪽을 뒤집어 마주 보고, 가로 화면은 왼쪽·오른쪽.
//    둘 다 같은 배치의 숫자판에서 1부터 N까지 순서대로 먼저 다 누르면 승리. 틀린 숫자를 누르면 0.6초 멈춤.
//  · 혼자: 같은 판을 혼자 풀고 최고 기록에 도전.
// 화면 전체를 쓰려고 #app 대신 고정 레이어(#ui)에 그린다 (#app 은 화면 전환 애니메이션 때문에 position:fixed 가 어긋남).

const RUSH_SIZES = [16, 25];
const RUSH_LOCK = 600; // 틀렸을 때 멈추는 시간(ms)
save.rushBest = save.rushBest || {}; // 혼자 연습 최고 기록 { 16: 초, 25: 초 }
const otherChar = () => Object.keys(CHARS).find((id) => id !== myChar());
const secs = (ms) => (ms / 1000).toFixed(1);

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
  const cols = Math.round(Math.sqrt(n));
  const ids = duo ? [otherChar(), myChar()] : [myChar()]; // 위(또는 왼쪽)가 0번
  const wins = ids.map(() => 0);
  const ui = document.getElementById('ui');
  let raf = 0, timer = 0;
  const leave = () => { cancelAnimationFrame(raf); clearTimeout(timer); removeEventListener('resize', fit); keepAwake(false); ui.innerHTML = ''; show(() => rushSetup(back)); };
  function fit() { // 숫자판을 자기 칸에 맞는 정사각형으로
    ui.querySelectorAll('.rush-area').forEach((a) => {
      const s = Math.floor(Math.min(a.clientWidth, a.clientHeight)), b = a.firstElementChild;
      b.style.width = b.style.height = `${s}px`;
      b.style.fontSize = `${Math.round((s / cols) * 0.42)}px`;
    });
  }
  addEventListener('resize', fit);
  keepAwake(true);

  function round() {
    cancelAnimationFrame(raf); clearTimeout(timer);
    const order = shuffle([...Array(n)].map((_, i) => i + 1)); // 둘 다 같은 배치 (공평하게)
    const P = ids.map(() => ({ next: 1, lock: 0, done: false, time: 0 }));
    let started = false, over = false, t0 = 0;
    $app.innerHTML = '';
    const half = (id, pi) => `<section class="rush-half p${pi}" data-p="${pi}" style="--c:${CHARS[id].color}">
        <header>${charArt(id, 'wave')}<b>${CHARS[id].name}</b>${duo ? `<span class="rush-wins">${wins[pi]}승</span>` : ''}
          <span class="rush-next">다음 <em>1</em></span><span class="rush-time">0.0초</span></header>
        <div class="rush-area"><div class="rush-board" style="--cols:${cols}">${order.map((v) => `<button class="rush-cell" data-v="${v}">${v}</button>`).join('')}</div></div>
        <div class="rush-msg"></div>
      </section>`;
    // 가운데 띠: 나가기 버튼 (안드로이드 뒤로 가기도 이 버튼을 누른다 — data-back)
    const mid = `<div class="rush-mid"><button class="rush-quit press" data-back aria-label="나가기">×</button><span>⚡ 1~${n}${duo ? ` · ${wins[0]} : ${wins[1]}` : ' 혼자 연습'}</span></div>`;
    ui.innerHTML = `<div class="rush ${duo ? 'duo' : 'solo'}">
      ${duo ? half(ids[0], 0) + mid + half(ids[1], 1) : mid + half(ids[0], 0)}
      <div class="rush-count">3</div>
    </div>`;
    const root = ui.querySelector('.rush');
    const halves = [...root.querySelectorAll('.rush-half')];
    root.querySelector('.rush-quit').onclick = () => { sfx('tap'); leave(); };
    fit();

    // 3, 2, 1, 시작!
    const countEl = root.querySelector('.rush-count');
    let c = 3;
    const tick = () => {
      if (!root.isConnected) return;
      if (c > 0) { countEl.textContent = c; countEl.classList.remove('pop'); void countEl.offsetWidth; countEl.classList.add('pop'); sfx('tick'); c--; timer = setTimeout(tick, 700); return; }
      countEl.textContent = '시작!'; sfx('power'); buzz(40);
      started = true; t0 = performance.now(); loop();
      timer = setTimeout(() => countEl.remove(), 500);
    };
    timer = setTimeout(tick, 300);

    function loop() { // 시간 표시
      const now = performance.now();
      halves.forEach((h, pi) => { if (!P[pi].done) h.querySelector('.rush-time').textContent = `${secs(now - t0)}초`; });
      if (!over) raf = requestAnimationFrame(loop);
    }

    halves.forEach((h, pi) => h.querySelector('.rush-board').addEventListener('pointerdown', (e) => {
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
        if (p.next > n) finish(pi, now);
      } else { // 틀림: 잠깐 멈춤
        p.lock = now + RUSH_LOCK;
        h.classList.remove('miss'); void h.offsetWidth; h.classList.add('miss');
        tone(150, 0.15, { type: 'sawtooth', vol: 0.05 }); buzz(60);
      }
    }));

    function finish(pi, now) {
      const p = P[pi];
      p.done = true; p.time = now - t0;
      halves[pi].querySelector('.rush-time').textContent = `${secs(p.time)}초`;
      over = true; cancelAnimationFrame(raf);
      confetti(110); sfx('clear'); buzz([30, 40, 60]);
      if (duo) {
        wins[pi]++;
        root.querySelector('.rush-mid span').textContent = `⚡ 1~${n} · ${wins[0]} : ${wins[1]}`;
        halves.forEach((h, j) => {
          h.classList.add(j === pi ? 'won' : 'lost');
          h.querySelector('.rush-msg').innerHTML = j === pi
            ? `<b>🏆 ${CHARS[ids[j]].name} 승리!</b><span>${secs(p.time)}초 · ${CHARS[ids[j]].shout}</span>`
            : `<b>아깝다!</b><span>${n - P[j].next + 1}개 남았어요</span>`;
        });
      } else {
        const best = save.rushBest[n];
        const record = !best || p.time / 1000 < best;
        if (record) { save.rushBest[n] = +secs(p.time); persist(); }
        halves[0].classList.add('won');
        halves[0].querySelector('.rush-msg').innerHTML = `<b>${record ? '🎉 새 기록!' : '완주!'}</b><span>${secs(p.time)}초${record ? '' : ` · 최고 ${best}초`}</span>`;
        checkBadges();
      }
      root.insertAdjacentHTML('beforeend', `<div class="rush-again"><button class="go press" data-a="again">한 판 더! 🔁</button><button class="ghost press" data-a="out">그만하기</button></div>`);
      root.querySelector('[data-a=again]').onclick = () => { sfx('tap'); round(); };
      root.querySelector('[data-a=out]').onclick = () => { sfx('tap'); leave(); };
    }
  }
  round();
}
