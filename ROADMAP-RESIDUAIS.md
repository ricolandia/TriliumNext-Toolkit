# Roadmap de Residuais — TriliumNext Toolkit

Residuais das rodadas de auditoria por especialistas (`AUDITORIA-ESPECIALISTAS.md`).
**Regra:** durante as rodadas (3 a 15) só os achados de alto valor viram batch de
correção; o que ficar de fora é migrado para cá. A execução deste roadmap acontece
**depois da rodada 15** (todos os plugins auditados; a fila perdeu o Daily-Note-Map
em 29/09/2026), com uma **triagem única** de prioridade.

- **Estado:** 🔲 a fazer (nada executado ainda — o roadmap começa a ser pago só na volta).
- **Ordem sugerida na volta:** integridade > UX > manutenção; agrupar por script/widget
  (1 deploy por script/widget, com testes + smoke, padrão dos batches das rodadas 1-2).
- **Refs de linha** são da ocasião do relatório (o código mudou desde então); o ID
  aponta para a seção da rodada no `AUDITORIA-ESPECIALISTAS.md`.
- **Fora do roadmap:** itens de release (bump de `registry.json`, tags, releases no
  GitHub) ficam no `SESSION.md`; as listas antigas de "Melhorias Propostas" do
  `SESSION.md` também não entram aqui.

---

## Weekly Planner (rodada 1)

| ID | Item | Categoria | Esforço | Risco | Onde (ocasião do relatório) | Validação |
|----|------|-----------|:-------:|:-----:|------------------------------|-----------|
| WP-D1.2 | Densidade do mês: muitos sinais em alvo pequeno; badge 🔗 onipresente piora o scan | UX | M | Baixo | `js-planejador.js` `1462-1466`, `1575`, `1517` | revisão visual (claro/escuro, mobile) |
| WP-D1.3 | Contraste morno do fallback do `--muted-text-color` (`#888`, ~3.5:1 no claro com fonte pequena) | UX/a11y | S | Baixo | `163`, `896`, `1161`, `2060` | contraste WCAG no claro/escuro |
| WP-D2.2 | "Hoje"/fim de semana divergem entre views (o Kanban já ganhou tom próprio; falta o resto) | UX | S/M | Baixo | `893`/`897`, `1455-1460`, `1090`/`1138-1140` | conferir as 4 views lado a lado |
| WP-D2.4 | Título muda por view + glifos (`↺ ⟳ ‹ › ✓ ◐`), com risco de tofu no WebView | UX | S | Baixo | `965`, `1159`, `1528`; ícones `966-976` | teste manual no WebView (Android) |
| WP-D2.5 | "Limpar" só com ícone `↺`, sem rótulo/perigo | UX | S | Baixo | `975`, `1169`, `1538` | manual |
| WP-D4.3 | Scroll horizontal e drag disputam o mesmo gesto; falta alça explícita (⠿) | UX | M | Médio | `887`, `902` | manual em trackpad/celular |
| WP-D5.2 | Vazio/loading sem `role=status`; semana/mês sem mensagem de primeira carga | UX/a11y | S/M | Baixo | `232-244`, `2107-2108` | smoke + leitor de tela |
| WP-D5.3 | Toast de sucesso dedicado para concluir/limpar (hoje o Desfazer cobre) | UX | S | Baixo | `2024-2036`, `1663-1674`, `1351-1363` | manual |
| WP-D8.2 | Piso tipográfico: badges de 8px restantes | UX | S | Baixo | `183-184`, `135-138` | revisão visual mobile |
| WP-C7.3 | Versões divergentes: `manifest` sem `version` × registry publicado × SESSION | Manutenção | S | Baixo | `manifest.json`; registry | reconciliar junto do próximo release |
| WP-C8.1 | Testes restantes: `getWeekCols`/`getMonthDays`, `migrateIds`, `setOrder` | Manutenção | S/M | Baixo | `test-planejador.js` | `bun` (funções puras) |
| WP-C3.4 | Virtualização real das listas (hoje o limite + "+N" segura) | Manutenção/perf | M/L | Médio | render das 3 views | só se o vault crescer muito |

