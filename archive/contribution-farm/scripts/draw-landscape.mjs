/** 原创水岸地表和生活道具源稿；只在离线素材编译时运行。 */
import { createCanvas } from 'canvas';
import { terrainFor, terrainHash as hash, SURFACE, inRect } from '../src/farm-terrain.js';

const palette = {
  grass: ['#82b53b', '#85b73d', '#7eb239', '#88b83f'],
  shade: ['#498735', '#4c8a36', '#4e8d37', '#518f38'],
  dirt: ['#d6ab5b', '#dfb967', '#e5c271', '#cca052'],
  water: ['#299db2', '#31abc0', '#36b4c5', '#2ca5b9'],
};
const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
export function drawTerrain(map) {
  const canvas = createCanvas(map.width, map.height), ctx = canvas.getContext('2d'), terrain = terrainFor(map);
  const pixels = ctx.createImageData(map.width, map.height);
  const variants = Object.fromEntries(Object.entries(palette).map(([k, values]) => [k, values.map(rgb)]));
  for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) {
    const p = y * map.width + x, kind = terrain.surface[p], distance = terrain.shore[p];
    const tile = Math.floor(hash(Math.floor(x / 16), Math.floor(y / 16)) * 4);
    const mottled = (Math.sin(x / 27 + Math.cos(y / 31)) + Math.cos(y / 19 + x / 53)) > .7;
    const wooded = (x > 404 + Math.sin(y / 23) * 12 && y < 130 + Math.sin(x / 37) * 14) || (y > 484 + Math.sin(x / 24) * 6 && x < 392) || x < 14 || x > 758;
    let color = variants[wooded ? 'shade' : 'grass'][(tile + Number(mottled)) % 4];
    if (kind === SURFACE.water || (kind === SURFACE.bridge && terrain.water[p])) {
      const wave = (x + Math.floor(y / 3) * 5) % 19 < 2;
      color = distance < 2 ? [44, 110, 103] : distance < 5 ? [67, 143, 129] : variants.water[(tile + Number(wave)) % 4];
    } else if (kind === SURFACE.soil) {
      const bed = map.beds.find(r => inRect(r, x, y));
      const border = Math.min(x - bed.left, bed.right - x, y - bed.top, bed.bottom - y);
      const row = ((y - bed.grid.y) % 26 + 26) % 26;
      color = border < 2 ? [114, 78, 41] : row === 6 || row === 7 ? [148, 96, 47] : [171 + tile * 4, 119 + tile * 3, 55 + tile];
    } else if (kind === SURFACE.stone) {
      const offset = Math.floor(y / 8) % 2 * 6, tx = (x + offset) % 12, ty = y % 8;
      color = tx === 0 || ty === 0 ? [150, 129, 81] : ty === 1 ? [217, 195, 129] : [192 + tile * 3, 166 + tile * 3, 106 + tile * 2];
    } else if (kind === SURFACE.road || kind === SURFACE.bridge) {
      color = variants.dirt[tile];
      if (hash(Math.floor(x / 3), Math.floor(y / 2)) < .11) color = [191, 150, 75];
    } else if (distance < 7) {
      const behind = y > 3 && terrain.water[p - 3 * map.width];
      color = distance < 2 ? [113, 88, 41] : distance < 4 ? behind ? [185, 133, 54] : [214, 167, 76] : [166, 159, 58];
    } else if (kind === SURFACE.grass) {
      const edge = [x > 1 ? p - 2 : -1, x < map.width - 2 ? p + 2 : -1, p - map.width * 2, p + map.width * 2]
        .some(n => n >= 0 && n < terrain.surface.length && [SURFACE.road, SURFACE.stone].includes(terrain.surface[n]));
      if (edge && hash(Math.floor(x / 3), Math.floor(y / 2), 41) > .25) color = [177, 167, 77];
    }
    pixels.data.set([...color, 255], p * 4);
  }
  ctx.putImageData(pixels, 0, 0);
  // 相邻地表边界只添加短草和碎石笔触，不改动可通行掩码。
  const clearGrass = (x, y) => x >= 0 && y >= 0 && x < map.width && y < map.height && terrain.surface[y * map.width + x] === SURFACE.grass && terrain.shore[y * map.width + x] > 5;
  for (let y = 8; y < map.height - 7; y += 7) for (let x = 5; x < map.width - 8; x += 8) {
    const px = x + Math.floor(hash(x, y) * 7), py = y + Math.floor(hash(y, x) * 6);
    if (!clearGrass(px, py) || !clearGrass(px, py - 4)) continue;
    const p = py * map.width + px;
    const border = map.flowerBeds.some(r => inRect(r, px, py));
    const forest = (px > 404 && py < 150) || (py > 476 && px < 392);
    const edge = [p - 6, p + 6, p - map.width * 6, p + map.width * 6].some(n => n >= 0 && n < terrain.surface.length && terrain.surface[n] !== SURFACE.grass);
    const patch = Math.sin(px / 13 + Math.sin(py / 17)) + Math.cos(py / 11) > .6;
    const dense = border || forest || terrain.shore[p] < 15 || edge;
    if (hash(px, py, 8) > (dense ? .64 : patch ? .22 : .045)) continue;
    ctx.fillStyle = forest ? '#397332' : '#689e32'; ctx.fillRect(px - 3, py, 7, 2);
    const variant = Math.floor(hash(py, px, 91) * 4);
    ctx.fillStyle = forest ? '#72a83e' : '#a0c74a';
    if (variant < 2) { ctx.fillRect(px - 2, py - 2, 3, 2); ctx.fillRect(px + 1, py - 3, 3, 2); }
    else { ctx.fillRect(px - 2, py - 3, 1, 4); ctx.fillRect(px + 2, py - 4, 1, 4); }
    ctx.fillStyle = '#88b83e'; ctx.fillRect(px, py - 1, 2, 2);
    if (border && hash(px, py, 13) > .68) {
      const colors = ['#f5da57', '#f4e9b3', '#ef9cb0', '#c5a2de'];
      ctx.fillStyle = colors[Math.floor(hash(py, px, 5) * 4)]; ctx.fillRect(px - 1, py - 5, 3, 2);
      ctx.fillStyle = '#fbdd61'; ctx.fillRect(px, py - 5, 1, 1);
    }
  }
  // 连续树林的低层树叶与草甸形成深浅边界，空地仍保持可阅读的色块。
  for (let gx = 406; gx < map.width - 20; gx += 22) for (let gy = 10; gy < 108; gy += 19) {
    const x = gx + Math.floor(hash(gx, gy, 72) * 17), y = gy + Math.floor(hash(gy, gx, 22) * 13);
    if (!clearGrass(x, y) || hash(x, y, 72) < .32) continue;
    ctx.fillStyle = '#397a34'; ctx.fillRect(x - 5, y, 14, 5); ctx.fillRect(x - 2, y - 4, 10, 6);
    ctx.fillStyle = '#639d3b'; ctx.fillRect(x - 5, y - 2, 9, 4); ctx.fillRect(x - 1, y - 5, 7, 3);
    ctx.fillStyle = '#88b846'; ctx.fillRect(x - 3, y - 3, 4, 2);
  }
  return canvas;
}

