"""
v9_prototype.py - 最小实验: 程序化 tile 渲染器原型

验证三件事:
  1. 程序化地面 (草地 tile 变体 + 耕地 + 围栏 + 小径) 能否撑起"场景感"
  2. 代码画的 5 阶段作物种进耕地是否成立
  3. AI 精灵经调色板量化 + 阴影 + Y-sort 后能否融入场景

输出: dist/farm_v9_proto.png
"""

from PIL import Image, ImageDraw
import numpy as np
import random
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / 'assets' / 'sprites' / 'cropped'
OUT = ROOT / 'dist' / 'farm_v9_proto.png'

# ── 画布规格: 内部 30x20 tile (16px), 2x 最近邻放大 ──
TILE = 16
TW, TH = 30, 20
SCALE = 2

rng = random.Random(42)  # 固定种子, 布局可复现

# ── 统一调色板 (所有程序化绘制 + 精灵量化共用) ──
PAL = {
    'grass0': (86, 145, 60), 'grass1': (98, 160, 68), 'grass2': (112, 174, 78),
    'grass_dark': (66, 118, 48), 'grass_blade': (76, 132, 54),
    'soil0': (148, 100, 62), 'soil1': (134, 89, 55), 'soil2': (118, 77, 47),
    'soil_hl': (163, 114, 73),
    'wood0': (122, 79, 45), 'wood1': (99, 63, 36), 'wood2': (143, 96, 57),
    'path0': (205, 176, 122), 'path1': (190, 159, 108), 'path_edge': (160, 130, 86),
    'wheat0': (216, 178, 82), 'wheat1': (192, 152, 62), 'wheat2': (230, 197, 105),
    'stem0': (84, 142, 55), 'stem1': (66, 120, 46), 'stem2': (104, 162, 70),
    'shadow': (30, 50, 30),
}

PALETTE_RGB = list(PAL.values()) + [
    # 精灵通用色阶 (供 AI 素材量化吸附, 程序化地面不使用)
    (245, 245, 240), (210, 210, 205), (150, 150, 148),   # 白/浅灰
    (70, 58, 50), (35, 30, 28),                          # 深棕轮廓/黑
    (205, 70, 55), (160, 48, 42), (235, 110, 85),        # 红系 (鸡冠/谷仓)
    (225, 145, 65), (190, 112, 52),                      # 橙系
    (240, 226, 192), (222, 202, 162),                    # 奶油/麦程亮部
    (52, 92, 42), (132, 192, 92),                        # 补充绿阶
    # 棕系 (树干/木料) 与中性色补充
    (105, 70, 45), (140, 92, 58), (90, 60, 40), (60, 42, 30),
    (168, 106, 66),                                        # 暖棕 (树干)
    (118, 106, 96), (190, 180, 170),                      # 灰系
]

canvas = Image.new('RGBA', (TW * TILE, TH * TILE), PAL['grass0'])
draw = ImageDraw.Draw(canvas)


# ══════════════ 第一层: 地面 ══════════════

def px(x, y, color):
    draw.point((x, y), fill=color)


def draw_grass_tile(tx, ty):
    """草地 tile: 底色变体 + 随机草叶像素"""
    base = rng.choice([PAL['grass0']] * 3 + [PAL['grass1']] * 3 + [PAL['grass2']])
    draw.rectangle([tx * TILE, ty * TILE, (tx + 1) * TILE - 1, (ty + 1) * TILE - 1],
                   fill=base)
    for _ in range(rng.randint(2, 4)):
        bx = tx * TILE + rng.randrange(TILE)
        by = ty * TILE + rng.randrange(TILE)
        px(bx, by, rng.choice([PAL['grass_blade'], PAL['grass_dark']]))
        if by + 1 < TH * TILE:
            px(bx, by + 1, PAL['grass_dark'])


# 整片草地
for ty in range(TH):
    for tx in range(TW):
        draw_grass_tile(tx, ty)

# ── 耕地区域 (tile 坐标): x 8~23, y 8~15 ──
F0, F1, G0, G1 = 8, 23, 8, 15

def draw_soil_tile(tx, ty):
    """耕地 tile: 棕色底 + 土块噪点 + 断续垄沟 (避免横纹看起来像木板)"""
    x0, y0 = tx * TILE, ty * TILE
    base = rng.choice([PAL['soil0']] * 4 + [PAL['soil1']] * 2)
    draw.rectangle([x0, y0, x0 + TILE - 1, y0 + TILE - 1], fill=base)
    # 土块噪点
    for _ in range(rng.randint(6, 10)):
        sx = x0 + rng.randrange(TILE)
        sy = y0 + rng.randrange(TILE)
        px(sx, sy, rng.choice([PAL['soil2'], PAL['soil1'], PAL['soil_hl']]))
    # 垄沟: 每 4px 一行短暗线 (随机起止, 不贯通) + 下方高光
    for fy in (3, 7, 11, 15):
        sx = x0 + rng.randrange(0, 4)
        ex = x0 + rng.randrange(TILE - 3, TILE)
        draw.line([sx, y0 + fy, ex, y0 + fy], fill=PAL['soil2'])
        if ex - sx > 6:
            draw.line([sx + 2, y0 + fy + 1, ex - 2, y0 + fy + 1], fill=PAL['soil_hl'])

