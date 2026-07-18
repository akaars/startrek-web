/* Browser adaptation of the C game in sstsrc. No server-side state is required. */
const STORE = 'sst-web-mission-v2';
const $ = (selector, root = document) => root.querySelector(selector);
const rand = (n = 1) => Math.random() * n;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const SHORT_COMMANDS = { m: 'move', w: 'warp', s: 'shields', p: 'phasers', t: 'photons' };
const UI = {
  en: { newMission: 'New mission', resume: 'Resume mission', soundOn: '♫ Sound: on', soundOff: '♫ Sound: off', missionPrep: 'Mission preparation', captain: 'Captain callsign', duration: 'Duration', difficulty: 'Difficulty', short: 'Short · 7 dates', medium: 'Medium · 14 dates', long: 'Long · 28 dates', startInterface: 'Starting interface', console: 'Console', deck: 'Tactical Deck', launch: 'Launch Enterprise', back: 'Back', autoSave: 'Progress is saved automatically after every manoeuvre.', language: 'Language', help: 'Help', save: 'Save', localSector: 'Local sector', galaxy: 'Galaxy intelligence', knownSpace: 'Known space', commandConsole: 'Command console', lastResponse: 'Last response', cellLegend: 'Cell: enemies / base / stars', starChart: 'STAR CHART', status: 'Enterprise status', date: 'DATE', time: 'TIME', position: 'POSITION', condition: 'CONDITION', energy: 'ENERGY', shields: 'SHIELDS', torpedoes: 'TORPEDOES', enemies: 'ENEMIES', orbit: 'ORBIT', landing: 'LANDING', crystals: 'CRYSTALS', fleet: 'FLEET', standard: 'STANDARD', none: 'NONE', onPlanet: 'ON PLANET', onBoard: 'ON BOARD', withParty: 'WITH PARTY', cleared: 'CLEARED', commandReference: 'Command reference', missionHelp: 'Mission help', closeHelp: 'Close help', missionCompleted: 'Mission completed', federationVictory: 'Federation victory', missionEnded: 'Mission ended', close: 'Close', newGame: 'New mission', tacticalGrid: 'Local tactical sensor grid', clickWarp: 'click adjacent sector to warp', helm: 'Helm', captainOutput: "Captain's output", impulse: 'Impulse', phasers: 'Phasers', photon: 'Photon', shieldsAction: 'Shields', dock: 'Dock', transport: 'Transport', mine: 'Mine', scan: 'Scan', rest: 'Rest', orbitAction: 'Orbit', galaxyHint: 'Code: enemies / base / stars. Click an adjacent quadrant to set a warp target.' },
  ru: { newMission: 'Новая миссия', resume: 'Продолжить миссию', soundOn: '♫ Звук: вкл.', soundOff: '♫ Звук: выкл.', missionPrep: 'Подготовка миссии', captain: 'Позывной капитана', duration: 'Длительность', difficulty: 'Сложность', short: 'Короткая · 7 дат', medium: 'Средняя · 14 дат', long: 'Длинная · 28 дат', startInterface: 'Интерфейс старта', console: 'Консольный', deck: 'Тактическая палуба', launch: 'Запустить Enterprise', back: 'Назад', autoSave: 'Сохранение работает автоматически после каждого манёвра.', language: 'Язык', help: 'Справка', save: 'Сохранить', localSector: 'Локальный сектор', galaxy: 'Разведка галактики', knownSpace: 'Известное пространство', commandConsole: 'Командная консоль', lastResponse: 'Последний ответ', cellLegend: 'Ячейка: враги / база / звёзды', starChart: 'ЗВЁЗДНАЯ КАРТА', status: 'Статус Enterprise', date: 'ДАТА', time: 'ВРЕМЯ', position: 'ПОЗИЦИЯ', condition: 'СОСТОЯНИЕ', energy: 'ЭНЕРГИЯ', shields: 'ЩИТЫ', torpedoes: 'ТОРПЕДЫ', enemies: 'ВРАГИ', orbit: 'ОРБИТА', landing: 'ВЫСАДКА', crystals: 'КРИСТАЛЛЫ', fleet: 'ФЛОТ', standard: 'СТАНДАРТНАЯ', none: 'НЕТ', onPlanet: 'НА ПЛАНЕТЕ', onBoard: 'НА БОРТУ', withParty: 'У ГРУППЫ', cleared: 'УНИЧТОЖЕНО', commandReference: 'Справочник команд', missionHelp: 'Справка', closeHelp: 'Закрыть справку', missionCompleted: 'Миссия завершена', federationVictory: 'Победа Федерации', missionEnded: 'Миссия окончена', close: 'Закрыть', newGame: 'Новая миссия', tacticalGrid: 'Локальная тактическая сетка', clickWarp: 'клик по соседнему квадранту — варп', helm: 'Штурвал', captainOutput: 'Вывод капитану', impulse: 'Импульс', phasers: 'Фазеры', photon: 'Торпеда', shieldsAction: 'Щиты', dock: 'Стыковка', transport: 'Транспорт', mine: 'Добыча', scan: 'Сканировать', rest: 'Отдых', orbitAction: 'Орбита', galaxyHint: 'Код: враги / база / звёзды. Клик по соседнему квадранту задаёт варп-цель.' },
};
function t(key) { return UI[ui.language]?.[key] || UI.en[key] || key; }
let game = null;
let ui = { screen: 'intro', view: 'console', language: (typeof localStorage !== 'undefined' && localStorage.getItem('sst-web-language')) || 'en', music: false, helpOpen: false, commandHistory: [], historyIndex: 0, commandDraft: '' };
const m = (ru, en) => ui.language === 'ru' ? ru : en;

