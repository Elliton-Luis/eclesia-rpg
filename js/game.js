const byId = id => document.getElementById(id);

function dangerAt(g, x, y) {
  let best = null;
  for (const r of REGIONS) {
    if (x >= r.x * TILE && x < (r.x + r.w) * TILE && y >= r.y * TILE && y < (r.y + r.h) * TILE) {
      if (!best || r.priority > best.priority) best = r;
    }
  }
  return best ? best.danger : 1; // default to danger 1 for wilderness
}

const GAME = {
  canvas: null,
  ctx: null,
  cw: 0,
  ch: 0,
  keys: {},
  mouse: { x: 0, y: 0 },
  mouseActive: false,
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
  cheats: { gold: false, hp: false },
  auraT: 0,
  attackHeld: false,
  flags: {},
  finished: false,
  bossesActive: [],
  crystals: {},
  sealsBroken: {},
  ending: null,
  loreDiscovered: { clero: [], populum: [], mago: [] },
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

    byId('btnRespawn').onclick = () => this.respawn();
    byId('btnRecords').onclick = () => this.showRecords();
    window.addEventListener('mouseup', () => { this.attackHeld = false; this.mouseActive = false; });

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

  buildMenu() {
    const grid = byId('menuGrid');
    grid.innerHTML = '';
    for (const castaId of CASTA_ORDER) {
      const casta = CASTAS[castaId];
      for (const subId of SUB_ORDER) {
        if (SUBCLASSES[subId].casta !== castaId) continue;
        const s = SUBCLASSES[subId];
        const sk = s.skills.map(x => x.name).join(' · ');
        const div = document.createElement('div');
        div.className = 'card';
        div.style.setProperty('--c', s.accent);
        div.innerHTML = `
          <div class="cswatch" style="--c:${s.color}"></div>
          <div class="ct">${casta.name.toUpperCase()}</div>
          <div class="cn">${s.name}</div>
          <div class="cd">${s.desc}</div>
          <div class="csk">Vida ${s.hp} · Vel ${s.speed}<br>Força ${s.str} · Int ${s.int}<br><b>${sk}</b></div>`;
        div.onclick = () => this.startGame(s.id);
        grid.appendChild(div);
      }
    }
  },

  startGame(subId) {
    const sub = SUBCLASSES[subId];
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
    this.ending = null;
    this.loreDiscovered = { clero: [], populum: [], mago: [] };
    this.comboStreak = 0;
    this.comboT = 0;
    this.visited = {};
    this.defeatedBosses = {};
    this.auraT = 0;
    this.stats = { time: 0, kills: 0, bosses: 0, deaths: 0, dmgDealt: 0, dmgTaken: 0, maxCombo: 0, powerups: 0, exploration: 0 };
    this.zoneId = '';
    this.npcs.forEach(n => { n.eventDone = false; n.confessed = false; });

    this.player = new Player(sub, this.startPos.x, this.startPos.y, this);
    this.cam.x = this.startPos.x - this.cw / 2;
    this.cam.y = this.startPos.y - this.ch / 2;

    this.world.resetSpawns();
    this.world.update(0.01, this);

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

  buildSkillbar() {
    const p = this.player;
    const bar = byId('skillbar');
    bar.innerHTML = '';
    this.skillEls = [];
    const mk = (label, name, color, action) => {
      const d = document.createElement('div');
      d.className = 'skill';
      d.style.setProperty('--c', color);
      d.innerHTML = `<span class="skey">${label}</span><span class="sname">${name}</span><div class="cdfill"></div><div class="cdnum"></div>`;
      d.onclick = () => { if (this.state === 'play') action(); };
      bar.appendChild(d);
      return d;
    };
    this.skillEls.push(mk('J', 'Ataque', p.sub.color, () => this.doAttack()));
    p.allSkills().forEach((s, i) => {
      this.skillEls.push(mk(s.key, s.name, s.color, () => this.castSkill(i)));
    });
    const itG = mk('G', 'Granada', '#5caeff', () => this.useModernItem('granada'));
    itG.dataset.item = 'granada';
    this.skillEls.push(itG);
    const itU = mk('U', 'Exorcismo', '#fff3b0', () => this.useModernItem('exorcismo'));
    itU.dataset.item = 'exorcismo';
    this.skillEls.push(itU);
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

    if (this.attackHeld && p.mw && p.mw.kind === 'auto' && p.attackCd <= 0) this.doAttack();

    if (this.cheats.gold) p.gold = Math.max(p.gold, 999999);
    if (this.cheats.hp) p.hp = p.maxHp;

    this.stats.time += dt;

    // combo timer
    if (this.comboT > 0) {
      this.comboT -= dt;
      if (this.comboT <= 0) this.comboStreak = 0;
    }

    // poção única de veneno aplicada ao jogador
    if (p.status.venom > 0) {
      p.status.venom -= dt;
      const vd = Math.round(p.maxHp * 0.01) + 1;
      if (Math.random() < 0.6) {
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

  discoverLore(casta, id) {
    const found = (LORE[casta] || []).find(l => l.id === id);
    if (!found) return;
    const list = this.loreDiscovered[casta];
    if (!list || list.includes(id)) return;
    list.push(id);
    this.sfx.upgrade();
    this.banner('LORE: ' + found.title, '#ffe9b0', 2.5);
    this.state = 'talk';
    this.showDialog('📖 ' + found.title, found.text, '<button class="btn" id="dlgOk">Entendido</button>');
    byId('dlgOk').onclick = () => this.closeDialog();
    if (casta === 'clero') this.blessingFx(this.player, '#ffe66d', 12);
  },

  hud() {
    const p = this.player;
    if (!p) return;
    byId('hpbar').style.width = (clamp(p.hp / p.maxHp, 0, 1) * 100) + '%';
    byId('hptext').textContent = Math.ceil(p.hp) + '/' + p.maxHp;
    byId('goldval').textContent = p.gold;
    byId('st_vida').textContent = p.maxHp;
    byId('st_vel').textContent = p.spd;
    byId('st_for').textContent = p.str;
    byId('st_int').textContent = p.int;
    byId('classname').textContent = CASTAS[p.sub.casta].name + ' — ' + p.sub.name;
    byId('weapon').textContent = p.mw ? p.mw.name + ' (moderna, dano ' + p.weapon.dmg + ')' : p.weapon.name + ' +' + p.weapon.tier + ' (dano ' + p.weapon.dmg + ')';

    for (let i = 0; i < this.skillEls.length; i++) {
      const el = this.skillEls[i];
      if (el.dataset && el.dataset.item) continue;
      let cd = 0, max = 1;
      if (i === 0) { cd = p.attackCd; max = (p.mw || p.sub.attack).cd || 1; }
      else { const s = p.allSkills()[i - 1]; if (!s) continue; cd = p.cd[s.id]; max = s.cd; }
      const f = clamp(cd / max, 0, 1);
      el.querySelector('.cdfill').style.height = (f * 100) + '%';
      el.querySelector('.cdnum').textContent = cd > 0 ? cd.toFixed(1) : '';
    }
    if (this.skillEls[0]) this.skillEls[0].querySelector('.sname').textContent = p.mw ? p.mw.name : 'Ataque';
    for (const el of this.skillEls) {
      if (!el.dataset || !el.dataset.item) continue;
      const n = p.items[el.dataset.item] || 0;
      el.querySelector('.sname').textContent = (el.dataset.item === 'granada' ? 'Granada' : 'Exorcismo') + (n > 0 ? ' x' + n : '');
      el.style.opacity = n > 0 ? '1' : '0.35';
    }

    const bb = byId('bossbar');
    const b = this.boss || this.bossesActive.find(m => !m.dead);
    if (b && !b.dead && b.aggro > 0) {
      bb.classList.remove('hidden');
      byId('bossname').textContent = b.def.name.toUpperCase();
      byId('bosshp').style.width = (clamp(b.hp / b.maxHp, 0, 1) * 100) + '%';
      byId('bosshp').style.background = b.def.finalBoss ? 'linear-gradient(90deg,#ff3c3c,#ffd23f)' : 'linear-gradient(90deg,#ffd23f,#ff6b6b)';
    } else {
      bb.classList.add('hidden');
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

    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyJ', 'KeyQ', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyF', 'KeyP', 'KeyX', 'KeyG', 'KeyU'].includes(e.code)) e.preventDefault();
    this.keys[e.code] = true;
    this.sfx.unlock();

    if (this.state === 'play') {
      if (e.code === 'KeyJ' || e.code === 'KeyX') { this.attackHeld = true; this.doAttack(); }
      if (e.code === 'KeyF') this.tryInteract();
      if (e.code === 'KeyP') this.pause(true);
      if (e.code === 'KeyM') this.toggleMute();
      if (e.code === 'KeyG') this.useModernItem('granada');
      if (e.code === 'KeyU') this.useModernItem('exorcismo');
      const sk = this.player.allSkills();
      sk.forEach((s, i) => { if (e.code === 'Key' + s.key) this.castSkill(i); });
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
  },

  mousedown(e) {
    this.mouseActive = true;
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = e.clientX - rect.left;
    this.mouse.y = e.clientY - rect.top;
    this.aim.x = this.mouse.x + this.cam.x;
    this.aim.y = this.mouse.y + this.cam.y;
    this.sfx.unlock();
    this.attackHeld = true;
    if (this.state === 'play') this.doAttack();
  },

  tryInteract() {
    const npc = this.npcNear();
    if (!npc) return;
    if (npc.kind === 'forge') {
      this.state = 'forge';
      this.buildForge();
      byId('forge').classList.remove('hidden');
    } else if (npc.kind === 'shop') {
      this.state = 'shop';
      this.buildShop();
      byId('shop').classList.remove('hidden');
    } else if (npc.kind === 'skills') {
      this.state = 'skills';
      this.buildSkillShop();
      byId('skills').classList.remove('hidden');
    } else if (npc.kind === 'guide') {
      this.state = 'guide';
      byId('guidePanel').innerHTML = `<h2>${npc.name}</h2><p>${npc.text}</p><button class="btn" id="closeGuide">Entendido</button>`;
      byId('guide').classList.remove('hidden');
      byId('closeGuide').onclick = () => this.closeOverlay();
    } else if (npc.kind === 'church' || npc.kind === 'tavern' || npc.kind === 'tower') {
      this.state = 'building';
      this.openBuilding(npc);
      byId('bld').classList.remove('hidden');
    } else if (npc.kind === 'talk') {
      this.doTalk(npc);
    } else if (npc.kind === 'seal') {
      this.trySeal(npc);
    }
  },

  trySeal(npc) {
    if (this.sealsBroken[npc.id]) return;
    const need = npc.need;
    if (this.crystals[need]) {
      this.sealsBroken[npc.id] = true;
      this.banner(npc.name + ' se desfez!', npc.color, 2.5);
      this.burst(npc.px, npc.py, npc.color, 20, 300);
      this.ring(npc.px, npc.py, 60, 0.8, npc.color, 5);
      this.shake += 6;
      this.sfx.upgrade();
    } else {
      this.banner(npc.msg, '#ffd23f', 2.8);
    }
  },

  // Diálogo genérico com NPC
  showDialog(title, body, buttonsHtml) {
    byId('dialogPanel').innerHTML = `<h2>${title}</h2><div class="dlgbody">${body}</div><div class="dlgbtns">${buttonsHtml || '<button class="btn" id="dlgOk">Continuar</button>'}</div>`;
    byId('dialog').classList.remove('hidden');
    // Seguro: se o caller não criou um handler para dlgOk, liga-o a closeDialog.
    const ok = byId('dlgOk');
    if (ok && !ok.onclick) ok.onclick = () => this.closeDialog();
  },

  closeDialog() {
    byId('dialog').classList.add('hidden');
    if (this.state !== 'win' && this.state !== 'death' && this.state !== 'menu') this.state = 'play';
  },

doTalk(npc) {
    const casta = this.player.sub.casta;
    const sub = this.player.sub;
    // Busca uma passagem bíblica aleatória baseada na casta do NPC/clero
    let passagemAleatoria = '';
    if (npc.kind === 'church' && npc.lines && npc.lines.clero) {
      passagemAleatoria = randArr(npc.lines.clero);
    } else if (npc.kind === 'church' && BIBLIA_PASSAGENS[casta]) {
      passagemAleatoria = randArr(BIBLIA_PASSAGENS[casta]);
    }
    const baseLine = (npc.lines && npc.lines[casta]) || (npc.text || '...');
    const finalLine = passagemAleatoria ? passagemAleatoria : baseLine;
    this.state = 'talk';
    // Confissão só disponível a Padre (ordained=true) e Bispo (ordained=true).
    // Verificar se é o Bispo central da cidade (kind === 'church' e id === 'bispo_central')
    const isCentralBishop = npc.id === 'bispo_central';
    
    // Se for o Bispo central, permitir confissão para Padre e Bispo (os que têm ordained=true)
    if (isCentralBishop && npc.event && npc.event === 'confess' && ((sub.ordained && casta === 'clero') || (sub.casta === 'clero' && sub.exorcistLevel >= 1))) {
      this.blessingFx(this.player, '#ffe66d', 14);
      this.showDialog('⛪ Confissão', `"${finalLine}"<div class="confessTag">— O SENHOR OUVE ATRAVÉS DE VOCÊ —</div>`, '<button class="btn" id="dlgConfess">Perdoar</button>');
      byId('dlgConfess').onclick = () => this.doConfession(npc);
      return;
    }
    // Se for o Bispo central e for Diácono, diálogo alternativo
    if (isCentralBishop && npc.event && npc.event === 'confess' && !sub.ordained && sub.exorcistLevel === 0) {
      this.showDialog('⛪ Caridade', `"${finalLine}"<div class="confessTag">— O SENHOR OUVE, mas o Bispo Cedric oferece consolo e orientação espiritual.</div>`, '<button class="btn" id="dlgOk">Continuar</button>');
      byId('dlgOk').onclick = () => this.closeDialog();
      this.text(this.player.x, this.player.y - 24, 'Conselho espiritual recebido', '#ffe66d', 14);
      this.hud();
      return;
    }
    // Confissão para outros NPCs (pároco, etc.) - regras antigas
    if (npc.event && npc.event === 'confess' && casta === 'clero' && !npc.eventDone) {
      this.blessingFx(this.player, '#ffe66d', 14);
      this.showDialog('⛪ Confissão', `"${finalLine}"<div class="confessTag">— O SENHOR OUVE ATRAVÉS DE VOCÊ —</div>`, '<button class="btn" id="dlgConfess">Perdoar</button>');
      byId('dlgConfess').onclick = () => this.doConfession(npc);
      return;
    }
    const extra = npc.eventDone ? '' : this.classEventButton(npc, casta);
    this.showDialog(npc.name, `"${finalLine}"`, extra + '<button class="btn ghost" id="dlgOk">Continuar</button>');
    byId('dlgOk').onclick = () => this.closeDialog();
    if (extra) {
      const btn = byId('dlgEvent');
      if (btn) btn.onclick = () => this.doClassEvent(npc);
    }
  },

  classEventButton(npc, casta) {
    if (!npc.event) return '';
    if (npc.event === 'war' && casta === 'populum') return '<button class="btn" id="dlgEvent">Treinar (Grátis)</button>';
    if (npc.event === 'saber' && casta === 'mago') return '<button class="btn" id="dlgEvent">Estudar (+Int)</button>';
    if (npc.event === 'lore') return '';
    return '';
  },

// Confissão do Clero: cura + bênção temporária de dano + ganho permanente de vida
  // Se for confissão no Bispo Central (npc.id === 'bispo_central'), também aplica buff de Fé temporário.
  doConfession(npc) {
    const p = this.player;
    p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * 0.5));
    p.maxHp += 10;
    p.hp = Math.min(p.maxHp, p.hp + 10);
    p.int += 2;
    p.status.dmg = Math.max(p.status.dmg || 0, 0.35);
    p.status.spd = Math.max(p.status.spd || 0, 0.12);
    p.status.dur = Math.max(p.status.dur, 90);
    npc.eventDone = true;
    npc.confessed = true;
    this.healEffect(p);
    this.blessingFx(p, '#fff3b0', 20);
    // Se for o Bispo Central, aplicar buff de Fé temporário
    if (npc.id === 'bispo_central') {
      p.status.faith = (p.status.faith || 0) + 0.15; // +15% de dano e velocidade por 30s
      p.status.faithT = 30;
      this.banner('Bispo Cedric: +15% de Fé temporária!', '#a23b3b', 3);
    }
    this.sfx.heal();
    this.sfx.upgrade();
    this.discoverLore('clero', 'confissao');
    this.showDialog('⛪ Confissão Aceita', '"Que a luz do Senhor vos cubra, filho."<div class="confessTag">+10 de vida · +2 inteligência · dano +35% (temporário)</div>' + (npc.id === 'bispo_central' ? '<div class="confessTag">+15% Fé temporária</div>' : ''), '<button class="btn" id="dlgOk2">Amém</button>');
    byId('dlgOk2').onclick = () => this.closeDialog();
    this.hud();
  },

  doClassEvent(npc) {
    const casta = this.player.sub.casta;
    const p = this.player;
    if (npc.event === 'war' && casta === 'populum') {
      p.str += 2;
      npc.eventDone = true;
      this.burst(p.x, p.y - 20, '#c0392b', 12, 200);
      this.text(p.x, p.y - 30, 'FORÇA +2', '#ff9d5c', 16);
      this.sfx.upgrade();
      // bônus de dano físico temporário
      p.status.dmg = Math.max(p.status.dmg || 0, 0.25);
      p.status.dur = Math.max(p.status.dur, 60);
      this.showDialog(npc.name, 'Treino concluído! Respeito conquistado.<div class="confessTag">+2 força · dano +25% (temporário)</div>', '<button class="btn" id="dlgOk2">Combatente!</button>');
    } else if (npc.event === 'saber' && casta === 'mago') {
      p.int += 3;
      npc.eventDone = true;
      this.burst(p.x, p.y - 20, '#7a6bd8', 12, 200);
      this.text(p.x, p.y - 30, 'INT +3', '#b07cff', 16);
      this.sfx.upgrade();
      this.showDialog(npc.name, 'A sabedoria flui dos glifos.<div class="confessTag">+3 inteligência</div>', '<button class="btn" id="dlgOk2">Erudito!</button>');
    }
    byId('dlgOk2').onclick = () => this.closeDialog();
    this.hud();
  },

  // Estabelecimentos por casta
  openBuilding(npc) {
    const p = this.player;
    const casta = p.sub.casta;
    const sub = p.sub;
    const gold = p.gold;
    let html = '';
    if (npc.kind === 'church') {
      html = `<h2><span class="bldIcon">⛪</span> ${npc.name}</h2><div class="bldSub">Casa do Clero — lugar seguro</div><div class="goldline">Ouro: <b>${gold}</b></div><div class="items">`;
      // Ações específicas por grau
      // Diácono: Proclamar Palavra (não cura/missa, mas bénção de estudo)
      if (!sub.ordained && sub.exorcistLevel === 0) {
        html += `<div class="item"><div><b>Proclamar Palavra</b><div class="desc">Ler o Evangelho para a assembleia. +10 de inteligência temporário. (Grátis)</div></div><button class="btn" data-bact="proclaim">Proclamar</button></div>`;
      }
      // Padre: Missa (cura total + buff)
      if (sub.ordained && sub.exorcistLevel >= 1) {
        html += `<div class="item"><div><b>Missa</b><div class="desc">Celebrar a Eucaristia. Cura total e +30 de vida máxima. (100 ●)</div></div><button class="btn" data-bact="mass">Missa</button></div>`;
      }
      // Bispo: Crisma e Ordenação
      if (sub.exorcistLevel >= 2) {
        html += `<div class="item"><div><b>Crisma</b><div class="desc">Administrar Crisma/Confirmação. +40 de vida máxima e +2 inteligência permanentes. (200 ●)</div></div><button class="btn" data-bact="chrism">Crisma</button></div>`;
        html += `<div class="item"><div><b>Ordenar</b><div class="desc">Ordenar novo Diácono/Padre. Recompensa divina única. (300 ●)</div></div><button class="btn" data-bact="ordain">Ordenar</button></div>`;
      }
      // Padre também pode fazer Missa se exorcistLevel == 1 (já coberto acima)
      // Todas as classes podem rezar (grátis)
      html += `<div class="item"><div><b>Rezar</b><div class="desc">Recupera toda a vida. (Grátis)</div></div><button class="btn" data-bact="pray">Rezar</button></div>`;
      html += `<div class="item"><div><b>Estudar Escrituras</b><div class="desc">+15 de vida máxima.<br>Custo crescente.</div></div><button class="btn" data-bact="bless">${100 + (this.shopN.igrejabless || 0) * 60}</button></div>`;
      html += `<div class="item"><div><b>Liturgia</b><div class="desc">Um trecho da palavra. Descobre parte da lore do Clero.</div></div><button class="btn" data-bact="liturgia">Ouvir</button></div>`;
      if (casta !== 'clero') html += `<div class="hint">O clero sente sua presença, mas nada cobra pela reza.</div>`;
    } else if (npc.kind === 'tavern') {
      html = `<h2><span class="bldIcon">🍺</span> ${npc.name}</h2><div class="bldSub">Ponto do Povo — músculos e histórias</div><div class="goldline">Ouro: <b>${gold}</b></div><div class="items">`;
      html += `<div class="item"><div><b>Cerveja & Caldo</b><div class="desc">Recupera toda a vida. (30 ●)</div></div><button class="btn" data-bact="drink">30</button></div>`;
      html += `<div class="item"><div><b>Histórias de Guerra</b><div class="desc">Revela segredos da fronteira.</div></div><button class="btn" data-bact="hist">Ouvir</button></div>`;
      if (casta === 'populum') html += `<div class="item"><div><b>Treino Forjado</b><div class="desc">+5 de força permanente. (150 ●)</div></div><button class="btn" data-bact="train">150</button></div>`;
    } else { // tower
      html = `<h2><span class="bldIcon">🔮</span> ${npc.name}</h2><div class="bldSub">Torre Arcana — saber e mistério</div><div class="goldline">Ouro: <b>${gold}</b></div><div class="items">`;
      html += `<div class="item"><div><b>Meditar</b><div class="desc">Recupera a vida e abre os canais. (Grátis)</div></div><button class="btn" data-bact="med"></button></div>`;
      html += `<div class="item"><div><b>Grimório da Torre</b><div class="desc">Revela a história do véu arcano.</div></div><button class="btn" data-bact="grim">Ler</button></div>`;
      if (casta === 'mago') html += `<div class="item"><div><b>Consulta Arcano</b><div class="desc">+6 de inteligência permanente. (150 ●)</div></div><button class="btn" data-bact="consult">150</button></div>`;
    }
    html += `</div><button class="btn ghost" id="closeBld">Sair (Esc)</button>`;
    byId('bldPanel').innerHTML = html;
    byId('bldPanel').querySelectorAll('[data-bact]').forEach(b => b.onclick = () => this.buildingAction(npc, b.dataset.bact));
    byId('closeBld').onclick = () => this.closeOverlay();
  },

  buildingAction(npc, act) {
    const p = this.player;
    const casta = p.sub.casta;
    const sub = p.sub;
    const ok = (goldCost) => { if (this.cheats.gold) return true; if (p.gold >= goldCost) { p.gold -= goldCost; return true; } this.banner('Ouro insuficiente', '#ff5c5c', 1.5); return false; };

    if (npc.kind === 'church') {
      if (act === 'pray') {
        p.hp = p.maxHp;
        p.status.venom = 0; p.status.dmg = 0; p.status.spd = 0; p.status.dur = 0;
        this.blessingFx(p, '#ffe66d', 16);
        this.sfx.heal();
        this.banner('Você reza e nada mais te alcança.', '#ffe9b0', 2);
      } else if (act === 'bless') {
        if (!ok(100 + (this.shopN.igrejabless || 0) * 60)) { this.openBuilding(npc); return; }
        this.shopN.igrejabless = (this.shopN.igrejabless || 0) + 1;
        p.maxHp += 15; p.hp += 15;
        this.blessingFx(p, '#fff3b0', 14);
        this.sfx.buy();
        this.banner('Bênção permanente: +15 de vida máxima', '#ffe9b0', 2.2);
      } else if (act === 'liturgia') {
        if (casta === 'clero') this.discoverLore('clero', this.loreDiscovered.clero.includes('chamado') ? 'promessa' : 'chamado');
        else this.discoverLore(casta === 'mago' ? 'mago' : 'populum', casta === 'mago' ? 'veo' : 'fronteira');
      } else if (act === 'proclaim' && !sub.ordained && sub.exorcistLevel === 0) {
        // Diácono: Proclamar Palavra
        // Verificar cooldown - não permitir proclamar novamente enquanto fatigue durar
        if (p.status.fatigue > 0) {
          this.banner('Cansaço: espere a proclamação terminar', '#ffb020', 1.5);
          this.openBuilding(npc);
          return;
        }
        // Escolher passagem bíblica aleatória para a proclamação
        const passagens = [
          '"O Senhor é o meu pastor; nada me faltarei." - Salmo 23:1',
          '"Eu vim para que tenham vida, e a tenham em abundância." - João 10:10',
          '"Acredita em mim, e serás salvo." - Atos 16:31',
          '"A graça do nosso Senhor Jesus Cristo, o amor de Deus e a comunhão do Espírito Santo esteja com todos vós." - 2 Coríntios 13:14',
          '"Posso tudo naquele que me fortalece." - Filipenses 4:13'
        ];
        const passagem = passagens[Math.floor(Math.random() * passagens.length)];
        // Bônus temporário de inteligência com exaustão após
        p.int += 5; // bônus menor, temporário
        p.status.fatigue = 20; // 20s de exaustão após proclamar
        this.burst(p.x, p.y - 20, '#bfe8ff', 8, 150);
        this.text(p.x, p.y - 30, 'INT +5 TEMP.', '#bfe8ff', 14);
        this.sfx.buff();
        this.banner('Palavra proclamada: ' + passagem, '#bfe8ff', 3);
        this.openBuilding(npc);
      } else if (act === 'mass' && sub.ordained && sub.exorcistLevel >= 1) {
        // Padre: Missa
        p.hp = p.maxHp + 30;
        p.maxHp += 30;
        this.blessingFx(p, '#ffe66d', 16);
        this.sfx.heal();
        this.banner('Missa celebrada: vida +30 (permanente)', '#ffe66d', 3);
        this.openBuilding(npc);
      } else if (act === 'chrism' && sub.exorcistLevel >= 2) {
        // Bispo: Crisma
        p.maxHp += 40; p.int += 2;
        this.sparkleFx(p, '#7a6bd8', 16);
        this.sfx.upgrade();
        this.banner('Crisma administrado: vida +40, inteligência +2 (permanentes)', '#7a6bd8', 3);
        this.openBuilding(npc);
      } else if (act === 'ordain' && sub.exorcistLevel >= 2) {
        // Bispo: Ordenar (premiação única)
        this.banner('Um novo ministro ungido surge em Eclésia.', '#c0392b', 3);
        this.sfx.buy();
        this.stats.powerups++;
        this.openBuilding(npc);
      }
    } else if (npc.kind === 'tavern') {
      if (act === 'drink') {
        if (!ok(30)) { this.openBuilding(npc); return; }
        p.hp = p.maxHp;
        this.sfx.heal();
        this.banner('Cerveja e caldo quente! Vida cheia.', '#ffd27f', 2);
      } else if (act === 'hist') {
        if (casta === 'populum') this.discoverLore('populum', this.loreDiscovered.populum.includes('fronteira') ? 'guarnicao' : 'fronteira');
        else this.discoverLore('populum', 'fronteira');
      } else if (act === 'train') {
        if (!ok(150)) { this.openBuilding(npc); return; }
        p.str += 5;
        this.burst(p.x, p.y - 20, '#c0392b', 12, 200);
        this.sfx.upgrade();
        this.banner('Músculo de aço: +5 de força', '#ff9d5c', 2);
      }
    } else { // tower
      if (act === 'med') {
        p.hp = p.maxHp;
        const sk = p.allSkills();
        sk.forEach(s => { p.cd[s.id] = 0; });
        this.sparkleFx(p, '#c0b4ff', 16);
        this.sfx.heal();
        this.banner('Mente clara: vida e habilidades restauradas', '#c0b4ff', 2);
      } else if (act === 'grim') {
        this.discoverLore('mago', 'veo');
      } else if (act === 'consult') {
        if (!ok(150)) { this.openBuilding(npc); return; }
        p.int += 6;
        this.sparkleFx(p, '#7a6bd8', 16);
        this.sfx.upgrade();
        this.banner('Saber arcano: +6 de inteligência', '#b07cff', 2);
      }
    }
    this.openBuilding(npc);
    this.hud();
  },

  blessingFx(p, color, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.283;
      this.particles.push(new Particle({
        x: p.x + Math.cos(a) * rand(10, 40), y: p.y + rand(-10, 30),
        vx: -Math.cos(a) * 40, vy: -90 - Math.random() * 60, life: 0.9, color, size: rand(3, 6), grav: -160
      }));
    }
  },

  sparkleFx(p, color, n) {
    for (let i = 0; i < n; i++) {
      this.particles.push(new Particle({
        x: p.x + rand(-24, 24), y: p.y + rand(-20, 20),
        vx: rand(-50, 50), vy: rand(-50, 50), life: 0.6, color, size: rand(2, 4), grav: 0
      }));
    }
  },

  closeOverlay() {
    byId('shop').classList.add('hidden');
    byId('forge').classList.add('hidden');
    byId('guide').classList.add('hidden');
    byId('cheatpanel').classList.add('hidden');
    byId('records').classList.add('hidden');
    byId('skills').classList.add('hidden');
    byId('bld').classList.add('hidden');
    byId('dialog').classList.add('hidden');
    byId('bossintro').classList.add('hidden');
    // Restauro robusto do estado play: se o jogador não estiver em menu/morte/vitória,
    // o jogo volta sempre ao jogável — inclusive se state ficou "preso".
    if (this.state !== 'death' && this.state !== 'win' && this.state !== 'menu') this.state = 'play';
  },

  pause(v) {
    this.state = v ? 'paused' : 'play';
    byId('pause').classList.toggle('hidden', !v);
  },

  toggleMute() {
    this.sfx.muted = !this.sfx.muted;
    this.banner(this.sfx.muted ? 'Som desativado (M)' : 'Som ativado (M)', '#fff', 1);
  },

  toggleCheatBar(v) {
    const bar = byId('cheatbar');
    const input = byId('cheatInput');
    const show = v !== undefined ? v : bar.classList.contains('hidden');
    bar.classList.toggle('hidden', !show);
    if (show) input.focus();
    else input.blur();
  },

  runCheat(raw) {
    if (!this.player) { this.banner('Inicie o jogo primeiro', '#ffd23f', 1.5); return; }
    const p = this.player;
    let cmd = String(raw || '').trim().toLowerCase();
    if (!cmd) return;
    if (cmd[0] === '/') cmd = cmd.slice(1);
    const parts = cmd.split(/\s+/);
    const key = parts[0];
    const num = parts[1] !== undefined ? parseInt(parts[1], 10) : NaN;

    const cheats = {
      'ouroinfinito': ['gold', 'Ouro infinito'],
      'vidainfinita': ['hp', 'Vida infinita'],
      'stats': ['panel', 'Painel de cheats'],
      'gold': ['gold', 'Ouro infinito'],
      'hp': ['hp', 'Vida infinita']
    };
    if (cheats[key]) {
      const [kind, label] = cheats[key];
      if (kind === 'panel') {
        this.openCheatPanel();
        this.banner('Painel de cheats', '#ffd23f', 1.5);
        return;
      }
      this.cheats[kind] = !this.cheats[kind];
      this.banner(this.cheats[kind] ? label + ' ATIVADO' : label + ' desativado', this.cheats[kind] ? '#7cff8a' : '#ff9d5c', 1.8);
      if (this.cheats.hp) p.hp = p.maxHp;
      if (this.cheats.gold) p.gold = 999999;
      this.hud();
      return;
    }

    if (!Number.isNaN(num)) {
      switch (key) {
        case 'ouro': p.gold = Math.max(0, num); this.hud(); this.banner('Ouro: ' + p.gold, '#ffd23f', 1.5); return;
        case 'forca': p.str = Math.max(0, num); this.hud(); this.banner('Força: ' + p.str, '#ff9d5c', 1.5); return;
        case 'int': case 'inteligencia': p.int = Math.max(0, num); this.hud(); this.banner('Inteligência: ' + p.int, '#ff9d5c', 1.5); return;
        case 'vel': case 'velocidade': p.spd = Math.max(0, num); this.hud(); this.banner('Velocidade: ' + p.spd, '#ff9d5c', 1.5); return;
        case 'vida': p.maxHp = Math.max(1, num); p.hp = p.maxHp; this.hud(); this.banner('Vida máx: ' + p.maxHp, '#7cff8a', 1.5); return;
        case 'dano': p.weapon.dmg = Math.max(0, num); this.hud(); this.banner('Dano: ' + p.weapon.dmg, '#ff9d5c', 1.5); return;
        case 'tier': p.weapon.tier = Math.max(0, num); p.weapon.dmg = weaponDamage(p.weapon); this.hud(); this.banner('Arma nível +' + p.weapon.tier + ' (dano ' + p.weapon.dmg + ')', '#ff9d5c', 1.5); return;
      }
    } else {
      switch (key) {
        case 'curar': case 'heal': p.hp = p.maxHp; this.burst(p.x, p.y - 20, '#7cff8a', 14, 200); this.banner('Curado!', '#7cff8a', 1.2); return;
        case 'matar': case 'kill': this.monsters.forEach(m => this.killMonster(m)); this.banner('Monstros eliminados', '#ff6b6b', 1.5); return;
        case 'ajuda': case 'help': this.helpCheats(); return;
        case 'get': case 'obter': this.giveItem(cmd); return;
      }
    }

    this.banner('Cheat desconhecido: ' + cmd, '#ff5c5c', 2);
  },

  helpCheats() {
    const list = [
      'ouroinfinito / vidainfinita — toggles',
      'stats — abre o painel',
      'ouro 1000 · forca 50 · int 50 · vel 30 · vida 500',
      'dano 200 · tier 10',
      'get thompson · get pistola · get minigun · get sniper · get destruidora',
      'get granada x100 · get exorcismo x5',
      'curar · matar · ajuda'
    ];
    this.banner(list.join('  |  '), '#ffe9b0', 4);
  },

  giveItem(cmd) {
    const p = this.player;
    let name = String(cmd).replace(/^get\s+/i, '').replace(/^obter\s+/i, '').trim().toLowerCase();
    if (!name) { this.banner('Uso: get <arma ou item> [x<quantidade>]', '#ffd23f', 2); return; }
    
    let qty = 1;
    const qtyMatch = name.match(/x(\d+)$/);
    if (qtyMatch) {
      qty = parseInt(qtyMatch[1], 10);
      name = name.replace(/x\d+$/, '').trim();
    }
    
    const w = MODERN_WEAPONS[name];
    if (w) {
      p.mw = w;
      this.banner(name + ' equipado!', w.color, 2);
      this.burst(p.x, p.y - 20, w.color, 12, 180);
      this.sfx.upgrade();
      this.hud();
      return;
    }
    const it = MODERN_ITEMS[name];
    if (it) {
      p.items[it.id] = (p.items[it.id] || 0) + qty;
      this.banner(it.name + ' obtida (x' + p.items[it.id] + ') — tecla ' + it.key, it.color, 2);
      this.burst(p.x, p.y - 20, it.color, 12, 180);
      this.sfx.pick();
      this.hud();
      return;
    }
    this.banner('Item desconhecido: ' + name, '#ff5c5c', 2);
  },

  useModernItem(id) {
    const p = this.player;
    if (!p || !p.items || p.items[id] <= 0) return;
    if (id === 'granada') {
      p.items[id]--;
      const ang = p.aimAng;
      const speed = 350;
      this.projectiles.push(new Projectile({
        x: p.x + Math.cos(ang) * 16, y: p.y + Math.sin(ang) * 16 - 20,
        vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed - 200,
        dmg: this.calcStatDmg(T.PHYS, 3.5), type: T.PHYS, color: '#ff8800', size: 10,
        life: 3, aoe: 120, explode: true, clearTree: true, owner: 'player',
        trail: true, solid: false, gravity: 800, groundExplode: true
      }));
      this.sfx.throw();
      this.hud();
    } else if (id === 'exorcismo') {
      // Bloqueia Diácono de usar exorcismo moderno.
      if (p.sub.exorcistLevel === 0) {
        this.banner('Apenas Padres e Bispos podem realizar exorcismos.', '#ff5c5c', 2);
        return;
      }
      p.items[id]--;
      const x0 = this.cam.x, x1 = this.cam.x + this.cw;
      const y0 = this.cam.y, y1 = this.cam.y + this.ch;
      let n = 0;
      for (const m of this.monsters) {
        if (m.dying || m.dead) continue;
        if (m.x >= x0 - 60 && m.x <= x1 + 60 && m.y >= y0 - 60 && m.y <= y1 + 60) {
          this.damageMonster(m, 99999, T.MAGIC);
          n++;
        }
      }
      // Aplica fadiga a Padre (level 1) ou Bispo (level 2).
      if (p.sub.exorcistLevel >= 1) {
        p.status.fatigue = Math.max(p.status.fatigue || 0, s.cd || 20); // 20s de fadiga
        // Efeito visual: reduzir velocidade à metade por 20s já tratado no update do Player.
        this.burst(p.x, p.y, '#fff3b0', 20, 300);
        this.ring(p.x, p.y, 260, 0.8, '#fff3b0', 6);
        this.shake += 10;
        this.banner(p.sub.exorcistLevel === 2 ? 'Grande Exorcismo! ' + n + ' monstros purgados' : 'Exorcismo! ' + n + ' monstros purgados', '#fff3b0', 2);
      }
      this.hud();
    }
  },

  openCheatPanel() {
    this.state = 'cheats';
    this.buildCheatPanel();
    byId('cheatpanel').classList.remove('hidden');
  },

  applyCheats() {
    const p = this.player;
    if (!p) return;
    const v = id => {
      const el = byId(id);
      const n = parseFloat(el.value);
      return Number.isFinite(n) ? n : 0;
    };
    p.maxHp = Math.max(1, Math.round(v('ch_vida')));
    p.str = Math.max(0, Math.round(v('ch_for')));
    p.int = Math.max(0, Math.round(v('ch_int')));
    p.spd = Math.max(0, Math.round(v('ch_vel')));
    p.gold = Math.max(0, Math.round(v('ch_ouro')));
    p.weapon.dmg = Math.max(0, Math.round(v('ch_dano')));
    p.weapon.tier = Math.max(0, Math.round(v('ch_tier')));
    p.weapon.dmg = weaponDamage(p.weapon);
    p.hp = p.maxHp;
    this.cheats.gold = byId('ch_goldinf').checked;
    this.cheats.hp = byId('ch_hpinf').checked;
    this.sfx.buy();
    this.hud();
    this.banner('Stats aplicados!', '#7cff8a', 1.5);
    this.closeOverlay();
  },

  buildCheatPanel() {
    const p = this.player;
    if (!p) return;
    const el = byId('cheatPanel');
    el.innerHTML = `<h2>PAINEL DE CHEATS</h2>
      <div class="cheatgrid">
        <div class="cheatfield"><label>Vida máx</label><input type="number" id="ch_vida" value="${p.maxHp}"></div>
        <div class="cheatfield"><label>Força</label><input type="number" id="ch_for" value="${p.str}"></div>
        <div class="cheatfield"><label>Inteligência</label><input type="number" id="ch_int" value="${p.int}"></div>
        <div class="cheatfield"><label>Velocidade</label><input type="number" id="ch_vel" value="${p.spd}"></div>
        <div class="cheatfield"><label>Ouro</label><input type="number" id="ch_ouro" value="${p.gold}"></div>
        <div class="cheatfield"><label>Dano da arma</label><input type="number" id="ch_dano" value="${p.weapon.dmg}"></div>
        <div class="cheatfield"><label>Nível da arma</label><input type="number" id="ch_tier" value="${p.weapon.tier}"></div>
        <label class="cheattoggle"><input type="checkbox" id="ch_goldinf" ${this.cheats.gold ? 'checked' : ''}> Ouro infinito</label>
        <label class="cheattoggle"><input type="checkbox" id="ch_hpinf" ${this.cheats.hp ? 'checked' : ''}> Vida infinita</label>
      </div>
      <div class="cheatrow">
        <button class="btn" id="chApply">Aplicar</button>
        <button class="btn ghost" id="chClose">Fechar (Esc)</button>
      </div>
      <div class="cheathint">Comandos: ouroinfinito · vidainfinita · ouro 1000 · forca 50 · int 50 · vel 30 · vida 500 · dano 200 · tier 10 · curar · matar</div>`;
    byId('chApply').onclick = () => this.applyCheats();
    byId('chClose').onclick = () => this.closeOverlay();
  },

  banner(msg, color, dur) {
    const b = byId('banner');
    b.textContent = msg;
    b.style.color = color || '#fff';
    b.classList.remove('hidden');
    this.bannerT = dur || 2.5;
  },

  npcNear() {
    if (!this.player) return null;
    let best = null, bd = 70;
    for (const n of this.npcs) {
      const d = Math.hypot(n.px - this.player.x, n.py - this.player.y);
      if (d < bd) { bd = d; best = n; }
    }
    return best;
  },

  buildShop() {
    const p = this.player;
    const el = byId('shopPanel');
    let html = `<h2>Vendedor</h2><div class="goldline">Ouro: <b>${p.gold}</b></div><div class="items">`;
    for (const id in SHOP) {
      const it = SHOP[id];
      const n = this.shopN[id] || 0;
      const cost = it.cost(n);
      html += `<div class="item"><div><b>${it.name}</b><div class="desc">${it.desc}</div></div><button class="btn" data-buy="${id}">${cost} ●</button></div>`;
    }
    html += `</div><button class="btn ghost" id="closeShop">Fechar (Esc)</button>`;
    el.innerHTML = html;
    el.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => this.buy(b.dataset.buy));
    byId('closeShop').onclick = () => this.closeOverlay();
  },

  buy(id) {
    const p = this.player;
    const it = SHOP[id];
    const n = this.shopN[id] || 0;
    const cost = this.cheats.gold ? 0 : it.cost(n);
    if (p.gold >= cost) {
      p.gold -= cost;
      this.shopN[id] = n + 1;
      it.effect(this, p);
      this.sfx.buy();
      this.burst(p.x, p.y - 20, '#7ec8e3', 10, 160);
      this.buildShop();
      this.hud();
    }
  },

  buildSkillShop() {
    const p = this.player;
    const el = byId('skillsPanel');
    const nextKey = ['R', 'T', 'Y'][p.extraSkills ? p.extraSkills.length : 0];
    let html = `<h2>Mestre das Artes</h2><div class="goldline">Ouro: <b>${p.gold}</b></div><div class="items">`;
    for (const sk of EXTRA_SKILLS) {
      const has = p.extraSkills && p.extraSkills.some(s => s.id === sk.id);
      const maxed = p.extraSkills && p.extraSkills.length >= MAX_EXTRA_SKILLS;
      html += `<div class="item"><div><b>${sk.name}</b><div class="desc">${sk.desc} <span style="opacity:.7">(${nextKey})</span></div></div>${
        has ? '<span class="owned">APRENDIDA</span>'
          : maxed ? '<span class="owned">MÁXIMO</span>'
          : `<button class="btn" data-skill="${sk.id}">${sk.cost} ●</button>`}</div>`;
    }
    html += `<div class="hint">Você pode aprender até ${MAX_EXTRA_SKILLS} habilidades adicionais (R, T, Y).</div>`;
    html += `</div><button class="btn ghost" id="closeSkills">Fechar (Esc)</button>`;
    el.innerHTML = html;
    el.querySelectorAll('[data-skill]').forEach(b => b.onclick = () => this.buySkill(b.dataset.skill));
    byId('closeSkills').onclick = () => this.closeOverlay();
  },

  buySkill(id) {
    const p = this.player;
    const sk = EXTRA_SKILLS.find(s => s.id === id);
    if (!sk || !p.extraSkills) return;
    if (p.extraSkills.length >= MAX_EXTRA_SKILLS) { this.banner('Limite de habilidades atingido', '#ff9d5c', 2); return; }
    if (p.extraSkills.some(s => s.id === id)) return;
    const cost = this.cheats.gold ? 0 : sk.cost;
    if (p.gold < cost) { this.banner('Ouro insuficiente', '#ff5c5c', 1.5); return; }
    p.gold -= cost;
    const newSk = Object.assign({}, sk, { key: ['R', 'T', 'Y'][p.extraSkills.length] });
    delete newSk.cost;
    p.extraSkills.push(newSk);
    p.cd[sk.id] = 0;
    this.sfx.upgrade();
    this.burst(p.x, p.y - 20, sk.color, 14, 200);
    this.buildSkillbar();
    this.buildSkillShop();
    this.hud();
    this.banner(sk.name + ' aprendida!', sk.color, 2);
  },

  buildForge() {
    const p = this.player;
    const w = p.weapon;
    const cost = upgradeCost(w.tier);
    const next = w.base + (w.tier + 1) * 3;
    const el = byId('forgePanel');
    el.innerHTML = `<h2>Ferreiro</h2>
      <div class="weaponinfo">
        <div class="wtitle">${w.name}</div>
        <div class="wrow">Nível <b>+${w.tier}</b></div>
        <div class="wrow">Dano atual: <b>${w.dmg}</b></div>
        <div class="wrow">Próximo nível: dano <b>${next}</b></div>
      </div>
      <div class="goldline">Ouro: <b>${p.gold}</b></div>
      <button class="btn" id="upgBtn">Melhorar (${cost} ●)</button>
      <button class="btn ghost" id="closeForge">Fechar (Esc)</button>`;
    const upg = byId('upgBtn');
    const costBt = this.cheats.gold ? 0 : cost;
    if (this.cheats.gold) upg.textContent = `Melhorar (Grátis)`;
    if (p.gold < costBt) upg.classList.add('disabled');
    upg.onclick = () => {
      if (p.gold >= costBt) {
        p.gold -= costBt;
        w.tier++;
        w.dmg = weaponDamage(w);
        this.sfx.upgrade();
        this.burst(p.x, p.y - 20, '#ffb020', 14, 220);
        this.buildForge();
        this.hud();
      }
    };
    byId('closeForge').onclick = () => this.closeOverlay();
  },

  doAttack() {
    const p = this.player;
    if (p.attackCd > 0) return;
    const atk = p.mw || p.sub.attack;
    p.attackCd = atk.cd;
    p.attackAnim = atk.cd;
    p.attackDur = atk.cd;
    p.combo = (p.combo + 1) % (atk.combo || 1);
    p.comboT = 0.8;
    if (atk.kind === 'melee') {
      this.meleeHit();
      this.sfx.swing();
    } else if (atk.kind === 'aura') {
      this.auraPulse(atk);
      this.sfx.holy();
    } else if (atk.kind === 'auto') {
      this.shootModern(atk);
      this.sfx.shoot();
    } else {
      this.shootPlayer(atk.dmg, atk);
      this.sfx.shoot();
    }
  },

  shootModern(atk) {
    const p = this.player;
    const n = atk.n || 1;
    for (let i = 0; i < n; i++) {
      const off = (i - (n - 1) / 2) * (atk.spread || 0) + (Math.random() - 0.5) * (atk.jitter || 0) / 100;
      const ang = p.aimAng + off;
      const dmg = this.calcStatDmg(atk.type, atk.dmg);
      this.projectiles.push(new Projectile({
        x: p.x + Math.cos(ang) * 16, y: p.y + Math.sin(ang) * 16,
        vx: Math.cos(ang) * atk.speed, vy: Math.sin(ang) * atk.speed,
        dmg, type: atk.type, color: atk.color, size: atk.size || 8, life: 1.3,
        pierce: !!atk.pierce, owner: 'player', trail: true
      }));
    }
  },

  meleeHit() {
    const p = this.player;
    const atk = p.sub.attack;
    const ad = p.aimDir;
    const range = atk.range;
    const base = this.calcStatDmg(atk.type, atk.dmg);
    let hit = false;
    for (const m of this.monsters) {
      if (m.dying || m.dead) continue;
      const dx = m.x - p.x, dy = m.y - p.y;
      const dd = Math.hypot(dx, dy);
      if (dd > range + m.w / 2) continue;
      if (dd < 0.001) { this.damageMonster(m, base, atk.type); hit = true; continue; }
      const dot = (dx * ad.x + dy * ad.y) / dd;
      if (dot < 0.3) continue;
      this.damageMonster(m, base, atk.type);
      hit = true;
    }
    if (hit) this.sfx.hit();
    this.slashEffect(p.x + ad.x * 14, p.y + ad.y * 14, ad);
  },

  calcStatDmg(type, mult) {
    const p = this.player;
    const w = p.weapon.dmg;
    const stat = type === T.PHYS ? p.str : p.int;
    return Math.round((w + stat * 0.7) * mult * (1 + (p.status.dmg || 0)));
  },

  shootPlayer(mult, atk) {
    const p = this.player;
    const dmg = this.calcStatDmg(atk.type, mult);
    this.projectiles.push(new Projectile({
      x: p.x + Math.cos(p.aimAng) * 16, y: p.y + Math.sin(p.aimAng) * 16,
      vx: Math.cos(p.aimAng) * atk.speed, vy: Math.sin(p.aimAng) * atk.speed,
      dmg, type: atk.type, color: atk.color, size: atk.size || 8, life: 1.2,
      pierce: !!atk.pierce, owner: 'player', trail: true
    }));
  },

  auraPulse(atk) {
    const p = this.player;
    const base = this.calcStatDmg(atk.type, atk.dmg);
    let hit = false;
    for (const m of this.monsters) {
      if (m.dying || m.dead) continue;
      if (dist(m, p) < atk.radius + m.w / 2) { this.damageMonster(m, base, atk.type); hit = true; }
    }
    if (hit) this.sfx.hit();
    this.ring(p.x, p.y, atk.radius, 0.45, atk.color, 5);
    this.burst(p.x, p.y, atk.color, 16, 180);
  },

  tickAura(dt) {
    const p = this.player;
    const au = p.sub.aura;
    if (!au || !p) return;
    this.auraT = (this.auraT || 0) - dt;
    if (this.auraT > 0) return;
    this.auraT = au.tick;
    if (this.cheats.hp) p.hp = p.maxHp;
    const dmg = Math.round(this.calcStatDmg(au.type || T.HOLY, au.dmg));
    let hit = false;
    for (const m of this.monsters) {
      if (m.dying || m.dead) continue;
      if (dist(m, p) < au.radius + m.w / 2) { this.damageMonster(m, dmg, au.type || T.HOLY); hit = true; }
    }
    if (hit) {
      this.ring(p.x, p.y, au.radius, 0.25, '#fff3b0', 2);
      if (Math.random() < 0.5) this.burst(p.x, p.y, '#fff3b0', 3, 60);
    }
  },

  castSkill(i) {
    const p = this.player;
    const skills = p.allSkills();
    const s = skills[i];
    if (!s || p.cd[s.id] > 0) return;
    p.cd[s.id] = s.cd;
    switch (s.id) {
      case 'heal': {
        const amt = Math.round(p.maxHp * s.heal);
        p.hp = Math.min(p.maxHp, p.hp + amt);
        this.text(p.x, p.y - 26, '+' + amt, '#7cff8a', 18);
        this.healEffect(p);
        this.sfx.heal();
        break;
      }
      case 'holyWave': this.shootPlayerSkill(s); break;
      case 'shield':
        p.status.shield = s.shield;
        p.status.shieldT = s.dur;
        this.burst(p.x, p.y, '#ffe9a0', 12, 180);
        this.sfx.buff();
        break;
      case 'julgamento': this.shootPlayerSkill(s); break;
      case 'homing': this.shootPlayerSkill(s); break;
      case 'bless':
        p.status.dmg = s.dmg; p.status.spd = s.spd; p.status.dur = s.dur;
        this.burst(p.x, p.y, '#ffe66d', 12, 180);
        this.sfx.buff();
        break;
      case 'spin': this.spinAttack(s); break;
      case 'dash': {
        let ang;
        if (this.mouseActive) ang = Math.atan2(this.aim.y - p.y, this.aim.x - p.x);
        else if (p.mv.x !== 0 || p.mv.y !== 0) ang = Math.atan2(p.mv.y, p.mv.x);
        else ang = p.facing > 0 ? 0 : Math.PI;
        p.dashT = 0.28;
        p.dashDir = { x: Math.cos(ang), y: Math.sin(ang) };
        p.dashDmg = this.calcStatDmg(s.type, s.dmg);
        p.dashType = s.type;
        p.dashHit = new Set();
        this.sfx.dash();
        break;
      }
      case 'spread': this.spreadShot(s); break;
      case 'rain': this.rainArrows(s); break;
      case 'grenade': this.throwGrenade(s); break;
      case 'overclock':
        p.status.dmg = s.dmg; p.status.spd = s.spd; p.status.dur = s.dur;
        this.burst(p.x, p.y, '#7cffb0', 10, 160);
        this.sfx.buff();
        break;
      case 'fireball': this.shootPlayerSkill(s); break;
      case 'meteor': this.meteor(s); break;
      case 'push': this.pushWave(s); break;
      case 'blink': {
        let ang;
        if (this.mouseActive) ang = Math.atan2(this.aim.y - p.y, this.aim.x - p.x);
        else if (p.mv.x !== 0 || p.mv.y !== 0) ang = Math.atan2(p.mv.y, p.mv.x);
        else ang = p.facing > 0 ? 0 : Math.PI;
        const dist = s.dist || 190;
        let tx = p.x, ty = p.y;
        for (let i = 1; i <= 20; i++) {
          const nx = p.x + Math.cos(ang) * dist * (i / 20);
          const ny = p.y + Math.sin(ang) * dist * (i / 20);
          const b = { x: nx - p.w / 2, y: ny - p.h / 2, w: p.w, h: p.h };
          if (this.world.solidBox(b)) break;
          tx = nx; ty = ny;
        }
        this.burst(p.x, p.y, '#d8b4ff', 12, 180);
        p.x = tx; p.y = ty;
        this.burst(p.x, p.y, '#d8b4ff', 12, 180);
        this.sfx.dash();
        break;
      }
      case 'beam': this.beam(s); break;
      case 'aura':
        p.status.dmg = s.dmg; p.status.regen = s.heal; p.status.dur = s.dur;
        this.burst(p.x, p.y, '#c4ffb0', 12, 160);
        this.sfx.buff();
        break;
      case 'reza_maior': this.rezaMaior(s); break;
      case 'estrela': this.shootPlayerSkill(s); break;
      case 'vendaval': this.vendaval(s); break;
      case 'sobreavida':
        p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * s.heal));
        this.healEffect(p);
        this.sfx.heal();
        break;
      case 'passo_luz': this.passoLuz(s); break;
    }
  },

  rezaMaior(s) {
    const p = this.player;
    const dmg = this.calcStatDmg(s.type, s.dmg);
    let hit = false;
    for (const m of this.monsters) {
      if (m.dying || m.dead) continue;
      if (dist(m, p) < s.radius + m.w / 2) { this.damageMonster(m, dmg, s.type); hit = true; }
    }
    this.ring(p.x, p.y, s.radius, 0.5, s.color, 5);
    this.burst(p.x, p.y, s.color, 16, 200);
    if (hit) this.sfx.hit();
    this.sfx.skill();
  },

  vendaval(s) {
    const p = this.player;
    const dmg = this.calcStatDmg(s.type, s.dmg);
    let hit = false;
    for (const m of this.monsters) {
      if (m.dying || m.dead) continue;
      const d = dist(m, p);
      if (d < s.radius + m.w / 2) {
        this.damageMonster(m, dmg, s.type);
        hit = true;
        const a = Math.atan2(m.y - p.y, m.x - p.x);
        m.vx += Math.cos(a) * (s.knock || 500) * (1 - d / s.radius);
        m.vy += Math.sin(a) * (s.knock || 500) * (1 - d / s.radius);
      }
    }
    this.ring(p.x, p.y, s.radius, 0.4, s.color, 6);
    this.burst(p.x, p.y, s.color, 12, 200);
    this.sfx.skill();
  },

  passoLuz(s) {
    const p = this.player;
    let ang;
    if (this.mouseActive) ang = Math.atan2(this.aim.y - p.y, this.aim.x - p.x);
    else if (p.mv.x !== 0 || p.mv.y !== 0) ang = Math.atan2(p.mv.y, p.mv.x);
    else ang = p.facing > 0 ? 0 : Math.PI;
    const dist = s.dist || 220;
    let tx = p.x, ty = p.y;
    for (let i = 1; i <= 20; i++) {
      const nx = p.x + Math.cos(ang) * dist * (i / 20);
      const ny = p.y + Math.sin(ang) * dist * (i / 20);
      const b = { x: nx - p.w / 2, y: ny - p.h / 2, w: p.w, h: p.h };
      if (this.world.solidBox(b) || this.world.gateBox(b)) break;
      tx = nx; ty = ny;
    }
    this.burst(p.x, p.y, '#ffe9a0', 12, 180);
    p.x = tx; p.y = ty;
    this.burst(p.x, p.y, '#ffe9a0', 12, 180);
    this.sfx.dash();
  },

  shootPlayerSkill(s) {
    const p = this.player;
    const dmg = this.calcStatDmg(s.type || T.HOLY, s.dmg);
    this.projectiles.push(new Projectile({
      x: p.x + Math.cos(p.aimAng) * 18, y: p.y + Math.sin(p.aimAng) * 18,
      vx: Math.cos(p.aimAng) * s.speed, vy: Math.sin(p.aimAng) * s.speed,
      dmg, type: s.type || T.HOLY, color: s.color, size: s.size || 12, life: 1.6,
      pierce: !!s.pierce, aoe: s.radius || 0, owner: 'player', trail: true,
      homing: !!s.homing
    }));
    this.sfx.skill();
  },

  spinAttack(s) {
    const p = this.player;
    const dmg = this.calcStatDmg(s.type, s.dmg);
    for (const m of this.monsters) {
      if (m.dying || m.dead) continue;
      if (dist(m, p) < s.radius + m.w / 2) this.damageMonster(m, dmg, s.type);
    }
    this.burst(p.x, p.y, s.color, 16, 220);
    this.ring(p.x, p.y, s.radius, 0.4, s.color, 5);
    this.shake += 5;
    this.sfx.skill();
  },

  dashHit(p) {
    const box = { x: p.x - p.w * 0.7, y: p.y - p.h * 0.5, w: p.w * 1.4, h: p.h };
    for (const m of this.monsters) {
      if (m.dying || m.dead || p.dashHit.has(m)) continue;
      if (rectOverlap(box, m.box())) {
        p.dashHit.add(m);
        this.damageMonster(m, p.dashDmg, p.dashType);
      }
    }
  },

  spreadShot(s) {
    const p = this.player;
    const dmg = this.calcStatDmg(s.type, s.dmg);
    for (let k = 0; k < s.n; k++) {
      const off = (k - (s.n - 1) / 2) * s.spread;
      const ang = p.aimAng + off;
      this.projectiles.push(new Projectile({
        x: p.x + Math.cos(ang) * 16, y: p.y + Math.sin(ang) * 16,
        vx: Math.cos(ang) * s.speed, vy: Math.sin(ang) * s.speed,
        dmg, type: s.type, color: s.color, size: 7, life: 1.1, owner: 'player', trail: true
      }));
    }
    this.sfx.skill();
  },

  throwGrenade(s) {
    const p = this.player;
    const dmg = this.calcStatDmg(s.type, s.dmg);
    this.projectiles.push(new Projectile({
      x: p.x + Math.cos(p.aimAng) * 16, y: p.y + Math.sin(p.aimAng) * 16,
      vx: Math.cos(p.aimAng) * 420, vy: Math.sin(p.aimAng) * 420,
      dmg, type: s.type, color: '#ffb020', size: 8, life: 1.6,
      aoe: s.radius, explode: true, clearTree: true, owner: 'player', trail: true
    }));
    this.sfx.skill();
  },

  rainArrows(s) {
    const p = this.player;
    const tx = this.mouseActive ? this.aim.x : p.x + Math.cos(p.aimAng) * 160;
    const ty = this.mouseActive ? this.aim.y : p.y + Math.sin(p.aimAng) * 160;
    this.ring(tx, ty, s.radius, 0.5, s.color, 2);
    this.delayed.push({ t: s.delay, fn: () => {
      for (let k = 0; k < s.n; k++) {
        const ang = Math.random() * 6.283;
        const r = rand(s.radius * 0.4, s.radius + 20);
        const px = tx + Math.cos(ang) * r;
        const py = ty + Math.sin(ang) * r;
        this.delayed.push({ t: k * 0.06, fn: () => this.rainArrow(px, py, tx, ty, s) });
      }
    } });
    this.sfx.skill();
  },

  rainArrow(x, y, tx, ty, s) {
    const dx = tx - x, dy = ty - y;
    const l = Math.hypot(dx, dy) || 1;
    const speed = 760;
    const dmg = this.calcStatDmg(s.type, s.dmg);
    this.projectiles.push(new Projectile({
      x, y,
      vx: dx / l * speed, vy: dy / l * speed,
      dmg, type: s.type, color: s.color, size: 6, life: l / speed + 0.25,
      pierce: true, owner: 'player', solid: false, trail: false
    }));
  },

  meteor(s) {
    const p = this.player;
    const tx = this.mouseActive ? this.aim.x : p.x + p.facing * 200;
    const ty = this.mouseActive ? this.aim.y : p.y;
    this.ring(tx, ty, s.radius, 0.7, '#ff5c5c', 4);
    this.delayed.push({ t: s.delay, fn: () => {
      this.burst(tx, ty, '#ff5c5c', 24, 320);
      this.burst(tx, ty, '#ffb020', 14, 200, 5, 500);
      this.shake += 12;
      this.sfx.explosion();
      const dmg = this.calcStatDmg(s.type, s.dmg);
      for (const m of this.monsters) {
        if (m.dying || m.dead) continue;
        if (dist(m, { x: tx, y: ty }) < s.radius + m.w / 2) this.damageMonster(m, dmg, s.type);
      }
    } });
  },

  pushWave(s) {
    const p = this.player;
    const dmg = this.calcStatDmg(s.type, s.dmg);
    for (const m of this.monsters) {
      if (m.dying || m.dead) continue;
      const d = dist(m, p);
      if (d < s.radius + m.w / 2) {
        this.damageMonster(m, dmg, s.type);
        const k = (1 - d / s.radius) * 0.5 + 0.5;
        const a = Math.atan2(m.y - p.y, m.x - p.x);
        m.vx += Math.cos(a) * s.knock * k;
        m.vy += Math.sin(a) * s.knock * k;
      }
    }
    this.ring(p.x, p.y, s.radius, 0.4, s.color, 6);
    this.burst(p.x, p.y, s.color, 14, 200);
    this.shake += 6;
    this.sfx.skill();
  },

  beam(s) {
    const p = this.player;
    const tx = this.mouseActive ? this.aim.x : p.x + p.facing * s.range;
    const ty = this.mouseActive ? this.aim.y : p.y;
    const dx = tx - p.x, dy = ty - p.y;
    const d = Math.hypot(dx, dy) || 1;
    const ux = dx / d, uy = dy / d;
    const dmg = this.calcStatDmg(s.type, s.dmg);
    for (const m of this.monsters) {
      if (m.dying || m.dead) continue;
      const mx = m.x - p.x, my = m.y - p.y;
      const proj = mx * ux + my * uy;
      if (proj > 0 && proj < s.range) {
        const perp = Math.abs(mx * uy - my * ux);
        if (perp < 26 + m.w / 2) this.damageMonster(m, dmg, s.type);
      }
    }
    this.beamEffect(p.x, p.y, ux, uy, s.range, s.color);
    this.shake += 8;
    this.sfx.skill();
  },

  beamEffect(x, y, ux, uy, range, color) {
    for (let i = 0; i < 26; i++) {
      const k = (i / 25) * range;
      const jx = x + ux * k + rand(-6, 6);
      const jy = y + uy * k + rand(-6, 6);
      this.particles.push(new Particle({ x: jx, y: jy, vx: rand(-20, 20), vy: rand(-60, -10), life: 0.4, color, size: rand(3, 6), grav: 0 }));
    }
  },

  slashEffect(x, y, ad) {
    const px = -ad.y, py = ad.x;
    for (let i = 0; i < 10; i++) {
      const across = rand(-12, 12);
      const along = rand(-20, 20);
      this.particles.push(new Particle({
        x: x + px * across + ad.x * along,
        y: y + py * across + ad.y * along,
        vx: ad.x * rand(0, 60) + px * rand(-80, 80),
        vy: ad.y * rand(0, 60) + py * rand(-80, 80),
        life: 0.25, color: i % 2 ? '#fff' : '#ffd6a5', size: 4, grav: 0
      }));
    }
  },

  healEffect(p) {
    for (let i = 0; i < 14; i++) {
      this.particles.push(new Particle({
        x: p.x + rand(-14, 14), y: p.y + rand(-10, 16),
        vx: rand(-20, 20), vy: rand(-90, -40), life: 0.7,
        color: '#7cff8a', size: rand(3, 6), grav: -200
      }));
    }
  },

  ring(x, y, r, life, color, width) {
    this.rings.push(new Ring(x, y, r, life, color, width));
  },

  nearestMonster(x, y, maxD) {
    let best = null, bd = maxD;
    for (const m of this.monsters) {
      if (m.dying || m.dead) continue;
      const d = Math.hypot(m.x - x, m.y - y);
      if (d < bd) { bd = d; best = m; }
    }
    return best;
  },

  damageMonster(m, base, type, src) {
    if (m.dying || m.dead) return;
    const mult = m.weakMult(type);
    const dmg = Math.max(1, Math.round(base * mult));
    m.hp -= dmg;
    m.hitT = 0.12;
    this.stats.dmgDealt += dmg;
    const color = mult > 1 ? '#ffd23f' : mult < 1 ? '#9aa0aa' : '#ffffff';
    const size = mult > 1 ? 16 : mult < 1 ? 12 : 14;
    this.text(m.x, m.y - 20, dmg, color, size);
    this.burst(m.x, m.y - 8, color, mult > 1 ? 8 : 5, 130);
    this.shake += mult > 1 ? 4 : 2;
    this.sfx.hit();
    this.addCombo(1);
    if (this.comboStreak > this.stats.maxCombo) this.stats.maxCombo = this.comboStreak;
    if (m.def.venom) m.venomT = 3;
    if (m.isBoss && dmg > 0 && m.hp > 0) this.checkBossPhase(m);
    if (m.hp <= 0) this.killMonster(m);
  },

  addCombo(k) {
    this.comboStreak = this.comboStreak || 0;
    this.comboStreak += k;
    this.comboT = 2.5;
  },

  checkBossPhase(m) {
    if (m.bossInfo && m.maxHp > 0) {
      const phase = m.bossInfo.phases.filter((p, i) => m.hp <= p.hp && i > m.bossPhase).sort((a, b) => b.hp - a.hp)[0];
      if (phase) {
        m.bossPhase = m.bossInfo.phases.indexOf(phase);
        this.banner(phase.banner || m.def.name + ' enfureceu!', '#ff6b6b', 2.5);
        this.burst(m.x, m.y, '#ffd23f', 20, 320);
        this.ring(m.x, m.y, m.w, 0.6, '#ffd23f', 6);
        this.shake += 10;
        this.sfx.boss();
      }
    }
  },

  selfDestruct(m) {
    if (m.dying || m.dead) return;
    const p = this.player;
    m.dying = true; m.dieT = 0.1; m.dead = true;
    const r = 50;
    this.burst(m.x, m.y, '#d966ff', 16, 260);
    this.ring(m.x, m.y, r, 0.4, '#d966ff', 5);
    this.burst(m.x, m.y, '#ffb020', 8, 160);
    this.shake += 6;
    this.sfx.explosion();
    if (p.hp > 0 && Math.hypot(p.x - m.x, p.y - m.y) < r + p.w / 2) this.damagePlayer(Math.round(m.def.dmg));
  },

  killMonster(m) {
    const d = m.def;
    if (d.explodeOnDeath) { this.selfDestruct(m); return; }
    m.dying = true;
    m.dieT = 0.3;
    this.burst(m.x, m.y, d.color, 16, 220);
    this.burst(m.x, m.y, d.dark, 8, 140);

    const regionDanger = dangerAt(this, m.x, m.y);
    const lootConfig = dangerLoot(regionDanger);

    const goldAmount = randint(d.gold[0], d.gold[1]);
    const finalGold = Math.round(goldAmount * lootConfig.goldMult);
    if (finalGold > 0) this.pickups.push(new Pickup(m.x, m.y - 10, 'coin', finalGold));
    
    if (Math.random() < lootConfig.heartChance) this.pickups.push(new Pickup(m.x + rand(-10,10), m.y - 20, 'heart'));
    if (Math.random() < lootConfig.powerChance) this.pickups.push(new Pickup(m.x + rand(-10,10), m.y - 30, 'powerup'));

    if (d.rare) {
      this.pickups.push(new Pickup(m.x, m.y - 25, 'heart'));
      this.pickups.push(new Pickup(m.x + rand(-10,10), m.y - 35, 'powerup'));
      this.banner(d.name + ' Derrotado! (RARO)', '#ffd23f', 2.2);
    }

    this.sfx.kill();
    this.stats.kills++;
    this.addGoal(m);
    if (d.boss) {
      this.stats.bosses++;
      this.bossDefeated(m);
    }
  },

  addGoal(m) {
    if (m.def.finalBoss) {
      if (m.def.casta === this.player.sub.casta) {
        this.ending = { type: 'own', casta: m.def.casta, bossId: m.def.id, ...FINAL_ENDINGS[m.def.id] };
      } else {
        const bossCastaData = FINAL_ENDINGS[m.def.id];
        this.ending = { type: 'other', casta: m.def.casta, bossId: m.def.id, altLinePersona: bossCastaData.poster };
      }
    }
  },

  openChest(x, y, big) {
    const p = this.player;
    this.burst(x, y - 6, '#ffd23f', 16, 220);
    this.burst(x, y - 6, '#fff', 8, 160);
    this.sfx.upgrade();
    this.stats.powerups++;
    if (big) {
      // baú de chefe: ouro gordo + upgrade de arma
      const gold = randint(200, 350);
      p.gold += gold;
      this.text(x, y - 20, '+' + gold + ' ouro', '#ffd23f', 16);
      if (p.weapon.tier < 12) {
        p.weapon.tier++;
        p.weapon.dmg = weaponDamage(p.weapon);
        this.text(x, y - 40, 'Arma +' + p.weapon.tier + '!', '#7ec8e3', 15);
      }
    } else {
      // baú final: triunfo
      const gold = randint(500, 800);
      p.gold += gold;
      this.text(x, y - 20, '+' + gold + ' ouro — TRIUNFO!', '#ffd23f', 18);
    }
    this.hud();
  },

  bossDefeated(m) {
    const d = m.def;
    this.bossesActive = this.bossesActive.filter(b => b !== m);
    this.boss = null;
    this.bossAggroed = false;

    // Track defeated boss per zone
    const bossZoneMap = {
      'krol_chefe': 'Floresta dos Goblins',
      'gere_osso': 'Catacumbas',
      'titan': 'Gruta do Execra'
    };
    if (bossZoneMap[d.id]) {
      this.defeatedBosses[bossZoneMap[d.id]] = true;
    }

    // Handle crystals and seal progression
    if (d.crystal) {
      const cry = CRYSTALS[d.crystal];
      this.crystals[d.crystal] = true;
      this.banner(cry.name + ' OBTIDO!', cry.color, 3);
      this.burst(m.x, m.y - 30, cry.color, 18, 240);
      this.sfx.upgrade();
    }

    if (d.finalBoss) {
      this.flags.final = true;
      this.endGame();
    } else {
      this.banner(d.name.toUpperCase() + ' DESTRUÍDO!', '#ffd23f', 3);
      this.pickups.push(new Pickup(m.x, m.y - 20, 'chest', 1));
    }
  },

  bossAggro(m) {
    this.bossAggroed = true;
    this.boss = m;
    this.banner(m.def.name.toUpperCase(), '#ff6b6b', 2.5);
    this.sfx.boss();
  },

  updateBoss(m, dt, dx, dy, d2) {
    const p = this.player;
    if (m.aggro > 0 && !this.bossAggroed) this.bossAggro(m);
    if (m.aggro <= 0) return;
    if (m.stunned > 0) return;

    // Intro for final bosses
    if (m.def.finalBoss && !m.introShown) {
      m.introShown = true;
      this.showBossIntro(m);
    }

    const atk = m.def.id === 'krol_chefe' ? this.krolPattern(m, dt, dx, dy, d2)
             : m.def.id === 'gere_osso' ? this.gerePattern(m, dt, dx, dy, d2)
             : m.def.id === 'titan' ? this.titanPattern(m, dt, dx, dy, d2)
             : m.def.id === 'demonio' ? this.demonioPattern(m, dt, dx, dy, d2)
             : m.def.id === 'general' ? this.generalPattern(m, dt, dx, dy, d2)
             : m.def.id === 'arcano' ? this.arcanoPattern(m, dt, dx, dy, d2)
             : null;
    if (atk) m.stunned = atk;
    // movimento básico em direção ao jogador quando não está atacando
    if (m.bossCd <= 0.6 && d2 > m.w * 0.9) {
      const ad = Math.atan2(dy, dx);
      const sp = m.speedJit * 0.6;
      if (m.stunned <= 0) {
        m.vx += (Math.cos(ad) * sp - m.vx) * Math.min(1, dt * 3);
        m.vy += (Math.sin(ad) * sp - m.vy) * Math.min(1, dt * 3);
      }
    }
  },

  krolPattern(m, dt, dx, dy, d2) {
    m.bossCd -= dt;
    const p = this.player;
    const d = m.def;
    if (m.bossCd > 0) return 0;
    m.bossCd = 0;
    // fase 2 (HP < 55%) adiciona investida
    const phase2 = m.hp < m.maxHp * 0.55;
    const r = Math.random();
    if (r < 0.3) {
      // guincho: convoca goblins
      m.bossCd = 3.2;
      this.sfx.boss();
      this.burst(m.x, m.y, d.color, 12, 180);
      this.ring(m.x, m.y, 120, 0.5, '#a14b3c', 4);
      this.banner('KROL GRITA!', '#ff8a5c', 1.2);
      for (let i = 0; i < (phase2 ? 3 : 2); i++) this.summonMinion(m.x, m.y, 'goblin');
      return 0;
    } else if (r < 0.75 && phase2 && d2 > 150) {
      // investida
      m.bossCd = 1.2;
      this.banner('INVESTIDA!', '#ff8a5c', 1);
      const a = Math.atan2(dy, dx);
      this.ring(m.x, m.y, 160, 0.5, '#a14b3c', 3);
      this.delayed.push({ t: 0.3, fn: () => {
        m.vx = Math.cos(a) * 700; m.vy = Math.sin(a) * 700;
        this.ring(m.x, m.y, 200, 0.8, '#ff5c5c', 4);
      } });
      return 0.4;
    } else {
      // mordida/cargas de golpes no chão
      m.bossCd = 2;
      const a = Math.atan2(dy, dx);
      this.ring(m.x + Math.cos(a) * 60, m.y + Math.sin(a) * 60, 60, 0.5, d.color, 3);
      this.delayed.push({ t: 0.4, fn: () => this.bossSlam(m, { x: Math.cos(a) * 60, y: Math.sin(a) * 60 }) });
      return 0.5;
    }
  },

  gerePattern(m, dt, dx, dy, d2) {
    m.bossCd -= dt;
    const d = m.def;
    if (m.bossCd > 0) return 0;
    m.bossCd = 0;
    const phase2 = m.hp < m.maxHp * 0.4;
    const r = Math.random();
    if (r < 0.4) {
      // rajada de ossos
      m.bossCd = 2.6;
      this.banner('RAJADA DE OSSOS!', '#d9d0c0', 1.2);
      const a = Math.atan2(dy, dx);
      this.ring(m.x, m.y, 90, 0.6, '#d9d0c0', 3);
      const base = Math.atan2(dy, dx);
      const nsh = phase2 ? 9 : 6;
      for (let i = 0; i < nsh; i++) {
        const off = (i - (nsh - 1) / 2) * 0.18;
        const ang = base + off + (Math.random() - 0.5) * 0.12;
        this.delayed.push({ t: 0.3 + i * 0.04, fn: () => this.shootEnemy(m, Math.cos(ang) * 100, Math.sin(ang) * 100, { speed: 300, bone: true }) });
      }
      return 0.5;
    } else if (r < 0.7) {
      // convoca esqueletos
      m.bossCd = 4;
      this.banner('ALVORADA DOS MORTOS!', '#c9c9c9', 1.2);
      const n = phase2 ? 3 : 2;
      for (let i = 0; i < n; i++) this.summonMinion(m.x, m.y, 'skeleton');
      this.ring(m.x, m.y, 140, 0.6, '#a9a9a9', 4);
      this.sfx.boss();
      return 0.6;
    } else {
      // lâmina giratória (telegraph + dano em área)
      m.bossCd = 3;
      this.banner('CÍRCULO DOS OSSOS!', '#d9d0c0', 1.2);
      this.ring(m.x, m.y, 100, 0.7, '#ff5c5c', 4);
      this.delayed.push({ t: 0.7, fn: () => {
        this.burst(m.x, m.y, '#d9d0c0', 16, 240);
        this.ring(m.x, m.y, 100, 0.5, '#ff5c5c', 5);
        const p = this.player;
        if (Math.hypot(p.x - m.x, p.y - m.y) < 110) this.damagePlayer(Math.round(d.dmg * 0.8));
      } });
      return 0.8;
    }
  },

  titanPattern(m, dt, dx, dy, d2) {
    m.bossCd -= dt;
    const d = m.def;
    const p = this.player;
    if (m.bossCd > 0) return 0;
    m.bossCd = 0;
    const phase1 = m.hp > m.maxHp * 0.6;
    const phase3 = m.hp < m.maxHp * 0.3;
    const r = Math.random();
    if (r < 0.35) {
      // garras no chão: slam
      m.bossCd = 2.2;
      this.banner('MARTELADA!', '#8a6a4b', 1);
      this.ring(m.x, m.y, 90, 0.5, '#8a6a4b', 3);
      this.delayed.push({ t: 0.5, fn: () => this.bossSlam(m) });
      return 0.6;
    } else if (r < 0.7) {
      // raging rocks
      m.bossCd = 2.8;
      this.banner('PEDRAS!', '#8a6a4b', 1);
      const base = Math.atan2(dy, dx);
      const nsh = phase1 ? 3 : 4;
      for (let i = 0; i < nsh; i++) {
        const off = (i - (nsh - 1) / 2) * 0.3;
        const ang = base + off;
        this.shootEnemy(m, Math.cos(ang) * 100, Math.sin(ang) * 100, { speed: 260, big: true, fromBoss: true });
      }
      return 0.4;
    } else if (phase3) {
      // convoca espectros
      m.bossCd = 5;
      this.banner('FÚRIA DAS TREVAS!', '#ff5c5c', 2);
      for (let i = 0; i < 2; i++) this.summonMinion(m.x, m.y, 'wraith');
      this.ring(m.x, m.y, 160, 0.6, '#ff5c5c', 4);
      this.sfx.boss();
      return 0.6;
    } else {
      // salto + tremor
      m.bossCd = 3.4;
      this.banner('TREMOR!', '#8a6a4b', 1);
      this.ring(m.x, m.y, 180, 0.7, '#ff5c5c', 4);
      this.delayed.push({ t: 0.6, fn: () => {
        this.shake += 12;
        this.sfx.explosion();
        this.burst(m.x, m.y, '#6e5a4b', 20, 280);
        const pp = this.player;
        if (Math.hypot(pp.x - m.x, pp.y - m.y) < 200) this.damagePlayer(Math.round(d.dmg * 0.9));
      } });
      return 0.5;
    }
  },

  demonioPattern(m, dt, dx, dy, d2) {
    m.bossCd -= dt;
    const p = this.player;
    if (m.bossCd > 0) return 0;
    m.bossCd = 0;
    const phase2 = m.hp < m.maxHp * 0.5;
    const r = Math.random();
    if (r < 0.3) {
      // Infernal Breath: cone of fire
      m.bossCd = 2.5;
      this.banner('SOPRO INFERNAL!', '#ff6b6b', 1.2);
      const a = Math.atan2(dy, dx);
      for (let i = -2; i <= 2; i++) {
        const ang = a + i * 0.25;
        this.shootEnemy(m, Math.cos(ang) * 80, Math.sin(ang) * 80, { speed: 350, big: true, fromBoss: true });
      }
      return 0.5;
    } else if (r < 0.6 && phase2) {
      // Summon Demoninhos
      m.bossCd = 3.5;
      this.banner('FILHOS DO CAOS!', '#ff5c5c', 1.5);
      for (let i = 0; i < 3; i++) this.summonMinion(m.x, m.y, 'demoninho');
      this.ring(m.x, m.y, 120, 0.6, '#c0504a', 4);
      this.sfx.boss();
      return 0.6;
    } else {
      // Charge + Slam
      m.bossCd = 2.2;
      this.banner('INVESTIDA DO DEMÔNIO!', '#c0392b', 1);
      const a = Math.atan2(dy, dx);
      this.ring(m.x + Math.cos(a) * 60, m.y + Math.sin(a) * 60, 60, 0.5, '#ff5c5c', 3);
      this.delayed.push({ t: 0.35, fn: () => {
        m.vx = Math.cos(a) * 650; m.vy = Math.sin(a) * 650;
        this.ring(m.x, m.y, 200, 0.7, '#ff5c5c', 5);
      } });
      this.delayed.push({ t: 0.6, fn: () => this.bossSlam(m) });
      return 0.7;
    }
  },

  generalPattern(m, dt, dx, dy, d2) {
    m.bossCd -= dt;
    const p = this.player;
    if (m.bossCd > 0) return 0;
    m.bossCd = 0;
    const phase2 = m.hp < m.maxHp * 0.4;
    const r = Math.random();
    if (r < 0.35) {
      // Volley of gunfire
      m.bossCd = 2.2;
      this.banner('SALVA DE ARQUEBUSES!', '#b5651d', 1);
      const base = Math.atan2(dy, dx);
      const nsh = phase2 ? 12 : 8;
      for (let i = 0; i < nsh; i++) {
        const off = (i - (nsh - 1) / 2) * 0.15 + (Math.random() - 0.5) * 0.1;
        this.shootEnemy(m, Math.cos(base + off) * 100, Math.sin(base + off) * 100, { speed: 500, bone: true });
      }
      return 0.4;
    } else if (r < 0.65) {
      // Tactical Charge
      m.bossCd = 1.8;
      this.banner('CARGA TÁTICA!', '#c0392b', 1);
      const a = Math.atan2(dy, dx);
      this.ring(m.x, m.y, 80, 0.4, '#ffd23f', 3);
      this.delayed.push({ t: 0.25, fn: () => {
        m.vx = Math.cos(a) * 700; m.vy = Math.sin(a) * 700;
        this.ring(m.x, m.y, 160, 0.6, '#ff5c5c', 4);
      } });
      return 0.4;
    } else {
      // Summon Soldiers + Shield
      m.bossCd = 4;
      this.banner('GUARNIÇÃO, AVANTE!', '#a0a8a0', 1.5);
      for (let i = 0; i < (phase2 ? 4 : 3); i++) this.summonMinion(m.x, m.y, 'soldado_leal');
      m.status = m.status || {};
      m.status.shield = 150;
      m.status.shieldT = 8;
      this.ring(m.x, m.y, 140, 0.7, '#ffd27f', 5);
      this.sfx.buff();
      return 0.6;
    }
  },

  arcanoPattern(m, dt, dx, dy, d2) {
    m.bossCd -= dt;
    const p = this.player;
    if (m.bossCd > 0) return 0;
    m.bossCd = 0;
    const phase2 = m.hp < m.maxHp * 0.4;
    const phase3 = m.hp < m.maxHp * 0.2;
    const r = Math.random();
    if (r < 0.3) {
      // Chaos Burst: radial projectiles
      m.bossCd = 2;
      this.banner('CAOS ARCANO!', '#a08ad8', 1);
      for (let i = 0; i < (phase2 ? 16 : 12); i++) {
        const a = (i / (phase2 ? 16 : 12)) * 6.283;
        this.shootEnemy(m, Math.cos(a) * 80, Math.sin(a) * 80, { speed: 300, big: true, fromBoss: true });
      }
      this.ring(m.x, m.y, 120, 0.6, '#a08ad8', 4);
      return 0.4;
    } else if (r < 0.6) {
      // Teleport + Devour (pull)
      m.bossCd = 2.5;
      this.banner('DEVORAR!', '#8e44ad', 1.2);
      const tx = p.x + rand(-100, 100), ty = p.y + rand(-100, 100);
      if (!this.world.solidBox({ x: tx - m.w/2, y: ty - m.h/2, w: m.w, h: m.h })) {
        m.x = tx; m.y = ty;
        this.burst(m.x, m.y, '#c0b4ff', 14, 200);
      }
      // Pull player
      const pullDist = 250;
      const pd = Math.hypot(p.x - m.x, p.y - m.y);
      if (pd < pullDist) {
        const ang = Math.atan2(m.y - p.y, m.x - p.x);
        p.vx += Math.cos(ang) * 400;
        p.vy += Math.sin(ang) * 400;
      }
      this.delayed.push({ t: 0.3, fn: () => {
        this.ring(m.x, m.y, 140, 0.5, '#ff5c5c', 4);
        if (Math.hypot(p.x - m.x, p.y - m.y) < 150) this.damagePlayer(Math.round(m.def.dmg * 0.7));
      } });
      return 0.5;
    } else if (phase3) {
      // Summon Homúnculos
      m.bossCd = 5;
      this.banner('HOMÚNCULOS, DESPERTAI!', '#d8a0b0', 1.5);
      for (let i = 0; i < 3; i++) this.summonMinion(m.x, m.y, 'homunculo');
      this.ring(m.x, m.y, 180, 0.7, '#ff5c5c', 5);
      this.sfx.boss();
      return 0.6;
    } else {
      // Arcane Beam
      m.bossCd = 3;
      this.banner('RAIO ARCANO!', '#7a6bd8', 1);
      const a = Math.atan2(dy, dx);
      this.ring(m.x, m.y, 80, 0.5, '#c0b4ff', 3);
      this.delayed.push({ t: 0.5, fn: () => {
        this.beamEffect(m.x, m.y, Math.cos(a), Math.sin(a), 360, '#a08ad8');
        for (const mm of this.monsters) {
          if (mm.dying || mm.dead) continue;
          const mx = mm.x - m.x, my = mm.y - m.y;
          const proj = mx * Math.cos(a) + my * Math.sin(a);
          if (proj > 0 && proj < 360) {
            const perp = Math.abs(mx * Math.sin(a) - my * Math.cos(a));
            if (perp < 30) this.damageMonster(mm, m.def.dmg, T.MAGIC);
          }
        }
      } });
      return 0.6;
    }
  },

  showBossIntro(m) {
    this.state = 'bossintro';
    const data = FINAL_ENDINGS[m.def.id] || { intro: ['Um inimigo poderoso aparece!'], title: m.def.name };
    let html = `<h2>${data.title || m.def.name.toUpperCase()}</h2><div class="introText">`;
    (data.intro || []).forEach(line => { html += `<p>${line}</p>`; });
    html += `</div><button class="btn" id="btnBossIntro">Enfrentar</button>`;
    byId('bossintroPanel').innerHTML = html;
    byId('bossintro').classList.remove('hidden');
    byId('btnBossIntro').onclick = () => {
      byId('bossintro').classList.add('hidden');
      this.state = 'play';
    };
  },

  summonMinion(x, y, kind) {
    kind = kind || 'goblin';
    const def = MONSTERS[kind];
    if (!def) return;
    let nx = 0, ny = 0;
    for (let tries = 0; tries < 8; tries++) {
      const a = Math.random() * 6.283;
      const r = 40 + Math.random() * 60;
      const tx = x + Math.cos(a) * r;
      const ty = y + Math.sin(a) * r;
      const m = new Monster(def, tx, ty, this);
      if (!this.world.solidBox(m.box())) { nx = tx; ny = ty; break; }
    }
    const m = new Monster(def, x + nx, y + ny, this);
    if (this.world.solidBox(m.box())) return;
    m.aggro = 1;
    this.monsters.push(m);
    return m;
  },

  endGame() {
    if (this.finished) return;
    this.finished = true;
    this.state = 'win';
    this.monsters = [];
    this.projectiles = [];
    this.flags.final = true;
    this.sfx.bossDie();
    this.saveRecord();

    if (this.ending && this.ending.type === 'own') {
      this.banner(this.ending.msg, this.player.sub.accent, 4);
      this.delayed.push({ t: 2.5, fn: () => this.showResults() });
    } else if (this.ending && this.ending.type === 'other') {
      const msg = `Você é bom nisso... já pensou em ser ${this.ending.altLinePersona}?`;
      this.banner(msg, '#ffd23f', 4);
      this.delayed.push({ t: 2.5, fn: () => this.showResults() });
    } else {
      // Fallback (should not happen with new system)
      this.showResults();
    }
  },

  score() {
    const s = this.stats;
    let pts = 0;
    pts += s.kills * 12;
    pts += s.bosses * 800;
    pts += s.exploration * 240;
    pts += s.powerups * 100;
    pts += clamp(s.maxCombo, 0, 40) * 10;
    pts += Math.round(clamp((1400 - s.time) / 5, 0, 200));
    pts -= s.deaths * 150;
    pts -= Math.round(s.dmgTaken * 0.15);
    if (this.finished) pts += 1500;
    return Math.max(0, Math.round(pts));
  },

  saveRecord() {
    try {
      const key = 'eclesia_v1';
      let rec = {};
      try { rec = JSON.parse(localStorage.getItem(key)) || {}; } catch (e) { rec = {}; }
      if (!rec.wins) rec.wins = 0;
      rec.wins++;
      if (!rec.bestScore || this.score() > rec.bestScore) rec.bestScore = this.score();
      if (!rec.bestTime || this.stats.time < rec.bestTime) rec.bestTime = this.stats.time;
      if (!rec.maxCombo || this.stats.maxCombo > rec.maxCombo) rec.maxCombo = this.stats.maxCombo;
      if (!rec.byClass) rec.byClass = {};
      const cls = this.player.sub.id;
      const old = rec.byClass[cls];
      if (!old || this.score() > old.bestScore) {
        rec.byClass[cls] = { bestScore: this.score(), bestTime: this.stats.time, wins: (old ? old.wins : 0) + 1 };
      } else if (old) {
        old.wins++;
      }
      localStorage.setItem(key, JSON.stringify(rec));
    } catch (e) { }
  },

  loadRecords() {
    try {
      return JSON.parse(localStorage.getItem('eclesia_v1')) || {};
    } catch (e) { return {}; }
  },

  formatTime(t) {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return m + 'm' + (s < 10 ? '0' : '') + s + 's';
  },

  showResults() {
    const s = this.stats;
    const sc = this.score();
    const el = byId('resultsPanel');
    const cls = this.player.sub;
    let html = `<h2>${this.ending && this.ending.type === 'other' ? 'TRIUNFO IMPREVISTO' : (this.ending ? this.ending.title : 'O EXECRA CAIU')}</h2>`;
    
    if (this.ending && this.ending.type === 'own') {
      html += `<div class="endingMsg" style="color:${cls.accent}; font-size:18px; margin:10px 0;">${this.ending.msg}</div>`;
    } else if (this.ending && this.ending.type === 'other') {
      html += `<div class="endingMsg" style="color:#ffd23f; font-size:18px; margin:10px 0;">Você é bom nisso... já pensou em ser ${this.ending.altLinePersona}?</div>`;
    }

    html += `<div class="reswrap">
      <div class="resc"><span>Classe</span><b style="color:${cls.accent}">${cls.name}</b></div>
      <div class="resc"><span>Tempo</span><b>${this.formatTime(s.time)}</b></div>
      <div class="resc"><span>Inimigos</span><b>${s.kills}</b></div>
      <div class="resc"><span>Chefes</span><b>${s.bosses}</b></div>
      <div class="resc"><span>Mortes</span><b>${s.deaths}</b></div>
      <div class="resc"><span>Dano causado</span><b>${s.dmgDealt}</b></div>
      <div class="resc"><span>Dano recebido</span><b>${s.dmgTaken}</b></div>
      <div class="resc"><span>Maior combo</span><b>x${s.maxCombo}</b></div>
      <div class="resc"><span>Nível da arma</span><b>+${this.player.weapon.tier}</b></div>
      <div class="resc"><span>Power-ups</span><b>${s.powerups}</b></div>
      <div class="resc"><span>Exploração</span><b>${s.exploration} zonas</b></div>
    </div>
    <div class="finalScore">PONTUAÇÃO: <span style="color:${cls.accent}">${sc}</span></div>`;

    const rec = this.loadRecords();
    if (rec.bestScore) html += `<div class="records"><div>Recorde local — pontuação máxima: <b>${rec.bestScore}</b></div><div>Recorde — tempo: <b>${this.formatTime(rec.bestTime)}</b></div><div>Zeramentos: <b>${rec.wins}</b></div></div>`;

    html += `<div class="resbtns">`;
    if (this.ending && this.ending.type === 'other') {
      html += `<button class="btn" id="btnContinue">Continuar explorando</button> `;
    }
    html += `<button class="btn" id="btnMenu">Menu principal</button></div>`;

    el.innerHTML = html;
    byId('btnMenu').onclick = () => this.toMenu();
    if (this.ending && this.ending.type === 'other') {
      byId('btnContinue').onclick = () => {
        this.state = 'play';
        byId('results').classList.add('hidden');
      };
    }
    byId('results').classList.remove('hidden');
  },

  showRecords() {
    const rec = this.loadRecords();
    const el = byId('recordsPanel');
    let html = `<h2>RECORDES LOCAIS</h2>`;
    if (!rec.bestScore && !rec.byClass) {
      html += `<p>Nenhum recorde ainda. Zere o jogo para estabelecer seus recordes!</p>`;
    } else {
      html += `<div class="reswrap">`;
      if (rec.bestScore) html += `<div class="resc"><span>Maior pontuação</span><b>${rec.bestScore}</b></div>`;
      if (rec.bestTime) html += `<div class="resc"><span>Melhor tempo</span><b>${this.formatTime(rec.bestTime)}</b></div>`;
      if (rec.maxCombo) html += `<div class="resc"><span>Maior combo</span><b>x${rec.maxCombo}</b></div>`;
      if (rec.wins) html += `<div class="resc"><span>Zeramentos</span><b>${rec.wins}</b></div>`;
      html += `</div>`;
      html += `<div class="recclass"><h3>Melhor por classe</h3>`;
      for (const id in (rec.byClass || {})) {
        const c = rec.byClass[id];
        const sub = SUBCLASSES[id];
        if (!sub) continue;
        html += `<div class="resrow"><span style="color:${sub.accent}">${sub.name}</span><b>${c.bestScore} pts · ${this.formatTime(c.bestTime)} · ${c.wins} vit</b></div>`;
      }
      html += `</div>`;
    }
    html += `<button class="btn" id="btnCloseRecords">Fechar</button>`;
    el.innerHTML = html;
    byId('btnCloseRecords').onclick = () => this.closeOverlay();
    byId('records').classList.remove('hidden');
  },

  toMenu() {
    this.state = 'menu';
    byId('results').classList.add('hidden');
    byId('records').classList.add('hidden');
    byId('death').classList.add('hidden');
    byId('hud').classList.add('hidden');
    byId('menu').classList.remove('hidden');
  },

  bossSlam(m, off) {
    const r = 140;
    const p = this.player;
    const tx = m.x + (off ? off.x : 0), ty = m.y + (off ? off.y : 0);
    if (Math.hypot(p.x - tx, p.y - ty) < r + p.w / 2) this.damagePlayer(Math.round(m.def.dmg * 0.7));
    this.ring(tx, ty, r, 0.4, '#8a7a5a', 6);
    this.burst(tx, ty, '#8a7a5a', 18, 260);
    this.ring(tx, ty, r * 0.6, 0.3, '#6e5a4b', 4);
    this.shake += 10;
    this.sfx.explosion();
  },

  shootEnemy(m, dx, dy, opts) {
    opts = opts || {};
    const d = Math.hypot(dx, dy) || 1;
    const ux = dx / d, uy = dy / d;
    const speed = opts.speed || 300;
    const big = opts.big;
    const off = opts.off || 0;
    const a = Math.atan2(uy, ux) + off;
    const vx = Math.cos(a) * speed, vy = Math.sin(a) * speed;
    const dmg = Math.round(m.def.dmg * (big ? 1.2 : 0.8));
    this.projectiles.push(new Projectile({
      x: m.x + Math.cos(a) * 14, y: m.y + Math.sin(a) * 14,
      vx, vy,
      dmg, type: T.MAGIC, color: opts.bone ? '#d9d0c0' : big ? '#7a5a4b' : '#c76bd8',
      size: opts.bone ? 7 : big ? 12 : 8, life: 3, pierce: false, owner: 'enemy',
      aoe: big ? 36 : opts.bone ? 0 : 0, trail: big || opts.bone
    }));
  },

  explode(x, y, proj) {
    this.shake += proj.shake || (proj.owner === 'player' ? 6 : 4);
    this.sfx.explosion();
    this.burst(x, y, proj.color, 18, 280);
    this.burst(x, y, '#fff', 8, 160, 2.5, 400);
    this.ring(x, y, proj.aoe || 40, 0.35, proj.color, 4);
    if (proj.clearTree) this.world.destroyTrees(x, y, (proj.aoe || 60) * 1.2);
    if (proj.owner === 'player') {
      for (const m of this.monsters) {
        if (m.dying || m.dead || proj.hit.has(m)) continue;
        if (Math.hypot(m.x - x, m.y - y) < proj.aoe + m.w / 2) this.damageMonster(m, proj.dmg, proj.type);
      }
    } else {
      const p = this.player;
      if (!proj.hit.has(p) && p.hp > 0 && Math.hypot(p.x - x, p.y - y) < proj.aoe + p.w / 2 && p.invuln <= 0) this.damagePlayer(proj.dmg);
    }
  },

  damagePlayer(amount) {
    const p = this.player;
    if (this.cheats.hp) return;
    if (p.invuln > 0 || p.dashT > 0) return;
    let dmg = amount;
    this.stats.dmgTaken += dmg;
    if (p.status.shield > 0) {
      const absorbed = Math.min(p.status.shield, dmg);
      p.status.shield -= absorbed;
      dmg -= absorbed;
      this.text(p.x, p.y - 26, '-' + absorbed, '#ffe9a0', 14);
      this.burst(p.x, p.y, '#ffe9a0', 6, 120);
      if (dmg <= 0) {
        p.invuln = 0.25;
        this.sfx.shield();
        return;
      }
    }
    p.hp -= dmg;
    this.text(p.x, p.y - 18, '-' + dmg, '#ff5c5c', 17);
    this.burst(p.x, p.y - 10, '#ff5c5c', 8, 150);
    this.redFlash = Math.min(1, this.redFlash + 0.35);
    this.shake += 6;
    this.sfx.hurt();
    p.hurtT = 0.3;
    if (p.hp <= 0) { p.hp = 0; this.death(); return; }
    p.invuln = 0.6;
  },

  death() {
    this.state = 'death';
    this.stats.deaths++;
    byId('death').classList.remove('hidden');
    this.sfx.death();
  },

  respawn() {
    const p = this.player;
    p.x = this.startPos.x;
    p.y = this.startPos.y;
    p.vx = 0;
    p.vy = 0;
    p.hp = p.maxHp;
    p.invuln = 2;
    p.dashT = 0;
    p.status.dmg = 0; p.status.spd = 0; p.status.regen = 0;
    p.status.dur = 0; p.status.shield = 0; p.status.shieldT = 0;
    this.monsters = [];
    this.projectiles = [];
    this.delayed = [];
    this.particles = [];
    this.boss = null;
    this.bossAggroed = false;
    this.bossesActive = [];
    this.crystals = {};
    this.world.resetSpawns();
    this.world.update(0.01, this);
    this.state = 'play';
    byId('death').classList.add('hidden');
    this.hud();
    this.banner('Você renasce na vila', '#7cff8a', 2);
  },

  burst(x, y, color, n, speed, size, grav) {
    if (this.particles.length > 350) return;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.283;
      const s = speed * (0.3 + Math.random() * 0.7);
      this.particles.push(new Particle({
        x, y,
        vx: Math.cos(a) * s, vy: Math.sin(a) * s - speed * 0.25,
        life: 0.4 + Math.random() * 0.4,
        color, size: (size || 4) * (0.6 + Math.random() * 0.8),
        grav: grav !== undefined ? grav : 0
      }));
    }
  },

  text(x, y, str, color, size) {
    if (this.texts.length > 40) return;
    this.texts.push(new FloatText(x, y, str, color, size));
  },

  render() {
    const ctx = this.ctx;
    const t = this.time;
    ctx.save();

    if (this.shake > 0.5) {
      ctx.translate((Math.random() * 2 - 1) * this.shake, (Math.random() * 2 - 1) * this.shake);
    }

    const sky = ctx.createLinearGradient(0, 0, 0, this.ch);
    sky.addColorStop(0, '#2b3a55');
    sky.addColorStop(0.6, '#5b7aa8');
    sky.addColorStop(1, '#88a9c9');
    ctx.fillStyle = sky;
    ctx.fillRect(-20, -20, this.cw + 40, this.ch + 40);

    ctx.fillStyle = 'rgba(255,233,176,0.9)';
    ctx.beginPath();
    ctx.arc(this.cw - 120, 90, 40, 0, 6.283);
    ctx.fill();

    ctx.fillStyle = '#3a5070';
    const mo = Math.round(this.cam.x * 0.2);
    for (let i = -1; i < 4; i++) {
      const bx = i * 800 - mo % 800;
      ctx.beginPath();
      ctx.moveTo(bx, this.ch);
      ctx.lineTo(bx + 180, this.ch - 180 - Math.sin(t * 0.1 + i) * 8);
      ctx.lineTo(bx + 340, this.ch - 240);
      ctx.lineTo(bx + 520, this.ch - 160);
      ctx.lineTo(bx + 650, this.ch);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    for (let i = 0; i < 3; i++) {
      const cx = ((i * 430 + t * 6 - this.cam.x * 0.4) % (this.cw + 500) + this.cw + 500) % (this.cw + 500) - 200;
      const cy = 60 + i * 46;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 55, 18, 0, 0, 6.283);
      ctx.ellipse(cx + 34, cy + 4, 38, 14, 0, 0, 6.283);
      ctx.fill();
    }

    ctx.save();
    ctx.translate(-Math.round(this.cam.x), -Math.round(this.cam.y));
    this.world.draw(ctx, this.cam, t);

    const inCave = this.indoorNames[this.zoneTitle];
    if (inCave) {
      ctx.fillStyle = 'rgba(8,10,18,0.30)';
      ctx.fillRect(this.cam.x, this.cam.y, this.cw, this.ch);
    }

    for (const pk of this.pickups) pk.draw(ctx, t);
    for (const n of this.npcs) this.drawNPC(ctx, n, t);
    for (const m of this.monsters) m.draw(ctx, t);
    if (this.player) this.player.draw(ctx, t);
    for (const pr of this.projectiles) pr.draw(ctx);
    for (const r of this.rings) r.draw(ctx);
    for (const pa of this.particles) pa.draw(ctx);
    for (const tx of this.texts) tx.draw(ctx);

    if (this.mouseActive) {
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(this.aim.x, this.aim.y, 8, 0, 6.283);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(this.aim.x - 12, this.aim.y);
      ctx.lineTo(this.aim.x - 4, this.aim.y);
      ctx.moveTo(this.aim.x + 4, this.aim.y);
      ctx.lineTo(this.aim.x + 12, this.aim.y);
      ctx.moveTo(this.aim.x, this.aim.y - 12);
      ctx.lineTo(this.aim.x, this.aim.y - 4);
      ctx.moveTo(this.aim.x, this.aim.y + 4);
      ctx.lineTo(this.aim.x, this.aim.y + 12);
      ctx.stroke();
    }

    ctx.restore();

    const vig = ctx.createRadialGradient(this.cw / 2, this.ch / 2, this.ch * 0.45, this.cw / 2, this.ch / 2, this.ch * 0.95);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.42)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, this.cw, this.ch);

    if (this.redFlash > 0) {
      ctx.fillStyle = 'rgba(255,40,40,' + (this.redFlash * 0.35).toFixed(3) + ')';
      ctx.fillRect(0, 0, this.cw, this.ch);
    }

    ctx.restore();
  },

  drawNPC(ctx, n, t) {
    const bob = Math.sin(n.bobT * 2) * 2;
    ctx.save();
    ctx.translate(n.px, n.py + bob);
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(0, 20, 14, 5, 0, 0, 6.283);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.fillStyle = n.color;
    ctx.beginPath();
    ctx.arc(0, 0, 13, 0, 6.283);
    ctx.fill();
    ctx.fillStyle = '#e8e8e8';
    ctx.beginPath();
    ctx.arc(0, -18, 9, 0, 6.283);
    ctx.fill();

    if (n.kind === 'forge') {
      ctx.fillStyle = n.accent;
      ctx.fillRect(-6, -26, 12, 5);
      ctx.fillRect(-8, -29, 16, 4);
    } else if (n.kind === 'shop') {
      ctx.fillStyle = n.accent;
      ctx.beginPath();
      ctx.arc(0, -27, 7, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(-7, -26, 14, 3);
    } else if (n.kind === 'skills') {
      ctx.fillStyle = n.accent;
      ctx.beginPath();
      ctx.moveTo(0, -32);
      ctx.lineTo(9, -18);
      ctx.lineTo(-9, -18);
      ctx.closePath();
      ctx.fill();
    } else if (n.kind === 'guide') {
      ctx.fillStyle = n.accent;
      ctx.beginPath();
      ctx.arc(0, -28, 6, 0, 6.283);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillRect(-1, -31, 2, 6);
    } else if (n.kind === 'church') {
      ctx.fillStyle = '#fff3b0';
      ctx.beginPath();
      ctx.moveTo(0, -30);
      ctx.lineTo(-8, -16);
      ctx.lineTo(8, -16);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#c9a227';
      ctx.fillRect(-2, -20, 4, 10);
    } else if (n.kind === 'tavern') {
      ctx.fillStyle = '#a8823f';
      ctx.beginPath();
      ctx.arc(0, -26, 8, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(-8, -25, 16, 4);
      ctx.fillStyle = '#ffd23f';
      ctx.fillRect(-3, -18, 6, 6);
    } else if (n.kind === 'tower') {
      ctx.fillStyle = '#7a6bd8';
      ctx.fillRect(-4, -28, 8, 12);
      ctx.fillStyle = '#c0b4ff';
      ctx.beginPath();
      ctx.arc(0, -32, 5, 0, 6.283);
      ctx.fill();
    } else if (n.kind === 'seal') {
      const ph = t * 3 + n.px * 0.01;
      ctx.globalAlpha = 0.5 + Math.sin(ph) * 0.3;
      ctx.fillStyle = n.accent || '#b05cff';
      ctx.beginPath();
      ctx.arc(0, -20, 10 + Math.sin(ph * 2) * 3, 0, 6.283);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = n.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, -20, 14, 0, 6.283);
      ctx.stroke();
    } else if (n.kind === 'talk') {
      ctx.fillStyle = n.accent;
      ctx.beginPath();
      ctx.arc(0, -26, 6, 0, 6.283);
      ctx.fill();
    } else {
      ctx.fillStyle = n.accent;
      ctx.beginPath();
      ctx.moveTo(0, -32);
      ctx.lineTo(9, -18);
      ctx.lineTo(-9, -18);
      ctx.closePath();
      ctx.fill();
    }

    // Confession indicator for Clero NPCs
    if (n.confessed && this.player && this.player.sub.casta === 'clero') {
      ctx.fillStyle = '#fff3b0';
      ctx.globalAlpha = 0.7 + Math.sin(t * 5) * 0.3;
      ctx.beginPath();
      ctx.moveTo(0, -38);
      ctx.lineTo(-6, -30);
      ctx.lineTo(6, -30);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(-3, -18, 1.8, 0, 6.283);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(3, -18, 1.8, 0, 6.283);
    ctx.fill();

    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.font = '700 11px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(n.name, 0, 34);
    ctx.restore();
  },

  sfx: {
    ac: null,
    muted: false,
    unlock() {
      if (!this.ac) {
        try { this.ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { }
      }
      if (this.ac && this.ac.state === 'suspended') this.ac.resume();
    },
    beep(f0, f1, dur, type, vol) {
      if (this.muted || !this.ac) return;
      try {
        const ac = this.ac;
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = type || 'sine';
        o.frequency.setValueAtTime(Math.max(1, f0), ac.currentTime);
        o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), ac.currentTime + dur);
        g.gain.setValueAtTime(vol || 0.12, ac.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
        o.connect(g).connect(ac.destination);
        o.start();
        o.stop(ac.currentTime + dur + 0.03);
      } catch (e) { }
    },
    hit() { this.beep(250, 120, 0.08, 'square', 0.1); },
    hurt() { this.beep(180, 80, 0.25, 'sawtooth', 0.18); },
    shoot() { this.beep(600, 300, 0.1, 'sine', 0.08); },
    swing() { this.beep(300, 180, 0.07, 'triangle', 0.07); },
    skill() { this.beep(500, 900, 0.2, 'sine', 0.12); },
    heal() { this.beep(700, 1200, 0.25, 'sine', 0.12); },
    holy() { this.beep(500, 1000, 0.18, 'sine', 0.1); },
    buff() { this.beep(400, 700, 0.2, 'sine', 0.1); },
    coin() { this.beep(900, 1500, 0.12, 'sine', 0.1); },
    pick() { this.beep(600, 1000, 0.15, 'sine', 0.12); },
    throw() { this.beep(400, 200, 0.15, 'triangle', 0.1); },
    explosion() { this.beep(150, 40, 0.4, 'sawtooth', 0.18); },
    upgrade() { this.beep(300, 900, 0.3, 'square', 0.1); },
    buy() { this.beep(800, 1100, 0.12, 'sine', 0.12); },
    kill() { this.beep(200, 60, 0.2, 'sawtooth', 0.14); },
    shield() { this.beep(900, 500, 0.15, 'sine', 0.1); },
    dash() { this.beep(500, 900, 0.15, 'triangle', 0.12); },
    boss() { this.beep(80, 180, 0.8, 'sawtooth', 0.2); },
    bossDie() { this.beep(60, 40, 1.2, 'sawtooth', 0.18); },
    death() { this.beep(200, 60, 0.8, 'sawtooth', 0.18); }
  }
};

window.addEventListener('load', () => GAME.init());
