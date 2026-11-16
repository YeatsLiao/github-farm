# 贡献农场原型

旧版按 GitHub 用户的贡献记录生成农场。这里保留 Node、浏览器交互、Python 实验、原型文档与对应素材。

从仓库根目录运行：

```sh
npm ci
npm run legacy:dev
npm run legacy:build
npm run legacy:test
```

预览地址为 `http://127.0.0.1:3000`，支持下载当前帧的 PNG。静态输出写入本目录的 `dist/`。Python 命令见 [Python 原型说明](python/README.md)，旧定时任务保存在 [workflows](workflows/) 供查阅。

旧测试中有一项已知的布置失败，绣球在庭院找不到合法位置。