const HELP_RU = {
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
const HELP_EN = {
  overview: ['MISSION HELP', 'Destroy the entire enemy fleet before time runs out. The galaxy contains 8×8 quadrants; each quadrant contains a 10×10 sector grid. Map code: enemies / base / stars. Progress is saved in this browser.'],
  scan: ['help scan', 'Shows a short-range scan of the current quadrant: Enterprise, enemies, stars, planets, and a starbase. The Console keeps only the latest command response. Alias: srscan.'],
  chart: ['help chart', 'Shows the known galaxy. Each cell contains three digits: enemies / base / stars. Unexplored quadrants are shown as «···». Alias: lrscan.'],
  move: ['help move', 'Impulse movement by sectors. Direction format: move <n|s|e|w|ne|nw|se|sw> [number], for example move n 2. Coordinate format: move <sector X> <sector Y>, for example move 1 1. A target in another quadrant uses move <quadrant X> <quadrant Y> <sector X> <sector Y>, for example move 2 1 5 5. Enterprise follows a straight route and stops before any object on its path. Alias: impulse.\n\nShort invocation: m. Example: m 2 2.'],
  warp: ['help warp', 'Warp movement. Direction format: warp <n|s|e|w|ne|nw|se|sw>. You can also specify a target quadrant directly: warp <quadrant X> <quadrant Y>, for example warp 5 2. Enterprise arrives in the nearest free sector to that quadrant’s centre.\n\nShort invocation: w. Example: w 5 2.'],
  phasers: ['help phasers', 'Uses energy to damage enemy vessels in the quadrant. The map updates immediately after a volley: destroyed ships disappear.\n\nShort invocation: p.'],
  photons: ['help photons', 'Fires one photon torpedo. Its damage is higher, but ammunition is limited. Command: photons. The map updates immediately after the volley. Alias: torpedoes.\n\nShort invocation: t.'],
  shields: ['help shields', 'Raises or lowers shields. The shields command toggles their state. Shields absorb enemy fire until depleted.\n\nShort invocation: s.'],
  dock: ['help dock', 'Docking is possible when Enterprise is adjacent to B (a starbase). It fully restores energy, shields, and torpedoes.'],
  orbit: ['help orbit', 'Enter standard orbit around a P planet. Enterprise must be adjacent to the planet and the landing party must be aboard. Enter orbit again to leave it.'],
  transport: ['help transport', 'Transport the landing party. It requires standard orbit, lowered shields, and a known planet. transport beams the party down; a second transport returns it to Enterprise.'],
  mine: ['help mine', 'Mine dilithium on the surface. It requires a landing party and a planet with crystals. The operation costs stardate time; raw crystals return with the landing party.'],
  crystals: ['help crystals', 'Use recovered crystals for emergency energy recovery when energy is below 1000. The first command shows a warning; enter crystals confirm to proceed. This is dangerous.'],
  planets: ['help planets', 'Lists surveyed planets, their class, and dilithium data. A planet becomes known after a short scan or entering orbit.'],
  rest: ['help rest', 'Passes 0.5 stardates and partially restores energy. Do not rest in a hostile quadrant: enemies may fire.'],
  status: ['help status', 'Shows date, remaining time, position, ship condition, energy, shields, torpedoes, and mission progress. Alias: report.'],
  save: ['help save', 'Forces a game save in browser localStorage. This is normally unnecessary because the game saves after every action. Alias: freeze.'],
  quit: ['help quit', 'Pauses the current mission. Its state remains saved and can be resumed from the splash screen.'],
};
function helpItems() { return ui.language === 'ru' ? HELP_RU : HELP_EN; }

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
  if (!silent) output(m(`Вход в квадрант ${game.pos.qx},${game.pos.qy}.`, `Entering quadrant ${game.pos.qx},${game.pos.qy}.`), 'system');
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
  output(ui.language === 'ru'
    ? `ЗВЁЗДНАЯ ДАТА ${Math.floor(game.stardate)}.\n${game.initialEnemies} вражеских кораблей угрожают Федерации.\nВы — ${game.name}, командир U.S.S. Enterprise.\n\nМиссия: уничтожить флот до истечения ${game.time.toFixed(1)} звёздных дат. Базы снабжения: ${game.bases}.`
    : `STARDATE ${Math.floor(game.stardate)}.\n${game.initialEnemies} enemy ships threaten the Federation.\nYou are ${game.name}, commanding U.S.S. Enterprise.\n\nMission: destroy the fleet before ${game.time.toFixed(1)} stardates expire. Starbases: ${game.bases}.`, 'heading');
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
function save() { if (game) localStorage.setItem(STORE, JSON.stringify({ game, ui: { view: ui.view, language: ui.language, music: ui.music } })); }
function resume() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE));
    if (!saved?.game) return false;
    game = saved.game;
    // Upgrade the first saved prototype where sector layout was deliberately transient.
    game.map.forEach(quadrant => { if (!Array.isArray(quadrant.layout)) quadrant.layout = null; ensurePlanetData(quadrant); });
    game.inOrbit ??= false; game.landed ??= false; game.crystals ??= false; game.pendingCrystals ??= false; game.minedPlanets ??= [];
    ui.view = saved.ui?.view || 'console'; ui.language = saved.ui?.language || ui.language || 'en'; ui.music = !!saved.ui?.music; ui.screen = 'game'; ui.helpOpen = false; ui.commandHistory = []; ui.historyIndex = 0; ui.commandDraft = '';
    loadQuadrant(true); if (!game.output) output(statusText(), 'system'); render(); return true;
  } catch { return false; }
}
function clearSave() { localStorage.removeItem(STORE); }
function setLanguage(language) {
  if (!UI[language]) return;
  ui.language = language; localStorage.setItem('sst-web-language', language); save(); render();
}
function spendTime(amount) {
  game.stardate += amount; game.time -= amount;
  if (game.time > 0) return false;
  game.time = 0; end(m('Время Федерации исчерпано. Вторжение победило.', 'The Federation has run out of time. The invasion prevails.')); return true;
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
  const planetReport = quadrant.planet ? (ui.language === 'ru' ? `\nПланета класса ${['M', 'N', 'O'][quadrant.planetClass - 1]}; дилитий: ${quadrant.crystalsAvailable ? 'обнаружен' : 'не обнаружен'}.` : `\nPlanet class ${['M', 'N', 'O'][quadrant.planetClass - 1]}; dilithium: ${quadrant.crystalsAvailable ? 'detected' : 'not detected'}.`) : '';
  output(ui.language === 'ru'
    ? `КРАТКИЙ СКАН — квадрант ${game.pos.qx},${game.pos.qy}\n${renderSectorText()}\n${quadrant.k ? `Обнаружено вражеских судов: ${quadrant.k}.` : 'Пространство спокойно.'}${planetReport}`
    : `SHORT-RANGE SCAN — quadrant ${game.pos.qx},${game.pos.qy}\n${renderSectorText()}\n${quadrant.k ? `Enemy vessels detected: ${quadrant.k}.` : 'Space is quiet.'}${planetReport}`, 'system');
}
function chart() {
  output(`${galaxyText()}\n\n${ui.language === 'ru' ? 'Код каждой ячейки: враги / база / звёзды.' : 'Cell code: enemies / base / stars.'}`, 'system');
}
function galaxyText() {
  const lines = [t('starChart'), '     1   2   3   4   5   6   7   8'];
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
  if (game.landed) return commandFailure(m('Посадочная группа на планете. Сначала используйте transport для возвращения на Enterprise.', 'The landing party is on the planet. Use transport to return it to Enterprise first.'));
  if (game.inOrbit) return commandFailure(m('Enterprise находится в стандартной орбите. Введите orbit, чтобы покинуть её.', 'Enterprise is in standard orbit. Enter orbit to leave it.'));
  if (!dx && !dy) return commandFailure(m('Курс нулевой. Перемещение отменено.', 'Course is zero. Movement cancelled.'));
  if (warp) return warpTo(game.pos.qx + dx, game.pos.qy + dy);
  amount = clamp(Math.floor(Number(amount) || 1), 1, 79);
  const start = globalPoint(game.pos); const target = { x: start.x + dx * amount, y: start.y + dy * amount };
  if (target.x < 1 || target.x > 80 || target.y < 1 || target.y > 80) return commandFailure(m('Отрицательный энергетический барьер. Манёвр прекращён.', 'Negative energy barrier. Manoeuvre aborted.'));
  const targetPosition = positionFromGlobal(target.x, target.y);
  return moveTo(targetPosition.qx, targetPosition.qy, targetPosition.sx, targetPosition.sy);
}
function moveTo(qx, qy, sx, sy) {
  if (game.ended) return;
  if (game.landed) return commandFailure(m('Посадочная группа на планете. Сначала используйте transport для возвращения на Enterprise.', 'The landing party is on the planet. Use transport to return it to Enterprise first.'));
  if (game.inOrbit) return commandFailure(m('Enterprise находится в стандартной орбите. Введите orbit, чтобы покинуть её.', 'Enterprise is in standard orbit. Enter orbit to leave it.'));
  if (![qx, qy].every(value => Number.isInteger(value) && value >= 1 && value <= 8) || ![sx, sy].every(value => Number.isInteger(value) && value >= 1 && value <= 10)) return commandFailure(m('Координаты вне границ: квадрант — 1…8, сектор — 1…10.', 'Coordinates are out of bounds: quadrant 1…8, sector 1…10.'));
  const start = globalPoint(game.pos); const target = globalPoint({ qx, qy, sx, sy }); const distance = Math.hypot(target.x - start.x, target.y - start.y);
  if (!distance) return commandFailure(m('Enterprise уже находится в указанном секторе.', 'Enterprise is already in the requested sector.'));
  const fullCost = 20 + Math.round(distance * 100);
  if (game.energy < fullCost) return commandFailure(m(`Недостаточно энергии для маршрута: требуется ${fullCost}.`, `Insufficient energy for the route: ${fullCost} required.`));
  const points = route(start, target); let last = { ...game.pos };
  for (const point of points.slice(1)) {
    const position = positionFromGlobal(point.x, point.y); const quadrant = cell(position.qx, position.qy); const symbol = ensureLayout(quadrant)[(position.sy - 1) * 10 + position.sx - 1];
    if (symbol !== '.') {
      const lastPoint = globalPoint(last); const travelled = Math.hypot(lastPoint.x - start.x, lastPoint.y - start.y); const cost = travelled ? 20 + Math.round(travelled * 100) : 0;
      game.energy -= cost; game.pos = last; loadQuadrant(true); if (travelled) spendTime(0.05 + travelled / 0.95);
      output(m(`ИМПУЛЬС: курс прерван перед объектом «${symbol}» в Q${position.qx},${position.qy} / S${position.sx},${position.sy}. Текущая позиция: Q${last.qx},${last.qy} / S${last.sx},${last.sy}; энергия −${cost}.`, `IMPULSE: course interrupted before “${symbol}” at Q${position.qx},${position.qy} / S${position.sx},${position.sy}. Current position: Q${last.qx},${last.qy} / S${last.sx},${last.sy}; energy −${cost}.`), 'alert'); return afterAction();
    }
    last = position;
  }
  game.energy -= fullCost; if (spendTime(0.05 + distance / 0.95)) return afterAction(false);
  game.pos = { qx, qy, sx, sy }; loadQuadrant(true);
  output(m(`ИМПУЛЬС: маршрут завершён. Позиция Q${qx},${qy} / S${sx},${sy}; энергия −${fullCost}.`, `IMPULSE: route complete. Position Q${qx},${qy} / S${sx},${sy}; energy −${fullCost}.`), 'system'); return afterAction();
}
function warpTo(qx, qy) {
  if (game.ended) return;
  if (game.landed) return commandFailure(m('Посадочная группа на планете. Сначала используйте transport для возвращения на Enterprise.', 'The landing party is on the planet. Use transport to return it to Enterprise first.'));
  if (game.inOrbit) return commandFailure(m('Enterprise находится в стандартной орбите. Введите orbit, чтобы покинуть её.', 'Enterprise is in standard orbit. Enter orbit to leave it.'));
  if (![qx, qy].every(value => Number.isInteger(value) && value >= 1 && value <= 8)) return commandFailure(m('Координаты квадранта должны быть в диапазоне 1…8.', 'Quadrant coordinates must be in the range 1…8.'));
  const distance = Math.hypot(qx - game.pos.qx, qy - game.pos.qy); if (!distance) return commandFailure(m('Enterprise уже находится в указанном квадранте.', 'Enterprise is already in the requested quadrant.'));
  const cost = Math.round((190 + rand(160)) * game.warp * distance); if (game.energy < cost) return commandFailure(m(`Недостаточно энергии для варп-перехода: требуется ${cost}.`, `Insufficient energy for warp: ${cost} required.`));
  const target = cell(qx, qy); const destination = findNearestEmpty(ensureLayout(target)); if (destination === undefined) return commandFailure(m('В указанном квадранте нет свободного сектора для выхода из варпа.', 'There is no free sector for warp arrival in that quadrant.'));
  game.energy -= cost; if (spendTime(0.14 + 0.3 * distance)) return afterAction(false);
  game.pos = { qx, qy, sx: destination % 10 + 1, sy: Math.floor(destination / 10) + 1 }; loadQuadrant(true);
  output(m(`ВАРП ${game.warp.toFixed(1)}: переход в квадрант ${qx},${qy} завершён. Прибытие: S${game.pos.sx},${game.pos.sy}; энергия −${cost}.`, `WARP ${game.warp.toFixed(1)}: transfer to quadrant ${qx},${qy} complete. Arrival: S${game.pos.sx},${game.pos.sy}; energy −${cost}.`), 'system'); return afterAction();
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
  if (game.energy <= 0) end(m('Enterprise уничтожен в бою.', 'Enterprise was destroyed in battle.'));
  return m(`\nОтветный огонь: щиты −${Math.round(absorbed)}, энергия −${Math.round(hit - absorbed)}.`, `\nReturn fire: shields −${Math.round(absorbed)}, energy −${Math.round(hit - absorbed)}.`);
}
function fire(kind) {
  const quadrant = cell();
  if (!quadrant.k) return commandFailure(m('На датчиках нет вражеских целей.', 'No enemy targets are on sensors.'));
  let damage;
  if (kind === 'phaser') {
    const cost = Math.min(600, Math.max(250, game.energy * 0.12));
    if (game.energy < cost) return commandFailure(m('Недостаточно энергии для фазеров.', 'Insufficient energy for phasers.'));
    game.energy -= cost; damage = cost * (0.6 + rand(0.8));
  } else {
    if (!game.torps) return commandFailure(m('Фотонные торпеды исчерпаны.', 'Photon torpedoes are depleted.'));
    game.torps -= 1; damage = 600 + rand(750);
  }
  let destroyed = Math.min(quadrant.k, Math.floor(damage / (380 + game.skill * 60)));
  if (!destroyed && rand() > 0.4) destroyed = 1;
  destroyed = removeEnemies(quadrant, destroyed); quadrant.k -= destroyed; game.kills += destroyed;
  const response = quadrant.k ? attack() : m('\nКвадрант очищен от противника.', '\nQuadrant cleared of hostiles.');
  if (!quadrant.k && game.kills >= game.initialEnemies) end(m('Флот противника разгромлен. Федерация спасена.', 'The enemy fleet has been defeated. The Federation is saved.'));
  game.sector = visibleSector();
  if (game.ended) return afterAction(false);
  output(m(`${kind === 'phaser' ? 'ФАЗЕРЫ' : 'ФОТОННЫЕ ТОРПЕДЫ'}: ${Math.round(damage)} ед. урона. ${destroyed ? `Уничтожено кораблей: ${destroyed}.` : 'Прямого попадания нет.'}${response}`, `${kind === 'phaser' ? 'PHASERS' : 'PHOTON TORPEDOES'}: ${Math.round(damage)} damage. ${destroyed ? `Ships destroyed: ${destroyed}.` : 'No direct hit.'}${response}`), destroyed ? 'system' : 'alert');
  afterAction(false);
}
function shields() { game.shieldsUp = !game.shieldsUp; output(m(`Щиты ${game.shieldsUp ? 'подняты' : 'опущены'}.`, `Shields ${game.shieldsUp ? 'raised' : 'lowered'}.`), 'system'); afterAction(false); }
function dock() {
  const sector = visibleSector(); const base = sector.findIndex(symbol => symbol === 'B'); const ship = localIndex();
  if (base < 0 || Math.hypot(base % 10 - ship % 10, Math.floor(base / 10) - Math.floor(ship / 10)) > 1.5) return commandFailure(m('Starbase не находится в соседнем секторе.', 'A starbase is not in an adjacent sector.'));
  game.energy = 5000; game.shields = 2500; game.torps = 10; output(m('Стыковка завершена. Ремонт и пополнение запасов произведены.', 'Docking complete. Repairs and resupply are complete.'), 'system'); afterAction(false);
}
function currentPlanet() {
  const quadrant = cell(); ensurePlanetData(quadrant);
  const location = ensureLayout(quadrant).findIndex(symbol => symbol === 'P');
  if (location < 0) return null;
  return { quadrant, x: location % 10 + 1, y: Math.floor(location / 10) + 1, key: `${quadrant.x},${quadrant.y}` };
}
function orbit() {
  if (game.landed) return commandFailure(m('Посадочная группа уже находится на планете. Сначала используйте transport.', 'The landing party is already on the planet. Use transport first.'));
  if (game.inOrbit) { game.inOrbit = false; output(m('Enterprise покинул стандартную орбиту.', 'Enterprise has left standard orbit.'), 'system'); return afterAction(false); }
  const planet = currentPlanet();
  if (!planet) return commandFailure(m('В этом квадранте нет планеты.', 'There is no planet in this quadrant.'));
  if (cell().k) return commandFailure(m('Вражеские корабли не позволяют безопасно войти в орбиту.', 'Enemy ships prevent a safe orbital approach.'));
  if (Math.hypot(game.pos.sx - planet.x, game.pos.sy - planet.y) > 1.5) return commandFailure(m(`Для входа в орбиту подойдите к планете: P находится в S${planet.x},${planet.y}.`, `Move next to the planet to enter orbit: P is at S${planet.x},${planet.y}.`));
  planet.quadrant.planetKnown = true; game.inOrbit = true;
  output(m(`Стандартная орбита установлена вокруг планеты класса ${['M', 'N', 'O'][planet.quadrant.planetClass - 1]}.`, `Standard orbit established around a class ${['M', 'N', 'O'][planet.quadrant.planetClass - 1]} planet.`), 'system'); return afterAction(false);
}
function transport() {
  if (!game.inOrbit) return commandFailure(m('Для транспортировки сначала войдите в стандартную орбиту: orbit.', 'Enter standard orbit with orbit before transporting.'));
  if (game.shieldsUp) return commandFailure(m('Невозможно транспортировать через поднятые щиты. Сначала используйте shields.', 'Cannot transport through raised shields. Use shields first.'));
  const planet = currentPlanet(); if (!planet) return commandFailure(m('Планета не обнаружена.', 'Planet not detected.'));
  if (!game.landed) { game.landed = true; output(m('Транспортировка завершена. Посадочная группа на поверхности планеты.', 'Transport complete. The landing party is on the planet surface.'), 'system'); }
  else { game.landed = false; if (game.pendingCrystals) { game.pendingCrystals = false; game.crystals = true; output(m('Транспортировка завершена. Посадочная группа и добытые дилитиевые кристаллы вернулись на Enterprise.', 'Transport complete. The landing party and recovered dilithium crystals have returned to Enterprise.'), 'system'); } else output(m('Транспортировка завершена. Посадочная группа вернулась на Enterprise.', 'Transport complete. The landing party has returned to Enterprise.'), 'system'); }
  return afterAction(false);
}
function mine() {
  if (!game.landed) return commandFailure(m('Добыча возможна только после высадки: orbit, затем transport.', 'Mining is possible only after landing: orbit, then transport.'));
  const planet = currentPlanet(); if (!planet) return commandFailure(m('Планета не обнаружена.', 'Planet not detected.'));
  if (!planet.quadrant.crystalsAvailable) return commandFailure(m('На этой планете нет дилитиевых кристаллов.', 'There are no dilithium crystals on this planet.'));
  if (game.minedPlanets.includes(planet.key)) return commandFailure(m('На этой планете уже добыто достаточно кристаллов.', 'Enough crystals have already been mined on this planet.'));
  const duration = 0.1 + 0.2 * planet.quadrant.planetClass;
  if (spendTime(duration)) return afterAction(false);
  game.minedPlanets.push(planet.key); game.pendingCrystals = true;
  output(m(`Добыча завершена. Сырые дилитиевые кристаллы будут перенесены на Enterprise вместе с посадочной группой. Время −${duration.toFixed(1)}.`, `Mining complete. Raw dilithium crystals will return to Enterprise with the landing party. Time −${duration.toFixed(1)}.`), 'system'); return afterAction(false);
}
function useCrystals(confirmed) {
  if (game.landed) return commandFailure(m('Кристаллы находятся на Enterprise. Сначала верните посадочную группу: transport.', 'The crystals are on Enterprise. Return the landing party with transport first.'));
  if (!game.crystals) return commandFailure(m('На борту нет сырых дилитиевых кристаллов.', 'There are no raw dilithium crystals aboard.'));
  if (game.energy >= 1000) return commandFailure(m('Starfleet запрещает использовать сырые кристаллы, пока энергия не ниже 1000.', 'Starfleet forbids using raw crystals while energy is at or above 1000.'));
  if (!confirmed) { output(m('Сырые дилитиевые кристаллы могут взорваться при включении. Для подтверждения введите: crystals confirm', 'Raw dilithium crystals may explode during activation. To confirm, enter: crystals confirm'), 'alert'); save(); render(); return; }
  game.crystals = false;
  if (rand() < 0.08) { end(m('Сырые дилитиевые кристаллы разрушили энергетическую систему Enterprise.', 'Raw dilithium crystals destroyed Enterprise’s energy system.')); return afterAction(false); }
  const restored = Math.min(5000 - game.energy, 1800 + Math.round(rand(900))); game.energy += restored;
  output(m(`Кристаллы активированы. Энергия восстановлена на ${restored} единиц.`, `Crystals activated. Energy restored by ${restored} units.`), 'system'); return afterAction(false);
}
function planetsReport() {
  const planets = game.map.filter(quadrant => quadrant.planet && quadrant.planetKnown);
  if (!planets.length) { output(m('Обследованных планет пока нет.', 'No planets have been surveyed yet.'), 'system'); save(); render(); return; }
  const lines = [m('ИЗВЕСТНЫЕ ПЛАНЕТЫ', 'KNOWN PLANETS')];
  planets.forEach(quadrant => { ensurePlanetData(quadrant); lines.push(m(`Q${quadrant.x},${quadrant.y}  класс ${['M', 'N', 'O'][quadrant.planetClass - 1]}  дилитий: ${quadrant.crystalsAvailable ? 'есть' : 'нет'}`, `Q${quadrant.x},${quadrant.y}  class ${['M', 'N', 'O'][quadrant.planetClass - 1]}  dilithium: ${quadrant.crystalsAvailable ? 'present' : 'none'}`)); });
  output(lines.join('\n'), 'system'); save(); render();
}
function rest() { if (spendTime(0.5)) return afterAction(false); game.energy = Math.min(5000, game.energy + 250); output(m('Отдых завершён. Энергия частично восстановлена.', 'Rest complete. Energy partially restored.'), 'system'); afterAction(); }
function afterAction(enemies = true) {
  updateCondition();
  if (enemies && cell().k && !game.ended && rand() > 0.28) { const response = attack(); if (response) output(`${game.output.text}${response}`, game.output.kind); }
  game.sector = visibleSector(); save(); render();
}
function end(message) { game.ended = true; output(m(`КОНЕЦ МИССИИ\n${message}\nИтог: ${game.kills}/${game.initialEnemies} кораблей уничтожено.`, `MISSION ENDED\n${message}\nFinal score: ${game.kills}/${game.initialEnemies} ships destroyed.`), 'heading'); save(); }
function statusText() {
  if (ui.language === 'ru') return `СТАТУС ENTERPRISE\nЗвёздная дата: ${game.stardate.toFixed(1)}  |  Осталось: ${game.time.toFixed(1)}\nПозиция: Q${game.pos.qx},${game.pos.qy} / S${game.pos.sx},${game.pos.sy}\nСостояние: ${game.condition}\nЭнергия: ${Math.round(game.energy)}  Щиты: ${Math.round(game.shields)}  Торпеды: ${game.torps}\nОрбита: ${game.inOrbit ? 'стандартная' : 'нет'}  |  Посадочная группа: ${game.landed ? 'на планете' : 'на борту'}\nДилитиевые кристаллы: ${game.crystals ? 'на борту' : game.pendingCrystals ? 'у посадочной группы' : 'нет'}\nФлот: уничтожено ${game.kills} из ${game.initialEnemies}.`;
  return `ENTERPRISE STATUS\nStardate: ${game.stardate.toFixed(1)}  |  Remaining: ${game.time.toFixed(1)}\nPosition: Q${game.pos.qx},${game.pos.qy} / S${game.pos.sx},${game.pos.sy}\nCondition: ${game.condition}\nEnergy: ${Math.round(game.energy)}  Shields: ${Math.round(game.shields)}  Torpedoes: ${game.torps}\nOrbit: ${game.inOrbit ? 'standard' : 'none'}  |  Landing party: ${game.landed ? 'on planet' : 'on board'}\nDilithium crystals: ${game.crystals ? 'on board' : game.pendingCrystals ? 'with landing party' : 'none'}\nFleet: ${game.kills} of ${game.initialEnemies} destroyed.`;
}
function helpText(topic) {
  const help = helpItems();
  const key = topic === 'srscan' ? 'scan' : topic === 'lrscan' ? 'chart' : topic === 'impulse' ? 'move' : topic === 'torpedoes' ? 'photons' : topic === 'report' ? 'status' : topic;
  if (key && help[key]) return help[key].join('\n\n');
  if (key) return ui.language === 'ru' ? `Справка по команде «${topic}» не найдена. Используйте полное имя команды, например: help move.` : `No help entry exists for «${topic}». Use the full command name, for example: help move.`;
  const listing = 'scan · chart · status · move · warp · phasers · photons · shields · dock · orbit · transport · mine · crystals · planets · rest · save · quit';
  return ui.language === 'ru'
    ? `${help.overview.join('\n\n')}\n\nКОМАНДЫ\n${listing}\n\nКОРОТКИЕ ВЫЗОВЫ\nm = move · w = warp · s = shields · p = phasers · t = photons\nЭти сокращения работают только при выполнении команды, не в help.\n\nВведите help <команда>, например help move, чтобы увидеть детальную подсказку.`
    : `${help.overview.join('\n\n')}\n\nCOMMANDS\n${listing}\n\nSHORT INVOCATIONS\nm = move · w = warp · s = shields · p = phasers · t = photons\nShort forms work only to run a command, never inside help.\n\nEnter help <command>, for example help move, for detailed guidance.`;
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
  if (cmd === 'save' || cmd === 'freeze') { output(m('Состояние миссии сохранено в браузере.', 'Mission state saved in this browser.'), 'system'); save(); render(); return; }
  if (cmd === 'move' || cmd === 'impulse') {
    const heading = dir(args[0]); if (heading) return move(...heading, false, args[1]);
    const coordinates = args.map(Number);
    if (coordinates.length === 2 && coordinates.every(Number.isInteger)) return moveTo(game.pos.qx, game.pos.qy, coordinates[0], coordinates[1]);
    if (coordinates.length === 4 && coordinates.every(Number.isInteger)) return moveTo(coordinates[0], coordinates[1], coordinates[2], coordinates[3]);
    return commandFailure(m('Формат: move <направление> [число], move <sector X> <sector Y> или move <quadrant X> <quadrant Y> <sector X> <sector Y>.', 'Format: move <direction> [number], move <sector X> <sector Y>, or move <quadrant X> <quadrant Y> <sector X> <sector Y>.'));
  }
  if (cmd === 'warp') {
    const heading = dir(args[0]); if (heading) return move(...heading, true);
    const coordinates = args.map(Number); if (coordinates.length === 2 && coordinates.every(Number.isInteger)) return warpTo(coordinates[0], coordinates[1]);
    return commandFailure(m('Формат: warp <направление> или warp <quadrant X> <quadrant Y>.', 'Format: warp <direction> or warp <quadrant X> <quadrant Y>.'));
  }
  if (cmd === 'quit') { output(m('Миссия приостановлена и сохранена.', 'Mission paused and saved.'), 'system'); save(); render(); return; }
  commandFailure(m(`НЕРАСПОЗНАННАЯ КОМАНДА: ${cmd}. Введите HELP.`, `UNKNOWN COMMAND: ${cmd}. Enter HELP.`));
}

