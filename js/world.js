function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// Sólidos: blocos que impedem passagem
const SOLIDS = new Set(['t', 'r', 'w', 'h', 'v', 'q', 'l', 'k', 'o', 'T']);

// Chars sobre os quais pode nascer spawn (permitem andar)
const WALK_SPAWN = new Set(['g', 'p', 'y', 'c', 'f', 'z', 'b', 'x', 's', 'd']);

const WILD_MONSTERS = [['slime', 3], ['rato', 2], ['wolf', 1], ['bat', 1]];

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

class World {
  constructor() {
    this.cols = WORLD_W;
    this.rows = WORLD_H;
    this.chunks = new Map();
    this.destroyedKeys = new Set();
    this.gates = []; // mantido por compatibilidade; selos (NPCs) substituem os portões
  }

  chunkKey(cx, cy) { return cx + '_' + cy; }
  chunkSize() { return CHUNK; }

  // região com maior prioridade que cobre o tile
  regionAt(gx, gy) {
    let best = null;
    for (const r of REGIONS) {
      if (gx >= r.x && gx < r.x + r.w && gy >= r.y && gy < r.y + r.h) {
        if (!best || r.priority > best.priority) best = r;
      }
    }
    return best;
  }

  regionOfChunk(cx, cy) {
    return this.regionAt(cx * CHUNK, cy * CHUNK);
  }

  // char determinístico para um tile global
  charFor(gx, gy) {
    // borda do mundo -> rochas
    if (gx <= 0 || gx >= WORLD_W - 1 || gy <= 3 || gy >= WORLD_H - 3) return 'r';
    const r = this.regionAt(gx, gy);
    if (!r) return this.wildChar(gx, gy);
    const p = (hash2(gx, gy) >>> 0) % 1000 / 1000;
    const d = r.decor;
    const len = r.w, edgy = gx === r.x || gx === r.x + r.w - 1 || gy === r.y || gy === r.y + r.h - 1;

    if (d === 'town') return this.townChar(gx, gy);
    if (d === 'cave' || d === 'arcano') {
      if (edgy) return 'v';
      if (d === 'cave') {
        if (p < 0.05) return 'r';
        return 'c';
      }
      if (p < 0.15) return 'x';
      return p < 0.55 ? 'f' : 'c';
    }
    if (d === 'hell') {
      if (edgy) return 'v';
      if (p < 0.16) return 'l';
      if (p < 0.22) return 'r';
      return 'c';
    }
    if (d === 'fort') {
      if (edgy) return 'v';
      if (p < 0.2) return 'h';
      if (p < 0.42) return 'z';
      if (p < 0.5) return 'g';
      return 'g';
    }
    if (d === 'swamp') {
      if (p < 0.26) return 'q';
      if (p < 0.5) return 's';
      if (p < 0.54) return 't';
      return 'g';
    }
    if (d === 'rocky') {
      if (p < 0.55) return 'r';
      if (p < 0.58) return 't';
      return 'g';
    }
    if (d === 'cemetery') {
      if (p < 0.06) return 'b';
      if (p < 0.1) return 't';
      if (p < 0.13) return 'r';
      return 'g';
    }
    if (d === 'ruins') {
      if (p < 0.28) return 'x';
      if (p < 0.72) return 'f';
      return 'g';
    }
    if (d === 'fields') {
      if (p < 0.55 && ((gx + len) & 1) === 0) return 'y';
      if (p < 0.62) return 'g';
      if (p < 0.66) return 't';
      return 'g';
    }
    if (d === 'forest') {
      const leafClear = this.destroyedKeys.has(gx + ',' + gy);
      if (p < 0.4 && !leafClear) return 't';
      if (p < 0.45) return 'r';
      return 'g';
    }
    // grass / others
    if (p < 0.07) return 't';
    if (p < 0.1) return 'r';
    return 'g';
  }

  wildChar(gx, gy) {
    const p = (hash2(gx, gy) >>> 0) % 1000 / 1000;
    if (p < 0.18) return 't';
    if (p < 0.21) return 'r';
    return 'g';
  }

