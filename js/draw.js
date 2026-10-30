/* Taco Strike: procedural HD-ish art. Used when a team art file is missing (IMG[key]). */
(function(){
const D={},IMG={};D.IMG=IMG;
const TAU=Math.PI*2;
function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()}
D.rr=rr;
function lg(c,x0,y0,x1,y1,stops){const g=c.createLinearGradient(x0,y0,x1,y1);stops.forEach((s,i)=>g.addColorStop(s[0],s[1]));return g}
function rg(c,x,y,r0,r1,stops){const g=c.createRadialGradient(x,y,r0,x,y,r1);stops.forEach(s=>g.addColorStop(s[0],s[1]));return g}
function circ(c,x,y,r,f){c.beginPath();c.arc(x,y,r,0,TAU);c.fillStyle=f;c.fill()}
function ell(c,x,y,rx,ry,f,rot=0){c.beginPath();c.ellipse(x,y,rx,ry,rot,0,TAU);c.fillStyle=f;c.fill()}
D.circ=circ;D.ell=ell;
function rnd(seed){let s=seed>>>0||1;return()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return((s>>>0)%100000)/100000}}
D.rnd=rnd;

/* ---------- THEMES ---------- */
const TH={
 rainbow:{sky:['#2b0b5e','#a2208f','#ff7ab8','#ffd27a'],hill:['#ff86c8','#b44bff','#5d2bd6'],ground:'#7be36b',dirt:'#8a3fd1',accent:'#fff07a',fog:'#ffb3e6'},
 carealot:{sky:['#7fc8ff','#b9e2ff','#ffd6f0','#fff4fb'],hill:['#ffffff','#eaf4ff','#d4e6ff'],ground:'#ffffff',dirt:'#c9d9ff',accent:'#ff6fae',fog:'#ffffff'},
 etheria:{sky:['#120526','#3b1066','#a03cc9','#ffb36b'],hill:['#5a2a8a','#341460','#1d0a3a'],ground:'#9a8fb8',dirt:'#4b3b6e',accent:'#7ff7ff',fog:'#d38cff'},
 cobra:{sky:['#020611','#0b1a2e','#2a2f3a','#6b2a1a'],hill:['#1b2a1a','#122012','#0a140a'],ground:'#6b6a5a',dirt:'#3a3528',accent:'#ff3a2a',fog:'#ff6a3a'},
 endor:{sky:['#0d2a1a','#2f5a33','#86a86a','#d8e8b0'],hill:['#3a2a1a','#2a1c10','#1a1008'],ground:'#3f6a2a',dirt:'#3a2614',accent:'#ffd27a',fog:'#c8e0b0'},
 ewok:{sky:['#0a1a12','#244a2e','#6a8a52','#e8c27a'],hill:['#4a321c','#352312','#22160a'],ground:'#6a4a2a',dirt:'#3a2614',accent:'#ffb347',fog:'#e8d2a0'},
 tatooine:{sky:['#3a6ab8','#7fb2e8','#f2d9a8','#ffe3b0'],hill:['#e8b878','#d49a5a','#b8783a'],ground:'#e6c48a',dirt:'#b88a4e',accent:'#fff2c0',fog:'#ffe8c0'},
 final:{sky:['#000000','#1a0010','#5a0020','#ff2a00'],hill:['#2a0a0a','#1a0505','#0a0202'],ground:'#4a4a52',dirt:'#1a1a22',accent:'#ff2a2a',fog:'#ff4a2a'},
 space:{sky:['#000006','#050318','#0a0830','#120a40'],hill:[],ground:'#333',dirt:'#111',accent:'#7ff7ff',fog:'#4a6aff'},
};
D.TH=TH;

/* background: far sky + sun/planets + 3 parallax layers */
const bgCache={};
function layerCanvas(theme,layer,w,h){const k=theme+layer;if(bgCache[k])return bgCache[k];const cv=document.createElement('canvas');cv.width=w;cv.height=h;const c=cv.getContext('2d');const T=TH[theme]||TH.rainbow;const R=rnd(theme.length*97+layer*13);
 const col=T.hill[layer]||'#222';
 if(theme==='carealot'){ // clouds
  for(let i=0;i<9;i++){const x=R()*w,y=h*(0.45+layer*0.15)+R()*40,s=60+R()*80+layer*30;for(let j=0;j<6;j++)circ(c,x+(j-3)*s*0.45,y-Math.sin(j)*s*0.3,s*(0.45+R()*0.3),col);}
  if(layer===0)for(let i=0;i<3;i++){const x=150+i*500+R()*100,y=h*0.42;c.fillStyle='#fff';rr(c,x-40,y-160,80,170,20);c.fill();c.fillStyle='#ffd6ef';rr(c,x-56,y-190,112,40,18);c.fill();c.fillStyle='#ff6fae';c.beginPath();const hx=x,hy=y-110;c.moveTo(hx,hy+14);c.bezierCurveTo(hx-26,hy-8,hx-10,hy-26,hx,hy-12);c.bezierCurveTo(hx+10,hy-26,hx+26,hy-8,hx,hy+14);c.fill();}
  c.fillStyle=col;c.fillRect(0,h*0.8+layer*20,w,h);
 }else if(theme==='endor'||theme==='ewok'){ // redwood trunks
  const n=layer===0?14:layer===1?8:5;for(let i=0;i<n;i++){const x=R()*w,tw=(layer+1)*22+R()*30;const g=lg(c,x,0,x+tw,0,[[0,'#00000000'],[0,col],[0.35,shade(col,40)],[1,shade(col,-30)]]);c.fillStyle=g;c.fillRect(x,0,tw,h);c.fillStyle=shade(col,-40);for(let y=0;y<h;y+=18)c.fillRect(x+R()*tw,y,2,12+R()*20);
   if(theme==='ewok'&&layer===1&&i%2==0){const hy=120+R()*150;c.fillStyle='#5a3a1c';c.beginPath();c.ellipse(x+tw/2,hy,tw*1.2,22,0,0,TAU);c.fill();c.fillStyle='#8a6a3a';c.beginPath();c.moveTo(x+tw/2-tw,hy-10);c.lineTo(x+tw/2,hy-60);c.lineTo(x+tw/2+tw,hy-10);c.fill();c.fillStyle='#ffb347';circ(c,x+tw/2,hy-2,5,'#ffcf6a');}
  }
  c.fillStyle=shade(col,-20);c.fillRect(0,h*0.86,w,h);for(let i=0;i<40;i++){ell(c,R()*w,h*0.86,20+R()*40,10+R()*14,layer==2?'#2a4a1a':'#3a5a2a')}
 }else if(theme==='tatooine'){ // dunes + mesas
  if(layer===0){c.fillStyle=col;for(let i=0;i<4;i++){const x=R()*w;c.beginPath();c.moveTo(x-90,h*0.62);c.lineTo(x-60,h*0.45);c.lineTo(x+70,h*0.45);c.lineTo(x+100,h*0.62);c.fill()}}
  c.fillStyle=col;c.beginPath();c.moveTo(0,h);for(let x=0;x<=w;x+=20)c.lineTo(x,h*(0.62+layer*0.09)+Math.sin(x/(160+layer*60)+layer)*24+Math.sin(x/53)*6);c.lineTo(w,h);c.fill();
  c.fillStyle=lg(c,0,h*0.6,0,h,[[0,'#ffffff22'],[1,'#00000022']]);c.fill();
  if(layer===1)for(let i=0;i<3;i++){const x=R()*w,y=h*0.66;c.fillStyle='#d9c3a0';rr(c,x,y-34,60,34,24);c.fill();circ(c,x+30,y-34,22,'#e6d2b0');c.fillStyle='#6b5640';c.fillRect(x+24,y-20,12,20)}
 }else if(theme==='cobra'||theme==='final'){ // bunkers, towers
  c.fillStyle=col;c.beginPath();c.moveTo(0,h);for(let x=0;x<=w;x+=40)c.lineTo(x,h*(0.6+layer*0.1)+Math.sin(x/120+layer*2)*20);c.lineTo(w,h);c.fill();
  const n=layer==0?6:4;for(let i=0;i<n;i++){const x=R()*w,bw=60+R()*80,bh=80+R()*160*(1-layer*0.3);c.fillStyle=shade(col,10+layer*5);c.fillRect(x,h*0.7-bh,bw,bh+200);c.fillStyle=shade(col,25);c.fillRect(x+bw*0.4,h*0.7-bh-40,8,40);for(let k=0;k<5;k++){c.fillStyle=R()<0.5?(theme=='final'?'#ff3a2a':'#ffcc55'):'#223';c.fillRect(x+8+k*(bw-16)/5,h*0.7-bh+16,8,6)}
   if(layer==0){circ(c,x+bw*0.4+4,h*0.7-bh-44,5,'#ff2a2a')}}
  if(layer===1&&theme==='cobra')for(let i=0;i<6;i++){const x=R()*w;c.fillStyle='#0d1a0d';for(let k=0;k<6;k++){c.save();c.translate(x,h*0.72);c.rotate(-1.2+k*0.45);ell(c,30,0,34,8,'#1a3a1a');c.restore()}c.fillRect(x-3,h*0.72,6,200)}
 }else if(theme==='etheria'){ // crystal spires and woods
  if(layer===0)for(let i=0;i<5;i++){const x=R()*w,sh=140+R()*180;c.fillStyle=lg(c,x,h*0.7-sh,x,h*0.7,[[0,'#d8b4ff'],[1,col]]);c.beginPath();c.moveTo(x-30,h*0.7);c.lineTo(x,h*0.7-sh);c.lineTo(x+30,h*0.7);c.fill();c.fillStyle='#ffffff55';c.beginPath();c.moveTo(x,h*0.7-sh);c.lineTo(x+8,h*0.7);c.lineTo(x+30,h*0.7);c.fill()}
  c.fillStyle=col;c.beginPath();c.moveTo(0,h);for(let x=0;x<=w;x+=30)c.lineTo(x,h*(0.66+layer*0.08)+Math.sin(x/140+layer)*26);c.lineTo(w,h);c.fill();
  if(layer>0)for(let i=0;i<10;i++){const x=R()*w,y=h*(0.66+layer*0.08);c.fillStyle=shade(col,-15);c.fillRect(x-4,y-80,8,90);circ(c,x,y-90,30+R()*16,shade(col,-5));circ(c,x-18,y-76,20,shade(col,-10))}
 }else{ // rainbow land: rolling candy hills with crystal flowers
  c.fillStyle=lg(c,0,h*0.5,0,h,[[0,col],[1,shade(col,-30)]]);c.beginPath();c.moveTo(0,h);for(let x=0;x<=w;x+=20)c.lineTo(x,h*(0.6+layer*0.09)+Math.sin(x/(150+layer*40)+layer*1.7)*30);c.lineTo(w,h);c.fill();
  for(let i=0;i<(layer+1)*6;i++){const x=R()*w,y=h*(0.66+layer*0.09);const hue=Math.floor(R()*360);c.fillStyle='hsl('+hue+',90%,70%)';c.beginPath();c.moveTo(x,y-26-layer*8);c.lineTo(x+7,y);c.lineTo(x-7,y);c.fill();circ(c,x,y-28-layer*8,4,'#fff')}
 }
 bgCache[k]=cv;return cv}
