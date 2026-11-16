/** 编译首批24种素材：保留源稿，按实测边界切分，分别处理洋红／青色色键。 */
import { createCanvas, loadImage } from 'canvas';
import { mkdir, writeFile, copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ART_CATALOG, ART_BY_ID, RESIDENT_TYPES, BOTANICAL_TYPES, ART_FINISH_REVISION, finishSpriteEdges } from '../src/art-catalog.js';
import { residentPieces } from './draw-residents.mjs';
import { drawTerrain, landscapePieces } from './draw-landscape.mjs';
import { FARM_MAP } from '../src/farm-objects.js';

const output = fileURLToPath(new URL('../assets/spring/', import.meta.url));
const sources = resolve(output, 'sources24');
await mkdir(sources, { recursive: true });
const imports = {
  'crops.png': 'spring24-crops-plants_1792807668.png',
  'garden.png': 'spring24-buildings-garden_1792807672.png',
  'residents.png': 'spring24-residents-animation_1792807673.png',
  'minerals.png': 'spring24-minerals_1792807666.png',
  'terrain.png': 'spring24-island-terrain_1792807804.png',
};
if (process.argv[2] && !process.argv[2].startsWith('--')) {
  for (const [name, original] of Object.entries(imports)) {
    await copyFile(resolve(process.argv[2], original), resolve(sources, name));
  }
}
const images = Object.fromEntries(await Promise.all(Object.keys(imports).map(async name => [name, await loadImage(resolve(sources, name))])));
images['original.png'] = await loadImage(resolve(output, 'source-atlas.png'));
const nextSources = resolve(output, 'sources40');
await mkdir(nextSources, { recursive: true });
const botanicalArgument = process.argv.indexOf('--botanical-source');
if (botanicalArgument >= 0) await copyFile(resolve(process.argv[botanicalArgument + 1]), resolve(nextSources, 'botanicals.png'));
images['botanicals.png'] = await loadImage(resolve(nextSources, 'botanicals.png'));
const pieces = [];
const grid = (file, keys, cols, rows) => keys.forEach((key, i) => {
  if (!key) return;
  const { width, height } = images[file];
  pieces.push({ key, file, box: [i % cols * width / cols, Math.floor(i / cols) * height / rows, width / cols, height / rows], inset: 3 });
});
grid('original.png', [
  'seed', 'sprout', 'young', 'green', 'wheat',
  'chicken-idle', 'chicken-step-a', 'chicken-step-b', 'chicken-peck',
  'cloud-small', 'cloud-large', 'tree-round', 'tree-pine', 'flowers-blue', null, 'scarecrow',
], 4, 4);
grid('crops.png', ['carrot-seed', 'carrot-sprout', 'carrot-young', 'carrot-green', 'carrot-ripe', 'pumpkin-seed', 'pumpkin-sprout', 'pumpkin-young', 'pumpkin-green', 'pumpkin-ripe', 'grass', 'reed'], 4, 3);
// 建筑稿没有严格遵守均分格线；使用实际外轮廓范围，不能裁断屋顶或池岸。
for (const [key, box] of Object.entries({
  barn: [42, 82, 400, 434], cottage: [476, 104, 390, 412],
  well: [914, 145, 309, 371], lamp: [1334, 84, 107, 432],
  fence: [64, 684, 330, 229], path: [472, 741, 294, 153],
  pond: [806, 693, 445, 244], sunflower: [1280, 614, 187, 327],
})) pieces.push({ key, file: 'garden.png', box, inset: 1 });
grid('residents.png', [null, null, null, null, 'cat-idle', 'cat-blink', 'cat-stretch', 'cat-sleep', 'fish-a', 'fish-b', 'fish-c', 'fish-d', 'sproutling-idle', 'sproutling-blink', 'sproutling-wave', 'sproutling-step'], 4, 4);
grid('minerals.png', ['copper', 'amethyst'], 2, 1);
for (const [i, key] of BOTANICAL_TYPES.entries()) {
  const row = Math.floor(i / 4), top = row === 0 ? 0 : row === 1 ? 378 : 700;
  const special = key === 'cattail';
  pieces.push({ key, file: 'botanicals.png', box: [i % 4 * 384, special ? 660 : top, 384,
    special ? 364 : row === 0 ? 378 : row === 1 ? (key === 'red-mushroom' ? 282 : 322) : 324], inset: 1 });
}

