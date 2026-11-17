# Actions + Pages 部署

当前公开版本使用 Actions + Pages。`Publish Star Farm` 把生成器、默认仓库的 `farm.png` 和统计数据一起发布到 GitHub Pages。指定其他公开仓库时，浏览器读取 GitHub 数据并生成带 `?repo=OWNER/REPO` 的分享链接。成长预览会标明档位，下载使用当前统计档位。

## 发布可自动更新的 README 图片

1. Fork 本项目，在 **Actions** 中启用工作流。
2. 到 **Settings → Pages → Build and deployment**，将 **Source** 设为 **GitHub Actions**。
3. 到 **Settings → Secrets and variables → Actions → Variables** 添加变量 `STAR_FARM_REPOSITORY`，值填你想展示的公开仓库 `OWNER/REPO`。变量留空时，工作流统计运行它的仓库，包括你 Fork 出来的仓库。
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
- 在线生成器使用 GitHub 的公开 API。遇到限流时，网页保留输入与重试按钮。若浏览器保存过该仓库最近 24 小时内的成功结果，页面和 PNG 会显示同一份保存数据并标记原更新时间。

[GitHub Pages 工作流官方文档](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) · [GitHub README 图片代理](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/about-anonymized-urls)

## 可选的图片服务

任意公开仓库的一行自动更新嵌图暂缓发布。代码与本地验证方式见[项目结构](ARCHITECTURE.md#可选的图片服务)。将来如果启用，可按以下步骤接回 Pages。

1. 用 [Dockerfile](../scripts/Dockerfile) 托管图片服务。构建上下文为仓库根目录，默认端口为 8787，健康检查用 `/healthz`。如需认证 GitHub 请求，在托管平台的私密环境变量中配置 `STAR_FARM_GITHUB_TOKEN`。
2. 将公开 HTTPS 地址填入 Actions Variable `STAR_FARM_PNG_BASE`，重新运行 `Publish Star Farm`。生成器会显示 **Embed in your README**。
3. 用另一个公开仓库核对 Markdown 里的图片地址，打开真实 README 验证加载。图片服务最多缓存一小时的最新数据，GitHub 的图片代理也可能延后更新。
