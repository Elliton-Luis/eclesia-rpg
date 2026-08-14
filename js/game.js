import { TILE } from './data/constants.js';
import { clamp, lerp, rand } from './data/utils.js';
import { SUBCLASSES, CLASS_TIER } from './data/classes.js';
import { REGIONS, SEALS } from './data/regions.js';
import { NPC_DEFS } from './data/npcs.js';
import { LORE_ZONE } from './data/lore.js';
import { Player } from './entities/player.js';
import { Pickup } from './entities/pickup.js';
import { World } from './world/world.js';
import { byId } from './dom.js';
import { menu } from './ui/menu.js';
import { hud } from './ui/hud.js';
import { dialog } from './ui/dialog.js';
import { buildings } from './ui/buildings.js';
import { shops } from './ui/shops.js';
import { records } from './ui/records.js';
import { cheats } from './systems/cheats.js';
import { interactions } from './systems/interactions.js';
import { combat } from './systems/combat.js';
import { effects } from './systems/effects.js';
import { render } from './systems/render.js';
import { playerDamage } from './systems/player-damage.js';
import { enemyCombat } from './systems/enemy-combat.js';
import { bosses } from './systems/bosses.js';
import { progression } from './systems/progression.js';
import { sfx } from './systems/audio.js';

const GAME = {
  canvas: null,
  ctx: null,
  cw: 0,
  ch: 0,
  keys: {},
  mouse: { x: 0, y: 0 },
  mouseActive: false,
  mouseMoved: false,
  aim: { x: 0, y: 0 },
  state: 'menu',
  time: 0,
  last: 0,
  world: null,
  player: null,
  monsters: [],
  projectiles: [],
  particles: [],
  texts: [],
  pickups: [],
  rings: [],
  delayed: [],
  npcs: [],
  zones: [],
  spawnZones: [],
  cam: { x: 0, y: 0, w: 0, h: 0 },
  shake: 0,
  redFlash: 0,
  zoneTitle: '',
  zoneT: 0,
  bannerT: 0,
  boss: null,
  bossAggroed: false,
  skillEls: [],
  shopN: {},
  startPos: { x: 116.5 * TILE, y: 123.5 * TILE },
  cheats: { gold: false, hp: false, ghost: false, libera_tudo: false },
  auraT: 0,
  attackHeld: false,
  flags: {},
  popeHere: false,
  finished: false,
  bossesActive: [],
  crystals: {},
  sealsBroken: {},
  progressionGranted: {},
  progressLevel: 0,
  ending: null,
  loreDiscovered: { clero: [], templarios: [], mago: [] },
  comboStreak: 0,
  comboT: 0,
  visited: {},
  defeatedBosses: {},
  stats: { time: 0, kills: 0, bosses: 0, deaths: 0, dmgDealt: 0, dmgTaken: 0, maxCombo: 0, powerups: 0, exploration: 0 },

  init() {
    this.canvas = byId('game');
    this.ctx = this.canvas.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());

    this.world = new World();

    this.npcs = NPC_DEFS.map(n => Object.assign({}, n, {
      px: n.x * TILE,
      py: n.y * TILE,
      bobT: rand(0, 6),
      eventDone: false,
      confessed: false
    })).concat(SEALS.map(s => Object.assign({}, s, {
      kind: 'seal', px: s.x * TILE, py: s.y * TILE, bobT: rand(0, 6)
    })));
    this.zones = REGIONS.map(z => ({ name: z.name, x: z.x * TILE, y: z.y * TILE, w: z.w * TILE, h: z.h * TILE }));
    this.indoorNames = {};
    REGIONS.forEach(r => { if (r.indoor) this.indoorNames[r.name] = true; });

    window.addEventListener('keydown', e => this.keydown(e));
    window.addEventListener('keyup', e => { this.keys[e.code] = false; if (e.code === 'KeyJ' || e.code === 'KeyX') this.attackHeld = false; if (e.code === 'KeyP' || e.code === 'KeyM') {} });
    this.canvas.addEventListener('mousemove', e => this.mousemove(e));
    this.canvas.addEventListener('mousedown', e => this.mousedown(e));
    // Rodinha do mouse: percorre a hotbar ciclicamente (estilo Minecraft).
    this.canvas.addEventListener('wheel', e => { if (this.state === 'play') { e.preventDefault(); this.scrollHot(e.deltaY < 0 ? -1 : 1); } });

    byId('btnRespawn').onclick = () => this.respawn();
    byId('btnRecords').onclick = () => this.showRecords();
    window.addEventListener('mouseup', () => { this.attackHeld = false; });

    const cheatInput = byId('cheatInput');
    cheatInput.addEventListener('keydown', e => {
      if (e.code === 'Enter') {
        this.runCheat(cheatInput.value);
        cheatInput.value = '';
        this.toggleCheatBar(false);
      } else if (e.code === 'Escape') {
        this.toggleCheatBar(false);
      }
    });

    this.buildMenu();

    requestAnimationFrame(ts => { this.last = ts; this.loop(ts); });
  },

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.cw = window.innerWidth;
    this.ch = window.innerHeight;
    this.canvas.width = Math.floor(this.cw * dpr);
    this.canvas.height = Math.floor(this.ch * dpr);
    this.canvas.style.width = this.cw + 'px';
    this.canvas.style.height = this.ch + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.cam.w = this.cw;
    this.cam.h = this.ch;
  },

  // Desbloqueio de classes — regra centralizada (fácil de trocar no futuro).
  // Hoje: cada final concluído (qualquer classe) libera o próximo nível de
  // todas as categorias (zeramentos >= tier). Amanhã: trocar por uma condição
  // baseada em finais específicos sem mexer na interface.
  isClassUnlocked(subId) {
    // Cheat de desenvolvimento: libera todas as classes só nesta sessão.
    if (this.cheats.libera_tudo) return true;
    const tier = CLASS_TIER[subId] || 0;
    if (tier <= 0) return true;
    const rec = this.loadRecords();
    return (rec.wins || 0) >= tier;
  },

  // force=true (usado por cheats de desenvolvimento): inicia a classe ignorando
  // o bloqueio de seleção. Não desbloqueia nada permanentemente — o jogador só
  // joga aquela classe na sessão atual.
  startGame(subId, force) {
    const sub = SUBCLASSES[subId];
    if (!sub) return;
    // Coerência: jamais iniciar uma classe bloqueada, mesmo chamando direto.
    if (!force && !this.isClassUnlocked(subId)) {
      this.banner('Classe bloqueada: zere o jogo para desbloquear as demais.', '#ffd23f', 2.2);
      return;
    }
    this.sfx.unlock();
    this.state = 'play';
    this.monsters = [];
    this.projectiles = [];
    this.particles = [];
    this.texts = [];
    this.pickups = [];
    this.rings = [];
    this.delayed = [];
    this.shopN = {};
    this.boss = null;
    this.bossAggroed = false;
    this.shake = 0;
    this.redFlash = 0;
    this.zoneTitle = '';
    this.flags = {};
    this.finished = false;
    this.bossesActive = [];
    this.crystals = {};
    this.sealsBroken = {};
    this.progressionGranted = {};
    this.ending = null;
    this.loreDiscovered = { clero: [], templarios: [], mago: [] };
    this.comboStreak = 0;
    this.comboT = 0;
    this.visited = {};
    this.defeatedBosses = {};
    this.progressLevel = 0;
    this.auraT = 0;
    this.stats = { time: 0, kills: 0, bosses: 0, deaths: 0, dmgDealt: 0, dmgTaken: 0, maxCombo: 0, powerups: 0, exploration: 0 };
    this.newRecords = [];
    this.zoneId = '';
    this.hotSel = 0;
    this.npcs = this.npcs.filter(n => n.id !== 'papa');
    this.npcs.forEach(n => { n.eventDone = false; n.confessed = false; });
    // Aparição rara do Papa: 10% de chance por partida.
    this.popeHere = Math.random() < 0.1;
    if (this.popeHere) this.spawnPope();

    this.player = new Player(sub, this.startPos.x, this.startPos.y, this);
    // O mouse é sempre a referência de mira: o alvo inicia na posição do jogador
    // e só se move quando o cursor se move. Andar não altera a direção da mira.
    this.mouseActive = true;
    this.mouseMoved = false;
    this.aim = { x: this.player.x, y: this.player.y };
    this.cam.x = this.startPos.x - this.cw / 2;
    this.cam.y = this.startPos.y - this.ch / 2;

    // Nova partida: o mundo é redefinido — barreiras de selos e árvores
    // destruídas não persistem entre runs.
    this.world.openTiles.clear();
    this.world.destroyedKeys.clear();
    this.world.resetSpawns();
    this.world.update(0.01, this);
    this.applyBarriers();

    this.pickups.push(new Pickup(112 * TILE, 119 * TILE, 'coin', 20));
    this.pickups.push(new Pickup(120 * TILE, 130 * TILE, 'heart'));

    byId('menu').classList.add('hidden');
    byId('hud').classList.remove('hidden');
    byId('death').classList.add('hidden');
    byId('pause').classList.add('hidden');
    byId('bossbar').classList.add('hidden');
    byId('results').classList.add('hidden');

    this.buildSkillbar();
    this.hud();
    this.banner('Bem-vindo à Vila de Pedra', '#ffe9b0', 3);
  },

  loop(ts) {
    const dt = Math.min((ts - this.last) / 1000, 0.033);
    this.last = ts;
    if (dt > 0) {
      this.time += dt;
      if (this.state === 'play') this.update(dt);
      this.render();
    }
    requestAnimationFrame(n => this.loop(n));
  },

  update(dt) {
    const p = this.player;
    p.update(dt, this);
    this.chargeTick(dt);
    this.contactHit(dt);

    if (this.attackHeld && this.hotKind() === 'attack' && p.mw && p.mw.kind === 'auto' && p.attackCd <= 0) this.doAttack();

    if (this.cheats.gold) p.gold = Math.max(p.gold, 999999);
    if (this.cheats.hp) p.hp = p.maxHp;
    // Modo fantasma: atravessa paredes/obstáculos (world.move) e reaplica o
    // flag a cada frame (cobre nova partida/respawn dentro da sessão).
    p.ghost = this.cheats.ghost;

    this.stats.time += dt;

    // combo timer
    if (this.comboT > 0) {
      this.comboT -= dt;
      if (this.comboT <= 0) this.comboStreak = 0;
    }

    // veneno: dano contínuo que só dispara em intervalos fixos (1 tick por segundo),
    // para nunca aplicar múltiplos golpes em sequência no mesmo frame.
    // Imortalidade (modo fantasma) e a Confissão também blindam contra o veneno.
    if (p.status.venom > 0 && !this.cheats.ghost && p.status.immune <= 0) {
      p.status.venom -= dt;
      p.status.venomCd = (p.status.venomCd || 0) - dt;
      if (p.status.venomCd <= 0) {
        p.status.venomCd = 1;
        const vd = Math.round(p.maxHp * 0.01) + 1;
        p.hp -= vd;
        this.text(p.x, p.y - 20, '-' + vd, '#9a4b8a', 13);
        if (p.hp <= 0) { p.hp = 0; this.death(); }
      }
    }

    // Reduzir fadiga após proclamação da palavra
    if (p.status.fatigue > 0) {
      p.status.fatigue -= dt;
      if (p.status.fatigue <= 0) {
        p.status.fatigue = 0;
        p.int = Math.max(0, p.int - 5); // remover bônus temporário de inteligência
      }
    }

    const au = p.sub.aura;
    if (au && !p.dying) this.tickAura(dt);

    for (const m of this.monsters) m.update(dt, this);
    this.monsters = this.monsters.filter(m => !m.dead);
    this.bossesActive = this.bossesActive.filter(m => !m.dead);

    for (const pr of this.projectiles) pr.update(dt, this);
    this.projectiles = this.projectiles.filter(pr => !pr.dead);

    for (let i = this.delayed.length - 1; i >= 0; i--) {
      const d = this.delayed[i];
      d.t -= dt;
      if (d.t <= 0) { d.fn(); this.delayed.splice(i, 1); }
    }

    this.world.update(dt, this);

    this.pickups = this.pickups.filter(pk => !pk.update(dt, this));

    for (const pa of this.particles) pa.update(dt);
    this.particles = this.particles.filter(pa => pa.life > 0);
    for (const tx of this.texts) tx.update(dt);
    this.texts = this.texts.filter(tx => tx.life > 0);
    for (const r of this.rings) r.update(dt);
    this.rings = this.rings.filter(r => r.life > 0);

    this.npcs.forEach(n => { n.bobT += dt; });

    // Nova lógica: aura da Igreja Central protege a cidade
    this.churchAura();

    this.checkZone();

    this.shake = Math.max(0, this.shake - dt * 30);
    if (this.shake > 15) this.shake = 15; // limite máximo de tremor para nãoOfuscar a visão
    this.redFlash = Math.max(0, this.redFlash - dt * 0.7);
    if (this.bannerT > 0) { this.bannerT -= dt; if (this.bannerT <= 0) byId('banner').classList.add('hidden'); }

    const sx = lerp(this.cam.x, p.x - this.cw / 2, Math.min(1, dt * 6));
    const sy = lerp(this.cam.y, p.y - this.ch / 2, Math.min(1, dt * 6));
    const ww = this.world.cols * TILE, wh = this.world.rows * TILE;
    this.cam.x = clamp(sx, 0, Math.max(0, ww - this.cw));
    this.cam.y = clamp(sy, 0, Math.max(0, wh - this.ch));

    const npc = this.npcNear();
    const it = byId('interact');
    it.classList.toggle('hidden', !npc);
    if (npc) it.innerHTML = `Pressione <b>F</b> — Falar com ${npc.name}`;

    this.hud();
  },

