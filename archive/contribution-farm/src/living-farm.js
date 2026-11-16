/** 春日动态农场：浏览器和 Node.js 共用的确定性场景、动画与绘制逻辑。 */
import { ART_BY_ID, CROP_TYPES, WATER_PLANTS } from './art-catalog.js';
import { FARM_MAP, createFarmObjects, sampleFish, objectBounds, objectPose, objectDepth } from './farm-objects.js';
import { terrainFor, inWater, traceWater, terrainHash } from './farm-terrain.js';
export const WORLD = { width: FARM_MAP.width, height: FARM_MAP.height };
export const STAGE_NAMES = ['种子', '嫩芽', '成长', '茂盛', '丰收'];
const CROP_HEIGHTS = [6, 12, 22, 34, 43];

export function hashSeed(text) {
  let seed = 2166136261;
  for (const char of String(text).toLowerCase()) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619);
  return seed >>> 0;
}
function randomAt(seed, index) {
  let value = Math.imul(seed ^ (index + 1), 1597334677);
  value = Math.imul(value ^ (value >>> 16), 2246822507);
  return ((value ^ (value >>> 13)) >>> 0) / 4294967296;
}
export function cropStage(total) {
  if (total <= 0) return -1;
  if (total < 8) return 0;
  if (total < 22) return 1;
  if (total < 50) return 2;
  if (total < 100) return 3;
  return 4;
}

/** 演示数据与用户名绑定；不同贡献档位共用日期，不冒充 GitHub 真实数据。 */
export function createDemoData(profile = 'medium', username = 'YeatsLiao') {
  if (!['low', 'medium', 'high'].includes(profile)) throw new Error('未知演示档位');
  const seed = hashSeed(username), multiplier = { low: 0.28, medium: 1, high: 2.3 }[profile];
  const start = Date.UTC(2025, 9, 26);
  const weeks = Array.from({ length: 52 }, (_, w) => {
    const strength = Math.pow(randomAt(seed, w), 1.65);
    const weekly = Math.floor(strength * 175 * multiplier);
    return { days: Array.from({ length: 7 }, (_, d) => ({
      date: new Date(start + (w * 7 + d) * 86400000).toISOString().slice(0, 10),
      count: Math.floor(weekly / 7) + (d < weekly % 7 ? 1 : 0), weekday: d,
    })) };
  });
  return {
    weeks, totalContributions: weeks.reduce((n, w) => n + w.days.reduce((s, d) => s + d.count, 0), 0),
    totalPRs: { low: 0, medium: 12, high: 32 }[profile],
    totalIssues: { low: 2, medium: 18, high: 30 }[profile],
    languages: [{ name: 'JavaScript', count: 8 }, { name: 'Python', count: 5 }, { name: 'TypeScript', count: 3 }],
    streak: { current: { low: 2, medium: 12, high: 35 }[profile], longest: { low: 5, medium: 18, high: 42 }[profile] },
    season: 'spring', source: 'demo', profile,
  };
}

/** 四块错落田地共容纳53周；成熟株也保留完整显示空间。 */
function fieldSlots() {
  return FARM_MAP.beds.flatMap(bed => {
    const grid = bed.grid;
    return Array.from({ length: Math.min(grid.capacity, grid.columns * grid.rows) }, (_, index) => ({
      x: grid.x + Math.floor(index / grid.rows) * grid.dx,
      y: grid.y + (grid.rows - 1 - index % grid.rows) * grid.dy,
      bed: bed.id, zone: 'field',
    }));
  });
}

