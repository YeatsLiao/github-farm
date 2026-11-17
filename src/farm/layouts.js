export const starterViewport = {x: 54, y: 57, width: 432, height: 243};
export const workyardViewport = {x: 30, y: 36, width: 592, height: 333};
const plot = (id, x, y, w, h) => ({id, x, y, w, h});
const route = (id, points) => ({id, points});

function plantedRows(bed, rows) {
  return rows.flatMap((plants, row) => plants.map((type, column) => [
    type,
    bed.x + (column - (plants.length - 1) / 2) * 18,
    bed.y - bed.h * .23 + row * 17,
    .81,
    `${bed.id}-crop-${row}-${column}`,
  ]));
}

const gardenLeft = plot('bed-0', 154, 242, 114, 58);
const gardenRight = plot('bed-1', 319, 253, 120, 57);
const orchardBed = plot('bed-0', 379, 259, 100, 49);
const pastureBed = plot('bed-0', 157, 250, 101, 57);

export const starterThemes = [
  {
    slug: 'cottage-garden', title: 'COTTAGE GARDEN', note: 'A stone lane links the porch, well and beds', seed: 471812,
    home: [233, 181], well: [285, 206], pond: [432, 200, 37, 27], gate: [235, 356],
    beds: [gardenLeft, gardenRight],
    fences: [[[93, 217], [93, 277], [214, 277], [214, 256]], [[385, 250], [385, 287], [255, 287], [255, 270]]],
    yardSurfaces: [
      {x: 204, y: 193, width: 102, height: 19, material: 'stone'},
      {x: 214, y: 233, width: 21, height: 8, material: 'stone'},
    ],
    routes: [
      route('home', [[233, 188], [232, 204], [233, 233], [235, 287], [235, 352]]),
      route('well', [[281, 217], [257, 213], [232, 204]]),
      route('bed-0', [[222, 238], [233, 233]]),
      route('bed-1', [[251, 254], [234, 255]]),
      route('pond', [[388, 213], [362, 212], [315, 216], [257, 213], [232, 204]]),
    ],
    props: [
      ['cottage-3', 233, 181], ['well', 285, 206], ['farmer', 230, 232, .9], ['cat', 130, 185, .85],
      ['barrel', 91, 193, .77], ['crate', 132, 204, .82], ['lamp', 252, 189, .83],
      ['nursery-tray', 153, 205], ['watering-can', 301, 202, .93],
      ['oak', 79, 128, 1.04], ['berry', 85, 185, .93], ['daisy', 89, 204, .82],
      ['bench', 381, 197, .85], ['reeds', 401, 222, .75], ['rock', 469, 217, .75],
      ['waterlily', 438, 197, .9], ['reeds', 460, 219, .68], ['daisy', 394, 232, .74],
      ['hydrangea', 358, 217, .82], ['berry', 431, 247, .95], ['fern', 459, 234, .9],
      ['apple', 358, 153, .83], ['pine', 475, 145, .86], ['scarecrow', 375, 253, .82],
      ['oak', 56, 305, 1.04], ['crate', 397, 275, .88], ['daisy', 380, 281, .66],
      ['oak', 292, 105, .98], ['fern', 267, 114, .8], ['berry', 315, 118, .86],
      ['verge', 106, 280], ['verge', 285, 291], ['pebbles', 397, 216],
      ...plantedRows(gardenLeft, [['tomato', 'tomato', 'tomato', 'carrot', 'carrot'], ['carrot', 'carrot', 'pumpkin', 'pumpkin', 'pumpkin'], ['carrot', 'carrot', 'daisy', 'daisy', 'daisy']]),
      ...plantedRows(gardenRight, [['wheat', 'wheat', 'wheat', 'sunflower', 'sunflower'], ['pumpkin', 'pumpkin', 'carrot', 'carrot', 'carrot'], ['carrot', 'carrot', 'carrot', 'pumpkin', 'pumpkin']]),
    ],
  },
  {
    slug: 'creek-orchard', title: 'CREEKSIDE ORCHARD', note: 'Waterfront picking path and sorting deck', seed: 222197,
    home: [398, 187], well: [429, 239], pond: [76, 222, 72, 59], gate: [279, 356],
    beds: [orchardBed],
    fences: [[[330, 230], [434, 230], [434, 290], [319, 290], [319, 274]], [[170, 252], [185, 263], [241, 263]]],
    yardSurfaces: [
      {x: 177, y: 202, width: 84, height: 31, material: 'wood'},
      {x: 316, y: 247, width: 19, height: 8, material: 'stone'},
    ],
    routes: [
      route('home', [[398, 195], [372, 198], [325, 206], [284, 226], [279, 268], [279, 350]]),
      route('pond', [[156, 223], [193, 238], [232, 238], [241, 238], [284, 226]]),
      route('bed-0', [[320, 252], [280, 250]]),
    ],
    props: [
      ['cottage-2', 398, 187], ['farmer', 246, 228, .9], ['cat', 362, 198, .82],
      ['apple', 155, 156, 1.03, 'young-fruit'], ['orange', 224, 142, 1.05], ['orange', 179, 202, .95],
      ['apple', 252, 189, .99], ['apple', 327, 168, .81],
      ['crate', 210, 218, .88], ['crate', 191, 221, .81], ['barrel', 220, 211, .78],
      ['fruit-ladder', 194, 204, .91], ['fruit-crate-empty', 235, 218],
      ['bench', 307, 232, .78], ['lamp', 371, 203, .85],
      ['reeds', 118, 174, .83], ['reeds', 145, 251, .76], ['rock', 151, 193, .65],
      ['rock', 121, 270, .76], ['reeds', 84, 284, .79], ['daisy', 168, 210, .68],
      ['waterlily', 96, 210, .93], ['waterlily', 110, 243, .64], ['duck', 86, 233, .88],
      ['fern', 173, 264, .9], ['berry', 185, 279, .94], ['daisy', 213, 275, .8],
      ['pine', 466, 167, .99], ['hydrangea', 451, 211, .86], ['barrel', 444, 241, .86],
      ['crate', 435, 273, .74], ['oak', 473, 310, 1.06], ['berry', 282, 131, .82],
      ['pine', 109, 124, .94], ['daisy', 126, 156, .72],
      ['pebbles', 175, 248], ['verge', 182, 266], ['verge', 239, 268], ['pebbles', 315, 214],
      ['fern', 443, 288, .74], ['pebbles', 338, 296], ['verge', 293, 277],
      ...plantedRows(orchardBed, [['carrot', 'carrot', 'tomato', 'tomato'], ['carrot', 'carrot', 'pumpkin', 'pumpkin']]),
    ],
  },
  {
    slug: 'barnyard-pasture', title: 'BARNYARD PASTURE', note: 'Coop, connected fencing and feed storage', seed: 861212,
    home: [169, 180], well: [226, 229], pond: [404, 230, 23, 12], gate: [251, 356],
    livestock: [352, 178], beds: [pastureBed],
    fences: [[[317, 222], [317, 263], [447, 263], [447, 229]], [[447, 200], [447, 187], [421, 187]], [[317, 196], [317, 183], [327, 183]]],
    yardSurfaces: [{x: 205, y: 247, width: 22, height: 8, material: 'stone'}],
    routes: [
      route('home', [[169, 185], [219, 195], [250, 218], [250, 270], [251, 352]]),
      route('well', [[232, 241], [250, 240]]),
      route('bed-0', [[215, 251], [250, 246]]),
      route('livestock', [[351, 193], [337, 205], [315, 209], [292, 223], [278, 241], [250, 218]]),
      route('pond', [[371, 234], [354, 226], [337, 205]]),
    ],
    props: [
      ['cottage-1', 169, 180], ['well', 226, 229, .92], ['coop', 352, 178, 1.09],
      ['farmer', 299, 228, .92], ['cat', 120, 190, .83], ['lamp', 194, 193, .88],
      ['barrel', 325, 181, .88], ['crate', 325, 194, .8], ['barrel', 386, 183, .89],
      ['bench', 409, 191, .83], ['chicken', 354, 201, 1], ['chicken', 375, 213, .96],
      ['water-trough', 403, 252],
      ['chicken', 337, 225, .87], ['chicken', 426, 215, .95], ['duck', 408, 231, .74],
      ['fern', 438, 220, .9], ['reeds', 420, 242, .52], ['rock', 426, 253, .7],
      ['orange', 429, 154, .91], ['oak', 68, 179, 1.05], ['daisy', 84, 185, .82],
      ['sunflower', 94, 226, .86], ['crate', 102, 270, .82], ['scarecrow', 198, 244, .84],
      ['berry', 315, 281, .83], ['daisy', 351, 279, .76], ['fern', 386, 280, .78],
      ['oak', 476, 302, 1.1], ['pine', 457, 134, .92], ['oak', 246, 123, .91], ['fern', 267, 127, .84],
      ['verge', 322, 268], ['verge', 421, 270], ['pebbles', 303, 206],
      ...plantedRows(pastureBed, [['wheat', 'wheat', 'wheat', 'wheat'], ['wheat', 'wheat', 'carrot', 'carrot']]),
    ],
  },
];
