import { HOTBAR_SLOTS, T } from '../data/constants.js';
import { EXTRA_SKILLS } from '../data/skills.js';
import { byId } from '../dom.js';

const KEY_LABELS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

// Dica contextual reutilizável: qualquer elemento com [data-tip] mostra o texto.
// Delegado via document para sobreviver ao rebuild do painel e ao HUD.
const tooltip = document.createElement('div');
tooltip.id = 'tooltip';
tooltip.className = 'hidden';
document.body.appendChild(tooltip);
document.addEventListener('mouseover', e => {
  const t = e.target && e.target.closest ? e.target.closest('[data-tip]') : null;
  if (!t) { tooltip.classList.add('hidden'); return; }
  tooltip.textContent = t.getAttribute('data-tip');
  tooltip.classList.remove('hidden');
});
document.addEventListener('mousemove', e => {
  if (tooltip.classList.contains('hidden')) return;
  tooltip.style.left = Math.min(e.clientX + 14, window.innerWidth - 300) + 'px';
  tooltip.style.top = (e.clientY + 18) + 'px';
});
document.addEventListener('mouseleave', () => tooltip.classList.add('hidden'));

export const inventory = {
  invSel: null,   // habilidade selecionada para atribuir a um slot
  drag: null,     // payload do arrastar: { id, source: 'inv' | 'slot' }

  openInventory() {
    if (!this.player) return;
    this.state = 'inventory';
    this.invSel = null;
    this.buildInventory();
    byId('inventory').classList.remove('hidden');
  },

  hotbarCount(p) {
    let n = 0;
    for (const id of p.hotKeys) if (id) n++;
    return n;
  },

  buildInventory() {
    const p = this.player;
    if (!p) return;
    const el = byId('inventoryPanel');
    const equipped = this.hotbarCount(p);
    el.innerHTML = `
      <h2>INVENTÁRIO</h2>
      <div class="sub">O aprendizado é livre — a <b>hotbar</b> comporta até ${HOTBAR_SLOTS} habilidades equipadas (teclas 1–0) para uso rápido em combate.</div>
      <div class="invbar-label">HOTBAR · ${equipped}/${HOTBAR_SLOTS} equipadas · clique num ocupado para remover · arraste para rearranjar</div>
      <div class="inv-hotbar">${this.hotbarHtml(p)}</div>
      ${this.assignBarHtml(p)}
      <div class="inv-sec">HABILIDADES APRENDIDAS</div>
      <div class="invlist">${this.learnedHtml(p)}</div>
      <div class="inv-sec">DISPONÍVEIS PARA APRENDER</div>
      <div class="invlist">${this.availableHtml(p)}</div>
      <button class="btn ghost" id="closeInventory">Fechar (Esc)</button>
    `;
    this.bindInventory(p, el);
  },

  hotbarHtml(p) {
    let html = '';
    for (let i = 0; i < HOTBAR_SLOTS; i++) {
      const s = p.hotSkill(i);
      const color = s ? s.color : '#4a5468';
      html += `<div class="invslot${s ? '' : ' empty'}" data-slot="${i}" style="--c:${color}"${s ? ' draggable="true"' : ''}>
        <span class="skey">${KEY_LABELS[i]}</span>
        <span class="sicon" style="background:${color}"></span>
        <span class="iname">${s ? s.name : '+'}</span>
        ${s ? '<span class="drem" title="Remover da hotbar">✕</span>' : ''}
      </div>`;
    }
    return html;
  },

  statsHtml(p, s) {
    const parts = [];
    if (s.type) {
      const tip = s.type === T.PHYS
        ? 'Físico: dano que escala com a Força (atual: ' + p.str + ').'
        : s.type === T.HOLY
          ? 'Sagrado: dano da fé, escala com a Inteligência (atual: ' + p.int + '). Muitas criaturas das trevas são fracas a ele.'
          : 'Mágico: dano arcano, escala com a Inteligência (atual: ' + p.int + ').';
      const label = s.type === T.PHYS ? 'Físico' : s.type === T.HOLY ? 'Sagrado' : 'Mágico';
      parts.push(`<span class="stat badge" data-tip="${tip}">${label}</span>`);
    }
    if (s.dmg != null) {
      const tip = s.type
        ? 'Multiplicador de dano aplicado sobre o dano base (arma + atributo + bônus). Dano atual aproximado: ~' + this.calcStatDmg(s.type, s.dmg) + '.'
        : 'Dano causado pela habilidade.';
      parts.push(`<span class="stat" data-tip="${tip}">Dano ×${s.dmg}</span>`);
    }
    if (s.heal != null) parts.push(`<span class="stat" data-tip="Vida recuperada ao usar a habilidade.">Cura +${Math.round((s.heal || 0) * 100)}%</span>`);
    if (s.shield != null) parts.push(`<span class="stat" data-tip="Dano absorvido enquanto o escudo durar.">Escudo ${s.shield}</span>`);
    if (s.dist != null) parts.push(`<span class="stat" data-tip="Distância percorrida pelo deslocamento/teleporte, em pixels.">Distância ${s.dist}px</span>`);
    if (s.dur != null) parts.push(`<span class="stat" data-tip="Duração do efeito, em segundos.">Duração ${s.dur}s</span>`);
    if (s.freeze != null) parts.push(`<span class="stat" data-tip="Tempo em que os inimigos ficam congelados.">Congela ${s.freeze}s</span>`);
    parts.push(`<span class="stat" data-tip="Cooldown: tempo de espera (em segundos) até poder usar a habilidade novamente.">CD ${s.cd}s</span>`);
    return parts.join('');
  },

  learnedHtml(p) {
    const known = p.allKnownSkills();
    if (!known.length) return '<p class="desc">Nenhuma habilidade aprendida ainda.</p>';
    return known.map(s => {
      const slot = p.findSlot(s.id);
      let tag;
      if (s.bless === 'supreme') {
        tag = slot === -1
          ? `<span class="tag ${p.supremeUses > 0 ? 'free' : 'spent'}">${p.supremeUses > 0 ? 'NÃO EQUIPADA' : 'CONSUMIDA'}</span>`
          : `<span class="tag ${p.supremeUses > 0 ? 'eq' : 'spent'}">${p.supremeUses > 0 ? 'EQUIPADA · tecla ' + KEY_LABELS[slot] : 'CONSUMIDA'}</span>`;
      } else {
        tag = slot === -1
          ? '<span class="tag free">NÃO EQUIPADA</span>'
          : `<span class="tag eq">EQUIPADA · tecla ${KEY_LABELS[slot]}</span>`;
      }
      return `<div class="invrow${this.invSel === s.id ? ' sel' : ''}" data-id="${s.id}" draggable="true" style="--c:${s.color}">
        <div class="sicon" style="background:${s.color}"></div>
        <div class="meta">
          <b>${s.name}</b>
          <div class="stats">${this.statsHtml(p, s)}</div>
          <div class="desc">${s.desc}</div>
        </div>
        <div class="side">${tag}</div>
      </div>`;
    }).join('');
  },

  availableHtml(p) {
    const rows = EXTRA_SKILLS.filter(sk =>
      !p.extraSkills.some(x => x.id === sk.id) &&
      !(sk.id === 'reza_maior' && p.sub.casta !== 'clero'));
    const list = rows.length
      ? rows.map(s => `<div class="invrow" style="--c:${s.color}">
          <div class="sicon" style="background:${s.color}"></div>
          <div class="meta"><b>${s.name}</b><div class="desc">${s.desc}</div></div>
          <div class="side"><span class="tag lock">MESTRE DAS ARTES · ${s.cost} ●</span></div>
        </div>`).join('')
      : '<p class="desc">Você já aprendeu todas as habilidades do Mestre das Artes!</p>';
    return list + '<p class="desc">Bênçãos sagradas são ensinadas por Padres e Bispos espalhados pelo mundo.</p>';
  },

  assignBarHtml(p) {
    if (!this.invSel) return '';
    const s = p.learnedSkill(this.invSel);
    if (!s) return '';
    const slot = p.findSlot(s.id);
    const btns = KEY_LABELS.map((k, i) =>
      `<button class="slotbtn" data-assign="${i}" title="Atribuir à tecla ${k}">${k}</button>`).join('');
    return `<div class="assignbar">
      <span class="lbl">Atribuir «${s.name}» ao slot:</span>${btns}
      ${slot !== -1 ? `<button class="btn ghost min" data-remove="1">Remover (tecla ${KEY_LABELS[slot]})</button>` : ''}
      <button class="btn ghost min" data-cancel="1">Cancelar</button>
    </div>`;
  },

  bindInventory(p, el) {
    el.querySelectorAll('.invrow[data-id]').forEach(row => {
      const id = row.dataset.id;
      row.onclick = () => {
        this.invSel = this.invSel === id ? null : id;
        this.buildInventory();
      };
      row.addEventListener('dragstart', e => {
        this.drag = { id, source: 'inv' };
        e.dataTransfer.setData('text/plain', id);
        e.dataTransfer.effectAllowed = 'move';
      });
    });

    el.querySelectorAll('.invslot').forEach(slotEl => {
      const i = +slotEl.dataset.slot;
      slotEl.addEventListener('click', ev => {
        ev.stopPropagation();
        const skill = p.hotSkill(i);
        if (!skill) return;
        p.unequipSlot(i);
        this.invSel = null;
        this.afterEquip();
      });
      slotEl.addEventListener('dragover', ev => {
        ev.preventDefault();
        ev.dataTransfer.dropEffect = 'move';
        slotEl.classList.add('dragover');
      });
      slotEl.addEventListener('dragleave', () => slotEl.classList.remove('dragover'));
      slotEl.addEventListener('drop', ev => {
        ev.preventDefault();
        slotEl.classList.remove('dragover');
        if (this.drag && this.drag.id) p.equipSkill(this.drag.id, i);
        this.drag = null;
        this.invSel = null;
        this.afterEquip();
      });
      const skill = p.hotSkill(i);
      if (skill) {
        slotEl.addEventListener('dragstart', ev => {
          this.drag = { id: skill.id, source: 'slot' };
          ev.dataTransfer.setData('text/plain', skill.id);
          ev.dataTransfer.effectAllowed = 'move';
        });
      }
    });

    el.querySelectorAll('[data-assign]').forEach(b => {
      b.onclick = () => {
        if (!this.invSel) return;
        this.player.equipSkill(this.invSel, +b.dataset.assign);
        this.invSel = null;
        this.afterEquip();
      };
    });
    el.querySelectorAll('[data-remove]').forEach(b => {
      b.onclick = () => {
        if (!this.invSel) return;
        const slot = this.player.findSlot(this.invSel);
        if (slot !== -1) this.player.unequipSlot(slot);
        this.invSel = null;
        this.afterEquip();
      };
    });
    el.querySelectorAll('[data-cancel]').forEach(b => {
      b.onclick = () => { this.invSel = null; this.buildInventory(); };
    });

    byId('closeInventory').onclick = () => this.closeOverlay();
  },

  afterEquip() {
    this.buildInventory();
    this.buildSkillbar();
    this.hud();
  },

};