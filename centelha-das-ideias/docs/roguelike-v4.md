# Ascensão Arcana — 0.4.0

## Objetivo e restrições

Melhorar a fluidez e o espetáculo do jogo existente sem retirar modos, personagens, poderes ou sistemas. A referência de combate é Vampire Survivors: armas automáticas acumuladas em uma build, evolução perceptível e estilos distintos. O básico manual de cada herói permanece habilitado desde o início.

## Implementação

- Seletor compartilhado Aventura/Sobrevivência nos dois menus. Aventura não havia sido excluída: faltava acesso visível no menu padrão. Alterar somente o parâmetro modo mantém conta, salvamento e demais parâmetros.
- Limite solo de 100 criaturas, +20 por participante até 160; reserva 2 vagas de chefe, surgimento sem dívida de relógio e fila de horda limitada. Instâncias continuam agrupadas por tipo.
- Onze heróis: Aeria e Fênix acrescentam voo, asas animadas e golpes pessoais, com metadados de altura para colisões de obstáculos.
- Dezenove inimigos: todos os 17 anteriores remodelados, mais Morcego Rúnico e Arraia Celeste. Paletas por parte, rosto, dentes, placas, asas, coroas e carapaças em uma geometria por tipo.
- XP em quatro silhuetas de energia, materiais autoluminosos e faíscas instanciadas, sem luz individual por fragmento.
- Quarenta e quatro poderes: os 32 anteriores permanecem e 12 especiais acrescentam trajetórias, anéis, correntes, armadilhas, presas móveis e padrões de área próprios. Progressão global e órbitas usam valores compartilhados entre gameplay e prévia.

## Arquivos e integração

Núcleo: jogo/partida.ts, nucleo/limites-populacao.ts, nucleo/orbitas.ts e nucleo/progresso.ts.
Conteúdo: dados/personagens.ts, dados/inimigos.ts, dados/habilidades.ts e dados/ataques-basicos.ts.
Visual: render/modelo-claude.ts, render/aparencia-inimigos.ts, render/cristais-xp.ts, fx/especiais.ts e fx/assinaturas.ts.
Acesso: ui/modos.ts, principal.ts e interfaces dos dois modos.

## Verificação

Testes unitários de cap, reserva de chefe, órbitas, colisão aérea, modelos finitos e mecânicas especiais. E2E dos modos em 844×390, 640×360 e 1260×720, regressão de pausa/ataque e sonda de lotação reproduzível em testes/e2e/desempenho-v4.mjs. O tempo medido de simulação não equivale a FPS de um celular físico. Resultados finais ficam em docs/registro.md.
