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
 joe:{name:'Duke (G.I. Joe)',tag:'Cobra Island · rapid rifle',weapon:'bullet',jump:1,speed:1.08},
 chewie:{name:'Chewbacca',tag:'Star Wars: Endor, Ewoks, Tatooine, X-wing, Falcon',weapon:'bolt',jump:1.08,speed:1},
 ewok:{name:'Wicket the Ewok',tag:'Star Wars: Ewok missions · sling stones + waddle',weapon:'rock',jump:0.95,speed:0.9},
};
/* ---------------- canvas sizing ---------------- */
function resize(){W=innerWidth;H=innerHeight;DPR=Math.min(devicePixelRatio||1,2);cv.width=Math.round(W*DPR);cv.height=Math.round(H*DPR);portrait=H>W*1.1;
 if(portrait){VV=540;S=W/clamp(W*1.05,400,470);gameH=VV*S;if(gameH>H*0.62){S=H*0.62/VV;gameH=VV*S}gameTop=Math.round(clamp((H-gameH)*0.25,40,150))}else{VV=clamp(Math.round(540*Math.min(1,(W/H)/2.6)),440,540);S=H/VV;gameH=H;gameTop=0}
 viewW=W/S;layoutPad()}
function layoutPad(){const pad=$('pad'),bj=$('bJump'),bt=$('bThrow'),hint=$('swipeHint');
 if(portrait){const top=gameTop+gameH,ph=H-top;pad.style.top=top+'px';pad.style.height=ph+'px';const sz=Math.round(clamp(ph*0.36,84,120));[bj,bt].forEach(b=>{b.style.width=b.style.height=sz+'px'});
  bj.style.right='18px';bj.style.bottom=Math.round(ph*0.22)+'px';bt.style.right=(18+sz+16)+'px';bt.style.bottom=Math.round(ph*0.22+sz*0.45)+'px';hint.style.top='14px';hint.style.display=''}
 else{pad.style.top='auto';pad.style.height='0';const sz=Math.round(clamp(H*0.22,74,104));[bj,bt].forEach(b=>{b.style.width=b.style.height=sz+'px'});bj.style.right='16px';bj.style.bottom='16px';bt.style.right=(16+sz+12)+'px';bt.style.bottom=(16+sz*0.4)+'px';hint.style.display='none'}}
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
const VIRT={jump:0,throw:0};const TOUCH=new Map();let lastJumpHeld=0,lastThrowHeld=0,swipeJump=0;
const KEYMAP={ArrowLeft:'L',KeyA:'L',ArrowRight:'R',KeyD:'R',ArrowUp:'U',KeyW:'U',ArrowDown:'D',KeyS:'D',Space:'J',KeyJ:'J',KeyZ:'J',KeyK:'T',KeyX:'T'};
addEventListener('keydown',e=>{AU.unlock();const k=KEYMAP[e.code];if(k){K[k]=1;e.preventDefault()}if(e.code==='KeyP'||e.code==='Escape'){if(state==='play')pauseGame();else if(state==='pause')resumeGame()}if(e.code==='KeyM')AU.mute(!AU.muted);if(e.code==='Enter'&&state==='title')toSelect()});
addEventListener('keyup',e=>{const k=KEYMAP[e.code];if(k)K[k]=0});
function swipeDir(t){let dx=t.x-t.ax,dy=t.y-t.ay;const d=Math.hypot(dx,dy);t.sx=clamp((t.x-t.ox)/60,-1,1);t.sy=clamp((t.y-t.oy)/60,-1,1);const o={};if(d<14)return o;if(d>44){t.ax=t.x-dx/d*44;t.ay=t.y-dy/d*44}
 const s=Math.round(Math.atan2(dy,dx)/(Math.PI/4));if(s===0||s===1||s===-1)o.R=1;if(s===4||s===-4||s===3||s===-3)o.L=1;if(s===2||s===1||s===3)o.D=1;if(s===-2||s===-1||s===-3)o.U=1;return o}
function tStart(id,x,y){AU.unlock();TOUCH.set(id,{x,y,ax:x,ay:y,ox:x,oy:y,z:{},sx:0,sy:0})}
function tMove(id,x,y){const t=TOUCH.get(id);if(!t)return;t.x=x;t.y=y;const before=t.z.U;t.z=swipeDir(t);if(t.z.U&&!before)swipeJump=1}
function tEnd(id){TOUCH.delete(id)}
cv.addEventListener('touchstart',e=>{e.preventDefault();for(const t of e.changedTouches)tStart(t.identifier,t.clientX,t.clientY)},{passive:false});
cv.addEventListener('touchmove',e=>{e.preventDefault();for(const t of e.changedTouches)tMove(t.identifier,t.clientX,t.clientY)},{passive:false});
cv.addEventListener('touchend',e=>{e.preventDefault();for(const t of e.changedTouches)tEnd(t.identifier)},{passive:false});
cv.addEventListener('touchcancel',e=>{for(const t of e.changedTouches)tEnd(t.identifier)});
let md=false;cv.addEventListener('mousedown',e=>{md=true;tStart('m',e.clientX,e.clientY)});addEventListener('mousemove',e=>{if(md)tMove('m',e.clientX,e.clientY)});addEventListener('mouseup',()=>{if(md){md=false;tEnd('m')}});
function bindBtn(el,k){const on=e=>{e.preventDefault();e.stopPropagation();AU.unlock();VIRT[k]=1;el.classList.add('on')},off=e=>{e.preventDefault();e.stopPropagation();VIRT[k]=0;el.classList.remove('on')};
 el.addEventListener('touchstart',on,{passive:false});el.addEventListener('touchend',off,{passive:false});el.addEventListener('touchcancel',off,{passive:false});el.addEventListener('mousedown',on);el.addEventListener('mouseup',off);el.addEventListener('mouseleave',off);el.addEventListener('contextmenu',e=>e.preventDefault())}
bindBtn($('bJump'),'jump');bindBtn($('bThrow'),'throw');
function readInput(){let L=K.L,R=K.R,U=K.U,D=K.D,sx=0,sy=0;for(const t of TOUCH.values()){if(t.z.L)L=1;if(t.z.R)R=1;if(t.z.U)U=1;if(t.z.D)D=1;sx+=t.sx;sy+=t.sy}
 if(K.L||K.R)sx=(K.R?1:0)-(K.L?1:0);if(K.U||K.D)sy=(K.D?1:0)-(K.U?1:0);
 inp.L=L?1:0;inp.R=R?1:0;inp.U=U?1:0;inp.D=D?1:0;inp.steer.x=clamp(sx,-1,1);inp.steer.y=clamp(sy,-1,1);
 const plat=mode()!=='bike'&&mode()!=='flight';const onLad=plat&&G&&G.p&&PT.ladderAt(G.p);
 const j=!!(K.J||VIRT.jump||(plat&&!onLad&&inp.U));const sj=plat&&!onLad&&swipeJump;inp.jumpPressed=((j&&!lastJumpHeld)||sj)?1:0;inp.jump=j?1:0;lastJumpHeld=j;swipeJump=0;
 const th=!!(K.T||VIRT.throw);inp.throwPressed=th&&!lastThrowHeld?1:0;inp.throw=th?1:0;lastThrowHeld=th}
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
 artQueue('etheria');if(q0&&LEVELS[q0])artQueue(LEVELS[q0].theme);
 if(P.order&&P.order.length)ORDER=P.order.filter(id=>LEVELS[id]);if(P.missions)for(const k in P.missions)MISSIONS[k]=P.missions[k].filter(id=>LEVELS[id]);
 MISSIONS.taco=ORDER.slice();window.__taco.parts=P}
