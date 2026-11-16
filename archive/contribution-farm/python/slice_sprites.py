#!/usr/bin/env python3
"""
slice_sprites.py - 从大图集自动切割精灵

数据源：assets/scenes/reference-spritesheet.png（2848x1600，米色背景无 alpha）
目标：按连通块切出每个独立精灵，米色背景转透明，输出到 assets/sprites/sliced/ 目录。

用法：
  python slice_sprites.py [--source PATH] [--out DIR] [--bg-color R,G,B] [--tol 15] [--min-size 40]

说明：
  - 默认米色背景 (241,228,209)，容差 tol 内视为背景 → 透明
  - 用 8 邻域连通块标记找出每个精灵的包围盒
  - 每个连通块裁剪并另存为独立 PNG（RGBA）
  - 小于 min-size 的噪声块会被丢弃
"""

import argparse
import os
from collections import deque
from pathlib import Path

from PIL import Image


def build_mask(img, bg, tol):
    """构建背景 mask：True=非背景（内容），False=背景"""
    w, h = img.size
    px = img.load()
    mask = bytearray(w * h)
    for y in range(h):
        base = y * w
        for x in range(w):
            r, g, b = px[x, y][:3]
            if not (abs(r - bg[0]) <= tol and abs(g - bg[1]) <= tol and abs(b - bg[2]) <= tol):
                mask[base + x] = 1
    return mask


def find_blocks(mask, w, h, min_size):
    """8 邻域连通块标记，返回每个块的像素集合（近似用 bbox 记录即可）"""
    visited = bytearray(w * h)
    blocks = []
    for sy in range(h):
        row = sy * w
        for sx in range(w):
            if visited[row + sx] or not mask[row + sx]:
                continue
            # BFS
            q = deque([(sx, sy)])
            visited[row + sx] = 1
            minx = maxx = sx
            miny = maxy = sy
            count = 0
            while q:
                x, y = q.popleft()
                count += 1
                if x < minx: minx = x
                if x > maxx: maxx = x
                if y < miny: miny = y
                if y > maxy: maxy = y
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        if dx == 0 and dy == 0:
                            continue
                        nx, ny = x + dx, y + dy
                        if 0 <= nx < w and 0 <= ny < h:
                            ni = ny * w + nx
                            if not visited[ni] and mask[ni]:
                                visited[ni] = 1
                                q.append((nx, ny))
            if count >= min_size:
                blocks.append((minx, miny, maxx, maxy, count))
    # 按位置排序（从上到下，从左到右）
    blocks.sort(key=lambda b: (b[1], b[0]))
    return blocks


def transparentize_block(img, box, bg, tol):
    """把块区域内的背景像素转透明"""
    l, u, r, d = box
    crop = img.crop((l, u, r + 1, d + 1)).convert("RGBA")
    px = crop.load()
    for y in range(crop.height):
        for x in range(crop.width):
            r_, g_, b_, _ = px[x, y]
            if abs(r_ - bg[0]) <= tol and abs(g_ - bg[1]) <= tol and abs(b_ - bg[2]) <= tol:
                px[x, y] = (0, 0, 0, 0)
    return crop


def main():
    root = Path(__file__).resolve().parent.parent
    p = argparse.ArgumentParser(description="从大图集切割精灵")
    p.add_argument("--source", default=str(root / "assets/scenes/reference-spritesheet.png"))
    p.add_argument("--out", default=str(root / "assets/sprites/sliced"))
    p.add_argument("--bg-color", default="241,228,209", help="背景色 R,G,B")
    p.add_argument("--tol", type=int, default=15, help="背景色容差")
    p.add_argument("--min-size", type=int, default=80, help="最小连通块像素数")
    args = p.parse_args()

    img = Image.open(args.source).convert("RGB")
    w, h = img.size
    bg = tuple(int(v) for v in args.bg_color.split(","))
    print(f"source: {args.source}  ({w}x{h})  bg={bg}")

    mask = build_mask(img, bg, args.tol)
    blocks = find_blocks(mask, w, h, args.min_size)
    print(f"found {len(blocks)} blocks")

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)
    for i, (minx, miny, maxx, maxy, count) in enumerate(blocks, 1):
        bw = maxx - minx + 1
        bh = maxy - miny + 1
        if bw < 3 or bh < 3:
            continue
        crop = transparentize_block(img, (minx, miny, maxx, maxy), bg, args.tol)
        fname = f"s{len(str(len(blocks))):0>{len(str(len(blocks)))}}-{i}.png"
        crop.save(out_dir / f"sprite_{i:03d}_{bw}x{bh}.png")
    print(f"saved {len(blocks)} sprites to {out_dir}")


if __name__ == "__main__":
    main()
