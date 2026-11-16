export const starterViewport = {x: 54, y: 57, width: 432, height: 243};
const plot = (id, x, y, w, h) => ({id, x, y, w, h});
const route = (id, points) => ({id, points});

function plantedRows(bed, rows) {
  return rows.flatMap((plants, row) => plants.map((type, column) => [
    type,
    bed.x + (column - (plants.length - 1) / 2) * 18,
    bed.y - bed.h * .23 + row * 17,
    .81,
  ]));
}

function fence(x, y, count, scale = .87) {
  return Array.from({length: count}, (_, i) => ['fence', x + i * 29 * scale, y, scale]);
}

function sideFence(x, y, count, scale = .87) {
  return Array.from({length: count}, (_, i) => ['fence-side', x, y + i * 28 * scale, scale]);
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
    yardSurfaces: [{x: 204, y: 193, width: 102, height: 19, material: 'stone'}],
    routes: [
      route('home', [[233, 188], [232, 204], [233, 233], [235, 287], [235, 352]]),
      route('well', [[281, 217], [257, 213], [232, 204]]),
      route('bed-0', [[222, 238], [233, 233]]),
      route('bed-1', [[251, 254], [234, 255]]),
      route('pond', [[388, 213], [362, 212], [315, 216], [257, 213], [232, 204]]),
    ],
    props: [
      ['cottage-3', 233, 181], ['well', 285, 206], ['farmer', 230, 232, .9], ['cat', 130, 185, .85],
      ['barrel', 120, 178, .9], ['crate', 132, 204, .82], ['lamp', 252, 189, .83],
      ['oak', 79, 128, 1.04], ['berry', 85, 185, .93], ['daisy', 89, 204, .82],
      ['bench', 380, 189, .85], ['reeds', 405, 220, .75], ['rock', 465, 207, .75],
      ['waterlily', 438, 197, .9], ['reeds', 460, 219, .68], ['daisy', 394, 232, .74],
      ['hydrangea', 358, 217, .82], ['berry', 431, 247, .95], ['fern', 459, 234, .9],
      ['apple', 358, 153, .83], ['pine', 475, 145, .86], ['scarecrow', 375, 253, .82],
      ['oak', 56, 305, 1.04], ['crate', 397, 275, .88], ['daisy', 380, 281, .66],
      ['oak', 292, 105, .98], ['fern', 267, 114, .8], ['berry', 315, 118, .86],
      ...plantedRows(gardenLeft, [['tomato', 'tomato', 'tomato', 'carrot', 'carrot'], ['carrot', 'carrot', 'pumpkin', 'pumpkin', 'pumpkin'], ['carrot', 'carrot', 'daisy', 'daisy', 'daisy']]),
      ...plantedRows(gardenRight, [['wheat', 'wheat', 'wheat', 'sunflower', 'sunflower'], ['pumpkin', 'pumpkin', 'carrot', 'carrot', 'carrot'], ['carrot', 'carrot', 'carrot', 'pumpkin', 'pumpkin']]),
      ...fence(106, 286, 5), ...fence(263, 294, 5),
    ],
  },
  {
    slug: 'creek-orchard', title: 'CREEKSIDE ORCHARD', note: 'Waterfront picking path and sorting deck', seed: 222197,
    home: [398, 187], well: [429, 239], pond: [76, 222, 72, 59], gate: [279, 356],
    beds: [orchardBed],
    yardSurfaces: [{x: 177, y: 202, width: 84, height: 31, material: 'wood'}],
    routes: [
      route('home', [[398, 195], [372, 198], [325, 206], [284, 226], [279, 268], [279, 350]]),
      route('pond', [[156, 223], [193, 238], [241, 238], [284, 226]]),
      route('bed-0', [[320, 252], [280, 250]]),
    ],
    props: [
      ['cottage-2', 398, 187], ['farmer', 246, 228, .9], ['cat', 362, 198, .82],
      ['apple', 155, 156, 1.03], ['orange', 224, 142, 1.05], ['orange', 179, 202, .95],
      ['apple', 252, 189, .99], ['apple', 327, 168, .81],
      ['crate', 210, 218, .88], ['crate', 191, 221, .81], ['barrel', 228, 212, .83],
      ['bench', 300, 215, .91], ['lamp', 371, 203, .85],
      ['reeds', 113, 185, .92], ['reeds', 142, 246, .83], ['rock', 148, 205, .82],
      ['rock', 115, 268, .91], ['reeds', 84, 275, .79], ['daisy', 160, 216, .76],
      ['waterlily', 96, 210, .93], ['waterlily', 110, 243, .64], ['duck', 86, 233, .88],
      ['fern', 173, 264, .9], ['berry', 185, 279, .94], ['daisy', 213, 275, .8],
      ['pine', 466, 167, .99], ['hydrangea', 451, 211, .86], ['barrel', 435, 221, .86],
      ['crate', 435, 273, .74], ['oak', 473, 310, 1.06], ['berry', 282, 131, .82],
      ['pine', 109, 124, .94], ['daisy', 126, 156, .72],
      ...plantedRows(orchardBed, [['carrot', 'carrot', 'tomato', 'tomato'], ['carrot', 'carrot', 'pumpkin', 'pumpkin']]),
      ...fence(189, 293, 3), ...fence(313, 298, 4),
    ],
  },
  {
    slug: 'barnyard-pasture', title: 'BARNYARD PASTURE', note: 'Coop, connected fencing and feed storage', seed: 861212,
    home: [169, 180], well: [226, 229], pond: [404, 230, 23, 12], gate: [251, 356],
    livestock: [352, 178], beds: [pastureBed],
    routes: [
      route('home', [[169, 185], [219, 195], [250, 218], [250, 270], [251, 352]]),
      route('well', [[232, 241], [250, 240]]),
      route('bed-0', [[215, 251], [250, 246]]),
      route('livestock', [[351, 193], [318, 226], [305, 244], [278, 241], [250, 218]]),
      route('pond', [[371, 234], [354, 226], [318, 205]]),
    ],
    props: [
      ['cottage-1', 169, 180], ['well', 226, 229, .92], ['coop', 352, 178, 1.09],
      ['farmer', 299, 228, .92], ['cat', 120, 190, .83], ['lamp', 194, 193, .88],
      ['barrel', 325, 181, .88], ['crate', 325, 194, .8], ['barrel', 386, 183, .89],
      ['bench', 409, 191, .83], ['chicken', 354, 201, 1], ['chicken', 375, 213, .96],
      ['chicken', 337, 225, .87], ['chicken', 426, 215, .95], ['duck', 408, 231, .74],
      ['fern', 438, 220, .9], ['reeds', 420, 242, .52], ['rock', 426, 253, .7],
      ['orange', 429, 154, .91], ['oak', 68, 179, 1.05], ['daisy', 84, 185, .82],
      ['sunflower', 94, 226, .86], ['crate', 102, 270, .82], ['scarecrow', 198, 244, .84],
      ['berry', 315, 281, .83], ['daisy', 351, 279, .76], ['fern', 386, 280, .78],
      ['oak', 476, 302, 1.1], ['pine', 457, 134, .92], ['oak', 246, 123, .91], ['fern', 267, 127, .84],
      ...plantedRows(pastureBed, [['wheat', 'wheat', 'wheat', 'wheat'], ['wheat', 'wheat', 'carrot', 'carrot']]),
      ...fence(327, 261, 5), ...fence(319, 182, 1), ...fence(405, 182, 2),
      ...sideFence(314, 207, 1), ...sideFence(314, 261, 1), ...sideFence(440, 207, 1, .96), ...sideFence(440, 261, 1, .96),
    ],
  },
];
