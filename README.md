# GitHub Farm

[简体中文](docs/README.zh-CN.md) · [Live farm](https://yeatsliao.github.io/github-farm/)

A GitHub repository’s stars grow a pixel-art farm. Each repository gets a stable layout. Crops, animals, and buildings appear as it reaches new milestones, while existing landmarks stay in place.

[Open the generator](https://yeatsliao.github.io/github-farm/) and enter any public repository as `OWNER/REPO` or paste its GitHub URL. [Try octocat/git-consortium](https://yeatsliao.github.io/github-farm/?repo=octocat%2Fgit-consortium).

Move through the growth timeline to compare still images of the same farm. Select **Show places** to inspect the map. [Starter farms at 0, 25 and 100 stars](https://yeatsliao.github.io/github-farm/farm-materials.png) · [Expansions at 100, 200 and 300 stars](https://yeatsliao.github.io/github-farm/farm-expansions.png).

[![GitHub Farm and its star statistics](https://yeatsliao.github.io/github-farm/farm.png)](https://yeatsliao.github.io/github-farm/)

## Add a farm to your README

The generator gives you a shareable link and a downloadable PNG of the current farm. This line embeds the farm shown above. For a PNG that updates automatically for your repository, follow the [Pages setup guide](docs/DEPLOYMENT.md).

```markdown
[![GitHub Farm](https://yeatsliao.github.io/github-farm/farm.png)](https://yeatsliao.github.io/github-farm/)
```

## Run locally

```sh
npm ci
npm test
npm run build -- --repo YeatsLiao/github-farm
python -m http.server 8080 --bind 127.0.0.1 --directory dist/pages
```

Open [localhost:8080](http://localhost:8080) to try the generator.

[Project structure](docs/ARCHITECTURE.md) · [Asset guide](docs/ASSETS.md) · [Contributing](docs/CONTRIBUTING.md) · [MIT License](LICENSE)
