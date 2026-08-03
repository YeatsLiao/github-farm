# GitHub Farm - 架构设计文档

---

## 1. 系统架构总览

```
┌─────────────────────────────────────────────────────┐
│                    用户入口层                          │
│  ┌──────────┐  ┌──────────┐  ───────────────────┐  │
│  │CLI 本地   │  │GitHub    │  │在线预览 (dev)      │  │
│  │npm run   │  │Action    │  │npm run dev         │  │
│  │build     │  │定时触发   │  │实时预览            │  │
│  └────┬─────┘  └─────────┘  └────────┬──────────┘  │
│       └──────────────┼────────────────┘              │
└──────────────────────┼───────────────────────────────┘
                       │
──────────────────────┼───────────────────────────────┐
│                    核心逻辑层                          │
│  ┌──────────┐  ┌──────────┐  ───────────────────┐  │
│  │ fetcher  │→│  layout  │→│   renderer          │  │
│  │ 数据获取  │  │ 布局算法  │  │   SVG 渲染引擎     │  │
│  └──────────┘  └──────────┘  └────────┬──────────┘  │
│                                        │              │
│  ┌─────────────────────────────────────┘              │
│  │  themes/ (主题配置层)                               │
│  │  stardew.js | future-theme.js | ...                │
│  └───────────────────────────────────────────────────┘│
└───────────────────────────────────────────────────────┘
                       │
──────────────────────┼───────────────────────────────┐
│                    数据/资源层                          │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │GitHub    │  │assets/   │  │dist/               │  │
│  │GraphQL   │  │sprites/  │  │输出 SVG/PNG         │  │
│  │API       │  │scenes/   │  │                    │  │
│  └──────────┘  ──────────┘  └───────────────────┘  │
└───────────────────────────────────────────────────────┘
```

## 2. 模块设计

### 2.1 fetcher.js - 数据获取层

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

### 2.2 themes/stardew.js - 主题配置层

**职责**：定义星露谷主题的配色、精灵映射、布局参数

**导出**：
- CROP_STAGES - 作物生长阶段配置
- LANGUAGE_TREES - 语言→树木映射
- SEASON_THEMES - 四季配色方案
- BUILDING_THRESHOLDS - 建筑解锁阈值
- FARM_CONFIG - 农场布局参数
- PALETTE - 颜色调色板
- SPRITE_SIZES - 精灵尺寸配置

### 2.3 farm-layout.js - 布局算法层

**职责**：将 FarmData 转换为场景元素列表（带坐标）

**核心函数**：
- calculateCrops(weeks) → 作物网格位置
- calculateTrees(languages) → 树木位置
- calculateBuildings(streak) → 建筑位置
- calculateAnimals(prs) → 动物位置
- calculateDecorations(issues) → 装饰位置

**输出**：SceneElement[] 数组

```
SceneElement {
  type: 'crop'|'tree'|'building'|'animal'|'decoration'|'character'
  sprite: string
  x: number (0-1 相对坐标)
  y: number (0-1 相对坐标)
  width: number
  height: number
  rotation?: number
  extra?: object
}
```

### 2.4 renderer.js - SVG 渲染引擎

**职责**：将 SceneElement[] 渲染为 SVG 字符串

**核心函数**：
- renderScene(elements, theme) → SVG string
- renderBackground(theme) → SVG background
- renderElement(element, theme) → SVG fragment

**输出**：完整 SVG 文档字符串

### 2.5 index.js - 主入口

**职责**：串联所有模块，提供 CLI 和 programmable API

**CLI 参数**：
- --username: GitHub 用户名
- --token: GitHub PAT（可选，用于 API 调用）
- --output: 输出文件路径
- --format: svg|png
- --theme: stardew（默认）
- --mock: 使用模拟数据（开发调试用）

## 3. 数据流

```
GitHub GraphQL API
       │
       ▼
  fetcher.js ──→ FarmData
       │
       ▼
  themes/stardew.js ──→ ThemeConfig
       │
       ▼
  farm-layout.js ──→ SceneElement[]
       │
       ▼
  renderer.js ──→ SVG String
       │
       ▼
  dist/farm.svg
```

## 4. 文件结构

```
github-farm/
├── src/
│   ├── index.js           # 主入口 CLI + API
│   ├── fetcher.js         # GitHub API 数据获取
│   ├── farm-layout.js     # 农场布局算法
│   ├── renderer.js        # SVG 渲染引擎
│   └── themes/
│       ├── stardew.js     # 星露谷主题
│       └── index.js       # 主题注册表
├── assets/
│   ├── sprites/           # 像素精灵图
│   │   ├── farm-spritesheet.png
│   │   └── farmer.png
│   └── scenes/            # 场景背景
│       ├── farm-bg.png
│       └── concept-art.png
├── dist/                  # 构建输出
├── docs/
│   ├── PRD.md             # 产品需求文档
│   ├── ARCHITECTURE.md    # 架构设计文档
│   └── DEVLOG.md          # 开发记录
├── .github/
│   └── workflows/
│       ── farm.yml       # GitHub Action
├── package.json
├── LICENSE
└── README.md
```

## 5. 扩展点

### 5.1 新主题
在 themes/ 下新建文件，导出相同接口即可：
```
themes/city.js    → 城市主题
themes/ocean.js   → 海洋主题
```

### 5.2 新输出格式
在 renderer 中添加新的渲染器：
```
renderer/canvas.js  → Canvas 渲染
renderer/png.js     → PNG 渲染（需要 canvas 库）
```

### 5.3 新数据源
在 fetcher 中添加新的数据获取方式：
```
fetcher/local.js    → 从本地 JSON 文件读取
fetcher/gitlab.js   → GitLab API
```