function render() {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = ui.language;
  const app = $('#app');
  if (ui.screen === 'intro') { app.innerHTML = introTemplate(); bindIntro(); return; }
  if (ui.screen === 'setup') { app.innerHTML = setupTemplate(); bindSetup(); return; }
  app.innerHTML = gameTemplate(); bindGame();
}
function languageSwitchTemplate() { return `<div class="view-select language-select" aria-label="${t('language')}"><button data-language="en" class="${ui.language === 'en' ? 'active' : ''}">EN</button><button data-language="ru" class="${ui.language === 'ru' ? 'active' : ''}">RU</button></div>`; }
function introTemplate() {
  const hasSave = !!localStorage.getItem(STORE);
  const copy = ui.language === 'ru' ? 'Классическая тактическая миссия в браузере. Проведите Enterprise через опасную галактику — прогресс сохранится на этом устройстве.' : 'A classic tactical mission in your browser. Lead Enterprise through a dangerous galaxy; progress stays on this device.';
  return `<main class="intro"><div class="stars"></div><div class="intro-art"><div class="planet"></div><div class="ship"><div class="ship-body"></div><i class="nacelle left"></i><i class="nacelle right"></i></div><div class="crew"><i></i><i></i><i></i><i></i><i></i></div></div><div class="intro-language">${languageSwitchTemplate()}</div><section class="intro-card"><div class="eyebrow">Interactive web adaptation · 2026</div><h1>SUPER STAR<br>TREK <span>Mission console</span></h1><p>${copy}</p><div class="start-row ${hasSave ? 'has-resume' : ''}"><button class="primary" id="new">${t('newMission')}</button>${hasSave ? `<button class="secondary" id="resume">${t('resume')}</button>` : ''}<button class="secondary" id="music">${ui.music ? t('soundOn') : t('soundOff')}</button></div></section></main>`;
}
function setupTemplate() { return `<main class="setup"><section class="setup-card"><div class="eyebrow">Starfleet mission control</div><h2>${t('missionPrep')}</h2><div class="form-grid"><label class="field">${t('captain')}<input id="captain" maxlength="18" value="${ui.language === 'ru' ? 'КАПИТАН' : 'CAPTAIN'}"></label><label class="field">${t('duration')}<select id="length"><option value="1">${t('short')}</option><option value="2" selected>${t('medium')}</option><option value="4">${t('long')}</option></select></label><label class="field">${t('difficulty')}<select id="skill"><option value="1">Novice</option><option value="2" selected>Fair</option><option value="3">Good</option><option value="4">Expert</option><option value="5">Emeritus</option></select></label><label class="field">${t('startInterface')}<select id="startView"><option value="console">1 — ${t('console')}</option><option value="deck">2 — ${t('deck')}</option></select></label></div><div class="setup-actions"><button class="primary" id="launch">${t('launch')}</button><button class="secondary" id="back">${t('back')}</button><span class="hint">${t('autoSave')}</span>${languageSwitchTemplate()}</div></section></main>`; }
function gameTemplate() { return `<main class="game"><header class="topbar"><div class="brand">SUPER <b>STAR</b> TREK <span class="eyebrow">WEB MISSION</span></div><div class="top-actions">${languageSwitchTemplate()}<div class="view-select"><button data-view="console" class="${ui.view === 'console' ? 'active' : ''}">01 ${t('console')}</button><button data-view="deck" class="${ui.view === 'deck' ? 'active' : ''}">02 ${t('deck')}</button></div><button class="tool-btn small" id="help" aria-label="${t('help')}">?</button><button class="tool-btn small" id="sound">${ui.music ? '♫ ON' : '♫ OFF'}</button><button class="tool-btn small" id="save">${t('save')}</button></div></header>${ui.view === 'console' ? consoleTemplate() : deckTemplate()}${ui.helpOpen ? helpModal() : ''}${game.ended ? endModal() : ''}</main>`; }
function sectorTemplate(className = '') { const sector = visibleSector(); return `<div class="sector-grid ${className}">${sector.map(symbol => `<div class="sector-cell ${symbol === 'E' ? 'ship' : symbol === 'K' || symbol === 'C' ? 'enemy' : symbol === 'B' ? 'base' : symbol === '*' ? 'star' : symbol === 'P' ? 'planet' : ''}">${symbol === '.' ? '' : symbol}</div>`).join('')}</div>`; }
function galaxyTemplate() { return `<div class="galaxy-grid">${game.map.map(quadrant => `<button class="quad ${quadrant.known ? 'known' : ''} ${quadrant.x === game.pos.qx && quadrant.y === game.pos.qy ? 'current' : ''} ${quadrant.k ? 'enemy' : ''}" data-quad="${quadrant.x},${quadrant.y}" aria-label="Квадрант ${quadrant.x},${quadrant.y}">${quadrant.known ? `${quadrant.k}${quadrant.base ? 1 : 0}${quadrant.stars}` : '···'}</button>`).join('')}</div>`; }
function actionsTemplate() { return `<div class="tactical-actions"><button class="tool-btn" data-action="phaser">${t('phasers')}</button><button class="tool-btn" data-action="photon">${t('photon')}</button><button class="tool-btn" data-action="shield">${t('shieldsAction')}</button><button class="tool-btn" data-action="dock">${t('dock')}</button><button class="tool-btn" data-action="orbit">${t('orbitAction')}</button><button class="tool-btn" data-action="transport">${t('transport')}</button><button class="tool-btn" data-action="mine">${t('mine')}</button><button class="tool-btn" data-action="scan">${t('scan')}</button><button class="tool-btn" data-action="rest">${t('rest')}</button></div>`; }
function movePadTemplate() { const symbols = { nw: '↖', n: '↑', ne: '↗', w: '←', e: '→', sw: '↙', s: '↓', se: '↘' }; return `<div class="move-pad">${['nw', 'n', 'ne', 'w', '', 'e', 'sw', 's', 'se'].map(direction => `<button data-move="${direction}" ${direction ? '' : 'disabled'}>${symbols[direction] || ''}</button>`).join('')}</div>`; }
function readoutTemplate() { return `<div class="readout"><h3>Enterprise · Q${game.pos.qx},${game.pos.qy}</h3><div class="metric"><span>${t('date')}</span><strong>${game.stardate.toFixed(1)}</strong></div><div class="metric"><span>${t('time')}</span><strong>${game.time.toFixed(1)}</strong></div><div class="metric"><span>${t('condition')}</span><strong class="${game.condition === 'RED' ? 'danger' : ''}">${game.condition}</strong></div><div class="metric"><span>${t('energy')}</span><strong>${Math.round(game.energy)}</strong></div><div class="metric"><span>${t('shields')}</span><strong>${Math.round(game.shields)}</strong></div><div class="metric"><span>${t('torpedoes')}</span><strong>${game.torps}</strong></div><div class="metric"><span>${t('enemies')}</span><strong>${game.kills}/${game.initialEnemies} ${t('cleared')}</strong></div></div>`; }
function consoleStatusText() { return `${t('status').toUpperCase()}\n-----------------\n${t('date')}       ${game.stardate.toFixed(1)}\n${t('time')}       ${game.time.toFixed(1)}\n${t('position')}   Q${game.pos.qx},${game.pos.qy}  S${game.pos.sx},${game.pos.sy}\n${t('condition')}  ${game.condition}\n${t('energy')}     ${Math.round(game.energy)}\n${t('shields')}    ${Math.round(game.shields)}  ${game.shieldsUp ? 'UP' : 'DOWN'}\n${t('torpedoes')}  ${game.torps}\n${t('orbit')}      ${game.inOrbit ? t('standard') : t('none')}\n${t('landing')}    ${game.landed ? t('onPlanet') : t('onBoard')}\n${t('crystals')}   ${game.crystals ? t('onBoard') : game.pendingCrystals ? t('withParty') : t('none')}\n${t('fleet')}      ${game.kills}/${game.initialEnemies} ${t('cleared')}`; }
function consoleTemplate() { return `<section class="console-deck"><div class="console-panel console-sector"><div class="console-title">${t('localSector').toUpperCase()} <span>Q${game.pos.qx},${game.pos.qy}</span></div><pre class="console-ascii">${escapeHtml(renderSectorText())}</pre><section class="console-command"><div class="console-title">${t('commandConsole').toUpperCase()} <span>${t('lastResponse').toUpperCase()}</span></div><div class="terminal-log ${game.output?.kind || ''}" id="log">${escapeHtml(game.output?.text || '')}</div><form class="commandline" id="command"><span>COMMAND&gt;</span><input autocomplete="off" aria-label="${t('commandConsole')}" autofocus placeholder="help · move n 2 · move 1 1 · warp 5 2" /></form></section></div><div class="console-stack"><div class="console-panel"><div class="console-title">${t('galaxy').toUpperCase()} <span>${t('knownSpace').toUpperCase()}</span></div><pre class="console-ascii galaxy-ascii">${escapeHtml(galaxyText())}</pre><div class="console-keyline">${t('cellLegend').toUpperCase()}</div></div><div class="console-panel"><pre class="console-ascii status-ascii">${escapeHtml(consoleStatusText())}</pre></div></div></section>`; }
function deckTemplate() { return `<section class="deck"><div class="deck-panel"><div class="deck-title"><h2>${t('tacticalGrid')}</h2><span>Quadrant ${game.pos.qx},${game.pos.qy}</span></div>${sectorTemplate()}${actionsTemplate()}</div><div class="control-deck"><div class="deck-panel"><div class="deck-title"><h2>${t('galaxy')}</h2><span>${t('clickWarp')}</span></div>${galaxyTemplate()}<p class="prose">${t('galaxyHint')}</p></div>${readoutTemplate()}<div class="deck-panel"><div class="deck-title"><h2>${t('helm')}</h2><span>${t('impulse')}</span></div>${movePadTemplate()}</div><div class="deck-panel"><div class="deck-title"><h2>${t('captainOutput')}</h2><span>${t('lastResponse')}</span></div><div class="log-mini ${game.output?.kind || ''}" id="log">${escapeHtml(game.output?.text || '')}</div></div></div></section>`; }
function helpModal() { const help = helpItems(); return `<div class="modal" id="help-modal"><section class="modal-card help-card" role="dialog" aria-modal="true" aria-label="${t('missionHelp')}"><button class="modal-close" id="close-help" aria-label="${t('closeHelp')}">×</button><div class="eyebrow">${t('commandReference')}</div><h2>${t('missionHelp')}</h2><div class="help-grid">${Object.entries(help).filter(([key]) => key !== 'overview').map(([key, item]) => `<button class="help-link" data-help-topic="${key}"><b>${key}</b><span>${item[1].split('. ')[0]}.</span></button>`).join('')}</div><div class="help-detail" id="help-detail">${escapeHtml(helpText())}</div></section></div>`; }
function endModal() { return `<div class="modal"><section class="modal-card"><div class="eyebrow">${t('missionCompleted')}</div><h2>${game.kills >= game.initialEnemies ? t('federationVictory') : t('missionEnded')}</h2><p>${escapeHtml(game.output?.text || '').replaceAll('\n', ' ')}</p><div class="modal-actions"><button class="secondary" id="keep">${t('close')}</button><button class="primary" id="again">${t('newGame')}</button></div></section></div>`; }
function escapeHtml(value) { return String(value).replace(/[&<>]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[char])); }

