// --- Relações: a memória dos NPCs sobre o protagonista ---
// Cada NPC importante tem uma pequena trajetória de relacionamento no formato:
//
//   primeiro encontro  →  conhecimento  →  confiança  →  eventos pessoais
//                     →  mudança após os Chefes  →  conclusão da relação
//
// A progressão é determinada por estado real do jogo (nada paralelo):
//   `at`     → quantas conversas já trocadas com o NPC nesta jornada
//   `boss`   → chefes derrotados (id, lista de ids 'qualquer um', ou número
//              total de chefes via stats.bosses)
//   `lvl`    → Nível de Batalha (progressLevel)
//   `casta` / `sub`     → reação à vocação do protagonista
//   `playingPapa`       → o jogador está jogando de Papa
//   `popeBought`        → o jogador comprou o Papa no passado (registro salvo)
//
// `text` pode ser uma string única ou um objeto por casta. `give` concede uma
// recompensa única (relíquia, ouro, atributo, bênção ou lore) quando o estágio
// é alcançado. Nem todo estágio recompensa: muitos existem só para desenvolver
// o personagem e o mundo.
export const RELATIONS = {
  veterano: {
    stages: [
      { at: 2, text: {
        clero: 'Passastes mais de uma vez por esta vila, padre. A cruz de madeira e o aço: continuam sendo a mesma oração feita de duas línguas.',
        templarios: 'Outra rodada de vigia, irmão. A Ordem não compra lealdade; constrói-se guardando a mesma porta, noite após noite.',
        mago: 'Voltastes. O aço do Templo costuma esquecer visita de uma noite — mas eu lembro de quem não pede, só olha.'
      } },
      { at: 4, text: 'Chamai-me Gualter, como os velhos companheiros. Nesta vila poucos se apresentam pelo nome duas vezes a alguém que não merece.' },
      { at: 4, casta: 'templarios', text: 'Esta lâmina de um velho companheiro precisa de dono certo. Tomai-a: em troca, guardai a vila como a guardaríeis.', give: { relic: 'elmo_cavaleiro' } },
      { boss: 'krol_chefe', text: 'Então o Chefe Tribal caiu. Vi muita bravura na fronteira, mas essa notícia me saiu o sorriso de uma década.' },
      { boss: ['demonio', 'arcano', 'general'], text: 'Derrotastes mais um dos grandes. Começo a pensar que esta terra, enfim, encontrou o guardião que a afligia nos sonhos.' },
      { playingPapa: true, text: 'Sucedestes Leão XI na cátedra... e ainda carregais aço? O Templo se curva diante de vós, Santidade — e eu me orgulho de ter chamado um Papa de "velho Gualter".' }
    ]
  },
  santa_ana: {
    stages: [
      { at: 2, text: 'Falar com alguém de fora, duas vezes seguidas... em tempos de fome, isso quase parece amizade. Quase.' },
      { at: 4, text: 'Os vizinhos dizem que sou uma língua solta. Mas para vós eu conto a verdade: a vila vive do pouco, e o pouco às vezes vem de mãos que tremem. Não me julgueis, andarilho; julgai a fome.', give: { hp: 10 } },
      { boss: ['demonio', 'arcano', 'general'], text: 'Dizem que os monstros dos confins começaram a recuar. Minhas crianças dormem mais sossegadas, e eu... eu voltei a ter esperança de colher sem susto.' },
      { playingPapa: true, text: 'A Santa Madre Igreja ajoelha-se para abençoar a minha mesa? Perdoai, Santidade... eu nem lavei o chão direito.' }
    ]
  },
  guarda_bira: {
    stages: [
      { at: 2, text: 'O ouvido da guarda já não se ilude com cara gentil. Mas vós tendes um jeito de andar que não pede esmola. Isso eu respeito.' },
      { at: 4, text: 'Estais começando a virar presença, andarilho. A vila tem donos maiores que a fome — e o meu posto é vigiar pra lá deles. Fico feliz em ter-vos ao lado, não atrás.' },
      { boss: 'krol_chefe', text: 'O Chefe Tribal... Cumprimentei sua cabeça numa lança? Não. Mas a vossa reputação, essa sim chegou antes de vós.', give: { hp: 25 } },
      { boss: ['demonio', 'arcano', 'general'], text: 'A fronteira respira aliviada, andarilho. Fique de guarda que eu fico feliz em partilhar o posto com quem dobra chefes.' },
      { playingPapa: true, text: 'PAPA? Santo Deus... e eu ralhei contigo sobre rondas de noite. Perdoai a ousadia, Santidade — mas vós caminhais como o vimos caminhar.' }
    ]
  },
  coroinha: {
    stages: [
      { at: 2, text: 'Você voltou! O coroinha Benjamim anotou tudo: você é mais alto que o coveiro e menos assustador que o monge. Anotei em letras de fogo.' },
      { at: 4, text: 'Segredo: o Pároco ensinou as orações certas, mas eu inventei uma que funciona melhor. Diz: "Senhor, guardai quem me defende a vila". Funciona, eu acho. Você é prova.' },
      { boss: ['demonio', 'arcano', 'general'], text: 'Contaram no sino! Todos os sinos! Você derrotou mais um monstro do fim do mundo e o céu não caiu. Eu sabia que a oração boa funcionava!' },
      { playingPapa: true, text: 'O PAPA em pessoa! O menino que acende as velas apanhava do PÁROCO? Agora és tu que abençoas a igreja inteira. É MUITO melhor que a minha oração!', give: { int: 2 } }
    ]
  },
  fazendeiro: {
    stages: [
      { at: 2, text: 'Segunda vez que pisa na roça, e o trigo já não estremece com a vossa sombra. Isso é bom sinal — o espantalho que anda odeia gente nova.' },
      { at: 4, text: 'Vinde comigo até o celeiro, longe dos ouvidos. A terra fala em língua de raiz e eu ando traduzindo errado. Vós, que enfrentais monstro, podeis me dizer o que a terra tem fome?' },
      { boss: 'krol_chefe', text: 'O Chefe que assombrava a mata... dizem que o nome dele agora se escreve em cabeça de lança. A roça agradece por cada passo em paz.', give: { gold: 120 } },
      { boss: ['demonio', 'arcano', 'general'], text: 'O medo está saindo do chão, andarilho. Devolvi o espantalho ao meio do trigo e dormi a noite toda em pé. Vós tendes culpa. Boa culpa.' },
      { playingPapa: true, text: 'PAPA aqui, no barro da minha roça? Santo campo... se o trigo soubesse, brotaria de joelhos.' }
    ]
  },
  roceira: {
    stages: [
      { at: 2, text: 'Tendes um jeito diferente de colher notícias. Mas a roça acaba colhendo quem espera, e eu espero pouco. Falai, andarilho.' },
      { at: 4, text: 'Voltastes. Poucos voltam a uma velha que só tem mentira bem contada. Então vos conto uma verdade: a fogueira de junho que acendem no fim do campo não é pra festa. É pra pedido. Eu sei o que pedem.' },
      { boss: ['demonio', 'arcano', 'general'], text: 'As fogueiras de junho arderam em silêncio esta estação. Alguém trouxe paz pro fim do campo... e eu quero acreditar que carrega o vosso nome.' },
      { playingPapa: true, text: 'Um Papa pisando a palha da minha roça... pois se o Papa vem, é porque até o céu decidiu trabalhar na terra.' }
    ]
  },
  peregrino: {
    stages: [
      { at: 2, text: 'O caminho me disse que vosso passo é de quem vai longe. Peregrino conhece peregrino por baixo da pele.' },
      { at: 4, text: 'Partilho convosco o que a estrada me ensina: há lugares que o peregrino não percorre a pé, mas de memória. A vossa memória está ficando grande, andarilho.' },
      { boss: 'krol_chefe', text: 'O Chefe Tribal derrotado... Deita a aurora, o peregrino caminha com menos medo do leste. Guardai esse caminho livre, e vos serei grato em cada passo.' },
      { boss: ['demonio', 'arcano', 'general'], text: 'Derrotastes outro dos grandes. O peregrino costuma dizer que o mundo se salva com passo a passo — vós salvastes em galopes.' },
      { playingPapa: true, text: 'A estrada hoje passa diante do próprio Papa... Curvo o bordão e ajoelho a cansaço. Bendito seja o caminho que trouxe vossa Santidade até aqui.' }
    ]
  },
  pescador: {
    stages: [
      { at: 2, text: 'Duas vezes na mesma beira? Os peixes daqui não confiam em novidade, mas aprenderam a olhar. Continuai: a rede é tecida de persistência.' },
      { at: 4, text: 'Senta aí. No pântano as luzinhas dançam porque sabem quem tá vivo diante delas. Com vós, elas bailam menos alto — pergunta o porquê. Eu não sei; sinto o anzol.' },
      { boss: ['demonio', 'arcano', 'general'], text: 'De noite as luzinhas do pântano baixaram de tom, como se o mal que as acendia estivesse ajoelhado. Pescador não acredita em milagre... mas começa a anotar o vosso.', give: { spd: 2 } },
      { playingPapa: true, text: 'Pescador diante do Papa... Pescador de homens? Não, Santidade, eu só fisgo o que o pântano recusa. Mas a vossa cana navega outros mares.' }
    ]
  },
  coveiro: {
    stages: [
      { at: 2, text: 'Vieram outra vez ao cemitério... de pé, desta vez. Coisa boa. Os mortos daqui gostam de quem não apressa a visita.' },
      { at: 4, text: 'Guardo segredos mais fundos que cova. O velho Zé dorme quietinho porque eu enterrei a culpa junto. Falar disso com alguém que olha sem julgar... me alivia a pá.' },
      { boss: ['demonio', 'arcano', 'general'], text: 'Os que mexiam os lençóis sossegaram. Escavador da noite como eu não dorme — mas esses dias, até aqui, tem um cheiro de paz nova.', give: { hp: 20 } },
      { playingPapa: true, text: 'O Papa benta até o meu cemitério? Então o céu aceita até cova cavada com pressa. Não sei rezar de verdade, Santidade — mas sei abrir caminho, e o meu está à vossa disposição.' }
    ]
  },
  velha_zefa: {
    stages: [
      { at: 2, text: 'A lua me disse que vosso nome brando nesta ladeira duas noites seguidas. A velha escuta o que o mundo esquece de dizer.' },
      { at: 4, text: 'Vos conto o que poucos sabem: os zumbis não são os mortos que voltam — são os vivos que se entregam antes da hora. Vós, que derrubais monstro, nunca se entregue. Eu vejo em vós a hora certa.' },
      { boss: ['demonio', 'arcano', 'general'], text: 'As estrelas alinharam e a lua baixou os olhos da cova. Os entregues pararam de se arrastar... A velha sabe quando o mundo vira: e virou pra vós.', give: { int: 2 } },
      { playingPapa: true, text: 'A lua contou certo, a velha viu e o Papa veio a pé por esta ladeira. Se eu não tenho dentes pra sorrir, sorrio com a memória. Bem-vindo, Santidade.' }
    ]
  },
  arqueologo: {
    stages: [
      { at: 2, text: 'Voltastes às ruínas — o pó reconhece quem o visita sem temê-lo. Dante é bom com paredes; estais começando a me parecer boa companhia pra elas.' },
      { at: 4, text: 'Encontrei algo que guardava pra pessoa certa: um fragmento de piso com glifos que contam a queda da cidade. Partilho o achado convosco — a história completa-se com testemunhas, não com pedras.', give: { relic: 'coroa_arcana', gold: 80 } },
      { boss: ['demonio', 'arcano', 'general'], text: 'As ruínas sussurram menos agora. Como se o próprio templo acalmasse os escombros quando derrubam os que o profanaram. Excelente achado, o vosso!' },
      { playingPapa: true, text: 'Um Papa detetive de ruínas? A história nunca registrou tamanho achado. Devo datar esta visita, Santidade.' }
    ]
  },
  vidente: {
    stages: [
      { at: 2, text: 'O véu ondula de formas novas quando vós vos aproximais. Não é medo. É curiosidade — e o véu quase nunca se interessa por alguém.' },
      { at: 4, text: 'Senti o peso do vosso caminho: carregais mais de uma vida por escolha própria. O véu me mostra escolhas, não destinos. Tendes feito as escolhas certas, e isso, no véu, é histórico.', give: { int: 3 } },
      { boss: 'arcano', text: 'O Devorador caiu — o próprio véu se fez silêncio para aplaudir. Mastema perdeu a língua que mastigava o saber. Raro, raríssimo, o que fizestes.' },
      { boss: ['demonio', 'general'], text: 'O véu não conta fofoca, mas confirma milagre: abristes caminho onde até a noite tinha medo.' },
      { playingPapa: true, text: 'O Papa que lê o véu? Os círculos vão se perguntar por séculos. O véu vos saúda, Santidade — e eu também.' }
    ]
  },
  mineiro: {
    stages: [
      { at: 2, text: 'Voltou ao minério? A rocha aqui respeita constância. Veio buscar ouro duas vezes: ou é otário, ou é aventureiro. Rocha não sabe mentir.' },
      { at: 4, text: 'Partilho um segredo da serra: há um veio antigo que canta em dia de lua cheia. Não é ouro — é promessa. Por isso ninguém cavou fundo. Com vós, talvez eu acorde o canto.', give: { gold: 200 } },
      { boss: ['demonio', 'arcano', 'general'], text: 'A serra diz que o gigante que dormia acordou... pra prestar revezar pra vós? Não. A serra disse que dormiu em paz. Foi bom ouvi-la descansada.' },
      { playingPapa: true, text: 'A serra nunca viu Papa. Nem ouro. Agora viu os dois: o Papa e o meu suor. Posso dizer que minerei com autorização celestial.' }
    ]
  },
  sabio: {
    stages: [
      { at: 2, text: 'Vossos olhos guardam a mesma pergunta das gárgulas: o que se perdeu aqui? Sábio guarda perguntas, não respostas. Voltaste bem.' },
      { at: 4, text: 'Recordo-me de textos que descreviam um caminhante como vós — de fé incerta e passo firme. A inscrição dizia: "aquele que o templo reconhece sem altar". Eu não entendia. Agora leio-vos e entendo.' },
      { boss: ['demonio', 'arcano', 'general'], text: 'As gárgulas finalmente reconheceram alguém: deixaram o pó saudar-vos. Nesta biblioteca de ruínas, tendes agora nome gravado.', give: { relic: 'coroa_arcana', int: 2 } },
      { playingPapa: true, text: 'A profecia era mais ampla do que eu lia: não um caminhante — um PAPA entre as colunas. Os pergaminhos nunca se cansam de me surpreender.' }
    ]
  },
  veterano_fronteira: {
    stages: [
      { at: 2, text: 'De novo no forte, andarilho. A fronteira não dá medalha pra visita; dá rédea. Mas deu-vos uma segunda chance de provar o aço.' },
      { at: 4, text: 'Falei mal de muitos; a fronteira ensina isso. Com vós, fiz a exceção de me calar pra ouvir. Soldado que ouve, anda menos enganado. Continua.' },
      { boss: 'general', text: 'O General caiu! O que vendeu a alma por pólvora e ferro... a fronteira acende vela no seu próprio nome. Sargento Baldo vos deve a noite em paz.', give: { str: 3 } },
      { boss: ['demonio', 'arcano'], text: 'Derrotastes outros tiranos, não só o daqui. O forte passou a falar de vós como a lenda que segura o norte. E eu, que duvidei, só emendo: continua assim.' },
      { playingPapa: true, text: 'O Papa em pessoa tirou o chapéu diante de mim? A fronteira inteira vai dizer que fui eu que marquei serviço com a Santidade. Vou repetir essa história até o dia em que for verdade.' }
    ]
  },
  soldado_desertor: {
    stages: [
      { at: 2, text: 'Sabe o que é ser chamado de desertor? É pagar por ter visto demais. Voltaste pra me ouvir de novo — deve ser porque dos que fogem, eu sou o que ficou lembrado.' },
      { at: 4, text: 'Ninguém volta pra ouvir desertor duas vezes — ou vós colecionais histórias tristes, ou tendes a coragem que me faltou no portão. Anoto: a segunda.' },
      { boss: 'general', text: 'O General... esse nome agora dorme no barro que ele fez pagar em pólvora. Aquele que desertou pode, enfim, dizer à sombra: acabou. Obrigado.', give: { hp: 30 } },
      { boss: ['demonio', 'arcano'], text: 'Fora da fronteira também tendes pendências com tiranos? Então somos dois fugitivos — só que vós fugis pra frente.' },
      { playingPapa: true, text: 'Um Papa me chama de irmão? Juro que vi o general em desgraça na noite passada... Agora um Papa me dá moral. O dia dos desertores chegou, Santidade.' }
    ]
  },
  devoto_trevas: {
    stages: [
      { at: 2, text: 'Voltaste à cova escura mesmo sabendo do que eu sou. Ou és tolo, ou és o que a luz espera. Não sei qual dos dois me assusta mais.' },
      { at: 4, text: 'Mastema me levou à eternidade e me devolveu comício de sombra. Eu escutei o que ele promete. Agora escuto vós, e as sombras ao redor... recuam. Seguram a respiração. Como se tivessem medo.' },
      { boss: ['demonio', 'arcano', 'general'], text: 'Os grandes caíram — até o próprio Mastema viu o trono tremer. O Devoto das Trevas começou, enfim, a rezar uma oração de graças. Vós a merecestes.', give: { int: 2 } },
      { playingPapa: true, text: 'Aquilo que jurou cair à noite... testemunha o PAPA de pé neste chão. Mastema, se me ouves, guarda para ti: a luz veio pessoalmente. Eu me curvo, Santidade.' }
    ]
  },

  // --- Serviços da vila: a confiança cresce com as visitas e as batalhas. ---
  ferreiro: {
    stages: [
      { at: 2, text: 'Outro serviço na bigorna? Fala aí — mas já vai sabendo que o ferro aqui reconhece quem bate o pé.' },
      { at: 4, text: 'A bigorna guardou o ponto da tua pegada. Poucas entram na oficina e saem com mais que pedido — vós saístes com respeito.' },
      { at: 7, text: 'Dizem que vós limpais chefes como eu limpo rebarba. Pois o metal desta oficina passa a ser o teu. Melhor preço pra um amigo.' },
      { boss: ['demonio', 'arcano', 'general'], text: 'Espadas que eu forjei foram descansar lá no fim do mundo... pois quem limpou os grandes, é meu freguês. A casa é tua.' },
      { playingPapa: true, text: 'O PAPA usa peça minha? Glória dupla: a alma do ferr e o orgulho da forja. Não cobro a Santidade — o céu me paga em brasa.' }
    ]
  },
  vendedor: {
    stages: [
      { at: 2, text: 'Voltou ao balcão? Mercador que pergunta igual duas vezes acaba descobrindo o preço da constância.' },
      { at: 4, text: 'Já não te ofereço o preço do desconhecido, andarilho — o teu freguês fiel tem balcão de amigo.' },
      { at: 7, text: 'Aos fregueses de verdade a casa mostra o porão. Vinde às avessas que eu acendo a lâmpada do estoque antigo.' },
      { boss: ['demonio', 'arcano', 'general'], text: 'Quando os grandes caíram, minhas mercadorias subiram de preço na outra vila... mas a convosco o frete se paga em glória. Desconto de lenda.' },
      { playingPapa: true, text: 'O Papa em pessoa ao balcão! Fecho a loja e abro o altar: é tudo de graça pra Santidade... mentira, mas o desconto é real.' }
    ]
  },
  mestre: {
    stages: [
      { at: 2, text: 'Que arte buscais agora, aprendiz? A segunda lição do Mestre é que o pupilo constante se torna a prova viva do mestre.' },
      { at: 4, text: 'A disciplina que vos vejo na lâmina... o Mestre já não depende de vós para ensinar: depende de vós para honrar a escola.' },
      { at: 7, text: 'Ensinar quem supera o mestre é a melhor aula que se dá e a que mais custa. Prossigamos: o vosso avanço é a minha obra-prima.' },
      { boss: ['demonio', 'arcano', 'general'], text: 'Vossos golpes derrubaram daqueles que não se ensinam — só se enfrentam. O Mestre vos nomeia digno das lições proibidas.' },
      { playingPapa: true, text: 'Um Papa a estudar com o Mestre das Artes... a cadeira de Pedro acaba de franquear-me um coerente mais famoso que todas as escolas.' }
    ]
  },
  paroco: {
    stages: [
      { at: 3, text: 'Volta à paróquia, filho. A igreja de Ambrósio guarda um banco vago pra cada fiel que retorna pela fé — e agora tendes o vosso.' },
      { at: 5, text: 'A cada passo vosso a paróquia fica menos com um visitante e mais com um obreiro da luz. Folgo em vos chamar meu irmão.' },
      { boss: ['demonio', 'arcano', 'general'], text: 'Os sinais que prevíamos tombaram os grandes... e a vila acendeu missa de ação de graças em vosso nome. Que Deus vos guarde, filho.' },
      { playingPapa: true, text: 'A paróquia inteira se inclina diante de vós, Santidade — do sacristão ao velho banco da segunda fileira, onde eu, Ambrósio, reservo a vossa cadeira.' }
    ]
  },
  bispo_central: {
    stages: [
      { at: 3, text: 'Retornastes à Casa de Deus, filho. A diocese regozija-se com uma ovelha que conhece o caminho de volta sem que a pastora a chame.' },
      { at: 5, text: 'O Senhor espalha sua obra por muitas mãos; vós sois a mão que a diocese escolhe para os arredores. Bendita a vossa constância, filho.' },
      { at: 7, text: 'Falai comigo com a franqueza dos amigos. A mitra escuta, mas o homem Cedric ouve: a vós, a Igreja deve mais que um conforto — deve uma missão.' },
      { boss: ['demonio', 'arcano', 'general'], text: 'As notícias da fronteira chegaram à cátedra: a diocese ajoelha em ação de graças pela vossa bravura, filho. Vossas vitórias são a nossa liturgia.' },
      { playingPapa: true, text: 'A filial ajoelha diante do Sumo Pontífice. Bispo Cedric vos saúda, Santidade, e vos oferece esta cátedra menor como vosso descanso.' }
    ]
  },
  taberneiro: {
    stages: [
      { at: 2, text: 'Voltou à tasca? Aqui se senta quem tem estória pra contar — e os copos já reconhecem o vosso assento.' },
      { at: 4, text: 'Aos fregueses que me pagam em boa companhia, a casa serve a melhor garrafa do porão. Continuai contando que a taberna escuta.' },
      { at: 7, text: 'Por esta porta já passaram lendas de passagem... mas vós sentastes e ficastes. Na tasca, isso se chama família. Gaste à vontade.' },
      { boss: ['demonio', 'arcano', 'general'], text: 'Dizem que as estórias dos grandes viraram estórias dos que os caçam. E a melhor estória que eu conheço hoje está sentada no meu banco.' },
      { playingPapa: true, text: 'O PAPA na tasca! A casa inteira passa a noite jurando a missa de amanhã — mas hoje, Santidade, o vinho é na casa da casa.' }
    ]
  },
  erudito: {
    stages: [
      { at: 2, text: 'A torre recebe-vos de novo? Curioso. O saber costuma ser uma porta, mas vós a atravessais com o passo de quem estuda o vão.' },
      { at: 4, text: 'Registro-vos no caderno dos persistentes: poucos voltam às prateleiras para conferir se o conhecimento envelheceu. Vós conferis. Admirável.' },
      { at: 7, text: 'A joia do Arquivo é lida em voz alta diante de vós: o segredo do Graal. Tomas: assentai. O saber digno guarda os velhos amigos.' },
      { boss: ['demonio', 'arcano', 'general'], text: 'Os arquivos da torre têm poucos heróis no pôster... doravante, terão um filete dedicado aos vossos feitos, com nota de rodapé: "ainda vivo".' },
      { playingPapa: true, text: 'O próprio Papa na torre... Devo datilografar essa visita nos mares. E, santamente, oferecer a prateleira mais alta: mereceis o teto.' }
    ]
  },
  comandante: {
    stages: [
      { at: 2, text: 'A guilda reconhece a constância, andarilho: a segunda fila é onde os votos começam a valer.' },
      { at: 4, text: 'Roderigo investiga a vossa reputação — e ela sangra mais longe que as nossas fronteiras. Digno do brasão, se continuardes.' },
      { at: 7, text: 'Falou comigo em pé de igualdade e eu vos ofereci assento: fostes batizado em combate, não em cerimônia. A guilda honra quem honra o aço.' },
      { boss: 'general', text: 'O General... o vosso nome agora desfila nas crônicas da fronteira, Roderigo inclina a cabeça e, pela primeira vez, um soldo de respeito.' },
      { boss: ['demonio', 'arcano'], text: 'Derrotastes tiranos fora do nosso mapa — a guilda abre registo de lenda viva e vos concede o posto de braço-direito da fronteira.' },
      { playingPapa: true, text: 'O Papa desce ao pátio da guilda? Comandante Roderigo dobra o joelho e oferece a espada. Se o céu vos enviou, a guilda vos segue.' }
    ]
  },
  guia: {
    stages: [
      { at: 3, text: 'O Cronista anota: vós perseguis fragmentos com mais fome que os outros errantes. Guardai — o mundo dá suas páginas a quem as procura.' },
      { at: 5, text: 'Vossos feitos marcados no pergaminho, errante. A crônica desta terra ganha um capítulo de cada vez com o vosso nome.' },
      { boss: 'krol_chefe', text: 'O Chefe Tribal tomba e a crônica ganha sua primera subdivisão: "Os feitos de..." — o espaço do vosso nome está reservado.' },
      { boss: 'gere_osso', text: 'O Rei da Noite caiu. O Cronista emenda a palavra "Herói" pela primeira vez no caso dativo.' },
      { boss: ['demonio', 'arcano', 'general'], text: 'As crônicas, que se escrevem devagar, adiantaram o relógio. O mundo já não espera a história: acompanha-a, atrás do vosso passo.' },
      { playingPapa: true, text: 'O Cronista fecha a pena: um Papa errante é página que nenhum augúrio previra. Desta vez, o cronista inconscientemente ajoelha.' }
    ]
  }
};