function extract(piece) {
  const [left, top, width, height] = piece.box.map(Math.round);
  const canvas = createCanvas(width, height), ctx = canvas.getContext('2d');
  ctx.drawImage(images[piece.file], left, top, width, height, 0, 0, width, height);
  const pixels = ctx.getImageData(0, 0, width, height), data = pixels.data;
  const botanical = piece.file === 'botanicals.png';
  const cyan = piece.file === 'minerals.png';
  const isKey = p => {
    const [r, g, b] = data.subarray(p * 4, p * 4 + 3);
    if (botanical) return Math.max(Math.abs(r - 195), Math.abs(g - 70), Math.abs(b - 130)) < 34;
    return cyan ? g > r * 1.23 + 12 && b > r * 1.23 + 12 && Math.abs(g - b) < 70
      : r > g * 1.35 + 12 && b > g * 1.08 + 8 && b > r * .38;
  };
  // 从外缘泛洪移除连续背景渐变，避免生成器附带的光晕粘在建筑上。
  const removed = new Uint8Array(width * height), queue = [];
  const add = p => { if (!removed[p]) { removed[p] = 1; queue.push(p); } };
  for (let x = 0; x < width; x++) { add(x); add((height - 1) * width + x); }
  for (let y = 0; y < height; y++) { add(y * width); add(y * width + width - 1); }
  const neighbors = p => {
    const x = p % width, y = Math.floor(p / width);
    return [x > 0 ? p - 1 : -1, x < width - 1 ? p + 1 : -1, y > 0 ? p - width : -1, y < height - 1 ? p + width : -1];
  };
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i];
    for (const n of neighbors(p)) {
      if (n < 0 || removed[n]) continue;
      const distance = Math.max(...[0, 1, 2].map(c => Math.abs(data[n * 4 + c] - data[p * 4 + c])));
      const glow = piece.key === 'barn' && distance < 12 && data[n * 4] > 170 && data[n * 4 + 1] > 90 && data[n * 4 + 2] > 70;
      if (isKey(n) || glow) add(n);
    }
  }
  for (let p = 0; p < removed.length; p++) {
    const x = p % width, y = Math.floor(p / width);
    if (removed[p] || isKey(p) || x < piece.inset || x >= width - piece.inset || y < piece.inset || y >= height - piece.inset) data[p * 4 + 3] = 0;
  }
  const visited = new Uint8Array(width * height);
  let largest = [];
  const components = [];
  for (let p = 0; p < visited.length; p++) {
    if (visited[p] || !data[p * 4 + 3]) continue;
    const group = [p]; visited[p] = 1;
    for (let i = 0; i < group.length; i++) {
      for (const n of neighbors(group[i])) {
        if (n >= 0 && !visited[n] && data[n * 4 + 3]) { visited[n] = 1; group.push(n); }
      }
    }
    if (group.length > largest.length) largest = group;
    if (botanical && group.length >= 12) components.push(...group);
  }
  if (largest.length < 40) throw new Error(`主体丢失：${piece.key}`);
  const kept = new Uint8Array(width * height);
  let minX = width, minY = height, maxX = 0, maxY = 0;
  for (const p of botanical ? components : largest) {
    kept[p] = 1;
    const x = p % width, y = Math.floor(p / width);
    minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  for (let p = 0; p < kept.length; p++) if (!kept[p]) data.fill(0, p * 4, p * 4 + 4);
  ctx.putImageData(pixels, 0, 0);
  return { canvas, x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1, piece };
}
const extracted = [...pieces.map(extract), ...residentPieces(), ...landscapePieces()];
const sprites = {};
// 动画使用整组同一缩放系数；睡觉的猫不会被拉长到站立高度。
const scales = {};
for (const item of ART_CATALOG.filter(item => item.frames.length > 1 && item.category !== '作物')) {
  const group = extracted.filter(entry => item.frames.includes(entry.piece.key));
  const scale = item.resident ? 1 : Math.min(1, 236 / Math.max(...group.flatMap(entry => [entry.w, entry.h])));
  for (const key of item.frames) scales[key] = scale;
}
// 确定性货架排布，留两像素透明间隙，避免为每个40像素动作分配256像素格子。
let cursorX = 2, cursorY = 2, shelfHeight = 0;
for (const entry of extracted) {
  const limit = entry.piece.file === 'botanicals.png' ? 112 : 236;
  const scale = scales[entry.piece.key] ?? Math.min(1, limit / Math.max(entry.w, entry.h));
  entry.dw = Math.round(entry.w * scale); entry.dh = Math.round(entry.h * scale);
  if (cursorX + entry.dw + 2 > 1536) { cursorY += shelfHeight + 4; cursorX = 2; shelfHeight = 0; }
  entry.dx = cursorX; entry.dy = cursorY;
  cursorX += entry.dw + 4; shelfHeight = Math.max(shelfHeight, entry.dh);
}
const atlas = createCanvas(1536, cursorY + shelfHeight + 2), ctx = atlas.getContext('2d');
if (atlas.height > 4096) throw new Error('图集超过纹理尺寸上限');
ctx.imageSmoothingEnabled = false;
for (const entry of extracted) {
  const { piece, canvas, x, y, w, h, dx, dy, dw, dh } = entry;
  ctx.drawImage(canvas, x, y, w, h, dx, dy, dw, dh);
  const art = ART_CATALOG.find(item => item.frames.includes(piece.key));
  if (art && !art.resident && !art.botanical && !art.native) ctx.putImageData(finishSpriteEdges(ctx.getImageData(dx, dy, dw, dh), art.id, piece.key), dx, dy);
  if (art && ['树木', '花草', '建筑'].includes(art.category) && !art.native) {
    const image = ctx.getImageData(dx, dy, dw, dh);
    for (let p = 0; p < image.data.length; p += 4) {
      const d = image.data; if (!d[p + 3]) continue;
      if (d[p + 1] > d[p] * 1.12 && d[p + 1] > d[p + 2] * 1.25) {
        d[p] = Math.max(0, d[p] - 7); d[p + 1] = Math.min(255, d[p + 1] + 4); d[p + 2] = Math.max(0, d[p + 2] - 5);
      }
    }
    ctx.putImageData(image, dx, dy);
  }
  // 新透明稿不套旧色键去残色，保护粉花、紫花和人物衣服的真实颜色。
  sprites[piece.key] = { x: dx, y: dy, w: dw, h: dh, source: piece.file, sourceBox: piece.box,
    ...(entry.pivot ? { pivot: entry.pivot, sourceHeight: entry.sourceHeight } : {}) };
}
for (const entry of ART_CATALOG) for (const frame of entry.frames) if (!sprites[frame]) throw new Error(`缺少帧：${entry.id}/${frame}`);
await writeFile(resolve(output, 'sprites.png'), atlas.toBuffer('image/png'));
await writeFile(resolve(output, 'manifest.json'), JSON.stringify({
  version: 3, mapRevision: FARM_MAP.revision, finishRevision: ART_FINISH_REVISION, padding: 2, width: atlas.width, height: atlas.height,
  catalog: ART_CATALOG, sprites,
  provenance: `本项目原创素材，${ART_CATALOG.length}种对象。AI辅助花草源稿保留在sources40；170张人物动作源稿为scripts/draw-residents.mjs；水岸与8类新道具源稿为scripts/draw-landscape.mjs。旧源稿全部保留。`,
}, null, 2) + '\n');

