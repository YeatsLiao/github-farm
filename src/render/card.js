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
