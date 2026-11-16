# 素材规范

- [assets/source/](../assets/source/) 放透明 PNG 原稿，使用 `<季节>-<类别>.png` 命名。源图的文件名、像素尺寸和 SHA-256 记录在 [sources.json](../assets/source/sources.json)。
- [assets/runtime/](../assets/runtime/) 放渲染用的图集和清单，命名为 `<季节>-atlas.png` 和 `<季节>-manifest.json`。清单记录每个精灵的 ID、裁切位置和锚点。
- 对照图、试渲染和素材预览放在 `dist/`。用于发布的图集和清单随代码提交。

## 更新图集

1. 更新原稿和 [atlas-layout.js](../scripts/atlas-layout.js) 中的格网与精灵 ID。
2. 运行 `npm run art:star-farm`，检查 `dist/star-spring-catalog.png`。
3. 运行 `npm test` 和 `npm run preview:star-farm`，确认场景引用和成长对照。
4. 将改动的原图、来源记录、图集和清单一起提交。添加外部素材时记录作者、来源链接和使用条件。

## 春季素材来源

2026-11-05 使用内置图像生成工具制作建筑、自然与道具三个原稿。提示词要求原创像素精灵、透明背景和统一网格。编译器从原稿中提取 34 帧，其中小屋有三帧升级样式。

[风格参考与设计稿](https://github.com/YeatsLiao/github-farm/tree/65b831e396cdd3d83d175186cfd340e7146ac3be/docs/design/star-farm-v1)及[生成与编译记录](https://github.com/YeatsLiao/github-farm/tree/65b831e396cdd3d83d175186cfd340e7146ac3be/assets/source/spring)可在整理前的 Git 提交查看。
