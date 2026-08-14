import { T } from './constants.js';

export const MONSTERS = {
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
    hp: 1600, dmg: 34, speed: 115, behavior: 'boss', gold: [180, 240],
    resist: [T.PHYS], weak: [T.HOLY], aggro: 540, boss: true, crystal: 'sombrio', tier: 4
  },
  titan: {
    id: 'titan', name: 'Titã do Execra', color: '#8a6a4b', dark: '#4b352a', size: 76,
    hp: 1600, dmg: 40, speed: 95, behavior: 'boss', gold: [500, 500],
    resist: [T.PHYS], weak: [T.MAGIC], aggro: 560, boss: true, crystal: 'final', tier: 4
  },
  // --- Chefes finais por casta ---
  demonio: {
    id: 'demonio', name: 'Mastema, o Demônio', color: '#c0504a', dark: '#5f1f1f', size: 88,
    hp: 2800, dmg: 60, speed: 150, behavior: 'boss', gold: [1500, 1500],
    resist: [T.PHYS], weak: [T.HOLY], aggro: 720, boss: true, finalBoss: true, casta: 'clero', tier: 5
  },
  general: {
    id: 'general', name: 'General Tarraske', color: '#a0a8a0', dark: '#4b524b', size: 82,
    hp: 2600, dmg: 55, speed: 142, behavior: 'boss', gold: [1500, 1500],
    resist: [T.MAGIC], weak: [T.PHYS, T.HOLY], aggro: 720, boss: true, finalBoss: true, casta: 'templarios', tier: 5
  },
  arcano: {
    id: 'arcano', name: 'O Arcano Devorador', color: '#a08ad8', dark: '#4b3f7a', size: 86,
    hp: 3000, dmg: 60, speed: 118, behavior: 'boss', gold: [1500, 1500],
    resist: [T.MAGIC], weak: [T.PHYS, T.HOLY], aggro: 720, boss: true, finalBoss: true, casta: 'mago', tier: 5
  }
};

// Finais por casta (introdução, título e mensagens)
export const FINAL_ENDINGS = {
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
    casta: 'templarios', poster: 'Guerreiro',
    title: 'A FRONTEIRA SEGURA',
    msg: 'O General caiu. A fronteira dos templários está segura.',
    intro: [
      'O General Tarraske sitiou as aldeias e desafiou a cruz do Templo.',
      'Suas guarnições cercam o forte ao sul-leste.',
      'Derrotai o General e libertai a fronteira de Eclésia.'
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
export const CRYSTALS = {
  floresta: { name: 'Cristal da Floresta', color: '#5cff9a', hint: 'Krol, Chefe Tribal', gate: 'caverna' },
  sombrio: { name: 'Cristal Sombrio', color: '#9a6bff', hint: 'Gere Osso, Rei da Noite', gate: 'gruta' },
  final: { name: 'Coroa do Execra', color: '#ffd23f', hint: 'Titã do Execra', gate: 'arcano' }
};

// Nível de batalha exigido para enfrentar cada chefe.
// 0 = acessível desde o início; 1 = alcançado ao derrotar Krol; 3 = alcançado ao
// derrotar o Rei da Noite (Alvorada dos Mortos). O jogador precisa de
// KROL → Nível 1 → Alvorada dos Mortos → Nível 3 → desafios finais.
export const BOSS_LEVEL_REQ = {
  krol_chefe: 0,
  gere_osso: 1,
  titan: 3,
  demonio: 3,
  general: 3,
  arcano: 3
};