/* Taco Strike 80s - FLIGHT LEVEL xw-1: X-wing / Battle of Yavin (flight/xwing.js). Load after flight-core.js.
 * Timeline in seconds of mission time (the clock pauses while a boss is alive and during "hold").
 * Event keys: title/sub, radio/text, phase (space|trench|port|tunnel|escape), wave (tie|interceptor) + n, y (0..1),
 * pattern (straight|sine|dive|v|column), gap, from:'behind'; pickup (heart|salsa|star|taco_shell) + y;
 * hold (wait until the screen is clear); checkpoint (death resumes here); asteroids (spawns/s, 0 = off);
 * boss (vader|reactor); goal (instant win).
 * Pressure ramp: 0-27 s open-space dogfight (light), 30-55 s trench with turrets + diving TIEs (medium),
 * 56 s Vader (3 readable phases), then the torpedo run (skill shot; a miss brings the port around again).
 */
TacoFlight.register({
  id: 'xw-1', aliases: ['xwing'],          // id matches levels/missions.json flight node
  name: 'BATTLE OF YAVIN',
  tagline: 'Red Squadron, lock S-foils in attack position. The Death Star is in range!',
  world: 'starwars', theme: 'space', bg: 'yavin',
  musicKey: 'xwing',                       // Freddie's track; 'trench' also exists for the trench section
  defaultPilot: 'taco',                    // character select passes chewie | ewok | taco | ...
  hull: 5, speed: 260, length: 60,
  fireMul: 1.1, walledFireMul: 1.05, aimSloppy: 0.08, turretDensity: 1.1, dropRate: 0.07,
  ship: { key: 'xwing', r: 20, tail: 44, trail: '#ff6a5a', bolt: '#ff3030',
          guns: [[[30, -24], [30, 24]], [[30, -20], [30, 20]]] },   // alternating wingtip cannon pairs
  bossDefeat: { vader: [['han', "YAHOO! You're all clear, kid! Now let's blow this thing and go home!", 3.6]] },
  events: [
    { t: 0.4, radio: 'red_leader', text: 'All wings report in.' },
    { t: 3.6, radio: 'luke', text: '{call} standing by!' },
    { t: 4.5, wave: 'tie', n: 3, y: 0.35, pattern: 'straight', gap: 0.7 },
    { t: 8,  wave: 'tie', n: 3, y: 0.65, pattern: 'sine' },
    { t: 11, radio: 'biggs', text: 'Here they come! TIEs, low and fast!' },
    { t: 12, wave: 'tie', n: 5, y: 0.5, pattern: 'v' },
    { t: 15, pickup: 'salsa', y: 0.5 },
    { t: 17, wave: 'interceptor', n: 2, pattern: 'dive', gap: 0.8 },
    { t: 20, wave: 'tie', n: 4, y: 0.5, pattern: 'column' },
    { t: 23, wave: 'tie', n: 2, from: 'behind', y: 0.25, pattern: 'straight' },
    { t: 23.5, radio: 'wedge', text: 'Watch your six, {pilot}! Two on your tail!' },
    { t: 25, wave: 'tie', n: 3, y: 0.8, pattern: 'sine' },
    { t: 26, wave: 'interceptor', n: 2, pattern: 'dive', gap: 0.7 },
    { t: 27, hold: true },
    { t: 28, checkpoint: true },
    { t: 28.5, radio: 'red_leader', text: 'We\'re going in. Into the trench, full throttle!' },
    { t: 30, phase: 'trench' },
    { t: 30.5, title: 'THE TRENCH', sub: 'Turbolasers on both walls. Stay in the middle!', dur: 2.4 },
    { t: 35, wave: 'tie', n: 3, y: 0.5, pattern: 'dive', gap: 0.7 },
    { t: 38, pickup: 'heart', y: 0.5 },
    { t: 40, radio: 'gold_leader', text: 'Stay on target... stay on target...' },
    { t: 42, wave: 'interceptor', n: 3, pattern: 'dive', gap: 0.6 },
    { t: 46, wave: 'tie', n: 2, from: 'behind', y: 0.5, pattern: 'straight' },
    { t: 47.5, wave: 'interceptor', n: 2, pattern: 'dive', gap: 0.6 },
    { t: 49, wave: 'tie', n: 3, y: 0.4, pattern: 'sine' },
    { t: 51, pickup: 'star', y: 0.5 },
    { t: 53, hold: true },
    { t: 54, checkpoint: true },
    { t: 54.5, pickup: 'heart', y: 0.5 },
    { t: 55, radio: 'red_leader', text: 'Look out! Fighters coming in at point oh-four!' },
    { t: 57, boss: 'vader' },
    { t: 58, pickup: 'heart', y: 0.45 },
    { t: 58.5, checkpoint: true },
    { t: 59, phase: 'port' },
    { t: 59.5, title: 'TORPEDO RUN', sub: 'Fly low · fire when the reticle turns GREEN on the port', dur: 2.8 },
    { t: 66, wave: 'tie', n: 1, from: 'behind', y: 0.3, pattern: 'straight' },
    { t: 74, wave: 'tie', n: 1, from: 'behind', y: 0.6, pattern: 'straight' }
    // no goal event: the level is won by the torpedo hit (handled in flight-core)
  ]
});
