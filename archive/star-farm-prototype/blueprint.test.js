import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createBlueprint,createScene} from './blueprint.js';
import {contains} from '../../src/farm/geometry.js';
import {renderStarCard} from '../../src/render/star-card.js';
const config=JSON.parse(await readFile(new URL('./templates.json',import.meta.url),'utf8'));
const growth=JSON.parse(await readFile(new URL('./growth.json',import.meta.url),'utf8'));
const manifest=JSON.parse(await readFile(new URL('../../assets/runtime/spring/manifest.json',import.meta.url),'utf8'));
const snapshot=(id,stars)=>({repositoryId:id,fullName:'sample/repository',stars,newStars7d:12,fetchedAt:'2026-11-06 08:00 UTC'});

test('many repository seeds produce bounded blueprints with connected paths and varied topology',()=>{
 const used=new Set();
 for(let i=0;i<50;i++){
  const id='repository-'+i,b=createBlueprint(id,config);used.add(b.template);
  assert.deepEqual(b,createBlueprint(id,config));
  const backbone=new Set(b.routes[0].points.map(p=>p.join(',')));
  for(const r of b.reserved){assert.ok(r.x>=0&&r.y>=0&&r.x+r.w<=640&&r.y+r.h<=360);}
  for(const route of b.routes){
   assert.ok(backbone.has(route.points.at(-1).join(',')),'routes meet permanent home/gate route');
   for(const [x,y]of route.points)assert.ok(!b.reserved.some(r=>contains(r,x,y)),'road avoids final occupied plots');
  }
 }
 assert.equal(used.size,3);
});

test('growth and repository rename preserve all existing anchors; dropping stars is reversible',()=>{
 const id='R_kgDOFarm02',b=createBlueprint(id,config);
 const low=createScene(snapshot(id,32),b,growth),mid=createScene(snapshot(id,320),b,growth),high=createScene(snapshot(id,1280),b,growth);
 for(const o of low.objects){
  for(const s of[mid,high]){
   const later=s.objects.find(n=>n.id===o.id);assert.ok(later);
   assert.deepEqual([later.x,later.y],[o.x,o.y]);
  }
 }
 const renamed=createScene({...snapshot(id,32),fullName:'other/renamed'},createBlueprint(id,config),growth);
 assert.deepEqual(renamed.objects,low.objects);
 assert.deepEqual(createScene(snapshot(id,32),high.blueprint,growth).objects,low.objects);
 assert.equal(low.beds.length,1);assert.equal(mid.beds.length,1);assert.equal(high.beds.length,2);
});

test('locked windmill is absent and exact milestone adds it without moving other objects',()=>{
 const id='R_kgDOFarm06',b=createBlueprint(id,config);
 const before=createScene(snapshot(id,4999),b,growth),after=createScene(snapshot(id,5000),b,growth);
 assert.ok(!before.objects.some(o=>o.id==='windmill'));
 assert.ok(after.objects.some(o=>o.id==='windmill'));
 assert.equal(after.stage.next,null);
 assert.deepEqual(before.objects,after.objects.filter(o=>o.id!=='windmill'));
 assert.throws(()=>createScene(snapshot('wrong-id',32),b,growth),/identity mismatch/);
});

test('each 100-star boundary changes the farm while earlier objects keep their anchors',()=>{
 const id='R_kgDOFarm02',b=createBlueprint(id,config);
 let previous=createScene(snapshot(id,0),b,growth);
 const view=({objects,beds,pen,millYard})=>({objects,beds,pen,millYard});
 for(let stars=100;stars<=5000;stars+=100){
  const current=createScene(snapshot(id,stars),b,growth);
  assert.deepEqual(view(createScene(snapshot(id,stars-1),b,growth)),view(previous));
  assert.equal(current.stage.number,stars/100+1);
  assert.notDeepEqual(view(current),view(previous),`visible progression at ${stars} stars`);
  for(const object of previous.objects){
   const next=current.objects.find(item=>item.id===object.id);
   assert.deepEqual([next?.x,next?.y],[object.x,object.y]);
  }
  previous=current;
 }
 assert.deepEqual(view(createScene(snapshot(id,100000),b,growth)),view(previous));
});

test('all growth sprites exist and renderer produces reproducible 1280 by 960 PNGs',async()=>{
 const id='R_kgDOFarm01',b=createBlueprint(id,config);
 for(const stars of[0,99,100,999,1000,5000]){
  const scene=createScene(snapshot(id,stars),b,growth);
  for(const o of scene.objects)assert.ok(manifest.sprites[o.type],o.type);
 }
 const scene=createScene(snapshot(id,1280),b,growth),a=await renderStarCard(scene),other=await renderStarCard(scene);
 assert.deepEqual(a,other);assert.equal(a.readUInt32BE(16),1280);assert.equal(a.readUInt32BE(20),960);
 assert.ok(a.length<1500000);
});
