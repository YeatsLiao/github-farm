# GitHub Farm · 星星农场

[English](../README.md) · [查看线上农场](https://yeatsliao.github.io/github-farm/)

仓库的 Stars 会长成一座像素农场。每个仓库有固定布局，从 0 Stars 就能看到完整的小农场。新增 Stars 解锁作物、动物和建筑，已有地标留在原位。

在[在线生成器](https://yeatsliao.github.io/github-farm/)输入任意公开仓库的 `OWNER/REPO`，也可以粘贴 GitHub 仓库链接。[试试 octocat/git-consortium](https://yeatsliao.github.io/github-farm/?repo=octocat%2Fgit-consortium)。

拖动成长时间轴可以对比同一农场在不同档位的静态图。点击 **Show places** 会显示地点标记，可查看用途和解锁条件。[起步对照](https://yeatsliao.github.io/github-farm/farm-materials.png) · [100–300 Stars](https://yeatsliao.github.io/github-farm/farm-expansions.png) · [300–1,000 Stars](https://yeatsliao.github.io/github-farm/farm-workyards.png)

[![GitHub Farm 农场及 Star 统计](https://yeatsliao.github.io/github-farm/farm.png)](https://yeatsliao.github.io/github-farm/)

## 放进 README

生成后可分享页面地址或下载当前真实档位的 PNG。复制这一行即可嵌入本仓库的示例卡片。要让自己仓库的 README 卡片定期更新，请按 [Pages 部署指南](DEPLOYMENT.md) 设置。

```markdown
[![GitHub Farm](https://yeatsliao.github.io/github-farm/farm.png)](https://yeatsliao.github.io/github-farm/)
```

## 本地预览

```sh
npm ci
npm test
npm run build -- --repo YeatsLiao/github-farm
python -m http.server 8080 --bind 127.0.0.1 --directory dist/pages
```

打开 [localhost:8080](http://localhost:8080) 试用生成器。

[项目结构](ARCHITECTURE.md) · [素材规范](ASSETS.md) · [参与贡献](CONTRIBUTING.md) · [MIT 许可证](../LICENSE)
