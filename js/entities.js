class Player {
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

    if (g.mouseActive) {
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
      ctx.fillStyle = this.weapon.color;
      ctx.fillRect(8, -2, s.attack.range - 12, 4);
      ctx.fillStyle = '#d9a441';
      ctx.fillRect(4, -4, 7, 8);
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

class Monster {
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
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.moveTo(-22, 10); ctx.lineTo(-18, -8); ctx.lineTo(-8, -16); ctx.lineTo(0, -20);
      ctx.lineTo(8, -16); ctx.lineTo(18, -8); ctx.lineTo(22, 10); ctx.lineTo(14, 4);
      ctx.lineTo(6, 14); ctx.lineTo(-6, 14); ctx.lineTo(-14, 4); ctx.closePath();
      ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(0, -10, 10, 0, 6.283);
      ctx.fill();
      ctx.fillStyle = dark;
      ctx.fillRect(-8, -2, 16, 16);
      for (let i = -1; i <= 1; i++) {
        ctx.fillStyle = col;
        ctx.fillRect(i * 5 - 1.5, -2, 3, 16);
      }
      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.arc(-3, -12, 2, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(3, -12, 2, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#c0392b';
      ctx.beginPath();
      ctx.moveTo(-5, -21); ctx.lineTo(0, -30); ctx.lineTo(5, -21); ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath();
      ctx.arc(0, -32, 2, 0, 6.283); ctx.fill();
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
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(-22, 10); ctx.lineTo(-16, -14); ctx.lineTo(0, -22); ctx.lineTo(16, -14); ctx.lineTo(22, 10); ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#4a1f1f';
      ctx.beginPath();
      ctx.moveTo(-12, 4); ctx.lineTo(-6, -12); ctx.lineTo(2, -14); ctx.lineTo(8, -6); ctx.lineTo(2, 8); ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ff9d4a';
      ctx.fillRect(-4, -18, 8, 4);
      ctx.fillStyle = '#ff5c5c';
      ctx.beginPath(); ctx.arc(-6, -12, 3.4, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(6, -12, 3.4, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.arc(-6, -12, 1.5, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(6, -12, 1.5, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo(-7, -8); ctx.lineTo(-10, -2); ctx.lineTo(-4, -5); ctx.closePath();
      ctx.moveTo(7, -8); ctx.lineTo(10, -2); ctx.lineTo(4, -5); ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#7a2f2f';
      ctx.beginPath();
      ctx.moveTo(-2, -20); ctx.lineTo(-6, -32); ctx.lineTo(1, -24); ctx.closePath();
      ctx.moveTo(2, -20); ctx.lineTo(6, -32); ctx.lineTo(-1, -24); ctx.closePath();
      ctx.fill();
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

class Projectile {
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
        if (!this.pierce) this.dead = true;
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

class Particle {
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

class FloatText {
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

class Ring {
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

class Pickup {
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

    // Atração magnética: dentro de um raio ampliado, o item é puxado para o jogador.
    const magnet = 96;                 // raio de atração ao redor do jogador
    const pickupR = this.radius() + p.w / 2 + 6;
    if (d < magnet && d > pickupR) {
      const pull = 1 - d / magnet;     // 0 longe, 1 perto
      const ang = Math.atan2(p.y - this.y, p.x - this.x);
      const sp = 260 * pull + 140;
      this.x += Math.cos(ang) * sp * dt;
      this.y += Math.sin(ang) * sp * dt;
      // pequena faísca de magnet
      if (Math.random() < 0.18) {
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
