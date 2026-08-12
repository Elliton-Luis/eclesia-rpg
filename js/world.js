function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const SOLIDS = new Set(['t', 'r', 'w', 'h', 'v']);

const ZONES = [
  { name: 'Rio', x: 0, y: 14, w: 109, h: 2 },
  { name: 'Prado Sereno', x: 2, y: 16, w: 17, h: 30 },
  { name: 'Vila de Pedra', x: 26, y: 17, w: 22, h: 16 },
  { name: 'Floresta dos Goblins', x: 49, y: 8, w: 27, h: 38 },
  { name: 'Catacumbas', x: 76, y: 26, w: 17, h: 21 },
  { name: 'Gruta do Execra', x: 96, y: 26, w: 13, h: 21 }
];

const NPC_DEFS = [
  { id: 'ferreiro', name: 'Ferreiro', kind: 'forge', x: 33, y: 19, color: '#b5651d', accent: '#ffb020' },
  { id: 'vendedor', name: 'Vendedor', kind: 'shop', x: 42, y: 19, color: '#2980b9', accent: '#7ec8e3' },
  { id: 'mestre', name: 'Mestre das Artes', kind: 'skills', x: 44, y: 26, color: '#8e44ad', accent: '#d8a1ff' },
  { id: 'guia', name: 'Cronista', kind: 'guide', x: 37, y: 26, color: '#27ae60', accent: '#a8e6a1',
    text: 'Olá, viajante! Derrote o Chefe Tribal na floresta para obter o Cristal da Floresta e abrir as Catacumbas. Lá, o Rei da Noite guarda o Cristal Sombrio. Com ele, você enfrentará o Titã do Execra na gruta proibida. Monstros têm fraquezas: amarelo = fraqueza, cinza = resistência. Boa sorte!' }
];

const SPAWNS = [
  {
    zone: 'Prado Sereno',
    defs: [
      { kind: 'slime', x: 7 * TILE, y: 40 * TILE }, { kind: 'slime', x: 12 * TILE, y: 42 * TILE },
      { kind: 'slime', x: 5 * TILE, y: 33 * TILE }, { kind: 'slime', x: 14 * TILE, y: 30 * TILE },
      { kind: 'bat', x: 17 * TILE, y: 26 * TILE }, { kind: 'wolf', x: 4 * TILE, y: 44 * TILE },
      { kind: 'bomber', x: 10 * TILE, y: 36 * TILE }
    ]
  },
  {
    zone: 'Floresta dos Goblins',
    defs: [
      { kind: 'goblin', x: 52 * TILE, y: 24 * TILE }, { kind: 'goblin', x: 55 * TILE, y: 30 * TILE },
      { kind: 'goblin', x: 59 * TILE, y: 34 * TILE }, { kind: 'goblin', x: 58 * TILE, y: 26 * TILE },
      { kind: 'archer', x: 53 * TILE, y: 18 * TILE }, { kind: 'archer', x: 64 * TILE, y: 22 * TILE },
      { kind: 'bat', x: 64 * TILE, y: 16 * TILE }, { kind: 'bat', x: 70 * TILE, y: 20 * TILE },
      { kind: 'bat', x: 66 * TILE, y: 40 * TILE }, { kind: 'bat', x: 74 * TILE, y: 32 * TILE },
      { kind: 'slime', x: 62 * TILE, y: 44 * TILE }, { kind: 'wolf', x: 68 * TILE, y: 10 * TILE },
      { kind: 'bomber', x: 56 * TILE, y: 40 * TILE }, { kind: 'bomber', x: 72 * TILE, y: 38 * TILE },
      { kind: 'krol_chefe', x: 62 * TILE, y: 30 * TILE, bossRoom: true }
    ]
  },
  {
    zone: 'Catacumbas',
    defs: [
      { kind: 'slime', x: 78 * TILE, y: 40 * TILE }, { kind: 'slime', x: 86 * TILE, y: 44 * TILE },
      { kind: 'skeleton', x: 82 * TILE, y: 34 * TILE }, { kind: 'skeleton', x: 89 * TILE, y: 42 * TILE },
      { kind: 'spider', x: 80 * TILE, y: 30 * TILE }, { kind: 'spider', x: 88 * TILE, y: 28 * TILE },
      { kind: 'wraith', x: 84 * TILE, y: 40 * TILE }, { kind: 'wraith', x: 76 * TILE, y: 34 * TILE },
      { kind: 'gere_osso', x: 84 * TILE, y: 34 * TILE, bossRoom: true }
    ]
  },
  {
    zone: 'Gruta do Execra',
    defs: [
      { kind: 'golem', x: 100 * TILE, y: 40 * TILE }, { kind: 'golem', x: 105 * TILE, y: 42 * TILE },
      { kind: 'shaman', x: 102 * TILE, y: 32 * TILE }, { kind: 'shaman', x: 104 * TILE, y: 44 * TILE },
      { kind: 'wraith', x: 106 * TILE, y: 30 * TILE }, { kind: 'bomber', x: 98 * TILE, y: 36 * TILE },
      { kind: 'titan', x: 103 * TILE, y: 36 * TILE, bossRoom: true }
    ]
  }
];

