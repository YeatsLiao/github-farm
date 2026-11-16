// World coordinates for the farm extensions. The original cottage, paths and
// waterfront keep their positions at every milestone.
export const farmExpansions = {
  'cottage-garden': {
    field: [142, 322, 108, 39], crops: ['tomato', 'carrot', 'wheat', 'pumpkin'],
    fieldRoad: [[201, 327], [217, 328], [235, 327]],
    orchard: [447, 138, 'orange'],
    workshop: [533, 162], workshopScale: .77,
    workshopRoad: [[533, 170], [548, 208], [514, 228], [463, 262]],
    mill: [584, 318], millRoad: [[584, 326], [555, 330], [489, 326], [475, 304], [480, 291]],
    perennial: [[386, 324], [421, 318], [456, 328]],
    flowers: [[107, 301], [143, 301], [178, 301], [511, 319], [529, 322]],
  },
  'creek-orchard': {
    field: [198, 311, 96, 31], crops: ['carrot', 'pumpkin', 'carrot', 'wheat'],
    fieldRoad: [[250, 313], [266, 312], [279, 310]],
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
    orchard: [79, 260, 'apple'],
    workshop: [529, 180], workshopScale: .82,
    mill: [580, 329], millRoad: [[580, 336], [557, 339], [479, 337], [387, 335], [251, 330]],
    perennial: [[322, 319], [359, 316], [396, 319]],
    flowers: [[108, 298], [132, 297], [156, 298], [177, 300], [203, 296]],
  },
};
