import { randArr } from '../data/utils.js';
import { LORE, BIBLIA_PASSAGENS } from '../data/lore.js';
import { byId } from '../dom.js';

export const dialog = {
  // Próximo registro de lore ainda não descoberto para a casta (ordem de LORE).
  nextLoreId(casta) {
    const list = LORE[casta] || [];
    const found = this.loreDiscovered[casta] || [];
    for (const l of list) if (!found.includes(l.id)) return l.id;
    return null;
  },

  discoverLore(casta, id) {
    const found = (LORE[casta] || []).find(l => l.id === id);
    if (!found) return;
    const list = this.loreDiscovered[casta];
    if (!list || list.includes(id)) return;
    list.push(id);
    this.sfx.upgrade();
    this.banner('LORE: ' + found.title, '#ffe9b0', 2.5);
    this.state = 'talk';
    this.showDialog('📖 ' + found.title, found.text, '<button class="btn" id="dlgOk">Entendido</button>');
    byId('dlgOk').onclick = () => this.closeDialog();
    if (casta === 'clero') this.blessingFx(this.player, '#ffe66d', 12);
  },

  showDialog(title, body, buttonsHtml) {
    byId('dialogPanel').innerHTML = `<h2>${title}</h2><div class="dlgbody">${body}</div><div class="dlgbtns">${buttonsHtml || '<button class="btn" id="dlgOk">Continuar</button>'}</div>`;
    byId('dialog').classList.remove('hidden');
    // Seguro: se o caller não criou um handler para dlgOk, liga-o a closeDialog.
    const ok = byId('dlgOk');
    if (ok && !ok.onclick) ok.onclick = () => this.closeDialog();
  },

  closeDialog() {
    byId('dialog').classList.add('hidden');
    if (this.state !== 'win' && this.state !== 'death' && this.state !== 'menu') this.state = 'play';
  },

doTalk(npc) {
    const casta = this.player.sub.casta;
    const sub = this.player.sub;
    // Busca uma passagem bíblica aleatória baseada na casta do NPC/clero
    let passagemAleatoria = '';
    if (npc.kind === 'church' && npc.lines && npc.lines.clero) {
      passagemAleatoria = randArr(npc.lines.clero);
    } else if (npc.kind === 'church' && BIBLIA_PASSAGENS[casta]) {
      passagemAleatoria = randArr(BIBLIA_PASSAGENS[casta]);
    }
    const baseLine = (npc.lines && npc.lines[casta]) || (npc.text || '...');
    const finalLine = passagemAleatoria ? passagemAleatoria : baseLine;
    this.state = 'talk';
    // Confissão só disponível a Padre (ordained=true) e Bispo (ordained=true).
    // Verificar se é o Bispo central da cidade (kind === 'church' e id === 'bispo_central')
    const isCentralBishop = npc.id === 'bispo_central';
    
    // Se for o Bispo central, permitir confissão para Padre e Bispo (os que têm ordained=true)
    if (isCentralBishop && npc.event && npc.event === 'confess' && ((sub.ordained && casta === 'clero') || (sub.casta === 'clero' && sub.exorcistLevel >= 1))) {
      this.blessingFx(this.player, '#ffe66d', 14);
      this.showDialog('⛪ Confissão', `"${finalLine}"<div class="confessTag">— O SENHOR OUVE ATRAVÉS DE VOCÊ —</div>`, '<button class="btn" id="dlgConfess">Perdoar</button>');
      byId('dlgConfess').onclick = () => this.doConfession(npc);
      return;
    }
    // Se for o Bispo central e for Diácono, diálogo alternativo
    if (isCentralBishop && npc.event && npc.event === 'confess' && !sub.ordained && sub.exorcistLevel === 0) {
      this.showDialog('⛪ Caridade', `"${finalLine}"<div class="confessTag">— O SENHOR OUVE, mas o Bispo Cedric oferece consolo e orientação espiritual.</div>`, '<button class="btn" id="dlgOk">Continuar</button>');
      byId('dlgOk').onclick = () => this.closeDialog();
      this.text(this.player.x, this.player.y - 24, 'Conselho espiritual recebido', '#ffe66d', 14);
      this.hud();
      return;
    }
    // Confissão para outros NPCs (pároco, etc.) - regras antigas.
    // Só quem está ORDENADO (Padre/Bispo) administra confissão; a um Diácono
    // os fiéis não se abrem — ele proclama e abençoa, mas não confessa.
    if (npc.event && npc.event === 'confess' && sub.ordained && casta === 'clero' && !npc.eventDone) {
      this.blessingFx(this.player, '#ffe66d', 14);
      this.showDialog('⛪ Confissão', `"${finalLine}"<div class="confessTag">— O SENHOR OUVE ATRAVÉS DE VOCÊ —</div>`, '<button class="btn" id="dlgConfess">Perdoar</button>');
      byId('dlgConfess').onclick = () => this.doConfession(npc);
      return;
    }
    const extra = npc.eventDone ? '' : this.classEventButton(npc, casta);
    this.showDialog(npc.name, `"${finalLine}"`, extra + '<button class="btn ghost" id="dlgOk">Continuar</button>');
    byId('dlgOk').onclick = () => this.closeDialog();
    if (extra) {
      const btn = byId('dlgEvent');
      if (btn) btn.onclick = () => this.doClassEvent(npc);
    }
  },

  classEventButton(npc, casta) {
    if (!npc.event) return '';
    if (npc.event === 'war' && casta === 'templarios') return '<button class="btn" id="dlgEvent">Treinar (Grátis)</button>';
    if (npc.event === 'saber' && casta === 'mago') return '<button class="btn" id="dlgEvent">Estudar (+Int)</button>';
    if (npc.event === 'lore') return '';
    return '';
  },

// Confissão do Clero: cura + bênção temporária de dano + ganho permanente de vida
  // Se for confissão no Bispo Central (npc.id === 'bispo_central'), também aplica buff de Fé temporário.
  doConfession(npc) {
    const p = this.player;
    p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * 0.5));
    p.maxHp += 10;
    p.hp = Math.min(p.maxHp, p.hp + 10);
    p.int += 2;
    p.status.dmg = Math.max(p.status.dmg || 0, 0.35);
    p.status.spd = Math.max(p.status.spd || 0, 0.12);
    p.status.dur = Math.max(p.status.dur, 90);
    npc.eventDone = true;
    npc.confessed = true;
    this.healEffect(p);
    this.blessingFx(p, '#fff3b0', 20);
    // Se for o Bispo Central, aplicar buff de Fé temporário
    if (npc.id === 'bispo_central') {
      p.status.faith = (p.status.faith || 0) + 0.15; // +15% de dano e velocidade por 30s
      p.status.faithT = 30;
      this.banner('Bispo Cedric: +15% de Fé temporária!', '#a23b3b', 3);
    }
    this.sfx.heal();
    this.sfx.upgrade();
    this.discoverLore('clero', 'confissao');
    this.showDialog('⛪ Confissão Aceita', '"Que a luz do Senhor vos cubra, filho."<div class="confessTag">+10 de vida · +2 inteligência · dano +35% (temporário)</div>' + (npc.id === 'bispo_central' ? '<div class="confessTag">+15% Fé temporária</div>' : ''), '<button class="btn" id="dlgOk2">Amém</button>');
    byId('dlgOk2').onclick = () => this.closeDialog();
    this.hud();
  },

  doClassEvent(npc) {
    const casta = this.player.sub.casta;
    const p = this.player;
    if (npc.event === 'war' && casta === 'templarios') {
      p.str += 2;
      npc.eventDone = true;
      this.burst(p.x, p.y - 20, '#c0392b', 12, 200);
      this.text(p.x, p.y - 30, 'FORÇA +2', '#ff9d5c', 16);
      this.sfx.upgrade();
      // bônus de dano físico temporário
      p.status.dmg = Math.max(p.status.dmg || 0, 0.25);
      p.status.dur = Math.max(p.status.dur, 60);
      this.showDialog(npc.name, 'Treino concluído! Respeito conquistado.<div class="confessTag">+2 força · dano +25% (temporário)</div>', '<button class="btn" id="dlgOk2">Combatente!</button>');
    } else if (npc.event === 'saber' && casta === 'mago') {
      p.int += 3;
      npc.eventDone = true;
      this.burst(p.x, p.y - 20, '#7a6bd8', 12, 200);
      this.text(p.x, p.y - 30, 'INT +3', '#b07cff', 16);
      this.sfx.upgrade();
      this.showDialog(npc.name, 'A sabedoria flui dos glifos.<div class="confessTag">+3 inteligência</div>', '<button class="btn" id="dlgOk2">Erudito!</button>');
    }
    byId('dlgOk2').onclick = () => this.closeDialog();
    this.hud();
  },

  // Estabelecimentos por casta
  closeOverlay() {
    byId('shop').classList.add('hidden');
    byId('forge').classList.add('hidden');
    byId('guide').classList.add('hidden');
    byId('cheatpanel').classList.add('hidden');
    byId('records').classList.add('hidden');
    byId('skills').classList.add('hidden');
    byId('inventory').classList.add('hidden');
    byId('bld').classList.add('hidden');
    byId('dialog').classList.add('hidden');
    byId('bossintro').classList.add('hidden');
    // Restauro robusto do estado play: se o jogador não estiver em menu/morte/vitória,
    // o jogo volta sempre ao jogável — inclusive se state ficou "preso".
    if (this.state !== 'death' && this.state !== 'win' && this.state !== 'menu') this.state = 'play';
  },

};