function shade(hex,p){let n=parseInt(hex.slice(1),16),r=(n>>16)&255,g=(n>>8)&255,b=n&255;const f=v=>Math.max(0,Math.min(255,Math.round(v+p*2.55)));return'#'+((1<<24)+(f(r)<<16)+(f(g)<<8)+f(b)).toString(16).slice(1)}
D.shade=shade;

D.background=function(c,theme,camX,W,H,t,viewH){
 const T=TH[theme]||TH.rainbow;const vh=viewH||540;
 // sky
 const img=IMG['art/'+theme+'/far'];
 if(img){const s=vh/img.height,iw=img.width*s,off=-((camX*0.1)%iw);for(let x=off;x<W;x+=iw)c.drawImage(img,x,0,iw,vh)}
 else{c.fillStyle=lg(c,0,0,0,vh,T.sky.map((col,i)=>[i/(T.sky.length-1),col]));c.fillRect(0,0,W,vh);
  if(theme==='rainbow'){c.save();c.globalAlpha=0.55;const cols=['#ff3b3b','#ff9a2e','#ffe63b','#4be36b','#3bb3ff','#7a4bff'];for(let i=0;i<6;i++){c.beginPath();c.arc(W*0.6-camX*0.03,vh*0.75,vh*0.62-i*14,Math.PI,TAU);c.lineWidth=15;c.strokeStyle=cols[i];c.stroke()}c.restore();stars(c,W,vh*0.5,t,40,'#fff')}
  else if(theme==='etheria'||theme==='final'){stars(c,W,vh*0.6,t,70,'#fff');circ(c,W*0.8-camX*0.02,vh*0.25,46,rg(c,W*0.8-camX*0.02,vh*0.25,0,60,[[0,'#ffe0ff'],[0.7,theme=='final'?'#ff4a2a':'#d38cff'],[1,'#00000000']]))}
  else if(theme==='cobra'){stars(c,W,vh*0.5,t,50,'#cde');// searchlights
   c.save();c.globalCompositeOperation='lighter';for(let i=0;i<3;i++){const a=Math.sin(t*0.6+i*2)*0.5-Math.PI/2,x=W*(0.2+i*0.3);c.fillStyle=lg(c,x,vh,x+Math.cos(a)*vh,vh+Math.sin(a)*vh,[[0,'#ffffaa40'],[1,'#ffffaa00']]);c.beginPath();c.moveTo(x,vh*0.8);c.lineTo(x+Math.cos(a-0.08)*vh*1.2,vh*0.8+Math.sin(a-0.08)*vh*1.2);c.lineTo(x+Math.cos(a+0.08)*vh*1.2,vh*0.8+Math.sin(a+0.08)*vh*1.2);c.fill()}c.restore()}
  else if(theme==='tatooine'){circ(c,W*0.7-camX*0.02,vh*0.22,30,rg(c,W*0.7-camX*0.02,vh*0.22,0,70,[[0,'#fffbe0'],[0.45,'#fff2a0'],[1,'#ffffff00']]));circ(c,W*0.82-camX*0.02,vh*0.3,22,rg(c,W*0.82-camX*0.02,vh*0.3,0,52,[[0,'#ffe8d0'],[0.45,'#ffc080'],[1,'#ffffff00']]))}
  else if(theme==='carealot'){circ(c,W*0.2-camX*0.02,vh*0.2,50,rg(c,W*0.2,vh*0.2,0,110,[[0,'#fffbe0'],[0.4,'#fff1a8'],[1,'#ffffff00']]))}
  else if(theme==='endor'||theme==='ewok'){c.save();c.globalCompositeOperation='lighter';for(let i=0;i<5;i++){const x=((i*330-camX*0.15)%(W+400)+W+400)%(W+400)-200;c.fillStyle=lg(c,x,0,x+120,vh,[[0,'#fff6c040'],[1,'#fff6c000']]);c.beginPath();c.moveTo(x,0);c.lineTo(x+60,0);c.lineTo(x+220,vh);c.lineTo(x+120,vh);c.fill()}c.restore()}
 }
 // 3 parallax layers
 const fac=[0.2,0.4,0.65];const hasArt=!!IMG['art/'+theme+'/far'];
 for(let L=0;L<3;L++){if(theme==='space'&&!hasArt)break;if(hasArt&&L===0)continue;const im=hasArt?IMG['art/'+theme+'/'+(L==1?'mid':'near')]:null;if(hasArt&&!im)continue;
  const lc=im||layerCanvas(theme,L,1600,540);const s=vh/lc.height,iw=lc.width*s,off=-((camX*fac[L])%iw);
  for(let x=off-iw;x<W+iw;x+=iw)if(x+iw>0&&x<W)c.drawImage(lc,x,0,iw,vh);
  // atmospheric fog between layers
  c.fillStyle=lg(c,0,vh*0.4,0,vh,[[0,T.fog+'00'],[1,T.fog+(L==0?'40':'22')]]);c.fillRect(0,0,W,vh)}
};
function stars(c,W,H,t,n,col){const R=rnd(7);c.fillStyle=col;for(let i=0;i<n;i++){const x=R()*W,y=R()*H,s=R()*1.8+0.4;c.globalAlpha=0.4+0.6*Math.abs(Math.sin(t*1.5+i));c.fillRect(x,y,s,s)}c.globalAlpha=1}
D.stars=stars;

/* ---------- ground & platforms ---------- */
const tileCache={};
function groundTile(theme){if(tileCache[theme])return tileCache[theme];const im=IMG['art/'+theme+'/ground'];if(im){tileCache[theme]=im;return im}
 const T=TH[theme]||TH.rainbow,cv=document.createElement('canvas');cv.width=128;cv.height=128;const c=cv.getContext('2d'),R=rnd(theme.length*31);
 c.fillStyle=lg(c,0,0,0,128,[[0,shade(T.dirt,10)],[1,shade(T.dirt,-25)]]);c.fillRect(0,0,128,128);
 for(let i=0;i<40;i++){ell(c,R()*128,20+R()*108,3+R()*8,2+R()*5,shade(T.dirt,R()*30-15))}
 if(theme==='cobra'||theme==='final'){c.strokeStyle='#0005';for(let y=0;y<128;y+=32){c.strokeRect(0,y,64,32);c.strokeRect(64,y+16,64,32)}}
 if(theme==='etheria'){for(let i=0;i<6;i++){c.fillStyle='#b8f8ff66';c.beginPath();const x=R()*128,y=30+R()*90;c.moveTo(x,y-8);c.lineTo(x+5,y);c.lineTo(x,y+8);c.lineTo(x-5,y);c.fill()}}
 c.fillStyle=lg(c,0,0,0,18,[[0,shade(T.ground,25)],[1,T.ground]]);c.beginPath();c.moveTo(0,0);c.lineTo(128,0);c.lineTo(128,14);for(let x=128;x>=0;x-=8)c.lineTo(x,14+Math.sin(x*0.7)*4+4);c.fill();
 c.fillStyle='#ffffff55';c.fillRect(0,0,128,3);
 tileCache[theme]=cv;return cv}
D.solid=function(c,theme,x,y,w,h){const tl=groundTile(theme),fill=IMG['art/'+theme+'/ground_fill']||tl;c.save();c.beginPath();c.rect(x,y,w,h);c.clip();for(let tx=Math.floor(x/128)*128;tx<x+w;tx+=128){c.drawImage(tl,tx,y,128,128);for(let ty=y+128;ty<y+h;ty+=128)c.drawImage(fill,tx,ty,128,128)}
 c.fillStyle=lg(c,0,y,0,y+h,[[0,'#00000000'],[1,'#00000066']]);c.fillRect(x,y,w,h);c.restore();
 c.fillStyle='#00000033';c.fillRect(x+w-4,y+4,4,h-4)};
