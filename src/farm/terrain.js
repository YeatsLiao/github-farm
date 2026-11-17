// Signed distance in world pixels. Paths and shore decorations use the same
// water boundary as the renderer, including its bays and small irregularities.
export function pondDistance(pond, seed, x, y) {
  const [cx, cy, rx, ry] = pond;
  const dx = (x - cx) / rx;
  const dy = (y - cy) / ry;
  const angle = Math.atan2(dy, dx);
  const phase = (seed % 180) * Math.PI / 180;
  const shore = 1 + .062 * Math.sin(angle * 3 + phase)
    + .036 * Math.sin(angle * 6 - phase) + .019 * Math.sin(angle * 11 + phase * 2);
  return (Math.hypot(dx, dy) - shore) * Math.min(rx, ry);
}

export function distanceToSegment(x, y, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const square = dx * dx + dy * dy;
  const t = square ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / square)) : 0;
  return Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy);
}

export function routeDistance(routes, x, y) {
  let nearest = Infinity;
  for (const {points} of routes) {
    for (let i = 1; i < points.length; i++) {
      nearest = Math.min(nearest, distanceToSegment(x, y, points[i - 1], points[i]));
    }
  }
  return nearest;
}

const footprints = {
  'cottage-1': [60, 13], 'cottage-2': [65, 14], 'cottage-3': [76, 15],
  coop: [44, 10], barn: [55, 12], windmill: [40, 11],
  'jam-shed': [55, 10], 'tool-shed': [24, 8], 'hay-shed': [57, 9],
  well: [20, 7], bench: [26, 6], 'harvest-table': [25, 7], 'feed-bin': [20, 6],
  'nursery-tray': [27, 7], 'water-trough': [32, 7], 'hay-bale': [19, 7],
  'shipping-counter': [38, 8], 'produce-handcart': [27, 9], 'fruit-handoff': [32, 7],
  'egg-sorting-stand': [32, 8], 'nest-boxes': [22, 8],
};

export function occupiedGround(objects, beds, fences) {
  const plots = beds.map(({x, y, w, h}) => ({x: x - w / 2, y: y - h / 2, w, h}));
  const solids = objects.filter(({type}) => footprints[type]).map(({type, x, y, scale}) => {
    const [width, depth] = footprints[type];
    const pivot = type.startsWith('cottage') || type === 'jam-shed' ? .7 : .5;
    const w = width * scale, h = depth * scale;
    return {x: x - w * pivot, y: y - h - 1, w, h};
  });
  const barriers = [];
  for (const run of fences) {
    for (let i = 1; i < run.length; i++) {
      const [ax, ay] = run[i - 1], [bx, by] = run[i];
      const count = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 4));
      for (let j = 0; j <= count; j++) barriers.push({
        x: ax + (bx - ax) * j / count - 2, y: ay + (by - ay) * j / count - 2, w: 4, h: 4,
      });
    }
  }
  return [...plots, ...solids, ...barriers];
}
