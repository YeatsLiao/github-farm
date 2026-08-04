import { SEASON_THEMES, FARM_CONFIG, CROP_STAGES, LANGUAGE_TREES } from './themes/stardew.js';

const RAW_BASE = 'https://raw.githubusercontent.com/YeatsLiao/github-farm/main/assets';
const SPRITE_DIR = RAW_BASE + '/sprites/individual';
const FARMER_URL = RAW_BASE + '/sprites/farmer.png';

function spriteUrl(name) {
  return SPRITE_DIR + '/' + name + '.png';
}

function toAbs(rel, total) { return Math.round(rel * total); }

function imgTag(url, x, y, w, h, aspect) {
  return '<image href="' + url + '" x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" preserveAspectRatio="' + (aspect || 'none') + '"/>';
}

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
        if (stage.sprite !== 'soil-empty') {
          svg += imgTag(spriteUrl(stage.sprite), px, py, cw, ch) + '\n';
        }
        break;
      }
      case 'tree': {
        const treeInfo = LANGUAGE_TREES[el.language] || LANGUAGE_TREES.default;
        const sprite = treeInfo.name;
        const tw = el.width || 64;
        const th = el.height || 96;
        svg += imgTag(spriteUrl(sprite), px - tw / 2, py - th, tw, th, 'xMidYMax meet') + '\n';
        break;
      }
      case 'building': {
        const labelMap = { 'Red Barn': 'barn', 'Wooden Fence': 'fence', 'Windmill': 'windmill', 'Stone Well': 'well', 'Scarecrow': 'scarecrow' };
        const sprite = labelMap[el.desc];
        if (sprite) {
          const bw = el.width || 80;
          const bh = el.height || 80;
          svg += imgTag(spriteUrl(sprite), px - bw / 2, py - bh / 2, bw, bh, 'xMidYMid meet') + '\n';
        }
        break;
      }
      case 'animal': {
        const sprite = el.animalType || 'chicken';
        const aw = el.width || 48;
        const ah = el.height || 48;
        svg += imgTag(spriteUrl(sprite), px - aw / 2, py - ah / 2, aw, ah, 'xMidYMid meet') + '\n';
        break;
      }
      case 'decoration': {
        const decorMap = { 'flower': 'sunflower', 'pumpkin': 'pumpkin', 'carrot': 'carrot', 'tomato': 'tomato' };
        const sprite = decorMap[el.decorationType] || 'sunflower';
        const ds = el.width || 32;
        svg += imgTag(spriteUrl(sprite), px - ds / 2, py - ds / 2, ds, ds, 'xMidYMid meet') + '\n';
        break;
      }
      case 'character': {
        const cw = el.width || 64;
        const ch = el.height || 96;
        svg += imgTag(FARMER_URL, px - cw / 2, py - ch, cw, ch, 'xMidYMax meet') + '\n';
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