// NPCs espalhados pelo mundo. kind controla o tipo de interação.
export const NPC_DEFS = [
  // Vila de Pedra — estabelecimentos
  { id: 'ferreiro', name: 'Ferreiro', kind: 'forge', x: 111, y: 121, color: '#b5651d', accent: '#ffb020' },
  { id: 'vendedor', name: 'Vendedor', kind: 'shop', x: 120, y: 121, color: '#2980b9', accent: '#7ec8e3' },
  { id: 'mestre', name: 'Mestre das Artes', kind: 'skills', x: 128, y: 121, color: '#8e44ad', accent: '#d8a1ff' },
  { id: 'guia', name: 'Cronista', kind: 'guide', x: 116, y: 124, color: '#27ae60', accent: '#a8e6a1',
    // Revelações progressivas conforme o Nível de Batalha: cada fala nova
    // acrescenta um fragmento do mundo sem repetir o que já foi contado.
    hints: [
      { need: 0, text: 'Fiquei sabendo de um monstro ao norte. Talvez isso lhe ajude...' },
      { need: 1, text: 'Vencestes o Chefe Tribal? As Catacumbas se abrem aos fortes — e nelas dorme o Rei da Noite.' },
      { need: 3, text: 'As barreiras finais ruem para os que alcançam o auge. Mastema ronca a leste, o General no sul-leste, o Devorador no oeste. E nos rochedos do sul dorme o Titã do Execra, guardião da Coroa.' }
    ] },
  { id: 'paroco', name: 'Pároco Ambrósio', kind: 'church', x: 110, y: 113, color: '#c9a227', accent: '#fff3b0', rank: 'padre',
    teaches: ['bencao_luz', 'bencao_cura'] },
  { id: 'bispo_central', name: 'Bispo Cedric', kind: 'church', x: 119, y: 119, color: '#e8b0b0', accent: '#a23b3b', rank: 'bispo',
    teaches: ['bencao_cadencia', 'bencao_precisao'] },
  { id: 'taberneiro', name: 'Taberneiro', kind: 'tavern', x: 127, y: 113, color: '#a8823f', accent: '#ffb020' },
  { id: 'erudito', name: 'Erudito Tior', kind: 'tower', x: 120, y: 136, color: '#7a6bd8', accent: '#c0b4ff' },
  // Vila — interações por casta
  { id: 'santa_ana', name: 'Ana, a Lavadeira', kind: 'talk', x: 107, y: 132, color: '#b8a080', accent: '#d8c0a0',
    event: 'confess', lines: {
      clero: 'Padre, eu... roubei pão para os meus filhos. A fome me cegou.',
      templarios: 'Cavaleiro do Templo, a vila passa fome. Nem sempre temos o que comer.',
      mago: 'Sussurram que magos andam sumidos pelas ruínas. Tome cuidado.'
    } },
  { id: 'guarda_bira', name: 'Guarda Bira', kind: 'talk', x: 125, y: 132, color: '#8a9a8a', accent: '#c8d8c8',
    event: 'war', lines: {
      clero: 'A reza não afasta o lobo, mas talvez acalme o medo. Boa noite, padre.',
      templarios: 'Vosso manto branco não basta. Prove seu valor em campo, cavaleiro, e terá meu respeito.',
      mago: 'Feiticeiros... sustento que valem tanto quanto mãos firmes. Humpf.'
    } },
  { id: 'coroinha', name: 'Coroinha Benjamim', kind: 'talk', x: 113, y: 117, color: '#e8d8b0', accent: '#ffd76a',
    event: 'lore', lines: {
      clero: 'O Pároco diz que o Senhor fala pelos ventos do leste. Ouviu? Eu ouvi.',
      templarios: 'Cavaleiro do Templo, corri até o poço e voltei. A vila inteira me conhece!',
      mago: 'O homem do livro lê palavras que brilham. Juro que brilham!'
    } },
  // Campos de Trigo
  { id: 'fazendeiro', name: 'Tomás, Fazendeiro', kind: 'talk', x: 40, y: 122, color: '#c9b37a', accent: '#f0d8a0',
    event: 'lore', lines: {
      clero: 'A terra é gentil, mas os espantalhos andam. Sim, padre... ANDAM.',
      templarios: 'De noite os espantalhos se mexem. Cavaleiro, protegei os campos da vila.',
      mago: 'Trigo bom é trigo que canta. E o meu canta assustado.'
    } },
  { id: 'roceira', name: 'Dona Zilda', kind: 'talk', x: 35, y: 132, color: '#c8a8a0', accent: '#e0c0b0',
    event: 'confess', lines: {
      clero: 'Padre, menti sobre a colheita para o imposto. É um peso que não sai de mim.',
      templarios: 'As fogueiras de junho deviam alegrar. Hoje só a fazem tremer, cavaleiro.',
      mago: 'Forasteiros passam com poções. Nada como suor de verdade.'
    } },
  // Bosque Sagrado
  { id: 'peregrino', name: 'Peregrino Inácio', kind: 'talk', x: 158, y: 76, color: '#b8b0a0', accent: '#e8e0c8',
    event: 'lore', lines: {
      clero: 'Peregrino que sou, vi um altar profano além dos rochedos. O Demônio ronca no leste.',
      templarios: 'Cavaleiro, o caminho para leste é mau. As criaturas ficam maiores e mais cruéis.',
      mago: 'Por estas árvores, ouvi encantamentos antigos. O saber dorme onde a fé acorda.'
    } },
  { id: 'capela_sagrada', name: 'Capela do Bosque', kind: 'church', rank: 'capela', x: 186, y: 78, color: '#f0e0c0', accent: '#fff3b0',
    teaches: ['bencao_coragem', 'bencao_escudo'] },
  // Pântano
  { id: 'pescador', name: 'Pescador Duro', kind: 'talk', x: 218, y: 84, color: '#8a8a9a', accent: '#b0c0d0',
    event: 'lore', lines: {
      clero: 'No pântano as luzinhas dançam. São almas perdidas pedindo reza.',
      templarios: 'Não pise nas poças, cavaleiro. O que mora dentro tem dentes.',
      mago: 'As luzes falsas são velhas mentiras arcanas. Nada novo no brejo.'
    } },
  // Cemitério
  { id: 'coveiro', name: 'Coveiro Nico', kind: 'talk', x: 42, y: 186, color: '#6a7a6a', accent: '#a8b8a8',
    event: 'confess', lines: {
      clero: 'Padre... enterrei vivo o velho Zé para ficar com a herdade. Perdoai-me.',
      templarios: 'Cavei o que a guerra não enterrou. Os lençóis cobrem muita coisa, cavaleiro.',
      mago: 'Os mortos aqui... se mexem. E não é por causa da terra.'
    } },
  { id: 'velha_zefa', name: 'Velha Zefa', kind: 'talk', x: 52, y: 198, color: '#9a8a80', accent: '#c0b0a0',
    event: 'lore', lines: {
      clero: 'Ah, filho da luz... os zumbis foram gente que não ouviu o chamado. Conduze-os.',
      templarios: 'Paguei para ver a lua cheia. Ver o que se arrasta aqui não foi favor, cavaleiro.',
      mago: 'O Necromante queimou minhas ervas. Guarde as suas, moço.'
    } },
  { id: 'ermida_cemiterio', name: 'Padre Casimiro', kind: 'church', rank: 'padre', x: 56, y: 193, color: '#c9b8a8', accent: '#fff3b0',
    teaches: ['bencao_cura', 'bencao_coragem'] },
  // Ruínas
  { id: 'arqueologo', name: 'Dante, Arqueólogo', kind: 'talk', x: 172, y: 148, color: '#b0a080', accent: '#e0d0a0',
    event: 'saber', lines: {
      clero: 'Estas paredes tinham um altar. O que o profanou... ainda habita o chão.',
      templarios: 'Há aço antigo sob os escombros, digno de um templário. Permita-me mostrar-lhe o caminho?',
      mago: 'Glifos! Glifos preservados! O saber destas ruínas vale ouro e vida.'
    } },
  { id: 'ferreiro_ruinas', name: 'Ferreiro das Ruínas', kind: 'forge', x: 184, y: 158, color: '#8a6a4b', accent: '#ff9d5c' },
  { id: 'abadia_ruinas', name: 'Abade Rufus', kind: 'church', rank: 'padre', x: 192, y: 146, color: '#c0b8c8', accent: '#fff3b0',
    teaches: ['bencao_escudo', 'bencao_passo'] },
  // Colinas
  { id: 'mineiro', name: 'Mineiro Pedro', kind: 'talk', x: 252, y: 172, color: '#9a9a7a', accent: '#c8c890',
    event: 'lore', lines: {
      clero: 'Na serra mora um gigante que dorme. A fé não o acorda; o ouro, sim.',
      templarios: 'O fedor de minério é o cheiro do trabalho. Aqui ninguém se ajoelha, nem para o Templo.',
      mago: 'A rocha aqui tem veios que a magia escuta. Ouço quando estou só.'
    } },
  { id: 'igreja_colinas', name: 'Padre Belisário', kind: 'church', rank: 'padre', x: 264, y: 184, color: '#b8ac98', accent: '#fff3b0',
    teaches: ['bencao_passo', 'bencao_luz'] },
  // Templo
  { id: 'sabio', name: 'Sábio Laude', kind: 'talk', x: 284, y: 76, color: '#b8b8d8', accent: '#d8d8f0',
    event: 'saber', lines: {
      clero: 'O templo fora consagrado à luz. As gárgulas esqueceram o que guardavam.',
      templarios: 'Lendas falam de um tesouro. Lendas também falam de hordas de criaturas, cavaleiro.',
      mago: 'Aqui o véu é fino. Sinta a vibração arcana nas colunas quebradas.'
    } },
  { id: 'catedral_templo', name: 'Bispo Eleutério', kind: 'church', rank: 'bispo', x: 296, y: 86, color: '#e8b0b0', accent: '#8a3b3b',
    teaches: ['bencao_furia', 'bencao_julgamento'] },
  // Forte
  { id: 'taberneira_fronteira', name: 'Taverneira da Fronteira', kind: 'tavern', x: 330, y: 190, color: '#c8a880', accent: '#e0b878' },
  { id: 'soldado_desertor', name: 'Desertor Valdomiro', kind: 'talk', x: 328, y: 198, color: '#7a8a7a', accent: '#a8c0a8',
    event: 'war', lines: {
      clero: 'O General vendeu a alma por ferro e pólvora. Reze por nós, padre.',
      templarios: 'Treinei na fronteira. Se quer o respeito do Templo, lute até a última gota.',
      mago: 'Aquelas armas engolem sombras. Melhor nem entender.'
    } },
  { id: 'capela_forte', name: 'Bispo Anselmo', kind: 'church', rank: 'bispo', x: 344, y: 192, color: '#e8b0b0', accent: '#6a2b2b',
    teaches: ['bencao_cadencia', 'bencao_furia'] },
  // Cova
  { id: 'devoto_trevas', name: 'Devoto das Trevas', kind: 'talk', x: 326, y: 70, color: '#5a4a6a', accent: '#a0a0ff',
    event: 'lore', lines: {
      clero: 'Mastema prometeu a eternidade a quem abandonasse a luz. Eu escutei.',
      templarios: 'Enquanto houver um templário em pé, há esperança de sair daqui.',
      mago: 'O altar consome arcano. Não se aproxime sem arma, sem nome e sem fé.'
    } }
];