/* Taco Strike 80s - FLIGHT LEVELS core (flight/flight-core.js)
 * Owner: Grey Heart. Plain script (no modules, no deps), same style as the engine.
 * Defines window.TacoFlight = { levels, register(def), create(id, opts), run(id, opts), TUNE }.
 * Level data lives in flight/xwing.js and flight/falcon.js (they call TacoFlight.register).
 *
 * Controls (TEAM.md rules): NO D-pad. Swipe/drag anywhere to steer the ship (relative drag),
 * hold the FIRE button to shoot. Optional host input {L,R,U,D,fire} is accepted from the engine
 * (keyboard etc.) but this file adds no keyboard listeners of its own.
 *
 * Physics: uses window.TacoPhysics.stepShip(s, inp, dt, T) and TacoPhysics.TUNE ship* keys if New Bot
 * ships them; otherwise the built-in spring-damper below (DEFAULT_TUNE).
 */
(function (W) {
  'use strict';
  var TAU = Math.PI * 2;
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function hash(n) { n = (n ^ 61) ^ (n >>> 16); n = n + (n << 3); n = n ^ (n >>> 4); n = Math.imul(n, 0x27d4eb2d); n = n ^ (n >>> 15); return (n >>> 0) / 4294967295; }

  // ---------- tuning (overridable by TacoPhysics.TUNE) ----------
  var DEFAULT_TUNE = {
    shipSpring: 75,      // swipe target spring (1/s^2)
    shipDamp: 15,        // swipe damping (1/s)  (critical ~ 2*sqrt(spring))
    shipMaxV: 980,       // px/s cap
    shipAccel: 2600,     // digital (host L/R/U/D) accel
    shipDrag: 6,         // digital drag
    swipeGain: 1.3,      // logical px of ship travel per logical px of finger travel
    fireRate: 8,         // shots per second
    bulletV: 1100,
    minViewW: 520,       // logical playfield is >= 520 wide ...
    viewH: 540,          // ... and >= 540 tall (same 540 as the platform engine)
    iframes: 1.3
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
      ax = dx * T.shipAccel - T.shipDrag * s.vx;
      ay = dy * T.shipAccel - T.shipDrag * s.vy;
    }
    s.vx += ax * dt; s.vy += ay * dt;
    var sp = Math.hypot(s.vx, s.vy);
    if (sp > T.shipMaxV) { s.vx *= T.shipMaxV / sp; s.vy *= T.shipMaxV / sp; }
    s.x += s.vx * dt; s.y += s.vy * dt;
    s.tilt = clamp(s.vy / T.shipMaxV, -1, 1) * 0.4;
  }

  var PILOTS = {
    taco:      { name: 'TACO',    call: 'RED TACO',  color: '#ffd23f' },
    chewbacca: { name: 'CHEWIE',  call: 'CHEWBACCA', color: '#c98a4b' },
    chewie:    { name: 'CHEWIE',  call: 'CHEWBACCA', color: '#c98a4b' },   // missions.json character id
    wicket:    { name: 'WICKET',  call: 'WICKET',    color: '#a0703a' },
    rainbow:   { name: 'RAINBOW', call: 'RAINBOW BRITE', color: '#ff7ad9' },
    carebear:  { name: 'TENDERHEART', call: 'CARE BEAR', color: '#c9844a' },
    shera:     { name: 'SHE-RA',  call: 'SHE-RA',    color: '#ffd76a' },
    joe:       { name: 'DUKE',    call: 'G.I. JOE',  color: '#9fd36a' },
    ewok:      { name: 'WICKET',  call: 'WICKET',    color: '#a0703a' },
    luke:      { name: 'LUKE',    call: 'RED FIVE',  color: '#ffe9a8' }
  };
  var RADIO = {
    red_leader: 'RED LEADER', gold_leader: 'GOLD LEADER', han: 'HAN SOLO', obiwan: 'BEN KENOBI', vader: 'VADER',
    lando: 'LANDO', c3po: 'C-3PO', ackbar: 'ADM. ACKBAR', chewbacca: 'CHEWIE', wedge: 'WEDGE', biggs: 'BIGGS', luke: 'LUKE'
  };

  // ---------- art (optional files from Teddy; placeholder vector art otherwise) ----------
  var IMG = {};
  function img(base, path) {
    if (!base && base !== '') return null;
    if (window.TacoArtHas && !window.TacoArtHas(path)) return null;
    var key = base + path, e = IMG[key];
    if (!e) {
      e = IMG[key] = { el: new Image(), ok: false };
      e.el.onload = function () { e.ok = true; };
      e.el.src = key;
    }
    return e.ok ? e.el : null;
  }

  // ---------- input: relative swipe steer + fire button (pointer events, multi-touch) ----------
  function FlightInput(level) {
    this.L = level; this.steerId = null; this.fireIds = {}; this.fire = false;
    this.sx = 0; this.sy = 0; this.cx = 0; this.cy = 0; this.began = false; this.active = false;
    var me = this, cv = level.canvas;
    this._down = function (e) {
      if (me.steerId !== null) return;
      me.steerId = e.pointerId; me.sx = me.cx = e.clientX; me.sy = me.cy = e.clientY; me.began = true; me.active = true;
      try { cv.setPointerCapture(e.pointerId); } catch (x) {}
      level._onTap && level._onTap();
      e.preventDefault();
    };
    this._move = function (e) { if (e.pointerId === me.steerId) { me.cx = e.clientX; me.cy = e.clientY; e.preventDefault(); } };
    this._up = function (e) { if (e.pointerId === me.steerId) { me.steerId = null; me.active = false; } };
    cv.addEventListener('pointerdown', this._down);
    cv.addEventListener('pointermove', this._move);
    cv.addEventListener('pointerup', this._up);
    cv.addEventListener('pointercancel', this._up);
    cv.style.touchAction = 'none';
    // fire button: host may pass its own element (e.g. the engine's #bThrow relabelled FIRE)
    var b = level.opts.fireButton, own = false;
    if (!b) {
      own = true;
      b = document.createElement('button');
      b.type = 'button'; b.className = 'flight-fire'; b.setAttribute('aria-label', 'Fire');
      b.textContent = 'FIRE';
      var s = b.style;
      s.position = 'fixed'; s.zIndex = '6'; s.width = s.height = '104px'; s.borderRadius = '50%';
      s.right = 'calc(env(safe-area-inset-right) + 20px)'; s.bottom = 'calc(env(safe-area-inset-bottom) + 22px)';
      s.font = '900 17px "Trebuchet MS",system-ui'; s.letterSpacing = '1px'; s.color = '#fff';
      s.border = '3px solid #fff8'; s.textShadow = '0 2px 3px #000a'; s.touchAction = 'none'; s.userSelect = 'none';
      s.background = 'radial-gradient(circle at 35% 30%,#ff9a9a,#e01020 60%,#6a0008)';
      s.boxShadow = '0 0 22px #ff2a2a99, inset 0 -6px 12px #0006';
      s.webkitTapHighlightColor = 'transparent';
      document.body.appendChild(b);
    }
    this.btn = b; this.ownBtn = own; this.btnLabel = b.textContent;
    this._fdown = function (e) { me.fireIds[e.pointerId] = 1; me.fire = true; b.classList.add('on'); if (own) b.style.transform = 'scale(.92)'; try { b.setPointerCapture(e.pointerId); } catch (x) {} level._onTap && level._onTap(); e.preventDefault(); e.stopPropagation(); };
    this._fup = function (e) { delete me.fireIds[e.pointerId]; if (!Object.keys(me.fireIds).length) { me.fire = false; b.classList.remove('on'); if (own) b.style.transform = ''; } };
    b.addEventListener('pointerdown', this._fdown);
    b.addEventListener('pointerup', this._fup);
    b.addEventListener('pointercancel', this._fup);
    b.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  }
  FlightInput.prototype.label = function (t) { if (this.btn.textContent !== t) this.btn.textContent = t; };
  FlightInput.prototype.destroy = function () {
    var cv = this.L.canvas;
    cv.removeEventListener('pointerdown', this._down); cv.removeEventListener('pointermove', this._move);
    cv.removeEventListener('pointerup', this._up); cv.removeEventListener('pointercancel', this._up);
    this.btn.removeEventListener('pointerdown', this._fdown); this.btn.removeEventListener('pointerup', this._fup);
    this.btn.removeEventListener('pointercancel', this._fup);
    if (this.ownBtn && this.btn.parentNode) this.btn.parentNode.removeChild(this.btn);
    else { this.btn.textContent = this.btnLabel; this.btn.classList.remove('on'); }
  };

  // ---------- vector placeholder art ----------
  var ART = {
    xwing: function (c, t) {
      // side/top 3/4 view, nose RIGHT. ~ 92 x 50
      c.fillStyle = '#ff3b30'; c.globalAlpha = 0.25 + 0.15 * Math.sin(t * 40);
      c.beginPath(); c.ellipse(-44, -13, 10, 5, 0, 0, TAU); c.ellipse(-44, 13, 10, 5, 0, 0, TAU); c.fill(); c.globalAlpha = 1;
      // S-foils (upper + lower pair)
      c.fillStyle = '#c9ced6'; c.strokeStyle = '#4a5160'; c.lineWidth = 1.5;
      [-1, 1].forEach(function (d) {
        c.beginPath(); c.moveTo(-30, 0); c.lineTo(-14, 0); c.lineTo(-4, d * 25); c.lineTo(-22, d * 27); c.closePath(); c.fill(); c.stroke();
        c.fillStyle = '#d6322b'; c.fillRect(-20, d * 22 - 2, 12, 3); c.fillStyle = '#c9ced6';
        c.fillStyle = '#7d8594'; c.fillRect(-12, d * 25 - 2, 30, 3.5); c.fillStyle = '#c9ced6'; // wingtip cannon
        c.fillStyle = '#5a6170'; c.beginPath(); c.ellipse(-34, d * 12, 9, 6, 0, 0, TAU); c.fill(); c.fillStyle = '#c9ced6';
      });
      // fuselage
      var g = c.createLinearGradient(0, -8, 0, 8); g.addColorStop(0, '#f2f4f7'); g.addColorStop(1, '#8e96a3');
      c.fillStyle = g; c.beginPath(); c.moveTo(-38, -7); c.lineTo(20, -6); c.lineTo(48, -1.5); c.lineTo(48, 1.5); c.lineTo(20, 6); c.lineTo(-38, 7); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#d6322b'; c.fillRect(18, -5, 5, 10); c.fillRect(-6, -6.5, 3, 13);
      // canopy + R2
      c.fillStyle = '#1b2433'; c.beginPath(); c.moveTo(-6, -6); c.lineTo(10, -6); c.lineTo(4, -12); c.lineTo(-4, -12); c.closePath(); c.fill();
      c.fillStyle = '#5ab0ff'; c.fillRect(-2, -11, 5, 3);
      c.fillStyle = '#e8eef7'; c.beginPath(); c.arc(-18, -8, 4.5, Math.PI, 0); c.fill(); c.fillStyle = '#2f6bd8'; c.fillRect(-20, -11, 4, 2);
    },
    falcon: function (c, t) {
      // YT-1300, nose (mandibles) RIGHT. ~ 110 x 64
      c.fillStyle = '#7fd9ff'; c.globalAlpha = 0.55 + 0.25 * Math.sin(t * 35);
      c.beginPath(); c.ellipse(-50, 0, 8, 24, 0, 0, TAU); c.fill(); c.globalAlpha = 1;
      var g = c.createRadialGradient(-6, -10, 6, 0, 0, 52); g.addColorStop(0, '#f1efe8'); g.addColorStop(1, '#8b8a84');
      c.fillStyle = g; c.strokeStyle = '#4b4a46'; c.lineWidth = 1.5;
      c.beginPath(); c.ellipse(-4, 0, 48, 30, 0, 0, TAU); c.fill(); c.stroke();
      // mandibles
      c.beginPath(); c.moveTo(30, -20); c.lineTo(58, -14); c.lineTo(58, -4); c.lineTo(34, -4); c.closePath(); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(30, 20); c.lineTo(58, 14); c.lineTo(58, 4); c.lineTo(34, 4); c.closePath(); c.fill(); c.stroke();
      // hull details
      c.fillStyle = '#a8423a'; c.fillRect(-28, -6, 14, 12);
      c.strokeStyle = '#6b6a64'; c.beginPath(); c.arc(-4, 0, 16, 0, TAU); c.stroke();
      c.beginPath(); for (var i = 0; i < 8; i++) { var a = i / 8 * TAU; c.moveTo(-4 + Math.cos(a) * 18, Math.sin(a) * 11); c.lineTo(-4 + Math.cos(a) * 44, Math.sin(a) * 27); } c.stroke();
      c.fillStyle = '#55544f'; c.beginPath(); c.arc(-4, 0, 7, 0, TAU); c.fill();
      // cockpit tube (starboard)
      c.fillStyle = '#d8d6cf'; c.strokeStyle = '#4b4a46'; c.beginPath(); c.moveTo(10, 22); c.lineTo(34, 30); c.lineTo(40, 36); c.lineTo(30, 38); c.lineTo(6, 28); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#1b2433'; c.beginPath(); c.arc(36, 35, 4, 0, TAU); c.fill();
      c.fillStyle = '#c33'; c.beginPath(); c.arc(-4, -18, 3, 0, TAU); c.fill(); // dish
    },
    tie: function (c, t, e) {
      c.strokeStyle = '#2b2f36'; c.lineWidth = 2; c.fillStyle = '#5d6470';
      c.fillRect(-4, -4, 8, 8);
      [-1, 1].forEach(function (d) {
        c.fillStyle = '#3a3f49'; c.beginPath(); c.moveTo(d * 4, -30); c.lineTo(d * 9, -26); c.lineTo(d * 9, 26); c.lineTo(d * 4, 30); c.lineTo(d * 1, 26); c.lineTo(d * 1, -26); c.closePath(); c.fill(); c.stroke();
      });
      c.fillStyle = '#8b93a1'; c.beginPath(); c.arc(0, 0, 11, 0, TAU); c.fill(); c.stroke();
      c.fillStyle = '#1a1d22'; c.beginPath(); c.arc(-4, 0, 6, 0, TAU); c.fill();
      c.strokeStyle = '#3c6'; c.lineWidth = 0.8; c.beginPath(); for (var i = 0; i < 6; i++) { var a = i / 6 * TAU; c.moveTo(-4, 0); c.lineTo(-4 + Math.cos(a) * 6, Math.sin(a) * 6); } c.stroke();
    },
    interceptor: function (c) {
      c.strokeStyle = '#2b2f36'; c.lineWidth = 2;
      [-1, 1].forEach(function (d) {
        c.fillStyle = '#3a3f49'; c.beginPath(); c.moveTo(-18, d * 30); c.lineTo(6, d * 6); c.lineTo(10, d * 8); c.lineTo(-6, d * 32); c.closePath(); c.fill(); c.stroke();
        c.beginPath(); c.moveTo(-18, d * 30); c.lineTo(-26, d * 26); c.stroke();
      });
      c.fillStyle = '#8b93a1'; c.beginPath(); c.arc(0, 0, 10, 0, TAU); c.fill(); c.stroke();
      c.fillStyle = '#1a1d22'; c.beginPath(); c.arc(-4, 0, 5, 0, TAU); c.fill();
    },
    vader: function (c) {
      c.strokeStyle = '#1d2026'; c.lineWidth = 2; c.fillStyle = '#2c3038';
      [-1, 1].forEach(function (d) {
        c.beginPath(); c.moveTo(-6, d * 8); c.lineTo(-18, d * 26); c.lineTo(10, d * 40); c.lineTo(16, d * 30); c.lineTo(6, d * 10); c.closePath(); c.fill(); c.stroke();
      });
      c.fillStyle = '#6f7682'; c.beginPath(); c.ellipse(4, 0, 22, 14, 0, 0, TAU); c.fill(); c.stroke();
      c.fillStyle = '#1a1d22'; c.beginPath(); c.arc(-8, 0, 7, 0, TAU); c.fill();
      c.fillStyle = '#ff3030'; c.globalAlpha = 0.7; c.fillRect(-26, -2, 6, 4); c.globalAlpha = 1;
    },
    turret: function (c, t, e) {
      c.save(); if (e.side < 0) c.scale(1, -1);
      c.fillStyle = '#6d727b'; c.strokeStyle = '#33363c'; c.lineWidth = 1.5;
      c.fillRect(-16, -2, 32, 14); c.strokeRect(-16, -2, 32, 14);
      c.beginPath(); c.arc(0, -2, 11, Math.PI, 0); c.fill(); c.stroke();
      c.rotate(e.aim || 0); c.fillStyle = '#9aa0aa'; c.fillRect(-3, -26, 6, 20);
      c.restore();
    },
    asteroid: function (c, t, e) {
      c.rotate(e.rot);
      c.fillStyle = e.col; c.strokeStyle = '#2a2420'; c.lineWidth = 2;
      c.beginPath(); for (var i = 0; i < e.shape.length; i++) { var a = i / e.shape.length * TAU, r = e.r * e.shape[i]; i ? c.lineTo(Math.cos(a) * r, Math.sin(a) * r) : c.moveTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); c.fill(); c.stroke();
      c.fillStyle = 'rgba(0,0,0,.25)'; for (var k = 0; k < 3; k++) { var h = hash(e.id * 7 + k); c.beginPath(); c.arc((h - 0.5) * e.r, (hash(e.id * 13 + k) - 0.5) * e.r, e.r * (0.12 + 0.12 * h), 0, TAU); c.fill(); }
      c.fillStyle = 'rgba(255,255,255,.12)'; c.beginPath(); c.arc(-e.r * 0.3, -e.r * 0.3, e.r * 0.5, 0, TAU); c.fill();
    },
    reactor: function (c, t, e) {
      var p = 0.5 + 0.5 * Math.sin(t * 6);
      var g = c.createRadialGradient(0, 0, 4, 0, 0, e.r * 1.6);
      g.addColorStop(0, '#fff'); g.addColorStop(0.25, '#9ff'); g.addColorStop(0.55, 'rgba(60,140,255,' + (0.5 + 0.3 * p) + ')'); g.addColorStop(1, 'rgba(20,40,120,0)');
      c.fillStyle = g; c.beginPath(); c.arc(0, 0, e.r * 1.6, 0, TAU); c.fill();
      c.strokeStyle = '#8fa3b8'; c.lineWidth = 6; c.beginPath(); c.arc(0, 0, e.r, 0, TAU); c.stroke();
      c.lineWidth = 3; for (var i = 0; i < 8; i++) { var a = i / 8 * TAU + t * 0.6; c.beginPath(); c.moveTo(Math.cos(a) * e.r, Math.sin(a) * e.r); c.lineTo(Math.cos(a) * e.r * 1.35, Math.sin(a) * e.r * 1.35); c.stroke(); }
      if (e.shield > 0) {
        c.strokeStyle = 'rgba(120,220,255,' + (0.45 + 0.35 * p) + ')'; c.lineWidth = 5;
        c.beginPath(); c.arc(0, 0, e.r * 1.25, 0, TAU); c.stroke();
        c.fillStyle = 'rgba(120,220,255,.12)'; c.beginPath(); c.arc(0, 0, e.r * 1.25, 0, TAU); c.fill();
      }
    }
  };
  // which file Teddy can drop in for each sprite (art/ relative), drawn size in logical px, facing note in README
  var SPRITE_FILES = { // [file under art/, drawn width in logical px (height keeps the file's aspect)]
    xwing: ['ships/xwing.webp', 104], falcon: ['ships/falcon.webp', 132],
    tie: ['ships/tie_fighter.webp', 66], interceptor: ['ships/tie_interceptor.webp', 62],
    vader: ['ships/tie_advanced.webp', 84], turret: ['ships/turbolaser.webp', 40],
    asteroid: ['ships/asteroid.webp', 0], reactor: ['ships/reactor_core.webp', 0]
  };


  // ---------- the level instance ----------
  function Flight(def, opts) {
    this.def = def; this.opts = opts || {};
    this.canvas = this.opts.canvas;
    if (!this.canvas) throw new Error('TacoFlight: opts.canvas required');
    this.ctx = this.canvas.getContext('2d');
    this.T = readTune();
    this.P = W.TacoPhysics || {};
    this.artBase = this.opts.artBase === undefined ? 'art/' : this.opts.artBase; // null = never load art
    this.pilotKey = this.opts.pilot || def.defaultPilot || 'taco';
    this.pilot = PILOTS[this.pilotKey] || { name: String(this.pilotKey).toUpperCase(), call: String(this.pilotKey).toUpperCase(), color: '#fff' };
    this.god = !!this.opts.god;
    this.input = new FlightInput(this);
    this.stars = [];
    for (var L = 0; L < 3; L++) for (var i = 0; i < 70; i++) this.stars.push({ x: Math.random(), y: Math.random(), l: L });
    this.resize();
    this.reset();
  }
  var F = Flight.prototype;

  F.resize = function () {
    var cv = this.canvas, cw = cv.clientWidth || W.innerWidth, ch = cv.clientHeight || W.innerHeight;
    var dpr = Math.min(W.devicePixelRatio || 1, 2);
    if (cv.width !== Math.round(cw * dpr) || cv.height !== Math.round(ch * dpr)) { cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr); }
    this.cw = cw; this.ch = ch; this.dpr = dpr;
    this.scale = Math.min(cw / this.T.minViewW, ch / this.T.viewH);
    this.vw = cw / this.scale; this.vh = ch / this.scale;
    this.spd = clamp(this.vw / 900, 0.62, 1.25); // horizontal speed scale so portrait is still fair
    this.hudH = 64 / this.scale; // logical px reserved at top for HUD
    if (this.ship) { this.ship.x = clamp(this.ship.x, 40, this.vw * 0.72); this.ship.y = clamp(this.ship.y, this.hudH, this.vh - 30); }
  };

  F.reset = function () {
    var d = this.def;
    this.t = 0; this.tl = 0; this.ev = 0; this.dist = 0;
    this.ship = { x: Math.min(140, this.vw * 0.22), y: this.vh * 0.5, vx: 0, vy: 0, tilt: 0, r: d.ship.r };
    this.maxHp = d.hull || 5; this.hp = this.maxHp; this.score = 0; this.kills = 0; this.shots = 0;
    this.bul = []; this.eb = []; this.en = []; this.parts = []; this.pk = []; this.walls = []; this.girders = [];
    this.radio = []; this.title = null; this.boss = null; this.hold = false;
    this.phase = 'space'; this.wallK = 0; this.astRate = 0; this.astAcc = 0; this.nextGirder = 600; this.nextTurret = 400;
    this.state = 'play'; this.endT = 0; this.inv = 0; this.fireCd = 0; this.spread = 0; this.star = 0; this.shake = 0; this.flash = 0;
    this.port = null; this.torp = null; this.portArmed = false; this.fireball = -9999; this.anchor = null; this.cameo = null;
    this.reported = false;
    var sa = this.opts.startAt || 0;
    if (sa > 0) { // debug/QA: jump into the timeline (apply phase/hull changes, skip spawns & bosses before startAt)
      var ev = d.events;
      while (this.ev < ev.length && ev[this.ev].t < sa) { var e = ev[this.ev++]; if (e.phase) this.setPhase(e.phase, true); if (e.asteroids !== undefined) this.astRate = e.asteroids; }
      this.tl = sa;
    }
  };

  F.sfx = function (n) {
    var o = this.opts;
    if (o.sfx) { try { o.sfx(n); } catch (e) {} return; }
    if (o.audio && W.TacoSFX) W.TacoSFX.play(o.audio.ctx, o.audio.dest, n);
  };
  F.emit = function (n, data) { if (this.opts.onEvent) try { this.opts.onEvent(n, data || {}); } catch (e) {} };
  F.say = function (who, text, dur) {
    text = String(text).replace(/\{pilot\}/g, this.pilot.name.charAt(0) + this.pilot.name.slice(1).toLowerCase()).replace(/\{call\}/g, this.pilot.call);
    this.radio.push({ who: RADIO[who] || String(who).toUpperCase(), text: text, t: dur || 3.2 });
    if (this.radio.length > 2) this.radio.shift();
  };

  F.setPhase = function (p, silent) {
    this.phase = p;
    if (p === 'escape') this.fireball = -60;
    if (p === 'port') { this.portArmed = true; this.portTimer = 1.5; }
    if (!silent) this.emit('phase', { phase: p });
  };
  F.walled = function () { return this.phase === 'trench' || this.phase === 'tunnel' || this.phase === 'escape' || this.phase === 'port'; };
  F.scroll = function () { var s = this.def.speed || 260; return (this.phase === 'escape' ? s * 1.6 : this.walled() ? s * 1.25 : s) * this.spd; };

  // ---- timeline ----
  F.runEvents = function () {
    var ev = this.def.events;
    while (this.ev < ev.length && ev[this.ev].t <= this.tl && !this.boss && !this.hold) {
      var e = ev[this.ev++];
      if (e.title) this.title = { a: e.title, b: e.sub || '', t: e.dur || 3 };
      if (e.radio) this.say(e.radio, e.text, e.dur);
      if (e.phase) this.setPhase(e.phase);
      if (e.asteroids !== undefined) this.astRate = e.asteroids;
      if (e.wave) this.spawnWave(e);
      if (e.pickup) this.spawnPickup(e.pickup, this.vw + 30, this.vh * (e.y || 0.5));
      if (e.hold) this.hold = true;
      if (e.boss) this.spawnBoss(e.boss);
      if (e.goal) this.win();
    }
  };
  F.spawnWave = function (e) {
    var n = e.n || 1, gap = e.gap || 0.45, i;
    for (i = 0; i < n; i++) {
      var yf = e.y === undefined ? rand(0.2, 0.85) : e.y, off = 0;
      if (e.pattern === 'v') off = (i - (n - 1) / 2) * 0.09;
      if (e.pattern === 'column') off = (i - (n - 1) / 2) * 0.12;
      var en = this.mkEnemy(e.wave, this.vw + 40 + (e.pattern === 'column' ? 0 : e.pattern === 'v' ? Math.abs(i - (n - 1) / 2) * 60 : i * gap * 260 * this.spd), yf + off);
      en.pattern = e.pattern || 'straight';
      if (e.pattern === 'sine') en.ph = i * 0.9;
      if (e.from === 'behind') { en.x = -60; en.vx = Math.abs(en.vx) * 0.9; en.behind = true; }
      this.en.push(en);
    }
  };
  var EDEF = {
    tie:         { hp: 2, r: 21, v: 210, pts: 100, fire: [1.0, 1.9] },
    interceptor: { hp: 2, r: 19, v: 330, pts: 150, fire: [1.2, 2.0] },
    turret:      { hp: 3, r: 18, v: 0,   pts: 120, fire: [1.1, 1.9] },
    asteroid:    { hp: 1, r: 20, v: 0,   pts: 30, fire: null },
    vader:       { hp: 90, r: 30, v: 0,  pts: 5000, fire: [1.2, 1.2] },
    reactor:     { hp: 120, r: 58, v: 0,  pts: 8000, fire: [2, 2] }
  };
  var eid = 1;
  F.mkEnemy = function (type, x, yf) {
    var d = EDEF[type] || EDEF.tie, ymin = this.hudH + 30, ymax = this.vh - 40;
    var y = ymin + clamp(yf, 0, 1) * (ymax - ymin);
    return { id: eid++, type: type, x: x, y: y, y0: y, vx: -d.v * this.spd, vy: 0, hp: d.hp, maxHp: d.hp, r: d.r, pts: d.pts, t: 0, ph: 0,
      fireT: d.fire ? rand(d.fire[0], d.fire[1]) : 0, hit: 0 };
  };
  F.mkAsteroid = function (size, x, y, vx, vy) {
    var n = 9 + size * 2, shape = [];
    for (var i = 0; i < n; i++) shape.push(rand(0.72, 1.05));
    var a = this.mkEnemy('asteroid', x, 0);
    a.y = y; a.size = size; a.r = [0, 15, 27, 44][size]; a.hp = [0, 1, 3, 6][size]; a.pts = [0, 30, 50, 80][size];
    a.vx = vx; a.vy = vy; a.rot = rand(0, TAU); a.vr = rand(-1.6, 1.6) / size; a.shape = shape;
    a.col = ['#7a6a5c', '#6d6158', '#857565', '#5f5650'][size % 4];
    return a;
  };
  F.spawnBoss = function (type) {
    var b = this.mkEnemy(type, this.vw + 80, 0.5);
    b.isBoss = true; b.y = (this.hudH + this.vh) / 2;
    if (type === 'vader') {
      b.tx = this.vw * 0.8; b.vx = -200;
      this.say('vader', "I have you now.", 3);
      for (var i = -1; i <= 1; i += 2) { var w = this.mkEnemy('tie', this.vw + 140, 0.5); w.pattern = 'escort'; w.lead = b; w.off = i * 70; w.hp = 3; this.en.push(w); }
    } else if (type === 'reactor') {
      b.tx = this.vw - Math.min(150, this.vw * 0.22); b.vx = -this.scroll(); b.shield = 1; b.shT = 2.6; b.spawnT = 3;
    }
    this.boss = b; this.en.push(b);
    this.sfx('boss_hit');
    this.emit('boss', { boss: type });
  };
  F.spawnPickup = function (type, x, y) { this.pk.push({ type: type, x: x, y: y, t: 0 }); };

  // ---- update ----
  F.update = function (dt, host) {
    dt = Math.min(dt || 0, 1 / 20);
    host = host || {};
    if (this.cw !== (this.canvas.clientWidth || W.innerWidth) || this.ch !== (this.canvas.clientHeight || W.innerHeight)) this.resize();
    this.t += dt;
    if (this.title) { this.title.t -= dt; if (this.title.t <= 0) this.title = null; }
    for (var r = this.radio.length - 1; r >= 0; r--) { this.radio[r].t -= dt; if (this.radio[r].t <= 0) this.radio.splice(r, 1); }
    this.updParts(dt);
    this.shake = Math.max(0, this.shake - dt * 3); this.flash = Math.max(0, this.flash - dt * 1.5);
    if (this.state !== 'play') {
      this.endT += dt;
      this.updBullets(dt);
      if (this.state === 'won') { this.dist += this.scroll() * dt; this.ship.x += 500 * dt * Math.min(1, this.endT); }
      if (this.endT > 2.8 && !this.reported) { this.reported = true; this.emit(this.state === 'won' ? 'complete' : 'dead', { score: this.score, hull: this.hp, kills: this.kills }); }
      return;
    }
    if (this.hold && !this.en.length) this.hold = false;
    if (!this.boss) this.tl += dt;
    this.runEvents();
    var sc = this.scroll();
    this.dist += sc * dt;
    // continuous asteroid field
    if (this.astRate > 0) {
      this.astAcc += this.astRate * dt;
      while (this.astAcc >= 1) {
        this.astAcc -= 1;
        var sz = Math.random() < 0.35 ? 3 : Math.random() < 0.6 ? 2 : 1;
        this.en.push(this.mkAsteroid(sz, this.vw + 60, rand(this.hudH + 20, this.vh - 20), -(sc * rand(0.7, 1.4) + rand(20, 120)), rand(-60, 60)));
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
    if (this.cameo) { this.cameo.t += dt; if (this.cameo.t > 2.5) this.cameo = null; }
    if (this.phase === 'escape') {
      this.fireball += (sc * 0.08 + 40) * dt; // creeps up the screen; ship must stay ahead
      var fbx = this.fireball;
      if (this.ship.x - this.ship.r < fbx) this.hurt(1, true);
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
      var gap = Math.min(this.vh - this.hudH - 40, tunnel ? 300 : 380);
      if (this.phase === 'port') gap = Math.min(this.vh - this.hudH - 40, 330);
      var sway = (this.vh - this.hudH - gap) * 0.45 * (this.phase === 'port' ? 0.15 : 1);
      var mid = (this.hudH + this.vh) / 2 + sway * (Math.sin(d * 0.0013) * 0.7 + Math.sin(d * 0.0037 + 1) * 0.3);
      var tY = mid - gap / 2, bY = mid + gap / 2;
      s = { x: lastX, top: top + (tY - top) * k, bot: bot + (bY - bot) * k, k: k, n: Math.floor(d / segW), tunnel: tunnel };
      this.walls.push(s);
      lastX += segW;
      // turrets on trench walls
      if (k > 0.95 && this.phase === 'trench' && d > this.nextTurret) {
        this.nextTurret = d + rand(380, 650);
        var side = Math.random() < 0.5 ? -1 : 1, tu = this.mkEnemy('turret', lastX, 0);
        tu.side = side; tu.seg = s; tu.y = side < 0 ? s.top + 10 : s.bot - 10; tu.vx = 0; tu.wall = true; this.en.push(tu);
      }
      // girders inside the DS2 superstructure
      if (k > 0.95 && tunnel && d > this.nextGirder) {
        this.nextGirder = d + rand(520, 820) * (this.phase === 'escape' ? 1.1 : 1);
        var fromTop = Math.random() < 0.5, clear = 150, len = Math.max(0, (s.bot - s.top) - clear - 20);
        if (len > 30) this.girders.push({ x: lastX, w: 26, y0: fromTop ? s.top : s.bot - len, y1: fromTop ? s.top + len : s.bot });
      }
    }
    for (i = this.girders.length - 1; i >= 0; i--) { this.girders[i].x -= sc * dt; if (this.girders[i].x < -60) this.girders.splice(i, 1); }
    // exhaust port
    if (this.phase === 'port' && this.portArmed && !this.port) {
      this.portTimer -= dt;
      if (this.portTimer <= 0) { this.port = { x: this.vw + 60, w: 70, hit: false }; this.say('obiwan', 'Use the Force, {pilot}. Let go...', 3.5); }
    }
    if (this.port) {
      this.port.x -= sc * dt;
      var ps = this.wallAt(this.port.x); this.port.y = ps ? ps.bot : this.vh - 30;
      if (this.port.x < -80 && !this.port.hit) { this.port = null; this.portTimer = 2.5; this.say('red_leader', "Missed! Coming around for another pass!", 2.8); }
    }
  };
  F.wallAt = function (x) {
    for (var i = 0; i < this.walls.length; i++) { var s = this.walls[i]; if (x >= s.x && x < s.x + 40) return s; }
    return null;
  };

  F.updShip = function (dt, host) {
    var s = this.ship, T = this.T, I = this.input, inp = { L: !!host.L, R: !!host.R, U: !!host.U, D: !!host.D, hasTarget: false };
    var minX = 40, maxX = this.vw * 0.72, minY = this.hudH + s.r * 0.6, maxY = this.vh - s.r - 6;
    if (I.active) {
      if (I.began || !this.anchor) { this.anchor = { x: s.x, y: s.y }; I.began = false; }
      var dx = (I.cx - I.sx) / this.scale * T.swipeGain, dy = (I.cy - I.sy) / this.scale * T.swipeGain;
      var tx = this.anchor.x + dx, ty = this.anchor.y + dy, cx = clamp(tx, minX, maxX), cy = clamp(ty, minY, maxY);
      if (cx !== tx) this.anchor.x += cx - tx; // re-anchor at the edge so reversing responds instantly
      if (cy !== ty) this.anchor.y += cy - ty;
      inp.hasTarget = true; inp.tx = cx; inp.ty = cy;
    } else this.anchor = null;
    inp.steer = inp.hasTarget ? clamp((inp.ty - s.y) / 120, -1, 1) : (inp.D ? 1 : 0) - (inp.U ? 1 : 0);
    var step = typeof this.P.stepShip === 'function' ? this.P.stepShip : stepShipDefault;
    var n = Math.ceil(dt / (1 / 120)), h = dt / n;
    for (var i = 0; i < n; i++) step(s, inp, h, T);
    if (s.x < minX) { s.x = minX; s.vx = Math.max(0, s.vx); } if (s.x > maxX) { s.x = maxX; s.vx = Math.min(0, s.vx); }
    if (s.y < minY) { s.y = minY; s.vy = Math.max(0, s.vy); } if (s.y > maxY) { s.y = maxY; s.vy = Math.min(0, s.vy); }
    if (Math.random() < 0.6) this.parts.push({ x: s.x - this.def.ship.tail, y: s.y + rand(-3, 3), vx: -rand(150, 260), vy: rand(-15, 15), t: 0, life: 0.25, c: this.def.ship.trail, sz: 3 });
  };

  F.updFire = function (dt, host) {
    var torpMode = this.phase === 'port';
    this.input.label(torpMode ? 'TORPEDO' : 'FIRE');
    this.fireCd -= dt;
    var want = this.input.fire || !!host.fire || !!host.throwing || !!this.opts.autoFire;
    if (!want || this.fireCd > 0) return;
    var s = this.ship;
    if (torpMode) {
      if (this.torp) return;
      this.torp = { x: s.x + 30, y: s.y, vx: 560, vy: 0, t: 0 };
      this.fireCd = 0.9; this.sfx('throw'); this.sfx('torpedo'); return;
    }
    this.fireCd = 1 / this.T.fireRate;
    var V = this.T.bulletV, d = this.def.ship, self = this;
    var mk = function (ox, oy, ang) { self.bul.push({ x: s.x + ox, y: s.y + oy, vx: Math.cos(ang) * V, vy: Math.sin(ang) * V, c: d.bolt }); };
    var pair = d.guns[this.shots % d.guns.length];
    pair.forEach(function (g) { mk(g[0], g[1], s.tilt * 0.25); });
    if (this.spread > 0) { mk(20, 0, -0.22 + s.tilt * 0.2); mk(20, 0, 0.22 + s.tilt * 0.2); }
    this.shots++;
    this.sfx('laser');
  };

  F.updEnemies = function (dt, sc) {
    var s = this.ship, me = this;
    for (var i = this.en.length - 1; i >= 0; i--) {
      var e = this.en[i]; e.t += dt; if (e.hit > 0) e.hit -= dt;
      switch (e.type) {
        case 'tie':
          if (e.pattern === 'escort' && e.lead && e.lead.hp > 0) { e.x += (e.lead.x + 50 - e.x) * Math.min(1, dt * 3); e.y += (e.lead.y + e.off - e.y) * Math.min(1, dt * 3); break; }
          e.x += e.vx * dt;
          if (e.pattern === 'sine') e.y = e.y0 + Math.sin(e.t * 2.4 + e.ph) * 70;
          else if (e.pattern === 'dive') e.y += clamp(s.y - e.y, -1, 1) * 90 * dt;
          if (e.behind && e.x > this.vw * 0.55) { e.vx = -Math.abs(e.vx); e.behind = false; } // overtake then turn to fight
          break;
        case 'interceptor':
          e.x += e.vx * dt; if (e.x > s.x + 60) e.y += clamp(s.y - e.y, -1, 1) * 230 * dt;
          if (e.behind && e.x > this.vw * 0.6) { e.vx = -Math.abs(e.vx); e.behind = false; }
          break;
        case 'turret': {
          var sg = e.seg; e.x = sg.x + 20; e.y = e.side < 0 ? sg.top + 10 : sg.bot - 10;
          var a = Math.atan2(s.y - e.y, s.x - e.x);
          e.aim = e.side < 0 ? -(a + Math.PI / 2) + Math.PI : a + Math.PI / 2; // barrel points up in sprite space; top turrets are y-flipped
          break; }
        case 'asteroid':
          e.x += e.vx * dt; e.y += e.vy * dt; e.rot += e.vr * dt;
          if (e.y < this.hudH * 0.5 || e.y > this.vh) e.vy = -e.vy;
          break;
        case 'vader':
          if (e.burstQ && e.burstQ.length) {
            e.burstT += dt;
            while (e.burstQ.length && e.burstT >= e.burstQ[0]) {
              e.burstQ.shift();
              var ang = Math.atan2(s.y - e.y, s.x - e.x), offs = e.burstSpread ? [-0.18, 0, 0.18] : [0];
              for (var o = 0; o < offs.length; o++) this.eb.push({ x: e.x - 10, y: e.y, vx: Math.cos(ang + offs[o]) * 420, vy: Math.sin(ang + offs[o]) * 420, r: 5, c: '#4dff6a' });
              this.sfx('tie_laser');
            }
          }
          if (e.x > e.tx) e.x += e.vx * dt; else e.x = e.tx + Math.sin(e.t * 0.9) * 40;
          e.y += clamp((s.y - e.y) * 1.8, -230, 230) * dt;
          break;
        case 'reactor':
          if (e.x > e.tx) e.x -= sc * dt; else e.x = e.tx;
          e.y = (this.hudH + this.vh) / 2 + Math.sin(e.t * 0.7) * 30;
          e.shT -= dt; if (e.shT <= 0) { e.shield = e.shield ? 0 : 1; e.shT = e.shield ? 2.2 : 2.6; }
          e.spawnT -= dt; if (e.spawnT <= 0) { e.spawnT = e.hp < e.maxHp / 2 ? 3 : 4.5; var it = this.mkEnemy('interceptor', -60, Math.random()); it.vx = 380 * this.spd; it.behind = true; this.en.push(it); }
          break;
      }
      // shooting
      var d = EDEF[e.type];
      if (d && d.fire && e.x < this.vw - 10 && e.x > s.x + 40) {
        e.fireT -= dt;
        if (e.fireT <= 0) {
          e.fireT = rand(d.fire[0], d.fire[1]) * (e.isBoss && e.hp < e.maxHp / 2 ? 0.7 : 1);
          this.enemyFire(e);
        }
      }
      if (!e.isBoss && (e.x < -120 && !e.behind || e.x > this.vw + 500)) this.en.splice(i, 1);
    }
  };
  F.enemyFire = function (e) {
    var s = this.ship, V = 380 * Math.max(0.8, this.spd), self = this;
    var shoot = function (ang, sp) { self.eb.push({ x: e.x - 10, y: e.y, vx: Math.cos(ang) * (sp || V), vy: Math.sin(ang) * (sp || V), r: 5, c: e.type === 'reactor' ? '#7ff' : '#4dff6a' }); };
    var aim = Math.atan2(s.y - e.y, s.x - e.x);
    if (e.type === 'tie') shoot(aim + rand(-0.06, 0.06)); // aimed, slightly sloppy
    else if (e.type === 'interceptor' || e.type === 'turret') shoot(aim);
    else if (e.type === 'vader') {
      e.burstQ = [0, 0.12, 0.24]; e.burstT = 0; e.burstSpread = e.hp < e.maxHp / 2;
      return;
    } else if (e.type === 'reactor') {
      var n = e.hp < e.maxHp / 2 ? 14 : 10, off = e.t;
      for (var k = 0; k < n; k++) { var a = off + k / n * TAU; if (Math.cos(a) < 0.3) shoot(a, 240); }
    }
    this.sfx('tie_laser');
  };

  F.updBullets = function (dt) {
    var i, b;
    for (i = this.bul.length - 1; i >= 0; i--) { b = this.bul[i]; b.x += b.vx * dt; b.y += b.vy * dt; if (b.x > this.vw + 40 || b.y < -40 || b.y > this.vh + 40) this.bul.splice(i, 1); }
    for (i = this.eb.length - 1; i >= 0; i--) { b = this.eb[i]; b.x += b.vx * dt; b.y += b.vy * dt; if (b.x < -40 || b.x > this.vw + 60 || b.y < -40 || b.y > this.vh + 40) this.eb.splice(i, 1); }
    var tp = this.torp;
    if (tp) {
      tp.t += dt;
      tp.x += tp.vx * dt;
      if (this.port && !this.port.hit) { // "it's a one in a million shot": once the port is ahead and in range the torpedo homes in
        var px = this.port.x + this.port.w / 2, py = this.port.y + 4;
        if (px > tp.x - 20 && px - tp.x < 280 && px < this.vw - 20) {
          var ang = Math.atan2(py - tp.y, px - tp.x), cur = Math.atan2(tp.vy, tp.vx), dA = Math.atan2(Math.sin(ang - cur), Math.cos(ang - cur));
          cur += clamp(dA, -6.5 * dt, 6.5 * dt); tp.vx = Math.cos(cur) * 620; tp.vy = Math.sin(cur) * 620;
        }
      }
      tp.y += tp.vy * dt;
      if (Math.random() < 0.9) this.parts.push({ x: tp.x - 8, y: tp.y, vx: -80, vy: rand(-20, 20), t: 0, life: 0.3, c: '#9cf', sz: 3 });
      if (this.port && !this.port.hit && Math.abs(tp.x - (this.port.x + this.port.w / 2)) < this.port.w / 2 + 4 && tp.y > this.port.y - 14) {
        this.port.hit = true; this.torp = null; this.boom(tp.x, this.port.y, 2.2); this.say('han', "Great shot, kid! That was one in a million!", 3.2); this.win();
      } else if (tp.x > this.vw + 40 || tp.y > this.vh + 20 || tp.t > 3) this.torp = null;
    }
  };
  F.updPickups = function (dt, sc) {
    for (var i = this.pk.length - 1; i >= 0; i--) {
      var p = this.pk[i]; p.t += dt; p.x -= sc * 0.6 * dt; p.y += Math.sin(p.t * 3) * 20 * dt;
      if (Math.hypot(p.x - this.ship.x, p.y - this.ship.y) < this.ship.r + 22) { this.pickup(p.type); this.pk.splice(i, 1); }
      else if (p.x < -40) this.pk.splice(i, 1);
    }
  };
  F.pickup = function (t) {
    if (t === 'heart') this.hp = Math.min(this.maxHp, this.hp + 1), this.sfx('heal');
    else if (t === 'taco_shell') this.hp = this.maxHp, this.sfx('heal');
    else if (t === 'salsa') this.spread = 10, this.sfx('pickup');
    else if (t === 'star') this.star = 8, this.sfx('star');
    else { this.score += 100; this.sfx('coin'); }
    this.emit('pickup', { type: t });
  };

  F.collide = function () {
    var s = this.ship, i, j, e, b;
    // player bolts vs enemies
    for (i = this.bul.length - 1; i >= 0; i--) {
      b = this.bul[i];
      for (j = this.en.length - 1; j >= 0; j--) {
        e = this.en[j];
        if (Math.abs(b.x - e.x) < e.r + 8 && Math.abs(b.y - e.y) < e.r + 4) {
          this.bul.splice(i, 1);
          if (e.type === 'reactor' && e.shield) { this.spark(b.x, b.y, '#7ff'); break; }
          if (e.x > this.vw + 10) break;
          e.hp--; e.hit = 0.08; this.spark(b.x, b.y, '#ffb347');
          if (e.isBoss) this.sfx('boss_hit');
          if (e.hp <= 0) this.kill(e, j);
          break;
        }
      }
    }
    // girders absorb bolts
    for (i = this.bul.length - 1; i >= 0; i--) { b = this.bul[i]; for (j = 0; j < this.girders.length; j++) { var g = this.girders[j]; if (b.x > g.x && b.x < g.x + g.w && b.y > g.y0 && b.y < g.y1) { this.spark(b.x, b.y, '#fc6'); this.bul.splice(i, 1); break; } } }
    // enemy bolts vs ship
    for (i = this.eb.length - 1; i >= 0; i--) { b = this.eb[i]; if (Math.hypot(b.x - s.x, b.y - s.y) < s.r * 0.75 + b.r) { this.eb.splice(i, 1); this.hurt(1); } }
    // ship vs enemies
    for (j = this.en.length - 1; j >= 0; j--) {
      e = this.en[j];
      if (Math.hypot(e.x - s.x, e.y - s.y) < e.r * 0.85 + s.r * 0.7) {
        if (this.star > 0 && !e.isBoss) { this.kill(e, j); continue; }
        this.hurt(1);
        if (!e.isBoss && e.type !== 'turret') { e.hp -= 2; if (e.hp <= 0) this.kill(e, j); }
      }
    }
    // ship vs walls / girders
    if (this.walls.length) {
      var hitW = false;
      for (j = 0; j < this.walls.length; j++) {
        var w = this.walls[j];
        if (w.k < 0.3 || w.x > s.x + s.r * 0.8 || w.x + 40 < s.x - s.r * 0.8) continue;
        if (s.y - s.r * 0.6 < w.top) { s.y = w.top + s.r * 0.6 + 1; s.vy = Math.abs(s.vy) * 0.5 + 120; hitW = true; }
        if (s.y + s.r * 0.6 > w.bot) { s.y = w.bot - s.r * 0.6 - 1; s.vy = -Math.abs(s.vy) * 0.5 - 120; hitW = true; }
      }
      for (j = 0; j < this.girders.length; j++) {
        var gd = this.girders[j];
        if (s.x + s.r * 0.7 > gd.x && s.x - s.r * 0.7 < gd.x + gd.w && s.y + s.r * 0.5 > gd.y0 && s.y - s.r * 0.5 < gd.y1) { s.x = gd.x - s.r * 0.7 - 1; s.vx = -200; hitW = true; }
      }
      if (hitW) { this.hurt(1); if (this.anchor) { this.anchor.x = s.x; this.anchor.y = s.y; this.input.sx = this.input.cx; this.input.sy = this.input.cy; } }
    }
  };
  F.hurt = function (n, fire) {
    if (this.inv > 0 || this.god || this.star > 0 || this.state !== 'play') return;
    this.hp -= n; this.inv = this.T.iframes; this.shake = 1; this.sfx('hurt');
    this.spark(this.ship.x, this.ship.y, fire ? '#f80' : '#fff');
    this.emit('hurt', { hp: this.hp });
    if (this.hp <= 0) {
      this.hp = 0; this.state = 'dead'; this.endT = 0; this.boom(this.ship.x, this.ship.y, 1.6); this.sfx('die');
    }
  };
  F.kill = function (e, j) {
    this.en.splice(j, 1); this.kills++; this.score += e.pts || 100;
    this.boom(e.x, e.y, e.isBoss ? 2.5 : e.type === 'asteroid' ? e.size * 0.35 : 0.8, e.type === 'asteroid');
    this.sfx(e.isBoss ? 'boss_die' : 'stomp'); this.sfx('explosion');
    if (e.type === 'asteroid' && e.size > 1) for (var k = 0; k < 2; k++) this.en.push(this.mkAsteroid(e.size - 1, e.x, e.y, e.vx * 0.8 + rand(-40, 40), (k ? 1 : -1) * rand(60, 140)));
    if (!e.isBoss && e.type !== 'asteroid' && Math.random() < 0.12) this.spawnPickup(['heart', 'salsa', 'star', 'heart'][Math.floor(Math.random() * 4)], e.x, e.y);
    if (e.isBoss) {
      this.boss = null; this.flash = 1; this.shake = 1.5;
      for (var q = this.en.length - 1; q >= 0; q--) if (this.en[q].pattern === 'escort') { this.boom(this.en[q].x, this.en[q].y, 0.8); this.en.splice(q, 1); }
      var od = this.def.bossDefeat && this.def.bossDefeat[e.type];
      if (od) { var me = this; od.forEach(function (r) { me.say(r[0], r[1], r[2]); }); }
      if (e.type === 'vader') this.cameo = { t: 0 }; // the Falcon swoops in out of the sun
      if (/chew|ewok|wicket/.test(this.pilotKey)) this.sfx('roar');
      this.emit('bossDefeated', { boss: e.type });
    }
  };
  F.win = function () { if (this.state !== 'play') return; this.state = 'won'; this.endT = 0; this.score += this.hp * 1000; this.sfx('clear'); };
  F.spark = function (x, y, c) { for (var i = 0; i < 6; i++) this.parts.push({ x: x, y: y, vx: rand(-220, 220), vy: rand(-220, 220), t: 0, life: rand(0.15, 0.35), c: c, sz: 2.5 }); };
  F.boom = function (x, y, big, rock) {
    var n = Math.round(24 * big);
    for (var i = 0; i < n; i++) { var a = rand(0, TAU), v = rand(60, 380) * big; this.parts.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, life: rand(0.3, 0.8), c: rock ? ['#9a8a7a', '#6d6158', '#ffb347'][i % 3] : ['#fff6a0', '#ffb347', '#ff5a1f', '#888'][i % 4], sz: rand(2, 5) * Math.min(big, 1.5) }); }
    this.parts.push({ ring: true, x: x, y: y, t: 0, life: 0.45, r: 30 * big });
    this.shake = Math.max(this.shake, 0.35 * big);
  };
  F.updParts = function (dt) {
    for (var i = this.parts.length - 1; i >= 0; i--) { var p = this.parts[i]; p.t += dt; if (p.t >= p.life) { this.parts.splice(i, 1); continue; } if (!p.ring) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.97; p.vy *= 0.97; } }
    if (this.parts.length > 600) this.parts.splice(0, this.parts.length - 600);
  };

  // ---------- draw ----------
  F.sprite = function (key, x, y, rot, e, w, h) {
    var c = this.ctx, f = SPRITE_FILES[key], im = f && img(this.artBase, f[0]);
    c.save(); c.translate(x, y); if (rot) c.rotate(rot);
    if (im) {
      var dw = w || f[1] || e.r * 2.3, dh = h || dw * im.height / im.width;
      if (key === 'turret' && e && e.side < 0) c.scale(1, -1);
      if (key === 'asteroid') c.rotate(e.rot);
      if (key === 'reactor') dw = dh = e.r * 2.6;
      c.drawImage(im, -dw / 2, -dh / 2, dw, dh);
    } else ART[key](c, this.t, e || {});
    c.restore();
  };

  F.draw = function () {
    var c = this.ctx, k = this.scale * this.dpr, sh = this.shake * 8;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = '#000'; c.fillRect(0, 0, this.canvas.width, this.canvas.height);
    c.setTransform(k, 0, 0, k, sh ? rand(-sh, sh) * k : 0, sh ? rand(-sh, sh) * k : 0);
    this.drawBG(c);
    if (this.def.bg !== 'yavin' && this.wallK > 0) { // inside the Death Star II superstructure: dim the sky, add orange reactor glow
      c.fillStyle = 'rgba(12,8,18,' + (0.82 * this.wallK) + ')'; c.fillRect(0, 0, this.vw, this.vh);
      var gl = c.createLinearGradient(this.vw, 0, this.vw * 0.4, 0); gl.addColorStop(0, 'rgba(255,120,40,' + 0.18 * this.wallK + ')'); gl.addColorStop(1, 'rgba(255,120,40,0)');
      c.fillStyle = gl; c.fillRect(0, 0, this.vw, this.vh);
    }
    this.drawTerrain(c);
    var i, e;
    // pickups
    for (i = 0; i < this.pk.length; i++) this.drawPickup(c, this.pk[i]);
    // enemies
    for (i = 0; i < this.en.length; i++) {
      e = this.en[i];
      if (e.hit > 0) { c.save(); c.globalAlpha = 0.6; }
      var key = e.type === 'tie' ? 'tie' : e.type;
      this.sprite(key, e.x, e.y, e.type === 'vader' ? Math.sin(e.t * 2) * 0.08 : 0, e, e.type === 'asteroid' ? e.r * 2.3 : 0, e.type === 'asteroid' ? e.r * 2.3 : 0);
      if (e.hit > 0) c.restore();
    }
    // Falcon cameo after Vader ("YAHOO!")
    if (this.cameo) { var q = this.cameo.t / 2.5; c.save(); c.globalAlpha = 1; this.sprite('falcon', -80 + q * (this.vw + 220), this.hudH + 40 + Math.sin(q * 3) * 30, 0.15, {}); c.restore(); }
    // bolts
    c.lineCap = 'round';
    for (i = 0; i < this.bul.length; i++) { var b = this.bul[i]; this.bolt(c, b.x, b.y, b.vx, b.vy, b.c, 26, 3.5); }
    for (i = 0; i < this.eb.length; i++) { var eb = this.eb[i]; this.bolt(c, eb.x, eb.y, eb.vx, eb.vy, eb.c, 20, 4); }
    if (this.torp) { c.fillStyle = '#cfe8ff'; c.shadowColor = '#6cf'; c.shadowBlur = 16; c.beginPath(); c.arc(this.torp.x, this.torp.y, 6, 0, TAU); c.fill(); c.shadowBlur = 0; }
    // ship
    var s = this.ship;
    if (this.state !== 'dead' && !(this.inv > 0 && Math.floor(this.t * 16) % 2)) {
      if (this.star > 0) { c.save(); c.globalAlpha = 0.35 + 0.2 * Math.sin(this.t * 20); c.fillStyle = '#ffe66d'; c.beginPath(); c.arc(s.x, s.y, s.r * 2, 0, TAU); c.fill(); c.restore(); }
      this.sprite(this.def.ship.key, s.x, s.y, s.tilt, {});
    }
    // particles
    for (i = 0; i < this.parts.length; i++) {
      var p = this.parts[i], a = 1 - p.t / p.life;
      if (p.ring) { c.strokeStyle = 'rgba(255,230,160,' + a + ')'; c.lineWidth = 3; c.beginPath(); c.arc(p.x, p.y, p.r * (0.3 + p.t / p.life), 0, TAU); c.stroke(); continue; }
      c.globalAlpha = a; c.fillStyle = p.c; c.fillRect(p.x - p.sz / 2, p.y - p.sz / 2, p.sz, p.sz);
    }
    c.globalAlpha = 1;
    // escape fireball
    if (this.phase === 'escape' && this.fireball > -60) {
      var fx = this.fireball, g = c.createLinearGradient(fx - 200, 0, fx + 40, 0);
      g.addColorStop(0, 'rgba(255,255,220,1)'); g.addColorStop(0.6, 'rgba(255,150,30,.9)'); g.addColorStop(1, 'rgba(255,60,0,0)');
      c.fillStyle = g; c.fillRect(-20, 0, fx + 60, this.vh);
      for (i = 0; i < 6; i++) { c.fillStyle = 'rgba(255,' + (120 + i * 20) + ',40,.5)'; c.beginPath(); c.arc(fx + Math.sin(this.t * 7 + i) * 18, this.vh * (i + 0.5) / 6, 40 + 10 * Math.sin(this.t * 9 + i * 2), 0, TAU); c.fill(); }
    }
    if (this.flash > 0) { c.fillStyle = 'rgba(255,255,255,' + this.flash * 0.8 + ')'; c.fillRect(0, 0, this.vw, this.vh); }
    this.drawHUD();
  };
  F.bolt = function (c, x, y, vx, vy, col, len, w) {
    var sp = Math.hypot(vx, vy) || 1, ux = vx / sp * len / 2, uy = vy / sp * len / 2;
    c.strokeStyle = col; c.globalAlpha = 0.35; c.lineWidth = w * 2.4; c.beginPath(); c.moveTo(x - ux, y - uy); c.lineTo(x + ux, y + uy); c.stroke();
    c.globalAlpha = 1; c.lineWidth = w; c.beginPath(); c.moveTo(x - ux, y - uy); c.lineTo(x + ux, y + uy); c.stroke();
    c.strokeStyle = '#fff'; c.lineWidth = w * 0.4; c.beginPath(); c.moveTo(x - ux * 0.7, y - uy * 0.7); c.lineTo(x + ux * 0.7, y + uy * 0.7); c.stroke();
  };
  F.drawPickup = function (c, p) {
    var im = img(this.artBase, 'pickups/' + p.type + '.webp');
    c.save(); c.translate(p.x, p.y);
    var glow = 0.5 + 0.5 * Math.sin(p.t * 6);
    c.fillStyle = 'rgba(255,255,255,' + (0.15 + 0.15 * glow) + ')'; c.beginPath(); c.arc(0, 0, 24, 0, TAU); c.fill();
    if (im) c.drawImage(im, -20, -20, 40, 40);
    else {
      var col = { heart: '#ff3b6b', salsa: '#ff5a1f', star: '#ffe66d', taco_shell: '#f4c35a' }[p.type] || '#fff';
      c.fillStyle = col; c.strokeStyle = '#000'; c.lineWidth = 2;
      if (p.type === 'heart') { c.beginPath(); c.moveTo(0, 12); c.bezierCurveTo(-22, -4, -10, -20, 0, -8); c.bezierCurveTo(10, -20, 22, -4, 0, 12); c.fill(); c.stroke(); }
      else if (p.type === 'star') { c.beginPath(); for (var i = 0; i < 10; i++) { var a = i / 10 * TAU - Math.PI / 2, r = i % 2 ? 7 : 16; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); c.fill(); c.stroke(); }
      else { c.beginPath(); c.arc(0, 0, 14, 0, TAU); c.fill(); c.stroke(); c.fillStyle = '#000'; c.font = '900 12px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(p.type === 'salsa' ? 'S' : '?', 0, 1); }
    }
    c.restore();
  };

  F.drawBG = function (c) {
    var vw = this.vw, vh = this.vh, bg = this.def.bg || 'yavin', d = this.dist, i;
    var g = c.createLinearGradient(0, 0, 0, vh);
    if (bg === 'yavin') { g.addColorStop(0, '#05030f'); g.addColorStop(1, '#120720'); }
    else { g.addColorStop(0, '#07040f'); g.addColorStop(0.6, '#1a0b2a'); g.addColorStop(1, '#0b1620'); }
    c.fillStyle = g; c.fillRect(0, 0, vw, vh);
    var far = img(this.artBase, 'space/' + (this.def.artTheme || 'space') + '_far.webp');
    if (far) { var fw = far.width * vh / far.height, ox = -(d * 0.05) % fw; for (var x = ox; x < vw; x += fw) c.drawImage(far, x, 0, fw, vh); }
    // starfield (3 parallax layers)
    for (i = 0; i < this.stars.length; i++) {
      var st = this.stars[i], f = [0.04, 0.12, 0.3][st.l], sx = ((st.x * vw * 1.5 - d * f) % (vw * 1.5) + vw * 1.5) % (vw * 1.5);
      c.fillStyle = ['#7a7f99', '#b9c2ff', '#fff'][st.l]; var z = [1, 1.6, 2.4][st.l];
      if (this.phase === 'escape' || this.phase === 'tunnel') { c.globalAlpha = 0.5; c.fillRect(sx, st.y * vh, z * 6, z * 0.6); c.globalAlpha = 1; }
      else c.fillRect(sx, st.y * vh, z, z);
    }
    if (bg === 'yavin') {
      // the gas giant Yavin + its moon, then the Death Star grows as you approach
      var px = vw * 0.78 - d * 0.01, py = vh * 0.82, pr = Math.max(vw, vh) * 0.42;
      var gas = img(this.artBase, 'space/planet_gas_giant.webp'), moon = img(this.artBase, 'space/planet_battle_moon.webp');
      if (gas) { var gw = pr * 2 * gas.width / gas.height * 0.62; c.drawImage(gas, px - gw / 2, py - pr * 0.62, gw, pr * 1.24); }
      else {
        var pg = c.createRadialGradient(px - pr * 0.3, py - pr * 0.3, pr * 0.1, px, py, pr);
        pg.addColorStop(0, '#ffb35c'); pg.addColorStop(0.5, '#d2622b'); pg.addColorStop(1, '#3a0f12');
        c.fillStyle = pg; c.beginPath(); c.arc(px, py, pr, 0, TAU); c.fill();
        c.save(); c.beginPath(); c.arc(px, py, pr, 0, TAU); c.clip(); c.globalAlpha = 0.18;
        for (i = 0; i < 7; i++) { c.fillStyle = i % 2 ? '#fff0c0' : '#5a1a10'; c.fillRect(px - pr, py - pr + i * pr * 0.3 + Math.sin(i) * 10, pr * 2, pr * 0.1); }
        c.restore();
      }
      var grow = clamp(this.tl / 30, 0, 1), dr = 30 + 110 * grow, dx = vw * 0.32 - d * 0.004, dy = this.hudH + vh * 0.18;
      c.globalAlpha = 0.95 * (1 - this.wallK * 0.8);
      if (moon) c.drawImage(moon, dx - dr, dy - dr, dr * 2, dr * 2);
      else {
        var dg = c.createRadialGradient(dx - dr * 0.35, dy - dr * 0.35, dr * 0.1, dx, dy, dr);
        dg.addColorStop(0, '#c9ccd2'); dg.addColorStop(1, '#3a3d44');
        c.fillStyle = dg; c.beginPath(); c.arc(dx, dy, dr, 0, TAU); c.fill();
        c.fillStyle = '#2a2c32'; c.beginPath(); c.arc(dx - dr * 0.35, dy - dr * 0.35, dr * 0.22, 0, TAU); c.fill();
        c.fillStyle = '#1d1f24'; c.fillRect(dx - dr, dy - 1.5, dr * 2, 3);
      }
      c.globalAlpha = 1;
    } else {
      // Endor's forest moon + the half-built Death Star II; distant asteroid silhouettes
      var mx = vw * 0.15 - d * 0.006, my = vh * 0.85, mr = Math.max(vw, vh) * 0.3;
      var mg = c.createRadialGradient(mx + mr * 0.3, my - mr * 0.3, mr * 0.1, mx, my, mr);
      mg.addColorStop(0, '#9fd59a'); mg.addColorStop(0.6, '#2f6b3d'); mg.addColorStop(1, '#0a1a12');
      c.fillStyle = mg; c.beginPath(); c.arc(mx, my, mr, 0, TAU); c.fill();
      var ex = vw * 0.8 - d * 0.008, ey = this.hudH + vh * 0.2, er = Math.min(vw, vh) * 0.22;
      c.globalAlpha = 0.85 * (1 - this.wallK * 0.85);
      var moon2 = img(this.artBase, 'space/planet_battle_moon.webp');
      c.save(); c.beginPath(); c.rect(ex - er - 2, ey - er - 2, er * 1.25, er * 2 + 4); c.clip();
      if (moon2) c.drawImage(moon2, ex - er, ey - er, er * 2, er * 2);
      else { c.fillStyle = '#5a5e68'; c.beginPath(); c.arc(ex, ey, er, 0, TAU); c.fill(); }
      c.restore();
      c.save(); c.beginPath(); c.arc(ex, ey, er, 0, TAU); c.clip();
      c.strokeStyle = 'rgba(160,170,190,.55)'; c.lineWidth = 1;
      for (i = -4; i <= 4; i++) { c.beginPath(); c.moveTo(ex + er * 0.25, ey + i * er / 5); c.lineTo(ex + er, ey + i * er / 5); c.stroke(); }
      for (i = 1; i <= 3; i++) { c.beginPath(); c.ellipse(ex, ey, er * (0.25 + i * 0.25), er, 0, -Math.PI / 2, Math.PI / 2); c.stroke(); }
      c.restore();
      c.strokeStyle = 'rgba(160,170,190,.6)'; c.beginPath(); c.arc(ex, ey, er, -Math.PI / 2, Math.PI / 2); c.stroke();
      c.globalAlpha = 1;
      if (this.phase === 'space') {
        c.fillStyle = 'rgba(40,30,30,.55)';
        for (i = 0; i < 9; i++) { var ax = ((hash(i + 3) * vw * 2 - d * 0.18) % (vw * 2) + vw * 2) % (vw * 2) - 60, ay = hash(i + 50) * vh, ar = 10 + hash(i + 90) * 28; c.beginPath(); c.arc(ax, ay, ar, 0, TAU); c.fill(); }
      }
    }
  };

  F.drawTerrain = function (c) {
    if (!this.walls.length || this.wallK <= 0.001 && !this.walls.some(function (w) { return w.k > 0.01; })) return;
    var tunnel = this.phase === 'tunnel' || this.phase === 'escape', i, w, vh = this.vh;
    var wallImg = img(this.artBase, 'space/' + (tunnel ? 'ds2_wall' : 'trench_wall') + '.webp');
    for (i = 0; i < this.walls.length; i++) {
      w = this.walls[i]; if (w.k < 0.01) continue;
      var x = w.x, h = hash(w.n);
      var base = w.tunnel ? '#2a2a33' : '#5b5f68', hi = w.tunnel ? '#3b3b48' : '#7b808b';
      // top wall
      c.fillStyle = base; c.fillRect(x, -20, 41, w.top + 20);
      c.fillStyle = base; c.fillRect(x, w.bot, 41, vh - w.bot + 20);
      if (wallImg) { c.drawImage(wallImg, x, w.top - 128, 41, 128); c.drawImage(wallImg, x, w.bot, 41, 128); }
      else {
        c.fillStyle = hi;
        c.fillRect(x + 4, w.top - 14 - h * 30, 12 + h * 16, 8); c.fillRect(x + 6, w.bot + 8 + h * 26, 10 + h * 18, 7);
        c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(x + 20 * h, w.top - 40 - 40 * h, 14, 20); c.fillRect(x + 18 * (1 - h), w.bot + 30 + 30 * h, 16, 18);
        if (w.tunnel && h > 0.55) { c.fillStyle = h > 0.8 ? '#ff9a2e' : '#ffd36e'; c.fillRect(x + 10, w.top - 6, 6, 3); c.fillRect(x + 24, w.bot + 3, 6, 3); }
        if (!w.tunnel && h > 0.7) { c.fillStyle = '#c9e3ff'; c.fillRect(x + 14, w.top - 5, 3, 3); c.fillRect(x + 28, w.bot + 3, 3, 3); }
      }
      // lit edge
      c.fillStyle = w.tunnel ? '#ff8a2e' : '#a9afba'; c.globalAlpha = 0.8; c.fillRect(x, w.top - 3, 41, 3); c.fillRect(x, w.bot, 41, 3); c.globalAlpha = 1;
    }
    for (i = 0; i < this.girders.length; i++) {
      var g = this.girders[i];
      c.fillStyle = '#3c3a44'; c.fillRect(g.x, g.y0, g.w, g.y1 - g.y0);
      c.strokeStyle = '#6b6878'; c.lineWidth = 2; c.beginPath();
      for (var y = g.y0; y < g.y1 - 20; y += 22) { c.moveTo(g.x, y); c.lineTo(g.x + g.w, y + 22); c.moveTo(g.x + g.w, y); c.lineTo(g.x, y + 22); }
      c.stroke(); c.strokeStyle = '#ff8a2e'; c.strokeRect(g.x, g.y0, g.w, g.y1 - g.y0);
    }
    if (this.port) {
      var p = this.port;
      c.fillStyle = '#2a2d33'; c.fillRect(p.x - 10, p.y - 6, p.w + 20, 10);
      c.fillStyle = '#000'; c.beginPath(); c.ellipse(p.x + p.w / 2, p.y + 2, p.w / 2 - 6, 8, 0, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(255,60,60,' + (0.5 + 0.5 * Math.sin(this.t * 8)) + ')'; c.lineWidth = 3;
      c.beginPath(); c.ellipse(p.x + p.w / 2, p.y + 2, p.w / 2 + 6, 14, 0, 0, TAU); c.stroke();
      c.fillStyle = '#ff5050'; c.font = '900 13px system-ui'; c.textAlign = 'center'; c.fillText('EXHAUST PORT', p.x + p.w / 2, p.y - 18);
    }
  };

  F.drawHUD = function () {
    var c = this.ctx, d = this.dpr, W_ = this.cw, H_ = this.ch, i;
    c.setTransform(d, 0, 0, d, 0, 0);
    var safeT = this.opts.safeTop || 0, top = 8 + safeT, left = 12, right = W_ - (this.opts.hudRightReserve === undefined ? 120 : this.opts.hudRightReserve);
    c.textBaseline = 'middle'; c.textAlign = 'left';
    // pilot + hull
    c.font = '900 13px "Trebuchet MS",system-ui'; c.fillStyle = this.pilot.color; c.shadowColor = '#000'; c.shadowBlur = 4;
    c.fillText(this.pilot.call, left, top + 9);
    for (i = 0; i < this.maxHp; i++) { this.hpPip(c, left + 8 + i * 20, top + 30, i < this.hp); }
    // score
    c.textAlign = 'right'; c.fillStyle = '#ffe66d'; c.font = '900 18px "Trebuchet MS",system-ui';
    c.fillText(String(this.score).padStart(6, '0'), right, top + 10);
    c.font = '700 11px system-ui'; c.fillStyle = '#ffffffbb';
    var label = this.boss ? (this.boss.type === 'vader' ? 'DARTH VADER' : 'MAIN REACTOR') : this.def.name;
    c.fillText(label, right, top + 30);
    c.shadowBlur = 0;
    c.font = '900 18px "Trebuchet MS",system-ui';
    var sw = c.measureText(String(this.score).padStart(6, '0')).width;
    c.font = '900 13px "Trebuchet MS",system-ui';
    this.hudRects = { pilot: [left, top, c.measureText(this.pilot.call).width, 18], hull: [left - 4, top + 22, this.maxHp * 20, 18],
      score: [right - sw, top, sw, 20] };
    // progress / boss bar
    var bx = left + 112, bw = Math.max(40, right - bx - 4), by = top + 42;
    if (bw > 40) {
      c.fillStyle = '#ffffff22'; c.fillRect(bx, by, bw, 6);
      if (this.boss) { c.fillStyle = '#ff3b30'; c.fillRect(bx, by, bw * this.boss.hp / this.boss.maxHp, 6); }
      else { var tot = this.def.length || 60; c.fillStyle = '#00e5ff'; c.fillRect(bx, by, bw * clamp(this.tl / tot, 0, 1), 6); }
      this.hudRects.bar = [bx, by, bw, 6];
    }
    // power-up timers
    var py = top + 56;
    c.font = '800 11px system-ui'; c.textAlign = 'left';
    if (this.spread > 0) { c.fillStyle = '#ff7a3d'; c.fillText('SALSA SPREAD ' + Math.ceil(this.spread), left, py); py += 14; }
    if (this.star > 0) { c.fillStyle = '#ffe66d'; c.fillText('STAR POWER ' + Math.ceil(this.star), left, py); py += 14; }
    // radio chatter (centered, under the HUD)
    var ry = top + 72 + (py - top - 56);
    for (i = 0; i < this.radio.length; i++) {
      var r = this.radio[i], bwid = Math.min(W_ - 24, 560), x0 = (W_ - bwid) / 2;
      c.font = '700 14px "Trebuchet MS",system-ui';
      var lines = this.wrap(c, r.text, bwid - 20), hh = 22 + lines.length * 18;
      c.globalAlpha = Math.min(1, r.t * 3);
      c.fillStyle = 'rgba(8,4,24,.78)'; this.rr(c, x0, ry, bwid, hh, 10); c.fill();
      c.strokeStyle = '#00e5ff88'; c.lineWidth = 1.5; c.stroke();
      c.fillStyle = '#00e5ff'; c.font = '900 11px system-ui'; c.textAlign = 'left'; c.fillText(r.who, x0 + 10, ry + 11);
      c.fillStyle = '#fff'; c.font = '700 14px "Trebuchet MS",system-ui';
      for (var l = 0; l < lines.length; l++) c.fillText(lines[l], x0 + 10, ry + 29 + l * 18);
      c.globalAlpha = 1; ry += hh + 6;
    }
    // title card
    if (this.title || this.state !== 'play') {
      var big, sub;
      if (this.state === 'won') { big = 'MISSION COMPLETE'; sub = 'SCORE ' + this.score; }
      else if (this.state === 'dead') { big = 'SHOT DOWN'; sub = this.opts.standalone ? 'TAP TO RETRY' : ''; }
      else { big = this.title.a; sub = this.title.b; }
      var fs = Math.min(54, W_ / (big.length * 0.62));
      c.textAlign = 'center'; c.font = '900 ' + fs + 'px "Trebuchet MS",Impact,sans-serif';
      var gy = H_ * 0.42, gg = c.createLinearGradient(0, gy - fs / 2, 0, gy + fs / 2);
      gg.addColorStop(0, '#fff'); gg.addColorStop(0.35, '#ffe66d'); gg.addColorStop(0.6, '#ff4fd8'); gg.addColorStop(1, '#6a2cff');
      c.shadowColor = '#ff4fd8'; c.shadowBlur = 14; c.fillStyle = gg; c.fillText(big, W_ / 2, gy); c.shadowBlur = 0;
      if (sub) { c.font = '800 15px "Trebuchet MS",system-ui'; c.fillStyle = '#fff'; var sl = this.wrap(c, sub, W_ - 40); for (i = 0; i < sl.length; i++) c.fillText(sl[i], W_ / 2, gy + fs * 0.7 + i * 20); }
    }
    // first-seconds hint (no D-pad: swipe + fire)
    if (this.t < 5 && this.state === 'play') {
      c.globalAlpha = Math.min(1, (5 - this.t)); c.textAlign = 'center'; c.font = '800 13px system-ui'; c.fillStyle = '#ffffffcc';
      c.fillText('SWIPE ANYWHERE TO FLY · HOLD FIRE TO SHOOT', W_ / 2, H_ - 150 > H_ * 0.6 ? H_ - 150 : H_ * 0.62); c.globalAlpha = 1;
    }
  };
  F.hpPip = function (c, x, y, on) {
    c.fillStyle = on ? '#ff3b6b' : '#ffffff33';
    c.beginPath(); c.moveTo(x, y + 7); c.bezierCurveTo(x - 11, y - 1, x - 6, y - 10, x, y - 4); c.bezierCurveTo(x + 6, y - 10, x + 11, y - 1, x, y + 7); c.fill();
  };
  F.rr = function (c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };
  F.wrap = function (c, text, maxW) {
    var words = String(text).split(' '), lines = [], cur = '';
    for (var i = 0; i < words.length; i++) { var t = cur ? cur + ' ' + words[i] : words[i]; if (c.measureText(t).width > maxW && cur) { lines.push(cur); cur = words[i]; } else cur = t; }
    if (cur) lines.push(cur); return lines;
  };

  F.debug = function () {
    return { state: this.state, phase: this.phase, tl: this.tl, hp: this.hp, score: this.score, kills: this.kills, shots: this.shots,
      ship: { x: this.ship.x, y: this.ship.y }, bullets: this.bul.length, enemies: this.en.length, boss: this.boss ? { type: this.boss.type, hp: this.boss.hp } : null,
      view: { vw: this.vw, vh: this.vh, scale: this.scale, cw: this.cw, ch: this.ch }, fireLabel: this.input.btn.textContent, hud: this.hudRects, radio: this.radio.map(function (r) { return r.who + ': ' + r.text; }) };
  };
  F.destroy = function () { this.input.destroy(); this.dead_ = true; };

  // ---------- public API ----------
  var levels = {};
  W.TacoFlight = {
    version: 1,
    levels: levels,
    TUNE: DEFAULT_TUNE,
    PILOTS: PILOTS,
    SPRITE_FILES: SPRITE_FILES,
    // register a level def (the JS files do this; the lead can also pass the parsed flight/<id>.json)
    register: function (def) {
      levels[def.id] = def;
      (def.aliases || []).forEach(function (a) { levels[a] = def; });
      return def;
    },
    load: function (json) { return this.register(typeof json === 'string' ? JSON.parse(json) : json); },
    has: function (id) { return !!levels[id]; },
    // id = 'xw-1' | 'falcon-1' (aliases 'xwing' | 'falcon'), or a def object
    create: function (id, opts) { var def = typeof id === 'object' ? id : levels[id]; if (!def) throw new Error('TacoFlight: unknown level ' + id); return new Flight(def, opts); },
    // Convenience loop: owns requestAnimationFrame until stop(). Engine can instead call lvl.update(dt, inp) + lvl.draw() itself.
    run: function (id, opts) {
      opts = opts || {};
      var lvl = this.create(id, opts), last = 0, raf = 0, stopped = false;
      function frame(ts) {
        if (stopped) return;
        var dt = last ? (ts - last) / 1000 : 0; last = ts;
        lvl.update(dt, opts.getInput ? opts.getInput() : null); lvl.draw();
        raf = requestAnimationFrame(frame);
      }
      raf = requestAnimationFrame(frame);
      return { level: lvl, stop: function () { stopped = true; cancelAnimationFrame(raf); lvl.destroy(); } };
    }
  };
})(window);
