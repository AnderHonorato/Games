import { HEROIS_MOBA, ITENS_MOBA, heroiMoba, itemMoba } from './dados';
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
export class InterfaceMoba {
  readonly elemento = document.createElement('div');
  readonly minimapa: HTMLCanvasElement;
  escolhido = HEROIS_MOBA[0].id;
  loja = false;
  placar = false;
  ajuda = false;
  private ajudaPausou = false;
  private estado = '';
  private filtro = 'todos';
  private mensagem = '';
  private mensagemAte = 0;
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
    this.elemento.innerHTML = `<section class="moba-menu"></section><div class="moba-hud" hidden><header class="moba-top"><strong>MOBA <span>5×5 contra bots</span></strong><b data-score></b><time data-time>00:00</time><button data-acao="placar" aria-label="Placar Tab">Placar</button><button data-acao="ajuda" aria-label="Controles e ajuda">?</button><button data-acao="pausa" aria-label="Pausar partida">Ⅱ</button></header><div class="moba-eventos" aria-live="polite"></div><div class="moba-feedback" role="status"></div><div class="moba-death"></div><canvas class="moba-minimapa" width="240" height="240" aria-label="Minimapa: toque para mover, Shift ou sinal para ping"></canvas><div class="moba-status"><div class="moba-nome"></div><div class="moba-bar moba-vida"><i></i><span></span></div><div class="moba-bar moba-mana"><i></i><span></span></div><div class="moba-bar moba-xp"><i></i><span></span></div><div class="moba-numeros"></div><div class="moba-inventario" aria-label="Inventário de seis espaços"></div></div><div class="moba-acoes"><div class="moba-skills">${teclas.map((t, i) => `<div class="moba-slot"><button class="moba-evoluir" data-evoluir="${i}" aria-label="Evoluir ${t}" hidden>+</button><button data-skill="${i}" aria-label="Habilidade ${t}"><b>${t}</b><small></small><em></em></button></div>`).join('')}</div><div class="moba-util"><button data-acao="ataque">⚔<small>Atacar · J</small></button><button data-acao="loja">◈<small>Loja · B</small></button><button data-acao="retorno">⌂<small>Retorno · H</small></button><button data-acao="ward">✦<small>Ward · G</small></button><button data-acao="ping">!<small>Sinal · P</small></button></div></div><div class="moba-joystick" aria-label="Joystick de movimento"><i></i></div><div class="moba-touch-hint">Arraste o controle para mover · toque no campo para andar ou mirar</div></div><section class="moba-modal" hidden></section>`;
    raiz.append(this.elemento);
    this.hud = this.q('.moba-hud');
    this.painel = this.q('.moba-menu');
    this.modal = this.q('.moba-modal');
    this.minimapa = this.q('.moba-minimapa');
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
      if (b.dataset.skill !== undefined) this.usarSkill(Number(b.dataset.skill));
      if (b.dataset.evoluir !== undefined) {
        if (!sim.evoluir(Number(b.dataset.evoluir)))
          this.avisar('Nível insuficiente para evoluir esta habilidade.');
      }
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
            ? 'Item equipado.'
            : 'Compre na base, com ouro e espaço no inventário.'
        );
        this.exibirModal();
      }
      switch (b.dataset.acao) {
        case 'iniciar':
          this.fechar();
          this.iniciar();
          break;
        case 'pausa':
          this.pausar();
          break;
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
            sim.ward(sim.local.x, sim.local.z)
              ? 'Sentinela colocada por 150s.'
              : 'Sentinela em recarga.'
          );
          break;
        case 'ping':
          sim.ping(sim.local.x, sim.local.z);
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
    this.selecionar(heroiMoba(this.escolhido));
  }
  private q<T extends HTMLElement>(s: string): T {
    return this.elemento.querySelector(s)! as T;
  }
  private menu() {
    const d = heroiMoba(this.escolhido);
    this.painel.innerHTML = `<div class="moba-menu-cab"><div><span class="moba-kicker">ARENA DAS IDEIAS</span><h1>MOBA <em>5×5 contra bots</em></h1><p>Você + 4 aliados contra 5 adversários controlados pelo jogo.</p></div><button data-acao="ajuda">Como jogar</button></div><div class="moba-selecao"><section class="moba-catalogo"><div class="moba-filtros" aria-label="Filtrar heróis por classe">${['todos', 'tanque', 'lutador', 'assassino', 'mago', 'atirador', 'suporte'].map((c) => `<button data-filtro="${c}" aria-pressed="${this.filtro === c}">${c === 'todos' ? '25 heróis' : c}</button>`).join('')}</div><div class="moba-herois">${HEROIS_MOBA.filter(
      (h) => this.filtro === 'todos' || h.classe === this.filtro
    )
      .map(
        (h) =>
          `<button class="moba-card ${d.id === h.id ? 'selecionado' : ''}" data-heroi="${h.id}" aria-pressed="${d.id === h.id}" style="--heroi:${h.cor}"><span class="moba-retrato">${h.nome.slice(0, 2)}</span><strong>${h.nome}</strong><small>${h.classe}</small></button>`
      )
      .join(
        ''
      )}</div></section><article class="moba-detalhe"><span class="moba-kicker">${d.classe} · ${d.titulo}</span><h2>${d.nome}</h2><div class="moba-preview" aria-label="Prévia tridimensional do herói selecionado"></div><p>${d.descricao}</p><div class="moba-passiva"><b>Passiva · ${d.passiva.nome}</b><small>${d.passiva.descricao}</small></div><div class="moba-kit">${d.habilidades.map((s, i) => `<details><summary><b>${teclas[i]}</b> ${s.nome}<small>${s.custo} mana · ${s.recarga}s</small></summary><p>${s.descricao} Alcance: ${s.alcance}m.</p></details>`).join('')}</div><button class="moba-jogar" data-acao="iniciar">Entrar na arena →</button><small>Destrua torres, inibidores e o núcleo inimigo.</small></article></div>`;
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
  private exibirModal() {
    const sim = this.sim;
    let conteudo = '';
    if (this.ajuda)
      conteudo = `<h2>Como jogar</h2><p>Você controla um herói; os outros nove são bots. Seu objetivo é destruir o núcleo protegido por três rotas de torres e inibidores.</p><div class="moba-ajuda-grid"><p><b>WASD / setas</b> mover<br><b>Clique no campo</b> andar<br><b>Clique no inimigo / J</b> atacar<br><b>Q W E R</b> habilidades<br><b>Shift + Q/W/E/R</b> evoluir</p><p><b>B</b> loja, apenas na base<br><b>H</b> retornar em 8 segundos<br><b>G</b> sentinela no cursor<br><b>P / Shift no minimapa</b> sinal<br><b>Tab</b> placar · <b>Esc</b> pausa</p></div><p>Teclado: segure W para mover; um toque rápido em W lança a habilidade ao soltar. As teclas 1–4 também lançam Q/W/E/R; as setas permitem mover sem conflito.</p><p>No toque: joystick esquerdo para mover; toque no campo para escolher a mira; botões grandes lançam as habilidades. Ganhe XP ao derrotar tropas próximas, evolua habilidades com + e equipe até seis itens.</p><p>O escuro no campo e no minimapa é a névoa de guerra. Aliados, torres e sentinelas revelam inimigos.</p><button data-acao="fechar">Entendi</button>`;
    else if (this.loja) {
      const base = BASES_MOBA[sim.local.time],
        pode = Math.hypot(sim.local.x - base.x, sim.local.z - base.z) <= 13 && sim.local.vivo;
      conteudo = `<h2>Loja da base <small>${Math.floor(sim.local.ouro)} ouro · ${sim.local.inventario.length}/6 espaços</small></h2><p>${pode ? 'Na fonte: escolha um equipamento.' : 'Volte à base para comprar. H inicia o retorno.'}</p><div class="moba-venda">${sim.local.inventario.map((id, i) => `<button data-vender="${i}" ${!pode ? 'disabled' : ''}>Vender ${itemMoba(id)?.nome ?? id} · ${Math.floor((itemMoba(id)?.custo ?? 0) * 0.7)} ouro</button>`).join('')}</div><div class="moba-loja-itens">${ITENS_MOBA.map((i) => `<button data-item="${i.id}" ${!pode || sim.local.ouro < i.custo || sim.local.inventario.length >= 6 ? 'disabled' : ''}><strong>${i.nome}</strong><span>${i.descricao}</span><b>${i.custo} ouro</b></button>`).join('')}</div><button data-acao="fechar">Fechar loja · Esc</button>`;
    } else if (this.placar)
      conteudo = `<h2>Placar · ${tempo(sim.tempo)}</h2><div class="moba-tabela"><table><thead><tr><th>Herói</th><th>Nível</th><th>A / M / A</th><th>Tropas</th><th>Ouro</th></tr></thead><tbody>${sim.herois.map((h, i) => `<tr class="${h.time === sim.local.time ? 'aliado' : 'inimigo'}"><td>${i === 0 ? 'Você' : h.time === sim.local.time ? 'Bot aliado' : 'Bot inimigo'} · ${h.nome}</td><td>${h.nivel}</td><td>${h.abates} / ${h.mortes} / ${h.assistencias}</td><td>${h.cs}</td><td>${Math.floor(h.ouro)}</td></tr>`).join('')}</tbody></table></div><button data-acao="fechar">Fechar placar</button>`;
    else if (sim.estado === 'pausa')
      conteudo = `<h2>Partida pausada</h2><p>A arena aguarda você.</p><button data-acao="continuar">Continuar · Esc</button><button data-acao="ajuda">Controles</button><button data-acao="reiniciar">Reiniciar partida</button><button data-acao="menu">Escolher outro herói</button>`;
    else if (sim.estado === 'vitoria' || sim.estado === 'derrota')
      conteudo = `<span class="moba-kicker">NÚCLEO DESTRUÍDO</span><h2>${sim.estado === 'vitoria' ? 'Vitória da sua equipe!' : 'Derrota da sua equipe'}</h2><p>${tempo(sim.tempo)} de batalha · ${sim.local.abates} abates · ${sim.local.assistencias} assistências</p><button data-acao="reiniciar">Jogar novamente</button><button data-acao="menu">Escolher outro herói</button>`;
    this.modal.hidden = !conteudo;
    this.modal.innerHTML = conteudo
      ? `<div class="moba-modal-caixa" role="dialog" aria-modal="true" aria-label="${this.ajuda ? 'Controles' : this.loja ? 'Loja' : this.placar ? 'Placar' : 'Partida'}">${conteudo}</div>`
      : '';
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
    const bar = (s: string, v: number, max: number, text: string) => {
      const e = this.q(s);
      (e.querySelector('i') as HTMLElement).style.width =
        `${Math.max(0, Math.min(100, (v / max) * 100))}%`;
      e.querySelector('span')!.textContent = text;
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
      `◈ ${Math.floor(h.ouro)} ouro · ${h.abates}/${h.mortes}/${h.assistencias} · ${h.cs} tropas`;
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
    teclas.forEach((t, i) => {
      const b = this.q<HTMLButtonElement>(`[data-skill="${i}"]`);
      b.querySelector('small')!.textContent = d.habilidades[i].nome;
      b.querySelector('em')!.textContent =
        h.recargas[i] > 0
          ? Math.ceil(h.recargas[i]).toString()
          : !h.niveis[i]
            ? '🔒'
            : `${d.habilidades[i].custo}`;
      b.title = `${d.habilidades[i].descricao} · Nível ${h.niveis[i]}`;
      b.dataset.indisponivel = String(
        !h.niveis[i] || h.recargas[i] > 0 || h.mana < d.habilidades[i].custo
      );
      this.q(`[data-evoluir="${i}"]`).hidden = !h.pontos;
    });
    this.q('.moba-inventario').innerHTML = Array.from(
      { length: 6 },
      (_, i) =>
        `<span title="${h.inventario[i] ? itemMoba(h.inventario[i])?.nome : 'Espaço vazio'}">${h.inventario[i] ? itemMoba(h.inventario[i])?.nome.slice(0, 2) : '·'}</span>`
    ).join('');
    this.q('[data-acao="ward"] small').textContent =
      sim.recargaWard > 0 ? `${Math.ceil(sim.recargaWard)}s` : 'Ward · G';
    this.desenharMinimapa();
    if (this.loja) this.atualizarLoja();
  }
  private atualizarLoja() {
    const h = this.sim.local;
    const base = BASES_MOBA[h.time];
    const pode =
      this.sim.estado === 'jogando' && h.vivo && Math.hypot(h.x - base.x, h.z - base.z) <= 13;
    const ouro = this.modal.querySelector('h2 small');
    if (ouro) ouro.textContent = `${Math.floor(h.ouro)} ouro · ${h.inventario.length}/6 espaços`;
    const aviso = this.modal.querySelector('p');
    if (aviso)
      aviso.textContent = pode
        ? 'Na fonte: escolha um equipamento.'
        : 'Volte à base para comprar. H inicia o retorno.';
    for (const b of this.modal.querySelectorAll<HTMLButtonElement>('[data-item]')) {
      const item = itemMoba(b.dataset.item!);
      b.disabled = !pode || !item || h.ouro < item.custo || h.inventario.length >= 6;
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
