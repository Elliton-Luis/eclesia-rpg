import { TILE } from './constants.js';
import { REGIONS } from './regions.js';

export function upgradeCost(tier) { return Math.round(35 * Math.pow(tier, 1.7) + 35); }
export function weaponDamage(w) { return w.base + w.tier * 3; }

export function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
export function lerp(a, b, t) { return a + (b - a) * t; }
export function rand(a, b) { return a + Math.random() * (b - a); }
export function randint(a, b) { return Math.floor(rand(a, b + 1)); }
export function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
export function rectOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
export function circleRect(c, r, rc) {
  const cx = Math.max(rc.x, Math.min(c.x, rc.x + rc.w));
  const cy = Math.max(rc.y, Math.min(c.y, rc.y + rc.h));
  return Math.hypot(c.x - cx, c.y - cy) < r;
}

export function randArr(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// Perigo da região que contém a posição (pixels); default 1 para áreas selvagens.
export function dangerAt(g, x, y) {
  let best = null;
  for (const r of REGIONS) {
    if (x >= r.x * TILE && x < (r.x + r.w) * TILE && y >= r.y * TILE && y < (r.y + r.h) * TILE) {
      if (!best || r.priority > best.priority) best = r;
    }
  }
  return best ? best.danger : 1;
}

// Estatística de recompensa usada pelo kill: ouro/min share escalam com o tier do monstro + perigo da região
export function dangerLoot(danger) {
  return {
    goldMult: 1 + (danger - 1) * 0.35,
    heartChance: clamp(0.1 + (danger - 1) * 0.06, 0.1, 0.4),
    powerChance: danger >= 3 ? (danger - 2) * 0.06 : 0,
    potChance: danger >= 3 ? 0.08 + (danger - 3) * 0.02 : 0
  };
}