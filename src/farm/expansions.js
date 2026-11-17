// World coordinates for the farm extensions. The original cottage, paths and
// waterfront keep their positions at every milestone.
export const farmExpansions = {
  'cottage-garden': {
    field: [142, 322, 108, 39], crops: ['tomato', 'carrot', 'wheat', 'pumpkin'],
    fieldRoad: [[201, 327], [217, 328], [235, 327]],
    workyard: {
      label: 'Packing yard', at: 500, x: 152, y: 279,
      description: 'Vegetables from the lower beds are washed here, then packed into crates for the shipping counter.',
      route: [[170, 295], [204, 299], [218, 319], [235, 327]],
      surface: {x: 137, y: 284, width: 60, height: 16, material: 'stone'},
    },
    milestones: [
      [400, 'watering-can', 105, 297], [500, 'wash-bench', 152, 297],
      [600, 'basket', 184, 283], [700, 'packed-produce', 123, 295],
      [800, 'packed-produce', 541, 269], [900, 'crate', 559, 249],
      [1000, 'dispatch-rack', 570, 271],
    ],
    orchard: [447, 138, 'orange'],
    workshop: [533, 162], workshopScale: .77,
    workshopRoad: [[533, 170], [548, 208], [514, 228], [446, 258]],
    mill: [584, 318], millRoad: [[584, 326], [555, 330], [489, 326], [475, 304], [471, 291]],
    perennial: [[386, 324], [421, 318], [456, 328]],
    flowers: [[107, 301], [143, 301], [178, 301], [511, 319], [529, 322]],
  },
  'creek-orchard': {
    field: [198, 311, 96, 31], crops: ['carrot', 'pumpkin', 'carrot', 'wheat'],
    fieldRoad: [[250, 313], [266, 312], [279, 310]],
    workyard: {
      label: 'Fruit pressing yard', at: 800, x: 569, y: 227,
      description: 'Fruit from the eastern trees is pressed beside the sorting deck. Bottles wait here for the next shipment.',
      route: [[579, 235], [554, 232], [528, 229]],
      surface: {x: 555, y: 226, width: 40, height: 27, material: 'wood'},
    },
    milestones: [
      [400, 'fruit-crate-empty', 509, 215], [500, 'fruit-ladder', 556, 193],
      [600, 'fruit-crate-full', 514, 252], [700, 'apple', 578, 190, .72],
      [800, 'fruit-press', 570, 249], [900, 'jam-crate', 582, 260],
      [1000, 'dispatch-rack', 577, 223],
    ],
    orchard: [276, 172, 'orange'],
    workshop: [602, 222], workshopScale: .67,
    workshopRoad: [[602, 230], [582, 235], [553, 234], [528, 229]],
    mill: [555, 336], millRoad: [[555, 343], [524, 344], [451, 334], [357, 333], [279, 330]],
    perennial: [[504, 272], [532, 265], [574, 273]],
    flowers: [[157, 331], [178, 334], [202, 333], [218, 333], [239, 331]],
  },
  'barnyard-pasture': {
    field: [149, 322, 112, 36], crops: ['wheat', 'wheat', 'carrot', 'wheat'],
    fieldRoad: [[210, 322], [231, 319], [251, 319]],
    workyard: {
      label: 'Egg packing yard', at: 1000, x: 462, y: 151,
      description: 'Eggs from the second pen are sorted by the coop, packed here and carried out along the main path.',
      route: [[464, 190], [464, 204], [470, 215]],
      surface: {x: 452, y: 172, width: 26, height: 23, material: 'stone'},
    },
    milestones: [
      [400, 'watering-can', 94, 295], [500, 'hay-bale', 176, 294],
      [600, 'water-trough', 510, 243, .83], [700, 'feed-sacks', 474, 228],
      [800, 'chicken', 539, 242, .8], [900, 'egg-trays', 503, 216],
      [1000, 'dispatch-rack', 464, 180],
    ],
    orchard: [79, 260, 'apple'],
    workshop: [529, 180], workshopScale: .82,
    mill: [580, 329], millRoad: [[580, 336], [557, 339], [479, 337], [387, 335], [251, 330]],
    perennial: [[322, 319], [359, 316], [396, 319]],
    flowers: [[108, 298], [132, 297], [156, 298], [177, 300], [203, 296]],
  },
};
