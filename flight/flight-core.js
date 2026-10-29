/* Taco Strike 80s - FLIGHT LEVELS core (flight/flight-core.js)  v2 "quality pass"
 * Owner: Grey Heart. Plain script, no dependencies, same style as the engine.
 * Defines window.TacoFlight = { levels, register, load, has, create, run, TUNE, PILOTS, SPRITE_FILES }.
 * Level data: flight/xwing.js (id xw-1) and flight/falcon.js (id falcon-1).
 *
 * Controls (TEAM.md): NO D-pad. Drag anywhere = the ship follows your finger's movement (relative drag,
 * low-pass filtered + critically-damped spring, so no jitter). Hold FIRE to shoot (button turns into TORPEDO
 * for the X-wing finale). Optional host input {L,R,U,D,fire} from the engine (keyboard); no key listeners here.
 * Physics: TacoPhysics.stepShip(s, inp, dt, T) + TacoPhysics.TUNE ship* keys are used if New Bot ships them.
 */
(function (W) {
  'use strict';
  var TAU = Math.PI * 2;
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function hash(n) { n = (n ^ 61) ^ (n >>> 16); n = n + (n << 3); n = n ^ (n >>> 4); n = Math.imul(n, 0x27d4eb2d); n = n ^ (n >>> 15); return (n >>> 0) / 4294967295; }
  function mkCanvas(w, h) { var c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }
  function now() { return (W.performance && performance.now) ? performance.now() : Date.now(); }

  // ---------- tuning (any key can be overridden by TacoPhysics.TUNE) ----------
  var DEFAULT_TUNE = {
    shipSpring: 130,     // swipe-follow spring (1/s^2)
    shipDamp: 22.8,      // = 2*sqrt(spring): critically damped, no overshoot/wobble
    shipMaxV: 1150,      // px/s cap
    shipAccel: 2800, shipDrag: 7,   // digital (host L/R/U/D) control
    swipeGain: 1.25,     // ship travel per finger travel (logical px)
    fingerSmooth: 0.025, // s, low-pass on the raw finger position (kills touch-sample jitter)
    fireRate: 9, bulletV: 1150,
    minViewW: 520, viewH: 540,
    iframes: 1.4, hitstop: 0.06,
    shakeMax: 10, shakeDecay: 1.7,
    torpV: 560, torpAngle: 0.42, torpTurn: 1.1, torpRange: 230, portW: 64
  };
  function readTune() {
    var T = {}, k, P = W.TacoPhysics;
    for (k in DEFAULT_TUNE) T[k] = DEFAULT_TUNE[k];
    if (P && P.TUNE) for (k in DEFAULT_TUNE) if (typeof P.TUNE[k] === 'number') T[k] = P.TUNE[k];
    return T;
  }
  function stepShipDefault(s, inp, dt, T) {
    var ax, ay;
    if (inp.hasTarget) {
      ax = T.shipSpring * (inp.tx - s.x) - T.shipDamp * s.vx;
      ay = T.shipSpring * (inp.ty - s.y) - T.shipDamp * s.vy;
    } else {
      var dx = (inp.R ? 1 : 0) - (inp.L ? 1 : 0), dy = (inp.D ? 1 : 0) - (inp.U ? 1 : 0);
      ax = dx * T.shipAccel - T.shipDrag * s.vx; ay = dy * T.shipAccel - T.shipDrag * s.vy;
    }
    s.vx += ax * dt; s.vy += ay * dt;
    var sp = Math.hypot(s.vx, s.vy);
    if (sp > T.shipMaxV) { s.vx *= T.shipMaxV / sp; s.vy *= T.shipMaxV / sp; }
    s.x += s.vx * dt; s.y += s.vy * dt;
    var tt = clamp(s.vy / 700, -1, 1) * 0.35;
    s.tilt += (tt - s.tilt) * Math.min(1, dt * 14);
  }

  var PILOTS = {
    taco: { name: 'TACO', call: 'RED TACO', color: '#ffd23f' },
    chewbacca: { name: 'CHEWIE', call: 'CHEWBACCA', color: '#e0a060' }, chewie: { name: 'CHEWIE', call: 'CHEWBACCA', color: '#e0a060' },
    ewok: { name: 'WICKET', call: 'WICKET', color: '#d09050' }, wicket: { name: 'WICKET', call: 'WICKET', color: '#d09050' },
    luke: { name: 'LUKE', call: 'RED FIVE', color: '#ffe9a8' },
    rainbow: { name: 'RAINBOW', call: 'RAINBOW BRITE', color: '#ff7ad9' }, carebear: { name: 'TENDERHEART', call: 'CARE BEAR', color: '#e0a070' },
    shera: { name: 'SHE-RA', call: 'SHE-RA', color: '#ffd76a' }, joe: { name: 'DUKE', call: 'G.I. JOE', color: '#9fd36a' }
  };
  var RADIO = { red_leader: 'RED LEADER', gold_leader: 'GOLD LEADER', han: 'HAN SOLO', obiwan: 'BEN KENOBI', vader: 'DARTH VADER', lando: 'LANDO',
    c3po: 'C-3PO', ackbar: 'ADM. ACKBAR', chewbacca: 'CHEWIE', wedge: 'WEDGE', biggs: 'BIGGS', luke: 'LUKE', r2: 'R2-D2', nien: 'NIEN NUNB' };

  // ---------- art loading ----------
  var IMG = {};
  function img(base, path) {
    if (base === null || base === undefined) return null;
    var key = base + path, e = IMG[key];
    if (!e) { e = IMG[key] = { el: new Image(), ok: false }; e.el.onload = function () { e.ok = true; }; e.el.src = key; }
    return e.ok ? e.el : null;
  }
  var GLOW = {};
  function glow(col) { // additive glow sprite with a white-hot core
    if (GLOW[col]) return GLOW[col];
    var c = mkCanvas(64, 64), x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    var r = parseInt(col.substr(1, 2), 16), gg = parseInt(col.substr(3, 2), 16), b = parseInt(col.substr(5, 2), 16);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.18, col); g.addColorStop(0.5, 'rgba(' + r + ',' + gg + ',' + b + ',.35)');
    g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    return (GLOW[col] = c);
  }
  var SMOKE = null;
  function smoke() {
    if (SMOKE) return SMOKE;
    var c = mkCanvas(64, 64), x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(90,86,96,.9)'); g.addColorStop(0.6, 'rgba(60,56,66,.5)'); g.addColorStop(1, 'rgba(40,36,46,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64); return (SMOKE = c);
  }
  function whiteOf(src, w, h) {
    var c = mkCanvas(w, h), x = c.getContext('2d');
    x.drawImage(src, 0, 0, w, h); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#fff'; x.fillRect(0, 0, w, h);
    return c;
  }

  // ---------- input: relative swipe steer + fire button ----------
  function FlightInput(level) {
    this.L = level; this.steerId = null; this.fireIds = {}; this.fire = false;
    this.sx = 0; this.sy = 0; this.cx = 0; this.cy = 0; this.began = false; this.active = false;
    var me = this, cv = level.canvas;
    this._down = function (e) {
      if (me.steerId !== null) return;
      me.steerId = e.pointerId; me.sx = me.cx = e.clientX; me.sy = me.cy = e.clientY; me.began = true; me.active = true;
      try { cv.setPointerCapture(e.pointerId); } catch (x) {}
      if (level._onTap) level._onTap();
      e.preventDefault();
    };
    this._move = function (e) {
      if (e.pointerId !== me.steerId) return;
      var list = e.getCoalescedEvents ? e.getCoalescedEvents() : null, last = list && list.length ? list[list.length - 1] : e;
      me.cx = last.clientX; me.cy = last.clientY; e.preventDefault();
    };
    this._up = function (e) { if (e.pointerId === me.steerId) { me.steerId = null; me.active = false; } };
    cv.addEventListener('pointerdown', this._down); cv.addEventListener('pointermove', this._move);
    cv.addEventListener('pointerup', this._up); cv.addEventListener('pointercancel', this._up);
    cv.style.touchAction = 'none';
    var b = level.opts.fireButton, own = false;
    if (!b) {
      own = true;
      b = document.createElement('button');
      b.type = 'button'; b.className = 'flight-fire'; b.setAttribute('aria-label', 'Fire'); b.textContent = 'FIRE';
      var s = b.style;
      s.position = 'fixed'; s.zIndex = '6'; s.width = s.height = '104px'; s.borderRadius = '50%'; s.padding = '0';
      s.right = 'calc(env(safe-area-inset-right) + 20px)'; s.bottom = 'calc(env(safe-area-inset-bottom) + 22px)';
      s.font = '900 17px "Trebuchet MS",system-ui'; s.letterSpacing = '1px'; s.color = '#fff';
      s.border = '3px solid #fff8'; s.textShadow = '0 2px 3px #000a'; s.touchAction = 'none'; s.userSelect = 'none'; s.webkitUserSelect = 'none';
      s.background = 'radial-gradient(circle at 35% 30%,#ff9a9a,#e01020 60%,#6a0008)';
      s.boxShadow = '0 0 22px #ff2a2a99, inset 0 -6px 12px #0006'; s.transition = 'transform .05s';
      document.body.appendChild(b);
    }
    this.btn = b; this.ownBtn = own; this.btnLabel = b.textContent; this.mode = 'fire';
    this._fdown = function (e) { me.fireIds[e.pointerId] = 1; me.fire = true; b.classList.add('on'); if (own) b.style.transform = 'scale(.92)'; try { b.setPointerCapture(e.pointerId); } catch (x) {} if (level._onTap) level._onTap(); e.preventDefault(); e.stopPropagation(); };
    this._fup = function (e) { delete me.fireIds[e.pointerId]; if (!Object.keys(me.fireIds).length) { me.fire = false; b.classList.remove('on'); if (own) b.style.transform = ''; } };
    b.addEventListener('pointerdown', this._fdown); b.addEventListener('pointerup', this._fup); b.addEventListener('pointercancel', this._fup);
    this._ctx = function (e) { e.preventDefault(); }; b.addEventListener('contextmenu', this._ctx);
  }
  FlightInput.prototype.setMode = function (m) {
    if (this.mode === m) return; this.mode = m;
    this.btn.textContent = m === 'torpedo' ? 'TORPEDO' : 'FIRE';
    if (this.ownBtn) {
      this.btn.style.background = m === 'torpedo' ? 'radial-gradient(circle at 35% 30%,#bfe6ff,#1f7ee0 60%,#062a6a)' : 'radial-gradient(circle at 35% 30%,#ff9a9a,#e01020 60%,#6a0008)';
      this.btn.style.boxShadow = m === 'torpedo' ? '0 0 26px #4fb3ffcc, inset 0 -6px 12px #0006' : '0 0 22px #ff2a2a99, inset 0 -6px 12px #0006';
      this.btn.style.fontSize = m === 'torpedo' ? '15px' : '17px';
    }
  };
  FlightInput.prototype.destroy = function () {
    var cv = this.L.canvas;
    cv.removeEventListener('pointerdown', this._down); cv.removeEventListener('pointermove', this._move);
    cv.removeEventListener('pointerup', this._up); cv.removeEventListener('pointercancel', this._up);
    this.btn.removeEventListener('pointerdown', this._fdown); this.btn.removeEventListener('pointerup', this._fup);
    this.btn.removeEventListener('pointercancel', this._fup); this.btn.removeEventListener('contextmenu', this._ctx);
    if (this.ownBtn && this.btn.parentNode) this.btn.parentNode.removeChild(this.btn);
    else { this.btn.textContent = this.btnLabel; this.btn.classList.remove('on'); }
  };

  // ---------- vector placeholder art (pre-rendered once into canvases; same top-left lighting as Teddy's renders) ----------
  function metal(c, y0, y1, a, b) { var g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, a || '#eef1f5'); g.addColorStop(1, b || '#7c8492'); return g; }
  var ART = {
    xwing: function (c) {
      c.strokeStyle = '#3a404c'; c.lineWidth = 1.5;
      [-1, 1].forEach(function (d) {
        c.fillStyle = metal(c, d * 4, d * 28); c.beginPath(); c.moveTo(-30, 0); c.lineTo(-14, 0); c.lineTo(-4, d * 25); c.lineTo(-22, d * 27); c.closePath(); c.fill(); c.stroke();
        c.fillStyle = '#d6322b'; c.fillRect(-20, d * 22 - 2, 12, 3);
        c.fillStyle = '#7d8594'; c.fillRect(-12, d * 25 - 2, 32, 3.5);
        c.fillStyle = '#5a6170'; c.beginPath(); c.ellipse(-34, d * 12, 9, 6, 0, 0, TAU); c.fill();
      });
      c.fillStyle = metal(c, -8, 8); c.beginPath(); c.moveTo(-38, -7); c.lineTo(20, -6); c.lineTo(48, -1.5); c.lineTo(48, 1.5); c.lineTo(20, 6); c.lineTo(-38, 7); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#d6322b'; c.fillRect(18, -5, 5, 10);
      c.fillStyle = '#1b2433'; c.beginPath(); c.moveTo(-6, -6); c.lineTo(10, -6); c.lineTo(4, -12); c.lineTo(-4, -12); c.closePath(); c.fill();
    },
    falcon: function (c) {
      c.strokeStyle = '#4b4a46'; c.lineWidth = 1.5;
      c.fillStyle = metal(c, -30, 30, '#f4f2ea', '#8b8a84'); c.beginPath(); c.ellipse(-4, 0, 48, 24, 0, 0, TAU); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(30, -16); c.lineTo(60, -11); c.lineTo(60, -3); c.lineTo(34, -3); c.closePath(); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(30, 16); c.lineTo(60, 11); c.lineTo(60, 3); c.lineTo(34, 3); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#a8423a'; c.fillRect(-28, -5, 14, 10);
      c.fillStyle = metal(c, 16, 34, '#e6e4dc', '#9a988f'); c.beginPath(); c.moveTo(10, 16); c.lineTo(34, 24); c.lineTo(40, 30); c.lineTo(30, 32); c.lineTo(6, 22); c.closePath(); c.fill(); c.stroke();
    },
    tie: function (c) { // frontal, matches Teddy's tie_fighter.webp
      c.strokeStyle = '#1e2229'; c.lineWidth = 2;
      c.fillStyle = '#4a515c'; c.fillRect(-24, -3, 48, 6);
      [-1, 1].forEach(function (d) {
        c.fillStyle = metal(c, -32, 32, '#59606c', '#252a32');
        c.beginPath(); c.moveTo(d * 24, -32); c.lineTo(d * 31, -16); c.lineTo(d * 31, 16); c.lineTo(d * 24, 32); c.lineTo(d * 27, 0); c.closePath(); c.fill(); c.stroke();
      });
      c.fillStyle = metal(c, -12, 12, '#c3c9d2', '#5b636f'); c.beginPath(); c.arc(0, 0, 12, 0, TAU); c.fill(); c.stroke();
      c.fillStyle = '#12161c'; c.beginPath(); c.arc(0, 0, 6.5, 0, TAU); c.fill();
      c.strokeStyle = '#59606c'; c.lineWidth = 1; c.beginPath(); for (var i = 0; i < 8; i++) { var a = i / 8 * TAU; c.moveTo(0, 0); c.lineTo(Math.cos(a) * 6.5, Math.sin(a) * 6.5); } c.stroke();
    },
    interceptor: function (c) { // frontal, dagger wings
      c.strokeStyle = '#1e2229'; c.lineWidth = 2;
      c.fillStyle = '#4a515c'; c.fillRect(-20, -3, 40, 6);
      [-1, 1].forEach(function (d) {
        c.fillStyle = metal(c, -36, 36, '#5c6370', '#232830');
        c.beginPath(); c.moveTo(d * 18, -8); c.lineTo(d * 30, -36); c.lineTo(d * 26, -14); c.lineTo(d * 26, 14); c.lineTo(d * 30, 36); c.lineTo(d * 18, 8); c.closePath(); c.fill(); c.stroke();
        c.fillStyle = '#ff5a3a'; c.fillRect(d * 30 - 1.5, -37, 3, 3); c.fillRect(d * 30 - 1.5, 34, 3, 3);
      });
      c.fillStyle = metal(c, -11, 11, '#c3c9d2', '#5b636f'); c.beginPath(); c.arc(0, 0, 11, 0, TAU); c.fill(); c.stroke();
      c.fillStyle = '#12161c'; c.beginPath(); c.arc(0, 0, 6, 0, TAU); c.fill();
    },
    vader: function (c) { // TIE Advanced x1, frontal: bent wings, bigger, darker
      c.strokeStyle = '#121418'; c.lineWidth = 2;
      c.fillStyle = '#3a3f48'; c.fillRect(-26, -4, 52, 8);
      [-1, 1].forEach(function (d) {
        c.fillStyle = metal(c, -42, 42, '#4a505a', '#16191e');
        c.beginPath(); c.moveTo(d * 22, -6); c.lineTo(d * 30, -42); c.lineTo(d * 40, -20); c.lineTo(d * 40, 20); c.lineTo(d * 30, 42); c.lineTo(d * 22, 6); c.closePath(); c.fill(); c.stroke();
      });
      c.fillStyle = metal(c, -15, 15, '#9aa1ac', '#3a4049'); c.beginPath(); c.ellipse(0, 0, 16, 14, 0, 0, TAU); c.fill(); c.stroke();
      c.fillStyle = '#0c0e12'; c.beginPath(); c.arc(0, 0, 8, 0, TAU); c.fill();
      c.fillStyle = '#ff2a2a'; c.fillRect(-2, -1.5, 4, 3);
    },
    turret: function (c) { // base only; the barrel is drawn live, axis = up
      c.strokeStyle = '#2f3238'; c.lineWidth = 1.5;
      c.fillStyle = metal(c, -2, 14, '#9ba1aa', '#555a62'); c.fillRect(-18, 2, 36, 12); c.strokeRect(-18, 2, 36, 12);
      c.fillStyle = metal(c, -12, 4, '#b6bcc5', '#60656e'); c.beginPath(); c.arc(0, 4, 12, Math.PI, 0); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#ff4a3a'; c.fillRect(-14, 7, 3, 3); c.fillRect(11, 7, 3, 3);
    }
  };
  var VEC_BOX = { xwing: [104, 64], falcon: [128, 70], tie: [68, 70], interceptor: [66, 78], vader: [86, 90], turret: [40, 32] };
  var SPRITE_FILES = { // [file under art/, drawn width in logical px; height keeps the aspect]
    xwing: ['ships/xwing.webp', 104], falcon: ['ships/falcon.webp', 132],
    tie: ['ships/tie_fighter.webp', 66], interceptor: ['ships/tie_interceptor.webp', 64],
    vader: ['ships/tie_advanced.webp', 88], turret: ['ships/turbolaser.webp', 40],
    asteroid: ['ships/asteroid.webp', 0], reactor: ['ships/reactor_core.webp', 0]
  };
  var VEC_RES = 3;

  // ---------- level instance ----------
  function Flight(def, opts) {
    this.def = def; this.opts = opts || {};
    this.canvas = this.opts.canvas;
    if (!this.canvas) throw new Error('TacoFlight: opts.canvas required');
    this.ctx = this.canvas.getContext('2d');
    this.T = readTune(); this.P = W.TacoPhysics || {};
    this.artBase = this.opts.artBase === undefined ? 'art/' : this.opts.artBase;
    this.pilotKey = this.opts.pilot || def.defaultPilot || 'taco';
    this.pilot = PILOTS[this.pilotKey] || { name: String(this.pilotKey).toUpperCase(), call: String(this.pilotKey).toUpperCase(), color: '#fff' };
    this.god = !!this.opts.god;
    this.rs = 1; this.ftEma = 16.7; this.slowT = 0; this.adaptive = this.opts.adaptive !== false;
    this.perf = { upd: 0, draw: 0 }; this.spr = {}; this.bake = {};
    this.input = new FlightInput(this);
    this.resize(); this.reset();
  }
  var F = Flight.prototype;

  F.resize = function () {
    var cv = this.canvas, cw = cv.clientWidth || W.innerWidth, ch = cv.clientHeight || W.innerHeight;
    var dpr = Math.min(W.devicePixelRatio || 1, 2) * this.rs;
    var pw = Math.round(cw * dpr), ph = Math.round(ch * dpr);
    if (cv.width !== pw || cv.height !== ph) { cv.width = pw; cv.height = ph; }
    this.cw = cw; this.ch = ch; this.dpr = dpr;
    this.scale = Math.min(cw / this.T.minViewW, ch / this.T.viewH);
    this.vw = cw / this.scale; this.vh = ch / this.scale;
    this.spd = clamp(this.vw / 900, 0.62, 1.25);
    this.hudH = 64 / this.scale;
    this.bake = {}; // size-dependent caches
    if (this.ship) { this.ship.x = clamp(this.ship.x, 40, this.vw * 0.72); this.ship.y = clamp(this.ship.y, this.hudH, this.vh - 30); }
  };
  // run() passes the real frame time; if the device can't keep up, render resolution steps down (never the playfield)
  F.frame = function (ms) {
    if (!(ms > 0 && ms < 250)) return;
    this.ftEma += (ms - this.ftEma) * 0.06;
    if (!this.adaptive) return;
    if (this.ftEma > 21 && this.rs > 0.56) { this.slowT += ms / 1000; if (this.slowT > 1.5) { this.rs = Math.max(0.55, this.rs - 0.15); this.slowT = 0; this.resize(); } }
    else this.slowT = 0;
  };

  F.reset = function () {
    var d = this.def;
    this.t = 0; this.tl = 0; this.ev = 0; this.dist = 0;
    this.ship = { x: Math.min(140, this.vw * 0.22), y: (this.hudH + this.vh) * 0.5, vx: 0, vy: 0, tilt: 0, r: d.ship.r };
    this.maxHp = d.hull || 5; this.hp = this.maxHp; this.score = 0; this.kills = 0; this.shots = 0; this.hits = 0;
    this.bul = []; this.eb = []; this.en = []; this.parts = []; this.pk = []; this.walls = []; this.girders = []; this.muzzle = []; this.chain = [];
    this.radio = []; this.boss = null; this.hold = false; this.banner = null; this.toast = null;
    this.phase = 'space'; this.wallK = 0; this.astRate = 0; this.astAcc = 0; this.nextGirder = 700; this.nextTurret = 500;
    this.state = 'play'; this.endT = 0; this.inv = 0; this.fireCd = 0; this.spread = 0; this.star = 0;
    this.trauma = 0; this.flash = 0; this.hurtFlash = 0; this.hitstop = 0;
    this.port = null; this.torp = null; this.portTimer = 0; this.passes = 0; this.fireball = -9999; this.anchor = null; this.cameo = null;
    this.reported = false; this.bot = null; this.lowWarned = false;
    var sa = this.opts.startAt || 0;
    this.checkpoint = sa;
    this.card = { kind: sa > 0 ? 'resume' : 'intro', t: 0 };
    if (sa > 0) {
      var ev = d.events;
      while (this.ev < ev.length && ev[this.ev].t < sa) { var e = ev[this.ev++]; if (e.phase) this.setPhase(e.phase, true); if (e.asteroids !== undefined) this.astRate = e.asteroids; }
      this.tl = sa; if (this.walled()) this.wallK = 1;
    }
  };

  F.sfx = function (n) {
    var o = this.opts;
    if (o.sfx) { try { o.sfx(n); } catch (e) {} return; }
    if (o.audio && W.TacoSFX) W.TacoSFX.play(o.audio.ctx, o.audio.dest, n);
  };
  F.emit = function (n, data) { if (this.opts.onEvent) try { this.opts.onEvent(n, data || {}); } catch (e) {} };
  F.fmt = function (text) { var nm = this.pilot.name.charAt(0) + this.pilot.name.slice(1).toLowerCase(); return String(text).replace(/\{pilot\}/g, nm).replace(/\{call\}/g, this.pilot.call); };
  F.say = function (who, text, dur) {
    this.radio.push({ who: RADIO[who] || String(who).toUpperCase(), text: this.fmt(text), t: dur || 3.2 });
    if (this.radio.length > 2) this.radio.shift();
  };
  F.showBanner = function (kind, a, b, dur) { this.banner = { kind: kind, a: a, b: b || '', t: 0, dur: dur || 2.2 }; };
  F.showToast = function (text, col, dur) { this.toast = { text: text, col: col || '#ffe66d', t: 0, dur: dur || 1.6 }; };
  F.shake = function (a) { this.trauma = Math.min(1, this.trauma + a); };

  F.setPhase = function (p, silent) {
    this.phase = p;
    if (p === 'escape') this.fireball = -80;
    if (p === 'port') { this.portTimer = 1.6; this.passes = 0; }
    if (!silent) this.emit('phase', { phase: p });
  };
  F.walled = function () { return this.phase === 'trench' || this.phase === 'tunnel' || this.phase === 'escape' || this.phase === 'port'; };
  F.scroll = function () { var s = this.def.speed || 260; return (this.phase === 'escape' ? s * 1.55 : this.walled() ? s * 1.25 : s) * this.spd; };

  // ---- timeline ----
  F.runEvents = function () {
    var ev = this.def.events;
    while (this.ev < ev.length && ev[this.ev].t <= this.tl && !this.boss && !this.hold) {
      var e = ev[this.ev++];
      if (e.title) this.showBanner('title', e.title, e.sub, e.dur || 2.6);
      if (e.radio) this.say(e.radio, e.text, e.dur);
      if (e.phase) this.setPhase(e.phase);
      if (e.asteroids !== undefined) this.astRate = e.asteroids;
      if (e.wave) this.spawnWave(e);
      if (e.pickup) this.spawnPickup(e.pickup, this.vw + 30, this.hudH + 30 + (this.vh - this.hudH - 70) * (e.y === undefined ? 0.5 : e.y));
      if (e.checkpoint) { this.checkpoint = e.t; this.showToast('CHECKPOINT', '#00e5ff'); this.sfx('checkpoint'); this.emit('checkpoint', { t: e.t }); }
      if (e.hold) this.hold = true;
      if (e.boss) this.spawnBoss(e.boss);
      if (e.goal) this.win();
    }
  };
  var EDEF = {
    tie:         { hp: 2, r: 22, v: 210, pts: 100, fire: [1.3, 2.3] },
    interceptor: { hp: 2, r: 20, v: 320, pts: 150, fire: [1.4, 2.2] },
    turret:      { hp: 3, r: 18, v: 0,   pts: 120, fire: [1.4, 2.2] },
    asteroid:    { hp: 1, r: 20, v: 0,   pts: 30, fire: null },
    vader:       { hp: 110, r: 32, v: 0, pts: 5000, fire: [1.5, 1.5] },
    reactor:     { hp: 140, r: 58, v: 0, pts: 8000, fire: [2.4, 2.4] }
  };
  var eid = 1;
  F.mkEnemy = function (type, x, yf) {
    var d = EDEF[type] || EDEF.tie, ymin = this.hudH + 34, ymax = this.vh - 44;
    var y = ymin + clamp(yf, 0, 1) * (ymax - ymin);
    return { id: eid++, type: type, x: x, y: y, y0: y, vx: -d.v * this.spd, vy: 0, hp: d.hp, maxHp: d.hp, r: d.r, pts: d.pts, t: 0, ph: 0,
      fireT: d.fire ? rand(d.fire[0], d.fire[1]) + 0.4 : 0, hit: 0 };
  };
  F.spawnWave = function (e) {
    var n = e.n || 1, gap = e.gap || 0.45, i;
    for (i = 0; i < n; i++) {
      var yf = e.y === undefined ? rand(0.15, 0.85) : e.y, off = 0, xo = i * gap * 260 * this.spd;
      if (e.pattern === 'v') { off = (i - (n - 1) / 2) * 0.1; xo = Math.abs(i - (n - 1) / 2) * 60; }
      if (e.pattern === 'column') { off = (i - (n - 1) / 2) * 0.13; xo = 0; }
      var en = this.mkEnemy(e.wave, this.vw + 40 + xo, yf + off);
      en.pattern = e.pattern || 'straight';
      if (e.pattern === 'sine') en.ph = i * 0.9;
      if (e.from === 'behind') { en.x = -60 - i * 70; en.vx = Math.abs(en.vx) * 1.1; en.behind = true; en.fireT += 1; }
      this.en.push(en);
    }
  };
  F.mkAsteroid = function (size, x, y, vx, vy) {
    var n = 9 + size * 2, shape = [];
    for (var i = 0; i < n; i++) shape.push(rand(0.72, 1.05));
    var a = this.mkEnemy('asteroid', x, 0);
    a.y = y; a.size = size; a.r = [0, 15, 27, 42][size]; a.hp = [0, 1, 3, 6][size]; a.pts = [0, 30, 50, 80][size];
    a.vx = vx; a.vy = vy; a.rot = rand(0, TAU); a.vr = rand(-1.6, 1.6) / size; a.shape = shape;
    a.col = ['#7a6a5c', '#6d6158', '#857565', '#5f5650'][size % 4];
    return a;
  };
  F.spawnBoss = function (type) {
    var b = this.mkEnemy(type, this.vw + 100, 0.5);
    b.isBoss = true; b.y = (this.hudH + this.vh) / 2; b.entering = true; b.bphase = 1;
    if (type === 'vader') {
      b.tx = this.vw * 0.8; b.dashT = 1.6; b.ty = b.y; b.notches = [0.6, 0.25];
      this.showBanner('warning', 'WARNING', 'TIE ADVANCED x1 · DARTH VADER', 2.4);
      this.say('vader', 'I have you now.', 3);
      this.spawnWingmen(b);
    } else if (type === 'reactor') {
      b.tx = this.vw - Math.min(150, this.vw * 0.24); b.shield = 1; b.shT = 2.8; b.spawnT = 4; b.notches = [0.55, 0.2];
      this.showBanner('warning', 'WARNING', 'DEATH STAR II · MAIN REACTOR', 2.4);
    }
    this.boss = b; this.en.push(b);
    this.sfx('boss_hit');
    this.emit('boss', { boss: type });
  };
  F.spawnWingmen = function (b) {
    for (var i = -1; i <= 1; i += 2) { var w = this.mkEnemy('tie', this.vw + 150, 0.5); w.pattern = 'escort'; w.lead = b; w.off = i * 78; w.hp = 3; w.maxHp = 3; w.fireT = 2 + Math.random(); this.en.push(w); }
  };
  F.fightersLeft = function () { for (var i = 0; i < this.en.length; i++) { var t = this.en[i].type; if (t !== 'turret' && t !== 'asteroid') return true; } return false; };
  F.spawnPickup = function (type, x, y) { this.pk.push({ type: type, x: x, y: y, t: 0 }); };

  // ---- update ----
  F.update = function (dt, host) {
    dt = Math.min(dt || 0, 1 / 20);
    host = host || {};
    if (this.cw !== (this.canvas.clientWidth || W.innerWidth) || this.ch !== (this.canvas.clientHeight || W.innerHeight)) this.resize();
    this.t += dt;
    if (this.card) { this.card.t += dt; if (this.card.kind === 'intro' && this.card.t > 3.4 || this.card.kind === 'resume' && this.card.t > 1.6) this.card = null; }
    if (this.banner) { this.banner.t += dt; if (this.banner.t > this.banner.dur) this.banner = null; }
    if (this.toast) { this.toast.t += dt; if (this.toast.t > this.toast.dur) this.toast = null; }
    for (var r = this.radio.length - 1; r >= 0; r--) { this.radio[r].t -= dt; if (this.radio[r].t <= 0) this.radio.splice(r, 1); }
    this.trauma = Math.max(0, this.trauma - dt * this.T.shakeDecay);
    this.flash = Math.max(0, this.flash - dt * 1.6); this.hurtFlash = Math.max(0, this.hurtFlash - dt * 2.5);
    if (this.hitstop > 0) { this.hitstop -= dt; return; }
    this.updParts(dt);
    this.updChain(dt);
    for (var m = this.muzzle.length - 1; m >= 0; m--) { this.muzzle[m].t += dt; if (this.muzzle[m].t > 0.07) this.muzzle.splice(m, 1); }
    if (this.state !== 'play') {
      this.endT += dt;
      var sc0 = this.scroll() * (this.state === 'won' ? 1 : 0.3);
      this.dist += sc0 * dt;
      this.updBullets(dt); this.updTerrain(dt, sc0);
      if (this.state === 'won') { this.ship.x += 420 * dt * Math.min(1, this.endT); this.ship.tilt *= 0.9; }
      var doneAt = this.state === 'won' ? 5.6 : 2.8;
      if (this.endT > doneAt && !this.reported) {
        this.reported = true;
        this.emit(this.state === 'won' ? 'complete' : 'dead', { score: this.score, hull: this.hp, kills: this.kills, accuracy: this.accuracy(), resumeAt: this.checkpoint });
      }
      return;
    }
    if (this.hold && !this.fightersLeft()) this.hold = false;   // turrets / asteroids don't block a hold
    if (!this.boss && !this.hold) this.tl += dt;
    this.runEvents();
    var sc = this.scroll();
    this.dist += sc * dt;
    if (this.astRate > 0) {
      this.astAcc += this.astRate * dt;
      while (this.astAcc >= 1) {
        this.astAcc -= 1;
        var sz = Math.random() < 0.3 ? 3 : Math.random() < 0.6 ? 2 : 1;
        this.en.push(this.mkAsteroid(sz, this.vw + 60, rand(this.hudH + 30, this.vh - 30), -(sc * rand(0.6, 1.2) + rand(20, 100)), rand(-50, 50)));
      }
    }
    this.updTerrain(dt, sc);
    this.updShip(dt, host);
    this.updFire(dt, host);
    this.updEnemies(dt, sc);
    this.updBullets(dt);
    this.updPickups(dt, sc);
    this.collide();
    if (this.inv > 0) this.inv -= dt;
    if (this.spread > 0) this.spread -= dt;
    if (this.star > 0) this.star -= dt;
    if (this.cameo) { this.cameo.t += dt; if (this.cameo.t > 2.6) this.cameo = null; }
    if (this.phase === 'escape') {
      var cap = this.vw * (0.14 + 0.06 * Math.sin(this.t * 1.3)) + this.vw * 0.1 * clamp((this.fireball + 80) / 600, 0, 1);
      this.fireball = Math.min(this.fireball + 70 * dt, cap);
      if (this.ship.x - this.ship.r * 0.6 < this.fireball) this.hurt(1, true, 'fireball');
      if (Math.random() < 0.5) this.addPart('ember', this.fireball + rand(-30, 10), rand(0, this.vh), rand(60, 200), rand(-40, 40), rand(0.3, 0.7), 18, '#ff8a2e');
    }
  };

  F.updTerrain = function (dt, sc) {
    var want = this.walled() ? 1 : 0;
    this.wallK += clamp(want - this.wallK, -dt * 0.8, dt * 0.8);
    var segW = 40, i, s;
    for (i = 0; i < this.walls.length; i++) this.walls[i].x -= sc * dt;
    while (this.walls.length && this.walls[0].x + segW < -10) this.walls.shift();
    var lastX = this.walls.length ? this.walls[this.walls.length - 1].x + segW : -segW;
    var top = this.hudH * 0.4, bot = this.vh;
    while (lastX < this.vw + 80) {
      var d = this.dist + lastX, k = this.wallK;
      var tunnel = this.phase === 'tunnel' || this.phase === 'escape';
      var room = this.vh - this.hudH - 40;
      var gap = Math.min(room, tunnel ? 320 : 400);
      if (this.phase === 'port') gap = Math.min(room, 360);
      var sway = Math.min(190, (room + 40 - gap) * 0.45) * (this.phase === 'port' ? 0.12 : 1);   // capped so tall portrait screens don't get a much twistier tunnel
      var mid = (this.hudH + this.vh) / 2 + sway * (Math.sin(d * 0.0012) * 0.7 + Math.sin(d * 0.0033 + 1) * 0.3);
      var tY = mid - gap / 2, bY = mid + gap / 2;
      s = { x: lastX, top: top + (tY - top) * k, bot: bot + (bY - bot) * k, k: k, n: Math.floor(d / segW), tunnel: tunnel };
      this.walls.push(s);
      lastX += segW;
      if (k > 0.95 && this.phase === 'trench' && d > this.nextTurret) {
        this.nextTurret = d + rand(520, 820) / (this.def.turretDensity || 1);
        var side = Math.random() < 0.5 ? -1 : 1, tu = this.mkEnemy('turret', lastX, 0);
        tu.side = side; tu.seg = s; tu.vx = 0; this.en.push(tu);
      }
      if (k > 0.95 && tunnel && d > this.nextGirder) {
        this.nextGirder = d + rand(500, 780) * (this.phase === 'escape' ? 1.1 : 1);
        var fromTop = Math.random() < 0.5, clear = 180, len = Math.max(0, (s.bot - s.top) - clear);
        if (len > 30) this.girders.push({ x: lastX, w: 26, y0: fromTop ? s.top : s.bot - len, y1: fromTop ? s.top + len : s.bot });
      }
    }
    for (i = this.girders.length - 1; i >= 0; i--) { this.girders[i].x -= sc * dt; if (this.girders[i].x < -60) this.girders.splice(i, 1); }
    if (this.phase === 'port' && !this.port && this.state === 'play') {
      this.portTimer -= dt;
      if (this.portTimer <= 0) {
        this.port = { x: this.vw + 80, w: this.T.portW, hit: false };
        this.passes++;
        this.say('obiwan', this.passes === 1 ? 'Use the Force, {pilot}. Let go...' : 'Trust your instincts. Fire when the reticle turns green.', 3.2);
      }
    }
    if (this.port) {
      this.port.x -= sc * dt;
      var ps = this.wallAt(this.port.x + this.port.w / 2); this.port.y = ps ? ps.bot : this.vh - 30;
      if (this.port.x < -100 && !this.port.hit) { this.port = null; this.portTimer = 2.4; this.say('red_leader', 'Missed it! Coming around for another pass!', 2.8); this.emit('portMiss', {}); }
    }
  };
  F.wallAt = function (x) {
    var w = this.walls; if (!w.length) return null;
    var i = Math.floor((x - w[0].x) / 40);
    return i >= 0 && i < w.length ? w[i] : null;
  };

  F.botInput = function (tx, ty, fire) { this.bot = { tx: tx, ty: ty, fire: !!fire }; };
  F.updShip = function (dt, host) {
    var s = this.ship, T = this.T, I = this.input, inp = { L: !!host.L, R: !!host.R, U: !!host.U, D: !!host.D, hasTarget: false };
    var minX = 40, maxX = this.boss && !this.boss.entering ? Math.min(this.vw * 0.72, this.boss.x - this.boss.r - s.r - 30) : this.vw * 0.72, minY = this.hudH + s.r * 0.6, maxY = this.vh - s.r - 6;
    if (this.bot) { // scripted QA player: drives the same virtual-finger path as a real touch
      if (!I.active) { I.active = true; I.began = true; I.sx = I.cx = 0; I.sy = I.cy = 0; I.isBot = true; }
      else if (this.anchor) { I.cx = (this.bot.tx - this.anchor.x) * this.scale / T.swipeGain; I.cy = (this.bot.ty - this.anchor.y) * this.scale / T.swipeGain; }
    }
    if (I.active) {
      if (I.began || !this.anchor) { this.anchor = { x: s.x, y: s.y }; I.began = false; this.fx = I.cx; this.fy = I.cy; }
      var a = 1 - Math.exp(-dt / T.fingerSmooth);
      this.fx += (I.cx - this.fx) * a; this.fy += (I.cy - this.fy) * a;
      var dx = (this.fx - I.sx) / this.scale * T.swipeGain, dy = (this.fy - I.sy) / this.scale * T.swipeGain;
      var tx = this.anchor.x + dx, ty = this.anchor.y + dy, cx = clamp(tx, minX, maxX), cy = clamp(ty, minY, maxY);
      if (cx !== tx) this.anchor.x += cx - tx;
      if (cy !== ty) this.anchor.y += cy - ty;
      inp.hasTarget = true; inp.tx = cx; inp.ty = cy;
    } else this.anchor = null;
    inp.steer = inp.hasTarget ? clamp((inp.ty - s.y) / 120, -1, 1) : (inp.D ? 1 : 0) - (inp.U ? 1 : 0);
    var step = typeof this.P.stepShip === 'function' ? this.P.stepShip : stepShipDefault;
    var n = Math.max(1, Math.ceil(dt / (1 / 240))), h = dt / n;
    for (var i = 0; i < n; i++) step(s, inp, h, T);
    if (s.x < minX) { s.x = minX; s.vx = Math.max(0, s.vx); } if (s.x > maxX) { s.x = maxX; s.vx = Math.min(0, s.vx); }
    if (s.y < minY) { s.y = minY; s.vy = Math.max(0, s.vy); } if (s.y > maxY) { s.y = maxY; s.vy = Math.min(0, s.vy); }
    if (Math.random() < 0.7) this.addPart('trail', s.x - this.def.ship.tail, s.y + rand(-3, 3), -rand(160, 260), rand(-12, 12), 0.22, 9, this.def.ship.trail);
  };

  // straight-line torpedo prediction = the targeting reticle. gx = trench-floor point (moving with the floor) the torpedo will land on.
  F.torpLaunch = function () { var s = this.ship; return { x: s.x + 34, y: s.y + 10, a: this.T.torpAngle }; };
  F.torpPredict = function () {
    var L = this.torpLaunch(), sc = this.scroll(), V = this.T.torpV, x = L.x, y = L.y, vx = Math.cos(L.a) * V, vy = Math.sin(L.a) * V, h = 1 / 60;
    for (var t = 0; t < 2.5; t += h) {
      x += vx * h; y += vy * h;
      var w = this.wallAt(x);
      if (w && y >= w.bot - 2) return { gx: x + sc * t, y: w.bot, t: t, hx: x };
      if (x > this.vw + 40) return null;
    }
    return null;
  };
  F.updFire = function (dt, host) {
    var torpMode = this.phase === 'port';
    this.input.setMode(torpMode ? 'torpedo' : 'fire');
    this.fireCd -= dt;
    var want = this.input.fire || !!host.fire || !!host.throwing || !!this.opts.autoFire || (this.bot && this.bot.fire);
    if (!want || this.fireCd > 0) return;
    var s = this.ship;
    if (torpMode) {
      if (this.torp) return;
      var L = this.torpLaunch();
      this.torp = { x: L.x, y: L.y, vx: Math.cos(L.a) * this.T.torpV, vy: Math.sin(L.a) * this.T.torpV, t: 0 };
      this.fireCd = 1.0; this.sfx('torpedo'); this.muzzle.push({ ox: 34, oy: 10, t: 0, c: '#8fd0ff', big: 1 }); this.shake(0.12);
      return;
    }
    this.fireCd = 1 / this.T.fireRate;
    var V = this.T.bulletV, d = this.def.ship, self = this, ang = s.tilt * 0.25;
    var mk = function (ox, oy, a) { self.bul.push({ x: s.x + ox, y: s.y + oy, vx: Math.cos(a) * V, vy: Math.sin(a) * V, c: d.bolt }); };
    var pair = d.guns[this.shots % d.guns.length];
    for (var i = 0; i < pair.length; i++) { mk(pair[i][0], pair[i][1], ang); this.muzzle.push({ ox: pair[i][0], oy: pair[i][1], t: 0, c: d.bolt }); }
    if (this.spread > 0) { mk(24, 0, ang - 0.2); mk(24, 0, ang + 0.2); }
    this.shots++;
    this.sfx('laser');
  };

  F.updEnemies = function (dt, sc) {
    var s = this.ship;
    for (var i = this.en.length - 1; i >= 0; i--) {
      var e = this.en[i]; e.t += dt; if (e.hit > 0) e.hit -= dt;
      switch (e.type) {
        case 'tie':
          if (e.pattern === 'escort') {
            if (e.lead && e.lead.hp > 0 && this.boss === e.lead) { e.x += (e.lead.x + 60 - e.x) * Math.min(1, dt * 3); e.y += (clamp(e.lead.y + e.off, this.hudH + 30, this.vh - 30) - e.y) * Math.min(1, dt * 3); break; }
            e.pattern = 'dive';
          }
          e.x += e.vx * dt;
          if (e.pattern === 'sine') e.y = e.y0 + Math.sin(e.t * 2.2 + e.ph) * 70;
          else if (e.pattern === 'dive' && e.x > s.x + 80) e.y += clamp(s.y - e.y, -1, 1) * 80 * dt;
          if (e.behind && e.x > this.vw * 0.62) { e.vx = -Math.abs(e.vx) * 0.8; e.behind = false; }
          break;
        case 'interceptor':
          e.x += e.vx * dt; if (e.x > s.x + 90) e.y += clamp(s.y - e.y, -1, 1) * 190 * dt;
          if (e.behind && e.x > this.vw * 0.66) { e.vx = -Math.abs(e.vx) * 0.85; e.behind = false; }
          break;
        case 'turret': {
          var sg = e.seg; e.x = sg.x + 20; e.y = e.side < 0 ? sg.top + 9 : sg.bot - 9;
          var a = Math.atan2(s.y - e.y, s.x - e.x);
          e.aim = e.side < 0 ? Math.PI / 2 - a : a + Math.PI / 2;
          break; }
        case 'asteroid':
          e.x += e.vx * dt; e.y += e.vy * dt; e.rot += e.vr * dt;
          if (e.y < this.hudH * 0.6 && e.vy < 0 || e.y > this.vh - 10 && e.vy > 0) e.vy = -e.vy;
          break;
        case 'vader': this.updVader(e, dt); break;
        case 'reactor': this.updReactor(e, dt, sc); break;
      }
      var d = EDEF[e.type];
      if (d && d.fire && !e.entering && e.type !== 'vader' && e.type !== 'reactor' && e.x < this.vw - 20 && e.x > s.x + 60 && !e.behind) {
        e.fireT -= dt * (this.def.fireMul || 1) * (this.walled() ? (this.def.walledFireMul || 1) : 1);
        if (e.fireT <= 0) { e.fireT = rand(d.fire[0], d.fire[1]); this.enemyFire(e); }
      }
      if (!e.isBoss && (e.x < -140 && !e.behind || e.x > this.vw + 500 || e.type === 'turret' && e.x < -40)) this.en.splice(i, 1);
    }
  };
  F.updVader = function (e, dt) {
    var s = this.ship;
    if (e.entering) { e.x -= 240 * dt; e.y += (s.y - e.y) * Math.min(1, dt); if (e.x <= e.tx) e.entering = false; return; }
    var f = e.hp / e.maxHp, ph = f > 0.6 ? 1 : f > 0.25 ? 2 : 3;
    if (ph !== e.bphase) {
      e.bphase = ph; this.flash = 0.35; this.shake(0.4);
      if (ph === 2) { this.showBanner('phase', 'PHASE 2', 'VADER IS ENRAGED: DODGE THE SPREAD!', 2); this.say('vader', 'The Force is strong with this one.', 3); this.spawnWingmen(e); }
      else { this.showBanner('phase', 'FINAL PHASE', 'HE\'S BREAKING! KEEP FIRING!', 2); this.say('han', 'Hang on, kid. I\'m coming in!', 2.8); }
      this.emit('bossPhase', { boss: 'vader', phase: ph });
    }
    e.x = e.tx + Math.sin(e.t * 0.8) * 36;
    if (ph === 2) { e.dashT -= dt; if (e.dashT <= 0) { e.dashT = 1.7; e.ty = clamp(s.y + rand(-140, 140), this.hudH + 40, this.vh - 40); } e.y += clamp(e.ty - e.y, -380 * dt, 380 * dt); }
    else e.y += clamp((s.y - e.y) * 1.6, -(ph === 3 ? 260 : 190), ph === 3 ? 260 : 190) * dt;
    e.fireT -= dt;
    e.tele = e.fireT < 0.45;
    if (e.fireT <= 0) { e.fireT = ph === 1 ? 1.6 : ph === 2 ? 1.4 : 1.15; e.burstQ = [0, 0.13, 0.26]; e.burstT = 0; e.burstSpread = ph >= 2; }
    if (e.burstQ && e.burstQ.length) {
      e.burstT += dt;
      while (e.burstQ.length && e.burstT >= e.burstQ[0]) {
        e.burstQ.shift();
        var ang = Math.atan2(s.y - e.y, s.x - e.x), offs = e.burstSpread ? [-0.2, 0, 0.2] : [0], V = 400 * Math.max(0.85, this.spd);
        for (var o = 0; o < offs.length; o++) this.eb.push({ x: e.x - 24, y: e.y, vx: Math.cos(ang + offs[o]) * V, vy: Math.sin(ang + offs[o]) * V, r: 5, c: '#4dff6a' });
        this.muzzleAt(e.x - 26, e.y, '#4dff6a');
        this.sfx('tie_laser');
      }
    }
  };
  F.updReactor = function (e, dt, sc) {
    if (e.entering) { e.x -= sc * dt; if (e.x <= e.tx) { e.x = e.tx; e.entering = false; } }
    e.y = (this.hudH + this.vh) / 2 + Math.sin(e.t * 0.6) * Math.min(60, (this.vh - this.hudH) * 0.12);
    if (e.entering) return;
    var f = e.hp / e.maxHp, ph = f > 0.55 ? 1 : f > 0.2 ? 2 : 3;
    if (ph !== e.bphase) {
      e.bphase = ph; this.flash = 0.35; this.shake(0.45);
      this.showBanner('phase', ph === 2 ? 'PHASE 2' : 'FINAL PHASE', ph === 2 ? 'CORE OVERLOAD: MORE INTERCEPTORS!' : 'CORE CRITICAL: SPIRAL FIRE!', 2);
      this.say('lando', ph === 2 ? 'It\'s working! Keep hitting it!' : 'One more run! Chewie, everything we\'ve got!', 2.8);
      this.emit('bossPhase', { boss: 'reactor', phase: ph });
    }
    e.shT -= dt;
    if (e.shT <= 0) {
      e.shield = e.shield ? 0 : 1;
      e.shT = e.shield ? [0, 2.8, 2.4, 1.8][ph] : [0, 2.6, 2.4, 2.8][ph];
      if (!e.shield) { this.showToast('SHIELD DOWN · FIRE!', '#77ffff', 1.4); this.sfx('checkpoint'); }
    }
    e.fireT -= dt;
    e.tele = e.fireT < 0.65;
    if (e.fireT <= 0) {
      e.fireT = [0, 2.4, 1.9, 1.55][ph];
      // ring density follows the real distance to the ship, so the gaps stay ~150 px wide on narrow portrait screens too
      var span = ph === 3 ? TAU : Math.PI * 1.1, dist = Math.max(160, e.x - this.ship.x);
      var n = Math.min([0, 9, 12, 14][ph], Math.max(5, Math.round(span * dist / (ph === 3 ? 120 : 140)))), off = ph === 3 ? e.t * 1.7 : Math.PI, V = 210 * Math.max(0.85, this.spd);
      for (var k = 0; k < n; k++) { var a = off + (k / n - 0.5) * span; if (Math.cos(a) < 0.25) this.eb.push({ x: e.x - 30, y: e.y, vx: Math.cos(a) * V, vy: Math.sin(a) * V, r: 6, c: '#77ffff' }); }
      this.addPart('ring', e.x, e.y, 0, 0, 0.4, e.r * 1.6, '#77ffff');
      this.sfx('enemy_laser');
    }
    e.spawnT -= dt;
    if (e.spawnT <= 0) { e.spawnT = [0, 5, 3.6, 3][ph]; var it = this.mkEnemy('interceptor', -60, Math.random()); it.vx = 380 * this.spd; it.behind = true; this.en.push(it); }
  };
  F.muzzleAt = function (x, y, c) { this.addPart('flash', x, y, 0, 0, 0.07, 26, c); };
  F.enemyFire = function (e) {
    var s = this.ship, V = 360 * Math.max(0.85, this.spd), aim = Math.atan2(s.y - e.y, s.x - e.x), sl = this.def.aimSloppy || 0.08;
    var ox = e.type === 'turret' ? 0 : -12, a = aim + rand(-sl, sl);
    this.eb.push({ x: e.x + ox, y: e.y, vx: Math.cos(a) * V, vy: Math.sin(a) * V, r: 5, c: '#4dff6a' });
    this.muzzleAt(e.x + ox, e.y, '#4dff6a');
    this.sfx('enemy_laser');
  };

  F.updBullets = function (dt) {
    var i, b;
    for (i = this.bul.length - 1; i >= 0; i--) { b = this.bul[i]; b.x += b.vx * dt; b.y += b.vy * dt; if (b.x > this.vw + 40 || b.y < -40 || b.y > this.vh + 40) this.bul.splice(i, 1); }
    for (i = this.eb.length - 1; i >= 0; i--) { b = this.eb[i]; b.x += b.vx * dt; b.y += b.vy * dt; if (b.x < -40 || b.x > this.vw + 60 || b.y < -40 || b.y > this.vh + 40) this.eb.splice(i, 1); }
    var tp = this.torp;
    if (!tp) return;
    tp.t += dt;
    if (this.port && !this.port.hit) { // gentle homing: only when close AND already roughly on line
      var px = this.port.x + this.port.w / 2, py = this.port.y + 4, ddx = px - tp.x;
      if (ddx > -10 && ddx < this.T.torpRange) {
        var want = Math.atan2(py - tp.y, ddx), cur = Math.atan2(tp.vy, tp.vx), dA = Math.atan2(Math.sin(want - cur), Math.cos(want - cur));
        if (Math.abs(dA) < 0.9) { cur += clamp(dA, -this.T.torpTurn * dt, this.T.torpTurn * dt); tp.vx = Math.cos(cur) * this.T.torpV; tp.vy = Math.sin(cur) * this.T.torpV; }
      }
    }
    tp.x += tp.vx * dt; tp.y += tp.vy * dt;
    this.addPart('trail', tp.x - 8, tp.y, -60, rand(-15, 15), 0.3, 10, '#8fd0ff');
    var w = this.wallAt(tp.x), fl = w ? w.bot : this.vh;
    if (this.port && !this.port.hit && Math.abs(tp.x - (this.port.x + this.port.w / 2)) < this.port.w / 2 - 6 && tp.y >= this.port.y - 6) {
      this.port.hit = true; this.torp = null;
      this.boom(tp.x, this.port.y, 1.6); this.hitstop = 0.18;
      this.say('han', 'Great shot, kid! That was one in a million!', 3.2);
      this.win();
    } else if (tp.y >= fl - 3) {
      this.boom(tp.x, fl - 4, 0.7); this.torp = null;
      this.say('red_leader', this.port ? 'Negative! It just impacted off the surface!' : 'Too early! Wait for the port!', 2.4);
      this.emit('torpMiss', {});
    } else if (tp.x > this.vw + 40 || tp.t > 3) this.torp = null;
  };
  F.updPickups = function (dt, sc) {
    for (var i = this.pk.length - 1; i >= 0; i--) {
      var p = this.pk[i]; p.t += dt; p.x -= sc * 0.55 * dt; p.y += Math.sin(p.t * 3) * 20 * dt;
      if (Math.hypot(p.x - this.ship.x, p.y - this.ship.y) < this.ship.r + 24) { this.pickup(p.type, p.x, p.y); this.pk.splice(i, 1); }
      else if (p.x < -40) this.pk.splice(i, 1);
    }
  };
  F.pickup = function (t, x, y) {
    var label = '+100';
    if (t === 'heart') { this.hp = Math.min(this.maxHp, this.hp + 1); this.sfx('heal'); label = '+1 HULL'; }
    else if (t === 'taco_shell') { this.hp = this.maxHp; this.sfx('heal'); label = 'HULL REPAIRED'; }
    else if (t === 'salsa') { this.spread = 10; this.sfx('pickup'); label = 'SALSA SPREAD!'; }
    else if (t === 'star') { this.star = 8; this.sfx('star'); label = 'STAR POWER!'; }
    else { this.score += 100; this.sfx('coin'); }
    if (this.hp > 1) this.lowWarned = false;
    this.showToast(label, '#ffe66d', 1.2);
    for (var i = 0; i < 10; i++) this.addPart('spark', x, y, rand(-200, 200), rand(-200, 200), rand(0.2, 0.4), 3, '#ffe66d');
    this.emit('pickup', { type: t });
  };

  F.collide = function () {
    var s = this.ship, i, j, e, b;
    for (i = this.bul.length - 1; i >= 0; i--) {
      b = this.bul[i];
      for (j = this.en.length - 1; j >= 0; j--) {
        e = this.en[j];
        if (Math.abs(b.x - e.x) < e.r + 8 && Math.abs(b.y - e.y) < e.r + 4) {
          this.bul.splice(i, 1);
          if (e.x > this.vw + 10) break;
          if (e.entering || e.type === 'reactor' && e.shield) { this.addPart('spark', b.x, b.y, rand(-260, -60), rand(-200, 200), 0.2, 3, '#77ffff'); break; }
          e.hp--; e.hit = 0.07; this.hits++;
          this.addPart('flash', b.x, b.y, 0, 0, 0.06, 20, '#ffb347');
          for (var k = 0; k < 3; k++) this.addPart('spark', b.x, b.y, rand(-260, 40), rand(-160, 160), rand(0.1, 0.25), 2.5, '#ffd27a');
          if (e.isBoss) { this.sfx('boss_hit'); this.shake(0.04); }
          if (e.hp <= 0) this.kill(e, j);
          break;
        }
      }
    }
    for (i = this.bul.length - 1; i >= 0; i--) { b = this.bul[i]; for (j = 0; j < this.girders.length; j++) { var g = this.girders[j]; if (b.x > g.x && b.x < g.x + g.w && b.y > g.y0 && b.y < g.y1) { this.addPart('spark', b.x, b.y, rand(-200, -40), rand(-120, 120), 0.18, 2.5, '#ffcc66'); this.bul.splice(i, 1); break; } } }
    for (i = this.eb.length - 1; i >= 0; i--) { b = this.eb[i]; if (Math.hypot(b.x - s.x, b.y - s.y) < s.r * 0.72 + b.r) { this.eb.splice(i, 1); this.hurt(1, false, 'bolt'); } }
    for (j = this.en.length - 1; j >= 0; j--) {
      e = this.en[j];
      if (Math.hypot(e.x - s.x, e.y - s.y) < e.r * 0.8 + s.r * 0.68) {
        if (this.star > 0 && !e.isBoss) { this.kill(e, j); continue; }
        this.hurt(1, false, 'ram:' + e.type);
        if (!e.isBoss && e.type !== 'turret') { e.hp -= 2; e.hit = 0.1; if (e.hp <= 0) this.kill(e, j); }
      }
    }
    if (this.walls.length) {
      var hitW = false;
      for (j = 0; j < this.walls.length; j++) {
        var w = this.walls[j];
        if (w.k < 0.3 || w.x > s.x + s.r * 0.8 || w.x + 40 < s.x - s.r * 0.8) continue;
        if (s.y - s.r * 0.55 < w.top) { s.y = w.top + s.r * 0.55 + 1; s.vy = Math.abs(s.vy) * 0.4 + 140; hitW = true; }
        if (s.y + s.r * 0.55 > w.bot) { s.y = w.bot - s.r * 0.55 - 1; s.vy = -Math.abs(s.vy) * 0.4 - 140; hitW = true; }
      }
      for (j = 0; j < this.girders.length; j++) {
        var gd = this.girders[j];
        if (s.x + s.r * 0.7 > gd.x && s.x - s.r * 0.7 < gd.x + gd.w && s.y + s.r * 0.45 > gd.y0 && s.y - s.r * 0.45 < gd.y1) { s.x = gd.x - s.r * 0.7 - 1; s.vx = -220; hitW = true; }
      }
      if (hitW) {
        for (var q = 0; q < 4; q++) this.addPart('spark', s.x, s.y, rand(-300, -60), rand(-150, 150), 0.25, 3, '#ffd27a');
        this.hurt(1, false, 'wall');
        if (this.anchor) { this.anchor.x = s.x; this.anchor.y = s.y; this.input.sx = this.input.cx; this.input.sy = this.input.cy; this.fx = this.input.cx; this.fy = this.input.cy; }
      }
    }
  };
  F.hurt = function (n, fire, cause) {
    if (this.inv > 0 || this.god || this.star > 0 || this.state !== 'play') return;
    this.hp -= n; this.inv = this.T.iframes; this.shake(0.55); this.hurtFlash = 1; this.hitstop = this.T.hitstop;
    this.sfx('ship_hit');
    for (var i = 0; i < 12; i++) this.addPart('spark', this.ship.x, this.ship.y, rand(-260, 260), rand(-260, 260), rand(0.2, 0.45), 3, fire ? '#ff8a2e' : '#fff3c0');
    this.addPart('smoke', this.ship.x, this.ship.y, -80, 0, 0.8, 30, '');
    this.emit('hurt', { hp: this.hp, cause: cause || 'hit' });
    if (this.hp === 1 && !this.lowWarned) { this.lowWarned = true; this.showToast('HULL CRITICAL!', '#ff4a4a', 1.8); }
    if (this.hp <= 0) {
      this.hp = 0; this.state = 'dead'; this.endT = 0; this.card = { kind: 'dead', t: 0 }; this.torp = null;
      this.boom(this.ship.x, this.ship.y, 1.8); this.hitstop = 0.15; this.sfx('die'); this.input.setMode('fire');
    }
  };
  F.kill = function (e, j) {
    this.en.splice(j, 1); this.kills++; this.score += e.pts || 100;
    var rock = e.type === 'asteroid';
    this.boom(e.x, e.y, e.isBoss ? 2.4 : rock ? e.size * 0.38 : 0.85, rock);
    this.sfx(e.isBoss ? 'boss_die' : 'explode');
    if (rock && e.size > 1) for (var k = 0; k < 2; k++) this.en.push(this.mkAsteroid(e.size - 1, e.x, e.y, e.vx * 0.8 + rand(-40, 40), (k ? 1 : -1) * rand(60, 140)));
    if (!e.isBoss && !rock && e.type !== 'turret' && Math.random() < (this.def.dropRate || 0.1)) this.spawnPickup(['heart', 'salsa', 'salsa', 'star'][Math.floor(Math.random() * 4)], e.x, e.y);
    if (e.isBoss) {
      this.boss = null; this.flash = 1; this.shake(1); this.hitstop = 0.25;
      for (var c = 0; c < 6; c++) this.chain.push({ t: 0.15 + c * 0.16, x: e.x + rand(-50, 50), y: e.y + rand(-50, 50) });
      for (var q = this.en.length - 1; q >= 0; q--) if (this.en[q].lead === e) { this.boom(this.en[q].x, this.en[q].y, 0.8); this.en.splice(q, 1); }
      this.eb.length = 0;
      var od = this.def.bossDefeat && this.def.bossDefeat[e.type], me = this;
      if (od) od.forEach(function (r) { me.say(r[0], r[1], r[2]); });
      this.showBanner('clear', e.type === 'vader' ? 'VADER SPUN OUT!' : 'REACTOR HIT!', '+' + e.pts, 2);
      if (e.type === 'vader') this.cameo = { t: 0 };
      if (/chew|ewok|wicket/.test(this.pilotKey)) this.sfx('roar');
      this.emit('bossDefeated', { boss: e.type });
    }
  };
  F.updChain = function (dt) { for (var i = this.chain.length - 1; i >= 0; i--) { var c = this.chain[i]; c.t -= dt; if (c.t <= 0) { this.boom(c.x, c.y, 1.1); this.sfx('explosion'); this.chain.splice(i, 1); } } };
  F.accuracy = function () { var per = this.def.ship.guns[0].length; return this.shots ? Math.round(100 * Math.min(1, this.hits / (this.shots * per))) : 0; };
  F.win = function () {
    if (this.state !== 'play') return;
    this.state = 'won'; this.endT = 0; this.bonus = this.hp * 1000; this.score += this.bonus; this.sfx('clear');
    this.card = { kind: 'outro', t: 0 }; this.input.setMode('fire'); this.eb.length = 0;
    if (this.phase === 'port') { this.flash = 1; this.shake(1); for (var c = 0; c < 8; c++) this.chain.push({ t: 0.6 + c * 0.12, x: rand(0, this.vw), y: rand(this.hudH, this.vh) }); }
  };

  // ---------- particles: spark (streak), ember/flash/trail (additive glow), smoke, debris (spinning chip), ring (shockwave) ----------
  F.addPart = function (k, x, y, vx, vy, life, sz, c) {
    if (this.parts.length >= 520) { if (k === 'trail' || k === 'spark') return; this.parts.shift(); }
    this.parts.push({ k: k, x: x, y: y, vx: vx, vy: vy, t: 0, life: life, sz: sz, c: c, rot: Math.random() * TAU });
  };
  F.boom = function (x, y, big, rock) {
    var n = Math.round(14 * big), i, a, v;
    this.addPart('flash', x, y, 0, 0, 0.12, 70 * big, rock ? '#ffd9a0' : '#fff2b0');
    this.addPart('ring', x, y, 0, 0, 0.42, 34 * big, rock ? '#d8c8b0' : '#ffd890');
    for (i = 0; i < n; i++) { a = rand(0, TAU); v = rand(40, 240) * big; this.addPart('ember', x, y, Math.cos(a) * v, Math.sin(a) * v, rand(0.3, 0.7), rand(16, 30) * Math.min(big, 1.4), rock ? '#c8a070' : ['#ffb347', '#ff6a1f', '#ffd36e'][i % 3]); }
    for (i = 0; i < n; i++) { a = rand(0, TAU); v = rand(150, 460) * big; this.addPart('spark', x, y, Math.cos(a) * v, Math.sin(a) * v, rand(0.15, 0.4), 2.5, rock ? '#e0d0b8' : '#fff0b0'); }
    for (i = 0; i < Math.ceil(n / 3); i++) { a = rand(0, TAU); v = rand(80, 260) * big; this.addPart('debris', x, y, Math.cos(a) * v, Math.sin(a) * v, rand(0.5, 1), rand(3, 6), rock ? '#6d6158' : '#5d6470'); }
    for (i = 0; i < Math.ceil(n / 4); i++) this.addPart('smoke', x + rand(-10, 10), y + rand(-10, 10), rand(-90, -20), rand(-30, 30), rand(0.7, 1.2), rand(24, 40) * big, '');
    this.shake(0.12 + 0.18 * big);
  };
  F.updParts = function (dt) {
    for (var i = this.parts.length - 1; i >= 0; i--) {
      var p = this.parts[i]; p.t += dt;
      if (p.t >= p.life) { this.parts.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      var damp = p.k === 'smoke' ? 0.96 : p.k === 'ember' ? 0.92 : 0.97; p.vx *= damp; p.vy *= damp;
      if (p.k === 'debris') p.rot += dt * 9;
    }
  };

  // ---------- caches ----------
  F.sprite = function (key) {
    var f = SPRITE_FILES[key], im = f && img(this.artBase, f[0]), c = this.spr[key];
    if (im) {
      if (!c || c.src !== im) { var w = f[1] || im.width; c = this.spr[key] = { src: im, img: im, w: w, h: w * im.height / im.width, white: whiteOf(im, im.width, im.height) }; }
      return c;
    }
    if (c) return c;
    var box = VEC_BOX[key]; if (!box) return null;
    var cv = mkCanvas(box[0] * VEC_RES, box[1] * VEC_RES), x = cv.getContext('2d');
    x.scale(VEC_RES, VEC_RES); x.translate(box[0] / 2, box[1] / 2); ART[key](x);
    var dw = (f && f[1]) || box[0];
    return (this.spr[key] = { src: null, img: cv, w: dw, h: dw * box[1] / box[0], white: whiteOf(cv, cv.width, cv.height) });
  };
  F.getBake = function (key, build) { var b = this.bake[key]; if (b === undefined) b = this.bake[key] = build.call(this) || null; return b; };
  F.starLayer = function (L) { // code-drawn parallax star layers, baked once per screen size
    return this.getBake('stars' + L, function () {
      var k = this.scale * this.dpr, w = Math.ceil(this.vw), h = Math.ceil(this.vh), cv = mkCanvas(w * k, h * k), x = cv.getContext('2d');
      x.scale(k, k);
      var n = Math.round(w * h / [2600, 5200, 11000][L]), cols = [['#6f7596', '#8a8fb0'], ['#b9c2ff', '#ffffff'], ['#ffffff', '#ffe9c4']][L];
      for (var i = 0; i < n; i++) {
        var sx = hash(i * 3 + L * 7919) * w, sy = hash(i * 5 + 13 + L * 104729) * h, z = [0.9, 1.4, 2.1][L] * (0.6 + hash(i + 77) * 0.8);
        x.fillStyle = cols[i % 2]; x.globalAlpha = [0.55, 0.8, 1][L];
        x.fillRect(sx, sy, z, z);
        if (L === 2 && i % 5 === 0) { x.globalAlpha = 0.45; x.fillRect(sx - z * 2, sy + z / 2 - 0.4, z * 5, 0.8); x.fillRect(sx + z / 2 - 0.4, sy - z * 2, 0.8, z * 5); }
      }
      if (L === 0 && !img(this.artBase, 'space/far.webp')) { // code nebula when Teddy's far layer is missing
        var cl = this.def.bg === 'yavin' ? ['rgba(70,40,140,.16)', 'rgba(20,90,140,.13)', 'rgba(140,40,110,.1)'] : ['rgba(150,40,130,.16)', 'rgba(40,120,120,.12)', 'rgba(90,40,160,.12)'];
        for (var j = 0; j < 5; j++) {
          var gx = hash(j * 31 + 5) * w, gy = hash(j * 17 + 9) * h, gr = (0.25 + hash(j * 7) * 0.35) * Math.max(w, h);
          var g = x.createRadialGradient(gx, gy, 0, gx, gy, gr); g.addColorStop(0, cl[j % 3]); g.addColorStop(1, 'rgba(0,0,0,0)');
          x.globalAlpha = 1; x.fillStyle = g; x.fillRect(0, 0, w, h);
        }
      }
      return cv;
    });
  };
  F.planet = function (key) {
    return this.getBake(key, function () {
      var R = 160, k = Math.min(3, this.scale * this.dpr * 1.2), cv = mkCanvas(R * 2 * k, R * 2 * k), x = cv.getContext('2d'), i;
      x.scale(k, k); x.translate(R, R);
      if (key === 'gas') {
        var g = x.createRadialGradient(-R * 0.35, -R * 0.35, R * 0.1, 0, 0, R); g.addColorStop(0, '#ffc477'); g.addColorStop(0.5, '#d2622b'); g.addColorStop(1, '#3a0f12');
        x.fillStyle = g; x.beginPath(); x.arc(0, 0, R, 0, TAU); x.fill(); x.save(); x.clip(); x.globalAlpha = 0.16;
        for (i = 0; i < 9; i++) { x.fillStyle = i % 2 ? '#fff0c0' : '#5a1a10'; x.fillRect(-R, -R + i * R * 0.24, R * 2, R * 0.09); } x.restore();
      } else if (key === 'endor') {
        var g2 = x.createRadialGradient(R * 0.3, -R * 0.3, R * 0.1, 0, 0, R); g2.addColorStop(0, '#a7dca0'); g2.addColorStop(0.55, '#2f6b3d'); g2.addColorStop(1, '#08160f');
        x.fillStyle = g2; x.beginPath(); x.arc(0, 0, R, 0, TAU); x.fill();
        x.save(); x.clip(); x.globalAlpha = 0.18; for (i = 0; i < 26; i++) { x.fillStyle = i % 3 ? '#1d4a2a' : '#cfe8d0'; x.beginPath(); x.ellipse((hash(i) - 0.5) * R * 2, (hash(i + 40) - 0.5) * R * 2, R * (0.08 + hash(i + 9) * 0.18), R * 0.05, 0.2, 0, TAU); x.fill(); } x.restore();
        x.strokeStyle = 'rgba(170,230,255,.35)'; x.lineWidth = 3; x.beginPath(); x.arc(0, 0, R - 1.5, -Math.PI * 0.9, Math.PI * 0.1); x.stroke();
      } else if (key === 'ds') {
        var g3 = x.createRadialGradient(-R * 0.35, -R * 0.35, R * 0.1, 0, 0, R); g3.addColorStop(0, '#cdd0d6'); g3.addColorStop(1, '#3a3d44');
        x.fillStyle = g3; x.beginPath(); x.arc(0, 0, R, 0, TAU); x.fill();
        x.fillStyle = '#2a2c32'; x.beginPath(); x.arc(-R * 0.35, -R * 0.35, R * 0.22, 0, TAU); x.fill(); x.fillStyle = '#1d1f24'; x.fillRect(-R, -2, R * 2, 4);
      } else if (key === 'ds2') { // half-built: solid left, open framework right
        var moon = img(this.artBase, 'space/planet_battle_moon.webp');
        if (!moon && this.artBase !== null && this.t < 2) { delete this.bake[key]; } // art may still be loading: retry next frame
        x.save(); x.beginPath(); x.rect(-R - 2, -R - 2, R * 1.25, R * 2 + 4); x.clip();
        x.drawImage(moon || this.planet('ds'), -R, -R, R * 2, R * 2);
        x.restore();
        x.save(); x.beginPath(); x.arc(0, 0, R, 0, TAU); x.clip(); x.strokeStyle = 'rgba(170,180,200,.55)'; x.lineWidth = 1.2;
        for (i = -5; i <= 5; i++) { x.beginPath(); x.moveTo(R * 0.25, i * R / 6); x.lineTo(R, i * R / 6); x.stroke(); }
        for (i = 1; i <= 3; i++) { x.beginPath(); x.ellipse(0, 0, R * (0.25 + i * 0.25), R, 0, -Math.PI / 2, Math.PI / 2); x.stroke(); }
        x.restore(); x.strokeStyle = 'rgba(170,180,200,.65)'; x.lineWidth = 1.5; x.beginPath(); x.arc(0, 0, R, -Math.PI / 2, Math.PI / 2); x.stroke();
      }
      return cv;
    });
  };
  F.vignette = function () {
    return this.getBake('vig', function () {
      var cv = mkCanvas(256, 256), x = cv.getContext('2d'), g = x.createRadialGradient(128, 128, 60, 128, 128, 181);
      g.addColorStop(0, 'rgba(255,0,0,0)'); g.addColorStop(1, 'rgba(255,20,20,.85)'); x.fillStyle = g; x.fillRect(0, 0, 256, 256); return cv;
    });
  };
  F.scan = function () {
    return this.getBake('scan', function () { var cv = mkCanvas(4, 4), x = cv.getContext('2d'); x.fillStyle = 'rgba(0,0,0,.28)'; x.fillRect(0, 0, 4, 2); return this.ctx.createPattern(cv, 'repeat'); });
  };

  // ---------- draw (world) ----------
  F.draw = function () {
    var c = this.ctx, k = this.scale * this.dpr, tr = this.trauma * this.trauma, S = this.T.shakeMax;
    var ox = S * tr * (Math.sin(this.t * 47) * 0.6 + Math.sin(this.t * 83 + 1.3) * 0.4), oy = S * tr * (Math.sin(this.t * 53 + 2.1) * 0.6 + Math.sin(this.t * 71 + 0.4) * 0.4);
    c.setTransform(k, 0, 0, k, ox * k, oy * k);
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    this.drawBG(c);
    this.drawTerrain(c);
    var i;
    for (i = 0; i < this.pk.length; i++) this.drawPickup(c, this.pk[i]);
    for (i = 0; i < this.en.length; i++) this.drawEnemy(c, this.en[i]);
    if (this.cameo) { var q = this.cameo.t / 2.6; this.drawSprite(c, 'falcon', -90 + q * (this.vw + 240), this.hudH + 50 + Math.sin(q * 3) * 30, 0.12, 0); }
    this.drawBolts(c);
    if (this.phase === 'port' && this.state === 'play') this.drawReticle(c);
    if (this.torp) this.glint(c, this.torp.x, this.torp.y, '#6cc4ff', 44);
    this.drawShip(c);
    this.drawParts(c);
    if (this.phase === 'escape' && this.fireball > -80) this.drawFireball(c);
    if (this.flash > 0) { c.fillStyle = 'rgba(255,255,255,' + Math.min(1, this.flash) * 0.85 + ')'; c.fillRect(-20, -20, this.vw + 40, this.vh + 40); }
    this.drawHUD();
  };
  F.drawSprite = function (c, key, x, y, rot, hit) {
    var sp = this.sprite(key); if (!sp) return;
    var w = sp.w, h = sp.h;
    if (rot) { c.save(); c.translate(x, y); c.rotate(rot); x = 0; y = 0; }
    c.drawImage(sp.img, x - w / 2, y - h / 2, w, h);
    if (hit > 0) { c.globalAlpha = Math.min(1, hit * 12); c.drawImage(sp.white, x - w / 2, y - h / 2, w, h); c.globalAlpha = 1; }
    if (rot) c.restore();
  };
  F.glint = function (c, x, y, col, s) { c.globalCompositeOperation = 'lighter'; c.drawImage(glow(col), x - s / 2, y - s / 2, s, s); c.globalCompositeOperation = 'source-over'; };
  F.drawEnemy = function (c, e) {
    if (e.type === 'asteroid') {
      var im = img(this.artBase, SPRITE_FILES.asteroid[0]);
      c.save(); c.translate(e.x, e.y); c.rotate(e.rot);
      if (im) { var d = e.r * 2.35; c.drawImage(im, -d / 2, -d / 2, d, d); }
      else { c.fillStyle = e.col; c.strokeStyle = '#2a2420'; c.lineWidth = 2; c.beginPath(); for (var i = 0; i < e.shape.length; i++) { var a = i / e.shape.length * TAU, r = e.r * e.shape[i]; if (i) c.lineTo(Math.cos(a) * r, Math.sin(a) * r); else c.moveTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); c.fill(); c.stroke(); }
      c.restore();
      if (e.hit > 0) this.glint(c, e.x, e.y, '#ffd27a', e.r * 2);
      return;
    }
    if (e.type === 'reactor') { this.drawReactor(c, e); return; }
    if (e.type === 'turret') {
      c.save(); c.translate(e.x, e.y); if (e.side < 0) c.scale(1, -1);
      c.save(); c.translate(0, 4); c.rotate(e.aim || 0); c.fillStyle = '#9aa0aa'; c.strokeStyle = '#2f3238'; c.lineWidth = 1.2; c.fillRect(-3, -24, 6, 22); c.strokeRect(-3, -24, 6, 22); c.restore();
      var sp = this.sprite('turret'); c.drawImage(sp.img, -sp.w / 2, -sp.h / 2, sp.w, sp.h);
      if (e.hit > 0) { c.globalAlpha = 0.8; c.drawImage(sp.white, -sp.w / 2, -sp.h / 2, sp.w, sp.h); c.globalAlpha = 1; }
      c.restore();
      if (e.fireT < 0.3 && e.x > this.ship.x + 60) this.glint(c, e.x, e.y, '#4dff6a', 24);
      return;
    }
    this.drawSprite(c, e.type === 'vader' ? 'vader' : e.type === 'interceptor' ? 'interceptor' : 'tie', e.x, e.y, e.type === 'vader' ? Math.sin(e.t * 2) * 0.06 : 0, e.hit);
    if (e.isBoss && e.entering) { c.strokeStyle = 'rgba(255,60,60,' + (0.4 + 0.4 * Math.sin(this.t * 14)) + ')'; c.lineWidth = 2; c.beginPath(); c.arc(e.x, e.y, e.r * 1.6, 0, TAU); c.stroke(); }
    if (e.type === 'vader' && e.tele) this.glint(c, e.x - 26, e.y, '#ff3b3b', 30 + 16 * Math.sin(this.t * 30));
    else if (!e.isBoss && e.fireT < 0.3 && e.x < this.vw - 20 && e.x > this.ship.x + 60 && !e.behind) this.glint(c, e.x - 12, e.y, '#4dff6a', 22);
  };
  F.drawReactor = function (c, e) {
    var p = 0.5 + 0.5 * Math.sin(this.t * 6), R = e.r, i, im = img(this.artBase, SPRITE_FILES.reactor[0]);
    var gs = R * (3.2 + (e.tele ? 1.2 * (1 - e.fireT / 0.65) : 0));
    this.glint(c, e.x, e.y, e.tele ? '#bff6ff' : '#4fb3ff', gs);
    if (im) c.drawImage(im, e.x - R * 1.3, e.y - R * 1.3, R * 2.6, R * 2.6);
    c.strokeStyle = '#8fa3b8'; c.lineWidth = 6; c.beginPath(); c.arc(e.x, e.y, R, 0, TAU); c.stroke();
    c.lineWidth = 3; c.beginPath(); for (i = 0; i < 8; i++) { var a = i / 8 * TAU + this.t * 0.6; c.moveTo(e.x + Math.cos(a) * R, e.y + Math.sin(a) * R); c.lineTo(e.x + Math.cos(a) * R * 1.35, e.y + Math.sin(a) * R * 1.35); } c.stroke();
    if (e.hit > 0) this.glint(c, e.x, e.y, '#ffffff', R * 2);
    if (e.entering) return;
    if (e.shield) {
      c.strokeStyle = 'rgba(120,220,255,' + (0.5 + 0.35 * p) + ')'; c.lineWidth = 5; c.beginPath(); c.arc(e.x, e.y, R * 1.3, 0, TAU); c.stroke();
      c.fillStyle = 'rgba(120,220,255,.13)'; c.fill();
      var frac = clamp(e.shT / ([0, 2.8, 2.4, 1.8][e.bphase] || 2.8), 0, 1); // countdown arc: when the shield drops
      c.strokeStyle = '#ffffffcc'; c.lineWidth = 3; c.beginPath(); c.arc(e.x, e.y, R * 1.48, -Math.PI / 2, -Math.PI / 2 + TAU * frac); c.stroke();
    } else {
      c.strokeStyle = 'rgba(255,90,60,' + (0.4 + 0.4 * p) + ')'; c.lineWidth = 3; c.setLineDash([8, 8]); c.beginPath(); c.arc(e.x, e.y, R * 1.3, 0, TAU); c.stroke(); c.setLineDash([]);
    }
  };
  F.drawShip = function (c) {
    var s = this.ship;
    if (this.state === 'dead') return;
    var blink = this.inv > 0 && Math.floor(this.t * 16) % 2, fl = 0.8 + 0.2 * Math.sin(this.t * 60);
    c.globalCompositeOperation = 'lighter';
    c.drawImage(glow(this.def.ship.trail), s.x - this.def.ship.tail - 18 * fl, s.y - 14 * fl, 36 * fl, 28 * fl);
    if (this.star > 0) { var r = s.r * 2.6; c.globalAlpha = 0.5 + 0.2 * Math.sin(this.t * 20); c.drawImage(glow('#ffe66d'), s.x - r, s.y - r, r * 2, r * 2); c.globalAlpha = 1; }
    c.globalCompositeOperation = 'source-over';
    if (!blink) this.drawSprite(c, this.def.ship.key, s.x, s.y, s.tilt, this.hurtFlash > 0.7 ? 0.08 : 0);
    c.globalCompositeOperation = 'lighter';
    var cs = Math.cos(s.tilt), sn = Math.sin(s.tilt);
    for (var i = 0; i < this.muzzle.length; i++) {
      var m = this.muzzle[i], mx = s.x + m.ox * cs - m.oy * sn, my = s.y + m.ox * sn + m.oy * cs, sz = (m.big ? 46 : 26) * (1 - m.t / 0.07 * 0.5);
      c.drawImage(glow(m.c), mx - sz / 2 + 6, my - sz / 2, sz, sz);
    }
    c.globalCompositeOperation = 'source-over';
  };
  F.drawBolts = function (c) { // batched: 3 strokes per colour, not per bolt
    var groups = {}, i, b, col, list, pass;
    for (i = 0; i < this.bul.length; i++) { b = this.bul[i]; (groups[b.c] || (groups[b.c] = [])).push(b, 26, 3.4); }
    for (i = 0; i < this.eb.length; i++) { b = this.eb[i]; (groups['e' + b.c] || (groups['e' + b.c] = [])).push(b, 18, 4.4); }
    c.lineCap = 'round';
    for (col in groups) {
      list = groups[col]; var cc = col.charAt(0) === 'e' ? col.slice(1) : col;
      for (pass = 0; pass < 3; pass++) {
        c.strokeStyle = pass === 2 ? '#ffffff' : cc; c.globalAlpha = pass === 0 ? 0.3 : 1;
        c.lineWidth = pass === 0 ? list[2] * 2.6 : pass === 1 ? list[2] : list[2] * 0.4;
        c.beginPath();
        for (i = 0; i < list.length; i += 3) {
          b = list[i]; var len = list[i + 1], sp = Math.hypot(b.vx, b.vy) || 1, ux = b.vx / sp * len / 2, uy = b.vy / sp * len / 2, f = pass === 2 ? 0.6 : 1;
          c.moveTo(b.x - ux * f, b.y - uy * f); c.lineTo(b.x + ux * f, b.y + uy * f);
        }
        c.stroke();
      }
    }
    c.globalAlpha = 1;
  };
  F.drawReticle = function (c) {
    if (this.torp) return;
    var pr = this.torpPredict(); if (!pr) return;
    var L = this.torpLaunch(), onTarget = this.port && Math.abs(pr.gx - (this.port.x + this.port.w / 2)) < this.port.w / 2 - 8;
    this.onTarget = !!onTarget;
    c.strokeStyle = onTarget ? 'rgba(120,255,140,.75)' : 'rgba(255,200,80,.45)'; c.lineWidth = 1.5; c.setLineDash([6, 8]);
    c.beginPath(); c.moveTo(L.x, L.y); c.lineTo(pr.hx, pr.y); c.stroke(); c.setLineDash([]);
    var x = pr.gx, y = pr.y - 4, r = 14 + 2 * Math.sin(this.t * 10);
    c.strokeStyle = onTarget ? '#7dff8a' : '#ffc850'; c.lineWidth = 2.5;
    c.beginPath(); c.arc(x, y, r, 0, TAU); c.moveTo(x - r - 6, y); c.lineTo(x - r + 4, y); c.moveTo(x + r - 4, y); c.lineTo(x + r + 6, y); c.moveTo(x, y - r - 6); c.lineTo(x, y - r + 4); c.stroke();
  };
  F.drawParts = function (c) {
    var i, p, a, n = this.parts.length, sm = smoke();
    for (i = 0; i < n; i++) { p = this.parts[i]; if (p.k !== 'smoke') continue; a = 1 - p.t / p.life; var sz = p.sz * (1 + p.t / p.life); c.globalAlpha = a * 0.6; c.drawImage(sm, p.x - sz / 2, p.y - sz / 2, sz, sz); }
    for (i = 0; i < n; i++) { p = this.parts[i]; if (p.k !== 'debris') continue; c.globalAlpha = 1 - p.t / p.life; c.fillStyle = p.c; c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.fillRect(-p.sz / 2, -p.sz / 3, p.sz, p.sz * 0.66); c.restore(); }
    c.globalAlpha = 1; c.globalCompositeOperation = 'lighter';
    for (i = 0; i < n; i++) {
      p = this.parts[i]; a = 1 - p.t / p.life;
      if (p.k === 'ember' || p.k === 'flash' || p.k === 'trail') { var s2 = p.k === 'ember' ? p.sz * (0.6 + 0.6 * a) : p.k === 'flash' ? p.sz * (0.7 + 0.3 * a) : p.sz * a; c.globalAlpha = p.k === 'trail' ? a * 0.7 : a; c.drawImage(glow(p.c), p.x - s2 / 2, p.y - s2 / 2, s2, s2); }
    }
    c.globalAlpha = 1; c.lineCap = 'round';
    for (i = 0; i < n; i++) { p = this.parts[i]; if (p.k !== 'spark') continue; c.strokeStyle = p.c; c.globalAlpha = 1 - p.t / p.life; c.lineWidth = p.sz; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03); c.stroke(); }
    for (i = 0; i < n; i++) { p = this.parts[i]; if (p.k !== 'ring') continue; a = 1 - p.t / p.life; c.strokeStyle = p.c; c.globalAlpha = a; c.lineWidth = 3 * a + 1; c.beginPath(); c.arc(p.x, p.y, p.sz * (0.3 + 1.2 * p.t / p.life), 0, TAU); c.stroke(); }
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  };
  F.drawFireball = function (c) {
    var fx = this.fireball, g = c.createLinearGradient(fx - 220, 0, fx + 50, 0);
    g.addColorStop(0, 'rgba(255,255,230,1)'); g.addColorStop(0.55, 'rgba(255,160,40,.92)'); g.addColorStop(1, 'rgba(255,60,0,0)');
    c.fillStyle = g; c.fillRect(-20, -20, fx + 70, this.vh + 40);
    c.globalCompositeOperation = 'lighter';
    for (var i = 0; i < 7; i++) { var s = 110 + 30 * Math.sin(this.t * 9 + i * 2); c.drawImage(glow('#ff7a1f'), fx - s / 2 + Math.sin(this.t * 7 + i) * 20, this.vh * (i + 0.5) / 7 - s / 2, s, s); }
    c.globalCompositeOperation = 'source-over';
  };
  F.drawPickup = function (c, p) {
    var im = img(this.artBase, 'pickups/' + p.type + '.webp'), col = { heart: '#ff3b6b', salsa: '#ff5a1f', star: '#ffe66d', taco_shell: '#f4c35a' }[p.type] || '#ffffff';
    var gs = 50 + 8 * Math.sin(p.t * 6);
    c.globalAlpha = 0.55; this.glint(c, p.x, p.y, col, gs); c.globalAlpha = 1;
    c.save(); c.translate(p.x, p.y);
    if (im) c.drawImage(im, -20, -20, 40, 40);
    else {
      c.fillStyle = col; c.strokeStyle = '#000'; c.lineWidth = 2;
      if (p.type === 'heart') { c.beginPath(); c.moveTo(0, 12); c.bezierCurveTo(-22, -4, -10, -20, 0, -8); c.bezierCurveTo(10, -20, 22, -4, 0, 12); c.fill(); c.stroke(); }
      else if (p.type === 'star') { c.beginPath(); for (var i = 0; i < 10; i++) { var a = i / 10 * TAU - Math.PI / 2, r = i % 2 ? 7 : 16; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); c.fill(); c.stroke(); }
      else { c.beginPath(); c.arc(0, 0, 14, 0, TAU); c.fill(); c.stroke(); }
    }
    c.restore();
  };

  F.drawBG = function (c) {
    var vw = this.vw, vh = this.vh, d = this.dist, i, L;
    c.fillStyle = this.def.bg === 'yavin' ? '#05030e' : '#07040f'; c.fillRect(-20, -20, vw + 40, vh + 40);
    var far = img(this.artBase, 'space/far.webp');
    if (far) { var fw = far.width * vh / far.height, o = -((d * 0.04 + this.t * 3) % fw); c.globalAlpha = 0.7; for (var x = o; x < vw; x += fw) c.drawImage(far, x, 0, fw + 1, vh); c.globalAlpha = 1; }
    var tunnel = this.phase === 'tunnel' || this.phase === 'escape';
    for (L = 0; L < 3; L++) {
      var lay = this.starLayer(L), sp = [0.05, 0.16, 0.42][L] * (tunnel ? 2.2 : 1), off = -((d * sp + this.t * [2, 6, 12][L]) % vw);
      c.drawImage(lay, off, 0, vw, vh); c.drawImage(lay, off + vw, 0, vw, vh);
    }
    var tile = img(this.artBase, 'space/stars_tile.webp');
    if (tile) { var tw = tile.width * vh / tile.height, to = -((d * 0.7) % tw); c.globalAlpha = 0.6; for (var tx = to; tx < vw; tx += tw) c.drawImage(tile, tx, 0, tw + 1, vh); c.globalAlpha = 1; }
    var fade = 1 - this.wallK * 0.85;
    if (this.def.bg === 'yavin') {
      var gas = img(this.artBase, 'space/planet_gas_giant.webp'), pr = Math.max(vw, vh) * 0.42, px = vw * 0.78 - d * 0.01, py = vh * 0.82;
      if (gas) { var gh = pr * 1.24, gw = gh * gas.width / gas.height; c.drawImage(gas, px - gw / 2, py - gh / 2, gw, gh); }
      else c.drawImage(this.planet('gas'), px - pr, py - pr, pr * 2, pr * 2);
      var grow = clamp(this.tl / 30, 0, 1), dr = 30 + 110 * grow, dx = vw * 0.32 - d * 0.004, dy = this.hudH + vh * 0.18;
      c.globalAlpha = 0.95 * fade; c.drawImage(img(this.artBase, 'space/planet_battle_moon.webp') || this.planet('ds'), dx - dr, dy - dr, dr * 2, dr * 2); c.globalAlpha = 1;
    } else {
      var mr = Math.max(vw, vh) * 0.3; c.drawImage(this.planet('endor'), vw * 0.15 - d * 0.006 - mr, vh * 0.85 - mr, mr * 2, mr * 2);
      var er = Math.min(vw, vh) * 0.22; c.globalAlpha = 0.9 * fade; c.drawImage(this.planet('ds2'), vw * 0.8 - d * 0.008 - er, this.hudH + vh * 0.2 - er, er * 2, er * 2); c.globalAlpha = 1;
    }
    if (this.def.bg !== 'yavin' && this.wallK > 0) { // inside the Death Star II superstructure
      c.fillStyle = 'rgba(12,8,18,' + (0.82 * this.wallK) + ')'; c.fillRect(-20, -20, vw + 40, vh + 40);
      c.globalAlpha = 0.22 * this.wallK; this.glint(c, vw, vh * 0.5, '#ff7a28', vh * 1.4); c.globalAlpha = 1;
    }
    if (tunnel || this.phase === 'trench' || this.phase === 'port') { // speed lines
      c.strokeStyle = tunnel ? 'rgba(255,190,130,.22)' : 'rgba(200,220,255,.16)'; c.lineWidth = 1.5; c.beginPath();
      for (i = 0; i < 18; i++) { var ly = hash(i * 7 + 1) * vh, lx = vw - ((d * (1.5 + hash(i) * 1.5) + hash(i + 3) * vw * 3) % (vw * 1.6)), ll = 40 + hash(i + 5) * 90; c.moveTo(lx, ly); c.lineTo(lx + ll, ly); }
      c.stroke();
    }
  };

  F.drawTerrain = function (c) {
    if (!this.walls.length) return;
    var any = false, i, w;
    for (i = 0; i < this.walls.length; i++) if (this.walls[i].k > 0.01) { any = true; break; }
    if (!any) return;
    var vh = this.vh, tunnel = this.phase === 'tunnel' || this.phase === 'escape';
    var wallImg = img(this.artBase, 'space/' + (tunnel ? 'ds2_wall' : 'trench_wall') + '.webp');
    c.fillStyle = tunnel ? '#26252f' : '#565a63'; c.beginPath();
    for (i = 0; i < this.walls.length; i++) { w = this.walls[i]; if (w.k < 0.01) continue; c.rect(w.x, -20, 41, w.top + 20); c.rect(w.x, w.bot, 41, vh - w.bot + 20); }
    c.fill();
    if (wallImg) { for (i = 0; i < this.walls.length; i++) { w = this.walls[i]; if (w.k < 0.01) continue; c.drawImage(wallImg, w.x, w.top - 128, 41, 128); c.drawImage(wallImg, w.x, w.bot, 41, 128); } }
    else { // greebles, batched into 3 fills
      c.fillStyle = tunnel ? '#373645' : '#767b86'; c.beginPath();
      for (i = 0; i < this.walls.length; i++) { w = this.walls[i]; if (w.k < 0.01) continue; var h = hash(w.n); c.rect(w.x + 4, w.top - 16 - h * 30, 12 + h * 16, 8); c.rect(w.x + 6, w.bot + 8 + h * 26, 10 + h * 18, 7); c.rect(w.x + 22, w.top - 54 - h * 40, 10, 14); c.rect(w.x + 3, w.bot + 44 + h * 30, 14, 10); }
      c.fill();
      c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath();
      for (i = 0; i < this.walls.length; i++) { w = this.walls[i]; if (w.k < 0.01) continue; var h2 = hash(w.n + 99); c.rect(w.x + 20 * h2, w.top - 40 - 40 * h2, 14, 20); c.rect(w.x + 18 * (1 - h2), w.bot + 30 + 30 * h2, 16, 18); }
      c.fill();
      c.fillStyle = tunnel ? '#ffb45e' : '#cfe6ff'; c.beginPath();
      for (i = 0; i < this.walls.length; i++) { w = this.walls[i]; if (w.k < 0.01 || hash(w.n + 7) < 0.6) continue; c.rect(w.x + 12, w.top - 7, 5, 3); c.rect(w.x + 26, w.bot + 4, 5, 3); }
      c.fill();
    }
    c.fillStyle = tunnel ? '#ff8a2e' : '#b4bac6'; c.beginPath();
    for (i = 0; i < this.walls.length; i++) { w = this.walls[i]; if (w.k < 0.01) continue; c.rect(w.x, w.top - 3, 41, 3); c.rect(w.x, w.bot, 41, 3); }
    c.fill();
    for (i = 0; i < this.girders.length; i++) {
      var g = this.girders[i];
      c.fillStyle = '#3c3a44'; c.fillRect(g.x, g.y0, g.w, g.y1 - g.y0);
      c.strokeStyle = '#6b6878'; c.lineWidth = 2; c.beginPath();
      for (var y = g.y0; y < g.y1 - 20; y += 22) { c.moveTo(g.x, y); c.lineTo(g.x + g.w, y + 22); c.moveTo(g.x + g.w, y); c.lineTo(g.x, y + 22); }
      c.stroke(); c.strokeStyle = '#ff8a2e'; c.strokeRect(g.x, g.y0, g.w, g.y1 - g.y0);
      var tipY = g.y0 <= this.hudH ? g.y1 : g.y0; this.glint(c, g.x + g.w / 2, tipY, '#ff5030', 18 + 6 * Math.sin(this.t * 8 + i));
    }
    if (this.port) {
      var p = this.port, cx = p.x + p.w / 2;
      c.fillStyle = '#2a2d33'; c.fillRect(p.x - 14, p.y - 7, p.w + 28, 11);
      c.fillStyle = '#000'; c.beginPath(); c.ellipse(cx, p.y + 2, p.w / 2 - 8, 8, 0, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(255,60,60,' + (0.5 + 0.5 * Math.sin(this.t * 8)) + ')'; c.lineWidth = 3;
      c.beginPath(); c.ellipse(cx, p.y + 2, p.w / 2 + 4, 14, 0, 0, TAU); c.stroke();
      c.fillStyle = '#ff6060'; c.font = '900 13px system-ui'; c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.fillText('EXHAUST PORT', cx, p.y - 20);
    }
  };

  // ---------- HUD + cards (CSS px) ----------
  F.txt = function (c, s, x, y, col) { c.fillStyle = 'rgba(0,0,0,.75)'; c.fillText(s, x + 1.5, y + 1.5); c.fillStyle = col; c.fillText(s, x, y); };
  F.chrome = function (c, s, x, y, size, maxW) { // 80s chrome title text
    c.font = '900 ' + size + 'px "Trebuchet MS",Impact,sans-serif';
    var w = c.measureText(s).width; if (maxW && w > maxW) { size = Math.floor(size * maxW / w); c.font = '900 ' + size + 'px "Trebuchet MS",Impact,sans-serif'; }
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = '#ff2ed8'; c.fillText(s, x + size * 0.06, y + size * 0.07);
    var g = c.createLinearGradient(0, y - size / 2, 0, y + size / 2);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.42, '#9fe8ff'); g.addColorStop(0.5, '#1b3d8f'); g.addColorStop(0.56, '#ffd36e'); g.addColorStop(1, '#ff6a2a');
    c.lineWidth = Math.max(2, size * 0.09); c.strokeStyle = '#1a0533'; c.lineJoin = 'round'; c.strokeText(s, x, y);
    c.fillStyle = g; c.fillText(s, x, y);
    return size;
  };
  F.drawHUD = function () {
    var c = this.ctx, d = this.dpr, W_ = this.cw, H_ = this.ch, i;
    c.setTransform(d, 0, 0, d, 0, 0); c.globalAlpha = 1;
    if (this.hurtFlash > 0) { c.globalAlpha = this.hurtFlash * 0.75; c.drawImage(this.vignette(), 0, 0, W_, H_); c.globalAlpha = 1; }
    var top = 8 + (this.opts.safeTop || 0), left = 12, right = W_ - (this.opts.hudRightReserve === undefined ? 120 : this.opts.hudRightReserve);
    c.textBaseline = 'middle'; c.textAlign = 'left';
    c.font = '900 13px "Trebuchet MS",system-ui'; this.txt(c, this.pilot.call, left, top + 9, this.pilot.color);
    var callW = c.measureText(this.pilot.call).width, crit = this.hp === 1 && Math.floor(this.t * 4) % 2;
    for (i = 0; i < this.maxHp; i++) this.hpPip(c, left + 8 + i * 20, top + 30, i < this.hp, crit);
    c.textAlign = 'right'; c.font = '900 18px "Trebuchet MS",system-ui';
    var sc = String(this.score).padStart(6, '0'); this.txt(c, sc, right, top + 10, '#ffe66d');
    var sw = c.measureText(sc).width;
    c.font = '700 11px system-ui'; this.txt(c, this.boss ? (this.boss.type === 'vader' ? 'DARTH VADER' : 'MAIN REACTOR') : this.def.name, right, top + 30, '#ffffffcc');
    this.hudRects = { pilot: [left, top, callW, 18], hull: [left - 4, top + 22, this.maxHp * 20, 18], score: [right - sw, top, sw, 20] };
    var bx = left + 112, bw = Math.max(40, right - bx - 4), by = top + 42;
    if (bw > 40) {
      c.fillStyle = '#ffffff22'; c.fillRect(bx, by, bw, this.boss ? 9 : 6);
      if (this.boss) {
        var b = this.boss;
        c.fillStyle = b.entering ? '#ff8a8a' : b.bphase === 3 ? '#ff2a2a' : b.bphase === 2 ? '#ff6a2a' : '#ffb02a';
        c.fillRect(bx, by, bw * b.hp / b.maxHp, 9);
        c.fillStyle = '#000'; for (i = 0; i < (b.notches || []).length; i++) c.fillRect(bx + bw * b.notches[i] - 1, by - 2, 2, 13);
        c.font = '800 10px system-ui'; c.textAlign = 'left';
        this.txt(c, 'PHASE ' + b.bphase + (b.type === 'reactor' && !b.entering ? (b.shield ? ' · SHIELD UP' : ' · SHIELD DOWN') : ''), bx, by + 18, b.type === 'reactor' && !b.shield ? '#77ffff' : '#ffffffcc');
        this.hudRects.bar = [bx, by, bw, 24];
      } else { c.fillStyle = '#00e5ff'; c.fillRect(bx, by, bw * clamp(this.tl / (this.def.length || 60), 0, 1), 6); this.hudRects.bar = [bx, by, bw, 6]; }
    }
    var py = top + 58; c.font = '800 11px system-ui'; c.textAlign = 'left';
    if (this.spread > 0) { this.txt(c, 'SALSA SPREAD ' + Math.ceil(this.spread), left, py, '#ff7a3d'); py += 14; }
    if (this.star > 0) { this.txt(c, 'STAR POWER ' + Math.ceil(this.star), left, py, '#ffe66d'); py += 14; }
    var ry = Math.max(top + 74, py + 6);
    var cardUp = this.card && (this.card.kind === 'outro' || this.card.kind === 'dead');   // end cards own the screen: no radio over the title
    for (i = 0; i < (cardUp ? 0 : this.radio.length); i++) {
      var r = this.radio[i], bwid = Math.min(W_ - 24, 560), x0 = (W_ - bwid) / 2;
      c.font = '700 14px "Trebuchet MS",system-ui';
      var lines = this.wrap(c, r.text, bwid - 20), hh = 22 + lines.length * 18;
      c.globalAlpha = Math.min(1, r.t * 3);
      c.fillStyle = 'rgba(8,4,24,.8)'; this.rr(c, x0, ry, bwid, hh, 10); c.fill(); c.strokeStyle = '#00e5ff88'; c.lineWidth = 1.5; c.stroke();
      c.fillStyle = '#00e5ff'; c.font = '900 11px system-ui'; c.textAlign = 'left'; c.fillText(r.who, x0 + 10, ry + 11);
      c.fillStyle = '#fff'; c.font = '700 14px "Trebuchet MS",system-ui';
      for (var l = 0; l < lines.length; l++) c.fillText(lines[l], x0 + 10, ry + 29 + l * 18);
      c.globalAlpha = 1; ry += hh + 6;
    }
    if (this.toast) {
      var tt = this.toast; c.globalAlpha = clamp(Math.min(tt.t * 6, (tt.dur - tt.t) * 4), 0, 1);
      c.font = '900 18px "Trebuchet MS",system-ui'; c.textAlign = 'center';
      this.txt(c, tt.text, W_ / 2, H_ * (H_ > W_ ? 0.66 : 0.72) - tt.t * 10, tt.col); c.globalAlpha = 1;
    }
    if (this.banner) this.drawBanner(c, W_, H_);
    if (this.card) this.drawCard(c, W_, H_);
    var hideBtn = this.state !== 'play' ? '0' : '1'; if (this.input.btn && this.input.btn.style.opacity !== hideBtn) { this.input.btn.style.opacity = hideBtn; this.input.btn.style.pointerEvents = hideBtn === '1' ? 'auto' : 'none'; }
    if (this.t < 6.5 && this.t > 3.3 && this.state === 'play' && !this.card && !this.opts.startAt) {   // first-time hint only, not on checkpoint resumes
      c.globalAlpha = Math.min(1, 6.5 - this.t); c.textAlign = 'center'; c.font = '800 13px system-ui';
      this.txt(c, 'DRAG ANYWHERE TO FLY · HOLD FIRE TO SHOOT', W_ / 2, Math.min(H_ - 150, H_ * 0.8), '#ffffffdd'); c.globalAlpha = 1;
    }
  };
  F.drawBanner = function (c, W_, H_) {
    var b = this.banner, t = b.t, a = clamp(Math.min(t * 5, (b.dur - t) * 4), 0, 1), y = H_ * 0.4, h = 74;
    c.globalAlpha = a;
    if (b.kind === 'warning') {
      c.save(); c.beginPath(); c.rect(0, y - h / 2, W_, h); c.clip();
      c.fillStyle = 'rgba(60,0,0,.75)'; c.fillRect(0, y - h / 2, W_, h);
      c.fillStyle = 'rgba(255,40,40,.85)'; var o = (t * 80) % 40;
      for (var x = -40; x < W_ + 40; x += 40) { c.beginPath(); c.moveTo(x + o, y - h / 2); c.lineTo(x + o + 20, y - h / 2); c.lineTo(x + o + 10, y - h / 2 + 8); c.lineTo(x + o - 10, y - h / 2 + 8); c.fill(); c.beginPath(); c.moveTo(x - o, y + h / 2); c.lineTo(x - o + 20, y + h / 2); c.lineTo(x - o + 30, y + h / 2 - 8); c.lineTo(x - o + 10, y + h / 2 - 8); c.fill(); }
      c.restore();
      c.textAlign = 'center'; c.textBaseline = 'middle';
      if (Math.floor(t * 6) % 2 === 0 || t > 1.2) { c.font = '900 34px "Trebuchet MS",Impact,sans-serif'; this.txt(c, b.a, W_ / 2, y - 8, '#ff4040'); }
      c.font = '800 13px system-ui'; this.txt(c, b.b, W_ / 2, y + 22, '#ffd0d0');
    } else {
      var bh = b.kind === 'title' ? 92 : 70;
      c.fillStyle = 'rgba(10,2,30,.7)'; c.fillRect(0, y - bh / 2, W_, bh);
      c.fillStyle = b.kind === 'clear' ? '#7dff8a' : b.kind === 'phase' ? '#ff6a2a' : '#ff2ed8'; c.fillRect(0, y - bh / 2, W_, 2); c.fillRect(0, y + bh / 2 - 2, W_, 2);
      var sz = this.chrome(c, b.a, W_ / 2 + (1 - Math.min(1, t * 4)) * 60, y - 10, b.kind === 'title' ? 40 : 32, W_ - 30);
      c.font = '800 13px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; this.txt(c, b.b, W_ / 2, y + sz * 0.5 + 6, '#ffffff');
    }
    c.globalAlpha = 1;
  };
  F.drawCard = function (c, W_, H_) {
    var cd = this.card, t = cd.t, i;
    if (cd.kind === 'resume') { c.globalAlpha = clamp((1.6 - t) * 3, 0, 1); c.font = '900 22px "Trebuchet MS",system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; this.txt(c, 'CHECKPOINT · GET READY!', W_ / 2, H_ * 0.42, '#00e5ff'); c.globalAlpha = 1; return; }
    var inA = Math.min(1, t / 0.3), outA = cd.kind === 'intro' ? clamp((3.4 - t) / 0.4, 0, 1) : 1, a = Math.min(inA, outA);
    var bar = Math.min(H_ * 0.13, 74) * a;
    c.fillStyle = '#000'; c.fillRect(0, 0, W_, bar); c.fillRect(0, H_ - bar, W_, bar);
    c.globalAlpha = a * (cd.kind === 'dead' ? 0.55 : 0.4); c.fillStyle = cd.kind === 'dead' ? '#3a0010' : '#0a0220'; c.fillRect(0, bar, W_, H_ - bar * 2); c.globalAlpha = 1;
    var hy = H_ * 0.64, gh = H_ - bar - hy; // synthwave horizon grid
    if (gh > 20) {
      c.globalAlpha = a * 0.5; c.strokeStyle = cd.kind === 'dead' ? '#ff3060' : '#ff2ed8'; c.lineWidth = 1.2; c.beginPath();
      for (i = -12; i <= 12; i++) { c.moveTo(W_ / 2 + i * 14, hy); c.lineTo(W_ / 2 + i * W_ * 0.16, H_ - bar); }
      for (i = 0; i < 8; i++) { var f = (i + (t * 1.5) % 1) / 8, yy = hy + gh * f * f; c.moveTo(0, yy); c.lineTo(W_, yy); }
      c.stroke();
      c.globalAlpha = a; var sg = c.createLinearGradient(0, hy - 60, 0, hy); sg.addColorStop(0, 'rgba(255,46,216,0)'); sg.addColorStop(1, 'rgba(255,46,216,.35)'); c.fillStyle = sg; c.fillRect(0, hy - 60, W_, 60); c.globalAlpha = 1;
    }
    var cy = H_ * 0.36;
    c.globalAlpha = a; c.textAlign = 'center'; c.textBaseline = 'middle';
    if (cd.kind === 'intro') {
      c.font = '900 14px system-ui'; this.txt(c, 'STAGE ' + this.def.id.toUpperCase() + ' · ' + this.pilot.call, W_ / 2, cy - 52, '#00e5ff');
      this.chrome(c, this.def.name, W_ / 2, cy, Math.round(46 * (1 + 0.4 * Math.max(0, 1 - t / 0.3))), W_ - 24);
      c.font = '800 14px "Trebuchet MS",system-ui'; c.textAlign = 'center'; var sl = this.wrap(c, this.fmt(this.def.tagline || ''), W_ - 40);
      for (i = 0; i < sl.length; i++) this.txt(c, sl[i], W_ / 2, cy + 40 + i * 19, '#ffffff');
      if (t > 1.4) { var go = t > 2.7; if (go || Math.floor(t * 5) % 2 === 0) { c.font = '900 30px "Trebuchet MS",Impact,sans-serif'; this.txt(c, go ? 'GO!' : 'READY?', W_ / 2, cy + 40 + sl.length * 19 + 34, go ? '#7dff8a' : '#ffe66d'); } }
    } else if (cd.kind === 'outro') {
      this.chrome(c, 'MISSION COMPLETE', W_ / 2, cy - 30, 40, W_ - 24);
      var rows = [['HULL BONUS', this.hp + ' × 1000'], ['KILLS', String(this.kills)], ['ACCURACY', this.accuracy() + '%']];
      c.font = '800 15px "Trebuchet MS",system-ui';
      var cw = Math.min(300, W_ - 60), x0 = W_ / 2 - cw / 2;
      for (i = 0; i < rows.length; i++) { if (t < 0.7 + i * 0.45) break; c.textAlign = 'left'; this.txt(c, rows[i][0], x0, cy + 16 + i * 24, '#9fe8ff'); c.textAlign = 'right'; this.txt(c, rows[i][1], x0 + cw, cy + 16 + i * 24, '#ffffff'); }
      if (t > 2.2) {
        var cnt = Math.round(this.score * Math.min(1, (t - 2.2) / 0.8));
        c.font = '900 22px "Trebuchet MS",system-ui'; c.textAlign = 'left'; this.txt(c, 'TOTAL', x0, cy + 100, '#ffe66d'); c.textAlign = 'right'; this.txt(c, String(cnt).padStart(6, '0'), x0 + cw, cy + 100, '#ffe66d');
      }
      if (t > 4 && this.opts.standalone) { c.textAlign = 'center'; c.font = '800 13px system-ui'; this.txt(c, 'TAP TO PLAY AGAIN', W_ / 2, cy + 140, '#ffffffcc'); }
    } else if (cd.kind === 'dead') {
      var jx = t < 0.6 ? rand(-4, 4) : 0;
      c.font = '900 46px "Trebuchet MS",Impact,sans-serif';
      c.fillStyle = '#00e5ff'; c.fillText('SHOT DOWN', W_ / 2 + jx - 3, cy); c.fillStyle = '#ff2ed8'; c.fillText('SHOT DOWN', W_ / 2 + jx + 3, cy); c.fillStyle = '#fff'; c.fillText('SHOT DOWN', W_ / 2 + jx, cy);
      c.font = '800 14px system-ui';
      this.txt(c, this.checkpoint > 0 ? 'Back to the last checkpoint' : 'Back to the start', W_ / 2, cy + 40, '#ffd0d0');
      if (this.opts.standalone && t > 1) this.txt(c, 'TAP TO RETRY', W_ / 2, cy + 64, '#ffffffcc');
    }
    c.globalAlpha = a * 0.5; c.fillStyle = this.scan(); c.fillRect(0, bar, W_, H_ - bar * 2); c.globalAlpha = 1;
  };
  F.hpPip = function (c, x, y, on, crit) { c.fillStyle = 'rgba(0,0,0,.6)'; this.heart(c, x + 1, y + 1); c.fillStyle = on ? (crit ? '#ffffff' : '#ff3b6b') : '#ffffff33'; this.heart(c, x, y); };
  F.heart = function (c, x, y) { c.beginPath(); c.moveTo(x, y + 7); c.bezierCurveTo(x - 11, y - 1, x - 6, y - 10, x, y - 4); c.bezierCurveTo(x + 6, y - 10, x + 11, y - 1, x, y + 7); c.fill(); };
  F.rr = function (c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };
  F.wrap = function (c, text, maxW) {
    var words = String(text).split(' '), lines = [], cur = '';
    for (var i = 0; i < words.length; i++) { var t = cur ? cur + ' ' + words[i] : words[i]; if (c.measureText(t).width > maxW && cur) { lines.push(cur); cur = words[i]; } else cur = t; }
    if (cur) lines.push(cur); return lines;
  };

  F.debug = function () {
    return { state: this.state, phase: this.phase, tl: this.tl, hp: this.hp, score: this.score, kills: this.kills, shots: this.shots, accuracy: this.accuracy(),
      ship: { x: this.ship.x, y: this.ship.y }, bullets: this.bul.length, enemies: this.en.length, parts: this.parts.length,
      boss: this.boss ? { type: this.boss.type, hp: this.boss.hp, phase: this.boss.bphase } : null, checkpoint: this.checkpoint, passes: this.passes,
      view: { vw: this.vw, vh: this.vh, scale: this.scale, cw: this.cw, ch: this.ch, rs: this.rs }, fireLabel: this.input.btn.textContent,
      hud: this.hudRects, card: this.card && this.card.kind, radio: this.radio.map(function (r) { return r.who + ': ' + r.text; }) };
  };
  F.destroy = function () { this.input.destroy(); };

  // ---------- public API ----------
  var levels = {};
  W.TacoFlight = {
    version: 2, levels: levels, TUNE: DEFAULT_TUNE, PILOTS: PILOTS, SPRITE_FILES: SPRITE_FILES,
    register: function (def) { levels[def.id] = def; (def.aliases || []).forEach(function (a) { levels[a] = def; }); return def; },
    load: function (json) { return this.register(typeof json === 'string' ? JSON.parse(json) : json); },
    has: function (id) { return !!levels[id]; },
    create: function (id, opts) { var def = typeof id === 'object' ? id : levels[id]; if (!def) throw new Error('TacoFlight: unknown level ' + id); return new Flight(def, opts); },
    // Convenience loop (owns rAF until stop()); or drive lvl.update(dt, inp) + lvl.draw() from the engine loop.
    // QA only: opts.simSpeed = N fixed 1/60 s steps per frame; opts.preUpdate(lvl, dt) runs before each step.
    run: function (id, opts) {
      opts = opts || {};
      var lvl = this.create(id, opts), last = 0, raf = 0, stopped = false;
      lvl.perfLog = [];
      function frame(ts) {
        if (stopped) return;
        var dt = last ? (ts - last) / 1000 : 0; last = ts;
        lvl.frame(dt * 1000);
        var n = opts.simSpeed || 1, t0 = now();
        for (var i = 0; i < n; i++) {
          var h = n > 1 ? 1 / 60 : dt;
          if (opts.preUpdate) opts.preUpdate(lvl, h);
          lvl.update(h, opts.getInput ? opts.getInput() : null);
          if (stopped) return;
        }
        var t1 = now(); lvl.draw(); var t2 = now();
        lvl.perf.upd = t1 - t0; lvl.perf.draw = t2 - t1;
        lvl.perfLog.push(dt * 1000, t1 - t0, t2 - t1); if (lvl.perfLog.length > 5400) lvl.perfLog.splice(0, 3);
        raf = requestAnimationFrame(frame);
      }
      raf = requestAnimationFrame(frame);
      return { level: lvl, stop: function () { stopped = true; cancelAnimationFrame(raf); lvl.destroy(); } };
    }
  };
})(window);
