/**
 * renderer.js - Canvas 像素风渲染引擎 (v8)
 *
 * 用 canvas 库做 sprite-based 渲染，输出 PNG
 * 背景: farm_field_all_cleared.png (干净农田)
 * 精灵: assets/sprites/cropped/*.png
 * 本地开发用文件路径，GitHub 部署用 raw URL
 */

import { createCanvas, loadImage } from 'canvas';
import { CANVAS, BG_URL, SPRITE_URL } from './themes/stardew.js';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = resolve(__dirname, '../assets');

// 本地精灵路径映射
function localSpritePath(spriteName) {
  return resolve(ASSETS_DIR, `sprites/cropped/${spriteName}.png`);
}

function localBgPath() {
  return resolve(ASSETS_DIR, 'scenes/farm_field_all_cleared.png');
}

// 远程 URL 映射
function remoteSpriteUrl(spriteName) {
  return `${SPRITE_URL}/${spriteName}.png`;
}

/**
 * 检测精灵的实际内容边界（跳过透明像素）
 * 返回 { x, y, w, h } 相对于原图的内容区域
 */
function getContentBounds(ctx, width, height) {
  const data = ctx.getImageData(0, 0, width, height).data;
  let minX = width, maxX = 0, minY = height, maxY = 0;
  let found = false;

  // 采样检测（每4像素检一次，提升性能）
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const i = (y * width + x) * 4;
      if (data[i + 3] > 20) {  // alpha > 20 视为有内容
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        found = true;
      }
    }
  }

  if (!found) return { x: 0, y: 0, w: width, h: height };
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

// 精灵内容边界缓存
const contentBoundsCache = new Map();

/**
 * 渲染场景，输出 PNG buffer
 * @param {Array} elements - 场景元素列表
 * @param {number} width - 画布宽度
 * @param {number} height - 画布高度
 * @param {boolean} useLocal - 是否使用本地文件（默认 true）
 * @returns {Promise<Buffer>} PNG 数据
 */
export async function renderScene(elements, width, height, useLocal = true) {
  width = width || CANVAS.width;
  height = height || CANVAS.height;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // 关闭抗锯齿，保持像素风
  ctx.imageSmoothingEnabled = false;

  // 1. 绘制背景
  const bgPath = useLocal ? localBgPath() : BG_URL;
  try {
    const bg = await loadImage(bgPath);
    // 背景图与画布同尺寸 (900x500)，直接铺满
    ctx.drawImage(bg, 0, 0, width, height);
  } catch (err) {
    console.warn(`[renderer] Failed to load background: ${err.message}`);
    // fallback: 画渐变天空 + 绿色地面
    const skyGrad = ctx.createLinearGradient(0, 0, 0, height * 0.35);
    skyGrad.addColorStop(0, '#56B4E9');
    skyGrad.addColorStop(1, '#87CEEB');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, height * 0.35);
    ctx.fillStyle = '#4A7C3F';
    ctx.fillRect(0, height * 0.35, width, height * 0.65);
  }

  // 2. 绘制元素（按数组顺序：树 → 装饰 → 动物）
  for (const el of elements) {
    const x = el.x !== undefined ? Math.round(el.x) : 0;
    const y = el.y !== undefined ? Math.round(el.y) : 0;
    const w = el.w || 40;
    const h = el.h || 40;

    const spritePath = useLocal ? localSpritePath(el.sprite) : remoteSpriteUrl(el.sprite);

    try {
      const sprite = await loadImage(spritePath);

      if (el.type === 'crop') {
        // 作物: 检测实际内容边界，按内容宽高比缩放
        const cacheKey = el.sprite;
        let bounds = contentBoundsCache.get(cacheKey);
        if (!bounds) {
          // 创建临时 canvas 检测内容边界
          const tmpCanvas = createCanvas(sprite.width, sprite.height);
          const tmpCtx = tmpCanvas.getContext('2d');
          tmpCtx.drawImage(sprite, 0, 0);
          bounds = getContentBounds(tmpCtx, sprite.width, sprite.height);
          contentBoundsCache.set(cacheKey, bounds);
        }

        // 用内容实际宽高比计算缩放
        const contentAspect = bounds.w / bounds.h;
        const targetW = el.w;
        const targetH = el.h;

        // 决定以宽还是高为基准：选让植物更"高挑"的方式
        const scaleByWidth = targetW / bounds.w;
        const scaleByHeight = targetH / bounds.h;
        const scale = Math.min(scaleByWidth, scaleByHeight);

        const drawW = Math.round(bounds.w * scale);
        const drawH = Math.round(bounds.h * scale);
        const drawX = x + (targetW - drawW) / 2;  // 水平居中
        const drawY = y + targetH - drawH;          // 底部贴地

        // 从原图截取内容区域绘制
        ctx.drawImage(sprite,
          bounds.x, bounds.y, bounds.w, bounds.h,  // 源: 内容区域
          drawX, drawY, drawW, drawH                // 目标: 缩放后位置
        );
      } else {
        // 树木/动物/装饰: 保持宽高比，底部对齐
        const aspectRatio = sprite.width / sprite.height;
        const drawH = w / aspectRatio;
        const drawY = y + h - drawH;
        ctx.drawImage(sprite, x, drawY, w, drawH);
      }
    } catch (err) {
      console.warn(`[renderer] Failed to load sprite "${el.sprite}": ${err.message}`);
    }
  }

  // 3. 导出 PNG
  return canvas.toBuffer('image/png');
}

/**
 * 获取当前季节
 */
export function getSeason() {
  const month = new Date().getMonth() + 1;
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
}