// Rótulo do nível de relação, a partir de quantas conversas o NPC teve.
export function relationLabel(npc) {
  const t = npc.talks || 0;
  if (!npc.met) return 'Desconhecido';
  if (t < 2) return 'Primeiro encontro';
  if (t < 4) return 'Conhecimento';
  if (t < 7) return 'Confiança';
  return 'Confidente';
}

// Confere se um estágio cumpre todas as condições no estado atual do jogo.
function passStage(st, npc, g) {
  const p = g.player;
  const rec = (g.loadRecords ? g.loadRecords() : {}) || {};
  if (st.at && (npc.talks || 0) < st.at) return false;
  if (st.lvl && (g.progressLevel || 0) < st.lvl) return false;
  if (st.casta && p.sub.casta !== st.casta) return false;
  if (st.sub && p.sub.id !== st.sub) return false;
  if (st.playingPapa && p.sub.id !== 'papa') return false;
  if (st.popeBought && !rec.popeUnlocked) return false;
  if (st.boss != null) {
    if (typeof st.boss === 'number') {
      if ((g.stats.bosses || 0) < st.boss) return false;
    } else if (Array.isArray(st.boss)) {
      if (!st.boss.some(id => g.defeatedBosses[id])) return false;
    } else if (!g.defeatedBosses[st.boss]) {
      return false;
    }
  }
  return true;
}