export function createFarmScene(data, username = 'YeatsLiao') {
  if (!data || !Array.isArray(data.weeks)) throw new Error('缺少周贡献数据');
  const seed = hashSeed(username), slots = fieldSlots();
  const weeks = data.weeks.slice(-slots.length).map((week, index) => ({
    id: week.days?.[0]?.date || `week-${index}`,
    end: week.days?.at(-1)?.date || '',
    total: (week.days || []).reduce((sum, day) => sum + Math.max(0, Number(day.count) || 0), 0),
  })).sort((a, b) => a.total - b.total || a.id.localeCompare(b.id));
  const crops = weeks.map((week, index) => ({
    ...week, ...slots[index], stage: cropStage(week.total),
    cropType: CROP_TYPES[index % 7 === 0 ? 1 : index % 7 === 1 ? 2 : 0].id,
    phase: randomAt(seed, hashSeed(week.id)) * Math.PI * 2,
  }));
  const totalPRs = Math.max(0, Number(data.totalPRs) || 0);
  const chickens = Array.from({ length: 2 + Math.min(3, Math.floor(totalPRs / 8)) }, (_, index) => ({
    id: `chicken-${index}`, zone: 'livestock', baseX: FARM_MAP.chickenHomes[index].x, baseY: FARM_MAP.chickenHomes[index].y,
    phase: randomAt(seed, index + 90) * 16, ambient: index < 2,
  }));
  const scene = {
    version: 2, mapRevision: FARM_MAP.revision, username, seed, crops, chickens,
    trees: (data.languages || []).slice(0, 3).map((language, i) => ({
      ...FARM_MAP.orchard[i], key: i === 1 ? 'tree-pine' : 'tree-round', language: language.name,
    })),
    decorations: Math.min(4, Math.floor(Math.max(0, Number(data.totalIssues) || 0) / 6)),
    scarecrow: Math.max(data.streak?.current || 0, data.streak?.longest || 0) >= 30,
    total: weeks.reduce((sum, week) => sum + week.total, 0),
    totalPRs, totalIssues: data.totalIssues || 0,
    source: data.source || 'github', profile: data.profile,
    period: weeks.length ? `${[...weeks].sort((a, b) => a.id.localeCompare(b.id))[0].id} — ${[...weeks].sort((a, b) => b.id.localeCompare(a.id))[0].end}` : '暂无贡献记录',
  };
  scene.objects = createFarmObjects(scene);
  return scene;
}

/** 畜牧院内的四段短循环：转向、停留与啄食均不越过围栏。 */
export function sampleChicken(chicken, seconds) {
  const t = ((seconds + chicken.phase) % 16 + 16) % 16;
  const points = [[0, 0], [20, 4], [24, 14], [4, 12]];
  const segment = Math.floor(t / 4), local = t % 4, ratio = Math.min(local / 2.5, 1);
  const a = points[segment], b = points[(segment + 1) % points.length];
  const key = local < 2.5 ? (Math.floor(t * 6) % 2 ? 'chicken-step-a' : 'chicken-step-b')
    : local < 3 ? 'chicken-idle' : 'chicken-peck';
  return { x: chicken.baseX + a[0] + (b[0] - a[0]) * ratio,
    y: chicken.baseY + a[1] + (b[1] - a[1]) * ratio, facing: b[0] >= a[0] ? 1 : -1, key };
}

function sprite(ctx, assets, key, x, y, height, { flip = false, sway = 0, opacity = 1, fixedScale } = {}) {
  const rect = assets.manifest.sprites[key];
  if (!rect) return;
  const scale = fixedScale ?? height / rect.h;
  const w = Math.round(rect.w * scale), h = Math.round(rect.h * scale);
  ctx.save();
  ctx.globalAlpha *= opacity;
  ctx.translate(Math.round(x), Math.round(y));
  if (flip) ctx.scale(-1, 1);
  ctx.transform(1, 0, sway, 1, 0, 0);
  const px = rect.pivot ? Math.round(rect.pivot[0] * scale) : Math.round(w / 2);
  const py = rect.pivot ? Math.round(rect.pivot[1] * scale) : h;
  ctx.drawImage(assets.atlas, rect.x, rect.y, rect.w, rect.h, -px, -py, w, h);
  ctx.restore();
}
function groundWash(ctx, x, y, width, depth, color, opacity) {
  ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.scale(width, depth);
  const shade = ctx.createRadialGradient(0, 0, .1, 0, 0, 1);
  shade.addColorStop(0, `rgba(${color},${opacity})`);
  shade.addColorStop(.5, `rgba(${color},${opacity * .65})`);
  shade.addColorStop(1, `rgba(${color},0)`);
  ctx.fillStyle = shade; ctx.fillRect(-1, -1, 2, 2); ctx.restore();
}
function shadow(ctx, x, y, width, opacity = 0.12, depth = 2) {
  groundWash(ctx, x + 2, y - 1, width, depth, '49,62,34', opacity);
}
function drawGroundContact(ctx, entity, seconds) {
  if (entity.terrainId || entity.surface || ['path', 'fence', ...WATER_PLANTS].includes(entity.type)) return;
  const art = ART_BY_ID[entity.type], pose = objectPose(entity, seconds);
  const [width, depth] = art.footprint.map(value => value * (entity.size || 1));
  ctx.save(); ctx.beginPath();
  ctx.rect(FARM_MAP.interior.left, FARM_MAP.interior.top,
    FARM_MAP.interior.right - FARM_MAP.interior.left, FARM_MAP.interior.bottom - FARM_MAP.interior.top);
  ctx.clip();
  if (entity.type === 'pond') {
    groundWash(ctx, pose.x, pose.y - depth / 2, width * .57, depth * .58, '74,109,60', .36);
  } else {
    if (['树木', '花草', '矿物'].includes(art.category) || entity.type === 'well') {
      groundWash(ctx, pose.x, pose.y - 2, width * .8, Math.min(10, depth * .5), '98,109,61', .24);
    }
    const broad = ['树木', '建筑'].includes(art.category);
    shadow(ctx, pose.x, pose.y, width * (broad ? .58 : .48), broad ? .27 : .2, broad ? Math.min(12, depth * .4) : 3);
    if (broad) shadow(ctx, pose.x, pose.y, width * .4, .16, 2);
  }
  ctx.restore();
}

