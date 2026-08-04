# GitHub Farm

**English** | [中文](./README.zh-CN.md)

> Turn your GitHub contributions into a Stardew Valley-style pixel farm

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## What is this?

GitHub Farm visualizes your GitHub contribution data as a **Stardew Valley-style pixel farm**:

- Commits = Crops - weekly contributions sorted left-to-right, growing from seed to harvest
- Trees = Languages - your top programming languages appear as trees on the grassland
- Animals = PRs - merged pull requests bring animals to your farm
- Decorations = Issues - issue participation adds flowers and decorations

## Quick Start

### Local Development

```bash
npm install
npm run dev      # Start dev server with live preview (mock data by default)
```

To use real GitHub data, set your token:

```bash
# Windows PowerShell
$env:GITHUB_TOKEN="ghp_your_token_here"; npm run dev

# macOS / Linux
GITHUB_TOKEN=ghp_your_token npm run dev
```

The dev server generates a PNG, starts a local HTTP server at `http://localhost:3000`, and opens your browser automatically. Edit code → Ctrl+C → `npm run dev` to refresh.

### Generate PNG only

```bash
npm run build          # Generate with mock data → dist/farm.png
npm run build:real     # Generate with real data (requires GITHUB_TOKEN)
```

### As GitHub Action

Add workflow to your `username/username` repo:

```yaml
name: Generate Farm
on:
  schedule:
    - cron: '0 0 * * *'
  workflow_dispatch:
jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - uses: YeatsLiao/github-farm@main
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          output: farm.png
          theme: stardew
```

## Data Mapping

| GitHub Data | Farm Element | Description |
|---|---|---|
| Weekly contributions (sorted) | Crop growth stage | 5 stages: seed → sprout → growing → tall → harvest |
| Top programming languages | Trees | Each language = one tree, up to 5 |
| Merged PRs | Animals | 1 animal per 8 PRs, up to 5 |
| Issue participation | Decorations | 1 decoration per 6 issues, up to 4 |
| Streak ≥ 30 days | Scarecrow | Placed at field edge |

## Project Structure

```
github-farm/
├── src/
│   ├── index.js           # Main entry + CLI
│   ├── fetcher.js         # GitHub GraphQL API + mock data
│   ├── renderer.js        # Canvas pixel-art renderer
│   ├── farm-layout.js     # Farm layout algorithm
│   └── themes/
│       └── stardew.js     # Stardew Valley theme config
├── assets/
│   ├── sprites/cropped/   # Individual pixel sprites (crops, trees, animals)
│   └── scenes/            # Background image
├── dev-server.mjs         # Local dev server with live preview
├── dist/                  # Build output (PNG)
├── docs/
│   ├── PRD.md             # Product requirements
│   ├── ARCHITECTURE.md    # Architecture design
│   └── DEVLOG.md          # Dev notes & pitfalls
└── package.json
```

## Tech Stack

- **Node.js** - Runtime
- **Canvas** (npm `canvas`) - Pixel-art PNG rendering
- **GitHub GraphQL API** - Contribution data
- **GitHub Actions** - Automation (planned)

## Roadmap

- [x] Canvas pixel-art renderer
- [x] 5-stage crop system with sorted column layout
- [x] Trees, animals, decorations from GitHub stats
- [x] Local dev server with live preview
- [ ] GitHub Action wrapper
- [ ] Multi-theme support (4 seasons)
- [ ] Online preview/config tool

## Documentation

| Doc | Description |
|-----|-------------|
| [PRD.md](./docs/PRD.md) | Product requirements — features, user scenarios, competitors |
| [ARCHITECTURE.md](./docs/ARCHITECTURE.md) | Architecture — module design, data flow, extension points |
| [DEVLOG.md](./docs/DEVLOG.md) | Dev log — renderer iterations, pitfalls |

## License

MIT (c) YeatsLiao
