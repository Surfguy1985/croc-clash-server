// multiplayer.js — Online Multiplayer Client for Croc Clash
const MP = (() => {
  let ws = null;
  let roomCode = null;
  let playerNum = 0;        // 1 = host, 2 = guest
  let connected = false;
  let retryCount = 0;
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 2000;
  const PING_INTERVAL = 25000;
  const STATE_THROTTLE_MS = 50; // ~20 fps

  let pingTimer = null;
  let lastStateSent = 0;
  let pendingState = null;
  let stateFlushTimer = null;
  let intentionalClose = false;

  // Callbacks
  let onOpponentInput = null;
  let onStateUpdate = null;
  let onOpponentJoined = null;
  let onOpponentLeft = null;
  let onRoomCreated = null;
  let onJoinedRoom = null;
  let onError = null;
  let onDisconnect = null;

  // ── Helpers ────────────────────────────────────────────────────────────────

  // Server URL: set window.CROC_SERVER to override (e.g. Railway URL)
  function getWSUrl() {
    if (window.CROC_SERVER) {
      const url = window.CROC_SERVER.replace(/^http/, 'ws');
      return url.endsWith('/') ? url.slice(0, -1) : url;
    }
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    return proto + '//' + location.host;
  }

  function send(obj) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      try { ws.send(JSON.stringify(obj)); } catch (e) { console.warn('[MP] send error:', e); }
    }
  }

  function startPing() {
    stopPing();
    pingTimer = setInterval(() => send({ t: 'ping' }), PING_INTERVAL);
  }

  function stopPing() {
    if (pingTimer) { clearInterval(pingTimer); pingTimer = null; }
  }

  function scheduleStateFlush() {
    if (stateFlushTimer) return;
    const now = Date.now();
    const elapsed = now - lastStateSent;
    const delay = elapsed >= STATE_THROTTLE_MS ? 0 : STATE_THROTTLE_MS - elapsed;
    stateFlushTimer = setTimeout(() => {
      stateFlushTimer = null;
      if (pendingState !== null) {
        send({ t: 'state', s: pendingState });
        pendingState = null;
        lastStateSent = Date.now();
      }
    }, delay);
  }

  // ── Connection ─────────────────────────────────────────────────────────────

  function connect() {
    intentionalClose = false;
    _connect();
  }

  function _connect() {
    if (ws) { try { ws.close(); } catch (_) {} }

    try {
      ws = new WebSocket(getWSUrl());
    } catch (e) {
      console.error('[MP] WebSocket creation failed:', e);
      if (onError) onError('Failed to create WebSocket connection.');
      return;
    }

    ws.onopen = () => {
      connected = true;
      retryCount = 0;
      console.log('[MP] Connected to server.');
      startPing();
    };

    ws.onmessage = (evt) => {
      let msg;
      try { msg = JSON.parse(evt.data); } catch (e) { console.warn('[MP] Invalid JSON:', evt.data); return; }
      handleMessage(msg);
    };

    ws.onerror = (e) => {
      console.warn('[MP] WebSocket error:', e);
    };

    ws.onclose = (evt) => {
      connected = false;
      stopPing();
      console.log('[MP] Disconnected (code=%d, intentional=%s).', evt.code, intentionalClose);
      if (intentionalClose) {
        if (onDisconnect) onDisconnect();
        return;
      }
      if (retryCount < MAX_RETRIES) {
        retryCount++;
        console.log('[MP] Reconnecting… attempt %d/%d', retryCount, MAX_RETRIES);
        setTimeout(_connect, RETRY_DELAY);
      } else {
        console.warn('[MP] Max reconnect attempts reached.');
        if (onDisconnect) onDisconnect();
        if (onError) onError('Connection lost. Please refresh and try again.');
      }
    };
  }

  // ── Message Dispatch ───────────────────────────────────────────────────────

  function handleMessage(msg) {
    switch (msg.t) {
      case 'created':
        roomCode = msg.code;
        playerNum = 1;
        if (onRoomCreated) onRoomCreated(msg.code);
        break;

      case 'joined':
        roomCode = msg.code;
        playerNum = msg.num;
        if (onJoinedRoom) onJoinedRoom(msg.num, msg.code);
        break;

      case 'opponent_joined':
        if (onOpponentJoined) onOpponentJoined();
        break;

      case 'opponent_left':
        if (onOpponentLeft) onOpponentLeft();
        break;

      case 'opponent_input':
        if (onOpponentInput) onOpponentInput(msg.inp);
        break;

      case 'state':
        if (onStateUpdate) onStateUpdate(msg.s);
        break;

      case 'error':
        console.warn('[MP] Server error:', msg.msg);
        if (onError) onError(msg.msg || 'Unknown server error.');
        break;

      case 'pong':
        // keepalive acknowledgement — no action needed
        break;

      default:
        console.warn('[MP] Unknown message type:', msg.t);
    }
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  function createRoom() {
    if (!connected) { if (onError) onError('Not connected to server.'); return; }
    send({ t: 'create' });
  }

  function joinRoom(code) {
    if (!connected) { if (onError) onError('Not connected to server.'); return; }
    if (!code || typeof code !== 'string' || code.trim() === '') {
      if (onError) onError('Invalid room code.');
      return;
    }
    send({ t: 'join', code: code.trim().toUpperCase() });
  }

  /** P2 only — send input snapshot to host */
  function sendInput(inp) {
    if (!connected || playerNum !== 2) return;
    send({ t: 'input', inp });
  }

  /** P1 only — throttled state broadcast to guest */
  function sendState(state) {
    if (!connected || playerNum !== 1) return;
    pendingState = state;
    scheduleStateFlush();
  }

  function disconnect() {
    intentionalClose = true;
    stopPing();
    if (stateFlushTimer) { clearTimeout(stateFlushTimer); stateFlushTimer = null; }
    if (ws) { try { ws.close(1000, 'Client disconnect'); } catch (_) {} ws = null; }
    connected = false;
    roomCode = null;
    playerNum = 0;
  }

  function isHost()       { return playerNum === 1; }
  function isConnected()  { return connected; }
  function getRoom()      { return roomCode; }
  function getPlayerNum() { return playerNum; }

  return {
    connect, createRoom, joinRoom, sendInput, sendState, disconnect,
    isHost, isConnected, getRoom, getPlayerNum,
    set onOpponentInput(fn)  { onOpponentInput  = fn; },
    set onStateUpdate(fn)    { onStateUpdate    = fn; },
    set onOpponentJoined(fn) { onOpponentJoined = fn; },
    set onOpponentLeft(fn)   { onOpponentLeft   = fn; },
    set onRoomCreated(fn)    { onRoomCreated    = fn; },
    set onJoinedRoom(fn)     { onJoinedRoom     = fn; },
    set onError(fn)          { onError          = fn; },
    set onDisconnect(fn)     { onDisconnect     = fn; },
  };
})();