function normLevel(j){j.mode=j.mode||'platform';j.ground=j.ground||[];j.platforms=j.platforms||[];j.hazards=j.hazards||[];j.springs=j.springs||[];j.enemies=j.enemies||[];j.pickups=j.pickups||[];j.checkpoints=j.checkpoints||[];j.allies=(j.allies||[]).map(a=>Object.assign({say:GEN.SAY[a.who]||'',gift:GEN.GIFT[a.who]},a));j.start=j.start||{x:80,y:380};j.theme=j.theme||'rainbow';
 if(j.mode==='boss'&&!j.bossX)j.bossX=(j.width||1200)*0.7;if(j.boss&&j.mode==='platform'&&!j.bossX)j.bossX=(j.width||6000)-900;if(!j.goal)j.goal={x:(j.width||6000)-150,y:460};return j}
window.__taco.TUNE=TUNE;
/* ---------------- enemy catalogue ---------------- */
const ET={murky:{b:'walker',hp:1,sp:60,w:30,h:52,sc:100},lurky:{b:'walker',hp:2,sp:40,w:44,h:48,sc:200},gloom_cloud:{b:'flyer',hp:2,sp:50,w:50,h:30,sc:200,shot:'rain',fly:1},
 shreeky:{b:'swooper',hp:1,sp:90,w:44,h:34,sc:200,fly:1},beastly:{b:'hopper',hp:1,sp:80,w:32,h:38,sc:150},horde_trooper:{b:'shooter',hp:2,sp:55,w:28,h:60,sc:200,shot:'bolt'},
 catra:{b:'charger',hp:2,sp:90,w:28,h:64,sc:300},cobra_trooper:{b:'shooter',hp:1,sp:60,w:26,h:62,sc:150,shot:'bullet'},bat:{b:'hopper',hp:2,sp:70,w:30,h:64,sc:250},
 hiss_tank:{b:'tank',hp:4,sp:35,w:84,h:46,sc:500,shot:'bullet',nostomp:1},scout_trooper:{b:'shooter',hp:1,sp:70,w:26,h:62,sc:150,shot:'bolt'},stormtrooper:{b:'shooter',hp:1,sp:55,w:26,h:62,sc:150,shot:'bolt'},
 tusken:{b:'hopper',hp:2,sp:70,w:28,h:62,sc:200},gamorrean:{b:'walker',hp:3,sp:45,w:40,h:66,sc:300},womp_rat:{b:'charger',hp:1,sp:120,w:34,h:20,sc:100}};
const BT={murky_gloom:{hp:24,w:150,h:110,name:'Murky\u2019s Gloom Machine',shot:'rain'},no_heart:{hp:26,w:120,h:120,name:'No Heart',shot:'slime',fly:1},hordak:{hp:30,w:140,h:130,name:'Hordak',shot:'bolt'},
 cobra_commander:{hp:32,w:160,h:120,name:'Cobra Commander',shot:'bomb',fly:1},at_st:{hp:30,w:110,h:170,name:'AT-ST Walker',shot:'gbolt'},jabba:{hp:40,w:240,h:150,name:'Jabba the Hutt',shot:'slime'},
 final:{hp:60,w:200,h:150,name:'Cobra-Horde Doomsday Machine',shot:'bolt',fly:1}};
