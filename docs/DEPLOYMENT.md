# Actions + Pages 部署

`Publish Star Farm` 读取一个公开仓库的 Star 数据，生成 `dist/pages/farm.png` 和预览页，再将整个 `dist/pages/` 发布到 GitHub Pages。README 可以长期使用同一个图片地址。

## 发布自己的农场

1. Fork 本项目，在 **Actions** 中启用工作流。
2. 到 **Settings → Pages → Build and deployment**，将 **Source** 设为 **GitHub Actions**。
3. 工作流默认使用当前仓库的数据。要展示另一个公开仓库，到 **Settings → Secrets and variables → Actions → Variables** 添加变量 `STAR_FARM_REPOSITORY`，值填 `OWNER/REPO`。
4. 在 **Actions → Publish Star Farm** 选择默认分支，点击 **Run workflow**。
5. 部署成功后打开 Pages 站点。在站点地址末尾加 `farm.png`，把图片地址粘贴到目标 README。

```markdown
[![GitHub Farm](https://YOUR-NAME.github.io/github-farm/farm.png)](https://YOUR-NAME.github.io/github-farm/)
```

工作流在每天 01:23 UTC（北京时间 09:23）、手动运行或推送到 `main` 时触发。默认分支改名后，更新 [工作流](../.github/workflows/star-farm-pages.yml) 中的 `push.branches`。它使用 Actions 自动提供的令牌读取数据。

## 排查更新

- **发布失败**时，从 Actions 的运行详情找到失败步骤。可以修复后重新运行。Pages 会继续提供最近一次成功发布的图片。
- **README 仍显示旧图**时，先直接打开 Pages 上的 `farm.png` 检查卡片的更新时间。Pages 上已更新时，README 的图片代理可能还在使用缓存。
- 本地排查可执行 `npm run build -- --repo OWNER/REPO`。需要认证时，通过环境变量 `STAR_FARM_GITHUB_TOKEN` 提供令牌。

[GitHub Pages 工作流官方文档](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) · [GitHub README 图片代理](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/about-anonymized-urls)