D.platform=function(c,theme,p,t){const T=TH[theme]||TH.rainbow;const x=p.x,y=p.y,w=p.w,h=p.h||24;
 if(p.type==='cloud'||(theme==='carealot'&&p.type!=='solid')){for(let i=0;i<w;i+=22)circ(c,x+i+11,y+10+Math.sin(i)*2,15,'#ffffff');circ(c,x+w/2,y+4,18,'#ffffff');c.fillStyle='#d8e8ff';c.fillRect(x+6,y+14,w-12,8);return}
 if(p.type==='bridge'){c.strokeStyle='#5a3a1c';c.lineWidth=2;c.beginPath();c.moveTo(x,y-30);c.quadraticCurveTo(x+w/2,y-12,x+w,y-30);c.stroke();for(let i=0;i<w;i+=14){const sag=Math.sin(i/w*Math.PI)*8;c.fillStyle=i%28?'#8a5a2a':'#7a4a1a';c.fillRect(x+i,y+sag,12,8);c.beginPath();c.moveTo(x+i+6,y+sag);c.lineTo(x+i+6,y-26+sag*0.6);c.stroke()}return}
 if(p.type==='ladder'){c.strokeStyle='#8a5a2a';c.lineWidth=4;c.beginPath();c.moveTo(x+4,y);c.lineTo(x+4,y+p.h);c.moveTo(x+w-4,y);c.lineTo(x+w-4,y+p.h);for(let k=8;k<p.h;k+=18){c.moveTo(x+4,y+k);c.lineTo(x+w-4,y+k)}c.stroke();return}
 if(p.type==='crumble'){c.globalAlpha=p.fall?0.7:1}
 if(theme==='rainbow'&&p.type!=='solid'){const cols=['#ff4b6b','#ffa23b','#ffe94b','#5ae36b','#4bb8ff','#9a5bff'];for(let i=0;i<6;i++){c.fillStyle=cols[i];c.fillRect(x,y+i*h/6,w,h/6+0.5)}c.fillStyle='#ffffff66';c.fillRect(x,y,w,3);c.globalAlpha=1;return}
 if(theme==='etheria'&&p.type!=='solid'){c.fillStyle=lg(c,x,y,x,y+h,[[0,'#e8d0ff'],[1,'#7a4bc8']]);c.beginPath();c.moveTo(x,y);c.lineTo(x+w,y);c.lineTo(x+w-10,y+h);c.lineTo(x+10,y+h);c.fill();c.fillStyle='#ffffff88';c.fillRect(x,y,w,2);c.save();c.globalCompositeOperation='lighter';c.fillStyle='#7ff7ff22';c.fillRect(x,y-4,w,4);c.restore();c.globalAlpha=1;return}
 if(theme==='ewok'||theme==='endor'){c.fillStyle='#6a4220';rr(c,x,y,w,h,6);c.fill();c.fillStyle='#8a5a2e';for(let i=0;i<w;i+=16)c.fillRect(x+i+1,y+2,14,h-6);c.fillStyle='#a8743c';c.fillRect(x,y,w,3);c.globalAlpha=1;return}
 if(theme==='tatooine'){c.fillStyle=lg(c,x,y,x,y+h,[[0,'#d8b07a'],[1,'#8a6a3a']]);rr(c,x,y,w,h,8);c.fill();c.fillStyle='#fff2c055';c.fillRect(x+4,y,w-8,3);c.globalAlpha=1;return}
 if(theme==='cobra'||theme==='final'){c.fillStyle=lg(c,x,y,x,y+h,[[0,'#8a8f9a'],[1,'#3a3f4a']]);c.fillRect(x,y,w,h);c.fillStyle='#ffcc00';for(let i=0;i<w;i+=20){c.beginPath();c.moveTo(x+i,y+h-6);c.lineTo(x+i+10,y+h-6);c.lineTo(x+i+16,y+h);c.lineTo(x+i+6,y+h);c.fill()}c.fillStyle='#fff3';c.fillRect(x,y,w,2);c.globalAlpha=1;return}
 D.solid(c,theme,x,y,w,h);c.globalAlpha=1};

/* ---------- characters ---------- */
function eyes(c,x,y,s,look,blink){[ -1,1].forEach(k=>{ell(c,x+k*5*s,y,4*s,(blink?0.6:5)*s,'#fff');if(!blink)circ(c,x+k*5*s+look*1.5*s,y+0.5*s,2.3*s,'#111');if(!blink)circ(c,x+k*5*s+look*1.5*s+0.8*s,y-1*s,0.8*s,'#fff')})}
D.drawTaco=function(c,a){const t=a.t,run=a.run,s=1;const bob=run?Math.abs(Math.sin(t*14))*3:Math.sin(t*3)*1.2;
 const leg=run?Math.sin(t*14)*8:0;
 c.lineCap='round';
 // legs + sneakers
 c.strokeStyle='#e8b44a';c.lineWidth=4;c.beginPath();c.moveTo(-7,-8);c.lineTo(-7+leg*0.8,0);c.moveTo(7,-8);c.lineTo(7-leg*0.8,0);c.stroke();
 [[-7+leg*0.8],[7-leg*0.8]].forEach(([lx])=>{ell(c,lx+3,0,7,3.6,'#ff2a6a');c.fillStyle='#fff';c.fillRect(lx-3,0,12,1.5)});
 c.save();c.translate(0,-bob);
 // fillings poking out the top
 const F=[['#3cc84a',-18],['#d8261c',-9],['#ffd23a',0],['#3cc84a',8],['#d8261c',16],['#4caf32',-14]];
 for(let i=0;i<14;i++){const fx=-20+i*3,fy=-38+Math.sin(i*1.7+t*2)*1.5;ell(c,fx,fy,4,6,i%3==0?'#5ad84a':i%3==1?'#38b03a':'#7ae85a',Math.sin(i))}
 circ(c,-10,-38,4.5,'#e8302a');circ(c,2,-40,4.5,'#e8302a');circ(c,13,-37,4,'#e8302a');circ(c,-10,-38,2,'#ff7a6a');circ(c,2,-40,2,'#ff7a6a');
 c.strokeStyle='#ffcc22';c.lineWidth=2;for(let i=0;i<7;i++){c.beginPath();c.moveTo(-16+i*5,-34);c.quadraticCurveTo(-14+i*5,-44,-12+i*5,-36);c.stroke()}
 ell(c,8,-41,3,2,'#2a8a1a');ell(c,-4,-42,3,2,'#3aa02a');
 // shell (half moon)
 c.beginPath();c.moveTo(-24,-34);c.bezierCurveTo(-26,-4,26,-4,24,-34);c.bezierCurveTo(18,-30,-18,-30,-24,-34);c.closePath();
 c.fillStyle=lg(c,0,-36,0,-6,[[0,'#ffe08a'],[0.5,'#f2b640'],[1,'#c07a1a']]);c.fill();c.strokeStyle='#8a4a0a';c.lineWidth=1.5;c.stroke();
 // shell spots / toasty texture
 const R=rnd(5);for(let i=0;i<16;i++){ell(c,-18+R()*36,-28+R()*16,1.6,1,'#b8701c88')}
 c.fillStyle='#ffffff55';c.beginPath();c.ellipse(-10,-26,8,3,-0.3,0,TAU);c.fill();
 // face
 eyes(c,2,-24,0.9,1,a.blink);c.strokeStyle='#5a2a0a';c.lineWidth=1.6;c.beginPath();if(a.hurt){c.arc(2,-14,3,Math.PI,TAU)}else c.arc(2,-17,4,0.2,Math.PI-0.2);c.stroke();
 // headband (80s!)
 c.fillStyle='#ff2ad8';c.fillRect(-21,-33,42,3);c.fillStyle='#00e5ff';c.fillRect(-21,-30.5,42,1.2);
 // arms
 const th=a.throwT>0;c.strokeStyle='#e8b44a';c.lineWidth=3.5;c.beginPath();c.moveTo(18,-20);c.lineTo(th?30:24,th?-30:-12+Math.sin(t*14)*(run?4:0));c.moveTo(-18,-20);c.lineTo(-25,-12-Math.sin(t*14)*(run?4:0));c.stroke();circ(c,th?30:24,th?-30:-12,3.2,'#fff');circ(c,-25,-12,3.2,'#fff');
 c.restore()};

function human(c,a,o){ // generic cartoon hero o:{skin,hair,top,bottom,boots,cape,hairStyle,extra}
 const t=a.t,run=a.run;const bob=run?Math.abs(Math.sin(t*13))*2.5:Math.sin(t*3)*0.8;const leg=run?Math.sin(t*13)*9:0;const sz=o.size||1;
 c.save();c.scale(sz,sz);c.lineCap='round';
 if(o.cape){c.fillStyle=o.cape;c.beginPath();c.moveTo(-6,-38-bob);c.quadraticCurveTo(-18-(run?8:2),-20,-16-(run?10:0)+Math.sin(t*9)*2,-6);c.lineTo(4,-12);c.fill()}
 c.strokeStyle=o.bottom;c.lineWidth=6;c.beginPath();c.moveTo(-4,-18);c.lineTo(-4+leg*0.7,-3);c.moveTo(4,-18);c.lineTo(4-leg*0.7,-3);c.stroke();
 c.fillStyle=o.boots;[-4+leg*0.7,4-leg*0.7].forEach(x=>{rr(c,x-4,-6,10,6,2);c.fill()});
 c.translate(0,-bob);
 c.fillStyle=lg(c,-10,-40,10,-14,[[0,shade(o.top,20)],[1,shade(o.top,-20)]]);rr(c,-9,-40,18,24,6);c.fill();
 if(o.belt){c.fillStyle=o.belt;c.fillRect(-9,-20,18,3)}
 if(o.chest)o.chest(c,t);
 // arms
 const th=a.throwT>0;c.strokeStyle=o.arm||o.skin;c.lineWidth=4.5;c.beginPath();c.moveTo(7,-36);c.lineTo(th?20:11,th?-42:-22+Math.sin(t*13)*(run?4:0));c.moveTo(-7,-36);c.lineTo(-11,-22-Math.sin(t*13)*(run?4:0));c.stroke();
 // head
 if(o.hairBack)o.hairBack(c,t,run);
 circ(c,0,-50,10,lg(c,-8,-60,8,-40,[[0,shade(o.skin,12)],[1,shade(o.skin,-12)]]));
 if(o.face)o.face(c,t,a);else{eyes(c,2.5,-51,0.62,1,a.blink);c.strokeStyle='#8a2a2a';c.lineWidth=1.2;c.beginPath();c.arc(3,-45,2.5,0.2,Math.PI-0.2);c.stroke()}
 if(o.hair)o.hair(c,t,run);
 if(o.hand)o.hand(c,t,th);
 c.restore()}
