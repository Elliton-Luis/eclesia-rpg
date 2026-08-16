import { T, RUN, HOTBAR_SLOTS } from '../data/constants.js';
import { rand, clamp } from '../data/utils.js';
import { BLESSINGS } from '../data/blessings.js';
import { RELICS, MAX_RELICS } from '../data/relics.js';
import { Particle } from './effects.js';

// Paleta visual de cada subclasse (somente aparência; não afeta atributos,
// habilidades ou efeitos de combate). Aplicada ao sprite desenhado no canvas.
const LOOKS = {
  diacono:    { robe: '#d6ece5', robeDark: '#a9d6cb', robeShade: '#d6ece5', trim: '#2f8a8a', trim2: '#ffffff', belt: '#2f8a8a', skin: '#e9c29b', hair: '#3a4a44' },
  padre:      { robe: '#2a2e35', robeDark: '#1b1e24', robeShade: '#3a3f4a', trim: '#cfaa5a', trim2: '#f6f2e6', belt: '#1b1e24', skin: '#e9c29b', hair: '#3a3a44' },
  bispo:      { robe: '#9e002a', robeDark: '#68001c', robeShade: '#c21f42', trim: '#d9b13f', trim2: '#fdf6ec', belt: '#d9b13f', skin: '#e9c29b', hair: '#e8e8ee' },
  guerreiro:  { tabard: '#ddd5c0', trim: '#a32222', steel: '#8a919c', steelDark: '#5c636e', helm: '#aab1bc', helmDark: '#747c89', skin: '#e9c29b' },
  arqueiro:   { hood: '#4e4a40', hoodDark: '#35322b', trim: '#a32222', tabard: '#ddd5c0', leather: '#3e3122', steel: '#8a919c', skin: '#e9c29b' },
  inventor:   { apron: '#6f4e2e', apronDark: '#553a20', trim: '#a32222', tabard: '#ddd5c0', leather: '#3e3122', steel: '#8a919c', skin: '#e9c29b', hair: '#4a3c26' },
  elemental:  { robe: '#3d5fd6', robeDark: '#2b43a0', robeShade: '#6a87e8', trim: '#f2c14e', trim2: '#eaf2ff', belt: '#2b43a0', skin: '#e9c29b', hair: '#34344a' },
  psiquico:   { robe: '#c0392b', robeDark: '#8e241a', robeShade: '#e0604a', trim: '#f2cf54', trim2: '#ffe9e6', belt: '#8e241a', skin: '#e9c29b', hair: '#3a3030' },
  abencoador: { robe: '#2f9e63', robeDark: '#21784a', robeShade: '#52c68d', trim: '#eef3e6', trim2: '#d8f2e4', belt: '#21784a', skin: '#e9c29b', hair: '#6a5232' },
  papa: { robe: '#f8f4e4', robeDark: '#dcd3b4', robeShade: '#ffffff', trim: '#e6b422', trim2: '#ffffff', belt: '#e6b422', skin: '#e9c29b', hair: '#f0ece2' }
};

export class Player {
  constructor(sub, x, y, game) {
    this.sub = sub;
    this.game = game;
    this.x = x;
    this.y = y;
    this.w = 26;
    this.h = 34;
    this.maxHp = sub.hp;
    this.hp = sub.hp;
    this.spd = sub.speed;
    this.str = sub.str;
    this.int = sub.int;
    this.weapon = Object.assign({}, sub.weapon, { tier: 0, dmg: sub.weapon.base });
    this.gold = 0;
    this.fulmen = 0;
    this.vx = 0;
    this.vy = 0;
    this.facing = 1;
    this.ghost = false;
    this.mv = { x: 0, y: 0 };
    this.aimAng = 0;
    this.aimDir = { x: 1, y: 0 };
    this.attackCd = 0;
    this.attackAnim = 0;
    this.attackDur = 1;
    this.charging = false;
    this.chargeT = 0;
    this.chargeMax = 1;
    this.spinT = 0;
    this.spinDur = 1;
    this.combo = 0;
    this.comboT = 0;
    this.invuln = 0;
    this.hurtT = 0;
    this.walkT = 0;
    this.dashT = 0;
    this.dashDir = { x: 1, y: 0 };
    this.dashDmg = 0;
    this.dashType = T.PHYS;
    this.dashHit = new Set();
    this.status = { shield: 0, shieldT: 0, dmg: 0, spd: 0, regen: 0, dur: 0, venom: 0, venomCd: 0, fatigue: 0, immune: 0, uncaoT: 0 };
    this.cd = {};
    this.extraSkills = [];
    this.mw = null;
    this.items = {};
    this.blessings = [];
    // Relíquias equipadas e obtidas nesta jornada (máx MAX_RELICS equipadas).
    this.relics = [];
    this.ownedRelics = [];
    this.passiveRegen = 0;
    this.contactHit = {};
    this.supremeBlessed = false;
    this.supremeUses = 0;
    this.supreme = null;
    // Hotbar: até HOTBAR_SLOTS habilidades equipadas simultaneamente (teclas 1–0).
    // O jogador aprende quantas habilidades quiser; apenas as equipadas aqui
    // podem ser usadas rapidamente em combate.
    this.hotKeys = new Array(HOTBAR_SLOTS).fill(null);
    this.atkSpd = 0; // +0.1 por nível de treino de reflexos
    this.sub.skills.forEach(s => { this.cd[s.id] = 0; });
    // As duas habilidades base da classe já iniciam equipadas nos primeiros slots.
    this.sub.skills.forEach((s, i) => { if (i < HOTBAR_SLOTS) this.hotKeys[i] = s.id; });
  }

  allSkills() {
    return this.sub.skills.concat(this.extraSkills, this.blessings);
  }

  // Todas as habilidades conhecidas (aprendidas ou concedidas), incluindo a
  // Bênção Suprema quando o jogador foi digno de recebê-la.
  allKnownSkills() {
    const list = this.allSkills();
    if (this.supremeBlessed && this.supreme) list.push(this.supreme);
    return list;
  }

  learnedSkill(id) {
    if (!id) return null;
    return this.allKnownSkills().find(s => s.id === id) || null;
  }

  // Concede a Bênção Suprema (Papa/cheat) e equipa-a automaticamente na hotbar.
  grantSupreme() {
    this.supremeBlessed = true;
    this.supremeUses = 1;
    this.supreme = Object.assign({}, BLESSINGS.bencao_suprema);
    this.tryEquip('bencao_suprema');
  }

