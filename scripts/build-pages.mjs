import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { createStarterScene } from '../src/farm/scene.js';
import { fetchRepositoryStars } from '../src/repository-stars.js';
import { renderStarCard } from '../src/render/card.js';

const output = new URL('../dist/pages/', import.meta.url);

try {
  const { values } = parseArgs({ options: { repo: { type: 'string' } } });
  const repository = values.repo ?? (process.env.STAR_FARM_REPOSITORY || process.env.GITHUB_REPOSITORY);
  if (!repository) throw new Error('Pass --repo OWNER/REPO or set GITHUB_REPOSITORY');

  const snapshot = await fetchRepositoryStars(repository);
  const png = await renderStarCard(createStarterScene(snapshot));
  await mkdir(output, { recursive: true });
  await writeFile(new URL('farm.png', output), png);
  await copyFile(new URL('./pages.html', import.meta.url), new URL('index.html', output));
  console.log(`Built dist/pages/ for ${snapshot.fullName} (${snapshot.stars} stars)`);
} catch (error) {
  console.error(`Failed to build Pages: ${error.message}`);
  process.exitCode = 1;
}
