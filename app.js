/* Browser adaptation of the C game in sstsrc. No server-side state is required. */
const STORE = 'sst-web-mission-v2';
const $ = (selector, root = document) => root.querySelector(selector);
const rand = (n = 1) => Math.random() * n;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const SHORT_COMMANDS = { m: 'move', w: 'warp', s: 'shields', p: 'phasers', t: 'photons' };
let game = null;
let ui = { screen: 'intro', view: 'console', music: false, helpOpen: false, commandHistory: [], historyIndex: 0, commandDraft: '' };

const HELP = {
  overview: ['СПРАВКА ПО МИССИИ', 'Цель — уничтожить весь вражеский флот до окончания выделенного времени. Галактика состоит из 8×8 квадрантов; каждый квадрант — из 10×10 секторов. Код на карте: враги / база / звёзды. Состояние автоматически сохраняется в браузере.'],
  scan: ['help scan', 'Показывает краткое сканирование текущего квадранта: местоположение Enterprise, врагов, звёзд, планет и базы. Экран сканирования не накапливается: в Console всегда остаётся только результат последней команды. Синоним: srscan.'],
  chart: ['help chart', 'Показывает известную часть галактики. В каждой ячейке три цифры: враги / база / звёзды. Неизведанные квадранты отмечены «···». Синоним: lrscan.'],
  move: ['help move', 'Импульсное перемещение по секторам. Формат направления: move <n|s|e|w|ne|nw|se|sw> [число], например move n 2. Формат координат: move <sector X> <sector Y>, например move 1 1. Для цели в другом квадранте: move <quadrant X> <quadrant Y> <sector X> <sector Y>, например move 2 1 5 5. Корабль проходит прямой маршрут и останавливается перед любым объектом на пути. Синоним: impulse.\n\nКороткий вызов: m. Пример: m 2 2.'],
  warp: ['help warp', 'Варп-переход. Формат направления: warp <n|s|e|w|ne|nw|se|sw>. Также можно указать целевой квадрант напрямую: warp <quadrant X> <quadrant Y>, например warp 5 2. Enterprise прибывает в ближайший свободный сектор центра указанного квадранта.\n\nКороткий вызов: w. Пример: w 5 2.'],
  phasers: ['help phasers', 'Расходует энергию, чтобы нанести урон всем вражеским судам в квадранте. После залпа карта сразу обновится: уничтоженные корабли исчезают.\n\nКороткий вызов: p.'],
  photons: ['help photons', 'Выпускает одну фотонную торпеду; её урон выше, но запас ограничен. Команда: photons. После залпа карта сразу обновится. Синоним: torpedoes.\n\nКороткий вызов: t.'],
  shields: ['help shields', 'Поднимает или опускает щиты. Команда shields переключает состояние. Щиты поглощают вражеский огонь, пока не иссякнут.\n\nКороткий вызов: s.'],
  dock: ['help dock', 'Стыковка возможна, когда Enterprise находится в соседнем секторе от B (starbase). Команда полностью восстанавливает энергию, щиты и торпеды.'],
  orbit: ['help orbit', 'Войдите в стандартную орбиту вокруг планеты P. Enterprise должен находиться в соседнем секторе с планетой, а посадочная группа — на борту. Повторная команда orbit выводит корабль из орбиты.'],
  transport: ['help transport', 'Транспортировка посадочной группы. Требуется стандартная орбита, опущенные щиты и известная планета. Команда transport высаживает группу; повторная transport возвращает её на Enterprise.'],
  mine: ['help mine', 'Добыча дилития на поверхности. Требуется высаженная посадочная группа и планета с кристаллами. Операция занимает звёздное время, после чего сырые кристаллы окажутся на Enterprise.'],
  crystals: ['help crystals', 'Активирует добытые кристаллы для аварийного восстановления энергии, когда энергия ниже 1000. Сначала команда выводит предупреждение; для подтверждения введите crystals confirm. Операция опасна.'],
  planets: ['help planets', 'Выводит перечень обследованных планет, их класс и данные о дилитии. Планета становится известной после короткого сканирования или входа в орбиту.'],
  rest: ['help rest', 'Проходит 0.5 звёздной даты и частично восстанавливает энергию. Не отдыхайте в квадранте с врагами: они могут открыть огонь.'],
  status: ['help status', 'Показывает дату, оставшееся время, позицию, состояние корабля, энергию, щиты, торпеды и прогресс миссии. Синоним: report.'],
  save: ['help save', 'Принудительно сохраняет миссию в localStorage браузера. Обычно этого не требуется: сохранение выполняется автоматически после каждого действия. Синоним: freeze.'],
  quit: ['help quit', 'Приостанавливает текущую миссию. Состояние остаётся сохранённым — его можно продолжить с заставки.'],
};

function makeMap(length, skill) {
  const map = [];
  const baseCount = 2 + Math.floor(rand(3));
  const duration = 7 * length;
  for (let y = 1; y <= 8; y += 1) for (let x = 1; x <= 8; x += 1) {
    const planet = rand() > 0.85;
    map.push({ x, y, stars: 1 + Math.floor(rand(8)), k: 0, base: false, planet, planetClass: planet ? 1 + Math.floor(rand(3)) : null, crystalsAvailable: planet && rand() > 0.66, planetKnown: false, known: false, layout: null });
  }
  const bases = [];
  while (bases.length < baseCount) {
    const target = map[Math.floor(rand(map.length))];
    if (!target.base) { target.base = true; bases.push(target); }
  }
  const enemies = Math.max(6, Math.round(2 * duration * ((skill + 1 - 2 * rand()) * skill * 0.1 + 0.15)));
  for (let i = 0; i < enemies; i += 1) map[Math.floor(rand(map.length))].k += 1;
  return { map, baseCount, enemies };
}

function putRandom(layout, symbol) {
  let index;
  do { index = Math.floor(rand(100)); } while (layout[index] !== '.');
  layout[index] = symbol;
}

