import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { createCanvas, loadImage } from 'canvas';
import { createDemoData, createFarmScene, cropStage, sampleChicken, hitTestCrop, drawFarm } from '../src/living-farm.js';
import { loadSpringAssets, renderLivingFarm } from '../src/renderer.js';
import { createPreviewServer } from '../dev-server.mjs';
import { fetchContributions } from '../src/fetcher.js';
import { ART_CATALOG, ART_BY_ID, RESIDENT_TYPES, DIRECTIONS, WATER_PLANTS, ART_FINISH_REVISION, finishSpriteEdges } from '../src/art-catalog.js';
import { FARM_MAP, FARM_ZONES, RESIDENT_ROUTES, RESIDENT_CYCLE, containsInZone, createFarmObjects, sampleResident, sampleFish, placementAt, moveFarmObject, hitTestObject, visualBounds, objectBounds, objectPose, objectDepth, containsBounds, overlaps } from '../src/farm-objects.js';

import { terrainFor, onDryLand, onWalkableLand, inWater, waterAt, SURFACE, coversBounds } from '../src/farm-terrain.js';

const checksum = buffer => createHash('sha256').update(buffer).digest('hex');
const data = createDemoData('medium', 'YeatsLiao');
const scene = createFarmScene(data, 'YeatsLiao');
const terrain = terrainFor(FARM_MAP);
function freePosition(farm, id) {
  const object = farm.objects.find(o => o.id === id);
  for (let radius = 4; radius <= 80; radius += 4) for (let dy = -radius; dy <= radius; dy += 4) for (let dx = -radius; dx <= radius; dx += 4) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) continue;
    const result = placementAt(farm, id, object.x + dx, object.y + dy);
    if (result.ok) return result.entity;
  }
  assert.fail(`${id}没有真实可用的调整空位`);
}

test('相同用户名与档位重复生成相同场景，大小写不改变播种结果', () => {
  assert.deepEqual(data, createDemoData('medium', 'YeatsLiao'));
  assert.deepEqual(data, createDemoData('medium', 'yeatsliao'));
  assert.deepEqual(scene, createFarmScene(data, 'YeatsLiao'));
  assert.notDeepEqual(data, createDemoData('medium', 'octocat'));
});
test('低、中、高贡献有可比较的绝对生长阶段', () => {
  const scenes = ['low', 'medium', 'high'].map(p => createFarmScene(createDemoData(p)));
  assert.ok(scenes[0].total < scenes[1].total && scenes[1].total < scenes[2].total);
  for (const s of scenes) assert.equal(s.crops.length, 52);
  const sumStages = s => s.crops.reduce((n, crop) => n + crop.stage, 0);
  assert.ok(sumStages(scenes[0]) < sumStages(scenes[1]));
  assert.ok(sumStages(scenes[1]) < sumStages(scenes[2]));
  assert.deepEqual([-1, 0, 1, 7, 8, 21, 22, 49, 50, 99, 100].map(cropStage), [-1, -1, 0, 0, 1, 1, 2, 2, 3, 3, 4]);
});
test('日期与统计随周排序保留，一周一地块，不伪造无贡献作物', () => {
  assert.equal(scene.total, data.totalContributions);
  assert.equal(new Set(scene.crops.map(c => c.id)).size, 52);
  for (const crop of scene.crops) {
    const week = data.weeks.find(w => w.days[0].date === crop.id);
    assert.equal(crop.total, week.days.reduce((n, d) => n + d.count, 0));
    assert.equal(crop.end, week.days.at(-1).date);
  }
  assert.deepEqual(scene.crops.map(c => c.total), scene.crops.map(c => c.total).sort((a, b) => a - b));
  const empty = createFarmScene({ weeks: [], languages: [], totalPRs: 0, totalIssues: 0 });
  assert.equal(empty.total, 0); assert.equal(empty.chickens.length, 2); assert.equal(empty.crops.length, 0);
  const zero = createFarmScene({ ...data, weeks: data.weeks.map(w => ({ days: w.days.map(d => ({ ...d, count: 0 })) })) });
  assert.ok(zero.crops.every(c => c.stage === -1));
});
test('跨年 53 周都有独立且有效的土地区域', () => {
  const extended = createFarmScene({ ...data, weeks: [...data.weeks, { days: [{ date: '2026-10-25', count: 5 }] }] });
  assert.equal(extended.crops.length, 53);
  assert.equal(new Set(extended.crops.map(c => `${c.x},${c.y}`)).size, 53);
  for (const crop of extended.crops) {
    assert.ok(containsBounds(FARM_MAP.beds.find(bed => bed.id === crop.bed), { left: crop.x - 23, right: crop.x + 23, top: crop.y - 46, bottom: crop.y + 6 }), '包括成熟作物在内的完整地块都要留在农田内');
    assert.equal(hitTestCrop(extended, crop.x, crop.y)?.id, crop.id);
    assert.equal(hitTestObject(extended, crop.x, crop.y), undefined, '周槽根部不能被田边装饰抢先命中');
  }
});
test('小鸡动作可重复，行走有停顿，所有路线避开谷仓与农田', () => {
  const busy = createFarmScene(createDemoData('high'));
  assert.equal(busy.chickens.length, 5);
  for (const chicken of busy.chickens) {
    const keys = new Set();
    for (let t = 0; t <= 64; t += .1) {
      const pose = sampleChicken(chicken, t);
      assert.ok(containsBounds(FARM_MAP.chickenYard, objectBounds({ ...pose, type: 'chicken' })));
      assert.ok(containsBounds(FARM_MAP.bounds, visualBounds({ ...pose, type: 'chicken' })));
      keys.add(pose.key);
    }
    assert.equal(keys.size, 4);
    assert.deepEqual(sampleChicken(chicken, 0), sampleChicken(chicken, 16));
  }
});
test('新图集透明、边界有效，并具备全部动画帧', async () => {
  const assets = await loadSpringAssets();
  assert.equal(assets.manifest.version, 3);
  assert.equal(Object.keys(assets.manifest.sprites).length, 241);
  assert.equal(assets.manifest.catalog.length, ART_CATALOG.length);
  assert.ok(assets.atlas.width <= 4096 && assets.atlas.height <= 4096);
  const canvas = createCanvas(assets.atlas.width, assets.atlas.height), ctx = canvas.getContext('2d');
  ctx.drawImage(assets.atlas, 0, 0);
  assert.equal(ctx.getImageData(0, 0, 1, 1).data[3], 0);
  for (const [key, rect] of Object.entries(assets.manifest.sprites)) {
    assert.ok(rect.w > 0 && rect.h > 0 && rect.x >= 0 && rect.y >= 0);
    assert.ok(rect.x + rect.w <= assets.atlas.width && rect.y + rect.h <= assets.atlas.height);
    assert.ok(rect.w >= 20 && rect.h >= 20, '不能只剩下误抠的一小块');
    const pixels = ctx.getImageData(rect.x, rect.y, rect.w, rect.h).data;
    let opaque = 0;
    for (let i = 3; i < pixels.length; i += 4) if (pixels[i] > 128) opaque++;
    assert.ok(opaque / (rect.w * rect.h) > (key.endsWith('-rail') ? .08 : .2), `${key}精灵主体或分层栏杆不能被误删`);
  }
});
test('PNG 与共享绘制一致，时间和暮色确实改变画面', async () => {
  const assets = await loadSpringAssets();
  const first = await renderLivingFarm(scene, 768, 512);
  const repeat = await renderLivingFarm(scene, 768, 512);
  const later = await renderLivingFarm(scene, 768, 512, { seconds: 2 });
  const evening = await renderLivingFarm(scene, 768, 512, { evening: true });
  assert.equal(checksum(first), checksum(repeat));
  assert.notEqual(checksum(first), checksum(later));
  assert.notEqual(checksum(first), checksum(evening));
  const canvas = createCanvas(768, 512);
  drawFarm(canvas.getContext('2d'), assets, scene);
  assert.equal(checksum(first), checksum(canvas.toBuffer('image/png')));
  const image = await loadImage(first); assert.equal(image.width, 768); assert.equal(image.height, 512);
  await assert.rejects(renderLivingFarm(scene, -1, 100), /画布/);
});

