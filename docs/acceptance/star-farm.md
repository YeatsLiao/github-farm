# Star Farm 验收

- [低 Star 真实数据快照](../examples/github-farm.png)来自 `YeatsLiao/github-farm`。
- [高 Star 真实数据快照](../examples/hello-world.png)来自 `octocat/Hello-World`。
- `npm run preview:star-farm` 输出三种布局在 0、300、5,000 Stars 的对照。

`npm test` 验证三种布局、扩建后坐标、风车阈值、PNG 和统计数据。使用 `npm run build -- --repo OWNER/REPO` 检查 Pages 发布目录。使用 `npm run build:star-farm -- --repo OWNER/REPO --out dist/farm.png` 单独生成一张卡片。

## 可选的本地按需服务

```sh
npm run serve:star-farm
```

启动后访问 `http://127.0.0.1:8787/v1/farm/YeatsLiao/github-farm.png`。服务支持 GET、HEAD 和 ETag。PNG 在进程内缓存一小时。GitHub 请求暂时失败时，可以使用不足 24 小时的旧卡，卡片会标记 `STALE`。无缓存时返回 503。私有或不存在的仓库返回 404。

也可运行 `docker build -f Dockerfile.star-farm -t github-farm .` 并将容器的 8787 端口映射到本地。健康检查路径是 `/healthz`，支持 `PORT`、`STAR_FARM_HOST` 和可选的 `STAR_FARM_GITHUB_TOKEN`。