function ensureLayout(quadrant) {
  if (Array.isArray(quadrant.layout)) return quadrant.layout;
  const layout = Array.from({ length: 100 }, () => '.');
  for (let i = 0; i < quadrant.stars; i += 1) putRandom(layout, '*');
  for (let i = 0; i < quadrant.k; i += 1) putRandom(layout, i === 0 && quadrant.k > 2 ? 'C' : 'K');
  if (quadrant.base) putRandom(layout, 'B');
  if (quadrant.planet) putRandom(layout, 'P');
  quadrant.layout = layout;
  return layout;
}

function findEmpty(layout) {
  const options = layout.map((value, index) => value === '.' ? index : -1).filter(index => index >= 0);
  return options[Math.floor(rand(options.length))];
}
function findNearestEmpty(layout, x = 5, y = 5) {
  return layout.map((symbol, index) => ({ symbol, index, x: index % 10 + 1, y: Math.floor(index / 10) + 1 }))
    .filter(item => item.symbol === '.')
    .sort((left, right) => Math.hypot(left.x - x, left.y - y) - Math.hypot(right.x - x, right.y - y))[0]?.index;
}
function ensurePlanetData(quadrant) {
  if (!quadrant.planet) return;
  if (!quadrant.planetClass) quadrant.planetClass = ((quadrant.x * 3 + quadrant.y) % 3) + 1;
  if (typeof quadrant.crystalsAvailable !== 'boolean') quadrant.crystalsAvailable = (quadrant.x * 17 + quadrant.y * 11) % 3 === 0;
  if (typeof quadrant.planetKnown !== 'boolean') quadrant.planetKnown = false;
}

function cell(x = game.pos.qx, y = game.pos.qy) { return game.map.find(item => item.x === x && item.y === y); }
function localIndex(pos = game.pos) { return (pos.sy - 1) * 10 + (pos.sx - 1); }
function visibleSector() {
  const sector = [...ensureLayout(cell())];
  sector[localIndex()] = 'E';
  return sector;
}
function loadQuadrant(silent = false) {
  const quadrant = cell();
  ensureLayout(quadrant);
  quadrant.known = true;
  game.sector = visibleSector();
  updateCondition();
  if (!silent) output(`Вход в квадрант ${game.pos.qx},${game.pos.qy}.`, 'system');
}

function newGame({ length = 2, skill = 2, name = 'КАПИТАН' }) {
  const init = makeMap(length, skill);
  const start = init.map[Math.floor(rand(init.map.length))];
  const startLayout = ensureLayout(start);
  const startIndex = findEmpty(startLayout);
  const pos = { qx: start.x, qy: start.y, sx: startIndex % 10 + 1, sy: Math.floor(startIndex / 10) + 1 };
  game = {
    version: 2, name, length, skill, stardate: 2000 + Math.floor(rand(200)), time: 7 * length,
    energy: 5000, shields: 2500, shieldsUp: true, torps: 10, warp: 5, condition: 'GREEN', pos,
    map: init.map, kills: 0, initialEnemies: init.enemies, bases: init.baseCount, inOrbit: false, landed: false, crystals: false, pendingCrystals: false, minedPlanets: [], log: [], output: null, sector: [], ended: false,
  };
  loadQuadrant(true);
  ui.commandHistory = []; ui.historyIndex = 0; ui.commandDraft = '';
  output(`STARDATE ${Math.floor(game.stardate)}.\n${game.initialEnemies} вражеских кораблей угрожают Федерации.\nВы — ${game.name}, командир U.S.S. Enterprise.\n\nМиссия: уничтожить флот до истечения ${game.time.toFixed(1)} звёздных дат. Базы снабжения: ${game.bases}.`, 'heading');
  save();
}

