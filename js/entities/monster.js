import { TYPE_MULT } from '../data/constants.js';
import { rand } from '../data/utils.js';

export class Monster {
  constructor(def, x, y, game, isBoss) {
    this.def = def;
    this.game = game;
    this.x = x;
    this.y = y;
    this.home = { x, y };
    this.w = def.size;
    this.h = def.size;
    this.maxHp = def.hp;
    this.hp = def.hp;
    this.vx = 0;
    this.vy = 0;
    this.facing = -1;
    this.aggro = 0;
    this.t = rand(0.3, 1.5);
    this.touchCd = 0;
    this.hitT = 0;
    this.dying = false;
    this.dead = false;
    this.dieT = 0;
    this.shootT = rand(1.5, 3);
    this.wander = { x, y };
    this.speedJit = def.speed * rand(0.9, 1.1);
    this.isBoss = !!isBoss;
    this.bossInfo = null;
    this.bossPhase = 0;
    this.bossPattern = rand(0, 999);
    this.bossCd = 0;
    this.stunned = 0;
    this.venomT = 0;
    this.venomHits = new Set();
  }

  box() { return { x: this.x - this.w / 2, y: this.y - this.h / 2, w: this.w, h: this.h }; }

  multiplier(type) {
    if (this.def.weak.includes(type)) return TYPE_MULT.WEAK;
    if (this.def.resist.includes(type)) return TYPE_MULT.RESIST;
    return 1;
  }

  weakMult(type) {
    if (this.stunned > 0) return 1.5;
    return this.multiplier(type);
  }

  update(dt, g) {
    const p = g.player;
    const d = this.def;
    this.touchCd -= dt;
    this.hitT -= dt;
    this.stunned = Math.max(0, this.stunned - dt);

    if (this.dying) {
      this.dieT -= dt;
      if (this.dieT <= 0) this.dead = true;
      return;
    }

    const dx = p.x - this.x, dy = p.y - this.y;
    const d2 = Math.hypot(dx, dy);
    const aggroRange = d.aggro || 380;
    if (d2 < aggroRange) this.aggro = Math.min(this.aggro + dt * 3, 1);
    else this.aggro = Math.max(this.aggro - dt * 1.5, 0);

    if (this.aggro <= 0 && d2 > 700 && !this.isBoss) {
      this.x = this.home.x;
      this.y = this.home.y;
      this.hp = this.maxHp;
      this.vx = 0;
      this.vy = 0;
    }

    if (this.venomT > 0) {
      this.venomT -= dt;
      this.hp -= Math.round(this.maxHp * 0.015) + 1;
      if (this.hp <= 0) { this.game.killMonster(this); return; }
    }

    this.t -= dt;
    if (Math.abs(dx) > 6) this.facing = dx > 0 ? 1 : -1;

    const toward = (target, speed, k, wobble) => {
      if (this.stunned > 0) return;
      const lx = target.x - this.x, ly = target.y - this.y;
      const l = Math.hypot(lx, ly) || 1;
      let tx = (lx / l) * speed, ty = (ly / l) * speed;
      if (wobble) {
        const w = Math.sin(this.t * 7) * wobble;
        tx += (-ly / l) * w;
        ty += (lx / l) * w;
      }
      this.vx += (tx - this.vx) * Math.min(1, dt * k);
      this.vy += (ty - this.vy) * Math.min(1, dt * k);
    };

    const b = d.behavior;
    if (b === 'hop') {
      if (this.aggro > 0) toward(p, this.speedJit, 4, 26);
      else {
        if (this.t <= 0) {
          this.wander.x = this.home.x + rand(-1, 1) * 70;
          this.wander.y = this.home.y + rand(-1, 1) * 70;
          this.t = 1.5 + Math.random() * 1.5;
        }
        toward(this.wander, this.speedJit * 0.55, 3, 0);
      }
    } else if (b === 'swoop') {
      toward(p, this.speedJit * 1.25, 4, 55);
    } else if (b === 'chase') {
      if (this.aggro > 0) toward(p, this.speedJit * 1.15, 6, 0);
      else {
        if (this.t <= 0) {
          this.wander.x = this.home.x + rand(-1, 1) * 90;
          this.wander.y = this.home.y + rand(-1, 1) * 90;
          this.t = 1.5 + Math.random() * 2;
        }
        toward(this.wander, this.speedJit * 0.4, 5, 0);
      }
      if (d.explodeOnDeath && this.aggro > 0 && d2 < 50) {
        g.selfDestruct(this);
      }
    } else if (b === 'range') {
      const want = 240;
      if (this.aggro > 0) {
        const dir = (d2 < want) ? -1 : (d2 > want + 40 ? 1 : 0);
        toward(p, dir * this.speedJit * 0.8, 4, 0);
      }
      this.shootT -= dt;
      if (this.shootT <= 0 && this.aggro > 0) {
        this.shootT = 2.2 + Math.random() * 1.2;
        const nsh = d.shots || 1;
        for (let i = 0; i < nsh; i++) {
          const off = (i - (nsh - 1) / 2) * 0.2;
          g.shootEnemy(this, dx, dy, { off });
        }
      }
    } else if (b === 'slowChase') {
      toward(p, this.speedJit, 3, 0);
    } else if (b === 'wraith') {
      if (this.aggro > 0 && this.t <= 0 && d.invokes) {
        this.t = 7 + Math.random() * 4;
        g.summonMinion(this.x, this.y);
        this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.15);
        g.ring(this.x, this.y, 70, 0.6, '#9ad0e0', 3);
        g.text(this.x, this.y - 28, 'INVOCA', '#9ad0e0', 13);
        g.sfx.skill();
      }
      toward(p, this.speedJit * 0.85, 5, 40);
    } else if (b === 'boss') {
      g.updateBoss(this, dt, dx, dy, d2);
    }

    g.world.move(this, this.vx * dt, this.vy * dt);

