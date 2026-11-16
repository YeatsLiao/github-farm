/** 将新绘制的图集编译为透明资产；不读取旧 cropped 素材。 */
import { createCanvas, loadImage } from 'canvas';
import { mkdir, writeFile, copyFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(root, 'assets/spring');
const [backgroundPath, atlasPath] = process.argv.slice(2);
if (!backgroundPath || !atlasPath) {
  throw new Error('用法：node scripts/prepare-spring-art.mjs <背景 PNG> <4×4 图集 PNG>');
}
await mkdir(output, { recursive: true });
const existing = await readFile(resolve(output, 'manifest.json'), 'utf8').catch(error => {
  if (error.code === 'ENOENT') return '{}';
  throw error;
});
if (JSON.parse(existing).version >= 2) throw new Error('当前已升级为24种素材，请使用 npm run art:build，旧16帧脚本不能覆盖新版。');
const image = await loadImage(atlasPath);
if (image.width !== 1024 || image.height !== 1024) throw new Error('图集必须为 1024×1024');
const canvas = createCanvas(1024, 1024);
const ctx = canvas.getContext('2d');
ctx.drawImage(image, 0, 0);
const pixels = ctx.getImageData(0, 0, 1024, 1024);
for (let i = 0; i < pixels.data.length; i += 4) {
  const [r, g, b] = pixels.data.subarray(i, i + 3);
  // 只移除专门指定的紫红底色及其边缘，不按亮度清理白色鸡和云。
  if (r > g * 1.5 + 12 && b > g * 1.3 + 10 && b > r * 0.43) {
    pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = pixels.data[i + 3] = 0;
  }
}
ctx.putImageData(pixels, 0, 0);
const names = [
  'seed', 'sprout', 'young', 'green', 'wheat',
  'chicken-idle', 'chicken-step-a', 'chicken-step-b', 'chicken-peck',
  'cloud-small', 'cloud-large', 'tree-round', 'tree-pine',
  'flowers-blue', 'flowers-gold', 'scarecrow',
];
const sprites = {};
for (let cell = 0; cell < names.length; cell++) {
  const left = (cell % 4) * 256, top = Math.floor(cell / 4) * 256;
  const visited = new Uint8Array(256 * 256);
  let largest = [];
  // 保留每格最大的连通主体，清除背景小斑点和独立的生成残留。
  for (let p = 0; p < visited.length; p++) {
    const alphaAt = q => pixels.data[((top + Math.floor(q / 256)) * 1024 + left + q % 256) * 4 + 3];
    if (visited[p] || !alphaAt(p)) continue;
    const component = [p];
    visited[p] = 1;
    for (let k = 0; k < component.length; k++) {
      const q = component[k], x = q % 256, y = Math.floor(q / 256);
      for (const n of [x > 0 ? q - 1 : -1, x < 255 ? q + 1 : -1, y > 0 ? q - 256 : -1, y < 255 ? q + 256 : -1]) {
        if (n >= 0 && !visited[n] && alphaAt(n)) { visited[n] = 1; component.push(n); }
      }
    }
    if (component.length > largest.length) largest = component;
  }
  if (largest.length < 40) throw new Error(`素材主体缺失：${names[cell]}`);
  const keep = new Set(largest);
  let minX = 255, minY = 255, maxX = 0, maxY = 0;
  for (let p = 0; p < 256 * 256; p++) {
    const x = p % 256, y = Math.floor(p / 256);
    if (!keep.has(p)) pixels.data[((top + y) * 1024 + left + x) * 4 + 3] = 0;
    else { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  }
  sprites[names[cell]] = { x: left + minX, y: top + minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}
ctx.putImageData(pixels, 0, 0);
await writeFile(resolve(output, 'sprites.png'), canvas.toBuffer('image/png'));
if (resolve(backgroundPath) !== resolve(output, 'background.png')) {
  await copyFile(backgroundPath, resolve(output, 'background.png'));
}
if (resolve(atlasPath) !== resolve(output, 'source-atlas.png')) {
  await copyFile(atlasPath, resolve(output, 'source-atlas.png'));
}
await writeFile(resolve(output, 'manifest.json'), JSON.stringify({
  version: 1, cellSize: 256, sprites,
  provenance: '本项目 AI 辅助新绘制，人工检查；与旧抠图资产分开存放。',
}, null, 2) + '\n');
console.log(`已生成 ${names.length} 个透明素材及春日背景：${output}`);
