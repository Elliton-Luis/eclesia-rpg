import { T } from './constants.js';

// --- Bênçãos: dons sagrados aprendidos com o clero durante a exploração ---
// Cada bênção tem um nome próprio em latim derivado do seu conceito (Lux = luz,
// Scutum = escudo, Passus = passo, etc.), para que no inventário não apareçam
// apenas como "Bênção de...". Todas são castáveis pela hotbar (teclas 1–0) e
// desencadeiam efeitos reais em combate.
//
// tier 1-2 = ensinadas por Padres (comuns/intermediárias).
// tier 3   = ensinadas por Bispos (poderosas e raras).
// tier 4   = Bênção Suprema — Miraculum, ensinada apenas pelo Papa (10% por partida).
//
// `lay: true` = bênção de sustento destinada aos LEIGOS (Templários e demais
// fiéis não ordenados): cura, coragem, proteção e movimento — reforço pessoal.
// As demais (luz, cadência, precisão, fúria, julgamento e Suprema) são dons
// sacramentais/ofensivos reservados ao Clero ordenado, que os exerce com
// autoridade eclesiástica.
export const BLESSINGS = {
  bencao_luz: { id: 'bencao_luz', name: 'Lux', key: 'B', tier: 1, cd: 8, color: '#fff3b0',
    bless: 'nova', dmg: 1.7, type: T.HOLY, radius: 150,
    desc: 'Irradia uma onda de luz sagrada ao redor, ferindo todos os inimigos próximos.' },
  bencao_cura: { id: 'bencao_cura', name: 'Salus', key: 'B', tier: 1, cd: 13, color: '#7cff8a',
    bless: 'heal', heal: 0.5, purge: true, lay: true,
    desc: 'Restaura metade da vida e purga veneno, malefícios e enfraquecimentos.' },
  bencao_coragem: { id: 'bencao_coragem', name: 'Fortitudo', key: 'B', tier: 1, cd: 10, color: '#ff9d5c',
    bless: 'buff', dmg: 0.40, spd: 0.25, dur: 9, lay: true,
    desc: 'A coragem fortalece o corpo: +40% de dano e +25% de velocidade por 9s.' },
  bencao_escudo: { id: 'bencao_escudo', name: 'Scutum', key: 'B', tier: 2, cd: 11, color: '#ffe9a0',
    bless: 'shield', shield: 170, dur: 8, lay: true,
    desc: 'Escudo de fé que absorve até 170 de dano por 8 segundos.' },
  bencao_passo: { id: 'bencao_passo', name: 'Passus', key: 'B', tier: 2, cd: 6, color: '#c0b4ff',
    bless: 'blink', dist: 260, lay: true,
    desc: 'Passo sagrado: teleporta na direção do cursor, atravessando até 260px.' },
  bencao_cadencia: { id: 'bencao_cadencia', name: 'Pulsus', key: 'B', tier: 3, cd: 2.5, color: '#ffd23f',
    bless: 'barrage', dmg: 0.9, type: T.HOLY, speed: 820, n: 4, spread: 0.22, pierce: true,
    desc: 'Cadenciado pela fé: rajada de 4 dardos de luz velozes e perfurantes.' },
  bencao_precisao: { id: 'bencao_precisao', name: 'Telum', key: 'B', tier: 3, cd: 3.5, color: '#b0c4ff',
    bless: 'bolt', dmg: 2.6, type: T.HOLY, speed: 1100, pierce: true, size: 9,
    desc: 'Dardo de luz preciso e veloz que atravessa os inimigos em linha reta.' },
  bencao_furia: { id: 'bencao_furia', name: 'Furia', key: 'B', tier: 3, cd: 5, color: '#ff9d5c',
    bless: 'nova', dmg: 3.2, type: T.HOLY, radius: 235,
    desc: 'Explosão sagrada violenta, em grande área, que fere tudo ao redor.' },
  bencao_julgamento: { id: 'bencao_julgamento', name: 'Iudicium', key: 'B', tier: 3, cd: 9, color: '#ff6b6b',
    bless: 'beam', dmg: 4.5, type: T.HOLY, range: 420,
    desc: 'Coluna do julgamento: atravessa todos os inimigos em linha reta (até 420px).' },
  bencao_suprema: { id: 'bencao_suprema', name: 'Miraculum', key: 'H', tier: 4, cd: 0, color: '#fff',
    bless: 'supreme', radius: 430, singleUse: true,
    desc: 'Milagre de uso único: a luz divina aniquila qualquer ser no raio de 430px do impacto.' },
  // Item consumível do Vendedor que vira uma habilidade dispensável: aprendida
  // ao ser comprada, aparece nas "Habilidades Aprendidas" do inventário e pode
  // ser equipada na hotbar como uma bênção comum. Cada uso consome 1 unidade
  // de Fulmen da jornada atual (`p.fulmen`) — começa zerado a cada nova partida.
  fulmen_ruptor: { id: 'fulmen_ruptor', name: 'Fulmen Ruptor', key: 'B', tier: 1, cd: 0.4, color: '#ffd23f',
    bless: 'fulmen', item: true,
    desc: 'Frasco de fogo consagrado que arrebenta árvores e rochedos, abrindo rotas fechadas pela natureza. Aponte e use: consome 1 unidade do estoque por explosão.' }
};