## Writers-Tools (rodada 2)

| ID | Item | Script/Widget | Categoria | Esforço | Risco | Onde (ocasião do relatório) | Validação |
|----|------|--------|-----------|:-------:|:-----:|------------------------------|-----------|
| WT-F-QW9 | Filtro de cenas na sidebar | Fountain | UX | S | Baixo | `1465-1472` | manual (filtrar/limpar) |
| WT-G-QW14 | Botão "abrir compilado" quando o `#compiledDoc` existe | Grid | UX | S | Baixo | `179-180`, `162-167` | manual |
| WT-F-C7.1 | `CSS` × `CSS_IMPRESSAO` duplicados (regras espelhadas) | Fountain | Manutenção | M | Baixo | `331-689` × `693-735` | revisão + smoke |
| WT-F-C4.4 | `htmlParaTexto` só decodifica uma lista fixa de entidades (numéricas ficam literais) | Fountain | Robustez | S | Baixo | `751-757` | `bun` (fixture) |
| WT-F-C4.7 | Import com `confirm()` nativo + texto cru em nota `text` (reavaliar modal próprio) | Fountain | UX/Robustez | S | Baixo | handler de import | manual |
| WT-G-C3.3 | Payload da compilação em passos (manuscritos grandes hoje serializam tudo numa chamada) | Grid | Perf | M | Médio | `362-382` | manual (cronometrar) |
| WT-G-C4.4 | Filtro por tipo/mime: notas não-script (JSON, canvas, imagem) entram como texto cru | Grid | Robustez | S | Médio | `152-155`, `224-234` | manual (mudança de comportamento) |
| WT-G-C4.3 | Alerta de `#compiledDoc` enganoso + título customizado preservado | Grid | Robustez | S | Baixo | `158-160`, `369-370` | manual |

---

## Shared-Notes (rodada 4)

| ID | Item | Categoria | Esforço | Risco | Onde (ocasião do relatório) | Validação |
|----|------|-----------|:-------:|:-----:|------------------------------|-----------|
| SN-QW3+SN-D5.5 | Revogar/gerir convites pela UI (lista com uso/expiração; neutralizar `inviteToken` sem `deleteNote`) | UX | M | Médio | widget `321-332,528-538,716-724`; handler `222-226` | `bun` (peer recebe 404) + 2 toques |
| SN-seg | Criptografia E2E + HMAC de identidade (hoje base64 puro; wishlist documentada) | Segurança | L | Médio | payload do convite; README | formato v3 + testes de ida e volta |
| SN-C4.3 | Dedupe por `#sharedNoteId` com clone de nota (dois candidatos; ordem indefinida) | Robustez | M | Médio | widget `632-641` | `bun` + manual |
| SN-C5.1 | Await lento aplicando contadores/status na nota errada após troca | Robustez | S | Baixo | widget `415-444,567-575,884-916` | `bun` (troca no meio) |
| SN-C1.7 | Cada clique em "Gerar" cria gate e incrementa versão sem envio | UX | S | Baixo | widget `510-541` | manual |
| SN-D1.1 + SN-D1.2 | Badge de respostas na aba + contexto do destinatário antes de enviar | UX | S | Baixo | widget `323,436-441` / `346-355,814-826` | manual |
| SN-D2.5 + SN-D5.10 | Widget mapeia código de erro para i18n própria (fim do texto do peer cru) e mensagens do handler orientadas a ação | i18n/UX | M | Baixo | widget `877-881`; handler `39-64` | `bun` + manual em 2 idiomas |
| SN-C2.4 + SN-C6.1 + SN-C5.3 | Fallback `Math.random` no token; detectar `fetch` no sandbox; abortar fetch ao fechar/trocar | Robustez | S | Baixo | widget `95-100,828-865,840-860` | revisão |
| SN-D3.5 + SN-D4.x + SN-D8.1 | Refinos restantes de foco/tipografia/toque | UX | S | Baixo | widget (CSS) | revisão visual |
| SN-C7.1 | Regenerar o zip a partir de uma instalação real (com `relations` e títulos do manifest) | Manutenção | M | Médio | `Shared-notes.zip` | importar no demo e conferir a relação |
| SN-C8.1 + SN-C8.5 | Stub de jQuery com eventos reais (binds/tabs) e E2E com `--cleanup` de artefatos | Testes | M | Baixo | `test:77-88` / `test-e2e-real.js:336-339` | `bun` |