/* ---------------- particles ---------------- */
function burst(x,y,n,col,sp=260,life=0.6,size=4,add=true,grav=600){for(let i=0;i<n;i++){const a=Math.random()*TAU,v=sp*(0.3+Math.random()*0.7);G.parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-sp*0.3,l:life*(0.6+Math.random()*0.6),m:life,s:size*(0.5+Math.random()),c:Array.isArray(col)?col[i%col.length]:col,add,g:grav})}}
function ring(x,y,col,r=40){G.parts.push({ring:1,x,y,l:0.35,m:0.35,s:r,c:col,add:true,vx:0,vy:0,g:0})}
function text(x,y,s,col='#fff',big){G.texts.push({x,y,s,c:col,l:1.1,big})}
function shake(a){G.shake=Math.max(G.shake,a)}
const TFX=(n,x,y,o)=>{try{window.TacoFX&&TacoFX.emit(n,x,y,o)}catch(e){}};
function hitstop(t){G.hs=Math.max(G.hs,t)}
/* ---------------- start a level ---------------- */
function startLevel(id){const L=LEVELS[id];if(!L){console.warn('missing level',id);return}
 G={id,L,mode:L.mode,theme:L.theme,t:0,cam:{x:0,y:VH-VV},parts:[],texts:[],shots:[],eshots:[],enemies:[],pickups:[],plats:[],solids:[],hazards:[],springs:[],checkpoints:[],allies:[],boss:null,shake:0,hs:0,combo:0,comboT:0,clear:false,clearT:0,deadT:0,banner:{s:L.name,t:2.6},bossOn:false,arena:null,flash:0,bg:L.bg||L.theme};
 if(L.mode==='flight'){G.p={x:0,y:0,w:1,h:1,hp:5,maxHp:5};return startFlight(L)}
 const p={x:L.start.x,y:L.start.y-50,w:30,h:46,vx:0,vy:0,onGround:false,face:1,coy:0,jb:0,runT:0,inv:1.5,star:0,throwT:0,cool:0,dj:0,jumping:false,ladder:false,dead:false,anim:0};
 if(CH==='chewie'){p.w=32;p.h=62}else if(CH==='ewok'){p.w=28;p.h=40}else if(CH!=='taco'&&CH!=='carebear'){p.h=58}
 G.p=p;Object.assign(p,{hp:run.hp,maxHp:5});
 if(L.mode==='flight')return startFlight(L);
 for(const g of L.ground)G.solids.push({x:g[0],y:g[2],w:g[1]-g[0],h:600-g[2]+80,type:'ground'});
 for(const q of L.platforms){const o=Object.assign({h:q.type==='ladder'?(q.h||160):(q.h||24)},q,{x0:q.x,y0:q.y,dxm:0,dym:0});if(o.type==='solid')G.solids.push(o);else G.plats.push(o)}
 G.hazards=(L.hazards||[]).map(h=>Object.assign({h:20},h));
 for(const h of G.hazards)if(h.type==='sarlacc'){h.y=h.y||460;const cx=h.x+h.w/2;if(!G.solids.some(s=>cx>=s.x&&cx<=s.x+s.w&&Math.abs(s.y-h.y)<30))G.solids.push({x:h.x-2,y:h.y,w:h.w+4,h:140,type:'sand'})}G.springs=(L.springs||[]).map(s=>({x:s.x,y:s.y,sq:0}));G.checkpoints=(L.checkpoints||[]).map(k=>({x:k.x,on:false}));
 for(const e of L.enemies)spawnEnemy(e);
 G.pickups=(L.pickups||[]).map(q=>({type:q.type,x:q.x,y:q.y,got:false}));
 G.allies=(L.allies||[]).map(a=>({who:a.who,x:a.x,y:a.y||460,say:a.say||'',gift:a.gift,met:false,sayT:0,fights:a.fights||a.who==='chewbacca',cool:1,follow:false,vx:0}));
 G.obstacles=(L.obstacles||[]).map(o=>Object.assign({},o));G.respawn={x:L.start.x,y:L.start.y-50};
 if(L.mode==='bike'){p.bike=1;p.y=280;p.h=40;p.w=70;p.vx=TUNE.bikeSpeed}
 if(L.mode==='boss'||L.boss&&L.boss!=='bike')G.bossType=L.boss;
 AU.play(L.music||(L.mode==='bike'?'bike':L.theme));try{window.TacoFX&&TacoFX.setTheme(L.mode==='bike'?'bike':L.theme)}catch(e){}
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
function stepPlayer(dt){const p=G.p,T=TUNE,ch=CHARS[CH];
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
 if(window.TacoPhysics&&TacoPhysics.hurt){p.iframes=0;TacoPhysics.hurt(p,src?src.x:p.x+p.w/2+p.face)}else{p.vy=-420;p.vx=(src&&src.x>p.x?-1:1)*260}if(p.hp<=0)killPlayer()}
function killPlayer(why){const p=G.p;if(p.dead||G.clear)return;p.dead=true;G.deadT=2.2;run.lives--;AU.fx(why==='sarlacc'?'sarlacc':'die');shake(16);burst(p.x+p.w/2,p.y+p.h/2,40,['#ffe94b','#ff4a4a','#5ad84a','#ffffff'],400,1,5);
 if(why==='sarlacc')text(p.x,p.y-30,'SWALLOWED BY THE SARLACC!','#ffcc66',1);else if(why==='pit')text(p.x,G.cam.y+300,'OOPS!','#fff',1)}
function respawn(){const p=G.p;if(run.lives<=0){return gameOver()}p.dead=false;p.captured=null;p.capT=0;p.pound=0;p.iframes=0;p.hurtLock=0;p.hp=p.maxHp;run.hp=p.hp;p.x=G.respawn.x;p.y=G.respawn.y;p.vx=p.vy=0;p.inv=2;if(G.mode==='bike'){p.y=280;p.vx=TUNE.bikeSpeed}
 G.enemies.forEach(e=>{if(e.dead&&!e.gone&&Math.abs(e.x0-p.x)>600){}});G.eshots=[]}
/* ---------------- weapons ---------------- */
const TOPS=['lettuce','tomato','cheese','jalapeno','salsa'];
function doThrow(){const p=G.p,ch=CHARS[CH];if(p.cool>0||p.dead)return;
 const x=p.x+p.w/2+p.face*16,y=p.y+(CH==='taco'?14:p.h*0.35);let k=null;
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
function eshot(x,y,vx,vy,kind){G.eshots.push({x,y,vx,vy,kind,l:4,r:kind==='bomb'?10:7,g:kind==='slime'||kind==='bomb'?900:kind==='rain'?400:0,rot:vx<0?Math.PI:0})}
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
 G.shots=G.shots.filter(s=>s.l>0&&s.y<700&&s.x>G.cam.x-200&&s.x<G.cam.x+viewW+200);
 for(const s of G.eshots){s.l-=dt;if(s.g)s.vy+=s.g*dt;s.x+=s.vx*dt;s.y+=s.vy*dt;
  if(G.mode!=='flight')for(const so of G.solids)if(s.x>so.x&&s.x<so.x+so.w&&s.y>so.y&&s.y<so.y+so.h){s.l=0;if(s.kind==='bomb'){burst(s.x,s.y,20,['#ff8a00','#ffdd33','#444'],300,0.6,5);shake(6);AU.fx('explode');if(Math.abs(p.x+p.w/2-s.x)<60&&Math.abs(p.y+p.h-s.y)<60)hurtPlayer(s)}else burst(s.x,s.y,6,colOf(s.kind),120,0.3,3)}
  if(s.l>0&&!p.dead&&s.x>p.x-s.r&&s.x<p.x+p.w+s.r&&s.y>p.y-s.r&&s.y<p.y+p.h+s.r){s.l=0;hurtPlayer(s)}}
 G.eshots=G.eshots.filter(s=>s.l>0&&s.y<700)}
function colOf(k){return{lettuce:['#5ad84a','#9af07a'],tomato:['#e8302a','#ffb0a0'],cheese:['#ffd23a','#fff2a0'],jalapeno:['#ff8a00','#ffdd33','#2ab83a'],salsa:['#d8261c','#2ab83a'],star:['#fff','#ffe94b','#ff4bd8'],care:['#ff7ab8','#ffe94b','#7ff7ff'],sword:['#bff8ff','#ffffff'],bullet:['#ffe066'],bolt:['#ff3a2a','#fff'],gbolt:['#3aff4a'],rlaser:['#ff4a3a','#fff'],glaser:['#5aff5a','#fff'],slime:['#8ad83a'],rain:['#7ab8ff'],bomb:['#ff8a00']}[k]||['#fff']}
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
 for(const a of G.allies){a.t=(a.t||0)+dt;if(a.sayT>0)a.sayT-=dt;const d=Math.abs(p.x+p.w/2-a.x);
  if(!a.met&&d<110&&!(a.trigger==='boss_phase')){a.met=true;a.sayT=3.2;AU.fx(a.who==='chewbacca'?'roar':'pickup');if(a.gift){G.pickups.push({type:a.gift,x:a.x+20,y:a.y-70,got:false,pop:1,vy:-380})}(a.give||[]).forEach((g,i)=>G.pickups.push({type:g,x:a.x+i*24,y:a.y-70,got:false,pop:1,vy:-380}));if(a.action==='follow'||a.fights)a.follow=true;if(a.action==='roar_scare'||a.who==='chewbacca')G.enemies.forEach(e=>{if(Math.abs(e.x-a.x)<400&&!e.dead){e.dir=e.x>a.x?1:-1;e.flee=3}})}
  if(a.trigger==='boss_phase'&&G.boss&&!a.met&&G.boss.phase>=(a.phase||2)){a.met=true;a.sayT=3;a.x=clamp(p.x-60,G.arena?G.arena.x0+30:0,1e9);AU.fx(a.who==='chewbacca'?'roar':'star');if(a.who==='chewbacca'){G.boss.stun=3;damageBoss(4,G.boss.x,G.boss.y-60)}else{p.shield=1;text(p.x,p.y-30,'SHIELD!','#7ff7ff',1)}a.follow=true}
  if(a.follow&&(!a.until_x||p.x<a.until_x)){const tx=p.x-p.face*70;a.x+=clamp(tx-a.x,-1,1)*Math.min(Math.abs(tx-a.x)*4,380)*dt;a.y=findGround(a.x);a.face=p.face;a.cool-=dt;
   if(a.cool<=0){let best=null,bd=420;for(const e of G.enemies)if(!e.dead&&Math.abs(e.x-a.x)<bd&&Math.abs(e.y-a.y)<160){bd=Math.abs(e.x-a.x);best=e}
    const tgt=best||(G.boss&&!G.boss.dead&&Math.abs(G.boss.x-a.x)<500?G.boss:null);if(tgt){const dir=tgt.x>a.x?1:-1;G.shots.push({kind:'bolt',x:a.x+dir*20,y:a.y-40,vx:dir*820,vy:0,l:0.9,dmg:2,r:9,rot:dir<0?Math.PI:0});a.cool=1.6;a.face=dir;AU.fx('laser')}}}}
 // goal
 const gl=G.L.goal;if(!G.clear&&!p.dead&&(!G.boss||G.boss.dead)&&(!G.bossType||G.boss&&G.boss.dead)&&p.x+p.w>gl.x-10&&p.x<gl.x+40)levelClear()}
