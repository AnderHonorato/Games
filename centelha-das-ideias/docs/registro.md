# Registro de desenvolvimento

Registro curto para retomar o trabalho após interrupções. Mais recente no topo.

## Novos Mundos — 16/10/2026

- Destino do projeto: `AnderHonorato/Games`, pasta `centelha-das-ideias`.
- Menu com apresentação 3D, abas Herói/Ateliê/Mundos e perfil persistente (nome, roupa, partes e cores, arma).
- Seis avanços próprios, três armas equipadas com ataque manual e seleção de ameaça no alcance.
- Conta permanente libera Jardim/Forja/Abismo com 0/200/600 XP, separada do nível temporário.
- Mini aos 75 s e Mega aos 180 s; apresentações, portal e reset de build/nível ao mudar de mundo.
- Personagens com fala, gestos e emoções; marcos visuais de nível 10 e 20.
- 28 assinaturas visuais e sonoras de habilidades; ruptura de força no nível 10; inimigos aceleram gradualmente.
- Coop sincroniza nomes, roupas, armas, XP, mapa e cinemáticas. Posições usam identificador de fase para rejeitar mensagens atrasadas após portal/reinício.
- Corrigidos retorno solo após prévia de mapa bloqueado, XP desatualizado da sala, persistência do mapa convidado e clique após editar nome.
- Verificação atual: 112 testes unitários e TypeScript/Vite aprovados; rota completa da aventura aprovada sem erros de navegador.
- Campanha de navegador aprovada: perfil, três armas, chefes, pausa, transição e cooperação em memória; reset de posição/build/nível e XP sem duplicação.
- Paisagem aprovada em 844×390 e 640×360, nos dois modos, com controles dentro da tela.
- APK final: assembleDebug + lintDebug aprovados (0 erros, 3 avisos), assinatura v2 válida, versão 2/0.2.0 em sensorLandscape; assets idênticos ao HTML final.
- Teste físico no Galaxy A35 e conexão WebRTC entre aparelhos continuam necessários. O teste WebRTC deste ambiente não concluiu o carregamento da segunda aba; não é considerado aprovado.
- GitHub Actions: setup-android configurado com platform-tools, evitando o pacote legado tools que não existe mais no SDK.

## Continuação — 15/10/2026

- Base: PR #1, commit `a2e5867`, Three.js r170 + Vite; sobrevivência e aventura preservadas.
- Corrigido reinício de sobrevivência: esquiva, recarga e bloqueios do Ransomware não passam mais para a rodada seguinte.
- Ciclo de vida compartilhado entre navegador e Android: pausa explícita, suspensão do áudio e salvamento da aventura; voltar ao app não retoma o combate automaticamente.
- Detecção exige WebGL 2, como o renderizador; WebGL 1 sozinho não é suficiente.
- Restaurado `pnpm e2e`: servidor temporário, rota da aventura com modo correto e teste de multijogador. Erros do navegador reprovam a execução.
- Wrapper Android offline com APK debug e workflow de compilação; instruções em `docs/android.md`.
- Tela deitada fixa no Android (`sensorLandscape`); botão de tela cheia/orientação no navegador e menus ajustados para pouca altura. Teste de ambos os modos em 844×390 e 640×360 aprovado.
- Pausa da aventura preserva diálogos e cenas; ao suspender, comandos e identificadores de toque são liberados.
- Verificação: 54 testes unitários e build TypeScript/Vite aprovados; rota completa da aventura aprovada, sem erros no navegador.
- Android: `assembleDebug lintDebug --offline` aprovado, assinatura APK v2 válida e assets idênticos ao build web. Lint: 0 erros, 3 avisos (orientação fixa exigida, compatibilidade do Back e regras opcionais de backup).
- Teste WebRTC não completou nesta imagem: nenhum candidato ICE é gerado, inclusive fora do jogo, e a enumeração de interfaces do sistema falha. O comando retorna erro, sem ignorar o problema.
- Pendente: teste físico no Galaxy A35 e avaliação humana de duração/equilíbrio da partida.

As decisões e pendências abaixo são o histórico do protótipo; não descrevem o estado atual.

## Decisões

- **D1 — Tecnologia:** TypeScript + Vite + motor próprio em Canvas 2D (ver `docs/tecnologia.md`). Arte procedural vetorial desenhada a cada quadro; chão estático em cache por pedaços.
- **D2 — Entrega:** build em arquivo único (`vite-plugin-singlefile`): `dist/index.html` roda offline, inclusive aberto do disco.
- **D3 — APK:** inviável nesta sessão: `dl.google.com` (Android SDK) bloqueado pela política de rede. Entrega web responsiva para celular.
- **D4 — Mascote:** as imagens de referência não chegaram à sessão; identidade baseada no mascote do Claude Code (corpo retangular terracota, olhos escuros, bracinhos, quatro perninhas).
- **D5 — Organização multiagente:** contratos em `src/contratos`, responsáveis por arquivo em `docs/contratos.md`; agentes trabalham em worktrees isoladas e o orquestrador integra.
- **D6 — Fronteira:** definida só em `src/dados/mundo.ts` (`MUNDO.fronteira`); blocos `F` aplicados pelo mundo; bloqueia andar, pular, esquivar, projéteis, fios e criações.

## Concluído

- Núcleo: motor (laço fixo 60 Hz, entrada teclado/mouse/controle/toque virtual, câmera, partículas), mundo (grade, alturas, vãos, linha de visão, fronteira), física com alturas, Claude jogável (8 direções, corrida, pulo com coiote/buffer, esquiva, beirada, queda em vão, dano, humor, piscar), entidades simples, salvamento versionado, cenas puláveis, renderizador com ordenação.
- Sonda Playwright (`ferramentas/sondar.mjs`) validou: movimento, parada na beirada da água funda, pulo (z 36 px), console limpo.

## Pendências

- Integração dos módulos dos agentes (arte, áudio, combate, habilidades, interface, conteúdo).
- Revisão crítica com partidas reais e medição de tempo.
- Publicação (link) e pacote para download.