  // layout fixo da Vila de Pedra
  townChar(gx, gy) {
    // praça central + ruas de pedra (a igreja ocupa o centro da praça)
    const inPlaza =
      (gx >= 112 && gx <= 123 && gy >= 115 && gy <= 124) ||
      (gx >= 113 && gx <= 122 && gy >= 128 && gy <= 130) ||
      (gx >= 108 && gx <= 112 && gy >= 129 && gy <= 130) ||
      (gx >= 123 && gx <= 129 && gy >= 129 && gy <= 130) ||
      (gx >= 107 && gx <= 109 && gy >= 113 && gy <= 133) ||
      (gx >= 130 && gx <= 132 && gy >= 109 && gy <= 134);
    if (inPlaza) return 'p';

    const house = h => {
      const r = h;
      const inside = gx >= r[0] && gx < r[0] + r[2] && gy >= r[1] && gy < r[1] + r[3];
      if (!inside) return '';
      const core = gx > r[0] && gx < r[0] + r[2] - 1 && gy > r[1] && gy < r[1] + r[3] - 1;
      if (gy === r[1] + r[3] - 1 && gx === Math.floor(r[0] + r[2] / 2) && r[5] !== 'none') return 'd';
      if (core) return r[4] || 'f';
      if (r[5] === 'center') return r[4] || 'h';
      return 'h';
    };

    let c = '';
    // igreja
    c = house([105, 108, 7, 5, 'f', 'none']);
    if (c) return c;
    c = house([106, 108, 6, 5, 'f', 'none']);
    if (c) return c;
    // cruzeiro no altar da igreja
    if (gx === 108 && gy === 109) return 'k';
    // taverna
    c = house([124, 110, 5, 4, 'f', 'none']);
    if (c) return c;
    if (gx === 126 && gy === 111) return 'o';
    // torre do erudito
    c = house([121, 132, 4, 4, 'f', 'none']);
    if (c) return c;
    if (gx === 123 && gy === 133) return 'T';
    // casas do mercado
    c = house([106, 128, 4, 4]);
    if (c) return c;
    c = house([111, 128, 4, 4]);
    if (c) return c;
    c = house([116, 128, 4, 4]);
    if (c) return c;
    // casas residenciais
    c = house([104, 116, 3, 4]);
    if (c) return c;
    c = house([128, 116, 3, 4]);
    if (c) return c;
    c = house([128, 121, 3, 4]);
    if (c) return c;
    c = house([104, 135, 3, 4]);
    if (c) return c;
    c = house([127, 135, 3, 4]);
    if (c) return c;
    // varredura base
    const p2 = (hash2(gx, gy) >>> 0) % 1000 / 1000;
    if (p2 < 0.04) return 't';
    if (p2 < 0.06) return 'r';
    return 'g';
  }

  genChunk(cx, cy) {
    const tiles = [];
    const o = cx * CHUNK, ot = cy * CHUNK;
    const region = this.regionOfChunk(cx, cy);
    for (let ly = 0; ly < CHUNK; ly++) {
      tiles.push([]);
      for (let lx = 0; lx < CHUNK; lx++) {
        tiles[ly].push(this.charFor(o + lx, ot + ly));
      }
    }
    return { cx, cy, tiles, region: region ? region.id : null, spawns: this.genSpawns(cx, cy) };
  }

