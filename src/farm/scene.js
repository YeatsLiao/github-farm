import { starterThemes, starterViewport } from './layouts.js';
import { farmExpansions } from './expansions.js';
import { randomFor, seedOf } from './seed.js';
import { describeYard } from './yard.js';

export const starterMilestones = [0, 1, 5, 10, 25, 50, 100, 200, 300];
export const farmMilestones = [...starterMilestones, ...Array.from({length: 47}, (_, index) => 400 + index * 100)];

// Each event occupies a spot already accessible from the starter yard. Coordinates
// stay in world space when the view widens to reveal the new work area at 200.
const additions = {
  'cottage-garden': [
    [['sprout', 197, 234, .82]],
    [['daisy', 204, 280, .85], ['sunflower', 96, 245, .8]],
    [['crate', 191, 207, .72]],
    [['harvest-table', 219, 216], ['basket', 208, 224]],
    [['barrel', 305, 195, .73]],
    [['drying-rack', 178, 204], ['scarecrow', 211, 267, .82]],
    [['barrel', 480, 259, .83], ['crate', 502, 267, .83]],
    [['carrot', 488, 292, .88], ['tomato', 508, 291, .88], ['pumpkin', 528, 292, .84]],
  ],
  'creek-orchard': [
    [['crate', 236, 218, .67]],
    [['daisy', 164, 232, .8], ['hydrangea', 201, 260, .72]],
    [['barrel', 178, 217, .7]],
    [['harvest-table', 253, 216], ['basket', 268, 223]],
    [['crate', 268, 244, .72]],
    [['coop', 290, 171, .63, 'jam-shed'], ['jam-sign', 309, 178]],
    [['bench', 529, 227, .86], ['crate', 551, 233, .83]],
    [['apple', 515, 197, .87], ['orange', 545, 172, .84], ['dock-post', 135, 218], ['dock-post', 136, 229]],
  ],
  'barnyard-pasture': [
    [['chicken', 395, 239, .74]],
    [['daisy', 301, 271, .78], ['sunflower', 364, 279, .77]],
    [['crate', 350, 244, .7]],
    [['harvest-table', 280, 226], ['basket', 278, 232]],
    [['chicken', 394, 194, .84]],
    [['feed-bin', 289, 209], ['crate', 304, 207, .68]],
    [['coop', 529, 180, .87], ['barrel', 549, 194, .74]],
    [['fence', 491, 248, .87], ['fence', 516, 248, .87], ['fence', 541, 248, .87], ['chicken', 527, 224, .86]],
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
    {at: 300, surface: {x: 134, y: 216, width: 28, height: 14, material: 'wood'}},
    {at: 300, route: {id: 'new-orchard', points: [[531, 184], [537, 207], [528, 229]]}},
  ],
  'barnyard-pasture': [
    {at: 100, route: {id: 'feed-yard', points: [[288, 216], [278, 225], [278, 241]]}, surface: {x: 278, y: 207, width: 28, height: 15, material: 'wood'}},
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
    points: [[527, 196], [505, 218], [467, 222], [440, 227], [388, 223], [318, 226]],
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
  const crops = theme === 'barnyard-pasture' ? ['wheat', 'carrot'] : ['tomato', 'carrot', 'pumpkin'];
  const primary = crops[Math.floor(random() * crops.length)];
  for (const object of objects) {
    if (object.id === 'young-fruit') {
      object.type = stars >= 5 ? fruit : 'oak';
      object.scale = stars >= 5 ? .91 : .52;
    } else if (object.id === 'bed-0-crop-0-0') {
      object.type = stars >= 5 ? primary : 'sprout';
    } else if (object.id.startsWith('bed-') && random() < .22 && object.type !== 'daisy') {
      object.type = primary;
    } else if (['daisy', 'fern', 'berry'].includes(object.type) && !object.id.startsWith('bed-')) {
      object.x += Math.floor(random() * 5) - 2;
      object.y += Math.floor(random() * 5) - 2;
    }
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
    add(`terrace-companion-${index}`, stars >= harvestAt ? 'carrot' : 'sprout', fieldX - 30 + 20 * index, fieldY + 17, .68);
  }
  if (stars >= 2900) add('produce-supplies', 'barrel', workX - 29, workY + 14, .72);
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
  growStarterPlants(objects, theme.slug, stageStars, seed);
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
  const blueprint = {
    seed, home: theme.home, well: theme.well, pond: theme.pond, gate: theme.gate,
    livestock: theme.livestock, reserved: [], routes,
  };
  return {
    theme: theme.slug,
    snapshot,
    viewport: extended ? {x: 0, y: 0, width: 640, height: 360} : opened ? {x: 41, y: 39, width: 544, height: 306} : starterViewport,
    blueprint,
    ...describeYard(theme.slug, stageStars, objects, beds, blueprint),
    objects, beds, yardSurfaces, livestock: Boolean(theme.livestock),
    stage: {
      number: phase + 1, total: farmMilestones.length,
      next: farmMilestones[phase + 1],
    },
  };
}
