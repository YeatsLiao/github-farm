# Contributing to GitHub Farm

Use the [issue templates](https://github.com/YeatsLiao/github-farm/issues/new/choose) for bugs, ideas, and art contributions. For visual changes, include before and after images at the same repository and star count.

## Code

Run `npm ci`, `npm test`, and `npm run build -- --repo YeatsLiao/github-farm`. Open `dist/pages/index.html` to inspect the result. Run `npm run preview:star-farm` if the change affects layouts or rendering.

Keep farm rules under `src/farm/`, drawing code under `src/render/`, and command entry points under `scripts/`. Update the relevant guide when changing a command, asset path, or deployment step. See the [project structure](ARCHITECTURE.md).

## Art

Keep source sheets under `assets/source/` and the matching atlas and manifest under `assets/runtime/`. Include provenance for new art and regenerate the atlas with `npm run art:star-farm`. See the [asset guide](ASSETS.md).