function findGround(x){let best=600;for(const s of G.solids)if(x>=s.x&&x<=s.x+s.w&&s.y<best)best=s.y;return best===600?460:best}
function collect(q){q.got=true;const p=G.p;const ch=CHARS[CH];
 switch(q.type){case'coin':run.coins++;run.score+=100;AU.fx('coin');burst(q.x,q.y,6,['#ffe94b','#fff'],120,0.3,3);if(run.coins%100===0){run.lives++;AU.fx('oneup');text(q.x,q.y-20,'1-UP!','#5ad84a',1)}return;
  case'heart':p.hp=Math.min(p.maxHp,p.hp+1);text(q.x,q.y-20,'+1 HEALTH','#ff7ab8');AU.fx('heal');break;
  case'taco_shell':p.hp=p.maxHp;text(q.x,q.y-20,'FULL HEALTH!','#ffd23a');AU.fx('heal');break;
  case'star':p.star=8;text(q.x,q.y-20,'TOTALLY RAD!','#ffe94b',1);AU.fx('star');break;
  case'oneup':run.lives++;text(q.x,q.y-20,'1-UP!','#5ad84a',1);AU.fx('oneup');break;
  default:if(TOPS.includes(q.type)){if(ch.weapon==='toppings'){run.ammo[q.type]=Math.min(99,(run.ammo[q.type]||0)+10);run.sel=q.type;text(q.x,q.y-20,'+10 '+q.type.toUpperCase(),'#ffe94b')}else{run.power=Math.min(99,run.power+10);text(q.x,q.y-20,'+10 POWER','#7ff7ff')}AU.fx('pickup')}}
 run.hp=p.hp;run.score+=50;TFX(q.type==='heart'?'hearts':'pickup',q.x,q.y);burst(q.x,q.y,14,['#ffffff','#ffe94b','#ff4bd8'],200,0.5,3)}
/* ---------------- bosses ---------------- */
const BOSS_ALIAS={gloom_machine:'murky_gloom',murky:'murky_gloom',cobra:'cobra_commander',skeletor:'final'};
function spawnBoss(){const L=G.L;const type=BOSS_ALIAS[G.bossType]||G.bossType;const d=BT[type]||BT.final;const hp=L.bossHp||d.hp;
 const ar=L.arena||{x0:(L.bossX||L.width-900)-viewW*0.45,x1:(L.bossX||L.width-900)+Math.max(500,viewW*0.55)};
 const x0=ar.x0,x1=Math.max(ar.x1,x0+Math.min(viewW,1100));G.arena={x0,x1,minions:ar.minions};
 const bx=Math.min(x1-d.w/2-40,x0+(x1-x0)*0.75);const gy=findGround(bx);
 G.boss={type,name:d.name,x:bx,y:d.fly?gy-120:gy,gy,w:d.w,h:d.h,hp,max:hp,shot:d.shot,fly:d.fly,t:0,phase:1,cool:2,flash:0,dir:-1,vx:0,vy:0,stun:0,state:'idle',st:0,dead:false,intro:2};
 G.bossOn=true;AU.stop();AU.play(type==='final'?'final':'boss');G.banner={s:d.name.toUpperCase()+'!',t:2.2,boss:1};shake(8)}
function bossBox(b){return{x:b.x-b.w/2,y:b.y-b.h,w:b.w,h:b.h}}
function bossHitTest(b,s){const r=bossBox(b);return s.x>r.x-s.r&&s.x<r.x+r.w+s.r&&s.y>r.y-s.r&&s.y<r.y+r.h+s.r}
function damageBoss(n,x,y,stomp){const b=G.boss;if(!b||b.dead||b.intro>0)return;if(b.ifr>0&&!stomp)return;
 if(b.type==='jabba'&&window.TacoPhysics&&TacoPhysics.jabbaHit){try{const r=TacoPhysics.jabbaHit(b,{x,vx:x<b.x?1:-1,kind:stomp?'stomp':'shot',damage:n});if(r&&r.damage!==undefined)n=0}catch(e){}if(n)b.hp-=n}else b.hp-=n;
 b.flash=0.12;b.ifr=stomp?0.6:0.06;AU.fx('boss_hit');burst(x,y,10,['#ffffff','#ffcc33'],240,0.4,4);run.score+=50;
 const f=b.hp/b.max;b.phase=f<0.34?3:f<0.67?2:1;
 if(b.hp<=0){b.dead=true;b.dt=0;AU.fx('boss_die');shake(22);hitstop(0.2);G.flash=0.6;run.score+=5000;text(b.x,b.y-b.h-20,'BOSS DEFEATED! +5000','#ffe94b',1);for(let i=0;i<6;i++)setTimeout(()=>{if(G&&G.boss)burst(G.boss.x+rand(-b.w/2,b.w/2),G.boss.y-rand(0,b.h),40,['#ffffff','#ffcc33','#ff5a2a','#ff4bd8'],420,0.9,6)},i*160);G.eshots=[];G.enemies.forEach(e=>{if(!e.dead)killEnemy(e,0)})}}
function stepBoss(dt){const b=G.boss,p=G.p;if(!b)return;b.t+=dt;if(b.flash>0)b.flash-=dt;if(b.ifr>0)b.ifr-=dt;
 if(b.type==='jabba'&&window.TacoPhysics&&TacoPhysics.jabbaStep)try{TacoPhysics.jabbaStep(b,dt)}catch(e){}
 if(b.dead){b.dt+=dt;if(b.dt>2.2&&!G.clear){/* goal opens */}return}
 if(b.intro>0){b.intro-=dt;return}if(b.stun>0){b.stun-=dt;b.flash=Math.sin(b.t*30)>0?0.05:0;return}
 const sp=b.phase===3?1.5:b.phase===2?1.2:1;b.cool-=dt*sp;const dx=p.x+p.w/2-b.x;b.dir=dx>0?1:-1;const A=G.arena;
 const aim=(spd,kind,oy=0.6)=>{const sx=b.x+b.dir*b.w*0.3,sy=b.y-b.h*oy;const a=Math.atan2(p.y+p.h/2-sy,p.x+p.w/2-sx);eshot(sx,sy,Math.cos(a)*spd,Math.sin(a)*spd,kind)};
 switch(b.type){
  case'jabba':{b.mouth=Math.max(0,(b.mouth||0)-dt*2);if(b.cool<=0){const r=Math.random();if(r<0.45){b.mouth=1;for(let i=0;i<2+b.phase;i++){const vx=-rand(180,420)*(dx<0?1:-1)*-1;eshot(b.x-b.w*0.15,b.y-b.h*0.6,Math.sign(dx)*rand(200,480),-rand(300,600),'slime')}AU.fx('throw')}
    else if(r<0.75){b.state='tongue';b.st=0.9;AU.fx('hurt')}else{const mt=A&&A.minions||'gamorrean';if(G.enemies.filter(e=>!e.dead).length<2+b.phase)spawnEnemy({type:mt,x:b.x-b.w*0.6,y:b.gy});text(b.x,b.y-b.h-10,'HO HO HO HO!','#e8d87a')}b.cool=2.2}
   if(b.state==='tongue'){b.st-=dt;const tx=b.x-b.w*0.45-((0.9-b.st)/0.9)*Math.min(520,b.x-A.x0);b.tongueX=tx;if(p.y+p.h>b.gy-30&&p.x<b.x-b.w*0.4&&p.x+p.w>tx&&!p.dead)hurtPlayer({x:b.x});if(b.st<=0){b.state='idle';b.tongueX=0}}
   break}
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
 // contact / stomp
 const r=bossBox(b),pb={x:p.x,y:p.y,w:p.w,h:p.h};if(!p.dead&&ov(r,pb)){if(p.vy>80&&p.y+p.h-r.y<30){p.vy=-(window.TacoPhysics?TUNE.jabbaStompBounce||900:900);damageBoss(3,p.x+p.w/2,r.y,true);AU.fx('stomp');ring(p.x+p.w/2,r.y,'#fff',60);shake(8)}else hurtPlayer({x:b.x})}}
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
 if(L&&L.theme){const fs=ART_ALL.filter(f=>f.startsWith('art/'+L.theme+'/'));if(fs.some(f=>!D.IMG[f.replace(/\.(webp|png|jpe?g)$/,'')])){state='loading';showUI('<h2>LOADING '+(L.name||id).toUpperCase()+'…</h2>');await artTheme(L.theme,3000);if(tok!==playTok)return}}
 hideUI();state='play';$('hud').hidden=false;$('pad').hidden=false;startLevel(id)}