function propCanvas(type) {
  const sizes = { bridge: [96, 48], deck: [80, 64], barrel: [24, 24], crate: [26, 20], woodpile: [36, 22], bench: [40, 24], hedge: [32, 20], 'tall-mushroom': [46, 68] };
  const base = type.replace('-rail', ''), [w, h] = sizes[base];
  const canvas = createCanvas(w, h), ctx = canvas.getContext('2d');
  const rect = (x, y, width, height, color) => { ctx.fillStyle = color; ctx.fillRect(x, y, width, height); };
  const oval = (cx, cy, rx, ry, color) => {
    for (let y = -ry; y <= ry; y++) { const span = Math.floor(rx * Math.sqrt(Math.max(0, 1 - y * y / (ry * ry)))); rect(cx - span, cy + y, span * 2 + 1, 1, color); }
  };
  const post = (x, y) => { rect(x, y, 5, 15, '#594126'); rect(x + 1, y, 3, 13, '#ac793e'); rect(x, y, 5, 2, '#efc77c'); };
  if (base === 'bridge' || base === 'deck') {
    const top = 16, bottom = h - 6;
    if (!type.endsWith('-rail')) {
      rect(3, top - 1, w - 6, bottom - top + 4, '#654426');
      for (let x = 4; x < w - 4; x += 8) {
        rect(x, top, 7, bottom - top + 1, '#b58347'); rect(x, top, 2, bottom - top, '#d6aa63');
        rect(x + 3, top + 4 + x % 7, 1, 9, '#956439'); rect(x + 4, bottom - 6, 1, 2, '#574a31');
      }
      rect(3, top - 2, w - 6, 2, '#ebc782');
      for (const x of [3, Math.floor(w / 2) - 2, w - 8]) post(x, 3);
      rect(4, 8, w - 8, 4, '#6e4828'); rect(4, 8, w - 8, 2, '#d9aa62');
    } else {
      for (const x of [3, Math.floor(w / 2) - 2, w - 8]) post(x, h - 17);
      rect(4, h - 11, w - 8, 4, '#78532c'); rect(4, h - 11, w - 8, 2, '#d5a15a');
    }
  } else if (base === 'barrel') {
    oval(12, 19, 9, 3, '#543d28'); rect(3, 5, 18, 14, '#71502d'); rect(5, 5, 4, 15, '#c3934f'); rect(10, 5, 4, 15, '#a7753b'); rect(15, 5, 4, 14, '#8e602f');
    oval(12, 5, 9, 4, '#5c462d'); oval(12, 4, 7, 2, '#d5ab65'); rect(4, 9, 16, 2, '#626159'); rect(4, 16, 16, 2, '#626159'); rect(5, 9, 4, 1, '#c0b78b');
  } else if (base === 'crate') {
    rect(2, 3, 22, 16, '#604628'); rect(3, 4, 19, 13, '#ba8744');
    for (let x = 7; x < 23; x += 5) rect(x, 4, 1, 13, '#855c31');
    rect(3, 3, 20, 2, '#e7bd73'); rect(3, 16, 20, 2, '#d1a15b');
    for (let i = 0; i < 14; i++) rect(4 + i, 4 + i % 13, 3, 1, '#e6b568');
  } else if (base === 'woodpile') {
    for (const [x, y] of [[7, 16], [18, 16], [29, 16], [12, 8], [24, 8]]) {
      rect(x - 5, y - 5, 10, 8, '#644529'); oval(x, y, 5, 4, '#b78342'); oval(x, y, 3, 2, '#dfb16a'); rect(x, y, 1, 1, '#7d5530');
    }
  } else if (base === 'bench') {
    rect(6, 13, 4, 10, '#684828'); rect(29, 13, 4, 10, '#684828');
    rect(4, 3, 32, 4, '#c49751'); rect(4, 8, 32, 4, '#af7c3e'); rect(3, 13, 34, 4, '#e1b570'); rect(3, 17, 34, 2, '#805b31');
    rect(6, 1, 3, 12, '#75512b'); rect(30, 1, 3, 12, '#75512b');
  } else if (base === 'hedge') {
    rect(3, 14, 26, 4, '#38612d');
    for (const [x, y] of [[7, 10], [16, 8], [25, 10]]) {
      oval(x, y, 6, 7, '#376c31'); oval(x, y - 2, 5, 5, '#609e38'); rect(x - 3, y - 5, 3, 2, '#a6ce51');
      rect(x + 1, y + 2, 2, 2, '#28532b');
    }
  } else if (base === 'tall-mushroom') {
    rect(19, 24, 10, 41, '#a38b65'); rect(20, 23, 5, 41, '#ead7a2'); rect(21, 25, 2, 38, '#f6e6b5');
    oval(23, 24, 20, 8, '#793649'); oval(23, 19, 21, 15, '#973748'); oval(21, 15, 17, 11, '#c84c60');
    oval(15, 11, 5, 3, '#edbdac'); oval(28, 13, 4, 3, '#f1d4b4'); oval(10, 22, 3, 2, '#e7c3a7'); oval(31, 24, 5, 3, '#e7c3a7'); oval(21, 22, 3, 2, '#efcdb2');
    rect(17, 64, 16, 2, '#6d7b35'); rect(15, 65, 5, 2, '#a2b845');
  }
  return canvas;
}
export function landscapePieces() {
  const types = ['bridge', 'bridge-rail', 'deck', 'deck-rail', 'barrel', 'crate', 'woodpile', 'bench', 'hedge', 'tall-mushroom'];
  return types.map(key => {
    const canvas = propCanvas(key);
    return { piece: { key, file: 'draw-landscape.mjs', box: [0, 0, canvas.width, canvas.height] }, canvas, x: 0, y: 0, w: canvas.width, h: canvas.height, native: true };
  });
}
