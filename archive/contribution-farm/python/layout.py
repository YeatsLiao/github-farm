"""
layout.py - 农场布局算法（Python 版，复刻 src/farm-layout.js）

流程：
  1. calculate_crops: 52 周贡献 → 7x8 网格，按贡献排序分列，形成从左到右的生长渐变
  2. calculate_trees/animals/decorations: 用种子伪随机打乱槽位分配
  3. build_scene: 按后景→前景顺序组装全部元素

所有元素坐标基于「基准分辨率 1216x832」，渲染时再乘以 scale。
"""

import random

from themes import (
    FIELD, ZONES, CELL, CROP_SPRITES, CROP_STAGE_SIZES,
    contribution_level_to_crop_stage,
    TREE_SPRITES, ANIMAL_SPRITES, DECOR_SPRITES,
    LANGUAGE_TREE_MAP, ELEMENT_SIZES,
    TREE_SLOTS, ANIMAL_SLOTS, DECOR_SLOTS,
    MAPPING, SCARECROW_SLOT,
)


# 位置抖动的最大幅度（基准分辨率），让分布不死板
JITTER = 6


# ── 种子伪随机（复刻 JS mulberry32 + hashString）──
def hash_string(s: str) -> int:
    """复刻 farm-layout.js hashString：返回 32 位无符号整数"""
    h = 0
    for ch in s:
        h = ((h * 31) + ord(ch)) & 0xFFFFFFFF
    return h


def mulberry32(seed: int):
    """复刻 farm-layout.js mulberry32：生成确定性随机数发生器"""
    seed = seed & 0xFFFFFFFF

    def rng():
        nonlocal seed
        seed = (seed + 0x6D2B79F5) & 0xFFFFFFFF
        t = seed
        t = ((t ^ (t >> 15)) * (t | 1)) & 0xFFFFFFFF
        t = ((t + ((t ^ (t >> 7)) * (t | 61))) & 0xFFFFFFFF) ^ t
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296.0

    return rng


def shuffle(arr, rng):
    """复刻 farm-layout.js shuffle：Fisher-Yates，确定性"""
    a = list(arr)
    for i in range(len(a) - 1, 0, -1):
        j = int(rng() * (i + 1))
        a[i], a[j] = a[j], a[i]
    return a


# ── 作物网格：52 周贡献 → 7x8 网格 ──
def calculate_crops(farm_data) -> list:
    crops = []
    weeks = farm_data["weeks"]
    max_cells = FIELD["cols"] * FIELD["rows"]  # 56
    # 作物网格约束在 crop 分区内
    crop_zone = ZONES["crop"]

    # 1. 收集周数据，计算每周总贡献
    week_data = []
    for week in weeks[:max_cells]:
        total = sum(d["count"] for d in week["days"])
        week_data.append({"total": total, "days": week["days"]})

    # 2. 计算百分位阈值（自适应，保证 5 阶段均匀分布）
    totals = sorted(w["total"] for w in week_data)
    n = len(totals)

    def pct(frac, fallback):
        idx = int(n * frac)
        return totals[idx] if idx < n and totals[idx] != 0 else fallback

    thresholds = [
        0,                                       # Level 0: 无贡献
        pct(0.10, 1),                            # Level 1/2 边界
        pct(0.25, 3),                            # Level 2/3 边界
        pct(0.45, 8),                            # Level 3/4 边界
        pct(0.65, 15),                           # Level 4/5 边界
    ]

    def get_level(total):
        if total == 0:
            return 0
        if total <= thresholds[1]:
            return 1
        if total <= thresholds[2]:
            return 2
        if total <= thresholds[3]:
            return 3
        if total <= thresholds[4]:
            return 4
        return 5

    # 3. 按贡献升序排序（低→高）
    week_data.sort(key=lambda w: w["total"])

    # 4. 分配到网格：左列=低贡献=种子/嫩芽，右列=高贡献=高秆/丰收
    cells_per_col = FIELD["rows"]  # 8
    grid = [[] for _ in range(FIELD["cols"])]
    for i, week in enumerate(week_data):
        col = i // cells_per_col
        if col < FIELD["cols"]:
            grid[col].append(week)

    # 5. 渲染：每列从下到上填充（底部=早期，顶部=近期）
    for col in range(FIELD["cols"]):
        if not grid[col]:
            continue
        for row_in_col, week in enumerate(grid[col]):
            level = get_level(week["total"])
            stage_idx = contribution_level_to_crop_stage(level)
            if stage_idx < 0:
                continue  # 无贡献不画

            size = CROP_STAGE_SIZES[stage_idx]
            # 网格在 crop 区内水平居中
            grid_w = FIELD["cols"] * CELL["w"]
            grid_x = crop_zone["x"] + (crop_zone["w"] - grid_w) // 2
            cell_x = grid_x + col * CELL["w"]
            # 从下到上：row_in_col=0 放最下面
            display_row = FIELD["rows"] - 1 - row_in_col
            cell_y = crop_zone["y"] + display_row * CELL["h"]

            cx = cell_x + (CELL["w"] - size["w"]) / 2
            cy = cell_y + CELL["h"] - size["h"]  # 底部贴地

            crops.append({
                "type": "crop",
                "sprite": CROP_SPRITES[stage_idx],
                "stage": stage_idx,
                "level": level,
                "x": int(round(cx)),
                "y": int(round(cy)),
                "w": size["w"],
                "h": size["h"],
            })

    return crops


