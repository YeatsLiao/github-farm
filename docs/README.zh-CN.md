# GitHub Farm · 星星农场

[English](../README.md) · [查看线上农场](https://yeatsliao.github.io/github-farm/)

仓库的 Stars 会长成一座像素农场。每个仓库有固定布局，从 0 Stars 就能看到完整的小农场。新增 Stars 解锁作物、动物和建筑，已有地标留在原位。

[![GitHub Farm 农场及 Star 统计](https://yeatsliao.github.io/github-farm/farm.png)](https://yeatsliao.github.io/github-farm/)

## 放进 README

复制这一行即可展示上面的农场。要展示自己仓库的 Stars，按 [Pages 部署指南](DEPLOYMENT.md) 生成自己的卡片地址。

```markdown
[![GitHub Farm](https://yeatsliao.github.io/github-farm/farm.png)](https://yeatsliao.github.io/github-farm/)
```

## 本地预览

```sh
npm ci
npm test
npm run build -- --repo YeatsLiao/github-farm
```

打开 `dist/pages/index.html` 查看成品。

[项目结构](ARCHITECTURE.md) · [素材规范](ASSETS.md) · [参与贡献](CONTRIBUTING.md) · [MIT 许可证](../LICENSE)
