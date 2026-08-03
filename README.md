# GitHub Farm

> Turn your GitHub contributions into a Stardew Valley-style pixel farm

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## What is this?

GitHub Farm visualizes your GitHub contribution data as a **Stardew Valley-style pixel farm**:

- Commits = Planting - more commits, crops grow from seed to harvest
- Buildings = Achievements - unlock barn, windmill, fences with streaks
- Animals = Activity - more active days, livelier farm
- Trees = Languages - different languages grow into different trees

## Quick Start

### As GitHub Action (Recommended)

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
          output: farm.svg
          theme: stardew
```

### Local Development

```bash
npm install
npm run dev      # Start dev server with live preview
npm run build    # Generate SVG/PNG
```

## Data Mapping

| GitHub Data | Farm Element | Description |
|---|---|---|
| Daily commits | Crop growth | 0=empty, 1=seed, 2=sprout, 3=growing, 4+=harvest |
| Streak days | Farm expansion | Unlock new areas and buildings |
| Language distribution | Tree types | Java=oak, Python=willow, JS=maple |
| PR merges | Animals appear | Farm becomes more alive |
| Issue participation | Flowers/decorations | Farm embellishments |
| Total contributions | Season changes | Spring/Summer/Autumn/Winter visuals |

## Project Structure

```
github-farm/
- src/
  - index.js           # Main entry
  - fetcher.js         # GitHub API data fetching
  - renderer.js        # SVG scene renderer
  - farm-layout.js     # Farm layout algorithm
  - themes/
    - stardew.js       # Stardew Valley theme config
- assets/
  - sprites/           # Pixel sprites (crops, buildings, characters, animals)
  - scenes/            # Scene templates
- dist/                # Build output
- .github/
  - workflows/
    - farm.yml         # GitHub Action definition
- package.json
- README.md
```

## Tech Stack

- Node.js - Runtime
- SVG - Render output (embeddable in any Markdown)
- GitHub API - Fetch contribution data
- GitHub Actions - Automation

## Roadmap

- [x] Project init and docs
- [ ] Pixel art sprite assets
- [ ] GitHub API data fetcher
- [ ] SVG render engine
- [ ] Farm layout algorithm
- [ ] Stardew Valley theme
- [ ] GitHub Action wrapper
- [ ] Multi-theme support (4 seasons)
- [ ] Online preview/config tool

## License

MIT (c) YeatsLiao
