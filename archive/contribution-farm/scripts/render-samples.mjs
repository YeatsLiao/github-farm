/** 输出可复现的美术验收样张，不覆盖 README 的原始概念预览。 */
import { mkdir, writeFile, copyFile } from 'node:fs/promises';
import { createCanvas, loadImage } from 'canvas';
import { fileURLToPath } from 'node:url';
import { createDemoData, createFarmScene } from '../src/living-farm.js';
import { renderLivingFarm } from '../src/renderer.js';

const dist = new URL('../dist/', import.meta.url);
await mkdir(dist, { recursive: true });
if (process.argv.includes('--save-baseline')) {
  await copyFile(new URL('spring-medium.png', dist), new URL('spring-before-blend.png', dist));
}
if (process.argv.includes('--save-courtyard-baseline')) {
  await copyFile(new URL('spring-medium.png', dist), new URL('spring-before-courtyard.png', dist));
}
for (const profile of ['low', 'medium', 'high']) {
  const scene = createFarmScene(createDemoData(profile, 'YeatsLiao'), 'YeatsLiao');
  const png = await renderLivingFarm(scene, 1536, 1024);
  await writeFile(new URL(`spring-${profile}.png`, dist), png);
  if (profile === 'medium') {
    await writeFile(new URL('../docs/images/spring-preview.png', import.meta.url), png);
    const evening = await renderLivingFarm(scene, 1536, 1024, { evening: true, seconds: 4 });
    await writeFile(new URL('spring-evening.png', dist), evening);
    const frame = await renderLivingFarm(scene, 1536, 1024, { seconds: 4 });
    await writeFile(new URL('spring-frame-4s.png', dist), frame);
  }
  console.log(`${profile}: ${scene.total} 次贡献，${scene.crops.length} 周，${scene.chickens.length} 只鸡`);
}
if (process.argv.includes('--courtyard-compare')) {
  const board = createCanvas(1568, 568), brush = board.getContext('2d');
  brush.fillStyle = '#eee9d8'; brush.fillRect(0, 0, board.width, board.height);
  brush.imageSmoothingEnabled = false; brush.font = '20px "Microsoft YaHei", sans-serif';
  for (const [index, file] of ['spring-before-courtyard.png', 'spring-medium.png'].entries()) {
    const image = await loadImage(fileURLToPath(new URL(file, dist))), x = 8 + index * 784;
    brush.fillStyle = '#435240'; brush.fillText(index ? '重构后 · 林间农家院' : '重构前 · 铺满式散点布局', x + 12, 30);
    brush.drawImage(image, x, 44, 768, 512);
  }
  await writeFile(new URL('spring-courtyard-comparison.png', dist), board.toBuffer('image/png'));
}
if (process.argv.includes('--compare')) {
  const before = await loadImage(fileURLToPath(new URL('spring-before-blend.png', dist)));
  const after = await loadImage(fileURLToPath(new URL('spring-medium.png', dist)));
  const board = createCanvas(1568, 920), brush = board.getContext('2d');
  brush.fillStyle = '#ede9dc'; brush.fillRect(0, 0, board.width, board.height);
  brush.imageSmoothingEnabled = false; brush.font = '20px "Microsoft YaHei", sans-serif';
  for (const [index, image] of [before, after].entries()) {
    const x = 8 + index * 784;
    brush.fillStyle = '#435240'; brush.fillText(index ? '调整后 · 边缘融合与低对比地形' : '调整前 · 硬描边与重复地面', x + 12, 30);
    brush.drawImage(image, x, 44, 768, 512);
    brush.fillText('树冠与树根', x + 12, 590); brush.fillText('屋脚与路肩', x + 404, 590);
    brush.drawImage(image, 806, 108, 320, 288, x + 12, 604, 320, 288);
    brush.drawImage(image, 536, 312, 280, 160, x + 404, 604, 280, 160);
  }
  await writeFile(new URL('spring-blend-comparison.png', dist), board.toBuffer('image/png'));
}
console.log(`验收样张：${fileURLToPath(dist)}`);
