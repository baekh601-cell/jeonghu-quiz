'use strict';
// 쉬어 가는 미니게임: 국기 짝맞추기, 지도 퍼즐.
// 스테이지 사이(가끔)와 자유 여행 메뉴에서 연다. 둘 다 cfg = { onEnd({ coins, title, sub }), onQuit() }.

// ───────── 🃏 국기 짝맞추기 ─────────
// 국기 카드와 나라 이름 카드를 두 장씩 뒤집어 짝을 찾는다. 적게 뒤집을수록 코인이 많다.
function flagMemory(cfg) {
  const N = document.body.classList.contains('wide') ? 8 : 6; // 넓은 화면은 8쌍
  const hard = levelOf(save.xp).lv >= 8;
  const pool = COUNTRIES.filter((c) => c.f && c.n.length <= 8 && c.d <= (hard ? 3 : 2));
  const picks = shuffle(pool).slice(0, N);
  const cards = shuffle(picks.flatMap((c) => [{ iso: c.iso, flag: c.f }, { iso: c.iso, name: c.n }]));
  let open = [], lock = false, moves = 0, found = 0;
  const t0 = Date.now();

  $app.innerHTML = `${topBar('🃏 국기 짝맞추기', `<span class="chip">🔁 <b id="moves">0</b>번</span>`)}
    <p class="hint">국기 카드와 나라 이름 카드의 짝을 찾아요! 두 장씩 뒤집어 봐.</p>
    <div class="memo-grid n${N}">${cards.map((c, i) => `<button class="memo press" data-i="${i}" aria-label="카드"><span class="back">?</span><span class="front ${c.flag ? 'flag' : ''}">${c.flag || esc(c.name)}</span></button>`).join('')}</div>`;
  bindBack(cfg.onQuit);
  const els = [...$app.querySelectorAll('.memo')];
  els.forEach((el) => (el.onclick = () => {
    const i = +el.dataset.i;
    if (lock || el.classList.contains('open') || el.classList.contains('done')) return;
    el.classList.add('open'); sfx('tap');
    open.push(i);
    if (open.length < 2) return;
    moves++; document.getElementById('moves').textContent = moves;
    lock = true;
    const [a, b] = open;
    if (cards[a].iso === cards[b].iso) {
      setTimeout(() => {
        els[a].classList.add('done'); els[b].classList.add('done');
        sfx('coin'); buzz(15);
        found++; open = []; lock = false;
        if (found === N) win();
      }, 300);
    } else {
      setTimeout(() => { els[a].classList.remove('open'); els[b].classList.remove('open'); open = []; lock = false; }, 850);
    }
  }));

  function win() {
    const secs = Math.round((Date.now() - t0) / 1000);
    const best = !save.ach.memoBest || moves < save.ach.memoBest;
    if (best) save.ach.memoBest = moves;
    save.ach.memo++;
    const coins = addCoins(Math.max(5, 30 - Math.max(0, moves - N) * 2));
    addXp(20); persist();
    confetti(90); sfx('clear');
    setTimeout(() => cfg.onEnd({ coins, title: '짝을 전부 찾았어! 🃏', sub: `${moves}번 뒤집어서 ${secs}초 만에!${best ? ' 🎉 최고 기록!' : ` (최고 ${save.ach.memoBest}번)`}` }), 1000);
  }
}

