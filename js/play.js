'use strict';
// 게임 엔진: 4지선다 퀴즈(runQuiz) 와 지도 도시 찾기(runMap), 공용 지도 선택기(mapPicker)
// 왕국 스테이지와 자유 여행이 같은 엔진을 쓴다. 퀴즈 중간에 지도 문제(q.map)가 섞일 수 있다.

// only: 쓸 수 있는 상황 (hearts=하트 모드, timer=제한 시간, text=글자 보기), map: 지도 문제에서도 쓸 수 있음
const ITEMS = {
  half: { name: '반반', ic: '🌓', desc: '틀린 보기 2개를 지워요', price: 12 },
  hint: { name: '초성 돋보기', ic: '🔍', desc: '정답의 초성을 보여 줘요', price: 10, only: 'text' },
  owl: { name: '부엉이 찬스', ic: '🦉', desc: '부엉이 할아버지가 답을 찍어 줘요 (80% 확률로 정답!)', price: 14 },
  pass: { name: '패스', ic: '⏭️', desc: '이 문제를 건너뛰어요', price: 15, map: true },
  shield: { name: '방패', ic: '🛡️', desc: '다음에 틀려도 하트가 안 깎여요', price: 18, only: 'hearts', map: true },
  heart: { name: '하트', ic: '❤️', desc: '하트 1개 회복', price: 20, only: 'hearts', map: true },
  boost: { name: '번개 부스터', ic: '⚡', desc: '다음 3번 정답은 데미지·코인 2배', price: 22, map: true },
  magnet: { name: '코인 자석', ic: '🧲', desc: '이번 스테이지 동안 코인 2배', price: 25, map: true },
  dice: { name: '운명의 주사위', ic: '🎲', desc: '굴려 봐! 꽝부터 정답 공개까지', price: 8 },
  clock: { name: '시간 멈춤', ic: '⏸️', desc: '보스전 시간을 멈춰요', price: 10, only: 'timer', map: true },
};

