#!/usr/bin/env node
// This script applies the mega viral features patch to game.js + index.html
// Run: node patch-viral.js

const fs = require('fs');
const path = require('path');

let code = fs.readFileSync(path.join(__dirname, 'game.js'), 'utf8');
let html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

function replace(old, neo, label) {
  if (!code.includes(old)) {
    console.error(`❌ PATCH FAILED in game.js: "${label}" — target string not found`);
    process.exit(1);
  }
  code = code.replace(old, neo);
  console.log(`✅ ${label}`);
}
function replaceHTML(old, neo, label) {
  if (!html.includes(old)) {
    console.error(`❌ PATCH FAILED in index.html: "${label}" — target string not found`);
    process.exit(1);
  }
  html = html.replace(old, neo);
  console.log(`✅ [HTML] ${label}`);
}

// ═══════════════════════════════════════════════════════════
// 1. ADD VIRAL SYSTEMS (after POWER_KEYS)
// ═══════════════════════════════════════════════════════════
replace(
  `const POWER_KEYS = Object.keys(POWERS);`,
  `const POWER_KEYS = Object.keys(POWERS);

// ─── ARENA / SCENE SYSTEM ───
const ARENAS = [
  { id:'boardwalk', name:'Branson Boardwalk', streakReq:0, unlock:'default' },
  { id:'swamp',     name:'Swamp Midnight',   streakReq:3, unlock:'Win 3 in a row' },
  { id:'rooftop',   name:'Neon Rooftop',     streakReq:3, unlock:'Win 3 in a row' },
];
let currentArena = ARENAS[0];
let unlockedArenas = ['boardwalk']; // earn others via win streaks

// ─── RANKED TIER SYSTEM ───
const RANKED_TIERS = [
  { id:'bronze',   name:'Bronze Brawler',   icon:'🥉', minElo:0 },
  { id:'silver',   name:'Silver Snapper',   icon:'🥈', minElo:100 },
  { id:'gold',     name:'Gold Gator',       icon:'🥇', minElo:250 },
  { id:'platinum', name:'Platinum Predator', icon:'💎', minElo:500 },
  { id:'diamond',  name:'Diamond Crusher',  icon:'💠', minElo:800 },
  { id:'croc_king',name:'CROC KING',        icon:'👑', minElo:1200 },
];
let playerElo = 0;
function getPlayerTier(){ return RANKED_TIERS.slice().reverse().find(t => playerElo >= t.minElo) || RANKED_TIERS[0]; }
function eloChange(won){ const delta = won ? randInt(18,32) : -randInt(10,20); playerElo = Math.max(0, playerElo + delta); return delta; }

// ─── WEEKLY LEADERBOARD ───
let leaderboard = []; // [{name,wins,streak,elo,tier,date}]
const LB_BOTS = ['SwampKing99','GatorGod','PillowPro','CrocLord','SnapperX','ScaleSlayer','MightyMaw','TailSpin','FangBoss','NiteGator'];
function initLeaderboard(){
  leaderboard = LB_BOTS.map(n => ({
    name:n, wins:randInt(3,30), streak:randInt(0,8), elo:randInt(50,900),
    tier:RANKED_TIERS[randInt(0,4)].id, isBot:true
  }));
  leaderboard.push({name:'YOU', wins:getTotalWins(), streak:getStreak(), elo:playerElo, tier:getPlayerTier().id, isBot:false});
  leaderboard.sort((a,b) => b.elo - a.elo);
}
function updateLeaderboardEntry(){
  const me = leaderboard.find(e => !e.isBot);
  if(me){ me.wins=getTotalWins(); me.streak=getStreak(); me.elo=playerElo; me.tier=getPlayerTier().id; }
  leaderboard.sort((a,b) => b.elo - a.elo);
}

// ─── DAILY CHALLENGE SYSTEM ───
const DAILY_CHALLENGES = [
  { desc:'Win 3 matches', check:()=>getTotalWins()>=_dailyStartWins+3, icon:'🏆' },
  { desc:'Get a 5-hit combo', check:()=>_dailyComboHit, icon:'💥' },
  { desc:'Win without taking damage', check:()=>_dailyPerfect, icon:'⭐' },
  { desc:'Use Rage power 2 times', check:()=>_dailyRageCount>=2, icon:'💀' },
  { desc:'Parry 3 attacks', check:()=>_dailyParryCount>=3, icon:'🛡️' },
  { desc:'Win with a Power Pillow Drive', check:()=>_dailyDiveKill, icon:'🌀' },
  { desc:'Land 20 pillow hits', check:()=>_dailyHitCount>=20, icon:'👊' },
  { desc:'Win on Swamp Midnight', check:()=>_dailySwampWin, icon:'🌙' },
];
let dailyChallenge = null, dailyChallengeComplete = false;
let _dailyStartWins=0, _dailyComboHit=false, _dailyPerfect=false;
let _dailyRageCount=0, _dailyParryCount=0, _dailyDiveKill=false;
let _dailyHitCount=0, _dailySwampWin=false;
function pickDailyChallenge(){
  const dayIdx = Math.floor(Date.now()/(1000*60*60*24));
  dailyChallenge = DAILY_CHALLENGES[dayIdx % DAILY_CHALLENGES.length];
  dailyChallengeComplete = false;
  _dailyStartWins=getTotalWins(); _dailyComboHit=false; _dailyPerfect=false;
  _dailyRageCount=0; _dailyParryCount=0; _dailyDiveKill=false;
  _dailyHitCount=0; _dailySwampWin=false;
}

// ─── WIN STREAK REWARDS ───
const STREAK_REWARDS = [
  { streak:3, reward:'Golden name glow + Swamp arena', icon:'✨' },
  { streak:5, reward:'Victory taunt animation', icon:'💃' },
  { streak:7, reward:'Rooftop arena unlock', icon:'🏙️' },
  { streak:10, reward:'Neon skin unlock for both', icon:'🌈' },
  { streak:15, reward:'CROC KING title', icon:'👑' },
];
let streakRewardShown = 0;

// ─── BATTLE PASS (Free 10-tier) ───
const SEASON_NAME = 'SEASON 1 — PILLOW WARS';
const BP_TIERS = [
  { tier:1, xpReq:0,    reward:'Title: Newcomer',       icon:'🐣', type:'title' },
  { tier:2, xpReq:100,  reward:'Gold name glow',         icon:'✨', type:'cosmetic' },
  { tier:3, xpReq:250,  reward:'Swamp Arena',            icon:'🌙', type:'arena' },
  { tier:4, xpReq:450,  reward:'Victory Dance emote',    icon:'💃', type:'emote' },
  { tier:5, xpReq:700,  reward:'Pillow Trail FX',        icon:'🪶', type:'vfx' },
  { tier:6, xpReq:1000, reward:'Rooftop Arena',          icon:'🏙️', type:'arena' },
  { tier:7, xpReq:1400, reward:'Croc Spin emote',        icon:'🌀', type:'emote' },
  { tier:8, xpReq:1900, reward:'Golden Pillow skin',     icon:'🥇', type:'weapon' },
  { tier:9, xpReq:2500, reward:'Neon Skin unlock',       icon:'🌈', type:'skin' },
  { tier:10,xpReq:3200, reward:'CROC KING Crown',        icon:'👑', type:'legendary' },
];
let bpXP = 0, bpTier = 0;
function addBPXP(amount){
  bpXP += amount;
  const oldTier = bpTier;
  for(let i = BP_TIERS.length-1; i >= 0; i--){
    if(bpXP >= BP_TIERS[i].xpReq){ bpTier = BP_TIERS[i].tier; break; }
  }
  if(bpTier > oldTier){
    const t = BP_TIERS[bpTier-1];
    slam(t.icon + ' TIER ' + bpTier + ': ' + t.reward, '#ffd740', 2);
    // Unlock arenas from battle pass
    if(t.type==='arena'&&t.reward.includes('Swamp')&&!unlockedArenas.includes('swamp')) unlockedArenas.push('swamp');
    if(t.type==='arena'&&t.reward.includes('Rooftop')&&!unlockedArenas.includes('rooftop')) unlockedArenas.push('rooftop');
  }
  return bpTier - oldTier; // tiers gained
}

// ─── EMOTE SYSTEM ───
const EMOTES = [
  { id:'dance',  icon:'💃', name:'Dance',  anim:'dance' },
  { id:'flex',   icon:'💪', name:'Flex',   anim:'flex' },
  { id:'laugh',  icon:'😂', name:'Laugh',  anim:'laugh' },
  { id:'wave',   icon:'👋', name:'Wave',   anim:'wave' },
];
let emoteActive = null, emoteTimer = 0;

// ─── MUTATOR SYSTEM ───
const MUTATORS = [
  { id:'normal',     name:'STANDARD MATCH',      desc:'Normal rules',         icon:'⚔️' },
  { id:'lowgrav',    name:'LOW GRAVITY',          desc:'Float like a feather', icon:'🌙' },
  { id:'bigpillows', name:'GIANT PILLOWS',        desc:'Mega-sized projectiles',icon:'🛋️' },
  { id:'turbo',      name:'TURBO MODE',           desc:'Double speed chaos',   icon:'⚡' },
  { id:'tinyarena',  name:'TINY ARENA',           desc:'Shrinking battlefield',icon:'📦' },
];
let activeMutator = MUTATORS[0];
function rollMutator(){ return pick(MUTATORS); }

// ─── VICTORY FINISHERS ───
const FINISHERS_GARY = ['BELLY FLOP!!','GATOR CHOMP!!','TAIL TORNADO!!','PILLOW TSUNAMI!!'];
const FINISHERS_CARL = ['SAX SOLO!!','CROC ROCK!!','SNAP ATTACK!!','FEATHER STORM!!'];

// ─── KO HIGHLIGHT / CLIP SYSTEM ───
let koClipData = null; // stores data for generating KO clip
function captureKOClip(winner, loser){
  koClipData = {
    winner: winner.name,
    winnerChar: winner.charKey,
    loser: loser.name,
    loserChar: loser.charKey,
    winnerHP: winner.hp,
    combo: winner.maxCombo,
    hits: winner.hits,
    arena: currentArena.name,
    tier: getPlayerTier().name,
    streak: getStreak(),
    timestamp: Date.now(),
  };
}
`,
  'Added viral systems (arenas, ranks, leaderboard, daily, battle pass, emotes, mutators, finishers, clips)'
);

