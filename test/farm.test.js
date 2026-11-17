import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {renderStarCard} from '../src/render/card.js';
import {createStarterScene, farmMilestones, starterMilestones} from '../src/farm/scene.js';
import {pondDistance, routeDistance} from '../src/farm/terrain.js';
import {yardProps} from '../src/render/props.js';
const manifest=JSON.parse(await readFile(new URL('../assets/runtime/spring-manifest.json',import.meta.url),'utf8'));
const snapshot=(id,stars)=>({repositoryId:id,fullName:'sample/repository',stars,newStars7d:12,fetchedAt:'2026-11-06 08:00 UTC'});

test('approved starter layouts keep their theme and existing anchors through early growth', () => {
 const seen = new Set();
 for (let n = 0; n < 12; n++) {
  const id = `demo-${n}`;
  let previous = createStarterScene(snapshot(id, 0));
  seen.add(previous.theme);
  for (const stars of starterMilestones.slice(1)) {
   const current = createStarterScene({...snapshot(id, stars), fullName: 'sample/renamed'});
   assert.equal(current.theme, previous.theme);
   assert.ok(current.objects.length > previous.objects.length);
   assert.deepEqual(
    current.objects.slice(0, previous.objects.length).map(({id,x,y}) => [id,x,y]),
    previous.objects.map(({id,x,y}) => [id,x,y]),
   );
   assert.equal(createStarterScene(snapshot(id, stars - 1)).stage.number, previous.stage.number);
   previous = current;
  }
 }
 assert.equal(seen.size, 3);
});

test('starter layouts use published sprites and render reproducible 1280 by 960 cards', async () => {
 const rendered = new Set();
 for (let i = 0; i < 24 && rendered.size < 3; i++) {
  const id = `demo-${i}`;
  const scene = createStarterScene(snapshot(id, 0));
  if (rendered.has(scene.theme)) continue;
  rendered.add(scene.theme);
  for (const stars of farmMilestones) {
   for (const object of createStarterScene(snapshot(id, stars)).objects) {
    if (object.type !== 'fence-side') assert.ok(manifest.sprites[object.type] || yardProps[object.type], object.type);
   }
  }
  const png = await renderStarCard(scene);
  assert.deepEqual(png, await renderStarCard(scene));
  assert.equal(png.readUInt32BE(16), 1280);
  assert.equal(png.readUInt32BE(20), 960);
  assert.ok(png.length < 1_500_000);
 }
 assert.equal(rendered.size, 3);
});

test('the orchard connects its fruit trees, table, shed and dock at their milestones', () => {
 const at = stars => createStarterScene(snapshot('18221276', stars));
 const initial = at(0), ripe = at(5), table = at(25), jam = at(100), dock = at(300);
 assert.equal(initial.theme, 'creek-orchard');
 const tree = scene => scene.objects.find(object => object.id === 'young-fruit');
 assert.equal(tree(initial).type, 'oak');
 assert.ok(['apple', 'orange'].includes(tree(ripe).type));
 assert.deepEqual([tree(initial).x,tree(initial).y], [tree(ripe).x,tree(ripe).y]);
 assert.ok(table.objects.some(object => object.type === 'harvest-table'));
 assert.ok(jam.objects.some(object => object.id === 'jam-shed'));
 assert.ok(jam.blueprint.routes.some(route => route.id === 'jam-yard'));
 assert.ok(dock.objects.some(object => object.type === 'dock-post'));
 assert.ok(dock.blueprint.routes.some(route => route.id === 'new-orchard'));
 assert.equal(dock.places.find(place => place.id === 'dock').at, 300);

 const deck = dock.yardSurfaces.find(surface => surface.material === 'dock');
 const {pond, seed, routes} = dock.blueprint;
 assert.ok(pondDistance(pond, seed, deck.x, deck.y + deck.height / 2) < 0);
 assert.ok(pondDistance(pond, seed, deck.x + deck.width, deck.y + deck.height / 2) > 0);
 assert.ok(routeDistance(routes, deck.x + deck.width, deck.y + deck.height / 2) < 8);
});

