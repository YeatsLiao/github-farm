import { contains } from '../farm/geometry.js';
import { randomFor } from '../farm/seed.js';
import { pondDistance } from '../farm/terrain.js';

const WIDTH = 640;
const HEIGHT = 360;

function grain(seed, x, y) {
  let n = seed ^ Math.imul(x, 374761393) ^ Math.imul(y, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

function noise(seed, x, y, size) {
  const ix = Math.floor(x / size), iy = Math.floor(y / size);
  const tx = x / size - ix, ty = y / size - iy;
  const a = grain(seed, ix, iy) * (1 - tx) + grain(seed, ix + 1, iy) * tx;
  const b = grain(seed, ix, iy + 1) * (1 - tx) + grain(seed, ix + 1, iy + 1) * tx;
  return a * (1 - ty) + b * ty;
}

function polygon(ctx, points) {
  ctx.beginPath();
  for (const [i, [x, y]] of points.entries()) {
    if (i) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

function patch(ctx, x, y, rx, ry, seed) {
  const points = Array.from({ length: 48 }, (_, i) => {
    const angle = i * Math.PI / 24;
    const variation = .96 + .08 * Math.sin(angle * 3 + (seed % 53)) + .07 * grain(seed, i, 0);
    return [x + Math.cos(angle) * rx * variation, y + Math.sin(angle) * ry * variation];
  });
  polygon(ctx, points);
}

function mask(canvasFactory, draw) {
  const ctx = canvasFactory(WIDTH, HEIGHT).getContext('2d');
  draw(ctx);
  return ctx.getImageData(0, 0, WIDTH, HEIGHT).data;
}

function visible(a, b, reserved, padding = 2) {
  const steps = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 2);
  for (let i = 1; i < steps; i++) {
    const t = i / steps, x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t;
    if (reserved.some(rect => contains(rect, x, y, padding))) return false;
  }
  return true;
}

function simplify(points, reserved, junctions) {
  const result = [points[0]];
  for (let i = 0; i < points.length - 1;) {
    let next = i + 1;
    for (let j = next + 1; j < points.length; j++) {
      if (junctions.has(points[j - 1].join(','))) break;
      if (visible(points[i], points[j], reserved)) next = j;
    }
    result.push(points[next]);
    i = next;
  }
  return result;
}

function road(ctx, points, reserved) {
  ctx.beginPath();
  ctx.moveTo(...points[0]);
  for (let i = 1; i < points.length - 1; i++) {
    const a = points[i - 1], b = points[i], c = points[i + 1];
    const distance = Math.min(15, Math.hypot(a[0] - b[0], a[1] - b[1]) / 3, Math.hypot(c[0] - b[0], c[1] - b[1]) / 3);
    const towards = p => {
      const length = Math.hypot(p[0] - b[0], p[1] - b[1]);
      return b.map((value, axis) => value + (p[axis] - value) * distance / length);
    };
    const before = towards(a), after = towards(c);
    if (visible(before, after, reserved, 7)) {
      ctx.lineTo(...before);
      ctx.quadraticCurveTo(...b, ...after);
    } else ctx.lineTo(...b);
  }
  ctx.lineTo(...points.at(-1));
  ctx.stroke();
}

function roadMask(ctx, scene) {
  const b = scene.blueprint;
  const opened = new Set(scene.objects.map(object => object.id));
  const routes = b.routes.filter(route => {
    if (route.id === 'windmill') return scene.millYard;
    if (route.id === 'livestock' || route.id === 'well') return opened.has(route.id);
    return !route.id.startsWith('bed-') || scene.beds.some(bed => bed.id === route.id);
  });
  const junctions = new Set(b.routes.slice(1).map(route => route.points.at(-1).join(',')));
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const route of routes) {
    const points = simplify(route.points, b.reserved, junctions);
    if (route.id === 'pond') {
      const [x, y, rx, ry] = b.pond;
      const [dx, dy] = [points[0][0] - x, points[0][1] - y];
      const factor = 1.04 / Math.hypot(dx / rx, dy / ry);
      points.unshift([x + dx * factor, y + dy * factor]);
    }
    if (route.id.startsWith('bed-')) {
      const bed = scene.beds.find(bed => bed.id === route.id);
      const [dx, dy] = [points[0][0] - bed.x, points[0][1] - bed.y];
      const factor = Math.min((bed.w / 2 + 1) / Math.abs(dx), (bed.h / 2 + 1) / Math.abs(dy));
      points.unshift([bed.x + dx * factor, bed.y + dy * factor]);
    }
    if (route.id === 'home') points.unshift([b.home[0], b.home[1] - 4]);
    if (route.id === 'livestock') points.unshift([b.livestock[0], b.livestock[1] - 2]);
    if (route.id === 'windmill') points.unshift([b.windmill[0], b.windmill[1] - 2]);
    if (route.id === 'well') points.unshift(b.well);
    if (route.id === 'home') points.push([b.gate[0], HEIGHT + 6]);
    ctx.lineWidth = route.id === 'home' ? 18 : 11;
    road(ctx, points, b.reserved);
  }
  patch(ctx, b.home[0] - 9, b.home[1] + 9, 34, 15, b.seed);
  if (scene.livestock) {
    const [x, y] = b.livestock;
    patch(ctx, x + 2, y + (scene.pen ? 20 : 12), scene.pen ? 40 : 31, scene.pen ? 20 : 12, b.seed + 7);
  }
  if (opened.has('well')) patch(ctx, b.well[0], b.well[1] + 3, 18, 11, b.seed + 8);
}

function soilMask(ctx, beds, seed) {
  for (const bed of beds) {
    const { x, y, w, h } = bed;
    const points = [];
    for (let i = 0; i <= 16; i++) points.push([x - w / 2 + 4 + i * (w - 8) / 16, y - h / 2 + grain(seed, i, y) * 5]);
    for (let i = 1; i <= 5; i++) points.push([x + w / 2 + grain(seed, x, i) * 5 - 2, y - h / 2 + i * h / 6]);
    for (let i = 16; i >= 0; i--) points.push([x - w / 2 + 4 + i * (w - 8) / 16, y + h / 2 - 4 + grain(seed, i, x) * 5]);
    for (let i = 5; i >= 1; i--) points.push([x - w / 2 + grain(seed, y, i) * 5 - 2, y - h / 2 + i * h / 6]);
    polygon(ctx, points);
  }
}

function paintDeck(ctx, {x, y, width, height, material}, seed) {
  const front = y + height;
  ctx.fillStyle = '#45392332';
  ctx.fillRect(x + 2, front, width, 5);
  for (const foot of [x + 4, x + width - 7]) {
    ctx.fillStyle = '#543d27';
    ctx.fillRect(foot, front - 1, 4, material === 'dock' ? 10 : 7);
    ctx.fillStyle = '#a36d3d';
    ctx.fillRect(foot, front - 1, 2, material === 'dock' ? 8 : 5);
  }
  ctx.fillStyle = '#755037';
  ctx.fillRect(x, y + 2, width, height + 1);
  for (let row = 0; row < height; row += 5) {
    const inset = row === 0 ? 2 : 0;
    const seam = Math.round(width * (.33 + grain(seed, x, y + row) * .34));
    ctx.fillStyle = row % 2 ? '#ba8653' : '#b58050';
    ctx.fillRect(x + inset, y + row, width - inset * 2, Math.min(4, height - row));
    ctx.fillStyle = '#d5a270';
    ctx.fillRect(x + inset, y + row, width - inset * 2, 1);
    ctx.fillStyle = '#92633f';
    ctx.fillRect(x + seam, y + row + 1, 1, Math.min(3, height - row - 1));
  }
  ctx.fillStyle = '#94623d';
  ctx.fillRect(x + 1, front - 1, width - 2, 3);
  ctx.fillStyle = '#b58250';
  ctx.fillRect(x + 1, front - 1, width - 2, 1);
  if (material === 'dock') {
    // End board caps the planks where the platform extends over shallow water.
    ctx.fillRect(x + 1, y + 1, 3, height - 2);
  }
}

function paintYardSurfaces(ctx, surfaces, seed) {
  for (const {x, y, width, height, material} of surfaces) {
    if (material !== 'stone') {
      paintDeck(ctx, {x, y, width, height, material}, seed);
      continue;
    }
    const colors = ['#a7997c', '#b1a184', '#c2b18d', '#bbae92'];
    const rowHeight = 8;
    for (let row = 0; row < height; row += rowHeight) {
      const inset = 1 + Math.floor(grain(seed + 2, x, y + row) * 6);
      for (let column = inset; column < width - 6;) {
        const n = grain(seed, x + column, y + row);
        const length = Math.min(8 + Math.floor(n * 12), width - 2 - column);
        const h = Math.min(rowHeight - 1, height - row);
        if (h < 3) break;
        ctx.fillStyle = '#62533952';
        ctx.fillRect(x + column, y + row + 1, length - 1, h);
        ctx.fillStyle = colors[Math.floor(n * colors.length)];
        ctx.fillRect(x + column + 1, y + row, length - 2, h);
        ctx.fillRect(x + column, y + row + 1, length - 1, h - 2);
        column += length;
      }
    }
  }
}

export function paintStarGround(ctx, scene, createCanvas) {
  const { seed, pond } = scene.blueprint;
  const [px, py, rx, ry] = pond;
  const roads = mask(createCanvas, c => roadMask(c, scene));
  const soil = mask(createCanvas, c => soilMask(c, scene.beds, seed));
  const coast = new Float32Array(WIDTH * HEIGHT);
  const ground = createCanvas(WIDTH, HEIGHT).getContext('2d');
  const pixels = ground.createImageData(WIDTH, HEIGHT);
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const i = (y * WIDTH + x) * 4;
      const rough = grain(seed, x >> 1, y >> 1) - .5;
      const detail = noise(seed, x, y, 7) - .5;
      const broad = noise(seed + 11, x, y, 45) - .5;
      const unevenX = Math.max(0, Math.min(WIDTH - 1, x + Math.round((detail + rough * .45) * 5)));
      const unevenY = Math.max(0, Math.min(HEIGHT - 1, y + Math.round((broad + rough * .4) * 5)));
      const uneven = (unevenY * WIDTH + unevenX) * 4 + 3;
      const edge = Math.max(0, 1 - y / 106, 1 - x / 55, 1 - (WIDTH - x) / 50);
      const light = Math.round((rough * 12 + detail * 18 + broad * 31) / 3) * 3;
      let red = 148 + light - edge * 50;
      let green = 161 + light - edge * 46;
      let blue = 68 + light * .48 - edge * 12;
      if (roads[uneven] > 96 + rough * 120) {
        red = 199 + light; green = 159 + light; blue = 94 + light;
      }
      if (soil[uneven] > 94 + rough * 160) {
        const furrow = (y % 7 < 2 ? -7 : 0) + detail * 9;
        red = 133 + light + furrow; green = 91 + light + furrow; blue = 54 + light;
      }
      const nearPond = Math.abs(x - px) < rx * 1.22 + 8 && Math.abs(y - py) < ry * 1.22 + 8;
      const shore = nearPond ? pondDistance(pond, seed, x, y) + detail * 2.8 + rough : 99;
      coast[i >> 2] = shore;
      if (shore < 0) {
        const width = Math.min(25, ry * .8) * (.68 + noise(seed + 19, x, y, 26) * .55);
        const depth = Math.min(1, (-shore + detail * 1.7) / width);
        const shallows = Math.max(0, Math.min(1, 1 - depth));
        red = 48 + 43 * shallows + light * .48;
        green = 111 + 37 * shallows + light * .56;
        blue = 132 + 8 * shallows + light * .54;
      } else if (shore < 1.5 + (detail + .5) * 6 && roads[uneven] < 90) {
        const damp = Math.max(0, 1 - shore / 7);
        red = 152 - damp * 31 + light;
        green = 147 - damp * 29 + light;
        blue = 87 - damp * 18 + light * .6;
      }
      pixels.data[i] = red;
      pixels.data[i + 1] = green;
      pixels.data[i + 2] = blue;
      pixels.data[i + 3] = 255;
    }
  }
  ground.putImageData(pixels, 0, 0);
  const r = randomFor(seed, 'surface-marks');
  for (let i = 0; i < 2300; i++) {
    const x = Math.floor(r() * WIDTH), y = Math.floor(r() * HEIGHT), k = (y * WIDTH + x) * 4 + 3;
    const shore = coast[k >> 2];
    if (shore < -2 && i % 4 === 0) {
      ground.fillStyle = i % 3 ? '#a1c6bc65' : '#233e6140';
      ground.fillRect(x, y, 2 + Math.floor(r() * 5), 1);
    } else if (shore > 1 && shore < 7 && roads[k] < 90) {
      ground.fillStyle = i % 3 ? '#a49970' : '#7d8060';
      ground.fillRect(x, y, 1 + i % 2, 1);
    } else if (roads[k] > 210 || soil[k] > 210) {
      ground.fillStyle = '#6e48212c';
      ground.fillRect(x, y, 2, 1);
    } else if (shore > 4 && roads[k] < 30 && soil[k] < 30 && noise(seed + 3, x, y, 23) > .49) {
      ground.fillStyle = i % 3 ? '#5f793b70' : '#d1ca6770';
      ground.fillRect(x, y, 1, 2);
      ground.fillRect(x + 1, y + 1, 2, 1);
    }
  }
  paintYardSurfaces(ground, scene.yardSurfaces ?? [], seed);
  ctx.drawImage(ground.canvas, 0, 0);
}
