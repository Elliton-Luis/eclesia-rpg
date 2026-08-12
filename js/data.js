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
    desc: 'Reza e a luz divina queima quem chega perto.',
    hp: 120, speed: 240, str: 8, int: 18, jump: 780,
    weapon: { name: 'Cajado do Pastor', base: 12, color: '#8a5a2b', kind: 'aura' },
    attack: { kind: 'aura', dmg: 1.15, type: T.HOLY, radius: 150, cd: 0.7, color: '#fff3b0' },
    aura: { radius: 95, dmg: 0.4, tick: 0.6 },
    skills: [
      { id: 'heal', name: 'Luz Curadora', key: 'Q', cd: 7, color: '#ffe66d', desc: 'Cura 40% da vida máxima.', heal: 0.4 },
      { id: 'holyWave', name: 'Onda Sagrada', key: 'E', cd: 5, color: '#fff3b0', desc: 'Onda sagrada que atravessa inimigos.', dmg: 1.5, type: T.HOLY, speed: 430, size: 14, pierce: true }
    ]
  },
  bispo: {
    id: 'bispo', casta: 'clero', name: 'Bispo', color: '#e8b0b0', accent: '#a23b3b',
    desc: 'Tanque sagrado: aura enorme e lenta, escudo e julgamento.',
    hp: 165, speed: 205, str: 12, int: 16, jump: 760,
    weapon: { name: 'Báculo Episcopal', base: 17, color: '#7a3b3b', kind: 'aura' },
    attack: { kind: 'aura', dmg: 1.5, type: T.HOLY, radius: 205, cd: 0.9, color: '#ffe9b0' },
    aura: { radius: 145, dmg: 0.55, tick: 0.6 },
    skills: [
      { id: 'shield', name: 'Escudo Divino', key: 'Q', cd: 12, color: '#ffd27f', desc: 'Absorve 90 de dano por 7s.', shield: 90, dur: 7 },
      { id: 'julgamento', name: 'Julgamento', key: 'E', cd: 6, color: '#fff3b0', desc: 'Raiada sagrada devastadora.', dmg: 2.4, type: T.HOLY, speed: 540, size: 18 }
    ]
  },
  diacono: {
    id: 'diacono', casta: 'clero', name: 'Diácono', color: '#c8e8e0', accent: '#2f8a8a',
    desc: 'Ágil e veloz com dardos perseguidores.',
    hp: 105, speed: 275, str: 9, int: 18, jump: 800,
    weapon: { name: 'Cajado da Devoção', base: 12, color: '#2f8a8a', kind: 'ranged' },
    attack: { kind: 'ranged', dmg: 1.0, type: T.HOLY, speed: 620, cd: 0.32, color: '#d8fff0', size: 8, pierce: true },
    skills: [
      { id: 'homing', name: 'Dardo Sagrado', key: 'Q', cd: 3.5, color: '#fff7cc', desc: 'Dardo que persegue o inimigo mais próximo.', dmg: 1.35, type: T.HOLY, speed: 380, size: 9, homing: true },
      { id: 'bless', name: 'Bênção', key: 'E', cd: 14, color: '#ffe66d', desc: '+50% de dano e +25% de velocidade por 8s.', dmg: 0.5, spd: 0.25, dur: 8 }
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
      { id: 'grenade', name: 'Granada', key: 'Q', cd: 5, color: '#ffb020', desc: 'Granada que explode em área.', dmg: 1.9, type: T.MAGIC, radius: 95, throw: 1 },
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
  // { id, name, key, cd, color, cost, desc, ...efeito }
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
  slime: {
    id: 'slime', name: 'Slime', color: '#6abf4b', dark: '#3f7a2e', size: 30,
    hp: 30, dmg: 8, speed: 95, behavior: 'hop', gold: [3, 6],
    resist: [T.PHYS], weak: [T.MAGIC], aggro: 340
  },
  bat: {
    id: 'bat', name: 'Morcego', color: '#7a6ba8', dark: '#4b3f6b', size: 26,
    hp: 22, dmg: 7, speed: 185, behavior: 'swoop', fly: true, gold: [4, 8],
    resist: [T.MAGIC], weak: [T.PHYS], aggro: 420
  },
  wolf: {
    id: 'wolf', name: 'Lobo', color: '#9a9aa0', dark: '#5f5f6a', size: 40,
    hp: 70, dmg: 13, speed: 230, behavior: 'swoop', gold: [8, 14],
    resist: [T.MAGIC], weak: [T.PHYS], aggro: 460
  },
  archer: {
    id: 'archer', name: 'Arqueiro Goblin', color: '#7fbf4b', dark: '#4b7a2e', size: 32,
    hp: 55, dmg: 12, speed: 145, behavior: 'range', gold: [10, 18],
    resist: [T.HOLY], weak: [T.PHYS], aggro: 500, shots: 1
  },
  bomber: {
    id: 'bomber', name: 'Bomba-viva', color: '#d966ff', dark: '#7a2e8a', size: 30,
    hp: 26, dmg: 22, speed: 150, behavior: 'chase', gold: [6, 10],
    resist: [T.MAGIC], weak: [T.PHYS], aggro: 300, explodeOnDeath: true
  },
  spider: {
    id: 'spider', name: 'Aranha', color: '#9a4b8a', dark: '#5f2a55', size: 34,
    hp: 45, dmg: 9, speed: 175, behavior: 'chase', gold: [7, 12],
    resist: [T.PHYS], weak: [T.MAGIC], aggro: 400, venom: true
  },
  wraith: {
    id: 'wraith', name: 'Espectro', color: '#9ad0e0', dark: '#5a8a9a', size: 34,
    hp: 65, dmg: 15, speed: 120, behavior: 'wraith', fly: true, gold: [14, 22],
    resist: [T.PHYS], weak: [T.HOLY], aggro: 420, invokes: true
  },
  goblin: {
    id: 'goblin', name: 'Goblin', color: '#8fbf4b', dark: '#5a7a2e', size: 34,
    hp: 60, dmg: 14, speed: 150, behavior: 'chase', gold: [8, 15],
    resist: [T.HOLY], weak: [T.PHYS], aggro: 380
  },
  skeleton: {
    id: 'skeleton', name: 'Esqueleto', color: '#d9d0c0', dark: '#9a8f7a', size: 38,
    hp: 85, dmg: 16, speed: 105, behavior: 'chase', jump: 380, gold: [12, 20],
    resist: [T.PHYS], weak: [T.HOLY], aggro: 360
  },
  golem: {
    id: 'golem', name: 'Golem', color: '#9a9a9a', dark: '#5f5f5f', size: 52,
    hp: 240, dmg: 26, speed: 55, behavior: 'slowChase', gold: [25, 40],
    resist: [T.PHYS], weak: [T.MAGIC], aggro: 330
  },
  shaman: {
    id: 'shaman', name: 'Xamã', color: '#b58a4b', dark: '#7a5a2b', size: 34,
    hp: 70, dmg: 18, speed: 115, behavior: 'range', gold: [18, 30],
    resist: [T.MAGIC], weak: [T.HOLY], aggro: 420, shots: 2
  },
  krol_chefe: {
    id: 'krol_chefe', name: 'Krol, Chefe Tribal', color: '#a14b3c', dark: '#5f2218', size: 46,
    hp: 420, dmg: 24, speed: 185, behavior: 'boss', gold: [120, 160],
    resist: [T.HOLY], weak: [T.PHYS], aggro: 520, boss: true, crystal: 'floresta'
  },
  gere_osso: {
    id: 'gere_osso', name: 'Gere Osso, Rei da Noite', color: '#d9d0c0', dark: '#8a7a5a', size: 52,
    hp: 700, dmg: 28, speed: 105, behavior: 'boss', gold: [180, 240],
    resist: [T.PHYS], weak: [T.HOLY], aggro: 520, boss: true, crystal: 'sombrio'
  },
  titan: {
    id: 'titan', name: 'Titã do Execra', color: '#8a6a4b', dark: '#4b352a', size: 76,
    hp: 1600, dmg: 40, speed: 95, behavior: 'boss', gold: [500, 500],
    resist: [T.PHYS], weak: [T.MAGIC], aggro: 560, boss: true, crystal: 'final', final: true
  }
};

const GATES = [
  { id: 'caverna', x: 75 * TILE, y: 26 * TILE, w: TILE, h: 21 * TILE,
    name: 'Portão das Catacumbas', flag: 'cristal_floresta',
    msg: 'Um selo antigo bloqueia as catacumbas. Derrote o Chefe Tribal na floresta.' },
  { id: 'gruta', x: 95 * TILE, y: 26 * TILE, w: TILE, h: 21 * TILE,
    name: 'Portão do Execra', flag: 'cristal_sombrio',
    msg: 'Um selo de sombras bloqueia a gruta. O Rei da Noite guarda a chave.' }
];

const CRYSTALS = {
  floresta: { name: 'Cristal da Floresta', color: '#5cff9a', hint: 'Krol, Chefe Tribal' },
  sombrio: { name: 'Cristal Sombrio', color: '#9a6bff', hint: 'Gere Osso, Rei da Noite' },
  final: { name: 'Coroa do Execra', color: '#ffd23f', hint: 'Titã do Execra' }
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