function levelClear(skip){if(G.clear)return;G.clear=true;G.clearT=0;const id=G.id;AU.stop();AU.fx('clear');
 const k='done:'+CH;save[k]=save[k]||{};save[k][id]=Math.max(save[k][id]||0,run.score);persist();
 if(!skip&&G.mode!=='flight'){run.score+=1000;text(G.p.x,G.p.y-60,'LEVEL CLEAR!','#ffe94b',1);TFX('confetti',G.p.x,G.p.y-40);burst(G.p.x,G.p.y,80,['#ff3b3b','#ffa23b','#ffe94b','#5ae36b','#4bb8ff','#9a5bff'],500,1.4,5)}
 setTimeout(()=>{if(!G||G.id!==id)return;stopFlight();state='clear';const last=run.idx>=run.list.length-1;
  showUI(`<h2>${last?'MISSION COMPLETE!':'LEVEL CLEAR!'}</h2><p><b>${esc(LEVELS[id].name)}</b></p><p>Score: <b>${run.score.toLocaleString()}</b> · Coins: ${run.coins} · Lives: ${run.lives}</p>`+(last?`<p>${esc(CHARS[CH].name)} saved ${CH==='taco'?'every land':'the day'}! Totally tubular!</p><button class="btn" data-a="select">PLAY AGAIN</button>`:`<button class="btn" data-a="next">NEXT LEVEL ▶</button><button class="btn alt" data-a="missions">MISSIONS</button>`))},G.mode==='flight'?300:2600)}
function gameOver(){state='over';AU.stop();stopFlight();showUI(`<h2>GAME OVER</h2><p>Score: <b>${run.score.toLocaleString()}</b></p><p>Bummer! Grab more toppings and try again.</p><button class="btn" data-a="retry">TRY AGAIN</button><button class="btn alt" data-a="missions">MISSIONS</button>`)}
function pauseGame(){if(state!=='play')return;state='pause';if(AU.ctx)AU.ctx.suspend().catch(()=>{});showUI(`<h2>PAUSED</h2><button class="btn" data-a="resume">RESUME</button><br><button class="btn alt" data-a="restart">RESTART LEVEL</button><button class="btn alt" data-a="howto">HOW TO PLAY</button><br><button class="btn dim" data-a="missions">MISSIONS</button><button class="btn dim" data-a="title">TITLE</button>`)}
function resumeGame(){if(state!=='pause')return;state='play';hideUI();if(AU.ctx)AU.ctx.resume().catch(()=>{})}
/* ---------------- UI screens ---------------- */
const esc=s=>String(s).replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
function showUI(h){$('ui').innerHTML='<div class="scr">'+h+'</div>';$('ui').querySelectorAll('[data-a]').forEach(b=>{b.addEventListener('click',e=>{e.preventDefault();AU.unlock();uiAct(b.dataset.a,b)})});$('ui').querySelectorAll('canvas[data-ch]').forEach(cc=>portrait1(cc,cc.dataset.ch))}
function hideUI(){$('ui').innerHTML=''}
let prevState='title';
function uiAct(a,b){AU.fx('pickup');
 if(a==='start')return toSelect();if(a==='quick'){CH='shera';newRun('shera',0);const i=run.list.indexOf('w3-1');run.idx=i<0?0:i;if(i<0){run.list=['w3-1'].concat(run.list)}return playCurrent()}if(a==='howto'){prevState=state;return howTo()}if(a==='back'){return prevState==='pause'?(state='pause',pauseGame0()):toTitle()}
 if(a==='char'){CH=b.dataset.ch;return missions()}if(a==='go'){newRun(CH,+b.dataset.i);return playCurrent()}
 if(a==='next'){run.idx++;run.hp=Math.max(run.hp,3);return playCurrent()}if(a==='retry'){run.lives=5;run.hp=5;return playCurrent()}
 if(a==='restart'){if(AU.ctx)AU.ctx.resume();run.hp=5;return playCurrent()}if(a==='resume')return resumeGame();
 if(a==='missions'){if(AU.ctx)AU.ctx.resume();stopFlight();G=null;return missions()}if(a==='select'){stopFlight();G=null;return toSelect()}if(a==='title'){if(AU.ctx)AU.ctx.resume();stopFlight();G=null;return toTitle()}}
function pauseGame0(){state='play';pauseGame()}
function toTitle(){state='title';$('hud').hidden=true;$('pad').hidden=true;AU.play('title');
 showUI(`<div class="sub">THE VAULT PRESENTS</div>${D.IMG['art/logo']?'<img src="art/logo.webp" alt="Taco Strike: Totally 80s" style="width:min(90vw,520px);height:auto;display:block;margin:6px auto">':'<h1>TACO STRIKE</h1><h2 style="margin-top:0">TOTALLY 80s!</h2>'}<p>Rainbow Brite · Care Bears · She-Ra · G.I. Joe · Star Wars<br>One walking taco. Every Saturday-morning land.</p><button class="btn" data-a="start">▶ START</button><button class="btn alt" data-a="quick">⚔ SHE-RA: WHISPERING WOODS</button><br><button class="btn alt" data-a="howto">HOW TO PLAY</button><p class="sub">Fan-made tribute for private play. Characters belong to their owners.</p>`)}
function toSelect(){state='select';$('hud').hidden=true;$('pad').hidden=true;AU.play('select');const keys=['shera'].concat(Object.keys(CHARS).filter(k=>k!=='shera')).filter(k=>k!=='ewok'||MISSIONS.ewok&&MISSIONS.ewok.length);
 showUI(`<h2>CHOOSE YOUR HERO</h2><div class="chars">`+keys.map(k=>`<button class="char" data-a="char" data-ch="${k}"><canvas data-ch="${k}" width="240" height="220"></canvas>${esc(CHARS[k].name)}<small>${esc(CHARS[k].tag)}</small></button>`).join('')+`</div><button class="btn dim" data-a="title">◀ BACK</button>`)}