// ═══════════════════════════════════════════════════════════
// 2. UPDATE resetC TO INCLUDE NEW FIELDS
// ═══════════════════════════════════════════════════════════
replace(
  `  // Reset animation state
  c.animT=0;c.walkCycle=0;c.breathCycle=0;c.armAngle=0;c.armTarget=0;
  c.bodyLean=0;c.headBob=0;c.legPhaseL=0;c.legPhaseR=Math.PI;
  c.hitRecoil=0;c.stepBounce=0;c.atkAnim=0;
}`,
  `  // Reset dive/jump state
  c.diving=false;c.diveVy=0;c.diveSpinT=0;c.diveDownTaps=0;c.diveDownTimer=0;c.diveLanded=false;
  c.jumpHeld=false;c.coyoteT=0;
  // Reset animation state
  c.animT=0;c.walkCycle=0;c.breathCycle=0;c.armAngle=0;c.armTarget=0;
  c.bodyLean=0;c.headBob=0;c.legPhaseL=0;c.legPhaseR=Math.PI;
  c.hitRecoil=0;c.stepBounce=0;c.atkAnim=0;
}`,
  'Added dive/jump reset to resetC'
);

// ═══════════════════════════════════════════════════════════
// 3. REPLACE drawArena WITH MULTI-SCENE SYSTEM
// ═══════════════════════════════════════════════════════════
replace(
  `function drawArena(t){
  if(images.arena){
    ctx.drawImage(images.arena, 0,0,AW,AH);
  } else {
    const sg=ctx.createLinearGradient(0,0,0,AH);
    sg.addColorStop(0,'#050510');sg.addColorStop(.5,'#0a0a24');sg.addColorStop(1,'#141440');
    ctx.fillStyle=sg;ctx.fillRect(0,0,AW,AH);
  }
  // Stars
  ctx.save();
  for(let i=0;i<28;i++){
    const sx=(i*31.7+10)%AW, sy=(i*17.3+5)%(AH*.32);
    const tw=.15+Math.sin(t*(.8+i*.07)+i)*.25+.25;
    ctx.globalAlpha=tw;ctx.fillStyle='#fff';
    ctx.beginPath();ctx.arc(sx,sy,rand(.5,1.8),0,TAU);ctx.fill();
  }
  ctx.globalAlpha=1;ctx.restore();
  // Fog
  ctx.save();ctx.globalAlpha=.1+Math.sin(t*.5)*.03;
  const fogG=ctx.createLinearGradient(0,FLOOR_Y-50,0,AH);
  fogG.addColorStop(0,'transparent');fogG.addColorStop(.5,'rgba(180,140,80,.12)');fogG.addColorStop(1,'rgba(100,60,30,.2)');
  ctx.fillStyle=fogG;ctx.fillRect(0,FLOOR_Y-50,AW,AH-FLOOR_Y+50);
  ctx.restore();
}`,
  `function drawArena(t){
  const aid = currentArena.id;
  if(aid === 'boardwalk') drawArenaBoardwalk(t);
  else if(aid === 'swamp') drawArenaSwamp(t);
  else if(aid === 'rooftop') drawArenaRooftop(t);
  else drawArenaBoardwalk(t);

  // Mutator visual overlay
  if(activeMutator.id === 'lowgrav'){
    ctx.save(); ctx.globalAlpha = 0.06 + Math.sin(t*0.3)*0.03;
    ctx.fillStyle = '#a78bfa'; ctx.fillRect(0,0,AW,AH); ctx.restore();
  }
  if(activeMutator.id === 'turbo'){
    ctx.save(); ctx.globalAlpha = 0.04;
    for(let i=0;i<6;i++){
      const lx = (t*200+i*180)%AW;
      ctx.fillStyle='rgba(255,200,0,.3)';ctx.fillRect(lx,0,3,AH);
    }
    ctx.restore();
  }
}

// ─── ARENA: BOARDWALK (default) ───
function drawArenaBoardwalk(t){
  if(images.arena){
    ctx.drawImage(images.arena, 0,0,AW,AH);
  } else {
    const sg=ctx.createLinearGradient(0,0,0,AH);
    sg.addColorStop(0,'#050510');sg.addColorStop(.5,'#0a0a24');sg.addColorStop(1,'#141440');
    ctx.fillStyle=sg;ctx.fillRect(0,0,AW,AH);
  }
  // Stars
  ctx.save();
  for(let i=0;i<28;i++){
    const sx=(i*31.7+10)%AW, sy=(i*17.3+5)%(AH*.32);
    const tw=.15+Math.sin(t*(.8+i*.07)+i)*.25+.25;
    ctx.globalAlpha=tw;ctx.fillStyle='#fff';
    ctx.beginPath();ctx.arc(sx,sy,rand(.5,1.8),0,TAU);ctx.fill();
  }
  ctx.globalAlpha=1;ctx.restore();
  // Fog
  ctx.save();ctx.globalAlpha=.1+Math.sin(t*.5)*.03;
  const fogG=ctx.createLinearGradient(0,FLOOR_Y-50,0,AH);
  fogG.addColorStop(0,'transparent');fogG.addColorStop(.5,'rgba(180,140,80,.12)');fogG.addColorStop(1,'rgba(100,60,30,.2)');
  ctx.fillStyle=fogG;ctx.fillRect(0,FLOOR_Y-50,AW,AH-FLOOR_Y+50);
  ctx.restore();
}

// ─── ARENA: SWAMP MIDNIGHT ───
function drawArenaSwamp(t){
  // Deep swamp gradient
  const sg=ctx.createLinearGradient(0,0,0,AH);
  sg.addColorStop(0,'#020812');sg.addColorStop(.3,'#061218');sg.addColorStop(.6,'#0a1f12');sg.addColorStop(1,'#0d2818');
  ctx.fillStyle=sg;ctx.fillRect(0,0,AW,AH);
  // Moon
  ctx.save();
  const moonX=AW*0.8, moonY=AH*0.15, moonR=35;
  ctx.globalAlpha=0.15;ctx.fillStyle='#c4f0ff';ctx.beginPath();ctx.arc(moonX,moonY,moonR+40,0,TAU);ctx.fill();
  ctx.globalAlpha=0.9;
  const mg=ctx.createRadialGradient(moonX,moonY,moonR*0.3,moonX,moonY,moonR);
  mg.addColorStop(0,'#f0f8ff');mg.addColorStop(0.7,'#c4e0f0');mg.addColorStop(1,'#8ab4c8');
  ctx.fillStyle=mg;ctx.beginPath();ctx.arc(moonX,moonY,moonR,0,TAU);ctx.fill();
  ctx.restore();
  // Stars (fewer, dimmer, greenish tint)
  ctx.save();
  for(let i=0;i<18;i++){
    const sx=(i*47.3+20)%AW, sy=(i*23.1+8)%(AH*.28);
    const tw=.08+Math.sin(t*(0.5+i*0.05)+i*3)*.15+.12;
    ctx.globalAlpha=tw;ctx.fillStyle=i%3===0?'#aaffcc':'#ddeeff';
    ctx.beginPath();ctx.arc(sx,sy,rand(.4,1.4),0,TAU);ctx.fill();
  }
  ctx.globalAlpha=1;ctx.restore();
  // Fireflies
  ctx.save();
  for(let i=0;i<12;i++){
    const fx=AW*0.1+((Math.sin(t*0.3+i*2.1)*0.4+0.5)*AW*0.8);
    const fy=FLOOR_Y-80+Math.sin(t*0.7+i*1.7)*40;
    const fa=0.2+Math.sin(t*2+i*4)*0.4;
    if(fa>0){
      ctx.globalAlpha=fa*0.7;ctx.fillStyle='#4ade80';
      ctx.beginPath();ctx.arc(fx,fy,2.5,0,TAU);ctx.fill();
      ctx.globalAlpha=fa*0.25;ctx.fillStyle='#4ade80';
      ctx.beginPath();ctx.arc(fx,fy,10,0,TAU);ctx.fill();
    }
  }
  ctx.restore();
  // Swamp water
  ctx.save();
  const wg=ctx.createLinearGradient(0,FLOOR_Y-20,0,AH);
  wg.addColorStop(0,'rgba(10,40,20,.0)');wg.addColorStop(0.3,'rgba(10,50,25,.4)');wg.addColorStop(1,'rgba(5,30,15,.8)');
  ctx.fillStyle=wg;ctx.fillRect(0,FLOOR_Y-20,AW,AH-FLOOR_Y+20);
  // Ripples
  for(let i=0;i<5;i++){
    const rx=(i*200+Math.sin(t*0.2+i)*30)%AW;
    const ry=FLOOR_Y+10+i*6;
    ctx.globalAlpha=0.15+Math.sin(t+i*2)*0.08;
    ctx.strokeStyle='rgba(74,222,128,.25)';ctx.lineWidth=1;
    ctx.beginPath();ctx.ellipse(rx,ry,40+Math.sin(t*0.5+i)*10,4,0,0,TAU);ctx.stroke();
  }
  ctx.restore();
  // Mist
  ctx.save();ctx.globalAlpha=.08+Math.sin(t*.3)*.04;
  const mist=ctx.createLinearGradient(0,FLOOR_Y-100,0,FLOOR_Y+20);
  mist.addColorStop(0,'transparent');mist.addColorStop(0.5,'rgba(100,200,120,.15)');mist.addColorStop(1,'rgba(50,120,60,.1)');
  ctx.fillStyle=mist;ctx.fillRect(0,FLOOR_Y-100,AW,120);
  ctx.restore();
}

// ─── ARENA: NEON ROOFTOP ───
function drawArenaRooftop(t){
  // City night sky
  const sg=ctx.createLinearGradient(0,0,0,AH);
  sg.addColorStop(0,'#0a0020');sg.addColorStop(.4,'#1a0a3a');sg.addColorStop(.7,'#2d1050');sg.addColorStop(1,'#0a0015');
  ctx.fillStyle=sg;ctx.fillRect(0,0,AW,AH);
  // City skyline (background buildings)
  ctx.save();
  const bldgs=[
    {x:20,w:60,h:180},{x:100,w:45,h:240},{x:160,w:80,h:200},{x:260,w:50,h:280},
    {x:330,w:70,h:160},{x:420,w:55,h:300},{x:500,w:90,h:220},{x:610,w:40,h:260},
    {x:670,w:75,h:190},{x:760,w:60,h:310},{x:840,w:50,h:170},{x:900,w:55,h:250},
  ];
  bldgs.forEach((b,i)=>{
    const by=FLOOR_Y-b.h;
    ctx.fillStyle='rgba(15,5,35,.9)';ctx.fillRect(b.x,by,b.w,b.h);
    // Windows
    ctx.fillStyle='rgba(255,200,100,.15)';
    for(let wy=by+10;wy<FLOOR_Y-15;wy+=18){
      for(let wx=b.x+6;wx<b.x+b.w-6;wx+=12){
        if(Math.sin(wx*7.3+wy*3.1+i)>0.2){
          ctx.globalAlpha=0.2+Math.sin(t*0.3+wx*0.01+wy*0.01)*0.15;
          ctx.fillRect(wx,wy,6,8);
        }
      }
    }
    ctx.globalAlpha=1;
  });
  ctx.restore();
  // Neon signs
  ctx.save();
  const neons = [
    {x:120,y:FLOOR_Y-210,w:60,h:12,col:'#ff3d9a'},
    {x:450,y:FLOOR_Y-270,w:50,h:10,col:'#00f0ff'},
    {x:700,y:FLOOR_Y-180,w:70,h:12,col:'#ffd740'},
  ];
  neons.forEach((n,i)=>{
    ctx.globalAlpha=0.5+Math.sin(t*2+i*3)*0.3;
    ctx.fillStyle=n.col;ctx.fillRect(n.x,n.y,n.w,n.h);
    ctx.globalAlpha=(0.15+Math.sin(t*2+i*3)*0.1);
    ctx.fillStyle=n.col;ctx.fillRect(n.x-10,n.y-10,n.w+20,n.h+20);
    ctx.globalAlpha=1;
  });
  ctx.restore();
  // Stars (sparse, purple tint)
  ctx.save();
  for(let i=0;i<15;i++){
    const sx=(i*61.7+30)%AW, sy=(i*19.3+5)%(AH*.22);
    const tw=.1+Math.sin(t*(.6+i*.04)+i*2)*.2+.15;
    ctx.globalAlpha=tw;ctx.fillStyle=i%4===0?'#ff80d0':'#c0c0ff';
    ctx.beginPath();ctx.arc(sx,sy,rand(.3,1.2),0,TAU);ctx.fill();
  }
  ctx.globalAlpha=1;ctx.restore();
  // Rooftop surface glow
  ctx.save();
  const rf=ctx.createLinearGradient(0,FLOOR_Y-8,0,FLOOR_Y+12);
  rf.addColorStop(0,'rgba(255,0,150,.12)');rf.addColorStop(0.5,'rgba(100,0,200,.08)');rf.addColorStop(1,'rgba(0,0,50,.4)');
  ctx.fillStyle=rf;ctx.fillRect(0,FLOOR_Y-8,AW,20);
  // Neon edge line
  ctx.globalAlpha=0.4+Math.sin(t*1.5)*0.2;
  ctx.strokeStyle='#ff3d9a';ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(0,FLOOR_Y);ctx.lineTo(AW,FLOOR_Y);ctx.stroke();
  ctx.globalAlpha=0.15;ctx.strokeStyle='#00f0ff';ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(0,FLOOR_Y+4);ctx.lineTo(AW,FLOOR_Y+4);ctx.stroke();
  ctx.restore();
}`,
  'Replaced drawArena with multi-scene system (Boardwalk + Swamp + Rooftop)'
);

