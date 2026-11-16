/** 首批素材的环境摆放、有限行为与轻布置规则，不修改贡献数据。 */
import { ART_BY_ID, RESIDENT_TYPES, BOTANICAL_TYPES, WATER_PLANTS } from './art-catalog.js';
import { terrainFor, onDryLand, waterAt, inWater, inRect } from './farm-terrain.js';

const area = (left, right, top, bottom) => ({ left, right, top, bottom });
const point = (x, y) => ({ x, y });

/** 先划功能区域，再定义建筑入口；错落形状由若干矩形的并集组成。 */
export const FARM_ZONES = {
  home: { name: '住宅小院', shape: [area(244, 404, 68, 300), area(172, 284, 236, 300)],
    allowed: ['cottage', 'cat', 'farmer', 'lamp', 'daisy', 'sunflower', 'grass', 'path', 'bridge'],
    anchors: { cottage: point(320, 208), cat: point(352, 232) }, entrance: point(316, 228) },
  livestock: { name: '畜牧院', shape: [area(18, 208, 140, 346)],
    allowed: ['barn', 'fence', 'chicken', 'sunflower', 'grass', 'path'],
    anchors: { barn: point(116, 244) }, entrance: point(148, 316) },
  field: { name: '种植区', shape: [area(402, 752, 166, 506), area(332, 396, 276, 328)],
    allowed: ['wheat', 'carrot', 'pumpkin', 'well', 'scarecrow', 'daisy', 'sunflower', 'grass', 'path', 'farmer'],
    anchors: { well: point(352, 304), scarecrow: point(452, 188) }, entrance: point(588, 364) },
  garden: { name: '池塘花园', shape: [area(18, 410, 320, 496), area(252, 404, 272, 344)],
    allowed: ['pond', 'fish', 'reed', 'daisy', 'sunflower', 'grass', 'lamp', 'sproutling', 'path', 'deck'],
    anchors: { pond: point(204, 434), sproutling: point(350, 340) }, entrance: point(396, 364) },
  woodland: { name: '林地角落', shape: [area(408, 752, 60, 172), area(20, 396, 474, 504), area(20, 64, 302, 350)],
    canopy: area(8, 760, 8, 504),
    allowed: ['oak', 'pine', 'copper', 'amethyst', 'grass', 'daisy'],
    anchors: { oak: point(448, 144), pine: point(708, 152) }, entrance: point(588, 160) },
};
for (const zone of Object.values(FARM_ZONES)) zone.allowed.push(...BOTANICAL_TYPES.filter(type => !WATER_PLANTS.includes(type)), 'barrel', 'crate', 'woodpile', 'bench', 'hedge', 'tall-mushroom');
FARM_ZONES.home.allowed.push('villager'); FARM_ZONES.livestock.allowed.push('keeper');
FARM_ZONES.garden.allowed.push('gardener', 'angler', ...WATER_PLANTS);

