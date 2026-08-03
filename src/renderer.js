/**
 * renderer.js - SVG 场景渲染引擎
 *
 * 将场景元素数组渲染为完整的 SVG 图片
 */

import { SEASON_THEMES, FARM_CONFIG, PALETTE } from './themes/stardew.js';

/**
 * 渲染完整场景
 * @param {Array} elements - 场景元素数组
 * @param {Number} width - SVG 宽度
 * @param {Number} height - SVG 高度
 * @returns {string} SVG 字符串
 */
export function renderScene(elements, width = 800, height = 400) {
  const season = getSeason();
  const theme = SEASON_THEMES[season] || SEASON_THEMES.spring;

  let svg = `<?xml version="1.0" encoding="utf-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     width="${width}" height="${height}"
     viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${theme.skyTop}"/>
      <stop offset="100%" stop-color="${theme.skyBottom}"/>
    </linearGradient>
  </defs>

  <!-- 背景 (天空) -->
  <rect width="${width}" height="${height}" fill="url(#skyGrad)"/>

  <!-- 地面草地 -->
  <rect y="${height * FARM_CONFIG.fenceLine}" width="${width}" height="${height * (1 - FARM_CONFIG.fenceLine)}" fill="${theme.grass}"/>

  <!-- 元素层 (按类型分层渲染) -->
`;

  // 作物
  for (const el of elements) {
    if (el.type === 'crop') {
      svg += renderCrop(el, width, height);
    }
  }

  // 树木
  for (const el of elements) {
    if (el.type === 'tree') {
      svg += renderTree(el, width, height);
    }
  }

  // 建筑
  for (const el of elements) {
    if (el.type === 'building') {
      svg += renderBuilding(el, width, height);
    }
  }

  // 动物
  for (const el of elements) {
    if (el.type === 'animal') {
      svg += renderAnimal(el, width, height);
    }
  }

  // 装饰
  for (const el of elements) {
    if (el.type === 'decoration') {
      svg += renderDecoration(el, width, height);
    }
  }

  // 角色
  for (const el of elements) {
    if (el.type === 'character') {
      svg += renderCharacter(el, width, height);
    }
  }

  svg += '</svg>';
  return svg;
}

/**
 * 渲染作物
 */
export function renderCrop(el, width, height) {
  const x = el.x * width;
  const y = el.y * height;
  const w = el.width;
  const h = el.height;

  if (el.level === 0) {
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${PALETTE.soilEmpty}" rx="2"/>`;
  }

  const colors = ['#8B6914', '#6B4423', '#4A7C3F', '#FFD700', '#FF6347'];
  const color = colors[el.level - 1] || '#4A7C3F';

  return `
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${PALETTE.soilWatered}" rx="2"/>
    <ellipse cx="${x + w/2}" cy="${y + h - 4}" rx="${w/3}" ry="${h/3}" fill="${color}"/>
    <ellipse cx="${x + w/2}" cy="${y + h - 8}" rx="${w/4}" ry="${h/4}" fill="${color}" opacity="0.8"/>
  `;
}

/**
 * 渲染树木
 */
export function renderTree(el, width, height) {
  const x = el.x * width;
  const y = el.y * height;
  const w = el.width;
  const h = el.height;

  return `
    <rect x="${x + w/3}" y="${y + h - 8}" width="${w/3}" height="8" fill="#8B7355"/>
    <ellipse cx="${x + w/2}" cy="${y + h/2}" rx="${w/2}" ry="${h/2}" fill="${el.color}" opacity="0.8"/>
    <ellipse cx="${x + w/2}" cy="${y + h/2}" rx="${w/3}" ry="${h/3}" fill="${el.color}"/>
    <circle cx="${x + w/2}" cy="${y + h/3}" r="${w/6}" fill="#FFD700" opacity="0.6"/>
    <circle cx="${x + w/2}" cy="${y + h/3}" r="${w/8}" fill="#FFD700"/>
  `;
}

/**
 * 渲染建筑
 */
export function renderBuilding(el, width, height) {
  const x = el.x * width;
  const y = el.y * height;
  const w = el.width;
  const h = el.height;

  const colors = {
    fence: '#A0A078',
    well: '#A89989',
    barn: '#B07219',
    scarecrow: '#FFD700',
    windmill: '#C0C7D2',
  };
  const color = colors[el.buildingType] || '#A0B0C8';

  return `
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}" opacity="0.9" rx="4"/>
    <rect x="${x + 4}" y="${y + 4}" width="${w - 8}" height="${h - 8}" fill="#FFFFFF" opacity="0.2" rx="2"/>
    <text x="${x + w/2}" y="${y + h/2}" font-size="10" fill="#FFFFFF" text-anchor="middle" dominant-baseline="middle">${el.desc}</text>
  `;
}

/**
 * 渲染动物
 */
export function renderAnimal(el, width, height) {
  const x = el.x * width;
  const y = el.y * height;
  const w = el.width;
  const h = el.height;

  const colors = {
    chicken: '#FFDB04',
    cow: '#F5F5F5',
    cat: '#FF8300',
    dog: '#8B4513',
  };
  const color = colors[el.animalType] || '#FFDB04';

  return `
    <ellipse cx="${x + w/2}" cy="${y + h/2}" rx="${w/2}" ry="${h/2}" fill="${color}"/>
    <circle cx="${x + w * 0.7}" cy="${y + h * 0.3}" r="3" fill="#000"/>
  `;
}

/**
 * 渲染装饰（花朵）
 */
export function renderDecoration(el, width, height) {
  const x = el.x * width;
  const y = el.y * height;
  const w = el.width;
  const h = el.height;

  return `
    <circle cx="${x + w/2}" cy="${y + h/2}" r="${w/2}" fill="${el.color}" opacity="0.8"/>
    <circle cx="${x + w/2}" cy="${y + h/2}" r="${w/4}" fill="#FFD700"/>
  `;
}

/**
 * 渲染角色（农夫）
 */
export function renderCharacter(el, width, height) {
  const x = el.x * width;
  const y = el.y * height;
  const w = el.width;
  const h = el.height;

  return `
    <ellipse cx="${x + w/2}" cy="${y + h * 0.3}" rx="${w/3}" ry="${h/5}" fill="#FFD700"/>
    <rect x="${x + w/3}" y="${y + h * 0.4}" width="${w/3}" height="${h/2}" fill="#4A7C3F" rx="2"/>
    <rect x="${x + w/4}" y="${y + h * 0.7}" width="${w/4}" height="${h/3}" fill="#8B7355"/>
    <rect x="${x + w/2}" y="${y + h * 0.7}" width="${w/4}" height="${h/3}" fill="#8B7355"/>
  `;
}

function getSeason() {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'autumn';
  return 'winter';
}

// All functions are individually exported above