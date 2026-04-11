// ============================================================
//  CROC CLASH — Branson Pillow Brawl
//  The most ridiculous viral fighting game ever made
//  Two crocodiles. Pillows. Branson, Missouri. No mercy.
// ============================================================
(() => {
'use strict';

// ─── ARENA CONFIG ───
const AW = 800, AH = 500;
const FLOOR_Y = AH - 55;
const MAX_HP = 100;
const ROUND_TIME = 30;
const ROUNDS_TO_WIN = 3;

// ─── FIGHTER CONFIG ───
const CROC_W = 60, CROC_H = 38;
const MOVE_SPD = 210;
const GRAVITY = 680;
const JUMP_VEL = -340;
const ATK_RANGE = 72, ATK_DMG = 10, ATK_CD = 0.32;
const DASH_SPD = 520, DASH_DUR = 0.18, DASH_CD = 0.9, DASH_DMG = 8;
const SPEC_DMG = 6, SPEC_CD = 3.5, SPEC_DUR = 0.7;
const PARRY_WINDOW = 0.1, PARRY_CD = 0.8, PARRY_STUN = 0.55, PARRY_FAIL_MULT = 1.6;
const KNOCKBACK = 300, KB_UP = -140;
const COMEBACK_THRESH = 0.25, COMEBACK_MULT = 1.5;

// ─── JUICE TIMINGS ───
const HITSTOP_LIGHT = 0.05;   // 3 frames
const HITSTOP_HEAVY = 0.13;   // 8 frames
const HITSTOP_KO    = 0.25;   // 15 frames
const HITSTOP_PARRY = 0.1;
const SLOWMO_DUR = 0.6;
const SLOWMO_SCALE = 0.25;
const TRAUMA_DECAY = 1.8;

// ─── UTILS ───
const lerp = (a,b,t) => a+(b-a)*t;
const clamp = (v,lo,hi) => Math.max(lo,Math.min(hi,v));
const dist = (x1,y1,x2,y2) => Math.hypot(x2-x1,y2-y1);
const rand = (a,b) => Math.random()*(b-a)+a;
const randInt = (a,b) => Math.floor(rand(a,b+1));
const pick = a => a[randInt(0,a.length-1)];

// ─── PERLIN NOISE (1D simplex approx) ───
const perlinSeed = Math.random()*1000;
function noise1D(x) {
  const i = Math.floor(x); const f = x - i;
  const u = f*f*(3-2*f);
  const a = Math.sin(i*127.1+perlinSeed)*43758.5453;
  const b = Math.sin((i+1)*127.1+perlinSeed)*43758.5453;
  return lerp(a-Math.floor(a), b-Math.floor(b), u)*2-1;
}

// ─── HILARIOUS TEXT ───
const ROUND_INTROS = [
  "PILLOW FIGHT!!","FEATHERS WILL FLY!!","IT'S SMACKIN' TIME!!",
  "BRANSON BRAWL!!","FLUFF 'EM UP!!","NOBODY SLEEPS TONIGHT!!",
  "WELCOME TO THE STRIP!!","GET FLUFFED!!","CROCS OUT!!"
];
const KO_LINES = [
  "NAPTIME!!","TOTALLY FLUFFED!!","LIGHTS OUT!!","FEATHERED!!",
  "PILLOW'D!!","STUFFING EVERYWHERE!!","SLEEP TIGHT!!",
  "DOWN FOR THE COUNT!!","TUCKED IN!!","BEDTIME, LOSER!!"
];
const PERFECT_LINES = [
  "FLAWLESS FLUFF!!","NOT A SCRATCH!!","UNTOUCHABLE CROC!!",
  "PILLOW PERFECTION!!","DIDN'T EVEN MESS UP THE SCALES!!"
];
const PARRY_LINES = [
  "DENIED!!","NOT TODAY!!","READ LIKE A BOOK!!","PILLOW BLOCKED!!",
  "NOPE!!","GET THAT WEAK FLUFF OUTTA HERE!!"
];
const COMEBACK_LINES = [
  "RAGE MODE!!","CROC FURY!!","LAST STAND!!","DESPERATION FLUFF!!"
];
const WIN_LINES = [
  "is the Branson Pillow Champion!",
  "reigns supreme on the Strip!",
  "has the fluffiest swing in Missouri!",
  "wins the Silver Dollar Smackdown!",
  "is the undisputed croc champ!",
  "sent them to the Baldknobbers!"
];
const COMBO_MILESTONES = {
  5: "NICE COMBO!", 10: "FEATHER STORM!", 15: "UNSTOPPABLE!",
  20: "PILLOW HURRICANE!!", 30: "ARE YOU SERIOUS?!", 50: "LEGENDARY FLUFF!!!"
};
const FUNNY_DAMAGE_WORDS = ["bonk","floof","thwap","smack","poof","bap","whap","fluff"];

// ─── AUDIO ENGINE ───
let actx = null;
function initAudio() {
  if (!actx) actx = new (window.AudioContext||window.webkitAudioContext)();
  if (actx.state==='suspended') actx.resume();
}
function tone(freq,dur,type='square',vol=0.12,delay=0) {
  if (!actx) return;
  const t = actx.currentTime+delay;
  const o = actx.createOscillator(), g = actx.createGain();
  o.type=type; o.frequency.setValueAtTime(freq,t);
  g.gain.setValueAtTime(vol,t);
  g.gain.exponentialRampToValueAtTime(0.001,t+dur);
  o.connect(g).connect(actx.destination);
  o.start(t); o.stop(t+dur);
}
// SFX with pitch variation
function sfxHit(combo) {
  const pitch = 180 + Math.min(combo,30)*8 + rand(-10,10);
  tone(pitch, 0.12, 'sawtooth', 0.18);
  tone(pitch*1.5, 0.06, 'square', 0.08);
}
function sfxParry() {
  tone(800, 0.08, 'sine', 0.2);
  tone(1200, 0.12, 'sine', 0.15, 0.04);
  tone(1600, 0.08, 'sine', 0.1, 0.08);
}
function sfxDash() { tone(280,0.1,'triangle',0.1); tone(450,0.07,'sine',0.07); }
function sfxBounce() { tone(380+rand(-20,20),0.07,'sine',0.1); tone(560,0.05,'sine',0.06); }
function sfxSpecial() { tone(140,0.4,'sawtooth',0.14); tone(220,0.3,'square',0.1,0.05); tone(380,0.2,'sine',0.07,0.1); }
function sfxKO() {
  tone(90,0.5,'sawtooth',0.25);
  tone(70,0.6,'square',0.2,0.12);
  tone(200,0.3,'sine',0.15,0.3);
  tone(150,0.4,'triangle',0.1,0.5);
}
function sfxRoundStart() { tone(523,0.12,'square',0.1); tone(659,0.12,'square',0.1,0.12); tone(784,0.25,'square',0.13,0.24); }
function sfxPerfect() { tone(523,0.1,'sine',0.15); tone(659,0.1,'sine',0.15,0.1); tone(784,0.1,'sine',0.15,0.2); tone(1047,0.3,'sine',0.18,0.3); }
function sfxComboMilestone(combo) {
  const base = 400 + combo*10;
  tone(base,0.15,'square',0.15); tone(base*1.25,0.15,'square',0.12,0.08); tone(base*1.5,0.2,'square',0.14,0.16);
}
function sfxComeback() { tone(100,0.3,'sawtooth',0.2); tone(150,0.2,'square',0.15,0.15); }

// ─── CANVAS ───
const canvas = document.getElementById('gc');
const ctx = canvas.getContext('2d');
let W, H, scale, offX, offY;
function resize() {
  W=window.innerWidth; H=window.innerHeight;
  canvas.width=W; canvas.height=H;
  scale = Math.min(W/AW, H/AH);
  offX = (W-AW*scale)/2;
  offY = (H-AH*scale)/2;
}
window.addEventListener('resize', resize); resize();

// ─── INPUT ───
const keys={}, jp={};
document.addEventListener('keydown', e=>{ if(!keys[e.code]) jp[e.code]=true; keys[e.code]=true; e.preventDefault(); });
document.addEventListener('keyup', e=>{ keys[e.code]=false; });
const ts = {up:false,down:false,left:false,right:false,attack:false,dash:false,special:false,parry:false};
document.querySelectorAll('.tbtn').forEach(b=>{
  const d=b.dataset.dir;
  b.addEventListener('touchstart',e=>{e.preventDefault();ts[d]=true});
  b.addEventListener('touchend',e=>{e.preventDefault();ts[d]=false});
});
document.querySelectorAll('.abtn').forEach(b=>{
  const a=b.dataset.action;
  b.addEventListener('touchstart',e=>{e.preventDefault();ts[a]=true});
  b.addEventListener('touchend',e=>{e.preventDefault();ts[a]=false});
});

// ─── PARTICLE SYSTEM ───
const parts = [];
const PART_MAX = 500;
function P(x,y,vx,vy,life,color,size,type='rect') {
  if (parts.length >= PART_MAX) return;
  parts.push({x,y,vx,vy,life,ml:life,color,size,type,rot:rand(0,6.28),rv:rand(-10,10)});
}
function feathers(x,y,n,col='#fff') {
  for(let i=0;i<n;i++){const a=rand(0,6.28),s=rand(90,280);P(x,y,Math.cos(a)*s,Math.sin(a)*s-rand(60,160),rand(0.5,1.2),col,rand(5,12),'feather')}
}
function stars(x,y,n) {
  for(let i=0;i<n;i++){const a=rand(0,6.28),s=rand(50,180);P(x,y,Math.cos(a)*s,Math.sin(a)*s,rand(0.4,0.8),'#ffd740',rand(4,8),'star')}
}
function sparks(x,y,n,col='#fff') {
  for(let i=0;i<n;i++){const a=rand(0,6.28),s=rand(100,350);P(x,y,Math.cos(a)*s,Math.sin(a)*s,rand(0.2,0.5),col,rand(2,5),'rect')}
}
function ring(x,y,col='rgba(255,255,255,0.4)') {
  parts.push({x,y,vx:0,vy:0,life:0.35,ml:0.35,color:col,size:10,type:'ring',radius:10,rot:0,rv:0});
}
function goldenShower(x,y) { // lol the name
  for(let i=0;i<40;i++){const a=rand(-3.14,-0.1),s=rand(100,400);P(x+rand(-50,50),y,Math.cos(a)*s,Math.sin(a)*s,rand(0.6,1.5),'#ffd740',rand(4,10),'star')}
}
function updateParts(dt) {
  for(let i=parts.length-1;i>=0;i--){
    const p=parts[i];
    p.x+=p.vx*dt; p.y+=p.vy*dt;
    if(p.type!=='ring') p.vy+=350*dt;
    p.rot+=p.rv*dt; p.life-=dt;
    if(p.type==='ring') p.radius+=220*dt;
    if(p.life<=0) parts.splice(i,1);
  }
}
function drawParts() {
  for(const p of parts){
    const a=clamp(p.life/p.ml,0,1);
    ctx.save(); ctx.globalAlpha=a;
    if(p.type==='feather'){
      ctx.translate(p.x,p.y); ctx.rotate(p.rot);
      ctx.fillStyle=p.color;
      ctx.beginPath(); ctx.ellipse(0,0,p.size,p.size*.3,0,0,6.28); ctx.fill();
    } else if(p.type==='star'){
      ctx.translate(p.x,p.y); ctx.rotate(p.rot);
      ctx.fillStyle=p.color; drawStar(ctx,0,0,5,p.size,p.size*.4);
    } else if(p.type==='ring'){
      ctx.strokeStyle=p.color; ctx.lineWidth=2.5;
      ctx.beginPath(); ctx.arc(p.x,p.y,p.radius,0,6.28); ctx.stroke();
    } else {
      ctx.fillStyle=p.color;
      const s=p.size*a;
      ctx.translate(p.x,p.y); ctx.rotate(p.rot);
      ctx.fillRect(-s/2,-s/2,s,s);
    }
    ctx.restore();
  }
  ctx.globalAlpha=1;
}
function drawStar(c,cx,cy,sp,oR,iR){
  let r=-Math.PI/2; const st=Math.PI/sp;
  c.beginPath(); c.moveTo(cx,cy-oR);
  for(let i=0;i<sp;i++){c.lineTo(cx+Math.cos(r)*oR,cy+Math.sin(r)*oR);r+=st;c.lineTo(cx+Math.cos(r)*iR,cy+Math.sin(r)*iR);r+=st;}
  c.closePath(); c.fill();
}

// ─── FLOATING TEXT SYSTEM ───
const floats = [];
function floatText(x,y,text,color,size,dur=0.8) {
  floats.push({x,y,text,color,size,life:dur,ml:dur,vy:-120,scale:1.5});
}
function floatDmg(x,y,dmg,combo) {
  const colors = ['#fff','#ffd740','#ff9100','#ff3d00','#ff1744'];
  const ci = clamp(Math.floor(combo/5),0,colors.length-1);
  const sz = clamp(16+combo*1.5,16,48);
  const word = pick(FUNNY_DAMAGE_WORDS);
  floatText(x+rand(-20,20), y-10, `-${Math.round(dmg)} ${word}!`, colors[ci], sz);
}
function updateFloats(dt) {
  for(let i=floats.length-1;i>=0;i--){
    const f=floats[i];
    f.y+=f.vy*dt; f.vy*=0.96;
    f.life-=dt; f.scale=lerp(f.scale,1,dt*6);
    if(f.life<=0) floats.splice(i,1);
  }
}
function drawFloats() {
  for(const f of floats){
    const a=clamp(f.life/f.ml,0,1);
    ctx.save();
    ctx.globalAlpha=a;
    ctx.font=`700 ${Math.round(f.size*f.scale)}px Fredoka, sans-serif`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillStyle=f.color;
    ctx.shadowColor=f.color; ctx.shadowBlur=8;
    ctx.fillText(f.text, f.x, f.y);
    ctx.restore();
  }
  ctx.globalAlpha=1;
}

// ─── SLAM TEXT (big center announcements) ───
let slamText='', slamTimer=0, slamColor='#fff', slamScale=3;
function slam(text, color='#ffd740', dur=1.2) {
  slamText=text; slamTimer=dur; slamColor=color; slamScale=3;
}
function drawSlam(dt) {
  if(slamTimer<=0) return;
  slamTimer-=dt; slamScale=lerp(slamScale,1,dt*12);
  const a=clamp(slamTimer/0.3,0,1);
  ctx.save();
  ctx.globalAlpha=a;
  ctx.font=`700 ${Math.round(52*slamScale)}px Fredoka, sans-serif`;
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillStyle=slamColor;
  ctx.shadowColor=slamColor; ctx.shadowBlur=30;
  ctx.fillText(slamText, AW/2, AH*0.38);
  ctx.restore(); ctx.globalAlpha=1;
}

// ─── SCREEN SHAKE (Trauma² system with Perlin noise) ───
let trauma = 0, shakeX = 0, shakeY = 0, shakeTime = 0;
function addTrauma(t) { trauma = clamp(trauma+t, 0, 1); }
function updateShake(dt) {
  shakeTime += dt*20;
  trauma = Math.max(0, trauma - TRAUMA_DECAY*dt);
  const mag = trauma*trauma; // squared for exponential feel
  shakeX = noise1D(shakeTime) * mag * 16;
  shakeY = noise1D(shakeTime+100) * mag * 16;
}

// ─── HIT STOP & SLOW MOTION ───
let hitStopTimer = 0;
let slowMoTimer = 0, slowMoScale = 1;
function hitStop(dur) { hitStopTimer = Math.max(hitStopTimer, dur); }
function slowMo(dur, scale) { slowMoTimer = dur; slowMoScale = scale; }
function getTimeScale() {
  if (hitStopTimer > 0) return 0;
  if (slowMoTimer > 0) return slowMoScale;
  return 1;
}

// ─── SCREEN FLASH ───
let flashColor = '', flashTimer = 0;
function screenFlash(color, dur=0.08) { flashColor=color; flashTimer=dur; }

// ─── EDGE VIGNETTE ───
let vignetteColor = '', vignetteTimer = 0;
function vignette(color, dur=0.3) { vignetteColor=color; vignetteTimer=dur; }

// ─── CROC FIGHTER ───
function mkCroc(x, face, cMain, cBelly, name, nameShort) {
  return {
    x, y: FLOOR_Y-CROC_H, vx:0, vy:0, w:CROC_W, h:CROC_H,
    face, cMain, cBelly, name, nameShort,
    hp: MAX_HP, wins:0, alive:true, grounded:true,
    // attack
    atk:false, atkT:0, atkCD:0, pillowAng:0,
    // dash
    dashing:false, dashT:0, dashCD:0, dashDir:0,
    // special
    specAct:false, specT:0, specCD:0,
    // parry
    parrying:false, parryT:0, parryCD:0, parrySuccess:false, stunned:false, stunT:0,
    // juice
    hitFlash:0, squash:1, stretch:1,
    // combo tracking
    combo:0, comboTimer:0, maxCombo:0, totalDmg:0, hitsLanded:0, parryCount:0,
    // comeback
    comebackActive:false, comebackFlash:0,
    // KO death
    dead:false, deathVx:0, deathVy:0, deathBounces:0, deathRot:0, deathRotV:0,
    // input buffer
    bufferedAtk:false, bufferedParry:false,
  };
}

function resetCroc(c, x) {
  c.x=x; c.y=FLOOR_Y-CROC_H; c.vx=0; c.vy=0;
  c.hp=MAX_HP; c.alive=true; c.grounded=true;
  c.atk=false; c.atkT=0; c.atkCD=0; c.pillowAng=0;
  c.dashing=false; c.dashT=0; c.dashCD=0;
  c.specAct=false; c.specT=0; c.specCD=0;
  c.parrying=false; c.parryT=0; c.parryCD=0; c.parrySuccess=false;
  c.stunned=false; c.stunT=0;
  c.hitFlash=0; c.squash=1; c.stretch=1;
  c.combo=0; c.comboTimer=0; c.maxCombo=0; c.totalDmg=0; c.hitsLanded=0; c.parryCount=0;
  c.comebackActive=false; c.comebackFlash=0;
  c.dead=false; c.deathVx=0; c.deathVy=0; c.deathBounces=0; c.deathRot=0; c.deathRotV=0;
  c.bufferedAtk=false; c.bufferedParry=false;
}

// ─── DAMAGE / HIT ───
function dealDmg(attacker, victim, dmg, dir, isHeavy) {
  // Parry check
  if (victim.parrying && victim.parryT > 0) {
    // PARRIED!
    victim.parrySuccess = true;
    attacker.stunned = true;
    attacker.stunT = PARRY_STUN;
    hitStop(HITSTOP_PARRY);
    addTrauma(0.35);
    screenFlash('rgba(139,92,246,0.3)');
    sfxParry();
    sparks(victim.x+victim.w/2, victim.y+victim.h/2, 15, '#a78bfa');
    ring(victim.x+victim.w/2, victim.y+victim.h/2, 'rgba(139,92,246,0.5)');
    floatText(victim.x+victim.w/2, victim.y-30, pick(PARRY_LINES), '#a78bfa', 28);
    victim.parryCount++;
    return;
  }

  // Comeback multiplier
  const mult = attacker.comebackActive ? COMEBACK_MULT : 1;
  const finalDmg = dmg * mult;

  victim.hp = Math.max(0, victim.hp - finalDmg);
  victim.hitFlash = 0.15;
  victim.vx = dir * KNOCKBACK * (isHeavy ? 1.4 : 1);
  victim.vy = KB_UP * (isHeavy ? 1.3 : 1);
  victim.grounded = false;
  victim.combo = 0; victim.comboTimer = 0; // break victim's combo

  // Attacker combo
  attacker.combo++;
  attacker.comboTimer = 1.5;
  attacker.hitsLanded++;
  attacker.totalDmg += finalDmg;
  if (attacker.combo > attacker.maxCombo) attacker.maxCombo = attacker.combo;

  // Juice based on hit weight
  if (isHeavy) {
    hitStop(HITSTOP_HEAVY);
    addTrauma(0.5);
    feathers(victim.x+victim.w/2, victim.y+victim.h/2, 12, '#fff');
    screenFlash('rgba(255,255,255,0.15)');
  } else {
    hitStop(HITSTOP_LIGHT);
    addTrauma(0.2 + attacker.combo*0.02);
    feathers(victim.x+victim.w/2, victim.y+victim.h/2, 5, '#fff');
  }

  sfxHit(attacker.combo);
  floatDmg(victim.x+victim.w/2, victim.y, finalDmg, attacker.combo);

  // Combo milestones
  if (COMBO_MILESTONES[attacker.combo]) {
    slam(COMBO_MILESTONES[attacker.combo], '#ffd740', 1.0);
    sfxComboMilestone(attacker.combo);
    stars(attacker.x+attacker.w/2, attacker.y, 10);
  }

  // KO check
  if (victim.hp <= 0) {
    victim.alive = false;
    victim.dead = true;
    victim.deathVx = dir * 500;
    victim.deathVy = -250;
    victim.deathRotV = dir * 12;
    // Epic KO sequence
    hitStop(HITSTOP_KO);
    slowMo(SLOWMO_DUR, SLOWMO_SCALE);
    addTrauma(1.0);
    screenFlash('rgba(255,255,255,0.35)', 0.15);
    feathers(victim.x+victim.w/2, victim.y+victim.h/2, 35, '#ffd740');
    sparks(victim.x+victim.w/2, victim.y+victim.h/2, 20, '#ff6b35');
    stars(victim.x+victim.w/2, victim.y+victim.h/2, 15);
    sfxKO();
    slam("KO!!", '#ff3d00', 1.8);
    vignette('rgba(255,60,0,0.25)', 0.5);
  }
}

// ─── UPDATE CROC ───
function updateCroc(c, inp, other, dt) {
  // Cooldowns
  c.atkCD = Math.max(0, c.atkCD-dt);
  c.dashCD = Math.max(0, c.dashCD-dt);
  c.specCD = Math.max(0, c.specCD-dt);
  c.parryCD = Math.max(0, c.parryCD-dt);
  c.hitFlash = Math.max(0, c.hitFlash-dt);
  c.squash = lerp(c.squash, 1, dt*10);
  c.stretch = lerp(c.stretch, 1, dt*10);
  c.comboTimer = Math.max(0, c.comboTimer-dt);
  if (c.comboTimer<=0) c.combo=0;

  // Comeback check
  const wasComeback = c.comebackActive;
  c.comebackActive = c.hp/MAX_HP <= COMEBACK_THRESH && c.alive;
  if (c.comebackActive && !wasComeback) {
    sfxComeback();
    floatText(c.x+c.w/2, c.y-40, pick(COMEBACK_LINES), '#ff3d00', 24);
    vignette('rgba(255,0,0,0.2)', 0.5);
  }
  if (c.comebackActive) c.comebackFlash += dt*6;

  // Death physics
  if (c.dead) {
    c.deathRot += c.deathRotV * dt;
    c.x += c.deathVx * dt;
    c.y += c.deathVy * dt;
    c.deathVy += GRAVITY * 1.2 * dt;
    // Wall bounces
    if (c.x < 10) { c.x=10; c.deathVx*=-0.6; c.deathBounces++; addTrauma(0.3); sfxBounce(); }
    if (c.x+c.w > AW-10) { c.x=AW-c.w-10; c.deathVx*=-0.6; c.deathBounces++; addTrauma(0.3); sfxBounce(); }
    // Floor bounce
    if (c.y+c.h > FLOOR_Y) {
      c.y=FLOOR_Y-c.h; c.deathVy*=-0.4; c.deathVx*=0.7;
      c.deathBounces++;
      if (Math.abs(c.deathVy) > 30) { addTrauma(0.15); sfxBounce(); }
    }
    return;
  }
  if (!c.alive) return;

  // Stun
  if (c.stunned) {
    c.stunT -= dt;
    if (c.stunT<=0) c.stunned=false;
    c.vx *= 0.85;
    // Physics
    c.vy += GRAVITY*dt; c.x+=c.vx*dt; c.y+=c.vy*dt;
    if(c.y+c.h>FLOOR_Y){c.y=FLOOR_Y-c.h;c.vy=0;c.grounded=true}
    c.x=clamp(c.x,10,AW-c.w-10);
    return;
  }

  // Parry
  if (c.parrying) {
    c.parryT -= dt;
    if (c.parryT <= 0) {
      c.parrying = false;
      if (!c.parrySuccess) c.parryCD = PARRY_CD; // failed parry has cooldown
    }
    c.parrySuccess = false;
  }

  // Movement
  let mx=0;
  if(inp.left) mx-=1;
  if(inp.right) mx+=1;
  if(inp.up && c.grounded) {
    c.vy=JUMP_VEL; c.grounded=false;
    c.squash=0.6; c.stretch=1.4;
    sfxBounce();
    ring(c.x+c.w/2, c.y+c.h);
  }

  // Dashing
  if(c.dashing) {
    c.dashT-=dt; c.vx=c.dashDir*DASH_SPD;
    if(c.dashT<=0) c.dashing=false;
  } else if(!c.specAct) {
    c.vx=mx*MOVE_SPD;
  }

  // --- INPUT BUFFER: consume buffered inputs ---
  if (c.bufferedAtk && c.atkCD<=0 && !c.atk && !c.specAct && !c.parrying) {
    inp.attack = true;
  }
  if (c.bufferedParry && c.parryCD<=0 && !c.parrying && !c.atk && !c.specAct) {
    inp.parry = true;
  }
  c.bufferedAtk = false;
  c.bufferedParry = false;

  // Attack
  if(inp.attack && c.atkCD<=0 && !c.atk && !c.specAct && !c.parrying) {
    c.atk=true; c.atkT=0.18; c.atkCD=ATK_CD; c.pillowAng=0;
    sfxHit(c.combo);
    const cx=c.x+c.w/2+c.face*30, cy=c.y+c.h/2;
    const ox=other.x+other.w/2, oy=other.y+other.h/2;
    if(dist(cx,cy,ox,oy)<ATK_RANGE && other.alive) {
      dealDmg(c, other, ATK_DMG, c.face, false);
    }
  } else if (inp.attack && (c.atk || c.atkCD>0)) {
    c.bufferedAtk = true; // buffer it
  }
  if(c.atk) {
    c.atkT-=dt;
    c.pillowAng=lerp(c.pillowAng, c.face*2.0, dt*25);
    if(c.atkT<=0){c.atk=false;c.pillowAng=0}
  }

  // Parry
  if(inp.parry && c.parryCD<=0 && !c.parrying && !c.atk && !c.specAct) {
    c.parrying=true; c.parryT=PARRY_WINDOW; c.parrySuccess=false; c.parryCD=0;
  } else if (inp.parry && (c.parrying || c.parryCD>0)) {
    c.bufferedParry = true;
  }

  // Dash (Belly Bounce)
  if(inp.dash && c.dashCD<=0 && !c.dashing && !c.specAct) {
    c.dashing=true; c.dashT=DASH_DUR; c.dashCD=DASH_CD; c.dashDir=c.face;
    c.squash=1.5; c.stretch=0.6;
    sfxDash();
    // Delayed hit check
    const checkDash = () => {
      if(!c.alive||!other.alive) return;
      const d=dist(c.x+c.w/2,c.y+c.h/2,other.x+other.w/2,other.y+other.h/2);
      if(d<80) dealDmg(c, other, DASH_DMG, c.dashDir, true);
    };
    setTimeout(checkDash, 80);
  }

  // Special (Pillow Tornado)
  if(inp.special && c.specCD<=0 && !c.specAct) {
    c.specAct=true; c.specT=SPEC_DUR; c.specCD=SPEC_CD;
    sfxSpecial();
    slam("TORNADO!!", c.cMain, 0.8);
  }
  if(c.specAct) {
    c.specT-=dt; c.vx=c.face*140;
    const d=dist(c.x+c.w/2,c.y+c.h/2,other.x+other.w/2,other.y+other.h/2);
    if(d<90 && other.alive && Math.random()<dt*10) {
      dealDmg(c, other, SPEC_DMG, c.face, false);
    }
    feathers(c.x+c.w/2+rand(-15,15), c.y+c.h/2+rand(-10,10), 1, c.cMain);
    if(c.specT<=0) c.specAct=false;
  }

  // Physics
  c.vy += GRAVITY*dt;
  c.x += c.vx*dt;
  c.y += c.vy*dt;

  // Floor
  if(c.y+c.h>FLOOR_Y) {
    c.y=FLOOR_Y-c.h;
    if(c.vy>120){c.squash=1.25;c.stretch=0.75;sfxBounce();ring(c.x+c.w/2,FLOOR_Y)}
    c.vy=0; c.grounded=true;
  }
  c.x=clamp(c.x,10,AW-c.w-10);

  // Face opponent
  if(!c.dashing && !c.specAct) {
    c.face = (other.x+other.w/2 > c.x+c.w/2) ? 1 : -1;
  }
}

// ─── DRAW CROC ───
function drawCroc(c) {
  ctx.save();
  const cx=c.x+c.w/2, cy=c.y+c.h/2;
  ctx.translate(cx,cy);

  // Death rotation
  if(c.dead) ctx.rotate(c.deathRot);

  ctx.scale(c.face,1);
  ctx.scale(c.squash,c.stretch);

  // Special spin
  if(c.specAct) ctx.rotate((Date.now()/55)%(Math.PI*2));

  // Hit flash
  if(c.hitFlash>0 && Math.floor(c.hitFlash*30)%2===0) ctx.globalAlpha=0.4;

  // Stun dizzy
  if(c.stunned) ctx.globalAlpha=0.6+Math.sin(Date.now()*0.02)*0.2;

  // Comeback glow
  if(c.comebackActive && !c.dead) {
    ctx.shadowColor='#ff3d00';
    ctx.shadowBlur=15+Math.sin(c.comebackFlash)*8;
  }

  const hw=c.w/2, hh=c.h/2;

  // Shadow
  ctx.fillStyle='rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(0,hh+5,hw*0.8,6,0,0,6.28); ctx.fill();

  // Body
  ctx.fillStyle=c.cMain;
  ctx.beginPath(); ctx.ellipse(0,0,hw,hh,0,0,6.28); ctx.fill();

  // Belly
  ctx.fillStyle=c.cBelly;
  ctx.beginPath(); ctx.ellipse(0,4,hw*0.6,hh*0.5,0,0,6.28); ctx.fill();

  // Snout
  ctx.fillStyle=c.cMain;
  ctx.beginPath(); ctx.ellipse(hw*0.78,-1,hw*0.52,hh*0.38,0,0,6.28); ctx.fill();

  // Teeth
  ctx.strokeStyle='#fff'; ctx.lineWidth=1.5;
  ctx.beginPath();
  for(let tx=hw*0.4;tx<hw*1.15;tx+=5){
    const ty=(tx%10<5)?2.5:-2.5;
    if(tx===hw*0.4) ctx.moveTo(tx,ty); else ctx.lineTo(tx,ty);
  }
  ctx.stroke();

  // Nostrils
  ctx.fillStyle='rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.arc(hw*1.05, -4, 2, 0, 6.28); ctx.fill();
  ctx.beginPath(); ctx.arc(hw*1.05, 1, 2, 0, 6.28); ctx.fill();

  // Eye - bigger and goofier
  ctx.fillStyle='#fff';
  ctx.beginPath(); ctx.ellipse(hw*0.32, -hh*0.5, 9, 10, 0, 0, 6.28); ctx.fill();
  // Pupil tracks opponent
  const pupX = hw*0.36 + (c.stunned ? Math.sin(Date.now()*0.01)*3 : 2);
  const pupY = -hh*0.5 + (c.stunned ? Math.cos(Date.now()*0.012)*3 : 0);
  ctx.fillStyle='#1a1a2e';
  ctx.beginPath(); ctx.arc(pupX, pupY, 4.5, 0, 6.28); ctx.fill();
  ctx.fillStyle='#fff';
  ctx.beginPath(); ctx.arc(pupX+1.5, pupY-1.5, 1.5, 0, 6.28); ctx.fill();

  // Eyebrow - angry when low hp or attacking
  if(c.comebackActive || c.atk || c.specAct) {
    ctx.strokeStyle=c.cMain; ctx.lineWidth=3;
    ctx.beginPath(); ctx.moveTo(hw*0.15,-hh*0.7); ctx.lineTo(hw*0.5,-hh*0.85); ctx.stroke();
  }

  // Tail - wiggly
  const tailWag = Math.sin(Date.now()*0.008)*0.3;
  ctx.fillStyle=c.cMain;
  ctx.beginPath(); ctx.moveTo(-hw,0);
  ctx.quadraticCurveTo(-hw-22,-12+tailWag*10,-hw-30,4+tailWag*5);
  ctx.quadraticCurveTo(-hw-16,12,-hw,6);
  ctx.closePath(); ctx.fill();

  // Legs (stubby, animated when moving)
  ctx.fillStyle=c.cMain;
  const legBob = c.grounded ? Math.sin(Date.now()*0.01)*3 : 5;
  ctx.fillRect(hw*0.25, hh*0.4+legBob, 9, 11);
  ctx.fillRect(hw*0.55, hh*0.4-legBob, 9, 11);
  ctx.fillRect(-hw*0.55, hh*0.4+legBob, 9, 11);
  ctx.fillRect(-hw*0.25, hh*0.4-legBob, 9, 11);

  // Spikes
  const spkCol = c.comebackActive ? '#ff3d00' : c.cMain;
  ctx.fillStyle=spkCol;
  for(let i=-3;i<=2;i++){
    const sx=i*9;
    ctx.beginPath(); ctx.moveTo(sx-3,-hh); ctx.lineTo(sx,-hh-7); ctx.lineTo(sx+3,-hh); ctx.closePath(); ctx.fill();
  }

  // Parry shield
  if(c.parrying) {
    ctx.globalAlpha=0.5;
    ctx.strokeStyle='#a78bfa'; ctx.lineWidth=3;
    ctx.beginPath(); ctx.arc(0,0,hw+15,0,6.28); ctx.stroke();
    ctx.globalAlpha=1;
  }

  // Pillow
  ctx.save();
  ctx.translate(hw*0.55, -hh*0.1);
  ctx.rotate(c.pillowAng);
  drawPillow(ctx, 22, 0, 20, c===p1 ? '#87ceeb' : '#ffb6c1');
  ctx.restore();

  // Tornado rings
  if(c.specAct) {
    ctx.globalAlpha=0.45;
    ctx.strokeStyle='#ffd740'; ctx.lineWidth=3;
    const t=Date.now()/80;
    for(let r=0;r<3;r++){
      ctx.beginPath(); ctx.arc(0,0,hw+15+r*14,t+r,t+r+4.5); ctx.stroke();
    }
    ctx.globalAlpha=1;
  }

  // Dash trail
  if(c.dashing) {
    ctx.globalAlpha=0.3; ctx.fillStyle=c.cBelly;
    ctx.beginPath(); ctx.ellipse(-22,0,hw*0.7,hh*0.5,0,0,6.28); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-40,0,hw*0.4,hh*0.3,0,0,6.28); ctx.fill();
    ctx.globalAlpha=1;
  }

  // Stun stars
  if(c.stunned) {
    ctx.fillStyle='#ffd740';
    for(let i=0;i<3;i++){
      const sa=Date.now()*0.005+i*2.1;
      const sx=Math.cos(sa)*25, sy=-hh-12+Math.sin(sa)*6;
      ctx.save(); ctx.translate(sx,sy); ctx.rotate(sa*2);
      drawStar(ctx,0,0,5,5,2); ctx.restore();
    }
  }

  ctx.shadowBlur=0;
  ctx.restore();
}

function drawPillow(c,x,y,sz,col) {
  c.save(); c.translate(x,y);
  c.fillStyle=col;
  const r=sz*0.3, hs=sz/2;
  c.beginPath();
  c.moveTo(-hs+r,-hs); c.lineTo(hs-r,-hs);
  c.quadraticCurveTo(hs,-hs,hs,-hs+r); c.lineTo(hs,hs-r);
  c.quadraticCurveTo(hs,hs,hs-r,hs); c.lineTo(-hs+r,hs);
  c.quadraticCurveTo(-hs,hs,-hs,hs-r); c.lineTo(-hs,-hs+r);
  c.quadraticCurveTo(-hs,-hs,-hs+r,-hs);
  c.closePath(); c.fill();
  // Pillow seams
  c.strokeStyle='rgba(255,255,255,0.25)'; c.lineWidth=1;
  c.beginPath(); c.moveTo(-hs*.4,-hs); c.lineTo(-hs*.4,hs); c.moveTo(hs*.4,-hs); c.lineTo(hs*.4,hs); c.stroke();
  // Feather poke
  c.fillStyle='#fff'; c.globalAlpha=0.4;
  c.beginPath(); c.ellipse(hs+3,-2,4,2,0.3,0,6.28); c.fill();
  c.globalAlpha=1;
  c.restore();
}

// ─── ARENA ───
const signs = ["SILVER DOLLAR CITY","BALDKNOBBERS","CROC CLASH ARENA","DOLLY'S STAMPEDE","GO-KARTS →","FUDGE SHOP","BRANSON LANDING","PILLOW EMPORIUM","THE STRIP","DUCK TOURS"];
function drawArena() {
  // Sky
  const sg=ctx.createLinearGradient(0,0,0,AH);
  sg.addColorStop(0,'#0c0a24'); sg.addColorStop(0.5,'#151335'); sg.addColorStop(1,'#1a1840');
  ctx.fillStyle=sg; ctx.fillRect(0,0,AW,AH);

  // Stars
  ctx.fillStyle='rgba(255,255,255,0.35)';
  for(let i=0;i<50;i++){
    const sx=(i*137.5+23)%AW, sy=(i*97.3+11)%(AH*0.45);
    const ss=((i*7)%3)+1;
    const twinkle = 0.3+Math.sin(Date.now()*0.002+i)*0.2;
    ctx.globalAlpha=twinkle; ctx.fillRect(sx,sy,ss,ss);
  }
  ctx.globalAlpha=1;

  // Moon
  ctx.fillStyle='#ffd740'; ctx.globalAlpha=0.15;
  ctx.beginPath(); ctx.arc(650,60,35,0,6.28); ctx.fill();
  ctx.globalAlpha=1;

  // Neon signs
  ctx.save(); ctx.globalAlpha=0.12;
  ctx.font='700 13px Fredoka,sans-serif'; ctx.textAlign='center';
  for(let i=0;i<signs.length;i++){
    const sx=((i*95+50)%(AW-60))+30;
    const sy=55+(i%4)*28;
    const hue=(i*40+Date.now()*0.01)%360;
    ctx.fillStyle=`hsl(${hue},75%,60%)`;
    ctx.fillText(signs[i],sx,sy);
  }
  ctx.restore();

  // Hills
  ctx.fillStyle='#12102a';
  ctx.beginPath(); ctx.moveTo(0,FLOOR_Y-35);
  for(let x=0;x<=AW;x+=30) ctx.lineTo(x,FLOOR_Y-35-Math.sin(x*.014)*22-Math.cos(x*.028)*14);
  ctx.lineTo(AW,FLOOR_Y); ctx.lineTo(0,FLOOR_Y); ctx.closePath(); ctx.fill();

  // Floor
  const fg=ctx.createLinearGradient(0,FLOOR_Y,0,AH);
  fg.addColorStop(0,'#222045'); fg.addColorStop(1,'#1a1838');
  ctx.fillStyle=fg; ctx.fillRect(0,FLOOR_Y,AW,AH-FLOOR_Y);

  // Floor lines
  ctx.strokeStyle='rgba(255,255,255,0.04)'; ctx.lineWidth=1;
  for(let y=FLOOR_Y+12;y<AH;y+=14){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(AW,y);ctx.stroke()}

  // Arena boundary
  ctx.strokeStyle='rgba(255,255,255,0.06)'; ctx.lineWidth=2;
  ctx.setLineDash([8,8]); ctx.beginPath(); ctx.moveTo(10,FLOOR_Y); ctx.lineTo(AW-10,FLOOR_Y); ctx.stroke();
  ctx.setLineDash([]);

  // Pillow stacks on walls
  for(let side=0;side<2;side++){
    const wx=side===0?5:AW-25;
    for(let py=FLOOR_Y-90;py<FLOOR_Y;py+=18){
      const hue=((py*3+side*130)%360);
      ctx.fillStyle=`hsl(${hue},45%,35%)`;
      ctx.beginPath(); ctx.ellipse(wx+10,py+9,15,8,0.2*(side?1:-1),0,6.28); ctx.fill();
    }
  }
}

// ─── AI ───
function getAI(ai, tgt) {
  const inp={left:false,right:false,up:false,attack:false,dash:false,special:false,parry:false};
  const dx=tgt.x-ai.x, adx=Math.abs(dx), dy=tgt.y-ai.y;

  // Movement
  if(adx>75){if(dx>0)inp.right=true;else inp.left=true}
  else if(adx<40){if(dx>0)inp.left=true;else inp.right=true} // back off if too close

  // Jump to dodge attacks or randomly
  if(ai.grounded && ((tgt.atk&&adx<90&&Math.random()<0.35) || Math.random()<0.012)) inp.up=true;

  // Attack when close
  if(adx<70 && ai.atkCD<=0 && Math.random()<0.5) inp.attack=true;

  // Parry incoming attacks
  if(tgt.atk && tgt.atkT>0.1 && adx<80 && ai.parryCD<=0 && Math.random()<0.25) inp.parry=true;

  // Dash
  if(adx<130 && adx>50 && ai.dashCD<=0 && Math.random()<0.06) inp.dash=true;

  // Special
  if(adx<100 && ai.specCD<=0 && Math.random()<0.025) inp.special=true;

  // Retreat if low
  if(ai.hp<25 && adx<55){inp.left=dx>0;inp.right=dx<0}

  return inp;
}

// ─── GAME STATE ───
let state='title', isAI=false;
let p1, p2, roundTimer, roundNum, countdownT;
let lastTS=0, gameTime=0;
let matchStats = {};

function initPlayers() {
  p1=mkCroc(160,1,'#4ade80','#bbf7d0','Gator Gary','GARY');
  p2=mkCroc(560,-1,'#f472b6','#fce7f3','Croc Carl','CARL');
}
function resetRound() {
  resetCroc(p1,160); resetCroc(p2,560);
  roundTimer=ROUND_TIME;
  parts.length=0; floats.length=0;
  trauma=0; hitStopTimer=0; slowMoTimer=0;
  slamTimer=0; flashTimer=0; vignetteTimer=0;
}
function startGame(ai) {
  isAI=ai; initPlayers(); roundNum=1;
  matchStats={p1TotalDmg:0,p2TotalDmg:0,p1MaxCombo:0,p2MaxCombo:0,p1Parries:0,p2Parries:0,rounds:0};
  startCountdown();
}
function startCountdown() {
  resetRound(); state='countdown'; countdownT=2.0;
  slam(`Round ${roundNum}`, '#ffd740', 1.5);
  sfxRoundStart();
  $('hud').classList.remove('hidden');
  $('title-screen').classList.add('hidden');
  $('result-screen').classList.add('hidden');
}
function startPlaying() {
  state='playing';
  slam(pick(ROUND_INTROS), '#fff', 1.0);
}
function endRound(winner) {
  state='roundEnd';
  matchStats.rounds++;
  // Track stats
  matchStats.p1TotalDmg+=p1.totalDmg; matchStats.p2TotalDmg+=p2.totalDmg;
  matchStats.p1MaxCombo=Math.max(matchStats.p1MaxCombo,p1.maxCombo);
  matchStats.p2MaxCombo=Math.max(matchStats.p2MaxCombo,p2.maxCombo);
  matchStats.p1Parries+=p1.parryCount; matchStats.p2Parries+=p2.parryCount;

  if(winner) {
    winner.wins++;
    // Perfect round check
    if(winner.hp >= MAX_HP) {
      slam(pick(PERFECT_LINES), '#ffd740', 2.0);
      sfxPerfect();
      goldenShower(AW/2, AH*0.3);
    } else {
      slam(pick(KO_LINES), '#ff3d00', 1.8);
    }
  } else {
    slam("TIME'S UP!!", '#fbbf24', 1.5);
  }

  setTimeout(()=>{
    if(p1.wins>=ROUNDS_TO_WIN || p2.wins>=ROUNDS_TO_WIN) endMatch();
    else { roundNum++; startCountdown(); }
  }, 2800);
}
function endMatch() {
  state='result';
  const w = p1.wins>=ROUNDS_TO_WIN ? p1 : p2;
  const wc = w===p1 ? 'var(--color-p1)' : 'var(--color-p2)';
  $('res-winner').textContent=`🐊 ${w.name} ${pick(WIN_LINES)}`;
  $('res-winner').style.color=wc;
  $('res-score').textContent=`${p1.wins} — ${p2.wins}`;
  $('res-stats').innerHTML=`
    <div><div class="val">${matchStats.p1TotalDmg.toFixed(0)}</div><div class="lbl">Gary Dmg</div></div>
    <div><div class="val">${matchStats.p2TotalDmg.toFixed(0)}</div><div class="lbl">Carl Dmg</div></div>
    <div><div class="val">${matchStats.p1MaxCombo}</div><div class="lbl">Gary Best Combo</div></div>
    <div><div class="val">${matchStats.p2MaxCombo}</div><div class="lbl">Carl Best Combo</div></div>
    <div><div class="val">${matchStats.p1Parries}</div><div class="lbl">Gary Parries</div></div>
    <div><div class="val">${matchStats.p2Parries}</div><div class="lbl">Carl Parries</div></div>
  `;
  $('result-screen').classList.remove('hidden');
}

// ─── HUD ───
function updateHUD() {
  $('p1hp').style.width=`${(p1.hp/MAX_HP)*100}%`;
  $('p2hp').style.width=`${(p2.hp/MAX_HP)*100}%`;
  $('p1s').textContent=`HP ${Math.ceil(p1.hp)} · W ${p1.wins}`;
  $('p2s').textContent=`HP ${Math.ceil(p2.hp)} · W ${p2.wins}`;
  $('hround').textContent=`ROUND ${roundNum}`;
  const te=$('htimer');
  te.textContent=Math.ceil(Math.max(0,roundTimer));
  te.className=roundTimer<10?'htimer warn':'htimer';
  // Combo displays
  $('p1combo').textContent=p1.combo>=3?`${p1.combo} HIT COMBO · x${Math.min(Math.floor(p1.combo/3)+1,10)}`:'';
  $('p2combo').textContent=p2.combo>=3?`${p2.combo} HIT COMBO · x${Math.min(Math.floor(p2.combo/3)+1,10)}`:'';
  // Comeback indicator on health bars
  $('p1hp').style.boxShadow = p1.comebackActive ? '0 0 12px #ff3d00' : 'none';
  $('p2hp').style.boxShadow = p2.comebackActive ? '0 0 12px #ff3d00' : 'none';
}

// ─── INPUT ───
function getP1() {
  return {
    left:keys.KeyA||ts.left, right:keys.KeyD||ts.right,
    up:jp.KeyW||ts.up, attack:jp.KeyF||ts.attack,
    dash:jp.KeyG||ts.dash, special:jp.KeyH||ts.special,
    parry:jp.KeyR||ts.parry,
  };
}
function getP2() {
  if(isAI) return getAI(p2,p1);
  return {
    left:keys.ArrowLeft, right:keys.ArrowRight,
    up:jp.ArrowUp, attack:jp.KeyL,
    dash:jp.KeyK, special:jp.KeyJ, parry:jp.KeyP,
  };
}

// ─── MAIN LOOP ───
function loop(ts_now) {
  requestAnimationFrame(loop);
  const rawDt = Math.min((ts_now-lastTS)/1000, 0.1);
  lastTS = ts_now;

  // Time scaling
  hitStopTimer = Math.max(0, hitStopTimer - rawDt);
  slowMoTimer = Math.max(0, slowMoTimer - rawDt);
  flashTimer = Math.max(0, flashTimer - rawDt);
  vignetteTimer = Math.max(0, vignetteTimer - rawDt);
  const tScale = getTimeScale();
  const dt = rawDt * tScale;

  updateShake(rawDt); // shake always runs in real time
  updateParts(dt);
  updateFloats(dt);

  // State logic
  if(state==='countdown') {
    countdownT-=rawDt;
    if(countdownT<=0) startPlaying();
  }
  if(state==='playing') {
    updateCroc(p1, getP1(), p2, dt);
    updateCroc(p2, getP2(), p1, dt);
    roundTimer -= dt;
    if(!p1.alive) endRound(p2);
    else if(!p2.alive) endRound(p1);
    else if(roundTimer<=0) {
      if(p1.hp>p2.hp) endRound(p1);
      else if(p2.hp>p1.hp) endRound(p2);
      else endRound(null);
    }
    updateHUD();
  }
  if(state==='roundEnd') {
    updateCroc(p1, {}, p2, dt);
    updateCroc(p2, {}, p1, dt);
    updateHUD();
  }

  // ─── RENDER ───
  ctx.save();
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle='#08081a'; ctx.fillRect(0,0,W,H);

  ctx.translate(offX+shakeX*scale, offY+shakeY*scale);
  ctx.scale(scale,scale);

  if(state!=='title' && state!=='result') {
    drawArena();
    if(p1&&p2) {
      // Draw behind croc first (death = behind)
      if(p1.dead) drawCroc(p1);
      if(p2.dead) drawCroc(p2);
      if(!p1.dead) drawCroc(p1);
      if(!p2.dead) drawCroc(p2);
    }
    drawParts();
    drawFloats();
    drawSlam(rawDt);

    // Screen flash overlay
    if(flashTimer>0) {
      ctx.fillStyle=flashColor;
      ctx.globalAlpha=clamp(flashTimer/0.08,0,1)*0.6;
      ctx.fillRect(0,0,AW,AH);
      ctx.globalAlpha=1;
    }

    // Vignette
    if(vignetteTimer>0) {
      const va=clamp(vignetteTimer/0.3,0,1)*0.5;
      const vg=ctx.createRadialGradient(AW/2,AH/2,AW*0.3,AW/2,AH/2,AW*0.7);
      vg.addColorStop(0,'transparent'); vg.addColorStop(1,vignetteColor);
      ctx.globalAlpha=va; ctx.fillStyle=vg; ctx.fillRect(0,0,AW,AH); ctx.globalAlpha=1;
    }

    // Slow-mo indicator
    if(slowMoTimer>0) {
      ctx.globalAlpha=0.08;
      ctx.fillStyle='#000'; ctx.fillRect(0,0,AW,AH);
      // Letterbox bars for cinematic feel
      const barH = 25 * clamp(slowMoTimer/SLOWMO_DUR,0,1);
      ctx.globalAlpha=0.4; ctx.fillStyle='#000';
      ctx.fillRect(0,0,AW,barH);
      ctx.fillRect(0,AH-barH,AW,barH);
      ctx.globalAlpha=1;
    }
  }

  ctx.restore();

  // Clear input
  for(const k in jp) delete jp[k];
  ts.attack=false; ts.dash=false; ts.special=false; ts.parry=false;
}

// ─── DOM HELPERS ───
const $ = id => document.getElementById(id);

// ─── EVENTS ───
$('btn-pvp').addEventListener('click', ()=>{ initAudio(); startGame(false); });
$('btn-ai').addEventListener('click', ()=>{ initAudio(); startGame(true); });
$('btn-rematch').addEventListener('click', ()=>{ roundNum=1; startGame(isAI); });
$('btn-menu2').addEventListener('click', ()=>{
  state='title';
  $('title-screen').classList.remove('hidden');
  $('result-screen').classList.add('hidden');
  $('hud').classList.add('hidden');
});

// ─── START ───
requestAnimationFrame(loop);

})();
