export function contains(rect, x, y, pad = 0) {
  return x >= rect.x - pad && x <= rect.x + rect.w + pad
    && y >= rect.y - pad && y <= rect.y + rect.h + pad;
}
