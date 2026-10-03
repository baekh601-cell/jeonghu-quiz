'use strict';
// 새 버전 알림
//  · 안드로이드 앱: GitHub 릴리스(app-latest / B 앱은 app-b-latest)의 빌드 번호와 설치된 앱의 빌드 번호(versionCode)를 비교해서
//    새 버전이 있으면 [지금 받기] → 휴대폰 브라우저가 APK 를 내려받는다 → 알림을 눌러 설치 (같은 서명이라 기록은 그대로).
//  · 웹(PWA): 서비스 워커가 새 파일을 받아 두면 [새로고침] 안내.
// 비행기 안처럼 인터넷이 없으면 조용히 넘어간다.
const UPDATE_REPO = 'baekh601-cell/jeonghu-quiz';
const SKIP_KEY = 'jq-update-skip'; // [나중에]를 누른 빌드 번호 (같은 빌드는 자동으로 다시 묻지 않음)
let lastUpdateCheck = 0;

async function appBuildInfo() {
  const info = await AppP.getInfo(); // { id, build(versionCode), version }
  return { build: +info.build || 0, version: info.version, isB: /\.b$/.test(info.id || '') };
}

async function checkAppUpdate(manual = false) {
  if (!AppP) { if (manual) toast('웹 버전은 열 때마다 자동으로 최신이 돼요 ✨'); return; }
  lastUpdateCheck = Date.now();
  let me;
  try {
    me = await appBuildInfo();
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(`https://api.github.com/repos/${UPDATE_REPO}/releases/tags/${me.isB ? 'app-b-latest' : 'app-latest'}`, { cache: 'no-store', signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(res.status);
    const rel = await res.json();
    const latest = +(/빌드 (\d+)/.exec(rel.name || '') || [])[1] || 0; // 릴리스 제목: "… (빌드 12)" = 빌드 번호 (android.yml)
    const apk = (rel.assets || []).find((a) => a.name.endsWith('.apk'));
    if (!apk || latest <= me.build) { if (manual) toast(`최신 버전이에요 ✨ (빌드 ${me.build})`); return; }
    let skipped = 0;
    try { skipped = +localStorage.getItem(SKIP_KEY) || 0; } catch (e) { /* 무시 */ }
    if (!manual && skipped >= latest) return;
    offerUpdate(me.build, latest, apk.browser_download_url, Math.round(apk.size / 1e6));
  } catch (e) {
    if (manual) toast(me ? '인터넷에 연결되면 확인할 수 있어요 📶' : '업데이트를 확인하지 못했어요');
  }
}

async function offerUpdate(mine, latest, url, mb) {
  if (document.querySelector('.overlay')) return; // 다른 창이 떠 있으면 방해하지 않기
  const v = await modal(`<div class="upd-ic">🎁</div><h2>새 버전이 나왔어요!</h2>
    <p>지금 빌드 ${mine} → <b>새 빌드 ${latest}</b> <small>(${mb}MB)</small></p>
    <p class="hint">[지금 받기]를 누르면 다운로드가 시작돼요.<br>다 받으면 알림(또는 다운로드 폴더)의 파일을 눌러 <b>업데이트</b>하면 끝!<br>별·코인·배지 기록은 그대로 남아요.</p>
    <button class="go press" data-v="get">⬇️ 지금 받기</button><button class="ghost press" data-v="no">나중에</button>`);
  if (v === 'get') {
    persist();
    toast('⬇️ 다운로드를 시작해요');
    location.href = url; // 앱 밖(휴대폰 브라우저)으로 열려서 APK 를 내려받는다
  } else {
    try { localStorage.setItem(SKIP_KEY, String(latest)); } catch (e) { /* 무시 */ }
  }
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
  setTimeout(() => checkAppUpdate(false), 2500);
  AppP.addListener('resume', () => {
    if (Date.now() - lastUpdateCheck > 6 * 3600e3 && document.querySelector('.title-screen, .kingdom')) checkAppUpdate(false);
  });
}