function bindLanguageButtons() { document.querySelectorAll('[data-language]').forEach(button => button.onclick = () => setLanguage(button.dataset.language)); }
function bindIntro() { $('#new').onclick = () => { ui.screen = 'setup'; render(); }; $('#resume')?.addEventListener('click', resume); $('#music').onclick = toggleMusic; bindLanguageButtons(); }
function bindSetup() { $('#back').onclick = () => { ui.screen = 'intro'; render(); }; $('#launch').onclick = () => { ui.view = $('#startView').value; newGame({ length: +$('#length').value, skill: +$('#skill').value, name: $('#captain').value.trim() || (ui.language === 'ru' ? 'КАПИТАН' : 'CAPTAIN') }); ui.screen = 'game'; render(); }; bindLanguageButtons(); }
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
  bindLanguageButtons();
  document.querySelectorAll('[data-quad]').forEach(button => button.onclick = () => { const [x, y] = button.dataset.quad.split(',').map(Number); const dx = x - game.pos.qx; const dy = y - game.pos.qy; if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1 && (dx || dy)) move(dx, dy, true); else commandFailure(m('Варп требует соседней цели.', 'Warp requires an adjacent target.')); });
  $('#save').onclick = () => { output(m('Сохранение подтверждено.', 'Save confirmed.'), 'system'); save(); render(); }; $('#sound').onclick = toggleMusic;
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
