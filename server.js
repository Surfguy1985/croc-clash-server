'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { WebSocketServer, WebSocket } = require('ws');

const PORT = process.env.PORT || 3000;
const DIR = __dirname;
const IDLE_TTL = 10 * 60 * 1000;
const RECONNECT_GRACE = 25 * 1000;
const HEARTBEAT_INTERVAL = 20 * 1000;
const MAX_MESSAGE_BYTES = 96 * 1024;
const MAX_MESSAGES_PER_SEC = 180;

const MIME = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif','.svg':'image/svg+xml','.ico':'image/x-icon','.mp3':'audio/mpeg','.ogg':'audio/ogg','.wav':'audio/wav','.mp4':'video/mp4','.webm':'video/webm','.json':'application/json','.woff':'font/woff','.woff2':'font/woff2'};

const rooms = new Map();
let connectionSeq = 0;

const httpServer = http.createServer((req,res)=>{
  if(req.method==='OPTIONS'){
    res.writeHead(204,{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET, OPTIONS','Access-Control-Allow-Headers':'Content-Type'});
    return res.end();
  }
  if(req.url==='/health'){
    const liveRooms=[...rooms.values()].filter(r=>r.p1||r.p2).length;
    res.writeHead(200,{'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Cache-Control':'no-store'});
    return res.end(JSON.stringify({status:'ok',protocol:3,rooms:liveRooms,clients:wss.clients.size,uptime:Math.round(process.uptime())}));
  }
  let urlPath=req.url.split('?')[0];
  if(urlPath==='/') urlPath='/index.html';
  const ext=path.extname(urlPath).toLowerCase();
  if(!ext) urlPath='/index.html';
  const filePath=path.join(DIR,urlPath);
  if(!filePath.startsWith(DIR+path.sep)&&filePath!==DIR){res.writeHead(403);return res.end('Forbidden');}
  fs.readFile(filePath,(err,data)=>{
    if(err){
      if(urlPath!=='/index.html') return fs.readFile(path.join(DIR,'index.html'),(e,d)=>{
        if(e){res.writeHead(404);return res.end('Not found');}
        res.writeHead(200,{'Content-Type':'text/html','Access-Control-Allow-Origin':'*','Cache-Control':'no-cache'});res.end(d);
      });
      res.writeHead(404);return res.end('Not found');
    }
    res.writeHead(200,{'Content-Type':MIME[ext]||'application/octet-stream','Access-Control-Allow-Origin':'*','Cache-Control':ext==='.html'?'no-cache':'public, max-age=3600'});
    res.end(data);
  });
});

const wss = new WebSocketServer({server:httpServer,maxPayload:MAX_MESSAGE_BYTES});
const CHARS='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const randomCode=()=>Array.from({length:4},()=>CHARS[Math.floor(Math.random()*CHARS.length)]).join('');
function uniqueCode(){for(let i=0;i<100;i++){const c=randomCode();if(!rooms.has(c))return c;}return randomCode();}
const token=()=>crypto.randomBytes(18).toString('base64url');

function send(ws,obj){
  if(ws&&ws.readyState===WebSocket.OPEN){
    try{ws.send(JSON.stringify(obj));}catch(_){}
  }
}
function other(room,num){return num===1?room.p2:room.p1;}
function slot(room,num){return num===1?'p1':'p2';}
function clearGrace(room,num){const k=num===1?'p1Grace':'p2Grace';if(room[k]){clearTimeout(room[k]);room[k]=null;}}
function touchRoom(room){room.lastActive=Date.now();scheduleIdle(room.code);}
function roomStatus(room){
  return {t:'room_status',code:room.code,p1:!!room.p1,p2:!!room.p2,inGame:!!room.inGame,arena:room.arena||'boardwalk'};
}
function broadcastStatus(room){send(room.p1,roomStatus(room));send(room.p2,roomStatus(room));}

function closeRoom(code,reason='closed'){
  const room=rooms.get(code); if(!room)return;
  clearTimeout(room.idleTimer);clearGrace(room,1);clearGrace(room,2);
  send(room.p1,{t:'room_closed',reason});send(room.p2,{t:'room_closed',reason});
  for(const ws of [room.p1,room.p2]) if(ws){ws.roomCode=null;ws.playerNum=null;}
  rooms.delete(code);
  console.log('[Room '+code+'] closed: '+reason+' ('+rooms.size+' rooms)');
}
function scheduleIdle(code){
  const room=rooms.get(code);if(!room)return;
  clearTimeout(room.idleTimer);
  room.idleTimer=setTimeout(()=>closeRoom(code,'idle'),IDLE_TTL);
}

function detach(ws,{intentional=false}={}){
  const code=ws.roomCode,num=ws.playerNum;
  ws.roomCode=null;ws.playerNum=null;
  if(!code||!num)return;
  const room=rooms.get(code);if(!room)return;
  // Ignore a late close from a socket that has already been replaced by a
  // successfully resumed connection. Without this guard the old socket could
  // put a healthy room back into reconnect-pause after resume completed.
  if(room[slot(room,num)]!==ws)return;
  room[slot(room,num)]=null;
  if(intentional){
    clearGrace(room,num);
    if(num===1){closeRoom(code,'host_left');}
    else{
      room.inGame=false;send(room.p1,{t:'opponent_left',reason:'left'});broadcastStatus(room);touchRoom(room);
    }
    return;
  }
  clearGrace(room,num);
  const peer=other(room,num);
  send(peer,{t:'opponent_reconnecting',player:num,grace_ms:RECONNECT_GRACE});
  const graceKey=num===1?'p1Grace':'p2Grace';
  room[graceKey]=setTimeout(()=>{
    room[graceKey]=null;
    if(room[slot(room,num)])return;
    if(num===1){send(room.p2,{t:'opponent_left',reason:'connection_lost'});closeRoom(code,'host_connection_lost');}
    else{room.inGame=false;send(room.p1,{t:'opponent_left',reason:'connection_lost'});broadcastStatus(room);touchRoom(room);}
  },RECONNECT_GRACE);
  broadcastStatus(room);
}

function validInput(inp){
  if(!inp||typeof inp!=='object')return null;
  const keys=['left','right','up','down','attack','dash','parry','launch','power1','power2','power3','power4','rage'];
  const out={};for(const k of keys)out[k]=!!inp[k];return out;
}
function safeEvent(ev){
  if(!ev||typeof ev!=='object'||typeof ev.type!=='string'||ev.type.length>40)return null;
  const allowed=['video','slam','sfx','roundStart','matchEnd','hideVideo','screenFlash','vignette','trauma','hitStop','slowMo','rematchStart','ping_req','ping_reply','arena','emote','memoryShard','memoryCinematic'];
  return allowed.includes(ev.type)?ev:null;
}

wss.on('connection',(ws,req)=>{
  ws.id=++connectionSeq;ws.isAlive=true;ws.roomCode=null;ws.playerNum=null;ws.rateWindow=Date.now();ws.rateCount=0;ws._detached=false;
  ws.on('pong',()=>{ws.isAlive=true;});
  ws.on('message',raw=>{
    if(raw.length>MAX_MESSAGE_BYTES){send(ws,{t:'error',msg:'Message too large'});return;}
    const now=Date.now();
    if(now-ws.rateWindow>=1000){ws.rateWindow=now;ws.rateCount=0;}
    if(++ws.rateCount>MAX_MESSAGES_PER_SEC){send(ws,{t:'error',msg:'Too many messages'});return;}
    let msg;try{msg=JSON.parse(raw);}catch(_){send(ws,{t:'error',msg:'Invalid message'});return;}
    handleMessage(ws,msg);
  });
  ws.on('close',()=>{if(!ws._detached){ws._detached=true;detach(ws,{intentional:false});}});
  ws.on('error',()=>{});
  send(ws,{t:'welcome',protocol:3,id:ws.id,reconnect_grace_ms:RECONNECT_GRACE});
});

const heartbeat=setInterval(()=>{
  wss.clients.forEach(ws=>{
    if(!ws.isAlive){try{ws.terminate();}catch(_){}return;}
    ws.isAlive=false;try{ws.ping();}catch(_){}
  });
},HEARTBEAT_INTERVAL);
wss.on('close',()=>clearInterval(heartbeat));

function handleMessage(ws,msg){
  const t=msg&&msg.t;
  if(t==='ping'){send(ws,{t:'pong',ts:Date.now()});return;}

  if(t==='create'){
    detach(ws,{intentional:true}); ws._detached=false;
    const code=uniqueCode();
    const room={code,p1:ws,p2:null,p1Token:token(),p2Token:null,p1Grace:null,p2Grace:null,idleTimer:null,created:Date.now(),lastActive:Date.now(),inGame:false,arena:'boardwalk'};
    rooms.set(code,room);ws.roomCode=code;ws.playerNum=1;touchRoom(room);
    send(ws,{t:'created',code,num:1,resume_token:room.p1Token,protocol:3});broadcastStatus(room);return;
  }

  if(t==='join'){
    const code=String(msg.code||'').toUpperCase().trim();
    if(!/^[A-Z2-9]{4}$/.test(code)){send(ws,{t:'error',msg:'Enter a valid 4-character room code.'});return;}
    const room=rooms.get(code);
    if(!room){send(ws,{t:'error',msg:'Room not found. Check the code and try again.'});return;}
    if(room.p2&&room.p2!==ws&&room.p2.readyState===WebSocket.OPEN){send(ws,{t:'error',msg:'Room is full.'});return;}
    detach(ws,{intentional:true}); ws._detached=false;
    room.p2=ws;room.p2Token=token();ws.roomCode=code;ws.playerNum=2;clearGrace(room,2);touchRoom(room);
    send(ws,{t:'joined',num:2,code,resume_token:room.p2Token,protocol:3,arena:room.arena});
    send(room.p1,{t:'opponent_joined',player:2});broadcastStatus(room);return;
  }

  if(t==='resume'){
    const code=String(msg.code||'').toUpperCase().trim(), resume=String(msg.resume_token||'');
    const room=rooms.get(code);
    if(!room||!resume){send(ws,{t:'resume_failed'});return;}
    let num=0;if(resume===room.p1Token)num=1;else if(resume===room.p2Token)num=2;
    if(!num){send(ws,{t:'resume_failed'});return;}
    const key=slot(room,num),existing=room[key];
    if(existing&&existing!==ws&&existing.readyState===WebSocket.OPEN){try{existing.close(4001,'Session resumed elsewhere');}catch(_){}}
    room[key]=ws;ws.roomCode=code;ws.playerNum=num;ws._detached=false;clearGrace(room,num);touchRoom(room);
    send(ws,{t:'resumed',code,num,resume_token:resume,inGame:room.inGame,arena:room.arena});
    send(other(room,num),{t:'opponent_resumed',player:num});broadcastStatus(room);return;
  }

  const code=ws.roomCode, num=ws.playerNum, room=code?rooms.get(code):null;
  if(!room||!num){send(ws,{t:'error',msg:'You are not in a room.'});return;}
  touchRoom(room);

  if(t==='input'){
    if(num!==2)return;
    const inp=validInput(msg.inp);if(inp)send(room.p1,{t:'input',inp});return;
  }
  if(t==='state'){
    if(num!==1||!msg.s||typeof msg.s!=='object')return;
    room.inGame=true;if(typeof msg.s.arena==='string')room.arena=msg.s.arena;
    send(room.p2,{t:'state',s:msg.s});return;
  }
  if(t==='game_start'){
    if(num!==1)return;
    room.inGame=true;if(typeof msg.arena==='string')room.arena=msg.arena;
    send(room.p2,{t:'game_start',arena:room.arena});broadcastStatus(room);return;
  }
  if(t==='loadout'){
    const lo=msg.lo&&typeof msg.lo==='object'?msg.lo:null;if(!lo)return;
    send(other(room,num),{t:'loadout',lo,from:num});return;
  }
  if(t==='event'){
    const ev=safeEvent(msg.ev);if(!ev)return;
    // Guest may send only lightweight social/network events. Authoritative
    // game transitions, match results, videos and memory rewards remain host-only.
    const guestAllowed=new Set(['emote','ping_req','ping_reply']);
    if(num===2&&!guestAllowed.has(ev.type))return;
    if(ev.type==='emote'){
      const allowedEmoji=new Set(['👑','😂','🏈','🕺','🥒','❤️','😎']);
      ev.emoji=allowedEmoji.has(String(ev.emoji||''))?String(ev.emoji):'😎';
    }
    if(ev.type==='arena'&&num===1&&typeof ev.arena==='string')room.arena=ev.arena;
    send(other(room,num),{t:'event',ev});return;
  }
  if(t==='rematch'){room.inGame=false;send(other(room,num),{t:'rematch',from:num});return;}
  if(t==='status'){send(ws,roomStatus(room));return;}
  if(t==='leave'){ws._detached=true;detach(ws,{intentional:true});return;}
  send(ws,{t:'error',msg:'Unknown message type.'});
}

httpServer.listen(PORT,()=>{
  console.log('Croc Clash multiplayer v3 on port '+PORT);
});
