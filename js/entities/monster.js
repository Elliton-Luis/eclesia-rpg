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
    this.frozenT = 0;
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
    if (this.frozenT > 0) return 1.5;
    if (this.stunned > 0) return 1.5;
    return this.multiplier(type);
  }

  update(dt, g) {
    const p = g.player;
    const d = this.def;
    this.touchCd -= dt;
    this.hitT -= dt;
    this.stunned = Math.max(0, this.stunned - dt);
    this.frozenT = Math.max(0, this.frozenT - dt);

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

    // Congelado (Batismo): imobilizado, sem mover, atacar ou perseguir.
    if (this.frozenT > 0) {
      this.vx = 0;
      this.vy = 0;
      return;
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
      // balanço gelatinoso sutil
      const j = Math.sin(t * 4) * 1.2;
      const sq = Math.sin(t * 2.5) * 0.5;
      // sombra no chão
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.beginPath();
      ctx.ellipse(0, r * 0.95, r * 0.7, r * 0.12, 0, 0, 6.283);
      ctx.fill();
      // corpo arredondado simples (sem boca)
      ctx.fillStyle = col;
      ctx.beginPath();
      // Forma arredondada convexa - quase círculo achatado embaixo
      ctx.ellipse(0, r * 0.15, r * 0.95, r * 0.75 + j, 0, 0, 6.283);
      ctx.fill();
      // Sombreamento interno (mais escuro embaixo)
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.beginPath();
      ctx.ellipse(0, r * 0.35, r * 0.55, r * 0.25, 0, 0, Math.PI);
      ctx.fill();
      // Reflexo/barriga
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.beginPath();
      ctx.ellipse(0, -r * 0.1, r * 0.35, r * 0.18, 0, 0, 6.283);
      ctx.fill();
      // Brilho no topo
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath();
      ctx.ellipse(-r * 0.2, -r * 0.35, r * 0.18, r * 0.1, -0.5, 0, 6.283);
      ctx.fill();
      // Olhos amarelos brilhantes (sem boca)
      const eyeY = -r * 0.05;
      const eyeX = r * 0.22;
      // Olho esquerdo
      ctx.fillStyle = '#ffeb3b';
      ctx.beginPath(); ctx.arc(-eyeX + this.facing * 0.8, eyeY, r * 0.16, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(-eyeX + this.facing * 1.2, eyeY - 1, r * 0.05, 0, 6.283); ctx.fill();
      // Olho direito
      ctx.fillStyle = '#ffeb3b';
      ctx.beginPath(); ctx.arc(eyeX + this.facing * 0.8, eyeY, r * 0.16, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(eyeX + this.facing * 1.2, eyeY - 1, r * 0.05, 0, 6.283); ctx.fill();
      // Bolinha pequena no topo da cabeça
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(0, -r * 0.65, r * 0.18, 0, 6.283); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.beginPath(); ctx.arc(-r * 0.05, -r * 0.7, r * 0.06, 0, 6.283); ctx.fill();
      // Gotinha caindo ocasional
      ctx.fillStyle = col;
      ctx.globalAlpha = 0.6;
      const drip = Math.sin(t * 2 + 1) > 0.6 ? Math.sin(t * 6) : 0;
      if (drip > 0) {
        ctx.beginPath();
        ctx.arc(0, r * 0.4 + drip * 8, 2, 0, 6.283);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else if (d.id === 'bat') {
      const fl = Math.sin(t * 18) * 0.5;
      // asas membranosas com dedos
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.moveTo(-4, -6);
      ctx.lineTo(-16, -14 + fl * 10);
      ctx.lineTo(-13, -4);
      ctx.lineTo(-22, -2 + fl * 8);
      ctx.lineTo(-7, 4);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(4, -6);
      ctx.lineTo(16, -14 - fl * 10);
      ctx.lineTo(13, -4);
      ctx.lineTo(22, -2 - fl * 8);
      ctx.lineTo(7, 4);
      ctx.closePath();
      ctx.fill();
      // corpo
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.ellipse(0, 0, 8, 9, 0, 0, 6.283);
      ctx.fill();
      // cabeça
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(0, -9, 4.6, 0, 6.283);
      ctx.fill();
      // orelhas pontudas
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.moveTo(-3, -11); ctx.lineTo(-5, -16); ctx.lineTo(-1, -12); ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(3, -11); ctx.lineTo(5, -16); ctx.lineTo(1, -12); ctx.closePath();
      ctx.fill();
      // presas
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo(-2, -1); ctx.lineTo(-2.5, 2); ctx.lineTo(-1, 1); ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(2, -1); ctx.lineTo(2.5, 2); ctx.lineTo(1, 1); ctx.closePath();
      ctx.fill();
      // olhos
      ctx.fillStyle = '#ff5c5c';
      ctx.beginPath(); ctx.arc(-2, -9, 1.4, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(2, -9, 1.4, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(-2.4, -9.4, 0.6, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(1.6, -9.4, 0.6, 0, 6.283); ctx.fill();
      // patas
      ctx.fillStyle = dark;
      ctx.fillRect(-3, 7, 2, 3);
      ctx.fillRect(1, 7, 2, 3);
    } else if (d.id === 'goblin') {
      // orelhas pontudas
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.moveTo(-6, -8);
      ctx.lineTo(-11, -18);
      ctx.lineTo(-3, -9);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(6, -8);
      ctx.lineTo(11, -18);
      ctx.lineTo(3, -9);
      ctx.closePath();
      ctx.fill();
      // corpo/trapos
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.moveTo(-9, -4); ctx.lineTo(-6, 14); ctx.lineTo(-2, 10); ctx.lineTo(2, 14); ctx.lineTo(9, -4); ctx.closePath();
      ctx.fill();
      ctx.fillStyle = col;
      ctx.fillRect(-6, -10, 12, 16);
      ctx.fillStyle = dark;
      ctx.fillRect(-6, 2, 3, 10);
      // braços
      ctx.fillStyle = col;
      ctx.fillRect(-10, -6, 3, 8);
      ctx.fillRect(7, -6, 3, 8);
      // cabeça
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(0, -13, 7.5, 0, 6.283);
      ctx.fill();
      ctx.fillStyle = dark;
      ctx.fillRect(-7.5, -15, 15, 2);
      // olhos
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath(); ctx.arc(-2.6, -14, 1.6, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(2.6, -14, 1.6, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#222';
      ctx.beginPath(); ctx.arc(-2.6, -14, 0.8, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(2.6, -14, 0.8, 0, 6.283); ctx.fill();
      // dentes
      ctx.fillStyle = '#fff';
      ctx.fillRect(-2, -10, 1.2, 2);
      ctx.fillRect(1, -10, 1.2, 2);
      // faca
      ctx.strokeStyle = '#c8c8c8';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(8, -5); ctx.lineTo(12, -10);
      ctx.stroke();
    } else if (d.id === 'skeleton') {
      // crânio
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(0, -10, 8, 0, 6.283);
      ctx.fill();
      // mandíbula
      ctx.fillStyle = col;
      ctx.fillRect(-6, -4, 12, 4);
      // órbitas (fogo espectral)
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.ellipse(-2.8, -12, 2, 2.6, 0, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.ellipse(2.8, -12, 2, 2.6, 0, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#7ad0ff';
      ctx.globalAlpha = 0.7 + Math.sin(t * 6) * 0.3;
      ctx.beginPath(); ctx.arc(-2.8, -12, 0.8, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(2.8, -12, 0.8, 0, 6.283); ctx.fill();
      ctx.globalAlpha = 1;
      // nariz
      ctx.fillStyle = '#111';
      ctx.beginPath();
      ctx.moveTo(0, -10); ctx.lineTo(-1.4, -7); ctx.lineTo(1.4, -7);
      ctx.closePath();
      ctx.fill();
      // coluna + costelas
      ctx.fillStyle = col;
      ctx.fillRect(-1, -4, 2, 16);
      ctx.strokeStyle = dark;
      ctx.lineWidth = 1.6;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(0, -2 + i * 5, 6, Math.PI * 0.15, Math.PI * 0.85);
        ctx.stroke();
      }
      // braços
      ctx.fillStyle = col;
      ctx.fillRect(-8, -4, 3, 14);
      ctx.fillRect(6, -4, 3, 14);
      ctx.fillStyle = dark;
      ctx.fillRect(-8, 8, 3, 4);
      ctx.fillRect(6, 8, 3, 4);
      // pernas
      ctx.fillStyle = col;
      ctx.fillRect(-5, 10, 3, 8);
      ctx.fillRect(3, 10, 3, 8);
      // espada
      ctx.strokeStyle = '#9aa0ac';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(7, 4); ctx.lineTo(7, -8);
      ctx.stroke();
      ctx.strokeStyle = dark;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(5.4, 2); ctx.lineTo(8.6, 2);
      ctx.stroke();
    } else if (d.id === 'golem') {
      // blocos de pedra
      ctx.fillStyle = dark;
      ctx.fillRect(-14, -6, 28, 12);
      ctx.fillStyle = col;
      ctx.fillRect(-10, -14, 20, 9);
      // núcleo luminoso
      ctx.fillStyle = '#ffd23f';
      ctx.globalAlpha = 0.75 + Math.sin(t * 5) * 0.25;
      ctx.beginPath();
      ctx.arc(0, -1, 3.4, 0, 6.283);
      ctx.fill();
      ctx.globalAlpha = 1;
      // rachaduras
      ctx.strokeStyle = dark;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-6, -12); ctx.lineTo(-3, -6); ctx.lineTo(-6, -2); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(6, -13); ctx.lineTo(4, -8); ctx.stroke();
      // cabeça pétrea
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.moveTo(-7, -20);
      ctx.lineTo(-4, -26);
      ctx.lineTo(4, -26);
      ctx.lineTo(7, -20);
      ctx.closePath();
      ctx.fill();
      // olhos de brasa
      ctx.fillStyle = '#ff9d3a';
      ctx.beginPath(); ctx.arc(-2.5, -23, 1.7, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(2.5, -23, 1.7, 0, 6.283); ctx.fill();
      // braços
      ctx.fillStyle = col;
      ctx.fillRect(-15, -4, 5, 12);
      ctx.fillRect(10, -4, 5, 12);
      ctx.fillStyle = dark;
      ctx.fillRect(-15, 6, 5, 3);
      ctx.fillRect(10, 6, 5, 3);
      // musgo
      ctx.fillStyle = 'rgba(70,120,70,0.6)';
      ctx.fillRect(-14, 4, 4, 2);
      ctx.fillRect(10, 6, 4, 2);
    } else if (d.id === 'shaman') {
      // manto ritual
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.moveTo(-10, -4); ctx.lineTo(-13, 14); ctx.lineTo(13, 14); ctx.lineTo(10, -4); ctx.closePath();
      ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(-8, -4); ctx.lineTo(-10, 13); ctx.lineTo(10, 13); ctx.lineTo(8, -4); ctx.closePath();
      ctx.fill();
      // dorso
      ctx.fillStyle = dark;
      ctx.fillRect(-2, -4, 4, 16);
      // cabeça
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(0, -10, 6.5, 0, 6.283);
      ctx.fill();
      // penacho tribal
      ctx.fillStyle = '#e8d8b0';
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 3, -16); ctx.lineTo(i * 4, -23); ctx.lineTo(i * 1.5, -17);
        ctx.closePath();
        ctx.fill();
      }
      // olhos de magia
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath(); ctx.arc(-2, -11, 1.5, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(2, -11, 1.5, 0, 6.283); ctx.fill();
      // colar de ossos
      ctx.fillStyle = '#fff';
      for (let i = -2; i <= 2; i++) ctx.fillRect(i * 2.4 - 0.6, -4, 1.2, 1.6);
      // cajado com crânio
      ctx.strokeStyle = '#6b4a2b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(10, 14); ctx.lineTo(12, -12);
      ctx.stroke();
      ctx.fillStyle = '#d9d0c0';
      ctx.beginPath();
      ctx.arc(12, -14, 3, 0, 6.283);
      ctx.fill();
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.arc(11, -15, 0.9, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(13, -15, 0.9, 0, 6.283); ctx.fill();
      // penduricalhos
      ctx.fillStyle = '#c76bd8';
      ctx.fillRect(9, 4, 2, 2);
      ctx.fillRect(9, 9, 2, 2);
    } else if (d.id === 'boss') {
      const pulse = 1 + Math.sin(t * 4) * 0.05;
      ctx.scale(pulse, pulse);
      // manto esfarrapado
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.moveTo(-22, 14);
      ctx.lineTo(-16, -12);
      ctx.lineTo(0, -20);
      ctx.lineTo(18, -10);
      ctx.lineTo(22, 14);
      ctx.closePath();
      ctx.fill();
      // capuz/cabeca interna
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(-16, 6);
      ctx.lineTo(-10, -8);
      ctx.lineTo(4, -10);
      ctx.lineTo(12, 2);
      ctx.lineTo(2, 8);
      ctx.closePath();
      ctx.fill();
      // faces da cabeça
      ctx.fillStyle = '#3a1f2f';
      ctx.beginPath();
      ctx.moveTo(-7, 2); ctx.lineTo(7, 2); ctx.lineTo(2, 6); ctx.lineTo(-2, 6); ctx.closePath();
      ctx.fill();
      // olhos flamejantes
      ctx.fillStyle = '#ff5c5c';
      ctx.beginPath(); ctx.arc(-7, -6, 3, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(7, -6, 3, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath(); ctx.arc(-7, -6, 1.3, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(7, -6, 1.3, 0, 6.283); ctx.fill();
      // chifres de aço
      ctx.fillStyle = '#5f2a2a';
      ctx.beginPath();
      ctx.moveTo(-8, -12); ctx.lineTo(-12, -22); ctx.lineTo(-4, -13); ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(8, -12); ctx.lineTo(12, -22); ctx.lineTo(4, -13); ctx.closePath();
      ctx.fill();
      // coroa de chamas
      ctx.fillStyle = '#ffd23f';
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 9 - 3, -14);
        ctx.lineTo(i * 9, -26);
        ctx.lineTo(i * 9 + 3, -14);
        ctx.closePath();
        ctx.fill();
      }
      // presas
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo(-5, -2); ctx.lineTo(-7, 3); ctx.lineTo(-3, 0); ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(5, -2); ctx.lineTo(7, 3); ctx.lineTo(3, 0); ctx.closePath();
      ctx.fill();
      // braços em garras
      ctx.strokeStyle = col;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-17, 0); ctx.lineTo(-23, -6 + Math.sin(t * 3) * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(17, 0); ctx.lineTo(23, -6 - Math.sin(t * 3) * 2);
      ctx.stroke();
      ctx.fillStyle = '#ff5c5c';
      ctx.beginPath(); ctx.arc(-24, -6 + Math.sin(t * 3) * 2, 2, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(24, -6 - Math.sin(t * 3) * 2, 2, 0, 6.283); ctx.fill();
    } else if (d.id === 'wolf') {
      // corpo de quadrúpede
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.ellipse(0, 2, 14, 9, 0, 0, 6.283);
      ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.ellipse(0, 0, 13, 8, 0, 0, 6.283);
      ctx.fill();
      // cabeça + focinho
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(10, -6, 7, 0, 6.283);
      ctx.fill();
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.moveTo(8, -6); ctx.lineTo(17, -3); ctx.lineTo(8, -2); ctx.closePath();
      ctx.fill();
      // orelhas
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.moveTo(7, -12); ctx.lineTo(8, -18); ctx.lineTo(11, -12); ctx.closePath();
      ctx.fill();
      // olho + nariz
      ctx.fillStyle = '#ff5c5c';
      ctx.beginPath(); ctx.arc(12, -7, 1.4, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#222';
      ctx.beginPath(); ctx.arc(15, -4, 1.2, 0, 6.283); ctx.fill();
      // dentes
      ctx.fillStyle = '#fff';
      ctx.fillRect(13, -2.4, 1, 1.4);
      ctx.fillRect(15, -2.4, 1, 1.4);
      // cauda espessa
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.moveTo(-12, 0);
      ctx.quadraticCurveTo(-20, -6, -17, -12);
      ctx.quadraticCurveTo(-13, -8, -10, -2);
      ctx.closePath();
      ctx.fill();
      // patas
      ctx.fillStyle = dark;
      ctx.fillRect(-8, 6, 3, 5);
      ctx.fillRect(-3, 7, 3, 5);
      ctx.fillRect(5, 7, 3, 5);
      ctx.fillRect(9, 6, 3, 5);
    } else if (d.id === 'archer') {
      // capuz de goblin arqueiro
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.moveTo(-11, -6); ctx.lineTo(-15, -15); ctx.lineTo(-4, -9); ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(11, -6); ctx.lineTo(15, -15); ctx.lineTo(4, -9); ctx.closePath();
      ctx.fill();
      // cabeça
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(0, -2, 9, 0, 6.283);
      ctx.fill();
      // capuz puxado
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.arc(0, -5, 9.5, Math.PI * 0.95, Math.PI * 2.05);
      ctx.fill();
      ctx.fillRect(-9.5, -5, 19, 3);
      // olhos
      ctx.fillStyle = '#ff5c5c';
      ctx.beginPath(); ctx.arc(-3, -4, 1.4, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(3, -4, 1.4, 0, 6.283); ctx.fill();
      // arco
      ctx.strokeStyle = '#8a5a2b';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(0, -2, 12, -1.1, 1.1);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(5, -11); ctx.lineTo(9, 2);
      ctx.stroke();
      // gibão + aljava
      ctx.fillStyle = dark;
      ctx.fillRect(-8, 6, 5, 10);
      ctx.fillRect(3, 6, 5, 10);
      ctx.fillStyle = col;
      ctx.fillRect(-8, 6, 5, 8);
      ctx.fillStyle = '#8a5a2b';
      ctx.fillRect(-11, 4, 3, 9);
    } else if (d.id === 'bomber') {
      const blink = Math.floor(t * 8) % 2 === 0;
      // corpo de bomba
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.arc(0, 1, 12, 0, 6.283);
      ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(0, 0, 10.5, 0, 6.283);
      ctx.fill();
      // tampo metálico
      ctx.fillStyle = dark;
      ctx.fillRect(-6, -5, 12, 10);
      // pavio com faísca piscando
      ctx.fillStyle = '#8a5a2b';
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.quadraticCurveTo(4, -15, 2, -17);
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = blink ? '#fff' : '#ffb020';
      ctx.beginPath();
      ctx.arc(2, -18, 3, 0, 6.283);
      ctx.fill();
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath();
      ctx.arc(2, -18, 1.4, 0, 6.283);
      ctx.fill();
      // olhos em parafuso
      ctx.fillStyle = '#222';
      ctx.beginPath(); ctx.arc(-3, -3, 2.2, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(3, -3, 2.2, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#ffd23f';
      ctx.fillRect(-3.6, -3.4, 1.2, 1.2);
      ctx.fillRect(2.4, -3.4, 1.2, 1.2);
      // rebites
      ctx.fillStyle = dark;
      ctx.fillRect(-9, 5, 2, 2);
      ctx.fillRect(7, 5, 2, 2);
    } else if (d.id === 'spider') {
      // 8 patas articuladas
      ctx.strokeStyle = dark;
      ctx.lineWidth = 2;
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
        ctx.beginPath();
        ctx.moveTo(-4, 3);
        ctx.lineTo(-15, 8 + l);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(4, 3);
        ctx.lineTo(15, 8 - l);
        ctx.stroke();
      }
      // cefalotórax
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.ellipse(0, 0, 11, 8, 0, 0, 6.283);
      ctx.fill();
      // abdômen bulboso
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.ellipse(0, 8, 7, 5, 0, 0, 6.283);
      ctx.fill();
      // padrão nas costas
      ctx.fillStyle = '#5f2a55';
      ctx.beginPath();
      ctx.arc(0, 8, 2, 0, 6.283);
      ctx.fill();
      // olhos vermelhos (4)
      ctx.fillStyle = '#ff5c5c';
      ctx.beginPath(); ctx.arc(-3, -4, 1.6, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(3, -4, 1.6, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(-5, -1, 1.1, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(5, -1, 1.1, 0, 6.283); ctx.fill();
      // presas
      ctx.fillStyle = dark;
      ctx.fillRect(-3, 2, 1.6, 3);
      ctx.fillRect(1.4, 2, 1.6, 3);
      // fio de seda
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, 6); ctx.lineTo(0, 14); ctx.stroke();
    } else if (d.id === 'wraith') {
      const ph = t * 3 + this.x * 0.01;
      ctx.globalAlpha = 0.75 + Math.sin(ph) * 0.15;
      // cauda espectral esfarrapada
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.moveTo(0, 9);
      ctx.quadraticCurveTo(-4 + Math.sin(ph * 2) * 3, 14, -2, 18);
      ctx.quadraticCurveTo(2, 16, 0, 12);
      ctx.quadraticCurveTo(4, 16, 2, 19);
      ctx.quadraticCurveTo(-2, 14, 0, 10);
      ctx.fill();
      ctx.globalAlpha = 0.75 + Math.sin(ph) * 0.15;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.quadraticCurveTo(-12, -6, -10, 6);
      ctx.quadraticCurveTo(-6, 12, 0, 10);
      ctx.quadraticCurveTo(6, 12, 10, 6);
      ctx.quadraticCurveTo(12, -6, 0, -12);
      ctx.fill();
      // capuz vazio
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(-6, 2);
      ctx.quadraticCurveTo(0, 4, 4, 2);
      ctx.lineTo(6, 1);
      ctx.closePath();
      ctx.fill();
      // braços fantasmagóricos
      ctx.strokeStyle = col;
      ctx.lineWidth = 2.4;
      ctx.globalAlpha = 0.5 + Math.sin(ph) * 0.15;
      ctx.beginPath();
      ctx.moveTo(-8, 2); ctx.lineTo(-13, -4 + Math.sin(ph * 1.5) * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(8, 2); ctx.lineTo(13, -4 + Math.cos(ph * 1.5) * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.75 + Math.sin(ph) * 0.15;
      // olhos ardentes
      ctx.fillStyle = '#7ad0ff';
      ctx.beginPath(); ctx.arc(-3, -3, 1.5, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(3, -3, 1.5, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(-3.3, -3.3, 0.6, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(2.7, -3.3, 0.6, 0, 6.283); ctx.fill();
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
      // corpo de rato... quase
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.ellipse(0, 4, 11, 8, 0, 0, 6.283);
      ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.ellipse(0, 3, 10, 7, 0, 0, 6.283);
      ctx.fill();
      // manchas de pele lisa (sem pelo, como lesão)
      ctx.fillStyle = '#e8b4c0';
      ctx.globalAlpha = 0.55;
      ctx.beginPath(); ctx.arc(-3, 5, 2.4, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(4, 6, 1.8, 0, 6.283); ctx.fill();
      ctx.globalAlpha = 1;
      // costura no dorso
      ctx.strokeStyle = '#6a4b5a';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(-8, 2); ctx.lineTo(6, 4);
      ctx.stroke();
      ctx.setLineDash([]);
      // cabeça desproporcional
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(11, -1, 7, 0, 6.283);
      ctx.fill();
      // nariz estranhamente pontiagudo (agulha) em vez de focinho
      ctx.fillStyle = '#8a3a4a';
      ctx.beginPath();
      ctx.moveTo(15, -2); ctx.lineTo(21, -1); ctx.lineTo(15, 1);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ff5c6a';
      ctx.beginPath();
      ctx.arc(21, -1, 1.3, 0, 6.283);
      ctx.fill();
      // orelhas: uma normal, outra em posição errada e espremida
      ctx.fillStyle = '#e8b4c0';
      ctx.beginPath(); ctx.arc(8, -7, 3.4, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(13, -7, 1.8, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#c98a9a';
      ctx.beginPath(); ctx.arc(8, -7, 1.8, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(13, -7, 0.8, 0, 6.283); ctx.fill();
      // olhos bugados e assimétricos: um grande, outro minúsculo
      ctx.fillStyle = '#f2f0ea';
      ctx.beginPath(); ctx.arc(10, -2, 2.4, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#222';
      ctx.beginPath(); ctx.arc(10.3, -2, 1.1, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#f2f0ea';
      ctx.beginPath(); ctx.arc(14.2, -2.4, 1, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#222';
      ctx.beginPath(); ctx.arc(14.4, -2.4, 0.4, 0, 6.283); ctx.fill();
      // bigodes que ondulam sozinhos (não soprados por vento)
      ctx.strokeStyle = 'rgba(220,220,235,0.8)';
      ctx.lineWidth = 0.8;
      for (let i = -1; i <= 1; i += 2) {
        ctx.beginPath();
        ctx.moveTo(17, i * 0.5);
        ctx.quadraticCurveTo(21, i * 2 + Math.sin(t * 3 + i) * 1.5, 24, Math.sin(t * 3 + i * 2) * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(17, i * 1.5);
        ctx.quadraticCurveTo(21, i * 3 - Math.sin(t * 4 + i) * 1.5, 24, i * 4 + Math.sin(t * 4 + i * 3) * 2);
        ctx.stroke();
      }
      // dentes de roedor supercrescidos
      ctx.fillStyle = '#f5e9c8';
      ctx.fillRect(15.4, 1, 1.4, 5);
      ctx.fillRect(17.4, 1.4, 1.4, 4.2);
      ctx.fillStyle = '#b89a5a';
      ctx.fillRect(15.4, 5.4, 1.4, 0.8);
      ctx.fillRect(17.4, 4.8, 1.4, 0.8);
      // patas demais: muitas e finas, dedos longos
      ctx.strokeStyle = '#d8a0b0';
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 6; i++) {
        const o = ((t * 3 + i * 40) % 80 + 20) / 100;
        ctx.beginPath();
        ctx.moveTo(-7 + i * 3, 8);
        ctx.lineTo(-8 + i * 3, 13 + Math.sin(t * 4 + i) * 1.5);
        ctx.stroke();
      }
      // mãozinha no lugar da pata dianteira (dedos demais)
      ctx.fillStyle = '#d8a0b0';
      ctx.fillRect(6, 8, 2.4, 3);
      for (let i = 0; i < 5; i++) {
        ctx.fillRect(5.6 + i * 0.5, 10.4, 0.7, 2.2);
      }
      // cauda longa demais, com ponta em gancho que se move sozinha
      const tx = Math.sin(t * 5) * 2;
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-9, 6);
      ctx.quadraticCurveTo(-20, 10, -17, 15 + tx * 0.5);
      ctx.quadraticCurveTo(-14, 19, -18, 20 + tx);
      ctx.stroke();
      // crista estranha de cabelo na nuca
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.moveTo(4, -7); ctx.lineTo(3, -12); ctx.lineTo(6, -8);
      ctx.moveTo(6, -6); ctx.lineTo(7, -11); ctx.lineTo(9, -7);
      ctx.fill();
      // olhinho extra, meio escondido no corpo
      ctx.fillStyle = '#3a3a4a';
      ctx.globalAlpha = 0.5;
      ctx.beginPath(); ctx.arc(-2, 0, 1.2, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#e8b4c0';
      ctx.beginPath(); ctx.arc(-2, 0, 0.5, 0, 6.283); ctx.fill();
      ctx.globalAlpha = 1;
    } else if (d.id === 'espantalho') {
      // estaca de madeira
      ctx.strokeStyle = '#5f4020';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 12); ctx.lineTo(0, -18);
      ctx.stroke();
      // traves dos braços
      ctx.strokeStyle = '#6b4a2a';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-14, -6); ctx.lineTo(14, -6);
      ctx.stroke();
      // braços de palha esfarrapada
      ctx.strokeStyle = '#8a5a2b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-14, -6); ctx.lineTo(-19, -2); ctx.lineTo(-17, 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(14, -6); ctx.lineTo(19, -2); ctx.lineTo(17, 2);
      ctx.stroke();
      // corpo de saco
      ctx.fillStyle = '#a8723a';
      ctx.beginPath();
      ctx.moveTo(-10, -16); ctx.lineTo(10, -16); ctx.lineTo(10, 12); ctx.lineTo(-10, 12); ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#8a5a2b';
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(-8, -12 + i * 8, 16, 1.5);
      }
      // remendo
      ctx.fillStyle = '#c9a050';
      ctx.fillRect(-6, -8, 5, 5);
      ctx.strokeStyle = '#4b3a2a';
      ctx.lineWidth = 1;
      ctx.strokeRect(-6, -8, 5, 5);
      // chapéu de palha
      ctx.fillStyle = '#c9a050';
      ctx.fillRect(-12, -18, 24, 4);
      ctx.fillStyle = '#a8723a';
      ctx.fillRect(-5, -24, 10, 8);
      // olhos e boca costurados
      ctx.fillStyle = '#4b3a2a';
      eyes(-4, -10);
      eyes(4, -10);
      ctx.fillStyle = '#4b3a2a';
      ctx.fillRect(-3, -4, 6, 1.2);
      ctx.fillRect(-3, -2.8, 6, 1.2);
      // fumaça/poeira de palha
      ctx.fillStyle = 'rgba(200,180,120,0.5)';
      ctx.beginPath(); ctx.arc(11, -12 + Math.sin(t * 5) * 2, 1.5, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(-12, -9 + Math.cos(t * 5) * 2, 1.5, 0, 6.283); ctx.fill();
    } else if (d.id === 'javali') {
      // corpo robusto
      ctx.fillStyle = dark;
      ctx.fillRect(-8, -2, 16, 10);
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.ellipse(0, 0, 13, 10, 0, 0, 6.283);
      ctx.fill();
      // pelagem rala do dorso
      ctx.strokeStyle = dark;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-8, -6); ctx.lineTo(-9, -9);
      ctx.moveTo(-4, -8); ctx.lineTo(-5, -11);
      ctx.moveTo(2, -9); ctx.lineTo(2, -12);
      ctx.moveTo(7, -8); ctx.lineTo(8, -11);
      ctx.stroke();
      // cabeça
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(11, -3, 8, 0, 6.283);
      ctx.fill();
      // focinho de javali
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.ellipse(17, 0, 4, 3.4, 0, 0, 6.283);
      ctx.fill();
      ctx.fillStyle = '#4b3a2a';
      ctx.beginPath(); ctx.arc(16.6, -0.6, 1, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(18.2, -0.6, 1, 0, 6.283); ctx.fill();
      // presas
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo(14, 3); ctx.lineTo(13, 8); ctx.lineTo(16, 4); ctx.closePath();
      ctx.fill();
      // orelhas
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.moveTo(6, -10); ctx.lineTo(5, -15); ctx.lineTo(9, -10); ctx.closePath();
      ctx.fill();
      // olho
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.arc(10, -5, 1.6, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#ff5c5c';
      ctx.beginPath(); ctx.arc(10, -5, 0.8, 0, 6.283); ctx.fill();
      // patas
      ctx.fillStyle = dark;
      ctx.fillRect(-8, 8, 3, 4);
      ctx.fillRect(-3, 9, 3, 4);
      ctx.fillRect(4, 9, 3, 4);
      ctx.fillRect(9, 8, 3, 4);
      // cauda em tufo
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-13, -1); ctx.quadraticCurveTo(-18, -4, -17, -8);
      ctx.stroke();
      ctx.fillStyle = dark;
      ctx.beginPath(); ctx.arc(-17, -9, 2, 0, 6.283); ctx.fill();
    } else if (d.id === 'aguia') {
      const fl = Math.sin(t * 16) * 0.6;
      // asas abertas
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
      // penas das pontas das asas
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(-15, -12 + fl * 12); ctx.lineTo(-19, -6 + fl * 12); ctx.lineTo(-12, -7 + fl * 12); ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(15, -12 + fl * 12); ctx.lineTo(19, -6 + fl * 12); ctx.lineTo(12, -7 + fl * 12); ctx.closePath();
      ctx.fill();
      // corpo + cabeça
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.ellipse(0, 0, 8, 6, 0, 0, 6.283);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(4, -6, 5, 0, 6.283);
      ctx.fill();
      // bico
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath();
      ctx.moveTo(8, -6); ctx.lineTo(14, -4); ctx.lineTo(8, -3); ctx.closePath();
      ctx.fill();
      // penacho
      ctx.strokeStyle = dark;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(3, -11); ctx.lineTo(4, -14);
      ctx.moveTo(5, -10); ctx.lineTo(7, -13);
      ctx.moveTo(7, -9); ctx.lineTo(10, -11);
      ctx.stroke();
      // olho afiado
      ctx.fillStyle = '#222';
      ctx.beginPath(); ctx.arc(6, -7, 1.4, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath(); ctx.arc(6, -7, 0.8, 0, 6.283); ctx.fill();
      // cauda
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.moveTo(-7, 2); ctx.lineTo(-13, 6); ctx.lineTo(-8, 6); ctx.closePath();
      ctx.fill();
    } else if (d.id === 'crocodilo') {
      // corpo alongado
      ctx.fillStyle = dark;
      ctx.fillRect(-12, 0, 24, 8);
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.ellipse(0, 2, 18, 9, 0, 0, 6.283);
      ctx.fill();
      // escamas no dorso
      ctx.fillStyle = '#2f4b2f';
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 10 - 3, -7);
        ctx.lineTo(i * 10, -11);
        ctx.lineTo(i * 10 + 3, -7);
        ctx.closePath();
        ctx.fill();
      }
      // focinho com mandíbula
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(13, -4);
      ctx.quadraticCurveTo(24, -3, 26, 2);
      ctx.quadraticCurveTo(24, 7, 12, 6);
      ctx.closePath();
      ctx.fill();
      // dentes
      ctx.fillStyle = '#fff';
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(15 + i * 3, 2, 1.4, 2);
      }
      // olhos em cúpula
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(10, -4, 2.6, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(-4, -4, 2.6, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.arc(10, -4, 1.2, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(-4, -4, 1.2, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#ff5c5c';
      ctx.beginPath(); ctx.arc(-4, -4, 0.6, 0, 6.283); ctx.fill();
      // cauda com crista
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.moveTo(-17, 4); ctx.lineTo(-24, 8); ctx.lineTo(-16, 8); ctx.closePath();
      ctx.fill();
      // patas
      ctx.fillStyle = dark;
      ctx.fillRect(-10, 9, 3, 3);
      ctx.fillRect(7, 9, 3, 3);
    } else if (d.id === 'lodo_corrupto') {
      const r = this.w / 2;
      // poça rastejante
      ctx.fillStyle = '#3a5a2f';
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.ellipse(0, r * 0.55, r * 0.9, r * 0.35, 0, 0, 6.283);
      ctx.fill();
      ctx.globalAlpha = 1;
      // corpo gosmento
      const wob = Math.sin(t * 5) * r * 0.12;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(-r, r * 0.3);
      ctx.bezierCurveTo(-r, r * 0.8, r, r * 0.8, r, r * 0.3);
      ctx.bezierCurveTo(r * 0.7, -r * 0.4 + wob * 0.4, -r * 0.7, -r * 0.4 - wob * 0.4, -r, r * 0.3);
      ctx.fill();
      // brilho tóxico
      ctx.fillStyle = '#7aff6a';
      ctx.globalAlpha = 0.5 + Math.sin(t * 6) * 0.3;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(-8 + i * 8, -6 + (i % 2) * 5, 2.5, 0, 6.283);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      // olhos amarelos injetados
      ctx.fillStyle = '#d8ff70';
      ctx.beginPath(); ctx.arc(-3, -2, 2.2, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(3, -2, 2.2, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#222';
      ctx.beginPath(); ctx.arc(-3, -2, 1, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(3, -2, 1, 0, 6.283); ctx.fill();
      // gotas escorrendo
      ctx.strokeStyle = col;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-6 + wob, r * 0.5); ctx.lineTo(-6 + wob, r * 0.75);
      ctx.moveTo(5 - wob, r * 0.5); ctx.lineTo(5 - wob, r * 0.8);
      ctx.stroke();
    } else if (d.id === 'fogo_fatuo') {
      const ph = t * 4 + this.x * 0.01;
      ctx.globalAlpha = 0.8 + Math.sin(ph) * 0.2;
      // halo espectral
      ctx.strokeStyle = 'rgba(200,255,140,0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 13 + Math.sin(ph) * 2, 0, 6.283);
      ctx.stroke();
      // corpo flutuante
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
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(-2, -4, 1.4, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(2, -4, 1.4, 0, 6.283); ctx.fill();
      // cauda de faíscas
      ctx.fillStyle = 'rgba(216,255,160,0.5)';
      for (let i = 0; i < 2; i++) {
        ctx.beginPath();
        ctx.arc(-6 - i * 4, 6 + i * 4 + Math.sin(ph + i) * 2, 1.6, 0, 6.283);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else if (d.id === 'zumbi') {
      // corpo podre
      ctx.fillStyle = dark;
      ctx.fillRect(-8, 2, 16, 8);
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(0, -6, 9, 0, 6.283);
      ctx.fill();
      // ferida exposta
      ctx.fillStyle = '#7a4a3a';
      ctx.beginPath();
      ctx.arc(4, -3, 2, 0, 6.283);
      ctx.fill();
      // olhos amarelados
      ctx.fillStyle = '#e8e07a';
      ctx.beginPath(); ctx.arc(-3, -8, 2, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(3, -8, 2, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#222';
      ctx.beginPath(); ctx.arc(-3, -8, 0.9, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(3, -8, 0.9, 0, 6.283); ctx.fill();
      // boca entreaberta
      ctx.fillStyle = '#4b3a2a';
      ctx.fillRect(-4, -3, 8, 2);
      ctx.fillStyle = '#fff';
      ctx.fillRect(-2, -2, 1.2, 1.4);
      ctx.fillRect(1, -2, 1.2, 1.4);
      // cabelo despenteado
      ctx.fillStyle = '#4b5a3a';
      ctx.beginPath();
      ctx.moveTo(-4, -16); ctx.lineTo(0, -22); ctx.lineTo(4, -16); ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#4b5a3a';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-4, -15); ctx.lineTo(-7, -19);
      ctx.moveTo(4, -15); ctx.lineTo(7, -19);
      ctx.stroke();
      // braços esticados (clássico zumbi)
      ctx.fillStyle = col;
      ctx.fillRect(-8, -2, 4, 10);
      ctx.fillRect(5, -2, 4, 10);
      ctx.fillStyle = '#6a5a3a';
      ctx.fillRect(-9, -3, 5, 2);
      ctx.fillRect(5, -3, 5, 2);
      // sangue
      ctx.fillStyle = '#a03a2a';
      ctx.beginPath(); ctx.arc(-6, 8, 1.6, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(7, 8, 1.3, 0, 6.283); ctx.fill();
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
      // penas do pescoço
      ctx.fillStyle = '#3a3a44';
      ctx.beginPath();
      ctx.arc(4, 0, 2.5, -0.8, 0.8);
      ctx.fill();
      // bico curvado
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath();
      ctx.moveTo(5, 2); ctx.lineTo(11, 3); ctx.lineTo(5, 4); ctx.closePath();
      ctx.fill();
      // olhos frios
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(-1, -1, 1.2, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(1, -1, 1.2, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#222';
      ctx.beginPath(); ctx.arc(-1, -1, 0.6, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(1, -1, 0.6, 0, 6.283); ctx.fill();
      // cauda de penas
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.moveTo(-5, 2); ctx.lineTo(-11, 6); ctx.lineTo(-6, 5); ctx.lineTo(-9, 8); ctx.lineTo(-4, 5); ctx.closePath();
      ctx.fill();
    } else if (d.id === 'necromante') {
      // aura arcanos
      ctx.strokeStyle = 'rgba(199,107,216,' + (0.25 + Math.sin(t * 3) * 0.15).toFixed(2) + ')';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, -4, 16, 0, 6.283);
      ctx.stroke();
      // manto pesado
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.moveTo(-11, 12); ctx.lineTo(-8, -6); ctx.lineTo(0, -12); ctx.lineTo(8, -6); ctx.lineTo(11, 12); ctx.closePath();
      ctx.fill();
      // túnica
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(-8, 2); ctx.lineTo(-8, -12); ctx.lineTo(8, -12); ctx.lineTo(8, 2); ctx.closePath();
      ctx.fill();
      // capuz
      ctx.fillStyle = '#7a5a6a';
      ctx.beginPath();
      ctx.moveTo(-1, -12); ctx.lineTo(1, -20); ctx.lineTo(3, -12); ctx.closePath();
      ctx.fill();
      // olhos arcanos
      ctx.fillStyle = '#c76bd8';
      ctx.beginPath(); ctx.arc(-2, -8, 1.8, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(3, -8, 1.8, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(-2, -8, 0.7, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(3, -8, 0.7, 0, 6.283); ctx.fill();
      // orbe flutuante
      const or = Math.sin(t * 4) * 1.5;
      ctx.fillStyle = '#c76bd8';
      ctx.beginPath();
      ctx.arc(6, 6 + or, 3.4, 0, 6.283);
      ctx.fill();
      ctx.fillStyle = '#f2d2ff';
      ctx.beginPath();
      ctx.arc(6, 5 + or, 1.3, 0, 6.283);
      ctx.fill();
      // ossada no peito
      ctx.fillStyle = '#e8dccb';
      ctx.fillRect(-6, 0, 12, 3);
      ctx.fillStyle = '#fff';
      ctx.fillRect(-4, 3, 2.4, 3);
      ctx.fillRect(1.6, 3, 2.4, 3);
    } else if (d.id === 'gargula') {
      const fl = Math.sin(t * 8) * 0.3;
      // asas membranosas
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
      // corpo pétreo
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(-7, 8);
      ctx.lineTo(-5, -12);
      ctx.lineTo(5, -12);
      ctx.lineTo(7, 8);
      ctx.closePath();
      ctx.fill();
      // rachaduras na pedra
      ctx.strokeStyle = 'rgba(20,20,30,0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-3, -10); ctx.lineTo(-2, -4); ctx.lineTo(-4, -1);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(3, -10); ctx.lineTo(2, -5); ctx.lineTo(4, -2);
      ctx.stroke();
      // olhos vermelhos
      ctx.fillStyle = '#ff5c5c';
      ctx.beginPath(); ctx.arc(-2, -6, 1.8, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(2, -6, 1.8, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath(); ctx.arc(-2, -6, 0.8, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(2, -6, 0.8, 0, 6.283); ctx.fill();
      // chifres de rocha
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.moveTo(-2, -12); ctx.lineTo(-5, -18); ctx.lineTo(0, -14); ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(2, -12); ctx.lineTo(5, -18); ctx.lineTo(0, -14); ctx.closePath();
      ctx.fill();
      // garra
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.moveTo(-4, 8); ctx.lineTo(-6, 14); ctx.lineTo(-3, 11); ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(4, 8); ctx.lineTo(6, 14); ctx.lineTo(3, 11); ctx.closePath();
      ctx.fill();
    } else if (d.id === 'morteiro') {
      // corpo metálico
      ctx.fillStyle = dark;
      ctx.fillRect(-9, 0, 18, 10);
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(0, -8, 9, 0, 6.283);
      ctx.fill();
      // boné da boca do canhão
      ctx.fillStyle = '#2b2b33';
      ctx.fillRect(-11, -16, 22, 3);
      ctx.fillRect(-9, -19, 18, 3);
      // olhos de alvo
      ctx.fillStyle = '#ff5c5c';
      ctx.beginPath(); ctx.arc(-2, -10, 2, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(2, -10, 2, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(-2, -10, 0.9, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(2, -10, 0.9, 0, 6.283); ctx.fill();
      // boca do canhão
      ctx.fillStyle = '#1a1a22';
      ctx.beginPath();
      ctx.ellipse(0, -8, 3.4, 2, 0, 0, 6.283);
      ctx.fill();
      // munição flamejante
      ctx.fillStyle = '#ffb020';
      ctx.beginPath();
      ctx.arc(7, -16, 3, 0, 6.283);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(7, -16, 1.4, 0, 6.283); ctx.fill();
      // pernas de tripé
      ctx.fillStyle = '#c8c0a8';
      ctx.fillRect(6, -12, 3, 20);
      ctx.fillStyle = '#9a8f7a';
      ctx.fillRect(6, 4, 3, 3);
      ctx.fillStyle = '#2b2b33';
      ctx.fillRect(-10, 10, 4, 4);
      ctx.fillRect(6, 10, 4, 4);
      // rebites
      ctx.fillStyle = '#2b2b33';
      ctx.fillRect(-7, -4, 2, 2);
      ctx.fillRect(5, -4, 2, 2);
    } else if (d.id === 'mumia') {
      // corpo enfaixado
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.arc(0, -6, 8, 0, 6.283);
      ctx.fill();
      ctx.fillRect(-7, 0, 14, 12);
      // bandagens
      ctx.fillStyle = '#e8e0c8';
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(-7, 2 + i * 4, 14, 2);
      }
      ctx.fillStyle = '#c8bda0';
      ctx.fillRect(-8, -2, 4, 6);
      ctx.fillRect(4, -2, 4, 6);
      ctx.fillRect(-7, 12, 5, 2);
      ctx.fillRect(2, 12, 5, 2);
      // bandagem solta na cabeça
      ctx.fillStyle = '#e8e0c8';
      ctx.beginPath();
      ctx.moveTo(5, -12); ctx.lineTo(9, -18); ctx.lineTo(7, -10); ctx.closePath();
      ctx.fill();
      // olhos vazados
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.arc(-2, -7, 1.8, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(2, -7, 1.8, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#c76bd8';
      ctx.globalAlpha = 0.6 + Math.sin(t * 4) * 0.3;
      ctx.beginPath(); ctx.arc(-2, -7, 0.9, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(2, -7, 0.9, 0, 6.283); ctx.fill();
      ctx.globalAlpha = 1;
      // poeira antiga
      ctx.fillStyle = 'rgba(230,220,180,0.5)';
      ctx.beginPath(); ctx.arc(6, 8, 1.4, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(-6, 9, 1.1, 0, 6.283); ctx.fill();
    } else if (d.id === 'minotauro') {
      // corpo de touro
      ctx.fillStyle = dark;
      ctx.fillRect(-9, -2, 18, 12);
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(0, -8, 11, 0, 6.283);
      ctx.fill();
      // pelagem
      ctx.fillStyle = '#8a5a2b';
      ctx.beginPath();
      ctx.arc(0, -13, 8, 0, 6.283);
      ctx.fill();
      // focinho bovino
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.ellipse(0, -17, 4.5, 3, 0, 0, 6.283);
      ctx.fill();
      ctx.fillStyle = '#4b3a2a';
      ctx.beginPath(); ctx.arc(-1.4, -17, 0.9, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(1.4, -17, 0.9, 0, 6.283); ctx.fill();
      // olhos em fúria
      ctx.fillStyle = '#ff5c5c';
      ctx.beginPath(); ctx.arc(-3, -10, 2.2, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(3, -10, 2.2, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#222';
      ctx.beginPath(); ctx.arc(-3, -10, 1, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(3, -10, 1, 0, 6.283); ctx.fill();
      // narinas bufando
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath(); ctx.arc(-1, -19, 1.4, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(1, -19, 1.4, 0, 6.283); ctx.fill();
      // chifres grandes
      ctx.fillStyle = '#5f352b';
      ctx.beginPath();
      ctx.moveTo(-8, -11); ctx.lineTo(-6, -22); ctx.lineTo(-1, -12); ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(8, -11); ctx.lineTo(6, -22); ctx.lineTo(1, -12); ctx.closePath();
      ctx.fill();
      // anel no nariz
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath();
      ctx.arc(0, -15, 2.2, 0, 6.283);
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // machado
      ctx.fillStyle = '#8a8a96';
      ctx.fillRect(12, -6, 4, 16);
      ctx.beginPath();
      ctx.moveTo(12, -6); ctx.lineTo(20, -8); ctx.lineTo(12, 2); ctx.closePath();
      ctx.fill();
    } else if (d.id === 'demoninho') {
      // asinhas de morcego
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.moveTo(-5, -4); ctx.lineTo(-12, -8 + Math.sin(t * 8) * 2); ctx.lineTo(-6, 0); ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(5, -4); ctx.lineTo(12, -8 + Math.cos(t * 8) * 2); ctx.lineTo(6, 0); ctx.closePath();
      ctx.fill();
      // corpo
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.moveTo(-10, 8); ctx.lineTo(-7, -4); ctx.lineTo(0, -10); ctx.lineTo(7, -4); ctx.lineTo(10, 8); ctx.closePath();
      ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(0, -2, 8, 0, 6.283);
      ctx.fill();
      // chifrinhos
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath();
      ctx.moveTo(-5, -9); ctx.lineTo(-3, -16); ctx.lineTo(1, -9); ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(5, -9); ctx.lineTo(3, -16); ctx.lineTo(-1, -9); ctx.closePath();
      ctx.fill();
      // olhos brilhantes
      ctx.fillStyle = '#ff5c5c';
      ctx.beginPath(); ctx.arc(-2, -4, 1.8, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(2, -4, 1.8, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath(); ctx.arc(-2, -4, 0.8, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(2, -4, 0.8, 0, 6.283); ctx.fill();
      // presas
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo(-1.6, -1); ctx.lineTo(-2.4, 2); ctx.lineTo(-0.4, 0.4); ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(1.6, -1); ctx.lineTo(2.4, 2); ctx.lineTo(0.4, 0.4); ctx.closePath();
      ctx.fill();
      // cauda com ponta
      ctx.strokeStyle = dark;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, 5); ctx.quadraticCurveTo(2, 8, 0, 12); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, 6); ctx.quadraticCurveTo(-3, 9, 0, 11); ctx.stroke();
      ctx.fillStyle = '#ff5c5c';
      ctx.beginPath(); ctx.arc(0, 12, 1.6, 0, 6.283); ctx.fill();
    } else if (d.id === 'soldado_leal') {
      // capacete com crista
      ctx.fillStyle = '#8a8a96';
      ctx.beginPath();
      ctx.arc(0, -9, 10, 0, 6.283);
      ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(0, -8, 8, 0, 6.283);
      ctx.fill();
      // viseira
      ctx.fillStyle = '#2a2a35';
      ctx.beginPath();
      ctx.ellipse(0, -7, 6.5, 3.4, 0, 0, 6.283);
      ctx.fill();
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath(); ctx.arc(-2, -7, 1, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(2, -7, 1, 0, 6.283); ctx.fill();
      // crista vermelha
      ctx.fillStyle = '#c0392b';
      ctx.beginPath();
      ctx.moveTo(0, -17); ctx.quadraticCurveTo(4, -22, 1, -24); ctx.quadraticCurveTo(0, -20, -4, -22); ctx.quadraticCurveTo(-2, -17, 0, -16);
      ctx.fill();
      // peitoral
      ctx.fillStyle = '#4a4a55';
      ctx.fillRect(-11, 0, 22, 12);
      ctx.beginPath();
      ctx.moveTo(-11, 0); ctx.lineTo(-13, -4); ctx.lineTo(13, -4); ctx.lineTo(11, 0); ctx.closePath();
      ctx.fill();
      // brasão
      ctx.fillStyle = '#c0392b';
      ctx.beginPath();
      ctx.moveTo(0, 4); ctx.lineTo(-3, 8); ctx.lineTo(3, 8); ctx.closePath();
      ctx.fill();
      // espada longa
      ctx.fillStyle = '#b5651d';
      ctx.fillRect(8, -12, 3, 20);
      ctx.fillStyle = '#d0d0dc';
      ctx.fillRect(9, -18, 1.6, 12);
      ctx.fillStyle = '#ffd23f';
      ctx.fillRect(7, -16, 5, 2);
    } else if (d.id === 'guarda_arquebus') {
      // morrião + capa
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(0, -8, 8, 0, 6.283);
      ctx.fill();
      ctx.fillStyle = dark;
      ctx.fillRect(-7, -3, 14, 10);
      // morrião de aço
      ctx.fillStyle = '#6a6a76';
      ctx.beginPath();
      ctx.arc(0, -10, 8.5, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(-8.5, -10, 17, 2);
      ctx.fillStyle = '#4a4a55';
      ctx.fillRect(-9, -13, 18, 3);
      ctx.fillRect(-6, -16, 12, 3);
      // viseira
      ctx.fillStyle = '#2a2a35';
      ctx.fillRect(-5, -8, 10, 2);
      ctx.fillStyle = '#ff5c5c';
      ctx.beginPath(); ctx.arc(-2, -9, 1.2, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(2, -9, 1.2, 0, 6.283); ctx.fill();
      // arquebus
      ctx.fillStyle = '#8a5a2b';
      ctx.fillRect(7, -2, 14, 4);
      ctx.fillStyle = '#222';
      ctx.fillRect(7, 2, 14, 3);
      ctx.fillStyle = '#6a6a76';
      ctx.fillRect(19, -4, 3, 8);
      // faísca na mecha
      ctx.fillStyle = '#ffb020';
      ctx.globalAlpha = 0.5 + Math.sin(t * 10) * 0.3;
      ctx.beginPath(); ctx.arc(12, -3, 1.6, 0, 6.283); ctx.fill();
      ctx.globalAlpha = 1;
      // coldre
      ctx.fillStyle = '#5a3a2a';
      ctx.fillRect(-10, 6, 4, 8);
      ctx.fillStyle = '#ffd23f';
      ctx.fillRect(-10, 4, 4, 2);
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
      // corpo de frasco redondo
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.ellipse(0, 2, 11, 9, 0, 0, 6.283);
      ctx.fill();
      // líquido interior
      ctx.fillStyle = '#7ae0a0';
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.ellipse(0, 3, 9, 6, 0, 0, 6.283);
      ctx.fill();
      ctx.globalAlpha = 1;
      // tampão de cortiça
      ctx.fillStyle = '#a8723a';
      ctx.fillRect(-4, -6, 8, 4);
      ctx.fillStyle = '#8a5a2b';
      ctx.fillRect(-3, -7, 6, 2);
      // olhos grandes de experimento
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(-3, -8, 2, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(3, -8, 2, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#4b3a2a';
      ctx.beginPath(); ctx.arc(-3, -8, 1, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(3, -8, 1, 0, 6.283); ctx.fill();
      // bolhas subindo
      ctx.strokeStyle = 'rgba(122,224,160,0.6)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 2; i++) {
        const by = 6 - ((t * 2 + i * 6) % 12);
        ctx.beginPath();
        ctx.arc(-3 + i * 6, by, 1.4, 0, 6.283);
        ctx.stroke();
      }
      // membros
      ctx.fillStyle = dark;
      ctx.fillRect(-2, 8, 4, 3);
      ctx.fillRect(-4, 10, 3, 2);
      ctx.fillRect(1, 10, 3, 2);
    } else if (d.id === 'lobisomem') {
      // corpo coberto de pelos
      ctx.fillStyle = dark;
      ctx.fillRect(-10, -4, 20, 12);
      ctx.strokeStyle = dark;
      ctx.lineWidth = 1.5;
      for (let i = -8; i <= 8; i += 4) {
        ctx.beginPath();
        ctx.moveTo(i, 4); ctx.lineTo(i + 2, 10);
        ctx.stroke();
      }
      // cabeça
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(0, -10, 11, 0, 6.283);
      ctx.fill();
      // focinho alongado
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.ellipse(0, -6, 7, 5, 0, 0, 6.283);
      ctx.fill();
      // orelhas peludas
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo(-11, -17); ctx.lineTo(-13, -24); ctx.lineTo(-6, -18); ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(11, -17); ctx.lineTo(13, -24); ctx.lineTo(6, -18); ctx.closePath();
      ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(-10, -17); ctx.lineTo(-11, -22); ctx.lineTo(-7, -18); ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(10, -17); ctx.lineTo(11, -22); ctx.lineTo(7, -18); ctx.closePath();
      ctx.fill();
      // olhos famintos
      ctx.fillStyle = '#ff5c5c';
      ctx.beginPath(); ctx.arc(-3, -12, 2, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(3, -12, 2, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(-3.4, -12.4, 0.8, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(2.6, -12.4, 0.8, 0, 6.283); ctx.fill();
      // nariz
      ctx.fillStyle = '#222';
      ctx.beginPath(); ctx.arc(0, -8, 1.6, 0, 6.283); ctx.fill();
      // presas
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo(-2, -8); ctx.lineTo(-4, -3); ctx.lineTo(0, -6); ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(2, -8); ctx.lineTo(4, -3); ctx.lineTo(0, -6); ctx.closePath();
      ctx.fill();
      // garras
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo(-11, -6); ctx.lineTo(-19, 4); ctx.lineTo(-9, 0); ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(11, -6); ctx.lineTo(19, 4); ctx.lineTo(9, 0); ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#6a5a5a';
      ctx.fillRect(-18, 3, 2, 3);
      ctx.fillRect(16, 3, 2, 3);
    } else if (d.id === 'gigante_pedra') {
      // silhueta colossal
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.moveTo(-26, 14); ctx.lineTo(-18, -16); ctx.lineTo(0, -24); ctx.lineTo(18, -16); ctx.lineTo(26, 14); ctx.closePath();
      ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(-16, 8); ctx.lineTo(-10, -12); ctx.lineTo(0, -18); ctx.lineTo(12, -8); ctx.lineTo(16, 8); ctx.closePath();
      ctx.fill();
      // rachaduras de pedra
      ctx.strokeStyle = 'rgba(20,20,30,0.4)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-6, -12); ctx.lineTo(-5, -6); ctx.lineTo(-8, 0);
      ctx.moveTo(6, -11); ctx.lineTo(5, -5); ctx.lineTo(8, 1);
      ctx.moveTo(0, -17); ctx.lineTo(0, -8);
      ctx.stroke();
      // musgo
      ctx.fillStyle = 'rgba(100,160,90,0.5)';
      ctx.beginPath(); ctx.arc(-12, -2, 3, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(14, 2, 2.5, 0, 6.283); ctx.fill();
      // olhos de brasa
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath(); ctx.arc(-5, -10, 3, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(5, -10, 3, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#ff5c5c';
      ctx.beginPath(); ctx.arc(-5, -10, 1.4, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(5, -10, 1.4, 0, 6.283); ctx.fill();
      // braços de rocha
      ctx.fillStyle = dark;
      ctx.fillRect(-16, 6, 8, 10);
      ctx.fillRect(8, 6, 8, 10);
      ctx.fillStyle = col;
      ctx.fillRect(-15, 7, 6, 6);
      ctx.fillRect(9, 7, 6, 6);
      // tremedeira de terra
      ctx.fillStyle = '#5a3a2a';
      ctx.fillRect(-2, 14, 4, 4);
      ctx.fillStyle = '#6a4a3a';
      ctx.fillRect(-1, 16, 2, 3);
    } else if (d.id === 'sacerdote_necro') {
      // manto cerimonial
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.moveTo(-13, 12); ctx.lineTo(-9, -8); ctx.lineTo(0, -14); ctx.lineTo(9, -8); ctx.lineTo(13, 12); ctx.closePath();
      ctx.fill();
      ctx.fillStyle = col;
      ctx.fillRect(-9, 0, 18, 18);
      // gola alta
      ctx.fillStyle = '#3a2f4b';
      ctx.fillRect(-9, -2, 18, 6);
      // estrela de cinco pontas no capuz
      ctx.fillStyle = '#c76bd8';
      ctx.globalAlpha = 0.5 + Math.sin(t * 3) * 0.3;
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
      ctx.globalAlpha = 1;
      // olhos arcanos
      ctx.fillStyle = '#b8a0d8';
      ctx.beginPath(); ctx.arc(-2, -6, 1.8, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(2, -6, 1.8, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(-2, -6, 0.7, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(2, -6, 0.7, 0, 6.283); ctx.fill();
      // runas no manto
      ctx.strokeStyle = 'rgba(199,107,216,0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-5, 4); ctx.lineTo(-3, 4); ctx.lineTo(-4, 7);
      ctx.moveTo(5, 4); ctx.lineTo(3, 4); ctx.lineTo(4, 7);
      ctx.stroke();
      // orbe central
      const or2 = Math.sin(t * 4) * 1.5;
      ctx.fillStyle = '#c76bd8';
      ctx.beginPath();
      ctx.arc(0, 14 + or2, 3.4, 0, 6.283);
      ctx.fill();
      ctx.fillStyle = '#f2d2ff';
      ctx.beginPath();
      ctx.arc(0, 13 + or2, 1.3, 0, 6.283);
      ctx.fill();
    } else if (d.id === 'dragao_bebe') {
      const fl = Math.sin(t * 12) * 0.5;
      // asinhas
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
      // corpo
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.ellipse(0, 0, 11, 9, 0, 0, 6.283);
      ctx.fill();
      // barriguinha clara
      ctx.fillStyle = '#e8c8a0';
      ctx.beginPath();
      ctx.ellipse(0, 3, 6, 5, 0, 0, 6.283);
      ctx.fill();
      // olhos arregalados
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath(); ctx.arc(-4, -4, 2, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(4, -4, 2, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#222';
      ctx.beginPath(); ctx.arc(-4, -4, 0.9, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(4, -4, 0.9, 0, 6.283); ctx.fill();
      // focinho com narinas
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.ellipse(9, 0, 5, 3.4, 0.2, 0, 6.283);
      ctx.fill();
      ctx.fillStyle = '#222';
      ctx.beginPath(); ctx.arc(12, -1, 0.7, 0, 6.283); ctx.fill();
      // dente de leite
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo(10, 4); ctx.lineTo(14, 8); ctx.lineTo(9, 7); ctx.closePath();
      ctx.fill();
      // chifrinhos
      ctx.fillStyle = '#8a8a96';
      ctx.beginPath();
      ctx.moveTo(-2, -11); ctx.lineTo(-4, -18); ctx.lineTo(1, -12); ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(2, -11); ctx.lineTo(4, -18); ctx.lineTo(-1, -12); ctx.closePath();
      ctx.fill();
      // fumaça das narinas
      ctx.fillStyle = 'rgba(255,200,140,0.4)';
      ctx.beginPath(); ctx.arc(12, -3 + Math.sin(t * 3) * 1, 1.6, 0, 6.283); ctx.fill();
      // cauda
      ctx.strokeStyle = col;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(-10, 3); ctx.quadraticCurveTo(-15, 6, -14, 10);
      ctx.stroke();
      ctx.fillStyle = dark;
      ctx.beginPath(); ctx.arc(-14, 11, 2, 0, 6.283); ctx.fill();
      // patinhas
      ctx.fillStyle = dark;
      ctx.fillRect(-6, 8, 2.4, 3);
      ctx.fillRect(4, 8, 2.4, 3);
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

    // Congelado (Batismo): camada de gelo translúcida, brilho azulado e cristais.
    if (this.frozenT > 0) {
      ctx.globalAlpha = 0.4 + Math.sin(t * 6) * 0.06;
      ctx.fillStyle = '#aee8ff';
      ctx.beginPath();
      ctx.arc(0, -2, this.w * 0.72, 0, 6.283);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#0f3b55';
      ctx.strokeStyle = '#d8f4ff';
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 5; i++) {
        const a = Math.floor(t * 8 + i * 1.25) * 0.9;
        const cx = Math.cos(a) * this.w * 0.3;
        const cy = Math.sin(a) * this.w * 0.3 - 2;
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.moveTo(cx, cy - 4);
        ctx.lineTo(cx + 1.8, cy - 1);
        ctx.lineTo(cx, cy + 4);
        ctx.lineTo(cx - 1.8, cy - 1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = '#bfe8ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, -2, this.w * 0.72 + 2, Math.PI * 0.9, Math.PI * 2.1);
      ctx.stroke();
      ctx.globalAlpha = 1;
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