/** 路段和停留时间离线预排，居民错峰活动；各自通道不互相穿越。 */
export const RESIDENT_CYCLE = 60;
export const RESIDENT_ROUTES = {
  farmer: { zone: 'field', depart: 0, points: [[412, 244], [412, 364], [588, 364], [588, 340], [588, 364], [412, 364], [412, 244]] },
  gardener: { zone: 'garden', depart: 14, points: [[72, 344], [100, 344], [100, 332], [72, 332], [72, 344]] },
  angler: { zone: 'garden', depart: 28, points: [[396, 396], [364, 396], [364, 420], [396, 420], [396, 396]] },
  keeper: { zone: 'livestock', depart: 8, points: [[136, 328], [160, 328], [160, 344], [136, 344], [136, 328]] },
  villager: { zone: 'home', depart: 36, points: [[276, 244], [276, 260], [184, 260], [184, 280], [184, 260], [276, 260], [276, 244]] },
};
const directionOf = (a, b) => b[0] > a[0] ? 'right' : b[0] < a[0] ? 'left' : b[1] > a[1] ? 'down' : 'up';
const schedules = Object.fromEntries(Object.entries(RESIDENT_ROUTES).map(([type, route]) => {
  let time = route.depart, walked = 0;
  const segments = route.points.slice(1).map((b, i) => {
    const a = route.points[i], length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const duration = length / 16 + .18, hold = i === Math.floor((route.points.length - 2) / 2) ? 5 : .24;
    const segment = { a, b, length, duration, hold, start: time, walked, direction: directionOf(a, b) };
    time += duration + hold; walked += length;
    return segment;
  });
  if (time >= RESIDENT_CYCLE) throw new Error(`${type}路线超出60秒周期`);
  return [type, segments];
}));
const road = (id, width, points) => ({ id, width, points: points.map(p => Array.isArray(p) ? point(...p) : p) });
const routes = [
  road('porch', 22, [[316, 228], [316, 244], [276, 244], [276, 260], [192, 260]]),
  road('yard-gate', 20, [[192, 260], [192, 300], [180, 300], [180, 328], [148, 328], [148, 316]]),
  road('garden-entry', 20, [[148, 328], [112, 328], [112, 344], [52, 344]]),
  road('field-entry', 22, [[316, 228], [412, 228], [412, 364], [588, 364]]),
  road('forest-entry', 20, [[412, 228], [412, 160], [588, 160], [588, 494]]),
  road('pond-bank', 20, [[412, 364], [396, 364], [396, 488]]),
  road('barn-door', 16, [[104, 246], [104, 264]]),
  ...Object.entries(RESIDENT_ROUTES).map(([type, route]) => road(`${type}-walk`, 20, route.points)),
];
/** 地形加工、默认摆放、活动与交互共用；所有坐标为768×512逻辑像素。 */
export const FARM_MAP = {
  width: 768, height: 512, revision: 7,
  bounds: area(8, 760, 8, 504), interior: area(18, 750, 18, 504), zones: FARM_ZONES,
  beds: [
    { id: 'home-field', ...area(434, 572, 194, 352), grid: { x: 457, y: 240, columns: 3, rows: 5, dx: 46, dy: 26, capacity: 15 } },
    { id: 'forest-field', ...area(610, 748, 172, 330), grid: { x: 633, y: 218, columns: 3, rows: 5, dx: 46, dy: 26, capacity: 15 } },
    { id: 'shore-field', ...area(416, 554, 376, 506), grid: { x: 439, y: 422, columns: 3, rows: 4, dx: 46, dy: 26, capacity: 12 } },
    { id: 'south-field', ...area(610, 748, 352, 482), grid: { x: 633, y: 398, columns: 3, rows: 4, dx: 46, dy: 26, capacity: 11 } },
  ],
  routes,
  paths: routes.flatMap(route => route.points.slice(1).map((b, i) => {
    const a = route.points[i], r = route.width / 2;
    return { ...area(Math.min(a.x, b.x) - r, Math.max(a.x, b.x) + r, Math.min(a.y, b.y) - r, Math.max(a.y, b.y) + r), route: route.id };
  })),
  pads: [area(252, 386, 212, 268), area(48, 184, 246, 302)],
  orchard: [point(476, 108), point(560, 108), point(652, 108)],
  chickenYard: area(52, 184, 252, 302),
  chickenHomes: [point(72, 276), point(110, 276), point(146, 276), point(90, 284), point(138, 284)],
  decks: [
    { id: 'bridge', type: 'bridge', zone: 'home', x: 224, y: 280, walk: area(180, 268, 248, 274) },
    { id: 'deck', type: 'deck', zone: 'garden', x: 376, y: 432, walk: area(340, 412, 384, 428) },
  ],
  waterBodies: [
    { id: 'north', polygon: [[0, 0], [254, 0], [254, 30], [242, 50], [236, 72], [210, 92], [164, 104], [138, 92], [96, 104], [64, 94], [32, 106], [0, 98]], fish: [[40, 30], [172, 30], [180, 60], [52, 66]] },
    { id: 'stream', polygon: [[212, 60], [238, 60], [240, 148], [242, 204], [240, 288], [244, 342], [208, 346], [208, 286], [204, 224], [210, 152]], fish: [[224, 120], [224, 280], [224, 320], [224, 180]] },
    { id: 'pond', polygon: [[212, 320], [248, 326], [258, 346], [300, 342], [320, 354], [350, 358], [374, 380], [368, 410], [388, 434], [374, 454], [338, 470], [270, 464], [244, 474], [190, 466], [170, 474], [112, 462], [92, 472], [52, 460], [32, 440], [42, 414], [20, 398], [30, 378], [58, 354], [104, 360], [120, 346], [166, 350], [190, 332]], fish: [[80, 390], [192, 370], [312, 394], [324, 434], [192, 442], [76, 430]] },
  ],
  residentRoute: RESIDENT_ROUTES.farmer.points.map(([x, y]) => point(x, y)),
  residentProtection: Object.values(RESIDENT_ROUTES).flatMap(route => route.points.slice(1).map((b, i) => {
    const a = route.points[i];
    return area(Math.min(a[0], b[0]) - 10, Math.max(a[0], b[0]) + 10, Math.min(a[1], b[1]) - 11, Math.max(a[1], b[1]) + 5);
  })),
  grove: [[448, 144, .72], [496, 140, .96], [540, 144, .88], [588, 144, .96], [632, 140, .9], [676, 144, .96], [716, 156, .76],
    [36, 332, .35], [68, 496, .64], [144, 500, .58], [248, 500, .54], [340, 500, .6]],
  flowerBeds: [area(252, 394, 276, 316), area(20, 60, 270, 350), area(252, 268, 148, 204), area(364, 396, 124, 208),
    area(424, 744, 136, 168), area(20, 376, 478, 504), area(556, 572, 386, 496)],
};
export const containsBounds = (outer, inner) => inner.left >= outer.left && inner.right <= outer.right && inner.top >= outer.top && inner.bottom <= outer.bottom;
export const overlaps = (a, b, gap = 3) => a.left < b.right + gap && a.right > b.left - gap && a.top < b.bottom + gap && a.bottom > b.top - gap;

