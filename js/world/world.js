import { TILE, CHUNK, WORLD_W, WORLD_H, WORLD_SEED } from '../data/constants.js';
import { REGIONS } from '../data/regions.js';
import { MONSTERS, BOSS_LEVEL_REQ } from '../data/monsters.js';
import { Monster } from '../entities/monster.js';
import { mulberry32, hash2, weightedPick } from './noise.js';
import { SOLIDS, SHRINK, SHRINK_INSET, WALK_SPAWN, WILD_MONSTERS } from './tiles.js';

export class World {
  constructor() {
    this.cols = WORLD_W;
    this.rows = WORLD_H;
    this.chunks = new Map();
    this.destroyedKeys = new Set();
    this.gates = []; // mantido por compatibilidade; selos (NPCs) substituem os portões
    // Tiles de parede abertos por selos quebrados (entradas de chefes). Persistem
    // mesmo quando o chunk é descarregado/regenerado.
    this.openTiles = new Set();
    // Tiles garantidamente caminháveis ao redor de cada chefe (clareira + corredor),
    // para que todo chefe seja sempre alcançável.
    this.access = new Map();
    this.buildAccess();
    this.buildPaths();
    this.buildRegionGrid();
  }

  // Grid determinístico do bioma de cada tile. Como os chunks podem cruzar
  // bordas de regiões, o desenho consulta o tile exato (não o chunk) para
  // tintar pedras, árvores e pisos com o ambiente correto — ex.: sem fundo
  // verde em pedras dentro das masmorras.
  buildRegionGrid() {
    this.regionGrid = new Array(WORLD_W * WORLD_H);
    for (let gy = 0; gy < WORLD_H; gy++) {
      for (let gx = 0; gx < WORLD_W; gx++) {
        const r = this.regionAt(gx, gy);
        this.regionGrid[gy * WORLD_W + gx] = r ? r.id : '';
      }
    }
  }

  // --- Caminhos naturais ---
  // Trilhas de terra determinísticas que cruzam o mundo, conduzindo a regiões,
  // portões, selos ou simplesmente sumindo no mato. Sempre orgânicas: curvas,
  // largura irregular e desvios; nunca linhas retas nem corredores guiados.
  buildPaths() {
    this.pathTiles = new Set();
    // Rotas principais: saem dos arredores da vila em direção a regiões/pontos
    // importantes (portões, selos, vilarejos) e se perdem naturalmente no destino.
    const routes = [
      [104, 121, 54, 118],       // vila -> campos de trigo
      [104, 108, 62, 34],        // vila -> selo das catacumbas
      [116, 107, 168, 28],       // vila -> campo do norte
      [132, 107, 170, 56],       // vila -> bosque sagrado
      [134, 121, 202, 70],       // vila -> pântano
      [134, 128, 238, 166],      // vila -> colinas (longa trilha que serpenteia)
      [132, 135, 160, 142],      // vila -> ruínas de Aurelia
      [120, 144, 170, 196],      // vila -> várzea sul
      [107, 143, 50, 178],       // vila -> cemitério
      [120, 108, 72, 58]         // vila -> floresta dos goblins (trilha que some no mato)
    ];
    for (let i = 0; i < routes.length; i++) {
      const r = routes[i];
      // rotas alternadas serpenteiam mais; trilhas principais quase retas
      const wobble = i % 3 === 0 ? 0.55 : 0.3;
      this.walkRoute(r[0], r[1], r[2], r[3], mulberry32(WORLD_SEED * 131 + i * 9931), wobble, 700);
    }
    // Trilhas perdidas: começam perto das rotas e acabam sem destino, como
    // caminhos abandonados ou atalhos que o mundo esqueceu.
    const stubs = [
      [152, 32, 90, 0.5], [192, 122, 70, 0.6], [232, 92, 110, 0.6],
      [92, 92, 80, 0.5], [142, 152, 60, 0.5], [42, 142, 100, 0.7],
      [177, 182, 70, 0.5], [217, 42, 80, 0.6], [252, 40, 60, 0.5]
    ];
    for (let i = 0; i < stubs.length; i++) {
      const s = stubs[i];
      this.walkStub(s[0], s[1], s[2], mulberry32(WORLD_SEED * 283 + i * 1753), s[3]);
    }
  }

  // Caminha de (ax, ay) até (bx, by) com viradas suaves e ruído orgânico,
  // marcando os tiles da trilha. Nunca uma linha reta.
  walkRoute(ax, ay, bx, by, rnd, wobble, maxSteps) {
    let x = ax, y = ay;
    let cur = Math.atan2(by - ay, bx - ax);
    const maxTurn = 0.14 + wobble * 0.3;
    let steps = 0;
    const mark = (gx, gy) => {
      if (gx < 4 || gx >= WORLD_W - 4 || gy < 4 || gy >= WORLD_H - 4) return;
      this.pathTiles.add(gx + ',' + gy);
      // alguns trechos mais largos (trilha "batida"), sem simetria
      if (rnd() < 0.14) {
        const ox = Math.round(rnd() * 2 - 1), oy = Math.round(rnd() * 2 - 1);
        this.pathTiles.add((gx + ox) + ',' + (gy + oy));
      }
    };
    while (steps < maxSteps && Math.hypot(bx - x, by - y) > 1.5) {
      steps++;
      const want = Math.atan2(by - y, bx - x);
      let diff = want - cur;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      cur += Math.max(-maxTurn, Math.min(maxTurn, diff));
      cur += (rnd() - 0.5) * wobble * 1.4;
      x += Math.cos(cur);
      y += Math.sin(cur);
      mark(Math.round(x), Math.round(y));
    }
  }

