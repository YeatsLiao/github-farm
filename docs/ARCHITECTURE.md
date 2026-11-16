# GitHub Farm 项目指南

GitHub Actions 读取 GitHub 仓库数据，以仓库 ID 为种子生成布局和成长阶段，再渲染成 1280 × 960 的 PNG。Pages 提供固定的 HTTPS 图片地址，README 直接引用。

## 目录

- `src/github/` 获取公开仓库 ID、Star 总数和近七个完整日的新增 Stars。
- `src/farm/` 决定种子、场景与成长阶段，布局定义放在 `config/layouts/spring/`。
- `src/render/` 绘制地形、精灵和卡片。运行时素材来自 `assets/runtime/spring/`。
- `src/http/` 提供可选的实时 PNG 服务，供本地开发。
- `scripts/art/` 编译素材，`scripts/render/` 输出单张卡片和成长对照。
- `pages/` 存放静态页面，`scripts/build-pages.mjs` 输出 `dist/pages/`。
- `docs/design/` 存放设计稿，`docs/examples/` 存放验收快照。
- `archive/` 存放早期布局实验和旧贡献农场，包括它们的代码、素材与说明。

## Publish your own farm

1. Fork 项目，在 **Actions** 中启用工作流。
2. 在 **Settings → Pages → Build and deployment** 把 **Source** 设为 **GitHub Actions**。
3. 要展示另一个公开仓库，在 **Settings → Secrets and variables → Actions → Variables** 新建 `STAR_FARM_REPOSITORY`，填写 `OWNER/REPO`。默认展示运行工作流的仓库。
4. 在 **Actions → Publish Star Farm** 从默认分支运行工作流。
5. 在 Pages 站点地址后加 `farm.png`，将该图片地址放进目标仓库的 README。

默认分支名与 `main` 不同时，将工作流的 `push.branches` 改成该分支名。

工作流在推送到 `main`、手动运行或每天 01:23 UTC（北京时间 09:23）触发。它使用 Actions 自带的令牌读取公开 GitHub 数据。测试与渲染成功后，只有 `dist/pages/` 会发布。构建失败时 Pages 继续提供上一次成功发布的卡片。

## 新增或修改素材

原稿按 `assets/source/<season>/<category>/` 保存。来源与编译记录见 [春季素材说明](../assets/source/spring/README.md)。更新坐标或帧名时同步维护 `src/art/spring-catalog.js`，运行 `npm run art:star-farm`，将对应的原稿、图集和清单一起提交。布局使用精灵 ID 引用清单。

运行 `npm run preview:star-farm` 可在 `dist/star-farm-theme-preview/` 查看三种布局与 0、300、5,000 Stars 对照。生成文件统一放入忽略的 `dist/`，需要保留的样例挑选后放到 `docs/examples/`。

## 验证

```sh
npm ci
npm test
npm run build -- --repo YeatsLiao/github-farm
```

本地构建可选用环境变量 `STAR_FARM_GITHUB_TOKEN`。按需渲染服务和样图见 [Star Farm 验收记录](acceptance/star-farm.md)。
