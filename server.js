'use strict';

const http = require('http');
const fs   = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

// ─── Config ──────────────────────────────────────────────────────────────────
const PORT          = process.env.PORT || 3000;
const DIR           = __dirname;
const IDLE_TTL      = 10 * 60 * 1000; // 10 min idle before room cleanup
const PING_INTERVAL = 25 * 1000;      // 25 s heartbeat

// ─── MIME types ──────────────────────────────────────────────────────────────
const MIME = { '.html':'text/html','.js':'text/javascript','.css':'text/css',
  '.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif',
  '.svg':'image/svg+xml','.ico':'image/x-icon','.mp3':'audio/mpeg','.ogg':'audio/ogg',
  '.wav':'audio/wav','.mp4':'video/mp4','.webm':'video/webm','.json':'application/json',
  '.woff':'font/woff','.woff2':'font/woff2' };

// ─── Static file server ──────────────────────────────────────────────────────
const httpServer = http.createServer((req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }
  // Health check
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ status: 'ok', rooms: rooms.size, clients: wss.clients.size }));
    return;
  }
  // Normalise path, prevent directory traversal
  let urlPath = req.url.split('?')[0];
  if (urlPath === '/') urlPath = '/index.html';
  // Any path that doesn't have a file extension → serve index.html (SPA fallback for ?room=XXXX)
  const ext = path.extname(urlPath).toLowerCase();
  if (!ext) urlPath = '/index.html';
  
  const filePath = path.join(DIR, urlPath);
  if (!filePath.startsWith(DIR + path.sep) && filePath !== DIR) {
    res.writeHead(403); res.end('Forbidden'); return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      // Fallback to index.html for SPA routing
      if (urlPath !== '/index.html') {
        fs.readFile(path.join(DIR, 'index.html'), (err2, data2) => {
          if (err2) { res.writeHead(404); res.end('Not found'); return; }
          res.writeHead(200, {
            'Content-Type': 'text/html',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-cache',
          });
          res.end(data2);
        });
        return;
      }
      res.writeHead(404); res.end('Not found'); return;
    }
    const mime = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': mime,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600',
    });
    res.end(data);
  });
});

// ─── Room store ──────────────────────────────────────────────────────────────
// rooms: Map<code, { p1: ws|null, p2: ws|null, timer: Timeout, created: number, inGame: boolean }>
const rooms = new Map();

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function randomCode() { let c=''; for(let i=0;i<4;i++) c+=CHARS[Math.floor(Math.random()*CHARS.length)]; return c; }
function uniqueCode() { let c,n=0; do{c=randomCode();n++;}while(rooms.has(c)&&n<100); return c; }

function send(ws, obj) {
  if (ws && ws.readyState === 1 /* OPEN */) {
    try { ws.send(JSON.stringify(obj)); } catch (_) {}
  }
}

function closeRoom(code) {
  const room = rooms.get(code);
  if (!room) return;
  clearTimeout(room.timer);
  rooms.delete(code);
  console.log(`[Room ${code}] closed (${rooms.size} rooms remaining)`);
}

function scheduleIdle(code) {
  const room = rooms.get(code);
  if (!room) return;
  clearTimeout(room.timer);
  room.timer = setTimeout(() => {
    console.log(`[Room ${code}] idle timeout`);
    // Notify both players
    send(room.p1, { t: 'room_closed', reason: 'idle' });
    send(room.p2, { t: 'room_closed', reason: 'idle' });
    closeRoom(code);
  }, IDLE_TTL);
}

// ─── WebSocket server ─────────────────────────────────────────────────────────
const wss = new WebSocketServer({ server: httpServer });

wss.on('connection', (ws, req) => {
  ws.isAlive = true;
  ws.roomCode = null;
  ws.playerNum = null;

  // Log connection origin for debugging
  const origin = req.headers.origin || 'unknown';
  console.log(`[WS] New connection from ${origin} (${wss.clients.size} total)`);

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

  // Immediately confirm connection is ready
  send(ws, { t: 'welcome' });
});

