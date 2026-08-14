export const render = {
  render() {
    const ctx = this.ctx;
    const t = this.time;
    ctx.save();

    if (this.shake > 0.5) {
      ctx.translate((Math.random() * 2 - 1) * this.shake, (Math.random() * 2 - 1) * this.shake);
    }

    const sky = ctx.createLinearGradient(0, 0, 0, this.ch);
    sky.addColorStop(0, '#2b3a55');
    sky.addColorStop(0.6, '#5b7aa8');
    sky.addColorStop(1, '#88a9c9');
    ctx.fillStyle = sky;
    ctx.fillRect(-20, -20, this.cw + 40, this.ch + 40);

    ctx.fillStyle = 'rgba(255,233,176,0.9)';
    ctx.beginPath();
    ctx.arc(this.cw - 120, 90, 40, 0, 6.283);
    ctx.fill();

    ctx.fillStyle = '#3a5070';
    const mo = Math.round(this.cam.x * 0.2);
    for (let i = -1; i < 4; i++) {
      const bx = i * 800 - mo % 800;
      ctx.beginPath();
      ctx.moveTo(bx, this.ch);
      ctx.lineTo(bx + 180, this.ch - 180 - Math.sin(t * 0.1 + i) * 8);
      ctx.lineTo(bx + 340, this.ch - 240);
      ctx.lineTo(bx + 520, this.ch - 160);
      ctx.lineTo(bx + 650, this.ch);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    for (let i = 0; i < 3; i++) {
      const cx = ((i * 430 + t * 6 - this.cam.x * 0.4) % (this.cw + 500) + this.cw + 500) % (this.cw + 500) - 200;
      const cy = 60 + i * 46;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 55, 18, 0, 0, 6.283);
      ctx.ellipse(cx + 34, cy + 4, 38, 14, 0, 0, 6.283);
      ctx.fill();
    }

    ctx.save();
    ctx.translate(-Math.round(this.cam.x), -Math.round(this.cam.y));
    this.world.draw(ctx, this.cam, t);

    const inCave = this.indoorNames[this.zoneTitle];
    if (inCave) {
      ctx.fillStyle = 'rgba(8,10,18,0.30)';
      ctx.fillRect(this.cam.x, this.cam.y, this.cw, this.ch);
    }

    for (const pk of this.pickups) pk.draw(ctx, t);
    for (const n of this.npcs) this.drawNPC(ctx, n, t);
    for (const m of this.monsters) m.draw(ctx, t);
    if (this.player) this.player.draw(ctx, t);
    for (const pr of this.projectiles) pr.draw(ctx);
    for (const r of this.rings) r.draw(ctx);
    for (const pa of this.particles) pa.draw(ctx);
    for (const tx of this.texts) tx.draw(ctx);

    if (this.mouseActive) {
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(this.aim.x, this.aim.y, 8, 0, 6.283);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(this.aim.x - 12, this.aim.y);
      ctx.lineTo(this.aim.x - 4, this.aim.y);
      ctx.moveTo(this.aim.x + 4, this.aim.y);
      ctx.lineTo(this.aim.x + 12, this.aim.y);
      ctx.moveTo(this.aim.x, this.aim.y - 12);
      ctx.lineTo(this.aim.x, this.aim.y - 4);
      ctx.moveTo(this.aim.x, this.aim.y + 4);
      ctx.lineTo(this.aim.x, this.aim.y + 12);
      ctx.stroke();
    }

    ctx.restore();

    const vig = ctx.createRadialGradient(this.cw / 2, this.ch / 2, this.ch * 0.45, this.cw / 2, this.ch / 2, this.ch * 0.95);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.42)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, this.cw, this.ch);

    if (this.redFlash > 0) {
      ctx.fillStyle = 'rgba(255,40,40,' + (this.redFlash * 0.35).toFixed(3) + ')';
      ctx.fillRect(0, 0, this.cw, this.ch);
    }

    ctx.restore();
  },

  drawNPC(ctx, n, t) {
    const bob = Math.sin(n.bobT * 2) * 2;
    ctx.save();
    ctx.translate(n.px, n.py + bob);
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(0, 20, 14, 5, 0, 0, 6.283);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.fillStyle = n.color;
    ctx.beginPath();
    ctx.arc(0, 0, 13, 0, 6.283);
    ctx.fill();
    ctx.fillStyle = '#e8e8e8';
    ctx.beginPath();
    ctx.arc(0, -18, 9, 0, 6.283);
    ctx.fill();

    if (n.kind === 'forge') {
      ctx.fillStyle = n.accent;
      ctx.fillRect(-6, -26, 12, 5);
      ctx.fillRect(-8, -29, 16, 4);
    } else if (n.kind === 'shop') {
      ctx.fillStyle = n.accent;
      ctx.beginPath();
      ctx.arc(0, -27, 7, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(-7, -26, 14, 3);
    } else if (n.kind === 'skills') {
      ctx.fillStyle = n.accent;
      ctx.beginPath();
      ctx.moveTo(0, -32);
      ctx.lineTo(9, -18);
      ctx.lineTo(-9, -18);
      ctx.closePath();
      ctx.fill();
    } else if (n.kind === 'guide') {
      ctx.fillStyle = n.accent;
      ctx.beginPath();
      ctx.arc(0, -28, 6, 0, 6.283);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillRect(-1, -31, 2, 6);
    } else if (n.kind === 'church') {
      ctx.fillStyle = '#fff3b0';
      ctx.beginPath();
      ctx.moveTo(0, -30);
      ctx.lineTo(-8, -16);
      ctx.lineTo(8, -16);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#c9a227';
      ctx.fillRect(-2, -20, 4, 10);
    } else if (n.kind === 'tavern') {
      ctx.fillStyle = '#a8823f';
      ctx.beginPath();
      ctx.arc(0, -26, 8, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(-8, -25, 16, 4);
      ctx.fillStyle = '#ffd23f';
      ctx.fillRect(-3, -18, 6, 6);
    } else if (n.kind === 'tower') {
      ctx.fillStyle = '#7a6bd8';
      ctx.fillRect(-4, -28, 8, 12);
      ctx.fillStyle = '#c0b4ff';
      ctx.beginPath();
      ctx.arc(0, -32, 5, 0, 6.283);
      ctx.fill();
    } else if (n.kind === 'seal') {
      const ph = t * 3 + n.px * 0.01;
      ctx.globalAlpha = 0.5 + Math.sin(ph) * 0.3;
      ctx.fillStyle = n.accent || '#b05cff';
      ctx.beginPath();
      ctx.arc(0, -20, 10 + Math.sin(ph * 2) * 3, 0, 6.283);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = n.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, -20, 14, 0, 6.283);
      ctx.stroke();
    } else if (n.kind === 'talk') {
      ctx.fillStyle = n.accent;
      ctx.beginPath();
      ctx.arc(0, -26, 6, 0, 6.283);
      ctx.fill();
    } else if (n.kind === 'pope') {
      // O Papa: auréola dourada pulsante e tiara tripla branca.
      const ph = t * 3;
      ctx.globalAlpha = 0.55 + Math.sin(ph) * 0.3;
      ctx.strokeStyle = '#ffd23f';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, -18, 17 + Math.sin(ph * 2) * 2, 0, 6.283);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo(0, -40);
      ctx.lineTo(-9, -28);
      ctx.lineTo(9, -28);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#c9a227';
      ctx.fillRect(-7, -27, 14, 3);
      ctx.fillRect(-10, -24, 20, 3);
    } else {
      ctx.fillStyle = n.accent;
      ctx.beginPath();
      ctx.moveTo(0, -32);
      ctx.lineTo(9, -18);
      ctx.lineTo(-9, -18);
      ctx.closePath();
      ctx.fill();
    }

    // Confession indicator for Clero NPCs
    if (n.confessed && this.player && this.player.sub.casta === 'clero') {
      ctx.fillStyle = '#fff3b0';
      ctx.globalAlpha = 0.7 + Math.sin(t * 5) * 0.3;
      ctx.beginPath();
      ctx.moveTo(0, -38);
      ctx.lineTo(-6, -30);
      ctx.lineTo(6, -30);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(-3, -18, 1.8, 0, 6.283);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(3, -18, 1.8, 0, 6.283);
    ctx.fill();

    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.font = '700 11px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(n.name, 0, 34);
    ctx.restore();
  },

};
