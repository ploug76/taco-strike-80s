/* Taco Strike: Totally 80s -- physics module (New Bot, physics only)
 * --------------------------------------------------------------------------
 * Self-contained, no dependencies. Works three ways:
 *   1. <script src="physics/physics.js">      -> window.TacoPhysics
 *   2. import TacoPhysics from './physics/physics.mjs'   (ES module wrapper)
 *   3. const TacoPhysics = require('./physics.js')        (node tests)
 *
 * Matches the LEAD interface in TEAM.md:
 *   TUNE, stepPlayer(p, inp, dt, T), stepBike(b, inp, dt, T),
 *   ewokBob(t, speed), sarlacc(p, pit, dt), jabbaHit(boss, shot)
 * plus extras: stomp(), hurt(), jabbaStep(), jabbaContact(), bikeCrash(),
 * ewokGait(), stepWalker(), buildWorld() (AABB tile/platform collision),
 * fx (hitstop + screen shake), createLoop() (fixed 120 Hz accumulator),
 * createTouchInput() (swipe/hold gestures; NO on-screen D-pad, ever).
 *
 * Coordinates follow levels/SCHEMA.md: pixels, x right, y DOWN, view 540 tall.
 * Bodies are top-left AABBs: {x, y, w, h}. Velocities in px/s.
 *
 * Timestep: every step* function splits the frame dt into equal substeps no
 * longer than 1/TUNE.substepHz (120 Hz) and integrates gravity exactly
 * (velocity-Verlet), so a jump is the same height at 30, 60, 120 or 144 fps
 * and nothing is drawn a frame late. If you prefer a strict fixed timestep
 * with interpolation, wrap your update in TacoPhysics.createLoop().
 */