const spriteScales = new WeakMap();
function artSprite(ctx, assets, type, key, x, y, options = {}) {
  const art = ART_BY_ID[type], manifest = assets.manifest;
  if (!spriteScales.has(manifest)) spriteScales.set(manifest, new Map());
  const scales = spriteScales.get(manifest);
  if (!scales.has(type)) scales.set(type, art.height / (art.sourceHeight || Math.max(...art.frames.map(frame => manifest.sprites[frame].h))));
  sprite(ctx, assets, key, x, y, art.height, { fixedScale: scales.get(type) * (options.size || 1), ...options });
}

/** 素材册使用同一图集，展示完整对象，不把缩略图误当作实际场景比例。 */
export function drawAssetPreview(ctx, assets, art) {
  if (art.id === 'pond') {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height); ctx.imageSmoothingEnabled = false;
    const sx = assets.background.width / WORLD.width, sy = assets.background.height / WORLD.height;
    ctx.drawImage(assets.background, 16 * sx, 314 * sy, 380 * sx, 166 * sy, 4, 32, ctx.canvas.width - 8, (ctx.canvas.width - 8) * 166 / 380);
    return;
  }
  const key = art.category === '作物' ? art.frames.at(-1) : art.frames[0];
  const rect = assets.manifest.sprites[key];
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.save(); ctx.imageSmoothingEnabled = false;
  const scale = Math.min((ctx.canvas.width - 12) / rect.w, (ctx.canvas.height - 12) / rect.h);
  const w = Math.round(rect.w * scale), h = Math.round(rect.h * scale);
  ctx.drawImage(assets.atlas, rect.x, rect.y, rect.w, rect.h, Math.round((ctx.canvas.width - w) / 2), ctx.canvas.height - h - 6, w, h);
  ctx.restore();
}

function drawObject(ctx, assets, entity, seconds) {
  if (entity.terrainId) return;
  const art = ART_BY_ID[entity.type];
  const pose = { key: art.frames[0], ...objectPose(entity, seconds) };
  const wind = ['花草', '树木'].includes(art.category) && !entity.type.endsWith('mushroom')
    ? Math.sin(seconds * (entity.type === 'fern' ? 1.1 : 1.4) + entity.x * .31 + entity.y) * (art.botanical ? .024 : .012) : 0;
  if (WATER_PLANTS.includes(entity.type)) {
    ctx.save(); traceWater(ctx, FARM_MAP); ctx.clip();
    if (entity.type === 'waterlily') {
      const phase = ((seconds * .28 + .4) % 1 + 1) % 1;
      ctx.strokeStyle = `rgba(227,248,211,${.35 * (1 - phase)})`; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(entity.x, entity.y - 1, 7 + phase * 16, 2 + phase * 5, 0, 0, Math.PI * 2); ctx.stroke();
    }
    artSprite(ctx, assets, entity.type, pose.key, pose.x, pose.y);
    ctx.restore(); return;
  }
  if (entity.type === 'fence' && entity.axis === 'vertical') {
    // 同一种木栏的纵深侧面：立柱竖直，栏杆沿地面纵向延伸，不能旋转整张立面贴图。
    const x = entity.x, y = entity.y;
    ctx.fillStyle = '#69472d'; ctx.fillRect(x - 3, y - 44, 5, 36); ctx.fillRect(x, y - 37, 3, 36);
    ctx.fillStyle = '#ba8950'; ctx.fillRect(x - 2, y - 44, 3, 34); ctx.fillRect(x + 1, y - 37, 2, 34);
    for (const py of [y - 30, y]) {
      ctx.fillStyle = '#69472d'; ctx.fillRect(x - 4, py - 17, 8, 19);
      ctx.fillStyle = '#ce9d63'; ctx.fillRect(x - 3, py - 17, 5, 17);
      ctx.fillStyle = '#eed09a'; ctx.fillRect(x - 3, py - 18, 5, 3);
    }
    return;
  }
  artSprite(ctx, assets, entity.type, pose.key, pose.x, pose.y, { flip: pose.flip, sway: wind, size: entity.size });
}
function drawCrop(ctx, assets, crop, seconds) {
  if (crop.stage < 0) {
    ctx.fillStyle = 'rgba(93,55,24,.17)'; ctx.fillRect(crop.x - 6, crop.y, 12, 2); return;
  }
  const art = ART_BY_ID[crop.cropType || 'wheat'];
  const key = art.frames[crop.stage], rect = assets.manifest.sprites[key];
  const wind = Math.sin(seconds * 1.7 + crop.phase) * .022;
  const offsets = crop.stage === 0 ? [-7, 7] : art.id === 'wheat' ? [-8, 8, 0] : art.id === 'carrot' ? [-7, 7] : [0];
  offsets.forEach((dx, i) => {
    const x = crop.x + dx, y = crop.y + (i === 2 ? 3 : -1);
    const target = CROP_HEIGHTS[crop.stage] * art.height / 43 * (i === 0 && offsets.length > 1 ? .94 : 1);
    const scale = Math.min(target / rect.h, (art.id === 'pumpkin' ? 34 : 24) / rect.w);
    shadow(ctx, x, y, crop.stage > 1 ? 6 : 3, .1);
    sprite(ctx, assets, key, x, y, target, { sway: wind, fixedScale: scale });
  });
}

