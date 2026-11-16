"""
renderer.py - Pillow 像素风渲染引擎（Python 版，对应 src/renderer.js）

功能：
  - 加载背景图并放大到目标分辨率（NEAREST 最近邻，保持像素风）
  - 对每个元素精灵：按 alpha 通道裁剪内容边界 → 缩放到目标尺寸 → 贴地对齐合成
  - 输出 PNG

scale 方案：所有布局坐标基于基准分辨率（1216x832），渲染时乘以 scale。
精灵原始分辨率较高（约 250-886px），通过内容边界裁剪 + NEAREST 缩放，
既避免外围透明区域导致的"变小"，又保证放大时像素边缘锐利清晰。
"""

from pathlib import Path
from PIL import Image, ImageDraw

from themes import BASE_WIDTH, BASE_HEIGHT, FIELD, ZONES, FENCE

# alpha 阈值：低于该值视为透明（对应 JS 的 alpha > 20 判定）
ALPHA_THRESHOLD = 20

# 精灵内容边界缓存（避免重复 getbbox，按路径缓存）
_bounds_cache = {}


def _asset_dir() -> str:
    """返回 assets 目录绝对路径（项目根 /assets）"""
    return str(Path(__file__).resolve().parent.parent / "assets")


def _load_image(path: str) -> Image.Image:
    """加载图片并转 RGBA"""
    return Image.open(path).convert("RGBA")


def content_bounds(img: Image.Image):
    """
    复刻 renderer.js getContentBounds：检测精灵实际内容边界（跳过透明像素）
    返回 (x, y, w, h)，相对原图的内容区域。
    """
    alpha = img.getchannel("A")
    # 二值化：alpha > 阈值 视为有内容
    mask = alpha.point(lambda a: 255 if a > ALPHA_THRESHOLD else 0)
    bbox = mask.getbbox()  # (left, upper, right, lower)

    if bbox is None:
        w, h = img.size
        return (0, 0, w, h)

    left, upper, right, lower = bbox
    return (left, upper, right - left, lower - upper)


def _resize_nearest(img: Image.Image, width: int, height: int) -> Image.Image:
    """按目标尺寸最近邻缩放（像素风，无抗锯齿）"""
    if width <= 0 or height <= 0:
        return img
    if (img.width, img.height) == (width, height):
        return img
    return img.resize((int(width), int(height)), Image.NEAREST)


def _paste_element(canvas: Image.Image, el: dict, scale: int, sprite: Image.Image,
                   field_top: int = 0):
    """在画布上合成单个元素，处理内容边界裁剪与底部贴地"""
    x = int(round(el["x"] * scale))
    y = int(round(el["y"] * scale))
    w = el["w"] * scale
    h = el["h"] * scale

    bx, by, bw, bh = content_bounds(sprite)
    if bw == 0 or bh == 0:
        return
    crop = sprite.crop((bx, by, bx + bw, by + bh))

    # 水平翻转（动物/树/装饰的方向随机）
    if el.get("flip") and el["type"] in ("tree", "animal", "decoration"):
        crop = crop.transpose(Image.FLIP_LEFT_RIGHT)

    if el["type"] == "crop":
        # 作物：以宽/高为基准取较小缩放比例，保证不超出目标格（复刻 JS）
        scale_by_w = w / bw
        scale_by_h = h / bh
        s = min(scale_by_w, scale_by_h)
        draw_w = int(round(bw * s))
        draw_h = int(round(bh * s))
        resized = _resize_nearest(crop, draw_w, draw_h)
        draw_x = x + (w - draw_w) // 2  # 水平居中
        draw_y = y + h - draw_h        # 底部贴地
        # 约束：作物顶部不高于农田顶边，避免高秆作物长到草地上
        if field_top and draw_y < field_top * scale:
            draw_y = field_top * scale
        canvas.alpha_composite(resized, (draw_x, draw_y))
    else:
        # 树木/动物/装饰：保持宽高比，底部贴地到 el.y
        # el.y 是目标底部基准，精灵底部必须贴到 el.y（避免大元素因宽高比限制而超出）
        draw_w = w
        draw_h = int(round(draw_w * bh / bw))
        if draw_h > h:  # 超出高度上限则改为以高为基准
            draw_h = h
            draw_w = int(round(draw_h * bw / bh))
        resized = _resize_nearest(crop, draw_w, draw_h)
        draw_x = x + (w - draw_w) // 2
        draw_y = y - draw_h        # 底部贴地到 y（而非 y+h）
        # 约束：精灵底部不超出农田底边（注意单位为画布坐标）
        field_bottom = (FIELD["y"] + FIELD["h"]) * scale   # 1564 px @ scale=2
        if draw_y + draw_h > field_bottom:
            draw_y = field_bottom - draw_h
        # 树/动物/装饰不约束 field_top（避免把不同 y 行的精灵顶部都压平到同一位置）
        canvas.alpha_composite(resized, (draw_x, draw_y))