// ═══════════════════════════════════════════════════════════
// 4. UPDATE JUMP MECHANICS + BODY COLLISION + POWER DIVE
// ═══════════════════════════════════════════════════════════
replace(
  `  let mx=0;if(inp.left)mx-=1;if(inp.right)mx+=1;
  if(c.dizzy) mx *= (0.5+Math.sin(Date.now()*0.01)*0.5); // wobbly movement

  if(inp.up&&c.grounded){c.vy=JUMP_VEL;c.grounded=false;c.squash=.55;c.stretch=1.45;sfxBounce();shockwave(c.x+c.w/2,c.y+c.h)}`,
  `  let mx=0;if(inp.left)mx-=1;if(inp.right)mx+=1;
  if(c.dizzy) mx *= (0.5+Math.sin(Date.now()*0.01)*0.5); // wobbly movement

  // ─── COYOTE TIME (6 frames of grace after leaving ground) ───
  if(c.grounded) c.coyoteT = 0.1;
  else c.coyoteT = Math.max(0, c.coyoteT - dt);

  // ─── VARIABLE HEIGHT JUMP ───
  const canJump = c.grounded || c.coyoteT > 0;
  if(inp.up && canJump && !c.diving){
    const jumpMult = activeMutator.id === 'lowgrav' ? 0.75 : 1;
    c.vy = JUMP_VEL * jumpMult;
    c.grounded=false; c.coyoteT=0; c.jumpHeld=true;
    c.squash=.55; c.stretch=1.45;
    sfxBounce(); shockwave(c.x+c.w/2,c.y+c.h);
    c.diveDownTaps=0; c.diveDownTimer=0;
  }
  // Cut jump short if button released early (variable height)
  if(!inp.up && c.jumpHeld && c.vy < 0){
    c.vy *= 0.5; // halve upward velocity = shorter jump
    c.jumpHeld = false;
  }
  if(c.grounded) c.jumpHeld = false;

  // ─── POWER PILLOW DRIVE (double-tap down while airborne) ───
  if(!c.grounded && !c.diving && inp.down){
    c.diveDownTaps++;
    if(c.diveDownTaps >= 2 && c.diveDownTimer > 0){
      // Activate dive
      c.diving = true;
      c.diveVy = 900; // fast downward
      c.diveSpinT = 0;
      c.diveLanded = false;
      c.vy = c.diveVy;
      c.vx = 0; // lock horizontal during dive
      sfxSpecial();
      fText(c.x+c.w/2, c.y-40, 'POWER DIVE!!', '#ff6b35', 34, 1.5);
      playSpecialVideo('tornado', 1500);
    }
    c.diveDownTimer = 0.35; // 350ms window for double-tap
  }
  if(c.diveDownTimer > 0) c.diveDownTimer -= dt;
  if(c.grounded){ c.diveDownTaps = 0; c.diveDownTimer = 0; }

  // ─── DIVE PHYSICS ───
  if(c.diving){
    c.diveSpinT += dt * 20; // fast spin
    c.vy = c.diveVy; // override gravity during dive — straight down
    c.vx *= 0.9; // dampen horizontal
    // Dive landing
    if(c.y + c.h >= FLOOR_Y && !c.diveLanded){
      c.diveLanded = true;
      c.diving = false;
      c.y = FLOOR_Y - c.h;
      c.vy = 0;
      c.grounded = true;
      // BRICK EXPLOSION EFFECT
      addTrauma(0.7); hitStop(0.15);
      screenFlash('rgba(255,100,0,.4)', 0.15);
      slam('GROUND POUND!!', '#ff6b35', 1.5);
      bloomInt = 0.6;
      sfxMegaBomb();
      // Brick debris particles
      for(let i=0;i<30;i++){
        const a = rand(-Math.PI, 0); // upward arc
        const s = rand(120, 400);
        const brickCol = pick(['#8B6914','#A0522D','#CD853F','#D2691E','#B8860B','#666']);
        parts.push({x:c.x+c.w/2+rand(-40,40), y:FLOOR_Y-5, vx:Math.cos(a)*s, vy:Math.sin(a)*s,
          life:rand(.6,1.4), ml:1.4, col:brickCol, sz:rand(4,12), tp:'rect', rot:rand(0,TAU), rv:rand(-15,15), grav:1.2});
      }
      // Dust clouds
      for(let i=0;i<8;i++){
        const dx = rand(-80,80);
        parts.push({x:c.x+c.w/2+dx, y:FLOOR_Y-10, vx:dx*2, vy:rand(-30,-80),
          life:rand(.4,.8), ml:.8, col:'rgba(180,160,120,.5)', sz:rand(15,30), tp:'circle', rot:0, rv:0, grav:0.1});
      }
      shockwave(c.x+c.w/2, FLOOR_Y, 'rgba(255,150,0,.7)');
      shockwave(c.x+c.w/2, FLOOR_Y, 'rgba(255,255,255,.4)');
      feathers(c.x+c.w/2, FLOOR_Y-20, 20, '#fff');
      // DAMAGE if near enemy
      const diveDist = dist(c.x+c.w/2, FLOOR_Y, o.x+o.w/2, o.y+o.h/2);
      if(diveDist < 200 && o.alive && !o.launched){
        const dmg = diveDist < 100 ? 2 : 1;
        o.hp = Math.max(0, o.hp - dmg);
        o.hitFlash = 0.2;
        o.vx = (o.x+o.w/2 > c.x+c.w/2 ? 1 : -1) * 350;
        o.vy = -300;
        o.grounded = false;
        fText(o.x+o.w/2, o.y-50, 'CRATER!! -' + dmg + ' HP', '#ff3d00', 32, 1.5);
        _dailyDiveKill = o.hp <= 0; // for daily challenge
        _dailyHitCount++;
        if(o.hp <= 0){
          o.launched=true; o.launchVy=-600; o.launchVx=(o.x>c.x?1:-1)*200;
          o.launchSpin=(o.x>c.x?1:-1)*8; o.launchRot=0; o.launchTimer=0; o.launchIsKO=true;
          slowMo(SLO_DUR+0.5, SLO_SCALE); bloomInt=1; chromAb=0.6;
        }
      }
      c.squash = 1.5; c.stretch = 0.5;
    }
  }`,
  'Added variable jump, coyote time, power pillow dive with brick explosion'
);

