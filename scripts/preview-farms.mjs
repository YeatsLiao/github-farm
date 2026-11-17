/** Compare three starter-farm compositions using the shared renderer and atlas. */
import { createCanvas, loadImage } from 'canvas';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { renderStarCard } from '../src/render/card.js';
import { starterThemes as themes, workyardViewport } from '../src/farm/layouts.js';
import { createStarterScene } from '../src/farm/scene.js';
import { seedOf } from '../src/farm/seed.js';

const output = new URL('../dist/star-farm-theme-preview/', import.meta.url);
const orchardViewport = {x: 35, y: 45, width: 560, height: 315};

function sampleRepository(theme, index) {
  if (theme.slug === 'creek-orchard') return {repositoryId: '18221276', fullName: 'octocat/git-consortium'};
  let fixture = 0;
  while (seedOf(`starter-1:demo-${fixture}`) % themes.length !== index) fixture++;
  return {repositoryId: `demo-${fixture}`, fullName: `example/${theme.slug}`};
}

async function orchardCard(stars) {
  const scene = createStarterScene({
    repositoryId: '18221276', fullName: 'octocat/git-consortium', stars, newStars7d: null, source: 'preview',
  });
  return loadImage(await renderStarCard(scene, {viewport: orchardViewport}));
}

export async function renderOrchardComparison() {
  const stages = [0, 25, 100, 300];
  const captions = ['Ladder & empty crate', 'Sorting table & fruit crate', 'Jam shed', 'Dock and new trees'];
  const width = 448, height = 252, gap = 16, top = 58, label = 40;
  const comparison = createCanvas(2 * width + 3 * gap, top + 2 * (height + label + gap));
  const ctx = comparison.getContext('2d');
  ctx.fillStyle = '#f2e6cb';
  ctx.fillRect(0, 0, comparison.width, comparison.height);
  ctx.fillStyle = '#503824';
  ctx.font = 'bold 22px monospace';
  ctx.fillText('CREEKSIDE ORCHARD / FOUR GROWTH STAGES', gap + 4, 36);
  ctx.imageSmoothingEnabled = false;
  for (const [index, stars] of stages.entries()) {
    const tile = await orchardCard(stars);
    const x = gap + index % 2 * (width + gap);
    const y = top + Math.floor(index / 2) * (height + label + gap);
    ctx.drawImage(tile, 0, 96, 1280, 720, x, y, width, height);
    ctx.fillStyle = '#fff5df';
    ctx.fillRect(x, y + height, width, label);
    ctx.fillStyle = '#503824';
    ctx.font = 'bold 16px monospace';
    ctx.fillText(`${stars} STARS  /  ${captions[index]}`, x + 12, y + height + 25);
  }
  return comparison.toBuffer('image/png');
}

export async function renderOrchardDetails() {
  const card = await orchardCard(300);
  const crops = [
    ['Shallows & dock', 106, 195, 71, 60],
    ['Sorting platform', 173, 186, 99, 60],
    ['Garden entrance & fence corners', 282, 221, 158, 75],
  ];
  const gap = 12, width = 350, height = 198, top = 57, label = 36;
  const board = createCanvas(crops.length * (width + gap) + gap, top + height + label + gap);
  const ctx = board.getContext('2d');
  ctx.fillStyle = '#f2e6cb';
  ctx.fillRect(0, 0, board.width, board.height);
  ctx.fillStyle = '#503824';
  ctx.font = 'bold 20px monospace';
  ctx.fillText('CREEKSIDE ORCHARD / 300 STARS / EDGE DETAILS', gap + 2, 35);
  ctx.imageSmoothingEnabled = false;
  for (const [index, [name, x, y, w, h]] of crops.entries()) {
    const left = gap + index * (width + gap);
    const tileW = Math.min(width, Math.round(height * w / h));
    const tileH = Math.round(tileW * h / w);
    ctx.fillStyle = '#e5d8b9';
    ctx.fillRect(left, top, width, height);
    ctx.drawImage(card, (x - orchardViewport.x) * 1280 / orchardViewport.width,
      96 + (y - orchardViewport.y) * 720 / orchardViewport.height,
      w * 1280 / orchardViewport.width, h * 720 / orchardViewport.height,
      left + Math.floor((width - tileW) / 2), top + Math.floor((height - tileH) / 2), tileW, tileH);
    ctx.fillStyle = '#fff5df';
    ctx.fillRect(left, top + height, width, label);
    ctx.fillStyle = '#503824';
    ctx.font = '15px monospace';
    ctx.fillText(name, left + gap, top + height + 23);
  }
  return board.toBuffer('image/png');
}

