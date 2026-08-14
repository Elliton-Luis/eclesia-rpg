import { clamp } from '../data/utils.js';
import { CASTAS } from '../data/classes.js';
import { byId } from '../dom.js';

export const hud = {
  // Hotbar estilo Minecraft: slots selecionáveis por clique, números (1-9) ou
  // rodinha do mouse. A habilidade selecionada é usada pelo comando de ataque/uso (J/X/click).
  HOTBAR_SLOTS: 9,

  buildSkillbar() {
    const p = this.player;
    const SW = this.HOTBAR_SLOTS;
    const bar = byId('skillbar');
    bar.innerHTML = '';
    this.skillEls = [];
    // Lista de ações utilizáveis: ataque + habilidades + Bênção Suprema (se concedida).
    const actions = [{ kind: 'attack', name: 'Ataque', color: p.sub.color }];
    p.allSkills().forEach((s, i) => actions.push({ kind: 'skill', i, name: s.name, color: s.color }));
    if (p.supremeBlessed) actions.push({ kind: 'supreme', name: 'Bênção Suprema', color: '#fff3b0' });
    this.hotList = actions;
    const L = actions.length;
    if (this.hotSel === undefined) this.hotSel = 0;
    this.hotSel = Math.max(0, Math.min(this.hotSel, L - 1));
    // Janela visível: mantém a seleção à vista (centralizada) quando há mais
    // habilidades do que slots visíveis.
    this.hotStart = L <= SW ? 0 : Math.max(0, Math.min(this.hotSel - Math.floor((SW - 1) / 2), L - SW));
    const visible = Math.min(SW, L);
    const mk = (act, absIdx, numLabel) => {
      const d = document.createElement('div');
      d.className = 'skill' + (absIdx === this.hotSel ? ' selected' : '');
      d.style.setProperty('--c', act.color);
      d.dataset.hotIndex = String(absIdx);
      d.innerHTML = `<span class="skey">${numLabel}</span><span class="sicon" style="background:${act.color}"></span><span class="sname">${act.name}</span><div class="cdfill"></div><div class="cdnum"></div>`;
      d.onclick = () => { if (this.state === 'play') this.selectHot(absIdx); };
      bar.appendChild(d);
      return d;
    };
    for (let k = 0; k < visible; k++) {
      const absIdx = this.hotStart + k;
      const act = actions[absIdx];
      this.skillEls.push(mk(act, absIdx, String(k + 1)));
    }
    // Indicador de página quando o número de habilidades excede a hotbar visível.
    if (L > SW) {
      const pg = document.createElement('div');
      pg.className = 'hotpage';
      pg.textContent = Math.floor(this.hotStart / SW) + 1 + '/' + Math.ceil(L / SW);
      bar.appendChild(pg);
    }
  },

  selectHot(absIdx) {
    if (!this.hotList || !this.hotList.length) return;
    this.hotSel = Math.max(0, Math.min(absIdx, this.hotList.length - 1));
    this.buildSkillbar();
    this.hud();
  },

  selectHotByNumber(n) {
    if (!this.hotList || !this.hotList.length) return;
    const idx = this.hotStart + (n - 1);
    if (idx >= 0 && idx < this.hotList.length) this.selectHot(idx);
  },

  scrollHot(dir) {
    if (!this.hotList || !this.hotList.length) return;
    this.hotSel = (this.hotSel + dir + this.hotList.length) % this.hotList.length;
    this.buildSkillbar();
    this.hud();
  },

  useHot() {
    const act = this.hotList && this.hotList[this.hotSel];
    if (!act) return;
    if (act.kind === 'attack') this.doAttack();
    else if (act.kind === 'skill') this.castSkill(act.i);
    else if (act.kind === 'supreme') this.useSupreme();
  },

  hotKind() {
    const act = this.hotList && this.hotList[this.hotSel];
    return act ? act.kind : null;
  },

  hud() {
    const p = this.player;
    if (!p) return;
    byId('hpbar').style.width = (clamp(p.hp / p.maxHp, 0, 1) * 100) + '%';
    byId('hptext').textContent = Math.ceil(p.hp) + '/' + p.maxHp;
    byId('goldval').textContent = p.gold;
    byId('st_vida').textContent = p.maxHp;
    byId('st_vel').textContent = p.spd;
    byId('st_for').textContent = p.str;
    byId('st_int').textContent = p.int;
    byId('classname').textContent = CASTAS[p.sub.casta].name + ' — ' + p.sub.name;
    byId('weapon').textContent = p.mw ? p.mw.name + ' (dano ' + p.weapon.dmg + ')' : p.weapon.name + ' +' + p.weapon.tier + ' (dano ' + p.weapon.dmg + ')';
    const lvEl = byId('lvlval');
    if (lvEl) lvEl.textContent = this.progressLevel;

    for (let i = 0; i < this.skillEls.length; i++) {
      const el = this.skillEls[i];
      const act = this.hotList && this.hotList[this.hotStart + i];
      if (!el || !act) continue;
      if (act.kind === 'attack') {
        el.querySelector('.sname').textContent = p.mw ? p.mw.name : 'Ataque';
      } else if (act.kind === 'skill') {
        const s = p.allSkills()[act.i];
        if (!s) continue;
      } else if (act.kind === 'supreme') {
        const ready = p.supremeBlessed && p.supremeUses > 0;
        el.style.opacity = ready ? '1' : '0.35';
        el.querySelector('.sname').textContent = ready ? 'Bênção Suprema' : 'Consumida';
        continue;
      }
      let cd = 0, max = 1;
      if (act.kind === 'attack') { cd = p.attackCd; max = ((p.mw || p.sub.attack).cd || 1) / (1 + (p.atkSpd || 0) * 0.1); }
      else { const s = p.allSkills()[act.i]; cd = p.cd[s.id]; max = s.cd; }
      const f = clamp(cd / max, 0, 1);
      el.querySelector('.cdfill').style.height = (f * 100) + '%';
      el.querySelector('.cdnum').textContent = cd > 0 ? cd.toFixed(1) : '';
    }

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
