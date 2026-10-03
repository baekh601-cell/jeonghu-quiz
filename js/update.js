'use strict';
// 새 버전 알림
//  · 안드로이드 앱: 릴리스(app-latest / B 앱은 app-b-latest)에 함께 올라가는 version.json 의 빌드 번호와
//    설치된 앱의 빌드 번호(versionCode)를 비교한다. 새 버전이 있으면 [새 버전 받기] → 휴대폰 브라우저가 APK 를 내려받고
//    → 알림을 눌러 설치 (같은 서명이라 기록은 그대로).
//    · GitHub API 는 통신사 망(여러 사람이 IP 하나를 같이 씀)에서 시간당 60회 제한에 자주 걸려서 쓰지 않고, 예비로만 쓴다.
//    · 웹뷰의 fetch 대신 앱의 네이티브 HTTP(CapacitorHttp)로 읽는다 (리다이렉트·CORS 문제 없음).
//    · 타이틀 화면에 "앱 빌드 N · 최신/새 버전/확인 실패" 를 항상 보여 줘서, 조용히 실패하는 일이 없게 한다.
//  · 웹(PWA): 서비스 워커가 새 파일을 받아 두면 [새로고침] 안내.
const UPDATE_REPO = 'baekh601-cell/jeonghu-quiz';
const UPDATE_BASE = `https://github.com/${UPDATE_REPO}/releases/download`;
const SKIP_KEY = 'jq-update-skip'; // [나중에]를 누른 빌드 번호 (같은 빌드는 자동으로 다시 묻지 않음)
const upd = { build: 0, isB: false, latest: 0, url: '', state: 'idle', err: '' };
let lastUpdateCheck = 0;
const NativeHttp = NATIVE ? (window.Capacitor.Plugins?.CapacitorHttp || window.Capacitor.registerPlugin?.('CapacitorHttp')) : null;