test('48种对象不以帧数凑数，三种作物各有五阶段且全部对象可展示', () => {
  assert.equal(ART_CATALOG.length, 48); assert.equal(new Set(ART_CATALOG.map(art => art.id)).size, 48);
  const expected = { '作物': 3, '花草': 16, '树木': 2, '建筑': 2, '装饰': 11, '人物与动物': 7, '池塘与水生': 4, '原创吉祥物': 1, '矿物': 2 };
  for (const [category, count] of Object.entries(expected)) assert.equal(ART_CATALOG.filter(art => art.category === category).length, count);
  for (const art of ART_CATALOG.filter(art => art.category === '作物')) assert.equal(art.frames.length, 5);
  const full = createFarmScene(createDemoData('high'));
  const types = new Set([...full.crops.map(crop => crop.cropType), ...full.objects.map(item => item.type), 'chicken', 'fish']);
  assert.deepEqual([...types].sort(), ART_CATALOG.map(art => art.id).sort());
  assert.equal(new Set(full.objects.map(item => item.id)).size, full.objects.length);
});
test('所有周槽的根部落在新版泥土地面，不落在草地或路径上', async () => {
  const assets = await loadSpringAssets();
  const canvas = createCanvas(768, 512), ctx = canvas.getContext('2d'); ctx.drawImage(assets.background, 0, 0, 768, 512);
  const full = createFarmScene({ ...data, weeks: [...data.weeks, { days: [{ date: '2026-10-25', count: 1 }] }] });
  for (const crop of full.crops) {
    const [r, g, b] = ctx.getImageData(crop.x, crop.y, 1, 1).data;
    assert.ok(r > g && g > b, `地块${crop.id}必须在棕土上`);
  }
});
test('紫水晶保留紫色，动画帧都存在且角色比例没有被逐帧拉伸', async () => {
  const assets = await loadSpringAssets();
  const canvas = createCanvas(assets.atlas.width, assets.atlas.height), ctx = canvas.getContext('2d'); ctx.drawImage(assets.atlas, 0, 0);
  const rect = assets.manifest.sprites.amethyst, pixels = ctx.getImageData(rect.x, rect.y, rect.w, rect.h).data;
  let purple = 0;
  for (let i = 0; i < pixels.length; i += 4) if (pixels[i + 3] > 128 && pixels[i + 2] > pixels[i + 1] * 1.2 && pixels[i] > pixels[i + 1] * 1.2) purple++;
  assert.ok(purple > 1000);
  for (const art of ART_CATALOG) for (const key of art.frames) assert.ok(assets.manifest.sprites[key]);
  assert.ok(assets.manifest.sprites['cat-sleep'].h < assets.manifest.sprites['cat-idle'].h);
});
test('猫和芽芽保留四种基础状态，锦鲤限制在池塘内', () => {
  for (const type of ['cat', 'sproutling']) {
    const entity = scene.objects.find(item => item.type === type), keys = new Set();
    for (let t = 0; t < 40; t += .125) {
      const pose = sampleResident(entity, t); keys.add(pose.key);
      if (type === 'farmer') assert.ok(FARM_MAP.paths.some(path => containsBounds(path, objectBounds({ ...pose, type }))));
      else { assert.equal(pose.y, entity.y); assert.equal(pose.x, entity.x); }
    }
    assert.equal(keys.size, 4); assert.deepEqual(sampleResident(entity, 0), sampleResident(entity, 20));
  }
  const frames = new Set();
  for (const body of FARM_MAP.waterBodies.filter(body => body.fish.length)) for (let t = -10; t <= 70; t += .05) for (let i = 0; i < 2; i++) {
    const fish = sampleFish(body, t, i); frames.add(fish.key);
    assert.ok(inWater(terrain, visualBounds({ ...fish, type: 'fish' })), `${body.id}锦鲤完整外观越岸：${t}`);
  }
  assert.equal(frames.size, 4);
});
test('轻布置吸附、边界和占地检查生效，不能修改贡献或移动固定设施', () => {
  const target = freePosition(scene, 'daisy-front');
  const result = moveFarmObject(scene, 'daisy-front', target.x + 1, target.y - 1);
  assert.equal(result.ok, true);
  const placed = result.scene.objects.find(item => item.id === 'daisy-front'); assert.equal(placed.x, target.x); assert.equal(placed.y, target.y);
  assert.equal(result.scene.total, scene.total); assert.equal(result.scene.crops, scene.crops); assert.equal(result.scene.chickens, scene.chickens);
  assert.notDeepEqual(objectBounds(scene.objects.find(item => item.id === 'daisy-front')), objectBounds(placed));
  for (const [id, x, y] of [['barn', 200, 250], ['pond', 100, 400], ['farmer', 200, 250], ['missing', 50, 50], ['daisy-front', 500, 320], ['daisy-front', 100, 350], ['daisy-front', 10, 600], ['daisy-front', NaN, 400]]) {
    assert.equal(moveFarmObject(scene, id, x, y).ok, false);
  }
  assert.deepEqual(createFarmObjects(result.scene), createFarmObjects(scene));
  const copper = scene.objects.find(item => item.type === 'copper');
  assert.equal(hitTestObject(scene, copper.x, copper.y - 1)?.type, 'copper');
});
test('移动后的导出反映位置变化，但不把选择框写入普通 PNG', async () => {
  const target = freePosition(scene, 'daisy-front');
  const moved = moveFarmObject(scene, target.id, target.x, target.y).scene;
  const before = await renderLivingFarm(scene, 768, 512), after = await renderLivingFarm(moved, 768, 512);
  assert.notEqual(checksum(before), checksum(after));
  const selected = await renderLivingFarm(moved, 768, 512, { selectedObjectId: 'daisy-front', editing: true });
  assert.notEqual(checksum(selected), checksum(after));
});

