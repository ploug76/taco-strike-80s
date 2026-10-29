/* Taco Strike 80s - sfx.js
 * Synthesized sound effects, pure WebAudio (no sampled audio).
 * Plain script: defines window.TacoSFX = { play(ctx, dest, name) }. Unknown names are a silent no-op.
 */
(function (root) {
  'use strict';
  var LEVEL = 0.3; // base level into dest
  // per-effect trims so every effect peaks roughly 0.2-0.3 into dest
  var TRIM = { torpedo: 1.0, tie_laser: 2.4, explosion: 0.7, laser: 1.6, enemy_laser: 2.4, explode: 0.7, ship_hit: 1.6, roll: 7, menu: 2.6, throw: 2.6, coin: 2.6, jump: 2.6, star: 2.8, oneup: 2.6, hurt: 1.8, pickup: 1.4, clear: 1.4, die: 1.3, roar: 0.55, boss_die: 0.8 };
  var nb = typeof WeakMap !== 'undefined' ? new WeakMap() : null;
  function noise(ctx) {
    var b = nb && nb.get(ctx);
    if (b) return b;
    b = ctx.createBuffer(1, ctx.sampleRate * 2 | 0, ctx.sampleRate);
    var d = b.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    if (nb) nb.set(ctx, b);
    return b;
  }
  function G(ctx, out, t, peak, a, dur) {
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    g.connect(out);
    return g;
  }
  // oscillator with frequency path [[time, freq], ...] (exponential ramps)
  function osc(ctx, out, t, type, path, dur, peak, a) {
    var o = ctx.createOscillator(), g = G(ctx, out, t, peak, a || 0.004, dur);
    o.type = type; o.frequency.setValueAtTime(path[0][1], t + path[0][0]);
    for (var i = 1; i < path.length; i++) o.frequency.exponentialRampToValueAtTime(path[i][1], t + path[i][0]);
    o.connect(g); o.start(t); o.stop(t + dur + 0.02);
    return o;
  }
  function nz(ctx, out, t, type, f0, f1, dur, peak, a, q) {
    var s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = G(ctx, out, t, peak, a || 0.003, dur);
    s.buffer = noise(ctx); f.type = type; f.Q.value = q || 1;
    f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    s.connect(f); f.connect(g); s.start(t); s.stop(t + dur + 0.02);
  }
  function notes(ctx, out, t, type, freqs, step, len, peak) {
    freqs.forEach(function (f, i) { if (f) osc(ctx, out, t + i * step, type, [[0, f]], len, peak); });
  }
  function lfo(ctx, t, dur, rate, depth, target) {
    var l = ctx.createOscillator(), g = ctx.createGain();
    l.frequency.value = rate; g.gain.value = depth; l.connect(g); g.connect(target); l.start(t); l.stop(t + dur + 0.05);
    return l;
  }

  var S = {
    throw: function (c, o, t) {
      nz(c, o, t, 'bandpass', 700, 3500, 0.18, 0.5, 0.01, 2);
      osc(c, o, t, 'square', [[0, 900], [0.12, 300]], 0.13, 0.25);
    },
    stomp: function (c, o, t) {
      osc(c, o, t, 'square', [[0, 500], [0.1, 90]], 0.14, 0.45);
      osc(c, o, t, 'sine', [[0, 160], [0.15, 45]], 0.2, 0.8);
      nz(c, o, t, 'lowpass', 2000, 300, 0.08, 0.4);
    },
    coin: function (c, o, t) {
      osc(c, o, t, 'square', [[0, 1047]], 0.07, 0.3);
      osc(c, o, t + 0.07, 'square', [[0, 1568]], 0.28, 0.3);
    },
    pickup: function (c, o, t) { notes(c, o, t, 'triangle', [523, 659, 784, 1047, 1319], 0.05, 0.12, 0.6); },
    heal: function (c, o, t) {
      [0, 7].forEach(function (d) { var x = osc(c, o, t, 'sine', [[0, 440], [0.5, 880]], 0.6, 0.45, 0.05); x.detune.value = d; });
      notes(c, o, t + 0.1, 'triangle', [880, 1109, 1319, 1760], 0.08, 0.2, 0.25);
    },
    hurt: function (c, o, t) {
      var x = osc(c, o, t, 'sawtooth', [[0, 620], [0.3, 140]], 0.32, 0.4);
      lfo(c, t, 0.32, 28, 60, x.frequency);
      nz(c, o, t, 'bandpass', 1500, 500, 0.15, 0.3);
    },
    die: function (c, o, t) {
      notes(c, o, t, 'square', [784, 740, 698, 659, 587, 523, 466, 392, 330, 262], 0.08, 0.1, 0.35);
      osc(c, o, t + 0.8, 'triangle', [[0, 196], [0.5, 60]], 0.6, 0.6);
    },
    jump: function (c, o, t) { osc(c, o, t, 'square', [[0, 280], [0.14, 760]], 0.16, 0.3); },
    spring: function (c, o, t) {
      var x = osc(c, o, t, 'sine', [[0, 180], [0.12, 620], [0.4, 420]], 0.45, 0.7);
      lfo(c, t, 0.45, 16, 70, x.frequency);
    },
    boss_hit: function (c, o, t) {
      nz(c, o, t, 'lowpass', 5000, 400, 0.25, 0.8);
      osc(c, o, t, 'square', [[0, 140], [0.2, 60]], 0.25, 0.5);
      osc(c, o, t, 'sawtooth', [[0, 1200], [0.12, 200]], 0.13, 0.25);
    },
    boss_die: function (c, o, t) {
      for (var i = 0; i < 5; i++) nz(c, o, t + i * 0.22, 'lowpass', 4000 - i * 500, 120, 0.5, 0.8 - i * 0.1);
      osc(c, o, t, 'sawtooth', [[0, 600], [1.4, 40]], 1.5, 0.35);
      osc(c, o, t, 'sine', [[0, 90], [1.2, 30]], 1.3, 0.7);
    },
    clear: function (c, o, t) { // original fanfare
      var seq = [523, 659, 784, 0, 698, 880, 1047, 0, 988, 1175, 1568];
      notes(c, o, t, 'square', seq, 0.09, 0.14, 0.3);
      [523, 659, 784, 1047].forEach(function (f) { osc(c, o, t + 1.0, 'sawtooth', [[0, f]], 0.7, 0.13, 0.02); });
      osc(c, o, t + 1.0, 'triangle', [[0, 131]], 0.7, 0.4);
    },
    oneup: function (c, o, t) { notes(c, o, t, 'square', [659, 784, 1319, 1047, 1175, 1568], 0.075, 0.1, 0.3); },
    star: function (c, o, t) {
      for (var i = 0; i < 10; i++) osc(c, o, t + i * 0.05, 'triangle', [[0, 1500 + Math.random() * 2500]], 0.12, 0.3 * (1 - i / 12));
    },
    checkpoint: function (c, o, t) {
      [[0, 880], [0.15, 1319]].forEach(function (n) {
        osc(c, o, t + n[0], 'sine', [[0, n[1]]], 0.6, 0.45);
        osc(c, o, t + n[0], 'sine', [[0, n[1] * 2.76]], 0.25, 0.12);
      });
    },
    sarlacc: function (c, o, t) { // low gurgling growl from the sand pit
      var dur = 1.3, x = osc(c, o, t, 'sawtooth', [[0, 70], [0.6, 55], [1.3, 40]], dur, 0.55, 0.15);
      var f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 400; f.Q.value = 4;
      x.disconnect(); var g = G(c, o, t, 0.6, 0.15, dur); x.connect(f); f.connect(g);
      lfo(c, t, dur, 7, 12, x.frequency);
      lfo(c, t, dur, 3, 150, f.frequency);
      nz(c, o, t, 'lowpass', 600, 150, dur, 0.35, 0.2, 3);
      for (var i = 0; i < 5; i++) osc(c, o, t + 0.2 + i * 0.2, 'sine', [[0, 120 + Math.random() * 80], [0.08, 300]], 0.09, 0.15);
    },
    // ---- ship / flight levels ----
    laser: function (c, o, t) { // player blaster: bright falling zap
      osc(c, o, t, 'sawtooth', [[0, 2400], [0.16, 300]], 0.17, 0.35);
      osc(c, o, t, 'square', [[0, 1800], [0.12, 500]], 0.13, 0.15);
    },
    enemy_laser: function (c, o, t) { // lower, buzzier enemy shot
      var x = osc(c, o, t, 'square', [[0, 900], [0.22, 160]], 0.24, 0.3);
      lfo(c, t, 0.24, 45, 80, x.frequency);
    },
    explode: function (c, o, t) {
      nz(c, o, t, 'lowpass', 3500, 100, 0.7, 0.9);
      osc(c, o, t, 'sine', [[0, 110], [0.5, 35]], 0.55, 0.6);
    },
    ship_hit: function (c, o, t) {
      nz(c, o, t, 'bandpass', 2500, 400, 0.22, 0.7, 0.002, 1.5);
      var x = osc(c, o, t, 'sawtooth', [[0, 300], [0.25, 90]], 0.26, 0.35);
      lfo(c, t, 0.26, 30, 40, x.frequency);
    },
    roll: function (c, o, t) { // barrel roll whoosh
      nz(c, o, t, 'bandpass', 400, 2500, 0.18, 0.25, 0.15, 3);
      nz(c, o, t + 0.18, 'bandpass', 2500, 500, 0.2, 0.25, 0.01, 3);
    },
    torpedo: function (c, o, t) { // proton torpedo: deep launch thump + rising whistle + sparkle tail
      osc(c, o, t, 'sine', [[0, 140], [0.2, 50]], 0.25, 0.7);
      osc(c, o, t, 'triangle', [[0, 300], [0.5, 1400]], 0.55, 0.3, 0.03);
      nz(c, o, t, 'bandpass', 600, 3000, 0.5, 0.35, 0.02, 2);
      for (var i = 0; i < 5; i++) osc(c, o, t + 0.1 + i * 0.07, 'sine', [[0, 2000 + i * 300]], 0.08, 0.12);
    },
    menu: function (c, o, t) { notes(c, o, t, 'square', [880, 1320], 0.045, 0.06, 0.25); },
    roar: function (c, o, t) { // synthesized Wookiee-style roar, ~1.2 s
      var dur = 1.2, src = c.createGain(); src.gain.value = 1;
      // growly sawtooth pair with a rising-then-falling pitch contour
      [-12, 9].forEach(function (d) {
        var s = c.createOscillator(); s.type = 'sawtooth'; s.detune.value = d;
        var f = s.frequency;
        f.setValueAtTime(170, t); f.linearRampToValueAtTime(260, t + 0.25); f.linearRampToValueAtTime(300, t + 0.55);
        f.linearRampToValueAtTime(240, t + 0.9); f.linearRampToValueAtTime(150, t + dur);
        lfo(c, t, dur, 6.5, 14, f);   // vibrato
        lfo(c, t, dur, 31, 9, f);     // growl roughness
        s.connect(src); s.start(t); s.stop(t + dur + 0.05);
      });
      // breathy noise
      var n = c.createBufferSource(), nf = c.createBiquadFilter(), ng = c.createGain();
      n.buffer = noise(c); nf.type = 'bandpass'; nf.frequency.value = 1400; nf.Q.value = 0.8; ng.gain.value = 0.35;
      n.connect(nf); nf.connect(ng); ng.connect(src); n.start(t); n.stop(t + dur + 0.05);
      // amplitude growl (tremolo)
      var am = c.createGain(); am.gain.value = 0.75; lfo(c, t, dur, 24, 0.25, am.gain); src.connect(am);
      // vocal formants with a slow "aaa-ooo" vowel sweep
      var out = c.createGain();
      out.gain.setValueAtTime(0.0001, t); out.gain.linearRampToValueAtTime(0.9, t + 0.09);
      out.gain.setValueAtTime(0.9, t + 0.75); out.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      out.connect(o);
      [[650, 500, 1.0], [1150, 900, 0.7], [2500, 2400, 0.35]].forEach(function (fm) {
        var bp = c.createBiquadFilter(), fg = c.createGain();
        bp.type = 'bandpass'; bp.Q.value = 6;
        bp.frequency.setValueAtTime(fm[1], t); bp.frequency.linearRampToValueAtTime(fm[0], t + 0.4); bp.frequency.linearRampToValueAtTime(fm[1], t + dur);
        fg.gain.value = fm[2] * 2.2; am.connect(bp); bp.connect(fg); fg.connect(out);
      });
    }
  };

  S.tie_laser = S.enemy_laser; S.explosion = S.explode; // names used by flight/README.md
  function play(ctx, dest, name) {
    var fn = S[name];
    if (!ctx || !fn) return; // unknown name: silent no-op
    try {
      var bus = ctx.createGain(); bus.gain.value = LEVEL * (TRIM[name] || 1); bus.connect(dest || ctx.destination);
      fn(ctx, bus, ctx.currentTime + 0.005);
      if (typeof setTimeout !== 'undefined' && !(ctx instanceof (root.OfflineAudioContext || function () {}))) {
        setTimeout(function () { try { bus.disconnect(); } catch (e) {} }, 3000);
      }
    } catch (e) { /* never let audio break the game */ }
  }
  root.TacoSFX = { play: play, names: Object.keys(S) };
})(typeof window !== 'undefined' ? window : this);