/** 矩形必须完整落在区域并集中，不能跨过错落边界的凹口。 */
export function containsInZone(zone, bounds) {
  const cuts = [bounds.left, bounds.right, ...zone.shape.flatMap(a => [a.left, a.right])]
    .filter(x => x >= bounds.left && x <= bounds.right).sort((a, b) => a - b);
  return cuts.slice(1).every((right, i) => {
    const left = cuts[i];
    if (left === right) return true;
    const spans = zone.shape.filter(a => a.left <= left && a.right >= right).sort((a, b) => a.top - b.top);
    let covered = bounds.top;
    for (const span of spans) if (span.top <= covered) covered = Math.max(covered, span.bottom);
    return covered >= bounds.bottom;
  });
}
const object = (zone, id, type, x, y, extra = {}) => ({ id, type, x, y, zone, ambient: true, ...extra });
export function createFarmObjects(scene) {
  const objects = [];
  const add = (zone, id, type, x, y, extra) => objects.push(object(zone, id, type, x, y, extra));
  for (const [zone, type] of [['livestock', 'barn'], ['home', 'cottage'], ['home', 'cat'], ['garden', 'sproutling'], ['field', 'well']]) {
    const p = FARM_ZONES[zone].anchors[type]; add(zone, type, type, p.x, p.y);
  }
  add('garden', 'pond', 'pond', 204, 434, { terrainId: 'pond' });
  for (const deck of FARM_MAP.decks) add(deck.zone, deck.id, deck.type, deck.x, deck.y, { surface: true });
  for (const [type, route] of Object.entries(RESIDENT_ROUTES)) add(route.zone, type, type, ...route.points[0]);
  FARM_MAP.grove.forEach(([x, y, size], i) => add('woodland', i === 0 ? 'oak-grove' : i === 6 ? 'pine-edge' : `grove-${i}`,
    i % 3 === 0 ? 'pine' : 'oak', x, y, { size, fixed: i !== 0 && i !== 6 }));
  for (const [i, tree] of (scene.trees || []).entries()) add('woodland', `language-${i}`, i === 1 ? 'pine' : 'oak', tree.x, tree.y,
    { size: .42, ambient: false, language: tree.language });
  for (const x of [64, 100, 188]) add('livestock', `fence-front-${x}`, 'fence', x, 312);
  for (const x of [40, 200]) for (const y of [270, 300]) {
    if (x === 200 && y === 270) continue;
    add('livestock', `fence-side-${x}-${y}`, 'fence', x, y, { axis: 'vertical' });
  }
  add('home', 'path-0', 'path', 316, 216);
  add('home', 'path-1', 'path', 316, 228);
  if (scene.scarecrow) add('field', 'streak-scarecrow', 'scarecrow', 452, 188, { ambient: false });
  // 先预留所有可能的贡献装饰，再放常驻花带；低贡献也不能把下一档的位置占掉。
  for (let i = 0; i < 4; i++) add('home', `issue-flower-${i}`, i % 2 ? 'sunflower' : 'daisy', [264, 292, 320, 388][i], 284, { ambient: false, reserved: i >= scene.decorations });
  const offsets = [[0, 0]];
  for (let radius = 4; radius <= 64; radius += 4) for (let dy = -radius; dy <= radius; dy += 4) for (let dx = -radius; dx <= radius; dx += 4) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) === radius) offsets.push([dx, dy]);
  }
  const place = (zone, id, type, x, y, extra = {}) => {
    add(zone, id, type, x, y, extra);
    for (const [dx, dy] of offsets) {
      const result = placementAt({ ...scene, objects }, id, x + dx, y + dy);
      if (result.ok) { objects[objects.length - 1] = result.entity; return; }
    }
    throw new Error(`${id}/${type}在${zone}的${x},${y}附近没有合法位置`);
  };
  for (const [zone, id, type, x, y] of [
    ['garden', 'mushroom-1', 'tall-mushroom', 276, 336], ['garden', 'mushroom-2', 'tall-mushroom', 308, 336],
    ['home', 'barrel-door', 'barrel', 376, 212], ['home', 'crate-door', 'crate', 260, 212],
    ['home', 'woodpile-house', 'woodpile', 380, 268], ['garden', 'bench-bank', 'bench', 320, 328],
    ['home', 'lamp-house', 'lamp', 376, 252], ['garden', 'lamp-garden', 'lamp', 380, 344],
    ['home', 'daisy-front', 'daisy', 340, 256], ['home', 'daisy-porch', 'daisy', 300, 252],
    ['home', 'sunflower-house', 'sunflower', 256, 180], ['livestock', 'sunflower-barn', 'sunflower', 40, 228],
    ['garden', 'daisy-garden', 'daisy', 276, 328], ['garden', 'reed-left', 'reed', 28, 352],
    ['garden', 'reed-back', 'reed', 320, 340], ['garden', 'reed-bank', 'reed', 380, 372],
    ['garden', 'daisy-bank', 'daisy', 360, 340], ['woodland', 'grass-bank', 'grass', 120, 492],
    ['woodland', 'grass-left', 'grass', 28, 496], ['field', 'sunflower-front', 'sunflower', 380, 320],
    ['field', 'grass-front', 'grass', 636, 496], ['woodland', 'copper', 'copper', 200, 496],
    ['woodland', 'amethyst', 'amethyst', 736, 112], ['woodland', 'grass-right', 'grass', 744, 148],
  ]) place(zone, id, type, x, y, id === 'mushroom-2' ? { size: .82 } : {});
  const clusters = [
    ['home', 252, 148, ['tulip', 'cosmos', 'lavender']],
    ['home', 384, 148, ['hydrangea', 'tulip', 'cosmos']],
    ['garden', 316, 316, ['iris', 'lavender', 'cosmos']],
    ['garden', 372, 300, ['hydrangea', 'iris', 'tulip']],
    ['woodland', 460, 128, ['fern', 'berry', 'red-mushroom', 'honey-mushroom']],
    ['woodland', 680, 132, ['fern', 'berry', 'red-mushroom', 'honey-mushroom']],
    ['woodland', 200, 492, ['fern', 'berry']],
    ['woodland', 432, 104, ['red-mushroom', 'honey-mushroom']],
    ['woodland', 304, 492, ['cosmos', 'tulip', 'lavender']],
    ['garden', 24, 416, ['cattail']], ['garden', 380, 460, ['cattail']],
    ['livestock', 28, 196, ['cosmos', 'tulip']],
  ];
  let serial = 0;
  for (const [zone, x, y, types] of clusters) for (const type of types) place(zone, `botanical-${serial++}`, type, x, y, { size: .8 });
  for (const [type, x, y] of [['lilypad', 104, 402], ['waterlily', 152, 430], ['lilypad', 280, 406], ['waterlily', 320, 446], ['lilypad', 224, 380]]) {
    const entity = object('garden', `water-${serial++}`, type, x, y);
    if (!inWater(terrainFor(FARM_MAP), { ...visualBounds(entity), top: visualBounds(entity).top - 1, bottom: entity.y + 3 })) throw new Error('水生植物超出岸线');
    objects.push(entity);
  }
  for (const [x, y] of [[496, 186], [528, 186], [560, 186]]) {
    const entity = object('field', `hedge-${x}-${y}`, 'hedge', x, y, { fixed: true });
    const bounds = objectBounds(entity);
    if (!onDryLand(terrainFor(FARM_MAP), bounds) || [...FARM_MAP.paths, ...FARM_MAP.beds, ...FARM_MAP.residentProtection].some(area => overlaps(bounds, area))
      || objects.some(other => !other.terrainId && !other.surface && overlaps(bounds, objectBounds(other)))) throw new Error('固定树篱占用通路或其他物件');
    objects.push(entity);
  }
  return objects.filter(entity => !entity.reserved);
}

