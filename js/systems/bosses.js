import { T } from '../data/constants.js';
import { rand, randint, dangerLoot, dangerAt } from '../data/utils.js';
import { FINAL_ENDINGS, CRYSTALS } from '../data/monsters.js';
import { Pickup } from '../entities/pickup.js';
import { byId } from '../dom.js';

export const bosses = {
  checkBossPhase(m) {
    if (m.bossInfo && m.maxHp > 0) {
      const phase = m.bossInfo.phases.filter((p, i) => m.hp <= p.hp && i > m.bossPhase).sort((a, b) => b.hp - a.hp)[0];
      if (phase) {
        m.bossPhase = m.bossInfo.phases.indexOf(phase);
        this.banner(phase.banner || m.def.name + ' enfureceu!', '#ff6b6b', 2.5);
        this.burst(m.x, m.y, '#ffd23f', 20, 320);
        this.ring(m.x, m.y, m.w, 0.6, '#ffd23f', 6);
        this.shake += 10;
        this.sfx.boss();
      }
    }
  },

  killMonster(m) {
    const d = m.def;
    if (d.explodeOnDeath) { this.selfDestruct(m); return; }
    m.dying = true;
    m.dieT = 0.3;
    this.burst(m.x, m.y, d.color, 16, 220);
    this.burst(m.x, m.y, d.dark, 8, 140);

    const regionDanger = dangerAt(this, m.x, m.y);
    const lootConfig = dangerLoot(regionDanger);

    const goldAmount = randint(d.gold[0], d.gold[1]);
    const finalGold = Math.round(goldAmount * lootConfig.goldMult);
    if (finalGold > 0) this.pickups.push(new Pickup(m.x, m.y - 10, 'coin', finalGold));
    
    if (Math.random() < lootConfig.heartChance) this.pickups.push(new Pickup(m.x + rand(-10,10), m.y - 20, 'heart'));
    if (Math.random() < lootConfig.powerChance) this.pickups.push(new Pickup(m.x + rand(-10,10), m.y - 30, 'powerup'));

    if (d.rare) {
      this.pickups.push(new Pickup(m.x, m.y - 25, 'heart'));
      this.pickups.push(new Pickup(m.x + rand(-10,10), m.y - 35, 'powerup'));
      this.banner(d.name + ' Derrotado! (RARO)', '#ffd23f', 2.2);
    }

    this.sfx.kill();
    this.stats.kills++;
    this.addGoal(m);
    if (d.boss) {
      this.stats.bosses++;
      this.bossDefeated(m);
    }
  },

  bossDefeated(m) {
    const d = m.def;
    this.bossesActive = this.bossesActive.filter(b => b !== m);
    this.boss = null;
    this.bossAggroed = false;

    // Track defeated boss per zone
    const bossZoneMap = {
      'krol_chefe': 'Floresta dos Goblins',
      'gere_osso': 'Catacumbas',
      'titan': 'Gruta do Execra'
    };
    if (bossZoneMap[d.id]) {
      this.defeatedBosses[bossZoneMap[d.id]] = true;
    }

    // Handle crystals and seal progression
    if (d.crystal) {
      const cry = CRYSTALS[d.crystal];
      this.crystals[d.crystal] = true;
      this.banner(cry.name + ' OBTIDO!', cry.color, 3);
      this.burst(m.x, m.y - 30, cry.color, 18, 240);
      this.sfx.upgrade();
    }

    // Vitória exclusiva: o jogo só finaliza quando os TRÊS chefes finais
    // específicos — Demônio, Arcano e General — estiverem mortos. A condição é
    // por identificador único (d.id), registrada em defeatedBosses: um chefe
    // extra, renascido ou duplicado não conta, e a ordem de derrota é irrelevante.
    const finalBossIds = ['demonio', 'arcano', 'general'];
    if (finalBossIds.includes(d.id)) {
      this.defeatedBosses[d.id] = true;
      if (finalBossIds.every(id => this.defeatedBosses[id])) {
        this.flags.final = true;
        this.endGame();
        return; // Fim de jogo: não executa a lógica comum de baú/banner.
      }
    }

    // Default boss defeated logic for any boss that doesn't trigger immediate ending
    this.banner(d.name.toUpperCase() + ' DESTRUÍDO!', '#ffd23f', 3);
    this.pickups.push(new Pickup(m.x, m.y - 20, 'chest', 1));

    // Progressão de nível de batalha: Krol (+1, leva ao nível 1) e o Rei da
    // Noite/Alvorada dos Mortos (+2, leva ao nível 3). Cada chefe concede o
    // bônus apenas uma vez, mesmo que renasça após uma morte.
    const gain = { krol_chefe: 1, gere_osso: 2 }[d.id];
    if (gain && !this.progressionGranted[d.id]) {
      this.progressionGranted[d.id] = true;
      this.addProgression(gain);
    }
  },

  bossAggro(m) {
    this.bossAggroed = true;
    this.boss = m;
    this.banner(m.def.name.toUpperCase(), '#ff6b6b', 2.5);
    this.sfx.boss();
  },

  updateBoss(m, dt, dx, dy, d2) {
    const p = this.player;
    if (m.aggro > 0 && !this.bossAggroed) this.bossAggro(m);
    if (m.aggro <= 0) return;
    if (m.stunned > 0) return;

    // Intro for final bosses
    if (m.def.finalBoss && !m.introShown) {
      m.introShown = true;
      this.showBossIntro(m);
    }

    const atk = m.def.id === 'krol_chefe' ? this.krolPattern(m, dt, dx, dy, d2)
             : m.def.id === 'gere_osso' ? this.gerePattern(m, dt, dx, dy, d2)
             : m.def.id === 'titan' ? this.titanPattern(m, dt, dx, dy, d2)
             : m.def.id === 'demonio' ? this.demonioPattern(m, dt, dx, dy, d2)
             : m.def.id === 'general' ? this.generalPattern(m, dt, dx, dy, d2)
             : m.def.id === 'arcano' ? this.arcanoPattern(m, dt, dx, dy, d2)
             : null;
    if (atk) m.stunned = atk;
    // movimento básico em direção ao jogador quando não está atacando
    if (m.bossCd <= 0.6 && d2 > m.w * 0.9) {
      const ad = Math.atan2(dy, dx);
      const sp = m.speedJit * 0.6;
      if (m.stunned <= 0) {
        m.vx += (Math.cos(ad) * sp - m.vx) * Math.min(1, dt * 3);
        m.vy += (Math.sin(ad) * sp - m.vy) * Math.min(1, dt * 3);
      }
    }
  },

  krolPattern(m, dt, dx, dy, d2) {
    m.bossCd -= dt;
    m.dashCd = (m.dashCd == null) ? 10 : m.dashCd - dt;
    const p = this.player;
    const d = m.def;

    // DASH PREDITIVO (a cada 10s): o Krol grava a posição exata do jogador,
    // prepara por ~1s e dispara até lá — sem rastreá-lo. Se o jogador sair do
    // lugar durante a preparação, o dash segue para o ponto registrado.
    if (m.dashCd <= 0 && m.bossCd <= 0) {
      m.dashCd = 10;
      m.bossCd = 2.8;
      m.vx = 0; m.vy = 0;
      const tx = p.x, ty = p.y;
      this.banner('KROL MARCA SEU ALVO!', '#ff8a5c', 1);
      this.ring(tx, ty, 26, 0.9, '#ff5c5c', 3);   // onde o jogador ESTAVA
      this.ring(m.x, m.y, 70, 0.9, '#a14b3c', 4); // preparo no próprio Krol
      this.delayed.push({ t: 1.0, fn: () => {
        const dist = Math.hypot(tx - m.x, ty - m.y) || 1;
        const flight = Math.max(0.22, Math.min(0.5, dist / 1000));
        const a = Math.atan2(ty - m.y, tx - m.x);
        m.vx = Math.cos(a) * 850;
        m.vy = Math.sin(a) * 850;
        this.ring(m.x, m.y, 120, 0.5, '#ff8a5c', 4);
        // Frenagem ao chegar ao ponto: não vira perseguição.
        this.delayed.push({ t: flight, fn: () => {
          m.vx = 0; m.vy = 0;
          this.burst(m.x, m.y, '#a14b3c', 16, 240);
          this.ring(m.x, m.y, 60, 0.4, '#ff5c5c', 4);
          this.shake += 6;
          this.sfx.explosion();
          if (Math.hypot(p.x - m.x, p.y - m.y) < 62 + p.w / 2) this.damagePlayer(Math.round(d.dmg * 0.9));
        } });
      } });
      return 1.0;
    }

    if (m.bossCd > 0) return 0;
    m.bossCd = 0;
    // fase 2 (HP < 55%) adiciona investida
    const phase2 = m.hp < m.maxHp * 0.55;
    const r = Math.random();
    if (r < 0.3) {
      // guincho: convoca goblins
      m.bossCd = 3.2;
      this.sfx.boss();
      this.burst(m.x, m.y, d.color, 12, 180);
      this.ring(m.x, m.y, 120, 0.5, '#a14b3c', 4);
      this.banner('KROL GRITA!', '#ff8a5c', 1.2);
      for (let i = 0; i < (phase2 ? 3 : 2); i++) this.summonMinion(m.x, m.y, 'goblin');
      return 0;
    } else if (r < 0.75 && phase2 && d2 > 150) {
      // investida
      m.bossCd = 1.2;
      this.banner('INVESTIDA!', '#ff8a5c', 1);
      const a = Math.atan2(dy, dx);
      this.ring(m.x, m.y, 160, 0.5, '#a14b3c', 3);
      this.delayed.push({ t: 0.3, fn: () => {
        m.vx = Math.cos(a) * 700; m.vy = Math.sin(a) * 700;
        this.ring(m.x, m.y, 200, 0.8, '#ff5c5c', 4);
      } });
      return 0.4;
    } else {
      // mordida/cargas de golpes no chão
      m.bossCd = 2;
      const a = Math.atan2(dy, dx);
      this.ring(m.x + Math.cos(a) * 60, m.y + Math.sin(a) * 60, 60, 0.5, d.color, 3);
      this.delayed.push({ t: 0.4, fn: () => this.bossSlam(m, { x: Math.cos(a) * 60, y: Math.sin(a) * 60 }) });
      return 0.5;
    }
  },

  gerePattern(m, dt, dx, dy, d2) {
    m.bossCd -= dt;
    const d = m.def;
    if (m.bossCd > 0) return 0;
    m.bossCd = 0;
    const phase2 = m.hp < m.maxHp * 0.5;
    const r = Math.random();
    // Rajada mais agressiva: mais frequente (cd menor) e dispara mesmo quando o
    // jogador tenta se manter longe — ficar só na distância deixou de ser seguro.
    if (r < 0.4 || (d2 > 380 && r < 0.8)) {
      // rajada de ossos
      m.bossCd = 1.7;
      this.banner('RAJADA DE OSSOS!', '#d9d0c0', 1.2);
      const a = Math.atan2(dy, dx);
      this.ring(m.x, m.y, 90, 0.6, '#d9d0c0', 3);
      const base = Math.atan2(dy, dx);
      const nsh = phase2 ? 9 : 7;
      for (let i = 0; i < nsh; i++) {
        const off = (i - (nsh - 1) / 2) * 0.16;
        const ang = base + off + (Math.random() - 0.5) * 0.1;
        this.delayed.push({ t: 0.3 + i * 0.035, fn: () => this.shootEnemy(m, Math.cos(ang) * 100, Math.sin(ang) * 100, { speed: 400, bone: true }) });
      }
      return 0.5;
    } else if (r < 0.7) {
      // convoca esqueletos
      m.bossCd = 3.5;
      this.banner('ALVORADA DOS MORTOS!', '#c9c9c9', 1.2);
      const n = phase2 ? 4 : 3;
      for (let i = 0; i < n; i++) this.summonMinion(m.x, m.y, 'skeleton');
      this.ring(m.x, m.y, 140, 0.6, '#a9a9a9', 4);
      this.sfx.boss();
      return 0.6;
    } else {
      // lâmina giratória (telegraph + dano em área)
      m.bossCd = 2.6;
      this.banner('CÍRCULO DOS OSSOS!', '#d9d0c0', 1.2);
      this.ring(m.x, m.y, 100, 0.7, '#ff5c5c', 4);
      this.delayed.push({ t: 0.7, fn: () => {
        this.burst(m.x, m.y, '#d9d0c0', 16, 240);
        this.ring(m.x, m.y, 100, 0.5, '#ff5c5c', 5);
        const p = this.player;
        if (Math.hypot(p.x - m.x, p.y - m.y) < 110) this.damagePlayer(Math.round(d.dmg * 0.85));
      } });
      return 0.8;
    }
  },

  titanPattern(m, dt, dx, dy, d2) {
    m.bossCd -= dt;
    const d = m.def;
    const p = this.player;
    if (m.bossCd > 0) return 0;
    m.bossCd = 0;
    const phase1 = m.hp > m.maxHp * 0.6;
    const phase3 = m.hp < m.maxHp * 0.3;
    const r = Math.random();
    if (r < 0.35) {
      // garras no chão: slam
      m.bossCd = 2.2;
      this.banner('MARTELADA!', '#8a6a4b', 1);
      this.ring(m.x, m.y, 90, 0.5, '#8a6a4b', 3);
      this.delayed.push({ t: 0.5, fn: () => this.bossSlam(m) });
      return 0.6;
    } else if (r < 0.7) {
      // raging rocks
      m.bossCd = 2.8;
      this.banner('PEDRAS!', '#8a6a4b', 1);
      const base = Math.atan2(dy, dx);
      const nsh = phase1 ? 3 : 4;
      for (let i = 0; i < nsh; i++) {
        const off = (i - (nsh - 1) / 2) * 0.3;
        const ang = base + off;
        this.shootEnemy(m, Math.cos(ang) * 100, Math.sin(ang) * 100, { speed: 260, big: true, fromBoss: true });
      }
      return 0.4;
    } else if (phase3) {
      // convoca espectros
      m.bossCd = 5;
      this.banner('FÚRIA DAS TREVAS!', '#ff5c5c', 2);
      for (let i = 0; i < 2; i++) this.summonMinion(m.x, m.y, 'wraith');
      this.ring(m.x, m.y, 160, 0.6, '#ff5c5c', 4);
      this.sfx.boss();
      return 0.6;
    } else {
      // salto + tremor
      m.bossCd = 3.4;
      this.banner('TREMOR!', '#8a6a4b', 1);
      this.ring(m.x, m.y, 180, 0.7, '#ff5c5c', 4);
      this.delayed.push({ t: 0.6, fn: () => {
        this.shake += 12;
        this.sfx.explosion();
        this.burst(m.x, m.y, '#6e5a4b', 20, 280);
        const pp = this.player;
        if (Math.hypot(pp.x - m.x, pp.y - m.y) < 200) this.damagePlayer(Math.round(d.dmg * 0.9));
      } });
      return 0.5;
    }
  },

  demonioPattern(m, dt, dx, dy, d2) {
    m.bossCd -= dt;
    const p = this.player;
    if (m.bossCd > 0) return 0;
    m.bossCd = 0;
    const phase2 = m.hp < m.maxHp * 0.5;
    const r = Math.random();
    if (r < 0.2) {
      // Infernal Breath: cone of fire (mais largo e mais frequente)
      m.bossCd = 1.8;
      this.banner('SOPRO INFERNAL!', '#ff6b6b', 1.2);
      const a = Math.atan2(dy, dx);
      for (let i = -3; i <= 3; i++) {
        const ang = a + i * 0.22;
        this.shootEnemy(m, Math.cos(ang) * 80, Math.sin(ang) * 80, { speed: 380, big: true, fromBoss: true });
      }
      return 0.5;
    } else if (r < 0.38) {
      // RAIO DIRECIONADO: captura a posição atual do jogador, prepara e dispara
      // uma linha contínua do Demônio até a parede nessa direção fixa. Depois de
      // capturada, o raio não segue o jogador — saia do caminho na preparação.
      m.bossCd = 2.2;
      m.vx = 0; m.vy = 0;
      const sx = p.x, sy = p.y;
      this.banner('RAIO DA CONDENAÇÃO!', '#ff5c5c', 1);
      this.ring(m.x, m.y, 60, 0.7, '#ff5c5c', 4);
      this.ring(sx, sy, 20, 0.7, '#ff9d5c', 2);   // marca onde o jogador estava
      this.delayed.push({ t: 0.7, fn: () => {
        const a = Math.atan2(sy - m.y, sx - m.x);
        const ux = Math.cos(a), uy = Math.sin(a);
        const len = this.beamToWall(m.x, m.y, ux, uy, 900);
        this.beamEffect(m.x, m.y, ux, uy, len, '#ff5c5c');
        const relX = p.x - m.x, relY = p.y - m.y;
        const proj = relX * ux + relY * uy;
        if (proj > 0 && proj < len) {
          const perp = Math.abs(relX * uy - relY * ux);
          if (perp < 28) this.damagePlayer(Math.round(m.def.dmg * 0.9));
        }
      } });
      return 0.6;
    } else if (r < 0.62) {
      // ESFERA CONDENADA: um projétil que ricocheteia nas paredes da arena por
      // 10s, transformando o espaço em ameaça. Ele não some ao tocar a parede.
      m.bossCd = 2.4;
      m.vx = 0; m.vy = 0;
      this.banner('ESFERA CONDENADA!', '#ff9d5c', 1);
      this.ring(m.x, m.y, 70, 0.6, '#ff9d5c', 4);
      this.delayed.push({ t: 0.6, fn: () => {
        const a = Math.atan2(dy, dx);
        this.shootEnemy(m, Math.cos(a) * 80, Math.sin(a) * 80, {
          speed: 380, life: 10, bounce: true, color: '#ff6b6b'
        });
        this.ring(m.x, m.y, 90, 0.4, '#ff5c5c', 4);
      } });
      return 0.6;
    } else if (r < 0.82 && phase2) {
      // Summon Demoninhos
      m.bossCd = 2.8;
      this.banner('FILHOS DO CAOS!', '#ff5c5c', 1.5);
      for (let i = 0; i < 3; i++) this.summonMinion(m.x, m.y, 'demoninho');
      this.ring(m.x, m.y, 120, 0.6, '#c0504a', 4);
      this.sfx.boss();
      return 0.6;
    } else {
      // Charge + Slam
      m.bossCd = 1.6;
      this.banner('INVESTIDA DO DEMÔNIO!', '#c0392b', 1);
      const a = Math.atan2(dy, dx);
      this.ring(m.x + Math.cos(a) * 60, m.y + Math.sin(a) * 60, 60, 0.5, '#ff5c5c', 3);
      this.delayed.push({ t: 0.35, fn: () => {
        m.vx = Math.cos(a) * 650; m.vy = Math.sin(a) * 650;
        this.ring(m.x, m.y, 200, 0.7, '#ff5c5c', 5);
      } });
      this.delayed.push({ t: 0.6, fn: () => this.bossSlam(m) });
      return 0.7;
    }
  },

  // Comprimento do feixe do Demônio até a primeira parede na direção dada.
  beamToWall(x, y, ux, uy, maxLen) {
    const step = 10;
    let len = step;
    while (len <= maxLen) {
      if (this.world.solidPixel(x + ux * len, y + uy * len)) return len;
      len += step;
    }
    return maxLen;
  },

  generalPattern(m, dt, dx, dy, d2) {
    m.bossCd -= dt;
    const p = this.player;
    if (m.bossCd > 0) return 0;
    m.bossCd = 0;
    const phase2 = m.hp < m.maxHp * 0.4;
    const r = Math.random();
    if (r < 0.35) {
      // Volley of gunfire
      m.bossCd = 2.2;
      this.banner('SALVA DE ARQUEBUSES!', '#b5651d', 1);
      const base = Math.atan2(dy, dx);
      const nsh = phase2 ? 12 : 8;
      for (let i = 0; i < nsh; i++) {
        const off = (i - (nsh - 1) / 2) * 0.15 + (Math.random() - 0.5) * 0.1;
        this.shootEnemy(m, Math.cos(base + off) * 100, Math.sin(base + off) * 100, { speed: 500, bone: true });
      }
      return 0.4;
    } else if (r < 0.65) {
      // Tactical Charge
      m.bossCd = 1.8;
      this.banner('CARGA TÁTICA!', '#c0392b', 1);
      const a = Math.atan2(dy, dx);
      this.ring(m.x, m.y, 80, 0.4, '#ffd23f', 3);
      this.delayed.push({ t: 0.25, fn: () => {
        m.vx = Math.cos(a) * 700; m.vy = Math.sin(a) * 700;
        this.ring(m.x, m.y, 160, 0.6, '#ff5c5c', 4);
      } });
      return 0.4;
    } else {
      // Summon Soldiers + Shield
      m.bossCd = 4;
      this.banner('GUARNIÇÃO, AVANTE!', '#a0a8a0', 1.5);
      for (let i = 0; i < (phase2 ? 4 : 3); i++) this.summonMinion(m.x, m.y, 'soldado_leal');
      m.status = m.status || {};
      m.status.shield = 150;
      m.status.shieldT = 8;
      this.ring(m.x, m.y, 140, 0.7, '#ffd27f', 5);
      this.sfx.buff();
      return 0.6;
    }
  },

  arcanoPattern(m, dt, dx, dy, d2) {
    m.bossCd -= dt;
    const p = this.player;
    if (m.bossCd > 0) return 0;
    m.bossCd = 0;
    const phase2 = m.hp < m.maxHp * 0.4;
    const phase3 = m.hp < m.maxHp * 0.2;
    const r = Math.random();
    if (r < 0.22) {
      // EXPLOSÃO RADIAL: 8 projéteis a 45°, todos partindo do centro do Arcano.
      // Há espaço entre eles — o jogador precisa se posicionar nos intervalos.
      m.bossCd = 2.1;
      this.banner('EXPLOSÃO ARCANO!', '#ff9d5c', 1.2);
      this.ring(m.x, m.y, 64, 0.7, '#a08ad8', 4);
      this.delayed.push({ t: 0.7, fn: () => {
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * 6.283 + 0.3927; // 45° com leve giro
          this.shootEnemy(m, Math.cos(a) * 80, Math.sin(a) * 80, { speed: 430, big: true, fromBoss: true });
        }
        this.ring(m.x, m.y, 100, 0.5, '#ff9d5c', 5);
      } });
      return 0.5;
    } else if (r < 0.42) {
      // Chaos Burst: radial projectiles
      m.bossCd = 1.7;
      this.banner('CAOS ARCANO!', '#a08ad8', 1);
      for (let i = 0; i < (phase2 ? 16 : 12); i++) {
        const a = (i / (phase2 ? 16 : 12)) * 6.283;
        this.shootEnemy(m, Math.cos(a) * 80, Math.sin(a) * 80, { speed: 340, big: true, fromBoss: true });
      }
      this.ring(m.x, m.y, 120, 0.6, '#a08ad8', 4);
      return 0.4;
    } else if (r < 0.62) {
      // DIVISÃO: o Arcano materializa aparições próximas ao jogador — nunca
      // exatamente sobre ele — com anel de aviso antes de nascerem.
      m.bossCd = 2.1;
      this.banner('O ARCANO SE DIVIDE!', '#a08ad8', 1.2);
      this.arcaneSplit(m, phase2 ? 3 : 2);
      return 0.5;
    } else if (r < 0.8) {
      // Teleport + Devour (pull)
      m.bossCd = 2;
      this.banner('DEVORAR!', '#8e44ad', 1.2);
      const tx = p.x + rand(-100, 100), ty = p.y + rand(-100, 100);
      if (!this.world.solidBox({ x: tx - m.w/2, y: ty - m.h/2, w: m.w, h: m.h })) {
        m.x = tx; m.y = ty;
        this.burst(m.x, m.y, '#c0b4ff', 14, 200);
      }
      // Pull player
      const pullDist = 250;
      const pd = Math.hypot(p.x - m.x, p.y - m.y);
      if (pd < pullDist) {
        const ang = Math.atan2(m.y - p.y, m.x - p.x);
        p.vx += Math.cos(ang) * 400;
        p.vy += Math.sin(ang) * 400;
      }
      this.delayed.push({ t: 0.3, fn: () => {
        this.ring(m.x, m.y, 140, 0.5, '#ff5c5c', 4);
        if (Math.hypot(p.x - m.x, p.y - m.y) < 150) this.damagePlayer(Math.round(m.def.dmg * 0.7));
      } });
      return 0.5;
    } else if (phase3) {
      // Summon Homúnculos
      m.bossCd = 3.8;
      this.banner('HOMÚNCULOS, DESPERTAI!', '#d8a0b0', 1.5);
      for (let i = 0; i < 3; i++) this.summonMinion(m.x, m.y, 'homunculo');
      this.ring(m.x, m.y, 180, 0.7, '#ff5c5c', 5);
      this.sfx.boss();
      return 0.6;
    } else {
      // Arcane Beam
      m.bossCd = 2.3;
      this.banner('RAIO ARCANO!', '#7a6bd8', 1);
      const a = Math.atan2(dy, dx);
      this.ring(m.x, m.y, 80, 0.5, '#c0b4ff', 3);
      this.delayed.push({ t: 0.5, fn: () => {
        this.beamEffect(m.x, m.y, Math.cos(a), Math.sin(a), 360, '#a08ad8');
        for (const mm of this.monsters) {
          if (mm.dying || mm.dead) continue;
          const mx = mm.x - m.x, my = mm.y - m.y;
          const proj = mx * Math.cos(a) + my * Math.sin(a);
          if (proj > 0 && proj < 360) {
            const perp = Math.abs(mx * Math.sin(a) - my * Math.cos(a));
            if (perp < 30) this.damageMonster(mm, m.def.dmg, T.MAGIC);
          }
        }
      } });
      return 0.6;
    }
  },

  showBossIntro(m) {
    this.state = 'bossintro';
    const data = FINAL_ENDINGS[m.def.id] || { intro: ['Um inimigo poderoso aparece!'], title: m.def.name };
    let html = `<h2>${data.title || m.def.name.toUpperCase()}</h2><div class="introText">`;
    (data.intro || []).forEach(line => { html += `<p>${line}</p>`; });
    html += `</div><button class="btn" id="btnBossIntro">Enfrentar</button>`;
    byId('bossintroPanel').innerHTML = html;
    byId('bossintro').classList.remove('hidden');
    byId('btnBossIntro').onclick = () => {
      byId('bossintro').classList.add('hidden');
      this.state = 'play';
    };
  },

};