test('场景比例与图集一致，完整帧包含在预留宽度内', async () => {
  const { manifest } = await loadSpringAssets();
  assert.equal(manifest.mapRevision, FARM_MAP.revision);
  assert.equal(scene.mapRevision, FARM_MAP.revision);
  assert.deepEqual(manifest.catalog, ART_CATALOG);
  assert.ok(ART_BY_ID.oak.height >= ART_BY_ID.farmer.height * 3);
  assert.ok(ART_BY_ID.cottage.height >= ART_BY_ID.barn.height * .8);
  assert.ok(ART_BY_ID.chicken.height < ART_BY_ID.farmer.height * .5);
  for (const art of ART_CATALOG.filter(item => item.category !== '作物')) {
    const scale = art.height / Math.max(...art.frames.map(frame => manifest.sprites[frame].h));
    for (const frame of art.frames) assert.ok(Math.round(manifest.sprites[frame].w * scale) <= art.width, `${frame}超出${art.width}像素的视觉宽度`);
  }
});
test('各档默认摆放和完整动画周期都不越界、不穿过固定设施', () => {
  for (const profile of ['low', 'medium', 'high']) {
    const farm = createFarmScene(createDemoData(profile));
    for (const entity of farm.objects.filter(o => !o.terrainId && !o.surface)) {
      if (!WATER_PLANTS.includes(entity.type)) assert.ok(onWalkableLand(terrain, objectBounds(entity)), `${entity.id}脚底落水`);
      assert.ok(containsBounds(FARM_MAP.bounds, visualBounds(entity)), `${entity.id}完整轮廓越界`);
      assert.ok(containsBounds(FARM_MAP.interior, objectBounds(entity)), `${entity.id}脚底越界`);
      assert.ok(containsInZone(FARM_ZONES[entity.zone], objectBounds(entity)), `${entity.id}不在所属区域`);
      assert.ok(FARM_ZONES[entity.zone].allowed.includes(entity.type), `${entity.id}不属于区域允许的素材`);
      if (ART_BY_ID[entity.type].movable && !entity.fixed) assert.equal(placementAt(farm, entity.id, entity.x, entity.y).ok, true, `${entity.id}默认位置必须也遵守布置规则`);
    }
    const solids = farm.objects.filter(item => !item.terrainId && !item.surface && !['path', 'fence', ...RESIDENT_TYPES, ...WATER_PLANTS, 'cat', 'sproutling'].includes(item.type));
    for (let i = 0; i < solids.length; i++) for (let j = i + 1; j < solids.length; j++) {
      assert.ok(!overlaps(objectBounds(solids[i]), objectBounds(solids[j]), 0), `${solids[i].id}与${solids[j].id}占地重叠`);
    }
    for (let t = -20; t <= 80; t += .25) {
      const actors = farm.objects.filter(item => [...RESIDENT_TYPES, 'cat', 'sproutling'].includes(item.type)).map(item => objectPose(item, t));
      actors.push(...farm.chickens.map(chicken => ({ ...sampleChicken(chicken, t), type: 'chicken', id: chicken.id })));
      for (const actor of actors) {
        assert.ok(containsBounds(FARM_MAP.bounds, visualBounds(actor)), `${actor.id}动作越界`);
        assert.ok(onWalkableLand(terrain, objectBounds(actor)), `${actor.id}活动脚底越岸：${t}`);
        assert.ok(FARM_MAP.beds.every(bed => !overlaps(objectBounds(actor), bed, 0)), `${actor.id}进入农田`);
        for (const obstacle of farm.objects.filter(item => !item.terrainId && !item.surface && !['path', ...RESIDENT_TYPES, ...WATER_PLANTS, 'cat', 'sproutling'].includes(item.type))) {
          assert.ok(!overlaps(objectBounds(actor), objectBounds(obstacle), 0), `${actor.id}穿过${obstacle.id}`);
        }
      }
    }
  }
});
test('布置检查完整树冠和门前通道，合法位置不会越界', () => {
  for (const [id, x, y] of [['oak-grove', 40, 320], ['pine-edge', 740, 320], ['oak-grove', 400, 80], ['oak-grove', 320, 208], ['daisy-front', 384, 228], ['daisy-front', 500, 268], ['daisy-front', 284, 380]]) {
    assert.equal(placementAt(scene, id, x, y).ok, false, `${id}不应能放在${x},${y}`);
  }
  let accepted = 0;
  for (let x = 0; x <= FARM_MAP.width; x += 12) for (let y = 0; y <= FARM_MAP.height; y += 12) {
    const result = placementAt(scene, 'oak-grove', x, y);
    if (!result.ok) continue;
    accepted++;
    assert.ok(containsBounds(FARM_MAP.bounds, visualBounds(result.entity)));
    assert.ok(containsBounds(FARM_ZONES.woodland.canopy, visualBounds(result.entity)));
    assert.ok(containsInZone(FARM_ZONES.woodland, objectBounds(result.entity)));
    assert.ok(containsBounds(FARM_MAP.interior, objectBounds(result.entity)));
    assert.ok(FARM_MAP.beds.every(bed => !overlaps(visualBounds(result.entity), bed)));
    for (const path of FARM_MAP.paths) assert.ok(!overlaps(objectBounds(result.entity), path));
  }
  assert.ok(accepted > 0, '完整树冠检查后仍须有可用布置位置');
  for (const id of ['oak-grove', 'daisy-front', 'daisy-garden']) {
    const target = freePosition(scene, id);
    assert.notDeepEqual(objectBounds(target), objectBounds(scene.objects.find(o => o.id === id)), '林地、小院与花园均可实际调整');
  }
});
test('石径始终在站立物件下方，命中顺序与绘制一致', () => {
  const atlas = createCanvas(32, 16), brush = atlas.getContext('2d');
  brush.fillStyle = '#ff0000'; brush.fillRect(0, 0, 16, 16);
  brush.fillStyle = '#0000ff'; brush.fillRect(16, 0, 16, 16);
  const assets = { background: createCanvas(768, 512), atlas, manifest: { sprites: {
    path: { x: 0, y: 0, w: 16, h: 16 }, barn: { x: 16, y: 0, w: 16, h: 16 },
  } } };
  const objects = [{ id: 'barn', type: 'barn', x: 200, y: 250 }, { id: 'path', type: 'path', x: 200, y: 251 }];
  const example = { objects, crops: [], chickens: [] }, canvas = createCanvas(768, 512), ctx = canvas.getContext('2d');
  drawFarm(ctx, assets, example);
  assert.deepEqual([...ctx.getImageData(200, 246, 1, 1).data], [0, 0, 255, 255]);
  assert.equal(hitTestObject(example, 200, 246, 0, assets.manifest)?.id, 'barn');
  assert.ok(objectDepth({ type: 'pond', x: 200, y: 490 }) < objectDepth(objects[0]));
});
test('地面铺满四角与边缘，水湾、主路和耕地来自共享地图', async () => {
  const { background } = await loadSpringAssets();
  const canvas = createCanvas(768, 512), ctx = canvas.getContext('2d'); ctx.drawImage(background, 0, 0, 768, 512);
  for (const [x, y] of [[0, 0], [767, 0], [0, 511], [767, 511], [384, 4], [4, 256], [764, 256]]) {
    const [r, g, b, a] = ctx.getImageData(x, y, 1, 1).data;
    assert.equal(a, 255);
    if (waterAt(FARM_MAP, x, y)) assert.ok(b > r && g > r, '画外延伸水湾仍是青蓝水面');
    else assert.ok(g > r && g > b, '陆地边缘仍有草木覆盖');
  }
  for (const path of FARM_MAP.paths) {
    const x = Math.floor((path.left + path.right) / 2), y = Math.min(511, Math.floor((path.top + path.bottom) / 2));
    const [r, g, b] = ctx.getImageData(x, y, 1, 1).data;
    if (terrain.water[y * 768 + x]) assert.equal(terrain.surface[y * 768 + x], SURFACE.bridge, '水上的通道必须有木桥或平台');
    else assert.ok(r > g && g > b, '保留通道须与可见土路对齐');
  }
});