def _draw_fence(canvas: Image.Image, x1: int, y1: int, x2: int, y2: int,
                horizontal: bool, scale: int, color=FENCE["color"],
                width=FENCE["width"], post_w=FENCE["post_w"],
                post_gap=FENCE["post_gap"], height=FENCE["height"]):
    """
    在画布上绘制一段像素风木栅栏（基准坐标 × scale）。
    horizontal=True 画横向栅栏，否则画纵向栅栏。
    """
    draw = ImageDraw.Draw(canvas)
    sw = width * scale          # 主线（横梁/立柱）厚度
    spw = post_w * scale        # 短柱宽
    sgap = post_gap * scale     # 短柱间距
    svert = height * scale      # 短柱长度（向单侧伸出）

    if horizontal:
        # 横向栅栏：贯穿的水平横梁 + 一排向上伸出的短竖柱（柱尖朝上）
        base_y = (y1 + y2) // 2 * scale
        # 水平横梁（贯穿 x1..x2）
        draw.rectangle([x1 * scale, base_y - sw // 2,
                        x2 * scale, base_y + sw // 2], fill=color)
        # 短竖柱：从横梁向上伸出 svert（柱尖朝上）
        px = x1 * scale
        while px <= x2 * scale:
            draw.rectangle([px, base_y - svert,
                            px + spw, base_y], fill=color)
            px += sgap
    else:
        # 纵向栅栏：贯穿的垂直立柱 + 一排向右伸出的短横档
        base_x = (x1 + x2) // 2 * scale
        # 垂直立柱（贯穿 y1..y2）
        draw.rectangle([base_x - sw // 2, y1 * scale,
                        base_x + sw // 2, y2 * scale], fill=color)
        # 短横档：从立柱向右伸出 svert
        py = y1 * scale
        while py <= y2 * scale:
            draw.rectangle([base_x, py,
                            base_x + svert, py + spw], fill=color)
            py += sgap


def _draw_zone_fences(canvas: Image.Image, scale: int):
    """在农田内绘制分区栅栏，分隔树区/作物区/动物区/装饰区"""
    z = ZONES
    field_bottom = FIELD["y"] + FIELD["h"]  # 783
    # 树区 与 作物区 之间的竖向栅栏（x=ZONES.tree 右边界，贯穿全高）
    _draw_fence(canvas, z["tree"]["x"] + z["tree"]["w"], z["tree"]["y"],
                z["tree"]["x"] + z["tree"]["w"], field_bottom,
                horizontal=False, scale=scale)
    # 作物区 与 动物区 之间的竖向栅栏（x=ZONES.crop 右边界，贯穿全高）
    _draw_fence(canvas, z["crop"]["x"] + z["crop"]["w"], z["animal"]["y"],
                z["crop"]["x"] + z["crop"]["w"], field_bottom,
                horizontal=False, scale=scale)
    # 动物区 与 装饰区 之间的横向栅栏（y=ZONES.animal 底边界）
    _draw_fence(canvas, z["animal"]["x"], z["animal"]["y"] + z["animal"]["h"],
                z["animal"]["x"] + z["animal"]["w"], z["animal"]["y"] + z["animal"]["h"],
                horizontal=True, scale=scale)


def render_scene(elements: list, width: int = None, height: int = None,
                 scale: int = 2, assets_dir: str = None) -> Image.Image:
    """
    渲染整个场景，返回 RGBA 图像。
    width/height 为最终画布尺寸（= 基准尺寸 × scale），省略时自动计算。
    """
    assets_dir = assets_dir or _asset_dir()
    width = width or BASE_WIDTH * scale
    height = height or BASE_HEIGHT * scale

    # 1. 加载背景并放大到目标分辨率
    bg = _load_image(f"{assets_dir}/scenes/farm_field_all_cleared.png")
    if (bg.width, bg.height) != (width, height):
        bg = _resize_nearest(bg, width, height)

    canvas = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    canvas.alpha_composite(bg)

    # 2. 在农田内绘制分区栅栏
    _draw_zone_fences(canvas, scale)

    # 2. 合成元素（按数组顺序，后画的覆盖先画的）
    for el in elements:
        sprite_name = el["sprite"]
        sprite_path = f"{assets_dir}/sprites/cropped/{sprite_name}.png"
        try:
            sprite = _load_image(sprite_path)
        except FileNotFoundError:
            print(f"[renderer] Warning: sprite not found: {sprite_path}")
            continue

        try:
            _paste_element(canvas, el, scale, sprite, field_top=FIELD["y"])
        except Exception as e:  # 单元素失败不中断整体渲染
            print(f"[renderer] Warning: failed to render {sprite_name}: {e}")

    return canvas


def save_png(image: Image.Image, output_path: str):
    """保存 PNG"""
    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)
    image.convert("RGB").save(output, "PNG")
    print(f"[renderer] PNG saved to: {output} ({output.stat().st_size / 1024:.1f} KB)")


if __name__ == "__main__":
    # 简单自测：用 mock 数据渲染一张图
    import sys
    sys.path.insert(0, ".")
    from fetcher import generate_mock_data
    from layout import build_scene

    fd = generate_mock_data(seed=42)
    scene = build_scene(fd, {"username": "test"})
    img = render_scene(scene, scale=2)
    print(f"Canvas: {img.width}x{img.height}")
    save_png(img, "../dist/farm_preview.png")
