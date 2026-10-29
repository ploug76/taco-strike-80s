/* Built-in level set (used for any level JSON the level designer has not delivered yet). Same schema as levels/SCHEMA.md */
(function(){
const R0=s=>{let x=s>>>0||7;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return((x>>>0)%100000)/100000}};
const LIST=[
 ['w1-1','rainbow','Color Kingdom Dash',1,null],['w1-2','rainbow',"Murky's Gloom Pits",1,'murky_gloom'],
 ['w2-1','carealot','Care-a-Lot Cloud Hop',2,null],['w2-2','carealot',"No Heart's Storm",2,'no_heart'],
 ['w3-1','etheria','Whispering Woods',3,null],['w3-2','etheria','Crystal Castle Siege',3,'hordak'],
 ['w4-1','cobra','Jungle Strike',4,null],['w4-2','cobra','Cobra Island Base',4,'cobra_commander'],
 ['w5-1','endor','Forest Moon of Endor',5,null],['w5-2','endor','Speeder Bike Chase',5,'bike'],
 ['w6-1','ewok','Bright Tree Village',6,null],['w6-2','ewok','Rope Bridge Rumble',6,'at_st'],
 ['w7-1','tatooine','Dune Sea & the Sarlacc',7,null],['w7-2','tatooine',"Helmet's Landing Zone",7,'big_helmet'],
 ['xw-1','space','X-wing: Battle of Yavin',8,'flight'],
 ['falcon-1','space','Millennium Falcon: The Falcon Run (Death Star II)',8,'flight'],
 ['final','final','Gauntlet of Doom',9,'skeletor'],
];
const POOL={rainbow:['murky','lurky','gloom_cloud'],carealot:['beastly','shreeky','gloom_cloud'],etheria:['horde_trooper','catra','horde_trooper'],cobra:['cobra_trooper','bat','hiss_tank','cobra_trooper'],endor:['scout_trooper','stormtrooper'],ewok:['scout_trooper','stormtrooper'],tatooine:['tusken','womp_rat','gamorrean'],final:['cobra_trooper','horde_trooper','bat','stormtrooper']};
const ALLY={rainbow:['rainbow_brite','twink'],carealot:['tenderheart','funshine'],etheria:['she_ra','swift_wind'],cobra:['duke','snake_eyes'],endor:['wicket','chewbacca'],ewok:['wicket','chewbacca'],tatooine:['chewbacca'],final:['chewbacca','she_ra','duke','rainbow_brite']};
const SAY={rainbow_brite:'Color power! Grab my star sprinkles!',twink:'Twink! Twink! Star power for you!',tenderheart:'Care Bear Stare! Take this heart!',funshine:'Sunny days ahead, Taco!',she_ra:'For the honor of Grayskull!',swift_wind:'Ride on, friend!',duke:'Yo Joe! Ammo drop!',snake_eyes:'...(silent ninja nod)',wicket:'Yub nub! Ewoks help!',chewbacca:'RRAAARRWHHGWWR!'};
const GIFT={rainbow_brite:'star',twink:'coin',tenderheart:'heart',funshine:'taco_shell',she_ra:'heart',swift_wind:'star',duke:'salsa',snake_eyes:'jalapeno',wicket:'heart',chewbacca:'taco_shell'};
function platform(id,theme,name,world,boss){const R=R0(id.split('').reduce((a,c)=>a*31+c.charCodeAt(0),7));
 const L={id,world,theme,name,mode:'platform',width:0,start:{x:80,y:400},ground:[],platforms:[],hazards:[],springs:[],enemies:[],pickups:[],checkpoints:[],allies:[],boss:boss||null};
 const diff=Math.min(1,0.25+world*0.09+(id.endsWith('-2')?0.08:0));const pool=POOL[theme]||POOL.rainbow;
 const G=460;let x=0,gs=0;const len=boss?4600:5600;
 const enemy=(ex,ey)=>{const t=pool[Math.floor(R()*pool.length)];const fly=/cloud|shreeky/.test(t);L.enemies.push({type:t,x:ex,y:fly?G-150-R()*80:ey,range:120+R()*120})};
 const coins=(cx,cy,n,arc)=>{for(let i=0;i<n;i++)L.pickups.push({type:'coin',x:cx+i*30,y:cy-(arc?Math.sin(i/(n-1)*Math.PI)*60:0)})};
 const groundTo=x1=>{L.ground.push([gs,x1,G])};
 x=700;coins(300,G-60,5,true);
 const ammo=['lettuce','tomato','cheese','jalapeno','salsa'];
 let chunk=0;
 while(x<len){const k=Math.floor(R()*7);chunk++;if(chunk>1&&R()<0.35+diff*0.4)enemy(x+50,G);
  if(chunk%5===0){L.pickups.push({type:ammo[Math.floor(R()*5)],x:x+60,y:G-40});L.pickups.push({type:R()<0.5?'heart':ammo[Math.floor(R()*5)],x:x+110,y:G-40})}
  if(chunk===4)L.checkpoints.push({x:x+40});if(chunk===9)L.checkpoints.push({x:x+40});
  if(k===0){ // flat with enemies
   for(let i=0;i<1+Math.floor(diff*2.5);i++)enemy(x+100+i*140,G);coins(x+80,G-50,4);x+=520}
  else if(k===1){ // gap with floating platforms
   groundTo(x);const gw=140+R()*60*diff;
   if(theme==='tatooine'&&R()<0.7){const pw=gw+220;L.hazards.push({type:'sarlacc',x:x,y:G,w:pw});L.platforms.push({x:x+40,y:G-70,w:110,type:'moving',dx:pw-190,dy:0,period:4.5});coins(x+60,G-130,5,true);x+=pw;gs=x}
   else if(theme==='ewok'){L.platforms.push({x:x-10,y:G-4,w:gw+40,type:'bridge'});coins(x+20,G-60,4,true);x+=gw+20;gs=x}
   else{L.platforms.push({x:x+gw/2-60,y:G-90,w:120,type:theme==='carealot'?'cloud':'oneway'});coins(x+gw/2-45,G-140,4);x+=gw+80;gs=x}
  }
  else if(k===2){ // stairs up to a high run + secret
   const n=3;for(let i=0;i<n;i++)L.platforms.push({x:x+i*130,y:G-80-i*70,w:110,type:'oneway'});
   coins(x+n*130,G-80-n*70+10,6);L.platforms.push({x:x+n*130-20,y:G-60-n*70,w:220,type:'oneway'});if(R()<0.6)enemy(x+n*130+100,G-60-n*70);
   if(R()<0.5)L.pickups.push({type:R()<0.3?'star':'oneup',x:x+n*130+180,y:G-100-n*70});x+=n*130+260}
  else if(k===3){ // spring launch to coins
   L.springs.push({x:x+80,y:G});coins(x+60,G-300,4);L.platforms.push({x:x+140,y:G-260,w:160,type:theme==='carealot'?'cloud':'oneway'});L.pickups.push({type:ammo[Math.floor(R()*5)],x:x+220,y:G-290});x+=380}
  else if(k===4){ // moving platform over a pit
   groundTo(x);L.platforms.push({x:x+20,y:G-40,w:100,type:'moving',dx:180,dy:0,period:3.6});if(R()<0.5)L.hazards.push({type:theme==='cobra'||theme==='final'?'acid':'spikes',x:x,y:G+60,w:300,h:40});coins(x+40,G-90,5);x+=320;gs=x}
  else if(k===5){ // spikes + crumble bridge
   L.hazards.push({type:theme==='cobra'?'laser':'spikes',x:x+120,y:G-20,w:64,h:20});L.platforms.push({x:x+90,y:G-110,w:120,type:'crumble'});coins(x+100,G-150,4);enemy(x+300,G);x+=420}
  else { // speed run strip: coin line + enemies to stomp combo
   coins(x+40,G-40,8);if(diff>0.4)L.enemies.push({type:pool[0],x:x+200,y:G,range:60});L.enemies.push({type:pool[0],x:x+330,y:G,range:60});x+=420}
  if(theme==='ewok'&&R()<0.35){L.platforms.push({x:x+20,y:G-200,w:40,h:200,type:'ladder'});L.platforms.push({x:x-40,y:G-210,w:180,type:'oneway'});coins(x-20,G-250,5);x+=180}
 }
 // allies
 const al=ALLY[theme]||[];al.forEach((w,i)=>L.allies.push({who:w,x:500+i*Math.floor(len/(al.length+0.5)),y:G,say:SAY[w],gift:GIFT[w]}));
 if(boss){L.ground.push([gs,len+1200,G]);L.width=len+1200;L.bossX=len+300;L.goal={x:len+1100,y:G}}
 else{L.ground.push([gs,len+400,G]);L.width=len+400;L.goal={x:len+250,y:G}}
 // keep the first 500px enemy-free
 L.enemies=L.enemies.filter(e=>e.x>450);
 return L}
function bike(id,name){const R=R0(99);const L={id,world:5,theme:'endor',name,mode:'bike',width:9000,speed:420,start:{x:80,y:300},ground:[[0,9400,470]],obstacles:[],enemies:[],pickups:[],allies:[{who:'wicket',x:200,y:470,say:'Yub nub! Catch them!'}],goal:{x:9000,y:470}};
 for(let x=900;x<8600;x+=260+R()*200){const r=R();if(r<0.45){const gapTop=r<0.22;L.obstacles.push(gapTop?{type:'tree',x,y:200,h:270}:{type:'branch',x,y:0,h:230})}else if(r<0.7)L.obstacles.push({type:'log',x,y:420,h:50});else L.enemies.push({type:'scout_trooper',x:x+200,y:180+R()*200,lane:0});
  if(R()<0.4)L.pickups.push({type:R()<0.15?'heart':'coin',x:x+120,y:120+R()*280})}
 L.pickups.push({type:'heart',x:4500,y:300});return L}
function flight(id,name){const xw=id.startsWith('xw'),trench=id==='xw-2',ast=id.startsWith('falcon');const R=R0(id.length*17+3);
 const L={id,world:8,theme:'space',name,mode:'flight',ship:ast?'falcon':'xwing',bg:trench?'trench':ast?'asteroids':'space',length:trench?75:85,waves:[],pickups:[],boss:trench?'exhaust_port':ast?'exogorth':'vader_tie'};
 for(let t=2;t<L.length-6;t+=2.2+R()*1.6){const r=R();
  if(ast&&r<0.55)L.waves.push({t,type:R()<0.25?'asteroid_big':'asteroid',y:R(),count:2+Math.floor(R()*3),pattern:'random'});
  else if(trench&&r<0.4)L.waves.push({t,type:'turret',y:R()<0.5?0.08:0.92,count:2,pattern:'line',gap:0.8});
  else L.waves.push({t,type:R()<0.25?'interceptor':R()<0.15?'tie_bomber':'tie',y:0.15+R()*0.7,count:2+Math.floor(R()*3),pattern:['line','sine','v','dive'][Math.floor(R()*4)],gap:0.5})}
 for(let t=10;t<L.length;t+=14)L.pickups.push({t,type:['heart','salsa','star'][Math.floor(R()*3)],y:0.3+R()*0.4});
 return L}
function boss(id,name){const L={id,world:9,theme:'final',name,mode:'boss',width:1300,start:{x:120,y:400},ground:[[0,1300,460]],platforms:[{x:220,y:330,w:140,type:'oneway'},{x:940,y:330,w:140,type:'oneway'},{x:560,y:240,w:180,type:'oneway'}],hazards:[],springs:[],enemies:[],pickups:[{type:'heart',x:290,y:300},{type:'salsa',x:1010,y:300},{type:'jalapeno',x:650,y:210}],checkpoints:[],allies:[{who:'chewbacca',x:160,y:460,say:'RRAAARRWHHGWWR! (Chewie has your back!)',gift:'taco_shell',fights:1}],boss:'final',bossX:900,goal:{x:1220,y:460}};return L}
const LEVELS={};
LIST.forEach(([id,theme,name,world,b])=>{LEVELS[id]=b==='bike'?bike(id,name):b==='flight'?flight(id,name):b==='final'?boss(id,name):platform(id,theme,name,world,b)});
LEVELS['w5-1'].allies.push({who:'chewbacca',x:2600,y:460,say:'RRAAARRWHHGWWR! (Chewie fights with you!)',gift:'taco_shell',fights:1});
const ORDER=LIST.map(l=>l[0]);
const MISSIONS={taco:ORDER.slice(),rainbow:['w1-1','w1-2'],carebear:['w2-1','w2-2'],shera:['w3-1','w3-2'],joe:['w4-1','w4-2'],chewie:['w5-1','w5-2','w6-1','w6-2','w7-1','w7-2','xw-1','falcon-1']};
window.GEN={LEVELS,ORDER,MISSIONS,SAY,GIFT};
})();
