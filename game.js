// ============================================================
//  CROC CLASH — HOLLYWOOD EDITION
//  Hyper-detailed 3D-style 2D canvas fighting game
//  Cinematic FX, massive crocs, premium everything
// ============================================================
(() => {
'use strict';

// ─── ARENA ───
const AW = 900, AH = 560;
const FLOOR_Y = AH - 70;
const MAX_HP = 100, ROUND_TIME = 30, ROUNDS_TO_WIN = 3;

// ─── FIGHTERS ───
const CW = 110, CH = 70; // HUGE crocs
const MOVE_SPD = 200, GRAVITY = 650, JUMP_VEL = -360;
const ATK_RANGE = 95, ATK_DMG = 10, ATK_CD = 0.3;
const DASH_SPD = 540, DASH_DUR = 0.2, DASH_CD = 0.85, DASH_DMG = 9;
const SPEC_DMG = 6, SPEC_CD = 3.5, SPEC_DUR = 0.7;
const PARRY_WIN = 0.1, PARRY_CD = 0.75, PARRY_STUN = 0.55;
const KB = 320, KB_UP = -160;
const COMEBACK_TH = 0.25, COMEBACK_M = 1.5;

// ─── JUICE ───
const HS_LIGHT=0.05, HS_HEAVY=0.13, HS_KO=0.25, HS_PARRY=0.1;
const SLO_DUR=0.7, SLO_SCALE=0.2, TRAUMA_DECAY=1.6;

// ─── UTILS ───
const lerp=(a,b,t)=>a+(b-a)*t, clamp=(v,l,h)=>Math.max(l,Math.min(h,v));
const dist=(x1,y1,x2,y2)=>Math.hypot(x2-x1,y2-y1);
const rand=(a,b)=>Math.random()*(b-a)+a, randInt=(a,b)=>Math.floor(rand(a,b+1));
const pick=a=>a[randInt(0,a.length-1)];
const TAU=Math.PI*2;

// Perlin
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

// ─── AUDIO ───
let actx=null;
function initAudio(){if(!actx)actx=new(window.AudioContext||window.webkitAudioContext)();if(actx.state==='suspended')actx.resume()}
function tone(f,d,tp='square',v=.1,dl=0){if(!actx)return;const t=actx.currentTime+dl;const o=actx.createOscillator(),g=actx.createGain();o.type=tp;o.frequency.setValueAtTime(f,t);g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(g).connect(actx.destination);o.start(t);o.stop(t+d)}
function sfxHit(c){const p=180+Math.min(c,30)*8+rand(-10,10);tone(p,.12,'sawtooth',.16);tone(p*1.5,.06,'square',.07)}
function sfxParry(){tone(800,.07,'sine',.18);tone(1200,.1,'sine',.13,.03);tone(1600,.07,'sine',.09,.07)}
function sfxDash(){tone(280,.1,'triangle',.09);tone(450,.06,'sine',.06)}
function sfxBounce(){tone(380+rand(-20,20),.06,'sine',.09);tone(560,.04,'sine',.05)}
function sfxSpecial(){tone(140,.4,'sawtooth',.12);tone(220,.3,'square',.08,.05);tone(380,.2,'sine',.06,.1)}
function sfxKO(){tone(90,.5,'sawtooth',.22);tone(70,.6,'square',.18,.12);tone(200,.3,'sine',.13,.3);tone(150,.4,'triangle',.08,.5)}
function sfxRound(){tone(523,.1,'square',.09);tone(659,.1,'square',.09,.1);tone(784,.2,'square',.11,.2)}
function sfxPerfect(){tone(523,.08,'sine',.13);tone(659,.08,'sine',.13,.08);tone(784,.08,'sine',.13,.16);tone(1047,.25,'sine',.15,.24)}
function sfxCMilestone(c){const b=400+c*10;tone(b,.12,'square',.13);tone(b*1.25,.12,'square',.1,.06);tone(b*1.5,.18,'square',.12,.12)}
function sfxComeback(){tone(100,.3,'sawtooth',.18);tone(150,.2,'square',.13,.12)}

// ─── CANVAS ───
const canvas=document.getElementById('gc'), ctx=canvas.getContext('2d');
let W,H,sc,ox,oy;
function resize(){W=innerWidth;H=innerHeight;canvas.width=W;canvas.height=H;sc=Math.min(W/AW,H/AH);ox=(W-AW*sc)/2;oy=(H-AH*sc)/2}
addEventListener('resize',resize);resize();

// ─── INPUT ───
const keys={},jp={};
document.addEventListener('keydown',e=>{if(!keys[e.code])jp[e.code]=true;keys[e.code]=true;e.preventDefault()});
document.addEventListener('keyup',e=>{keys[e.code]=false});
const ts={up:0,down:0,left:0,right:0,attack:0,dash:0,special:0,parry:0};
document.querySelectorAll('.tbtn').forEach(b=>{const d=b.dataset.dir;b.addEventListener('touchstart',e=>{e.preventDefault();ts[d]=1});b.addEventListener('touchend',e=>{e.preventDefault();ts[d]=0})});
document.querySelectorAll('.abtn').forEach(b=>{const a=b.dataset.action;b.addEventListener('touchstart',e=>{e.preventDefault();ts[a]=1});b.addEventListener('touchend',e=>{e.preventDefault();ts[a]=0})});

// ─── PARTICLES (pooled) ───
const P_MAX=800; const parts=[];
function em(x,y,vx,vy,life,col,sz,tp='rect'){if(parts.length>=P_MAX)return;parts.push({x,y,vx,vy,life,ml:life,col,sz,tp,rot:rand(0,TAU),rv:rand(-10,10),grav:1})}
function feathers(x,y,n,c='#fff'){for(let i=0;i<n;i++){const a=rand(0,TAU),s=rand(100,300);em(x,y,Math.cos(a)*s,Math.sin(a)*s-rand(60,180),rand(.6,1.4),c,rand(6,14),'feather')}}
function embers(x,y,n,c='#ff6b35'){for(let i=0;i<n;i++){const a=rand(0,TAU),s=rand(60,200);const p={x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-rand(30,80),life:rand(.3,.8),ml:.8,col:c,sz:rand(2,4),tp:'ember',rot:0,rv:0,grav:.3};parts.push(p)}}
function sparks(x,y,n,c='#fff'){for(let i=0;i<n;i++){const a=rand(0,TAU),s=rand(150,400);em(x,y,Math.cos(a)*s,Math.sin(a)*s,rand(.15,.4),c,rand(2,4),'spark')}}
function stars(x,y,n){for(let i=0;i<n;i++){const a=rand(0,TAU),s=rand(50,180);em(x,y,Math.cos(a)*s,Math.sin(a)*s,rand(.4,.9),'#ffd740',rand(5,10),'star')}}
function shockwave(x,y,c='rgba(255,255,255,.5)'){parts.push({x,y,vx:0,vy:0,life:.4,ml:.4,col:c,sz:0,tp:'ring',rot:0,rv:0,radius:10,grav:0})}
function goldenRain(x,y){for(let i=0;i<50;i++){const a=rand(-3.14,-.1),s=rand(120,450);em(x+rand(-60,60),y,Math.cos(a)*s,Math.sin(a)*s,rand(.7,1.8),'#ffd740',rand(5,12),'star')}}
function lightningBolt(x1,y1,x2,y2){parts.push({x:x1,y:y1,vx:x2,vy:y2,life:.15,ml:.15,col:'#a78bfa',sz:3,tp:'lightning',rot:0,rv:0,grav:0})}

function updateParts(dt){
  for(let i=parts.length-1;i>=0;i--){
    const p=parts[i];
    p.x+=p.vx*dt;p.y+=p.vy*dt;
    if(p.tp!=='ring'&&p.tp!=='lightning')p.vy+=380*p.grav*dt;
    p.rot+=p.rv*dt;p.life-=dt;
    if(p.tp==='ring')p.radius+=280*dt;
    if(p.tp==='ember'){p.sz*=.97;p.col=p.life>.4?'#ff6b35':'#ff3d00'}
    if(p.life<=0)parts.splice(i,1);
  }
}
function drawParts(){
  for(const p of parts){
    const a=clamp(p.life/p.ml,0,1);
    ctx.save();ctx.globalAlpha=a;
    if(p.tp==='feather'){
      ctx.translate(p.x,p.y);ctx.rotate(p.rot);
      ctx.fillStyle=p.col;
      ctx.shadowColor=p.col;ctx.shadowBlur=4;
      ctx.beginPath();ctx.ellipse(0,0,p.sz,p.sz*.28,0,0,TAU);ctx.fill();
    }else if(p.tp==='star'){
      ctx.translate(p.x,p.y);ctx.rotate(p.rot);
      ctx.fillStyle=p.col;ctx.shadowColor=p.col;ctx.shadowBlur=8;
      drawStar5(ctx,0,0,p.sz,p.sz*.4);
    }else if(p.tp==='ring'){
      ctx.strokeStyle=p.col;ctx.lineWidth=3*a;
      ctx.shadowColor=p.col;ctx.shadowBlur=12;
      ctx.beginPath();ctx.arc(p.x,p.y,p.radius,0,TAU);ctx.stroke();
    }else if(p.tp==='ember'){
      ctx.fillStyle=p.col;ctx.shadowColor=p.col;ctx.shadowBlur=10;
      ctx.beginPath();ctx.arc(p.x,p.y,p.sz,0,TAU);ctx.fill();
    }else if(p.tp==='spark'){
      ctx.strokeStyle=p.col;ctx.lineWidth=1.5;ctx.shadowColor=p.col;ctx.shadowBlur=6;
      ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x-p.vx*.02,p.y-p.vy*.02);ctx.stroke();
    }else if(p.tp==='lightning'){
      ctx.strokeStyle=p.col;ctx.lineWidth=p.sz*a;ctx.shadowColor='#c4b5fd';ctx.shadowBlur=15;
      ctx.beginPath();let lx=p.x,ly=p.y;const dx=p.vx-p.x,dy=p.vy-p.y;
      ctx.moveTo(lx,ly);
      for(let s=0;s<8;s++){const t=(s+1)/8;lx=p.x+dx*t+rand(-12,12);ly=p.y+dy*t+rand(-12,12);ctx.lineTo(lx,ly)}
      ctx.stroke();
    }else{
      const s=p.sz*a;ctx.fillStyle=p.col;
      ctx.translate(p.x,p.y);ctx.rotate(p.rot);ctx.fillRect(-s/2,-s/2,s,s);
    }
    ctx.shadowBlur=0;ctx.restore();
  }
  ctx.globalAlpha=1;
}
function drawStar5(c,cx,cy,oR,iR){let r=-Math.PI/2;const st=Math.PI/5;c.beginPath();c.moveTo(cx,cy-oR);for(let i=0;i<5;i++){c.lineTo(cx+Math.cos(r)*oR,cy+Math.sin(r)*oR);r+=st;c.lineTo(cx+Math.cos(r)*iR,cy+Math.sin(r)*iR);r+=st}c.closePath();c.fill()}

// ─── FLOATING TEXT ───
const floats=[];
function fText(x,y,text,col,sz,dur=.9){floats.push({x,y,text,col,sz,life:dur,ml:dur,vy:-130,sc:2})}
function fDmg(x,y,dmg,combo){
  const cols=['#fff','#ffd740','#ff9100','#ff3d00','#ff1744'];
  const ci=clamp(Math.floor(combo/5),0,4);
  const sz=clamp(18+combo*2,18,56);
  fText(x+rand(-25,25),y-10,`-${Math.round(dmg)} ${pick(DMG_WORDS)}!`,cols[ci],sz);
}
function updateFloats(dt){for(let i=floats.length-1;i>=0;i--){const f=floats[i];f.y+=f.vy*dt;f.vy*=.95;f.life-=dt;f.sc=lerp(f.sc,1,dt*8);if(f.life<=0)floats.splice(i,1)}}
function drawFloats(){
  for(const f of floats){
    const a=clamp(f.life/f.ml,0,1);
    ctx.save();ctx.globalAlpha=a;
    ctx.font=`700 ${Math.round(f.sz*f.sc)}px Fredoka,sans-serif`;
    ctx.textAlign='center';ctx.textBaseline='middle';
    // Drop shadow
    ctx.fillStyle='rgba(0,0,0,.5)';ctx.fillText(f.text,f.x+2,f.y+2);
    // Glow
    ctx.shadowColor=f.col;ctx.shadowBlur=12;
    ctx.fillStyle=f.col;ctx.fillText(f.text,f.x,f.y);
    ctx.restore();
  }
  ctx.globalAlpha=1;
}

// ─── SLAM TEXT ───
let slamT='',slamTm=0,slamC='#fff',slamS=3.5;
function slam(t,c='#ffd740',d=1.3){slamT=t;slamTm=d;slamC=c;slamS=3.5}
function drawSlam(dt){
  if(slamTm<=0)return;slamTm-=dt;slamS=lerp(slamS,1,dt*14);
  const a=clamp(slamTm/.35,0,1);
  ctx.save();ctx.globalAlpha=a;
  ctx.font=`700 ${Math.round(60*slamS)}px "Bebas Neue",sans-serif`;
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.letterSpacing='4px';
  // Heavy shadow
  ctx.fillStyle='rgba(0,0,0,.6)';ctx.fillText(slamT,AW/2+3,AH*.36+3);
  // Outer glow
  ctx.shadowColor=slamC;ctx.shadowBlur=40;
  ctx.fillStyle=slamC;ctx.fillText(slamT,AW/2,AH*.36);
  // Inner bright
  ctx.shadowBlur=0;ctx.fillStyle='#fff';ctx.globalAlpha=a*.6;
  ctx.fillText(slamT,AW/2,AH*.36);
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
let flashC='',flashT=0,vigC='',vigT=0;
let chromAb=0; // chromatic aberration intensity
let bloomInt=0; // bloom intensity
let radialBlur=0; // radial blur
function screenFlash(c,d=.08){flashC=c;flashT=d}
function vignette(c,d=.35){vigC=c;vigT=d}

// ─── ARENA DRAWING ───
const signs=["SILVER DOLLAR CITY","BALDKNOBBERS","CROC CLASH ARENA","DOLLY'S STAMPEDE","GO-KARTS →","FUDGE SHOP","BRANSON LANDING","PILLOW EMPORIUM","THE STRIP","DUCK TOURS"];
// Pre-compute star positions
const starPositions=[];for(let i=0;i<80;i++)starPositions.push({x:rand(0,AW),y:rand(0,AH*.45),sz:rand(.5,2.5),sp:rand(.5,2)});

function drawArena(t){
  // Deep sky gradient
  const sg=ctx.createLinearGradient(0,0,0,AH);
  sg.addColorStop(0,'#050510');sg.addColorStop(0.3,'#0a0a24');sg.addColorStop(0.6,'#0f0f35');sg.addColorStop(1,'#141440');
  ctx.fillStyle=sg;ctx.fillRect(0,0,AW,AH);

  // Stars with twinkling
  for(const s of starPositions){
    const tw=.2+Math.sin(t*s.sp+s.x)*.3+.3;
    ctx.globalAlpha=tw;ctx.fillStyle='#fff';
    ctx.beginPath();ctx.arc(s.x,s.y,s.sz,0,TAU);ctx.fill();
  }
  ctx.globalAlpha=1;

  // Nebula / atmospheric glow
  ctx.save();
  const ng=ctx.createRadialGradient(AW*.7,AH*.15,10,AW*.7,AH*.15,200);
  ng.addColorStop(0,'rgba(139,92,246,.06)');ng.addColorStop(1,'transparent');
  ctx.fillStyle=ng;ctx.fillRect(0,0,AW,AH);
  const ng2=ctx.createRadialGradient(AW*.25,AH*.25,10,AW*.25,AH*.25,180);
  ng2.addColorStop(0,'rgba(251,191,36,.04)');ng2.addColorStop(1,'transparent');
  ctx.fillStyle=ng2;ctx.fillRect(0,0,AW,AH);
  ctx.restore();

  // Moon with craters and glow
  const mx=AW*.82,my=75;
  ctx.save();
  // Moon glow
  const mg=ctx.createRadialGradient(mx,my,25,mx,my,80);
  mg.addColorStop(0,'rgba(255,215,64,.12)');mg.addColorStop(1,'transparent');
  ctx.fillStyle=mg;ctx.fillRect(mx-100,my-100,200,200);
  // Moon body
  const moonG=ctx.createRadialGradient(mx-8,my-8,5,mx,my,32);
  moonG.addColorStop(0,'#fef3c7');moonG.addColorStop(.6,'#fcd34d');moonG.addColorStop(1,'#b45309');
  ctx.fillStyle=moonG;ctx.beginPath();ctx.arc(mx,my,32,0,TAU);ctx.fill();
  // Craters
  ctx.fillStyle='rgba(0,0,0,.1)';
  ctx.beginPath();ctx.arc(mx-10,my-5,8,0,TAU);ctx.fill();
  ctx.beginPath();ctx.arc(mx+12,my+8,5,0,TAU);ctx.fill();
  ctx.beginPath();ctx.arc(mx+3,my-14,4,0,TAU);ctx.fill();
  ctx.restore();

  // Neon signs (glowing)
  ctx.save();
  ctx.font='700 12px Fredoka,sans-serif';ctx.textAlign='center';
  for(let i=0;i<signs.length;i++){
    const sx=((i*100+55)%(AW-80))+40;
    const sy=52+(i%4)*26;
    const hue=(i*38+t*8)%360;
    const flicker=.08+Math.sin(t*3+i*2)*.04;
    ctx.globalAlpha=flicker;
    ctx.fillStyle=`hsl(${hue},80%,65%)`;
    ctx.shadowColor=`hsl(${hue},80%,65%)`;ctx.shadowBlur=15;
    ctx.fillText(signs[i],sx,sy);
  }
  ctx.shadowBlur=0;ctx.globalAlpha=1;ctx.restore();

  // Distant mountains with 3D shading
  ctx.save();
  const mtG=ctx.createLinearGradient(0,FLOOR_Y-60,0,FLOOR_Y);
  mtG.addColorStop(0,'#0d0d28');mtG.addColorStop(1,'#16163a');
  ctx.fillStyle=mtG;
  ctx.beginPath();ctx.moveTo(0,FLOOR_Y-30);
  for(let x=0;x<=AW;x+=25)ctx.lineTo(x,FLOOR_Y-30-Math.sin(x*.013)*28-Math.cos(x*.026)*16);
  ctx.lineTo(AW,FLOOR_Y);ctx.lineTo(0,FLOOR_Y);ctx.closePath();ctx.fill();
  ctx.restore();

  // Floor with reflective surface
  const fg=ctx.createLinearGradient(0,FLOOR_Y,0,AH);
  fg.addColorStop(0,'#1e1e48');fg.addColorStop(.3,'#191940');fg.addColorStop(1,'#121235');
  ctx.fillStyle=fg;ctx.fillRect(0,FLOOR_Y,AW,AH-FLOOR_Y);

  // Floor highlight line
  ctx.strokeStyle='rgba(255,255,255,.08)';ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(20,FLOOR_Y);ctx.lineTo(AW-20,FLOOR_Y);ctx.stroke();

  // Subtle floor reflections
  ctx.save();ctx.globalAlpha=.03;
  ctx.scale(1,-1);ctx.translate(0,-(FLOOR_Y*2));
  // would draw croc reflections here but too expensive, just a gradient
  ctx.restore();

  // Floor wood grain
  ctx.strokeStyle='rgba(255,255,255,.025)';ctx.lineWidth=1;
  for(let y=FLOOR_Y+14;y<AH;y+=16){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(AW,y);ctx.stroke()}

  // Atmospheric fog at bottom
  const fogG=ctx.createLinearGradient(0,FLOOR_Y,0,AH);
  fogG.addColorStop(0,'transparent');fogG.addColorStop(1,'rgba(20,20,60,.3)');
  ctx.fillStyle=fogG;ctx.fillRect(0,FLOOR_Y,AW,AH-FLOOR_Y);

  // Pillow stacks on walls (3D shaded)
  for(let side=0;side<2;side++){
    const bx=side===0?-2:AW-22;
    for(let py=FLOOR_Y-100;py<FLOOR_Y;py+=16){
      const hue=((py*3.5+side*140)%360);
      const pg=ctx.createRadialGradient(bx+12,py+6,2,bx+12,py+8,14);
      pg.addColorStop(0,`hsl(${hue},50%,50%)`);pg.addColorStop(1,`hsl(${hue},45%,28%)`);
      ctx.fillStyle=pg;
      ctx.beginPath();ctx.ellipse(bx+12,py+8,16,9,.15*(side?1:-1),0,TAU);ctx.fill();
      // Highlight
      ctx.fillStyle='rgba(255,255,255,.1)';
      ctx.beginPath();ctx.ellipse(bx+10,py+5,8,4,.15*(side?1:-1),0,TAU);ctx.fill();
    }
  }

  // Volumetric light rays from moon
  ctx.save();ctx.globalAlpha=.03;
  ctx.fillStyle='#ffd740';
  for(let r=0;r<5;r++){
    const ra=-.3+r*.18;
    ctx.beginPath();ctx.moveTo(mx,my);
    ctx.lineTo(mx+Math.cos(ra)*600,my+Math.sin(ra)*600);
    ctx.lineTo(mx+Math.cos(ra+.04)*600,my+Math.sin(ra+.04)*600);
    ctx.closePath();ctx.fill();
  }
  ctx.restore();
}

// ─── DRAW CROC (3D hyper-detailed) ───
function drawCroc(c){
  ctx.save();
  const cx=c.x+c.w/2, cy=c.y+c.h/2;
  ctx.translate(cx,cy);

  if(c.dead)ctx.rotate(c.deathRot);
  ctx.scale(c.face,1);
  ctx.scale(c.squash,c.stretch);
  if(c.specAct)ctx.rotate((Date.now()/50)%(TAU));

  // Hit flash
  if(c.hitFlash>0&&Math.floor(c.hitFlash*30)%2===0)ctx.globalAlpha=.35;
  if(c.stunned)ctx.globalAlpha=.5+Math.sin(Date.now()*.02)*.2;

  // Comeback aura
  if(c.comebackActive&&!c.dead){
    ctx.save();ctx.globalAlpha=.2+Math.sin(c.comebackFlash)*.1;
    const aG=ctx.createRadialGradient(0,0,20,0,0,80);
    aG.addColorStop(0,'rgba(255,50,0,.3)');aG.addColorStop(1,'transparent');
    ctx.fillStyle=aG;ctx.fillRect(-80,-80,160,160);
    ctx.restore();
  }

  const hw=c.w/2,hh=c.h/2;

  // ── SHADOW (soft, perspective) ──
  ctx.save();ctx.globalAlpha=.3;
  ctx.fillStyle='rgba(0,0,0,.5)';
  ctx.beginPath();ctx.ellipse(0,hh+8,hw*.85,8,0,0,TAU);ctx.fill();
  ctx.restore();

  // ── TAIL (3D shaped) ──
  const wag=Math.sin(Date.now()*.007)*.35;
  ctx.save();
  const tailG=ctx.createLinearGradient(-hw,-5,-hw-35,5);
  tailG.addColorStop(0,c.cMain);tailG.addColorStop(1,c.cDark);
  ctx.fillStyle=tailG;
  ctx.beginPath();ctx.moveTo(-hw+5,0);
  ctx.bezierCurveTo(-hw-10,-15+wag*12,-hw-30,-8+wag*8,-hw-38,6+wag*5);
  ctx.bezierCurveTo(-hw-25,14,-hw-10,10,-hw+5,6);
  ctx.closePath();ctx.fill();
  // Tail highlight
  ctx.fillStyle='rgba(255,255,255,.06)';
  ctx.beginPath();ctx.bezierCurveTo(-hw-8,-12+wag*10,-hw-25,-6+wag*6,-hw-30,2+wag*4);
  ctx.stroke();
  ctx.restore();

  // ── BACK LEGS ──
  const legBob=c.grounded?Math.sin(Date.now()*.012)*4:7;
  ctx.fillStyle=c.cDark;
  ctx.beginPath();ctx.roundRect(-hw*.45,hh*.3-legBob,12,16,3);ctx.fill();
  ctx.beginPath();ctx.roundRect(-hw*.15,hh*.3+legBob,12,16,3);ctx.fill();

  // ── BODY (3D gradient) ──
  ctx.save();
  const bodyG=ctx.createRadialGradient(-5,-8,5,0,5,hw);
  bodyG.addColorStop(0,c.cLight);bodyG.addColorStop(.5,c.cMain);bodyG.addColorStop(1,c.cDark);
  ctx.fillStyle=bodyG;
  ctx.beginPath();ctx.ellipse(0,0,hw,hh,0,0,TAU);ctx.fill();
  ctx.restore();

  // ── SCALES TEXTURE ──
  ctx.save();ctx.globalAlpha=.08;ctx.strokeStyle='#000';ctx.lineWidth=.5;
  for(let sx=-hw+10;sx<hw-15;sx+=10){
    for(let sy=-hh+8;sy<hh-8;sy+=9){
      ctx.beginPath();ctx.arc(sx+(sy%2)*5,sy,4,0,TAU);ctx.stroke();
    }
  }
  ctx.restore();

  // ── BELLY (3D) ──
  const bellyG=ctx.createRadialGradient(0,2,3,0,6,hw*.5);
  bellyG.addColorStop(0,c.cBelly);bellyG.addColorStop(1,c.cBellyDark);
  ctx.fillStyle=bellyG;
  ctx.beginPath();ctx.ellipse(0,5,hw*.58,hh*.48,0,0,TAU);ctx.fill();
  // Belly segments
  ctx.strokeStyle='rgba(0,0,0,.06)';ctx.lineWidth=.8;
  for(let bx=-hw*.4;bx<hw*.4;bx+=12){ctx.beginPath();ctx.moveTo(bx,5-hh*.35);ctx.lineTo(bx,5+hh*.35);ctx.stroke()}

  // ── FRONT LEGS ──
  ctx.fillStyle=c.cMain;
  ctx.beginPath();ctx.roundRect(hw*.2,hh*.3+legBob,12,16,3);ctx.fill();
  ctx.beginPath();ctx.roundRect(hw*.5,hh*.3-legBob,12,16,3);ctx.fill();
  // Leg claws
  ctx.fillStyle=c.cDark;
  for(const lx of [hw*.2+2,hw*.5+2,-hw*.45+2,-hw*.15+2]){
    const ly2=hh*.3+16+(lx>0?legBob:-legBob);
    for(let cl=0;cl<3;cl++){ctx.beginPath();ctx.arc(lx+cl*3,ly2,1.5,0,TAU);ctx.fill()}
  }

  // ── SNOUT (3D) ──
  const snoutG=ctx.createRadialGradient(hw*.7,-3,3,hw*.8,0,hw*.5);
  snoutG.addColorStop(0,c.cLight);snoutG.addColorStop(1,c.cMain);
  ctx.fillStyle=snoutG;
  ctx.beginPath();ctx.ellipse(hw*.78,-1,hw*.55,hh*.4,0,0,TAU);ctx.fill();

  // ── TEETH (detailed, 3D) ──
  ctx.fillStyle='#fff';ctx.strokeStyle='rgba(0,0,0,.2)';ctx.lineWidth=.5;
  const teethY=2;
  for(let tx=hw*.38;tx<hw*1.18;tx+=7){
    const tSz=3+Math.sin(tx)*.5;
    const isTop=Math.floor((tx-hw*.38)/7)%2===0;
    ctx.beginPath();
    if(isTop){ctx.moveTo(tx-2,teethY);ctx.lineTo(tx,teethY-tSz);ctx.lineTo(tx+2,teethY)}
    else{ctx.moveTo(tx-2,teethY);ctx.lineTo(tx,teethY+tSz);ctx.lineTo(tx+2,teethY)}
    ctx.closePath();ctx.fill();ctx.stroke();
  }

  // ── NOSTRILS ──
  ctx.fillStyle='rgba(0,0,0,.35)';
  ctx.beginPath();ctx.ellipse(hw*1.08,-5,2.5,2,0,0,TAU);ctx.fill();
  ctx.beginPath();ctx.ellipse(hw*1.08,2,2.5,2,0,0,TAU);ctx.fill();

  // ── EYE (big, expressive, 3D) ──
  // Eye socket shadow
  ctx.fillStyle='rgba(0,0,0,.15)';
  ctx.beginPath();ctx.ellipse(hw*.32,-hh*.48,13,14,0,0,TAU);ctx.fill();
  // Eye white with gradient
  const eyeG=ctx.createRadialGradient(hw*.32,-hh*.5,2,hw*.32,-hh*.48,12);
  eyeG.addColorStop(0,'#fff');eyeG.addColorStop(1,'#e8e8e8');
  ctx.fillStyle=eyeG;
  ctx.beginPath();ctx.ellipse(hw*.32,-hh*.48,11,12,0,0,TAU);ctx.fill();
  // Iris
  const irisG=ctx.createRadialGradient(hw*.37,-hh*.48,1,hw*.37,-hh*.48,6);
  irisG.addColorStop(0,c.cEye);irisG.addColorStop(1,c.cEyeDark);
  const pupOff=c.stunned?Math.sin(Date.now()*.01)*4:2;
  ctx.fillStyle=irisG;
  ctx.beginPath();ctx.arc(hw*.35+pupOff,-hh*.48,6,0,TAU);ctx.fill();
  // Pupil
  ctx.fillStyle='#000';
  ctx.beginPath();ctx.ellipse(hw*.37+pupOff,-hh*.48,3,3.5,0,0,TAU);ctx.fill();
  // Eye highlight
  ctx.fillStyle='#fff';
  ctx.beginPath();ctx.arc(hw*.33+pupOff-1,-hh*.55,2.5,0,TAU);ctx.fill();
  ctx.beginPath();ctx.arc(hw*.4+pupOff,-hh*.42,1.2,0,TAU);ctx.fill();

  // Angry eyebrow when comeback or attacking
  if(c.comebackActive||c.atk||c.specAct){
    ctx.strokeStyle=c.cDark;ctx.lineWidth=4;ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(hw*.12,-hh*.7);ctx.lineTo(hw*.52,-hh*.82);ctx.stroke();
  }

  // ── SPIKES (3D shaded) ──
  for(let i=-3;i<=3;i++){
    const sx=i*10;
    const spG=ctx.createLinearGradient(sx,-hh,sx,-hh-10);
    spG.addColorStop(0,c.cMain);spG.addColorStop(1,c.comebackActive?'#ff3d00':c.cLight);
    ctx.fillStyle=spG;
    ctx.beginPath();ctx.moveTo(sx-4,-hh+2);ctx.lineTo(sx,-hh-9);ctx.lineTo(sx+4,-hh+2);ctx.closePath();ctx.fill();
  }

  // ── RIM LIGHTING (edge glow for 3D pop) ──
  ctx.save();ctx.globalAlpha=.15;
  ctx.strokeStyle=c.cLight;ctx.lineWidth=2;
  ctx.beginPath();ctx.ellipse(0,0,hw-1,hh-1,0,-.5,1.5);ctx.stroke();
  ctx.restore();

  // ── PARRY SHIELD ──
  if(c.parrying){
    ctx.save();
    const pG=ctx.createRadialGradient(0,0,hw,0,0,hw+25);
    pG.addColorStop(0,'rgba(139,92,246,.15)');pG.addColorStop(1,'rgba(139,92,246,.35)');
    ctx.fillStyle=pG;ctx.beginPath();ctx.arc(0,0,hw+20,0,TAU);ctx.fill();
    ctx.strokeStyle='#a78bfa';ctx.lineWidth=2.5;ctx.shadowColor='#a78bfa';ctx.shadowBlur=15;
    ctx.beginPath();ctx.arc(0,0,hw+20,0,TAU);ctx.stroke();
    ctx.shadowBlur=0;ctx.restore();
  }

  // ── PILLOW (3D detailed) ──
  ctx.save();ctx.translate(hw*.55,-hh*.05);ctx.rotate(c.pillowAng);
  drawPillow3D(ctx,24,0,24,c===p1?'#87ceeb':'#ffb6c1',c===p1?'#5ba3c4':'#d98fa3');
  ctx.restore();

  // ── TORNADO RINGS ──
  if(c.specAct){
    ctx.save();ctx.globalAlpha=.5;
    const tt=Date.now()/70;
    for(let r=0;r<4;r++){
      ctx.strokeStyle=r%2?'#ffd740':'#fff';ctx.lineWidth=2.5;
      ctx.shadowColor='#ffd740';ctx.shadowBlur=10;
      ctx.beginPath();ctx.arc(0,0,hw+18+r*16,tt+r,tt+r+4.2);ctx.stroke();
    }
    ctx.shadowBlur=0;ctx.restore();
  }

  // ── DASH TRAIL (motion blur) ──
  if(c.dashing){
    ctx.globalAlpha=.2;
    for(let trail=1;trail<=3;trail++){
      ctx.fillStyle=c.cMain;
      ctx.beginPath();ctx.ellipse(-trail*18,0,hw*.7/trail,hh*.5/trail,0,0,TAU);ctx.fill();
    }
    ctx.globalAlpha=1;
  }

  // ── STUN STARS ──
  if(c.stunned){
    ctx.fillStyle='#ffd740';ctx.shadowColor='#ffd740';ctx.shadowBlur=5;
    for(let i=0;i<4;i++){
      const sa=Date.now()*.005+i*1.57;
      ctx.save();ctx.translate(Math.cos(sa)*28,-hh-14+Math.sin(sa)*7);ctx.rotate(sa*2);
      drawStar5(ctx,0,0,6,2.5);ctx.restore();
    }
    ctx.shadowBlur=0;
  }

  ctx.shadowBlur=0;ctx.restore();
}

function drawPillow3D(c,x,y,sz,col,colDark){
  c.save();c.translate(x,y);
  const hs=sz/2;
  // Shadow
  c.fillStyle='rgba(0,0,0,.2)';
  c.beginPath();c.ellipse(2,3,hs+2,hs*.6+2,0,0,TAU);c.fill();
  // Body gradient
  const pG=c.createRadialGradient(-3,-3,2,0,0,hs);
  pG.addColorStop(0,'#fff');pG.addColorStop(.3,col);pG.addColorStop(1,colDark);
  c.fillStyle=pG;
  const r=sz*.3;
  c.beginPath();
  c.moveTo(-hs+r,-hs);c.lineTo(hs-r,-hs);c.quadraticCurveTo(hs,-hs,hs,-hs+r);
  c.lineTo(hs,hs-r);c.quadraticCurveTo(hs,hs,hs-r,hs);c.lineTo(-hs+r,hs);
  c.quadraticCurveTo(-hs,hs,-hs,hs-r);c.lineTo(-hs,-hs+r);c.quadraticCurveTo(-hs,-hs,-hs+r,-hs);
  c.closePath();c.fill();
  // Seams
  c.strokeStyle='rgba(255,255,255,.15)';c.lineWidth=1;
  c.beginPath();c.moveTo(0,-hs);c.lineTo(0,hs);c.moveTo(-hs,0);c.lineTo(hs,0);c.stroke();
  // Corner tufts
  c.fillStyle='rgba(255,255,255,.2)';
  for(const [tx2,ty2] of [[-hs,-hs],[hs,-hs],[hs,hs],[-hs,hs]]){
    c.beginPath();c.arc(tx2*.7,ty2*.7,3,0,TAU);c.fill();
  }
  // Feather poking out
  c.fillStyle='rgba(255,255,255,.4)';
  c.beginPath();c.ellipse(hs+4,-1,5,2,.3,0,TAU);c.fill();
  c.restore();
}

// ─── CROC CONSTRUCTOR ───
function mkCroc(x,face,cMain,cLight,cDark,cBelly,cBellyDark,cEye,cEyeDark,name){
  return{x,y:FLOOR_Y-CH,vx:0,vy:0,w:CW,h:CH,face,
    cMain,cLight,cDark,cBelly,cBellyDark,cEye,cEyeDark,name,
    hp:MAX_HP,wins:0,alive:true,grounded:true,
    atk:false,atkT:0,atkCD:0,pillowAng:0,
    dashing:false,dashT:0,dashCD:0,dashDir:0,
    specAct:false,specT:0,specCD:0,
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
  c.atk=false;c.atkT=0;c.atkCD=0;c.pillowAng=0;c.dashing=false;c.dashT=0;c.dashCD=0;
  c.specAct=false;c.specT=0;c.specCD=0;c.parrying=false;c.parryT=0;c.parryCD=0;c.parryOK=false;
  c.stunned=false;c.stunT=0;c.hitFlash=0;c.squash=1;c.stretch=1;
  c.combo=0;c.comboT=0;c.maxCombo=0;c.totalDmg=0;c.hits=0;c.parryCount=0;
  c.comebackActive=false;c.comebackFlash=0;
  c.dead=false;c.deathVx=0;c.deathVy=0;c.deathBounces=0;c.deathRot=0;c.deathRotV=0;
  c.bufAtk=false;c.bufParry=false;
}

// ─── DAMAGE ───
function dealDmg(atk,vic,dmg,dir,heavy){
  if(vic.parrying&&vic.parryT>0){
    vic.parryOK=true;atk.stunned=true;atk.stunT=PARRY_STUN;
    hitStop(HS_PARRY);addTrauma(.35);screenFlash('rgba(139,92,246,.3)');
    sfxParry();sparks(vic.x+vic.w/2,vic.y+vic.h/2,20,'#a78bfa');
    shockwave(vic.x+vic.w/2,vic.y+vic.h/2,'rgba(139,92,246,.5)');
    lightningBolt(vic.x+vic.w/2-40,vic.y-20,vic.x+vic.w/2+40,vic.y+vic.h);
    lightningBolt(vic.x+vic.w/2+30,vic.y-30,vic.x+vic.w/2-30,vic.y+vic.h+10);
    fText(vic.x+vic.w/2,vic.y-35,pick(PARRY_LINES),'#a78bfa',30);
    vic.parryCount++;chromAb=.4;return;
  }
  const m=atk.comebackActive?COMEBACK_M:1;const fd=dmg*m;
  vic.hp=Math.max(0,vic.hp-fd);vic.hitFlash=.15;
  vic.vx=dir*KB*(heavy?1.5:1);vic.vy=KB_UP*(heavy?1.4:1);vic.grounded=false;
  vic.combo=0;vic.comboT=0;
  atk.combo++;atk.comboT=1.5;atk.hits++;atk.totalDmg+=fd;
  if(atk.combo>atk.maxCombo)atk.maxCombo=atk.combo;

  if(heavy){
    hitStop(HS_HEAVY);addTrauma(.55);
    feathers(vic.x+vic.w/2,vic.y+vic.h/2,16,'#fff');
    embers(vic.x+vic.w/2,vic.y+vic.h/2,8);
    shockwave(vic.x+vic.w/2,vic.y+vic.h/2);
    screenFlash('rgba(255,255,255,.2)',.1);chromAb=.3;
  }else{
    hitStop(HS_LIGHT);addTrauma(.2+atk.combo*.025);
    feathers(vic.x+vic.w/2,vic.y+vic.h/2,7,'#fff');
  }
  sfxHit(atk.combo);fDmg(vic.x+vic.w/2,vic.y,fd,atk.combo);

  if(COMBO_MS[atk.combo]){slam(COMBO_MS[atk.combo],'#ffd740',1);sfxCMilestone(atk.combo);stars(atk.x+atk.w/2,atk.y,12);bloomInt=.6}

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
  }
}

// ─── UPDATE CROC ───
function updateCroc(c,inp,o,dt){
  c.atkCD=Math.max(0,c.atkCD-dt);c.dashCD=Math.max(0,c.dashCD-dt);c.specCD=Math.max(0,c.specCD-dt);
  c.parryCD=Math.max(0,c.parryCD-dt);c.hitFlash=Math.max(0,c.hitFlash-dt);
  c.squash=lerp(c.squash,1,dt*10);c.stretch=lerp(c.stretch,1,dt*10);
  c.comboT=Math.max(0,c.comboT-dt);if(c.comboT<=0)c.combo=0;

  const wasCB=c.comebackActive;
  c.comebackActive=c.hp/MAX_HP<=COMEBACK_TH&&c.alive;
  if(c.comebackActive&&!wasCB){sfxComeback();fText(c.x+c.w/2,c.y-45,pick(COMEBACK_LINES),'#ff3d00',26);vignette('rgba(255,0,0,.25)',.5)}
  if(c.comebackActive)c.comebackFlash+=dt*6;

  if(c.dead){
    c.deathRot+=c.deathRotV*dt;c.x+=c.deathVx*dt;c.y+=c.deathVy*dt;c.deathVy+=GRAVITY*1.3*dt;
    if(c.x<10){c.x=10;c.deathVx*=-.6;c.deathBounces++;addTrauma(.3);sfxBounce();sparks(10,c.y+c.h/2,5)}
    if(c.x+c.w>AW-10){c.x=AW-c.w-10;c.deathVx*=-.6;c.deathBounces++;addTrauma(.3);sfxBounce();sparks(AW-10,c.y+c.h/2,5)}
    if(c.y+c.h>FLOOR_Y){c.y=FLOOR_Y-c.h;c.deathVy*=-.35;c.deathVx*=.65;c.deathBounces++;if(Math.abs(c.deathVy)>25){addTrauma(.15);sfxBounce()}}
    return;
  }
  if(!c.alive)return;

  if(c.stunned){c.stunT-=dt;if(c.stunT<=0)c.stunned=false;c.vx*=.85;c.vy+=GRAVITY*dt;c.x+=c.vx*dt;c.y+=c.vy*dt;if(c.y+c.h>FLOOR_Y){c.y=FLOOR_Y-c.h;c.vy=0;c.grounded=true}c.x=clamp(c.x,10,AW-c.w-10);return}

  if(c.parrying){c.parryT-=dt;if(c.parryT<=0){c.parrying=false;if(!c.parryOK)c.parryCD=PARRY_CD}c.parryOK=false}

  let mx=0;if(inp.left)mx-=1;if(inp.right)mx+=1;
  if(inp.up&&c.grounded){c.vy=JUMP_VEL;c.grounded=false;c.squash=.55;c.stretch=1.45;sfxBounce();shockwave(c.x+c.w/2,c.y+c.h)}

  if(c.dashing){c.dashT-=dt;c.vx=c.dashDir*DASH_SPD;if(c.dashT<=0)c.dashing=false}
  else if(!c.specAct)c.vx=mx*MOVE_SPD;

  if(c.bufAtk&&c.atkCD<=0&&!c.atk&&!c.specAct&&!c.parrying)inp.attack=true;
  if(c.bufParry&&c.parryCD<=0&&!c.parrying&&!c.atk&&!c.specAct)inp.parry=true;
  c.bufAtk=false;c.bufParry=false;

  if(inp.attack&&c.atkCD<=0&&!c.atk&&!c.specAct&&!c.parrying){
    c.atk=true;c.atkT=.18;c.atkCD=ATK_CD;c.pillowAng=0;sfxHit(c.combo);
    const acx=c.x+c.w/2+c.face*35,acy=c.y+c.h/2;
    if(dist(acx,acy,o.x+o.w/2,o.y+o.h/2)<ATK_RANGE&&o.alive)dealDmg(c,o,ATK_DMG,c.face,false);
  }else if(inp.attack)c.bufAtk=true;
  if(c.atk){c.atkT-=dt;c.pillowAng=lerp(c.pillowAng,c.face*2.2,dt*28);if(c.atkT<=0){c.atk=false;c.pillowAng=0}}

  if(inp.parry&&c.parryCD<=0&&!c.parrying&&!c.atk&&!c.specAct){c.parrying=true;c.parryT=PARRY_WIN;c.parryOK=false;c.parryCD=0}
  else if(inp.parry)c.bufParry=true;

  if(inp.dash&&c.dashCD<=0&&!c.dashing&&!c.specAct){
    c.dashing=true;c.dashT=DASH_DUR;c.dashCD=DASH_CD;c.dashDir=c.face;c.squash=1.5;c.stretch=.6;sfxDash();radialBlur=.3;
    setTimeout(()=>{if(!c.alive||!o.alive)return;if(dist(c.x+c.w/2,c.y+c.h/2,o.x+o.w/2,o.y+o.h/2)<85)dealDmg(c,o,DASH_DMG,c.dashDir,true)},80);
  }

  if(inp.special&&c.specCD<=0&&!c.specAct){c.specAct=true;c.specT=SPEC_DUR;c.specCD=SPEC_CD;sfxSpecial();slam("TORNADO!!",c.cMain,.8);bloomInt=.4}
  if(c.specAct){
    c.specT-=dt;c.vx=c.face*150;
    if(dist(c.x+c.w/2,c.y+c.h/2,o.x+o.w/2,o.y+o.h/2)<95&&o.alive&&Math.random()<dt*10)dealDmg(c,o,SPEC_DMG,c.face,false);
    feathers(c.x+c.w/2+rand(-20,20),c.y+c.h/2+rand(-12,12),1,c.cMain);
    if(c.specT<=0)c.specAct=false;
  }

  c.vy+=GRAVITY*dt;c.x+=c.vx*dt;c.y+=c.vy*dt;
  if(c.y+c.h>FLOOR_Y){c.y=FLOOR_Y-c.h;if(c.vy>130){c.squash=1.3;c.stretch=.7;sfxBounce();shockwave(c.x+c.w/2,FLOOR_Y)}c.vy=0;c.grounded=true}
  c.x=clamp(c.x,10,AW-c.w-10);
  if(!c.dashing&&!c.specAct)c.face=(o.x+o.w/2>c.x+c.w/2)?1:-1;
}

// ─── AI ───
function getAI(ai,tgt){
  const inp={left:0,right:0,up:0,attack:0,dash:0,special:0,parry:0};
  const dx=tgt.x-ai.x,adx=Math.abs(dx);
  if(adx>85){if(dx>0)inp.right=1;else inp.left=1}
  else if(adx<45){if(dx>0)inp.left=1;else inp.right=1}
  if(ai.grounded&&((tgt.atk&&adx<100&&Math.random()<.35)||Math.random()<.012))inp.up=1;
  if(adx<80&&ai.atkCD<=0&&Math.random()<.45)inp.attack=1;
  if(tgt.atk&&tgt.atkT>.08&&adx<85&&ai.parryCD<=0&&Math.random()<.22)inp.parry=1;
  if(adx<140&&adx>55&&ai.dashCD<=0&&Math.random()<.06)inp.dash=1;
  if(adx<110&&ai.specCD<=0&&Math.random()<.025)inp.special=1;
  if(ai.hp<25&&adx<60){inp.left=dx>0?1:0;inp.right=dx<0?1:0}
  return inp;
}

// ─── GAME STATE ───
let state='title',isAI=false,p1,p2,roundTimer,roundNum,cdTimer,lastTS=0,gameTime=0,matchStats={};
function initP(){
  p1=mkCroc(170,1,'#4ade80','#86efac','#16a34a','#bbf7d0','#6ee7b7','#a3e635','#65a30d','Gator Gary');
  p2=mkCroc(AW-170-CW,-1,'#f472b6','#f9a8d4','#be185d','#fce7f3','#fbcfe8','#e879f9','#a21caf','Croc Carl');
}
function resetRound(){resetC(p1,170);resetC(p2,AW-170-CW);roundTimer=ROUND_TIME;parts.length=0;floats.length=0;trauma=0;hsTimer=0;smTimer=0;slamTm=0;flashT=0;vigT=0;chromAb=0;bloomInt=0;radialBlur=0}
function startGame(ai){isAI=ai;initP();roundNum=1;matchStats={p1d:0,p2d:0,p1c:0,p2c:0,p1p:0,p2p:0,rds:0};startCD()}
function startCD(){resetRound();state='countdown';cdTimer=2;slam(`Round ${roundNum}`,'#ffd740',1.5);sfxRound();$('hud').classList.remove('hidden');$('title-screen').classList.add('hidden');$('result-screen').classList.add('hidden')}
function startPlay(){state='playing';slam(pick(ROUND_INTROS),'#fff',1)}
function endRound(w){
  state='roundEnd';matchStats.rds++;
  matchStats.p1d+=p1.totalDmg;matchStats.p2d+=p2.totalDmg;
  matchStats.p1c=Math.max(matchStats.p1c,p1.maxCombo);matchStats.p2c=Math.max(matchStats.p2c,p2.maxCombo);
  matchStats.p1p+=p1.parryCount;matchStats.p2p+=p2.parryCount;
  if(w){w.wins++;if(w.hp>=MAX_HP){slam(pick(PERFECT_LINES),'#ffd740',2);sfxPerfect();goldenRain(AW/2,AH*.25);bloomInt=1}else slam(pick(KO_LINES),'#ff3d00',1.8)}
  else slam("TIME'S UP!!",'#fbbf24',1.5);
  setTimeout(()=>{if(p1.wins>=ROUNDS_TO_WIN||p2.wins>=ROUNDS_TO_WIN)endMatch();else{roundNum++;startCD()}},2800);
}
function endMatch(){
  state='result';const w=p1.wins>=ROUNDS_TO_WIN?p1:p2;const wc=w===p1?'var(--p1)':'var(--p2)';
  $('res-winner').textContent=`🐊 ${w.name} ${pick(WIN_LINES)}`;$('res-winner').style.color=wc;
  $('res-score').textContent=`${p1.wins} — ${p2.wins}`;
  $('res-grid').innerHTML=`<div><div class="v">${matchStats.p1d.toFixed(0)}</div><div class="l">Gary Dmg</div></div><div><div class="v">${matchStats.p2d.toFixed(0)}</div><div class="l">Carl Dmg</div></div><div><div class="v">${matchStats.p1c}</div><div class="l">Gary Best Combo</div></div><div><div class="v">${matchStats.p2c}</div><div class="l">Carl Best Combo</div></div><div><div class="v">${matchStats.p1p}</div><div class="l">Gary Parries</div></div><div><div class="v">${matchStats.p2p}</div><div class="l">Carl Parries</div></div>`;
  $('result-screen').classList.remove('hidden');
}

// ─── HUD ───
function updateHUD(){
  const p1pct=(p1.hp/MAX_HP)*100,p2pct=(p2.hp/MAX_HP)*100;
  $('p1hp').style.width=p1pct+'%';$('p2hp').style.width=p2pct+'%';
  $('p1hpt').textContent=Math.ceil(p1.hp);$('p2hpt').textContent=Math.ceil(p2.hp);
  $('p1wrap').className='hbar-wrap'+(p1pct<25?' low':'');
  $('p2wrap').className='hbar-wrap'+(p2pct<25?' low':'');
  $('p1s').textContent=`Wins ${p1.wins}`;$('p2s').textContent=`Wins ${p2.wins}`;
  $('hround').textContent=`ROUND ${roundNum}`;
  const te=$('htimer');te.textContent=Math.ceil(Math.max(0,roundTimer));
  te.className=roundTimer<10?'htimer warn':'htimer';
  $('p1combo').textContent=p1.combo>=3?`${p1.combo} HIT COMBO · x${Math.min(Math.floor(p1.combo/3)+1,10)}`:'';
  $('p2combo').textContent=p2.combo>=3?`${p2.combo} HIT COMBO · x${Math.min(Math.floor(p2.combo/3)+1,10)}`:'';
}

// ─── INPUT MAPS ───
function getP1(){return{left:keys.KeyA||ts.left,right:keys.KeyD||ts.right,up:jp.KeyW||ts.up,attack:jp.KeyF||ts.attack,dash:jp.KeyG||ts.dash,special:jp.KeyH||ts.special,parry:jp.KeyR||ts.parry}}
function getP2(){if(isAI)return getAI(p2,p1);return{left:keys.ArrowLeft,right:keys.ArrowRight,up:jp.ArrowUp,attack:jp.KeyL,dash:jp.KeyK,special:jp.KeyJ,parry:jp.KeyP}}

// ─── POST-PROCESSING ───
function postFX(dt){
  // Bloom glow (fake: bright overlay)
  bloomInt=Math.max(0,bloomInt-dt*1.5);
  if(bloomInt>0){ctx.save();ctx.globalAlpha=bloomInt*.15;ctx.fillStyle='#ffd740';ctx.filter=`blur(30px)`;ctx.fillRect(0,0,AW,AH);ctx.filter='none';ctx.restore()}

  // Screen flash
  if(flashT>0){ctx.fillStyle=flashC;ctx.globalAlpha=clamp(flashT/.08,0,1)*.5;ctx.fillRect(0,0,AW,AH);ctx.globalAlpha=1}

  // Vignette
  if(vigT>0){const va=clamp(vigT/.3,0,1)*.45;const vg=ctx.createRadialGradient(AW/2,AH/2,AW*.25,AW/2,AH/2,AW*.65);vg.addColorStop(0,'transparent');vg.addColorStop(1,vigC);ctx.globalAlpha=va;ctx.fillStyle=vg;ctx.fillRect(0,0,AW,AH);ctx.globalAlpha=1}

  // Permanent subtle vignette
  const sv=ctx.createRadialGradient(AW/2,AH/2,AW*.3,AW/2,AH/2,AW*.7);
  sv.addColorStop(0,'transparent');sv.addColorStop(1,'rgba(0,0,0,.35)');
  ctx.fillStyle=sv;ctx.fillRect(0,0,AW,AH);

  // Chromatic aberration (fake: colored edge offsets)
  chromAb=Math.max(0,chromAb-dt*2);
  if(chromAb>.01){
    ctx.save();ctx.globalAlpha=chromAb*.3;ctx.globalCompositeOperation='screen';
    ctx.fillStyle='rgba(255,0,0,.15)';ctx.fillRect(chromAb*4,0,AW,AH);
    ctx.fillStyle='rgba(0,0,255,.15)';ctx.fillRect(-chromAb*4,0,AW,AH);
    ctx.globalCompositeOperation='source-over';ctx.restore();
  }

  // Radial blur (fake: concentric semitransparent overlays)
  radialBlur=Math.max(0,radialBlur-dt*2);

  // Slow-mo cinematic bars
  if(smTimer>0){
    const barH=30*clamp(smTimer/SLO_DUR,0,1);
    ctx.fillStyle='rgba(0,0,0,.6)';ctx.fillRect(0,0,AW,barH);ctx.fillRect(0,AH-barH,AW,barH);
    // Slow mo text
    ctx.save();ctx.globalAlpha=.3;ctx.font='700 11px "Bebas Neue",sans-serif';ctx.fillStyle='#fff';ctx.textAlign='right';
    ctx.fillText('SLOW MOTION',AW-15,barH-6);ctx.restore();
  }

  // Film grain (subtle)
  ctx.save();ctx.globalAlpha=.025;
  for(let i=0;i<40;i++){
    ctx.fillStyle=Math.random()>.5?'#fff':'#000';
    ctx.fillRect(rand(0,AW),rand(0,AH),rand(1,3),rand(1,3));
  }
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
  ctx.translate(ox+shX*sc,oy+shY*sc);ctx.scale(sc,sc);

  // Always draw arena for cinematic bg on title/result screens
  drawArena(gameTime);
  if(state!=='title'){
    if(p1&&p2){if(p1.dead)drawCroc(p1);if(p2.dead)drawCroc(p2);if(!p1.dead)drawCroc(p1);if(!p2.dead)drawCroc(p2)}
    drawParts();drawFloats();drawSlam(rawDt);postFX(rawDt);
  }else{
    // Title-only: subtle permanent vignette
    const tv=ctx.createRadialGradient(AW/2,AH/2,AW*.2,AW/2,AH/2,AW*.7);
    tv.addColorStop(0,'transparent');tv.addColorStop(1,'rgba(0,0,0,.55)');
    ctx.fillStyle=tv;ctx.fillRect(0,0,AW,AH);
  }

  ctx.restore();
  for(const k in jp)delete jp[k];
  ts.attack=0;ts.dash=0;ts.special=0;ts.parry=0;
}

// ─── DOM ───
const $=id=>document.getElementById(id);
$('btn-pvp').addEventListener('click',()=>{initAudio();startGame(false)});
$('btn-ai').addEventListener('click',()=>{initAudio();startGame(true)});
$('btn-rematch').addEventListener('click',()=>{roundNum=1;startGame(isAI)});
$('btn-menu2').addEventListener('click',()=>{state='title';$('title-screen').classList.remove('hidden');$('result-screen').classList.add('hidden');$('hud').classList.add('hidden')});

requestAnimationFrame(loop);
})();
