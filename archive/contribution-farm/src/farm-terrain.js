/** 水岸、道路、桥面与碰撞共享的像素掩码；不依赖浏览器或 Canvas。 */
export const SURFACE = { grass: 0, water: 1, road: 2, soil: 3, stone: 4, bridge: 5 };
export const inRect = (r, x, y) => x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
export function inPolygon(points, x, y) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [ax, ay] = points[i], [bx, by] = points[j];
    if ((ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax) inside = !inside;
  }
  return inside;
}
export function terrainHash(x, y, salt = 0) {
  let n = Math.imul(x + 71, 374761393) ^ Math.imul(y + 137, 668265263) ^ salt;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}
const cache = new WeakMap();
export function terrainFor(map) {
  if (cache.has(map)) return cache.get(map);
  const { width, height } = map, length = width * height;
  const surface = new Uint8Array(length), water = new Uint8Array(length), shore = new Uint8Array(length).fill(255);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const p = y * width + x;
    water[p] = Number(map.waterBodies.some(body => inPolygon(body.polygon, x + .5, y + .5)));
    let kind = water[p] ? SURFACE.water : SURFACE.grass;
    if (!water[p]) {
      if (map.paths.some(r => inRect(r, x, y))) kind = SURFACE.road;
      if (map.pads.some(r => inRect(r, x, y))) kind = SURFACE.stone;
      if (map.beds.some(r => inRect(r, x, y))) kind = SURFACE.soil;
    }
    if (map.decks.some(r => inRect(r.walk, x, y))) kind = SURFACE.bridge;
    surface[p] = kind;
  }
  // 多源广度遍历只在生成时运行，得到两岸各12像素的距离带。
  const queue = new Int32Array(length); let head = 0, tail = 0;
  const neighbors = p => [p % width ? p - 1 : -1, p % width < width - 1 ? p + 1 : -1, p >= width ? p - width : -1, p < length - width ? p + width : -1];
  for (let p = 0; p < length; p++) if (neighbors(p).some(n => n >= 0 && water[n] !== water[p])) { shore[p] = 0; queue[tail++] = p; }
  while (head < tail) {
    const p = queue[head++]; if (shore[p] >= 12) continue;
    for (const n of neighbors(p)) if (n >= 0 && shore[n] > shore[p] + 1) { shore[n] = shore[p] + 1; queue[tail++] = n; }
  }
  const result = { width, height, surface, water, shore };
  cache.set(map, result); return result;
}
export function coversBounds(terrain, bounds, predicate) {
  if (![bounds.left, bounds.right, bounds.top, bounds.bottom].every(Number.isFinite) || bounds.left > bounds.right || bounds.top > bounds.bottom) return false;
  const left = Math.floor(bounds.left), right = Math.ceil(bounds.right), top = Math.floor(bounds.top), bottom = Math.ceil(bounds.bottom);
  if (left < 0 || top < 0 || right >= terrain.width || bottom >= terrain.height) return false;
  for (let y = top; y <= bottom; y++) for (let x = left; x <= right; x++) {
    const p = y * terrain.width + x;
    if (!predicate(terrain.surface[p], terrain.water[p], terrain.shore[p])) return false;
  }
  return true;
}
export const onDryLand = (terrain, bounds) => coversBounds(terrain, bounds, (surface, water) => !water && surface !== SURFACE.bridge);
export const onWalkableLand = (terrain, bounds) => coversBounds(terrain, bounds, (surface, water) => !water || surface === SURFACE.bridge);
export const inWater = (terrain, bounds) => coversBounds(terrain, bounds, (surface, water) => !!water);
export function waterAt(map, x, y) {
  if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || y < 0 || x >= map.width || y >= map.height) return undefined;
  return map.waterBodies.find(body => inPolygon(body.polygon, Math.floor(x) + .5, Math.floor(y) + .5));
}
export function traceWater(ctx, map) {
  ctx.beginPath();
  for (const body of map.waterBodies) {
    body.polygon.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath();
  }
}
