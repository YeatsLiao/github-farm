/**
 * farm-layout.js - 农场布局算法 (v8)
 *
 * 背景: farm_field_all_cleared.png (干净农田)
 * 动态元素:
 *   1. 作物网格: 7列 x 8行 = 56格，映射 52 周贡献数据
 *   2. 树木: Top 语言 → 不同树种，放在栅栏上方草地
 *   3. 动物: PR 数量决定，放在栅栏上方
 *   4. 装饰: Issue 数量决定，放在农田边缘
 */

import {
  FIELD, CELL, CROP_SPRITES, CROP_STAGE_SIZES,
  contributionLevelToCropStage,
  TREE_SPRITES, ANIMAL_SPRITES, DECOR_SPRITES,
  LANGUAGE_TREE_MAP, ELEMENT_SIZES,
  TREE_SLOTS, ANIMAL_SLOTS, DECOR_SLOTS,
  MAPPING,
} from './themes/stardew.js';

// ── 种子伪随机 ─
function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(h, 31) + str.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(arr, rng) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── 作物网格: 52 周贡献 → 7x8 网格 (按贡献排序分列) ──
// 核心思路: 低贡献周放左列(种子/嫩芽)，高贡献周放右列(高秆/丰收)
// 形成从左到右的视觉渐变，类似概念图效果
export function calculateCrops(farmData) {
  const crops = [];
  const weeks = farmData.weeks;
  const maxCells = FIELD.cols * FIELD.rows;  // 56

  // 1. 收集所有周数据，计算总贡献
  const weekData = weeks.slice(0, maxCells).map((week) => {
    const total = week.days.reduce((sum, d) => sum + d.count, 0);
    return { total, days: week.days };
  });

  // 2. 计算百分位阈值 (自适应，确保5阶段均匀分布)
  // 目标: 种子~10%, 嫩芽~15%, 成长~20%, 高秆~20%, 丰收~35%
  const totals = weekData.map(w => w.total).sort((a, b) => a - b);
  const n = totals.length;
  const thresholds = [
    0,                                          // Level 0: 无贡献
    totals[Math.floor(n * 0.10)] || 1,         // Level 1/2 边界 (10%)
    totals[Math.floor(n * 0.25)] || 3,         // Level 2/3 边界 (25%)
    totals[Math.floor(n * 0.45)] || 8,         // Level 3/4 边界 (45%)
    totals[Math.floor(n * 0.65)] || 15,        // Level 4/5 边界 (65%)
  ];

  function getLevel(total) {
    if (total === 0) return 0;
    if (total <= thresholds[1]) return 1;
    if (total <= thresholds[2]) return 2;
    if (total <= thresholds[3]) return 3;
    if (total <= thresholds[4]) return 4;
    return 5;
  }

  // 3. 按贡献升序排序 (低→高)
  weekData.sort((a, b) => a.total - b.total);

  // 4. 分配到网格: 排序后依次填入，每列 cellsPerCol 个
  //    左列 = 低贡献 = 种子/嫩芽，右列 = 高贡献 = 高秆/丰收
  const cellsPerCol = FIELD.rows;  // 8
  const grid = [];
  for (let i = 0; i < weekData.length; i++) {
    const col = Math.floor(i / cellsPerCol);
    const rowInCol = i % cellsPerCol;
    if (!grid[col]) grid[col] = [];
    grid[col][rowInCol] = weekData[i];
  }

  // 5. 渲染: 每列从下到上填充 (底部=早期，顶部=近期)
  for (let col = 0; col < FIELD.cols; col++) {
    if (!grid[col]) continue;
    for (let rowInCol = 0; rowInCol < grid[col].length; rowInCol++) {
      const week = grid[col][rowInCol];
      const level = getLevel(week.total);
      const stageIdx = contributionLevelToCropStage(level);
      if (stageIdx < 0) continue;  // 无贡献，不画

      const size = CROP_STAGE_SIZES[stageIdx];
      const cellX = FIELD.x + col * CELL.w;
      // 从下到上: rowInCol=0 放最下面
      const displayRow = FIELD.rows - 1 - rowInCol;
      const cellY = FIELD.y + displayRow * CELL.h;

      const cx = cellX + (CELL.w - size.w) / 2;
      const cy = cellY + CELL.h - size.h;  // 底部贴地

      crops.push({
        type: 'crop',
        sprite: CROP_SPRITES[stageIdx],
        stage: stageIdx,
        level,
        x: Math.round(cx),
        y: Math.round(cy),
        w: size.w,
        h: size.h,
      });
    }
  }

  return crops;
}