  // Trilha curta sem destino: vagueia por alguns passos e simplesmente termina.
  walkStub(ax, ay, len, rnd, wobble) {
    let x = ax, y = ay;
    let cur = Math.atan2((rnd() - 0.5) * 2, (rnd() - 0.5) * 2);
    for (let s = 0; s < len; s++) {
      cur += (rnd() - 0.5) * wobble;
      x += Math.cos(cur);
      y += Math.sin(cur);
      if (x >= 4 && x < WORLD_W - 4 && y >= 4 && y < WORLD_H - 4) {
        this.pathTiles.add(Math.round(x) + ',' + Math.round(y));
      }
    }
  }

  // Só pode virar trilha o que for terreno natural caminhável (capim, plantação
  // ou vegetação que a trilha "limpa" ao passar). Nunca paredes, piso de masmorra
  // ou estrutura.
  canBePath(c) {
    return c === 'g' || c === 'y' || c === 't' || c === 'r';
  }

  // Garante área de luta e acesso a todos os chefes: uma clareira ao redor do chefe
  // e um corredor de 3 tiles do chefe até o ponto de acesso (entrada ou borda da região).
  buildAccess() {
    for (const r of REGIONS) {
      if (!r.boss) continue;
      const bx = r.boss.x, by = r.boss.y;
      const floor = r.decor === 'fort' ? 'z' : (r.decor === 'forest' ? 'g' : 'c');
      const add = (gx, gy) => {
        if (gx < r.x || gx >= r.x + r.w || gy < r.y || gy >= r.y + r.h) return;
        if (!this.access.has(gx + ',' + gy)) this.access.set(gx + ',' + gy, floor);
      };
      // clareira ao redor do chefe
      for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) add(bx + dx, by + dy);
      // corredor até o ponto de acesso
      if (r.boss.access) {
        const ax = r.boss.access.x, ay = r.boss.access.y;
        const dx = Math.sign(ax - bx), dy = Math.sign(ay - by);
        if (dx !== 0 && dy === 0) {
          const x0 = Math.min(bx, ax), x1 = Math.max(bx, ax);
          for (let gx = x0; gx <= x1; gx++) { add(gx, by - 1); add(gx, by); add(gx, by + 1); }
        } else if (dx === 0 && dy !== 0) {
          const y0 = Math.min(by, ay), y1 = Math.max(by, ay);
          for (let gy = y0; gy <= y1; gy++) { add(bx - 1, gy); add(bx, gy); add(bx + 1, gy); }
        } else {
          const x0 = Math.min(bx, ax), x1 = Math.max(bx, ax);
          const y0 = Math.min(by, ay), y1 = Math.max(by, ay);
          for (let gx = x0; gx <= x1; gx++) for (let gy = y0; gy <= y1; gy++) add(gx, gy);
        }
      }
    }
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
    // entrada aberta por selo quebrado -> passagem
    if (this.openTiles.has(gx + ',' + gy)) return 'c';
    // área garantida de acesso a chefe -> piso caminhável
    const acc = this.access.get(gx + ',' + gy);
    if (acc) return acc;
    const r = this.regionAt(gx, gy);
    let c;
    if (!r) c = this.wildChar(gx, gy);
    else if (r.decor === 'town') c = this.townChar(gx, gy);
    else c = this.regionChar(gx, gy, r);
    // caminhos naturais atravessam o campo (nunca dentro da vila nem masmorras)
    if (this.pathTiles.has(gx + ',' + gy) && r && r.decor !== 'town' && this.canBePath(c)) return 'n';
    return c;
  }

  regionChar(gx, gy, r) {
    const p = (hash2(gx, gy) >>> 0) % 1000 / 1000;
    const d = r.decor;
    const len = r.w, edgy = gx === r.x || gx === r.x + r.w - 1 || gy === r.y || gy === r.y + r.h - 1;

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
    // igreja central na praça (gx 117-122, gy 118-123)
    const centralChurch = (gx >= 117 && gx <= 122 && gy >= 118 && gy <= 123);
    if (centralChurch) return 'p'; // mesma cor da pedra da praça para manter visual

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

  // Abre permanentemente um tile de parede (entrada de chefe). O tile vira piso
  // tanto no chunk já carregado quanto em regenerações futuras.
  openEntrance(tx, ty) {
    this.openTiles.add(tx + ',' + ty);
    this.setTile(tx, ty, 'c');
  }

  // Sólidos: blocos que impedem passagem
  // 't' (árvores) e 'r' (rochas) têm hitbox reduzida — só o miolo do tile é sólido,
  // permitindo que o jogador se acerque visualmente sem encostar cedo demais.
  isSolid(tx, ty) {
    return SOLIDS.has(this.tileAt(tx, ty));
  }

  // Hitbox "magra" para árvores e rochas: testa apenas a parte central do tile.
  // `b` é a box do jogador/monstro em pixéis. Devolve true se colide com tiles sólidos.
  solidBox(b) {
    const x0 = Math.floor(b.x / TILE), x1 = Math.floor((b.x + b.w - 1) / TILE);
    const y0 = Math.floor(b.y / TILE), y1 = Math.floor((b.y + b.h - 1) / TILE);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const c = this.tileAt(tx, ty);
        if (!SOLIDS.has(c)) continue;
        if (!SHRINK.has(c)) return true;          // outros sólidos usam o tile inteiro
        const inset = SHRINK_INSET;
        const bx = tx * TILE + inset, by = ty * TILE + inset;
        const bw = TILE - inset * 2, bh = TILE - inset * 2;
        if (b.x < bx + bw && b.x + b.w > bx && b.y < by + bh && b.y + b.h > by) return true;
      }
    }
    return false;
  }

  // Testa colisão num único ponto — útil para projéteis, equiparando sempre a tile inteira.
  solidPixel(x, y) {
    return this.isSolid(Math.floor(x / TILE), Math.floor(y / TILE));
  }

  gateBox() { return null; }

  move(e, dx, dy) {
    if (e.ghost) { e.x += dx; e.y += dy; return; }
    const b = e.box();
    // Eixo X — testa a box deslocada horizontalmente.
    if (!this.solidBox({ x: b.x + dx, y: b.y, w: b.w, h: b.h })) e.x += dx;
    // Eixo Y — recálcula a box a partir da posição X actual (já andou ou não).
    const bx = e.x - b.w / 2;
    if (!this.solidBox({ x: bx, y: b.y + dy, w: b.w, h: b.h })) e.y += dy;
  }

  // Destrói árvores ('t') e rochas do cenário ('r') dentro do raio.
  // Usado por granadas e outras explosões para limpar o terreno.
  destroyScenery(cx, cy, r) {
    const x0 = Math.floor((cx - r) / TILE), x1 = Math.floor((cx + r) / TILE);
    const y0 = Math.floor((cy - r) / TILE), y1 = Math.floor((cy + r) / TILE);
    for (let ty = Math.max(0, y0); ty <= Math.min(this.rows - 1, y1); ty++) {
      for (let tx = Math.max(0, x0); tx <= Math.min(this.cols - 1, x1); tx++) {
        if (Math.hypot((tx + 0.5) * TILE - cx, (ty + 0.5) * TILE - cy) <= r) {
          const c = this.tileAt(tx, ty);
          if (c === 't' || c === 'r') {
            this.setTile(tx, ty, 'g');
            this.destroyedKeys.add(tx + ',' + ty);
          }
        }
      }
    }
  }

  // Compatibilidade: qualquer chamada antiga a destroyTrees é redirecionada.
  destroyTrees(cx, cy, r) { this.destroyScenery(cx, cy, r); }

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
      // Nível de batalha insuficiente: o chefe não aparece até o requisito ser cumprido.
      const reqLevel = BOSS_LEVEL_REQ[def.id];
      if (reqLevel !== undefined && g.progressLevel < reqLevel) { d.cool = 0.5; return; }
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

  // Cor de chão por bioma — usada no piso e como fundo dos elementos do cenário
  // (árvores, pedras, lápides), para que se integrem ao terreno do entorno.
  // Cada bioma tem identidade própria: pântano é roxo-sombrio, ruínas/templo são
  // avermelhados, a torre arcana é roxa e a cova do demônio, vermelho-escura.
  groundColor(region) {
    switch (region) {
      case 'prado': case 'norte': case 'varzea': case 'vila': return '#5d9250';
      case 'campos': return '#8a9a45';
      case 'floresta': case 'lobos': case 'sagrado': return '#3f6e34';
      case 'pantano': return '#5a4670';
      case 'cemiterio': return '#6f7a5a';
      case 'colinas': return '#8d8a62';
      case 'ruinas': return '#8a5a4a';
      case 'templo': return '#7a4a52';
      case 'forte': return '#5a6a4a';
      case 'catacumbas': case 'gruta': case 'cova': case 'torre': return '#343a44';
      default: return '#5a8f4a';
    }
  }

  // Paleta de árvores por bioma: copas com contraste claro contra o chão do
  // bioma (silhueta escura + tonalidade própria), incluindo identidades roxa
  // (pântano) e vermelha/outono (colinas).
  treePalette(region) {
    switch (region) {
      case 'floresta': case 'lobos': case 'sagrado':
        return { trunk: '#4a331f', leaf: '#57a33c', leaf2: '#6cb94a', leaf3: '#3a7a2b', sil: '#1d3a14', cones: true };
      case 'campos':
        return { trunk: '#5f4425', leaf: '#6a9c38', leaf2: '#7db246', leaf3: '#4a7626', sil: '#334d18', cones: false };
      case 'pantano':
        return { trunk: '#3a2e48', leaf: '#7355b5', leaf2: '#8666cf', leaf3: '#543d90', sil: '#251a3f', cones: false };
      case 'cemiterio':
        return { trunk: '#4a443c', leaf: '#5a6658', leaf2: '#6e7868', leaf3: '#454f45', sil: '#2a302a', cones: true };
      case 'colinas':
        return { trunk: '#4e3320', leaf: '#c05a2c', leaf2: '#d2723e', leaf3: '#8f3d1d', sil: '#572413', cones: false };
      case 'forte':
        return { trunk: '#5a4024', leaf: '#8a7a46', leaf2: '#9c8c54', leaf3: '#6c6138', sil: '#3b341f', cones: true };
      default:
        return { trunk: '#6b4a2a', leaf: '#337c3c', leaf2: '#42914a', leaf3: '#245c2c', sil: '#17331b', cones: false };
    }
  }

  // Árvore com silhuetas variadas (determinístico por tile). A copa é desenhada
  // com poucas formas grandes + uma silhueta escura por trás, garantindo contraste
  // de luminosidade e tonalidade contra o chão do bioma (menos teclas, mais leitura).
  drawTree(ctx, x, y, region, tx, ty, t) {
    const hv = (hash2(tx * 31, ty * 7) >>> 0) % 100;
    const pal = this.treePalette(region);
    let shape;
    if (pal.cones) shape = hv < 48 ? 2 : hv < 74 ? 0 : hv < 90 ? 1 : 3;
    else shape = hv < 34 ? 0 : hv < 58 ? 1 : hv < 82 ? 3 : 4;
    const sway = Math.sin(t * 1.5 + tx * 0.13 + ty * 0.09) * 1.3;
    const cx = x + 16, cy = y + 16;
    const lean = (hv % 3 === 0) ? 1 : 0;
    const trunkW = shape === 4 ? 4 : shape === 1 ? 5 : 6;
    const trunkH = shape === 1 ? 14 : shape === 3 ? 10 : 11;
    // sombra no chão
    ctx.fillStyle = 'rgba(0,0,0,0.14)';
    ctx.beginPath(); ctx.ellipse(cx, cy + 15, 9, 2.6, 0, 0, 6.283); ctx.fill();
    // tronco
    ctx.fillStyle = pal.trunk;
    ctx.fillRect(cx - trunkW / 2 + lean, cy - trunkH + 1, trunkW, trunkH);
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fillRect(cx - trunkW / 2 + lean + trunkW - 2, cy - trunkH + 1, 2, trunkH);

    ctx.save();
    ctx.translate(sway, 0);
    // silhueta escura atrás da copa (separação copa/tronco e copa/chão)
    const sil = pal.sil;
    if (shape === 2) {
      // pinheiro: duas camadas de triângulo sobre silhueta
      ctx.fillStyle = sil;
      ctx.beginPath(); ctx.moveTo(cx, cy - 29); ctx.lineTo(cx - 13, cy - 5); ctx.lineTo(cx + 13, cy - 5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = pal.leaf;
      ctx.beginPath(); ctx.moveTo(cx, cy - 26); ctx.lineTo(cx - 11, cy - 8); ctx.lineTo(cx + 11, cy - 8); ctx.closePath(); ctx.fill();
      ctx.fillStyle = pal.leaf2;
      ctx.beginPath(); ctx.moveTo(cx, cy - 17); ctx.lineTo(cx - 13, cy + 3); ctx.lineTo(cx + 13, cy + 3); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.10)';
      ctx.beginPath(); ctx.moveTo(cx, cy - 26); ctx.lineTo(cx - 3, cy - 15); ctx.lineTo(cx + 3, cy - 15); ctx.closePath(); ctx.fill();
    } else if (shape === 3) {
      // carvalho largo e baixo
      ctx.fillStyle = sil;
      ctx.beginPath(); ctx.ellipse(cx, cy - 11, 16, 9.5, 0, 0, 6.283); ctx.fill();
      ctx.fillStyle = pal.leaf;
      ctx.beginPath(); ctx.ellipse(cx, cy - 10, 14, 8, 0, 0, 6.283); ctx.fill();
      ctx.fillStyle = pal.leaf2;
      ctx.beginPath(); ctx.ellipse(cx - 5, cy - 15, 7, 5.5, 0, 0, 6.283); ctx.fill();
    } else if (shape === 4) {
      // muda pequena
      ctx.fillStyle = sil;
      ctx.beginPath(); ctx.arc(cx, cy - 14, 8.5, 0, 6.283); ctx.fill();
      ctx.fillStyle = pal.leaf;
      ctx.beginPath(); ctx.arc(cx, cy - 14, 7, 0, 6.283); ctx.fill();
      ctx.fillStyle = pal.leaf2;
      ctx.beginPath(); ctx.arc(cx - 3, cy - 17, 3.5, 0, 6.283); ctx.fill();
    } else if (shape === 1) {
      // alta e esguia
      ctx.fillStyle = sil;
      ctx.beginPath(); ctx.arc(cx, cy - 18, 12, 0, 6.283); ctx.fill();
      ctx.fillStyle = pal.leaf;
      ctx.beginPath(); ctx.arc(cx, cy - 18, 10, 0, 6.283); ctx.fill();
      ctx.fillStyle = pal.leaf2;
      ctx.beginPath(); ctx.arc(cx - 4, cy - 21, 5.5, 0, 6.283); ctx.fill();
    } else {
      // clássica redonda e cheia
      ctx.fillStyle = sil;
      ctx.beginPath(); ctx.arc(cx, cy - 13, 15, 0, 6.283); ctx.fill();
      ctx.fillStyle = pal.leaf;
      ctx.beginPath(); ctx.arc(cx, cy - 13, 13, 0, 6.283); ctx.fill();
      ctx.fillStyle = pal.leaf2;
      ctx.beginPath(); ctx.arc(cx - 5, cy - 16, 5.5, 0, 6.283); ctx.fill();
    }
    ctx.restore();
  }

  // Pedras com formatos variados (determinístico por tile). Tintadas pelo bioma,
  // para acompanharem o ambiente externo ou a masmorra onde estão.
  drawRock(ctx, x, y, tx, ty, region) {
    const hv = (hash2(tx * 13, ty * 29) >>> 0) % 100;
    const interior = region === 'catacumbas' || region === 'gruta' || region === 'cova' || region === 'torre';
    const light = interior ? '#9da2ad' : '#9a9a9a';
    const mid = interior ? '#7b8089' : '#787878';
    const dark = interior ? '#4d515a' : '#53514e';
    if (hv < 60) {
      // pedregulho ruggedo
      ctx.fillStyle = mid;
      ctx.beginPath();
      ctx.moveTo(x + 3, y + 30);
      ctx.lineTo(x + 7, y + 8);
      ctx.lineTo(x + 20, y + 3);
      ctx.lineTo(x + 28, y + 17);
      ctx.lineTo(x + 25, y + 30);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = light;
      ctx.beginPath();
      ctx.moveTo(x + 7, y + 8);
      ctx.lineTo(x + 20, y + 3);
      ctx.lineTo(x + 23, y + 14);
      ctx.lineTo(x + 12, y + 16);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.moveTo(x + 20, y + 3);
      ctx.lineTo(x + 28, y + 17);
      ctx.lineTo(x + 25, y + 30);
      ctx.lineTo(x + 21, y + 20);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x + 14, y + 16); ctx.lineTo(x + 13, y + 22); ctx.stroke();
    } else if (hv < 85) {
      // laje baixa e plana
      ctx.fillStyle = mid;
      ctx.beginPath(); ctx.ellipse(x + 16, y + 24, 13, 6, 0, 0, 6.283); ctx.fill();
      ctx.fillStyle = light;
      ctx.beginPath(); ctx.ellipse(x + 16, y + 22, 10, 3.5, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = dark;
      ctx.beginPath(); ctx.ellipse(x + 16, y + 26, 10, 3.5, 0, 0, Math.PI); ctx.fill();
    } else {
      // pico pontudo
      ctx.fillStyle = mid;
      ctx.beginPath();
      ctx.moveTo(x + 4, y + 30);
      ctx.lineTo(x + 16, y + 2);
      ctx.lineTo(x + 29, y + 30);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = light;
      ctx.beginPath();
      ctx.moveTo(x + 7, y + 26);
      ctx.lineTo(x + 16, y + 2);
      ctx.lineTo(x + 16, y + 26);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = dark;
      ctx.fillRect(x + 15, y + 8, 3, 20);
    }
    // base de terra/musgo integrando ao chão
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath(); ctx.ellipse(x + 16, y + 30, 12, 2.5, 0, 0, 6.283); ctx.fill();
  }

  drawTile(ctx, tx, ty, c, t) {
    const x = tx * TILE, y = ty * TILE;
    const region = this.regionGrid[ty * WORLD_W + tx];
    // Fundo base: só importa onde o elemento não cobre o tile inteiro (árvores,
    // pedras, lápides). Fora usa o chão do bioma; dentro das masmorras usa o piso
    // escuro — corrigindo as pedras com fundo verde nos subterrâneos.
    if (c === 't' || c === 'r' || c === 'b') {
      ctx.fillStyle = this.groundColor(region);
      ctx.fillRect(x, y, TILE, TILE);
    } else {
      ctx.fillStyle = '#5a8f4a';
      ctx.fillRect(x, y, TILE, TILE);
    }
    switch (c) {
      case 'g': {
        const gc = this.groundColor(region);
        ctx.fillStyle = gc;
        ctx.fillRect(x, y, TILE, TILE);
        const gd = (hash2(tx, ty) >>> 0) % 10;
        // mancha sutil que quebra a repetição
        if (gd === 0) { ctx.fillStyle = 'rgba(0,0,0,0.06)'; ctx.fillRect(x + 8, y + 18, 8, 5); }
        // um pequeno detalhe ambiental de cada bioma (menos ruído por tile)
        if (region === 'campos') {
          ctx.fillStyle = '#c9b84b';
          ctx.fillRect(x + 5 + gd * 2, y + 3 + (gd % 3) * 8, 2, 8);
        } else if (region === 'floresta' || region === 'lobos' || region === 'sagrado') {
          if (gd < 3) {
            ctx.fillStyle = '#2e5c22';
            ctx.beginPath(); ctx.ellipse(x + 8 + gd * 6, y + 22, 6, 3, 0, 0, 6.283); ctx.fill();
          }
        } else if (region === 'pantano') {
          ctx.fillStyle = 'rgba(28,18,48,0.45)';
          ctx.beginPath(); ctx.ellipse(x + 10 + gd * 3, y + 20, 8, 3, 0, 0, 6.283); ctx.fill();
        } else if (region === 'cemiterio') {
          ctx.fillStyle = 'rgba(90,90,70,0.55)';
          ctx.fillRect(x + 6, y + 23, 5, 2);
        } else if (region === 'colinas') {
          if (gd < 4) {
            ctx.fillStyle = '#7a7a70';
            ctx.fillRect(x + 4 + gd * 6, y + 18 + gd, 4, 3);
          }
        } else if (region === 'prado' || region === 'norte' || region === 'varzea' || region === 'vila' || region === '') {
          if (gd === 0) {
            ctx.fillStyle = '#e8d05a';
            ctx.fillRect(x + 14, y + 16, 2, 2);
          }
        }
        break;
      }
      case 'y':
        ctx.fillStyle = '#c9b84b';
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = '#a89a34';
        for (let i = 0; i < 3; i++) {
          ctx.fillRect(x + 4, y + 6 + i * 9, 24, 2);
          ctx.fillRect(x + 8, y + 10 + i * 9, 16, 1);
        }
        // espigas inclinadas soltas
        ctx.fillStyle = '#8a7a28';
        for (let i = 0; i < 2; i++) {
          const ex = x + 8 + i * 14, ey = y + 8 + i * 6;
          ctx.fillRect(ex, ey, 4, 2);
          ctx.fillRect(ex + 4, ey - 1, 2, 4);
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
      case 'n':
        // trilha de terra batida com pedrinhas desgastadas
        ctx.fillStyle = '#8a7355';
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = '#7a6447';
        ctx.beginPath(); ctx.ellipse(x + 16, y + 16, 11, 7, 0, 0, 6.283); ctx.fill();
        const np = (hash2(tx, ty) >>> 0) % 6;
        if (np === 0) {
          ctx.fillStyle = '#6f5a3e';
          ctx.fillRect(x + 6, y + 8, 3, 3);
          ctx.fillRect(x + 22, y + 20, 3, 3);
        }
        ctx.fillStyle = 'rgba(255,236,190,0.10)';
        ctx.beginPath(); ctx.ellipse(x + 18 - np, y + 13, 7, 3, 0.2, 0, 6.283); ctx.fill();
        break;
      case 't':
        this.drawTree(ctx, x, y, region, tx, ty, t);
        break;
      case 'r':
        this.drawRock(ctx, x, y, tx, ty, region);
        break;
      case 's':
        // lodo do pântano roxo-sombrio
        ctx.fillStyle = '#4a3f56';
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = '#5d4f6b';
        ctx.beginPath();
        ctx.ellipse(x + 16, y + 16, 8, 5, 0, 0, 6.283);
        ctx.fill();
        ctx.fillStyle = 'rgba(150,125,180,0.35)';
        ctx.fillRect(x + 4, y + 6, 8, 3);
        break;
      case 'q':
        // água turva do pântano roxo
        ctx.fillStyle = '#3a3f5a';
        ctx.fillRect(x, y, TILE, TILE);
        ctx.strokeStyle = 'rgba(150,155,215,0.5)';
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
        // lápide com texto entalhado e capim seco na base
        ctx.fillStyle = 'rgba(20,24,18,0.35)';
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = '#9a9a9a';
        ctx.fillRect(x + 9, y + 8, 14, 18);
        ctx.fillStyle = '#c8c8c8';
        ctx.fillRect(x + 11, y + 10, 10, 6);
        ctx.fillStyle = '#6a6a6a';
        ctx.fillRect(x + 15, y + 4, 2, 6);
        ctx.fillRect(x + 12, y + 7, 8, 2);
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(x + 10, y + 18, 12, 1);
        break;
      case 'x':
        {
          // escombros tintados pelo bioma (ruínas avermelhadas, torre arcana roxa)
          let base, mid, dark, moss;
          if (region === 'torre') { base = '#3a3055'; mid = '#453a66'; dark = '#2a2240'; moss = '#4a3d70'; }
          else if (region === 'ruinas' || region === 'templo') { base = '#6a4a3c'; mid = '#7a5a46'; dark = '#55402f'; moss = '#5a7a3c'; }
          else { base = '#6a6058'; mid = '#7a7068'; dark = '#55504a'; moss = '#4a7c3c'; }
          ctx.fillStyle = base;
          ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = mid;
          ctx.beginPath();
          ctx.moveTo(x + 5, y + 24);
          ctx.lineTo(x + 8, y + 4);
          ctx.lineTo(x + 24, y + 7);
          ctx.lineTo(x + 20, y + 26);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = dark;
          for (let i = 0; i < 3; i++) {
            ctx.fillRect(x + 8 + i * 5, y + 12, 3, 3);
          }
          if ((hash2(tx, ty) >>> 0) % 4 === 0) {
            ctx.fillStyle = moss;
            ctx.fillRect(x + 5, y + 24, 3, 6);
            ctx.fillRect(x + 24, y + 22, 3, 6);
          }
          break;
        }
      case 'k':
        ctx.fillStyle = '#cfc4a8';
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = '#6a5a48';
        ctx.fillRect(x + 11, y + 6, 10, 22);
        ctx.fillStyle = '#8a7a64';
        ctx.fillRect(x + 11, y + 6, 10, 3);
        ctx.fillStyle = '#4a3d2e';
        ctx.fillRect(x + 5, y + 27, 22, 3);
        ctx.fillStyle = '#ffd76a';
        ctx.fillRect(x + 14, y - 2, 4, 16);
        ctx.fillRect(x + 8, y + 4, 16, 4);
        ctx.fillStyle = 'rgba(255,220,120,' + (0.3 + Math.sin(t * 3 + tx) * 0.15).toFixed(2) + ')';
        ctx.beginPath(); ctx.arc(x + 16, y + 10, 6, 0, 6.283); ctx.fill();
        break;
      case 'o':
        ctx.fillStyle = '#b09a72';
        ctx.fillRect(x, y, TILE, TILE);
        // barril de taverna
        ctx.fillStyle = '#8a6a45';
        ctx.beginPath(); ctx.ellipse(x + 16, y + 17, 9, 11, 0, 0, 6.283); ctx.fill();
        ctx.strokeStyle = '#5a4435';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 3; i++) {
          ctx.beginPath(); ctx.ellipse(x + 16, y + 17, 10, 3.5 + i * 3, 0, -Math.PI * 0.3, Math.PI * 0.3); ctx.stroke();
        }
        ctx.fillStyle = '#c9a050';
        ctx.fillRect(x + 20, y + 14, 3, 3);
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
        const tgl = 0.7 + Math.sin(t * 2 + tx) * 0.3;
        ctx.fillStyle = 'rgba(255,240,180,' + tgl.toFixed(2) + ')';
        ctx.fillRect(x + 9, y + 16, 4, 5);
        ctx.fillRect(x + 19, y + 16, 4, 5);
        break;
      case 'h':
        if (region === 'forte') {
          // muro de pedra do forte: blocos, juntas e topo de ameias
          const wv = (hash2(tx, ty) >>> 0) % 4;
          ctx.fillStyle = wv % 2 ? '#8f8780' : '#84828a';
          ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = 'rgba(60,58,64,0.6)';
          ctx.fillRect(x, y, TILE, 4);
          ctx.fillRect(x + 2 + (wv * 7) % 26, y + 6, 8, 3);
          ctx.fillStyle = 'rgba(30,30,34,0.4)';
          for (let j = 0; j < 3; j++) {
            ctx.fillRect(x + 4, y + 12 + j * 7, 24, 1);
            ctx.fillRect(x + 12 + (j % 2) * 8, y + 8 + j * 7, 1, 5);
          }
          ctx.fillStyle = 'rgba(0,0,0,0.18)';
          ctx.fillRect(x, y + 2, TILE, 2);
          if (wv === 3) {
            ctx.fillStyle = 'rgba(90,120,70,0.5)';
            ctx.fillRect(x + 4, y + 16, 8, 2);
            ctx.fillRect(x + 20, y + 24, 6, 2);
          }
        } else {
          // casa: parede de enxaimel sob telhado de telhas
          const cv = (hash2(tx, ty) >>> 0) % 6;
          ctx.fillStyle = '#b09a72';
          ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = '#5a4430';
          ctx.fillRect(x, y + 6, TILE, 2);
          ctx.fillRect(x + 4, y + 8, 3, 20);
          ctx.fillRect(x + 25, y + 8, 3, 20);
          ctx.fillStyle = 'rgba(0,0,0,0.18)';
          ctx.fillRect(x, y + 18, TILE, 1);
          // janela (nem toda parede tem — variação entre construções)
          if (cv === 0 || cv === 3) {
            const wg = 0.85 + Math.sin(t * 3 + tx * 0.5 + ty * 0.3) * 0.15;
            const jx = cv === 0 ? 7 : 19;
            ctx.fillStyle = 'rgba(255,224,150,' + wg.toFixed(2) + ')';
            ctx.fillRect(x + jx, y + 10, 6, 6);
            ctx.strokeStyle = '#4a3624';
            ctx.lineWidth = 1;
            ctx.strokeRect(x + jx, y + 10, 6, 6);
            ctx.fillStyle = '#4a3624';
            ctx.fillRect(x + jx + 2.5, y + 10, 1, 6);
          }
          // telhado inclinado com cumeeira — silhueta mais viva
          ctx.fillStyle = '#5a3f24';
          ctx.beginPath();
          ctx.moveTo(x, y + 8);
          ctx.lineTo(x + 8, y);
          ctx.lineTo(x + 24, y);
          ctx.lineTo(x + 32, y + 8);
          ctx.closePath(); ctx.fill();
          ctx.fillStyle = cv % 2 ? '#7d5a36' : '#6b4a2a';
          ctx.beginPath();
          ctx.moveTo(x + 8, y);
          ctx.lineTo(x + 24, y);
          ctx.lineTo(x + 25, y + 3);
          ctx.lineTo(x + 7, y + 3);
          ctx.closePath(); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.12)';
          ctx.fillRect(x + 9, y + 1, 14, 2);
          // fumaça de chaminé em algumas casas (animada, determinística)
          if (cv === 5) {
            const sy = (Math.floor(t * 10) + tx + ty) % 4;
            ctx.fillStyle = 'rgba(210,210,210,0.45)';
            ctx.beginPath(); ctx.arc(x + 4, y - 3 - sy, 2.2, 0, 6.283); ctx.fill();
          }
        }
        break;
      case 'c':
        // piso de masmorra tintado: cova vermelho-escura, torre arcana roxa
        if (region === 'cova') {
          ctx.fillStyle = '#3a2527';
          ctx.fillRect(x, y, TILE, TILE);
          if ((tx * 7 + ty * 13) % 11 === 0) {
            ctx.fillStyle = '#4a3133';
            ctx.fillRect(x + 8, y + 8, 4, 4);
          }
        } else if (region === 'torre') {
          ctx.fillStyle = '#2b2440';
          ctx.fillRect(x, y, TILE, TILE);
          if ((tx * 7 + ty * 13) % 11 === 0) {
            ctx.fillStyle = '#3a3150';
            ctx.fillRect(x + 8, y + 8, 4, 4);
          }
        } else {
          ctx.fillStyle = '#3a3f4a';
          ctx.fillRect(x, y, TILE, TILE);
          if ((tx * 7 + ty * 13) % 11 === 0) {
            ctx.fillStyle = '#454b57';
            ctx.fillRect(x + 8, y + 8, 4, 4);
          }
        }
        break;
      case 'v':
        // parede de masmorra tintada pela identidade da região
        {
          let base, light, dark;
          if (region === 'cova') { base = '#2a1d1f'; light = '#3c2628'; dark = '#221416'; }
          else if (region === 'torre') { base = '#1f1a30'; light = '#2b2442'; dark = '#171226'; }
          else { base = '#2b2f38'; light = '#3a3f4a'; dark = '#252a32'; }
          ctx.fillStyle = base;
          ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = light;
          ctx.fillRect(x, y, TILE, 4);
          const br = (hash2(tx, ty) >>> 0) % 2;
          ctx.fillStyle = br ? light : dark;
          ctx.fillRect(x + (br ? 4 : 14), y + 8, 12, 6);
          ctx.fillStyle = dark;
          ctx.fillRect(x, y + 13, TILE, 1);
          ctx.fillRect(x + (br ? 16 : 6), y + 8, 1, 6);
        }
        break;
      case 'd':
        // porta em arco com moldura e soleira
        ctx.fillStyle = '#b09a72';
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = '#4a3018';
        ctx.fillRect(x + 5, y + 4, 22, 26);
        ctx.fillStyle = '#8a6a3a';
        ctx.beginPath();
        ctx.moveTo(x + 7, y + 30);
        ctx.lineTo(x + 7, y + 14);
        ctx.quadraticCurveTo(x + 16, y + 4, x + 25, y + 14);
        ctx.lineTo(x + 25, y + 30);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#5a4020';
        ctx.fillRect(x + 8, y + 16, 2, 12);
        ctx.fillRect(x + 23, y + 16, 2, 12);
        ctx.fillStyle = '#c9a227';
        ctx.fillRect(x + 21, y + 20, 2, 2);
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(x, y + 28, TILE, 3);
        break;
      case 'f':
        if (region === 'torre') {
          // piso arcano roxo
          const rv = (hash2(tx, ty) >>> 0) % 3;
          ctx.fillStyle = rv === 0 ? '#4a3a6a' : rv === 1 ? '#443660' : '#3f3058';
          ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = 'rgba(0,0,0,0.22)';
          ctx.fillRect(x + 8, y + 8, 14, 1);
          ctx.fillRect(x + 4, y + 16, 20, 1);
          if (rv === 2) {
            ctx.fillStyle = 'rgba(170,140,255,0.14)';
            ctx.beginPath(); ctx.ellipse(x + 12, y + 20, 5, 2, 0, 0, 6.283); ctx.fill();
          }
        } else if (region === 'ruinas' || region === 'templo') {
          // piso de ruínas avermelhado (identidade do bioma)
          const rv = (hash2(tx, ty) >>> 0) % 3;
          ctx.fillStyle = rv === 0 ? '#8a5f4a' : rv === 1 ? '#815a46' : '#7a5542';
          ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = 'rgba(0,0,0,0.2)';
          ctx.fillRect(x + 8, y + 8, 14, 1);
          ctx.fillRect(x + 4, y + 16, 20, 1);
          if (rv === 2) {
            ctx.fillStyle = 'rgba(90,60,40,0.4)';
            ctx.beginPath(); ctx.ellipse(x + 12, y + 20, 5, 2, 0, 0, 6.283); ctx.fill();
          }
        } else {
          // piso de tábuas de madeira
          const pv = (hash2(tx, ty) >>> 0) % 3;
          ctx.fillStyle = pv === 0 ? '#8a7355' : pv === 1 ? '#806c4f' : '#7a6649';
          ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = 'rgba(0,0,0,0.18)';
          ctx.fillRect(x, y + 6, TILE, 2);
          ctx.fillRect(x, y + 20, TILE, 2);
          ctx.fillStyle = 'rgba(255,255,255,0.07)';
          ctx.fillRect(x, y + 13, TILE, 1);
          if (pv === 2) {
            ctx.fillStyle = 'rgba(0,0,0,0.15)';
            ctx.fillRect(x + 6, y + 24, 5, 2);
          }
        }
        break;
    }
  }

  draw(ctx, cam, t) {
    // Margem de 2 tiles ao redor da viewport: cobre shake e evita pop-in.
    const tx0 = Math.max(0, Math.floor(cam.x / TILE) - 2);
    const tx1 = Math.min(this.cols - 1, Math.ceil((cam.x + cam.w) / TILE) + 2);
    const ty0 = Math.max(0, Math.floor(cam.y / TILE) - 2);
    const ty1 = Math.min(this.rows - 1, Math.ceil((cam.y + cam.h) / TILE) + 2);
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