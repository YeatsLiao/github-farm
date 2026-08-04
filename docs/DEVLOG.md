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

### AI 素材生成

使用 AI 生成像素风概念图和精灵素材：

1. **概念图** - 星露谷风格农场全景
   - 文件：`assets/scenes/concept-art.png`
2. **精灵素材表** - 作物/建筑/动物/树木
   - 文件：`assets/sprites/farm-spritesheet.png`
3. **农场地面背景** - 可拼接的地图瓦片
   - 文件：`assets/scenes/farm-bg.png`
4. **农夫角色** - 像素风角色精灵
   - 文件：`assets/sprites/farmer.png`



### 渲染引擎迭代记录

渲染引擎经历了 4 次重大重构：

| 版本 | 方案 | 结果 | 原因 |
|------|------|------|------|
| v1 | SVG 几何图形 | 废弃 | 效果粗糙，不像像素风 |
| v2 | Spritesheet clipPath | 废弃 | AI 素材不是均匀网格，裁剪错位 |
| v3 | 独立精灵文件 | 废弃 | 拆分逻辑基于错误假设，内容错位 |
| v4 | 固定背景+贡献网格 | 当前 | 整齐但缺乏像素风质感 |

**关键教训**：不要假设 AI 生成的素材图是规则网格排列的。使用 spritesheet 前必须先人工验证每个精灵的实际位置。

**当前问题**：作物形状不够像素风，装饰元素简陋，整体视觉效果离概念图差距较大。

### 项目初始化

- 创建仓库：`YeatsLiao/github-farm`
- 编写 README、package.json、LICENSE、.gitignore
- 编写 GitHub Action workflow（每日自动更新）

### GitHub 开发者计划注册

- 注册地址：https://github.com/developer/register
- 状态：已完成
- Profile 显示：Developer Program Member 徽章

---

## 2026-08-03 | Day 1 - 文档阶段

### 完成的文档

- **PRD.md** - 产品需求文档（功能映射、用户场景、竞品分析、里程碑）
- **ARCHITECTURE.md** - 架构设计文档（三层架构、5 个模块、数据流、扩展点）
- **DEVLOG.md** - 开发记录（本文档）
- **dev-notes/** - 本地详细开发记录（不提交到 GitHub）

---

## 2026-08-03 | Day 1 - 核心模块开发

### 已完成模块

#### 1. fetcher.js - 数据获取层
- GitHub GraphQL API 获取贡献日历数据
- FarmData 结构化对象
- 贡献等级映射（0-4）
- 连续提交天数计算
- Top 编程语言解析
- 自动季节判断
- Mock 数据生成器

#### 2. themes/stardew.js - 星露谷主题配置
- 作物 5 阶段配置
- 10+ 编程语言→树木映射
- 四季配色方案
- 建筑解锁阈值
- 农场布局参数

#### 3. farm-layout.js - 农场布局算法
- calculateCrops() - 作物网格位置
- calculateTrees() - 树木位置
- calculateBuildings() - 建筑位置
- calculateAnimals() - 动物位置
- calculateDecorations() - 装饰位置
- calculateCharacter() - 角色位置
- buildScene() - 主函数

#### 4. renderer.js - SVG 渲染引擎
- renderScene() - 完整场景渲染
- 6 个独立渲染函数（crop/tree/building/animal/decoration/character）
- 分层渲染策略
- 渐变天空背景

#### 5. index.js - 主入口
- generateFarm() 可编程 API
- CLI 支持（--username/--token/--output/--width/--height/--mock/--help）
- 无 token 自动降级 mock 模式

### 测试结果

```
$ npm run build
[farm] Total contributions: 1978
[farm] Current streak: 12 days
[farm] Season: summer
[farm] Languages: JavaScript, Python, Java, TypeScript, Go
[farm] Scene elements: 63
[farm] SVG saved to: dist/farm.svg
```

生成 15KB SVG，包含 63 个场景元素。

### 提交记录

```
25bec9c  feat: add main entry point (index.js) with CLI and programmatic API
c82dd63  feat: add SVG renderer engine
634f387  feat: add farm layout algorithm
be2e60d  docs: add PRD, architecture design, and development log
47dfd79  feat: add Stardew Valley theme configuration
a3ce62f  feat: add GitHub API contribution data fetcher module
d6c373b  chore: add dev-notes to gitignore
```

---

## 开发决策记录

| 决策 | 选择 | 原因 |
|------|------|------|
| 输出格式 | SVG | 矢量、无依赖、可嵌入 Markdown |
| 素材来源 | AI 生成 | 快速原型，后续可优化 |
| 模块系统 | ES Module | Node 18+ 原生支持 |
| 开发记录 | 本地 dev-notes/ | 详细记录不污染仓库 |

---

*本文档随开发进度持续更新*