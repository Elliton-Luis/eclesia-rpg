import { T } from '../data/constants.js';
import { MONSTERS } from '../data/monsters.js';
import { Monster } from '../entities/monster.js';
import { Projectile } from '../entities/projectile.js';

export const enemyCombat = {
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
    const color = opts.color || (opts.bone ? '#d9d0c0' : big ? '#7a5a4b' : '#c76bd8');
    this.projectiles.push(new Projectile({
      x: m.x + Math.cos(a) * 14, y: m.y + Math.sin(a) * 14,
      vx, vy,
      dmg, type: T.MAGIC, color,
      size: opts.bone ? 7 : big ? 12 : 8,
      life: opts.life || 3,
      bounce: opts.bounce === true,
      pierce: false, owner: 'enemy',
      aoe: big ? 36 : opts.bone ? 0 : 0, trail: big || opts.bone || opts.bounce === true
    }));
  },

  // Arcano — "divisão": escolhe pontos próximo ao jogador (raio mínimo garante
  // que nenhuma aparição nasça exatamente sobre ele), marca cada um com um
  // anel de aviso e, após o telegraph, materializa os espectros agressivos.
  arcaneSplit(m, count) {
    const p = this.player;
    const def = MONSTERS['espectro_arcano'];
    if (!def) return;
    const spots = [];
    for (let i = 0; i < count && spots.length < count; i++) {
      for (let tries = 0; tries < 12; tries++) {
        const a = Math.random() * 6.283;
        const r = 90 + Math.random() * 60;
        const tx = p.x + Math.cos(a) * r;
        const ty = p.y + Math.sin(a) * r;
        const probe = new Monster(def, tx, ty, this);
        if (!this.world.solidBox(probe.box())) { spots.push({ x: tx, y: ty }); break; }
      }
    }
    for (const s of spots) this.ring(s.x, s.y, 26, 0.7, '#a08ad8', 3);
    this.burst(m.x, m.y, '#c0b4ff', 10, 170);
    this.delayed.push({ t: 0.7, fn: () => {
      for (const s of spots) {
        const mm = new Monster(def, s.x, s.y, this);
        mm.aggro = 1;
        this.monsters.push(mm);
      }
      this.ring(m.x, m.y, 120, 0.5, '#a08ad8', 4);
      this.sfx.boss();
    } });
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

};