test('轮廓整理只影响边缘，保留主体、透明留白和细小茎叶', () => {
  const canvas = createCanvas(25, 25), ctx = canvas.getContext('2d');
  ctx.fillStyle = '#181b19'; ctx.fillRect(3, 3, 19, 19);
  ctx.fillStyle = '#638b42'; ctx.fillRect(4, 4, 17, 17);
  ctx.fillStyle = '#a02d92'; ctx.fillRect(3, 10, 1, 4);
  const original = ctx.getImageData(0, 0, 25, 25);
  const result = finishSpriteEdges(ctx.getImageData(0, 0, 25, 25), 'barn', 'barn');
  assert.deepEqual(result.data, finishSpriteEdges(ctx.getImageData(0, 0, 25, 25), 'barn', 'barn').data);
  for (let y = 7; y < 18; y++) for (let x = 7; x < 18; x++) {
    const i = (y * 25 + x) * 4;
    assert.deepEqual(result.data.slice(i, i + 4), original.data.slice(i, i + 4), '不能模糊或调色主体');
  }
  for (let i = 0; i < original.data.length; i += 4) {
    if (!original.data[i + 3]) assert.deepEqual([...result.data.slice(i, i + 4)], [0, 0, 0, 0]);
  }
  const edge = (11 * 25 + 3) * 4;
  assert.equal(result.data[edge + 3], 191);
  assert.ok(result.data[edge + 1] > result.data[edge] && result.data[edge + 1] > result.data[edge + 2], '紫边应回到邻近主体的绿色');
  ctx.clearRect(0, 0, 25, 25); ctx.fillStyle = '#638b42'; ctx.fillRect(12, 4, 1, 15);
  const thin = finishSpriteEdges(ctx.getImageData(0, 0, 25, 25), 'wheat', 'young');
  for (let y = 4; y < 19; y++) assert.equal(thin.data[(y * 25 + 12) * 4 + 3], 191, '不能抹掉细茎');
});
test('植物底座柔化但不侵蚀种子、居民脚部或紫水晶主体', () => {
  const canvas = createCanvas(25, 25), ctx = canvas.getContext('2d');
  ctx.fillStyle = '#8c6943'; ctx.fillRect(0, 0, 25, 25);
  const base = finishSpriteEdges(ctx.getImageData(0, 0, 25, 25), 'oak', 'tree-round');
  const seed = finishSpriteEdges(ctx.getImageData(0, 0, 25, 25), 'wheat', 'seed');
  const actor = finishSpriteEdges(ctx.getImageData(0, 0, 25, 25), 'farmer', 'farmer-idle');
  const foot = (24 * 25 + 12) * 4 + 3;
  assert.ok(base.data[foot] < 64); assert.equal(seed.data[foot], 191); assert.equal(actor.data[foot], 191);
  ctx.fillStyle = '#8d49bd'; ctx.fillRect(0, 0, 25, 25);
  ctx.fillStyle = '#39bbc5'; ctx.fillRect(0, 0, 1, 25);
  const mineral = finishSpriteEdges(ctx.getImageData(0, 0, 25, 25), 'amethyst', 'amethyst');
  const center = (12 * 25 + 12) * 4, edge = 12 * 25 * 4;
  assert.deepEqual([...mineral.data.slice(center, center + 4)], [141, 73, 189, 255]);
  assert.ok(mineral.data[edge] > mineral.data[edge + 1] && mineral.data[edge + 2] > mineral.data[edge + 1], '青色残边清理不能误删紫水晶');
});
test('全部对象都有透明轮廓，边缘能融合不同底色而不带固定底色', async () => {
  const assets = await loadSpringAssets();
  assert.equal(assets.manifest.finishRevision, ART_FINISH_REVISION);
  const atlas = createCanvas(assets.atlas.width, assets.atlas.height), ctx = atlas.getContext('2d'); ctx.drawImage(assets.atlas, 0, 0);
  for (const art of ART_CATALOG) for (const frame of art.frames) {
    const rect = assets.manifest.sprites[frame], pixels = ctx.getImageData(rect.x, rect.y, rect.w, rect.h).data;
    let soft = 0, solid = 0;
    for (let i = 3; i < pixels.length; i += 4) {
      if (pixels[i] > 0 && pixels[i] < 255) soft++;
      if (pixels[i] === 255) solid++;
    }
    if (!art.resident && !art.botanical && !art.native) assert.ok(soft > 10, `${frame}应保留原有透明过渡`);
    assert.ok(solid > soft, `${frame}主体不能整体半透明`);
    assert.ok(pixels.some((value, i) => i % 4 === 3 && value === 0), `${frame}背景应透明`);
  }
  const dot = createCanvas(1, 1), dotCtx = dot.getContext('2d'), image = dotCtx.createImageData(1, 1);
  image.data.set([87, 118, 59, 191]); dotCtx.putImageData(image, 0, 0);
  for (const background of [[128, 157, 87], [168, 128, 76], [58, 43, 79]]) {
    const target = createCanvas(1, 1), brush = target.getContext('2d');
    brush.fillStyle = `rgb(${background.join(',')})`; brush.fillRect(0, 0, 1, 1); brush.drawImage(dot, 0, 0);
    const composed = brush.getImageData(0, 0, 1, 1).data;
    for (let c = 0; c < 3; c++) assert.ok(Math.abs(composed[c] - (image.data[c] * 191 / 255 + background[c] * 64 / 255)) <= 2);
    assert.equal(composed[3], 255);
  }
});
test('四块田保留53周根部，田间小径与路肩一致，草地不按128像素重复', async () => {
  const { background } = await loadSpringAssets(), canvas = createCanvas(768, 512), ctx = canvas.getContext('2d');
  ctx.drawImage(background, 0, 0, 768, 512);
  const full = createFarmScene({ ...data, weeks: [...data.weeks, { days: [{ date: '2026-10-25', count: 1 }] }] });
  for (const crop of full.crops) {
    assert.equal(FARM_MAP.beds.filter(bed => containsBounds(bed, { left: crop.x - 8, right: crop.x + 8, top: crop.y - 2, bottom: crop.y + 2 })).length, 1);
  }
  assert.deepEqual(FARM_MAP.beds.map(bed => full.crops.filter(crop => crop.bed === bed.id).length), [15, 15, 12, 11]);
  const [r, g] = ctx.getImageData(588, 380, 1, 1).data; assert.ok(r > g, '四田之间留暖色小径');
  assert.equal(placementAt(scene, 'grass-front', 588, 380).ok, false, '小径不能被装饰堵塞');
  assert.notDeepEqual(ctx.getImageData(400, 70, 100, 100).data, ctx.getImageData(528, 70, 100, 100).data);
  const shoreColors = new Set();
  for (let x = 190; x <= 220; x++) shoreColors.add([...ctx.getImageData(x, 300, 1, 1).data].join(','));
  assert.ok(shoreColors.size >= 5, '岸线须包含草沿、土壁、阴影和浅水过渡');
});
test('接地层随物件移动，原位置不残留阴影或底座', async () => {
  const assets = await loadSpringAssets();
  const image = objects => {
    const canvas = createCanvas(768, 512), ctx = canvas.getContext('2d');
    drawFarm(ctx, assets, { objects, crops: [], chickens: [] });
    return ctx.getImageData(260, 162, 80, 14).data;
  };
  const object = { id: 'test-tree', type: 'oak', x: 300, y: 170 };
  assert.notDeepEqual(image([object]), image([]));
  assert.deepEqual(image([{ ...object, x: 500 }]), image([]));
});

