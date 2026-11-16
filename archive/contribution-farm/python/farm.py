#!/usr/bin/env python3
"""
farm.py - GitHub Farm Python 版 CLI 主入口

对应 src/index.js 的功能：
  - 用 GitHub GraphQL 抓取贡献数据（或使用 mock）
  - 构建农场场景布局
  - Pillow 渲染并输出 PNG

用法:
  python farm.py --mock
  python farm.py --username YeatsLiao --token ghp_xxx
  python farm.py --mock --scale 3 --output ../dist/farm_hd.png
"""

import argparse
import os
import sys
from pathlib import Path

# 保证 python/ 目录作为包导入路径
sys.path.insert(0, str(Path(__file__).resolve().parent))

from fetcher import fetch_contributions, generate_mock_data
from layout import build_scene
from renderer import render_scene, save_png
from themes import DEFAULT_SCALE


def parse_args():
    p = argparse.ArgumentParser(
        prog="farm",
        description="GitHub Farm - 把 GitHub 贡献渲染成 Stardew 风格像素农场",
    )
    p.add_argument("--username", default=os.environ.get("FARM_USERNAME", "YeatsLiao"),
                   help="GitHub 用户名（默认读取 FARM_USERNAME 环境变量）")
    p.add_argument("--token", default=os.environ.get("GITHUB_TOKEN", ""),
                   help="GitHub PAT（默认读取 GITHUB_TOKEN 环境变量）")
    p.add_argument("--mock", action="store_true",
                   help="使用模拟数据（无需 token，便于本地调试）")
    p.add_argument("--output", default="../dist/farm.png",
                   help="输出 PNG 路径（默认 ../dist/farm.png）")
    p.add_argument("--scale", type=int, default=DEFAULT_SCALE,
                   help=f"高清缩放因子（默认 {DEFAULT_SCALE} = 2432x1664）")
    p.add_argument("--seed", type=int, default=None,
                   help="Mock 数据随机种子（仅 --mock 模式生效）")
    return p.parse_args()


def main():
    args = parse_args()

    # 默认无 token 时回落到 mock
    if not args.token and not args.mock:
        print("[farm] No token provided, falling back to mock. Use --token or set GITHUB_TOKEN.")
        args.mock = True

    # 1. 抓数据
    if args.mock:
        print("[farm] Using mock data")
        farm_data = generate_mock_data(seed=args.seed)
    else:
        print(f"[farm] Fetching data for {args.username} ...")
        farm_data = fetch_contributions(args.username, args.token)

    print(f"[farm] Total contributions: {farm_data['total_contributions']}")
    print(f"[farm] Current streak: {farm_data['streak']['current']} days")
    print(f"[farm] Season: {farm_data['season']}")
    langs = ", ".join(l["name"] for l in farm_data["languages"]) or "(none)"
    print(f"[farm] Languages: {langs}")

    # 2. 构建场景
    elements = build_scene(farm_data, {"username": args.username})
    print(f"[farm] Scene elements: {len(elements)}")

    # 3. 渲染
    img = render_scene(elements, scale=args.scale)
    print(f"[farm] Canvas: {img.width}x{img.height}")

    # 4. 输出 PNG
    output_path = Path(args.output)
    if not output_path.is_absolute():
        output_path = Path(__file__).resolve().parent / args.output
    save_png(img, str(output_path))


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"[farm] Error: {e}", file=sys.stderr)
        sys.exit(1)