import { cp, mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { createStarterScene } from '../src/farm/scene.js';
import { fetchRepositoryStars } from '../src/repository-stars.js';
import { renderFarmIcon, renderStarCard } from '../src/render/card.js';
import { renderExpansionComparison, renderMaterialComparison, renderMidgameComparison, renderOrchardComparison, renderOrchardDetails } from './preview-farms.mjs';

const root = new URL('../', import.meta.url);
const output = new URL('dist/pages/', root);

const browserFiles = [
  ['scripts/pages.html', 'index.html'],
  ['scripts/pages.js', 'app.js'],
  ['src/repository-stars.js'],
  ['src/farm'],
  ['src/render/draw-card.js'],
  ['src/render/ground.js'],
  ['src/render/props.js'],
  ['assets/runtime'],
];

async function copyBrowserFiles() {
  await Promise.all(browserFiles.map(async ([source, filename = source]) => {
    const destination = new URL(filename, output);
    await mkdir(dirname(fileURLToPath(destination)), {recursive: true});
    await cp(new URL(source, root), destination, {recursive: true});
  }));
}

try {
  const { values } = parseArgs({ options: { repo: { type: 'string' } } });
  const repository = values.repo ?? (process.env.STAR_FARM_REPOSITORY || process.env.GITHUB_REPOSITORY);
  if (!repository) throw new Error('Pass --repo OWNER/REPO or set GITHUB_REPOSITORY');

  const snapshot = await fetchRepositoryStars(repository);
  const png = await renderStarCard(createStarterScene(snapshot));
  await mkdir(output, { recursive: true });
  await writeFile(new URL('farm.png', output), png);
  await writeFile(new URL('snapshot.json', output), JSON.stringify(snapshot));
  await writeFile(new URL('favicon.png', output), await renderFarmIcon());
  await writeFile(new URL('orchard-growth.png', output), await renderOrchardComparison());
  await writeFile(new URL('orchard-details.png', output), await renderOrchardDetails());
  await writeFile(new URL('farm-materials.png', output), await renderMaterialComparison());
  await writeFile(new URL('farm-expansions.png', output), await renderExpansionComparison());
  await writeFile(new URL('farm-workyards.png', output), await renderMidgameComparison());
  await copyBrowserFiles();
  console.log(`Built dist/pages/ for ${snapshot.fullName} (${snapshot.stars} stars)`);
} catch (error) {
  console.error(`Failed to build Pages: ${error.message}`);
  process.exitCode = 1;
}