function missions(){state='missions';$('hud').hidden=true;$('pad').hidden=true;const list=(MISSIONS[CH]&&MISSIONS[CH].length?MISSIONS[CH]:MISSIONS.taco).filter(id=>LEVELS[id]);const done=save['done:'+CH]||{};
 showUI(`<canvas data-ch="${CH}" width="240" height="200" style="position:static;width:120px;height:100px"></canvas><h2>${esc(CHARS[CH].name)}</h2><p class="sub">${esc(CHARS[CH].tag)}</p><div class="mis">`+list.map((id,i)=>{const L=LEVELS[id];return`<button class="btn ${L.mode==='flight'?'alt':''}" data-a="go" data-i="${i}">${done[id]!==undefined?'✅':'▶'} ${i+1}. ${esc(L.name)}<br><span class="sub">${esc(worldName(L))}${done[id]?' · best '+done[id].toLocaleString():''}</span></button>`}).join('')+`</div><button class="btn dim" data-a="select">◀ HEROES</button>`)}
function worldName(L){return{rainbow:'Rainbow Land',carealot:'Care-a-Lot',etheria:'Etheria · She-Ra',cobra:'G.I. Joe vs Cobra',endor:'Forest Moon of Endor',ewok:'Ewok Village',tatooine:'Tatooine',final:'Final Battle',space:'Star Wars · in space'}[L.theme]||L.theme}
function howTo(){state='howto';showUI(`<h2>HOW TO PLAY</h2><ul class="how">
<li><b>Move:</b> swipe left or right anywhere and keep your finger down. Lift to stop. No D-pad!</li>
<li><b>Jump:</b> tap <b>JUMP</b> or swipe up. Hold for a higher jump.</li>
<li><b>Throw:</b> tap <b>THROW</b>. The taco throws his toppings: lettuce (fast), tomato (lob, bounces), cheese (rapid), jalapeño (fire, goes through), salsa (3-way spread). Tap the topping box at the top to switch.</li>
<li><b>Stomp:</b> jump on enemies. Hold JUMP when you land on one for a big combo bounce. Swipe down in the air for a ground pound.</li>
<li><b>Refill:</b> grab toppings for ammo, hearts and taco shells for health, stars to be invincible.</li>
<li><b>Speeder bike:</b> swipe up or down to steer over trees and logs. THROW fires blasters.</li>
<li><b>X-wing &amp; Falcon:</b> drag to fly, hold FIRE.</li>
<li><b>Watch out:</b> the Sarlacc pulls you in. Jump to escape!</li>
<li><b>Keyboard:</b> arrows/WASD move, Space/J jump, K/X throw, Q switch topping, P pause, M mute.</li></ul>
<button class="btn" data-a="back">GOT IT</button>`)}
const SEL={taco:'taco',rainbow:'rainbow_brite',carebear:'care_bear',shera:'she_ra',joe:'gi_joe',chewie:'chewie_ewok',ewok:'chewie_ewok'};
function portrait1(cc,key){const si=D.IMG['art/select/'+SEL[key]];if(si&&key!=='ewok'){const x=cc.getContext('2d');let t=0;const dr=()=>{if(!cc.isConnected)return;t+=1/30;x.setTransform(1,0,0,1,0,0);x.clearRect(0,0,cc.width,cc.height);const g=x.createRadialGradient(cc.width/2,cc.height/2,10,cc.width/2,cc.height/2,cc.width/2);g.addColorStop(0,'#ff4fd866');g.addColorStop(1,'#00000000');x.fillStyle=g;x.fillRect(0,0,cc.width,cc.height);const s=Math.min(cc.width/si.width,cc.height/si.height)*(0.95+Math.sin(t*2)*0.02);x.drawImage(si,(cc.width-si.width*s)/2,(cc.height-si.height*s)/2+Math.sin(t*3)*3,si.width*s,si.height*s);setTimeout(()=>requestAnimationFrame(dr),40)};dr();return}const x=cc.getContext('2d');let t=0;const draw=()=>{if(!cc.isConnected)return;t+=1/30;x.setTransform(1,0,0,1,0,0);x.clearRect(0,0,cc.width,cc.height);const g=x.createRadialGradient(120,120,10,120,120,130);g.addColorStop(0,'#ff4fd855');g.addColorStop(1,'#00000000');x.fillStyle=g;x.fillRect(0,0,cc.width,cc.height);x.setTransform(2.2,0,0,2.2,120,cc.height-14);drawHero(x,key,{t,run:false,blink:(t%3)<0.1},true);setTimeout(()=>requestAnimationFrame(draw),33)};draw()}
/* ---------------- rendering ---------------- */
const HERO_ART={rainbow:'art/allies/rainbow_brite',carebear:'art/allies/care_bear_tenderheart',shera:'art/allies/she_ra',joe:'art/allies/duke',chewie:'art/allies/chewbacca',ewok:'art/allies/wicket'};
function drawHero(x,key,a,menu){
 if(key==='taco'&&D.IMG['art/hero/taco']){const fr=a.hurt?'taco_hurt':a.air?'taco_jump':a.throwT>0?'taco_throw':a.run?(Math.floor(a.t*10)%2?'taco_run1':'taco_run2'):'taco';const im=D.IMG['art/hero/'+fr]||D.IMG['art/hero/taco'];const h=64,s=h/im.height;x.drawImage(im,-im.width*s/2,-h+2,im.width*s,h);return}
 const ak=HERO_ART[key];const im=ak&&D.IMG[ak];if(im){const h=key==='chewie'?84:key==='ewok'?52:72,s=h/im.height;let dy=0,rot=0,sx=1,sy=1;if(key==='ewok'&&window.TacoPhysics){const g=TacoPhysics.ewokBob(a.t,a.run?55:0);dy=g.dy||0;rot=g.rot||0;sx=g.sx||1;sy=g.sy||1}else if(a.run){dy=-Math.abs(Math.sin(a.t*13))*3;rot=Math.sin(a.t*13)*0.05}
  x.save();x.translate(0,dy);x.rotate(rot+(a.throwT>0?-0.08:0));x.scale(sx,sy);x.drawImage(im,-im.width*s/2,-h+2,im.width*s,h);x.restore();return}
 if(key==='ewok')return D.ewok(x,a,0.85,'#7a5a3a');D.drawChar(x,key,a)}
