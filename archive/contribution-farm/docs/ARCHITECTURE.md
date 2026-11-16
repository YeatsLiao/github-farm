# GitHub Farm — 架构设计

> 当前：Spring Preview（2026-10-24），Node.js 主线。旧 v8 渲染器与 Python 实验实现保留，不参与新网页的默认渲染。

## 1. 架构选择

本轮使用浏览器原生 Canvas 2D，而不是立即引入 PixiJS：现有 Node.js 已使用 `canvas`，共享绘制代码能够先验证美术与动画，且无需新增运行时依赖。若以后需要大量精灵、复杂粒子或场景编辑器，再评估 PixiJS。

```text
输入用户名／选择演示档位
          │
          ▼
dev-server.mjs ─── 演示数据 createDemoData
          │        或 fetcher.js → GitHub GraphQL
          ▼
createFarmScene → 可序列化场景（日期、地块、动物、语言树）
          │
          ├── web/app.js → drawFarm → 浏览器 Canvas 动画
          │                       └── 当前时刻 PNG 导出
          └── renderer.js → drawFarm → Node Canvas → PNG
                                    ↑
                  assets/spring 背景＋透明图集＋manifest
```

AI 仅用于离线制作素材，运行时不调用图像模型或大语言模型。

## 2. 模块职责

### src/living-farm.js — 共享场景与渲染

纯 ES Module，不依赖 DOM、文件系统或 Node.js 专属模块，可直接提供给浏览器。

- `createDemoData(profile, username)`：固定日期区间、带种子随机的 52 周演示数据，明确 `source: 'demo'`。
- `createFarmScene(data, username)`：最多 53 周；按贡献排序，保留日期与数量。固定可种植槽位避开谷仓和道路。
- `cropStage(total)`：跨账号可比较的绝对阈值，详见 PRD；零贡献不绘制作物。
- `sampleChicken(chicken, seconds)`：确定性16秒行为周期，四段二维短路线交替行走、停留、啄食；每只鸡有畜牧院内的起点，完整轮廓不越过活动边界。
- `drawFarm(ctx, assets, scene, seconds, options)`：统一绘制入口；池塘与石径先作为地面层绘制，建筑、树、作物和角色按当前脚底 y 排序，支持根部风摆、暮色和选中提示。
- 接地层在站立对象之前统一绘制：低透明度环境色斑、柔和椭圆阴影和树根／屋脚接触影；按物件当前坐标生成，移动后旧位置不残留，不需要逐帧读写像素。
- `drawAssetPreview(ctx, assets, art)`：素材册缩略图使用同一图集，不另维护一套图标。
- `hitTestCrop(scene, x, y)`：基于地块根部范围的命中检测，而不是对整株高秆做像素命中。

逻辑画布为 **768×512**，默认输出 **1536×1024**。其他导出尺寸等比适配，必要时留边，不横向拉伸场景。

场景数据形状：

```text
Scene {
  version: 2, mapRevision: 5, username, seed, source, profile?, period,
  total, totalPRs, totalIssues,
  crops: [{ id: 周首日期, end, total, stage, cropType, x, y, phase, bed, zone }],
  chickens: [{ id, baseX, baseY, phase, ambient, zone }],
  trees: [{ x, y, key, language }],
  objects: [{ id, type, x, y, zone, ambient, language?, axis? }],
  decorations, scarecrow
}
```

`seconds` 是绘制时间参数，不改变贡献数据。当前档位切换重新生成场景，尚未实现成长帧和位置补间。由同一周稳定日期派生风相位，不因为排序位置变化而随机换风。

### src/art-catalog.js — 首批24种清单

- 固定24个对象 ID，类别数量为3／4／2／2／5／3／2／1／2。
- 每种保存中文名、类别、帧名、场景高度、预留视觉宽度、脚底占地与是否可移动；对象数与动作帧数分开计算。视觉宽度需覆盖整组实际帧，测试与 manifest 同步核对。
- 比例基准（逻辑像素高）：农夫36、小鸡16、小屋142、谷仓168、阔叶树124、松树132；素材册缩略图不代表这些场景尺寸。
- 三种作物各五阶段；农夫、鸡、猫、鱼、芽芽各四帧。基础动作以侧向和少量状态变化为主，尚非完整四方向素材。
- `finishSpriteEdges(image, type, frame)`：供离线编译和回归测试使用。根据原透明区域计算三像素轮廓带，邻近主体色去残边并降低过黑描边，外圈 alpha 降为原值的75%；植物底部约4.5%高度额外渐隐，不处理种子底座或居民脚部。内部颜色与尺寸不改，不将草地颜色混入图集。`ART_FINISH_REVISION` 当前为1。

### src/farm-objects.js — 环境与轻布置

