export const SHOP = {
  fulmen: {
    name: 'Fulmen Ruptor', desc: 'Frasco de fogo consagrado que arrebenta árvores e rochedos, abrindo rotas fechadas pela natureza. Cada unidade comprada vale para a jornada atual — começa zerada em qualquer nova partida.',
    cost: () => 150,
    effect: (g, p) => { p.grantFulmen(1); }
  },
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