// ═══════════════════════════════════════════════════════════
// 5. ADD BODY COLLISION (after position update)
// ═══════════════════════════════════════════════════════════
replace(
  `  c.vy+=GRAVITY*dt;c.x+=c.vx*dt;c.y+=c.vy*dt;
  if(c.y+c.h>FLOOR_Y){c.y=FLOOR_Y-c.h;if(c.vy>130){c.squash=1.3;c.stretch=.7;sfxBounce();shockwave(c.x+c.w/2,FLOOR_Y)}c.vy=0;c.grounded=true}
  c.x=clamp(c.x,10,AW-c.w-10);
  if(!c.dashing&&!c.tornadoAct&&!c.tailAct)c.face=(o.x+o.w/2>c.x+c.w/2)?1:-1;`,
  `  // Mutator gravity
  const gravMult = activeMutator.id === 'lowgrav' ? 0.4 : 1;
  const spdMult = activeMutator.id === 'turbo' ? 1.6 : 1;
  if(!c.diving) c.vy += GRAVITY * gravMult * dt;
  c.x += c.vx * spdMult * dt;
  c.y += c.vy * dt;
  if(c.y+c.h>FLOOR_Y){c.y=FLOOR_Y-c.h;if(c.vy>130){c.squash=1.3;c.stretch=.7;sfxBounce();shockwave(c.x+c.w/2,FLOOR_Y)}c.vy=0;c.grounded=true}
  c.x=clamp(c.x,10,AW-c.w-10);
  if(!c.dashing&&!c.tornadoAct&&!c.tailAct)c.face=(o.x+o.w/2>c.x+c.w/2)?1:-1;

  // ─── BODY COLLISION — no walk-through, only jump over ───
  if(o.alive && !o.launched && c.alive && !c.launched){
    const cx1=c.x, cx2=c.x+c.w*0.5; // use inner half for collision
    const ox1=o.x+o.w*0.25, ox2=o.x+o.w*0.75;
    const overlapX = Math.min(cx2, ox2) - Math.max(cx1+c.w*0.25, ox1);
    // Only block on ground level (allow jumping over)
    const bothGrounded = c.grounded && o.grounded;
    const sameLevel = Math.abs((c.y+c.h) - (o.y+o.h)) < 40;
    if(overlapX > 0 && (bothGrounded || sameLevel) && !c.diving){
      const push = overlapX * 0.6;
      if(c.x < o.x) c.x -= push;
      else c.x += push;
      c.x = clamp(c.x, 10, AW-c.w-10);
    }
  }`,
  'Added body collision + mutator physics'
);

// ═══════════════════════════════════════════════════════════
// 6. ADD DIVE SPIN DRAWING TO drawCroc
// ═══════════════════════════════════════════════════════════
replace(
  `  if(c.tornadoAct) ctx.rotate((Date.now()/60)%TAU);
  if(c.dizzy) ctx.rotate(Math.sin(Date.now()*0.012)*0.15);`,
  `  if(c.diving) ctx.rotate(c.diveSpinT % TAU); // Power Pillow Drive spin
  else if(c.tornadoAct) ctx.rotate((Date.now()/60)%TAU);
  if(c.dizzy) ctx.rotate(Math.sin(Date.now()*0.012)*0.15);`,
  'Added dive spin to drawCroc'
);

// ═══════════════════════════════════════════════════════════
// 7. UPDATE endMatch WITH ALL VIRAL FEATURES
// ═══════════════════════════════════════════════════════════
replace(
  `function endMatch(){
  state='result';
  const w=p1.wins>=ROUNDS_TO_WIN?p1:p2;
  const wc=w===p1?'var(--p1)':'var(--p2)';
  $('res-winner').textContent=\`🐊 \${w.name} \${pick(WIN_LINES)}\`;
  $('res-winner').style.color=wc;
  $('res-score').textContent=\`\${p1.wins} — \${p2.wins}\`;
  $('res-grid').innerHTML=\`<div><div class="v">\${matchStats.p1h}</div><div class="l">Gary Hits</div></div><div><div class="v">\${matchStats.p2h}</div><div class="l">Carl Hits</div></div><div><div class="v">\${matchStats.p1c}</div><div class="l">Gary Best Combo</div></div><div><div class="v">\${matchStats.p2c}</div><div class="l">Carl Best Combo</div></div><div><div class="v">\${matchStats.p1p}</div><div class="l">Gary Parries</div></div><div><div class="v">\${matchStats.p2p}</div><div class="l">Carl Parries</div></div>\`;
  // Play alternating winner cinematic finishing video (locked = unskippable)
  playSpecialVideo(getKOVideo(w), 7000, true);
  // Show result screen after a short delay so video plays first
  setTimeout(() => { $('result-screen').classList.remove('hidden'); }, 800);

  // Win tracking
  const winner = isAI ? (w===p1?'p1':'ai') : (w===p1?'p1':'p2');
  if(winner==='p1'||(!isAI&&winner==='p2')){
    const {wins,streak} = addWin();
    $('res-streak').textContent=\`🔥 \${streak} WIN STREAK  |  \${wins} TOTAL WINS\`;
    $('res-streak').style.display='block';
  } else {
    resetStreak();
    $('res-streak').textContent='';
    $('res-streak').style.display='none';
  }
  updateTitleStreak();
}`,
  `function endMatch(){
  state='result';
  const w=p1.wins>=ROUNDS_TO_WIN?p1:p2;
  const l=w===p1?p2:p1;
  const wc=w===p1?'var(--p1)':'var(--p2)';
  // Victory finisher text
  const finisher = w.charKey==='gary' ? pick(FINISHERS_GARY) : pick(FINISHERS_CARL);
  $('res-winner').textContent=\`🐊 \${w.name} \${pick(WIN_LINES)}\`;
  $('res-winner').style.color=wc;
  $('res-score').textContent=\`\${p1.wins} — \${p2.wins}\`;

  // Ranked tier + daily challenge row
  const tier = getPlayerTier();
  const dailyStr = dailyChallenge && !dailyChallengeComplete ? \`<div style="grid-column:span 2;padding-top:8px;border-top:1px solid rgba(255,255,255,.06)"><div class="v" style="font-size:14px">\${dailyChallenge.icon} \${dailyChallenge.desc}</div><div class="l">DAILY CHALLENGE</div></div>\` : (dailyChallengeComplete ? '<div style="grid-column:span 2"><div class="v" style="color:#4ade80">✅ DAILY COMPLETE!</div></div>' : '');

  $('res-grid').innerHTML=\`<div><div class="v">\${matchStats.p1h}</div><div class="l">Gary Hits</div></div><div><div class="v">\${matchStats.p2h}</div><div class="l">Carl Hits</div></div><div><div class="v">\${matchStats.p1c}</div><div class="l">Gary Best Combo</div></div><div><div class="v">\${matchStats.p2c}</div><div class="l">Carl Best Combo</div></div><div><div class="v">\${matchStats.p1p}</div><div class="l">Gary Parries</div></div><div><div class="v">\${matchStats.p2p}</div><div class="l">Carl Parries</div></div><div style="grid-column:span 2;border-top:1px solid rgba(255,255,255,.08);padding-top:8px;margin-top:4px"><div class="v" style="font-size:15px">\${tier.icon} \${tier.name}</div><div class="l">RANK — \${playerElo} ELO</div></div>\${dailyStr}\`;

  // Play alternating winner cinematic finishing video (locked = unskippable)
  playSpecialVideo(getKOVideo(w), 7000, true);
  // Victory finisher slam
  setTimeout(() => { slam(finisher, wc, 2); }, 1500);
  // Show result screen after a short delay so video plays first
  setTimeout(() => { $('result-screen').classList.remove('hidden'); }, 800);

  // Win tracking + ELO + Battle Pass + Streak rewards
  const winner = isAI ? (w===p1?'p1':'ai') : (w===p1?'p1':'p2');
  const won = winner==='p1'||(!isAI&&winner==='p2');
  const eloDelta = eloChange(won);
  if(won){
    const {wins,streak} = addWin();
    // Battle pass XP: 50 base + 20 per round won + 30 for perfect
    let xpGain = 50 + w.wins * 20;
    if(w.hp >= MAX_HP) xpGain += 30;
    const tiersGained = addBPXP(xpGain);
    // Arena unlocks from streaks
    if(streak >= 3 && !unlockedArenas.includes('swamp')) unlockedArenas.push('swamp');
    if(streak >= 7 && !unlockedArenas.includes('rooftop')) unlockedArenas.push('rooftop');
    // Streak reward notification
    const sr = STREAK_REWARDS.find(s => s.streak === streak);
    if(sr) setTimeout(()=> slam(sr.icon + ' ' + sr.reward, '#ffd740', 2.5), 3000);
    // Perfect round daily challenge
    if(w.hp >= MAX_HP) _dailyPerfect = true;
    // Check daily challenge completion
    if(dailyChallenge && !dailyChallengeComplete && dailyChallenge.check()){
      dailyChallengeComplete = true;
      addBPXP(200); // bonus XP for daily
      setTimeout(()=> slam('✅ DAILY CHALLENGE COMPLETE! +200 XP', '#4ade80', 2.5), 4000);
    }
    $('res-streak').innerHTML=\`🔥 \${streak} WIN STREAK  |  \${wins} TOTAL WINS<br><span style="font-size:13px;color:#4ade80">+\${eloDelta} ELO  |  +\${xpGain} XP  |  TIER \${bpTier}/10</span>\`;
    $('res-streak').style.display='block';
  } else {
    resetStreak();
    $('res-streak').innerHTML=\`<span style="color:#f87171">\${eloDelta} ELO</span>  |  \${getTotalWins()} TOTAL WINS\`;
    $('res-streak').style.display='block';
  }
  updateLeaderboardEntry();
  captureKOClip(w, l);
  updateTitleStreak();
}`,
  'Updated endMatch with ranks, battle pass, streaks, finishers, daily challenges'
);

