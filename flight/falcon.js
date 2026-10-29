/* Taco Strike 80s - FLIGHT LEVEL falcon-1: Millennium Falcon (flight/falcon.js). Load after flight-core.js.
 * Event format: see xwing.js. Most-epic pick: asteroid field ("Never tell me the odds!") -> dive into the half-built
 * Death Star II superstructure -> main reactor (shield cycles; 3 phases) -> outrun the fireball.
 * Pressure ramp: 0-14 s light rocks, 14-32 s dense field + TIEs (medium), 37-58 s narrow tunnel with girders +
 * interceptors on your tail (hard), reactor boss, then the escape (fast scroll, girders, fireball behind you).
 */
TacoFlight.register({
  id: 'falcon-1', aliases: ['falcon'],    // id matches levels/missions.json flight node
  name: 'THE FALCON RUN',
  tagline: 'Punch it through the asteroid field, then fly into the Death Star II and hit the main reactor!',
  world: 'starwars', theme: 'space', bg: 'endor',
  musicKey: 'falcon',                      // Freddie's track; 'asteroids' also exists for the rock section
  defaultPilot: 'chewbacca',
  hull: 5, speed: 280, length: 62,
  fireMul: 0.95, walledFireMul: 1.1, aimSloppy: 0.1, dropRate: 0.07,
  ship: { key: 'falcon', r: 24, tail: 52, trail: '#7fd9ff', bolt: '#ff5a2a',
          guns: [[[50, -9], [50, 9]]] },                       // quad laser: twin bolts
  bossDefeat: { reactor: [['lando', 'Direct hit! Now get out of here before it blows!', 3], ['chewbacca', 'RRRAAAWWWGGHH!', 2]] },
  events: [
    { t: 0, asteroids: 0.5 },
    { t: 1.2, radio: 'c3po', text: 'Sir, the possibility of successfully navigating an asteroid field is approximately 3,720 to 1!', dur: 3.6 },
    { t: 5, radio: 'han', text: 'Never tell me the odds!' },
    { t: 8,  wave: 'tie', n: 3, y: 0.3, pattern: 'sine' },
    { t: 12, asteroids: 0.9 },
    { t: 13, wave: 'tie', n: 3, y: 0.7, pattern: 'dive' },
    { t: 15, pickup: 'salsa', y: 0.5 },
    { t: 18, wave: 'interceptor', n: 2, from: 'behind', pattern: 'dive' },
    { t: 18.5, radio: 'han', text: 'Interceptors on our tail! Chewie, punch it!' },
    { t: 22, asteroids: 1.1 },
    { t: 24, wave: 'tie', n: 5, y: 0.5, pattern: 'v' },
    { t: 27, pickup: 'heart', y: 0.4 },
    { t: 29, asteroids: 0.5 },
    { t: 32, asteroids: 0 },
    { t: 32, hold: true },
    { t: 33, checkpoint: true },
    { t: 33.5, radio: 'ackbar', text: 'The shield is down! Commence attack on the Death Star\'s main reactor!' },
    { t: 36, radio: 'lando', text: 'We\'re going in! Stay close, it\'s tight in here!' },
    { t: 37, phase: 'tunnel' },
    { t: 37.5, title: 'INTO THE DEATH STAR', sub: 'Dodge the girders · watch your tail', dur: 2.4 },
    { t: 42, wave: 'interceptor', n: 2, from: 'behind', pattern: 'dive' },
    { t: 46, wave: 'tie', n: 3, y: 0.5, pattern: 'column' },
    { t: 48, wave: 'interceptor', n: 2, from: 'behind', pattern: 'dive' },
    { t: 50, pickup: 'star', y: 0.5 },
    { t: 51, radio: 'lando', text: 'More of them behind us! Keep moving!' },
    { t: 52, wave: 'interceptor', n: 3, pattern: 'dive', gap: 0.6 },
    { t: 54.5, wave: 'tie', n: 3, y: 0.5, pattern: 'sine' },
    { t: 56, pickup: 'heart', y: 0.5 },
    { t: 57, hold: true },
    { t: 58, checkpoint: true },
    { t: 58.5, pickup: 'heart', y: 0.5 },
    { t: 59, radio: 'lando', text: 'There it is! The main reactor! Shoot when the shield drops!' },
    { t: 60, phase: 'space' },
    { t: 61, boss: 'reactor' },
    { t: 61.5, checkpoint: true },
    { t: 62, phase: 'escape' },
    { t: 62.3, title: 'IT\'S GONNA BLOW!', sub: 'Outrun the fireball!', dur: 2.4 },
    { t: 67, wave: 'interceptor', n: 2, pattern: 'dive', gap: 0.8 },
    { t: 72, wave: 'interceptor', n: 2, from: 'behind', pattern: 'dive' },
    { t: 75, wave: 'interceptor', n: 3, pattern: 'dive', gap: 0.6 },
    { t: 80, radio: 'lando', text: 'YEEHAAA!', dur: 2 },
    { t: 82, goal: true }
  ]
});
