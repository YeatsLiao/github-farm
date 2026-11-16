/** Review six early Star milestones with the existing farm renderer and sprites. */
import { createCanvas, loadImage } from 'canvas';
import { mkdir, writeFile } from 'node:fs/promises';
import { renderStarCard } from '../../src/render/star-card.js';

const output = new URL('../../dist/star-farm-small-preview/', import.meta.url);
await mkdir(output, {recursive: true});

const firstBed = {id: 'bed-0', x: 128, y: 207, w: 94, h: 44};
const secondBed = {id: 'bed-1', x: 319, y: 270, w: 101, h: 41};
const blueprint = {
  seed: 471812,
  home: [150, 143], well: [211, 200], pond: [328, 197, 53, 31],
  livestock: [421, 140], windmill: [558, 222], gate: [243, 356],
  reserved: [
    {x: 66, y: 27, w: 115, h: 116},
    {x: 80, y: 183, w: 96, h: 45},
    {x: 195, y: 160, w: 32, h: 40},
    {x: 270, y: 162, w: 116, h: 70},
    {x: 380, y: 55, w: 84, h: 85},
    {x: 267, y: 248, w: 104, h: 43},
  ],
  routes: [
    {id: 'home', points: [[150, 160], [186, 155], [230, 159], [246, 178], [248, 216], [243, 248], [243, 350]]},
    {id: 'well', points: [[221, 212], [234, 216], [248, 216]]},
    {id: 'bed-0', points: [[183, 219], [197, 225], [228, 223], [248, 216]]},
    {id: 'pond', points: [[264, 214], [248, 216]]},
    {id: 'livestock', points: [[421, 155], [393, 154], [359, 146], [303, 147], [246, 178]]},
    {id: 'bed-1', points: [[260, 267], [243, 248]]},
  ],
};

const milestones = [0, 1, 5, 10, 25, 50, 100, 200, 300, 400];
const samples = [
  {stars: 0, description: 'Cottage, mixed garden, well and pond', view: [39, 24, 392]},
  {stars: 5, description: 'Carrots fill out and flowers bloom', view: [39, 24, 392]},
  {stars: 25, description: 'Coop and fenced yard by the orchard', view: [28, 18, 474]},
  {stars: 50, description: 'First hens and a pumpkin harvest', view: [28, 18, 474]},
  {stars: 100, description: 'Cottage porch and a feed station', view: [28, 18, 474]},
  {stars: 300, description: 'Second plot and a new fruit tree', view: [23, 11, 550]},
];

