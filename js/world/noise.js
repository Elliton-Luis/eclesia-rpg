import { WORLD_SEED } from '../data/constants.js';

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const hash2 = (a, b) => {
  let v = (a * 928371 + b * 123457 + WORLD_SEED * 7919) >>> 0;
  v ^= v >>> 13;
  v = (v * 1274126177) | 0;
  return v ^ (v >>> 16);
};

function weightedPick(tbl, h) {
  let sum = 0;
  for (const e of tbl) sum += e[1];
  let r = (h >>> 0) % sum;
  for (const e of tbl) {
    if (r < e[1]) return e[0];
    r -= e[1];
  }
  return tbl[0][0];
}

export { mulberry32, hash2, weightedPick };
