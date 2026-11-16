/** Render repository samples and a continuous growth comparison with local fixture data. */
import {createCanvas,loadImage} from 'canvas';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createBlueprint,createScene} from './blueprint.js';
import {renderStarCard} from '../../src/render/star-card.js';
const base=new URL('../../',import.meta.url),out=new URL('dist/star-farm-prototype/',base);
const layouts=JSON.parse(await readFile(new URL('templates.json',import.meta.url),'utf8'));
const growth=JSON.parse(await readFile(new URL('growth.json',import.meta.url),'utf8'));
const repos=[{name:'YeatsLiao/github-farm',id:'R_kgDOFarm01'},{name:'octocat/sunlit-orchard',id:'R_kgDOFarm02'},{name:'mona/garden-notes',id:'R_kgDOFarm06'}];
const levels=[{stars:32,new7:4},{stars:320,new7:24},{stars:1280,new7:86}];
await mkdir(out,{recursive:true});
const board=createCanvas(1920,1440),ctx=board.getContext('2d');ctx.imageSmoothingEnabled=false;
const report=[];
for(const [ri,repo]of repos.entries()){
 const blueprint=createBlueprint(repo.id,layouts);
 for(const [li,level]of levels.entries()){
  const snapshot={repositoryId:repo.id,fullName:repo.name,stars:level.stars,newStars7d:level.new7,fetchedAt:'2026-11-06 08:00 UTC'};
  const scene=createScene(snapshot,blueprint,growth),png=await renderStarCard(scene);
  const filename=`${ri+1}-${repo.name.toLowerCase().replaceAll('/','-')}-${['low','mid','high'][li]}.png`;
  await writeFile(new URL(filename,out),png);
  ctx.drawImage(await loadImage(png),ri*640,li*480,640,480);
  report.push({filename,bytes:png.length,template:blueprint.template,stage:scene.stage.number,objects:scene.objects.length,layoutVersion:blueprint.layoutVersion});
  console.log(filename,png.length,scene.objects.length);
 }
 const scene=createScene({repositoryId:repo.id,fullName:repo.name,stars:5000,newStars7d:100,fetchedAt:'2026-11-06 08:00 UTC'},blueprint,growth);
 await writeFile(new URL(`${ri+1}-windmill.png`,out),await renderStarCard(scene));
}
await writeFile(new URL('nine-farm-comparison.png',out),board.toBuffer('image/png'));
await writeFile(new URL('render-report.json',out),JSON.stringify(report,null,2)+'\n');

const timeline = new URL('dist/star-farm-growth/', base);
await mkdir(timeline, {recursive: true});
const timelineRepo = repos[1];
const blueprint = createBlueprint(timelineRepo.id, layouts);
const pageSpan = growth.step * 10;
const tileWidth = 440, tileHeight = 330, gap = 12, top = 62;
let previous;
for (let start = 0; start < growth.windmillAt; start += pageSpan) {
 const end = Math.min(start + pageSpan, growth.windmillAt);
 const page = createCanvas(tileWidth * 4 + gap * 5, top + (tileHeight + gap) * 3);
 const drawing = page.getContext('2d');
 drawing.fillStyle = '#f0e5ca';
 drawing.fillRect(0, 0, page.width, page.height);
 drawing.fillStyle = '#503824';
 drawing.font = 'bold 24px monospace';
 drawing.fillText(`${timelineRepo.name}  /  ${start.toLocaleString('en-US')}–${end.toLocaleString('en-US')} STAR GROWTH`, gap, 37);
 drawing.imageSmoothingEnabled = false;
 for (let stars = start; stars <= end; stars += growth.step) {
  if (previous?.stars !== stars) {
   const snapshot = {repositoryId: timelineRepo.id, fullName: timelineRepo.name, stars, newStars7d: null, fetchedAt: '2026-11-14 08:00 UTC'};
   const card = await renderStarCard(createScene(snapshot, blueprint, growth));
   previous = {stars, image: await loadImage(card)};
  }
  const index = (stars - start) / growth.step;
  drawing.drawImage(previous.image, gap + (index % 4) * (tileWidth + gap), top + Math.floor(index / 4) * (tileHeight + gap), tileWidth, tileHeight);
 }
 const filename = `stars-${String(start).padStart(4, '0')}-${String(end).padStart(4, '0')}.png`;
 await writeFile(new URL(filename, timeline), page.toBuffer('image/png'));
 console.log(filename);
}