function bossFrame(b){if(b.type!=='jabba')return;b.art=b.dead?'jabba_defeat':b.flash>0?'jabba_hurt':(b.mouth>0.3||b.state==='tongue')?'jabba_attack':'jabba'}
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
 const gl=L.goal;if(gl&&G.mode!=='bike'){const locked=G.bossType&&!(G.boss&&G.boss.dead);c.save();c.translate(gl.x+20,gl.y);c.globalAlpha=locked?0.35:1;
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
 for(const a of G.allies){if(a.x<x0||a.x>x1)continue;c.save();c.translate(a.x,a.y);if(a.face<0)c.scale(-1,1);const im=D.IMG['art/allies/'+allyKey(a.who)];if(im){const h=a.who==='chewbacca'?96:a.who==='wicket'?54:a.who==='swift_wind'?96:a.who==='twink'?40:76,s=h/im.height;let dy=Math.sin(t*3+a.x)*1.2,rot=0,sx=1,sy=1;if(a.who==='wicket'&&window.TacoPhysics){const g=TacoPhysics.ewokBob(a.t||0,a.follow?55:0);dy=g.dy;rot=g.rot;sx=g.sx;sy=g.sy}c.translate(0,dy);c.rotate(rot);c.scale(sx,sy);c.drawImage(im,-im.width*s/2,-h+2,im.width*s,h)}else D.ally(c,a.who,t);c.restore();
  if(a.sayT>0)bubble(a.x,a.y-(a.who==='chewbacca'?110:90),a.say)}
 // enemies
 for(const e of G.enemies){if(e.x<x0||e.x>x1)continue;c.save();c.translate(e.x,e.y);if(e.dead&&e.squash){c.scale(1.3,Math.max(0.15,1-(e.dt||0)*4));c.globalAlpha=Math.max(0,1-(e.dt||0)*1.5)}else if(e.dead){c.rotate((e.dt||0)*8);c.globalAlpha=Math.max(0,1-(e.dt||0))}
  if(e.ride){D.speeder(c,t,'scout');}else D.enemy(c,{type:e.type,dir:e.dir,h:e.h,w:e.w,flash:e.flash},t+e.x*0.01);c.restore()}
 // boss
 if(G.boss&&G.boss.type==='jabba'&&D.IMG['art/props/sail_barge']){const im=D.IMG['art/props/sail_barge'],k=300/im.height;c.globalAlpha=0.9;c.drawImage(im,G.boss.x-im.width*k*0.3,G.boss.gy-300+20,im.width*k,300);c.globalAlpha=1}
 if(G.boss){const b=G.boss;c.save();if(b.dead){c.globalAlpha=Math.max(0,1-b.dt*0.5);c.translate(rand(-4,4),b.dt*30)}const bb=Object.assign({},b,{x:b.x+(b.offsetX||0)});if(b.sx||b.sy){c.translate(bb.x,bb.y);c.scale(b.sx||1,b.sy||1);c.translate(-bb.x,-bb.y)}bossFrame(bb);D.boss(c,bb,t);if(b.flash>0&&!D.IMG['art/bosses/'+(bb.art||bb.type)]){c.globalCompositeOperation='lighter';c.globalAlpha=Math.min(1,b.flash*5)*0.6;c.fillStyle='#fff';c.beginPath();c.ellipse(bb.x,bb.y-b.h/2,b.w*0.6,b.h*0.55,0,0,7);c.fill()}c.restore();
  if(b.tongueX){c.strokeStyle='#c86a7a';c.lineWidth=10;c.lineCap='round';c.beginPath();c.moveTo(b.x-b.w*0.3,b.y-b.h*0.55);c.quadraticCurveTo((b.tongueX+b.x)/2,b.gy-60,b.tongueX,b.gy-14);c.stroke()}}
 // player
 drawPlayer();
 // shots
 for(const s of G.shots)D.shot(c,s,t);for(const s of G.eshots)D.shot(c,s,t);
 // particles
 for(const q of G.parts){const a=Math.max(0,q.l/q.m);if(q.ring){c.strokeStyle=q.c;c.globalAlpha=a;c.lineWidth=3;c.beginPath();c.arc(q.x,q.y,q.s*(1.2-a),0,TAU);c.stroke();c.globalAlpha=1;continue}
  if(q.add)c.globalCompositeOperation='lighter';c.globalAlpha=q.smoke?a*0.5:a;c.fillStyle=q.c;const r=q.smoke?q.s*(2-a):q.s*a;c.beginPath();c.arc(q.x,q.y,Math.max(0.5,r),0,TAU);c.fill();c.globalAlpha=1;c.globalCompositeOperation='source-over'}
 for(const tx of G.texts){c.globalAlpha=Math.min(1,tx.l*2);c.font=(tx.big?'900 24px':'800 15px')+' "Trebuchet MS",sans-serif';c.textAlign='center';c.lineWidth=4;c.strokeStyle='#000';c.strokeText(tx.s,tx.x,tx.y);c.fillStyle=tx.c;c.fillText(tx.s,tx.x,tx.y);c.globalAlpha=1}}
function allyKey(w){return{tenderheart:'care_bear_tenderheart'}[w]||w}
function circ(x,y,r,f){c.beginPath();c.arc(x,y,r,0,TAU);c.fillStyle=f;c.fill()}
function bubble(x,y,s){c.font='700 14px "Trebuchet MS",sans-serif';const lines=wrap(s,190);const w=Math.max(...lines.map(l=>c.measureText(l).width))+20,h=lines.length*17+12;const bx=clamp(x,G.cam.x+w/2+6,G.cam.x+viewW-w/2-6),by=Math.max(G.cam.y+h+8,y);c.fillStyle='#fffffff0';c.strokeStyle='#ff4fd8';c.lineWidth=2;D.rr(c,bx-w/2,by-h,w,h,10);c.fill();c.stroke();c.beginPath();c.moveTo(x-6,by-1);c.lineTo(x,by+10);c.lineTo(x+6,by-1);c.fill();c.fillStyle='#2a0a4a';c.textAlign='center';lines.forEach((l,i)=>c.fillText(l,bx,by-h+20+i*17))}
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
 drawHero(c,CH,{t:G.t,run:p.onGround&&Math.abs(p.vx)>30,air:!p.onGround,throwT:p.throwT,hurt:p.inv>1,blink:(G.t%3.5)<0.1});
 c.restore()}
function drawSarlacc(h){const cx=h.x+h.w/2,y=h.y,t=G.t;const pull=h.pull||0;const im=D.IMG['art/props/sarlacc'];
 if(im){const w=Math.max(h.w*1.25,170),s=w/im.width,hh=im.height*s;c.save();c.translate(cx,y+hh*0.42);c.scale(1+pull*0.06+Math.sin(t*3)*0.01,1+pull*0.08);c.drawImage(im,-w/2,-hh*0.62,w,hh);c.restore();c.save();c.strokeStyle='#9a6a4a';c.lineWidth=5;c.lineCap='round';for(let k=0;k<4;k++){const side=k<2?-1:1,len=10+pull*80+Math.sin(t*2+k)*8;c.beginPath();c.moveTo(cx+side*(10+k%2*8),y);c.quadraticCurveTo(cx+side*(26+k*6),y-len*0.7,cx+side*(18+k*8)+Math.sin(t*3+k)*10,y-len);c.stroke()}c.restore();return}
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
 if(!portrait)drawTopBandAt(10,10,viewW);
 // banner
 if(G.banner&&G.banner.t>0){const b=G.banner;const a=Math.min(1,b.t*2,(b.tt||0)*3);c.globalAlpha=Math.min(1,b.t);c.font='900 '+(b.boss?34:30)+'px "Trebuchet MS",Impact,sans-serif';c.textAlign='center';c.lineWidth=6;c.strokeStyle='#000';const y=VV*0.38;c.strokeText(b.s,viewW/2,y);const g=c.createLinearGradient(0,y-30,0,y);g.addColorStop(0,'#fff');g.addColorStop(0.5,b.boss?'#ff5a2a':'#ffe94b');g.addColorStop(1,b.boss?'#ff2a2a':'#ff4fd8');c.fillStyle=g;c.fillText(b.s,viewW/2,y);if(!b.boss){c.font='700 15px "Trebuchet MS"';c.fillStyle='#fff';c.strokeText(worldName(G.L),viewW/2,y+26);c.fillText(worldName(G.L),viewW/2,y+26)}c.globalAlpha=1}
 // boss bar
 if(G.boss&&!G.boss.dead){const b=G.boss,w=Math.min(420,viewW-40),x=(viewW-w)/2,y=VV-34;c.fillStyle='#000a';D.rr(c,x-4,y-18,w+8,32,8);c.fill();c.fillStyle='#400';c.fillRect(x,y,w,10);const g=c.createLinearGradient(x,0,x+w,0);g.addColorStop(0,'#ff2a2a');g.addColorStop(1,'#ffcc33');c.fillStyle=g;c.fillRect(x,y,w*Math.max(0,b.hp/b.max),10);c.font='800 12px "Trebuchet MS"';c.textAlign='center';c.fillStyle='#fff';c.fillText(b.name.toUpperCase(),viewW/2,y-4)}
 if(G.mode==='bike'){const f=clamp(p.x/G.L.goal.x,0,1),w=Math.min(300,viewW-160),x=(viewW-w)/2,y=VV-18;c.fillStyle='#0008';c.fillRect(x,y,w,6);c.fillStyle='#7ff7ff';c.fillRect(x,y,w*f,6);c.fillStyle='#fff';c.beginPath();c.arc(x+w*f,y+3,5,0,TAU);c.fill()}}
