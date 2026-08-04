import { SEASON_THEMES, FARM_CONFIG, CROP_STAGES, LANGUAGE_TREES } from './themes/stardew.js';

const RAW_BASE = 'https://raw.githubusercontent.com/YeatsLiao/github-farm/main/assets';
const SPRITESHEET_URL = RAW_BASE + '/sprites/farm-spritesheet.png';
const FARMER_URL = RAW_BASE + '/sprites/farmer.png';

const SS_W = 1024, SS_H = 768;
const COLS = 7, ROWS = 5;
const CELL_W = Math.floor(SS_W / COLS);
const CELL_H = Math.floor(SS_H / ROWS);

const SPRITE_MAP = {
  'crop-seed':     { row: 0, col: 0 },
  'crop-sprout':   { row: 0, col: 1 },
  'crop-growing':  { row: 0, col: 2 },
  'crop-harvest':  { row: 0, col: 3 },
  'barn':          { row: 1, col: 0 },
  'fence':         { row: 1, col: 1 },
  'windmill':      { row: 1, col: 2 },
  'well':          { row: 1, col: 3 },
  'oak-tree':      { row: 2, col: 0 },
  'willow-tree':   { row: 2, col: 1 },
  'maple-tree':    { row: 2, col: 2 },
  'pine-tree':     { row: 2, col: 3 },
  'chicken':       { row: 3, col: 0 },
  'cow':           { row: 3, col: 1 },
  'cat':           { row: 3, col: 2 },
  'dog':           { row: 3, col: 3 },
  'sunflower':     { row: 4, col: 0 },
  'pumpkin':       { row: 4, col: 1 },
  'carrot':        { row: 4, col: 2 },
  'tomato':        { row: 4, col: 3 },
  'watering-can':  { row: 4, col: 4 },
  'scarecrow':     { row: 4, col: 5 },
};

function getClipId(name) { return 'clip-' + name; }

function renderClipDefs() {
  let defs = '';
  for (const [name, pos] of Object.entries(SPRITE_MAP)) {
    const x = pos.col * CELL_W;
    const y = pos.row * CELL_H;
    defs += '<clipPath id="' + getClipId(name) + '"><rect x="' + x + '" y="' + y + '" width="' + CELL_W + '" height="' + CELL_H + '"/></clipPath>\n';
  }
  return defs;
}

function spriteImg(name, px, py, pw, ph) {
  return '<image href="' + SPRITESHEET_URL + '" x="' + px + '" y="' + py + '" width="' + pw + '" height="' + ph + '" preserveAspectRatio="none" clip-path="url(#' + getClipId(name) + ')"/>';
}

function toAbs(rel, total) { return Math.round(rel * total); }

export function renderScene(elements, width, height) {
  width = width || 800;
  height = height || 400;
  const month = new Date().getMonth();
  const seasonKey = month >= 2 && month <= 4 ? 'spring' : month >= 5 && month <= 7 ? 'summer' : month >= 8 && month <= 10 ? 'autumn' : 'winter';
  const theme = SEASON_THEMES[seasonKey] || SEASON_THEMES.spring;
  const fenceY = Math.round(height * FARM_CONFIG.fenceLine);

  let svg = '<?xml version="1.0" encoding="utf-8"?>\n';
  svg += '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '">\n';
  svg += '<defs>\n';
  svg += '<linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="' + theme.skyTop + '"/><stop offset="100%" stop-color="' + theme.skyBottom + '"/></linearGradient>\n';
  svg += renderClipDefs();
  svg += '</defs>\n';
  svg += '<rect width="' + width + '" height="' + height + '" fill="url(#skyGrad)"/>\n';
  svg += '<rect y="' + fenceY + '" width="' + width + '" height="' + (height - fenceY) + '" fill="' + theme.grass + '"/>\n';

  for (const el of elements) {
    const px = toAbs(el.x, width);
    const py = toAbs(el.y, height);
    switch (el.type) {
      case 'crop': {
        const stage = CROP_STAGES[el.level] || CROP_STAGES[0];
        const soilColor = el.level === 0 ? '#3D2A32' : '#4A3018';
        const cw = el.width || 40;
        const ch = el.height || 40;
        svg += '<rect x="' + px + '" y="' + py + '" width="' + cw + '" height="' + ch + '" fill="' + soilColor + '" rx="2"/>\n';
        if (stage.sprite !== 'soil-empty' && SPRITE_MAP[stage.sprite]) {
          svg += spriteImg(stage.sprite, px, py, cw, ch) + '\n';
        }
        break;
      }
      case 'tree': {
        const treeInfo = LANGUAGE_TREES[el.language] || LANGUAGE_TREES.default;
        const sprite = treeInfo.name;
        if (SPRITE_MAP[sprite]) {
          const tw = el.width || 64;
          const th = el.height || 96;
          svg += spriteImg(sprite, px - tw / 2, py - th, tw, th) + '\n';
        }
        break;
      }
      case 'building': {
        const labelMap = { 'Red Barn': 'barn', 'Wooden Fence': 'fence', 'Windmill': 'windmill', 'Stone Well': 'well', 'Scarecrow': 'scarecrow' };
        const sprite = labelMap[el.desc];
        if (sprite && SPRITE_MAP[sprite]) {
          const bw = el.width || 80;
          const bh = el.height || 80;
          svg += spriteImg(sprite, px - bw / 2, py - bh / 2, bw, bh) + '\n';
        }
        break;
      }
      case 'animal': {
        const animals = ['chicken', 'cow', 'cat', 'dog'];
        const animalTypes = ["chicken","cow","cat","dog"]; const sprite = el.animalType && animalTypes.includes(el.animalType) ? el.animalType : animalTypes[0];
        if (SPRITE_MAP[sprite]) {
          const aw = el.width || 48;
          const ah = el.height || 48;
          svg += spriteImg(sprite, px - aw / 2, py - ah / 2, aw, ah) + '\n';
        }
        break;
      }
      case 'decoration': {
        const decors = ['sunflower', 'pumpkin', 'carrot', 'tomato'];
        const decorTypes = ["sunflower","pumpkin","carrot","tomato"]; const sprite = el.decorationType === "flower" ? decorTypes[Math.floor(Math.random() * decorTypes.length)] : (decorTypes.includes(el.decorationType) ? el.decorationType : decorTypes[0]);
        if (SPRITE_MAP[sprite]) {
          const ds = el.width || 32;
          svg += spriteImg(sprite, px - ds / 2, py - ds / 2, ds, ds) + '\n';
        }
        break;
      }
      case 'character': {
        const cw = el.width || 64;
        const ch = el.height || 96;
        svg += '<image href="' + FARMER_URL + '" x="' + (px - cw / 2) + '" y="' + (py - ch) + '" width="' + cw + '" height="' + ch + '" preserveAspectRatio="xMidYMax meet"/>\n';
        break;
      }
    }
  }
  svg += '</svg>';
  return svg;
}

export function getSeason() {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'autumn';
  return 'winter';
}