for ty in range(G0, G1 + 1):
    for tx in range(F0, F1 + 1):
        draw_soil_tile(tx, ty)

# 耕地边缘暗线, 与草地分离
draw.rectangle([F0 * TILE, G0 * TILE, (F1 + 1) * TILE - 1, (G1 + 1) * TILE - 1],
               outline=PAL['soil2'])

# ── 小径: 从田地底部缺口向下延伸到画面底部 ──
GATE_X = 15  # 围栏缺口列
for ty in range(G1 + 2, TH):
    for tx in (GATE_X, GATE_X + 1):
        x0, y0 = tx * TILE, ty * TILE
        draw.rectangle([x0, y0, x0 + TILE - 1, y0 + TILE - 1], fill=PAL['path0'])
        for _ in range(4):
            px(x0 + rng.randrange(TILE), y0 + rng.randrange(TILE), PAL['path1'])
        # 小径边缘
        if tx == GATE_X:
            draw.rectangle([x0, y0, x0, y0 + TILE - 1], fill=PAL['path_edge'])
        else:
            draw.rectangle([x0 + TILE - 1, y0, x0 + TILE - 1, y0 + TILE - 1],
                           fill=PAL['path_edge'])

# ── 草地散布细节: 草丛 / 小花 (抖动网格) ──
for ty in range(1, TH - 1):
    for tx in range(1, TW - 1):
        if F0 - 2 <= tx <= F1 + 2 and G0 - 3 <= ty <= G1 + 3:
            continue  # 避开田地与围栏
        if rng.random() < 0.10:
            jx = tx * TILE + rng.randrange(4, 12)
            jy = ty * TILE + rng.randrange(4, 12)
            if rng.random() < 0.8:  # 草丛
                px(jx, jy, PAL['grass_dark'])
                px(jx - 1, jy + 1, PAL['grass_dark'])
                px(jx + 1, jy + 1, PAL['grass_dark'])
            else:  # 小花
                px(jx, jy, rng.choice([(230, 90, 90), (235, 220, 90), (220, 220, 230)]))
                px(jx, jy + 1, PAL['grass_dark'])


# ══════════════ 第二层: 实体 (Y-sort) ══════════════
# 每个实体: (base_y, draw_fn), base_y = 脚底 y 坐标, 升序绘制

entities = []


