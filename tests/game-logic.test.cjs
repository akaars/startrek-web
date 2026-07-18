const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = `${fs.readFileSync('app.js', 'utf8')}
globalThis.__sst = { newGame, cell, dir, move, moveTo, warpTo, fire, shields, dock, orbit, transport, mine, scan, galaxyText, gameTemplate, actionsTemplate, crystalsModal, ensureLayout, visibleSector, command, helpText, setLanguage, get game() { return game; } };`;
const storage = new Map();
const math = Object.create(Math);
let seed = 123456789;
math.random = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 0x100000000;
};
const sandbox = { console, Math: math, localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) } };
vm.runInNewContext(source, sandbox, { filename: 'app.js' });
const sst = sandbox.__sst;

sst.newGame({ length: 2, skill: 2, name: 'TEST' });
const game = sst.game;
assert.match(sst.gameTemplate(), /https:\/\/github\.com\/akaars\/startrek-web/, 'game footer must link to the project repository');
assert.match(sst.actionsTemplate(), /data-action="crystals"/, 'Tactical Deck must expose a crystals action');
assert.match(sst.crystalsModal(), /crystals confirm/, 'crystals action must require explicit confirmation');
for (const quadrant of game.map) { quadrant.layout = Array(100).fill('.'); quadrant.k = 0; }
game.pos = { qx: 4, qy: 4, sx: 5, sy: 5 };

for (const quadrant of game.map) { quadrant.known = false; quadrant.planetKnown = false; }
const scannedIntel = sst.cell(3, 3);
scannedIntel.k = 2; scannedIntel.base = true; scannedIntel.stars = 4;
const scannedPlanet = sst.cell(5, 5);
scannedPlanet.planet = true;
scannedPlanet.planetClass = 2;
scannedPlanet.crystalsAvailable = true;
sst.scan();
for (let y = 3; y <= 5; y += 1) for (let x = 3; x <= 5; x += 1) assert.equal(sst.cell(x, y).known, true, 'long-range scan must reveal its 3×3 neighbourhood');
assert.equal(sst.cell(2, 2).known, false, 'long-range scan must not reveal distant quadrants');
assert.equal(scannedPlanet.planetKnown, true, 'long-range scan must survey planets in range');
assert.match(game.output.text, /LONG-RANGE SCAN/, 'long-range scan must report its new role');
assert.match(game.output.text, /214·/, 'long-range scan must report enemies, bases, and stars for scanned quadrants');
assert.match(sst.galaxyText(), /P/, 'surveyed planets must be marked on the galaxy chart');
assert.equal(sst.galaxyText().split('\n')[1].indexOf('1'), 6, 'star-chart column labels must be centred over the first grid cell');

assert.equal(sst.dir('n')[0], 0, 'north must preserve X');
assert.equal(sst.dir('n')[1], -1, 'north must point toward the top row');
sst.move(0, -1, false, 2);
assert.equal(game.pos.sy, 3, 'move n 2 must move two sectors upward');
assert.equal(game.pos.sx, 5, 'north movement must preserve X');

sst.moveTo(4, 4, 1, 1);
assert.equal(game.pos.sx, 1, 'move X Y must accept direct sector coordinates');
assert.equal(game.pos.sy, 1, 'move X Y must reach the supplied Y coordinate');

game.pos = { qx: 4, qy: 4, sx: 2, sy: 2 };
sst.cell().layout[4 * 10 + 4] = '*';
sst.moveTo(4, 4, 6, 6);
assert.equal(game.pos.sx, 4, 'an obstacle must stop a direct route before its cell');
assert.equal(game.pos.sy, 4, 'an obstacle must stop a direct route before its cell');

sst.warpTo(5, 2);
assert.equal(game.pos.qx, 5, 'warp X Y must reach the requested quadrant X');
assert.equal(game.pos.qy, 2, 'warp X Y must reach the requested quadrant Y');

const planetQuadrant = sst.cell();
planetQuadrant.k = 0;
planetQuadrant.planet = true;
planetQuadrant.planetClass = 1;
planetQuadrant.crystalsAvailable = true;
planetQuadrant.planetKnown = true;
planetQuadrant.layout = Array(100).fill('.');
planetQuadrant.layout[(4 - 1) * 10 + (5 - 1)] = 'P';
game.pos = { qx: 5, qy: 2, sx: 4, sy: 4 };
game.shieldsUp = false;
sst.orbit();
assert.equal(game.inOrbit, true, 'Enterprise can enter standard orbit beside a planet');
sst.transport();
assert.equal(game.landed, true, 'transport beams the landing party down');
sst.mine();
assert.equal(game.pendingCrystals, true, 'mining gives dilithium crystals to the landing party');
sst.transport();
assert.equal(game.landed, false, 'transport returns the landing party to the ship');
assert.equal(game.crystals, true, 'returning from the planet transfers the crystals to Enterprise');

const layout = sst.ensureLayout(sst.cell());
layout[0] = '*';
const before = [...layout];
sst.visibleSector();
assert.deepEqual(sst.ensureLayout(sst.cell()), before, 'scanning/rendering must not regenerate the sector');

