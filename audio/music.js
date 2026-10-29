/* Taco Strike 80s - music.js
 * Original 80s-synth soundtrack, pure WebAudio synthesis (no audio files, no network).
 * Plain script: defines window.TacoMusic = { start(ctx, dest, worldKey), stop() }.
 * The engine owns the AudioContext, master volume and mute; pass a GainNode as dest.
 * Every melody here is an original composition written for this game; the tracks
 * only borrow the *style* of each world (no themes are quoted or transcribed).
 */
(function (root) {
  'use strict';
  var STEPS = 16, LOOKAHEAD = 0.12, TICK_MS = 25, PEAK = 0.25;

  // ---------------- note + chord helpers ----------------
  var NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function midi(name) { // "C#5", "Bb4"
    var m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
    if (!m) throw new Error('TacoMusic: bad note ' + name);
    return 12 * (parseInt(m[3], 10) + 1) + NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  }
  function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function chord(name) { // root in octave 2: "F#m", "Bb", "D7", "Gm7"
    var m = /^([A-G][#b]?)(m7|m|7)?$/.exec(name);
    if (!m) throw new Error('TacoMusic: bad chord ' + name);
    var r = midi(m[1] + '2'), q = m[2] || '';
    var third = q.charAt(0) === 'm' ? 3 : 4, top = q.indexOf('7') >= 0 ? 10 : 12;
    return [r, r + third, r + 7, r + top];
  }
  function bars(s) { return s.split('|').map(function (b) { return b.trim().split(/\s+/); }); }
  var BASSOFF = { '1': 0, '2': 2, '5': 7, '6': 9, '7': 10, '8': 12 };

  // ---------------- drum kits (16-step rows) ----------------
  // k kick, s snare, g gated snare, c clap, h closed hat, o open hat, t tom,
  // w wood block, l log drum, p timpani, z shaker
  var KITS = {
    fanfare: { k: 'x.......x.......', s: '............x.x.', p: 'x.......x...x.x.', h: '..x...x...x...x.', o: '..............x.' },
    pop:     { k: 'x...x...x...x...', c: '....x.......x...', s: '....x.......x...', h: 'x.xxx.xxx.xxx.xx', o: '......x.......x.' },
    softpop: { k: 'x.......x.x.....', c: '....x.......x...', h: '..x...x...x...x.', z: 'x.xxx.xxx.xxx.xx' },
    ballad:  { k: 'x.........x.....', g: '........x.......', h: 'x.x.x.x.x.x.x.x.', o: '..............x.' },
    rock:    { k: 'x.....x.x.....x.', g: '....x.......x...', h: 'x.x.x.x.x.x.x.x.', o: '......x.......x.' },
    forest:  { k: 'x.......x.......', s: '............x...', t: '......x.......xx', z: 'x.xxx.xxx.xxx.xx' },
    orch:    { k: 'x.......x.......', s: '....x.......x...', p: 'x.....x.x.......', h: 'xxxxxxxxxxxxxxxx', o: '..............x.' },
    ewok:    { k: 'x.......x.......', l: 'x..x..x.x.x..x..', w: '..x.x..x..x.x.xx', z: 'x.xxx.xxx.xxx.xx', c: '............x...' },
    swing:   { k: 'x.......x.......', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.', o: '......x.......x.' },
    march:   { k: 'x...x...x...x...', s: 'x..xx.x.x..xx.xx', p: 'x.......x.......', h: '..x...x...x...x.' },
    march2:  { k: 'x...x...x...x.x.', s: 'x.xxx.x.x.xxx.xx', p: 'x.....x.x.....x.', h: 'x.x.x.x.x.x.x.x.' },
    drive:   { k: 'x...x...x...x...', g: '....x.......x...', h: 'xxxxxxxxxxxxxxxx', o: '..x...x...x...x.' },
    pulse:   { k: 'x..x..x...x..x..', g: '....x.......x...', h: 'x.xxx.xxx.xxx.xx', p: 'x...............' }
  };
  var FILLS = {
    snare: { s: '....x...x.x.xxxx' }, gated: { g: '....x...x.x.xxxx' },
    toms: { t: '........x.x.xxxx' }, timp: { p: '........x.x.xxxx' }, ewok: { l: 'x.x.x.x.xxxxxxxx' }
  };

  // ---------------- lead voices ----------------
  var V = {
    pulse:    { type: 'square',   gain: 0.10, cut: 4200, det: [-5, 5], vib: 1, r: 0.06, rev: 0.25 },
    square:   { type: 'square',   gain: 0.10, cut: 3200, det: [-5, 5], vib: 1, r: 0.06, rev: 0.25 },
    grit:     { type: 'sawtooth', gain: 0.10, cut: 3000, q: 2, det: [-10, 10], vib: 1, r: 0.05, rev: 0.18 },
    triangle: { type: 'triangle', gain: 0.20, cut: 6000, det: [0, 6], vib: 1, a: 0.02, r: 0.15, rev: 0.4 },
    soar:     { type: 'sawtooth', gain: 0.085, cut: 3400, det: [-12, 0, 12], vib: 1, a: 0.06, r: 0.3, rev: 0.55, swell: [900, 3400] },
    brass:    { type: 'sawtooth', gain: 0.095, cut: 1900, det: [-7, 7], vib: 1, a: 0.03, r: 0.08, rev: 0.3, swell: [350, 2800], stack: [0, -12] },
    lowbrass: { type: 'sawtooth', gain: 0.12, cut: 1000, det: [-8, 8], a: 0.04, r: 0.1, rev: 0.25, swell: [220, 1700], stack: [0, 12] },
    clarinet: { type: 'square',   gain: 0.10, cut: 2000, q: 1.2, det: [0], vib: 1, a: 0.015, r: 0.05, rev: 0.22 },
    chant:    { type: 'sawtooth', gain: 0.30, ftype: 'bandpass', cut: 950, q: 2.2, det: [-6, 6], a: 0.012, r: 0.06, rev: 0.35, short: 0.2 },
    marimba:  { type: 'triangle', gain: 0.24, cut: 3000, a: 0.002, r: 0.2, rev: 0.3, short: 0.24, oct: 0.25 }
  };

  // ---------------- tracks (all melodies original) ----------------
  var T = {
    // big heroic sci-fi fanfare
    title: { bpm: 112, kit: 'fanfare', fill: 'timp', lead: 'brass', pad: 1, arp: { type: 'square', rate: 2 },
      bass: { pat: '1.......5...1.5.', type: 'synth' }, comp: { type: 'stab', pat: 'x.......x.....x.' },
      chords: 'C G Am F C G F G',
      mel: 'C5 - - . E5 - G5 - C6 - - - B5 - G5 - | D5 - - . G5 - B5 - D6 - - - C6 - B5 - | A5 - - . C6 - B5 - A5 - - - E5 - - - | F5 - A5 - G5 - F5 - E5 - - - D5 - - - |' +
           'C5 - - . E5 - G5 - C6 - - - D6 - E6 - | D6 - - . B5 - G5 - D5 - - - G5 - B5 - | A5 - - - G5 - F5 - A5 - C6 - - - A5 - | G5 - - - - - - - D5 - E5 - F5 - G5 -' },
    // character select: upbeat arcade pop
    select: { bpm: 126, kit: 'pop', fill: 'snare', lead: 'pulse', arp: { type: 'bell', rate: 1 },
      bass: { pat: '1.1.8.1.1.1.8.5.', type: 'synth' },
      chords: 'A F#m D E A F#m D E',
      mel: 'E5 - A5 - C#6 - B5 A5 - - E5 - A5 - B5 - | C#6 - - - A5 - F#5 - A5 - - - C#6 - B5 - | A5 - F#5 - D5 - F#5 - A5 - D6 - - - C#6 - | B5 - - - G#5 - - - E5 - G#5 - B5 - - - |' +
           'C#6 - E6 - - - C#6 - A5 - B5 - C#6 - - - | F#6 - - - E6 - C#6 - A5 - - - F#5 - A5 - | D6 - - - F#6 - - - E6 - D6 - B5 - A5 - | B5 - - - - - - - G#5 - A5 - B5 - - -' },
    // bright Saturday-morning pop
    rainbow: { bpm: 132, kit: 'pop', fill: 'snare', lead: 'pulse', arp: { type: 'bell', rate: 1 }, pad: 1,
      bass: { pat: '1.1.8.1.1.1.8.5.', type: 'synth' },
      chords: 'D A Bm G D A G A',
      mel: 'F#5 - A5 - D6 - A5 - F#5 - A5 - B5 - A5 - | E5 - A5 - C#6 - A5 - E5 - - - . . E5 F#5 | D5 - F#5 - B5 - - - A5 - F#5 - D5 - - - | G5 - - - B5 - D6 - B5 - G5 - A5 - - - |' +
           'F#5 - A5 - D6 - E6 - F#6 - E6 - D6 - A5 - | C#6 - - - A5 - E5 - A5 - C#6 - E6 - - - | D6 - B5 - G5 - B5 - D6 - - - E6 - D6 - | C#6 - - - - - - - A5 - B5 - C#6 - E6 -' },
    // sweet, soft cloud pop
    carealot: { bpm: 108, kit: 'softpop', fill: 'toms', lead: 'triangle', arp: { type: 'bell', rate: 2 }, pad: 1,
      bass: { pat: '1...5...8...5.1.', type: 'soft' },
      chords: 'F Dm Bb C F Dm Bb C',
      mel: 'A5 - - - C6 - - - F5 - - - G5 - A5 - | D6 - - - C6 - - - A5 - - - - - - - | Bb5 - - - A5 - - - G5 - - - F5 - G5 - | E5 - - - G5 - - - C6 - - - - - - - |' +
           'A5 - - - C6 - F6 - E6 - - - C6 - - - | D6 - - - F6 - - - A5 - - - D6 - - - | D6 - - - C6 - Bb5 - A5 - - - G5 - - - | C6 - - - - - - - - - - - . . . .' },
    // soaring heroic power ballad
    etheria: { bpm: 84, kit: 'ballad', fill: 'gated', lead: 'soar', pad: 1, arp: { type: 'bell', rate: 2 },
      bass: { pat: '1.......5...1...', type: 'synth' },
      chords: 'Bb F Gm Eb Bb F Eb F',
      mel: 'D5 - - - F5 - - - Bb5 - - - - - C6 - | C6 - - - A5 - - - F5 - - - - - - - | G5 - - - Bb5 - - - D6 - - - C6 - Bb5 - | Bb5 - - - G5 - - - - - - - Eb5 - F5 - |' +
           'F5 - - - Bb5 - - - D6 - - - F6 - - - | F6 - - - Eb6 - - - C6 - - - A5 - - - | Bb5 - - - G6 - - - F6 - Eb6 - D6 - - - | C6 - - - - - - - - - - - . . . .' },
    // punchy action-cartoon rock anthem, gated-reverb snare
    cobra: { bpm: 140, kit: 'rock', fill: 'gated', lead: 'grit', pad: 1,
      bass: { pat: '1.1.1.1.1.1.1.1.', type: 'power' }, comp: { type: 'stab', pat: 'x.....x.....x...' },
      chords: 'Em C D Em Em C D B',
      mel: 'E5 . E5 . G5 - E5 . B5 - - . A5 - G5 - | E5 . E5 . G5 - E5 . C6 - - . B5 - G5 - | F#5 . F#5 . A5 - F#5 . D6 - - . C6 - A5 - | B5 - - - G5 - - - E5 - - - . . . . |' +
           'E6 - D6 - B5 - G5 - B5 - - - E6 - - - | E6 - D6 - C6 - G5 - C6 - - - E6 - - - | F#6 - E6 - D6 - A5 - D6 - - - F#6 - - - | D#6 - - - B5 - - - F#5 - - - D#5 - - -' },
    // mystic redwood forest
    endor: { bpm: 112, kit: 'forest', fill: 'toms', lead: 'triangle', pad: 1, arp: { type: 'square', rate: 2 },
      bass: { pat: '1..1..5.1..1..8.', type: 'soft' },
      chords: 'Am G F E Am G F E',
      mel: 'E5 - - - A5 - B5 - C6 - - - B5 - A5 - | B5 - - - G5 - - - D5 - - - G5 - - - | A5 - - - F5 - - - C6 - - - A5 - - - | G#5 - - - B5 - - - E5 - - - - - - - |' +
           'E6 - - - D6 - C6 - B5 - - - A5 - - - | D6 - - - B5 - G5 - B5 - - - D6 - - - | C6 - - - A5 - F5 - A5 - C6 - F6 - - - | E6 - - - D6 - - - B5 - - - G#5 - - -' },
    // heroic brass fanfare at a fast orchestral tempo (speeder chase)
    bike: { bpm: 176, kit: 'orch', fill: 'timp', lead: 'brass', arp: { type: 'strings', rate: 1 },
      bass: { pat: '1.1.1.1.1.1.5.8.', type: 'synth' }, comp: { type: 'stab', pat: 'x...........x...' },
      chords: 'D G D A Bm G A D',
      mel: 'D5 - A5 - - - D6 - - - E6 F#6 E6 - D6 - | B5 - - - G5 - D6 - - - B5 A5 G5 - - - | F#5 - A5 - D6 - F#6 - - - E6 - D6 - A5 - | E6 - - - C#6 - - - A5 - - - E5 - - - |' +
           'F#6 - - - D6 - B5 - - - D6 - F#6 - - - | G6 - - - D6 - B5 - - - G5 - B5 - D6 - | E6 - - - A6 - - - G6 - F#6 - E6 - - - | D6 - - - - - - - A5 - D6 - - - . .' },
    // playful tribal celebration: chant call (even bars), marimba answer (odd bars)
    ewok: { bpm: 120, kit: 'ewok', fill: 'ewok', lead: 'chant', lead2: 'marimba', pad: 1,
      bass: { pat: '1...5...1...5.1.', type: 'soft' },
      chords: 'C F C G C F G C',
      mel: 'G5 . G5 . A5 . G5 . E5 . . . G5 . . . | A4 . A4 . C5 . A4 . F4 . . . . . . . | C6 . C6 . D6 . C6 . A5 . G5 . . . . . | D5 . D5 . E5 . D5 . B4 . G4 . . . . . |' +
           'E6 . D6 . C6 . D6 . E6 . . . G6 . . . | F5 . E5 . C5 . E5 . F5 . . . A5 . . . | G6 . E6 . D6 . E6 . D6 . C6 . A5 . . . | G5 . E5 . D5 . . . C5 . . . . . . .' },
    // jaunty swing jazz-band desert cantina
    tatooine: { bpm: 132, swing: 0.32, kit: 'swing', fill: 'snare', lead: 'clarinet',
      bass: { pat: '1...3...5...6...', type: 'upright' }, comp: { type: 'steel', pat: '..x...x...x...xx' },
      chords: 'F D7 Gm C7 Am D7 Gm C7',
      mel: 'C5 . A4 . C5 D5 C5 . A5 - - . G5 . F5 . | F#5 . A5 . C6 - A5 . F#5 . D5 . . . E5 F#5 | G5 . Bb5 . D6 . Bb5 . A5 . G5 . F5 - E5 . | E5 - G5 . Bb5 - G5 . E5 . C5 . . . C5 D5 |' +
           'E5 . A5 . C6 . E6 - D6 . C6 . A5 . . . | F#5 . A5 . D6 . C6 - A5 . F#5 . D5 . . . | Bb5 - A5 . G5 - F5 . D5 . F5 . G5 - Bb5 . | C6 . . . G5 . . . E5 . C5 . . . . .' },
    // Jabba boss: heavy minor-key military march, stomping low brass
    boss: { bpm: 104, kit: 'march', fill: 'timp', lead: 'lowbrass',
      bass: { pat: '1...1...1...1.5.', type: 'low' }, comp: { type: 'stab', pat: 'x...x...x...x...' },
      chords: 'Cm Ab Fm G Cm Ab Fm G',
      mel: 'C4 - - - D4 - Eb4 - G4 - - - F4 - Eb4 - | Eb4 - - - C4 - - - Ab3 - - - C4 - - - | F4 - - - Ab4 - G4 - F4 - - - Eb4 - D4 - | D4 - - - B3 - - - G3 - - - . . . . |' +
           'G4 - - - Ab4 - G4 - Eb4 - - - C4 - - - | Ab4 - - - C5 - Bb4 - Ab4 - - - Eb4 - - - | F4 - - - Eb4 - D4 - C4 - - - D4 - Eb4 - | D4 - - - - - - - B3 - C4 - D4 - - -' },
    // final boss: faster, heavier march
    final: { bpm: 120, kit: 'march2', fill: 'timp', lead: 'lowbrass', arp: { type: 'strings', rate: 1 },
      bass: { pat: '1.1.1.1.1.1.1.5.', type: 'low' }, comp: { type: 'stab', pat: 'x.....x.x.......' },
      chords: 'Bm G Em F# Bm G Em F#',
      mel: 'B4 - - - F#4 - B4 - D5 - - - C#5 - B4 - | D5 - - - B4 - G4 - B4 - D5 - G5 - - - | E5 - - - G5 - F#5 - E5 - - - B4 - - - | C#5 - - - A#4 - - - F#4 - - - C#5 - - - |' +
           'F#5 - - - D5 - - - B4 - D5 - F#5 - B5 - | G5 - - - F#5 - E5 - D5 - - - B4 - - - | E5 - - - G5 - B5 - A#5 - - - G5 - E5 - | F#5 - - - - - - - C#5 - A#4 - F#4 - - -' },
    // space levels: X-wing dogfight (heroic brass)
    space: { bpm: 150, kit: 'orch', fill: 'timp', lead: 'brass', pad: 1, arp: { type: 'strings', rate: 1 },
      bass: { pat: '1.1.1.1.1.1.5.8.', type: 'synth' },
      chords: 'Gm Eb F D Gm Eb Cm D',
      mel: 'G5 - - - D6 - - - - - C6 Bb5 A5 - Bb5 - | G5 - - - Eb5 - - - Bb5 - - - G5 - - - | A5 - - - C6 - - - F6 - - - Eb6 - D6 - | D6 - - - A5 - - - F#5 - - - A5 - - - |' +
           'D6 - - - G6 - - - F6 - Eb6 - D6 - - - | Eb6 - - - Bb5 - - - G5 - Bb5 - Eb6 - - - | C6 - - - Eb6 - D6 - C6 - - - G5 - - - | F#5 - - - A5 - - - D6 - - - . . . .' },
    // trench run: tense pulsing ostinato
    trench: { bpm: 144, kit: 'pulse', fill: 'timp', lead: 'brass', pad: 1, arp: { type: 'square', rate: 1 },
      bass: { pat: '1111111111111111', type: 'synth' },
      chords: 'Em Em C C Am Am B B',
      mel: 'E5 - - . E5 - - . G5 - - . F#5 - - . | E5 - - . E5 - - . B5 - - - A5 - - - | E5 - - . E5 - - . G5 - - . F#5 - - . | E5 - - . G5 - - . C6 - - - B5 - - - |' +
           'A5 - - . A5 - - . C6 - - . B5 - - . | A5 - - . C6 - - . E6 - - - D6 - - - | D#6 - - . B5 - - . F#5 - - . A5 - - . | B5 - - - - - - - F#5 - - - D#5 - - -' },
    // Falcon asteroid field: frantic synth-rock
    asteroids: { bpm: 160, kit: 'drive', fill: 'gated', lead: 'grit', pad: 1, arp: { type: 'square', rate: 1 },
      bass: { pat: '1.11.11.1.11.18.', type: 'power' },
      chords: 'Am F G E Am F Dm E',
      mel: 'A5 . C6 . A5 . E6 - - . D6 . C6 . B5 . | A5 . F5 . A5 . C6 - - . A5 . F5 . G5 . | G5 . B5 . D6 . G6 - - . F6 . D6 . B5 . | G#5 - - - B5 - - - E6 - - - D6 - B5 - |' +
           'C6 . E6 . A6 - - . G6 . E6 . C6 . E6 . | F6 . C6 . A5 . C6 - - . F6 . E6 . C6 . | D6 . F6 . A6 - - . F6 . D6 . A5 . F5 . | E6 - - - B5 - - - G#5 - - - E5 - - -' }
  };
  // loudness trims from offline listen-checks (normalises tracks to a similar RMS)
  var TRIM = { xwing: 1.04, falcon: 1.1, title: 1.04, select: 0.95, rainbow: 0.96, carealot: 0.75, etheria: 1.25, cobra: 1.05, endor: 0.75, bike: 1.0,
               ewok: 1.12, tatooine: 1.12, boss: 1.0, final: 0.85, space: 1.04, trench: 0.98, asteroids: 1.1 };

  Object.keys(T).forEach(function (k) { // pre-parse + validate
    var t = T[k];
    t.ch = t.chords.split(' ').map(chord);
    t.bars = bars(t.mel);
    if (t.ch.length !== t.bars.length) throw new Error('TacoMusic ' + k + ': chords/bars mismatch');
    t.bars.forEach(function (b, i) {
      if (b.length !== STEPS) throw new Error('TacoMusic ' + k + ' bar ' + i + ' has ' + b.length + ' steps');
      b.forEach(function (n) { if (n !== '-' && n !== '.') midi(n); });
    });
  });

  // ---------------- shared buffers ----------------
  var cache = typeof WeakMap !== 'undefined' ? new WeakMap() : null;
  function bufs(ctx) {
    var c = cache && cache.get(ctx);
    if (c) return c;
    var sr = ctx.sampleRate, n = ctx.createBuffer(1, sr | 0, sr), d = n.getChannelData(0), i;
    for (i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    var len = (sr * 1.8) | 0, ir = ctx.createBuffer(2, len, sr);
    for (var ch = 0; ch < 2; ch++) {
      var r = ir.getChannelData(ch);
      for (i = 0; i < len; i++) r[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2) * (i < sr * 0.012 ? i / (sr * 0.012) : 1);
    }
    c = { noise: n, ir: ir };
    if (cache) cache.set(ctx, c);
    return c;
  }

  // ---------------- voice building blocks ----------------
  // B = { ctx, dry, rev } ; every voice ends in an envelope gain routed to dry (+ optional reverb send)
  function outNode(B, g, rev, pan) {
    var node = g;
    if (pan && B.ctx.createStereoPanner) { var p = B.ctx.createStereoPanner(); p.pan.value = pan; g.connect(p); node = p; }
    node.connect(B.dry);
    if (rev) { var s = B.ctx.createGain(); s.gain.value = rev; node.connect(s); s.connect(B.rev); }
  }
  function env(g, t, peak, a, dur, r) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.setValueAtTime(peak, t + Math.max(a, dur - r));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }
  function tone(B, t, f, dur, o, mul) {
    var ctx = B.ctx, g = ctx.createGain(), flt = ctx.createBiquadFilter();
    flt.type = o.ftype || 'lowpass'; flt.Q.value = o.q || 0.7;
    if (o.swell) {
      flt.frequency.setValueAtTime(o.swell[0], t);
      flt.frequency.linearRampToValueAtTime(o.swell[1], t + 0.07);
      flt.frequency.exponentialRampToValueAtTime(o.cut, t + Math.max(0.12, dur));
    } else if (o.sweep) {
      flt.frequency.setValueAtTime(o.sweep, t);
      flt.frequency.exponentialRampToValueAtTime(o.cut, t + Math.min(dur, 0.2));
    } else flt.frequency.value = o.cut || 4000;
    flt.connect(g);
    var dets = o.det || [0], lg = null;
    if (o.vib && dur > 0.25) {
      var l = ctx.createOscillator(); lg = ctx.createGain();
      l.frequency.value = 5.6; lg.gain.setValueAtTime(0, t); lg.gain.setValueAtTime(0, t + 0.15); lg.gain.linearRampToValueAtTime(f * 0.011, t + 0.4);
      l.connect(lg); l.start(t); l.stop(t + dur + 0.05);
    }
    for (var i = 0; i < dets.length; i++) {
      var osc = ctx.createOscillator();
      osc.type = o.type; osc.frequency.setValueAtTime(f, t); osc.detune.value = dets[i];
      if (lg) lg.connect(osc.frequency);
      osc.connect(flt); osc.start(t); osc.stop(t + dur + 0.05);
    }
    env(g, t, (o.gain || 0.2) * (mul || 1) / Math.sqrt(dets.length), o.a || 0.005, dur, o.r || 0.05);
    outNode(B, g, o.rev, o.pan);
  }
  function lead(B, t, m, dur, o) {
    var st = o.stack || [0];
    for (var i = 0; i < st.length; i++) tone(B, t, hz(m + st[i]), dur, o, i ? 0.55 : 1);
    if (o.oct) tone(B, t, hz(m + 12), dur * 0.5, { type: 'sine', gain: 0.24 * o.oct, a: 0.002, r: 0.1, rev: o.rev }); // marimba sparkle
  }
  function bell(B, t, f, dur, v, pan) {
    var ctx = B.ctx, g = ctx.createGain();
    [[1, 1], [2.76, 0.25], [5.4, 0.08]].forEach(function (p) {
      var o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f * p[0];
      var pg = ctx.createGain(); pg.gain.value = p[1]; o.connect(pg); pg.connect(g); o.start(t); o.stop(t + dur + 0.05);
    });
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    outNode(B, g, 0.35, pan);
  }
  function steel(B, t, f, v, pan) { // steel-drum-ish: bright inharmonic partials with a quick pitch settle
    var ctx = B.ctx, g = ctx.createGain();
    [[1, 1], [2, 0.45], [3.02, 0.2], [4.1, 0.08]].forEach(function (p) {
      var o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(f * p[0] * 1.015, t); o.frequency.exponentialRampToValueAtTime(f * p[0], t + 0.04);
      var pg = ctx.createGain(); pg.gain.value = p[1]; o.connect(pg); pg.connect(g); o.start(t); o.stop(t + 0.5);
    });
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
    outNode(B, g, 0.25, pan);
  }
  function noiseHit(B, t, type, freq, q, dur, v, rev, pan, hold) {
    var ctx = B.ctx, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = bufs(ctx).noise; f.type = type; f.frequency.value = freq; f.Q.value = q || 0.7;
    g.gain.setValueAtTime(v, t);
    if (hold) { g.gain.exponentialRampToValueAtTime(v * 0.45, t + hold); g.gain.linearRampToValueAtTime(0.0001, t + hold + 0.025); }
    else g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); outNode(B, g, rev, pan);
    s.start(t, Math.random() * 0.4); s.stop(t + (hold ? hold + 0.05 : dur + 0.02));
  }
  function pitched(B, t, type, f0, f1, fall, dur, v, rev, pan) {
    var ctx = B.ctx, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + fall);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); outNode(B, g, rev, pan); o.start(t); o.stop(t + dur + 0.02);
  }
  var DR = {
    k: function (B, t, v) { pitched(B, t, 'sine', 160, 45, 0.11, 0.3, 0.6 * v); noiseHit(B, t, 'highpass', 3000, 0.7, 0.012, 0.12 * v); },
    s: function (B, t, v) { noiseHit(B, t, 'bandpass', 2000, 0.8, 0.16, 0.42 * v, 0.25, 0.05); pitched(B, t, 'triangle', 230, 150, 0.06, 0.1, 0.35 * v); },
    g: function (B, t, v) { // gated-reverb snare: dense noise body that is cut off hard
      noiseHit(B, t, 'bandpass', 1700, 0.6, 0, 0.5 * v, 0.1, 0, 0.2);
      noiseHit(B, t, 'lowpass', 7000, 0.5, 0, 0.18 * v, 0, 0, 0.2);
      pitched(B, t, 'triangle', 210, 160, 0.08, 0.14, 0.4 * v);
    },
    c: function (B, t, v) { for (var i = 0; i < 3; i++) noiseHit(B, t + i * 0.011, 'bandpass', 1300, 1.2, i === 2 ? 0.14 : 0.01, 0.35 * v, 0.3, -0.1); },
    h: function (B, t, v, s) { noiseHit(B, t, 'highpass', 7500, 0.7, 0.035, (s % 4 === 0 ? 0.13 : 0.09) * v, 0, 0.25); },
    o: function (B, t, v) { noiseHit(B, t, 'highpass', 6500, 0.7, 0.22, 0.09 * v, 0.1, 0.25); },
    z: function (B, t, v, s) { noiseHit(B, t, 'bandpass', 6000, 1.5, 0.05, (s % 2 ? 0.08 : 0.12) * v, 0, -0.3); },
    t: function (B, t, v, s, bar) { var f = [196, 165, 131, 110][(s + bar) % 4]; pitched(B, t, 'sine', f, f * 0.62, 0.2, 0.3, 0.5 * v, 0.25, (s % 3 - 1) * 0.3); },
    w: function (B, t, v, s) { // wood block (two pitches)
      var f = s % 2 ? 1250 : 900;
      pitched(B, t, 'sine', f, f * 0.97, 0.02, 0.07, 0.33 * v, 0.2, s % 2 ? 0.35 : -0.35);
      noiseHit(B, t, 'bandpass', f * 2, 3, 0.012, 0.15 * v);
    },
    l: function (B, t, v, s, bar) { // log drum: woody pitched thump
      var f = [147, 196, 165, 220, 131][(s + bar * 3) % 5];
      pitched(B, t, 'sine', f * 1.08, f, 0.03, 0.22, 0.55 * v, 0.2, (s % 2 ? 0.2 : -0.2));
      pitched(B, t, 'triangle', f * 2.02, f * 2, 0.02, 0.06, 0.12 * v);
    },
    p: function (B, t, v, s, bar, root) { // timpani on the chord root
      var f = hz(root + 12);
      pitched(B, t, 'sine', f * 1.03, f, 0.08, 0.9, 0.55 * v, 0.45);
      pitched(B, t, 'sine', f * 1.5, f * 1.48, 0.08, 0.4, 0.15 * v, 0.45);
      noiseHit(B, t, 'lowpass', 500, 0.7, 0.08, 0.25 * v, 0.3);
    }
  };

  // ---------------- step scheduler ----------------
  function scheduleStep(st, t0) {
    var tr = st.tr, B = st.B, s = st.step % STEPS, bar = Math.floor(st.step / STEPS) % tr.bars.length;
    var sd = 60 / tr.bpm / 4, ch = tr.ch[bar], last = bar === tr.bars.length - 1;
    var t = t0 + (tr.swing && s % 4 === 2 ? tr.swing * sd * 2 : 0);
    // drums (with an end-of-loop fill)
    var kit = KITS[tr.kit], fill = last && tr.fill ? FILLS[tr.fill] : null;
    for (var key in DR) {
      var row = (fill && fill[key]) || kit[key];
      if (row && row[s] === 'x') DR[key](B, t, 1, s, bar, ch[0]);
    }
    // bass
    var bc = tr.bass.pat[s];
    if (bc && bc !== '.') {
      var bm = ch[0] + 12 + (bc === '3' ? ch[1] - ch[0] : (BASSOFF[bc] || 0)), bt = tr.bass.type, len = sd * 0.9;
      if (bt === 'soft') tone(B, t, hz(bm), sd * 1.6, { type: 'triangle', gain: 0.26, cut: 1200, r: 0.06 });
      else if (bt === 'upright') {
        tone(B, t, hz(bm - 12), sd * 3.2, { type: 'triangle', gain: 0.25, cut: 900, a: 0.004, r: 0.25 });
        tone(B, t, hz(bm), sd * 0.8, { type: 'sine', gain: 0.14, cut: 2000, r: 0.1 });
      } else if (bt === 'low') {
        tone(B, t, hz(bm - 12), sd * 2.6, { type: 'sawtooth', gain: 0.16, cut: 420, sweep: 1100, q: 3, r: 0.1 });
        tone(B, t, hz(bm - 12), sd * 2.6, { type: 'sine', gain: 0.1, cut: 400, r: 0.1 });
      } else {
        tone(B, t, hz(bm), len, { type: 'sawtooth', gain: 0.14, cut: 650, sweep: 2200, q: 3, r: 0.03 });
        tone(B, t, hz(bm - 12), len, { type: 'sine', gain: 0.07, cut: 500, r: 0.03 });
        if (bt === 'power') tone(B, t, hz(bm + 7), len, { type: 'sawtooth', gain: 0.07, cut: 900, sweep: 2600, q: 2, r: 0.03 });
      }
    }
    // arpeggio
    if (tr.arp && s % tr.arp.rate === 0) {
      var idx = (s / tr.arp.rate) % 4, am = ch[[0, 1, 2, 3][idx]] + 36, ad = sd * tr.arp.rate, pan = idx % 2 ? 0.35 : -0.35;
      if (tr.arp.type === 'bell') bell(B, t, hz(am + 12), Math.max(0.25, ad * 1.5), 0.05, pan);
      else if (tr.arp.type === 'strings') tone(B, t, hz(am), ad * 0.9, { type: 'sawtooth', gain: 0.03, cut: 1800, det: [-6, 6], r: 0.03, rev: 0.3, pan: pan });
      else tone(B, t, hz(am), ad * 0.55, { type: 'square', gain: 0.04, cut: 2600, r: 0.02, rev: 0.2, pan: pan });
    }
    // comping
    if (tr.comp && tr.comp.pat[s] === 'x') {
      if (tr.comp.type === 'steel') [1, 2, 3].forEach(function (i, j) { steel(B, t + j * 0.012, hz(ch[i] + 36), 0.06, (j - 1) * 0.4); });
      else [0, 1, 2].forEach(function (i, j) { tone(B, t, hz(ch[i] + 24 + (i ? 0 : 12)), sd * 1.6, { type: 'sawtooth', gain: 0.045, cut: 1500, swell: [400, 2600], det: [-8, 8], r: 0.08, rev: 0.35, pan: (j - 1) * 0.4 }); });
    }
    // pad (sustained chord once per bar)
    if (tr.pad && s === 0) {
      [1, 2, 3].forEach(function (i, j) { tone(B, t0, hz(ch[i] + 24), sd * STEPS * 1.02, { type: 'sawtooth', gain: 0.03, cut: 1100, det: [-11, 11], a: 0.35, r: 0.45, rev: 0.6, pan: (j - 1) * 0.5 }); });
    }
    // lead (call-and-response: lead2 plays the odd bars)
    var tok = tr.bars[bar][s];
    if (tok !== '-' && tok !== '.') {
      var n = 1, b = tr.bars[bar];
      while (s + n < STEPS && b[s + n] === '-') n++;
      var L = V[(tr.lead2 && bar % 2) ? tr.lead2 : tr.lead];
      var dur = L.short ? Math.min(L.short, sd * n) : sd * n * 0.97 + (L.r || 0.05) * 0.5; // slight legato overlap
      lead(B, t, midi(tok), dur, L);
    }
    st.step++;
    return sd;
  }

  var cur = null;
  var ALIAS = { xwing: 'space', falcon: 'asteroids' }; // flight/README.md musicKey values
  function makeState(ctx, dest, key) {
    if (!T[key] && !ALIAS[key]) key = 'title';
    var tr = T[ALIAS[key] || key];
    var bus = ctx.createGain(), comp = ctx.createDynamicsCompressor(), dry = ctx.createGain();
    var hp = ctx.createBiquadFilter(), conv = ctx.createConvolver(), wet = ctx.createGain(), revIn = ctx.createGain();
    hp.type = 'highpass'; hp.frequency.value = 35;
    comp.threshold.value = -14; comp.knee.value = 8; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.15;
    var lim = ctx.createDynamicsCompressor(); // safety limiter so peaks stay near PEAK
    lim.threshold.value = -3; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.001; lim.release.value = 0.08;
    dry.gain.value = 0.85 * (TRIM[key] || 1);
    conv.buffer = bufs(ctx).ir; wet.gain.value = 1.6; revIn.gain.value = 0.85 * (TRIM[key] || 1);
    revIn.connect(conv); conv.connect(wet); wet.connect(hp);
    dry.connect(hp); hp.connect(comp); comp.connect(lim); lim.connect(bus);
    bus.gain.value = PEAK; bus.connect(dest || ctx.destination);
    return { tr: tr, key: key, bus: bus, B: { ctx: ctx, dry: dry, rev: revIn }, step: 0, next: 0, timer: null, ctx: ctx };
  }
  function pump() {
    var st = cur; if (!st) return;
    var now = st.ctx.currentTime;
    if (st.next < now - 0.05) st.next = now + 0.05; // resync after hidden tab / suspended context
    while (st.next < now + LOOKAHEAD) st.next += scheduleStep(st, st.next);
  }
  function stop() {
    var st = cur; cur = null;
    if (!st) return;
    clearInterval(st.timer);
    try {
      var t = st.ctx.currentTime;
      st.bus.gain.cancelScheduledValues(t); st.bus.gain.setValueAtTime(st.bus.gain.value, t);
      st.bus.gain.linearRampToValueAtTime(0.0001, t + 0.12);
    } catch (e) {}
    setTimeout(function () { try { st.bus.disconnect(); } catch (e) {} }, 500);
  }
  function start(ctx, dest, worldKey) {
    stop();
    if (!ctx) return;
    try {
      var st = makeState(ctx, dest, worldKey);
      st.next = ctx.currentTime + 0.06;
      cur = st; pump();
      st.timer = setInterval(pump, TICK_MS);
    } catch (e) { cur = null; } // audio must never break the game
  }
  // Test helper: schedule `seconds` of a track up front (for OfflineAudioContext rendering).
  function prerender(ctx, dest, worldKey, seconds) {
    var st = makeState(ctx, dest, worldKey), t = 0.01;
    while (t < seconds) t += scheduleStep(st, t);
    return { loopSeconds: 60 / st.tr.bpm / 4 * STEPS * st.tr.bars.length, start: 0.01 };
  }
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', function () { if (!document.hidden) pump(); });

  root.TacoMusic = {
    start: start, stop: stop, prerender: prerender,
    tracks: Object.keys(T).concat(Object.keys(ALIAS)),
    get current() { return cur ? cur.key : null; }
  };
})(typeof window !== 'undefined' ? window : this);
