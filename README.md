# GitHub Farm

[简体中文](README.zh-CN.md) · [View the farm](https://yeatsliao.github.io/github-farm/)

GitHub Farm turns a repository’s stars into a pixel-art farm. The repository ID gives the farm a stable layout. As stars accumulate, existing landmarks stay in place and new crops, animals, buildings, and decorations appear.

[![GitHub Farm and its star statistics](https://yeatsliao.github.io/github-farm/farm.png)](https://yeatsliao.github.io/github-farm/)

## Add it to a README

Paste this line to show this repository’s farm. It includes the star count, stars gained over the last seven complete days when available, the current stage, and the next milestone.

```markdown
[![GitHub Farm](https://yeatsliao.github.io/github-farm/farm.png)](https://yeatsliao.github.io/github-farm/)
```

To show your own repository’s farm, fork this project and follow the [Pages setup guide](docs/ARCHITECTURE.md#publish-your-own-farm). Actions checks the repository daily and publishes a fresh PNG. The stable image URL works in a README.

## Farm growth

Every farm starts with a furnished settlement in one of three layouts. Early milestones are 1, 5, 10, 25, and 50 stars, followed by a new stage every 100 stars through the windmill at 5,000. The card keeps counting stars above that milestone.

## Local development

```sh
npm ci
npm test
npm run build -- --repo YeatsLiao/github-farm
```

Open `dist/pages/index.html` to see the Pages output. The [project guide](docs/ARCHITECTURE.md) covers source files, assets, and deployment.

[Contributing](CONTRIBUTING.md) · [MIT License](LICENSE)
