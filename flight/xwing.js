/* Taco Strike 80s - FLIGHT LEVEL: X-wing / Battle of Yavin (flight/xwing.js). Load after flight-core.js.
 * Timeline is in seconds of mission time (the clock pauses while a boss is alive and during "hold").
 * Event keys: title/sub, radio/text, phase (space|trench|port|tunnel|escape), wave (tie|interceptor) + n/y(0..1)/pattern
 * (straight|sine|dive|v|column)/gap/from:'behind', pickup (heart|salsa|star|taco_shell) + y, hold (wait until the screen is clear),
 * asteroids (spawns per second, 0 = off), boss (vader|reactor), goal (instant win).
 * Win condition here: the proton torpedo goes down the exhaust port during phase 'port'.
 */
TacoFlight.register({
  id: 'xw-1', aliases: ['xwing'],          // id matches levels/missions.json flight node
  name: 'BATTLE OF YAVIN',
  world: 'starwars', theme: 'space', bg: 'yavin', artTheme: 'yavin',
  musicKey: 'xwing',            // ask Freddie; until then the lead can fall back to 'boss'
  defaultPilot: 'taco',         // character select can pass chewbacca | ewok | taco | luke
  hull: 5,
  speed: 260,
  length: 74,                   // seconds of timeline, for the progress bar
  ship: { key: 'xwing', r: 20, tail: 44, trail: '#ff6a5a', bolt: '#ff3030',
          guns: [[[30, -24], [30, 24]], [[30, -20], [30, 20]]] },   // alternating wingtip cannon pairs
  bossDefeat: {
    vader: [['han', "YAHOO! You're all clear, kid! Now let's blow this thing and go home!", 3.6]]
  },
  events: [
    { t: 0, title: 'BATTLE OF YAVIN', sub: 'Red Squadron: lock S-foils in attack position!', dur: 3.2 },
    { t: 0.5, radio: 'red_leader', text: 'All wings report in.' },
    { t: 3.2, radio: 'luke', text: '{call} standing by. Let\'s taco this thing!' },
    { t: 4,  wave: 'tie', n: 3, y: 0.3, pattern: 'sine' },
    { t: 7,  wave: 'tie', n: 3, y: 0.7, pattern: 'sine' },
    { t: 10, radio: 'biggs', text: 'Here they come! TIEs, low and fast!' },
    { t: 11, wave: 'tie', n: 5, y: 0.5, pattern: 'v' },
    { t: 14, pickup: 'salsa', y: 0.5 },
    { t: 16, wave: 'interceptor', n: 3, pattern: 'dive', gap: 0.6 },
    { t: 19, wave: 'tie', n: 4, y: 0.5, pattern: 'column' },
    { t: 22, wave: 'tie', n: 2, from: 'behind', y: 0.25, pattern: 'straight' },
    { t: 23, radio: 'wedge', text: 'Watch your six, {pilot}! Two on your tail!' },
    { t: 25, wave: 'tie', n: 4, y: 0.8, pattern: 'sine' },
    { t: 27, hold: true },
    { t: 28, radio: 'red_leader', text: 'We\'re going in. Into the trench, full throttle!' },
    { t: 30, phase: 'trench' },
    { t: 34, wave: 'tie', n: 3, y: 0.5, pattern: 'dive' },
    { t: 38, pickup: 'heart', y: 0.5 },
    { t: 40, radio: 'gold_leader', text: 'Stay on target... stay on target...' },
    { t: 42, wave: 'interceptor', n: 3, pattern: 'dive', gap: 0.5 },
    { t: 47, wave: 'tie', n: 3, from: 'behind', y: 0.5, pattern: 'straight' },
    { t: 50, pickup: 'star', y: 0.5 },
    { t: 53, hold: true },
    { t: 54, radio: 'red_leader', text: 'Look out! Fighters coming in at point oh-four!' },
    { t: 56, boss: 'vader' },
    { t: 58, pickup: 'heart', y: 0.45 },
    { t: 59, phase: 'port' },
    { t: 60, radio: 'red_leader', text: 'Switch to TORPEDO. Fire when the exhaust port is under you!' }
    // no goal event: the level is won by the torpedo hit (handled in flight-core)
  ]
});