D.CH={
 taco:{name:'The Walking Taco',draw:(c,a)=>D.drawTaco(c,a)},
 rainbow:{name:'Rainbow Brite',draw:(c,a)=>human(c,a,{skin:'#ffd8b8',top:'#3a7aff',bottom:'#ffe94b',boots:'#ff3a3a',belt:'#ff4bd8',
  chest:(c)=>{const cols=['#ff3b3b','#ff9a2e','#ffe63b','#4be36b','#3bb3ff'];cols.forEach((k,i)=>{c.fillStyle=k;c.fillRect(-9,-38+i*2.6,18,2.6)})},
  hairBack:(c,t,run)=>{c.fillStyle='#ff9a2a';c.beginPath();c.moveTo(-6,-58);c.quadraticCurveTo(-26-(run?6:0),-46+Math.sin(t*8)*3,-22-(run?8:0),-20);c.quadraticCurveTo(-12,-34,-4,-44);c.fill()},
  hair:(c)=>{c.fillStyle='#ffa83a';c.beginPath();c.arc(0,-54,10.5,Math.PI*0.95,Math.PI*2.05);c.fill();c.fillStyle='#ff4bd8';c.fillRect(-10,-58,20,3);c.save();c.translate(-6,-48);c.fillStyle='#ffe94b';star(c,0,0,3,1.4,5);c.restore()}})},
 carebear:{name:'Tenderheart Bear',draw:(c,a)=>bear(c,a,'#b06a2e','#e8b07a','heart')},
 shera:{name:'She-Ra',draw:(c,a)=>human(c,a,{skin:'#ffd8b8',top:'#ffffff',bottom:'#ffd8b8',boots:'#d4a020',cape:'#d82a2a',belt:'#ffd23a',
  chest:(c)=>{c.fillStyle='#ffd23a';c.beginPath();c.moveTo(-8,-40);c.lineTo(0,-32);c.lineTo(8,-40);c.fill();circ(c,0,-35,2,'#d82a2a')},
  hairBack:(c,t,run)=>{c.fillStyle='#ffe27a';c.beginPath();c.moveTo(-8,-58);c.quadraticCurveTo(-22-(run?6:0),-40+Math.sin(t*8)*2,-14,-18);c.lineTo(-2,-40);c.fill()},
  hair:(c)=>{c.fillStyle='#ffe88a';c.beginPath();c.arc(0,-53,10.5,Math.PI,TAU);c.fill();c.fillStyle='#ffd23a';c.beginPath();c.moveTo(-9,-58);c.lineTo(0,-70);c.lineTo(9,-58);c.lineTo(5,-60);c.lineTo(0,-64);c.lineTo(-5,-60);c.fill();circ(c,0,-60,2.4,'#d82a2a')},
  hand:(c,t,th)=>{c.save();c.translate(th?20:11,th?-42:-22);c.rotate(th?-0.8:-1.9);c.fillStyle='#e8f4ff';c.fillRect(0,-1.6,26,3.2);c.fillStyle='#ffd23a';c.fillRect(-3,-5,4,10);circ(c,-1,0,2,'#ff3a6a');c.save();c.globalCompositeOperation='lighter';c.fillStyle='#7ff7ff55';c.fillRect(0,-4,26,8);c.restore();c.restore()}})},
 joe:{name:'Snake Eyes (G.I. Joe)',draw:(c,a)=>human(c,a,{skin:'#f2c8a0',top:'#5a6a3a',bottom:'#4a5a2a',boots:'#2a2014',belt:'#2a2014',
  chest:(c)=>{c.strokeStyle='#2a2014';c.lineWidth=2;c.beginPath();c.moveTo(-8,-40);c.lineTo(8,-20);c.stroke();c.fillStyle='#d8d020';c.fillRect(3,-38,4,3)},
  hair:(c)=>{c.fillStyle='#e8c860';c.beginPath();c.arc(0,-53,10.5,Math.PI*1.05,TAU*0.99);c.fill()},
  hand:(c,t,th)=>{c.save();c.translate(11,-26);c.fillStyle='#2a2a2a';c.fillRect(0,-3,22,5);c.fillRect(4,0,4,7);c.fillStyle='#5a3a1a';c.fillRect(-4,-3,6,6);c.restore()}})},
 chewie:{name:'Chewbacca',draw:(c,a)=>wookiee(c,a,1.18,true)},
};
function star(c,x,y,R,r,n){c.beginPath();for(let i=0;i<n*2;i++){const a=i*Math.PI/n-Math.PI/2,rad=i%2?r:R;c.lineTo(x+Math.cos(a)*rad,y+Math.sin(a)*rad)}c.closePath();c.fill()}
D.star=star;
function heart(c,x,y,s,f){c.fillStyle=f;c.beginPath();c.moveTo(x,y+s*0.9);c.bezierCurveTo(x-s*1.6,y-s*0.2,x-s*0.6,y-s*1.4,x,y-s*0.5);c.bezierCurveTo(x+s*0.6,y-s*1.4,x+s*1.6,y-s*0.2,x,y+s*0.9);c.fill()}
D.heart=heart;
function bear(c,a,fur,belly,mark,size=1){const t=a.t,run=a.run,bob=run?Math.abs(Math.sin(t*12))*3:Math.sin(t*3);const leg=run?Math.sin(t*12)*6:0;c.save();c.scale(size,size);
 ell(c,-7+leg*0.6,-5,6,6,shade(fur,-8));ell(c,7-leg*0.6,-5,6,6,shade(fur,-8));
 c.translate(0,-bob);ell(c,0,-22,15,17,lg(c,-14,-40,14,-6,[[0,shade(fur,15)],[1,shade(fur,-15)]]));ell(c,0,-20,9,11,belly);
 if(mark==='heart')heart(c,0,-21,6,'#ff2a5a');if(mark==='sun'){circ(c,0,-20,5,'#ffcc00');}
 ell(c,-13,-24,4,7,shade(fur,-5),0.5);ell(c,13+(a.throwT>0?4:0),-26-(a.throwT>0?6:0),4,7,shade(fur,-5),-0.5);
 circ(c,0,-46,13,lg(c,-10,-58,10,-34,[[0,shade(fur,15)],[1,shade(fur,-10)]]));circ(c,-10,-56,5,fur);circ(c,10,-56,5,fur);circ(c,-10,-56,2.5,belly);circ(c,10,-56,2.5,belly);
 ell(c,1,-41,6,4.5,belly);heart(c,1,-43,2.2,'#d82a5a');eyes(c,1,-49,0.55,1,a.blink);c.strokeStyle='#4a2a0a';c.lineWidth=1;c.beginPath();c.arc(1,-39.5,2,0.3,Math.PI-0.3);c.stroke();
 c.restore()}
function wookiee(c,a,size,bando){const t=a.t,run=a.run;const bob=run?Math.abs(Math.sin(t*11))*3:Math.sin(t*2.5);const leg=run?Math.sin(t*11)*8:0;c.save();c.scale(size,size);
 const fur='#7a4a22';c.strokeStyle=shade(fur,-10);c.lineWidth=8;c.lineCap='round';c.beginPath();c.moveTo(-4,-18);c.lineTo(-4+leg*0.7,-3);c.moveTo(4,-18);c.lineTo(4-leg*0.7,-3);c.stroke();
 c.translate(0,-bob);ell(c,0,-32,11,18,lg(c,-10,-50,10,-14,[[0,'#9a6a3a'],[1,'#5a3414']]));
 const R=rnd(3);c.strokeStyle='#4a2a0e';c.lineWidth=1;for(let i=0;i<26;i++){const x=-9+R()*18,y=-46+R()*28;c.beginPath();c.moveTo(x,y);c.lineTo(x+R()*2-1,y+5);c.stroke()}
 if(bando){c.strokeStyle='#3a2a1a';c.lineWidth=3.5;c.beginPath();c.moveTo(-9,-46);c.lineTo(9,-20);c.stroke();c.fillStyle='#b8b8c0';for(let i=0;i<5;i++)c.fillRect(-7+i*3.6,-43+i*5.2,2.6,3)}
 c.strokeStyle='#6a3e1a';c.lineWidth=5.5;c.beginPath();c.moveTo(8,-42);c.lineTo(a.throwT>0?20:12,a.throwT>0?-44:-24);c.moveTo(-8,-42);c.lineTo(-12,-24);c.stroke();
 if(bando){c.save();c.translate(12,-30);c.fillStyle='#5a3a1a';c.fillRect(0,-3,18,5);c.strokeStyle='#999';c.lineWidth=1.5;c.beginPath();c.moveTo(12,-8);c.quadraticCurveTo(15,-2,12,4);c.stroke();c.restore()}
 ell(c,1,-56,9,11,'#8a5a2a');ell(c,3,-52,6,6,'#6a3a14');eyes(c,2,-58,0.5,1,a.blink);ell(c,3,-50,3,2,'#2a1408');
 c.restore()}
D.wookiee=wookiee;
D.ewok=function(c,a,size=0.8,hood='#8a6a4a'){const t=a.t;const w=window.TacoPhysics&&TacoPhysics.ewokBob?TacoPhysics.ewokBob(t,a.run?55:0):{dy:a.run?Math.abs(Math.sin(t*12))*3:Math.sin(t*3),rot:a.run?Math.sin(t*12)*0.12:0,sx:1,sy:1};
 c.save();c.scale(size*(w.sx||1),size*(w.sy||1));c.translate(0,-(w.dy||0));c.rotate(w.rot||0);
 ell(c,-6,-4,6,5,'#5a3a1e');ell(c,6,-4,6,5,'#5a3a1e');ell(c,0,-22,15,16,lg(c,-12,-36,12,-6,[[0,'#9a6a3a'],[1,'#5a3814']]));
 circ(c,0,-44,14,'#8a5a2e');ell(c,2,-40,7,5,'#c89a6a');circ(c,-5,-46,3,'#111');circ(c,8,-46,3,'#111');circ(c,-4,-47,1,'#fff');circ(c,9,-47,1,'#fff');ell(c,2,-42,2.5,2,'#2a1408');
 c.fillStyle=hood;c.beginPath();c.arc(1,-46,15,Math.PI*1.05,TAU*0.98);c.lineTo(15,-36);c.lineTo(12,-44);c.lineTo(-10,-44);c.lineTo(-14,-34);c.closePath();c.fill();
 c.strokeStyle='#5a3a1a';c.lineWidth=2.5;c.beginPath();c.moveTo(12,-26);c.lineTo(20,-46);c.stroke();ell(c,20,-48,2,4,'#ddd');
 c.restore()};
