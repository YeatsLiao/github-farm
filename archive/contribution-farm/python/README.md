# GitHub Farm - Python 版

> 用 Python + Pillow 重写的 GitHub 贡献农场图生成器。
> 与仓库根目录的 JS 版（`src/`）并存，提供更轻量的依赖与更高清的输出。

## 为什么需要 Python 版？

原 JS 版依赖 `npm canvas`（node-canvas），需要 node-gyp 在 Windows 上编译原生模块，
部署/调试较重。本分支用 **纯 Python（requests + Pillow）** 重新实现：

- **无原生编译**：Pillow 提供官方 wheel，pip 直接安装
- **更高清的输出**：默认 2x scale（2432×1664），可 `--scale 3` 提到 3x（3648×2496）
- **像素风保持**：Pillow `Image.NEAREST` 最近邻缩放，等价 JS `imageSmoothingEnabled=false`
- **同源 assets**：复用仓库 `assets/` 中的精灵与背景，无需重绘美术
- **CI 友好**：GitHub Actions 使用 `setup-python` 即可，无需安装系统级编译工具链

## 文件结构

```
python/
├── farm.py            # CLI 主入口（对应 src/index.js）
├── fetcher.py         # GitHub GraphQL 抓取 + mock 数据（对应 src/fetcher.js）
├── layout.py          # 布局算法（对应 src/farm-layout.js）
├── renderer.py        # Pillow 渲染引擎（对应 src/renderer.js）
├── themes.py          # 主题配置（对应 src/themes/stardew.js）
├── slice_sprites.py   # 大图集自动切片工具（米色背景→透明 RGBA）
├── requirements.txt   # 依赖清单
└── README.md          # 本文件
```

## 农场分区布局

农田区域被划分为 4 个明确的子区，**所有精灵都在农田内**，栅栏分隔各区：

| 子区 | 位置 | 元素 |
|---|---|---|
| **树区**（左） | `x∈[40,330]` | 最多 5 棵**大树**（110×160，按 Top 语言） |
| **作物区**（中） | `x∈[340,880]` | 7×8 作物网格（70×100 较小） |
| **动物区**（右） | `x∈[890,1180]` | 最多 5 只**大动物**（80×80，按 PR 数） |
| **装饰区**（右下） | `x∈[890,1180]` | 最多 4 个装饰（50×50）+ 稻草人 |

栅栏绘制由 `renderer._draw_fence` 实现（贯穿主线 + 单侧伸出密柱的 Stardew 风格）。
坐标在 `themes.py` 的 `ZONES` 中定义，调整各区宽高即可改变布局。

**比例原则**：树、动物、装饰明显大于作物，体现 Stardew 农场感：
- 作物：70×100（保持小，体现密集网格）
- 树：110×160（最大）
- 动物：80×80
- 装饰：50×50

所有元素都通过 `renderer._paste_element` 的 `field_top / field_bottom` 约束**严格限制在农田范围内**
（农田区域 `FIELD = {x:20, y:352, w:1160, h:430}`）。

模块与 JS 源码一一对应，便于移植与对照。

## 安装

```bash
cd python
pip install -r requirements.txt
```

依赖：`requests>=2.31`, `Pillow>=10`。

## 用法

### 1. 命令行（本地）

```bash
# Mock 模式（无需 token，生成示例图）
python farm.py --mock

# 使用真实 GitHub 数据（需 PAT）
python farm.py --username YeatsLiao --token ghp_xxx

# 也支持环境变量：FARM_USERNAME、GITHUB_TOKEN
GITHUB_TOKEN=ghp_xxx python farm.py

# 自定义输出路径与高清倍率
python farm.py --mock --scale 3 --output ../dist/farm_3x.png
```

### 2. 参数说明