test('paths stay connected, fences leave access, and yard props respect water and crop beds', () => {
 const waterOnly = new Set(['duck', 'waterlily']);
 const shoreAllowed = new Set(['dock-post', 'mooring-cleat', 'rock', 'reeds']);
 const furniture = new Set([
  'bench', 'crate', 'barrel', 'harvest-table', 'feed-bin', 'drying-rack',
  'nursery-tray', 'water-trough', 'hay-bale', 'fruit-crate-empty', 'fruit-crate-full',
  'shipping-counter', 'produce-handcart', 'packed-produce', 'fruit-handoff', 'basket-sled', 'egg-sorting-stand', 'nest-boxes',
  'wash-bench', 'dispatch-rack', 'fruit-press', 'jam-crate', 'feed-sacks', 'egg-trays',
 ]);
 for (let i = 0; i < 12; i++) {
  for (const stars of [0, 5, 25, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1200, 2000, 2900, 5000]) {
   const scene = createStarterScene(snapshot(`demo-${i}`, stars));
   const {pond, seed, routes, reserved} = scene.blueprint;
   assert.ok(reserved.length > scene.beds.length, 'paths know about occupied ground');
   const reached = [routes[0]];
   let remaining = routes.slice(1);
   while (remaining.length) {
    const next = remaining.filter(route => routeDistance(reached, ...route.points.at(-1)) <= 12);
    assert.ok(next.length, `${scene.theme}/${stars}: disconnected ${remaining.map(route => route.id)}`);
    reached.push(...next);
    remaining = remaining.filter(route => !next.includes(route));
   }
   for (const run of scene.fences) for (const [[ax,ay],[bx,by]] of run.slice(1).map((end,j) => [run[j],end])) {
    const steps = Math.ceil(Math.hypot(bx - ax, by - ay) / 2);
    for (let step = 0; step <= steps; step++) {
     const x = ax + (bx - ax) * step / steps, y = ay + (by - ay) * step / steps;
     assert.ok(routeDistance(routes, x, y) >= 4, `${scene.theme}/${stars}: fence crosses path near ${x},${y}`);
    }
   }
   for (const object of scene.objects) {
    const {id,type,x,y} = object;
    const distance = pondDistance(pond, seed, x, y);
    const label = `${scene.theme}/${stars}: ${type} at ${x},${y}`;
    if (waterOnly.has(type)) assert.ok(distance < 0, label);
    else if (!shoreAllowed.has(type)) assert.ok(distance >= -1, label);
    if (furniture.has(type)) assert.ok(routeDistance(routes, x, y) >= 7, label);
    if (/^bed-\d-crop/.test(id) || /^terrace-(crop|companion)-/.test(id)) {
     assert.ok(scene.beds.some(bed => Math.abs(bed.x - x) <= bed.w / 2 && Math.abs(bed.y - y) <= bed.h / 2), label);
    }
   }
  }
 }
});