## Como executar na volta (após a rodada 15)

1. **Triagem única:** revalidar cada item no código atual (linhas/relevância mudaram),
   descartar o que perdeu sentido e confirmar esforço/risco com o dono.
2. **Lotes por script/widget**, na ordem integridade > UX > manutenção; cada lote com testes
   (`bun`), `bun build`, smoke de runtime quando for script de render, e atualização
   do README.
3. **Deploy** (ETAPI VPS + demo, sha256 idêntico, zips regerados) só quando o script/widget
   entrar em release; marcar o item como ✅ aqui e registrar no `SESSION.md`.

## Canvas-Note-Tools (rodada 3)

| ID | Item | Categoria | Esforço | Risco | Onde (ocasião do relatório) | Validação |
|----|------|-----------|:-------:|:-----:|------------------------------|-----------|
| CN-C3.1 | Sync em lote: um backend percorre todos os cards e grava o canvas 1× (hoje N round-trips e N gravações) | Perf | M | Médio | `_syncCards`/`_updateCardText`; `mobile-launcher.src.js` | manual com canvas grande + `bun` no backend novo |
| CN-C4.4 | Linha do grid usa a altura estimada do card novo (um card alto faz o próximo nascer sobreposto) | Layout | M | Médio | `Canvas tools v8.js` (INSERT) | manual (visual) |
| CN-C4.7 | Título do card sem wrap (o trecho tem; o título estoura os 330 px) | Layout | S | Baixo | INSERT/SYNC | manual (visual) |
| CN-C4.8 | Cards sem `index` e índices de template recomeçando em `a00` (z-order indefinido/colisões) | Robustez | S/M | Médio | INSERT/TPL | manual (Excalidraw) |
| CN-C4.9 | Ctrl+Z não desfaz nada (escrita direta + `activateNote`) — documentar ou usar a API do Excalidraw | UX | S/M | Médio | INSERT/FLOW/REMOVE | manual |
| CN-C4.10 | Textos não vinculados às formas (`containerId`/`boundElements`) | UX | M | Médio | elementos de card/nó | manual |
| CN-C4.11 | `flowZIndex` esgota em ~3.844 elementos (base fixa) | Robustez | S | Baixo | engine de fluxo | `bun` (limite) |
| CN-C5.1 + CN-C7.5 | Listeners de documento na reinjeção e `window._clw`/timers sem limpeza | Manutenção | S | Baixo | `_injectFloat`/`_refineLang` | revisão |
| CN-D1.1 + CN-D1.2 | Hierarquia do painel de ajuda e agrupamento dos 11 botões da toolbar | UX | S/M | Baixo | CSS/markup da ajuda/toolbar | revisão visual |
| CN-D2.1 + CN-D2.3 + CN-D2.5 | Cabeçalho ✕ consistente nos painéis; hardcodes restantes e strings do launcher fora do i18n | UX/i18n | S | Baixo | vários | grep + paridade do teste |
| CN-D3.4 + CN-D3.5 | `aria-label` nos inputs; devolver o foco ao gatilho ao fechar painéis | a11y | S | Baixo | busca/título/filtro; fechamentos | inspeção + smoke |
| CN-D4.2 + CN-D4.3 + CN-D4.5 | Linha de botões com wrap; `word-break` no status; truncamento recuperável no launcher | UX | S | Baixo | CSS dos painéis/launcher | revisão visual |
| CN-D5.4 | Busca com retry e captura com desfazer | UX | S/M | Baixo | painel de busca/captura | manual |
| CN-D6.2 + CN-D8.1 | "Glass" sem efeito real (blur desnecessário); micro-tipografia (títulos 11 px etc.) | UX/perf | S | Baixo | CSS | revisão visual |
| CN-QW9 | Busca mostra "15 de N"; listas de editar/remover com limite 50 + "+N" | UX | S/M | Baixo | resultados/listas | manual com 60 cards |
| CN-QW10 | Paridade do launcher: botão "Exemplo" e ordenação de templates | UX | S | Baixo | `mobile-launcher.src.js` | manual |
| CN-QW15 | Desfazer remoção de card (restaurar `isDeleted=false`) | UX | M | Médio | REMOVE + painel | `bun` + manual |
| CN-QW16 | Consolidar a listagem de cards num helper/backend `CARDS` único | Manutenção | M | Baixo | `v8` (4 fluxos) | `bun` + manual |

