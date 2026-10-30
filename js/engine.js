/* Taco Strike: Totally 80s — engine (lead). Platform / bike / flight / boss modes, character select, missions. */
(()=>{
'use strict';
const $=i=>document.getElementById(i);
const cv=$('cv'),c=cv.getContext('2d');
const VH=540;let VV=540,W=0,H=0,DPR=1,S=1,viewW=900,gameTop=0,gameH=540,portrait=false;
const TAU=Math.PI*2,clamp=(v,a,b)=>v<a?a:v>b?b:v,lerp=(a,b,t)=>a+(b-a)*t,rand=(a,b)=>a+Math.random()*(b-a);
const SAVE='taco80s_v1';let save={};try{save=JSON.parse(localStorage.getItem(SAVE)||'{}')}catch(e){}
function persist(){try{localStorage.setItem(SAVE,JSON.stringify(save))}catch(e){}}
window.__taco={};
/* ---------------- tuning (physics module may override) ---------------- */
const TUNE={gravity:2200,runAccel:2600,runMax:330,sprintMax:430,airAccel:1700,friction:2800,jumpV:760,jumpCut:0.45,coyote:0.09,jumpBuffer:0.12,maxFall:1100,stompBounce:560,stompBounceHeld:820,springV:1150,bikeSpeed:420,bikeSteerAccel:2400,bikeMaxVy:360,bikeDrag:6,sarlaccPull:900,sarlaccRadius:160,shipAccel:2600,shipMax:420,shipDrag:5,laserSpeed:900,laserCooldown:0.16,rollTime:0.6};
/* ---------------- characters ---------------- */
const CHARS={
 taco:{name:'The Walking Taco',tag:'Full adventure: every land!',weapon:'toppings',jump:1,speed:1},
 rainbow:{name:'Rainbow Brite',tag:'Rainbow Land · star sprinkles + double jump',weapon:'star',jump:1.02,speed:1,dj:1},
 carebear:{name:'Tenderheart Bear',tag:'Care-a-Lot · Care Bear Stare + floaty jump',weapon:'care',jump:1,speed:0.95,floaty:1},
 shera:{name:'She-Ra',tag:'Etheria · Sword of Protection slash',weapon:'sword',jump:1.05,speed:1.05},
 joe:{name:'Snake Eyes (G.I. Joe)',tag:'Cobra Island · silent ninja commando, rapid fire',weapon:'bullet',jump:1,speed:1.08},
 chewie:{name:'Chewbacca',tag:'Star Wars: Endor, Ewoks, Tatooine, X-wing, Falcon',weapon:'bolt',jump:1.08,speed:1},
 ewok:{name:'Wicket the Ewok',tag:'Star Wars: Ewok missions · sling stones + waddle',weapon:'rock',jump:0.95,speed:0.9},
};
/* ---------------- canvas sizing ---------------- */
function resize(){W=innerWidth;H=innerHeight;DPR=Math.min(devicePixelRatio||1,2);cv.width=Math.round(W*DPR);cv.height=Math.round(H*DPR);portrait=H>W*1.1;
 if(portrait){VV=540;S=W/clamp(W*1.05,400,470);gameH=VV*S;if(gameH>H*0.62){S=H*0.62/VV;gameH=VV*S}gameTop=Math.round(clamp((H-gameH)*0.25,40,150))}else{VV=clamp(Math.round(540*Math.min(1,(W/H)/2.6)),440,540);S=H/VV;gameH=H;gameTop=0}
 viewW=W/S;layoutPad()}
function layoutPad(){const pad=$('pad'),bj=$('bJump'),bt=$('bThrow'),hint=$('swipeHint');
 if(portrait){const top=gameTop+gameH,ph=H-top;pad.style.top=top+'px';pad.style.height=ph+'px';const sz=Math.round(clamp(ph*0.36,84,120));[bj,bt].forEach(b=>{b.style.width=b.style.height=sz+'px'});
  bj.style.right='18px';bj.style.bottom=Math.round(ph*0.22)+'px';bt.style.right=(18+sz+16)+'px';bt.style.bottom=Math.round(ph*0.22+sz*0.45)+'px';hint.style.top='14px';hint.style.display='';const bs=$('bSpec');if(bs){const z=Math.round(sz*0.78);bs.style.width=bs.style.height=z+'px';bs.style.right=(18+sz*2+30)+'px';bs.style.bottom=Math.round(ph*0.22+sz*0.1)+'px'}}
 else{pad.style.top='auto';pad.style.height='0';const sz=Math.round(clamp(H*0.2,70,92));[bj,bt].forEach(b=>{b.style.width=b.style.height=sz+'px'});bj.style.right='10px';bj.style.bottom='12px';bt.style.right=(10+Math.round(sz*0.18))+'px';bt.style.bottom=(12+sz+10)+'px';hint.style.display='none';const bs=$('bSpec');if(bs){const z=Math.round(sz*0.8);bs.style.width=bs.style.height=z+'px';bs.style.right=(10+sz+14)+'px';bs.style.bottom='12px'}}}
addEventListener('resize',resize);resize();
/* ---------------- audio ---------------- */
const AU={ctx:null,master:null,music:null,sfx:null,muted:!!save.muted,cur:null,timer:null,
 init(){if(this.ctx)return;try{const C=window.AudioContext||window.webkitAudioContext;this.ctx=new C();this.master=this.ctx.createGain();this.master.gain.value=this.muted?0:1;this.master.connect(this.ctx.destination);this.music=this.ctx.createGain();this.music.gain.value=0.42;this.music.connect(this.master);this.sfx=this.ctx.createGain();this.sfx.gain.value=0.9;this.sfx.connect(this.master)}catch(e){this.ctx=null}},
 unlock(){this.init();if(this.ctx&&this.ctx.state==='suspended')this.ctx.resume().catch(()=>{})},
 mute(m){this.muted=m;save.muted=m;persist();if(this.master)this.master.gain.value=m?0:1;$('bMute').textContent=m?'🔇':'🔊'},
 play(key){if(!this.ctx||this.cur===key)return;this.stop();this.cur=key;try{if(window.TacoMusic&&TacoMusic.start){const tr=TacoMusic.tracks;TacoMusic.start(this.ctx,this.music,!tr||tr.includes(key)?key:(/^(xwing|falcon|space|trench)/.test(key)?'boss':'title'));return}}catch(e){}synthMusic(key)},
 stop(){this.cur=null;try{window.TacoMusic&&TacoMusic.stop&&TacoMusic.stop()}catch(e){}if(this.timer){clearInterval(this.timer);this.timer=null}},
 fx(name){if(!this.ctx||this.muted)return;try{if(window.TacoSFX&&TacoSFX.play&&(!TacoSFX.names||TacoSFX.names.includes(name))){TacoSFX.play(this.ctx,this.sfx,name);return}}catch(e){}synthSfx(name)}};
function tone(f,d,type='square',vol=0.2,slide=0,delay=0,dest){const a=AU.ctx,t=a.currentTime+delay,o=a.createOscillator(),g=a.createGain();o.type=type;o.frequency.setValueAtTime(f,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(30,f+slide),t+d);g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(0.001,t+d);o.connect(g);g.connect(dest||AU.sfx);o.start(t);o.stop(t+d+0.02)}
function noise(d,vol=0.3,hp=800,delay=0,dest){const a=AU.ctx,t=a.currentTime+delay,n=a.sampleRate*d,b=a.createBuffer(1,n,a.sampleRate),ch=b.getChannelData(0);for(let i=0;i<n;i++)ch[i]=Math.random()*2-1;const s=a.createBufferSource();s.buffer=b;const f=a.createBiquadFilter();f.type='highpass';f.frequency.value=hp;const g=a.createGain();g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(0.001,t+d);s.connect(f);f.connect(g);g.connect(dest||AU.sfx);s.start(t)}
function synthSfx(n){switch(n){
 case'jump':tone(320,0.16,'square',0.12,500);break;case'throw':tone(700,0.08,'triangle',0.16,-400);noise(0.06,0.08,3000);break;
 case'stomp':tone(180,0.14,'square',0.22,-120);noise(0.1,0.18,400);break;case'coin':tone(988,0.07,'square',0.1);tone(1319,0.16,'square',0.1,0,0.07);break;
 case'pickup':case'heal':[523,659,784,1047].forEach((f,i)=>tone(f,0.1,'triangle',0.14,0,i*0.05));break;case'hurt':tone(300,0.3,'sawtooth',0.2,-220);break;
 case'die':[392,330,262,196].forEach((f,i)=>tone(f,0.2,'square',0.16,0,i*0.14));break;case'spring':tone(200,0.3,'sine',0.25,700);break;
 case'boss_hit':tone(140,0.12,'square',0.2,-60);noise(0.08,0.2,1200);break;case'boss_die':noise(1.2,0.35,100);tone(90,1.0,'sawtooth',0.25,-60);break;
 case'clear':[523,659,784,1047,784,1047,1319].forEach((f,i)=>tone(f,0.16,'square',0.12,0,i*0.1));break;case'oneup':[659,784,1319,1047,1175,1568].forEach((f,i)=>tone(f,0.1,'square',0.1,0,i*0.07));break;
 case'star':[784,988,1175,1568].forEach((f,i)=>tone(f,0.09,'triangle',0.14,0,i*0.04));break;case'checkpoint':tone(660,0.12,'triangle',0.15);tone(990,0.2,'triangle',0.15,0,0.1);break;
 case'sarlacc':tone(70,0.8,'sawtooth',0.3,-30);noise(0.6,0.15,200);break;case'laser':tone(1400,0.12,'sawtooth',0.08,-1100);break;case'explode':noise(0.5,0.3,120);tone(80,0.4,'square',0.2,-40);break;
 case'roar':{const a=AU.ctx,t=a.currentTime,o=a.createOscillator(),o2=a.createOscillator(),g=a.createGain(),f=a.createBiquadFilter();o.type='sawtooth';o2.type='square';o.frequency.setValueAtTime(180,t);o.frequency.linearRampToValueAtTime(260,t+0.25);o.frequency.linearRampToValueAtTime(140,t+0.9);o2.frequency.setValueAtTime(92,t);o2.frequency.linearRampToValueAtTime(70,t+0.9);const l=a.createOscillator(),lg=a.createGain();l.frequency.value=28;lg.gain.value=40;l.connect(lg);lg.connect(o.frequency);f.type='bandpass';f.frequency.value=900;f.Q.value=1.2;g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(0.4,t+0.06);g.gain.exponentialRampToValueAtTime(0.001,t+1);o.connect(f);o2.connect(f);f.connect(g);g.connect(AU.sfx);[o,o2,l].forEach(x=>{x.start(t);x.stop(t+1.05)});noise(0.8,0.05,1500);break}
 case'roll':noise(0.35,0.12,2000);tone(400,0.3,'sine',0.08,300);break;
 default:tone(500,0.06,'square',0.08)}}
const SONGS={title:[[57,60,64,67],[53,57,60,64],[55,59,62,67],[52,55,59,64]],rainbow:[[60,64,67,72],[57,60,64,69],[53,57,60,65],[55,59,62,67]],carealot:[[65,69,72,77],[62,65,69,74],[58,62,65,70],[60,64,67,72]],etheria:[[57,60,64,69],[53,57,60,65],[50,53,57,62],[52,56,59,64]],cobra:[[52,55,59,64],[52,55,59,64],[48,52,55,60],[50,54,57,62]],endor:[[55,59,62,67],[52,55,59,64],[48,52,55,60],[50,54,57,62]],bike:[[50,53,57,62],[50,53,57,62],[46,50,53,58],[48,52,55,60]],ewok:[[60,64,67,72],[65,69,72,77],[67,71,74,79],[60,64,67,72]],tatooine:[[57,60,64,69],[58,62,65,70],[57,60,64,69],[55,58,62,67]],space:[[50,53,57,62],[46,50,53,58],[43,46,50,55],[45,49,52,57]],boss:[[45,48,52,57],[46,49,53,58],[45,48,52,57],[44,47,51,56]],final:[[45,48,52,57],[46,49,53,58],[41,45,48,53],[44,47,51,56]]};
function synthMusic(key){const prog=SONGS[key]||SONGS.rainbow;const a=AU.ctx;const bpm=key==='bike'||key==='boss'||key==='final'?140:key==='carealot'?104:120;const step=60/bpm/4;let n=0,next=a.currentTime+0.1;const mf=m=>440*Math.pow(2,(m-69)/12);
 const voice=(f,t,d,type,vol)=>{const o=a.createOscillator(),g=a.createGain();o.type=type;o.frequency.value=f;g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+0.01);g.gain.exponentialRampToValueAtTime(0.0001,t+d);o.connect(g);g.connect(AU.music);o.start(t);o.stop(t+d+0.05)};
 AU.timer=setInterval(()=>{if(!AU.ctx)return;while(next<a.currentTime+0.25){const bar=Math.floor(n/16)%prog.length,s=n%16,ch=prog[bar];
  if(s%4===0)voice(mf(ch[0]-24),next,step*3.5,'sawtooth',0.12);if(s%4===2)voice(mf(ch[0]-12),next,step*1.5,'sawtooth',0.07);
  voice(mf(ch[s%4]+(s>=8?12:0)),next,step*0.9,'square',0.035);
  if(s===0||s===8)voice(mf(ch[(n>>4)%4]+12),next,step*7,'triangle',0.05);
  if(s%4===0){const o=a.createOscillator(),g=a.createGain();o.frequency.setValueAtTime(140,next);o.frequency.exponentialRampToValueAtTime(40,next+0.12);g.gain.setValueAtTime(0.25,next);g.gain.exponentialRampToValueAtTime(0.001,next+0.14);o.connect(g);g.connect(AU.music);o.start(next);o.stop(next+0.16)}
  if(s===4||s===12)noise(0.12,0.1,1500,next-a.currentTime,AU.music);if(s%2===1)noise(0.03,0.03,7000,next-a.currentTime,AU.music);
  next+=step;n++}},90)}
/* ---------------- input ---------------- */
const K={};const inp={L:0,R:0,U:0,D:0,jump:0,jumpPressed:0,throw:0,throwPressed:0,steer:{x:0,y:0}};
const VIRT={jump:0,throw:0,spec:0};const TOUCH=new Map();let lastJumpHeld=0,lastThrowHeld=0,swipeJump=0;
const KEYMAP={ArrowLeft:'L',KeyA:'L',ArrowRight:'R',KeyD:'R',ArrowUp:'U',KeyW:'U',ArrowDown:'D',KeyS:'D',Space:'J',KeyJ:'J',KeyZ:'J',KeyK:'T',KeyX:'T',KeyE:'S',KeyL:'S'};
addEventListener('keydown',e=>{AU.unlock();const k=KEYMAP[e.code];if(k){K[k]=1;e.preventDefault()}if(e.code==='KeyP'||e.code==='Escape'){if(state==='play')pauseGame();else if(state==='pause')resumeGame()}if(e.code==='KeyM')AU.mute(!AU.muted);if(e.code==='KeyC'&&state==='play')swapBuddy();if(e.code==='Enter'&&state==='title')toSelect()});
addEventListener('keyup',e=>{const k=KEYMAP[e.code];if(k)K[k]=0});
function swipeDir(t){let dx=t.x-t.ax,dy=t.y-t.ay;const d=Math.hypot(dx,dy);t.sx=clamp((t.x-t.ox)/60,-1,1);t.sy=clamp((t.y-t.oy)/60,-1,1);const o={};if(d<14)return o;if(d>44){t.ax=t.x-dx/d*44;t.ay=t.y-dy/d*44}
 const s=Math.round(Math.atan2(dy,dx)/(Math.PI/4));if(s===0||s===1||s===-1)o.R=1;if(s===4||s===-4||s===3||s===-3)o.L=1;if(s===2||s===1||s===3)o.D=1;if(s===-2||s===-1||s===-3)o.U=1;return o}
function tStart(id,x,y){AU.unlock();TOUCH.set(id,{x,y,ax:x,ay:y,ox:x,oy:y,z:{},sx:0,sy:0,t0:performance.now(),mx:0})}
function tMove(id,x,y){const t=TOUCH.get(id);if(!t)return;t.x=x;t.y=y;t.mx=Math.max(t.mx,Math.hypot(x-t.ox,y-t.oy));const before=t.z.U;t.z=swipeDir(t);if(t.z.U&&!before)swipeJump=1}
function tEnd(id){const t=TOUCH.get(id);TOUCH.delete(id);if(t&&t.mx<14&&performance.now()-t.t0<320)tapWorld(t.ox,t.oy)}
cv.addEventListener('touchstart',e=>{e.preventDefault();for(const t of e.changedTouches)tStart(t.identifier,t.clientX,t.clientY)},{passive:false});
cv.addEventListener('touchmove',e=>{e.preventDefault();for(const t of e.changedTouches)tMove(t.identifier,t.clientX,t.clientY)},{passive:false});
cv.addEventListener('touchend',e=>{e.preventDefault();for(const t of e.changedTouches)tEnd(t.identifier)},{passive:false});
cv.addEventListener('touchcancel',e=>{for(const t of e.changedTouches)tEnd(t.identifier)});
let md=false;cv.addEventListener('mousedown',e=>{md=true;tStart('m',e.clientX,e.clientY)});addEventListener('mousemove',e=>{if(md)tMove('m',e.clientX,e.clientY)});addEventListener('mouseup',()=>{if(md){md=false;tEnd('m')}});
function bindBtn(el,k){const on=e=>{e.preventDefault();e.stopPropagation();AU.unlock();VIRT[k]=1;el.classList.add('on')},off=e=>{e.preventDefault();e.stopPropagation();VIRT[k]=0;el.classList.remove('on')};
 el.addEventListener('touchstart',on,{passive:false});el.addEventListener('touchend',off,{passive:false});el.addEventListener('touchcancel',off,{passive:false});el.addEventListener('mousedown',on);el.addEventListener('mouseup',off);el.addEventListener('mouseleave',off);el.addEventListener('contextmenu',e=>e.preventDefault())}
bindBtn($('bJump'),'jump');bindBtn($('bThrow'),'throw');if($('bSpec'))bindBtn($('bSpec'),'spec');
function readInput(){let L=K.L||GPK.L,R=K.R||GPK.R,U=K.U,D=K.D||GPK.D,sx=0,sy=0;if(GPK.U&&G&&G.p&&mode()!=='bike'&&mode()!=='flight'&&PT.ladderAt(G.p))U=1;else if(GPK.U&&(mode()==='bike'))U=1;for(const t of TOUCH.values()){if(t.z.L)L=1;if(t.z.R)R=1;if(t.z.U)U=1;if(t.z.D)D=1;sx+=t.sx;sy+=t.sy}
 if(K.L||K.R||GPK.L||GPK.R)sx=(R?1:0)-(L?1:0);if(K.U||K.D||GPK.U||GPK.D)sy=(D?1:0)-(U||GPK.U?1:0);
 inp.L=L?1:0;inp.R=R?1:0;inp.U=U?1:0;inp.D=D?1:0;inp.steer.x=clamp(sx,-1,1);inp.steer.y=clamp(sy,-1,1);
 const plat=mode()!=='bike'&&mode()!=='flight';const onLad=plat&&G&&G.p&&PT.ladderAt(G.p);
 const j=!!(K.J||VIRT.jump||GPK.J||(plat&&!onLad&&inp.U));const sj=plat&&!onLad&&swipeJump;inp.jumpPressed=((j&&!lastJumpHeld)||sj)?1:0;inp.jump=j?1:0;lastJumpHeld=j;swipeJump=0;
 const th=!!(K.T||VIRT.throw||GPK.T);inp.throwPressed=th&&!lastThrowHeld?1:0;inp.throw=th?1:0;lastThrowHeld=th}
/* ---------------- game state ---------------- */
let state='load',G=null,CH='taco',run=null,LEVELS={},ORDER=[],MISSIONS={},tGlobal=0;
const mode=()=>G?G.mode:'';
/* parts: team modules + art + levels (only files that exist are listed, so no 404s) */
/* lazy art: core awaited at boot, the rest streams in (priority per world); renderer falls back to procedural art per file */
let ART_ALL=[];const ART_REQ={};
window.TacoArtHas=path=>ART_ALL.includes('art/'+path);
function loadArt(f){if(ART_REQ[f])return ART_REQ[f];return ART_REQ[f]=new Promise(res=>{const im=new Image();im.decoding='async';im.onload=()=>{D.IMG[f.replace(/\.(webp|png|jpe?g)$/,'')]=im;res()};im.onerror=res;im.src=f})}
let artBusy=0;const artQ=[];
function artPump(){while(artBusy<4&&artQ.length){const f=artQ.shift();if(ART_REQ[f])continue;artBusy++;loadArt(f).then(()=>{artBusy--;artPump()})}}
function artQueue(theme){const pri=ART_ALL.filter(f=>!ART_REQ[f]&&(f.startsWith('art/'+theme+'/')||/^art\/(enemies|allies|bosses|props)\//.test(f)&&theme!=='*'));
 const themeFirst=pri.filter(f=>f.startsWith('art/'+theme+'/'));const rest=ART_ALL.filter(f=>!ART_REQ[f]&&!themeFirst.includes(f));
 artQ.splice(0,artQ.length,...themeFirst,...rest.sort((a,b)=>(/^art\/(enemies|allies|bosses|props|ships)\//.test(b)?1:0)-(/^art\/(enemies|allies|bosses|props|ships)\//.test(a)?1:0)));artPump()}
function levelArt(L){if(!L)return[];const need=new Set();const add=f=>{if(ART_ALL.includes(f))need.add(f)};const pre=d=>ART_ALL.filter(f=>f.startsWith(d)).forEach(f=>need.add(f));
 pre('art/'+(L.mode==='bike'?'endor':L.theme)+'/');if(L.mode==='flight'){pre('art/ships/');pre('art/space/')}
 (L.enemies||[]).forEach(e=>add('art/enemies/'+e.type+'.webp'));if(L.mode==='bike'){add('art/enemies/scout_trooper_bike.webp');add('art/hero/taco_bike.webp')}
 castAllies(L).forEach(a=>add('art/allies/'+allyKey(a.who)+'.webp'));add('art/allies/chewbacca.webp');
 const bosses=(L.gauntlet||[]).map(g=>g.boss).concat(L.boss?[L.boss]:[]);bosses.forEach(b=>{const t=BOSS_ALIAS[b]||b,d=BT[t];if(d)pre('art/bosses/'+(d.art||t))});
 const js=JSON.stringify(L);ART_ALL.forEach(f=>{const m=f.match(/^art\/(enemies|allies|props)\/([a-z0-9_]+)\.webp$/);if(m&&js.includes('"'+m[2]+'"'))need.add(f)});
 if(run&&run.vm){const v=VBY(run.vm);if(v&&v.art)pre('art/bosses/'+v.art)}
 if(L.theme==='tatooine')['sarlacc','skiff','sail_barge'].forEach(k=>add('art/props/'+k+'.webp'));if(L.theme==='ewok')['ewok_hut','rope_bridge'].forEach(k=>add('art/props/'+k+'.webp'));
 return[...need]}
function artLevel(L,ms){const fs=levelArt(L).filter(f=>!ART_REQ[f]);return Promise.race([Promise.all(fs.map(loadArt)),new Promise(r=>setTimeout(r,ms||3000))])}
function artPrefetch(L){const fs=levelArt(L).filter(f=>!ART_REQ[f]);artQ.push(...fs);artPump()}
function artTheme(theme,ms){const fs=ART_ALL.filter(f=>f.startsWith('art/'+theme+'/')||theme==='space'&&f.startsWith('art/ships/'));artQueue(theme);return Promise.race([Promise.all(fs.map(loadArt)),new Promise(r=>setTimeout(r,ms||2500))])}
async function loadParts(){let P={};try{const r=await fetch('parts.json?v='+Date.now(),{cache:'no-store'});if(r.ok)P=await r.json()}catch(e){}
 for(const s of P.scripts||[])await new Promise(res=>{const el=document.createElement('script');el.src=s;el.onload=res;el.onerror=res;document.head.appendChild(el)});
 if(window.TacoPhysics&&TacoPhysics.TUNE)Object.assign(TUNE,TacoPhysics.TUNE);try{window.TacoFX&&TacoFX.init({quality:'auto'})}catch(e){}if(window.TacoFlight&&TacoFlight.TUNE)Object.assign(TUNE,TacoFlight.TUNE);
 ART_ALL=(P.art||[]).slice();const q0=new URLSearchParams(location.search).get('play');
 const core=ART_ALL.filter(f=>/^art\/(title|logo|select|players|hero|pickups|projectiles|ui)\b/.test(f)||/^art\/(title|logo)/.test(f));
 const imgs=core.map(loadArt);
 LEVELS=Object.assign({},GEN.LEVELS);ORDER=GEN.ORDER.slice();MISSIONS=JSON.parse(JSON.stringify(GEN.MISSIONS));
 const lv=(P.levels||[]).map(f=>fetch(f).then(r=>r.ok?r.json():null).then(j=>{if(j&&j.id)LEVELS[j.id]=normLevel(j)}).catch(()=>{}));
 await Promise.all(imgs.concat(lv));
 if(P.order&&P.order.length)ORDER=P.order.filter(id=>LEVELS[id]);if(P.missions)for(const k in P.missions)MISSIONS[k]=P.missions[k].filter(id=>LEVELS[id]);
 MISSIONS.taco=ORDER.slice();window.__taco.parts=P}
function normLevel(j){j.mode=j.mode||'platform';j.ground=j.ground||[];j.platforms=j.platforms||[];j.hazards=j.hazards||[];j.springs=j.springs||[];j.enemies=j.enemies||[];j.pickups=j.pickups||[];j.checkpoints=j.checkpoints||[];j.allies=(j.allies||[]).map(a=>Object.assign({say:GEN.SAY[a.who]||'',gift:GEN.GIFT[a.who]},a));j.start=j.start||{x:80,y:380};j.theme=j.theme||'rainbow';
 if(j.mode==='boss'&&!j.bossX)j.bossX=(j.width||1200)*0.7;if(j.boss&&j.mode==='platform'&&!j.bossX)j.bossX=(j.width||6000)-900;if(!j.goal)j.goal={x:(j.width||6000)-150,y:460};return j}
window.__taco.TUNE=TUNE;
/* ---------------- enemy catalogue ---------------- */
const ET={murky:{b:'walker',hp:1,sp:60,w:30,h:52,sc:100},lurky:{b:'walker',hp:2,sp:40,w:44,h:48,sc:200},gloom_cloud:{b:'flyer',hp:2,sp:50,w:50,h:30,sc:200,shot:'rain',fly:1},horde_skysled:{b:'flyer',hp:2,sp:70,w:56,h:40,sc:250,shot:'bolt',fly:1},trouble_bubble:{b:'flyer',hp:1,sp:45,w:44,h:44,sc:200,fly:1},
 shreeky:{b:'swooper',hp:1,sp:90,w:44,h:34,sc:200,fly:1},beastly:{b:'hopper',hp:1,sp:80,w:32,h:38,sc:150},horde_trooper:{b:'shooter',hp:2,sp:55,w:28,h:60,sc:200,shot:'bolt'},
 catra:{b:'charger',hp:2,sp:90,w:28,h:64,sc:300},cobra_trooper:{b:'shooter',hp:1,sp:60,w:26,h:62,sc:150,shot:'bullet'},bat:{b:'hopper',hp:2,sp:70,w:30,h:64,sc:250},
 hiss_tank:{b:'tank',hp:4,sp:35,w:84,h:46,sc:500,shot:'bullet',nostomp:1},scout_trooper:{b:'shooter',hp:1,sp:70,w:26,h:62,sc:150,shot:'bolt'},stormtrooper:{b:'shooter',hp:1,sp:55,w:26,h:62,sc:150,shot:'bolt'},
 tusken:{b:'hopper',hp:2,sp:70,w:28,h:62,sc:200},gamorrean:{b:'walker',hp:3,sp:45,w:40,h:66,sc:300},womp_rat:{b:'charger',hp:1,sp:120,w:34,h:20,sc:100}};
const BT={murky_gloom:{hp:24,w:150,h:110,name:'Murky\u2019s Gloom Machine',shot:'rain'},no_heart:{hp:26,w:120,h:120,name:'No Heart',shot:'slime',fly:1},hordak:{hp:30,w:140,h:130,name:'Hordak',shot:'bolt'},
 cobra_commander:{hp:32,w:160,h:120,dh:190,name:'Cobra Commander',shot:'bomb',fly:1,art:'cobra_commander'},at_st:{hp:30,w:110,h:170,name:'AT-ST Walker',shot:'gbolt'},big_helmet:{hp:40,w:84,h:120,dh:168,name:'Big Helmet',art:'dark_helmet'},bowser:{hp:30,w:150,h:150,dh:215,name:'Bowser',art:'bowser'},freddy_krueger:{hp:30,w:60,h:128,dh:168,name:'Freddy Krueger',art:'freddy'},skeletor:{hp:45,w:66,h:132,dh:176,name:'Skeletor',art:'skeletor'},
 final:{hp:60,w:200,h:150,name:'Cobra-Horde Doomsday Machine',shot:'bolt',fly:1}};
/* ---------------- particles ---------------- */
function burst(x,y,n,col,sp=260,life=0.6,size=4,add=true,grav=600){for(let i=0;i<n;i++){const a=Math.random()*TAU,v=sp*(0.3+Math.random()*0.7);G.parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-sp*0.3,l:life*(0.6+Math.random()*0.6),m:life,s:size*(0.5+Math.random()),c:Array.isArray(col)?col[i%col.length]:col,add,g:grav})}}
function ring(x,y,col,r=40){G.parts.push({ring:1,x,y,l:0.35,m:0.35,s:r,c:col,add:true,vx:0,vy:0,g:0})}
function text(x,y,s,col='#fff',big){G.texts.push({x,y,s,c:col,l:1.1,big})}
function shake(a){G.shake=Math.max(G.shake,a)}
const TFX=(n,x,y,o)=>{try{window.TacoFX&&TacoFX.emit(n,x,y,o)}catch(e){}};
function hitstop(t){G.hs=Math.max(G.hs,t)}
/* ---------------- start a level ---------------- */
function startLevel(id){const L=LEVELS[id];if(!L){console.warn('missing level',id);return}document.body.classList.remove('vm');$('bThrow').textContent='THROW';
 G={id,L,mode:L.mode,theme:L.theme,t:0,cam:{x:0,y:VH-VV},parts:[],texts:[],shots:[],eshots:[],enemies:[],pickups:[],plats:[],solids:[],hazards:[],springs:[],checkpoints:[],allies:[],boss:null,shake:0,hs:0,combo:0,comboT:0,clear:false,clearT:0,deadT:0,banner:{s:L.name,t:2.6},bossOn:false,arena:null,flash:0,bg:L.bg||L.theme};
 if(L.mode==='flight'){G.p={x:0,y:0,w:1,h:1,hp:5,maxHp:5};return startFlight(L)}
 const p={x:L.start.x,y:L.start.y-50,w:30,h:46,vx:0,vy:0,onGround:false,face:1,coy:0,jb:0,runT:0,inv:1.5,star:0,throwT:0,cool:0,dj:0,jumping:false,ladder:false,dead:false,anim:0};
 PC=CH;{const [w,h]=sizeFor(PC);p.w=w;p.h=h}
 G.p=p;Object.assign(p,{hp:run.hp,maxHp:5});
 if(L.mode==='flight')return startFlight(L);
 for(const g of L.ground)G.solids.push({x:g[0],y:g[2],w:g[1]-g[0],h:600-g[2]+80,type:'ground'});
 for(const q of L.platforms){const o=Object.assign({h:q.type==='ladder'?(q.h||160):(q.h||24)},q,{x0:q.x,y0:q.y,dxm:0,dym:0});if(o.type==='solid')G.solids.push(o);else G.plats.push(o)}
 G.hazards=(L.hazards||[]).map(h=>Object.assign({h:20},h));
 for(const h of G.hazards)if(h.type==='sarlacc'){h.y=h.y||460;const cx=h.x+h.w/2;if(!G.solids.some(s=>cx>=s.x&&cx<=s.x+s.w&&Math.abs(s.y-h.y)<30))G.solids.push({x:h.x-2,y:h.y,w:h.w+4,h:140,type:'sand'})}G.springs=(L.springs||[]).map(s=>({x:s.x,y:s.y,sq:0}));G.checkpoints=(L.checkpoints||[]).map(k=>({x:k.x,on:false}));
 for(const e of L.enemies)spawnEnemy(e);
 G.pickups=(L.pickups||[]).map(q=>({type:q.type,x:q.x,y:q.y,got:false}));
 G.buddy=null;G.swaps=0;G.allies=castAllies(L).map(a=>Object.assign({},a,{who:a.who,orig:a.orig,x:a.x,y:a.y||460,say:a.say||'',gift:a.gift,met:false,sayT:0,fights:a.fights||a.who==='chewbacca',cool:1,follow:false,vx:0}));G.buddy=makeBuddy(L,G.p);
 G.obstacles=(L.obstacles||[]).map(o=>Object.assign({},o));G.respawn={x:L.start.x,y:L.start.y-50};
 if(L.mode==='bike'){p.bike=1;p.y=280;p.h=40;p.w=70;p.vx=TUNE.bikeSpeed}
 if(L.mode==='boss'||L.boss&&L.boss!=='bike')G.bossType=L.boss;G.gaunt=Array.isArray(L.gauntlet)&&L.gauntlet.length?L.gauntlet.map(g=>Object.assign({},g,{done:false})):null;G.gi=0;G.allBossDone=false;G.marks=[];G.reach=[];G.tint=0;G.dim=0;
 AU.play(L.music||(L.mode==='bike'?'bike':L.theme));try{window.TacoFX&&TacoFX.setTheme(L.mode==='bike'?'bike':L.theme)}catch(e){}
 G.vm=null;if(run&&run.vm&&L.mode!=='flight'&&L.mode!=='bike'){const v=VBY(run.vm);if(v)setupVillain(v)}
}
function spawnEnemy(e){const d=ET[e.type]||ET.murky;const hp=e.hp||d.hp;G.enemies.push({type:e.type,b:d.b,x:e.x,y:e.y||460,w:d.w,h:d.h,vx:0,vy:0,dir:e.dir||-1,hp,max:hp,sp:d.sp,x0:e.x,y0:e.y||460,range:e.range||150,t:Math.random()*3,cool:1+Math.random()*2,fly:d.fly||e.fly,shot:d.shot,nostomp:d.nostomp,sc:d.sc,lane:e.lane,flash:0,state:0,onG:false})}
/* ---------------- collision helpers (rects use x,y top-left) ---------------- */
const ov=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
function collide(o,dt,dropThrough){ // moves o by vx,vy with solids/platforms
 o.x+=o.vx*dt;for(const s of G.solids){if(ov(o,s)){if(o.vx>0)o.x=s.x-o.w;else if(o.vx<0)o.x=s.x+s.w;o.vx=0;o.hitWall=1}}
 const pb=o.y+o.h;o.y+=o.vy*dt;o.onGround=false;o.ride=null;
 for(const s of G.solids){if(ov(o,s)){if(o.vy>=0&&pb<=s.y+8){o.y=s.y-o.h;o.vy=0;o.onGround=true;o.ride=s}else if(o.vy<0){o.y=s.y+s.h;o.vy=0;o.bonk=1}else{o.y=s.y-o.h;o.onGround=true}}}
 if(!dropThrough)for(const s of G.plats){if(s.type==='ladder'||s.fallen)continue;const top=s.y+(s.type==='bridge'?Math.sin(((o.x+o.w/2-s.x)/s.w)*Math.PI)*8:0);
  if(o.vy>=0&&pb<=top+6&&o.y+o.h>=top&&o.x+o.w>s.x+2&&o.x<s.x+s.w-2){o.y=top-o.h;o.vy=s.type==='cloud'&&o===G.p&&o.vy>300?-o.vy*0.25:0;o.onGround=true;o.ride=s}}}
/* ---------------- player ---------------- */
/* position-only resolvers for TacoPhysics.stepPlayer (it moves the body itself) */
function colX(o){o.hitWall=0;for(const s of G.solids){if(ov(o,s)){const pc=(o.prevX!==undefined?o.prevX:o.x)+o.w/2;if(pc<s.x+s.w/2)o.x=s.x-o.w;else o.x=s.x+s.w;o.vx=0;o.hitWall=1}}}
function colY(o){const pb=(o.prevY!==undefined?o.prevY:o.y)+o.h;o.onGround=false;o.ride=null;o._onOneway=false;
 for(const s of G.solids){if(ov(o,s)){if(o.vy>=0&&pb<=s.y+8){o.y=s.y-o.h;o.vy=0;o.onGround=true;o.ride=s}else if(o.vy<0&&pb>s.y+8){o.y=s.y+s.h;o.vy=0;o.bonk=1}else{o.y=s.y-o.h;o.onGround=true;o.ride=s}}}
 if(o.dropT>0)return;for(const s of G.plats){if(s.type==='ladder'||s.fallen)continue;const top=s.y+(s.type==='bridge'?Math.sin(clamp((o.x+o.w/2-s.x)/s.w,0,1)*Math.PI)*8:0);
  if(o.vy>=0&&pb<=top+6&&o.y+o.h>=top&&o.x+o.w>s.x+2&&o.x<s.x+s.w-2){o.y=top-o.h;o.onGround=true;o.ride=s;o._onOneway=true;
   if(s.type==='cloud'&&o.vy>(TUNE.cloudMinImpact||380)){o.vy=-(TUNE.cloudBounce||280);o.onGround=false}else o.vy=0}}}
const PT={collideX:colX,collideY:colY,ladderAt:o=>G.plats.find(s=>s.type==='ladder'&&o.x+o.w>s.x&&o.x<s.x+s.w&&o.y+o.h>s.y&&o.y<s.y+s.h)||null};
function stepPlayer(dt){const p=G.p,T=TUNE,ch=charOf(PC);
 if(window.TacoPhysics&&TacoPhysics.stepPlayer){p.speedMult=ch.speed;const wasG=p.onGround,fv=p.vy;
  TacoPhysics.stepPlayer(p,inp,dt,PT);
  for(const e of p.events||[]){if(e.type==='jump'){AU.fx('jump');dust(p.x+p.w/2,p.y+p.h,6)}else if(e.type==='pound'){poundAt(e.x,e.y,e.radius)}else if(e.type==='pound_start'){AU.fx('roll')}}
  if(p.onGround)p.dj=0;
  if(inp.jumpPressed&&ch.dj&&!p.onGround&&!wasG&&!p.dj&&!(p.events||[]).some(e=>e.type==='jump')){p.dj=1;p.vy=-T.jumpV*0.85;p.jumping=true;p.inJump=true;p.cutDone=false;p.jumpT=0;AU.fx('star');burst(p.x+p.w/2,p.y+p.h,14,['#ff3b3b','#ffa23b','#ffe94b','#5ae36b','#4bb8ff','#9a5bff'],200,0.5,4)}
  if(ch.floaty&&inp.jump&&p.vy>140)p.vy=Math.max(140,p.vy-T.gravity*0.9*dt);
  if(p.onGround&&!wasG&&fv>500){dust(p.x+p.w/2,p.y+p.h,8);TFX(G.theme==='tatooine'?'sand':'land',p.x+p.w/2,p.y+p.h)}
  postMove(dt);return}
 // ladders
 const lad=G.plats.find(s=>s.type==='ladder'&&p.x+p.w>s.x&&p.x<s.x+s.w&&p.y+p.h>s.y&&p.y<s.y+s.h);
 if(lad&&(inp.U||inp.D)&&!p.ladder&&!inp.jumpPressed){p.ladder=true}
 if(p.ladder){if(!lad||inp.jumpPressed){p.ladder=false;if(inp.jumpPressed)p.vy=-T.jumpV*0.8}else{p.vx=(inp.R-inp.L)*120;p.vy=(inp.D-inp.U)*200;p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.y+p.h<lad.y+4){p.y=lad.y-p.h;p.ladder=false;p.vy=0}p.onGround=false;return postMove(dt,true)}}
 const ax=(inp.R?1:0)-(inp.L?1:0);
 if(ax){p.runT+=dt;const max=(p.runT>1?T.sprintMax:T.runMax)*ch.speed;const acc=p.onGround?T.runAccel:T.airAccel;if(Math.sign(p.vx)!==ax&&p.vx!==0)p.vx+=ax*T.friction*dt;p.vx+=ax*acc*dt;if(Math.abs(p.vx)>max)p.vx=lerp(p.vx,Math.sign(p.vx)*max,0.25);p.face=ax}
 else{p.runT=0;const f=(p.onGround?T.friction:T.friction*0.25)*dt;p.vx=Math.abs(p.vx)<=f?0:p.vx-Math.sign(p.vx)*f}
 if(p.onGround){p.coy=T.coyote;p.dj=0}else p.coy-=dt;
 if(inp.jumpPressed)p.jb=T.jumpBuffer;else p.jb-=dt;
 if(p.jb>0&&p.coy>0){p.vy=-T.jumpV*ch.jump-Math.abs(p.vx)*0.12;p.jb=0;p.coy=0;p.jumping=true;AU.fx('jump');dust(p.x+p.w/2,p.y+p.h,6)}
 else if(inp.jumpPressed&&ch.dj&&!p.onGround&&!p.dj){p.dj=1;p.vy=-T.jumpV*0.85;p.jumping=true;AU.fx('star');burst(p.x+p.w/2,p.y+p.h,14,['#ff3b3b','#ffa23b','#ffe94b','#5ae36b','#4bb8ff','#9a5bff'],200,0.5,4)}
 if(p.jumping&&!inp.jump&&p.vy<0){p.vy*=T.jumpCut;p.jumping=false}if(p.vy>=0)p.jumping=false;
 const g=ch.floaty&&inp.jump&&p.vy>0?T.gravity*0.45:T.gravity;p.vy=Math.min(p.vy+g*dt,ch.floaty&&inp.jump?T.maxFall*0.4:T.maxFall);
 const wasG=p.onGround,fallV=p.vy;
 collide(p,dt,inp.D&&p.onGround&&inp.jumpPressed);
 if(p.onGround&&!wasG&&fallV>500)dust(p.x+p.w/2,p.y+p.h,8);
 postMove(dt)}
function postMove(dt,noRide){const p=G.p;if(p.ride&&!noRide&&(p.ride.dxm||p.ride.dym)){p.x+=p.ride.dxm;p.y+=p.ride.dym}
 if(p.ride&&p.ride.type==='crumble'&&!p.ride.trig){p.ride.trig=0.6}
 if(p.x<G.cam.minX)p.x=G.cam.minX,p.vx=Math.max(0,p.vx);if(G.arena){if(p.x<G.arena.x0)p.x=G.arena.x0;if(p.x+p.w>G.arena.x1)p.x=G.arena.x1-p.w}
 if(p.x+p.w>G.L.width)p.x=G.L.width-p.w;
 if(p.onGround&&Math.abs(p.vx)>250&&Math.random()<0.3)dust(p.x+p.w/2,p.y+p.h,1);
 if(p.y>600)killPlayer('pit')}
function poundAt(x,y,r){shake(9);ring(x,y,'#ffffff',r);dust(x,y,14);AU.fx('stomp');for(const e of G.enemies){if(!e.dead&&Math.abs(e.x-x)<r&&Math.abs(e.y-y)<60){e.hp-=TUNE.poundDamage||2;e.flash=0.2;if(e.hp<=0){killEnemy(e,Math.sign(e.x-x)*250);run.score+=e.sc}}}if(G.boss&&!G.boss.dead&&Math.abs(G.boss.x-x)<G.boss.w/2+r&&Math.abs(G.boss.y-y)<80)damageBoss(TUNE.poundDamage||2,x,y)}
function dust(x,y,n){for(let i=0;i<n;i++)G.parts.push({x:x+rand(-10,10),y,vx:rand(-60,60),vy:rand(-80,-20),l:0.45,m:0.45,s:rand(3,7),c:G.theme==='tatooine'?'#e8c890':G.theme==='carealot'?'#ffffff':'#d8c8b8',add:false,g:-50,smoke:1})}
function hurtPlayer(src){const p=G.p;if(p.inv>0||p.star>0||p.dead||G.clear)return;if(p.shield){p.shield=0;p.inv=1;AU.fx('boss_hit');ring(p.x+p.w/2,p.y+p.h/2,'#7ff7ff',50);text(p.x,p.y-20,'SHIELD BLOCK!','#7ff7ff');return}p.hp--;run.hp=p.hp;p.inv=1.6;AU.fx('hurt');shake(10);hitstop(0.06);burst(p.x+p.w/2,p.y+p.h/2,16,['#ff4a4a','#ffffff'],260,0.5,4);
 if(window.TacoPhysics&&TacoPhysics.hurt){p.iframes=0;TacoPhysics.hurt(p,src?src.x:p.x+p.w/2+p.face)}else{p.vy=-420;p.vx=(src&&src.x>p.x?-1:1)*260}if(G.vm&&p.hp>0){const d=!G.vm.chase?-1:src&&src.x>p.x+p.w/2?-1:1;p.vx=d*460;p.vy=Math.min(p.vy,-380);p.inv=Math.min(p.inv,1.0);p.iframes=Math.min(p.iframes||0,1.0);G.vm.ai.stun=0.5}if(p.hp<=0)killPlayer()}
function killPlayer(why){const p=G.p;if(p.dead||G.clear)return;p.dead=true;G.deadT=2.2;run.lives--;AU.fx(why==='sarlacc'?'sarlacc':'die');shake(16);burst(p.x+p.w/2,p.y+p.h/2,40,['#ffe94b','#ff4a4a','#5ad84a','#ffffff'],400,1,5);
 if(why==='sarlacc')text(p.x,p.y-30,'SWALLOWED BY THE SARLACC!','#ffcc66',1);else if(why==='pit')text(p.x,G.cam.y+300,'OOPS!','#fff',1)}
function respawn(){const p=G.p;if(run.lives<=0){if(G.vm)return vEnd('villain','lives');return gameOver()}p.dead=false;p.captured=null;p.capT=0;p.pound=0;p.iframes=0;p.hurtLock=0;p.hp=p.maxHp;run.hp=p.hp;p.x=G.respawn.x;p.y=G.respawn.y;if(G.vm&&G.boss&&!G.boss.dead&&!(G.vm.side>0)&&p.x+p.w/2>G.boss.x-420){p.x=safeX(Math.max(G.vm.startX,G.boss.x-620),p.w);p.y=findGround(p.x+p.w/2)-p.h-4;G.vm.side=-1}p.vx=p.vy=0;p.inv=2.5;p.iframes=2.5;p.spawnT=1;if(G.mode==='bike'){p.y=280;p.vx=TUNE.bikeSpeed}
 else if(G.mode==='platform'){const sx=safeX(p.x,p.w);if(sx!==p.x||!hasGround(p.x+p.w/2)){p.x=sx;p.y=findGround(sx+p.w/2)-p.h-4}
  if(!G.vm){G.cam.x=clamp(p.x+p.w/2-viewW*(portrait?0.38:0.33),0,Math.max(0,G.L.width-viewW));G.cam.minX=G.cam.x;G.cam.y=VV>=VH?0:clamp(p.y+p.h/2-VV*0.55,0,VH-VV)}}
 G.enemies.forEach(e=>{if(e.dead&&!e.gone&&Math.abs(e.x0-p.x)>600){}});G.eshots=[];G.marks=[];G.reach=[];p.holdT=0;if(G.buddy)buddyWarp(G.buddy,p);
 if(G.boss&&!G.boss.dead&&!G.vm){G.enemies.forEach(e=>{if(!e.dead&&G.arena&&e.x>G.arena.x0-100&&e.x<G.arena.x1+100)e.gone=true});G.boss=null;G.arena=null;G.bossOn=false;G.tint=0;G.dim=0;AU.play(G.L.music||G.theme)}}
/* ---------------- weapons ---------------- */
const TOPS=['lettuce','tomato','cheese','jalapeno','salsa'];
function doThrow(){const p=G.p,ch=charOf(PC);if(p.cool>0||p.dead)return;
 const x=p.x+p.w/2+p.face*16,y=p.y+(PC==='taco'?14:p.h*0.35);let k=null;
 if(ch.weapon==='toppings'){let sel=run.sel;if(!(run.ammo[sel]>0))sel=TOPS.find(t=>run.ammo[t]>0);if(!sel){if(inp.throwPressed){text(p.x,p.y-20,'OUT OF TOPPINGS!','#ffcc66');AU.fx('nope')}p.cool=0.3;return}run.sel=sel;run.ammo[sel]--;k=sel}
 else if(ch.weapon==='sword'){p.cool=0.32;p.throwT=0.2;AU.fx('throw');G.shots.push({kind:'sword',x:x+p.face*18,y:y,vx:p.face*60+p.vx,vy:0,l:0.16,dmg:2,pierce:1,r:34,rot:p.face<0?Math.PI:0,melee:1});if(run.power>0&&inp.throwPressed){run.power--;G.shots.push({kind:'sword',x,y,vx:p.face*620,vy:0,l:0.7,dmg:2,pierce:1,r:22,rot:p.face<0?Math.PI:0})}return}
 else{if(run.power<=0){if(inp.throwPressed){text(p.x,p.y-20,'NO POWER! GRAB TOPPINGS',ch.weapon==='bolt'?'#ffcc66':'#fff');AU.fx('nope')}p.cool=0.3;return}run.power--;k=ch.weapon}
 p.throwT=0.18;AU.fx(k==='bolt'||k==='bullet'?'laser':'throw');const f=p.face,rot=f<0?Math.PI:0;
 switch(k){case'lettuce':G.shots.push({kind:k,x,y,vx:f*640+p.vx*0.3,vy:-40,g:200,l:1.2,dmg:1,r:9});p.cool=0.2;break;
  case'tomato':G.shots.push({kind:k,x,y,vx:f*420+p.vx*0.3,vy:-380,g:1400,l:2,dmg:2,r:9,bounce:2});p.cool=0.3;break;
  case'cheese':for(let i=0;i<2;i++)G.shots.push({kind:k,x,y:y+i*6-3,vx:f*(760+i*60),vy:0,l:0.8,dmg:1,r:7});p.cool=0.14;break;
  case'jalapeno':G.shots.push({kind:k,x,y,vx:f*560,vy:0,l:1.2,dmg:3,r:13,pierce:1,fire:1});p.cool=0.35;shake(3);break;
  case'salsa':for(let i=-1;i<=1;i++)G.shots.push({kind:k,x,y,vx:f*560*Math.cos(i*0.25),vy:560*Math.sin(i*0.25)-60,g:300,l:1,dmg:1,r:8});p.cool=0.3;break;
  case'star':G.shots.push({kind:k,x,y,vx:f*560,vy:0,l:1.3,dmg:1,r:10,home:1,hue:Math.random()*360});p.cool=0.18;break;
  case'care':G.shots.push({kind:k,x:x+f*24,y,vx:f*700,vy:0,l:0.55,dmg:2,r:20,pierce:1,rot});p.cool=0.4;break;
  case'bullet':G.shots.push({kind:k,x,y,vx:f*900,vy:rand(-20,20),l:0.8,dmg:1,r:6,rot});p.cool=0.1;break;
  case'bolt':G.shots.push({kind:k,x,y,vx:f*820,vy:0,l:0.9,dmg:3,r:9,rot});p.cool=0.42;shake(4);if(Math.random()<0.2)AU.fx('roar');break;
  case'rock':G.shots.push({kind:k,x,y,vx:f*560,vy:-260,g:1200,l:1.4,dmg:2,r:7,bounce:1});p.cool=0.28;break}}
/* ---------------- enemies ---------------- */
function stepEnemies(dt){const p=G.p;
 for(const e of G.enemies){if(e.gone)continue;e.t+=dt;if(e.flash>0)e.flash-=dt;
  if(e.dead){e.dt=(e.dt||0)+dt;e.vy+=1800*dt;e.y+=e.vy*dt;e.x+=e.vx*dt;if(e.dt>1.5)e.gone=true;continue}
  const dx=p.x+p.w/2-e.x,near=Math.abs(dx)<viewW*0.75;if(!near&&!e.awake)continue;e.awake=e.awake||Math.abs(dx)<viewW*0.6;if(!e.awake)continue;
  const body={x:e.x-e.w/2,y:e.y-e.h,w:e.w,h:e.h,vx:0,vy:e.vy};
  if(e.fly){if(e.b==='swooper'){if(e.state===0){e.x+=Math.sign(dx)*e.sp*0.6*dt;e.y=lerp(e.y,e.y0+Math.sin(e.t*2)*20,0.05);if(Math.abs(dx)<160&&e.cool<=0){e.state=1;e.tx=p.x;e.cool=2.5}}else{e.y+=380*dt;e.x+=Math.sign(dx)*120*dt;if(e.y>p.y+p.h-6||e.y>440){e.state=0}}if(e.state===0&&e.y<e.y0-4)e.y+=60*dt;e.cool-=dt}
   else{e.x+=Math.sign(dx)*Math.min(Math.abs(dx),e.sp)*dt*0.8;e.y=e.y0+Math.sin(e.t*1.6)*22;e.cool-=dt;if(e.cool<=0&&Math.abs(dx)<300){e.cool=1.6;eshot(e.x,e.y,0,120,e.shot||'rain')}}
   e.dir=dx>0?1:-1}
  else{let vx=0;
   if(e.b==='walker'||e.b==='shooter'||e.b==='tank'){vx=e.dir*e.sp;if(e.x<e.x0-e.range)e.dir=1;if(e.x>e.x0+e.range)e.dir=-1;
    if((e.b==='shooter'||e.b==='tank')&&Math.abs(dx)<420&&Math.abs(p.y-e.y+40)<120){e.cool-=dt;if(e.cool<0.4)vx=0;if(e.cool<=0){e.dir=dx>0?1:-1;e.cool=e.b==='tank'?2.2:1.8+Math.random();eshot(e.x+e.dir*20,e.y-e.h*0.55,e.dir*380,0,e.shot||'bolt')}}}
   else if(e.b==='hopper'){if(e.onG){e.cool-=dt;vx=0;if(e.cool<=0){e.dir=dx>0?1:-1;e.vy=-560;e.cool=1+Math.random()*0.6;e.hv=e.dir*e.sp*1.6}}else vx=e.hv||0}
   else if(e.b==='charger'){if(e.state===0){vx=e.dir*e.sp*0.6;if(e.x<e.x0-e.range)e.dir=1;if(e.x>e.x0+e.range)e.dir=-1;if(Math.abs(dx)<300&&Math.abs(p.y+p.h-e.y)<60){e.state=1;e.dir=dx>0?1:-1;e.ct=0.9}}else{vx=e.dir*e.sp*3;e.ct-=dt;if(e.ct<=0){e.state=0;e.x0=e.x}}}
   body.vx=vx;body.vy=e.vy+1800*dt;collide(body,dt,false);e.x=body.x+e.w/2;e.y=body.y+e.h;e.vy=body.vy;e.onG=body.onGround;if(body.hitWall&&e.b!=='hopper')e.dir*=-1;
   // turn at ledges for walkers
   if(e.onG&&(e.b==='walker'||e.b==='shooter'||e.b==='tank'||e.b==='charger')){const ahead={x:e.x+e.dir*(e.w/2+4),y:e.y+4,w:2,h:6};if(!G.solids.some(s=>ov(ahead,s))&&!G.plats.some(s=>ov(ahead,s))){e.dir*=-1;if(e.state===1)e.state=0}}
   if(e.y>640){e.gone=true;continue}}
  // vs player
  const eb={x:e.x-e.w/2+3,y:e.y-e.h+3,w:e.w-6,h:e.h-3},pb={x:p.x,y:p.y,w:p.w,h:p.h};
  if(!p.dead&&ov(eb,pb)){
   if(p.star>0){killEnemy(e,p.face*200,true);continue}
   if(p.vy>60&&p.y+p.h-eb.y<22+p.vy*dt){if(e.nostomp){p.vy=-TUNE.stompBounce*0.8;AU.fx('stomp');text(e.x,e.y-e.h,'TOO TOUGH! THROW!','#ffcc66');continue}
    stompEnemy(e)}
   else hurtPlayer({x:e.x})}}
 G.enemies=G.enemies.filter(e=>!e.gone)}
function stompEnemy(e){const p=G.p;G.combo++;G.comboT=1.2;const mult=Math.min(8,G.combo);e.hp--;
 p.vy=-(inp.jump?TUNE.stompBounceHeld:TUNE.stompBounce);p.jumping=inp.jump;p.y=e.y-e.h-p.h;
 AU.fx('stomp');hitstop(0.05);shake(5);ring(e.x,e.y-e.h,'#ffffff',44);TFX('stomp',e.x,e.y-e.h);burst(e.x,e.y-e.h,14,['#ffe94b','#ffffff','#ff4bd8'],260,0.45,4);
 const pts=e.sc*mult;run.score+=pts;text(e.x,e.y-e.h-14,(mult>1?mult+'x COMBO! ':'')+pts,mult>2?'#ffe94b':'#fff');
 if(e.hp<=0)killEnemy(e,0,false,true);else{e.flash=0.2}}
function killEnemy(e,vx,score,stomped){e.dead=true;TFX(stomped?'dust':'explode',e.x,e.y-e.h/2);e.vy=stomped?0:-420;e.vx=vx||0;e.squash=stomped;if(score!==false&&!stomped)run.score+=e.sc;burst(e.x,e.y-e.h/2,22,['#ffffff','#ffcc33','#ff5a2a'],320,0.6,4);if(Math.random()<0.22)G.pickups.push({type:Math.random()<0.5?TOPS[Math.floor(Math.random()*5)]:'coin',x:e.x,y:e.y-30,got:false,pop:1,vy:-300})}
function eshot(x,y,vx,vy,kind){const g=kind==='slime'||kind==='bomb'?900:kind==='rain'?400:0;G.eshots.push({x,y,vx,vy,kind,l:4,r:kind==='bomb'?10:kind==='fire'?12:kind==='slash'?14:7,g,rot:g?(vx<0?Math.PI:0):Math.atan2(vy,vx)})}
/* ---------------- shots ---------------- */
function stepShots(dt){const p=G.p;
 for(const s of G.shots){s.l-=dt;if(s.home){let best=null,bd=260;for(const e of G.enemies)if(!e.dead){const d=Math.hypot(e.x-s.x,e.y-e.h/2-s.y);if(d<bd){bd=d;best=e}}if(best){s.vy+=(best.y-best.h/2-s.y)*6*dt}}
  if(s.g)s.vy+=s.g*dt;s.x+=s.vx*dt;s.y+=s.vy*dt;if(!s.melee)s.rot=(s.rot||0)+(s.kind==='lettuce'||s.kind==='tomato'?12*dt*Math.sign(s.vx):0);
  if(G.mode!=='flight'){for(const so of G.solids)if(s.x>so.x&&s.x<so.x+so.w&&s.y>so.y&&s.y<so.y+so.h){if(s.bounce>0&&s.vy>0){s.vy=-s.vy*0.6;s.y=so.y-1;s.bounce--}else{s.l=0;splat(s)}}}
  if(s.fire&&Math.random()<0.6)G.parts.push({x:s.x,y:s.y,vx:rand(-30,30),vy:rand(-60,0),l:0.3,m:0.3,s:rand(4,8),c:Math.random()<0.5?'#ff8a00':'#ffdd33',add:true,g:-100});
  if(s.kind==='star'&&Math.random()<0.5)G.parts.push({x:s.x,y:s.y,vx:0,vy:0,l:0.3,m:0.3,s:3,c:'hsl('+s.hue+',100%,70%)',add:true,g:0});
  if(s.l<=0)continue;
  for(const e of G.enemies){if(e.dead)continue;if(Math.abs(e.x-s.x)<e.w/2+s.r&&s.y>e.y-e.h-s.r&&s.y<e.y+s.r){if(s.hitSet&&s.hitSet.has(e))continue;e.hp-=s.dmg;e.flash=0.12;AU.fx('stomp');burst(s.x,s.y,8,colOf(s.kind),200,0.35,3);
    if(e.hp<=0){killEnemy(e,Math.sign(s.vx)*220);text(e.x,e.y-e.h-10,''+e.sc,'#fff')}else e.x+=Math.sign(s.vx)*6;
    if(s.pierce){(s.hitSet=s.hitSet||new Set()).add(e)}else{s.l=0;break}}}
  if(s.l>0&&G.boss&&!G.boss.dead&&bossHitTest(G.boss,s)){if(!(s.hitSet&&s.hitSet.has(G.boss))){damageBoss(s.dmg,s.x,s.y);if(s.pierce)(s.hitSet=s.hitSet||new Set()).add(G.boss);else s.l=0}}}
 G.shots=G.shots.filter(s=>s.l>0&&s.y<700&&(G.vm||s.x>G.cam.x-200&&s.x<G.cam.x+viewW+200));
 for(const s of G.eshots){s.l-=dt;if(s.g)s.vy+=s.g*dt;if(s.ax)s.vx+=s.ax*dt;if(s.spin)s.rot=(s.rot||0)+dt*18;if(s.kind==='fire'&&Math.random()<dt*30)G.parts.push({x:s.x-Math.sign(s.vx)*8,y:s.y+rand(-4,4),vx:-s.vx*0.1,vy:rand(-30,10),l:0.35,m:0.35,s:5,c:Math.random()<0.5?'#ff8a00':'#ffdd33',add:true,g:-60});if(s.ground&&Math.random()<dt*25)burst(s.x,s.y+8,1,s.kind==='snake'?['#5aff7a']:s.kind==='firewall'||s.kind==='fireshock'?['#ff8a00','#ffdd33']:['#e8d8b0'],90,0.3,3,true,200);s.x+=s.vx*dt;s.y+=s.vy*dt;
  if(G.mode!=='flight')for(const so of G.solids)if(s.x>so.x&&s.x<so.x+so.w&&s.y>so.y&&s.y<so.y+so.h){s.l=0;if(s.kind==='bomb'){burst(s.x,s.y,20,['#ff8a00','#ffdd33','#444'],300,0.6,5);shake(6);AU.fx('explode');if(Math.abs(p.x+p.w/2-s.x)<60&&Math.abs(p.y+p.h-s.y)<60)hurtPlayer(s)}else burst(s.x,s.y,6,colOf(s.kind),120,0.3,3)}
  if(s.l>0&&!p.dead&&s.x>p.x-s.r&&s.x<p.x+p.w+s.r&&s.y>p.y-s.r&&s.y<p.y+p.h+s.r){s.l=0;const fz=s.freeze&&p.inv<=0&&!(p.star>0);hurtPlayer(s);if(fz&&!p.dead){p.holdT=s.freeze;p.holdX=p.x;p.iceT=s.freeze;burst(p.x+p.w/2,p.y+p.h/2,20,['#ffffff','#9ae8ff'],240,0.5,4);text(p.x+p.w/2,p.y-24,'FROZEN!','#9ae8ff')}}}
 G.eshots=G.eshots.filter(s=>s.l>0&&s.y<700)}
function colOf(k){return{lettuce:['#5ad84a','#9af07a'],tomato:['#e8302a','#ffb0a0'],cheese:['#ffd23a','#fff2a0'],jalapeno:['#ff8a00','#ffdd33','#2ab83a'],salsa:['#d8261c','#2ab83a'],star:['#fff','#ffe94b','#ff4bd8'],care:['#ff7ab8','#ffe94b','#7ff7ff'],sword:['#bff8ff','#ffffff'],bullet:['#ffe066'],bolt:['#ff3a2a','#fff'],gbolt:['#3aff4a'],rlaser:['#ff4a3a','#fff'],glaser:['#5aff5a','#fff'],slime:['#8ad83a'],rain:['#7ab8ff'],bomb:['#ff8a00'],ice:['#ffffff','#9ae8ff'],shuriken:['#d8dde8','#fff'],rocket:['#ff8a00','#ccc'],gloom:['#8a6ad8','#d8c8ff'],saber:['#ff4a4a','#fff'],magic:['#d38cff','#fff']}[k]||['#fff']}
function splat(s){burst(s.x,s.y,8,colOf(s.kind),160,0.35,3,s.kind==='jalapeno')}
/* ---------------- world objects ---------------- */
function stepWorld(dt){const p=G.p;
 // moving / crumble platforms
 for(const s of G.plats.concat(G.solids)){if(s.type==='moving'){const per=s.period||4,ph=(G.t%per)/per,k=(1-Math.cos(ph*TAU))/2;const nx=s.x0+(s.dx||0)*k,ny=s.y0+(s.dy||0)*k;s.dxm=nx-s.x;s.dym=ny-s.y;s.x=nx;s.y=ny}
  if(s.type==='crumble'){if(s.trig>0){s.trig-=dt;s.shk=1;if(s.trig<=0){s.fallen=true;s.fy=0;s.rt=3;burst(s.x+s.w/2,s.y+10,12,['#c8b8a8','#8a7a6a'],160,0.5,4,false)}}if(s.fallen){s.fy+=dt*400;s.rt-=dt;if(s.rt<=0){s.fallen=false;s.trig=0;s.fy=0;s.shk=0}}}}
 // springs
 for(const s of G.springs){if(s.sq>0)s.sq-=dt*4;if(!p.dead&&p.vy>=0&&p.x+p.w>s.x-16&&p.x<s.x+16&&p.y+p.h>=s.y-18&&p.y+p.h<=s.y+6){p.y=s.y-18-p.h;if(window.TacoPhysics&&TacoPhysics.spring)TacoPhysics.spring(p,TUNE.springV);else p.vy=-TUNE.springV;p.onGround=false;s.sq=1;AU.fx('spring');burst(s.x,s.y-18,10,['#fff','#7ff7ff'],200,0.4,3)}}
 // boost pads
 for(const b of G.L.boosts||[]){if(p.onGround&&p.x+p.w>b.x&&p.x<b.x+b.w&&Math.abs(p.y+p.h-b.y)<6){p.vx=(b.dir||1)*TUNE.sprintMax*(b.power||1.5);p.runT=Math.max(p.runT,1.2);p.boostT=1;if(!b.fxT||G.t-b.fxT>0.5){b.fxT=G.t;AU.fx('spring');burst(p.x,p.y+p.h,14,['#7ff7ff','#ffffff'],260,0.4,3)}}}
 if(p.boostT>0){p.boostT-=dt;if(Math.abs(p.vx)<TUNE.sprintMax*1.2)p.vx=Math.sign(p.vx||1)*TUNE.sprintMax*1.2;G.parts.push({x:p.x+p.w/2,y:p.y+p.h/2,vx:-p.vx*0.2,vy:0,l:0.25,m:0.25,s:6,c:'#7ff7ff',add:true,g:0})}
 // hazards
 for(const h of G.hazards){
  if(h.type==='sarlacc'){const cx=h.x+h.w/2;h.pull=0;if(p.dead)continue;
   const fl=findGround(h.x-12),onArch=p.y+p.h<Math.min(fl,h.y)-100;if(onArch){p.pullVx=0;continue}
   if(window.TacoPhysics&&TacoPhysics.sarlacc){const r=TacoPhysics.sarlacc(p,{x:h.x,w:h.w,y:h.y},dt);h.pull=p.sarlaccStrength||0;if(r==='captured'&&!p.capT){p.capT=1.1;AU.fx('sarlacc');shake(12)}}
   else{const d=cx-(p.x+p.w/2);if(Math.abs(d)<TUNE.sarlaccRadius&&p.y+p.h>h.y-200){h.pull=1-Math.abs(d)/TUNE.sarlaccRadius;p.vx+=Math.sign(d)*TUNE.sarlaccPull*h.pull*dt}if(Math.abs(d)<24&&p.y+p.h>=h.y-10){p.capT=1}}
   continue}
  if(h.type==='sand'){if(p.onGround&&p.x+p.w>h.x&&p.x<h.x+h.w&&Math.abs(p.y+p.h-(h.y||460))<12){p.vx*=Math.pow(0.15,dt);if(Math.random()<0.2)dust(p.x+p.w/2,p.y+p.h,1)}continue}
  const on=h.type!=='laser'||((G.t+(h.x%7)*0.3)%2.4)<1.4;h.on=on;if(!on)continue;
  const r={x:h.x,y:h.y,w:h.w,h:h.h||20};if(!p.dead&&ov(p,r)){hurtPlayer({x:p.x+p.w/2-p.face});if(h.type==='spikes'||h.type==='acid'||h.type==='lava')p.vy=-620}}
 if(p.capT>0){p.capT-=dt;p.vx*=0.8;p.y+=60*dt;if(p.capT<=0){p.capT=0;p.captured=null;killPlayer('sarlacc')}}
 // pickups
 for(const q of G.pickups){if(q.got)continue;if(q.pop){q.vy+=1500*dt;q.y+=q.vy*dt;for(const s of G.solids)if(q.x>s.x&&q.x<s.x+s.w&&q.y+10>s.y&&q.y<s.y+20&&q.vy>0){q.y=s.y-12;q.vy=0;q.pop=0}if(q.y>620)q.got=true}
  if(Math.abs(p.x+p.w/2-q.x)<p.w/2+14&&q.y>p.y-14&&q.y<p.y+p.h+14&&!p.dead)collect(q)}
 // checkpoints
 for(const k of G.checkpoints){if(!k.on&&p.x>k.x-10){k.on=true;G.respawn={x:k.x,y:findGround(k.x)-p.h-4};AU.fx('checkpoint');text(k.x,findGround(k.x)-110,'CHECKPOINT!','#7ff7ff',1);burst(k.x,findGround(k.x)-80,30,['#7ff7ff','#ff4bd8','#ffe94b'],300,0.8,4)}}
 // allies
 for(const a of G.allies){if(playKey(a.who)===PC)continue;a.t=(a.t||0)+dt;allyAmmo(a,dt);if(a.sayT>0)a.sayT-=dt;const d=Math.abs(p.x+p.w/2-a.x);
  if(!a.met&&d<110&&!(a.trigger==='boss_phase')){a.met=true;a.sayT=3.2;AU.fx(a.who==='chewbacca'?'roar':'pickup');if(a.gift){G.pickups.push({type:a.gift,x:a.x+20,y:a.y-70,got:false,pop:1,vy:-380})}(a.give||[]).forEach((g,i)=>G.pickups.push({type:g,x:a.x+i*24,y:a.y-70,got:false,pop:1,vy:-380}));if(a.action==='follow'||a.fights)a.follow=true;if(a.action==='roar_scare'||a.who==='chewbacca')G.enemies.forEach(e=>{if(Math.abs(e.x-a.x)<400&&!e.dead){e.dir=e.x>a.x?1:-1;e.flee=3}})}
  if(a.trigger==='boss_phase'&&G.boss&&!G.boss.dead&&!a.met&&G.boss.phase>=(a.phase||2)&&(!a.boss||(BOSS_ALIAS[a.boss]||a.boss)===G.boss.type)){a.met=true;a.sayT=3;a.x=clamp(p.x-60,G.arena?G.arena.x0+30:0,1e9);AU.fx(a.who==='chewbacca'?'roar':'star');if(a.who==='chewbacca'||a.orig==='chewbacca'){const B=G.boss;if(B.type==='big_helmet'){B.ally=1;a.ammoT=6}else if(B.type==='skeletor'){damageBoss(3,B.x,B.y-60);B.x=clamp(B.x,G.arena.x0+60,G.arena.x1-60);B.gy=findGround(B.x);B.y=B.gy;B.state='floored';B.st=3;B.ghost=0;B.alpha=1;text(B.x,B.y-B.dh-14,'KNOCKED OFF THE THRONE!','#ffcc66',1)}else{B.stun=3;damageBoss(4,B.x,B.y-60)}}else{p.shield=1;text(p.x,p.y-30,'SHIELD!','#7ff7ff',1)}a.follow=true}
  if(a.follow&&(!a.until_x||p.x<a.until_x)){const tx=p.x-p.face*70;a.x+=clamp(tx-a.x,-1,1)*Math.min(Math.abs(tx-a.x)*4,380)*dt;a.y=findGround(a.x);a.face=p.face;a.cool-=dt;
   if(a.cool<=0){let best=null,bd=420;for(const e of G.enemies)if(!e.dead&&Math.abs(e.x-a.x)<bd&&Math.abs(e.y-a.y)<160){bd=Math.abs(e.x-a.x);best=e}
    const tgt=best||(G.boss&&!G.boss.dead&&Math.abs(G.boss.x-a.x)<500?G.boss:null);if(tgt){const dir=tgt.x>a.x?1:-1;G.shots.push({kind:'bolt',x:a.x+dir*20,y:a.y-40,vx:dir*820,vy:0,l:0.9,dmg:2,r:9,rot:dir<0?Math.PI:0});a.cool=1.6;a.face=dir;AU.fx('laser')}}}}
 // goal
 const gl=G.L.goal;if(!G.vm&&!G.clear&&!p.dead&&(!G.boss||G.boss.dead)&&(!G.bossType||G.allBossDone)&&p.x+p.w>gl.x-10&&p.x<gl.x+40)levelClear()}
function hasGround(x){return G.solids.some(s=>s.type!=='sand'&&x>=s.x&&x<=s.x+s.w&&s.y<VH)}
function safeX(x,w){const ok=x=>hasGround(x+4)&&hasGround(x+w-4);if(ok(x))return x;for(let d=16;d<1600;d+=16){if(ok(x-d))return x-d;if(ok(x+d)&&x+d<G.L.width-60)return x+d}return x}
function findGround(x){let best=600;for(const s of G.solids)if(x>=s.x&&x<=s.x+s.w&&s.y<best)best=s.y;return best===600?460:best}
function collect(q){q.got=true;const p=G.p;const ch=charOf(PC);
 switch(q.type){case'coin':run.coins++;run.score+=100;AU.fx('coin');burst(q.x,q.y,6,['#ffe94b','#fff'],120,0.3,3);if(run.coins%100===0){run.lives++;AU.fx('oneup');text(q.x,q.y-20,'1-UP!','#5ad84a',1)}return;
  case'heart':p.hp=Math.min(p.maxHp,p.hp+1);text(q.x,q.y-20,'+1 HEALTH','#ff7ab8');AU.fx('heal');break;
  case'taco_shell':p.hp=p.maxHp;text(q.x,q.y-20,'FULL HEALTH!','#ffd23a');AU.fx('heal');break;
  case'star':p.star=8;text(q.x,q.y-20,'TOTALLY RAD!','#ffe94b',1);AU.fx('star');break;
  case'oneup':run.lives++;text(q.x,q.y-20,'1-UP!','#5ad84a',1);AU.fx('oneup');break;
  default:if(TOPS.includes(q.type)){if(ch.weapon==='toppings'){run.ammo[q.type]=Math.min(99,(run.ammo[q.type]||0)+10);run.sel=q.type;text(q.x,q.y-20,'+10 '+q.type.toUpperCase(),'#ffe94b')}else{run.power=Math.min(99,run.power+10);text(q.x,q.y-20,'+10 POWER','#7ff7ff')}AU.fx('pickup')}}
 run.hp=p.hp;run.score+=50;TFX(q.type==='heart'?'hearts':'pickup',q.x,q.y);burst(q.x,q.y,14,['#ffffff','#ffe94b','#ff4bd8'],200,0.5,3)}
/* ---------------- bosses ---------------- */
const BOSS_ALIAS={gloom_machine:'murky_gloom',murky:'murky_gloom',cobra:'cobra_commander',jabba:'big_helmet',dark_helmet:'big_helmet',freddy:'freddy_krueger',krueger:'freddy_krueger'};
/* ================= Peter Addition 4 bosses: Big Helmet, Bowser, Freddy Krueger, Skeletor =================
   Fair-on-a-phone rules (DESIGN.md): one attack at a time, every attack telegraphed >=0.6 s, 1.2 s i-frames after a hit,
   a clear opening (often 2x damage) after each big attack, nothing instant-kills except falling into a pit. */
const NB={big_helmet:1,bowser:1,freddy_krueger:1,skeletor:1};
const TAUNT={big_helmet:['Ludicrous speed! GO!','I see your Schwartz is as big as mine!','Evil will always triumph, because good is dumb!','Prepare to be... helmeted!'],
 bowser:['BWAHAHAHA!','This bridge is MINE, taco!','Feel the heat!','You\u2019re no plumber!'],
 freddy_krueger:['Welcome to my nightmare!','One, two... Freddy\u2019s coming for you!','Sweet dreams, taco!','Never sleep again!'],
 skeletor:['Nyaaah! I am SKELETOR!','By the power of... ME!','Fools! Grayskull will be mine!','Bow before Skeletor!']};
function bSay(b,s){b.say=s||TAUNT[b.type][Math.floor(Math.random()*TAUNT[b.type].length)];b.sayT=2.2}
function bTell(b,next,dur,say,col){b.state='tell';b.next=next;b.st=dur;b.sd=dur;if(say)text(b.x,b.y-b.dh-18,say,col||'#ffe94b',1)}
function bGo(b,s,dur){b.state=s;b.st=dur;b.sd=dur}
function mark(o){(G.marks=G.marks||[]).push(Object.assign({t:0.9,m:0.9,w:80,col:'#000'},o,{m:o.t||0.9}))}
function shockwave(x,y,dir,dist,spd,kind){G.eshots.push({x:x+dir*20,y:y-11,vx:dir*spd,vy:0,kind:kind||'shock',l:dist/spd,r:12,g:0,ground:1,rot:dir<0?Math.PI:0})}
function bMelee(b,reach,y0,y1,dir){const p=G.p,d=dir||b.dir;const r={x:d>0?b.x:b.x-reach,y:b.gy-y1,w:reach,h:y1-y0};b.hitbox=r;if(!p.dead&&ov(r,p)&&p.inv<=0)hurtPlayer({x:b.x});return r}
function arenaPit(){const A=G.arena;if(!A)return null;return G.hazards.find(h=>h.type==='sarlacc'&&h.x>A.x0&&h.x<A.x1)||null}
function bAvoidPit(b,pad){const pit=arenaPit();if(!pit)return false;const l=pit.x-pad,r=pit.x+pit.w+pad;if(b.x>l&&b.x<r){b.x=b.x<(l+r)/2?l:r;return true}return false}
function nearPitEdge(b,dir,pad){const pit=arenaPit();if(!pit)return false;return dir>0?(b.x<pit.x&&b.x+dir*1>pit.x-pad):(b.x>pit.x+pit.w&&b.x<pit.x+pit.w+pad)}
function bMinions(b,types,max){const alive=G.enemies.filter(e=>!e.dead).length;const A=G.arena;for(const t of types){if(G.enemies.filter(e=>!e.dead).length>=max)break;const x=clamp(b.x+rand(-260,260),A.x0+50,A.x1-50);spawnEnemy({type:t,x,y:ET[t]&&ET[t].fly?b.gy-180:findGround(x)});const e=G.enemies[G.enemies.length-1];e.awake=true;burst(x,findGround(x)-30,18,['#d38cff','#fff'],220,0.5,4)}return alive}
function stepNewBoss(b,dt,dx){const p=G.p,A=G.arena,ph=b.phase;b.st-=dt;if(b.sayT>0)b.sayT-=dt;if(b.atkT>0)b.atkT-=dt;b.vuln=0;b.hitbox=null;
 const face=()=>{b.dir=dx>0?1:-1};const fdir=dx>0?1:-1;
 if(b.type==='big_helmet'){const sp=ph===3?600:520;b.lockDir=0;
  switch(b.state){
   case'idle':case'strut':{face();if(b.state==='idle'){bGo(b,'strut',2);if(Math.random()<0.5)bSay(b)}b.x+=b.dir*60*dt;bAvoidPit(b,30);b.dir=fdir;
    if(b.st<=0){b.n=(b.n||0)+1;
     if(ph===1)bTell(b,'charge',0.8,'LUDICROUS SPEED!','#ffcc66');
     else if(ph===2){if(b.n%3===0)bTell(b,'charge',0.8,'LUDICROUS SPEED!','#ffcc66');else if(Math.random()<0.55)bTell(b,'sweep',0.7,'THE SCHWARTZ!','#ff5a5a');else bTell(b,'toss',0.6,'RING TOSS!','#ff8a8a')}
     else{if(b.n%2===0)bTell(b,'slam',0.5,'VISOR DOWN!','#ff5a5a');else bTell(b,'charge',0.8,'LUDICROUS SPEED!','#ffcc66')}
     b.cdir=fdir}
    if(ph>=2&&(b.minT=(b.minT||8)-dt)<=0){b.minT=8;bMinions(b,[A.minions||'stormtrooper',A.minions||'stormtrooper'],2)}
    break}
   case'tell':{b.atkT=0.2;b.x+=Math.sin(b.t*60)*0.6;if(b.next==='charge'&&Math.random()<dt*20)dust(b.x-b.dir*30,b.gy,2);if(b.next==='sweep'||b.next==='toss')b.glow=1;
    if(b.st<=0){b.glow=0;if(b.next==='charge'){b.cdir=fdir;b.dir=b.cdir;bGo(b,'charge',b.ally?1.6:2.2);AU.fx('roll')}
     else if(b.next==='sweep'){face();bGo(b,'sweep',0.35);AU.fx('laser')}
     else if(b.next==='toss'){face();G.eshots.push({x:b.x+b.dir*30,y:b.gy-62,vx:b.dir*560,vy:0,ax:-b.dir*933,kind:'ring',l:1.25,r:14,g:0,spin:1});AU.fx('throw');bGo(b,'recover',0.8)}
     else if(b.next==='slam'){let tx=clamp(p.x+p.w/2,A.x0+b.w/2,A.x1-b.w/2);const pit=arenaPit();if(pit&&tx>pit.x-40&&tx<pit.x+pit.w+40)tx=tx<pit.x+pit.w/2?pit.x-50:pit.x+pit.w+50;b.tx=tx;b.vy=-1250;b.y-=2;bGo(b,'leap',0.9);mark({x:tx,y:b.gy,w:110,t:0.9,kind:'shadow'});AU.fx('jump')}}
    break}
   case'charge':{b.dir=b.cdir;b.atkT=0.3;b.x+=b.cdir*sp*dt;if(Math.random()<dt*30)dust(b.x-b.cdir*40,b.gy,2);bMelee(b,b.w*0.8,0,b.h*0.85,b.cdir);
    const pit=arenaPit();
    if(pit&&((b.cdir>0&&b.x<pit.x&&b.x+b.w*0.5>=pit.x-6)||(b.cdir<0&&b.x>pit.x+pit.w&&b.x-b.w*0.5<=pit.x+pit.w+6))){b.x=b.cdir>0?pit.x-6-b.w*0.5:pit.x+pit.w+6+b.w*0.5;bGo(b,'teeter',1.5);text(b.x,b.y-b.dh-14,'WHOA WHOA WHOA!','#ffcc66',1);AU.fx('hurt');break}
    if(b.x<A.x0+b.w/2||b.x>A.x1-b.w/2){b.x=clamp(b.x,A.x0+b.w/2,A.x1-b.w/2);shake(10);AU.fx('stomp');burst(b.x+b.cdir*40,b.gy-60,16,['#ccc','#fff'],260,0.5,4);bGo(b,'recover',0.7)}
    if(b.st<=0)bGo(b,'recover',0.6);break}
   case'teeter':{b.vuln=2;b.x+=Math.sin(b.t*25)*0.8;if(b.st<=0)bGo(b,'recover',0.3);break}
   case'sweep':{b.atkT=0.3;b.glow=1;bMelee(b,220,20,70);if(b.st<=0){b.glow=0;bGo(b,'recover',1.0)}break}
   case'leap':{b.atkT=0.3;b.x=lerp(b.x,b.tx,Math.min(1,dt*5));if(b.vy>=0&&b.st>0.15)b.vy=Math.min(b.vy,0);b.vy+=2400*dt;b.y+=b.vy*dt;
    if(b.y>=b.gy&&b.st<=0.2){b.y=b.gy;b.vy=0;shake(16);AU.fx('stomp');ring(b.x,b.gy,'#ffcc66',90);dust(b.x,b.gy,20);shockwave(b.x,b.gy,1,300,420);shockwave(b.x,b.gy,-1,300,420);bGo(b,'blind',2.5);text(b.x,b.y-b.dh-14,'MY VISOR! I CAN\u2019T SEE!','#7ff7ff',1)}else if(b.y>b.gy)b.y=b.gy;break}
   case'blind':{b.vuln=2;b.blind=1;b.x+=(Math.sin(b.t*1.7)>0?1:-1)*40*dt;b.x=clamp(b.x,A.x0+b.w/2,A.x1-b.w/2);if(bAvoidPit(b,20)&&!b.teetered){b.teetered=1;bGo(b,'teeter',1.5)}if(b.st<=0){b.blind=0;b.teetered=0;bGo(b,'recover',0.3)}break}
   default:{if(b.st<=0)bGo(b,'idle',0)}}
  if(ph===3){b.tentT=(b.tentT===undefined?4:b.tentT)-dt;const pit=arenaPit();if(pit&&b.tentT<=0){b.tentT=7;for(const ex of[pit.x-20,pit.x+pit.w+20])mark({x:ex,y:findGround(ex),w:60,t:1.0,kind:'rumble',then:'tentacle'})}}
  b.x=clamp(b.x,A.x0+b.w/2,A.x1-b.w/2);if(b.state!=='leap'&&b.state!=='charge')bAvoidPit(b,10)}
 else if(b.type==='bowser'){
  const onGround=b.y>=b.gy-0.5;
  switch(b.state){
   case'idle':{face();if(b.st<=0){b.n=(b.n||0)+1;
     if(ph===3&&b.n%2===1)bTell(b,'spin',0.7,'SHELL SPIN!','#ffcc33');
     else if(ph>=2&&b.n%2===0)bTell(b,'pound',0.35,'BWAHAHA!','#ff8a3a');
     else bTell(b,'breath',0.8,null)}
    else if(onGround&&Math.random()<dt*0.9&&Math.abs(dx)>160){b.vy=-520;b.hvx=fdir*160;b.y-=1}
    break}
   case'tell':{face();b.atkT=b.next==='breath'?0.2:0;if(b.next==='breath'&&Math.random()<dt*18){const mx=b.x+b.dir*b.w*0.42,my=b.y-b.dh*0.72;G.parts.push({x:mx,y:my,vx:rand(-20,20),vy:-rand(30,80),l:0.7,m:0.7,s:5,c:'#8a8a8a',smoke:1,g:-40});burst(mx,my,1,['#ff8a00','#ffdd33'],60,0.3,3)}
    if(b.next==='spin')b.glow=1;
    if(b.st<=0){b.glow=0;if(b.next==='breath'){bGo(b,'breath',1.4);b.fb=0;b.fbT=0}else if(b.next==='pound'){b.vy=-1500;b.y-=2;bGo(b,'up',0.6);AU.fx('jump')}else if(b.next==='spin'){b.cdir=fdir;b.bounces=0;bGo(b,'spin',8);AU.fx('roll')}}break}
   case'breath':{b.atkT=0.3;b.fbT-=dt;if(b.fbT<=0&&b.fb<3){const hi=b.fb%2===1;eshot(b.x+b.dir*b.w*0.45,hi?b.gy-86:b.gy-24,b.dir*260,0,'fire');b.fb++;b.fbT=0.5;AU.fx('explode')}if(b.fb>=3&&b.fbT<=0)bGo(b,'idle',ph>=2?1.0:1.4);break}
   case'up':{b.y+=b.vy*dt;b.vy+=900*dt;if(b.y<G.cam.y-260||b.st<=0){b.y=-400;b.tx=clamp(p.x+p.w/2,A.x0+b.w/2,A.x1-b.w/2);mark({x:b.tx,y:findGround(b.tx),w:150,t:0.9,kind:'shadow'});bGo(b,'hang',1.3)}break}
   case'hang':{if(b.st<=0.4&&!b.whistle){b.whistle=1;AU.fx('spring')}if(b.st<=0){b.whistle=0;b.x=b.tx;b.vy=1600;bGo(b,'drop',2)}break}
   case'drop':{b.y+=b.vy*dt;b.atkT=0.3;if(b.y>=b.gy){b.y=b.gy;b.vy=0;shake(20);AU.fx('stomp');ring(b.x,b.gy,'#ff8a3a',110);dust(b.x,b.gy,26);if(Math.abs(p.x+p.w/2-b.x)<b.w*0.6&&p.y+p.h>b.gy-b.h)hurtPlayer({x:b.x});shockwave(b.x,b.gy,1,350,300,'fireshock');shockwave(b.x,b.gy,-1,350,300,'fireshock');bGo(b,'stuck',1.2)}break}
   case'stuck':{b.vuln=1.5;if(b.st<=0)bGo(b,'idle',0.8);break}
   case'spin':{b.spiky=1;b.atkT=0.3;b.x+=b.cdir*450*dt;b.spinA=(b.spinA||0)+dt*18;if(Math.random()<dt*20)burst(b.x,b.gy-10,1,['#ffcc33','#fff'],120,0.3,3);
    if(b.x<A.x0+b.w/2||b.x>A.x1-b.w/2){b.x=clamp(b.x,A.x0+b.w/2,A.x1-b.w/2);b.cdir*=-1;b.bounces++;shake(8);AU.fx('stomp');if(b.bounces>=3){b.spiky=0;b.spinA=0;bGo(b,'dizzy',2);text(b.x,b.y-b.dh-14,'@_@','#ffe94b',1)}}
    bMelee(b,b.w*0.5,0,b.h*0.6,b.cdir);break}
   case'dizzy':{b.vuln=2;if(b.st<=0)bGo(b,'idle',1.0);break}
   default:{if(b.st<=0)bGo(b,'idle',1)}}
  if(b.state==='idle'||b.state==='tell'||b.state==='breath'||b.state==='stuck'||b.state==='dizzy'){if(b.y<b.gy||b.vy<0){b.vy+=2200*dt;b.y+=b.vy*dt;b.x+=(b.hvx||0)*dt;if(b.y>=b.gy){b.y=b.gy;b.vy=0;b.hvx=0;shake(5);dust(b.x,b.gy,8)}}}
  b.x=clamp(b.x,A.x0+b.w/2,A.x1-b.w/2)}
 else if(b.type==='freddy_krueger'){const slow=b.hp/b.max<0.1?0.7:1;
  switch(b.state){
   case'idle':{face();b.ghost=0;b.alpha=1;if(b.st>0)break;b.n=(b.n||0)+1;
     if(ph===3&&b.n%2===0){const pools=(G.marks||[]).filter(m=>m.kind==='pool').length;if(pools<2){mark({x:p.x+p.w/2,y:findGround(p.x+p.w/2),w:90,t:0.9,kind:'pool',then:'hands'});bSay(b,'Come to Freddy...')}bGo(b,'idle',2.5/slow)}
     else if(ph>=2&&b.n%2===1){bGo(b,'fade',0.35);AU.fx('star')}
     else bGo(b,'stalk',2.5);break}
   case'stalk':{face();const tx=p.x+p.w/2-b.dir*70;if(Math.abs(b.x-tx)>8)b.x+=Math.sign(tx-b.x)*300*slow*dt;if(Math.abs(dx)<90||b.st<=0){bTell(b,'combo',0.6,null);AU.fx('laser');b.sw=0}break}
   case'tell':{b.atkT=0.3;b.glow=1;if(b.st<=0){b.glow=0;if(b.next==='combo'){bGo(b,'combo',0.66);b.swT=0;b.sw=0}else if(b.next==='warp'){bGo(b,'warpslash',0.3)}}break}
   case'combo':{b.atkT=0.3;b.swT-=dt;if(b.swT<=0&&b.sw<3){b.sw++;b.swT=0.22;burst(b.x+b.dir*50,b.gy-60,8,['#c8ffd0','#fff'],200,0.25,2);AU.fx('throw');b.slashT=0.12;if(ph>=2&&b.sw===3)eshot(b.x+b.dir*30,b.gy-56,b.dir*420,0,'slash')}if(b.slashT>0){b.slashT-=dt;bMelee(b,70+b.w/2,20,110)}
    if(b.st<=0){b.bx=-b.dir*260;bGo(b,'back',0.25)}break}
   case'back':{b.x+=b.bx*dt;if(b.st<=0)bGo(b,'open',1.0);break}
   case'open':{b.vuln=1.5;if(b.st<=0)bGo(b,'idle',0.4/slow);break}
   case'fade':{b.ghost=1;b.alpha=Math.max(0,b.st/0.35);G.dim=Math.max(G.dim||0,0.5);if(b.st<=0){const side=p.face>0?-1:1;b.tx=clamp(p.x+p.w/2+side*80,A.x0+b.w/2,A.x1-b.w/2);mark({x:b.tx,y:findGround(b.tx),w:60,t:0.6,kind:'hat'});bGo(b,'warping',0.6);bSay(b,'One, two... Freddy\u2019s coming for you!')}break}
   case'warping':{b.ghost=1;b.alpha=0;G.dim=Math.max(G.dim||0,0.5);if(b.st<=0){b.x=b.tx;b.gy=findGround(b.x);b.y=b.gy;b.ghost=0;b.alpha=1;face();burst(b.x,b.y-60,24,['#2a8a3a','#c8ffd0'],260,0.5,4);bTell(b,'warp',0.15,null)}break}
   case'warpslash':{b.atkT=0.3;bMelee(b,90+b.w/2,10,120);if(b.st<=0){bGo(b,'open',1.0);text(b.x,b.y-b.dh-14,'HEHEHEHE!','#9aff9a',1)}break}
   default:{if(b.st<=0)bGo(b,'idle',0.5)}}
  b.x=clamp(b.x,A.x0+b.w/2,A.x1-b.w/2);if(ph>=2&&b.hp/b.max>=0.1)G.tint=Math.min(0.22,(G.tint||0)+dt*0.3);else G.tint=Math.max(0,(G.tint||0)-dt*0.5)}
 else if(b.type==='skeletor'){
  const plats=G.plats.filter(q=>q.x+q.w>A.x0&&q.x<A.x1&&q.type!=='moving');const throne=plats.reduce((m,q)=>!m||q.y<m.y?q:m,null);
  const spots=[];const side=plats.filter(q=>q!==throne).sort((a,c2)=>a.x-c2.x);if(side.length){spots.push({x:side[0].x+side[0].w/2,y:side[0].y});spots.push({x:side[side.length-1].x+side[side.length-1].w/2,y:side[side.length-1].y})}spots.push({x:(A.x0+A.x1)/2,y:findGround((A.x0+A.x1)/2)});
  const alive=G.enemies.filter(e=>!e.dead).length;b.barrier=ph===2&&alive>=2?1:0;
  if(ph===3&&!b.onThrone&&throne&&b.state!=='tele'&&b.state!=='floored'){b.onThrone=1;b.state='tele';b.st=0.6;b.dest={x:throne.x+throne.w/2,y:throne.y};text(b.x,b.y-b.dh-14,'TO MY THRONE!','#d38cff',1)}
  switch(b.state){
   case'idle':{face();b.ghost=0;b.alpha=1;b.teleT=(b.teleT===undefined?6:b.teleT)-dt;
    if(ph<3&&b.teleT<=0){b.teleT=6;const opts=spots.filter(s2=>Math.abs(s2.x-b.x)>80);b.dest=opts[Math.floor(Math.random()*opts.length)]||spots[0];bGo(b,'tele',0.6);break}
    if(b.st<=0){b.n=(b.n||0)+1;
     if(ph===2&&b.n%3===0)bTell(b,'summon',1.0,'MINIONS! ATTACK!','#9aff9a');
     else if(ph===2&&b.n%3===1)bTell(b,'snake',0.6,null);
     else bTell(b,'havoc',0.7,null)}
    break}
   case'tell':{face();b.glow=1;b.atkT=0.3;if(b.next==='havoc')b.skull=1;if(b.next==='snake'&&Math.random()<dt*20)burst(b.x+b.dir*40,b.gy-4,1,['#5aff7a'],80,0.3,2,true,0);
    if(b.next==='summon'&&Math.random()<dt*25)burst(b.x+b.dir*30,b.y-b.dh*0.9,2,['#9aff9a','#fff'],200,0.25,2);
    if(b.st<=0){b.glow=0;b.skull=0;const sx=b.x+b.dir*b.w*0.5,sy=b.y-b.dh*0.82;b.vol=(b.vol||0)+1;
     if(b.next==='havoc'){const n=(b.vol%3===0)?3:1,reps=ph===3?2:1;for(let r=0;r<reps;r++)setTimeout(()=>{if(!G||!G.boss||G.boss.dead)return;const a=Math.atan2(p.y+p.h/2-sy,p.x+p.w/2-sx);for(let i=0;i<n;i++){const aa=a+(i-(n-1)/2)*0.28;eshot(sx,sy,Math.cos(aa)*300,Math.sin(aa)*300,'magic')}AU.fx('laser')},r*260);bGo(b,'idle',ph===3?1.4:1.8)}
     else if(b.next==='summon'){bMinions(b,['horde_trooper','cobra_trooper','horde_trooper'],3);bSay(b);bGo(b,'idle',2.2)}
     else if(b.next==='snake'){shockwave(b.x,findGround(b.x),b.dir,900,260,'snake');AU.fx('sarlacc');bGo(b,'idle',1.6)}}break}
   case'tele':{b.ghost=1;b.alpha=Math.max(0,b.st/0.6);if(Math.random()<dt*40)G.parts.push({x:b.x+rand(-30,30),y:b.y-rand(0,b.dh),vx:rand(-30,30),vy:-rand(20,60),l:0.6,m:0.6,s:7,c:'#8a3ad8',smoke:1,g:-30});
    if(b.st<=0){b.x=b.dest.x;b.y=b.dest.y;b.gy=b.dest.y;b.ghost=0;b.alpha=1;burst(b.x,b.y-60,26,['#b06aff','#fff'],260,0.5,4);bGo(b,'idle',0.8)}break}
   case'floored':{b.vuln=2;b.stun=0;if(b.st<=0){b.onThrone=0;bGo(b,'idle',0.3)}break}
   default:{if(b.st<=0)bGo(b,'idle',0.6)}}
  if(ph===3){b.fireT=(b.fireT===undefined?2:b.fireT)-dt;if(b.fireT<=0){b.fireT=5;const fromL=Math.random()<0.5;mark({x:fromL?A.x0+40:A.x1-40,y:findGround(fromL?A.x0+40:A.x1-40),w:90,t:1.0,kind:'jaws',then:'firesweep',dir:fromL?1:-1});text((A.x0+A.x1)/2,G.cam.y+90,'THE SNAKE HEAD AWAKENS!','#ff8a3a',1)}
   b.sparkT=(b.sparkT===undefined?1.5:b.sparkT)-dt;if(b.sparkT<=0){b.sparkT=1.6;b.third=((b.third||0)+1)%3;const w3=(A.x1-A.x0)/3,x=A.x0+w3*b.third+w3/2;mark({x,y:findGround(x),w:w3-20,t:0.8,kind:'spark',then:'spark'})}}}
}
function stepMarks(dt){if(!G.marks)return;const p=G.p;for(const m of G.marks){m.t-=dt;if(m.t>0)continue;m.done=1;
  if(m.then==='tentacle'||m.then==='hands'){(G.reach=G.reach||[]).push({x:m.x,y:m.y,w:m.then==='hands'?80:50,h:m.then==='hands'?90:100,t:0.6,m:0.6,kind:m.then,hit:0});if(m.then==='tentacle')AU.fx('sarlacc');else AU.fx('hurt')}
  else if(m.then==='spark'){for(let i=0;i<14;i++)burst(m.x+rand(-m.w/2,m.w/2),m.y-4,1,['#d38cff','#fff'],260,0.4,3);if(!p.dead&&Math.abs(p.x+p.w/2-m.x)<m.w/2&&p.y+p.h>m.y-40)hurtPlayer({x:m.x});AU.fx('laser')}
  else if(m.then==='firesweep'){G.eshots.push({x:m.x,y:m.y-24,vx:m.dir*600,vy:0,kind:'firewall',l:(G.arena.x1-G.arena.x0)/600,r:26,g:0,ground:1});AU.fx('explode');shake(8)}}
 G.marks=G.marks.filter(m=>!m.done);
 if(G.reach){for(const r of G.reach){r.t-=dt;const box={x:r.x-r.w/2,y:r.y-r.h*Math.min(1,(r.m-r.t)/0.15),w:r.w,h:r.h};if(!r.hit&&!p.dead&&ov(box,p)&&p.inv<=0){r.hit=1;hurtPlayer({x:r.x});if(r.kind==='hands'){p.holdT=0.6;p.holdX=p.x}}}G.reach=G.reach.filter(r=>r.t>0)}
 if(p.holdT>0){p.holdT-=dt;p.x=p.holdX;p.vx=0}}
function drawMarks(){const t=G.t;for(const m of G.marks||[]){const k=1-m.t/m.m;c.save();
  if(m.kind==='shadow'){c.globalAlpha=0.25+0.45*k;c.fillStyle='#000';c.beginPath();c.ellipse(m.x,m.y-2,m.w/2*(0.5+0.5*k),8+6*k,0,0,TAU);c.fill()}
  else if(m.kind==='pool'){c.globalAlpha=0.5+0.4*k;c.fillStyle='#050208';c.beginPath();c.ellipse(m.x,m.y,m.w/2*(0.3+0.7*k),7,0,0,TAU);c.fill();c.globalCompositeOperation='lighter';c.strokeStyle='#3aff5a55';c.lineWidth=2;c.stroke()}
  else if(m.kind==='hat'){c.globalCompositeOperation='lighter';c.globalAlpha=0.4+0.5*Math.abs(Math.sin(t*14));c.fillStyle='#9aff9a';c.beginPath();c.ellipse(m.x,m.y-150,34,8,0,0,TAU);c.fill();c.fillRect(m.x-18,m.y-176,36,26)}
  else if(m.kind==='rumble'){c.globalAlpha=0.6;for(let i=0;i<4;i++){c.fillStyle='#c8a878';c.beginPath();c.arc(m.x+rand(-m.w/2,m.w/2),m.y-rand(0,10),rand(2,5),0,TAU);c.fill()}}
  else if(m.kind==='spark'||m.kind==='jaws'){c.globalCompositeOperation='lighter';c.globalAlpha=(0.25+0.5*k)*(0.6+0.4*Math.sin(t*30));c.fillStyle=m.kind==='jaws'?'#ff6a2a':'#b06aff';c.fillRect(m.x-m.w/2,m.y-6,m.w,6);if(m.kind==='jaws'){c.globalAlpha=0.5+0.5*k;circ(m.x,m.y-60,26+k*10,'#ff6a2a88')}}
  c.restore()}
 for(const r of G.reach||[]){const up=Math.min(1,(r.m-r.t)/0.15),hh=r.h*up;c.save();if(r.kind==='hands'){c.fillStyle='#0a0510';for(let i=0;i<3;i++){const x=r.x-r.w/2+10+i*(r.w-20)/2;c.fillRect(x-4,r.y-hh,8,hh);c.beginPath();c.arc(x,r.y-hh,8,0,TAU);c.fill()}c.globalCompositeOperation='lighter';c.fillStyle='#3aff5a22';c.fillRect(r.x-r.w/2,r.y-hh,r.w,hh)}
  else{c.strokeStyle='#9a6a4a';c.lineWidth=9;c.lineCap='round';c.beginPath();c.moveTo(r.x,r.y);c.quadraticCurveTo(r.x+Math.sin(G.t*8)*18,r.y-hh*0.6,r.x+Math.sin(G.t*6)*10,r.y-hh);c.stroke()}c.restore()}}

function spawnBoss(g){const L=G.L;const bt=g?g.boss:G.bossType;const type=BOSS_ALIAS[bt]||bt;const d=BT[type]||BT.final;const hp=g?g.hp||d.hp:L.bossHp||d.hp;
 const ar=g?{x0:g.x0,x1:g.x1,minions:L.arena&&L.arena.x0===g.x0?L.arena.minions:null}:L.arena||{x0:(L.bossX||L.width-900)-viewW*0.45,x1:(L.bossX||L.width-900)+Math.max(500,viewW*0.55)};
 const x0=ar.x0,x1=Math.max(ar.x1,x0+Math.min(viewW,1100));G.arena={x0,x1,minions:ar.minions};
 const bx=Math.min(x1-d.w/2-40,x0+(x1-x0)*0.75);const gy=findGround(bx);
 if(g&&g.restartAt)G.respawn={x:g.restartAt,y:findGround(g.restartAt)-G.p.h-4};G.marks=[];G.reach=[];
 G.boss={type,name:d.name,art0:d.art,dh:d.dh||d.h*1.25,x:bx,y:d.fly?gy-120:gy,gy,w:d.w,h:d.h,hp,max:hp,shot:d.shot,fly:d.fly,t:0,phase:1,cool:2,flash:0,dir:-1,vx:0,vy:0,stun:0,state:'idle',st:0,dead:false,intro:2};
 G.bossOn=true;AU.stop();AU.play(type==='final'||(G.gaunt&&G.gi===G.gaunt.length-1)?'final':'boss');G.banner={s:d.name.toUpperCase()+'!',t:2.2,boss:1,sub:g&&g.stage};if(NB[type]){G.boss.state='idle';G.boss.st=1.2;setTimeout(()=>{if(G&&G.boss&&G.boss.type===type&&!G.boss.dead)bSay(G.boss)},900)}shake(8)}
function bossBox(b){return{x:b.x-b.w/2,y:b.y-b.h,w:b.w,h:b.h}}
function bossHitTest(b,s){if(b.ghost)return false;const r=bossBox(b);return s.x>r.x-s.r&&s.x<r.x+r.w+s.r&&s.y>r.y-s.r&&s.y<r.y+r.h+s.r}
function clang(x,y,s){burst(x,y,10,['#ffffff','#9ad8ff'],260,0.25,3);AU.fx('ship_hit');if(!G.clangT||G.t-G.clangT>0.6){G.clangT=G.t;text(x,y-20,s||'CLANG!','#cfe8ff')}}
function damageBoss(n,x,y,stomp){const b=G.boss;if(b&&b.vm)return damageVillain(n,x,y,stomp);if(!b||b.dead||b.intro>0||b.ghost)return;if(b.ifr>0&&!stomp)return;
 if(b.barrier){clang(x,y,'BARRIER! DEFEAT THE MINIONS!');return}
 if(b.type==='big_helmet'&&!stomp&&!b.vuln){const front=Math.sign(x-b.x)===b.dir;if(front&&(b.phase===1||y<b.y-b.h*0.5)){clang(x,y);return}}
 if(NB[b.type]){if(stomp)n=1;n*=(b.vuln||1)*(b.skull?2:1);b.hurtT=0.3}
 b.hp-=n;
 b.flash=0.12;b.ifr=stomp?0.6:0.06;AU.fx('boss_hit');burst(x,y,10,['#ffffff','#ffcc33'],240,0.4,4);run.score+=50;
 const f=b.hp/b.max;b.phase=f<0.34?3:f<0.67?2:1;
 if(b.hp<=0){b.dead=true;b.dt=0;AU.fx('boss_die');shake(22);hitstop(0.2);G.flash=0.6;run.score+=5000;text(b.x,b.y-b.h-20,'BOSS DEFEATED! +5000','#ffe94b',1);for(let i=0;i<6;i++)setTimeout(()=>{if(G&&G.boss)burst(G.boss.x+rand(-b.w/2,b.w/2),G.boss.y-rand(0,b.h),40,['#ffffff','#ffcc33','#ff5a2a','#ff4bd8'],420,0.9,6)},i*160);G.eshots=[];G.marks=[];G.reach=[];G.enemies.forEach(e=>{if(!e.dead)killEnemy(e,0)});if(NB[b.type])bSay(b,{big_helmet:'I\u2019ll get you for this... later!',bowser:'BWAAAH! Not the lava!',freddy_krueger:'This... is... just a dream...',skeletor:'I\u2019ll get you for this, Taco!'}[b.type])}}
function stepBoss(dt){const b=G.boss,p=G.p;if(!b)return;b.t+=dt;if(b.flash>0)b.flash-=dt;if(b.ifr>0)b.ifr-=dt;
 if(b.hurtT>0)b.hurtT-=dt;if(b.sayT>0)b.sayT-=dt;
 if(b.dead){b.dt+=dt;if(b.dt>1.8&&!b.released){b.released=1;G.arena=null;G.tint=0;
   if(G.gaunt){G.gaunt[G.gi].done=true;G.gi++;if(G.gi>=G.gaunt.length)G.allBossDone=true;else{G.banner={s:'NEXT: '+(G.gaunt[G.gi].stage||'').toUpperCase(),t:2.4};AU.play(G.L.music||'final')}setTimeout(()=>{if(G&&G.boss===b)G.boss=null},1500)}
   else G.allBossDone=true}return}
 if(G.arena&&portrait&&b.y>-100){const bim=b.art0&&D.IMG['art/bosses/'+b.art0];const hw=bim?b.dh*bim.width/bim.height*0.5*0.92:b.w/2;const m=Math.min(Math.max(b.w/2,hw)+8,viewW*0.34);b.x=clamp(b.x,Math.max(G.arena.x0,G.cam.x)+m,G.cam.x+viewW-m)}
 if(b.intro>0){b.intro-=dt;return}if(b.stun>0){b.stun-=dt;b.flash=Math.sin(b.t*30)>0?0.05:0;return}
 const sp=b.phase===3?1.5:b.phase===2?1.2:1;b.cool-=dt*sp;const dx=p.x+p.w/2-b.x;b.dir=dx>0?1:-1;const A=G.arena;
 const aim=(spd,kind,oy=0.6)=>{const sx=b.x+b.dir*b.w*0.3,sy=b.y-b.h*oy;const a=Math.atan2(p.y+p.h/2-sy,p.x+p.w/2-sx);eshot(sx,sy,Math.cos(a)*spd,Math.sin(a)*spd,kind)};
 if(NB[b.type])stepNewBoss(b,dt,dx);else switch(b.type){
  case'at_st':{b.x+=b.dir*40*sp*dt;b.x=clamp(b.x,A.x0+b.w/2,A.x1-b.w/2);if(b.cool<=0){for(let i=0;i<b.phase;i++)setTimeout(()=>{if(G&&G.boss&&!G.boss.dead)aim(460,'gbolt',0.85)},i*180);b.cool=1.6;AU.fx('laser');if(b.phase>1&&Math.random()<0.4)spawnEnemy({type:A.minions||'scout_trooper',x:b.x+rand(-200,200),y:b.gy})}
   b.duck=Math.max(0,Math.sin(b.t*0.9))>0.8;break}
  default:{ // generic flying / ground machine bosses
   if(b.fly){const ty=b.gy-140-Math.sin(b.t*1.3)*60,tx=A.x0+(A.x1-A.x0)*(0.5+0.38*Math.sin(b.t*0.5*sp));b.x=lerp(b.x,tx,dt*1.5);b.y=lerp(b.y,ty,dt*2)}
   else{if(b.state==='charge'){b.x+=b.cdir*420*dt;if(b.x<A.x0+b.w/2||b.x>A.x1-b.w/2){b.x=clamp(b.x,A.x0+b.w/2,A.x1-b.w/2);b.state='idle';shake(10);AU.fx('stomp');burst(b.x,b.y,20,['#c8b8a8'],260,0.6,5,false)}}else{b.x+=Math.sign(dx)*50*dt;b.x=clamp(b.x,A.x0+b.w/2,A.x1-b.w/2)}}
   if(b.cool<=0){const r=Math.random();
    if(r<0.4){const n=b.phase+1;for(let i=0;i<n;i++){const a=Math.atan2(p.y-b.y+b.h*0.5,dx)+(i-(n-1)/2)*0.22;eshot(b.x,b.y-b.h*0.5,Math.cos(a)*400,Math.sin(a)*400,b.shot==='rain'?'bolt':b.shot==='slime'?'slime':b.shot==='bomb'?'bolt':b.shot)}AU.fx('laser')}
    else if(r<0.65){for(let i=0;i<2+b.phase;i++)eshot(b.x+rand(-60,60),b.y-b.h*0.3,rand(-260,260),-rand(200,500),b.shot==='rain'?'rain':'bomb')}
    else if(r<0.85&&!b.fly){b.state='charge';b.cdir=Math.sign(dx)||-1;text(b.x,b.y-b.h-10,'INCOMING!','#ff8a5a')}
    else{const mt=A.minions||(b.type==='hordak'?'horde_trooper':b.type==='no_heart'?'shreeky':b.type==='murky_gloom'?'murky':'cobra_trooper');if(G.enemies.filter(e=>!e.dead).length<2+b.phase){spawnEnemy({type:mt,x:clamp(b.x+rand(-200,200),A.x0+40,A.x1-40),y:ET[mt]&&ET[mt].fly?b.gy-180:b.gy});burst(b.x,b.y-b.h/2,16,['#d38cff','#fff'],200,0.5,4)}}
    b.cool=b.fly?1.8:2}
   if(b.type==='final'&&b.phase===3&&Math.random()<dt*0.8)eshot(rand(A.x0,A.x1),-20,0,200,'bomb')}}
 if(A&&!portrait&&b.y>-100)b.x=Math.min(b.x,A.x1-Math.max(b.w/2+20,viewW*0.3));
 // contact / stomp
 const r=bossBox(b),pb={x:p.x,y:p.y,w:p.w,h:p.h};if(!p.dead&&!b.ghost&&b.y>-100&&ov(r,pb)){if(p.vy>80&&p.y+p.h-r.y<30&&!b.spiky){p.vy=-(window.TacoPhysics?TUNE.bossStompBounce||900:900);damageBoss(3,p.x+p.w/2,r.y,true);AU.fx('stomp');ring(p.x+p.w/2,r.y,'#fff',60);shake(8)}else hurtPlayer({x:b.x})}}
/* ---------------- bike chase ---------------- */
function stepBike(dt){const p=G.p,L=G.L;const sp=L.speed||TUNE.bikeSpeed;
 if(p.dead)return;
 if(window.TacoPhysics&&TacoPhysics.stepBike){p.h=34;TacoPhysics.stepBike(p,inp,dt,{bikeSpeed:sp,bikeBottom:(L.ground[0]?L.ground[0][2]:470)-8});}
 else{p.vx=lerp(p.vx,sp,dt*2);const s=inp.steer.y||((inp.D?1:0)-(inp.U?1:0));p.vy=lerp(p.vy,s*TUNE.bikeMaxVy,dt*6);p.x+=p.vx*dt;p.y=clamp(p.y+p.vy*dt,40,430);p.tilt=p.vy/1200}
 if(inp.throwPressed||inp.throw&&p.cool<=0){if(p.cool<=0){G.shots.push({kind:'rlaser',x:p.x+p.w,y:p.y+10,vx:sp+900,vy:0,l:0.8,dmg:1,r:8});p.cool=0.22;AU.fx('laser')}}
 for(const o of G.obstacles){const r=obRect(o);if(!o.hit&&ov(p,r)){o.hit=1;if(p.star>0){burst(r.x,p.y,20,['#8a5a2a','#ffcc33'],300,0.6,5,false);continue}let ok=true;if(window.TacoPhysics&&TacoPhysics.bikeCrash)ok=TacoPhysics.bikeCrash(p,r);else{p.vx=160;p.vy=(p.y+p.h/2<r.y+r.h/2?-1:1)*260}if(ok!==false){hurtPlayer({x:r.x+100});p.vx=Math.min(p.vx,200);burst(p.x+p.w,p.y+p.h/2,24,['#8a5a2a','#ffcc33','#fff'],320,0.6,5)}}}
 // scout troopers on bikes
 for(const e of G.enemies){if(e.dead){e.dt=(e.dt||0)+dt;e.y+=300*dt;e.x+=e.vx*dt;if(e.dt>1.5)e.gone=true;continue}
  if(e.x-p.x>viewW)continue;if(!e.ride){e.ride=1;e.vx=sp*rand(0.85,1.05);e.w=70;e.h=40;e.by=e.y;e.y=e.y}
  e.t+=dt;e.x+=e.vx*dt;e.y=e.by+Math.sin(e.t*2)*30;e.cool-=dt;if(e.x<p.x-viewW*0.4)e.vx=sp*1.15;if(e.x>p.x+viewW*0.5)e.vx=sp*0.9;
  if(e.cool<=0&&Math.abs(e.x-p.x)<500){e.cool=1.4+Math.random();const dir=p.x>e.x?1:-1;eshot(e.x+dir*30,e.y,dir*500+sp,0,'bolt')}
  const eb={x:e.x-35,y:e.y-20,w:70,h:40};
  for(const o of G.obstacles){const r=obRect(o);if(ov(eb,r)){killEnemy(e,0);text(e.x,e.y-30,'CRASH! +300','#ffcc66');run.score+=300;AU.fx('explode');shake(6)}}
  if(!e.dead&&ov(p,eb)){if(window.TacoPhysics&&TacoPhysics.bikeRam){TacoPhysics.bikeRam(p,eb);e.by+=eb.y-e.y+0}e.by+=(e.y>p.y?60:-60);e.hp--;AU.fx('stomp');shake(5);if(e.hp<=0){killEnemy(e,0);run.score+=300;text(e.x,e.y-30,'RAMMED! +300','#ffcc66')}}}
 G.enemies=G.enemies.filter(e=>!e.gone);
 for(const s of G.shots){for(const e of G.enemies){if(!e.dead&&e.ride&&Math.abs(s.x-e.x)<40&&Math.abs(s.y-e.y)<24){e.hp--;s.l=0;burst(s.x,s.y,10,['#ff5a2a','#fff'],200,0.4,3);if(e.hp<=0){killEnemy(e,0);run.score+=200;AU.fx('explode')}}}}
 if(p.x>=G.L.goal.x&&!G.clear)levelClear()}
function obRect(o){const G0=G.L.ground[0]?G.L.ground[0][2]:470;if(o.type==='tree')return{x:o.x,y:o.y,w:44,h:(o.h||G0-o.y)};if(o.type==='branch')return{x:o.x-30,y:o.y,w:110,h:o.h||40};return{x:o.x,y:o.y,w:o.type==='log'?90:60,h:o.h||50}}
/* ---------------- flight levels (Grey Heart's TacoFlight) ---------------- */
function startFlight(L){$('bJump').style.display='none';$('swipeHint').style.display='none';$('bThrow').textContent='FIRE';
 if(!window.TacoFlight||!TacoFlight.levels[L.flightId]){G.flMissing=true;G.banner={s:'FLIGHT LEVEL COMING SOON',t:3};setTimeout(()=>{if(G&&G.flMissing)levelClear(true)},2500);return}
 const pilot=CH||'taco';
 G.fl=TacoFlight.create(L.flightId,{canvas:cv,artBase:'art/',pilot,fireButton:$('bThrow'),safeTop:0,hudRightReserve:124,sfx:n=>AU.fx(n),
  onEvent:(n,d)=>{if(!G||!G.fl)return;if(n==='complete'){run.score+=G.fl.score||0;run.hp=Math.max(1,G.fl.hp||run.hp);levelClear()}else if(n==='dead'){run.lives--;G.flDeadT=2.4}}});
 AU.play(L.music||(L.flightId==='falcon'?'falcon':'xwing'))}
function stopFlight(){if(G&&G.fl){try{G.fl.destroy()}catch(e){}G.fl=null}$('bJump').style.display='';$('swipeHint').style.display='';$('bThrow').textContent='THROW';resize()}
/* ---------------- level flow ---------------- */
function newRun(ch,startIdx){const list=(MISSIONS[ch]&&MISSIONS[ch].length?MISSIONS[ch]:MISSIONS.taco).filter(id=>LEVELS[id]);run={ch,list,idx:startIdx||0,lives:5,hp:5,score:0,coins:0,ammo:{lettuce:15,tomato:6,cheese:0,jalapeno:0,salsa:0},sel:'lettuce',power:25};CH=ch}
let playTok=0;
async function playCurrent(){stopFlight();const id=run.list[run.idx];const L=LEVELS[id];const tok=++playTok;
 if(L){const fs=levelArt(L);if(fs.some(f=>!D.IMG[f.replace(/\.(webp|png|jpe?g)$/,'')])){state='loading';showUI('<h2>LOADING '+esc(L.name||id).toUpperCase()+'…</h2>');await artLevel(L,4000);if(tok!==playTok)return}}
 hideUI();state='play';$('hud').hidden=false;$('pad').hidden=false;startLevel(id);const nx=run.list[run.idx+1];if(nx&&LEVELS[nx])setTimeout(()=>artPrefetch(LEVELS[nx]),5000)}
function levelClear(skip){if(G.clear)return;G.clear=true;G.clearT=0;const id=G.id;AU.stop();AU.fx('clear');
 const k='done:'+CH;save[k]=save[k]||{};save[k][id]=Math.max(save[k][id]||0,run.score);persist();
 if(!skip&&G.mode!=='flight'){run.score+=1000;text(G.p.x,G.p.y-60,'LEVEL CLEAR!','#ffe94b',1);TFX('confetti',G.p.x,G.p.y-40);burst(G.p.x,G.p.y,80,['#ff3b3b','#ffa23b','#ffe94b','#5ae36b','#4bb8ff','#9a5bff'],500,1.4,5)}
 setTimeout(()=>{if(!G||G.id!==id)return;stopFlight();state='clear';const last=run.idx>=run.list.length-1;
  showUI(`<h2>${last?'MISSION COMPLETE!':'LEVEL CLEAR!'}</h2><p><b>${esc(LEVELS[id].name)}</b></p><p>Score: <b>${run.score.toLocaleString()}</b> · Coins: ${run.coins} · Lives: ${run.lives}</p>`+(last?`<p>${esc(CHARS[CH].name)} saved ${CH==='taco'?'every land':'the day'}! Totally tubular!</p><button class="btn" data-a="select">PLAY AGAIN</button>`:`<button class="btn" data-a="next">NEXT LEVEL ▶</button><button class="btn alt" data-a="missions">MISSIONS</button>`))},G.mode==='flight'?300:2600)}
function gameOver(){state='over';run.hp=0;if(G&&G.p)G.p.hp=0;AU.stop();stopFlight();showUI(`<h2>GAME OVER</h2><p>Score: <b>${run.score.toLocaleString()}</b></p><p>Bummer! Grab more toppings and try again.</p><button class="btn" data-a="retry">TRY AGAIN</button><button class="btn alt" data-a="missions">MISSIONS</button>`)}
function pauseGame(){if(state!=='play')return;state='pause';if(AU.ctx)AU.ctx.suspend().catch(()=>{});showUI(`<h2>PAUSED</h2><button class="btn" data-a="resume">RESUME</button><br><button class="btn alt" data-a="restart">RESTART LEVEL</button><button class="btn alt" data-a="howto">HOW TO PLAY</button><br>${G&&G.vm?'<button class="btn dim" data-a="vback">VILLAINS</button>':'<button class="btn dim" data-a="missions">MISSIONS</button>'}<button class="btn dim" data-a="title">TITLE</button>`)}
function resumeGame(){if(state!=='pause')return;state='play';hideUI();if(AU.ctx)AU.ctx.resume().catch(()=>{})}
/* ---------------- UI screens ---------------- */
const esc=s=>String(s).replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
function showUI(h){document.body.classList.add('uiopen');$('ui').innerHTML='<div class="scr">'+h+'</div>';$('ui').querySelectorAll('[data-a]').forEach(b=>{b.addEventListener('click',e=>{e.preventDefault();if(performance.now()-swiped<400)return;AU.unlock();uiAct(b.dataset.a,b)})});$('ui').querySelectorAll('canvas[data-ch]').forEach(cc=>portrait1(cc,cc.dataset.ch));$('ui').querySelectorAll('canvas[data-vil]').forEach(cc=>vPortrait(cc,cc.dataset.vil,cc.dataset.pose||''));GP.focus=null;gpFocusFirst()}
function hideUI(){document.body.classList.remove('uiopen');$('ui').innerHTML=''}
let prevState='title';
function uiAct(a,b){AU.fx('pickup');
 if(a==='start')return toSelect();if(a==='quick'){CH='shera';newRun('shera',0);const i=run.list.indexOf('w3-1');run.idx=i<0?0:i;if(i<0){run.list=['w3-1'].concat(run.list)}return playCurrent()}if(a==='howto'){prevState=state;return howTo()}if(a==='back'){return prevState==='pause'?(state='pause',pauseGame0()):toTitle()}
 if(a==='page')return setPage(b.dataset.p,b.dataset.p==='villain'?1:-1);if(a==='vil')return villainInfo(b.dataset.v);if(a==='vgo'){const v=VBY(b.dataset.v);if(!v)return;stopFlight();newVillainRun(v);return playCurrent()}if(a==='vback'){if(AU.ctx)AU.ctx.resume();stopFlight();G=null;return toSelect('villain')}
 if(a==='char'){CH=b.dataset.ch;return missions()}if(a==='go'){newRun(CH,+b.dataset.i);return playCurrent()}
 if(a==='next'){run.idx++;run.hp=Math.max(run.hp,3);return playCurrent()}if(a==='retry'){run.lives=5;run.hp=5;return playCurrent()}
 if(a==='restart'){if(AU.ctx)AU.ctx.resume();run.hp=5;return playCurrent()}if(a==='resume')return resumeGame();
 if(a==='missions'){if(AU.ctx)AU.ctx.resume();stopFlight();G=null;return missions()}if(a==='select'){stopFlight();G=null;return toSelect()}if(a==='title'){if(AU.ctx)AU.ctx.resume();stopFlight();G=null;return toTitle()}}
function pauseGame0(){state='play';pauseGame()}
function toTitle(){state='title';$('hud').hidden=true;$('pad').hidden=true;AU.play('title');
 showUI(`<div class="sub">THE VAULT PRESENTS</div>${D.IMG['art/logo']?'<img src="art/logo.webp" alt="Taco Strike: Totally 80s" style="width:min(90vw,520px);height:auto;display:block;margin:6px auto">':'<h1>TACO STRIKE</h1><h2 style="margin-top:0">TOTALLY 80s!</h2>'}<p>Rainbow Brite · Care Bears · She-Ra · G.I. Joe · Star Wars<br>One walking taco. Every Saturday-morning land.</p><button class="btn" data-a="start">▶ START</button><button class="btn alt" data-a="quick">⚔ SHE-RA: WHISPERING WOODS</button><br><button class="btn alt" data-a="howto">HOW TO PLAY</button><p class="sub">Fan-made tribute for private play. Characters belong to their owners.</p>`)}
function toSelect(page,dirn){page=page||'hero';VSEL.page=page;state='select';$('hud').hidden=true;$('pad').hidden=true;AU.play('select');const keys=['shera'].concat(Object.keys(CHARS).filter(k=>k!=='shera')).filter(k=>k!=='ewok'||MISSIONS.ewok&&MISSIONS.ewok.length);
 const hero=`<div class="chars">`+keys.map(k=>`<button class="char" data-a="char" data-ch="${k}"><canvas data-ch="${k}" width="240" height="220"></canvas>${esc(CHARS[k].name)}<small>${esc(CHARS[k].tag)}</small></button>`).join('')+`</div>`;
 const vil=`<p class="sub vintro">Play the bad guy! Start at the END of the level and stop the hero from getting through.</p><div class="chars vil">`+VR().map(v=>{const w=+(save['vmW:'+v.id]||0);return`<button class="char vcard" data-a="vil" data-v="${v.id}" style="--vc:${v.color||'#ff4fd8'}"><canvas data-vil="${v.id}" width="240" height="220"></canvas>${w?'✅ ':''}${esc(v.name)}<small>${esc(v.world)} · vs ${esc(heroName(v.hero))}</small><small class="vt">“${esc(v.taunt[0])}”</small></button>`}).join('')+`</div>`;
 showUI(`<div class="tabs"><button class="btn dim selback2" data-a="title" aria-label="Back">◀ BACK</button><button class="pgarrow" data-a="page" data-p="hero" aria-label="Heroes page">◀</button><button class="tab${page==='hero'?' on':''}" data-a="page" data-p="hero">🦸 HEROES</button><button class="tab${page==='villain'?' on':''}" data-a="page" data-p="villain">😈 VILLAINS</button><button class="pgarrow" data-a="page" data-p="villain" aria-label="Villains page">▶</button></div><h2>${page==='hero'?'CHOOSE YOUR HERO':'CHOOSE YOUR VILLAIN'}</h2><div class="pager ${dirn>0?'inR':dirn<0?'inL':''}" data-page="${page}">${page==='hero'?hero:vil}</div><p class="sub swipehint">${page==='hero'?'Swipe left for VILLAINS ▶':'◀ Swipe right for HEROES'}</p><button class="btn dim selback" data-a="title">◀ BACK</button>`)}
function missions(){state='missions';$('hud').hidden=true;$('pad').hidden=true;const list=(MISSIONS[CH]&&MISSIONS[CH].length?MISSIONS[CH]:MISSIONS.taco).filter(id=>LEVELS[id]);const done=save['done:'+CH]||{};
 showUI(`<canvas data-ch="${CH}" width="240" height="200" style="position:static;width:120px;height:100px"></canvas><h2>${esc(CHARS[CH].name)}</h2><p class="sub">${esc(CHARS[CH].tag)}</p><div class="mis">`+list.map((id,i)=>{const L=LEVELS[id];return`<button class="btn ${L.mode==='flight'?'alt':''}" data-a="go" data-i="${i}">${done[id]!==undefined?'✅':'▶'} ${i+1}. ${esc(L.name)}<br><span class="sub">${esc(worldName(L))}${done[id]?' · best '+done[id].toLocaleString():''}</span></button>`}).join('')+`</div><button class="btn dim" data-a="select">◀ HEROES</button>`)}
function worldName(L){return{rainbow:'Rainbow Land',carealot:'Care-a-Lot',etheria:'Etheria · She-Ra',cobra:'G.I. Joe vs Cobra',endor:'Forest Moon of Endor',ewok:'Ewok Village',tatooine:'Tatooine',final:'Final Battle',space:'Star Wars · in space'}[L.theme]||L.theme}
function howTo(){state='howto';showUI(`<h2>HOW TO PLAY</h2><ul class="how">
<li><b>Move:</b> swipe left or right anywhere and keep your finger down. Lift to stop. No D-pad!</li>
<li><b>Jump:</b> tap <b>JUMP</b> or swipe up. Hold for a higher jump.</li>
<li><b>Throw:</b> tap <b>THROW</b>. The taco throws his toppings: lettuce (fast), tomato (lob, bounces), cheese (rapid), jalapeño (fire, goes through), salsa (3-way spread). Tap the topping box at the top to switch.</li>
<li><b>Stomp:</b> jump on enemies. Hold JUMP when you land on one for a big combo bounce. Swipe down in the air for a ground pound.</li>
<li><b>Buddy swap:</b> your helper follows you all level. <b>Tap the helper</b> (quick tap, no swipe) to swap and play as them; tap again to swap back. Keyboard: C.</li><li><b>Refill:</b> grab toppings for ammo, hearts and taco shells for health, stars to be invincible.</li>
<li><b>Speeder bike:</b> swipe up or down to steer over trees and logs. THROW fires blasters.</li>
<li><b>X-wing &amp; Falcon:</b> drag to fly, hold FIRE.</li>
<li><b>Watch out:</b> the Sarlacc pulls you in. Jump to escape!</li>
<li><b>Keyboard:</b> arrows/WASD move, Space/J jump, K/X throw, Q switch topping, C swap buddy, P pause, M mute.</li>
<li><b>😈 Villain Mode:</b> on the character screen swipe left (or tap VILLAINS) and pick a bad guy. You start at the END of the level as the boss and the computer plays the hero running toward you. Swipe &amp; hold to move, swipe up or JUMP to jump, <b>ATTACK</b> for your signature attack, <b>SPECIAL</b> (or swipe down) for your big move when the meter is full. Your minions are on your side. Your body blocks the path. Win by taking all the hero’s lives or running out the clock; lose if the hero reaches the end or knocks you out. Careful: every hit you take fills your yellow STUN bar, and while you’re stunned the hero can slip past. Jump over their shots! Keyboard: E/L special.</li>
<li><b>🎮 Game controller:</b> plug in or pair an Xbox, PlayStation or Switch Pro controller. Left stick / D-pad move, <b>A</b> (Cross) jump, <b>X</b> (Square) throw/attack, <b>Y</b> (Triangle) switch topping, <b>RB</b>/<b>B</b> (R1/Circle) swap buddy, Start pause, Back/Select mute. In Villain Mode Y, B or RB is your SPECIAL. Menus: stick/D-pad to move, A to pick, B to go back, LB/RB to flip between Heroes and Villains.</li></ul>
<button class="btn" data-a="back">GOT IT</button>`)}
const SEL={taco:'taco',rainbow:'rainbow_brite',carebear:'care_bear',shera:'she_ra',joe:'snake_eyes',chewie:'chewie_ewok',ewok:'chewie_ewok'};
function portrait1(cc,key){const si=D.IMG['art/select/'+SEL[key]];if(si&&key!=='ewok'){const x=cc.getContext('2d');let t=0;const dr=()=>{if(!cc.isConnected)return;t+=1/30;x.setTransform(1,0,0,1,0,0);x.clearRect(0,0,cc.width,cc.height);const g=x.createRadialGradient(cc.width/2,cc.height/2,10,cc.width/2,cc.height/2,cc.width/2);g.addColorStop(0,'#ff4fd866');g.addColorStop(1,'#00000000');x.fillStyle=g;x.fillRect(0,0,cc.width,cc.height);const s=Math.min(cc.width/si.width,cc.height/si.height)*(0.95+Math.sin(t*2)*0.02);x.drawImage(si,(cc.width-si.width*s)/2,(cc.height-si.height*s)/2+Math.sin(t*3)*3,si.width*s,si.height*s);setTimeout(()=>requestAnimationFrame(dr),40)};dr();return}const x=cc.getContext('2d');let t=0;const draw=()=>{if(!cc.isConnected)return;t+=1/30;x.setTransform(1,0,0,1,0,0);x.clearRect(0,0,cc.width,cc.height);const g=x.createRadialGradient(120,120,10,120,120,130);g.addColorStop(0,'#ff4fd855');g.addColorStop(1,'#00000000');x.fillStyle=g;x.fillRect(0,0,cc.width,cc.height);x.setTransform(2.2,0,0,2.2,120,cc.height-14);drawHero(x,key,{t,run:false,blink:(t%3)<0.1},true);setTimeout(()=>requestAnimationFrame(draw),33)};draw()}
/* ---------------- rendering ---------------- */
const HERO_FRAMES={joe:'art/players/snake_eyes'};
const HERO_ART={rainbow:'art/allies/rainbow_brite',carebear:'art/allies/care_bear_tenderheart',shera:'art/allies/she_ra',joe:'art/allies/snake_eyes',chewie:'art/allies/chewbacca',ewok:'art/allies/wicket'};
/* leg check (Grey Heart, Oct 2026): render-only gait. Phase from distance actually run, amplitude eases so legs settle to the art pose.
   Single-pose hero art gets cutout legs (each leg below the crotch line swung about its hip); 2-frame heroes pick frames by distance. */
function heroGait(o,ok){const now=performance.now(),dt=o._gt?Math.min(0.1,(now-o._gt)/1000):0;o._gt=now;if(o._gp===undefined){o._gp=0;o._ga=0;o._lx=o.x}
 const d=Math.abs(o.x-o._lx);o._lx=o.x;const mv=ok&&d>0.2&&d<60;o._ga+=((mv?1:0)-o._ga)*Math.min(1,dt*10);if(mv)o._gp+=d/45*Math.PI;else if(o._ga<0.03){o._ga=0;o._gp=Math.round(o._gp/Math.PI)*Math.PI}
 return o}
const HRIG={'art/allies/rainbow_brite':{cy:146,cx:62,p:[50,80],x:[16,112],A:0.3},'art/allies/she_ra':{cy:158,cx:60,p:[42,80],x:[26,104],A:0.3},
 'art/allies/chewbacca':{cy:160,cx:70,p:[45,105],x:[0,140],A:0.24},'art/allies/care_bear_tenderheart':{cy:164,cx:54,p:[35,75],x:[0,108],A:0.3}};
function heroCut(x,im,R,w,h,oy,ph,amp){const k=w/im.width,ov=im.height*0.035,a=amp*R.A*Math.sin(ph),cw=Math.cos(ph),lu=0.03*amp*h;
 const leg=(x0,x1,px,ang,lift)=>{x.save();x.translate(-w/2+px*k,oy+R.cy*k-lift);x.rotate(ang);x.translate(-px*k,-R.cy*k);x.beginPath();x.rect(x0*k,(R.cy-ov)*k,(x1-x0)*k,(im.height-R.cy+ov)*k);x.clip();x.drawImage(im,0,0,w,h);x.restore()};
 leg(R.x[0],R.cx,R.p[0],a,lu*Math.max(0,-cw));leg(R.cx,R.x[1],R.p[1],-a,lu*Math.max(0,cw));
 x.save();x.beginPath();x.rect(-w/2,oy,w,h);x.rect(-w/2+R.x[0]*k,oy+R.cy*k,(R.x[1]-R.x[0])*k,(im.height-R.cy)*k);x.clip('evenodd');x.drawImage(im,-w/2,oy,w,h);x.restore()}
function drawHero(x,key,a,menu){if(key&&key.startsWith('h:'))return drawForm(x,key,a);
 if(key==='taco'&&D.IMG['art/hero/taco']){const fr=a.hurt?'taco_hurt':a.air?'taco_jump':a.throwT>0?'taco_throw':a.run||a.amp>0.5?(Math.floor((a.ph!==undefined?a.ph/Math.PI:a.t*10))%2?'taco_run1':'taco_run2'):'taco';const im=D.IMG['art/hero/'+fr]||D.IMG['art/hero/taco'];const h=64,s=h/im.height;x.drawImage(im,-im.width*s/2,-h+2,im.width*s,h);return}
 const hf=HERO_FRAMES[key];if(hf&&D.IMG[hf]){const fr=a.hurt?'_hurt':a.air?'_jump':a.throwT>0?'_throw':a.run||a.amp>0.5?(Math.floor((a.ph!==undefined?a.ph/Math.PI:a.t*10))%2?'_run1':'_run2'):'';const im=D.IMG[hf+fr]||D.IMG[hf];const h=74,s=h/im.height;x.drawImage(im,-im.width*s/2,-h+2,im.width*s,h);return}
 const ak=HERO_ART[key];const im=ak&&D.IMG[ak];if(im){const h=key==='chewie'?84:key==='ewok'?52:72,s=h/im.height;let dy=0,rot=0,sx=1,sy=1;if(key==='ewok'&&window.TacoPhysics){const g=TacoPhysics.ewokBob(a.t,a.run?55:0);dy=g.dy||0;rot=g.rot||0;sx=g.sx||1;sy=g.sy||1}else if(a.ph!==undefined&&HRIG[ak]){dy=-Math.abs(Math.sin(a.ph))*3*a.amp;rot=Math.sin(a.ph)*0.05*a.amp}else if(a.run){dy=-Math.abs(Math.sin(a.t*13))*3;rot=Math.sin(a.t*13)*0.05}
  x.save();x.translate(0,dy);x.rotate(rot+(a.throwT>0?-0.08:0));x.scale(sx,sy);if(a.ph!==undefined&&HRIG[ak]&&a.amp>0.01&&!a.air)heroCut(x,im,HRIG[ak],im.width*s,h,-h+2,a.ph,a.amp);else x.drawImage(im,-im.width*s/2,-h+2,im.width*s,h);x.restore();return}
 if(key==='ewok')return D.ewok(x,a,0.85,'#7a5a3a');D.drawChar(x,key,a)}
function bossFrame(b){const k=b.art0;if(!k)return;const has=f=>D.IMG['art/bosses/'+k+f];let f='';
 if(b.dead)f='_defeat';else if(b.hurtT>0||b.stun>0||b.state==='teeter'||b.state==='blind'||b.state==='dizzy'||b.state==='stuck'||b.state==='floored')f='_hurt';else if(b.atkT>0||b.state==='tell')f='_attack';b.art=has(f)?k+f:has('')?k:null}
function render(dt){c.setTransform(1,0,0,1,0,0);
 if(G&&G.fl){return}
 c.fillStyle='#0b0214';c.fillRect(0,0,cv.width,cv.height);
 if(!G){renderTitleBg();return}
 const sx=G.shake>0?rand(-G.shake,G.shake):0,sy=G.shake>0?rand(-G.shake,G.shake):0;
 c.save();c.translate(0,gameTop*DPR);c.beginPath();c.rect(0,0,cv.width,gameH*DPR);c.clip();
 c.scale(DPR*S,DPR*S);
 c.save();c.translate(0,-G.cam.y*0.5);D.background(c,G.mode==='bike'?'endor':G.theme,G.cam.x,viewW,VH,G.t,VH);c.restore();
 if(window.TacoFX)TacoFX.drawAmbientBack(c,G.cam.x,0,viewW,VV);
 c.save();c.translate(Math.round(-G.cam.x+sx),Math.round(-G.cam.y+sy));
 drawWorld();
 c.restore();
 if(window.TacoFX){c.save();c.translate(sx,sy);TacoFX.drawParticles(c,G.cam.x,G.cam.y);TacoFX.drawAmbientFront(c,G.cam.x,0,viewW,VV);c.restore()}
 // post: color grade, vignette, flash
 const T=D.TH[G.theme]||D.TH.rainbow;c.globalCompositeOperation='soft-light';c.fillStyle=T.fog+'40';c.fillRect(0,0,viewW,VV);c.globalCompositeOperation='source-over';
 if(G.theme==='ewok'||G.theme==='final'){if(window.TacoFX){const pl=[{x:G.p.x+G.p.w/2-G.cam.x,y:G.p.y+20-G.cam.y,r:260,color:'#ffcc77',flicker:1}];if(G.boss)pl.push({x:G.boss.x-G.cam.x,y:G.boss.y-60-G.cam.y,r:240,color:'#ff6a3a'});TacoFX.drawLighting(c,viewW,VV,pl,G.theme==='ewok'?'rgba(10,8,30,0.25)':'rgba(20,0,0,0.3)')}}
 if(window.TacoFX)TacoFX.post(c,viewW,VV,{bloom:false});else{const vg=c.createRadialGradient(viewW/2,VV/2,VV*0.35,viewW/2,VV/2,Math.max(viewW,VV)*0.75);vg.addColorStop(0,'#00000000');vg.addColorStop(1,'#000000aa');c.fillStyle=vg;c.fillRect(0,0,viewW,VV)}
 if(G.tint>0){c.fillStyle='rgba(20,120,40,'+(G.tint*0.6)+')';c.fillRect(0,0,viewW,VV)}if(G.dim>0){c.fillStyle='rgba(0,0,0,'+Math.min(0.6,G.dim)+')';c.fillRect(0,0,viewW,VV)}
 if(G.flash>0){c.fillStyle='rgba(255,255,255,'+Math.min(1,G.flash)+')';c.fillRect(0,0,viewW,VV)}
 if(G.p.star>0){c.globalCompositeOperation='lighter';c.fillStyle='hsla('+(G.t*300%360)+',100%,60%,0.08)';c.fillRect(0,0,viewW,VV);c.globalCompositeOperation='source-over'}
 drawHUD();
 c.restore();
 if(portrait)drawPortraitFrame()}
function renderTitleBg(){const t=tGlobal;const ti=D.IMG['art/title_nologo']||D.IMG['art/title'];if(ti){const s=Math.max(cv.width/ti.width,cv.height/ti.height)*(1.04+Math.sin(t*0.3)*0.02);c.drawImage(ti,(cv.width-ti.width*s)/2,(cv.height-ti.height*s)/2,ti.width*s,ti.height*s);const vg=c.createRadialGradient(cv.width/2,cv.height/2,cv.height*0.2,cv.width/2,cv.height/2,cv.height*0.8);vg.addColorStop(0,'#00000022');vg.addColorStop(1,'#000000bb');c.fillStyle=vg;c.fillRect(0,0,cv.width,cv.height);return}c.save();c.scale(DPR*(H/VH),DPR*(H/VH));const vw=W/(H/VH);D.background(c,['etheria','rainbow','tatooine','endor','carealot'][Math.floor(t/8)%5],t*120,vw,VH,t,VH);
 c.save();c.translate(vw*0.5,430);c.scale(1.6,1.6);drawHero(c,'taco',{t,run:true});c.restore();
 const vg=c.createRadialGradient(vw/2,VH/2,VH*0.2,vw/2,VH/2,vw*0.8);vg.addColorStop(0,'#00000033');vg.addColorStop(1,'#000000cc');c.fillStyle=vg;c.fillRect(0,0,vw,VH);c.restore()}
function drawPortraitFrame(){const top=gameTop*DPR,bot=(gameTop+gameH)*DPR;c.setTransform(1,0,0,1,0,0);
 let g=c.createLinearGradient(0,0,0,top);g.addColorStop(0,'#14051f');g.addColorStop(1,'#2a0a4a');c.fillStyle=g;c.fillRect(0,0,cv.width,top);
 g=c.createLinearGradient(0,bot,0,cv.height);g.addColorStop(0,'#2a0a4a');g.addColorStop(1,'#07010e');c.fillStyle=g;c.fillRect(0,bot,cv.width,cv.height-bot);
 // synthwave grid in the control area
 c.save();c.beginPath();c.rect(0,bot,cv.width,cv.height-bot);c.clip();c.strokeStyle='#ff4fd833';c.lineWidth=1*DPR;const hz=bot+10*DPR,cx=cv.width/2;for(let i=-12;i<=12;i++){c.beginPath();c.moveTo(cx+i*20*DPR,hz);c.lineTo(cx+i*140*DPR,cv.height);c.stroke()}for(let k=0;k<12;k++){const y=hz+Math.pow(((k+(tGlobal*0.8)%1)/12),2)*(cv.height-hz);c.beginPath();c.moveTo(0,y);c.lineTo(cv.width,y);c.stroke()}c.restore();
 c.fillStyle='#ff4fd8';c.fillRect(0,top-2*DPR,cv.width,2*DPR);c.fillStyle='#00e5ff';c.fillRect(0,bot,cv.width,2*DPR);
 // HUD row in the top band
 if(G&&!G.fl){c.save();c.scale(DPR,DPR);drawTopBand();c.restore()}}
function drawWorld(){const t=G.t,L=G.L,x0=G.cam.x-100,x1=G.cam.x+viewW+100,theme=G.theme;
 // goal
 const gl=L.goal;if(gl&&G.mode!=='bike'){const locked=G.bossType&&!G.allBossDone;c.save();c.translate(gl.x+20,gl.y);c.globalAlpha=locked?0.35:1;
  c.fillStyle='#ddd';c.fillRect(-3,-160,6,160);circ(0,-164,7,'#ffe94b');const wave=Math.sin(t*5)*6;c.fillStyle=locked?'#666':'#ff2ad8';c.beginPath();c.moveTo(3,-156);c.quadraticCurveTo(30,-150+wave,56,-146);c.lineTo(3,-122);c.fill();
  if(!locked){c.globalCompositeOperation='lighter';const g=c.createRadialGradient(0,-80,5,0,-80,120);g.addColorStop(0,'#ffffff55');g.addColorStop(1,'#ff4fd800');c.fillStyle=g;c.fillRect(-120,-200,240,220)}c.restore()}
 // checkpoints
 for(const k of G.checkpoints){if(k.x<x0||k.x>x1)continue;const gy=findGround(k.x);c.fillStyle='#aaa';c.fillRect(k.x-2,gy-80,4,80);c.fillStyle=k.on?'#7ff7ff':'#555';c.beginPath();c.moveTo(k.x+2,gy-80);c.lineTo(k.x+34,gy-70);c.lineTo(k.x+2,gy-60);c.fill();if(k.on){c.save();c.globalCompositeOperation='lighter';circ(k.x+12,gy-70,22,'#7ff7ff33');c.restore()}}
 // solids
 for(const s of G.solids){if(s.x+s.w<x0||s.x>x1)continue;if(s.type==='sand'){c.fillStyle='#e6c48a';c.fillRect(s.x,s.y,s.w,s.h);continue}
  if(s.type==='ground')D.solid(c,theme,s.x,s.y,s.w,s.h);else D.platform(c,theme,Object.assign({},s,{type:'solid'}),t)}
 // hazards (sarlacc first: it's in the ground)
 for(const h of G.hazards){if(h.x+h.w<x0||h.x>x1)continue;if(h.type==='sarlacc')drawSarlacc(h);else if(h.type==='spikes'){c.fillStyle='#ccd';for(let i=0;i<h.w;i+=16){c.beginPath();c.moveTo(h.x+i,h.y+h.h);c.lineTo(h.x+i+8,h.y);c.lineTo(h.x+i+16,h.y+h.h);c.fill()}c.fillStyle='#fff8';for(let i=0;i<h.w;i+=16)c.fillRect(h.x+i+7,h.y+2,2,6)}
  else if(h.type==='laser'){c.fillStyle='#444';c.fillRect(h.x-6,h.y-6,12,h.h+12);c.fillRect(h.x+h.w-6,h.y-6,12,h.h+12);if(h.on){c.save();c.globalCompositeOperation='lighter';c.fillStyle='#ff2a2a';c.fillRect(h.x,h.y+h.h/2-2,h.w,4);c.fillStyle='#ff2a2a44';c.fillRect(h.x,h.y,h.w,h.h);c.restore()}}
  else if(h.type==='sand'){c.fillStyle='#d8b07a66';c.fillRect(h.x,(h.y||460)-4,h.w,8)}
  else{c.save();c.globalCompositeOperation='lighter';c.fillStyle=h.type==='lava'?'#ff4a0099':'#6aff3a77';c.fillRect(h.x,h.y,h.w,h.h);c.restore()}}
 // platforms
 for(const s of G.plats){if(s.x+s.w<x0||s.x>x1)continue;c.save();if(s.fallen)c.translate(0,s.fy);if(s.shk&&!s.fallen)c.translate(rand(-1.5,1.5),0);if(s.type==='moving'&&theme==='tatooine'){drawSkiff(s)}else D.platform(c,theme,s,t);c.restore()}
 // springs, boosts
 for(const s of G.springs){if(s.x<x0||s.x>x1)continue;const q=1-(s.sq||0)*0.5;c.fillStyle='#555';c.fillRect(s.x-14,s.y-6,28,6);c.strokeStyle='#ccc';c.lineWidth=3;c.beginPath();for(let i=0;i<4;i++){c.moveTo(s.x-10,s.y-6-i*4*q);c.lineTo(s.x+10,s.y-8-i*4*q)}c.stroke();c.fillStyle='#ff2ad8';D.rr(c,s.x-16,s.y-22*q,32,7,3);c.fill()}
 for(const b of L.boosts||[]){if(b.x>x1||b.x+b.w<x0)continue;c.save();c.globalCompositeOperation='lighter';for(let i=0;i<3;i++){const ph=((t*3+i/3)%1);c.fillStyle='rgba(127,247,255,'+(0.6*(1-ph))+')';const xx=b.x+b.w*ph*(b.dir<0?-1:1)+(b.dir<0?b.w:0);c.beginPath();c.moveTo(xx,b.y-2);c.lineTo(xx+(b.dir||1)*14,b.y-8);c.lineTo(xx,b.y-14);c.lineTo(xx+(b.dir||1)*6,b.y-8);c.fill()}c.restore();c.fillStyle='#7ff7ff';c.fillRect(b.x,b.y-3,b.w,3)}
 // bike obstacles
 if(G.mode==='bike')for(const o of G.obstacles){if(o.x>x1||o.x<x0-200)continue;drawObstacle(o)}
 // pickups
 for(const q of G.pickups){if(q.got||q.x<x0||q.x>x1)continue;c.save();c.translate(q.x,q.y);D.pickup(c,q.type,t+q.x*0.01);c.restore()}
 // allies
 for(const a of G.allies){if(a.x<x0||a.x>x1||playKey(a.who)===PC)continue;c.save();c.translate(a.x,a.y);if((a.face<0?-1:1)*(ART_FACE[a.who]||1)<0)c.scale(-1,1);const ak2='art/allies/'+allyKey(a.who);const im=D.IMG[ak2];if(!im&&ART_ALL.includes(ak2+'.webp')){c.restore();continue}if(im){const h=a.who==='chewbacca'?96:a.who==='wicket'?54:a.who==='swift_wind'?96:a.who==='twink'?40:76,s=h/im.height;let dy=Math.sin(t*3+a.x)*1.2,rot=0,sx=1,sy=1;if(a.who==='wicket'&&window.TacoPhysics){const g=TacoPhysics.ewokBob(a.t||0,a.follow?55:0);dy=g.dy;rot=g.rot;sx=g.sx;sy=g.sy}c.translate(0,dy);c.rotate(rot);c.scale(sx,sy);c.drawImage(im,-im.width*s/2,-h+2,im.width*s,h)}else D.ally(c,a.who,t);c.restore();
  if(a.sayT>0)bubble(a.x,a.y-(a.who==='chewbacca'?110:90),a.say)}
 // enemies
 for(const e of G.enemies){if(e.x<x0||e.x>x1)continue;c.save();c.translate(e.x,e.y);if(e.dead&&e.squash){c.scale(1.3,Math.max(0.15,1-(e.dt||0)*4));c.globalAlpha=Math.max(0,1-(e.dt||0)*1.5)}else if(e.dead){c.rotate((e.dt||0)*8);c.globalAlpha=Math.max(0,1-(e.dt||0))}
  const mv=Math.abs(e.x-(e._lx===undefined?e.x:e._lx));e._lx=e.x;e.wp=(e.wp||0)+mv*0.075;e.mvT=mv>0.05?0.12:Math.max(0,(e.mvT||0)-1/60);if(e.ride){D.speeder(c,t,'scout');}else D.enemy(c,{type:e.type,dir:e.dir,h:e.h,w:e.w,flash:e.flash,wp:e.wp,mv:!e.dead&&e.mvT>0},t+e.x*0.01);c.restore()}
 // boss
 if(G.boss&&!G.boss.vm&&G.theme==='tatooine'&&D.IMG['art/props/sail_barge']){const im=D.IMG['art/props/sail_barge'],k=300/im.height;c.globalAlpha=0.9;c.drawImage(im,G.boss.x-im.width*k*0.3,G.boss.gy-300+20,im.width*k,300);c.globalAlpha=1}
 drawMarks();
 if(G.boss&&b0vis(G.boss)){const b=G.boss;c.save();if(b.dead){if(b.art0&&b.type!=='bowser'){c.globalAlpha=Math.max(0,1-Math.max(0,b.dt-1.2)*1.2)}else{c.globalAlpha=Math.max(0,1-b.dt*0.5);c.translate(rand(-4,4),b.dt*30)}}else if(b.alpha!==undefined&&b.alpha<1)c.globalAlpha=Math.max(0,b.alpha);
  if(b.barrier){c.save();c.globalCompositeOperation='lighter';c.globalAlpha=0.35+0.15*Math.sin(G.t*8);c.strokeStyle='#5aff7a';c.lineWidth=4;c.beginPath();c.ellipse(b.x,b.y-b.dh*0.5,b.dh*0.42,b.dh*0.58,0,0,TAU);c.stroke();c.fillStyle='#5aff7a22';c.fill();c.restore()}
  if(b.glow){c.save();c.globalCompositeOperation='lighter';const gx=b.x+b.dir*b.w*(b.type==='skeletor'?0.55:0.4),gy2=b.y-b.dh*(b.type==='skeletor'?0.85:0.5);c.globalAlpha=0.5+0.4*Math.sin(G.t*25);const gg=c.createRadialGradient(gx,gy2,2,gx,gy2,46);gg.addColorStop(0,'#ffffff');gg.addColorStop(0.3,b.type==='skeletor'?'#b06aff':b.type==='freddy_krueger'?'#9aff9a':b.type==='bowser'?'#ffcc33':'#ff4a4a');gg.addColorStop(1,'#0000');c.fillStyle=gg;c.fillRect(gx-50,gy2-50,100,100);c.restore()}const bb=Object.assign({},b,{x:b.x+(b.offsetX||0)});if(b.sx||b.sy){c.translate(bb.x,bb.y);c.scale(b.sx||1,b.sy||1);c.translate(-bb.x,-bb.y)}bossFrame(bb);if(b.spinA){c.translate(bb.x,bb.y-b.h*0.4);c.rotate(b.spinA*b.cdir);c.scale(0.8,0.8);c.translate(-bb.x,-(bb.y-b.h*0.4))}D.boss(c,bb,t);if(b.flash>0&&!D.IMG['art/bosses/'+(bb.art||bb.type)]){c.globalCompositeOperation='lighter';c.globalAlpha=Math.min(1,b.flash*5)*0.6;c.fillStyle='#fff';c.beginPath();c.ellipse(bb.x,bb.y-b.h/2,b.w*0.6,b.h*0.55,0,0,7);c.fill()}c.restore();
  if(b.sayT>0&&b.say&&!b.ghost)bubble(b.x,b.y-b.dh-6,b.say)}
 // player
 drawBuddy();drawPlayer();
 // shots
 for(const s of G.shots)D.shot(c,s,t);for(const s of G.eshots)D.shot(c,s,t);
 // particles
 for(const q of G.parts){const a=Math.max(0,q.l/q.m);if(q.ring){c.strokeStyle=q.c;c.globalAlpha=a;c.lineWidth=3;c.beginPath();c.arc(q.x,q.y,q.s*(1.2-a),0,TAU);c.stroke();c.globalAlpha=1;continue}
  if(q.add)c.globalCompositeOperation='lighter';c.globalAlpha=q.smoke?a*0.5:a;c.fillStyle=q.c;const r=q.smoke?q.s*(2-a):q.s*a;c.beginPath();c.arc(q.x,q.y,Math.max(0.5,r),0,TAU);c.fill();c.globalAlpha=1;c.globalCompositeOperation='source-over'}
 for(const tx of G.texts){c.globalAlpha=Math.min(1,tx.l*2);c.font=(tx.big?'900 24px':'800 15px')+' "Trebuchet MS",sans-serif';c.textAlign='center';c.lineWidth=4;c.strokeStyle='#000';let fs=tx.big?24:15,tw=c.measureText(tx.s).width;const tmax=G.vm?viewW-88:viewW*0.92-8;if(tw>tmax){fs=Math.max(10,Math.floor(fs*tmax/tw));c.font=(tx.big?'900 ':'800 ')+fs+'px "Trebuchet MS",sans-serif';tw=c.measureText(tx.s).width}const mg=G.vm?40:12;let txx=clamp(tx.x,G.cam.x+tw/2+mg,G.cam.x+viewW-tw/2-mg),txy=Math.max(G.cam.y+fs+(G.vm?(portrait?38:92):6),tx.y);if(G.vm){const top=txy<=G.cam.y+fs+(portrait?38:92)+1,occ=G._occ||(G._occ=[]);if(!occ.arw){occ.arw=1;const P=G.p,sx=P.x+P.w/2-G.cam.x;if(!P.dead&&(sx<0||sx>viewW)){const ay=clamp(P.y+P.h/2-G.cam.y,60,VV-60);occ.push({x:G.cam.x+(sx<0?0:viewW-130),y:G.cam.y+ay-18,w:130,h:56,arrow:1})}}for(let k=0;k<8;k++){const hit=occ.find(o=>txx+tw/2>o.x&&txx-tw/2<o.x+o.w&&txy>o.y&&txy-fs<o.y+o.h);if(!hit)break;txy=top?hit.y+hit.h+fs+2:hit.y-3}occ.push({x:txx-tw/2,y:txy-fs,w:tw,h:fs+4})}c.strokeText(tx.s,txx,txy);c.fillStyle=tx.c;c.fillText(tx.s,txx,txy);c.globalAlpha=1}G._occ=[]}
/* never draw an ally that is the same character as the hero (no ghost duplicate): swap in a world-mate */
const SELF_ALLY={rainbow:{rainbow_brite:'twink'},carebear:{care_bear_tenderheart:'grumpy_bear',tenderheart:'grumpy_bear'},shera:{she_ra:'swift_wind'},joe:{snake_eyes:'duke'},chewie:{chewbacca:'wicket'},ewok:{wicket:'chewbacca'}};
const SELF_ALT={rainbow:['twink','starlite'],carebear:['grumpy_bear','funshine'],shera:['swift_wind','madame_razz'],joe:['duke','scarlett'],chewie:['wicket','lando','leia'],ewok:['chewbacca','lando','leia']};
const SUB_SAY={twink:'Twink twink! Rainbow Land needs you!',starlite:'Neigh! Hop on the rainbow, friend!',grumpy_bear:'Hmph. Fine, I\'ll help. Go!',funshine:'Sunny side up! Let\'s go!',swift_wind:'For the honor of Grayskull!',madame_razz:'Hocus pocus, focus! I\'ll help!',duke:'Yo Joe! I\'ve got your six!',scarlett:'Cobra won\'t see us coming!',wicket:'Yub nub! Follow me!',lando:'Hey, buddy! I\'ve got your back.',leia:'Help is here. Let\'s move!',chewbacca:'RRAAWWR!'};
function castAllies(L){const self=SELF_ALLY[CH]||{},alts=SELF_ALT[CH]||[],src=L.allies||[];const taken=new Set(src.map(a=>a.who).filter(w=>!self[w]));const out=[];
 for(const a of src){if(!self[a.who]){out.push(a);continue}const alt=alts.find(w=>!taken.has(w));const key=a.trigger==='boss_phase'||a.action==='assist';
  if(alt){taken.add(alt);out.push(Object.assign({},a,{who:alt,orig:a.who,say:SUB_SAY[alt]||''}))}else if(key){const w=alts[0]||self[a.who];out.push(Object.assign({},a,{who:w,orig:a.who,say:SUB_SAY[w]||''}))}}
 return out}
/* ---------- Sonic & Tails buddy: the starting helper follows you; tap it to swap who you play ---------- */
const CHAR_OF={rainbow_brite:'rainbow',care_bear_tenderheart:'carebear',tenderheart:'carebear',she_ra:'shera',snake_eyes:'joe',chewbacca:'chewie',wicket:'ewok'};
const WHO_OF={rainbow:'rainbow_brite',carebear:'care_bear_tenderheart',shera:'she_ra',joe:'snake_eyes',chewie:'chewbacca',ewok:'wicket'};
const FORMS={
 twink:{name:'Twink',weapon:'star',jump:1.08,speed:0.95,dj:1,floaty:1,w:28,h:38,dh:46},
 starlite:{name:'Starlite',weapon:'star',jump:1.15,speed:1.2,w:46,h:52,dh:80},
 swift_wind:{name:'Swift Wind',weapon:'sword',jump:1.1,speed:1.15,dj:1,w:46,h:52,dh:84},
 funshine:{name:'Funshine Bear',weapon:'care',jump:1,speed:0.95,floaty:1,w:30,h:46,dh:70},
 grumpy_bear:{name:'Grumpy Bear',weapon:'care',jump:1,speed:0.95,floaty:1,w:30,h:46,dh:70},
 duke:{name:'Duke',weapon:'bullet',jump:1,speed:1.05,w:30,h:58,dh:74},
 scarlett:{name:'Scarlett',weapon:'bullet',jump:1.05,speed:1.1,w:30,h:58,dh:72},
 madame_razz:{name:'Madame Razz',weapon:'star',jump:1,speed:0.95,floaty:1,w:30,h:58,dh:72},
 lando:{name:'Lando',weapon:'bolt',jump:1.02,speed:1.05,w:30,h:58,dh:72},
 leia:{name:'Princess Leia',weapon:'bolt',jump:1.02,speed:1.05,w:30,h:58,dh:72},
 r2d2:{name:'R2-D2',weapon:'bolt',jump:0.92,speed:0.9,w:30,h:40,dh:46},
 chewbacca:{name:'Chewbacca',weapon:'bolt',jump:1.08,speed:1,w:32,h:62,dh:84}};
const ART_FACE={};
let PC='taco';
function playKey(who){return CHAR_OF[who]||('h:'+who)}
function charOf(k){if(CHARS[k])return CHARS[k];const f=FORMS[(k||'').slice(2)];return f?Object.assign({tag:''},f):CHARS.taco}
function sizeFor(k){if(k==='chewie')return[32,62];if(k==='ewok')return[28,40];if(k==='taco'||k==='carebear')return[30,46];const f=FORMS[(k||'').slice(2)];if(f)return[f.w,f.h];return[30,58]}
function drawForm(x,key,a){const who=key.slice(2),f=FORMS[who]||{};const im=D.IMG['art/allies/'+allyKey(who)];
 if(!im){x.save();if(ART_FACE[who]<0)x.scale(-1,1);D.ally(x,who,a.t);x.restore();return}
 const h=f.dh||72,s=h/im.height;let dy=0,rot=0;if(a.run){dy=-Math.abs(Math.sin(a.t*13))*3;rot=Math.sin(a.t*13)*0.05}else if(a.air)rot=-0.12;else dy=Math.sin(a.t*3)*1.2;
 x.save();if((f.face||ART_FACE[who]||1)<0)x.scale(-1,1);x.translate(0,dy);x.rotate(rot+(a.throwT>0?-0.1:0));x.drawImage(im,-im.width*s/2,-h+2,im.width*s,h);x.restore()}
function supportAt(x,feet){for(const s of G.solids)if(x>=s.x&&x<=s.x+s.w&&s.y>=feet-6&&s.y<=feet+48)return true;for(const s of G.plats){if(s.type==='ladder'||s.fallen)continue;if(x>=s.x&&x<=s.x+s.w&&s.y>=feet-6&&s.y<=feet+48)return true}return false}
function wallAhead(x,feet,dir){for(const s of G.solids){if(x+dir*24>=s.x&&x+dir*24<=s.x+s.w&&s.y<feet-10&&s.y>feet-170&&s.y+s.h>feet-8)return true}return false}
function makeBuddy(L,p){if(L.mode!=='platform')return null;const i=G.allies.findIndex(a=>a.x<=L.start.x+360&&a.trigger!=='boss_phase'&&a.action!=='assist');if(i<0)return null;const a=G.allies.splice(i,1)[0];
 const k=playKey(a.who);const [w,h]=sizeFor(k);if(a.gift)G.pickups.push({type:a.gift,x:a.x+20,y:a.y-70,got:false,pop:1,vy:-380});(a.give||[]).forEach((g,j)=>G.pickups.push({type:g,x:a.x+j*24,y:a.y-70,got:false,pop:1,vy:-380}));
 let seen=0;try{seen=+localStorage.getItem('taco_swap_seen')||0}catch(e){}
 return{k,x:a.x-w/2,y:(a.y||460)-h,w,h,vx:0,vy:0,face:1,onGround:false,t:0,say:a.say||'',sayT:a.say?3.2:0,hintT:seen>=1?0:7,fly:0,offT:0,cd:0}}
function buddyWarp(b,p,why){burst(b.x+b.w/2,b.y+b.h/2,12,['#ffffff','#b06aff','#ffe94b'],220,0.4,3);b.x=p.x+p.w/2-p.face*46-b.w/2;b.y=p.y+p.h-b.h;b.vx=p.vx*0.6;b.vy=0;b.fly=p.onGround&&supportAt(b.x+b.w/2,p.y+p.h)?0:1;b.offT=0;burst(b.x+b.w/2,b.y+b.h/2,16,['#ffffff','#7ff7ff','#ff4fd8'],240,0.45,3)}
function stepBuddy(dt){const b=G.buddy,p=G.p;if(!b||!p)return;b.t+=dt;if(b.sayT>0)b.sayT-=dt;if(b.hintT>0)b.hintT-=dt;if(b.cd>0)b.cd-=dt;
 const ch=charOf(b.k),maxSp=(TUNE.runMax||330)*1.25*(ch.speed||1);const tx=p.x+p.w/2-p.face*52,cx=b.x+b.w/2,dx=tx-cx;
 if(p.dead){b.vx*=0.8}
 if(b.fly){b.vx=clamp(dx*6,-maxSp*1.6,maxSp*1.6);const ty=p.y+p.h-b.h-(p.onGround?0:10);b.vy=clamp((ty-b.y)*7,-900,900);b.x+=b.vx*dt;b.y+=b.vy*dt;b.onGround=false;
  if(Math.random()<dt*30)G.parts.push({x:b.x+b.w/2+rand(-10,10),y:b.y+b.h,vx:rand(-30,30),vy:rand(20,60),l:0.5,m:0.5,s:4,c:['#ffe94b','#ff4fd8','#7ff7ff'][Math.floor(Math.random()*3)]});
  if(p.onGround&&Math.abs(dx)<40&&Math.abs(ty-b.y)<20&&supportAt(b.x+b.w/2,b.y+b.h+2)){b.fly=0;b.vy=0}return}
 const want=Math.abs(dx)<14?0:clamp(dx*5,-maxSp,maxSp);b.vx+=(want-b.vx)*Math.min(1,dt*(b.onGround?10:4));if(Math.abs(b.vx)>20)b.face=b.vx>0?1:-1;else if(Math.abs(p.x+p.w/2-cx)>8)b.face=p.x+p.w/2>cx?1:-1;
 const feet=b.y+b.h,dir=b.vx>=0?1:-1;
 if(b.onGround&&!p.dead){const gap=Math.abs(b.vx)>40&&!supportAt(cx+dir*(b.w/2+10),feet),wall=Math.abs(dx)>20&&wallAhead(cx,feet,dir),up=(p.y+p.h)<feet-48&&Math.abs(dx)<180&&p.onGround;
  if(gap||wall||up){const need=up?feet-(p.y+p.h)+40:wall?150:120;b.vy=-Math.min(1150,Math.sqrt(2*TUNE.gravity*Math.max(90,need)));if(gap)b.vx=dir*Math.max(Math.abs(b.vx),maxSp*0.95);b.onGround=false}}
 b.vy=Math.min(TUNE.maxFall||1100,b.vy+TUNE.gravity*(ch.floaty&&b.vy>0?0.6:1)*dt);
 b.prevX=b.x;b.x+=b.vx*dt;colX(b);b.prevY=b.y;b.y+=b.vy*dt;colY(b);
 if(b.ride&&b.ride.vx)b.x+=b.ride.vx*dt;
 const sxp=b.x-G.cam.x;if(sxp<-80||sxp>viewW+80||b.y>G.cam.y+VV+40)b.offT+=dt;else b.offT=0;
 if(b.y>VH+40||Math.abs(dx)>viewW*0.85||b.offT>1.2||(!b.onGround&&b.vy>0&&b.y+b.h>VH-10&&!supportAt(b.x+b.w/2,VH)))buddyWarp(b,p)}
function drawBuddy(){const b=G.buddy;if(!b)return;c.save();c.translate(b.x+b.w/2,b.y+b.h);if(b.fly){c.globalAlpha=0.85}
 if(b.hintT>0||b.tapFx>0){const pulse=0.5+0.5*Math.sin(G.t*6);c.save();c.globalCompositeOperation='lighter';c.globalAlpha=0.35+pulse*0.35;const g=c.createRadialGradient(0,-b.h*0.6,4,0,-b.h*0.6,b.h);g.addColorStop(0,'#ffffff');g.addColorStop(0.4,'#ff4fd8');g.addColorStop(1,'#0000');c.fillStyle=g;c.fillRect(-b.h,-b.h*1.6,b.h*2,b.h*2);c.restore()}
 heroGait(b,b.onGround);c.scale(b.face,1);drawHero(c,b.k,{ph:b._gp,amp:b._ga,t:G.t+1.3,run:b.onGround&&Math.abs(b.vx)>30,air:!b.onGround,throwT:0,hurt:false,blink:(G.t%3.1)<0.1});c.restore();
 if(b.hintT>0&&!G.clear&&!G.vm)bubble(b.x+b.w/2,b.y-charDH(b.k)-4,(Math.floor(G.t*2)%2?'👆 ':'')+'TAP TO SWAP');else if(b.sayT>0&&b.say)bubble(b.x+b.w/2,b.y-charDH(b.k)-4,b.say)}
function charDH(k){const f=FORMS[(k||'').slice(2)];if(f)return f.dh-sizeFor(k)[1];return k==='chewie'?24:k==='taco'?20:18}
function swapBuddy(){const b=G&&G.buddy,p=G&&G.p;if(G&&G.vm||!b||!p||p.dead||G.clear||G.mode!=='platform'||state!=='play'||b.cd>0||p.capT)return false;
 const nk=b.k,ok=PC;const pf=p.y+p.h,pcx=p.x+p.w/2,bf=b.y+b.h,bcx=b.x+b.w/2;
 PC=nk;b.k=ok;const [w,h]=sizeFor(PC);p.w=w;p.h=h;p.x=bcx-w/2;p.y=bf-h;p.vx=0;p.vy=Math.min(p.vy,0);p.inv=Math.max(p.inv||0,0.6);p.dj=0;
 const [bw,bh]=sizeFor(b.k);b.w=bw;b.h=bh;b.x=pcx-bw/2;b.y=pf-bh;b.vx=b.vy=0;b.fly=0;b.cd=0.35;b.hintT=0;b.sayT=0;b.face=p.face;
 for(const [x,y] of[[bcx,bf-30],[pcx,pf-30]]){burst(x,y,26,['#ffffff','#ff4fd8','#7ff7ff','#ffe94b'],320,0.55,5);for(let i=0;i<10;i++)G.parts.push({x:x+rand(-20,20),y:y+rand(-20,20),vx:rand(-60,60),vy:-rand(20,80),l:0.7,m:0.7,s:10,c:'#ffffffaa',smoke:1,g:-40})}
 AU.fx('star');text(p.x+p.w/2,p.y-34,'NOW PLAYING: '+charOf(PC).name.toUpperCase(),'#7ff7ff',1);shake(4);
 try{localStorage.setItem('taco_swap_seen',String((+localStorage.getItem('taco_swap_seen')||0)+1))}catch(e){}
 G.swaps=(G.swaps||0)+1;return true}
function tapWorld(cx,cy){if(!G||G.vm||!G.buddy||state!=='play')return false;const wx=cx/S+G.cam.x,wy=(cy-gameTop)/S+G.cam.y,b=G.buddy;const top=b.y-charDH(b.k)-6,pad=18;
 if(wx>=b.x-pad&&wx<=b.x+b.w+pad&&wy>=top-pad&&wy<=b.y+b.h+pad)return swapBuddy();return false}

function selfSub(w,taken){/* legacy */const m=SELF_ALLY[CH];if(!(m&&m[w]))return w;const alts=SELF_ALT[CH]||[m[w]];return alts.find(a=>!(taken&&taken.includes(a)))||m[w]}
function allyAmmo(a,dt){if(!a.ammoT||!G.boss||G.boss.dead)return;a.ammoT-=dt;if(a.ammoT<=0){a.ammoT=6;const p=G.p;G.pickups.push({type:charOf(PC).weapon==='toppings'?['tomato','cheese','jalapeno','salsa'][Math.floor(Math.random()*4)]:'jalapeno',x:a.x+20,y:a.y-90,got:false,pop:1,vy:-420});AU.fx('roar');a.sayT=1.2;a.say='RRWWGH!'}}
function allyKey(w){return{tenderheart:'care_bear_tenderheart'}[w]||w}
function circ(x,y,r,f){c.beginPath();c.arc(x,y,r,0,TAU);c.fillStyle=f;c.fill()}
function b0vis(b){return b.y>-300}
function bubble(x,y,s){c.font='700 14px "Trebuchet MS",sans-serif';const lines=wrap(s,190);const w=Math.max(...lines.map(l=>c.measureText(l).width))+20,h=lines.length*17+12;const bx=clamp(x,G.cam.x+w/2+6,G.cam.x+viewW-w/2-6),by=Math.max(G.cam.y+h+8,y);(G._occ||(G._occ=[])).push({x:bx-w/2,y:by-h,w,h:h+10});c.fillStyle='#fffffff0';c.strokeStyle='#ff4fd8';c.lineWidth=2;D.rr(c,bx-w/2,by-h,w,h,10);c.fill();c.stroke();c.beginPath();c.moveTo(x-6,by-1);c.lineTo(x,by+10);c.lineTo(x+6,by-1);c.fill();c.fillStyle='#2a0a4a';c.textAlign='center';lines.forEach((l,i)=>c.fillText(l,bx,by-h+20+i*17))}
function wrap(s,mw){const w=String(s).split(' '),out=[];let cur='';for(const x of w){const t=cur?cur+' '+x:x;if(c.measureText(t).width>mw&&cur){out.push(cur);cur=x}else cur=t}if(cur)out.push(cur);return out}
function drawPlayer(){const p=G.p;if(p.dead&&G.mode!=='bike'){return}if(p.inv>0&&Math.floor(p.inv*16)%2&&!p.dead)return;
 c.save();
 if(G.mode==='bike'){c.translate(p.x+p.w/2,p.y+p.h/2+(p.bob||0));c.rotate(p.tilt||0);const im=CH==='taco'&&D.IMG['art/hero/taco_bike'];if(im){const w=110,s=w/im.width;c.drawImage(im,-w/2,-im.height*s+18,w,im.height*s)}else{D.speeder(c,G.t,null);c.save();c.translate(-6,-4);drawHero(c,CH,{t:G.t,run:false});c.restore()}
  c.globalCompositeOperation='lighter';c.fillStyle='#ffb06a88';c.beginPath();c.ellipse(-50,4,14+Math.random()*6,5,0,0,TAU);c.fill();c.restore();return}
 c.translate(p.x+p.w/2,p.y+p.h);
 // ground shadow
 c.save();c.globalAlpha=0.3;c.fillStyle='#000';const gy=findGround(p.x+p.w/2)-(p.y+p.h);if(gy<200){c.beginPath();c.ellipse(0,gy,18*(1-gy/300),4,0,0,TAU);c.fill()}c.restore();
 if(p.star>0){c.save();c.globalCompositeOperation='lighter';const g=c.createRadialGradient(0,-24,4,0,-24,48);g.addColorStop(0,'hsla('+(G.t*400%360)+',100%,70%,0.6)');g.addColorStop(1,'#0000');c.fillStyle=g;c.fillRect(-50,-80,100,90);c.restore()}
 if(p.shield){c.save();c.globalCompositeOperation='lighter';c.strokeStyle='#7ff7ffaa';c.lineWidth=3;c.beginPath();c.arc(0,-26,34+Math.sin(G.t*8)*2,0,TAU);c.stroke();c.restore()}
 const sq=p.pound===2?1.2:1;c.scale(p.face*sq,1/sq);
 heroGait(p,p.onGround);drawHero(c,PC,{ph:p._gp,amp:p._ga,t:G.t,run:p.onGround&&Math.abs(p.vx)>30,air:!p.onGround,throwT:p.throwT,hurt:p.inv>1,blink:(G.t%3.5)<0.1});
 if(p.iceT>0){c.save();c.globalAlpha=0.55;c.fillStyle='#bff2ff';D.rr(c,-p.w/2-8,-p.h-14,p.w+16,p.h+16,6);c.fill();c.globalAlpha=0.9;c.strokeStyle='#ffffff';c.lineWidth=2;c.stroke();c.restore()}
 c.restore()}
function drawSarlacc(h){const cx=h.x+h.w/2,y=h.y,t=G.t;const pull=h.pull||0;const im=D.IMG['art/props/sarlacc'];
 if(im){const w=Math.max(h.w*1.25,170),s=w/im.width,hh=im.height*s;const gy0=y;c.save();c.translate(cx,gy0-4);c.scale(1+pull*0.06+Math.sin(t*3)*0.01,1+pull*0.08);c.drawImage(im,-w/2,0,w,hh);c.restore();c.save();c.strokeStyle='#9a6a4a';c.lineWidth=5;c.lineCap='round';for(let k=0;k<4;k++){const side=k<2?-1:1,len=10+pull*80+Math.sin(t*2+k)*8;c.beginPath();c.moveTo(cx+side*(10+k%2*8),y);c.quadraticCurveTo(cx+side*(26+k*6),y-len*0.7,cx+side*(18+k*8)+Math.sin(t*3+k)*10,y-len);c.stroke()}c.restore();return}
 c.save();const g=c.createRadialGradient(cx,y+6,4,cx,y+6,h.w*0.75);g.addColorStop(0,'#2a1408');g.addColorStop(0.35,'#8a5a2a');g.addColorStop(1,'#e6c48a00');c.fillStyle=g;c.beginPath();c.ellipse(cx,y+4,h.w*0.75,22,0,0,TAU);c.fill();
 c.fillStyle='#3a0a0a';c.beginPath();c.ellipse(cx,y+4,26+pull*8+Math.sin(t*3)*3,10+pull*4,0,0,TAU);c.fill();c.fillStyle='#e8d8b0';for(let i=0;i<10;i++){const a=i/10*TAU,rx=Math.cos(a)*(28+pull*8),ry=Math.sin(a)*(11+pull*4);c.beginPath();c.moveTo(cx+rx,y+4+ry);c.lineTo(cx+rx*0.7,y+4+ry*0.7-6);c.lineTo(cx+rx*0.85+3,y+4+ry*0.85);c.fill()}
 c.fillStyle='#d8a8a0';c.beginPath();c.moveTo(cx-6,y);c.lineTo(cx,y-10-pull*10);c.lineTo(cx+6,y);c.fill();
 c.strokeStyle='#9a6a4a';c.lineWidth=5;c.lineCap='round';for(let k=0;k<4;k++){const side=k<2?-1:1,len=30+pull*70+Math.sin(t*2+k)*10;c.beginPath();c.moveTo(cx+side*(14+k%2*8),y+2);c.quadraticCurveTo(cx+side*(30+k*6),y-len*0.7,cx+side*(20+k*8)+Math.sin(t*3+k)*10,y-len);c.stroke()}c.restore()}
function drawSkiff(s){const x=s.x,y=s.y,w=s.w;const im=D.IMG['art/props/skiff'];if(im){const k=(w+30)/im.width;c.drawImage(im,x-15,y-im.height*k*0.35,w+30,im.height*k);return}c.fillStyle='#c8b090';D.rr(c,x,y,w,14,6);c.fill();c.fillStyle='#8a6a4a';c.fillRect(x+4,y+12,w-8,6);c.fillStyle='#e8d8b8';c.fillRect(x,y,w,3);c.save();c.globalCompositeOperation='lighter';c.fillStyle='#ffd88a33';c.beginPath();c.ellipse(x+w/2,y+28,w*0.4,6,0,0,TAU);c.fill();c.restore()}
function drawObstacle(o){const r=obRect(o);if(o.type==='tree'){const g=c.createLinearGradient(r.x,0,r.x+r.w,0);g.addColorStop(0,'#3a2412');g.addColorStop(0.4,'#7a4a24');g.addColorStop(1,'#2a1808');c.fillStyle=g;c.fillRect(r.x,r.y,r.w,r.h);c.fillStyle='#2a1808';for(let k=r.y;k<r.y+r.h;k+=22)c.fillRect(r.x+8+(k%3)*8,k,3,14);c.fillStyle='#2f5a2a';c.beginPath();c.ellipse(r.x+r.w/2,r.y,40,16,0,0,TAU);c.fill()}
 else if(o.type==='branch'){c.fillStyle='#5a3a1a';c.fillRect(r.x,r.y,r.w,r.h);c.fillStyle='#2f5a2a';for(let i=0;i<5;i++){c.beginPath();c.ellipse(r.x+i*24,r.y+r.h,16,10,0,0,TAU);c.fill()}}
 else if(o.type==='log'){c.fillStyle='#6a4220';D.rr(c,r.x,r.y,r.w,r.h,r.h/2);c.fill();c.fillStyle='#a8743c';c.beginPath();c.ellipse(r.x+r.w-6,r.y+r.h/2,6,r.h/2-2,0,0,TAU);c.fill()}
 else{c.fillStyle='#6a6a62';c.beginPath();c.ellipse(r.x+r.w/2,r.y+r.h*0.6,r.w/2,r.h*0.6,0,0,TAU);c.fill();c.fillStyle='#8a8a82';c.beginPath();c.ellipse(r.x+r.w/2-6,r.y+r.h*0.4,r.w/4,r.h/4,0,0,TAU);c.fill()}}
const HUDR={};
function drawHUD(){const p=G.p;
 if(!portrait)drawTopBandAt(10,10,viewW);if(G.vm)drawVMHud();
 // banner
 if(G.banner&&G.banner.t>0){const b=G.banner;const a=Math.min(1,b.t*2,(b.tt||0)*3);c.globalAlpha=Math.min(1,b.t);let bfs=b.boss?34:30;c.font='900 '+bfs+'px "Trebuchet MS",Impact,sans-serif';{const tw=c.measureText(b.s).width+6,mw=viewW*0.92;if(tw>mw){bfs=Math.max(12,Math.floor(bfs*mw/tw));c.font='900 '+bfs+'px "Trebuchet MS",Impact,sans-serif'}}G.bannerFit={s:b.s,w:c.measureText(b.s).width+6,vw:viewW};c.textAlign='center';c.lineWidth=Math.max(3,Math.round(bfs/6));c.strokeStyle='#000';const y=VV*0.38;c.strokeText(b.s,viewW/2,y);const g=c.createLinearGradient(0,y-30,0,y);g.addColorStop(0,'#fff');g.addColorStop(0.5,b.boss?'#ff5a2a':'#ffe94b');g.addColorStop(1,b.boss?'#ff2a2a':'#ff4fd8');c.fillStyle=g;c.fillText(b.s,viewW/2,y);const sub=b.boss?(b.sub||''):worldName(G.L);if(sub){let sf=15;c.font='700 '+sf+'px "Trebuchet MS"';const sw=c.measureText(sub).width;if(sw>viewW*0.92){sf=Math.max(10,Math.floor(sf*viewW*0.92/sw));c.font='700 '+sf+'px "Trebuchet MS"'}c.lineWidth=4;c.fillStyle='#fff';c.strokeText(sub,viewW/2,y+26);c.fillText(sub,viewW/2,y+26)}c.globalAlpha=1}
 // boss bar
 if(G.boss&&!G.boss.dead){const b=G.boss,w=Math.min(420,viewW-40),x=(viewW-w)/2,y=VV-34;c.fillStyle='#000a';D.rr(c,x-4,y-18,w+8,32,8);c.fill();c.fillStyle='#400';c.fillRect(x,y,w,10);const g=c.createLinearGradient(x,0,x+w,0);g.addColorStop(0,'#ff2a2a');g.addColorStop(1,'#ffcc33');c.fillStyle=g;c.fillRect(x,y,w*Math.max(0,b.hp/b.max),10);c.font='800 12px "Trebuchet MS"';c.textAlign='center';c.fillStyle='#fff';c.fillText(b.name.toUpperCase(),viewW/2,y-4);if(b.vm&&G.vm){const th=b.max*(G.vm.v.stagger||0.09),f=b.stun>0?1:clamp((b.sg||0)/th,0,1);c.fillStyle='#0009';c.fillRect(x,y+11,w,4);c.fillStyle=b.stun>0?(Math.floor(G.t*8)%2?'#fff':'#ffe94b'):'#ffe94b';c.fillRect(x,y+11,w*f,4);if(f>0.6||b.stun>0){c.font='800 9px "Trebuchet MS"';c.textAlign='right';c.fillStyle='#ffe94b';c.fillText(b.stun>0?'STUNNED!':'STUN',x+w,y-4)}}}
 if(G.mode==='bike'){const f=clamp(p.x/G.L.goal.x,0,1),w=Math.min(300,viewW-160),x=(viewW-w)/2,y=VV-18;c.fillStyle='#0008';c.fillRect(x,y,w,6);c.fillStyle='#7ff7ff';c.fillRect(x,y,w*f,6);c.fillStyle='#fff';c.beginPath();c.arc(x+w*f,y+3,5,0,TAU);c.fill()}}
function drawTopBand(){const h=gameTop,w=W;const s=Math.min(clamp(h/62,0.7,1.25),(w-136)/(G.p.maxHp*22+190));c.save();c.translate(8,Math.max(4,h-60*s-6));c.scale(s,s);drawTopBandAt(0,0,(w-130)/s);c.restore()}
function drawTopBandAt(x,y,maxW){if(G.vm)return drawTopBandVM(x,y,maxW);const p=G.p,ch=charOf(PC);c.save();c.translate(x,y);
 for(let i=0;i<p.maxHp;i++){c.save();c.translate(12+i*22,14);D.heart(c,0,0,8,i<p.hp?'#ff2a5a':'#ffffff33');c.restore()}
 c.font='800 14px "Trebuchet MS"';c.textAlign='left';c.lineWidth=3;c.strokeStyle='#000';const st=(s,xx,yy,col='#fff')=>{c.strokeText(s,xx,yy);c.fillStyle=col;c.fillText(s,xx,yy)};
 st('x'+run.lives,p.maxHp*22+8,19,'#5ad84a');st(String(run.score).padStart(7,'0'),4,44,'#ffe94b');st('● '+run.coins,90,44,'#ffcc33');
 // ammo box (tap to switch)
 const bx=Math.max(p.maxHp*22+36,Math.min(maxW-150,240)),by=0;HUDR.ammo={x:x+bx,y:y+by,w:150,h:50};c.fillStyle='#0008';D.rr(c,bx,by,150,50,10);c.fill();c.strokeStyle='#ff4fd8aa';c.lineWidth=2;c.stroke();
 if(ch.weapon==='toppings'){c.save();c.translate(bx+22,by+24);D.pickup(c,run.sel,0);c.restore();st((run.ammo[run.sel]||0)+'',bx+40,by+22,'#fff');c.font='700 10px "Trebuchet MS"';st(run.sel.toUpperCase(),bx+40,by+38,'#ffe94b');
  TOPS.forEach((k,i)=>{c.globalAlpha=run.ammo[k]>0?1:0.3;c.save();c.translate(bx+100+(i%3)*16,by+14+Math.floor(i/3)*20);c.scale(0.45,0.45);D.pickup(c,k,0);c.restore();c.globalAlpha=1})}
 else{st('POWER '+run.power,bx+12,by+22,'#7ff7ff');c.font='700 10px "Trebuchet MS"';st(({star:'STAR SPRINKLES',care:'CARE BEAR STARE',sword:'SWORD (free) + BEAM',bullet:'RIFLE',bolt:'BOWCASTER',rock:'SLING STONES'})[ch.weapon]||'',bx+12,by+38,'#ffe94b')}
 c.restore()}
/* ---------------- update loop ---------------- */
function updateCam(dt){const p=G.p;const look=G.mode==='bike'?viewW*0.28:viewW*(p.face>0?(portrait?0.38:0.33):(portrait?0.62:0.55));let tx=p.x+p.w/2-look;if(G.mode==='bike')tx=p.x-viewW*0.25;
 if(G.arena&&G.boss&&!G.boss.dead&&b0vis(G.boss)&&viewW<(G.arena.x1-G.arena.x0)){const px=p.x+p.w/2,bx=G.boss.x,reserve=portrait?0:viewW*0.2;tx=portrait?clamp(Math.min((px+bx)/2-viewW/2,px-viewW*0.25),px-viewW+70,px-70):clamp((px+bx)/2-(viewW-reserve)/2,px-viewW+reserve+70,px-70)}
 G.cam.x=lerp(G.cam.x,tx,Math.min(1,dt*(G.mode==='bike'?20:6)));if(G.arena){G.cam.x=clamp(G.cam.x,G.arena.x0,Math.max(G.arena.x0,G.arena.x1-viewW))}
 G.cam.x=clamp(G.cam.x,0,Math.max(0,G.L.width-viewW));G.cam.minX=G.cam.x;
 const ty=clamp(p.y+p.h/2-VV*0.55,0,VH-VV);G.cam.y=VV>=VH?0:lerp(G.cam.y,ty,Math.min(1,dt*4))}
function update(dt){G.t+=dt;const p=G.p;if(G.vm){vCapture();if(p.iceT>0)p.iceT-=dt}if(G.banner)G.banner.t-=dt;if(G.flash>0)G.flash-=dt*1.5;if(G.shake>0)G.shake=Math.max(0,G.shake-dt*40);if(G.comboT>0){G.comboT-=dt;if(G.comboT<=0)G.combo=0}
 if(p.inv>0)p.inv-=dt;if(p.star>0)p.star-=dt;if(p.throwT>0)p.throwT-=dt;if(p.cool>0)p.cool-=dt;
 if(p.dead){G.deadT-=dt;if(G.deadT<=0)respawn()}
 if(G.mode==='bike'){stepBike(dt)}
 else if(!p.dead&&!G.clear&&G.vm){vHero(dt)}
 else if(!p.dead&&!G.clear){if(!p.capT)stepPlayer(dt);stepBuddy(dt);if(inp.throwPressed||(inp.throw&&charOf(PC).weapon!=='toppings'&&p.cool<=0)||(inp.throw&&p.cool<=0))doThrow()}
 else if(G.clear){p.vx*=0.9;p.x+=60*dt}
 stepWorld(dt);
 if(G.mode!=='bike')stepEnemies(dt);
 if(G.gaunt){const g=G.gaunt[G.gi];if(g&&!G.boss&&p.x>g.x0+40)spawnBoss(g)}else if(G.bossType&&!G.boss&&p.x>(G.L.arena?G.L.arena.x0:(G.L.bossX||G.L.width-900)-viewW*0.45))spawnBoss();
 if(G.dim>0)G.dim=Math.max(0,G.dim-dt*1.2);{const under=!portrait&&!G.vm&&G.boss&&!G.boss.dead&&(G.boss.x-G.cam.x)>viewW-300;if(under!==G.padDim){G.padDim=under;$('pad').classList.toggle('dimmed',!!under)}}
 if(G.boss&&G.boss.vm)stepVillain(dt);else stepBoss(dt);stepMarks(dt);stepShots(dt);if(G.vm)vStep(dt);
 for(const q of G.parts){q.l-=dt;q.vx*=0.98;q.vy+=q.g*dt;q.x+=q.vx*dt;q.y+=q.vy*dt}G.parts=G.parts.filter(q=>q.l>0);if(G.parts.length>700)G.parts.splice(0,G.parts.length-700);
 for(const t of G.texts){t.l-=dt;t.y-=40*dt}G.texts=G.texts.filter(t=>t.l>0);
 if(window.TacoFX){TacoFX.step(dt);TacoFX.updateAmbient(dt,G.cam.x,G.cam.y,viewW,VV)}
 if(window.TacoPhysics&&TacoPhysics.fx){const f=TacoPhysics.fx.update(dt);if(f.x||f.y)G.shake=Math.max(G.shake,Math.hypot(f.x,f.y))}
 if(G.vm)vmCam(dt);else updateCam(dt)}
let last=0;
function frame(ts){const dt=Math.min(0.05,last?(ts-last)/1000:0);last=ts;tGlobal+=dt;try{pollPad(dt)}catch(e){}
 try{if(state==='play'&&G){if(G.fl){readInput();G.fl.update(dt,{L:K.L,R:K.R,U:K.U,D:K.D,fire:!!K.T});G.fl.draw();if(G.flDeadT>0){G.flDeadT-=dt;if(G.flDeadT<=0){if(run.lives<=0)gameOver();else playCurrent()}}}
   else{readInput();if(inp.cycle){}if(G.hs>0)G.hs-=dt;else update(dt)}}
  else if(G&&G.fl&&state==='pause'){/* frozen */}
  if(!(G&&G.fl))render(dt)}catch(e){console.error(e);window.__taco.err=String(e&&e.stack||e)}
 requestAnimationFrame(frame)}
/* tap the ammo box to switch topping; Q key too */
function cycleTop(){if(!run||!G||G.vm||charOf(PC).weapon!=='toppings')return;const have=TOPS.filter(t=>run.ammo[t]>0);if(!have.length)return;const i=have.indexOf(run.sel);run.sel=have[(i+1)%have.length];AU.fx('coin')}
addEventListener('keydown',e=>{if(e.code==='KeyQ')cycleTop()});
cv.addEventListener('touchstart',e=>{if(state!=='play'||!G||G.fl||!HUDR.ammo)return;for(const t of e.changedTouches){const r=HUDR.ammo;let x=t.clientX,y=t.clientY;if(portrait){const s=Math.min(clamp(gameTop/62,0.7,1.25),(W-136)/(G.p.maxHp*22+190));x=(x-8)/s;y=(y-Math.max(4,gameTop-60*s-6))/s}else{x=x/S-10;y=(y-gameTop)/S-10}if(x>=r.x-0&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h+10){cycleTop();TOUCH.delete(t.identifier)}}},{passive:true});
$('bPause').addEventListener('click',e=>{e.preventDefault();if(state==='play')pauseGame();else if(state==='pause')resumeGame()});
$('bMute').addEventListener('click',e=>{e.preventDefault();AU.unlock();AU.mute(!AU.muted)});$('bMute').textContent=AU.muted?'🔇':'🔊';
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='play')pauseGame()});
/* ================= VILLAIN MODE (v5): you play the level's villain, an AI hero runs the level forward ================= */
const VR=()=>(window.TacoVillains&&TacoVillains.list)||[];
const VBY=id=>VR().find(v=>v.id===id);
const VIN={L:0,R:0,U:0,D:0,jump:0,jumpPressed:0,throw:0,throwPressed:0,spec:0,specPressed:0};let vPrevJ=0,vPrevT=0,vPrevS=0,vPrevD=0;
const VSEL={page:'hero'};
function heroName(k){return(CHARS[k]&&CHARS[k].name||k).replace(/ \(.*\)/,'')}
function newVillainRun(v){run={ch:v.hero,list:[v.level],idx:0,lives:3,hp:3,score:0,coins:0,ammo:{lettuce:40,tomato:10,cheese:12,jalapeno:4,salsa:4},sel:'lettuce',power:60,vm:v.id};CH=v.hero}
function vCapture(){const s=!!(K.S||VIRT.spec||GPK.S),d=!!inp.D;
 VIN.L=inp.L;VIN.R=inp.R;VIN.U=inp.U;VIN.D=inp.D;VIN.jump=inp.jump;VIN.jumpPressed=inp.jumpPressed;VIN.throw=inp.throw;VIN.throwPressed=inp.throwPressed;VIN.spec=s;VIN.specPressed=((s&&!vPrevS)||(d&&!vPrevD))?1:0;vPrevS=s;vPrevD=d}
/* --- level setup --- */
function setupVillain(v){const L=G.L,p=G.p;document.body.classList.add('vm');$('bThrow').textContent='ATTACK';
 G.bossType=null;G.gaunt=null;G.allBossDone=true;
 /* the showdown is the level's last ~3800 px; chasms wider than a jump get a ground bridge so the AI hero (and you) can cross */
 const gs=L.ground.slice().sort((a,b)=>a[0]-b[0]);let sx=Math.max(L.start.x,L.goal.x-(v.section||3800));
 for(let i=0;i<gs.length-1;i++){const a=gs[i][1],b2=gs[i+1][0],gap=b2-a;if(gap>100&&b2>sx-200&&a<L.goal.x){const y=Math.max(gs[i][2],gs[i+1][2]);G.solids.push({x:a,y,w:gap,h:600-y+80,type:'ground',bridge:1});G.hazards=G.hazards.filter(h=>!(h.x>=a&&h.x+h.w<=b2&&h.type!=='sarlacc'))}}
 for(const h of G.hazards)if(h.type==='sarlacc'&&h.x<sx+120&&h.x+h.w>sx-60)sx=h.x+h.w+80;
 p.maxHp=3;p.hp=3;run.hp=3;run.lives=Math.max(1,(v.heroLives||3)-0);p.x=safeX(sx,p.w);p.y=findGround(p.x+p.w/2)-p.h-4;p.vx=p.vy=0;G.respawn={x:p.x,y:p.y};
 {let k=0;G.enemies=G.enemies.filter(e=>e.x>sx+200&&!(ET[e.type]&&ET[e.type].nostomp&&!ET[e.type].fly)&&(k++%2===0))}for(const k of G.checkpoints)if(k.x<=sx+20)k.on=true;
 G.allies=G.allies.filter(a=>a.x>sx-50&&a.trigger!=='boss_phase'&&a.action!=='assist').map(a=>Object.assign(a,{fights:false,action:'',follow:false}));
 if(G.buddy)buddyWarp(G.buddy,p);
 const gx=L.goal.x;const hz=x=>G.hazards.some(h=>h.x-260<x&&h.x+h.w+260>x)||!hasGround(x-60)||!hasGround(x+60);let gpos=gx-(v.guard||1000);for(let d=0;d<500;d+=20){if(!hz(gx-(v.guard||1000)-d)){gpos=gx-(v.guard||1000)-d;break}if(!hz(gx-(v.guard||1000)+d)&&d<300){gpos=gx-(v.guard||1000)+d;break}}let bx=safeX(gpos,60)+30;const gy=findGround(bx);
 const losses=+(save['vmL:'+v.id]||0);
 G.boss={vm:1,type:v.draw||v.id,art0:v.art,name:v.name,dh:v.dh||v.h*1.25,x:bx,y:gy,gy,w:v.w,h:v.h,hp:v.hp,max:v.hp,dir:-1,vx:0,vy:0,t:0,phase:1,flash:0,state:'idle',st:0,dead:false,intro:0,ifr:0,onG:true,atkCd:0,spCd:2,psT:(v.passive&&v.passive.every||0)*0.6,safe:{x:bx,y:gy},alpha:1};
 G.bossOn=true;
 const dist=gx-sx;G.vm={v,T:clamp(Math.round(dist/330+26),36,80),t:0,goalX:gx,startX:sx,over:false,dmgMul:v.dmgMul||0.55,q:[],meet:false,
  ai:{fire:(v.aiFire||0.85)*(losses>=2?1.3:1),dodge:(v.aiDodge||0.4)-(losses>=2?0.15:0),pass:0.35,t:0,cool:0.5,hold:0,retreat:0,react:0,lastX:p.x,stuckT:0,wait:1.6,passT:0,decided:0,seen:new WeakSet()},tired:losses>=2};
 G.cam.x=clamp(bx-viewW*0.62,0,Math.max(0,L.width-viewW));
 G.banner={s:'STOP '+heroName(v.hero).toUpperCase()+'!',t:2.8,boss:1,sub:v.name};vSay(G.boss,v.taunt[0],2.6);
 if(G.vm.tired)setTimeout(()=>{if(G&&G.vm&&G.vm.v===v)text(G.boss.x,G.boss.y-G.boss.dh-30,'THE HERO LOOKS TIRED...','#ffcc66',1)},2800)}
function vSay(b,s,t){b.say=s;b.sayT=t||2.2}
/* --- hero AI: runs the level forward, jumps gaps/walls/hazards, shoots, dodges, stomps, grabs pickups --- */
function heroAI(dt){const p=G.p,ai=G.vm.ai,b=G.boss,o={L:0,R:0,U:0,D:0,jump:0,jumpPressed:0,throw:0,throwPressed:0,ax:0,steer:{x:0,y:0},touching:false};
 if(ai.wait>0){ai.wait-=dt;return o}if(ai.stun>0){ai.stun-=dt;return o}
 ai.t+=dt;ai.cool-=dt;if(ai.hold>0)ai.hold-=dt;if(ai.retreat>0)ai.retreat-=dt;
 const cx=p.x+p.w/2,feet=p.y+p.h,alive=b&&!b.dead,bd=alive?b.x-cx:1e9;let dir=1;
 /* v6 friendlier: for the first ~22 s the hero is cautious - no sneaky passes, flinches when hit, backs off when it gets close; only a STUN opens the way early */
 const early=alive&&!b.stun&&G.vm.t<(G.vm.early||20);if(ai.lastHp===undefined)ai.lastHp=p.hp;if(p.hp<ai.lastHp){ai.stun=early?0.7:0.3;ai.lastHp=p.hp;return o}ai.lastHp=p.hp;
 if(!early&&alive&&!ai.brave&&G.vm.t>=(G.vm.early||20)){ai.brave=1;text(cx,p.y-50,'THE HERO IS GETTING BRAVE!','#7ff7ff',1)}
 if(early){ai.passT=0;ai.probe=0;if(bd>-b.w/2&&bd<b.w/2+40)ai.retreat=Math.max(ai.retreat,0.35)}
 let hold=0;if(alive&&!b.stun&&bd>-10&&bd<700&&ai.passT<=0){const near=b.w/2+(ai.near||100),far=b.w/2+(ai.far||250);if(bd<near)ai.retreat=Math.max(ai.retreat,0.25);else if(bd<far&&ai.retreat<=0&&!G.hazards.some(h=>h.x-50<cx&&h.x+h.w+50>cx))hold=1;if(bd<far){ai.probe=(ai.probe||0)+dt;if(ai.probe>(ai.brave?2+Math.random()*2:5.5+Math.random()*3)){ai.probe=0;ai.passT=ai.brave?1.2:0.9;ai.pr='probe'}}}
 if(alive&&p.inv>0.5&&bd>-40&&bd<b.w/2+220&&!ai.decided){ai.decided=1;ai.passT=!early&&Math.random()<ai.pass?1.4:0;if(ai.passT)ai.pr='hit'}
 if(p.inv<=0)ai.decided=0;if(ai.passT>0){ai.passT-=dt;ai.retreat=0}
 if(alive&&b.stun>0){ai.retreat=0;ai.passT=Math.max(ai.passT,0.6)}if(ai.retreat>0)dir=-1;o.face=alive&&bd>0?1:0;
 const jump=(h)=>{if(p.onGround&&ai.hold<=0){o.jumpPressed=1;ai.hold=h||0.4}};
 if(p.onGround){
  const look=[26,52,80];const gap=look.some(d=>!supportAt(cx+dir*(p.w/2+d),feet));
  const haz=G.hazards.some(h=>{if(!(h.type==='sarlacc'||h.type==='spikes'||h.type==='lava'||h.type==='acid'||h.type==='laser'&&h.on))return false;const pad=h.type==='sarlacc'?90:40;const x0=h.x-pad,x1=h.x+h.w+pad;return dir>0?(x0-cx<70&&x1>cx):(cx-x1<70&&x0<cx)});
  const rb=(G.L.boosts||[]).some(bo=>(bo.dir||1)!==dir&&Math.abs(bo.y-feet)<10&&(dir>0?(bo.x-cx<64&&bo.x+bo.w>cx):(cx-bo.x-bo.w<64&&bo.x<cx)));
  const wall=wallAhead(cx,feet,dir)||rb;
  let en=null;for(const e of G.enemies){if(e.dead)continue;const dx=(e.x-cx)*dir;if(dx>0&&dx<90&&Math.abs(e.y-feet)<70&&!e.fly){en=e;break}}
  const pk=G.pickups.find(q=>!q.got&&(q.x-cx)*dir>10&&(q.x-cx)*dir<70&&q.y<feet-50&&q.y>feet-170);
  if(gap||haz||wall)jump(0.45);else if(en&&!en.nostomp&&Math.random()<0.7)jump(0.3);else if(pk)jump(0.35);
  if(alive&&!early&&dir>0&&bd>0&&bd<b.w/2+70&&ai.retreat<=0&&Math.random()<dt*1.6)jump(0.45);if(alive&&!b.stun&&ai.passT>0&&bd>0&&bd<b.w/2+95)jump(0.5)}
 // dodge incoming villain shots
 for(const s of G.eshots){if(ai.seen.has(s))continue;const dx=s.x-cx;if(Math.abs(dx)<190&&Math.sign(s.vx||0)===-Math.sign(dx)&&Math.abs(s.y-(p.y+p.h/2))<70){ai.seen.add(s);if(Math.random()<ai.dodge)jump(0.4)}}
 // shoot at the villain / minions ahead
 let tgt=null;if(alive&&bd>0&&bd<560&&Math.abs(b.y-feet)<220)tgt=b;else for(const e of G.enemies){if(e.dead)continue;const dx=(e.x-cx)*dir;if(dx>0&&dx<360&&Math.abs(e.y-e.h/2-(p.y+p.h/2))<90){tgt=e;break}}
 if(tgt&&ai.cool<=0){o.throwPressed=1;o.throw=1;ai.cool=ai.fire*(0.8+Math.random()*0.5)}
 // stuck: no progress for 2 s
 if(Math.abs(cx-ai.lastX)>30){ai.lastX=cx;ai.stuckT=0}else{ai.stuckT+=dt;if(ai.stuckT>2){ai.stuckT=0;if(p.onGround){o.jumpPressed=1;ai.hold=0.45}if(Math.random()<0.3)ai.retreat=0.4}}
 if(early&&bd<0&&dir>0&&(ai.t*3)%1>0.45){o.R=0;o.L=0;o.ax=0}else if(hold&&ai.passT<=0){o.R=0;o.L=0;o.ax=0}else{o.R=dir>0?1:0;o.L=dir<0?1:0;o.ax=dir}o.jump=ai.hold>0||o.jumpPressed?1:0;if(dir!==p.face&&!o.L&&!o.R){}
 return o}
function vHero(dt){const o=heroAI(dt);const save0=Object.assign({},inp,{steer:Object.assign({},inp.steer)});Object.assign(inp,o);
 const p=G.p;if(!p.capT)stepPlayer(dt);stepBuddy(dt);if(inp.throwPressed||(inp.throw&&p.cool<=0)){const f0=p.face;if(o.face)p.face=o.face;doThrow();if(o.L||o.R)p.face=f0}
 Object.assign(inp,save0)}
/* --- the villain (you) --- */
function vBody(b){const tw=Math.min(b.w,70);return{x:b.x-tw/2,w:tw}}
function vTerrain(b,dt){const pb=b.y;b.x+=b.vx*dt;b.x=clamp(b.x,40,G.L.width-40);{const tw=Math.min(b.w,70);for(const s of G.solids){if(s.type==='ladder'||s.fallen||s.h<60)continue;if(b.y>s.y+12&&b.y-b.h<s.y+s.h&&b.x+tw/2>s.x&&b.x-tw/2<s.x+s.w){if(b.x<s.x+s.w/2)b.x=s.x-tw/2-0.5;else b.x=s.x+s.w+tw/2+0.5;b.vx=0}}}b.y+=b.vy*dt;b.onG=false;b.ride=null;const r=vBody(b);
 if(b.vy>=0){let best=null;for(const s of G.solids.concat(G.plats)){if(s.type==='ladder'||s.fallen)continue;if(r.x+r.w>s.x+2&&r.x<s.x+s.w-2&&pb<=s.y+8&&b.y>=s.y){if(!best||s.y<best.y)best=s}}
  if(best){b.y=best.y;b.vy=0;b.onG=true;b.ride=best;if(best.dxm)b.x+=best.dxm;if(best.type==='crumble'&&!best.trig)best.trig=0.8}}
 if(b.onG){b.coy=0.1;b.gy=b.y;if(b.ride&&b.ride.type==='ground'&&hasGround(b.x-24)&&hasGround(b.x+24))b.safe={x:b.x,y:b.y}}else b.coy=(b.coy||0)-dt}
function vShotFrom(b){return{x:b.x+b.dir*b.w*0.42,y:b.y-b.h*0.62}}
function vAim(b,a){const p=G.p,o=vShotFrom(b);const tx=p.x+p.w/2,ty=p.y+p.h/2;let ang=Math.atan2(ty-o.y,tx-o.x);if(Math.abs(tx-b.x)>900||Math.sign(tx-b.x)!==b.dir)ang=b.dir>0?0:Math.PI;return{o,ang}}
function vShoot(x,y,vx,vy,kind,extra){eshot(x,y,vx,vy,kind);const s=G.eshots[G.eshots.length-1];s.vm=1;if(extra)Object.assign(s,extra);return s}
function vAttack(a,spec,depth){const b=G.boss,p=G.p,v=G.vm.v;if(!a)return;depth=depth||0;b.atkT=Math.max(b.atkT||0,0.35);
 if(spec&&!depth){text(b.x,b.y-b.dh-(b.sayT>0?76:22),a.name.toUpperCase()+'!',v.color||'#ffe94b',1);if(Math.random()<0.5)vSay(b,v.taunt[1+Math.floor(Math.random()*(v.taunt.length-1))]||v.taunt[0])}
 const A=a.kind;
 if(A==='aim'){const {o,ang}=vAim(b,a);const n=a.n||1;for(let i=0;i<n;i++){const aa=ang+(i-(n-1)/2)*(a.spread||0.2);vShoot(o.x,o.y,Math.cos(aa)*(a.spd||400),Math.sin(aa)*(a.spd||400),a.shot||'bolt')}AU.fx('laser')}
 else if(A==='fwd'){const o=vShotFrom(b);const n=a.n||1;b.altI=(b.altI||0)+1;for(let i=0;i<n;i++){const aa=(i-(n-1)/2)*(a.spread||0);const y=a.alt?b.y-a.alt[b.altI%a.alt.length]:o.y;const s=vShoot(o.x,y,b.dir*(a.spd||500)*Math.cos(aa),(a.spd||500)*Math.sin(aa),a.shot||'bolt');if(a.boomer){s.ax=-b.dir*(a.spd||560)*0.75;s.l=1.9;s.spin=1}}AU.fx(a.shot==='fire'?'explode':a.shot==='shuriken'?'throw':'laser')}
 else if(A==='lob'){const o=vShotFrom(b);const tx=Math.abs(p.x-b.x)<800?p.x+p.w/2:b.x+b.dir*360;const T=0.85,dx=tx-o.x,dy=(p.y+p.h-10)-o.y;vShoot(o.x,o.y,dx/T,(dy-0.5*900*T*T)/T,'bomb');AU.fx('throw')}
 else if(A==='melee'){b.mel={t:0.2,reach:a.reach||90,hit:0};b.lock=0.2;burst(b.x+b.dir*(a.reach||90)*0.7,b.y-b.h*0.55,10,[v.color||'#fff','#fff'],220,0.25,3);AU.fx('throw');if(a.proj){const o=vShotFrom(b);const s=vShoot(o.x,b.y-b.h*0.5,b.dir*(a.pspd||420),0,a.proj);s.l=0.75}}
 else if(A==='charge'){b.state='charge';b.st=a.dur||1;b.cdir=b.dir;b.cspd=a.spd||640;AU.fx('roll');shake(4)}
 else if(A==='pounce'){const tx=Math.abs(p.x-b.x)<700?p.x+p.w/2:b.x+b.dir*420;const T=0.62;b.vy=-(0.5*TUNE.gravity*T);b.vx=(tx-b.x)/T;b.state='pounce';b.st=1.2;b.onG=false;AU.fx('jump')}
 else if(A==='slam'){b.vy=-Math.max(820,v.jumpV||880);b.onG=false;b.state='slam';b.st=1.5;b.wave=a.wave||'shock';AU.fx('jump')}
 else if(A==='summon'){const alive=G.enemies.filter(e=>!e.dead&&Math.abs(e.x-b.x)<900).length;let k=0;for(const t of a.types||[v.minion]){if(alive+k>=5)break;const x=clamp(b.x+b.dir*(90+k*70),40,G.L.width-40);const fly=ET[t]&&ET[t].fly;spawnEnemy({type:t,x,y:fly?findGround(x)-160:findGround(x),range:220});const e=G.enemies[G.enemies.length-1];e.awake=true;e.dir=b.dir;e.ally=1;burst(x,findGround(x)-30,18,['#d38cff','#fff'],220,0.5,4);k++}AU.fx('roar')}
 else if(A==='rain'){const cx=Math.abs(p.x-b.x)<1100?p.x+p.w/2:b.x+b.dir*300;const n=a.n||6;for(let i=0;i<n;i++){const x=cx+rand(-(a.spread||200),a.spread||200);G.vm.q.push({t:0.25+i*0.12,fn:()=>{const s=vShoot(x,findGround(x)-460,0,260,a.shot||'bomb');}});mark({x,y:findGround(x),w:46,t:0.6,kind:'shadow'})}AU.fx('laser')}
 else if(A==='tele'){const near=Math.abs(p.x-b.x)<1500&&!p.dead;const tx=near?clamp(p.x+p.w/2+(G.vm.side>0?-150:150),60,G.L.width-60):b.x+b.dir*400;
  for(let i=0;i<14;i++)G.parts.push({x:b.x+rand(-30,30),y:b.y-rand(0,b.dh),vx:rand(-40,40),vy:-rand(20,70),l:0.7,m:0.7,s:9,c:'#6a4a8a',smoke:1,g:-30});
  b.ghost=1;b.alpha=0.2;b.state='tele';b.st=0.35;b.tx=safeX(tx,40)+20;b.then=a.then;AU.fx('star')}
 else if(A==='snare'){if(Math.abs(p.x-b.x)<1100&&!p.dead){mark({x:p.x+p.w/2,y:findGround(p.x+p.w/2),w:90,t:0.75,kind:'pool',then:'hands'});AU.fx('star')}}
 else if(A==='freeze'){const {o,ang}=vAim(b,a);vShoot(o.x,o.y,Math.cos(ang)*(a.spd||560),Math.sin(ang)*(a.spd||560),'ice',{freeze:1.1,r:16});AU.fx('laser');burst(o.x,o.y,14,['#ffffff','#9ae8ff'],220,0.4,3)}
 else if(A==='grip'){if(Math.abs(p.x-b.x)<620&&Math.abs(p.y-b.y)<300&&!p.dead&&p.inv<=0&&!p.star){p.holdT=1.0;p.holdX=p.x;p.vy=-80;b.grip=1.0;text(p.x+p.w/2,p.y-30,'CAN\u2019T... MOVE!','#ff6a6a');G.vm.q.push({t:0.9,fn:()=>{if(G&&G.p&&!G.p.dead){hurtPlayer({x:G.boss?G.boss.x:G.p.x});shake(10)}}})}else text(b.x,b.y-b.dh-4,'TOO FAR!','#ffcc66')}
 else if(A==='wave'){shockwave(b.x,b.gy||b.y,b.dir,a.dist||700,a.spd||300,a.shot||'shock');G.eshots[G.eshots.length-1].vm=1;AU.fx('sarlacc')}
 else if(A==='multi'){(a.seq||[]).forEach((s2,i)=>{if(i===0)vAttack(s2,spec,depth+1);else G.vm.q.push({t:i*(a.gap||0.35),fn:()=>{if(G&&G.boss&&!G.boss.dead)vAttack(s2,spec,depth+1)}})})}}
function stepVillain(dt){const b=G.boss,v=G.vm.v,p=G.p,I=VIN;b.t+=dt;if(b.flash>0)b.flash-=dt;if(b.ifr>0)b.ifr-=dt;if(b.hurtT>0)b.hurtT-=dt;if(b.sayT>0)b.sayT-=dt;if(b.atkT>0)b.atkT-=dt;if(b.lock>0)b.lock-=dt;if(b.grip>0)b.grip-=dt;
 if(b.dead){b.dt=(b.dt||0)+dt;return}
 if(G.vm.over){b.vx*=0.9;b.vy+=TUNE.gravity*dt;vTerrain(b,dt);return}
 if(b.stun>0&&!p.dead)G.vm.side=p.x+p.w/2<b.x?-1:1;if(b.sgImm>0)b.sgImm-=dt;if(b.sg>0)b.sg=Math.max(0,b.sg-b.max*0.008*dt);if(b.stun>0){b.stun-=dt;b.vx*=Math.pow(0.02,dt);b.flash=Math.sin(b.t*30)>0?0.05:0;if(Math.random()<dt*10)G.parts.push({x:b.x+rand(-20,20),y:b.y-b.dh*0.95,vx:rand(-30,30),vy:-40,l:0.5,m:0.5,s:4,c:'#ffe94b',add:true,g:0});b.vy=Math.min(b.vy+TUNE.gravity*dt,1100);vTerrain(b,dt);if(b.stun<=0){b.sgImm=2.2;if(G.vm.ai&&G.vm.t<(G.vm.early||20))G.vm.ai.passT=0;b.ghost=0;b.alpha=1}return}
 b.atkCd-=dt;b.spCd-=dt;b.quiet=(I.L||I.R||I.jump||I.jumpPressed||I.throw||I.throwPressed||I.spec||I.specPressed)?0:(b.quiet||0)+dt;
 const ax=(I.R?1:0)-(I.L?1:0),sp=v.speed||300;
 if(b.state==='charge'){b.st-=dt;b.vx=b.cdir*b.cspd;if(!p.dead&&b.cdir*(b.x-(p.x+p.w/2))>50){b.st=0;b.vx*=0.2;dust(b.x,b.y,10);b.dir=-b.cdir;b.atkCd=Math.min(b.atkCd,0.05)}b.dir=b.cdir;b.atkT=0.3;if(Math.random()<dt*30)dust(b.x-b.cdir*30,b.y,2);if(b.st<=0){b.state='idle';b.vx*=0.3}}
 else if(b.state==='pounce'){b.st-=dt;b.atkT=0.3;if(b.onG&&b.st<1.05||b.st<=0){b.state='idle';b.vx=0;shake(8);ring(b.x,b.y,v.color||'#fff',70);dust(b.x,b.y,14);AU.fx('stomp');if(Math.abs(p.x+p.w/2-b.x)<b.w/2+50&&Math.abs(p.y+p.h-b.y)<60)hurtPlayer({x:b.x})}}
 else if(b.state==='slam'){b.st-=dt;b.atkT=0.3;b.vx*=0.95;if(b.onG&&b.st<1.3||b.st<=0){b.state='idle';shake(16);AU.fx('stomp');ring(b.x,b.y,v.color||'#ffcc66',100);dust(b.x,b.y,22);shockwave(b.x,b.y,1,340,420,b.wave);G.eshots[G.eshots.length-1].vm=1;shockwave(b.x,b.y,-1,340,420,b.wave);G.eshots[G.eshots.length-1].vm=1}}
 else if(b.state==='tele'){b.st-=dt;b.vx=0;if(b.st<=0){b.x=b.tx;b.y=findGround(b.x);b.vy=0;b.ghost=0;b.alpha=1;b.state='idle';b.dir=p.x+p.w/2>b.x?1:-1;burst(b.x,b.y-60,24,['#b06aff','#ffffff',v.color||'#fff'],260,0.5,4);b.ifr=0.3;if(b.then)vAttack(b.then,true,1)}}
 else{const hc=p.x+p.w/2;if(!p.dead){if(!G.vm.chase&&hc>b.x+60){G.vm.chase=1;(G.vm.slips=G.vm.slips||[]).push({t:Math.round(G.vm.t),why:b.stun>0?'stun':G.vm.ai.passT>0?G.vm.ai.pr:b.ghost?'ghost':'other',st:b.state,bg:b.onG?1:0,pg:p.onGround?1:0,bvx:Math.round(b.vx),bvy:Math.round(b.vy),pvx:Math.round(p.vx),py:Math.round(p.y+p.h-b.y),hit:p.inv>0?1:0});text(b.x,b.y-b.dh-30,'THEY SLIPPED PAST! AFTER THEM!','#ff6a4a',1)}else if(G.vm.chase&&hc<b.x-70)G.vm.chase=0}const ahead=G.vm.chase&&!p.dead;const csp=ahead&&ax>0?Math.max(sp*1.8,700):sp;if(ahead&&ax>0&&b.onG&&Math.random()<dt*25)dust(b.x-30,b.y,2);const want=ax*csp*(b.lock>0?0.2:1);b.vx+=(want-b.vx)*Math.min(1,dt*(b.onG?12:5));if(ax)b.dir=ax;
  if(I.jumpPressed&&(b.onG||b.coy>0)){b.vy=-(v.jumpV||880);b.onG=false;b.coy=0;b.jumping=true;AU.fx('jump');dust(b.x,b.y,8)}
  if(b.jumping&&!I.jump&&b.vy<0){b.vy*=0.5;b.jumping=false}if(b.vy>=0)b.jumping=false;
  if(I.throwPressed||(I.throw&&b.atkCd<=-0.05)){if(b.atkCd<=0){vAttack(v.atk,false);b.atkCd=v.atk.cd||0.5}}
  if(I.specPressed){if(b.spCd<=0){vAttack(v.spec,true);b.spCd=v.spec.cd||6}else{if(!b.noSpT||G.t-b.noSpT>0.8){b.noSpT=G.t;text(b.x,b.y-b.dh-4,'SPECIAL RECHARGING…','#cccccc')}}}}
 const fl=v.float&&I.jump&&b.vy>0&&b.state==='idle';b.vy=Math.min(b.vy+TUNE.gravity*(fl?0.22:1)*dt,fl?200:1100);if(fl&&Math.random()<dt*20)G.parts.push({x:b.x+rand(-20,20),y:b.y,vx:rand(-20,20),vy:rand(30,80),l:0.5,m:0.5,s:5,c:v.color||'#b06aff',add:true,g:0});
 const wasG=b.onG,fv=b.vy;vTerrain(b,dt);if(b.onG&&!wasG&&fv>600){dust(b.x,b.y,10);shake(4)}
 if(b.y>640){const pen=Math.min(Math.round(b.max*0.08),Math.max(0,Math.ceil(b.hp)-1));b.hp-=pen;b.x=b.safe.x;b.y=b.safe.y-4;b.vx=b.vy=0;b.state='idle';b.ifr=1;b.flash=0.4;burst(b.x,b.y-60,30,['#ffffff','#b06aff'],300,0.6,4);text(b.x,b.y-b.dh-14,'CURSES! BACK FROM THE PIT! -'+pen,'#ffcc66',1);AU.fx('hurt')}
 // melee hitbox
 if(b.mel){b.mel.t-=dt;const r={x:b.dir>0?b.x:b.x-b.mel.reach-b.w*0.3,y:b.y-b.h*0.9,w:b.mel.reach+b.w*0.3,h:b.h*0.85};b.hitbox=r;if(!b.mel.hit&&!p.dead&&ov(r,p)&&p.inv<=0){b.mel.hit=1;hurtPlayer({x:b.x})}if(b.mel.t<=0){b.mel=null;b.hitbox=null}}
 // passive
 if(v.passive&&Math.abs(p.x-b.x)<1100){b.psT-=dt;if(b.psT<=0){b.psT=v.passive.every||12;vAttack(v.passive,false,1);text(b.x,b.y-b.dh-8,'REINFORCEMENTS!','#ffcc66')}}
 // body contact with the hero: stomp (hero hurts you) or crush (you hurt the hero)
 const r=bossBox(b),pb={x:p.x,y:p.y,w:p.w,h:p.h};if(!p.dead&&!ov(r,pb))G.vm.side=p.x+p.w/2<b.x?-1:1;if(!p.dead&&!b.ghost&&ov(r,pb)){if(b.state==='charge'){b.st=Math.min(b.st,0.05)}if(p.vy>80&&p.y+p.h-r.y<34){const hop=G.vm.ai&&G.vm.ai.brave&&G.vm.ai.passT>0&&(b.quiet||0)>1.5&&G.vm.side<0;p.vy=hop?-760:-640;p.vx=hop?460:(G.vm.side>0?1:-1)*420;if(hop){G.vm.ai.passT=Math.max(G.vm.ai.passT,0.8);G.vm.ai.pr='hop'}if(p.vx<0)p.x=Math.min(p.x,b.x-p.w/2);if(G.vm.ai)G.vm.ai.stun=0.35;damageVillain(3,p.x+p.w/2,r.y,true);AU.fx('stomp');ring(p.x+p.w/2,r.y,'#fff',60);shake(8)}else if(!(G.vm.ai&&G.vm.ai.brave&&(b.quiet||0)>4)){if(p.inv<=0)hurtPlayer({x:b.x});if(!b.stun&&!(G.vm.side>0&&b.vx>60)){const L=!(G.vm.side>0);if(L){p.x=Math.min(p.x,r.x-p.w);if(p.vx>0)p.vx=-120}else{p.x=Math.max(p.x,r.x+r.w);if(p.vx<0)p.vx=120}}}}
 if(!G.vm.meet&&Math.abs(p.x-b.x)<viewW*0.9){G.vm.meet=true;AU.stop();AU.play('boss')}}
function damageVillain(n,x,y,stomp){const b=G.boss;if(!b||b.dead||b.ghost||G.vm.over)return;if(b.ifr>0&&!stomp)return;n*=G.vm.dmgMul;b.hp-=n;if(!(b.sgImm>0)&&!b.stun){b.sg=(b.sg||0)+n;if(b.sg>=b.max*(G.vm.v.stagger||0.09)*(G.vm.t<(G.vm.early||20)?1.5:1)){b.sg=0;b.stun=1.7;b.state='idle';b.mel=null;b.hitbox=null;text(b.x,b.y-b.dh-26,'STUNNED!','#ffe94b',1);AU.fx('ship_hit');shake(6)}}b.flash=0.12;b.hurtT=0.25;b.ifr=stomp?0.5:0.05;AU.fx('boss_hit');burst(x,y,10,['#ffffff','#ffcc33'],240,0.4,4);
 if(b.hp<=0){b.hp=0;b.dead=true;b.dt=0;AU.fx('boss_die');shake(22);hitstop(0.2);G.flash=0.6;for(let i=0;i<6;i++)setTimeout(()=>{if(G&&G.boss===b)burst(b.x+rand(-b.w/2,b.w/2),b.y-rand(0,b.h),40,['#ffffff','#ffcc33','#ff5a2a','#ff4bd8'],420,0.9,6)},i*160);vSay(b,G.vm.v.lose,3);G.eshots=[];vEnd('hero','defeat')}}
function vStep(dt){const V=G.vm;if(V.over){V.endT-=dt;if(V.endT<=0&&!V.shown){V.shown=1;vEndScreen()}return}
 for(const q of V.q){q.t-=dt;if(q.t<=0&&!q.done){q.done=1;try{q.fn()}catch(e){}}}V.q=V.q.filter(q=>!q.done);
 if(G.banner&&G.banner.t>1.2)return;V.t+=dt;const p=G.p;
 if(!p.dead&&p.x+p.w>V.goalX-10)return vEnd('hero','goal');
 if(V.t>=V.T)return vEnd('villain','time')}
function vEnd(who,why){const V=G.vm;if(V.over)return;V.over=true;V.who=who;V.why=why;V.endT=who==='villain'?2.2:2.4;const b=G.boss,p=G.p,v=V.v;
 const k='vmL:'+v.id;if(who==='villain'){save['vmW:'+v.id]=(+save['vmW:'+v.id]||0)+1;save[k]=0;AU.stop();AU.fx('boss_die');vSay(b,v.win,3);text(b.x,b.y-b.dh-30,why==='time'?'TIME\u2019S UP! THE HERO FAILED!':'THE HERO IS FINISHED!','#ff4a4a',1);shake(14);burst(b.x,b.y-b.h/2,60,['#ff2a2a','#b06aff','#ffffff',v.color||'#ff4a4a'],420,1.2,5)}
 else{save[k]=(+save[k]||0)+1;AU.stop();AU.fx('clear');if(why==='goal'){text(p.x,p.y-60,'THE HERO GOT THROUGH!','#7ff7ff',1);TFX('confetti',p.x,p.y-40)}if(!b.dead)vSay(b,v.lose,3)}
 persist();G.clear=true}
function vTip(v,won,why){const sp="your SPECIAL ("+esc(v.spec&&v.spec.name||"big move")+")";let t;
 if(won)t=why==='time'?`Stand in the hero\u2019s way and jump over their shots. Want a faster win? Use ${sp} when they get close to take all their lives.`:`Great job! Keep blocking the path and save ${sp} for when the hero is close.`;
 else if(why==='goal')t=`Stand in the hero\u2019s path \u2014 your body blocks them. If they slip past, hold toward the goal to chase them at super speed!`;
 else t=`Jump over the hero\u2019s shots! Every hit fills your yellow STUN bar \u2014 back away when it\u2019s nearly full, then use ${sp} when they get close.`;
 const tired=!won&&+(save['vmL:'+v.id]||0)>=2?'<br><span class="sub">The hero is getting tired \u2014 next try will be easier!</span>':'';
 return `<p class="vtip"><b>\ud83d\udca1 ${won?'TIP':'HOW TO WIN'}:</b> ${t}${tired}</p>`}
function vEndScreen(){const V=G.vm,v=V.v,b=G.boss,won=V.who==='villain';state='vmover';const hn=heroName(v.hero);
 const why=won?(V.why==='time'?hn+' ran out of time!':hn+' is out of lives!'):(V.why==='goal'?hn+' reached the end of the level.':hn+' knocked you out!');
 const stats=`<p class="sub">Time ${Math.floor(V.t)}s of ${V.T}s · ${hn}\u2019s lives left: ${Math.max(0,run.lives)} · Your health: ${Math.max(0,Math.ceil(b.hp))}/${b.max}</p>`;
 showUI(`<div class="vend ${won?'win':'lose'}"><div class="vbig-t">${won?'VILLAINY WINS!':'FOILED AGAIN!'}</div><canvas data-vil="${v.id}" data-pose="${won?'':'_defeat'}" width="300" height="240" class="vbig"></canvas><p class="vquote">“${esc(won?v.win:v.lose)}”<br><span class="sub">— ${esc(v.name)}</span></p><p><b>${esc(why)}</b></p>${stats}${vTip(v,won,V.why)}<div class="vbtns"><button class="btn" data-a="vgo" data-v="${v.id}">${won?'😈 PLAY AGAIN':'↻ TRY AGAIN'}</button><button class="btn alt" data-a="vback">CHOOSE VILLAIN</button><button class="btn dim" data-a="title">TITLE</button></div></div>`)}
/* villain HUD: hero hearts + lives, timer, special meter, hero progress bar, off-screen hero arrow */
function drawTopBandVM(x,y,maxW){const p=G.p,V=G.vm,b=G.boss,v=V.v;c.save();c.translate(x,y);HUDR.ammo=null;
 const st=(s,xx,yy,col='#fff')=>{c.strokeText(s,xx,yy);c.fillStyle=col;c.fillText(s,xx,yy)};c.font='800 12px "Trebuchet MS"';c.textAlign='left';c.lineWidth=3;c.strokeStyle='#000';
 st(heroName(v.hero).toUpperCase(),4,10,'#7ff7ff');for(let i=0;i<p.maxHp;i++){c.save();c.translate(12+i*22,26);D.heart(c,0,0,8,i<p.hp?'#ff2a5a':'#ffffff33');c.restore()}
 c.font='800 14px "Trebuchet MS"';st('x'+Math.max(0,run.lives)+' LIVES',p.maxHp*22+8,31,'#5ad84a');
 const left=Math.max(0,Math.ceil(V.T-V.t));c.font='800 14px "Trebuchet MS"';const lw=p.maxHp*22+8+c.measureText('x'+Math.max(0,run.lives)+' LIVES').width;let tx=Math.max(lw+10,Math.min(maxW-170,260));const bw=clamp(maxW-tx-6,112,150);if(tx+bw>maxW-4)tx=Math.max(lw+6,maxW-4-bw);c.fillStyle='#0008';D.rr(c,tx,0,bw,46,10);c.fill();c.strokeStyle=left<=10?'#ff4a4a':'#ff4fd8aa';c.lineWidth=2;c.stroke();
 c.font='900 22px "Trebuchet MS"';c.textAlign='center';st(Math.floor(left/60)+':'+String(left%60).padStart(2,'0'),tx+bw*0.28,30,left<=10?'#ff6a6a':'#ffe94b');
 const cd=Math.max(0,b.spCd),full=v.spec.cd||6,f=1-Math.min(1,cd/full),bx0=tx+bw*0.56,bww=bw*0.38;c.fillStyle='#222';c.fillRect(bx0,12,bww,9);c.fillStyle=f>=1?'#5aff7a':'#b06aff';c.fillRect(bx0,12,bww*f,9);c.font='800 9px "Trebuchet MS"';st(f>=1?'SPECIAL!':'SPECIAL',bx0+bww/2,36,f>=1?'#5aff7a':'#ccc');
 c.restore()}
function drawVMHud(){const V=G.vm,p=G.p,b=G.boss;const w=Math.min(380,viewW-40),x=(viewW-w)/2,y=portrait?10:66;const f=k=>clamp((k-V.startX)/(V.goalX-V.startX),0,1);
 c.fillStyle='#000a';D.rr(c,x-6,y-6,w+12,22,8);c.fill();c.fillStyle='#ffffff22';c.fillRect(x,y+3,w,4);
 const hx=x+w*f(p.x+p.w/2);const g=c.createLinearGradient(x,0,x+w,0);g.addColorStop(0,'#00e5ff');g.addColorStop(1,'#ff4fd8');c.fillStyle=g;c.fillRect(x,y+3,hx-x,4);
 c.fillStyle='#ffe94b';c.fillRect(x+w-2,y-3,3,16);c.font='800 9px "Trebuchet MS"';c.textAlign='right';c.fillStyle='#ffe94b';c.fillText('GOAL',x+w-5,y+16);
 if(b&&!b.dead){const bx2=x+w*f(b.x);circ(bx2,y+5,6,'#ff2a2a');c.fillStyle='#fff';c.font='900 8px "Trebuchet MS"';c.textAlign='center';c.fillText('YOU',bx2,y-1)}
 circ(hx,y+5,6,'#7ff7ff');c.fillStyle='#002';c.font='900 8px "Trebuchet MS"';c.textAlign='center';c.fillText('H',hx,y+8);
 const sx=p.x+p.w/2-G.cam.x,sy=p.y+p.h/2-G.cam.y;if(!p.dead&&(sx<0||sx>viewW)){const L=sx<0,ax=L?18:viewW-18,ay=clamp(sy,60,VV-60),d=Math.round(Math.abs((p.x+p.w/2)-(b?b.x:0))/40);const pulse=0.7+0.3*Math.sin(G.t*8);c.save();c.globalAlpha=pulse;c.fillStyle='#7ff7ff';c.beginPath();c.moveTo(ax+(L?-12:12),ay);c.lineTo(ax+(L?10:-10),ay-14);c.lineTo(ax+(L?10:-10),ay+14);c.fill();c.font='900 12px "Trebuchet MS"';c.textAlign=L?'left':'right';c.lineWidth=3;c.strokeStyle='#000';const s=heroName(G.vm.v.hero).toUpperCase()+' '+d+'m';c.strokeText(s,ax+(L?14:-14),ay+30);c.fillStyle='#7ff7ff';c.fillText(s,ax+(L?14:-14),ay+30);c.restore()}
 if(b&&b.grip>0){c.save();c.globalCompositeOperation='lighter';c.strokeStyle='rgba(255,40,40,'+(0.4+0.4*Math.sin(G.t*30))+')';c.lineWidth=3;c.beginPath();c.moveTo(b.x+b.dir*30-G.cam.x,b.y-b.h*0.7-G.cam.y);c.lineTo(sx,sy);c.stroke();c.restore()}}
function vmCam(dt){const b=G.boss,p=G.p;if(!b)return;const look=viewW*(b.dir>0?(portrait?0.38:0.36):(portrait?0.62:0.6));let tx=b.x-look;const px=p.x+p.w/2;
 if(!p.dead&&Math.abs(px-b.x)<viewW*0.8){tx=(px+b.x)/2-viewW/2;tx=clamp(tx,b.x-viewW+90,b.x-90)}
 G.cam.x=lerp(G.cam.x,tx,Math.min(1,dt*5));G.cam.x=clamp(G.cam.x,0,Math.max(0,G.L.width-viewW));G.cam.minX=-1e9;
 const ty=clamp(b.y-b.h/2-VV*0.55,0,VH-VV);G.cam.y=VV>=VH?0:lerp(G.cam.y,ty,Math.min(1,dt*4))}
function villainInfo(id){const v=VBY(id);if(!v)return toSelect('villain');state='vinfo';VSEL.page='villain';const L=LEVELS[v.level];const w=+(save['vmW:'+v.id]||0);
 showUI(`<canvas data-vil="${v.id}" width="300" height="240" class="vbig"></canvas><h2 style="color:${v.color||'#ffe66d'}">${esc(v.name)}</h2><p class="sub">${esc(v.world)} · ${esc(L?L.name:v.level)}${w?' · ✅ beaten '+w+'x':''}</p><p class="vquote">“${esc(v.taunt[0])}”</p>
<ul class="how vmoves"><li><b>ATTACK · ${esc(v.atk.name)}:</b> ${esc(v.atk.desc)}.</li><li><b>SPECIAL · ${esc(v.spec.name)}:</b> ${esc(v.spec.desc)}. Recharges in ${v.spec.cd||6}s.</li>${v.float?'<li><b>Hover:</b> hold JUMP while falling to float.</li>':''}<li><b>Your mission:</b> start at the END of the level and stop <b>${esc(heroName(v.hero))}</b> before they get through. Knock out all their lives or run out the clock! You block the path, but too many hits will STUN you and let them slip by.</li></ul>
<button class="btn" data-a="vgo" data-v="${v.id}">😈 PLAY AS ${esc(v.name.toUpperCase())}</button><br><button class="btn dim" data-a="vback">◀ VILLAINS</button>`)}
function vPortrait(cc,id,pose){const v=VBY(id);if(!v)return;const x=cc.getContext('2d');let t=0;pose=pose||'';
 if(v.art){loadArt('art/bosses/'+v.art+'.webp');if(pose&&ART_ALL.includes('art/bosses/'+v.art+pose+'.webp'))loadArt('art/bosses/'+v.art+pose+'.webp')}
 const dr=()=>{if(!cc.isConnected)return;t+=1/30;x.setTransform(1,0,0,1,0,0);x.clearRect(0,0,cc.width,cc.height);const g=x.createRadialGradient(cc.width/2,cc.height*0.55,10,cc.width/2,cc.height/2,cc.width/2);g.addColorStop(0,(v.color||'#ff4fd8')+'77');g.addColorStop(1,'#00000000');x.fillStyle=g;x.fillRect(0,0,cc.width,cc.height);
  const im=v.art&&(D.IMG['art/bosses/'+v.art+pose]||D.IMG['art/bosses/'+v.art]);
  if(im){const s=Math.min(cc.width/im.width,(cc.height-8)/im.height)*(0.95+Math.sin(t*2)*0.02);x.drawImage(im,(cc.width-im.width*s)/2,cc.height-4-im.height*s+Math.sin(t*3)*2,im.width*s,im.height*s)}
  else if(!v.art){const k=Math.min((cc.width-20)/(v.w*1.4),(cc.height-20)/(v.dh||v.h*1.3));x.save();x.translate(cc.width/2,cc.height-8);x.scale(k,k);try{D.boss(x,{type:v.draw||v.id,x:0,y:0,w:v.w,h:v.h,dh:v.dh,dir:-1,flash:0,t},t)}catch(e){}x.restore()}
  setTimeout(()=>requestAnimationFrame(dr),40)};dr()}
/* select page: swipe between HERO and VILLAIN pages */
let swipeA=null,swiped=0;
function uiSwipeStart(x,y){if(state!=='select')return;swipeA={x,y,t:performance.now()}}
function uiSwipeEnd(x,y){if(!swipeA||state!=='select')return;const dx=x-swipeA.x,dy=y-swipeA.y;swipeA=null;if(Math.abs(dx)>55&&Math.abs(dy)<Math.abs(dx)*0.7){swiped=performance.now();setPage(dx<0?'villain':'hero',dx<0?1:-1)}}
function setPage(pg,dirn){if(pg===VSEL.page&&state==='select')return;AU.fx('coin');toSelect(pg,dirn)}
{const u=$('ui');u.addEventListener('touchstart',e=>{const t=e.changedTouches[0];uiSwipeStart(t.clientX,t.clientY)},{passive:true});u.addEventListener('touchend',e=>{const t=e.changedTouches[0];uiSwipeEnd(t.clientX,t.clientY)},{passive:true});
 u.addEventListener('touchmove',e=>{if(!swipeA||state!=='select')return;const t=e.changedTouches[0];if(Math.abs(t.clientX-swipeA.x)>Math.abs(t.clientY-swipeA.y)&&e.cancelable)e.preventDefault()},{passive:false});
 u.addEventListener('mousedown',e=>uiSwipeStart(e.clientX,e.clientY));u.addEventListener('mouseup',e=>uiSwipeEnd(e.clientX,e.clientY))}
/* ================= GAME CONTROLLER (Gamepad API, standard mapping) ================= */
const GPK={L:0,R:0,U:0,D:0,J:0,T:0,S:0};const GP={on:false,prev:[],id:'',rep:0,lastDir:'',focus:null};
function toast(s){let el=$('toast');if(!el){el=document.createElement('div');el.id='toast';document.body.appendChild(el)}el.textContent=s;el.classList.add('show');clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove('show'),2600)}
const padName=id=>/xbox|xinput/i.test(id)?'Xbox controller':/054c|playstation|dualshock|dualsense/i.test(id)?'PlayStation controller':/057e|switch|pro controller/i.test(id)?'Switch Pro controller':'Controller';
addEventListener('gamepadconnected',e=>{GP.on=true;GP.id=e.gamepad.id;toast('🎮 '+padName(e.gamepad.id)+' connected');gpFocusFirst()});
addEventListener('gamepaddisconnected',()=>{GP.on=false;for(const k in GPK)GPK[k]=0;GP.prev=[];toast('🎮 Controller disconnected')});
function gpButtons(){return Array.from($('ui').querySelectorAll('.scr button')).filter(b=>b.offsetParent!==null)}
function gpSetFocus(b){if(GP.focus)GP.focus.classList.remove('gpfocus');GP.focus=b;if(b){b.classList.add('gpfocus');try{b.focus({preventScroll:true})}catch(e){}b.scrollIntoView&&b.scrollIntoView({block:'nearest'})}}
function gpFocusFirst(){if(!GP.on)return;const bs=gpButtons();if(!bs.length){GP.focus=null;return}gpSetFocus(bs.find(b=>b.classList.contains('btn')&&!b.classList.contains('dim')&&!b.classList.contains('tab'))||bs[0])}
function gpMove(d){const bs=gpButtons();if(!bs.length)return;let cur=GP.focus&&bs.includes(GP.focus)?GP.focus:null;if(!cur){gpFocusFirst();return}
 const r0=cur.getBoundingClientRect(),c0={x:r0.left+r0.width/2,y:r0.top+r0.height/2};let best=null,bs2=1e9;
 for(const b of bs){if(b===cur)continue;const r=b.getBoundingClientRect(),q={x:r.left+r.width/2,y:r.top+r.height/2},dx=q.x-c0.x,dy=q.y-c0.y;
  const ok=d==='L'?dx<-4:d==='R'?dx>4:d==='U'?dy<-4:dy>4;if(!ok)continue;const main=d==='L'||d==='R'?Math.abs(dx):Math.abs(dy),off=d==='L'||d==='R'?Math.abs(dy):Math.abs(dx);const sc=main+off*2.2;if(sc<bs2){bs2=sc;best=b}}
 if(best){gpSetFocus(best);AU.fx('coin')}}