test('each expansion opens its work area at 200 and completes the next setup at 300 Stars', () => {
 const expansions = {
  'cottage-garden': ['shipping-counter', 'shipping-yard', 'packed-produce'],
  'creek-orchard': ['fruit-handoff', 'fruit-handoff-yard', 'mooring-cleat'],
  'barnyard-pasture': ['egg-sorting-stand', 'egg-sorting-yard', 'open-yard-gate'],
 };
 const checked = new Set();
 for (let i = 0; i < 24 && checked.size < 3; i++) {
  const sceneAt = stars => createStarterScene(snapshot(`demo-${i}`, stars));
  const before = sceneAt(199);
  if (checked.has(before.theme)) continue;
  checked.add(before.theme);
  const [work, route, last] = expansions[before.theme];
  const opened = sceneAt(200), complete = sceneAt(300);
  assert.ok(!before.objects.some(object => object.type === work));
  assert.ok(opened.objects.some(object => object.type === work));
  assert.ok(opened.blueprint.routes.some(path => path.id === route));
  assert.equal(opened.places.find(place => place.id === 'expansion').at, 200);
  assert.ok(!opened.objects.some(object => object.type === last));
  const piece = complete.objects.find(object => object.type === last);
  assert.ok(piece);
  if (last === 'mooring-cleat') {
   const dock = complete.yardSurfaces.find(surface => surface.material === 'dock');
   assert.ok(piece.x > dock.x && piece.x < dock.x + dock.width);
   assert.ok(piece.y > dock.y && piece.y < dock.y + dock.height);
  }
  if (last === 'open-yard-gate') {
   assert.ok(routeDistance(complete.blueprint.routes, piece.x, piece.y) > 8);
   assert.ok(complete.fences.some(run => run[0][0] === piece.x && Math.abs(run[0][1] - piece.y) < 5));
  }
 }
 assert.equal(checked.size, 3);
});

test('each farm has its own starter props and a workshop unlocked at 100 Stars', () => {
 const packs = {
  'cottage-garden': [['nursery-tray', 'watering-can'], ['trellis-tomato'], 'tool-shed', 'tool-shed-yard'],
  'creek-orchard': [['fruit-ladder', 'fruit-crate-empty'], ['fruit-crate-full'], 'jam-shed', 'jam-yard'],
  'barnyard-pasture': [['water-trough'], ['hay-bale', 'egg-basket'], 'hay-shed', 'hay-shed-yard'],
 };
 const assigned = new Set();
 for (let i = 0; i < 24 && assigned.size < 3; i++) {
  const sceneAt = stars => createStarterScene(snapshot(`demo-${i}`, stars));
  const start = sceneAt(0);
  if (assigned.has(start.theme)) continue;
  assigned.add(start.theme);
  const [starterTypes, sortingTypes, shed, route] = packs[start.theme];
  const has = (scene, type) => scene.objects.some(object => object.type === type);
  for (const type of starterTypes) assert.ok(has(start, type), type);
  const sorted = sceneAt(25);
  for (const type of sortingTypes) assert.ok(has(sorted, type), type);
  assert.ok(!has(sceneAt(99), shed));
  const workshop = sceneAt(100);
  assert.ok(has(workshop, shed));
  assert.ok(workshop.blueprint.routes.some(path => path.id === route));
 }
 assert.equal(assigned.size, 3);
});

test('each approved terrain grows through the full schedule and unlocks a windmill at 5000', () => {
 const seen = new Set();
 for (let i = 0; i < 24 && seen.size < 3; i++) {
  const id = `demo-${i}`;
  const sceneAt = stars => createStarterScene(snapshot(id, stars));
  let previous = sceneAt(0);
  if (seen.has(previous.theme)) continue;
  seen.add(previous.theme);
  for (const stars of farmMilestones.slice(1)) {
   const current = sceneAt(stars);
   assert.notDeepEqual(current.objects, previous.objects, `${current.theme} at ${stars}`);
   const anchors = new Map(current.objects.map(object => [object.id, [object.x, object.y]]));
   for (const object of previous.objects) assert.deepEqual(anchors.get(object.id), [object.x, object.y]);
   if (stars >= 400 && stars <= 1000) {
    assert.ok(anchors.has(`workyard-${stars}`), 'Every workshop stage adds a visible prop');
    const place = current.places.find(({id}) => id === 'workyard');
    assert.equal(current.blueprint.routes.some(route => route.id === 'workyard'), stars >= place.at);
   }
   assert.equal(anchors.has('windmill'), stars === 5000);
   previous = current;
  }
  assert.deepEqual(sceneAt(10_000).objects, previous.objects);
 }
 assert.equal(seen.size, 3);
});