## AI-Chat (rodada 5)

| ID | Item | Categoria | Esforço | Risco | Onde (ocasião do relatório) | Validação |
|----|------|-----------|:-------:|:-----:|------------------------------|-----------|
| AC-C7.5 | Cache da config (hoje `searchForNotes` + leitura a cada operação) | Manutenção/perf | S | Baixo | `loadConfig` (era `805-813`) | manual + spy no stub |
| AC-C4.11 | `STORAGE_KEY` por instância/noteId (duas abas sobrescrevem o histórico) | Robustez | S/M | Baixo | `saveState`/`loadState` | manual (2 abas) |
| AC-C2.4 | Política para imagens remotas da IA (hoje `<img>` remoto carrega direto) | Segurança/UX | S/M | Médio | `renderMarkdown`/CSS | manual (beacon) |
| AC-C3.2 | `restoreMessages` em lote (100 msgs com scroll medido por item) | Perf | M | Baixo | `restoreMessages` | cronometrar com histórico cheio |
| AC-C4.16 | Sufixar títulos duplicados dos comandos (`Resumo — X` repetido) | Robustez | S | Baixo | `runCommand` | manual |
| AC-D5.7 | Persistir o rascunho da edição (hoje o texto vai para o input e não é salvo) | Robustez/UX | S | Baixo | `editMessage`/`saveState` | manual |
| AC-D5.12 | Preservar/alertar o prompt custom ao trocar de persona | UX | S | Baixo | handler da persona | manual |
| AC-D3.9 | Estado `disabled` do Enviar (input vazio / operações não canceláveis) | UX | S | Baixo | `atualizarContador`/`setLoading` | manual |
| AC-D4.1 | Breakpoint por container (painel estreito no desktop não recebe o CSS mobile) | UX | M | Baixo | `@media 500px` | manual em painel dividido |
| AC-D1.1 | Densidade/hierarquia das 4 faixas antes do chat | UX | M | Baixo | markup/CSS | revisão visual |
| AC-D2.4 | Regravar capturas do README (EN/emoji antigos, contradizem a UI atual) | Doc | S | Baixo | `imagens/` | manual nos 2 temas |
| AC-C7.6 | Registry: descrição "widget" → "render note" + bump de versão no release | Release | S | Baixo | `registry.json` | revisão |

## Minimalist Pomodoro + Time Tracker (rodada 6)

| ID | Item | Categoria | Esforço | Risco | Onde (ocasião do relatório) | Validação |
|----|------|-----------|:-------:|:-----:|------------------------------|-----------|
| PM-C4.x | Durações configuráveis via labels `#pomoWorkMin`/`#pomoBreakMin` (default 25/5, clamp 1–120) | UX | M | Médio | consts `WORK_SECS`/`BREAK_SECS`; relatório | teste puro `resolveDurations` + manual |
| PM-C5.2/C7.3 | `cssBlock` reanexa o CSS a cada render e os ids `#pomo-*` são globais | Manutenção | S | Baixo | `CSS`/`buildTpl` | smoke de remount + revisão |
| PM-D5.x | Vínculo clicável para a nota do relatório na mensagem (hoje só o texto do destino) | UX | S | Baixo | `_saveReport` | manual |
| PM-D5.12 | Prévia do relatório antes de salvar | UX | S/M | Baixo | `_saveReport` | manual |
| PM-D8.1 | Ícone do relatório (`bx-file` = mesmo glifo da aba "File properties") | UX | S | Baixo | `buildTpl` | revisão visual |
| PM-C8.x | Cobrir no smoke a retomada de sessão após reload (`pomo-session-end` no futuro) | Testes | S | Baixo | `test-smoke.js` | asserção nova |
| PM-D2.4 | Regravar capturas do README (UI antiga: emoji, sem ciclo) | Doc | S | Baixo | `imagens/` | manual nos 2 temas |