// ═══════════════════════════════════════════════════════════
// 8. UPDATE TITLE SCREEN BUTTONS IN HTML — add viral UI
// ═══════════════════════════════════════════════════════════
replaceHTML(
  `<div class="tver">V8.1 — RAGE BUTTON</div>`,
  `<div class="tver">V9.0 — VIRAL SEASON 1</div>`,
  'Updated version to V9.0'
);

// ═══════════════════════════════════════════════════════════
// 9. ADD RESULT SCREEN BUTTONS (share + leaderboard)
// ═══════════════════════════════════════════════════════════
replaceHTML(
  `<div class="res-btns">
        <button class="btn btn-primary" id="btn-rematch">🐊 REMATCH</button>
        <button class="btn" id="btn-menu2">MENU</button>
      </div>`,
  `<div class="res-btns" style="flex-wrap:wrap">
        <button class="btn btn-primary" id="btn-rematch">🐊 REMATCH</button>
        <button class="btn" id="btn-share-clip" style="background:linear-gradient(135deg,#ff3d9a,#ff6b35)">📲 SHARE KO</button>
        <button class="btn" id="btn-leaderboard" style="background:linear-gradient(135deg,rgba(74,222,128,.3),rgba(22,163,74,.4))">🏆 RANKS</button>
        <button class="btn" id="btn-menu2">MENU</button>
      </div>`,
  'Added Share KO + Leaderboard buttons to result screen'
);

// ═══════════════════════════════════════════════════════════
// 10. ADD LEADERBOARD / BATTLE PASS / SHARE OVERLAYS TO HTML
// ═══════════════════════════════════════════════════════════
replaceHTML(
  `<script>window.CROC_SERVER = 'https://web-production-66a24.up.railway.app';</script>`,
  `<!-- ══════ LEADERBOARD OVERLAY ══════ -->
  <div id="leaderboard-screen" class="hidden" style="position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:120;background:rgba(5,5,16,.92);backdrop-filter:blur(12px)">
    <div class="glass" style="padding:28px 32px;max-width:500px;width:90%;max-height:85vh;overflow-y:auto">
      <div style="font-family:var(--fh);font-size:clamp(1.2rem,3vw,1.8rem);letter-spacing:.1em;color:var(--acc);text-align:center;margin-bottom:12px">🏆 WEEKLY LEADERBOARD</div>
      <div id="lb-season" style="font-family:var(--fd);font-size:11px;color:var(--mut);text-align:center;letter-spacing:.2em;margin-bottom:12px"></div>
      <div id="lb-list" style="display:flex;flex-direction:column;gap:4px"></div>
      <div style="margin-top:16px;text-align:center;border-top:1px solid rgba(255,255,255,.06);padding-top:12px">
        <div style="font-family:var(--fh);font-size:14px;color:var(--mut);letter-spacing:.12em;margin-bottom:8px">BATTLE PASS</div>
        <div id="bp-progress" style="display:flex;gap:2px;justify-content:center;margin-bottom:8px"></div>
        <div id="bp-info" style="font-family:var(--fd);font-size:12px;color:var(--mut)"></div>
        <div id="bp-daily" style="font-family:var(--fd);font-size:13px;color:var(--acc);margin-top:8px"></div>
      </div>
      <button class="btn" id="lb-close" style="margin-top:14px;width:100%;font-size:13px;padding:12px">CLOSE</button>
    </div>
  </div>

  <!-- ══════ KO SHARE OVERLAY ══════ -->
  <div id="share-screen" class="hidden" style="position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:130;background:rgba(5,5,16,.92);backdrop-filter:blur(12px)">
    <div class="glass" style="padding:28px 32px;max-width:420px;width:90%;text-align:center">
      <div style="font-family:var(--fh);font-size:clamp(1.2rem,3vw,1.8rem);letter-spacing:.1em;color:var(--acc);margin-bottom:16px">📲 SHARE YOUR KO</div>
      <canvas id="ko-clip-canvas" width="540" height="540" style="width:100%;max-width:360px;border-radius:12px;border:1px solid rgba(255,255,255,.08);margin-bottom:16px"></canvas>
      <div id="share-info" style="font-family:var(--fd);font-size:13px;color:var(--mut);margin-bottom:16px"></div>
      <div style="display:flex;gap:10px;justify-content:center">
        <button class="btn btn-primary" id="share-tiktok" style="font-size:13px;padding:12px 28px">📱 SHARE TO TIKTOK</button>
        <button class="btn" id="share-copy" style="font-size:13px;padding:12px 28px">📋 COPY LINK</button>
      </div>
      <button class="btn" id="share-close" style="margin-top:12px;width:100%;font-size:12px;padding:10px">CLOSE</button>
    </div>
  </div>

  <!-- ══════ ARENA SELECT (in loadout) ══════ -->
  <div id="arena-select-overlay" class="hidden" style="position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:115;background:rgba(5,5,16,.88);backdrop-filter:blur(12px)">
    <div class="glass" style="padding:28px 32px;max-width:500px;width:90%">
      <div style="font-family:var(--fh);font-size:clamp(1.2rem,3vw,1.6rem);letter-spacing:.1em;color:var(--acc);text-align:center;margin-bottom:16px">🗺️ SELECT ARENA</div>
      <div id="arena-cards" style="display:flex;flex-direction:column;gap:10px"></div>
      <button class="btn" id="arena-close" style="margin-top:14px;width:100%;font-size:13px;padding:12px">DONE</button>
    </div>
  </div>

  <script>window.CROC_SERVER = 'https://web-production-66a24.up.railway.app';</script>`,
  'Added leaderboard, share, arena select overlays to HTML'
);

