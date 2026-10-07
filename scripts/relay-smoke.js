'use strict';
const WebSocket=require('ws');

const BASE=(process.env.CROC_BASE||'https://web-production-66a24.up.railway.app').replace(/\/$/,'');
const WS=BASE.replace(/^https:/,'wss:').replace(/^http:/,'ws:');
const PROTOCOL=4;
const CLIENT_VERSION='croc-web-8.4';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function health(){
  const r=await fetch(BASE+'/health',{cache:'no-store'});
  const j=await r.json();
  if(!r.ok||j.protocol!==PROTOCOL)throw new Error('Health protocol mismatch: '+JSON.stringify(j));
  return j;
}
function client(name){
  const q=[];let wake=null;
  const ws=new WebSocket(WS);
  ws.on('message',raw=>{const m=JSON.parse(raw.toString());q.push(m);if(wake){const w=wake;wake=null;w();}});
  async function next(type,timeout=7000){
    const end=Date.now()+timeout;
    while(Date.now()<end){
      const i=q.findIndex(m=>m.t===type);
      if(i>=0)return q.splice(i,1)[0];
      await new Promise(res=>{const t=setTimeout(()=>{wake=null;res();},120);wake=()=>{clearTimeout(t);res();};});
    }
    throw new Error(name+' missing '+type+'; saw '+q.map(x=>x.t).join(','));
  }
  return {ws,next,send:o=>ws.send(JSON.stringify(o))};
}
(async()=>{
  const h=await health();
  const host=client('host'),guest=client('guest');
  const [wh,wg]=await Promise.all([host.next('welcome'),guest.next('welcome')]);
  if(wh.protocol!==PROTOCOL||wg.protocol!==PROTOCOL)throw new Error('Welcome protocol mismatch');
  host.send({t:'create',protocol:PROTOCOL,client_version:CLIENT_VERSION});
  const created=await host.next('created'),code=created.code;
  guest.send({t:'join',code,protocol:PROTOCOL,client_version:CLIENT_VERSION});
  await guest.next('joined');await host.next('opponent_joined');
  host.send({t:'ready',ready:true});guest.send({t:'ready',ready:true});
  let status=null;
  for(let i=0;i<15;i++){host.send({t:'status'});status=await host.next('room_status');if(status.p1Ready&&status.p2Ready)break;await sleep(80);}
  if(!status?.p1Ready||!status?.p2Ready)throw new Error('Ready state failed');
  host.send({t:'game_start',arena:'football'});
  const start=await guest.next('game_start');
  if(start.arena!=='football')throw new Error('Arena sync failed');
  for(let i=0;i<15;i++){host.send({t:'status'});status=await host.next('room_status');if(status.inGame)break;await sleep(60);}
  if(!status?.inGame)throw new Error('Server did not enter game state');
  host.send({t:'leave'});await sleep(100);try{guest.ws.close()}catch{}try{host.ws.close()}catch{}
  console.log(JSON.stringify({pass:true,health:h,room:code,status:{protocol:status.protocol,ready:[status.p1Ready,status.p2Ready],inGame:status.inGame,arena:status.arena}},null,2));
})().catch(err=>{console.error(err);process.exit(1);});