// ───────── 지도 ─────────
const REGIONS = {
  world: { name: '세계', ic: '🌍', box: [-170, -58, 190, 140], kx: 1, scale: 1500 },
  // scale: 점수 = 1000 × e^(−거리/scale). 한국은 100km (20km→819점, 50km→607점, 92km→400점, 150km→223점).
  // 40km 였을 때는 폰에서 손가락 오차(15~20km)만으로 600점대가 되어 너무 짰다.
  kr: { name: '대한민국', ic: '🇰🇷', box: [124.4, -38.9, 7.6, 5.9], kx: Math.cos((36 * Math.PI) / 180), scale: 100 },
};
const MAP_OK = 400; // 퀴즈 속 지도 문제는 400점(세계 약 1,400km / 한국 약 92km 이내) 이상이면 정답
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad, dLon = (lon2 - lon1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
// 도시 하나를 퀴즈 문제 형태로
function mapQuestion(city) {
  const where = city.r === 'kr' ? city.n : `${city.n}(${city.co})`;
  return { k: city.k, map: city, cat: 'map', d: city.d, q: `📍 ${josa(where, '은', '는')} 어디에 있을까? 지도에서 콕!`, a: city.n, w: [], e: '' };
}

/**
 * 확대·이동·탭이 되는 지도. wrap(.mapwrap) 안에 그린다.
 * onPick(guess) : 위치를 찍을 때마다
 * 반환: { hasGuess(), reveal() → { km, pts } }  (찍은 곳과 실제 위치를 함께 보여 줌)
 */
function mapPicker(wrap, city, onPick, opts = {}) {
  const R = REGIONS[city.r] || REGIONS.world;
  const land = window.MAP_DATA || { world: [], korea: [] };
  const paths = land.world.map((d) => `<path class="land" d="${d}"/>`).join('')
    + (city.r === 'kr' ? land.korea.map((d) => `<path class="land kr" d="${d}"/>`).join('') : '');
  wrap.innerHTML = `<svg preserveAspectRatio="xMidYMid meet"><g class="world" transform="scale(${R.kx},1)">${paths}<g class="marks"></g></g></svg>
    <div class="zoom"><button data-z="in" aria-label="확대">+</button><button data-z="out" aria-label="축소">−</button></div>`;
  const svg = wrap.querySelector('svg'), marks = svg.querySelector('.marks');

  // ── 부드럽게 움직이는 원리 ──
  // 나라 모양 241개(1MB 넘는 그림)를 손가락이 움직일 때마다 다시 그리면 폰에서 끊긴다.
  // 그래서 움직이는 동안에는 이미 그려 둔 그림을 CSS transform 으로 밀고 키우기만 하고(GPU 가 처리),
  // 손을 떼고 멈춘 뒤에만 viewBox 를 바꿔 선명하게 한 번 다시 그린다(commit).
  //   drawn : 지금 실제로 그려져 있는 viewBox       vb : 사용자가 보고 있어야 할 viewBox
  let vb = [R.box[0] * R.kx, R.box[1], R.box[2] * R.kx, R.box[3]];
  const home0 = vb.slice();
  let drawn = vb.slice();
  svg.setAttribute('viewBox', drawn.join(' '));

  // viewBox v 일 때의 화면 배치 (preserveAspectRatio=meet 를 직접 계산). svg 는 transform 이 걸릴 수 있으니 틀(wrap) 기준
  function frame(v) {
    // 틀의 테두리(border) 안쪽 = svg 가 차지하는 영역. client* 는 확대 전 CSS px 라서 Z 를 곱해 화면 px 로
    const b = wrap.getBoundingClientRect();
    const r = { left: b.left + wrap.clientLeft * Z, top: b.top + wrap.clientTop * Z, width: wrap.clientWidth * Z, height: wrap.clientHeight * Z };
    const ppu = Math.min(r.width / v[2], r.height / v[3]);
    return { r, ppu, ox: r.left + (r.width - v[2] * ppu) / 2, oy: r.top + (r.height - v[3] * ppu) / 2 };
  }
  const screenToVB = (cx, cy, v = vb) => { const f = frame(v); return { x: v[0] + (cx - f.ox) / f.ppu, y: v[1] + (cy - f.oy) / f.ppu }; };
  // 크기 w×h 인 viewBox 에서 지도 위의 점 p 가 화면 (cx, cy) 에 오도록
  function place(p, cx, cy, w, h) { const f = frame([0, 0, w, h]); return [p.x - (cx - f.ox) / f.ppu, p.y - (cy - f.oy) / f.ppu, w, h]; }
  // 지도가 화면 밖으로 사라지지 않게: 화면 가운데가 원래 지도 범위(+10%) 안에 머물도록
  function clampVB(v) {
    const mx = home0[2] * 0.1, my = home0[3] * 0.1;
    const cx = Math.min(home0[0] + home0[2] + mx, Math.max(home0[0] - mx, v[0] + v[2] / 2));
    const cy = Math.min(home0[1] + home0[3] + my, Math.max(home0[1] - my, v[1] + v[3] / 2));
    return [cx - v[2] / 2, cy - v[3] / 2, v[2], v[3]];
  }

  let guess = null, ghost = null, done = false, interacting = false, raf = 0;
  const pinR = () => 8 / frame(drawn).ppu; // 확대해도 화면에서 항상 비슷한 크기
  // g 가 가로로 kx 배 줄어 있으니 rx 를 늘려서 동그랗게 보이게 한다
  const pin = (cls, lon, lat) => `<ellipse class="${cls}" cx="${lon}" cy="${-lat}" rx="${pinR() / R.kx}" ry="${pinR()}"/>`;
  function redraw() {
    if (!done) { marks.innerHTML = guess ? pin('pin-guess', guess.lon, guess.lat) : ''; return; }
    marks.innerHTML = (ghost ? `<line class="beam-line" x1="${ghost.lon}" y1="${-ghost.lat}" x2="${guess.lon}" y2="${-guess.lat}"/>` + pin('pin-ghost', ghost.lon, ghost.lat) : '')
      + (guess ? `<line class="pin-line" x1="${guess.lon}" y1="${-guess.lat}" x2="${city.lon}" y2="${-city.lat}"/>` + pin('pin-guess', guess.lon, guess.lat) : '')
      + pin('pin-real', city.lon, city.lat);
  }
  // 움직이는 중: drawn → vb 로 보이도록 transform 만 계산 (다시 그리지 않음)
  function paintTransform() {
    const f = frame(drawn), s = drawn[2] / vb[2];
    const tx = ((f.ox - f.r.left) * (1 - s) + (drawn[0] - vb[0]) * f.ppu * s) / Z;
    const ty = ((f.oy - f.r.top) * (1 - s) + (drawn[1] - vb[1]) * f.ppu * s) / Z;
    svg.style.transform = `translate(${tx}px, ${ty}px) scale(${s})`;
  }
  // 멈춘 뒤: 실제 viewBox 를 바꿔 선명하게 다시 그리기
  function commit() {
    drawn = vb.slice();
    svg.setAttribute('viewBox', drawn.join(' '));
    svg.style.transform = '';
    redraw();
  }
  function apply(v) {
    vb = clampVB(v);
    if (!raf) raf = requestAnimationFrame(() => { raf = 0; if (interacting) paintTransform(); else commit(); });
  }
  function settle() { interacting = false; cancelAnimationFrame(raf); raf = 0; commit(); }

  const MIN_W = home0[2] / 40, MAX_W = home0[2] * 1.5;
  const clampW = (w) => Math.min(MAX_W, Math.max(MIN_W, w));
  function zoomAt(factor, cx, cy) {
    const p = screenToVB(cx, cy), w = clampW(vb[2] / factor);
    apply(place(p, cx, cy, w, vb[3] * (w / vb[2])));
  }
  function animateZoom(factor, cx, cy) { // + / − 버튼: 짧게 스르륵 (움직이는 동안은 transform, 끝나면 선명하게)
    stopFling(); interacting = true;
    const steps = 10, f = Math.pow(factor, 1 / steps);
    let i = 0;
    (function step() { zoomAt(f, cx, cy); if (++i < steps) requestAnimationFrame(step); else requestAnimationFrame(settle); })();
  }

  // ── 관성: 튕기듯 손을 떼면 미끄러지다 서서히 멈춤 ──
  let fling = 0, samples = [];
  function stopFling() { if (fling) cancelAnimationFrame(fling); fling = 0; }
  function startFling() {
    const now = performance.now();
    const recent = samples.filter((s) => now - s.t < 90);
    if (recent.length < 2) return false;
    const a = recent[0], b = recent[recent.length - 1], dt = Math.max(1, b.t - a.t);
    let vx = (b.x - a.x) / dt, vy = (b.y - a.y) / dt; // 화면 px / ms
    if (Math.hypot(vx, vy) < 0.25) return false;
    let last = now;
    const step = (t) => {
      const d = Math.min(40, t - last); last = t;
      const ppu = frame(vb).ppu;
      apply([vb[0] - (vx * d) / ppu, vb[1] - (vy * d) / ppu, vb[2], vb[3]]);
      const decay = Math.pow(0.94, d / 16);
      vx *= decay; vy *= decay;
      if (Math.hypot(vx, vy) > 0.02) fling = requestAnimationFrame(step); else { fling = 0; settle(); }
    };
    fling = requestAnimationFrame(step);
    return true;
  }

  // ── 손가락 제스처 ──
  // 원칙: 손가락이 처음 닿은 지도 위의 점(anchor)이 끝까지 그 손가락 아래에 붙어 있게 한다.
  //  · 한 손가락: 끌기(+관성)  · 두 손가락: 벌리고 오므리며 동시에 이동  · 짧게 탭: 위치 찍기
  const pointers = new Map();
  let gest = null, moved = false, downPos = null;
  function startGesture() { // 지금 닿아 있는 손가락 기준으로 다시 붙잡기 (손가락 수가 바뀌어도 튀지 않게)
    const pts = [...pointers.values()];
    if (pts.length >= 2) {
      const [a, b] = pts;
      gest = { type: 'pinch', anchor: screenToVB((a.x + b.x) / 2, (a.y + b.y) / 2), d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, w0: vb[2], h0: vb[3] };
    } else if (pts.length === 1) {
      gest = { type: 'pan', anchor: screenToVB(pts[0].x, pts[0].y) };
    } else gest = null;
  }
  wrap.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.zoom')) return;
    try { wrap.setPointerCapture(e.pointerId); } catch (err) { /* 일부 기기에서 실패해도 터치는 계속 받는다 */ }
    const wasFlinging = !!fling;
    stopFling();
    interacting = true;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) { moved = wasFlinging; downPos = { x: e.clientX, y: e.clientY }; samples = []; } else moved = true;
    startGesture();
  });
  wrap.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId) || !gest) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.values()];
    if (gest.type === 'pinch' && pts.length >= 2) {
      const [a, b] = pts;
      const w = clampW(gest.w0 * gest.d0 / (Math.hypot(a.x - b.x, a.y - b.y) || 1));
      apply(place(gest.anchor, (a.x + b.x) / 2, (a.y + b.y) / 2, w, gest.h0 * (w / gest.w0)));
    } else if (gest.type === 'pan' && pts.length === 1) {
      if (!moved && Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y) > 8) moved = true;
      if (moved) {
        apply(place(gest.anchor, e.clientX, e.clientY, vb[2], vb[3]));
        samples.push({ t: performance.now(), x: e.clientX, y: e.clientY });
        if (samples.length > 8) samples.shift();
      }
    }
  });
  const up = (e) => {
    if (!pointers.has(e.pointerId)) return;
    const wasPan = gest && gest.type === 'pan';
    pointers.delete(e.pointerId);
    if (pointers.size === 0) {
      if (!moved && !done) { // 짧게 탭 → 위치 찍기
        const p = screenToVB(e.clientX, e.clientY);
        guess = { lon: p.x / R.kx, lat: -p.y };
        settle(); sfx('tap');
        if (onPick) onPick(guess);
      } else if (!(wasPan && moved && startFling())) settle();
    }
    startGesture();
  };
  wrap.addEventListener('pointerup', up);
  wrap.addEventListener('pointercancel', up);
  let wheelTimer = 0;
  wrap.addEventListener('wheel', (e) => {
    e.preventDefault(); stopFling(); interacting = true;
    zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX, e.clientY);
    clearTimeout(wheelTimer); wheelTimer = setTimeout(settle, 160);
  }, { passive: false });
  wrap.querySelectorAll('[data-z]').forEach((b) => (b.onclick = () => {
    const r = wrap.getBoundingClientRect(); animateZoom(b.dataset.z === 'in' ? 2 : 0.5, r.left + r.width / 2, r.top + r.height / 2);
  }));

  // 🛸 UFO 견인 광선: 찍은 곳에서 정답까지 거리의 30%만큼 핀을 끌어당긴다.
  // (예전 '레이더'는 정답 근처에 원을 그려 줘서 원 안만 찍으면 거의 다 맞았다 → 실력이 그대로 반영되게 바꿈)
  // 세계 지도 정답 기준 약 1,400km → 2,000km, 한국 92km → 130km 까지 넓어지는 정도
  const BEAM = 0.3;
  const beamOn = () => guess && (opts.beam ?? rideIs('ufo'));

  return {
    hasGuess: () => !!guess,
    reveal() {
      stopFling();
      done = true;
      let km = guess ? haversine(guess.lat, guess.lon, city.lat, city.lon) : Infinity;
      const from = guess;
      if (beamOn()) {
        const km0 = km;
        ghost = from;
        km *= 1 - BEAM;
        let dLon = city.lon - from.lon; // 날짜 변경선을 넘을 때는 짧은 쪽으로
        if (dLon > 180) dLon -= 360; else if (dLon < -180) dLon += 360;
        const to = { lon: from.lon + dLon * BEAM, lat: from.lat + (city.lat - from.lat) * BEAM };
        const t0 = performance.now();
        (function pull(t) { // 0.7초 동안 핀이 스르륵 끌려간다
          const k = Math.min(1, (t - t0) / 700), e = 1 - (1 - k) ** 3;
          guess = { lon: from.lon + (to.lon - from.lon) * e, lat: from.lat + (to.lat - from.lat) * e };
          redraw();
          if (k < 1 && svg.isConnected) requestAnimationFrame(pull);
        })(t0);
        toast(`🛸 견인 광선! ${Math.round(km0).toLocaleString()}km → ${Math.round(km).toLocaleString()}km`);
        sfx('power');
      }
      const pts = guess ? Math.round(1000 * Math.exp(-km / R.scale)) : 0;
      // 두 점이 다 보이게 화면 이동
      const pts2 = guess ? [guess, city] : [city];
      const xs = pts2.map((p) => p.lon * R.kx), ys = pts2.map((p) => -p.lat);
      const pad = Math.max(home0[2] / 20, (Math.max(...xs) - Math.min(...xs)) * 0.4, (Math.max(...ys) - Math.min(...ys)) * 0.4);
      const w = Math.min(home0[2], Math.max(...xs) - Math.min(...xs) + pad * 2);
      const h = Math.min(home0[3], Math.max(...ys) - Math.min(...ys) + pad * 2);
      const s = Math.max(w / home0[2], h / home0[3]);
      const cx = (Math.max(...xs) + Math.min(...xs)) / 2, cy = (Math.max(...ys) + Math.min(...ys)) / 2;
      vb = [cx - (home0[2] * s) / 2, cy - (home0[3] * s) / 2, home0[2] * s, home0[3] * s];
      settle();
      return { km, pts };
    },
  };
}
// ───────── 나라 실루엣 ─────────
const SHAPES = (window.MAP_DATA && window.MAP_DATA.shapes) || {};
// 실루엣 문제로 쓸 만한 나라인지: 너무 작거나(모나코) 작은 섬이 넓게 흩어진 나라(키리바시)는 제외
function shapeOk(iso) {
  const s = SHAPES[iso];
  if (!s) return false;
  const ext = Math.max(s.box[2], s.box[3]);
  return ext >= 1.2 && !(s.area < 0.5 && ext > 5);
}
// 나라 모양만 크게 (경도 방향은 위도에 맞춰 줄여서 실제 모양에 가깝게)
function shapeSvg(iso) {
  const s = SHAPES[iso];
  const kx = Math.cos((s.lat * Math.PI) / 180);
  const [x, y, w, h] = s.box;
  const pad = Math.max(w * kx, h) * 0.08;
  return `<svg class="sil" viewBox="${x * kx - pad} ${y - pad} ${w * kx + pad * 2} ${h + pad * 2}" preserveAspectRatio="xMidYMid meet"><g transform="scale(${kx},1)"><path d="${s.d}"/></g></svg>`;
}
// 세계 지도에서 그 나라 위치를 빨갛게 (정답 공개용)
function locatorSvg(iso) {
  const md = window.MAP_DATA || { world: [], iso: [] };
  const s = SHAPES[iso];
  const cx = s ? s.box[0] + s.box[2] / 2 : 0, cy = s ? s.box[1] + s.box[3] / 2 : 0;
  const land = md.world.map((d, i) => (md.iso[i] === iso ? '' : `<path d="${d}"/>`)).join('');
  // 강조는 날짜변경선 처리를 마친 실루엣 모양으로 (원본은 러시아처럼 ±180°에서 잘려 가로선이 생김)
  const hl = s ? `<path class="hl" d="${s.d}"/>` : '';
  const lon = ((cx + 180) % 360) - 180; // 날짜변경선 너머로 옮겨 둔 좌표를 되돌림
  return `<svg class="locator" viewBox="-170 -84 350 142" preserveAspectRatio="xMidYMid meet"><g class="lm">${land}</g>${hl}<circle class="ring" cx="${lon}" cy="${cy}" r="7"/></svg>`;
}