function output(text, kind = '') {
  const item = { text, kind };
  game.output = item;
  game.log.push(item);
  if (game.log.length > 60) game.log.shift();
}
function updateCondition() {
  const quadrant = cell();
  game.condition = quadrant.k ? 'RED' : game.energy < 1000 ? 'YELLOW' : 'GREEN';
}
function save() { if (game) localStorage.setItem(STORE, JSON.stringify({ game, ui: { view: ui.view, music: ui.music } })); }
function resume() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE));
    if (!saved?.game) return false;
    game = saved.game;
    // Upgrade the first saved prototype where sector layout was deliberately transient.
    game.map.forEach(quadrant => { if (!Array.isArray(quadrant.layout)) quadrant.layout = null; ensurePlanetData(quadrant); });
    game.inOrbit ??= false; game.landed ??= false; game.crystals ??= false; game.pendingCrystals ??= false; game.minedPlanets ??= [];
    ui.view = saved.ui?.view || 'console'; ui.music = !!saved.ui?.music; ui.screen = 'game'; ui.helpOpen = false; ui.commandHistory = []; ui.historyIndex = 0; ui.commandDraft = '';
    loadQuadrant(true); if (!game.output) output(statusText(), 'system'); render(); return true;
  } catch { return false; }
}
function clearSave() { localStorage.removeItem(STORE); }
function spendTime(amount) {
  game.stardate += amount; game.time -= amount;
  if (game.time > 0) return false;
  game.time = 0; end('Время Федерации исчерпано. Вторжение победило.'); return true;
}
function renderSectorText() {
  const sector = visibleSector();
  let text = '    1 2 3 4 5 6 7 8 9 10\n';
  for (let y = 1; y <= 10; y += 1) text += `${String(y).padStart(2)}  ${sector.slice((y - 1) * 10, y * 10).join(' ')}\n`;
  return text.trimEnd();
}
function scan() {
  const quadrant = cell(); quadrant.known = true; game.sector = visibleSector(); ensurePlanetData(quadrant);
  if (quadrant.planet) quadrant.planetKnown = true;
  const planetReport = quadrant.planet ? `\nПланета класса ${['M', 'N', 'O'][quadrant.planetClass - 1]}; дилитий: ${quadrant.crystalsAvailable ? 'обнаружен' : 'не обнаружен'}.` : '';
  output(`КРАТКИЙ СКАН — квадрант ${game.pos.qx},${game.pos.qy}\n${renderSectorText()}\n${quadrant.k ? `Обнаружено вражеских судов: ${quadrant.k}.` : 'Пространство спокойно.'}${planetReport}`, 'system');
}
function chart() {
  output(`${galaxyText()}\n\nКод каждой ячейки: враги / база / звёзды.`, 'system');
}
function galaxyText() {
  const lines = ['ЗВЁЗДНАЯ КАРТА', '     1   2   3   4   5   6   7   8'];
  for (let y = 1; y <= 8; y += 1) {
    const row = [];
    for (let x = 1; x <= 8; x += 1) { const quadrant = cell(x, y); row.push(quadrant.known ? `${quadrant.k}${quadrant.base ? 1 : 0}${quadrant.stars}` : '...'); }
    lines.push(`${String(y).padStart(2)}   ${row.map(value => value.padStart(3)).join(' ')}`);
  }
  return lines.join('\n');
}
function dir(direction) { return ({ n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0], ne: [1, -1], nw: [-1, -1], se: [1, 1], sw: [-1, 1] })[direction]; }
function commandFailure(text) { output(text, 'alert'); save(); render(); }
function globalPoint(position) { return { x: (position.qx - 1) * 10 + position.sx, y: (position.qy - 1) * 10 + position.sy }; }
function positionFromGlobal(x, y) { return { qx: Math.floor((x - 1) / 10) + 1, qy: Math.floor((y - 1) / 10) + 1, sx: (x - 1) % 10 + 1, sy: (y - 1) % 10 + 1 }; }
function route(start, destination) {
  const points = []; let { x, y } = start; const dx = Math.abs(destination.x - x); const sx = x < destination.x ? 1 : -1; const dy = -Math.abs(destination.y - y); const sy = y < destination.y ? 1 : -1; let error = dx + dy;
  while (true) { points.push({ x, y }); if (x === destination.x && y === destination.y) break; const twice = 2 * error; if (twice >= dy) { error += dy; x += sx; } if (twice <= dx) { error += dx; y += sy; } }
  return points;
}

function move(dx, dy, warp = false, amount = 1) {
  if (game.landed) return commandFailure('Посадочная группа на планете. Сначала используйте transport для возвращения на Enterprise.');
  if (game.inOrbit) return commandFailure('Enterprise находится в стандартной орбите. Введите orbit, чтобы покинуть её.');
  if (!dx && !dy) return commandFailure('Курс нулевой. Перемещение отменено.');
  if (warp) return warpTo(game.pos.qx + dx, game.pos.qy + dy);
  amount = clamp(Math.floor(Number(amount) || 1), 1, 79);
  const start = globalPoint(game.pos); const target = { x: start.x + dx * amount, y: start.y + dy * amount };
  if (target.x < 1 || target.x > 80 || target.y < 1 || target.y > 80) return commandFailure('Отрицательный энергетический барьер. Манёвр прекращён.');
  const targetPosition = positionFromGlobal(target.x, target.y);
  return moveTo(targetPosition.qx, targetPosition.qy, targetPosition.sx, targetPosition.sy);
}
function moveTo(qx, qy, sx, sy) {
  if (game.ended) return;
  if (game.landed) return commandFailure('Посадочная группа на планете. Сначала используйте transport для возвращения на Enterprise.');
  if (game.inOrbit) return commandFailure('Enterprise находится в стандартной орбите. Введите orbit, чтобы покинуть её.');
  if (![qx, qy].every(value => Number.isInteger(value) && value >= 1 && value <= 8) || ![sx, sy].every(value => Number.isInteger(value) && value >= 1 && value <= 10)) return commandFailure('Координаты вне границ: квадрант — 1…8, сектор — 1…10.');
  const start = globalPoint(game.pos); const target = globalPoint({ qx, qy, sx, sy }); const distance = Math.hypot(target.x - start.x, target.y - start.y);
  if (!distance) return commandFailure('Enterprise уже находится в указанном секторе.');
  const fullCost = 20 + Math.round(distance * 100);
  if (game.energy < fullCost) return commandFailure(`Недостаточно энергии для маршрута: требуется ${fullCost}.`);
  const points = route(start, target); let last = { ...game.pos };
  for (const point of points.slice(1)) {
    const position = positionFromGlobal(point.x, point.y); const quadrant = cell(position.qx, position.qy); const symbol = ensureLayout(quadrant)[(position.sy - 1) * 10 + position.sx - 1];
    if (symbol !== '.') {
      const lastPoint = globalPoint(last); const travelled = Math.hypot(lastPoint.x - start.x, lastPoint.y - start.y); const cost = travelled ? 20 + Math.round(travelled * 100) : 0;
      game.energy -= cost; game.pos = last; loadQuadrant(true); if (travelled) spendTime(0.05 + travelled / 0.95);
      output(`ИМПУЛЬС: курс прерван перед объектом «${symbol}» в Q${position.qx},${position.qy} / S${position.sx},${position.sy}. Текущая позиция: Q${last.qx},${last.qy} / S${last.sx},${last.sy}; энергия −${cost}.`, 'alert'); return afterAction();
    }
    last = position;
  }
  game.energy -= fullCost; if (spendTime(0.05 + distance / 0.95)) return afterAction(false);
  game.pos = { qx, qy, sx, sy }; loadQuadrant(true);
  output(`ИМПУЛЬС: маршрут завершён. Позиция Q${qx},${qy} / S${sx},${sy}; энергия −${fullCost}.`, 'system'); return afterAction();
}
function warpTo(qx, qy) {
  if (game.ended) return;
  if (game.landed) return commandFailure('Посадочная группа на планете. Сначала используйте transport для возвращения на Enterprise.');
  if (game.inOrbit) return commandFailure('Enterprise находится в стандартной орбите. Введите orbit, чтобы покинуть её.');
  if (![qx, qy].every(value => Number.isInteger(value) && value >= 1 && value <= 8)) return commandFailure('Координаты квадранта должны быть в диапазоне 1…8.');
  const distance = Math.hypot(qx - game.pos.qx, qy - game.pos.qy); if (!distance) return commandFailure('Enterprise уже находится в указанном квадранте.');
  const cost = Math.round((190 + rand(160)) * game.warp * distance); if (game.energy < cost) return commandFailure(`Недостаточно энергии для варп-перехода: требуется ${cost}.`);
  const target = cell(qx, qy); const destination = findNearestEmpty(ensureLayout(target)); if (destination === undefined) return commandFailure('В указанном квадранте нет свободного сектора для выхода из варпа.');
  game.energy -= cost; if (spendTime(0.14 + 0.3 * distance)) return afterAction(false);
  game.pos = { qx, qy, sx: destination % 10 + 1, sy: Math.floor(destination / 10) + 1 }; loadQuadrant(true);
  output(`ВАРП ${game.warp.toFixed(1)}: переход в квадрант ${qx},${qy} завершён. Прибытие: S${game.pos.sx},${game.pos.sy}; энергия −${cost}.`, 'system'); return afterAction();
}

