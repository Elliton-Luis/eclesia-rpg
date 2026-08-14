export const TILE = 32;
export const RUN = 1.55;

export const T = { PHYS: 'phys', HOLY: 'holy', MAGIC: 'magic' };

export const TYPE_MULT = { WEAK: 1.6, RESIST: 0.45 };

export const MAX_EXTRA_SKILLS = 3;
export const MAX_TRAIN_REFLEX = 10; // 10 treinos de +10% de velocidade de ataque/disparo (máx +100%)

export const MAX_BLESSINGS = 6;
export const BLESSING_KEYS = ['B', 'G', 'U', 'V', 'N'];

// --- Mundo: dados da geração procedural ---
export const WORLD_W = 400;   // largura em tiles
export const WORLD_H = 240;   // altura em tiles
export const CHUNK = 16;      // tiles por lado de chunk
export const WORLD_SEED = 20240811;