const yards = {
  'cottage-garden': {
    name: 'Cottage Garden',
    plot: ['Kitchen garden', 'Mixed rows of vegetables grow by the cottage.'],
    work: ['Drying rack', 'Herbs and produce dry beside the path before going into storage.', 100, 178, 204],
    harvest: [219, 216],
  },
  'creek-orchard': {
    name: 'Creekside Orchard',
    plot: ['Kitchen garden', 'Vegetable beds supply the cottage while the fruit trees grow.'],
    work: ['Jam shed', 'Fruit from the sorting deck goes here to be cooked and bottled.', 100, 290, 171],
    harvest: [253, 216],
  },
  'barnyard-pasture': {
    name: 'Barnyard Pasture',
    plot: ['Feed crops', 'The rows of grain help supply the coop beside the pasture.'],
    work: ['Feed station', 'The farmer brings feed from the crates into the chicken yard.', 100, 284, 193],
    harvest: [266, 209],
  },
};

export function describeYard(theme, objects, beds, blueprint) {
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
      {id: 'dock', label: 'Wooden dock', x: 147, y: 218, at: 300, description: 'The dock links the path to the water, beside a shallow spot for ducks.'},
    );
  }
  if (theme === 'barnyard-pasture') {
    const [x, y] = blueprint.livestock;
    places.push({id: 'coop', label: 'Chicken coop', x, y: y - 39, at: 0, description: 'The fenced yard beside the coop gives the chickens space to roam.'});
  }
  const windmill = objects.find(object => object.id === 'windmill');
  if (windmill) places.push({id: 'windmill', label: 'Windmill', x: windmill.x, y: windmill.y - 37, at: 5000, description: 'The mill yard is the final building milestone at 5,000 Stars.'});

  return {name: yard.name, places};
}
