import {randomFor,seedOf} from '../../src/farm/seed.js';
import { contains } from '../../src/farm/geometry.js';
export const LAYOUT_VERSION='spring-seeded-1';
export function overlaps(a,b,gap=0){return a.x<b.x+b.w+gap&&a.x+a.w+gap>b.x&&a.y<b.y+b.h+gap&&a.y+a.h+gap>b.y;}
const box=(x,y,w,h)=>({x,y,w,h});
const aligned=n=>Math.round(n/2)*2;

function routesFor(targets,reserved,gate){
 const step=8,cols=80,rows=45,node=([x,y])=>[Math.max(1,Math.min(cols-2,Math.round(x/step))),Math.max(1,Math.min(rows-2,Math.round(y/step)))];
 const blocked=(x,y)=>reserved.some(r=>contains(r,x*step,y*step,3));
 const [gx,gy]=node(gate),end=gy*cols+gx,routes=[],backbone=new Set([end]);
 for(const target of targets){
  const previous=new Int32Array(cols*rows).fill(-1),queue=[];
  for(const [x,y] of (target.choices??[target.point]).map(node)){
   const start=y*cols+x;
   if(blocked(x,y)||previous[start]>=0)continue;
   previous[start]=start;queue.push(start);
  }
  if(!queue.length)throw Error('Blocked entrance for '+target.id);
  let reached=-1;
  for(let q=0;q<queue.length;q++){
   const n=queue[q],x=n%cols,y=Math.floor(n/cols);
   if(backbone.has(n)){reached=n;break;}
   for(const [nx,ny]of[[x,y+1],[x+1,y],[x-1,y],[x,y-1]]){
    if(nx<1||nx>=cols-1||ny<1||ny>=rows)continue;
    const next=ny*cols+nx;if(previous[next]>=0||(next!==end&&blocked(nx,ny)))continue;
    previous[next]=n;queue.push(next);
   }
  }
  if(reached<0)throw Error('No route for '+target.id);
  const points=[];for(let n=reached;;n=previous[n]){points.push([n%cols*step,Math.floor(n/cols)*step]);if(n===previous[n])break;}
  // Every optional route joins the always-visible home path, never a locked building's road.
  if(target.id==='home')for(const [x,y]of points)backbone.add(y/step*cols+x/step);
  routes.push({id:target.id,points:points.reverse()});
 }
 return routes;
}
function candidate(repositoryId,config,attempt){
 const seed=seedOf(repositoryId+':'+LAYOUT_VERSION),r=randomFor(seed,'template'),t=config.templates[Math.floor(r()*config.templates.length)];
 const jitter=(point,key)=>{if(attempt===4)return point.slice();const a=randomFor(seed,key+':'+attempt);return point.map((n,i)=>i<2?aligned(n+(a()-.5)*8):n);};
 const home=jitter(t.home,'home'),livestock=jitter(t.livestock,'livestock'),windmill=jitter(t.windmill,'windmill'),pond=jitter(t.pond,'pond');
 const well=t.well.slice();
 const beds=t.beds.map((p,i)=>{const[x,y]=jitter(p,'bed-'+i);return{id:'bed-'+i,x,y,w:98,h:46,crop:['tomato','carrot','wheat','pumpkin'][Math.floor(randomFor(seed,'crop-'+i)()*4)]};});
 const orchard=t.orchard.map((p,i)=>{const[x,y]=jitter(p,'fruit-'+i);return{id:'fruit-'+i,x,y,type:randomFor(seed,'fruit-type-'+i)()<.5?'apple':'orange'};});
 const reserved=[
 box(home[0]-96,home[1]-116,136,116),box(livestock[0]-55,livestock[1]-112,110,112),
 box(windmill[0]-41,windmill[1]-116,82,116),
 box(pond[0]-pond[2]-8,pond[1]-pond[3]-8,pond[2]*2+16,pond[3]*2+16),
 ...beds.map(b=>box(b.x-b.w/2-2,b.y-b.h/2-8,b.w+4,b.h+12)),
 ...orchard.map(o=>box(o.x-32,o.y-72,64,72)),
 box(well[0]-16,well[1]-40,32,40)
 ];
 for(let i=0;i<reserved.length;i++){
  const a=reserved[i];if(a.x<1||a.y<1||a.x+a.w>639||a.y+a.h>344)throw Error('outside bounds');
  for(let j=i+1;j<reserved.length;j++)if(overlaps(a,reserved[j],2))throw Error('reserved overlap '+i+':'+j);
 }
 const entrance=choices=>{
  const point=choices.find(([x,y])=>!reserved.some(r=>contains(r,Math.round(x/8)*8,Math.round(y/8)*8,4)));
  if(!point)throw Error('No accessible plot entrance');return point;
 };
 const targets=[
 {id:'home',point:[home[0],home[1]+16]},
 {id:'livestock',point:[livestock[0],livestock[1]+16]},
 {id:'windmill',point:[windmill[0],windmill[1]+16]},
 {id:'well',choices:[[well[0],well[1]+15],[well[0]+28,well[1]-4],[well[0]-28,well[1]-4]]},
 ...beds.map(b=>({id:b.id,point:entrance([[b.x,b.y+40],[b.x+b.w/2+20,b.y],[b.x,b.y-b.h/2-20],[b.x-b.w/2-20,b.y]])})),
 {id:'pond',choices:[
  [pond[0]-pond[2]-18,pond[1]],[pond[0],pond[1]+pond[3]+17],
  [pond[0]+pond[2]+18,pond[1]],[pond[0],pond[1]-pond[3]-18]
 ]}
 ];
 const routes=routesFor(targets,reserved,t.gate);
 const safe=(x,y,w,h)=>{const a=box(x-w/2,y-h,w,h);return a.x>=12&&a.y>=84&&a.x+w<628&&a.y+h<338&&!reserved.some(b=>overlaps(a,b,5))&&!routes.some(route=>route.points.some(([px,py])=>contains(a,px,py,10)));};
 const decoration=[],occupied=[];
 for(let i=0;i<90;i++){
  const a=randomFor(seed,'decor-'+i),x=aligned(24+a()*592),y=aligned(110+a()*218);
  const plants=['berry','sunflower','hydrangea','daisy','rock','fern'];
  const type=plants[Math.floor(a()*plants.length)];
  const dims={berry:[30,26],sunflower:[24,32],hydrangea:[28,24],daisy:[22,20],rock:[32,24],fern:[24,22]}[type];
  const rect=box(x-dims[0]/2,y-dims[1],...dims);
  if(safe(x,y,...dims)&&!occupied.some(b=>overlaps(rect,b,6))){decoration.push({id:'decor-'+i,type,x,y,unlock:i%5===0?1:0});occupied.push(rect);}
  if(decoration.length>=15)break;
 }
 return{repositoryId,seed,layoutVersion:LAYOUT_VERSION,template:t.id,home,livestock,windmill,well,pond,beds,orchard,reserved,routes,decoration,gate:t.gate,attempt};
}
export function createBlueprint(repositoryId,config){
 if(!repositoryId)throw Error('repositoryId is required');
 for(let attempt=0;attempt<5;attempt++){try{return candidate(repositoryId,config,attempt);}catch{}}
 // Guaranteed reference-template path: avoid exposing placement failure to image callers.
 const errors=[];
 for(const template of config.templates){try{return{...candidate(repositoryId,{...config,templates:[template]},4),fallback:true};}catch(error){errors.push(template.id+': '+error.message);}}
 throw Error('No valid reference template: '+errors.join('; '));
}
export function stageFor(stars, growth) {
  if (!Number.isSafeInteger(stars) || stars < 0) throw Error('stars must be a non-negative integer');
  const threshold = Math.min(Math.floor(stars / growth.step) * growth.step, growth.windmillAt);
  return {
    threshold,
    number: threshold / growth.step + 1,
    total: growth.windmillAt / growth.step + 1,
    next: threshold < growth.windmillAt ? threshold + growth.step : null,
  };
}

