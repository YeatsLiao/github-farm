# GitHub Farm - 架构设计文档

> 当前版本：v8（Canvas 像素风渲染）

---

## 1. 系统架构总览

```
┌─────────────────────────────────────────────────────┐
│                    用户入口层                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │ CLI 本地  │  │ GitHub   │  │ 本地预览 (dev)    │  │
│  │ npm run  │  │ Action   │  │ npm run dev       │  │
│  │ build    │  │ 定时触发  │  │ localhost:3000    │  │
│  └────┬─────┘  └────┬─────┘  └────────┬─────────┘  │
│       └──────────────┼────────────────┘             │
└──────────────────────┼──────────────────────────────┘
                       │
───────────────────────┼──────────────────────────────┐
│                    核心逻辑层                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │ fetcher  │→│  layout  │→│   renderer         │  │
│  │ 数据获取  │  │ 布局算法  │  │  Canvas 渲染引擎  │  │
│  └──────────┘  └──────────┘  └────────┬─────────┘  │
│                                        │             │
│  ┌─────────────────────────────────────┘             │
│  │  themes/ (主题配置层)                              │
│  │  stardew.js                                       │
│  └──────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────┘
                       │
───────────────────────┼──────────────────────────────┐
│                    数据/资源层                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │ GitHub   │  │ assets/  │  │ dist/            │  │
│  │ GraphQL  │  │ sprites/ │  │ 输出 PNG          │  │
│  │ API      │  │ scenes/  │  │                  │  │
│  └──────────┘  └──────────┘  └──────────────────┘  │
└──────────────────────────────────────────────────────┘
```

## 2. 模块设计

### 2.1 fetcher.js — 数据获取层

**职责**：从 GitHub GraphQL API 获取贡献数据，解析为结构化对象

**输入**：username, token  
**输出**：FarmData 对象

```
FarmData {
  totalContributions: number
  weeks: Week[]
    └── days: Day[]
          └── { count, date, weekday, level(0-4) }
  streak: { current, longest }
  totalPRs: number
  totalIssues: number
  totalRepos: number
  languages: [{ name, color, count }]
  season: 'spring'|'summer'|'autumn'|'winter'
}
```

**依赖**：无外部依赖，使用原生 fetch

### 2.2 themes/stardew.js — 主题配置层

**职责**：定义星露谷主题的画布尺寸、精灵映射、布局参数

**导出**：
- `CANVAS` — 画布尺寸 (1216x832)
- `FIELD` / `CELL` — 农田网格配置 (7列×8行)
- `CROP_SPRITES` / `CROP_STAGE_SIZES` — 5 阶段作物精灵与尺寸
- `TREE_SPRITES` / `ANIMAL_SPRITES` / `DECOR_SPRITES` — 树木/动物/装饰精灵
- `TREE_SLOTS` / `ANIMAL_SLOTS` / `DECOR_SLOTS` — 元素位置槽
- `LANGUAGE_TREE_MAP` — 编程语言→树木精灵映射
- `MAPPING` — 贡献→元素数量映射规则

### 2.3 farm-layout.js — 布局算法层

**职责**：将 FarmData 转换为场景元素列表（带坐标）

**核心函数**：
- `calculateCrops(farmData)` — 52 周贡献按总量升序排序，分列填充 7×8 网格，低贡献→左列（种子），高贡献→右列（丰收），百分位自适应阈值
- `calculateTrees(farmData, rng)` — Top 语言→树木，放在栅栏后方草地
- `calculateAnimals(farmData, rng)` — PR 数量→动物，连续 30 天→稻草人
- `calculateDecorations(farmData, rng)` — Issue 数量→装饰，放在农田边缘

**伪随机**：`mulberry32` + Fisher-Yates 洗牌，同一用户名生成相同布局

**输出**：`SceneElement[]` 数组

```
SceneElement {
  type: 'crop'|'tree'|'animal'|'decoration'
  sprite: string          // 精灵文件名 (如 'r1c3')
  x: number               // 像素坐标
  y: number
  w: number               // 渲染宽度
  h: number               // 渲染高度
  stage?: number          // 作物阶段 (0-4)
}
```

