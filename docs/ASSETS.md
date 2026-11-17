# 素材规范

- [assets/source/](../assets/source/) 放透明 PNG 原稿，使用 `<季节>-<类别>.png` 命名。源图的文件名、像素尺寸和 SHA-256 记录在 [sources.json](../assets/source/sources.json)。
- [assets/runtime/](../assets/runtime/) 放渲染用的图集和清单，命名为 `<季节>-atlas.png` 和 `<季节>-manifest.json`。清单记录每个精灵的 ID、裁切位置和锚点。
- 对照图、试渲染和素材预览放在 `dist/`。用于发布的图集和清单随代码提交。

## 更新图集

1. 更新原稿和 [atlas-layout.js](../scripts/atlas-layout.js) 中的格网与精灵 ID。
2. 运行 `npm run art:star-farm`，检查 `dist/star-spring-catalog.png`。编译器清理透明裁切处的小块游离像素。
3. 运行 `npm test` 和 `npm run preview:star-farm`，确认场景引用和成长对照。
4. 将改动的原图、来源记录、图集和清单一起提交。添加外部素材时记录作者、来源链接和使用条件。

## 春季素材来源

围栏、码头边板、支脚、路边碎石和植被簇使用原生像素绘制。检查局部时同时看浅草、深草、泥土和水边的轮廓，注意脚下阴影、端部收边和相邻素材的像素尺度。[溪边果园细节](https://yeatsliao.github.io/github-farm/orchard-details.png)

2026-11-05 使用内置图像生成工具制作建筑、自然与道具三个原稿。提示词要求原创像素精灵、透明背景和统一网格。编译器从原稿中提取 34 帧，其中小屋有三帧升级样式。

### 作业棚屋

[春季作业棚屋素材](../assets/source/spring-workshops.png)是三张图像生成原稿裁切、保留透明通道并拼成的一排。图集现有 37 帧。起步农具以及出货、集蛋、清洗与榨果等作业道具在 [props.js](../src/render/props.js) 用原生像素构建。[作业区成长对照](https://yeatsliao.github.io/github-farm/farm-workyards.png)

生成提示共用 [春季建筑图](../assets/source/spring-buildings.png) 作画风参考。三件分别独立生成，均要求暖赭色、蜂蜜木色和奶油色石块，棕色描边，正面浅俯视，左上方光照，透明背景和清楚的像素轮廓。无场景底、外投影、白边、文字、附加物。用途和原稿 SHA-256 如下。

- **果酱棚**为低而宽的苔绿瓦顶，奶油灰泥配木梁，前方有摆三罐果酱的开窗，右侧有门和矮石基。原稿 `a7594df15ced74d3f2bd7125181d78f4d2cf706bb02c6cae0c48247802827fab`。
- **工具棚**窄而稍高，暖木墙配红陶色单坡屋顶，门里可见两件长柄农具，配绿色窗板与石门槛。原稿 `df74a6b0def229d017d6b64dba920412a378cfb8927666b4e7e49e0f99c67698`。
- **储草棚**为敞口低棚，暖棕瓦、两根木柱和阴影中的两叠草捆，低门槛接住屋身。原稿 `17cd51198e834dc16654b5d3b342957ad74c1156ad0714dfd83892b881e5abdb`。

[风格参考与设计稿](https://github.com/YeatsLiao/github-farm/tree/65b831e396cdd3d83d175186cfd340e7146ac3be/docs/design/star-farm-v1)及[生成与编译记录](https://github.com/YeatsLiao/github-farm/tree/65b831e396cdd3d83d175186cfd340e7146ac3be/assets/source/spring)可在整理前的 Git 提交查看。

## 卡片字体

浏览器和 Actions 用同一份 [IBM Plex Mono Medium](../assets/runtime/ibm-plex-mono-medium.ttf) 绘制卡片标题和统计。字体取自 [Google Fonts 的固定版本](https://github.com/google/fonts/tree/431022a4eeb0e1009ba0126f41353d8ca2375a2a/ofl/ibmplexmono)，SHA-256 为 `a9b4c49bb299e05b5f6c481e7fb5e78943d2793249a0c8874ab574a2d1ea6755`。[SIL Open Font License 1.1](../assets/runtime/ibm-plex-mono-OFL.txt)
