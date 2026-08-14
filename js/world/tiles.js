// Sólidos: blocos que impedem passagem
export const SOLIDS = new Set(['t', 'r', 'w', 'h', 'v', 'q', 'l', 'k', 'o', 'T']);

// Sólidos com hitbox reduzida (árvores e rochas do cenário): o jogador pode
// aproximar-se visualmente antes de colidir, dando margem para "espremer" entre elas.
export const SHRINK = new Set(['t', 'r']);
export const SHRINK_INSET = 9; // px de margem interna em cada lado do tile

// Chars sobre os quais pode nascer spawn (permitem andar)
export const WALK_SPAWN = new Set(['g', 'p', 'y', 'c', 'f', 'z', 'b', 'x', 's', 'd', 'n']);

export const WILD_MONSTERS = [['slime', 3], ['rato', 2], ['wolf', 1], ['bat', 1]];