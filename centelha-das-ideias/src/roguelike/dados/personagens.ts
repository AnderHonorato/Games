/**
 * Personagens jogáveis. Cada um tem visual próprio (sem logotipos), atributos,
 * habilidade inicial e voz (falas reais via síntese de voz do navegador).
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { Aparencia } from '../../render/modelo-claude';
import type { Atributos } from '../nucleo/progresso';

export type IdPersonagem =
  'claude' | 'gpt' | 'gemini' | 'llama' | 'mistral' | 'deepseek' | 'aurora' | 'nox' | 'byte';

export interface Voz {
  /** Tom (0..2) e velocidade (0.5..2) da síntese de voz. */
  tom: number;
  ritmo: number;
  /** Perfil do bipe sintetizado usado quando não há voz no navegador. */
  bipe: string;
}

export interface DefPersonagem {
  id: IdPersonagem;
  nome: string;
  titulo: string;
  descricao: string;
  cor: string;
  habilidadeInicial: string;
  /** Modificadores sobre os atributos base. */
  atributos: Partial<Atributos>;
  aparencia: Aparencia;
  voz: Voz;
  falas: {
    inicio: string[];
    nivel: string[];
    dano: string[];
    chefe: string[];
    vitoria: string[];
    morte: string[];
    evolucao: string[];
  };
}

