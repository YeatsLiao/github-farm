# Star Farm v1 阶段 1 样图

2026-11-14。`npm run prototype:samples` 生成三仓库抽样和同一仓库的 51 档成长对照。

- `nine-farm-comparison.png` 汇总三种仓库种子 × 32 / 320 / 1,280 Stars 九张 PNG。
- `dist/star-farm-growth/` 有五张连续对照，从 0 到 5,000 Stars 每 100 一档。相邻页重复一个边界档位，便于接着对照。
- 单张图逻辑尺寸 640×480，2 倍导出。统计值是固定演示值，标为 SAMPLE DATA。
- 同一列固定种子与建筑锚点，小屋原位三级升级、鸡舍升级为谷仓、果树从1到4棵；三列分别为林间、果园池岸、湖边地形。示例仓库ID均为离线fixture，不是GitHub真实ID。
- 合成读取 `assets/runtime/spring/atlas.png` 和 manifest；由本轮34帧新图集编译而来，不再混用旧春日素材。
- 道路按最终建筑、耕地和池塘预留范围寻路，所有可选道路接入常驻的小屋主路。修复了相邻农田的入口落到另一块田内的问题。
- 草地、泥土和水岸共用一层像素地面。门廊与谷仓各有泥地院落，小路连接农田边缘和池塘的可达岸边。树林延伸至画幅边缘，花草、石头和农具按区域布置。
- `1-windmill.png` 至 `3-windmill.png` 验证5,000 Star风车里程碑；此前的拼贴原型保存在 `layout-prototype-before.png`。
- 自动化仅检查规则，未把它当作用户审美认可；最终像素细节、道路自然度和跨平台字体仍有打磨空间。
- 5 项定向测试通过，覆盖 50 个种子、道路占地与连通、50 次阶段过渡、风车阈值和 PNG 重现性。

| 文件 | 仓库种子示例 | Star 档 |
|---|---|---:|
| `1-yeatsliao-github-farm-low.png` | YeatsLiao/github-farm | 32 |
| `1-yeatsliao-github-farm-mid.png` | YeatsLiao/github-farm | 320 |
| `1-yeatsliao-github-farm-high.png` | YeatsLiao/github-farm | 1,280 |
| `2-octocat-sunlit-orchard-low.png` | octocat/sunlit-orchard | 32 |
| `2-octocat-sunlit-orchard-mid.png` | octocat/sunlit-orchard | 320 |
| `2-octocat-sunlit-orchard-high.png` | octocat/sunlit-orchard | 1,280 |
| `3-mona-garden-notes-low.png` | mona/garden-notes | 32 |
| `3-mona-garden-notes-mid.png` | mona/garden-notes | 320 |
| `3-mona-garden-notes-high.png` | mona/garden-notes | 1,280 |
