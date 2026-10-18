# Expansão 0.5.0

## Modos e escopo

Aventura e Sobrevivência continuam disponíveis. O menu passa a abrir também MOBA 5×5 contra nove bots,
com 25 personagens animais, seis classes, passivas e 100 habilidades. É uma implementação local jogável;
não oferece ainda PvP online, matchmaking, ranking, contas em servidor ou todo o conteúdo de LoL/Dota.
A cooperação WebRTC da Sobrevivência foi preservada.

## Sobrevivência

- Terreno contínuo determinístico em regiões de 32 m, inclusive em coordenadas negativas. Regiões fora da janela
  são recicladas; até 49 regiões em cooperação. Oito lotes instanciados e orçamento fixo de grama.
- Cinco mapas: Jardim, Forja, Abismo, Aurora e Coral. Desbloqueios por XP da conta: 0/200/600/1200/2000.
- Minichefe aos 300 s, Mega Chefe aos 720 s por mundo; hordas a cada 120 s. Curva de inimigos 2,25 vezes mais lenta;
  XP requerido aumentado após os níveis iniciais. O tempo exclui pausa, cartas e apresentações.
- Bandos com trajetória reta em V, aviso prévio e saída do campo; compartilham o limite global de inimigos.
- Fontes, totens e baús acompanham a geração do mundo. Consumo sincronizado com memória limitada a 32.768 IDs exatos; após esse limite, os recursos mais antigos podem renovar.
- Cinco arquétipos de chefes, modelos e ataques distintos. Portais continuam levando ao próximo mapa.
- XP mágico com núcleo saturado, contorno escuro e brilho separado, mais alto sobre o terreno.
- Sete armas iniciais, seis roupas, novos acessórios e 50 poderes automáticos com evoluções nos níveis 5 e 10.
  O ataque básico manual continua disponível desde o início e separado das cartas.

## MOBA

Três rotas, tropas periódicas, duas torres e um inibidor por rota e por time, núcleo protegido pelos objetivos.
Seis campos de selva, chefe com bônus, ouro, último golpe, experiência, níveis até 18, mana e habilidades com pontos.
Loja de 14 itens com seis espaços; compra/venda somente na base, revenda por 70%.
Fonte, retorno canalizado cancelável, respawn, assistências, placar, visão, sentinelas e sinais.
Bots avançam nas rotas, conjuram, compram e recuam. Vitória e derrota permitem selecionar outro herói.
Controles com teclado/mouse e toque em paisagem. Veja a tabela no README.

## Referências de mecânicas

Adaptamos conceitos de progressão, composição de build e objetivos, com nomes, modelos e kits próprios:

- [League of Legends — Como jogar](https://www.leagueoflegends.com/pt-br/how-to-play/): três rotas, estruturas,
  equipes, selva, ouro, experiência e habilidades.
- [Dota 2 — New Frontiers](https://www.dota2.com/newfrontiers): exploração e objetivos de mapa.
- [Vampire Survivors](https://store.steampowered.com/app/1794680/Vampire_Survivors/): armas automáticas e builds de evolução.
- [Brotato](https://store.steampowered.com/app/1942280/Brotato/): escolhas de armas e sinergias de atributos.

## Entrega e verificação

Compilar: `pnpm compilar`. Testes: `pnpm testar`. MOBA em navegador: `node testes/e2e/moba-v5.mjs`.
O workflow Centelha Android gera APK offline em sensorLandscape. A hospedagem online usa o mesmo endereço
com `?modo=moba`, `?modo=roguelike` ou `?modo=aventura`.

As medições automatizadas de simulação e WebGL em Chromium não equivalem ao desempenho de um celular físico.
