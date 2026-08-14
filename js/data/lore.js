// --- Lore por casta ---
// As três categorias se relacionam com o sobrenatural de formas distintas:
// o Clero recebe por vocação e autoridade; o Templário recebe pela fé de leigo;
// o Mago adquire pelo conhecimento pagão.
export const LORE = {
  clero: [
    { id: 'chamado', title: 'O Chamado', text: 'Uma voz ao amanhecer disse: "Anda, as almas desta terra temem. Vai e acolhe-as." O Senhor vos envia a Eclésia para consolar e conduzir.' },
    { id: 'autoridade', title: 'Autoridade e Sacramento', text: 'O poder do Clero não vem do aço nem do saber: vem da vocação e da autoridade que a Igreja confere. Batizar, exorcizar, celebrar a Eucaristia, perdoar — o sacerdócio pertence aos ordenados. Nenhum leigo, por mais valoroso, administra os sacramentos.' },
    { id: 'heresia', title: 'O Saber Pagão é Heresia', text: 'Estudar um grimório pagão não é busca por conhecimento: é heresia. O clero que procura poder em fontes estranhas à fé trai a vocação e mancha a Igreja. O saber sobrenatural dos pagãos e a luz do Senhor não se misturam.' },
    { id: 'confissao', title: 'O Peso das Confissões', text: 'Cada confissão ouvida é uma alma que se deixa guiar. Vossa fé vos fortalece — e a elas traz paz.' },
    { id: 'travessia', title: 'A Travessia', text: 'Três pilares guardam o caminho: o Chefe Tribal, o Rei da Noite e o Guardião do Execra. Derrotai-os e o altar do Demônio se abrirá.' },
    { id: 'promessa', title: 'A Promessa', text: 'No leste, um selo profano esconde o altar de Mastema. Fechai-o para sempre e guiai as almas do Senhor a Ele.' },
    { id: 'servico', title: 'O Servo fiel', text: 'O Diácono que serve sem buscar glória é o coração da Igreja. Quem alimenta o pobre, visita o enfermo e batiza com humor guarda o tesouro do Céu.' }
  ],
  templarios: [
    { id: 'leigos', title: 'Leigos do Templo', text: 'Os Templários não são clero: são leigos. O povo deposita neles esperança e confiança, pois são eles que enfrentam o perigo de corpo e aço. Rezam, recebem bênçãos e buscam força na fé — mas não administram os sacramentos. Não sois um padre com espada; sois o braço que protege a comunidade.' },
    { id: 'fe', title: 'A Força da Fé', text: 'Elias e Sansão não eram sacerdotes — eram homens de fé a quem a graça dava força descomunal. A vossa força também nasce da fé, da disciplina, da oração e das bênçãos que recebeis de joelhos. Fé de leigo, força de gigante.' },
    { id: 'fronteira', title: 'A Fronteira', text: 'O Templo de Eclésia vela sobre a fronteira. As bestas e bandos açoitam as aldeias — espadas, flechas e engenho dos templários são a sua guarda.' },
    { id: 'guarnicao', title: 'As Guarnições', text: 'Dizem que as ruínas guardam aço sagrado. Um cavaleiro que se arma com fé e aço é um cavaleiro que resiste.' },
    { id: 'forte', title: 'O Forte', text: 'Ao sul-leste, um General rebelde ergue um forte para escravizar as aldeias. Enquanto ele viver, a fronteira sangra.' },
    { id: 'chama', title: 'A Cruz do Templo', text: 'O General caiu. A cruz do Templo ascende sobre a fronteira — e ela, enfim, respira.' }
  ],
  mago: [
    { id: 'pagao', title: 'A Tradição Pagã', text: 'Os Magos são pagãos. Seu poder nasce de conhecimentos e práticas sobrenaturais alheias à Igreja — grimórios, mestres, segredos arcanos. Isso não faz de todos os magos malvados, mas sua fonte de poder é incompatível com a doutrina: onde o clero recebe por vocação, o mago adquire por estudo; onde o templário reza, o mago invoca.' },
    { id: 'veo', title: 'O Véu Rasgado', text: 'Existe arcano antes do tempo. Os sabidos dizem que algo, no norte, desfiou o véu que separa o mundo e a eternidade.' },
    { id: 'cantos', title: 'Os Cantos Esquecidos', text: 'Nas ruínas há glifos que preservam o saber. Ler é lembrar — e lembrar é poder.' },
    { id: 'torre', title: 'A Torre Perdida', text: 'Uma torre erguia-se onde o arcano era mais denso. Hoje ela é um grito: algo dentro devora a força das palavras.' },
    { id: 'arcaico', title: 'O Arcano Devorador', text: 'Mastema tolheu até o arcano e criou o Devorador. Enquanto ele viver, todo saber será corrompido.' }
  ]
};

// Habilitação de lore por casta ao entrar em zonas especiais
export const LORE_ZONE = {
  clero: [['sagrado', 'chamado'], ['sagrado', 'servico'], ['cova', 'promessa']],
  templarios: [['forte', 'forte']],
  mago: [['torre', 'torre']]
};

// Passagens bíblicas para leituras aleatórias no clero
export const BIBLIA_PASSAGENS = {
  clero: [
    '"O Senhor é o meu pastor; nada me faltarei." - Salmo 23:1',
    '"Eu vim para que tenham vida, e a tenham em abundância." - João 10:10',
    '"Acredita em mim, e serás salvo." - Atos 16:31',
    '"A graça do nosso Senhor Jesus Cristo, o amor de Deus e a comunhão do Espírito Santo esteja com todos vós." - 2 Coríntios 13:14',
    '"Louvo-Te, Senhor, de todo o coração; narro todas as Tuas maravilhas." - Salmo 9:1',
    '"Sejam bondosos e compassivos uns para com os outros, perdoando-vos como também Deus vos perdoou em Cristo." - Efésios 4:32',
    '"Posso tudo naquele que me fortalece." - Filipenses 4:13',
    '"O Senhor está próximo de todos os que O invocam, de todos os que O invocam com sinceridade." - Salmo 145:18'
  ],
  templarios: [
    '"Vai, e faze o mesmo." - Lucas 10:37',
    '"Vigiai, pois, porque não sabeis o dia nem a hora." - Mateus 25:13',
    '"Bem-aventurados os que têm fome e sede de justiça." - Mateus 5:6',
    '"A minha força está no Senhor." - Salmo 28:7',
    '"Sê forte e corajoso; não temas." - Josué 1:9',
    '"Ninguém tem maior amor do que este: de dar a própria vida pelos seus amigos." - João 15:13'
  ],
  mago: [
    '"O conhecimento é o caminho da sabedoria." - Provérbios 4:7',
    '"A ciência infla, mas o amor edifica." - 1 Coríntios 8:1',
    '"Buscai primeiro o Reino de Deus e a sua justiça." - Mateus 6:33',
    '"A começar das entranhas do homem, vêm os pensamentos maus." - Mateus 15:19',
    '"Quantas vezes perdoará meu irmão? Até sete vezes? Disse-lhe Jesus: Até setenta vezes sete." - Mateus 18:21-22',
    '"A palavra do Senhor é como fogo, como martelo que parte a rocha." - Jeremias 23:29'
  ]
};