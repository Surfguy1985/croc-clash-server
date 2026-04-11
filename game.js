// ============================================================
//  CROC CLASH — PRODUCTION v8.0
//  Online Multiplayer + TikTok Mini Game + Pillow Combat
//  WebSocket rooms, host/guest sync, TikTok SDK integration.
// ============================================================
(() => {
'use strict';

// ─── ARENA ───
const AW = 960, AH = 540;
const FLOOR_Y = AH - 58;
const MAX_HP = 6;
const ROUND_TIME = 45, ROUNDS_TO_WIN = 2;

// ─── FIGHTERS (triple size) ───
const CW = 280, CH = 400;
const MOVE_SPD = 220, GRAVITY = 700, JUMP_VEL = -420;
const ATK_RANGE = 200, ATK_CD = 0.35;
const DASH_SPD = 580, DASH_DUR = 0.18, DASH_CD = 0.7;
const TAIL_RANGE = 240, TAIL_CD = 1.4;
const PARRY_WIN = 0.18, PARRY_CD = 0.55, PARRY_STUN = 0.6;
const LAUNCH_CD = 1.6, LAUNCH_SPD = 700, PILLOW_SIZE = 56;
const KB = 280, KB_UP = -160;
const COMEBACK_TH = 2;

// Special power cooldowns
const CD_FREEZE = 8, CD_SAX = 10, CD_LIGHTNING = 12, CD_MYSTERY = 15, CD_TORNADO = 4, CD_TAIL = 1.4;
const CD_SHOTGUN = 5, CD_UPPERCUT = 6, CD_BOOMERANG = 7, CD_RAPIDFIRE = 4;

// ─── JUICE ───
const HS_LIGHT = 0.06, HS_HEAVY = 0.12, HS_KO = 0.3, HS_PARRY = 0.1, HS_TAIL = 0.16, HS_LAUNCH = 0.2;
const SLO_DUR = 0.8, SLO_SCALE = 0.15, TRAUMA_DECAY = 1.8;

// ─── POWER DEFINITIONS ───
const POWERS = {
  freeze:    { name:'Freeze Ball',    key:'1', icon:'❄️',  cd: CD_FREEZE,    desc:'Freezes opponent 3s' },
  sax:       { name:'Saxophone',      key:'2', icon:'🎷',  cd: CD_SAX,       desc:'Dizzy blast wave' },
  lightning: { name:'Lightning',      key:'3', icon:'⚡',  cd: CD_LIGHTNING,  desc:'Sky strike 1 HP' },
  mystery:   { name:'Mystery Box',    key:'4', icon:'❓',  cd: CD_MYSTERY,   desc:'Random power up!' },
  tornado:   { name:'Tornado',        key:'5', icon:'🌪️', cd: CD_TORNADO,   desc:'Spin dash attack' },
  tailwhip:  { name:'Tail Whip',     key:'6', icon:'🦎',  cd: CD_TAIL,      desc:'Heavy tail smash' },
  shotgun:   { name:'Pillow Shotgun', key:'7', icon:'💥',  cd: CD_SHOTGUN,   desc:'5-pillow spread blast' },
  uppercut:  { name:'Pillow Uppercut',key:'8', icon:'🥊',  cd: CD_UPPERCUT,  desc:'Sky-launch melee' },
  boomerang: { name:'Boomerang',      key:'9', icon:'🪃',  cd: CD_BOOMERANG, desc:'Returns to sender' },
  rapidfire: { name:'Rapid Fire',     key:'0', icon:'🔥',  cd: CD_RAPIDFIRE, desc:'Pillow minigun burst' },
};
const POWER_KEYS = Object.keys(POWERS);

// ─── SKIN DEFINITIONS ───
const SKIN_DEFS = {
  gary: [
    { id:'default', name:'Default',  src:'gary-sprite-lg.png', winsReq:0 },
    { id:'golden',  name:'Golden',   src:'skins/gary-golden.png', winsReq:5 },
    { id:'zombie',  name:'Zombie',   src:'skins/gary-zombie.png', winsReq:10 },
    { id:'cowboy',  name:'Cowboy',   src:'skins/gary-cowboy.png', winsReq:25 },
    { id:'neon',    name:'Neon',     src:'skins/gary-neon.png', winsReq:50 },
  ],
  carl: [
    { id:'default', name:'Default',  src:'carl-sprite-lg.png', winsReq:0 },
    { id:'golden',  name:'Golden',   src:'skins/carl-golden.png', winsReq:5 },
    { id:'zombie',  name:'Zombie',   src:'skins/carl-zombie.png', winsReq:10 },
    { id:'cowboy',  name:'Cowboy',   src:'skins/carl-cowboy.png', winsReq:25 },
    { id:'neon',    name:'Neon',     src:'skins/carl-neon.png', winsReq:50 },
  ],
};

// ─── UTILS ───
const lerp = (a,b,t) => a+(b-a)*t;
const clamp = (v,l,h) => Math.max(l,Math.min(h,v));
const dist = (x1,y1,x2,y2) => Math.hypot(x2-x1,y2-y1);
const rand = (a,b) => Math.random()*(b-a)+a;
const randInt = (a,b) => Math.floor(rand(a,b+1));
const pick = a => a[randInt(0,a.length-1)];
const TAU = Math.PI*2;
const _ps = Math.random()*1e3;
function noise1D(x){const i=Math.floor(x),f=x-i,u=f*f*(3-2*f);const a=Math.sin(i*127.1+_ps)*43758.5453;const b=Math.sin((i+1)*127.1+_ps)*43758.5453;return lerp(a-Math.floor(a),b-Math.floor(b),u)*2-1}

// ─── FUNNY TEXT ───
const ROUND_INTROS = ["PILLOW FIGHT!!","FEATHERS WILL FLY!!","CROC BRAWL!!","FLUFF OR FLIGHT!!","SCALY SMACKDOWN!!","ROLL OUT!!","IT'S GO TIME!!"];
const KO_LINES = ["SMOKED 'EM!!","FEATHERED!!","OUT COLD!!","PLUCKED!!","K.O.!!","DOWN!!","LIGHTS OUT!!"];
const PERFECT_LINES = ["FLAWLESS!!","UNTOUCHABLE!!","PILLOW KING!!","IMMACULATE!!","DOMINANCE!!"];
const PARRY_LINES = ["BLOCKED!!","DENIED!!","NOT TODAY!!","NOPE!!","NICE TRY!!","RIPOSTE!!"];
const DMG_WORDS = ["OOF","POW","BONK","THWAP","BWOK","ZAP","SPLAT","CRUNCH"];
const TAIL_WORDS = ["WHIPLASH!!","TAIL SMACK!!","SWIPE!!","REPTILE!!","COLD BLOOD!!"];
const LAUNCH_HIT_WORDS = ["DIRECT HIT!!","PILLOW BOMB!!","BULLSEYE!!","INCOMING!!","FLUFFED!!","AIR MAIL!!","LAUNCHED!!"];
const COMBO_MS = {3:"THREE!",5:"FIVE HIT!!",7:"SEVEN!!",10:"TEN HIT COMBO!!",15:"UNSTOPPABLE!!",20:"LEGENDARY!!"};
const WIN_LINES = ["WINS!!","DOMINATES!!","STANDS TALL!!","TAKES IT!!","IS VICTORIOUS!!"];
const COMEBACK_LINES = ["COMEBACK TIME!!","NOT DONE YET!!","LAST STAND!!","DESPERATION!!","FIGHT BACK!!"];

// ─── In-Memory Progression (no localStorage) ───
const LS_WINS = 'crocClashTotalWins', LS_STREAK = 'crocClashStreak';
let _memWins=0, _memStreak=0;
function getTotalWins(){ return _memWins; }
function getStreak(){ return _memStreak; }
function addWin(){ _memWins++; _memStreak++; return {wins:_memWins,streak:_memStreak}; }
function resetStreak(){ _memStreak=0; }

// ─── IMAGE LOADING ───
const images = {};
let imagesLoaded = 0;
const IMAGE_LIST = [
  ['arena','arena-bg.png'],
  ['gary','gary-sprite-lg.png'],
  ['carl','carl-sprite-lg.png'],
  ['garyCU','gary-closeup.png'],
  ['carlCU','carl-closeup.png'],
  // Swing animation frames — Gary
  ['gary_swing1','gary-swing-1.png'],
  ['gary_swing2','gary-swing-2.png'],
  ['gary_swing3','gary-swing-3.png'],
  // Swing animation frames — Carl
  ['carl_swing1','carl-swing-1.png'],
  ['carl_swing2','carl-swing-2.png'],
  ['carl_swing3','carl-swing-3.png'],
  // Skins — Gary
  ['gary_golden','skins/gary-golden.png'],
  ['gary_zombie','skins/gary-zombie.png'],
  ['gary_cowboy','skins/gary-cowboy.png'],
  ['gary_neon','skins/gary-neon.png'],
  // Skins — Carl
  ['carl_golden','skins/carl-golden.png'],
  ['carl_zombie','skins/carl-zombie.png'],
  ['carl_cowboy','skins/carl-cowboy.png'],
  ['carl_neon','skins/carl-neon.png'],
];
function loadImages(cb) {
  let total = IMAGE_LIST.length;
  if(total === 0){ cb(); return; }
  IMAGE_LIST.forEach(([key, src]) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { images[key] = img; imagesLoaded++; if(imagesLoaded >= total) cb(); };
    img.onerror = () => { imagesLoaded++; if(imagesLoaded >= total) cb(); };
    img.src = src;
  });
}
function getSpriteForCroc(c) {
  // c.charKey = 'gary' | 'carl', c.skin = skin id
  const skinMap = { gary: { default:'gary', golden:'gary_golden', zombie:'gary_zombie', cowboy:'gary_cowboy', neon:'gary_neon' }, carl: { default:'carl', golden:'carl_golden', zombie:'carl_zombie', cowboy:'carl_cowboy', neon:'carl_neon' } };
  const key = skinMap[c.charKey]?.[c.skin] || c.charKey;
  return images[key] || images[c.charKey];
}

// ─── PREMIUM AUDIO ENGINE v2.0 ───
// Layered multi-voice synthesis with noise bursts, filtered sweeps,
// proper ADSR envelopes and spatial panning for premium arcade feel.
let actx = null;
let masterGain = null;
let crowdGain = null, crowdSource = null;

function initAudio() {
  if(!actx){
    actx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = actx.createGain();
    masterGain.gain.value = 0.85;
    // Master compressor for punch
    const comp = actx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.knee.value = 12;
    comp.ratio.value = 6; comp.attack.value = 0.003; comp.release.value = 0.15;
    masterGain.connect(comp).connect(actx.destination);
  }
  if(actx.state === 'suspended') actx.resume();
  startCrowdAmbience();
}

// Enhanced tone with ADSR envelope
function tone(f,d,tp='square',v=.1,dl=0,pan=0){
  if(!actx||!masterGain)return;
  try{
    const t=actx.currentTime+dl;
    const o=actx.createOscillator(),g=actx.createGain();
    o.type=tp;o.frequency.setValueAtTime(f,t);
    // ADSR: quick attack, sustain, exponential release
    const atk=Math.min(0.008,d*0.1);
    g.gain.setValueAtTime(0.001,t);
    g.gain.linearRampToValueAtTime(v,t+atk);
    g.gain.setValueAtTime(v*0.85,t+atk+0.01);
    g.gain.exponentialRampToValueAtTime(.001,t+d);
    // Stereo pan
    if(pan!==0&&actx.createStereoPanner){
      const pn=actx.createStereoPanner();
      pn.pan.value=clamp(pan,-1,1);
      o.connect(g).connect(pn).connect(masterGain);
    } else {
      o.connect(g).connect(masterGain);
    }
    o.start(t);o.stop(t+d);
  }catch(e){}
}

// Noise burst — percussive impact layer
function noiseBurst(dur=0.06,vol=0.12,hpFreq=800,lpFreq=5000,dl=0){
  if(!actx||!masterGain)return;
  try{
    const t=actx.currentTime+dl;
    const bufLen=Math.ceil(actx.sampleRate*dur*2);
    const buf=actx.createBuffer(1,bufLen,actx.sampleRate);
    const d=buf.getChannelData(0);
    for(let i=0;i<bufLen;i++) d[i]=(Math.random()*2-1);
    const src=actx.createBufferSource();src.buffer=buf;
    const hp=actx.createBiquadFilter();hp.type='highpass';hp.frequency.value=hpFreq;
    const lp=actx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=lpFreq;
    const g=actx.createGain();
    g.gain.setValueAtTime(0.001,t);
    g.gain.linearRampToValueAtTime(vol,t+0.003);
    g.gain.exponentialRampToValueAtTime(0.001,t+dur);
    src.connect(hp).connect(lp).connect(g).connect(masterGain);
    src.start(t);src.stop(t+dur);
  }catch(e){}
}

// Filtered sweep — whoosh/swoosh layer
function sweep(startF,endF,dur=0.15,vol=0.08,tp='sawtooth',dl=0){
  if(!actx||!masterGain)return;
  try{
    const t=actx.currentTime+dl;
    const o=actx.createOscillator(),g=actx.createGain();
    const lp=actx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=3000;lp.Q.value=3;
    o.type=tp;
    o.frequency.setValueAtTime(startF,t);
    o.frequency.exponentialRampToValueAtTime(Math.max(endF,20),t+dur);
    lp.frequency.setValueAtTime(startF*4,t);
    lp.frequency.exponentialRampToValueAtTime(Math.max(endF*2,60),t+dur);
    g.gain.setValueAtTime(0.001,t);
    g.gain.linearRampToValueAtTime(vol,t+dur*0.15);
    g.gain.exponentialRampToValueAtTime(0.001,t+dur);
    o.connect(lp).connect(g).connect(masterGain);
    o.start(t);o.stop(t+dur);
  }catch(e){}
}

// Sub-bass thump
function subThump(freq=50,dur=0.25,vol=0.2,dl=0){
  if(!actx||!masterGain)return;
  try{
    const t=actx.currentTime+dl;
    const o=actx.createOscillator(),g=actx.createGain();
    o.type='sine';o.frequency.setValueAtTime(freq,t);
    o.frequency.exponentialRampToValueAtTime(20,t+dur);
    g.gain.setValueAtTime(vol,t);
    g.gain.exponentialRampToValueAtTime(0.001,t+dur);
    o.connect(g).connect(masterGain);
    o.start(t);o.stop(t+dur);
  }catch(e){}
}

// ─── CROWD AMBIENCE ───
function startCrowdAmbience(){
  if(!actx||!masterGain||crowdSource) return;
  try {
    const bufLen = actx.sampleRate * 2;
    const buf = actx.createBuffer(1, bufLen, actx.sampleRate);
    const data = buf.getChannelData(0);
    for(let i=0;i<bufLen;i++) data[i] = Math.random()*2-1;
    const src = actx.createBufferSource();
    src.buffer = buf; src.loop = true;
    const lp = actx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 380; lp.Q.value = 0.8;
    const g = actx.createGain(); g.gain.value = 0.04;
    src.connect(lp).connect(g).connect(masterGain);
    src.start(); crowdSource = src; crowdGain = g;
  } catch(e) {}
}
function setCrowdVolume(v){ if(crowdGain&&actx) crowdGain.gain.setTargetAtTime(clamp(v,0,0.14), actx.currentTime, 0.3); }

// ─── PREMIUM SFX ───
function sfxHit(c){
  const p=200+Math.min(c,20)*12+rand(-8,8);
  // Tonal body
  tone(p,.08,'sawtooth',.16);
  tone(p*1.5,.04,'square',.07,.005);
  // Noise crack for percussive impact
  noiseBurst(0.04,0.14+Math.min(c,15)*0.005,1200,6000);
  // Sub weight
  subThump(80+c*5,0.08,0.08);
}
function sfxParry(){
  // Bright metallic ring
  tone(880,.08,'sine',.18);
  tone(1320,.1,'sine',.14,.015);
  tone(1760,.08,'sine',.1,.03);
  tone(2640,.06,'sine',.06,.04);
  // Shimmer noise
  noiseBurst(0.06,0.12,3000,12000,.01);
  sweep(3000,800,0.12,0.06,'sine',.02);
}
function sfxDash(){
  // Whoosh
  sweep(600,150,0.14,0.1,'sawtooth');
  noiseBurst(0.08,0.08,200,3000);
  tone(300,.06,'triangle',.07);
}
function sfxBounce(){
  const f=400+rand(-15,15);
  tone(f,.06,'sine',.1);
  tone(f*1.5,.04,'sine',.05,.01);
  subThump(60,0.06,0.06);
  noiseBurst(0.03,0.05,500,3000);
}
function sfxSpecial(){
  tone(150,.4,'sawtooth',.12);
  tone(240,.3,'square',.08,.04);
  sweep(100,600,0.3,0.08,'sawtooth');
  subThump(40,0.35,0.12);
  noiseBurst(0.08,0.1,400,2000,.05);
}
function sfxTailWhip(){
  // Heavy sweep whoosh
  sweep(500,80,0.25,0.16,'sawtooth');
  tone(110,.3,'sawtooth',.2);
  tone(220,.2,'square',.14,.03);
  noiseBurst(0.1,0.18,300,4000,.02);
  subThump(50,0.3,0.15);
}
function sfxKO(){
  // Cinematic impact
  subThump(30,0.8,0.3);
  subThump(50,0.5,0.2,.1);
  tone(80,.7,'sawtooth',.24);
  tone(60,.8,'square',.2,.08);
  noiseBurst(0.15,0.25,200,6000);
  noiseBurst(0.25,0.15,100,3000,.08);
  sweep(400,40,0.6,0.12,'sawtooth',.1);
  tone(180,.4,'sine',.14,.2);
}
function sfxRound(){
  // Arcade fight bell
  tone(523,.1,'square',.1);
  tone(659,.1,'square',.1,.08);
  tone(784,.18,'square',.12,.16);
  tone(1047,.12,'sine',.08,.22);
  noiseBurst(0.04,0.06,2000,8000,.16);
}
function sfxPerfect(){
  // Shimmering victory fanfare
  [523,659,784,1047].forEach((f,i)=>{
    tone(f,.08,'sine',.14,i*.06);
    tone(f*2,.04,'sine',.06,i*.06+.02);
  });
  tone(1568,.25,'sine',.16,.28);
  noiseBurst(0.06,0.08,4000,12000,.24);
}
function sfxCombo(c){
  const b=420+c*14;
  tone(b,.08,'square',.12);
  tone(b*1.25,.08,'square',.1,.04);
  tone(b*1.5,.12,'square',.12,.08);
  noiseBurst(0.03,0.06+c*0.003,1500,6000,.06);
  if(c>=7) tone(b*2,.06,'sine',.08,.1);
}
function sfxComeback(){
  subThump(40,0.4,0.18);
  tone(100,.3,'sawtooth',.18);
  tone(160,.22,'square',.14,.08);
  sweep(80,300,0.35,0.1,'sawtooth',.1);
}
function sfxLaunch(){
  // Pillow throw whoosh
  sweep(200,800,0.15,0.12,'triangle');
  tone(180,.12,'triangle',.14);
  tone(350,.1,'sine',.1,.03);
  noiseBurst(0.05,0.1,400,4000);
}
function sfxLaunchHit(){
  // Massive pillow impact
  subThump(50,0.35,0.22);
  tone(80,.35,'sawtooth',.22);
  tone(120,.28,'square',.16,.04);
  noiseBurst(0.12,0.22,300,5000);
  noiseBurst(0.06,0.12,1500,8000,.04);
  sweep(800,100,0.3,0.1,'sawtooth',.05);
}
function sfxFlyUp(){
  sweep(150,600,0.4,0.1,'sine');
  tone(200,.35,'sine',.1);
  tone(350,.25,'sine',.08,.08);
}
function sfxLand(){
  subThump(40,0.3,0.2);
  tone(60,.3,'sawtooth',.16);
  noiseBurst(0.1,0.16,200,3000);
  noiseBurst(0.06,0.1,50,800,.03);
}
function sfxFreeze(){
  // Crystalline ice
  [1200,1500,1900,2400].forEach((f,i)=>{
    tone(f,.14,'sine',.12,i*.04);
    tone(f*0.5,.08,'triangle',.06,i*.04+.02);
  });
  sweep(3000,600,0.25,0.08,'sine',.12);
  noiseBurst(0.08,0.1,3000,12000,.08);
}
function sfxSax(){
  // Jazzy sax riff
  const notes=[330,370,440,392,330,440];
  notes.forEach((f,i)=>{
    tone(f,.14,'sine',.14,i*.09);
    tone(f*1.5,.08,'sine',.06,i*.09+.04);
    tone(f*2,.04,'sine',.03,i*.09+.05);
  });
  noiseBurst(0.04,0.04,2000,6000,.1);
}
function sfxLightning(){
  subThump(30,1.0,0.25);
  tone(80,.7,'sawtooth',.22);
  tone(60,.9,'square',.2,.04);
  noiseBurst(0.2,0.25,100,8000,.08);
  noiseBurst(0.3,0.15,50,4000,.15);
  sweep(600,30,0.8,0.12,'sawtooth',.1);
}
function sfxMystery(){
  const notes=[523,659,784,1047,1319,1568];
  notes.forEach((f,i)=>{
    tone(f,.1,'sine',.12,i*.07);
    tone(f*0.5,.06,'triangle',.05,i*.07);
  });
  noiseBurst(0.04,0.06,4000,10000,.35);
}
function sfxRage(){
  subThump(30,0.6,0.25);
  tone(80,.5,'sawtooth',.22);
  tone(50,.65,'square',.28,.08);
  sweep(50,300,0.5,0.14,'sawtooth',.12);
  noiseBurst(0.15,0.18,100,3000,.1);
}
function sfxMegaBomb(){
  subThump(25,1.8,0.35);
  subThump(40,1.2,0.25,.15);
  tone(40,1.6,'sawtooth',.32);
  tone(60,1.3,'square',.26,.08);
  noiseBurst(0.3,0.3,100,6000,.05);
  noiseBurst(0.4,0.2,50,3000,.2);
  sweep(600,25,1.2,0.15,'sawtooth',.15);
}
// New combat SFX
function sfxShotgun(){
  // Pumped spread blast
  subThump(60,0.2,0.2);
  noiseBurst(0.08,0.2,500,8000);
  noiseBurst(0.12,0.14,200,4000,.02);
  sweep(400,1200,0.1,0.12,'sawtooth');
  tone(250,.1,'sawtooth',.14);
  for(let i=0;i<5;i++) tone(300+i*60,.06,'triangle',.04,i*.02);
}
function sfxUppercut(){
  // Rising power punch
  sweep(100,1200,0.2,0.16,'sawtooth');
  subThump(70,0.15,0.18);
  noiseBurst(0.06,0.18,600,6000,.02);
  tone(200,.15,'square',.14);
  tone(400,.1,'sine',.1,.05);
  tone(800,.08,'sine',.08,.1);
}
function sfxBoomerang(){
  // Spinning whoosh
  sweep(300,800,0.15,0.1,'triangle');
  sweep(800,300,0.15,0.08,'triangle',.15);
  tone(440,.2,'sine',.08);
  tone(660,.15,'sine',.06,.05);
  noiseBurst(0.06,0.08,1000,5000,.03);
}
function sfxRapidFire(){
  // Machine gun pillow burst
  for(let i=0;i<6;i++){
    tone(250+i*30,.04,'square',.08+i*0.005,i*.06);
    noiseBurst(0.025,0.08,800,5000,i*.06);
  }
  sweep(200,500,0.35,0.06,'triangle');
}

// ─── NARRATION AUDIO FILES ───
let narrFight = null, narrKO = null;
function loadNarration(){
  narrFight = new Audio('audio/narr-fight.mp3');
  narrFight.volume = 0.7;
  narrKO = new Audio('audio/narr-ko.mp3');
  narrKO.volume = 0.7;
}
function playNarr(el){ if(!el) return; try{ el.currentTime=0; el.play().catch(()=>{}); }catch(e){} }

// ─── VIDEO OVERLAY ───
let videoPlaying = false, videoEl = null, videoTimeout = null;
// Alternating KO finishing videos per winner
const KO_VIDS_GARY = ['video/ko-gary-wins.mp4','video/ko-gary-wins-2.mp4'];
const KO_VIDS_CARL = ['video/ko-carl-wins.mp4','video/ko-carl-wins-2.mp4'];
let koVidIdx = 0; // alternates between 0 and 1 each KO
function getKOVideo(winner){
  const vids = (winner === p1) ? KO_VIDS_GARY : KO_VIDS_CARL;
  const vid = vids[koVidIdx % vids.length];
  koVidIdx++;
  return vid;
}
function initVideoOverlay(){
  videoEl = document.getElementById('special-video');
  if(!videoEl) return;
  videoEl.addEventListener('ended', () => hideVideo());
  videoEl.addEventListener('error', () => hideVideo());
  videoEl.addEventListener('click', () => hideVideo());
  videoEl.addEventListener('touchstart', () => hideVideo());
}
function playSpecialVideo(src, duration){
  duration = duration || 3000;
  if(!videoEl || videoPlaying) return;
  videoEl.src = src;
  videoEl.style.display = 'block';
  videoEl.play().catch(() => hideVideo());
  videoPlaying = true;
  if(videoTimeout) clearTimeout(videoTimeout);
  videoTimeout = setTimeout(() => { if(videoPlaying) hideVideo(); }, duration);
}
function hideVideo(){
  if(!videoEl) return;
  videoEl.pause();
  videoEl.style.display = 'none';
  videoEl.removeAttribute('src');
  videoPlaying = false;
  if(videoTimeout){ clearTimeout(videoTimeout); videoTimeout = null; }
}

// ─── CANVAS ───
const canvas = document.getElementById('gc'), ctx = canvas.getContext('2d');
let W, H, sc, ox, oy;
function resize(){ W=innerWidth; H=innerHeight; canvas.width=W; canvas.height=H; sc=Math.min(W/AW, H/AH); ox=(W-AW*sc)/2; oy=(H-AH*sc)/2; }
addEventListener('resize', resize); resize();

// ─── INPUT ───
const keys = {}, jp = {};
document.addEventListener('keydown', e => { if(!keys[e.code]) jp[e.code]=true; keys[e.code]=true; e.preventDefault(); });
document.addEventListener('keyup', e => { keys[e.code]=false; });

// Touch state — P1 (single-player controls + 2P P1 half)
const ts = {up:0,down:0,left:0,right:0,attack:0,dash:0,parry:0,launch:0,power1:0,power2:0};
// Touch state — P2 (2P P2 half)
const ts2 = {up:0,down:0,left:0,right:0,attack:0,dash:0,parry:0,launch:0,power1:0,power2:0};

// Single-player touch controls (no data-p attribute)
document.querySelectorAll('#touch-controls .dpad-btn').forEach(b => {
  const d = b.dataset.dir;
  b.addEventListener('touchstart', e => { e.preventDefault(); ts[d]=1; }, {passive:false});
  b.addEventListener('touchend',   e => { e.preventDefault(); ts[d]=0; }, {passive:false});
});
document.querySelectorAll('#touch-controls .abtn').forEach(b => {
  const a = b.dataset.action;
  b.addEventListener('touchstart', e => { e.preventDefault(); ts[a]=1; }, {passive:false});
  b.addEventListener('touchend',   e => { e.preventDefault(); ts[a]=0; }, {passive:false});
});

// 2-Player touch controls (data-p="1" or data-p="2")
document.querySelectorAll('#touch-2p [data-p="1"].dpad-btn').forEach(b => {
  const d = b.dataset.dir;
  b.addEventListener('touchstart', e => { e.preventDefault(); ts[d]=1; }, {passive:false});
  b.addEventListener('touchend',   e => { e.preventDefault(); ts[d]=0; }, {passive:false});
});
document.querySelectorAll('#touch-2p [data-p="1"].abtn').forEach(b => {
  const a = b.dataset.action;
  b.addEventListener('touchstart', e => { e.preventDefault(); ts[a]=1; }, {passive:false});
  b.addEventListener('touchend',   e => { e.preventDefault(); ts[a]=0; }, {passive:false});
});
document.querySelectorAll('#touch-2p [data-p="2"].dpad-btn').forEach(b => {
  const d = b.dataset.dir;
  b.addEventListener('touchstart', e => { e.preventDefault(); ts2[d]=1; }, {passive:false});
  b.addEventListener('touchend',   e => { e.preventDefault(); ts2[d]=0; }, {passive:false});
});
document.querySelectorAll('#touch-2p [data-p="2"].abtn').forEach(b => {
  const a = b.dataset.action;
  b.addEventListener('touchstart', e => { e.preventDefault(); ts2[a]=1; }, {passive:false});
  b.addEventListener('touchend',   e => { e.preventDefault(); ts2[a]=0; }, {passive:false});
});

// Show/hide correct touch controls based on mode
function showTouchControls(is2P){
  const tc = document.getElementById('touch-controls');
  const t2p = document.getElementById('touch-2p');
  const isTouch = window.matchMedia('(pointer:coarse)').matches;
  if(!isTouch){ tc.style.display='none'; t2p.classList.remove('active'); return; }
  if(is2P){
    tc.style.display='none';
    t2p.classList.add('active');
  } else {
    tc.style.display='flex';
    t2p.classList.remove('active');
  }
}
function hideTouchControls(){
  document.getElementById('touch-controls').style.display='none';
  document.getElementById('touch-2p').classList.remove('active');
}

// ─── MYSTERY BOX ───
let mysteryBox = null;
function spawnMysteryBox(){
  if(mysteryBox) return;
  mysteryBox = {
    x: rand(200, AW-200),
    y: FLOOR_Y - 80,
    size: 60,
    rot: 0,
    pulse: 0,
    glow: 0,
    alive: true,
  };
}
function updateMysteryBox(dt){
  if(!mysteryBox) return;
  mysteryBox.rot += dt * 1.5;
  mysteryBox.pulse += dt * 4;
  mysteryBox.glow = 0.6 + Math.sin(mysteryBox.pulse)*0.3;
}
function drawMysteryBox(){
  if(!mysteryBox) return;
  const {x,y,size,rot,glow} = mysteryBox;
  ctx.save();
  ctx.translate(x,y);
  ctx.rotate(rot * 0.3);
  // Box shadow
  ctx.shadowColor = '#ffd740';
  ctx.shadowBlur = 20 * glow;
  // Gold box
  const bg = ctx.createLinearGradient(-size/2,-size/2,size/2,size/2);
  bg.addColorStop(0,'#ffd740');
  bg.addColorStop(0.5,'#ff9100');
  bg.addColorStop(1,'#ffd740');
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(-size/2,-size/2,size,size,8);
  ctx.fill();
  // ? mark
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#1a1a2e';
  ctx.font = `bold ${size*0.6}px Fredoka,sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('?', 0, 2);
  // sparkles
  for(let i=0;i<4;i++){
    const sa = mysteryBox.pulse*0.5+i*1.57;
    ctx.save();
    ctx.translate(Math.cos(sa)*(size*0.8), Math.sin(sa)*(size*0.7)-size*0.1);
    ctx.fillStyle = `rgba(255,215,64,${glow})`;
    ctx.beginPath();
    ctx.arc(0,0,3,0,TAU);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}
function checkMysteryPickup(c, o){
  if(!mysteryBox) return;
  if(dist(c.x+c.w/2, c.y+c.h/2, mysteryBox.x, mysteryBox.y) < 90){
    // Give random power
    const effect = pick(['speed','shield','double','heal']);
    mysteryBox = null;
    sfxMystery();
    playSpecialVideo('video/special-mystery.mp4', 2000);
    applyMysteryEffect(c, o, effect);
  }
}
function applyMysteryEffect(c, o, effect){
  if(effect === 'speed'){
    c.speedBoost = 1.5;
    c.speedBoostT = 5;
    fText(c.x+c.w/2, c.y-60, 'SPEED BOOST!', '#4ade80', 32, 1.5);
    slam('SPEED BOOST!!', '#4ade80', 1.2);
  } else if(effect === 'shield'){
    c.shieldActive = true;
    fText(c.x+c.w/2, c.y-60, 'SHIELDED!', '#60a5fa', 32, 1.5);
    slam('SHIELD UP!!', '#60a5fa', 1.2);
  } else if(effect === 'double'){
    c.doubleDmg = true;
    fText(c.x+c.w/2, c.y-60, 'DOUBLE DMG!', '#f472b6', 32, 1.5);
    slam('DOUBLE DAMAGE!!', '#f472b6', 1.2);
  } else if(effect === 'heal'){
    c.hp = Math.min(MAX_HP, c.hp+1);
    fText(c.x+c.w/2, c.y-60, '+1 HP!', '#4ade80', 32, 1.5);
    slam('HEALED!!', '#4ade80', 1.2);
    stars(c.x+c.w/2, c.y, 15);
  }
}

// ─── PROJECTILES ───
const projectiles = [];
function spawnPillow(owner, face, isDouble){
  const px = owner.x + owner.w/2 + face*80;
  const py = owner.y + owner.h*0.35;
  projectiles.push({
    x: px, y: py, vx: face*LAUNCH_SPD, vy: -50,
    w: PILLOW_SIZE, h: PILLOW_SIZE*0.7,
    owner, face, alive: true, rot: 0, trail: [],
    type: 'pillow', isDouble: !!isDouble,
  });
  sfxLaunch();
  feathers(px, py, 10, '#fff');
}
function spawnFreezeBall(owner, face){
  const px = owner.x + owner.w/2 + face*80;
  const py = owner.y + owner.h*0.3;
  projectiles.push({
    x: px, y: py, vx: face*480, vy: -20,
    w: 50, h: 50,
    owner, face, alive: true, rot: 0, trail: [],
    type: 'freeze',
  });
  sfxFreeze();
}
function spawnSaxWave(owner, face){
  const px = owner.x + owner.w/2 + face*80;
  const py = owner.y + owner.h*0.4;
  projectiles.push({
    x: px, y: py, vx: face*550, vy: 0,
    w: 80, h: 90,
    owner, face, alive: true, rot: 0, trail: [],
    type: 'sax',
  });
  sfxSax();
}

// ─── NEW PROJECTILE SPAWNERS ───
function spawnShotgunPillows(owner, face){
  sfxShotgun();
  const cx = owner.x + owner.w/2 + face*80;
  const cy = owner.y + owner.h*0.35;
  const angles = [-0.35, -0.17, 0, 0.17, 0.35]; // 5-way spread
  angles.forEach((a,i) => {
    const spd = 550 + rand(-30,30);
    projectiles.push({
      x: cx, y: cy + i*4 - 8,
      vx: Math.cos(a)*spd*face, vy: Math.sin(a)*spd - 30,
      w: 36, h: 28,
      owner, face, alive: true, rot: rand(0,TAU), trail: [],
      type: 'pillow_mini', isDouble: false,
    });
  });
  feathers(cx, cy, 18, '#ffd740');
  owner.squash=0.7; owner.stretch=1.4;
}

function spawnBoomerangPillow(owner, face){
  sfxBoomerang();
  const px = owner.x + owner.w/2 + face*80;
  const py = owner.y + owner.h*0.3;
  projectiles.push({
    x: px, y: py, vx: face*600, vy: -60,
    w: 52, h: 40,
    owner, face, alive: true, rot: 0, trail: [],
    type: 'boomerang',
    _boomPhase: 0, _boomOriginX: px, _boomFace: face,
  });
  feathers(px, py, 8, '#a78bfa');
  owner.squash=0.8; owner.stretch=1.25;
}

function spawnRapidFirePillows(owner, face){
  sfxRapidFire();
  for(let i=0;i<6;i++){
    setTimeout(()=>{
      if(!owner.alive) return;
      const px = owner.x + owner.w/2 + face*70;
      const py = owner.y + owner.h*0.3 + rand(-25,25);
      projectiles.push({
        x: px, y: py,
        vx: face*(650+rand(-50,50)), vy: rand(-60,30),
        w: 30, h: 22,
        owner, face, alive: true, rot: rand(0,TAU), trail: [],
        type: 'pillow_mini', isDouble: false,
      });
      feathers(px, py, 3, '#fff');
    }, i*55);
  }
  owner.squash=1.2; owner.stretch=0.85;
}

function doPillowUppercut(attacker, victim){
  sfxUppercut();
  const adx = Math.abs((attacker.x+attacker.w/2) - (victim.x+victim.w/2));
  const ady = Math.abs((attacker.y+attacker.h/2) - (victim.y+victim.h/2));
  if(adx < 220 && ady < 250 && victim.alive && !victim.launched){
    // Direct sky-launch
    victim.launched = true;
    victim.launchVy = -680;
    victim.launchVx = attacker.face * 80;
    victim.launchSpin = attacker.face * 8;
    victim.launchRot = 0;
    victim.launchTimer = 0;
    victim.launchIsKO = false;
    victim.grounded = false;
    victim.hitFlash = 0.3;
    victim.hp = Math.max(0, victim.hp - 1);
    attacker.combo++; attacker.comboT=2; attacker.hits++;
    if(attacker.combo>attacker.maxCombo) attacker.maxCombo=attacker.combo;
    hitStop(0.18); addTrauma(0.7);
    screenFlash('rgba(255,150,0,.4)',0.15);
    feathers(victim.x+victim.w/2, victim.y, 30, '#fff');
    sparks(victim.x+victim.w/2, victim.y+victim.h/2, 25, '#ff9100');
    shockwave(victim.x+victim.w/2, victim.y+victim.h/2, 'rgba(255,150,0,.7)');
    fText(victim.x+victim.w/2, victim.y-60, 'UPPERCUT!!', '#ff9100', 40, 1.8);
    slam('PILLOW UPPERCUT!!','#ff9100',1.5);
    bloomInt=0.7; chromAb=0.5;
    if(victim.hp <= 0){
      victim.launchIsKO = true;
      slowMo(SLO_DUR+0.5, SLO_SCALE);
      playSpecialVideo(getKOVideo(attacker), 5000);
      playNarr(narrKO);
    } else {
      slowMo(0.4, 0.2);
    }
  } else {
    // Whiffed — still animate
    fText(attacker.x+attacker.w/2, attacker.y-60, 'UPPERCUT!', '#ff9100', 30, 0.8);
    sparks(attacker.x+attacker.w/2+attacker.face*100, attacker.y+attacker.h*0.3, 12, '#ff9100');
  }
  attacker.squash=0.6; attacker.stretch=1.5;
  attacker.atkAnim=1.0; attacker.atk=true; attacker.atkT=ATK_TOTAL;
  attacker._hitChecked=true; // skip normal hit check
}

const SHOTGUN_WORDS = ['SPREAD!!','BUCKSHOT!!','SCATTER!!','FAN OUT!!','BLAST!!'];
const UPPERCUT_WORDS = ['UPPERCUT!!','RISING!!','SKY HIGH!!','LAUNCHED!!','GOING UP!!'];
const BOOMERANG_WORDS = ['BOOMERANG!!','RETURNS!!','CATCH THIS!!','ROUND TRIP!!'];
const RAPIDFIRE_WORDS = ['RAPID FIRE!!','BARRAGE!!','VOLLEY!!','MINIGUN!!','SUPPRESSION!!'];
const MINI_PILLOW_WORDS = ['PELTED!!','PLINK!!','FLICK!!','TAP!!','NIP!!'];

// ─── MINI PILLOW HIT (from shotgun/rapidfire) ───
function miniPillowHit(attacker, victim, dir){
  if(victim.shieldActive){
    victim.shieldActive = false;
    sfxParry();
    fText(victim.x+victim.w/2, victim.y-60, 'BLOCKED!', '#60a5fa', 28, 0.8);
    sparks(victim.x+victim.w/2, victim.y+victim.h/2, 10, '#60a5fa');
    return;
  }
  victim.hp = Math.max(0, victim.hp - 1);
  victim.hitFlash = 0.15;
  victim.hitRecoil = dir * 0.2;
  victim.vx = dir * 180;
  victim.vy = -80;
  victim.grounded = false;
  attacker.combo++; attacker.comboT=1.5; attacker.hits++;
  if(attacker.combo>attacker.maxCombo) attacker.maxCombo=attacker.combo;

  hitStop(0.06); addTrauma(0.25);
  sfxHit(attacker.combo);
  feathers(victim.x+victim.w/2, victim.y+victim.h/2, 6, '#fff');
  sparks(victim.x+victim.w/2, victim.y+victim.h/2, 8, '#ffd740');
  fText(victim.x+victim.w/2+rand(-20,20), victim.y-30, pick(MINI_PILLOW_WORDS), '#ffd740', 22, 0.7);
  screenFlash('rgba(255,215,64,.12)',0.05);

  if(victim.hp <= 0){
    victim.launched = true;
    victim.launchVy = -420;
    victim.launchVx = dir * 100;
    victim.launchSpin = dir * 5;
    victim.launchRot = 0;
    victim.launchTimer = 0;
    victim.launchIsKO = true;
    victim.grounded = false;
    slowMo(SLO_DUR+0.3, SLO_SCALE);
    playSpecialVideo(getKOVideo(attacker), 5000);
    playNarr(narrKO);
  }
  slam(`-1 HP! (${victim.hp}/${MAX_HP})`, '#ffd740', 0.8);
  if(COMBO_MS[attacker.combo]){
    setTimeout(()=>{ slam(COMBO_MS[attacker.combo],'#ffd740',1); sfxCombo(attacker.combo); stars(attacker.x+attacker.w/2,attacker.y,10); }, 300);
  }
}

// ─── BOOMERANG HIT ───
function boomerangHit(attacker, victim, dir){
  if(victim.shieldActive){
    victim.shieldActive = false;
    sfxParry();
    fText(victim.x+victim.w/2, victim.y-60, 'BLOCKED!', '#60a5fa', 30, 1.0);
    sparks(victim.x+victim.w/2, victim.y+victim.h/2, 15, '#60a5fa');
    shockwave(victim.x+victim.w/2, victim.y+victim.h/2, 'rgba(96,165,250,0.5)');
    return;
  }
  victim.hp = Math.max(0, victim.hp - 1);
  victim.hitFlash = 0.2;
  victim.hitRecoil = dir * 0.3;
  // Boomerang dizzy effect (shorter than sax)
  victim.dizzy = true;
  victim.dizzyT = 1.2;
  victim.dizzyAngle = 0;
  victim.vx = dir * 220;
  victim.vy = -120;
  victim.grounded = false;
  attacker.combo++; attacker.comboT=2; attacker.hits++;
  if(attacker.combo>attacker.maxCombo) attacker.maxCombo=attacker.combo;

  hitStop(0.12); addTrauma(0.5);
  sfxHit(attacker.combo);
  feathers(victim.x+victim.w/2, victim.y+victim.h/2, 20, '#c4b5fd');
  sparks(victim.x+victim.w/2, victim.y+victim.h/2, 18, '#a78bfa');
  shockwave(victim.x+victim.w/2, victim.y+victim.h/2, 'rgba(167,139,250,.6)');
  fText(victim.x+victim.w/2, victim.y-50, pick(BOOMERANG_WORDS), '#a78bfa', 34, 1.4);
  screenFlash('rgba(167,139,250,.2)',0.1);
  bloomInt=0.5; chromAb=0.3;

  if(victim.hp <= 0){
    victim.launched = true;
    victim.launchVy = -500;
    victim.launchVx = dir * 120;
    victim.launchSpin = dir * 6;
    victim.launchRot = 0;
    victim.launchTimer = 0;
    victim.launchIsKO = true;
    victim.grounded = false;
    slowMo(SLO_DUR+0.5, SLO_SCALE);
    playSpecialVideo(getKOVideo(attacker), 5000);
    playNarr(narrKO);
  } else {
    slowMo(0.3, 0.25);
  }
  slam(`BOOMERANG! -1 HP! (${victim.hp}/${MAX_HP})`, '#a78bfa', 1.2);
}

function updateAllProjectiles(dt){
  for(let i = projectiles.length-1; i>=0; i--){
    const p = projectiles[i];
    const target = p.owner === p1 ? p2 : p1;

    // ─── BOOMERANG PHYSICS ───
    if(p.type === 'boomerang'){
      p._boomPhase += dt;
      const turnT = 0.35; // start curving back after this
      if(p._boomPhase > turnT){
        // Decelerate then reverse
        const rev = (p._boomPhase - turnT) * 4.5;
        p.vx = p._boomFace * (600 - rev * 900);
        p.vy = Math.sin(p._boomPhase * 5) * 120; // wavy path
      }
      p.rot += 18 * dt; // fast spin
    } else {
      // Normal gravity
      if(p.type === 'pillow') p.vy += 80*dt;
      else if(p.type === 'pillow_mini') p.vy += 110*dt;
      else if(p.type === 'freeze') p.vy += 30*dt;
      p.rot += p.face * 12 * dt;
    }

    p.x += p.vx * dt;
    p.y += p.vy * dt;

    p.trail.push({x:p.x, y:p.y, life:0.35});
    if(p.trail.length > 18) p.trail.shift();
    for(let t=p.trail.length-1; t>=0; t--){ p.trail[t].life-=dt; if(p.trail[t].life<=0) p.trail.splice(t,1); }

    // Particle trails
    if(p.type === 'pillow' && Math.random()<dt*15) feathers(p.x,p.y,1,'#fff');
    if(p.type === 'pillow_mini' && Math.random()<dt*10) feathers(p.x,p.y,1,'#ffd740');
    if(p.type === 'boomerang' && Math.random()<dt*18) em(p.x,p.y,rand(-40,40),rand(-40,40),0.25,'#a78bfa',rand(3,6),'star');
    if(p.type === 'freeze' && Math.random()<dt*12) em(p.x,p.y,rand(-30,30),rand(-30,30),0.3,'#93c5fd',rand(3,7),'star');
    if(p.type === 'sax'   && Math.random()<dt*20) em(p.x+rand(-30,30),p.y+rand(-20,20),rand(-50,50),rand(-80,0),0.5,'#ffd740',rand(5,12),'star');

    // Hit check — hitboxes per type
    let hw, hh;
    if(p.type==='sax'){ hw=100; hh=100; }
    else if(p.type==='freeze'){ hw=70; hh=70; }
    else if(p.type==='pillow_mini'){ hw=50; hh=55; }
    else if(p.type==='boomerang'){ hw=60; hh=55; }
    else { hw=65; hh=70; } // pillow (normal)

    if(p.alive && target.alive && !target.launched &&
       Math.abs(p.x - (target.x+target.w/2)) < hw &&
       Math.abs(p.y - (target.y+target.h/2)) < hh){
      p.alive = false;
      if(p.type === 'pillow') pillowHit(p.owner, target, p.face, p.isDouble);
      else if(p.type === 'pillow_mini') miniPillowHit(p.owner, target, p.face);
      else if(p.type === 'boomerang') boomerangHit(p.owner, target, p.face);
      else if(p.type === 'freeze') freezeHit(p.owner, target);
      else if(p.type === 'sax') saxHit(p.owner, target, p.face);
    }

    // Boomerang returns past owner — despawn
    if(p.type === 'boomerang' && p._boomPhase > 0.7){
      const ownerCX = p.owner.x + p.owner.w/2;
      if((p._boomFace > 0 && p.x < ownerCX - 60) || (p._boomFace < 0 && p.x > ownerCX + 60)){
        projectiles.splice(i,1); continue;
      }
    }

    if(p.x < -150 || p.x > AW+150 || p.y > AH+100){ projectiles.splice(i,1); continue; }
    if(!p.alive){ projectiles.splice(i,1); }
  }
}
function drawProjectiles(){
  for(const p of projectiles){
    // Trail
    for(const t of p.trail){
      const a = clamp(t.life/0.35,0,1)*0.35;
      ctx.save(); ctx.globalAlpha = a;
      const tc = p.type==='freeze'?'#93c5fd': p.type==='sax'?'#ffd740':'#fff';
      ctx.fillStyle = tc; ctx.shadowColor = tc; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(t.x,t.y,p.type==='sax'?12:8,0,TAU); ctx.fill();
      ctx.shadowBlur=0; ctx.restore();
    }

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);

    if(p.type === 'pillow'){
      ctx.shadowColor = '#ffd740'; ctx.shadowBlur = 18;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.ellipse(0,0,p.w/2,p.h/2,0,0,TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,215,64,.3)';
      ctx.beginPath(); ctx.ellipse(-4,-4,p.w/3,p.h/3,0,0,TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(200,180,150,.4)'; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.moveTo(-p.w/3,0); ctx.lineTo(p.w/3,0); ctx.stroke();
    } else if(p.type === 'pillow_mini'){
      // Small bright pillow pellet
      ctx.shadowColor = '#ffd740'; ctx.shadowBlur = 12;
      ctx.fillStyle = '#fffbe6';
      ctx.beginPath(); ctx.ellipse(0,0,p.w/2,p.h/2,0,0,TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,215,64,.5)';
      ctx.beginPath(); ctx.ellipse(0,0,p.w/3,p.h/3,0,0,TAU); ctx.fill();
      // Speed lines
      ctx.strokeStyle='rgba(255,255,200,.4)'; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(-p.w/2-6,0); ctx.lineTo(-p.w/2-18,0); ctx.stroke();
    } else if(p.type === 'boomerang'){
      // Glowing purple boomerang shape
      ctx.shadowColor = '#a78bfa'; ctx.shadowBlur = 22;
      ctx.fillStyle = '#c4b5fd';
      ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 3;
      // Boomerang V-shape
      ctx.beginPath();
      ctx.moveTo(0, -p.h/2);
      ctx.quadraticCurveTo(p.w/2, -p.h/4, p.w/3, p.h/4);
      ctx.lineTo(0, 0);
      ctx.lineTo(-p.w/3, p.h/4);
      ctx.quadraticCurveTo(-p.w/2, -p.h/4, 0, -p.h/2);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      // Inner glow
      ctx.fillStyle = 'rgba(167,139,250,.5)';
      ctx.beginPath(); ctx.arc(0,-4,8,0,TAU); ctx.fill();
    } else if(p.type === 'freeze'){
      ctx.shadowColor = '#93c5fd'; ctx.shadowBlur = 25;
      const bg = ctx.createRadialGradient(0,0,5,0,0,26);
      bg.addColorStop(0,'#e0f2fe'); bg.addColorStop(1,'#3b82f6');
      ctx.fillStyle = bg;
      ctx.beginPath(); ctx.arc(0,0,25,0,TAU); ctx.fill();
      // ice crystals
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth=2;
      for(let i=0;i<6;i++){ const a=i*Math.PI/3; ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(Math.cos(a)*20,Math.sin(a)*20); ctx.stroke(); }
    } else if(p.type === 'sax'){
      ctx.shadowColor = '#ffd740'; ctx.shadowBlur = 30;
      // Golden wave
      const bg2 = ctx.createRadialGradient(0,0,10,0,0,45);
      bg2.addColorStop(0,'rgba(255,215,64,0.9)'); bg2.addColorStop(1,'rgba(255,150,0,0.4)');
      ctx.fillStyle = bg2;
      ctx.beginPath(); ctx.ellipse(0,0,45,35,0,0,TAU); ctx.fill();
      // Musical note
      ctx.fillStyle = '#1a1a2e';
      ctx.font = '30px serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('♪', 0, 2);
    }

    ctx.shadowBlur=0; ctx.restore();
  }
}

// ─── PILLOW HIT ───
function pillowHit(attacker, victim, dir, isDouble){
  if(victim.shieldActive){
    victim.shieldActive = false;
    sfxParry();
    fText(victim.x+victim.w/2, victim.y-60, 'BLOCKED!', '#60a5fa', 32, 1.2);
    sparks(victim.x+victim.w/2, victim.y+victim.h/2, 20, '#60a5fa');
    shockwave(victim.x+victim.w/2, victim.y+victim.h/2, 'rgba(96,165,250,0.6)');
    return;
  }
  const dmg = isDouble ? 2 : 1;
  victim.hp = Math.max(0, victim.hp - dmg);
  if(attacker.doubleDmg){ attacker.doubleDmg=false; }

  victim.launched = true;
  victim.launchVy = -520;
  victim.launchVx = dir*140;
  victim.launchSpin = dir*6;
  victim.launchRot = 0;
  victim.launchTimer = 0;
  victim.launchIsKO = false;
  victim.grounded = false;
  victim.hitFlash = 0.25;

  attacker.combo++;
  attacker.comboT = 2;
  attacker.hits++;
  if(attacker.combo > attacker.maxCombo) attacker.maxCombo = attacker.combo;

  hitStop(HS_LAUNCH);
  addTrauma(0.65);
  sfxLaunchHit(); sfxFlyUp();
  screenFlash('rgba(255,215,64,.35)', 0.15);
  feathers(victim.x+victim.w/2, victim.y+victim.h/2, 35, '#fff');
  sparks(victim.x+victim.w/2, victim.y+victim.h/2, 20, '#ffd740');
  shockwave(victim.x+victim.w/2, victim.y+victim.h/2, 'rgba(255,200,0,.6)');
  fText(victim.x+victim.w/2, victim.y-50, pick(LAUNCH_HIT_WORDS), '#ffd740', 36, 1.6);
  bloomInt=0.6; chromAb=0.5;

  if(victim.hp <= 0){
    victim.launchIsKO = true;
    slowMo(SLO_DUR+0.5, SLO_SCALE);
    // Play alternating winner-specific KO finishing video
    playSpecialVideo(getKOVideo(attacker), 5000);
    playNarr(narrKO);
  } else {
    slowMo(0.5, 0.2);
  }

  slam(`-${dmg} HP! (${victim.hp}/${MAX_HP})`, isDouble?'#f472b6':'#ff3d00', 1.2);
  if(COMBO_MS[attacker.combo]){
    setTimeout(()=>{ slam(COMBO_MS[attacker.combo],'#ffd740',1); sfxCombo(attacker.combo); stars(attacker.x+attacker.w/2,attacker.y,10); }, 400);
  }
}

// ─── FREEZE HIT ───
function freezeHit(attacker, victim){
  if(victim.frozen) return;
  if(victim.shieldActive){ victim.shieldActive=false; fText(victim.x+victim.w/2,victim.y-60,'BLOCKED!','#60a5fa',30,1.2); return; }
  victim.frozen = true;
  victim.frozenT = 3.0;
  victim.frozenCracks = 0;
  sfxFreeze();
  playSpecialVideo('video/special-freeze.mp4', 2500);
  slam('FROZEN!!', '#93c5fd', 1.5);
  addTrauma(0.5);
  screenFlash('rgba(147,197,253,.35)', 0.2);
  fText(victim.x+victim.w/2, victim.y-60, 'FROZEN!', '#93c5fd', 38, 2);
  for(let i=0;i<20;i++) em(victim.x+victim.w/2+rand(-30,30), victim.y+victim.h/2+rand(-50,50), rand(-60,60), rand(-80,80), 0.8, '#e0f2fe', rand(4,9),'star');
}

// ─── SAX HIT ───
function saxHit(attacker, victim, dir){
  if(victim.shieldActive){ victim.shieldActive=false; fText(victim.x+victim.w/2,victim.y-60,'BLOCKED!','#60a5fa',30,1.2); return; }
  victim.vx = dir*500;
  victim.vy = KB_UP * 0.8;
  victim.grounded = false;
  victim.dizzy = true;
  victim.dizzyT = 2.0;
  victim.dizzyAngle = 0;
  sfxSax();
  playSpecialVideo('video/special-saxophone.mp4', 2500);
  slam('WOOZY!!', '#ffd740', 1.2);
  addTrauma(0.55);
  screenFlash('rgba(255,215,64,.3)', 0.15);
  fText(victim.x+victim.w/2, victim.y-60, 'DIZZIED!', '#ffd740', 34, 1.5);
  for(let i=0;i<25;i++) em(victim.x+victim.w/2+rand(-40,40),victim.y+victim.h/2+rand(-60,60),rand(-120,120),rand(-100,-20),0.7,'#ffd740',rand(5,10),'star');
}

// ─── LIGHTNING STRIKE ───
function doLightningStrike(attacker, victim){
  playSpecialVideo('video/special-lightning.mp4', 2500);
  sfxLightning();
  // Draw clouds
  attacker.lightningCloud = 0.8;
  // Delayed strike
  setTimeout(()=>{
    if(!victim.alive) return;
    addTrauma(1.0);
    hitStop(0.25);
    screenFlash('rgba(255,255,200,.6)', 0.25);
    slam('LIGHTNING!!', '#ffd740', 1.5);
    // Draw bolt from top
    const tx = victim.x + victim.w/2;
    for(let i=0;i<6;i++) lightningBolt(tx+rand(-20,20), 0, tx+rand(-20,20), victim.y);
    sparks(tx, victim.y+victim.h/2, 40, '#ffd740');
    embers(tx, victim.y+victim.h/2, 20, '#ffff00');
    shockwave(tx, victim.y+victim.h/2, 'rgba(255,215,64,.8)');
    fText(tx, victim.y-50, 'ZAP!', '#ffd740', 40, 1.5);
    chromAb=0.7; bloomInt=1.0;
    if(!victim.frozen && !victim.launched && victim.alive){
      victim.hp = Math.max(0, victim.hp-1);
      victim.hitFlash = 0.3;
      victim.stunned = true;
      victim.stunT = 0.5;
      slam(`LIGHTNING! -1 HP! (${victim.hp}/${MAX_HP})`, '#ffd740', 1.5);
      if(victim.hp <= 0){
        victim.launched = true;
        victim.launchVy = -400;
        victim.launchVx = (victim.x < AW/2 ? -1 : 1)*80;
        victim.launchSpin = 5;
        victim.launchRot = 0;
        victim.launchTimer = 0;
        victim.launchIsKO = true;
        victim.grounded = false;
        slowMo(SLO_DUR+0.5, SLO_SCALE);
        playNarr(narrKO);
      }
    }
  }, 500);
}

// ─── UPDATE LAUNCHED CROC ───
function updateLaunched(c, dt){
  c.launchTimer += dt;
  c.launchRot += c.launchSpin * dt;
  c.x += c.launchVx * dt;
  c.y += c.launchVy * dt;
  c.launchVy += GRAVITY*0.6*dt;
  if(Math.random()<dt*8) feathers(c.x+c.w/2, c.y+c.h/2, 1, '#fff');
  c.x = clamp(c.x, 10, AW-c.w-10);

  if(c.y+c.h >= FLOOR_Y && c.launchVy > 0){
    c.y = FLOOR_Y-c.h;
    c.launched = false;
    c.launchRot = 0;
    c.grounded = true;
    c.vy = 0; c.vx = 0;
    addTrauma(0.5);
    sfxLand();
    shockwave(c.x+c.w/2, FLOOR_Y, 'rgba(255,150,0,.5)');
    feathers(c.x+c.w/2, FLOOR_Y-10, 18, '#fff');
    embers(c.x+c.w/2, FLOOR_Y-10, 10);
    screenFlash('rgba(255,100,0,.15)', 0.08);
    c.squash = 1.5; c.stretch = 0.6;
    c.stunned = true; c.stunT = 0.6;

    if(c.launchIsKO){
      c.alive = false; c.dead = true;
      c.deathVx = c.launchVx*0.5;
      c.deathVy = -60;
      c.deathRotV = c.launchSpin*0.3;
      c.deathRot = c.launchRot;
      hitStop(HS_KO);
      addTrauma(1);
      screenFlash('rgba(255,255,255,.5)', 0.2);
      chromAb=0.7; bloomInt=1;
      feathers(c.x+c.w/2, c.y+c.h/2, 60, '#ffd740');
      embers(c.x+c.w/2, c.y+c.h/2, 30, '#ff6b35');
      stars(c.x+c.w/2, c.y+c.h/2, 25);
      sfxKO();
      slam('K.O.!!', '#ff3d00', 2.5);
      vignette('rgba(255,60,0,.35)', 0.8);
      // Red vignette for 200ms freeze is handled by hitStop(HS_KO)
    }
    c.launchIsKO = false;
  }
}

// ─── PARTICLES ───
const P_MAX = 1500; const parts = [];
function em(x,y,vx,vy,life,col,sz,tp='rect'){if(parts.length>=P_MAX)return;parts.push({x,y,vx,vy,life,ml:life,col,sz,tp,rot:rand(0,TAU),rv:rand(-10,10),grav:1})}
function feathers(x,y,n,c='#fff'){for(let i=0;i<n;i++){const a=rand(0,TAU),s=rand(100,350);em(x,y,Math.cos(a)*s,Math.sin(a)*s-rand(60,220),rand(.6,1.6),c,rand(7,16),'feather')}}
function embers(x,y,n,c='#ff6b35'){for(let i=0;i<n;i++){const a=rand(0,TAU),s=rand(60,200);parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-rand(30,80),life:rand(.3,.8),ml:.8,col:c,sz:rand(2,5),tp:'ember',rot:0,rv:0,grav:.3})}}
function sparks(x,y,n,c='#fff'){for(let i=0;i<n;i++){const a=rand(0,TAU),s=rand(150,400);em(x,y,Math.cos(a)*s,Math.sin(a)*s,rand(.15,.4),c,rand(2,4),'spark')}}
function stars(x,y,n){for(let i=0;i<n;i++){const a=rand(0,TAU),s=rand(50,180);em(x,y,Math.cos(a)*s,Math.sin(a)*s,rand(.4,.9),'#ffd740',rand(6,12),'star')}}
function shockwave(x,y,c='rgba(255,255,255,.5)'){parts.push({x,y,vx:0,vy:0,life:.4,ml:.4,col:c,sz:0,tp:'ring',rot:0,rv:0,radius:10,grav:0})}
function goldenRain(x,y){for(let i=0;i<60;i++){const a=rand(-3.14,-.1),s=rand(120,450);em(x+rand(-70,70),y,Math.cos(a)*s,Math.sin(a)*s,rand(.7,1.8),'#ffd740',rand(6,13),'star')}}
function lightningBolt(x1,y1,x2,y2){parts.push({x:x1,y:y1,vx:x2,vy:y2,life:.18,ml:.18,col:'#a78bfa',sz:4,tp:'lightning',rot:0,rv:0,grav:0})}
function drawStar5(c,cx,cy,oR,iR){let r=-Math.PI/2;const st=Math.PI/5;c.beginPath();c.moveTo(cx,cy-oR);for(let i=0;i<5;i++){c.lineTo(cx+Math.cos(r)*oR,cy+Math.sin(r)*oR);r+=st;c.lineTo(cx+Math.cos(r)*iR,cy+Math.sin(r)*iR);r+=st}c.closePath();c.fill()}
function updateParts(dt){for(let i=parts.length-1;i>=0;i--){const p=parts[i];p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.tp!=='ring'&&p.tp!=='lightning')p.vy+=400*p.grav*dt;p.rot+=p.rv*dt;p.life-=dt;if(p.tp==='ring')p.radius+=320*dt;if(p.tp==='ember'){p.sz*=.97;p.col=p.life>.4?'#ff6b35':'#ff3d00'}if(p.life<=0)parts.splice(i,1)}}
function drawParts(){
  for(const p of parts){
    const a=clamp(p.life/p.ml,0,1);
    ctx.save();ctx.globalAlpha=a;
    if(p.tp==='feather'){ctx.translate(p.x,p.y);ctx.rotate(p.rot);ctx.fillStyle=p.col;ctx.shadowColor=p.col;ctx.shadowBlur=4;ctx.beginPath();ctx.ellipse(0,0,p.sz,p.sz*.28,0,0,TAU);ctx.fill()}
    else if(p.tp==='star'){ctx.translate(p.x,p.y);ctx.rotate(p.rot);ctx.fillStyle=p.col;ctx.shadowColor=p.col;ctx.shadowBlur=8;drawStar5(ctx,0,0,p.sz,p.sz*.4)}
    else if(p.tp==='ring'){ctx.strokeStyle=p.col;ctx.lineWidth=3*a;ctx.shadowColor=p.col;ctx.shadowBlur=12;ctx.beginPath();ctx.arc(p.x,p.y,p.radius,0,TAU);ctx.stroke()}
    else if(p.tp==='ember'){ctx.fillStyle=p.col;ctx.shadowColor=p.col;ctx.shadowBlur=10;ctx.beginPath();ctx.arc(p.x,p.y,p.sz,0,TAU);ctx.fill()}
    else if(p.tp==='spark'){ctx.strokeStyle=p.col;ctx.lineWidth=1.5;ctx.shadowColor=p.col;ctx.shadowBlur=6;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x-p.vx*.02,p.y-p.vy*.02);ctx.stroke()}
    else if(p.tp==='lightning'){ctx.strokeStyle=p.col;ctx.lineWidth=p.sz*a;ctx.shadowColor='#c4b5fd';ctx.shadowBlur=18;ctx.beginPath();let lx=p.x,ly=p.y;const dx=p.vx-p.x,dy=p.vy-p.y;ctx.moveTo(lx,ly);for(let s=0;s<10;s++){const t=(s+1)/10;lx=p.x+dx*t+rand(-18,18);ly=p.y+dy*t+rand(-18,18);ctx.lineTo(lx,ly)}ctx.stroke()}
    else{const s=p.sz*a;ctx.fillStyle=p.col;ctx.translate(p.x,p.y);ctx.rotate(p.rot);ctx.fillRect(-s/2,-s/2,s,s)}
    ctx.shadowBlur=0;ctx.restore();
  }
  ctx.globalAlpha=1;
}

// ─── FLOATING TEXT ───
const floats=[];
function fText(x,y,text,col,sz,dur=0.9){floats.push({x,y,text,col,sz,life:dur,ml:dur,vy:-140,sc:2.2})}
function updateFloats(dt){for(let i=floats.length-1;i>=0;i--){const f=floats[i];f.y+=f.vy*dt;f.vy*=.94;f.life-=dt;f.sc=lerp(f.sc,1,dt*8);if(f.life<=0)floats.splice(i,1)}}
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

// ─── ARENA DRAWING ───
function drawArena(t){
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

// ─── FRAME-BASED SWING ANIMATION ───
// Attack timing (seconds)
const ATK_ANTIC = 0.12;   // wind-up (frame 1)
const ATK_SWING = 0.10;   // mid-swing (frame 2)
const ATK_FOLLOW = 0.18;  // follow-through (frame 3) + settle back
const ATK_TOTAL = ATK_ANTIC + ATK_SWING + ATK_FOLLOW;

// Get the correct swing frame image for a croc during attack
function getSwingFrame(c){
  if(c.atkAnim <= 0) return null; // not attacking → use idle sprite
  const progress = 1 - c.atkAnim; // 0→1
  const anticEnd = ATK_ANTIC / ATK_TOTAL;
  const swingEnd = (ATK_ANTIC + ATK_SWING) / ATK_TOTAL;
  const key = c.charKey || 'gary';
  if(progress < anticEnd){
    return images[key + '_swing1']; // wind-up
  } else if(progress < swingEnd){
    return images[key + '_swing2']; // mid-swing
  } else {
    return images[key + '_swing3']; // follow-through
  }
}

// Easing functions
function easeOutBack(t){ const c1=1.70158, c3=c1+1; return 1+c3*Math.pow(t-1,3)+c1*Math.pow(t-1,2); }
function easeInCubic(t){ return t*t*t; }
function easeOutCubic(t){ return 1-Math.pow(1-t,3); }
function easeOutElastic(t){ const c4=TAU/3; return t===0?0:t===1?1:Math.pow(2,-10*t)*Math.sin((t*10-0.75)*c4)+1; }

// ─── DRAW CROC (Frame-Based Sprite Swap) ───
function drawCroc(c){
  // Choose sprite: swing frame during attack, else idle/skin sprite
  const swingImg = getSwingFrame(c);
  const idleImg = getSpriteForCroc(c);
  const img = swingImg || idleImg;

  ctx.save();
  const bobOff = c.grounded ? -c.stepBounce : 0;
  const cx = c.x+c.w/2, cy = c.y+c.h/2 + bobOff + c.headBob;
  ctx.translate(cx, cy);

  if(c.launched) ctx.rotate(c.launchRot);
  if(c.dead) ctx.rotate(c.deathRot);

  ctx.scale(c.face, 1);

  // Breathing
  const breathAmt = c.frozen ? 0 : Math.sin(c.breathCycle) * 0.018;
  ctx.scale(c.squash * (1+breathAmt), c.stretch * (1-breathAmt*0.6));

  // Body lean
  if(!c.launched && !c.dead && c.grounded) ctx.rotate(c.bodyLean);
  // Hit recoil
  if(c.hitRecoil !== 0 && !c.launched && !c.dead) ctx.rotate(c.hitRecoil);
  // Tornado / Dizzy
  if(c.tornadoAct) ctx.rotate((Date.now()/60)%TAU);
  if(c.dizzy) ctx.rotate(Math.sin(Date.now()*0.012)*0.15);

  if(c.hitFlash>0 && Math.floor(c.hitFlash*30)%2===0) ctx.globalAlpha=.35;
  if(c.stunned&&!c.launched) ctx.globalAlpha=.5+Math.sin(Date.now()*.02)*.2;

  // ─── AURAS (rage, comeback, speed, shield) ───
  const isRage = c.hp<=1 && c.alive && !c.dead && !c.launched;
  if(isRage){
    ctx.save(); ctx.globalAlpha=.3+Math.sin(Date.now()*0.006)*.15;
    const rG=ctx.createRadialGradient(0,0,40,0,0,200);
    rG.addColorStop(0,'rgba(255,30,0,.6)');rG.addColorStop(0.5,'rgba(255,80,0,.3)');rG.addColorStop(1,'transparent');
    ctx.fillStyle=rG;ctx.fillRect(-200,-200,400,400); ctx.restore();
  }
  if(c.comebackActive&&!isRage&&!c.dead&&!c.launched){
    ctx.save();ctx.globalAlpha=.28+Math.sin(c.comebackFlash)*.1;
    const aG=ctx.createRadialGradient(0,0,40,0,0,180);
    aG.addColorStop(0,'rgba(255,50,0,.4)');aG.addColorStop(1,'transparent');
    ctx.fillStyle=aG;ctx.fillRect(-180,-180,360,360);ctx.restore();
  }
  if(c.speedBoost>1&&!c.dead&&!c.launched){
    ctx.save();ctx.globalAlpha=.25+Math.sin(Date.now()*0.01)*.1;
    ctx.strokeStyle='#4ade80';ctx.lineWidth=3;ctx.shadowColor='#4ade80';ctx.shadowBlur=18;
    ctx.beginPath();ctx.arc(0,0,c.w*.65,0,TAU);ctx.stroke();ctx.shadowBlur=0;ctx.restore();
  }
  if(c.shieldActive&&!c.dead&&!c.launched){
    ctx.save();ctx.globalAlpha=.4+Math.sin(Date.now()*0.008)*.15;
    const sG=ctx.createRadialGradient(0,0,60,0,0,160);
    sG.addColorStop(0,'rgba(96,165,250,.15)');sG.addColorStop(1,'rgba(96,165,250,.4)');
    ctx.fillStyle=sG;ctx.beginPath();ctx.arc(0,0,150,0,TAU);ctx.fill();
    ctx.strokeStyle='#60a5fa';ctx.lineWidth=2.5;ctx.shadowColor='#60a5fa';ctx.shadowBlur=20;
    ctx.beginPath();ctx.arc(0,0,150,0,TAU);ctx.stroke();ctx.shadowBlur=0;ctx.restore();
  }

  // Drop shadow
  if(!c.launched){
    ctx.save();ctx.globalAlpha=.35;ctx.fillStyle='rgba(0,0,0,.6)';
    const sw=c.w*.4+(Math.abs(c.vx)>15?Math.sin(c.walkCycle*2)*8:0);
    ctx.beginPath();ctx.ellipse(0,c.h/2+8-bobOff-c.headBob,sw,14,0,0,TAU);ctx.fill();ctx.restore();
  }

  // ─── SPRITE DRAWING — SINGLE FULL-FRAME DRAW ───
  if(img){
    const drawW = c.w*1.12, drawH = c.h*1.08;

    // Motion blur ghost trails during mid-swing
    if(c.atkAnim > 0){
      const progress = 1 - c.atkAnim;
      const anticEnd = ATK_ANTIC / ATK_TOTAL;
      const swingEnd = (ATK_ANTIC + ATK_SWING) / ATK_TOTAL;
      if(progress >= anticEnd * 0.7 && progress < swingEnd + 0.12){
        // Draw ghost trails behind current frame
        const ghostFrames = [images[(c.charKey||'gary')+'_swing1'], images[(c.charKey||'gary')+'_swing2']];
        for(let g=ghostFrames.length-1; g>=0; g--){
          const gImg = ghostFrames[g];
          if(!gImg) continue;
          const ghostAlpha = (1 - (g+1)/3) * 0.15;
          ctx.save();
          ctx.globalAlpha = ghostAlpha;
          ctx.drawImage(gImg, -drawW/2 - (g+1)*6, -drawH/2, drawW, drawH);
          ctx.restore();
        }
      }
    }

    // Main sprite draw — full frame (no clipping!)
    ctx.drawImage(img, -drawW/2, -drawH/2, drawW, drawH);

    // === SWING ARC FX ===
    if(c.atkAnim > 0){
      const progress = 1 - c.atkAnim;
      const anticEnd = ATK_ANTIC / ATK_TOTAL;
      const swingEnd = (ATK_ANTIC + ATK_SWING) / ATK_TOTAL;
      if(progress >= anticEnd * 0.5 && progress < swingEnd + 0.1){
        ctx.save();
        const intensity = progress < swingEnd
          ? easeInCubic((progress - anticEnd*0.5) / (swingEnd - anticEnd*0.5))
          : 1 - (progress-swingEnd)/0.1;
        ctx.globalAlpha = clamp(intensity * 0.7, 0, 0.7);
        // Arc swoosh at the pillow area
        const arcCX = drawW * 0.2 * c.face;
        const arcCY = -drawH * 0.15;
        const arcR = drawW * 0.5;
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.lineWidth = 6 + intensity * 8;
        ctx.lineCap = 'round';
        ctx.shadowColor = '#fff'; ctx.shadowBlur = 24;
        ctx.beginPath();
        ctx.arc(arcCX, arcCY, arcR, -0.8, 0.6);
        ctx.stroke();
        // Impact sparkle
        if(intensity > 0.5){
          ctx.globalAlpha = intensity;
          ctx.fillStyle = '#fff';
          const tipX = arcCX + Math.cos(0.6) * arcR;
          const tipY = arcCY + Math.sin(0.6) * arcR;
          ctx.beginPath(); ctx.arc(tipX, tipY, 6+intensity*14, 0, TAU); ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,200,0.7)'; ctx.lineWidth = 2;
          for(let r=0; r<5; r++){
            const a = r * TAU/5 + Date.now()*0.01;
            ctx.beginPath();
            ctx.moveTo(tipX+Math.cos(a)*10, tipY+Math.sin(a)*10);
            ctx.lineTo(tipX+Math.cos(a)*(18+intensity*8), tipY+Math.sin(a)*(18+intensity*8));
            ctx.stroke();
          }
        }
        ctx.shadowBlur = 0;
        ctx.restore();
      }
    }

    // Dash trail (uses current sprite)
    if(c.dashing){
      ctx.globalAlpha=.12;
      for(let tr=1;tr<=3;tr++) ctx.drawImage(img,-drawW/2-tr*28*c.face,-drawH/2,drawW,drawH);
      ctx.globalAlpha=1;
    }
  }

  // ─── OVERLAY FX (frozen, parry, tornado, dizzy, stun, etc.) ───
  if(c.frozen){
    ctx.save();
    const crackA=clamp(1-(c.frozenT/3),0,1);
    ctx.globalAlpha=0.75-crackA*0.3;
    const iceG=ctx.createLinearGradient(-c.w/2,-c.h/2,c.w/2,c.h/2);
    iceG.addColorStop(0,'rgba(219,234,254,0.9)');iceG.addColorStop(0.5,'rgba(147,197,253,0.75)');iceG.addColorStop(1,'rgba(96,165,250,0.9)');
    ctx.fillStyle=iceG;ctx.strokeStyle='rgba(255,255,255,0.7)';ctx.lineWidth=3;
    ctx.shadowColor='#93c5fd';ctx.shadowBlur=20;
    ctx.beginPath();ctx.roundRect(-c.w/2*1.05,-c.h/2*1.05,c.w*1.1,c.h*1.1,8);ctx.fill();ctx.stroke();
    if(crackA>0.4){
      ctx.globalAlpha=crackA;ctx.strokeStyle='rgba(255,255,255,0.9)';ctx.lineWidth=2;ctx.shadowBlur=0;
      ctx.beginPath();ctx.moveTo(-c.w*0.3,-c.h*0.4);ctx.lineTo(c.w*0.1,c.h*0.1);ctx.lineTo(-c.w*0.1,c.h*0.4);ctx.stroke();
      ctx.beginPath();ctx.moveTo(c.w*0.2,-c.h*0.2);ctx.lineTo(-c.w*0.05,c.h*0.2);ctx.stroke();
    }
    ctx.shadowBlur=0;ctx.restore();
  }
  if(c.parrying){
    ctx.save();
    const pG=ctx.createRadialGradient(0,0,c.w*.45,0,0,c.w*.75);
    pG.addColorStop(0,'rgba(139,92,246,.1)');pG.addColorStop(1,'rgba(139,92,246,.3)');
    ctx.fillStyle=pG;ctx.beginPath();ctx.arc(0,0,c.w*.75,0,TAU);ctx.fill();
    ctx.strokeStyle='#a78bfa';ctx.lineWidth=2.5;ctx.shadowColor='#a78bfa';ctx.shadowBlur=18;
    ctx.beginPath();ctx.arc(0,0,c.w*.75,0,TAU);ctx.stroke();ctx.shadowBlur=0;ctx.restore();
  }
  if(c.tornadoAct){
    ctx.save();ctx.globalAlpha=.5;
    const tt=Date.now()/70;
    for(let r=0;r<4;r++){
      ctx.strokeStyle=r%2?'#ffd740':'#fff';ctx.lineWidth=2.5;
      ctx.shadowColor='#ffd740';ctx.shadowBlur=10;
      ctx.beginPath();ctx.arc(0,0,c.w*.52+r*20,tt+r,tt+r+4.2);ctx.stroke();
    }
    ctx.shadowBlur=0;ctx.restore();
  }
  if(c.tailAct){
    ctx.save();ctx.globalAlpha=.7;
    const tAngle=(Date.now()/30)%TAU;
    ctx.strokeStyle=c===p1?'#4ade80':'#f472b6';
    ctx.lineWidth=8;ctx.lineCap='round';
    ctx.shadowColor=ctx.strokeStyle;ctx.shadowBlur=24;
    ctx.beginPath();ctx.arc(0,c.h*.1,TAIL_RANGE*.55,tAngle,tAngle+2.5);
    ctx.stroke();ctx.shadowBlur=0;ctx.restore();
  }
  if(c.dizzy&&!c.launched){
    ctx.fillStyle='#ffd740';ctx.shadowColor='#ffd740';ctx.shadowBlur=6;
    for(let i=0;i<5;i++){
      const sa=Date.now()*0.004+i*1.256;
      ctx.save();ctx.translate(Math.cos(sa)*50,-c.h/2-18+Math.sin(sa)*12);ctx.rotate(sa*2);
      drawStar5(ctx,0,0,8,3.5);ctx.restore();
    }
    ctx.shadowBlur=0;
  }
  if(c.stunned&&!c.launched&&!c.frozen){
    ctx.fillStyle='#ffd740';ctx.shadowColor='#ffd740';ctx.shadowBlur=5;
    for(let i=0;i<4;i++){
      const sa=Date.now()*.005+i*1.57;
      ctx.save();ctx.translate(Math.cos(sa)*42,-c.h/2-14+Math.sin(sa)*10);ctx.rotate(sa*2);
      drawStar5(ctx,0,0,8,3.5);ctx.restore();
    }
    ctx.shadowBlur=0;
  }
  if(c.doubleDmg&&!c.dead){
    ctx.save();ctx.globalAlpha=0.7+Math.sin(Date.now()*0.01)*0.2;
    ctx.fillStyle='#f472b6';ctx.font='bold 16px Fredoka,sans-serif';
    ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.shadowColor='#f472b6';ctx.shadowBlur=10;
    ctx.fillText('x2',0,-c.h/2-30);ctx.shadowBlur=0;ctx.restore();
  }
  if(c.lightningCloud&&c.lightningCloud>0){
    ctx.save();ctx.globalAlpha=c.lightningCloud*0.85;
    ctx.fillStyle='#374151';ctx.shadowColor='#ffd740';ctx.shadowBlur=15;
    ctx.beginPath();
    const cloudX=0,cloudY=-c.h/2-70;
    ctx.arc(cloudX,cloudY,45,0,TAU);
    ctx.arc(cloudX-35,cloudY+12,32,0,TAU);
    ctx.arc(cloudX+35,cloudY+12,32,0,TAU);
    ctx.fill();ctx.shadowBlur=0;ctx.restore();
  }

  ctx.shadowBlur=0;ctx.restore();
}

// ─── CROC CONSTRUCTOR ───
let loadout = { p1:{power1:'freeze',power2:'sax',skin:'default'}, p2:{power1:'lightning',power2:'mystery',skin:'default'} };

function mkCroc(x,face,name,charKey){
  return {x,y:FLOOR_Y-CH,vx:0,vy:0,w:CW,h:CH,face,name,charKey,skin:'default',
    hp:MAX_HP,wins:0,alive:true,grounded:true,
    atk:false,atkT:0,atkCD:0,
    dashing:false,dashT:0,dashCD:0,dashDir:0,
    tornadoAct:false,tornadoT:0,tornadoCD:0,
    tailAct:false,tailT:0,tailCD:0,
    parrying:false,parryT:0,parryCD:0,parryOK:false,
    launched:false,launchVy:0,launchVx:0,launchSpin:0,launchRot:0,launchTimer:0,launchIsKO:false,
    launchCD:0,
    stunned:false,stunT:0,
    frozen:false,frozenT:0,frozenCracks:0,
    dizzy:false,dizzyT:0,dizzyAngle:0,
    hitFlash:0,squash:1,stretch:1,
    combo:0,comboT:0,maxCombo:0,totalDmg:0,hits:0,parryCount:0,
    comebackActive:false,comebackFlash:0,
    dead:false,deathVx:0,deathVy:0,deathBounces:0,deathRot:0,deathRotV:0,
    bufAtk:false,bufParry:false,
    // Special powers
    power1:'freeze',power2:'sax',
    pow1CD:0,pow2CD:0,
    // Buffs
    speedBoost:1,speedBoostT:0,
    shieldActive:false,
    doubleDmg:false,
    // Rage
    rageSuperUsed:false,
    // Lightning cloud anim
    lightningCloud:0,
    // ─── PROCEDURAL ANIMATION STATE ───
    animT:0,           // master animation clock
    walkCycle:0,       // walk cycle phase (radians)
    breathCycle:0,     // idle breathing phase
    armAngle:0,        // current arm/pillow swing angle
    armTarget:0,       // arm target angle (for smooth interp)
    bodyLean:0,        // forward lean when moving
    headBob:0,         // vertical bob offset
    legPhaseL:0,       // left leg phase
    legPhaseR:Math.PI, // right leg phase (opposite)
    hitRecoil:0,       // hit recoil rotation
    stepBounce:0,      // vertical bounce from walking
    atkAnim:0,         // frame-based attack animation timer (1→0)
  };
}
function resetC(c,x){
  c.x=x;c.y=FLOOR_Y-CH;c.vx=0;c.vy=0;c.hp=MAX_HP;c.alive=true;c.grounded=true;
  c.atk=false;c.atkT=0;c.atkCD=0;c.dashing=false;c.dashT=0;c.dashCD=0;
  c.tornadoAct=false;c.tornadoT=0;c.tornadoCD=0;
  c.tailAct=false;c.tailT=0;c.tailCD=0;
  c.parrying=false;c.parryT=0;c.parryCD=0;c.parryOK=false;
  c.launched=false;c.launchVy=0;c.launchVx=0;c.launchSpin=0;c.launchRot=0;c.launchIsKO=false;
  c.launchCD=0;
  c.stunned=false;c.stunT=0;
  c.frozen=false;c.frozenT=0;c.frozenCracks=0;
  c.dizzy=false;c.dizzyT=0;c.dizzyAngle=0;
  c.hitFlash=0;c.squash=1;c.stretch=1;
  c.combo=0;c.comboT=0;c.maxCombo=0;c.totalDmg=0;c.hits=0;c.parryCount=0;
  c.comebackActive=false;c.comebackFlash=0;
  c.dead=false;c.deathVx=0;c.deathVy=0;c.deathBounces=0;c.deathRot=0;c.deathRotV=0;
  c.bufAtk=false;c.bufParry=false;
  c.pow1CD=0;c.pow2CD=0;
  c.speedBoost=1;c.speedBoostT=0;
  c.shieldActive=false;c.doubleDmg=false;
  c.rageSuperUsed=false;
  c.lightningCloud=0;
  // Reset animation state
  c.animT=0;c.walkCycle=0;c.breathCycle=0;c.armAngle=0;c.armTarget=0;
  c.bodyLean=0;c.headBob=0;c.legPhaseL=0;c.legPhaseR=Math.PI;
  c.hitRecoil=0;c.stepBounce=0;c.atkAnim=0;
}

// ─── MELEE DAMAGE ───
function dealMeleeDmg(atk,vic,dir,heavy,isTail){
  if(vic.launched) return;
  if(vic.frozen) return; // can't be hit while frozen (handled by freeze expiry)
  if(vic.shieldActive&&heavy){ vic.shieldActive=false; sfxParry(); fText(vic.x+vic.w/2,vic.y-60,'BLOCKED!','#60a5fa',30,1.2); return; }
  if(vic.parrying&&vic.parryT>0){
    vic.parryOK=true;atk.stunned=true;atk.stunT=PARRY_STUN;
    hitStop(HS_PARRY);addTrauma(.38);screenFlash('rgba(139,92,246,.3)');
    sfxParry();sparks(vic.x+vic.w/2,vic.y+vic.h/2,24,'#a78bfa');
    shockwave(vic.x+vic.w/2,vic.y+vic.h/2,'rgba(139,92,246,.5)');
    lightningBolt(vic.x+vic.w/2-50,vic.y-20,vic.x+vic.w/2+50,vic.y+vic.h);
    fText(vic.x+vic.w/2,vic.y-55,pick(PARRY_LINES),'#a78bfa',30);
    vic.parryCount++;chromAb=.4;
    return;
  }
  vic.hitFlash=.14;
  vic.hitRecoil = dir * 0.35; // Snap hit recoil animation
  const spd = atk.speedBoost>1 ? 1.3 : 1;
  vic.vx=dir*KB*(heavy?1.5:1)*spd;vic.vy=KB_UP*(heavy?1.2:1);vic.grounded=false;
  vic.combo=0;vic.comboT=0;
  atk.combo++;atk.comboT=1.5;atk.hits++;
  if(atk.combo>atk.maxCombo)atk.maxCombo=atk.combo;

  if(isTail){
    hitStop(HS_TAIL);addTrauma(.55);
    feathers(vic.x+vic.w/2,vic.y+vic.h/2,20,'#fff');
    embers(vic.x+vic.w/2,vic.y+vic.h/2,10);
    shockwave(vic.x+vic.w/2,vic.y+vic.h/2,'rgba(255,200,0,.6)');
    screenFlash('rgba(255,200,0,.2)',.12);chromAb=.35;bloomInt=.45;
    fText(vic.x+vic.w/2,vic.y-55,pick(TAIL_WORDS),'#06b6d4',34,1.2);
  } else if(heavy){
    hitStop(HS_HEAVY);addTrauma(.45);
    feathers(vic.x+vic.w/2,vic.y+vic.h/2,16,'#fff');
    embers(vic.x+vic.w/2,vic.y+vic.h/2,7);
    shockwave(vic.x+vic.w/2,vic.y+vic.h/2);
    screenFlash('rgba(255,255,255,.15)',.08);chromAb=.25;
  } else {
    hitStop(HS_LIGHT);addTrauma(.2+atk.combo*.02);
    feathers(vic.x+vic.w/2,vic.y+vic.h/2,8,'#fff');
    // Canvas brightness flash for melee
    screenFlash('rgba(255,255,255,0.08)',0.04);
  }
  sfxHit(atk.combo);
  fText(vic.x+vic.w/2+rand(-22,22),vic.y-12,`${pick(DMG_WORDS)}!`,'#fff',22);
  if(COMBO_MS[atk.combo]){
    slam(COMBO_MS[atk.combo],'#ffd740',1);sfxCombo(atk.combo);stars(atk.x+atk.w/2,atk.y,10);bloomInt=.5;
  }
}

// ─── USE SPECIAL POWER ───
function useSpecialPower(c, o, powerName){
  const def = POWERS[powerName];
  if(!def) return;

  if(powerName === 'freeze'){
    spawnFreezeBall(c, c.face);
    fText(c.x+c.w/2, c.y-60, 'FREEZE BALL!', '#93c5fd', 30, 1.2);
  } else if(powerName === 'sax'){
    spawnSaxWave(c, c.face);
    fText(c.x+c.w/2, c.y-60, 'SAXOPHONE!', '#ffd740', 30, 1.2);
    playSpecialVideo('video/special-saxophone.mp4', 2500);
  } else if(powerName === 'lightning'){
    c.lightningCloud = 0.8;
    doLightningStrike(c, o);
    fText(c.x+c.w/2, c.y-60, 'LIGHTNING!', '#ffd740', 30, 1.2);
  } else if(powerName === 'mystery'){
    spawnMysteryBox();
    fText(c.x+c.w/2, c.y-60, 'MYSTERY BOX!', '#ffd740', 30, 1.2);
    sfxMystery();
  } else if(powerName === 'tornado'){
    c.tornadoAct=true;c.tornadoT=0.65;c.tornadoCD=POWERS.tornado.cd;
    sfxSpecial();slam('TORNADO!!',c===p1?'#4ade80':'#f472b6',.8);bloomInt=.4;
  } else if(powerName === 'tailwhip'){
    c.tailAct=true;c.tailT=.3;c.tailCD=0;sfxTailWhip();
    c.squash=1.35;c.stretch=.65;
    setTimeout(()=>{
      if(!c.alive||!o.alive||o.launched)return;
      const tcx=c.x+c.w/2,tcy=c.y+c.h/2;
      if(dist(tcx,tcy,o.x+o.w/2,o.y+o.h/2)<TAIL_RANGE)dealMeleeDmg(c,o,c.face,true,true);
    },100);
  } else if(powerName === 'shotgun'){
    spawnShotgunPillows(c, c.face);
    fText(c.x+c.w/2, c.y-60, pick(SHOTGUN_WORDS), '#ffd740', 32, 1.2);
    slam('PILLOW SHOTGUN!!','#ffd740',1);
    bloomInt=0.4;
  } else if(powerName === 'uppercut'){
    doPillowUppercut(c, o);
    fText(c.x+c.w/2, c.y-60, pick(UPPERCUT_WORDS), '#ff9100', 32, 1.2);
  } else if(powerName === 'boomerang'){
    spawnBoomerangPillow(c, c.face);
    fText(c.x+c.w/2, c.y-60, pick(BOOMERANG_WORDS), '#a78bfa', 32, 1.2);
    slam('BOOMERANG!!','#a78bfa',1);
  } else if(powerName === 'rapidfire'){
    spawnRapidFirePillows(c, c.face);
    fText(c.x+c.w/2, c.y-60, pick(RAPIDFIRE_WORDS), '#ff6b35', 32, 1.2);
    slam('RAPID FIRE!!','#ff6b35',1);
    bloomInt=0.3;
  }
}

// ─── MEGA PILLOW BOMB (Desperation Super) ───
function megaPillowBomb(attacker, victim){
  attacker.rageSuperUsed = true;
  sfxMegaBomb();
  addTrauma(1.0);
  hitStop(0.3);
  screenFlash('rgba(255,100,255,0.6)',0.3);
  slam('MEGA PILLOW BOMB!!','#f472b6',2);
  bloomInt=1;chromAb=0.8;
  // Giant explosion
  feathers(attacker.x+attacker.w/2,attacker.y+attacker.h/2,100,'#fff');
  sparks(attacker.x+attacker.w/2,attacker.y+attacker.h/2,50,'#f472b6');
  stars(attacker.x+attacker.w/2,attacker.y+attacker.h/2,30);
  shockwave(attacker.x+attacker.w/2,attacker.y+attacker.h/2,'rgba(244,114,182,0.8)');
  shockwave(attacker.x+attacker.w/2,attacker.y+attacker.h/2,'rgba(255,255,255,0.6)');
  // Giant pillow projectile
  const face = attacker.face;
  const px = attacker.x+attacker.w/2+face*60, py = attacker.y+attacker.h*0.35;
  projectiles.push({x:px,y:py,vx:face*600,vy:-80,w:120,h:90,owner:attacker,face,alive:true,rot:0,trail:[],type:'pillow',isDouble:true,isMega:true});
  fText(attacker.x+attacker.w/2, attacker.y-70, 'MEGA BOMB!!', '#f472b6', 44, 2);
}

// ─── UPDATE CROC ───
function updateCroc(c,inp,o,dt){
  if(c.launched){updateLaunched(c,dt);return}

  c.atkCD=Math.max(0,c.atkCD-dt);
  c.dashCD=Math.max(0,c.dashCD-dt);
  c.tornadoCD=Math.max(0,c.tornadoCD-dt);
  c.tailCD=Math.max(0,c.tailCD-dt);
  c.parryCD=Math.max(0,c.parryCD-dt);
  c.hitFlash=Math.max(0,c.hitFlash-dt);
  c.launchCD=Math.max(0,c.launchCD-dt);
  c.pow1CD=Math.max(0,c.pow1CD-dt);
  c.pow2CD=Math.max(0,c.pow2CD-dt);
  c.squash=lerp(c.squash,1,dt*10);
  c.stretch=lerp(c.stretch,1,dt*10);
  c.comboT=Math.max(0,c.comboT-dt);if(c.comboT<=0)c.combo=0;

  // Lightning cloud decay
  if(c.lightningCloud>0) c.lightningCloud=Math.max(0,c.lightningCloud-dt*2.5);

  // Frozen update
  if(c.frozen){
    c.frozenT-=dt;
    if(c.frozenT<=0){ c.frozen=false; fText(c.x+c.w/2,c.y-60,'FREE!','#93c5fd',28,1); }
    // Frozen croc can't do anything
    c.vx*=0.8;c.vy+=GRAVITY*dt;c.y+=c.vy*dt;
    if(c.y+c.h>FLOOR_Y){c.y=FLOOR_Y-c.h;c.vy=0;c.grounded=true}
    c.x=clamp(c.x,10,AW-c.w-10);
    return;
  }

  // Dizzy update
  if(c.dizzy){ c.dizzyT-=dt; c.dizzyAngle=Math.sin(Date.now()*0.015)*0.18; if(c.dizzyT<=0){c.dizzy=false;c.dizzyAngle=0;} }

  // Speed boost decay
  if(c.speedBoostT>0){ c.speedBoostT-=dt; if(c.speedBoostT<=0){c.speedBoost=1;} }

  // Mystery box proximity check
  if(mysteryBox && inp.power1 && c.pow1CD<=0 && POWERS[c.power1]?.name==='Mystery Box'){
    checkMysteryPickup(c, o);
  }
  if(mysteryBox && inp.power2 && c.pow2CD<=0 && POWERS[c.power2]?.name==='Mystery Box'){
    checkMysteryPickup(c, o);
  }

  const wasCB=c.comebackActive;
  c.comebackActive=c.hp<=COMEBACK_TH&&c.alive;
  if(c.comebackActive&&!wasCB){sfxComeback();fText(c.x+c.w/2,c.y-60,pick(COMEBACK_LINES),'#ff3d00',30);vignette('rgba(255,0,0,.25)',.5)}
  if(c.comebackActive)c.comebackFlash+=dt*6;

  // Rage mode trigger
  if(c.hp<=1&&!c.rageModeShown&&c.alive){
    c.rageModeShown=true;
    slam('RAGE MODE!!','#ff0000',1.8);
    sfxRage();
    addTrauma(0.6);
    screenFlash('rgba(255,0,0,0.3)',0.2);
    vignette('rgba(255,0,0,.4)',0.8);
  }

  const rageSpeedMult = (c.hp<=1&&c.alive) ? 1.2 : 1;
  const rageAtkMult  = (c.hp<=1&&c.alive) ? 1.3 : 1;

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
  if(c.dizzy) mx *= (0.5+Math.sin(Date.now()*0.01)*0.5); // wobbly movement

  if(inp.up&&c.grounded){c.vy=JUMP_VEL;c.grounded=false;c.squash=.55;c.stretch=1.45;sfxBounce();shockwave(c.x+c.w/2,c.y+c.h)}

  const spd = MOVE_SPD * c.speedBoost * rageSpeedMult;
  if(c.dashing){c.dashT-=dt;c.vx=c.dashDir*DASH_SPD;if(c.dashT<=0)c.dashing=false}
  else if(!c.tornadoAct&&!c.tailAct) c.vx=mx*spd;

  // Attack (melee smack) — skeletal arm swing animation
  if(inp.attack&&c.atkCD<=0&&!c.atk&&!c.tornadoAct&&!c.parrying&&!c.tailAct){
    c.atk=true;c.atkT=ATK_TOTAL;c.atkAnim=1.0;c.atkCD=ATK_CD/rageAtkMult;sfxHit(c.combo);
    c.squash=1.15;c.stretch=.88;
    c._hitChecked=false; // delay hit check to swing phase
  }
  if(c.atk){
    c.atkT-=dt;c.atkAnim=clamp(c.atkT/ATK_TOTAL,0,1);
    // Check hit during the swing phase (after anticipation)
    if(!c._hitChecked && c.atkAnim < 1-(ATK_ANTIC/ATK_TOTAL)){
      c._hitChecked=true;
      const acx=c.x+c.w/2+c.face*90,acy=c.y+c.h/2;
      if(dist(acx,acy,o.x+o.w/2,o.y+o.h/2)<ATK_RANGE&&o.alive&&!o.launched)dealMeleeDmg(c,o,c.face,false,false);
    }
    if(c.atkT<=0){c.atk=false;c.atkAnim=0;}
  }

  // PILLOW LAUNCH
  if(inp.launch&&c.launchCD<=0&&!c.tornadoAct&&!c.tailAct&&!c.atk&&!c.parrying&&!c.dashing){
    c.launchCD=LAUNCH_CD;
    c.squash=.7;c.stretch=1.35;
    spawnPillow(c, c.face, c.doubleDmg);
    if(c.doubleDmg) c.doubleDmg=false;
  }

  // Parry
  if(inp.parry&&c.parryCD<=0&&!c.parrying&&!c.atk&&!c.tornadoAct&&!c.tailAct){c.parrying=true;c.parryT=PARRY_WIN;c.parryOK=false;c.parryCD=0}

  // Dash (belly bounce)
  if(inp.dash&&c.dashCD<=0&&!c.dashing&&!c.tornadoAct&&!c.tailAct){
    c.dashing=true;c.dashT=DASH_DUR;c.dashCD=DASH_CD;c.dashDir=c.face;c.squash=1.45;c.stretch=.55;sfxDash();
    setTimeout(()=>{if(!c.alive||!o.alive||o.launched)return;if(dist(c.x+c.w/2,c.y+c.h/2,o.x+o.w/2,o.y+o.h/2)<100)dealMeleeDmg(c,o,c.dashDir,true,false)},70);
  }

  // Tornado
  if(c.tornadoAct){
    c.tornadoT-=dt;c.vx=c.face*160;
    if(dist(c.x+c.w/2,c.y+c.h/2,o.x+o.w/2,o.y+o.h/2)<110&&o.alive&&!o.launched&&Math.random()<dt*8)dealMeleeDmg(c,o,c.face,false,false);
    feathers(c.x+c.w/2+rand(-22,22),c.y+c.h/2+rand(-14,14),1,c===p1?'#4ade80':'#f472b6');
    if(c.tornadoT<=0)c.tornadoAct=false;
  }

  // POWER 1
  if(inp.power1&&c.pow1CD<=0&&!c.parrying){
    // Check rage super (both powers at same time at 1 HP)
    if(inp.power2&&c.hp<=1&&!c.rageSuperUsed){
      megaPillowBomb(c,o);
    } else if(c.power1!=='mystery'||(c.power1==='mystery'&&!mysteryBox)){
      const def=POWERS[c.power1];
      if(def){ c.pow1CD=def.cd; useSpecialPower(c,o,c.power1); }
    } else if(c.power1==='mystery'&&mysteryBox){
      checkMysteryPickup(c,o);
    }
  }
  // POWER 2
  if(inp.power2&&c.pow2CD<=0&&!c.parrying&&!inp.power1){
    if(c.power2!=='mystery'||(c.power2==='mystery'&&!mysteryBox)){
      const def=POWERS[c.power2];
      if(def){ c.pow2CD=def.cd; useSpecialPower(c,o,c.power2); }
    } else if(c.power2==='mystery'&&mysteryBox){
      checkMysteryPickup(c,o);
    }
  }

  c.vy+=GRAVITY*dt;c.x+=c.vx*dt;c.y+=c.vy*dt;
  if(c.y+c.h>FLOOR_Y){c.y=FLOOR_Y-c.h;if(c.vy>130){c.squash=1.3;c.stretch=.7;sfxBounce();shockwave(c.x+c.w/2,FLOOR_Y)}c.vy=0;c.grounded=true}
  c.x=clamp(c.x,10,AW-c.w-10);
  if(!c.dashing&&!c.tornadoAct&&!c.tailAct)c.face=(o.x+o.w/2>c.x+c.w/2)?1:-1;

  // ─── PROCEDURAL ANIMATION TICK ───
  c.animT += dt;
  const isMoving = Math.abs(c.vx) > 15;
  const walkSpeed = Math.abs(c.vx) / 120; // normalized 0-1+

  // Walk cycle — advances when moving
  if(isMoving && c.grounded){
    c.walkCycle += dt * 10 * Math.min(walkSpeed, 1.8);
    c.legPhaseL = c.walkCycle;
    c.legPhaseR = c.walkCycle + Math.PI;
    c.stepBounce = Math.abs(Math.sin(c.walkCycle)) * 6 * Math.min(walkSpeed, 1);
    c.bodyLean = lerp(c.bodyLean, clamp(c.vx * 0.0008, -0.12, 0.12), dt * 8);
  } else {
    c.stepBounce = lerp(c.stepBounce, 0, dt * 12);
    c.bodyLean = lerp(c.bodyLean, 0, dt * 6);
    c.legPhaseL = lerp(c.legPhaseL, 0, dt * 5);
    c.legPhaseR = lerp(c.legPhaseR, Math.PI, dt * 5);
  }

  // Breathing — always ticks (slower when idle, faster in rage)
  const breathRate = (c.hp <= 1 && c.alive) ? 4.5 : (isMoving ? 3.0 : 1.8);
  c.breathCycle += dt * breathRate;

  // Arm swing — tracks attack, idle sway, or walking arm pump
  if(c.atk && c.atkT > 0){
    c.armTarget = -0.65; // big swing forward
  } else if(isMoving && c.grounded){
    c.armTarget = Math.sin(c.walkCycle) * 0.25 * Math.min(walkSpeed, 1);
  } else {
    c.armTarget = Math.sin(c.breathCycle * 0.7) * 0.06;
  }
  c.armAngle = lerp(c.armAngle, c.armTarget, dt * 18);

  // Head bob — vertical oscillation
  if(isMoving && c.grounded){
    c.headBob = Math.sin(c.walkCycle * 2) * 3 * Math.min(walkSpeed, 1);
  } else {
    c.headBob = Math.sin(c.breathCycle) * 1.5;
  }

  // Hit recoil — snaps then decays
  c.hitRecoil = lerp(c.hitRecoil, 0, dt * 10);

  // Crowd ambience scales with combo
  setCrowdVolume(0.04 + clamp(c.combo/20,0,1)*0.1);
}

// ─── AI ───
function getAI(ai,tgt){
  const inp={left:0,right:0,up:0,attack:0,dash:0,parry:0,tailwhip:0,launch:0,power1:0,power2:0};
  const dx=tgt.x-ai.x,adx=Math.abs(dx);

  // Movement — approach but sometimes back off
  if(adx>220){if(dx>0)inp.right=1;else inp.left=1}
  else if(adx<80){if(dx>0)inp.left=1;else inp.right=1}

  if(ai.grounded&&Math.random()<0.003)inp.up=1;
  if(adx<110&&ai.atkCD<=0&&Math.random()<0.06)inp.attack=1;
  if(tgt.atk&&tgt.atkT>.12&&adx<100&&ai.parryCD<=0&&Math.random()<0.02)inp.parry=1;
  if(adx<180&&adx>80&&ai.dashCD<=0&&Math.random()<0.006)inp.dash=1;
  if(ai.launchCD<=0&&adx<300&&Math.random()<0.003)inp.launch=1;
  if(ai.hp<=2&&adx<120){inp.left=dx>0?1:0;inp.right=dx<0?1:0}

  // Special powers — use them actively
  const pow1Name = ai.power1;
  const pow2Name = ai.power2;
  // Ranged powers used more from distance, melee powers used close
  const rangedPowers = ['freeze','sax','lightning','shotgun','boomerang','rapidfire'];
  const meleePowers = ['tornado','tailwhip','uppercut'];
  if(ai.pow1CD<=0){
    const isRanged = rangedPowers.includes(pow1Name);
    const isMelee = meleePowers.includes(pow1Name);
    const chance = (isRanged && adx > 150 && adx < 400) ? 0.006 :
                   (isMelee && adx < 180) ? 0.005 :
                   (pow1Name==='mystery' && !mysteryBox) ? 0.003 : 0.002;
    if(Math.random()<chance) inp.power1=1;
  }
  if(ai.pow2CD<=0&&!inp.power1){
    const isRanged = rangedPowers.includes(pow2Name);
    const isMelee = meleePowers.includes(pow2Name);
    const chance = (isRanged && adx > 150 && adx < 400) ? 0.005 :
                   (isMelee && adx < 180) ? 0.004 :
                   (pow2Name==='mystery' && !mysteryBox) ? 0.002 : 0.002;
    if(Math.random()<chance) inp.power2=1;
  }

  // Mystery box pickup if nearby
  if(mysteryBox&&dist(ai.x+ai.w/2,ai.y+ai.h/2,mysteryBox.x,mysteryBox.y)<150&&Math.random()<0.02){
    if(dx>0)inp.right=1;else inp.left=1;
  }

  return inp;
}

// ─── GAME STATE ───
let state='title',isAI=false,isOnline=false,amHost=false,p1,p2,roundTimer,roundNum,cdTimer,lastTS=0,gameTime=0,matchStats={};
let pendingIsAI = false;
let remoteInput = {left:false,right:false,up:false,attack:false,dash:false,parry:false,launch:false,power1:false,power2:false};
let lastSentInput = '';

function initP(){
  p1=mkCroc(160,1,'Gator Gary','gary');
  p1.power1=loadout.p1.power1;
  p1.power2=loadout.p1.power2;
  p1.skin=loadout.p1.skin;
  p2=mkCroc(AW-160-CW,-1,'Croc Carl','carl');
  p2.power1=loadout.p2.power1;
  p2.power2=loadout.p2.power2;
  p2.skin=loadout.p2.skin;
}
function resetRound(){
  resetC(p1,160);resetC(p2,AW-160-CW);
  // Reapply loadout
  p1.power1=loadout.p1.power1;p1.power2=loadout.p1.power2;p1.skin=loadout.p1.skin;
  p2.power1=loadout.p2.power1;p2.power2=loadout.p2.power2;p2.skin=loadout.p2.skin;
  roundTimer=ROUND_TIME;
  parts.length=0;floats.length=0;projectiles.length=0;
  mysteryBox=null;
  trauma=0;hsTimer=0;smTimer=0;slamTm=0;flashT=0;vigT=0;chromAb=0;bloomInt=0;
  hideVideo();
}
function startGame(ai){
  isAI=ai;initP();roundNum=1;
  matchStats={p1h:0,p2h:0,p1c:0,p2c:0,p1p:0,p2p:0,rds:0};
  // Online: use single-player touch (you control one croc)
  if(isOnline) showTouchControls(false);
  else showTouchControls(!ai); // 2P touch for PvP, single touch for AI
  startCD();
}
function startCD(){
  resetRound();state='countdown';cdTimer=2.2;
  slam(`Round ${roundNum}`,'#ffd740',1.5);sfxRound();
  $('hud').classList.remove('hidden');
  $('title-screen').classList.add('hidden');
  $('result-screen').classList.add('hidden');
  $('loadout-screen').classList.add('hidden');
  $('online-lobby').classList.add('hidden');
  updatePowerHUD();
  // Play fight narration
  setTimeout(()=>playNarr(narrFight),800);
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
  state='result';
  const w=p1.wins>=ROUNDS_TO_WIN?p1:p2;
  const wc=w===p1?'var(--p1)':'var(--p2)';
  $('res-winner').textContent=`🐊 ${w.name} ${pick(WIN_LINES)}`;
  $('res-winner').style.color=wc;
  $('res-score').textContent=`${p1.wins} — ${p2.wins}`;
  $('res-grid').innerHTML=`<div><div class="v">${matchStats.p1h}</div><div class="l">Gary Hits</div></div><div><div class="v">${matchStats.p2h}</div><div class="l">Carl Hits</div></div><div><div class="v">${matchStats.p1c}</div><div class="l">Gary Best Combo</div></div><div><div class="v">${matchStats.p2c}</div><div class="l">Carl Best Combo</div></div><div><div class="v">${matchStats.p1p}</div><div class="l">Gary Parries</div></div><div><div class="v">${matchStats.p2p}</div><div class="l">Carl Parries</div></div>`;
  // Play alternating winner cinematic finishing video
  playSpecialVideo(getKOVideo(w), 7000);
  // Show result screen after a short delay so video plays first
  setTimeout(() => { $('result-screen').classList.remove('hidden'); }, 800);

  // Win tracking
  const winner = isAI ? (w===p1?'p1':'ai') : (w===p1?'p1':'p2');
  if(winner==='p1'||(!isAI&&winner==='p2')){
    const {wins,streak} = addWin();
    $('res-streak').textContent=`🔥 ${streak} WIN STREAK  |  ${wins} TOTAL WINS`;
    $('res-streak').style.display='block';
  } else {
    resetStreak();
    $('res-streak').textContent='';
    $('res-streak').style.display='none';
  }
  updateTitleStreak();
}

// ─── POWER HUD UPDATE ───
function updatePowerHUD(){
  // Update touch power button labels — single-player controls
  const p1p1btn = document.getElementById('touch-power1');
  const p1p2btn = document.getElementById('touch-power2');
  if(p1p1btn&&p1){ const def=POWERS[p1.power1]; if(def){ p1p1btn.querySelector('.icon').textContent=def.icon; p1p1btn.querySelector('.plabel').textContent=def.name.split(' ')[0]; } }
  if(p1p2btn&&p1){ const def=POWERS[p1.power2]; if(def){ p1p2btn.querySelector('.icon').textContent=def.icon; p1p2btn.querySelector('.plabel').textContent=def.name.split(' ')[0]; } }
  // Update 2P touch power button labels
  const tp1p1 = document.getElementById('tp1-pow1');
  const tp1p2 = document.getElementById('tp1-pow2');
  const tp2p1 = document.getElementById('tp2-pow1');
  const tp2p2 = document.getElementById('tp2-pow2');
  if(tp1p1&&p1){ const d=POWERS[p1.power1]; if(d){ tp1p1.querySelector('.icon').textContent=d.icon; tp1p1.querySelector('.plabel').textContent=d.name.split(' ')[0]; } }
  if(tp1p2&&p1){ const d=POWERS[p1.power2]; if(d){ tp1p2.querySelector('.icon').textContent=d.icon; tp1p2.querySelector('.plabel').textContent=d.name.split(' ')[0]; } }
  if(tp2p1&&p2){ const d=POWERS[p2.power1]; if(d){ tp2p1.querySelector('.icon').textContent=d.icon; tp2p1.querySelector('.plabel').textContent=d.name.split(' ')[0]; } }
  if(tp2p2&&p2){ const d=POWERS[p2.power2]; if(d){ tp2p2.querySelector('.icon').textContent=d.icon; tp2p2.querySelector('.plabel').textContent=d.name.split(' ')[0]; } }
}

// ─── HUD ───
function updateHUD(){
  function pipHTML(hp,max,cls){let s='';for(let i=0;i<max;i++){s+=`<span class="pip ${cls} ${i<hp?'full':'empty'}"></span>`}return s}
  $('p1pips').innerHTML=pipHTML(p1.hp,MAX_HP,'p1pip');
  $('p2pips').innerHTML=pipHTML(p2.hp,MAX_HP,'p2pip');
  $('p1s').textContent=`Wins ${p1.wins}`;$('p2s').textContent=`Wins ${p2.wins}`;
  $('hround').textContent=`ROUND ${roundNum}`;
  const te=$('htimer');te.textContent=Math.ceil(Math.max(0,roundTimer));
  te.className=roundTimer<10?'htimer warn':'htimer';
  $('p1combo').textContent=p1.combo>=3?`${p1.combo} HIT COMBO`:'';
  $('p2combo').textContent=p2.combo>=3?`${p2.combo} HIT COMBO`:'';

  const p1cd=p1.launchCD>0?Math.ceil(p1.launchCD*10)/10:0;
  $('p1launch').textContent=p1cd>0?`🎯 ${p1cd.toFixed(1)}s`:'🎯 READY';
  $('p1launch').className='launch-cd'+(p1cd<=0?' ready':'');
  if(!isAI){
    const p2cd=p2.launchCD>0?Math.ceil(p2.launchCD*10)/10:0;
    $('p2launch').textContent=p2cd>0?`🎯 ${p2cd.toFixed(1)}s`:'🎯 READY';
    $('p2launch').className='launch-cd'+(p2cd<=0?' ready':'');
  } else {
    $('p2launch').textContent='';
  }

  // Rage mode indicator
  if(p1&&p1.hp<=1&&p1.alive) $('p1name').classList.add('rage'); else $('p1name')?.classList.remove('rage');
  if(p2&&p2.hp<=1&&p2.alive) $('p2name').classList.add('rage'); else $('p2name')?.classList.remove('rage');

  // Power cooldowns in HUD
  const p1def1=POWERS[p1?.power1]; const p1def2=POWERS[p1?.power2];
  $('p1pow1').textContent = p1&&p1def1 ? `${p1def1.icon} ${p1.pow1CD>0?p1.pow1CD.toFixed(1)+'s':'READY'}` : '';
  $('p1pow2').textContent = p1&&p1def2 ? `${p1def2.icon} ${p1.pow2CD>0?p1.pow2CD.toFixed(1)+'s':'READY'}` : '';
  if(!isAI){
    const p2def1=POWERS[p2?.power1]; const p2def2=POWERS[p2?.power2];
    $('p2pow1').textContent = p2&&p2def1 ? `${p2def1.icon} ${p2.pow1CD>0?p2.pow1CD.toFixed(1)+'s':'READY'}` : '';
    $('p2pow2').textContent = p2&&p2def2 ? `${p2def2.icon} ${p2.pow2CD>0?p2.pow2CD.toFixed(1)+'s':'READY'}` : '';
  }
}

// ─── INPUT MAPS ───
function getLocalP1(){
  return{
    left:keys.KeyA||ts.left,
    right:keys.KeyD||ts.right,
    up:jp.KeyW||ts.up,
    attack:jp.KeyF||ts.attack,
    dash:jp.KeyG||ts.dash,
    parry:jp.KeyR||ts.parry,
    launch:jp.KeyQ||ts.launch,
    power1:jp.Digit1||ts.power1,
    power2:jp.Digit2||ts.power2,
  };
}
function getLocalP2(){
  return{
    left:keys.ArrowLeft||ts2.left,
    right:keys.ArrowRight||ts2.right,
    up:jp.ArrowUp||ts2.up,
    attack:jp.KeyL||ts2.attack,
    dash:jp.KeyK||ts2.dash,
    parry:jp.KeyP||ts2.parry,
    launch:jp.KeyO||ts2.launch,
    power1:jp.Digit7||ts2.power1,
    power2:jp.Digit8||ts2.power2,
  };
}
function getP1(){
  // Online guest controls P1 locally (their croc appears as P1)
  if(isOnline && !amHost) return getLocalP1();
  return getLocalP1();
}
function getP2(){
  if(isAI) return getAI(p2,p1);
  // Online host: P2 is remote opponent
  if(isOnline && amHost) return remoteInput;
  // Online guest: they don't run sim, but won't reach here
  return getLocalP2();
}

// ─── POST-PROCESSING ───
function postFX(dt){
  bloomInt=Math.max(0,bloomInt-dt*1.5);
  if(bloomInt>0){ctx.save();ctx.globalAlpha=bloomInt*.1;ctx.fillStyle='#ffd740';ctx.filter='blur(32px)';ctx.fillRect(0,0,AW,AH);ctx.filter='none';ctx.restore()}
  if(flashT>0){ctx.fillStyle=flashC;ctx.globalAlpha=clamp(flashT/.08,0,1)*.45;ctx.fillRect(0,0,AW,AH);ctx.globalAlpha=1}
  if(vigT>0){const va=clamp(vigT/.3,0,1)*.4;const vg=ctx.createRadialGradient(AW/2,AH/2,AW*.25,AW/2,AH/2,AW*.65);vg.addColorStop(0,'transparent');vg.addColorStop(1,vigC);ctx.globalAlpha=va;ctx.fillStyle=vg;ctx.fillRect(0,0,AW,AH);ctx.globalAlpha=1}
  const sv=ctx.createRadialGradient(AW/2,AH/2,AW*.3,AW/2,AH/2,AW*.7);
  sv.addColorStop(0,'transparent');sv.addColorStop(1,'rgba(0,0,0,.28)');
  ctx.fillStyle=sv;ctx.fillRect(0,0,AW,AH);
  chromAb=Math.max(0,chromAb-dt*2);
  if(chromAb>.01){ctx.save();ctx.globalAlpha=chromAb*.25;ctx.globalCompositeOperation='screen';ctx.fillStyle='rgba(255,0,0,.1)';ctx.fillRect(chromAb*3,0,AW,AH);ctx.fillStyle='rgba(0,0,255,.1)';ctx.fillRect(-chromAb*3,0,AW,AH);ctx.globalCompositeOperation='source-over';ctx.restore()}
  if(smTimer>0){const barH=24*clamp(smTimer/SLO_DUR,0,1);ctx.fillStyle='rgba(0,0,0,.6)';ctx.fillRect(0,0,AW,barH);ctx.fillRect(0,AH-barH,AW,barH)}
  ctx.save();ctx.globalAlpha=.015;
  for(let i=0;i<20;i++){ctx.fillStyle=Math.random()>.5?'#fff':'#000';ctx.fillRect(rand(0,AW),rand(0,AH),rand(1,3),rand(1,3))}
  ctx.restore();
}

// ─── TITLE STREAK ───
function updateTitleStreak(){
  const el=$('title-streak');
  if(!el)return;
  const streak=getStreak();
  const wins=getTotalWins();
  if(streak>0){el.textContent=`🔥 ${streak} WIN STREAK`; el.style.display='block';}
  else{el.textContent='';el.style.display='none';}
  const twEl=$('title-totalwins');
  if(twEl) twEl.textContent = wins>0 ? `${wins} Total Wins` : '';
}

// ─── LOADOUT SCREEN ───
let loadoutPhase = 'p1'; // 'p1' | 'p2' | 'done'
let loadoutSelections = {
  p1:{power1:null,power2:null,skin:'default'},
  p2:{power1:null,power2:null,skin:'default'},
};

function buildLoadoutScreen(){
  const totalWins = getTotalWins();
  const ls = $('loadout-screen');
  if(!ls) return;

  loadoutPhase = 'p1';
  loadoutSelections = {
    p1:{power1:null,power2:null,skin:'default'},
    p2:{power1:null,power2:null,skin:'default'},
  };

  renderLoadoutPhase(totalWins);
  ls.classList.remove('hidden');
  $('title-screen').classList.add('hidden');
}

function renderLoadoutPhase(totalWins){
  const ls = $('loadout-screen');
  const player = loadoutPhase;
  const isBoth = !pendingIsAI; // 2P mode shows both

  const playerLabel = player==='p1' ? '🐊 GATOR GARY (P1)' : '🐊 CROC CARL (P2)';
  const playerColor = player==='p1' ? '#4ade80' : '#f472b6';

  ls.innerHTML = `
    <div class="lo-bg"></div>
    <div class="lo-content glass">
      <div class="lo-title" style="color:${playerColor}">${playerLabel}</div>
      <div class="lo-subtitle">Choose 2 Powers</div>

      <div class="lo-section-label">SPECIAL POWERS</div>
      <div class="lo-powers" id="lo-powers">
        ${POWER_KEYS.map(k=>{
          const def=POWERS[k];
          const sel=loadoutSelections[player];
          const isSelected = sel.power1===k||sel.power2===k;
          return `<div class="lo-power-card ${isSelected?'selected':''}" data-power="${k}">
            <span class="lo-power-icon">${def.icon}</span>
            <span class="lo-power-name">${def.name}</span>
            <span class="lo-power-desc">${def.desc}</span>
            <span class="lo-power-cd">${def.cd}s CD</span>
          </div>`;
        }).join('')}
      </div>

      <div class="lo-section-label">SKIN</div>
      <div class="lo-skins" id="lo-skins">
        ${SKIN_DEFS[player==='p1'?'gary':'carl'].map(sk=>{
          const locked = sk.winsReq>0 && totalWins<sk.winsReq;
          const isSel = loadoutSelections[player].skin===sk.id;
          return `<div class="lo-skin-card ${isSel?'selected':''} ${locked?'locked':''}" data-skin="${sk.id}" data-wins="${sk.winsReq}">
            <div class="lo-skin-preview">${locked?'🔒':'👕'}</div>
            <span class="lo-skin-name">${sk.name}</span>
            ${locked?`<span class="lo-skin-lock">${sk.winsReq} wins</span>`:''}
          </div>`;
        }).join('')}
      </div>

      <div class="lo-hint" id="lo-hint">Select 2 powers to continue</div>
      <button class="btn btn-primary lo-fight-btn" id="lo-fight" disabled>
        ${player==='p1'&&!pendingIsAI ? 'NEXT: P2 →' : '⚔️ FIGHT!'}
      </button>
    </div>
  `;

  // Power card click
  ls.querySelectorAll('.lo-power-card').forEach(card=>{
    card.addEventListener('click',()=>{
      const k=card.dataset.power;
      const sel=loadoutSelections[player];
      if(sel.power1===k){ sel.power1=null; }
      else if(sel.power2===k){ sel.power2=null; }
      else if(!sel.power1){ sel.power1=k; }
      else if(!sel.power2){ sel.power2=k; }
      else { // swap oldest
        sel.power1=sel.power2;sel.power2=k;
      }
      renderLoadoutPhase(totalWins);
    });
  });

  // Skin card click
  ls.querySelectorAll('.lo-skin-card:not(.locked)').forEach(card=>{
    card.addEventListener('click',()=>{
      loadoutSelections[player].skin=card.dataset.skin;
      renderLoadoutPhase(totalWins);
    });
  });

  // Fight/Next button
  const fightBtn=$('lo-fight');
  if(fightBtn){
    const sel=loadoutSelections[player];
    const ready=sel.power1&&sel.power2;
    fightBtn.disabled=!ready;
    if(ready) fightBtn.removeAttribute('disabled');

    fightBtn.addEventListener('click',()=>{
      const sel2=loadoutSelections[player];
      if(!sel2.power1||!sel2.power2) return;

      if(player==='p1'&&!pendingIsAI){
        // Move to P2
        loadoutPhase='p2';
        renderLoadoutPhase(totalWins);
      } else {
        // Apply and start
        loadout.p1=loadoutSelections.p1;
        loadout.p2=loadoutSelections.p2;
        // Default power2 for AI
        if(pendingIsAI){
          loadout.p2={power1:POWER_KEYS[0],power2:POWER_KEYS[1],skin:'default'};
        }
        $('loadout-screen').classList.add('hidden');
        startGame(pendingIsAI);
      }
    });
  }
}

// ─── ONLINE MULTIPLAYER SYNC ───

function serializeCroc(c){
  return {
    x:Math.round(c.x),y:Math.round(c.y),vx:Math.round(c.vx),vy:Math.round(c.vy),
    face:c.face,hp:c.hp,alive:c.alive,grounded:c.grounded,
    atk:c.atk,atkT:+(c.atkT.toFixed(2)),atkCD:+(c.atkCD.toFixed(2)),
    dashing:c.dashing,dashT:+(c.dashT.toFixed(2)),dashDir:c.dashDir,
    tornadoAct:c.tornadoAct,tailAct:c.tailAct,
    parrying:c.parrying,parryT:+(c.parryT.toFixed(2)),parryOK:c.parryOK,
    launched:c.launched,launchRot:+(c.launchRot.toFixed(2)),
    stunned:c.stunned,stunT:+(c.stunT.toFixed(2)),
    frozen:c.frozen,frozenT:+(c.frozenT.toFixed(2)),
    dizzy:c.dizzy,dizzyT:+(c.dizzyT.toFixed(2)),
    hitFlash:+(c.hitFlash.toFixed(2)),squash:+(c.squash.toFixed(2)),stretch:+(c.stretch.toFixed(2)),
    combo:c.combo,wins:c.wins,
    dead:c.dead,deathRot:+(c.deathRot.toFixed(2)),
    comebackActive:c.comebackActive,
    rageSuperUsed:c.rageSuperUsed,
    pow1CD:+(c.pow1CD.toFixed(1)),pow2CD:+(c.pow2CD.toFixed(1)),
    launchCD:+(c.launchCD.toFixed(1)),
    atkAnim:+(c.atkAnim.toFixed(2)),
    walkCycle:+(c.walkCycle.toFixed(2)),bodyLean:+(c.bodyLean.toFixed(2)),
  };
}
function applyCrocState(c, s){
  if(!c||!s) return;
  c.x=s.x;c.y=s.y;c.vx=s.vx;c.vy=s.vy;
  c.face=s.face;c.hp=s.hp;c.alive=s.alive;c.grounded=s.grounded;
  c.atk=s.atk;c.atkT=s.atkT;c.atkCD=s.atkCD;
  c.dashing=s.dashing;c.dashT=s.dashT;c.dashDir=s.dashDir;
  c.tornadoAct=s.tornadoAct;c.tailAct=s.tailAct;
  c.parrying=s.parrying;c.parryT=s.parryT;c.parryOK=s.parryOK;
  c.launched=s.launched;c.launchRot=s.launchRot;
  c.stunned=s.stunned;c.stunT=s.stunT;
  c.frozen=s.frozen;c.frozenT=s.frozenT;
  c.dizzy=s.dizzy;c.dizzyT=s.dizzyT;
  c.hitFlash=s.hitFlash;c.squash=s.squash;c.stretch=s.stretch;
  c.combo=s.combo;c.wins=s.wins;
  c.dead=s.dead;c.deathRot=s.deathRot;
  c.comebackActive=s.comebackActive;
  c.rageSuperUsed=s.rageSuperUsed;
  c.pow1CD=s.pow1CD;c.pow2CD=s.pow2CD;
  c.launchCD=s.launchCD;
  c.atkAnim=s.atkAnim;
  c.walkCycle=s.walkCycle;c.bodyLean=s.bodyLean;
}

function serializeGameState(){
  return {
    p1:serializeCroc(p1), p2:serializeCroc(p2),
    st:state, rt:+(roundTimer.toFixed(2)), rn:roundNum,
    cd:+(cdTimer.toFixed(2)),
    // Projectiles — send compact form
    pj:projectiles.slice(0,20).map(p=>({
      x:Math.round(p.x),y:Math.round(p.y),vx:Math.round(p.vx),vy:Math.round(p.vy),
      tp:p.type,ow:p.owner===p1?1:2,act:p.active
    })),
  };
}

function applyGameState(s){
  if(!s||!p1||!p2) return;
  applyCrocState(p1, s.p1);
  applyCrocState(p2, s.p2);
  state = s.st;
  roundTimer = s.rt;
  roundNum = s.rn;
  cdTimer = s.cd;
  updateHUD();
}

// Send local input to host (guest only)
function sendLocalInputToHost(){
  if(!isOnline||amHost) return;
  const inp = getLocalP1();
  const key = JSON.stringify(inp);
  if(key !== lastSentInput){
    lastSentInput = key;
    if(typeof MP !== 'undefined') MP.sendInput(inp);
  }
}

// Host sends game state to guest
function hostBroadcastState(){
  if(!isOnline||!amHost) return;
  if(typeof MP !== 'undefined') MP.sendState(serializeGameState());
}

// ─── ONLINE LOBBY CONTROLLER ───
function showOnlineLobby(){
  const el = document.getElementById('online-lobby');
  if(!el) return;
  el.classList.remove('hidden');
  document.getElementById('title-screen').classList.add('hidden');
  document.getElementById('lobby-status').textContent = 'Connecting…';
  document.getElementById('lobby-room-code').style.display = 'none';
  document.getElementById('lobby-actions').style.display = 'flex';
  document.getElementById('lobby-waiting').style.display = 'none';
  document.getElementById('lobby-error').textContent = '';
  document.getElementById('lobby-create').disabled = true;
  document.getElementById('lobby-join').disabled = true;

  // Connect
  if(typeof MP !== 'undefined'){
    MP.onRoomCreated = (code) => {
      document.getElementById('lobby-status').textContent = 'Room created! Share code:';
      document.getElementById('lobby-room-code').textContent = code;
      document.getElementById('lobby-room-code').style.display = 'block';
      document.getElementById('lobby-actions').style.display = 'none';
      document.getElementById('lobby-waiting').style.display = 'block';
    };
    MP.onJoinedRoom = (num, code) => {
      amHost = false;
      document.getElementById('lobby-status').textContent = 'Joined room ' + code + '!';
      document.getElementById('lobby-room-code').textContent = code;
      document.getElementById('lobby-room-code').style.display = 'block';
      document.getElementById('lobby-actions').style.display = 'none';
      document.getElementById('lobby-waiting').style.display = 'block';
      document.getElementById('lobby-waiting').querySelector('div').textContent = 'Connected! Starting game…';
      setTimeout(() => launchOnlineGame(), 1500);
    };
    MP.onOpponentJoined = () => {
      document.getElementById('lobby-waiting').querySelector('div').textContent = 'Opponent joined! Starting…';
      setTimeout(() => launchOnlineGame(), 1000);
    };
    MP.onOpponentLeft = () => {
      if(state==='title') return;
      isOnline=false;
      state='title';
      document.getElementById('title-screen').classList.remove('hidden');
      document.getElementById('hud').classList.add('hidden');
      document.getElementById('result-screen').classList.add('hidden');
      document.getElementById('loadout-screen').classList.add('hidden');
      document.getElementById('online-lobby').classList.add('hidden');
      hideTouchControls();hideVideo();
      slam('OPPONENT LEFT','#f87171',2);
    };
    MP.onStateUpdate = (s) => {
      if(isOnline && !amHost) applyGameState(s);
    };
    MP.onOpponentInput = (inp) => {
      if(isOnline && amHost) remoteInput = inp;
    };
    MP.onError = (msg) => {
      document.getElementById('lobby-error').textContent = msg;
    };
    MP.onDisconnect = () => {
      document.getElementById('lobby-status').textContent = 'Disconnected';
      document.getElementById('lobby-create').disabled = true;
      document.getElementById('lobby-join').disabled = true;
    };
    MP.connect();
    // Wait a bit for connection
    setTimeout(()=>{
      if(MP.isConnected()){
        document.getElementById('lobby-status').textContent = 'Connected! Create or join a room.';
        document.getElementById('lobby-create').disabled = false;
        document.getElementById('lobby-join').disabled = false;
      } else {
        document.getElementById('lobby-status').textContent = 'Connecting… please wait';
        // Retry check
        setTimeout(()=>{
          if(MP.isConnected()){
            document.getElementById('lobby-status').textContent = 'Connected!';
            document.getElementById('lobby-create').disabled = false;
            document.getElementById('lobby-join').disabled = false;
          } else {
            document.getElementById('lobby-error').textContent = 'Could not connect to server. Is the server running?';
          }
        }, 3000);
      }
    }, 800);
  } else {
    document.getElementById('lobby-error').textContent = 'Multiplayer module not loaded.';
  }
}

function hideOnlineLobby(){
  const el = document.getElementById('online-lobby');
  if(el) el.classList.add('hidden');
}

function launchOnlineGame(){
  hideOnlineLobby();
  isOnline = true;
  isAI = false;
  amHost = MP.isHost();
  // Use default loadout for online (skip loadout screen for simplicity)
  loadout.p1 = {power1:'freeze',power2:'shotgun',skin:'default'};
  loadout.p2 = {power1:'lightning',power2:'tornado',skin:'default'};
  startGame(false);
}

// ─── DOM BINDINGS ───
const $ = id => document.getElementById(id);

$('btn-online').addEventListener('click',()=>{ initAudio(); isOnline=false; showOnlineLobby(); });
$('btn-pvp').addEventListener('click',()=>{ initAudio(); isOnline=false; pendingIsAI=false; buildLoadoutScreen(); });
$('btn-ai').addEventListener('click',()=>{ initAudio(); isOnline=false; pendingIsAI=true; buildLoadoutScreen(); });
$('btn-rematch').addEventListener('click',()=>{ roundNum=1; startGame(isAI); });
$('btn-menu2').addEventListener('click',()=>{
  state='title';
  if(isOnline && typeof MP!=='undefined') MP.disconnect();
  isOnline=false;
  $('title-screen').classList.remove('hidden');
  $('result-screen').classList.add('hidden');
  $('hud').classList.add('hidden');
  $('loadout-screen').classList.add('hidden');
  $('online-lobby').classList.add('hidden');
  hideTouchControls();
  hideVideo();
  updateTitleStreak();
});

// Lobby button handlers
$('lobby-create').addEventListener('click',()=>{
  if(typeof MP!=='undefined'&&MP.isConnected()){
    amHost=true;
    MP.createRoom();
  }
});
$('lobby-join').addEventListener('click',()=>{
  const code=$('lobby-code-input').value.trim().toUpperCase();
  if(code.length===4&&typeof MP!=='undefined'&&MP.isConnected()){
    MP.joinRoom(code);
  } else {
    $('lobby-error').textContent='Enter a 4-character room code.';
  }
});
$('lobby-code-input').addEventListener('keydown',(e)=>{
  if(e.key==='Enter'){
    e.preventDefault();
    $('lobby-join').click();
  }
});
$('lobby-back').addEventListener('click',()=>{
  if(typeof MP!=='undefined') MP.disconnect();
  isOnline=false;
  // Clean room code from URL
  if(window.history.replaceState) window.history.replaceState({}, '', location.pathname);
  $('online-lobby').classList.add('hidden');
  $('title-screen').classList.remove('hidden');
});

// Share invite link
$('lobby-share').addEventListener('click',()=>{
  const code = $('lobby-room-code')?.textContent?.trim();
  if(!code) return;
  const url = location.origin + location.pathname + '?room=' + code;
  // Try native share first (mobile), fall back to clipboard
  if(navigator.share){
    navigator.share({ title:'Croc Clash — Join My Game!', text:'Join my Croc Clash match! Room: '+code, url }).catch(()=>{});
  } else if(navigator.clipboard){
    navigator.clipboard.writeText(url).then(()=>{
      $('lobby-copied').textContent = '\u2705 Link copied! Send it to your friend.';
      setTimeout(()=>{ $('lobby-copied').textContent=''; }, 4000);
    }).catch(()=>{
      prompt('Copy this link:', url);
    });
  } else {
    prompt('Copy this link:', url);
  }
});

// ─── MAIN LOOP ───
function gameLoop(now){
  requestAnimationFrame(gameLoop);
  const rawDt=Math.min((now-lastTS)/1000,.1);lastTS=now;gameTime+=rawDt;

  hsTimer=Math.max(0,hsTimer-rawDt);smTimer=Math.max(0,smTimer-rawDt);
  flashT=Math.max(0,flashT-rawDt);vigT=Math.max(0,vigT-rawDt);
  const tsc=timeScale(),dt=rawDt*tsc;

  updateShake(rawDt);updateParts(dt);updateFloats(dt);
  if(mysteryBox)updateMysteryBox(dt);

  // Online guest: only send input and render received state
  if(isOnline && !amHost){
    sendLocalInputToHost();
    // Guest still ticks countdown/render timers for visual smoothness
    if(state==='countdown'){cdTimer-=rawDt;if(cdTimer<=0) state='playing';}
    if(p1&&p2) updateHUD();
  } else {
    // Host or local: run full simulation
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
    // Host broadcasts state to guest
    if(isOnline && amHost) hostBroadcastState();
  }

  // RENDER
  ctx.save();ctx.clearRect(0,0,W,H);
  ctx.fillStyle='#050510';ctx.fillRect(0,0,W,H);
  ctx.translate(ox+shX*sc,oy+shY*sc);
  ctx.scale(sc,sc);

  drawArena(gameTime);

  if(state!=='title'){
    if(p1&&p2){
      if(p1.dead)drawCroc(p1);if(p2.dead)drawCroc(p2);
      if(!p1.dead)drawCroc(p1);if(!p2.dead)drawCroc(p2);
    }
    if(mysteryBox)drawMysteryBox();
    drawProjectiles();drawParts();drawFloats();drawSlam(rawDt);postFX(rawDt);
  } else {
    const tv=ctx.createRadialGradient(AW/2,AH/2,AW*.2,AW/2,AH/2,AW*.7);
    tv.addColorStop(0,'transparent');tv.addColorStop(1,'rgba(0,0,0,.55)');
    ctx.fillStyle=tv;ctx.fillRect(0,0,AW,AH);
  }

  ctx.restore();
  for(const k in jp)delete jp[k];
  ts.attack=0;ts.dash=0;ts.parry=0;ts.launch=0;ts.power1=0;ts.power2=0;
  ts2.attack=0;ts2.dash=0;ts2.parry=0;ts2.launch=0;ts2.power1=0;ts2.power2=0;
}

// ─── BOOT ───
loadImages(()=>{
  initVideoOverlay();
  loadNarration();
  updateTitleStreak();
  // TikTok Mini Games SDK init
  if(typeof TT !== 'undefined'){
    TT.init();
    TT.login(()=>{ TT.startEntranceMission(); TT.addShortcut(); });
  }
  requestAnimationFrame(gameLoop);

  // Auto-join if ?room=XXXX in URL
  const urlParams = new URLSearchParams(window.location.search);
  const autoRoom = urlParams.get('room');
  if(autoRoom && autoRoom.length === 4){
    initAudio();
    showOnlineLobby();
    // Wait for WebSocket connection, then auto-join
    const tryJoin = () => {
      if(typeof MP !== 'undefined' && MP.isConnected()){
        MP.joinRoom(autoRoom.toUpperCase());
        // Clean URL
        if(window.history.replaceState) window.history.replaceState({}, '', location.pathname);
      } else {
        setTimeout(tryJoin, 500);
      }
    };
    setTimeout(tryJoin, 1200);
  }
});

})();
