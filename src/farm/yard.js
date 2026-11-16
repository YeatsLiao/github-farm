const yards = {
  'cottage-garden': {
    name: 'Cottage Garden',
    plot: ['Kitchen garden', 'Mixed rows of vegetables grow by the cottage.'],
    work: ['Drying rack', 'Herbs and produce dry beside the path before going into storage.', 100, 178, 204],
    harvest: [219, 216],
    walk: [[235, 271], [233, 239], [232, 217]],
    picking: 'Tending the vegetable beds',
    carrying: 'Carrying produce to the harvest table',
  },
  'creek-orchard': {
    name: 'Creekside Orchard',
    plot: ['Kitchen garden', 'Vegetable beds supply the cottage while the fruit trees grow.'],
    work: ['Jam shed', 'Fruit from the sorting deck goes here to be cooked and bottled.', 100, 290, 171],
    harvest: [253, 216],
    walk: [[156, 174], [157, 202], [156, 223], [193, 238], [232, 238]],
    picking: 'Tending the creekside fruit trees',
    carrying: 'Taking a basket of fruit to the sorting deck',
  },
  'barnyard-pasture': {
    name: 'Barnyard Pasture',
    plot: ['Feed crops', 'The rows of grain help supply the coop beside the pasture.'],
    work: ['Feed station', 'The farmer brings feed from the crates into the chicken yard.', 100, 289, 209],
    harvest: [280, 226],
    walk: [[280, 237], [305, 244], [318, 226], [333, 210], [344, 197]],
    picking: 'Checking the chicken yard',
    carrying: 'Taking feed along the coop path',
  },
};

export function describeYard(theme, stars, objects, beds, blueprint) {
  const yard = yards[theme];
  const [hx, hy] = blueprint.home;
  const [px, py] = blueprint.pond;
  const [workName, workDescription, workAt, wx, wy] = yard.work;
  const [harvestX, harvestY] = yard.harvest;
  const bed = beds[0];
  const places = [
    {id: 'cottage', label: 'Cottage', x: hx - 10, y: hy - 59, at: 0, description: 'The yard and its main path grow around this cottage.'},
    {id: 'plot', label: yard.plot[0], x: bed.x, y: bed.y, at: 0, description: yard.plot[1]},
    {id: 'pond', label: 'Pond', x: theme === 'creek-orchard' ? 108 : px, y: theme === 'creek-orchard' ? py + 22 : py, at: 0, description: 'Reeds and water lilies mark the edge of the farm’s watering spot.'},
    {id: 'harvest', label: 'Harvest table', x: harvestX, y: harvestY - 6, at: 25, description: 'The farmer uses the table to sort baskets collected around the yard.'},
    {id: 'work', label: workName, x: wx, y: wy - 14, at: workAt, description: workDescription},
  ];
  if (theme === 'creek-orchard') {
    places.push(
      {id: 'orchard', label: 'Fruit trees', x: 155, y: 133, at: 0, description: 'The young tree first bears fruit at 5 Stars. The second row grows at 300 Stars.'},
      {id: 'dock', label: 'Wooden dock', x: 147, y: 218, at: 300, description: 'The dock links the path to the water, where ducks swim past.'},
    );
  }
  if (theme === 'barnyard-pasture') {
    const [x, y] = blueprint.livestock;
    places.push({id: 'coop', label: 'Chicken coop', x, y: y - 39, at: 0, description: 'The fenced yard beside the coop gives the chickens space to roam.'});
  }
  const windmill = objects.find(object => object.id === 'windmill');
  if (windmill) places.push({id: 'windmill', label: 'Windmill', x: windmill.x, y: windmill.y - 37, at: 5000, description: 'The mill yard is the final building milestone at 5,000 Stars.'});

  const farmer = objects.find(object => object.type === 'farmer');
  const duck = theme === 'creek-orchard' && stars >= 300 ? objects.find(object => object.type === 'duck') : null;
  const walk = stars >= 25 && theme !== 'barnyard-pasture'
    ? [...yard.walk, [harvestX, harvestY + 10]]
    : yard.walk;
  return {
    name: yard.name,
    places,
    activity: {
      farmer,
      duck,
      walk,
      pond: blueprint.pond,
      carries: stars >= 25,
      label: stars >= 25 ? yard.carrying : yard.picking,
    },
  };
}

function walkPosition(points, progress) {
  const lengths = points.slice(1).map(([x, y], i) => Math.hypot(x - points[i][0], y - points[i][1]));
  let remaining = lengths.reduce((sum, length) => sum + length, 0) * progress;
  for (const [i, length] of lengths.entries()) {
    if (remaining <= length) {
      return points[i].map((start, axis) => start + (points[i + 1][axis] - start) * remaining / length);
    }
    remaining -= length;
  }
  return points.at(-1);
}

export function activityFrame(activity, seconds) {
  const turn = seconds % 14;
  const outward = turn < 7;
  const distance = outward ? Math.min(1, turn / 5.5) : Math.max(0, 1 - (turn - 7) / 5.5);
  const moving = (distance > 0 && distance < 1);
  const [x, y] = walkPosition(activity.walk, distance);
  const farmer = {...activity.farmer, x, y: y - (moving ? Math.floor(seconds * 8) % 2 : 0)};
  const actors = [farmer];
  if (outward && activity.carries) {
    actors.push({id: 'carried-basket', type: 'basket', x: x + 7, y: farmer.y - 7, scale: .56, ground: false});
  }
  if (activity.duck) {
    const [px, py, rx, ry] = activity.pond;
    const angle = seconds * .58;
    actors.push({...activity.duck, x: px + Math.cos(angle) * rx * .72, y: py + Math.sin(angle) * ry * .40});
  }
  return actors;
}
