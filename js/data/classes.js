import { T } from './constants.js';

export const CASTAS = {
  clero:   { name: 'Clero',   color: '#f5e6b8', accent: '#c9a227', relation: 'Vocação e autoridade sacramental', desc: 'Servos da luz. Curam aliados e golpeiam com poder sagrado.' },
  templarios: { name: 'Templários', color: '#e8e4d8', accent: '#c0392b', relation: 'Leigos: fé, oração e bênçãos de sustento', desc: 'Cavaleiros templários. Fé em combate, aço e devoção.' },
  mago:    { name: 'Mago',    color: '#b8b8f5', accent: '#7a6bd8', relation: 'Pagãos: saber arcano alheio à Igreja', desc: 'Eruditos do arcano. Desencadeiam magia pura e devastadora.' }
};

export const SUBCLASSES = {
  padre: {
    id: 'padre', casta: 'clero', name: 'Padre', color: '#f2e2a8', accent: '#c9a227',
    desc: 'Sacerdote: confessa, cura e enfrenta o maligno com orações.',
    hp: 120, speed: 240, str: 8, int: 18, jump: 780,
    ordained: true, exorcistLevel: 1,
    weapon: { name: 'Cajado do Pastor', base: 12, color: '#8a5a2b', kind: 'aura' },
    attack: { kind: 'aura', dmg: 1.15, type: T.HOLY, radius: 150, cd: 0.7, color: '#fff3b0' },
    aura: { radius: 95, dmg: 0.4, tick: 0.6 },
    skills: [
      { id: 'confession', name: 'Confissão', key: 'Q', cd: 9, color: '#ffe66d',
        desc: 'O Padre se recolhe espiritualmente: imune a qualquer dano por 10s.',
        immune: 10 },
      { id: 'uncao', name: 'Unção dos Enfermos', key: 'E', cd: 22, color: '#ffd27f',
        desc: 'Cura 100% da vida e aumenta o dano em 30% por 15s.',
        heal: 1.0, dmg: 0.30, dur: 15 }
    ]
  },
  bispo: {
    id: 'bispo', casta: 'clero', name: 'Bispo', color: '#e8b0b0', accent: '#a23b3b',
    desc: 'Plenitude do sacerdócio: autoridade, exorcismo solene e milagres.',
    hp: 165, speed: 205, str: 12, int: 16, jump: 760,
    ordained: true, exorcistLevel: 2,
    weapon: { name: 'Báculo Episcopal', base: 17, color: '#7a3b3b', kind: 'aura' },
    attack: { kind: 'aura', dmg: 1.5, type: T.HOLY, radius: 205, cd: 0.9, color: '#ffe9b0' },
    aura: { radius: 145, dmg: 0.55, tick: 0.6 },
    skills: [
      { id: 'shield', name: 'Escudo Divino', key: 'Q', cd: 12, color: '#ffd27f', desc: 'Absorve 90 de dano por 7s.', shield: 90, dur: 7 },
      { id: 'grande_exorcismo', name: 'Grande Exorcismo', key: 'E', cd: 30, color: '#fff3b0',
        desc: 'Purga todos os inimigos visíveis, causando 140 de dano de luz sagrada.',
        dmg: 140, type: T.HOLY }
    ]
  },
  diacono: {
    id: 'diacono', casta: 'clero', name: 'Diácono', color: '#c8e8e0', accent: '#2f8a8a',
    desc: 'Servo: batiza, proclama e abençoa. Não exorciza nem confessa.',
    hp: 105, speed: 275, str: 9, int: 18, jump: 800,
    ordained: false, exorcistLevel: 0,
    weapon: { name: 'Cajado da Devoção', base: 12, color: '#2f8a8a', kind: 'ranged' },
    attack: { kind: 'ranged', dmg: 1.0, type: T.HOLY, speed: 620, cd: 0.32, color: '#d8fff0', size: 8, pierce: true },
    skills: [
      { id: 'batismo', name: 'Batismo', key: 'Q', cd: 8, color: '#bfe8ff',
        desc: 'Águas do batismo: congela todos os inimigos na tela por 3 segundos.',
        freeze: 3 },
      { id: 'caridade', name: 'Bênção da Caridade', key: 'E', cd: 10, color: '#ffe66d',
        desc: 'Bênção derramada: causa pouco dano a todos os inimigos da tela ao mesmo tempo.',
        dmg: 0.5, type: T.HOLY }
    ]
  },
  guerreiro: {
    id: 'guerreiro', casta: 'templarios', name: 'Guerreiro', color: '#e8e0d0', accent: '#c0392b',
    desc: 'Cavaleiro do Templo: combo de espada, giro e investida.',
    hp: 155, speed: 255, str: 18, int: 6, jump: 750,
    weapon: { name: 'Espada do Templo', base: 16, color: '#c9c9d2', kind: 'melee' },
    attack: { kind: 'melee', dmg: 1.2, type: T.PHYS, range: 82, cd: 0.32, combo: 3, color: '#ffd6a5' },
    skills: [
      { id: 'spin', name: 'Giro', key: 'Q', cd: 5, color: '#ff9d5c', desc: 'Golpe circular ao redor.', dmg: 1.5, type: T.PHYS, radius: 95 },
      { id: 'dash', name: 'Investida', key: 'E', cd: 7, color: '#ff6b6b', desc: 'Avança rapidamente causando dano no caminho.', dmg: 1.7, type: T.PHYS, dist: 300 }
    ]
  },
  arqueiro: {
    id: 'arqueiro', casta: 'templarios', name: 'Arqueiro', color: '#d8e0c0', accent: '#c0392b',
    desc: 'Arqueiro do Templo: flechas rápidas e chuva de projéteis.',
    hp: 100, speed: 265, str: 13, int: 9, jump: 820,
    weapon: { name: 'Arco do Templo', base: 13, color: '#7a5a2b', kind: 'ranged' },
    attack: { kind: 'ranged', dmg: 1.0, type: T.PHYS, speed: 660, cd: 0.42, color: '#f0e6c8', size: 8, charge: 1.0, chargedDmg: 3.0, chargedSpeed: 1800 },
    skills: [
      { id: 'spread', name: 'Rajada', key: 'Q', cd: 3.5, color: '#7ec8e3', desc: '3 flechas em leque.', dmg: 0.85, type: T.PHYS, speed: 660, n: 3, spread: 0.32 },
      { id: 'rain', name: 'Chuva de Flechas', key: 'E', cd: 10, color: '#9be7ff', desc: 'Flechas caem na área do cursor.', dmg: 1.15, type: T.PHYS, n: 8, radius: 80, delay: 0.8 }
    ]
  },
  inventor: {
    id: 'inventor', casta: 'templarios', name: 'Inventor', color: '#d8ccb0', accent: '#c0392b',
    desc: 'Engenho do Templo: artilharia explosiva e fervor de batalha.',
    hp: 125, speed: 245, str: 15, int: 10, jump: 770,
    weapon: { name: 'Martelo do Templo', base: 14, color: '#c98a2e', kind: 'melee' },
    attack: { kind: 'melee', dmg: 1.8, type: T.PHYS, range: 112, cd: 0.36, combo: 2, color: '#ffc2a0' },
    skills: [
      { id: 'grenade', name: 'Bombarda', key: 'Q', cd: 5, color: '#ffb020', desc: 'Bombarda incendiária que explode em área e destrói árvores e rochas.', dmg: 1.9, type: T.MAGIC, radius: 95, throw: 1 },
      { id: 'overclock', name: 'Fervor da Cruzada', key: 'E', cd: 15, color: '#7cffb0', desc: 'Fervor sagrado: muito dano e velocidade por 6s.', dmg: 0.6, spd: 0.35, dur: 6 }
    ]
  },
  elemental: {
    id: 'elemental', casta: 'mago', name: 'Elemental', color: '#f0b0a8', accent: '#e67e22',
    desc: 'Bolas de fogo e meteoros.',
    hp: 95, speed: 250, str: 7, int: 20, jump: 790,
    weapon: { name: 'Orbe Flamejante', base: 14, color: '#e67e22', kind: 'ranged' },
    attack: { kind: 'ranged', dmg: 1.0, type: T.MAGIC, speed: 520, cd: 0.4, color: '#ffb35c', size: 9 },
    skills: [
      { id: 'fireball', name: 'Bola de Fogo', key: 'Q', cd: 6, color: '#ff7b3c', desc: 'Explosão de fogo em área.', dmg: 2.4, type: T.MAGIC, speed: 360, size: 14, radius: 85, shake: 1 },
      { id: 'meteor', name: 'Meteoro', key: 'E', cd: 14, color: '#ff5c5c', desc: 'Meteoro devastador cai no cursor.', dmg: 3.3, type: T.MAGIC, radius: 120, delay: 1.0, shake: 1 }
    ]
  },
  psiquico: {
    id: 'psiquico', casta: 'mago', name: 'Psíquico', color: '#d8c0f0', accent: '#8e44ad',
    desc: 'Empurrões psíquicos e voo.',
    hp: 110, speed: 255, str: 8, int: 19, jump: 790,
    weapon: { name: 'Orbe Psíquico', base: 13, color: '#8e44ad', kind: 'ranged' },
    attack: { kind: 'ranged', dmg: 1.0, type: T.MAGIC, speed: 560, cd: 0.38, color: '#d8b4ff', size: 9 },
    skills: [
      { id: 'push', name: 'Empurrão Psíquico', key: 'Q', cd: 6, color: '#b07cff', desc: 'Onda que empurra e danifica ao redor.', dmg: 1.5, type: T.MAGIC, radius: 135, knock: 650 },
      { id: 'blink', name: 'Passo Etéreo', key: 'E', cd: 9, color: '#e0c8ff', desc: 'Teleporta-se na direção do movimento/cursor.', dist: 190 }
    ]
  },
  abencoador: {
    id: 'abencoador', casta: 'mago', name: 'Abençoador', color: '#b8d8f0', accent: '#2980b9',
    desc: 'Raios de luz e aura restauradora.',
    hp: 105, speed: 240, str: 8, int: 20, jump: 760,
    weapon: { name: 'Livro de Luz', base: 14, color: '#2980b9', kind: 'ranged' },
    attack: { kind: 'ranged', dmg: 1.0, type: T.MAGIC, speed: 640, cd: 0.34, color: '#bfe8ff', size: 8, pierce: true },
    skills: [
      { id: 'beam', name: 'Raio Divino', key: 'Q', cd: 7, color: '#fff9c4', desc: 'Coluna de luz na direção do cursor.', dmg: 2.7, type: T.MAGIC, range: 360 },
      { id: 'aura', name: 'Aura', key: 'E', cd: 15, color: '#c4ffb0', desc: 'Aura: cura contínua e +25% de dano por 8s.', heal: 0.02, dmg: 0.25, dur: 8 }
    ]
  },
  papa: {
    id: 'papa', casta: 'clero', name: 'Papa', color: '#fff7e0', accent: '#e6b422',
    desc: 'O sumo pontífice de Eclésia. Recompensa secreta: coisa alguma se sustenta diante da sua palavra.',
    hp: 500, speed: 265, str: 38, int: 46, jump: 800,
    ordained: true, exorcistLevel: 3,
    weapon: { name: 'Báculo de São Pedro', base: 50, color: '#f4f0e0', kind: 'aura' },
    attack: { kind: 'aura', dmg: 2.6, type: T.HOLY, radius: 265, cd: 0.55, color: '#fff3b0' },
    aura: { radius: 250, dmg: 1.5, tick: 0.5 },
    skills: [
      { id: 'palavra_santa', name: 'Palavra Santa', key: 'Q', cd: 4, color: '#fff9c4',
        desc: 'O eco da palavra que varre a montanha: nova sagrada devastadora ao redor.',
        dmg: 6.5, type: T.HOLY, radius: 270 },
      { id: 'jubileu', name: 'Jubileu', key: 'E', cd: 14, color: '#ffe9b0',
        desc: 'Ano de graça: purga todos os inimigos da tela com dano sagrado imenso e cura o Papa.',
        dmg: 380, type: T.HOLY, heal: 1.0 }
    ]
  }
};

export const SUB_ORDER = ['diacono', 'padre', 'bispo', 'papa', 'guerreiro', 'arqueiro', 'inventor', 'elemental', 'psiquico', 'abencoador'];
export const CASTA_ORDER = ['clero', 'templarios', 'mago'];

// Nível de desbloqueio de cada subclasse dentro da sua casta:
// tier 0 = disponível de início; tier 1+ = exige progressão.
// Regra atual (sequencial estrita): para desbloquear uma classe é preciso ter
// VENCIDO o jogo com a classe ANTERIOR da mesma casta (ordem de castaLine).
// A resolução fica em GAME.isClassUnlocked (js/game.js); troque lá se quiser
// mudar a regra sem mexer na interface.
export const CLASS_TIER = {
  diacono: 0, padre: 1, bispo: 2,
  guerreiro: 0, arqueiro: 1, inventor: 2,
  elemental: 0, psiquico: 1, abencoador: 2
};

// Linha evolutiva de uma casta: as subclasses da casta em ordem de desbloqueio.
// A primeira está livre desde o início; cada seguinte exige a vitória na anterior.
export function castaLine(castaId) {
  return SUB_ORDER.filter(id => SUBCLASSES[id].casta === castaId);
}