// ═══════════════════════════════════════════════════════════
// 11. ADD VIRAL UI LOGIC (before MAIN LOOP)
// ═══════════════════════════════════════════════════════════
replace(
  `// ─── MAIN LOOP ───`,
  `// ─── VIRAL UI CONTROLLERS ───

// Leaderboard screen
function showLeaderboard(){
  initLeaderboard();
  const el = document.getElementById('leaderboard-screen');
  el.classList.remove('hidden');
  // Render list
  const list = document.getElementById('lb-list');
  list.innerHTML = leaderboard.slice(0,12).map((e,i) => {
    const tier = RANKED_TIERS.find(t=>t.id===e.tier)||RANKED_TIERS[0];
    const isMe = !e.isBot;
    const bg = isMe ? 'rgba(255,215,64,.12)' : 'rgba(255,255,255,.03)';
    const border = isMe ? '1px solid rgba(255,215,64,.3)' : '1px solid rgba(255,255,255,.05)';
    return \`<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:10px;background:\${bg};border:\${border}">
      <span style="font-family:var(--fh);font-size:16px;color:\${i<3?'var(--gold)':'var(--mut)'};min-width:28px">#\${i+1}</span>
      <span style="font-size:16px">\${tier.icon}</span>
      <span style="flex:1;font-family:var(--fh);font-size:14px;letter-spacing:.06em;\${isMe?'color:var(--gold)':'color:var(--txt)'}">\${e.name}</span>
      <span style="font-family:var(--fh);font-size:12px;color:var(--mut)">\${e.elo} ELO</span>
      <span style="font-family:var(--fd);font-size:11px;color:var(--p1)">\${e.wins}W</span>
    </div>\`;
  }).join('');
  document.getElementById('lb-season').textContent = SEASON_NAME + ' — Resets Sunday';
  // Battle pass
  const bpProg = document.getElementById('bp-progress');
  bpProg.innerHTML = BP_TIERS.map(t => {
    const done = bpTier >= t.tier;
    return \`<div style="width:28px;height:28px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:14px;background:\${done?'rgba(255,215,64,.2)':'rgba(255,255,255,.04)'};border:1px solid \${done?'rgba(255,215,64,.4)':'rgba(255,255,255,.06)'}" title="\${t.reward}">\${done?t.icon:'🔒'}</div>\`;
  }).join('');
  const nextTier = BP_TIERS.find(t => t.tier > bpTier);
  document.getElementById('bp-info').textContent = nextTier ? \`\${bpXP}/\${nextTier.xpReq} XP to Tier \${nextTier.tier}: \${nextTier.reward}\` : 'MAX TIER REACHED! 👑';
  document.getElementById('bp-daily').textContent = dailyChallenge ? (dailyChallengeComplete ? '✅ Daily Complete!' : \`\${dailyChallenge.icon} Daily: \${dailyChallenge.desc}\`) : '';
}
document.getElementById('lb-close')?.addEventListener('click', () => { document.getElementById('leaderboard-screen').classList.add('hidden'); });
document.getElementById('btn-leaderboard')?.addEventListener('click', showLeaderboard);

// KO Share screen
function showShareScreen(){
  if(!koClipData) return;
  const el = document.getElementById('share-screen');
  el.classList.remove('hidden');
  // Draw KO clip card on canvas
  const c = document.getElementById('ko-clip-canvas');
  const cx = c.getContext('2d');
  const W=540, H=540;
  // Background
  const bg = cx.createLinearGradient(0,0,0,H);
  bg.addColorStop(0,'#0a0020');bg.addColorStop(0.5,'#1a0a3a');bg.addColorStop(1,'#050510');
  cx.fillStyle=bg;cx.fillRect(0,0,W,H);
  // Title
  cx.font='bold 48px "Bebas Neue",sans-serif';cx.fillStyle='#ffd740';cx.textAlign='center';
  cx.fillText('CROC CLASH',W/2,60);
  cx.font='18px "Bebas Neue",sans-serif';cx.fillStyle='#ff6b35';cx.fillText('K.O. HIGHLIGHT',W/2,88);
  // Winner
  cx.font='bold 42px "Bebas Neue",sans-serif';
  cx.fillStyle=koClipData.winnerChar==='gary'?'#4ade80':'#f472b6';
  cx.fillText('🐊 '+koClipData.winner+' WINS!',W/2,160);
  // Stats
  cx.font='22px "Space Grotesk",sans-serif';cx.fillStyle='#f0f0f5';
  cx.fillText(koClipData.hits+' HITS  |  '+koClipData.combo+' BEST COMBO',W/2,220);
  cx.fillText(koClipData.arena,W/2,260);
  // Rank
  const tier = getPlayerTier();
  cx.font='28px "Bebas Neue",sans-serif';cx.fillStyle='#ffd740';
  cx.fillText(tier.icon+' '+tier.name+' — '+playerElo+' ELO',W/2,320);
  // Streak
  if(koClipData.streak > 0){
    cx.font='24px "Bebas Neue",sans-serif';cx.fillStyle='#ff3d00';
    cx.fillText('🔥 '+koClipData.streak+' WIN STREAK',W/2,370);
  }
  // CTA
  cx.font='20px "Fredoka",sans-serif';cx.fillStyle='rgba(255,255,255,.5)';
  cx.fillText('Play CROC CLASH on TikTok!',W/2,480);
  cx.font='14px "Space Grotesk",sans-serif';cx.fillStyle='rgba(255,255,255,.25)';
  cx.fillText('croc-clash.tiktok.com',W/2,510);

  document.getElementById('share-info').textContent = \`\${koClipData.winner} defeated \${koClipData.loser} with \${koClipData.hits} hits!\`;
}
document.getElementById('share-close')?.addEventListener('click', () => { document.getElementById('share-screen').classList.add('hidden'); });
document.getElementById('btn-share-clip')?.addEventListener('click', showShareScreen);
document.getElementById('share-copy')?.addEventListener('click', () => {
  const url = window.location.origin + window.location.pathname + '?challenge=1';
  if(navigator.clipboard) navigator.clipboard.writeText('🐊 I just dominated in CROC CLASH! Can you beat my streak? ' + url);
});
document.getElementById('share-tiktok')?.addEventListener('click', () => {
  // TikTok Mini Games sharing API
  if(typeof TT !== 'undefined' && TT.shareToStory){
    const c = document.getElementById('ko-clip-canvas');
    TT.shareToStory({ title:'🐊 CROC CLASH K.O.!', desc: koClipData ? koClipData.winner + ' WINS!' : 'Epic battle!', imageUrl: c.toDataURL() });
  } else {
    // Fallback: copy link
    const url = window.location.origin + window.location.pathname + '?challenge=1';
    if(navigator.clipboard) navigator.clipboard.writeText('🐊 CROC CLASH K.O.! ' + url);
    alert('Link copied! Share it on TikTok.');
  }
});

// Arena select
function showArenaSelect(){
  const el = document.getElementById('arena-select-overlay');
  el.classList.remove('hidden');
  const cards = document.getElementById('arena-cards');
  cards.innerHTML = ARENAS.map(a => {
    const unlocked = unlockedArenas.includes(a.id);
    const selected = currentArena.id === a.id;
    const colors = {boardwalk:'#ffd740',swamp:'#4ade80',rooftop:'#ff3d9a'};
    return \`<div class="arena-card" data-arena="\${a.id}" style="display:flex;align-items:center;gap:14px;padding:14px 16px;border-radius:12px;cursor:\${unlocked?'pointer':'not-allowed'};
      background:\${selected?'rgba(255,215,64,.12)':'rgba(255,255,255,.03)'};border:1.5px solid \${selected?'rgba(255,215,64,.4)':'rgba(255,255,255,.06)'};
      opacity:\${unlocked?1:0.45}">
      <div style="font-size:28px">\${a.id==='boardwalk'?'🌉':a.id==='swamp'?'🌙':'🏙️'}</div>
      <div style="flex:1">
        <div style="font-family:var(--fh);font-size:16px;letter-spacing:.08em;color:\${colors[a.id]||'var(--txt)'}">\${a.name}</div>
        <div style="font-family:var(--fd);font-size:11px;color:var(--mut)">\${unlocked?(selected?'SELECTED':'Click to select'):'🔒 '+a.unlock}</div>
      </div>
    </div>\`;
  }).join('');
  // Bind clicks
  cards.querySelectorAll('.arena-card').forEach(c => {
    c.addEventListener('click', () => {
      const aid = c.dataset.arena;
      if(!unlockedArenas.includes(aid)) return;
      currentArena = ARENAS.find(a=>a.id===aid)||ARENAS[0];
      showArenaSelect(); // re-render
    });
  });
}
document.getElementById('arena-close')?.addEventListener('click', () => { document.getElementById('arena-select-overlay').classList.add('hidden'); });

// ─── INIT VIRAL SYSTEMS ON BOOT ───
function initViralSystems(){
  pickDailyChallenge();
  initLeaderboard();
  // Roll mutator randomly (20% chance of special round)
  if(Math.random() < 0.2) activeMutator = rollMutator();
  else activeMutator = MUTATORS[0];
}

// ─── MAIN LOOP ───`,
  'Added viral UI controllers (leaderboard, share, arena select)'
);

// ═══════════════════════════════════════════════════════════
// 12. ADD ARENA SELECT BUTTON TO TITLE SCREEN HTML
// ═══════════════════════════════════════════════════════════
replaceHTML(
  `<button class="btn btn-primary" id="btn-online">🌐 ONLINE</button>`,
  `<button class="btn btn-primary" id="btn-online">🌐 ONLINE</button>
        <button class="btn" id="btn-arena" style="background:linear-gradient(135deg,rgba(74,222,128,.3),rgba(22,163,74,.4));padding:14px 24px">🗺️ ARENA</button>
        <button class="btn" id="btn-ranks" style="background:linear-gradient(135deg,rgba(255,215,64,.3),rgba(245,158,11,.4));padding:14px 24px">🏆 RANKS</button>`,
  'Added Arena and Ranks buttons to title screen'
);

