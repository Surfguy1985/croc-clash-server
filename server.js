'use strict';

const http = require('http');
const fs   = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

// ─── Config ──────────────────────────────────────────────────────────────────
const PORT        = process.env.PORT || 3000;
const DIR         = __dirname;
const IDLE_TTL    = 5 * 60 * 1000; // 5 min
const PING_INTERVAL = 30 * 1000;   // 30 s

// ─── MIME types ──────────────────────────────────────────────────────────────
const MIME = { '.html':'text/html','.js':'text/javascript','.css':'text/css',
  '.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif',
  '.svg':'image/svg+xml','.ico':'image/x-icon','.mp3':'audio/mpeg','.ogg':'audio/ogg',
  '.wav':'audio/wav','.mp4':'video/mp4','.webm':'video/webm','.json':'application/json',
  '.woff':'font/woff','.woff2':'font/woff2' };

// ─── Static file server ──────────────────────────────────────────────────────
const httpServer = http.createServer((req, res) => {
  // Normalise path, prevent directory traversal
  let urlPath = req.url.split('?')[0];
  if (urlPath === '/') urlPath = '/index.html';
  const filePath = path.join(DIR, urlPath);
  if (!filePath.startsWith(DIR + path.sep) && filePath !== DIR) {
    res.writeHead(403); res.end('Forbidden'); return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    const ext  = path.extname(filePath).toLowerCase();
    const mime = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': mime,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache',
    });
    res.end(data);
  });
});

// ─── Room store ──────────────────────────────────────────────────────────────
// rooms: Map<code, { p1: ws, p2: ws|null, timer: Timeout }>
const rooms = new Map();

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function randomCode() { let c=''; for(let i=0;i<4;i++) c+=CHARS[Math.floor(Math.random()*CHARS.length)]; return c; }
function uniqueCode() { let c,n=0; do{c=randomCode();n++;}while(rooms.has(c)&&n<100); return c; }

function send(ws, obj) {
  if (ws && ws.readyState === 1 /* OPEN */) {
    try { ws.send(JSON.stringify(obj)); } catch (_) {}
  }
}

function closeRoom(code, reason) {
  const room = rooms.get(code);
  if (!room) return;
  clearTimeout(room.timer);
  if (reason) {
    send(room.p1, { t: 'opponent_left' });
    send(room.p2, { t: 'opponent_left' });
  }
  rooms.delete(code);
}

function scheduleIdle(code) {
  const room = rooms.get(code);
  if (!room) return;
  clearTimeout(room.timer);
  room.timer = setTimeout(() => closeRoom(code, true), IDLE_TTL);
}

function resetIdle(code) {
  scheduleIdle(code); // restart timer on any activity
}

// ─── WebSocket server ─────────────────────────────────────────────────────────
const wss = new WebSocketServer({ server: httpServer });

// Heartbeat — mark each socket alive on pong
wss.on('connection', (ws, req) => {
  ws.isAlive = true;
  ws.roomCode = null;
  ws.playerNum = null;

  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch (_) {
      send(ws, { t: 'error', msg: 'Invalid JSON' }); return;
    }
    handleMessage(ws, msg);
  });

  ws.on('close', () => onDisconnect(ws));
  ws.on('error', () => onDisconnect(ws));
});

// Ping all clients every 30 s; terminate zombies
const heartbeat = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) { ws.terminate(); return; }
    ws.isAlive = false;
    ws.ping();
  });
}, PING_INTERVAL);

wss.on('close', () => clearInterval(heartbeat));

// ─── Message handler ─────────────────────────────────────────────────────────
function handleMessage(ws, msg) {
  const { t } = msg;

  // ── create ──
  if (t === 'create') {
    // Remove from any existing room first
    if (ws.roomCode) closeRoom(ws.roomCode, true);

    const code = uniqueCode();
    rooms.set(code, { p1: ws, p2: null, timer: null });
    ws.roomCode  = code;
    ws.playerNum = 1;
    scheduleIdle(code);
    send(ws, { t: 'created', code, player: 1 });
    return;
  }

  // ── join ──
  if (t === 'join') {
    const code = (msg.code || '').toUpperCase().trim();
    const room = rooms.get(code);
    if (!room) { send(ws, { t: 'error', msg: 'Room not found' }); return; }
    if (room.p2)  { send(ws, { t: 'error', msg: 'Room full' }); return; }
    if (room.p1 === ws) { send(ws, { t: 'error', msg: 'Cannot join own room' }); return; }

    room.p2      = ws;
    ws.roomCode  = code;
    ws.playerNum = 2;
    resetIdle(code);

    send(ws,     { t: 'joined',          num: 2, code });
    send(room.p1,{ t: 'opponent_joined' });
    return;
  }

  // ── ping ──
  if (t === 'ping') { send(ws, { t: 'pong' }); return; }

  // ── input (P2 → relay to P1) ──
  if (t === 'input') {
    if (!ws.roomCode) return;
    const room = rooms.get(ws.roomCode);
    if (!room || ws.playerNum !== 2) return;
    resetIdle(ws.roomCode);
    send(room.p1, { t: 'opponent_input', inp: msg.inp });
    return;
  }

  // ── state (P1 → relay to P2) ──
  if (t === 'state') {
    if (!ws.roomCode) return;
    const room = rooms.get(ws.roomCode);
    if (!room || ws.playerNum !== 1) return;
    resetIdle(ws.roomCode);
    if (room.p2) send(room.p2, { t: 'state', s: msg.s });
    return;
  }

  send(ws, { t: 'error', msg: `Unknown message type: ${t}` });
}

// ─── Disconnect handler ───────────────────────────────────────────────────────
function onDisconnect(ws) {
  const code = ws.roomCode;
  if (!code) return;
  const room = rooms.get(code);
  if (!room) return;

  const other = ws.playerNum === 1 ? room.p2 : room.p1;
  send(other, { t: 'opponent_left' });
  closeRoom(code, false); // already notified
}

// ─── Start ────────────────────────────────────────────────────────────────────
httpServer.listen(PORT, () => {
  console.log(`Croc Clash server running → http://localhost:${PORT}`);
  console.log(`WebSocket endpoint       → ws://localhost:${PORT}`);
});
