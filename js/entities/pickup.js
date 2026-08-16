import { rand, randint } from '../data/utils.js';
import { Particle } from './effects.js';

export class Pickup {
  constructor(x, y, kind, value) {
    this.x = x;
    this.y = y;
    this.kind = kind;
    this.value = value || 0;
    this.t = rand(0, 6);
  }

  update(dt, g) {
    this.t += dt;
    const p = g.player;
    const d = Math.hypot(this.x - p.x, this.y - p.y);

    // Ímã: atração magnética ao redor do jogador. Com o Ímã equipado na hotbar
    // o raio de coleta passivo cresce; durante a habilidade ativa, qualquer
    // moeda/coração visível é puxado, independentemente da distância.
    let magnet = 96;                    // raio padrão de atração
    if (p.magnetEquipped()) magnet += 120; // raio com o Ímã equipado (~216)
    if (this.pull) magnet = 1e9;        // ativa: alcança tudo que está na tela
    const pickupR = this.radius() + p.w / 2 + 6;
    if (d < magnet && d > pickupR) {
      const pull = this.pull ? 1 : 1 - d / magnet;  // 0 longe, 1 perto
      const ang = Math.atan2(p.y - this.y, p.x - this.x);
      const sp = (this.pull ? 920 : 260) * pull + 120;
      this.x += Math.cos(ang) * sp * dt;
      this.y += Math.sin(ang) * sp * dt;
      // pequena faísca de magnet (mais intensa durante a atração ativa)
      if (Math.random() < (this.pull ? 0.45 : 0.18)) {
        g.particles.push(new Particle({ x: this.x, y: this.y, vx: 0, vy: 0, life: 0.25,
          color: this.kind === 'coin' ? '#ffd23f' : this.kind === 'heart' ? '#ff5c7a' : '#ffe66d',
          size: 2, grav: 0 }));
      }
    }

    if (d < pickupR) {
      this.collect(g);
      return true;
    }
    return false;
  }

  radius() {
    return this.kind === 'coin' ? 9 : this.kind === 'heart' ? 11 : this.kind === 'chest' ? 14 : 12;
  }

  collect(g) {
    const p = g.player;
    if (this.kind === 'coin') {
      p.gold += this.value;
      g.text(this.x, this.y - 12, '+' + this.value, '#ffd23f', 14);
      g.sfx.coin();
    } else if (this.kind === 'heart') {
      const amt = Math.round(p.maxHp * 0.25);
      p.hp = Math.min(p.maxHp, p.hp + amt);
      g.text(this.x, this.y - 12, '+' + amt, '#7cff8a', 14);
      g.healEffect(p);
      g.sfx.pick();
    } else if (this.kind === 'chest') {
      g.openChest(this.x, this.y, this.value);
    } else {
      const kind = ['str', 'int', 'spd', 'hp'][randint(0, 3)];
      const labels = { str: 'Força', int: 'Inteligência', spd: 'Velocidade', hp: 'Vida' };
      if (kind === 'str') { p.str += 4; } else if (kind === 'int') { p.int += 4; } else if (kind === 'spd') { p.spd += 10; } else { p.maxHp += 25; p.hp += 25; }
      g.text(this.x, this.y - 12, labels[kind] + ' +!', '#ffb020', 16);
      g.burst(this.x, this.y, '#ffd23f', 14, 200);
      g.sfx.upgrade();
      g.stats.powerups++;
    }
    g.hud();
  }

  draw(ctx, t) {
    const bob = Math.sin(this.t * 3) * 3;
    ctx.save();
    ctx.translate(this.x, this.y + bob);
    if (this.kind === 'coin') {
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath(); ctx.arc(0, 0, 12, 0, 6.283); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath(); ctx.arc(0, 0, 9, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#b8860b';
      ctx.font = '900 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('$', 0, 4);
    } else if (this.kind === 'heart') {
      ctx.fillStyle = '#ff5c7a';
      ctx.beginPath();
      ctx.moveTo(0, 7);
      ctx.bezierCurveTo(-12, -4, -6, -12, 0, -5);
      ctx.bezierCurveTo(6, -12, 12, -4, 0, 7);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.beginPath();
      ctx.arc(-3, -4, 2, 0, 6.283);
      ctx.fill();
    } else {
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = '#ffe66d';
      ctx.beginPath(); ctx.arc(0, 0, 12, 0, 6.283); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#ffe66d';
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + i * 2 * Math.PI / 5;
        const a2 = a + Math.PI / 5;
        ctx.lineTo(Math.cos(a) * 9, Math.sin(a) * 9);
        ctx.lineTo(Math.cos(a2) * 4, Math.sin(a2) * 4);
      }
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
}
