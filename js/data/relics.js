// --- Relíquias: equipamentos passivos com identidade e restrição por classe ---
// Cada relíquia tem `allowed`, que pode ser:
//   '*'                     → genérica, qualquer classe equipa
//   { casta: 'clero' }      → qualquer subclasse daquela casta
//   { subs: ['bispo'] }     → somente as subclasses listadas (e/ou junto de casta)
// Os efeitos são somados ao equipar e removidos ao desequipar. `cdMult` reduz o
// cooldown global (multiplicativo); `regen` cura passivamente (% da vida máx/s).
//
// Coerência temática: um Bispo não pode vestir aço de cavaleiro, um Arqueiro não
// cola a mitra episcopal e nenhum leigo exerce o pálio papal.
export const MAX_RELICS = 2;

export const RELICS = {
  elmo_cavaleiro: {
    id: 'elmo_cavaleiro', name: 'Elmo do Cavaleiro', icon: '⛨', color: '#c9c9d2',
    allowed: { subs: ['guerreiro', 'arqueiro', 'inventor'] },
    effects: { hp: 25, str: 5 },
    desc: 'Elmo de batalha da Ordem, pesado como um juramento. Concede vida e força ao braço que segura a linha.'
  },
  cruz_templo: {
    id: 'cruz_templo', name: 'Cruz do Templo', icon: '✚', color: '#c0392b',
    allowed: { casta: 'templarios' },
    effects: { hp: 20, str: 6 },
    desc: 'A cruz vermelha da Ordem, bentada pelo capelão antes de cada expedição. A fé do leigo e mais vida e força para os guardiões.'
  },
  mitra_episcopal: {
    id: 'mitra_episcopal', name: 'Mitra Episcopal', icon: '♛', color: '#ffe9a0',
    allowed: { subs: ['bispo'] },
    effects: { hp: 30, int: 4, cdMult: 0.85 },
    desc: 'Mitra bordada a fio de ouro que coroa a plenitude do sacerdócio. Vida, inteligência e cooldowns mais curtos nas mãos de um Bispo.'
  },
  palio_papal: {
    id: 'palio_papal', name: 'Pálio Papal', icon: '☩', color: '#fff7e0',
    allowed: { subs: ['papa'] },
    effects: { hp: 60, int: 8, str: 6, cdMult: 0.7 },
    desc: 'O pálio do sumo pontífice desce do ombro de quem governa a Igreja. Vida, força, inteligência e cooldowns muito mais rápidos. Item secreto de uma classe secreta.'
  },
  coroa_arcana: {
    id: 'coroa_arcana', name: 'Coroa Arcanista', icon: '◈', color: '#b07cff',
    allowed: { casta: 'mago' },
    effects: { int: 8, cdMult: 0.9 },
    desc: 'Coroa de prata marcada por glifos que só o véu ensina a ler. Inteligência e celeridade arcana para quem domina a palavra.'
  },
  calcice_sagrado: {
    id: 'calcice_sagrado', name: 'Cálice Sagrado', icon: '💰', color: '#e8e0c0',
    allowed: { casta: 'clero' },
    effects: { hp: 20, int: 3, regen: 0.03 },
    desc: 'Cálice de prata de uma capela esquecida. Vida, inteligência e uma regeneração lenta e constante — a graça que nunca cessa.'
  },
  anel_pescador: {
    id: 'anel_pescador', name: 'Anel do Pescador', icon: '◍', color: '#ffd23f',
    allowed: '*',
    effects: { hp: 10, spd: 5, int: 2 },
    desc: 'Anel simples, abençoado e sem dono. Um pouco de vida, de velocidade e de sabedoria acompanha qualquer fiel que o use.'
  }
};