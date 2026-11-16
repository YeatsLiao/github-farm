/** 对象目录；生长阶段和动画帧不重复计数。网页与资产编译器共享此清单。 */
const item = (id, name, category, frames, height, footprint, movable = false, width = Math.max(height, footprint[0])) => ({ id, name, category, frames, height, width, footprint, movable });
export const RESIDENT_TYPES = ['farmer', 'gardener', 'angler', 'keeper', 'villager'];
export const DIRECTIONS = ['down', 'left', 'right', 'up'];
export const residentFrames = id => DIRECTIONS.flatMap(direction => [
  ...Array.from({ length: 2 }, (_, i) => `${id}-${direction}-idle-${i}`),
  ...Array.from({ length: 6 }, (_, i) => `${id}-${direction}-walk-${i}`),
]).concat([`${id}-action-0`, `${id}-action-1`]);
const resident = (id, name) => ({ ...item(id, name, '人物与动物', residentFrames(id), 40, [14, 8], false, 40),
  resident: true, sourceHeight: 40, pivot: [20, 38] });
export const WATER_PLANTS = ['lilypad', 'waterlily'];
export const BOTANICAL_TYPES = ['tulip', 'cosmos', 'lavender', 'iris', 'hydrangea', 'berry', 'fern', 'red-mushroom', 'honey-mushroom', 'lilypad', 'waterlily', 'cattail'];
const botanical = (id, name, height, width, footprint) => ({ ...item(id, name,
  WATER_PLANTS.includes(id) ? '池塘与水生' : '花草', [id], height, footprint, !WATER_PLANTS.includes(id), width), botanical: true });
export const ART_CATALOG = [
  item('wheat', '麦子', '作物', ['seed', 'sprout', 'young', 'green', 'wheat'], 43, [32, 16]),
  item('carrot', '胡萝卜', '作物', ['carrot-seed', 'carrot-sprout', 'carrot-young', 'carrot-green', 'carrot-ripe'], 32, [30, 16]),
  item('pumpkin', '南瓜', '作物', ['pumpkin-seed', 'pumpkin-sprout', 'pumpkin-young', 'pumpkin-green', 'pumpkin-ripe'], 25, [32, 16]),
  item('daisy', '雏菊', '花草', ['flowers-blue'], 19, [16, 8], true),
  item('sunflower', '向日葵', '花草', ['sunflower'], 32, [18, 8], true),
  item('grass', '草丛', '花草', ['grass'], 12, [17, 7], true),
  item('reed', '芦苇', '花草', ['reed'], 30, [18, 9], true),
  item('oak', '阔叶树', '树木', ['tree-round'], 124, [40, 22], true, 140),
  item('pine', '松树', '树木', ['tree-pine'], 132, [36, 22], true, 100),
  item('barn', '红谷仓', '建筑', ['barn'], 168, [142, 64]),
  item('cottage', '小屋', '建筑', ['cottage'], 142, [126, 52]),
  item('fence', '木围栏', '装饰', ['fence'], 22, [36, 7]),
  item('path', '铺路石', '装饰', ['path'], 9, [22, 10]),
  item('lamp', '路灯', '装饰', ['lamp'], 48, [10, 8], true),
  item('well', '水井', '装饰', ['well'], 43, [31, 18], true),
  item('scarecrow', '稻草人', '装饰', ['scarecrow'], 39, [22, 10], true),
  resident('farmer', '农夫'),
  item('chicken', '小鸡', '人物与动物', ['chicken-idle', 'chicken-step-a', 'chicken-step-b', 'chicken-peck'], 16, [14, 7], false, 24),
  item('cat', '橘猫', '人物与动物', ['cat-idle', 'cat-blink', 'cat-stretch', 'cat-sleep'], 22, [20, 10], false, 36),
  item('pond', '池塘', '池塘与水生', ['pond'], 84, [164, 80]),
  item('fish', '锦鲤', '池塘与水生', ['fish-a', 'fish-b', 'fish-c', 'fish-d'], 8, [14, 6], false, 18),
  item('sproutling', '芽芽', '原创吉祥物', ['sproutling-idle', 'sproutling-blink', 'sproutling-wave', 'sproutling-step'], 24, [16, 9]),
  item('copper', '铜矿', '矿物', ['copper'], 23, [36, 15], true),
  item('amethyst', '紫水晶', '矿物', ['amethyst'], 32, [25, 14], true),
  botanical('tulip', '红郁金香', 24, 24, [16, 7]),
  botanical('cosmos', '粉波斯菊', 24, 24, [16, 7]),
  botanical('lavender', '紫薰衣草', 24, 28, [20, 8]),
  botanical('iris', '蓝鸢尾', 27, 28, [16, 7]),
  botanical('hydrangea', '绣球灌木', 28, 36, [28, 12]),
  botanical('berry', '浆果灌木', 28, 32, [24, 10]),
  botanical('fern', '蕨类', 22, 32, [24, 8]),
  botanical('red-mushroom', '红斑蘑菇', 25, 32, [24, 8]),
  botanical('honey-mushroom', '蜜色蘑菇', 18, 24, [20, 7]),
  botanical('lilypad', '荷叶', 10, 16, [14, 5]),
  botanical('waterlily', '睡莲', 14, 22, [18, 6]),
  botanical('cattail', '香蒲', 30, 24, [16, 8]),
  resident('gardener', '园丁'), resident('angler', '钓鱼人'),
  resident('keeper', '饲养员'), resident('villager', '散步村民'),
  { ...item('bridge', '溪上木桥', '装饰', ['bridge', 'bridge-rail'], 48, [88, 30], false, 96), native: true },
  { ...item('deck', '钓鱼平台', '装饰', ['deck', 'deck-rail'], 64, [72, 44], false, 80), native: true },
  { ...item('barrel', '木桶', '装饰', ['barrel'], 24, [18, 10], true, 24), native: true },
  { ...item('crate', '木箱', '装饰', ['crate'], 20, [20, 10], true, 26), native: true },
  { ...item('woodpile', '柴堆', '装饰', ['woodpile'], 22, [30, 12], true, 36), native: true },
  { ...item('bench', '长凳', '装饰', ['bench'], 24, [32, 10], true, 40), native: true },
  { ...item('hedge', '树篱', '花草', ['hedge'], 20, [28, 10], false, 32), native: true },
  { ...item('tall-mushroom', '高红蘑菇', '花草', ['tall-mushroom'], 68, [18, 10], true, 46), native: true },
];
export const ART_BY_ID = Object.fromEntries(ART_CATALOG.map(entry => [entry.id, entry]));
export const CROP_TYPES = ART_CATALOG.filter(entry => entry.category === '作物');
export const ART_FINISH_REVISION = 1;