function plantField(bed, schedule, threshold, step, add) {
  for (const [row, [sowAt, harvestAt]] of schedule.rows.entries()) {
    if (threshold < sowAt) continue;
    const type = threshold < harvestAt ? 'sprout' : bed.crop;
    for (let column = 0; column < 4; column++) {
      add(`${bed.id}-crop-${row}-${column}`, type, bed.x - 32 + column * 21, bed.y - 4 + row * 21);
    }
  }
  // Tuck a low companion crop into the space between the established rows.
  for (let column = 0; column < schedule.intercropCount; column++) {
    const sowAt = schedule.intercropAt + column * step;
    if (threshold < sowAt) continue;
    const mature = threshold >= sowAt + schedule.intercropCount * step;
    add(`${bed.id}-companion-${column}`, mature ? 'carrot' : 'sprout', bed.x - 24 + column * 17, bed.y + 7, {scale: mature ? .58 : .76});
  }
}

export function createScene(snapshot, blueprint, growth) {
  if (snapshot.repositoryId !== blueprint.repositoryId) throw Error('Snapshot/blueprint identity mismatch');
  const stage = stageFor(snapshot.stars, growth);
  const stars = stage.threshold;
  const objects = [];
  const add = (id, type, x, y, extra = {}) => objects.push({id, type, x, y, ...extra});
  const cottageLevel = 1 + growth.cottageUpgrades.filter(threshold => stars >= threshold).length;
  const livestock = stars >= growth.barnAt ? 'barn' : stars >= growth.coopAt ? 'coop' : null;
  const millYard = stars >= growth.millYardAt;
  add('home', `cottage-${cottageLevel}`, ...blueprint.home);
  add('farmer', 'farmer', blueprint.home[0] + 9, blueprint.home[1] + 38);
  add('home-cat', 'cat', blueprint.home[0] - 30, blueprint.home[1] + 14);
  if (stars >= growth.wellAt) add('well', 'well', ...blueprint.well);
  if (livestock) add('livestock', livestock, ...blueprint.livestock);
  if (millYard) {
    const [x, y] = blueprint.windmill;
    const side = x > 570 ? -1 : 1;
    add('mill-supplies', 'barrel', x + side * 35, y + 4, {scale: .85});
  }
  if (stars >= growth.windmillAt) add('windmill', 'windmill', ...blueprint.windmill);
  if (stars >= growth.storeAt) {
    add('feed-barrel', 'barrel', blueprint.livestock[0] - 42, blueprint.livestock[1] + 12);
    add('harvest-crate', 'crate', blueprint.livestock[0] - 28, blueprint.livestock[1] + 19);
  }
  growth.chickensAt.forEach((threshold, index) => {
    if (stars >= threshold) add(`chicken-${index}`, 'chicken', blueprint.livestock[0] + (index ? 24 : -16), blueprint.livestock[1] + 25 + index * 9);
  });

  const beds = blueprint.beds.filter((bed, index) => stars >= growth.fields[index].openAt);
  for (const [index, bed] of beds.entries()) plantField(bed, growth.fields[index], stars, growth.step, add);
  for (const [index, tree] of blueprint.orchard.entries()) {
    const {plantAt, fruitAt} = growth.fruitTrees[index];
    if (stars < plantAt) continue;
    const ripe = stars >= fruitAt;
    const scale = ripe ? 1 : .42 + .34 * (stars - plantAt) / (fruitAt - plantAt);
    add(tree.id, ripe ? tree.type : 'oak', tree.x, tree.y, {scale});
  }
  for (const d of blueprint.decoration) {
    if (!d.unlock || livestock) add(d.id, d.type, d.x, d.y);
  }
  const [px, py, rx, ry] = blueprint.pond;
  for (let i = 0; i < 3; i++) add(`reed-${i}`, 'reeds', px - rx + 18 + i * (rx - 15), py + ry - 2 + (i % 2) * 8);
  add('waterlily', 'waterlily', px + rx * .25, py + 8);
  if (stars >= growth.duckAt) add('pond-duck', 'duck', px - 15, py - 8, {ground: false});
  return {snapshot, blueprint, stage, objects, beds, livestock, millYard, pen: stars >= growth.penAt};
}
