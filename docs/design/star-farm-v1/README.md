# Star Farm v1 设计稿记录

日期：2026-11-05。工具：内置 image_gen；仅视觉探索，未接入运行时。

- style-a-reference.png：用户选定的 A 方向原图，原生成文件 exec-bc2b9ffc-ca75-46d5-83a0-585896302e8b.png。
- readme-card.png：带信息的 README 卡片概念稿，示例数据，不是实际仓库统计。
- growth-stages.png：同一示例项目 32 / 320 / 1,280 Stars 三档概念对照，示例数据。
- 两张新稿均引用 style-a-reference.png；未覆盖旧素材。
- 模型生成图中的文字、位置、像素网格仅供设计评审；最终由代码排字、共享坐标和规范图集保证准确。
- 本轮不是星露谷原素材提取；发布前按计划登记素材来源、使用条件与字体许可证。

## card 完整提示词

```text
Use case: ui-mockup. Make one polished README embeddable farm statistics image, landscape 4:3 aspect ratio, high resolution. Reference image is approved style A, use it strictly for warm cohesive pixel countryside RPG art, original red roof cottage, barn, orchard, pond, winding path. Preserve its charm, consistent perspective and pixel density; simplify overly fine texture for clarity at 640px wide. This is a design mockup only.
The card must be ONE cohesive flat image, no browser frame, no device, no extraneous labels. Layout proportional: top cream header 10% height, middle farm art 75% height, bottom cream statistics footer 15% height. Dark brown legible restrained monospace typography, tiny pixel-leaf icon, thin muted brown separators, no ornate UI. All information typeset on header/footer only, none floating on scenery.
Exact header text: "YeatsLiao / github-farm" and smaller "A little farm grown by your community."
Main scene HIGH STAR stage at 1280 stars: cozy medium cottage upper-left, barn upper-center, four-tree fruit orchard upper-right, 3 compact crops beds front-left/center, 2 chickens, tiny farmer, small pond lower-right. Winding paths connect doors. Same camera and composition as reference, no isometric view, warm greens and golden light. No windmill yet.
Footer exact text, two clear rows: "STARS  1,280     NEW STARS / 7D  +86     STAGE  FLOURISHING"
then "NEXT: WINDMILL AT 5,000  |  3,720 TO GO"
Small final footer baseline: "Updated 2026-11-05 08:00 UTC  •  DEMO DATA"
Data are fictional illustrative demo. Do not include reference letter A. Beautiful art dominates; clean compact readable informative card that looks good in an actual GitHub README. No growth graph, no icons over farm, no random additional metrics.
```

## stages 完整提示词

```text
Use case: stylized-concept. Create a single wide landscape art direction comparison board, three equally sized farm cards side by side, a clean 3:1-ish composition. Reference image is approved Style A: cohesive warm near-top-down pixel farming RPG countryside, red roof cottage and red barn, warm cream labels. Exact same project, exact same fixed terrain, exact same camera, house location upper-left, pond location lower-right and winding path backbone across ALL THREE panels. Visually make these consecutive stages of ONE place, not 3 different farms. No isometric or 3D.
Each panel: cream header with repo name "YeatsLiao / github-farm", full farm scene, cream metric footer. Art remains legible. Do not include reference letter A.
Left panel title "LOW · 32 STARS": small simple single-story cottage at upper-left, ONE lovingly tended small bed front-left, one young fruit tree upper-right, pond lower-right with natural reeds, open grass and wildflowers where future barn and beds will go. One tiny farmer. This low-star farm is cozy and complete, never barren or punished. Footer exact: "NEW STARS / 7D  +4" then "SEEDLING  ·  NEXT STAGE: 100".
Middle panel title "MID · 320 STARS": SAME cottage position with a small upgraded porch, modest small chicken coop upper-center, 2 beds at front-left/center, 2 fruit trees upper-right, 2 chickens, SAME pond lower-right, same farmer scale and paths. Footer exact: "NEW STARS / 7D  +24" then "GROWING  ·  NEXT STAGE: 1,000".
Right panel title "HIGH · 1,280 STARS": SAME cottage position with flowerboxes and extra small side roof, red barn replaces coop in upper-center same footprint, 3 beds front-left/center, four-tree orchard upper-right, 2 chickens, same pond now little dock, same farmer. Footer exact: "NEW STARS / 7D  +86" then "FLOURISHING  ·  NEXT: WINDMILL AT 5,000".
Keep every camera crop, terrain shoreline, tree backdrop and composition anchor identical. Expansions go on predefined empty grass, no random scatter. Same restrained pixel palette and deliberate pixel clusters across all three. White/cream clean gutter, editorial comparison board, highly charming yet production-oriented. No giant mushroom, no star-shaped props, no grid of 53 contribution plots, no large river. All three stages sunny spring daylight, readable at thumbnail scale.
```
