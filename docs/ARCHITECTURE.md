# 项目结构与开发

```text
.github/    GitHub 工作流和 Issue 模板
assets/     素材原稿（source）和运行时图集（runtime）
docs/       项目说明、部署指南、素材规范与贡献指引
scripts/    本地命令、Pages 页面模板与可选的容器配置
src/        GitHub 数据、农场规则、渲染与本地图片服务
test/       农场生成与图片服务测试
```

## 代码放在哪里

- 改仓库数据或 Star 统计，查看 [repository-stars.js](../src/repository-stars.js)。
- 初始布局与成长规则在 [src/farm/](../src/farm/)。[yard.js](../src/farm/yard.js) 提供地点说明，[terrain.js](../src/farm/terrain.js) 提供岸线、地面占位和通道距离。
- 地面、精灵合成、卡片排版和收获篮等小道具放在 [src/render/](../src/render/)。
- 改 Pages 生成器，编辑 [pages.html](../scripts/pages.html) 和 [pages.js](../scripts/pages.js)。[build-pages.mjs](../scripts/build-pages.mjs) 把网页、默认 PNG 和对照图写入 `dist/pages/`，由 Actions 发布。浏览器与 Node 复用 [卡片绘制逻辑](../src/render/draw-card.js)。
- 改素材先看[素材规范](ASSETS.md)。新增代码和脚本使用小写短横线文件名，文件按实际职责归入现有目录。

## 农场生成

仓库 ID 决定三种初始布局之一。成长点从 0、1、5、10、25、50 Stars 开始，从 100 到 5,000 每 100 Stars 一档。5,000 Stars 解锁风车，之后继续显示真实 Star 数。卡片显示更新时刻与下一里程碑，GitHub 提供可用历史时也显示最近七个完整日的新增 Stars。

网页与 PNG 使用同一静态场景。时间轴在档位改变时重绘，下载使用当前统计档位。限流时如果使用保存数据，网页和 PNG 都标记原更新时间。岸线形状同时用于绘制与摆放检查，道路转弯会避开建筑、菜地和围栏占地。[交付与后续计划](UPGRADE-PLAN.md)

本地开发需要 Node.js 20.19 或更新版本。安装依赖后可运行：

- `npm test` 检查成长、素材和图片服务。
- `npm run build:star-farm -- --repo OWNER/REPO --out dist/farm.png` 渲染单张真实数据卡片。
- `npm run preview:star-farm` 在 `dist/star-farm-theme-preview/` 生成三种布局、各阶段的成长对照和 320 像素宽的低星卡片。
- `npm run art:star-farm` 编译并更新已提交的图集，预览图写入 `dist/`。

## 可选的图片服务

当前公开部署只用 Actions + Pages。开发时可运行 `npm run serve:star-farm`，访问 `http://127.0.0.1:8787/v1/farm/OWNER/REPO.png`。服务支持 GET、HEAD、ETag 和 `/healthz`，可通过 `PORT`、`STAR_FARM_HOST`、`STAR_FARM_GITHUB_TOKEN` 配置。

容器入口是 `docker build -f scripts/Dockerfile -t github-farm .`。运行时映射容器的 8787 端口。

## 历史版本

[旧贡献农场](https://github.com/YeatsLiao/github-farm/tree/65b831e396cdd3d83d175186cfd340e7146ac3be/archive/contribution-farm)、[早期布局实验](https://github.com/YeatsLiao/github-farm/tree/65b831e396cdd3d83d175186cfd340e7146ac3be/archive/star-farm-prototype)和[验收快照](https://github.com/YeatsLiao/github-farm/tree/65b831e396cdd3d83d175186cfd340e7146ac3be/docs/examples)保存在整理前的 Git 提交。需要运行原型时，从仓库根目录执行：

```sh
git worktree add --detach ../github-farm-history 65b831e396cdd3d83d175186cfd340e7146ac3be
```
