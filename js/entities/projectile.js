import { circleRect } from '../data/utils.js';
import { Particle } from './effects.js';

export class Projectile {
  constructor(o) {
    this.x = o.x;
    this.y = o.y;
    this.vx = o.vx;
    this.vy = o.vy;
    this.dmg = o.dmg;
    this.type = o.type;
    this.color = o.color;
    this.size = o.size || 8;
    this.life = o.life || 1.5;
    this.pierce = !!o.pierce;
    this.aoe = o.aoe || 0;
    this.homing = !!o.homing;
    this.owner = o.owner;
    this.trail = !!o.trail;
    this.explode = !!o.explode;
    this.solid = o.solid !== false;
    this.bounce = o.bounce === true;
    this.clearTree = !!o.clearTree;
    this.gravity = o.gravity || 0;
    this.groundExplode = !!o.groundExplode;
    this.dead = false;
    this.t = 0;
    this.hit = new Set();
  }

  update(dt, g) {
    this.t += dt;
    this.life -= dt;

    const priorX = this.x, priorY = this.y;

    if (this.gravity) {
      this.vy += this.gravity * dt;
    }
    
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (this.trail && Math.random() < 0.6) {
      g.particles.push(new Particle({ x: this.x, y: this.y, vx: -this.vx * 0.1, vy: -this.vy * 0.1, life: 0.25, color: this.color, size: this.size * 0.5, grav: 0 }));
    }

    if (this.homing) {
      const m = g.nearestMonster(this.x, this.y, 480);
      if (m) {
        const ang = Math.atan2(m.y - this.y, m.x - this.x);
        const sp = Math.hypot(this.vx, this.vy);
        this.vx = Math.cos(ang) * sp;
        this.vy = Math.sin(ang) * sp;
      }
    }

    if (this.solid && g.world.solidPixel(this.x, this.y)) {
      if (this.bounce) {
        // Ricochete: detecta em qual(is) eixo(s) a parede foi cruzada e inverte
        // apenas esse(s) componente(s). Volta um passo para não ficar preso.
        const vert = g.world.solidPixel(priorX, this.y);   // colisão vinda do eixo Y
        const horiz = g.world.solidPixel(this.x, priorY);  // colisão vinda do eixo X
        if (vert) this.vy = -this.vy;
        if (horiz) this.vx = -this.vx;
        if (!vert && !horiz) this.vx = -this.vx;
        this.x = priorX;
        this.y = priorY;
        g.burst(this.x, this.y, '#ffb0b0', 6, 150, 2.5, 400);
        g.ring(this.x, this.y, 14, 0.25, this.color, 3);
        return;
      }
      this.dead = true;
      if (this.aoe || this.explode) g.explode(this.x, this.y, this);
      return;
    }

    if (this.groundExplode && this.vy > 0 && g.world.solidPixel(this.x, this.y + this.size)) {
      this.dead = true;
      g.explode(this.x, this.y, this);
      return;
    }

    if (this.owner === 'player') {
      for (const m of g.monsters) {
        if (m.dying || m.dead) continue;
        if (this.hit.has(m)) continue;
        if (circleRect(this, this.size, m.box())) {
          g.damageMonster(m, this.dmg, this.type, this);
          this.hit.add(m);
          if (this.aoe) { g.explode(this.x, this.y, this); this.dead = true; return; }
          if (!this.pierce) { this.dead = true; return; }
        }
      }
    } else {
      const p = g.player;
      if (!this.hit.has(p) && p.hp > 0 && circleRect(this, this.size, p.box())) {
        g.damagePlayer(this.dmg);
        this.hit.add(p);
        if (this.aoe) { g.explode(this.x, this.y, this); this.dead = true; return; }
        // Projéteis ricocheteantes (Demônio) atravessam o jogador e seguem
        // ricocheteando pela arena até expirarem, podendo atingi-lo de novo.
        if (!this.bounce && !this.pierce) this.dead = true;
      }
    }

    if (this.life <= 0) {
      this.dead = true;
      if (this.aoe || this.explode) g.explode(this.x, this.y, this);
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(0, 0, this.size + 4, 0, 6.283);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(0, 0, this.size, 0, 6.283);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.arc(0, 0, this.size * 0.45, 0, 6.283);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

