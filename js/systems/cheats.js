import { MAX_BLESSINGS } from '../data/constants.js';
import { weaponDamage } from '../data/utils.js';
import { BLESSINGS } from '../data/blessings.js';
import { SUBCLASSES } from '../data/classes.js';
import { byId } from '../dom.js';

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
    const key = parts[0];
    const num = parts[1] !== undefined ? parseInt(parts[1], 10) : NaN;

    // Cheats de desenvolvimento que não exigem partida em andamento (podem ser
    // ativados no menu). São válidos apenas na sessão atual — nada é salvo.
    if (key === 'libera_tudo' || key === 'fantasma') {
      const defs = {
        'libera_tudo': { flag: 'libera_tudo', on: 'Todas as classes liberadas (sessão)', off: 'Desbloqueio de volta ao estado salvo' },
        'fantasma':    { flag: 'ghost', on: 'Modo fantasma ATIVADO', off: 'Modo fantasma desativado' }
      };
      const d = defs[key];
      this.cheats[d.flag] = !this.cheats[d.flag];
      if (key === 'fantasma' && this.player) this.player.ghost = this.cheats.ghost;
      this.banner(this.cheats[d.flag] ? d.on : d.off, this.cheats[d.flag] ? '#7cff8a' : '#ff9d5c', 1.8);
      if (key === 'libera_tudo') this.buildMenu();
      return;
    }

    // Troca direta de classe pelo nome (ex.: /bispo, /arqueiro, /psiquico).
    // Reinicia a sessão como se a classe tivesse sido escolhida na tela de
    // seleção, burlando apenas o bloqueio de desbloqueio. Não grava nada.
    if (SUBCLASSES[key]) {
      this.startGame(key, true);
      this.banner('Classe: ' + SUBCLASSES[key].name, SUBCLASSES[key].accent, 2);
      return;
    }

    if (!this.player) { this.banner('Inicie o jogo primeiro', '#ffd23f', 1.5); return; }
    const p = this.player;

    const cheats = {
      'ouroinfinito': ['gold', 'Ouro infinito'],
      'vidainfinita': ['hp', 'Vida infinita'],
      'stats': ['panel', 'Painel de cheats'],
      'gold': ['gold', 'Ouro infinito'],
      'hp': ['hp', 'Vida infinita']
    };
    if (cheats[key]) {
      const [kind, label] = cheats[key];
      if (kind === 'panel') {
        this.openCheatPanel();
        this.banner('Painel de cheats', '#ffd23f', 1.5);
        return;
      }
      this.cheats[kind] = !this.cheats[kind];
      this.banner(this.cheats[kind] ? label + ' ATIVADO' : label + ' desativado', this.cheats[kind] ? '#7cff8a' : '#ff9d5c', 1.8);
      if (this.cheats.hp) p.hp = p.maxHp;
      if (this.cheats.gold) p.gold = 999999;
      this.hud();
      return;
    }

    if (!Number.isNaN(num)) {
      switch (key) {
        case 'ouro': p.gold = Math.max(0, num); this.hud(); this.banner('Ouro: ' + p.gold, '#ffd23f', 1.5); return;
        case 'forca': p.str = Math.max(0, num); this.hud(); this.banner('Força: ' + p.str, '#ff9d5c', 1.5); return;
        case 'int': case 'inteligencia': p.int = Math.max(0, num); this.hud(); this.banner('Inteligência: ' + p.int, '#ff9d5c', 1.5); return;
        case 'vel': case 'velocidade': p.spd = Math.max(0, num); this.hud(); this.banner('Velocidade: ' + p.spd, '#ff9d5c', 1.5); return;
        case 'vida': p.maxHp = Math.max(1, num); p.hp = p.maxHp; this.hud(); this.banner('Vida máx: ' + p.maxHp, '#7cff8a', 1.5); return;
        case 'dano': p.weapon.dmg = Math.max(0, num); this.hud(); this.banner('Dano: ' + p.weapon.dmg, '#ff9d5c', 1.5); return;
        case 'tier': p.weapon.tier = Math.max(0, num); p.weapon.dmg = weaponDamage(p.weapon); this.hud(); this.banner('Arma nível +' + p.weapon.tier + ' (dano ' + p.weapon.dmg + ')', '#ff9d5c', 1.5); return;
      }
    } else {
      switch (key) {
        case 'curar': case 'heal': p.hp = p.maxHp; this.burst(p.x, p.y - 20, '#7cff8a', 14, 200); this.banner('Curado!', '#7cff8a', 1.2); return;
        case 'matar': case 'kill': this.monsters.forEach(m => this.killMonster(m)); this.banner('Monstros eliminados', '#ff6b6b', 1.5); return;
        case 'encontrar_papa': case 'papa_aqui': this.spawnPopeCheat(); return;
        case 'ajuda': case 'help': this.helpCheats(); return;
        case 'get': case 'obter': this.giveItem(cmd); return;
      }
    }

    this.banner('Cheat desconhecido: ' + cmd, '#ff5c5c', 2);
  },

  helpCheats() {
    const list = [
      'ouroinfinito / vidainfinita — toggles',
      'stats — abre o painel',
      'ouro 1000 · forca 50 · int 50 · vel 30 · vida 500',
      'dano 200 · tier 10',
      'Bênçãos por comando: get bencao_luz · bencao_cura · bencao_coragem · bencao_escudo · bencao_passo · bencao_cadencia · bencao_precisao · bencao_furia · bencao_julgamento · bencao_suprema',
      'As bênçãos também são ensinadas por Padres e Bispos espalhados pelo mundo.',
      'curar · matar · encontrar_papa — faz o Papa surgir no mapa',
      'Dev (sessão, some ao recarregar): libera_tudo · fantasma · /bispo · /padre · /diacono · /guerreiro · /arqueiro · /inventor · /elemental · /psiquico · /abencoador'
    ];
    this.banner(list.join('  |  '), '#ffe9b0', 4);
  },

  // Cheat "encontrar_papa": faz o Papa Leão XI surgir no mapa desta partida,
  // reaproveitando o mesmo spawn do evento raro (região de perigo >= 2).
  spawnPopeCheat() {
    if (this.npcs.some(n => n.id === 'papa')) {
      this.banner('O Papa já vaga pelo mapa.', '#ffe9b0', 2);
      return;
    }
    if (!this.spawnPope()) {
      this.banner('Não há um bom lugar para o Papa surgir agora.', '#ffd23f', 2.5);
    }
  },

  giveItem(cmd) {
    const p = this.player;
    let name = String(cmd).replace(/^get\s+/i, '').replace(/^obter\s+/i, '').trim().toLowerCase();
    if (!name) { this.banner('Uso: get <bênção> [x<quantidade>]', '#ffd23f', 2); return; }
    
    let qty = 1;
    const qtyMatch = name.match(/x(\d+)$/);
    if (qtyMatch) {
      qty = parseInt(qtyMatch[1], 10);
      name = name.replace(/x\d+$/, '').trim();
    }

    const b = BLESSINGS[name];
    if (b) {
      if (b.bless === 'supreme') {
        p.grantSupreme();
        this.banner('👑 ' + b.name + ' concedida! (use-a pela hotbar)', b.color, 2.4);
        this.blessingFx(p, '#fff3b0', 24);
      } else {
        if (p.blessings.length >= MAX_BLESSINGS) { this.banner('Limite de bênçãos atingido (' + MAX_BLESSINGS + ').', '#ff9d5c', 2); return; }
        const newB = Object.assign({}, b);
        p.blessings.push(newB);
        p.cd[newB.id] = 0;
        p.tryEquip(newB.id);
        this.banner(newB.name + ' aprendida! Equipe-a na hotbar (tecla I).', newB.color, 2);
        this.burst(p.x, p.y - 20, newB.color, 14, 200);
      }
      this.sfx.upgrade();
      this.buildSkillbar();
      this.hud();
      return;
    }
    this.banner('Bênção desconhecida: ' + name, '#ff5c5c', 2);
  },

  // Bênção Suprema: o milagre do Papa. Uso único por partida — aniquila qualquer
  // ser na área ao redor do ponto de impacto, ignorando vida e resistências.
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
      <div class="cheathint">Comandos: ouroinfinito · vidainfinita · ouro 1000 · forca 50 · int 50 · vel 30 · vida 500 · dano 200 · tier 10 · curar · matar</div>`;
    byId('chApply').onclick = () => this.applyCheats();
    byId('chClose').onclick = () => this.closeOverlay();
  },

};
