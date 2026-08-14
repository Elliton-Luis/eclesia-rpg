import { MAX_TRAIN_REFLEX, MAX_BLESSINGS, BLESSING_KEYS } from '../data/constants.js';
import { BLESSINGS } from '../data/blessings.js';
import { byId } from '../dom.js';

export const buildings = {
  openBuilding(npc) {
    const p = this.player;
    const casta = p.sub.casta;
    const sub = p.sub;
    const gold = p.gold;
    let html = '';
    if (npc.kind === 'church') {
      html = `<h2><span class="bldIcon">⛪</span> ${npc.name}</h2><div class="bldSub">Casa do Clero — lugar seguro</div><div class="goldline">Ouro: <b>${gold}</b></div><div class="items">`;
      // Ações específicas por grau
      // Diácono: Proclamar Palavra (não cura/missa, mas bénção de estudo)
      if (!sub.ordained && sub.exorcistLevel === 0) {
        html += `<div class="item"><div><b>Proclamar Palavra</b><div class="desc">Ler o Evangelho para a assembleia. +10 de inteligência temporário. (Grátis)</div></div><button class="btn" data-bact="proclaim">Proclamar</button></div>`;
      }
      // Padre: Missa (cura total + buff)
      if (sub.ordained && sub.exorcistLevel >= 1) {
        html += `<div class="item"><div><b>Missa</b><div class="desc">Celebrar a Eucaristia. Cura total e +30 de vida máxima. (100 ●)</div></div><button class="btn" data-bact="mass">Missa</button></div>`;
      }
      // Bispo: Crisma e Ordenação
      if (sub.exorcistLevel >= 2) {
        html += `<div class="item"><div><b>Crisma</b><div class="desc">Administrar Crisma/Confirmação. +40 de vida máxima e +2 inteligência permanentes. (200 ●)</div></div><button class="btn" data-bact="chrism">Crisma</button></div>`;
        html += `<div class="item"><div><b>Ordenar</b><div class="desc">Ordenar novo Diácono/Padre. Recompensa divina única. (300 ●)</div></div><button class="btn" data-bact="ordain">Ordenar</button></div>`;
      }
      // Bênçãos sagradas: cada igreja/capela ensina bênçãos específicas.
      // Padres ensinam bênçãos comuns e intermediárias; Bispos, as mais raras.
      // Leigos (Templários e fiéis não ordenados) recebem apenas bênçãos de sustento.
      const layOnly = casta !== 'clero';
      if (npc.teaches && npc.teaches.length) {
        html += `<div class="item"><div><b>${layOnly ? '📿 BÊNÇÃOS DE SUSTENTO' : '📿 BÊNÇÃOS SAGRADAS'}</b><div class="desc">${npc.name} partilha um dom divino com quem busca a luz.${layOnly ? ' Aos leigos cabem as bênçãos de sustento, força e proteção — os dons sacramentais pertencem ao Clero ordenado.' : ''}</div>`;
        let shown = 0;
        for (const bid of npc.teaches) {
          const b = BLESSINGS[bid];
          if (!b) continue;
          if (layOnly && !b.lay) continue;
          shown++;
          const has = p.blessings.some(x => x.id === bid);
          const full = p.blessings.length >= MAX_BLESSINGS;
          html += `<div class="blessRow"><span style="color:${b.color}">✦</span><div><b>${b.name}</b><div class="desc">${b.desc}${b.tier >= 3 ? ' <span class="owned">[RARA]</span>' : ''}</div></div>${
            has ? '<span class="owned">APRENDIDA</span>'
              : full ? '<span class="owned">LIMITE</span>'
              : `<button class="btn" data-bact="bless_${bid}">Aprender</button>`}</div>`;
        }
        if (layOnly && shown === 0) {
          html += `<div class="desc" style="padding:6px 0">Aqui se guardam dons sacramentais que só os ordenados podem receber.</div>`;
        }
        html += `</div></div>`;
      }
      // Padre também pode fazer Missa se exorcistLevel == 1 (já coberto acima)
      // Todas as classes podem rezar (grátis)
      html += `<div class="item"><div><b>Rezar</b><div class="desc">Recupera toda a vida. (Grátis)</div></div><button class="btn" data-bact="pray">Rezar</button></div>`;
      html += `<div class="item"><div><b>Estudar Escrituras</b><div class="desc">+15 de vida máxima.<br>Custo crescente.</div></div><button class="btn" data-bact="bless">${100 + (this.shopN.igrejabless || 0) * 60}</button></div>`;
      html += `<div class="item"><div><b>Liturgia</b><div class="desc">Um trecho da palavra. Descobre parte da lore do Clero.</div></div><button class="btn" data-bact="liturgia">Ouvir</button></div>`;
      if (casta === 'clero') html += `<div class="hint">Vossa vocação vos autoriza aos dons sacramentais.</div>`;
      else if (casta === 'templarios') html += `<div class="hint">Leigos do Templo: rezai e recebei as bênçãos de sustento, força e proteção. Não sois um padre com espada — mas a vossa fé move montanhas (Elias e Sansão que o digam).</div>`;
      else html += `<div class="hint">A Igreja vos recebe com reserva, pagão. Apenas as bênçãos universais de sustento são concedidas a quem está de fora.</div>`;
    } else if (npc.kind === 'tavern') {
      html = `<h2><span class="bldIcon">🍺</span> ${npc.name}</h2><div class="bldSub">Guarnição do Templo — aço e histórias</div><div class="goldline">Ouro: <b>${gold}</b></div><div class="items">`;
      html += `<div class="item"><div><b>Cerveja & Caldo</b><div class="desc">Recupera toda a vida. (30 ●)</div></div><button class="btn" data-bact="drink">30</button></div>`;
      html += `<div class="item"><div><b>Histórias de Guerra</b><div class="desc">Revela segredos da fronteira.</div></div><button class="btn" data-bact="hist">Ouvir</button></div>`;
      if (casta === 'templarios') html += `<div class="item"><div><b>Treino Forjado</b><div class="desc">+5 de força permanente. (150 ●)</div></div><button class="btn" data-bact="train">150</button></div>`;
      // Treino de Reflexos: aumenta velocidade de ataque/disparo (todas as castas).
      {
        const n = this.shopN.trainreflex || 0;
        const maxed = n >= MAX_TRAIN_REFLEX;
        const cost = 100 + n * 80;
        html += `<div class="item"><div><b>Treino de Reflexos</b><div class="desc">+10% de velocidade de ataque/disparo por treino. Atual: <b>+${Math.round(p.atkSpd * 10)}%</b>.${maxed ? ' (no máximo!)' : ''}</div></div>${
          maxed ? '<span class="owned">MÁXIMO</span>' : `<button class="btn" data-bact="trainreflex">${cost}</button>`}</div>`;
      }
    } else { // tower
      html = `<h2><span class="bldIcon">🔮</span> ${npc.name}</h2><div class="bldSub">Torre Arcana — saber e mistério</div><div class="goldline">Ouro: <b>${gold}</b></div><div class="items">`;
      html += `<div class="item"><div><b>Meditar</b><div class="desc">Recupera a vida e abre os canais. (Grátis)</div></div><button class="btn" data-bact="med"></button></div>`;
      html += `<div class="item"><div><b>Grimório da Torre</b><div class="desc">Revela a história do véu arcano.</div></div><button class="btn" data-bact="grim">Ler</button></div>`;
      if (casta === 'mago') html += `<div class="item"><div><b>Consulta Arcano</b><div class="desc">+6 de inteligência permanente. (150 ●)</div></div><button class="btn" data-bact="consult">150</button></div>`;
    }
    html += `</div><button class="btn ghost" id="closeBld">Sair (Esc)</button>`;
    byId('bldPanel').innerHTML = html;
    byId('bldPanel').querySelectorAll('[data-bact]').forEach(b => b.onclick = () => this.buildingAction(npc, b.dataset.bact));
    byId('closeBld').onclick = () => this.closeOverlay();
  },

  buildingAction(npc, act) {
    const p = this.player;
    const casta = p.sub.casta;
    const sub = p.sub;
    const ok = (goldCost) => { if (this.cheats.gold) return true; if (p.gold >= goldCost) { p.gold -= goldCost; return true; } this.banner('Ouro insuficiente', '#ff5c5c', 1.5); return false; };

    if (npc.kind === 'church') {
      if (act === 'pray') {
        p.hp = p.maxHp;
        p.status.venom = 0; p.status.venomCd = 0; p.status.dmg = 0; p.status.spd = 0; p.status.dur = 0;
        this.blessingFx(p, '#ffe66d', 16);
        this.sfx.heal();
        this.banner('Você reza e nada mais te alcança.', '#ffe9b0', 2);
      } else if (act === 'bless') {
        if (!ok(100 + (this.shopN.igrejabless || 0) * 60)) { this.openBuilding(npc); return; }
        this.shopN.igrejabless = (this.shopN.igrejabless || 0) + 1;
        p.maxHp += 15; p.hp += 15;
        this.blessingFx(p, '#fff3b0', 14);
        this.sfx.buy();
        this.banner('Bênção permanente: +15 de vida máxima', '#ffe9b0', 2.2);
      } else if (act === 'liturgia') {
        const lc = casta === 'mago' ? 'mago' : (casta === 'clero' ? 'clero' : 'templarios');
        const next = this.nextLoreId(lc);
        if (next) this.discoverLore(lc, next);
        else this.banner('Já ouvistes toda a palavra.', '#ffe9b0', 2);
      } else if (act === 'proclaim' && !sub.ordained && sub.exorcistLevel === 0) {
        // Diácono: Proclamar Palavra
        // Verificar cooldown - não permitir proclamar novamente enquanto fatigue durar
        if (p.status.fatigue > 0) {
          this.banner('Cansaço: espere a proclamação terminar', '#ffb020', 1.5);
          this.openBuilding(npc);
          return;
        }
        // Escolher passagem bíblica aleatória para a proclamação
        const passagens = [
          '"O Senhor é o meu pastor; nada me faltarei." - Salmo 23:1',
          '"Eu vim para que tenham vida, e a tenham em abundância." - João 10:10',
          '"Acredita em mim, e serás salvo." - Atos 16:31',
          '"A graça do nosso Senhor Jesus Cristo, o amor de Deus e a comunhão do Espírito Santo esteja com todos vós." - 2 Coríntios 13:14',
          '"Posso tudo naquele que me fortalece." - Filipenses 4:13'
        ];
        const passagem = passagens[Math.floor(Math.random() * passagens.length)];
        // Bônus temporário de inteligência com exaustão após
        p.int += 5; // bônus menor, temporário
        p.status.fatigue = 20; // 20s de exaustão após proclamar
        this.burst(p.x, p.y - 20, '#bfe8ff', 8, 150);
        this.text(p.x, p.y - 30, 'INT +5 TEMP.', '#bfe8ff', 14);
        this.sfx.buff();
        this.banner('Palavra proclamada: ' + passagem, '#bfe8ff', 3);
        this.openBuilding(npc);
      } else if (act === 'mass' && sub.ordained && sub.exorcistLevel >= 1) {
        // Padre: Missa
        p.hp = p.maxHp + 30;
        p.maxHp += 30;
        this.blessingFx(p, '#ffe66d', 16);
        this.sfx.heal();
        this.banner('Missa celebrada: vida +30 (permanente)', '#ffe66d', 3);
        this.openBuilding(npc);
      } else if (act === 'chrism' && sub.exorcistLevel >= 2) {
        // Bispo: Crisma
        p.maxHp += 40; p.int += 2;
        this.sparkleFx(p, '#7a6bd8', 16);
        this.sfx.upgrade();
        this.banner('Crisma administrado: vida +40, inteligência +2 (permanentes)', '#7a6bd8', 3);
        this.openBuilding(npc);
      } else if (act === 'ordain' && sub.exorcistLevel >= 2) {
        // Bispo: Ordenar (premiação única)
        this.banner('Um novo ministro ungido surge em Eclésia.', '#c0392b', 3);
        this.sfx.buy();
        this.stats.powerups++;
        this.openBuilding(npc);
      } else if (act.indexOf('bless_') === 0) {
        this.learnBlessing(act.slice(6), npc);
        return;
      }
    } else if (npc.kind === 'tavern') {
      if (act === 'drink') {
        if (!ok(30)) { this.openBuilding(npc); return; }
        p.hp = p.maxHp;
        this.sfx.heal();
        this.banner('Cerveja e caldo quente! Vida cheia.', '#ffd27f', 2);
      } else if (act === 'hist') {
        if (casta === 'templarios') this.discoverLore('templarios', this.loreDiscovered.templarios.includes('fronteira') ? 'guarnicao' : 'fronteira');
        else this.discoverLore('templarios', 'fronteira');
      } else if (act === 'train') {
        if (!ok(150)) { this.openBuilding(npc); return; }
        p.str += 5;
        this.burst(p.x, p.y - 20, '#c0392b', 12, 200);
        this.sfx.upgrade();
        this.banner('Músculo de aço: +5 de força', '#ff9d5c', 2);
      } else if (act === 'trainreflex') {
        const n = this.shopN.trainreflex || 0;
        if (n >= MAX_TRAIN_REFLEX) { this.banner('Reflexos no máximo!', '#7cff8a', 1.5); }
        else {
          const cost = 100 + n * 80;
          if (!ok(cost)) { this.openBuilding(npc); return; }
          this.shopN.trainreflex = n + 1;
          p.atkSpd = (p.atkSpd || 0) + 1;
          this.burst(p.x, p.y - 20, '#ffb020', 12, 200);
          this.sfx.upgrade();
          this.banner('Reflexos treinados! Ataque/disparo +10% (total: +' + Math.round(p.atkSpd * 10) + '%)', '#ffb020', 2.2);
        }
      }
    } else { // tower
      if (act === 'med') {
        p.hp = p.maxHp;
        const sk = p.allSkills();
        sk.forEach(s => { p.cd[s.id] = 0; });
        this.sparkleFx(p, '#c0b4ff', 16);
        this.sfx.heal();
        this.banner('Mente clara: vida e habilidades restauradas', '#c0b4ff', 2);
      } else if (act === 'grim') {
        this.discoverLore('mago', 'veo');
      } else if (act === 'consult') {
        if (!ok(150)) { this.openBuilding(npc); return; }
        p.int += 6;
        this.sparkleFx(p, '#7a6bd8', 16);
        this.sfx.upgrade();
        this.banner('Saber arcano: +6 de inteligência', '#b07cff', 2);
      }
    }
    this.openBuilding(npc);
    this.hud();
  },

  learnBlessing(id, npc) {
    const p = this.player;
    const b = BLESSINGS[id];
    if (!b || !npc.teaches || !npc.teaches.includes(id)) return;
    // Leigos não recebem dons sacramentais/ofensivos — apenas as bênçãos de sustento.
    if (p.sub.casta !== 'clero' && !b.lay) {
      this.banner('Os dons sacramentais pertencem aos ordenados. Como leigo, só as bênçãos de sustento vos são dadas.', '#ffd23f', 2.6);
      return;
    }
    if (p.blessings.some(x => x.id === id)) { this.banner('Esta bênção já foi aprendida.', '#ff9d5c', 1.5); return; }
    if (p.blessings.length >= MAX_BLESSINGS) { this.banner('Limite de bênçãos atingido (' + MAX_BLESSINGS + ' aprendidas).', '#ff9d5c', 2); return; }
    const key = BLESSING_KEYS[p.blessings.length];
    const newB = Object.assign({}, b, { key });
    p.blessings.push(newB);
    p.cd[newB.id] = 0;
    this.sfx.upgrade();
    this.burst(p.x, p.y - 20, b.color, 14, 200);
    this.blessingFx(p, b.color, 16);
    this.buildSkillbar();
    this.hud();
    this.banner('✨ ' + newB.name + ' aprendida! (tecla ' + key + ')', b.color, 2.6);
    this.openBuilding(npc);
  },

};
