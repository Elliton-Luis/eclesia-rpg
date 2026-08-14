import { SUBCLASSES } from '../data/classes.js';
import { byId } from '../dom.js';

export const records = {
  saveRecord() {
    try {
      const key = 'eclesia_v1';
      let rec = {};
      try { rec = JSON.parse(localStorage.getItem(key)) || {}; } catch (e) { rec = {}; }
      if (!rec.wins) rec.wins = 0;
      rec.wins++;
      const sc = this.score();
      const s = this.stats;
      // Marca quais recordes foram batidos nesta vitória (badges na tela de vitória).
      const newBest = [];
      const beat = (cond, label) => { if (cond) newBest.push(label); };
      if (!rec.bestScore || sc > rec.bestScore) { rec.bestScore = sc; newBest.push('Pontuação'); }
      if (!rec.bestTime || s.time < rec.bestTime) { rec.bestTime = s.time; newBest.push('Tempo'); }
      if (!rec.maxCombo || s.maxCombo > rec.maxCombo) { rec.maxCombo = s.maxCombo; newBest.push('Combo'); }
      if (!rec.bestKills || s.kills > rec.bestKills) { rec.bestKills = s.kills; newBest.push('Inimigos'); }
      if (!rec.bestBosses || s.bosses > rec.bestBosses) { rec.bestBosses = s.bosses; newBest.push('Chefes'); }
      if (rec.bestDeaths === undefined || s.deaths < rec.bestDeaths) { rec.bestDeaths = s.deaths; newBest.push('Poucas mortes'); }
      if (!rec.bestDmgDealt || s.dmgDealt > rec.bestDmgDealt) { rec.bestDmgDealt = s.dmgDealt; newBest.push('Dano causado'); }
      if (!rec.bestExploration || s.exploration > rec.bestExploration) { rec.bestExploration = s.exploration; newBest.push('Exploração'); }
      this.newRecords = newBest;
      // Snapshot completo da jornada vitoriosa, exibida nos recordes locais.
      rec.lastRun = {
        class: this.player.sub.id,
        classname: this.player.sub.name,
        score: sc,
        time: s.time,
        kills: s.kills,
        bosses: s.bosses,
        deaths: s.deaths,
        dmgDealt: s.dmgDealt,
        dmgTaken: s.dmgTaken,
        maxCombo: s.maxCombo,
        powerups: s.powerups,
        exploration: s.exploration,
        weaponTier: this.player.weapon.tier,
        date: new Date().toLocaleString('pt-BR')
      };
      if (!rec.byClass) rec.byClass = {};
      const cls = this.player.sub.id;
      const old = rec.byClass[cls];
      if (!old || sc > old.bestScore) {
        rec.byClass[cls] = { bestScore: sc, bestTime: s.time, wins: (old ? old.wins : 0) + 1 };
      } else if (old) {
        old.wins++;
      }
      localStorage.setItem(key, JSON.stringify(rec));
    } catch (e) { this.newRecords = []; }
  },

  loadRecords() {
    try {
      return JSON.parse(localStorage.getItem('eclesia_v1')) || {};
    } catch (e) { return {}; }
  },

  formatTime(t) {
    t = Math.max(0, Math.floor(t));
    const h = Math.floor(t / 3600);
    const m = Math.floor((t % 3600) / 60);
    const s = t % 60;
    if (h > 0) return h + 'h' + (m < 10 ? '0' : '') + m + 'm' + (s < 10 ? '0' : '') + s + 's';
    return m + 'm' + (s < 10 ? '0' : '') + s + 's';
  },

  showResults() {
    const s = this.stats;
    const sc = this.score();
    const el = byId('resultsPanel');
    const cls = this.player.sub;
    let html = `<div class="victoryTitle">🏆 VOCÊ GANHOU O JOGO</div>`;
    html += `<div class="victorySub">${this.ending && this.ending.type === 'other' ? 'TRIUNFO IMPREVISTO' : (this.ending ? this.ending.title : 'O EXECRA CAIU')}</div>`;

    if (this.ending && this.ending.type === 'own') {
      html += `<div class="endingMsg" style="color:${cls.accent}; font-size:18px; margin:10px 0;">${this.ending.msg}</div>`;
    } else if (this.ending && this.ending.type === 'other') {
      html += `<div class="endingMsg" style="color:#ffd23f; font-size:18px; margin:10px 0;">Você é bom nisso... já pensou em ser ${this.ending.altLinePersona}?</div>`;
    }

    html += `<div class="reswrap">
      <div class="resc"><span>Classe</span><b style="color:${cls.accent}">${cls.name}</b></div>
      <div class="resc"><span>Tempo jogado</span><b>${this.formatTime(s.time)}</b></div>
      <div class="resc"><span>Inimigos</span><b>${s.kills}</b></div>
      <div class="resc"><span>Chefes</span><b>${s.bosses}</b></div>
      <div class="resc"><span>Mortes</span><b>${s.deaths}</b></div>
      <div class="resc"><span>Dano causado</span><b>${s.dmgDealt}</b></div>
      <div class="resc"><span>Dano recebido</span><b>${s.dmgTaken}</b></div>
      <div class="resc"><span>Maior combo</span><b>x${s.maxCombo}</b></div>
      <div class="resc"><span>Nível da arma</span><b>+${this.player.weapon.tier}</b></div>
      <div class="resc"><span>Power-ups</span><b>${s.powerups}</b></div>
      <div class="resc"><span>Exploração</span><b>${s.exploration} zonas</b></div>
    </div>
    <div class="timePlayed">TEMPO JOGADO: <b>${this.formatTime(s.time)}</b></div>
    <div class="finalScore">PONTUAÇÃO: <span style="color:${cls.accent}">${sc}</span></div>`;

    const rec = this.loadRecords();
    if (rec.bestScore) html += `<div class="records"><div>Recorde local — pontuação máxima: <b>${rec.bestScore}</b></div><div>Recorde — tempo: <b>${this.formatTime(rec.bestTime)}</b></div><div>Zeramentos: <b>${rec.wins}</b></div></div>`;
    if (this.newRecords && this.newRecords.length) {
      html += `<div class="newrecs">🎉 NOVOS RECORDES: ${this.newRecords.join(' · ')}</div>`;
    }
    html += `<div class="records">Jornada salva nos recordes locais.</div>`;

    html += `<div class="resbtns">`;
    if (this.ending && this.ending.type === 'other') {
      html += `<button class="btn" id="btnContinue">Continuar explorando</button> `;
    }
    html += `<button class="btn" id="btnMenu">Menu principal</button></div>`;

    el.innerHTML = html;
    byId('btnMenu').onclick = () => this.toMenu();
    if (this.ending && this.ending.type === 'other') {
      byId('btnContinue').onclick = () => {
        this.state = 'play';
        byId('results').classList.add('hidden');
      };
    }
    byId('results').classList.remove('hidden');
  },

  showRecords() {
    const rec = this.loadRecords();
    const el = byId('recordsPanel');
    let html = `<h2>RECORDES LOCAIS</h2>`;
    if (!rec.bestScore && !rec.byClass) {
      html += `<p>Nenhum recorde ainda. Zere o jogo para estabelecer seus recordes!</p>`;
    } else {
      html += `<div class="reswrap">`;
      if (rec.bestScore) html += `<div class="resc"><span>Maior pontuação</span><b>${rec.bestScore}</b></div>`;
      if (rec.bestTime) html += `<div class="resc"><span>Melhor tempo</span><b>${this.formatTime(rec.bestTime)}</b></div>`;
      if (rec.maxCombo) html += `<div class="resc"><span>Maior combo</span><b>x${rec.maxCombo}</b></div>`;
      if (rec.bestKills) html += `<div class="resc"><span>Mais inimigos</span><b>${rec.bestKills}</b></div>`;
      if (rec.bestBosses) html += `<div class="resc"><span>Mais chefes</span><b>${rec.bestBosses}</b></div>`;
      if (rec.bestDeaths !== undefined) html += `<div class="resc"><span>Menos mortes</span><b>${rec.bestDeaths}</b></div>`;
      if (rec.bestDmgDealt) html += `<div class="resc"><span>Mais dano causado</span><b>${rec.bestDmgDealt}</b></div>`;
      if (rec.bestExploration) html += `<div class="resc"><span>Mais exploração</span><b>${rec.bestExploration} zonas</b></div>`;
      if (rec.wins) html += `<div class="resc"><span>Zeramentos</span><b>${rec.wins}</b></div>`;
      html += `</div>`;
      html += `<div class="recclass"><h3>Melhor por classe</h3>`;
      for (const id in (rec.byClass || {})) {
        const c = rec.byClass[id];
        const sub = SUBCLASSES[id];
        if (!sub) continue;
        html += `<div class="resrow"><span style="color:${sub.accent}">${sub.name}</span><b>${c.bestScore} pts · ${this.formatTime(c.bestTime)} · ${c.wins} vit</b></div>`;
      }
      html += `</div>`;
      if (rec.lastRun) {
        const lr = rec.lastRun;
        html += `<div class="recclass"><h3>Última jornada (${lr.classname})</h3>`;
        html += `<div class="resrow"><span>Quando</span><b>${lr.date}</b></div>`;
        html += `<div class="resrow"><span>Pontuação</span><b>${lr.score} pts</b></div>`;
        html += `<div class="resrow"><span>Tempo jogado</span><b>${this.formatTime(lr.time)}</b></div>`;
        html += `<div class="resrow"><span>Inimigos / Chefes</span><b>${lr.kills} / ${lr.bosses}</b></div>`;
        html += `<div class="resrow"><span>Mortes</span><b>${lr.deaths}</b></div>`;
        html += `<div class="resrow"><span>Dano causado / recebido</span><b>${lr.dmgDealt} / ${lr.dmgTaken}</b></div>`;
        html += `<div class="resrow"><span>Maior combo</span><b>x${lr.maxCombo}</b></div>`;
        html += `<div class="resrow"><span>Arma</span><b>+${lr.weaponTier}</b></div>`;
        html += `<div class="resrow"><span>Power-ups</span><b>${lr.powerups}</b></div>`;
        html += `<div class="resrow"><span>Exploração</span><b>${lr.exploration} zonas</b></div>`;
        html += `</div>`;
      }
    }
    html += `<button class="btn" id="btnCloseRecords">Fechar</button>`;
    el.innerHTML = html;
    byId('btnCloseRecords').onclick = () => this.closeOverlay();
    byId('records').classList.remove('hidden');
  },

  toMenu() {
    this.state = 'menu';
    byId('results').classList.add('hidden');
    byId('records').classList.add('hidden');
    byId('death').classList.add('hidden');
    byId('hud').classList.add('hidden');
    byId('menu').classList.remove('hidden');
  },

};