    if (d2 < this.w / 2 + p.w / 2 + 6 && this.touchCd <= 0 && p.hp > 0 && !this.isBoss) {
      g.damagePlayer(d.dmg);
      this.touchCd = 0.8;
      if (d.venom) { p.status.venom = 3; p.status.venomCd = 1; }
    }
    if (this.isBoss && d2 < this.w / 2 + p.w / 2 + 4 && this.touchCd <= 0 && p.hp > 0) {
      g.damagePlayer(Math.round(d.dmg * 0.7));
      this.touchCd = 1;
    }
  }

  draw(ctx, t) {
    const d = this.def;
    ctx.save();
    ctx.translate(this.x, this.y);
    if (this.dying) {
      const k = Math.max(0, this.dieT / 0.3);
      ctx.globalAlpha = k;
      ctx.scale(k, k);
    }
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(0, this.h / 2 + 2, this.w * 0.5, 4, 0, 0, 6.283);
    ctx.fill();
    ctx.globalAlpha = 1;

    const flash = this.hitT > 0;
    const col = flash ? '#ffffff' : d.color;
    const dark = flash ? '#dddddd' : d.dark;
    const bob = d.behavior === 'hop' ? Math.abs(Math.sin(t * 6 + this.x * 0.05)) * 4 : 0;
    ctx.translate(0, -bob);

    // vulnerável? pisca dourado
    if (this.stunned > 0 && Math.floor(t * 10) % 2 === 0) ctx.globalAlpha = 0.6;

    const eyes = (ex, ey) => {
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(ex - 2, ey, 2.6, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(ex + 2, ey, 2.6, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.arc(ex - 2 + this.facing, ey, 1.3, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(ex + 2 + this.facing, ey, 1.3, 0, 6.283); ctx.fill();
    };

    if (d.id === 'slime') {
      const r = this.w / 2;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(-r, r * 0.4);
      ctx.bezierCurveTo(-r, r, r, r, r, r * 0.4);
      ctx.bezierCurveTo(r * 0.7, 0, -r * 0.7, 0, -r, r * 0.4);
      ctx.fill();
      ctx.fillStyle = dark;
      ctx.fillRect(-3, r * 0.15, 6, r * 0.5);
      eyes(0, -4);
    } else if (d.id === 'bat') {
      const fl = Math.sin(t * 18) * 0.5;
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.moveTo(-4, -4);
      ctx.lineTo(-18, -12 + fl * 10);
      ctx.lineTo(-8, 0);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(4, -4);
      ctx.lineTo(18, -12 + fl * 10);
      ctx.lineTo(8, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, 6.283);
      ctx.fill();
      eyes(-1, -1);
    } else if (d.id === 'goblin') {
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.moveTo(-10, -6);
      ctx.lineTo(-14, -14);
      ctx.lineTo(-4, -8);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(10, -6);
      ctx.lineTo(14, -14);
      ctx.lineTo(4, -8);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, 6.283);
      ctx.fill();
      eyes(0, -3);
    } else if (d.id === 'skeleton') {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(0, -8, 8, 0, 6.283);
      ctx.fill();
      ctx.fillStyle = dark;
      ctx.fillRect(-6, -4, 12, 12);
      for (let i = -1; i <= 1; i++) {
        ctx.fillStyle = col;
        ctx.fillRect(i * 4 - 1, -4, 2, 12);
      }
      eyes(-2, -10);
      eyes(2, -10);
    } else if (d.id === 'golem') {
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.moveTo(-14, 8);
      ctx.lineTo(-10, -8);
      ctx.lineTo(0, -14);
      ctx.lineTo(12, -6);
      ctx.lineTo(14, 8);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(-6, -10);
      ctx.lineTo(2, -8);
      ctx.lineTo(6, -2);
      ctx.lineTo(-2, -2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath(); ctx.arc(-4, -4, 2, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(4, -4, 2, 0, 6.283); ctx.fill();
    } else if (d.id === 'shaman') {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(-10, 10);
      ctx.lineTo(-8, -8);
      ctx.lineTo(0, -12);
      ctx.lineTo(8, -8);
      ctx.lineTo(10, 10);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.moveTo(-9, 2);
      ctx.lineTo(-9, -14);
      ctx.lineTo(9, -14);
      ctx.lineTo(9, 2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = col;
      ctx.fillRect(7, 2, 4, 16);
      ctx.fillStyle = '#c76bd8';
      ctx.beginPath();
      ctx.arc(9, 18, 4, 0, 6.283);
      ctx.fill();
      eyes(-2, -8);
      eyes(2, -8);
    } else if (d.id === 'boss') {
      const pulse = 1 + Math.sin(t * 4) * 0.05;
      ctx.scale(pulse, pulse);
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.moveTo(-22, 14);
      ctx.lineTo(-16, -12);
      ctx.lineTo(0, -20);
      ctx.lineTo(18, -10);
      ctx.lineTo(22, 14);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(-16, 6);
      ctx.lineTo(-10, -8);
      ctx.lineTo(4, -10);
      ctx.lineTo(12, 2);
      ctx.lineTo(2, 8);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ff5c5c';
      ctx.beginPath(); ctx.arc(-7, -6, 3, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(7, -6, 3, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#ffd23f';
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 9 - 3, -14);
        ctx.lineTo(i * 9, -26);
        ctx.lineTo(i * 9 + 3, -14);
        ctx.closePath();
        ctx.fill();
      }
    } else if (d.id === 'wolf') {
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.moveTo(-12, 2); ctx.lineTo(-22, -6); ctx.lineTo(-10, -2); ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(12, 2); ctx.lineTo(22, -6); ctx.lineTo(10, -2); ctx.closePath();
      ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.ellipse(0, 0, 12, 9, 0, 0, 6.283);
      ctx.fill();
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.moveTo(-6, -12); ctx.lineTo(-9, -18); ctx.lineTo(-3, -13); ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(6, -12); ctx.lineTo(9, -18); ctx.lineTo(3, -13); ctx.closePath();
      ctx.fill();
      eyes(-2, -3);
      eyes(2, -3);
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo(-2, 3); ctx.lineTo(-4, 7); ctx.lineTo(0, 4); ctx.closePath();
      ctx.moveTo(2, 3); ctx.lineTo(4, 7); ctx.lineTo(0, 4); ctx.closePath();
      ctx.fill();
    } else if (d.id === 'archer') {
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.moveTo(-11, -6); ctx.lineTo(-15, -15); ctx.lineTo(-4, -9); ctx.closePath();
      ctx.beginPath();
      ctx.moveTo(11, -6); ctx.lineTo(15, -15); ctx.lineTo(4, -9); ctx.closePath();
      ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, 6.283);
      ctx.fill();
      ctx.fillStyle = '#8a5a2b';
      ctx.beginPath();
      ctx.arc(0, 0, 9, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(9, -3); ctx.lineTo(20, -6);
      ctx.stroke();
      eyes(0, -4);
      ctx.fillStyle = dark;
      ctx.fillRect(-8, 6, 5, 10);
      ctx.fillRect(3, 6, 5, 10);
    } else if (d.id === 'bomber') {
      const blink = Math.floor(t * 8) % 2 === 0;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(0, 0, 11, 0, 6.283);
      ctx.fill();
      ctx.fillStyle = dark;
      ctx.fillRect(-6, -5, 12, 10);
      ctx.fillStyle = blink ? '#fff' : '#ffb020';
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, 6.283);
      ctx.fill();
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath();
      ctx.moveTo(-3, -10);
      ctx.quadraticCurveTo(0, -16 + (blink ? 4 : 0), 3, -10);
      ctx.fill();
      eyes(-3, -3);
      eyes(3, -3);
    } else if (d.id === 'spider') {
      ctx.fillStyle = dark;
      for (let i = 0; i < 4; i++) {
        const l = Math.sin(t * 6 + i) * 3;
        ctx.beginPath();
        ctx.moveTo(-3, -3);
        ctx.lineTo(-14, -10 - l);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(3, -3);
        ctx.lineTo(14, -10 + l);
        ctx.stroke();
      }
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.ellipse(0, 0, 12, 9, 0, 0, 6.283);
      ctx.fill();
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.arc(0, -3, 4, 0, 6.283);
      ctx.fill();
      ctx.fillStyle = '#ff5c5c';
      ctx.beginPath(); ctx.arc(-3, -4, 1.6, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(3, -4, 1.6, 0, 6.283); ctx.fill();
      ctx.strokeStyle = dark;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, 6); ctx.lineTo(0, 12); ctx.stroke();
    } else if (d.id === 'wraith') {
      const ph = t * 3 + this.x * 0.01;
      ctx.globalAlpha = 0.75 + Math.sin(ph) * 0.15;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.quadraticCurveTo(-12, -6, -10, 6);
      ctx.quadraticCurveTo(-6, 12, 0, 10);
      ctx.quadraticCurveTo(6, 12, 10, 6);
      ctx.quadraticCurveTo(12, -6, 0, -12);
      ctx.fill();
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(-6, 2);
      ctx.quadraticCurveTo(0, 4, 4, 2);
      ctx.lineTo(6, 1);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#7ad0ff';
      ctx.beginPath(); ctx.arc(-3, -3, 1.5, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(3, -3, 1.5, 0, 6.283); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(154,208,224,0.5)';
      ctx.lineWidth = 2;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 8, 8);
        ctx.quadraticCurveTo(i * 8 - 3 * i, 12, i * 8, 16);
        ctx.stroke();
      }
    } else if (d.id === 'krol_chefe') {
      const pulse = 1 + Math.sin(t * 3.5) * 0.04;
      ctx.scale(pulse, pulse);
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.moveTo(-8, 12); ctx.lineTo(-16, 0); ctx.lineTo(-14, -14); ctx.lineTo(-8, -6); ctx.lineTo(-2, -18);
      ctx.lineTo(2, -18); ctx.lineTo(8, -6); ctx.lineTo(14, -14); ctx.lineTo(16, 0); ctx.lineTo(8, 12); ctx.closePath();
      ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(0, 0, 11, 0, 6.283);
      ctx.fill();
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.moveTo(-7, -14); ctx.lineTo(-10, -24); ctx.lineTo(-3, -15); ctx.closePath();
      ctx.beginPath();
      ctx.moveTo(7, -14); ctx.lineTo(10, -24); ctx.lineTo(3, -15); ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath();
      ctx.moveTo(0, -16);
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + i * 2 * Math.PI / 5;
        const a2 = a + Math.PI / 5;
        ctx.lineTo(Math.cos(a) * 6, -16 + Math.sin(a) * 6);
        ctx.lineTo(Math.cos(a2) * 2.5, -16 + Math.sin(a2) * 2.5);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(-4, -4, 5, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(4, -4, 5, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#c0392b';
      ctx.beginPath(); ctx.arc(-4, -4, 2.5, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(4, -4, 2.5, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#000';
      ctx.fillRect(-4, -1, 8, 1.5);
      ctx.fillRect(0, -1, 1, 5);
    } else if (d.id === 'gere_osso') {
      const pulse = 1 + Math.sin(t * 3) * 0.04;
      ctx.scale(pulse, pulse);
      // aura espectral
      ctx.strokeStyle = 'rgba(154,107,255,' + (0.25 + Math.sin(t * 3.5) * 0.12).toFixed(2) + ')';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, -2, 26, 0, 6.283);
      ctx.stroke();
      // manto arruinado (dobras)
      ctx.fillStyle = '#7a6a4b';
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.moveTo(-16, 10); ctx.lineTo(-14, 22); ctx.lineTo(-8, 16); ctx.lineTo(-4, 24); ctx.lineTo(0, 16);
      ctx.lineTo(6, 24); ctx.lineTo(14, 16); ctx.lineTo(18, 12); ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
      // corpo principal
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.moveTo(-22, 10); ctx.lineTo(-18, -8); ctx.lineTo(-8, -16); ctx.lineTo(0, -20);
      ctx.lineTo(8, -16); ctx.lineTo(18, -8); ctx.lineTo(22, 10); ctx.lineTo(14, 4);
      ctx.lineTo(6, 14); ctx.lineTo(-6, 14); ctx.lineTo(-14, 4); ctx.closePath();
      ctx.fill();
      // cabeça (crânio)
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(0, -10, 10, 0, 6.283);
      ctx.fill();
      // costelas
      ctx.fillStyle = dark;
      ctx.fillRect(-8, -2, 16, 16);
      for (let i = -1; i <= 1; i++) {
        ctx.fillStyle = col;
        ctx.fillRect(i * 5 - 1.5, -2, 3, 16);
      }
      // coluna espinhosa
      ctx.fillStyle = col;
      for (let i = -1; i <= 2; i++) {
        ctx.fillRect(i * 2 - 1, -2 + i * 6, 2, 6);
      }
      // olhos flamejantes (fogo do Rei da Noite)
      ctx.fillStyle = '#7ad0ff';
      ctx.globalAlpha = 0.7 + Math.sin(t * 5) * 0.3;
      ctx.beginPath(); ctx.arc(-3, -12, 2.6, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(3, -12, 2.6, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(-3, -12, 1.2, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(3, -12, 1.2, 0, 6.283); ctx.fill();
      ctx.globalAlpha = 1;
      // fenda óssea da boca
      ctx.strokeStyle = '#5f4a35';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-4, -7); ctx.lineTo(4, -7);
      ctx.stroke();
      // coroa real (espinhos de osso)
      ctx.fillStyle = '#e6ddcc';
      ctx.beginPath();
      ctx.moveTo(-10, -18); ctx.lineTo(-13, -26); ctx.lineTo(-6, -20); ctx.lineTo(0, -29); ctx.lineTo(6, -20); ctx.lineTo(13, -26); ctx.lineTo(10, -18); ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#c0392b';
      ctx.beginPath();
      ctx.arc(0, -28, 2.5, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath();
      ctx.arc(0, -28, 1.2, 0, 6.283); ctx.fill();
      // cetro de osso com orbe
      const sw2 = Math.sin(t * 4) * 1.5;
      ctx.strokeStyle = '#d9d0c0';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(20, 12); ctx.lineTo(26, -8);
      ctx.stroke();
      ctx.fillStyle = '#d9d0c0';
      ctx.beginPath();
      ctx.arc(27, -11, 4, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#9a6bff';
      ctx.beginPath();
      ctx.arc(27, -11 + sw2 * 0.4, 2, 0, 6.283); ctx.fill();
    } else if (d.id === 'titan') {
      const pulse = 1 + Math.sin(t * 2.5) * 0.03;
      ctx.scale(pulse, pulse);
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.moveTo(-26, 16); ctx.lineTo(-20, -14); ctx.lineTo(-6, -26); ctx.lineTo(8, -26);
      ctx.lineTo(20, -14); ctx.lineTo(26, 16); ctx.lineTo(16, 12); ctx.lineTo(12, 20);
      ctx.lineTo(-12, 20); ctx.lineTo(-16, 12); ctx.closePath();
      ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(-14, 8); ctx.lineTo(-8, -10); ctx.lineTo(0, -16); ctx.lineTo(10, -8);
      ctx.lineTo(14, 8); ctx.lineTo(0, 14); ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ff5c5c';
      ctx.beginPath(); ctx.arc(-5, -10, 3.5, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(5, -10, 3.5, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#ffd23f';
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 11 - 4, -18);
        ctx.lineTo(i * 11, -30);
        ctx.lineTo(i * 11 + 4, -18);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(255,210,63,0.5)';
      for (let i = 0; i < 3; i++) {
        const a = t * 0.6 + i * 2.1;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * 24, -4 + Math.sin(a) * 4, 3, 0, 6.283);
        ctx.fill();
      }
    } else if (d.id === 'rato') {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.ellipse(0, 4, 10, 7, 0, 0, 6.283);
      ctx.fill();
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.moveTo(-10, 2); ctx.quadraticCurveTo(-18, -4, -13, 8); ctx.lineTo(-8, 4); ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#e8b4c0';
      ctx.beginPath(); ctx.arc(-10, 2, 2, 0, 6.283); ctx.fill();
      eyes(-2, -1);
      eyes(2, -1);
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo(-1, 8); ctx.lineTo(-3, 13); ctx.lineTo(1, 10); ctx.closePath();
      ctx.moveTo(1, 8); ctx.lineTo(3, 13); ctx.lineTo(-1, 10); ctx.closePath();
      ctx.fill();
    } else if (d.id === 'espantalho') {
      ctx.strokeStyle = '#6b4a2a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-4, 12); ctx.lineTo(4, 12); ctx.lineTo(2, -6); ctx.lineTo(-2, -6); ctx.closePath();
      ctx.fillStyle = '#6b4a2a';
      ctx.fill();
      ctx.fillStyle = '#a8723a';
      ctx.fillRect(-10, -16, 20, 20);
      ctx.fillStyle = '#c9a050';
      ctx.fillRect(-12, -18, 24, 4);
      ctx.fillStyle = '#4b3a2a';
      eyes(-3, -8);
      eyes(3, -8);
      ctx.fillStyle = '#8a5a2b';
      ctx.beginPath();
      ctx.moveTo(-6, -12); ctx.lineTo(-18, -2); ctx.lineTo(-6, -8); ctx.closePath();
      ctx.moveTo(6, -12); ctx.lineTo(18, -2); ctx.lineTo(6, -8); ctx.closePath();
      ctx.fill();
    } else if (d.id === 'javali') {
      ctx.fillStyle = dark;
      ctx.fillRect(-8, -2, 16, 10);
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.ellipse(0, 0, 13, 10, 0, 0, 6.283);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo(-3, 0); ctx.lineTo(-7, 6); ctx.lineTo(-1, 3); ctx.closePath();
      ctx.moveTo(3, 0); ctx.lineTo(7, 6); ctx.lineTo(1, 3); ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#6a4b3a';
      ctx.fillRect(-6, -4, 12, 2);
      eyes(-3, -4);
      eyes(3, -4);
    } else if (d.id === 'aguia') {
      const fl = Math.sin(t * 16) * 0.6;
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.moveTo(-4, -3);
      ctx.lineTo(-16, -14 + fl * 12);
      ctx.lineTo(-7, 0);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(4, -3);
      ctx.lineTo(16, -14 + fl * 12);
      ctx.lineTo(7, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.ellipse(0, 0, 8, 6, 0, 0, 6.283);
      ctx.fill();
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath();
      ctx.moveTo(5, 3); ctx.lineTo(14, 6); ctx.lineTo(7, 6); ctx.closePath();
      ctx.fill();
      eyes(-2, -1);
      eyes(2, -1);
    } else if (d.id === 'crocodilo') {
      ctx.fillStyle = dark;
      ctx.fillRect(-12, 0, 24, 8);
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.ellipse(0, 2, 18, 9, 0, 0, 6.283);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo(14, -1); ctx.lineTo(24, 4); ctx.lineTo(13, 5); ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#2f4b2f';
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 10 - 3, -7);
        ctx.lineTo(i * 10, -11);
        ctx.lineTo(i * 10 + 3, -7);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.arc(-8, 0, 2, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#ff5c5c';
      ctx.beginPath(); ctx.arc(8, 0, 2, 0, 6.283); ctx.fill();
    } else if (d.id === 'lodo_corrupto') {
      const r = this.w / 2;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(-r, r * 0.3);
      ctx.bezierCurveTo(-r, r * 0.8, r, r * 0.8, r, r * 0.3);
      ctx.bezierCurveTo(r * 0.7, -r * 0.4, -r * 0.7, -r * 0.4, -r, r * 0.3);
      ctx.fill();
      ctx.fillStyle = '#7aff6a';
      ctx.globalAlpha = 0.5 + Math.sin(t * 6) * 0.3;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(-8 + i * 8, -6 + (i % 2) * 5, 2.5, 0, 6.283);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      eyes(-3, -2);
      eyes(3, -2);
    } else if (d.id === 'fogo_fatuo') {
      const ph = t * 4 + this.x * 0.01;
      ctx.globalAlpha = 0.8 + Math.sin(ph) * 0.2;
      ctx.fillStyle = '#a8d860';
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.quadraticCurveTo(-9, -4, -7, 6);
      ctx.quadraticCurveTo(-3, 12, 0, 8);
      ctx.quadraticCurveTo(3, 12, 7, 6);
      ctx.quadraticCurveTo(9, -4, 0, -12);
      ctx.fill();
      ctx.fillStyle = '#d8ffa0';
      ctx.beginPath();
      ctx.arc(0, -2, 4, 0, 6.283);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(-2, -4, 1.4, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(2, -4, 1.4, 0, 6.283); ctx.fill();
    } else if (d.id === 'zumbi') {
      ctx.fillStyle = dark;
      ctx.fillRect(-8, 2, 16, 8);
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(0, -6, 9, 0, 6.283);
      ctx.fill();
      ctx.fillStyle = '#5a6a4b';
      eyes(-3, -8);
      eyes(3, -8);
      ctx.fillStyle = '#4b5a3a';
      ctx.beginPath();
      ctx.moveTo(-4, -16); ctx.lineTo(0, -22); ctx.lineTo(4, -16); ctx.closePath();
      ctx.fill();
      ctx.fillStyle = col;
      ctx.fillRect(-8, -2, 4, 10);
      ctx.fillRect(5, -2, 4, 10);
    } else if (d.id === 'corvo') {
      const fl = Math.sin(t * 20) * 0.7;
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.moveTo(-3, -2);
      ctx.lineTo(-13, -12 + fl * 9);
      ctx.lineTo(-5, 0);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(3, -2);
      ctx.lineTo(13, -12 + fl * 9);
      ctx.lineTo(5, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.ellipse(0, 0, 6, 5, 0, 0, 6.283);
      ctx.fill();
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath();
      ctx.moveTo(5, 2); ctx.lineTo(11, 3); ctx.lineTo(5, 4); ctx.closePath();
      ctx.fill();
      eyes(-1, -1);
      eyes(1, -1);
    } else if (d.id === 'necromante') {
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.moveTo(-11, 12); ctx.lineTo(-8, -6); ctx.lineTo(0, -12); ctx.lineTo(8, -6); ctx.lineTo(11, 12); ctx.closePath();
      ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(-8, 2); ctx.lineTo(-8, -12); ctx.lineTo(8, -12); ctx.lineTo(8, 2); ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#7a5a6a';
      ctx.beginPath();
      ctx.moveTo(-1, -12); ctx.lineTo(1, -20); ctx.lineTo(3, -12); ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#b0a0b8';
      ctx.beginPath();
      ctx.arc(-2, -8, 2, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(3, -8, 2, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#c76bd8';
      ctx.beginPath();
      ctx.arc(6, 6, 3, 0, 6.283); ctx.fill();
    } else if (d.id === 'gargula') {
      const fl = Math.sin(t * 8) * 0.3;
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.moveTo(-4, -2);
      ctx.lineTo(-18, -10 - fl * 8);
      ctx.lineTo(-6, 0);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(4, -2);
      ctx.lineTo(18, -10 - fl * 8);
      ctx.lineTo(6, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(-7, 8);
      ctx.lineTo(-5, -12);
      ctx.lineTo(5, -12);
      ctx.lineTo(7, 8);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ff5c5c';
      ctx.beginPath(); ctx.arc(-2, -6, 1.8, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(2, -6, 1.8, 0, 6.283); ctx.fill();
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.moveTo(-2, -12); ctx.lineTo(-5, -18); ctx.lineTo(0, -14); ctx.closePath();
      ctx.moveTo(2, -12); ctx.lineTo(5, -18); ctx.lineTo(0, -14); ctx.closePath();
      ctx.fill();
    } else if (d.id === 'morteiro') {
      ctx.fillStyle = dark;
      ctx.fillRect(-9, 0, 18, 10);
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(0, -8, 9, 0, 6.283);
      ctx.fill();
      ctx.fillStyle = '#2b2b33';
      ctx.fillRect(-11, -16, 22, 3);
      ctx.fillStyle = '#ff5c5c';
      ctx.beginPath(); ctx.arc(-2, -10, 2, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(2, -10, 2, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#c8c0a8';
      ctx.fillRect(6, -12, 3, 20);
      ctx.fillStyle = '#9a8f7a';
      ctx.fillRect(6, 4, 3, 3);
    } else if (d.id === 'mumia') {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(0, -6, 8, 0, 6.283);
      ctx.fill();
      ctx.fillStyle = dark;
      ctx.fillRect(-7, 0, 14, 12);
      ctx.fillStyle = '#fff';
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(-7, 2 + i * 4, 14, 2);
      }
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.arc(-2, -7, 1.6, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(2, -7, 1.6, 0, 6.283); ctx.fill();
    } else if (d.id === 'minotauro') {
      ctx.fillStyle = dark;
      ctx.fillRect(-9, -2, 18, 12);
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(0, -8, 11, 0, 6.283);
      ctx.fill();
      ctx.fillStyle = '#8a5a2b';
      ctx.beginPath();
      ctx.arc(0, -13, 8, 0, 6.283);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(-2, -16, 2.5, 0, 6.283); ctx.beginPath();
      ctx.arc(2, -16, 2.5, 0, 6.283);
      ctx.fill();
      ctx.fillStyle = dark;
      ctx.fillRect(-5, -10, 10, 2);
      ctx.beginPath(); ctx.arc(-2, -9, 1.6, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(2, -9, 1.6, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#5f352b';
      ctx.beginPath();
      ctx.moveTo(-8, -11); ctx.lineTo(-6, -22); ctx.lineTo(-1, -12); ctx.closePath();
      ctx.moveTo(8, -11); ctx.lineTo(6, -22); ctx.lineTo(1, -12); ctx.closePath();
      ctx.fill();
    } else if (d.id === 'demoninho') {
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.moveTo(-10, 8); ctx.lineTo(-7, -4); ctx.lineTo(0, -10); ctx.lineTo(7, -4); ctx.lineTo(10, 8); ctx.closePath();
      ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(0, -2, 8, 0, 6.283);
      ctx.fill();
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath();
      ctx.moveTo(-5, -9); ctx.lineTo(-3, -16); ctx.lineTo(1, -9); ctx.closePath();
      ctx.moveTo(5, -9); ctx.lineTo(3, -16); ctx.lineTo(-1, -9); ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ff5c5c';
      ctx.beginPath(); ctx.arc(-2, -4, 1.8, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(2, -4, 1.8, 0, 6.283); ctx.fill();
      ctx.strokeStyle = dark;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, 5); ctx.quadraticCurveTo(2, 8, 0, 12); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, 6); ctx.quadraticCurveTo(-3, 9, 0, 11); ctx.stroke();
    } else if (d.id === 'soldado_leal') {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(0, -8, 9, 0, 6.283);
      ctx.fill();
      ctx.fillStyle = dark;
      ctx.fillRect(-8, -4, 16, 10);
      ctx.fillStyle = '#4a4a55';
      ctx.fillRect(-11, -14, 22, 3);
      ctx.fillRect(-9, -6, 18, 2);
      ctx.fillStyle = '#222';
      ctx.fillRect(-10, -3, 4, 12);
      ctx.fillStyle = '#b5651d';
      ctx.fillRect(8, -12, 3, 20);
      eyes(-2, -10);
      eyes(2, -10);
    } else if (d.id === 'guarda_arquebus') {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(0, -8, 8, 0, 6.283);
      ctx.fill();
      ctx.fillStyle = dark;
      ctx.fillRect(-7, -3, 14, 10);
      ctx.fillStyle = '#4a4a55';
      ctx.fillRect(-9, -13, 18, 3);
      ctx.fillStyle = '#8a5a2b';
      ctx.fillRect(7, -2, 14, 4);
      ctx.fillStyle = '#222';
      ctx.fillRect(7, 2, 14, 3);
      eyes(-2, -9);
      eyes(2, -9);
    } else if (d.id === 'espectro_arcano') {
      const ph = t * 3 + this.x * 0.012;
      ctx.globalAlpha = 0.7 + Math.sin(ph) * 0.2;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(0, -13);
      ctx.quadraticCurveTo(-13, -5, -10, 7);
      ctx.quadraticCurveTo(-5, 12, 0, 9);
      ctx.quadraticCurveTo(5, 12, 10, 7);
      ctx.quadraticCurveTo(13, -5, 0, -13);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(-3, -4, 1.7, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(3, -4, 1.7, 0, 6.283); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(160,138,216,0.6)';
      ctx.lineWidth = 2;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 8, 8);
        ctx.quadraticCurveTo(i * 8 - 4 * i, 12, i * 8, 17);
        ctx.stroke();
      }
    } else if (d.id === 'homunculo') {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.ellipse(0, 2, 11, 9, 0, 0, 6.283);
      ctx.fill();
      ctx.fillStyle = dark;
      ctx.fillRect(-4, -6, 8, 4);
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(-3, -8, 2, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(3, -8, 2, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.arc(-3, -8, 1, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(3, -8, 1, 0, 6.283); ctx.fill();
      ctx.fillStyle = dark;
      ctx.fillRect(-2, 8, 4, 3);
      ctx.fillRect(-4, 10, 3, 2);
      ctx.fillRect(1, 10, 3, 2);
    } else if (d.id === 'lobisomem') {
      ctx.fillStyle = dark;
      ctx.fillRect(-10, -4, 20, 12);
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(0, -10, 11, 0, 6.283);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo(-11, -17); ctx.lineTo(-13, -24); ctx.lineTo(-6, -18); ctx.closePath();
      ctx.moveTo(11, -17); ctx.lineTo(13, -24); ctx.lineTo(6, -18); ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ff5c5c';
      ctx.beginPath(); ctx.arc(-3, -12, 2, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(3, -12, 2, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo(-2, -8); ctx.lineTo(-4, -3); ctx.lineTo(0, -6); ctx.closePath();
      ctx.moveTo(2, -8); ctx.lineTo(4, -3); ctx.lineTo(0, -6); ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo(-11, -6); ctx.lineTo(-19, 4); ctx.lineTo(-9, 0); ctx.closePath();
      ctx.moveTo(11, -6); ctx.lineTo(19, 4); ctx.lineTo(9, 0); ctx.closePath();
      ctx.fill();
    } else if (d.id === 'gigante_pedra') {
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.moveTo(-26, 14); ctx.lineTo(-18, -16); ctx.lineTo(0, -24); ctx.lineTo(18, -16); ctx.lineTo(26, 14); ctx.closePath();
      ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(-16, 8); ctx.lineTo(-10, -12); ctx.lineTo(0, -18); ctx.lineTo(12, -8); ctx.lineTo(16, 8); ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath(); ctx.arc(-5, -10, 3, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(5, -10, 3, 0, 6.283); ctx.fill();
      ctx.fillStyle = dark;
      ctx.fillRect(-16, 6, 8, 10);
      ctx.fillRect(8, 6, 8, 10);
    } else if (d.id === 'sacerdote_necro') {
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.moveTo(-13, 12); ctx.lineTo(-9, -8); ctx.lineTo(0, -14); ctx.lineTo(9, -8); ctx.lineTo(13, 12); ctx.closePath();
      ctx.fill();
      ctx.fillStyle = col;
      ctx.fillRect(-9, 0, 18, 18);
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo(0, -14);
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + i * 2 * Math.PI / 5;
        const a2 = a + Math.PI / 5;
        ctx.lineTo(Math.cos(a) * 6, -14 + Math.sin(a) * 6);
        ctx.lineTo(Math.cos(a2) * 2.5, -14 + Math.sin(a2) * 2.5);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#b8a0d8';
      ctx.beginPath(); ctx.arc(-2, -6, 1.8, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(2, -6, 1.8, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#c76bd8';
      ctx.beginPath(); ctx.arc(0, 14, 3, 0, 6.283); ctx.fill();
    } else if (d.id === 'dragao_bebe') {
      const fl = Math.sin(t * 12) * 0.5;
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.moveTo(-5, -3);
      ctx.lineTo(-18, -12 + fl * 10);
      ctx.lineTo(-7, 0);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(5, -3);
      ctx.lineTo(18, -12 + fl * 10);
      ctx.lineTo(7, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.ellipse(0, 0, 11, 9, 0, 0, 6.283);
      ctx.fill();
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath(); ctx.arc(-4, -4, 2, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(4, -4, 2, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo(10, 4); ctx.lineTo(14, 8); ctx.lineTo(9, 7); ctx.closePath();
      ctx.fill();
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.moveTo(-2, -11); ctx.lineTo(-4, -18); ctx.lineTo(1, -12); ctx.closePath();
      ctx.moveTo(2, -11); ctx.lineTo(4, -18); ctx.lineTo(-1, -12); ctx.closePath();
      ctx.fill();
    } else if (d.id === 'demonio') {
      const pulse = 1 + Math.sin(t * 3) * 0.04;
      const fl = Math.sin(t * 6) * 6;
      ctx.scale(pulse, pulse);
      // aura de fogo infernal
      ctx.strokeStyle = 'rgba(255,90,60,' + (0.35 + Math.sin(t * 4) * 0.15).toFixed(2) + ')';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, -6, 30, 0, 6.283);
      ctx.stroke();
      // asas
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.moveTo(-4, -14);
      ctx.lineTo(-34, -16 + fl * 0.3);
      ctx.lineTo(-10, -4);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(4, -14);
      ctx.lineTo(34, -16 - fl * 0.3);
      ctx.lineTo(10, -4);
      ctx.closePath();
      ctx.fill();
      // cauda com ponta flamejante
      const tw = Math.sin(t * 5) * 0.3;
      ctx.strokeStyle = '#8a2f2f';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(0, 8);
      ctx.quadraticCurveTo(18, 16, 26, 20 + tw * 8);
      ctx.stroke();
      ctx.fillStyle = '#ff6b3a';
      ctx.beginPath();
      ctx.arc(28, 22 + tw * 8, 5, 0, 6.283);
      ctx.fill();
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath();
      ctx.arc(28, 22 + tw * 8, 2.5, 0, 6.283);
      ctx.fill();
      // corpo
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(-22, 10); ctx.lineTo(-16, -14); ctx.lineTo(0, -22); ctx.lineTo(16, -14); ctx.lineTo(22, 10); ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#4a1f1f';
      ctx.beginPath();
      ctx.moveTo(-12, 4); ctx.lineTo(-6, -12); ctx.lineTo(2, -14); ctx.lineTo(8, -6); ctx.lineTo(2, 8); ctx.closePath();
      ctx.fill();
      // runa no peito (brilha)
      ctx.fillStyle = '#ff9d4a';
      ctx.globalAlpha = 0.5 + Math.sin(t * 6) * 0.3;
      ctx.beginPath();
      ctx.moveTo(-2, -6); ctx.lineTo(-4, -2); ctx.lineTo(-2, 2); ctx.lineTo(2, 2); ctx.lineTo(4, -2); ctx.lineTo(2, -6); ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
      // chifre superior
      ctx.fillStyle = '#ff9d4a';
      ctx.fillRect(-4, -18, 8, 4);
      // olhos
      ctx.fillStyle = '#ff5c5c';
      ctx.beginPath(); ctx.arc(-6, -12, 3.4, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(6, -12, 3.4, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.arc(-6, -12, 1.5, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(6, -12, 1.5, 0, 6.283); ctx.fill();
      // presas
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo(-7, -8); ctx.lineTo(-10, -2); ctx.lineTo(-4, -5); ctx.closePath();
      ctx.moveTo(7, -8); ctx.lineTo(10, -2); ctx.lineTo(4, -5); ctx.closePath();
      ctx.fill();
      // chifres demoníacos (curvos)
      ctx.fillStyle = '#7a2f2f';
      ctx.beginPath();
      ctx.moveTo(-2, -20); ctx.lineTo(-6, -32); ctx.lineTo(1, -24); ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(2, -20); ctx.lineTo(6, -32); ctx.lineTo(-1, -24); ctx.closePath();
      ctx.fill();
      // tridente flamejante na mão
      const sw = Math.sin(t * 6 + 1) * 1.5;
      ctx.strokeStyle = '#8a3a2f';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(20, 8);
      ctx.lineTo(24, -14);
      ctx.stroke();
      ctx.fillStyle = '#ff9d4a';
      ctx.beginPath();
      ctx.moveTo(24, -14); ctx.lineTo(21, -26); ctx.lineTo(23, -18); ctx.closePath();
      ctx.moveTo(24, -14); ctx.lineTo(24, -28 + sw); ctx.lineTo(27, -18); ctx.closePath();
      ctx.moveTo(24, -14); ctx.lineTo(27, -26); ctx.lineTo(25, -18); ctx.closePath();
      ctx.fill();
      // partículas de fogo orbitando
      ctx.fillStyle = '#ff5c5c';
      ctx.globalAlpha = 0.6;
      for (let i = 0; i < 3; i++) {
        const a = t * 0.8 + i * 2.1;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * 22, -6 + Math.sin(a) * 4, 3, 0, 6.283);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else if (d.id === 'general') {
      const pulse = 1 + Math.sin(t * 3) * 0.03;
      ctx.scale(pulse, pulse);
      ctx.fillStyle = dark;
      ctx.fillRect(-20, -6, 40, 20);
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(-16, 6); ctx.lineTo(-12, -14); ctx.lineTo(0, -20); ctx.lineTo(12, -14); ctx.lineTo(16, 6); ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#c0392b';
      ctx.fillRect(-14, -18, 28, 5);
      ctx.fillStyle = '#222';
      ctx.beginPath();
      ctx.arc(0, -14, 7, 0, 6.283);
      ctx.fill();
      ctx.fillStyle = '#ff5c5c';
      ctx.beginPath(); ctx.arc(-2, -14, 2, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(2, -14, 2, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#c0392b';
      ctx.beginPath();
      ctx.moveTo(-1, -20); ctx.lineTo(0, -30); ctx.lineTo(1, -20); ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#888';
      ctx.fillRect(-22, -4, 5, 22);
      ctx.fillRect(-19, -2, 3, 18);
      ctx.fillStyle = '#c0392b';
      ctx.beginPath();
      ctx.moveTo(-22, 18);
      ctx.lineTo(-14, 22);
      ctx.lineTo(-10, 12);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffd23f';
      ctx.fillRect(14, -8, 5, 22);
    } else if (d.id === 'arcano') {
      const pulse = 1 + Math.sin(t * 2.5) * 0.04;
      ctx.scale(pulse, pulse);
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.arc(0, 0, 26, 0, 6.283);
      ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(0, 0, 20, 0, 6.283);
      ctx.fill();
      for (let i = 0; i < 6; i++) {
        const a = t * 0.6 + i * 1.047;
        const lx = Math.cos(a) * 26, ly = Math.sin(a) * 26;
        ctx.strokeStyle = '#9a80c8';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.quadraticCurveTo(lx * 1.2 + Math.cos(a) * 12, ly * 1.2 + Math.sin(a) * 12, lx * 1.6, ly * 1.6);
        ctx.stroke();
        ctx.fillStyle = '#6a58a8';
        ctx.beginPath();
        ctx.arc(lx * 1.6, ly * 1.6, 5, 0, 6.283);
        ctx.fill();
      }
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.ellipse(0, 0, 7, 9, 0, 0, 6.283);
      ctx.fill();
      ctx.strokeStyle = '#4b3f7a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, 12, 14, 0, 0, 6.283);
      ctx.stroke();
    } else {
      // fallback genérico para inimigos sem sprite dedicado
      const r = this.w / 2;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.8, 0, 6.283);
      ctx.fill();
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.arc(0, r * 0.35, r * 0.45, 0, Math.PI);
      ctx.fill();
      eyes(-r * 0.25, -r * 0.15);
      eyes(r * 0.25, -r * 0.15);
    }

    // raro: brilho dourado pulsante
    if (d.rare) {
      ctx.strokeStyle = 'rgba(255,210,63,' + (0.5 + Math.sin(t * 5) * 0.3).toFixed(2) + ')';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, -2, this.w * 0.7, 0, 6.283);
      ctx.stroke();
    }
    // chefe final: aura vermelho/ardente
    if (d.finalBoss) {
      ctx.strokeStyle = 'rgba(255,70,60,' + (0.45 + Math.sin(t * 3) * 0.25).toFixed(2) + ')';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, -4, this.w * 0.85, 0, 6.283);
      ctx.stroke();
    }
    ctx.restore();

    if (!this.dying && this.hp < this.maxHp) {
      const bw = this.w + 8;
      const ratio = this.hp / this.maxHp;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(this.x - bw / 2, this.y - this.h / 2 - 12, bw, 5);
      ctx.fillStyle = ratio > 0.5 ? '#6fbf4b' : ratio > 0.25 ? '#ffb020' : '#ff5c5c';
      ctx.fillRect(this.x - bw / 2, this.y - this.h / 2 - 12, bw * ratio, 5);
    }
  }
}