D.drawChar=function(c,key,a){const im=IMG['art/players/'+key];if(im&&!a.forceProc){const h=78*(key==='chewie'?1.25:1),s=h/im.height;c.save();if(a.run)c.translate(0,-Math.abs(Math.sin(a.t*13))*3);if(a.throwT>0)c.rotate(-0.08);c.drawImage(im,-im.width*s/2,-h,im.width*s,h);c.restore();return}
 (D.CH[key]||D.CH.taco).draw(c,a)};

/* ---------- allies (cameos) ---------- */
D.ally=function(c,who,t){const a={t,run:false,blink:(t%4)<0.12};const im=IMG['art/allies/'+who];if(im){const h=who==='chewbacca'?100:76,s=h/im.height;c.drawImage(im,-im.width*s/2,-h+Math.sin(t*3)*1.5,im.width*s,h);return}
 switch(who){case'rainbow_brite':return D.CH.rainbow.draw(c,a);case'tenderheart':return bear(c,a,'#b06a2e','#e8b07a','heart');case'funshine':return bear(c,a,'#ffc82a','#fff0a0','sun');case'she_ra':return D.CH.shera.draw(c,a);
  case'duke':case'snake_eyes':if(who==='snake_eyes')return human(c,a,{skin:'#222',top:'#1a1a1a',bottom:'#1a1a1a',boots:'#111',belt:'#333',face:(c)=>{c.fillStyle='#333';c.fillRect(-2,-53,12,4)}});return D.CH.joe.draw(c,a);
  case'chewbacca':return wookiee(c,a,1.3,true);case'wicket':return D.ewok(c,a,0.8,'#7a5a3a');
  case'twink':c.fillStyle='#fff';ell(c,0,-20,14,12,'#ffffff');star(c,0,-20,14,7,5);eyes(c,0,-22,0.5,0,a.blink);return;
  case'swift_wind':ell(c,0,-34,28,14,'#ffffff');circ(c,26,-46,9,'#ffffff');c.fillStyle='#ffd8ff';c.beginPath();c.moveTo(-8,-44);c.quadraticCurveTo(-30,-80+Math.sin(t*8)*8,-40,-50);c.fill();c.fillStyle='#ffd23a';c.beginPath();c.moveTo(28,-54);c.lineTo(34,-68);c.lineTo(31,-53);c.fill();return;
  case'grumpy_bear':return bear(c,a,'#3a5ab8','#b8c8f0','heart');
  case'r2d2':{const b=Math.sin(t*3);c.fillStyle='#e8eef8';rr(c,-11,-34,22,30,4);c.fill();c.fillStyle='#2a5ad8';c.fillRect(-7,-28,14,4);c.fillRect(-7,-20,5,8);c.fillStyle='#d8dde8';c.beginPath();c.arc(0,-34,11,Math.PI,TAU);c.fill();circ(c,3,-39,2.6,'#111');circ(c,-4,-40,1.6,(t*3%1)<0.5?'#ff3a3a':'#3a7aff');c.fillStyle='#b8c0d0';c.fillRect(-15,-30,4,28);c.fillRect(11,-30,4,28);return}
  case'madame_razz':return human(c,a,{skin:'#f0c8a8',hair:(c)=>{c.fillStyle='#e8e8f0';c.beginPath();c.ellipse(1,-56,10,6,0,Math.PI,0);c.fill()},top:'#6a2a9a',bottom:'#4a1a7a',boots:'#2a1040',belt:'#d8b040',cape:'#3a1a5a'});
  case'scarlett':return human(c,a,{skin:'#f6d2b8',hair:(c)=>{c.fillStyle='#d8401a';c.beginPath();c.ellipse(1,-56,10,6,0,Math.PI,0);c.fill()},top:'#c8b888',bottom:'#8a7a5a',boots:'#3a2a1a',belt:'#2a2014'});
  case'lando':return human(c,a,{skin:'#8a5a3a',hair:(c)=>{c.fillStyle='#1a1a1a';c.beginPath();c.ellipse(1,-56,10,6,0,Math.PI,0);c.fill()},top:'#4a7ab8',bottom:'#2a2a3a',boots:'#1a1a1a',belt:'#d8b040',cape:'#d8c870'});
  case'leia':return human(c,a,{skin:'#f6d6c0',hair:(c)=>{c.fillStyle='#4a2a1a';c.beginPath();c.ellipse(1,-56,10,6,0,Math.PI,0);c.fill()},top:'#f4f4f4',bottom:'#e8e8e8',boots:'#cccccc',belt:'#bbbbbb'});
  case'starlite':ell(c,0,-34,28,14,'#ffffff');circ(c,26,-46,9,'#ffffff');c.fillStyle='#ff7ad9';c.beginPath();c.moveTo(-8,-44);c.quadraticCurveTo(-30,-80+Math.sin(t*8)*8,-40,-50);c.fill();return;
  default:{c.save();c.globalCompositeOperation='lighter';c.fillStyle='#ffe94baa';star(c,0,-30,12,5,5);c.restore();return}}};

