import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { createStarterScene } from '../src/farm/scene.js';
import { renderStarCard } from '../src/render/card.js';
import { fetchRepositoryStars } from '../src/repository-stars.js';

try {
  const {values} = parseArgs({options: {
    id: {type: 'string'}, repo: {type: 'string'}, stars: {type: 'string'},
    out: {type: 'string', default: 'dist/starter-farm.png'},
  }});
  const demo = values.id !== undefined || values.stars !== undefined;
  if (demo && (!values.id || !/^\d+$/.test(values.stars ?? '0'))) throw Error('Demo mode requires --id and accepts a non-negative --stars number');
  const snapshot = demo
    ? {repositoryId: values.id, fullName: values.repo, stars: Number(values.stars ?? 0), newStars7d: null, fetchedAt: 'LOCAL PREVIEW'}
    : await fetchRepositoryStars(values.repo);
  const scene = createStarterScene(snapshot);
  const path = resolve(values.out);
  const png = await renderStarCard(scene);
  await mkdir(dirname(path), {recursive: true});
  await writeFile(path, png);
  console.log(`${scene.theme}, ${snapshot.stars} Stars → ${path}`);
} catch (error) {
  console.error(error.message);
  console.error('Usage: npm run build:star-farm -- --repo OWNER/REPO [--out FILE] [--id DEMO_ID --stars 25]');
  process.exitCode = 1;
}