test('五区规则禁止跨区散放，矿石、芦苇、水井和树木各归其位', () => {
  assert.deepEqual(Object.keys(FARM_ZONES), ['home', 'livestock', 'field', 'garden', 'woodland']);
  for (const [id, x, y] of [['copper', 340, 244], ['reed-left', 600, 248], ['well', 180, 356], ['oak-grove', 180, 356], ['daisy-front', 200, 356]]) {
    const result = placementAt(scene, id, x, y);
    assert.equal(result.ok, false); assert.match(result.reason, /区域|小院|种植区|花园|林地/);
  }
  const fake = { ...scene, objects: [{ id: 'wrong-type', type: 'copper', zone: 'home', x: 340, y: 244 }] };
  assert.equal(placementAt(fake, 'wrong-type', 340, 244).ok, false);
  const shape = { shape: [{ left: 0, right: 20, top: 0, bottom: 10 }, { left: 0, right: 10, top: 10, bottom: 20 }] };
  assert.equal(containsInZone(shape, { left: 2, right: 8, top: 4, bottom: 18 }), true);
  assert.equal(containsInZone(shape, { left: 2, right: 18, top: 4, bottom: 18 }), false, '不能只检查区域外包矩形');
});
test('田边物件即使脚底未占耕地，也不能遮住周槽点选范围', () => {
  const farm = createFarmScene(createDemoData('high'));
  const result = placementAt(farm, 'streak-scarecrow', 724, 496);
  assert.equal(result.ok, false); assert.match(result.reason, /作物根部/);
  for (const crop of farm.crops) assert.equal(hitTestObject(farm, crop.x, crop.y), undefined);
});
test('不同用户名和贡献档位的小幅变化始终遵守默认布置规则', () => {
  for (const username of ['YeatsLiao', 'octocat', 'forest', 'tiny', 'garden', 'A-B', 'quiet']) {
    for (const profile of ['low', 'medium', 'high']) {
      const farm = createFarmScene(createDemoData(profile, username), username);
      for (const entity of farm.objects.filter(o => ART_BY_ID[o.type].movable && !o.fixed)) {
        const result = placementAt(farm, entity.id, entity.x, entity.y);
        assert.equal(result.ok, true, `${username}/${profile}/${entity.id}: ${result.reason}`);
      }
      assert.deepEqual(farm.objects, createFarmObjects(farm), '恢复默认须复现同一组位置');
    }
  }
  const empty = createFarmScene({ weeks: [], languages: [], totalPRs: 0, totalIssues: 0 });
  assert.equal(new Set(empty.objects.map(o => o.zone)).size, 5);
  const anchors = farm => farm.objects.filter(o => ['cottage', 'barn', 'pond'].includes(o.type)).map(o => [o.type, o.x, o.y]);
  assert.deepEqual(anchors(empty), anchors(scene), '贡献少时仍保留完整院落骨架');
});
test('花簇先占槽位再做种子微调，各贡献组合均能生成', () => {
  for (let i = 0; i < 32; i++) for (let flowers = 0; flowers <= 4; flowers++) {
    const username = `garden-${i}`;
    const farm = createFarmScene({ ...createDemoData('high', username), totalIssues: flowers * 6 }, username);
    assert.equal(farm.objects.filter(o => ART_BY_ID[o.type].botanical).length, 36);
    for (const entity of farm.objects.filter(o => ART_BY_ID[o.type].movable && !o.fixed)) {
      assert.ok(placementAt(farm, entity.id, entity.x, entity.y).ok, `${username}/${flowers}/${entity.id}`);
    }
  }
});
test('入口连接同一通路网络，鸡院留门且整个活动范围不可布置', () => {
  const exterior = FARM_MAP.paths.filter(path => path.route !== 'barn-door');
  const reached = new Set([exterior[0]]);
  for (let pass = 0; pass < exterior.length; pass++) for (const path of exterior) {
    if ([...reached].some(other => overlaps(path, other, 0))) reached.add(path);
  }
  assert.equal(reached.size, exterior.length);
  for (const zone of Object.values(FARM_ZONES)) {
    assert.ok(exterior.some(path => containsBounds(path, { left: zone.entrance.x, right: zone.entrance.x, top: zone.entrance.y, bottom: zone.entrance.y })));
  }
  const gate = FARM_ZONES.livestock.entrance;
  assert.ok(scene.objects.filter(o => o.type === 'fence').every(o => !overlaps(objectBounds(o), { left: gate.x - 6, right: gate.x + 6, top: gate.y - 8, bottom: gate.y + 2 }, 0)));
  assert.equal(placementAt(scene, 'sunflower-barn', 172, 292).ok, false);
  for (const chicken of scene.chickens) {
    const positions = Array.from({ length: 160 }, (_, t) => sampleChicken(chicken, t / 10));
    assert.ok(new Set(positions.map(p => p.x)).size > 4 && new Set(positions.map(p => p.y)).size > 4);
    for (const pose of positions) assert.ok(containsBounds(FARM_MAP.chickenYard, visualBounds({ ...pose, type: 'chicken' })));
  }
});