function removeEnemies(quadrant, count) {
  let removed = 0;
  quadrant.layout = ensureLayout(quadrant).map(symbol => {
    if (removed < count && (symbol === 'K' || symbol === 'C')) { removed += 1; return '.'; }
    return symbol;
  });
  return removed;
}
function attack() {
  const quadrant = cell(); if (!quadrant.k || game.ended) return '';
  let hit = 0;
  for (let i = 0; i < quadrant.k; i += 1) hit += 90 + rand(210);
  const absorbed = game.shieldsUp ? Math.min(game.shields, hit) : 0;
  game.shields -= absorbed; game.energy -= hit - absorbed;
  if (game.energy <= 0) end('Enterprise уничтожен в бою.');
  return `\nОтветный огонь: щиты −${Math.round(absorbed)}, энергия −${Math.round(hit - absorbed)}.`;
}
function fire(kind) {
  const quadrant = cell();
  if (!quadrant.k) return commandFailure('На датчиках нет вражеских целей.');
  let damage;
  if (kind === 'phaser') {
    const cost = Math.min(600, Math.max(250, game.energy * 0.12));
    if (game.energy < cost) return commandFailure('Недостаточно энергии для фазеров.');
    game.energy -= cost; damage = cost * (0.6 + rand(0.8));
  } else {
    if (!game.torps) return commandFailure('Фотонные торпеды исчерпаны.');
    game.torps -= 1; damage = 600 + rand(750);
  }
  let destroyed = Math.min(quadrant.k, Math.floor(damage / (380 + game.skill * 60)));
  if (!destroyed && rand() > 0.4) destroyed = 1;
  destroyed = removeEnemies(quadrant, destroyed); quadrant.k -= destroyed; game.kills += destroyed;
  const response = quadrant.k ? attack() : '\nКвадрант очищен от противника.';
  if (!quadrant.k && game.kills >= game.initialEnemies) end('Флот противника разгромлен. Федерация спасена.');
  game.sector = visibleSector();
  output(`${kind === 'phaser' ? 'ФАЗЕРЫ' : 'ФОТОННЫЕ ТОРПЕДЫ'}: ${Math.round(damage)} ед. урона. ${destroyed ? `Уничтожено кораблей: ${destroyed}.` : 'Прямого попадания нет.'}${response}`, destroyed ? 'system' : 'alert');
  afterAction(false);
}
function shields() { game.shieldsUp = !game.shieldsUp; output(`Щиты ${game.shieldsUp ? 'подняты' : 'опущены'}.`, 'system'); afterAction(false); }
function dock() {
  const sector = visibleSector(); const base = sector.findIndex(symbol => symbol === 'B'); const ship = localIndex();
  if (base < 0 || Math.hypot(base % 10 - ship % 10, Math.floor(base / 10) - Math.floor(ship / 10)) > 1.5) return commandFailure('Starbase не находится в соседнем секторе.');
  game.energy = 5000; game.shields = 2500; game.torps = 10; output('Стыковка завершена. Ремонт и пополнение запасов произведены.', 'system'); afterAction(false);
}
function currentPlanet() {
  const quadrant = cell(); ensurePlanetData(quadrant);
  const location = ensureLayout(quadrant).findIndex(symbol => symbol === 'P');
  if (location < 0) return null;
  return { quadrant, x: location % 10 + 1, y: Math.floor(location / 10) + 1, key: `${quadrant.x},${quadrant.y}` };
}
function orbit() {
  if (game.landed) return commandFailure('Посадочная группа уже находится на планете. Сначала используйте transport.');
  if (game.inOrbit) { game.inOrbit = false; output('Enterprise покинул стандартную орбиту.', 'system'); return afterAction(false); }
  const planet = currentPlanet();
  if (!planet) return commandFailure('В этом квадранте нет планеты.');
  if (cell().k) return commandFailure('Вражеские корабли не позволяют безопасно войти в орбиту.');
  if (Math.hypot(game.pos.sx - planet.x, game.pos.sy - planet.y) > 1.5) return commandFailure(`Для входа в орбиту подойдите к планете: P находится в S${planet.x},${planet.y}.`);
  planet.quadrant.planetKnown = true; game.inOrbit = true;
  output(`Стандартная орбита установлена вокруг планеты класса ${['M', 'N', 'O'][planet.quadrant.planetClass - 1]}.`, 'system'); return afterAction(false);
}
function transport() {
  if (!game.inOrbit) return commandFailure('Для транспортировки сначала войдите в стандартную орбиту: orbit.');
  if (game.shieldsUp) return commandFailure('Невозможно транспортировать через поднятые щиты. Сначала используйте shields.');
  const planet = currentPlanet(); if (!planet) return commandFailure('Планета не обнаружена.');
  if (!game.landed) { game.landed = true; output('Транспортировка завершена. Посадочная группа на поверхности планеты.', 'system'); }
  else { game.landed = false; if (game.pendingCrystals) { game.pendingCrystals = false; game.crystals = true; output('Транспортировка завершена. Посадочная группа и добытые дилитиевые кристаллы вернулись на Enterprise.', 'system'); } else output('Транспортировка завершена. Посадочная группа вернулась на Enterprise.', 'system'); }
  return afterAction(false);
}
function mine() {
  if (!game.landed) return commandFailure('Добыча возможна только после высадки: orbit, затем transport.');
  const planet = currentPlanet(); if (!planet) return commandFailure('Планета не обнаружена.');
  if (!planet.quadrant.crystalsAvailable) return commandFailure('На этой планете нет дилитиевых кристаллов.');
  if (game.minedPlanets.includes(planet.key)) return commandFailure('На этой планете уже добыто достаточно кристаллов.');
  const duration = 0.1 + 0.2 * planet.quadrant.planetClass;
  if (spendTime(duration)) return afterAction(false);
  game.minedPlanets.push(planet.key); game.pendingCrystals = true;
  output(`Добыча завершена. Сырые дилитиевые кристаллы будут перенесены на Enterprise вместе с посадочной группой. Время −${duration.toFixed(1)}.`, 'system'); return afterAction(false);
}
function useCrystals(confirmed) {
  if (game.landed) return commandFailure('Кристаллы находятся на Enterprise. Сначала верните посадочную группу: transport.');
  if (!game.crystals) return commandFailure('На борту нет сырых дилитиевых кристаллов.');
  if (game.energy >= 1000) return commandFailure('Starfleet запрещает использовать сырые кристаллы, пока энергия не ниже 1000.');
  if (!confirmed) { output('Сырые дилитиевые кристаллы могут взорваться при включении. Для подтверждения введите: crystals confirm', 'alert'); save(); render(); return; }
  game.crystals = false;
  if (rand() < 0.08) { end('Сырые дилитиевые кристаллы разрушили энергетическую систему Enterprise.'); return afterAction(false); }
  const restored = Math.min(5000 - game.energy, 1800 + Math.round(rand(900))); game.energy += restored;
  output(`Кристаллы активированы. Энергия восстановлена на ${restored} единиц.`, 'system'); return afterAction(false);
}
function planetsReport() {
  const planets = game.map.filter(quadrant => quadrant.planet && quadrant.planetKnown);
  if (!planets.length) { output('Обследованных планет пока нет.', 'system'); save(); render(); return; }
  const lines = ['ИЗВЕСТНЫЕ ПЛАНЕТЫ'];
  planets.forEach(quadrant => { ensurePlanetData(quadrant); lines.push(`Q${quadrant.x},${quadrant.y}  класс ${['M', 'N', 'O'][quadrant.planetClass - 1]}  дилитий: ${quadrant.crystalsAvailable ? 'есть' : 'нет'}`); });
  output(lines.join('\n'), 'system'); save(); render();
}
function rest() { if (spendTime(0.5)) return afterAction(false); game.energy = Math.min(5000, game.energy + 250); output('Отдых завершён. Энергия частично восстановлена.', 'system'); afterAction(); }
function afterAction(enemies = true) {
  updateCondition();
  if (enemies && cell().k && !game.ended && rand() > 0.28) { const response = attack(); if (response) output(`${game.output.text}${response}`, game.output.kind); }
  game.sector = visibleSector(); save(); render();
}
function end(message) { game.ended = true; output(`КОНЕЦ МИССИИ\n${message}\nИтог: ${game.kills}/${game.initialEnemies} кораблей уничтожено.`, 'heading'); save(); }
function statusText() { return `СТАТУС ENTERPRISE\nЗвёздная дата: ${game.stardate.toFixed(1)}  |  Осталось: ${game.time.toFixed(1)}\nПозиция: Q${game.pos.qx},${game.pos.qy} / S${game.pos.sx},${game.pos.sy}\nСостояние: ${game.condition}\nЭнергия: ${Math.round(game.energy)}  Щиты: ${Math.round(game.shields)}  Торпеды: ${game.torps}\nОрбита: ${game.inOrbit ? 'стандартная' : 'нет'}  |  Посадочная группа: ${game.landed ? 'на планете' : 'на борту'}\nДилитиевые кристаллы: ${game.crystals ? 'на борту' : game.pendingCrystals ? 'у посадочной группы' : 'нет'}\nФлот: уничтожено ${game.kills} из ${game.initialEnemies}.`; }
function helpText(topic) {
  const key = topic === 'srscan' ? 'scan' : topic === 'lrscan' ? 'chart' : topic === 'impulse' ? 'move' : topic === 'torpedoes' ? 'photons' : topic === 'report' ? 'status' : topic;
  if (key && HELP[key]) return HELP[key].join('\n\n');
  if (key) return `Справка по команде «${topic}» не найдена. Используйте полное имя команды, например: help move.`;
  return `${HELP.overview.join('\n\n')}\n\nКОМАНДЫ\nscan · chart · status · move · warp · phasers · photons · shields · dock · orbit · transport · mine · crystals · planets · rest · save · quit\n\nКОРОТКИЕ ВЫЗОВЫ\nm = move · w = warp · s = shields · p = phasers · t = photons\nЭти сокращения работают только при выполнении команды, не в help.\n\nВведите help <команда>, например help move, чтобы увидеть детальную подсказку.`;
}
function command(input) {
  const [typedCommand, ...args] = input.toLowerCase().trim().split(/\s+/); if (!typedCommand) return;
  const cmd = SHORT_COMMANDS[typedCommand] || typedCommand;
  if (cmd === 'help' || cmd === 'commands') { output(helpText(args[0]), 'system'); save(); render(); return; }
  if (cmd === 'scan' || cmd === 'srscan') { scan(); afterAction(false); return; }
  if (cmd === 'chart' || cmd === 'lrscan') { chart(); afterAction(false); return; }
  if (cmd === 'status' || cmd === 'report') { output(statusText(), 'system'); afterAction(false); return; }
  if (cmd === 'phasers') return fire('phaser'); if (cmd === 'photons' || cmd === 'torpedoes') return fire('photon');
  if (cmd === 'shields') return shields(); if (cmd === 'dock') return dock(); if (cmd === 'orbit') return orbit(); if (cmd === 'transport') return transport(); if (cmd === 'mine') return mine(); if (cmd === 'crystals') return useCrystals(args[0] === 'confirm'); if (cmd === 'planets') return planetsReport(); if (cmd === 'rest') return rest();
  if (cmd === 'save' || cmd === 'freeze') { output('Состояние миссии сохранено в браузере.', 'system'); save(); render(); return; }
  if (cmd === 'move' || cmd === 'impulse') {
    const heading = dir(args[0]); if (heading) return move(...heading, false, args[1]);
    const coordinates = args.map(Number);
    if (coordinates.length === 2 && coordinates.every(Number.isInteger)) return moveTo(game.pos.qx, game.pos.qy, coordinates[0], coordinates[1]);
    if (coordinates.length === 4 && coordinates.every(Number.isInteger)) return moveTo(coordinates[0], coordinates[1], coordinates[2], coordinates[3]);
    return commandFailure('Формат: move <направление> [число], move <sector X> <sector Y> или move <quadrant X> <quadrant Y> <sector X> <sector Y>.');
  }
  if (cmd === 'warp') {
    const heading = dir(args[0]); if (heading) return move(...heading, true);
    const coordinates = args.map(Number); if (coordinates.length === 2 && coordinates.every(Number.isInteger)) return warpTo(coordinates[0], coordinates[1]);
    return commandFailure('Формат: warp <направление> или warp <quadrant X> <quadrant Y>.');
  }
  if (cmd === 'quit') { output('Миссия приостановлена и сохранена.', 'system'); save(); render(); return; }
  commandFailure(`НЕРАСПОЗНАННАЯ КОМАНДА: ${cmd}. Введите HELP.`);
}

