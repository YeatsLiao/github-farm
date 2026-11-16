# GitHub Farm

[简体中文](docs/README.zh-CN.md) · [Live farm](https://yeatsliao.github.io/github-farm/)

A GitHub repository’s stars grow a pixel-art farm. Each repository gets a stable layout. Crops, animals, and buildings appear as it reaches new milestones, while existing landmarks stay in place.

[![GitHub Farm and its star statistics](https://yeatsliao.github.io/github-farm/farm.png)](https://yeatsliao.github.io/github-farm/)

## Add a farm to your README

Copy this line to show the farm above. To display your own repository’s stars, follow the [Pages setup guide](docs/DEPLOYMENT.md).

```markdown
[![GitHub Farm](https://yeatsliao.github.io/github-farm/farm.png)](https://yeatsliao.github.io/github-farm/)
```

## Run locally

```sh
npm ci
npm test
npm run build -- --repo YeatsLiao/github-farm
```

Open `dist/pages/index.html` to preview the result.

[Project structure](docs/ARCHITECTURE.md) · [Asset guide](docs/ASSETS.md) · [Contributing](docs/CONTRIBUTING.md) · [MIT License](LICENSE)