function gpBack(){const order=['back','vback','select','missions','title','resume'];for(const a of order){const b=$('ui').querySelector('.scr button[data-a="'+a+'"]');if(b){b.click();return true}}return false}
function pollPad(dt){const pads=navigator.getGamepads?navigator.getGamepads():[];let gp=null;for(const g of pads||[])if(g&&g.connected!==false&&g.buttons&&g.buttons.length){gp=g;break}
 if(!gp){if(GP.on&&!pads.length){}for(const k in GPK)GPK[k]=0;return}
 if(!GP.on||GP.id!==gp.id){GP.on=true;GP.id=gp.id;toast('🎮 '+padName(gp.id)+' connected');gpFocusFirst()}
 const B=i=>{const x=gp.buttons[i];return !!(x&&(x.pressed||x.value>0.5))},P=i=>B(i)&&!GP.prev[i];const ax=gp.axes[0]||0,ay=gp.axes[1]||0;
 const L=B(14)||ax<-0.35,R=B(15)||ax>0.35,U=B(12)||ay<-0.5,Dn=B(13)||ay>0.5;
 if(state==='play'&&G){GPK.L=L?1:0;GPK.R=R?1:0;GPK.U=U?1:0;GPK.D=Dn?1:0;GPK.J=B(0)?1:0;GPK.T=B(2)?1:0;GPK.S=G.vm&&(B(3)||B(5)||B(1))?1:0;
  if(!G.vm){if(P(3))cycleTop();if(P(5)||P(1))swapBuddy()}if(P(9))pauseGame();if(P(8))AU.mute(!AU.muted)}
 else{for(const k in GPK)GPK[k]=0;const dir=L?'L':R?'R':U?'U':Dn?'D':'';GP.rep-=dt;
  if(dir&&(dir!==GP.lastDir||GP.rep<=0)){GP.rep=dir===GP.lastDir?0.16:0.38;if(state==='select'&&(dir==='L'||dir==='R')&&(!GP.focus||!gpButtons().includes(GP.focus)||GP.focus.classList.contains('tab')))setPage(dir==='R'?'villain':'hero',dir==='R'?1:-1);else gpMove(dir)}GP.lastDir=dir;
  if(state==='select'&&(P(4)||P(5)))setPage(P(5)?'villain':'hero',P(5)?1:-1);
  if(P(0)){if(!GP.focus||!gpButtons().includes(GP.focus))gpFocusFirst();if(GP.focus)GP.focus.click()}
  if(P(1))gpBack();if(P(9)){if(state==='pause')resumeGame();else if(state==='title')toSelect()}if(P(8))AU.mute(!AU.muted)}
 GP.prev=gp.buttons.map((x,i)=>B(i))}