let waterRipples;
function drawWater(ctx, assets, seconds) {
  if (!waterRipples) {
    const terrain = terrainFor(FARM_MAP); waterRipples = [];
    for (let y = 12; y < WORLD.height; y += 16) for (let x = 12; x < WORLD.width; x += 24) {
      const px = x + Math.floor(terrainHash(x, y) * 12), py = y + Math.floor(terrainHash(y, x) * 8);
      if (inWater(terrain, { left: px - 10, right: px + 10, top: py - 4, bottom: py + 4 })) waterRipples.push([px, py, Math.floor(terrainHash(x, y, 7) * 4)]);
    }
  }
  ctx.save(); traceWater(ctx, FARM_MAP); ctx.clip();
  const frame = ((Math.floor(seconds * 2) % 4) + 4) % 4;
  for (const [x, y, offset] of waterRipples) {
    const phase = (frame + offset) % 4, width = [5, 8, 6, 3][phase];
    ctx.fillStyle = phase === 1 ? '#80d2ce' : '#59bebf'; ctx.fillRect(x - Math.floor(width / 2), y, width, 1);
    ctx.fillStyle = '#3dabb8'; ctx.fillRect(x - Math.floor(width / 2) + 2, y + 2, width + 2, 1);
  }
  for (const body of FARM_MAP.waterBodies.filter(body => body.fish.length)) for (let i = 0; i < 2; i++) {
    const fish = sampleFish(body, seconds, i);
    artSprite(ctx, assets, 'fish', fish.key, fish.x, fish.y, { flip: fish.flip, opacity: .78 });
  }
  ctx.restore();
}