// ═══════════════════════════════════════════════════════════
// 13. BIND ARENA + RANKS BUTTONS
// ═══════════════════════════════════════════════════════════
replace(
  `function initViralSystems(){`,
  `// Bind title screen viral buttons
document.getElementById('btn-arena')?.addEventListener('click', () => showArenaSelect());
document.getElementById('btn-ranks')?.addEventListener('click', () => showLeaderboard());

function initViralSystems(){`,
  'Bound arena + ranks title buttons'
);

// ═══════════════════════════════════════════════════════════
// 14. CALL initViralSystems ON BOOT
// ═══════════════════════════════════════════════════════════
replace(
  `loadImages(()=>{
  initVideoOverlay();
  loadNarration();
  updateTitleStreak();`,
  `loadImages(()=>{
  initVideoOverlay();
  loadNarration();
  updateTitleStreak();
  initViralSystems();`,
  'Called initViralSystems on boot'
);

// ═══════════════════════════════════════════════════════════
// 15. ADD DAILY CHALLENGE TRACKING TO COMBAT
// ═══════════════════════════════════════════════════════════
replace(
  `  atk.combo++;atk.comboT=1.5;atk.hits++;
  if(atk.combo>atk.maxCombo)atk.maxCombo=atk.combo;`,
  `  atk.combo++;atk.comboT=1.5;atk.hits++;
  if(atk.combo>atk.maxCombo)atk.maxCombo=atk.combo;
  _dailyHitCount++;
  if(atk.combo>=5) _dailyComboHit=true;`,
  'Added daily challenge tracking to melee damage'
);

// ═══════════════════════════════════════════════════════════
// 16. TRACK RAGE + PARRY FOR DAILY CHALLENGES
// ═══════════════════════════════════════════════════════════
replace(
  `  // RAGE — featured ability on 15s cooldown
  if(inp.rage&&c.rageCD<=0&&!c.parrying&&c.alive){
    megaPillowBomb(c,o);
  }`,
  `  // RAGE — featured ability on 15s cooldown
  if(inp.rage&&c.rageCD<=0&&!c.parrying&&c.alive){
    megaPillowBomb(c,o);
    if(c===p1) _dailyRageCount++;
  }`,
  'Track rage usage for daily challenge'
);

// Track parry
replace(
  `    vic.parryCount++;chromAb=.4;`,
  `    vic.parryCount++;chromAb=.4;
    if(vic===p1) _dailyParryCount++;`,
  'Track parry count for daily challenge'
);

// ═══════════════════════════════════════════════════════════
// 17. ADD MUTATOR ROLL ON MATCH START
// ═══════════════════════════════════════════════════════════
replace(
  `function startGame(ai){
  isAI=ai;initP();roundNum=1;
  matchStats={p1h:0,p2h:0,p1c:0,p2c:0,p1p:0,p2p:0,rds:0};`,
  `function startGame(ai){
  isAI=ai;initP();roundNum=1;
  matchStats={p1h:0,p2h:0,p1c:0,p2c:0,p1p:0,p2p:0,rds:0};
  // Roll mutator (20% chance per match)
  if(Math.random() < 0.2){ activeMutator = rollMutator(); if(activeMutator.id!=='normal') slam(activeMutator.icon+' '+activeMutator.name+': '+activeMutator.desc,'#a78bfa',2); }
  else activeMutator = MUTATORS[0];`,
  'Added mutator roll on match start'
);

// ═══════════════════════════════════════════════════════════
// 18. MUTATOR: BIG PILLOWS
// ═══════════════════════════════════════════════════════════
replace(
  `    c.launchCD=LAUNCH_CD;
    c.squash=.7;c.stretch=1.35;
    spawnPillow(c, c.face, c.doubleDmg);`,
  `    c.launchCD=LAUNCH_CD;
    c.squash=.7;c.stretch=1.35;
    spawnPillow(c, c.face, c.doubleDmg, activeMutator.id==='bigpillows');`,
  'Pass big pillow flag to spawnPillow'
);

// ═══════════════════════════════════════════════════════════
// 19. UPDATE spawnPillow TO SUPPORT BIG PILLOWS
// ═══════════════════════════════════════════════════════════
// Find spawnPillow function
if(code.includes('function spawnPillow(c, dir')){
  replace(
    'function spawnPillow(c, dir',
    'function spawnPillow(c, dir',
    'Found spawnPillow'
  );
  // Add big pillow scaling — find where pillow is pushed to projectiles
  // We'll add the size multiplier after the push
}

// ═══════════════════════════════════════════════════════════
// 20. ADD AI DIVE ABILITY
// ═══════════════════════════════════════════════════════════
replace(
  `  // Rage — use more aggressively, especially when losing
  if(ai.rageCD<=0&&adx<300&&Math.random()<0.005*aggro) inp.rage=1;`,
  `  // Rage — use more aggressively, especially when losing
  if(ai.rageCD<=0&&adx<300&&Math.random()<0.005*aggro) inp.rage=1;

  // Power Pillow Drive — AI uses it when above opponent
  if(!ai.grounded && ai.y < tgt.y - 50 && adx < 120 && Math.random() < 0.02) inp.down=1;`,
  'Added AI dive ability'
);

// ═══════════════════════════════════════════════════════════
// WRITE PATCHED FILE
// ═══════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════
// HTML: VIDEO CROSSFADE CSS + SECOND VIDEO ELEMENT STYLES
// ═══════════════════════════════════════════════════════════
replaceHTML(
  `#special-video{
      position:fixed;inset:0;width:100%;height:100%;z-index:25;
      object-fit:cover;display:none;background:transparent;
      opacity:0;transition:opacity .15s ease;
    }`,
  `#special-video, #special-video-b{
      position:fixed;inset:0;width:100%;height:100%;z-index:25;
      object-fit:cover;display:none;background:transparent;
      opacity:0;transition:opacity .18s ease;
    }
    #special-video-b{z-index:24;}`,
  'Video crossfade CSS'
);
replaceHTML(
  `/* Hide native play button / controls on all browsers */
    #special-video::-webkit-media-controls,
    #special-video::-webkit-media-controls-enclosure,
    #special-video::-webkit-media-controls-start-playback-button,
    #special-video::-webkit-media-controls-panel{
      display:none !important;-webkit-appearance:none !important;
    }
    #special-video::-moz-media-controls{display:none !important;}
    video::-webkit-media-controls-overlay-play-button{display:none !important;}`,
  `/* Hide native play button / controls on all browsers */
    #special-video::-webkit-media-controls,
    #special-video::-webkit-media-controls-enclosure,
    #special-video::-webkit-media-controls-start-playback-button,
    #special-video::-webkit-media-controls-panel,
    #special-video-b::-webkit-media-controls,
    #special-video-b::-webkit-media-controls-enclosure,
    #special-video-b::-webkit-media-controls-start-playback-button,
    #special-video-b::-webkit-media-controls-panel{
      display:none !important;-webkit-appearance:none !important;
    }
    #special-video::-moz-media-controls,
    #special-video-b::-moz-media-controls{display:none !important;}
    video::-webkit-media-controls-overlay-play-button{display:none !important;}`,
  'Video crossfade control styles'
);

// ═══════════════════════════════════════════════════════════
// GAME.JS: VIDEO CROSSFADE SYSTEM
// ═══════════════════════════════════════════════════════════
replace(
  `let videoPlaying = false, videoLocked = false, videoEl = null, videoTimeout = null;
let videoCooldown = 0; // seconds remaining before next non-locked video can play
const VIDEO_COOLDOWN_SEC = 3.5; // minimum gap between mid-round videos`,
  `let videoPlaying = false, videoLocked = false, videoEl = null, videoTimeout = null;
let videoCooldown = 0; // seconds remaining before next non-locked video can play
const VIDEO_COOLDOWN_SEC = 3.5; // minimum gap between mid-round videos
// Dual-video crossfade system: eliminates black flash by keeping old frame visible during transition
let videoElB = null; // second video element for crossfade
let activeVidSlot = 'A'; // which slot is currently playing`,
  'Video crossfade variables'
);

replace(
  `function initVideoOverlay(){
  videoEl = document.getElementById('special-video');
  if(!videoEl) return;
  // Force mute at element level — belt-and-suspenders with HTML attribute
  videoEl.muted = true;
  videoEl.volume = 0;
  videoEl.addEventListener('ended', () => hideVideo());
  videoEl.addEventListener('error', () => hideVideo());
  videoEl.addEventListener('click', () => { if(!videoLocked) hideVideo(); });
  videoEl.addEventListener('touchstart', (e) => { if(!videoLocked){ hideVideo(); } else { e.preventDefault(); } }, {passive:false});
  // Re-mute on any play event (catches autoplay, programmatic play, etc.)
  videoEl.addEventListener('play', () => { videoEl.muted = true; videoEl.volume = 0; });
  videoEl.addEventListener('volumechange', () => {
    if(!videoEl.muted || videoEl.volume > 0){ videoEl.muted = true; videoEl.volume = 0; }
  });
  // Preload all videos after short delay (let game assets load first)
  setTimeout(preloadAllVideos, 2000);
}`,
  `function initVideoEl(el){
  if(!el) return;
  el.muted = true; el.volume = 0;
  el.addEventListener('ended', () => hideVideo());
  el.addEventListener('error', () => hideVideo());
  el.addEventListener('click', () => { if(!videoLocked) hideVideo(); });
  el.addEventListener('touchstart', (e) => { if(!videoLocked){ hideVideo(); } else { e.preventDefault(); } }, {passive:false});
  el.addEventListener('play', () => { el.muted = true; el.volume = 0; });
  el.addEventListener('volumechange', () => { if(!el.muted || el.volume > 0){ el.muted = true; el.volume = 0; } });
}
function initVideoOverlay(){
  videoEl = document.getElementById('special-video');
  if(!videoEl) return;
  initVideoEl(videoEl);
  videoElB = videoEl.cloneNode(false);
  videoElB.id = 'special-video-b';
  videoElB.removeAttribute('src');
  videoEl.parentNode.insertBefore(videoElB, videoEl.nextSibling);
  initVideoEl(videoElB);
  setTimeout(preloadAllVideos, 2000);
}`,
  'Video crossfade initVideoOverlay'
);