/* ---------------- boot ---------------- */
(async()=>{showUI('<h2>LOADING…</h2><p>Warming up the tortillas</p>');await loadParts();
 for(const id of Object.keys(LEVELS)){const L=LEVELS[id];if(L.mode==='flight'&&!L.flightId)L.flightId=FLIGHT_ALIAS[id]||id}
 requestAnimationFrame(frame);const q=new URLSearchParams(location.search);
 if(q.get('villain')&&VBY(q.get('villain'))){newVillainRun(VBY(q.get('villain')));playCurrent()}else if(q.get('play')){const ch=q.get('char')||'taco';newRun(ch,0);const i=run.list.indexOf(q.get('play'));if(i>=0)run.idx=i;else{run.list=[q.get('play')];run.idx=0}playCurrent()}else toTitle();
 window.__taco.ready=true})();
const FLIGHT_ALIAS={'xw-1':'xwing','xw-2':'xwing','falcon-1':'falcon'};
Object.defineProperties(window.__taco,{viewW:{get:()=>viewW},PC:{get:()=>PC},S:{get:()=>S},gameTop:{get:()=>gameTop},state:{get:()=>state},run:{get:()=>run},G:{get:()=>G}});Object.assign(window.__taco,{key:(k,d)=>{K[k]=d?1:0},hold:(k,ms)=>{K[k]=1;setTimeout(()=>{K[k]=0},ms||500)},tap:(k)=>{K[k]=1;setTimeout(()=>{K[k]=0},90)},spawnEnemy:e=>spawnEnemy(e),CHARS,inp,startLevel:(id,ch)=>{newRun(ch||'taco',0);run.list=[id];playCurrent()},LEVELS:()=>LEVELS,MISSIONS:()=>MISSIONS,gameOver:()=>gameOver(),levelClear:()=>levelClear(),kill:w=>killPlayer(w||'pit'),swap:()=>swapBuddy(),tapAt:(x,y)=>tapWorld(x,y),buddy:()=>G&&G.buddy,hasGround:x=>hasGround(x),villains:()=>VR(),VIN,GPK,toSelect:(p)=>toSelect(p),villainInfo:id=>villainInfo(id),playVillain:id=>{const v=VBY(id);if(v){newVillainRun(v);playCurrent()}},vEnd:(w,y)=>vEnd(w,y),pad:()=>GP,setSave:(k,v)=>{save[k]=v;persist()}});Object.defineProperty(window.__taco,'vm',{get:()=>G&&G.vm});
})();
