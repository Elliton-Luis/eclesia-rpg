import { TILE } from '../data/constants.js';

// Ajusta o brilho de uma cor hex (negativo escurece). Falha → cinza neutro.
const darken = (hex, d) => {
  const m = /^#([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(String(hex || ''));
  if (!m) return '#3a3a44';
  let h = m[1];
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const n = parseInt(h, 16);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + d));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + d));
  const b = Math.max(0, Math.min(255, (n & 255) + d));
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
};

const SKIN = '#e9c29b';
const HAIR = '#4a3a30';

// Túnica A-line (mesma gramática do sprite do jogador), sombreada num lado.
const drawTunic = (ctx, color, shade, fy, w) => {
  w = w || 9;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-w + 1, fy - 18);
  ctx.lineTo(-w - 1, fy - 2);
  ctx.quadraticCurveTo(0, fy, w + 1, fy - 2);
  ctx.lineTo(w - 1, fy - 18);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = shade;
  ctx.beginPath();
  ctx.moveTo(-w + 1, fy - 18);
  ctx.lineTo(-w - 1, fy - 2);
  ctx.quadraticCurveTo(0, fy, 0, fy - 1);
  ctx.lineTo(0, fy - 18);
  ctx.closePath();
  ctx.fill();
};

// Pernas e botas simples (cobertas em grande parte pelo corpo).
const drawLegs = (ctx, fy) => {
  ctx.fillStyle = '#2b2b33';
  ctx.fillRect(-8.6, fy - 6, 4.6, 5);
  ctx.fillRect(4, fy - 6, 4.6, 5);
  ctx.fillStyle = '#4a4438';
  ctx.fillRect(-8.6, fy - 1.6, 4.6, 2.6);
  ctx.fillRect(4, fy - 1.6, 4.6, 2.6);
};

// Rosto comum: pele + dois olhos.
const drawFace = (ctx, fy) => {
  ctx.fillStyle = SKIN;
  ctx.beginPath();
  ctx.arc(0, fy - 30, 5.2, 0, 6.283);
  ctx.fill();
  ctx.fillStyle = '#222';
  ctx.beginPath();
  ctx.arc(-3, fy - 30, 1.8, 0, 6.283);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(3, fy - 30, 1.8, 0, 6.283);
  ctx.fill();
};

// Barba rala em torno do queixo.
const drawBeard = (ctx, fy, color) => {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(0, fy - 27.4, 4.2, 1.2, 0, 0, 6.283);
  ctx.fill();
  ctx.fillRect(-3.6, fy - 26.8, 7.2, 1.8);
};

