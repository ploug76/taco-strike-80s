/* Taco Strike 80s - FLIGHT LEVEL: Millennium Falcon / Asteroid field -> Death Star II reactor run (flight/falcon.js).
 * Load after flight-core.js. Event format: see xwing.js header.
 * Most-epic pick: dodge the asteroid field ("Never tell me the odds!"), dive into the half-built Death Star II
 * superstructure, blast the main reactor (shield cycles on/off), then outrun the fireball.
 */
TacoFlight.register({
  id: 'falcon-1', aliases: ['falcon'],    // id matches levels/missions.json flight node
  name: 'THE FALCON RUN',
  world: 'starwars', theme: 'space', bg: 'endor', artTheme: 'endor',
  musicKey: 'falcon',           // ask Freddie; until then 'boss'
  defaultPilot: 'chewbacca',
  hull: 6,
  speed: 280,
  length: 88,
  ship: { key: 'falcon', r: 24, tail: 52, trail: '#7fd9ff', bolt: '#ff5a2a',
          guns: [[[50, -9], [50, 9]]] },                       // quad laser, twin bolts
  bossDefeat: {
    reactor: [['lando', 'Direct hit! Now get out of here before it blows!', 3], ['chewbacca', 'RRRAAAWWWGGHH!', 2]]
  },
  events: [
    { t: 0, title: 'THE FALCON RUN', sub: 'Through the asteroid field to the Death Star II', dur: 3.2 },
    { t: 0, asteroids: 0.9 },
    { t: 1.5, radio: 'c3po', text: 'Sir, the possibility of successfully navigating an asteroid field is approximately 3,720 to 1!', dur: 3.6 },
    { t: 5.2, radio: 'han', text: 'Never tell me the odds!' },
    { t: 8,  wave: 'tie', n: 3, y: 0.3, pattern: 'sine' },
    { t: 11, asteroids: 1.5 },
    { t: 13, wave: 'tie', n: 3, y: 0.7, pattern: 'dive' },
    { t: 15, pickup: 'salsa', y: 0.5 },
    { t: 18, wave: 'interceptor', n: 3, from: 'behind', pattern: 'dive' },
    { t: 19, radio: 'han', text: 'Interceptors on our tail! Chewie, punch it!' },
    { t: 22, asteroids: 2.2 },
    { t: 24, wave: 'tie', n: 5, y: 0.5, pattern: 'v' },
    { t: 28, pickup: 'heart', y: 0.4 },
    { t: 30, asteroids: 0.6 },
    { t: 32, asteroids: 0 },
    { t: 32, hold: true },
    { t: 33, radio: 'ackbar', text: 'The shield is down! Commence attack on the Death Star\'s main reactor!' },
    { t: 36, radio: 'lando', text: 'We\'re going in! Stay close, it\'s tight in here!' },
    { t: 37, phase: 'tunnel' },
    { t: 42, wave: 'interceptor', n: 2, from: 'behind', pattern: 'dive' },
    { t: 46, wave: 'tie', n: 3, y: 0.5, pattern: 'column' },
    { t: 50, pickup: 'star', y: 0.5 },
    { t: 52, wave: 'interceptor', n: 3, pattern: 'dive', gap: 0.5 },
    { t: 57, pickup: 'heart', y: 0.5 },
    { t: 58, hold: true },
    { t: 59, radio: 'lando', text: 'There it is! The main reactor! Shoot when the shield drops!' },
    { t: 60, phase: 'space' },
    { t: 61, boss: 'reactor' },
    { t: 62, phase: 'escape' },
    { t: 62.5, title: 'IT\'S GONNA BLOW!', sub: 'Outrun the fireball!', dur: 2.5 },
    { t: 70, wave: 'interceptor', n: 2, pattern: 'dive' },
    { t: 80, radio: 'lando', text: 'YEEHAAA!', dur: 2 },
    { t: 82, goal: true }
  ]
});