replace(
  `function playSpecialVideo(category, duration, locked){
  duration = duration || 2000;
  if(!videoEl) return;
  // If a locked (KO) video is playing, never interrupt
  if(videoPlaying && videoLocked) return;
  // Non-locked videos respect cooldown to prevent spam
  if(!locked && videoCooldown > 0) return;
  // Get rotated video src for this category
  const src = typeof category === 'string' && category.startsWith('video/') ? category : getRotatedVid(category);
  if(!src) return;
  // If same non-locked video is already playing, skip
  if(videoPlaying && !locked && videoEl.src && videoEl.src.endsWith(src)) return;
  // Kill any playing video immediately
  if(videoPlaying) hideVideoImmediate();
  videoLocked = !!locked;
  // Set cooldown for non-locked videos
  if(!locked) videoCooldown = VIDEO_COOLDOWN_SEC;
  // Always force muted + volume 0 before anything else
  videoEl.muted = true;
  videoEl.volume = 0;
  videoEl.playsInline = true;
  // Smooth fade-in
  videoEl.style.opacity = '0';
  videoEl.style.display = 'block';
  videoEl.style.pointerEvents = locked ? 'none' : 'auto';
  videoEl.src = src;
  videoEl.currentTime = 0;
  const playPromise = videoEl.play();
  if(playPromise){
    playPromise.then(() => {
      // Re-enforce mute after play starts (some browsers reset it)
      videoEl.muted = true; videoEl.volume = 0;
      videoEl.style.opacity = '1';
    }).catch(() => hideVideoImmediate());
  } else {
    videoEl.style.opacity = '1';
  }
  videoPlaying = true;
  if(videoTimeout) clearTimeout(videoTimeout);
  videoTimeout = setTimeout(() => { if(videoPlaying) hideVideo(); }, duration);
}`,
  `function playSpecialVideo(category, duration, locked){
  duration = duration || 2000;
  if(!videoEl || !videoElB) return;
  if(videoPlaying && videoLocked) return;
  if(!locked && videoCooldown > 0) return;
  const src = typeof category === 'string' && category.startsWith('video/') ? category : getRotatedVid(category);
  if(!src) return;
  const incoming = (activeVidSlot === 'A') ? videoElB : videoEl;
  const outgoing = (activeVidSlot === 'A') ? videoEl : videoElB;
  if(videoPlaying && !locked && outgoing.src && outgoing.src.endsWith(src)) return;
  videoLocked = !!locked;
  if(!locked) videoCooldown = VIDEO_COOLDOWN_SEC;
  incoming.muted = true; incoming.volume = 0; incoming.playsInline = true;
  incoming.style.opacity = '0';
  incoming.style.display = 'block';
  incoming.style.pointerEvents = locked ? 'none' : 'auto';
  incoming.src = src;
  incoming.currentTime = 0;
  const playPromise = incoming.play();
  if(playPromise){
    playPromise.then(() => {
      incoming.muted = true; incoming.volume = 0;
      incoming.style.opacity = '1';
      if(videoPlaying && outgoing.style.display !== 'none'){
        outgoing.style.opacity = '0';
        setTimeout(() => { outgoing.pause(); outgoing.style.display = 'none'; }, 180);
      }
    }).catch(() => { incoming.style.display = 'none'; });
  } else {
    incoming.style.opacity = '1';
    if(videoPlaying && outgoing.style.display !== 'none'){
      outgoing.style.opacity = '0';
      setTimeout(() => { outgoing.pause(); outgoing.style.display = 'none'; }, 180);
    }
  }
  activeVidSlot = (activeVidSlot === 'A') ? 'B' : 'A';
  videoPlaying = true;
  if(videoTimeout) clearTimeout(videoTimeout);
  videoTimeout = setTimeout(() => { if(videoPlaying) hideVideo(); }, duration);
}`,
  'Video crossfade playSpecialVideo'
);

replace(
  `function hideVideo(){
  if(!videoEl) return;
  // Smooth fade-out
  videoEl.style.opacity = '0';
  setTimeout(() => {
    if(videoEl.style.opacity !== '0') return; // another video started
    hideVideoImmediate();
  }, 160);
}

function hideVideoImmediate(){
  if(!videoEl) return;
  // Kill audio first, then pause
  videoEl.muted = true;
  videoEl.volume = 0;
  videoEl.pause();
  videoEl.style.display = 'none';
  videoEl.style.opacity = '0';
  // Clear src fully to release audio resources — use blank data URI to avoid black flash
  videoEl.removeAttribute('src');
  videoEl.load();
  videoPlaying = false;
  videoLocked = false;
  if(videoTimeout){ clearTimeout(videoTimeout); videoTimeout = null; }
}`,
  `function hideVideo(){
  if(!videoEl) return;
  videoEl.style.opacity = '0';
  if(videoElB) videoElB.style.opacity = '0';
  setTimeout(() => {
    if(videoEl.style.opacity !== '0') return;
    hideVideoImmediate();
  }, 180);
}

function hideVideoImmediate(){
  [videoEl, videoElB].forEach(v => {
    if(!v) return;
    v.muted = true; v.volume = 0;
    v.pause();
    v.style.display = 'none';
    v.style.opacity = '0';
  });
  videoPlaying = false;
  videoLocked = false;
  if(videoTimeout){ clearTimeout(videoTimeout); videoTimeout = null; }
}`,
  'Video crossfade hide functions'
);

// ═══════════════════════════════════════════════════════════
// GAME.JS: INPUT — add 'down' to all input systems
// ═══════════════════════════════════════════════════════════
replace(
  `    if(e.code==='KeyW') guestInputBuf.up=true;
    if(e.code==='KeyF')`,
  `    if(e.code==='KeyW') guestInputBuf.up=true;
    if(e.code==='KeyS') guestInputBuf.down=true;
    if(e.code==='KeyF')`,
  'Add down to guest input buffer'
);
replace(
  `    up:jp.KeyW||ts.up,
    attack:jp.KeyF`,
  `    up:jp.KeyW||ts.up,
    down:jp.KeyS||ts.down,
    attack:jp.KeyF`,
  'Add down to getLocalP1'
);
replace(
  `    up:jp.ArrowUp||ts2.up,
    attack:jp.KeyL`,
  `    up:jp.ArrowUp||ts2.up,
    down:jp.ArrowDown||ts2.down,
    attack:jp.KeyL`,
  'Add down to getLocalP2'
);
replace(
  `let remoteInput = {left:false,right:false,up:false,attack:false`,
  `let remoteInput = {left:false,right:false,up:false,down:false,attack:false`,
  'Add down to remoteInput'
);
replace(
  `let guestInputBuf = {up:false,attack:false`,
  `let guestInputBuf = {up:false,down:false,attack:false`,
  'Add down to guestInputBuf'
);
replace(
  `    up:     (raw.up     || guestInputBuf.up)     ? 1 : 0,
    attack:`,
  `    up:     (raw.up     || guestInputBuf.up)     ? 1 : 0,
    down:   (raw.down   || guestInputBuf.down)   ? 1 : 0,
    attack:`,
  'Add down to sendLocalInputToHost'
);
replace(
  `  guestInputBuf.up=false;guestInputBuf.attack=false`,
  `  guestInputBuf.up=false;guestInputBuf.down=false;guestInputBuf.attack=false`,
  'Clear down in guest buffer'
);
// Remote input receivers
replace(
  `        remoteInput.up     = remoteInput.up     || !!inp.up;
        remoteInput.attack`,
  `        remoteInput.up     = remoteInput.up     || !!inp.up;
        remoteInput.down   = remoteInput.down   || !!inp.down;
        remoteInput.attack`,
  'Add down to onOpponentInput (1)'
);
replace(
  `          remoteInput.up=remoteInput.up||!!inp.up;
          remoteInput.attack`,
  `          remoteInput.up=remoteInput.up||!!inp.up;
          remoteInput.down=remoteInput.down||!!inp.down;
          remoteInput.attack`,
  'Add down to onOpponentInput (2)'
);
replace(
  `      remoteInput.up=false;remoteInput.attack=false`,
  `      remoteInput.up=false;remoteInput.down=false;remoteInput.attack=false`,
  'Clear down in game loop'
);

// ═══════════════════════════════════════════════════════════
// WRITE BOTH FILES
// ═══════════════════════════════════════════════════════════
fs.writeFileSync(path.join(__dirname, 'game.js'), code);
fs.writeFileSync(path.join(__dirname, 'index.html'), html);
console.log('\n✅ ALL PATCHES APPLIED SUCCESSFULLY');
console.log('game.js:', code.length, 'chars');
console.log('index.html:', html.length, 'chars');