export const render = {
  render() {
    const ctx = this.ctx;
    const t = this.time;
    const cam = this.cam;
    ctx.save();

    if (this.shake > 0.5) {
      ctx.translate((Math.random() * 2 - 1) * this.shake, (Math.random() * 2 - 1) * this.shake);
    }

    // Gradiente do céu cacheado (não recriado por frame; só quando a tela muda).
    let sky = this._skyGrad;
    if (!sky || this._skyH !== this.ch) {
      sky = ctx.createLinearGradient(0, 0, 0, this.ch);
      sky.addColorStop(0, '#2b3a55');
      sky.addColorStop(0.6, '#5b7aa8');
      sky.addColorStop(1, '#88a9c9');
      this._skyGrad = sky;
      this._skyH = this.ch;
    }
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
    ctx.translate(-Math.round(cam.x), -Math.round(cam.y));
    this.world.draw(ctx, cam, t);

    // Aura da Igreja Central: círculo estático único ao redor da cidade,
    // desenhado uma vez por frame (sem os anéis animados que travavam o jogo).
    // Só desenha quando o círculo está (ao menos em parte) na tela.
    if (this.churchRing) {
      const cx = 118 * TILE, cy = 120 * TILE, cr = 660;
      if (cx + cr >= cam.x && cx - cr <= cam.x + this.cw && cy + cr >= cam.y && cy - cr <= cam.y + this.ch) {
        ctx.fillStyle = 'rgba(255,255,0,0.05)';
        ctx.beginPath();
        ctx.arc(cx, cy, 640, 0, 6.283);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,0,0.45)';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([10, 8]);
        ctx.beginPath();
        ctx.arc(cx, cy, 640, 0, 6.283);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.strokeStyle = 'rgba(255,255,0,0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, 660, 0, 6.283);
        ctx.stroke();

        // Cruz central da igreja — o motivo da proteção, ao lado do Bispo Cedric (119,119)
        const bx = 120 * TILE, by = 120 * TILE;
        const glow = ctx.createRadialGradient(bx, by, 4, bx, by, 48);
        glow.addColorStop(0, 'rgba(255,230,120,0.35)');
        glow.addColorStop(1, 'rgba(255,230,120,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(bx, by, 48, 0, 6.283);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,236,160,0.92)';
        ctx.strokeStyle = 'rgba(120,90,20,0.6)';
        ctx.lineWidth = 2;
        ctx.fillRect(bx - 4, by - 26, 8, 52);
        ctx.strokeRect(bx - 4, by - 26, 8, 52);
        ctx.fillRect(bx - 18, by - 12, 36, 8);
        ctx.strokeRect(bx - 18, by - 12, 36, 8);
      }
    }

    const inCave = this.indoorNames[this.zoneTitle];
    if (inCave) {
      ctx.fillStyle = 'rgba(8,10,18,0.30)';
      ctx.fillRect(cam.x, cam.y, this.cw, this.ch);
    }

    // Culling por viewport: só desenha entidades visíveis (com margem de 64px
    // para evitar pop-in nas bordas). A atualização/lógica continua rodando para
    // todas as entidades — apenas o custo de desenho fora da tela é evitado.
    const vx = cam.x - 64, vy = cam.y - 64, vw = this.cw + 128, vh = this.ch + 128;
    const vis = (x, y, pad) => x + pad >= vx && x - pad <= vx + vw && y + pad >= vy && y - pad <= vy + vh;
    for (const pk of this.pickups) if (vis(pk.x, pk.y, 20)) pk.draw(ctx, t);
    for (const n of this.npcs) if (vis(n.px, n.py, 38)) this.drawNPC(ctx, n, t);
    for (const m of this.monsters) if (vis(m.x, m.y, m.w * 0.6 + 18)) m.draw(ctx, t);
    if (this.player) this.player.draw(ctx, t);
    for (const pr of this.projectiles) if (vis(pr.x, pr.y, pr.size + 6)) pr.draw(ctx);
    for (const r of this.rings) if (vis(r.x, r.y, r.r + 10)) r.draw(ctx);
    for (const pa of this.particles) if (vis(pa.x, pa.y, pa.size + 4)) pa.draw(ctx);
    for (const tx of this.texts) if (vis(tx.x, tx.y, 40)) tx.draw(ctx);

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

    // Vignette cacheado (não recriado por frame).
    let vig = this._vigGrad;
    if (!vig || this._vigW !== this.cw || this._vigH !== this.ch) {
      const vgx = this.cw / 2, vgy = this.ch / 2;
      vig = ctx.createRadialGradient(vgx, vgy, this.ch * 0.45, vgx, vgy, this.ch * 0.95);
      vig.addColorStop(0, 'rgba(0,0,0,0)');
      vig.addColorStop(1, 'rgba(0,0,0,0.42)');
      this._vigGrad = vig;
      this._vigW = this.cw;
      this._vigH = this.ch;
    }
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

    // Sombra no chão
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(0, 20, 13, 5, 0, 0, 6.283);
    ctx.fill();
    ctx.globalAlpha = 1;

    if (n.kind === 'seal') {
      // Selos de progressão: aura pulsante sobre anel — não são pessoas.
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
    } else {
      // Personagens procedurais consistentes com o sprite do jogador.
      const v = ((Math.floor(n.px) * 13 + Math.floor(n.py) * 7) >>> 0) % 5;
      this.drawNpcChar(ctx, n, v, 20, t);

      // Indicador de confissão (NPCs do Clero)
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
    }

    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.font = '700 11px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(n.name, 0, 34);
    ctx.restore();
  },

  drawNpcChar(ctx, n, v, fy, t) {
    const color = n.color;
    const accent = n.accent || '#ffffff';

    // ---- Clero (igreja e Papa) ----
    if (n.kind === 'church' || n.kind === 'pope') {
      drawLegs(ctx, fy);
      const vest = n.kind === 'pope' || (n.rank && n.rank !== 'capela') ? '#f5f0e4' : color;
      drawTunic(ctx, vest, darken(vest, -18), fy);
      if (n.kind === 'pope') {
        // Papa: palio dourado + mozeta escarlate
        ctx.fillStyle = '#b2002e';
        ctx.beginPath(); ctx.arc(-9, fy - 17, 3.4, Math.PI * 0.55, Math.PI * 1.45); ctx.fill();
        ctx.beginPath(); ctx.arc(9, fy - 17, 3.4, Math.PI * -0.45, Math.PI * 0.45); ctx.fill();
        ctx.fillStyle = accent;
        ctx.fillRect(-1.2, fy - 18, 2.4, 16);
      } else if (n.rank === 'bispo') {
        ctx.fillStyle = '#b2002e';
        ctx.beginPath(); ctx.arc(-9, fy - 17, 3.4, Math.PI * 0.55, Math.PI * 1.45); ctx.fill();
        ctx.beginPath(); ctx.arc(9, fy - 17, 3.4, Math.PI * -0.45, Math.PI * 0.45); ctx.fill();
        ctx.fillStyle = accent;
        ctx.fillRect(-1.2, fy - 18, 2.4, 16);
        ctx.fillStyle = '#ffd23f';
        ctx.fillRect(-1.2, fy - 12, 2.4, 4);
        ctx.fillRect(-3.2, fy - 10.6, 6.4, 2);
      } else {
        // colarinho romano + estola/faixa
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-2.6, fy - 19.5, 5.2, 2.4);
        ctx.fillStyle = accent;
        ctx.fillRect(-3.4, fy - 16.5, 1.7, 14);
        ctx.fillRect(1.7, fy - 16.5, 1.7, 14);
      }
      drawFace(ctx, fy);
      if (n.kind === 'pope') {
        // tiara tripla + auréola dourada pulsante
        const ph = t * 3;
        ctx.globalAlpha = 0.55 + Math.sin(ph) * 0.3;
        ctx.strokeStyle = '#ffd23f';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, fy - 29, 8 + Math.sin(ph * 2) * 1.5, 0, 6.283);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(-5.5, fy - 37);
        ctx.lineTo(-3.5, fy - 49);
        ctx.lineTo(0, fy - 44);
        ctx.lineTo(3.5, fy - 49);
        ctx.lineTo(5.5, fy - 37);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = accent;
        ctx.fillRect(-4.2, fy - 40, 8.4, 1.7);
        ctx.fillRect(-0.8, fy - 46.5, 1.6, 4.5);
      } else if (n.rank === 'bispo') {
        // mitra branca + galão + auréola
        ctx.fillStyle = '#fdf6ec';
        ctx.beginPath();
        ctx.moveTo(-5, fy - 38);
        ctx.lineTo(-3, fy - 50);
        ctx.lineTo(0, fy - 43);
        ctx.lineTo(3, fy - 50);
        ctx.lineTo(5, fy - 38);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = accent;
        ctx.fillRect(-3.6, fy - 41, 7.2, 1.6);
        ctx.fillRect(-0.9, fy - 48, 1.8, 5);
        ctx.strokeStyle = 'rgba(255,210,63,0.9)';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(0, fy - 30, 7.2, 0, 6.283);
        ctx.stroke();
      } else if (n.rank === 'capela') {
        // capela do bosque: capuz humilde + auréola
        ctx.fillStyle = darken(color, -20);
        ctx.beginPath();
        ctx.arc(0, fy - 33.5, 6.4, Math.PI, 0);
        ctx.fill();
        ctx.fillRect(-6.4, fy - 33, 12.8, 2);
        ctx.fillStyle = darken(vest, -30);
        ctx.fillRect(-6, fy - 32.4, 12, 1.4);
        ctx.strokeStyle = 'rgba(255,215,106,0.85)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(0, fy - 30, 7, 0, 6.283);
        ctx.stroke();
      } else {
        // padre: tonsura + auréola discreta
        ctx.fillStyle = '#3a3a44';
        ctx.beginPath();
        ctx.arc(0, fy - 31, 4.6, Math.PI * 0.9, Math.PI * 2.1);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,215,106,0.9)';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(0, fy - 37.6, 4.4, 0, 6.283);
        ctx.stroke();
      }
      return;
    }

    // ---- Anjo de Eclésia: evento raro — veste alva, asas e halo pulsante ----
    if (n.kind === 'anjo') {
      drawLegs(ctx, fy);
      drawTunic(ctx, '#f4f7ff', darken('#f4f7ff', -16), fy);
      // asas abertas
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath(); ctx.ellipse(-11, fy - 22, 5.5, 8, -0.4, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.ellipse(11, fy - 22, 5.5, 8, 0.4, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#cfe8ff';
      ctx.beginPath(); ctx.ellipse(-11, fy - 20, 3, 6, -0.4, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.ellipse(11, fy - 20, 3, 6, 0.4, 0, 6.283); ctx.fill();
      // botoeira dourada
      ctx.fillStyle = '#ffd23f';
      ctx.fillRect(-0.9, fy - 12, 1.8, 6);
      // halo dourado pulsante
      const ph2 = t * 3;
      ctx.globalAlpha = 0.6 + Math.sin(ph2) * 0.3;
      ctx.strokeStyle = '#ffd23f';
      ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.arc(0, fy - 32, 7.5, 0, 6.283); ctx.stroke();
      ctx.globalAlpha = 1;
      drawFace(ctx, fy);
      // cabelos claros
      ctx.fillStyle = '#f5e1c0';
      ctx.beginPath(); ctx.arc(0, fy - 31, 4.4, Math.PI, 0); ctx.fill();
      return;
    }

    // ---- Ofícios e aldeões: túnica + item de trabalho ----
    drawLegs(ctx, fy);
    drawTunic(ctx, color, darken(color, -22), fy);
    ctx.fillStyle = accent;
    ctx.fillRect(-8.5, fy - 9, 17, 1.8);

    if (n.kind === 'forge') {
      // avental de couro + bigorna + martelo no ombro
      ctx.fillStyle = darken(color, -34);
      ctx.beginPath();
      ctx.moveTo(-6, fy - 17);
      ctx.lineTo(6, fy - 17);
      ctx.lineTo(7, fy - 3);
      ctx.lineTo(-7, fy - 3);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = HAIR;
      ctx.fillRect(-7, fy - 3, 14, 1.6);
      drawFace(ctx, fy);
      drawBeard(ctx, fy, '#6a5232');
      ctx.fillStyle = HAIR;
      ctx.beginPath();
      ctx.arc(0, fy - 31, 4.6, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(-4.8, fy - 30.4, 9.6, 1.4);
      // bigorna ao lado + martelo no ombro
      ctx.fillStyle = '#3a3d42';
      ctx.fillRect(-11.5, fy - 8, 7, 8);
      ctx.fillRect(-13, fy - 9.5, 10, 2);
      ctx.fillStyle = accent;
      ctx.fillRect(8, fy - 20, 2.5, 9);
      ctx.fillRect(7, fy - 21, 4.5, 2.4);
      return;
    }

    if (n.kind === 'shop') {
      drawFace(ctx, fy);
      // lenço na cabeça
      ctx.fillStyle = darken(color, -8);
      ctx.beginPath();
      ctx.arc(0, fy - 32, 5.6, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(-5.6, fy - 31.5, 11.2, 2.4);
      ctx.fillStyle = darken(color, -24);
      ctx.fillRect(-5.6, fy - 29.4, 11.2, 1.4);
      // moeda na mão
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(9.5, fy - 10, 2.2, 0, 6.283);
      ctx.fill();
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath();
      ctx.arc(9.5, fy - 10, 1, 0, 6.283);
      ctx.fill();
      return;
    }

    if (n.kind === 'skills') {
      // mestre das artes: capuz + cajado com orbe
      ctx.fillStyle = darken(color, -16);
      ctx.beginPath();
      ctx.arc(0, fy - 34, 7.2, Math.PI * 0.92, Math.PI * 2.08);
      ctx.fill();
      ctx.fillRect(-7, fy - 33.4, 14, 1.6);
      ctx.fillStyle = darken(color, -30);
      ctx.beginPath();
      ctx.arc(0, fy - 30.8, 4.6, Math.PI, 0);
      ctx.fill();
      drawFace(ctx, fy);
      ctx.fillStyle = '#6b4a2e';
      ctx.fillRect(8.5, fy - 24, 2.2, 24);
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(9.6, fy - 26, 3.2, 0, 6.283);
      ctx.fill();
      return;
    }

    if (n.kind === 'guide') {
      drawFace(ctx, fy);
      drawBeard(ctx, fy, darken(SKIN, -40));
      // capuz de viajante
      ctx.fillStyle = darken(color, -14);
      ctx.beginPath();
      ctx.arc(0, fy - 34, 7.2, Math.PI * 0.92, Math.PI * 2.08);
      ctx.fill();
      ctx.fillRect(-7, fy - 33.4, 14, 1.6);
      // pergaminho na mão
      ctx.fillStyle = '#f0e6c8';
      ctx.fillRect(7.5, fy - 16, 5.5, 8);
      ctx.fillStyle = '#c9a884';
      ctx.fillRect(9.8, fy - 16, 1.2, 8);
      return;
    }

    if (n.kind === 'tavern') {
      // corpo mais largo + bigode + caneca
      ctx.fillStyle = darken(color, -22);
      ctx.fillRect(-10, fy - 18, 20, 16);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(0, fy - 12, 10, 7, 0, 0, 6.283);
      ctx.fill();
      ctx.fillStyle = accent;
      ctx.fillRect(-9.5, fy - 8, 19, 1.8);
      drawFace(ctx, fy);
      ctx.fillStyle = HAIR;
      ctx.fillRect(-3.6, fy - 28.2, 7.2, 1.6);
      ctx.beginPath();
      ctx.arc(0, fy - 31.4, 4.8, Math.PI * 0.85, Math.PI * 2.15);
      ctx.fill();
      ctx.fillStyle = '#b5651d';
      ctx.fillRect(9.5, fy - 18, 4, 8);
      ctx.fillRect(13.5, fy - 17, 1.6, 6);
      ctx.fillStyle = '#ffd23f';
      ctx.fillRect(9.5, fy - 19, 4, 2);
      return;
    }

    if (n.kind === 'tower') {
      // erudito arcano: chapéu pontudo + óculos + livro
      ctx.fillStyle = accent;
      ctx.fillRect(-1.2, fy - 19, 2.4, 17);
      drawFace(ctx, fy);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(-6, fy - 36);
      ctx.lineTo(-4, fy - 50);
      ctx.lineTo(0, fy - 45);
      ctx.lineTo(4, fy - 50);
      ctx.lineTo(6, fy - 36);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = accent;
      ctx.fillRect(-4.2, fy - 39, 8.4, 1.8);
      ctx.fillRect(-0.8, fy - 46, 1.6, 4);
      ctx.fillStyle = '#bfe4ff';
      ctx.beginPath();
      ctx.arc(-2.7, fy - 30.4, 1.9, 0, 6.283);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(2.7, fy - 30.4, 1.9, 0, 6.283);
      ctx.fill();
      ctx.strokeStyle = '#3a3f46';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-0.7, fy - 30.4);
      ctx.lineTo(0.7, fy - 30.4);
      ctx.stroke();
      ctx.fillStyle = '#5a3a2a';
      ctx.fillRect(-10.5, fy - 13, 4.5, 7);
      ctx.fillStyle = '#f0e6c8';
      ctx.fillRect(-8.5, fy - 12.5, 1, 6);
      return;
    }

    if (n.kind === 'guild') {
      // Comandante templário: torso de aço, sobreveste branca com a cruz
      // vermelha da Ordem, elmo de campo com pluma e espada ao lado.
      drawLegs(ctx, fy);
      ctx.fillStyle = '#8b929c';
      ctx.fillRect(-9, fy - 18, 18, 15);
      ctx.fillStyle = '#616a74';
      ctx.fillRect(-9, fy - 18, 18, 2.5);
      ctx.fillRect(-9, fy - 6, 18, 1.6);
      // sobreveste com cruz
      ctx.fillStyle = color;
      ctx.fillRect(-5, fy - 14.5, 10, 9.5);
      ctx.fillStyle = n.accent || accent;
      ctx.fillRect(-0.9, fy - 13.4, 1.8, 6.5);
      ctx.fillRect(-3, fy - 11.4, 6, 1.8);
      // elmo com fenda em cruz
      ctx.fillStyle = '#99a1ad';
      ctx.beginPath();
      ctx.arc(0, fy - 31, 6, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(-6, fy - 30.6, 12, 2.4);
      ctx.fillStyle = '#0e1114';
      ctx.fillRect(-1.5, fy - 31.4, 3, 3.4);
      ctx.fillRect(-4.4, fy - 30, 8.8, 1.6);
      // pluma da Ordem
      ctx.fillStyle = n.accent || accent;
      ctx.beginPath();
      ctx.moveTo(-0.8, fy - 36.6);
      ctx.quadraticCurveTo(-6, fy - 46, -2.4, fy - 48);
      ctx.quadraticCurveTo(0.6, fy - 44, 0.2, fy - 36.6);
      ctx.fill();
      // espada longa ao lado
      ctx.fillStyle = '#c9d0da';
      ctx.fillRect(-12.5, fy - 20, 2.2, 7);
      ctx.fillStyle = '#c9a227';
      ctx.fillRect(-12.5, fy - 13.5, 2.2, 1.6);
      ctx.fillStyle = '#6b4a2e';
      ctx.fillRect(-12.5, fy - 11.5, 2.2, 6);
      return;
    }

    if (n.kind === 'circulo') {
      // Mestre do Círculo: túnica arcana de tons profundos, chapéu cônico de
      // mago e orbes flutuantes orbitando o cajado — hierofante do véu.
      drawLegs(ctx, fy);
      drawTunic(ctx, darken(color, -10), darken(color, -30), fy);
      ctx.fillStyle = accent;
      ctx.fillRect(-8.5, fy - 9, 17, 1.6);
      ctx.fillStyle = darken(color, -40);
      ctx.fillRect(-1, fy - 19, 2, 16);
      drawFace(ctx, fy);
      ctx.fillStyle = '#6b4a2e';
      ctx.fillRect(8.5, fy - 26, 2.2, 26);
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(9.6, fy - 27.5, 3.4, 0, 6.283);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath();
      ctx.arc(9.2, fy - 28.5, 1.2, 0, 6.283);
      ctx.fill();
      // chapéu cônico de mago + orbes orbitando
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(-5.5, fy - 36);
      ctx.lineTo(-3.5, fy - 50);
      ctx.lineTo(0, fy - 44);
      ctx.lineTo(3.5, fy - 50);
      ctx.lineTo(5.5, fy - 36);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = accent;
      ctx.fillRect(-3.8, fy - 38.6, 7.6, 1.4);
      const ph = t * 2;
      for (let i = 0; i < 3; i++) {
        const a = ph + i * 2.094;
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.arc(5 + Math.cos(a) * 6, fy - 24 + Math.sin(a) * 3, 1.6, 0, 6.283);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      return;
    }

    // ---- Aldeão comum (talk): variação de penteado ----
    drawFace(ctx, fy);
    if (v === 0) {
      // cabelo curto
      ctx.fillStyle = HAIR;
      ctx.beginPath();
      ctx.arc(0, fy - 31, 4.8, Math.PI * 0.8, Math.PI * 2.2);
      ctx.fill();
    } else if (v === 1) {
      // lenço de camponesa
      ctx.fillStyle = darken(color, -8);
      ctx.beginPath();
      ctx.arc(0, fy - 33, 5.8, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(-5.8, fy - 32.5, 11.6, 2.6);
      ctx.fillStyle = darken(color, -24);
      ctx.fillRect(-5.8, fy - 30.2, 11.6, 1.2);
    } else if (v === 2) {
      // calvo com barba
      ctx.fillStyle = darken(SKIN, -60);
      ctx.fillRect(-4.6, fy - 32.6, 9.2, 1.6);
      drawBeard(ctx, fy, darken(SKIN, -30));
    } else if (v === 3) {
      // topetinho
      ctx.fillStyle = HAIR;
      ctx.beginPath();
      ctx.arc(0, fy - 32, 4.4, Math.PI * 0.95, Math.PI * 2.05);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0, fy - 36.5);
      ctx.lineTo(-3, fy - 33);
      ctx.lineTo(0, fy - 32);
      ctx.lineTo(3, fy - 33);
      ctx.closePath();
      ctx.fill();
    } else {
      // cabelo com coque
      ctx.fillStyle = HAIR;
      ctx.beginPath();
      ctx.arc(0, fy - 31.4, 4.6, Math.PI * 0.85, Math.PI * 2.15);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, fy - 35.6, 2, 0, 6.283);
      ctx.fill();
    }
  },

};