// ───────── 🧩 지도 퍼즐 ─────────
// 이웃한 나라 5곳이 비어 있는 지도. 나라 이름을 고르고 지도에서 그 나라를 누르면 색이 칠해진다.
const PZ_COLORS = ['#ff6b6b', '#4fb3ff', '#3ddc97', '#ffd43b', '#b57cff'];
function puzzleSet() {
  const S = window.MAP_DATA ? window.MAP_DATA.shapes : {};
  const cands = COUNTRIES.filter((c) => S[c.iso] && shapeOk(c.iso) && S[c.iso].area >= 3);
  const mid = (c) => { const b = S[c.iso].box; return [b[0] + b[2] / 2, b[1] + b[3] / 2]; };
  for (let t = 0; t < 60; t++) {
    const known = cands.filter((c) => c.d <= 2); // 출발점은 잘 알려진 나라에서 (주변은 어려운 나라가 섞여도 OK)
    const seed = pick(known.length && Math.random() < 0.8 ? known : cands);
    const [sx, sy] = mid(seed), k = Math.cos((sy * Math.PI) / 180);
    const near = cands.filter((c) => c !== seed && c.cont === seed.cont)
      .map((c) => { const [x, y] = mid(c); return { c, d: Math.hypot((x - sx) * k, y - sy) }; })
      .sort((a, b) => a.d - b.d).slice(0, 4).map((o) => o.c);
    if (near.length < 4) continue;
    const set = [seed, ...near];
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const c of set) { const [x, y, w, h] = S[c.iso].box; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x + w); y1 = Math.max(y1, y + h); }
    const kx = Math.cos((((y0 + y1) / 2) * Math.PI) / 180);
    const span = Math.max((x1 - x0) * kx, y1 - y0);
    if (span > 60) continue; // 너무 넓게 퍼지면 작은 나라를 누르기 어렵다
    if (set.some((c) => { const [, , w, h] = S[c.iso].box; return Math.max(w * kx, h) < span * 0.12; })) continue;
    return { set, box: [x0, y0, x1 - x0, y1 - y0], kx, S };
  }
  return null;
}
function mapPuzzle(cfg) {
  const P = puzzleSet();
  if (!P) { toast('지도를 불러오지 못했어요'); return cfg.onQuit(); }
  const { set, box: [x0, y0, w, h], kx, S } = P;
  const pad = Math.max(w * kx, h) * 0.1;
  const vb = [x0 * kx - pad, y0 - pad, w * kx + pad * 2, h + pad * 2];
  const fs = Math.max(vb[2], vb[3]) / 20; // 이름표 글자 크기
  const land = (window.MAP_DATA.world || []).map((d) => `<path class="land" d="${d}"/>`).join('');
  let selChip = null, selPath = null, mistakes = 0, solved = 0;

  $app.innerHTML = `${topBar('🧩 지도 퍼즐', `<span class="chip">❌ <b id="miss">0</b></span>`)}
    <p class="hint"><b>${set[0].cont}</b>의 이웃 나라 5곳! 아래에서 나라 이름을 고르고, 지도에서 그 나라를 톡!</p>
    <div class="pz-wrap card"><svg class="pz-map" viewBox="${vb.join(' ')}" preserveAspectRatio="xMidYMid meet">
      <g transform="scale(${kx},1)">${land}${set.map((c) => `<path class="pz" data-iso="${c.iso}" d="${S[c.iso].d}"/>`).join('')}</g>
      <g class="pz-labels" style="font-size:${fs}px;stroke-width:${fs * 0.22}px"></g></svg></div>
    <div class="pz-chips">${shuffle(set).map((c) => `<button class="pz-chip press" data-iso="${c.iso}">${c.f || ''} ${esc(c.n)}</button>`).join('')}</div>`;
  bindBack(cfg.onQuit);

  const paths = [...$app.querySelectorAll('.pz')], chips = [...$app.querySelectorAll('.pz-chip')];
  const labels = $app.querySelector('.pz-labels');
  const select = (list, el) => { list.forEach((x) => x.classList.toggle('sel', x === el)); return el; };
  function tryMatch() {
    if (!selChip || !selPath) return;
    const iso = selChip.dataset.iso;
    if (selPath.dataset.iso === iso) {
      const c = set.find((x) => x.iso === iso), [bx, by, bw, bh] = S[iso].box;
      selPath.classList.remove('sel'); selPath.classList.add('ok');
      selPath.style.fill = PZ_COLORS[solved % PZ_COLORS.length];
      labels.insertAdjacentHTML('beforeend', `<text x="${(bx + bw / 2) * kx}" y="${by + bh / 2}">${esc(c.n)}</text>`);
      selChip.remove();
      sfx('correct'); buzz(15);
      solved++;
      if (solved === set.length) win();
    } else {
      mistakes++; document.getElementById('miss').textContent = mistakes;
      const p = selPath;
      p.classList.add('bad'); setTimeout(() => p.classList.remove('bad'), 500);
      sfx('wrong'); buzz([40, 30, 40]);
      selChip.classList.remove('sel'); p.classList.remove('sel');
    }
    selChip = selPath = null;
  }
  chips.forEach((b) => (b.onclick = () => { sfx('tap'); selChip = select(chips, b); tryMatch(); }));
  paths.forEach((p) => (p.onclick = () => {
    if (p.classList.contains('ok')) return;
    sfx('tap'); selPath = select(paths, p); tryMatch();
  }));

  function win() {
    save.ach.puzzle++;
    const coins = addCoins(Math.max(5, 25 - mistakes * 4));
    addXp(20); persist();
    confetti(90); sfx('clear');
    setTimeout(() => cfg.onEnd({ coins, title: '지도를 완성했어! 🧩', sub: mistakes ? `틀린 횟수 ${mistakes}번` : '한 번도 안 틀렸어! 완벽해! 🎯' }), 1200);
  }
}

const MINIGAMES = {
  memo: { name: '국기 짝맞추기', ic: '🃏', run: flagMemory },
  puzzle: { name: '지도 퍼즐', ic: '🧩', run: mapPuzzle },
};
