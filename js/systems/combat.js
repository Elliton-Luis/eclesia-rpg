import { T } from '../data/constants.js';
import { rand, dist, rectOverlap } from '../data/utils.js';
import { BLESSINGS } from '../data/blessings.js';
import { Particle } from '../entities/effects.js';
import { Projectile } from '../entities/projectile.js';

export const combat = {
  useSupreme() {
    const p = this.player;
    if (!p || !p.supremeBlessed) { this.banner('Nenhuma Bênção Suprema foi concedida.', '#fff', 1.5); return; }
    if (p.supremeUses <= 0) { this.banner('A Bênção Suprema já foi consumida.', '#ffd23f', 1.6); return; }
    const b = BLESSINGS.bencao_suprema;
    p.supremeUses = 0;
    const x = p.x, y = p.y;
    const r = b.radius;

    // Apresentação visual única para o milagre mais poderoso do jogo.
    this.pillarFx(x, y, r);
    this.ring(x, y, r, 0.9, '#fff3b0', 8);
    this.ring(x, y, r * 1.25, 0.9, '#ffd23f', 6);
    this.ring(x, y, r * 0.55, 0.8, '#ffffff', 5);
    this.burst(x, y, '#fff3b0', 42, 460);
    this.burst(x, y, '#ffffff', 28, 320, 6, 700);
    this.shake += 26;
    this.sfx.explosion();
    this.banner('☀️ A LUZ DO SENHOR DESCEU SOBRE A TERRA!', '#fff3b0', 3.4);

    let n = 0;
    for (const m of this.monsters.slice()) {
      if (m.dying || m.dead) continue;
      if (Math.hypot(m.x - x, m.y - y) <= r + m.w / 2) {
        this.burst(m.x, m.y, '#ffffff', 14, 240);
        this.ring(m.x, m.y, m.w, 0.4, '#fff3b0', 4);
        this.hitkill(m);
        n++;
      }
    }
    this.text(x, y - 30, n + ' ser(es) aniquilado(s)', '#ffffff', 18);
    this.hud();
  },

  hitkill(m) {
    if (m.dying || m.dead) return;
    m.hp = 0;
    this.killMonster(m);
  },

  doAttack() {
    const p = this.player;
    if (p.attackCd > 0) return;
    const atk = p.mw || p.sub.attack;
    // Arqueiro: ataque principal prepara o tiro carregado antes de disparar.
    if (atk.charge && atk.kind === 'ranged' && !p.charging) {
      p.charging = true;
      p.chargeT = atk.charge;
      p.attackCd = 0.06;
      this.sfx.buff();
      return;
    }
    // Treino de reflexos: reduz o cooldown de ataque/disparo (até 2x mais rápido).
    const cd = atk.cd / (1 + (p.atkSpd || 0) * 0.1);
    p.attackCd = cd;
    p.attackAnim = cd;
    p.attackDur = cd;
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

  // Progressão do tiro carregado do Arqueiro: partículas de brilho e disparo
  // quando a preparação completa.
  chargeTick(dt) {
    const p = this.player;
    if (!p || !p.charging) return;
    const atk = p.sub.attack;
    p.chargeT -= dt;
    if (Math.random() < 0.6) {
      const a = p.aimAng;
      const px = p.x + Math.cos(a) * 20;
      const py = p.y + Math.sin(a) * 18;
      this.particles.push(new Particle({
        x: px + rand(-4, 4), y: py + rand(-4, 4),
        vx: Math.cos(a) * rand(20, 50) + rand(-12, 12),
        vy: Math.sin(a) * rand(20, 50) + rand(-12, 12),
        life: 0.3, color: '#fff3b0', size: rand(2, 4), grav: 0
      }));
    }
    if (p.chargeT <= 0) {
      p.charging = false;
      this.fireChargedArrow();
    }
  },

  fireChargedArrow() {
    const p = this.player;
    const atk = p.sub.attack;
    const dmg = this.calcStatDmg(atk.type, atk.chargedDmg || 2.5);
    const speed = atk.chargedSpeed || 1600;
    this.projectiles.push(new Projectile({
      x: p.x + Math.cos(p.aimAng) * 18, y: p.y + Math.sin(p.aimAng) * 18,
      vx: Math.cos(p.aimAng) * speed, vy: Math.sin(p.aimAng) * speed,
      dmg, type: atk.type, color: '#fff6d8', size: (atk.size || 6) + 2, life: 1.6,
      pierce: !!atk.pierce, owner: 'player', trail: true
    }));
    this.burst(p.x + Math.cos(p.aimAng) * 22, p.y + Math.sin(p.aimAng) * 22, '#fff3b0', 8, 160);
    this.ring(p.x, p.y, 26, 0.35, '#fff3b0', 4);
    this.shake += 8;
    this.sfx.shoot();
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

  // Armas de curta distância também ferem por simples contato físico.
  // O dano de contato é ~50% do dano do ataque normal, com um intervalo
  // por inimigo (espelha o toque dos monstros no jogador).
  contactHit(dt) {
    const p = this.player;
    const atk = p.sub.attack;
    if (!atk || atk.kind !== 'melee') return;
    const dmg = Math.max(1, Math.round(this.calcStatDmg(atk.type, atk.dmg) * 0.5));
    if (!p.contactHit) p.contactHit = {};
    for (const m of this.monsters) {
      if (m.dying || m.dead) continue;
      if (Math.hypot(m.x - p.x, m.y - p.y) > p.w / 2 + m.w / 2 + 2) continue;
      if ((p.contactHit[m] || 0) > 0) continue;
      p.contactHit[m] = 0.8;
      this.damageMonster(m, dmg, atk.type);
    }
    for (const k in p.contactHit) {
      p.contactHit[k] -= dt;
      if (p.contactHit[k] <= 0) delete p.contactHit[k];
    }
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
    const skills = this.player.allSkills();
    this.castSkillEntry(skills[i]);
  },

  // Conjura uma habilidade pelo id (usado pela hotbar/inventário).
  castSkillId(id) {
    this.castSkillEntry(this.player.learnedSkill(id));
  },

  castSkillEntry(s) {
    const p = this.player;
    if (!s || p.cd[s.id] > 0) return;
    p.cd[s.id] = s.cd;
    if (s.bless) { this.castBlessing(s); return; }
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
      case 'batismo': this.batismo(s); break;
      case 'caridade': this.caridade(s); break;
      case 'confession': this.confession(s); break;
      case 'uncao': this.uncao(s); break;
      case 'grande_exorcismo': this.grandeExorcismo(s); break;
    }
  },

  // Batismo: águas sagradas congelam todos os inimigos presentes na tela.
  batismo(s) {
    const p = this.player;
    const dur = s.freeze || 3;
    let n = 0;
    for (const m of this.monsters) {
      if (m.dying || m.dead) continue;
      m.frozenT = Math.max(m.frozenT || 0, dur);
      this.burst(m.x, m.y - 6, '#bfe8ff', 10, 150);
      this.ring(m.x, m.y, m.w * 0.8, 0.4, '#d6f2ff', 3);
      n++;
    }
    this.ring(p.x, p.y, 100, 0.65, '#bfe8ff', 4);
    this.burst(p.x, p.y, '#bfe8ff', 20, 240);
    this.sfx.holy();
    if (n > 0) this.text(p.x, p.y - 34, 'Batismo: ' + n + ' inimigo(s) congelado(s)!', '#d6f2ff', 16);
  },

  // Bênção da Caridade: luz derramada fere todos os inimigos da tela de uma vez.
  caridade(s) {
    const p = this.player;
    const dmg = this.calcStatDmg(s.type, s.dmg);
    let n = 0;
    for (const m of this.monsters) {
      if (m.dying || m.dead) continue;
      this.damageMonster(m, dmg, s.type);
      this.burst(m.x, m.y - 6, '#ffe66d', 8, 130);
      n++;
    }
    this.ring(p.x, p.y, 220, 0.65, '#ffe66d', 5);
    this.burst(p.x, p.y, '#ffe66d', 22, 260);
    this.pillarFx(p.x, p.y, 90);
    if (n > 0) this.shake += 4;
    this.sfx.holy();
    if (n === 0) this.banner('Nenhum inimigo para abençoar.', '#ffe66d', 1.2);
  },

  // Confissão: o Padre se recolhe espiritualmente e fica imune a qualquer dano.
  confession(s) {
    const p = this.player;
    p.status.immune = s.immune || 10;
    this.ring(p.x, p.y, 60, 0.8, '#ffe66d', 3);
    this.burst(p.x, p.y, '#ffe66d', 14, 140);
    this.sfx.buff();
    this.text(p.x, p.y - 34, 'Confissão: imune por ' + Math.round(p.status.immune) + 's', '#ffe66d', 15);
  },

  // Unção dos Enfermos: cura toda a vida e fortalece o dano por 15s.
  uncao(s) {
    const p = this.player;
    p.hp = p.maxHp;
    p.status.dmg = s.dmg || 0.30;
    p.status.dur = s.dur || 15;
    p.status.uncaoT = s.dur || 15;
    this.text(p.x, p.y - 26, 'Vida cheia!', '#7cff8a', 17);
    this.healEffect(p);
    this.ring(p.x, p.y, 70, 0.8, '#ffd27f', 4);
    this.burst(p.x, p.y, '#ffd27f', 18, 200);
    this.sfx.heal();
    this.sfx.buff();
    this.text(p.x, p.y - 42, '+30% de dano por 15s', '#ffd27f', 14);
  },

  // Grande Exorcismo: luz sagrada varre a tela, ferindo todos os inimigos visíveis.
  grandeExorcismo(s) {
    const p = this.player;
    const dmg = s.dmg || 140;
    let n = 0;
    for (const m of this.monsters) {
      if (m.dying || m.dead) continue;
      this.damageMonster(m, dmg, s.type || T.HOLY);
      this.burst(m.x, m.y - 8, '#fff3b0', 10, 170);
      n++;
    }
    this.pillarFx(p.x, p.y, 150);
    this.ring(p.x, p.y, 90, 0.9, '#fff3b0', 8);
    this.ring(p.x, p.y, 170, 0.9, '#fff3b0', 6);
    this.ring(p.x, p.y, 250, 0.9, '#ffe9b0', 5);
    this.burst(p.x, p.y, '#ffffff', 36, 400);
    this.burst(p.x, p.y, '#fff3b0', 26, 300);
    this.shake += 18;
    this.sfx.explosion();
    this.sfx.holy();
    if (n === 0) this.banner('Nenhum inimigo para exorcizar.', '#fff3b0', 1.2);
    else this.text(p.x, p.y - 34, 'Grande Exorcismo: ' + n + ' inimigo(s) purgado(s)!', '#fff3b0', 16);
  },

  // Bênçãos: cada bênção aproveita os mesmos efeitos/ajudantes já usados pelas
  // habilidades (área, disparo, raio, teleporte, cura, buff, escudo).
  castBlessing(b) {
    const p = this.player;
    switch (b.bless) {
      case 'nova':
        this.rezaMaior(b);
        // Identidade própria entre as duas novas de luz: Luz brilha com
        // faíscas suaves ao redor do fiel; a Fúria abala o chão.
        if (b.id === 'bencao_furia') this.shake += 8;
        else if (b.id === 'bencao_luz') this.blessingFx(p, b.color, 6);
        break;
      case 'heal': {
        const amt = Math.round(p.maxHp * b.heal);
        p.hp = Math.min(p.maxHp, p.hp + amt);
        if (b.purge) { p.status.venom = 0; p.status.venomCd = 0; p.status.dmg = 0; p.status.spd = 0; p.status.dur = 0; }
        this.text(p.x, p.y - 26, '+' + amt, '#7cff8a', 18);
        this.healEffect(p);
        this.blessingFx(p, '#7cff8a', 10);
        this.sfx.heal();
        break;
      }
      case 'buff':
        p.status.dmg = b.dmg; p.status.spd = b.spd; p.status.dur = b.dur;
        this.burst(p.x, p.y, b.color, 12, 180);
        this.blessingFx(p, b.color, 12);
        this.sfx.buff();
        break;
      case 'shield':
        p.status.shield = b.shield; p.status.shieldT = b.dur;
        this.burst(p.x, p.y, '#ffe9a0', 12, 180);
        this.blessingFx(p, '#ffe9a0', 10);
        this.sfx.buff();
        break;
      case 'blink': this.passoLuz(b); break;
      case 'barrage': this.blessBarrage(b); break;
      case 'bolt': this.shootPlayerSkill(b); break;
      case 'beam': this.beam(b); break;
      case 'supreme': this.useSupreme(); break;
    }
  },

  blessBarrage(b) {
    const p = this.player;
    const dmg = this.calcStatDmg(b.type, b.dmg);
    for (let k = 0; k < b.n; k++) {
      const off = (k - (b.n - 1) / 2) * (b.spread || 0);
      const ang = p.aimAng + off;
      this.projectiles.push(new Projectile({
        x: p.x + Math.cos(ang) * 16, y: p.y + Math.sin(ang) * 16,
        vx: Math.cos(ang) * b.speed, vy: Math.sin(ang) * b.speed,
        dmg, type: b.type, color: b.color, size: b.size || 7, life: 1.4,
        pierce: !!b.pierce, owner: 'player', trail: true
      }));
    }
    this.sfx.skill();
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
    p.spinT = 0.5;
    p.spinDur = 0.5;
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

};
