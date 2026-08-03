# GitHub Farm - 开发记录

> 本文档记录 GitHub Farm 项目从构思到实现的完整开发过程

---

## 2026-08-03 | Day 1 - 项目诞生

### 背景

在讨论 GitHub 开发者标识和 API 工具时，提出了"贡献可视化"的想法。最初考虑了 Stars 自动同步工具，但发现已有 GithubStarsManager（3.2K Star）等成熟方案。

### 创意探索

提出了 6 个贡献可视化方向，并制作了 Canvas 概念 Demo：

| 方向 | 评价 |
|------|------|
| 星露谷农场 | 最推荐，接地气，传播性强 |
| 像素城市 | 视觉冲击力强，但开发量大 |
| 深海水族馆 | 治愈系，差异化好 |
| 星际宇宙 | 浪漫，但不够独特 |
| 登山探险 | 励志，但场景较单一 |
| 像素冒险 | 极客风，有趣 |

**决策**：选择星露谷农场方向，与 kodama（日式盆栽）形成差异化。

### Canvas Demo 截图

第一轮 Canvas 代码绘制 Demo（效果粗糙，仅用于概念验证）：
- 文件：`contrib-viz-demo.html`（位于 yeatsliao.github.io 项目）

### AI 素材生成

使用 AI 生成像素风概念图和精灵素材：

1. **概念图** - 星露谷风格农场全景
   - 文件：`assets/scenes/concept-art.png`
   - 用途：整体风格参考

2. **精灵素材表** - 作物/建筑/动物/树木
   - 文件：`assets/sprites/farm-spritesheet.png`
   - 用途：渲染引擎的素材来源

3. **农场地面背景** - 可拼接的地图瓦片
   - 文件：`assets/scenes/farm-bg.png`
   - 用途：场景底层背景

4. **农夫角色** - 像素风角色精灵
   - 文件：`assets/sprites/farmer.png`
   - 用途：场景中的角色元素

### 项目初始化

- 创建仓库：`YeatsLiao/github-farm`
- 初始化 Git，配置用户信息
- 编写 README.md
- 编写 package.json（ES Module，Node >= 18）
- 编写 LICENSE（MIT）
- 编写 .gitignore
- 编写 GitHub Action workflow（每日自动更新）

**Commit**: `chore: init project with docs, assets, and GitHub Action scaffold`

### GitHub 开发者计划注册

- 注册地址：https://github.com/developer/register
- 状态：✅ 注册成功
- Profile 显示：Developer Program Member 徽章

---

## 2026-08-03 | Day 1 - 核心模块开发

### 已完成模块

#### 1. fetcher.js - 数据获取层
- 使用 GitHub GraphQL API 获取贡献日历数据
- 解析为 FarmData 结构化对象
- 包含贡献等级映射（0-4）
- 计算连续提交天数（current/longest streak）
- 解析 Top 编程语言
- 自动判断当前季节
- 提供 mock 数据生成器（开发调试用）

**Commit**: `feat: add GitHub API contribution data fetcher module`

#### 2. themes/stardew.js - 星露谷主题配置
- 作物 5 阶段配置（empty/seed/sprout/growing/harvest）
- 10+ 编程语言→树木类型映射
- 四季配色方案（春/夏/秋/冬）
- 建筑解锁阈值（围栏7天/水井15天/谷仓20天/稻草人30天/风车40天）
- 农场布局参数（网格尺寸、区域百分比）
- 颜色调色板
- 精灵尺寸配置

**Commit**: `feat: add Stardew Valley theme configuration with seasons and sprites`

### 待开发模块

- [ ] farm-layout.js - 农场布局算法
- [ ] renderer.js - SVG 渲染引擎
- [ ] index.js - 主入口 CLI
- [ ] themes/index.js - 主题注册表

---

## 开发决策记录

### 决策 1：为什么选 SVG 而不是 Canvas？
- SVG 是矢量格式，嵌入 GitHub README 无分辨率问题
- SVG 是纯文本，可以用字符串模板生成，无需 canvas 库
- Canvas 需要浏览器环境或 node-canvas 依赖
- SVG 可以直接用 `<img src="farm.svg">` 嵌入

### 决策 2：为什么用 AI 生成素材而不是手绘？
- 快速原型验证，降低启动成本
- AI 生成的像素风质量已经足够作为基础素材
- 后续可以找设计师优化或社区贡献

### 决策 3：为什么用 ES Module？
- Node.js 18+ 原生支持
- 现代 JavaScript 标准
- 与浏览器端代码兼容

---

## 截图与素材索引

| 文件 | 说明 | 生成时间 |
|------|------|----------|
| assets/scenes/concept-art.png | 星露谷风格农场概念图 | 2026-08-03 |
| assets/sprites/farm-spritesheet.png | 精灵素材表（作物/建筑/动物/树木） | 2026-08-03 |
| assets/scenes/farm-bg.png | 农场地面背景瓦片 | 2026-08-03 |
| assets/sprites/farmer.png | 农夫角色精灵 | 2026-08-03 |

---

*本文档随开发进度持续更新*