import './estilos.css';
import { SimulacaoMoba } from './simulacao';
import { RenderMoba } from './render';
import { InterfaceMoba } from './ui';
import { EntradaMoba } from './entrada';
import { BASES_MOBA } from './rotas';
export function iniciarMoba(canvas: HTMLCanvasElement, raiz: HTMLElement): void {
  document.body.classList.add('modo-moba');
  canvas.classList.add('moba-canvas');
  const sim = new SimulacaoMoba();
  let render: RenderMoba;
  try {
    render = new RenderMoba(canvas);
  } catch (e) {
    const erro = document.createElement('p');
    erro.className = 'moba-erro';
    erro.textContent = 'A arena 3D precisa de WebGL. Ative a aceleração gráfica e recarregue.';
    raiz.append(erro);
    console.error(e);
    return;
  }
  let entrada: EntradaMoba | undefined;
  const ui = new InterfaceMoba(
    raiz,
    sim,
    (d) => render.selecionar(d),
    () => {
      entrada?.soltar();
      sim.iniciar(ui.escolhido);
      ui.atualizar();
    },
    () => entrada?.soltar()
  );
  entrada = new EntradaMoba(canvas, sim, render, ui);
  let anterior = performance.now(),
    acumulado = 0,
    tempoUI = 0,
    frame = 0,
    encerrado = false;
  const loop = (agora: number) => {
    if (encerrado) return;
    const dt = Math.min(0.1, (agora - anterior) / 1000);
    anterior = agora;
    acumulado += dt;
    while (acumulado >= 1 / 60) {
      sim.atualizar(1 / 60);
      acumulado -= 1 / 60;
    }
    render.desenhar(sim, dt);
    tempoUI += dt;
    if (tempoUI >= 0.1) {
      ui.atualizar();
      tempoUI = 0;
    }
    frame = requestAnimationFrame(loop);
  };
  frame = requestAnimationFrame(loop);
  const snapshot = () => ({
    estado: sim.estado,
    tempo: sim.tempo,
    local: {
      ...sim.local,
      recargas: [...sim.local.recargas],
      inventario: [...sim.local.inventario],
    },
    herois: sim.herois.map((h) => ({
      id: h.id,
      nome: h.nome,
      time: h.time,
      x: h.x,
      z: h.z,
      vida: h.vida,
      vivo: h.vivo,
    })),
    estruturas: sim.estruturas.map((e) => ({ ...e })),
    visiveis: sim.herois.filter((h) => sim.visivel(sim.local.time, h.x, h.z)).map((h) => h.id),
    recursos: {
      geometrias: render.renderer.info.memory.geometries,
      texturas: render.renderer.info.memory.textures,
      drawCalls: render.renderer.info.render.calls,
    },
  });
  const fixture = (nome: string) => {
    if (
      !['localhost', '127.0.0.1'].includes(location.hostname) &&
      !new URLSearchParams(location.search).has('teste')
    )
      return false;
    if (sim.estado === 'menu') return false;
    entrada?.soltar();
    if (nome === 'combate') {
      Object.assign(sim.local, { x: 0, z: 0, vida: sim.local.vidaMax, mana: sim.local.manaMax });
      const h = sim.herois.find((h) => h.time !== sim.local.time)!;
      Object.assign(h, { x: 5, z: -3, vivo: true, vida: h.vidaMax });
    } else if (nome === 'loja') {
      Object.assign(sim.local, BASES_MOBA[sim.local.time]);
      sim.local.ouro = 12000;
    } else if (nome === 'nivel') {
      sim.local.nivel = 18;
      sim.local.pontos = 18;
      sim.local.niveis = [1, 1, 1, 1];
      sim.local.recargas = [0, 0, 0, 0];
      sim.local.mana = sim.local.manaMax;
    } else if (nome === 'vitoria' || nome === 'derrota') {
      sim.estado = nome;
      sim.vencedor = nome === 'vitoria' ? sim.local.time : ((1 - sim.local.time) as 0 | 1);
    } else return false;
    ui.atualizar();
    return true;
  };
  const api = { sim, snapshot, fixture, versao: '0.5.0' };
  (window as unknown as { __moba: typeof api }).__moba = api;
  window.addEventListener(
    'pagehide',
    (evento) => {
      if (evento.persisted) return;
      encerrado = true;
      cancelAnimationFrame(frame);
      entrada?.descartar();
      ui.descartar();
      render.descartar();
    },
    { once: true }
  );
  ui.atualizar();
}
