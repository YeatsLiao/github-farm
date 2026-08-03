/**
 * farm-layout.js - 生成安全建频程设
 *
 * 刖图片周术业学业多学信数据图片的图片体码
 */

import { CROP_STAGES, LANGUAGE_TREES, SEASON_THEMES, BUILDING_THRESHOLDS, FARM_CONFIG } from './themes/stardew.js';

export function calculateCrops(weeks) {
  const crops = [];
  const { cropRows, cropCols, cellSize, plotX, plotY, plotWidth, plotHeight } = FARM_CONFIG;

  for (let r = 0; r < cropRows; r++) {
    for (let c = 0; c < cropCols; c++) {
      const weekIndex = (r * cropCols + c) % weeks.length;
      const week = weeks[weekIndex];
      const dayIndex = r % 7;
      const day = week.days[dayIndex];

      crops.push({
        type: 'crop',
        level: day ? day.level : 0,
        count: day ? day.count : 0,
        date: day ? day.date : null,
        x: plotX + (c / cropCols) * plotWidth,
        y: plotY + (r / cropRows) * plotHeight,
        width: cellSize,
        height: cellSize,
      });
    }
  }

  return crops;
}

export function calculateTrees(languages) {
  return languages.map((lang, i) => {
    const treeType = LANGUAGE_TREES[lang.name] || LANGUAGE_TREES.default;
    return {
      type: 'tree',
      treeType: treeType.name,
      color: treeType.color,
      count: lang.count,
      x: 0.02 + (i * 0.06) % 0.35,
      y: 0.65 + Math.sin(i * 1.5) * 0.05,
      width: 48,
      height: 64,
    };
  });
}

export function calculateBuildings(streak) {
  const buildings = [];
  const thresholds = Object.entries(BUILDING_THRESHOLDS);

  for (const [name, config] of thresholds) {
    if (streak.current >= config.minStreak || streak.longest >= config.minStreak) {
      const pos = getBuildingPosition(name);
      buildings.push({
        type: 'building',
        buildingType: name,
        desc: config.desc,
        unlocked: streak.current >= config.minStreak,
        x: pos.x,
        y: pos.y,
        width: 64,
        height: 64,
      });
    }
  }

  return buildings;
}

function getBuildingPosition(name) {
  const positions = {
    fence: { x: 0.10, y: 0.40 },
    well: { x: 0.65, y: 0.50 },
    barn: { x: 0.72, y: 0.25 },
    scarecrow: { x: 0.50, y: 0.35 },
    windmill: { x: 0.85, y: 0.20 },
  };
  return positions[name] || { x: 0.5, y: 0.5 };
}

export function calculateAnimals(totalPRs, season) {
  const animals = [];
  const seasonTheme = SEASON_THEMES[season] || SEASON_THEMES.spring;
  const animalTypes = seasonTheme.animals;
  const count = Math.min(totalPRs, 8);

  for (let i = 0; i < count; i++) {
    const animalType = animalTypes[i % animalTypes.length];
    animals.push({
      type: 'animal',
      animalType: animalType,
      x: 0.15 + (i * 0.08) % 0.50,
      y: 0.75 + Math.cos(i * 2.1) * 0.08,
      width: 24,
      height: 24,
    });
  }

  return animals;
}

export function calculateDecorations(totalIssues, season) {
  const decorations = [];
  const seasonTheme = SEASON_THEMES[season] || SEASON_THEMES.spring;
  const flowers = seasonTheme.flowers;
  const count = Math.min(totalIssues, 12);

  for (let i = 0; i < count; i++) {
    const color = flowers[i % flowers.length] || '#FF69B4';
    decorations.push({
      type: 'decoration',
      decorationType: 'flower',
      color: color,
      x: 0.05 + (i * 0.07) % 0.90,
      y: 0.80 + Math.sin(i * 1.7) * 0.10,
      width: 16,
      height: 16,
    });
  }

  return decorations;
}

export function calculateCharacter() {
  return {
    type: 'character',
    sprite: 'farmer',
    x: 0.40,
    y: 0.55,
    width: 48,
    height: 64,
  };
}

export function buildScene(farmData) {
  const elements = [];

  elements.push(...calculateCrops(farmData.weeks));
  elements.push(...calculateTrees(farmData.languages));
  elements.push(...calculateBuildings(farmData.streak));
  elements.push(...calculateAnimals(farmData.totalPRs, farmData.season));
  elements.push(...calculateDecorations(farmData.totalIssues, farmData.season));
  elements.push(calculateCharacter());

  return elements;
}