## Word Counter (rodada 7)

| ID | Item | Categoria | Esforço | Risco | Onde (ocasião do relatório) | Validação |
|----|------|-----------|:-------:|:-----:|------------------------------|-----------|
| WC-C5.5 | Corrida read-modify-write entre janelas do Trilium (localStorage) | Robustez | S/M | Médio | `_track/_readStore` | manual (2 janelas) |
| WC-C4.8 | Edição em split não ativo só entra quando a nota vira ativa | Robustez/UX | M | Médio | `entitiesReloadedEvent` (filtro por `noteId`) | manual |
| WC-C7.9 | `position = 1` — slot único no toolkit; documentar/definir | Manutenção | S | Baixo | `get position()` | revisão |
| WC-D5.4 | Tooltip indicando a origem da meta (nota ativa/herdada) | UX | S | Baixo | `_readGoal`/render | manual |
| WC-D2.7 | "Semana" sem exibir o intervalo ISO na UI | UX | S | Baixo | render/tooltip | manual |
| WC-D3.x | QA visual de contraste nos 4 temas (color-mix com fallback) | UX | S | Baixo | CSS | QA visual |
| WC-D2.x | Captura do README antiga (sem a linha "Semana") | Doc | S | Baixo | `imagens/` | manual |
| WC-C7.6 | Bump de versão/registry + versão no README no release | Release | S | Baixo | registry/README | revisão |

## Daily-Note-Navigator (rodada 8)

| ID | Item | Categoria | Esforço | Risco | Onde (ocasião do relatório) | Validação |
|----|------|-----------|:-------:|:-----:|------------------------------|-----------|
| DNN-C6.x | Card do widget permanece fora de daily notes (layout novo; widget legado não esconde o header) — avaliar widget Preact | Manutenção/UX | L | Médio | `isEnabled`/layout | manual |
| DNN-C3.x | Prefetch dos vizinhos (busca read-only) + coalescing "último vence" em navegação rápida | Perf/UX | S/M | Baixo | `_findDayNote`/`_goTo` | smoke |
| DNN-D5.x | Ação "criar nota" também no salto de mês (hoje só no dia) | UX | S | Baixo | `_mostrarMsg` | manual |
| DNN-D2.x | Captura do README defasada (3 controles; hoje 6 + aviso) | Doc | S | Baixo | `imagem/` | manual |
| DNN-D4.x | QA visual da barra em painel estreito (240-280px) e nos 4 temas | UX | S | Baixo | CSS | QA visual |
| DNN-C7.x | Bump de versão/registry + versão no README no release (`sourceUrl` sem pin) | Release | S | Baixo | registry/README | revisão |

## Pendências de produto (novas, 29/09/2026)

Fora das rodadas de auditoria. Decisões do Ricardo: **nomenclatura em 2 camadas**
(docs novos usam a terminologia oficial; o contrato `#pluginVersion`/registry fica
como está) e **hub mobile registrado para execução pós-rodada 15** junto do roadmap.