const current = sst.cell();
current.k = 1;
current.layout = Array(100).fill('.');
current.layout[0] = 'K';
game.energy = 5000;
const timeBeforeKill = game.time;
sst.fire('photon');
assert.equal(current.k, 0, 'a destroyed enemy must be removed from quadrant state');
assert.equal(current.layout.includes('K'), false, 'a destroyed enemy must disappear from the rendered sector');
assert.equal(game.time, timeBeforeKill + 1, 'destroying an enemy ship must add one day to the remaining mission time');

game.shieldsUp = true;
sst.shields();
assert.equal(game.shieldsUp, false, 'the shields action must lower raised shields');
sst.shields();
assert.equal(game.shieldsUp, true, 'the shields action must raise lowered shields');

current.layout = Array(100).fill('.');
current.layout[(5 - 1) * 10 + (6 - 1)] = 'B';
game.pos = { qx: current.x, qy: current.y, sx: 5, sy: 5 };
game.energy = 73; game.shields = 9; game.torps = 1;
sst.dock();
assert.equal(game.energy, 5000, 'docking beside a starbase must restore energy');
assert.equal(game.shields, 2500, 'docking beside a starbase must restore shields');
assert.equal(game.torps, 10, 'docking beside a starbase must replenish torpedoes');

sst.command('help move');
assert.match(game.output.text, /move n 2/, 'contextual help must document the requested command');
assert.match(sst.helpText('warp'), /Warp movement/, 'English must be the default language for help');
assert.match(sst.helpText('warp'), /Warp factor/, 'warp help must explain warp-factor control');
assert.match(sst.helpText(), /orbit · transport · mine · crystals · planets/, 'general help must include the planet commands');
sst.command('help m');
assert.match(game.output.text, /No help entry exists/, 'help must not expand a one-letter execution alias');
sst.setLanguage('ru');
assert.match(sst.helpText('warp'), /Варп-переход/, 'Russian help must be available when selected');
sst.scan();
assert.match(game.output.text, /ДАЛЬНЕЕ СКАНИРОВАНИЕ/, 'Russian long-range scan output must be translated');
sst.setLanguage('en');

sst.newGame({ length: 2, skill: 2, name: 'ALIAS' });
const aliasGame = sst.game;
for (const quadrant of aliasGame.map) { quadrant.layout = Array(100).fill('.'); quadrant.k = 0; }
aliasGame.pos = { qx: 4, qy: 4, sx: 5, sy: 5 };
sst.command('m 2 2');
assert.equal(aliasGame.pos.sx, 2, 'm must invoke move with sector coordinates');
assert.equal(aliasGame.pos.sy, 2, 'm must preserve the move coordinate order');
assert.match(aliasGame.output.text, /IMPULSE/, 'English movement updates must be emitted in English');
sst.command('w 3');
assert.equal(aliasGame.warp, 3, 'w with one number must set the warp factor');
assert.match(aliasGame.output.text, /Warp factor set to 3/, 'warp-factor confirmation must be emitted in English');
sst.command('warp 11');
assert.equal(aliasGame.warp, 3, 'invalid warp factors must not change the current setting');
assert.match(aliasGame.output.text, /whole number from 1 to 10/, 'invalid warp factors must explain the valid range');
sst.command('w 5 2');
assert.equal(aliasGame.pos.qx, 5, 'w must invoke warp with quadrant coordinates');
assert.equal(aliasGame.pos.qy, 2, 'w must preserve the warp coordinate order');
assert.match(aliasGame.output.text, /WARP/, 'English warp updates must be emitted in English');
aliasGame.pos = { qx: 4, qy: 4, sx: 5, sy: 5 };
aliasGame.energy = 5000; aliasGame.time = 10;
sst.command('warp 1');
sst.warpTo(5, 4);
const slowWarpTime = 10 - aliasGame.time;
aliasGame.pos = { qx: 4, qy: 4, sx: 5, sy: 5 };
aliasGame.energy = 5000; aliasGame.time = 10;
sst.command('warp 10');
sst.warpTo(5, 4);
const fastWarpTime = 10 - aliasGame.time;
assert.ok(fastWarpTime < slowWarpTime, 'higher warp factors must complete the same jump faster');
sst.command('save');
assert.match(aliasGame.output.text, /Mission state saved/, 'English command updates must be emitted in English');
aliasGame.time = 0.1;
sst.command('rest');
assert.match(aliasGame.output.text, /MISSION ENDED/, 'English end-of-mission output must use an English heading');
assert.match(aliasGame.output.text, /Final score:/, 'English end-of-mission output must use an English summary');
assert.doesNotMatch(aliasGame.output.text, /[А-Яа-яЁё]/, 'English end-of-mission output must not contain Russian text');
const endedStardate = aliasGame.stardate;
sst.command('rest');
assert.equal(aliasGame.stardate, endedStardate, 'a completed mission must not accept further commands');
console.log('game logic tests: passed');