class World {
  constructor() {
    this.cols = 110;
    this.rows = 50;
    this.tiles = [];
    this.gates = GATES.map(g => Object.assign({}, g, { open: false }));
  }

  gateBox(b) {
    for (const g of this.gates) {
      if (g.open) continue;
      const gb = { x: g.x, y: g.y, w: g.w, h: g.h };
      if (rectOverlap(b, gb)) return g;
    }
    return null;
  }

  build() {
    const W = this.cols, H = this.rows;
    const rnd = mulberry32(20240811);
    const map = [];
    for (let y = 0; y < H; y++) {
      map.push([]);
      for (let x = 0; x < W; x++) map[y].push('g');
    }
    const rect = (x0, y0, x1, y1, c) => {
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        if (y >= 0 && y < H && x >= 0 && x < W) map[y][x] = c;
      }
    };

    rect(0, 0, W - 1, 3, 'r');
    rect(0, 14, W - 1, 15, 'w');
    rect(22, 14, 25, 15, 'p');
    rect(58, 14, 62, 15, 'p');

    rect(26, 22, 48, 30, 'z');
    rect(26, 30, 48, 33, 'h');

    rect(30, 17, 35, 21, 'h'); rect(31, 18, 34, 20, 'f'); map[21][32] = 'd';
    rect(39, 17, 44, 21, 'h'); rect(40, 18, 43, 20, 'f'); map[21][41] = 'd';

    rect(30, 10, 32, 14, 'h'); map[13][31] = 'd';
    rect(42, 10, 44, 14, 'h'); map[13][43] = 'd';

    for (let y = 8; y <= 45; y++) for (let x = 49; x <= 75; x++) {
      if (map[y][x] === 'g' && rnd() < 0.32) map[y][x] = 't';
    }
    rect(49, 18, 75, 34, 'g');

    for (let y = 12; y <= 46; y++) for (let x = 2; x <= 19; x++) {
      if (map[y][x] === 'g' && rnd() < 0.08) map[y][x] = 't';
    }
    for (let y = 16; y <= 45; y++) for (let x = 2; x <= 19; x++) {
      if (map[y][x] === 'g' && rnd() < 0.03) map[y][x] = 'r';
    }

    rect(76, 26, 92, 46, 'v'); rect(77, 27, 91, 45, 'c');
    map[29][76] = 'c'; map[30][76] = 'c'; map[31][76] = 'c';
    map[30][80] = 'r'; map[42][88] = 'r'; map[36][85] = 'r';

    rect(96, 26, 108, 46, 'v'); rect(97, 27, 107, 45, 'c');
    map[29][96] = 'c'; map[30][96] = 'c'; map[31][96] = 'c';
    map[30][103] = 'r'; map[42][100] = 'r';

    for (let y = 4; y <= 46; y++) for (let x = 20; x <= 48; x++) {
      if (map[y][x] === 'g' && rnd() < 0.02) map[y][x] = 'r';
    }

