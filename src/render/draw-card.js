import { contains } from '../farm/geometry.js';
import { randomFor } from '../farm/seed.js';
import { paintStarGround } from './ground.js';
import { yardProps } from './props.js';

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
  const pixels = yardProps[type];
  if (pixels) {
    if (ground && type !== 'verge' && type !== 'pebbles') shadow(ctx, x, y, pixels[0][3] * scale);
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.scale(scale, scale);
    for (const [color, left, top, width, height] of pixels) fill(ctx, color, left, top, width, height);
    ctx.restore();
    return;
  }
  const entry = art.manifest.sprites[type];
  if (!entry) throw Error('Missing sprite ' + type);
  const [ax, ay, w, h] = entry.rect;
  const [px, py] = entry.pivot;
  if (ground) shadow(ctx, x + (w / 2 - px) * scale, y, w * scale);
  ctx.drawImage(art.atlas, ax, ay, w, h, Math.round(x - px * scale), Math.round(y - py * scale), Math.round(w * scale), Math.round(h * scale));
}

function fencePieces(runs) {
  const rails = [];
  const posts = new Map();
  for (const points of runs) {
    for (const [i, a] of points.slice(0, -1).entries()) {
      const b = points[i + 1];
      const count = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 22));
      let last = a;
      for (let n = 0; n <= count; n++) {
        const point = a.map((coordinate, axis) => Math.round(coordinate + (b[axis] - coordinate) * n / count));
        posts.set(point.join(','), {type: 'fence-post', x: point[0], y: point[1]});
        if (n) rails.push({type: 'fence-rail', a: last, b: point, y: Math.max(last[1], point[1]) - .5});
        last = point;
      }
    }
  }
  return [...rails, ...posts.values()];
}

function paintFence(ctx, piece) {
  if (piece.type === 'fence-post') {
    const {x, y} = piece;
    fill(ctx, '#48382655', x - 3, y - 1, 8, 3);
    fill(ctx, '#654326', x - 3, y - 17, 6, 17);
    fill(ctx, '#a26d43', x - 2, y - 15, 4, 14);
    fill(ctx, '#d09a61', x - 2, y - 16, 3, 4);
    fill(ctx, '#c18a56', x - 2, y - 11, 1, 9);
    return;
  }
  const {a, b} = piece;
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const steps = Math.max(Math.abs(dx), Math.abs(dy));
  for (const height of [13, 7]) {
    for (let i = 0; i <= steps; i++) {
      const x = Math.round(a[0] + dx * i / steps);
      const y = Math.round(a[1] + dy * i / steps) - height;
      fill(ctx, '#94613b', x, y, 2, 3);
      fill(ctx, '#c69660', x, y, 2, 1);
    }
  }
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
  const {home: [x, y]} = scene.blueprint;
  return [
    {type: 'hydrangea', x: x - 66, y: y + 6, scale: .75},
    {type: 'daisy', x: x - 74, y: y + 12, scale: .67},
    {type: 'verge', x: x - 50, y: y + 13, scale: .84, ground: false},
    {type: 'berry', x: x + 42, y: y + 7, scale: .73},
    {type: 'pebbles', x: x + 27, y: y + 13, ground: false},
  ];
}

export function drawStarCard(scene, art, createCanvas, {
  viewport = scene.viewport ?? {x: 0, y: 0, width: 640, height: 360},
  canvas = createCanvas(1280, 960),
} = {}) {
  const ctx = canvas.getContext('2d');
  ctx.setTransform(2, 0, 0, 2, 0, 0);
  ctx.imageSmoothingEnabled = false;
  fill(ctx, '#f7efd9', 0, 0, 640, 480);
  ctx.fillStyle = '#503824';
  ctx.font = 'bold 15px monospace';
  ctx.fillText(fitTitle(ctx, scene.snapshot.fullName, 580), 42, 23);
  ctx.font = '10px monospace';
  ctx.fillStyle = '#8c7251';
  ctx.fillText(scene.name.toUpperCase(), 42, 38);
  sprite(ctx, art, {type: 'sprout', x: 22, y: 29, scale: 1.4, ground: false});

  // Render the farm at its native pixel size, then double it as a single scene.
  const farm = createCanvas(640, 360);
  const sceneCtx = farm.getContext('2d');
  sceneCtx.imageSmoothingEnabled = false;
  paintStarGround(sceneCtx, scene, createCanvas);
  const objects = [...woodland(scene.blueprint), ...scene.objects, ...courtyard(scene), ...fencePieces(scene.fences ?? [])];
  objects.sort((a, b) => a.y - b.y);
  for (const object of objects) {
    if (object.type === 'fence-post' || object.type === 'fence-rail') paintFence(sceneCtx, object);
    else sprite(sceneCtx, art, object);
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
  const stamp = s.source === 'preview'
    ? 'MILESTONE PREVIEW  |  SPRING'
    : s.source === 'github'
    ? `${s.stale ? 'STALE' : 'UPDATED'}  |  ${s.fetchedAt.slice(0, 16).replace('T', ' ')} UTC  |  SPRING`
    : `DEMO DATA  |  ${s.fetchedAt}  |  SPRING`;
  ctx.fillText(stamp, 18, 469);
  return canvas;
}