  genSpawns(cx, cy) {
    const o = cx * CHUNK, ot = cy * CHUNK;
    const reg = this.regionOfChunk(cx, cy);
    const defs = [];
    const density = reg ? reg.density : 1;
    const n = density + ((hash2(cx, cy) >>> 0) % 2);
    const rnd = mulberry32(hash2(cx * 91, cy * 17));
    const table = reg && reg.monsters.length ? reg.monsters : WILD_MONSTERS;

    // escolhe pontos de spawn em tiles caminháveis
    const candidates = [];
    for (let ly = 0; ly < CHUNK; ly++) {
      for (let lx = 0; lx < CHUNK; lx++) {
        const gx = o + lx, gy = ot + ly;
        if (WALK_SPAWN.has(this.charFor(gx, gy))) candidates.push([gx, gy]);
      }
    }
    const popPoints = [];
    for (let k = 0; k < n && candidates.length; k++) {
      const idx = Math.floor(rnd() * candidates.length);
      const [gx, gy] = candidates[idx];
      candidates.splice(idx, 1);
      popPoints.push([gx, gy]);
    }
    for (const [gx, gy] of popPoints) {
      defs.push({
        kind: weightedPick(table, hash2(gx * 13, gy * 29)),
        x: (gx + 0.5) * TILE, y: (gy + 0.5) * TILE,
        monster: null, cool: Math.random() * 4, bossRoom: false
      });
    }
    // monstro raro em regiões perigosas
    if (reg && reg.rares && reg.rares.length && reg.danger >= 3) {
      const chance = reg.danger >= 4 ? 26 : 12;
      if ((hash2(cx, cy) >>> 0) % 100 < chance && popPoints.length) {
        const [gx, gy] = popPoints[0];
        defs.push({
          kind: reg.rares[Math.floor(((hash2(cx * 3, cy * 7)) >>> 0) % reg.rares.length)],
          x: (gx + 0.5) * TILE, y: (gy + 0.5) * TILE,
          monster: null, cool: Math.random() * 6, bossRoom: false, rare: true
        });
      }
    }
    // chefe da região
    if (reg && reg.boss) {
      const bx = reg.boss.x, by = reg.boss.y;
      if (bx >= o && bx < o + CHUNK && by >= ot && by < ot + CHUNK) {
        defs.push({
          kind: reg.boss.kind,
          x: (bx + 0.5) * TILE, y: (by + 0.5) * TILE,
          monster: null, cool: 0, bossRoom: true
        });
      }
    }
    return defs;
  }

  getChunk(cx, cy) {
    const key = this.chunkKey(cx, cy);
    let ch = this.chunks.get(key);
    if (!ch) {
      ch = this.genChunk(cx, cy);
      this.chunks.set(key, ch);
    }
    return ch;
  }