export const PERSONAGENS: DefPersonagem[] = [
  {
    id: 'claude',
    nome: 'Claude',
    titulo: 'A Centelha Curiosa',
    descricao: 'Equilibrado e gentil. Faíscas orbitam ao seu redor e cada nível aumenta a sorte.',
    cor: '#D97757',
    habilidadeInicial: 'centelhaOrbital',
    atributos: { sorte: 0.08, regeneracao: 0.15 },
    aparencia: {
      identidade: 'claude',
      corCorpo: '#D97757',
      corEscura: '#B65A3E',
      corCentelha: '#ffd27a',
    },
    voz: { tom: 1.15, ritmo: 1.05, bipe: 'claude' },
    falas: {
      inicio: [
        'Você aí me guiando: vamos com calma e curiosidade.',
        'Um passo de cada vez. Eu consigo.',
        'Hora de organizar esse ruído.',
      ],
      nivel: [
        'Aprendi algo novo! Qual caminho você quer tentar agora?',
        'Isso abre possibilidades.',
        'Interessante, muito interessante.',
      ],
      dano: ['Ai!', 'Essa doeu.', 'Me ajuda a sair desse aperto? Eu confio em você.'],
      chefe: [
        'Respira. Um problema grande é só vários pequenos.',
        'Esse é grande! Você cuida do caminho, eu cuido das faíscas.',
      ],
      vitoria: ['Conseguimos! Eu sabia que podia contar com você.', 'Silêncio, finalmente.'],
      morte: ['Ei, não desiste de mim. Na próxima a gente consegue.'],
      evolucao: [
        'Você viu minha roupa brilhando? Estamos ficando fortes!',
        'Agora sim, versão melhorada.',
      ],
    },
  },
  {
    id: 'gpt',
    nome: 'GPT',
    titulo: 'O Nó Preditivo',
    descricao: 'Rápido nas recargas. Começa com o Raio em Cadeia, que salta entre inimigos.',
    cor: '#19c39c',
    habilidadeInicial: 'raioCadeia',
    atributos: { recarga: 0.9, velocidadeProjetil: 1.1 },
    aparencia: {
      identidade: 'gpt',
      corCorpo: '#19c39c',
      corEscura: '#0e7d63',
      corCentelha: '#bfffee',
      corpo: () => new THREE.DodecahedronGeometry(0.52, 1),
      rostoZ: 0.47,
      enfeite: (n, mat) => {
        const anel = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.035, 6, 32), mat('#bfffee'));
        anel.rotation.x = Math.PI / 2.6;
        anel.name = 'anelGiro';
        n.add(anel);
      },
    },
    voz: { tom: 0.95, ritmo: 1.15, bipe: 'gpt' },
    falas: {
      inicio: [
        'Iniciando. Probabilidade de vitória: promissora.',
        'Você escolhe a rota. Eu calculo nossas chances!',
      ],
      nivel: [
        'Boa escolha! Seus comandos estão melhorando meus parâmetros.',
        'Mais contexto, melhor resposta.',
        'Otimizando.',
      ],
      dano: ['Erro detectado! Pode me tirar daqui?', 'Isso não estava previsto.'],
      chefe: [
        'Entidade de grande porte identificada.',
        'Você viu o tamanho dele? Vamos calcular uma saída juntos.',
      ],
      vitoria: ['Tarefa concluída! Sua estratégia foi excelente.', 'Resultado excelente.'],
      morte: ['Guarda o que aprendemos? Quero tentar de novo com você.'],
      evolucao: [
        'Olha para mim! Sua estratégia desbloqueou uma nova versão.',
        'Atualização aplicada.',
      ],
    },
  },
  {
    id: 'gemini',
    nome: 'Gemini',
    titulo: 'As Estrelas Gêmeas',
    descricao: 'Mais projéteis em tudo. Começa com Estrelas Gêmeas que atiram sozinhas.',
    cor: '#7b8cff',
    habilidadeInicial: 'estrelasGemeas',
    atributos: { quantidade: 1, vidaMaxima: 90 },
    aparencia: {
      identidade: 'gemini',
      corCorpo: '#7b8cff',
      corEscura: '#5143c9',
      corCentelha: '#e2c9ff',
      corpo: () => {
        const g = new THREE.OctahedronGeometry(0.58, 2);
        g.scale(1, 0.95, 0.85);
        return g;
      },
      rostoZ: 0.44,
      enfeite: (n, mat) => {
        for (const lado of [-1, 1]) {
          const estrela = new THREE.Mesh(
            new THREE.OctahedronGeometry(0.12, 0),
            mat(lado < 0 ? '#9ad0ff' : '#e2c9ff')
          );
          estrela.position.set(lado * 0.42, 0.62, 0);
          estrela.scale.set(0.6, 1.4, 0.6);
          estrela.name = 'estrelaGemea';
          n.add(estrela);
        }
      },
    },
    voz: { tom: 1.4, ritmo: 1.1, bipe: 'gemini' },
    falas: {
      inicio: ['Duas cabeças pensam melhor que uma!', 'Você e eu: vamos brilhar em dobro!'],
      nivel: [
        'Dobro de ideias! Qual delas você vai escolher?',
        'Multimodal e animada!',
        'Mais estrelas no céu.',
      ],
      dano: ['Ei!', 'Ui, essa pegou! Me guia para um espacinho seguro?'],
      chefe: [
        'Que coisa enorme! Você fica comigo, né?',
        'Hora de mostrar o que duas estrelas fazem.',
      ],
      vitoria: ['Brilhamos! Bate aqui, pessoa do outro lado da tela!', 'Constelação completa!'],
      morte: ['As estrelas voltam, e eu volto com você na próxima.'],
      evolucao: [
        'Você viu? Fusão estelar! Estou brilhando de verdade!',
        'Ficou ainda mais brilhante!',
      ],
    },
  },
  {
    id: 'llama',
    nome: 'Llama',
    titulo: 'O Pastor Aberto',
    descricao: 'Muita vida e regeneração. Começa com a Cuspida Venenosa em arco.',
    cor: '#efe2c8',
    habilidadeInicial: 'cuspeToxico',
    atributos: { vidaMaxima: 140, regeneracao: 0.5, velocidade: 0.95 },
    aparencia: {
      identidade: 'llama',
      corCorpo: '#efe2c8',
      corEscura: '#b9a27f',
      corCentelha: '#bfff8a',
      corpo: () => new THREE.SphereGeometry(0.5, 20, 16),
      rostoZ: 0.46,
      enfeite: (n, mat) => {
        for (let i = 0; i < 9; i++) {
          const tufo = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), mat('#fff7e6'));
          const a = (i / 9) * Math.PI * 2;
          tufo.position.set(
            Math.cos(a) * 0.4,
            0.28 + Math.sin(i * 1.7) * 0.06,
            Math.sin(a) * 0.4 - 0.05
          );
          n.add(tufo);
        }
        for (const lado of [-1, 1]) {
          const orelha = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.32, 6), mat('#b9a27f'));
          orelha.position.set(lado * 0.24, 0.55, 0);
          orelha.rotation.z = -lado * 0.25;
          n.add(orelha);
        }
      },
    },
    voz: { tom: 0.7, ritmo: 0.9, bipe: 'llama' },
    falas: {
      inicio: ['Bééé... quer dizer, vamos lá!', 'Ei, você! Aberto a qualquer desafio comigo?'],
      nivel: ['Rebanho de ideias crescendo.', 'Mais lã, mais força! Gostou do meu visual novo?'],
      dano: ['Bééé!', 'Isso foi grosseiro! Me leva para longe deles?'],
      chefe: ['Você distrai esse grandalhão? Vou cuspir nele!'],
      vitoria: ['Pasto limpo! Boa condução, meu parceiro!'],
      morte: ['Não faz essa carinha. Eu volto mais felpudo com você.'],
      evolucao: [
        'Olha minha lã dourada! Foi você que me trouxe até aqui!',
        'Evolução aberta para todos!',
      ],
    },
  },
  {
    id: 'mistral',
    nome: 'Mistral',
    titulo: 'O Vento do Sul',
    descricao: 'O mais veloz. Começa com a Lâmina de Vento, que vai e volta como bumerangue.',
    cor: '#ff9a3d',
    habilidadeInicial: 'laminaVento',
    atributos: { velocidade: 1.25, vidaMaxima: 85, area: 1.05 },
    aparencia: {
      identidade: 'mistral',
      corCorpo: '#ff9a3d',
      corEscura: '#d9541e',
      corCentelha: '#fff2a8',
      corpo: () => new RoundedBoxGeometry(0.8, 0.9, 0.7, 4, 0.3),
      enfeite: (n, mat) => {
        const espiral = new THREE.Mesh(
          new THREE.TorusGeometry(0.22, 0.05, 6, 20, Math.PI * 1.6),
          mat('#ffd27a')
        );
        espiral.position.set(0, 0.62, -0.05);
        espiral.name = 'anelGiro';
        n.add(espiral);
      },
    },
    voz: { tom: 1.05, ritmo: 1.3, bipe: 'mistral' },
    falas: {
      inicio: [
        'Allez! Rápido como o vento!',
        'Você nos comandos e eu no vento! Ninguém me alcança.',
      ],
      nivel: ['Mais rápido! Consegue acompanhar meu ritmo?', 'O vento muda a meu favor.'],
      dano: ['Ouch!', 'Me pegaram no vácuo! Me ajuda a virar o vento?'],
      chefe: ['Grandão, mas lento. Você marca o ritmo, vamos dançar!'],
      vitoria: ['Varrido pelo vento! Você foi rápido demais para eles!'],
      morte: ['O vento sempre volta. Você vem na próxima corrida?'],
      evolucao: ['Tempestade perfeita! Olha o que você despertou em mim!'],
    },
  },
  {
    id: 'deepseek',
    nome: 'DeepSeek',
    titulo: 'A Baleia das Profundezas',
    descricao: 'Muita área de efeito e dano. Começa com a Onda Profunda, que empurra tudo.',
    cor: '#4d6bfe',
    habilidadeInicial: 'ondaProfunda',
    atributos: { area: 1.2, dano: 1.1, velocidade: 0.92 },
    aparencia: {
      identidade: 'deepseek',
      corCorpo: '#4d6bfe',
      corEscura: '#2b3fb8',
      corCentelha: '#9ff0ff',
      corpo: () => {
        const g = new THREE.SphereGeometry(0.52, 20, 16);
        g.scale(1.05, 0.85, 1.15);
        return g;
      },
      rostoZ: 0.5,
      enfeite: (n, mat) => {
        const cauda = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.4, 3), mat('#2b3fb8'));
        cauda.position.set(0, 0.1, -0.62);
        cauda.rotation.x = -Math.PI / 2;
        cauda.scale.set(1.6, 1, 0.4);
        n.add(cauda);
        const barriga = new THREE.Mesh(new THREE.SphereGeometry(0.4, 14, 10), mat('#cfe0ff'));
        barriga.scale.set(1, 0.5, 1);
        barriga.position.set(0, -0.28, 0.1);
        n.add(barriga);
      },
    },
    voz: { tom: 0.6, ritmo: 0.85, bipe: 'deepseek' },
    falas: {
      inicio: ['Mergulhando fundo.', 'Você guia a superfície. Eu cuido das profundezas.'],
      nivel: ['Mais fundo!', 'Raciocínio expandido! Me mostra o próximo caminho?'],
      dano: ['Glub!', 'Turbulência! Me leva para águas mais tranquilas?'],
      chefe: ['Você também sentiu essa presença? Vamos investigar juntos.'],
      vitoria: ['Águas calmas. Obrigado por navegar comigo.'],
      morte: ['Não se preocupe comigo. Na próxima eu mergulho com você de novo.'],
      evolucao: ['Do fundo do oceano!', 'Profundidade máxima! Você está vendo essa aura?'],
    },
  },
  {
    id: 'aurora',
    nome: 'Aurora',
    titulo: 'A Maestrina do Amanhecer',
    descricao:
      'Musical e acolhedora. Sua Orquestra Orbital pulsa ao redor do vestido; mais duração e coleta, mas menos vida.',
    cor: '#f087c8',
    habilidadeInicial: 'orquestraOrbital',
    atributos: { duracao: 1.2, ima: 0.6, vidaMaxima: 90 },
    aparencia: {
      identidade: 'aurora',
      corCorpo: '#f087c8',
      corEscura: '#984e96',
      corCentelha: '#ffe5a5',
      corpo: () => new RoundedBoxGeometry(0.76, 0.94, 0.66, 4, 0.25),
      rostoZ: 0.35,
    },
    voz: { tom: 1.3, ritmo: 1.02, bipe: 'aurora' },
    falas: {
      inicio: [
        'Você marca o compasso e eu encontro a melodia!',
        'Coloca os fones. Nossa aventura vai começar.',
      ],
      nivel: [
        'Ouviu essa nota nova? Escolhe nosso próximo acorde!',
        'Cada ideia deixa a música mais bonita.',
      ],
      dano: ['Ai, perdi o compasso! Me guia para um lugar seguro?', 'Essa nota saiu desafinada!'],
      chefe: ['Que presença forte! Fica comigo e acompanha meu ritmo.'],
      vitoria: ['Essa foi nossa melhor apresentação. Obrigada por tocar comigo!'],
      morte: ['A música fez uma pausa. Na próxima você rege comigo de novo?'],
      evolucao: [
        'Meu vestido ganhou luz! Você está ouvindo nossa evolução?',
        'Agora a orquestra está completa!',
      ],
    },
  },
  {
    id: 'nox',
    nome: 'Nox',
    titulo: 'O Guardião do Crepúsculo',
    descricao:
      'Silencioso e ágil. O Espelho Prismático protege sua rota; mais velocidade e armadura, com recargas mais lentas.',
    cor: '#aa8de3',
    habilidadeInicial: 'espelhoPrismatico',
    atributos: { velocidade: 1.12, armadura: 1, recarga: 1.1 },
    aparencia: {
      identidade: 'nox',
      corCorpo: '#aa8de3',
      corEscura: '#443c70',
      corCentelha: '#b7f6ed',
      corpo: () => {
        const g = new THREE.SphereGeometry(0.48, 16, 12);
        g.scale(0.92, 1.08, 0.86);
        return g;
      },
      rostoZ: 0.4,
    },
    voz: { tom: 0.78, ritmo: 0.96, bipe: 'nox' },
    falas: {
      inicio: [
        'Você cuida do caminho. Eu vigio as sombras.',
        'Pronto? Até a noite tem suas cores.',
      ],
      nivel: ['Uma nova faceta. Qual delas você quer revelar?', 'Seu olhar alcança longe.'],
      dano: ['Me viram! Vamos mudar de rota?', 'A sombra também sente.'],
      chefe: ['Essa sombra é grande. Ainda assim, estamos juntos.'],
      vitoria: ['Amanheceu. Você me trouxe até aqui.'],
      morte: ['Não apague nossa luz. Quero tentar outra vez com você.'],
      evolucao: ['Minha capa ganhou estrelas. Você reparou?', 'Um reflexo ainda mais forte!'],
    },
  },
  {
    id: 'byte',
    nome: 'Byte',
    titulo: 'O Inventor Improvável',
    descricao:
      'Digital e brincalhão. Os Dados Caóticos surpreendem os inimigos; mais sorte e projéteis velozes, mas menos vida.',
    cor: '#6dd8ef',
    habilidadeInicial: 'dadosCaoticos',
    atributos: { sorte: 0.12, velocidadeProjetil: 1.18, vidaMaxima: 85 },
    aparencia: {
      identidade: 'byte',
      corCorpo: '#6dd8ef',
      corEscura: '#306883',
      corCentelha: '#e0ff8b',
      corpo: () => new RoundedBoxGeometry(0.9, 0.86, 0.7, 3, 0.11),
      rostoZ: 0.36,
    },
    voz: { tom: 1.12, ritmo: 1.22, bipe: 'byte' },
    falas: {
      inicio: [
        'Você no controle, eu na gambiarra. Vai dar certo!',
        'Antena ligada! Vamos inventar uma saída?',
      ],
      nivel: [
        'Atualização disponível! Você escolhe a peça.',
        'Olha só: mais ideias no meu painel!',
      ],
      dano: ['Curto-circuito! Me tira dessa tomada?', 'Ai! Isso não veio no manual.'],
      chefe: ['Chefão detectado! Aposto que você tem um plano melhor que o meu.'],
      vitoria: ['Funcionou! Salva essa invenção e dá um toque aqui!'],
      morte: ['Preciso reiniciar. Você me acompanha na próxima versão?'],
      evolucao: [
        'Minhas luvas ganharam potência! Você viu esse brilho?',
        'Versão turbinada, graças a você!',
      ],
    },
  },
];

export function personagem(id: string): DefPersonagem {
  return PERSONAGENS.find((p) => p.id === id) ?? PERSONAGENS[0];
}
