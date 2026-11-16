"""
themes.py - 主题配置（Python 版，复刻并调整 src/themes/stardew.js）

设计要点：
- 保留 stardew.js 的布局比例（FIELD/CELL/槽位坐标），这些是基于 1216x832 背景标定的。
- 所有坐标、尺寸、槽位都表达在「基准分辨率 1216x832」上，渲染时乘以 scale 因子放大。
  默认 scale=2（2432x1664），精灵用 NEAREST 最近邻缩放，保持像素风并显著提升清晰度。
- 这样无需为高清重绘背景，也无需重新标定每个槽位，协调性天然保持一致。
"""

# ── 基准画布尺寸（对应 assets/scenes/farm_field_all_cleared.png）──
BASE_WIDTH = 1216
BASE_HEIGHT = 832

# 渲染分辨率 = 基准尺寸 × scale
DEFAULT_SCALE = 2


# ── 农田区域（背景图实测，基准分辨率）──
# 背景 assets/scenes/farm_field_all_cleared.png 中棕色土地区域：
#   实测 x∈[20, 1180]，y∈[346, 783]
FIELD = {
    "x": 20,
    "y": 352,
    "w": 1160,
    "h": 430,
    "cols": 7,
    "rows": 8,
}

# ── 农田内部分区（用栅栏分隔）──
# 用户要求：动物、植物、树木都划分到农田内各自的区域，不超出农田。
# 布局：左=树区（容纳 4 棵均匀分布的大树），中=作物区，右=动物区，底部=装饰区。
ZONES = {
    "tree":    {"x": 20,  "y": 362, "w": 380, "h": 410},   # 左侧：树（宽到 380）
    "crop":    {"x": 410, "y": 408, "w": 440, "h": 352},   # 中间：作物网格
    "animal":  {"x": 860, "y": 362, "w": 320, "h": 330},   # 右侧：动物
    "decor":   {"x": 410, "y": 765, "w": 770, "h": 18},    # 农田底部窄带：装饰
}

# 作物网格配置（约束在 crop 区内）
CELL = {
    "w": ZONES["crop"]["w"] // FIELD["cols"],  # ~62
    "h": ZONES["crop"]["h"] // FIELD["rows"],  # 44
}

# 栅栏绘制参数（基准分辨率，渲染时乘 scale）
FENCE = {
    "color": (131, 58, 24),   # 与背景栅栏一致的深木色
    "width": 10,              # 主线（横梁/立柱）厚度
    "post_w": 10,             # 短柱宽度
    "post_gap": 22,           # 短柱间距
    "height": 32,             # 短柱向单侧伸出长度
}


# ── 作物生长阶段精灵（5 阶段）──
CROP_SPRITES = ["r1c1", "r1c2", "r1c3", "r1c4", "r1c5"]

# 每个阶段的渲染尺寸（基准分辨率），阶段越高植物越大
CROP_STAGE_SIZES = [
    {"w": 30, "h": 20},   # Stage 0: 种子
    {"w": 40, "h": 35},   # Stage 1: 嫩芽
    {"w": 55, "h": 55},   # Stage 2: 成长
    {"w": 65, "h": 80},   # Stage 3: 高秆
    {"w": 70, "h": 100},  # Stage 4: 丰收
]


def contribution_level_to_crop_stage(level: int) -> int:
    """复刻 stardew.js contributionLevelToCropStage：贡献等级 → 作物阶段 (-1=不画)"""
    if level <= 0:
        return -1
    if level == 1:
        return 0
    if level == 2:
        return 1
    if level == 3:
        return 2
    if level == 4:
        return 3
    return 4


# ── 精灵组 ──
TREE_SPRITES = ["r5c1", "r5c2", "r5c3", "r5c4", "r5c5", "r5c6"]
ANIMAL_SPRITES = ["r6c1", "r6c2", "r6c3", "r6c4", "r6c5", "r6c6"]
DECOR_SPRITES = ["r7c1", "r7c2", "r7c3", "r7c4", "r7c5"]

# ── 元素渲染尺寸（基准分辨率）──
# 树和动物明显大于作物，体现 Stardew 比例感
ELEMENT_SIZES = {
    "crop": {"w": 70, "h": 100},   # 作物（保持较小）
    "tree": {"w": 70, "h": 110},   # 树
    "animal": {"w": 70, "h": 70},  # 动物
    "decor": {"w": 40, "h": 40},   # 装饰
}

# ── 树木位置槽（左侧树区内，3 行 3 列容纳 5 棵大树）──
TREE_SLOTS = [
    {"x": 80,  "y": 750},
    {"x": 165, "y": 750},
    {"x": 250, "y": 750},
    {"x": 80,  "y": 660},
    {"x": 165, "y": 660},
    {"x": 250, "y": 660},
    {"x": 80,  "y": 570},
    {"x": 165, "y": 570},
    {"x": 250, "y": 570},
]

# ── 动物位置槽（右侧动物区内，4 行 2 列容纳 5 只大动物 + 稻草人）──
# 注意：避开底部装饰区（y≥700），动物贴地 y 最大 650
ANIMAL_SLOTS = [
    {"x": 950,  "y": 430},
    {"x": 1040, "y": 430},
    {"x": 950,  "y": 520},
    {"x": 1040, "y": 520},
    {"x": 950,  "y": 610},
    {"x": 1040, "y": 610},
    {"x": 950,  "y": 700},
]

# ── 装饰位置槽（右下装饰区底部一行）──
DECOR_SLOTS = [
    {"x": 920,  "y": 740},
    {"x": 990,  "y": 740},
    {"x": 1060, "y": 740},
    {"x": 1130, "y": 740},
    {"x": 60,   "y": 770},
    {"x": 140,  "y": 770},
    {"x": 220,  "y": 770},
]

# ── 贡献 -> 元素数量映射 ──
MAPPING = {
    "max_trees": 5,
    "max_animals": 5,
    "max_decor": 5,
    "animal_per_pr": 8,
    "decor_per_issue": 6,
    "scarecrow_streak": 30,
}

# 稻草人固定位置（动物区中央，基准分辨率）
SCARECROW_SLOT = {"x": 1095, "y": 500}

# ── 语言 -> 树木精灵索引 ──
LANGUAGE_TREE_MAP = {
    "JavaScript": 0,
    "TypeScript": 1,
    "Python": 2,
    "Java": 3,
    "Go": 4,
    "Rust": 5,
    "C++": 4,
    "C": 5,
    "Ruby": 0,
    "PHP": 1,
    "Swift": 2,
    "Kotlin": 3,
}
