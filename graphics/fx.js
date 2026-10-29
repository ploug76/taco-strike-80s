/* Taco Strike: Totally 80s - visual polish module (Teðy). Vault-only.
 * Self-contained, no dependencies, Canvas 2D only. Phone-safe:
 *  - pooled particles (no per-frame allocation), hard caps per quality level
 *  - glow/light sprites pre-rendered once into small canvases, drawn with 'lighter'
 *  - no getImageData and no ctx.filter in the frame loop (iOS Safari ignores ctx.filter)
 *  - auto quality: drops to 'low' if frame time stays above ~22 ms, back up when it recovers
 * Usage (see graphics/README.md):
 *   TacoFX.init({quality:'auto'});  TacoFX.setTheme('etheria');
 *   each frame: dt = TacoFX.step(dtRaw)   (applies hit-stop; use the returned dt for game logic)
 *     ctx.save(); TacoFX.applyShake(ctx);         // camera shake
 *     TacoFX.drawParallax(ctx, layers, camX, camY, W, H);
 *     TacoFX.drawAmbientBack(ctx, camX, camY, W, H);   // light shafts, far motes
 *     ...draw world (call TacoFX.drawSprite(ctx,img,x,y,w,h,{flash,flip}) for hit-flash) ...
 *     TacoFX.drawParticles(ctx, camX, camY);  TacoFX.drawBolts(ctx, camX, camY);
 *     TacoFX.drawAmbientFront(ctx, camX, camY, W, H);
 *     ctx.restore();
 *     TacoFX.drawLighting(ctx, W, H, lights);   // optional darkness + light pools (night / Ewok village / final)
 *     TacoFX.post(ctx, W, H);                    // bloom-ish glow, vignette, screen flash
 */
