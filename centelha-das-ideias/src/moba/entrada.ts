import type { SimulacaoMoba } from './simulacao';
import type { RenderMoba } from './render';
import type { InterfaceMoba } from './ui';
import { heroiMoba } from './dados';
import { limitarMira } from './mira';
export class EntradaMoba {
  private abort = new AbortController();
  private teclas = new Set<string>();
  private wInicio = 0;
  private joystick: number | null = null;
  private origem = { x: 0, y: 0 };
  mira: { x: number; z: number } | null = null;
  private gesto?: {
    id: number;
    botao: HTMLElement;
    slot: number;
    x: number;
    y: number;
    arrastou: boolean;
    cancelado?: boolean;
  };
  private cliqueCancelado?: { botao: HTMLElement; ate: number };
  constructor(
    readonly canvas: HTMLCanvasElement,
    readonly sim: SimulacaoMoba,
    readonly render: RenderMoba,
    readonly ui: InterfaceMoba
  ) {
    const opts = { signal: this.abort.signal };
    window.addEventListener(
      'keydown',
      (e) => {
        if ((e.target as HTMLElement)?.matches?.('input,textarea,select')) return;
        const k = e.key.toLowerCase();
        if (k === 'tab') {
          e.preventDefault();
          if (!e.repeat) ui.mostrarPlacar(true);
          return;
        }
        if (k === 'escape') {
          e.preventDefault();
          if (this.gesto) {
            this.gesto.cancelado = true;
            this.render.definirMira(null);
            return;
          }
          if (!e.repeat) {
            if (ui.loja || ui.placar || ui.ajuda) ui.fechar();
            else ui.pausar();
          }
          return;
        }
        if (sim.estado !== 'jogando' || e.repeat) return;
        if (
          ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)
        )
          e.preventDefault();
        if (e.shiftKey && 'qwer'.includes(k)) {
          sim.evoluir('qwer'.indexOf(k));
          return;
        }
        if (k === 'w') {
          this.wInicio = performance.now();
          this.teclas.add(k);
          this.movimento();
          return;
        }
        if (['a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
          this.teclas.add(k);
          this.movimento();
          return;
        }
        if ('qer'.includes(k)) {
          this.skill('qwer'.indexOf(k));
          return;
        }
        if (['1', '2', '3', '4'].includes(k)) {
          this.skill(Number(k) - 1);
          return;
        }
        if (k === 'j' || k === ' ') sim.atacar();
        if (k === 'f' || k === 't') {
          const tipo = k === 'f' ? 'lampejo' : 'cura';
          if (!sim.usarFeitico(tipo, this.mira?.x, this.mira?.z))
            ui.avisar(
              tipo === 'cura' && sim.local.vida >= sim.local.vidaMax
                ? 'Sua vida já está completa.'
                : 'Feitiço em recarga ou herói incapacitado.'
            );
        }
        if (k === 'b') ui.alternarLoja();
        if (k === 'h')
          ui.avisar(sim.retornarBase() ? 'Retornando à base em 8s.' : 'Retorno indisponível.');
        if (k === 'g') {
          const p = this.mira ?? sim.local;
          ui.avisar(
            sim.ward(p.x, p.z)
              ? 'Sentinela colocada.'
              : 'Sentinela em recarga ou fora de alcance (18m).'
          );
        }
        if (k === 'p') {
          const p = this.mira ?? sim.local;
          sim.ping(p.x, p.z);
        }
      },
      opts
    );
    window.addEventListener(
      'keyup',
      (e) => {
        const k = e.key.toLowerCase();
        if (k === 'tab') {
          ui.mostrarPlacar(false);
          return;
        }
        const estava = this.teclas.delete(k);
        if (estava) {
          this.movimento();
          if (k === 'w' && performance.now() - this.wInicio < 170 && sim.estado === 'jogando')
            this.skill(1);
        }
      },
      opts
    );
    window.addEventListener(
      'blur',
      () => {
        this.soltar();
        ui.mostrarPlacar(false);
        if (sim.estado === 'jogando') {
          sim.pausar(true);
          ui.atualizar();
        }
      },
      opts
    );
    document.addEventListener(
      'visibilitychange',
      () => {
        if (document.hidden) {
          this.soltar();
          if (sim.estado === 'jogando') sim.pausar(true);
        }
      },
      opts
    );
    canvas.addEventListener('contextmenu', (e) => e.preventDefault(), opts);
    canvas.addEventListener(
      'pointermove',
      (e) => {
        this.definirAlvo(render.ponto(e.clientX, e.clientY));
      },
      opts
    );
    canvas.addEventListener(
      'pointerdown',
      (e) => {
        if (sim.estado !== 'jogando' || ui.loja || ui.placar || ui.ajuda) return;
        const p = render.ponto(e.clientX, e.clientY);
        this.definirAlvo(p);
        if (e.shiftKey) {
          sim.ping(p.x, p.z);
          return;
        }
        const inimigo = [...sim.herois, ...sim.unidades, ...sim.estruturas]
          .filter(
            (a) =>
              a.vida > 0 &&
              a.time !== sim.local.time &&
              sim.visivel(sim.local.time, a.x, a.z) &&
              Math.hypot(a.x - p.x, a.z - p.z) < a.raio + 2.2
          )
          .sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0];
        if (inimigo) sim.atacar(inimigo.id);
        else sim.moverPara(p.x, p.z);
      },
      opts
    );
    ui.minimapa.addEventListener(
      'pointerdown',
      (e) => {
        if (sim.estado !== 'jogando') return;
        e.preventDefault();
        const r = ui.minimapa.getBoundingClientRect(),
          x = ((e.clientX - r.left) / r.width) * 180 - 90,
          z = ((e.clientY - r.top) / r.height) * 180 - 90;
        this.definirAlvo({ x, z });
        if (e.shiftKey) sim.ping(x, z);
        else sim.moverPara(x, z);
      },
      opts
    );
    const joy = ui.elemento.querySelector<HTMLElement>('.moba-joystick')!,
      manete = joy.querySelector<HTMLElement>('i')!;
    joy.addEventListener(
      'pointerdown',
      (e) => {
        if (sim.estado !== 'jogando') return;
        e.preventDefault();
        this.joystick = e.pointerId;
        joy.setPointerCapture(e.pointerId);
        const r = joy.getBoundingClientRect();
        this.origem = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        this.arrastar(e, manete);
      },
      opts
    );
    joy.addEventListener(
      'pointermove',
      (e) => {
        if (e.pointerId === this.joystick) this.arrastar(e, manete);
      },
      opts
    );
    const fim = (e: PointerEvent) => {
      if (e.pointerId === this.joystick) {
        this.joystick = null;
        manete.style.transform = '';
        this.sim.mover(0, 0);
      }
    };
    joy.addEventListener('pointerup', fim, opts);
    joy.addEventListener('pointercancel', fim, opts);
    joy.addEventListener('lostpointercapture', fim, opts);
    this.instalarMira();
  }
  private definirAlvo(p: { x: number; z: number }) {
    this.mira = p;
    this.ui.mira = p;
  }
  private instalarMira(): void {
    const opts = { signal: this.abort.signal };
    this.ui.elemento.addEventListener(
      'pointerdown',
      (e) => {
        const b = (e.target as HTMLElement).closest<HTMLElement>('[data-skill]');
        if (
          !b ||
          this.sim.estado !== 'jogando' ||
          this.ui.loja ||
          this.ui.ajuda ||
          this.ui.placar ||
          this.gesto
        )
          return;
        this.gesto = {
          id: e.pointerId,
          botao: b,
          slot: Number(b.dataset.skill),
          x: e.clientX,
          y: e.clientY,
          arrastou: false,
        };
        b.setPointerCapture(e.pointerId);
      },
      opts
    );
    this.ui.elemento.addEventListener(
      'pointermove',
      (e) => {
        const g = this.gesto;
        if (!g || g.id !== e.pointerId || g.cancelado) return;
        if (Math.hypot(e.clientX - g.x, e.clientY - g.y) > 9) g.arrastou = true;
        if (!g.arrastou) return;
        e.preventDefault();
        const d = heroiMoba(this.sim.local.defId).habilidades[g.slot];
        const inicio = this.render.ponto(g.x, g.y, false);
        const fim = this.render.ponto(e.clientX, e.clientY, false);
        const alvo = limitarMira(
          this.sim.local,
          { x: this.sim.local.x + fim.x - inicio.x, z: this.sim.local.z + fim.z - inicio.z },
          d.alcance
        );
        this.definirAlvo(alvo);
        this.render.definirMira({
          ...alvo,
          alcance: d.alcance,
          raio: d.raio,
          tipo: d.tipo,
          cor: d.cor,
        });
      },
      opts
    );
    this.ui.elemento.addEventListener(
      'pointerup',
      (e) => {
        const g = this.gesto;
        if (!g || g.id !== e.pointerId) return;
        const alvo = this.mira;
        if (g.arrastou || g.cancelado) {
          e.preventDefault();
          this.cliqueCancelado = { botao: g.botao, ate: performance.now() + 700 };
          const tela = this.canvas.getBoundingClientRect();
          if (
            !g.cancelado &&
            this.sim.estado === 'jogando' &&
            e.clientX >= tela.left &&
            e.clientX <= tela.right &&
            e.clientY >= tela.top &&
            e.clientY <= tela.bottom
          )
            this.ui.usarSkill(g.slot, alvo?.x, alvo?.z);
        }
        this.cancelarMira();
      },
      opts
    );
    this.ui.elemento.addEventListener('pointercancel', () => this.cancelarMira(), opts);
    this.ui.elemento.addEventListener(
      'lostpointercapture',
      (e) => {
        if (this.gesto?.id === e.pointerId) this.cancelarMira();
      },
      opts
    );
    this.ui.elemento.addEventListener(
      'click',
      (e) => {
        const c = this.cliqueCancelado;
        if (c && performance.now() <= c.ate && c.botao.contains(e.target as Node)) {
          e.preventDefault();
          e.stopImmediatePropagation();
          this.cliqueCancelado = undefined;
        }
      },
      { ...opts, capture: true }
    );
  }
  private cancelarMira(): void {
    this.gesto = undefined;
    this.render.definirMira(null);
  }
  private arrastar(e: PointerEvent, m: HTMLElement) {
    const dx = e.clientX - this.origem.x,
      dz = e.clientY - this.origem.y,
      n = Math.hypot(dx, dz),
      s = Math.min(36, n) / (n || 1);
    m.style.transform = `translate(${dx * s}px,${dz * s}px)`;
    this.sim.mover(dx / 36, dz / 36);
  }
  private movimento() {
    this.sim.mover(
      Number(this.teclas.has('d') || this.teclas.has('arrowright')) -
        Number(this.teclas.has('a') || this.teclas.has('arrowleft')),
      Number(this.teclas.has('s') || this.teclas.has('arrowdown')) -
        Number(this.teclas.has('w') || this.teclas.has('arrowup'))
    );
  }
  private skill(i: number) {
    const p = this.mira;
    this.ui.usarSkill(i, p?.x, p?.z);
  }
  soltar() {
    this.cancelarMira();
    this.mira = this.ui.mira = null;
    this.teclas.clear();
    this.joystick = null;
    this.sim.mover(0, 0);
    const m = this.ui.elemento.querySelector<HTMLElement>('.moba-joystick i');
    if (m) m.style.transform = '';
  }
  descartar() {
    this.soltar();
    this.abort.abort();
  }
}
