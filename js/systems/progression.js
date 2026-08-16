import { weaponDamage, clamp, randint } from '../data/utils.js';
import { FINAL_ENDINGS } from '../data/monsters.js';

export const progression = {
  applyBarriers() {
    if (!this.world) return;
    for (const n of this.npcs) {
      if (n.kind !== 'seal') continue;
      const lv = n.segLevels || [];
      const defNeed = n.need !== undefined ? n.need : 3;
      let openedNow = false;
      (n.entrance || []).forEach((tile, i) => {
        const req = lv[i] !== undefined ? lv[i] : defNeed;
        if (req > this.progressLevel) return;
        const key = tile[0] + ',' + tile[1];
        if (this.world.openTiles.has(key)) return;
        this.world.openEntrance(tile[0], tile[1]);
        openedNow = true;
      });
      if (openedNow) {
        this.burst(n.px, n.py, n.color, 10, 180);
        this.ring(n.px, n.py, 44, 0.6, n.color, 4);
        this.shake += 2;
        this.sfx.upgrade();
      }
    }
  },

  // Concede pontos de progressão (nível de batalha) e aplica as barreiras.
  addProgression(points) {
    this.progressLevel += points;
    this.applyBarriers();
    this.banner('NÍVEL DE BATALHA ' + this.progressLevel + '!', '#ffe9b0', 3);
    this.burst(this.player.x, this.player.y, '#ffe9b0', 16, 240);
    this.ring(this.player.x, this.player.y, 90, 0.6, '#ffe9b0', 5);
    this.shake += 5;
    this.sfx.upgrade();
    this.hud();
    // Autosave: avanço do nível de batalha (e abertura de barreiras dos selos).
    if (this.saveSlot && !this._loading) this.saveGame(this.saveSlot, true);
  },

  // Diálogo genérico com NPC
  addGoal(m) {
    if (m.def.finalBoss) {
      if (m.def.casta === this.player.sub.casta) {
        this.ending = { type: 'own', casta: m.def.casta, bossId: m.def.id, ...FINAL_ENDINGS[m.def.id] };
      } else {
        const bossCastaData = FINAL_ENDINGS[m.def.id];
        this.ending = { type: 'other', casta: m.def.casta, bossId: m.def.id, altLinePersona: bossCastaData.poster };
      }
    }
  },

  openChest(x, y, big) {
    const p = this.player;
    this.burst(x, y - 6, '#ffd23f', 16, 220);
    this.burst(x, y - 6, '#fff', 8, 160);
    this.sfx.upgrade();
    this.stats.powerups++;
    if (big) {
      // baú de chefe: ouro gordo + upgrade de arma
      const gold = randint(200, 350);
      p.gold += gold;
      this.text(x, y - 20, '+' + gold + ' ouro', '#ffd23f', 16);
      if (p.weapon.tier < 12) {
        p.weapon.tier++;
        p.weapon.dmg = weaponDamage(p.weapon);
        this.text(x, y - 40, 'Arma +' + p.weapon.tier + '!', '#7ec8e3', 15);
      }
    } else {
      // baú final: triunfo
      const gold = randint(500, 800);
      p.gold += gold;
      this.text(x, y - 20, '+' + gold + ' ouro — TRIUNFO!', '#ffd23f', 18);
    }
    this.hud();
  },

  endGame() {
    if (this.finished) return;
    this.finished = true;
    this.state = 'win';
    this.monsters = [];
    this.projectiles = [];
    this.flags.final = true;
    this.sfx.bossDie();
    this.saveRecord();
    // Autosave do fim de jogo: ao recarregar, o jogador volta à tela de vitória.
    if (this.saveSlot && !this._loading) this.saveGame(this.saveSlot, true);

    if (this.ending && this.ending.type === 'own') {
      this.banner(this.ending.msg, this.player.sub.accent, 4);
      this.delayed.push({ t: 2.5, fn: () => this.showResults() });
    } else if (this.ending && this.ending.type === 'other') {
      const msg = `Você é bom nisso... já pensou em ser ${this.ending.altLinePersona}?`;
      this.banner(msg, '#ffd23f', 4);
      this.delayed.push({ t: 2.5, fn: () => this.showResults() });
    } else {
      // Fallback (should not happen with new system)
      this.showResults();
    }
  },

  score() {
    const s = this.stats;
    let pts = 0;
    pts += s.kills * 12;
    pts += s.bosses * 800;
    pts += s.exploration * 240;
    pts += s.powerups * 100;
    pts += clamp(s.maxCombo, 0, 40) * 10;
    pts += Math.round(clamp((1400 - s.time) / 5, 0, 200));
    pts -= s.deaths * 150;
    pts -= Math.round(s.dmgTaken * 0.15);
    if (this.finished) pts += 1500;
    return Math.max(0, Math.round(pts));
  },

};