  // Garante o item Fulmen Ruptor como habilidade conhecida (compra no Vendedor
  // ou restauro do estoque persistente no início da partida), equipando-o na
  // hotbar quando ainda não estava aprendido.
  grantFulmen(n) {
    this.fulmen += n;
    if (n <= 0 || this.learnedSkill('fulmen_ruptor')) return;
    this.blessings.push(Object.assign({}, BLESSINGS.fulmen_ruptor));
    this.tryEquip('fulmen_ruptor');
  }

  // A classe do personagem pode usar a relíquia? 'all' libera para todos;
  // senão valida por subclasse e/ou casta.
  relicAllowed(id) {
    const r = RELICS[id];
    if (!r) return false;
    if (r.allowed === '*') return true;
    if (r.allowed.subs && r.allowed.subs.includes(this.sub.id)) return true;
    if (r.allowed.casta && r.allowed.casta === this.sub.casta) return true;
    return false;
  }

  equipRelic(id) {
    const r = RELICS[id];
    if (!r) return false;
    if (this.relics.includes(id)) return false;
    if (!this.ownedRelics.includes(id)) return false;
    if (!this.relicAllowed(id)) return false;
    if (this.relics.length >= MAX_RELICS) return false;
    const e = r.effects || {};
    if (e.hp) { this.maxHp += e.hp; this.hp += e.hp; }
    if (e.str) this.str += e.str;
    if (e.int) this.int += e.int;
    if (e.spd) this.spd += e.spd;
    if (e.regen) this.passiveRegen = (this.passiveRegen || 0) + e.regen;
    this.relics.push(id);
    return true;
  }

  unequipRelic(id) {
    const i = this.relics.indexOf(id);
    if (i === -1) return false;
    const r = RELICS[id];
    this.relics.splice(i, 1);
    if (r) {
      const e = r.effects || {};
      if (e.hp) { this.maxHp = Math.max(1, this.maxHp - e.hp); this.hp = Math.min(this.hp, this.maxHp); }
      if (e.str) this.str = Math.max(0, this.str - e.str);
      if (e.int) this.int = Math.max(0, this.int - e.int);
      if (e.spd) this.spd = Math.max(0, this.spd - e.spd);
      if (e.regen) this.passiveRegen = Math.max(0, (this.passiveRegen || 0) - e.regen);
    }
    return true;
  }

  // Concede posse de uma relíquia (NPCs, eventos raros). Equipar fica por conta
  // do jogador, respeitando a restrição de classe.
  grantRelic(id) {
    if (!RELICS[id] || this.ownedRelics.includes(id)) return false;
    this.ownedRelics.push(id);
    return true;
  }

  // Multiplicador global de cooldown imposto pelas relíquias equipadas.
  relicsCdMult() {
    let m = 1;
    for (const id of this.relics) {
      const e = (RELICS[id] && RELICS[id].effects) || {};
      if (e.cdMult) m *= e.cdMult;
    }
    return m;
  }

  // Slot em que a habilidade está equipada, ou -1 se não estiver.
  findSlot(id) {
    for (let i = 0; i < this.hotKeys.length; i++) {
      if (this.hotKeys[i] === id) return i;
    }
    return -1;
  }

  hotSkill(i) {
    return this.learnedSkill(this.hotKeys[i]);
  }

  // Equipa a habilidade no primeiro slot livre; retorna false se a hotbar
  // estiver cheia (a restrição de equipamento fica somente na hotbar).
  tryEquip(id) {
    if (!this.learnedSkill(id) || this.findSlot(id) !== -1) return true;
    for (let i = 0; i < this.hotKeys.length; i++) {
      if (!this.hotKeys[i]) { this.hotKeys[i] = id; return true; }
    }
    return false;
  }

  equipSkill(id, slot) {
    if (slot < 0 || slot >= this.hotKeys.length) return;
    if (!this.learnedSkill(id)) return;
    // Garante que nunca haja a mesma habilidade duplicada em dois slots.
    for (let i = 0; i < this.hotKeys.length; i++) {
      if (this.hotKeys[i] === id) this.hotKeys[i] = null;
    }
    this.hotKeys[slot] = id;
  }

  unequipSlot(slot) {
    if (slot >= 0 && slot < this.hotKeys.length) this.hotKeys[slot] = null;
  }

  // Ímã: item de utilidade equipável. Está "equipado" quando ocupa um slot da
  // hotbar; enquanto equipado concede o bônus passivo de raio de coleta.
  magnetEquipped() {
    return this.findSlot('ima') !== -1;
  }

  box() { return { x: this.x - this.w / 2, y: this.y - this.h / 2, w: this.w, h: this.h }; }

