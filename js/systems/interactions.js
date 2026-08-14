import { TILE } from '../data/constants.js';
import { REGIONS } from '../data/regions.js';
import { WALK_SPAWN } from '../world/tiles.js';
import { byId } from '../dom.js';

export const interactions = {
  tryInteract() {
    const npc = this.npcNear();
    if (!npc) return;
    if (npc.kind === 'forge') {
      this.state = 'forge';
      this.buildForge();
      byId('forge').classList.remove('hidden');
    } else if (npc.kind === 'shop') {
      this.state = 'shop';
      this.buildShop();
      byId('shop').classList.remove('hidden');
    } else if (npc.kind === 'skills') {
      this.state = 'skills';
      this.buildSkillShop();
      byId('skills').classList.remove('hidden');
    } else if (npc.kind === 'guide') {
      this.state = 'guide';
      byId('guidePanel').innerHTML = `<h2>${npc.name}</h2><p>${npc.text}</p><button class="btn" id="closeGuide">Entendido</button>`;
      byId('guide').classList.remove('hidden');
      byId('closeGuide').onclick = () => this.closeOverlay();
    } else if (npc.kind === 'church' || npc.kind === 'tavern' || npc.kind === 'tower') {
      this.state = 'building';
      this.openBuilding(npc);
      byId('bld').classList.remove('hidden');
    } else if (npc.kind === 'pope') {
      this.doPope(npc);
    } else if (npc.kind === 'talk') {
      this.doTalk(npc);
    } else if (npc.kind === 'seal') {
      this.trySeal(npc);
    }
  },

  trySeal(npc) {
    if (this.sealsBroken[npc.id]) {
      this.banner(npc.name + ' já se desfez.', '#7cff8a', 1.8);
      return;
    }
    const need = npc.need !== undefined ? npc.need : 3;
    if (this.progressLevel < need) {
      this.banner(npc.msg, '#ffd23f', 2.8);
      return;
    }
    // Requisito atingido: abre os segmentos liberados pelo nível atual.
    this.applyBarriers();
    this.sealsBroken[npc.id] = true;
    this.banner(npc.name + ' se desfez!', npc.color, 2.5);
    this.burst(npc.px, npc.py, npc.color, 20, 300);
    this.ring(npc.px, npc.py, 60, 0.8, npc.color, 5);
    this.shake += 6;
    this.sfx.upgrade();
  },

  // Abre os segmentos das barreiras (selos) liberados pelo nível de batalha atual.
  // Cada tile de entrada tem um nível associado (segLevels) e só é aberto quando
  // o jogador alcança aquele nível — removendo a barreira progressivamente.
  npcNear() {
    if (!this.player) return null;
    let best = null, bd = 70;
    for (const n of this.npcs) {
      const d = Math.hypot(n.px - this.player.x, n.py - this.player.y);
      if (d < bd) { bd = d; best = n; }
    }
    return best;
  },

  doPope(npc) {
    const p = this.player;
    const casta = p.sub.casta;
    this.state = 'talk';
    // O Milagre Supremo é um dom sacramental: desce somente pelas mãos ordenadas.
    // Leigos (Templários) e pagãos (Magos) recebem do Papa uma bênção de sustento.
    if (casta === 'clero') {
      if (p.supremeBlessed) {
        this.showDialog('👑 O Papa Leão XI',
          '"A fé já vos marcou, filho. Guardai a Bênção Suprema para a noite mais densa — pois ela desce uma única vez sobre a terra."<div class="confessTag">Bênção Suprema à vossa disposição (tecla H).</div>',
          '<button class="btn" id="dlgOk">Amém</button>');
      } else {
        p.supremeBlessed = true;
        p.supremeUses = 1;
        this.blessingFx(p, '#fff3b0', 28);
        this.sparkleFx(p, '#ffd23f', 20);
        this.sfx.upgrade();
        this.buildSkillbar();
        this.hud();
        this.showDialog('👑 O Papa Leão XI',
          '"Vós fostes digno de encontrar-me no ermo, fiel. Recebei o dom mais alto de Eclésia: a <b>Bênção Suprema</b>. Uma única vez ela descerá dos céus e aniquilará todo o mal ao redor de vós — mesmo o mais poderoso dos demônios não resiste à luz do Senhor. Usai-a com sabedoria, pois, consumida, não retornará nesta jornada."<div class="confessTag">✨ BÊNÇÃO SUPREMA CONCEDIDA — tecla H · Uso único · Aniquila qualquer ser na área do impacto</div>',
          '<button class="btn" id="dlgOk">Amém</button>');
      }
    } else if (casta === 'templarios') {
      if (npc.eventDone) {
        this.showDialog('👑 O Papa Leão XI',
          '"A fé já vos marcou, filho. Lutai, e o povo vos terá por guardião."',
          '<button class="btn" id="dlgOk">Amém</button>');
      } else {
        npc.eventDone = true;
        p.maxHp += 15; p.hp += 15; p.str += 5;
        this.blessingFx(p, '#ff9d5c', 20);
        this.sparkleFx(p, '#ffd23f', 14);
        this.sfx.upgrade();
        this.hud();
        this.showDialog('👑 O Papa Leão XI',
          '"Templário... a vossa espada é a oração do povo. Mas o Milagre Supremo desce somente pelas mãos ordenadas — nem a mais brava das espadas o invoca. Não vos invejo, filho: a vossa força é outra. Nasce da fé, da disciplina e da graça que recebeis de joelhos, como Elias e Sansão. Levai o meu favor: mais vida e mais vigor para a batalha que vos espera."<div class="confessTag">✨ Bênção do Papa: +15 de vida máxima · +5 de força (permanentes)</div>',
          '<button class="btn" id="dlgOk">Amém</button>');
      }
    } else {
      if (npc.eventDone) {
        this.showDialog('👑 O Papa Leão XI',
          '"Que o véu não vos devore, pagão. Cuidai dos vossos passos."',
          '<button class="btn" id="dlgOk">Amém</button>');
      } else {
        npc.eventDone = true;
        p.maxHp += 10; p.hp += 10; p.gold += 15;
        this.sparkleFx(p, '#c0b4ff', 16);
        this.sfx.upgrade();
        this.hud();
        this.showDialog('👑 O Papa Leão XI',
          '"Pagão... a vossa arte vem de onde a Igreja não alcança. Não posso descer o Milagre Supremo sobre vós — nem ele obedeceria a mãos não ungidas. Mas a luz acolhe até os errantes: tomai este dom de proteção e segui o vosso caminho."<div class="confessTag">✨ Bênção do Papa: +10 de vida máxima · +15 de ouro</div>',
          '<button class="btn" id="dlgOk">Amém</button>');
      }
    }
    byId('dlgOk').onclick = () => this.closeDialog();
  },

  // Posiciona o Papa num tile caminhável de uma região de perigo >= 2, longe da
  // vila — recompensando a exploração. Retorna false se não houver lugar bom.
  spawnPope() {
    const walk = WALK_SPAWN || new Set(['g', 'p', 'y', 'c', 'f', 'z', 'b', 'x', 's', 'd']);
    const regs = REGIONS.filter(r => r.id !== 'vila' && r.danger >= 2);
    if (!regs.length) return false;
    for (let tries = 0; tries < 50; tries++) {
      const r = regs[Math.floor(Math.random() * regs.length)];
      const gx = r.x + Math.floor(Math.random() * r.w);
      const gy = r.y + Math.floor(Math.random() * r.h);
      if (!walk.has(this.world.charFor(gx, gy))) continue;
      const papa = {
        id: 'papa', name: 'O Papa Leão XI', kind: 'pope',
        x: gx, y: gy, color: '#fff3b0', accent: '#ffd23f',
        px: gx * TILE, py: gy * TILE, bobT: 0,
        eventDone: false, confessed: false
      };
      this.npcs.push(papa);
      this.banner('Dizem que O PAPA vagou pela terra...', '#fff3b0', 3);
      return true;
    }
    return false;
  },

};