/** 固定60秒时间表：位置纯函数采样、距离驱动步频，拐角短暂停稳。 */
export function sampleWalker(entity, seconds) {
  const cycle = ((seconds % RESIDENT_CYCLE) + RESIDENT_CYCLE) % RESIDENT_CYCLE;
  const route = RESIDENT_ROUTES[entity.type], schedule = schedules[entity.type];
  const idle = (position, direction, action = false) => ({ x: position[0], y: position[1], direction, moving: false, distance: 0, flip: false,
    key: action ? `${entity.type}-action-${Math.floor(cycle * 2) % 2}` : `${entity.type}-${direction}-idle-${cycle % 4.3 > 4.1 ? 1 : 0}` });
  for (const segment of schedule) {
    if (cycle < segment.start - 1e-9) return idle(segment.a, segment.direction);
    const local = Math.max(0, cycle - segment.start);
    if (local < segment.duration) {
      const remaining = segment.duration - local;
      const distance = local < .18 ? 16 * local * local / .36
        : remaining < .18 ? segment.length - 16 * remaining * remaining / .36 : 16 * (local - .09);
      const ratio = distance / segment.length;
      return { x: segment.a[0] + (segment.b[0] - segment.a[0]) * ratio, y: segment.a[1] + (segment.b[1] - segment.a[1]) * ratio,
        direction: segment.direction, moving: local > 0, distance: segment.walked + distance, flip: false,
        key: `${entity.type}-${segment.direction}-walk-${Math.floor((segment.walked + distance) / 2) % 6}` };
    }
    if (local < segment.duration + segment.hold - 1e-9) return idle(segment.b, segment.direction, segment.hold > 1);
  }
  return idle(route.points[0], 'down', cycle % 12 < 4);
}

