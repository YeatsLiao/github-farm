import { createStarterScene } from './src/farm/scene.js';
import { fetchRepositoryStars, parseRepository, RepositoryLookupError } from './src/repository-stars.js';
import { drawStarCard } from './src/render/draw-card.js';

const form = document.querySelector('#farm-form');
const input = document.querySelector('#repository');
const generate = document.querySelector('#generate');
const example = document.querySelector('#example');
const status = document.querySelector('#status');
const image = document.querySelector('#farm-image');
const download = document.querySelector('#download');
let artwork;
let currentCard;

function repositoryName(inputValue) {
  const value = inputValue.trim();
  const githubLink = /^https?:\/\/github\.com\/([^/?#]+\/[^/?#]+)\/?(?:[?#].*)?$/i.exec(value);
  const name = githubLink ? githubLink[1].replace(/\.git$/i, '') : value;
  const {owner, repo} = parseRepository(name);
  return `${owner}/${repo}`;
}

async function loadArtwork() {
  if (!artwork) {
    artwork = (async () => {
      const atlas = new Image();
      atlas.src = new URL('./assets/runtime/spring-atlas.png', import.meta.url);
      const manifestUrl = new URL('./assets/runtime/spring-manifest.json', import.meta.url);
      const [response] = await Promise.all([fetch(manifestUrl), atlas.decode()]);
      if (!response.ok) throw new Error('Could not load the sprite manifest');
      return {atlas, manifest: await response.json()};
    })().catch(error => {
      artwork = undefined;
      throw error;
    });
  }
  return artwork;
}

function createCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function pngBlob(canvas) {
  return new Promise((resolve, reject) => canvas.toBlob(blob => {
    if (blob) resolve(blob);
    else reject(new Error('Could not export PNG'));
  }, 'image/png'));
}

function setStatus(message, error = false) {
  status.textContent = message;
  status.toggleAttribute('data-error', error);
}

async function showFarm(value) {
  if (generate.disabled) return;
  generate.disabled = true;
  example.disabled = true;
  input.readOnly = true;
  try {
    const name = repositoryName(value);
    setStatus(`Loading ${name}…`);
    const [snapshot, art] = await Promise.all([fetchRepositoryStars(name), loadArtwork()]);
    const scene = createStarterScene(snapshot);
    const png = await pngBlob(drawStarCard(scene, art, createCanvas));
    const updatedCard = URL.createObjectURL(png);
    image.src = updatedCard;
    image.alt = `${snapshot.fullName} pixel farm, ${snapshot.stars.toLocaleString('en-US')} stars, stage ${scene.stage.number} of ${scene.stage.total}`;
    download.href = updatedCard;
    download.download = `${snapshot.fullName.replace('/', '-')}-farm.png`;
    if (currentCard) URL.revokeObjectURL(currentCard);
    currentCard = updatedCard;
    input.value = snapshot.fullName;
    const link = new URL(location.href);
    link.searchParams.set('repo', snapshot.fullName);
    history.replaceState(null, '', link);
    setStatus(`${snapshot.fullName} · ${snapshot.stars.toLocaleString('en-US')} stars`);
  } catch (error) {
    const message = error instanceof RepositoryLookupError
      ? {
          400: 'Enter a repository as OWNER/REPO or paste its GitHub link.',
          404: 'Could not find a public repository with that name.',
          429: 'GitHub’s API limit was reached. Try again later.',
        }[error.status] ?? 'GitHub did not return the repository data. Try again in a moment.'
      : 'Could not draw the farm. Try again in a moment.';
    setStatus(message, true);
  } finally {
    generate.disabled = false;
    example.disabled = false;
    input.readOnly = false;
  }
}

form.hidden = false;
form.addEventListener('submit', event => {
  event.preventDefault();
  showFarm(input.value);
});
example.addEventListener('click', () => {
  input.value = example.textContent;
  showFarm(input.value);
});

const requested = new URLSearchParams(location.search).get('repo');
if (requested) {
  input.value = requested;
  showFarm(requested);
}
