import { criarAudio } from '../audio/indice';
import type { ApiAudio, IdSom } from '../audio/contrato';
import type { SimulacaoMoba } from './simulacao';

/** Timbres diferentes para cada família; o motor compartilhado limita as vozes. */
export const SOM_EFEITO_MOBA: Readonly<Record<string, IdSom>> = {
  projetil: 'poderMisseis',
  linha: 'poderLaminaVento',
  cone: 'poderChicoteLuz',
  area: 'poderNovaGlacial',
  cura: 'curar',
  escudo: 'criarEscudo',
  salto: 'esquiva',
  puxao: 'poderAncoraCeleste',
  invocar: 'criarAliado',
  raiz: 'poderJardimEspinhos',
  orbita: 'poderOrquestraOrbital',
  canal: 'poderPulsoSonico',
  veneno: 'poderNuvemToxica',
  troca: 'poderPortalBumerangue',
  raio: 'projetilEco',
  impacto: 'acerto',
  queda: 'inimigoDerrotado',
  nivel: 'comemoracao',
  ward: 'revelar',
  ping: 'inimigoAlerta',
  recall: 'conectarInicio',
  lampejo: 'conectarOk',
};

export class AudioMoba {
  private ultimoEfeito = 0;
  private tempo = -1;
  private estado = '';
  private vida = 0;
  private ultimoDano = -1;
  private suspenso = false;
  private habilitado = true;
  constructor(readonly audio: ApiAudio & { destruir?: () => void } = criarAudio()) {
    audio.definirVolume('musica', 0.23);
    audio.definirVolume('efeitos', 0.6);
  }
  desbloquear(): void {
    this.audio.desbloquear();
  }
  atualizar(sim: SimulacaoMoba, habilitado: boolean): void {
    const reiniciou =
      sim.tempo < this.tempo || (this.estado === 'menu' && sim.estado === 'jogando');
    if (reiniciou) {
      this.ultimoEfeito = 0;
      this.ultimoDano = -1;
      this.vida = sim.local.vida;
    }
    const pausar = sim.estado === 'pausa' || !habilitado;
    if (pausar !== this.suspenso) {
      this.audio.suspender(pausar);
      this.suspenso = pausar;
    }
    if (habilitado !== this.habilitado) {
      this.audio.definirVolume('geral', habilitado ? 0.8 : 0);
      this.habilitado = habilitado;
    }
    if (sim.estado !== this.estado) {
      this.audio.musica(
        sim.estado === 'menu'
          ? 'titulo'
          : sim.estado === 'vitoria'
            ? 'vitoria'
            : sim.estado === 'derrota'
              ? null
              : 'oficina'
      );
      if (habilitado && sim.estado === 'derrota') this.audio.tocar('derrota');
      if (habilitado && sim.estado === 'vitoria') this.audio.tocar('missaoConcluida');
    }
    this.audio.definirOuvinte(sim.local.x, sim.local.z);
    let vozes = 0;
    for (const e of sim.efeitos) {
      if (e.id <= this.ultimoEfeito) continue;
      this.ultimoEfeito = Math.max(this.ultimoEfeito, e.id);
      if (
        pausar ||
        sim.estado === 'menu' ||
        Math.hypot(e.x - sim.local.x, e.z - sim.local.z) > 34 ||
        !sim.visivel(sim.local.time, e.x, e.z) ||
        vozes >= 5
      )
        continue;
      const som = SOM_EFEITO_MOBA[e.tipo];
      if (som) {
        this.audio.tocar(som, { x: e.x, y: e.z, volume: e.tipo === 'impacto' ? 0.3 : 0.65 });
        vozes++;
      }
    }
    if (
      !pausar &&
      sim.estado === 'jogando' &&
      sim.local.vida < this.vida &&
      sim.tempo - this.ultimoDano > 0.4
    ) {
      this.audio.tocar('danoRecebido', { volume: 0.35 });
      this.ultimoDano = sim.tempo;
    }
    this.audio.definirIntensidade(
      Math.min(
        1,
        sim.efeitos.filter((e) => Math.hypot(e.x - sim.local.x, e.z - sim.local.z) < 16).length / 10
      )
    );
    this.vida = sim.local.vida;
    this.tempo = sim.tempo;
    this.estado = sim.estado;
  }
  descartar(): void {
    this.audio.destruir?.();
  }
}