/** 猫与芽芽保留原有的短循环，不受居民数量影响。 */
export function sampleResident(entity, seconds) {
  if (RESIDENT_TYPES.includes(entity.type)) return sampleWalker(entity, seconds);
  const cycle = ((seconds % 20) + 20) % 20;
  let { x, y } = entity;
  let frame = 0, flip = false;
  if (entity.type === 'cat') {
    frame = cycle < 5 ? 0 : cycle < 6 ? 1 : cycle < 9 ? 2 : 3;
  } else if (entity.type === 'sproutling') {
    frame = cycle < 6 ? 0 : cycle < 7 ? 1 : cycle < 12 ? 2 : 3;
  }
  return { x, y, flip, key: ART_BY_ID[entity.type].frames[frame] };
}

/** 锦鲤始终限制在池水内部；鱼的样式不影响贡献总量。 */
export function sampleFish(pond, seconds, index = 0) {
  const body = pond?.fish ? pond : FARM_MAP.waterBodies.find(body => body.id === (pond?.terrainId || 'pond'));
  const points = body.fish, phase = ((seconds / 7 + index * points.length / 2) % points.length + points.length) % points.length;
  const a = points[Math.floor(phase)], b = points[(Math.floor(phase) + 1) % points.length], t = phase % 1;
  return { x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t,
    flip: b[0] < a[0], key: ART_BY_ID.fish.frames[Math.floor(((seconds % 1) + 1) % 1 * 4)] };
}

