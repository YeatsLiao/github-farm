import { createCanvas, loadImage } from 'canvas';
import { readFile } from 'node:fs/promises';
import { drawStarCard } from './draw-card.js';

let artPromise;
function assets() {
  return artPromise ??= (async () => ({
    atlas: await loadImage(await readFile(new URL('../../assets/runtime/spring-atlas.png', import.meta.url))),
    manifest: JSON.parse(await readFile(new URL('../../assets/runtime/spring-manifest.json', import.meta.url), 'utf8')),
  }))();
}

export async function renderStarCard(scene, options) {
  const canvas = drawStarCard(scene, await assets(), createCanvas, options);
  return canvas.toBuffer('image/png');
}

export async function renderFarmIcon() {
  const {atlas, manifest} = await assets();
  const [x, y, width, height] = manifest.sprites.sprout.rect;
  const size = 32;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#3d522d';
  ctx.fillRect(0, 4, 32, 24);
  ctx.fillRect(4, 0, 24, 32);
  ctx.fillStyle = '#f7efd9';
  ctx.fillRect(2, 5, 28, 22);
  ctx.fillRect(5, 2, 22, 28);
  const drawWidth = width * 2;
  const drawHeight = height * 2;
  ctx.drawImage(atlas, x, y, width, height,
    Math.floor((size - drawWidth) / 2), Math.floor((size - drawHeight) / 2), drawWidth, drawHeight);
  return canvas.toBuffer('image/png');
}

export function renderStarError(message) {
  const canvas = createCanvas(640, 160);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f7efd9';
  ctx.fillRect(0, 0, 640, 160);
  ctx.fillStyle = '#ba9c68';
  ctx.fillRect(0, 0, 640, 4);
  ctx.fillStyle = '#503824';
  ctx.font = 'bold 24px monospace';
  ctx.fillText('GitHub Farm', 28, 64);
  ctx.font = '16px monospace';
  ctx.fillText(message, 28, 105);
  return canvas.toBuffer('image/png');
}
