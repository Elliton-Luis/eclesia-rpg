import { clamp } from '../data/utils.js';
import { CASTAS } from '../data/classes.js';
import { byId } from '../dom.js';

export const hud = {
  buildSkillbar() {
    const p = this.player;
    const bar = byId('skillbar');
    bar.innerHTML = '';
    this.skillEls = [];
    const mk = (label, name, color, action) => {
      const d = document.createElement('div');
      d.className = 'skill';
      d.style.setProperty('--c', color);
      d.innerHTML = `<span class="skey">${label}</span><span class="sname">${name}</span><div class="cdfill"></div><div class="cdnum"></div>`;
      d.onclick = () => { if (this.state === 'play') action(); };
      bar.appendChild(d);
      return d;
    };
    this.skillEls.push(mk('J', 'Ataque', p.sub.color, () => this.doAttack()));
    p.allSkills().forEach((s, i) => {
      this.skillEls.push(mk(s.key, s.name, s.color, () => this.castSkill(i)));
    });
    const itH = mk('H', 'Bênção Suprema', '#fff3b0', () => this.useSupreme());
    itH.dataset.supreme = '1';
    this.skillEls.push(itH);
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
      if (el.dataset && el.dataset.supreme) continue;
      let cd = 0, max = 1;
      if (i === 0) { cd = p.attackCd; max = ((p.mw || p.sub.attack).cd || 1) / (1 + (p.atkSpd || 0) * 0.1); }
      else { const s = p.allSkills()[i - 1]; if (!s) continue; cd = p.cd[s.id]; max = s.cd; }
      const f = clamp(cd / max, 0, 1);
      el.querySelector('.cdfill').style.height = (f * 100) + '%';
      el.querySelector('.cdnum').textContent = cd > 0 ? cd.toFixed(1) : '';
    }
    if (this.skillEls[0]) this.skillEls[0].querySelector('.sname').textContent = p.mw ? p.mw.name : 'Ataque';
    for (const el of this.skillEls) {
      if (!el.dataset || !el.dataset.supreme) continue;
      const ready = p.supremeBlessed && p.supremeUses > 0;
      el.style.display = p.supremeBlessed ? '' : 'none';
      el.style.opacity = ready ? '1' : '0.35';
      el.querySelector('.sname').textContent = ready ? 'Bênção Suprema' : 'Consumida';
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