# ── 灵活分布：把区域按数量等分为 n 列，每列中心 ± 抖动 ──
def distribute_in_zone(zone, count, size_w, rng, y_choices, size_h=0):
    """
    在指定区域（zone）内把 count 个元素铺成多行多列网格（错落分布）：
      - 行数 = min(可用 y 行数, count)，尽量多行铺满垂直空间
      - 列数 = ceil(count / rows)
      - 每列等距，行间错落半格（棋盘格）
      - 每行 y 不同（从 y_choices 按行取）
      - x/y ±JITTER 抖动
      - 50% 水平翻转
    返回 [(x, y, flip), ...]
    """
    if count <= 0:
        return []
    zx, zw = zone["x"], zone["w"]
    max_rows = len(y_choices)
    # 行数：尽量多，但不超过元素数 + 列数能 >= 1
    # 当 count 多时优先 3 行，count 少时 2 行
    if count >= 5 and max_rows >= 3:
        rows = 3
    elif count >= 2 and max_rows >= 2:
        rows = 2
    else:
        rows = 1
    per_row = (count + rows - 1) // rows
    slot_w = zw / max(per_row, 1)
    results = []
    for i in range(count):
        row = i // per_row
        col = i % per_row
        # 行间错落：偶数行偏移半格
        offset = (slot_w / 2) if row % 2 == 1 else 0
        col_center = zx + offset + slot_w * (col + 0.5)
        # x 抖动 + 保证整元素在 zone 内
        x_raw = col_center - size_w / 2 + (rng() - 0.5) * 2 * JITTER
        x = max(zx, min(int(round(x_raw)), zx + zw - size_w))
        # y：按行选 y_choices 中的一个（每行 y 不同，铺满垂直空间）
        y = int(round(y_choices[min(row, len(y_choices) - 1)] + (rng() - 0.5) * 2 * JITTER))
        # flip 50%
        flip = rng() < 0.5
        results.append((x, y, flip))
    return results


# ── 树木：每种 Top 语言一棵，灵活均匀分布在树区 ──
def calculate_trees(farm_data, rng) -> list:
    langs = farm_data["languages"][:MAPPING["max_trees"]]
    trees = []
    size = ELEMENT_SIZES["tree"]
    zone = ZONES["tree"]
    # 树区 y 可选值（3 行，贴地 y）
    y_choices = [400, 580, 760]
    positions = distribute_in_zone(zone, len(langs), size["w"], rng, y_choices)

    for i, lang in enumerate(langs):
        tree_idx = LANGUAGE_TREE_MAP.get(lang["name"], LANGUAGE_TREE_MAP.get("default", 0))
        sprite = TREE_SPRITES[tree_idx % len(TREE_SPRITES)]
        x, y, flip = positions[i]

        trees.append({
            "type": "tree",
            "sprite": sprite,
            "language": lang["name"],
            "x": x,
            "y": y,
            "w": size["w"],
            "h": size["h"],
            "flip": flip,
        })
    return trees


