import type { ClasseMoba, DefHeroiMoba, DefSkillMoba, TipoHabilidadeMoba } from './tipos';

type Skill = [
  nome: string,
  tipo: TipoHabilidadeMoba,
  dano: number,
  alcance: number,
  raio: number,
  duracao?: number,
  quantidade?: number,
];
const bases: Record<ClasseMoba, [number, number, number, number, number, number]> = {
  tanque: [1250, 390, 58, 2.4, 4.4, 32],
  lutador: [1030, 410, 73, 2.7, 4.9, 23],
  assassino: [790, 420, 79, 2.5, 5.9, 14],
  mago: [760, 650, 51, 8.4, 4.7, 12],
  atirador: [780, 430, 70, 9.2, 4.9, 13],
  suporte: [880, 610, 49, 7.2, 4.8, 19],
};

function definir(
  id: string,
  nome: string,
  titulo: string,
  classe: ClasseMoba,
  forma: string,
  cor: string,
  cor2: string,
  descricao: string,
  passiva: DefHeroiMoba['passiva'],
  skills: [Skill, Skill, Skill, Skill]
): DefHeroiMoba {
  const [vida, mana, dano, alcance, velocidade, armadura] = bases[classe];
  const teclas = ['q', 'w', 'e', 'r'];
  const habilidades = skills.map(
    ([nomeSkill, tipo, poder, distancia, raio, duracao = 1, quantidade = 1], i): DefSkillMoba => ({
      id: `${id}-${teclas[i]}`,
      nome: nomeSkill,
      tipo,
      dano: poder,
      alcance: distancia,
      raio,
      duracao,
      quantidade,
      custo: i === 3 ? 95 : [42, 55, 48][i],
      recarga: i === 3 ? 38 : [6, 10, 12][i],
      cor: i % 2 ? cor2 : cor,
      descricao: explicar(tipo, nomeSkill, poder, duracao, quantidade),
    })
  ) as DefHeroiMoba['habilidades'];
  return {
    id,
    nome,
    titulo,
    classe,
    forma,
    cor,
    cor2,
    descricao,
    vida,
    mana,
    dano,
    alcance,
    velocidade,
    armadura,
    passiva,
    habilidades,
  };
}
function explicar(
  tipo: TipoHabilidadeMoba,
  nome: string,
  dano: number,
  duracao: number,
  quantidade: number
): string {
  const acoes: Record<TipoHabilidadeMoba, string> = {
    projetil: `Lança ${quantidade > 1 ? `${quantidade} projéteis` : 'um projétil'} e causa ${dano} de dano`,
    linha: `Atravessa uma linha de inimigos causando ${dano} de dano`,
    cone: `Atinge um leque à frente por ${dano} de dano`,
    area: `Explode uma área causando ${dano} de dano`,
    cura: `Restaura ${dano} de vida aos aliados próximos`,
    escudo: `Concede ${dano} de escudo durante ${duracao}s`,
    salto: `Salta até o alvo e causa ${dano} de dano ao chegar`,
    puxao: `Puxa o primeiro inimigo atingido e causa ${dano} de dano`,
    invocar: `Invoca ${quantidade} ajudante${quantidade > 1 ? 's' : ''} durante ${duracao}s`,
    raiz: `Prende inimigos por ${duracao}s e causa ${dano} de dano`,
    orbita: `Cria ${quantidade} orbes próximos durante ${duracao}s`,
    canal: `Canaliza uma zona de ${dano} de dano durante ${duracao}s`,
    veneno: `Aplica ${dano} de dano periódico durante ${duracao}s`,
    troca: `Troca de posição com o alvo e causa ${dano} de dano`,
  };
  return `${nome}: ${acoes[tipo]}.`;
}

