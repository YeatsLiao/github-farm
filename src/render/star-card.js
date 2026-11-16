import { createCanvas, loadImage } from 'canvas';
import { readFile } from 'node:fs/promises';
import { contains } from '../farm/geometry.js';
import { randomFor } from '../farm/seed.js';
import { paintStarGround } from './star-ground.js';

let artPromise;
function assets() {
  return artPromise ??= (async () => ({
    atlas: await loadImage(await readFile(new URL('../../assets/runtime/spring/atlas.png', import.meta.url))),
    manifest: JSON.parse(await readFile(new URL('../../assets/runtime/spring/manifest.json', import.meta.url), 'utf8')),
  }))();
}

function fill(ctx, color, x, y, width, height) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, width, height);
}

function fitTitle(ctx, title, maxWidth) {
  if (ctx.measureText(title).width <= maxWidth) return title;
  const glyphs = [...title];
  while (glyphs.length && ctx.measureText(glyphs.join('') + '…').width > maxWidth) glyphs.pop();
  return glyphs.join('') + '…';
}

function shadow(ctx, x, y, width) {
  ctx.beginPath();
  ctx.ellipse(x + width * .13, y - 2, width * .57, Math.min(11, width * .15), -.12, 0, Math.PI * 2);
  ctx.fillStyle = '#34472b35';
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x, y - 2, width * .37, Math.min(6, width * .09), 0, 0, Math.PI * 2);
  ctx.fillStyle = '#3440203e';
  ctx.fill();
}

function sprite(ctx, art, {type, x, y, scale = 1, ground = true}) {
  const entry = art.manifest.sprites[type];
  if (!entry) throw Error('Missing sprite ' + type);
  const [ax, ay, w, h] = entry.rect;
  const [px, py] = entry.pivot;
  if (ground) shadow(ctx, x + (w / 2 - px) * scale, y, w * scale);
  ctx.drawImage(art.atlas, ax, ay, w, h, Math.round(x - px * scale), Math.round(y - py * scale), Math.round(w * scale), Math.round(h * scale));
}

function fenceSide(ctx, {x, y, scale = 1}) {
  // A fence running into the scene shows the ends of its rails and the side of each post.
  const colors = ['#57351f', '#a96735', '#d89754', '#edb779'];
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.scale(scale, scale);
  for (const rail of [-15, -9]) {
    fill(ctx, colors[0], -3, rail - 28, 6, 29);
    fill(ctx, colors[1], -2, rail - 28, 4, 28);
    fill(ctx, colors[2], -2, rail - 28, 2, 28);
  }
  for (const foot of [-28, 0]) {
    fill(ctx, colors[0], -4, foot - 20, 8, 20);
    fill(ctx, colors[1], -3, foot - 18, 6, 17);
    fill(ctx, colors[2], -3, foot - 18, 3, 16);
    fill(ctx, colors[3], -2, foot - 20, 4, 3);
  }
  ctx.restore();
}

function woodland(blueprint) {
  const random = randomFor(blueprint.seed, 'woodland-edge');
  const trees = [];
  // Continuous rear canopy and thicker groves that frame the clearing.
  for (let i = 0; i < 15; i++) {
    trees.push({type: i % 4 ? 'oak' : 'pine', x: i * 47 - 7 + random() * 18, y: 30 + random() * 20, scale: 1.05 + random() * .3, ground: false});
  }
  for (const [x, y, type, scale] of [[9, 87, 'pine', 1], [75, 59, 'oak', .9], [177, 65, 'oak', .91], [277, 55, 'pine', .95], [365, 63, 'oak', 1], [477, 55, 'pine', .86], [563, 67, 'oak', .9], [633, 106, 'oak', 1.05]]) {
    trees.push({type, x: x + (random() - .5) * 16, y: y + (random() - .5) * 20, scale, ground: false});
  }
  trees.push({type: 'oak', x: -14, y: 393, scale: 1.14, ground: false}, {type: 'oak', x: 655, y: 390, scale: 1.07, ground: false});
  return trees;
}

