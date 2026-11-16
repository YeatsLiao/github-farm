/** 原创像素人物源稿：在40×40画布逐像素绘制，枢轴恒为(20,38)，不缩放肢体。 */
import { createCanvas } from 'canvas';
import { ART_BY_ID, RESIDENT_TYPES } from '../src/art-catalog.js';

const palettes = {
  farmer: { shirt: '#c57545', light: '#eba76b', dark: '#88452f', pants: '#426d82', hair: '#71432e', skin: '#e9b586', hat: 'straw' },
  gardener: { shirt: '#b55778', light: '#e490a7', dark: '#763c64', pants: '#48715c', hair: '#693d31', skin: '#d6976c', hat: 'bun' },
  angler: { shirt: '#5d8e93', light: '#8db6af', dark: '#3f606f', pants: '#7f6751', hair: '#c9c6b0', skin: '#e5b594', hat: 'bucket' },
  keeper: { shirt: '#769853', light: '#b3c474', dark: '#49633e', pants: '#506182', hair: '#493a30', skin: '#c48a61', hat: 'cap' },
  villager: { shirt: '#bd5651', light: '#ed9379', dark: '#813c51', pants: '#4f526b', hair: '#d6bb82', skin: '#f0c19a', hat: 'hair' },
};

export function drawResident(type, direction, mode, frame) {
  const canvas = createCanvas(40, 40), ctx = canvas.getContext('2d'), p = palettes[type];
  const ink = '#394343', boot = '#594638';
  const r = (x, y, w, h, color) => { ctx.fillStyle = color; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
  const oval = (x, y, w, h, color) => {
    for (let dy = 0; dy < h; dy++) {
      const span = Math.sqrt(Math.max(0, 1 - ((dy + .5 - h / 2) / (h / 2)) ** 2)) * w / 2;
      const left = Math.ceil(w / 2 - span), right = Math.floor(w / 2 + span);
      r(x + left, y + dy, right - left, 1, color);
    }
  };
  const line = (x0, y0, x1, y1, color, thick = 1) => {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let i = 0; i <= steps; i++) r(x0 + (x1 - x0) * i / (steps || 1), y0 + (y1 - y0) * i / (steps || 1), thick, thick, color);
  };
  const walking = mode === 'walk', action = mode === 'action';
  const stride = walking ? [3, 1, -1, -3, -1, 1][frame] : 0;
  const lift = walking ? [0, 0, 1, 0, 0, 1][frame] : 0;
  const bob = walking && [1, 4].includes(frame) ? 1 : 0;
  const side = direction === 'left' || direction === 'right', sign = direction === 'left' ? -1 : 1;
  const back = direction === 'up', y = 19 - bob - (mode === 'idle' && frame === 1 ? 1 : 0);
  // 两条腿各自承重；落地脚在世界坐标中的移动由步幅抵消，不整体上下浮动。
  const leg = (x, endX, endY, far) => {
    line(x, 27, endX, endY - 2, ink, 4);
    line(x + 1, 28, endX + 1, endY - 3, far ? p.dark : p.pants, 2);
    r(endX - (side && sign < 0 ? 1 : 0), endY - 2, side ? 6 : 5, 3, boot);
    r(endX, endY - 2, 3, 1, '#a08057');
  };
  if (side) {
    leg(18, 18 - stride * sign, 36 - lift, true);
    leg(19, 19 + stride * sign, 37 - (walking && frame >= 3 ? lift : 0), false);
  } else {
    const fore = back ? -1 : 1;
    leg(15, 15, 36 + Math.round(stride / 2) * fore, back);
    leg(21, 21, 36 - Math.round(stride / 2) * fore, !back);
  }
  // 远侧手臂、衣身、近侧手臂分别绘制，摆臂和迈腿反相。
  const arm = (x, swing, far = false) => {
    const endY = y + 9 + (walking && !side ? Math.round(stride * (far ? 1 : -1) / 2) : 0) - (action && !far ? 4 + frame : 0);
    line(x, y + 2, x + (side ? swing : 0), endY, far ? p.dark : p.shirt, 3);
    r(x + (side ? swing : 0), endY, 3, 3, p.skin);
    r(x + (side ? swing : 0), endY + 2, 2, 1, '#a76e50');
  };
  if (side) arm(18, stride * sign, true);
  r(side ? 16 : 13, y, side ? 10 : 14, 11, ink);
  r(side ? 17 : 14, y, side ? 8 : 12, 10, p.shirt);
  r(side ? 17 : 14, y + 1, 3, 7, p.light);
  r(side ? 23 : 24, y + 2, 2, 8, p.dark);
  r(side ? 17 : 14, y + 9, side ? 8 : 12, 2, p.dark);
  if (type === 'farmer' || type === 'keeper') {
    r(side ? 20 : 16, y + 1, 2, 8, p.pants);
    if (!side) r(23, y + 1, 2, 8, p.pants);
    r(side ? 20 : 16, y + 6, side ? 4 : 9, 5, p.pants);
    r(side ? 20 : 17, y + 5, 1, 1, '#f8d486');
  } else if (type === 'gardener') {
    r(side ? 23 : 16, y + 3, side ? 3 : 9, 11, '#eee0b9');
    r(side ? 24 : 23, y + 4, 2, 10, '#b9ae8e');
    if (!back && !side) { r(18, y + 6, 4, 3, '#c5b58c'); r(18, y + 6, 4, 1, '#fff0cd'); }
  } else if (type === 'angler') {
    r(side ? 22 : 14, y + 2, 3, 8, '#aab18a');
    if (!side) r(23, y + 2, 3, 8, '#aab18a');
    r(side ? 22 : 14, y + 6, 3, 2, '#657455');
  } else {
    r(side ? 17 : 14, y + 10, side ? 8 : 12, 3, p.shirt);
    line(14, y, 25, y + 8, '#e7c184');
    r(direction === 'left' ? 12 : 25, y + 7, 5, 6, '#7f6844');
    r(direction === 'left' ? 12 : 25, y + 7, 5, 2, '#cfa76a');
  }
  if (side) arm(20, -stride * sign);
  else { arm(11, 0, back); arm(27, 0, !back); }
  // 头部朝向有独立的脸、耳朵和后脑轮廓，不能翻转侧脸代替正背面。
  const hy = 6 - bob, hx = side ? 15 : 13;
  oval(hx - 1, hy, side ? 13 : 15, 15, ink);
  oval(hx, hy, side ? 11 : 13, 14, p.hair);
  if (!back) {
    oval(side ? (sign > 0 ? 19 : 13) : 14, hy + 5, side ? 8 : 11, 9, '#be855e');
    oval(side ? (sign > 0 ? 19 : 13) : 14, hy + 4, side ? 8 : 11, 8, p.skin);
    r(side ? (sign > 0 ? 24 : 13) : 15, hy + 7, side ? 2 : 3, 1, '#ffe1b1');
    if (side) {
      r(sign > 0 ? 25 : 13, hy + 8, 1, mode === 'idle' && frame === 1 ? 1 : 2, ink);
      r(sign > 0 ? 27 : 12, hy + 9, 1, 2, p.skin);
      r(sign > 0 ? 18 : 22, hy + 8, 2, 3, p.skin);
      r(sign > 0 ? 23 : 15, hy + 12, 2, 1, '#a3644e');
    } else {
      r(16, hy + 8, 1, mode === 'idle' && frame === 1 ? 1 : 2, ink);
      r(23, hy + 8, 1, mode === 'idle' && frame === 1 ? 1 : 2, ink);
      r(19, hy + 12, 3, 1, '#a3644e');
      r(14, hy + 10, 2, 1, '#cf9271');
    }
  } else { r(14, hy + 6, 3, 5, p.hair); r(23, hy + 6, 3, 5, p.hair); }
  if (p.hat === 'straw') {
    r(13, hy - 2, 14, 7, '#947039'); r(14, hy - 3, 11, 6, '#deb967');
    r(15, hy - 3, 9, 2, '#f6d98c'); r(13, hy + 2, 14, 2, '#a66b3e');
    r(9, hy + 4, 23, 2, '#947039'); r(10, hy + 3, 21, 2, '#e6c071');
  } else if (p.hat === 'bucket') {
    r(13, hy - 1, 13, 7, '#597577'); r(14, hy - 2, 11, 6, '#96b2a2');
    r(11, hy + 4, 18, 2, '#476468'); r(12, hy + 3, 17, 2, '#bed1ad');
    if (!back) { r(side ? 23 : 16, hy + 12, side ? 3 : 8, 2, p.hair); }
  } else if (p.hat === 'cap') {
    r(13, hy - 1, 13, 5, '#475e4d'); r(14, hy - 2, 11, 5, '#849772');
    r(side ? (sign > 0 ? 23 : 9) : 14, hy + 3, side ? 8 : 12, 2, '#adb991');
    r(18, y, 5, 2, '#d99950');
  } else if (p.hat === 'bun') {
    oval(back ? 16 : side ? (sign > 0 ? 12 : 23) : 14, hy - 4, 8, 7, p.hair);
    r(back ? 17 : side ? (sign > 0 ? 12 : 23) : 14, hy, 6, 2, '#e2bd72');
    r(14, hy + 2, 8, 2, '#925637');
  } else {
    r(14, hy + 1, 11, 3, '#ead397'); r(side && sign < 0 ? 24 : 13, hy + 4, 3, 13, p.hair);
    if (back) { r(14, hy + 6, 12, 11, p.hair); r(15, hy + 8, 2, 9, '#efd597'); }
  }
  if (action) {
    if (type === 'gardener') {
      r(28, 23, 7, 6, '#5e929d'); r(29, 23, 4, 2, '#b2d4c0');
      line(34, 24, 37, 22, '#7cb7c1', 2);
      r(36, 27 + frame * 2, 1, 2, '#bde4df'); r(38, 30 + frame, 1, 2, '#bde4df');
    } else if (type === 'angler') {
      line(27, 27, 36, 9 + frame, '#735335'); line(36, 9 + frame, 38, 29, '#e4d8a8');
      r(37, 30 + frame, 2, 2, '#c45747');
    } else if (type === 'keeper') {
      r(12, 26, 6, 5, '#bfa06a'); r(13, 25, 4, 2, '#e5c189');
      r(29 + frame * 2, 29, 1, 1, '#efce83'); r(32, 32 + frame, 1, 1, '#efce83');
    } else if (type === 'farmer') {
      r(22, 24 + frame, 8, 5, '#5e7258'); r(23, 24 + frame, 6, 3, '#eedca4');
      r(24, 25 + frame, 3, 1, '#a5996d');
    } else {
      line(27, 22, 29 + frame, 15 - frame, p.shirt, 3);
      r(29 + frame, 12 - frame, 3, 4, p.skin);
    }
  }
  return canvas;
}

export function residentPieces() {
  return RESIDENT_TYPES.flatMap(type => ART_BY_ID[type].frames.map(key => {
    const parts = key.split('-'), action = parts[1] === 'action';
    const direction = action ? 'down' : parts[1], mode = action ? 'action' : parts[2];
    const canvas = drawResident(type, direction, mode, Number(parts.at(-1)));
    return { piece: { key, file: 'draw-residents.mjs', box: [0, 0, 40, 40] }, canvas, x: 0, y: 0, w: 40, h: 40,
      native: true, pivot: [20, 38], sourceHeight: 40 };
  }));
}
