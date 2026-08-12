const TILE = 32;
const RUN = 1.55;

const T = { PHYS: 'phys', HOLY: 'holy', MAGIC: 'magic' };

const TYPE_MULT = { WEAK: 1.6, RESIST: 0.45 };

const CASTAS = {
  clero:   { name: 'Clero',   color: '#f5e6b8', accent: '#c9a227', desc: 'Servos da luz. Curam aliados e golpeiam com poder sagrado.' },
  populum: { name: 'Populum', color: '#d8c9a3', accent: '#b5651d', desc: 'Guerreiros comuns. Dependem de armas, coragem e engenho.' },
  mago:    { name: 'Mago',    color: '#b8b8f5', accent: '#7a6bd8', desc: 'Eruditos do arcano. Desencadeiam magia pura e devastadora.' }
};

const SUBCLASSES = {
  padre: {
    id: 'padre', casta: 'clero', name: 'Padre', color: '#f2e2a8', accent: '#c9a227',
    desc: 'Sacerdote: confessa, cura e enfrenta o maligno com orações de libertação.',
    hp: 120, speed: 240, str: 8, int: 18, jump: 780,
    ordained: true, exorcistLevel: 1,
    weapon: { name: 'Cajado do Pastor', base: 12, color: '#8a5a2b', kind: 'aura' },
    attack: { kind: 'aura', dmg: 1.15, type: T.HOLY, radius: 150, cd: 0.7, color: '#fff3b0' },
    aura: { radius: 95, dmg: 0.4, tick: 0.6 },
    skills: [
      { id: 'confession', name: 'Confissão', key: 'Q', cd: 9, color: '#ffe66d',
        desc: 'Permite ouvir confissões e cura 35% da vida própria. Reforça a alma (+dano temporário).',
        heal: 0.35, dmgBuff: 0.25, dmgDur: 10 },
      { id: 'uncao', name: 'Unção dos Enfermos', key: 'E', cd: 22, color: '#ffd27f',
        desc: 'Cura massiva (70%) se a vida estiver baixa; caso contrário, cura 35%. Purga veneno.',
        healLow: 0.70, healHigh: 0.35, lowThreshold: 0.30, purge: true }
    ]
  },
  bispo: {
    id: 'bispo', casta: 'clero', name: 'Bispo', color: '#e8b0b0', accent: '#a23b3b',
    desc: 'Plenitude do sacerdócio: exorcismo solene, autoridade e milagres.',
    hp: 165, speed: 205, str: 12, int: 16, jump: 760,
    ordained: true, exorcistLevel: 2,
    weapon: { name: 'Báculo Episcopal', base: 17, color: '#7a3b3b', kind: 'aura' },
    attack: { kind: 'aura', dmg: 1.5, type: T.HOLY, radius: 205, cd: 0.9, color: '#ffe9b0' },
    aura: { radius: 145, dmg: 0.55, tick: 0.6 },
    skills: [
      { id: 'shield', name: 'Escudo Divino', key: 'Q', cd: 12, color: '#ffd27f', desc: 'Absorve 90 de dano por 7s.', shield: 90, dur: 7 },
      { id: 'grande_exorcismo', name: 'Grande Exorcismo', key: 'E', cd: 30, color: '#fff3b0',
        desc: 'Purga todos os inimigos visíveis com luz sagrada. Após usar, fica exausto por 20s (lento e enfraquecido).',
        dmg: 9999, type: T.HOLY, fatigue: 20 }
    ]
  },
  diacono: {
    id: 'diacono', casta: 'clero', name: 'Diácono', color: '#c8e8e0', accent: '#2f8a8a',
    desc: 'Servo: batiza, proclama, abençoa. Utilidade e caridade — não exorciza nem confessa.',
    hp: 105, speed: 275, str: 9, int: 18, jump: 800,
    ordained: false, exorcistLevel: 0,
    weapon: { name: 'Cajado da Devoção', base: 12, color: '#2f8a8a', kind: 'ranged' },
    attack: { kind: 'ranged', dmg: 1.0, type: T.HOLY, speed: 620, cd: 0.32, color: '#d8fff0', size: 8, pierce: true },
    skills: [
      { id: 'batismo', name: 'Batismo', key: 'Q', cd: 7, color: '#bfe8ff',
        desc: 'Acolhe um fiel próximo: cura o jogador e cria uma onda de luz que empurra e fere os inimigos ao redor.',
        heal: 0.20, dmg: 1.0, type: T.HOLY, radius: 110 },
      { id: 'caridade', name: 'Bênção da Caridade', key: 'E', cd: 14, color: '#ffe66d',
        desc: 'Bênção generosa: +45% de dano e +20% de velocidade por 10s.',
        dmg: 0.45, spd: 0.20, dur: 10 }
    ]
  },
  guerreiro: {
    id: 'guerreiro', casta: 'populum', name: 'Guerreiro', color: '#f0b8a8', accent: '#c0392b',
    desc: 'Combo de espada, giro e investida.',
    hp: 155, speed: 255, str: 18, int: 6, jump: 750,
    weapon: { name: 'Espada do Povo', base: 16, color: '#c0392b', kind: 'melee' },
    attack: { kind: 'melee', dmg: 1.2, type: T.PHYS, range: 82, cd: 0.32, combo: 3, color: '#ffd6a5' },
    skills: [
      { id: 'spin', name: 'Giro', key: 'Q', cd: 5, color: '#ff9d5c', desc: 'Golpe circular ao redor.', dmg: 1.5, type: T.PHYS, radius: 95 },
      { id: 'dash', name: 'Investida', key: 'E', cd: 7, color: '#ff6b6b', desc: 'Avança rapidamente causando dano no caminho.', dmg: 1.7, type: T.PHYS, dist: 300 }
    ]
  },
  arqueiro: {
    id: 'arqueiro', casta: 'populum', name: 'Arqueiro', color: '#b8e0b0', accent: '#3f7a2e',
    desc: 'Flechas rápidas e chuva de projéteis.',
    hp: 100, speed: 265, str: 13, int: 9, jump: 820,
    weapon: { name: 'Arco de Madeira', base: 13, color: '#7a5a2b', kind: 'ranged' },
    attack: { kind: 'ranged', dmg: 1.0, type: T.PHYS, speed: 660, cd: 0.42, color: '#f0e6c8', size: 8 },
    skills: [
      { id: 'spread', name: 'Rajada', key: 'Q', cd: 3.5, color: '#7ec8e3', desc: '3 flechas em leque.', dmg: 0.85, type: T.PHYS, speed: 660, n: 3, spread: 0.32 },
      { id: 'rain', name: 'Chuva de Flechas', key: 'E', cd: 10, color: '#9be7ff', desc: 'Flechas caem na área do cursor.', dmg: 1.15, type: T.PHYS, n: 8, radius: 80, delay: 0.8 }
    ]
  },
  inventor: {
    id: 'inventor', casta: 'populum', name: 'Inventor', color: '#f0d0a8', accent: '#d35400',
    desc: 'Granadas explosivas e sobrecarga.',
    hp: 125, speed: 245, str: 15, int: 10, jump: 770,
    weapon: { name: 'Chave de Grifo', base: 14, color: '#d35400', kind: 'melee' },
    attack: { kind: 'melee', dmg: 1.1, type: T.PHYS, range: 70, cd: 0.36, combo: 2, color: '#ffc2a0' },
    skills: [
      { id: 'grenade', name: 'Granada', key: 'Q', cd: 5, color: '#ffb020', desc: 'Granada que explode em área e destrói árvores e rochas.', dmg: 1.9, type: T.MAGIC, radius: 95, throw: 1 },
      { id: 'overclock', name: 'Sobrecarga', key: 'E', cd: 15, color: '#7cffb0', desc: 'Overclock: muito dano e velocidade por 6s.', dmg: 0.6, spd: 0.35, dur: 6 }
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
  }
};

const SUB_ORDER = ['padre', 'bispo', 'diacono', 'guerreiro', 'arqueiro', 'inventor', 'elemental', 'psiquico', 'abencoador'];
const CASTA_ORDER = ['clero', 'populum', 'mago'];

const MAX_EXTRA_SKILLS = 3;

const EXTRA_SKILLS = [
  { id: 'reza_maior', name: 'Reza Maior', key: 'R', cd: 9, color: '#fff3b0', cost: 150,
    desc: 'Aura sagrada que explode ao redor.', dmg: 1.3, type: T.HOLY, radius: 140 },
  { id: 'estrela', name: 'Estrela Cadente', key: 'R', cd: 8, color: '#ffd6ff', cost: 150,
    desc: 'Projectil perfurante que procura o alvo.', dmg: 1.25, type: T.MAGIC, speed: 520, size: 10, pierce: true, homing: true },
  { id: 'vendaval', name: 'Vendaval', key: 'R', cd: 10, color: '#bfe8ff', cost: 170,
    desc: 'Rajada de vento que empurra tudo no caminho.', dmg: 0.8, type: T.MAGIC, radius: 160, knock: 700 },
  { id: 'sobreavida', name: 'Sobre-vida', key: 'R', cd: 14, color: '#7cff8a', cost: 220,
    desc: 'Cura grande e purga efeitos.', heal: 0.5 },
  { id: 'passo_luz', name: 'Passo da Luz', key: 'R', cd: 8, color: '#ffe9a0', cost: 180,
    desc: 'Teleporta na direção do cursor.', dist: 220 },
];

// Armas modernas — obtidas apenas pelo comando /get (F3)
const MODERN_WEAPONS = {
  thompson: {
    id: 'thompson', name: 'Thompson', kind: 'auto',
    cd: 0.075, dmg: 0.55, type: T.PHYS, color: '#ffd23f',
    size: 7, speed: 850, pierce: false, n: 1, spread: 0.07, jitter: 10, combo: 1,
    desc: 'Submetralhadora moderna de altíssima cadência.'
  },
  pistola: {
    id: 'pistola', name: 'Pistola', kind: 'auto',
    cd: 0.3, dmg: 1.8, type: T.PHYS, color: '#b0c4ff',
    size: 8, speed: 950, pierce: true, n: 1, spread: 0, jitter: 0, combo: 1,
    desc: 'Pistola precisa, com balas perfurantes.'
  },
  minigun: {
    id: 'minigun', name: 'Minigun', kind: 'auto',
    cd: 0.032, dmg: 0.42, type: T.PHYS, color: '#ff9d5c',
    size: 6, speed: 920, pierce: false, n: 1, spread: 0.17, jitter: 16, combo: 1,
    desc: 'Cadência absurdamente alta, um cabo de chumbo.'
  },
  sniper: {
    id: 'sniper', name: 'Sniper', kind: 'auto',
    cd: 1.5, dmg: 99999, type: T.PHYS, color: '#ff3333',
    size: 10, speed: 1200, pierce: true, n: 1, spread: 0, jitter: 0, combo: 1,
    desc: 'Instakill, atravessa inimigos, mas cadência muito lenta.'
  },
  destruidora: {
    id: 'destruidora', name: 'Destruidora', kind: 'auto',
    cd: 0.04, dmg: 2.5, type: T.PHYS, color: '#ff6600',
    size: 8, speed: 1000, pierce: true, n: 1, spread: 0.05, jitter: 5, combo: 1,
    desc: 'Rápida como Thompson, forte e atravessa como Sniper.'
  }
};

// Itens modernos consumíveis — obtidos apenas pelo comando /get
const MODERN_ITEMS = {
  granada: { id: 'granada', name: 'Granada', key: 'G', color: '#5caeff',
    desc: 'Fab G: explode, destruindo árvores e feras na área.' },
  exorcismo: { id: 'exorcismo', name: 'Exorcismo', key: 'U', color: '#fff3b0',
    desc: 'Purga divina: mata todos os monstros visíveis.' }
};

const MONSTERS = {
  slime: { id: 'slime', name: 'Slime', color: '#6abf4b', dark: '#3f7a2e', size: 30,
    hp: 30, dmg: 8, speed: 95, behavior: 'hop', gold: [3, 6],
    resist: [T.PHYS], weak: [T.MAGIC], aggro: 340, tier: 1 },
  bat: { id: 'bat', name: 'Morcego', color: '#7a6ba8', dark: '#4b3f6b', size: 26,
    hp: 22, dmg: 7, speed: 185, behavior: 'swoop', fly: true, gold: [4, 8],
    resist: [T.MAGIC], weak: [T.PHYS], aggro: 420, tier: 1 },
  wolf: { id: 'wolf', name: 'Lobo', color: '#9a9aa0', dark: '#5f5f6a', size: 40,
    hp: 70, dmg: 13, speed: 230, behavior: 'swoop', gold: [8, 14],
    resist: [T.MAGIC], weak: [T.PHYS], aggro: 460, tier: 2 },
  archer: { id: 'archer', name: 'Arqueiro Goblin', color: '#7fbf4b', dark: '#4b7a2e', size: 32,
    hp: 55, dmg: 12, speed: 145, behavior: 'range', gold: [10, 18],
    resist: [T.HOLY], weak: [T.PHYS], aggro: 500, shots: 1, tier: 2 },
  bomber: { id: 'bomber', name: 'Bomba-viva', color: '#d966ff', dark: '#7a2e8a', size: 30,
    hp: 26, dmg: 22, speed: 150, behavior: 'chase', gold: [6, 10],
    resist: [T.MAGIC], weak: [T.PHYS], aggro: 300, explodeOnDeath: true, tier: 2 },
  spider: { id: 'spider', name: 'Aranha', color: '#9a4b8a', dark: '#5f2a55', size: 34,
    hp: 45, dmg: 9, speed: 175, behavior: 'chase', gold: [7, 12],
    resist: [T.PHYS], weak: [T.MAGIC], aggro: 400, venom: true, tier: 2 },
  wraith: { id: 'wraith', name: 'Espectro', color: '#9ad0e0', dark: '#5a8a9a', size: 34,
    hp: 65, dmg: 15, speed: 120, behavior: 'wraith', fly: true, gold: [14, 22],
    resist: [T.PHYS], weak: [T.HOLY], aggro: 420, invokes: true, tier: 3 },
  goblin: { id: 'goblin', name: 'Goblin', color: '#8fbf4b', dark: '#5a7a2e', size: 34,
    hp: 60, dmg: 14, speed: 150, behavior: 'chase', gold: [8, 15],
    resist: [T.HOLY], weak: [T.PHYS], aggro: 380, tier: 2 },
  skeleton: { id: 'skeleton', name: 'Esqueleto', color: '#d9d0c0', dark: '#9a8f7a', size: 38,
    hp: 85, dmg: 16, speed: 105, behavior: 'chase', jump: 380, gold: [12, 20],
    resist: [T.PHYS], weak: [T.HOLY], aggro: 360, tier: 3 },
  golem: { id: 'golem', name: 'Golem', color: '#9a9a9a', dark: '#5f5f5f', size: 52,
    hp: 240, dmg: 26, speed: 55, behavior: 'slowChase', gold: [25, 40],
    resist: [T.PHYS], weak: [T.MAGIC], aggro: 330, tier: 3 },
  shaman: { id: 'shaman', name: 'Xamã', color: '#b58a4b', dark: '#7a5a2b', size: 34,
    hp: 70, dmg: 18, speed: 115, behavior: 'range', gold: [18, 30],
    resist: [T.MAGIC], weak: [T.HOLY], aggro: 420, shots: 2, tier: 3 },
  // --- Novos monstros (biomas) ---
  rato: { id: 'rato', name: 'Rato', color: '#a0908a', dark: '#5f5248', size: 22,
    hp: 18, dmg: 6, speed: 210, behavior: 'hop', gold: [2, 5],
    resist: [], weak: [], aggro: 320, tier: 1 },
  espantalho: { id: 'espantalho', name: 'Espantalho', color: '#c9a050', dark: '#8a6a2b', size: 44,
    hp: 110, dmg: 16, speed: 115, behavior: 'chase', gold: [12, 20],
    resist: [T.PHYS], weak: [T.HOLY], aggro: 360, tier: 2 },
  javali: { id: 'javali', name: 'Javali', color: '#b5826a', dark: '#7a4b35', size: 44,
    hp: 130, dmg: 22, speed: 200, behavior: 'swoop', gold: [16, 26],
    resist: [T.PHYS], weak: [T.MAGIC], aggro: 440, tier: 2 },
  aguia: { id: 'aguia', name: 'Águia', color: '#c8b39a', dark: '#7a6a4b', size: 30,
    hp: 60, dmg: 12, speed: 240, behavior: 'swoop', fly: true, gold: [12, 20],
    resist: [T.MAGIC], weak: [T.PHYS], aggro: 480, tier: 2 },
  crocodilo: { id: 'crocodilo', name: 'Crocodilo', color: '#4b8a4b', dark: '#2f5f2f', size: 56,
    hp: 240, dmg: 32, speed: 95, behavior: 'slowChase', gold: [30, 48],
    resist: [T.PHYS], weak: [T.MAGIC], aggro: 360, tier: 3 },
  lodo_corrupto: { id: 'lodo_corrupto', name: 'Lodo Corrupto', color: '#6a5a3a', dark: '#4b3f2b', size: 32,
    hp: 60, dmg: 16, speed: 115, behavior: 'hop', gold: [16, 28],
    resist: [T.MAGIC], weak: [T.HOLY], aggro: 320, venom: true, tier: 3 },
  fogo_fatuo: { id: 'fogo_fatuo', name: 'Fogo-fátuo', color: '#bfe0a0', dark: '#7a9a4b', size: 30,
    hp: 80, dmg: 14, speed: 145, behavior: 'wraith', fly: true, gold: [24, 40],
    resist: [T.PHYS], weak: [T.HOLY], aggro: 440, invokes: true, tier: 3 },
  zumbi: { id: 'zumbi', name: 'Zumbi', color: '#8a9a7a', dark: '#5a6a4b', size: 42,
    hp: 145, dmg: 18, speed: 88, behavior: 'slowChase', gold: [20, 34],
    resist: [T.PHYS], weak: [T.HOLY], aggro: 340, tier: 3 },
  corvo: { id: 'corvo', name: 'Corvo', color: '#3a3a4a', dark: '#232330', size: 26,
    hp: 40, dmg: 10, speed: 210, behavior: 'swoop', fly: true, gold: [8, 14],
    resist: [T.MAGIC], weak: [T.PHYS], aggro: 460, tier: 2 },
  necromante: { id: 'necromante', name: 'Necromante', color: '#7a5a6a', dark: '#4b3043', size: 36,
    hp: 110, dmg: 20, speed: 130, behavior: 'range', gold: [34, 56],
    resist: [T.HOLY], weak: [T.PHYS], aggro: 460, shots: 2, tier: 4 },
  gargula: { id: 'gargula', name: 'Gárgula', color: '#6a6f7a', dark: '#3f434b', size: 46,
    hp: 190, dmg: 22, speed: 115, behavior: 'swoop', fly: true, gold: [40, 66],
    resist: [T.MAGIC], weak: [T.HOLY], aggro: 460, tier: 4 },
  morteiro: { id: 'morteiro', name: 'Guerreiro-Morto', color: '#9a7a8a', dark: '#5f4850', size: 50,
    hp: 260, dmg: 26, speed: 120, behavior: 'chase', gold: [48, 78],
    resist: [T.PHYS], weak: [T.HOLY], aggro: 420, tier: 4 },
  mumia: { id: 'mumia', name: 'Múmia', color: '#c8c0a8', dark: '#8a7a4b', size: 44,
    hp: 200, dmg: 20, speed: 82, behavior: 'slowChase', gold: [34, 56],
    resist: [T.MAGIC], weak: [T.HOLY], aggro: 340, tier: 4 },
  minotauro: { id: 'minotauro', name: 'Minotauro', color: '#b58a4b', dark: '#7a5a2b', size: 62,
    hp: 340, dmg: 30, speed: 105, behavior: 'slowChase', gold: [60, 100],
    resist: [T.PHYS], weak: [T.MAGIC], aggro: 400, tier: 4 },
  demoninho: { id: 'demoninho', name: 'Demoninho', color: '#c05050', dark: '#7a2f2f', size: 34,
    hp: 150, dmg: 20, speed: 190, behavior: 'chase', gold: [34, 58],
    resist: [T.PHYS], weak: [T.HOLY], aggro: 420, tier: 5 },
  soldado_leal: { id: 'soldado_leal', name: 'Soldado Leal', color: '#a8a09a', dark: '#5f5a55', size: 44,
    hp: 200, dmg: 24, speed: 160, behavior: 'chase', gold: [46, 74],
    resist: [T.PHYS], weak: [T.MAGIC], aggro: 440, tier: 5 },
  guarda_arquebus: { id: 'guarda_arquebus', name: 'Arquebuseiro', color: '#9ab0c0', dark: '#5f6a75', size: 36,
    hp: 130, dmg: 22, speed: 130, behavior: 'range', gold: [42, 68],
    resist: [T.PHYS], weak: [T.MAGIC], aggro: 480, shots: 2, tier: 5 },
  espectro_arcano: { id: 'espectro_arcano', name: 'Espectro Arcano', color: '#b8a8e0', dark: '#6a5a8a', size: 38,
    hp: 150, dmg: 22, speed: 135, behavior: 'wraith', fly: true, gold: [48, 80],
    resist: [T.MAGIC], weak: [T.PHYS], aggro: 460, invokes: true, tier: 5 },
  homunculo: { id: 'homunculo', name: 'Homúnculo', color: '#d8a0b0', dark: '#8a5060', size: 32,
    hp: 120, dmg: 18, speed: 180, behavior: 'chase', gold: [30, 50],
    resist: [T.MAGIC], weak: [T.PHYS], aggro: 420, tier: 5 },
  // --- Raros / especiais (recompensas pesadas) ---
  lobisomem: { id: 'lobisomem', name: 'Lobisomem', color: '#8a6a4b', dark: '#4b352a', size: 56,
    hp: 500, dmg: 40, speed: 235, behavior: 'swoop', gold: [320, 460],
    resist: [T.PHYS], weak: [T.HOLY], aggro: 520, rare: true, tier: 4 },
  gigante_pedra: { id: 'gigante_pedra', name: 'Gigante de Pedra', color: '#9a9aa0', dark: '#5f5f66', size: 84,
    hp: 900, dmg: 50, speed: 70, behavior: 'slowChase', gold: [520, 720],
    resist: [T.PHYS], weak: [T.MAGIC], aggro: 380, rare: true, tier: 4 },
  sacerdote_necro: { id: 'sacerdote_necro', name: 'Sacerdote da Noite', color: '#7a6a9a', dark: '#4b3f5f', size: 40,
    hp: 700, dmg: 38, speed: 130, behavior: 'range', gold: [480, 660], shots: 3,
    resist: [T.PHYS], weak: [T.HOLY], aggro: 500, rare: true, tier: 4 },
  dragao_bebe: { id: 'dragao_bebe', name: 'Dragãozinho', color: '#d8a05c', dark: '#8a5a2f', size: 52,
    hp: 420, dmg: 34, speed: 205, behavior: 'swoop', fly: true, gold: [400, 560],
    resist: [T.MAGIC], weak: [T.PHYS], aggro: 500, rare: true, tier: 4 },
  // --- Chefes (progressão) ---
  krol_chefe: {
    id: 'krol_chefe', name: 'Krol, Chefe Tribal', color: '#a14b3c', dark: '#5f2218', size: 46,
    hp: 420, dmg: 24, speed: 185, behavior: 'boss', gold: [120, 160],
    resist: [T.HOLY], weak: [T.PHYS], aggro: 520, boss: true, crystal: 'floresta', tier: 3
  },
  gere_osso: {
    id: 'gere_osso', name: 'Gere Osso, Rei da Noite', color: '#d9d0c0', dark: '#8a7a5a', size: 52,
    hp: 700, dmg: 28, speed: 105, behavior: 'boss', gold: [180, 240],
    resist: [T.PHYS], weak: [T.HOLY], aggro: 520, boss: true, crystal: 'sombrio', tier: 4
  },
  titan: {
    id: 'titan', name: 'Titã do Execra', color: '#8a6a4b', dark: '#4b352a', size: 76,
    hp: 1600, dmg: 40, speed: 95, behavior: 'boss', gold: [500, 500],
    resist: [T.PHYS], weak: [T.MAGIC], aggro: 560, boss: true, crystal: 'final', tier: 4
  },
  // --- Chefes finais por casta ---
  demonio: {
    id: 'demonio', name: 'Mastema, o Demônio', color: '#c0504a', dark: '#5f1f1f', size: 88,
    hp: 2800, dmg: 60, speed: 122, behavior: 'boss', gold: [1500, 1500],
    resist: [T.PHYS], weak: [T.HOLY], aggro: 720, boss: true, finalBoss: true, casta: 'clero', tier: 5
  },
  general: {
    id: 'general', name: 'General Tarraske', color: '#a0a8a0', dark: '#4b524b', size: 82,
    hp: 2600, dmg: 55, speed: 142, behavior: 'boss', gold: [1500, 1500],
    resist: [T.MAGIC], weak: [T.PHYS, T.HOLY], aggro: 720, boss: true, finalBoss: true, casta: 'populum', tier: 5
  },
  arcano: {
    id: 'arcano', name: 'O Arcano Devorador', color: '#a08ad8', dark: '#4b3f7a', size: 86,
    hp: 3000, dmg: 60, speed: 118, behavior: 'boss', gold: [1500, 1500],
    resist: [T.MAGIC], weak: [T.PHYS, T.HOLY], aggro: 720, boss: true, finalBoss: true, casta: 'mago', tier: 5
  }
};

// Finais por casta (introdução, título e mensagens)
const FINAL_ENDINGS = {
  demonio: {
    casta: 'clero', poster: 'Padre',
    title: 'A PROMESSA CUMPRIDA',
    msg: 'Você guiou as almas do Senhor a Ele.',
    intro: [
      'As trevas se erguem de um altar profano no coração da terra.',
      'Mastema, o Demônio, devora as almas que não descansam.',
      'Derrotai-o e guiai os fiéis de Eclésia à luz do Senhor.'
    ]
  },
  general: {
    casta: 'populum', poster: 'Guerreiro',
    title: 'A FRONTEIRA SEGURA',
    msg: 'O General caiu. A fronteira do povo está segura.',
    intro: [
      'O General Tarraske sitiou as aldeias e escravizou a fronteira.',
      'Suas guarnições cercam o forte ao sul-leste.',
      'Derrotai o General e libertai o povo de Eclésia.'
    ]
  },
  arcano: {
    casta: 'mago', poster: 'Mago',
    title: 'O VÉU REFEITO',
    msg: 'O véu tornou a se fechar. O saber prevalece.',
    intro: [
      'O arcano uiva nas ruínas da Torre Perdida.',
      'O Arcano Devorador corrói o que restou do saber.',
      'Silenciai-o e o véu entre os mundos se refará.'
    ]
  }
};

// Cristais que destravam progressão
const CRYSTALS = {
  floresta: { name: 'Cristal da Floresta', color: '#5cff9a', hint: 'Krol, Chefe Tribal', gate: 'caverna' },
  sombrio: { name: 'Cristal Sombrio', color: '#9a6bff', hint: 'Gere Osso, Rei da Noite', gate: 'gruta' },
  final: { name: 'Coroa do Execra', color: '#ffd23f', hint: 'Titã do Execra', gate: 'arcano' }
};

// --- Mundo: dados da geração procedural ---
const WORLD_W = 400;   // largura em tiles
const WORLD_H = 240;   // altura em tiles
const CHUNK = 16;      // tiles por lado de chunk
const WORLD_SEED = 20240811;

// Regiões: rects em tiles. decor controla o estilo visual, danger a dificuldade.
// priority resolve sobreposição de retângulos (vila dentro do prado, etc.)
const REGIONS = [
  { id: 'vila', name: 'Vila de Pedra', x: 104, y: 108, w: 30, h: 36, decor: 'town', danger: 0, density: 0, priority: 9,
    monsters: [], rares: [] },
  { id: 'prado', name: 'Prado Sereno', x: 84, y: 90, w: 70, h: 76, decor: 'grass', danger: 1, density: 2, priority: 1,
    monsters: [['slime', 4], ['rato', 2], ['bat', 2], ['wolf', 1]], rares: [] },
  { id: 'campos', name: 'Campos de Trigo', x: 30, y: 100, w: 42, h: 56, decor: 'fields', danger: 1, density: 2, priority: 2,
    monsters: [['rato', 3], ['espantalho', 3], ['slime', 1]], rares: [] },
  { id: 'floresta', name: 'Floresta dos Goblins', x: 60, y: 44, w: 44, h: 40, decor: 'forest', danger: 2, density: 3, priority: 2,
    monsters: [['goblin', 3], ['archer', 1], ['bat', 2], ['wolf', 2], ['bomber', 1]], rares: ['lobisomem'],
    boss: { kind: 'krol_chefe', x: 78, y: 62 } },
  { id: 'lobos', name: 'Bosque dos Lobos', x: 120, y: 30, w: 36, h: 27, decor: 'forest', danger: 2, density: 2, priority: 2,
    monsters: [['wolf', 3], ['javali', 2], ['bat', 1]], rares: [] },
  { id: 'norte', name: 'Campo do Norte', x: 156, y: 24, w: 70, h: 26, decor: 'grass', danger: 1, density: 1, priority: 1,
    monsters: [['wolf', 2], ['rato', 2], ['slime', 1]], rares: [] },
  { id: 'sagrado', name: 'Bosque Sagrado', x: 150, y: 58, w: 44, h: 40, decor: 'forest', danger: 2, density: 2, priority: 3,
    monsters: [['corvo', 3], ['javali', 2], ['wolf', 1]], rares: [] },
  { id: 'pantano', name: 'Pântano Sombrio', x: 210, y: 56, w: 42, h: 44, decor: 'swamp', danger: 3, density: 3, priority: 2,
    monsters: [['lodo_corrupto', 3], ['fogo_fatuo', 2], ['crocodilo', 2], ['rato', 1]], rares: [] },
  { id: 'ruinas', name: 'Ruínas de Aurelia', x: 160, y: 128, w: 40, h: 42, decor: 'ruins', danger: 3, density: 3, priority: 2,
    monsters: [['gargula', 2], ['mumia', 2], ['esqueleto', 2], ['morteiro', 1]], rares: [] },
  { id: 'cemiterio', name: 'Cemitério dos Esquecidos', x: 28, y: 170, w: 34, h: 44, decor: 'cemetery', danger: 3, density: 3, priority: 2,
    monsters: [['zumbi', 3], ['corvo', 2], ['esqueleto', 2], ['necromante', 1]], rares: ['sacerdote_necro'],
    boss: null },
  { id: 'colinas', name: 'Colinas Rochosas', x: 240, y: 156, w: 36, h: 60, decor: 'rocky', danger: 3, density: 3, priority: 2,
    monsters: [['golem', 2], ['minotauro', 2], ['aguia', 2], ['spider', 1]], rares: ['gigante_pedra'] },
  { id: 'templo', name: 'Templo Ruinoso', x: 270, y: 60, w: 40, h: 44, decor: 'ruins', danger: 4, density: 3, priority: 2,
    monsters: [['gargula', 3], ['morteiro', 2], ['esqueleto', 2], ['mumia', 2]], rares: ['dragao_bebe'] },
  { id: 'varzea', name: 'Várzea Sul', x: 150, y: 190, w: 40, h: 40, decor: 'grass', danger: 1, density: 1, priority: 1,
    monsters: [['rato', 3], ['slime', 2], ['wolf', 1]], rares: [] },
  { id: 'catacumbas', name: 'Catacumbas', x: 64, y: 22, w: 18, h: 22, decor: 'cave', danger: 3, density: 3, priority: 2, indoor: true,
    monsters: [['skeleton', 3], ['spider', 2], ['wraith', 1], ['slime', 1]], rares: [],
    boss: { kind: 'gere_osso', x: 72, y: 34 } },
  { id: 'gruta', name: 'Gruta do Execra', x: 86, y: 22, w: 14, h: 22, decor: 'cave', danger: 4, density: 3, priority: 2, indoor: true,
    monsters: [['golem', 2], ['shaman', 2], ['wraith', 1], ['bomber', 1]], rares: [],
    boss: { kind: 'titan', x: 93, y: 32 } },
  { id: 'cova', name: 'Cova do Demônio', x: 322, y: 40, w: 38, h: 44, decor: 'hell', danger: 5, density: 3, priority: 3, indoor: true,
    monsters: [['demoninho', 3], ['wraith', 2], ['gargula', 1]], rares: [],
    boss: { kind: 'demonio', x: 340, y: 58 } },
  { id: 'forte', name: 'Forte do General', x: 322, y: 176, w: 38, h: 52, decor: 'fort', danger: 5, density: 3, priority: 3,
    monsters: [['soldado_leal', 3], ['guarda_arquebus', 2], ['demoninho', 1]], rares: [],
    boss: { kind: 'general', x: 340, y: 202 } },
  { id: 'torre', name: 'Torre Perdida', x: 12, y: 40, w: 30, h: 38, decor: 'arcane', danger: 5, density: 3, priority: 3, indoor: true,
    monsters: [['espectro_arcano', 3], ['homunculo', 2], ['mumia', 1]], rares: [],
    boss: { kind: 'arcano', x: 27, y: 58 } }
];

// Selos: barreira de progressão (interagem com F). need = cristal requisitado.
const SEALS = [
  { id: 'selo_catacumbas', name: 'Selo das Catacumbas', need: 'floresta', x: 61, y: 33, color: '#b05cff', accent: '#e0c0ff',
    msg: 'Um selo antigo bloqueia o caminho. Derrote o Chefe Tribal na floresta.' },
  { id: 'selo_gruta', name: 'Selo do Execra', need: 'sombrio', x: 85, y: 33, color: '#9a6bff', accent: '#d0b0ff',
    msg: 'Um selo de sombras bloqueia a gruta. O Rei da Noite guarda a chave.' },
  { id: 'selo_profano', name: 'Selo Profano', need: 'sombrio', x: 319, y: 58, color: '#ff6b6b', accent: '#ffb0b0',
    msg: 'As chamas do Demônio guardam este portal. O Cristal Sombrio é a chave.' },
  { id: 'selo_forte', name: 'Portão do Forte', need: 'floresta', x: 319, y: 202, color: '#b5651d', accent: '#ffd27f',
    msg: 'O Portão do Forte está trancado. O Cristal da Floresta é a chave.' },
  { id: 'selo_arcano', name: 'Véu Arcano', need: 'final', x: 44, y: 58, color: '#7a6bd8', accent: '#c0b4ff',
    msg: 'O véu resiste ao toque. Somente a Coroa do Execra o desfaz.' }
];

// NPCs espalhados pelo mundo. kind controla o tipo de interação.
const NPC_DEFS = [
  // Vila de Pedra — estabelecimentos
  { id: 'ferreiro', name: 'Ferreiro', kind: 'forge', x: 111, y: 121, color: '#b5651d', accent: '#ffb020' },
  { id: 'vendedor', name: 'Vendedor', kind: 'shop', x: 120, y: 121, color: '#2980b9', accent: '#7ec8e3' },
  { id: 'mestre', name: 'Mestre das Artes', kind: 'skills', x: 128, y: 121, color: '#8e44ad', accent: '#d8a1ff' },
  { id: 'guia', name: 'Cronista', kind: 'guide', x: 116, y: 124, color: '#27ae60', accent: '#a8e6a1',
    text: 'Olá, viajante! Eclésia é vasta e perigosa. Derrote o Chefe Tribal na floresta (Cristal da Floresta), o Rei da Noite nas Catacumbas (Cristal Sombrio) e o Titã na Gruta do Execra (Coroa). Cada casta tem um desafio final próprio, no canto mais distante do mapa. Monstros têm fraquezas: amarelo = fraqueza, cinza = resistência. Boa sorte!' },
  { id: 'paroco', name: 'Pároco Ambrósio', kind: 'church', x: 110, y: 113, color: '#c9a227', accent: '#fff3b0' },
  { id: 'taberneiro', name: 'Taberneiro', kind: 'tavern', x: 127, y: 113, color: '#a8823f', accent: '#ffb020' },
  { id: 'erudito', name: 'Erudito Tior', kind: 'tower', x: 120, y: 136, color: '#7a6bd8', accent: '#c0b4ff' },
  // Vila — interações por casta
  { id: 'santa_ana', name: 'Ana, a Lavadeira', kind: 'talk', x: 107, y: 132, color: '#b8a080', accent: '#d8c0a0',
    event: 'confess', lines: {
      clero: 'Padre, eu... roubei pão para os meus filhos. A fome me cegou.',
      populum: 'A vida na vila é dura, viajante. Nem sempre temos o que comer.',
      mago: 'Sussurram que magos andam sumidos pelas ruínas. Tome cuidado.'
    } },
  { id: 'guarda_bira', name: 'Guarda Bira', kind: 'talk', x: 125, y: 132, color: '#8a9a8a', accent: '#c8d8c8',
    event: 'war', lines: {
      clero: 'A reza não afasta o lobo, mas talvez acalme o medo. Boa noite, padre.',
      populum: 'Um bom soldado se mede pelo aço. Prove seu valor em campo e terá meu respeito.',
      mago: 'Feiticeiros... sustento que valem tanto quanto mãos firmes. Humpf.'
    } },
  { id: 'coroinha', name: 'Coroinha Benjamim', kind: 'talk', x: 113, y: 117, color: '#e8d8b0', accent: '#ffd76a',
    event: 'lore', lines: {
      clero: 'O Pároco diz que o Senhor fala pelos ventos do leste. Ouviu? Eu ouvi.',
      populum: 'Corro até o poço e volto. A vila inteira me conhece!',
      mago: 'O homem do livro lê palavras que brilham. Juro que brilham!'
    } },
  // Campos de Trigo
  { id: 'fazendeiro', name: 'Tomás, Fazendeiro', kind: 'talk', x: 40, y: 122, color: '#c9b37a', accent: '#f0d8a0',
    event: 'lore', lines: {
      clero: 'A terra é gentil, mas os espantalhos andam. Sim, padre... ANDAM.',
      populum: 'De noite os espantalhos se mexem. Se for da vila, cuide dos campos.',
      mago: 'Trigo bom é trigo que canta. E o meu canta assustado.'
    } },
  { id: 'roceira', name: 'Dona Zilda', kind: 'talk', x: 35, y: 132, color: '#c8a8a0', accent: '#e0c0b0',
    event: 'confess', lines: {
      clero: 'Padre, menti sobre a colheita para o imposto. É um peso que não sai de mim.',
      populum: 'As fogueiras de junho deviam alegrar. Hoje só a fazem tremer.',
      mago: 'Forasteiros passam com poções. Nada como suor de verdade.'
    } },
  // Bosque Sagrado
  { id: 'peregrino', name: 'Peregrino Inácio', kind: 'talk', x: 158, y: 76, color: '#b8b0a0', accent: '#e8e0c8',
    event: 'lore', lines: {
      clero: 'Peregrino que sou, vi um altar profano além dos rochedos. O Demônio ronca no leste.',
      populum: 'O caminho para leste é mau. As criaturas ficam maiores e mais cruéis.',
      mago: 'Por estas árvores, ouvi encantamentos antigos. O saber dorme onde a fé acorda.'
    } },
  { id: 'capela_sagrada', name: 'Capela do Bosque', kind: 'church', x: 186, y: 78, color: '#f0e0c0', accent: '#fff3b0' },
  // Pântano
  { id: 'pescador', name: 'Pescador Duro', kind: 'talk', x: 218, y: 84, color: '#8a8a9a', accent: '#b0c0d0',
    event: 'lore', lines: {
      clero: 'No pântano as luzinhas dançam. São almas perdidas pedindo reza.',
      populum: 'Não pise nas poças. O que mora dentro tem dentes.',
      mago: 'As luzes falsas são velhas mentiras arcanas. Nada novo no brejo.'
    } },
  // Cemitério
  { id: 'coveiro', name: 'Coveiro Nico', kind: 'talk', x: 42, y: 186, color: '#6a7a6a', accent: '#a8b8a8',
    event: 'confess', lines: {
      clero: 'Padre... enterrei vivo o velho Zé para ficar com a herdade. Perdoai-me.',
      populum: 'Cavei alvejar de guerra. Os lençóis cobrem muita coisa, meu amigo.',
      mago: 'Os mortos aqui... se mexem. E não é por causa da terra.'
    } },
  { id: 'velha_zefa', name: 'Velha Zefa', kind: 'talk', x: 52, y: 198, color: '#9a8a80', accent: '#c0b0a0',
    event: 'lore', lines: {
      clero: 'Ah, filho da luz... os zumbis foram gente que não ouviu o chamado. Conduze-os.',
      populum: 'Paguei para ver a lua cheia. Ver o que se arrasta aqui não foi favor.',
      mago: 'O Necromante queimou minhas ervas. Guarde as suas, moço.'
    } },
  // Ruínas
  { id: 'arqueologo', name: 'Dante, Arqueólogo', kind: 'talk', x: 172, y: 148, color: '#b0a080', accent: '#e0d0a0',
    event: 'saber', lines: {
      clero: 'Estas paredes tinham um altar. O que o profanou... ainda habita o chão.',
      populum: 'Há aço antigo sob os escombros. Permita-me mostrar-lhe o caminho?',
      mago: 'Glifos! Glifos preservados! O saber destas ruínas vale ouro e vida.'
    } },
  { id: 'ferreiro_ruinas', name: 'Ferreiro das Ruínas', kind: 'forge', x: 184, y: 158, color: '#8a6a4b', accent: '#ff9d5c' },
  // Colinas
  { id: 'mineiro', name: 'Mineiro Pedro', kind: 'talk', x: 252, y: 172, color: '#9a9a7a', accent: '#c8c890',
    event: 'lore', lines: {
      clero: 'Na serra mora um gigante que dorme. A fé não o acorda; o ouro, sim.',
      populum: 'O fedor de minério é o cheiro do trabalho. Aqui ninguém se ajoelha.',
      mago: 'A rocha aqui tem veios que a magia escuta. Ouço quando estou só.'
    } },
  // Templo
  { id: 'sabio', name: 'Sábio Laude', kind: 'talk', x: 284, y: 76, color: '#b8b8d8', accent: '#d8d8f0',
    event: 'saber', lines: {
      clero: 'O templo fora consagrado à luz. As gárgulas esqueceram o que guardavam.',
      populum: 'Lendas falam de um tesouro. Lendas também falam de dunas de criaturas.',
      mago: 'Aqui o véu é fino. Sinta a vibração arcana nas colunas quebradas.'
    } },
  // Forte
  { id: 'taberneira_fronteira', name: 'Taverneira da Fronteira', kind: 'tavern', x: 330, y: 190, color: '#c8a880', accent: '#e0b878' },
  { id: 'soldado_desertor', name: 'Desertor Valdomiro', kind: 'talk', x: 328, y: 198, color: '#7a8a7a', accent: '#a8c0a8',
    event: 'war', lines: {
      clero: 'O General vendeu a alma por ferro e pólvora. Reze por nós, padre.',
      populum: 'Treinei na fronteira. Se quer o meu respeito, lute até a última gota.',
      mago: 'Aquelas armas engolem sombras. Melhor nem entender.'
    } },
  // Cova
  { id: 'devoto_trevas', name: 'Devoto das Trevas', kind: 'talk', x: 326, y: 70, color: '#5a4a6a', accent: '#a0a0ff',
    event: 'lore', lines: {
      clero: 'Mastema prometeu a eternidade a quem abandonasse a luz. Eu escutei.',
      populum: 'Enquanto houver uma vila em pé, há esperança de sair daqui.',
      mago: 'O altar consome arcano. Não se aproxime sem arma, sem nome e sem fé.'
    } }
];

// --- Lore por casta ---
const LORE = {
  clero: [
    { id: 'chamado', title: 'O Chamado', text: 'Uma voz ao amanhecer disse: "Anda, as almas desta terra temem. Vai e acolhe-as." O Senhor vos envia a Eclésia para consolar e conduzir.' },
    { id: 'confissao', title: 'O Peso das Confissões', text: 'Cada confissão ouvida é uma alma que se deixa guiar. Vossa fé vos fortalece — e a elas traz paz.' },
    { id: 'travessia', title: 'A Travessia', text: 'Três pilares guardam o caminho: o Chefe Tribal, o Rei da Noite e o Guardião do Execra. Derrotai-os e o altar do Demônio se abrirá.' },
    { id: 'promessa', title: 'A Promessa', text: 'No leste, um selo profano esconde o altar de Mastema. Fechai-o para sempre e guiai as almas do Senhor a Ele.' }
  ],
  populum: [
    { id: 'fronteira', title: 'A Fronteira', text: 'O povo de Eclésia vive sob o jugo de bestas e bandos. A vila pede: espadas, flechas e engenho bastam?' },
    { id: 'guarnicao', title: 'Guarnições', text: 'Mercenários dizem que as ruínas guardam aço antigo. Um povo que se arma é um povo que resiste.' },
    { id: 'forte', title: 'O Forte', text: 'Ao sul-leste, um General rebelde ergue um forte para escravizar as aldeias. Enquanto ele viver, a fronteira sangra.' },
    { id: 'chama', title: 'A Chama do Povo', text: 'O General caiu. A chama da resistência ascende — e a fronteira, enfim, respira.' }
  ],
  mago: [
    { id: 'veo', title: 'O Véu Rasgado', text: 'Existe arcano antes do tempo. Os sabidos dizem que algo, no norte, desfiou o véu que separa o mundo e a eternidade.' },
    { id: 'cantos', title: 'Os Cantos Esquecidos', text: 'Nas ruínas há glifos que preservam o saber. Ler é lembrar — e lembrar é poder.' },
    { id: 'torre', title: 'A Torre Perdida', text: 'Uma torre erguia-se onde o arcano era mais denso. Hoje ela é um grito: algo dentro devora a força das palavras.' },
    { id: 'arcaico', title: 'O Arcano Devorador', text: 'Mastema tolheu até o arcano e criou o Devorador. Enquanto ele viver, todo saber será corrompido.' }
  ]
};

// Habilitação de lore por casta ao entrar em zonas especiais
const LORE_ZONE = {
  clero: [['sagrado', 'chamado'], ['cova', 'promessa']],
  populum: [['forte', 'forte']],
  mago: [['torre', 'torre']]
};

const SHOP = {
  potion: {
    name: 'Poção de Cura', desc: 'Recupera 60% da vida máxima.',
    cost: n => 30 + n * 12,
    effect: (g, p) => { p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * 0.6)); }
  },
  tome_vida: {
    name: 'Tomé: Vida', desc: '+25 de vida máxima.',
    cost: n => 60 + Math.round(45 * Math.pow(n, 1.5)),
    effect: (g, p) => { p.maxHp += 25; p.hp += 25; }
  },
  tome_vel: {
    name: 'Tomé: Velocidade', desc: '+10 de velocidade.',
    cost: n => 60 + Math.round(45 * Math.pow(n, 1.5)),
    effect: (g, p) => { p.spd += 10; }
  },
  tome_for: {
    name: 'Tomé: Força', desc: '+4 de força (dano físico).',
    cost: n => 60 + Math.round(45 * Math.pow(n, 1.5)),
    effect: (g, p) => { p.str += 4; }
  },
  tome_int: {
    name: 'Tomé: Inteligência', desc: '+4 de inteligência (dano mágico).',
    cost: n => 60 + Math.round(45 * Math.pow(n, 1.5)),
    effect: (g, p) => { p.int += 4; }
  }
};

function upgradeCost(tier) { return Math.round(35 * Math.pow(tier, 1.7) + 35); }
function weaponDamage(w) { return w.base + w.tier * 3; }

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function lerp(a, b, t) { return a + (b - a) * t; }
function rand(a, b) { return a + Math.random() * (b - a); }
function randint(a, b) { return Math.floor(rand(a, b + 1)); }
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function rectOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
function circleRect(c, r, rc) {
  const cx = Math.max(rc.x, Math.min(c.x, rc.x + rc.w));
  const cy = Math.max(rc.y, Math.min(c.y, rc.y + rc.h));
  return Math.hypot(c.x - cx, c.y - cy) < r;
}

// Estatística de recompensa usada pelo kill: ouro/min share escalam com o tier do monstro + perigo da região
function dangerLoot(danger) {
  return {
    goldMult: 1 + (danger - 1) * 0.35,
    heartChance: clamp(0.1 + (danger - 1) * 0.06, 0.1, 0.4),
    powerChance: danger >= 3 ? (danger - 2) * 0.06 : 0,
    potChance: danger >= 3 ? 0.08 + (danger - 3) * 0.02 : 0
  };
}