/* ---------- enemies ---------- */
const EN={
 murky:{draw:(c,e,t)=>{const w=Math.sin(t*10)*2;ell(c,0,-16,12,15,'#5a4a6a');circ(c,0,-34,10,'#8a7a9a');c.fillStyle='#2a1a3a';c.fillRect(-12,-44,24,4);rr(c,-7,-58,14,14,3);c.fill();eyes(c,-2,-35,0.5,-1,0);c.strokeStyle='#2a1a3a';c.lineWidth=3;c.beginPath();c.moveTo(-6,-3);c.lineTo(-6+w,0);c.moveTo(6,-3);c.lineTo(6-w,0);c.stroke()}},
 lurky:{draw:(c,e,t)=>{ell(c,0,-24,22,24,lg(c,0,-48,0,0,[[0,'#4a8a7a'],[1,'#1a4a3a']]));for(let i=0;i<8;i++)ell(c,-18+i*5,-6,3,8,'#2a5a4a');eyes(c,-3,-30,0.7,-1,0);ell(c,-3,-16,8,3,'#1a2a1a')}},
 gloom_cloud:{fly:1,draw:(c,e,t)=>{for(let i=0;i<5;i++)circ(c,-20+i*10,-10+Math.sin(i*2)*5,13,'#3a3a4a');circ(c,0,-18,15,'#4a4a5a');eyes(c,0,-14,0.6,-1,0);c.strokeStyle='#222';c.lineWidth=2;c.beginPath();c.arc(0,-4,5,Math.PI+0.3,TAU-0.3);c.stroke()}},
 shreeky:{fly:1,draw:(c,e,t)=>{const f=Math.sin(t*14)*10;c.fillStyle='#3a1a4a';c.beginPath();c.moveTo(0,-20);c.lineTo(-26,-28+f);c.lineTo(-14,-14);c.lineTo(-24,-6+f*0.5);c.lineTo(0,-12);c.lineTo(24,-6+f*0.5);c.lineTo(14,-14);c.lineTo(26,-28+f);c.fill();circ(c,0,-26,8,'#e8c0d8');c.fillStyle='#ff4bd8';c.beginPath();c.arc(0,-28,9,Math.PI,TAU);c.fill();eyes(c,0,-26,0.45,-1,0)}},
 beastly:{draw:(c,e,t)=>{ell(c,0,-20,16,18,'#4a7a2a');for(let i=0;i<10;i++){ell(c,-14+i*3,-34+Math.sin(i)*3,2,5,'#3a6a1a')}eyes(c,-2,-26,0.6,-1,0);c.fillStyle='#fff';c.fillRect(-8,-15,3,4);c.fillRect(-2,-15,3,4)}},
 horde_trooper:{draw:(c,e,t)=>{robo(c,t,'#5a5a6a','#d82a2a',e)}},
 catra:{draw:(c,e,t)=>{human(c,{t,run:1},{skin:'#d8a878',top:'#2a2a3a',bottom:'#2a2a3a',boots:'#111',hair:(c)=>{c.fillStyle='#3a2a1a';c.beginPath();c.arc(0,-53,11,Math.PI,TAU);c.fill();c.fillStyle='#7a2a9a';c.fillRect(-10,-56,20,5);c.beginPath();c.moveTo(-9,-58);c.lineTo(-7,-66);c.lineTo(-3,-58);c.moveTo(3,-58);c.lineTo(7,-66);c.lineTo(9,-58);c.fill()}})}},
 cobra_trooper:{draw:(c,e,t)=>{human(c,{t,run:1},{skin:'#1a2a5a',top:'#2a3a8a',bottom:'#1a2a6a',boots:'#111',belt:'#111',face:(c)=>{c.fillStyle='#111';c.fillRect(-4,-53,13,3)},chest:(c)=>{c.fillStyle='#d82a2a';c.beginPath();c.arc(0,-31,4,Math.PI,TAU);c.fill();c.fillRect(-1,-31,2,4)},hand:(c)=>{c.fillStyle='#111';c.fillRect(8,-28,16,4)}})}},
 bat:{draw:(c,e,t)=>{robo(c,t,'#2a2a2a','#ff8a00',e,1.1)}},
 hiss_tank:{heavy:1,draw:(c,e,t)=>{c.fillStyle='#1a1a1a';rr(c,-40,-26,80,22,6);c.fill();for(let i=0;i<6;i++)circ(c,-32+i*13,-6,6,'#333');c.fillStyle='#2a2a2a';c.fillRect(-20,-44,34,18);c.fillStyle='#d82a2a';c.fillRect(-6,-40,8,6);c.fillStyle='#444';c.fillRect(-46,-38,28,5);c.save();c.globalCompositeOperation='lighter';circ(c,-6,-50,8,'#ff220033');c.restore()}},
 scout_trooper:{draw:(c,e,t)=>{trooper(c,t,true)}},
 stormtrooper:{draw:(c,e,t)=>{trooper(c,t,false)}},
 tusken:{draw:(c,e,t)=>{human(c,{t,run:1},{skin:'#c8b89a',top:'#b8a88a',bottom:'#8a7a5a',boots:'#5a4a3a',cape:'#a8987a',face:(c)=>{c.fillStyle='#222';c.fillRect(-2,-54,4,4);c.fillRect(5,-54,4,4);c.fillStyle='#777';c.fillRect(2,-48,4,6)},hand:(c,t)=>{c.save();c.translate(11,-26);c.rotate(-0.6+Math.sin(t*6)*0.6);c.fillStyle='#8a8a8a';c.fillRect(0,-2,26,4);c.fillRect(22,-6,4,12);c.restore()}})}},
 gamorrean:{draw:(c,e,t)=>{ell(c,0,-26,18,24,'#4a6a2a');c.fillStyle='#5a3a1a';c.fillRect(-16,-28,32,10);circ(c,-2,-50,13,'#6a8a3a');ell(c,-11,-48,6,5,'#8aaa5a');circ(c,-12,-48,1.6,'#222');circ(c,-6,-54,2,'#111');c.fillStyle='#fff';c.fillRect(-12,-43,2,4);c.save();c.translate(-16,-30);c.rotate(-0.8+Math.sin(t*4)*0.4);c.fillStyle='#5a3a1a';c.fillRect(-2,-26,4,30);c.fillStyle='#aaa';c.beginPath();c.moveTo(0,-26);c.lineTo(-14,-30);c.lineTo(-14,-14);c.fill();c.restore()}},
 womp_rat:{draw:(c,e,t)=>{ell(c,0,-9,16,9,'#6a5a4a');circ(c,-14,-12,7,'#7a6a5a');circ(c,-17,-14,1.5,'#ff2a2a');c.strokeStyle='#5a4a3a';c.lineWidth=2;c.beginPath();c.moveTo(16,-8);c.quadraticCurveTo(26,-16+Math.sin(t*10)*4,30,-6);c.stroke()}},
 tie:{fly:1,draw:(c,e,t)=>tie(c,t)},
};
function robo(c,t,body,eye,e,s=1){c.save();c.scale(s,s);const leg=Math.sin(t*10)*6;c.strokeStyle=shade(body,-10);c.lineWidth=6;c.beginPath();c.moveTo(-5,-18);c.lineTo(-5+leg,-2);c.moveTo(5,-18);c.lineTo(5-leg,-2);c.stroke();c.fillStyle=lg(c,0,-44,0,-16,[[0,shade(body,25)],[1,body]]);rr(c,-11,-44,22,28,5);c.fill();c.fillStyle=eye;c.fillRect(-11,-34,22,3);circ(c,0,-52,9,shade(body,15));c.fillStyle=eye;c.fillRect(-8,-54,12,3);c.save();c.globalCompositeOperation='lighter';c.fillStyle=eye+'66';c.fillRect(-10,-57,16,9);c.restore();c.fillStyle='#222';c.fillRect(-26,-30,18,4);c.restore()}
function trooper(c,t,scout){const leg=Math.sin(t*10)*7;c.strokeStyle='#e8e8e8';c.lineWidth=6;c.beginPath();c.moveTo(-4,-18);c.lineTo(-4+leg,-3);c.moveTo(4,-18);c.lineTo(4-leg,-3);c.stroke();c.fillStyle=scout?'#d8d8d8':'#f4f4f4';rr(c,-9,-40,18,24,5);c.fill();c.fillStyle='#222';c.fillRect(-9,-24,18,3);c.fillStyle='#111';c.fillRect(-9,-36,6,10);
 circ(c,0,-50,10,'#f4f4f4');if(scout){c.fillStyle='#111';c.fillRect(-10,-53,12,5);c.fillStyle='#f4f4f4';c.fillRect(-11,-46,6,6)}else{c.fillStyle='#111';c.beginPath();c.ellipse(-5,-52,3,3.5,0,0,TAU);c.ellipse(3,-52,3,3.5,0,0,TAU);c.fill();c.fillStyle='#555';c.fillRect(-4,-45,6,3)}
 c.fillStyle='#111';c.fillRect(-24,-30,16,4);c.fillRect(-12,-30,4,7)}
function tie(c,t){c.fillStyle='#3a3a44';c.fillRect(-3,-2,6,4);c.fillStyle='#22222a';rr(c,-24,-30,6,60,2);c.fill();rr(c,18,-30,6,60,2);c.fill();c.fillStyle='#55555f';c.fillRect(-18,-2,36,4);circ(c,0,0,11,lg(c,-10,-10,10,10,[[0,'#9a9aa8'],[1,'#3a3a44']]));circ(c,0,0,6,'#111');c.strokeStyle='#555';c.lineWidth=1;for(let i=-24;i<=24;i+=48)for(let k=-24;k<24;k+=8){c.beginPath();c.moveTo(i+1,k);c.lineTo(i+5,k+8);c.stroke()}}
D.EN=EN;
/* sprite helpers: rim-lit outline (readability on busy layers) + white hit-flash silhouette, both cached per image; no ctx.filter (iOS ignores it) */
const RIM=new WeakMap(),WHT=new WeakMap();
function tintOf(im,col,map){let o=map.get(im);if(o)return o;o=document.createElement('canvas');o.width=im.width;o.height=im.height;const x=o.getContext('2d');x.drawImage(im,0,0);x.globalCompositeOperation='source-in';x.fillStyle=col;x.fillRect(0,0,o.width,o.height);map.set(im,o);return o}
D.whiteOf=im=>tintOf(im,'#fff',WHT);
D.rimOf=function(im,col){let m=RIM.get(im);if(m&&m[col])return m[col];m=m||{};const pad=6,o=document.createElement('canvas');o.width=im.width+pad*2;o.height=im.height+pad*2;const x=o.getContext('2d');
 const dark=tintOf(im,'#0a0614',WHT.dk||(WHT.dk=new WeakMap())),lit=tintOf(im,col,m.map||(m.map=new WeakMap()));
 x.globalAlpha=col==='#ffffff'?0.3:0.5;for(const[dx,dy]of[[-4,0],[4,0],[0,-4],[0,4],[-3,-3],[3,3],[-3,3],[3,-3]])x.drawImage(lit,pad+dx,pad+dy);
 x.globalAlpha=1;for(const[dx,dy]of[[-2,0],[2,0],[0,-2],[0,2],[-1.5,-1.5],[1.5,1.5],[-1.5,1.5],[1.5,-1.5]])x.drawImage(dark,pad+dx,pad+dy);
 x.drawImage(im,pad,pad);m[col]=o;RIM.set(im,m);return o};
D.sprite=function(c,im,x,y,w,h,o){o=o||{};if(o.rim){const r=D.rimOf(im,o.rim),k=w/im.width,pad=6*k;c.drawImage(r,x-pad,y-pad,w+pad*2,h+pad*2)}else c.drawImage(im,x,y,w,h);
 if(o.flash>0){c.save();c.globalAlpha=Math.min(1,o.flash*6)*0.85;c.drawImage(D.whiteOf(im),x,y,w,h);c.restore()}};
const BAKED_RIM=new Set(['horde_trooper','catra','cobra_trooper','bat','hiss_tank','murky','lurky','gloom_cloud','horde_skysled','trouble_bubble']);
const RIMCOL={horde_trooper:'#ff4fd8',cobra_trooper:'#ff6a3a',bat:'#b07aff',shreeky:'#ff4fd8',scout_trooper:'#7ff7ff',scout_trooper_bike:'#7ff7ff',gamorrean:'#ffcc66'};
/* walk rig: humanoid enemy art is one pose, so swing the legs (clipped halves rotated at the hip) and bob the torso while they move */
const RIG={stormtrooper:0.55,scout_trooper:0.55,horde_trooper:0.56,cobra_trooper:0.56,tusken:0.58,catra:0.58};
function rigBlit(c,img,dx,dw,dh,hipF,ang,bob){const iw=img.width,ih=img.height,X0=dx,hipY=-dh*(1-hipF),lh=dh*(1-hipF);
 for(const side of[0,1]){c.save();c.translate(0,hipY);c.rotate(side?-ang:ang);c.beginPath();c.rect(side?X0+dw/2:X0-dw,-4,dw*1.5,lh+12);c.clip();c.drawImage(img,0,ih*hipF,iw,ih*(1-hipF),X0,0,dw,lh);c.restore()}
 const ov=0.05;c.drawImage(img,0,0,iw,ih*(hipF+ov),X0,-dh+bob,dw,dh*(hipF+ov))}
