import { createStarterScene, farmMilestones } from './src/farm/scene.js';
import { activityFrame } from './src/farm/yard.js';
import { fetchRepositoryStars, parseRepository, RepositoryLookupError } from './src/repository-stars.js';
import { prepareStarCard } from './src/render/draw-card.js';

const form = document.querySelector('#farm-form');
const input = document.querySelector('#repository');
const generate = document.querySelector('#generate');
const example = document.querySelector('#example');
const status = document.querySelector('#status');
const image = document.querySelector('#farm-image');
const download = document.querySelector('#download');
const canvas = document.querySelector('#farm-canvas');
const context = canvas.getContext('2d');
const controls = document.querySelector('#farm-controls');
const growth = document.querySelector('#growth');
const caption = document.querySelector('#stage-caption');
const currentStage = document.querySelector('#current-stage');
const shortcuts = [...document.querySelectorAll('[data-stars]')];
const places = document.querySelector('#places');
const details = document.querySelector('#place-info');
const placeName = document.querySelector('#place-name');
const placeDescription = document.querySelector('#place-description');
const motion = document.querySelector('#motion');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const format = new Intl.NumberFormat('en-US');
let artwork;
let currentCard;
let farm;
let view;
let focusedPlace;
let playing = !reducedMotion.matches;
let motionFrame;
let motionStart;
let motionTime = 0;
let lastPaint = 0;
let viewRequest;

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

function paintFrame(time) {
  if (time - lastPaint < 80) {
    motionFrame = requestAnimationFrame(paintFrame);
    return;
  }
  lastPaint = time;
  view.card.paint(activityFrame(view.scene.activity, (time - motionStart) / 1000));
  context.drawImage(view.card.canvas, 0, 0);
  motionFrame = requestAnimationFrame(paintFrame);
}

function setMotion(enabled) {
  playing = enabled;
  cancelAnimationFrame(motionFrame);
  if (motionStart !== undefined) motionTime = performance.now() - motionStart;
  motionStart = undefined;
  motion.textContent = playing ? 'Pause activity' : 'Play activity';
  if (playing && view) {
    motionStart = performance.now() - motionTime;
    lastPaint = 0;
    motionFrame = requestAnimationFrame(paintFrame);
  }
}

function showPlace(place) {
  focusedPlace = place?.id;
  placeName.textContent = place?.label ?? 'Explore the farm';
  placeDescription.textContent = place
    ? `${place.description} ${place.at ? `Unlocks at ${format.format(place.at)} Stars.` : 'Available from the start.'}`
    : 'Select a marker on the farm to explore.';
  for (const marker of places.children) {
    marker.setAttribute('aria-pressed', String(marker.dataset.place === focusedPlace));
  }
}

function showPlaces(scene) {
  const {x, y, width, height} = scene.viewport;
  const selected = scene.places.find(place => place.id === focusedPlace);
  const markers = [];
  for (const place of scene.places) {
    const left = (place.x - x) / width;
    const top = (place.y - y) / height;
    if (left < .025 || left > .975 || top < 0 || top > 1) continue;
    const locked = scene.snapshot.stars < place.at;
    const marker = document.createElement('button');
    marker.type = 'button';
    marker.className = 'map-marker';
    marker.dataset.place = place.id;
    marker.style.left = `${left * 100}%`;
    marker.style.top = `${10 + top * 75}%`;
    marker.toggleAttribute('data-locked', locked);
    marker.setAttribute('aria-label', locked ? `${place.label}, unlocks at ${place.at} stars` : place.label);
    marker.title = place.label;
    marker.addEventListener('click', () => showPlace(place));
    markers.push(marker);
  }
  places.replaceChildren(...markers);
  showPlace(selected);
}