churchAura() {
    const p = this.player;
    if (!p) return;
    const TILE = 32;
    // Centro fixo da cidade: levemente deslocado para baixo e direita da posição original
    // Original: gx 117, gy 118 -> Novo: gx 118, gy 120 (um tile para baixo e um para a direita)
    const CITY_CENTER_GX = 118;
    const CITY_CENTER_GY = 120;
    const gx = Math.floor(p.x / TILE);
    const gy = Math.floor(p.y / TILE);
    // Aura da Igreja Central: barreira fixa ao redor da cidade
    // A barreira é um círculo estático ao redor do centro da cidade (gx 118, gy 120)
    // O jogador pode entrar e sair livremente; monstros que entrarem são purificados
    // Raio de 20 tiles (640px) - área de proteção da igreja
    // A barreira está ativa sempre que o jogador está na zona da cidade
    const inCity = gx >= 90 && gx <= 160 && gy >= 80 && gy <= 160;
    if (inCity) {
      const cx = CITY_CENTER_GX * TILE;  // posição FIXA do centro da cidade (3776 pixels)
      const cy = CITY_CENTER_GY * TILE;
      // Efeito visual: único círculo marcando o domínio da igreja no chão
      // Apenas um círculo externo mostrando o alcance da barreira
      this.ring(cx, cy, 640, 0.15, '#ffff00', 1);  // Círculo externo 20 tiles - amarelo claro
      // Monstros que ENTRARAM na área da barreira (30 tiles raio) morrem silenciosamente
      // A barreira é fixa ao redor da cidade - jogadores podem entrar e sair livremente
      // Monstros são afetados quando tocam na barreira ao entrar na área da cidade
this.monsters.forEach(m => {
        const dx = m.x - cx;
        const dy = m.y - cy;
        const d = Math.hypot(dx, dy);
        // Se monstro estiver dentro do raio da barreira (20 tiles = 640px) e não estiver morto
        if (d <= 640 && !m.dead) {
          // Monstros dentro da área da barreira são purificados (matam sem drop)
          m.hp = 0;
          m.dying = true;
          m.dieT = 0.1;
          m.dead = true;
          // Morte pela barreira da igreja - silenciosa, sem drop
          this.stats.churchProtected += 1;
        }
      });
// Verificar se há monstros vivos próximos da barreira para remover mortos
      this.monsters = this.monsters.filter(m => !m.dead);
      this.monsters = this.monsters.filter(m => !m.dead);
    }
  },

  checkZone() {
    const p = this.player;
    let name = '';
    for (const z of this.zones) {
      if (p.x >= z.x && p.x <= z.x + z.w && p.y >= z.y && p.y <= z.y + z.h) name = z.name;
    }
    if (name !== this.zoneTitle) {
      this.zoneTitle = name;
      this.zoneT = 2.2;
      if (name && !this.visited[name]) { this.visited[name] = true; this.stats.exploration++; }
      // Mensagem ao entrar na área de proteção da igreja
      if (name === 'Cidade') {
        const msgEl = document.createElement('div');
        msgEl.id = 'church-protection-msg';
        msgEl.textContent = 'VOCÊ ENTROU NA AREA DE PROTEÇÃO DA IGREJA';
        msgEl.style.position = 'absolute';
        msgEl.style.top = '20px';
        msgEl.style.left = '50%';
        msgEl.style.transform = 'translateX(-50%)';
        msgEl.style.color = '#ffff00';
        msgEl.style.fontWeight = '800';
        msgEl.style.letterSpacing = '4px';
        msgEl.style.textShadow = '0 0 12px rgba(0, 0, 0, 0.9), 0 2px 4px rgba(0, 0, 0, 0.7)';
        msgEl.style.transition = 'opacity 2s, top 0.5s';
        msgEl.style.opacity = '1';
        const existing = document.getElementById('church-protection-msg');
        if (existing) existing.remove();
        document.body.appendChild(msgEl);
        setTimeout(() => {
          msgEl.style.top = '0px';
          msgEl.style.opacity = '0';
        }, 100);
        setTimeout(() => msgEl.remove(), 2200);
      }
      const el = byId('zonetitle');
      el.textContent = name;
      el.classList.remove('show');
      requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('show')));
      this.unlockZoneLore(name);
    }
    if (this.zoneT > 0) {
      this.zoneT -= 1 / 60;
      if (this.zoneT <= 0) byId('zonetitle').classList.remove('show');
    }
  },

  unlockZoneLore(zoneName) {
    const casta = this.player ? this.player.sub.casta : null;
    if (!casta) return;
    const zones = LORE_ZONE[casta];
    if (!zones) return;
    for (const [zid, loreId] of zones) {
      const r = REGIONS.find(reg => reg.id === zid);
      if (r && r.name === zoneName) this.discoverLore(casta, loreId);
    }
  },

  keydown(e) {
    const typing = document.activeElement === byId('cheatInput');
    if (e.code === 'F3') { e.preventDefault(); this.toggleCheatBar(); return; }
    if (typing) return;

    // Em estados de overlay (diálogo/loja/forja/etc.), bloqueamos as teclas de
    // jogo para não dispararem combate/movimento, mas deixamos Escape/Enter livres.
    const inOverlay = this.state === 'talk' || this.state === 'building' ||
      this.state === 'shop' || this.state === 'forge' || this.state === 'skills' ||
      this.state === 'guide' || this.state === 'bossintro' || this.state === 'cheats';

    if (inOverlay) {
      if (e.code === 'Escape') { e.preventDefault(); this.closeOverlay(); return; }
      if (e.code === 'Enter' && this.state === 'bossintro') { e.preventDefault();
        byId('bossintro').classList.add('hidden'); this.state = 'play'; return; }
      return; // ignore qualquer outra tecla de jogo durante overlays
    }

    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyJ', 'KeyF', 'KeyP', 'KeyX', 'KeyM', 'KeyH', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0'].includes(e.code)) e.preventDefault();
    this.keys[e.code] = true;
    this.sfx.unlock();

    if (this.state === 'play') {
      if (e.code === 'KeyJ' || e.code === 'KeyX') { this.attackHeld = true; this.useHot(); }
      if (e.code === 'KeyF') this.tryInteract();
      if (e.code === 'KeyP') this.pause(true);
      if (e.code === 'KeyM') this.toggleMute();
      if (e.code === 'KeyH') this.useSupreme();
      if (e.code.indexOf('Digit') === 0) {
        const n = parseInt(e.code.slice(5), 10);
        if (n >= 1 && n <= this.HOTBAR_SLOTS) this.selectHotByNumber(n);
      }
    } else if (this.state === 'paused') {
      if (e.code === 'KeyP' || e.code === 'Escape') this.pause(false);
    } else if (this.state === 'death') {
      if (e.code === 'Enter' || e.code === 'Escape') this.respawn();
    } else if (this.state === 'win') {
      if (e.code === 'Enter' || e.code === 'Escape') this.toMenu();
    }
  },

  mousemove(e) {
    const rect = this.canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    this.mouse.x = sx;
    this.mouse.y = sy;
    this.aim.x = sx + this.cam.x;
    this.aim.y = sy + this.cam.y;
    this.mouseActive = true;
    this.mouseMoved = true;
  },

  mousedown(e) {
    this.mouseActive = true;
    this.mouseMoved = true;
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = e.clientX - rect.left;
    this.mouse.y = e.clientY - rect.top;
    this.aim.x = this.mouse.x + this.cam.x;
    this.aim.y = this.mouse.y + this.cam.y;
    this.sfx.unlock();
    this.attackHeld = true;
    if (this.state === 'play') this.useHot();
  },

  pause(v) {
    this.state = v ? 'paused' : 'play';
    byId('pause').classList.toggle('hidden', !v);
  },

  toggleMute() {
    this.sfx.muted = !this.sfx.muted;
    this.banner(this.sfx.muted ? 'Som desativado (M)' : 'Som ativado (M)', '#fff', 1);
  },

  banner(msg, color, dur) {
    const b = byId('banner');
    b.textContent = msg;
    b.style.color = color || '#fff';
    b.classList.remove('hidden');
    this.bannerT = dur || 2.5;
  },

};

GAME.sfx = sfx;
Object.assign(GAME, menu, hud, dialog, buildings, shops, records, cheats, interactions, combat, effects, render, playerDamage, enemyCombat, bosses, progression);

export { GAME };
