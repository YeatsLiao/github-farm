# GitHub Farm

[简体中文](docs/README.zh-CN.md) · [Live farm](https://yeatsliao.github.io/github-farm/)

A GitHub repository’s stars grow a pixel-art farm. Each repository gets a stable layout. Crops, animals, and buildings appear as it reaches new milestones, while existing landmarks stay in place.

[Open the generator](https://yeatsliao.github.io/github-farm/) and enter any public repository as `OWNER/REPO` or paste its GitHub URL. [Try octocat/git-consortium](https://yeatsliao.github.io/github-farm/?repo=octocat%2Fgit-consortium).

Move through the growth timeline to compare still images of the same farm. Select **Show places** to inspect the map. [Starter farms](https://yeatsliao.github.io/github-farm/farm-materials.png) · [100–300 Stars](https://yeatsliao.github.io/github-farm/farm-expansions.png) · [300–1,000 Stars](https://yeatsliao.github.io/github-farm/farm-workyards.png)

[![GitHub Farm and its star statistics](https://yeatsliao.github.io/github-farm/farm.png)](https://yeatsliao.github.io/github-farm/)

## Add a farm to your README

- **Share a farm.** Copy the generated page URL, or download the PNG and add it to your repository.
- **Keep the image up to date.** Set up GitHub Actions and Pages for the public repository you want to feature. The workflow rebuilds its PNG daily. [Pages setup guide](docs/DEPLOYMENT.md#发布可自动更新的-readme-图片)

The Markdown below embeds this project's published farm.

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

[Project structure](docs/ARCHITECTURE.md) · [Delivery and roadmap](docs/UPGRADE-PLAN.md) · [Asset guide](docs/ASSETS.md) · [Contributing](docs/CONTRIBUTING.md) · [MIT License](LICENSE)
