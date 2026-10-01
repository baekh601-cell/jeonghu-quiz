'use strict';
// 실시간 대전용 연결. Supabase Realtime 의 "broadcast"(같은 방에 있는 기기끼리 메시지 중계)만 쓴다.
// 데이터베이스에는 아무것도 저장하지 않고, 방 번호를 아는 두 폰 사이에서 메시지만 오간다.
// 아래 키는 "공개용(publishable)" 키라서 앱에 넣어도 된다 (비밀 키가 아님).
const NET = {
  url: 'wss://gbebckssijkrzzwshxrl.supabase.co/realtime/v1/websocket',
  key: 'sb_publishable_nJQUsKlSEGg7m8v1zus6kg_mQaSPDjZ',
};

/**
 * 방에 들어간다.
 *   onMsg(type, data)  : 상대가 보낸 메시지
 *   onState(state)     : 'open'(연결됨) | 'retry'(끊겨서 다시 연결 중)
 * 반환: { send(type, data), close() }
 */
function openRoom(code, onMsg, onState) {
  const topic = `realtime:jq-room-${code}`;
  let ws = null, ref = 0, heartbeat = 0, joined = false, closed = false, retryTimer = 0;
  const queue = []; // 연결되기 전에 보낸 메시지는 잠깐 모아 둔다
  const raw = (event, payload, t = topic) => ws.send(JSON.stringify({ topic: t, event, payload, ref: String(++ref), join_ref: '1' }));

  function connect() {
    if (closed) return;
    ws = new WebSocket(`${NET.url}?apikey=${NET.key}&vsn=1.0.0`);
    ws.onopen = () => raw('phx_join', { config: { broadcast: { self: false, ack: false }, presence: { key: '' }, private: false } });
    ws.onmessage = (e) => {
      let m; try { m = JSON.parse(e.data); } catch (err) { return; }
      if (m.event === 'phx_reply' && m.topic === topic && m.payload && m.payload.status === 'ok' && !joined) {
        joined = true;
        onState('open');
        queue.splice(0).forEach(([type, data]) => api.send(type, data));
      } else if (m.event === 'broadcast' && m.payload) {
        onMsg(m.payload.event, m.payload.payload || {});
      }
    };
    ws.onclose = () => {
      joined = false; clearInterval(heartbeat);
      if (closed) return;
      onState('retry');
      retryTimer = setTimeout(connect, 1500);
    };
    ws.onerror = () => { try { ws.close(); } catch (err) { /* 이미 닫힘 */ } };
    clearInterval(heartbeat);
    heartbeat = setInterval(() => { if (ws.readyState === 1) raw('heartbeat', {}, 'phoenix'); }, 25000);
  }

  const api = {
    send(type, data = {}) {
      if (closed) return;
      if (!joined || ws.readyState !== 1) { if (queue.length < 30) queue.push([type, data]); return; }
      raw('broadcast', { type: 'broadcast', event: type, payload: data });
    },
    close() {
      closed = true; clearInterval(heartbeat); clearTimeout(retryTimer);
      try { ws && ws.close(); } catch (err) { /* 무시 */ }
    },
  };
  connect();
  return api;
}
