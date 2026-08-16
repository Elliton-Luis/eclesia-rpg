import { clamp } from '../data/utils.js';
import { CASTAS } from '../data/classes.js';
import { HOTBAR_SLOTS } from '../data/constants.js';
import { byId } from '../dom.js';

export const hud = {
  // Hotbar de HOTBAR_SLOTS slots (rótulos 1–0, em ordem). Cada slot abriga uma
  // habilidade equipada; a seleção é por scroll e a ativação por clique esquerdo.
  // O ataque padrão é um slot EXTRA ("offhand", índice ATK_INDEX) que participa
  // do mesmo ciclo de scroll: scroll até ele e clique para atacar — sem precisar
  // da tecla J.
  HOTBAR_SLOTS,

  // Índice do slot "offhand" do ataque padrão no ciclo de scroll da Hotbar.
  ATK_INDEX: HOTBAR_SLOTS,

  SKILL_KEYS: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],

  skillKey(i) {
    return this.SKILL_KEYS[i] || '·';
  },

  buildSkillbar() {
    const p = this.player;
    if (!p) return;
    const bar = byId('skillbar');
    bar.innerHTML = '';
    this.skillEls = [];
    if (this.hotSel === undefined) this.hotSel = 0;
    this.hotSel = clamp(this.hotSel, 0, this.ATK_INDEX);
    // Ataque padrão em slot próprio ("offhand"), à esquerda da Hotbar: entra no
    // ciclo de scroll junto com os slots 1–0. Clicar nele seleciona E ataca.
    const atk = document.createElement('div');
    atk.className = 'skill atkslot';
    atk.dataset.slot = 'atk';
    atk.title = 'Ataque padrão — selecione com o scroll e clique para atacar';
    atk.innerHTML = `<span class="skey">A</span><span class="sicon atkIcon">⚔</span><span class="sname" id="atkName"></span><div class="cdfill"></div><div class="cdnum"></div>`;
    atk.onclick = () => { if (this.state === 'play') { this.selectHot(this.ATK_INDEX); this.doAttack(); } };
    bar.appendChild(atk);
    this.atkEl = atk;
    for (let i = 0; i < HOTBAR_SLOTS; i++) {
      const d = document.createElement('div');
      d.className = 'skill hotslot';
      d.dataset.slot = String(i);
      d.innerHTML = `<span class="skey">${this.skillKey(i)}</span><span class="sicon"></span><span class="sname"></span><div class="cdfill"></div><div class="cdnum"></div>`;
      d.onclick = () => { if (this.state === 'play') this.selectHot(i); };
      bar.appendChild(d);
      this.skillEls.push(d);
    }
    this.hudSlots();
  },

  selectHot(i) {
    this.hotSel = clamp(i, 0, this.ATK_INDEX);
    this.hudSlots();
  },

  scrollHot(dir) {
    this.selectHot((this.hotSel + dir + HOTBAR_SLOTS + 1) % (HOTBAR_SLOTS + 1));
  },

  // Ativa o slot i (usado pelo clique esquerdo sobre o slot selecionado). O
  // índice ATK_INDEX equivale ao slot "offhand" do ataque padrão: nada a lançar,
  // apenas o ataque básico na direção da mira.
  useSlot(i) {
    if (i < 0 || i > this.ATK_INDEX) return;
    this.selectHot(i);
    if (this.state !== 'play') return;
    if (i === this.ATK_INDEX) { this.doAttack(); return; }
    const s = this.player.hotSkill(i);
    if (s) this.castSkillId(s.id);
    else this.banner('Slot vazio — selecione outro com o scroll.', '#9aa0ab', 1.2);
  },

  // Atalho da Bênção Suprema (H): só funciona se ela estiver equipada na hotbar.
  useSupremeKey() {
    const p = this.player;
    if (!p) return;
    const i = p.findSlot('bencao_suprema');
    if (i === -1) {
      this.banner('A Bênção Suprema não está na hotbar. Equipe-a no inventário (tecla I).', '#fff3b0', 2.4);
      return;
    }
    this.useSlot(i);
  },

  // Fulmen Ruptor (E): explosivo consagrado vendido pelo Vendedor da vila,
  // arrebenta árvores e rochedos e abre rotas fechadas pela natureza. Detona no
  // ponto de mira e consome uma unidade do estoque de provisões (também
  // descontada do perfil persistente).
  useFulmen() {
    const p = this.player;
    if (!p) return;
    if (!p.fulmen) {
      this.banner('Sem Fulmen Ruptor — adquira-o com o Vendedor da vila.', '#ffd6a5', 2.2);
      return;
    }
    const tx = this.aim.x, ty = this.aim.y;
    const R = 80;
    const before = this.world.destroyedKeys.size;
    this.world.destroyScenery(tx, ty, R);
    if (this.world.destroyedKeys.size === before) {
      this.banner('Nada aqui para arrebentar — aponte para árvores ou rochedos.', '#ffd6a5', 2);
      return;
    }
    p.fulmen--;
    const prof = this.loadRecords();
    if (prof) { prof.fulmen = Math.max(0, (prof.fulmen || 0) - 1); this.persistProfile(prof); }
    this.burst(tx, ty, '#ffd23f', 26, 420);
    this.burst(tx, ty, '#e67e22', 14, 240);
    this.ring(tx, ty, R, 0.55, '#ffd23f', 5);
    this.shake += 9;
    this.sfx.explosion();
    this.banner('FULMEN RUPTOR — o caminho se abre!', '#ffd23f', 2.4);
    this.hud();
  },

  // Atualiza o slot "offhand" do ataque + os slots visíveis da Hotbar a partir
  // do estado real (ícone, nome, cooldown, seleção).
  hudSlots() {
    const p = this.player;
    if (!p) return;
    if (this.atkEl) {
      const el = this.atkEl;
      const atkSel = (this.hotSel || 0) === this.ATK_INDEX;
      el.classList.toggle('selected', atkSel);
      const w = p.weapon;
      const col = w.color || '#ffb020';
      el.style.setProperty('--c', col);
      const ic = el.querySelector('.sicon');
      const nm = el.querySelector('.sname');
      const cf = el.querySelector('.cdfill');
      if (ic) ic.style.background = col;
      if (nm) { nm.textContent = w.name + ' +' + w.tier + ' (dano ' + w.dmg + ')'; nm.style.color = '#fff'; }
      if (cf) cf.style.height = '0%';
      // Esmaece quando não está selecionada (mas continua visível para o scroll).
      el.style.opacity = atkSel ? '' : '0.55';
    }
    if (!this.skillEls) return;
    for (let i = 0; i < HOTBAR_SLOTS; i++) {
      const el = this.skillEls[i];
      if (!el) continue;
      const s = p.hotSkill(i);
      el.classList.toggle('selected', i === (this.hotSel || 0));
      const ic = el.querySelector('.sicon');
      const nm = el.querySelector('.sname');
      const cf = el.querySelector('.cdfill');
      const cn = el.querySelector('.cdnum');
      if (!s) {
        el.style.setProperty('--c', '#4a5468');
        ic.style.background = 'rgba(255,255,255,0.08)';
        nm.textContent = 'vazio';
        cf.style.height = '0%';
        cn.textContent = '';
        el.style.opacity = '';
        continue;
      }
      el.style.setProperty('--c', s.color);
      ic.style.background = s.color;
      nm.textContent = s.name;
      el.style.opacity = '';
      // Bênção Suprema consumida: o orbe esmaece para mostrar que não há mais uso.
      if (s.bless === 'supreme') el.style.opacity = p.supremeUses > 0 ? '' : '0.4';
      if (s.bless === 'fulmen') el.style.opacity = p.fulmen > 0 ? '' : '0.4';
      const cd = p.cd[s.id] || 0;
      const mx = s.cd || 1;
      const f = clamp(cd / mx, 0, 1);
      cf.style.height = (f * 100) + '%';
      cn.textContent = cd > 0 ? cd.toFixed(1) : '';
    }
  },

  hud() {
    const p = this.player;
    if (!p) return;
    byId('hpbar').style.width = (clamp(p.hp / p.maxHp, 0, 1) * 100) + '%';
    byId('hptext').textContent = Math.ceil(p.hp) + '/' + p.maxHp;
    byId('goldval').textContent = p.gold;
    byId('fulmenval').textContent = p.fulmen;
    byId('fulmenTips').textContent = p.fulmen;
    byId('st_vida').textContent = p.maxHp;
    byId('st_vel').textContent = p.spd;
    byId('st_for').textContent = p.str;
    byId('st_int').textContent = p.int;
    byId('classname').textContent = CASTAS[p.sub.casta].name + ' — ' + p.sub.name;
    byId('weapon').textContent = p.mw ? p.mw.name + ' (dano ' + p.weapon.dmg + ')' : p.weapon.name + ' +' + p.weapon.tier + ' (dano ' + p.weapon.dmg + ')';
    const lvEl = byId('lvlval');
    if (lvEl) lvEl.textContent = this.progressLevel;

    this.hudSlots();

    const bb = byId('bossbar');
    const b = this.boss || this.bossesActive.find(m => !m.dead);
    if (b && !b.dead && b.aggro > 0) {
      bb.classList.remove('hidden');
      byId('bossname').textContent = b.def.name.toUpperCase();
      byId('bosshp').style.width = (clamp(b.hp / b.maxHp, 0, 1) * 100) + '%';
      byId('bosshp').style.background = b.def.finalBoss ? 'linear-gradient(90deg,#ff3c3c,#ffd23f)' : 'linear-gradient(90deg,#ffd23f,#ff6b6b)';
    } else {
      bb.classList.add('hidden');
    }
  },

};