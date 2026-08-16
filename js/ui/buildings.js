import { MAX_TRAIN_REFLEX, MAX_BLESSINGS } from '../data/constants.js';
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
      // O grau do templo é definido pelo ministro: só a sede de um Bispo
      // administra Crisma e Ordenação — um Pároco (padre) não as realiza.
      const bldSub = npc.rank === 'bispo' ? 'Sede episcopal — plenitude do sacerdócio'
        : npc.rank === 'padre' ? 'Igreja da paróquia — a missa e as bênçãos'
        : 'Capela — oração e bênçãos';
      html = `<h2><span class="bldIcon">⛪</span> ${npc.name}</h2><div class="bldSub">${bldSub}</div><div class="goldline">Ouro: <b>${gold}</b></div><div class="items">`;
      // Ações específicas por grau
      // Diácono: Proclamar Palavra (não cura/missa, mas bênção de estudo)
      if (!sub.ordained && sub.exorcistLevel === 0) {
        html += `<div class="item"><div><b>Proclamar Palavra</b><div class="desc">Ler o Evangelho para a assembleia. +5 de inteligência. (Grátis)</div></div><button class="btn" data-bact="proclaim">Proclamar</button></div>`;
      }
      // Padre e Bispo: Missa (cura total + bênção temporária)
      if (sub.ordained && sub.exorcistLevel >= 1) {
        html += `<div class="item"><div><b>Missa</b><div class="desc">Celebrar a Eucaristia. Vida plena e bênção de combate temporária. (Grátis)</div></div><button class="btn" data-bact="mass">Missa</button></div>`;
      }
      // Crisma e Ordenação: exclusivas de um Bispo (jogador Bispo em sede episcopal)
      if (sub.exorcistLevel >= 2 && npc.rank === 'bispo') {
        html += `<div class="item"><div><b>Crisma</b><div class="desc">Administrar Crisma/Confirmação. +40 de vida máxima e +2 inteligência permanentes. (200 ●)</div></div><button class="btn" data-bact="chrism">Crisma</button></div>`;
        html += `<div class="item"><div><b>Ordenar</b><div class="desc">Ordenar novo Diácono/Padre. Recompensa divina única. (300 ●)</div></div><button class="btn" data-bact="ordain">Ordenar</button></div>`;
      }
      // Bênçãos sagradas: cada igreja/capela ensina bênçãos específicas.
      // Padres ensinam bênçãos comuns e intermediárias; Bispos, as mais raras.
      // Leigos (Templários e fiéis não ordenados) recebem apenas bênçãos de sustento.
      const layOnly = casta !== 'clero';
      if (npc.teaches && npc.teaches.length) {
        html += `<div class="item"><div><b>${layOnly ? '📿 BÊNÇÃOS DE SUSTENTO' : '📿 BÊNÇÃOS SAGRADAS'}</b><div class="desc">${npc.name} partilha um dom divino com quem busca a luz.${layOnly ? ' Aos leigos as bênçãos de sustento; os dons sacramentais são do Clero.' : ''}</div>`;
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
      // Todas as classes podem rezar (grátis)
      html += `<div class="item"><div><b>Rezar</b><div class="desc">Recupera toda a vida. (Grátis)</div></div><button class="btn" data-bact="pray">Rezar</button></div>`;
      html += `<div class="item"><div><b>Estudar Escrituras</b><div class="desc">+15 de vida máxima.<br>Custo crescente.</div></div><button class="btn" data-bact="bless">${100 + (this.shopN.igrejabless || 0) * 60}</button></div>`;
      html += `<div class="item"><div><b>Liturgia</b><div class="desc">Um trecho da palavra. Descobre parte da lore do Clero.</div></div><button class="btn" data-bact="liturgia">Ouvir</button></div>`;
      if (casta === 'clero') html += `<div class="hint">Vossa vocação vos autoriza aos dons sacramentais.</div>`;
      else if (casta === 'templarios') html += `<div class="hint">Leigos do Templo: as bênçãos de sustento são vossas; os sacramentos, do Clero. Vossa fé é a vossa força.</div>`;
      else html += `<div class="hint">Pagãos: tendes acesso apenas às bênçãos universais de sustento.</div>`;
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
    } else if (npc.kind === 'guild') {
      html = `<h2><span class="bldIcon">⚔</span> ${npc.name}</h2><div class="bldSub">Guarnição do Templo — juramento, aço e tradição</div><div class="goldline">Ouro: <b>${gold}</b></div><div class="items">`;
      html += `<div class="item"><div><b>O Juramento</b><div class="desc">Roderigo recita o código que fundou a Ordem. Desvenda a lore dos Templários.</div></div><button class="btn" data-bact="juramento">Ouvir</button></div>`;
      if (casta === 'templarios') {
        if (sub.id === 'guerreiro') {
          const done = this.shopN.provaCruz;
          html += `<div class="item"><div><b>Prova da Cruz</b><div class="desc">Medir forças contra o braço mais firme da guarnição. +6 de força permanente. (200 ●)</div></div>${
            done ? '<span class="owned">CUMPRIDA</span>' : '<button class="btn" data-bact="provaCruz">200</button>'}</div>`;
        } else if (sub.id === 'arqueiro') {
          const done = this.shopN.flechaPerfurante;
          html += `<div class="item"><div><b>Flecha Perfurante</b><div class="desc">A técnica secreta das flechas da Ordem: todas as vossas flechas atravessam o inimigo e seguem rumo ao próximo. (200 ●)</div></div>${
            done ? '<span class="owned">DOMINADA</span>' : '<button class="btn" data-bact="flecha">200</button>'}</div>`;
        } else {
          const done = this.shopN.forjaGuerra;
          html += `<div class="item"><div><b>Forja de Guerra</b><div class="desc">O olhar do engenho do Templo sobre o equipamento. +4 de força e +2 de inteligência permanentes. (200 ●)</div></div>${
            done ? '<span class="owned">FORJADA</span>' : '<button class="btn" data-bact="forjaGuerra">200</button>'}</div>`;
        }
        html += `<div class="hint">A Guarnição é a casa da vossa ordem: Guerreiro, Arqueiro ou Inventor, cada vínculo guarda o seu segredo.</div>`;
      } else if (casta === 'clero') {
        html += `<div class="hint">A Guarnição não abre doutrina a clérigos: o aço do Templo não se aprende na sacristia.</div>`;
      } else {
        html += `<div class="hint">A Guarnição não forma pagãos. O saber que vos interessa fica ao sul, entre os escombros.</div>`;
      }
    } else if (npc.kind === 'circulo') {
      html = `<h2><span class="bldIcon">🔮</span> ${npc.name}</h2><div class="bldSub">O Círculo Arcano — o véu, o saber e os iniciados</div><div class="goldline">Ouro: <b>${gold}</b></div><div class="items">`;
      html += `<div class="item"><div><b>O Círculo</b><div class="desc">Thalion conta a história pagã dos Magos e o seu lugar no mundo. Desvenda a lore dos Magos.</div></div><button class="btn" data-bact="circulo">Ouvir</button></div>`;
      if (casta === 'mago') {
        if (sub.id === 'elemental') {
          const done = this.shopN.dominioFogo;
          html += `<div class="item"><div><b>Domínio do Fogo</b><div class="desc">Afinar a chama interior com o véu. +6 de inteligência permanente. (200 ●)</div></div>${
            done ? '<span class="owned">DOMINADO</span>' : '<button class="btn" data-bact="dominioFogo">200</button>'}</div>`;
        } else if (sub.id === 'psiquico') {
          const done = this.shopN.expansaoMental;
          html += `<div class="item"><div><b>Expansão Mental</b><div class="desc">Abrir a mente ao que existe além do véu. +6 de inteligência permanente. (200 ●)</div></div>${
            done ? '<span class="owned">EXPANDIDA</span>' : '<button class="btn" data-bact="expansaoMental">200</button>'}</div>`;
        } else {
          const done = this.shopN.luzInterior;
          html += `<div class="item"><div><b>Luz Interior</b><div class="desc">Harmonizar a cura com o próprio ser. +4 de inteligência e +30 de vida máxima permanentes. (220 ●)</div></div>${
            done ? '<span class="owned">DOMINADA</span>' : '<button class="btn" data-bact="luzInterior">220</button>'}</div>`;
        }
        html += `<div class="hint">O Círculo não tem bispo: aqui se ascende pela prova do saber — Elemental, Psíquico ou Abençoador.</div>`;
      } else if (casta === 'clero') {
        html += `<div class="hint">Buscar este saber mancha a vossa vocação. O Erudito Tior o dizia; Thalion apenas sorri.</div>`;
      } else {
        html += `<div class="hint">O Círculo não forma pagãos. A vossa arte fica na Guarnição — ou onde o General caiu.</div>`;
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
        this.text(p.x, p.y - 30, 'INT +5', '#bfe8ff', 14);
        this.sfx.buff();
        this.banner('Palavra proclamada: ' + passagem, '#bfe8ff', 3);
        this.openBuilding(npc);
      } else if (act === 'mass' && sub.ordained && sub.exorcistLevel >= 1) {
        // Missa: celebração solene — vida plena, bênção temporária de combate
        // e uma frase litúrgica breve para marcar a participação na Eucaristia.
        const frases = [
          'Por Cristo, com Cristo e em Cristo...',
          'O Senhor está no meio de nós.',
          'Tomai e comei: isto é o meu Corpo, entregue por vós.',
          'Bendito o que vem em nome do Senhor.'
        ];
        const frase = frases[Math.floor(Math.random() * frases.length)];
        p.hp = p.maxHp;
        p.status.venom = 0; p.status.venomCd = 0;
        p.status.dmg = Math.max(p.status.dmg || 0, 0.15);
        p.status.spd = Math.max(p.status.spd || 0, 0.15);
        p.status.regen = Math.max(p.status.regen || 0, 0.02);
        p.status.dur = Math.max(p.status.dur || 0, 45);
        this.blessingFx(p, '#ffe66d', 20);
        this.ring(p.x, p.y, 110, 0.8, '#ffe66d', 6);
        this.sfx.heal();
        this.showDialog('⛪ Missa', `"${frase}"<div class="confessTag">Vida plena · dano e velocidade +15% · regeneração por 45s</div>`, '<button class="btn" id="dlgOkMass">Amém</button>');
        byId('dlgOkMass').onclick = () => this.closeOverlay();
        return;
      } else if (act === 'chrism' && sub.exorcistLevel >= 2 && npc.rank === 'bispo') {
        // Bispo: Crisma (exclusivo de sedes episcopais)
        p.maxHp += 40; p.int += 2;
        this.sparkleFx(p, '#7a6bd8', 16);
        this.sfx.upgrade();
        this.banner('Crisma administrado: vida +40, inteligência +2 (permanentes)', '#7a6bd8', 3);
        this.openBuilding(npc);
      } else if (act === 'ordain' && sub.exorcistLevel >= 2 && npc.rank === 'bispo') {
        // Bispo: Ordenar (premiação única) — exclusivo de sedes episcopais
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
    } else if (npc.kind === 'tower') {
      if (act === 'med') {
        p.hp = p.maxHp;
        const sk = p.allSkills();
        sk.forEach(s => { p.cd[s.id] = 0; });
        this.sparkleFx(p, '#c0b4ff', 16);
        this.sfx.heal();
        this.banner('Mente clara: vida e habilidades restauradas', '#c0b4ff', 2);
      } else if (act === 'grim') {
        // O Grimório é saber pagão dos Magos. O Erudito barra Clero e
        // Templários na hora — a interação não acontece para quem está fora.
        if (this.player.sub.casta !== 'mago') {
          this.eruditoRefusal();
          return;
        }
        this.discoverLore('mago', 'veo');
      } else if (act === 'consult') {
        if (!ok(150)) { this.openBuilding(npc); return; }
        p.int += 6;
        this.sparkleFx(p, '#7a6bd8', 16);
        this.sfx.upgrade();
        this.banner('Saber arcano: +6 de inteligência', '#b07cff', 2);
      }
    } else if (npc.kind === 'guild') {
      // Guarnição do Templo: treino e segredos da casta Templária.
      if (act === 'juramento') {
        const lc = casta === 'mago' ? 'mago' : (casta === 'clero' ? 'clero' : 'templarios');
        const next = this.nextLoreId(lc);
        if (casta === 'templarios') this.discoverLore('templarios', 'ordem');
        else if (next) this.discoverLore(lc, next);
        else this.banner('Roderigo não tem nada novo para narrar.', '#ff9d5c', 2);
      } else if (act === 'provaCruz') {
        if (sub.id !== 'guerreiro') return;
        if (this.shopN.provaCruz) { this.banner('A Prova da Cruz já foi cumprida.', '#7cff8a', 1.8); }
        else if (ok(200)) {
          this.shopN.provaCruz = 1;
          p.str += 6;
          this.burst(p.x, p.y - 20, '#c0392b', 16, 220);
          this.sfx.upgrade();
          this.banner('Prova da Cruz cumprida: +6 de força!', '#ff9d5c', 2.6);
        }
      } else if (act === 'flecha') {
        if (sub.id !== 'arqueiro') return;
        if (this.shopN.flechaPerfurante) { this.banner('A Flecha Perfurante já foi dominada.', '#7cff8a', 1.8); }
        else if (ok(200)) {
          this.shopN.flechaPerfurante = 1;
          this.burst(p.x, p.y - 20, '#f0e6c8', 16, 220);
          this.sfx.upgrade();
          this.banner('Flecha Perfurante: vossas flechas atravessam o inimigo!', '#f0e6c8', 2.8);
        }
      } else if (act === 'forjaGuerra') {
        if (sub.id !== 'inventor') return;
        if (this.shopN.forjaGuerra) { this.banner('A Forja de Guerra já foi aplicada.', '#7cff8a', 1.8); }
        else if (ok(200)) {
          this.shopN.forjaGuerra = 1;
          p.str += 4; p.int += 2;
          this.burst(p.x, p.y - 20, '#c98a2e', 16, 220);
          this.sfx.upgrade();
          this.banner('Forja de Guerra: +4 de força e +2 de inteligência!', '#ffb020', 2.6);
        }
      }
    } else if (npc.kind === 'circulo') {
      // Círculo Arcano: saber e aperfeiçoamento da casta Mago.
      if (act === 'circulo') {
        const lc = casta === 'mago' ? 'mago' : (casta === 'clero' ? 'clero' : 'templarios');
        const next = this.nextLoreId(lc);
        if (casta === 'mago') this.discoverLore('mago', 'circulo');
        else if (next) this.discoverLore(lc, next);
        else this.banner('Thalion nada tem de novo para contar.', '#b07cff', 2);
      } else if (act === 'dominioFogo') {
        if (sub.id !== 'elemental') return;
        if (this.shopN.dominioFogo) { this.banner('O Domínio do Fogo já foi dominado.', '#7cff8a', 1.8); }
        else if (ok(200)) {
          this.shopN.dominioFogo = 1;
          p.int += 6;
          this.burst(p.x, p.y - 20, '#e67e22', 16, 220);
          this.sfx.upgrade();
          this.banner('Domínio do Fogo: +6 de inteligência!', '#ffb35c', 2.6);
        }
      } else if (act === 'expansaoMental') {
        if (sub.id !== 'psiquico') return;
        if (this.shopN.expansaoMental) { this.banner('A Expansão Mental já foi expandida.', '#7cff8a', 1.8); }
        else if (ok(200)) {
          this.shopN.expansaoMental = 1;
          p.int += 6;
          this.burst(p.x, p.y - 20, '#d8b4ff', 16, 220);
          this.sfx.upgrade();
          this.banner('Expansão Mental: +6 de inteligência!', '#b07cff', 2.6);
        }
      } else if (act === 'luzInterior') {
        if (sub.id !== 'abencoador') return;
        if (this.shopN.luzInterior) { this.banner('A Luz Interior já foi dominada.', '#7cff8a', 1.8); }
        else if (ok(220)) {
          this.shopN.luzInterior = 1;
          p.int += 4; p.maxHp += 30; p.hp += 30;
          this.burst(p.x, p.y - 20, '#2980b9', 16, 220);
          this.sfx.upgrade();
          this.banner('Luz Interior: +4 de inteligência e +30 de vida!', '#bfe8ff', 2.6);
        }
      }
    }
    this.openBuilding(npc);
    this.hud();
  },

  // Reação do Erudito ao ver alguém de fora tentar ler o Grimório: recusa
  // imediata e curta, coerente com a lore — saber pagão não pertence a
  // clérigos (transgressão à vocação) nem a templários (fora da missão).
  eruditoRefusal() {
    const casta = this.player.sub.casta;
    const msg = casta === 'clero'
      ? '"Você não deveria estar aqui. Buscar saber pagão mancha a vossa vocação — vossa luz vem do Senhor, não do véu."'
      : '"Você não deveria estar aqui. Esta arte não pertence à vossa missão."';
    this.showDialog('🔮 Erudito Tior', msg, '<button class="btn" id="dlgOk">Sair</button>');
    byId('dlgOk').onclick = () => this.closeOverlay();
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
    const newB = Object.assign({}, b);
    p.blessings.push(newB);
    p.cd[newB.id] = 0;
    p.tryEquip(newB.id);
    this.sfx.upgrade();
    this.burst(p.x, p.y - 20, b.color, 14, 200);
    this.blessingFx(p, b.color, 16);
    this.buildSkillbar();
    this.hud();
    this.banner('✨ ' + newB.name + ' aprendida! Equipe-a na hotbar (tecla I).', b.color, 2.6);
    this.openBuilding(npc);
  },

};