// ── 树木: 每种 Top 语言一棵 ──
export function calculateTrees(farmData, rng) {
  const langs = farmData.languages.slice(0, MAPPING.maxTrees);
  const trees = [];
  const slots = shuffle(TREE_SLOTS, rng);

  for (let i = 0; i < langs.length; i++) {
    const lang = langs[i];
    const treeIdx = LANGUAGE_TREE_MAP[lang.name] ?? LANGUAGE_TREE_MAP.default;
    const sprite = TREE_SPRITES[treeIdx % TREE_SPRITES.length];
    const slot = slots[i % slots.length];

    trees.push({
      type: 'tree',
      sprite,
      language: lang.name,
      x: slot.x,
      y: slot.y,
      w: ELEMENT_SIZES.tree.w,
      h: ELEMENT_SIZES.tree.h,
    });
  }
  return trees;
}

// ── 动物: PR 数量决定 ──
export function calculateAnimals(farmData, rng) {
  const count = Math.min(
    Math.floor(farmData.totalPRs / MAPPING.animalPerPR),
    MAPPING.maxAnimals
  );
  const animals = [];
  const slots = shuffle(ANIMAL_SLOTS, rng);

  for (let i = 0; i < count; i++) {
    const sprite = ANIMAL_SPRITES[i % ANIMAL_SPRITES.length];
    const slot = slots[i % slots.length];

    animals.push({
      type: 'animal',
      sprite,
      x: slot.x,
      y: slot.y,
      w: ELEMENT_SIZES.animal.w,
      h: ELEMENT_SIZES.animal.h,
    });
  }

  // 稻草人: 连续 30 天以上
  const maxStreak = Math.max(farmData.streak?.current || 0, farmData.streak?.longest || 0);
  if (maxStreak >= MAPPING.scarecrowStreak) {
    animals.push({
      type: 'animal',
      sprite: 'r6c6',
      x: 1100,
      y: 280,
      w: ELEMENT_SIZES.animal.w,
      h: ELEMENT_SIZES.animal.h,
      isScarecrow: true,
    });
  }

  return animals;
}

// ── 装饰: Issue 数量决定 ──
export function calculateDecorations(farmData, rng) {
  const count = Math.min(
    Math.floor(farmData.totalIssues / MAPPING.decorPerIssue),
    MAPPING.maxDecor
  );
  const decors = [];
  const slots = shuffle(DECOR_SLOTS, rng);

  for (let i = 0; i < count; i++) {
    const sprite = DECOR_SPRITES[i % DECOR_SPRITES.length];
    const slot = slots[i % slots.length];

    decors.push({
      type: 'decoration',
      sprite,
      x: slot.x,
      y: slot.y,
      w: ELEMENT_SIZES.decor.w,
      h: ELEMENT_SIZES.decor.h,
    });
  }
  return decors;
}

// ── 主函数 ─
export function buildScene(farmData, options = {}) {
  const username = options.username || 'default';
  const seed = hashString(username);
  const rng = mulberry32(seed);

  const elements = [];
  // 渲染顺序: 后景 → 前景
  elements.push(...calculateTrees(farmData, rng));
  elements.push(...calculateDecorations(farmData, rng));
  elements.push(...calculateCrops(farmData));      // 作物在农田里
  elements.push(...calculateAnimals(farmData, rng));

  return elements;
}
