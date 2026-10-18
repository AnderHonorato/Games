import type { SimulacaoMoba } from './simulacao';
import type { RenderMoba } from './render';
import type { InterfaceMoba } from './ui';
export class EntradaMoba {
  private abort = new AbortController();
  private teclas = new Set<string>();
  private wInicio = 0;
  private joystick: number | null = null;
  private origem = { x: 0, y: 0 };
  mira: { x: number; z: number } | null = null;
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
        if ((e.target as HTMLElement).matches('input,textarea,select')) return;
        const k = e.key.toLowerCase();
        if (k === 'tab') {
          e.preventDefault();
          if (!e.repeat) ui.mostrarPlacar(true);
          return;
        }
        if (k === 'escape') {
          e.preventDefault();
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
        this.mira = render.ponto(e.clientX, e.clientY);
      },
      opts
    );
    canvas.addEventListener(
      'pointerdown',
      (e) => {
        if (sim.estado !== 'jogando' || ui.loja || ui.placar || ui.ajuda) return;
        const p = render.ponto(e.clientX, e.clientY);
        this.mira = p;
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
        this.mira = { x, z };
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
