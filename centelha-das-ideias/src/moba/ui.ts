import { HEROIS_MOBA, ITENS_MOBA, heroiMoba, itemMoba } from './dados';
import { custoCompra, recomendadosPorClasse } from './itens';
import { iconeItemMoba, iconeMoba, retratoMoba } from './icones';
import { BASES_MOBA, ROTAS_MOBA } from './rotas';
import type { SimulacaoMoba } from './simulacao';
import type { DefHeroiMoba } from './tipos';
const teclas = ['Q', 'W', 'E', 'R'];
const tempo = (s: number) =>
  `${Math.floor(s / 60)
    .toString()
    .padStart(2, '0')}:${Math.floor(s % 60)
    .toString()
    .padStart(2, '0')}`;
const categoriaNome: Record<string, string> = {
  recomendados: 'Para seu herói',
  todos: 'Todos',
  componente: 'Componentes',
  ataque: 'Ataque',
  magia: 'Magia',
  defesa: 'Defesa',
  mobilidade: 'Mobilidade',
  suporte: 'Suporte',
};
const rotaNomes = ['Superior', 'Central', 'Inferior'];
export class InterfaceMoba {
  readonly elemento = document.createElement('div');
  readonly minimapa: HTMLCanvasElement;
  escolhido = HEROIS_MOBA[0].id;
  rota: 0 | 1 | 2 = 1;
  dificuldade: 'iniciante' | 'normal' | 'desafio' = 'normal';
  mira: { x: number; z: number } | null = null;
  sons = localStorage.getItem('centelha.moba.sons') !== 'nao';
  loja = false;
  placar = false;
  ajuda = false;
  private ajudaPausou = false;
  private estado = '';
  private filtro = 'todos';
  private categoria = 'recomendados';
  private busca = '';
  private mensagem = '';
  private mensagemAte = 0;
  private inventarioAnterior = '';
  private heroiAnterior = '';
  private objetivoAnterior = '';
  private hud: HTMLElement;
  private painel: HTMLElement;
  private modal: HTMLElement;
  constructor(
    readonly raiz: HTMLElement,
    readonly sim: SimulacaoMoba,
    readonly selecionar: (d: DefHeroiMoba) => void,
    readonly iniciar: () => void,
    readonly soltar: () => void
  ) {
    this.elemento.className = 'moba-ui';
    this.elemento.innerHTML = `<section class="moba-menu"></section><div class="moba-hud" hidden>
      <header class="moba-top"><strong>ARENA <span>5×5 contra bots</span></strong><b data-score></b><time data-time>00:00</time><button data-acao="placar" aria-label="Placar Tab">${iconeMoba('placar')}<span>Placar</span></button><button data-acao="som" aria-label="Alternar som">Som</button><button data-acao="ajuda" aria-label="Controles e ajuda">${iconeMoba('ajuda')}</button><button data-acao="pausa" aria-label="Pausar partida">${iconeMoba('pausa')}</button></header>
      <div class="moba-objetivos" aria-label="Objetivos da arena"></div><div class="moba-eventos" aria-live="polite"></div><div class="moba-feedback" role="status"></div><div class="moba-death"></div><div class="moba-alvo" hidden></div>
      <canvas class="moba-minimapa" width="240" height="240" aria-label="Minimapa: toque para mover, Shift ou sinal para ping"></canvas>
      <div class="moba-status"><div class="moba-nome"></div><div class="moba-bar moba-vida"><i></i><span></span></div><div class="moba-bar moba-mana"><i></i><span></span></div><div class="moba-bar moba-xp"><i></i><span></span></div><div class="moba-numeros"></div><div class="moba-inventario" aria-label="Inventário de seis espaços"></div></div>
      <div class="moba-acoes"><div class="moba-skills">${teclas.map((t, i) => `<div class="moba-slot"><button class="moba-evoluir" data-evoluir="${i}" aria-label="Evoluir ${t}" hidden>+</button><button data-skill="${i}" aria-label="Habilidade ${t}"><span class="moba-skill-icon"></span><b>${t}</b><small></small><em></em><span class="moba-tooltip" role="tooltip"></span><span class="moba-skill-nivel"></span></button></div>`).join('')}<div class="moba-feiticos"><button data-acao="lampejo" aria-label="Lampejo · F" title="Lampejo: teleporte curto na direção da mira · F">${iconeMoba('lampejo')}<b>F</b><small></small></button><button data-acao="cura" aria-label="Cura · T" title="Cura: recupere 28% da vida máxima e remova lentidão · T">${iconeMoba('cura')}<b>T</b><small></small></button></div></div>
      <div class="moba-util">${[
        ['ataque', 'Atacar', 'J'],
        ['loja', 'Loja', 'B'],
        ['retorno', 'Base', 'H'],
        ['ward', 'Sentinela', 'G'],
        ['ping', 'Sinal', 'P'],
      ]
        .map(
          ([a, n, t]) =>
            `<button data-acao="${a}" aria-label="${n} · ${t}">${iconeMoba(a)}<small>${n} · ${t}</small></button>`
        )
        .join('')}</div></div>
      <div class="moba-joystick" aria-label="Joystick de movimento"><i></i></div><div class="moba-touch-hint">Arraste habilidades para mirar · solte para lançar</div></div><section class="moba-modal" hidden></section>`;
    raiz.append(this.elemento);
    this.hud = this.q('.moba-hud');
    this.painel = this.q('.moba-menu');
    this.modal = this.q('.moba-modal');
    this.minimapa = this.q('.moba-minimapa');
    this.elemento.addEventListener('change', (e) => {
      const s = e.target as HTMLSelectElement;
      if (s.name === 'rota') this.rota = Number(s.value) as 0 | 1 | 2;
      if (s.name === 'dificuldade') this.dificuldade = s.value as typeof this.dificuldade;
    });
    this.elemento.addEventListener('input', (e) => {
      const t = e.target as HTMLInputElement;
      if (t.matches('[data-busca]')) {
        this.busca = t.value;
        this.listarLoja();
      }
    });
    this.elemento.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
      if (!b) return;
      if (b.dataset.heroi) {
        this.escolhido = b.dataset.heroi;
        this.selecionar(heroiMoba(this.escolhido));
        this.menu();
      }
      if (b.dataset.filtro) {
        this.filtro = b.dataset.filtro;
        this.menu();
      }
      if (b.dataset.categoria) {
        this.categoria = b.dataset.categoria;
        this.exibirModal();
      }
      if (b.dataset.skill !== undefined) this.usarSkill(Number(b.dataset.skill));
      if (b.dataset.evoluir !== undefined && !sim.evoluir(Number(b.dataset.evoluir)))
        this.avisar('Nível insuficiente para evoluir esta habilidade.');
      if (b.dataset.vender !== undefined) {
        this.avisar(
          sim.vender(Number(b.dataset.vender))
            ? 'Item vendido por 70% do custo.'
            : 'Venda disponível apenas na base.'
        );
        this.exibirModal();
      }
      if (b.dataset.item) {
        this.avisar(
          sim.comprar(b.dataset.item)
            ? 'Equipamento adquirido.'
            : 'Volte à base e confira o ouro e os espaços disponíveis.'
        );
        this.exibirModal();
      }
      switch (b.dataset.acao) {
        case 'iniciar':
          this.fechar();
          this.iniciar();
          break;
        case 'pausa':
        case 'continuar':
          this.pausar();
          break;
        case 'loja':
          this.alternarLoja();
          break;
        case 'fechar':
          this.fechar();
          break;
        case 'ajuda':
          this.ajudaPausou = sim.estado === 'jogando';
          this.ajuda = true;
          this.soltar();
          if (this.ajudaPausou) sim.pausar(true);
          this.exibirModal();
          break;
        case 'placar':
          this.placar = !this.placar;
          this.exibirModal();
          break;
        case 'ataque':
          sim.atacar();
          break;
        case 'retorno':
          this.avisar(
            sim.retornarBase()
              ? 'Retornando à base em 8s. Mover ou sofrer dano cancela.'
              : 'Retorno indisponível.'
          );
          break;
        case 'ward':
          this.avisar(
            sim.ward(sim.local.x, sim.local.z) ? 'Sentinela colocada.' : 'Sentinela em recarga.'
          );
          break;
        case 'ping':
          sim.ping(sim.local.x, sim.local.z);
          break;
        case 'lampejo':
        case 'cura':
          if (!sim.usarFeitico(b.dataset.acao, this.mira?.x, this.mira?.z))
            this.avisar(
              b.dataset.acao === 'cura' && sim.local.vida >= sim.local.vidaMax
                ? 'Sua vida já está completa.'
                : 'Feitiço em recarga ou herói incapacitado.'
            );
          break;
        case 'som':
          this.sons = !this.sons;
          localStorage.setItem('centelha.moba.sons', this.sons ? 'sim' : 'nao');
          this.atualizarSom();
          break;
        case 'menu':
          this.fechar();
          this.soltar();
          sim.estado = 'menu';
          this.selecionar(heroiMoba(this.escolhido));
          break;
        case 'reiniciar':
          this.fechar();
          this.iniciar();
          break;
      }
    });
    this.menu();
    this.atualizarSom();
    this.selecionar(heroiMoba(this.escolhido));
  }
  private q<T extends HTMLElement>(s: string): T {
    return this.elemento.querySelector(s)! as T;
  }
  private atualizarSom() {
    for (const b of this.elemento.querySelectorAll('[data-acao="som"]')) {
      b.textContent = this.sons ? 'Som ligado' : 'Som desligado';
      b.setAttribute('aria-pressed', String(this.sons));
    }
  }
  private menu() {
    const d = heroiMoba(this.escolhido),
      dificuldade =
        d.classe === 'assassino' ? 3 : d.classe === 'mago' || d.classe === 'atirador' ? 2 : 1;
    const estat = (nome: string, valor: number, max: number) =>
      `<div><span>${nome}</span><i><b style="width:${Math.min(100, (valor / max) * 100)}%"></b></i></div>`;
    this.painel.innerHTML = `<div class="moba-menu-cab"><div><span class="moba-kicker">CENTELHA · ARENA DAS IDEIAS</span><h1>Escolha sua <em>lenda.</em></h1><p>25 heróis. Três rotas. Uma equipe para levar à vitória.</p></div><div class="moba-selo">5×5 <span>contra bots</span></div><button data-acao="ajuda">Como jogar</button></div>
    <div class="moba-selecao"><section class="moba-catalogo"><div class="moba-filtros" aria-label="Filtrar heróis por classe">${['todos', 'tanque', 'lutador', 'assassino', 'mago', 'atirador', 'suporte'].map((c) => `<button data-filtro="${c}" aria-pressed="${this.filtro === c}">${c === 'todos' ? 'Todos · 25' : c}</button>`).join('')}</div><div class="moba-herois">${HEROIS_MOBA.filter(
      (h) => this.filtro === 'todos' || h.classe === this.filtro
    )
      .map(
        (h) =>
          `<button class="moba-card ${d.id === h.id ? 'selecionado' : ''}" data-heroi="${h.id}" aria-pressed="${d.id === h.id}" style="--heroi:${h.cor}"><span class="moba-retrato">${retratoMoba(h)}</span><strong>${h.nome}</strong><small>${h.classe}</small>${d.id === h.id ? '<span class="moba-escolhido">SEU HERÓI</span>' : ''}</button>`
      )
      .join(
        ''
      )}</div><p class="moba-catalogo-rodape">Uma identidade, quatro habilidades e uma passiva para cada herói.</p></section>
    <article class="moba-detalhe" style="--heroi:${d.cor};--heroi-claro:${d.cor2}"><div class="moba-detalhe-conteudo"><div class="moba-detalhe-titulo"><span class="moba-kicker">${d.classe} · ${d.titulo}</span><h2>${d.nome}</h2><span class="moba-dificuldade">Domínio ${[1, 2, 3].map((n) => `<i class="${n <= dificuldade ? 'ativo' : ''}"></i>`).join('')}</span></div><div class="moba-preview" aria-label="Prévia tridimensional do herói selecionado"><span class="moba-preview-legenda">${d.titulo}</span></div><p class="moba-descricao">${d.descricao}</p><div class="moba-atributos">${estat('Dano', d.dano, 60)}${estat('Resistência', d.vida, 1100)}${estat('Alcance', d.alcance, 20)}${estat('Mobilidade', d.velocidade, 20)}</div><div class="moba-passiva"><span>${iconeMoba(d.passiva.tipo === 'armadura' ? 'escudo' : d.passiva.tipo === 'mana' ? 'orbita' : d.passiva.tipo === 'celeridade' ? 'salto' : 'cura')}</span><div><b>${d.passiva.nome} <em>PASSIVA</em></b><small>${d.passiva.descricao}</small></div></div>
    <div class="moba-kit">${d.habilidades.map((s, i) => `<details><summary><span class="moba-kit-icone" style="color:${s.cor}">${iconeMoba(s.tipo)}<b>${teclas[i]}</b></span><span>${s.nome}<small>${s.custo} mana · ${s.recarga}s de recarga</small></span><span class="moba-kit-abrir">+</span></summary><p>${s.descricao} ${s.dano > 0 ? `Poder base: ${s.dano}.` : ''} Alcance: ${s.alcance}m.</p></details>`).join('')}</div>
    <div class="moba-opcoes"><label>Sua rota<select name="rota" aria-label="Sua rota">${rotaNomes.map((n, i) => `<option value="${i}" ${this.rota === i ? 'selected' : ''}>${n}</option>`).join('')}</select></label><label>Dificuldade<select name="dificuldade" aria-label="Dificuldade">${['iniciante', 'normal', 'desafio'].map((n) => `<option value="${n}" ${this.dificuldade === n ? 'selected' : ''}>${n === 'iniciante' ? 'Primeira aventura' : n === 'normal' ? 'Equilibrada' : 'Desafio'}</option>`).join('')}</select></label></div></div><footer class="moba-preparar"><button class="moba-jogar" data-acao="iniciar">Entrar na arena <span>→</span></button><small>Você + 4 aliados contra 5 bots · destrua o núcleo inimigo.</small></footer></article></div>`;
  }
  avisar(s: string) {
    this.mensagem = s;
    this.mensagemAte = performance.now() + 3500;
  }
  usarSkill(i: number, x?: number, z?: number) {
    if (!this.sim.habilidade(i, x, z)) {
      const h = this.sim.local;
      this.avisar(
        !h.niveis[i]
          ? 'Evolua esta habilidade ao subir de nível.'
          : h.recargas[i] > 0
            ? 'Habilidade em recarga.'
            : 'Mana insuficiente ou herói incapacitado.'
      );
    }
  }
  alternarLoja() {
    if (this.sim.estado !== 'jogando') return;
    this.soltar();
    this.loja = !this.loja;
    this.placar = false;
    this.exibirModal();
  }
  pausar() {
    this.soltar();
    if (this.sim.estado === 'jogando') this.sim.pausar(true);
    else if (this.sim.estado === 'pausa') this.sim.pausar(false);
    this.loja = false;
    this.ajuda = false;
    this.ajudaPausou = false;
    this.placar = false;
    this.exibirModal();
  }
  fechar() {
    const retomar = this.ajuda && this.ajudaPausou;
    this.loja = false;
    this.placar = false;
    this.ajuda = false;
    this.ajudaPausou = false;
    if (retomar && this.sim.estado === 'pausa') this.sim.pausar(false);
    this.exibirModal();
  }
  mostrarPlacar(on: boolean) {
    if (this.sim.estado === 'menu') return;
    this.placar = on;
    this.exibirModal();
  }
  private podeComprar() {
    const h = this.sim.local,
      b = BASES_MOBA[h.time];
    return this.sim.estado === 'jogando' && h.vivo && Math.hypot(h.x - b.x, h.z - b.z) <= 13;
  }
  private exibirModal() {
    const sim = this.sim;
    let conteudo = '';
    if (this.ajuda)
      conteudo = `<span class="moba-kicker">CONQUISTE A ARENA</span><h2>Como jogar</h2><p>Derrube as torres de uma rota, destrua seu inibidor e avance até o núcleo. Aliados e adversários são bots; escolha o melhor momento de ajudar sua equipe.</p><div class="moba-ajuda-grid"><p><b>WASD / setas</b> mover<br><b>Clique no campo</b> andar<br><b>Clique no inimigo / J</b> atacar<br><b>Q W E R / 1–4</b> habilidades<br><b>Shift + Q/W/E/R</b> evoluir</p><p><b>B</b> loja na base · <b>H</b> retorno<br><b>G</b> sentinela no cursor<br><b>F</b> lampejo · <b>T</b> cura<br><b>P / Shift no minimapa</b> sinal<br><b>Tab</b> placar · <b>Esc</b> pausa</p></div><p>No teclado, segure W para mover; um toque rápido lança a habilidade W ao soltar. Use as setas ou 1–4 para evitar conflito.</p><p><b>No celular:</b> joystick esquerdo para mover; arraste uma habilidade para mirar e solte para lançar. Um toque no botão lança na direção da mira. A seta e o círculo mostram seu alcance.</p><p>Ganhe XP perto de tropas derrotadas, dê o último golpe para receber mais ouro e evolua habilidades com +. Componentes ajudam a formar itens maiores. A fonte recupera vida e mana.</p><p>Use a névoa e as moitas para surpreender. Sentinelas revelam caminhos; o Guardião concede uma vantagem temporária para sua equipe.</p><button data-acao="fechar">Entendi</button>`;
    else if (this.loja) {
      conteudo = `<div class="moba-modal-cab"><div><span class="moba-kicker">EQUIPE SUA LENDA</span><h2>Loja da base <small></small></h2></div><button data-acao="fechar" aria-label="Fechar loja">×</button></div><p class="moba-loja-aviso"></p><div class="moba-loja-nav"><input data-busca type="search" placeholder="Buscar equipamento ou efeito..." value="${this.busca.replace(/"/g, '&quot;')}" aria-label="Buscar equipamento"><div class="moba-categorias">${Object.entries(
        categoriaNome
      )
        .map(
          ([id, n]) =>
            `<button data-categoria="${id}" aria-pressed="${this.categoria === id}">${n}</button>`
        )
        .join(
          ''
        )}</div></div><div class="moba-venda">${sim.local.inventario.map((id, i) => `<button data-vender="${i}" ${!this.podeComprar() ? 'disabled' : ''}>${iconeItemMoba(id)}<span>Vender ${itemMoba(id)?.nome ?? id}<small>${Math.floor((itemMoba(id)?.custo ?? 0) * 0.7)} ouro</small></span></button>`).join('')}</div><div class="moba-loja-itens"></div>`;
    } else if (this.placar) {
      const o = sim.objetivos();
      conteudo = `<span class="moba-kicker">PANORAMA DA PARTIDA</span><h2>Placar · ${tempo(sim.tempo)}</h2><div class="moba-resumo-objetivos"><span>${iconeMoba('torre')} Torres ${o.torres[sim.local.time]} × ${o.torres[1 - sim.local.time]}</span><span>${iconeMoba('guardiao')} Guardião ${o.guardiao.vivo ? 'disponível' : tempo(o.guardiao.nasceEm)}</span><span>Onda em ${Math.ceil(o.proximaOnda)}s</span></div><div class="moba-tabela"><table><thead><tr><th>Herói / rota</th><th>Nível</th><th>A / M / A</th><th>Tropas</th><th>Ouro</th><th>Equipamentos</th></tr></thead><tbody>${[
        sim.local.time,
        1 - sim.local.time,
      ]
        .flatMap((t) => sim.herois.filter((h) => h.time === t))
        .map(
          (h) =>
            `<tr class="${h.time === sim.local.time ? 'aliado' : 'inimigo'} ${h.id === sim.local.id ? 'voce' : ''}"><td><span class="moba-placar-heroi">${retratoMoba(heroiMoba(h.defId))}<span>${h.nome}${h.id === sim.local.id ? ' · Você' : ''}<small>${rotaNomes[h.rota]}${!h.vivo ? ` · Retorna em ${Math.ceil(h.renasceEm)}s` : ''}</small></span></span></td><td>${h.nivel}</td><td>${h.abates} / ${h.mortes} / ${h.assistencias}</td><td>${h.cs}</td><td>${Math.floor(h.ouro)}</td><td><div class="moba-placar-itens">${h.inventario.map((id) => `<span title="${itemMoba(id)?.nome ?? id}">${iconeItemMoba(id)}</span>`).join('')}</div></td></tr>`
        )
        .join('')}</tbody></table></div><button data-acao="fechar">Fechar placar</button>`;
    } else if (sim.estado === 'pausa')
      conteudo = `<span class="moba-kicker">RESPIRE. A ARENA ESPERA.</span><h2>Partida pausada</h2><p>${sim.local.nome} · ${rotaNomes[sim.local.rota]} · ${tempo(sim.tempo)}</p><div class="moba-pausa-acoes"><button class="moba-jogar" data-acao="continuar">Continuar · Esc</button><button data-acao="ajuda">Controles</button><button data-acao="som"></button><button data-acao="reiniciar">Reiniciar partida</button><button data-acao="menu">Escolher outro herói</button></div>`;
    else if (sim.estado === 'vitoria' || sim.estado === 'derrota')
      conteudo = `<span class="moba-kicker">NÚCLEO DESTRUÍDO</span><h2>${sim.estado === 'vitoria' ? 'Vitória da sua equipe!' : 'Derrota da sua equipe'}</h2><p>${tempo(sim.tempo)} de batalha · ${sim.local.abates} abates · ${sim.local.assistencias} assistências · ${sim.local.cs} tropas</p><button class="moba-jogar" data-acao="reiniciar">Jogar novamente</button><button data-acao="menu">Escolher outro herói</button>`;
    this.modal.hidden = !conteudo;
    this.modal.innerHTML = conteudo
      ? `<div class="moba-modal-caixa ${this.loja ? 'moba-caixa-loja' : ''}" role="dialog" aria-modal="true" aria-label="${this.ajuda ? 'Controles' : this.loja ? 'Loja' : this.placar ? 'Placar' : 'Partida'}">${conteudo}</div>`
      : '';
    if (this.loja) {
      this.listarLoja();
      this.atualizarLoja();
    }
    this.atualizarSom();
  }
  private listarLoja() {
    const lista = this.modal.querySelector('.moba-loja-itens');
    if (!lista) return;
    const h = this.sim.local,
      ids = new Set(recomendadosPorClasse(heroiMoba(h.defId).classe).map((i) => i.id));
    const busca = this.busca.trim().toLocaleLowerCase('pt-BR');
    const itens = ITENS_MOBA.filter(
      (i) =>
        (this.categoria === 'todos' ||
          (this.categoria === 'recomendados' && ids.has(i.id)) ||
          i.categoria === this.categoria) &&
        (!busca ||
          `${i.nome} ${i.descricao} ${i.passiva?.descricao ?? ''}`
            .toLocaleLowerCase('pt-BR')
            .includes(busca))
    );
    lista.innerHTML = itens.length
      ? itens
          .map((i) => {
            const compra = custoCompra(h.inventario, i.id),
              custo = compra?.custo ?? i.custo;
            return `<button data-item="${i.id}" ${!this.podeComprar() || h.ouro < custo || !compra ? 'disabled' : ''}><span class="moba-item-icone categoria-${i.categoria}">${iconeItemMoba(i.id)}</span><strong>${i.nome}</strong><span class="moba-item-descricao">${i.descricao}</span>${i.passiva ? `<span class="moba-item-passiva"><strong>${i.passiva.nome}</strong> ${i.passiva.descricao}</span>` : ''}${i.receita.length ? `<span class="moba-item-receita">Receita: ${i.receita.map((id) => itemMoba(id)?.nome ?? id).join(' + ')}</span>` : ''}<b>${custo} ouro${custo < i.custo ? ` <small>de ${i.custo}</small>` : ''}</b>${compra?.consumidos.length ? '<small>Usa componentes do seu inventário</small>' : ''}</button>`;
          })
          .join('')
      : '<p class="moba-loja-vazia">Nenhum equipamento encontrado. Tente outro efeito ou categoria.</p>';
  }
  atualizar() {
    const sim = this.sim,
      h = sim.local,
      d = heroiMoba(h.defId);
    if (this.estado !== sim.estado) {
      this.estado = sim.estado;
      this.painel.hidden = sim.estado !== 'menu';
      this.hud.hidden = sim.estado === 'menu';
      if (sim.estado === 'menu') this.menu();
      this.exibirModal();
    }
    if (sim.estado === 'menu') return;
    const bar = (s: string, v: number, max: number, texto: string) => {
      const e = this.q(s);
      (e.querySelector('i') as HTMLElement).style.width =
        `${Math.max(0, Math.min(100, (v / max) * 100))}%`;
      e.querySelector('span')!.textContent = texto;
    };
    bar(
      '.moba-vida',
      h.vida,
      h.vidaMax,
      `${Math.ceil(h.vida)} / ${Math.ceil(h.vidaMax)}${h.escudo > 0 ? ' +' + Math.ceil(h.escudo) : ''}`
    );
    bar('.moba-mana', h.mana, h.manaMax, `${Math.floor(h.mana)} / ${h.manaMax}`);
    bar(
      '.moba-xp',
      h.xp,
      sim.xpProximoNivel(h.nivel),
      `XP ${Math.floor(h.xp)} / ${sim.xpProximoNivel(h.nivel)}`
    );
    this.q('.moba-nome').textContent = `${h.nome} · Nível ${h.nivel}`;
    this.q('.moba-numeros').textContent =
      `${Math.floor(h.ouro)} ouro · ${h.abates}/${h.mortes}/${h.assistencias} · ${h.cs} tropas`;
    this.q('[data-time]').textContent = tempo(sim.tempo);
    this.q('[data-score]').textContent = [h.time, 1 - h.time]
      .map((t) => sim.herois.filter((a) => a.time === t).reduce((s, a) => s + a.abates, 0))
      .join(' : ');
    this.q('.moba-eventos').textContent = sim.eventos
      .slice(-2)
      .map((e) => e.texto)
      .join('  •  ');
    this.q('.moba-feedback').textContent =
      performance.now() < this.mensagemAte ? this.mensagem : '';
    this.q('.moba-death').textContent = !h.vivo
      ? `Você retorna em ${Math.ceil(h.renasceEm)}s`
      : h.recall > 0
        ? `Retornando à base: ${h.recall.toFixed(1)}s`
        : '';
    const mudou = this.heroiAnterior !== d.id;
    this.heroiAnterior = d.id;
    teclas.forEach((t, i) => {
      const b = this.q<HTMLButtonElement>(`[data-skill="${i}"]`),
        s = d.habilidades[i];
      if (mudou) {
        b.querySelector('.moba-skill-icon')!.innerHTML = iconeMoba(s.tipo);
        b.style.setProperty('--skill', s.cor);
        b.querySelector('small')!.textContent = s.nome;
      }
      b.querySelector('em')!.textContent =
        h.recargas[i] > 0 ? Math.ceil(h.recargas[i]).toString() : !h.niveis[i] ? '—' : `${s.custo}`;
      b.querySelector('.moba-skill-nivel')!.innerHTML = Array.from(
        { length: i === 3 ? 3 : 5 },
        (_, n) => `<i class="${n < h.niveis[i] ? 'aprendido' : ''}"></i>`
      ).join('');
      const texto = `${s.nome} · Nível ${h.niveis[i]}\n${s.descricao}\nPoder base ${s.dano} · ${s.custo} mana · ${s.recarga}s · Alcance ${s.alcance}m · Raio ${s.raio}m`;
      b.title = texto;
      b.querySelector('.moba-tooltip')!.textContent = texto;
      b.dataset.indisponivel = String(!h.niveis[i] || h.recargas[i] > 0 || h.mana < s.custo);
      this.q(`[data-evoluir="${i}"]`).hidden = !h.pontos;
    });
    const inv = h.inventario.join('|');
    if (inv !== this.inventarioAnterior || !this.q('.moba-inventario').children.length) {
      this.inventarioAnterior = inv;
      this.q('.moba-inventario').innerHTML = Array.from(
        { length: 6 },
        (_, i) =>
          `<span title="${h.inventario[i] ? itemMoba(h.inventario[i])?.nome : 'Espaço vazio'}">${h.inventario[i] ? iconeItemMoba(h.inventario[i]) : '<i></i>'}</span>`
      ).join('');
    }
    this.q('[data-acao="ward"] small').textContent =
      sim.recargaWard > 0 ? `${Math.ceil(sim.recargaWard)}s` : 'Sentinela · G';
    for (const tipo of ['lampejo', 'cura'] as const) {
      const b = this.q<HTMLButtonElement>(`[data-acao="${tipo}"]`),
        recarga = sim.recargaFeitico(tipo);
      b.querySelector('small')!.textContent = recarga > 0 ? `${Math.ceil(recarga)}` : '';
      b.dataset.indisponivel = String(recarga > 0);
    }
    const objetivo = sim.objetivos(),
      conteudo = `<span title="Torres restantes">${iconeMoba('torre')} ${objetivo.torres[h.time]} : ${objetivo.torres[1 - h.time]}</span><span title="Próxima onda de tropas">Onda ${Math.ceil(objetivo.proximaOnda)}s</span><span class="moba-guardiao ${objetivo.guardiao.vivo ? 'disponivel' : ''}">${iconeMoba('guardiao')} ${objetivo.guardiao.vivo ? 'Guardião vivo' : tempo(objetivo.guardiao.nasceEm)}</span>${objetivo.buffs[h.time] > 0 ? `<span class="moba-buff">Bênção ${tempo(objetivo.buffs[h.time])}</span>` : ''}`;
    if (conteudo !== this.objetivoAnterior) {
      this.objetivoAnterior = conteudo;
      this.q('.moba-objetivos').innerHTML = conteudo;
    }
    const alvo = [...sim.herois, ...sim.unidades, ...sim.estruturas].find(
        (a) => a.id === h.alvo && a.vida > 0
      ),
      e = this.q('.moba-alvo');
    e.hidden = !alvo || !sim.visivel(h.time, alvo.x, alvo.z);
    if (alvo && !e.hidden) {
      const nome =
        'nome' in alvo
          ? alvo.nome
          : alvo.tipo === 'torre'
            ? 'Torre inimiga'
            : alvo.tipo === 'chefe'
              ? 'Guardião'
              : alvo.tipo === 'neutro'
                ? 'Criatura da selva'
                : 'Alvo';
      e.innerHTML = `<span>${iconeMoba('alvo')} ${nome}<small>${Math.ceil(alvo.vida)} / ${Math.ceil(alvo.vidaMax)}</small></span><i><b style="width:${(alvo.vida / alvo.vidaMax) * 100}%"></b></i>`;
    }
    this.desenharMinimapa();
    if (this.loja) this.atualizarLoja();
  }
  private atualizarLoja() {
    const h = this.sim.local,
      pode = this.podeComprar(),
      ouro = this.modal.querySelector('h2 small');
    if (ouro) ouro.textContent = `${Math.floor(h.ouro)} ouro · ${h.inventario.length}/6 espaços`;
    const aviso = this.modal.querySelector('.moba-loja-aviso');
    if (aviso)
      aviso.textContent = pode
        ? 'Na fonte: compre um item ou combine seus componentes.'
        : 'Você está longe da fonte. H retorna à base para comprar.';
    for (const b of this.modal.querySelectorAll<HTMLButtonElement>('[data-item]')) {
      const compra = custoCompra(h.inventario, b.dataset.item!);
      b.disabled = !pode || !compra || h.ouro < compra.custo;
    }
    for (const b of this.modal.querySelectorAll<HTMLButtonElement>('[data-vender]'))
      b.disabled = !pode;
  }
  private desenharMinimapa() {
    const c = this.minimapa.getContext('2d');
    if (!c) return;
    const sim = this.sim,
      team = sim.local.time,
      esc = 240 / 180,
      px = (v: number) => (v + 90) * esc;
    c.fillStyle = '#1f4945';
    c.fillRect(0, 0, 240, 240);
    c.lineWidth = 8;
    c.strokeStyle = '#8b9b7b';
    for (const rota of ROTAS_MOBA) {
      c.beginPath();
      rota.forEach((p, i) => (i ? c.lineTo(px(p.x), px(p.z)) : c.moveTo(px(p.x), px(p.z))));
      c.stroke();
    }
    c.lineWidth = 13;
    c.strokeStyle = '#407c94';
    c.beginPath();
    c.moveTo(0, 30);
    c.lineTo(240, 210);
    c.stroke();
    c.fillStyle = 'rgba(3,12,20,.83)';
    for (let x = -87; x < 90; x += 6)
      for (let z = -87; z < 90; z += 6)
        if (!sim.visivel(team, x, z)) c.fillRect(px(x - 3), px(z - 3), 8.2, 8.2);
    for (const e of sim.estruturas) {
      if (e.vida <= 0) continue;
      c.fillStyle = e.time === team ? '#78e8ef' : '#ff8d91';
      c.fillRect(px(e.x) - 2.5, px(e.z) - 2.5, 5, 5);
    }
    for (const u of sim.unidades) {
      if (!u.vivo || (u.time !== team && !sim.visivel(team, u.x, u.z))) continue;
      c.fillStyle = u.time === team ? '#a6e8e1' : u.time === 2 ? '#f6df94' : '#f590a3';
      c.fillRect(px(u.x) - 1, px(u.z) - 1, 2, 2);
    }
    for (const a of sim.herois) {
      if (!a.vivo || (a.time !== team && !sim.visivel(team, a.x, a.z))) continue;
      c.beginPath();
      c.fillStyle = a.id === sim.local.id ? '#fff3a5' : a.time === team ? '#74e7ff' : '#ff6a8b';
      c.arc(px(a.x), px(a.z), a.id === sim.local.id ? 4 : 3, 0, Math.PI * 2);
      c.fill();
    }
    for (const w of sim.sentinelas)
      if (w.time === team) {
        c.strokeStyle = '#ffe392';
        c.beginPath();
        c.arc(px(w.x), px(w.z), 4, 0, Math.PI * 2);
        c.stroke();
      }
  }
  descartar() {
    this.elemento.remove();
  }
}