(function (root, factory) {
  'use strict';
  var P = factory();
  if (typeof module === 'object' && module && module.exports) module.exports = P;
  if (root) root.TacoPhysics = P;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this), function () {
  'use strict';

  /* =========================================================================
   * TUNE  (the ONE place to tweak feel; the lead's key names are kept as-is)
   * ========================================================================= */
  var TUNE = {
    // ---- timestep -----------------------------------------------------------
    substepHz: 120,        // physics substep rate. Higher = more exact, more CPU.
    maxFrameDt: 0.1,       // clamp huge frame gaps (tab switch) so nothing tunnels.

    // ---- taco: running (Mario/Sonic feel) -----------------------------------
    runAccel: 2600,        // px/s² ground accel up to runMax (0->330 in ~0.13 s).
    runMax: 330,           // top walking/running speed, px/s.
    sprintMax: 430,        // top speed after sprintTime of full-speed running.
    sprintTime: 1.0,       // seconds at full run (same dir, on ground) to unlock sprint.
    sprintAccel: 520,      // px/s² accel from runMax up to sprintMax (a gradual Sonic build).
    friction: 2800,        // px/s² ground decel when no input (stops in ~0.12 s, ~20 px slide).
    turnAccel: 4400,       // px/s² when pushing against your motion on ground (snappy skid).
    airAccel: 1700,        // px/s² air control.
    airFriction: 500,      // px/s² air decel with no input (keeps jump arcs readable).
    analogDeadzone: 0.15,  // if inp.ax (-1..1) is given, values below this are ignored.

    // ---- taco: jumping ------------------------------------------------------
    gravity: 2300,         // px/s² while rising.
    fallGravityMult: 1.55, // gravity x this while falling (snappy, not floaty).
    jumpV: 860,            // takeoff speed. Full-hold jump apex ~165 px (schema: ~150, higher if held).
    runJumpBoost: 0.04,    // extra takeoff speed per px/s of run speed (faster = a bit higher).
    jumpCut: 0.5,          // vy multiplier when JUMP is released while rising (tap = ~78 px hop).
    jumpMinHold: 0.06,     // the cut is never applied before this many seconds (tap still feels like a jump).
    apexHangV: 90,         // |vy| below this near the apex, while JUMP is held, gets apexHangMult gravity.
    apexHangMult: 0.6,     // little Mario hang at the top of a held jump.
    coyote: 0.1,           // s after running off a ledge you can still jump.
    jumpBuffer: 0.12,      // s a jump press is remembered before landing.
    maxFall: 1000,         // terminal fall speed px/s.

    // ---- taco: stomp / ground pound -----------------------------------------
    stompBounce: 560,      // bounce speed off an enemy head (~68 px).
    stompBounceHeld: 860,  // bounce if JUMP is held at the stomp (~full jump, for combos).
    stompTolerance: 12,    // px: how far below an enemy's top your feet may be (last frame) and still stomp.
    stompHitstop: 0.05,    // s freeze on a stomp (the "crunch").
    stompDamage: 1,        // hp removed from a normal enemy per stomp.
    groundPound: true,     // fresh swipe DOWN (inp.D rising edge) in the air = ground pound. false to disable.
    poundWindup: 0.12,     // s mid-air hang before the slam.
    poundSpeed: 1250,      // slam fall speed.
    poundDamage: 2,        // damage when a pound lands on an enemy.
    poundRadius: 80,       // px shockwave radius reported in the 'pound' event (engine stuns/kills in it).
    poundShake: 0.3,       // trauma added on pound landing.
    poundHitstop: 0.04,
    poundLandLock: 0.1,    // s of no run control after a pound lands (weighty).

    // ---- taco: getting hurt -------------------------------------------------
    hurtKnockX: 280, hurtKnockY: 420, // knockback impulse from enemies/hazards.
    hurtIframes: 1.2,      // s invulnerable after a hit (engine should blink the sprite).
    hurtLock: 0.28,        // s with no player control after a hit.
    hurtHitstop: 0.06, hurtShake: 0.25,

    // ---- springs / clouds / ladders / one-way drop --------------------------
    springV: 1150,         // spring launch speed (~290 px).
    cloudBounce: 280,      // a 'cloud' platform bounces you back up at this speed...
    cloudMinImpact: 380,   // ...only if you land faster than this (otherwise you just stand).
    climbSpeed: 170, climbSide: 90, // ladder speeds.
    dropThroughTime: 0.22, // s one-way platforms are ignored after a swipe down while standing on one.
    crumbleDelay: 0.6, crumbleRespawn: 3.0,

    // ---- Endor speeder-bike FLIGHT -----------------------------------------
    bikeSpeed: 420,        // auto-fly speed px/s (level "speed" overrides via T.bikeSpeed / b.speed).
    bikeThrottle: 90,      // R/L (swipe right/left) adds/removes this much speed.
    bikeSpeedAccel: 520,   // px/s² toward the throttle speed.
    bikeSteerAccel: 3200,  // px/s² vertical accel toward the finger's target speed (snappy).
    bikeMaxVy: 430,        // max climb/dive speed. Trees need 120 px gaps: ~0.3 s to cross one.
    bikeDrag: 10,          // 1/s exponential vertical damping when the finger is still/released (glides to a stop, holds altitude).
    bikeReverseBoost: 1.7, // accel multiplier when reversing direction (instant-feeling dodge).
    bikeSteerDeadzone: 0.08, // |inp.steer| below this = no steer (thumb jitter).
    bikeSteerCurve: 1.35,  // response curve exponent: small drags = fine control, big drags = full speed.
    bikeTop: 40,           // highest the bike's top may go (px from top of view).
    bikeBottom: 452,       // lowest the bike's BOTTOM may go (just above the y=460 forest floor).
    bikeCushion: 36,       // px soft zone near the limits where vertical speed is eased off.
    bikeH: 34,             // bike height if b.h is missing.
    bikeTiltMax: 0.32,     // rad (~18°). Tilt < 0 = nose UP (climbing). Renderer: ctx.rotate(b.tilt).
    bikeTiltRate: 10,      // 1/s how fast tilt follows climb speed.
    bikeBobAmp: 2.5,       // px hover bob (render-only, b.bob; not used for collisions).
    bikeBobHz: 1.8,
    bikeBurstV: 520,       // JUMP in bike mode = quick upward burst (emergency dodge).
    bikeBurstCooldown: 0.5,
    bikeCrashSpeed: 160,   // forward speed right after hitting a tree/log (recovers at bikeSpeedAccel).
    bikeCrashBounce: 260,  // vertical bounce away from what you hit.
    bikeIframes: 1.2, bikeCrashShake: 0.45, bikeCrashHitstop: 0.07,
    bikeRamImpulse: 420,   // vertical shove given to a scout trooper bike you sideswipe.

    // ---- Ewok waddle ----------------------------------------------------------
    ewokSpeed: 55,         // walk speed px/s (short legs!).
    ewokStride: 13,        // px travelled per footstep. steps/s = speed / stride (~4.2).
    ewokBob: 4,            // px the body lifts mid-step (dy ranges -ewokBob..0).
    ewokRot: 0.14,         // rad (~8°) side-to-side waddle lean, alternates each step.
    ewokSway: 1.6,         // px side sway (dx) in step with the lean.
    ewokSquash: 0.08,      // squash at foot-plant: sy = 1-squash, sx = 1+0.7*squash.
    ewokIdleHz: 0.7, ewokIdleAmp: 0.02, // breathing when standing still.
    ewokBlendRate: 8,      // 1/s how fast the waddle fades in/out when starting/stopping (ewokGait).

    // ---- Sarlacc pit ----------------------------------------------------------
    sarlaccRadius: 170,    // px from the mouth centre where the pull starts (at least pit.w/2 + 24).
    sarlaccPull: 900,      // px/s² pull accel (fallback used only if the engine runs its own stepPlayer).
    sarlaccDrift: 300,     // px/s max sand drift toward the mouth (with our stepPlayer). < runMax, so running out always works.
    sarlaccExp: 2,         // pull = (1 - dist/radius)^exp: gentle at the rim, strong near the mouth.
    sarlaccAirMult: 0.4,   // pull while airborne (jumping is the best escape).
    sarlaccCapture: 24,    // px from the centre where you get grabbed (if feet are at the mouth).
    sarlaccCaptureDepth: 14, // feet within this many px above pit.y count as "at the mouth".
    sarlaccReachY: 220,    // no pull if your feet are more than this far above pit.y.
    sarlaccSinkV: 140,     // px/s you sink once captured (engine plays the gulp + death).

    // ---- Jabba boss -----------------------------------------------------------
    jabbaHp: 30,           // default hp (level "bossHp" overrides).
    jabbaDmgShot: 1, jabbaDmgFire: 2, jabbaDmgStomp: 3, jabbaDmgPound: 5,
    jabbaFlash: 0.12,      // s white hit-flash.
    jabbaIframesShot: 0.08, // s boss ignores hits after a topping hit (lets rapid fire count, not cheese).
    jabbaIframesStomp: 0.7, // s after a stomp/pound (no double-stomps).
    jabbaRecoil: 240,      // px/s recoil kick (he's heavy: moves ~15-30 px and slides back).
    jabbaRecoilOmega: 9, jabbaRecoilZeta: 0.4, jabbaRecoilMax: 34,
    jabbaWobbleKick: 1.0,  // wobble impulse (jelly belly). Renderer: sx/sy/rot from boss fields.
    jabbaWobbleOmega: 13, jabbaWobbleZeta: 0.18, jabbaWobbleSquash: 0.08, jabbaWobbleRot: 0.05,
    jabbaHeadZone: 0.35,   // top fraction of the boss box that counts as a stompable head.
    jabbaStompBounce: 900, // big bounce off his head.
    jabbaKnockX: 520, jabbaKnockY: 480, // knockback on the taco when Jabba hits it.
    jabbaPlayerIframes: 1.4, jabbaHurtLock: 0.35,
    jabbaShakeHit: 0.3, jabbaShakeStomp: 0.5, jabbaShakeHurt: 0.45, jabbaShakeDie: 1.0,
    jabbaHitstopHit: 0.03, jabbaHitstopStomp: 0.08, jabbaHitstopHurt: 0.09, jabbaHitstopDie: 0.25,

    // ---- screen shake + hitstop (TacoPhysics.fx) -------------------------------
    shakeMax: 16,          // px max camera offset at trauma 1.
    shakeRot: 0.035,       // rad max camera roll at trauma 1.
    shakeDecay: 1.8,       // trauma lost per second.
    shakeFreq: 22,         // Hz-ish jitter speed.
    hitstopMax: 0.15,      // longest freeze allowed (stacked hits don't lock the game).

    // ---- generic enemies (stepWalker) ----------------------------------------
    walkerSpeed: 70, walkerTurnAtEdges: true,

    // ---- touch gestures (createTouchInput) ----------------------------------
    touchDeadzone: 14,     // px horizontal drag before you start moving.
    touchFullDrag: 56,     // px drag for full analog speed (inp.ax = ±1).
    touchSwipeUpPx: 34,    // px of fast upward finger travel = jump.
    touchSwipeMs: 220,     // ...within this many ms.
    touchVertHold: 30,     // px held below/above the anchor = D/U (ladders, drop-through, pound).
    touchSteerFull: 70     // bike: px finger offset from the anchor for full climb/dive (inp.steer = ±1).
  };
  var CONSTANTS = TUNE; // alias

  /* ========================================================================= */
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function sign(v) { return v > 0 ? 1 : (v < 0 ? -1 : 0); }
  function approach(v, t, d) { return v < t ? Math.min(v + d, t) : Math.max(v - d, t); }
  function overlap(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
  function num(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : d; }
  function substeps(dt) {
    dt = clamp(num(dt, 0), 0, TUNE.maxFrameDt);
    var n = Math.max(1, Math.ceil(dt * TUNE.substepHz - 1e-9));
    return { n: n, h: dt / n };
  }
  function ev(o, e) { if (!o.events) o.events = []; o.events.push(e); }

  /* =========================================================================
   * FX: hitstop + trauma-based screen shake (shared by every hit helper)
   * Engine each frame:  var f = TacoPhysics.fx.update(dt);
   *   if (!f.frozen) { ...run physics/AI... }   ctx.translate(f.x, f.y); ctx.rotate(f.rot)
   * ========================================================================= */
  var fx = {
    hitstop: 0, trauma: 0, t: 0,
    addHitstop: function (s) { this.hitstop = Math.min(TUNE.hitstopMax, Math.max(this.hitstop, s || 0)); },
    addTrauma: function (a) { this.trauma = Math.min(1, this.trauma + (a || 0)); },
    reset: function () { this.hitstop = 0; this.trauma = 0; },
    update: function (dt) {
      dt = clamp(num(dt, 0), 0, 0.25);
      this.t += dt;
      var frozen = this.hitstop > 0;
      this.hitstop = Math.max(0, this.hitstop - dt);
      this.trauma = Math.max(0, this.trauma - TUNE.shakeDecay * dt);
      var s = this.trauma * this.trauma, k = this.t * TUNE.shakeFreq;
      return {
        frozen: frozen,
        x: TUNE.shakeMax * s * (Math.sin(k * 1.0) * 0.6 + Math.sin(k * 2.31 + 1.3) * 0.4),
        y: TUNE.shakeMax * s * (Math.sin(k * 1.17 + 2.1) * 0.6 + Math.sin(k * 2.73 + 0.4) * 0.4),
        rot: TUNE.shakeRot * s * Math.sin(k * 0.83 + 4.2)
      };
    }
  };

  /* =========================================================================
   * Fixed-timestep loop (optional). step(h) is called at exactly hz;
   * returns alpha (0..1) for interpolating prev->current positions.
   * ========================================================================= */
  function createLoop(step, hz, maxSteps) {
    var h = 1 / (hz || 60), acc = 0, cap = maxSteps || 8;
    return {
      step: h,
      update: function (frameDt) {
        acc += clamp(num(frameDt, 0), 0, 0.25);
        var n = 0;
        while (acc >= h && n < cap) { step(h); acc -= h; n++; }
        if (n === cap) acc = 0; // spiral-of-death guard
        return acc / h;
      }
    };
  }

  /* =========================================================================
   * TACO PLAYER
   * p = {x,y,w,h,vx,vy,onGround,face,coyote,jbuf,runT}  (lead's shape; extra
   *     fields are added lazily: jumping, iframes, hurtLock, pound, events...)
   * inp = {L,R,U,D,jump,jumpPressed}  (+ optional ax -1..1 analog)
   * T  = engine object: T.collide(p) (or T.collideX/T.collideY) resolves tiles
   *      and sets p.onGround. TacoPhysics.buildWorld(level) returns such a T.
   * ========================================================================= */
  function initPlayer(p) {
    if (p._tp) return;
    p._tp = true;
    p.w = num(p.w, 40); p.h = num(p.h, 44);
    p.vx = num(p.vx, 0); p.vy = num(p.vy, 0);
    p.face = p.face || 1; p.coyote = num(p.coyote, 0); p.jbuf = num(p.jbuf, 0); p.runT = num(p.runT, 0);
    p.onGround = !!p.onGround;
    p.jumping = false; p.inJump = false; p.jumpT = 0; p.cutDone = false;
    p.iframes = 0; p.hurtLock = 0; p.pound = 0; p.poundT = 0; p.dropT = 0;
    p.stompCombo = 0; p.pullVx = 0; p.captured = null; p.climbing = false;
    p.events = [];
  }

  function stepPlayer(p, inp, dt, T) {
    T = T || {}; inp = inp || {};
    initPlayer(p);
    p._tacoStep = true;
    p.events.length = 0;
    p._frameX0 = p.x; p._frameY0 = p.y;
    if (inp.jumpPressed) p.jbuf = TUNE.jumpBuffer;
    var dNow = !!inp.D;
    p._dEdge = p._dEdge || (dNow && !p._prevD);
    p._prevD = dNow;
    var s = substeps(dt);
    for (var i = 0; i < s.n; i++) playerTick(p, inp, s.h, T);
    p.pullVx = 0; // sarlacc() re-applies it every frame while you're in range
  }

  function playerTick(p, inp, h, T) {
    var K = TUNE;
    p.iframes = Math.max(0, p.iframes - h);
    p.hurtLock = Math.max(0, p.hurtLock - h);
    p.dropT = Math.max(0, p.dropT - h);
    var wasGround = p.onGround;

    // --- captured by the Sarlacc: no control, slide in and sink ---------------
    if (p.captured) {
      var cx = num(p._capX, p.x + p.w / 2);
      p.vx = (cx - (p.x + p.w / 2)) * 8;
      p.vy = K.sarlaccSinkV;
      p.x += p.vx * h; p.y += p.vy * h; p.onGround = false;
      return;
    }

    // --- input direction ---------------------------------------------------
    var dir = (inp.R ? 1 : 0) - (inp.L ? 1 : 0);
    var mag = 1;
    if (typeof inp.ax === 'number' && Math.abs(inp.ax) > K.analogDeadzone) { dir = sign(inp.ax); mag = Math.min(1, Math.abs(inp.ax)); }
    if (p.hurtLock > 0 || p.pound) dir = 0;
    if (dir) p.face = dir;

    // --- ladders (T.ladderAt(p) -> ladder rect or null; engine may set p.onLadder) ---
    var lad = T.ladderAt ? T.ladderAt(p) : (p.onLadder || null);
    if (lad && (inp.U || (inp.D && !p.onGround)) && !p.pound) p.climbing = true;
    if (!lad) p.climbing = false;
    if (p.climbing) {
      if (p.jbuf > 0) { p.climbing = false; }
      else {
        p.vx = dir * K.climbSide;
        p.vy = ((inp.D ? 1 : 0) - (inp.U ? 1 : 0)) * K.climbSpeed;
        moveAndCollide(p, p.vx * h, p.vy * h, T);
        if (p.onGround && inp.D) p.climbing = false;
        p.coyote = K.coyote; p.jumping = false; p.inJump = false;
        return;
      }
    }

    // --- sprint timer ------------------------------------------------------
    if (p.onGround) {
      if (dir && p.vx * dir >= K.runMax * 0.9 * mag) p.runT += h;
      else if (!dir || p.vx * dir < 0) p.runT = 0;
    }
    var top = (p.runT >= K.sprintTime ? K.sprintMax : K.runMax) * mag * num(p.speedMult, 1);
    var target = dir * top;
    if (p.pullVx) target += p.pullVx * (p.onGround ? 1 : K.sarlaccAirMult);

    // --- horizontal accel ------------------------------------------------------
    var a;
    if (p.onGround) {
      if (!dir) a = K.friction;
      else if (p.vx * dir < 0) a = K.turnAccel;
      else if (Math.abs(p.vx) < K.runMax) a = K.runAccel;
      else if (Math.abs(p.vx) < Math.abs(target)) a = K.sprintAccel;
      else a = K.friction * 0.5; // easing down from a sprint / out of a pull
    } else {
      if (!dir) a = K.airFriction;
      else if (p.vx * dir < 0) a = K.airAccel * 1.2;
      else if (Math.abs(p.vx) > Math.abs(target)) a = K.airFriction * 0.25; // keep sprint momentum in air
      else a = K.airAccel;
    }
    if (p.hurtLock > 0) a = K.airFriction * 0.5; // let knockback play out
    p.vx = approach(p.vx, target, a * h);

    // --- jump (coyote + buffer) ----------------------------------------------
    if (p.onGround) { p.coyote = K.coyote; p.stompCombo = 0; }
    if (p.jbuf > 0 && (p.onGround || p.coyote > 0) && !p.pound && p.hurtLock <= 0) {
      if (inp.D && p.onGround && p._onOneway && K.dropThroughTime > 0) {
        // swipe down + jump on a one-way platform = drop through
        p.dropT = K.dropThroughTime; p.jbuf = 0; p.onGround = false;
      } else {
        p.vy = -(K.jumpV + Math.abs(p.vx) * K.runJumpBoost);
        p.onGround = false; p.coyote = 0; p.jbuf = 0;
        p.jumping = true; p.inJump = true; p.jumpT = 0; p.cutDone = false;
        ev(p, { type: 'jump' });
      }
    }
    if (!p.onGround) p.coyote = Math.max(0, p.coyote - h);
    p.jbuf = Math.max(0, p.jbuf - h);

    // drop-through: swipe down while standing on a one-way
    if (p._dEdge && p.onGround && p._onOneway) { p.dropT = K.dropThroughTime; p.onGround = false; }

    // --- variable height ---------------------------------------------------------
    if (p.jumping) {
      p.jumpT += h;
      if (!inp.jump && !p.cutDone && p.vy < 0 && p.jumpT >= K.jumpMinHold) { p.vy *= K.jumpCut; p.cutDone = true; }
      if (p.vy >= 0) p.jumping = false;
    }

    // --- ground pound -------------------------------------------------------------
    // pound needs a STRAIGHT-down swipe (no L/R), so diagonal thumb drags never trigger it
    if (K.groundPound && p._dEdge && !inp.L && !inp.R && !p.onGround && !p.pound && !p.climbing && p.hurtLock <= 0) {
      p.pound = 1; p.poundT = K.poundWindup; p.jumping = false;
      ev(p, { type: 'pound_start' });
    }
    p._dEdge = false;

    // --- gravity ---------------------------------------------------------------------
    var g = K.gravity, maxFall = K.maxFall;
    if (p.pound === 1) {
      g = 0; p.vx = 0; p.vy = 0; p.poundT -= h;
      if (p.poundT <= 0) { p.pound = 2; p.vy = K.poundSpeed; }
    } else if (p.pound === 2) {
      maxFall = K.poundSpeed; p.vy = K.poundSpeed; p.vx = 0;
    } else if (p.inJump && inp.jump && Math.abs(p.vy) < K.apexHangV) {
      g *= K.apexHangMult;
    } else if (p.vy > 0) {
      g *= K.fallGravityMult;
    }
    var vy0 = p.vy, vy1 = Math.min(vy0 + g * h, maxFall);
    var dy = (vy0 + vy1) * 0.5 * h; // exact for constant gravity (frame-rate independent)
    p.vy = vy1;
    p._impactV = vy1;

    moveAndCollide(p, p.vx * h, dy, T);

    // --- landing ---------------------------------------------------------------------------
    if (p.onGround && !wasGround) {
      ev(p, { type: 'land', impact: p._impactV });
      if (p.pound === 2) {
        ev(p, { type: 'pound', x: p.x + p.w / 2, y: p.y + p.h, radius: K.poundRadius });
        fx.addTrauma(K.poundShake); fx.addHitstop(K.poundHitstop);
        p.hurtLock = Math.max(p.hurtLock, K.poundLandLock);
      }
      p.pound = 0; p.jumping = false; p.inJump = false;
    }
  }

  function moveAndCollide(p, dx, dy, T) {
    p.prevX = p.x; p.prevY = p.y;
    if (T.collideX && T.collideY) {
      p.x += dx; T.collideX(p);
      p.y += dy; T.collideY(p);
    } else {
      p.x += dx; p.y += dy;
      if (typeof T.collide === 'function') T.collide(p);
    }
  }

  /* hurt(p, fromX, opts): knockback away from fromX. opts = {kx, ky, iframes, lock, shake, hitstop}.
   * Returns false if the taco is still invulnerable (no damage should be taken). */
  function hurt(p, fromX, o) {
    initPlayer(p); o = o || {};
    if (p.iframes > 0 || p.captured) return false;
    var dir = sign((p.x + p.w / 2) - num(fromX, p.x + p.w / 2 + p.face)) || -p.face;
    p.vx = dir * num(o.kx, TUNE.hurtKnockX);
    p.vy = -num(o.ky, TUNE.hurtKnockY);
    p.onGround = false; p.pound = 0; p.jumping = false; p.inJump = false; p.climbing = false; p.runT = 0;
    p.iframes = num(o.iframes, TUNE.hurtIframes);
    p.hurtLock = num(o.lock, TUNE.hurtLock);
    fx.addTrauma(num(o.shake, TUNE.hurtShake)); fx.addHitstop(num(o.hitstop, TUNE.hurtHitstop));
    ev(p, { type: 'hurt', dir: dir });
    return true;
  }

  /* stomp(p, e, inp): resolve taco-vs-enemy contact. Call when they overlap (it checks).
   * e = {x,y,w,h, hp?, stompable? (false = hiss_tank etc), harmless? (allies), dead?}
   * Returns null | {type:'stomp', damage, killed, combo, bounce, hitstop}
   *              | {type:'hurt', dir}  (taco took a hit: engine subtracts health)
   *              | {type:'star', killed:true}  (if p.star > 0: invincible kill)
   */
  function stomp(p, e, inp) {
    initPlayer(p); inp = inp || {};
    if (!e || e.dead || e.harmless || p.captured || !overlap(p, e)) return null;
    if (p.star > 0) { e.dead = true; e.hp = 0; ev(p, { type: 'stomp', star: true }); return { type: 'star', killed: true }; }
    var prevBottom = num(p._frameY0, p.prevY !== undefined ? p.prevY : p.y) + p.h;
    var tol = TUNE.stompTolerance + Math.max(0, num(e.vy, 0)) / 60;
    var fromAbove = p.vy > 0 && (prevBottom <= e.y + tol || (p.y + p.h / 2) < e.y);
    if (fromAbove && e.stompable !== false) {
      var dmg = p.pound === 2 ? TUNE.poundDamage : TUNE.stompDamage;
      e.hp = num(e.hp, 1) - dmg;
      var killed = e.hp <= 0;
      if (killed) { e.dead = true; e.squash = 1; e.vx = 0; } else { e.flash = 0.12; }
      p.stompCombo = (p.stompCombo || 0) + 1;
      var bounce = 0;
      if (p.pound === 2 && killed) {
        // a pound plows straight through and keeps falling
      } else {
        bounce = inp.jump ? TUNE.stompBounceHeld : TUNE.stompBounce;
        p.y = e.y - p.h; p.vy = -bounce; p.onGround = false; p.pound = 0;
        p.jumping = false; p.inJump = !!inp.jump; p.cutDone = true; p.coyote = 0;
      }
      fx.addHitstop(TUNE.stompHitstop);
      var r = { type: 'stomp', damage: dmg, killed: killed, combo: p.stompCombo, bounce: bounce, hitstop: TUNE.stompHitstop };
      ev(p, r);
      return r;
    }
    if (p.iframes > 0) return null;
    hurt(p, e.x + e.w / 2);
    return { type: 'hurt', dir: sign(p.vx) };
  }

  /* spring(p): launch from a bounce pad. */
  function spring(p, v) {
    initPlayer(p);
    p.vy = -num(v, TUNE.springV); p.onGround = false; p.pound = 0;
    p.jumping = false; p.inJump = false; p.cutDone = true; p.coyote = 0;
    ev(p, { type: 'spring' });
  }

  /* =========================================================================
   * SARLACC  sarlacc(p, pit, dt) -> null | 'pull' | 'captured'
   * pit = {x, w, y}: x = left edge of the mouth, w = mouth width, y = sand surface.
   * With our stepPlayer: shifts the run target toward the mouth (sand drift),
   *   strength (1 - d/R)^2, so running away always works but is slow near the
   *   mouth, and jumping cuts the pull to 40%.
   * With the engine's own stepPlayer: adds sarlaccPull accel to p.vx instead.
   * p.sarlaccStrength (0..1) is set for tentacle animation; p.captured = 'sarlacc'
   * when grabbed (engine: play 'sarlacc' SFX, then lose a life).
   * ========================================================================= */
  function sarlacc(p, pit, dt) {
    if (!p || !pit) return null;
    if (p.captured) return 'captured';
    var K = TUNE;
    var w = num(pit.w, 96), cx = num(pit.x, 0) + w / 2, surf = num(pit.y, 460);
    var R = Math.max(K.sarlaccRadius, w / 2 + 24);
    var pcx = p.x + num(p.w, 40) / 2, feet = p.y + num(p.h, 44);
    var d = cx - pcx, ad = Math.abs(d);
    p.sarlaccStrength = 0;
    if (ad > R || feet < surf - K.sarlaccReachY) return null;
    var f = Math.pow(1 - ad / R, K.sarlaccExp);
    p.sarlaccStrength = f;
    if (ad <= K.sarlaccCapture && feet >= surf - K.sarlaccCaptureDepth) {
      p.captured = 'sarlacc'; p._capX = cx; p.vx = 0; p.vy = K.sarlaccSinkV;
      ev(p, { type: 'sarlacc' });
      return 'captured';
    }
    var dirn = sign(d) || 1;
    if (p._tacoStep) {
      p.pullVx = (p.pullVx || 0) + dirn * K.sarlaccDrift * f;
    } else {
      p.vx += dirn * K.sarlaccPull * f * (p.onGround ? 1 : K.sarlaccAirMult) * clamp(num(dt, 0), 0, TUNE.maxFrameDt);
      if (feet >= surf - 2 && ad < w / 2) p.vy = Math.max(p.vy, 0); // sand holds you down at the lip
    }
    return 'pull';
  }

  /* =========================================================================
   * SPEEDER BIKE FLIGHT  stepBike(b, inp, dt, T)
   * b = {x,y,vx,vy,tilt}  (+ h, speed optional). Mutates b; engine handles obstacles
   * (call bikeCrash(b, ob) on a hit, bikeRam(b, enemy) on a sideswipe).
   * inp.steer (-1..1, finger dy from the touch anchor; + = down) wins; else inp.U/inp.D.
   * Feel: velocity-target steering with fast accel, a reverse boost and an
   * analog response curve; when the finger is still or lifted the bike glides
   * to a stop and HOLDS altitude (no constant thumb pressure on a phone).
   * Render: b.tilt (rad, <0 nose up), b.bob (px, add to draw y), b.blink.
   * ========================================================================= */
  function stepBike(b, inp, dt, T) {
    T = T || {}; inp = inp || {};
    var K = TUNE;
    if (!b._tb) {
      b._tb = true; b.vx = num(b.vx, 0); b.vy = num(b.vy, 0); b.tilt = num(b.tilt, 0);
      b.t = 0; b.bob = 0; b.iframes = 0; b.burstCd = 0; b.events = [];
    }
    b.events.length = 0;
    var speed = num(T.bikeSpeed, num(b.speed, K.bikeSpeed));
    var bh = num(b.h, K.bikeH);
    var top = num(T.bikeTop, num(b.top, K.bikeTop));
    var bottom = num(T.bikeBottom, num(b.bottom, K.bikeBottom)) - bh;

    var s = 0;
    // engine passes inp.steer = {x, y}; a plain number (-1..1, + = down) also works
    var sy = (inp.steer && typeof inp.steer === 'object') ? num(inp.steer.y, 0) : num(inp.steer, 0);
    if (Math.abs(sy) > K.bikeSteerDeadzone) {
      var m = (Math.min(1, Math.abs(sy)) - K.bikeSteerDeadzone) / (1 - K.bikeSteerDeadzone);
      s = sign(sy) * Math.pow(m, K.bikeSteerCurve);
    } else {
      s = (inp.D ? 1 : 0) - (inp.U ? 1 : 0);
    }
    if (inp.jumpPressed && b.burstCd <= 0) {
      b.vy = Math.min(b.vy, -K.bikeBurstV); b.burstCd = K.bikeBurstCooldown; ev(b, { type: 'burst' });
    }
    var throttle = (inp.R ? 1 : 0) - (inp.L ? 1 : 0);
    if (typeof inp.ax === 'number' && Math.abs(inp.ax) > K.analogDeadzone) throttle = clamp(inp.ax, -1, 1);

    var st = substeps(dt);
    for (var i = 0; i < st.n; i++) {
      var h = st.h;
      b.iframes = Math.max(0, b.iframes - h); b.burstCd = Math.max(0, b.burstCd - h); b.t += h;
      b.vx = approach(b.vx, speed + throttle * K.bikeThrottle, K.bikeSpeedAccel * h);
      if (s !== 0) {
        var tv = s * K.bikeMaxVy;
        var acc = K.bikeSteerAccel * (tv * b.vy < 0 ? K.bikeReverseBoost : 1);
        b.vy = approach(b.vy, tv, acc * h);
      } else {
        b.vy *= Math.exp(-K.bikeDrag * h);
      }
      // soft cushion near the limits
      if (b.vy < 0 && b.y < top + K.bikeCushion) b.vy *= clamp((b.y - top) / K.bikeCushion, 0.15, 1);
      if (b.vy > 0 && b.y > bottom - K.bikeCushion) b.vy *= clamp((bottom - b.y) / K.bikeCushion, 0.15, 1);
      b.x += b.vx * h;
      b.y += b.vy * h;
      if (b.y < top) { b.y = top; if (b.vy < 0) b.vy = 0; }
      if (b.y > bottom) { b.y = bottom; if (b.vy > 0) b.vy = 0; }
      var tt = clamp(b.vy / K.bikeMaxVy, -1, 1) * K.bikeTiltMax;
      b.tilt += (tt - b.tilt) * (1 - Math.exp(-K.bikeTiltRate * h));
    }
    b.bob = Math.sin(b.t * Math.PI * 2 * K.bikeBobHz) * K.bikeBobAmp * (1 - 0.7 * Math.min(1, Math.abs(b.vy) / K.bikeMaxVy));
    b.blink = b.iframes > 0 && Math.floor(b.iframes * 16) % 2 === 0;
  }

  /* bikeCrash(b, ob): the bike hit a tree/log/branch/rock (engine detects overlap).
   * Returns false while invulnerable (no damage). Bounces you vertically away
   * from the obstacle's centre and drops speed to bikeCrashSpeed. */
  function bikeCrash(b, ob) {
    if (b.iframes > 0) return false;
    var bh = num(b.h, TUNE.bikeH);
    var oc = ob ? num(ob.y, b.y) + num(ob.h, 0) / 2 : b.y + bh / 2;
    var dir = sign((b.y + bh / 2) - oc) || -1;
    b.vy = dir * TUNE.bikeCrashBounce;
    b.vx = Math.min(num(b.vx, 0), TUNE.bikeCrashSpeed);
    b.iframes = TUNE.bikeIframes;
    fx.addTrauma(TUNE.bikeCrashShake); fx.addHitstop(TUNE.bikeCrashHitstop);
    ev(b, { type: 'crash' });
    return true;
  }

  /* bikeRam(b, e): you sideswiped a scout trooper's bike. Shoves it vertically away
   * (engine: if it then hits a tree/the ground, it crashes = kill). */
  function bikeRam(b, e) {
    var bh = num(b.h, TUNE.bikeH), eh = num(e.h, bh);
    var dir = sign((e.y + eh / 2) - (b.y + bh / 2)) || 1;
    e.vy = num(e.vy, 0) + dir * TUNE.bikeRamImpulse;
    b.vy = num(b.vy, 0) - dir * TUNE.bikeRamImpulse * 0.35;
    fx.addTrauma(0.15);
    ev(b, { type: 'ram' });
    return dir;
  }

  /* =========================================================================
   * EWOKS
   * ewokBob(t, speed) -> {dy, dx, rot, sx, sy}  stateless (lead's signature).
   *   phase = t*speed/stride footsteps. Body lifts mid-step (dy -bob..0), leans
   *   left/right on alternate steps (rot), sways (dx), squashes at foot plant.
   *   speed 0 -> gentle breathing only.
   * Render: translate(x+dx, y+dy) at the feet, rotate(rot), scale(sx*face, sy).
   * ========================================================================= */
  function ewokBob(t, speed) {
    var K = TUNE, sp = Math.abs(num(speed, 0)); t = num(t, 0);
    if (sp < 1) {
      var br = Math.sin(t * Math.PI * 2 * K.ewokIdleHz) * K.ewokIdleAmp;
      return { dy: 0, dx: 0, rot: 0, sx: 1 - br * 0.6, sy: 1 + br };
    }
    return gaitAt(t * sp / K.ewokStride, Math.min(1, sp / K.ewokSpeed));
  }
  function gaitAt(phase, amt) {
    var K = TUNE;
    var stepPh = phase - Math.floor(phase);
    var lift = Math.sin(Math.PI * stepPh);         // 0 at foot plant, 1 mid-step
    var side = Math.sin(Math.PI * phase);          // flips sign every step
    var plant = Math.pow(1 - lift, 3);
    return {
      dy: -K.ewokBob * lift * amt,
      dx: K.ewokSway * side * amt,
      rot: K.ewokRot * side * amt,
      sx: 1 + K.ewokSquash * 0.7 * plant * amt,
      sy: 1 - K.ewokSquash * plant * amt
    };
  }
  /* ewokGait(e, dt): stateful version driven by distance actually walked (no foot
   * sliding when speed changes) with a smooth fade in/out. Sets and returns e.gait. */
  function ewokGait(e, dt) {
    var K = TUNE; dt = clamp(num(dt, 0), 0, K.maxFrameDt);
    e.gaitDist = num(e.gaitDist, 0) + Math.abs(num(e.vx, 0)) * dt;
    e.gaitT = num(e.gaitT, 0) + dt;
    var moving = Math.abs(num(e.vx, 0)) > 5;
    var amt = num(e.gaitAmt, 0);
    amt += ((moving ? Math.min(1, Math.abs(e.vx) / K.ewokSpeed) : 0) - amt) * (1 - Math.exp(-K.ewokBlendRate * dt));
    e.gaitAmt = amt;
    var g = gaitAt(e.gaitDist / K.ewokStride, amt);
    var idle = ewokBob(e.gaitT, 0);
    g.sx += (idle.sx - 1) * (1 - amt); g.sy += (idle.sy - 1) * (1 - amt);
    e.gait = g;
    return g;
  }

  /* =========================================================================
   * Generic walker body (Ewoks, Murky, troopers...): gravity, patrol, turn at
   * walls/edges. The engine's AI can set e.vx itself and pass {noPatrol:true}.
   * e = {x,y,w,h,vx,vy,dir,speed?,flyer?}. T as for stepPlayer (+ T.solidAt(x,y)
   * for edge turns; buildWorld provides it).
   * ========================================================================= */
  function stepWalker(e, dt, T, opts) {
    T = T || {}; opts = opts || {};
    e.w = num(e.w, 32); e.h = num(e.h, 32); e.vy = num(e.vy, 0); e.dir = e.dir || -1;
    var sp = num(e.speed, e.type === 'ewok' || e.ewok ? TUNE.ewokSpeed : TUNE.walkerSpeed);
    var st = substeps(dt);
    for (var i = 0; i < st.n; i++) {
      var h = st.h;
      if (!opts.noPatrol && !e.dead) e.vx = e.dir * sp;
      if (!e.flyer) {
        var g = TUNE.gravity * (e.vy > 0 ? TUNE.fallGravityMult : 1);
        var vy1 = Math.min(e.vy + g * h, TUNE.maxFall);
        var dy = (e.vy + vy1) * 0.5 * h; e.vy = vy1;
        var hx = e.x;
        moveAndCollide(e, e.vx * h, dy, T);
        if (!opts.noPatrol && !e.dead) {
          if (Math.abs(e.x - (hx + e.vx * h)) > 0.01) e.dir = -e.dir;          // hit a wall
          else if (TUNE.walkerTurnAtEdges && e.onGround && T.solidAt) {
            var fx2 = e.dir > 0 ? e.x + e.w + 2 : e.x - 2;
            if (!T.solidAt(fx2, e.y + e.h + 4)) e.dir = -e.dir;                // ledge ahead
          }
          if (e.range && e.homeX !== undefined && Math.abs(e.x - e.homeX) > e.range) e.dir = sign(e.homeX - e.x);
        }
      } else {
        e.x += e.vx * h; e.y += num(e.vy, 0) * h;
      }
    }
    if (e.flash) e.flash = Math.max(0, e.flash - dt);
    if (e.type === 'ewok' || e.ewok) ewokGait(e, dt);
  }

  /* =========================================================================
   * JABBA THE HUTT
   * boss = {x,y,w,h,hp?}. jabbaHit(boss, shot) applies a hit and returns the
   * numbers; jabbaStep(boss, dt) animates flash/iframes/recoil/wobble;
   * jabbaContact(p, boss, inp) resolves the taco touching him.
   * Render fields: boss.offsetX (add to x), boss.sx/sy (scale about his base),
   * boss.rot, boss.flashOn (draw white), boss.hp/maxHp, boss.dead.
   * shot = {x, vx?, kind:'shot'|'fire'|'stomp'|'pound', damage?}
   * ========================================================================= */
  function initBoss(b) {
    if (b._tj) return;
    b._tj = true;
    b.w = num(b.w, 230); b.h = num(b.h, 150);
    b.maxHp = num(b.maxHp, num(b.hp, TUNE.jabbaHp)); b.hp = num(b.hp, b.maxHp);
    b.flash = 0; b.iframes = 0; b.recoilX = 0; b.recoilV = 0; b.wob = 0; b.wobV = 0;
    b.offsetX = 0; b.sx = 1; b.sy = 1; b.rot = 0; b.flashOn = false; b.dead = !!b.dead; b.hits = 0;
  }
  function jabbaHit(boss, shot) {
    initBoss(boss); shot = shot || {};
    var K = TUNE, kind = shot.kind || 'shot';
    var none = { hit: false, damage: 0, hp: boss.hp, dead: boss.dead, flash: 0, iframes: boss.iframes, recoil: 0, shake: 0, hitstop: 0 };
    if (boss.dead || boss.iframes > 0) return none;
    var heavy = kind === 'stomp' || kind === 'pound';
    var dmg = num(shot.damage, kind === 'pound' ? K.jabbaDmgPound : kind === 'stomp' ? K.jabbaDmgStomp : kind === 'fire' ? K.jabbaDmgFire : K.jabbaDmgShot);
    boss.hp = Math.max(0, boss.hp - dmg); boss.hits++;
    var dir = sign(num(shot.vx, 0)) || sign((boss.x + boss.w / 2) - num(shot.x, boss.x)) || 1;
    var recoil = dir * K.jabbaRecoil * (heavy ? 0.5 : 1); // stomps squash him down more than push him
    boss.recoilV += recoil;
    boss.wobV += K.jabbaWobbleKick * (heavy ? 1.8 : 1) * 10;
    boss.flash = K.jabbaFlash;
    boss.iframes = heavy ? K.jabbaIframesStomp : K.jabbaIframesShot;
    var dead = boss.hp <= 0;
    var shake = dead ? K.jabbaShakeDie : (heavy ? K.jabbaShakeStomp : K.jabbaShakeHit);
    var hs = dead ? K.jabbaHitstopDie : (heavy ? K.jabbaHitstopStomp : K.jabbaHitstopHit);
    if (dead) { boss.dead = true; boss.wobV += 25; }
    fx.addTrauma(shake); fx.addHitstop(hs);
    return { hit: true, damage: dmg, hp: boss.hp, dead: dead, flash: boss.flash, iframes: boss.iframes, recoil: recoil, dir: dir, shake: shake, hitstop: hs };
  }
  function jabbaStep(boss, dt) {
    initBoss(boss);
    var K = TUNE, st = substeps(dt);
    for (var i = 0; i < st.n; i++) {
      var h = st.h;
      boss.flash = Math.max(0, boss.flash - h); boss.iframes = Math.max(0, boss.iframes - h);
      var w1 = K.jabbaRecoilOmega, z1 = K.jabbaRecoilZeta;
      boss.recoilV += (-w1 * w1 * boss.recoilX - 2 * z1 * w1 * boss.recoilV) * h;
      boss.recoilX += boss.recoilV * h;
      if (Math.abs(boss.recoilX) > K.jabbaRecoilMax) { boss.recoilX = sign(boss.recoilX) * K.jabbaRecoilMax; boss.recoilV *= -0.2; }
      var w2 = K.jabbaWobbleOmega, z2 = K.jabbaWobbleZeta;
      boss.wobV += (-w2 * w2 * boss.wob - 2 * z2 * w2 * boss.wobV) * h;
      boss.wob += boss.wobV * h;
    }
    var wb = clamp(boss.wob, -1.5, 1.5);
    boss.offsetX = boss.recoilX;
    boss.sy = 1 - K.jabbaWobbleSquash * wb;
    boss.sx = 1 + K.jabbaWobbleSquash * 0.8 * wb;
    boss.rot = K.jabbaWobbleRot * wb * sign(boss.recoilX || 1);
    boss.flashOn = boss.flash > 0;
  }
  /* jabbaContact(p, boss, inp) -> null | {type:'stomp', ...jabbaHit numbers} | {type:'hurt', knockX, knockY, ...}
   * Falling onto his head (top jabbaHeadZone) = stomp (big bounce). Anything else
   * = the taco is knocked back. He is solid: while invulnerable the taco is pushed out. */
  function jabbaContact(p, boss, inp) {
    initPlayer(p); initBoss(boss); inp = inp || {};
    var box = { x: boss.x + boss.offsetX, y: boss.y, w: boss.w, h: boss.h };
    if (boss.dead || p.captured || !overlap(p, box)) return null;
    var K = TUNE;
    var prevBottom = num(p._frameY0, p.y) + p.h;
    if (p.vy > 0 && prevBottom <= box.y + box.h * K.jabbaHeadZone) {
      var r = jabbaHit(boss, { kind: p.pound === 2 ? 'pound' : 'stomp', x: p.x + p.w / 2 });
      p.y = box.y - p.h; p.vy = -K.jabbaStompBounce; p.onGround = false; p.pound = 0;
      p.jumping = false; p.inJump = !!inp.jump; p.cutDone = true;
      r.type = 'stomp'; ev(p, { type: 'stomp', boss: true, hit: r.hit });
      return r;
    }
    var dir = sign((p.x + p.w / 2) - (box.x + box.w / 2)) || -1;
    if (p.iframes > 0) { // solid body: shove out sideways
      p.x = dir > 0 ? box.x + box.w : box.x - p.w;
      if (p.vx * dir < 0) p.vx = 0;
      return null;
    }
    hurt(p, box.x + box.w / 2, { kx: K.jabbaKnockX, ky: K.jabbaKnockY, iframes: K.jabbaPlayerIframes, lock: K.jabbaHurtLock, shake: K.jabbaShakeHurt, hitstop: K.jabbaHitstopHurt });
    p.x = dir > 0 ? box.x + box.w : box.x - p.w;
    boss.wobV += 6;
    return { type: 'hurt', knockX: dir * K.jabbaKnockX, knockY: -K.jabbaKnockY, iframes: K.jabbaPlayerIframes, shake: K.jabbaShakeHurt, hitstop: K.jabbaHitstopHurt };
  }

  /* =========================================================================
   * WORLD: AABB collision from a levels/SCHEMA.md level. The returned object
   * is a valid T for stepPlayer/stepWalker (collideX, collideY, ladderAt, solidAt).
   * Ground strips [x0,x1,topY] -> solid boxes down to y=1000. Platform types:
   * solid (all sides), oneway/cloud/bridge/moving (land from above only),
   * crumble (solid; falls crumbleDelay s after you land), springs (bounce pads).
   * Call world.update(dt, [bodies]) once per frame BEFORE stepping bodies
   * (moves 'moving' platforms and carries anyone standing on them).
   * ========================================================================= */
  function buildWorld(level) {
    level = level || {};
    var solids = [], ladders = [], i;
    var gr = level.ground || [];
    for (i = 0; i < gr.length; i++) solids.push({ x: gr[i][0], y: gr[i][2], w: gr[i][1] - gr[i][0], h: 1000 - gr[i][2], kind: 'ground', oneway: false });
    var pl = level.platforms || [];
    for (i = 0; i < pl.length; i++) {
      var q = pl[i], t = q.type || 'solid';
      if (t === 'ladder') { ladders.push({ x: q.x, y: q.y, w: num(q.w, 32), h: num(q.h, 120) }); continue; }
      var s = { x: q.x, y: q.y, w: num(q.w, 96), h: num(q.h, 24), kind: t, oneway: (t === 'oneway' || t === 'cloud' || t === 'bridge' || t === 'moving'), active: true };
      if (t === 'moving') { s.x0 = q.x; s.y0 = q.y; s.mdx = num(q.dx, 0); s.mdy = num(q.dy, 0); s.period = num(q.period, 4); s.dx = 0; s.dy = 0; }
      if (t === 'crumble') { s.crumbleT = -1; s.y0 = q.y; s.fallV = 0; }
      solids.push(s);
    }
    var sp = level.springs || [];
    for (i = 0; i < sp.length; i++) solids.push({ x: sp[i].x - 18, y: sp[i].y - 18, w: 36, h: 18, kind: 'spring', oneway: true, active: true });
    var pits = (level.hazards || []).filter(function (z) { return z.type === 'sarlacc'; })
      .map(function (z) { return { x: z.x, w: num(z.w, 96), y: num(z.y, 460) }; });
    var width = num(level.width, 1e9);
    var W = {
      solids: solids, ladders: ladders, pits: pits, width: width, time: 0,
      solidAt: function (x, y) {
        for (var k = 0; k < solids.length; k++) { var s = solids[k]; if (s.active === false) continue; if (x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) return s; }
        return null;
      },
      ladderAt: function (p) {
        for (var k = 0; k < ladders.length; k++) { var l = ladders[k]; var cx = p.x + p.w / 2; if (cx > l.x && cx < l.x + l.w && p.y + p.h > l.y && p.y < l.y + l.h) return l; }
        return null;
      },
      collideX: function (p) {
        for (var k = 0; k < solids.length; k++) {
          var s = solids[k];
          if (s.oneway || s.active === false || !overlap(p, s)) continue;
          if (p.x > p.prevX) p.x = s.x - p.w; else if (p.x < p.prevX) p.x = s.x + s.w;
          else p.x = (p.x + p.w / 2 < s.x + s.w / 2) ? s.x - p.w : s.x + s.w;
          p.vx = 0; p.hitWall = true;
        }
        if (p.x < 0) { p.x = 0; p.vx = Math.max(0, p.vx); }
        if (p.x + p.w > width) { p.x = width - p.w; p.vx = Math.min(0, p.vx); }
      },
      collideY: function (p) {
        p.onGround = false; p._onOneway = false;
        var prevBottom = p.prevY + p.h;
        for (var k = 0; k < solids.length; k++) {
          var s = solids[k];
          if (s.active === false) continue;
          if (s.oneway) {
            if (p.dropT > 0 && s.kind !== 'spring') continue;
            if (p.y >= p.prevY && prevBottom <= s.y + 0.5 && p.y + p.h >= s.y && p.x < s.x + s.w && p.x + p.w > s.x) land(p, s);
          } else if (overlap(p, s)) {
            if (prevBottom <= s.y + 0.5) land(p, s);
            else if (p.prevY >= s.y + s.h - 0.5) { p.y = s.y + s.h; if (p.vy < 0) p.vy = 0; ev(p, { type: 'bump', solid: s }); }
            else if ((p.y + p.h) - s.y < (s.y + s.h) - p.y) land(p, s); // embedded: nearest face
            else p.y = s.y + s.h;
          }
        }
      },
      // single-call form (engine style T.collide(p)): x resolved at the old y, then y
      collide: function (p) {
        var y = p.y; p.y = num(p.prevY, y); W.collideX(p); p.y = y; W.collideY(p);
      },
      update: function (dt, bodies) {
        dt = clamp(num(dt, 0), 0, TUNE.maxFrameDt); W.time += dt;
        for (var k = 0; k < solids.length; k++) {
          var s = solids[k];
          if (s.kind === 'moving') {
            var f = 0.5 - 0.5 * Math.cos(2 * Math.PI * W.time / s.period);
            var nx = s.x0 + s.mdx * f, ny = s.y0 + s.mdy * f;
            s.dx = nx - s.x; s.dy = ny - s.y; s.x = nx; s.y = ny;
          } else if (s.kind === 'crumble' && s.crumbleT >= 0) {
            s.crumbleT += dt;
            if (s.crumbleT > TUNE.crumbleDelay) { s.active = false; s.fallV += 1800 * dt; s.y += s.fallV * dt; }
            if (s.crumbleT > TUNE.crumbleDelay + TUNE.crumbleRespawn) { s.crumbleT = -1; s.active = true; s.y = s.y0; s.fallV = 0; }
          }
        }
        if (bodies) for (var j = 0; j < bodies.length; j++) {
          var b = bodies[j], g = b && b.groundRef;
          if (g && b.onGround && g.kind === 'moving') { b.x += g.dx; b.y += g.dy; }
        }
      }
    };
    function land(p, s) {
      p.y = s.y - p.h; p.groundRef = s;
      if (s.kind === 'spring') { spring(p); return; }
      if (s.kind === 'cloud' && p.vy > TUNE.cloudMinImpact) { p.vy = -TUNE.cloudBounce; p.onGround = false; return; }
      if (p.vy > 0) p.vy = 0;
      p.onGround = true; if (s.oneway) p._onOneway = true;
      if (s.kind === 'crumble' && s.crumbleT < 0) s.crumbleT = 0;
    }
    return W;
  }

  /* =========================================================================
   * TOUCH INPUT (optional helper; the lead may use its own). NO D-PAD.
   * Drag anywhere = invisible floating stick: hold left/right of where your
   * thumb went down to run (analog ax). Quick upward flick = jump (keep the
   * finger up/held = higher jump; slide down or lift = cut). Hold down = D
   * (ladders, drop-through; a fresh down swipe in the air = ground pound).
   * Bike mode: finger offset up/down from where it landed = inp.steer.
   * opts = {mode:'platform'|'bike', jumpButton, throwButton, ignore: css selector}
   * Each frame: read ctl.inp, then call ctl.endFrame() to clear the one-frame flags.
   * Keyboard fallback: arrows/WASD, Space/Z = jump, X/J = throw.
   * ========================================================================= */
  function createTouchInput(el, opts) {
    opts = opts || {};
    var K = TUNE;
    var inp = { L: false, R: false, U: false, D: false, jump: false, jumpPressed: false, throw: false, throwPressed: false, ax: 0, steer: 0, touching: false };
    var ctl = { inp: inp, mode: opts.mode || 'platform' };
    var stick = null, btnJump = false, flickJump = false, keys = {};
    function isButton(t) {
      if (!t || !t.closest) return false;
      if (opts.jumpButton && opts.jumpButton.contains(t)) return true;
      if (opts.throwButton && opts.throwButton.contains(t)) return true;
      return !!(opts.ignore && t.closest(opts.ignore));
    }
    function recompute() {
      var kx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0), ky = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
      var ax = kx, steer = ky, U = ky < 0, D = ky > 0;
      if (stick) {
        var dx = stick.x - stick.ax, adx = Math.abs(dx);
        if (adx > K.touchDeadzone) ax = sign(dx) * Math.min(1, (adx - K.touchDeadzone) / (K.touchFullDrag - K.touchDeadzone) * 0.7 + 0.3);
        var dy = stick.y - stick.ay;
        if (ctl.mode === 'bike') steer = clamp(dy / K.touchSteerFull, -1, 1);
        if (dy > K.touchVertHold) D = true;
        if (dy < -K.touchVertHold && !flickJump) U = true;
      }
      inp.ax = ax; inp.steer = steer; inp.L = ax < -0.01; inp.R = ax > 0.01; inp.U = U; inp.D = D;
      inp.jump = btnJump || flickJump || !!keys.jump;
      inp.touching = !!stick;
    }
    function onDown(e) {
      if (isButton(e.target)) return;
      if (stick) return;
      stick = { id: e.pointerId, ax: e.clientX, ay: e.clientY, x: e.clientX, y: e.clientY, hist: [{ y: e.clientY, t: performance.now() }] };
      if (el.setPointerCapture) try { el.setPointerCapture(e.pointerId); } catch (_) {}
      recompute(); if (e.cancelable) e.preventDefault();
    }
    function onMove(e) {
      if (!stick || e.pointerId !== stick.id) return;
      stick.x = e.clientX; stick.y = e.clientY;
      var now = performance.now();
      stick.hist.push({ y: e.clientY, t: now });
      while (stick.hist.length > 2 && now - stick.hist[0].t > K.touchSwipeMs) stick.hist.shift();
      var rise = stick.hist[0].y - e.clientY;
      if (ctl.mode !== 'bike' && !flickJump && rise > K.touchSwipeUpPx) { flickJump = true; inp.jumpPressed = true; stick.flickY = e.clientY; }
      if (flickJump && e.clientY > stick.flickY + 24) flickJump = false; // slid back down: cut the jump
      if (flickJump) stick.flickY = Math.min(stick.flickY, e.clientY);
      // floating anchor: horizontal anchor trails the finger so reversing is instant
      var max = K.touchFullDrag * 1.4;
      if (stick.x - stick.ax > max) stick.ax = stick.x - max; if (stick.ax - stick.x > max) stick.ax = stick.x + max;
      if (ctl.mode !== 'bike' && Math.abs(stick.y - stick.ay) > 90) stick.ay = stick.y - sign(stick.y - stick.ay) * 90;
      recompute(); if (e.cancelable) e.preventDefault();
    }
    function onUp(e) {
      if (!stick || e.pointerId !== stick.id) return;
      stick = null; flickJump = false; recompute();
    }
    function btn(elm, name) {
      if (!elm) return;
      elm.addEventListener('pointerdown', function (e) {
        if (name === 'jump') { btnJump = true; inp.jumpPressed = true; } else { inp.throw = true; inp.throwPressed = true; }
        recompute(); if (e.cancelable) e.preventDefault(); e.stopPropagation();
      });
      var up = function () { if (name === 'jump') btnJump = false; else inp.throw = false; recompute(); };
      elm.addEventListener('pointerup', up); elm.addEventListener('pointercancel', up); elm.addEventListener('pointerleave', up);
    }
    var KEYMAP = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', Space: 'jump', KeyZ: 'jump', KeyX: 'throw', KeyJ: 'throw' };
    function onKey(e) {
      var k = KEYMAP[e.code]; if (!k) return;
      var down = e.type === 'keydown';
      if (k === 'jump' && down && !keys.jump) inp.jumpPressed = true;
      if (k === 'up' && down && !keys.up && ctl.mode !== 'bike') inp.jumpPressed = true; // Up also jumps
      if (k === 'up' && ctl.mode !== 'bike') keys.jump = down || keys.jumpKey;
      if (k === 'throw') { if (down && !inp.throw) inp.throwPressed = true; inp.throw = down; }
      keys[k] = down; if (k === 'jump') keys.jumpKey = down;
      recompute(); e.preventDefault();
    }
    el.addEventListener('pointerdown', onDown, { passive: false });
    el.addEventListener('pointermove', onMove, { passive: false });
    el.addEventListener('pointerup', onUp); el.addEventListener('pointercancel', onUp);
    if (opts.keyboard !== false && typeof window !== 'undefined') { window.addEventListener('keydown', onKey); window.addEventListener('keyup', onKey); }
    btn(opts.jumpButton, 'jump'); btn(opts.throwButton, 'throw');
    ctl.endFrame = function () { inp.jumpPressed = false; inp.throwPressed = false; };
    ctl.setMode = function (m) { ctl.mode = m; recompute(); };
    ctl.destroy = function () {
      el.removeEventListener('pointerdown', onDown); el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp); el.removeEventListener('pointercancel', onUp);
      if (typeof window !== 'undefined') { window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKey); }
    };
    return ctl;
  }

  return {
    version: '1.0.0',
    TUNE: TUNE, CONSTANTS: CONSTANTS,
    stepPlayer: stepPlayer, stepBike: stepBike, ewokBob: ewokBob, sarlacc: sarlacc, jabbaHit: jabbaHit,
    stomp: stomp, hurt: hurt, spring: spring,
    bikeCrash: bikeCrash, bikeRam: bikeRam,
    ewokGait: ewokGait, stepWalker: stepWalker,
    jabbaStep: jabbaStep, jabbaContact: jabbaContact,
    buildWorld: buildWorld, overlap: overlap,
    fx: fx, createLoop: createLoop, createTouchInput: createTouchInput,
    util: { clamp: clamp, approach: approach, sign: sign }
  };
});
