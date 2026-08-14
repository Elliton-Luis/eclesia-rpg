import { T, RUN } from '../data/constants.js';
import { rand, clamp } from '../data/utils.js';
import { Particle } from './effects.js';

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
    this.status = { shield: 0, shieldT: 0, dmg: 0, spd: 0, regen: 0, dur: 0, venom: 0, venomCd: 0, fatigue: 0 };
    this.cd = {};
    this.extraSkills = [];
    this.mw = null;
    this.items = {};
    this.blessings = [];
    this.contactHit = {};
    this.supremeBlessed = false;
    this.supremeUses = 0;
    this.atkSpd = 0; // +0.1 por nível de treino de reflexos
    this.sub.skills.forEach(s => { this.cd[s.id] = 0; });
  }

  allSkills() {
    return this.sub.skills.concat(this.extraSkills, this.blessings);
  }

  box() { return { x: this.x - this.w / 2, y: this.y - this.h / 2, w: this.w, h: this.h }; }

  update(dt, g) {
    const K = g.keys;
    const st = this.status;

    this.attackCd = Math.max(0, this.attackCd - dt);
    this.attackAnim = Math.max(0, this.attackAnim - dt);
    this.comboT -= dt;
    if (this.comboT <= 0) this.combo = 0;
    for (const id in this.cd) this.cd[id] = Math.max(0, this.cd[id] - dt);
    this.invuln = Math.max(0, this.invuln - dt);
    this.hurtT = Math.max(0, this.hurtT - dt);

    st.dur -= dt;
    if (st.dur <= 0) { st.dmg = 0; st.spd = 0; st.regen = 0; }
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

    ctx.fillStyle = '#2b2b33';
    const legA = moving ? Math.sin(this.walkT * 14) * 4 : 0;
    const legB = moving ? -Math.sin(this.walkT * 14) * 4 : 0;
    ctx.fillRect(-9 + legA * 0.3, fy - 8, 5, 8);
    ctx.fillRect(4 + legB * 0.3, fy - 8, 5, 8);

    this.drawBody(ctx, s, fy);
    this.drawHead(ctx, s, fy);

    this.drawWeapon(ctx, fy);

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

  drawBody(ctx, s, fy) {
    ctx.fillStyle = s.color;
    const r = s.id === 'bispo' ? 13 : s.id === 'guerreiro' ? 10.5 : s.casta === 'mago' ? 9.5 : 11;
    ctx.beginPath();
    ctx.ellipse(0, fy - 16, r, 12, 0, 0, 6.283);
    ctx.fill();

    ctx.fillStyle = s.accent;
    if (s.casta === 'clero') {
      ctx.fillRect(-r, fy - 21, r * 2, 3);
    } else if (s.casta === 'templarios') {
      // cruz do Templo sobre o manto branco
      ctx.fillRect(-1.5, fy - 23, 3, 11);
      ctx.fillRect(-5.5, fy - 19.5, 11, 3);
    } else {
      ctx.fillRect(-r, fy - 18, r * 2, 2);
    }

    // detalhes por subclasse
    if (s.id === 'bispo') { // capa episcopal
      ctx.fillStyle = s.accent;
      ctx.fillRect(-r - 1, fy - 26, 2.5, 8);
      ctx.fillRect(r - 1.5, fy - 26, 2.5, 8);
    } else if (s.casta === 'clero' && s.id !== 'padre') { // crucifixo
      ctx.fillStyle = s.accent;
      ctx.fillRect(-1, fy - 14, 2, 5);
      ctx.fillRect(-2.5, fy - 12, 5, 2);
    } else if (s.id === 'guerreiro') { // ombreiras de aço
      ctx.fillStyle = '#c9c9d2';
      ctx.beginPath();
      ctx.arc(-r, fy - 26, 3.5, 0, 6.283);
      ctx.arc(r, fy - 26, 3.5, 0, 6.283);
      ctx.fill();
    } else if (s.id === 'arqueiro') { // aljava
      ctx.fillStyle = s.accent;
      ctx.fillRect(-r - 3, fy - 24, 4, 9);
    } else if (s.id === 'inventor') { // avental de couro do engenho
      ctx.fillStyle = '#8a6a3a';
      ctx.fillRect(-6, fy - 17, 12, 9);
      ctx.fillStyle = s.accent;
      ctx.fillRect(-6, fy - 17, 3, 9);
    }
  }

  drawHead(ctx, s, fy) {
    ctx.fillStyle = s.color;
    ctx.beginPath();
    ctx.arc(0, fy - 31, 8, 0, 6.283);
    ctx.fill();

    // rosto
    ctx.fillStyle = '#e9c29b';
    ctx.beginPath();
    ctx.arc(0, fy - 30, 5, 0, 6.283);
    ctx.fill();
    ctx.fillStyle = s.accent;
    if (s.id === 'padre') { // cabelo tonsurado
      ctx.beginPath();
      ctx.arc(0, fy - 34, 4, Math.PI, 0);
      ctx.fill();
    } else if (s.id === 'bispo') { // cabelo raspado no topo (tonsura)
      ctx.beginPath();
      ctx.arc(0, fy - 34, 3, Math.PI, 0);
      ctx.fill();
    } else if (s.id === 'guerreiro') { // elmo de aço
      ctx.fillStyle = '#c9c9d2';
      ctx.beginPath();
      ctx.arc(0, fy - 35, 7, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(-7, fy - 36, 14, 3);
    } else if (s.id === 'inventor') { // barbo e óculos
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(0, fy - 34, 6, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#c9d4e0';
      ctx.fillRect(-5, fy - 31, 4, 2);
      ctx.fillRect(1, fy - 31, 4, 2);
    }

    ctx.fillStyle = '#2b2b33';
    ctx.beginPath();
    ctx.arc(2.5, fy - 30, 1.5, 0, 6.283);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(1.8, fy - 30.6, 0.5, 0, 6.283);
    ctx.fill();

    // chapéu/ornamento específico da subclasse
    if (s.id === 'padre') { // auréola
      ctx.strokeStyle = '#ffd76a';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(0, fy - 43, 5, 0, 6.283);
      ctx.stroke();
    } else if (s.id === 'bispo') { // mitra
      ctx.fillStyle = '#fff';
      ctx.fillRect(-1, fy - 48, 2, 5);
      ctx.fillStyle = s.accent;
      ctx.beginPath();
      ctx.moveTo(-6, fy - 42);
      ctx.lineTo(-1, fy - 54);
      ctx.lineTo(2, fy - 45);
      ctx.lineTo(4, fy - 54);
      ctx.lineTo(7, fy - 42);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillRect(-4, fy - 44, 9, 1.5);
    } else if (s.id === 'diacono') { // capuz
      ctx.beginPath();
      ctx.arc(0, fy - 38, 6.5, Math.PI * 1.05, Math.PI * 1.95);
      ctx.fill();
    } else if (s.id === 'guerreiro') { // cruz do Templo no elmo
      ctx.fillStyle = '#c0392b';
      ctx.fillRect(-1, fy - 46, 2, 7);
      ctx.fillRect(-3.5, fy - 43.5, 7, 2);
    } else if (s.id === 'arqueiro') { // capuz de caçador
      ctx.beginPath();
      ctx.arc(0, fy - 38, 7, Math.PI * 0.9, Math.PI * 2.1);
      ctx.fill();
    } else if (s.id === 'inventor') { // chapéu
      ctx.beginPath();
      ctx.moveTo(-8, fy - 38);
      ctx.lineTo(8, fy - 38);
      ctx.lineTo(5, fy - 47);
      ctx.lineTo(-4, fy - 47);
      ctx.closePath();
      ctx.fill();
    } else if (s.id === 'elemental') { // chama dançante
      ctx.fillStyle = s.accent;
      ctx.beginPath();
      ctx.moveTo(0, fy - 38);
      ctx.quadraticCurveTo(-6, fy - 48, 0, fy - 55);
      ctx.quadraticCurveTo(6, fy - 48, 0, fy - 38);
      ctx.fill();
    } else if (s.id === 'psiquico') { // faixa psíquica
      ctx.fillRect(-6, fy - 36, 12, 2);
    } else if (s.id === 'abencoador') { // chapéu de abas largas
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.ellipse(0, fy - 39, 9, 2.5, 0, 0, 6.283);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-4, fy - 39);
      ctx.lineTo(4, fy - 39);
      ctx.lineTo(1, fy - 47);
      ctx.lineTo(-1, fy - 47);
      ctx.closePath();
      ctx.fill();
    }
  }

  drawWeapon(ctx, fy) {
    const s = this.sub;
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
        // Martelo do Templo: cabo curto e cabeça maciça de metal.
        ctx.fillStyle = '#7a5a2b';
        ctx.fillRect(6, -2, s.attack.range * 0.55, 4);
        ctx.fillStyle = this.weapon.color;
        ctx.fillRect(s.attack.range - 9, -8, 13, 14);
        ctx.fillStyle = '#d9a441';
        ctx.fillRect(s.attack.range - 9, -2, 13, 2);
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fillRect(s.attack.range - 7, -6, 3, 10);
      } else {
        ctx.fillStyle = this.weapon.color;
        ctx.fillRect(8, -2, s.attack.range - 12, 4);
        ctx.fillStyle = '#d9a441';
        ctx.fillRect(4, -4, 7, 8);
      }
      ctx.restore();
    } else if (s.weapon.kind === 'aura') {
      // cajado sagrado
      ctx.save();
      ctx.translate(6, fy - 18);
      ctx.rotate(this.aimAng * 0.35 + 0.6);
      ctx.fillStyle = '#6b4a2a';
      ctx.fillRect(-2, 0, 3, 26);
      ctx.fillStyle = '#c9a227';
      ctx.fillRect(-3.5, -4, 6, 7);
      // faíscas sagradas no topo
      const sp = 6 + Math.sin(this.game.time * 10) * 2;
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = this.weapon.color;
      ctx.beginPath();
      ctx.arc(0, -5, sp, 0, 6.283);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(0, -5, 2.5, 0, 6.283);
      ctx.fill();
      ctx.restore();
    } else {
      ctx.save();
      ctx.translate(6, fy - 18);
      ctx.rotate(this.aimAng);
      if (s.id === 'arqueiro') {
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
      } else if (s.id === 'abencoador') {
        ctx.fillStyle = this.weapon.color;
        ctx.fillRect(-8, -6, 16, 12);
        ctx.fillStyle = '#f0f4ff';
        ctx.fillRect(-5, -4, 10, 4);
      } else {
        const pulse = 5 + Math.sin(this.game.time * 8) * 1.5;
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = this.weapon.color;
        ctx.beginPath();
        ctx.arc(8, 0, 10 + pulse * 0.3, 0, 6.283);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = this.weapon.color;
        ctx.beginPath();
        ctx.arc(8, 0, pulse, 0, 6.283);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(8, 0, pulse * 0.45, 0, 6.283);
        ctx.fill();
      }
      ctx.restore();
    }
  }
}
