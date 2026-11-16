import { starterThemes, starterViewport } from './layouts.js';
import { farmExpansions } from './expansions.js';
import { randomFor, seedOf } from './seed.js';
import { describeYard } from './yard.js';
import { contains } from './geometry.js';
import { occupiedGround, pondDistance, routeDistance } from './terrain.js';

export const starterMilestones = [0, 1, 5, 10, 25, 50, 100, 200, 300];
export const farmMilestones = [...starterMilestones, ...Array.from({length: 47}, (_, index) => 400 + index * 100)];

// Each event occupies a spot already accessible from the starter yard. Coordinates
// stay in world space when the view widens to reveal the new work area at 200.
const additions = {
  'cottage-garden': [
    [['sprout', 197, 234, .82]],
    [['daisy', 204, 280, .85], ['sunflower', 96, 245, .8]],
    [['crate', 166, 196, .72]],
    [['harvest-table', 219, 216], ['basket', 208, 224]],
    [['barrel', 305, 195, .73]],
    [['drying-rack', 178, 204], ['scarecrow', 211, 267, .82]],
    [['barrel', 502, 252, .83], ['crate', 502, 267, .83]],
    [['carrot', 488, 292, .88], ['tomato', 508, 291, .88], ['pumpkin', 528, 292, .84]],
  ],
  'creek-orchard': [
    [['crate', 236, 218, .67]],
    [['daisy', 169, 240, .8], ['hydrangea', 201, 260, .72]],
    [['barrel', 178, 217, .7]],
    [['harvest-table', 253, 216], ['basket', 268, 223]],
    [['crate', 268, 244, .72]],
    [['coop', 290, 171, .63, 'jam-shed'], ['jam-sign', 309, 178]],
    [['bench', 537, 249, .86], ['crate', 559, 253, .83]],
    [['apple', 515, 197, .87], ['orange', 545, 172, .84], ['dock-post', 135, 218], ['dock-post', 136, 229]],
  ],
  'barnyard-pasture': [
    [['chicken', 378, 248, .74]],
    [['daisy', 301, 271, .78], ['sunflower', 364, 279, .77]],
    [['crate', 350, 244, .7]],
    [['harvest-table', 266, 209], ['basket', 273, 208]],
    [['chicken', 394, 194, .84]],
    [['feed-bin', 284, 193], ['crate', 304, 193, .68]],
    [['coop', 529, 180, .87], ['barrel', 549, 194, .74]],
    [['chicken', 527, 224, .86], ['verge', 503, 252]],
  ],
};

const yardPaths = {
  'cottage-garden': [
    {at: 100, route: {id: 'drying-yard', points: [[180, 212], [196, 210], [232, 204]]}},
  ],
  'creek-orchard': [
    {at: 0, route: {id: 'picking-path', points: [[156, 174], [157, 202], [156, 223]]}},
    {at: 25, route: {id: 'harvest-path', points: [[253, 226], [232, 238]]}},
    {at: 100, route: {id: 'jam-yard', points: [[290, 178], [292, 200], [284, 226]]}, surface: {x: 273, y: 173, width: 36, height: 16, material: 'stone'}},
    {at: 300, surface: {x: 130, y: 216, width: 37, height: 14, material: 'dock'}},
    {at: 300, route: {id: 'new-orchard', points: [[531, 184], [537, 207], [528, 229]]}},
  ],
  'barnyard-pasture': [
    {at: 100, route: {id: 'feed-yard', points: [[284, 205], [287, 215], [292, 223]]}, surface: {x: 273, y: 191, width: 41, height: 15, material: 'wood'}},
  ],
};

const expansion = {
  'cottage-garden': {
    points: [[480, 291], [468, 264], [409, 242], [362, 212]],
    bed: {id: 'bed-2', x: 511, y: 291, w: 67, h: 26},
    surface: {x: 455, y: 253, width: 39, height: 19, material: 'stone'},
  },
  'creek-orchard': {
    points: [[528, 229], [484, 232], [451, 224], [418, 208], [372, 198]],
    surface: {x: 491, y: 219, width: 64, height: 23, material: 'wood'},
  },
  'barnyard-pasture': {
    points: [[527, 196], [498, 206], [470, 215], [447, 214], [392, 211], [337, 205]],
    surface: {x: 493, y: 184, width: 61, height: 39, material: 'stone'},
  },
};