D.enemy=function(c,e,t){const im=IMG['art/enemies/'+e.type];if(im){const h=e.h*1.25,s=h/im.height;c.save();c.scale(e.dir>0?-1:1,1);
  const hf=RIG[e.type];if(hf){const ph=e.wp||0,ra=e.ra!==undefined?e.ra:(e.mv?1:0),ang=Math.sin(ph)*0.32*ra,bob=-Math.abs(Math.cos(ph))*2.5*ra;const rim=BAKED_RIM.has(e.type)?null:D.rimOf(im,RIMCOL[e.type]||'#ffffff'),k=h/im.height,pad=rim?6*k:0,w=im.width*k;
   if(rim){c.save();c.translate(0,pad);rigBlit(c,rim,-w/2-pad,w+pad*2,h+pad*2,(6+im.height*hf)/(im.height+12),ang,bob);c.restore()}else rigBlit(c,im,-w/2,w,h,hf,ang,bob);
   if(e.flash>0){c.save();c.globalAlpha=Math.min(1,e.flash*6)*0.85;rigBlit(c,D.whiteOf(im),-w/2,w,h,hf,ang,bob);c.restore()}c.restore();return}
  D.sprite(c,im,-im.width*s/2,-h,im.width*s,h,{rim:BAKED_RIM.has(e.type)?null:RIMCOL[e.type]||'#ffffff',flash:e.flash});c.restore();return}
 c.save();if(e.dir>0)c.scale(-1,1);(EN[e.type]||EN.murky).draw(c,e,t);c.restore();if(e.flash>0){c.save();c.globalCompositeOperation='lighter';c.globalAlpha=Math.min(1,e.flash*5)*0.7;ell(c,0,-e.h/2,e.w*0.7,e.h*0.6,'#fff');c.restore()}};

/* ---------- pickups / projectiles ---------- */
D.pickup=function(c,type,t){const im=IMG['art/pickups/'+type];const b=Math.sin(t*4)*3;c.save();c.translate(0,b);
 c.save();c.globalCompositeOperation='lighter';circ(c,0,0,18,rg(c,0,0,0,18,[[0,type==='coin'?'#ffe06a55':'#ffffff44'],[1,'#ffffff00']]));c.restore();
 if(im){const s=30/Math.max(im.width,im.height);c.drawImage(im,-im.width*s/2,-im.height*s/2,im.width*s,im.height*s);c.restore();return}
 switch(type){case'coin':{const sx=Math.abs(Math.cos(t*4));ell(c,0,0,9*sx+1,10,lg(c,-9,-9,9,9,[[0,'#fff6a0'],[0.5,'#ffcc22'],[1,'#c88a00']]));c.fillStyle='#fff8';c.fillRect(-1,-6,2*sx,12);break}
  case'heart':heart(c,0,0,9,'#ff2a5a');c.fillStyle='#fff8';circ(c,-4,-4,2.5,'#ffffffaa');break;
  case'taco_shell':c.beginPath();c.moveTo(-12,-4);c.bezierCurveTo(-12,12,12,12,12,-4);c.closePath();c.fillStyle='#f2b640';c.fill();ell(c,0,-5,11,4,'#5ad84a');break;
  case'lettuce':for(let i=0;i<5;i++)ell(c,-6+i*3,0,5,8,i%2?'#3cc84a':'#7ae85a',i);break;
  case'tomato':circ(c,0,0,9,'#e8302a');circ(c,0,0,5,'#ff7a6a');circ(c,-3,-3,2,'#ffffffaa');break;
  case'cheese':c.fillStyle='#ffd23a';c.beginPath();c.moveTo(-10,6);c.lineTo(10,6);c.lineTo(0,-10);c.fill();circ(c,-2,2,2,'#e8a800');break;
  case'jalapeno':ell(c,0,0,5,11,'#2ab83a',0.5);c.fillStyle='#5a3a1a';c.fillRect(3,-12,2,5);break;
  case'salsa':c.fillStyle='#ddd';rr(c,-8,-8,16,16,4);c.fill();c.fillStyle='#d8261c';c.fillRect(-7,-3,14,10);c.fillStyle='#2ab83a';c.fillRect(-7,-8,14,3);break;
  case'star':c.fillStyle='hsl('+(t*300%360)+',100%,65%)';star(c,0,0,12,5,5);break;
  case'oneup':D.drawTaco(c,{t,run:0});break;
  default:circ(c,0,0,8,'#fff')}
 c.restore()};
D.shot=function(c,s,t){c.save();c.translate(s.x,s.y);c.rotate(s.rot||0);const pim=IMG['art/projectiles/'+s.kind];if(pim){const k=(s.kind==='jalapeno'?30:22)/Math.max(pim.width,pim.height);if(s.kind==='jalapeno'){c.save();c.globalCompositeOperation='lighter';circ(c,0,0,16,rg(c,0,0,0,16,[[0,'#ffee66aa'],[0.5,'#ff6a0066'],[1,'#ff000000']]));c.restore()}c.drawImage(pim,-pim.width*k/2,-pim.height*k/2,pim.width*k,pim.height*k);c.restore();return}
 switch(s.kind){case'lettuce':for(let i=0;i<3;i++)ell(c,-4+i*4,0,4,6,i%2?'#3cc84a':'#8af06a',i);break;
  case'tomato':circ(c,0,0,6,'#e8302a');circ(c,-2,-2,2,'#ffb0a0');break;
  case'cheese':c.fillStyle='#ffd23a';c.fillRect(-7,-2,14,4);c.fillRect(-4,-5,8,2);break;
  case'jalapeno':c.globalCompositeOperation='lighter';circ(c,0,0,12,rg(c,0,0,0,12,[[0,'#ffee66'],[0.4,'#ff6a00aa'],[1,'#ff000000']]));c.globalCompositeOperation='source-over';ell(c,0,0,7,3.5,'#2ab83a');break;
  case'salsa':circ(c,0,0,5,'#d8261c');circ(c,2,-2,2,'#2ab83a');break;
  case'star':c.globalCompositeOperation='lighter';c.fillStyle='hsl('+(s.hue||50)+',100%,70%)';star(c,0,0,9,4,5);break;
  case'care':c.globalCompositeOperation='lighter';c.fillStyle=lg(c,-30,0,30,0,[[0,'#ff4bd800'],[0.3,'#ff7ab8aa'],[0.6,'#ffe94baa'],[1,'#7ff7ff00']]);ell(c,0,0,30,10,c.fillStyle);heart(c,0,0,6,'#fff');break;
  case'sword':c.globalCompositeOperation='lighter';c.strokeStyle='#bff8ff';c.lineWidth=4;c.beginPath();c.arc(-10,0,24,-1,1);c.stroke();c.strokeStyle='#7ff7ff66';c.lineWidth=10;c.stroke();break;
  case'bullet':c.globalCompositeOperation='lighter';ell(c,0,0,8,2.5,'#ffe066');ell(c,0,0,14,5,'#ff8a0044');break;
  case'bolt':c.globalCompositeOperation='lighter';ell(c,0,0,14,3,'#ff3a2a');ell(c,0,0,18,6,'#ff2a1a55');ell(c,0,0,10,1.5,'#fff');break;
  case'gbolt':c.globalCompositeOperation='lighter';ell(c,0,0,14,3,'#3aff4a');ell(c,0,0,18,6,'#2aff2a55');ell(c,0,0,10,1.5,'#fff');break;
  case'rlaser':c.globalCompositeOperation='lighter';ell(c,0,0,18,2.5,'#ff4a3a');ell(c,0,0,24,6,'#ff2a1a44');break;
  case'glaser':c.globalCompositeOperation='lighter';ell(c,0,0,18,2.5,'#5aff5a');ell(c,0,0,24,6,'#2aff2a44');break;
  case'fire':{c.globalCompositeOperation='lighter';const gr=rg(c,0,0,0,18,[[0,'#ffffff'],[0.25,'#ffe066'],[0.6,'#ff6a00aa'],[1,'#ff000000']]);circ(c,0,0,18,gr);ell(c,-10,0,14,7,'#ff4a0066');break}
  case'magic':{c.globalCompositeOperation='lighter';circ(c,0,0,13,rg(c,0,0,0,13,[[0,'#ffffff'],[0.35,'#d38cff'],[1,'#6a1aff00']]));ell(c,-10,0,12,3,'#b06aff88');break}
  case'slash':{c.globalCompositeOperation='lighter';c.strokeStyle='#c8ffd0';c.lineWidth=3;for(let i=-1;i<=1;i++){c.beginPath();c.arc(-6,i*8,18,-0.9,0.9);c.stroke()}c.strokeStyle='#5aff7a55';c.lineWidth=8;c.beginPath();c.arc(-6,0,18,-0.9,0.9);c.stroke();break}
  case'ring':{c.globalCompositeOperation='lighter';c.strokeStyle='#ff4a4a';c.lineWidth=4;c.beginPath();c.arc(0,0,13,0,TAU);c.stroke();c.strokeStyle='#ff2a1a55';c.lineWidth=10;c.stroke();c.strokeStyle='#fff';c.lineWidth=1.5;c.beginPath();c.arc(0,0,13,0,TAU);c.stroke();break}
  case'shock':case'fireshock':case'snake':{c.rotate(-(s.rot||0));c.globalCompositeOperation='lighter';const col=s.kind==='snake'?'#5aff7a':s.kind==='fireshock'?'#ff8a00':'#ffe9b0';for(let i=0;i<3;i++){c.globalAlpha=0.8-i*0.22;ell(c,-Math.sign(s.vx||1)*i*10,4,16-i*3,10-i*2,col)}c.globalAlpha=1;if(s.kind==='snake'){circ(c,Math.sign(s.vx||1)*10,0,5,'#9aff9a')}break}
  case'firewall':{c.rotate(-(s.rot||0));c.globalCompositeOperation='lighter';for(let i=0;i<6;i++){const fy=-Math.random()*46;ell(c,(Math.random()-0.5)*14,fy,24-i*2,14,i%2?'#ff6a00aa':'#ffdd33aa')}break}
  case'rock':circ(c,0,0,6,'#8a7a6a');circ(c,-2,-2,2,'#bbb');break;
  case'slime':circ(c,0,0,8,'#8ad83a');circ(c,-2,-2,3,'#d8ff8a');break;
  case'rain':ell(c,0,0,2.5,6,'#7ab8ff');break;
  case'bomb':circ(c,0,0,9,'#222');circ(c,-3,-3,3,'#666');c.globalCompositeOperation='lighter';circ(c,6,-8,4,(Math.floor(t*10)%2)?'#ff4a2a':'#ffe066');break;
  case'ice':{c.globalCompositeOperation='lighter';circ(c,0,0,14,rg(c,0,0,0,14,[[0,'#ffffff'],[0.4,'#9ae8ff'],[1,'#2a8aff00']]));c.fillStyle='#e8fbff';c.beginPath();c.moveTo(12,0);c.lineTo(-4,-6);c.lineTo(-10,0);c.lineTo(-4,6);c.closePath();c.fill();break}
  case'shuriken':{c.rotate(t*24);c.fillStyle='#d8dde8';for(let i=0;i<4;i++){c.rotate(Math.PI/2);c.beginPath();c.moveTo(0,-3);c.lineTo(11,0);c.lineTo(0,3);c.fill()}circ(c,0,0,3,'#333');break}
  case'rocket':{c.fillStyle='#c8c8d0';c.fillRect(-10,-3.5,18,7);c.fillStyle='#d82a2a';c.beginPath();c.moveTo(8,-3.5);c.lineTo(14,0);c.lineTo(8,3.5);c.fill();c.globalCompositeOperation='lighter';ell(c,-15,0,8,4,'#ffb03aaa');ell(c,-20,0,10,5,'#ff5a0055');break}
  case'gloom':{c.globalCompositeOperation='lighter';circ(c,0,0,12,rg(c,0,0,0,12,[[0,'#d8c8ff'],[0.4,'#6a4aa8aa'],[1,'#20104000']]));ell(c,-8,0,10,4,'#4a3a7a88');break}
  case'saber':{c.globalCompositeOperation='lighter';c.strokeStyle='#ff4a4a';c.lineWidth=5;c.beginPath();c.arc(-8,0,26,-1.1,1.1);c.stroke();c.strokeStyle='#ff1a1a44';c.lineWidth=14;c.stroke();c.strokeStyle='#fff';c.lineWidth=1.5;c.beginPath();c.arc(-8,0,26,-1.1,1.1);c.stroke();break}
  case'torpedo':c.globalCompositeOperation='lighter';circ(c,0,0,7,'#ffb0ff');circ(c,0,0,14,'#ff4aff44');break;
  default:circ(c,0,0,5,'#fff')}
 c.restore()};

