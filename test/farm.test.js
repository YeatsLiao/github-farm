import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {renderStarCard} from '../src/render/card.js';
import {createStarterScene, farmMilestones, starterMilestones} from '../src/farm/scene.js';
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
   assert.deepEqual(current.objects.slice(0, previous.objects.length), previous.objects);
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
    if (object.type !== 'fence-side') assert.ok(manifest.sprites[object.type], object.type);
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
   assert.equal(anchors.has('windmill'), stars === 5000);
   previous = current;
  }
  assert.deepEqual(sceneAt(10_000).objects, previous.objects);
 }
 assert.equal(seen.size, 3);
});