| ID | Item | Categoria | Esforço | Risco | Onde | Validação |
|----|------|-----------|:-------:|:-----:|------|-----------|
| PROD-MOBILE | **Hub de widgets no mobile — ⏸️ IDÉIA A AVALIAR NO FUTURO (29/09, decisão do Ricardo: não executar agora)** — widgets de painel (DNN, Word Counter, Pomodoro) não aparecem no mobile (não há panes). Padrão já validado: launcher do Canvas Note Tools (nota `launcher` + `#launcherType=script` + `~script` na Mobile Launch Bar; a doc oficial confirma *custom launch bar widgets* no mobile). Opções: 1 script launcher "Toolkit" → diálogo (`role=dialog`, CSS escopado, alvos 44px, i18n) com 1 botão por widget, ou launchers separados por widget; cada widget de painel ganha variante diálogo (extrair engine com marcadores `*-BE-*` + build script; engine reutilizável: DNN 40-45%, WC 48%, Pomodoro 60-65%); render notes (Planner, AI Chat, Kanboard) só navegam. Custo ~1 dia/widget; reavaliar se usar o mobile com frequência | Feature/UX | M/L | Médio | `Daily-Note-Navigator/`, `Word-Counter/`, `Minimalist-Pomodoro/`, `Canvas-Note-Tools/` (padrão) | testes + smoke + deploy sha idêntico |
| PROD-NOME | **Nomenclatura plugin → scripts/widgets — ✅ CONCLUÍDA (29/09)** (doc oficial: não existe "plugin"; termos oficiais são *scripts*, *custom widgets*, *launch bar widgets*, *render notes*, *backend scripts*, *themes*). **Aplicado:** docs/textos novos (README do toolkit "Plugins & Tools Collection" → "Scripts & Widgets Collection", SESSION seção "Scripts, Widgets & Render Notes", AUDITORIA colunas, 3 READMEs subprojeto + 2 headers JS → "Render Note", UI do manager → "Gerenciador de Scripts & Widgets", DEV_GUIDE/MANIFEST/CONTEXTO/AGENTS/DISCUSSION) com nota "anteriormente chamados de plugins". **Contrato mantido:** labels `#pluginVersion`/`#pluginRegistry`, chave `plugins[]` do registry, nome do repo do manager, nomes de arquivo | Docs | S | Baixo | `README.md`, `SESSION.md`, `AUDITORIA-ESPECIALISTAS.md`, manager | revisão de texto |
| PROD-CT | **Bump do Canvas-Templates no registry** — o content pack foi atualizado (13 templates revisados do QA Modelos Trilium, novo "Template - Projetos") mas o `registry.json` do Plugin Manager segue `canvas-templates-for-production 0.8.0`; subir a versão no próximo release (com nota de que o zip foi regenerado) | Release | S | Baixo | `Trilium-plugin-manager/registry.json` | instalar via manager e conferir os 13 templates |

## Histórico

- **29/09/2026** — `PROD-NOME` **concluída** (nomenclatura oficial aplicada em docs/UI; contrato mantido); `PROD-MOBILE` rebaixada para **ideia a avaliar no futuro** (decisão do Ricardo — não executar agora).
- **29/09/2026** — adicionado `PROD-CT` (bump do Canvas-Templates no registry; zip regenerado com 13 templates revisados + novo Projetos).
- **29/09/2026** — adicionada a seção "Pendências de produto" (hub mobile `PROD-MOBILE` + nomenclatura `PROD-NOME`), decisões do Ricardo: nomenclatura em 2 camadas (docs novos sim, contrato não) e hub mobile para execução pós-rodada 15.
- **29/09/2026** — atualizado com os residuais da rodada 8 (Daily-Note-Navigator).
- **29/09/2026** — atualizado com os residuais da rodada 7 (Word Counter).
- **29/09/2026** — atualizado com os residuais da rodada 6 (Minimalist Pomodoro).
- **29/09/2026** — **Daily-Note-Map removido da coleção** (decisão de uso: o mapa
  nativo do Trilium cobre; o código fica no histórico do git): saiu do repo, do README
  do toolkit e do registry do Plugin Manager; a fila de auditoria caiu de 16 para 15.
- **29/09/2026** — atualizado com os residuais da rodada 5 (AI-Chat).
- **29/09/2026** — atualizado com os residuais da rodada 4 (Shared-Notes).
- **29/09/2026** — atualizado com os residuais da rodada 3 (Canvas-Note-Tools).
- **29/09/2026** — criado com os residuais das rodadas 1 (Weekly Planner) e 2
  (Writers-Tools); regra de execução pós-rodada 16 registrada no método do
  `AUDITORIA-ESPECIALISTAS.md`.