export function objectBounds(entity) {
  const [width, depth] = entity.type === 'fence' && entity.axis === 'vertical' ? [8, 30] : ART_BY_ID[entity.type].footprint;
  const size = entity.size || 1;
  return { left: entity.x - width * size / 2, right: entity.x + width * size / 2, top: entity.y - depth * size, bottom: entity.y + 2 };
}
/** 完整图像包围盒区别于脚底占地；额外留出像素取整、翻转和风摆的余量。 */
export function visualBounds(entity) {
  if (entity.type === 'fence' && entity.axis === 'vertical') return { left: entity.x - 5, right: entity.x + 5, top: entity.y - 48, bottom: entity.y + 2 };
  const art = ART_BY_ID[entity.type];
  const size = entity.size || 1, padding = 2 + (['树木', '花草'].includes(art.category) ? art.height * size * .024 : 0);
  return { left: entity.x - art.width * size / 2 - padding, right: entity.x + art.width * size / 2 + padding,
    top: entity.y - art.height * size - 2, bottom: entity.y + 2 };
}
export function objectPose(entity, seconds = 0) {
  if (WATER_PLANTS.includes(entity.type)) return { ...entity, y: entity.y + Math.sin(seconds * .9 + entity.x) * .65 };
  return [...RESIDENT_TYPES, 'cat', 'sproutling'].includes(entity.type) ? { ...entity, ...sampleResident(entity, seconds) } : entity;
}
export function objectDepth(entity, seconds = 0) {
  // 池水和石径属于地面层，不能因底边更靠前而盖住站立角色。
  return objectPose(entity, seconds).y - (entity.type === 'pond' ? FARM_MAP.height * 2 : ['path', 'bridge', 'deck', ...WATER_PLANTS].includes(entity.type) ? FARM_MAP.height : 0);
}
export function hitTestObject(scene, x, y, seconds = 0, manifest) {
  if ((scene.crops || []).some(crop => x >= crop.x - 9 && x <= crop.x + 9 && y >= crop.y - 2 && y <= crop.y + 4)) return undefined;
  const layers = (scene.objects || []).flatMap(entity => entity.surface
    ? [{ entity, depth: objectDepth(entity), part: 'floor' }, { entity, depth: entity.y - 2, part: 'rail' }]
    : [{ entity, depth: objectDepth(entity, seconds) }]);
  return layers.sort((a, b) => a.depth - b.depth).reverse().find(({ entity, part }) => {
    const art = ART_BY_ID[entity.type], pose = objectPose(entity, seconds);
    if (entity.terrainId) return !!waterAt(FARM_MAP, x, y);
    if (entity.surface) {
      const left = entity.x - art.width / 2, top = entity.y - art.height;
      if (part === 'floor') return inRect(area(left + 3, left + art.width - 3, top + 3, entity.y - 6), x, y);
      return inRect(area(left + 4, left + art.width - 4, entity.y - 11, entity.y - 7), x, y)
        || [3, Math.floor(art.width / 2) - 2, art.width - 8].some(dx => inRect(area(left + dx, left + dx + 5, entity.y - 17, entity.y - 2), x, y));
    }
    let bounds = visualBounds(pose);
    if (manifest && !(entity.type === 'fence' && entity.axis === 'vertical')) {
      const rect = manifest.sprites[pose.key || art.frames[0]];
      const scale = (entity.size || 1) * art.height / (rect.sourceHeight || Math.max(...art.frames.map(frame => manifest.sprites[frame].h)));
      const width = Math.round(rect.w * scale), height = Math.round(rect.h * scale);
      const px = rect.pivot ? rect.pivot[0] * scale : width / 2, py = rect.pivot ? rect.pivot[1] * scale : height;
      bounds = { left: pose.x - px, right: pose.x - px + width, top: pose.y - py, bottom: pose.y - py + height };
    }
    return x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom;
  })?.entity;
}
export function placementAt(scene, id, x, y) {
  const entity = scene.objects?.find(item => item.id === id);
  if (!entity || entity.fixed || !ART_BY_ID[entity.type]?.movable) return { ok: false, reason: '此对象固定，不能移动。' };
  if (!Number.isFinite(x) || !Number.isFinite(y)) return { ok: false, reason: '无效的位置。' };
  const next = { ...entity, x: Math.round(x / 4) * 4, y: Math.round(y / 4) * 4 }, bounds = objectBounds(next);
  const visible = visualBounds(next);
  if (!containsBounds(FARM_MAP.interior, bounds) || !containsBounds(FARM_MAP.bounds, visible)) {
    return { ok: false, reason: '整个物件都要留在地图内，树冠也不能越界。' };
  }
  const zone = FARM_ZONES[entity.zone];
  if (!zone || !zone.allowed.includes(entity.type) || !containsInZone(zone, bounds)) {
    return { ok: false, reason: `请将${ART_BY_ID[entity.type].name}留在${zone?.name || '所属区域'}的可用范围内。` };
  }
  if (!onDryLand(terrainFor(FARM_MAP), bounds)) return { ok: false, reason: '陆生物件不能放入水面、木桥或平台。' };
  if ([...FARM_MAP.beds, ...FARM_MAP.paths, ...FARM_MAP.residentProtection, FARM_MAP.chickenYard].some(area => overlaps(bounds, area))) {
    return { ok: false, reason: '农田、门口、岸边小径和小鸡活动区需要留空。' };
  }
  if ((scene.crops || []).some(crop => overlaps(visible, { left: crop.x - 9, right: crop.x + 9, top: crop.y - 2, bottom: crop.y + 4 }, 0))) {
    return { ok: false, reason: '物件会遮住作物根部，需保留周贡献的点选位置。' };
  }
  if (ART_BY_ID[entity.type].category === '树木' && (!containsBounds(zone.canopy, visible) || FARM_MAP.beds.some(bed => overlaps(visible, bed)) || scene.objects.some(other => ['barn', 'cottage'].includes(other.type) && overlaps(visible, visualBounds(other), 0)))) {
    return { ok: false, reason: '树冠需留在林地上方，不能遮住房屋或农田。' };
  }
  if (ART_BY_ID[entity.type].category === '树木' || entity.type === 'tall-mushroom') {
    const stops = Object.values(RESIDENT_ROUTES).flatMap(route => route.points.map(([x, y]) => area(x - 7, x + 7, y - 28, y + 2)));
    const doors = [area(304, 332, 178, 232), area(88, 124, 214, 264)];
    if ([...stops, ...doors].some(target => overlaps(visible, target, 0))) return { ok: false, reason: '高大植被不能遮住房门或居民停留点。' };
  }
  const blocked = scene.objects.some(other => other.id !== id && !other.terrainId && !other.surface && overlaps(bounds, objectBounds(other)));
  if (blocked) return { ok: false, reason: '这里已有物件，请避开建筑、池塘和其他装饰。' };
  return { ok: true, entity: next };
}
export function moveFarmObject(scene, id, x, y) {
  const result = placementAt(scene, id, x, y);
  if (!result.ok) return result;
  return { ok: true, scene: { ...scene, objects: scene.objects.map(item => item.id === id ? result.entity : item) } };
}
