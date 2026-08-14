import { T } from './constants.js';

// --- Bênçãos: dons sagrados aprendidos com o clero durante a exploração ---
// tier 1-2 = ensinadas por Padres (comuns/intermediárias).
// tier 3   = ensinadas por Bispos (poderosas e raras).
// tier 4   = Bênção Suprema — ensinada apenas pelo Papa (10% de chance por partida).
//
// `lay: true` = bênção de sustento destinada aos LEIGOS (Templários e demais
// fiéis não ordenados): cura, coragem, proteção e movimento — reforço pessoal.
// As demais (luz, cadência, precisão, fúria, julgamento e Suprema) são dons
// sacramentais/ofensivos reservados ao Clero ordenado, que os exerce com
// autoridade eclesiástica.
export const BLESSINGS = {
  bencao_luz: { id: 'bencao_luz', name: 'Bênção da Luz', key: 'B', tier: 1, cd: 8, color: '#fff3b0',
    bless: 'nova', dmg: 1.7, type: T.HOLY, radius: 150,
    desc: 'Onda de luz sagrada explode ao redor do fiel.' },
  bencao_cura: { id: 'bencao_cura', name: 'Bênção da Misericórdia', key: 'B', tier: 1, cd: 13, color: '#7cff8a',
    bless: 'heal', heal: 0.5, purge: true, lay: true,
    desc: 'Cura metade da vida e purga veneno e malefícios.' },
  bencao_coragem: { id: 'bencao_coragem', name: 'Bênção da Coragem', key: 'B', tier: 1, cd: 10, color: '#ff9d5c',
    bless: 'buff', dmg: 0.40, spd: 0.25, dur: 9, lay: true,
    desc: '+40% de dano e +25% de velocidade por 9 segundos.' },
  bencao_escudo: { id: 'bencao_escudo', name: 'Escudo da Fé', key: 'B', tier: 2, cd: 11, color: '#ffe9a0',
    bless: 'shield', shield: 170, dur: 8, lay: true,
    desc: 'Absorve 170 de dano por 8 segundos.' },
  bencao_passo: { id: 'bencao_passo', name: 'Passos do Peregrino', key: 'B', tier: 2, cd: 6, color: '#c0b4ff',
    bless: 'blink', dist: 260, lay: true,
    desc: 'Teleporta na direção do cursor.' },
  bencao_cadencia: { id: 'bencao_cadencia', name: 'Bênção da Cadência', key: 'B', tier: 3, cd: 2.5, color: '#ffd23f',
    bless: 'barrage', dmg: 0.9, type: T.HOLY, speed: 820, n: 4, spread: 0.22, pierce: true,
    desc: 'Rajada veloz de dardos de luz perfurantes.' },
  bencao_precisao: { id: 'bencao_precisao', name: 'Bênção da Precisão', key: 'B', tier: 3, cd: 3.5, color: '#b0c4ff',
    bless: 'bolt', dmg: 2.6, type: T.HOLY, speed: 1100, pierce: true, size: 9,
    desc: 'Dardo de luz preciso que atravessa os inimigos.' },
  bencao_furia: { id: 'bencao_furia', name: 'Bênção da Fúria', key: 'B', tier: 3, cd: 5, color: '#ff9d5c',
    bless: 'nova', dmg: 3.2, type: T.HOLY, radius: 235,
    desc: 'Explosão de luz em área que fere tudo ao redor.' },
  bencao_julgamento: { id: 'bencao_julgamento', name: 'Bênção do Julgamento', key: 'B', tier: 3, cd: 9, color: '#ff6b6b',
    bless: 'beam', dmg: 4.5, type: T.HOLY, range: 420,
    desc: 'Coluna de julgamento que atravessa a multidão.' },
  bencao_suprema: { id: 'bencao_suprema', name: 'Bênção Suprema', key: 'H', tier: 4, cd: 0, color: '#fff',
    bless: 'supreme', radius: 430, singleUse: true,
    desc: 'Milagre de uso único: a luz divina aniquila qualquer ser na área do impacto.' }
};