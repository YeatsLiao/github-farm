/**
 * themes/stardew.js - Stardew Valley theme configuration (v8)
 *
 * 画布: 1216x832 (匹配新背景图 farm_field_all_cleared.png)
 * 背景: 干净的农田背景（天空+谷仓+栅栏+农夫+鸡+树+空地）
 * 农田: 7列 x 8行 = 56格，对应 52 周贡献数据
 * 精灵: assets/sprites/cropped/ 切割好的独立 PNG
 */

// ── 画布尺寸 ──
export const CANVAS = { width: 1216, height: 832 };

// ── 资产路径 (GitHub raw) ──
const RAW_BASE = 'https://raw.githubusercontent.com/YeatsLiao/github-farm/main/assets';
export const BG_URL = RAW_BASE + '/scenes/farm_field_all_cleared.png';
export const SPRITE_URL = RAW_BASE + '/sprites/cropped';

// ── 农田网格配置 ──
// 农田区域: x: 60~1170, y: 380~790
export const FIELD = {
  x: 60,
  y: 380,
  w: 1110,   // 1170 - 60
  h: 410,    // 790 - 380
  cols: 7,
  rows: 8,
};

// 每格尺寸
export const CELL = {
  w: Math.floor(FIELD.w / FIELD.cols),  // ~158
  h: Math.floor(FIELD.h / FIELD.rows),  // ~51
};

// ── 作物生长阶段精灵 (5阶段) ──
// r1c1=种子(很小), r1c2=嫩芽, r1c3=成长, r1c4=高秆(玉米), r1c5=丰收(麦子)
export const CROP_SPRITES = ['r1c1', 'r1c2', 'r1c3', 'r1c4', 'r1c5'];

// 每个阶段的渲染尺寸 (宽度 x 高度)
// 阶段越高，植物越大，形成从左到右的视觉渐变
export const CROP_STAGE_SIZES = [
  { w: 30, h: 20 },   // Stage 0: 种子 - 很小很扁
  { w: 40, h: 35 },   // Stage 1: 嫩芽 - 小绿苗
  { w: 55, h: 55 },   // Stage 2: 成长 - 中等植物
  { w: 65, h: 80 },   // Stage 3: 高秆 - 玉米状
  { w: 70, h: 100 },  // Stage 4: 丰收 - 金色麦子(最高但不超格太多)
];

// 贡献等级 → 作物阶段 (0=无贡献不画, 1-5 对应 5 个生长阶段)
export function contributionLevelToCropStage(level) {
  if (level <= 0) return -1;  // 不画
  if (level === 1) return 0;  // 种子
  if (level === 2) return 1;  // 嫩芽
  if (level === 3) return 2;  // 成长
  if (level === 4) return 3;  // 高秆
  return 4;                    // 丰收
}

// ─ 树木精灵 (按语言挑选) ──
export const TREE_SPRITES = ['r5c1', 'r5c2', 'r5c3', 'r5c4', 'r5c5', 'r5c6'];

// ── 动物精灵 ──
export const ANIMAL_SPRITES = ['r6c1', 'r6c2', 'r6c3', 'r6c4', 'r6c5', 'r6c6'];

// ── 装饰精灵 ──
export const DECOR_SPRITES = ['r7c1', 'r7c2', 'r7c3', 'r7c4', 'r7c5'];

// ── 元素渲染尺寸 ──
export const ELEMENT_SIZES = {
  crop:   { w: 80, h: 130 },  // 作物最大尺寸 (各阶段用 CROP_STAGE_SIZES)
  tree:   { w: 80, h: 100 },  // 树木
  animal: { w: 55, h: 50 },   // 动物
  decor:  { w: 36, h: 36 },   // 装饰
};

// ─ 树木位置槽 (栅栏后方草地) ─
export const TREE_SLOTS = [
  { x: 380,  y: 230, w: 80, h: 100 },  // 谷仓右侧
  { x: 500,  y: 230, w: 80, h: 100 },  // 中左
  { x: 620,  y: 230, w: 80, h: 100 },  // 中
  { x: 740,  y: 230, w: 80, h: 100 },  // 中右
  { x: 860,  y: 230, w: 80, h: 100 },  // 右 (已有树左侧)
  { x: 1050, y: 230, w: 80, h: 100 },  // 最右
];

// ── 动物位置槽 (栅栏后方草地) ──
export const ANIMAL_SLOTS = [
  { x: 300,  y: 250, w: 55, h: 50 },   // 谷仓附近
  { x: 420,  y: 250, w: 55, h: 50 },   // 农夫右侧
  { x: 540,  y: 250, w: 55, h: 50 },
  { x: 680,  y: 250, w: 55, h: 50 },
  { x: 800,  y: 250, w: 55, h: 50 },
  { x: 920,  y: 250, w: 55, h: 50 },
  { x: 1050, y: 250, w: 55, h: 50 },
];

// ── 装饰位置槽 (农田边缘/草地) ──
export const DECOR_SLOTS = [
  { x: 80,   y: 350, w: 36, h: 36 },
  { x: 200,  y: 350, w: 36, h: 36 },
  { x: 900,  y: 350, w: 36, h: 36 },
  { x: 1050, y: 350, w: 36, h: 36 },
  { x: 1130, y: 500, w: 36, h: 36 },
];

// ── 贡献 -> 元素数量映射 ──
export const MAPPING = {
  maxTrees:   5,
  maxAnimals: 5,
  maxDecor:   4,
  animalPerPR:   8,
  decorPerIssue: 6,
  scarecrowStreak: 30,
};

// ── 语言 -> 树木精灵索引 ──
export const LANGUAGE_TREE_MAP = {
  'JavaScript': 0,
  'TypeScript': 1,
  'Python':     2,
  'Java':       3,
  'Go':         4,
  'Rust':       5,
  'C++':        4,
  'C':          5,
  'Ruby':       0,
  'PHP':        1,
  'Swift':      2,
  'Kotlin':     3,
  default:      0,
};