    this.tiles = map;
  }

  isSolid(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= this.cols || ty >= this.rows) return true;
    return SOLIDS.has(this.tiles[ty][tx]);
  }

  destroyTrees(cx, cy, r) {
    const x0 = Math.floor((cx - r) / TILE), x1 = Math.floor((cx + r) / TILE);
    const y0 = Math.floor((cy - r) / TILE), y1 = Math.floor((cy + r) / TILE);
    for (let ty = Math.max(0, y0); ty <= Math.min(this.rows - 1, y1); ty++) {
      for (let tx = Math.max(0, x0); tx <= Math.min(this.cols - 1, x1); tx++) {
        if (this.tiles[ty][tx] === 't' && Math.hypot((tx + 0.5) * TILE - cx, (ty + 0.5) * TILE - cy) <= r) {
          this.tiles[ty][tx] = 'g';
        }
      }
    }
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

  move(e, dx, dy) {
    const b = e.box();
    if (!this.solidBox({ x: b.x + dx, y: b.y, w: b.w, h: b.h }) && !this.gateBox({ x: b.x + dx, y: b.y, w: b.w, h: b.h })) e.x += dx;
    if (!this.solidBox({ x: e.x - b.w / 2, y: b.y + dy, w: b.w, h: b.h }) && !this.gateBox({ x: e.x - b.w / 2, y: b.y + dy, w: b.w, h: b.h })) e.y += dy;
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
    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        this.drawTile(ctx, tx, ty, this.tiles[ty][tx], t);
      }
    }
    for (const g of this.gates) {
      if (g.open) continue;
      if (g.x + g.w < cam.x || g.x > cam.x + cam.w || g.y + g.h < cam.y || g.y > cam.y + cam.h) continue;
      ctx.fillStyle = 'rgba(180,90,255,0.28)';
      ctx.fillRect(g.x, g.y, g.w, g.h);
      ctx.strokeStyle = '#b05cff';
      ctx.lineWidth = 2;
      ctx.strokeRect(g.x + 1, g.y + 1, g.w - 2, g.h - 2);
      const n = 4;
      for (let i = 0; i < n; i++) {
        const gy = g.y + (g.h * (i + 0.5)) / n;
        const ph = t * 3 + i;
        ctx.globalAlpha = 0.5 + Math.sin(ph * 2) * 0.3;
        ctx.strokeStyle = '#e0c0ff';
        ctx.beginPath();
        ctx.moveTo(g.x, gy - Math.sin(ph) * 4);
        ctx.lineTo(g.x + g.w, gy + Math.cos(ph) * 4);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.font = '700 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#f0e0ff';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.strokeText(g.name, g.x + g.w / 2, g.y + g.h / 2);
      ctx.fillText(g.name, g.x + g.w / 2, g.y + g.h / 2);
    }
  }
}

class Zone {
  constructor(data) {
    this.zoneName = data.zone;
    this.defs = data.defs.map(d => ({ kind: d.kind, x: d.x, y: d.y, monster: null, cool: 0, bossRoom: !!d.bossRoom }));
  }

  reset() {
    for (const d of this.defs) { d.monster = null; d.cool = 0; }
  }

  update(dt, g) {
    const p = g.player;
    const bossDefeated = g.defeatedBosses && g.defeatedBosses[this.zoneName];
    const spawnMultiplier = bossDefeated ? 0.15 : 1; // Drastically reduce spawns after boss defeat
    const spawnChance = bossDefeated ? 0.05 : 1; // Only 5% chance to spawn after boss defeat
    
    for (const d of this.defs) {
      if (d.monster) {
        if (d.monster.dead) { d.cool = d.kind === 'krol_chefe' || d.kind === 'gere_osso' || d.kind === 'titan' ? 999 : 6; d.monster = null; }
        continue;
      }
      if (d.cool > 0) { d.cool -= dt; continue; }
      if (Math.hypot(d.x - p.x, d.y - p.y) < 1400) {
        // Skip spawning regular monsters if boss is defeated (low chance)
        if (bossDefeated && !d.bossRoom && Math.random() > spawnChance) {
          d.cool = 30 + Math.random() * 60; // Long cooldown
          continue;
        }
        
        let m = null;
        if (d.bossRoom) {
          const crystal = MONSTERS[d.kind].crystal;
          if (g.crystals && g.crystals[crystal]) { d.cool = 999; continue; }
          m = new Monster(MONSTERS[d.kind], d.x, d.y, g, true);
          g.bossesActive.push(m);
        } else {
          m = new Monster(MONSTERS[d.kind], d.x, d.y, g);
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
        
        // Increase cooldown significantly after boss defeat
        if (bossDefeated && !d.bossRoom) {
          d.cool = (6 + Math.random() * 10) * (1 / spawnMultiplier);
        }
      }
    }
  }
}