# ── 动物：PR 数量决定，灵活均匀分布在动物区 ──
def calculate_animals(farm_data, rng) -> list:
    count = min(farm_data["total_prs"] // MAPPING["animal_per_pr"], MAPPING["max_animals"])
    animals = []
    size = ELEMENT_SIZES["animal"]
    zone = ZONES["animal"]
    y_choices = [400, 530, 660]
    positions = distribute_in_zone(zone, count, size["w"], rng, y_choices)

    for i in range(count):
        sprite = ANIMAL_SPRITES[i % len(ANIMAL_SPRITES)]
        x, y, flip = positions[i]
        animals.append({
            "type": "animal",
            "sprite": sprite,
            "x": x,
            "y": y,
            "w": size["w"],
            "h": size["h"],
            "flip": flip,
        })

    # 稻草人：连续贡献 ≥ 30 天，放在动物区最后一列
    max_streak = max(farm_data["streak"].get("current", 0), farm_data["streak"].get("longest", 0))
    if max_streak >= MAPPING["scarecrow_streak"]:
        slot_w = zone["w"] / (count + 1) if count >= 0 else 0
        # 稻草人放最右一列中心
        col_center = zone["x"] + zone["w"] - slot_w * 0.5
        x = int(round(col_center - size["w"] / 2 + (rng() - 0.5) * 2 * JITTER))
        y = SCARECROW_SLOT["y"]
        animals.append({
            "type": "animal",
            "sprite": "r6c6",
            "x": x,
            "y": y,
            "w": size["w"],
            "h": size["h"],
            "is_scarecrow": True,
            "flip": False,
        })

    return animals


# ── 装饰：Issue 数量决定，灵活均匀分布在农田底部（栅栏下方） ──
def calculate_decorations(farm_data, rng) -> list:
    count = min(farm_data["total_issues"] // MAPPING["decor_per_issue"], MAPPING["max_decor"])
    decors = []
    size = ELEMENT_SIZES["decor"]
    zone = ZONES["decor"]
    # 装饰贴地 y（紧贴农田底 783）
    y_choices = [770, 775]
    positions = distribute_in_zone(zone, count, size["w"], rng, y_choices)

    for i in range(count):
        sprite = DECOR_SPRITES[i % len(DECOR_SPRITES)]
        x, y, flip = positions[i]
        decors.append({
            "type": "decoration",
            "sprite": sprite,
            "x": x,
            "y": y,
            "w": size["w"],
            "h": size["h"],
            "flip": flip,
        })
    return decors


# ── 主函数 ──
def build_scene(farm_data, options=None) -> list:
    options = options or {}
    username = options.get("username", "default")
    seed = hash_string(username)
    rng = mulberry32(seed)

    elements = []
    # 渲染顺序：后景 → 前景
    elements.extend(calculate_trees(farm_data, rng))
    elements.extend(calculate_decorations(farm_data, rng))
    elements.extend(calculate_crops(farm_data))
    elements.extend(calculate_animals(farm_data, rng))

    return elements


# 允许作为模块运行简单测试
if __name__ == "__main__":
    import sys
    sys.path.insert(0, ".")
    from fetcher import generate_mock_data

    fd = generate_mock_data(seed=42)
    scene = build_scene(fd, {"username": "test"})
    print(f"elements: {len(scene)}")
    for el in scene:
        print(f"  {el['type']:<10} {el['sprite']:<6} ({el['x']}, {el['y']}) {el['w']}x{el['h']}")
