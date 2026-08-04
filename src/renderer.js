import { SEASON_THEMES, FARM_CONFIG, CROP_STAGES, LANGUAGE_TREES } from './themes/stardew.js';

const RAW_BASE = 'https://raw.githubusercontent.com/YeatsLiao/github-farm/main/assets';
const FARM_BG_URL = RAW_BASE + '/scenes/farm-bg.png';
const FARMER_URL = RAW_BASE + '/sprites/farmer.png';

function toAbs(rel, total) { return Math.round(rel * total); }

// Crop colors by growth stage
const CROP_COLORS = {
  0: '#3D2A32',  // empty soil (dark)
  1: '#5C4033',  // seed (slightly lighter)
  2: '#6B8C42',  // sprout (green)
  3: '#4A7C3F',  // growing (darker green)
  4: '#DAA520',  // harvest (golden)
};

export function renderScene(elements, width, height) {
  width = width || 800;
  height = height || 400;

  const month = new Date().getMonth();
  const seasonKey = month >= 2 && month <= 4 ? 'spring' : month >= 5 && month <= 7 ? 'summer' : month >= 8 && month <= 10 ? 'autumn' : 'winter';
  const theme = SEASON_THEMES[seasonKey] || SEASON_THEMES.spring;

  // Farm background area (lower 65% of canvas)
  const bgY = Math.round(height * 0.35);
  const bgH = height - bgY;

  let svg = '<?xml version="1.0" encoding="utf-8"?>\n';
  svg += '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '">\n';
  svg += '<defs>\n';
  svg += '<linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="' + theme.skyTop + '"/><stop offset="100%" stop-color="' + theme.skyBottom + '"/></linearGradient>\n';
  svg += '</defs>\n';

  // Sky background
  svg += '<rect width="' + width + '" height="' + bgY + '" fill="url(#skyGrad)"/>\n';

  // Farm background image (tiled to fill the ground area)
  svg += '<image href="' + FARM_BG_URL + '" x="0" y="' + bgY + '" width="' + width + '" height="' + bgH + '" preserveAspectRatio="xMidYMid slice"/>\n';

  // Crop grid - positioned in the farmland area
  // Grid: 8 columns x 4 rows, each cell 44x44px
  const cols = 8, rows = 4;
  const cellW = 44, cellH = 44;
  const gridW = cols * cellW;  // 352
  const gridH = rows * cellH;  // 176
  const gridX = Math.round((width - gridW) / 2);  // center horizontally
  const gridY = bgY + Math.round((bgH - gridH) / 2);  // center vertically in farm area

  // Collect crop elements and sort by position
  const crops = elements.filter(e => e.type === 'crop').sort((a, b) => {
    const rowA = Math.round(a.y * 100);
    const rowB = Math.round(b.y * 100);
    if (rowA !== rowB) return rowA - rowB;
    return a.x - b.x;
  });

  // Render crop grid
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      const crop = crops[idx];
      const px = gridX + c * cellW;
      const py = gridY + r * cellH;

      if (crop) {
        const level = crop.level || 0;
        const color = CROP_COLORS[level] || CROP_COLORS[0];

        // Soil base
        svg += '<rect x="' + (px + 2) + '" y="' + (py + 2) + '" width="' + (cellW - 4) + '" height="' + (cellH - 4) + '" fill="' + color + '" rx="3"/>\n';

        // Crop plant (simple shapes based on level)
        if (level >= 1) {
          const plantSize = 8 + level * 6;  // 14, 20, 26, 32
          const cx = px + cellW / 2;
          const cy = py + cellH / 2;

          if (level === 1) {
            // Seed - small dot
            svg += '<circle cx="' + cx + '" cy="' + cy + '" r="4" fill="#8B7355"/>\n';
          } else if (level === 2) {
            // Sprout - small green shoot
            svg += '<line x1="' + cx + '" y1="' + (cy + 8) + '" x2="' + cx + '" y2="' + (cy - 6) + '" stroke="#6B8C42" stroke-width="3" stroke-linecap="round"/>\n';
            svg += '<ellipse cx="' + (cx - 5) + '" cy="' + (cy - 2) + '" rx="5" ry="3" fill="#6B8C42"/>\n';
            svg += '<ellipse cx="' + (cx + 5) + '" cy="' + (cy - 4) + '" rx="5" ry="3" fill="#6B8C42"/>\n';
          } else if (level === 3) {
            // Growing - taller plant
            svg += '<line x1="' + cx + '" y1="' + (cy + 12) + '" x2="' + cx + '" y2="' + (cy - 10) + '" stroke="#4A7C3F" stroke-width="4" stroke-linecap="round"/>\n';
            svg += '<ellipse cx="' + (cx - 8) + '" cy="' + cy + '" rx="7" ry="4" fill="#4A7C3F"/>\n';
            svg += '<ellipse cx="' + (cx + 8) + '" cy="' + (cy - 4) + '" rx="7" ry="4" fill="#4A7C3F"/>\n';
            svg += '<ellipse cx="' + cx + '" cy="' + (cy - 10) + '" rx="6" ry="4" fill="#4A7C3F"/>\n';
          } else if (level >= 4) {
            // Harvest - full plant with fruit
            svg += '<line x1="' + cx + '" y1="' + (cy + 14) + '" x2="' + cx + '" y2="' + (cy - 12) + '" stroke="#4A7C3F" stroke-width="4" stroke-linecap="round"/>\n';
            svg += '<ellipse cx="' + (cx - 9) + '" cy="' + (cy + 2) + '" rx="8" ry="5" fill="#4A7C3F"/>\n';
            svg += '<ellipse cx="' + (cx + 9) + '" cy="' + (cy - 2) + '" rx="8" ry="5" fill="#4A7C3F"/>\n';
            svg += '<ellipse cx="' + cx + '" cy="' + (cy - 12) + '" rx="7" ry="5" fill="#4A7C3F"/>\n';
            // Golden fruit
            svg += '<circle cx="' + cx + '" cy="' + (cy - 14) + '" r="5" fill="#DAA520"/>\n';
            svg += '<circle cx="' + (cx - 7) + '" cy="' + cy + '" r="4" fill="#DAA520"/>\n';
            svg += '<circle cx="' + (cx + 7) + '" cy="' + (cy - 2) + '" r="4" fill="#DAA520"/>\n';
          }
        }
      } else {
        // Empty plot
        svg += '<rect x="' + (px + 2) + '" y="' + (py + 2) + '" width="' + (cellW - 4) + '" height="' + (cellH - 4) + '" fill="#3D2A32" rx="3" opacity="0.6"/>\n';
      }
    }
  }

  // Render other elements (trees, buildings, animals) as simple shapes
  for (const el of elements) {
    if (el.type === 'crop') continue;
    const px = toAbs(el.x, width);
    const py = toAbs(el.y, height);

    switch (el.type) {
      case 'tree': {
        const treeInfo = LANGUAGE_TREES[el.language] || LANGUAGE_TREES.default;
        const tw = 40, th = 60;
        // Trunk
        svg += '<rect x="' + (px - 6) + '" y="' + (py - th + 20) + '" width="12" height="' + (th - 20) + '" fill="#8B7355" rx="2"/>\n';
        // Canopy
        svg += '<ellipse cx="' + px + '" cy="' + (py - th + 10) + '" rx="' + (tw / 2) + '" ry="' + (th / 2 - 5) + '" fill="' + treeInfo.color + '" opacity="0.85"/>\n';
        break;
      }
      case 'building': {
        const bw = 50, bh = 50;
        const colors = { 'Red Barn': '#B07219', 'Wooden Fence': '#A0A078', 'Windmill': '#C0C7D2', 'Stone Well': '#A89989', 'Scarecrow': '#DAA520' };
        const color = colors[el.desc] || '#A0A078';
        svg += '<rect x="' + (px - bw / 2) + '" y="' + (py - bh / 2) + '" width="' + bw + '" height="' + bh + '" fill="' + color + '" rx="4" opacity="0.9"/>\n';
        svg += '<text x="' + px + '" y="' + py + '" font-size="9" fill="#FFF" text-anchor="middle" dominant-baseline="middle" font-family="monospace">' + el.desc + '</text>\n';
        break;
      }
      case 'animal': {
        const aw = 20, ah = 20;
        const colors = { 'chicken': '#FFDB04', 'cow': '#F5F5F5', 'cat': '#FF8C00', 'dog': '#D2691E' };
        const color = colors[el.animalType] || '#FFDB04';
        svg += '<ellipse cx="' + px + '" cy="' + py + '" rx="' + (aw / 2) + '" ry="' + (ah / 2) + '" fill="' + color + '"/>\n';
        svg += '<circle cx="' + (px + aw / 3) + '" cy="' + (py - ah / 4) + '" r="2" fill="#000"/>\n';
        break;
      }
      case 'decoration': {
        const colors = ['#FF69B4', '#FFB347', '#FF6969', '#DDA0DD'];
        const color = colors[el.index % colors.length] || '#FF69B4';
        const ds = 12;
        svg += '<circle cx="' + px + '" cy="' + py + '" r="' + (ds / 2) + '" fill="' + color + '" opacity="0.8"/>\n';
        svg += '<circle cx="' + px + '" cy="' + py + '" r="' + (ds / 4) + '" fill="#FFD700"/>\n';
        break;
      }
      case 'character': {
        const cw = 40, ch = 60;
        // Simple farmer shape
        svg += '<rect x="' + (px - 8) + '" y="' + (py - ch + 20) + '" width="16" height="' + (ch - 20) + '" fill="#4169E1" rx="3"/>\n';
        svg += '<circle cx="' + px + '" cy="' + (py - ch + 10) + '" r="10" fill="#FFD700"/>\n';
        svg += '<rect x="' + (px - 14) + '" y="' + (py - ch + 2) + '" width="28" height="6" fill="#DAA520" rx="2"/>\n';
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