test('五人四方向帧独立、统一脚底枢轴，行走关键姿态不重复', async () => {
  const { atlas, manifest } = await loadSpringAssets(), canvas = createCanvas(atlas.width, atlas.height), ctx = canvas.getContext('2d');
  ctx.drawImage(atlas, 0, 0);
  for (const type of RESIDENT_TYPES) {
    assert.equal(ART_BY_ID[type].frames.length, 34);
    for (const direction of DIRECTIONS) {
      const fingerprints = [];
      for (let i = 0; i < 6; i++) {
        const rect = manifest.sprites[`${type}-${direction}-walk-${i}`];
        assert.deepEqual(rect.pivot, [20, 38]);
        assert.equal(rect.sourceHeight, 40); assert.equal(rect.w, 40); assert.equal(rect.h, 40);
        fingerprints.push(checksum(ctx.getImageData(rect.x, rect.y, rect.w, rect.h).data));
      }
      assert.equal(new Set(fingerprints).size, 6, `${type}/${direction}不能用重复图片凑六帧`);
    }
  }
});
test('五人完整周期朝向匹配位移、落脚连续，互不穿人且不抢作物命中', () => {
  const people = scene.objects.filter(o => RESIDENT_TYPES.includes(o.type));
  assert.equal(people.length, 5);
  for (const person of people) {
    const frames = new Set(), directions = new Set();
    assert.deepEqual(sampleResident(person, 0), sampleResident(person, RESIDENT_CYCLE));
    for (let i = 0; i < RESIDENT_CYCLE * 60; i++) {
      const t = i / 60, a = sampleResident(person, t), b = sampleResident(person, t + .001);
      frames.add(a.key);
      const dx = b.x - a.x, dy = b.y - a.y;
      assert.ok(Math.hypot(dx, dy) <= .01601, `${person.type}移动过快或发生跳跃`);
      if (Math.hypot(dx, dy) > .00001) {
        directions.add(a.direction);
        assert.equal(a.direction, Math.abs(dx) > Math.abs(dy) ? dx > 0 ? 'right' : 'left' : dy > 0 ? 'down' : 'up');
        assert.ok(a.key.includes('-walk-'));
        assert.ok(FARM_MAP.residentProtection.some(area => containsBounds(area, objectBounds({ ...a, type: person.type }))));
      } else if (!a.moving) assert.ok(!a.key.includes('-walk-') || t === RESIDENT_ROUTES[person.type].depart);
      for (const other of people.filter(o => o !== person)) {
        assert.ok(!overlaps(objectBounds({ ...a, type: person.type }), objectBounds({ ...sampleResident(other, t), type: other.type }), 2), `${person.type}与${other.type}相撞`);
      }
    }
    assert.equal(directions.size, 4);
    assert.ok([...frames].some(key => key.includes('-action-')));
  }
  for (let t = 0; t < 60; t += .5) for (const crop of scene.crops) assert.equal(hitTestObject(scene, crop.x, crop.y, t), undefined);
});
test('水生花叶完整留在池内，36个新环境实例不改变贡献统计', () => {
  const plants = scene.objects.filter(o => ART_BY_ID[o.type].botanical);
  assert.equal(plants.length, 36);
  const water = terrainFor(FARM_MAP);
  for (const plant of plants.filter(p => WATER_PLANTS.includes(p.type))) {
    assert.equal(ART_BY_ID[plant.type].movable, false);
    for (let t = 0; t < 60; t += .5) {
      const bounds = visualBounds(objectPose(plant, t));
      assert.ok(inWater(water, bounds), `${plant.id}完整浮动外观须在真实水面内`);
    }
  }
  assert.equal(scene.total, data.totalContributions);
  for (const plant of plants.filter(p => ART_BY_ID[p.type].movable)) {
    const route = RESIDENT_ROUTES.gardener.points[0];
    assert.equal(placementAt(scene, plant.id, ...route).ok, false);
  }
});

