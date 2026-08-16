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
    this.buildTownWear();
    this.buildRegionGrid();
    // Igrejas reais do mundo: toda região habitada por um Bispo tem um templo.
    // A primeira é a Arquidiocese da vila (sede do Bispo Cedric); as demais
    // são as catedrais/capelas dos Bispos Eleutério (Templo Ruinoso) e
    // Anselmo (Forte) — mapeadas pelas mesmas regras em churchCell().
    this.churches = [
      { x: 113, y: 110, w: 11, h: 10 }, // Arquidiocese da Vila (Bispo 118,113)
      { x: 291, y: 77, w: 11, h: 9 },   // Catedral do Templo (Bispo 296,82)
      { x: 339, y: 182, w: 11, h: 9 }   // Capela do Forte (Bispo 344,186)
    ];
  }

  // Desgaste natural dentro da vila: grama ao redor das portas fica "pisada",
  // gerando trilhas de terra que ligam as casas à praça, como se o tráfego
  // constante de NPCs/jogadores tivesse matado a grama nas rotas mais usadas.
  buildTownWear() {
    this.wornTiles = new Set();
    for (let gy = 104; gy <= 148; gy++) {
      for (let gx = 100; gx <= 138; gx++) {
        if (this.townChar(gx, gy) !== 'd') continue;
        // trilha de até 2 tiles ao redor da porta, só sobre grama
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            if (Math.abs(dx) + Math.abs(dy) > 2) continue;
            const nx = gx + dx, ny = gy + dy;
            if (this.townChar(nx, ny) === 'g') this.wornTiles.add(nx + ',' + ny);
          }
        }
      }
    }
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
  // marcando os tiles da trilha como um bloco contínuo de 2-3 tiles de largura.
  walkRoute(ax, ay, bx, by, rnd, wobble, maxSteps) {
    let x = ax, y = ay;
    let cur = Math.atan2(by - ay, bx - ax);
    const maxTurn = 0.14 + wobble * 0.3;
    let steps = 0;
    const mark = (gx, gy, width) => {
      if (gx < 4 || gx >= WORLD_W - 4 || gy < 4 || gy >= WORLD_H - 4) return;
      // Trilha sólida: largura base 2 tiles, aleatoriamente 3
      const w = width || (rnd() < 0.35 ? 3 : 2);
      const halfW = Math.floor(w / 2);
      // Direção perpendicular ao caminho
      const perp = cur + Math.PI / 2;
      for (let i = -halfW; i <= halfW; i++) {
        const ox = Math.round(Math.cos(perp) * i);
        const oy = Math.round(Math.sin(perp) * i);
        this.pathTiles.add((gx + ox) + ',' + (gy + oy));
      }
      // Ocasionalmente alarga em trechos "batidos"
      if (rnd() < 0.12) {
        const extra = rnd() < 0.5 ? -halfW - 1 : halfW + 1;
        const ox = Math.round(Math.cos(perp) * extra);
        const oy = Math.round(Math.sin(perp) * extra);
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
  // Também gera bloco contínuo de 2 tiles de largura.
  walkStub(ax, ay, len, rnd, wobble) {
    let x = ax, y = ay;
    let cur = Math.atan2((rnd() - 0.5) * 2, (rnd() - 0.5) * 2);
    for (let s = 0; s < len; s++) {
      cur += (rnd() - 0.5) * wobble;
      x += Math.cos(cur);
      y += Math.sin(cur);
      if (x >= 4 && x < WORLD_W - 4 && y >= 4 && y < WORLD_H - 4) {
        const gx = Math.round(x), gy = Math.round(y);
        const perp = cur + Math.PI / 2;
        for (let i = -1; i <= 1; i++) {
          const ox = Math.round(Math.cos(perp) * i);
          const oy = Math.round(Math.sin(perp) * i);
          this.pathTiles.add((gx + ox) + ',' + (gy + oy));
        }
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
    // Igrejas reais (Arquidiocese e catedrais dos Bispos): sobrepõem o terreno
    // natural em qualquer bioma — sempre como construções fechadas.
    const church = this.churchAt(gx, gy);
    if (church) c = this.churchCell(gx, gy, church);
    // caminhos naturais atravessam o campo (nunca dentro da vila nem masmorras)
    if (this.pathTiles.has(gx + ',' + gy) && r && r.decor !== 'town' && this.canBePath(c)) return 'n';
    // trilhas pisadas dentro da vila (ligam portas à praça)
    if (r && r.decor === 'town' && c === 'g' && this.wornTiles.has(gx + ',' + gy)) return 'n';
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
      // cidade amuralhada tomada pelos invasores: muralhas de pedra, escombros
      // das construções civis destruídas, pátio de pedra e grama queimada.
      if (edgy) return 'v';
      if (p < 0.2) return 'h';
      if (p < 0.33) return 'x';
      if (p < 0.56) return 'z';
      if (p < 0.68) return 'g';
      if (p < 0.74) return 'r';
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
  // Regra de ouro: os EDIFÍCIOS decidem primeiro e a praça/ruas preenchem o
  // resto. Assim nenhuma praça corta uma casa, nenhuma porta fica órfã e todo
  // telhado está apoiado numa construção fechada.
  townChar(gx, gy) {
    // Arquidiocese (sede do Bispo): edifício religioso real, maior que as casas.
    const arch = { x: 113, y: 110, w: 11, h: 10 };
    const ch = this.churchCell(gx, gy, arch);
    if (ch) return ch;

    const house = h => {
      const r = h;
      const inside = gx >= r[0] && gx < r[0] + r[2] && gy >= r[1] && gy < r[1] + r[3];
      if (!inside) return '';
      const core = gx > r[0] && gx < r[0] + r[2] - 1 && gy > r[1] && gy < r[1] + r[3] - 1;
      if (gy === r[1] + r[3] - 1 && gx === Math.floor(r[0] + r[2] / 2) && r[5] !== 'none') return 'd';
      if (core) return r[4] || 'f';
      return 'h';
    };

    let c = '';
    // igreja paroquial (Pároco Ambrósio)
    c = house([105, 108, 7, 5, 'f', 'none']);
    if (c) return c;
    // taverna
    c = house([124, 110, 5, 4, 'f', 'none']);
    if (c) return c;
    if (gx === 126 && gy === 111) return 'o';
    // torre do erudito
    c = house([121, 132, 4, 4, 'f', 'none']);
    if (c) return c;
    if (gx === 123 && gy === 133) return 'T';
    // casas do mercado (porta ao sul de cada uma)
    for (const hx of [106, 111, 116]) {
      c = house([hx, 128, 4, 4]);
      if (c) return c;
    }
    // casas residenciais
    for (const [hx, hy] of [[104, 116], [127, 116], [127, 121]]) {
      c = house([hx, hy, 3, 4]);
      if (c) return c;
    }
    for (const [hx, hy] of [[104, 135], [127, 135]]) {
      c = house([hx, hy, 3, 4]);
      if (c) return c;
    }
    // praça e ruas — decididas DEPOIS dos edifícios (nunca cortam uma casa),
    // formando ruas contínuas ao redor da Arquidiocese e entre as casas.
    const plaza =
      (gx >= 112 && gx <= 126 && gy >= 114 && gy <= 121) ||  // praça central ao redor da Arquidiocese
      (gx >= 112 && gx <= 123 && gy >= 108 && gy <= 109) ||  // via norte
      (gx >= 111 && gx <= 112 && gy >= 113 && gy <= 121) ||  // via oeste
      (gx >= 120 && gx <= 126 && gy >= 122 && gy <= 124) ||  // praça leste
      (gx >= 104 && gx <= 107 && gy >= 124 && gy <= 131) ||  // ruela a oeste do mercado
      (gx >= 106 && gx <= 120 && gy >= 132 && gy <= 133) ||  // rua do mercado
      (gx >= 120 && gx <= 126 && gy >= 132 && gy <= 134) ||  // acesso à torre
      (gx >= 120 && gx <= 126 && gy >= 125 && gy <= 131) ||  // ruela a leste do mercado
      (gx >= 104 && gx <= 129 && gy >= 139 && gy <= 140) ||  // rua sul
      (gx >= 130 && gx <= 132 && gy >= 109 && gy <= 134);    // margem leste
    if (plaza) return 'p';
    // varredura base
    const p2 = (hash2(gx, gy) >>> 0) % 1000 / 1000;
    if (p2 < 0.04) return 't';
    if (p2 < 0.06) return 'r';
    return 'g';
  }

  // Igreja que ocupa um tile, ou null. Usa a mesma regra dos edifícios civis:
  // perímetro fechado de paredes ('C'), nave interior caminhável ('I') e uma
  // entrada aberta ('E') ao centro da fachada sul — sempre numa construção
  // completa, nunca peças soltas.
  churchAt(gx, gy) {
    for (const ch of this.churches) {
      if (gx >= ch.x && gx < ch.x + ch.w && gy >= ch.y && gy < ch.y + ch.h) return ch;
    }
    return null;
  }

  churchCell(gx, gy, ch) {
    if (gx < ch.x || gx >= ch.x + ch.w || gy < ch.y || gy >= ch.y + ch.h) return '';
    const doorX = ch.x + Math.floor(ch.w / 2);
    if (gx === doorX && gy === ch.y + ch.h - 1) return 'E';
    const innerX = gx > ch.x && gx < ch.x + ch.w - 1;
    const innerY = gy > ch.y && gy < ch.y + ch.h - 1;
    if (innerX && innerY) return 'I';
    return 'C';
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
        // Igrejas são solo consagrado: nada nasce dentro delas.
        if (this.churchAt(gx, gy)) continue;
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

  // Converte hex para RGB
  hexToRgb(hex) {
    const m = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
    return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [90, 143, 74];
  }

  // Converte RGB para hex
  rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
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

  // Cor de chão com blending suave entre biomas (transição de 3 tiles)
  // Verifica vizinhos num raio de 3 tiles e interpola as cores baseado na distância
  blendedGroundColor(tx, ty) {
    const centerRegion = this.regionGrid[ty * WORLD_W + tx];
    const centerColor = this.hexToRgb(this.groundColor(centerRegion));
    
    let r = centerColor[0], g = centerColor[1], b = centerColor[2];
    let totalWeight = 1;
    
    // Raio de blending: 3 tiles (usa 3.5 para garantir peso no tile 3)
    const blendRadius = 3.5;
    
    for (let dy = -3; dy <= 3; dy++) {
      for (let dx = -3; dx <= 3; dx++) {
        if (dx === 0 && dy === 0) continue;
        
        const nx = tx + dx;
        const ny = ty + dy;
        
        if (nx < 0 || nx >= WORLD_W || ny < 0 || ny >= WORLD_H) continue;
        
        const neighborRegion = this.regionGrid[ny * WORLD_W + nx];
        if (neighborRegion === centerRegion || neighborRegion === '') continue;
        
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > blendRadius) continue;
        
        // Peso inversamente proporcional à distância - garante transição suave de 3 tiles
        // No tile adjacente (dist=1): peso ~0.36, no tile 2: ~0.21, no tile 3: ~0.07
        const weight = Math.max(0, (blendRadius - dist) / blendRadius) * 0.5;
        
        const neighborColor = this.hexToRgb(this.groundColor(neighborRegion));
        r += neighborColor[0] * weight;
        g += neighborColor[1] * weight;
        b += neighborColor[2] * weight;
        totalWeight += weight;
      }
    }
    
    return this.rgbToHex(r / totalWeight, g / totalWeight, b / totalWeight);
  }

  // Paleta de árvores por bioma: tronco e copas sempre MAIS ESCUROS que o chão
  // do bioma (contraste visível sem depender de contorno). Identidade própria:
  // verde (floresta), trigo (campos), roxo (pântano), cinza (mortas), outono
  // (colinas), oliva (forte).
  treePalette(region) {
    switch (region) {
      case 'floresta': case 'lobos': case 'sagrado':
        return { trunk: '#332410', leaf: '#2a5320', leaf2: '#356628', leaf3: '#1f4217' };
      case 'campos':
        return { trunk: '#4a3a16', leaf: '#55641f', leaf2: '#668024', leaf3: '#455216' };
      case 'pantano':
        return { trunk: '#2a2036', leaf: '#34264a', leaf2: '#3f2f5c', leaf3: '#241a3a' };
      case 'cemiterio':
        // Mortas/secas: troncos cinza-escuros, sem verde, tudo sombrio
        return { trunk: '#38332c', leaf: '#463f36', leaf2: '#544c40', leaf3: '#302c26' };
      case 'colinas':
        return { trunk: '#3a2815', leaf: '#8a3a1c', leaf2: '#994a26', leaf3: '#5e2a12' };
      case 'forte':
        return { trunk: '#3d2b12', leaf: '#3f4a1c', leaf2: '#4e5c26', leaf3: '#2f3916' };
      default:
        return { trunk: '#3f2c17', leaf: '#2c5730', leaf2: '#3a6d3a', leaf3: '#234828' };
    }
  }

  // Paleta de trilhas por bioma: terra batida (core) sólida e pedrinhas (pebble),
  // com tom afinado ao chão do bioma para a transição nas bordas parecer natural.
  pathPalette(region) {
    const pick = (core, pebble) => ({ core, pebble });
    switch (region) {
      case 'prado': case 'varzea': case 'norte': case 'vila':
        return pick('#7a5f3c', '#5a4630');
      case 'campos':
        return pick('#75692f', '#544b26');
      case 'floresta':
      case 'lobos':
      case 'sagrado':
        return pick('#5c5130', '#423c24');
      case 'pantano':
        return pick('#4d4252', '#3a3340');
      case 'cemiterio':
        return pick('#635a47', '#4c4636');
      case 'colinas':
        return pick('#7c6a44', '#5e523a');
      case 'ruinas':
      case 'templo':
        return pick('#6d4a3a', '#534037');
      case 'forte':
        return pick('#5c5640', '#484432');
      default:
        return pick('#6b5a3c', '#57472f');
    }
  }

  // Grau de "batimento" da trilha em (tx, ty), 0..1. Conta vizinhos de trilha
  // no anel r=1 (68%) e no anel r=2 (32%), de modo que o centro de uma trilha
  // larga fique completamente batido e as beiradas se dissolvam suavemente no
  // chão ao redor em ~2 tiles — sem bordas duras pintadas.
  pathish(tx, ty) {
    const has = (dx, dy) => {
      const k = tx + dx + ',' + (ty + dy);
      return this.pathTiles.has(k) || this.wornTiles.has(k);
    };
    let n1 = 0, n2 = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        if (has(dx, dy)) n1++;
      }
    }
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== 2) continue;
        if (has(dx, dy)) n2++;
      }
    }
    return (n1 / 8) * 0.68 + (n2 / 16) * 0.32;
  }

  // Interpola entre duas cores hex (ratio 0-1)
  blendColors(hex1, hex2, ratio) {
    const r1 = this.hexToRgb(hex1), r2 = this.hexToRgb(hex2);
    return this.rgbToHex(
      r1[0] + (r2[0] - r1[0]) * ratio,
      r1[1] + (r2[1] - r1[1]) * ratio,
      r1[2] + (r2[2] - r1[2]) * ratio
    );
  }

  

  // Árvore minimalista - 1 tile (32x32), 3 variações por bioma.
  // Sem contorno (sem silhueta nem traço), copa e tronco sempre mais escuros
  // que o chão (paleta de treePalette). Determinística por tile, ancorada no chão.
  drawTree(ctx, x, y, region, tx, ty, t) {
    const hv = (hash2(tx * 13, ty * 7) >>> 0) % 1000;
    const pal = this.treePalette(region);
    const isDead = region === 'cemiterio';
    const isSwamp = region === 'pantano';
    const cx = x + 16;
    const base = y + 30; // onde o tronco toca o chão
    const lean = (hv % 11) < 3 ? -1 : (hv % 11) < 6 ? 1 : 0;
    const v = hv % 3; // três variações por bioma

    // sombra tênue na base
    ctx.globalAlpha = 0.14;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(cx + lean * 2, base + 1, 9, 2.2, 0, 0, 6.283);
    ctx.fill();
    ctx.globalAlpha = 1;

    if (isDead) return this.drawDeadTree(ctx, cx, base, lean, pal, v);
    if (isSwamp) return this.drawSwampTree(ctx, cx, base, lean, pal, v, tx);

    const sway = Math.sin(t * 1.3 + tx * 0.13 + ty * 0.09) * 0.8;
    ctx.save();
    ctx.translate(sway + lean, 0);

    // tronco curto e encorpado
    ctx.fillStyle = pal.trunk;
    ctx.fillRect(cx - 1.5, base - 13, 3, 13);
    ctx.fillRect(cx - 3, base - 2, 6, 2);

    if (v === 0) {
      // esférica: copa redonda única
      ctx.fillStyle = pal.leaf;
      ctx.beginPath(); ctx.arc(cx, base - 17, 9, 0, 6.283); ctx.fill();
      ctx.fillStyle = pal.leaf2;
      ctx.beginPath(); ctx.arc(cx - 3, base - 20, 4, 0, 6.283); ctx.fill();
    } else if (v === 1) {
      // cônica: dois triângulos empilhados (pinheiro/morro)
      ctx.fillStyle = pal.leaf;
      ctx.beginPath(); ctx.moveTo(cx, base - 25); ctx.lineTo(cx - 9, base - 9); ctx.lineTo(cx + 9, base - 9); ctx.closePath(); ctx.fill();
      ctx.fillStyle = pal.leaf2;
      ctx.beginPath(); ctx.moveTo(cx, base - 16); ctx.lineTo(cx - 7, base - 3); ctx.lineTo(cx + 7, base - 3); ctx.closePath(); ctx.fill();
    } else {
      // achatada: copa larga e baixa (carvalho/olmo)
      ctx.fillStyle = pal.leaf;
      ctx.beginPath(); ctx.ellipse(cx, base - 12, 11, 6, 0, 0, 6.283); ctx.fill();
      ctx.fillStyle = pal.leaf2;
      ctx.beginPath(); ctx.ellipse(cx - 4, base - 16, 5, 4, 0, 0, 6.283); ctx.fill();
      ctx.fillStyle = pal.leaf3;
      ctx.beginPath(); ctx.ellipse(cx + 5, base - 12, 4, 3, 0, 0, 6.283); ctx.fill();
    }
    ctx.restore();
  }

  // Variações mortas (cemitério): galhos nus, toco ou árvore fina desgrenhada.
  drawDeadTree(ctx, cx, base, lean, pal, v) {
    ctx.save();
    ctx.translate(lean, 0);
    ctx.fillStyle = pal.trunk;
    ctx.strokeStyle = pal.trunk;
    ctx.lineWidth = 2;
    if (v === 0) {
      ctx.fillRect(cx - 1, base - 15, 2, 15);
      for (let i = 0; i < 3; i++) {
        const a = -Math.PI / 2 + (i - 1) * 0.7;
        const len = 9 + (i % 2) * 4;
        ctx.beginPath();
        ctx.moveTo(cx, base - 13);
        ctx.lineTo(cx + Math.cos(a) * len, base - 14 + Math.sin(a) * len);
        ctx.stroke();
      }
    } else if (v === 1) {
      ctx.fillRect(cx - 2, base - 8, 4, 8);
      ctx.fillRect(cx - 2, base - 10, 6, 3);
    } else {
      ctx.fillRect(cx - 1, base - 19, 2, 19);
      ctx.beginPath(); ctx.arc(cx, base - 22, 4, 0, 6.283); ctx.fill();
      for (let i = 0; i < 3; i++) {
        const a = -Math.PI / 2 + (i - 1) * 0.9;
        const len = 7 + (i % 2) * 3;
        ctx.beginPath();
        ctx.moveTo(cx, base - 20);
        ctx.lineTo(cx + Math.cos(a) * len, base - 20 + Math.sin(a) * len);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // Variações do pântano: tronco retorcido e copa murcha pendendo.
  drawSwampTree(ctx, cx, base, lean, pal, v, tx) {
    ctx.save();
    ctx.translate(lean + Math.sin(tx * 0.13 + v * 2) * 0.6, 0);
    const droop = v * 3 - 3; // inclinação murcha determinística
    const sway = Math.sin(v * 2 + tx * 0.2) * 0.8;
    ctx.translate(sway, 0);

    ctx.fillStyle = pal.trunk;
    ctx.beginPath();
    ctx.moveTo(cx - 1.5, base - 14);
    ctx.quadraticCurveTo(cx - 4 + droop, base - 8, cx + droop, base - 1);
    ctx.quadraticCurveTo(cx + 4, base - 8, cx + 1.5, base - 14);
    ctx.closePath(); ctx.fill();

    if (v === 1) {
      // galhos laterais baixos
      ctx.strokeStyle = pal.trunk;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx + droop, base - 10);
      ctx.lineTo(cx - 7 + droop, base - 6);
      ctx.moveTo(cx + droop, base - 6);
      ctx.lineTo(cx + 7 + droop, base - 4);
      ctx.stroke();
    }

    // copa caída
    ctx.fillStyle = pal.leaf;
    ctx.beginPath();
    ctx.ellipse(cx + droop, base - 16, 10, 6, -0.3 + droop * 0.05, 0, 6.283);
    ctx.fill();
    ctx.fillStyle = pal.leaf2;
    ctx.beginPath();
    ctx.ellipse(cx + droop - 3, base - 19, 5, 3.5, 0, 0, 6.283);
    ctx.fill();
    ctx.restore();
  }

  // Escurece/clarea cor hex
  shadeColor(hex, delta) {
    const rgb = this.hexToRgb(hex);
    return this.rgbToHex(
      Math.max(0, Math.min(255, rgb[0] + delta)),
      Math.max(0, Math.min(255, rgb[1] + delta)),
      Math.max(0, Math.min(255, rgb[2] + delta))
    );
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

  // Identidade determinística de um edifício civil: sobe pela fachada até a linha
  // do telhado e anda até a extremidade esquerda. Todas as paredes/telhados do
  // mesmo prédio compartilham o mesmo material e acabamento.
  buildingId(tx, ty) {
    let y = ty;
    while (y > 0) {
      const c = this.tileAt(tx, y);
      if (c === 'h' || c === 'd' || c === 'f') { y--; continue; }
      break;
    }
    const topY = y + 1;
    let x = tx;
    while (x > 0 && this.tileAt(x - 1, topY) === 'h') x--;
    return ((x * 131 + topY * 199) >>> 0);
  }

  // Telhado de telhas com cumeeira, beirais, empena nas casinhas estreitas e
  // chaminé. Textura igual para todo o vilarejo; apenas o tom varia por prédio.
  drawHouseRoof(ctx, x, y, tx, ty, t, hasLeft, hasRight, bid) {
    const tints = ['#96492e', '#8f442c', '#9c4c30', '#8a4a2e'];
    ctx.fillStyle = tints[bid % 4];
    ctx.fillRect(x, y, TILE, TILE);
    // cumeeira no alto (mais clara) e sombra do beiral na base
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.fillRect(x, y, TILE, 3);
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(x, y + TILE - 4, TILE, 4);
    // linhas de telhas
    ctx.fillStyle = 'rgba(0,0,0,0.10)';
    for (let k = 1; k < 4; k++) ctx.fillRect(x, y + k * 8, TILE, 1);
    // beirais nas extremidades do telhado
    if (!hasLeft && hasRight) {
      ctx.fillStyle = '#7a3827';
      ctx.fillRect(x, y, 5, TILE);
      ctx.fillStyle = 'rgba(255,255,255,0.10)';
      ctx.beginPath(); ctx.moveTo(x - 1, y + TILE); ctx.lineTo(x + 4, y); ctx.lineTo(x + 6, y + TILE); ctx.closePath(); ctx.fill();
    } else if (hasLeft && !hasRight) {
      ctx.fillStyle = '#7a3827';
      ctx.fillRect(x + TILE - 5, y, 5, TILE);
      ctx.fillStyle = 'rgba(255,255,255,0.10)';
      ctx.beginPath(); ctx.moveTo(x + TILE + 1, y + TILE); ctx.lineTo(x + TILE - 4, y); ctx.lineTo(x + TILE - 6, y + TILE); ctx.closePath(); ctx.fill();
    } else if (!hasLeft && !hasRight) {
      // casinha estreita: empena triangular no meio
      ctx.fillStyle = '#7a3827';
      ctx.beginPath();
      ctx.moveTo(x + 2, y + TILE); ctx.lineTo(x + 16, y + 2); ctx.lineTo(x + 30, y + TILE);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#b06a48';
      ctx.fillRect(x + 13, y + 6, 6, TILE - 6);
    }
    // chaminé em algumas casas
    if ((bid >> 8) % 4 < 2) {
      ctx.fillStyle = '#8a8078';
      ctx.fillRect(x + 6, y - 4, 5, 8);
      ctx.fillStyle = '#6f665f';
      ctx.fillRect(x + 6, y - 4, 5, 2);
      const sy = (Math.floor(t * 10) + tx + ty) % 4;
      ctx.fillStyle = 'rgba(210,210,210,0.45)';
      ctx.beginPath(); ctx.arc(x + 8, y - 6 - sy, 2.2, 0, 6.283); ctx.fill();
    }
  }

  // Parede da casa civil em 4 materiais (distribuídos por edifício), sempre com
  // a cornija no topo apoiando o telhado e a fundação embaixo.
  drawHouseWall(ctx, x, y, tx, ty, t, bv) {
    const cv = (hash2(tx, ty) >>> 0) % 6;

    if (bv === 0) {
      // enxaimel rebocado: reboco claro com esqueleto de vigas de madeira
      ctx.fillStyle = '#c4ac82';
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = '#5a4430';
      ctx.fillRect(x + 1, y + 3, 3, TILE - 8);
      ctx.fillRect(x + TILE - 4, y + 3, 3, TILE - 8);
      ctx.fillStyle = 'rgba(58,42,26,0.85)';
      ctx.fillRect(x + 2, y + 13, TILE - 4, 2);
      ctx.fillRect(x + 15, y + 13, 2, TILE - 14);
    } else if (bv === 1) {
      // pedra lavrada: blocos regulares com juntas de argamassa
      ctx.fillStyle = '#9a959c';
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = 'rgba(40,38,44,0.4)';
      for (let j = 0; j < 3; j++) {
        ctx.fillRect(x + 4, y + 10 + j * 7, 24, 1);
        ctx.fillRect(x + 10 + (j % 2) * 12, y + 6 + j * 7, 1, 4);
      }
      ctx.fillStyle = 'rgba(255,255,255,0.10)';
      ctx.fillRect(x + 12, y + 2, 8, 2);
    } else if (bv === 2) {
      // pedra irregular: alvenaria rústica com tons quebrados
      ctx.fillStyle = '#7d7468';
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(x + 6, y + 4, 12, 2);
      ctx.fillRect(x + 16, y + 20, 10, 2);
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(x + 4, y + 8, 6, 3);
      ctx.fillRect(x + 20, y + 14, 6, 3);
      ctx.fillRect(x + 8, y + 26, 9, 2);
    } else {
      // madeira: pranchas verticais com traves horizontais
      ctx.fillStyle = '#9a7a4a';
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.fillRect(x, y, 4, TILE);
      ctx.fillRect(x + 8, y, 3, TILE);
      ctx.fillRect(x + 18, y, 3, TILE);
      ctx.fillRect(x + 27, y, 5, TILE);
      ctx.fillStyle = '#5a4028';
      ctx.fillRect(x - 1, y + 11, TILE + 2, 2);
      ctx.fillRect(x - 1, y + TILE - 12, TILE + 2, 2);
    }

    // cornija sob o telhado (apoio) e fundação
    ctx.fillStyle = 'rgba(0,0,0,0.16)';
    ctx.fillRect(x, y, TILE, 3);
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fillRect(x, y + TILE - 3, TILE, 3);

    // detalhe de fachada: arbusto no enxaimel ou janela luminosa nas demais
    if (bv === 0 && cv === 1) {
      ctx.fillStyle = '#4a6b32';
      ctx.beginPath(); ctx.ellipse(x + 14, y + TILE - 4, 9, 4, 0, 0, 6.283); ctx.fill();
    } else if (cv === 0 || cv === 3) {
      const wg = 0.85 + Math.sin(t * 3 + tx * 0.5 + ty * 0.3) * 0.15;
      const jy = y + 15;
      const jx = cv === 0 ? x + 8 : x + 17;
      const frame = bv === 1 ? '#4a444c' : bv === 2 ? '#4c4438' : bv === 3 ? '#4a3620' : '#4a3624';
      ctx.fillStyle = 'rgba(255,224,150,' + wg.toFixed(2) + ')';
      ctx.fillRect(jx, jy, 6, 7);
      ctx.strokeStyle = frame;
      ctx.lineWidth = 1;
      ctx.strokeRect(jx, jy, 6, 7);
      ctx.fillStyle = frame;
      ctx.fillRect(jx + 2, jy, 1, 7);
      ctx.fillRect(jx, jy + 3, 6, 1);
    }
  }

  drawTile(ctx, tx, ty, c, t) {
    const x = tx * TILE, y = ty * TILE;
    const region = this.regionGrid[ty * WORLD_W + tx];
    // Cor do chão com blending suave entre biomas (transição de 3 tiles)
    const blendedColor = this.blendedGroundColor(tx, ty);
    // Fundo base: só importa onde o elemento não cobre o tile inteiro (árvores,
    // pedras, lápides). Fora usa o chão do bioma; dentro das masmorras usa o piso
    // escuro — corrigindo as pedras com fundo verde nos subterrâneos.
    if (c === 't' || c === 'r' || c === 'b') {
      ctx.fillStyle = blendedColor;
      ctx.fillRect(x, y, TILE, TILE);
    } else {
      ctx.fillStyle = '#5a8f4a';
      ctx.fillRect(x, y, TILE, TILE);
    }
    switch (c) {
      case 'g': {
        ctx.fillStyle = blendedColor;
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
        // piso de pedra; no pátio do forte, marcado pela ocupação dos invasores
        ctx.fillStyle = ((tx + ty) & 1) ? '#8f939b' : '#84888f';
        ctx.fillRect(x, y, TILE, TILE);
        if (region === 'forte') {
          const fv = (hash2(tx * 7, ty * 13) >>> 0) % 100;
          if (fv < 8) {
            // fogueira de acampamento (cinzas + brasas)
            ctx.fillStyle = 'rgba(0,0,0,0.35)';
            ctx.beginPath(); ctx.arc(x + 16, y + 20, 8, 0, 6.283); ctx.fill();
            for (let i = 0; i < 4; i++) {
              ctx.save();
              ctx.translate(x + 16, y + 20);
              ctx.rotate(i * Math.PI / 2 + 0.4);
              ctx.fillStyle = '#5a4a38';
              ctx.fillRect(-5, -1.5, 10, 3);
              ctx.restore();
            }
            ctx.fillStyle = 'rgba(255,120,40,0.8)';
            ctx.beginPath(); ctx.arc(x + 16, y + 19, 2.4, 0, 6.283); ctx.fill();
            ctx.fillStyle = 'rgba(255,220,120,0.7)';
            ctx.beginPath(); ctx.arc(x + 16, y + 19, 1.2, 0, 6.283); ctx.fill();
          } else if (fv < 14) {
            // escombros de construções civis destruídas
            ctx.fillStyle = '#6a625e';
            ctx.fillRect(x + 6, y + 20, 12, 3);
            ctx.fillRect(x + 10, y + 24, 8, 3);
            ctx.fillStyle = '#7a7268';
            ctx.fillRect(x + 20, y + 16, 5, 5);
            ctx.fillStyle = '#554d48';
            ctx.fillRect(x + 12, y + 13, 4, 4);
          } else if (fv < 19) {
            // estandarte derrubado dos antigos donos (mastro caído)
            ctx.strokeStyle = '#4a443e';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(x + 8, y + 30); ctx.lineTo(x + 20, y + 10); ctx.stroke();
            ctx.globalAlpha = 0.55;
            ctx.fillStyle = '#9a8a5a';
            ctx.fillRect(x + 18, y + 11, 6, 4);
            ctx.globalAlpha = 1;
          } else if (fv < 24) {
            // brasão antigo desgastado gravado no piso
            ctx.globalAlpha = 0.4;
            ctx.fillStyle = '#b8a24a';
            ctx.beginPath();
            ctx.moveTo(x + 16, y + 10);
            ctx.lineTo(x + 23, y + 13);
            ctx.lineTo(x + 20, y + 21);
            ctx.lineTo(x + 16, y + 23);
            ctx.lineTo(x + 12, y + 21);
            ctx.lineTo(x + 9, y + 13);
            ctx.closePath(); ctx.fill();
            ctx.strokeStyle = '#5a4a2a';
            ctx.beginPath();
            ctx.moveTo(x + 16, y + 10); ctx.lineTo(x + 16, y + 23); ctx.stroke();
            ctx.globalAlpha = 1;
          } else if (fv < 28) {
            // cinzas e marcas de batalha no piso
            ctx.fillStyle = 'rgba(0,0,0,0.22)';
            ctx.beginPath(); ctx.ellipse(x + 16, y + 16, 10, 7, 0, 0, 6.283); ctx.fill();
            ctx.fillStyle = 'rgba(0,0,0,0.28)';
            ctx.fillRect(x + 8, y + 14, 4, 2);
            ctx.fillRect(x + 22, y + 18, 3, 2);
          }
        }
        break;
      case 'n': {
        // Trilha de terra batida com desgaste natural: o tom do tile é calculado
        // pelo grau de "batimento" (vizinhança de trilha em raio 1 e 2), então o
        // centro da trilha fica totalmente batido e as beiradas se dissolvem no
        // chão do bioma sem bordas pintadas (gradiente de ~2 tiles).
        const pathPalette = this.pathPalette(region);
        const k = this.pathish(tx, ty);
        const hv = (hash2(tx * 7, ty * 13) >>> 0) % 1000;

        // Tom principal: mistura o chão do bioma com a terra batida
        ctx.fillStyle = this.blendColors(blendedColor, pathPalette.core, Math.min(1, k * 0.92));
        ctx.fillRect(x, y, TILE, TILE);

        if (k > 0.45) {
          // Núcleo compactado: marca oval levemente mais escura no centro
          if (hv % 3 !== 0) {
            ctx.globalAlpha = 0.16;
            ctx.fillStyle = pathPalette.core;
            ctx.beginPath(); ctx.ellipse(x + 16, y + 16, 10, 8, 0, 0, 6.283); ctx.fill();
            ctx.globalAlpha = 1;
          }
          // Pedrinhas soltas (mais claras que a terra)
          if (hv % 5 < 2) {
            ctx.fillStyle = pathPalette.pebble;
            ctx.fillRect(x + 6 + (hv % 6) * 4, y + 8 + ((hv / 6) % 5) * 4, 2, 2);
            ctx.fillStyle = 'rgba(0,0,0,0.18)';
            ctx.fillRect(x + 7 + (hv % 6) * 4, y + 9 + ((hv / 6) % 5) * 4, 2, 2);
          }
          // Tufos de palha e sulcos de carroça na direção do caminho
          const vert = (this.pathTiles.has((tx - 1) + ',' + ty) || this.wornTiles.has((tx - 1) + ',' + ty)) && (this.pathTiles.has((tx + 1) + ',' + ty) || this.wornTiles.has((tx + 1) + ',' + ty));
          ctx.fillStyle = 'rgba(0,0,0,0.13)';
          if (vert) {
            ctx.fillRect(x + 9, y + 12, 2, 8);
            if (hv % 4 === 0) ctx.fillRect(x + 21, y + 10, 2, 6);
          } else {
            ctx.fillRect(x + 12, y + 9, 8, 2);
            if (hv % 4 === 0) ctx.fillRect(x + 10, y + 21, 6, 2);
          }
        } else if (k > 0.12) {
          // Beirada frágil: tufos de grama sobrevivente e palha mais clara,
          // quebrando a linha reta da borda contra o mato
          const g = hv % 5;
          if (g < 3) {
            ctx.fillStyle = 'rgba(255,255,255,0.08)';
            ctx.fillRect(x + 4 + g * 8, y + 6 + ((hv >> 3) % 4) * 7, 3, 2);
            ctx.fillStyle = this.shadeColor(pathPalette.core, 26);
            ctx.fillRect(x + 13 + g * 5, y + 20 + ((hv >> 6) % 3) * 4, 4, 1);
          }
          // resquício de grama resistente na beira exposta
          ctx.fillStyle = blendedColor;
          ctx.globalAlpha = 0.35;
          ctx.fillRect(x + 4 + ((hv >> 9) % 4) * 7, y + 12 + ((hv >> 11) % 3) * 6, 2, 3);
          ctx.globalAlpha = 1;
        }
        break;
      }
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
          // muralha de pedra do forte, tomada pelos invasores: blocos, ameias e
          // sinais de batalha (bandeiras rasgadas, fogo, brechas, brasões quebrados)
          const wv = (hash2(tx, ty) >>> 0) % 5;
          ctx.fillStyle = wv % 2 ? '#8f8780' : '#84828a';
          ctx.fillRect(x, y, TILE, TILE);
          // juntas de pedra
          ctx.fillStyle = 'rgba(30,30,34,0.4)';
          for (let j = 0; j < 3; j++) {
            ctx.fillRect(x + 4, y + 12 + j * 7, 24, 1);
            ctx.fillRect(x + 12 + (j % 2) * 8, y + 8 + j * 7, 1, 5);
          }
          // ameias no topo
          ctx.fillStyle = 'rgba(60,58,64,0.6)';
          ctx.fillRect(x, y, TILE, 4);
          ctx.fillRect(x + 2 + (wv * 7) % 26, y + 6, 8, 3);
          ctx.fillStyle = 'rgba(0,0,0,0.28)';
          ctx.fillRect(x, y + 2, TILE, 2);
          if (wv === 0) {
            // bandeira rasgada dos invasores hasteada no muro
            ctx.strokeStyle = '#3a2f2a';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(x + 24, y + 30); ctx.lineTo(x + 24, y + 5); ctx.stroke();
            ctx.fillStyle = '#7a2a2a';
            ctx.beginPath();
            ctx.moveTo(x + 24, y + 6);
            ctx.lineTo(x + 33, y + 9);
            ctx.lineTo(x + 31, y + 22);
            ctx.lineTo(x + 24, y + 18);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#3a1a1a';
            ctx.fillRect(x + 30, y + 10, 3, 3);
          } else if (wv === 1) {
            // marca de fogo de batalha + lança travada
            ctx.fillStyle = 'rgba(0,0,0,0.35)';
            ctx.beginPath(); ctx.arc(x + 12, y + 18, 7, 0, 6.283); ctx.fill();
            ctx.fillStyle = 'rgba(0,0,0,0.25)';
            ctx.beginPath(); ctx.arc(x + 22, y + 14, 5, 0, 6.283); ctx.fill();
            ctx.strokeStyle = '#5a4a3a';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(x + 4, y + 4); ctx.lineTo(x + 20, y + 26); ctx.stroke();
          } else if (wv === 2) {
            // brecha: bloco arrancado, pedra exposta
            ctx.fillStyle = '#6f665f';
            ctx.fillRect(x + 8, y + 14, 9, 6);
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.fillRect(x + 8, y + 14, 9, 6);
            ctx.fillRect(x + 11, y + 16, 3, 2);
          } else if (wv === 3) {
            // brasão antigo dos antigos donos, apagado e rachado
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = '#b8a24a';
            ctx.beginPath();
            ctx.moveTo(x + 16, y + 8);
            ctx.lineTo(x + 24, y + 11);
            ctx.lineTo(x + 21, y + 20);
            ctx.lineTo(x + 16, y + 23);
            ctx.lineTo(x + 11, y + 20);
            ctx.lineTo(x + 8, y + 11);
            ctx.closePath(); ctx.fill();
            ctx.strokeStyle = '#5a4a2a';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x + 16, y + 8); ctx.lineTo(x + 16, y + 23); ctx.stroke();
            ctx.strokeStyle = 'rgba(0,0,0,0.4)';
            ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(x + 14, y + 6); ctx.lineTo(x + 17, y + 12); ctx.lineTo(x + 14, y + 18); ctx.stroke();
            ctx.globalAlpha = 1;
          } else {
            // vegetação rasteira cobrindo o muro surrado
            ctx.fillStyle = 'rgba(90,120,70,0.5)';
            ctx.fillRect(x + 4, y + 16, 8, 2);
            ctx.fillRect(x + 20, y + 24, 6, 2);
          }
        } else {
          // casa civil: telhado de telhas no topo e parede com material variado
          // por edifício (enxaimel, pedra lavrada, pedra irregular ou madeira).
          // A identidade do prédio (linha do telhado) define o material e o tom,
          // então cada casa tem cara própria sem abrir novas paredes.
          const bid = this.buildingId(tx, ty);
          const bv = bid % 4;
          const above = this.tileAt(tx, ty - 1);
          const left = this.tileAt(tx - 1, ty);
          const right = this.tileAt(tx + 1, ty);
          const isRoofTop = above !== 'h' && above !== 'd' && above !== 'f';
          const hasLeft = left === 'h', hasRight = right === 'h';
          if (isRoofTop) {
            this.drawHouseRoof(ctx, x, y, tx, ty, t, hasLeft, hasRight, bid);
          } else {
            this.drawHouseWall(ctx, x, y, tx, ty, t, bv);
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
        // porta em arco com moldura e soleira; a moldura acompanha o material
        // do edifício (mesma identidade usada nas paredes/telhado)
        {
          const dbv = this.buildingId(tx, ty) % 4;
          const surround = dbv === 1 ? '#a9a4ab' : dbv === 2 ? '#8f887c' : dbv === 3 ? '#c2a25e' : '#b09a72';
          ctx.fillStyle = surround;
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
        }
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
      case 'C': {
        // Parede de igreja: pedra clara lavrada, telhado de lousa escura com
        // cumeeira, vitral na fachada e a cruz finial no alto do frontão —
        // identidade religiosa distinta das casas civis de telha.
        const ch = this.churchAt(tx, ty);
        const above = this.tileAt(tx, ty - 1);
        const isRoofTop = above !== 'C' && above !== 'I' && above !== 'E';
        const isTopCenter = ch && ty === ch.y && tx === ch.x + Math.floor(ch.w / 2);
        const isFront = ch && ty === ch.y + ch.h - 1;
        const doorX = ch ? ch.x + Math.floor(ch.w / 2) : -1;
        if (isRoofTop) {
          ctx.fillStyle = '#56525c';
          ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = 'rgba(255,255,255,0.12)';
          ctx.fillRect(x, y, TILE, 2);
          ctx.fillStyle = 'rgba(0,0,0,0.18)';
          for (let k = 1; k < 4; k++) ctx.fillRect(x, y + k * 8, TILE, 1);
          ctx.fillStyle = '#433f49';
          ctx.fillRect(x, y + TILE - 4, TILE, 4);
          if (isTopCenter) {
            // finial: cruz de ferro sobre o frontão
            ctx.fillStyle = '#cfd3d8';
            ctx.fillRect(x + 14, y - 9, 4, 13);
            ctx.fillRect(x + 9, y - 5.5, 14, 3.4);
            // brasão da ordem no frontão
            ctx.fillStyle = '#a32222';
            ctx.fillRect(x + 13, y + 8, 6, 9);
            ctx.fillRect(x + 10, y + 11, 12, 3.2);
          }
        } else {
          ctx.fillStyle = '#9a958e';
          ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = 'rgba(50,48,44,0.45)';
          for (let j = 0; j < 3; j++) ctx.fillRect(x + 4, y + 10 + j * 7, 24, 1);
          ctx.fillStyle = 'rgba(255,255,255,0.10)';
          ctx.fillRect(x + 12, y + 3, 8, 2);
          // vitral alto em arco na fachada sul (fora do vão da porta)
          if (ch && isFront && tx !== doorX) {
            ctx.fillStyle = '#3b3f4a';
            ctx.beginPath();
            ctx.moveTo(x + 9, y + 24);
            ctx.lineTo(x + 9, y + 8);
            ctx.quadraticCurveTo(x + 16, y + 1, x + 23, y + 8);
            ctx.lineTo(x + 23, y + 24);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = 'rgba(255,214,138,0.85)';
            ctx.beginPath(); ctx.arc(x + 16, y + 10, 2.8, 0, 6.283); ctx.fill();
            ctx.fillStyle = 'rgba(255,230,180,0.5)';
            ctx.fillRect(x + 14, y + 15, 4, 7);
          }
          ctx.fillStyle = 'rgba(0,0,0,0.2)';
          ctx.fillRect(x, y, TILE, 3);
          ctx.fillStyle = 'rgba(0,0,0,0.3)';
          ctx.fillRect(x, y + TILE - 3, TILE, 3);
        }
        break;
      }
      case 'I': {
        // Nave da igreja: lajes de pedra claras com juntas, e a passagem
        // central em lonho vermelho conduzindo ao altar.
        ctx.fillStyle = ((tx + ty) & 1) ? '#b8b1a5' : '#aca69a';
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = 'rgba(0,0,0,0.16)';
        ctx.fillRect(x, y, TILE, 2);
        ctx.fillRect(x, y + 15, TILE, 1);
        const ch = this.churchAt(tx, ty);
        if (ch) {
          const centerX = ch.x + Math.floor(ch.w / 2);
          const centerY = ch.y + Math.floor(ch.h / 2);
          if (tx === centerX) {
            ctx.fillStyle = '#7e1220';
            ctx.fillRect(x + 9, y, 14, TILE);
            ctx.fillStyle = '#a32222';
            ctx.fillRect(x + 13, y, 6, TILE);
            ctx.fillStyle = 'rgba(255,255,255,0.14)';
            ctx.fillRect(x + 13, y, 6, 2);
          } else if (ty === centerY) {
            ctx.fillStyle = 'rgba(133,18,34,0.4)';
            ctx.fillRect(x, y + 13, TILE, 6);
          }
        }
        break;
      }
      case 'E': {
        // Entrada aberta da igreja (caminhável): vão em arco escuro com
        // ombreiras de pedra e soleira — a igreja pode ser adentrada.
        ctx.fillStyle = '#9a958e';
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = '#2a221d';
        ctx.beginPath();
        ctx.moveTo(x + 5, y + 30);
        ctx.lineTo(x + 5, y + 12);
        ctx.quadraticCurveTo(x + 16, y + 2, x + 27, y + 12);
        ctx.lineTo(x + 27, y + 30);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fillRect(x + 5, y + 12, 22, 2);
        ctx.fillStyle = '#767067';
        ctx.fillRect(x, y + 28, TILE, 3);
        break;
      }
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