function propsAt(entries, prefix) {
  return entries.map(([type, x, y, scale = 1, id], index) => ({
    id: id ?? (prefix === 'starter' && type === 'coop' ? 'livestock' : type === 'well' ? 'well' : `${prefix}-${index}`),
    type, x, y, scale, ground: type !== 'waterlily' && type !== 'duck',
  }));
}

function growStarterPlants(objects, theme, stars, seed) {
  const random = randomFor(seed, 'garden-variety');
  const fruit = random() < .5 ? 'apple' : 'orange';
  const crops = theme.slug === 'barnyard-pasture' ? ['wheat', 'carrot'] : ['tomato', 'carrot', 'pumpkin'];
  const primary = crops[Math.floor(random() * crops.length)];
  const reserved = occupiedGround(objects, theme.beds, theme.fences);
  for (const object of objects) {
    if (object.id === 'young-fruit') {
      object.type = stars >= 5 ? fruit : 'oak';
      object.scale = stars >= 5 ? .91 : .52;
    } else if (object.id === 'bed-0-crop-0-0') {
      object.type = stars >= 5 ? primary : 'sprout';
    } else if (object.id.startsWith('bed-') && random() < .22 && object.type !== 'daisy') {
      object.type = primary;
    } else if (['daisy', 'fern', 'berry'].includes(object.type) && !object.id.startsWith('bed-')) {
      const x = object.x + Math.floor(random() * 5) - 2;
      const y = object.y + Math.floor(random() * 5) - 2;
      if (pondDistance(theme.pond, seed, x, y) >= 2 && routeDistance(theme.routes, x, y) >= 7
        && !reserved.some(rect => contains(rect, x, y, 2))) Object.assign(object, {x, y});
    }
  }
}

function placeShoreDetails(theme, objects, seed) {
  const random = randomFor(seed, 'shore-details');
  const [cx, cy, rx, ry] = theme.pond;
  for (const [i, direction] of [-.9, -.5, -.25, .5, .8, 1.25, 1.8, 2.3, 4.6].entries()) {
    const angle = direction + (random() - .5) * .16;
    const x = Math.round(cx + Math.cos(angle) * (rx + 7));
    const y = Math.round(cy + Math.sin(angle) * (ry + 7));
    if (pondDistance(theme.pond, seed, x, y) < 2 || routeDistance(theme.routes, x, y) < 10) continue;
    if (theme.slug === 'creek-orchard' && x >= 124 && x <= 172 && y >= 204 && y <= 237) continue;
    if (objects.some(object => Math.hypot(object.x - x, object.y - y) < 11)) continue;
    objects.push({id: `shore-${i}`, type: i % 3 ? 'verge' : 'pebbles', x, y, scale: .85, ground: false});
  }
}

function extendFarm(layout, theme, stars, objects, beds, routes, surfaces) {
  const add = (id, type, x, y, scale = 1) => objects.push({id, type, x, y, scale, ground: true});
  const [fieldX, fieldY, width, height] = layout.field;
  const [workX, workY] = layout.workshop;
  const [millX, millY] = layout.mill;
  const [treeX, treeY, fruit] = layout.orchard;
  beds.push({id: 'bed-terrace', x: fieldX, y: fieldY, w: width, h: height});
  routes.push({id: 'bed-terrace', points: layout.fieldRoad});
  add('field-tools', 'crate', fieldX - width / 2 - 10, fieldY + 6, .74);
  for (const [index, crop] of layout.crops.entries()) {
    const sowAt = 400 + index * 100;
    const harvestAt = sowAt + 400;
    if (stars < sowAt) continue;
    add(`terrace-crop-${index}`, stars >= harvestAt ? crop : 'sprout', fieldX - 30 + 20 * index, fieldY + 7, .82);
  }
  if (stars >= 1200) add('field-scarecrow', 'scarecrow', fieldX + width / 2 - 7, fieldY - 2, .75);
  if (stars >= 1300) add('field-harvest', 'crate', fieldX + width / 2 - 8, fieldY + 20, .72);
  if (stars >= 1400) {
    const mature = stars >= 1900;
    add('orchard-extension', mature ? fruit : 'oak', treeX, treeY, mature ? .86 : .42 + .08 * ((stars - 1400) / 100));
  }
  if (stars >= 2000) {
    if (theme === 'barnyard-pasture') {
      const coop = objects.find(object => object.type === 'coop' && object.x === workX);
      coop.type = 'barn';
      coop.scale = layout.workshopScale;
    } else {
      add('produce-workshop', 'barn', workX, workY, layout.workshopScale);
      routes.push({id: 'workshop', points: layout.workshopRoad});
    }
  }
  for (let index = 0; index < 4; index++) {
    const sowAt = 2100 + index * 100;
    const harvestAt = sowAt + 400;
    if (stars < sowAt) continue;
    add(`terrace-companion-${index}`, stars >= harvestAt ? 'carrot' : 'sprout', fieldX - 30 + 20 * index, fieldY + Math.min(17, height / 2 - 3), .68);
  }
  if (stars >= 2900) add('produce-supplies', 'barrel', workX - 25, workY + 32, .72);
  for (const [index, [x, y]] of layout.perennial.entries()) {
    const plantAt = 3000 + index * 300;
    if (stars >= plantAt) add(`perennial-${index}`, index % 2 ? 'hydrangea' : 'berry', x, y, Math.min(.94, .51 + .2 * ((stars - plantAt) / 100)));
  }
  for (const [index, [x, y]] of layout.flowers.entries()) {
    const plantAt = 3900 + index * 100;
    if (stars >= plantAt) add(`flower-${index}`, stars >= plantAt + 500 ? 'daisy' : 'sprout', x, y, .73);
  }
  if (stars >= 4900) {
    routes.push({id: 'mill-workyard', points: layout.millRoad});
    surfaces.push({x: millX - 22, y: millY + 4, width: 44, height: 15, material: 'stone'});
    add('mill-supplies', 'barrel', millX + 28, millY + 6, .73);
  }
  if (stars >= 5000) add('windmill', 'windmill', millX, millY, .86);
}