// 地面采用连续、多尺度的色块，不再重复铺一块高对比的草地照片。
const ground = drawTerrain(FARM_MAP);
const background = createCanvas(1536, 1024), backgroundCtx = background.getContext('2d');
backgroundCtx.imageSmoothingEnabled = false;
backgroundCtx.drawImage(ground, 0, 0, background.width, background.height);
await writeFile(resolve(output, 'background.png'), background.toBuffer('image/png'));

// 为人工验收输出24种对象联系表；不是运行时页面的新设计。
const board = createCanvas(1440, Math.ceil(ART_CATALOG.length / 6) * 240), boardCtx = board.getContext('2d');
boardCtx.fillStyle = '#edeadd'; boardCtx.fillRect(0, 0, board.width, board.height);
boardCtx.imageSmoothingEnabled = false;
for (const [index, item] of ART_CATALOG.entries()) {
  const x = index % 6 * 240, y = Math.floor(index / 6) * 240;
  boardCtx.fillStyle = index % 2 ? '#e0e7d7' : '#f5f3e8'; boardCtx.fillRect(x + 5, y + 5, 230, 230);
  const key = item.category === '作物' ? item.frames.at(-1) : item.frames[0];
  const rect = sprites[key], scale = Math.min(175 / rect.w, 175 / rect.h);
  if (item.id === 'pond') boardCtx.drawImage(ground, 16, 314, 380, 166, x + 15, y + 56, 210, 92);
  else boardCtx.drawImage(atlas, rect.x, rect.y, rect.w, rect.h, x + (240 - rect.w * scale) / 2, y + 186 - rect.h * scale, rect.w * scale, rect.h * scale);
  boardCtx.textAlign = 'center'; boardCtx.fillStyle = '#354b35'; boardCtx.font = '17px "Microsoft YaHei", sans-serif';
  boardCtx.fillText(`${String(index + 1).padStart(2, '0')}  ${item.name}`, x + 120, y + 214);
}
await writeFile(resolve(output, 'catalog.png'), board.toBuffer('image/png'));
// 原始尺寸透明动作源表和三倍动作联系表共同用于检查脚底锚点与全方向轮廓。
const sourceBoard = createCanvas(8 * 40, 25 * 40), sb = sourceBoard.getContext('2d');
const actionBoard = createCanvas(8 * 120, 25 * 120), ab = actionBoard.getContext('2d');
ab.fillStyle = '#dce3c9'; ab.fillRect(0, 0, actionBoard.width, actionBoard.height); ab.imageSmoothingEnabled = false;
RESIDENT_TYPES.forEach((type, person) => ART_BY_ID[type].frames.forEach((key, i) => {
  const rect = sprites[key], x = i % 8 * 40, y = (person * 5 + Math.floor(i / 8)) * 40;
  sb.drawImage(atlas, rect.x, rect.y, 40, 40, x, y, 40, 40);
  ab.fillStyle = '#afbd9c'; ab.fillRect(x * 3, y * 3 + 114, 120, 1);
  ab.drawImage(atlas, rect.x, rect.y, 40, 40, x * 3, y * 3, 120, 120);
}));
await writeFile(resolve(nextSources, 'residents.png'), sourceBoard.toBuffer('image/png'));
await writeFile(resolve(output, 'resident-actions.png'), actionBoard.toBuffer('image/png'));
console.log(`${ART_CATALOG.length} 种对象，${Object.keys(sprites).length} 个精灵帧，图集 ${atlas.width}×${atlas.height}。`);