// Último estágio satisfeito para o NPC no estado atual (ou null).
export function stageFor(npc, g) {
  const def = RELATIONS[npc.id];
  if (!def || !def.stages) return null;
  let last = null;
  for (const st of def.stages) if (passStage(st, npc, g)) last = st;
  return last;
}

// Todos os estágios satisfeitos no estado atual — usado para conceder as
// recompensas únicas de cada marco alcançado.
export function currentStages(npc, g) {
  const def = RELATIONS[npc.id];
  if (!def || !def.stages) return [];
  return def.stages.filter(st => passStage(st, npc, g));
}

// Texto do estágio respeitando a reação à casta quando o NPC escreveu uma por
// casta. Retorna '' se não houver texto utilizável.
export function stageText(stage, casta) {
  if (!stage) return '';
  if (typeof stage.text === 'string') return stage.text;
  if (stage.text && stage.text[casta]) return stage.text[casta];
  return '';
}

// Fala de abertura dos estabelecimentos (ferreiro, vendedor, igrejas, taberna,
// torre, guilda, cronista): uma linha que evolui com a confiança e as batalhas.
export function greetingFor(npc, g) {
  const def = RELATIONS[npc.id];
  if (!def || npc.kind === 'talk') return '';
  const stage = stageFor(npc, g);
  const casta = g.player ? g.player.sub.casta : null;
  return stageText(stage, casta);
}