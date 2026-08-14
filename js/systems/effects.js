import { rand } from '../data/utils.js';
import { Particle, FloatText, Ring } from '../entities/effects.js';

export const effects = {
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

  pillarFx(x, y, r) {
    for (let i = 0; i < 60; i++) {
      const a = Math.random() * 6.283;
      const d = Math.random() * r;
      const col = i % 3 === 0 ? '#ffffff' : i % 3 === 1 ? '#fff3b0' : '#ffd23f';
      this.particles.push(new Particle({
        x: x + Math.cos(a) * d, y: y - Math.random() * 30,
        vx: Math.cos(a) * rand(30, 120), vy: rand(-260, -60), life: rand(0.6, 1.2),
        color: col, size: rand(4, 9), grav: 0
      }));
    }
    for (let k = 1; k <= 5; k++) {
      this.delayed.push({ t: k * 0.12, fn: () => {
        this.burst(x, y, '#fff3b0', 22, 220);
        this.ring(x, y, r * (0.4 + k * 0.12), 0.5, k % 2 ? '#ffd23f' : '#ffffff', 5);
      } });
    }
  },

  // Papa: aparição rara (10% por partida). Ensina a Bênção Suprema.
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

};