export function createStarterScene(snapshot) {
  const {repositoryId, fullName, stars} = snapshot;
  if (typeof repositoryId !== 'string' || !repositoryId.trim()) throw Error('A stable repository ID is required');
  if (typeof fullName !== 'string' || !fullName.trim()) throw Error('A repository name is required');
  if (!Number.isSafeInteger(stars) || stars < 0) throw Error('Stars must be a non-negative integer');

  const seed = seedOf(`starter-1:${repositoryId}`);
  const theme = starterThemes[seed % starterThemes.length];
  const phase = farmMilestones.filter(star => stars >= star).length - 1;
  const stageStars = farmMilestones[phase];
  const opened = stars >= 200;
  const yard = expansion[theme.slug];
  const objects = propsAt(theme.props, 'starter');
  const beds = [...theme.beds];
  const yardSurfaces = [...(theme.yardSurfaces ?? [])];
  const routes = [...theme.routes];
  growStarterPlants(objects, theme, stageStars, seed);
  placeShoreDetails(theme, objects, seed);
  for (let index = 0; index < Math.min(phase, starterMilestones.length - 1); index++) {
    objects.push(...propsAt(additions[theme.slug][index], `growth-${starterMilestones[index + 1]}`));
  }
  if (opened) {
    routes.push({id: 'expansion', points: yard.points});
    yardSurfaces.push(yard.surface);
    if (yard.bed) beds.push(yard.bed);
  }
  for (const {at, route, surface} of yardPaths[theme.slug]) {
    if (stageStars < at) continue;
    if (route) routes.push(route);
    if (surface) yardSurfaces.push(surface);
  }
  const extended = stageStars >= 400;
  if (extended) extendFarm(farmExpansions[theme.slug], theme.slug, stageStars, objects, beds, routes, yardSurfaces);
  const fences = theme.slug === 'barnyard-pasture' && stageStars >= 300
    ? [...theme.fences, [[488, 232], [488, 249], [552, 249], [552, 207]]]
    : theme.fences;
  const blueprint = {
    seed, home: theme.home, well: theme.well, pond: theme.pond, gate: theme.gate,
    livestock: theme.livestock, reserved: occupiedGround(objects, beds, fences), routes,
  };
  return {
    theme: theme.slug,
    snapshot,
    viewport: extended ? {x: 0, y: 0, width: 640, height: 360} : opened ? {x: 41, y: 39, width: 544, height: 306} : starterViewport,
    blueprint,
    ...describeYard(theme.slug, objects, beds, blueprint),
    objects, beds, fences, yardSurfaces, livestock: Boolean(theme.livestock),
    stage: {
      number: phase + 1, total: farmMilestones.length,
      next: farmMilestones[phase + 1],
    },
  };
}