function drawTopBand(){const h=gameTop,w=W;const s=Math.min(clamp(h/62,0.7,1.25),(w-136)/(G.p.maxHp*22+190));c.save();c.translate(8,Math.max(4,h-60*s-6));c.scale(s,s);drawTopBandAt(0,0,(w-130)/s);c.restore()}
function drawTopBandAt(x,y,maxW){const p=G.p,ch=CHARS[CH];c.save();c.translate(x,y);
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
function updateCam(dt){const p=G.p;const look=G.mode==='bike'?viewW*0.28:viewW*(p.face>0?0.38:0.62);let tx=p.x+p.w/2-look;if(G.mode==='bike')tx=p.x-viewW*0.25;
 G.cam.x=lerp(G.cam.x,tx,Math.min(1,dt*(G.mode==='bike'?20:6)));if(G.arena){G.cam.x=clamp(G.cam.x,G.arena.x0,Math.max(G.arena.x0,G.arena.x1-viewW))}
 G.cam.x=clamp(G.cam.x,0,Math.max(0,G.L.width-viewW));G.cam.minX=G.cam.x;
 const ty=clamp(p.y+p.h/2-VV*0.55,0,VH-VV);G.cam.y=VV>=VH?0:lerp(G.cam.y,ty,Math.min(1,dt*4))}
function update(dt){G.t+=dt;const p=G.p;if(G.banner)G.banner.t-=dt;if(G.flash>0)G.flash-=dt*1.5;if(G.shake>0)G.shake=Math.max(0,G.shake-dt*40);if(G.comboT>0){G.comboT-=dt;if(G.comboT<=0)G.combo=0}
 if(p.inv>0)p.inv-=dt;if(p.star>0)p.star-=dt;if(p.throwT>0)p.throwT-=dt;if(p.cool>0)p.cool-=dt;
 if(p.dead){G.deadT-=dt;if(G.deadT<=0)respawn()}
 if(G.mode==='bike'){stepBike(dt)}
 else if(!p.dead&&!G.clear){if(!p.capT)stepPlayer(dt);if(inp.throwPressed||(inp.throw&&CHARS[CH].weapon!=='toppings'&&p.cool<=0)||(inp.throw&&p.cool<=0))doThrow()}
 else if(G.clear){p.vx*=0.9;p.x+=60*dt}
 stepWorld(dt);
 if(G.mode!=='bike')stepEnemies(dt);
 if(G.bossType&&!G.boss&&p.x>(G.L.arena?G.L.arena.x0:(G.L.bossX||G.L.width-900)-viewW*0.45))spawnBoss();
 stepBoss(dt);stepShots(dt);
 for(const q of G.parts){q.l-=dt;q.vx*=0.98;q.vy+=q.g*dt;q.x+=q.vx*dt;q.y+=q.vy*dt}G.parts=G.parts.filter(q=>q.l>0);if(G.parts.length>700)G.parts.splice(0,G.parts.length-700);
 for(const t of G.texts){t.l-=dt;t.y-=40*dt}G.texts=G.texts.filter(t=>t.l>0);
 if(window.TacoFX){TacoFX.step(dt);TacoFX.updateAmbient(dt,G.cam.x,G.cam.y,viewW,VV)}
 if(window.TacoPhysics&&TacoPhysics.fx){const f=TacoPhysics.fx.update(dt);if(f.x||f.y)G.shake=Math.max(G.shake,Math.hypot(f.x,f.y))}
 updateCam(dt)}
let last=0;
function frame(ts){const dt=Math.min(0.05,last?(ts-last)/1000:0);last=ts;tGlobal+=dt;
 try{if(state==='play'&&G){if(G.fl){readInput();G.fl.update(dt,{L:K.L,R:K.R,U:K.U,D:K.D,fire:!!K.T});G.fl.draw();if(G.flDeadT>0){G.flDeadT-=dt;if(G.flDeadT<=0){if(run.lives<=0)gameOver();else playCurrent()}}}
   else{readInput();if(inp.cycle){}if(G.hs>0)G.hs-=dt;else update(dt)}}
  else if(G&&G.fl&&state==='pause'){/* frozen */}
  if(!(G&&G.fl))render(dt)}catch(e){console.error(e);window.__taco.err=String(e&&e.stack||e)}
 requestAnimationFrame(frame)}
/* tap the ammo box to switch topping; Q key too */
function cycleTop(){if(!run||CHARS[CH].weapon!=='toppings')return;const have=TOPS.filter(t=>run.ammo[t]>0);if(!have.length)return;const i=have.indexOf(run.sel);run.sel=have[(i+1)%have.length];AU.fx('coin')}
addEventListener('keydown',e=>{if(e.code==='KeyQ'||e.code==='KeyC')cycleTop()});
cv.addEventListener('touchstart',e=>{if(state!=='play'||!G||G.fl||!HUDR.ammo)return;for(const t of e.changedTouches){const r=HUDR.ammo;let x=t.clientX,y=t.clientY;if(portrait){const s=Math.min(clamp(gameTop/62,0.7,1.25),(W-136)/(G.p.maxHp*22+190));x=(x-8)/s;y=(y-Math.max(4,gameTop-60*s-6))/s}else{x=x/S-10;y=(y-gameTop)/S-10}if(x>=r.x-0&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h+10){cycleTop();TOUCH.delete(t.identifier)}}},{passive:true});
$('bPause').addEventListener('click',e=>{e.preventDefault();if(state==='play')pauseGame();else if(state==='pause')resumeGame()});
$('bMute').addEventListener('click',e=>{e.preventDefault();AU.unlock();AU.mute(!AU.muted)});$('bMute').textContent=AU.muted?'🔇':'🔊';
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='play')pauseGame()});
/* ---------------- boot ---------------- */
(async()=>{showUI('<h2>LOADING…</h2><p>Warming up the tortillas</p>');await loadParts();
 for(const id of Object.keys(LEVELS)){const L=LEVELS[id];if(L.mode==='flight'&&!L.flightId)L.flightId=FLIGHT_ALIAS[id]||id}
 requestAnimationFrame(frame);const q=new URLSearchParams(location.search);
 if(q.get('play')){const ch=q.get('char')||'taco';newRun(ch,0);const i=run.list.indexOf(q.get('play'));if(i>=0)run.idx=i;else{run.list=[q.get('play')];run.idx=0}playCurrent()}else toTitle();
 window.__taco.ready=true})();
const FLIGHT_ALIAS={'xw-1':'xwing','xw-2':'xwing','falcon-1':'falcon'};
Object.defineProperties(window.__taco,{state:{get:()=>state},run:{get:()=>run},G:{get:()=>G}});Object.assign(window.__taco,{spawnEnemy:e=>spawnEnemy(e),CHARS,inp,startLevel:(id,ch)=>{newRun(ch||'taco',0);run.list=[id];playCurrent()},LEVELS:()=>LEVELS,MISSIONS:()=>MISSIONS});
})();
