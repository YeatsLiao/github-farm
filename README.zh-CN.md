# GitHub Farm · 星星农场

[English](README.md) · [查看农场](https://yeatsliao.github.io/github-farm/)

GitHub Farm 把 GitHub 仓库收到的 Stars 变成像素农场。同一个仓库 ID 对应一座固定布局的农场。Stars 增长时，原有地标留在原位，作物、动物、建筑和装饰逐步增加。

[![GitHub Farm 农场及 Star 统计](https://yeatsliao.github.io/github-farm/farm.png)](https://yeatsliao.github.io/github-farm/)

## 放进 README

复制这一行即可展示本项目的农场。卡片显示 Star 总数、当前阶段和下一里程碑。GitHub 提供历史数据时，也会显示最近七个完整日新增的 Stars。

```markdown
[![GitHub Farm](https://yeatsliao.github.io/github-farm/farm.png)](https://yeatsliao.github.io/github-farm/)
```

要展示自己的仓库，Fork 本项目并按 [Pages 部署步骤](docs/ARCHITECTURE.md#publish-your-own-farm) 开启发布。Actions 每天重新生成，README 使用同一个图片地址。

## 农场怎么生长

0 Star 时已经有一座小而完整的农场，仓库 ID 会选出三种布局之一。前期在 1、5、10、25、50 Stars 就能看到变化，从 100 到 5,000 每 100 Stars 生长一档。5,000 Stars 解锁风车，之后仍会更新 Star 总数。

## 本地运行

```sh
npm ci
npm test
npm run build -- --repo YeatsLiao/github-farm
```

打开 `dist/pages/index.html` 预览发布结果。目录、素材和发布方式见 [项目指南](docs/ARCHITECTURE.md)。

[参与贡献](CONTRIBUTING.md) · [MIT 许可证](LICENSE)
