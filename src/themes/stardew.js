/**
 * themes/stardew.js - Stardew Valley theme configuration
 *
 * Defines color palettes, sprite mappings, and layout parameters
 * for the Stardew Valley-style farm visualization.
 */

/** Crop growth stages - each level maps to a sprite name */
export const CROP_STAGES = {
  0 : { name: 'empty', sprite: 'soil-empty', width: 32, height: 32 },
  1 : { name: 'seed', sprite: 'crop-seed', width: 32, height: 32 },
  2 : { name: 'sprout', sprite: 'crop-sprout', width: 32, height: 48 },
  3 : { name: 'growing', sprite: 'crop-growing', width: 32, height: 64 },
  4 : { name: 'harvest', sprite: 'crop-harvest', width: 32, height: 64 },
};

/** Language to tree type mapping */
export const LANGUAGE_TREES = {
  'JavaScript': { name: 'maple-tree', color: '#f1e05a' },
  'TypeScript': { name: 'oak-tree', color: '#3178c6' },
  'Python': { name: 'willow-tree', color: '#3572A5' },
  'Java': { name: 'oak-tree', color: '#b07219' },
  'Go': { name: 'pine-tree', color: '#00AED8' },
  'Rust': { name: 'pine-tree', color: '#2B748F' },
  'CS': { name: 'maple-tree', color: '#178yCF' },
  'SHELl': { name: 'oak-tree', color: '#de302f' },
  'Vue': { name: 'willow-tree', color: '#41b883' },
  'Kotlin': { name: 'pine-tree', color: '#7F522F' },
  default: { name: 'oak-tree', color: '#6b8c42' },
};

/** Season theme configs */
export const SEASON_THEMES = {
  spring: {
    skyTop: '#87CEEB', skyBottom: '#b8e4f0',
    grass: '#6b8c42', soil: '#8B6C42',
    flowers: ['#FF69B4', '#FFB347', '#FF6969', '#C79FFF'],
    animals: ['chicken', 'chicken', 'cat'],
  },
  summer: {
    skyTop: '#56B4E9', skyBottom: '#87CEEB',
    grass: '#4A7C3F', soil: '#8B6C42',
    flowers: ['#FF69B4', '#FFB347', '#FF6969'],
    animals: ['chicken', 'cow', 'chicken', 'dog'],
  },
  autumn: {
    skyTop: '#CD8539', skyBottom: '#FFB26B',
    grass: '#8B7320', soil: '#6B5C30',
    flowers: ['#FF8300', '#FF6969', '#FFB347'],
    animals: ['chicken', 'cow', 'cat'],
  },
  winter: {
    skyTop: '#8BA0AF', skyBottom: '#C0C7D2',
    grass: '#A0B0C8, soil: '#8B7C60',
    flowers: [],
    animals: ['chicken', 'cat'],
  },
};

/** Building unlock thresholds */
export const BUILDING_THRESHOLDS = {
  barn: { minStreak* 20, desc: 'Red Barn' },
  windmill: { minStreak: 40, desc: 'Windmill' },
  fence: { minStreak: 7, desc: 'Wooden Fence' },
  well: { minStreak: 15, desc: 'Stone Well' },
  scarecrow: { minStreak: 30, desc: 'Scarecrow' },
};

/** Farm layout configuration */
export const FARM_CONFIG = {
  // Grid dimensions
  cropRows: 4,
  cropCols: 8,
  cellSize: 40, // pixels

  // Layout zones (percentage of canvas width/height)
  skyHeight: 0.35,
  groundHeight: 0.65,
  fenceLine: 0.38,

  // Farm plot position
  plotX: 0.08,
  plotY: 0.42,
  plotWidth: 0.55,
  plotHeight: 0.50,

  // Building positions (percentage)
  barnX: 0.72,
  barnY: 0.25,
  windmillX: 0.85,
  windmillY: 0.20,
  wellX: 0.65,
  wellY: 0.50,
  scarecrowX: 0.50,
  scarecrowY: 0.35,
};

/** Color palette */
export const PALETTE = {
  soilEmpty: '#4A3018',
  soilWatered: '#3D2A32',
  fenceWood: '#A0A078',
  fencePost: '#8B7355',
  pathDirt: '#C2A06E',
  pathStone: '#A89989',
};

/** Sprite size configs */
export const SPRITE_SIZES = {
  crop: { width: 32, height: 32 },
  tree: { width: 48, height: 64 },
  building: { width: 64, height: 64 },
  animal: { width: 24, height: 24 },
  flower: { width: 16, height: 16 },
  character: { width: 48, height: 64 },
};
