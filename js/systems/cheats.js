import { MAX_BLESSINGS } from '../data/constants.js';
import { weaponDamage } from '../data/utils.js';
import { BLESSINGS } from '../data/blessings.js';
import { SUBCLASSES } from '../data/classes.js';
import { EXTRA_SKILLS } from '../data/skills.js';
import { RELICS, MAX_RELICS } from '../data/relics.js';
import { SHOP } from '../data/shop.js';
import { MONSTERS } from '../data/monsters.js';
import { Monster } from '../entities/monster.js';
import { byId } from '../dom.js';

// ---------------------------------------------------------------------------
// Padrão de cheats (painel F3):
//  • Todos os comandos usam o prefixo "/" (ex.: /get, /stats, /matar) — sem
//    misturar com comandos sem barra.
//  • Ids são snake_case sem acento (bencao_suprema, fogo_fatuo, ...). O parser
//    também aceita o NOME com acento/espaço ("Benção Suprema", "Fogo-fátuo")
//    via normalização automática — mesma regra para todos os comandos.
//  • Comando/id/argumento inválido NUNCA falha em silêncio: sempre banner
//    vermelho + log no console apontando o que não foi encontrado.
//  • Cheats afetam apenas o estado da RUN atual: nada é gravado no
//    localStorage (eclesia_v1) nem em flags de progressão persistente.
// ---------------------------------------------------------------------------

// Normaliza texto para snake_case sem acento (id ou nome): "Bênção Suprema" e
// "Benção Suprema" → "bencao_suprema". Aplica-se a TODOS os ids/nomes.
const normId = s => String(s || '')
  .toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')   // tira acentos
  .replace(/[^a-z0-9]+/g, '_')                        // espaço/pontuação → _
  .replace(/^_+|_+$/g, '');

// Resolve um argumento (id exato OU nome, com acento/espaço) dentro de uma
// tabela de entidades ({id: def} ou array). Retorna a entrada ou null.
function resolveEntry(table, arg) {
  const n = normId(arg);
  if (!n) return null;
  if (table[n]) return table[n];                       // id exato já normalizado
  for (const k in table) {
    const v = table[k];
    if (!v || typeof v !== 'object') continue;
    if (normId(k) === n || normId(v.name) === n) return v;
  }
  return null;
}

// Id de uma entrada (as entradas de SHOP não têm campo id próprio → usa a chave).
const idOf = (k, v) => (v && v.id) || k;

// Habilidades extras (EXTRA_SKILLS é array) em tabela {id: def}.
const EXTRA_MAP = {};
EXTRA_SKILLS.forEach(s => { EXTRA_MAP[s.id] = s; });

// Categorias de entidades para o manual de ajuda (/ajuda) e /lista <categoria>.
const CATS = {
  personagens: { label: 'Personagens / Classes', table: SUBCLASSES },
  bencaos:     { label: 'Bênçãos', table: BLESSINGS },
  habilidades: { label: 'Habilidades Extras', table: EXTRA_MAP },
  reliquias:   { label: 'Relíquias', table: RELICS },
  itens:       { label: 'Itens da Loja', table: SHOP },
  monstros:    { label: 'Monstros', table: MONSTERS }
};

// Aceita singular/plural (personagem, benção, item...) → categoria canônica.
const CAT_ALIASES = {};
Object.keys(CATS).forEach(k => { CAT_ALIASES[k] = k; });
['personagens', 'personagem', 'classe', 'classes', 'pessoa', 'pessoas'].forEach(a => CAT_ALIASES[a] = 'personagens');
['bencaos', 'bencao', 'bencoes', 'bencões'].forEach(a => CAT_ALIASES[a] = 'bencaos');
['habilidades', 'habilidade', 'skill', 'skills'].forEach(a => CAT_ALIASES[a] = 'habilidades');
['reliquias', 'reliquia'].forEach(a => CAT_ALIASES[a] = 'reliquias');
['itens', 'item', 'upgrade', 'upgrades', 'loja'].forEach(a => CAT_ALIASES[a] = 'itens');
['monstros', 'monstro', 'monster', 'inimigos', 'inimigo'].forEach(a => CAT_ALIASES[a] = 'monstros');

const STAT_HINT = 'vida · forca · int · vel · ouro · dano · tier';