  tileAt(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= this.cols || ty >= this.rows) return 'r';
    const ch = this.getChunk(Math.floor(tx / CHUNK), Math.floor(ty / CHUNK));
    return ch.tiles[ty % CHUNK][tx % CHUNK];
  }

  setTile(tx, ty, c) {
    if (tx < 0 || ty < 0 || tx >= this.cols || ty >= this.rows) return;
    const ch = this.getChunk(Math.floor(tx / CHUNK), Math.floor(ty / CHUNK));
    ch.tiles[ty % CHUNK][tx % CHUNK] = c;
  }

  isSolid(tx, ty) {
    return SOLIDS.has(this.tileAt(tx, ty));
  }

  solidPixel(x, y) {
    return this.isSolid(Math.floor(x / TILE), Math.floor(y / TILE));
  }

  solidBox(b) {
    const x0 = Math.floor(b.x / TILE), x1 = Math.floor((b.x + b.w - 1) / TILE);
    const y0 = Math.floor(b.y / TILE), y1 = Math.floor((b.y + b.h - 1) / TILE);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        if (this.isSolid(tx, ty)) return true;
      }
    }
    return false;
  }

  gateBox() { return null; }

  move(e, dx, dy) {
    const b = e.box();
    if (!this.solidBox({ x: b.x + dx, y: b.y, w: b.w, h: b.h }) && !this.gateBox()) e.x += dx;
    if (!this.solidBox({ x: e.x - b.w / 2, y: b.y + dy, w: b.w, h: b.h }) && !this.gateBox()) e.y += dy;
  }

  destroyTrees(cx, cy, r) {
    const x0 = Math.floor((cx - r) / TILE), x1 = Math.floor((cx + r) / TILE);
    const y0 = Math.floor((cy - r) / TILE), y1 = Math.floor((cy + r) / TILE);
    for (let ty = Math.max(0, y0); ty <= Math.min(this.rows - 1, y1); ty++) {
      for (let tx = Math.max(0, x0); tx <= Math.min(this.cols - 1, x1); tx++) {
        const gx = tx, gy = ty;
        if (Math.hypot((tx + 0.5) * TILE - cx, (ty + 0.5) * TILE - cy) <= r) {
          if (this.tileAt(tx, ty) === 't') {
            this.setTile(tx, ty, 'g');
            this.destroyedKeys.add(gx + ',' + gy);
          }
        }
      }
    }
  }

  // carrega/descarrega chunks ao redor do jogador (apenas dados importantes persistem)
  updateChunks(cam, player) {
    const ccx = Math.floor((cam.x + cam.w / 2) / (CHUNK * TILE));
    const ccy = Math.floor((cam.y + cam.h / 2) / (CHUNK * TILE));
    const R = 2;
    const keep = new Set();
    for (let dx = -R; dx <= R; dx++) {
      for (let dy = -R; dy <= R; dy++) {
        const cx = ccx + dx, cy = ccy + dy;
        if (cx < 0 || cy < 0 || cx >= Math.ceil(this.cols / CHUNK) || cy >= Math.ceil(this.rows / CHUNK)) continue;
        keep.add(this.chunkKey(cx, cy));
        this.getChunk(cx, cy);
      }
    }
    for (const [key, ch] of this.chunks) {
      if (keep.has(key)) continue;
      const ddx = ch.cx - ccx, ddy = ch.cy - ccy;
      if (Math.hypot(ddx, ddy) > R + 1.6) this.unloadChunk(ch);
    }
  }

  unloadChunk(ch) {
    // remove monstros comuns do chunk (ressurgirão ao voltar); chefes persistem via g
    for (const d of ch.spawns) {
      if (d.monster && !d.monster.dead) {
        if (d.bossRoom) { d.monster = null; continue; }
        d.monster.dead = true;
        d.monster = null;
      } else if (d.monster && d.monster.dead) {
        d.monster = null;
      }
    }
    this.chunks.delete(this.chunkKey(ch.cx, ch.cy));
  }

  spawnPointUpdate(d, dt, g) {
    const p = g.player;
    if (d.monster) {
      if (d.monster.dead) {
        d.cool = d.bossRoom ? 999 : 6 + Math.random() * 6;
        if (d.bossRoom && d.monster.def && d.monster.def.crystal && d.monster.def.finalBoss) d.cool = 999;
        d.monster = null;
      }
      return;
    }
    if (d.cool > 0) { d.cool -= dt; return; }
    const dd = Math.hypot(d.x - p.x, d.y - p.y);
    if (dd > 1500) return;
    if (dd < 210) { d.cool = 1 + Math.random() * 1.5; return; } // nunca nasce em cima do jogador

    let m;
    const def = MONSTERS[d.kind];
    if (!def) { d.cool = 999; return; }
    // chefe definitivo: só revive de novo se o final ainda não ocorreu
    if (d.bossRoom && def.finalBoss && g.ending) { d.cool = 999; return; }
    if (d.bossRoom) {
      const crystal = def.crystal;
      if (crystal && g.crystals[crystal]) { d.cool = 999; return; }
      m = new Monster(def, d.x, d.y, g, true);
      g.bossesActive.push(m);
    } else {
      m = new Monster(def, d.x, d.y, g);
    }
    if (g.world.solidBox(m.box())) {
      let placed = false;
      for (let r = 1; r <= 4 && !placed; r++) {
        for (let dy = -r; dy <= r && !placed; dy++) {
          for (let dx = -r; dx <= r && !placed; dx++) {
            const nx = d.x + dx * TILE, ny = d.y + dy * TILE;
            const b = { x: nx - m.w / 2, y: ny - m.h / 2, w: m.w, h: m.h };
            if (!g.world.solidBox(b)) { m.x = nx; m.y = ny; placed = true; }
          }
        }
      }
    }
    d.monster = m;
    g.monsters.push(m);
  }

  update(dt, g) {
    this.updateChunks(g.cam, g.player);
    const p = g.player;
    const px = p.x, py = p.y;
    for (const ch of this.chunks.values()) {
      const cx0 = ch.cx * CHUNK * TILE, cy0 = ch.cy * CHUNK * TILE;
      const cx1 = cx0 + CHUNK * TILE, cy1 = cy0 + CHUNK * TILE;
      if (px < cx0 - 1600 || px > cx1 + 1600 || py < cy0 - 1600 || py > cy1 + 1600) continue;
      if (ch.region === 'vila') continue;
      for (const d of ch.spawns) this.spawnPointUpdate(d, dt, g);
    }
  }

  resetSpawns() {
    for (const ch of this.chunks.values()) {
      for (const d of ch.spawns) { d.monster = null; d.cool = 0; }
    }
  }

  drawTile(ctx, tx, ty, c, t) {
    const x = tx * TILE, y = ty * TILE;
    ctx.fillStyle = '#5a8f4a';
    ctx.fillRect(x, y, TILE, TILE);
    switch (c) {
      case 'g':
        if ((tx * 13 + ty * 7) % 5 === 0) {
          ctx.fillStyle = '#4a7c3c';
          ctx.fillRect(x + 6, y + 8, 4, 4);
          ctx.fillRect(x + 20, y + 20, 3, 3);
        }
        break;
      case 'y':
        ctx.fillStyle = '#c9b84b';
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = '#a89a34';
        for (let i = 0; i < 3; i++) {
          ctx.fillRect(x + 4, y + 6 + i * 9, 24, 2);
          ctx.fillRect(x + 8, y + 10 + i * 9, 16, 1);
        }
        break;
      case 'p':
        ctx.fillStyle = '#c9b37a';
        ctx.fillRect(x, y, TILE, TILE);
        if ((tx + ty) % 2 === 0) {
          ctx.fillStyle = 'rgba(255,255,255,0.06)';
          ctx.fillRect(x, y, TILE, TILE);
        }
        break;
      case 'z':
        ctx.fillStyle = ((tx + ty) & 1) ? '#8f939b' : '#84888f';
        ctx.fillRect(x, y, TILE, TILE);
        break;
      case 't':
        ctx.fillStyle = '#7a5230';
        ctx.fillRect(x + 13, y + 20, 6, 12);
        ctx.fillStyle = '#3f7a2e';
        ctx.beginPath();
        ctx.arc(x + 16, y + 13, 13, 0, 6.283);
        ctx.fill();
        ctx.fillStyle = '#4d8f3a';
        ctx.beginPath();
        ctx.arc(x + 11, y + 10, 6, 0, 6.283);
        ctx.fill();
        break;
      case 'r':
        ctx.fillStyle = '#6f6f6f';
        ctx.beginPath();
        ctx.moveTo(x + 3, y + TILE);
        ctx.lineTo(x + 8, y + 8);
        ctx.lineTo(x + 20, y + 3);
        ctx.lineTo(x + 28, y + 18);
        ctx.lineTo(x + 25, y + TILE);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#9a9a9a';
        ctx.beginPath();
        ctx.moveTo(x + 8, y + 8);
        ctx.lineTo(x + 20, y + 3);
        ctx.lineTo(x + 22, y + 14);
        ctx.lineTo(x + 12, y + 16);
        ctx.closePath();
        ctx.fill();
        break;
      case 's':
        ctx.fillStyle = '#5a4b3a';
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = '#6f5a42';
        ctx.beginPath();
        ctx.ellipse(x + 16, y + 16, 8, 5, 0, 0, 6.283);
        ctx.fill();
        break;
      case 'q':
        ctx.fillStyle = '#3a5f4a';
        ctx.fillRect(x, y, TILE, TILE);
        ctx.strokeStyle = 'rgba(90,150,110,0.5)';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 2; i++) {
          const yy = y + 10 + i * 14 + Math.sin(t * 2 + tx * 0.7 + i) * 2;
          ctx.beginPath();
          ctx.arc(x + 16, yy, 9, 0, 6.283);
          ctx.stroke();
        }
        break;
      case 'w':
        ctx.fillStyle = '#3a6fa8';
        ctx.fillRect(x, y, TILE, TILE);
        ctx.strokeStyle = 'rgba(159,208,255,0.45)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 2; i++) {
          const yy = y + 10 + i * 14 + Math.sin(t * 2 + tx * 0.8 + i * 2) * 2;
          ctx.beginPath();
          ctx.moveTo(x + 2, yy);
          ctx.lineTo(x + TILE - 2, yy);
          ctx.stroke();
        }
        break;
      case 'l':
        ctx.fillStyle = '#c0392b';
        ctx.fillRect(x, y, TILE, TILE);
        const gl = 0.6 + Math.sin(t * 4 + tx * 0.6 + ty * 0.4) * 0.3;
        ctx.fillStyle = 'rgba(255,140,40,' + gl.toFixed(2) + ')';
        ctx.beginPath();
        ctx.arc(x + 16, y + 16, 9, 0, 6.283);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,220,120,' + (gl * 0.8).toFixed(2) + ')';
        ctx.beginPath();
        ctx.arc(x + 16, y + 16, 4, 0, 6.283);
        ctx.fill();
        break;
      case 'b':
        ctx.fillStyle = 'rgba(20,24,18,0.35)';
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = '#9a9a9a';
        ctx.fillRect(x + 9, y + 8, 14, 18);
        ctx.fillStyle = '#c8c8c8';
        ctx.fillRect(x + 11, y + 10, 10, 6);
        ctx.fillStyle = '#6a6a6a';
        ctx.fillRect(x + 15, y + 4, 2, 6);
        ctx.fillRect(x + 12, y + 7, 8, 2);
        break;
      case 'x':
        ctx.fillStyle = '#6a6058';
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = '#7a7068';
        ctx.beginPath();
        ctx.moveTo(x + 5, y + 24);
        ctx.lineTo(x + 8, y + 4);
        ctx.lineTo(x + 24, y + 7);
        ctx.lineTo(x + 20, y + 26);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#55504a';
        for (let i = 0; i < 3; i++) {
          ctx.fillRect(x + 8 + i * 5, y + 12, 3, 3);
        }
        break;
      case 'k':
        ctx.fillStyle = '#c8bda0';
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = '#4a4440';
        ctx.beginPath();
        ctx.moveTo(x - 2, y + 8);
        ctx.lineTo(x + 16, y - 4);
        ctx.lineTo(x + 34, y + 8);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ffd76a';
        ctx.fillRect(x + 15, y - 2, 3, 12);
        ctx.fillRect(x + 9, y + 2, 15, 3);
        break;
      case 'o':
        ctx.fillStyle = '#8a6a45';
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = '#5a4435';
        ctx.beginPath();
        ctx.moveTo(x - 2, y + 10);
        ctx.lineTo(x + 16, y - 3);
        ctx.lineTo(x + 34, y + 10);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#c9a050';
        ctx.fillRect(x + 20, y + 14, 8, 8);
        ctx.fillStyle = '#b5651d';
        ctx.fillRect(x + 22, y + 16, 4, 4);
        break;
      case 'T':
        ctx.fillStyle = '#6a5a4a';
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = '#9a8a7a';
        ctx.beginPath();
        ctx.arc(x + 16, y + 25, 11, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = '#4a6a8a';
        ctx.fillRect(x + 13, y + 5, 6, 22);
        ctx.fillStyle = '#7a9ac0';
        ctx.beginPath();
        ctx.arc(x + 16, y + 4, 4, 0, 6.283);
        ctx.fill();
        break;
      case 'h':
        ctx.fillStyle = '#a08a68';
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = '#6b4a2a';
        ctx.beginPath();
        ctx.moveTo(x - 2, y + 6);
        ctx.lineTo(x + 16, y - 6);
        ctx.lineTo(x + 34, y + 6);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ffd27f';
        ctx.fillRect(x + 12, y + 14, 8, 10);
        break;
      case 'c':
        ctx.fillStyle = '#3a3f4a';
        ctx.fillRect(x, y, TILE, TILE);
        if ((tx * 7 + ty * 13) % 11 === 0) {
          ctx.fillStyle = '#454b57';
          ctx.fillRect(x + 8, y + 8, 4, 4);
        }
        break;
      case 'v':
        ctx.fillStyle = '#2b2f38';
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = '#3a3f4a';
        ctx.fillRect(x, y, TILE, 4);
        break;
      case 'd':
        ctx.fillStyle = '#6b4a2a';
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = '#8a6a3a';
        ctx.fillRect(x + 6, y + 4, 20, 24);
        break;
      case 'f':
        ctx.fillStyle = '#7a6a52';
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = '#6a5a44';
        ctx.fillRect(x, y + 16, TILE, 2);
        break;
    }
  }

  draw(ctx, cam, t) {
    const tx0 = Math.max(0, Math.floor(cam.x / TILE) - 1);
    const tx1 = Math.min(this.cols - 1, Math.ceil((cam.x + cam.w) / TILE) + 1);
    const ty0 = Math.max(0, Math.floor(cam.y / TILE) - 1);
    const ty1 = Math.min(this.rows - 1, Math.ceil((cam.y + cam.h) / TILE) + 1);
    let lastCh = null;
    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        const cx = Math.floor(tx / CHUNK), cy = Math.floor(ty / CHUNK);
        if (!lastCh || lastCh.cx !== cx || lastCh.cy !== cy) {
          lastCh = this.getChunk(cx, cy);
        }
        this.drawTile(ctx, tx, ty, lastCh.tiles[ty % CHUNK][tx % CHUNK], t);
      }
    }
  }
}