  update(dt, g) {
    const K = g.keys;
    const st = this.status;

    this.attackCd = Math.max(0, this.attackCd - dt);
    this.attackAnim = Math.max(0, this.attackAnim - dt);
    this.spinT = Math.max(0, this.spinT - dt);
    this.comboT -= dt;
    if (this.comboT <= 0) this.combo = 0;
    for (const id in this.cd) this.cd[id] = Math.max(0, this.cd[id] - dt);
    this.invuln = Math.max(0, this.invuln - dt);
    this.hurtT = Math.max(0, this.hurtT - dt);

    st.dur -= dt;
    if (st.dur <= 0) { st.dmg = 0; st.spd = 0; st.regen = 0; }
    st.immune = Math.max(0, st.immune - dt);
    if (st.uncaoT > 0) {
      st.uncaoT -= dt;
      if (Math.random() < 0.25) {
        g.particles.push(new Particle({
          x: this.x + rand(-12, 12), y: this.y + rand(-4, 10),
          vx: rand(-8, 8), vy: -28 - Math.random() * 22, life: 0.7,
          color: '#ffcf8a', size: rand(2, 4), grav: 0
        }));
      }
    }
    if (st.shieldT > 0) st.shieldT -= dt; else st.shield = 0;
    // Fadiga espiritual (de exorcismo): lentidão visível e leve enfraquecimento.
    if (st.fatigue > 0) {
      st.fatigue -= dt;
      if (Math.random() < 0.25) {
        g.particles.push(new Particle({
          x: this.x + rand(-12, 12), y: this.y + rand(-8, 14),
          vx: rand(-10, 10), vy: 8 + Math.random() * 10, life: 0.6,
          color: '#7a7a8a', size: 2 + Math.random(), grav: 40
        }));
      }
    }
    // Fe de fé: bônus temporário decrescente
    if (st.faithT > 0) {
      st.faithT -= dt;
      if (st.faithT <= 0) { st.faith = Math.max(0, st.faith - 0.02); }
    }
    if (st.regen > 0 && this.hp < this.maxHp) {
      this.hp = Math.min(this.maxHp, this.hp + this.maxHp * st.regen * dt);
      if (Math.random() < 0.15) {
        g.particles.push(new Particle({ x: this.x + rand(-10, 10), y: this.y + rand(-10, 10), vx: 0, vy: 0, life: 0.5, color: '#c4ffb0', size: 3, grav: 0 }));
      }
    }
    // Regeneração passiva de relíquias (não expira com o temporário status.regen).
    if (this.passiveRegen > 0 && this.hp < this.maxHp) {
      this.hp = Math.min(this.maxHp, this.hp + this.maxHp * this.passiveRegen * dt);
    }

    const ix = (K.KeyD || K.ArrowRight ? 1 : 0) - (K.KeyA || K.ArrowLeft ? 1 : 0);
    const iy = (K.KeyS || K.ArrowDown ? 1 : 0) - (K.KeyW || K.ArrowUp ? 1 : 0);
    const run = K.ShiftLeft || K.ShiftRight;
    // Fadiga corta a velocidade à metade e impede correr.
    const exhaustMul = st.fatigue > 0 ? 0.5 : 1;
    const base = this.spd * (run && st.fatigue <= 0 ? RUN : 1) * (1 + (st.spd || 0)) * exhaustMul;

    let mx = 0, my = 0;
    if (ix !== 0 || iy !== 0) { const l = Math.hypot(ix, iy); mx = ix / l; my = iy / l; }
    this.mv = { x: mx, y: my };

    this.vx += (mx * base - this.vx) * Math.min(1, dt * 12);
    this.vy += (my * base - this.vy) * Math.min(1, dt * 12);
    if (mx !== 0) this.facing = mx > 0 ? 1 : -1;

    if (g.mouseActive && g.mouseMoved) {
      this.aimAng = Math.atan2(g.aim.y - this.y, g.aim.x - this.x);
    } else if (mx !== 0 || my !== 0) {
      this.aimAng = Math.atan2(my, mx);
    }
    this.aimDir = { x: Math.cos(this.aimAng), y: Math.sin(this.aimAng) };

    if (this.dashT > 0) {
      this.dashT -= dt;
      this.vx = this.dashDir.x * 920;
      this.vy = this.dashDir.y * 920;
      g.dashHit(this);
      if (Math.random() < 0.6) {
        g.particles.push(new Particle({ x: this.x - this.dashDir.x * 10, y: this.y - this.dashDir.y * 10, vx: -this.dashDir.x * 60, vy: -this.dashDir.y * 60, life: 0.3, color: this.sub.accent, size: 4, grav: 0 }));
      }
    }

    g.world.move(this, this.vx * dt, this.vy * dt);

    if (Math.hypot(this.vx, this.vy) > 20) this.walkT += dt;
  }

  draw(ctx, t) {
    const s = this.sub;
    const moving = Math.hypot(this.vx, this.vy) > 20;
    const bob = moving ? Math.sin(this.walkT * 14) * 2 : 0;

    ctx.globalAlpha = 0.22;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + this.h / 2 + 2, this.w / 2, 5, 0, 0, 6.283);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.save();
    if (this.hurtT > 0) ctx.globalAlpha = 0.6;
    if (this.invuln > 0 && Math.floor(t * 20) % 2 === 0) ctx.globalAlpha *= 0.5;

    ctx.translate(this.x, this.y + bob);
    const fy = this.h / 2;

