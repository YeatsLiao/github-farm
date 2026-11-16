# Spring sprite generation drafts

2026-11-05; built-in image_gen source sheets, matching the approved A concept. Prompts requested original cozy top-down pixel sprites on transparent backgrounds, exact uniform grid cells, no ground or text: 3×2 buildings/upgrades/coop/barn/windmill, 4×3 trees/plants, 4×4 crops/residents/props. Model identifier was not exposed by the tool. These are original AI-assisted assets; no Stardew Valley game files were extracted.

2026-11-06 correction: the generated PNGs contain usable alpha. The tinted preview was not sufficient evidence of an opaque source background. `scripts/art/build-star-spring.mjs` ignores alpha below 96 and packs the retained subjects into the native-size transparent atlas. This has been visually checked against a cream background and the rendered scene. The compiler outputs 34 frames (including three cottage upgrade variants), not 34 distinct object types. Final visual approval is still pending.

| Draft source | SHA-256 |
|---|---|
| `buildings/buildings-draft.png` | `78C448BA9A88DA20A1453D3B1A9B02E71F16FD7203B3F91B843E48B3DBDE87CA` |
| `nature/nature-sheet.png` | `79F52065A905EB7AACB072A5C00B8C3F9B5F14F6C4EB5BE804E6DB78103E4FFA` |
| `props/props-sheet.png` | `077F8CB97DD29E95D92D518906752C3C839B3D775D701F93987895475FC49272` |

Runtime samples now read only `assets/runtime/spring/atlas.png` and `manifest.json`; the old `assets/spring/` atlas is no longer a dependency of this sample generator. `compiled-sources.json` records exact source hashes, dimensions and paths. Rebuild: `npm run art:star-farm`. Source prompts describe the listed layouts; the full original generation call remains in this chat history. Asset source labels ending in draft are retained for provenance rather than silently renamed.