function render() {
  if (typeof document === 'undefined') return;
  const app = $('#app');
  if (ui.screen === 'intro') { app.innerHTML = introTemplate(); bindIntro(); return; }
  if (ui.screen === 'setup') { app.innerHTML = setupTemplate(); bindSetup(); return; }
  app.innerHTML = gameTemplate(); bindGame();
}
function introTemplate() {
  const hasSave = !!localStorage.getItem(STORE);
  return `<main class="intro"><div class="stars"></div><div class="intro-art"><div class="planet"></div><div class="ship"><div class="ship-body"></div><i class="nacelle left"></i><i class="nacelle right"></i></div><div class="crew"><i></i><i></i><i></i><i></i><i></i></div></div><section class="intro-card"><div class="eyebrow">Interactive web adaptation · 2026</div><h1>SUPER STAR<br>TREK <span>Mission console</span></h1><p>Классическая тактическая миссия в браузере. Ведите Enterprise через опасную галактику, а прогресс автоматически останется на этом устройстве.</p><div class="start-row"><button class="primary" id="new">Новая миссия</button>${hasSave ? '<button class="secondary" id="resume">Продолжить миссию</button>' : ''}<button class="secondary" id="music">${ui.music ? '♫ Звук: вкл.' : '♫ Звук: выкл.'}</button></div></section></main>`;
}
function setupTemplate() { return `<main class="setup"><section class="setup-card"><div class="eyebrow">Starfleet mission control</div><h2>Подготовка миссии</h2><div class="form-grid"><label class="field">Позывной капитана<input id="captain" maxlength="18" value="КАПИТАН"></label><label class="field">Длительность<select id="length"><option value="1">Короткая · 7 дат</option><option value="2" selected>Средняя · 14 дат</option><option value="4">Длинная · 28 дат</option></select></label><label class="field">Сложность<select id="skill"><option value="1">Novice</option><option value="2" selected>Fair</option><option value="3">Good</option><option value="4">Expert</option><option value="5">Emeritus</option></select></label><label class="field">Интерфейс старта<select id="startView"><option value="console">1 — Консольный</option><option value="deck">2 — Tactical Deck</option></select></label></div><div class="setup-actions"><button class="primary" id="launch">Запустить Enterprise</button><button class="secondary" id="back">Назад</button><span class="hint">Сохранение работает автоматически после каждого манёвра.</span></div></section></main>`; }
function gameTemplate() { return `<main class="game"><header class="topbar"><div class="brand">SUPER <b>STAR</b> TREK <span class="eyebrow">WEB MISSION</span></div><div class="top-actions"><div class="view-select"><button data-view="console" class="${ui.view === 'console' ? 'active' : ''}">01 Console</button><button data-view="deck" class="${ui.view === 'deck' ? 'active' : ''}">02 Tactical deck</button></div><button class="tool-btn small" id="help" aria-label="Справка">?</button><button class="tool-btn small" id="sound">${ui.music ? '♫ ON' : '♫ OFF'}</button><button class="tool-btn small" id="save">SAVE</button></div></header>${ui.view === 'console' ? consoleTemplate() : deckTemplate()}${ui.helpOpen ? helpModal() : ''}${game.ended ? endModal() : ''}</main>`; }
function sectorTemplate(className = '') { const sector = visibleSector(); return `<div class="sector-grid ${className}">${sector.map(symbol => `<div class="sector-cell ${symbol === 'E' ? 'ship' : symbol === 'K' || symbol === 'C' ? 'enemy' : symbol === 'B' ? 'base' : symbol === '*' ? 'star' : symbol === 'P' ? 'planet' : ''}">${symbol === '.' ? '' : symbol}</div>`).join('')}</div>`; }
function galaxyTemplate() { return `<div class="galaxy-grid">${game.map.map(quadrant => `<button class="quad ${quadrant.known ? 'known' : ''} ${quadrant.x === game.pos.qx && quadrant.y === game.pos.qy ? 'current' : ''} ${quadrant.k ? 'enemy' : ''}" data-quad="${quadrant.x},${quadrant.y}" aria-label="Квадрант ${quadrant.x},${quadrant.y}">${quadrant.known ? `${quadrant.k}${quadrant.base ? 1 : 0}${quadrant.stars}` : '···'}</button>`).join('')}</div>`; }
function actionsTemplate() { return `<div class="tactical-actions"><button class="tool-btn" data-action="phaser">Фазеры</button><button class="tool-btn" data-action="photon">Торпеда</button><button class="tool-btn" data-action="shield">Щиты</button><button class="tool-btn" data-action="dock">Стыковка</button><button class="tool-btn" data-action="orbit">Орбита</button><button class="tool-btn" data-action="transport">Транспорт</button><button class="tool-btn" data-action="mine">Добыча</button><button class="tool-btn" data-action="scan">Сканировать</button><button class="tool-btn" data-action="rest">Отдых</button></div>`; }
function movePadTemplate() { const symbols = { nw: '↖', n: '↑', ne: '↗', w: '←', e: '→', sw: '↙', s: '↓', se: '↘' }; return `<div class="move-pad">${['nw', 'n', 'ne', 'w', '', 'e', 'sw', 's', 'se'].map(direction => `<button data-move="${direction}" ${direction ? '' : 'disabled'}>${symbols[direction] || ''}</button>`).join('')}</div>`; }
function readoutTemplate() { return `<div class="readout"><h3>Enterprise · Q${game.pos.qx},${game.pos.qy}</h3><div class="metric"><span>DATE</span><strong>${game.stardate.toFixed(1)}</strong></div><div class="metric"><span>TIME</span><strong>${game.time.toFixed(1)}</strong></div><div class="metric"><span>CONDITION</span><strong class="${game.condition === 'RED' ? 'danger' : ''}">${game.condition}</strong></div><div class="metric"><span>ENERGY</span><strong>${Math.round(game.energy)}</strong></div><div class="metric"><span>SHIELDS</span><strong>${Math.round(game.shields)}</strong></div><div class="metric"><span>TORPEDOES</span><strong>${game.torps}</strong></div><div class="metric"><span>ENEMIES</span><strong>${game.kills}/${game.initialEnemies} cleared</strong></div></div>`; }
function consoleStatusText() { return `ENTERPRISE STATUS\n-----------------\nDATE       ${game.stardate.toFixed(1)}\nTIME       ${game.time.toFixed(1)}\nPOSITION   Q${game.pos.qx},${game.pos.qy}  S${game.pos.sx},${game.pos.sy}\nCONDITION  ${game.condition}\nENERGY     ${Math.round(game.energy)}\nSHIELDS    ${Math.round(game.shields)}  ${game.shieldsUp ? 'UP' : 'DOWN'}\nTORPEDOES  ${game.torps}\nORBIT      ${game.inOrbit ? 'STANDARD' : 'NONE'}\nLANDING    ${game.landed ? 'ON PLANET' : 'ON BOARD'}\nCRYSTALS   ${game.crystals ? 'ON BOARD' : game.pendingCrystals ? 'WITH PARTY' : 'NONE'}\nFLEET      ${game.kills}/${game.initialEnemies} CLEARED`; }
function consoleTemplate() { return `<section class="console-deck"><div class="console-panel console-sector"><div class="console-title">LOCAL SECTOR <span>Q${game.pos.qx},${game.pos.qy}</span></div><pre class="console-ascii">${escapeHtml(renderSectorText())}</pre><section class="console-command"><div class="console-title">COMMAND CONSOLE <span>LAST RESPONSE</span></div><div class="terminal-log ${game.output?.kind || ''}" id="log">${escapeHtml(game.output?.text || '')}</div><form class="commandline" id="command"><span>COMMAND&gt;</span><input autocomplete="off" aria-label="Командная строка" autofocus placeholder="help · move n 2 · move 1 1 · warp 5 2" /></form></section></div><div class="console-stack"><div class="console-panel"><div class="console-title">GALAXY INTELLIGENCE <span>KNOWN SPACE</span></div><pre class="console-ascii galaxy-ascii">${escapeHtml(galaxyText())}</pre><div class="console-keyline">CELL: ENEMIES / BASE / STARS</div></div><div class="console-panel"><pre class="console-ascii status-ascii">${escapeHtml(consoleStatusText())}</pre></div></div></section>`; }
function deckTemplate() { return `<section class="deck"><div class="deck-panel"><div class="deck-title"><h2>Local tactical sensor grid</h2><span>Quadrant ${game.pos.qx},${game.pos.qy}</span></div>${sectorTemplate()}${actionsTemplate()}</div><div class="control-deck"><div class="deck-panel"><div class="deck-title"><h2>Galaxy intelligence</h2><span>click adjacent sector to warp</span></div>${galaxyTemplate()}<p class="prose">Код: враги / база / звёзды. Клик по соседнему квадранту задаёт варп-цель.</p></div>${readoutTemplate()}<div class="deck-panel"><div class="deck-title"><h2>Helm</h2><span>Impulse</span></div>${movePadTemplate()}</div><div class="deck-panel"><div class="deck-title"><h2>Captain's output</h2><span>last response</span></div><div class="log-mini ${game.output?.kind || ''}" id="log">${escapeHtml(game.output?.text || '')}</div></div></div></section>`; }
function helpModal() { return `<div class="modal" id="help-modal"><section class="modal-card help-card" role="dialog" aria-modal="true" aria-label="Справка"><button class="modal-close" id="close-help" aria-label="Закрыть справку">×</button><div class="eyebrow">Command reference</div><h2>Справка</h2><div class="help-grid">${Object.entries(HELP).filter(([key]) => key !== 'overview').map(([key, item]) => `<button class="help-link" data-help-topic="${key}"><b>${key}</b><span>${item[1].split('. ')[0]}.</span></button>`).join('')}</div><div class="help-detail" id="help-detail">${escapeHtml(helpText())}</div></section></div>`; }
function endModal() { return `<div class="modal"><section class="modal-card"><div class="eyebrow">Mission completed</div><h2>${game.kills >= game.initialEnemies ? 'Победа Федерации' : 'Миссия окончена'}</h2><p>${escapeHtml(game.output?.text || '').replaceAll('\n', ' ')}</p><div class="modal-actions"><button class="secondary" id="keep">Закрыть</button><button class="primary" id="again">Новая миссия</button></div></section></div>`; }
function escapeHtml(value) { return String(value).replace(/[&<>]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[char])); }