// Ping all clients every 25 s; terminate zombies
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
    leaveCurrentRoom(ws);

    const code = uniqueCode();
    rooms.set(code, { p1: ws, p2: null, timer: null, created: Date.now(), inGame: false });
    ws.roomCode  = code;
    ws.playerNum = 1;
    scheduleIdle(code);
    send(ws, { t: 'created', code, player: 1 });
    console.log(`[Room ${code}] created (${rooms.size} rooms)`);
    return;
  }

  // ── join ──
  if (t === 'join') {
    const code = (msg.code || '').toUpperCase().trim();
    if (!code || code.length !== 4) {
      send(ws, { t: 'error', msg: 'Invalid room code' }); return;
    }
    const room = rooms.get(code);
    if (!room) { send(ws, { t: 'error', msg: 'Room not found. Check the code and try again.' }); return; }
    if (room.p1 === ws) { send(ws, { t: 'error', msg: 'Cannot join your own room' }); return; }
    
    // If P2 slot is taken by a different live connection, reject
    if (room.p2 && room.p2 !== ws && room.p2.readyState === 1) {
      send(ws, { t: 'error', msg: 'Room is full' }); return;
    }

    // Remove from any previous room
    leaveCurrentRoom(ws);

    room.p2 = ws;
    ws.roomCode  = code;
    ws.playerNum = 2;
    scheduleIdle(code);

    send(ws, { t: 'joined', num: 2, code });
    send(room.p1, { t: 'opponent_joined' });
    console.log(`[Room ${code}] P2 joined`);
    return;
  }

  // ── ping ── (app-level keepalive)
  if (t === 'ping') { send(ws, { t: 'pong' }); return; }

  // ── input (P2 → relay to P1) ──
  if (t === 'input') {
    if (!ws.roomCode) return;
    const room = rooms.get(ws.roomCode);
    if (!room || ws.playerNum !== 2) return;
    // Relay to host with minimal overhead
    send(room.p1, { t: 'input', inp: msg.inp });
    return;
  }

  // ── state (P1 → relay to P2) ──
  if (t === 'state') {
    if (!ws.roomCode) return;
    const room = rooms.get(ws.roomCode);
    if (!room || ws.playerNum !== 1) return;
    room.inGame = true; // mark as active game
    if (room.p2 && room.p2.readyState === 1) {
      send(room.p2, { t: 'state', s: msg.s });
    }
    return;
  }

  // ── game_start — host confirms game launched ──
  if (t === 'game_start') {
    if (!ws.roomCode) return;
    const room = rooms.get(ws.roomCode);
    if (!room || ws.playerNum !== 1) return;
    room.inGame = true;
    scheduleIdle(ws.roomCode); // reset idle timer
    return;
  }

  // ── loadout — relay loadout selection to opponent ──
  if (t === 'loadout') {
    if (!ws.roomCode) return;
    const room = rooms.get(ws.roomCode);
    if (!room) return;
    const other = ws.playerNum === 1 ? room.p2 : room.p1;
    send(other, { t: 'loadout', lo: msg.lo, from: ws.playerNum });
    return;
  }

  // ── rematch — either player requests rematch ──
  if (t === 'rematch') {
    if (!ws.roomCode) return;
    const room = rooms.get(ws.roomCode);
    if (!room) return;
    const other = ws.playerNum === 1 ? room.p2 : room.p1;
    send(other, { t: 'rematch' });
    scheduleIdle(ws.roomCode);
    return;
  }

  // ── leave — clean disconnect ──
  if (t === 'leave') {
    leaveCurrentRoom(ws);
    return;
  }

  send(ws, { t: 'error', msg: `Unknown message type: ${t}` });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function leaveCurrentRoom(ws) {
  const code = ws.roomCode;
  if (!code) return;
  const room = rooms.get(code);
  if (!room) { ws.roomCode = null; ws.playerNum = null; return; }

  if (ws.playerNum === 1) {
    // Host left — notify P2 and close room
    send(room.p2, { t: 'opponent_left' });
    closeRoom(code);
  } else if (ws.playerNum === 2) {
    // Guest left — notify host, clear P2 slot (room stays open)
    room.p2 = null;
    room.inGame = false;
    send(room.p1, { t: 'opponent_left' });
    scheduleIdle(code);
  }
  ws.roomCode = null;
  ws.playerNum = null;
}

// ─── Disconnect handler ───────────────────────────────────────────────────────
function onDisconnect(ws) {
  if (ws._disconnected) return; // guard against double-fire
  ws._disconnected = true;
  console.log(`[WS] Disconnected (room=${ws.roomCode}, player=${ws.playerNum})`);
  leaveCurrentRoom(ws);
}

// ─── Start ────────────────────────────────────────────────────────────────────
httpServer.listen(PORT, () => {
  console.log(`Croc Clash server running → http://localhost:${PORT}`);
  console.log(`WebSocket endpoint       → ws://localhost:${PORT}`);
});
