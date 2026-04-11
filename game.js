// ============================================================
//  CROC CLASH — PRODUCTION v4.0
//  Pillow-launch KO system, cinematic video specials,
//  premium arcade SFX, fixed camera, easier AI
// ============================================================
(() => {
'use strict';

// ─── ARENA ───
const AW = 960, AH = 540;
const FLOOR_Y = AH - 58;
const MAX_HP = 6; // 6 pillow-launch hits = KO
const ROUND_TIME = 45, ROUNDS_TO_WIN = 2;

// ─── FIGHTERS ───
const CW = 140, CH = 200;
const MOVE_SPD = 220, GRAVITY = 700, JUMP_VEL = -400;
const ATK_RANGE = 115, ATK_CD = 0.22;
const DASH_SPD = 580, DASH_DUR = 0.18, DASH_CD = 0.7;
const SPEC_CD = 3.0, SPEC_DUR = 0.65;
const TAIL_RANGE = 135, TAIL_CD = 1.4;
const PARRY_WIN = 0.18, PARRY_CD = 0.55, PARRY_STUN = 0.6;
const LAUNCH_CD = 1.6, LAUNCH_SPD = 700, PILLOW_SIZE = 40;
const KB = 280, KB_UP = -160;
const COMEBACK_TH = 2; // Comeback when HP <= 2

// ─── JUICE ───
const HS_LIGHT=0.04, HS_HEAVY=0.12, HS_KO=0.3, HS_PARRY=0.1, HS_TAIL=0.16, HS_LAUNCH=0.2;
const SLO_DUR=0.8, SLO_SCALE=0.15, TRAUMA_DECAY=1.8;

// ─── UTILS ───
const lerp=(a,b,t)=>a+(b-a)*t, clamp=(v,l,h)=>Math.max(l,Math.min(h,v));
const dist=(x1,y1,x2,y2)=>Math.hypot(x2-x1,y2-y1);
const rand=(a,b)=>Math.random()*(b-a)+a, randInt=(a,b)=>Math.floor(rand(a,b+1));
const pick=a=>a[randInt(0,a.length-1)];
const TAU=Math.PI*2;
const _ps=Math.random()*1e3;
function noise1D(x){const i=Math.floor(x),f=x-i,u=f*f*(3-2*f);const a=Math.sin(i*127.1+_ps)*43758.5453;const b=Math.sin((i+1)*127.1+_ps)*43758.5453;return lerp(a-Math.floor(a),b-Math.floor(b),u)*2-1}

// ─── FUNNY TEXT ───
const ROUND_INTROS=["PILLOW FIGHT!!","FEATHERS WILL FLY!!","IT'S SMACKIN' TIME!!","BRANSON BRAWL!!","FLUFF 'EM UP!!","NOBODY SLEEPS TONIGHT!!","CROCS OUT!!"];
const KO_LINES=["NAPTIME!!","TOTALLY FLUFFED!!","LIGHTS OUT!!","FEATHERED!!","PILLOW'D!!","SLEEP TIGHT!!","BEDTIME!!"];
const PERFECT_LINES=["FLAWLESS FLUFF!!","UNTOUCHABLE!!","PILLOW PERFECTION!!"];
const PARRY_LINES=["DENIED!!","NOT TODAY!!","BLOCKED!!","NOPE!!"];
const COMEBACK_LINES=["RAGE MODE!!","CROC FURY!!","LAST STAND!!"];
const WIN_LINES=["is the Branson Pillow Champion!","reigns supreme on the Strip!","has the fluffiest swing in Missouri!","sent them to the Baldknobbers!"];
const COMBO_MS={3:"NICE!",5:"COMBO!",8:"FEATHER STORM!",12:"UNSTOPPABLE!!"};
const DMG_WORDS=["bonk","floof","thwap","smack","poof","bap","whap"];
const TAIL_WORDS=["TAIL WHIP!!","CROC SWIPE!!","WHIPLASH!!"];
const LAUNCH_HIT_WORDS=["DIRECT HIT!!","PILLOW BOMB!!","BULLSEYE!!","INCOMING!!","FLUFFED!!"];

// ─── IMAGE LOADING ───
const images = {};
let imagesLoaded = 0;
const IMAGE_LIST = [
  ['arena','arena-bg.png'],['gary','gary-sprite.png'],['carl','carl-sprite.png'],
  ['garyCU','gary-closeup.png'],['carlCU','carl-closeup.png']
];
function loadImages(cb) {
  if(IMAGE_LIST.length === 0) { cb(); return; }
  IMAGE_LIST.forEach(([key, src]) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { images[key] = img; imagesLoaded++; if(imagesLoaded >= IMAGE_LIST.length) cb(); };
    img.onerror = () => { imagesLoaded++; if(imagesLoaded >= IMAGE_LIST.length) cb(); };
    img.src = src;
  });
}

// ─── AUDIO ENGINE (arcade SFX only, no narration) ───
let actx = null;
function initAudio() {
  if(!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
  if(actx.state === 'suspended') actx.resume();
}
function tone(f,d,tp='square',v=.1,dl=0){if(!actx)return;try{const t=actx.currentTime+dl;const o=actx.createOscillator(),g=actx.createGain();o.type=tp;o.frequency.setValueAtTime(f,t);g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(g).connect(actx.destination);o.start(t);o.stop(t+d)}catch(e){}}
function sfxHit(c){const p=200+Math.min(c,20)*10+rand(-8,8);tone(p,.1,'sawtooth',.14);tone(p*1.5,.05,'square',.06)}
function sfxParry(){tone(880,.06,'sine',.16);tone(1320,.08,'sine',.12,.02);tone(1760,.06,'sine',.08,.05)}
function sfxDash(){tone(300,.08,'triangle',.08);tone(480,.05,'sine',.05)}
function sfxBounce(){tone(400+rand(-15,15),.05,'sine',.08);tone(600,.03,'sine',.04)}
function sfxSpecial(){tone(150,.35,'sawtooth',.1);tone(240,.25,'square',.07,.04);tone(400,.18,'sine',.05,.08)}
function sfxTailWhip(){tone(110,.25,'sawtooth',.18);tone(220,.18,'square',.13,.04);tone(380,.12,'triangle',.08,.08)}
function sfxKO(){tone(80,.6,'sawtooth',.22);tone(60,.7,'square',.18,.1);tone(180,.35,'sine',.12,.25)}
function sfxRound(){tone(523,.08,'square',.08);tone(659,.08,'square',.08,.08);tone(784,.15,'square',.1,.16)}
function sfxPerfect(){tone(523,.06,'sine',.12);tone(659,.06,'sine',.12,.06);tone(784,.06,'sine',.12,.12);tone(1047,.2,'sine',.14,.18)}
function sfxCombo(c){const b=420+c*12;tone(b,.1,'square',.1);tone(b*1.25,.1,'square',.08,.05);tone(b*1.5,.15,'square',.1,.1)}
function sfxComeback(){tone(100,.25,'sawtooth',.16);tone(160,.18,'square',.12,.1)}
function sfxLaunch(){tone(180,.15,'triangle',.14);tone(350,.12,'sine',.1,.04);tone(550,.08,'sine',.07,.08)}
function sfxLaunchHit(){tone(80,.3,'sawtooth',.2);tone(120,.25,'square',.15,.05);tone(250,.2,'sine',.1,.1);tone(500,.15,'sine',.08,.15)}
function sfxFlyUp(){tone(200,.4,'sine',.12);tone(300,.35,'sine',.1,.05);tone(450,.3,'sine',.08,.1)}
function sfxLand(){tone(60,.35,'sawtooth',.18);tone(90,.25,'square',.14,.05)}

// ─── VIDEO OVERLAY (cinematic cutscenes — short bursts) ───
let videoPlaying = false;
let videoEl = null;
let videoTimeout = null;
function initVideoOverlay() {
  videoEl = document.getElementById('special-video');
  if(!videoEl) return;
  videoEl.addEventListener('ended', () => { hideVideo(); });
  videoEl.addEventListener('error', () => { hideVideo(); });
  // Click/tap to skip
  videoEl.addEventListener('click', () => { hideVideo(); });
  videoEl.addEventListener('touchstart', () => { hideVideo(); });
}
function playSpecialVideo(src, duration) {
  duration = duration || 3500;
  if(!videoEl || videoPlaying) return;
  videoEl.src = src;
  videoEl.style.display = 'block';
  videoEl.play().catch(() => { hideVideo(); });
  videoPlaying = true;
  if(videoTimeout) clearTimeout(videoTimeout);
  videoTimeout = setTimeout(() => { if(videoPlaying) hideVideo(); }, duration);
}
function hideVideo() {
  if(!videoEl) return;
  videoEl.pause();
  videoEl.style.display = 'none';
  videoEl.removeAttribute('src');
  videoPlaying = false;
  if(videoTimeout) { clearTimeout(videoTimeout); videoTimeout = null; }
}

// ─── CANVAS ───
const canvas = document.getElementById('gc'), ctx = canvas.getContext('2d');
let W, H, sc, ox, oy;
function resize() { W = innerWidth; H = innerHeight; canvas.width = W; canvas.height = H; sc = Math.min(W / AW, H / AH); ox = (W - AW * sc) / 2; oy = (H - AH * sc) / 2; }
addEventListener('resize', resize); resize();

// ─── INPUT ───
const keys = {}, jp = {};
document.addEventListener('keydown', e => { if(!keys[e.code]) jp[e.code] = true; keys[e.code] = true; e.preventDefault(); });
document.addEventListener('keyup', e => { keys[e.code] = false; });
const ts = {up:0,down:0,left:0,right:0,attack:0,dash:0,special:0,parry:0,tailwhip:0,launch:0};
document.querySelectorAll('.dpad-btn').forEach(b => {
  const d = b.dataset.dir;
  b.addEventListener('touchstart', e => { e.preventDefault(); ts[d] = 1; }, {passive:false});
  b.addEventListener('touchend', e => { e.preventDefault(); ts[d] = 0; }, {passive:false});
});
document.querySelectorAll('.abtn').forEach(b => {
  const a = b.dataset.action;
  b.addEventListener('touchstart', e => { e.preventDefault(); ts[a] = 1; }, {passive:false});
  b.addEventListener('touchend', e => { e.preventDefault(); ts[a] = 0; }, {passive:false});
});

// ─── PROJECTILES (pillow launch) ───
const projectiles = [];
function spawnPillow(owner, opponent, face) {
  const px = owner.x + owner.w/2 + face * 50;
  const py = owner.y + owner.h * 0.35;
  projectiles.push({
    x: px, y: py, vx: face * LAUNCH_SPD, vy: -40,
    w: PILLOW_SIZE, h: PILLOW_SIZE * 0.7,
    owner, face, alive: true, rot: 0, trail: []
  });
  sfxLaunch();
  feathers(px, py, 8, '#fff');
}
function updateProjectiles(dt, opponent) {
  for(let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 80 * dt; // slight arc
    p.rot += p.face * 12 * dt;
    // Trail
    p.trail.push({x: p.x, y: p.y, life: 0.3});
    if(p.trail.length > 15) p.trail.shift();
    for(let t = p.trail.length - 1; t >= 0; t--) { p.trail[t].life -= dt; if(p.trail[t].life <= 0) p.trail.splice(t, 1); }
    // Feather trail
    if(Math.random() < dt * 15) feathers(p.x, p.y, 1, '#fff');

    // Hit check
    if(p.alive && opponent.alive && !opponent.launched &&
       Math.abs(p.x - (opponent.x + opponent.w/2)) < 65 &&
       Math.abs(p.y - (opponent.y + opponent.h/2)) < 70) {
      // DIRECT HIT — launch opponent into the air
      p.alive = false;
      pillowHit(p.owner, opponent, p.face);
    }
    // Out of bounds
    if(p.x < -60 || p.x > AW + 60 || p.y > AH + 60) {
      projectiles.splice(i, 1);
      continue;
    }
    if(!p.alive) { projectiles.splice(i, 1); }
  }
}
function drawProjectiles() {
  for(const p of projectiles) {
    // Trail glow
    for(const t of p.trail) {
      const a = clamp(t.life / 0.3, 0, 1) * 0.3;
      ctx.save(); ctx.globalAlpha = a;
      ctx.fillStyle = '#ffd740'; ctx.shadowColor = '#ffd740'; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(t.x, t.y, 8, 0, TAU); ctx.fill();
      ctx.shadowBlur = 0; ctx.restore();
    }
    // Pillow
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    // Glow
    ctx.shadowColor = '#ffd740'; ctx.shadowBlur = 18;
    // White pillow shape
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(0, 0, p.w/2, p.h/2, 0, 0, TAU);
    ctx.fill();
    // Pillow highlight
    ctx.fillStyle = 'rgba(255,215,64,.3)';
    ctx.beginPath();
    ctx.ellipse(-4, -4, p.w/3, p.h/3, 0, 0, TAU);
    ctx.fill();
    // Pillow seam
    ctx.strokeStyle = 'rgba(200,180,150,.4)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-p.w/3, 0); ctx.lineTo(p.w/3, 0); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();
  }
}

// ─── PILLOW HIT — Launch victim into the air ───
function pillowHit(attacker, victim, dir) {
  victim.hp = Math.max(0, victim.hp - 1);
  victim.launched = true;
  victim.launchVy = -480;
  victim.launchVx = dir * 120;
  victim.launchSpin = dir * 6;
  victim.launchRot = 0;
  victim.launchPhase = 'up'; // up -> hang -> down -> land
  victim.launchTimer = 0;
  victim.grounded = false;
  victim.hitFlash = 0.25;

  attacker.combo++;
  attacker.comboT = 2;
  attacker.hits++;
  if(attacker.combo > attacker.maxCombo) attacker.maxCombo = attacker.combo;

  // Massive FX
  hitStop(HS_LAUNCH);
  addTrauma(0.65);
  sfxLaunchHit();
  sfxFlyUp();
  screenFlash('rgba(255,215,64,.3)', 0.15);
  feathers(victim.x + victim.w/2, victim.y + victim.h/2, 30, '#fff');
  sparks(victim.x + victim.w/2, victim.y + victim.h/2, 18, '#ffd740');
  shockwave(victim.x + victim.w/2, victim.y + victim.h/2, 'rgba(255,200,0,.6)');
  fText(victim.x + victim.w/2, victim.y - 40, pick(LAUNCH_HIT_WORDS), '#ffd740', 34, 1.5);
  bloomInt = 0.6; chromAb = 0.5;

  // Play cinematic video ONLY on KO (the killing blow)
  const hitsLanded = MAX_HP - victim.hp;

  // Check for KO
  if(victim.hp <= 0) {
    victim.launchIsKO = true;
    slowMo(SLO_DUR + 0.5, SLO_SCALE);
    playSpecialVideo('video/special-ko.mp4', 4000);
  } else {
    slowMo(0.5, 0.2);
  }

  // HP pips update
  const hpText = `${victim.hp}/${MAX_HP}`;
  slam(`-1 HP! (${hpText})`, '#ff3d00', 1.2);

  if(COMBO_MS[attacker.combo]) {
    setTimeout(() => { slam(COMBO_MS[attacker.combo], '#ffd740', 1); sfxCombo(attacker.combo); stars(attacker.x+attacker.w/2, attacker.y, 10); }, 400);
  }
}

// ─── UPDATE LAUNCHED CROC ───
function updateLaunched(c, dt) {
  c.launchTimer += dt;
  c.launchRot += c.launchSpin * dt;
  c.x += c.launchVx * dt;
  c.y += c.launchVy * dt;
  c.launchVy += GRAVITY * 0.6 * dt;

  // Feather trail while airborne
  if(Math.random() < dt * 8) feathers(c.x + c.w/2, c.y + c.h/2, 1, '#fff');

  // Clamp X
  c.x = clamp(c.x, 10, AW - c.w - 10);

  // Landing
  if(c.y + c.h >= FLOOR_Y && c.launchVy > 0) {
    c.y = FLOOR_Y - c.h;
    c.launched = false;
    c.launchRot = 0;
    c.grounded = true;
    c.vy = 0;
    c.vx = 0;
    // Landing impact FX
    addTrauma(0.5);
    sfxLand();
    shockwave(c.x + c.w/2, FLOOR_Y, 'rgba(255,150,0,.5)');
    feathers(c.x + c.w/2, FLOOR_Y - 10, 15, '#fff');
    embers(c.x + c.w/2, FLOOR_Y - 10, 8);
    screenFlash('rgba(255,100,0,.15)', 0.08);
    c.squash = 1.5; c.stretch = 0.6;
    // Brief stun after landing from launch
    c.stunned = true;
    c.stunT = 0.6;

    if(c.launchIsKO) {
      c.alive = false;
      c.dead = true;
      c.deathVx = c.launchVx * 0.5;
      c.deathVy = -60;
      c.deathRotV = c.launchSpin * 0.3;
      c.deathRot = c.launchRot;
      hitStop(HS_KO);
      addTrauma(1);
      screenFlash('rgba(255,255,255,.4)', 0.2);
      chromAb = 0.7; bloomInt = 1;
      feathers(c.x+c.w/2, c.y+c.h/2, 50, '#ffd740');
      embers(c.x+c.w/2, c.y+c.h/2, 25, '#ff6b35');
      stars(c.x+c.w/2, c.y+c.h/2, 20);
      sfxKO();
      slam("K.O.!!", '#ff3d00', 2.5);
      vignette('rgba(255,60,0,.3)', 0.7);
    }
    c.launchIsKO = false;
  }
}

// ─── PARTICLES ───
const P_MAX = 1200; const parts = [];
function em(x,y,vx,vy,life,col,sz,tp='rect'){if(parts.length>=P_MAX)return;parts.push({x,y,vx,vy,life,ml:life,col,sz,tp,rot:rand(0,TAU),rv:rand(-10,10),grav:1})}
function feathers(x,y,n,c='#fff'){for(let i=0;i<n;i++){const a=rand(0,TAU),s=rand(100,350);em(x,y,Math.cos(a)*s,Math.sin(a)*s-rand(60,220),rand(.6,1.6),c,rand(6,15),'feather')}}
function embers(x,y,n,c='#ff6b35'){for(let i=0;i<n;i++){const a=rand(0,TAU),s=rand(60,200);parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-rand(30,80),life:rand(.3,.8),ml:.8,col:c,sz:rand(2,4),tp:'ember',rot:0,rv:0,grav:.3})}}
function sparks(x,y,n,c='#fff'){for(let i=0;i<n;i++){const a=rand(0,TAU),s=rand(150,400);em(x,y,Math.cos(a)*s,Math.sin(a)*s,rand(.15,.4),c,rand(2,4),'spark')}}
function stars(x,y,n){for(let i=0;i<n;i++){const a=rand(0,TAU),s=rand(50,180);em(x,y,Math.cos(a)*s,Math.sin(a)*s,rand(.4,.9),'#ffd740',rand(5,10),'star')}}
function shockwave(x,y,c='rgba(255,255,255,.5)'){parts.push({x,y,vx:0,vy:0,life:.4,ml:.4,col:c,sz:0,tp:'ring',rot:0,rv:0,radius:10,grav:0})}
function goldenRain(x,y){for(let i=0;i<50;i++){const a=rand(-3.14,-.1),s=rand(120,450);em(x+rand(-60,60),y,Math.cos(a)*s,Math.sin(a)*s,rand(.7,1.8),'#ffd740',rand(5,12),'star')}}
function lightningBolt(x1,y1,x2,y2){parts.push({x:x1,y:y1,vx:x2,vy:y2,life:.15,ml:.15,col:'#a78bfa',sz:3,tp:'lightning',rot:0,rv:0,grav:0})}
function drawStar5(c,cx,cy,oR,iR){let r=-Math.PI/2;const st=Math.PI/5;c.beginPath();c.moveTo(cx,cy-oR);for(let i=0;i<5;i++){c.lineTo(cx+Math.cos(r)*oR,cy+Math.sin(r)*oR);r+=st;c.lineTo(cx+Math.cos(r)*iR,cy+Math.sin(r)*iR);r+=st}c.closePath();c.fill()}
function updateParts(dt){for(let i=parts.length-1;i>=0;i--){const p=parts[i];p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.tp!=='ring'&&p.tp!=='lightning')p.vy+=400*p.grav*dt;p.rot+=p.rv*dt;p.life-=dt;if(p.tp==='ring')p.radius+=300*dt;if(p.tp==='ember'){p.sz*=.97;p.col=p.life>.4?'#ff6b35':'#ff3d00'}if(p.life<=0)parts.splice(i,1)}}
function drawParts(){
  for(const p of parts){
    const a=clamp(p.life/p.ml,0,1);
    ctx.save();ctx.globalAlpha=a;
    if(p.tp==='feather'){ctx.translate(p.x,p.y);ctx.rotate(p.rot);ctx.fillStyle=p.col;ctx.shadowColor=p.col;ctx.shadowBlur=4;ctx.beginPath();ctx.ellipse(0,0,p.sz,p.sz*.28,0,0,TAU);ctx.fill()}
    else if(p.tp==='star'){ctx.translate(p.x,p.y);ctx.rotate(p.rot);ctx.fillStyle=p.col;ctx.shadowColor=p.col;ctx.shadowBlur=8;drawStar5(ctx,0,0,p.sz,p.sz*.4)}
    else if(p.tp==='ring'){ctx.strokeStyle=p.col;ctx.lineWidth=3*a;ctx.shadowColor=p.col;ctx.shadowBlur=12;ctx.beginPath();ctx.arc(p.x,p.y,p.radius,0,TAU);ctx.stroke()}
    else if(p.tp==='ember'){ctx.fillStyle=p.col;ctx.shadowColor=p.col;ctx.shadowBlur=10;ctx.beginPath();ctx.arc(p.x,p.y,p.sz,0,TAU);ctx.fill()}
    else if(p.tp==='spark'){ctx.strokeStyle=p.col;ctx.lineWidth=1.5;ctx.shadowColor=p.col;ctx.shadowBlur=6;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x-p.vx*.02,p.y-p.vy*.02);ctx.stroke()}
    else if(p.tp==='lightning'){ctx.strokeStyle=p.col;ctx.lineWidth=p.sz*a;ctx.shadowColor='#c4b5fd';ctx.shadowBlur=15;ctx.beginPath();let lx=p.x,ly=p.y;const dx=p.vx-p.x,dy=p.vy-p.y;ctx.moveTo(lx,ly);for(let s=0;s<8;s++){const t=(s+1)/8;lx=p.x+dx*t+rand(-12,12);ly=p.y+dy*t+rand(-12,12);ctx.lineTo(lx,ly)}ctx.stroke()}
    else{const s=p.sz*a;ctx.fillStyle=p.col;ctx.translate(p.x,p.y);ctx.rotate(p.rot);ctx.fillRect(-s/2,-s/2,s,s)}
    ctx.shadowBlur=0;ctx.restore();
  }
  ctx.globalAlpha=1;
}