async function getJson(url, headers = {}) {
  if (NativeHttp) {
    const r = await NativeHttp.get({ url, headers, responseType: 'text', connectTimeout: 10000, readTimeout: 10000 });
    if (!r || r.status >= 400) throw new Error(`HTTP ${r && r.status}`);
    return typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
  }
  const res = await fetch(url, { cache: 'no-store', headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function appBuildInfo() {
  if (upd.build) return upd;
  const info = await AppP.getInfo(); // { id, build(versionCode), version }
  upd.build = +info.build || 0;
  upd.isB = /\.b$/.test(info.id || '');
  return upd;
}

// 최신 빌드 번호: version.json → (실패하면) GitHub API
async function latestBuild(tag) {
  try {
    const v = await getJson(`${UPDATE_BASE}/${tag}/version.json?t=${Date.now()}`);
    if (+v.build) return { build: +v.build, apk: v.apk };
  } catch (e) { /* 아직 version.json 이 없는 릴리스거나 일시 오류 → API 로 */ }
  const rel = await getJson(`https://api.github.com/repos/${UPDATE_REPO}/releases/tags/${tag}`, { Accept: 'application/vnd.github+json', 'User-Agent': 'jeonghu-quiz-app' });
  const apk = (rel.assets || []).find((a) => a.name.endsWith('.apk'));
  return { build: +(/빌드 (\d+)/.exec(rel.name || '') || [])[1] || 0, apk: apk && apk.name };
}

async function checkAppUpdate(manual = false) {
  if (!AppP) { if (manual) toast('웹 버전은 열 때마다 자동으로 최신이 돼요 ✨'); return; }
  if (upd.state === 'checking') return;
  lastUpdateCheck = Date.now();
  upd.state = 'checking'; paintUpd();
  try {
    await appBuildInfo();
    const tag = upd.isB ? 'app-b-latest' : 'app-latest';
    const L = await latestBuild(tag);
    upd.latest = L.build;
    upd.url = `${UPDATE_BASE}/${tag}/${L.apk || (upd.isB ? 'jeonghu-quiz-b.apk' : 'jeonghu-quiz.apk')}`;
    upd.state = upd.latest > upd.build ? 'new' : 'ok';
    paintUpd();
    if (upd.state === 'ok') { if (manual) toast(`최신 버전이에요 ✨ (빌드 ${upd.build})`); return; }
    let skipped = 0;
    try { skipped = +localStorage.getItem(SKIP_KEY) || 0; } catch (e) { /* 무시 */ }
    if (manual || skipped < upd.latest) offerUpdate();
  } catch (e) {
    upd.state = 'fail'; upd.err = String((e && e.message) || e).slice(0, 80);
    paintUpd();
    if (manual) toast('📶 새 버전을 확인하지 못했어요. 인터넷 연결을 확인해 줘');
  }
}

async function offerUpdate() {
  if (document.querySelector('.overlay')) return; // 다른 창이 떠 있으면 방해하지 않기 (타이틀의 버튼은 남아 있음)
  const v = await modal(`<div class="upd-ic">🎁</div><h2>새 버전이 나왔어요!</h2>
    <p>지금 빌드 ${upd.build} → <b>새 빌드 ${upd.latest}</b></p>
    <p class="hint">[지금 받기]를 누르면 브라우저에서 다운로드가 시작돼요.<br>다 받으면 알림(또는 다운로드 폴더)의 파일을 눌러 <b>업데이트</b>하면 끝!<br>별·코인·배지 기록은 그대로 남아요.</p>
    <button class="go press" data-v="get">⬇️ 지금 받기</button><button class="ghost press" data-v="no">나중에</button>`);
  if (v === 'get') openDownload();
  else try { localStorage.setItem(SKIP_KEY, String(upd.latest)); } catch (e) { /* 무시 */ }
}

function openDownload() {
  persist();
  toast('⬇️ 브라우저에서 다운로드를 시작해요');
  location.href = upd.url; // 앱 밖의 주소는 Capacitor 가 휴대폰 브라우저로 넘겨서 연다
}

// 타이틀 화면의 앱 버전 줄
function paintUpd() {
  const el = document.getElementById('updline');
  if (!el) return;
  const b = upd.build ? `앱 빌드 ${upd.build}` : '앱';
  el.className = `updline ${upd.state}`;
  el.innerHTML = upd.state === 'new'
    ? `<button class="go press" data-upd-get>🎁 새 버전 받기 <small>빌드 ${upd.build} → ${upd.latest}</small></button>`
    : upd.state === 'checking' ? `📱 ${b} · 새 버전 확인 중…`
    : upd.state === 'ok' ? `📱 ${b} · 최신 버전이에요 ✓ <button class="linkbtn" data-upd>다시 확인</button>`
    : upd.state === 'fail' ? `📱 ${b} · 확인 실패 <small>(${esc(upd.err)})</small> <button class="linkbtn" data-upd>다시 확인</button>`
    : `📱 ${b} <button class="linkbtn" data-upd>업데이트 확인</button>`;
  el.querySelector('[data-upd]')?.addEventListener('click', () => { sfx('tap'); checkAppUpdate(true); });
  el.querySelector('[data-upd-get]')?.addEventListener('click', () => { sfx('tap'); openDownload(); });
}

// 웹: 서비스 워커가 새 버전으로 바뀌면 (처음 설치 때는 제외) 새로고침 안내
if (!AppP && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (document.querySelector('.qa')) return toast('🎁 새 버전이 준비됐어요! 다음에 열 때 바뀌어요');
    modal('<div class="upd-ic">🎁</div><h2>새 버전 준비 완료!</h2><p>새로고침하면 바로 바뀌어요. 기록은 그대로예요.</p><button class="go press" data-v="go">🔄 새로고침</button><button class="ghost press" data-v="no">나중에</button>')
      .then((v) => { if (v === 'go') { persist(); location.reload(); } });
  });
}

// 앱: 켤 때 한 번, 그리고 오래 백그라운드에 있다가 돌아왔을 때 (문제 푸는 중에는 묻지 않음)
if (AppP) {
  appBuildInfo().then(paintUpd).catch(() => {});
  setTimeout(() => checkAppUpdate(false), 1500);
  AppP.addListener('resume', () => {
    if (Date.now() - lastUpdateCheck > 3 * 3600e3 && document.querySelector('.title-screen, .kingdom')) checkAppUpdate(false);
  });
}
