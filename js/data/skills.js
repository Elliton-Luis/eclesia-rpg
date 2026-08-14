import { T } from './constants.js';

export const EXTRA_SKILLS = [
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