function bindIntro() { $('#new').onclick = () => { ui.screen = 'setup'; render(); }; $('#resume')?.addEventListener('click', resume); $('#music').onclick = toggleMusic; }
function bindSetup() { $('#back').onclick = () => { ui.screen = 'intro'; render(); }; $('#launch').onclick = () => { ui.view = $('#startView').value; newGame({ length: +$('#length').value, skill: +$('#skill').value, name: $('#captain').value.trim() || 'КАПИТАН' }); ui.screen = 'game'; render(); }; }
function bindGame() {
  const commandInput = $('#command input');
  $('#command')?.addEventListener('submit', event => {
    event.preventDefault(); const input = $('input', event.currentTarget); const text = input.value.trim(); input.value = '';
    if (text) { ui.commandHistory.push(text); ui.historyIndex = ui.commandHistory.length; ui.commandDraft = ''; command(text); }
  });
  commandInput?.addEventListener('keydown', event => {
    if (!ui.commandHistory.length || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return;
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (ui.historyIndex === ui.commandHistory.length) ui.commandDraft = commandInput.value;
      ui.historyIndex = Math.max(0, ui.historyIndex - 1);
      commandInput.value = ui.commandHistory[ui.historyIndex];
    } else {
      event.preventDefault();
      if (ui.historyIndex < ui.commandHistory.length - 1) { ui.historyIndex += 1; commandInput.value = ui.commandHistory[ui.historyIndex]; }
      else { ui.historyIndex = ui.commandHistory.length; commandInput.value = ui.commandDraft; }
    }
  });
  if (!ui.helpOpen) commandInput?.focus();
  document.querySelectorAll('[data-action]').forEach(button => button.onclick = () => { const action = button.dataset.action; if (action === 'scan') { scan(); afterAction(false); } else if (action === 'phaser') fire('phaser'); else if (action === 'photon') fire('photon'); else if (action === 'shield') shields(); else if (action === 'dock') dock(); else if (action === 'orbit') orbit(); else if (action === 'transport') transport(); else if (action === 'mine') mine(); else if (action === 'rest') rest(); });
  document.querySelectorAll('[data-move]').forEach(button => button.onclick = () => move(...dir(button.dataset.move)));
  document.querySelectorAll('[data-view]').forEach(button => button.onclick = () => { ui.view = button.dataset.view; save(); render(); });
  document.querySelectorAll('[data-quad]').forEach(button => button.onclick = () => { const [x, y] = button.dataset.quad.split(',').map(Number); const dx = x - game.pos.qx; const dy = y - game.pos.qy; if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1 && (dx || dy)) move(dx, dy, true); else commandFailure('Варп требует соседней цели.'); });
  $('#save').onclick = () => { output('Сохранение подтверждено.', 'system'); save(); render(); }; $('#sound').onclick = toggleMusic;
  $('#help').onclick = () => { ui.helpOpen = true; render(); }; $('#close-help')?.addEventListener('click', () => { ui.helpOpen = false; render(); });
  document.querySelectorAll('[data-help-topic]').forEach(button => button.onclick = () => { $('#help-detail').textContent = helpText(button.dataset.helpTopic); });
  $('#again')?.addEventListener('click', () => { clearSave(); ui.screen = 'setup'; ui.helpOpen = false; render(); }); $('#keep')?.addEventListener('click', () => { $('.modal')?.remove(); });
}

let audioCtx, musicTimer;
function playAmbientMotif() { if (!ui.music || !audioCtx) return; const notes = [146.83, 220, 277.18, 329.63, 246.94, 369.99, 293.66, 196]; let time = audioCtx.currentTime + 0.04; notes.forEach((note, index) => { const oscillator = audioCtx.createOscillator(); const gain = audioCtx.createGain(); oscillator.type = index % 3 ? 'triangle' : 'sine'; oscillator.frequency.value = note; gain.gain.setValueAtTime(0.0001, time); gain.gain.exponentialRampToValueAtTime(0.033, time + 0.08); gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.62); oscillator.connect(gain).connect(audioCtx.destination); oscillator.start(time); oscillator.stop(time + 0.66); time += 0.38; }); }
function toggleMusic() { ui.music = !ui.music; if (ui.music) { try { audioCtx ??= new AudioContext(); playAmbientMotif(); clearInterval(musicTimer); musicTimer = setInterval(playAmbientMotif, 3200); } catch { ui.music = false; } } else clearInterval(musicTimer); save(); render(); }

if (typeof document !== 'undefined') {
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && ui.helpOpen) { ui.helpOpen = false; render(); }
  });
  render();
}