def add_shadow(x, y, w):
    """落地阴影: 半透明椭圆"""
    ov = Image.new('RGBA', canvas.size, (0, 0, 0, 0))
    od = ImageDraw.Draw(ov)
    od.ellipse([x - w // 2, y - 2, x + w // 2, y + 3],
               fill=PAL['shadow'] + (70,))
    return ov


# ── 围栏: 拆成 1-tile 宽的段, 才能参与 Y-sort 遮挡 ──
def fence_segment(tx, ty):
    def _draw():
        x0, y0 = tx * TILE, ty * TILE
        # 横栏通铺整段 (相邻段自然衔接)
        draw.rectangle([x0, y0 + 4, x0 + TILE - 1, y0 + 6], fill=PAL['wood2'])
        draw.rectangle([x0, y0 + 5, x0 + TILE - 1, y0 + 5], fill=PAL['wood1'])
        draw.rectangle([x0, y0 + 10, x0 + TILE - 1, y0 + 12], fill=PAL['wood0'])
        draw.rectangle([x0, y0 + 11, x0 + TILE - 1, y0 + 11], fill=PAL['wood1'])
        # 立柱只在偶数段画, 避免过密
        if tx % 2 == 0 or ty % 2 == 0:
            px_ = x0 + TILE // 2 - 1
            draw.rectangle([px_, y0 + 1, px_ + 2, y0 + 15], fill=PAL['wood1'])
            draw.rectangle([px_, y0 + 1, px_ + 2, y0 + 1], fill=PAL['wood2'])
    entities.append((ty * TILE + 14, _draw))

for tx in range(F0 - 1, F1 + 2):
    if tx in (GATE_X - 1, GATE_X, GATE_X + 1, GATE_X + 2):
        continue  # 底部留门
    fence_segment(tx, G1 + 1)      # 南围栏 (带门缺口)
    fence_segment(tx, G0 - 2)      # 北围栏
for ty in range(G0 - 1, G1 + 2):
    fence_segment(F0 - 1, ty)      # 西围栏
    fence_segment(F1 + 1, ty)      # 东围栏

# ── 代码画作物: 5 阶段, 底部锚点 (bx, by) ──
def crop_stage0(bx, by):
    """种子: 土里一颗籽"""
    draw.rectangle([bx - 1, by, bx + 1, by], fill=PAL['soil2'])
    px(bx, by, (120, 84, 50))


def crop_stage1(bx, by):
    """嫩芽: 3px 小苗"""
    px(bx, by - 2, PAL['stem2'])
    px(bx, by - 1, PAL['stem0'])
    px(bx - 1, by - 2, PAL['stem0'])
    px(bx + 1, by - 3, PAL['stem2'])


def crop_stage2(bx, by):
    """成长: 有叶片的植株"""
    for i in range(5):
        px(bx, by - i, PAL['stem0'])
    px(bx - 1, by - 3, PAL['stem2'])
    px(bx - 2, by - 4, PAL['stem2'])
    px(bx + 1, by - 4, PAL['stem0'])
    px(bx + 2, by - 5, PAL['stem2'])
    px(bx, by - 5, PAL['stem2'])


def crop_stage3(bx, by):
    """高秆: 细长秸秆"""
    for i in range(9):
        px(bx, by - i, PAL['stem1'] if i % 2 else PAL['stem0'])
    px(bx - 1, by - 5, PAL['stem2'])
    px(bx - 2, by - 6, PAL['stem2'])
    px(bx + 1, by - 6, PAL['stem0'])
    px(bx + 2, by - 7, PAL['stem2'])
    px(bx - 1, by - 8, PAL['stem0'])
    px(bx, by - 9, PAL['stem2'])


def crop_stage4(bx, by):
    """丰收: 金色麦穗"""
    for i in range(11):
        px(bx, by - i, PAL['wheat1'] if i % 2 else PAL['wheat0'])
    # 麦穗: 顶部金色交错
    for dy, dxs in [(11, [0]), (12, [-1, 1]), (13, [0]), (14, [-1, 1]), (15, [0])]:
        for dx in dxs:
            px(bx + dx, by - dy, rng.choice([PAL['wheat0'], PAL['wheat2']]))
    px(bx, by - 16, PAL['wheat2'])
    # 侧叶
    px(bx - 1, by - 6, PAL['wheat1'])
    px(bx + 1, by - 7, PAL['wheat1'])

CROP_FNS = [crop_stage0, crop_stage1, crop_stage2, crop_stage3, crop_stage4]

# ── 种田: 全部耕地铺满 (16x8), 列 = 生长阶段渐变 (左→右) ──
for ci, col in enumerate(range(F0, F1 + 1)):
    stage = min(ci // 3, 4)  # 16 列从左到右走完 5 个阶段
    for row in range(G0, G1 + 1):
        bx = col * TILE + TILE // 2 + rng.randint(-2, 2)
        by = row * TILE + TILE // 2 + rng.randint(-1, 3)
        fn = CROP_FNS[stage]
        base_y = by + 1
        entities.append((base_y, (lambda f, x, y: lambda: f(x, y))(fn, bx, by)))


# ── AI 精灵: 裁边 → 缩放 → 最近邻调色板映射 ──
def load_quantized(path, target_h):
    im = Image.open(path).convert('RGBA')
    bb = im.getbbox()
    im = im.crop(bb)
    ratio = target_h / im.height
    new_w = max(1, round(im.width * ratio))
    im = im.resize((new_w, target_h), Image.LANCZOS)
    # alpha 阈值化, 去掉半透明毛边
    r, g, b, a = im.split()
    a = a.point(lambda v: 255 if v > 110 else 0)
    # 手工最近邻映射到统一色板 (比 PIL.quantize 可控, 不依赖调色板索引技巧)
    arr = np.dstack((np.asarray(r), np.asarray(g), np.asarray(b))).astype(np.int32)
    pal = np.array(PALETTE_RGB, dtype=np.int32)          # (N, 3)
    dist = ((arr[:, :, None, :] - pal[None, None, :, :]) ** 2).sum(axis=3)
    idx = dist.argmin(axis=2)
    mapped = pal[idx].astype(np.uint8)
    out = Image.fromarray(mapped, 'RGB').convert('RGBA')
    out.putalpha(a)
    return out


tree1 = load_quantized(ASSETS / 'r5c2.png', 46)
tree2 = load_quantized(ASSETS / 'r5c4.png', 42)
chick = load_quantized(ASSETS / 'r6c1.png', 13)

def sprite_entity(img, cx, base_y):
    def _draw():
        sh = add_shadow(cx, base_y, int(img.width * 0.8))
        canvas.alpha_composite(sh)  # 原地合成, 不重新赋值 canvas
        canvas.alpha_composite(img, (cx - img.width // 2, base_y - img.height + 2))
    entities.append((base_y, _draw))

# 树在田地北侧 (围栏后方), 动物在东侧草地
sprite_entity(tree1, 6 * TILE, (G0 - 2) * TILE + 10)
sprite_entity(tree2, 26 * TILE, (G0 - 2) * TILE + 12)
sprite_entity(chick, 26 * TILE, 12 * TILE)

# ── Y-sort 绘制 ──
entities.sort(key=lambda e: e[0])
for _, fn in entities:
    fn()

# ══════════════ 输出: 整数倍放大 ══════════════
out = canvas.resize((canvas.width * SCALE, canvas.height * SCALE), Image.NEAREST)
OUT.parent.mkdir(parents=True, exist_ok=True)
out.convert('RGB').save(OUT)
print(f'[v9-proto] saved -> {OUT} ({out.size[0]}x{out.size[1]})')