- `FARM_ZONES`：住宅、畜牧、种植、池塘花园、林地五区，各自定义 `shape` 矩形并集、`allowed` 素材白名单、建筑／角色锚点与入口；林地另有树冠范围。局部功能边缘可交叠，但物件保持原区域归属，不可跨区散放。
- `FARM_MAP`：先引用区域／入口，再用折线路线派生道路保护带；底图、活动和布置共享数据。两块错落田地分别为5列×6行（30周）和4列×6行（使用23槽），每块独立定义网格与边界，总容量53周；排序和日期保留，槽位位置已重建。
- `createFarmObjects(scene)`：先落建筑与角色锚点，再组成畜牧围栏、门廊装饰、池岸花草和林边矿物。额外语言树／Issue 花保留来源；花草仅在预留位置尝试±4像素确定性变化，通过同一套布置校验后采用，否则保留锚点。
- 取消原整幅上边界围栏，改为围住谷仓的前栏、侧栏和后方短栏，东侧留门；纵向木栏以像素立柱／栏杆绘制，是现有围栏的侧面表达，不新增素材种类。碰撞与命中使用对应的8×30脚底及完整立面范围。
- `sampleResident()`：农夫以20秒周期沿门廊—路口—田侧路径往返并停留；猫留在门廊、芽芽留在池岸。仍是预设路线与基础侧向帧，不是自由寻路。`sampleFish()` 在池内游动，水面额外裁切。
- `objectDepth()`／`objectPose()`：绘制与命中共享地面层优先级和当前姿态；选择框也跟随角色当前脚位。
- `hitTestObject()`：浏览器传入 manifest，按当前帧比例与可见矩形命中；睡猫不再使用站立高度。仍非逐像素检测。
- `visualBounds()` 与 `objectBounds()` 分离：前者覆盖整组动作、取整与风摆余量，后者是脚底占地。
- `containsInZone()`：将待放矩形按区域边界切成竖条，验证各条的纵向覆盖，避免仅检查外包矩形而越过凹口。
- `placementAt()`／`moveFarmObject()`：4像素吸附；完整外观留在地图内，脚底留在所属区域、符合素材白名单，避开耕地、所有通路、鸡活动范围与其他物件。树冠还须留在林地上方，不能遮住房屋和耕地；所有可移动物件的外观均不得遮住作物根部点选区。只替换 `objects`，不改变贡献统计。
- 建筑、池塘、围栏、铺路石与角色固定；花草、树、灯、井、稻草人和矿物可移动，暂不支持新增、旋转或无限摆放。

### src/renderer.js — Node.js 图片适配器

- `loadSpringAssets()`：读取并缓存背景、透明图集和 manifest；加载失败后允许重试。
- `renderLivingFarm(scene, width, height, options)`：调用共享 `drawFarm()` 并返回 PNG Buffer，宽高限制为 1–4096 的整数。
- 原 `renderScene()` 与旧资源读取逻辑保留用于历史代码，不是 CLI 默认入口。

同一场景、时间和绘制环境可重现同一图片；不同浏览器与原生 Canvas 的编码／像素实现不保证字节完全相同。

### src/fetcher.js — GitHub 数据

- GraphQL 请求使用服务端 Token 和 15 秒超时。
- 用户不存在时给出独立错误类型，供 HTTP 层返回 404。
- 真实查询失败不自动伪装成演示数据。
- 当前 PR、Issue 是账号累计总数；语言是自有仓库主语言计数，不能当作精确代码量占比。
- 现有连续贡献计算仍沿用旧实现，跨时区与当天尚未贡献的边界需后续专项完善。

### src/index.js — CLI

默认使用新资产与共享场景，仍输出 `dist/farm.png`。

```bash
npm run build
node src/index.js --mock --profile high --evening --output dist/evening.png
npm run build:real
```

最后一条需要 `GITHUB_TOKEN`。无 Token 且未显式 `--mock` 时失败，不静默生成假真实数据。

### dev-server.mjs — 本地服务

默认监听 `127.0.0.1:3000`。启动时生成一张演示 PNG；不主动打开浏览器、不部署外部服务。

| 路由 | 用途 |
|---|---|
| `/` | 动态农场界面 |
| `/api/config` | 默认用户名、真实数据是否可用；不包含 Token |
| `/api/farm?user=octocat&mode=demo&profile=medium` | 演示场景 JSON |
| `/api/farm?user=octocat&mode=github` | 真实贡献场景 JSON |
| `/api/preview.png?user=octocat&mode=demo&profile=high` | 服务端 PNG；`evening=1` 切换暮色 |
| `/farm.png` | 启动时的默认演示 PNG，不随网页设置更新 |
| `/assets/spring/catalog24.png` | 24种素材联系表 |

安全与资源边界：

- 只支持 GET／HEAD；用户名、数据模式、档位严格验证。
- 静态资源按白名单提供，不开放整个工程或色键源稿。
- 真实查询按小写用户名缓存 10 分钟，最多 64 项，同名并发合并。
- 最多 4 个真实上游并发，每分钟最多 20 次未命中查询；错误不缓存。
- Token 不传入 URL、浏览器或场景 JSON；上游敏感错误不直接返回。
- 上述为本地样板保护措施，不代替公共服务的身份隔离、分布式缓存、CDN 或防滥用机制。

### web/ — 浏览器交互

`index.html`、`style.css`、`app.js` 组成无打包步骤的静态界面。

