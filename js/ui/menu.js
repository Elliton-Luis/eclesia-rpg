import { CASTAS, SUBCLASSES, SUB_ORDER, CASTA_ORDER } from '../data/classes.js';
import { Player } from '../entities/player.js';
import { byId } from '../dom.js';

export const menu = {
  // Retrato da classe gerado no canvas reaproveitando o sprite procedural do
  // jogador (corpo + rosto), mantendo visual idêntico ao personagem in-game.
  classSprite(subId) {
    if (!this._sprites) this._sprites = {};
    if (this._sprites[subId]) return this._sprites[subId];
    const s = SUBCLASSES[subId];
    const cv = document.createElement('canvas');
    cv.width = 96;
    cv.height = 96;
    const ctx = cv.getContext('2d');
    const fy = 17;
    const r = Object.create(Player.prototype);
    ctx.translate(48, 82);
    ctx.scale(1.9, 1.9);
    const boot = s.casta === 'templarios' ? '#4a4438' : '#3a3a44';
    ctx.fillStyle = boot;
    ctx.fillRect(-9, fy - 3, 5, 3);
    ctx.fillRect(4, fy - 3, 5, 3);
    r.drawBody(ctx, s, fy);
    r.drawHead(ctx, s, fy);
    this._sprites[subId] = cv.toDataURL();
    return this._sprites[subId];
  },

  buildMenu() {
    const grid = byId('menuGrid');
    grid.innerHTML = '';
    for (const castaId of CASTA_ORDER) {
      const casta = CASTAS[castaId];
      for (const subId of SUB_ORDER) {
        if (SUBCLASSES[subId].casta !== castaId) continue;
        const s = SUBCLASSES[subId];
        const unlocked = this.isClassUnlocked(subId);
        const img = this.classSprite(subId);
        const div = document.createElement('div');
        div.className = 'card' + (unlocked ? '' : ' locked');
        div.style.setProperty('--c', s.accent);
        div.innerHTML = `
          <div class="cswatch" style="--c:${s.color};background-image:url('${img}')"></div>
          <div class="ct">${casta.name.toUpperCase()}</div>
          <div class="cn">${s.name}</div>
          <div class="cd">${s.desc}</div>
          ${unlocked
            ? `<div class="csk">Vida ${s.hp} · Vel ${s.speed}<br>Força ${s.str} · Int ${s.int}<br><b>${s.skills.map(x => x.name).join(' · ')}</b></div>`
            : `<div class="csk"><b>🔒 Vença com ${this.unlockHint(subId)} para desbloquear</b></div>`}`;
        div.onclick = () => {
          if (unlocked) this.startGame(subId);
          else this.banner(`Classe bloqueada: vença com ${this.unlockHint(subId)} para desbloquear.`, '#ffd23f', 2.4);
        };
        grid.appendChild(div);
      }
    }
  },

};