export const cheats = {
  toggleCheatBar(v) {
    const bar = byId('cheatbar');
    const input = byId('cheatInput');
    const show = v !== undefined ? v : bar.classList.contains('hidden');
    bar.classList.toggle('hidden', !show);
    if (show) input.focus();
    else input.blur();
  },

  runCheat(raw) {
    let cmd = String(raw || '').trim().toLowerCase();
    if (!cmd) return;
    if (cmd[0] === '/') cmd = cmd.slice(1);
    const parts = cmd.split(/\s+/);
    const key = normId(parts[0]);
    const argLine = parts.slice(1).join(' ');

    // --- Cheats de sessão (funcionam até no menu; nada é salvo) ---
    const toggles = {
      'libera_tudo': { flag: 'libera_tudo', on: 'Todas as classes liberadas (sessão)', off: 'Desbloqueio de volta ao estado salvo' },
      'fantasma':    { flag: 'ghost', on: 'Modo fantasma ATIVADO', off: 'Modo fantasma desativado' }
    };
    if (toggles[key]) {
      const d = toggles[key];
      this.cheats[d.flag] = !this.cheats[d.flag];
      if (key === 'fantasma' && this.player) this.player.ghost = this.cheats.ghost;
      this.banner(this.cheats[d.flag] ? d.on : d.off, this.cheats[d.flag] ? '#7cff8a' : '#ff9d5c', 1.8);
      if (key === 'libera_tudo') this.buildMenu();
      return;
    }

    // --- Troca de classe: reinicia a run com a subclasse escolhida ---
    // Reusa startGame(force=true): recalcula stats, arma e habilidades, como se
    // a classe tivesse sido escolhida na tela de seleção. Não desbloqueia nada
    // permanentemente.
    if (key === 'personagem' || key === 'classe') {
      const sub = resolveEntry(SUBCLASSES, argLine);
      if (!sub) {
        this.banner('✖ Subclasse não encontrada: "' + argLine + '" — /lista personagens', '#ff5c5c', 2.2);
        console.warn('[cheat] subclasse não encontrada:', argLine);
        return;
      }
      this.startGame(sub.id, true);
      this.banner('Classe: ' + sub.name, sub.accent || '#fff', 2);
      return;
    }

    // A partir daqui exigem partida em andamento.
    if (!this.player) { this.banner('Inicie o jogo primeiro', '#ffd23f', 1.5); return; }
    const p = this.player;

    // --- Toggles de ouro/vida infinitos ---
    if (key === 'ouroinfinito') {
      this.cheats.gold = !this.cheats.gold;
      if (this.cheats.gold) p.gold = 999999;
      this.banner(this.cheats.gold ? 'Ouro infinito ATIVADO' : 'Ouro infinito desativado', this.cheats.gold ? '#7cff8a' : '#ff9d5c', 1.8);
      this.hud();
      return;
    }
    if (key === 'vidainfinita') {
      this.cheats.hp = !this.cheats.hp;
      if (this.cheats.hp) p.hp = p.maxHp;
      this.banner(this.cheats.hp ? 'Vida infinita ATIVADA' : 'Vida infinita desativada', this.cheats.hp ? '#7cff8a' : '#ff9d5c', 1.8);
      this.hud();
      return;
    }

    // Atalhos numéricos legados → /stats (ex.: /ouro 1000, /forca 50).
    const NUM_ALIAS = {
      'ouro': 'ouro', 'gold': 'ouro', 'dinheiro': 'ouro',
      'forca': 'forca', 'str': 'forca', 'força': 'forca',
      'int': 'int', 'inteligencia': 'int',
      'vel': 'vel', 'velocidade': 'vel', 'spd': 'vel',
      'vida': 'vida', 'hp': 'vida',
      'dano': 'dano', 'dmg': 'dano',
      'tier': 'tier'
    };
    if (NUM_ALIAS[key] !== undefined && parts[1] !== undefined) {
      this.setStat(NUM_ALIAS[key], parts[1]);
      return;
    }

    switch (key) {
      case 'stats': {
        const field = parts[1] || '';
        const value = parts[2] !== undefined ? parts[2] : '';
        if (!field) {
          this.openCheatPanel();
          this.banner('Painel de cheats', '#ffd23f', 1.5);
          return;
        }
        this.setStat(field, value);
        return;
      }
      case 'get': case 'obter': this.giveItem(argLine); return;
      case 'monstro': case 'monster': this.spawnMonsterCheat(argLine); return;
      case 'matar': case 'kill': this.killAllMonsters(argLine); return;
      case 'curar': case 'heal':
        p.hp = p.maxHp;
        this.burst(p.x, p.y - 20, '#7cff8a', 14, 200);
        this.banner('Curado!', '#7cff8a', 1.2);
        return;
      case 'papa': case 'encontrar_papa': case 'papa_aqui': this.spawnPopeCheat(); return;
      case 'lista': case 'list': this.listCheats(argLine); return;
      case 'ajuda': case 'help': this.helpCheats(); return;
      default: {
        // Atalho: id de subclasse direto (/padre = /personagem padre). O caso
        // "papa" acima tem precedência: /papa invoca o Papa no mapa; para jogar
        // como Papa use /personagem papa.
        const sub = resolveEntry(SUBCLASSES, key);
        if (!argLine && sub) {
          this.startGame(sub.id, true);
          this.banner('Classe: ' + sub.name, sub.accent || '#fff', 2);
          return;
        }
        this.banner('✖ Cheat desconhecido: "/' + key + '" — digite /ajuda', '#ff5c5c', 2.2);
        console.warn('[cheat] comando desconhecido:', key);
        return;
      }
    }
  },

  // --- /stats <campo> <valor> (ou /stats painel) ---
  setStat(field, value) {
    const p = this.player;
    if (!p) { this.banner('Inicie o jogo primeiro', '#ffd23f', 1.5); return; }
    const f = String(field || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (!f) { this.banner('Uso: /stats <campo> <valor> — campos: ' + STAT_HINT, '#ffd23f', 2); return; }
    if (f === 'painel' || f === 'panel' || f === 'abrir') { this.openCheatPanel(); return; }
    if (f === 'lista' || f === 'campos') { this.banner('Campos: ' + STAT_HINT, '#ffe9b0', 3); return; }
    const v = parseInt(value, 10);
    if (!Number.isFinite(v)) {
      this.banner('✖ Valor inválido para "' + (value || '') + '": use um número inteiro', '#ff5c5c', 2);
      console.warn('[cheat] valor inválido para o campo', field, '→', value);
      return;
    }
    let label = f;
    if (f === 'vida' || f === 'maxhp' || f === 'hp') {
      p.maxHp = Math.max(1, v);
      p.hp = p.maxHp;
    } else if (f === 'forca' || f === 'str') {
      p.str = Math.max(0, v); label = 'Força';
    } else if (f === 'int' || f === 'inteligencia') {
      p.int = Math.max(0, v); label = 'Inteligência';
    } else if (f === 'vel' || f === 'velocidade' || f === 'spd') {
      p.spd = Math.max(0, v); label = 'Velocidade';
    } else if (f === 'ouro' || f === 'gold') {
      p.gold = Math.max(0, v); label = 'Ouro';
    } else if (f === 'dano' || f === 'dmg') {
      p.weapon.dmg = Math.max(0, v); label = 'Dano da arma';
    } else if (f === 'tier') {
      p.weapon.tier = Math.max(0, v);
      p.weapon.dmg = weaponDamage(p.weapon);
      label = 'Nível da arma (+' + p.weapon.tier + ', dano ' + p.weapon.dmg + ')';
    } else {
      this.banner('✖ Campo desconhecido: "' + field + '". Válidos: ' + STAT_HINT, '#ff5c5c', 2.2);
      console.warn('[cheat] campo de stats desconhecido:', field);
      return;
    }
    this.hud();
    this.banner('Definido: ' + label + ' = ' + v, '#7cff8a', 1.5);
  },

  // --- /get <id|nome> [xN] — bênçãos, habilidades extras, relíquias e itens ---
  giveItem(cmd) {
    const p = this.player;
    if (!p) { this.banner('Inicie o jogo primeiro', '#ffd23f', 1.5); return; }
    let name = String(cmd || '').trim();
    if (!name) { this.banner('Uso: /get <id ou nome> [x<quantidade>]', '#ffd23f', 2); return; }

    let qty = 1;
    const qtyMatch = name.match(/x(\d+)$/i);
    if (qtyMatch) {
      qty = Math.max(1, parseInt(qtyMatch[1], 10));
      name = name.replace(/x\d+$/i, '').trim();
    }

    // 1) Bênçãos (inclui Fulmen Ruptor e a Suprema)
    const b = resolveEntry(BLESSINGS, name);
    if (b) {
      if (b.item && b.bless === 'fulmen') {
        p.grantFulmen(qty);
        this.banner('Fulmen Ruptor: +' + qty + ' no estoque (habilidade aprendida/equipada)', b.color, 2);
        this.burst(p.x, p.y - 20, b.color, 14, 200);
        this.sfx.upgrade(); this.buildSkillbar(); this.hud();
        return;
      }
      if (b.bless === 'supreme') {
        p.grantSupreme();
        this.banner('👑 ' + b.name + ' concedida! (use-a pela hotbar)', b.color, 2.4);
        this.blessingFx(p, '#fff3b0', 24);
        this.sfx.upgrade(); this.buildSkillbar(); this.hud();
        return;
      }
      if (p.blessings.length >= MAX_BLESSINGS) {
        this.banner('Limite de bênçãos atingido (' + MAX_BLESSINGS + ').', '#ff9d5c', 2);
        return;
      }
      qty = Math.max(1, Math.min(qty, MAX_BLESSINGS - p.blessings.length));
      for (let i = 0; i < qty; i++) {
        const newB = Object.assign({}, b);
        p.blessings.push(newB);
        p.cd[newB.id] = 0;
      }
      p.tryEquip(b.id);
      this.banner(b.name + ' aprendida!' + (qty > 1 ? ' (x' + qty + ')' : '') + ' Equipe-a na hotbar (tecla I).', b.color, 2);
      this.burst(p.x, p.y - 20, b.color, 14, 200);
      this.sfx.upgrade(); this.buildSkillbar(); this.hud();
      return;
    }

    // 2) Habilidades extras do Mestre das Artes
    const sk = resolveEntry(EXTRA_MAP, name);
    if (sk) {
      if (p.extraSkills.some(s => s.id === sk.id)) {
        this.banner('Já aprendida: ' + sk.name, sk.color, 1.8);
        return;
      }
      const newSk = Object.assign({}, sk);
      delete newSk.cost;
      p.extraSkills.push(newSk);
      p.cd[sk.id] = 0;
      p.tryEquip(sk.id);
      this.banner(sk.name + ' aprendida! Equipe-a na hotbar (tecla I).', sk.color, 2);
      this.burst(p.x, p.y - 20, sk.color, 14, 200);
      this.sfx.upgrade(); this.buildSkillbar(); this.hud();
      return;
    }

    // 3) Relíquias (posse; equipa se a classe permitir e houver slot livre)
    const r = resolveEntry(RELICS, name);
    if (r) {
      if (p.ownedRelics.includes(r.id)) {
        this.banner('Já possuída: ' + r.name, r.color, 1.8);
        return;
      }
      p.grantRelic(r.id);
      let extra = '';
      if (p.relicAllowed(r.id) && p.relics.length < MAX_RELICS) {
        p.equipRelic(r.id);
        extra = ' (equipada)';
      }
      this.banner(r.name + ' obtida!' + extra + ' — troque equipadas no inventário (I).', r.color, 2);
      this.burst(p.x, p.y - 20, r.color, 14, 200);
      this.sfx.upgrade(); this.hud();
      return;
    }

    // 4) Itens da loja (poção, tomés, fulmen). O Fulmen usa grantFulmen (só a
    // run atual) em vez de SHOP.fulmen.effect (que grava no localStorage).
    const it = resolveEntry(SHOP, name);
    if (it) {
      if (it === SHOP.fulmen) {
        p.grantFulmen(qty);
        this.banner('Fulmen Ruptor: +' + qty + ' no estoque (habilidade aprendida/equipada)', '#ffd23f', 2);
      } else {
        for (let i = 0; i < qty; i++) it.effect(this, p);
        this.banner((qty > 1 ? 'x' + qty + ' ' : '') + it.name + ' aplicado!', '#7cff8a', 2);
      }
      this.burst(p.x, p.y - 20, '#7cff8a', 14, 200);
      this.sfx.upgrade(); this.hud();
      return;
    }

    this.banner('✖ Não encontrado: "' + name + '". Use /lista para ver os ids.', '#ff5c5c', 2.2);
    console.warn('[cheat] item/bênção não encontrado:', name);
  },

  // --- /monstro <id|nome> [xN] — invoca monstros/chefes para testes ---
  spawnMonsterCheat(argLine) {
    const p = this.player;
    if (!p) { this.banner('Inicie o jogo primeiro', '#ffd23f', 1.5); return; }
    const parts = String(argLine || '').trim().split(/\s+/);
    let qty = 1;
    const last = parts[parts.length - 1] || '';
    const qm = last.match(/^x?(\d+)$/i);
    if (qm && parts.length > 1) { qty = Math.min(50, parseInt(qm[1], 10)); parts.pop(); }
    const name = parts.join(' ');
    if (!name) { this.banner('Uso: /monstro <id ou nome> [x<quantidade>]', '#ffd23f', 2); return; }

    const def = resolveEntry(MONSTERS, name);
    if (!def) {
      this.banner('✖ Monstro não encontrado: "' + name + '" — /lista monstros', '#ff5c5c', 2.2);
      console.warn('[cheat] monstro não encontrado:', name);
      return;
    }

    let spawned = 0;
    for (let i = 0; i < qty; i++) {
      let m = null;
      for (let t = 0; t < 8 && !m; t++) {
        const a = Math.random() * 6.283;
        const r = 45 + Math.random() * 70;
        const tx = p.x + Math.cos(a) * r;
        const ty = p.y + Math.sin(a) * r;
        const cand = new Monster(def, tx, ty, this, !!def.boss);
        if (!this.world.solidBox(cand.box())) m = cand;
      }
      if (!m) continue;
      m.aggro = 1;
      this.monsters.push(m);
      if (def.boss) this.bossesActive.push(m);
      spawned++;
    }
    if (spawned) {
      this.banner((spawned > 1 ? spawned + '× ' : '') + def.name + ' invocado!', def.color || '#fff', 2);
      this.ring(p.x, p.y, 130, 0.5, def.color || '#fff', 5);
      this.sfx.unlock();
    } else {
      this.banner('Sem lugar para invocar ' + def.name + ' agora.', '#ffd23f', 2);
    }
  },

  // --- /matar [id|nome] — elimina todos os monstros (ou só da espécie) ---
  killAllMonsters(argLine) {
    const name = String(argLine || '').trim();
    if (!name) {
      const alive = this.monsters.filter(m => !m.dead);
      if (!alive.length) { this.banner('Nenhum monstro no mapa.', '#ffe9b0', 1.8); return; }
      alive.forEach(m => this.killMonster(m));
      this.banner('Monstros eliminados', '#ff6b6b', 1.5);
      return;
    }
    const def = resolveEntry(MONSTERS, name);
    if (!def) {
      this.banner('✖ Monstro não encontrado: "' + name + '" — /lista monstros', '#ff5c5c', 2.2);
      return;
    }
    const targets = this.monsters.filter(m => !m.dead && m.def.id === def.id);
    if (!targets.length) { this.banner('Nenhum ' + def.name + ' no mapa.', '#ffe9b0', 1.8); return; }
    targets.forEach(m => this.killMonster(m));
    this.banner(targets.length + '× ' + def.name + ' eliminado(s)', '#ff6b6b', 1.5);
  },

  // --- /lista <categoria> — abre a lista de ids no painel de ajuda ---
  listCheats(argLine) {
    const cat = normId(argLine);
    if (!cat) { this.openHelpPanel(); return; }
    const key = CAT_ALIASES[cat];
    if (!key) {
      this.banner('✖ Categoria desconhecida: "' + argLine + '". Use: personagens · bencaos · habilidades · reliquias · itens · monstros', '#ff5c5c', 2.4);
      return;
    }
    this.openEntityList(key);
  },

  // --- Manual de cheats (/ajuda) em painel organizado ---
  openHelpPanel() {
    const secs = [
      { t: '🧙 Personagem', cmds: [
        ['/personagem <classe>', 'troca de classe (reinicia a run) — ex.: <b>/personagem papa</b>'],
        ['/stats <campo> <valor>', 'edita um atributo — ex.: <b>/stats vida 500</b>'],
        ['/stats painel', 'abre o painel visual de edição']
      ]},
      { t: '🎁 Bênçãos · habilidades · relíquias · itens', cmds: [
        ['/get <id|nome> [xN]', 'concede pelo id ou nome — ex.: <b>/get bencao_suprema</b>'],
        ['', 'id em snake_case (<b>bencao_suprema</b>) ou o nome com acento/espaço («Benção Suprema»). Clique nos nomes abaixo para copiar qualquer id.']
      ]},
      { t: '⚔️ Mundo e combate', cmds: [
        ['/monstro <id> [xN]', 'invoca monstros e chefes — ex.: <b>/monstro lobo x3</b>'],
        ['/matar [id]', 'elimina todos os monstros (ou só o indicado)'],
        ['/curar', 'cura total'],
        ['/papa', 'faz o Papa Leão XI surgir no mapa']
      ]},
      { t: '💰 Toggles de sessão', cmds: [
        ['/ouroinfinito · /vidainfinita', 'ouro e vida infinitos'],
        ['/fantasma · /libera_tudo', 'imortalidade · libera todas as classes nesta sessão']
      ]}
    ];
    const nav = '<div class="cheat-cat-row"><span>Ids:</span>' +
      Object.keys(CATS).map(c => `<button class="cheat-cat" data-cat="${c}">${CATS[c].label}</button>`).join('') +
      '</div>';
    const html = `
      <h2 class="cheat-title">MANUAL DE CHEATS <span class="cheat-sub">painel F3 · só afeta esta partida — nada é salvo</span></h2>
      ${secs.map(s => `
        <div class="cheat-section">
          <div class="cheat-sec-title">${s.t}</div>
          ${s.cmds.map(([cmd, desc]) => cmd
            ? `<div class="cheat-cmd"><code>${cmd}</code><span>${desc}</span></div>`
            : `<div class="cheat-note">${desc}</div>`).join('')}
        </div>`).join('')}
      ${nav}
      <div class="cheatrow"><button class="btn ghost" id="chCloseHelp">Fechar (Esc)</button></div>`;
    this._openCheatOverlay(html, () => {
      byId('chCloseHelp').onclick = () => this.closeCheatOverlay();
      byId('cheatPanel').querySelectorAll('[data-cat]').forEach(b => b.onclick = () => this.openEntityList(b.dataset.cat));
    });
  },

  // --- Lista de ids de uma categoria, clicáveis para copiar ---
  openEntityList(cat) {
    const def = CATS[cat];
    if (!def) {
      this.banner('✖ Categoria desconhecida — /lista personagens · bencaos · habilidades · reliquias · itens · monstros', '#ff5c5c', 2.4);
      return;
    }
    const ids = Object.keys(def.table).map(k => idOf(k, def.table[k])).sort();
    const chips = ids.map(id => `<button class="cheat-id" data-id="${id}">${id}</button>`).join('');
    const html = `
      <h2 class="cheat-title">${def.label} <span class="cheat-sub">${ids.length} id${ids.length === 1 ? '' : 's'} — clique para copiar</span></h2>
      <div class="cheat-list">${chips || '<div class="cheat-empty">Nada aqui.</div>'}</div>
      <div class="cheatrow">
        <button class="btn" id="chBack">← Voltar</button>
        <button class="btn ghost" id="chCloseHelp">Fechar (Esc)</button>
      </div>`;
    this._openCheatOverlay(html, () => {
      byId('chBack').onclick = () => this.openHelpPanel();
      byId('chCloseHelp').onclick = () => this.closeCheatOverlay();
      byId('cheatPanel').querySelectorAll('.cheat-id').forEach(b => {
        b.onclick = () => {
          const id = b.dataset.id;
          const done = () => {
            b.classList.add('copied');
            const prev = b.textContent;
            b.textContent = '✓ copiado';
            setTimeout(() => { b.classList.remove('copied'); b.textContent = prev; }, 900);
          };
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(id).then(done).catch(done);
          } else {
            const ta = document.createElement('textarea');
            ta.value = id;
            document.body.appendChild(ta);
            ta.select();
            try { document.execCommand('copy'); } catch (e) { /* clipboard indisponível */ }
            document.body.removeChild(ta);
            done();
          }
        };
      });
    });
  },

  // Abre o overlay de ajuda/lista lembrando o estado anterior e interceptando
  // o Escape para voltar a ele (em vez do closeOverlay genérico, que cai em 'play').
  _openCheatOverlay(html, onReady) {
    this._prevState = this.state;
    byId('cheatPanel').innerHTML = html;
    byId('cheatpanel').classList.remove('hidden');
    this.state = 'cheats';
    const esc = e => {
      if (e.code === 'Escape') { e.preventDefault(); e.stopPropagation(); this.closeCheatOverlay(); }
    };
    this._escTrap = esc;
    window.addEventListener('keydown', esc, true);
    if (onReady) onReady();
  },

  closeCheatOverlay() {
    byId('cheatpanel').classList.add('hidden');
    if (this._escTrap) { window.removeEventListener('keydown', this._escTrap, true); this._escTrap = null; }
    this.state = (this._prevState && this._prevState !== 'cheats') ? this._prevState : 'play';
    this._prevState = null;
    this.hud();
  },

  helpCheats() {
    this.openHelpPanel();
  },

  // --- Cheat "encontrar_papa": faz o Papa Leão XI surgir no mapa desta partida,
  // reaproveitando o mesmo spawn do evento raro (região de perigo >= 2). ---
  spawnPopeCheat() {
    if (this.npcs.some(n => n.id === 'papa')) {
      this.banner('O Papa já vaga pelo mapa.', '#ffe9b0', 2);
      return;
    }
    if (!this.spawnPope()) {
      this.banner('Não há um bom lugar para o Papa surgir agora.', '#ffd23f', 2.5);
    }
  },

  // --- Bênção Suprema: o milagre do Papa. Uso único por partida — aniquila
  // qualquer ser na área ao redor do ponto de impacto, ignorando vida e
  // resistências. ---
  openCheatPanel() {
    this.state = 'cheats';
    this.buildCheatPanel();
    byId('cheatpanel').classList.remove('hidden');
  },

  applyCheats() {
    const p = this.player;
    if (!p) return;
    const v = id => {
      const el = byId(id);
      const n = parseFloat(el.value);
      return Number.isFinite(n) ? n : 0;
    };
    p.maxHp = Math.max(1, Math.round(v('ch_vida')));
    p.str = Math.max(0, Math.round(v('ch_for')));
    p.int = Math.max(0, Math.round(v('ch_int')));
    p.spd = Math.max(0, Math.round(v('ch_vel')));
    p.gold = Math.max(0, Math.round(v('ch_ouro')));
    p.weapon.dmg = Math.max(0, Math.round(v('ch_dano')));
    p.weapon.tier = Math.max(0, Math.round(v('ch_tier')));
    p.weapon.dmg = weaponDamage(p.weapon);
    p.hp = p.maxHp;
    this.cheats.gold = byId('ch_goldinf').checked;
    this.cheats.hp = byId('ch_hpinf').checked;
    this.sfx.buy();
    this.hud();
    this.banner('Stats aplicados!', '#7cff8a', 1.5);
    this.closeOverlay();
  },

  buildCheatPanel() {
    const p = this.player;
    if (!p) return;
    const el = byId('cheatPanel');
    el.innerHTML = `<h2>PAINEL DE CHEATS</h2>
      <div class="cheatgrid">
        <div class="cheatfield"><label>Vida máx</label><input type="number" id="ch_vida" value="${p.maxHp}"></div>
        <div class="cheatfield"><label>Força</label><input type="number" id="ch_for" value="${p.str}"></div>
        <div class="cheatfield"><label>Inteligência</label><input type="number" id="ch_int" value="${p.int}"></div>
        <div class="cheatfield"><label>Velocidade</label><input type="number" id="ch_vel" value="${p.spd}"></div>
        <div class="cheatfield"><label>Ouro</label><input type="number" id="ch_ouro" value="${p.gold}"></div>
        <div class="cheatfield"><label>Dano da arma</label><input type="number" id="ch_dano" value="${p.weapon.dmg}"></div>
        <div class="cheatfield"><label>Nível da arma</label><input type="number" id="ch_tier" value="${p.weapon.tier}"></div>
        <label class="cheattoggle"><input type="checkbox" id="ch_goldinf" ${this.cheats.gold ? 'checked' : ''}> Ouro infinito</label>
        <label class="cheattoggle"><input type="checkbox" id="ch_hpinf" ${this.cheats.hp ? 'checked' : ''}> Vida infinita</label>
      </div>
      <div class="cheatrow">
        <button class="btn" id="chApply">Aplicar</button>
        <button class="btn ghost" id="chClose">Fechar (Esc)</button>
      </div>
      <div class="cheathint">Comandos: /personagem padre · /stats vida 500 · /get bencao_suprema · /monstro lobo x3 · /lista monstros</div>`;
    byId('chApply').onclick = () => this.applyCheats();
    byId('chClose').onclick = () => this.closeOverlay();
  },

};