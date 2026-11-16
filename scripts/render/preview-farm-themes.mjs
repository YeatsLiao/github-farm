/** Compare three starter-farm compositions using the shared renderer and atlas. */
import { createCanvas, loadImage } from 'canvas';
import { mkdir, writeFile } from 'node:fs/promises';
import { renderStarCard } from '../../src/render/star-card.js';
import { starterThemes as themes } from '../../config/layouts/spring/starter-themes.js';
import { createStarterScene } from '../../src/farm/starter-scene.js';
import { seedOf } from '../../src/farm/seed.js';

const output = new URL('../../dist/star-farm-theme-preview/', import.meta.url);
await mkdir(output, {recursive: true});

const tileWidth = 592, tileHeight = 333, gap = 16, top = 66, labels = 69;
const board = createCanvas(tileWidth * themes.length + gap * (themes.length + 1), top + tileHeight + labels + gap);
const ctx = board.getContext('2d');
ctx.fillStyle = '#efe5cd';
ctx.fillRect(0, 0, board.width, board.height);
ctx.fillStyle = '#513824';
ctx.font = 'bold 25px monospace';
ctx.fillText('GITHUB FARM / THREE STARTER FARMS / 0 STARS', gap + 6, 42);
ctx.imageSmoothingEnabled = false;

const growthStages = [0, 300, 5000];
const growthBoard = createCanvas(board.width, top + (tileHeight + labels + gap) * growthStages.length);
const growthCtx = growthBoard.getContext('2d');
growthCtx.fillStyle = '#efe5cd';
growthCtx.fillRect(0, 0, growthBoard.width, growthBoard.height);
growthCtx.fillStyle = '#513824';
growthCtx.font = 'bold 25px monospace';
growthCtx.fillText('GITHUB FARM / FROM STARTER YARD TO WINDMILL', gap + 6, 42);
growthCtx.imageSmoothingEnabled = false;

for (const [i, theme] of themes.entries()) {
  let fixture = 0;
  while (seedOf(`starter-1:demo-${fixture}`) % themes.length !== i) fixture++;
  const snapshot = {repositoryId: `demo-${fixture}`, fullName: `example/${theme.slug}`, stars: 0, newStars7d: null, fetchedAt: 'STARTER PREVIEW'};
  const left = gap + i * (tileWidth + gap);
  const card = await renderStarCard(createStarterScene(snapshot));
  await writeFile(new URL(`${theme.slug}.png`, output), card);
  const initial = await loadImage(card);
  ctx.drawImage(initial, 0, 96, 1280, 720, left, top, tileWidth, tileHeight);
  ctx.fillStyle = '#f8efdb';
  ctx.fillRect(left, top + tileHeight, tileWidth, labels);
  ctx.fillStyle = '#513824';
  ctx.font = 'bold 21px monospace';
  ctx.fillText(theme.title, left + 14, top + tileHeight + 27);
  ctx.font = '16px monospace';
  ctx.fillText(theme.note, left + 14, top + tileHeight + 52);
  for (const [row, stars] of growthStages.entries()) {
    let img = initial;
    if (stars) {
      const stageCard = await renderStarCard(createStarterScene({...snapshot, stars}));
      await writeFile(new URL(`${theme.slug}-${stars}.png`, output), stageCard);
      img = await loadImage(stageCard);
    }
    const y = top + row * (tileHeight + labels + gap);
    growthCtx.drawImage(img, 0, 96, 1280, 720, left, y, tileWidth, tileHeight);
    growthCtx.fillStyle = '#f8efdb';
    growthCtx.fillRect(left, y + tileHeight, tileWidth, labels);
    growthCtx.fillStyle = '#513824';
    growthCtx.font = 'bold 20px monospace';
    growthCtx.fillText(`${theme.title}  /  ${stars.toLocaleString('en-US')} STARS`, left + 14, y + tileHeight + 39);
  }
}
await writeFile(new URL('three-starter-farms.png', output), board.toBuffer('image/png'));
await writeFile(new URL('farm-growth-comparison.png', output), growthBoard.toBuffer('image/png'));
console.log('Rendered three starter farms and expansion comparisons to dist/star-farm-theme-preview/');