    // aura passiva brilhando ao redor (clero)
    if (s.aura) {
      ctx.globalAlpha = 0.12 + Math.sin(t * 4) * 0.05;
      ctx.fillStyle = s.accent;
      ctx.beginPath();
      ctx.arc(0, fy - 16, s.aura.radius * 0.32, 0, 6.283);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Fadiga espiritual: aura cinzenta abatida quando o clero está exausto.
    if (this.status.fatigue > 0) {
      const k = Math.min(1, this.status.fatigue / 20);
      ctx.globalAlpha = 0.18 + Math.sin(t * 2) * 0.06;
      ctx.fillStyle = '#5a5a6a';
      ctx.beginPath();
      ctx.arc(0, fy - 14, 20 + Math.sin(t * 3) * 2, 0, 6.283);
      ctx.fill();
      ctx.globalAlpha = 0.6 * k;
      ctx.strokeStyle = '#8a8a9a';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(0, fy - 14, 24, 0, 6.283);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }

    ctx.scale(this.facing, 1);

    const L = this.look(s);
    const boot = s.casta === 'templarios' ? '#4a4438' : '#3a3a44';
    const legA = moving ? Math.sin(this.walkT * 14) * 4 : 0;
    const legB = moving ? -Math.sin(this.walkT * 14) * 4 : 0;
    ctx.fillStyle = '#2b2b33';
    ctx.fillRect(-9 + legA * 0.3, fy - 8, 5, 5);
    ctx.fillRect(4 + legB * 0.3, fy - 8, 5, 5);
    ctx.fillStyle = boot;
    ctx.fillRect(-9 + legA * 0.3, fy - 3, 5, 3);
    ctx.fillRect(4 + legB * 0.3, fy - 3, 5, 3);

    this.drawBody(ctx, s, fy);
    this.drawHead(ctx, s, fy);

    this.drawWeapon(ctx, fy);

    // Giro do Guerreiro: arcos de lâmina girando ao redor do corpo.
    if (this.spinT > 0 && this.spinDur > 0) {
      const prog = 1 - this.spinT / this.spinDur;
      const ang = prog * Math.PI * 2 * 1.8;
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = '#ff9d5c';
      ctx.lineWidth = 4;
      for (let i = 0; i < 3; i++) {
        const a = ang + i * 2.09;
        ctx.beginPath();
        ctx.arc(0, fy - 16, 24 + i * 9, a, a + 0.85);
        ctx.stroke();
      }
      ctx.globalAlpha = 0.55 * (1 - prog * 0.45);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      for (let i = 0; i < 9; i++) {
        const a = ang + i * 0.7;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 20, fy - 16 + Math.sin(a) * 20);
        ctx.lineTo(Math.cos(a) * 34, fy - 16 + Math.sin(a) * 34);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // Confissão: halo dourado discreto de proteção (imunidade).
    if (this.status.immune > 0) {
      const pulse = 0.5 + Math.sin(t * 5) * 0.2;
      ctx.globalAlpha = 0.3 + pulse * 0.2;
      ctx.strokeStyle = '#ffe66d';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, fy - 16, 25, 0, 6.283);
      ctx.stroke();
      ctx.globalAlpha = 0.16 + pulse * 0.14;
      ctx.fillStyle = '#ffe66d';
      ctx.beginPath();
      ctx.arc(0, fy - 16, 30, 0, 6.283);
      ctx.fill();
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#fff6d8';
      ctx.beginPath();
      ctx.arc(0, fy - 16, 2 + Math.sin(t * 9) * 1.5, 0, 6.283);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Unção dos Enfermos: aura quente e pulsante de fortalecimento.
    if (this.status.uncaoT > 0) {
      const pulse = 0.5 + Math.sin(t * 7) * 0.3;
      ctx.globalAlpha = 0.35 + pulse * 0.3;
      ctx.strokeStyle = '#ffb35c';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, fy - 16, 17 + pulse * 3, 0, 6.283);
      ctx.stroke();
      ctx.globalAlpha = 0.15 + pulse * 0.2;
      ctx.fillStyle = '#ff9d5c';
      ctx.beginPath();
      ctx.arc(0, fy - 16, 25 + pulse * 5, 0, 6.283);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    if (this.status.shieldT > 0) {
      ctx.strokeStyle = '#ffe9a0';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.arc(0, fy - 16, 20, 0, 6.283);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  look(s) {
    const l = LOOKS[s.id];
    if (l) return l;
    return {
      robe: s.color, robeDark: s.color, robeShade: s.accent, trim: s.accent, trim2: '#ffffff',
      belt: s.accent, skin: '#e9c29b', hair: '#3a3a44',
      helm: s.accent, helmDark: s.accent, steel: s.accent, steelDark: s.accent,
      tabard: s.color, hood: s.color, hoodDark: s.color, leather: s.accent,
      apron: s.color, apronDark: s.color
    };
  }

  drawBody(ctx, s, fy) {
    const L = this.look(s);
    if (s.casta === 'clero') this.drawClergyBody(ctx, s, L, fy);
    else if (s.casta === 'templarios') this.drawTemplarBody(ctx, s, L, fy);
    else this.drawMageBody(ctx, s, L, fy);
  }

  drawClergyBody(ctx, s, L, fy) {
    const wTop = 8, wBot = 11;
    // veste em trapézio (alb/batina)
    ctx.fillStyle = L.robe;
    ctx.beginPath();
    ctx.moveTo(-wTop, fy - 19);
    ctx.lineTo(-wBot, fy - 2);
    ctx.quadraticCurveTo(0, fy, wBot, fy - 2);
    ctx.lineTo(wTop, fy - 19);
    ctx.closePath();
    ctx.fill();
    // sombreamento lateral
    ctx.fillStyle = L.robeDark;
    ctx.beginPath();
    ctx.moveTo(-wTop, fy - 19);
    ctx.lineTo(-wBot, fy - 2);
    ctx.quadraticCurveTo(0, fy, 0, fy - 1);
    ctx.lineTo(0, fy - 19);
    ctx.closePath();
    ctx.fill();
    // cíngulo
    ctx.fillStyle = L.belt;
    ctx.fillRect(-wBot + 1, fy - 10, (wBot - 1) * 2, 1.6);

    if (s.id === 'diacono') {
      // estola diagonal de diácono
      ctx.save();
      ctx.translate(0, fy - 10);
      ctx.rotate(-0.5);
      ctx.fillStyle = L.trim;
      ctx.fillRect(-1.1, -9, 2.2, 18);
      ctx.restore();
    } else if (s.id === 'padre') {
      // colarinho romano na gola
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-2.4, fy - 20.4, 4.8, 2.4);
      // estola + botões da batina
      ctx.fillStyle = L.trim;
      ctx.fillRect(-3.4, fy - 17, 1.7, 15);
      ctx.fillRect(1.7, fy - 17, 1.7, 15);
      ctx.fillStyle = L.trim2;
      ctx.fillRect(-0.8, fy - 13, 1.6, 1.6);
      ctx.fillRect(-0.8, fy - 8, 1.6, 1.6);
      ctx.fillRect(-0.8, fy - 3, 1.6, 1.6);
    // Moços de luz: personagem do jogador
    } else if (s.id === 'papa') {
      // Papa: veste alva e imponente — mais larga que a do Bispo — com o pálio
      // dourado e a barra orlada de ouro. A silhueta é reconhecível à distância.
      ctx.fillStyle = '#f8f4e4';
      ctx.beginPath();
      ctx.moveTo(-wTop - 2.5, fy - 19);
      ctx.lineTo(-wBot - 2.5, fy - 2);
      ctx.quadraticCurveTo(0, fy, wBot + 2.5, fy - 2);
      ctx.lineTo(wTop + 2.5, fy - 19);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#dcd3b4';
      ctx.beginPath();
      ctx.moveTo(-wTop - 2.5, fy - 19);
      ctx.lineTo(-wBot - 2.5, fy - 2);
      ctx.quadraticCurveTo(0, fy, 0, fy);
      ctx.lineTo(0, fy - 19);
      ctx.closePath();
      ctx.fill();
      // pálio central dourado (faixa vertical)
      ctx.fillStyle = '#e6b422';
      ctx.fillRect(-1.4, fy - 19, 2.8, 15);
      // cinturão de ouro
      ctx.fillStyle = '#e6b422';
      ctx.fillRect(-wBot, fy - 10.6, (wBot - 1) * 2, 1.8);
      // galões de ouro (chaves de São Pedro) no peito
      ctx.fillStyle = '#c9a227';
      ctx.fillRect(-3.5, fy - 14, 7, 1.4);
      ctx.fillRect(-1.2, fy - 16, 2.4, 5);
      // barra inferior orlada de ouro
      ctx.fillStyle = '#e6b422';
      ctx.fillRect(-wBot - 2, fy - 3.2, (wBot + 2) * 2, 1.8);
    } else {
      // bispo: roquete branco + palio dourado + cruz peitoral
      ctx.fillStyle = 'rgba(253,246,236,0.92)';
      ctx.fillRect(-4.2, fy - 19, 8.4, 17);
      ctx.fillStyle = L.trim;
      ctx.fillRect(-1.2, fy - 19, 2.4, 10);
      ctx.fillRect(-4.5, fy - 12, 9, 1.8);
      ctx.fillRect(-1.2, fy - 9, 2.4, 4);
      ctx.fillStyle = '#e8f0e4';
      ctx.fillRect(-0.9, fy - 14.5, 1.8, 4);
      ctx.fillRect(-2.5, fy - 13.2, 5, 1.6);
      // mozeta escarlate nos ombros
      ctx.fillStyle = L.robe;
      ctx.beginPath(); ctx.arc(-9.5, fy - 18, 3.2, Math.PI * 0.55, Math.PI * 1.45); ctx.fill();
      ctx.beginPath(); ctx.arc(9.5, fy - 18, 3.2, Math.PI * -0.45, Math.PI * 0.45); ctx.fill();
      // galão dourado na barra
      ctx.fillStyle = L.trim;
      ctx.fillRect(-wBot + 1, fy - 4, (wBot - 1) * 2, 1.6);
    }
  }

  drawTemplarBody(ctx, s, L, fy) {
    const w = s.id === 'arqueiro' ? 8 : 10;
    ctx.fillStyle = L.steel || L.leather;
    ctx.fillRect(-w, fy - 18, w * 2, 15);

    if (s.id === 'guerreiro') {
      // cavaleiro pesado: tórax em placas, ombreiras maciças e a sobreveste
      // branca do Templo — a paleta escura confere peso e imponência.
      // bandas de placas no peitoral
      ctx.fillStyle = L.steelDark;
      ctx.fillRect(-w, fy - 18, w * 2, 3);
      ctx.fillRect(-w, fy - 12.6, w * 2, 2);
      ctx.fillRect(-w, fy - 8, w * 2, 2);
      // ombreiras enormes (placas arredondadas) com rebite no alto
      for (const sx of [-1, 1]) {
        ctx.fillStyle = L.steel;
        ctx.beginPath(); ctx.arc(sx * (w + 2.5), fy - 16.5, 5.4, 0, 6.283); ctx.fill();
        ctx.fillStyle = L.steelDark;
        ctx.beginPath(); ctx.arc(sx * (w + 2.5), fy - 15.6, 3.6, 0, 6.283); ctx.fill();
        ctx.fillStyle = L.helm;
        ctx.beginPath(); ctx.arc(sx * (w + 2.5), fy - 19, 2.2, 0, 6.283); ctx.fill();
      }
      // gorjal (proteção do pescoço)
      ctx.fillStyle = L.steelDark;
      ctx.fillRect(-w, fy - 20.4, w * 2, 2.6);
      // sobreveste branca do Templo com cruz vermelha frontal
      ctx.fillStyle = L.tabard;
      ctx.fillRect(-7, fy - 14, 14, 12);
      ctx.fillStyle = L.trim;
      ctx.fillRect(-1, fy - 13, 2, 9);
      ctx.fillRect(-4.5, fy - 10.4, 9, 2);
      // cinto de placas + cota de malha aparecendo na barra
      ctx.fillStyle = L.steelDark;
      ctx.fillRect(-w, fy - 5, w * 2, 2);
      ctx.fillRect(-7, fy - 3, 14, 1.4);
    } else if (s.id === 'arqueiro') {
      // especialista em arco: gibão escuro com coifa de malha e sobreveste
      // curta do Templo — rápido, porém na cor da ordem.
      ctx.fillStyle = L.leather;
      ctx.fillRect(-8.5, fy - 18, 17, 15);
      // cota de malha nos ombros e nas laterais do torso
      ctx.fillStyle = L.steel;
      ctx.fillRect(-9, fy - 18.6, 18, 2.4);
      ctx.fillRect(-7.5, fy - 17.4, 2, 12);
      ctx.fillRect(5.5, fy - 17.4, 2, 12);
      // sobreveste do Templo com cruz
      ctx.fillStyle = L.tabard;
      ctx.fillRect(-4.5, fy - 15.5, 9, 9);
      ctx.fillStyle = L.trim;
      ctx.fillRect(-0.8, fy - 14, 1.6, 6);
      ctx.fillRect(-3, fy - 12.2, 6, 1.6);
      // aljava com pena vermelha (assinatura da ordem)
      ctx.fillStyle = L.leather;
      ctx.fillRect(-10.5, fy - 17, 3, 9);
      ctx.fillStyle = L.trim;
      ctx.fillRect(-10.5, fy - 16, 3, 1.6);
      ctx.beginPath(); ctx.moveTo(-11.2, fy - 17.6); ctx.lineTo(-10.6, fy - 19.4); ctx.lineTo(-9.9, fy - 17.2); ctx.closePath(); ctx.fill();
      // cinto
      ctx.fillStyle = '#4a3a2a';
      ctx.fillRect(-8.5, fy - 5, 17, 1.6);
    } else {
      // inventor: engenho do Templo — túnica escura, avental de forja e faixa
      // de ferramentas, com a cruz fundida no peito.
      ctx.fillStyle = L.leather;
      ctx.fillRect(-9, fy - 18, 18, 16);
      // ombreiras de couro acolchoadas
      ctx.beginPath(); ctx.arc(-9, fy - 17, 3.4, Math.PI * 0.6, Math.PI * 1.4); ctx.fill();
      ctx.beginPath(); ctx.arc(9, fy - 17, 3.4, Math.PI * -0.4, Math.PI * 0.4); ctx.fill();
      // avental de ferreiro
      ctx.fillStyle = L.apron;
      ctx.beginPath();
      ctx.moveTo(-6, fy - 17);
      ctx.lineTo(6, fy - 17);
      ctx.lineTo(7, fy - 3);
      ctx.lineTo(-7, fy - 3);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = L.apronDark;
      ctx.fillRect(-7, fy - 3, 14, 1.8);
      // tiras do avental
      ctx.fillStyle = '#3a2a18';
      ctx.fillRect(-7, fy - 15, 2.4, 9);
      ctx.fillRect(4.6, fy - 15, 2.4, 9);
      // cruz do Templo gravada no peito
      ctx.fillStyle = L.tabard;
      ctx.fillRect(-3.2, fy - 14.5, 6.4, 5.4);
      ctx.fillStyle = L.trim;
      ctx.fillRect(-0.9, fy - 13.4, 1.8, 4.2);
      ctx.fillRect(-2.8, fy - 11.9, 5.6, 1.5);
      // faixa de ferramentas com bolsos
      ctx.fillStyle = '#3a2a18';
      ctx.fillRect(-8.5, fy - 7.5, 17, 2.2);
      ctx.fillStyle = L.apronDark;
      ctx.fillRect(-6.5, fy - 7, 2.8, 4.4);
      ctx.fillRect(4, fy - 7, 2.8, 4.4);
    }
  }

  drawMageBody(ctx, s, L, fy) {
    // manto com saia esvoaçante
    ctx.fillStyle = L.robe;
    ctx.beginPath();
    ctx.moveTo(-7, fy - 19);
    ctx.lineTo(-11, fy - 2);
    ctx.quadraticCurveTo(0, fy + 1, 11, fy - 2);
    ctx.lineTo(7, fy - 19);
    ctx.closePath();
    ctx.fill();
    // sombreamento
    ctx.fillStyle = L.robeDark;
    ctx.beginPath();
    ctx.moveTo(-7, fy - 19);
    ctx.lineTo(-11, fy - 2);
    ctx.quadraticCurveTo(0, fy + 1, 0, fy);
    ctx.lineTo(0, fy - 19);
    ctx.closePath();
    ctx.fill();
    // abertura central + cinto
    ctx.fillStyle = L.robeDark;
    ctx.fillRect(-0.8, fy - 19, 1.6, 15);
    ctx.fillStyle = L.belt;
    ctx.fillRect(-6.5, fy - 10, 13, 1.8);
    ctx.fillStyle = L.trim;
    ctx.fillRect(-6.5, fy - 10, 2, 1.8);
    // barra da bainha
    ctx.fillStyle = L.trim;
    ctx.fillRect(-10.5, fy - 3, 21, 1.8);
    // gola
    ctx.fillStyle = L.trim2;
    ctx.fillRect(-3, fy - 20, 6, 1.7);

    // emblema de peito por classe
    if (s.id === 'elemental') {
      ctx.fillStyle = '#ff8c2e';
      ctx.fillRect(-1.1, fy - 8.2, 2.2, 3);
      ctx.fillRect(-0.55, fy - 10, 1.1, 1.8);
    } else if (s.id === 'psiquico') {
      ctx.fillStyle = L.trim2;
      ctx.fillRect(-1.4, fy - 8.4, 2.8, 1.2);
      ctx.fillStyle = L.trim;
      ctx.fillRect(-0.6, fy - 9, 1.2, 3.2);
      ctx.fillStyle = L.trim2;
      ctx.fillRect(-0.4, fy - 4, 0.8, 3);
      ctx.fillRect(-2, fy - 5, 4, 0.8);
    } else {
      ctx.fillStyle = L.trim2;
      ctx.fillRect(-2.4, fy - 9.2, 4.8, 2.6);
      ctx.fillStyle = L.robeDark;
      ctx.fillRect(-1.6, fy - 8.6, 1.2, 1.4);
      ctx.fillRect(0.4, fy - 8.6, 1.2, 1.4);
    }
  }

  drawHead(ctx, s, fy) {
    const L = this.look(s);

    // rosto
    ctx.fillStyle = L.skin;
    ctx.beginPath();
    ctx.arc(0, fy - 30, 5.2, 0, 6.283);
    ctx.fill();

    if (s.casta === 'clero') {
      if (s.id === 'diacono') {
        // cabelo curto + capuz recolhido nas costas
        ctx.fillStyle = L.hair;
        ctx.beginPath();
        ctx.arc(0, fy - 30.5, 4.6, Math.PI * 0.95, Math.PI * 2.05);
        ctx.fill();
        ctx.fillStyle = L.robeDark;
        ctx.beginPath();
        ctx.arc(0, fy - 34.5, 6.6, Math.PI * 1.02, Math.PI * 1.98);
        ctx.fill();
        ctx.fillRect(-6.4, fy - 34, 12.8, 1.8);
      } else if (s.id === 'padre') {
        // cabelo curto + tonsura discreta + auréola
        ctx.fillStyle = L.hair;
        ctx.beginPath();
        ctx.arc(0, fy - 31, 4.6, Math.PI * 0.9, Math.PI * 2.1);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,215,106,0.9)';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(0, fy - 38.5, 4.6, 0, 6.283);
        ctx.stroke();
      } else if (s.id === 'papa') {
        // Papa: auréola dourada + tiara tripla (triregnum) com esfera
        ctx.strokeStyle = 'rgba(230,180,34,0.9)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, fy - 31, 9.5, 0, 6.283); ctx.stroke();
        ctx.fillStyle = '#f0ece2';
        ctx.beginPath(); ctx.arc(0, fy - 30.5, 4.6, Math.PI, 0); ctx.fill();
        ctx.fillStyle = '#fff7e0';
        ctx.beginPath();
        ctx.moveTo(-6.2, fy - 39);
        ctx.lineTo(-4, fy - 55);
        ctx.lineTo(0, fy - 46.5);
        ctx.lineTo(4, fy - 55);
        ctx.lineTo(6.2, fy - 39);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#e6b422';
        ctx.fillRect(-6.2, fy - 40, 12.4, 2.4);     // base dourada
        ctx.fillRect(-4.6, fy - 45, 9.2, 1.6);      // 1ª coroa
        ctx.fillRect(-3.2, fy - 50, 6.4, 1.4);      // 2ª coroa
        ctx.fillRect(-0.8, fy - 56.4, 1.6, 3.4);    // ponta
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(0, fy - 57.6, 1.4, 0, 6.283); ctx.fill(); // esfera do mundo
      } else {
        // bispo: cabelos brancos + zucchetto + mitra alta
        ctx.fillStyle = L.hair;
        ctx.beginPath();
        ctx.arc(0, fy - 30.5, 4.8, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = L.robe;
        ctx.beginPath();
        ctx.arc(0, fy - 35.5, 4.4, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = L.trim2;
        ctx.beginPath();
        ctx.moveTo(-5, fy - 40);
        ctx.lineTo(-3, fy - 54);
        ctx.lineTo(0, fy - 46);
        ctx.lineTo(3, fy - 54);
        ctx.lineTo(5, fy - 40);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = L.trim;
        ctx.fillRect(-3.6, fy - 43, 7.2, 1.6);
        ctx.fillRect(-0.8, fy - 51.5, 1.6, 5.5);
        ctx.fillRect(-2.4, fy - 49.8, 4.8, 1.4);
      }
    } else if (s.casta === 'templarios') {
      if (s.id === 'guerreiro') {
        // elmo fechado de cavaleiro com a fenda de visão EM CRUZ (assinatura do
        // templário) e a cruz vermelha pintada na calota — rosto totalmente oculto.
        ctx.fillStyle = L.helm;
        ctx.beginPath();
        ctx.arc(0, fy - 31, 7, Math.PI, 0);
        ctx.fill();
        ctx.fillRect(-7, fy - 35, 14, 7.4);
        // brilho no alto da calota + filete de borda
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.fillRect(-4, fy - 37.4, 8, 1.6);
        ctx.fillStyle = L.helmDark;
        ctx.fillRect(-7, fy - 35.8, 14, 1);
        // fenda de visão em cruz
        ctx.fillStyle = '#0e1114';
        ctx.fillRect(-1.6, fy - 31.8, 3.2, 4.6);
        ctx.fillRect(-5, fy - 30.2, 10, 1.8);
        // cruz vermelha frontal pintada na calota
        ctx.fillStyle = L.trim;
        ctx.fillRect(-1, fy - 37.2, 2, 3.6);
        ctx.fillRect(-2.8, fy - 36, 5.6, 1.6);
        // pluma pequena da ordem no alto
        ctx.fillStyle = L.trim;
        ctx.beginPath();
        ctx.moveTo(-1, fy - 37.4);
        ctx.quadraticCurveTo(-6, fy - 47, -2.6, fy - 49.5);
        ctx.quadraticCurveTo(0.4, fy - 46.8, 0.2, fy - 37.4);
        ctx.fill();
        // pescoço/gorjal sob o elmo
        ctx.fillStyle = L.helmDark;
        ctx.fillRect(-5.4, fy - 27.8, 10.8, 1.6);
        ctx.fillStyle = '#0e1114';
        ctx.fillRect(-5.4, fy - 26.6, 10.8, 1.2);
      } else if (s.id === 'arqueiro') {
        // capuz de campanha escuro (caçador do Templo) com coifa de malha e a
        // cruz da ordem dividida nada na testa
        ctx.fillStyle = L.hoodDark;
        ctx.beginPath();
        ctx.arc(0, fy - 34, 7.2, Math.PI * 0.92, Math.PI * 2.08);
        ctx.fill();
        ctx.fillRect(-7, fy - 33.4, 14, 1.6);
        ctx.fillStyle = L.hood;
        ctx.beginPath();
        ctx.arc(0, fy - 31.2, 4.4, Math.PI, 0);
        ctx.fill();
        // coifa de malha no pescoço
        ctx.fillStyle = L.steel;
        ctx.fillRect(-5, fy - 27.2, 10, 1.6);
        ctx.fillStyle = L.steelDark;
        ctx.fillRect(-5, fy - 28.4, 10, 1.2);
        // cruz da ordem na testa do capuz
        ctx.fillStyle = L.trim;
        ctx.fillRect(-0.9, fy - 35.2, 1.8, 3.2);
        ctx.fillRect(-2.4, fy - 34.1, 4.8, 1.4);
        // pena vermelha da ordem
        ctx.fillStyle = L.trim;
        ctx.fillRect(-1, fy - 41.5, 1.6, 6.5);
        ctx.fillRect(-2.5, fy - 41.5, 1.6, 2.6);
        ctx.fillRect(-2.5, fy - 36.6, 1.6, 2.6);
      } else {
        // inventor: coifa acolchoada de engenho com óculos de forja e a cruz
        // lavrada na faixa da cabeça — o especialista da ordem
        ctx.fillStyle = L.hair;
        ctx.beginPath();
        ctx.arc(0, fy - 31, 4.6, Math.PI * 0.95, Math.PI * 2.05);
        ctx.fill();
        ctx.fillStyle = '#4a3a2a';
        ctx.beginPath();
        ctx.arc(0, fy - 35.8, 4.8, Math.PI, 0);
        ctx.fill();
        // faixa/brim da coifa
        ctx.fillRect(-5.8, fy - 35.2, 11.6, 2.2);
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(-3.6, fy - 39.2, 7.2, 1.2);
        ctx.fillStyle = L.steel;
        ctx.fillRect(-5.4, fy - 38, 10.8, 1.6);
        // óculos de forja (vidro azul)
        ctx.fillStyle = '#bfe4ff';
        ctx.beginPath(); ctx.arc(-2.7, fy - 33.6, 1.9, 0, 6.283); ctx.fill();
        ctx.beginPath(); ctx.arc(2.7, fy - 33.6, 1.9, 0, 6.283); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(-2.2, fy - 34.1, 0.7, 0, 6.283); ctx.fill();
        ctx.beginPath(); ctx.arc(3.2, fy - 34.1, 0.7, 0, 6.283); ctx.fill();
        // cruz da ordem lavrada na faixa da coifa
        ctx.fillStyle = L.trim;
        ctx.fillRect(-0.7, fy - 37.8, 1.4, 2.6);
        ctx.fillRect(-1.7, fy - 37, 3.4, 1);
      }
    } else {
      // magos: cabelo simples + ornamento por classe
      ctx.fillStyle = L.hair;
      ctx.beginPath();
      ctx.arc(0, fy - 31, 4.6, Math.PI * 0.9, Math.PI * 2.1);
      ctx.fill();
      if (s.id === 'elemental') {
        // chama azul flutuando sobre a cabeça
        ctx.fillStyle = L.robeShade;
        ctx.beginPath();
        ctx.moveTo(0, fy - 37);
        ctx.quadraticCurveTo(-6, fy - 46, 0, fy - 52);
        ctx.quadraticCurveTo(6, fy - 46, 0, fy - 37);
        ctx.fill();
        ctx.fillStyle = L.trim2;
        ctx.beginPath();
        ctx.moveTo(0, fy - 39);
        ctx.quadraticCurveTo(-3, fy - 45, 0, fy - 48);
        ctx.quadraticCurveTo(3, fy - 45, 0, fy - 39);
        ctx.fill();
      } else if (s.id === 'psiquico') {
        // faixa vermelha com terceiro olho dourado
        ctx.fillStyle = L.robeDark;
        ctx.fillRect(-5.2, fy - 33.6, 10.4, 1.8);
        ctx.fillStyle = L.trim;
        ctx.fillRect(-0.7, fy - 35, 1.4, 3.6);
      } else {
        // abençoador: chapéu de abas largas verdes
        ctx.fillStyle = L.robeDark;
        ctx.beginPath();
        ctx.ellipse(0, fy - 36.5, 9, 2.4, 0, 0, 6.283);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-5, fy - 36.5);
        ctx.lineTo(5, fy - 36.5);
        ctx.lineTo(3, fy - 45);
        ctx.lineTo(-3, fy - 45);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = L.trim;
        ctx.fillRect(-5, fy - 38.4, 10, 1.2);
      }
    }

    // olho (elmo fechado não mostra rosto)
    if (s.casta !== 'templarios' || s.id !== 'guerreiro') {
      ctx.fillStyle = '#2b2b33';
      ctx.beginPath();
      ctx.arc(2.4, fy - 30, 1.3, 0, 6.283);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(1.9, fy - 30.5, 0.45, 0, 6.283);
      ctx.fill();
    }
  }

  drawWeapon(ctx, fy) {
    const s = this.sub;
    const L = this.look(s);
    if (s.weapon.kind === 'melee') {
      const dur = this.attackDur || 0.4;
      const k = dur > 0 ? 1 - Math.max(0, this.attackAnim) / dur : 1;
      let a0 = -1.7, a1 = 0.7;
      if (this.combo % 2 === 0) { a0 = 0.7; a1 = -1.7; }
      const off = a0 + (a1 - a0) * clamp(k, 0, 1);
      ctx.save();
      ctx.translate(6, fy - 16);
      ctx.rotate(this.aimAng + off);
      if (s.id === 'inventor') {
        // Martelo de guerra do Inventor: haste longa e cabeça maciça de forja,
        // com alcance correspondente ao ataque (s.attack.range).
        ctx.fillStyle = '#6b4a2e';
        ctx.fillRect(2, -2.8, 36, 5.6);
        ctx.fillStyle = '#4a3018';
        ctx.fillRect(12, -1.8, 14, 3.6);
        ctx.fillStyle = '#8a929c';
        ctx.fillRect(34, -3.4, 3, 6.8);
        // pescoço de fixação da cabeça
        ctx.fillStyle = '#3a3a42';
        ctx.fillRect(36, -16, 4, 32);
        // cabeça do martelo — grande, pesada, mais larga que a haste
        ctx.fillStyle = this.weapon.color;
        ctx.beginPath();
        ctx.rect(31, -13, 32, 26);
        ctx.fill();
        // facetas de forja (brilho metálico)
        ctx.fillStyle = 'rgba(255,255,255,0.28)';
        ctx.fillRect(32.5, -11, 7, 22);
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(58, -11, 4, 22);
        // filetes dourados na lateral
        ctx.fillStyle = '#c9a227';
        ctx.fillRect(31, -13, 32, 2.8);
        ctx.fillRect(31, 10.2, 32, 2.8);
        // variações de rebite
        ctx.fillStyle = '#6a6a72';
        ctx.fillRect(34, -9, 2, 2);
        ctx.fillRect(60, -9, 2, 2);
        ctx.fillRect(34, 8, 2, 2);
        ctx.fillRect(60, 8, 2, 2);
        // espigão traseiro do martelo de guerra
        ctx.fillStyle = '#8a929c';
        ctx.fillRect(60, -21, 5, 9);
      } else if (s.id === 'guerreiro') {
        // Espada longa templária: lâmina, guarda dourada e contraguarda
        ctx.fillStyle = '#e8ecf2';
        ctx.fillRect(6, -1.6, s.attack.range - 12, 3.2);
        ctx.fillStyle = 'rgba(120,130,145,0.8)';
        ctx.fillRect(11, -0.8, s.attack.range - 20, 1);
        ctx.fillStyle = '#c9a227';
        ctx.fillRect(3, -4.5, 8, 3);
        ctx.fillStyle = '#e8ecf2';
        ctx.fillRect(1, -2.4, 3, 4.8);
        ctx.fillStyle = '#c0392b';
        ctx.fillRect(4, -1.2, 2.5, 2.4);
      }
      ctx.restore();
    } else if (s.weapon.kind === 'aura') {
      // báculo / cajado sagrado
      ctx.save();
      ctx.translate(6, fy - 18);
      ctx.rotate(this.aimAng * 0.35 + 0.6);
      ctx.fillStyle = '#6b4a2a';
      ctx.fillRect(-1.5, 0, 3, 26);
      if (s.id === 'bispo') {
        // báculo episcopal: voluta dourada com cruz
        ctx.strokeStyle = '#d9a441';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, -7, 4, Math.PI * 0.1, Math.PI * 1.9);
        ctx.stroke();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(0, -10, 2, 0, 6.283);
        ctx.stroke();
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = this.weapon.color;
        ctx.beginPath();
        ctx.arc(0, -9, 5 + Math.sin(this.game.time * 10) * 2, 0, 6.283);
        ctx.fill();
        ctx.globalAlpha = 1;
      } else {
        // cajado do pastor: curvatura de rebanho
        ctx.strokeStyle = '#c9a227';
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.arc(0, -8, 3.4, -0.2, Math.PI * 1.6);
        ctx.stroke();
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = this.weapon.color;
        ctx.beginPath();
        ctx.arc(0, -8, 4 + Math.sin(this.game.time * 10) * 1.5, 0, 6.283);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    } else {
      ctx.save();
      ctx.translate(6, fy - 18);
      ctx.rotate(this.aimAng);
      if (s.id === 'arqueiro') {
        // arco longo templário com corda
        ctx.strokeStyle = this.weapon.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, 14, -1.1, 1.1);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(10, -8);
        ctx.lineTo(18, 0);
        ctx.stroke();
        // brilho do tiro carregado crescendo na corda
        if (this.charging) {
          const prog = this.chargeMax > 0 ? 1 - Math.max(0, this.chargeT) / this.chargeMax : 1;
          const pulse = 0.5 + Math.sin(this.game.time * 22) * 0.25;
          ctx.globalAlpha = 0.35 + prog * 0.55;
          ctx.fillStyle = '#fff3b0';
          ctx.beginPath();
          ctx.arc(15, 0, 3 + prog * 9 + pulse * 2, 0, 6.283);
          ctx.fill();
          ctx.globalAlpha = 0.5 + prog * 0.4;
          ctx.fillStyle = '#fffbe0';
          ctx.beginPath();
          ctx.arc(15, 0, 1.5 + prog * 4, 0, 6.283);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      } else if (s.id === 'abencoador') {
        // grimório da luz com capa colorida da classe
        ctx.fillStyle = L.robeDark;
        ctx.fillRect(-9, -6, 17, 12);
        ctx.fillStyle = L.trim;
        ctx.fillRect(-9, -6, 17, 2);
        ctx.fillRect(-1.6, -6, 2.4, 12);
        ctx.fillStyle = L.trim2;
        ctx.fillRect(-9, 3, 17, 1.6);
        ctx.globalAlpha = 0.5 + Math.sin(this.game.time * 8) * 0.2;
        ctx.fillStyle = this.weapon.color;
        ctx.beginPath();
        ctx.arc(0, 0, 9, 0, 6.283);
        ctx.fill();
        ctx.globalAlpha = 1;
      } else if (s.id === 'diacono') {
        // diácono ergue o evangeliário
        ctx.fillStyle = L.robeDark;
        ctx.fillRect(-5, -4, 10, 8);
        ctx.fillStyle = L.trim;
        ctx.fillRect(-5, -4, 10, 1.6);
        ctx.fillRect(-0.8, -4, 1.6, 8);
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = this.weapon.color;
        ctx.beginPath();
        ctx.arc(8, -2, 8 + Math.sin(this.game.time * 9) * 1.5, 0, 6.283);
        ctx.fill();
        ctx.globalAlpha = 1;
      } else {
        // orbe elemental/psíquico com núcleo tingido pela classe
        const pulse = 5 + Math.sin(this.game.time * 8) * 1.5;
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = this.weapon.color;
        ctx.beginPath();
        ctx.arc(8, 0, 10 + pulse * 0.3, 0, 6.283);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = L.robeShade;
        ctx.beginPath();
        ctx.arc(8, 0, pulse, 0, 6.283);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(8, 0, pulse * 0.45, 0, 6.283);
        ctx.fill();
        ctx.strokeStyle = L.trim;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(8, 0, pulse + 1.6, 0, 6.283);
        ctx.stroke();
      }
      ctx.restore();
    }
  }
}