### 2.4 renderer.js — Canvas 渲染引擎

**职责**：将 SceneElement[] 渲染为 PNG Buffer

**核心函数**：
- `renderScene(elements, width, height, useLocal)` → PNG Buffer
- `getContentBounds(ctx, w, h)` — 检测精灵实际内容边界（跳过透明像素）

**渲染策略**：
- 背景：直接铺满画布 (1216×832)
- 作物：内容边界检测 + 按内容宽高比缩放 + 底部对齐
- 树木/动物/装饰：保持宽高比 + 底部对齐
- `imageSmoothingEnabled = false` 保持像素风

**输出**：PNG Buffer (可写入文件或作为 HTTP 响应)

### 2.5 index.js — 主入口

**职责**：串联所有模块，提供 CLI 和 programmable API

**CLI 参数**：
- `--username <name>` — GitHub 用户名 (默认: YeatsLiao)
- `--token <token>` — GitHub PAT（或 `GITHUB_TOKEN` 环境变量）
- `--output <path>` — 输出文件路径 (默认: dist/farm.png)
- `--width <px>` / `--height <px>` — 画布尺寸
- `--mock` — 使用模拟数据（开发调试用）

**API**：`generateFarm(options)` → Promise\<Buffer\>

### 2.6 dev-server.mjs — 本地预览服务器

**职责**：生成 PNG → 启动 HTTP 服务 → 自动打开浏览器

**流程**：
1. 检测 `GITHUB_TOKEN`，有则用真实数据，无则用 mock
2. 调用 `generateFarm()` 生成 PNG 到 dist/
3. 启动 HTTP 服务器 (默认 :3000)，内置预览 HTML
4. 自动打开浏览器

## 3. 数据流

```
GitHub GraphQL API
       │
       ▼
  fetcher.js ──→ FarmData
       │
       ▼
  farm-layout.js ──→ SceneElement[]
       │                  ↑
       │          themes/stardew.js (配置参数)
       ▼
  renderer.js ──→ PNG Buffer
       │
       ▼
  dist/farm.png (文件) 或 localhost:3000 (预览)
```

## 4. 文件结构

```
github-farm/
├── src/
│   ├── index.js              # 主入口 CLI + API
│   ├── fetcher.js            # GitHub API 数据获取 + mock
│   ├── farm-layout.js        # 农场布局算法
│   ├── renderer.js           # Canvas 渲染引擎
│   └── themes/
│       └── stardew.js        # 星露谷主题配置
├── assets/
│   ├── sprites/cropped/      # 独立像素精灵 PNG
│   │   ├── r1c1~r1c5.png     # 5 阶段作物
│   │   ├── r5c1~r5c6.png     # 树木
│   │   ├── r6c1~r6c6.png     # 动物
│   │   └── r7c1~r7c5.png     # 装饰
│   └── scenes/
│       └── farm_field_all_cleared.png  # 干净农田背景
├── dev-server.mjs            # 本地预览服务器
├── dist/                     # 构建输出 (PNG)
├── data/
│   └── sample-response.json  # API 测试数据
├── docs/
│   ├── PRD.md                # 产品需求文档
│   ├── ARCHITECTURE.md       # 架构设计文档 (本文件)
│   └── DEVLOG.md             # 开发记录与踩坑
├── package.json
└── LICENSE
```

## 5. 扩展点

### 5.1 新主题
在 `themes/` 下新建文件，导出相同接口即可：
```
themes/city.js    → 城市主题
themes/ocean.js   → 海洋主题
```

### 5.2 新精灵类型
在 `assets/sprites/cropped/` 添加 PNG，在主题配置中引用：
```
r8c1~r8c4.png → 新装饰类型
```

### 5.3 新数据源
在 fetcher 中添加：
```
fetcher/local.js    → 从本地 JSON 文件读取
fetcher/gitlab.js   → GitLab API
```

### 5.4 新输出格式
renderer 已支持 PNG，可扩展：
```
renderer/svg.js     → SVG 输出 (可嵌入 Markdown)
renderer/gif.js     → GIF 动画 (四季变化)
```