| 参数 | 默认值 | 说明 |
|---|---|---|
| `--username` | `YeatsLiao` 或 `FARM_USERNAME` | GitHub 用户名 |
| `--token` | `GITHUB_TOKEN` | GitHub PAT（`user` 权限即可） |
| `--mock` | `false` | 使用 mock 数据（无需 token） |
| `--output` | `../dist/farm.png` | 输出 PNG 路径 |
| `--scale` | `2` | 高清倍率（2=2432×1664，3=3648×2496） |
| `--seed` | 随机 | mock 模式随机种子 |

> 默认无 token 时会自动 fallback 到 mock 模式。

### 3. GitHub Actions（自动）

原工作流保存在 [归档](../workflows/python.yml)。

- **定时**：每天 UTC 0 点跑一次
- **手动**：在 Actions 页面 Run workflow，可指定 username 与 scale
- **提交**：自动 commit 并 push `dist/farm.png` 回当前分支（带 `[skip ci]` 避免递归）

在 fork 或新建仓库时，只需：

1. 启用仓库的 Actions 写权限（默认开启）
2. Secrets 里的 `GITHUB_TOKEN` 由 GitHub 自动提供，无需手动配置

## 数据流程

```text
fetcher.py  →  layout.py  →  renderer.py  →  farm.png
   │              │              │
   │              │              └ Pillow Image 合成
   │              └ mulberry32 种子伪随机 + 槽位分配
   └ GitHub GraphQL（weeks / streak / languages / PR / Issue）
```

数据形态与 `src/fetcher.js` 完全兼容，复刻了：
- 52 周贡献 → 7x8 网格按贡献排序分列（左列=低贡献=种子，右列=高贡献=丰收）
- Top 语言 → 树木精灵（按 LANGUAGE_TREE_MAP）
- PR 数 → 动物
- Issue 数 → 装饰
- 连续贡献 ≥ 30 天 → 稻草人

## 与 JS 版的输出对比

| 维度 | JS 版 | Python 版 |
|---|---|---|
| 默认画布 | 1216×832 | 2432×1664（2x） |
| 依赖 | `canvas@3.x`（node-gyp） | `Pillow`（纯 Python wheel） |
| 安装 | 需 MSVC / Xcode / gcc | `pip install` 即可 |
| 缩放算法 | canvas 内置 + `imageSmoothingEnabled=false` | `Image.NEAREST` |
| 内容边界裁剪 | `getContentBounds()` JS 复刻 | `getbbox()` + alpha mask |
| 数据形态 | `{ weeks, streak, languages, ... }` | 完全相同 |

## 精灵切片工具

`slice_sprites.py` 从 `assets/scenes/reference-spritesheet.png`（2848×1600 米色背景大图集）
自动按连通块切出独立精灵，米色背景转透明，输出 RGBA PNG 到 `assets/sprites/sliced/`：

```bash
cd python
python slice_sprites.py                    # 默认：切到 ../assets/sprites/sliced/
python slice_sprites.py --min-size 40      # 调整最小连通块像素数（去噪）
```

> **注意**：切片后的精灵与 `assets/sprites/cropped/` 现有 24 个精灵**来自不同图源**（AI 生成的
> 大图集 vs 之前手工切的图集），外观差异较大。如需替换主精灵库，请同步修改 `themes.py` 中的
> `CROP_STAGE_SIZES / ELEMENT_SIZES / CROP_SPRITES / TREE_SPRITES / ANIMAL_SPRITES / DECOR_SPRITES`
> 以匹配新精灵的比例。

## Roadmap

- [ ] 多主题支持（春/夏/秋/冬，参考 stardew.js 多主题路线图）
- [ ] SVG 中间层，便于在线预览工具二次开发
- [ ] 单元测试（fetch 解析 / layout 算法 / 渲染输出稳定性）

## 相关文档

- 仓库根 `README.md` - 总览与 JS 版说明
- `docs/PRD.md` - 产品需求
- `docs/ARCHITECTURE.md` - 架构设计
- `docs/DEVLOG.md` - 开发日志

## License

MIT（同根目录 `LICENSE`）