test('水域掩码逐像素检查凹口和内部孔洞，拒绝无效边界', () => {
  const fake = { width: 5, height: 5, surface: new Uint8Array(25), water: new Uint8Array(25), shore: new Uint8Array(25) };
  const box = { left: 1, right: 3, top: 1, bottom: 3 };
  fake.water[12] = 1;
  assert.equal(onDryLand(fake, box), false, '四角都是陆地也不能跨过中间水面');
  fake.water.fill(1); fake.water[12] = 0;
  assert.equal(inWater(fake, box), false, '四角都是水也不能覆盖内部陆地');
  for (const invalid of [{ ...box, left: NaN }, { ...box, right: Infinity }, { ...box, right: 0 }, { ...box, bottom: 9 }]) assert.equal(coversBounds(fake, invalid, () => true), false);
  assert.equal(terrainFor(FARM_MAP), terrain, '相同地图复用预计算掩码');
  let count = 0;
  for (let y = 0; y < terrain.height; y++) for (let x = 0; x < terrain.width; x++) {
    const water = terrain.water[y * terrain.width + x]; count += water;
    assert.equal(Number(!!waterAt(FARM_MAP, x, y)), water, '水域命中与可见掩码必须一致');
  }
  assert.ok(count / terrain.water.length >= .15 && count / terrain.water.length <= .2, '水面占比保持15%–20%');
});
test('水上通行仅允许桥面，实际地表网络连通门口、农田和平台', () => {
  const waterBridge = { left: 220, right: 228, top: 252, bottom: 264 };
  assert.ok(inWater(terrain, waterBridge));
  assert.ok(onWalkableLand(terrain, waterBridge));
  assert.equal(onDryLand(terrain, waterBridge), false);
  for (const id of ['bridge', 'deck', 'hedge-496-186', 'grove-1']) assert.equal(moveFarmObject(scene, id, 320, 300).ok, false);
  const start = FARM_ZONES.home.entrance, reached = new Uint8Array(terrain.surface.length), queue = [start.y * 768 + start.x];
  reached[queue[0]] = 1;
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i], x = p % 768;
    for (const next of [x ? p - 1 : -1, x < 767 ? p + 1 : -1, p - 768, p + 768]) {
      if (next < 0 || next >= reached.length || reached[next] || ![SURFACE.road, SURFACE.stone, SURFACE.bridge].includes(terrain.surface[next])) continue;
      reached[next] = 1; queue.push(next);
    }
  }
  const destinations = [...Object.values(FARM_ZONES).map(zone => [zone.entrance.x, zone.entrance.y]), [224, 260], [364, 420], [412, 280], [588, 218], [396, 422], [588, 422]];
  for (const [x, y] of destinations) assert.equal(reached[y * 768 + x], 1, `${x},${y}必须经实际通行地表连到小院`);
});
test('固定植被避开房门和居民停留点，静态装饰不遮贡献根部', () => {
  const protectedAreas = Object.values(RESIDENT_ROUTES).flatMap(route => route.points.map(([x, y]) => ({ left: x - 7, right: x + 7, top: y - 28, bottom: y + 2 })));
  protectedAreas.push({ left: 304, right: 332, top: 178, bottom: 232 }, { left: 88, right: 124, top: 214, bottom: 264 });
  for (const entity of scene.objects.filter(o => ART_BY_ID[o.type].category === '树木' || o.type === 'tall-mushroom')) {
    assert.ok(protectedAreas.every(area => !overlaps(visualBounds(entity), area, 0)), `${entity.id}遮挡门口或主要停留点`);
  }
  for (const entity of scene.objects.filter(o => !o.terrainId && !o.surface && !RESIDENT_TYPES.includes(o.type))) for (const crop of scene.crops) {
    assert.equal(overlaps(visualBounds(entity), { left: crop.x - 9, right: crop.x + 9, top: crop.y - 2, bottom: crop.y + 4 }, 0), false, `${entity.id}遮挡周贡献`);
  }
});
test('环境密度不随贡献降低，52和53周全部成熟时仍在耕地内', () => {
  const empty = createFarmScene({ weeks: [], languages: [], totalPRs: 0, totalIssues: 0 });
  const ambient = farm => farm.objects.filter(o => o.ambient).map(o => o.type).sort();
  assert.deepEqual(ambient(empty), ambient(createFarmScene(createDemoData('high'))));
  assert.equal(empty.objects.filter(o => ART_BY_ID[o.type].category === '树木').length, 12);
  assert.ok(empty.objects.filter(o => ART_BY_ID[o.type].botanical && !WATER_PLANTS.includes(o.type)).length >= 24);
  for (const length of [52, 53]) {
    const farm = createFarmScene({ ...data, weeks: Array.from({ length }, (_, i) => ({ days: [{ date: `week-${i}`, count: 1000 }] })) });
    assert.equal(farm.crops.length, length);
    assert.equal(new Set(farm.crops.map(crop => `${crop.x},${crop.y}`)).size, length);
    for (const crop of farm.crops) {
      assert.equal(crop.stage, 4);
      assert.ok(coversBounds(terrain, { left: crop.x - 23, right: crop.x + 23, top: crop.y - 46, bottom: crop.y + 6 }, kind => kind === SURFACE.soil));
    }
  }
});
test('桥下鱼先于桥面绘制，桥栏前后遮挡和点击顺序一致', async () => {
  const assets = await loadSpringAssets(), bridge = scene.objects.find(o => o.id === 'bridge');
  const canvas = createCanvas(768, 512), ctx = canvas.getContext('2d'), original = ctx.drawImage.bind(ctx), calls = [];
  const frames = new Map(Object.entries(assets.manifest.sprites).map(([key, rect]) => [`${rect.x},${rect.y}`, key]));
  ctx.drawImage = (image, ...args) => { if (image === assets.atlas) calls.push(frames.get(`${args[0]},${args[1]}`)); original(image, ...args); };
  const cat = { id: 'bridge-cat', type: 'cat', x: 224, y: 274 };
  const example = { objects: [scene.objects.find(o => o.terrainId), bridge, cat], crops: [], chickens: [] };
  drawFarm(ctx, assets, example, 0);
  assert.ok(calls.findIndex(key => key.startsWith('fish-')) < calls.indexOf('bridge'));
  assert.ok(calls.indexOf('bridge') < calls.indexOf('cat-idle'));
  assert.ok(calls.indexOf('cat-idle') < calls.indexOf('bridge-rail'));
  assert.equal(hitTestObject(example, 224, 269, 0, assets.manifest)?.id, 'bridge');
  assert.equal(hitTestObject(example, 224, 259, 0, assets.manifest)?.id, cat.id);
  const front = { ...example, objects: [bridge, { ...cat, y: 286 }] };
  calls.length = 0; drawFarm(ctx, assets, front);
  assert.ok(calls.indexOf('bridge-rail') < calls.indexOf('cat-idle'));
  assert.equal(hitTestObject(front, 224, 269, 0, assets.manifest)?.id, cat.id);
  const fish = sampleFish(FARM_MAP.waterBodies.find(body => body.id === 'stream'), 6.125);
  assert.ok(containsBounds(bridge.surface ? FARM_MAP.decks[0].walk : {}, objectBounds({ ...fish, type: 'fish' })), '鱼路线实际经过桥下');
});

