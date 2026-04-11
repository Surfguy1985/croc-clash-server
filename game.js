// ============================================================
//  CROC CLASH — PIXAR EDITION v3.0
//  Image-based Pixar sprites, cinematic camera, narrator audio,
//  premium arcade everything
// ============================================================
(() => {
'use strict';

// ─── ARENA ───
const AW = 960, AH = 540;
const FLOOR_Y = AH - 58;
const MAX_HP = 100, ROUND_TIME = 30, ROUNDS_TO_WIN = 3;

// ─── FIGHTERS (tall upright crocs) ───
const CW = 140, CH = 200; // Tall standing crocs
const MOVE_SPD = 195, GRAVITY = 680, JUMP_VEL = -380;
const ATK_RANGE = 110, ATK_DMG = 10, ATK_CD = 0.28;
const DASH_SPD = 560, DASH_DUR = 0.2, DASH_CD = 0.85, DASH_DMG = 9;
const SPEC_DMG = 6, SPEC_CD = 3.5, SPEC_DUR = 0.7;
const TAIL_RANGE = 130, TAIL_DMG = 15, TAIL_CD = 1.8;
const PARRY_WIN = 0.12, PARRY_CD = 0.7, PARRY_STUN = 0.55;
const KB = 340, KB_UP = -180;
const COMEBACK_TH = 0.25, COMEBACK_M = 1.5;

// ─── JUICE ───
const HS_LIGHT=0.05, HS_HEAVY=0.14, HS_KO=0.28, HS_PARRY=0.1, HS_TAIL=0.18;
const SLO_DUR=0.7, SLO_SCALE=0.18, TRAUMA_DECAY=1.6;

// ─── UTILS ───
const lerp=(a,b,t)=>a+(b-a)*t, clamp=(v,l,h)=>Math.max(l,Math.min(h,v));
const dist=(x1,y1,x2,y2)=>Math.hypot(x2-x1,y2-y1);
const rand=(a,b)=>Math.random()*(b-a)+a, randInt=(a,b)=>Math.floor(rand(a,b+1));
const pick=a=>a[randInt(0,a.length-1)];
const TAU=Math.PI*2;
const _ps=Math.random()*1e3;
function noise1D(x){const i=Math.floor(x),f=x-i,u=f*f*(3-2*f);const a=Math.sin(i*127.1+_ps)*43758.5453;const b=Math.sin((i+1)*127.1+_ps)*43758.5453;return lerp(a-Math.floor(a),b-Math.floor(b),u)*2-1}

// ─── FUNNY TEXT ───
const ROUND_INTROS=["PILLOW FIGHT!!","FEATHERS WILL FLY!!","IT'S SMACKIN' TIME!!","BRANSON BRAWL!!","FLUFF 'EM UP!!","NOBODY SLEEPS TONIGHT!!","WELCOME TO THE STRIP!!","CROCS OUT!!"];
const KO_LINES=["NAPTIME!!","TOTALLY FLUFFED!!","LIGHTS OUT!!","FEATHERED!!","PILLOW'D!!","STUFFING EVERYWHERE!!","SLEEP TIGHT!!","TUCKED IN!!","BEDTIME!!"];
const PERFECT_LINES=["FLAWLESS FLUFF!!","UNTOUCHABLE CROC!!","PILLOW PERFECTION!!"];
const PARRY_LINES=["DENIED!!","NOT TODAY!!","PILLOW BLOCKED!!","NOPE!!","READ LIKE A BOOK!!"];
const COMEBACK_LINES=["RAGE MODE!!","CROC FURY!!","LAST STAND!!"];
const WIN_LINES=["is the Branson Pillow Champion!","reigns supreme on the Strip!","has the fluffiest swing in Missouri!","wins the Silver Dollar Smackdown!","sent them to the Baldknobbers!"];
const COMBO_MS={5:"NICE COMBO!",10:"FEATHER STORM!",15:"UNSTOPPABLE!",20:"PILLOW HURRICANE!!",30:"ARE YOU SERIOUS?!",50:"LEGENDARY FLUFF!!!"};
const DMG_WORDS=["bonk","floof","thwap","smack","poof","bap","whap","fluff","splat","thud"];
const TAIL_WORDS=["TAIL WHIP!!","CROC SWIPE!!","TAIL SLAP!!","WHIPLASH!!"];

// ─── IMAGE LOADING ───
const images = {};
let imagesLoaded = 0;
const IMAGE_LIST = [
  ['arena','arena-bg.png'],['gary','gary-sprite.png'],['carl','carl-sprite.png'],
  ['garyCU','gary-closeup.png'],['carlCU','carl-closeup.png']
];
function loadImages(cb) {
  IMAGE_LIST.forEach(([key, src]) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { images[key] = img; imagesLoaded++; if(imagesLoaded >= IMAGE_LIST.length) cb(); };
    img.onerror = () => { imagesLoaded++; if(imagesLoaded >= IMAGE_LIST.length) cb(); };
    img.src = src;
  });
}

// ─── AUDIO ENGINE ───
let actx = null;
function initAudio() {
  if(!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
  if(actx.state === 'suspended') actx.resume();
}
function tone(f,d,tp='square',v=.1,dl=0){if(!actx)return;const t=actx.currentTime+dl;const o=actx.createOscillator(),g=actx.createGain();o.type=tp;o.frequency.setValueAtTime(f,t);g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(g).connect(actx.destination);o.start(t);o.stop(t+d)}
function sfxHit(c){const p=180+Math.min(c,30)*8+rand(-10,10);tone(p,.12,'sawtooth',.16);tone(p*1.5,.06,'square',.07)}
function sfxParry(){tone(800,.07,'sine',.18);tone(1200,.1,'sine',.13,.03);tone(1600,.07,'sine',.09,.07)}
function sfxDash(){tone(280,.1,'triangle',.09);tone(450,.06,'sine',.06)}
function sfxBounce(){tone(380+rand(-20,20),.06,'sine',.09);tone(560,.04,'sine',.05)}
function sfxSpecial(){tone(140,.4,'sawtooth',.12);tone(220,.3,'square',.08,.05);tone(380,.2,'sine',.06,.1)}
function sfxTailWhip(){tone(100,.3,'sawtooth',.2);tone(200,.2,'square',.15,.05);tone(350,.15,'triangle',.1,.1)}
function sfxKO(){tone(90,.5,'sawtooth',.22);tone(70,.6,'square',.18,.12);tone(200,.3,'sine',.13,.3)}
function sfxRound(){tone(523,.1,'square',.09);tone(659,.1,'square',.09,.1);tone(784,.2,'square',.11,.2)}
function sfxPerfect(){tone(523,.08,'sine',.13);tone(659,.08,'sine',.13,.08);tone(784,.08,'sine',.13,.16);tone(1047,.25,'sine',.15,.24)}
function sfxCMilestone(c){const b=400+c*10;tone(b,.12,'square',.13);tone(b*1.25,.12,'square',.1,.06);tone(b*1.5,.18,'square',.12,.12)}
function sfxComeback(){tone(100,.3,'sawtooth',.18);tone(150,.2,'square',.13,.12)}

// ─── NARRATOR ───
const narrAudios = {};
const NARR_KEYS = ['welcome','round1','round2','round3','fight','ko','combo5','combo10','tailwhip','tornado','parry','perfect','comeback','gary_wins','carl_wins','hit1'];
let narrPlaying = null;
let narrSubTimer = 0;
const NARR_SUBS = {
  welcome: "Ladies and gentlemen, welcome to the Branson Strip! Two crocs with eyepatches settle their differences... with pillows!",
  round1: "Round one! Let the feathers fly!",
  round2: "Round two! These crocs are getting serious... well, as serious as a pillow fight gets.",
  round3: "Final round! Winner takes the good pillow home!",
  fight: "FIGHT!",
  ko: "KNOCKOUT! That croc just got tucked in for good!",
  combo5: "Five hit combo! Somebody call the pillow police!",
  combo10: "Ten hit combo! That croc is absolutely unhinged!",
  tailwhip: "Tail whip! Now that's using your assets!",
  tornado: "Pillow tornado! Feathers everywhere, folks!",
  parry: "Parry! Read that attack like a bedtime story!",
  perfect: "Perfect round! Not a single scratch on those beautiful scales!",
  comeback: "Comeback mode! Never underestimate a one-eyed croc with nothing to lose!",
  gary_wins: "Gator Gary wins! The green machine reigns supreme!",
  carl_wins: "Croc Carl takes it! That pink powerhouse is unstoppable!",
  hit1: "Oh! That's gotta hurt! Well... not really. It's a pillow."
};
function preloadNarr() {
  NARR_KEYS.forEach(k => {
    const a = document.createElement('audio');
    a.src = `audio/narr-${k}.mp3`;
    a.preload = 'auto';
    narrAudios[k] = a;
  });
}
function playNarr(key) {
  if(!narrAudios[key]) return;
  if(narrPlaying) { narrPlaying.pause(); narrPlaying.currentTime = 0; }
  const a = narrAudios[key];
  a.currentTime = 0;
  a.volume = 0.8;
  a.play().catch(()=>{});
  narrPlaying = a;
  // Show subtitle
  const bar = document.getElementById('narrator-bar');
  const txt = document.getElementById('narr-text');
  txt.textContent = NARR_SUBS[key] || '';
  bar.classList.add('show');
  narrSubTimer = Math.max(a.duration || 3, 2.5);
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
const ts = {up:0,down:0,left:0,right:0,attack:0,dash:0,special:0,parry:0,tailwhip:0};
document.querySelectorAll('.dpad-btn').forEach(b => { const d = b.dataset.dir; b.addEventListener('touchstart', e => { e.preventDefault(); ts[d] = 1; }); b.addEventListener('touchend', e => { e.preventDefault(); ts[d] = 0; }); });
document.querySelectorAll('.abtn').forEach(b => { const a = b.dataset.action; b.addEventListener('touchstart', e => { e.preventDefault(); ts[a] = 1; }); b.addEventListener('touchend', e => { e.preventDefault(); ts[a] = 0; }); });

// ─── PARTICLES (pooled) ───
const P_MAX = 900; const parts = [];
function em(x,y,vx,vy,life,col,sz,tp='rect'){if(parts.length>=P_MAX)return;parts.push({x,y,vx,vy,life,ml:life,col,sz,tp,rot:rand(0,TAU),rv:rand(-10,10),grav:1})}
function feathers(x,y,n,c='#fff'){for(let i=0;i<n;i++){const a=rand(0,TAU),s=rand(100,320);em(x,y,Math.cos(a)*s,Math.sin(a)*s-rand(60,200),rand(.6,1.4),c,rand(6,14),'feather')}}
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
function fText(x,y,text,col,sz,dur=.9){floats.push({x,y,text,col,sz,life:dur,ml:dur,vy:-130,sc:2})}
function fDmg(x,y,dmg,combo){const cols=['#fff','#ffd740','#ff9100','#ff3d00','#ff1744'];const ci=clamp(Math.floor(combo/5),0,4);const sz=clamp(18+combo*2,18,56);fText(x+rand(-25,25),y-10,`-${Math.round(dmg)} ${pick(DMG_WORDS)}!`,cols[ci],sz)}
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
  ctx.save();ctx.globalAlpha=a;ctx.font=`700 ${Math.round(60*slamS)}px "Bebas Neue",sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillStyle='rgba(0,0,0,.6)';ctx.fillText(slamT,AW/2+3,AH*.36+3);
  ctx.shadowColor=slamC;ctx.shadowBlur=40;ctx.fillStyle=slamC;ctx.fillText(slamT,AW/2,AH*.36);
  ctx.shadowBlur=0;ctx.fillStyle='#fff';ctx.globalAlpha=a*.6;ctx.fillText(slamT,AW/2,AH*.36);
  ctx.restore();ctx.globalAlpha=1;
}

// ─── SCREEN SHAKE ───
let trauma=0,shX=0,shY=0,shT=0;
function addTrauma(t){trauma=clamp(trauma+t,0,1)}
function updateShake(dt){shT+=dt*22;trauma=Math.max(0,trauma-TRAUMA_DECAY*dt);const m=trauma*trauma;shX=noise1D(shT)*m*22;shY=noise1D(shT+100)*m*22}

// ─── HIT STOP / SLOW MO ───
let hsTimer=0,smTimer=0,smScale=1;
function hitStop(d){hsTimer=Math.max(hsTimer,d)}
function slowMo(d,s){smTimer=d;smScale=s}
function timeScale(){return hsTimer>0?0:smTimer>0?smScale:1}

// ─── SCREEN FX ───
let flashC='',flashT=0,vigC='',vigT=0,chromAb=0,bloomInt=0;
function screenFlash(c,d=.08){flashC=c;flashT=d}
function vignette(c,d=.35){vigC=c;vigT=d}

// ─── CINEMATIC CAMERA ───
let camZoom = 1, camTargetZoom = 1, camX = 0, camY = 0, camTargetX = 0, camTargetY = 0;
function cameraZoomTo(x, y, zoom, dur) {
  camTargetX = x - AW/2; camTargetY = y - AH/2; camTargetZoom = zoom;
  setTimeout(() => { camTargetZoom = 1; camTargetX = 0; camTargetY = 0; }, dur * 1000);
}

// ─── CUTSCENE ───
let cutsceneActive = false;
function showCutscene(imgKey, label, dur = 1.2) {
  const el = document.getElementById('cutscene');
  const img = document.getElementById('cut-img');
  const lbl = document.getElementById('cut-label');
  if(images[imgKey]) { img.src = images[imgKey].src; }
  lbl.textContent = label;
  el.classList.add('active');
  cutsceneActive = true;
  setTimeout(() => { el.classList.remove('active'); cutsceneActive = false; }, dur * 1000);
}

// ─── ARENA DRAWING (image-based) ───
function drawArena(t) {
  // Draw the Pixar arena background image
  if(images.arena) {
    ctx.drawImage(images.arena, 0, 0, AW, AH);
  } else {
    // Fallback gradient
    const sg = ctx.createLinearGradient(0,0,0,AH);
    sg.addColorStop(0,'#050510');sg.addColorStop(0.5,'#0a0a24');sg.addColorStop(1,'#141440');
    ctx.fillStyle=sg;ctx.fillRect(0,0,AW,AH);
  }

  // Animated atmospheric effects on top of the image
  // Twinkling stars
  ctx.save();
  for(let i=0;i<30;i++){
    const sx = (i*31.7+10)%AW, sy = (i*17.3+5)%(AH*.35);
    const tw = .15+Math.sin(t*(.8+i*.07)+i)*.25+.25;
    ctx.globalAlpha=tw; ctx.fillStyle='#fff';
    ctx.beginPath();ctx.arc(sx,sy,rand(.5,1.8),0,TAU);ctx.fill();
  }
  ctx.globalAlpha=1;ctx.restore();

  // Animated fog at floor level
  ctx.save();ctx.globalAlpha=.12+Math.sin(t*.5)*.04;
  const fogG=ctx.createLinearGradient(0,FLOOR_Y-40,0,AH);
  fogG.addColorStop(0,'transparent');fogG.addColorStop(.5,'rgba(180,140,80,.15)');fogG.addColorStop(1,'rgba(100,60,30,.2)');
  ctx.fillStyle=fogG;ctx.fillRect(0,FLOOR_Y-40,AW,AH-FLOOR_Y+40);
  ctx.restore();

  // Spotlight beams
  ctx.save();ctx.globalAlpha=.035+Math.sin(t*.3)*.01;
  ctx.fillStyle='#ffd740';
  for(let r=0;r<3;r++){
    const ra=-.15+r*.15+Math.sin(t*.2+r)*.03;
    ctx.beginPath();ctx.moveTo(AW*.5+r*80-80,0);
    ctx.lineTo(AW*.5+r*80-80+Math.cos(ra)*800,Math.sin(ra)*800);
    ctx.lineTo(AW*.5+r*80-80+Math.cos(ra+.03)*800,Math.sin(ra+.03)*800);
    ctx.closePath();ctx.fill();
  }
  ctx.restore();
}

// ─── DRAW CROC (Image sprite-based) ───
function drawCroc(c) {
  const img = c === p1 ? images.gary : images.carl;
  if(!img) return;

  ctx.save();
  const cx = c.x + c.w/2, cy = c.y + c.h/2;
  ctx.translate(cx, cy);

  // Death spin
  if(c.dead) ctx.rotate(c.deathRot);

  // Face direction (flip sprite)
  ctx.scale(c.face, 1);

  // Squash & stretch
  ctx.scale(c.squash, c.stretch);

  // Spin during tornado
  if(c.specAct) ctx.rotate((Date.now()/60) % TAU);

  // Hit flash
  if(c.hitFlash > 0 && Math.floor(c.hitFlash*30) % 2 === 0) ctx.globalAlpha = .35;
  if(c.stunned) ctx.globalAlpha = .5 + Math.sin(Date.now()*.02)*.2;

  // Comeback aura
  if(c.comebackActive && !c.dead) {
    ctx.save(); ctx.globalAlpha = .25 + Math.sin(c.comebackFlash)*.1;
    const aG = ctx.createRadialGradient(0, 0, 30, 0, 0, 120);
    aG.addColorStop(0,'rgba(255,50,0,.4)'); aG.addColorStop(1,'transparent');
    ctx.fillStyle = aG; ctx.fillRect(-120,-120,240,240);
    ctx.restore();
  }

  // Drop shadow
  ctx.save(); ctx.globalAlpha = .3;
  ctx.fillStyle = 'rgba(0,0,0,.6)';
  ctx.beginPath(); ctx.ellipse(0, c.h/2 + 5, c.w*.35, 10, 0, 0, TAU); ctx.fill();
  ctx.restore();

  // Draw the Pixar sprite image
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

  // Tail whip effect
  if(c.tailAct) {
    ctx.save(); ctx.globalAlpha=.7;
    const tAngle = (Date.now()/30) % TAU;
    ctx.strokeStyle = c===p1 ? '#4ade80' : '#f472b6';
    ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(0, c.h*.1, TAIL_RANGE*.6, tAngle, tAngle+2.5);
    ctx.stroke();
    // Impact stars
    sparks(cx+c.face*60, cy, 3, ctx.strokeStyle);
    ctx.shadowBlur=0; ctx.restore();
  }

  // Dash trail
  if(c.dashing) {
    ctx.globalAlpha=.15;
    for(let trail=1;trail<=3;trail++){
      ctx.drawImage(img, -drawW/2 - trail*25*c.face, -drawH/2, drawW/trail, drawH/trail);
    }
    ctx.globalAlpha=1;
  }

  // Stun stars
  if(c.stunned) {
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
  c.stunned=false;c.stunT=0;c.hitFlash=0;c.squash=1;c.stretch=1;
  c.combo=0;c.comboT=0;c.maxCombo=0;c.totalDmg=0;c.hits=0;c.parryCount=0;
  c.comebackActive=false;c.comebackFlash=0;
  c.dead=false;c.deathVx=0;c.deathVy=0;c.deathBounces=0;c.deathRot=0;c.deathRotV=0;
  c.bufAtk=false;c.bufParry=false;
}

// ─── DAMAGE ───
function dealDmg(atk,vic,dmg,dir,heavy,isTail){
  if(vic.parrying&&vic.parryT>0){
    vic.parryOK=true;atk.stunned=true;atk.stunT=PARRY_STUN;
    hitStop(HS_PARRY);addTrauma(.35);screenFlash('rgba(139,92,246,.3)');
    sfxParry();sparks(vic.x+vic.w/2,vic.y+vic.h/2,20,'#a78bfa');
    shockwave(vic.x+vic.w/2,vic.y+vic.h/2,'rgba(139,92,246,.5)');
    lightningBolt(vic.x+vic.w/2-40,vic.y-20,vic.x+vic.w/2+40,vic.y+vic.h);
    fText(vic.x+vic.w/2,vic.y-45,pick(PARRY_LINES),'#a78bfa',30);
    vic.parryCount++;chromAb=.4;playNarr('parry');return;
  }
  const m=atk.comebackActive?COMEBACK_M:1;const fd=dmg*m;
  vic.hp=Math.max(0,vic.hp-fd);vic.hitFlash=.15;
  vic.vx=dir*KB*(heavy?1.5:1);vic.vy=KB_UP*(heavy?1.4:1);vic.grounded=false;
  vic.combo=0;vic.comboT=0;
  atk.combo++;atk.comboT=1.5;atk.hits++;atk.totalDmg+=fd;
  if(atk.combo>atk.maxCombo)atk.maxCombo=atk.combo;

  if(isTail){
    hitStop(HS_TAIL);addTrauma(.6);
    feathers(vic.x+vic.w/2,vic.y+vic.h/2,20,'#fff');
    embers(vic.x+vic.w/2,vic.y+vic.h/2,12);
    shockwave(vic.x+vic.w/2,vic.y+vic.h/2,'rgba(255,200,0,.6)');
    screenFlash('rgba(255,200,0,.2)',.12);chromAb=.4;bloomInt=.5;
    fText(vic.x+vic.w/2,vic.y-50,pick(TAIL_WORDS),'#06b6d4',36,1.2);
    // Cinematic zoom on tail whip
    cameraZoomTo(vic.x+vic.w/2, vic.y+vic.h/2, 1.4, 0.5);
    playNarr('tailwhip');
  } else if(heavy){
    hitStop(HS_HEAVY);addTrauma(.55);
    feathers(vic.x+vic.w/2,vic.y+vic.h/2,16,'#fff');
    embers(vic.x+vic.w/2,vic.y+vic.h/2,8);
    shockwave(vic.x+vic.w/2,vic.y+vic.h/2);
    screenFlash('rgba(255,255,255,.2)',.1);chromAb=.3;
  } else {
    hitStop(HS_LIGHT);addTrauma(.2+atk.combo*.025);
    feathers(vic.x+vic.w/2,vic.y+vic.h/2,7,'#fff');
  }
  sfxHit(atk.combo);fDmg(vic.x+vic.w/2,vic.y,fd,atk.combo);

  if(COMBO_MS[atk.combo]){
    slam(COMBO_MS[atk.combo],'#ffd740',1);sfxCMilestone(atk.combo);stars(atk.x+atk.w/2,atk.y,12);bloomInt=.6;
    if(atk.combo===5) playNarr('combo5');
    if(atk.combo===10) playNarr('combo10');
  }

  if(vic.hp<=0){
    vic.alive=false;vic.dead=true;vic.deathVx=dir*550;vic.deathVy=-280;vic.deathRotV=dir*14;
    hitStop(HS_KO);slowMo(SLO_DUR,SLO_SCALE);addTrauma(1);
    screenFlash('rgba(255,255,255,.4)',.18);chromAb=.6;bloomInt=1;
    feathers(vic.x+vic.w/2,vic.y+vic.h/2,40,'#ffd740');
    embers(vic.x+vic.w/2,vic.y+vic.h/2,20,'#ff6b35');
    sparks(vic.x+vic.w/2,vic.y+vic.h/2,25,'#fff');
    stars(vic.x+vic.w/2,vic.y+vic.h/2,18);
    shockwave(vic.x+vic.w/2,vic.y+vic.h/2,'rgba(255,200,0,.6)');
    sfxKO();slam("KO!!",'#ff3d00',2);vignette('rgba(255,60,0,.3)',.6);
    // Cinematic KO zoom
    cameraZoomTo(vic.x+vic.w/2, vic.y+vic.h/2, 1.6, 0.8);
    // Show attacker cutscene
    const cuKey = atk===p1 ? 'garyCU' : 'carlCU';
    setTimeout(() => showCutscene(cuKey, pick(KO_LINES), 1.5), 400);
    playNarr('ko');
  }
}

// ─── UPDATE CROC ───
function updateCroc(c,inp,o,dt){
  c.atkCD=Math.max(0,c.atkCD-dt);c.dashCD=Math.max(0,c.dashCD-dt);c.specCD=Math.max(0,c.specCD-dt);
  c.tailCD=Math.max(0,c.tailCD-dt);c.parryCD=Math.max(0,c.parryCD-dt);c.hitFlash=Math.max(0,c.hitFlash-dt);
  c.squash=lerp(c.squash,1,dt*10);c.stretch=lerp(c.stretch,1,dt*10);
  c.comboT=Math.max(0,c.comboT-dt);if(c.comboT<=0)c.combo=0;

  const wasCB=c.comebackActive;
  c.comebackActive=c.hp/MAX_HP<=COMEBACK_TH&&c.alive;
  if(c.comebackActive&&!wasCB){sfxComeback();fText(c.x+c.w/2,c.y-55,pick(COMEBACK_LINES),'#ff3d00',28);vignette('rgba(255,0,0,.25)',.5);playNarr('comeback')}
  if(c.comebackActive)c.comebackFlash+=dt*6;

  if(c.dead){
    c.deathRot+=c.deathRotV*dt;c.x+=c.deathVx*dt;c.y+=c.deathVy*dt;c.deathVy+=GRAVITY*1.3*dt;
    if(c.x<10){c.x=10;c.deathVx*=-.6;addTrauma(.3);sfxBounce()}
    if(c.x+c.w>AW-10){c.x=AW-c.w-10;c.deathVx*=-.6;addTrauma(.3);sfxBounce()}
    if(c.y+c.h>FLOOR_Y){c.y=FLOOR_Y-c.h;c.deathVy*=-.35;c.deathVx*=.65;if(Math.abs(c.deathVy)>25){addTrauma(.15);sfxBounce()}}
    return;
  }
  if(!c.alive)return;

  if(c.stunned){c.stunT-=dt;if(c.stunT<=0)c.stunned=false;c.vx*=.85;c.vy+=GRAVITY*dt;c.x+=c.vx*dt;c.y+=c.vy*dt;if(c.y+c.h>FLOOR_Y){c.y=FLOOR_Y-c.h;c.vy=0;c.grounded=true}c.x=clamp(c.x,10,AW-c.w-10);return}

  if(c.parrying){c.parryT-=dt;if(c.parryT<=0){c.parrying=false;if(!c.parryOK)c.parryCD=PARRY_CD}c.parryOK=false}

  let mx=0;if(inp.left)mx-=1;if(inp.right)mx+=1;
  if(inp.up&&c.grounded){c.vy=JUMP_VEL;c.grounded=false;c.squash=.55;c.stretch=1.45;sfxBounce();shockwave(c.x+c.w/2,c.y+c.h)}

  if(c.dashing){c.dashT-=dt;c.vx=c.dashDir*DASH_SPD;if(c.dashT<=0)c.dashing=false}
  else if(!c.specAct&&!c.tailAct)c.vx=mx*MOVE_SPD;

  // Attack
  if(inp.attack&&c.atkCD<=0&&!c.atk&&!c.specAct&&!c.parrying&&!c.tailAct){
    c.atk=true;c.atkT=.18;c.atkCD=ATK_CD;sfxHit(c.combo);
    const acx=c.x+c.w/2+c.face*45,acy=c.y+c.h/2;
    if(dist(acx,acy,o.x+o.w/2,o.y+o.h/2)<ATK_RANGE&&o.alive)dealDmg(c,o,ATK_DMG,c.face,false,false);
  }
  if(c.atk){c.atkT-=dt;if(c.atkT<=0)c.atk=false}

  // Tail whip (new move)
  if(inp.tailwhip&&c.tailCD<=0&&!c.tailAct&&!c.specAct&&!c.atk&&!c.parrying){
    c.tailAct=true;c.tailT=.35;c.tailCD=TAIL_CD;sfxTailWhip();
    c.squash=1.4;c.stretch=.65;
    setTimeout(()=>{
      if(!c.alive||!o.alive)return;
      const tcx=c.x+c.w/2,tcy=c.y+c.h/2;
      if(dist(tcx,tcy,o.x+o.w/2,o.y+o.h/2)<TAIL_RANGE)dealDmg(c,o,TAIL_DMG,c.face,true,true);
    },120);
  }
  if(c.tailAct){c.tailT-=dt;if(c.tailT<=0)c.tailAct=false}

  // Parry
  if(inp.parry&&c.parryCD<=0&&!c.parrying&&!c.atk&&!c.specAct&&!c.tailAct){c.parrying=true;c.parryT=PARRY_WIN;c.parryOK=false;c.parryCD=0}

  // Dash
  if(inp.dash&&c.dashCD<=0&&!c.dashing&&!c.specAct&&!c.tailAct){
    c.dashing=true;c.dashT=DASH_DUR;c.dashCD=DASH_CD;c.dashDir=c.face;c.squash=1.5;c.stretch=.6;sfxDash();
    setTimeout(()=>{if(!c.alive||!o.alive)return;if(dist(c.x+c.w/2,c.y+c.h/2,o.x+o.w/2,o.y+o.h/2)<85)dealDmg(c,o,DASH_DMG,c.dashDir,true,false)},80);
  }

  // Special (tornado)
  if(inp.special&&c.specCD<=0&&!c.specAct&&!c.tailAct){
    c.specAct=true;c.specT=SPEC_DUR;c.specCD=SPEC_CD;sfxSpecial();slam("TORNADO!!",c===p1?'#4ade80':'#f472b6',.8);bloomInt=.4;
    cameraZoomTo(c.x+c.w/2, c.y+c.h/2, 1.3, 0.6);
    playNarr('tornado');
  }
  if(c.specAct){
    c.specT-=dt;c.vx=c.face*150;
    if(dist(c.x+c.w/2,c.y+c.h/2,o.x+o.w/2,o.y+o.h/2)<95&&o.alive&&Math.random()<dt*10)dealDmg(c,o,SPEC_DMG,c.face,false,false);
    feathers(c.x+c.w/2+rand(-20,20),c.y+c.h/2+rand(-12,12),1,c===p1?'#4ade80':'#f472b6');
    if(c.specT<=0)c.specAct=false;
  }

  c.vy+=GRAVITY*dt;c.x+=c.vx*dt;c.y+=c.vy*dt;
  if(c.y+c.h>FLOOR_Y){c.y=FLOOR_Y-c.h;if(c.vy>130){c.squash=1.3;c.stretch=.7;sfxBounce();shockwave(c.x+c.w/2,FLOOR_Y)}c.vy=0;c.grounded=true}
  c.x=clamp(c.x,10,AW-c.w-10);
  if(!c.dashing&&!c.specAct&&!c.tailAct)c.face=(o.x+o.w/2>c.x+c.w/2)?1:-1;
}

// ─── AI ───
function getAI(ai,tgt){
  const inp={left:0,right:0,up:0,attack:0,dash:0,special:0,parry:0,tailwhip:0};
  const dx=tgt.x-ai.x,adx=Math.abs(dx);
  if(adx>100){if(dx>0)inp.right=1;else inp.left=1}
  else if(adx<55){if(dx>0)inp.left=1;else inp.right=1}
  if(ai.grounded&&((tgt.atk&&adx<120&&Math.random()<.35)||Math.random()<.012))inp.up=1;
  if(adx<90&&ai.atkCD<=0&&Math.random()<.42)inp.attack=1;
  if(tgt.atk&&tgt.atkT>.08&&adx<95&&ai.parryCD<=0&&Math.random()<.2)inp.parry=1;
  if(adx<150&&adx>60&&ai.dashCD<=0&&Math.random()<.055)inp.dash=1;
  if(adx<120&&ai.specCD<=0&&Math.random()<.022)inp.special=1;
  if(adx<130&&ai.tailCD<=0&&Math.random()<.04)inp.tailwhip=1;
  if(ai.hp<25&&adx<70){inp.left=dx>0?1:0;inp.right=dx<0?1:0}
  return inp;
}

// ─── GAME STATE ───
let state='title',isAI=false,p1,p2,roundTimer,roundNum,cdTimer,lastTS=0,gameTime=0,matchStats={};
function initP(){
  p1=mkCroc(160,1,'Gator Gary');
  p2=mkCroc(AW-160-CW,-1,'Croc Carl');
}
function resetRound(){resetC(p1,160);resetC(p2,AW-160-CW);roundTimer=ROUND_TIME;parts.length=0;floats.length=0;trauma=0;hsTimer=0;smTimer=0;slamTm=0;flashT=0;vigT=0;chromAb=0;bloomInt=0;camZoom=1;camTargetZoom=1;camX=0;camY=0;camTargetX=0;camTargetY=0}
function startGame(ai){
  isAI=ai;initP();roundNum=1;matchStats={p1d:0,p2d:0,p1c:0,p2c:0,p1p:0,p2p:0,rds:0};
  playNarr('welcome');
  startCD();
}
function startCD(){
  resetRound();state='countdown';cdTimer=2.5;
  const rk = roundNum===1?'round1':roundNum===2?'round2':'round3';
  slam(`Round ${roundNum}`,'#ffd740',1.5);sfxRound();
  setTimeout(()=>playNarr(rk), 300);
  $('hud').classList.remove('hidden');$('title-screen').classList.add('hidden');$('result-screen').classList.add('hidden');
}
function startPlay(){state='playing';slam(pick(ROUND_INTROS),'#fff',1);playNarr('fight')}
function endRound(w){
  state='roundEnd';matchStats.rds++;
  matchStats.p1d+=p1.totalDmg;matchStats.p2d+=p2.totalDmg;
  matchStats.p1c=Math.max(matchStats.p1c,p1.maxCombo);matchStats.p2c=Math.max(matchStats.p2c,p2.maxCombo);
  matchStats.p1p+=p1.parryCount;matchStats.p2p+=p2.parryCount;
  if(w){w.wins++;if(w.hp>=MAX_HP){slam(pick(PERFECT_LINES),'#ffd740',2);sfxPerfect();goldenRain(AW/2,AH*.25);bloomInt=1;playNarr('perfect')}else slam(pick(KO_LINES),'#ff3d00',1.8)}
  else slam("TIME'S UP!!",'#fbbf24',1.5);
  setTimeout(()=>{if(p1.wins>=ROUNDS_TO_WIN||p2.wins>=ROUNDS_TO_WIN)endMatch();else{roundNum++;startCD()}},2800);
}
function endMatch(){
  state='result';const w=p1.wins>=ROUNDS_TO_WIN?p1:p2;const wc=w===p1?'var(--p1)':'var(--p2)';
  $('res-winner').textContent=`🐊 ${w.name} ${pick(WIN_LINES)}`;$('res-winner').style.color=wc;
  $('res-score').textContent=`${p1.wins} — ${p2.wins}`;
  $('res-grid').innerHTML=`<div><div class="v">${matchStats.p1d.toFixed(0)}</div><div class="l">Gary Dmg</div></div><div><div class="v">${matchStats.p2d.toFixed(0)}</div><div class="l">Carl Dmg</div></div><div><div class="v">${matchStats.p1c}</div><div class="l">Gary Best Combo</div></div><div><div class="v">${matchStats.p2c}</div><div class="l">Carl Best Combo</div></div><div><div class="v">${matchStats.p1p}</div><div class="l">Gary Parries</div></div><div><div class="v">${matchStats.p2p}</div><div class="l">Carl Parries</div></div>`;
  $('result-screen').classList.remove('hidden');
  playNarr(w===p1?'gary_wins':'carl_wins');
}

// ─── HUD ───
function updateHUD(){
  const p1pct=(p1.hp/MAX_HP)*100,p2pct=(p2.hp/MAX_HP)*100;
  $('p1hp').style.width=p1pct+'%';$('p2hp').style.width=p2pct+'%';
  $('p1hpt').textContent=Math.ceil(p1.hp);$('p2hpt').textContent=Math.ceil(p2.hp);
  $('p1wrap').className='hbar-outer'+(p1pct<25?' low':'');
  $('p2wrap').className='hbar-outer'+(p2pct<25?' low':'');
  $('p1s').textContent=`Wins ${p1.wins}`;$('p2s').textContent=`Wins ${p2.wins}`;
  $('hround').textContent=`ROUND ${roundNum}`;
  const te=$('htimer');te.textContent=Math.ceil(Math.max(0,roundTimer));
  te.className=roundTimer<10?'htimer warn':'htimer';
  $('p1combo').textContent=p1.combo>=3?`${p1.combo} HIT COMBO · x${Math.min(Math.floor(p1.combo/3)+1,10)}`:''  ;
  $('p2combo').textContent=p2.combo>=3?`${p2.combo} HIT COMBO · x${Math.min(Math.floor(p2.combo/3)+1,10)}`:''  ;
}

// ─── INPUT MAPS ───
function getP1(){return{left:keys.KeyA||ts.left,right:keys.KeyD||ts.right,up:jp.KeyW||ts.up,attack:jp.KeyF||ts.attack,dash:jp.KeyG||ts.dash,special:jp.KeyH||ts.special,parry:jp.KeyR||ts.parry,tailwhip:jp.KeyT||ts.tailwhip}}
function getP2(){if(isAI)return getAI(p2,p1);return{left:keys.ArrowLeft,right:keys.ArrowRight,up:jp.ArrowUp,attack:jp.KeyL,dash:jp.KeyK,special:jp.KeyJ,parry:jp.KeyP,tailwhip:jp.KeyI}}

// ─── POST-PROCESSING ───
function postFX(dt){
  bloomInt=Math.max(0,bloomInt-dt*1.5);
  if(bloomInt>0){ctx.save();ctx.globalAlpha=bloomInt*.12;ctx.fillStyle='#ffd740';ctx.filter=`blur(30px)`;ctx.fillRect(0,0,AW,AH);ctx.filter='none';ctx.restore()}

  if(flashT>0){ctx.fillStyle=flashC;ctx.globalAlpha=clamp(flashT/.08,0,1)*.5;ctx.fillRect(0,0,AW,AH);ctx.globalAlpha=1}

  if(vigT>0){const va=clamp(vigT/.3,0,1)*.45;const vg=ctx.createRadialGradient(AW/2,AH/2,AW*.25,AW/2,AH/2,AW*.65);vg.addColorStop(0,'transparent');vg.addColorStop(1,vigC);ctx.globalAlpha=va;ctx.fillStyle=vg;ctx.fillRect(0,0,AW,AH);ctx.globalAlpha=1}

  // Permanent subtle vignette
  const sv=ctx.createRadialGradient(AW/2,AH/2,AW*.3,AW/2,AH/2,AW*.7);
  sv.addColorStop(0,'transparent');sv.addColorStop(1,'rgba(0,0,0,.3)');
  ctx.fillStyle=sv;ctx.fillRect(0,0,AW,AH);

  chromAb=Math.max(0,chromAb-dt*2);
  if(chromAb>.01){ctx.save();ctx.globalAlpha=chromAb*.3;ctx.globalCompositeOperation='screen';ctx.fillStyle='rgba(255,0,0,.12)';ctx.fillRect(chromAb*4,0,AW,AH);ctx.fillStyle='rgba(0,0,255,.12)';ctx.fillRect(-chromAb*4,0,AW,AH);ctx.globalCompositeOperation='source-over';ctx.restore()}

  // Slow-mo cinematic bars
  if(smTimer>0){
    const barH=28*clamp(smTimer/SLO_DUR,0,1);
    ctx.fillStyle='rgba(0,0,0,.65)';ctx.fillRect(0,0,AW,barH);ctx.fillRect(0,AH-barH,AW,barH);
    ctx.save();ctx.globalAlpha=.3;ctx.font='700 10px "Bebas Neue",sans-serif';ctx.fillStyle='#fff';ctx.textAlign='right';
    ctx.fillText('SLOW MOTION',AW-12,barH-4);ctx.restore();
  }

  // Film grain
  ctx.save();ctx.globalAlpha=.02;
  for(let i=0;i<30;i++){ctx.fillStyle=Math.random()>.5?'#fff':'#000';ctx.fillRect(rand(0,AW),rand(0,AH),rand(1,3),rand(1,3))}
  ctx.restore();
}

// ─── MAIN LOOP ───
function loop(now){
  requestAnimationFrame(loop);
  const rawDt=Math.min((now-lastTS)/1000,.1);lastTS=now;gameTime+=rawDt;

  hsTimer=Math.max(0,hsTimer-rawDt);smTimer=Math.max(0,smTimer-rawDt);
  flashT=Math.max(0,flashT-rawDt);vigT=Math.max(0,vigT-rawDt);
  const ts2=timeScale(),dt=rawDt*ts2;

  // Update camera
  camZoom=lerp(camZoom,camTargetZoom,rawDt*4);
  camX=lerp(camX,camTargetX,rawDt*4);
  camY=lerp(camY,camTargetY,rawDt*4);

  // Narrator subtitle timer
  if(narrSubTimer>0){narrSubTimer-=rawDt;if(narrSubTimer<=0)document.getElementById('narrator-bar').classList.remove('show')}

  updateShake(rawDt);updateParts(dt);updateFloats(dt);

  if(state==='countdown'){cdTimer-=rawDt;if(cdTimer<=0)startPlay()}
  if(state==='playing'){
    updateCroc(p1,getP1(),p2,dt);updateCroc(p2,getP2(),p1,dt);
    roundTimer-=dt;
    if(!p1.alive)endRound(p2);else if(!p2.alive)endRound(p1);
    else if(roundTimer<=0){if(p1.hp>p2.hp)endRound(p1);else if(p2.hp>p1.hp)endRound(p2);else endRound(null)}
    updateHUD();
  }
  if(state==='roundEnd'){updateCroc(p1,{},p2,dt);updateCroc(p2,{},p1,dt);updateHUD()}

  // ── RENDER ──
  ctx.save();ctx.clearRect(0,0,W,H);
  ctx.fillStyle='#050510';ctx.fillRect(0,0,W,H);

  // Apply camera transform
  const csx = ox + shX*sc - camX*sc*(camZoom-1);
  const csy = oy + shY*sc - camY*sc*(camZoom-1);
  ctx.translate(csx, csy);
  ctx.scale(sc*camZoom, sc*camZoom);

  // Always draw arena
  drawArena(gameTime);

  if(state!=='title'){
    if(p1&&p2){if(p1.dead)drawCroc(p1);if(p2.dead)drawCroc(p2);if(!p1.dead)drawCroc(p1);if(!p2.dead)drawCroc(p2)}
    drawParts();drawFloats();drawSlam(rawDt);postFX(rawDt);
  } else {
    const tv=ctx.createRadialGradient(AW/2,AH/2,AW*.2,AW/2,AH/2,AW*.7);
    tv.addColorStop(0,'transparent');tv.addColorStop(1,'rgba(0,0,0,.55)');
    ctx.fillStyle=tv;ctx.fillRect(0,0,AW,AH);
  }

  ctx.restore();
  for(const k in jp)delete jp[k];
  ts.attack=0;ts.dash=0;ts.special=0;ts.parry=0;ts.tailwhip=0;
}

// ─── DOM ───
const $=id=>document.getElementById(id);
$('btn-pvp').addEventListener('click',()=>{initAudio();startGame(false)});
$('btn-ai').addEventListener('click',()=>{initAudio();startGame(true)});
$('btn-rematch').addEventListener('click',()=>{roundNum=1;startGame(isAI)});
$('btn-menu2').addEventListener('click',()=>{state='title';$('title-screen').classList.remove('hidden');$('result-screen').classList.add('hidden');$('hud').classList.add('hidden')});

// ─── BOOT ───
loadImages(() => {
  preloadNarr();
  requestAnimationFrame(loop);
});

})();