- 资产只加载一次；`requestAnimationFrame` 限制约30次绘制／秒。`mapRevision` 用于记录版本和测试核对，并非前端自动缓存失效协议；地图／图集更新后需重启本地服务并刷新页面。
- 隐藏页面不推进动画时钟；减少动态效果偏好默认暂停。
- 使用 AbortController 和请求序号避免快速切换后旧响应覆盖新场景。
- 文本使用 `textContent`，不把用户名拼接到 HTML。
- PNG 导出使用独立画布，保留当前动画时刻、物件位置与光照，不带选中框和界面控件。
- 布置为先点选、再点击所属区域内的可用位置；详情与状态提示显示区域名称。支持画布方向键4像素微调和 Esc 取消选择，没有拖拽手势。
- 撤销栈最多20步，只保存不可变的对象数组；恢复默认可撤销。成功切换账号／档位后恢复默认，失败时保留原布置与撤销栈。
- 素材册内有24个带文字和可访问名称的按钮。布置没有写入 localStorage 或后端，页面已明确提示只保留本次预览。

## 3. 美术资产与可复现加工

```text
assets/spring/
  background.png     铺满画布的草地、土路、门前空地与耕地，无天空或浮岛断面
  source-atlas.png   已认可的初版源稿，保留6种对象与2朵云
  sources24/         新作物／庭院／居民／矿物／空地源稿
  sprites.png        2048×1792透明图集，53个精灵
  manifest.json      version 2／mapRevision 5／finishRevision 1；24种清单、51个对象帧＋2朵保留云及源图范围
  catalog24.png      24种对象联系表，用于人工审美验收
scripts/
  build-spring24.mjs       当前首批24种编译器
  prepare-spring-art.mjs   初版16帧加工脚本，不用于覆盖新版
  render-samples.mjs       固定演示数据的美术验收样张
```

运行 `npm run art:build` 可从项目内源稿重新生成图集、manifest、空地底图和联系表，不调用图像模型。首次导入可给 `scripts/build-spring24.mjs` 传生成原稿目录；后续不需要原机器路径。

新图集每格256×256。作物、居民使用网格切分，建筑稿按人工检查后的实际范围切分，避免屋顶跨格被裁断。洋红与青色色键分开处理：紫水晶使用青底，不能套用紫红去底条件。泛洪不能无约束沿相邻颜色递进，否则会吞掉轮廓和主体；当前只对谷仓的亮色背景光晕额外限定清理。

角色帧组在打包和绘制时均共用缩放系数，睡猫不会被拉高成站立高度；植物各阶段分别按场景尺寸绘制。绘制采用底部中心锚点，源图边界记录在 manifest 中。新增图稿后必须检查边缘色溢、脚位、细枝和主体完整性，不能把色键清理成功等同于美术验收。

当前底图采用确定性多尺度色块与稀疏草纹，恢复明亮草绿、暖黄土路，保留边缘融合；林地下草色略深，畜牧院有踩踏草地，门廊留暖色空地。道路由入口网络派生，宽路在保护带内微曲，窄田间小径不做同幅度收边和摆动，以免断续；圆钝路肩与田块边缘使用分级过渡。原地形源稿与两朵云保留，不用于地面绘制。53周成熟株的完整范围、根部落土与点选、道路保护均有测试。

## 4. 验证与实际截图

```bash
npm run art:build
npm test
npm run build
npm run samples
npm run dev
```

- `test/living-farm.test.js`：30项测试，覆盖场景与API、24种／53帧、比例与素材完整性、落土、导出、完整动作周期、边缘融合与移动无残影；另覆盖五区白名单和凹形边界、7个用户名×3档默认合法性、道路连通、鸡院留门、30＋23周容量与根部点选保护。
- `npm run samples`：生成 `dist/spring-low.png`、`spring-medium.png`、`spring-high.png`、`spring-evening.png`、`spring-frame-4s.png`。
- 同步生成 `docs/images/spring-preview.png`，不覆盖两张原始 README 参考图。院落重构首次使用 `npm run samples -- --save-courtyard-baseline --courtyard-compare` 保存旧中档图并生成等比全图对比；后续只传 `--courtyard-compare`，输出 `dist/spring-courtyard-comparison.png`。旧边缘融合对比及基准另行保留，不用旧局部裁切评价新构图。
- 自动化与 PNG 比对不能替代浏览器交互、手机适配和最终审美验收；验证结果见 DEVLOG。

## 5. 保留与后续迁移

旧 `farm-layout.js`、`themes/stardew.js`、`assets/sprites/cropped/`、旧场景和 `python/` 保留。工作区已有 Python workflow，本轮不修改、不触发，不能据此认为新动态版已有 Action 发布能力。

后续严格按用户确认的三阶段推进：①农场美术与操作 → ②整个网站显示与交互 → ③与 GitHub 关联。当前不扩展第二、第三阶段；第一阶段首批24种已确认并实现，范围与待验收项详见 PRD，64种扩展尚未批准。旧 `assets/sprites/` 已列入待淘汰范围，替换完成并核对旧渲染器／Python 依赖后再清理。公共服务上线前必须单独设计 Token 权限、匿名额度和授权用户数据隔离。
