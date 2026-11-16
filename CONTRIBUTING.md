# Contributing to GitHub Farm

Open an [issue](https://github.com/YeatsLiao/github-farm/issues/new/choose) for bugs, ideas, or pixel art contributions. For a visual issue, include a card or screenshot and the star count that produced it.

## Code

```sh
npm ci
npm test
npm run build -- --repo YeatsLiao/github-farm
```

Open `dist/pages/index.html` to verify the card. Run `npm run preview:star-farm` for the layout and growth comparisons. See the [project guide](docs/ARCHITECTURE.md) for the file layout.

## Art

Keep transparent source sheets in `assets/source/<season>/<category>/` with their source and usage notes. Update the relevant sprite definitions in `src/art/`, run `npm run art:star-farm`, and include the matching atlas and manifest in `assets/runtime/`. For layout changes, attach before and after cards from the same repository and milestone.