export async function renderMaterialComparison() {
  return renderThemeComparison([0, 25, 100], 'FARM WORKSHOPS / THE FIRST 100 STARS');
}

export async function renderExpansionComparison() {
  const viewport = {x: 41, y: 39, width: 544, height: 306};
  return renderThemeComparison([100, 200, 300], 'FARM EXPANSIONS / 100 TO 300 STARS', viewport);
}

export async function renderMidgameComparison() {
  return renderThemeComparison([300, 400, 500, 600, 700, 800, 900, 1000], 'FARM WORKYARDS / 300 TO 1,000 STARS',
    workyardViewport);
}

async function renderStarterThumbnails() {
  const stages = [0, 5, 25, 100, 300], width = 320, height = 240;
  const board = createCanvas(width * themes.length, height * stages.length);
  const ctx = board.getContext('2d');
  for (const [column, theme] of themes.entries()) {
    const repository = sampleRepository(theme, column);
    for (const [row, stars] of stages.entries()) {
      const scene = createStarterScene({...repository, stars, newStars7d: null, source: 'preview'});
      const img = await loadImage(await renderStarCard(scene));
      ctx.drawImage(img, column * width, row * height, width, height);
    }
  }
  return board.toBuffer('image/png');
}

async function renderThemeComparison(stages, title, viewport) {
  const width = 416, height = 234, gap = 14, top = 58, label = 34;
  const board = createCanvas(themes.length * (width + gap) + gap, top + stages.length * (height + label + gap));
  const ctx = board.getContext('2d');
  ctx.fillStyle = '#f2e6cb';
  ctx.fillRect(0, 0, board.width, board.height);
  ctx.fillStyle = '#503824';
  ctx.font = 'bold 22px monospace';
  ctx.fillText(title, gap + 4, 35);
  ctx.imageSmoothingEnabled = false;

  for (const [column, theme] of themes.entries()) {
    const repository = sampleRepository(theme, column);
    const x = gap + column * (width + gap);
    for (const [row, stars] of stages.entries()) {
      const scene = createStarterScene({...repository, stars, newStars7d: null, source: 'preview'});
      const img = await loadImage(await renderStarCard(scene, {viewport}));
      const y = top + row * (height + label + gap);
      ctx.drawImage(img, 0, 96, 1280, 720, x, y, width, height);
      ctx.fillStyle = '#fff5df';
      ctx.fillRect(x, y + height, width, label);
      ctx.fillStyle = '#503824';
      ctx.font = 'bold 14px monospace';
      ctx.fillText(`${theme.title} / ${stars} STARS`, x + 9, y + height + 22);
    }
  }
  return board.toBuffer('image/png');
}

async function renderPreviews() {
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
    const snapshot = {...sampleRepository(theme, i), stars: 0, newStars7d: null, fetchedAt: 'STARTER PREVIEW'};
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
  await writeFile(new URL('orchard-growth.png', output), await renderOrchardComparison());
  await writeFile(new URL('farm-materials.png', output), await renderMaterialComparison());
  await writeFile(new URL('farm-expansions.png', output), await renderExpansionComparison());
  await writeFile(new URL('farm-workyards.png', output), await renderMidgameComparison());
  await writeFile(new URL('starter-thumbnails.png', output), await renderStarterThumbnails());
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await renderPreviews();