/** Os kits compartilham regras legíveis, mas cada combinação de quatro ações é própria. */
export const HEROIS_MOBA: DefHeroiMoba[] = [
  definir(
    'brasa',
    'Brasa',
    'A Raposa do Lampião',
    'mago',
    'raposa',
    '#ff7c38',
    '#ffe78b',
    'Raposa exploradora que carrega uma lanterna de estrelas.',
    {
      nome: 'Fagulha curiosa',
      tipo: 'mana',
      descricao: 'Recupera mana continuamente para manter suas luzes acesas.',
    },
    [
      ['Fagulha viajante', 'projetil', 108, 13, 0.6],
      ['Rastro de brasas', 'linha', 94, 10, 1.1],
      ['Salto do lampião', 'salto', 66, 5, 2],
      ['Festival das lanternas', 'orbita', 65, 6, 4.2, 6, 5],
    ]
  ),
  definir(
    'mimi',
    'Mimi',
    'A Gata das Sombras',
    'assassino',
    'gato',
    '#aa85ee',
    '#ffbadc',
    'Gatinha mascarada que desaparece entre fitas de luar.',
    {
      nome: 'Nove oportunidades',
      tipo: 'vampirismo',
      descricao: 'Os ataques recuperam uma pequena parte da vida perdida.',
    },
    [
      ['Garra crescente', 'cone', 126, 4, 3],
      ['Passo de veludo', 'salto', 88, 7, 1.5],
      ['Novelo traiçoeiro', 'raiz', 66, 9, 1.4, 1.3],
      ['Troca de luar', 'troca', 280, 9, 2],
    ]
  ),
  definir(
    'pip',
    'Pip',
    'O Dragão de Bolso',
    'lutador',
    'dragao',
    '#53d4a1',
    '#ffd873',
    'Pequeno dragão de óculos de aviador e coragem enorme.',
    {
      nome: 'Escamas quentinhas',
      tipo: 'armadura',
      descricao: 'As escamas aumentam sua resistência a ataques.',
    },
    [
      ['Espirro flamejante', 'cone', 115, 5, 3],
      ['Asas de coragem', 'salto', 90, 6, 2.5],
      ['Escama brilhante', 'escudo', 160, 0, 0, 4],
      ['Cometa de bolso', 'area', 300, 9, 4],
    ]
  ),
  definir(
    'aura',
    'Aura',
    'A Coruja dos Cometas',
    'mago',
    'coruja',
    '#7585eb',
    '#f9edb1',
    'Astrônoma alada que escreve constelações com sua pena.',
    { nome: 'Atlas celeste', tipo: 'mana', descricao: 'Os mapas estelares restauram sua mana.' },
    [
      ['Pena cadente', 'linha', 112, 14, 0.9],
      ['Mapa gravitacional', 'puxao', 78, 10, 1.4],
      ['Ninho astral', 'escudo', 145, 0, 0, 4],
      ['Chuva de cometas', 'canal', 85, 12, 4.5, 4],
    ]
  ),
  definir(
    'luma',
    'Luma',
    'A Axolote das Marés',
    'suporte',
    'axolote',
    '#ff9fc6',
    '#80e9ee',
    'Guardiã de lagoa com guelras de coral e bolsa de conchas.',
    {
      nome: 'Água renovadora',
      tipo: 'regeneracao',
      descricao: 'Sua pele aquática recupera vida ao longo do tempo.',
    },
    [
      ['Bolha de carinho', 'cura', 115, 7, 3],
      ['Laço de coral', 'raiz', 60, 10, 2, 1.5],
      ['Maré protetora', 'escudo', 175, 0, 0, 4],
      ['Lagoa dos sonhos', 'area', 220, 10, 5],
    ]
  ),
  definir(
    'casco',
    'Casco',
    'O Jardim Ambulante',
    'tanque',
    'tartaruga',
    '#77bb72',
    '#f5c568',
    'Tartaruga jardineira com uma pequena árvore no casco.',
    {
      nome: 'Casco ancestral',
      tipo: 'armadura',
      descricao: 'O casco reforçado absorve parte dos ataques recebidos.',
    },
    [
      ['Raiz teimosa', 'raiz', 85, 8, 2, 1.6],
      ['Jardim seguro', 'escudo', 220, 0, 0, 5],
      ['Semente guardiã', 'invocar', 35, 6, 1, 10, 2],
      ['Abraço da floresta', 'puxao', 230, 9, 3],
    ]
  ),
  definir(
    'bambu',
    'Bambu',
    'O Panda do Tambor',
    'tanque',
    'panda',
    '#f2f1e4',
    '#59bda3',
    'Panda percussionista que protege sua banda com um tambor.',
    {
      nome: 'Ritmo tranquilo',
      tipo: 'regeneracao',
      descricao: 'Respirar no ritmo do tambor restaura vida.',
    },
    [
      ['Batida redonda', 'area', 95, 4, 3],
      ['Compasso firme', 'escudo', 240, 0, 0, 4],
      ['Rufar de bambu', 'cone', 80, 5, 3],
      ['Grande bumbo', 'salto', 250, 8, 4],
    ]
  ),
  definir(
    'eco',
    'Eco',
    'O Morcego Mensageiro',
    'assassino',
    'morcego',
    '#7764b7',
    '#ffa1a7',
    'Morcego de cachecol que navega pelo som de pequenos sinos.',
    {
      nome: 'Frequência viva',
      tipo: 'celeridade',
      descricao: 'O sonar aumenta sua agilidade de combate.',
    },
    [
      ['Sino supersônico', 'projetil', 120, 12, 0.7],
      ['Voo rasante', 'linha', 100, 9, 1.5],
      ['Véu noturno', 'escudo', 135, 0, 0, 3],
      ['Enxame de ecos', 'invocar', 50, 8, 1, 8, 3],
    ]
  ),
  definir(
    'pom',
    'Pom',
    'A Coelha Relâmpago',
    'atirador',
    'coelho',
    '#faf0d6',
    '#ff957a',
    'Mensageira com mochila de cenouras e um estilingue enorme.',
    {
      nome: 'Mira de cenoura',
      tipo: 'critico',
      descricao: 'Alguns ataques acertam pontos fracos e causam dano extra.',
    },
    [
      ['Cenoura foguete', 'projetil', 115, 14, 0.55],
      ['Dispersão da horta', 'cone', 95, 8, 3],
      ['Pulo ligeiro', 'salto', 55, 6, 1.3],
      ['Colheita explosiva', 'area', 285, 13, 3.8],
    ]
  ),
  definir(
    'brejo',
    'Brejo',
    'O Sapo Alquimista',
    'mago',
    'sapo',
    '#8ed46f',
    '#ce97ef',
    'Sapo de chapéu torto que prepara poções em um caldeirão.',
    {
      nome: 'Mistura borbulhante',
      tipo: 'mana',
      descricao: 'Suas poções restauram energia mágica.',
    },
    [
      ['Frasco pegajoso', 'veneno', 28, 11, 2, 5],
      ['Língua elástica', 'puxao', 95, 9, 1],
      ['Caldo revigorante', 'cura', 100, 5, 2.5],
      ['Caldeirão transbordante', 'canal', 75, 10, 4, 5],
    ]
  ),
  definir(
    'espeto',
    'Espeto',
    'O Ouriço Cavaleiro',
    'tanque',
    'ourico',
    '#b98b6c',
    '#80caed',
    'Cavaleiro minúsculo com capacete de panela e escudo azul.',
    {
      nome: 'Espinhos de aço',
      tipo: 'armadura',
      descricao: 'Os espinhos rígidos aumentam a defesa.',
    },
    [
      ['Espinhos ao vento', 'cone', 95, 5, 2.8],
      ['Bola blindada', 'salto', 110, 6, 2.2],
      ['Panela impenetrável', 'escudo', 250, 0, 0, 5],
      ['Círculo de espinhos', 'orbita', 55, 5, 3.6, 6, 6],
    ]
  ),
  definir(
    'galho',
    'Galho',
    'O Cervo das Sementes',
    'suporte',
    'cervo',
    '#dba878',
    '#9ee2a4',
    'Cervo de chifres floridos que semeia caminhos seguros.',
    {
      nome: 'Seiva generosa',
      tipo: 'regeneracao',
      descricao: 'A energia das árvores restaura sua vida.',
    },
    [
      ['Flor de abrigo', 'cura', 125, 8, 3.5],
      ['Cipó gentil', 'linha', 85, 11, 1.3],
      ['Brotos companheiros', 'invocar', 35, 7, 1, 12, 2],
      ['Primavera súbita', 'raiz', 195, 10, 4.5, 2.4],
    ]
  ),
  definir(
    'floe',
    'Floe',
    'O Pinguim do Granizo',
    'atirador',
    'pinguim',
    '#6585ad',
    '#9ef0f2',
    'Pinguim patinador com um canhão de bolas de neve.',
    {
      nome: 'Patins afiados',
      tipo: 'celeridade',
      descricao: 'O gelo sob seus pés aumenta sua agilidade.',
    },
    [
      ['Bola de neve', 'projetil', 125, 14, 0.7],
      ['Trilho gelado', 'linha', 90, 12, 1.3],
      ['Iglu portátil', 'escudo', 130, 0, 0, 4],
      ['Avalanche de bolso', 'cone', 290, 10, 5],
    ]
  ),
  definir(
    'remendo',
    'Remendo',
    'O Guaxinim Inventor',
    'atirador',
    'guaxinim',
    '#9ba4b4',
    '#ffc66c',
    'Inventor mascarado com ferramentas e uma torre de brinquedo.',
    {
      nome: 'Engrenagem precisa',
      tipo: 'critico',
      descricao: 'As ferramentas calibradas fortalecem alguns ataques.',
    },
    [
      ['Porca voadora', 'projetil', 110, 13, 0.5],
      ['Mola de emergência', 'salto', 70, 5.5, 2],
      ['Torre de sucata', 'invocar', 48, 6, 1, 14, 1],
      ['Chuva de parafusos', 'canal', 80, 12, 4, 4],
    ]
  ),
  definir(
    'tinta',
    'Tinta',
    'O Polvo Pintor',
    'mago',
    'polvo',
    '#d17de5',
    '#7de2e7',
    'Artista de boina que pinta feitiços com oito pincéis.',
    {
      nome: 'Pigmento infinito',
      tipo: 'mana',
      descricao: 'As tintas encantadas regeneram sua mana.',
    },
    [
      ['Pincelada violeta', 'linha', 120, 12, 1.5],
      ['Mancha travessa', 'veneno', 25, 10, 2.8, 5],
      ['Moldura elástica', 'troca', 95, 8, 2],
      ['Galeria viva', 'invocar', 58, 9, 1.5, 10, 4],
    ]
  ),
  definir(
    'seda',
    'Seda',
    'A Borboleta Tecelã',
    'suporte',
    'borboleta',
    '#f6a5dd',
    '#a4b7ff',
    'Borboleta de asas bordadas que costura magia no ar.',
    { nome: 'Fio renovador', tipo: 'mana', descricao: 'Os fios luminosos renovam sua energia.' },
    [
      ['Agulha de luz', 'projetil', 85, 12, 0.55],
      ['Casulo gentil', 'escudo', 190, 0, 0, 5],
      ['Ponto de encontro', 'puxao', 65, 10, 1.5],
      ['Manto de seda', 'cura', 290, 9, 5],
    ]
  ),
  definir(
    'capi',
    'Capi',
    'A Capivara do Chá',
    'tanque',
    'capivara',
    '#bf936d',
    '#f0ce83',
    'Capivara serena que viaja com uma chaleira sobre a cabeça.',
    {
      nome: 'Pausa para chá',
      tipo: 'regeneracao',
      descricao: 'A tranquilidade recupera sua vida constantemente.',
    },
    [
      ['Vapor acolhedor', 'cone', 90, 5, 3.2],
      ['Hora da pausa', 'cura', 145, 4, 3],
      ['Mesa reservada', 'raiz', 70, 8, 2, 1.8],
      ['Banho termal', 'area', 260, 8, 4.5],
    ]
  ),
  definir(
    'mare',
    'Maré',
    'A Lontra Espadachim',
    'lutador',
    'lontra',
    '#ae805b',
    '#86d8f0',
    'Espadachim do rio que luta com um sabre de concha.',
    { nome: 'Corrente vital', tipo: 'vampirismo', descricao: 'Os golpes recuperam parte da vida.' },
    [
      ['Corte de espuma', 'linha', 115, 7, 1],
      ['Cambalhota do rio', 'salto', 90, 5, 2],
      ['Concha defensiva', 'escudo', 165, 0, 0, 3.5],
      ['Redemoinho do rio', 'orbita', 70, 5, 3.4, 5, 4],
    ]
  ),
  definir(
    'onda',
    'Onda',
    'O Tubarão Pirata',
    'lutador',
    'tubarao',
    '#6aaac9',
    '#ffb782',
    'Tubarão sorridente de bandana e âncora de brinquedo.',
    {
      nome: 'Mordida marota',
      tipo: 'vampirismo',
      descricao: 'Mordidas restauram vida em combate.',
    },
    [
      ['Âncora arremessada', 'puxao', 120, 9, 1.2],
      ['Mordida de espuma', 'cone', 135, 4, 2.8],
      ['Mergulho veloz', 'salto', 100, 6.5, 2.5],
      ['Onda do capitão', 'linha', 320, 13, 2.5],
    ]
  ),
  definir(
    'noz',
    'Noz',
    'A Esquila Fogueteira',
    'atirador',
    'esquilo',
    '#eaa272',
    '#ffe69c',
    'Esquila de óculos que dispara bolotas pelo seu lançador.',
    {
      nome: 'Reserva secreta',
      tipo: 'critico',
      descricao: 'Bolotas especiais ocasionalmente causam dano extra.',
    },
    [
      ['Bolota certeira', 'projetil', 100, 14, 0.5, 1, 2],
      ['Armadilha da copa', 'raiz', 75, 10, 2, 1.5],
      ['Cauda propulsora', 'salto', 60, 6, 1.7],
      ['Bosque de foguetes', 'orbita', 80, 7, 4, 5, 5],
    ]
  ),
  definir(
    'nuvem',
    'Nuvem',
    'A Carneirinha dos Sonhos',
    'suporte',
    'carneiro',
    '#f6eadf',
    '#cba9f3',
    'Carneirinha de pijama que guarda sonhos em um travesseiro.',
    {
      nome: 'Soninho reparador',
      tipo: 'regeneracao',
      descricao: 'A lã encantada regenera sua vida.',
    },
    [
      ['Almofada fofa', 'escudo', 180, 0, 0, 4],
      ['Contar carneirinhos', 'invocar', 30, 7, 1, 10, 3],
      ['Nuvem de descanso', 'cura', 120, 7, 3],
      ['Canção de ninar', 'raiz', 180, 10, 4.2, 2.5],
    ]
  ),
  definir(
    'uivo',
    'Uivo',
    'O Lobo da Aurora',
    'assassino',
    'lobo',
    '#a3bdcf',
    '#80efda',
    'Lobinho de capa que caça faíscas da aurora polar.',
    {
      nome: 'Instinto da aurora',
      tipo: 'celeridade',
      descricao: 'Os reflexos lupinos aumentam seu ritmo de combate.',
    },
    [
      ['Presa boreal', 'projetil', 115, 10, 0.8],
      ['Caçada celeste', 'salto', 130, 7, 2],
      ['Uivo cintilante', 'cone', 95, 5, 3],
      ['Dança da aurora', 'troca', 285, 10, 2.8],
    ]
  ),
  definir(
    'micelio',
    'Micélio',
    'O Cogumelo Guardião',
    'mago',
    'cogumelo',
    '#f17e87',
    '#ffe9ae',
    'Cogumelo de mochila que coleciona esporos luminosos.',
    { nome: 'Rede subterrânea', tipo: 'mana', descricao: 'O micélio devolve mana ao guardião.' },
    [
      ['Esporo saltitante', 'projetil', 110, 12, 0.8],
      ['Tapete de fungos', 'veneno', 30, 9, 3, 5],
      ['Amigos do bosque', 'invocar', 40, 7, 1, 12, 2],
      ['Floresta instantânea', 'raiz', 240, 11, 5, 2],
    ]
  ),
  definir(
    'mel',
    'Mel',
    'A Abelha Duelista',
    'assassino',
    'abelha',
    '#ffd45c',
    '#8b684c',
    'Abelha com florete de néctar e chapéu de mosqueteira.',
    {
      nome: 'Doce ferrão',
      tipo: 'critico',
      descricao: 'O ferrão afiado pode causar golpes críticos.',
    },
    [
      ['Estocada dourada', 'linha', 125, 7, 0.9],
      ['Zigue-zague', 'salto', 90, 6, 1.7],
      ['Pólen pegajoso', 'veneno', 25, 8, 2, 4],
      ['Dança da colmeia', 'orbita', 80, 5, 3.5, 5, 6],
    ]
  ),
  definir(
    'prisma',
    'Prisma',
    'O Camaleão Cristalino',
    'lutador',
    'camaleao',
    '#71d5a1',
    '#ec9ce6',
    'Camaleão de armadura prismática e espada de cristal.',
    {
      nome: 'Pele prismática',
      tipo: 'armadura',
      descricao: 'Cristais na pele ampliam sua proteção.',
    },
    [
      ['Língua de cristal', 'puxao', 105, 9, 1],
      ['Escama espelhada', 'escudo', 185, 0, 0, 4],
      ['Corte arco-íris', 'cone', 125, 5, 3],
      ['Refração total', 'troca', 275, 8, 3],
    ]
  ),
];

export { ITENS_MOBA, itemMoba } from './itens';

const heroisPorId = new Map(HEROIS_MOBA.map((h) => [h.id, h]));
export function heroiMoba(id: string): DefHeroiMoba {
  return heroisPorId.get(id) ?? HEROIS_MOBA[0];
}