test('网页30fps保留刷新余数，减弱动态、暂停和隐藏均停止计时', async () => {
  // 运行实际网页入口，用最小DOM与可控60Hz时钟检验调度，不依赖浏览器前台状态。
  const code = (await readFile(new URL('../web/app.js', import.meta.url), 'utf8')).replace(/^import .*;\r?\n/gm, '');
  const elements = new Map(), frames = new Map(), draws = [], listeners = new Map();
  const makeElement = () => ({ dataset: {}, value: 'demo', textContent: '', hidden: false,
    events: new Map(), attrs: new Map(), getContext: () => ({}), replaceChildren() {}, append() {},
    querySelector() { return makeElement(); }, querySelectorAll: () => [],
    addEventListener(name, handler) { this.events.set(name, handler); },
    setAttribute(name, value) { this.attrs.set(name, value); },
  });
  const document = { hidden: false, querySelectorAll: () => [], createElement: makeElement,
    getElementById(id) { if (!elements.has(id)) elements.set(id, makeElement()); return elements.get(id); },
    addEventListener(name, handler) { listeners.set(name, handler); },
  };
  const motion = { matches: true, addEventListener(name, handler) { this.onchange = handler; } };
  let serial = 0;
  const context = { document, window: { matchMedia: () => motion }, ART_CATALOG: [], ART_BY_ID, RESIDENT_TYPES,
    FARM_ZONES, createFarmObjects, hitTestObject, moveFarmObject, drawAssetPreview() {}, hitTestCrop, STAGE_NAMES: [], WORLD: { width: 768, height: 512 },
    drawFarm(ctx, assets, farm, seconds) { draws.push(seconds); },
    requestAnimationFrame(callback) { frames.set(++serial, callback); return serial; }, cancelAnimationFrame(id) { frames.delete(id); },
    fetch: async url => ({ ok: true, json: async () => url.startsWith('/api/farm?') ? scene : url === '/api/config' ? { defaultUsername: 'YeatsLiao' } : {} }),
    Image: class { set src(value) { queueMicrotask(() => this.onload()); } }, URLSearchParams, AbortController, setTimeout,
  };
  runInNewContext(code, context);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(frames.size, 0, '系统减弱动态时初始暂停');
  assert.equal(elements.get('pause').attrs.get('aria-pressed'), 'true');
  const canvasKey = elements.get('farm').events.get('keydown');
  canvasKey({ key: 'ArrowRight', preventDefault() {} });
  assert.ok(elements.get('crop-detail').textContent.includes(scene.crops[0].id));
  canvasKey({ key: 'ArrowRight', preventDefault() {} });
  assert.ok(elements.get('crop-detail').textContent.includes(scene.crops[1].id), '方向键应移动到下一周，而非只重复标题');
  const tick = time => { const pending = [...frames.values()]; frames.clear(); for (const callback of pending) callback(time); };
  motion.matches = false; motion.onchange({ matches: false });
  tick(1000);
  const before = draws.length;
  for (let i = 1; i <= 600; i++) tick(1000 + i * 1000 / 60 + (i % 3 === 0 ? .12 : -.07));
  assert.ok(draws.length - before >= 298 && draws.length - before <= 301, '60Hz带抖动的10秒应绘制约300帧');
  assert.ok(Math.abs(draws.at(-1) - 10) < .04, '不能因保留余数重复累计场景时间');
  elements.get('pause').events.get('click')();
  const frozen = draws.at(-1), count = draws.length;
  tick(15000); assert.equal(draws.length, count); assert.equal(frames.size, 0);
  elements.get('pause').events.get('click')(); tick(20000);
  assert.equal(draws.at(-1), frozen, '恢复不能追赶暂停期间的时间');
  tick(20040); assert.ok(draws.at(-1) > frozen);
  document.hidden = true; listeners.get('visibilitychange')(); tick(21000);
  assert.equal(frames.size, 0);
  document.hidden = false; listeners.get('visibilitychange')(); tick(30000); tick(30040);
  const resumed = draws.at(-1); assert.ok(resumed < frozen + .1, '后台时间不进入场景');
  motion.matches = true; motion.onchange({ matches: true }); assert.equal(frames.size, 0);
});

async function withServer(options, action) {
  const server = createPreviewServer(options);
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  try { await action(`http://127.0.0.1:${server.address().port}`); }
  finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
}
test('本地 API 区分演示与真实、验证输入且不暴露磁盘文件', async () => {
  await withServer({ token: '', defaultUsername: 'octocat' }, async base => {
    const response = await fetch(`${base}/api/farm?user=octocat&profile=low`);
    const body = await response.json(); assert.equal(body.source, 'demo'); assert.equal(body.username, 'octocat');
    assert.equal((await fetch(`${base}/api/farm?mode=github`)).status, 503);
    for (const query of ['user=bad%2Fname', 'user=-bad', 'user=a--b', 'profile=wrong', 'mode=secret']) {
      assert.equal((await fetch(`${base}/api/farm?${query}`)).status, 400);
    }
    for (const url of ['/.env', '/package.json', '/src/fetcher.js', '/assets/spring/source-atlas.png', '/assets/spring/sources24/minerals.png']) {
      assert.equal((await fetch(base + url)).status, 404);
    }
    assert.equal((await fetch(`${base}/api/farm`, { method: 'POST' })).status, 405);
    const page = await fetch(base); assert.match(page.headers.get('content-type'), /text\/html/);
    assert.match(await page.text(), /你的代码/);
    const head = await fetch(`${base}/web/app.js`, { method: 'HEAD' }); assert.equal(await head.text(), '');
    for (const file of ['/src/art-catalog.js', '/src/farm-objects.js', '/src/farm-terrain.js', '/assets/spring/catalog.png', '/assets/spring/catalog24.png', '/assets/spring/catalog40.png']) assert.equal((await fetch(base + file)).status, 200);
  });
});
test('真实数据合并并发和缓存，配置与响应中不返回凭证', async () => {
  let calls = 0;
  await withServer({ token: 'test-only-placeholder', fetchData: async () => {
    calls++; await new Promise(resolve => setTimeout(resolve, 30));
    const { source, profile, ...realShape } = data; return realShape;
  } }, async base => {
    const replies = await Promise.all(Array.from({ length: 3 }, () => fetch(`${base}/api/farm?mode=github&user=octocat`).then(r => r.json())));
    assert.equal(calls, 1); assert.ok(replies.every(r => r.source === 'github'));
    await fetch(`${base}/api/farm?mode=github&user=Octocat`); assert.equal(calls, 1);
    const config = await (await fetch(`${base}/api/config`)).text();
    assert.equal(JSON.parse(config).githubAvailable, true); assert.ok(!config.includes('test-only-placeholder'));
  });
});
test('上游错误不泄漏敏感细节，用户不存在返回明确错误', async () => {
  await withServer({ token: 'test-only-placeholder', fetchData: async username => {
    if (username === 'missing') throw Object.assign(new Error('missing'), { code: 'USER_NOT_FOUND' });
    throw new Error('private upstream detail');
  } }, async base => {
    assert.equal((await fetch(`${base}/api/farm?mode=github&user=missing`)).status, 404);
    const response = await fetch(`${base}/api/farm?mode=github&user=octocat`);
    assert.equal(response.status, 502); assert.ok(!(await response.text()).includes('private upstream'));
  });
  await assert.rejects(fetchContributions('octocat', ''), /GITHUB_TOKEN/);
});
