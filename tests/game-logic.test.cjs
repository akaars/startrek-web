const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = `${fs.readFileSync('app.js', 'utf8')}
globalThis.__sst = { newGame, cell, dir, move, moveTo, warpTo, fire, ensureLayout, visibleSector, command, helpText, get game() { return game; } };`;
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
for (const quadrant of game.map) { quadrant.layout = Array(100).fill('.'); quadrant.k = 0; }
game.pos = { qx: 4, qy: 4, sx: 5, sy: 5 };

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
sst.fire('phaser');
assert.equal(current.k, 0, 'a destroyed enemy must be removed from quadrant state');
assert.equal(current.layout.includes('K'), false, 'a destroyed enemy must disappear from the rendered sector');

sst.command('help move');
assert.match(game.output.text, /move n 2/, 'contextual help must document the requested command');
assert.match(sst.helpText('warp'), /Варп-переход/, 'modal and command help share the same localized content');
console.log('game logic tests: passed');