function courtyard(scene) {
  const b = scene.blueprint;
  const [hx, hy] = b.home;
  const [px, py, rx, ry] = b.pond;
  const group = [
    {type: 'hydrangea', x: hx - 67, y: hy + 5, scale: .86},
    {type: 'daisy', x: hx - 78, y: hy + 12, scale: .78},
    {type: 'sunflower', x: hx + 33, y: hy + 8, scale: .9},
    {type: 'berry', x: hx + 44, y: hy + 4, scale: .82},
    {type: 'rock', x: px - rx * .75, y: py - ry * .62, scale: .77},
    {type: 'rock', x: px + rx * .89, y: py + ry * .46, scale: .7},
    {type: 'daisy', x: px + rx * .8, y: py + ry * .81, scale: .75},
    {type: 'fern', x: px - rx * .74, y: py + ry * .83, scale: .9},
    {type: 'waterlily', x: px - rx * .35, y: py + ry * .35, scale: .6, ground: false},
  ];
  if (scene.pen) {
    const [x, y] = b.livestock;
    let fenceCount = 0;
    for (const side of [-1, 1]) {
      const fenceX = x + side * 33, fenceY = y + 45;
      if (b.reserved.some(box => contains(box, fenceX, fenceY, 13))) continue;
      if (b.routes.some(route => route.points.some(([px, py]) => Math.abs(fenceX - px) < 17 && Math.abs(fenceY - py) < 9))) continue;
      group.push({type: 'fence', x: fenceX, y: fenceY, scale: .86});
      fenceCount++;
    }
    if (!fenceCount) group.push({type: 'barrel', x: x + 36, y: y + 5, scale: .72});
  }
  const [gx, gy] = b.gate;
  for (const side of [-1, 1]) {
    for (let i = 0; i < 2; i++) {
      const x = gx + side * (25 + i * 28), y = gy - 9 - i * 3;
      if (b.reserved.some(box => contains(box, x, y, 12))) continue;
      if (b.routes.some(route => route.points.some(([px, py]) => Math.abs(x - px) < 12 && Math.abs(y - py) < 7))) continue;
      group.push({type: 'fence', x, y, scale: .91});
    }
  }
  return group;
}

export async function renderStarCard(scene, {viewport = scene.viewport ?? {x: 0, y: 0, width: 640, height: 360}} = {}) {
  const art = await assets();
  const canvas = createCanvas(1280, 960);
  const ctx = canvas.getContext('2d');
  ctx.scale(2, 2);
  ctx.imageSmoothingEnabled = false;
  fill(ctx, '#f7efd9', 0, 0, 640, 480);
  ctx.fillStyle = '#503824';
  ctx.font = 'bold 15px monospace';
  ctx.fillText(fitTitle(ctx, scene.snapshot.fullName, 580), 42, 23);
  ctx.font = '10px monospace';
  ctx.fillStyle = '#8c7251';
  ctx.fillText('A LITTLE FARM GROWN BY YOUR COMMUNITY', 42, 38);
  sprite(ctx, art, {type: 'sprout', x: 22, y: 29, scale: 1.4, ground: false});

  // Render the farm at its native pixel size, then double it as a single scene.
  const farm = createCanvas(640, 360);
  const sceneCtx = farm.getContext('2d');
  sceneCtx.imageSmoothingEnabled = false;
  paintStarGround(sceneCtx, scene, createCanvas);
  const objects = [...woodland(scene.blueprint), ...scene.objects, ...courtyard(scene)];
  objects.sort((a, b) => a.y - b.y);
  for (const object of objects) {
    if (object.type === 'fence-side') fenceSide(sceneCtx, object);
    else sprite(sceneCtx, art, object.type === 'waterlily' ? {...object, ground: false} : object);
  }
  ctx.drawImage(farm, viewport.x, viewport.y, viewport.width, viewport.height, 0, 48, 640, 360);
  fill(ctx, '#ba9c68', 0, 408, 640, 1);

  const s = scene.snapshot;
  ctx.fillStyle = '#503824';
  ctx.font = 'bold 16px monospace';
  ctx.fillText('STARS ' + s.stars.toLocaleString('en-US'), 18, 433);
  ctx.font = 'bold 11px monospace';
  ctx.fillText('NEW / 7D ' + (s.newStars7d == null ? '--' : '+' + s.newStars7d), 238, 432);
  ctx.fillText(`STAGE ${String(scene.stage.number).padStart(2, '0')} / ${scene.stage.total}`, 440, 432);
  ctx.font = '10px monospace';
  ctx.fillStyle = '#8c7251';
  const milestone = scene.stage.next;
  const next = milestone == null ? scene.stage.endLabel ?? 'FULLY GROWN' : `NEXT STAGE: ${milestone.toLocaleString('en-US')}  /  ${(milestone - s.stars).toLocaleString('en-US')} TO GO`;
  ctx.fillText(next, 18, 452);
  ctx.font = '9px monospace';
  const stamp = s.source === 'github'
    ? `${s.stale ? 'STALE' : 'UPDATED'}  |  ${s.fetchedAt.slice(0, 16).replace('T', ' ')} UTC  |  SPRING`
    : `DEMO DATA  |  ${s.fetchedAt}  |  SPRING`;
  ctx.fillText(stamp, 18, 469);
  return canvas.toBuffer('image/png');
}

export function renderStarError(message) {
  const canvas = createCanvas(640, 160);
  const ctx = canvas.getContext('2d');
  fill(ctx, '#f7efd9', 0, 0, 640, 160);
  fill(ctx, '#ba9c68', 0, 0, 640, 4);
  ctx.fillStyle = '#503824';
  ctx.font = 'bold 24px monospace';
  ctx.fillText('GitHub Farm', 28, 64);
  ctx.font = '16px monospace';
  ctx.fillText(message, 28, 105);
  return canvas.toBuffer('image/png');
}