// ─── FLOATING TEXT ───
const floats=[];
function fText(x,y,text,col,sz,dur=0.9){floats.push({x,y,text,col,sz,life:dur,ml:dur,vy:-130,sc:2})}
function updateFloats(dt){for(let i=floats.length-1;i>=0;i--){const f=floats[i];f.y+=f.vy*dt;f.vy*=.95;f.life-=dt;f.sc=lerp(f.sc,1,dt*8);if(f.life<=0)floats.splice(i,1)}}
function drawFloats(){
  for(const f of floats){const a=clamp(f.life/f.ml,0,1);ctx.save();ctx.globalAlpha=a;ctx.font=`700 ${Math.round(f.sz*f.sc)}px Fredoka,sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='rgba(0,0,0,.5)';ctx.fillText(f.text,f.x+2,f.y+2);ctx.shadowColor=f.col;ctx.shadowBlur=12;ctx.fillStyle=f.col;ctx.fillText(f.text,f.x,f.y);ctx.restore()}
  ctx.globalAlpha=1;
}

// ─── SLAM TEXT ───
let slamT='',slamTm=0,slamC='#fff',slamS=3.5;
function slam(t,c='#ffd740',d=1.3){slamT=t;slamTm=d;slamC=c;slamS=3.5}
function drawSlam(dt){
  if(slamTm<=0)return;slamTm-=dt;slamS=lerp(slamS,1,dt*14);
  const a=clamp(slamTm/.35,0,1);
  ctx.save();ctx.globalAlpha=a;ctx.font=`700 ${Math.round(56*slamS)}px "Bebas Neue",sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillStyle='rgba(0,0,0,.6)';ctx.fillText(slamT,AW/2+3,AH*.36+3);
  ctx.shadowColor=slamC;ctx.shadowBlur=40;ctx.fillStyle=slamC;ctx.fillText(slamT,AW/2,AH*.36);
  ctx.shadowBlur=0;ctx.fillStyle='#fff';ctx.globalAlpha=a*.5;ctx.fillText(slamT,AW/2,AH*.36);
  ctx.restore();ctx.globalAlpha=1;
}

// ─── SCREEN SHAKE ───
let trauma=0,shX=0,shY=0,shT=0;
function addTrauma(t){trauma=clamp(trauma+t,0,1)}
function updateShake(dt){shT+=dt*22;trauma=Math.max(0,trauma-TRAUMA_DECAY*dt);const m=trauma*trauma;shX=noise1D(shT)*m*20;shY=noise1D(shT+100)*m*20}

// ─── HIT STOP / SLOW MO ───
let hsTimer=0,smTimer=0,smScale=1;
function hitStop(d){hsTimer=Math.max(hsTimer,d)}
function slowMo(d,s){smTimer=d;smScale=s}
function timeScale(){return hsTimer>0?0:smTimer>0?smScale:1}

// ─── SCREEN FX ───
let flashC='',flashT=0,vigC='',vigT=0,chromAb=0,bloomInt=0;
function screenFlash(c,d=.08){flashC=c;flashT=d}
function vignette(c,d=.35){vigC=c;vigT=d}

// ─── ARENA DRAWING ───
function drawArena(t) {
  if(images.arena) {
    ctx.drawImage(images.arena, 0, 0, AW, AH);
  } else {
    const sg = ctx.createLinearGradient(0,0,0,AH);
    sg.addColorStop(0,'#050510');sg.addColorStop(0.5,'#0a0a24');sg.addColorStop(1,'#141440');
    ctx.fillStyle=sg;ctx.fillRect(0,0,AW,AH);
  }
  // Stars
  ctx.save();
  for(let i=0;i<25;i++){
    const sx = (i*31.7+10)%AW, sy = (i*17.3+5)%(AH*.35);
    const tw = .15+Math.sin(t*(.8+i*.07)+i)*.25+.25;
    ctx.globalAlpha=tw; ctx.fillStyle='#fff';
    ctx.beginPath();ctx.arc(sx,sy,rand(.5,1.6),0,TAU);ctx.fill();
  }
  ctx.globalAlpha=1;ctx.restore();
  // Fog
  ctx.save();ctx.globalAlpha=.1+Math.sin(t*.5)*.03;
  const fogG=ctx.createLinearGradient(0,FLOOR_Y-40,0,AH);
  fogG.addColorStop(0,'transparent');fogG.addColorStop(.5,'rgba(180,140,80,.12)');fogG.addColorStop(1,'rgba(100,60,30,.18)');
  ctx.fillStyle=fogG;ctx.fillRect(0,FLOOR_Y-40,AW,AH-FLOOR_Y+40);
  ctx.restore();
}

// ─── DRAW CROC ───
function drawCroc(c) {
  const img = c === p1 ? images.gary : images.carl;
  if(!img) return;

  ctx.save();
  const cx = c.x + c.w/2, cy = c.y + c.h/2;
  ctx.translate(cx, cy);

  // Launched — spin in air
  if(c.launched) ctx.rotate(c.launchRot);
  // Death spin
  if(c.dead) ctx.rotate(c.deathRot);

  // Face direction
  ctx.scale(c.face, 1);
  // Squash & stretch
  ctx.scale(c.squash, c.stretch);
  // Tornado spin
  if(c.specAct) ctx.rotate((Date.now()/60) % TAU);

  // Hit flash
  if(c.hitFlash > 0 && Math.floor(c.hitFlash*30) % 2 === 0) ctx.globalAlpha = .35;
  if(c.stunned && !c.launched) ctx.globalAlpha = .5 + Math.sin(Date.now()*.02)*.2;

  // Comeback aura
  if(c.comebackActive && !c.dead && !c.launched) {
    ctx.save(); ctx.globalAlpha = .3 + Math.sin(c.comebackFlash)*.12;
    const aG = ctx.createRadialGradient(0, 0, 30, 0, 0, 130);
    aG.addColorStop(0,'rgba(255,50,0,.45)'); aG.addColorStop(1,'transparent');
    ctx.fillStyle = aG; ctx.fillRect(-130,-130,260,260);
    ctx.restore();
  }

  // Drop shadow
  if(!c.launched) {
    ctx.save(); ctx.globalAlpha = .3;
    ctx.fillStyle = 'rgba(0,0,0,.6)';
    ctx.beginPath(); ctx.ellipse(0, c.h/2 + 5, c.w*.35, 10, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }

  // The sprite
  const drawW = c.w * 1.15;
  const drawH = c.h * 1.1;
  ctx.drawImage(img, -drawW/2, -drawH/2, drawW, drawH);

  // Parry shield
  if(c.parrying) {
    ctx.save();
    const pG = ctx.createRadialGradient(0,0,c.w*.4,0,0,c.w*.7);
    pG.addColorStop(0,'rgba(139,92,246,.1)'); pG.addColorStop(1,'rgba(139,92,246,.3)');
    ctx.fillStyle = pG; ctx.beginPath(); ctx.arc(0,0,c.w*.7,0,TAU); ctx.fill();
    ctx.strokeStyle='#a78bfa'; ctx.lineWidth=2.5; ctx.shadowColor='#a78bfa'; ctx.shadowBlur=18;
    ctx.beginPath(); ctx.arc(0,0,c.w*.7,0,TAU); ctx.stroke();
    ctx.shadowBlur=0; ctx.restore();
  }

  // Tornado rings
  if(c.specAct) {
    ctx.save(); ctx.globalAlpha=.5;
    const tt=Date.now()/70;
    for(let r=0;r<4;r++){
      ctx.strokeStyle=r%2?'#ffd740':'#fff'; ctx.lineWidth=2.5;
      ctx.shadowColor='#ffd740'; ctx.shadowBlur=10;
      ctx.beginPath(); ctx.arc(0,0,c.w*.5+r*18,tt+r,tt+r+4.2); ctx.stroke();
    }
    ctx.shadowBlur=0; ctx.restore();
  }

  // Tail whip arc
  if(c.tailAct) {
    ctx.save(); ctx.globalAlpha=.7;
    const tAngle = (Date.now()/30) % TAU;
    ctx.strokeStyle = c===p1 ? '#4ade80' : '#f472b6';
    ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(0, c.h*.1, TAIL_RANGE*.6, tAngle, tAngle+2.5);
    ctx.stroke();
    ctx.shadowBlur=0; ctx.restore();
  }

  // Dash trail
  if(c.dashing) {
    ctx.globalAlpha=.12;
    for(let trail=1;trail<=3;trail++){
      ctx.drawImage(img, -drawW/2 - trail*22*c.face, -drawH/2, drawW, drawH);
    }
    ctx.globalAlpha=1;
  }

  // Stun stars
  if(c.stunned && !c.launched) {
    ctx.fillStyle='#ffd740'; ctx.shadowColor='#ffd740'; ctx.shadowBlur=5;
    for(let i=0;i<4;i++){
      const sa=Date.now()*.005+i*1.57;
      ctx.save(); ctx.translate(Math.cos(sa)*32,-c.h/2-10+Math.sin(sa)*8); ctx.rotate(sa*2);
      drawStar5(ctx,0,0,7,3); ctx.restore();
    }
    ctx.shadowBlur=0;
  }

  ctx.shadowBlur=0; ctx.restore();
}

// ─── CROC CONSTRUCTOR ───
function mkCroc(x,face,name){
  return {x,y:FLOOR_Y-CH,vx:0,vy:0,w:CW,h:CH,face,name,
    hp:MAX_HP,wins:0,alive:true,grounded:true,
    atk:false,atkT:0,atkCD:0,
    dashing:false,dashT:0,dashCD:0,dashDir:0,
    specAct:false,specT:0,specCD:0,
    tailAct:false,tailT:0,tailCD:0,
    parrying:false,parryT:0,parryCD:0,parryOK:false,
    launched:false,launchVy:0,launchVx:0,launchSpin:0,launchRot:0,launchPhase:'',launchTimer:0,launchIsKO:false,
    launchCD:0,
    stunned:false,stunT:0,
    hitFlash:0,squash:1,stretch:1,
    combo:0,comboT:0,maxCombo:0,totalDmg:0,hits:0,parryCount:0,
    comebackActive:false,comebackFlash:0,
    dead:false,deathVx:0,deathVy:0,deathBounces:0,deathRot:0,deathRotV:0,
    bufAtk:false,bufParry:false};
}
function resetC(c,x){
  c.x=x;c.y=FLOOR_Y-CH;c.vx=0;c.vy=0;c.hp=MAX_HP;c.alive=true;c.grounded=true;
  c.atk=false;c.atkT=0;c.atkCD=0;c.dashing=false;c.dashT=0;c.dashCD=0;
  c.specAct=false;c.specT=0;c.specCD=0;c.tailAct=false;c.tailT=0;c.tailCD=0;
  c.parrying=false;c.parryT=0;c.parryCD=0;c.parryOK=false;
  c.launched=false;c.launchVy=0;c.launchVx=0;c.launchSpin=0;c.launchRot=0;c.launchIsKO=false;
  c.launchCD=0;
  c.stunned=false;c.stunT=0;c.hitFlash=0;c.squash=1;c.stretch=1;
  c.combo=0;c.comboT=0;c.maxCombo=0;c.totalDmg=0;c.hits=0;c.parryCount=0;
  c.comebackActive=false;c.comebackFlash=0;
  c.dead=false;c.deathVx=0;c.deathVy=0;c.deathBounces=0;c.deathRot=0;c.deathRotV=0;
  c.bufAtk=false;c.bufParry=false;
}

// ─── MELEE DAMAGE (pushback only, no HP loss) ───
function dealMeleeDmg(atk,vic,dir,heavy,isTail){
  if(vic.launched) return; // Can't hit launched crocs
  if(vic.parrying && vic.parryT > 0){
    // Parry success
    vic.parryOK=true;atk.stunned=true;atk.stunT=PARRY_STUN;
    hitStop(HS_PARRY);addTrauma(.35);screenFlash('rgba(139,92,246,.3)');
    sfxParry();sparks(vic.x+vic.w/2,vic.y+vic.h/2,20,'#a78bfa');
    shockwave(vic.x+vic.w/2,vic.y+vic.h/2,'rgba(139,92,246,.5)');
    lightningBolt(vic.x+vic.w/2-40,vic.y-20,vic.x+vic.w/2+40,vic.y+vic.h);
    fText(vic.x+vic.w/2,vic.y-45,pick(PARRY_LINES),'#a78bfa',30);
    vic.parryCount++;chromAb=.4;
    // No video on parry — keep gameplay fast
    return;
  }
  // Melee pushes back but doesn't reduce HP pips
  vic.hitFlash=.12;
  vic.vx=dir*KB*(heavy?1.5:1);vic.vy=KB_UP*(heavy?1.2:1);vic.grounded=false;
  vic.combo=0;vic.comboT=0;
  atk.combo++;atk.comboT=1.5;atk.hits++;
  if(atk.combo>atk.maxCombo)atk.maxCombo=atk.combo;

  if(isTail){
    hitStop(HS_TAIL);addTrauma(.55);
    feathers(vic.x+vic.w/2,vic.y+vic.h/2,18,'#fff');
    embers(vic.x+vic.w/2,vic.y+vic.h/2,10);
    shockwave(vic.x+vic.w/2,vic.y+vic.h/2,'rgba(255,200,0,.6)');
    screenFlash('rgba(255,200,0,.2)',.12);chromAb=.35;bloomInt=.45;
    fText(vic.x+vic.w/2,vic.y-50,pick(TAIL_WORDS),'#06b6d4',34,1.2);
    // No video on tail whip — keep gameplay flowing
  } else if(heavy){
    hitStop(HS_HEAVY);addTrauma(.45);
    feathers(vic.x+vic.w/2,vic.y+vic.h/2,14,'#fff');
    embers(vic.x+vic.w/2,vic.y+vic.h/2,6);
    shockwave(vic.x+vic.w/2,vic.y+vic.h/2);
    screenFlash('rgba(255,255,255,.15)',.08);chromAb=.25;
  } else {
    hitStop(HS_LIGHT);addTrauma(.18+atk.combo*.02);
    feathers(vic.x+vic.w/2,vic.y+vic.h/2,6,'#fff');
  }
  sfxHit(atk.combo);
  fText(vic.x+vic.w/2+rand(-20,20),vic.y-10,`${pick(DMG_WORDS)}!`,'#fff',20);

  if(COMBO_MS[atk.combo]){
    slam(COMBO_MS[atk.combo],'#ffd740',1);sfxCombo(atk.combo);stars(atk.x+atk.w/2,atk.y,10);bloomInt=.5;
  }
}

// ─── UPDATE CROC ───
function updateCroc(c,inp,o,dt){
  if(c.launched){updateLaunched(c,dt);return}

  c.atkCD=Math.max(0,c.atkCD-dt);c.dashCD=Math.max(0,c.dashCD-dt);c.specCD=Math.max(0,c.specCD-dt);
  c.tailCD=Math.max(0,c.tailCD-dt);c.parryCD=Math.max(0,c.parryCD-dt);c.hitFlash=Math.max(0,c.hitFlash-dt);
  c.launchCD=Math.max(0,c.launchCD-dt);
  c.squash=lerp(c.squash,1,dt*10);c.stretch=lerp(c.stretch,1,dt*10);
  c.comboT=Math.max(0,c.comboT-dt);if(c.comboT<=0)c.combo=0;

  const wasCB=c.comebackActive;
  c.comebackActive=c.hp<=COMEBACK_TH&&c.alive;
  if(c.comebackActive&&!wasCB){sfxComeback();fText(c.x+c.w/2,c.y-55,pick(COMEBACK_LINES),'#ff3d00',28);vignette('rgba(255,0,0,.25)',.5)}
  if(c.comebackActive)c.comebackFlash+=dt*6;

  if(c.dead){
    c.deathRot+=c.deathRotV*dt;c.x+=c.deathVx*dt;c.y+=c.deathVy*dt;c.deathVy+=GRAVITY*1.3*dt;
    if(c.x<10){c.x=10;c.deathVx*=-.5;addTrauma(.2);sfxBounce()}
    if(c.x+c.w>AW-10){c.x=AW-c.w-10;c.deathVx*=-.5;addTrauma(.2);sfxBounce()}
    if(c.y+c.h>FLOOR_Y){c.y=FLOOR_Y-c.h;c.deathVy*=-.3;c.deathVx*=.6;if(Math.abs(c.deathVy)>20){addTrauma(.1);sfxBounce()}}
    return;
  }
  if(!c.alive)return;

  if(c.stunned){c.stunT-=dt;if(c.stunT<=0)c.stunned=false;c.vx*=.85;c.vy+=GRAVITY*dt;c.x+=c.vx*dt;c.y+=c.vy*dt;if(c.y+c.h>FLOOR_Y){c.y=FLOOR_Y-c.h;c.vy=0;c.grounded=true}c.x=clamp(c.x,10,AW-c.w-10);return}

  if(c.parrying){c.parryT-=dt;if(c.parryT<=0){c.parrying=false;if(!c.parryOK)c.parryCD=PARRY_CD}c.parryOK=false}

  let mx=0;if(inp.left)mx-=1;if(inp.right)mx+=1;
  if(inp.up&&c.grounded){c.vy=JUMP_VEL;c.grounded=false;c.squash=.55;c.stretch=1.45;sfxBounce();shockwave(c.x+c.w/2,c.y+c.h)}

  if(c.dashing){c.dashT-=dt;c.vx=c.dashDir*DASH_SPD;if(c.dashT<=0)c.dashing=false}
  else if(!c.specAct&&!c.tailAct)c.vx=mx*MOVE_SPD;

  // Attack (melee smack)
  if(inp.attack&&c.atkCD<=0&&!c.atk&&!c.specAct&&!c.parrying&&!c.tailAct){
    c.atk=true;c.atkT=.16;c.atkCD=ATK_CD;sfxHit(c.combo);
    c.squash=1.2;c.stretch=.85;
    const acx=c.x+c.w/2+c.face*45,acy=c.y+c.h/2;
    if(dist(acx,acy,o.x+o.w/2,o.y+o.h/2)<ATK_RANGE&&o.alive&&!o.launched)dealMeleeDmg(c,o,c.face,false,false);
  }
  if(c.atk){c.atkT-=dt;if(c.atkT<=0)c.atk=false}

  // PILLOW LAUNCH (the KO move — 6 hits wins)
  if(inp.launch&&c.launchCD<=0&&!c.specAct&&!c.tailAct&&!c.atk&&!c.parrying&&!c.dashing){
    c.launchCD=LAUNCH_CD;
    c.squash=.7;c.stretch=1.35;
    spawnPillow(c, o, c.face);
  }

  // Tail whip
  if(inp.tailwhip&&c.tailCD<=0&&!c.tailAct&&!c.specAct&&!c.atk&&!c.parrying){
    c.tailAct=true;c.tailT=.3;c.tailCD=TAIL_CD;sfxTailWhip();
    c.squash=1.35;c.stretch=.65;
    setTimeout(()=>{
      if(!c.alive||!o.alive||o.launched)return;
      const tcx=c.x+c.w/2,tcy=c.y+c.h/2;
      if(dist(tcx,tcy,o.x+o.w/2,o.y+o.h/2)<TAIL_RANGE)dealMeleeDmg(c,o,c.face,true,true);
    },100);
  }
  if(c.tailAct){c.tailT-=dt;if(c.tailT<=0)c.tailAct=false}

  // Parry
  if(inp.parry&&c.parryCD<=0&&!c.parrying&&!c.atk&&!c.specAct&&!c.tailAct){c.parrying=true;c.parryT=PARRY_WIN;c.parryOK=false;c.parryCD=0}

  // Dash (belly bounce)
  if(inp.dash&&c.dashCD<=0&&!c.dashing&&!c.specAct&&!c.tailAct){
    c.dashing=true;c.dashT=DASH_DUR;c.dashCD=DASH_CD;c.dashDir=c.face;c.squash=1.45;c.stretch=.55;sfxDash();
    setTimeout(()=>{if(!c.alive||!o.alive||o.launched)return;if(dist(c.x+c.w/2,c.y+c.h/2,o.x+o.w/2,o.y+o.h/2)<85)dealMeleeDmg(c,o,c.dashDir,true,false)},70);
  }

  // Special (tornado)
  if(inp.special&&c.specCD<=0&&!c.specAct&&!c.tailAct){
    c.specAct=true;c.specT=SPEC_DUR;c.specCD=SPEC_CD;sfxSpecial();slam("TORNADO!!",c===p1?'#4ade80':'#f472b6',.8);bloomInt=.4;
    // No video on tornado — keep gameplay flowing
  }
  if(c.specAct){
    c.specT-=dt;c.vx=c.face*160;
    if(dist(c.x+c.w/2,c.y+c.h/2,o.x+o.w/2,o.y+o.h/2)<95&&o.alive&&!o.launched&&Math.random()<dt*8)dealMeleeDmg(c,o,c.face,false,false);
    feathers(c.x+c.w/2+rand(-20,20),c.y+c.h/2+rand(-12,12),1,c===p1?'#4ade80':'#f472b6');
    if(c.specT<=0)c.specAct=false;
  }

  c.vy+=GRAVITY*dt;c.x+=c.vx*dt;c.y+=c.vy*dt;
  if(c.y+c.h>FLOOR_Y){c.y=FLOOR_Y-c.h;if(c.vy>130){c.squash=1.3;c.stretch=.7;sfxBounce();shockwave(c.x+c.w/2,FLOOR_Y)}c.vy=0;c.grounded=true}
  c.x=clamp(c.x,10,AW-c.w-10);
  if(!c.dashing&&!c.specAct&&!c.tailAct)c.face=(o.x+o.w/2>c.x+c.w/2)?1:-1;
}

// ─── AI (easy mode — player should win most matches) ───
function getAI(ai,tgt){
  const inp={left:0,right:0,up:0,attack:0,dash:0,special:0,parry:0,tailwhip:0,launch:0};
  const dx=tgt.x-ai.x,adx=Math.abs(dx);

  // Movement — approach slowly, keep distance
  if(adx>180){if(dx>0)inp.right=1;else inp.left=1}
  else if(adx<60){if(dx>0)inp.left=1;else inp.right=1}

  // Occasional jump
  if(ai.grounded && Math.random() < 0.004) inp.up=1;

  // Melee attack — much lower frequency (pushback only, no HP dmg)
  if(adx<85 && ai.atkCD<=0 && Math.random() < 0.08) inp.attack=1;

  // Parry — very rare, and often too late
  if(tgt.atk && tgt.atkT>.12 && adx<85 && ai.parryCD<=0 && Math.random() < 0.03) inp.parry=1;

  // Dash — very rare
  if(adx<150 && adx>70 && ai.dashCD<=0 && Math.random() < 0.008) inp.dash=1;

  // Tornado — extremely rare
  if(adx<105 && ai.specCD<=0 && Math.random() < 0.003) inp.special=1;

  // Tail whip — rare
  if(adx<120 && ai.tailCD<=0 && Math.random() < 0.006) inp.tailwhip=1;

  // PILLOW LAUNCH — the KO move, AI barely uses it
  if(ai.launchCD<=0 && adx < 250 && Math.random() < 0.004) inp.launch=1;

  // Flee when low
  if(ai.hp<=2 && adx<100){inp.left=dx>0?1:0;inp.right=dx<0?1:0}

  return inp;
}

// ─── GAME STATE ───
let state='title',isAI=false,p1,p2,roundTimer,roundNum,cdTimer,lastTS=0,gameTime=0,matchStats={};
function initP(){
  p1=mkCroc(160,1,'Gator Gary');
  p2=mkCroc(AW-160-CW,-1,'Croc Carl');
}
function resetRound(){
  resetC(p1,160);resetC(p2,AW-160-CW);roundTimer=ROUND_TIME;
  parts.length=0;floats.length=0;projectiles.length=0;
  trauma=0;hsTimer=0;smTimer=0;slamTm=0;flashT=0;vigT=0;chromAb=0;bloomInt=0;
  hideVideo();
}
function startGame(ai){
  isAI=ai;initP();roundNum=1;matchStats={p1h:0,p2h:0,p1c:0,p2c:0,p1p:0,p2p:0,rds:0};
  startCD();
}
function startCD(){
  resetRound();state='countdown';cdTimer=2.2;
  slam(`Round ${roundNum}`,'#ffd740',1.5);sfxRound();
  $('hud').classList.remove('hidden');$('title-screen').classList.add('hidden');$('result-screen').classList.add('hidden');
}
function startPlay(){state='playing';slam(pick(ROUND_INTROS),'#fff',1)}
function endRound(w){
  state='roundEnd';matchStats.rds++;
  matchStats.p1h+=p1.hits;matchStats.p2h+=p2.hits;
  matchStats.p1c=Math.max(matchStats.p1c,p1.maxCombo);matchStats.p2c=Math.max(matchStats.p2c,p2.maxCombo);
  matchStats.p1p+=p1.parryCount;matchStats.p2p+=p2.parryCount;
  if(w){w.wins++;if(w.hp>=MAX_HP){slam(pick(PERFECT_LINES),'#ffd740',2);sfxPerfect();goldenRain(AW/2,AH*.25);bloomInt=1}else slam(pick(KO_LINES),'#ff3d00',1.8)}
  else slam("TIME'S UP!!",'#fbbf24',1.5);
  setTimeout(()=>{hideVideo();if(p1.wins>=ROUNDS_TO_WIN||p2.wins>=ROUNDS_TO_WIN)endMatch();else{roundNum++;startCD()}},3200);
}
function endMatch(){
  state='result';const w=p1.wins>=ROUNDS_TO_WIN?p1:p2;const wc=w===p1?'var(--p1)':'var(--p2)';
  $('res-winner').textContent=`🐊 ${w.name} ${pick(WIN_LINES)}`;$('res-winner').style.color=wc;
  $('res-score').textContent=`${p1.wins} — ${p2.wins}`;
  $('res-grid').innerHTML=`<div><div class="v">${matchStats.p1h}</div><div class="l">Gary Hits</div></div><div><div class="v">${matchStats.p2h}</div><div class="l">Carl Hits</div></div><div><div class="v">${matchStats.p1c}</div><div class="l">Gary Best Combo</div></div><div><div class="v">${matchStats.p2c}</div><div class="l">Carl Best Combo</div></div><div><div class="v">${matchStats.p1p}</div><div class="l">Gary Parries</div></div><div><div class="v">${matchStats.p2p}</div><div class="l">Carl Parries</div></div>`;
  $('result-screen').classList.remove('hidden');
  hideVideo();
}

// ─── HUD ───
function updateHUD(){
  // HP as pips (6 max)
  function pipHTML(hp, max, cls) {
    let s = '';
    for(let i = 0; i < max; i++) {
      s += `<span class="pip ${cls} ${i < hp ? 'full' : 'empty'}"></span>`;
    }
    return s;
  }
  $('p1pips').innerHTML = pipHTML(p1.hp, MAX_HP, 'p1pip');
  $('p2pips').innerHTML = pipHTML(p2.hp, MAX_HP, 'p2pip');
  $('p1s').textContent=`Wins ${p1.wins}`;$('p2s').textContent=`Wins ${p2.wins}`;
  $('hround').textContent=`ROUND ${roundNum}`;
  const te=$('htimer');te.textContent=Math.ceil(Math.max(0,roundTimer));
  te.className=roundTimer<10?'htimer warn':'htimer';
  $('p1combo').textContent=p1.combo>=3?`${p1.combo} HIT COMBO`:'' ;
  $('p2combo').textContent=p2.combo>=3?`${p2.combo} HIT COMBO`:'' ;

  // Launch cooldown indicator
  const p1cd = p1.launchCD > 0 ? Math.ceil(p1.launchCD * 10) / 10 : 0;
  $('p1launch').textContent = p1cd > 0 ? `🎯 ${p1cd.toFixed(1)}s` : '🎯 READY';
  $('p1launch').className = 'launch-cd' + (p1cd <= 0 ? ' ready' : '');
  if(!isAI) {
    const p2cd = p2.launchCD > 0 ? Math.ceil(p2.launchCD * 10) / 10 : 0;
    $('p2launch').textContent = p2cd > 0 ? `🎯 ${p2cd.toFixed(1)}s` : '🎯 READY';
    $('p2launch').className = 'launch-cd' + (p2cd <= 0 ? ' ready' : '');
  } else {
    $('p2launch').textContent = '';
  }
}

// ─── INPUT MAPS ───
function getP1(){return{left:keys.KeyA||ts.left,right:keys.KeyD||ts.right,up:jp.KeyW||ts.up,attack:jp.KeyF||ts.attack,dash:jp.KeyG||ts.dash,special:jp.KeyH||ts.special,parry:jp.KeyR||ts.parry,tailwhip:jp.KeyT||ts.tailwhip,launch:jp.KeyQ||ts.launch}}
function getP2(){if(isAI)return getAI(p2,p1);return{left:keys.ArrowLeft,right:keys.ArrowRight,up:jp.ArrowUp,attack:jp.KeyL,dash:jp.KeyK,special:jp.KeyJ,parry:jp.KeyP,tailwhip:jp.KeyI,launch:jp.KeyO}}

// ─── POST-PROCESSING ───
function postFX(dt){
  bloomInt=Math.max(0,bloomInt-dt*1.5);
  if(bloomInt>0){ctx.save();ctx.globalAlpha=bloomInt*.1;ctx.fillStyle='#ffd740';ctx.filter='blur(30px)';ctx.fillRect(0,0,AW,AH);ctx.filter='none';ctx.restore()}
  if(flashT>0){ctx.fillStyle=flashC;ctx.globalAlpha=clamp(flashT/.08,0,1)*.45;ctx.fillRect(0,0,AW,AH);ctx.globalAlpha=1}
  if(vigT>0){const va=clamp(vigT/.3,0,1)*.4;const vg=ctx.createRadialGradient(AW/2,AH/2,AW*.25,AW/2,AH/2,AW*.65);vg.addColorStop(0,'transparent');vg.addColorStop(1,vigC);ctx.globalAlpha=va;ctx.fillStyle=vg;ctx.fillRect(0,0,AW,AH);ctx.globalAlpha=1}
  // Permanent vignette
  const sv=ctx.createRadialGradient(AW/2,AH/2,AW*.3,AW/2,AH/2,AW*.7);
  sv.addColorStop(0,'transparent');sv.addColorStop(1,'rgba(0,0,0,.25)');
  ctx.fillStyle=sv;ctx.fillRect(0,0,AW,AH);
  chromAb=Math.max(0,chromAb-dt*2);
  if(chromAb>.01){ctx.save();ctx.globalAlpha=chromAb*.25;ctx.globalCompositeOperation='screen';ctx.fillStyle='rgba(255,0,0,.1)';ctx.fillRect(chromAb*3,0,AW,AH);ctx.fillStyle='rgba(0,0,255,.1)';ctx.fillRect(-chromAb*3,0,AW,AH);ctx.globalCompositeOperation='source-over';ctx.restore()}
  // Slow-mo bars
  if(smTimer>0){
    const barH=24*clamp(smTimer/SLO_DUR,0,1);
    ctx.fillStyle='rgba(0,0,0,.6)';ctx.fillRect(0,0,AW,barH);ctx.fillRect(0,AH-barH,AW,barH);
  }
  // Film grain
  ctx.save();ctx.globalAlpha=.015;
  for(let i=0;i<20;i++){ctx.fillStyle=Math.random()>.5?'#fff':'#000';ctx.fillRect(rand(0,AW),rand(0,AH),rand(1,3),rand(1,3))}
  ctx.restore();
}

// ─── MAIN LOOP ───
function loop(now){
  requestAnimationFrame(loop);
  const rawDt=Math.min((now-lastTS)/1000,.1);lastTS=now;gameTime+=rawDt;

  hsTimer=Math.max(0,hsTimer-rawDt);smTimer=Math.max(0,smTimer-rawDt);
  flashT=Math.max(0,flashT-rawDt);vigT=Math.max(0,vigT-rawDt);
  const ts2=timeScale(),dt=rawDt*ts2;

  updateShake(rawDt);updateParts(dt);updateFloats(dt);

  if(state==='countdown'){cdTimer-=rawDt;if(cdTimer<=0)startPlay()}
  if(state==='playing'){
    updateCroc(p1,getP1(),p2,dt);
    updateCroc(p2,getP2(),p1,dt);
    // Update projectiles — check against both players
    const p1Projs = projectiles.filter(p => p.owner === p1);
    const p2Projs = projectiles.filter(p => p.owner === p2);
    for(const pr of p1Projs) {
      // Already handled in updateProjectiles
    }
    updateProjectiles(dt, p2); // p1's pillows hit p2
    // Need separate pass for p2's pillows hitting p1
    // Refactor: handle both in one pass
    roundTimer-=dt;
    if(!p1.alive)endRound(p2);else if(!p2.alive)endRound(p1);
    else if(roundTimer<=0){if(p1.hp>p2.hp)endRound(p1);else if(p2.hp>p1.hp)endRound(p2);else endRound(null)}
    updateHUD();
  }
  if(state==='roundEnd'){updateCroc(p1,{},p2,dt);updateCroc(p2,{},p1,dt);updateHUD()}

  // ── RENDER ──
  ctx.save();ctx.clearRect(0,0,W,H);
  ctx.fillStyle='#050510';ctx.fillRect(0,0,W,H);

  // Fixed camera (no zoom) — just offset + shake
  ctx.translate(ox + shX*sc, oy + shY*sc);
  ctx.scale(sc, sc);

  drawArena(gameTime);

  if(state!=='title'){
    if(p1&&p2){
      // Draw behind-croc first, then front
      if(p1.dead)drawCroc(p1);if(p2.dead)drawCroc(p2);
      if(!p1.dead)drawCroc(p1);if(!p2.dead)drawCroc(p2);
    }
    drawProjectiles();
    drawParts();drawFloats();drawSlam(rawDt);postFX(rawDt);
  } else {
    const tv=ctx.createRadialGradient(AW/2,AH/2,AW*.2,AW/2,AH/2,AW*.7);
    tv.addColorStop(0,'transparent');tv.addColorStop(1,'rgba(0,0,0,.55)');
    ctx.fillStyle=tv;ctx.fillRect(0,0,AW,AH);
  }

  ctx.restore();
  for(const k in jp)delete jp[k];
  ts.attack=0;ts.dash=0;ts.special=0;ts.parry=0;ts.tailwhip=0;ts.launch=0;
}

// Fix projectile system to handle both players
const origUpdateProj = updateProjectiles;
// Override with dual-player awareness
function updateAllProjectiles(dt) {
  for(let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    const target = p.owner === p1 ? p2 : p1;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 80 * dt;
    p.rot += p.face * 12 * dt;
    p.trail.push({x: p.x, y: p.y, life: 0.3});
    if(p.trail.length > 15) p.trail.shift();
    for(let t = p.trail.length - 1; t >= 0; t--) { p.trail[t].life -= dt; if(p.trail[t].life <= 0) p.trail.splice(t, 1); }
    if(Math.random() < dt * 15) feathers(p.x, p.y, 1, '#fff');
    if(p.alive && target.alive && !target.launched &&
       Math.abs(p.x - (target.x + target.w/2)) < 65 &&
       Math.abs(p.y - (target.y + target.h/2)) < 70) {
      p.alive = false;
      pillowHit(p.owner, target, p.face);
    }
    if(p.x < -60 || p.x > AW + 60 || p.y > AH + 60) { projectiles.splice(i, 1); continue; }
    if(!p.alive) { projectiles.splice(i, 1); }
  }
}

// Patch the main loop's projectile update
const _origLoop = loop;
// Actually, let's just fix the loop directly by removing the old updateProjectiles call
// and using updateAllProjectiles. We'll monkey-patch by redefining updateProjectiles.
// This is cleaner:

// ─── DOM ───
const $=id=>document.getElementById(id);
$('btn-pvp').addEventListener('click',()=>{initAudio();startGame(false)});
$('btn-ai').addEventListener('click',()=>{initAudio();startGame(true)});
$('btn-rematch').addEventListener('click',()=>{roundNum=1;startGame(isAI)});
$('btn-menu2').addEventListener('click',()=>{state='title';$('title-screen').classList.remove('hidden');$('result-screen').classList.add('hidden');$('hud').classList.add('hidden');hideVideo()});

// Patch: replace loop with fixed projectile handling
function gameLoop(now){
  requestAnimationFrame(gameLoop);
  const rawDt=Math.min((now-lastTS)/1000,.1);lastTS=now;gameTime+=rawDt;

  hsTimer=Math.max(0,hsTimer-rawDt);smTimer=Math.max(0,smTimer-rawDt);
  flashT=Math.max(0,flashT-rawDt);vigT=Math.max(0,vigT-rawDt);
  const ts2=timeScale(),dt=rawDt*ts2;

  updateShake(rawDt);updateParts(dt);updateFloats(dt);

  if(state==='countdown'){cdTimer-=rawDt;if(cdTimer<=0)startPlay()}
  if(state==='playing'){
    updateCroc(p1,getP1(),p2,dt);
    updateCroc(p2,getP2(),p1,dt);
    updateAllProjectiles(dt);
    roundTimer-=dt;
    if(!p1.alive)endRound(p2);else if(!p2.alive)endRound(p1);
    else if(roundTimer<=0){if(p1.hp>p2.hp)endRound(p1);else if(p2.hp>p1.hp)endRound(p2);else endRound(null)}
    updateHUD();
  }
  if(state==='roundEnd'){updateCroc(p1,{},p2,dt);updateCroc(p2,{},p1,dt);updateHUD()}

  ctx.save();ctx.clearRect(0,0,W,H);
  ctx.fillStyle='#050510';ctx.fillRect(0,0,W,H);
  ctx.translate(ox + shX*sc, oy + shY*sc);
  ctx.scale(sc, sc);
  drawArena(gameTime);

  if(state!=='title'){
    if(p1&&p2){if(p1.dead)drawCroc(p1);if(p2.dead)drawCroc(p2);if(!p1.dead)drawCroc(p1);if(!p2.dead)drawCroc(p2)}
    drawProjectiles();drawParts();drawFloats();drawSlam(rawDt);postFX(rawDt);
  } else {
    const tv=ctx.createRadialGradient(AW/2,AH/2,AW*.2,AW/2,AH/2,AW*.7);
    tv.addColorStop(0,'transparent');tv.addColorStop(1,'rgba(0,0,0,.55)');
    ctx.fillStyle=tv;ctx.fillRect(0,0,AW,AH);
  }

  ctx.restore();
  for(const k in jp)delete jp[k];
  ts.attack=0;ts.dash=0;ts.special=0;ts.parry=0;ts.tailwhip=0;ts.launch=0;
}

// ─── BOOT ───
loadImages(() => {
  initVideoOverlay();
  requestAnimationFrame(gameLoop);
});

})();
