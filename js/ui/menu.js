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
    const rec = this.loadRecords() || {};
    // O Papa não é um card próprio: é a variante/skin do Bispo, desbloqueada por
    // 20.000 ● na aparição rara. A variante aparece dentro do card do Bispo
    // (indicador ● + sprite do Papa + alternância Bispo/Papa) uma vez comprada.
    const popeUnlocked = !!rec.popeUnlocked || !!this.cheats.libera_tudo;
    if (this._popeVar !== 'bispo' && this._popeVar !== 'papa') {
      // Após o desbloqueio a variante é apresentada por padrão (Papa); sem o
      // desbloqueio o card permanece o Bispo normal.
      this._popeVar = popeUnlocked ? 'papa' : 'bispo';
    }
    for (const castaId of CASTA_ORDER) {
      const casta = CASTAS[castaId];
      for (const subId of SUB_ORDER) {
        if (SUBCLASSES[subId].casta !== castaId) continue;
        const s = SUBCLASSES[subId];
        if (subId === 'bispo' && popeUnlocked) this.buildBispoCard(grid, casta, s);
        else this.buildClassCard(grid, casta, s);
      }
    }
  },

  // Card comum de classe (sem variantes).
  buildClassCard(grid, casta, s) {
    const unlocked = this.isClassUnlocked(s.id);
    const img = this.classSprite(s.id);
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
        : `<div class="csk"><b>🔒 Vença com ${this.unlockHint(s.id)} para desbloquear</b></div>`}`;
    div.onclick = () => {
      if (unlocked) this.startGame(s.id);
      else this.banner(`Classe bloqueada: vença com ${this.unlockHint(s.id)} para desbloquear.`, '#ffd23f', 2.4);
    };
    grid.appendChild(div);
  },

  // Card do Bispo com a variante Papa desbloqueada: mesmo slot/classe do Bispo,
  // mas apresentando o sprite, os atributos e as habilidades do Papa, com um
  // indicador ● de variante e a alternância entre Bispo e Papa.
  buildBispoCard(grid, casta, bispo) {
    const papa = SUBCLASSES.papa;
    const sel = this._popeVar === 'bispo' ? 'bispo' : 'papa';
    const disp = sel === 'papa' ? papa : bispo;
    const img = this.classSprite(disp.id);
    const div = document.createElement('div');
    div.className = 'card pope-variant';
    div.style.setProperty('--c', disp.accent);
    div.innerHTML = `
      <div class="vdot" title="Variante do Bispo desbloqueada"></div>
      <div class="cswatch" style="--c:${disp.color};background-image:url('${img}')"></div>
      <div class="ct">${casta.name.toUpperCase()}</div>
      <div class="cn">${disp.name}</div>
      <div class="cd">${disp.desc}</div>
      <div class="csk">Vida ${disp.hp} · Vel ${disp.speed}<br>Força ${disp.str} · Int ${disp.int}<br><b>${disp.skills.map(x => x.name).join(' · ')}</b></div>
      <div class="vtoggle"><button class="vtbtn" type="button" title="Alternar entre Bispo e Papa">Alternar: <b>${disp.name}</b> ⇄ ${disp.name === 'Papa' ? 'Bispo' : 'Papa'}</button></div>
    `;
    // Clique no corpo do card: inicia com a variante atualmente selecionada.
    div.onclick = () => this.startGame(sel);
    // Botão de alternância: troca Bispo ⇄ Papa sem abrir jogo novo.
    div.querySelector('.vtbtn').onclick = e => {
      e.stopPropagation();
      this._popeVar = sel === 'papa' ? 'bispo' : 'papa';
      this.buildMenu();
    };
    grid.appendChild(div);
  },

};