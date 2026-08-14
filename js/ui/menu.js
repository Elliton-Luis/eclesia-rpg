import { CASTAS, SUBCLASSES, SUB_ORDER, CASTA_ORDER } from '../data/classes.js';
import { byId } from '../dom.js';

export const menu = {
  buildMenu() {
    const grid = byId('menuGrid');
    grid.innerHTML = '';
    for (const castaId of CASTA_ORDER) {
      const casta = CASTAS[castaId];
      for (const subId of SUB_ORDER) {
        if (SUBCLASSES[subId].casta !== castaId) continue;
        const s = SUBCLASSES[subId];
        const sk = s.skills.map(x => x.name).join(' · ');
        const div = document.createElement('div');
        div.className = 'card';
        div.style.setProperty('--c', s.accent);
        div.innerHTML = `
          <div class="cswatch" style="--c:${s.color}"></div>
          <div class="ct">${casta.name.toUpperCase()}</div>
          <div class="cn">${s.name}</div>
          <div class="cd">${s.desc}</div>
          <div class="csk">Vida ${s.hp} · Vel ${s.speed}<br>Força ${s.str} · Int ${s.int}<br><b>${sk}</b></div>`;
        div.onclick = () => this.startGame(s.id);
        grid.appendChild(div);
      }
    }
  },

};
