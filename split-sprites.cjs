const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

(async () => {
  const img = await loadImage('assets/sprites/farm-spritesheet.png');
  console.log('Spritesheet loaded:', img.width + 'x' + img.height);
  
  // Create output directory
  const outDir = 'assets/sprites/individual';
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  
  // Spritesheet is 1024x768
  // Row heights: 768 / 5 = 153.6 each
  const rowH = Math.floor(img.height / 5); // 153
  
  // Rows 1-4: 4 items, each 256px wide
  // Row 5: 7 items, each ~146px wide
  const colW4 = Math.floor(img.width / 4); // 256
  const colW7 = Math.floor(img.width / 7); // 146
  
  const sprites = {
    // Row 0: crop stages (4 items, 256px each)
    'crop-seed':     { row: 0, col: 0, cols: 4 },
    'crop-sprout':   { row: 0, col: 1, cols: 4 },
    'crop-growing':  { row: 0, col: 2, cols: 4 },
    'crop-harvest':  { row: 0, col: 3, cols: 4 },
    // Row 1: buildings (4 items, 256px each)
    'barn':          { row: 1, col: 0, cols: 4 },
    'fence':         { row: 1, col: 1, cols: 4 },
    'windmill':      { row: 1, col: 2, cols: 4 },
    'well':          { row: 1, col: 3, cols: 4 },
    // Row 2: trees (4 items, 256px each)
    'oak-tree':      { row: 2, col: 0, cols: 4 },
    'willow-tree':   { row: 2, col: 1, cols: 4 },
    'maple-tree':    { row: 2, col: 2, cols: 4 },
    'pine-tree':     { row: 2, col: 3, cols: 4 },
    // Row 3: animals (4 items, 256px each)
    'chicken':       { row: 3, col: 0, cols: 4 },
    'cow':           { row: 3, col: 1, cols: 4 },
    'cat':           { row: 3, col: 2, cols: 4 },
    'dog':           { row: 3, col: 3, cols: 4 },
    // Row 4: decorations (7 items, 146px each)
    'sunflower':     { row: 4, col: 0, cols: 7 },
    'pumpkin':       { row: 4, col: 1, cols: 7 },
    'carrot':        { row: 4, col: 2, cols: 7 },
    'tomato':        { row: 4, col: 3, cols: 7 },
    'watering-can':  { row: 4, col: 4, cols: 7 },
    'scarecrow':     { row: 4, col: 5, cols: 7 },
  };
  
  for (const [name, pos] of Object.entries(sprites)) {
    const colW = pos.cols === 4 ? colW4 : colW7;
    const x = pos.col * colW;
    const y = pos.row * rowH;
    
    const canvas = createCanvas(colW, rowH);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, x, y, colW, rowH, 0, 0, colW, rowH);
    
    const buf = canvas.toBuffer('image/png');
    fs.writeFileSync(path.join(outDir, name + '.png'), buf);
    console.log('Extracted:', name, '(' + colW + 'x' + rowH + ')');
  }
  
  console.log('Done! All sprites extracted to', outDir);
})();