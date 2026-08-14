import { clamp } from '../data/utils.js';

export class Particle {
  constructor(o) {
    this.x = o.x;
    this.y = o.y;
    this.vx = o.vx || 0;
    this.vy = o.vy || 0;
    this.life = o.life || 0.5;
    this.max = this.life;
    this.color = o.color;
    this.size = o.size || 4;
    this.grav = o.grav !== undefined ? o.grav : 0;
    this.shape = o.shape || 'circle';
  }

  update(dt) {
    this.vy += this.grav * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vx *= 0.98;
    this.life -= dt;
  }

  draw(ctx) {
    const a = clamp(this.life / this.max, 0, 1);
    ctx.globalAlpha = a;
    ctx.fillStyle = this.color;
    if (this.shape === 'rect') {
      ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
    } else {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * a, 0, 6.283);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

export class FloatText {
  constructor(x, y, str, color, size) {
    this.x = x;
    this.y = y;
    this.str = str;
    this.color = color;
    this.size = size || 14;
    this.life = 0.9;
    this.max = 0.9;
  }

  update(dt) {
    this.y -= 40 * dt;
    this.life -= dt;
  }

  draw(ctx) {
    const a = clamp(this.life / this.max, 0, 1);
    ctx.globalAlpha = a;
    ctx.font = `900 ${this.size}px 'Segoe UI', system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.strokeText(this.str, this.x, this.y);
    ctx.fillStyle = this.color;
    ctx.fillText(this.str, this.x, this.y);
    ctx.globalAlpha = 1;
  }
}

export class Ring {
  constructor(x, y, r, life, color, width) {
    this.x = x;
    this.y = y;
    this.r = r;
    this.life = life;
    this.max = life;
    this.color = color;
    this.width = width || 4;
  }

  update(dt) {
    this.life -= dt;
  }

  draw(ctx) {
    const k = 1 - this.life / this.max;
    ctx.globalAlpha = clamp(this.life / this.max, 0, 1) * 0.9;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = this.width * (1 - k * 0.5);
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r * k, 0, 6.283);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

