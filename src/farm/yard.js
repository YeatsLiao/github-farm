const yards = {
  'cottage-garden': {
    name: 'Cottage Garden',
    plot: ['Kitchen garden', 'Seedlings wait by the cottage and tomatoes grow on a trellis beside the vegetable rows.'],
    work: ['Drying rack', 'Herbs and produce dry beside the path before going into storage.', 100, 178, 204],
    harvest: [219, 216],
  },
  'creek-orchard': {
    name: 'Creekside Orchard',
    plot: ['Kitchen garden', 'Vegetable beds supply the cottage while the fruit trees grow.'],
    work: ['Jam shed', 'Fruit moves from the ladder to the sorting crates, then to this small workshop for cooking and bottling.', 100, 304, 163],
    harvest: [253, 216],
  },
  'barnyard-pasture': {
    name: 'Barnyard Pasture',
    plot: ['Feed crops', 'The rows of grain help supply the coop beside the pasture.'],
    work: ['Feed station', 'The farmer brings feed from the crates into the chicken yard.', 100, 284, 193],
    harvest: [246, 201],
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
      {id: 'orchard', label: 'Fruit trees', x: 155, y: 133, at: 0, description: 'A picking ladder leads into the orchard. The young tree bears fruit at 5 Stars and the second row grows at 300 Stars.'},
      {id: 'dock', label: 'Wooden dock', x: 147, y: 218, at: 300, description: 'The dock links the path to the water, beside a shallow spot for ducks.'},
    );
  }
  if (theme === 'barnyard-pasture') {
    const [x, y] = blueprint.livestock;
    places.push(
      {id: 'coop', label: 'Chicken coop', x, y: y - 39, at: 0, description: 'Chickens have a trough inside the yard. An egg basket sits beside the coop at 25 Stars.'},
      {id: 'hay-shed', label: 'Hay shelter', x: 267, y: 156, at: 100, description: 'The low timber shelter keeps extra hay close to the feed station.'},
    );
  }
  if (theme === 'cottage-garden') {
    places.push({id: 'tool-shed', label: 'Tool shed', x: 110, y: 151, at: 100, description: 'Tools are stored near the nursery and the path to the vegetable beds.'});
  }
  const windmill = objects.find(object => object.id === 'windmill');
  if (windmill) places.push({id: 'windmill', label: 'Windmill', x: windmill.x, y: windmill.y - 37, at: 5000, description: 'The mill yard is the final building milestone at 5,000 Stars.'});

  return {name: yard.name, places};
}
