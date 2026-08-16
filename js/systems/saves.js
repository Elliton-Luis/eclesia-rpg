import { SUBCLASSES } from '../data/classes.js';
import { TILE } from '../data/constants.js';
import { clamp } from '../data/utils.js';
import { byId } from '../dom.js';

// Sistema de salvamento independente do perfil de recordes (eclesia_v1).
// 3 slots persistentes em localStorage (eclesia_saves_v1), com autosave em
// eventos importantes e carregamento defensivo que nunca quebra o jogo.
const KEY = 'eclesia_saves_v1';
const NUM_SLOTS = 3;

export const saves = {
  saveSlots() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
  },

  writeSlots(s) {
    try { localStorage.setItem(KEY, JSON.stringify(s || {})); return true; } catch (e) { return false; }
  },

  _num(v, d) { return typeof v === 'number' && isFinite(v) ? v : d; },
  _arr(v) { return Array.isArray(v) ? v : null; },

  validSlot(d) {
    return !!d && d.v === 1 &&
      !!(d.meta && d.meta.classId && SUBCLASSES[d.meta.classId]) &&
      !!d.stats && !!d.run && !!d.player;
  },

  // Primeiro slot vazio (ou inválido). null se os 3 estiverem ocupados por
  // saves válidos. Evita que autosaves de uma partida nova destruam um save
  // antigo de outra sessão.
  firstFreeSlot() {
    const slots = this.saveSlots();
    for (let n = 1; n <= NUM_SLOTS; n++) {
      if (!slots[n] || !this.validSlot(slots[n])) return n;
    }
    return null;
  },

  // Salva a partida atual no slot n (1-3). auto=true (autosave) silencia a
  // mensagem e aplica um debounce para não gravar várias vezes no mesmo instante.
  saveGame(n, auto) {
    const p = this.player;
    if (!p || !p.sub) return false;
    const now = performance.now();
    if (auto && this._lastAuto && now - this._lastAuto < 800) return true;
    n = Math.min(NUM_SLOTS, Math.max(1, Math.round(n) || 1));
    this.saveSlot = n;
    const snap = this.buildSnapshot();
    if (!snap || !this.validSlot(snap)) {
      this.banner('Falha ao salvar o jogo.', '#ff6b6b', 2.4);
      return false;
    }
    const slots = this.saveSlots();
    slots[n] = snap;
    if (!this.writeSlots(slots)) {
      this.banner('Falha ao gravar o save (armazenamento cheio?).', '#ff6b6b', 2.4);
      return false;
    }
    this._lastAuto = now;
    if (!auto) this.banner('Jogo salvo no slot ' + n + '!', '#7cff8a', 2.2);
    return true;
  },

  // Snapshot defensivo: cada seção é clonada separadamente; se alguma falhar
  // (valor inesperado, referência circular), ela é descartada e o resto do
  // jogo continua sendo salvo normalmente.
  buildSnapshot() {
    const p = this.player;
    const data = { v: 1, savedAt: new Date().toISOString(), auto: false };
    const set = (k, fn) => { try { const v = fn(); if (v !== undefined) data[k] = v; } catch (e) {} };
    set('meta', () => ({
      classId: p.sub.id,
      className: p.sub.name,
      progressLevel: this._num(this.progressLevel, 0),
      zone: this.zoneTitle || '',
      playTime: this._num(this.stats.time, 0),
      kills: this._num(this.stats.kills, 0),
      bosses: this._num(this.stats.bosses, 0),
      deaths: this._num(this.stats.deaths, 0)
    }));
    set('player', () => ({
      subId: p.sub.id,
      x: p.x, y: p.y, hp: p.hp, maxHp: p.maxHp,
      spd: p.spd, str: p.str, int: p.int,
      gold: p.gold, fulmen: p.fulmen,
      atkSpd: p.atkSpd, facing: p.facing,
      weapon: JSON.parse(JSON.stringify(p.weapon)),
      status: JSON.parse(JSON.stringify(p.status)),
      cd: JSON.parse(JSON.stringify(p.cd)),
      hotKeys: JSON.parse(JSON.stringify(p.hotKeys)),
      extraSkills: JSON.parse(JSON.stringify(p.extraSkills)),
      blessings: JSON.parse(JSON.stringify(p.blessings)),
      relics: JSON.parse(JSON.stringify(p.relics)),
      ownedRelics: JSON.parse(JSON.stringify(p.ownedRelics)),
      items: JSON.parse(JSON.stringify(p.items)),
      mw: (p.mw && typeof p.mw.kind === 'string') ? JSON.parse(JSON.stringify(p.mw)) : null,
      supreme: p.supreme ? JSON.parse(JSON.stringify(p.supreme)) : null,
      supremeBlessed: !!p.supremeBlessed,
      supremeUses: this._num(p.supremeUses, 0),
      passiveRegen: this._num(p.passiveRegen, 0)
    }));
    set('stats', () => Object.assign({}, this.stats, {
      killsByType: this.stats.killsByType || {}
    }));
    // O mundo é um mapa fixo/determinístico; só os deltas permanentes importam:
    // entradas abertas pelos selos e pedras/árvores destruídas.
    set('world', () => ({
      openTiles: Array.from(this.world.openTiles || []),
      destroyedKeys: Array.from(this.world.destroyedKeys || [])
    }));
    set('npcs', () => this.npcs
      .filter(n => n.id && n.kind !== 'seal')
      .map(n => ({
        id: n.id,
        eventDone: !!n.eventDone,
        confessed: !!n.confessed,
        met: n.met,
        talks: n.talks,
        gave: n.gave
      })));
    set('run', () => ({
      progressLevel: this._num(this.progressLevel, 0),
      defeatedBosses: this.defeatedBosses,
      crystals: this.crystals,
      sealsBroken: this.sealsBroken,
      progressionGranted: this.progressionGranted,
      loreDiscovered: this.loreDiscovered,
      shopN: this.shopN,
      visited: this.visited,
      flags: this.flags,
      popeHere: !!this.popeHere,
      finished: !!this.finished,
      ending: this.ending,
      comboStreak: this._num(this.comboStreak, 0),
      comboT: this._num(this.comboT, 0),
      learnedNpcSkills: this.learnedNpcSkills,
      npcMet: this.npcMet,
      npcStage: this.npcStage,
      eventDone: this.eventDone,
      blessingsReceived: this.blessingsReceived
    }));
    return data;
  },

  loadGame(n) {
    const slots = this.saveSlots();
    const d = slots[n];
    if (!d || !this.validSlot(d)) {
      this.banner('Nenhum save válido no slot ' + n + '.', '#ff6b6b', 2.4);
      return false;
    }
    this._loading = true;
    try {
      this.saveSlot = n;
      // Reaproveita startGame (reset completo de containers/mundo/NPCs/jogador)
      // e em seguida sobrepõe o estado salvo — tudo defensivamente.
      this.startGame(d.meta.classId, true);
      this.restoreSnapshot(d);
    } finally {
      this._loading = false;
    }
    byId('saves').classList.add('hidden');
    byId('menu').classList.add('hidden');
    byId('pause').classList.add('hidden');
    return true;
  },

  restoreSnapshot(d) {
    const pl = d.player || {};
    const st = d.stats || {};
    const run = d.run || {};
    const p = this.player;

    // --- Estado de progressão/aventura ---
    const ov = (k, src) => { if (src[k] !== undefined) this[k] = src[k]; };
    ['progressLevel', 'defeatedBosses', 'crystals', 'sealsBroken', 'progressionGranted',
      'loreDiscovered', 'shopN', 'visited', 'flags', 'popeHere', 'finished', 'ending',
      'comboStreak', 'comboT', 'learnedNpcSkills', 'npcMet', 'npcStage', 'eventDone',
      'blessingsReceived'].forEach(k => ov(k, run));

    // --- Estatísticas (preservando tudo que já existia) ---
    this.stats = Object.assign({}, this.stats, st);
    if (!this.stats.killsByType) this.stats.killsByType = {};

    // --- Jogador ---
    p.x = this._num(pl.x, p.x);
    p.y = this._num(pl.y, p.y);
    p.hp = Math.max(1, Math.min(this._num(pl.hp, p.hp), this._num(pl.maxHp, p.maxHp)));
    p.maxHp = this._num(pl.maxHp, p.maxHp);
    p.spd = this._num(pl.spd, p.spd);
    p.str = this._num(pl.str, p.str);
    p.int = this._num(pl.int, p.int);
    p.gold = this._num(pl.gold, p.gold);
    p.fulmen = this._num(pl.fulmen, p.fulmen);
    p.atkSpd = this._num(pl.atkSpd, p.atkSpd);
    if (typeof pl.facing === 'number') p.facing = pl.facing;
    if (pl.weapon && typeof pl.weapon.tier === 'number') p.weapon = Object.assign({}, p.weapon, pl.weapon);
    if (pl.status && typeof pl.status === 'object') p.status = Object.assign({}, p.status, pl.status);
    if (pl.cd && typeof pl.cd === 'object') p.cd = Object.assign({}, p.cd, pl.cd);
    const hk = this._arr(pl.hotKeys);
    if (hk) {
      const pad = hk.slice(0, p.hotKeys.length);
      while (pad.length < p.hotKeys.length) pad.push(null);
      p.hotKeys = pad;
    }
    const es = this._arr(pl.extraSkills);
    if (es) p.extraSkills = es;
    const bl = this._arr(pl.blessings);
    if (bl) p.blessings = bl;
    const rc = this._arr(pl.relics);
    if (rc) p.relics = rc;
    const or = this._arr(pl.ownedRelics);
    if (or) p.ownedRelics = or;
    if (pl.items && typeof pl.items === 'object') p.items = Object.assign({}, p.items, pl.items);
    if (pl.mw && typeof pl.mw.kind === 'string') p.mw = pl.mw;
    if (pl.supremeBlessed) {
      p.supremeBlessed = true;
      if (pl.supreme && typeof pl.supreme === 'object') p.supreme = pl.supreme;
    }
    p.supremeUses = this._num(pl.supremeUses, p.supremeUses);
    p.passiveRegen = this._num(pl.passiveRegen, p.passiveRegen);

    // --- Mundo (deltas permanentes + reabertura dos selos pelo nível) ---
    if (d.world) {
      this.world.openTiles = new Set(this._arr(d.world.openTiles) || []);
      this.world.destroyedKeys = new Set(this._arr(d.world.destroyedKeys) || []);
    }
    this.applyBarriers();

    // --- NPCs: overlay das flags por id sobre a lista recém-criada ---
    this.npcs = this.npcs.filter(n => n.id !== 'papa');
    if (this.popeHere) this.spawnPope();
    const savedNpcs = this._arr(d.npcs) || [];
    for (const s of savedNpcs) {
      const n = this.npcs.find(x => x.id === s.id);
      if (!n) continue;
      if (s.eventDone !== undefined) n.eventDone = !!s.eventDone;
      if (s.confessed !== undefined) n.confessed = !!s.confessed;
      if (s.met !== undefined) n.met = s.met;
      if (s.talks !== undefined) n.talks = s.talks;
      if (s.gave !== undefined) n.gave = s.gave;
    }

    // --- Zona exibida e posição da câmera ---
    this.zoneTitle = (d.meta && d.meta.zone) || '';
    this.zoneT = 0;

    // --- Respawning de inimigos e finalização da restauração ---
    this.world.resetSpawns();
    this.world.update(0.01, this);
    this.cam.x = clamp(p.x - this.cw / 2, 0, Math.max(0, this.world.cols * TILE - this.cw));
    this.cam.y = clamp(p.y - this.ch / 2, 0, Math.max(0, this.world.rows * TILE - this.ch));
    this.buildSkillbar();
    this.hud();

    if (this.finished) {
      this.state = 'win';
      this.showResults();
    } else {
      this.state = 'play';
      this.banner('Jogo restaurado!', '#7cff8a', 2.2);
    }
  },

  openSaveMenu() {
    const panel = byId('savesPanel');
    if (!panel) return;
    // Ao abrir dentro do jogo, pausa para os comandos de movimento/combate não
    // escaparem por trás do overlay (retomada com P ou ao Continuar um slot).
    if (this.state === 'play') this.pause(true);
    const playing = !!this.player;
    const slots = this.saveSlots();
    let html = `<h2>Salvar / Continuar</h2>`;
    html += `<div class="save-grid">`;
    for (let n = 1; n <= NUM_SLOTS; n++) {
      const d = slots[n];
      const filled = d && this.validSlot(d);
      html += `<div class="save-card${n === this.saveSlot ? ' active' : ''}">`;
      html += `<div class="save-slot">SLOT ${n}${n === this.saveSlot && playing ? ' — atual' : ''}</div>`;
      if (filled) {
        html += `<div class="save-class">${d.meta.className || d.meta.classId}</div>`;
        html += `<div class="save-meta">${this.formatTime(d.meta.playTime || 0)} · zona: ${d.meta.zone || '—'} · nível ${d.meta.progressLevel || 0}</div>`;
        html += `<div class="save-meta">${d.meta.kills || 0} abates · ${d.meta.bosses || 0} chefes</div>`;
        html += `<div class="save-date">${new Date(d.savedAt).toLocaleString('pt-BR')}</div>`;
        html += `<div class="save-actions">`;
        html += `<button class="btn sm" data-continue="${n}">Continuar</button>`;
        if (playing) html += `<button class="btn sm" data-write="${n}">Salvar</button>`;
        html += `<button class="btn sm danger" data-del="${n}">Excluir</button>`;
        html += `</div>`;
      } else {
        html += `<div class="save-meta">— Vazio —</div>`;
        if (playing) html += `<div class="save-actions"><button class="btn sm" data-write="${n}">Salvar</button></div>`;
      }
      html += `</div>`;
    }
    html += `</div>`;
    html += `<div class="save-foot">Durante o jogo: <b>F5</b> / <b>O</b> abrem este menu de salvamento · <b>F9</b> continua o slot atual</div>`;
    html += `<button class="btn" id="saveClose">Fechar</button>`;
    panel.innerHTML = html;

    panel.querySelectorAll('[data-continue]').forEach(b => {
      b.onclick = () => this.loadGame(+b.dataset.continue);
    });
    panel.querySelectorAll('[data-write]').forEach(b => {
      b.onclick = () => { if (this.saveGame(+b.dataset.write, false)) this.openSaveMenu(); };
    });
    panel.querySelectorAll('[data-del]').forEach(b => {
      b.onclick = () => {
        if (!confirm('Excluir o save do slot ' + b.dataset.del + '?')) return;
        const s = this.saveSlots();
        delete s[b.dataset.del];
        this.writeSlots(s);
        this.openSaveMenu();
      };
    });
    byId('saveClose').onclick = () => byId('saves').classList.add('hidden');
    byId('saves').classList.remove('hidden');
  }
};
