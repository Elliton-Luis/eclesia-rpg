import { byId } from '../dom.js';

export const playerDamage = {
  damagePlayer(amount) {
    const p = this.player;
    if (this.cheats.hp) return;
    if (this.cheats.ghost) return; // modo fantasma: imortal por completo
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
    p.status.venom = 0; p.status.venomCd = 0;
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

};
