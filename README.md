# Eclésia — Protótipo RPG 2D

Protótipo de RPG de ação 2D top-down com progressão de personagem, chefes e mundo semi-aberto. Desenvolvido em HTML5 Canvas, CSS e JavaScript puro.

## Stack

- HTML5
- CSS3
- JavaScript (ES6+)
- Vercel

## Funcionalidades

- **3 castas / 9 subclasses**: Clero (Padre, Bispo, Diácono), Populum (Guerreiro, Arqueiro, Inventor), Mago (Elemental, Psíquico, Abençoador) — cada uma com stats, arma, ataque base e 2 habilidades únicas (Q/E).
- **Habilidades extras**: até 3 habilidades adicionais compráveis (R/T/Y) no Mestre das Artes.
- **Combate**: corpo a corpo, projéteis, auras e área; sistema de fraquezas/resistências por tipo de dano (Físico, Sagrado, Mágico).
- **Progressão**: ouro para melhorar arma no Ferreiro, comprar poções/tomés no Vendedor, aprender habilidades extras.
- **Mundo**: mapa procedural 110×50 tiles com 6 zonas (Rio, Prado Sereno, Vila de Pedra, Floresta dos Goblins, Catacumbas, Gruta do Execra).
- **Monstros**: 15 inimigos regulares + 3 chefes (Krol Chefe, Gere Osso, Titã do Execra) com padrões de ataque distintos.
- **Portões**: Catacumbas e Gruta abrem ao derrotar chefes e obter cristais.
- **NPCs**: Ferreiro, Vendedor, Mestre das Artes, Cronista (guia).
- **Estatísticas**: tempo, abates, chefes, mortes, dano causado/recebido, combo máximo, power-ups, zonas visitadas.
- **Recordes locais**: salvos no `localStorage` por subclasse.
- **Sistema de cheats** (F3): ouro/vida infinitos, spawn de itens, edição de stats, painel visual.
- **Efeitos visuais**: partículas, screen shake, flash de dano, barras de vida, anéis de habilidade, texto flutuante.
- **Áudio**: Web Audio API para efeitos (ataque, hit, cura, upgrade, boss, etc.).

## Estrutura de dados

### Subclasses
Definidas em `js/data.js` (`SUBCLASSES`). Cada uma contém:
- `casta` (clero/populum/mago), `hp`, `speed`, `str`, `int`, `jump`
- `weapon`: nome, dano base, cor, tipo (`melee`/`ranged`/`aura`)
- `attack`: tipo, multiplicador, alcance/cadência, cor, propriedades extras (pierce, combo, etc.)
- `aura` (opcional): raio, dano por tick, intervalo
- `skills`: 2 habilidades com tecla, cooldown, descrição e efeitos

### Monstros
Definidos em `js/data.js` (`MONSTERS`). Cada um tem:
- `hp`, `dmg`, `speed`, `behavior` (`hop`, `swoop`, `chase`, `range`, `slowChase`, `wraith`, `boss`)
- `resist` / `weak`: arrays de tipos de dano
- `gold`: range de recompensa
- Propriedades especiais: `fly`, `venom`, `invokes`, `explodeOnDeath`, `boss`, `crystal`

### Zonas e Spawns
- `ZONES`: áreas nomeadas com limites retangulares (usadas para título de zona e exploração).
- `SPAWNS`: lista de pontos de spawn por zona com tipo de monstro e coordenadas; bosses marcados com `bossRoom: true`.

## Estatísticas / Persistência

- **Estatísticas da run** (`GAME.stats`): zeradas a cada nova partida; incluem tempo, kills, bosses, deaths, dmgDealt, dmgTaken, maxCombo, powerups, exploration.
- **Recordes**: salvos no `localStorage` sob a chave `eclesia_records`. Estrutura por subclasse: `{ score, time, kills, bosses, date }`. Exibidos no menu via botão "Recordes Locais".
- Não há backend ou sincronização na nuvem.

## Próximos passos

### Concluído
- Sistema de classes, habilidades e combate base
- Mapa procedural com zonas, portões e progressão por chefes
- NPCs (forge, shop, skills, guide) funcionalidades
- Monstros com comportamentos variados e 3 bosses com padrões
- Persistência de recordes no localStorage
- Sistema de cheats para testes
- Efeitos visuais, áudio, HUD, menus

### Próximos passos
- Balanceamento de stats, dano e economia (ouro, custos de upgrade)
- Mais variedade de itens consumíveis e equipamentos
- Melhoria na IA de bosses (fases, padrões adicionais)
- Tela de vitória/derrota com estatísticas finais mais completas
- Opção de continuar pós-jogo (New Game+ ou exploração livre)
- Acessibilidade: suporte a toque/mobile, legendas para áudio
- Otimização de renderização para mapas maiores

## Como executar

### Produção (Vercel)
Acesse a versão publicada: https://eclesia-rpg.vercel.app (ou a URL do seu deploy).

### Local
```bash
git clone https://github.com/seu-usuario/my_rpg.git
cd my_rpg
# Sirva os arquivos estáticos (qualquer servidor HTTP)
npx serve .
# ou
python3 -m http.server 8000
# depois abra http://localhost:3000 (serve) ou http://localhost:8000 (python)
```
Não há dependências, build ou instalação — apenas arquivos estáticos.

## Deploy

O projeto está configurado para deploy estático na Vercel. O `vercel.json` (se presente) aponta para a raiz do repositório; o `index.html` carrega `style.css` e os módulos JS em `js/`. Cada push na branch principal gera novo deploy automático.