function showGrowth(stars, currentScene, currentFrame) {
  if (!farm || (view?.scene.snapshot.stars === stars && !currentScene)) return;
  cancelAnimationFrame(motionFrame);
  const current = stars === farm.snapshot.stars;
  const scene = currentScene ?? createStarterScene(current ? farm.snapshot : {
    ...farm.snapshot, stars, newStars7d: null, source: 'preview',
  });
  const card = currentFrame ?? prepareStarCard(scene, farm.art, createCanvas);
  card.paint();
  view = {scene, card};
  context.drawImage(card.canvas, 0, 0);
  const amount = `${format.format(stars)} ${stars === 1 ? 'Star' : 'Stars'}`;
  const extra = !current && stars > farm.snapshot.stars ? ` · ${format.format(stars - farm.snapshot.stars)} to go` : '';
  caption.textContent = `${current ? 'Current farm' : 'Growth preview'} · ${amount}${extra}`;
  growth.value = farm.stages.indexOf(stars);
  growth.setAttribute('aria-valuetext', caption.textContent);
  canvas.setAttribute('aria-label', `${scene.name} for ${scene.snapshot.fullName}, ${amount}, stage ${scene.stage.number} of ${scene.stage.total}`);
  currentStage.setAttribute('aria-current', current ? 'step' : 'false');
  for (const button of shortcuts) button.setAttribute('aria-current', !current && Number(button.dataset.stars) === stars ? 'step' : 'false');
  showPlaces(scene);
  if (!focusedPlace) placeDescription.textContent = `${scene.activity.label}. Select a marker to explore.`;
  motionStart = undefined;
  motionTime = 0;
  setMotion(playing);
}

async function scheduledSnapshot() {
  const response = await fetch('./snapshot.json');
  if (!response.ok) throw new Error('Could not load the published farm');
  return response.json();
}

async function showFarm(value) {
  if (generate.disabled) return;
  generate.disabled = true;
  example.disabled = true;
  input.readOnly = true;
  try {
    const name = value == null ? null : repositoryName(value);
    setStatus(name ? `Loading ${name}…` : 'Loading the farm…');
    const [snapshot, art] = await Promise.all([name ? fetchRepositoryStars(name) : scheduledSnapshot(), loadArtwork()]);
    const scene = createStarterScene(snapshot);
    const frame = prepareStarCard(scene, art, createCanvas);
    frame.paint();
    const png = await pngBlob(frame.canvas);
    const updatedCard = URL.createObjectURL(png);
    download.href = updatedCard;
    download.download = `${snapshot.fullName.replace('/', '-')}-farm.png`;
    if (currentCard) URL.revokeObjectURL(currentCard);
    currentCard = updatedCard;
    input.value = snapshot.fullName;
    if (name) {
      const link = new URL(location.href);
      link.searchParams.set('repo', snapshot.fullName);
      history.replaceState(null, '', link);
    }
    cancelAnimationFrame(viewRequest);
    focusedPlace = undefined;
    farm = {snapshot, art, stages: [...new Set([...farmMilestones, snapshot.stars])].sort((a, b) => a - b)};
    growth.max = farm.stages.length - 1;
    showGrowth(snapshot.stars, scene, frame);
    for (const element of [controls, places, details, canvas]) element.hidden = false;
    image.hidden = true;
    document.querySelector('#static-download').hidden = true;
    setStatus(`${snapshot.fullName} · ${format.format(snapshot.stars)} ${snapshot.stars === 1 ? 'star' : 'stars'}`);
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

growth.addEventListener('input', () => {
  cancelAnimationFrame(viewRequest);
  viewRequest = requestAnimationFrame(() => showGrowth(farm.stages[Number(growth.value)]));
});
for (const button of shortcuts) {
  button.addEventListener('click', () => showGrowth(Number(button.dataset.stars)));
}
currentStage.addEventListener('click', () => showGrowth(farm.snapshot.stars));
motion.addEventListener('click', () => setMotion(!playing));
reducedMotion.addEventListener('change', event => setMotion(!event.matches));

const requested = new URLSearchParams(location.search).get('repo');
if (requested) input.value = requested;
showFarm(requested || null);