function sceneAt(stars) {
  const objects = [];
  const add = (id, type, x, y, extra = {}) => objects.push({id, type, x, y, ...extra});
  add('home', stars >= 100 ? 'cottage-2' : 'cottage-1', ...blueprint.home);
  add('well', 'well', ...blueprint.well);
  add('farmer', 'farmer', 171, 189);
  add('cat', 'cat', 104, 155);
  add('log-yard', 'barrel', 77, 148, {scale: .85});
  add('garden-crate', 'crate', 69, 200, {scale: .72});
  add('garden-flowers', 'daisy', 83, 233, {scale: .75});
  add('water-bench', 'bench', 295, 155, {scale: .72});
  add('orchard', stars >= 10 ? 'apple' : 'oak', 331, 132, {scale: .92});
  add('orchard-flowers', 'daisy', 358, 135, {scale: stars >= 5 ? .82 : .54});
  add('orchard-fern', 'fern', 309, 133, {scale: .72});
  add('bank-reeds-west', 'reeds', 282, 214, {scale: .75});
  add('bank-reeds-east', 'reeds', 370, 202, {scale: .8});
  add('pond-lily', 'waterlily', 339, 183, {ground: false});
  add('front-tree', 'oak', 35, 266, {scale: 1.08, ground: false});
  add('east-woodland', 'pine', 505, 309, {scale: 1.23, ground: false});
  add('east-woodland-fern', 'fern', 467, 281, {scale: .95});
  add('front-rock', 'rock', 404, 244, {scale: .85});
  add('front-shrub', 'berry', 382, 235, {scale: .85});
  add('bank-daisies', 'daisy', 386, 220, {scale: .73});
  for (let column = 0; column < 4; column++) {
    const x = firstBed.x - 31 + column * 20;
    add(`tomato-${column}`, 'tomato', x, firstBed.y - 3, {scale: .86});
    const crop = stars >= 50 && column > 1 ? 'pumpkin' : stars >= 5 || column < 2 ? 'carrot' : 'sprout';
    add(`garden-row-${column}`, crop, x, firstBed.y + 17, {scale: .85});
  }
  if (stars >= 5) add('orchard-blossoms', 'hydrangea', 348, 139, {scale: .62});
  if (stars >= 25) {
    add('livestock', 'coop', ...blueprint.livestock);
    add('fence-left', 'fence', 389, 187, {scale: .84});
    add('fence-right', 'fence', 452, 187, {scale: .84});
    add('feed-bucket', 'barrel', 457, 152, {scale: .73});
  }
  if (stars >= 50) {
    add('chicken-left', 'chicken', 403, 165, {scale: .88});
    add('chicken-right', 'chicken', 439, 175, {scale: .83});
  }
  if (stars >= 100) add('feed-crate', 'crate', 449, 161, {scale: .81});
  if (stars >= 200) {
    for (let column = 0; column < 4; column++) {
      add(`wheat-${column}`, 'wheat', secondBed.x - 33 + column * 22, secondBed.y - 1, {scale: .86});
      add(`late-sprout-${column}`, 'sprout', secondBed.x - 33 + column * 22, secondBed.y + 15, {scale: .8});
    }
    add('new-orchard', stars >= 300 ? 'orange' : 'oak', 488, 186, {scale: stars >= 300 ? .87 : .63});
  }
  return {
    blueprint, objects,
    beds: stars >= 200 ? [firstBed, secondBed] : [firstBed],
    livestock: stars >= 25, pen: stars >= 25, millYard: false,
    stage: {number: milestones.indexOf(stars) + 1, total: 56, next: milestones[milestones.indexOf(stars) + 1]},
    snapshot: {fullName: 'YeatsLiao/github-farm', stars, newStars7d: null, fetchedAt: 'LOW-STAR STUDY'},
  };
}

const tileWidth = 540, tileHeight = 304, gap = 16, labelHeight = 70, top = 70;
const board = createCanvas(tileWidth * 3 + gap * 4, top + (tileHeight + labelHeight + gap) * 2);
const ctx = board.getContext('2d');
ctx.fillStyle = '#efe5cd';
ctx.fillRect(0, 0, board.width, board.height);
ctx.fillStyle = '#513824';
ctx.font = 'bold 25px monospace';
ctx.fillText('GITHUB FARM / EARLY GROWTH', gap + 6, 44);
ctx.imageSmoothingEnabled = false;
for (const [index, {stars, description, view}] of samples.entries()) {
  const [x, y, width] = view;
  const png = await renderStarCard(sceneAt(stars), {viewport: {x, y, width, height: width * 9 / 16}});
  await writeFile(new URL(`stars-${String(stars).padStart(3, '0')}.png`, output), png);
  const image = await loadImage(png);
  const left = gap + (index % 3) * (tileWidth + gap);
  const row = top + Math.floor(index / 3) * (tileHeight + labelHeight + gap);
  ctx.drawImage(image, 0, 96, 1280, 720, left, row, tileWidth, tileHeight);
  ctx.fillStyle = '#f8efdb';
  ctx.fillRect(left, row + tileHeight, tileWidth, labelHeight);
  ctx.fillStyle = '#513824';
  ctx.font = 'bold 22px monospace';
  ctx.fillText(`${stars} STARS`, left + 14, row + tileHeight + 29);
  ctx.font = '15px monospace';
  ctx.fillText(description, left + 14, row + tileHeight + 53);
}
await writeFile(new URL('six-stage-comparison.png', output), board.toBuffer('image/png'));
console.log('Rendered six low-Star samples to dist/star-farm-small-preview/');