(function (root) {
  'use strict';
  var TAU = Math.PI * 2;
  var Q = { high: { max: 420, bloom: true, ambient: 1, light: true }, low: { max: 140, bloom: false, ambient: 0.45, light: true } };
  var S = {
    quality: 'high', auto: true, theme: null, t: 0, timeScale: 1, hitstop: 0,
    trauma: 0, shakeX: 0, shakeY: 0, shakeR: 0, flashA: 0, flashC: '#fff', flashD: 0.2,
    frameAvg: 16, slowT: 0, fastT: 0, vig: null, vigW: 0, vigH: 0, bloomC: null, lightC: null,
  };
  // ---------- small canvas helpers
  function cnv(w, h) { var c = (typeof OffscreenCanvas !== 'undefined' && false) ? new OffscreenCanvas(w, h) : document.createElement('canvas'); c.width = w; c.height = h; return c; }
  var spriteCache = {};
  function glowSprite(color, size) {        // soft radial dot, cached by colour+size
    var k = color + size; if (spriteCache[k]) return spriteCache[k];
    var c = cnv(size, size), g = c.getContext('2d'), r = size / 2, gr = g.createRadialGradient(r, r, 0, r, r, r);
    gr.addColorStop(0, color); gr.addColorStop(0.25, color); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.globalAlpha = 1; g.fillStyle = gr; g.fillRect(0, 0, size, size);
    return (spriteCache[k] = c);
  }
  function hexA(hex, a) { var n = parseInt(hex.slice(1), 16); return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')'; }
  function shapeSprite(kind, color) {        // leaves, hearts, stars, sparkles, sand grains
    var k = kind + color; if (spriteCache[k]) return spriteCache[k];
    var c = cnv(32, 32), g = c.getContext('2d'); g.translate(16, 16); g.fillStyle = color; g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1.5;
    if (kind === 'leaf') { g.beginPath(); g.ellipse(0, 0, 12, 5, 0, 0, TAU); g.fill(); g.stroke(); g.strokeStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.moveTo(-11, 0); g.lineTo(11, 0); g.stroke(); }
    else if (kind === 'heart') { g.beginPath(); g.moveTo(0, 10); g.bezierCurveTo(-16, -2, -8, -14, 0, -5); g.bezierCurveTo(8, -14, 16, -2, 0, 10); g.fill(); g.stroke(); }
    else if (kind === 'star') { g.beginPath(); for (var i = 0; i < 10; i++) { var r = i % 2 ? 5 : 13, a = i * Math.PI / 5 - Math.PI / 2; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill(); g.stroke(); }
    else if (kind === 'spark') { g.globalCompositeOperation = 'lighter'; g.drawImage(glowSprite(color, 32), -16, -16); g.fillStyle = '#fff'; g.fillRect(-12, -1, 24, 2); g.fillRect(-1, -12, 2, 24); }
    else if (kind === 'crystal') { g.beginPath(); g.moveTo(0, -13); g.lineTo(6, 0); g.lineTo(0, 13); g.lineTo(-6, 0); g.closePath(); g.fill(); g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.moveTo(0, -13); g.lineTo(2, 0); g.lineTo(0, 6); g.closePath(); g.fill(); }
    else if (kind === 'confetti') { g.fillRect(-6, -3, 12, 6); }
    else if (kind === 'drop') { g.beginPath(); g.moveTo(0, -12); g.quadraticCurveTo(7, 4, 0, 8); g.quadraticCurveTo(-7, 4, 0, -12); g.fill(); }
    else { g.beginPath(); g.arc(0, 0, 10, 0, TAU); g.fill(); }
    return (spriteCache[k] = c);
  }
  // ---------- particle pool
  var MAXP = 600, P = [], live = 0;
  for (var i = 0; i < MAXP; i++) P.push({ on: false });
  function spawn(o) {
    if (live >= Q[S.quality].max) return null;
    for (var i = 0; i < MAXP; i++) { var p = P[i]; if (!p.on) { p.on = true; live++;
      p.x = o.x; p.y = o.y; p.vx = o.vx || 0; p.vy = o.vy || 0; p.ax = o.ax || 0; p.ay = o.ay || 0; p.drag = o.drag || 0;
      p.life = p.max = o.life || 0.6; p.size = o.size || 6; p.size2 = o.size2 == null ? p.size : o.size2;
      p.rot = o.rot || 0; p.vr = o.vr || 0; p.img = o.img; p.add = !!o.add; p.alpha = o.alpha == null ? 1 : o.alpha;
      p.wob = o.wob || 0; p.ph = Math.random() * TAU; p.par = o.par == null ? 1 : o.par; p.floor = o.floor; p.bounce = o.bounce || 0;
      return p; } }
    return null;
  }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  var PRESETS = {
    dust: function (x, y, o) { var n = o.n || 6, d = o.dir || 0; for (var i = 0; i < n; i++) spawn({ x: x + rnd(-8, 8), y: y - 2, vx: rnd(-60, 60) - d * 40, vy: rnd(-70, -10), ay: 60, drag: 2.5, life: rnd(.35, .6), size: rnd(10, 16), size2: rnd(22, 34), img: glowSprite(o.color || 'rgba(210,190,160,.55)', 64), alpha: .7 }); },
    land: function (x, y, o) { for (var i = 0; i < (o.n || 10); i++) { var s = i % 2 ? 1 : -1; spawn({ x: x + s * rnd(4, 14), y: y - 2, vx: s * rnd(60, 160), vy: rnd(-50, -5), drag: 4, life: rnd(.3, .5), size: 12, size2: 30, img: glowSprite(o.color || 'rgba(220,200,170,.5)', 64), alpha: .75 }); } },
    stomp: function (x, y, o) { PRESETS.land(x, y, { n: 12, color: o.color }); for (var i = 0; i < 8; i++) { var a = i / 8 * TAU; spawn({ x: x, y: y - 10, vx: Math.cos(a) * 200, vy: Math.sin(a) * 140 - 60, ay: 500, life: .45, size: 14, size2: 4, img: shapeSprite('star', '#ffe14a'), vr: rnd(-8, 8) }); } addShake(.25); },
    sand: function (x, y, o) { for (var i = 0; i < (o.n || 14); i++) spawn({ x: x + rnd(-10, 10), y: y - rnd(0, 10), vx: rnd(-120, 120) + (o.vx || 0), vy: rnd(-180, -40), ay: 520, life: rnd(.4, .8), size: rnd(3, 5), size2: 2, img: shapeSprite('dot', '#e8c27a'), floor: y, bounce: .25 }); PRESETS.dust(x, y, { n: 4, color: 'rgba(230,200,140,.5)' }); },
    leaves: function (x, y, o) { var cs = ['#3f7a2a', '#5a9a34', '#8a6a2a', '#2f5a22']; for (var i = 0; i < (o.n || 8); i++) spawn({ x: x + rnd(-20, 20), y: y + rnd(-10, 10), vx: rnd(-80, 80), vy: rnd(-120, 0), ay: 90, drag: 1.2, life: rnd(1, 1.8), size: rnd(10, 16), img: shapeSprite('leaf', cs[i % 4]), rot: rnd(0, TAU), vr: rnd(-5, 5), wob: 40 }); },
    sparks: function (x, y, o) { var c = o.color || '#ffb347'; for (var i = 0; i < (o.n || 14); i++) { var a = rnd(0, TAU), v = rnd(120, 380); spawn({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, ay: 700, drag: 1, life: rnd(.25, .5), size: rnd(10, 18), size2: 2, img: shapeSprite('spark', c), add: true }); } },
    hit: function (x, y, o) { PRESETS.sparks(x, y, { n: 10, color: o.color || '#ffffff' }); spawn({ x: x, y: y, life: .16, size: 40, size2: 90, img: glowSprite(o.color || '#ffffff', 128), add: true, alpha: .9 }); addShake(.18); },
    boltHit: function (x, y, o) { var c = o.color || '#ff3030'; spawn({ x: x, y: y, life: .2, size: 20, size2: 70, img: glowSprite(c, 128), add: true }); PRESETS.sparks(x, y, { n: 8, color: c }); PRESETS.dust(x, y, { n: 3, color: 'rgba(80,80,80,.5)' }); },
    explode: function (x, y, o) { var s = o.scale || 1; spawn({ x: x, y: y, life: .35, size: 30 * s, size2: 180 * s, img: glowSprite('#ffd27a', 128), add: true }); for (var i = 0; i < 18; i++) { var a = rnd(0, TAU), v = rnd(60, 260) * s; spawn({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, drag: 2, ay: -40, life: rnd(.5, 1), size: rnd(18, 30) * s, size2: rnd(50, 80) * s, img: glowSprite(i % 3 ? 'rgba(70,60,60,.6)' : '#ff8a2a', 64), add: !(i % 3) }); } PRESETS.sparks(x, y, { n: 16 }); addShake(.5 * s); },
    pickup: function (x, y, o) { var c = o.color || '#ffe14a'; for (var i = 0; i < 10; i++) { var a = i / 10 * TAU; spawn({ x: x, y: y, vx: Math.cos(a) * 140, vy: Math.sin(a) * 140, drag: 3, life: .45, size: 12, size2: 2, img: shapeSprite('spark', c), add: true }); } spawn({ x: x, y: y, life: .25, size: 20, size2: 70, img: glowSprite(c, 128), add: true }); },
    hearts: function (x, y, o) { for (var i = 0; i < (o.n || 6); i++) spawn({ x: x + rnd(-14, 14), y: y, vx: rnd(-40, 40), vy: rnd(-140, -70), drag: 1, life: rnd(.7, 1.1), size: rnd(12, 18), img: shapeSprite('heart', i % 2 ? '#ff5d8f' : '#ff9ec0'), wob: 30 }); },
    confetti: function (x, y, o) { var cs = ['#ff3b6b', '#ffd23f', '#3bd1ff', '#7cff6b', '#c46bff']; for (var i = 0; i < (o.n || 40); i++) spawn({ x: x + rnd(-30, 30), y: y, vx: rnd(-260, 260), vy: rnd(-520, -200), ay: 600, drag: 1.5, life: rnd(1.2, 2), size: rnd(8, 12), img: shapeSprite('confetti', cs[i % 5]), rot: rnd(0, TAU), vr: rnd(-12, 12), wob: 50 }); },
    crystal: function (x, y, o) { for (var i = 0; i < (o.n || 10); i++) { var a = rnd(0, TAU), v = rnd(80, 240); spawn({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 80, ay: 500, life: rnd(.5, .9), size: rnd(10, 16), img: shapeSprite('crystal', i % 2 ? '#9fe8ff' : '#c9a4ff'), rot: rnd(0, TAU), vr: rnd(-10, 10) }); } },
    muzzle: function (x, y, o) { spawn({ x: x, y: y, life: .08, size: 26, size2: 40, img: glowSprite(o.color || '#ffcf6a', 64), add: true }); },
    smoke: function (x, y, o) { spawn({ x: x + rnd(-6, 6), y: y, vx: rnd(-10, 10), vy: rnd(-50, -30), life: rnd(1, 1.6), size: 16, size2: 46, img: glowSprite('rgba(60,60,70,.45)', 64) }); },
  };
  // ---------- blaster bolts (drawn as glowing capsules; the game owns collision, we just render + trail)
  var B = [];
  function bolt(x, y, vx, vy, color, opts) { opts = opts || {}; var b = { x: x, y: y, vx: vx, vy: vy, c: color || '#ff2a2a', len: opts.len || 34, w: opts.w || 5, life: opts.life || 2, on: true }; B.push(b); PRESETS.muzzle(x, y, { color: color }); return b; }
  function drawBoltAt(ctx, x, y, ang, len, w, color) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.globalCompositeOperation = 'lighter';
    var g = glowSprite(color, 64); ctx.globalAlpha = .9; ctx.drawImage(g, -len * .75, -w * 3, len * 1.5, w * 6);
    ctx.globalAlpha = 1; ctx.fillStyle = color; roundRect(ctx, -len / 2, -w / 2, len, w, w / 2); ctx.fill();
    ctx.fillStyle = '#ffffff'; roundRect(ctx, -len / 2 + 3, -w / 4, len - 6, w / 2, w / 4); ctx.fill(); ctx.restore();
  }
  function roundRect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  // ---------- ambient weather per theme
  var AMB = {
    rainbow:  { rate: 6,  make: function (v) { return { x: v.x + rnd(0, v.w), y: v.y + rnd(0, v.h * .8), vy: rnd(-12, -4), vx: rnd(-6, 6), life: rnd(1.5, 3), size: rnd(8, 14), size2: 2, img: shapeSprite('spark', ['#ff7ad9', '#ffe14a', '#7ae1ff', '#9dff7a'][Math.random() * 4 | 0]), add: true, par: .6 }; } },
    carealot: { rate: 3,  make: function (v) { return { x: v.x + rnd(0, v.w), y: v.y + v.h + 10, vy: rnd(-40, -20), life: rnd(4, 6), size: rnd(8, 12), img: shapeSprite('heart', Math.random() < .5 ? '#ff9ec0' : '#ffd1e3'), wob: 25, alpha: .8, par: .7 }; } },
    etheria:  { rate: 5,  make: function (v) { return { x: v.x + rnd(0, v.w), y: v.y + rnd(0, v.h), vy: rnd(-20, -6), vx: rnd(-8, 8), life: rnd(2, 4), size: rnd(4, 9), size2: 1, img: glowSprite(Math.random() < .5 ? '#9fe8ff' : '#d7a6ff', 32), add: true, wob: 12, par: .8 }; } },
    cobra:    { rate: 4,  make: function (v) { return { x: v.x + rnd(0, v.w), y: v.y + v.h, vy: rnd(-60, -30), vx: rnd(10, 30), life: rnd(2, 3.5), size: rnd(3, 5), size2: 1, img: glowSprite('#ff9a3a', 32), add: true, wob: 20, par: .9 }; } },
    endor:    { rate: 2.5, make: function (v) { return { x: v.x + rnd(0, v.w * 1.2), y: v.y - 20, vy: rnd(30, 60), vx: rnd(-40, -10), life: rnd(5, 8), size: rnd(9, 14), img: shapeSprite('leaf', ['#4f8a2a', '#7a9a34', '#8a6a2a'][Math.random() * 3 | 0]), rot: rnd(0, TAU), vr: rnd(-2, 2), wob: 35, par: .9 }; }, shafts: 'rgba(255,240,190,0.10)' },
    bike:     { rate: 4,  make: function (v) { return { x: v.x + v.w + 20, y: v.y + rnd(0, v.h), vx: rnd(-500, -300), vy: rnd(-10, 20), life: 3, size: rnd(9, 14), img: shapeSprite('leaf', '#5a8a2a'), rot: rnd(0, TAU), vr: rnd(-8, 8), par: 1 }; }, shafts: 'rgba(255,240,190,0.08)' },
    ewok:     { rate: 3,  make: function (v) { return { x: v.x + rnd(0, v.w), y: v.y + rnd(v.h * .2, v.h), vx: rnd(-15, 15), vy: rnd(-15, 15), life: rnd(2, 4), size: rnd(6, 10), size2: 2, img: glowSprite('#ffe27a', 32), add: true, wob: 30, par: .8 }; } },
    tatooine: { rate: 10, make: function (v) { return { x: v.x + v.w + 10, y: v.y + rnd(v.h * .45, v.h), vx: rnd(-420, -220), vy: rnd(-20, 10), life: rnd(1.5, 3), size: rnd(2, 4), size2: 1, img: shapeSprite('dot', '#e8c88a'), alpha: .7, par: 1 }; }, heat: true },
    final:    { rate: 6,  make: function (v) { return { x: v.x + rnd(0, v.w), y: v.y + v.h, vy: rnd(-90, -40), vx: rnd(-20, 20), life: rnd(1.5, 3), size: rnd(4, 7), size2: 1, img: glowSprite(Math.random() < .7 ? '#ff5a1a' : '#b86bff', 32), add: true, wob: 25, par: .9 }; }, lightning: true },
    space:    { rate: 14, make: function (v) { return { x: v.x + v.w + 10, y: v.y + rnd(0, v.h), vx: rnd(-1400, -800), life: 1.5, size: 2, img: shapeSprite('dot', '#ffffff'), alpha: .9, streak: true, par: 1 }; } },
  };
  var ambAcc = 0, lightningT = 3, boltFlash = 0;
  // ---------- shake / flash / hitstop
  function addShake(t) { S.trauma = Math.min(1, S.trauma + t); }
  function step(dt) {
    dt = Math.min(dt, 0.05); S.t += dt;
    // quality auto-tune on raw frame time
    S.frameAvg += (dt * 1000 - S.frameAvg) * 0.05;
    if (S.auto) { if (S.frameAvg > 22) { S.slowT += dt; S.fastT = 0; if (S.slowT > 2 && S.quality === 'high') S.quality = 'low'; } else if (S.frameAvg < 17) { S.fastT += dt; S.slowT = 0; if (S.fastT > 6 && S.quality === 'low') S.quality = 'high'; } }
    var sdt = dt;
    if (S.hitstop > 0) { S.hitstop -= dt; sdt = dt * 0.05; }
    S.trauma = Math.max(0, S.trauma - dt * 1.6);
    var k = S.trauma * S.trauma, tt = S.t * 38;
    S.shakeX = k * 14 * (Math.sin(tt * 1.1) + Math.sin(tt * 2.3 + 1)) * .5; S.shakeY = k * 10 * (Math.sin(tt * 1.7 + 2) + Math.sin(tt * 2.9)) * .5; S.shakeR = k * 0.02 * Math.sin(tt * 1.3 + 4);
    if (S.flashA > 0) S.flashA = Math.max(0, S.flashA - dt / S.flashD);
    // particles
    for (var i = 0; i < MAXP; i++) { var p = P[i]; if (!p.on) continue; p.life -= sdt; if (p.life <= 0) { p.on = false; live--; continue; }
      p.vx += p.ax * sdt; p.vy += p.ay * sdt; if (p.drag) { var f = Math.max(0, 1 - p.drag * sdt); p.vx *= f; p.vy *= f; }
      p.x += (p.vx + (p.wob ? Math.sin(S.t * 3 + p.ph) * p.wob : 0)) * sdt; p.y += p.vy * sdt; p.rot += p.vr * sdt;
      if (p.floor != null && p.y > p.floor) { p.y = p.floor; p.vy = -p.vy * p.bounce; p.vx *= .6; } }
    for (var j = B.length - 1; j >= 0; j--) { var b = B[j]; b.x += b.vx * sdt; b.y += b.vy * sdt; b.life -= sdt; if (b.life <= 0 || !b.on) B.splice(j, 1); }
    if (boltFlash > 0) boltFlash -= dt;
    return sdt;
  }
  function updateAmbient(dt, camX, camY, W, H) {
    var a = AMB[S.theme]; if (!a) return; ambAcc += dt * a.rate * Q[S.quality].ambient;
    var v = { x: camX, y: camY, w: W, h: H };
    while (ambAcc >= 1) { ambAcc -= 1; var o = a.make(v); o.amb = true; spawn(o); }
    if (a.lightning) { lightningT -= dt; if (lightningT <= 0) { lightningT = rnd(3, 7); boltFlash = .18; flash('#c9a4ff', .25, .35); } }
  }
  // ---------- drawing
  function drawParticles(ctx, camX, camY) {
    for (var i = 0; i < MAXP; i++) { var p = P[i]; if (!p.on || !p.img) continue;
      var t = 1 - p.life / p.max, s = p.size + (p.size2 - p.size) * t, a = p.alpha * Math.min(1, p.life / Math.min(.25, p.max * .5)) * (t < .1 ? t * 10 : 1);
      var x = p.x - camX * p.par, y = p.y - camY * p.par;
      ctx.globalAlpha = Math.max(0, Math.min(1, a)); ctx.globalCompositeOperation = p.add ? 'lighter' : 'source-over';
      if (p.streak) { ctx.drawImage(p.img, x, y - 1, Math.min(60, -p.vx * .03), 2); continue; }
      if (p.rot) { ctx.save(); ctx.translate(x, y); ctx.rotate(p.rot); ctx.drawImage(p.img, -s / 2, -s / 2, s, s); ctx.restore(); }
      else ctx.drawImage(p.img, x - s / 2, y - s / 2, s, s); }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
  function drawBolts(ctx, camX, camY) { for (var i = 0; i < B.length; i++) { var b = B[i]; drawBoltAt(ctx, b.x - camX, b.y - camY, Math.atan2(b.vy, b.vx), b.len, b.w, b.c); } }
  // tiled parallax. layers: [{img, f (0..1+ scroll factor), y (top px, default 0), h (draw height, default H), fy (vertical factor, default f*0.3)}]
  function drawParallax(ctx, layers, camX, camY, W, H) {
    for (var i = 0; i < layers.length; i++) { var L = layers[i], img = L.img; if (!img || !img.width) continue;
      var h = L.h || H, w = img.width * h / img.height, f = L.f == null ? 0.5 : L.f, fy = L.fy == null ? f * 0.3 : L.fy;
      var ox = -((camX * f) % w); if (ox > 0) ox -= w; var oy = (L.y || 0) - camY * fy;
      for (var x = Math.floor(ox); x < W; x += w) ctx.drawImage(img, Math.floor(x), Math.floor(oy), Math.ceil(w) + 1, h); }
  }
  function drawAmbientBack(ctx, camX, camY, W, H) {
    var a = AMB[S.theme]; if (!a) return;
    if (a.shafts && Q[S.quality].light) {       // god-rays through the redwoods
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (var i = 0; i < 4; i++) { var x = ((i * 420 - camX * 0.3) % (W + 600) + W + 600) % (W + 600) - 300, sw = 70 + 30 * Math.sin(S.t * .4 + i);
        var g = ctx.createLinearGradient(x, 0, x + 200, H); g.addColorStop(0, a.shafts); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.globalAlpha = .7 + .3 * Math.sin(S.t * .7 + i * 2); ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + sw, 0); ctx.lineTo(x + sw + 260, H); ctx.lineTo(x + 180, H); ctx.closePath(); ctx.fill(); }
      ctx.restore(); }
    if (a.heat && Q[S.quality].light) {          // heat shimmer band near the horizon (cheap: two translucent wavy strips)
      ctx.save(); ctx.globalAlpha = .06; ctx.fillStyle = '#fff6d0';
      for (var k = 0; k < 2; k++) { ctx.beginPath(); var y0 = H * (.55 + k * .05); ctx.moveTo(0, y0); for (var xx = 0; xx <= W; xx += 40) ctx.lineTo(xx, y0 + Math.sin(xx * .02 + S.t * 3 + k) * 4); ctx.lineTo(W, y0 + 14); ctx.lineTo(0, y0 + 14); ctx.fill(); }
      ctx.restore(); }
  }
  function drawAmbientFront(ctx, camX, camY, W, H) { if (boltFlash > 0) { ctx.save(); ctx.globalAlpha = boltFlash * 2; ctx.strokeStyle = '#e6ccff'; ctx.lineWidth = 3; ctx.globalCompositeOperation = 'lighter'; var x = W * (.2 + .6 * ((S.t * 7.3) % 1)), y = 0; ctx.beginPath(); ctx.moveTo(x, y); while (y < H * .55) { x += rnd(-30, 30); y += rnd(20, 50); ctx.lineTo(x, y); } ctx.stroke(); ctx.restore(); } }
  // hit flash: sprite drawn normally, then a white silhouette on top (cached per image)
  var flashCache = typeof WeakMap !== 'undefined' ? new WeakMap() : null;
  function whiteOf(img) {
    var c = flashCache && flashCache.get(img); if (c) return c;
    c = cnv(img.width, img.height); var g = c.getContext('2d'); g.drawImage(img, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
    if (flashCache) flashCache.set(img, c); return c;
  }
  function drawSprite(ctx, img, x, y, w, h, o) {
    o = o || {}; if (!img || !img.width) return;
    ctx.save(); ctx.translate(x + (o.flip ? w : 0), y); if (o.flip) ctx.scale(-1, 1);
    if (o.squash) { ctx.translate(w / 2, h); ctx.scale(1 + o.squash, 1 - o.squash); ctx.translate(-w / 2, -h); }
    if (o.shadow !== false) { ctx.globalAlpha = .28; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(w / 2, h - 2, w * .36, Math.max(3, h * .05), 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    ctx.drawImage(img, 0, 0, w, h);
    if (o.flash > 0) { ctx.globalAlpha = Math.min(1, o.flash); ctx.drawImage(whiteOf(img), 0, 0, w, h); }
    if (o.glow) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = o.glowA || .5; var gs = glowSprite(o.glow, 64); ctx.drawImage(gs, -w * .25, -h * .25, w * 1.5, h * 1.5); }
    ctx.restore();
  }
  function glow(ctx, x, y, r, color, a) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a == null ? .6 : a; ctx.drawImage(glowSprite(color, 128), x - r, y - r, r * 2, r * 2); ctx.restore(); }
  // darkness overlay with light pools: lights=[{x,y,r,color?,flicker?}] in SCREEN coordinates
  function drawLighting(ctx, W, H, lights, ambient) {
    if (!Q[S.quality].light) return;
    var amb = ambient || 'rgba(10,8,30,0.45)';
    if (!S.lightC || S.lightC.width !== Math.ceil(W / 2) || S.lightC.height !== Math.ceil(H / 2)) S.lightC = cnv(Math.ceil(W / 2), Math.ceil(H / 2));
    var c = S.lightC, g = c.getContext('2d'); g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, c.width, c.height); g.fillStyle = amb; g.fillRect(0, 0, c.width, c.height);
    g.globalCompositeOperation = 'destination-out';
    for (var i = 0; i < (lights || []).length; i++) { var L = lights[i], r = L.r * (L.flicker ? 1 + Math.sin(S.t * 13 + i) * .05 + Math.sin(S.t * 7.7) * .04 : 1) / 2; g.drawImage(glowSprite('#000', 128), L.x / 2 - r, L.y / 2 - r, r * 2, r * 2); }
    ctx.drawImage(c, 0, 0, W, H);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (var j = 0; j < (lights || []).length; j++) { var M = lights[j]; if (M.color) { ctx.globalAlpha = .22; ctx.drawImage(glowSprite(M.color, 128), M.x - M.r * .6, M.y - M.r * .6, M.r * 1.2, M.r * 1.2); } }
    ctx.restore();
  }
  function flash(color, a, dur) { S.flashC = color || '#fff'; S.flashA = a == null ? .6 : a; S.flashD = dur || .2; }
  function post(ctx, W, H, o) {
    o = o || {};
    // cheap bloom: canvas -> 1/8 size -> stretched back with 'lighter' (bilinear upscale = blur). High quality only.
    if (Q[S.quality].bloom && o.bloom !== false && ctx.canvas) {
      var bw = Math.max(1, Math.ceil(W / 8)), bh = Math.max(1, Math.ceil(H / 8));
      if (!S.bloomC || S.bloomC.width !== bw || S.bloomC.height !== bh) S.bloomC = cnv(bw, bh);
      var bg = S.bloomC.getContext('2d'); bg.globalCompositeOperation = 'copy'; bg.imageSmoothingEnabled = true; bg.drawImage(ctx.canvas, 0, 0, bw, bh);
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = true; ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = o.bloomA == null ? .14 : o.bloomA; ctx.drawImage(S.bloomC, 0, 0, ctx.canvas.width, ctx.canvas.height); ctx.restore();
    }
    // vignette (cached per size)
    if (o.vignette !== false) {
      if (!S.vig || S.vigW !== W || S.vigH !== H) { S.vig = cnv(W, H); S.vigW = W; S.vigH = H; var vg = S.vig.getContext('2d'), gr = vg.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .35, W / 2, H / 2, Math.max(W, H) * .75); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,10,' + (o.vignetteA || .45) + ')'); vg.fillStyle = gr; vg.fillRect(0, 0, W, H); }
      ctx.drawImage(S.vig, 0, 0);
    }
    if (S.flashA > 0) { ctx.save(); ctx.globalAlpha = S.flashA; ctx.fillStyle = S.flashC; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  }
  function applyShake(ctx) { if (S.trauma > 0) { ctx.translate(S.shakeX, S.shakeY); ctx.rotate(S.shakeR); } }
  var api = {
    init: function (o) { o = o || {}; if (o.quality === 'low' || o.quality === 'high') { S.quality = o.quality; S.auto = false; } else { S.auto = true; S.quality = (navigator.hardwareConcurrency || 4) <= 4 ? 'low' : 'high'; } return api; },
    setTheme: function (t) { S.theme = t; ambAcc = 0; for (var i = 0; i < MAXP; i++) if (P[i].on && P[i].amb) { P[i].on = false; live--; } },
    step: step, updateAmbient: updateAmbient,
    emit: function (name, x, y, o) { var f = PRESETS[name]; if (f) f(x, y, o || {}); },
    bolt: bolt, drawBolt: drawBoltAt, clearBolts: function () { B.length = 0; },
    shake: addShake, hitstop: function (s) { S.hitstop = Math.max(S.hitstop, s || .06); }, flash: flash,
    applyShake: applyShake, drawParallax: drawParallax, drawAmbientBack: drawAmbientBack, drawAmbientFront: drawAmbientFront,
    drawParticles: drawParticles, drawBolts: drawBolts, drawSprite: drawSprite, glow: glow, drawLighting: drawLighting, post: post,
    get quality() { return S.quality; }, set quality(q) { S.quality = q === 'low' ? 'low' : 'high'; S.auto = false; },
    stats: function () { return { particles: live, bolts: B.length, quality: S.quality, frameMs: Math.round(S.frameAvg * 10) / 10, trauma: S.trauma }; },
    presets: Object.keys(PRESETS), themes: Object.keys(AMB),
  };
  root.TacoFX = api;
})(typeof window !== 'undefined' ? window : this);
