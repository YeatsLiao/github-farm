import {createCanvas,loadImage} from 'canvas';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {SPRING_SHEETS} from './atlas-layout.js';
const root=new URL('../',import.meta.url), source=new URL('assets/source/',root), out=new URL('assets/runtime/',root);
await mkdir(out,{recursive:true});
const atlas=createCanvas(1024,640),ctx=atlas.getContext('2d');ctx.imageSmoothingEnabled=false;
const manifest={schemaVersion:1,artVersion:'star-spring-1',sprites:{}},sources=[];
let slot=0;
for(const sheet of SPRING_SHEETS){
 const bytes=await readFile(new URL(sheet.file,source)),img=await loadImage(bytes),c=createCanvas(img.width,img.height),g=c.getContext('2d');g.drawImage(img,0,0);
 sources.push({id:sheet.id,file:sheet.file,sha256:createHash('sha256').update(bytes).digest('hex'),width:img.width,height:img.height});
 for(const [i,[id,mw,mh,anchor=.5]] of sheet.items.entries()){
  const sx=Math.round(i%sheet.cols*img.width/sheet.cols),sy=Math.round(Math.floor(i/sheet.cols)*img.height/sheet.rows);
  const sw=Math.round((i%sheet.cols+1)*img.width/sheet.cols)-sx,sh=Math.round((Math.floor(i/sheet.cols)+1)*img.height/sheet.rows)-sy;
  const pixels=g.getImageData(sx,sy,sw,sh),d=pixels.data;let left=sw,top=sh,right=-1,bottom=-1,count=0;
  for(let y=0;y<sh;y++)for(let x=0;x<sw;x++){
   const p=(y*sw+x)*4;
   // Ignore alpha extraction residue; preserve solid subject colours.
   if(d[p+3]<96){d[p+3]=0;continue;} d[p+3]=255;count++;
   left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
  }
  if(count<40||right<left)throw Error('Empty subject: '+id);
  const crop=createCanvas(sw,sh);crop.getContext('2d').putImageData(pixels,0,0);
  const bw=right-left+1,bh=bottom-top+1,scale=Math.min(mw/bw,mh/bh),w=Math.round(bw*scale),h=Math.round(bh*scale);
  const ax=slot%8*128+3,ay=Math.floor(slot/8)*128+3;
  ctx.drawImage(crop,left,top,bw,bh,ax,ay,w,h);
  manifest.sprites[id]={rect:[ax,ay,w,h],pivot:[Math.round(w*anchor),h],visualBounds:[-Math.round(w*anchor),-h,w,h],footprint:[Math.min(w,40),Math.min(h,16)],sourceId:sheet.id,sourceRect:[sx+left,sy+top,bw,bh]};
  slot++;
 }
}
await writeFile(new URL('spring-atlas.png',out),atlas.toBuffer('image/png'));
await writeFile(new URL('spring-manifest.json',out),JSON.stringify(manifest,null,2)+'\n');
await writeFile(new URL('sources.json',source),JSON.stringify(sources,null,2)+'\n');
const board=createCanvas(1024,Math.ceil(slot/8)*160),b=board.getContext('2d');b.fillStyle='#f7edcf';b.fillRect(0,0,board.width,board.height);b.imageSmoothingEnabled=false;b.font='11px sans-serif';
for(const [i,[id,s]] of Object.entries(manifest.sprites).entries()){
 const x=i%8*128,y=Math.floor(i/8)*160;b.drawImage(atlas,...s.rect,x+Math.round((128-s.rect[2])/2),y+120-s.rect[3],s.rect[2],s.rect[3]);b.fillStyle='#573b2c';b.fillText(id,x+6,y+144);
}
await mkdir(new URL('dist/',root),{recursive:true});
await writeFile(new URL('dist/star-spring-catalog.png',root),board.toBuffer('image/png'));
console.log('Compiled '+slot+' sprite frames; native transparent atlas 1024×640.');
