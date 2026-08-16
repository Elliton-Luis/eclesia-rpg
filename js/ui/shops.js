import { T } from '../data/constants.js';
import { upgradeCost, weaponDamage } from '../data/utils.js';
import { EXTRA_SKILLS } from '../data/skills.js';
import { SHOP } from '../data/shop.js';
import { byId } from '../dom.js';

export const shops = {
  buildShop() {
    const p = this.player;
    const el = byId('shopPanel');
    let html = `<h2>Vendedor</h2><div class="goldline">Ouro: <b>${p.gold}</b></div><div class="items">`;
    for (const id in SHOP) {
      const it = SHOP[id];
      const n = this.shopN[id] || 0;
      const cost = it.cost(n);
      html += `<div class="item"><div><b>${it.name}</b><div class="desc">${it.desc}</div></div><button class="btn" data-buy="${id}">${cost} ●</button></div>`;
    }
    html += `</div><button class="btn ghost" id="closeShop">Fechar (Esc)</button>`;
    el.innerHTML = html;
    el.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => this.buy(b.dataset.buy));
    byId('closeShop').onclick = () => this.closeOverlay();
  },

  buy(id) {
    const p = this.player;
    const it = SHOP[id];
    const n = this.shopN[id] || 0;
    const cost = this.cheats.gold ? 0 : it.cost(n);
    if (p.gold >= cost) {
      p.gold -= cost;
      this.shopN[id] = n + 1;
      it.effect(this, p);
      this.sfx.buy();
      this.burst(p.x, p.y - 20, '#7ec8e3', 10, 160);
      this.buildShop();
      this.hud();
    }
  },

  buildSkillShop() {
    const p = this.player;
    const el = byId('skillsPanel');
    const isClero = p.sub.casta === 'clero';
    let html = `<h2>Mestre das Artes</h2><div class="goldline">Ouro: <b>${p.gold}</b></div><div class="items">`;
    for (const sk of EXTRA_SKILLS) {
      const has = p.extraSkills && p.extraSkills.some(s => s.id === sk.id);
      const cleroOnly = sk.id === 'reza_maior';
      html += `<div class="item"><div><b>${sk.name}</b><div class="desc">${sk.desc}${cleroOnly && !isClero ? ' <span style="opacity:.7">[dom sacerdotal do Clero]</span>' : ''}</div></div>${
        has ? '<span class="owned">APRENDIDA</span>'
          : cleroOnly && !isClero ? '<span class="owned">SOMENTE CLERO</span>'
          : `<button class="btn" data-skill="${sk.id}">${sk.cost} ●</button>`}</div>`;
    }
    html += `<div class="hint">Aprenda todas as habilidades que quiser! A restrição fica na <b>hotbar</b>: você pode equipar até ${this.HOTBAR_SLOTS} para uso rápido (teclas 1–0, organize no inventário — tecla I).</div>`;
    html += `</div><button class="btn ghost" id="closeSkills">Fechar (Esc)</button>`;
    el.innerHTML = html;
    el.querySelectorAll('[data-skill]').forEach(b => b.onclick = () => this.buySkill(b.dataset.skill));
    byId('closeSkills').onclick = () => this.closeOverlay();
  },

  buySkill(id) {
    const p = this.player;
    const sk = EXTRA_SKILLS.find(s => s.id === id);
    if (!sk || !p.extraSkills) return;
    if (sk.id === 'reza_maior' && p.sub.casta !== 'clero') {
      this.banner('A Reza Maior é um dom sacerdotal do Clero.', '#ffd23f', 2.2);
      return;
    }
    if (p.extraSkills.some(s => s.id === id)) return;
    const cost = this.cheats.gold ? 0 : sk.cost;
    if (p.gold < cost) { this.banner('Ouro insuficiente', '#ff5c5c', 1.5); return; }
    p.gold -= cost;
    const newSk = Object.assign({}, sk);
    delete newSk.cost;
    p.extraSkills.push(newSk);
    p.cd[sk.id] = 0;
    p.tryEquip(sk.id);
    this.sfx.upgrade();
    this.burst(p.x, p.y - 20, sk.color, 14, 200);
    this.buildSkillbar();
    this.buildSkillShop();
    this.hud();
    this.banner(sk.name + ' aprendida!', sk.color, 2);
  },

  // Aprende uma bênção ensinada por um Padre/Bispo no mundo.
  buildForge() {
    const p = this.player;
    const w = p.weapon;
    const cost = upgradeCost(w.tier);
    const next = w.base + (w.tier + 1) * 3;
    const el = byId('forgePanel');
    el.innerHTML = `<h2>Ferreiro</h2>
      <div class="weaponinfo">
        <div class="wtitle">${w.name}</div>
        <div class="wrow">Nível <b>+${w.tier}</b></div>
        <div class="wrow">Dano atual: <b>${w.dmg}</b></div>
        <div class="wrow">Próximo nível: dano <b>${next}</b></div>
      </div>
      <div class="goldline">Ouro: <b>${p.gold}</b></div>
      <button class="btn" id="upgBtn">Melhorar (${cost} ●)</button>
      <button class="btn ghost" id="closeForge">Fechar (Esc)</button>`;
    const upg = byId('upgBtn');
    const costBt = this.cheats.gold ? 0 : cost;
    if (this.cheats.gold) upg.textContent = `Melhorar (Grátis)`;
    if (p.gold < costBt) upg.classList.add('disabled');
    upg.onclick = () => {
      if (p.gold >= costBt) {
        p.gold -= costBt;
        w.tier++;
        w.dmg = weaponDamage(w);
        this.sfx.upgrade();
        this.burst(p.x, p.y - 20, '#ffb020', 14, 220);
        this.buildForge();
        this.hud();
      }
    };
    byId('closeForge').onclick = () => this.closeOverlay();
  },

};