/* ---------- bosses ---------- */
D.boss=function(c,b,t){const im=IMG['art/bosses/'+(b.art||b.type)]||IMG['art/bosses/'+b.type];c.save();c.translate(b.x,b.y);
 if(im){const h=b.dh||b.h*1.25,s=h/im.height;if(b.dir>0)c.scale(-1,1);D.sprite(c,im,-im.width*s/2,-h,im.width*s,h,{rim:b.art0?null:'#ff3aa0',flash:b.flash});c.restore();return}
 switch(b.type){
 case'final':case'cobra_commander':case'hordak':case'murky_gloom':case'no_heart':case'at_st':default:{
  if(b.type==='at_st'){const lg2=Math.sin(t*3)*12;c.strokeStyle='#8a8a92';c.lineWidth=10;c.beginPath();c.moveTo(-14,-110);c.lineTo(-24+lg2,-60);c.lineTo(-14+lg2,0);c.moveTo(14,-110);c.lineTo(24-lg2,-60);c.lineTo(14-lg2,0);c.stroke();c.fillStyle=lg(c,0,-170,0,-110,[[0,'#b8b8c0'],[1,'#6a6a72']]);c.beginPath();c.moveTo(-50,-120);c.lineTo(-40,-160);c.lineTo(40,-164);c.lineTo(56,-130);c.lineTo(40,-110);c.lineTo(-40,-110);c.fill();c.fillStyle='#222';c.fillRect(-46,-140,30,8);c.fillStyle='#444';c.fillRect(-80,-128,34,6);c.fillRect(-80,-116,30,5);break}
  const col=b.type==='hordak'?'#3a3a4a':b.type==='murky_gloom'?'#4a3a5a':b.type==='no_heart'?'#3a0a3a':'#1a2a6a';
  c.fillStyle=lg(c,0,-b.h,0,0,[[0,shade(col,30)],[1,col]]);rr(c,-b.w/2,-b.h*0.75,b.w,b.h*0.6,18);c.fill();
  for(let i=0;i<4;i++)circ(c,-b.w/2+20+i*(b.w-40)/3,-b.h*0.15,16,'#222');
  c.save();c.globalCompositeOperation='lighter';circ(c,0,-b.h*0.5,30+Math.sin(t*6)*4,rg(c,0,-b.h*0.5,0,40,[[0,'#ffffffaa'],[0.4,b.type==='final'?'#ff2a2aaa':'#d38cffaa'],[1,'#00000000']]));c.restore();
  // pilot
  c.save();c.translate(0,-b.h*0.78);if(b.type==='cobra_commander'||b.type==='final'){circ(c,0,0,18,'#2a3a9a');c.fillStyle='#c0c8ff88';c.beginPath();c.arc(0,0,20,Math.PI,TAU);c.fill();c.fillStyle='#111';c.fillRect(-10,-4,20,4)}
  if(b.type==='hordak'||b.type==='final'){c.translate(b.type==='final'?40:0,0);circ(c,0,-4,16,'#d8d8e8');c.fillStyle='#111';c.fillRect(-12,-12,24,6);c.fillStyle='#d82a2a';circ(c,-5,-3,3,'#ff2a2a');circ(c,5,-3,3,'#ff2a2a');c.fillStyle='#d82a2a';c.beginPath();c.moveTo(-14,-14);c.lineTo(0,-30);c.lineTo(14,-14);c.fill()}
  if(b.type==='murky_gloom'){EN.murky.draw(c,{},t)}if(b.type==='no_heart'){circ(c,0,-4,14,'#222');ell(c,-4,-4,3,2,'#ff2a2a');ell(c,5,-4,3,2,'#ff2a2a');c.fillStyle='#5a0a5a';c.beginPath();c.moveTo(-18,-6);c.lineTo(0,-34);c.lineTo(18,-6);c.fill()}
  c.restore();
  c.fillStyle='#555';c.fillRect(-b.w/2-30,-b.h*0.55,34,10);
 }}
 c.restore()};

/* ---------- ships ---------- */
D.ship=function(c,kind,t,roll){const im=IMG['art/ships/'+kind];if(im){const w=kind==='falcon'?130:96,s=w/im.width;c.save();c.scale(1,Math.cos(roll||0));c.drawImage(im,-w/2,-im.height*s/2,w,im.height*s);c.restore();return}
 c.save();c.scale(1,Math.cos(roll||0)||0.05);
 if(kind==='falcon'){ell(c,0,0,52,14,lg(c,0,-14,0,14,[[0,'#e0e0e4'],[1,'#7a7a82']]));c.fillStyle='#b8b8c0';c.fillRect(30,-6,30,4);c.fillRect(30,2,30,4);c.fillStyle='#d0d0d4';rr(c,-6,-22,30,10,4);c.fill();ell(c,14,-17,10,6,'#c8c8d0');c.fillStyle='#223';c.fillRect(18,-20,8,4);c.fillStyle='#8a3a2a';c.fillRect(-30,-3,18,6);
  c.save();c.globalCompositeOperation='lighter';ell(c,-54,0,8+Math.random()*3,12,'#6ab8ffcc');ell(c,-62,0,20,16,'#3a8aff44');c.restore()}
 else{c.fillStyle=lg(c,0,-8,0,8,[[0,'#f4f4f4'],[1,'#a8a8b0']]);c.beginPath();c.moveTo(48,0);c.lineTo(-26,-6);c.lineTo(-30,6);c.lineTo(40,4);c.fill();c.fillStyle='#d82a2a';c.fillRect(-18,-5,10,3);
  c.fillStyle='#ccc';c.beginPath();c.moveTo(-20,-4);c.lineTo(-34,-22);c.lineTo(-10,-22);c.lineTo(2,-4);c.fill();c.beginPath();c.moveTo(-20,4);c.lineTo(-34,22);c.lineTo(-10,22);c.lineTo(2,4);c.fill();c.fillStyle='#d82a2a';c.fillRect(-30,-20,14,2);c.fillRect(-30,18,14,2);c.fillStyle='#888';c.fillRect(-10,-24,40,2);c.fillRect(-10,22,40,2);
  ell(c,2,-6,8,4,'#334');circ(c,-6,-10,3,'#ffffff');circ(c,-6,-10,1.6,'#3a8aff');
  c.save();c.globalCompositeOperation='lighter';[-14,14].forEach(y=>{ell(c,-34,y,6+Math.random()*2,3,'#ff8a8acc');ell(c,-40,y,12,5,'#ff3a3a44')});c.restore()}
 c.restore()};
D.speeder=function(c,t,rider,col){c.fillStyle=lg(c,0,-10,0,4,[[0,'#d8d8d0'],[1,'#7a7a72']]);c.beginPath();c.moveTo(-34,-4);c.lineTo(30,-8);c.lineTo(44,-4);c.lineTo(30,2);c.lineTo(-30,4);c.fill();c.fillStyle='#555';c.fillRect(28,-16,4,10);c.fillRect(36,-16,4,10);c.fillStyle='#8a8a82';c.fillRect(30,-18,12,3);c.fillRect(-36,-12,12,10);
 c.save();c.globalCompositeOperation='lighter';ell(c,-42,-6,8+Math.random()*4,4,'#ffb06acc');c.restore();
 c.save();c.translate(-4,-4);if(rider==='scout')trooper(c,0,true);else if(rider)D.drawChar(c,rider,{t,run:false});c.restore()};
D.asteroid=function(c,r,seed,t){const R=rnd(seed);c.save();c.rotate(t*(R()-0.5));c.beginPath();for(let i=0;i<10;i++){const a=i/10*TAU,rad=r*(0.75+R()*0.3);c.lineTo(Math.cos(a)*rad,Math.sin(a)*rad)}c.closePath();c.fillStyle=lg(c,-r,-r,r,r,[[0,'#9a8a7a'],[1,'#3a3028']]);c.fill();for(let i=0;i<3;i++)circ(c,(R()-0.5)*r,(R()-0.5)*r,r*0.15,'#0003');c.restore()};
window.D=D})();