/** 同一时间、场景和资产可在网页及 PNG 中重复绘制，不调用网络或模型。 */
export function drawFarm(ctx, assets, scene, seconds = 0, options = {}) {
  const width = ctx.canvas.width, height = ctx.canvas.height;
  ctx.save();
  ctx.clearRect(0, 0, width, height);
  const fit = Math.min(width / WORLD.width, height / WORLD.height);
  ctx.fillStyle = '#86af55'; ctx.fillRect(0, 0, width, height);
  ctx.translate((width - WORLD.width * fit) / 2, (height - WORLD.height * fit) / 2);
  ctx.scale(fit, fit);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(assets.background, 0, 0, WORLD.width, WORLD.height);
  const objects = scene.objects || createFarmObjects(scene);
  if (objects.some(entity => entity.terrainId)) drawWater(ctx, assets, seconds);
  const groundObjects = objects.filter(entity => ['path', 'pond', 'bridge', 'deck', ...WATER_PLANTS].includes(entity.type));
  for (const entity of groundObjects.sort((a, b) => Number(!!a.surface) - Number(!!b.surface) || objectDepth(a, seconds) - objectDepth(b, seconds))) {
    drawGroundContact(ctx, entity, seconds); drawObject(ctx, assets, entity, seconds);
  }
  const standing = objects.filter(entity => !['path', 'pond', 'bridge', 'deck', ...WATER_PLANTS].includes(entity.type));
  // 接地层跟随物件位置重绘，移动后不会在旧位置留下烘焙阴影，也不会压暗前方人物。
  for (const entity of standing) drawGroundContact(ctx, entity, seconds);
  const layers = standing.map(entity => ({ y: objectDepth(entity, seconds), draw: () => drawObject(ctx, assets, entity, seconds) }));
  for (const entity of groundObjects.filter(entity => entity.surface)) layers.push({ y: entity.y - 2, draw: () => artSprite(ctx, assets, entity.type, `${entity.type}-rail`, entity.x, entity.y) });
  for (const crop of scene.crops) layers.push({ y: crop.y, draw: () => drawCrop(ctx, assets, crop, seconds) });
  for (const chicken of scene.chickens) {
    const pose = sampleChicken(chicken, seconds);
    layers.push({ y: pose.y, draw: () => {
      shadow(ctx, pose.x, pose.y, 5, .16);
      artSprite(ctx, assets, 'chicken', pose.key, pose.x, pose.y, { flip: pose.facing < 0 });
    } });
  }
  // 先绘制池水和石径，再将建筑、树、作物和居民按当前落脚点排序。
  layers.sort((a, b) => a.y - b.y).forEach(layer => layer.draw());
  // 蝴蝶是独立的环境点缀，不代表贡献数量。
  const butterflyHomes = ['daisy-garden', 'daisy-front'].map(id => objects.find(item => item.id === id))
    .concat(['cosmos', 'lavender'].map(type => objects.find(item => item.type === type)));
  for (let i = 0; i < butterflyHomes.length; i++) {
    const flower = butterflyHomes[i];
    if (!flower) continue;
    const x = flower.x + Math.sin(seconds * 0.7 + i) * 18;
    const y = flower.y - 22 + Math.cos(seconds * 1.1 + i) * 10;
    const wing = Math.sin(seconds * 12 + i) > 0 ? 3 : 1;
    ctx.fillStyle = ['#f4c2f1', '#fff1a8', '#f6c6a4', '#bce5f3'][i];
    ctx.fillRect(Math.round(x) - wing, Math.round(y), wing, 3);
    ctx.fillRect(Math.round(x) + 1, Math.round(y), wing, 3);
    ctx.fillStyle = '#7f5639'; ctx.fillRect(Math.round(x), Math.round(y) + 1, 1, 3);
  }
  if (options.evening) {
    ctx.fillStyle = 'rgba(42, 29, 77, .24)'; ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    for (const entity of objects.filter(item => ['lamp', 'cottage', 'barn'].includes(item.type))) {
      const y = entity.y - ART_BY_ID[entity.type].height * (entity.type === 'lamp' ? .79 : .55);
      const glow = ctx.createRadialGradient(entity.x, y, 1, entity.x, y, 22);
      glow.addColorStop(0, 'rgba(255,214,117,.48)'); glow.addColorStop(1, 'rgba(255,214,117,0)');
      ctx.fillStyle = glow; ctx.fillRect(entity.x - 22, y - 22, 44, 44);
    }
    for (let i = 0; i < 9; i++) {
      ctx.globalAlpha = 0.35 + 0.3 * Math.sin(seconds * 1.8 + i);
      ctx.fillStyle = '#fff4a3';
      const pond = objects.find(item => item.type === 'pond');
      if (pond) ctx.fillRect(Math.round(56 + i * 38 + Math.sin(seconds + i) * 3), Math.round(354 + Math.sin(i * 2 + seconds * .5) * 20), 2, 2);
    }
    ctx.globalAlpha = 1;
  }
  if (options.selectedId) {
    const selected = scene.crops.find(c => c.id === options.selectedId);
    if (selected) {
      ctx.strokeStyle = '#fff6c5'; ctx.lineWidth = 1;
      ctx.setLineDash([3, 2]);
      ctx.strokeRect(selected.x - 21, selected.y - 18, 42, 26);
      ctx.setLineDash([]);
    }
  }
  if (options.selectedObjectId) {
    const selected = objects.find(item => item.id === options.selectedObjectId);
    if (selected) {
      ctx.strokeStyle = options.editing ? '#fffbd5' : '#dff5b5'; ctx.lineWidth = 1;
      ctx.setLineDash([3, 2]);
      if (selected.terrainId) { traceWater(ctx, FARM_MAP); ctx.stroke(); }
      else {
        const bounds = selected.surface ? FARM_MAP.decks.find(deck => deck.id === selected.id).walk : objectBounds(objectPose(selected, seconds));
        ctx.strokeRect(bounds.left - 3, bounds.top - 2, bounds.right - bounds.left + 6, bounds.bottom - bounds.top + 4);
      }
      ctx.setLineDash([]);
    }
  }
  ctx.restore();
}

export function hitTestCrop(scene, x, y) {
  return [...scene.crops].reverse().find(crop => Math.abs(crop.x - x) < 23 && y > crop.y - 22 && y < crop.y + 8);
}