const distText = (km) => (!isFinite(km) ? '위치를 못 찍었어요' : km < 1 ? '1km 이내' : `${Math.round(km).toLocaleString()}km`);

/**
 * cfg: {
 *   title, qs,                     문제 목록 (q.map 이 있으면 지도 문제)
 *   hearts: 3 | null,              null 이면 목숨 없음
 *   boss: { name, emoji, img, hp } 보스전이면 대결 무대 (정답마다 데미지)
 *   timer: 초 | null,              문제당 제한 시간
 *   speed: 초 | null,              스피드 게임 (전체 제한 시간, 문제 무한)
 *   items: true,                   아이템 사용 가능
 *   resume: 이어하기 상태, onSnapshot(state): 문제마다 진행 상황 저장
 *   onEnd(result), onQuit()
 * }
 */
function runQuiz(cfg) {
  const st = {
    i: 0, results: [], streak: 0, maxStreak: 0, gained: 0, coins: 0,
    hearts: cfg.hearts ?? null, maxHearts: cfg.hearts ?? 0,
    hp: cfg.boss ? cfg.boss.hp : 0, timerLen: cfg.timer || 0,
    gauge: 0, rage: false, shield: false, boost: 0, magnet: false, revived: false,
    ...(cfg.resume || {}),
    over: false, timerId: null, left: 0, frozen: false, speedLeft: cfg.speed || 0,
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
    cfg.onEnd({ cleared, correct: correctCount(), wrong: wrongCount(), total: st.results.length, coins: st.coins, gained: st.gained, maxStreak: st.maxStreak, heartsLeft: st.hearts, qs: cfg.qs, results: st.results, times: st.times || [] });
  }
  function snapshot() {
    if (!cfg.onSnapshot || cfg.speed) return;
    const { i, results, streak, maxStreak, gained, coins, hearts, maxHearts, hp, timerLen, gauge, rage, shield, boost, magnet, revived } = st;
    cfg.onSnapshot({ i, results, streak, maxStreak, gained, coins, hearts, maxHearts, hp, timerLen, gauge, rage, shield, boost, magnet, revived, qs: cfg.qs });
  }

  function hud() {
    return topBar(cfg.title, `${st.hearts === null ? '' : heartsHtml()}<span class="chip">🪙 <b data-coins>${save.coins.toLocaleString()}</b></span>`);
  }
  const usable = (k) => {
    const it = ITEMS[k], q = cfg.qs[st.i];
    if (it.only === 'hearts' && st.hearts === null) return false;
    if (it.only === 'timer' && !cfg.timer) return false;
    if (it.only === 'text' && q && q.flags) return false;
    if (q && q.map && !it.map) return false;
    return (save.items[k] || 0) > 0;
  };
  const itemState = (k) => ((k === 'shield' && st.shield) || (k === 'magnet' && st.magnet) || (k === 'boost' && st.boost > 0) ? 'active' : '');

  function arena() {
    return `<div class="arena card ${st.rage ? 'rage' : ''}" id="arena">
      <div class="fighter me" id="me"><span id="who">${JH.think()}</span><b>${charName()}</b>
        <div class="gauge" title="필살기 게이지">${gaugeHtml()}</div></div>
      <div class="vs-mark">VS</div>
      <div class="fighter foe" id="boss"><div class="taunt" id="taunt"></div>
        <div class="boss-art">${art(cfg.boss.img, cfg.boss.emoji, 'bossimg')}</div><b>${cfg.boss.name}</b>
        <div class="hpbar"><i style="width:${(st.hp / cfg.boss.hp) * 100}%"></i></div><small>HP ${st.hp} / ${cfg.boss.hp}</small></div>
    </div>`;
  }
  const GAUGE = cfg.gaugeMax || 3; // 🚀 로켓: 2칸
  const gaugeHtml = () => [...Array(GAUGE).keys()].map((i) => `<i class="${i < st.gauge ? 'on' : ''}"></i>`).join('') + `<span>${st.gauge >= GAUGE ? '필살기 준비!' : '필살기'}</span>`;

  function render() {
    if (st.over) return;
    if (st.i >= cfg.qs.length) return end(!cfg.boss); // 문제를 다 풀었다 (보스가 살아 있으면 실패)
    snapshot();
    const q = cfg.qs[st.i];
    const isMap = !!q.map;
    const opts = isMap ? [] : shuffle([q.a, ...q.w]);
    const meta = isMap ? `${(REGIONS[q.map.r] || REGIONS.world).ic} 지도 찾기` : q.cat && CATS[q.cat] ? `${CATS[q.cat].ic} ${CATS[q.cat].name}` : '';
    const progress = cfg.speed
      ? `<div class="speedbar"><i style="width:${(st.speedLeft / cfg.speed) * 100}%"></i><span>⏱️ ${Math.ceil(st.speedLeft)}초 · 정답 ${correctCount()}개</span></div>`
      : cfg.boss ? '' : `<div class="progress">${cfg.qs.map((x, j) => `<i class="${j < st.i ? (st.results[j] === true ? 'ok' : st.results[j] === false ? 'no' : 'skip') : j === st.i ? 'now' : ''} ${x.map ? 'mapq' : ''}"></i>`).join('')}</div>`;
    const qcard = `<div class="qcard card ${isMap ? 'mapcard' : ''}">
          <div class="qmeta"><span>${meta}${cfg.speed ? '' : ` · ${st.i + 1}/${cfg.qs.length}`}</span><span class="stars">${stars(q.d)}</span></div>
          ${q.flag ? `<div class="big-flag">${q.flag}</div>` : ''}
          ${q.shape && SHAPES[q.shape] ? `<div class="silhouette">${shapeSvg(q.shape)}</div>` : ''}
          <div class="q">${esc(q.q)}</div><div id="hintbox"></div>
        </div>`;
    const owned = cfg.items === false ? [] : Object.keys(ITEMS).filter(usable);
    const itemBar = owned.length ? `<div class="itembar">${owned.map((k) => `<button class="item press ${itemState(k)}" data-item="${k}" title="${ITEMS[k].desc}"><span>${ITEMS[k].ic}</span>${ITEMS[k].name}<em>${save.items[k]}</em></button>`).join('')}</div>` : '';
    const answerArea = isMap
      ? `<div class="mapwrap quizmap"></div><button class="go press" id="mapok" disabled>지도에서 위치를 눌러 줘</button>`
      : `<div class="choices ${q.flags ? 'flags' : ''}">${opts.map((o, i) => `<button class="choice press ${q.flags ? 'flag' : ''}" data-i="${i}">${q.flags ? '' : `<span class="k">${'ABCD'[i]}</span>`}<span>${esc(o)}</span></button>`).join('')}</div>`;
    // .qa-l(문제) / .qa-r(보기): 넓은 가로 화면에서는 좌우 두 칸, 그 외에는 위아래
    $app.innerHTML = `${hud()}<div class="qa ${isMap ? 'has-map' : ''}"><div class="qa-l">${progress}
      ${cfg.boss ? arena() + qcard : `<div class="stage"><span id="who">${isMap ? JH.explorer() : JH.think()}</span>${qcard}</div>`}
      ${cfg.timer ? `<div class="timer"><i id="tbar" class="${st.frozen ? 'frozen' : ''}"></i></div>` : ''}</div>
      <div class="qa-r">${answerArea}
      ${itemBar}
      <div id="fb"></div></div></div>`;
    bindBack(async () => {
      st.paused = true; // 고민하는 동안 타이머 멈춤
      const v = await modal(`<h2>잠깐 쉴까?</h2><p>지금까지 푼 건 저장돼요. 나중에 타이틀 화면에서 <b>이어하기</b>로 계속할 수 있어요.</p><button class="go press" data-v="stay">계속하기</button><button class="ghost press" data-v="quit">지도로 나가기</button>`);
      st.paused = false;
      if (v === 'quit') { st.over = true; clearInterval(st.timerId); clearInterval(st.speedId); persist(); cfg.onQuit(); }
    });
    if (isMap) {
      const ok = document.getElementById('mapok');
      const picker = mapPicker($app.querySelector('.quizmap'), q.map, () => { ok.disabled = false; ok.textContent = '여기야! 확인 📍'; });
      ok.onclick = () => mapAnswer(q, picker, ok, false);
      st.cur = { q, picker, btn: ok };
    } else {
      const btns = [...$app.querySelectorAll('.choice')];
      btns.forEach((b) => (b.onclick = () => answer(q, opts[+b.dataset.i], btns, opts, b)));
      st.cur = { q, btns, opts };
    }
    $app.querySelectorAll('[data-item]').forEach((b) => (b.onclick = () => useItem(b.dataset.item)));
    if (cfg.boss) {
      if (st.i === 0 && !cfg.resume) setTimeout(() => say(L.start), 300);
      if (st.i === 0 && !cfg.resume && cfg.startDamage && !st.breathed) dragonBreath();
      if (st.rage && cfg.boss.img === 'boss-6' && !isMap) inkSplat(); // 문어 보스 분노: 먹물
    }
    if (cfg.timer) startTimer();
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

  function startTimer() {
    clearInterval(st.timerId);
    st.left = st.timerLen; st.frozen = false;
    const bar = document.getElementById('tbar');
    st.timerId = setInterval(() => {
      if (!bar || !bar.isConnected) return clearInterval(st.timerId); // 화면이 바뀌었으면 멈춤
      if (st.frozen || st.paused) return;
      st.left -= 0.1;
      bar.style.width = `${Math.max(0, st.left / st.timerLen) * 100}%`; bar.classList.toggle('low', st.left < 4);
      if (st.left <= 3 && Math.abs(st.left - Math.round(st.left)) < 0.05) sfx('tick');
      if (st.left <= 0) {
        clearInterval(st.timerId);
        const c = st.cur;
        if (c.picker) mapAnswer(c.q, c.picker, c.btn, true); else answer(c.q, null, c.btns, c.opts, c.btns[0]);
      }
    }, 100);
  }

  // ── 아이템 ──
  const live = (btns) => btns.filter((b) => !b.classList.contains('gone'));
  function applyHalf({ q, btns, opts }) {
    shuffle(live(btns).filter((b) => opts[+b.dataset.i] !== q.a)).slice(0, 2).forEach((b) => { b.disabled = true; b.classList.add('gone'); });
  }
  function applyOwl({ q, btns, opts }) {
    const cands = live(btns);
    const right = cands.find((b) => opts[+b.dataset.i] === q.a);
    const pickB = Math.random() < 0.8 ? right : pick(cands.filter((b) => b !== right)) || right;
    pickB.classList.add('owl');
    toast('🦉 부엉이: "음… 이게 답 같구나!"');
  }
  function applyReveal({ q, btns, opts }) { btns.find((b) => opts[+b.dataset.i] === q.a).classList.add('reveal'); }
  async function rollDice(cur) {
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
    if (face === 3) { applyHalf(cur); toast('🎲 3: 반반 발동!'); }
    if (face === 4) { st.shield = true; refreshHearts('bump'); toast('🎲 4: 방패 획득! 🛡️'); }
    if (face === 5) applyOwl(cur);
    if (face === 6) { applyReveal(cur); confetti(40); toast('🎲 6: 대박! 정답 공개! ✨'); }
    sfx(face === 1 ? 'wrong' : 'power');
  }
  function refreshHearts(cls) {
    const h = document.querySelector('.hearts');
    if (h) h.outerHTML = heartsHtml(cls);
  }
  function useItem(k) {
    const cur = st.cur;
    if (!save.items[k] || st.answered === st.i) return;
    if (k === 'heart' && st.hearts >= st.maxHearts) return toast('하트가 이미 가득해요');
    if (k === 'shield' && st.shield) return toast('방패를 이미 들고 있어요 🛡️');
    if (k === 'magnet' && st.magnet) return toast('코인 자석이 이미 켜져 있어요 🧲');
    if (k === 'hint' && document.querySelector('#hintbox b')) return;
    save.items[k]--;
    sfx('power'); buzz(20);
    const btn = document.querySelector(`[data-item=${k}]`);
    if (k === 'half') { applyHalf(cur); btn.disabled = true; }
    else if (k === 'owl') { applyOwl(cur); btn.disabled = true; }
    else if (k === 'hint') { document.getElementById('hintbox').innerHTML = `<b>🔍 초성 힌트: ${esc(choseong(cur.q.a))}</b>`; }
    else if (k === 'pass') { clearInterval(st.timerId); st.results.push(null); st.i++; persist(); return render(); }
    else if (k === 'heart') { st.hearts++; refreshHearts('bump'); }
    else if (k === 'shield') { st.shield = true; refreshHearts('bump'); toast('🛡️ 방패! 다음 실수 한 번은 괜찮아'); }
    else if (k === 'boost') { st.boost = 3; toast('⚡ 번개 부스터! 다음 3번 정답은 2배!'); }
    else if (k === 'magnet') { st.magnet = true; toast('🧲 코인 자석! 이번 스테이지 코인 2배!'); }
    else if (k === 'clock') { st.frozen = true; document.getElementById('tbar')?.classList.add('frozen'); }
    else if (k === 'dice') { rollDice(cur); }
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
    if (!boss.isConnected) return;
    st.hp = Math.max(0, st.hp - dmg);
    sfx('hit'); buzz(tags.special ? [40, 30, 60] : 30);
    boss.querySelector('.hpbar i').style.width = `${(st.hp / cfg.boss.hp) * 100}%`;
    boss.querySelector('small').textContent = `HP ${st.hp} / ${cfg.boss.hp}`;
    boss.classList.remove('hit'); void boss.offsetWidth; boss.classList.add('hit');
    burst(boss.querySelector('.boss-art'), `-${dmg}${tags.special ? '<small>필살기! 지식 폭발!</small>' : tags.crit ? '<small>크리티컬!</small>' : ''}`, tags.special ? 'special' : tags.crit ? 'crit' : '');
    if (tags.special) { confetti(60); shake(); }
    if (st.hp <= 0) {
      koEffect(boss, me, L);
    } else if (!st.rage && st.hp <= cfg.boss.hp / 2) {
      st.rage = true; st.timerLen = Math.min(st.timerLen || 20, cfg.rageTimer || 15);
      document.getElementById('arena').classList.add('rage');
      say(`😡 ${L.rage}`, 2600);
      sfx('roar');
      toast('보스가 화났다! 제한 시간 15초');
    } else say(pick(L.hit), 1500);
  }
  async function bossAttack(blocked) {
    const boss = document.getElementById('boss'), me = document.getElementById('me');
    boss.classList.remove('attack'); void boss.offsetWidth; boss.classList.add('attack');
    say(pick(L.mock), 1800);
    await shoot(boss.querySelector('.boss-art'), me.querySelector('#who'), L.atk, { spin: L.atk === '⚾' });
    if (!me.isConnected) return;
    if (blocked) { burst(me, '🛡️ 막았다!', 'crit'); sfx('coin'); return; }
    me.classList.remove('hurt'); void me.offsetWidth; me.classList.add('hurt');
    sfx('hurt'); buzz([60, 40, 60]);
    if (st.hearts !== null && st.hearts <= 0) say(L.win, 4000);
  }
  // 🐉 드래곤 브레스: 보스전이 시작되면 불을 뿜어 보스 HP 를 깎고 시작
  function dragonBreath() {
    st.breathed = true;
    const dmg = cfg.startDamage;
    st.hp = Math.max(1, st.hp - dmg);
    snapshot();
    setTimeout(async () => {
      const boss = document.getElementById('boss'), me = document.getElementById('me');
      if (!boss || !me) return;
      toast('🐉 드래곤 브레스!');
      await shoot(me.querySelector('#who'), boss.querySelector('.boss-art'), '🔥', { big: true });
      if (!boss.isConnected) return;
      sfx('hit'); buzz(40);
      boss.querySelector('.hpbar i').style.width = `${(st.hp / cfg.boss.hp) * 100}%`;
      boss.querySelector('small').textContent = `HP ${st.hp} / ${cfg.boss.hp}`;
      boss.classList.remove('hit'); void boss.offsetWidth; boss.classList.add('hit');
      burst(boss.querySelector('.boss-art'), `-${dmg}<small>드래곤 브레스!</small>`, 'special');
      say(pick(L.hit), 1500);
    }, 1100);
  }

  // 4지선다 답
  function answer(q, chosen, btns, opts, el) {
    if (st.over || st.answered === st.i || !btns[0].isConnected) return;
    btns.forEach((b, idx) => {
      b.disabled = true;
      if (opts[idx] === q.a) b.classList.add('ok');
      else if (opts[idx] === chosen) b.classList.add('no');
      else b.classList.add('dim');
    });
    settle(q, chosen === q.a, el, { timeout: chosen === null });
  }
  // 지도 문제 답
  function mapAnswer(q, picker, btn, timeout) {
    if (st.over || st.answered === st.i || !btn.isConnected) return;
    btn.disabled = true;
    const { km, pts } = picker.reveal();
    settle(q, pts >= MAP_OK, btn, { timeout, map: { km, pts } });
    btn.remove();
  }

  // 정답/오답 공통 처리
  function settle(q, ok, el, { timeout = false, map = null } = {}) {
    st.answered = st.i;
    clearInterval(st.timerId);
    const spent = st.timerLen - st.left;
    (st.times = st.times || []).push(cfg.timer ? Math.max(0, spent) : null); // 문제마다 걸린 시간(초) — 대전 점수 계산용
    $app.querySelectorAll('.item').forEach((b) => (b.disabled = true));
    document.getElementById('who').innerHTML = ok ? JH.correct() : JH.wrong();
    st.results.push(ok);
    save.recent = [...(save.recent || []), ok].slice(-30);
    save.answered++;
    save.seen[q.k] = true;
    const pc = (save.perCat[q.cat] = save.perCat[q.cat] || { n: 0, ok: 0 });
    pc.n++;
    let gain = 0, blocked = false, crit = false;
    if (ok) {
      st.streak++; st.maxStreak = Math.max(st.maxStreak, st.streak);
      save.correct++; pc.ok++;
      save.bestStreak = Math.max(save.bestStreak, st.streak);
      gain = q.d * 10 + Math.min(st.streak - 1, 5) * 2 + (map ? Math.round(map.pts / 50) : 0);
      st.gained += gain;
      const fever = st.streak >= 5;
      const boosted = st.boost > 0;
      if (boosted) st.boost--;
      const coins = (q.d + (map ? 1 : 0)) * (fever ? 2 : 1) * (st.magnet ? 2 : 1) * (boosted ? 2 : 1);
      st.coins += addCoins(coins, el); // 🏴‍☠️ 해적선이면 1.5배로 들어옴
      if (cfg.onWrongFixed) cfg.onWrongFixed(q);
      sfx(fever ? 'fever' : 'correct'); buzz(15);
      if (st.streak === 5) { document.body.classList.add('fever'); toast('🔥 피버 타임! 코인 2배!'); sikseven(document.getElementById('who')); }
      else if (st.streak > 5 && st.streak % 5 === 0) { confetti(50); toast(`🔥 ${st.streak}연속!`); sikseven(document.getElementById('who')); }
      if (cfg.boss) {
        const special = st.gauge >= GAUGE;
        crit = !!cfg.timer && spent <= (cfg.critWindow || 5); // 🚀 로켓: 8초
        st.gauge = special ? 0 : st.gauge + 1;
        let dmg = 1 + (crit ? 1 : 0) + (special ? 2 + (cfg.specialBonus || 0) : 0); // 🐉 드래곤: 필살기 +2
        if (boosted) dmg *= 2;
        st.pending = dmg;
        bossHit(dmg, { crit, special });
        const g = document.querySelector('.gauge');
        if (g) g.innerHTML = gaugeHtml();
      }
    } else {
      st.streak = 0;
      document.body.classList.remove('fever');
      sfx('wrong');
      if (!save.wrong.some((w) => w.k === q.k)) save.wrong.unshift({ k: q.k, q: q.q, a: q.a, w: q.w, d: q.d, e: q.e, flag: q.flag, flags: q.flags, cat: q.cat, map: q.map });
      save.wrong = save.wrong.slice(0, 300);
      if (st.hearts !== null) {
        if (st.shield) { st.shield = false; blocked = true; toast('🛡️ 방패가 막아 줬어!'); refreshHearts('bump'); }
        else {
          st.hearts--; shake(); buzz([60, 40, 60]); refreshHearts('hurt');
          if (st.hearts <= 0 && cfg.revive && !st.revived) { // 🚁 헬리콥터: 한 번 부활
            st.revived = true; st.hearts = 1;
            setTimeout(() => { refreshHearts('bump'); toast('🚁 구조 헬기 출동! 하트 1개로 부활!'); sfx('power'); }, 500);
          }
        }
      }
      if (cfg.boss) bossAttack(blocked);
    }
    addXp(gain);
    noteAnswer(q, ok, { map, crit, fever: ok && st.streak === 5 });
    persist();
    checkBadges();

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
    const head = map
      ? (ok ? `${map.pts >= 900 ? '거의 정확해! 🎯' : '정답! 가까워! 👏'} +${map.pts}점` : `${timeout ? '⏰ 시간 초과! ' : ''}조금 멀었어 😅 +${map.pts}점`)
      : ok ? pick(['정답! 🎉', '맞았어! 👏', '대단해! 🌟', `역시 ${charName()}! 😎`]) : `${timeout ? '⏰ 시간 초과! ' : ''}정답은 "${esc(q.a)}"`;
    const body = map ? `실제 위치(빨간 점)와 ${distText(map.km)} 떨어졌어요. (${MAP_OK}점 이상이면 정답)` : q.e ? esc(q.e) : '';
    document.getElementById('fb').innerHTML = `
      <div class="feedback card ${ok ? 'ok' : 'no'}"><b>${head}</b>${body}${q.shape && SHAPES[q.shape] ? locatorSvg(q.shape) : ''}</div>
      <button class="go press ${ok ? 'mint' : ''}" ${cfg.boss ? 'disabled' : ''}>${nextLabel}</button>`;
    const next = document.querySelector('#fb .go');
    if (cfg.boss) setTimeout(() => (next.disabled = false), bossDown ? 2600 : 700); // 공격·K.O. 연출이 끝난 뒤
    if (!map) next.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'nearest' });
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

/**
 * 지도 게임 (도시 여러 개를 연속으로)
 * cfg: { title, cities, boss: {name, emoji, img, hp(점수)}, lives: 하트 수(서바이벌), resume, onSnapshot, onEnd(result), onQuit() }
 * 서바이벌(lives): MAP_OK 점 미만이면 하트 -1, 연속으로 가까이 찍을수록 점수 배율이 올라간다 (최대 x2)
 * result: { total, log, cleared(보스일 때만 의미), bestStreak }
 */
function runMap(cfg) {
  const st = { i: 0, total: 0, log: [], bossHp: cfg.boss ? cfg.boss.hp : 0, lives: cfg.lives ?? null, streak: 0, bestStreak: 0, ...(cfg.resume || {}), over: false };
  const out = () => st.i >= cfg.cities.length || (cfg.boss && st.bossHp <= 0) || (st.lives !== null && st.lives <= 0);
  const heartsHtml = (cls = '') => (st.lives === null ? '' : `<span class="hearts ${cls}">${'❤️'.repeat(Math.max(0, st.lives))}${'🤍'.repeat(Math.max(0, cfg.lives - st.lives))}</span>`);
  const mult = () => 1 + Math.min(st.streak - 1, 5) * 0.2; // 연속 1번째 x1.0 … 6번째부터 x2.0

  function end() {
    if (st.over) return;
    st.over = true; persist();
    cfg.onEnd({ total: st.total, log: st.log, cleared: cfg.boss ? st.bossHp <= 0 : true, max: cfg.cities.length * 1000, bestStreak: st.bestStreak });
  }

  function round() {
    if (out()) return end();
    if (cfg.onSnapshot) cfg.onSnapshot({ i: st.i, total: st.total, log: st.log, bossHp: st.bossHp, cities: cfg.cities });
    if (cfg.boss && st.i === 0 && !cfg.resume) setTimeout(() => say(bossLines(cfg.boss).start), 400);
    if (cfg.boss && st.i === 0 && !cfg.resume && cfg.startDamage && !st.breathed) { // 🐉 드래곤 브레스
      st.breathed = true; st.bossHp -= cfg.startDamage;
      setTimeout(() => {
        const b = document.getElementById('boss'); if (!b) return;
        toast('🐉 드래곤 브레스!'); sfx('hit');
        b.querySelector('.hpbar i').style.width = `${(Math.max(0, st.bossHp) / cfg.boss.hp) * 100}%`;
        b.querySelector('small').textContent = `HP ${Math.max(0, st.bossHp).toLocaleString()}`;
        burst(b.querySelector('.boss-art'), `-${cfg.startDamage}<small>드래곤 브레스!</small>`, 'special');
      }, 1100);
    }
    const city = cfg.cities[st.i];
    const R = REGIONS[city.r] || REGIONS.world;
    const label = city.r === 'kr' ? esc(city.n) : `${esc(city.n)} <small>(${esc(city.co)})</small>`;
    const bossBox = cfg.boss ? `<div class="boss card mini" id="boss"><div class="taunt" id="taunt"></div><div class="boss-art">${art(cfg.boss.img, cfg.boss.emoji, 'bossimg')}</div>
      <div class="boss-info"><b>${cfg.boss.name}</b><div class="hpbar"><i style="width:${(Math.max(0, st.bossHp) / cfg.boss.hp) * 100}%"></i></div><small>HP ${Math.max(0, st.bossHp).toLocaleString()}</small></div></div>` : '';
    const streakChip = st.lives !== null && st.streak >= 1 ? `<span class="chip">🔥${st.streak}</span>` : '';
    $app.innerHTML = `${topBar(cfg.title, `${heartsHtml()}${streakChip}<span class="chip">⭐ ${st.total.toLocaleString()}</span>`)}
      <div class="qa map"><div class="qa-l">
      ${bossBox}
      <div class="stage"><span id="who">${JH.explorer()}</span>
        <div class="qcard card">
          <div class="qmeta"><span>${R.ic} ${R.name} 지도 · ${st.lives !== null ? `${st.i + 1}번째 도시` : `${st.i + 1}/${cfg.cities.length}`}</span><span class="stars">${stars(city.d)}</span></div>
          <div class="maptarget">📍 ${label}</div>
        </div>
      </div></div>
      <div class="qa-r"><div class="mapwrap"></div></div>
      <div class="qa-b"><div id="mapfb"></div>
      <button class="go press" id="confirm" disabled>지도에서 위치를 눌러 줘</button></div></div>`;
    bindBack(async () => {
      const v = await modal(`<h2>잠깐 쉴까?</h2><p>지금까지 한 건 저장돼요. 타이틀 화면에서 <b>이어하기</b>로 계속할 수 있어요.</p><button class="go press" data-v="stay">계속하기</button><button class="ghost press" data-v="quit">지도로 나가기</button>`);
      if (v === 'quit') { st.over = true; persist(); cfg.onQuit(); }
    });
    const confirmBtn = document.getElementById('confirm');
    const picker = mapPicker($app.querySelector('.mapwrap'), city, () => { confirmBtn.disabled = false; confirmBtn.textContent = '여기야! 확인 📍'; });
    let done = false;

    confirmBtn.onclick = function () {
      if (done) {
        sfx('tap');
        st.i++;
        if (out()) return end();
        return show(round);
      }
      done = true;
      const { km, pts } = picker.reveal();
      let gained = pts, lost = false;
      if (st.lives !== null) { // 서바이벌: 가까우면 연속 배율, 멀면 하트 -1
        if (pts >= MAP_OK) { st.streak++; st.bestStreak = Math.max(st.bestStreak, st.streak); gained = Math.round(pts * mult()); }
        else {
          st.streak = 0; st.lives--; lost = true; shake(); const h = document.querySelector('.hearts'); if (h) h.outerHTML = heartsHtml('hurt');
          if (st.lives <= 0 && cfg.revive && !st.revived) { st.revived = true; st.lives = 1; setTimeout(() => { const h2 = document.querySelector('.hearts'); if (h2) h2.outerHTML = heartsHtml('bump'); toast('🚁 구조 헬기 출동! 하트 1개로 부활!'); sfx('power'); }, 500); } // 🚁 헬리콥터
        }
      }
      st.total += gained;
      st.log.push({ city, km, pts });
      save.seen[city.k] = true;
      if (pts >= 900) save.ach.bull++; // 🏅 배지: 명사수
      addXp(Math.round(pts / 50));
      addCoins(pts >= 900 ? 5 : pts >= 600 ? 3 : pts >= 300 ? 1 : 0, this);
      sfx(pts >= 600 ? 'correct' : pts >= 300 ? 'coin' : 'wrong');
      buzz(pts >= 300 ? 15 : [60, 40, 60]);
      if (cfg.boss) {
        st.bossHp -= pts;
        const b = document.getElementById('boss'), me = document.getElementById('who'), BL = bossLines(cfg.boss);
        const hpNow = st.bossHp;
        const setHp = () => {
          b.querySelector('.hpbar i').style.width = `${(Math.max(0, hpNow) / cfg.boss.hp) * 100}%`;
          b.querySelector('small').textContent = `HP ${Math.max(0, hpNow).toLocaleString()}`;
        };
        if (pts >= 300) { // 정후의 공격
          shoot(me, b.querySelector('.boss-art'), pts >= 900 ? '🌟' : '⭐', { big: pts >= 900 }).then(() => {
            if (!b.isConnected) return;
            sfx('hit'); b.classList.remove('hit'); void b.offsetWidth; b.classList.add('hit');
            setHp();
            burst(b.querySelector('.boss-art'), `-${pts}${pts >= 900 ? '<small>크리티컬!</small>' : ''}`, pts >= 900 ? 'crit' : '');
            if (hpNow <= 0) koEffect(b, me, BL); else say(pick(BL.hit), 1500);
          });
        } else { // 너무 멀면 보스의 반격
          setHp();
          b.classList.remove('attack'); void b.offsetWidth; b.classList.add('attack');
          say(pick(BL.mock), 1800);
          shoot(b.querySelector('.boss-art'), me, BL.atk).then(() => { sfx('hurt'); shake(); });
        }
      }
      persist();
      checkBadges();
      document.getElementById('who').innerHTML = pts >= 300 ? JH.correct() : JH.wrong();
      if (pts >= 900) { confetti(60); sikseven(document.getElementById('who')); }
      const cheer = pts >= 900 ? '거의 정확해! 🎯' : pts >= 600 ? '아주 가까워! 👏' : pts >= 300 ? '괜찮아! 🙂' : '조금 멀었어 😅';
      const bonusTxt = gained > pts ? ` <small>(🔥${st.streak}연속 x${(gained / pts).toFixed(1)})</small>` : '';
      const lifeTxt = lost ? `<br>💔 ${MAP_OK}점이 안 돼서 하트가 하나 줄었어요.` : '';
      document.getElementById('mapfb').innerHTML = `<div class="feedback card ${pts >= 300 ? 'ok' : 'no'}"><b>${cheer} +${gained}점${bonusTxt}</b>실제 위치(빨간 점)와 ${distText(km)} 떨어졌어요.${lifeTxt}</div>`;
      const bossDown = cfg.boss && st.bossHp <= 0;
      const gameOver = st.lives !== null && st.lives <= 0;
      this.textContent = bossDown ? '보스 격파! 🎉' : gameOver ? '게임 끝! 결과 보기 🏁' : st.i === cfg.cities.length - 1 ? '결과 보기 🏁' : '다음 도시 ›';
      if (gameOver) sfx('fail');
      if (bossDown) { this.disabled = true; setTimeout(() => (this.disabled = false), 2600); }
    };
  }
  round();
}