/** 离线边缘整理：只改三像素轮廓带和植物底座，不模糊主体、不混入固定背景色。 */
export function finishSpriteEdges(image, type, frame = '') {
  const art = ART_BY_ID[type];
  if (!art) return image;
  const { width, height, data } = image;
  const source = new Uint8ClampedArray(data);
  const depth = new Uint8Array(width * height).fill(255), queue = [];
  const adjacent = p => {
    const x = p % width, y = Math.floor(p / width);
    return [x ? p - 1 : -1, x < width - 1 ? p + 1 : -1, y ? p - width : -1, y < height - 1 ? p + width : -1];
  };
  for (let p = 0; p < depth.length; p++) {
    const x = p % width, y = Math.floor(p / width);
    if (!source[p * 4 + 3]) { depth[p] = 0; queue.push(p); }
    else if (!x || !y || x === width - 1 || y === height - 1) { depth[p] = 1; queue.push(p); }
  }
  // 距离只从原始透明区计算；改色与透明度不会成为下一轮泛洪的依据。
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i];
    if (depth[p] >= 4) continue;
    for (const n of adjacent(p)) if (n >= 0 && depth[n] > depth[p] + 1) {
      depth[n] = depth[p] + 1; queue.push(n);
    }
  }
  const plant = ['树木', '花草', '作物'].includes(art.category) || type === 'scarecrow';
  const baseHeight = Math.max(2, Math.round(height * .045));
  for (let p = 0; p < depth.length; p++) {
    const i = p * 4, x = p % width, y = Math.floor(p / width);
    if (!source[i + 3]) { data.fill(0, i, i + 4); continue; }
    if (depth[p] <= 3) {
      let best = -1, score = -Infinity;
      for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
        const n = ny * width + nx;
        if (depth[n] <= depth[p] || !source[n * 4 + 3]) continue;
        const candidate = Math.min(depth[n], 5) * 4 - Math.hypot(dx, dy);
        if (candidate > score) { score = candidate; best = n * 4; }
      }
      const [r, g, b] = source.subarray(i, i + 3);
      const spill = art.category === '矿物'
        ? g > r * 1.12 && b > r * 1.12 && Math.abs(g - b) < 85
        : r > g * 1.18 && b > g * 1.12;
      if (best >= 0) {
        const light = .3 * r + .59 * g + .11 * b;
        const innerLight = .3 * source[best] + .59 * source[best + 1] + .11 * source[best + 2];
        const outline = light < 85 && innerLight > light + 15;
        const amount = spill ? .95 : outline ? (depth[p] === 1 ? .72 : .4) : 0;
        const shade = spill ? .9 : .82;
        for (let c = 0; c < 3; c++) data[i + c] = Math.round(source[i + c] * (1 - amount) + source[best + c] * shade * amount);
      }
      // 外圈只向透明混合；细茎仍保留至少75%的原透明度。
      if (depth[p] === 1) data[i + 3] = Math.round(source[i + 3] * .75);
    }
    const [r, g, b] = source.subarray(i, i + 3);
    const soil = r > g * .95 && b < g * .85;
    const groundBase = soil || ['树木', '花草'].includes(art.category);
    if (plant && !frame.includes('seed') && groundBase && y >= height - baseHeight) {
      const fade = .22 + .78 * (height - 1 - y) / baseHeight;
      data[i + 3] = Math.round(data[i + 3] * fade);
    }
  }
  return image;
}
