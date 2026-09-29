# Auditoria por Especialistas — TriliumNext Toolkit

Este arquivo define os perfis dos especialistas que avaliam os plugins do
TriliumNext-Toolkit, seus critérios, e o resultado de cada rodada. **Uma rodada
por plugin** (o próximo da lista fica anotado abaixo). Método: leitura do código
com evidência (`arquivo:linha`), harness estático (`bun test-*.js`,
`bun build` para sintaxe, greps de padrões) e conferência humana dos achados de
maior severidade. **Nenhuma correção é feita durante a auditoria** — os fixes
saem em rodada própria, após triagem do dono.

**Fluxo dos residuais:** o que não entra nos batches de correção de cada rodada é
migrado para o **`ROADMAP-RESIDUAIS.md`**. A execução do roadmap acontece **depois da
última rodada da fila** (15 plugins após a saída do Daily-Note-Map em 29/09/2026),
com uma triagem única de prioridade.

Regra de leitura do relatório: prioridade = resultado do plugin; "verificar em
runtime" marca o que depende de teste manual no Trilium.

---

## 👤 Especialistas e critérios

### 👨‍💻 1. Programador Sênior (JS + API de scripts do Trilium)

Perfil: dev full-stack sênior em JavaScript, com conhecimento do motor de
scripts do TriliumNext (render notes, `api.runOnBackend` serializado, sandbox
0.105+/0.106, SQL interno). Não perdoa gambiarra, edge case tratado em silêncio
ou perda silenciosa de dados.

| # | Critério | O que olha |
|---|----------|------------|
| C1 | Robustez/erros | `catch` vazios/mudos, persistência que falha sem aviso, JSON corrompido, nota de dados ausente, migrações vencidas |
| C2 | Segurança/XSS | pontos de injeção (`.html()`, `.append()`), `esc()` em todo dado de nota, atributos, SQL, patches globais |
| C3 | Performance/escala | varredura de notas, `getContent()`/`setContent()` no scan, renders O(N) repetidos, payload/serialização |
| C4 | Edge cases | checkbox sem span, spans aninhados, `<li>` sem fechamento, índices de checkbox após edição, datas/fuso, chaves órfãs |
| C5 | Eventos/timers | listeners globais sem remoção, re-binds, patches encadeados, código morto |
| C6 | Sandbox/API | callbacks auto-contidos (sem escopo externo), APIs disponíveis, args em array, transações |
| C7 | Manutenibilidade | monólito, CSS/markup duplicado, i18n, versões em sincronia (manifest × registry × README) |
| C8 | Testes | funções puras testáveis, cobertura atual, fixture real |

### 🎨 2. Designer de Interfaces (UI/UX)

Perfil: designer de produto digital com experiência em Trilium/Electron/WebView,
temas claro/escuro, acessibilidade e responsivo. Avalia o plugin como produto,
não como código.

| # | Critério | O que olha |
|---|----------|------------|
| D1 | Hierarquia visual | o que mais importa em destaque, densidade, legibilidade de rótulos |
| D2 | Consistência | componentes entre views (kanban/gantt/mês/painel), terminologia, estados de dia |
| D3 | Acessibilidade | teclado, `role`/`aria`, `:focus-visible`, leitor de tela, alvos de toque |
| D4 | Responsivo | breakpoints, overflow, toques ≥40px, textos truncados recuperáveis |
| D5 | Estados | loading/vazio/erro, feedback de ações destrutivas, recuperação |
| D6 | Micro-interações | hover/focus/drag, transições, `prefers-reduced-motion` |
| D7 | Cores | contraste WCAG claro/escuro, semântica, hardcodes fora de token |
| D8 | Tipografia | tamanhos/legibilidade, fontes forçadas por JS × CSS |

### ⚡ 3. Melhorias fáceis (Quick Wins)

Perfil: product owner/engenheiro incremental. Varre o código e o README atrás de
melhorias de baixo risco e alto valor, com esforço estimado e validação.

| # | Critério | O que olha |
|---|----------|------------|
| Q1 | Ganho/esforço | S ≤ 1h · M ≤ meio dia · L ≤ 1-2 dias; prioriza S/M |
| Q2 | Risco | baixo = não mexe em persistência/sandbox; alto = exige teste em runtime |
| Q3 | Feedback | avisos, estados, desfazer, contagens, confirmações |
| Q4 | Atrito do fluxo | re-rotina (duplicar semana), navegação, atalhos, ordenação |
| Q5 | Validação | teste manual objetivo e/ou função pura testável com `bun` |
| Q6 | Descarte explícito | ideias que parecem fáceis e não valem a pena |

---

## 📋 Rodadas

| # | Plugin | Arquivo(s) | Data | 👨‍💻 Código | 🎨 UI/UX | ⚡ Quick wins | Veredito |
|---|--------|------------|------|-----------|----------|---------------|----------|
| 1 | Weekly Planner | `Weekly-Planner/js-planejador.js` | 28/09/2026 | 36 achados (0C/3A/17M/13B/3S) | 28 achados (1C/5A/9M/7B/6S) | 15 itens (S/M) | **Batches 1-4 aplicados + fix pós-batch 4** (`t`→`tr` + guard do render + `test-smoke.js`): ~65 correções/refactors; 49 asserções + smoke. Residual no `ROADMAP-RESIDUAIS.md` |
| 2 | Writers-Tools (Fountain + Longform) | `Writers-Tools/js-Fountain/js - Fountain 3.js`, `Writers-Tools/js-grid/js - grade.js` | 29/09/2026 | 38 achados (0C/5A/16M/13B/4S) | 32 achados (1C/5A/13M/10B/3S) | 18 itens (S/M) | **Batches 1-3 aplicados + deploy** (VPS/demo/zip com sha256 idêntico; smokes dos dois no Chrome headless); residual no `ROADMAP-RESIDUAIS.md` |
| 3 | Canvas-Note-Tools (widget + launcher mobile) | `Canvas-Note-Tools/Canvas-note-tools/Canvas tools v8.js`, `mobile-launcher.src.js`, `build-mobile-launcher.js` | 29/09/2026 | 42 achados (0C/4A/14M/20B/4S) | 35 achados (2C/8A/18M/5B/2S) | 16 itens (S/M) | **Batches 1-3 aplicados + deploy** (VPS/demo/zip com sha256 idêntico; smoke do widget e do launcher); residual no `ROADMAP-RESIDUAIS.md` |
| 4 | Shared-Notes (widget + handler) | `Shared-Notes/shared-notes-widget.js`, `shared-notes-handler.js` | 29/09/2026 | 47 achados (0C/4A/21M/16B/6S) | 31 achados (1C/7A/16M/5B/2S) | 16 itens (S/M) | **Batches 1-2 aplicados + deploy** (VPS/demo/zip com sha256 idêntico; 70 chaves i18n em paridade; testes hostis); ✅ token do E2E rotacionado (29/09); residual no `ROADMAP-RESIDUAIS.md` |
| 5 | AI-Chat (render note) | `AI-Chat/AI-Chat/AI Code.js` | 29/09/2026 | 50 achados (2C/9A/18M/17B/4S) | 40 achados (3C/11A/16M/9B/1S) | 20 itens (S/M) | **Batches 1-3 aplicados + deploy** (VPS/zip com sha256 idêntico; demo: instalação nova via ETAPI com sha idêntico e config pelo label; 85 chaves i18n em paridade; `test-chat.js` + `test-smoke.js`); residual no `ROADMAP-RESIDUAIS.md` |
| 6 | Minimalist Pomodoro + Time Tracker | `Minimalist-Pomodoro/Pomodoro-mini/Pomodoro mini.js` | 29/09/2026 | 36 achados (2C/4A/16M/9B/5S) | 33 achados (1C/8A/14M/8B/3S) | 20 itens (S/M) | **Batches 1-3 aplicados + deploy** (VPS/demo/zip com sha256 idêntico; `test-pomodoro.js` 35 ✅ + `test-smoke.js` 30 ✅; STOP em 2 toques que só limpa após salvar; relatório em `<tr>` com escaping e label `#pomodoro`; i18n 30 chaves em paridade); residual no `ROADMAP-RESIDUAIS.md` |
| 7 | Word Counter | `Word-Counter/Word count.js` | 29/09/2026 | 34 achados (0C/4A/13M/13B/4S) | 29 achados (1C/6A/12M/7B/3S) | 17 itens (S/M) | **Batches 1-3 aplicados + deploy** (VPS/demo/zip com sha256 idêntico; `test-wordcount.js` 53 ✅ + `test-smoke.js` 24 ✅; semântica baseline+delta por nota; contagem com entidades; barras ARIA/meta; i18n 14 chaves; zip defasado regenerado); residual no `ROADMAP-RESIDUAIS.md` |

### 🔁 Fila proposta (ajustável)

~~2. Writers-Tools (Fountain + Longform)~~ ✅ 29/09 · ~~3. Canvas-Note-Tools~~ ✅ 29/09 ·
~~4. Shared-Notes~~ ✅ 29/09 · ~~5. AI-Chat~~ ✅ 29/09 · ~~6. Daily-Note-Map~~ ⛔ removido da
coleção (29/09 — o mapa nativo do Trilium cobre; decisão no `SESSION.md`) ·
~~6. Minimalist Pomodoro + Time Tracker~~ ✅ 29/09 · ~~7. Word-Counter~~ ✅ 29/09 ·
**8. Daily-Note-Navigator (próximo — prioridade do release)** · 9. Knowledge-Dashboard ·
10. Attribute-GC · 11. UI-Tweaks · 12. Kanboard · 13. Mastodon · 14. Canvas-Template-Loader ·
15. Canvas-Templates.

---

## Rodada 1 — Weekly Planner (28/09/2026)

**Escopo:** `Weekly-Planner/js-planejador.js` (2.282 linhas), `manifest.json`,
`planner-data.json`, `README.md`, `test-refs.js`.
**Verificação:** `bun test-refs.js` 8/8 ✅ · `bun build` (sintaxe) ✅ ·
greps de padrões (injeção, catch, timers, tema, CSS) executados.

### Resumo executivo

| Especialista | Crítica | Alta | Média | Baixa | Sugestão | Total |
|---|---:|---:|---:|---:|---:|---:|
| 👨‍💻 Código | 0 | 3 | 17 | 13 | 3 | 36 |
| 🎨 UI/UX | 1 | 5 | 9 | 7 | 6 | 28 |
| ⚡ Quick wins | — | — | — | — | — | 15 itens |

**Top 5 (triagem sugerida):**
1. **[Alta · Código]** `markDone` usa regex mais restrita que a extração: pode marcar o checkbox errado ou nenhum, em silêncio (`652` × `516`).
2. **[Alta · Código]** `fetchTasks` varre todas as notas de texto com `getContent()` por nota, sem `isProtected`/`#archived` e sem `try/catch` por nota: um throw derruba o scan inteiro (`484-499`).
3. **[Alta · Código]** IDs `noteId::cbIndex` transferem a data de planejamento para outra tarefa quando a nota é editada acima do checkbox (`568`, `587-592`).
4. **[Crítica · UI]** Nenhuma ação principal é operável por teclado: cards, chips e ✓ são `<span>` sem `role`/`tabindex`; não há `:focus-visible` (`1000-1016`, `1567-1576`, `2140`; único teclado é `.pl-mode-btn`, `2279`).
5. **[Alta · UI]** Falha de `save()` é invisível e o UI "mente" que salvou (drag/limpar/concluir sem aviso, `287` + chamadas).

### 👨‍💻 Código — achados

**Alta**

- **C1.5 · `markDone` diverge da extração** (`652` × `516`): marcação usa `/<input\s+type="checkbox"([^>]*?)>/gi` (só aspas duplas e `type` logo após `<input`), extração aceita qualquer ordem/aspas. Checkbox fora do padrão é contado, mas não marcado; `count++ === cbIndex` desalinha e marca a **checkbox errada** ou nenhuma, sem aviso. Correção: mesma regex nas duas pontas + erro explícito quando não achar (verificar em runtime).
- **C3.1 · Scan global sem proteção** (`484-499`): `getContent()` para ~4.200 notas texto numa transação; sem `isProtected = 0` nem exclusão de `#archived` (o repo já decidiu isso no Knowledge Debt, SESSION.md:149) e sem `try/catch` por nota. Um throw (nota protegida/corrompida) aborta o fetch inteiro. Correção: filtros no SQL + `try { content = note.getContent() } catch { continue }`.
- **C4.1 · IDs por índice de checkbox** (`568`, poda `587-592`): inserir/remover um checkbox acima desloca todos os índices; a data antiga continua válida e é herdada pela **tarefa errada** (a poda só remove chaves inexistentes). Correção: guardar um trecho/hash do texto no id e reconciliar quando o `cbIndex` não casar (padrão do `migrateIds`).

**Média**

- **C1.1 · `save()` engole erro** (`287`): drag, modo, clear e check podem não persistir sem nenhum aviso. Correção: `api.showMessage` em falha.
- **C1.2 · Reload engole erro** (`1310`, `1627`, `1831`): `try { await fetchTasks(); } catch (_) {}` deixa a UI com dados velhos; botão ⟳ fica em "…". Correção: mensagem visível + `finally`.
- **C1.3 · JSON corrompido vira `{}`** (`268-271`): planejamento "desaparece" e o próximo save grava `{}` por cima (perda definitiva). Correção: distinguir vazio de parse-error, avisar e preservar o raw.
- **C1.4 · Nota `#plannerdata` ausente** (`266-267`, `281`): falha só no console; a sessão inteira não persiste. Correção: validar no boot e renderizar instrução com as labels `#plannerdata`/`#data`.
- **C1.7 · Recorrências geradas não são salvas** (`583-585` com `456-457`): as datas dos clones ficam só em memória; um reload sem interação as perde (os clones já perderam `#every/#total`, não re-expandem). Correção: `if (generated) await save()` após o fetch.
- **C2.1 · Único ponto sem `esc()`** (`2266-2269`): `$pl.html(... ${msg})` na tela de erro de init. Vetor baixo, mas é o único. Correção: `esc(msg)`.
- **C3.2 · `setContent()` dentro do scan** (`505-511`): o reload vira write em lote (recorrências); nota read-only aborta tudo. Correção: separar expansão do fetch ou isolar por nota.
- **C3.3 · `getDayTasks` O(N) por célula** (`836-848`): chamada 42× no mês (`1554`) com `sort` + `indexOf`; travamento com muitas tarefas. Correção: `Map<dia, tasks[]>` + índice de `_order` montados uma vez.
- **C3.4 · Render sem virtualização** (`1000-1016`, `1565-1577`, `2154`): todos os cards viram DOM, incluindo o painel sempre visível. Correção: limite por coluna/dia com "+N".
- **C4.2 · Datas via `toISOString()` (UTC)** (`692`, `1407`, `1071`): em UTC+0..+12 a meia-noite local cai no dia anterior (rótulos, `isOverdue`). No Brasil funciona; o plugin é público. Correção: formatar local (ou dayjs, que está na whitelist).
- **C4.3 · Extração de texto por primeiro `</span>`** (`525-530`, `369-375`): spans aninhados truncam o texto; sem span, pode pegar span de outra tarefa. Correção: extrair o conteúdo do `.todo-list__label__description` ou parear spans por profundidade.
- **C4.4 · `#total` sem teto / `#upto` sem validação / `#every=0`** (`436`, `387-398`, `325`): um typo (`#total=40000`) gera dezenas de milhares de clones na nota; data inválida vira `NaN`. Correção: cap (ex. 100), validar `new Date` finito e `every >= 1`.
- **C5.1 · Listener de `resize` global sem remoção** (`210`): se o render note re-executa, acumula listeners e cópias de CSS (agrava com `64`). Correção: remover/instalar via flag `window.__wp*`.
- **C6.1 · `getContent()` sem try/catch por nota** (`495-499`): ver C3.1 (mesma causa, correção conjunta).
- **C7.1 · UI 100% PT hardcoded** (`240`, `730`, `747`, `881`, `965`, `1204`, `1994`, `2003`, `2108`, `2268`): diverge do padrão i18n PT/EN do toolkit (Canvas v8, Shared Notes). Correção: `WP_I18N` + `api.getOption('locale')`.
- **C7.2 · Monólito + CSS/markup duplicado** (`918-933` × `1495-1509`; cards `899-915`, `1462-1477`, `1101-1117`, `2056-2094`): ajuste visual exige sincronizar 3-4 blocos. Correção: extrair constantes compartilhadas (o padrão `TAG_CSS`/`BTN_CSS`/`MODE_CSS` já existe).
- **C8.1 · Testes só do badge** (8 asserções em `test-refs.js`): alvos puros sem cobertura (esforço entre parênteses): `parseTaskTags` (~15, baixo), `expandRecurringInContent` (~12, médio), `getWeekCols`/`getMonthDays`/`weekLabel`/`dayBadge` (~10, médio), `migrateIds` (~6, baixo), `setOrder` (~6, baixo), `esc`+renders (~8, baixo). Um `test-planejador.js` (250-350 linhas) com marcadores no fonte cobre tudo.

**Baixa**

- **C1.6 · `migrateIds` eterna** (`601-638`): comentário diz "pode ser removida após uma semana"; roda toda carga e é O(n²) no `_order`. Correção: remover (ou flag única persistida).
- **C1.8 · `markDone` não salva** (`665-671`): remoção do `plannerData`/`_order` só em memória (inconsistente até a próxima ação). Correção: `await save()` ao final.
- **C2.3 · Patch global de `$.fn.html`/`$.fn.append`** (`47-77`, `64`): afeta a página inteira e se encadeia a cada re-execução (CSS reanexado). Correção: instalar uma única vez (`window.__wpPatched`) ou helper local.
- **C3.5 · `plannerData` re-serializado inteiro; `_order` cresce** (`277`): payload com ids mortos. Correção: podar `_order` e gravar sem indentação.
- **C3.6 · `resize` sem debounce** (`210`, `171-209`): rajada de `setProperty` no redimensionamento. Correção: debounce ~150 ms.
- **C4.5 · `#total` sem `\b`** (`331`): `#total=42x` vira 42; `foo#total=4` casa. Correção: `/#total\s*=\s*(\d+)\b/`.
- **C4.6 · `_order` nunca podada** (`588-592`): a poda ignora chaves `_`. Correção: filtrar contra `validIds`.
- **C4.7 · Clones sem `</li>`** (`458`, `475-478`): HTML malformado dependente do parser; `<li>` com 2+ checkboxes duplica checkboxes e desalinha índices. Correção: fechar cada clone e contar checkboxes reais.
- **C4.8 · `was-dragged` é código morto** (`1699-1701`, `1916-1918`): a classe nunca é adicionada; clique pós-drag pode abrir a nota. Correção: setar no `dragstart`/`drop` ou remover a guarda.
- **C4.9 · `todayBase` congelado** (`679-680`): app aberto após a meia-noite mantém "hoje"/`isOverdue` de ontem. Correção: derivar no render.
- **C6.2 · `markDone` assume nota existente** (`648-649`): nota apagada entre scan e clique gera TypeError só no console. Correção: `if (!note) return;`.
- **C7.3 · Versão divergente** (`manifest.json` sem `version`; registry 0.8.0, SESSION 0.8.2, manager local 0.8.5): confunde updates do Plugin Manager. Correção: reconciliar e anotar no SESSION.
- **C7.4 · README desatualizado** (`README:84` diz que o original mantém `#every`, o código remove em `456-457`; `README:29` promete badge 🔗 no Gantt, mas o label não copia `noteLinks` (`1061-1073` × `1247`) e só o backlog mostra (`1281`); `README:34` cita `matchMedia` 700px, o código usa 1024px; `README:41-43` descreve painel recolhível removido). Correção: atualizar README/changelog.

**Sugestão**

- **C2.2 · `esc()` sem aspas simples** (`723-725`): sem exploit hoje (todos os atributos usam `"`), fragilidade latente. Adicionar `&#39;`.
- **C5.2 · `isMobile()` avaliado só no bind** (`1678`, `1758`, `1857`, `1973`): cruzar o breakpoint sem re-render mantém handlers antigos (verificar em runtime). Correção: `matchMedia('change')` → re-render.
- **C7.5 · Comentários vencidos** (`601-603`, topo `25-35`): migração e changelog defasados.

### 🎨 UI/UX — achados

**Crítica**

- **D3.1 · Nada operável por teclado** (`1000-1016` cards, `1567-1576` chips, `2140`/`1276`/`1239` checks): só `.pl-mode-btn` tem `tabindex` (`737`, `754`); não existe `:focus-visible`; sem `role`/keydown nos cards. Viola WCAG 2.1.1/4.1.2. Correção: `<button>` ou `role="button"`+`tabindex`+Enter/Espaço+`:focus-visible`.

**Alta**

- **D3.2 · Drag-and-drop sem alternativa** (`1002`, `1568`, `1595`; picker só mobile `1973`): em desktop, replanejar exige mouse; sem anúncio (`aria-live`). Correção: picker também no desktop via teclado + anúncio do drop.
- **D5.1 · Falha de save invisível** (`287` + chamadas `1321-1323`, `1731-1753`, `1796`, `2015-2018`): UI mostra o card movido e o usuário perde tudo no reload. Existe bom padrão de rollback no `.tk-check` (`2241-2248`), replicar.
- **D4.1 · Alvos de toque <40px** (`786-787` 28×26; `793-795`; `1471-1473`; `1243-1244`; `1123-1125` 14×14; `2084-2088` 15×15): erros de toque frequentes no WebView.
- **D2.1 · Dois sistemas de seletor de modo** (`728-740` inline × `745-757` barra; CSS `98`/`141-153`/`155`): linguagem visual diferente e sem `role="tablist"`. Correção: componente único responsivo.
- **D3.3 · `role="button"` prometido e ausente** (comentário `743`; README `40`; marcação `736-738`, `753-755`): leitor de tela anuncia "texto". Correção: adicionar `role` + `aria-label`.

**Média**

- **D3.4 · ARIA ausente em ícones/estados** (`966-976`, `1160-1170`, `1529-1539`; picker `1983-1998` sem `role=dialog`/Esc/foco; "done" só por cor): rótulos e estados invisíveis para leitor de tela.
- **D1.1 · Título do grupo a 9px no mobile** (`180`, `134`; desktop 14px `110`/`195`): o texto que mais ajuda a escanear é o menor da tela (o nome `.tk-note-link` acumula cabeçalho e linha antiga). Correção: desacoplar classe e piso 12px.
- **D7.1 · Paleta de tags reprova no tema claro** (`TAG_CSS` `769-781`; aplicação `805-813`): `#f1c40f` ≈1.5:1 e `#2ecc71` ≈2:1 no fundo claro (AA pede 4.5:1); no escuro ok. Correção: pares por tema via variáveis locais.
- **D7.2 · Erro de init sem recuperação** (`2267-2269`): cor fixa `#f38ba8` e beco sem saída (sem botão de retry, painel vazio em `2270`).
- **D2.2 · "Hoje"/"fim de semana" divergem entre views** (`893`/`897` × sem fim de semana `992-999`; mês `1455-1460`; gantt `1090`/`1138-1140`): na view principal (Semana) o fim de semana não tem tratamento.
- **D2.3 · "modo Quadro" no vazio do Gantt** (`1203-1205`): o botão correspondente chama "Semana". Correção: terminologia única.
- **D5.2 · Vazio/erro/loading incompletos** (`232-244` sem `role=status`; `2107-2108`; semana/mês sem mensagem; Gantt ok `1202-1205`; erro sem retry): primeira carga parece quebrada.
- **D5.3 · Feedback assimétrico** (concluir sem confirmação `2024-2036`, `1663-1674`, `1351-1363`; `confirm()` nativo `1316`, `1633`, `1846`; reload `…`): só o painel tem feedback/rollback.
- **D8.1 · Tipografia duplicada CSS `!important` × JS inline** (`102-156` × `171-210`, chamado `210`/`2163`): valores espelhados; ajuste em um lado regride no outro. Correção: classe `wp-compact` via matchMedia.

**Baixa**

- **D6.1 · `was-dragged` nunca setado** (`1916-1919`, `1699-1702`): clique residual pós-drag abre a nota-fonte (mesma raiz do C4.8).
- **D6.2 · Hover/foco em JS inline** (`2173-2177`, `2194-2198`, `2204-2218`): contraria o padrão do repo (SESSION.md:99) e não cobre teclado. Correção: CSS `:hover`/`:focus-visible`.
- **D6.3 · Sem `prefers-reduced-motion`** (`234-236` spinner; transições `903`, `1466`, `2082`, `780`/`1112`).
- **D2.4 · Título muda por view + glifos** (`965`, `1159`, `1528`; ícones `↺ ⟳ ‹ › ✓ ◐` em `966-976` etc.): hierarquia confusa e risco de tofu no WebView (verificar em runtime).
- **D1.2 · Densidade no mês** (`1462-1466`, chip `1575`, mobile `1517`): muitos sinais em alvo de 11px; badge 🔗 onipresente piora o scan.
- **D4.2 · Truncados sem `title`** (`907-908`/`1014`, `1127`/`1280`, `1493`): no mobile não há como recuperar o texto completo.
- **D3.5 · Foco perdido na troca de view** (`1024`, `1327-1332`): teclado volta ao início da página.

**Sugestão**

- **D1.3 · Contraste morno do `--muted-text-color`** (fallback `#888` em `163`, `896`, `1161`, `2060`): ≈3.5:1 no claro com fonte pequena. Elevar fallback.
- **D2.5 · "Limpar" só com ícone `↺`** (`975`, `1169`, `1538`): ação destrutiva sem rótulo/perigo.
- **D4.3 · Scroll horizontal × drag no mesmo gesto** (`887`, `902`): alça explícita (⠿) como região de drag.
- **D6.4 · `confirm()` nativo** (`1316`, `1633`, `1846`): usar o sheet do próprio plugin (`918-933`) com foco/Esc.
- **D5.4 · Corrupção silenciosa** (`264-273`): avisar antes de sobrescrever (mesma família do C1.3).
- **D8.2 · Piso tipográfico** (8px badges `183-184`/`135-138`; 9px `180`, `1146-1147`): mínimo 11-12px e ganhar espaço ocultando decoração no mobile.

### ⚡ Quick wins — backlog

| # | Melhoria | Ganho | Esforço | Risco | Onde | Validação |
|---|----------|-------|:-------:|:-----:|------|-----------|
| 1 | Toast para falhas de save/reload | Planejamento não "some" sem aviso | S | Baixo | `287`, `1310`, `1627`, `1831` | Renomear a nota `#plannerdata`, arrastar e ver o aviso |
| 2 | Indicador "salvando…/salvo ✓/erro ✗" no header | Feedback imediato de persistência | S | Baixo | `275-288` + headers `962`, `1156`, `1525` | Arrastar card e ver o estado mudar |
| 3 | ✓ visível na visão Mês no mobile | Descobrir como concluir por toque | S | Baixo | CSS `1471-1475` + media query `1512-1517` | Emulação touch: ✓ visível e funcional |
| 4 | Desfazer ao concluir (✓) | Recuperar toque acidental sem abrir a nota | M | Médio | `645-672`; chamadas `2024`, `2220`, `1351`, `1663` | Concluir, desfazer, conferir checkbox desmarcado |
| 5 | "Limpar" com contagem + Desfazer | Tirar o peso de apagar semana/mês | S/M | Baixo | `1315-1324`, `1632-1644`, `1845-1854` | Limpar N tarefas e desfazer |
| 6 | ⟳ recarrega também o `plannerData` | Ver mudanças feitas em outra aba/dispositivo | S | Baixo | `1308-1313`, `1625-1630`, `1829-1834` | Editar a nota de dados e recarregar |
| 7 | Salvar recorrências geradas + poda | Datas dos clones não se perdem no reload | S | Baixo/Médio | `582-592` | Criar `#every=7d #total=4` e recarregar 2× |
| 8 | Atalhos (←/→, `t` hoje, `r` reload, Esc fecha sheet) | Navegar sem mouse | S | Médio | `2274-2281`; pickers `1782-1787`, `2000-2005` | Testar atalhos e confirmar que não disparam ao digitar |
| 9 | Scroll: revelar hoje ao abrir e preservar posição | Mobile não abre com "hoje" fora da tela | S/M | Baixo | `1024-1025`, `1610-1611`, `2162-2163` | Rolar, concluir e ver a posição mantida |
| 10 | Duplicar planejamento para a próxima semana | Reaproveitar o ritual semanal | M | Baixo/Médio | headers `972-977` + `weekCols`/`_order` | Duplicar e conferir +7 dias e ordem |
| 11 | Ordenar backlog por `#upto` (vencidos primeiro) | Ver o que vence antes | S | Baixo | `834` | `ordenarBacklog()` pura no bun + visual |
| 12 | "Abrir nota" no seletor mobile do Mês | Paridade com o picker do Kanban | S | Baixo | `1760-1798` (espelhar `1994-1997`) | Mobile: chip do Mês → abrir nota |
| 13 | Fim de semana + coluna vazia + tooltip no Kanban | Orientação visual na view principal | S | Baixo | `880-883`, `992`, `999-1018` | Conferir cores, dica e tooltip |
| 14 | Re-render ao cruzar o breakpoint | Estado de layout correto ao redimensionar | S | Baixo/Médio | `210`, `833` | Redimensionar 1024px e ver barra/picker |
| 15 | Alinhar regex do `markDone` com o `fetchTasks` | Mesma raiz do C1.5 (card aparece mas ✓ não marca) | S | Baixo | `651-652` × `516` | `marcarCheckbox()` pura no bun com fixtures fora do padrão |

**Notas dos 5 primeiros:** (1) trocar o catch mudo por `api.showMessage` e incluir a dica de recriar a nota com `#plannerdata`/`#data`; (2) `saveState` + `<span id="pl-save-status">` nos 3 headers, renderizado a partir do estado; (3) replicar `opacity:.5` + padding maior do `.pl-done-btn` (kanban `941`) no `.mn-done-btn` no mobile; (4) extrair `setTaskChecked(noteId, cbIndex, checked)` de `markDone` e guardar `lastUndo` para a barra "Desfazer"; (5) clonar `plannerData`/`_order` antes de limpar e usar a mesma barra de desfazer.

**Descartes explícitos:** duplo clique para abrir (clique simples já abre e conflita com drag); sugestão de tags ao digitar (não há campo de edição de tarefa); painel de concluídas (backend não guarda o texto das marcadas, `514-544`); contagem nas células do Mês (ruído visual sem ganho).

### Pontos fortes (não mexer)

- Callbacks de backend auto-contidos e compatíveis com o sandbox (`265-286`, `347-561`, `647-662`); SQL constante sem interpolação (`484-489`).
- `esc()` consistente em textos/títulos/tags/datas nas 4 views; `CSS.escape` no seletor dinâmico (`1890`); única lacuna é a mensagem do C2.1.
- Recorrência idempotente (remove `#every/#total` do original e dos clones, `443-449`, `456-457`) e poda de órfãos do `plannerData` (`587-592`).
- Teste do badge ancorado em fixture real (`test-refs.js`) e bloco `REFS-BE` extraível, padrão a replicar.
- Tokens de tema corretos com fallback (nenhuma variável proibida) e isolamento de CSS via `#wp-root` + hoist para o `<head>`.
- Mobile coerente: breakpoint único 1024px no JS/CSS, flexbox encadeado no lugar de `calc(100vh)`, picker nativo no toque.
- `TAG_CSS`/`BTN_CSS`/`MODE_CSS` compartilhados entre views; empty state do Gantt com orientação; rollback visual no `.tk-check` (`2241-2248`); marcador de inserção no drag (`1868-1896`).

### Veredito da rodada 1

Sem erros críticos de código, sem perda de dados certa nos fluxos principais, e o
harness passa. Os riscos reais estão em: (a) **integridade** dos dados de
planejamento em casos de HTML fora do padrão e edição da nota acima do checkbox
(C1.5, C4.1, C1.7); (b) **escala** do scan global (C3.1, C3.2, C3.3); (c)
**acessibilidade** e **feedback de falhas** na UI (D3.1, D5.1). Nenhuma correção
foi aplicada nesta rodada, conforme combinado; a triagem P0/P1 e os quick wins
ficam para a próxima.

**Próximo da lista:** Writers-Tools (Fountain + Longform).

---

## ✅ Correções aplicadas — batch 1 (28/09/2026)

Critério do batch: alto valor e baixo risco (integridade, feedback visível,
a11y básica e quick wins baratos). Nada de mudança de modelo de dados.

| ID | Correção aplicada | Como foi validado |
|----|-------------------|-------------------|
| C1.1 + Q1 | `save()` avisa em falha (`api.showMessage`) com dica sobre a nota `#plannerdata` e retorna status | sintaxe + revisão |
| C1.2 | Reloads (⟳ nos 3 views) com erro visível, botão restaurado e recarga também do `plannerData` (Q6) | revisão |
| C1.3 + C1.4 + D5.4 | `loadPlannerData()` distingue ausente/corrompido: avisa no boot e preserva o conteúdo bruto no console | revisão |
| C1.5 + Q15 | `marcarCheckbox()` com a **mesma regex** do `fetchTasks`; erro explícito quando o índice não existe (antes marcava a errada/nenhuma em silêncio) | `test-planejador.js` (4 asserções, inclui atributo fora de ordem e aspas simples) |
| C1.7 + Q7 | Datas geradas pela recorrência são salvas logo após a geração | `test-planejador.js` (expansão) + revisão do fluxo |
| C1.8 | `markDone` persiste a remoção do `plannerData`/`_order` | revisão |
| C2.1 | Mensagem do erro de init passa por `esc()` | revisão |
| C2.2 | `esc()` agora cobre aspas simples (`&#39;`) | `test-planejador.js` |
| C3.1 + C6.1 | Scan global com `isProtected = 0`, exclusão de `#archived` e `try/catch` por nota (uma nota problemática não derruba o fetch) | sintaxe + revisão |
| C3.2 (parcial) | `setContent()` da expansão protegido por `try/catch` por nota | revisão |
| C4.4 | `#total` com teto de 100, `#every >= 1` e `#upto` validada (data impossível cai para hoje) | `test-planejador.js` (5 asserções) |
| C4.5 | `#total` com `\b` (não casa `#total=2x`) | `test-planejador.js` |
| C4.6 + C3.5 (parcial) | Poda de `_order` junto com a poda de órfãos | revisão |
| C6.2 | `markDone` valida nota e checkbox com mensagem clara | `test-planejador.js` (found=false) |
| C7.4 (parcial) | `item.noteLinks` no Gantt: o badge 🔗 volta a aparecer no rótulo; README corrigido (matchMedia, recorrência, entrada do batch) | revisão |
| D2.3 | "modo Quadro" → "modo Semana" | revisão |
| D3.3 + D3.1 (parcial) | Botões de modo com `role="button"`, `aria-label`, `aria-current` e `:focus-visible` | revisão |
| D5.1 + D5.2 (parcial) + D7.2 | Toasts em save/reload/concluir; erro de init com token de cor e botão "Tentar de novo" | revisão |
| Q3 | ✓ visível no Mês mobile (opacidade sempre acesa no toque) | CSS revisado |

**Testes:** `test-planejador.js` (novo, 18 asserções, extrai `esc`, `MARCAR-BE` e
`REC-BE` do fonte real) + `test-refs.js` (8 asserções) passando + sintaxe OK.

## ✅ Correções aplicadas — batch 2 (28/09/2026)

Critério: integridade de dados, performance, robustez de eventos e UI de uso
diário. Inclui uma pequena evolução de estado (`plannerData._sig`), aplicada de
forma transparente (preenchida no primeiro fetch, podada junto com os órfãos).

| ID | Correção aplicada | Como foi validado |
|----|-------------------|-------------------|
| C4.1 | Datas seguem a tarefa quando a nota é editada acima do checkbox: assinatura do texto (`assinaturaTexto`) + `reconciliarDatas()` movem data, `_sig` e `_order` para a tarefa original | `test-planejador.js` (7 asserções) |
| C4.2 | Datas locais (`isoLocal`) no kanban, mês e `isOverdue` (fim do deslocamento UTC em fusos positivos) | `test-planejador.js` (3 asserções) |
| C4.3 | Extração de texto com `<span>` balanceado (`extrairSpanDe`, bloco `SPAN-BE`), usada no scan e na recorrência | `test-planejador.js` (3 asserções) |
| C4.7 | Clones de recorrência fecham o próprio `</li>` (HTML balanceado) | `test-planejador.js` (balanceamento) |
| C4.9 | "Hoje" recalculado a cada render (`atualizarHoje`) | revisão |
| C1.6 | `migrateIds` só roda se existir ID legado (fim do O(n²) por carga) | revisão |
| C3.3 | Índice de tarefas por dia (`construirIndice`, invalidado a cada mutação): o mês não filtra 42× mais | revisão (mesmo resultado visual) |
| C3.6 + C5.1 + C2.3 | Listener de `resize` e patch de `$.fn.html/.append` instalados uma única vez (não acumulam re-execuções), com debounce; CSS hoistado sem duplicar | revisão |
| D5.3 + D6.4 + Q5 | "Limpar" com contagem e diálogo próprio (fim dos `confirm()` nativos) | revisão |
| Q4 | "Desfazer" para concluir tarefa e para limpar planejamento (barra por 12 s; desmarca o checkbox e restaura datas/ordem) | revisão em runtime pendente |
| Q12 | Picker do Mês mobile com "↗ Abrir nota" (paridade com o Kanban) | revisão |
| Q13 | Tooltips nos nomes truncados (kanban, mês, gantt e painel) + dica "solte uma tarefa aqui" em coluna vazia | revisão |
| Q14 | Re-render automático ao cruzar o breakpoint desktop↔mobile | revisão em runtime pendente |
| D4.1 | Alvos de toque maiores no mobile (‹ › ↺ ⟳, ✓, checkboxes) | revisão |
| D7.1 | Cores de tag/barra com variante para tema claro (contraste AA), detectado pelo brilho de `--main-background-color` | revisão visual pendente |
| D2.2 (parcial) | Fim de semana com tom próprio no Kanban (paridade com mês/gantt) | revisão |

**Testes:** `test-planejador.js` com **35 asserções** (ESC, MARCAR-BE com
marcar/desmarcar, REC-BE com teto/validações/`</li>`, SPAN-BE, DATAS, RECON) +
`test-refs.js` (8) passando; `bun build` OK.

## ✅ Correções aplicadas — batch 3 (28/09/2026)

Critério: paridade com o toolkit (i18n), uso diário (quick wins) e acessibilidade.

| ID | Correção aplicada | Como foi validado |
|----|-------------------|-------------------|
| C7.1 | Interface **PT/EN** pelo `locale` do Trilium: dicionário `WP_I18N`, `t()` com interpolação, dias/meses e datas por idioma (`fmtCurto`), troca detectada no boot (com re-render da tela de carregamento) | `bun build` + revisão; smoke em runtime pendente (demo EN) |
| Q2 | Indicador **salvando…/salvo ✓/erro ✗** no cabeçalho das 3 views, com limpeza automática | revisão |
| Q8 | **Atalhos**: ←/→ navegam semana/mês, `t` volta a hoje, `r` recarrega, `Esc` fecha diálogos; só com foco dentro do plugin (não rouba teclas da nota) e listener único por página | revisão em runtime pendente |
| Q9 | **Scroll preservado** nas re-renderizações (`capturarScroll`/`restaurarScroll`) e "hoje" revelado na primeira carga | revisão |
| Q10 | Botão **⇥ rolar a semana para a próxima** (+7 dias, mover datas e ordem) com Desfazer | revisão em runtime pendente |
| Q11 | **Backlog ordenado por `#upto`** (vencidos primeiro, sem prazo por último) nas 3 views; função pura `ordenarBacklog` | `test-planejador.js` (4 asserções) |
| C4.8 + D6.1 | `was-dragged` deixou de ser código morto (marcado no dragstart, limpo após o drop): clique residual não navega mais | revisão |
| D3.1 (parcial) | Controles com `tabindex`/`role`/`aria-label` (cards, chips, ✓, barras, textos) e ativação por Enter/Espaço; `:focus-visible` em todos os controles | revisão |
| D6.2 | Hover/foco do painel de Tarefas migrou dos handlers `.css()` para CSS (`:hover`/`:not(.completing)`) | revisão |
| D6.3 | `@media (prefers-reduced-motion: reduce)` desliga animações/transições do plugin | revisão |
| C7.5 | Comentário vencido do `migrateIds` atualizado (guard, não "remover após uma semana") | revisão |

**Testes:** `test-planejador.js` com **39 asserções** (novas de `ordenarBacklog`) +
`test-refs.js` (8) + `bun build` OK.

## ✅ Correções aplicadas — batch 4 (28/09/2026)

Cartão: fechamento dos refactors e do uso em escala, sem mudança funcional esperada.

| ID | Correção aplicada | Como foi validado |
|----|-------------------|-------------------|
| D2.1 | Seletor de modo **único** (`modeSwitcher`): a barra dedicada saiu; no mobile o mesmo componente vira uma linha de largura total no fim do cabeçalho (CSS, `order:10`) | `bun build` + revisão |
| D8.1 | Tipografia do painel definida **só no CSS** (função `applyCompactTaskFonts` removida; a especificidade de ID + `!important` cobria os mesmos valores) | revisão; smoke visual pendente |
| D8.2 | Piso do título de grupo no mobile 9px → **11px** | revisão |
| C3.4 | Listas longas com **limite + "+N"** expandível: 50/coluna (kanban), 8/dia (mês), 40/grupo (painel); expansões resetam a cada fetch | revisão |
| D3.2 | **Picker de dia unificado** (kanban + mês, anexado ao `$root` para sobreviver a re-renders) e atalho **`m`** move o card focado em qualquer view; `Esc` fecha; dica no título do card | revisão em runtime pendente |
| C7.2 | Base **CARD_CSS** compartilhada (kanban/mês); remoção de `modeBar`, `allCols` e das duplicações em JS (hover e tipografia) | `bun build` + revisão |
| C8.1 | Testes de **`parseTaskTags`** (bloco `TAGS`, 10 asserções): limpeza do texto, `#todo/#done`, `#doing` clamp, `#upto`→ISO, `#every/#total`, espaços e case-insensitive | `test-planejador.js` (49 asserções no total) |

## ⚠️ Incidente e correção pós-batch 4 (28/09/2026)

Os batches 3 e 4 foram deployados com um bug que só aparecia em runtime: as
chamadas de tradução usavam `t()`, **sombreado** pelo parâmetro `t` dos
`.map(t => ...)` que renderizam tarefas → `TypeError: t is not a function` e o
plugin ficava **preso no "carregando"**. `bun build` e os testes de funções puras
não pegavam (era erro de escopo em runtime, e o primeiro render não tinha guard).

- **Correção:** helper renomeado para **`tr()`** (imune a sombreamento) + **guard
  no primeiro render** (erro vira tela de erro com "Tentar de novo", nunca mais
  loading infinito).
- **Segundo bug (mesma rodada de deploy):** a substituição de `${modeSwitcher()}`
  por `modeSwitcher()` no batch 4 removeu a interpolação; o seletor
  **Semana/Mês/Gantt não renderizava em nenhuma view**. Corrigido nos 3 sites.
- **Prevenção:** novo **`test-smoke.js`** — roda o plugin no Chrome headless com
  stubs de `api`/jQuery e verifica que ele sai do "carregando", renderiza o board,
  tem **3 botões de modo** e que **Mês e Gantt renderizam** ao trocar (com espera
  do `await save`), além de console limpo.
- **Regressão verificada:** `281485f` (batch 2) passava; `3c04fa3` (batch 3) e
  `4aa8abf` (batch 4) falhavam; a versão corrigida passa. O smoke novo também foi
  validado contra a versão quebrada (3 falhas: seletor ausente, mês e gantt).
- **Lição:** todo plugin de render precisa de um smoke de runtime no CI/local —
  testes de funções puras não cobrem escopo/ordem de execução do render nem
  interpolação de template.
- **✅ Validado pelo Ricardo (28/09):** Semana/Mês/Gantt e o carregamento ok após o F5.

## ⏭️ Backlog residual (batch 5, se houver)

Migrado para o **`ROADMAP-RESIDUAIS.md`** (§ Weekly Planner): D1.2, D1.3, D2.2,
D2.4, D2.5, D4.3, D5.2, D5.3, D8.2, C7.3, C8.1 restante e virtualização real.

---

## Rodada 2 — Writers-Tools (Fountain + Longform) (29/09/2026)

**Escopo:** `Writers-Tools/js-Fountain/js - Fountain 3.js` (1.645 linhas),
`Writers-Tools/js-grid/js - grade.js` (398 linhas), `manifest.json` dos dois,
`Writers-Tools/README.md`, testes e entradas do registry (`fountain-renderer` e
`longform-compiler` 0.8.2).
**Verificação:** `bun test-fountain-stats.js` 11/11 ✅ (extração do IIFE
consertada — a regex lazy parava na IIFE interna de hoist de CSS; agora extrai
por marcadores de seção) · `bun test-grade.js` (**novo**, 25 asserções) ✅ ·
`bun build` (sintaxe) ✅ · greps de padrões + 3 especialistas (read-only) +
**conferência direta dos achados graves** (parser rodado com fixture de
boneyard; marcações conferidas linha a linha).

### Resumo executivo

| Especialista | Crítica | Alta | Média | Baixa | Sugestão | Total |
|---|---:|---:|---:|---:|---:|---:|
| 👨‍💻 Código | 0 | 5 | 16 | 13 | 4 | 38 |
| 🎨 UI/UX | 1 | 5 | 13 | 10 | 3 | 32 |
| ⚡ Quick wins | — | — | — | — | — | 18 itens |

**Top 5 (triagem sugerida):**
1. **[Alta · Código]** `marcarCenaAtiva` não existe: todo clique numa cena da sidebar lança `ReferenceError` (`1630`; a função certa é `marcarAtivo`, `979`). Correção de 1 linha.
2. **[Alta · Código]** Injeção de atributo: `escaparHtml` não escapa aspas e o resultado entra em atributos com texto do rascunho (`data-scene`, `title`) — `85-90`; `260`, `1418`, `1424`. Um `.fountain` de terceiros executa JS.
3. **[Alta · Código]** Atalhos globais `Ctrl+=`/`−`/`0` na `document` sem guarda de visibilidade nem remoção: sequestram o zoom do Trilium/Electron em qualquer nota depois de abrir o visor (`1348-1353`).
4. **[Alta · Código]** Rascunho `text` com parágrafos vazios (`<p>&nbsp;</p>`) colapsa o roteiro num bloco único — render/stats/PDF só mostram a primeira cena (`746-760` × splitter `76`); verificar o HTML real do CKEditor em runtime.
5. **[Crítica · UI]** Grid sem operação por teclado/leitor de tela (cards são `<div draggable>` sem `role`/`tabindex`, `240-244`) e o drag não funciona no toque do Capacitor (`265-325`) — no celular não há como reordenar.

### 👨‍💻 Código — achados

#### Fountain (`js - Fountain 3.js`)

**Alta**

- **C1.1 · `marcarCenaAtiva` inexistente** (`1630` × `979`): clique numa cena da sidebar lança `ReferenceError` sem captura; a rolagem até ocorre, mas o destaque e o resto do handler quebram. Correção: chamar `marcarAtivo(api.$container[0], id)`.
- **C2.1 · `escaparHtml` sem aspas → injeção em atributo** (`85-90`; usos `260`, `1418`, `1424`): `data-scene="${t.scene_number}"` e `title="${…}"` recebem texto do rascunho; um heading `INT. CASA #1" onmouseover="…"# - DIA` injeta atributo/JS. Correção: escapar `"`/`'` (ou setar via `.attr()`).
- **C5.1 · Atalhos de zoom globais** (`1348-1353`): `keydown` na `document` com `preventDefault` mesmo com o visor fora de foco; o zoom do app inteiro deixa de funcionar e o listener nunca é removido (re-execuções empilham). Correção: só agir com `#fv-root` conectado e registrar uma única vez.
- **C4.1 · Rascunho `text` colapsa blocos** (`746-760` × `76`): `&nbsp;` vira espaço e linhas com só espaço não separam parágrafos; o roteiro vira 1 bloco no parse (só a 1ª cena sobrevive). Correção: aparar espaço/NBSP por linha antes do split; verificar o HTML real do CKEditor.

**Média**

- **C3.1 · Hoist de CSS acumula a cada render** (`30-38`, chamado em `1432-1433`): `textContent +=` duplica ~13 KB em `#fv-styles` a cada ⟳/import/troca de rascunho (idem no Grid, `grade:29-32`). Correção: hoist idempotente.
- **C5.2 · Patch global de `$.fn.html`/`$.fn.append`** (`39-48`; `grade:37-44`): encadeia com os patches dos outros plugins e `.append(a, b)` perde os argumentos extras (só o 1º é repassado). Correção: helper local de injeção de CSS.
- **C5.3 · Re-execução do script sem guarda** (`1348`, `1356`; `grade:265-394`): o refresh nativo remonta a nota e empilha listeners/wrappers (zoom soma +1 por cópia; no Grid cada clique/`dragend` roda N vezes). Correção: flag `window.__fv*`/`__lg*` + `.off()`.
- **C4.2 · Scene heading com dois espaços no fim é descartado** (`150`): o comentário diz "força action", mas o `continue` joga a linha fora — a cena some do render. Correção: emitir token `action`.
- **C4.3 · PDF de rascunho vazio sai com 0 páginas** (`1150`, `1261`, `1278-1313`): `/Count 0`, inválido em vários leitores. Correção: garantir 1 página em branco.
- **C3.2 · Gerar PDF é síncrono e sem feedback** (`1508-1517`): trava a UI em roteiros longos; botão não desabilita nem mostra progresso. Correção: desabilitar + "gerando…".
- **C4.8 · Boneyard vaza para estatísticas/PDF** (`66`, `118`, `214-217`, `299-300`): o trecho entre `/*` e `*/` é tokenizado como ação normal — o HTML o esconde em comentário, mas `calcularStats`/`pdfGerar` não pulam as linhas internas (conferido com fixture: `action:ESCONDIDO` nos tokens). Correção: `emBoneyard` ignorando os tokens internos.

**Baixa**

- **C2.2 · Placeholders literais `[STAR]`/`[UL]`** (`107-113`): texto literal vira `*`/`_` no output. Correção: sentinelas improváveis.
- **C4.4 · `htmlParaTexto` decodifica só uma lista fixa de entidades** (`751-757`): entidades numéricas (`&#8217;`) ficam literais. Correção: decodificar via `DOMParser`/`textarea`.
- **C4.5 · Título multi-linha perde separação e mantém `&amp;`** (`246`; usado em `1023`, `1558`). Correção: trocar todos `<br/>` e decodificar.
- **C4.6 · `nomeSeguro` pode devolver vazio; nome do arquivo vem da nota-mãe** (`763-769`, uso `1401`): título só de símbolos gera arquivo sem nome (ex.: `fountainrenderer.*`). Correção: fallback `'roteiro'` + preferir o título do script.
- **C1.2 · `avisar` engole a falha** (`772-774`; `grade:146-149`): sem `api.showMessage` nenhuma mensagem chega (ex.: download bloqueado). Correção: `console.warn` no catch.
- **C5.4 · Renders concorrentes podem vazar `IntersectionObserver`** (`1006-1008` × `1633`; `renderizar()` sem guarda). Correção: guarda de "render em andamento".
- **C4.7 · Import grava texto cru em nota `text` com `confirm()` nativo** (`1575-1591`): a re-serialização do editor cai no problema do C4.1 e contraria o padrão de diálogos do repo. Correção: diálogo próprio + aviso sobre rascunho `code/plain`.
- **C1.3 · Iframe de impressão pode vazar** (`1041-1058`): o timeout de limpeza só é agendado no `onload`; se nunca disparar, o iframe fica no DOM. Correção: agendar a limpeza antes do `srcdoc`.

**Sugestão**

- **C7.1 · `CSS` × `CSS_IMPRESSAO` duplicados** (`331-689` × `693-735`): regras espelhadas; ajuste em um lado regride no outro. Correção: gerar a impressão da mesma fonte.
- **C7.2 · UI 100% PT hardcoded** (`1384-1503`, etc.): o repo já tem i18n PT/EN por locale (Weekly Planner, Canvas v8). Correção: dicionário + `api.getOption('locale')`.
- **C8.1 · Cobertura estreita** (`test-fountain-stats.js` 11): parser (diálogo/dual/title/ênfases), PDF e DOM sem teste. Correção: casos do parser + smoke (ver quick wins).

#### Grid (`js - grade.js`)

**Alta**

- **C1.1 · Falha ao salvar a ordem é silenciosa** (`252-262`, `318-325`): `dragend` faz `await salvarOrdem()` sem `try/catch`; a rejeição sobe sem tratamento e o toast "Ordem salva" é incondicional — a UI mente e o usuário só descobre no reload. Correção: try/catch com aviso e só avisar quando a ordem mudou.

**Média**

- **C1.2 · `#gridOrder` com JSON válido não-array derruba o render** (`183-199`; boot `398`): o try cobre só o parse; uma string JSON tem `.length` e `forEach` lança fora do try — container vazio sem nenhum aviso. Correção: `Array.isArray` + catch no render inicial.
- **C3.1 · `getNoteComplement()` sequencial por filha** (`224-225`, `354-358`): N idas ao backend no render + N na compilação, sem cache. Correção: paralelizar com limite/reaproveitar o texto.
- **C5.1 · Refresh concorrente duplica cards** (`178-247`, `333`): dois cliques rápidos em ⟳ intercalam renders no mesmo `#grid`. Correção: desabilitar/guarda de reentrada.
- **C2.1 · Compilação injeta HTML bruto das filhas** (`357`): `<script>`/`onerror` de nota importada executa no documento compilado. Correção: sanitizar (allowlist) ou compilar como texto.
- **C1.3 · Criação do compilado sem atomicidade** (`374-381`): se `setLabel('compiledDoc')` falhar, a nota vira card e pode ser compilada dentro de si (duplicação em cascata). Correção: transação/rollback.
- **C3.2 + C5.2 · CSS hoist acumula + patch global de `$`** (`29-32`, `37-44`, `201-202`): mesma família dos achados do Fountain.
- **C5.3 · Re-execução duplica handlers delegados** (`265-394`): cada clique abre a nota N vezes; cada `dragend` salva N vezes. Correção: namespace/flag de inicialização.
- **C4.1 · Drag & drop sem fallback de toque** (`265-316`): só eventos de mouse; no Capacitor reordenar não funciona (verificar em runtime). Correção: Pointer Events ou botões ↑/↓.
- **C3.3 · Payload grande no `runOnBackend` da compilação** (`362-382`): manuscritos grandes serializam todo o HTML numa chamada. Correção: escrever em passos.

**Baixa**

- **C4.2 · `dragend` salva sem mudança e em arraste cancelado** (`318-325`): escrita + toast desnecessários. Correção: comparar com a ordem atual.
- **C4.3 · Qualquer `#compiledDoc` desaparece do grid e o título é sobrescrito** (`158-160`, `369-370`): label por engano esconde a nota; título custom se perde. Correção: alertar/preservar título.
- **C4.4 · Notas não-JS/CSS viram cards e entram no compilado como texto cru** (`152-155`, `224-234`): JSON/canvas/imagem entram no documento. Correção: filtrar por tipo/mime.
- **C3.4 · Append de card a card em loop** (`239-245`): N appends/relayouts. Correção: montar tudo e anexar 1×.
- **C4.5 · Ordem inteira em um label** (`185`, `258`): o JSON cresce e aparece nos atributos. Correção: nota `#data` quando crescer.

**Sugestão**

- **C8.1 · Testes não cobrem o que dói** (`test-grade.js` 25): merge da ordem salva, `renderizar` e `gerarDocumento` sem teste; extrair a ordenação para função pura.

### 🎨 UI/UX — achados

#### Fountain

**Alta**

- **D3.1 · Cabeçalhos da sidebar não são controles** (`1466-1493`, handler `1616-1622`): divs clicáveis sem `role`/`tabindex`/`aria-expanded`; teclado não recolhe/expande e o leitor de tela lê texto solto. Correção: `<button aria-expanded aria-controls>`.
- **D3.2 · Ctrl+=/−/0 sequestram o zoom do app** (`1348-1353`; mesma raiz do C5.1): quem usa o zoom do sistema perde os atalhos em qualquer nota. Correção: escopar ao visor (ou remover os atalhos, mantendo os botões).
- **D7.1 · Impressão Ctrl+P no tema escuro tende a sair ilegível** (`649-657` × `552-553`): o `@media print` não força `color`/`background`; texto claro sobre papel branco. Correção: fixar preto no branco no print. (verificar em runtime)

**Média**

- **D5.1 · `marcarCenaAtiva` não existe** (`1630`): clique em cena pode não marcar nada se o scrollspy não disparar (mesmo achado do C1.1).
- **D3.3 + D4.1 · Nome comprido só recuperável por `title`** (`1421`, `1424`; CSS `523-524`): `title` não aparece no toque nem com foco (item não focável). Correção: quebra em 2 linhas/tooltip acionável.
- **D4.2 · Sidebar sticky sem teto de altura** (`458-467`; listas `38vh` em `490`): com as 4 seções expandidas o ATOS fica cortado sem scroll próprio. Correção: `max-height`/`overflow:auto`.
- **D4.3 · Alvos de toque < 40px** (`668-669`; itens `495-508`): botões ~34-36px e itens ~29px no mobile. Correção: `min-height: 44px`.
- **D5.2 · Atualizar/Importar/seletor sem estado de carregamento** (`1506`, `1591`, `1603`; render `1370`): cliques repetidos disparam renders concorrentes. Correção: desabilitar + "Atualizando…".
- **D5.3 + D7.2 · Erro de render sem recuperação e com `color:red` fixo** (`1636-1642`): contraste ruim no escuro e sem retry. Correção: token de erro + botão "⟳".
- **D7.3 · Contraste de auxiliares por opacidade empilhada** (`505`, `522`, `525`, `356`): `.fv-num` (0.55 sobre link 0.75) e afins abaixo de 3:1 no claro. Correção: `--muted-text-color` sólido.
- **D2.2 + D5.4 · "F5 também atualiza" não é verdade** (`1438`; README:20): não há handler de F5 no plugin; no navegador recarrega o app. Correção: implementar (escopado) ou remover a promessa. (verificar atalho nativo do Trilium)

**Baixa**

- **D8.1 · O 11pt do mobile nunca vale** (`678` × `1342`/`1634`): `aplicarZoom()` grava inline depois do render e vence a media query. Correção: zoom por classe/variável.
- **D1.1 + D2.3 · Glifos duplicados e 8 botões de mesmo peso** (`1443-1462`): "HTML" e "PDF" com o mesmo 📄; Atualizar/PDF enterrados. Correção: ícones distintos + primário.
- **D5.5 · Download `.fountain` silencioso** (`1526-1529` × avisos em `1513`/`1565`). Correção: toast.
- **D6.1 · Sem `prefers-reduced-motion`** (`1543`, `1598`, `1629`; transições `369`, `509`). Correção: media query.
- **D3.4 · Nomes acessíveis fracos** (`1443-1444`): zoom-out só "−", reset "100%", emojis sem `aria-hidden`. Correção: `aria-label`.

**Sugestão**

- **D1.2 · Estatísticas não selecionáveis e sombra fixa** (`537`, `555`): `user-select:none` impede copiar contagens; sombra some no escuro.

#### Grid

**Crítica**

- **D3.1 · Cards inacessíveis por teclado e leitor de tela** (`240-244`, clique `328-331`): sem `tabindex`/`role`/nome; abrir e reordenar só com mouse. Correção: `role="button"` + Enter/Espaço + botões mover ↑/↓.

**Alta**

- **D4.1 · Drag & drop não funciona por toque** (`240`, `265-325`): HTML5 DnD não emite eventos no WebView touch — no celular "arraste para ordenar" (promessa do README) falha em silêncio. Correção: Pointer Events/alças. (verificar em runtime)
- **D5.1 · `renderizar()` sem tratamento de erro** (`178-247`, boot `398`): falha de API deixa o painel vazio sem mensagem nem retry. Correção: try/catch com estado de erro.

**Média**

- **D5.2 · "Ordem salva" exibido mesmo se falhar/sem mudança** (`252-262`, `318-325`; mesmo achado do C1.1/C4.2). Correção: toast de erro + condicionar.
- **D6.1 + D1.1 · Posição de drop ambígua** (`294-298`; realce `104`): decide antes/depois pela metade horizontal, sem linha de inserção; em grid multi-coluna o usuário não sabe onde cai. Correção: indicador de linha.
- **D5.3 · "Atualizar" sem bloqueio durante render/generate** (`333` × `339-341`): pode rodar em paralelo com "⏳ Gerando…". Correção: desabilitar ambos.
- **D7.1 + D8.1 · Auxiliares com contraste baixo** (`108`, `63`, `116`): footer 11px/0.55, info 12px/0.6, vazio 13px/0.55 falham AA no claro. Correção: cores sólidas do tema.
- **D4.2 · Alvos de toque no mobile** (`125`, `123`): botões ~35px. Correção: `min-height: 44px`.

**Baixa**

- **D2.1 + D4.3 · "arraste" sem aviso do toque; métricas divergentes** (`206`; README:7; `70-73` × Fountain `361-362`): paddings/raios diferentes entre irmãos. Correção: alinhar tokens.
- **D5.4 · Botão desabilitado ainda reage ao hover** (`76-77`). Correção: `:not(:disabled):hover`.
- **D7.2 · Variáveis de tema sem fallback** (`67-68`, `91`, `104`): realce de drop some em tema que não defina as vars. Correção: fallbacks (o Fountain já tem).
- **D3.2 · Sem `:focus-visible` e sem foco nos cards** (`66-78`, `240`). (verificar em runtime)
- **D6.2 · Sem `prefers-reduced-motion`** (`87`, `100`, `104`).

**Sugestão**

- **D1.2 · Cards de altura irregular e grid sem `max-width`** (`94-108`, `80-84`): footer não fixado; em telas largas estica demais.
- **D5.5 · Estado vazio só textual** (`220`): sem ação de criar nota.

### ⚡ Quick wins — backlog

| # | Melhoria | Plugin | Ganho | Esforço | Risco | Onde | Validação |
|---|----------|--------|-------|:-------:|:-----:|------|-----------|
| 1 | Corrigir clique de cena (`marcarAtivo`) | Fountain | Console limpo + destaque imediato | S | Baixo | `1630` × `979` | `bun` (cruzamento) + manual |
| 2 | F5 prometido, escopado ao visor | Fountain | Cumpre `README:20` | S | Baixo/Médio | `1438`, `1348-1366` | manual (split view) |
| 3 | Escopar Ctrl+=/−/0 ao visor montado | Fountain | Devolve o zoom do app | S | Baixo | `1348-1353` | manual (outra nota) |
| 4 | Boneyard fora das stats/PDF | Fountain | Conteúdo escondido não infla páginas/duração | S | Baixo | `66`, `214-217`, `948`, `1257` | `bun` (fixture) |
| 5 | Nome do arquivo pelo título do roteiro + fallback | Fountain | Exportações deixam de sair como `fountainrenderer.*` | S | Baixo | `1401`, `763-769` | `bun` (`nomeSeguro`) |
| 6 | Aspas no `escaparHtml` (e decodificar nos limpadores) | Ambos | Fim da injeção em atributos | S | Baixo | F `85-90`; G `134-139` | `bun` (atualizar asserções) |
| 7 | i18n PT/EN por locale | Ambos | Paridade com o toolkit | M | Baixo/Médio | F `1384-1503`; G `206-215` | estático + smoke |
| 8 | Contagens nos cabeçalhos da sidebar | Fountain | Orientação em roteiro longo | S | Baixo | `1466-1493` | manual + asserção |
| 9 | Filtro de cenas na sidebar | Fountain | Achar cena sem scroll | S | Baixo | `1465-1472` | manual |
| 10 | Botão de zoom mostra o valor (`12pt`) | Fountain | Feedback do nível | S | Baixo | `1444`, `1340-1353` | manual |
| 11 | Números de cena no PDF | Fountain | Draft de produção numerado | M | Baixo | `154`, `1208-1212` | `pdftotext` |
| 12 | `try/catch` no render do grid + estado de erro | Grid | Filha problemática não deixa o grid pela metade | S/M | Baixo | `178-247` | manual |
| 13 | Total de palavras no header | Grid | Tamanho do documento de relance | S | Baixo | `204-215`, `236-243` | `bun` (soma pura) |
| 14 | Botão "Abrir compilado" | Grid | Não caçar a nota na árvore | S | Baixo | `179-180`, `162-167` | manual |
| 15 | Falha/corrupção do `#gridOrder` visível | Grid | "Ordem salva" não mente | S | Baixo | `183-187`, `252-262` | manual |
| 16 | Reordenar sem mouse (↑/↓) | Grid | Toque e teclado sem DnD | M | Médio | `239-245`, `265-331` | manual (touch) |
| 17 | `Promise.all` no carregamento das filhas | Grid | Grid abre mais rápido | S/M | Baixo | `224-225` | manual cronometrado |
| 18 | Smoke de runtime dos dois render notes | Ambos | Pega erro de escopo/runtime (classe do C1.1) | M | Baixo | novos `test-smoke.js` | rodar (falharia hoje no clique da cena) |

**Notas dos 5 primeiros:** (1) trocar a chamada por `marcarAtivo(api.$container[0], id)`;
(2) `keydown` de F5 com `preventDefault` + `renderizar()`, atrás da mesma guarda de
visibilidade do item 3; (3) sair cedo nos dois handlers quando `#fv-root` não estiver
conectado, antes de qualquer `preventDefault`; (4) `emBoneyard` em `calcularStats` e
`pdfGerar` ignorando os tokens internos (o HTML já usa comentário); (5) preferir o
título do script e fechar `nomeSeguro` com `|| 'roteiro'`.

**Descartes explícitos:** poda de ids órfãos do `#gridOrder` (invisível hoje);
persistir zoom/seções recolhidas (estado de sessão, sem ganho); autosave/edição do
rascunho no visor (contra o desenho leitura); modal próprio para o Import (fluxo
raro); virtualização/"+N" nas listas da sidebar (o `max-height` com scroll segura e
"+N" conflitaria com o scrollspy e as âncoras `#cena-N`).

### Pontos fortes (não mexer)

- Escaping antes do lexer: todo texto de token vira HTML escapado (`238-240`) — a lacuna é só em atributos (C2.1).
- Callbacks de `api.runOnBackend` exemplares: auto-contidos, args em array, `return` correto (`1582-1584`, `1606-1608`, `362-382`).
- PDF proprietário funciona e é honesto (Courier/WinAnsi, capa, números de página) — o furo é o rascunho vazio.
- CSS 100% escopado em `#fv-root`/`#lg-root`, com teste automatizado de vazamento (`test-grade.js`).
- Parser: dual dialogue, acentos (`\p{Lu}` + `/u`), title page, seções e page break — exercitados nesta rodada.
- `#compiledDoc` com atualização in place (`grade:364-372`) — resolve duplicatas sem drama.
- Guarda de 250 ms para o clique pós-drag (`grade:327-331`); estados de drag nomeados.
- Fountain: impressão autossuficiente preto-no-branco (CSS próprio + PDF), modo foco com Esc, empty state com instruções, números de cena na margem.
- README fiel ao comportamento real; zips em dia (md5 do JS dentro dos zips = fonte; registry 0.8.2 nas duas entradas).

### Versões/registry/README

- `registry.json`: `fountain-renderer` e `longform-compiler` 0.8.2, `meta.updated` 27/09; manifests sem campo `version` (padrão do repo) — sem divergência de versão.
- Ajustes finos de descrição: o registry diz que o Longform "aggregates a subtree", mas o plugin compila **filhas diretas** (`grade:179`); o Fountain é descrito com tag `comics`/"panel descriptions" enquanto o README fala de roteiro audiovisual.

### Veredito da rodada 2

Dois plugins maduros (escaping consistente fora de atributos, sandbox correto, CSS
escopado, PDF/impressão próprios) com riscos concentrados em: (a) **um bug certo de
runtime** no Fountain (`marcarCenaAtiva` — C1.1/D5.1); (b) **injeção por atributo**
via `escaparHtml` sem aspas (C2.1); (c) **atalhos globais** que sequestram o zoom e
listeners que se acumulam (C5.1/C5.3); (d) **acessibilidade e toque** no Grid
(crítica D3.1) e do Fountain (D3.1); (e) **falhas silenciosas** de persistência
(Grid C1.1, `#gridOrder` C1.2) e de parse (Fountain C4.1 — verificar em runtime).
Nenhuma correção foi aplicada no código dos plugins nesta rodada (só o conserto do
`test-fountain-stats.js` e o novo `test-grade.js`, em `Fase 0`).

**Próximo da lista:** Canvas-Note-Tools (rodada 3).

---

## ✅ Correções aplicadas — rodada 2, batches 1-3 (29/09/2026)

### Batch 1 — bugs, segurança e integridade

| ID | Correção aplicada | Como foi validado |
|----|-------------------|-------------------|
| C1.1 + D5.1 | `marcarCenaAtiva` inexistente → `marcarAtivo(raiz, id)` (Fountain) | smoke (clique numa cena, console limpo) |
| C2.1 | `escaparHtml` passou a escapar `"`/`'`; `data-scene` também escapado; atributos `title`/`aria-label` cobertos (Fountain + Grid) | `test-fountain-stats` (aspas), `test-grade` (aspas em atributo) |
| C5.1 + D3.2 | Atalhos (Ctrl+=/−/0, F5, Esc) só agem com o visor montado no documento; listener novo remove o anterior (não acumula) | smoke + revisão |
| C4.2 | Scene heading com dois espaços vira **ação** (não some mais) | `test-fountain-stats` (fixture) |
| C4.8 + QW4 | Boneyard `/* */`: regex com flag `m` reconhece o bloco compacto; conteúdo fora das estatísticas e do PDF | `test-fountain-stats` (2 fixtures: com e sem linha em branco) |
| C4.1 | Linhas só com espaço/NBSP normalizadas no parser (rascunho `text` não colapsa mais tudo num bloco) | `test-fountain-stats` (fixture com espaço + NBSP) |
| C4.3 | PDF de rascunho vazio gera 1 página válida (antes `/Count 0`) | revisão |
| C4.5 | Título com múltiplas linhas troca todos os `<br>` (antes só o 1º) | revisão |
| C3.2 | Botão 📄 PDF desabilita e mostra "⏳ …" antes da geração síncrona (o navegador pinta) | smoke (botão existe) + revisão |
| C1.3 | Iframe de impressão ganhou limpeza de segurança agendada fora do `onload` (não fica órfão) | revisão |
| C1.2 | `avisar` com fallback `console.warn` quando `api.showMessage` não existe (Fountain + Grid) | revisão |
| QW5 | `nomeSeguro` fecha com `'roteiro'` e o arquivo usa o título do roteiro (`resultado.title → rascunho → nota mãe`) | `test-fountain-stats` (`nomeSeguro`) |
| Grid C1.1 + D5.2 | `salvarOrdem` com `try/catch` + aviso; toast "Ordem salva" só quando a ordem muda | smoke (ordem salva + aviso) |
| Grid C1.2 + D5.1 | `#gridOrder` não-array ignorado; `renderizar` com guarda de reentrada e **erro visível com "Tentar de novo"** | smoke + revisão |
| Grid C3.1 + C3.4 | Conteúdo das filhas carregado em paralelo, cards montados e anexados de uma vez | smoke (2 cards) |
| Grid C5.1 + C5.3 + C5.2 | Handlers delegados com namespace `.lg` (`.off` antes de reinscrever); CSS hoist idempotente e patch de `$.fn` instalado uma vez, preservando argumentos extras (Fountain + Grid) | smoke (re-render não duplica) |
| Grid C2.1 | `sanitizarHtml` no conteúdo compilado (remove script/iframe/on*/javascript:) | `test-grade` (5 asserções) |
| Grid C1.3 | Nota + label `#compiledDoc` na mesma transação (`api.transactional`) — sem nota órfã sem label | revisão |

### Batch 2 — UI/UX, acessibilidade e quick wins

| ID | Correção aplicada | Como foi validado |
|----|-------------------|-------------------|
| D3.1 | Sidebar do Fountain: as 4 seções viraram `<button aria-expanded aria-controls>` (teclado + leitor de tela) | smoke (4 botões com aria) |
| D4.2 | Sidebar com `max-height` + scroll próprio (não corta os ATOS) | revisão |
| D4.3 + Grid D4.2 | Alvos de toque ≥44px no mobile (botões, seções, itens) | revisão |
| D5.2 | ⟳ Atualizar com "⏳ Atualizando…" e desabilitado durante o render | revisão |
| D5.3 + D7.2 | Erro de render com cor do tema e botão "⟳ Tentar de novo" (Fountain) | revisão |
| D7.3 + Grid D7/D8 | Auxiliares com `--muted-text-color` (fim das opacidades empilhadas); fallbacks de tema no Grid; `:not(:disabled):hover` | revisão |
| D8.1 | Zoom do Fountain não sobrescreve mais o 11pt do mobile até o usuário mexer | revisão |
| D6.1 + Grid D6.2 | `prefers-reduced-motion` nos dois; scroll suave vira "auto" quando o sistema pede (`rolarAte`) | revisão |
| D1.1 + D2.3 | Glifos distintos: 📃 HTML × 📄 PDF; 📂 Importar | revisão |
| D5.5 | Toast no download `.fountain` | revisão |
| D3.4 | `aria-label` nos botões de zoom (−/100%/+); rótulo mostra o valor atual (QW10) | revisão |
| Grid D3.1 + D4.1 | Cards focáveis (`tabindex`, `aria-label`, Enter/Espaço abre) e **botões ↑/↓** (toque/teclado); setas ↑/↓ movem o card focado | smoke (4 botões, reordenação salva) |
| QW8 | Contagens nos cabeçalhos da sidebar (CENAS/PERSONAGENS/LOCAIS/ATOS) | revisão |
| QW11 | Números de cena (`#1#`) na margem do PDF (paridade com a tela) | revisão |
| QW13 | Total de palavras no cabeçalho do Grid | smoke (5 palavras) |

### Batch 3 — i18n PT/EN + smokes de runtime

| ID | Correção aplicada | Como foi validado |
|----|-------------------|-------------------|
| C7.1 + QW7 | UI PT/EN pelo idioma do Trilium nos dois plugins (`FV_I18N`/`LG_I18N`, `tr()` com interpolação, plural simples, números por cultura; palpite por `navigator.language` + confirmação via `api.getOption('locale')`) | `test-grade` (i18n), smokes, revisão |
| QW18 | **Smokes de runtime** (Chrome headless) nos dois: Fountain (visor renderiza, boneyard oculto, 4 seções aria, clique de cena sem erro, console limpo) e Grid (2 cards, contagem/palavras, ↑/↓ reordena e salva, console limpo) | `bun test-smoke.js` (2 arquivos) |
| C8.1 | Testes ampliados: `test-fountain-stats` 23 asserções, `test-grade` 32 (aspas, sanitize, i18n, boneyard, ação forçada, nomeSeguro) | `bun` (todos passam) |
| C7.4 | README atualizado (teclado, ↑/↓, boneyard, i18n, números de cena no PDF, F5 real) | revisão |

**Deploy (29/09):** VPS `IlceVgXnQzxs`/`j6VU9kINZa34` e demo `NhiWdtED6sSR`/`0zZQ6aBS8Qo1`
via ETAPI; **sha256 idêntico repo = VPS = demo = zip** (`c1d55a3a…` Fountain,
`8b588412…` Grid); zips de export regenerados. ⚠️ **Achado do deploy:** o Fountain
no VPS/demo estava na versão de 26/09 (sem o hoist de CSS de 27/09) — agora alinhado
com o repo. Token novo do demo: `wrDeploy2909_…` (criado por linha em `etapi_tokens`
+ restart do container, procedimento conhecido).

**Residual (não feito nesta rodada):** migrado para o **`ROADMAP-RESIDUAIS.md`**
(§ Writers-Tools): QW9 (filtro de cenas), QW14 (abrir compilado), C7.1
(`CSS_IMPRESSAO` duplicado), C4.4 (entidades numéricas no `htmlParaTexto`), C4.7
(import com `confirm`), Grid C3.3 (payload da compilação em passos), Grid C4.4
(filtro por tipo/mime) e Grid C4.3 (alerta de `#compiledDoc` enganoso). O bump de
registry/release segue no `SESSION.md`.

---

## Rodada 3 — Canvas-Note-Tools (widget + launcher mobile) (29/09/2026)

**Escopo:** `Canvas-Note-Tools/Canvas-note-tools/Canvas tools v8.js` (3.137 linhas),
`mobile-launcher.src.js` (644), `build-mobile-launcher.js` (80) e o **gerado**
`mobile-launcher.js` (2.100, auditado por fonte/sincronia, não linha a linha);
`README.md`, `test-flow-engine.js` (54 asserções), `test-mobile-launcher.js` (28) e a
entrada `canvas-note-tools` 0.8.0 do registry. `Canvas tools v6/v7.js` e o spike
ficam fora do escopo (histórico).
**Verificação:** `bun test-flow-engine.js` 54 ✅ · `bun test-mobile-launcher.js` 28 ✅ ·
`bun build` (sintaxe) ✅ · gerador em sincronia (só o timestamp muda) · zip = repo ·
3 especialistas (read-only) + **conferência direta dos achados graves** (trechos
citados conferidos no fonte: `catch → data={}`, `rel.label`, `groupIds`, `innerHTML`,
`confirm()`, cores fixas e a asserção tautológica do teste).

### Resumo executivo

| Especialista | Crítica | Alta | Média | Baixa | Sugestão | Total |
|---|---:|---:|---:|---:|---:|---:|
| 👨‍💻 Código | 0 | 4 | 14 | 20 | 4 | 42 |
| 🎨 UI/UX | 2 | 8 | 18 | 5 | 2 | 35 |
| ⚡ Quick wins | — | — | — | — | — | 16 itens |

**Top 5 (triagem sugerida):**
1. **[Alta · Código]** `rel.label` não existe (a lista tem `labelKey`): o rótulo da seta **nunca** é atualizado ao salvar relações, apesar da promessa do README (`v8:2391`; lista `v8:34-40`; `mobile-launcher.src.js:511`). Correção de 1 linha nos dois front-ends.
2. **[Alta · Código]** Template inserido duas vezes compartilha `groupIds` (o clone remapeia ids/bindings/container/frame, não grupos, `v8:2668-2692`); remover um card apaga elementos das duas cópias (`_doRemoveCard` casa por grupo, `v8:1918-1927`).
3. **[Alta · Código]** Canvas com JSON corrompido é sobrescrito sem aviso: `catch (_) { data = {}; }` + `setContent` (padrão em 10 pontos, `v8:3009-3013`/`3089` etc.).
4. **[Crítica · UI]** Editor flutuante sem `role="dialog"`/`aria-modal`/foco preso, e o Esc **não** fecha (handler omite `clw-editor-float`, `v8:1694-1704`); o diálogo do launcher idem (`src:536-613`).
5. **[Alta · Código]** Sync faz N round-trips e **N gravações do canvas inteiro** (parse+stringify+setContent por card, `v8:2190-2193`; `src:326-332`) — serialização O(N²); canvas grande/mobile trava.

### 👨‍💻 Código — achados

#### Widget (`Canvas tools v8.js`)

**Alta**

- **C1.1 · Canvas com JSON corrompido sobrescrito sem aviso** (`3009-3013`, `3089`; padrão em `1856`, `1911`, `1966`, `2112`, `2179`, `2223`, `2428`, `2464`, `2758`): o parse falha, `data` vira `{}` e o fluxo segue para `setContent`, trocando o canvas por um quase vazio. Correção: abortar com erro visível quando o parse falhar.
- **C4.1 · `groupIds` não remapeado no clone de template** (`2668-2692`): cópias do mesmo template ficam presas (mover seleciona as duas) e `_doRemoveCard` (`1918-1927`) apaga elementos das duas. Correção: remapear `groupIds` com o mesmo mapa dos ids.
- **C4.2 · `rel.label` inexistente → rótulo da seta nunca atualiza** (`2391`; `RELATION_TYPES` `34-40`): `newText = rel ? rel.label : select.value` resulta em `undefined` e o backend ignora (`if (!newText) continue`, `2431`); no mobile vira `''` (`src:511`). Correção: `this._t(rel.labelKey)` / `t(rel.labelKey)`.

**Média**

- **C1.2 · Editor salva "fantasma"** (`2044-2049`, `2054`): nota apagada entre abrir e salvar → backend retorna sem erro e a UI mostra "salva" (texto perdido em silêncio). Correção: lançar erro quando `api.getNote` não achar.
- **C2.1 · HTML cru da nota entra no DOM e volta ao salvar** (`2021`, `2038`; `src:406`): `innerHTML = note.content` no `contenteditable` (e no diálogo) sem sanitização. Correção: sanitizar (allowlist) ou usar o editor do Trilium.
- **C3.1 · Sync O(N) chamadas × N gravações do canvas** (`2190-2193`, `2163`; `src:326-332`): `_updateCardText` refaz parse/stringify/setContent por card. Correção: callback único em lote.
- **C4.3 · Colunas de cards se sobrepõem 50 px** (`15-25`, `3026`): `CARD_CONFIG.width = 330` com `colGap = 280`. Correção: `colGap ≥ width + margem`.
- **C4.4 · Linha do grid usa altura estimada** (`3022-3027`): card alto na linha de cima faz o próximo nascer sobreposto (y por estimativa, não pelo fundo real). Correção: usar os elementos já posicionados.
- **C4.5 · Card sem excerpt nunca ganha excerpt no sync** (`2134-2152`): o sync só atualiza `texts[1]` se ele existir; card de nota vazia fica sem trecho para sempre. Correção: criar o texto no sync quando o conteúdo aparecer.
- **C4.6 · Nota duplicada no canvas: sync atualiza só o 1º card** (`2115`; inserção sem dedupe `3016-3020`): o segundo card nunca sincroniza e o longform duplica a nota. Correção: deduplicar na inserção e iterar todos os rects com o mesmo link.
- **C7.1 · Lógica de cards/limpeza duplicada em 3+ pontos** (`1852-1864`, `1962-1974`, `2175-2183`; helpers `2073-2107` × `2960-2994`): só uma cópia tem marcador `CLW-BE-*`; editar a "errada" não afeta o launcher. Correção: extrair um backend `CARDS` + helpers únicos.

**Baixa**

- **C1.3 · "undefined" nas mensagens de erro** (`1824`, `1939`, `2198`, `2785`; `src:315`): `err.message` sem guarda. Correção: `(err && err.message) || err`.
- **C1.4 · Captura sem try/catch no `activateNote`** (`3114-3118`): canvas apagado pode rejeitar sem tratamento. Correção: try/catch + desligar a captura.
- **C1.5 · Conteúdo não-string derruba a busca inteira** (`2894-2898`): `.replace` direto em `getContent()`. Correção: try/catch por nota (verificar em runtime).
- **C2.2 · Opção custom de relação sem escape** (`2339-2341`): `safeValue` só remove `"` e entra via `innerHTML`. Correção: criar a `<option>` via DOM.
- **C2.3 · Longform injeta o título sem escape** (`2505`): `<h2>${note.title}</h2>`. Correção: `escapeHtml`.
- **C3.2 · Busca sem token de sequência** (`1706-1711`, `2867-2931`): resposta antiga pode sobrescrever a nova. Correção: comparar com a última query antes de renderizar.
- **C3.3 · Layout do fluxo com `shift()` e DFS recursivo** (`312-318`, `282-291`): fila O(N²) e recursão profunda. Correção: índice de fila e DFS iterativo.
- **C4.7 · Título do card sem wrap** (`3067` × `2136`): o excerpt tem wrap; o título estoura os 330 px. Correção: aplicar o mesmo wrap.
- **C4.8 · Cards sem `index`; índices de template recomeçam em `a00`** (`3044-3087`; `2689`): z-order indefinido e colisão de índices entre inserções. Correção: índice único no INSERT e sequência contínua.
- **C4.9 · Ctrl+Z não desfaz nada** (`3089`, `3097`, `2775`, `2781`): `setContent` + `activateNote` remontam o Excalidraw. Correção: documentar ou usar a API do Excalidraw.
- **C5.1 · Listeners de documento duplicados na reinjeção** (`1030-1033`, `1694`, `1720`): `_refineLang` remove o root e o bind registra keydown/click de novo sem remover os antigos. Correção: remover antes de registrar.
- **C5.2 · Fechamento inconsistente de painéis/editor** (`1720-1730` sem `clw-relmap-panel`; `1694-1704` sem `clw-editor-float`; `1677` o ✕ do editor salva): painel de relações ignora clique-fora; editor sem "Cancelar". Correção: incluir relmap no clique-fora e adicionar Cancelar.
- **C7.2 · Pontas soltas de i18n** (`669`, `677`, `713`, `1118`, `2037`, `2122`): chaves mortas (`remove.btn`, `edit.btn`, `flow.note_error`), `remove.empty` no painel de edição e "Sem título" hardcoded. Correção: limpar e traduzir.
- **C7.3 · Cache de templates nunca invalidado** (`2582-2583`): template novo só aparece após recarregar. Correção: invalidar ao abrir/salvar.
- **C7.4 · `style.id` atribuído duas vezes** (`1229`, `1231`): inócuo, mas é código copiado.
- **C8.1 · Asserção de z-index tautológica** (`test-flow-engine.js:131-132`): `|| idxSorted.length === els.length` faz passar sempre (inclusive com índice duplicado/ausente). Correção: comparar com a ordem original.
- **C8.2 · Teste com caminho fixo de `$HOME`** (`test-flow-engine.js:4-5`): quebra fora do checkout original. Correção: `__dirname`.

**Sugestão**

- **C4.10 · Textos não vinculados às formas** (`455`, `516-526`, `3044-3086`): sem `containerId`/`boundElements`, texto e forma movem/redimensionam separados.
- **C4.11 · `flowZIndex` esgota em 3.844 elementos** (`187-192`): base fixa colide depois disso.
- **C7.5 · `window._clw` e timers sem limpeza** (`977-996`, `1706-1717`).
- **C8.3 · Falta smoke de runtime do widget/diálogo** (`test-mobile-launcher.js:15-17`): os testes cortam a IIFE; DOM, painéis, editor e `refreshWithNote` ficam sem cobertura.

#### Launcher mobile (`mobile-launcher.src.js` + build)

- **M4.1 · Rótulo da seta também nunca atualiza no mobile** (`src:511`; raiz do C4.2). **[Alta]**
- **M2.1 · HTML cru da nota no diálogo** (`src:406`): `${dados.content || ''}` dentro de `innerHTML`, sem sanitização. **[Média]**
- **M3.1 · Sync com N round-trips no launcher** (`src:326-332`): mesma estrutura do desktop, agravada no app mobile. **[Média]**
- **M1.1 · Nota criada fica órfã se o insert falhar** (`src:310-316`): `NEWNOTE` e `INSERT` são chamadas separadas; a segunda falha e o usuário só vê o erro. Correção: avisar ("nota criada, card não inserido"). **[Média]**
- **M5.1 · Re-render por idioma apaga o estado do diálogo** (`src:601-604`): o locale confirmado chama `abrir()` de novo e perde DSL/filtro. Correção: atualizar só os rótulos. **[Média]**
- **M5.2 · Sem Esc, foco inicial ou focus trap** (`src:613-614`): só ✖ e clique-fora fecham. Correção: tratar Escape e conter o foco. **[Média]**
- **M7.1 · Cache de templates permanente** (`src:156-163`): template novo só depois de reabrir o app. Correção: revalidar a cada abertura. **[Média]**
- **M7.2 · Duas UIs para as mesmas ações** (`src:300-528` × `v8:1801-2521`): correções de fluxo precisam ser feitas em dois lugares. Correção futura: controller compartilhado com adaptador de diálogo. **[Baixa]**
- **B1 · Build não valida referências nem sobras** (`build:44-61`, `74-76`): `CLW_BE_*` errado ou marcador sem entrada em `BACKENDS` só quebra em runtime. Correção: validar no build. **[Baixa]**
- **B2 · Timestamp no cabeçalho gera diff a cada build** (`build:67`): `git diff` sempre acusa o gerado. Correção: remover/isolá-lo. **[Baixa]**

### 🎨 UI/UX — achados

#### Widget (`Canvas tools v8.js`)

**Crítica**

- **D3.1 · Editor flutuante sem semântica de modal, Esc e foco preso** (`1186-1201`, `1258-1271`, `1694-1704`): `div.clw-editor-overlay` sem `role="dialog"`/`aria-modal`/`aria-labelledby`; o Esc não inclui `clw-editor-float`; o foco escapa para o canvas atrás. Correção: `role="dialog"`, foco preso, Esc fecha/cancela e devolve o foco.

**Alta**

- **D3.2 · Resultados de busca e templates são `div` clicáveis** (`2912-2928`, `2628-2633`; CSS `1342`): sem `tabindex`/`role`/Enter/Setas — o `:focus-visible` existente é código morto. Teclado não insere nota nem template. Correção: `<button>`/`role="option"` com navegação.
- **D3.3 · Botões da toolbar só com emoji e `title`** (`1210-1222`, `1772-1780`): o nome acessível é o emoji; o toggle 🎯 não tem `aria-pressed`. Correção: `aria-label` com `t('btn.*')`.
- **D7.1 · Cores fixas de tema escuro sobre o tema claro** (`1421-1427`, `1527-1533`, `1448-1454`, `2590`, `2713`): `#f38ba8` (~2,3:1) e `#cba6f7` (~2:1) no claro. Correção: tokens de erro/accent por tema.
- **D7.2 · Fallbacks escuros misturados com variáveis do tema** (`1297-1300`, `1364-1368`): `.clw-input` com fundo `#181825` fixo + `var(--main-text-color)`; `.clw-round-btn` `#313244`. Risco de texto escuro sobre fundo escuro no tema "next". Correção: fallbacks por tema.
- **D4.1 · Painéis sem `max-height`** (`1249-1271`, `1128-1129`, `1567-1568`): fluxo com textarea `min-height:280px` e busca até 320px; em janelas baixas o topo é cortado sem scroll. Correção: `max-height:calc(100vh - 120px)` + `overflow:auto`.

**Média**

- **D5.1 · "Salvar" desabilitado sem estado visual** (`1433-1441`, `2040-2041`, `2058-2059`): sem `:disabled` no `.clw-btn-primary` e sem "Salvando…". Correção: estilo + rótulo.
- **D5.2 · `confirm()` nativo com texto PT hardcoded** (`1881`): diverge do padrão de 2 toques do launcher (`src:443-449`) e vaza PT em UI EN. Correção: confirmação inline via i18n.
- **D1.1 · Hierarquia invertida no painel de ajuda** (`1627-1653`): título 13px, nomes 17px, descrições 16px. Correção: 14-15px nos itens.
- **D8.1 · Micro-tipografia** (`1253`, `1283`, `1311-1314`, `1505`): títulos de painel 11px em caixa alta e status 12px. Correção: piso 12-13px.
- **D3.4 · Inputs só com placeholder** (`1065-1067`, `1076-1078`, `1138-1140`, `1160-1161`, `1193-1194`): sem `<label>`/`aria-label`. Correção: `aria-label`.
- **D2.1 · Chrome inconsistente entre painéis** (`1060-1081` vs `1088`, `1104`, `1115`, `1126`, `1158`, `1171`): busca e nova nota não têm ✕. Correção: padronizar cabeçalho.
- **D2.2 · Painel de relações ignora clique-fora** (`1720-1731`): o README promete "click outside closes". Correção: incluir `clw-relmap-panel`.
- **D4.2 · Linha de botões `nowrap` pode estourar** (`1142-1149`, `1356`, `1590`): sem `flex-wrap`/`min-width:0`. Correção: permitir wrap.
- **D4.3 · Status sem quebra de palavra** (`1311-1314`, `1504-1507`): erros com IDs longos estouram o painel (o launcher já quebra, `src:130-134`). Correção: `overflow-wrap`.
- **D2.3 · Hardcoded PT fora do i18n e chaves trocadas** (`1118`, `2037`, `2122`, `2370`, `2600`, `2830`, `2910`, `2340`): "Sem título", "(custom)", `remove.empty` no editor e `longform.read_error` nas relações. Correção: chaves novas/corretas.

**Baixa**

- **D6.1 · Sem `prefers-reduced-motion`** (`1234-1246`, `1379-1393`, `1875`, `1985`, `2309`, `2915`): pulse infinito da captura e animações em cascata. Correção: media query.
- **D6.2 · "Glass" sem efeito real** (`1260-1270`): fundo opaco + `backdrop-filter` custoso. Sugestão: remover o blur ou translucidez real.
- **D3.5 · Esc não devolve o foco ao gatilho** (`1694-1704`): foco cai no body ao fechar. Correção: refocar o botão de origem.
- **D5.3 · Botão destrutivo indiferenciado em repouso** (`1397-1400`, `1220`): o perigo só aparece no `:hover`. Correção: sinal em repouso.

**Sugestão**

- **D1.2 · 11 botões de peso idêntico, sem agrupamento** (`1210-1222`): destrutivo no meio da barra; ordem da barra difere do README (`README:44-56`). Sugestão: agrupar e sincronizar a ordem.
- **D5.4 · Busca sem retry e captura sem desfazer** (`2932-2936`, `3092-3097`).

#### Launcher mobile (`mobile-launcher.src.js`)

**Crítica**

- **D3.6 · Diálogo sem semântica de modal, Esc e foco** (`536-613`, `629-632`): `#clwm-root` sem `role="dialog"`/`aria-modal`/`aria-labelledby`, sem Escape/foco inicial/trap e o ✖ (`546`) sem `aria-label`. Correção: padrão de modal.

**Alta**

- **D3.7 · Abas sem semântica nem estado acessível** (`549-554`, `616-625`): sem `role="tablist"/"tab"`/`aria-selected`/`aria-controls`. Correção: padrão WAI-ARIA de tabs.
- **D4.4 · Alvos de toque abaixo de 40px** (`76-79`, `84-89`): ✖ ~26×34px e abas ~34px. Correção: `min-height/min-width:44px`.
- **D5.5 · "Voltar" descarta o editor sem aviso** (`404-421`, `587`, `640`): o botão fica visível durante a edição e alterações somem (no desktop fechar salva). Correção: confirmar descarte ou salvar.

**Média**

- **D4.5 · Truncamento irrecuperável** (`80-83`, `119-124`, `267-272`, `385-390`): `ellipsis` sem `title`/expansão; em touch o título longo nunca é lido. Correção: `title` ou 2 linhas.
- **D5.6 · "…" permanente quando templates falham** (`190-198`): o catch só escreve no status. Correção: limpar a lista e oferecer retry.
- **D5.7 · Estados vazios fracos** (`260-265`, `439-455`): busca vazia mostra "—"; lista pós-remoção fica vazia sem mensagem. Correção: `search.empty`/`remove.empty`.
- **D2.4 · Paridade quebrada nas relações custom** (`490-494` × `v8:2337-2342`): o desktop cria "(custom)"; o launcher perde o valor. Correção: mesma lógica nos dois (ver QW1).
- **D2.5 · Strings fora do i18n e tipografia divergente** (`545`, `587`, `410`, `98-105`): "🎨 Canvas Mobile", "‹ Voltar", "Sem título"; monoespaçada × sans. Correção: i18n + fonte única.
- **D7.3 · Cores fixas e fallback da aba ativa** (`90-93`, `128-129`): `.perigo` `#e78284` ~2,7:1 no claro; fallback `#ddd` pode ficar ilegível no escuro. Correção: tokens de tema.
- **D6.3 · Sem hover/transição** (`107-127`): roda também em desktop/web. Correção: `:hover` discreto.
- **D3.8 · Status sem região viva** (`41-44`, `130-134`): sem `aria-live`/`role="status"`. Correção: `aria-live="polite"`.

**Baixa**

- **D5.8 · Re-render do locale pode apagar digitação** (`598-608`): reinjeta o diálogo nos primeiros ms. Correção: só atualizar rótulos (mesma raiz de M5.1).

### ⚡ Quick wins — backlog

| # | Melhoria | Onde | Ganho | Esforço | Risco | Validação |
|---|----------|------|-------|:-------:|:-----:|-----------|
| 1 | Corrigir o rótulo da seta (`labelKey` traduzido) e extrair `clwDetectRelation`/`clwArrowLabel` puros | `v8:2390-2391`; `src:492-511`; engine `v8:34-69` | Cumpre o README; unifica desktop/mobile | S | Baixo | `bun` nos helpers + assert de `CLW_BE_REL_SAVE` com `textElId` |
| 2 | Usar as chaves `remove.btn`/`edit.btn` já existentes nos botões das listas | `v8:1878,1988` | Painéis EN sem PT misturado | S | Baixo | locale EN + paridade do teste |
| 3 | Criar `common.untitled` e usar em editor/sync/templates/busca (+ mobile) | `v8:2037,2122,2600,2910`; `src:410` | Fim do "Sem título" em EN | S | Baixo | paridade de chaves + grep |
| 4 | Trocar o `confirm()` nativo pelo padrão de 2 toques do mobile | `v8:1881` (`src:443-450`) | Consistência e sem diálogo bloqueante | S | Baixo | manual (armar → confirmar/cancelar) |
| 5 | Esc fecha o editor salvo (como o ✕) e ✕ ganha dica "salva ao fechar" | `v8:1694-1704,1677` | Cumpre "Esc fecha qualquer painel" | S | Baixo | manual (editar, Esc, conferir nota) |
| 6 | Clique-fora fecha também o painel de relações; abrir 🕸️ fecha os outros | `v8:1720-1731,2203-2216` | Menos painéis empilhados | S | Baixo | manual |
| 7 | Invalidar o cache de templates ao salvar template pelo 🪄 | `v8:2602` + `2856-2858` | Template novo aparece sem F5 | S | Baixo | manual |
| 8 | Progresso na sincronização (`i/n`) no loop desktop e mobile | `v8:2190-2193`; `src:328-332` | Canvas grande não parece travado | S | Baixo | manual + chave nova |
| 9 | Busca mostra "15 de N"; listas de editar/remover limitadas a 50 com "+N" | `v8:2894`; `src:267`; listas `v8:1872-1891,1982-1995` | Sabe-se que há mais; painéis não esticam | S/M | Baixo | manual com 60 cards |
| 10 | Paridade do launcher: "Exemplo" (chave existe), templates ordenados, busca vazia com `search.empty` | `src:556-570,160-161,263` | Mesmo comportamento do desktop | S | Baixo | manual no launcher |
| 11 | Enter no campo de busca insere o primeiro resultado | `v8:1706-1711` | Inserir card sem tirar a mão do teclado | S | Baixo | manual |
| 12 | `aria-label` nos botões circulares da toolbar | `v8:1211-1221` | Leitor de tela anuncia a ação | S | Baixo | inspeção de DOM |
| 13 | Portabilidade do teste: `__dirname` + `mkdirSync` da pasta de saída | `test-flow-engine.js:4-6,137` | `bun test-flow-engine.js` roda em qualquer checkout | S | Baixo | copiar para `/tmp` e rodar |
| 14 | `build-mobile-launcher.js --check` (compara ignorando o timestamp, sai 1 se divergir) | `build:63-79` | Detecta gerado desatualizado antes do release | S | Baixo | rodar sincronizado (0) e após 1 linha (1) |
| 15 | Desfazer remoção de card (backend devolve ids; "Desfazer" restaura `isDeleted=false`) | `v8:1905-1941,1880-1889` | Recupera toque acidental | M | Médio | assert no teste + manual |
| 16 | Consolidar a listagem de cards num helper/backend `CARDS` único | `v8:1852-1864` × `1962-1974,2175-2183,2460-2469` | Menos duplicação e deriva com o mobile | M | Baixo | `CLW_BE_CARDS` já testado + manual |

**Notas dos 5 primeiros:** (1) helpers puros logo após `TEXT_TO_RELATION`,
comparando valor/rótulo em minúsculas, e trocar `rel ? rel.label : select.value` por
`clwArrowLabel(select.value, k => this._t(k))`; (2) trocar os literais por
`this._t('remove.btn')`/`this._t('edit.btn')` nas linhas de `innerHTML`; (3) chave
`common.untitled` passada também no payload do sync; (4) copiar o bloco de 2 toques
do mobile (texto muda por 3 s) com `remove.confirm`; (5) incluir `clw-editor-float`
no handler de Escape chamando o mesmo caminho do ✕.

**Descartes explícitos:** unificar os helpers duplicados dos callbacks de backend
(serializados no sandbox; gerar por string seria mais frágil); sync em chamada única
de backend (mexe no contrato `CLW_BE_SYNC` testado; o contador #8 resolve o feedback);
captura 🎯 no mobile (decisão registrada: desktop-only); atalhos 1-9 para a toolbar
(colidem com o Excalidraw; o `?` documenta); apagar o spike (decisão registrada no
SESSION).

### Pontos fortes (não mexer)

- Engine de fluxo pura e bem fatorada (`111-599`), com ciclos, nudge por mediana e teste de não sobreposição TB/LR.
- i18n completa (paridade PT/EN por teste, fallback em cadeia, interpolação) com detecção de locale correta.
- 12 backends `CLW-BE-*` auto-contidos (uma transação por callback), extraídos por marcador e cobertos pelo teste do launcher.
- Escaping correto nos demais sinks (`1877`, `1987`, `2346-2348`, `2630`, `2922-2923`, `1478`).
- Fonte única real (v8 + src + gerador); zip e repo idênticos.
- Launcher sem APIs inexistentes, com `<button>` reais, caixa `min(96vw,540px)`, corpo rolável e confirmação destrutiva em 2 toques.
- Toolbar com botões 46×46, `flex-wrap` e `pointer-events:none` nos vãos (canvas preservado); estados de carga/vazio/erro cobertos na busca/templates/remoção.

### Versões/registry/README

- Registry: `canvas-note-tools` **0.8.0**, `sourceUrl` só do widget; o launcher mobile só chega pelo zip/manual (o README cobre o caminho).
- Zip em sincronia (md5 = repo), `!!!meta.json` de `appVersion 0.104.1` (export antigo) e a nota do launcher rotulada só `#readOnly` (correto).
- README × código: "relations ... updates labels on save" não se sustenta (C4.2/M4.1); "Escape dismisses any open panel" não vale para o editor (C5.2); "sync ... Title and excerpt are refreshed" falha em card sem excerpt (C4.5). A persistência da captura por `sessionStorage` confere.
- Nomenclatura: widget "v8", mobile "v9", registry "0.8.0", README sem versão; v6/v7/spike são código morto no repo (mover para `historico/` ou remover, a decidir).

### Veredito da rodada 3

Plugin maduro (engine pura testada, i18n completa, backends limpos, fonte única com
gerador) com riscos concentrados em: (a) **promessa central quebrada** no rótulo das
relações (C4.2/M4.1); (b) **integridade do canvas** em template com `groupIds`
(C4.1) e JSON corrompido sobrescrito (C1.1); (c) **acessibilidade** do editor e dos
resultados de busca no widget, e do diálogo no launcher (D3.1/D3.2/D3.6); (d)
**performance do sync** em canvas grande (C3.1/M3.1) e sobreposições no layout de
cards (C4.3/C4.4). Nenhuma correção foi aplicada nesta rodada.

**Próximo da lista:** Shared-Notes (rodada 4).

---

## ✅ Correções aplicadas — rodada 3, batches 1-3 (29/09/2026)

### Batch 1 — bugs, integridade e segurança

| ID | Correção aplicada | Como foi validado |
|----|-------------------|-------------------|
| C4.2 + M4.1 | Rótulo da seta corrigido: helper puro `clwArrowLabel(relType, t)` no engine, usado nos **dois** front-ends (era `rel.label`, inexistente) | `test-mobile-launcher` (rótulo PT + custom + `REL_SAVE` alterando o texto) |
| C4.1 | Clone de template remapeia **`groupIds`** (duas cópias não ficam mais presas; remover uma não apaga elementos da outra) | novo teste (grupos próprios e diferentes do original) |
| C1.1 | Canvas com JSON corrompido: 11 pontos trocaram `catch → data={}` por **erro explícito** (com mensagem i18n) — nada é sobrescrito | novo teste (não sobrescreve + conteúdo intacto) |
| C1.2 | Editor não salva mais "fantasma": backend lança quando a nota não existe (e o erro aparece) | revisão |
| C2.1 + M2.1 | `sanitizarHtml` (scripts/frames/on*/javascript:) no editor flutuante e no diálogo do launcher | smoke |
| C2.2 + C2.3 | Opção custom das relações com escaping; título do longform com `escapeHtml` | revisão |
| C1.3 | `err.message` com guarda em 20 pontos (`(err && err.message) || err`) | revisão |
| C4.5 | Sync cria o **elemento de trecho** quando a nota vazia ganha conteúdo (antes ficava sem trecho para sempre) | novo teste (card sem trecho → sync cria) |
| C4.3 | `colGap` 280 → 360 (fim da sobreposição de 50 px entre colunas de cards) | revisão (constantes) |
| M1.1 | "Nota criada, mas o card não foi inserido" (novo aviso no launcher) | revisão |
| D2.4 | Paridade do custom no launcher: valor desconhecido vira opção preservada | revisão |

### Batch 2 — UI/UX, acessibilidade e quick wins

| ID | Correção aplicada | Como foi validado |
|----|-------------------|-------------------|
| D3.1 + QW5 | Editor flutuante com `role="dialog"`/`aria-modal`/`aria-labelledby` e **Esc fecha salvando** (como o ✕) | smoke (role + Esc) |
| D3.2 | Resultados de busca e templates viraram `<button>` (focáveis; `:focus-visible` deixou de ser código morto) | smoke (widget) |
| D3.3 + QW12 | `aria-label` nos 11 botões da toolbar + `aria-pressed` no toggle de captura | smoke (aria-pressed alterna) |
| D7.1/D7.2/D7.3 | Tema claro detectado pelo brilho de `--main-background-color` (`.clw-light`): perigo/erro/foco com tons escuros; status usa `_corErro()` | revisão + smoke |
| D5.3 | Botão destrutivo com sinal de perigo em repouso | revisão |
| D4.1 + D5.1 + D6.1 | Painéis com `max-height`/scroll; `:disabled` no botão primário; `prefers-reduced-motion` no widget | revisão |
| D2.2/C5.2 + QW6 | Clique-fora fecha também o painel de relações | revisão |
| QW4 | `confirm()` nativo → **dois toques** com i18n (padrão do launcher) | revisão |
| QW7/C7.3 + M7.1 | Template novo aparece no 🧩 sem recarregar (cache invalidado no desktop; launcher revalida a cada abertura) | revisão |
| QW8 | Progresso `i/n` na sincronização do launcher | revisão |
| QW11 | `Enter` na busca insere o primeiro resultado | revisão |
| QW2/QW3 + C7.2 | `remove.btn`/`edit.btn`/`common.untitled` usados de fato; `(sem título)` traduzido; `editor.discard` novo | `test-flow-engine` (paridade PT/EN) |
| D3.6/D3.7/D3.8 + D4.4 | Launcher: `role="dialog"`/`aria-modal`, abas com `role="tab"`/`aria-selected`/`aria-controls`, status `aria-live`, ✖/abas com 44px | smoke (dialog, abas, região viva, Esc) |
| D5.5 + D5.6 + D5.7 + D5.8 + D6.3 | "Voltar" com 2 toques quando há edição não salva; "…" eterno de templates corrigido; vazios da busca/lista com i18n; re-render de locale não apaga digitação; hover/transições no launcher | revisão + smoke |
| D1.1 do batch: `common.close` no ✖ do launcher | revisão ||

### Batch 3 — harness e miúdos

| ID | Correção aplicada | Como foi validado |
|----|-------------------|-------------------|
| QW13 + C8.2 | `test-flow-engine.js` portátil (`__dirname` + `os.tmpdir()`) | `bun` |
| C8.1 | Asserção de z-index deixou de ser tautológica (verifica definido e ordenado de verdade) | `bun` |
| QW14 + B2 | `build-mobile-launcher.js --check` (compara sem escrever) e **timestamp removido** (fim do diff a cada build) | `--check` em sincronia ✅ |
| QW18 + C8.3 | **Smoke de runtime** (`test-smoke.js`): widget (doRender, 11 botões, editor role=dialog, aria-pressed, Esc) e launcher (dialog, abas ARIA, aria-live, Esc) no Chrome headless | `bun test-smoke.js` ✅ |
| C7.4 + C1.4 + C1.5 | `style.id` duplicado; captura com `try/catch` (desliga em vez de quebrar); `String()` na busca | revisão |

**Deploy (29/09):** VPS `KX5k2GPjU39s` (widget v8) e `sjnN3xRWafpG` (launcher) + demo
`GlqViuRJYfcj` (widget) via ETAPI; **sha256 idêntico repo = zip = VPS = demo**
(`9b6dc57d…` v8; `3ec4c083…` launcher); zip `Canvas-note-tools.zip` regenerado.
⚠️ O widget no VPS estava numa versão intermediária (sem os marcadores `CLW-BE-*`) —
agora alinhado com o repo.

**Residual:** migrado para o **`ROADMAP-RESIDUAIS.md`** (§ Canvas-Note-Tools):
sync em lote (C3.1/M3.1), layout de cards (C4.4/C4.7), índice de z-order (C4.8),
Ctrl+Z (C4.9), vínculo texto↔forma (C4.10), limite do `flowZIndex` (C4.11),
listeners do widget (C5.1/C7.5), refinos de UI/i18n (D1.x/D2.x/D3.4/D3.5/D4.x/D6.2/D8.1)
e quick wins restantes (QW9/QW10/QW15/QW16).

---

## Rodada 4 — Shared-Notes (widget + handler) (29/09/2026)

**Escopo:** `Shared-Notes/shared-notes-widget.js` (936 linhas),
`shared-notes-handler.js` (233), `README.md`, `manifest.json`,
`test-shared-notes.js` (simulador, 11 seções), `test-e2e-real.js` (ETAPI),
`Shared-notes.zip` e a entrada `shared-notes` 0.10.1 do registry.
**Verificação:** `bun test-shared-notes.js` ✅ (47+ asserções, inclui smoke de
`doRenderBody`) · `bun build` ✅ nos dois · zip = repo (md5 idêntico) · 3
especialistas (read-only) + **conferência direta dos achados graves** (token no
E2E, `snSent` em lote, `replies:[null]`, downgrade de snapshot, 169.254 no https,
expiração `NaN`, zip sem `relations`).

### Resumo executivo

| Especialista | Crítica | Alta | Média | Baixa | Sugestão | Total |
|---|---:|---:|---:|---:|---:|---:|
| 👨‍💻 Código | 0 | 4 | 21 | 16 | 6 | 47 |
| 🎨 UI/UX | 1 | 7 | 16 | 5 | 2 | 31 |
| ⚡ Quick wins | — | — | — | — | — | 16 itens |

**Top 5 (triagem sugerida):**
1. **[Crítica · Segurança]** Token ETAPI **real da VPS** hardcoded em `test-e2e-real.js:13`, commitado (`bc0f446`) e publicado no GitHub: qualquer clone tem acesso total ao `trilium.rizomatico.org`. ✅ **Corrigido em 29/09 (urgente, fora dos batches):** token rotacionado (o antigo responde 401), o novo salvo na nota `GtK2xDKqKTTH` do Trilium e o `test-e2e-real.js` agora exige `E2E_A_TOKEN`/`E2E_B_TOKEN` por env (sem literais).
2. **[Alta · Código]** Envio marca **todas** as filhas como `snSent` mesmo com falha parcial (`widget:884-901`; handler responde 200 com `errors[]`/`noteIds` em `199-233`) — respostas perdidas nunca são reenviadas; e o aviso de falha de marcação é sobrescrito pelo status de sucesso (`894-901`).
3. **[Alta · Código]** `replies:[null]` derruba o handler: o catch por reply reacessa `r.title` (`handler:188-208`) e o TypeError escapa sem resposta JSON.
4. **[Alta · Código]** Convite antigo (v1) reverte o snapshot do peer em silêncio: `newVer = payload.snapshotVersion || existing.version + 1` aceita versão menor e sobrescreve o conteúdo (`widget:644-654`).
5. **[Crítica · UI]** Nenhum status é anunciado a leitor de tela (sem `role=status`/`aria-live`, `927-932` + markup `323/331/342/354`) e as cores fixas de status (`#4ade80/#facc15/#f87171`) ficam ilegíveis no tema claro (`71-73`).

### 👨‍💻 Código — achados

#### Widget (`shared-notes-widget.js`)

**Alta**

- **C1.1 · Falha parcial marcada como enviada** (`884-901`; handler `199-233`): o handler responde 200 com `errors[]` + `noteIds`, mas o widget marca **todas** as filhas coletadas como `snSent` e ignora `errors`. Correção: marcar só `result.data.noteIds` e reportar as falhas.
- **C1.2 · Aviso de falha sobrescrito pelo sucesso** (`894-901`): o `catch` da marcação escreve warn e as linhas seguintes escrevem o status de sucesso por cima; próximo envio duplica as mesmas notas. Correção: concatenar o aviso à mensagem final.
- **C4.1 · Convite antigo reverte o snapshot** (`644-654`): `snapshotVersion` menor é aceito e reescreve `setContent`/`snVersion`. Correção: rejeitar (ou confirmar) quando a versão recebida for menor.

**Média**

- **C4.2 · Nota vazia não pode ser aceita** (`612-617`): `!payload[k]` trata `''` como ausente. Correção: validar presença/tipo, não truthiness.
- **C5.1 · Status/contadores da nota errada após troca** (`415-444`, `567-575`, `884-916`): awaits não conferem se `this._sharedNote` mudou. Correção: capturar o `noteId` e descartar resultado obsoleto.
- **C2.1 · Fetch segue redirect sem revalidar destino** (`844-849`; validação `114-134`): 307/308 podem reenviar o POST (com conteúdo) para http/privado. Correção: `redirect: 'error'` ou validar cada `Location`.
- **C3.1 · `resp.json()` sem limite de tamanho** (`850-852`): resposta hostil pode estourar a memória do backend. Correção: teto de bytes (`Content-Length`).
- **C3.2 · Qualquer filha vira texto** (`791-803`): imagens/anexos entram como base64 gigante; uma filha problemática derruba a coleta (sem try/catch por filha). Correção: filtrar `type === 'text'` e isolar por filha.
- **C2.2 · Sem guarda de nota protegida** (`515`, `801`): convite/envio não checam `isProtected`. Correção: bloquear/avisar (verificar em runtime o comportamento do `getContent`).
- **C2.3 · `https://169.254.x.x` passa** (`119-126`): o bloqueio link-local só existe no ramo `http:`. Correção: aplicar antes do early-return de https.
- **C4.3 · Dedupe por `#sharedNoteId` com clone de nota** (`632-641`): dois candidatos e a ordem do `searchForNotes` decide. Correção: preferir o da Inbox e avisar ambiguidade.

**Baixa**

- **C1.3 · `snVersion` NaN contamina o snapshot** (`518-520`, `646`, `712`): `parseInt('abc')` → `"NaN"`/`null`. Correção: `Number.isFinite` com fallback.
- **C4.4 · Validação de tipos fraca do payload** (`611-621`, `651-655`): `v: "abc"`, `from`/`noteContent` objetos só quebram depois. Correção: `typeof` por campo.
- **C1.4 · Nome > 80 gera erro enganoso** (`785`, `863`; handler `131-134`). Correção: validar/truncar no cliente e detalhar no handler.
- **C1.5 · `myReplyToken` vazio sem aviso** (`765`, `814-826`): peer fica sem canal de resposta. Correção: aviso dedicado.
- **C1.6 · Corpo não-JSON do peer engolido** (`850-852`): perde o texto real (proxy/502). Correção: guardar trecho bruto.
- **C5.2 · Re-render de idioma apaga o texto colado** (`386-401`). Correção: preservar `.val()` no re-render.
- **C1.7 · Cada clique em "Gerar" cria gate e incrementa versão** (`510-541`). Correção: reutilizar gate pendente ou avisar.

**Sugestão**

- **C2.4 · Fallback de token com `Math.random()`** (`95-100`): token previsível quando não há `crypto`. Recusar gerar sem `getRandomValues`.
- **C6.1 · Sem detecção de `fetch` no sandbox** (`828-865`): erro genérico em instância antiga. Checar `typeof fetch`.
- **C5.3 · Fetch em voo não cancelado ao fechar/trocar** (`840-860`): guardar o controller e abortar.

#### Handler (`shared-notes-handler.js`)

**Alta**

- **C1.1 · `replies:[null]` derruba o handler** (`188-208`): o catch reacessa `r.title` no item nulo. Correção: validar `r && typeof r === 'object'` antes do try e fallback seguro no catch.

**Média**

- **C1.2 · Contrato 200-com-erros incompatível** (`199-212`, `229-233`): falhas viram perda silenciosa no cliente. Correção: 207 ou marcar só os `noteIds`.
- **C3.1 · Busca de gate é varredura completa** (`149-156`): O(nº de gates) por POST público. Correção: `searchForNotes('#inviteToken=…')`.
- **C4.1 · Vínculo com a âncora confia só no label** (`172-180`): não valida parentesco/lixeira. Correção: checar `parentNoteId` e `isDeleted`.
- **C4.2 · Multi-peer sobrescreve o canal de retorno** (`214-220`): o último peer vira o único destino. Correção: canais por peer ou recusar o segundo.
- **C4.3 · Itens de `replies` sem tipo viram "Sem título"** (`188-192`): `["texto"]`/`[{}]` criam nota vazia com 200. Correção: exigir `title`/`content` string.
- **C1.3 · `inviteExpires` inválido desliga a expiração** (`163-168`): `!isNaN` pula a checagem e o convite vira eterno. Correção: tratar não numérico como expirado/erro.

**Baixa**

- **C1.4 · Interpolação em cadeia permite injeção de placeholders via `from`** (`81-89`, `190`). Correção: substituição em passe único.
- **C6.1 · `gate.save()` redundante após mudar o título** (`225-226`). Correção: remover/verificar em runtime.
- **C4.4 · Códigos 500 para erro de cliente** (`174`, `210-211`): usar 409/422 e orientar.
- **C2.1 · 405 sem `Allow`/OPTIONS** (`116-118`). Correção: `Allow: POST` + OPTIONS 204.
- **C2.2 · `from` aceito com newlines/controle** (`131`, `190`, `224`). Correção: strip de `[\r\n\t]`.

**Sugestão**

- **C6.2 · Corpo do handler sem try/catch global**: throw inesperado vira 500 HTML. Envolver com `reply(500, {...})`.

#### Testes e versões (C7/C8)

- **C7.1 · Zip divergente do manifest** (Média): o `Shared-notes.zip` não tem `relations` (a `renderNote` não é criada ao importar) e usa títulos/tipos diferentes do manifest ("Shared notes"/"Config"). Correção: regenerar o zip a partir do manifest/instalação real.
- **C7.2 · README omite `backendScriptingEnabled`** (Média): o requisito só aparece no erro do widget (`209`, `448-456`).
- **C7.4 · Validações/i18n duplicados widget×handler** (Média): mudança de regra exige sincronizar as duas cópias (`114-134`/`159-288` × `93-113`/`32-71`).
- **C7.5 · Guia de config pode criar nota duplicada** (Média): manifest já cria a config e o README manda criar outra; o widget escolhe pela ordem do `searchForNotes` (`493-495`).
- **C8.1 · Stub de jQuery não testa eventos** (Média): `on()` não guarda callback; binds/tabs nunca são exercitados (`test:77-88`).
- **C8.2 · Sem entradas hostis no handler** (Média): faltam `replies:[null]`, 405, JSON inválido, 410, `replyToken` fora do regex (`test:110-121`).
- **C8.4 · Cobertura ausente dos fluxos corrigíveis** (Média): downgrade, nota vazia, multi-peer, falha parcial de `snSent`.
- **C7.3 · README diverge no vocabulário do token** (Baixa): EN diz "reply token"? o renovado é `inviteToken` (`655`).
- **C7.7 · PT sem a nota de migração do AI-Chat** (Baixa): existe só no EN (`README:67` × `113-221`).
- **C8.5 · Testes não portáveis e E2E sem cleanup** (Baixa): paths absolutos (`test:15`, `e2e:9`) e artefatos deixados nas instâncias (`e2e:336-339`).
- **C8.3 · Smoke tolera falha do i18n** (Baixa): stub sem `getOption` esconde o caminho de locale (`test:291-293`).
- **Config.txt de 0 bytes** na raiz (não referenciado por manifest/README).
- **Sem script de regeneração do zip** (Sugestão): sincronia depende de processo manual.

### 🎨 UI/UX — achados

#### Widget

**Crítica**

- **D3.1 · Status não anunciados a leitor de tela** (`927-932`; markup `323`, `331`, `342`, `354`): sem `role="status"`/`aria-live`; erros e expiração terminam em silêncio. Correção: `role=status aria-live=polite` (e `role=alert` em erro).

**Alta**

- **D3.2 · Abas sem semântica de tablist** (`315-319`, `460-466`): sem `role="tab"/"tabpanel"`, `aria-selected`, `aria-controls`, setas. Correção: padrão WAI-ARIA Tabs.
- **D5.1 · Painel "Responder" ativo sem aba visível** (`411`, `429-433`, `460-466`): ao trocar para nota sem canal, o painel e a contagem antiga permanecem. Correção: voltar para "Gerar" e limpar contagem.
- **D5.2 · Convite antigo sobrevive à troca de nota** (`567-568`, `404-445`): textarea/Copiar não são limpos. Correção: limpar ao trocar.
- **D5.3 · Aceitar sobrescreve nota existente sem aviso** (`644-654`, `682`): edição local perdida sem confirmação. Correção: confirmar ou oferecer duplicar.
- **D5.4 · Erros parciais engolidos** (`884-901`; handler `229-233`): mesma raiz do C1.1 (UI mostra sucesso).
- **D7.1 · Status ilegíveis no tema claro** (`71-73`, `323`): `#4ade80`/`#facc15`/`#f87171` ~1,5-2,8:1. Correção: variantes escuras por tema.
- **D4.1 · Abas estouram o painel estreito** (`29-32`, `33-39`): sem `flex-wrap`/scroll; rótulos cortados no mobile. (verificar em runtime)

**Média**

- **D3.3 · Foco visível fraco/ausente** (`58`, `33-44`, `59-69`): `outline:none` no textarea; sem `:focus-visible` em tabs/botões.
- **D3.4 · Campos sem rótulo** (`329-330`, `337-338`): só placeholder. Correção: `aria-label`.
- **D4.2 · Alvos de toque < 40px** (`30-39`, `59-65`): tabs ~34px, botões ~35px.
- **D1.1 · Aviso de respostas escondido no painel "Gerar"** (`323`, `436-441`): quem está em outra aba não vê.
- **D1.2 · Sem contexto do destinatário antes de enviar** (`346-355`, `814-826`, `899-901`): não mostra o host de destino.
- **D5.5 · Gestão de convites invisível** (`README:12`, `107-109`; handler `222-226`): sem lista/expiração/revogação; o título da gate muda (`🔒`→`💬`) e quebra a instrução do README.
- **D5.6 · Cópia exige seleção manual** (`136-153`, `473-477`): fallback e instrução pressupõem seleção (ignora Mac/mobile).
- **D5.7 · Mensagens técnicas cruas e PT fixo** (`577-578`, `739-740`, `854-856`, `918-919`): `e.message` cru e timeout em PT na UI EN.
- **D5.8 · Re-render de idioma pode apagar digitação** (`386-398`, `372-376`): mesma raiz do C5.2.
- **D2.1 · Glifos/nomes divergentes UI × README** (`316-318` × `README:74`, `186`).
- **D2.2 · Roxo hardcoded fora do accent** (`58`, `67-68`): usar vars de botão/accent.
- **D7.2 · Fallback escuro único no textarea** (`52`): `#1a1a2e` pode ficar ilegível no claro. (verificar em runtime)
- **D8.1 · Fontes < 14px** (`27`, `38`, `55`, `64`, `70`, `74`, `75`, `323`).
- **D6.1 · Micro-interações desiguais e sem reduced-motion** (`33-44`, `66-69`; única transição no botão primário).

**Baixa**

- **D1.3 · Posição do status varia por painel** (`325-331` × `339-342` × `349-354`).
- **D2.3 · "Aceitar e criar nota" também atualiza** (`183`, `644-683`).
- **D2.4 · CSS morto `.sn-badge`** (`74`).

**Sugestão**

- **D6.2 · Badge numérico na aba "Responder"** (`350`, `428-434`).
- **D5.9 · Atalho Ctrl+Enter para aceitar/enviar** (`337-338`, `591`).

#### Handler / mensagens

- **D2.5 · Idioma do erro segue o receptor, não o remetente** (Média; handler `73-79`; widget `877-881`): A em PT recebe EN cru do handler de B. Correção: widget mapear código→chave própria.
- **D5.10 · Jargão de desenvolvedor na UI** (Média; handler `39`, `43`, `45`, `64`): "Payload inválido…", "Gate note sem vínculo…". Correção: mensagens orientadas a ação.
- **D2.6 · Nome > 80 cai em erro genérico** (Baixa; handler `131-134`).
- **D2.7 · Títulos com glifos/separadores inconsistentes** (Baixa; handler `34`, `36`, `225` × widget `216`).

### ⚡ Quick wins — backlog

| # | Melhoria | Onde | Ganho | Esforço | Risco | Validação |
|---|----------|------|-------|:-------:|:-----:|-----------|
| 1 | Remover token ETAPI do E2E + rotação | `test-e2e-real.js:13` | Fecha vazamento público (token no GitHub) | S + rotação | Baixo | ✅ 29/09: token antigo 401; E2E exige env; sem literais no repo |
| 2 | Marcar `snSent` só nos ids confirmados | `widget:884-898`; `handler:188-233` | Fim da perda silenciosa em falha parcial | S/M | Baixo | simulador com 1 falha de 2 |
| 3 | Revogar convites pela UI (neutraliza `inviteToken`) | `widget:321-332,528-538,716-724` | Revogação sem caçar gate na árvore | M | Médio | simulador (peer recebe 404) + 2 toques |
| 4 | Aceitar `noteContent`/título vazios | `widget:612-616` | Nota vazia compartilhável | S | Baixo | asserção no simulador |
| 5 | Botão ⟳ para atualizar contagens/avisos | `widget:315-319`, `404-445` | Ver respostas novas sem F5 | S | Baixo | simulador + manual |
| 6 | Limpar convite ao trocar de nota | `widget:404-445`, `567-568` | Evita enviar convite da nota anterior | S | Baixo | simulador |
| 7 | Expiração configurável e visível (`#inviteExpireDays`) | `widget:492-501,526,570-575`; handler `163-169` | Convite com data de validade na UI | S | Baixo | simulador |
| 8 | Validar formato/tamanho do `inviteToken` no handler | `handler:131-139` | Rejeita lixo antes da varredura | S | Baixo | simulador (400) |
| 9 | ARIA nas abas e status | `widget:314-319,323,331,342,354,460-467` | Leitor de tela anuncia estados | S | Baixo | asserção no smoke |
| 10 | Estado vazio real na aba Responder | `widget:415-434` | Fim do "já foram enviadas" enganoso | S | Baixo | simulador |
| 11 | Evitar backend em toda troca de nota | `widget:405-426` | Menos serialização/execução | S | Baixo | espião no stub |
| 12 | README: backend scripting, troubleshooting, testes | `README:45-67,157-179` | Falha de instalação mais comum documentada | S | Baixo | conferência |
| 13 | Manifest: config sem placeholders quebrados | `manifest.json:21-24,74,79` | Evita "yourname"/endpoint inválido | S | Baixo | reimportar no demo |
| 14 | Harness portátil (sem `/home/ricardo`) | `test:15`; `e2e:9` | Testes rodam em qualquer máquina | S | Baixo | copiar p/ /tmp e rodar |
| 15 | Cobrir o boot guard do handler no simulador | `test:110-122`; handler `17-23` | Evita regressão do guard | S | Baixo | asserção nova |
| 16 | Travar paridade das chaves i18n no teste | `test:272-278` | Impede deriva PT/EN | S | Baixo | asserção de conjuntos |

**Notas dos 5 primeiros:** (1) exigir `E2E_A_TOKEN` por env com erro claro, remover o
literal do arquivo e rotacionar o token no Trilium; (2) handler devolve `sourceIds`
das respostas criadas e o widget marca só esses ids, avisando falhas; (3) botão com
2 toques que zera o `inviteToken` das gates filhas (neutraliza sem `deleteNote`);
(4) trocar `!payload[k]` por `payload[k] == null`; (5) ⟳ reaproveitando os contadores
existentes com guarda de reentrância.

**Descartes explícitos:** criptografia E2E + HMAC (wishlist L, exige formato v3 e
coordenação entre pares); pré-visualização do convite (validação local já cobre);
polling com `setInterval` (timers em widget + backend em loop; o ⟳ cobre);
`prefers-reduced-motion` como quick win separado (única transição é do botão
primário; entra junto com o D6.1); auto-copiar o convite ao gerar (clipboard sem
gesto falha em http de LAN).

### Pontos fortes (não mexer)

- Callbacks de backend auto-contidos com args em array em todas as chamadas, incluindo o `fetch`/`AbortController` (padrão do sandbox 0.105+).
- Guard de boot do handler (`18-23`) e todas as saídas passando por `reply()` com `res.setHeader`.
- Nenhum dado do peer entra no DOM sem `snEscape` (`927-932`); convite vai para `.val()`.
- Validação de endpoint simétrica e conservadora (https; privadas/Tailscale; 169.254 bloqueado no http; IPv6 `::1`) com aviso ao usuário.
- Timeout de 30s com `clearTimeout` no `finally` e retorno estruturado `{status,data}`.
- Codec UTF-8 correto e fallbacks para contexto não-seguro (`snUuid`, `snCopiar`).
- Snapshot in-place preserva filhas e renova `inviteToken`; envio cumulativo ignora gates/respostas; dedupe global; i18n PT/EN completo (62 chaves).
- Zip com JS idêntico ao repo; `test-shared-notes.js` com 47 asserções e smoke.

### Versões/registry/README

- Registry `shared-notes` **0.10.1** via `manifestUrl` (sem `sourceUrl`), instalação pelo manager monta `children`/`relations` corretamente.
- **Zip × manifest divergentes** (C7.1): sem `relations` (widget não aparece na nota raiz ao importar o zip) e títulos/tipos diferentes; `Config.txt` de 0 byte não referenciado.
- README omite o requisito de backend scripting e diverge em vocabulário de token; PT sem a nota de migração do AI-Chat.
- `test-e2e-real.js` com token vivo da VPS (item 1 do top 5) e sem cleanup de artefatos.

### Veredito da rodada 4

Plugin funcional e maduro no fluxo feliz (harness 47 asserções + E2E real 32 já
verdes; sandbox correto; sem XSS no DOM; validações conservadoras), com riscos
concentrados em: (a) **segurança/vazamento** do token no E2E versionado (ação
imediata); (b) **perda silenciosa** no envio parcial (`snSent` em lote) e no
handler com entradas malformadas; (c) **integridade do snapshot** no downgrade de
convite; (d) **acessibilidade e contraste** do widget (status sem ARIA, cores de
tema escuro no claro); (e) **divergência zip × manifest** e README incompleto.
Nenhuma correção foi aplicada nesta rodada — **exceto a rotação urgente do token
vazado no E2E (29/09)**, feita fora dos batches a pedido do dono: token antigo
revogado (401), novo token salvo na nota `GtK2xDKqKTTH` e `test-e2e-real.js` sem
literais (env `E2E_A_TOKEN`/`E2E_B_TOKEN`).

**Próximo da lista:** AI-Chat (rodada 5).

---

## ✅ Correções aplicadas — rodada 4, batches 1-2 (29/09/2026)

### Batch 1 — integridade, segurança e robustez

| ID | Correção aplicada | Como foi validado |
|----|-------------------|-------------------|
| C1.1/C1.2 handler + C1.1/C1.2 widget + D5.4 + QW2 | **`snSent` só nas respostas confirmadas**: o handler devolve `sourceIds` (quais itens do remetente viraram nota) e o widget marca só esses; falhas parciais são reportadas (`enviar.falhas`) e o aviso de falha de marcação deixou de ser sobrescrito pelo sucesso | `test-shared-notes` [12] (item nulo/inválido não derruba; `sourceIds=['child-1']`; 2 erros) |
| C1.1 handler | `replies:[null]`/itens sem tipo não derrubam mais (validação por item + catch seguro) | `test-shared-notes` [12] (só inválidos → 422 sem crash) |
| C4.1 widget | Convite mais antigo **não reverte o snapshot** (erro explícito `aceitar.mais_antiga`) | `test-shared-notes` [13] (conteúdo intacto) |
| QW4/C4.2 widget | Aceita título/conteúdo vazios (presença + tipo, não truthiness) | `test-shared-notes` [13] (nota vazia criada) |
| C2.3 widget + handler | 169.254/16 bloqueado **também em https** (dois front-ends) | `test-shared-notes` [13] + [9] |
| C2.1 widget | `fetch` com `redirect:'error'` (o POST não segue 307/308 para outro host) e teto de 1 MB na resposta; corpo não-JSON preservado (`data.raw`) | revisão + harness |
| C1.3 widget | `snVersion` NaN não contamina mais o histórico (`Number.isFinite` + fallback) | revisão |
| C3.2/C2.2 widget | Envio só de texto/código **não-protegidos**, com `getContent()` isolado por filha e contagem de ignoradas (`enviar.puladas`) | `test-shared-notes` (fluxo principal) + revisão |
| C1.3 handler | `inviteExpires` corrompido = **expirado** (nunca eterno) | `test-shared-notes` [12] (410) |
| C4.1 handler | Gate só vale se **for filha da nota âncora** (409) e a âncora existe/não deletada (404) | `test-shared-notes` [12] (409) |
| QW8/C4.3 handler | `inviteToken` validado em formato/tamanho **antes** da busca | `test-shared-notes` [12] (token de 5000 chars → 400) |
| C1.4/C2.2 handler | `from` sanitizado (newlines/controle → espaço; ≤80 com erro específico) | `test-shared-notes` [12] |
| C3.1 handler | Busca da gate por `getNotesWithLabel('inviteToken', …)` com fallback para a varredura | `test-shared-notes` (fluxos) |
| C6.2/C6.1/C2.1 handler | Corpo com try/catch global (500 JSON), `gate.save()` redundante removido, 405 com `Allow` + OPTIONS 204 | revisão |
| QW13/C7.2 manifest | Config sem placeholders quebrados (`yourname`/`yoururl` vazios) e instruções completas | `manifest.json` válido |

### Batch 2 — UI/estados, tema e quick wins

| ID | Correção aplicada | Como foi validado |
|----|-------------------|-------------------|
| D3.1 + D3.2 + D3.4 | **ARIA**: `role="status" aria-live="polite"` nos 3 status + notificação; tabs com `role="tablist"/"tab"/"tabpanel"`, `aria-selected`/`aria-controls`; textos dos campos com `aria-label` | smoke + revisão |
| D7.1 + D7.2 + D2.2 | **Tema claro** detectado pelo brilho de `--main-background-color` (`.sn-light`): status/perigo legíveis; botão primário e foco com vars do tema (fim do roxo fixo); textarea com fallback neutro | revisão (runtime visual pendente) |
| D3.3 + D4.2 + D6.1 | `:focus-visible` em tabs/botões/campos; alvos ≥40px; hover nos tabs; `prefers-reduced-motion`; fontes para .85rem | revisão |
| D5.1 + D5.2 + QW6 + D5.8 | **Troca de nota** limpa convite/contadores/notificação e mantém uma aba válida; dica "Crie notas filhas" vs "todas enviadas" (QW10) | `test-shared-notes` + revisão |
| D5.3 | Substituir cópia local agora pede **2 toques** (`aceitar.confirmar_substituir`) | `test-shared-notes` [6] (pede confirmação) |
| QW5 + QW7 | Botão **⟳** revalida contadores; expiração configurável por `#inviteExpireDays` (padrão 7) e data no status (`gerar.expira`) | `test-shared-notes` + revisão |
| QW11 | `refreshWithNote` sai cedo para notas sem rótulos do plugin (menos chamadas de backend) | revisão |
| QW14 + QW15 + QW16 + C8.3/C8.4 | Harness: `__dirname` portátil, `getOption` no mock, testes de guard de boot, paridade i18n (**70 chaves**), entradas hostis (null/gigante/expiração/409) e necessidade de confirmação | `bun test-shared-notes.js` (todos) |

**Deploy (29/09):** VPS `MZgG8hPdD30l`/`7pomMcPeoZib` e demo `o9JnIpUFdhSS`/`WGWGPpnx88zr`
via ETAPI; **sha256 idêntico repo = VPS = demo = zip** (`0af549e5…` widget, `065789e3…`
handler); zip com os scripts atualizados (a regeneração estrutural fica no roadmap).
Token ETAPI do E2E rotacionado fora dos batches (ver rodada 4).

**Residual:** migrado para o **`ROADMAP-RESIDUAIS.md`** (§ Shared-Notes): revogar/gerir
convites pela UI, dedupe por clone, guardas de await/reentrância, i18n das mensagens do
handler no widget, badge de respostas na aba, contexto do destinatário, criptografia
E2E/HMAC, regeneração estrutural do zip, refinos de tipografia e cobertura de eventos
de UI.

---

## Rodada 5 — AI-Chat (29/09/2026)

**Escopo:** `AI-Chat/AI-Chat/AI Code.js` (1.235 linhas), `AI-Chat/AI-Chat/AI Chat - config.txt`,
`AI-Chat/manifest.json`, `AI-Chat/README.md`, `AI-Chat/AI-Chat.zip`; registry `ai-chat-openrouter`.
**Verificação:** `bun build` (sintaxe) ✅ · zip × repo: JS idêntico (sha256 `280ffe5f…`), config do
zip **defasada** (`bbc95d23…` × `f32583a9…`, sem os exemplos de provedores) · **sem harness de
teste** (`test-*.js` não existe no plugin, diferente das rodadas 1-4) · registry `0.8.3` (o manifest
sem `version` é o padrão do repo, não é divergência) · 3 especialistas (read-only) + conferência
direta dos achados graves no fonte.

### Resumo executivo

| Especialista | Crítica | Alta | Média | Baixa | Sugestão | Total |
|---|---:|---:|---:|---:|---:|---:|
| 👨‍💻 Código | 2 | 9 | 18 | 17 | 4 | 50 |
| 🎨 UI/UX | 3 | 11 | 16 | 9 | 1 | 40 |
| ⚡ Quick wins | — | — | — | — | — | 20 itens |

**Top 5 (triagem sugerida):**
1. **[Crítica · Código]** Config buscada só por título exato (`806-807`) × manifest cria "AI Chat Config" com label `aiChatConfig` nunca lido (`manifest:15-17,35-39`): instalação nova pelo Plugin Manager nasce sem config (todo envio/comando falha). README manda criar "AI Chat - Config" e o zip traz "AI Chat - config" (três grafias).
2. **[Crítica · Código]** XSS condicional quando o CDN falha: sem `marked` o fallback devolve HTML cru (`437`, `442`), sem `DOMPurify` nada é sanitizado (`444`) e o resultado vai para `.html()` (`653`) — vale para a resposta da IA e para o histórico restaurado do localStorage.
3. **[Alta · Código]** Concorrência do `abortController` global: timers de 90 s que leem a variável no disparo, sem `clearTimeout` no `finally` (`863-864`, `936-937`, `1050-1051`) → TypeError após o `null`, aborta requisição de outra operação e Enviar durante comando cancela o comando.
4. **[Crítica · UI + Alta · Código]** CSS global: reset `*` + `::placeholder` + classes genéricas (`.toast`, `.msg`, `.typing`) no `<head>` (`40`, `166-167`, `219-226`, `312-328`) a partir de patch de `$.fn.html/.append` re-aplicado com CSS concatenado (`4-34`) — contamina o app inteiro e outros plugins.
5. **[Crítica · UI]** Ações de mensagem (copiar/regenerar/editar) só no hover, botões fora do tab order, e lista sem `aria-live`/`role=log` (`187-188`, `628-647`, `384-387`) — teclado, touch e leitor de tela ficam sem os três recursos anunciados.

**Nota de dedupe:** ~13 raízes aparecem em mais de uma lista (config `C1.1`≈`QW-1`; CSS/patch `C5.3`+`C5.4`≈`D2.1`≈`QW-2/3`; abort/concorrência `C5.1`≈`D5.4`≈`QW-16`; atalhos `C5.2`≈`D3.5`≈`QW-4`; regenerate `C4.2`≈`D5.3`≈`QW-6`; erro de envio `C1.2`≈`D5.2`≈`QW-5`; `confirm()` `D5.1`≈`QW-9`; i18n `C7.3`≈`D2.2`≈`QW-20`; troca de contexto `C4.10`≈`D5.9`≈`QW-8`; colapso `C4.3`≈`D5.6`≈`QW-15`; persistência `C1.5`≈`D2.5`≈`QW-7`; config no boot `D5.8`≈`QW-10`; ações de mensagem `D3.1`≈`QW-15`). Os batches consolidam por raiz.

### 👨‍💻 Código — achados

**Crítica**

- **C1.1 · Config invisível para instalações novas** (`806-807`; manifest `15-17`, `35-39`): busca por `note.title = "AI Chat - Config"`, mas o manifest cria a nota como "AI Chat Config" e rotula `aiChatConfig` (label que o código nunca lê; `getNotesWithLabel` = 0 no arquivo); README `22` manda criar "AI Chat - Config" e o zip traz "AI Chat - config". Config criada pelo manager nunca é encontrada. Correção: buscar por `#aiChatConfig` com fallback por título e alinhar manifest/README/template. (verificar em runtime no fluxo manifestUrl)
- **C2.1 · Sanitização opcional = XSS quando o CDN falha** (`436-446`, `653`): `if (!_marked) return text.replace(/\n/g,'<br>')` e `renderMarkdown` só sanitiza `if (_purify)`; o resultado alimenta `body.html(...)`. Vale para resposta da IA (com possível prompt injection da nota de contexto) e para o histórico do localStorage. Correção: escapar o fallback e falhar fechado sem sanitizador (ou `require('sanitize-html')`, na whitelist do sandbox). (verificar em runtime offline)

**Alta**

- **C5.1 · `abortController` global e timers que leem a variável no disparo** (`845-864`, `936-937`, `1050-1051`; `clearTimeout` só em `891`/`964`/`1088`): se `loadConfig`/contexto falha antes do fetch, o timer de 90 s dispara em `null` (TypeError) ou aborta requisição de outra operação; Enviar durante comando aborta o comando e não envia (`848-851`). Correção: controller local por operação + guard de concorrência + `finally`.
- **C5.2 · Listener de `document` sem namespace/remoção** (`1202-1215`): `$(document).on('keydown', ...)` acumula a cada re-render; `Ctrl+Shift+S/C/F` disparam de qualquer nota/painel (limpar é destrutivo) e continuam ativos após fechar a nota. Correção: namespace + `.off()` + escopo por foco (e `metaKey` no Mac). (verificar em runtime)
- **C5.3 · Patch global de `$.fn` sem idempotência e hoist concatenando CSS** (`4-34`, `21`): a cadeia de wrappers cresce a cada re-render e `styleEl.textContent +=` acumula o CSS inteiro; o `append` repassa só o 1º argumento. Correção: flag `window.__aicPatched` + atualizar o style em vez de concatenar.
- **C2.2 · CSS sem escopo: reset `*`, `::placeholder` e classes genéricas hoistados** (`40`, `166-167`, `219-226`, `312-328`): afeta o app inteiro e pode colidir com outros plugins (todos os demais escopam por `#wp-root`/`#fv-root`/`#lg-root`). Correção: prefixar sob `.aic-root`/`.chat-wrap`.
- **C2.3 · `saveNote` grava conteúdo cru em HTML persistido** (`1021-1027`): `'<p>' + who + ': ' + m.content.replace(/\n/g,'<br>') + '</p>'` sem `esc()`; injeção armazenada na nota (inclusive via prompt injection da nota de contexto). Correção: escapar conteúdo/persona (ou salvar em Markdown).
- **C4.1 · `regenerate` apaga a bolha do usuário do DOM** (`921-932`): após `restoreMessages()`, `$msgs.find('.msg:last-child').remove()` remove a última bolha, que é a do usuário (a da IA já saiu no `pop`); em falha o history é recomposto (`983`) mas o DOM segue sem a pergunta. Correção: não remover (o restore já excluiu a resposta) ou mirar só a bolha da IA.
- **C1.2 · Erro no `send` faz `history.pop()` cego, sem refletir na UI** (`904-914`): a bolha da pergunta fica visível mas sai do histórico (some das próximas requisições e volta no reload); se `editMessage`/`regenerate` mexeram no array, o pop remove a mensagem errada. Correção: adicionar ao histórico só após sucesso ou remover com verificação e refletir no DOM/estado.
- **C1.3 · Backend do RAG com `getContent()` fora do try, sem filtros e sem teto** (`750-771`): `note.getContent()` antes do `try`; sem `isProtected`/`#archived`/whitelist de tipo; nada limita o número de notas (imagens/base64 trafegam backend→frontend antes do corte de 15.000). Correção: try/catch por nota + filtros no backend + limite. (verificar em runtime com nota protegida)
- **C1.4 · Regex do config ignoram linhas comentadas** (`814-818`; template `4-34`): `# api_base: …` casa igual e o parsing pega a primeira ocorrência; comentar para voltar ao OpenRouter não desativa e exemplos comentados podem virar config real. Correção: remover comentários por linha antes do match.

**Média**

- **C4.3 · Recolher mensagem longa fatia HTML no meio de tags** (`659-675`): `body.data('full-html').slice(0, COLLAPSE_LIMIT)` no ramo "Mostrar menos"; markup quebrado e preview com menos texto que o esperado. Correção: guardar o HTML curto já gerado no colapso e alternar; nunca fatiar HTML.
- **C4.4 · `ts` vai como campo extra no payload da API** (`691-692`, `887`, `960`): providers OpenAI-compatible estritos podem rejeitar/normalizar; payload maior sem motivo. Correção: mapear `{role, content}` antes de enviar.
- **C4.5 · `data.choices[0].message.content` sem guarda** (`901`, `974`, `1099`): resposta vazia/filtrada derruba com TypeError críptico e, no send, ainda dispara `history.pop()`. Correção: optional chaining + erro explícito ("resposta vazia da API").
- **C3.1 · Histórico sem poda na sessão e sem janela de payload** (`462`, `887`): `slice(-100)` só na persistência; em memória cresce sem teto e o POST manda tudo (100 × 32.000 ≈ 3,2 M chars). Correção: janela por tamanho/tokens antes de enviar.
- **C1.5 · `catch {}` mudos em `saveState`/`loadState`, shape sem validação e `_isRestoring` pode ficar preso** (`459-488`): cota/JSON corrompido/histórico com item nulo somem sem aviso; `_isRestoring = true` antes de `restoreMessages()` e o catch engole a exceção. Correção: avisar/instrumentar, validar entradas e versão, `finally`.
- **C1.6 · `saveNote` sem await/catch nos chamadores** (`1015-1034`, `1169`, `1207-1210`): falha de `createNewNote` propaga sem toast (unhandledrejection) e o usuário acha que salvou. Correção: try/catch com toast + `void`.
- **C6.1 · CDNs sem SRI/timeout; `init` pode ficar pendente para sempre** (`406-434`, `1225-1227`): script que não responde nem erra trava `await initDeps()` e `loadState` nunca roda; sem SRI é superfície de supply-chain apesar da whitelist do sandbox. Correção: `require()` do sandbox ou SRI+timeout+fallback.
- **C4.6 · `buildContextText`: primeiro bloco pode estourar 15.000 e a contagem mente após o `break`** (`786-798`): `&& combined` deixa a primeira nota passar inteira; itens restantes pós-break não entram em `skipped` e o feedback `[x/y, n puladas]` superestima incluídas (README `8` promete exatidão). Correção: truncar o bloco e contar os restantes.
- **C3.2 · `restoreMessages` renderiza até 100 mensagens com marked+DOMPurify medindo scroll por item** (`490-502`, `611-685`): reflows O(N) e reload lento. Correção: render em lote e medir scroll só no fim.
- **C7.1 · Sem i18n: UI, datas e títulos de notas 100% PT hardcoded** (`608`, `1026`; `getOption` = 0 ocorrências): diverge do padrão do toolkit (Canvas v8, Shared Notes, WP, Writers) e quebra no demo EN. Correção: `AIC_I18N` + `tr()` lendo `api.getOption('locale')`, incluindo datas e títulos criados. (raiz também em `D2.2`/`QW-20`)
- **C7.2 · README promete netos (`TREE_DEPTH=2` só inclui filhos) e "erros estruturados" que o código não distingue** (`594`, `750-770`; README `8`, `63-66`, `98-101`): `walk` retorna `[]` em `d <= 0`; timeout e cancelamento usam a mesma mensagem. Correção: alinhar docs ou o depth; separar timeout/cancel/rede.
- **C4.7 · Contexto restaurado não popula `#ctx-id-input`; nota removida envia sem contexto em silêncio** (`472-488`, `1229-1234`, `775-776`): "Carregar" com input vazio toasta "Informe um ID" mesmo com contexto ativo; nota apagada = resposta sem contexto e sem aviso. Correção: setar o input no boot e avisar/limpar quando a nota sumir.
- **C4.8 · `editMessage` usa `historyIdx` de closure que pode ficar obsoleto** (`619`, `642-645`, `994-1008`): mutações fora do render (erro/regenerate) desalinham DOM e history; editar pode truncar no ponto errado ou não fazer nada. Correção: localizar por identidade (ts+content) ou reindexar após cada mutação.
- **C4.9 · Duplo clique em Enviar (ou Enviar durante comando) aborta a operação e não envia** (`848-851`, `1050`, `1109-1114`): o segundo clique mata a requisição em andamento; comando cancelado reporta "timeout"; feedback enganoso. Correção: estados separados por operação e desabilitar conforme o caso.
- **C4.10 · `setCtx` descarta a conversa atual sem confirmação e persiste o vazio** (`711-719`, `835-839`): clicar "Carregar"/"Nota ativa" por engano perde a conversa não salva de forma irreversível. Correção: confirmação em 2 toques quando houver histórico.
- **C5.4 · Comandos concorrentes: só o botão clicado desabilita, sem progresso nem stop** (`1046-1048`, `1217-1219`): dois comandos disputam o `abortController` global. Correção: travar todos durante a operação + indicador + cancelamento real.
- **C4.11 · `STORAGE_KEY` único entre abas/painéis; re-render durante request deixa o stop inoperante** (`457`, `459-469`): duas instâncias sobrescrevem o estado uma da outra; após re-render, o request antigo segue e o novo Parar não o alcança. Correção: sufixo por instância/noteId (ou merge via evento `storage`). (verificar em runtime)
- **C7.3 · `loadConfig` refaz busca+leitura a cada operação e escolhe `notes[0]` arbitrário** (`805-813`, `867`, `940`, `1054`): custo repetido por mensagem/comando e escolha indefinida com título duplicado. Correção: cache com invalidação + busca por label.

**Baixa**

- **C7.4 · Manifest sem `version` × registry `0.8.3`** (manifest `1-41`; registry `ai-chat-openrouter`): o manifest sem versão é o padrão do repo (nenhum tem); manter o bump no registry/SESSION a cada release, sem tratar como divergência.
- **C7.5 · Zip com config defasado embora o JS esteja em sincronia** (`AI-Chat.zip`): quem instala pelo zip recebe template antigo (sem `api_base`). Correção: regenerar o zip por script e validar sha256 das três pontas (padrão Shared Notes).
- **C7.6 · Três cópias de fetch+headers+body e defaults/markup duplicados** (`875-897`, `948-970`, `1072-1094`; `509` × `552-553`; `385` × `499`): corrigir um item exige mexer em 3 lugares (raiz dos achados de concorrência). Correção: extrair `callApi(cfg, messages, signal)`.
- **C7.7 · Cores hardcoded fora das variáveis do tema** (`223`, `247`, `252`, `268`, `287`, `292`, `311`, `327-328`): contraste inconsistente no claro; diverge da convenção. Correção: tokens com variante clara. (verificar em runtime)
- **C5.5 · Código morto: `_modelLabel` e `data('history-idx')` nunca lidos** (`454`/`822`; `619`): o índice poderia resolver o alvo do editar/regenerar. Correção: remover ou usar.
- **C1.7 · `getProtectedContent()` retornando null cai em `content.match` sem guarda** (`808-814`): TypeError sem mensagem útil em vez de "config inválida". Correção: validar `typeof content === 'string'`. (verificar em runtime com nota protegida)
- **C1.8 · Placeholder "your key" não validado** (template `1`; `819`): só checa presença do campo; erro real vem só no 401 da primeira chamada. Correção: detectar placeholder e orientar.
- **C1.9 · Falha de rede vira "Failed to fetch" cru sem dica** (`911`): README promete distinguir tipos de falha. Correção: mapear `TypeError` para mensagem orientada.
- **C4.12 · Limite de 32.000 conta code units UTF-16; `temperature`/`max_tokens` sem faixa** (`856`, `828-829`): emojis contam 2; config extrema só falha na API. Correção: `[...text].length` + clamp.
- **C4.13 · Filtro de busca não é reaplicado no restore nem enxerga conteúdo colapsado** (`490-502`, `659-675`, `1139-1150`): após reload/regenerate a busca "some"; trecho após os 1.000 chars dá falso negativo. Correção: reaplicar no restore e buscar no texto-fonte.
- **C4.14 · Sem migração/versão de estado; `ts` ausente vira hora atual; load não limita a 100** (`457`, `477`, `625`). Correção: versionar a chave e migrar entradas.
- **C4.15 · `loadNote` aceita qualquer nota (imagem → base64 no contexto) sem filtro de tipo/lixeira** (`834-839`, `778-781`). Correção: alertar/recusar tipos não textuais.
- **C4.16 · `runCommand` cria nota mesmo com resposta vazia; Mermaid pode salvar prosa; títulos duplicados** (`1099-1107`). Correção: validar conteúdo e sufixar títulos repetidos.
- **C3.3 · `saveState` roda a cada tecla no system prompt serializando até 100 mensagens** (`542-549`): IO por tecla em históricos grandes. Correção: debounce (~300-500 ms).
- **C2.4 · Imagens remotas da IA carregam automaticamente** (`270-271`, `444`): beacon/rastreio e conteúdo remoto no app. Correção: exigir clique ou bloquear por política de sanitização.
- **C7.8 · Estilos inline no markup violam a convenção de classes** (`377`, `380`). Correção: classes no CSS do plugin.
- **C2.5 · Comandos persistem HTML cru gerado pela IA (prompt injection da nota)** (`1058-1070`, `1103-1105`). Correção: sanitizar/persistir como texto quando o tipo não exigir HTML.

**Sugestão**

- **C8.1 · Zero testes no plugin** (`test-*.js` inexistente): extrair `parseConfig`, `renderMarkdown` (injetável), corte de contexto e colapso como funções puras + `bun` + smoke de render no Chrome headless (padrão das rodadas 1-4).
- **C7.9 · Fonte única para config e sincronia de artefatos**: título/label/README/manifest/zip divergentes; correção estrutural: busca por label + parser compartilhado + script de release conferindo sha256 repo=zip=instâncias.
- **C4.17 · Botão ↻ por mensagem deveria regenerar a clicada** (`634-637`, `921-923`; README `16`, `90`): hoje sempre opera a última; usar o `history-idx` morto ou esconder nas antigas.
- **C7.10 · Reduzir o monólito** (1.235 linhas com ~300 de CSS em template string): blocos com marcadores (padrão `CLW-BE-*`/`FV_I18N`) e CSS escopado.

### 🎨 UI/UX — achados

**Crítica**

- **D3.1 · Ações de mensagem só no hover e fora da árvore de foco** (`187-194`, `628-647`): `.msg-actions { display:none }` + `.msg:hover`; sem `:focus-within`, sem `aria-label` (só `title`). Teclado e touch não copiam/regeneram/editam. Correção: manter no DOM com `opacity/visibility`, revelar em hover **e** `:focus-within`, alvos ≥40px, `aria-label`. (verificar em runtime no mobile)
- **D2.1 · CSS sem escopo, reset `*` e classes genéricas hoistados** (`4-34`, `40`, `166-167`, `312-328`): contamina o app inteiro e persiste após fechar a nota; colide com `.toast`/`.msg` de outros scripts. Correção: escopar sob `.aic-root`/`.chat-wrap`. (raiz também `C2.2`)
- **D3.2 · Chat sem região viva: resposta, "IA processando..." e contador não são anunciados** (`384-387`, `312-317`, `741-744`): sem `role="log"`/`aria-live` no `#messages`, `role="status"` no `#typing`/contador, `aria-busy` no loading. O fluxo principal é mudo para leitor de tela.

**Alta**

- **D5.1 · `confirm()` nativo na edição e na limpeza** (`999`, `1172`): bloqueia o Electron, ignora o tema e diverge do padrão de 2 toques do toolkit (rodadas 2-4). Correção: confirmação inline com timeout e Esc.
- **D2.2 · Interface 100% PT-BR hardcoded, sem o i18n por `locale`** (todo o arquivo; `608`, `1026`; contador "msgs" em inglês `377`): quebra o demo EN e a paridade das rodadas 2-4. Correção: `AIC_I18N` PT/EN. (raiz também `C7.1`/`QW-20`)
- **D7.1 · Vermelho de erro hardcoded `#c0392b` fora de token** (`223`, `292`, `311`, `328`): ~2,3-2,6:1 sobre fundos escuros (reprova AA); não acompanha os temas. Correção: token/variante de perigo. (verificar em runtime nos dois temas)
- **D7.2 · Contrastes destruídos por opacidade acumulada** (`68`, `117`, `135`, `156`, `161`, `166`, `181`, `185`, `189-194`, `219`, `224`, `289`, `315`): `--muted-text-color` × 0,35-0,6 de opacity = ~1,5-2,5:1. Correção: escala de tokens de texto, sem opacity. (verificar em runtime)
- **D8.1 · Tipografia abaixo do piso (10-11px)** (`156`, `185`, `190`, `342`, `343`): badge do modelo 11px (10px no mobile), timestamp 11px, ações 11px. Correção: piso 12px.
- **D3.3 · Alvos de toque bem abaixo de 40px** (`61-66`, `99-105`, `127-135`, `147-153`, `189-193`, `216-220`, `306-310`): ações ~18×14px, `.btn-icon`/`.btn-cmd`/`.btn-danger`/colapso/contexto com padding pequeno. Correção: `min-height/min-width` 40px (44 no mobile).
- **D5.2 · Erro de API transitório, mensagem órfã e sem recuperação** (`904-913`, `994-996`, `696-699`, `734-739`): toast de 2,5 s, `history.pop()`, balão do usuário fica na tela mas o ✎ não o encontra; `msg-error`/`labels.error` nunca usados. Correção: balão de erro persistente com "Tentar de novo" e mensagem mantida no histórico.
- **D5.3 · ↻ regenera sempre a última resposta, não a clicada** (`634-637`, `921-929`; README `16`, `90`): clicar numa resposta antiga altera a mais recente ou não faz nada (retorno mudo em `922-923`). Correção: mirar a mensagem clicada (usar `history-idx`) ou ocultar/desabilitar quando não aplicável.
- **D3.4 · Foco mal gerenciado: `outline: none` sem `:focus-visible`, Esc sem função real, foco perdido no loading** (`57-60`, `94`, `116`, `141-146`, `282`, `731`, `1197-1199`; grep `focus-visible` = 0): Esc só dá `blur()`; `setLoading(true)` desabilita o textarea durante todo o request. Correção: `:focus-visible` global, Esc fecha busca/persona, manter foco/`aria-busy` no loading e devolver foco ao acionador.
- **D6.1 · Pulso infinito do botão "Parar" sem `prefers-reduced-motion`** (`291-297`; grep = 0): animação contínua + contraste oscilando 30%. Correção: desativar a animação em reduced-motion.
- **D3.5 · Atalhos globais sem escopo, sem remoção, sem Mac e sem UI** (`1202-1215`, `1192-1200`): `Ctrl+Shift+C/S/F` com `preventDefault()` em qualquer painel (limpar é destrutivo), só `ctrlKey`, handler acumulativo. Correção: escopo por foco/contêiner, `metaKey`, remoção e dica na UI. (raiz também `C5.2`/`QW-4`)

**Média**

- **D4.1 · Breakpoint por viewport (500px), não por contêiner** (`331-344`): painel estreito no desktop não recebe os ajustes; no mobile as faixas fixas consomem a altura útil. Correção: container queries ou breakpoints por painel.
- **D4.2 · Truncados sem recuperação** (`69-73`, `155-158`, `334`, `342`): título do contexto e badge do modelo com ellipsis e sem `title`/expansão. Correção: tooltip com o valor completo.
- **D4.3 · Toast `fixed` + `nowrap` sem max-width** (`319-325`, `734-739`): erro longo da API vaza da janela; ancorado ao viewport em layouts multi-painel. Correção: `max-width`, wrap e ancoragem no contêiner.
- **D4.4 · Overflow horizontal em markdown (tabelas/URLs)** (`195`, `260-268`): só o `pre` tem `overflow-x`; sem wrapper rolável nem `overflow-wrap: anywhere`. Correção: container rolável + quebra de URLs.
- **D5.4 · Loading inconsistente; Enviar durante comando aborta o comando em silêncio** (`721-732`, `847-851`, `1046-1050`): comando só desabilita o próprio botão, sem Stop; usuário acha que enviou. Correção: controlador por operação + Stop único + estado global. (raiz também `C5.1`/`QW-16`)
- **D5.5 · Filtro ignora conteúdo colapsado e não mostra contagem** (`1139-1150`, `659-663`): falso negativo após os 1.000 chars; sem "N de M"/estado vazio. Correção: buscar no texto completo + contador. (raiz também `C4.13`)
- **D5.6 · Recolher fatia o HTML e quebra o markup** (`659-675`): corte no meio de tag/entidade. Correção: re-renderizar do texto. (raiz também `C4.3`)
- **D5.7 · Editar trunca o histórico na hora e não guarda rascunho** (`994-1009`, `459-470`): mudar de ideia é irreversível; o texto editado não é persistido. Correção: snapshot com Desfazer e rascunho salvo.
- **D3.6 · Campos sem nome acessível: placeholder como único rótulo** (`349`, `351`, `358`, `363`, `369`, `380`, `390`): `Contexto/Especialista/Gerar` são spans decorativos; inputs sem `<label for>`/`aria-label`. Correção: associar labels.
- **D3.7 · Toggles sem estado acessível (persona/busca)** (`360-362`, `380-381`, `535-540`, `1125-1133`): `aria-expanded`/`aria-controls` ausentes; busca aparece/some com `display:none` inline. Correção: ARIA + foco gerenciado.
- **D5.8 · Config ausente sem estado persistente nem recuperação** (`806-819`, `823`, `867-911`): erro só no primeiro envio; badge vazio; nada aponta a nota de config (que o manifest cria com nome divergente). Correção: banner no boot com "Abrir/Criar config" e envio desabilitado com explicação. (raiz também `C1.1`/`QW-10`)
- **D2.3 · Falsa affordance: `cursor: pointer` na bolha do usuário sem clique** (`196-201`, `640-647`; README `17`): o ponteiro promete edição que só existe no ✎ do hover. Correção: implementar clique-para-editar ou remover o cursor e corrigir o README.
- **D5.9 · Trocar contexto apaga a conversa sem aviso** (`711-719`, `834-839`). Correção: 2 toques quando houver histórico (raiz também `C4.10`/`QW-8`).
- **D7.3 · `#fff` fixo sobre `var(--main-color)`** (`287`, `327`): acento claro por tema derruba o contraste do CTA e do toast. Correção: par de tokens por tema. (verificar em runtime)
- **D7.4 · Bloco de código invisível no escuro** (`247`, `250-258`): `rgba(0,0,0,0.07)` sobre fundo escuro não diferencia; `rgba(128,128,128,0.15)` idem. Correção: superfície do tema.
- **D4.5 · Inputs <16px causam auto-zoom no WebView iOS** (`142`, `276`, `339`): 13-15px (14px no mobile). Correção: 16px nos campos no mobile. (verificar em runtime no iOS)

**Baixa**

- **D2.4 · Capturas do README desatualizadas e divergentes entre si** (README `57-60`; `imagens/chat-1-.webp` em EN com UI antiga, `chat-2-.webp` com emoji coloridos): contradizem "Monochromatic icons" (`README:72`). Correção: regravar nos dois temas.
- **D1.1 · Densidade/hierarquia: quatro faixas de mesmo peso antes do chat; badge do modelo apagado** (`347-382`, `155-158`): o essencial só aparece após ~200px de chrome. Correção: colapsar contexto/persona em uma linha e dar peso ao badge.
- **D5.10 · "Salvar" e comandos habilitados sem histórico/contexto** (`393`, `1015-1017`, `1040-1044`): cliques em becos sem saída com erro só depois. Correção: `disabled` + hint do pré-requisito.
- **D5.11 · Sem contador do limite de 32.000 chars** (`856`): o limite só é descoberto ao perder o envio. Correção: contador a partir de ~80%.
- **D6.2 · Hovers sem transição e ações aparecendo "seco"** (`104`, `132-134`, `194`, `321-326`): destoa do toast suave. Correção: padronizar transitions e usar opacity/visibility nas ações.
- **D3.8 · Lista de mensagens não é focável/rolável por teclado** (`170-175`): sem `tabindex`/role, PageDown não funciona. Correção: `tabindex="0"` + `role="log"`.
- **D2.5 · Persistência e utilitários com falhas silenciosas e estilos inline** (`472-488`, `741-744`, `377`, `380`): `loadState` `catch {}` (limpa a conversa sem aviso), contador dependente do primeiro `.chat-label`, estilos inline. Correção: avisar/instrumentar + ids/classes. (raiz também `C1.5`/`QW-7`)
- **D5.12 · Trocar de persona sobrescreve o prompt editado sem aviso** (`524-531`, `542-549`): voltar a um especialista descarta a edição. Correção: guardar o custom e oferecer restaurar.
- **D3.9 · Estados de botão mortos/inconsistentes** (`721-732`, `284-289`): `:disabled` do Enviar nunca é usado; Enviar ativo com input vazio (clique mudo). Correção: refletir `disabled` por estado.

**Sugestão**

- **D1.2 · Estado vazio que ensina o setup e os atalhos; rótulos de persona sem símbolos decorativos** (`385`, `509-516`): onboarding fraco (primeiro erro só no primeiro envio). Correção: texto com passos (criar config, carregar nota, `Ctrl+Enter`) e rótulos limpos.

### ⚡ Quick wins — backlog

| # | Melhoria | Onde | Ganho | Esforço | Risco | Validação |
|---|----------|------|-------|:-------:|:-----:|-----------|
| 1 | Config por label + fallback de título (instalação nova quebra) | `806`; `manifest:15,37` | Elimina o blocker de instalação | S | Baixo | instalação limpa + asserção no harness |
| 2 | Escopar o reset CSS | `40`, `166-167` | Fim do vazamento global | S | Baixo | abrir outra nota/widget e comparar |
| 3 | Guardar patch de `$.fn` e hoist (idempotência) | `4-34`, `21` | Fim do acúmulo de wrappers/CSS | S | Baixo | re-render 2× e conferir o `#aic-chat-css` |
| 4 | Escopar atalhos globais e instalar 1× | `1202-1215` | Não sequestra o app; sem handlers duplicados | S | Baixo/Médio | atalhos em outra nota não devem disparar |
| 5 | Corrigir divergência UI×history no erro de envio (+ timeout × cancelamento) | `904-914` | Fim da perda silenciosa do texto | S | Médio | 401/timeout com bolha marcada + retry |
| 6 | Corrigir `regenerate` (bolha do usuário apagada; só a última) | `921-932` | Recurso passa a funcionar como anunciado | S | Médio | regen e conferir a bolha |
| 7 | Persistir ajustes sem depender do histórico + `change` no "Subnotas" | `477-486`, `379` | Preferências restauram sempre | S | Baixo/Médio | desmarcar e recarregar |
| 8 | Confirmar troca de contexto (2 toques) | `711-719` | Fim da perda da conversa | S | Baixo/Médio | com histórico, cancelar mantém tudo |
| 9 | `confirm()` → 2 toques inline | `999`, `1172` | Consistência e tema | S | Baixo/Médio | armar/confirmar/cancelar |
| 10 | Config no boot: badge + erro acionável + placeholder | `1225-1235`, `819` | Primeiro uso deixa de ser erro obscuro | S | Baixo/Médio | abrir sem config → mensagem clara |
| 11 | Contexto: título clicável, Enter, remover, contagem `[x/y]` na UI | `350-353`, `795-798` | Contexto operável e feedback visível | S | Baixo/Médio | clicar/Enter/remover; contagem na tela |
| 12 | Exportar conversa (copiar tudo em .md) | `1015-1034` | Levar a conversa para fora | S | Baixo | copiar gera Markdown idêntico |
| 13 | Contadores: caracteres no input + tokens da resposta (`usage`) | `390`, `899-902` | Limite visível; custo informado | S | Baixo/Médio | digitar/responder com `usage` |
| 14 | Botão flutuante "rolar para o fim" | `597-605` | Não perder o fio durante geração | S/M | Baixo | rolar para cima → botão aparece |
| 15 | Ações de mensagem: cópia robusta, clique na bolha, colapso sem fatiar HTML | `630-633`, `196-201`, `667` | Ações confiáveis e acessíveis | S | Baixo/Médio | clipboard stub + recolher/expandir |
| 16 | Proteger requisição em voo (limpar/salvar/comandos; Enviar não aborta comando) | `721-732`, `847-851`, `1171` | Fim de respostas em conversa limpa e comandos mortos | S/M | Médio | limpar durante request; 2 comandos |
| 17 | Escapar transcript ao salvar + abrir a nota criada | `1021-1031` | Fim da injeção armazenada; confirmação visível | S | Médio | resposta com `<b>` não vira markup |
| 18 | Filtro com "N de M" e estado vazio | `1139-1150` | Busca compreensível | S | Baixo/Médio | buscar termo raro |
| 19 | Harness `test-chat.js` (funções puras) + smoke headless | plugin | Rede de proteção (hoje: zero testes) | M | Baixo | `bun test-chat.js` + smoke |
| 20 | i18n PT/EN pelo `locale` (paridade com o toolkit) | todo o arquivo | Demo EN e paridade | M | Médio | paridade de chaves + smoke EN |

**Descartes explícitos:** múltiplas conversas por nota/pastas de personas (exige modelo de persistência novo para ganho marginal); custo em US$ (tabela de preços desatualiza; `usage` em tokens cobre); streaming SSE (muda transporte/abort/render, risco alto sem corrigir nada existente); syntax highlighting/toolbar markdown (CDN extra e CSS global); virtualização de mensagens (limite 100 + colapso seguram); destaque de trechos na busca (re-render por tecla; a contagem resolve).

### Claims do README não cumpridos

| README | Promessa | Código | Situação |
|---|---|---|---|
| 8 | Feedback de quantas subnotas entraram/pularam | `795-798` monta, `871-872` envia só ao modelo | Não exibido ao usuário |
| 17, 91 | Editar "and re-send from that point" | `994-1009` só devolve ao input | Parcial |
| 63-66 | Erro de filha "logged and shown as `(erro ao ler filhas)`" | `764-766`/`789-791` viram `skipped++`, sem log | Não cumprida |
| 77 | Agrupar esconde só rótulos repetidos consecutivos | `209-210` esconde o rótulo de toda mensagem após a 1ª | Não cumprida (seletor) |
| 83 | Badge do modelo mostra o modelo atual | `822-823`; `init` não carrega config | Parcial (vazio ao abrir) |
| 90 | ↻ em **qualquer** mensagem da IA | `923` exige que a última seja assistant; botão em todas (`634-637`) | Não cumprida |
| 93 | Persona/prompt/subnotas restauram no reload | `477` só restaura com history; checkbox sem `change` | Parcial |
| 105 | "History index tracking for reliable edit/regenerate" | `619` grava `data-history-idx`, nunca lido | Sem efeito (código morto) |
| 106 | Scroll preservado no restore (`_isRestoring`) | `483-485`/`683` usam a flag para **forçar** scroll ao fim | Contradiz o código |
| 78 | Colapso >1000 chars | `659-675` existe, mas recolher fatia o HTML (`667`) | Cumprida com defeito |

### Pontos fortes (não mexer)

- Callbacks `runOnBackend` auto-contidos com args em array em todas as chamadas (`750-770`, `1029-1031`, `1103-1105`).
- `getProtectedContent()` com fallback para `getContent()` na leitura da config (chave protegível pelo master password).
- Limites unificados (`MAX_CTX_CHARS=15000`, 32.000/msg) e timeout de 90 s com `AbortController`; smart scroll (`597-605`).
- DOMPurify aplicado **quando disponível** + `.text()` nos dados do usuário; nenhuma injeção trivial no fluxo com CDNs OK.
- Erro HTTP diferencia `data.error.message`; loading/toast/estado vazio presentes; histórico limitado a 100 no storage.
- Stop/regenerate/edit/save implementados de ponta a ponta (com os defeitos listados, mas o fluxo existe e é testável).

### Versões/registry/README/artefatos

- Registry `ai-chat-openrouter` **0.8.3** com `sourceUrl` + `manifestUrl` corretos; o manifest sem `version` é o padrão de todos os manifests do repo (fonte da versão é o registry) — manter o bump no release.
- **Zip × repo:** `AI Code.js` idêntico (sha256 `280ffe5f…`); config do zip defasada (`bbc95d23…` × `f32583a9…`) e export com `appVersion 0.103.0`.
- **Três grafias da config:** código/README "AI Chat - Config" (606, 807; README 22), manifest "AI Chat Config" (`manifest:15`) com label `aiChatConfig` (`:37`), zip "AI Chat - config" — raiz do achado C1.1.
- **Sem harness:** `test-*.js` inexistente; a Fase 0 não teve harness quebrado para consertar, e criar `test-chat.js` + smoke entra no batch de correção (QW-19).

### Veredito da rodada 5

Plugin funcional no fluxo feliz (chat, RAG de subnotas no backend, comandos, save, stop), mas com
riscos concentrados em: (a) **instalação nova quebrada** pela busca de config desalinhada do manifest
(crítica de release); (b) **segurança condicional**: XSS quando o CDN falha (marked/DOMPurify) e
conteúdo cru persistido no save/comandos; (c) **concorrência**: `abortController` global com timers
soltos e operações que se cancelam; (d) **contaminação global** por patch de `$.fn` + CSS sem escopo
(reset `*`), afetando o app e outros plugins; (e) **acessibilidade e paridade**: ações só no hover,
sem ARIA/vivas, sem i18n, contraste/opacidade e alvos fora do padrão. Nenhuma correção foi aplicada
nesta rodada — batches após triagem do dono (candidatos: 1) integridade/segurança, 2) UI/a11y/estado,
3) paridade/harness — com o `test-chat.js` + smoke entrando no pacote.

**Próximo da lista:** Minimalist Pomodoro + Time Tracker (rodada 6) — prioridade do release
definida em 29/09: Pomodoro → Word-Counter → Daily-Note-Navigator.

---

## ✅ Correções aplicadas — rodada 5, batches 1-3 (29/09/2026)

### Batch 1 — integridade, segurança e robustez

| ID | Correção aplicada | Como foi validado |
|----|-------------------|-------------------|
| C1.1/C7.1/QW1 | Config descoberta por **label `#aiChatConfig`** com fallback de títulos ("AI Chat - Config"/"AI Chat Config"/"AI Chat - config"); manifest/README alinhados; label adicionado às configs do VPS e do demo | smoke + **instalação real no demo** (nota nova criada pelo manifest lê a config pelo label) + guarda no `test-chat` |
| C2.1 | `renderMarkdown` **fail-closed**: sem `marked` **ou** sem `DOMPurify` devolve texto escapado (`aicEscape`), nunca HTML cru | `test-chat` (escape) + smoke (sem HTML injetado) |
| C2.3/QW17 | `saveNote` escapa conteúdo/persona; comandos HTML são sanitizados com DOMPurify quando disponível; a nota criada é aberta | revisão + smoke |
| C1.3 | `getNoteTreeBackend`: try/catch por nota (inclui `getContent`), filtros `isProtected`/`#archived`/tipo e tetos (40 notas × 2.000 chars); `TREE_DEPTH=3` agora cumpre "child and grandchild" | smoke (contexto carrega) + revisão |
| C4.6 | `buildContextText` retorna `{text, feedback}`; primeiro bloco truncado, puladas contadas certo e **feedback visível na UI** (`[x/y notas]`) | smoke + revisão |
| C5.1/C4.9/D5.4 | Fim do `abortController` global: `beginOp/endOp` com controller + timer por operação, `clearTimeout` no `finally`, timeout ≠ cancelamento; Enviar durante comando avisa ("aguarde") em vez de abortar | smoke (erro de rede) + revisão |
| C1.2/D5.2 | Erro de envio remove a bolha/entrada do histórico e **restaura o texto no input**; erro vira **balão inline persistente** (distinto para timeout/cancelamento) | smoke (texto restaurado + `.msg-error`) |
| C4.2/D5.3 | `regenerate` mira a **mensagem clicada** por `mid` (fim do `.msg:last-child` que apagava a bolha do usuário) com snapshot restaurado em falha | revisão + smoke |
| C5.2/D3.5/QW4 | Atalhos **escopados ao plugin** (`$c.off('keydown.aichat')`, `Ctrl/Cmd`), sem sequestrar outras notas nem acumular handlers | `test-chat` (guarda: sem `$(document).on`) |
| C5.3/QW3 | Patch de `$.fn.html/.append` com flag `window.__aicPatched`; CSS **substituído** (`textContent =`) em vez de concatenado; `append` preserva todos os args | `test-chat` (guardas) |
| C2.2/D2.1/QW2 | CSS **100% escopado** em `.chat-wrap` (reset `*`, `::placeholder`, `.toast`/`.msg`/`.typing`); toast movido para dentro do wrap | `test-chat` (guardas) + smoke |
| C1.4 | Parser de config ignora linhas `#`, ancora por linha e clampa `temperature`/`max_tokens`; placeholder "your key" detectado | `test-chat` (7 casos) |
| C4.4/C3.1/C7.6 | `callApi()` única (send/regenerate/comandos); payload só `{role, content}`; **janela de histórico** (~40k chars) | `test-chat` (guarda) + smoke |
| C4.5/C1.9 | `choices[0]`/conteúdo validado ("Resposta vazia da API"); erro de rede mapeado ("Falha de rede ao chamar a API") | smoke (erro de rede) |
| C1.5/C4.14/C3.3 | Estado **versionado** (`STORAGE_VERSION`), histórico validado no load, aviso de cota, `finally` no `_isRestoring`, `saveState` com debounce no prompt | revisão + smoke (histórico salvo) |
| C1.7/C1.8 | `getProtectedContent` null → fallback com validação de string; config sem key/placeholder mostra banner acionável | `test-chat` + smoke (cena sem config) |
| C4.15/C4.16 | Contexto avisa tipo não textual; comando com resposta vazia falha antes de criar nota | revisão |

### Batch 2 — UI, estados, tema e acessibilidade

| ID | Correção aplicada | Como foi validado |
|----|-------------------|-------------------|
| D3.1/QW15 | Ações de mensagem revelam em **hover e `:focus-within`** com `aria-label`; cópia com fallback (`execCommand`) e toast de falha; clique na bolha do usuário edita (com guarda de seleção) | smoke (aria-label) |
| D3.2 | `#messages` com `role="log" aria-live="polite"` + `aria-busy`; `#typing` `role="status"`; `#search-count` vivo | smoke (`role=log`) |
| D3.3/D4.5 | Alvos ≥40px no mobile; campos em 16px (anti-zoom iOS) | revisão |
| D3.4/D3.6/D3.7 | `:focus-visible` com `!important`; todos os campos com label/`aria-label`; `aria-expanded` em persona/busca | revisão |
| D5.1/QW9 | Fim do `confirm()` nativo: **confirmação inline de 2 toques** (limpar, editar, trocar contexto) com Cancelar acessível | `test-chat` (guarda: sem `confirm(`) + smoke |
| D7.x | Tema claro detectado (`.aic-light` por brilho) com `--aic-danger`/`--aic-code-bg`; opacidades de texto removidas; toast com `max-width`/wrap | revisão |
| D6.1 | `prefers-reduced-motion` desliga pulso do "Parar" e transições | revisão |
| D5.6/QW15 | Colapso alterna entre **HTML curto e completo guardados** (fim do `slice` que quebrava tags) | revisão + smoke |
| D5.5/QW18 | Busca no **texto completo** (`data-full-text`) com "N de M" e "Nenhuma mensagem encontrada" | smoke (contagem) |
| D5.8/QW10 | Banner de config no boot + botão "Verificar de novo"; badge do modelo com `title` | smoke (2 cenas) |
| D4.2 | `title` no título do contexto e no badge (truncados recuperáveis) | revisão |
| QW11-14 | Contexto: título clicável (abre a nota), Enter carrega, botão remover, feedback `[x/y]`; **exportar `.md`**; contador de chars + tokens (`usage`); botão flutuante "rolar para o fim" | smoke (uso/contagem) |

### Batch 3 — paridade, harness e artefatos

| ID | Correção aplicada | Como foi validado |
|----|-------------------|-------------------|
| C7.1/D2.2/QW20 | **i18n PT/EN** pelo `locale` do Trilium (`AIC_I18N` com 85 chaves + `tr()` com interpolação); datas/horas/títulos por locale; personas e comandos com prompts e rótulos EN | smoke cena EN (botões/persona/estado vazio) + asserção de paridade |
| C8.1/QW19 | **`test-chat.js`** (funções puras: escape, parser de config, 10 guardas estruturais, paridade i18n) e **`test-smoke.js`** (Chrome headless: config OK/sem config/EN, envio, erro de rede, busca) | `bun test-chat.js` 19 ✅ · `bun test-smoke.js` 21 ✅ |
| QW7 | Preferências (persona/prompt/subnotas) restauram **mesmo sem histórico**; `change` do "Subnotas" passa a salvar | revisão |
| C7.4/C7.5 | README reescrito (claims corrigidos, config por label, i18n, testes); **zip regenerado** com o JS novo (sha idêntico), config atual e **label `aiChatConfig` no meta**; `appVersion 0.106.0` | sha256 zip = repo |

**Deploy (29/09):** VPS (nota `SoLUglVUsVdN`, config `Pg0VgLlQZiCZ` com label adicionado) e
**demo EN** (plugin não existia: instalação nova via ETAPI — `Xf3HC8ReUMJ5` render + `HBIDHriTNqN5`
código + `Dm58WcQ6yEgC` config) com **sha256 idêntico ao repo** (`24a9bfdf…`); zip regenerado com o
mesmo sha. A instalação nova no demo validou na prática o fluxo "manager cria config com label →
plugin encontra pelo label".

**Residual:** migrado para o **`ROADMAP-RESIDUAIS.md`** (§ AI-Chat): cache de config, `STORAGE_KEY`
por instância, política para imagens remotas, render em lote no restore, títulos duplicados dos
comandos, prompt custom na troca de persona, estado do botão Enviar, breakpoint por container,
densidade das faixas, capturas do README, bump/descrição no registry.

---

## Rodada 6 — Minimalist Pomodoro + Time Tracker (29/09/2026)

**Escopo:** `Minimalist-Pomodoro/Pomodoro-mini/Pomodoro mini.js` (471 linhas), `README.md`,
`Pomodoro-mini.zip`; registry `minimalist-pomodoro`.
**Verificação:** `bun build` (sintaxe) ✅ · zip = repo (sha256 `632968db…`) · **sem harness de
teste** · registry `0.8.0` com `sourceUrl` + labels (`widget`/`readOnly`), sem manifest (ok) ·
3 especialistas (read-only) + conferência direta dos achados graves.
**Baseline conferido no runtime 0.106:** `api.showError` existe; `cssBlock(CSS)` é API válida
(style no widget, reanexado a cada render); `get parentWidget()` **de instância funciona** (a nota
antiga do `SESSION.md:127` sobre ser `static` está desatualizada); **`--button-hover-background-color`
NÃO existe** em nenhum tema do 0.106 (hover morto); Boxicons `bx-*` existem (via `window.glob`).

### Resumo executivo

| Especialista | Crítica | Alta | Média | Baixa | Sugestão | Total |
|---|---:|---:|---:|---:|---:|---:|
| 👨‍💻 Código | 2 | 4 | 16 | 9 | 5 | 36 |
| 🎨 UI/UX | 1 | 8 | 14 | 8 | 3 | 33 |
| ⚡ Quick wins | — | — | — | — | — | 20 itens |

**Top 5 (triagem sugerida):**
1. **[Crítica · C1/D5]** `_stop()` limpa todo o rastreamento mesmo quando o relatório falha (o `catch` interno engole o erro e o reset acontece de qualquer jeito) — perda irreversível com só um toast (`267-290`, `446-467`).
2. **[Crítica · C4]** `lastTick` restaurado sem janela de validade (`savedAt` é escrito e nunca lido): abrir no dia seguinte e salvar credita a noite inteira à última nota (`57`, `75`, `338-348`).
3. **[Alta · C2/C1]** Relatório com título de nota **sem escape** e **linhas em sintaxe markdown dentro do `<tbody>`** (a tabela não renderiza; HTML persistente) (`428-442`).
4. **[Alta · C4]** Recarga no meio da sessão **não retoma o timer** e descarta `pomo-session-end`; boot só repinta a UI se houver pendência (`393-406`, `205-208`).
5. **[Alta · C5]** `beforeunload` acumulativo a cada render + interval órfão sem cleanup; `restoreTrackingData` sobrescreve o estado vivo no remount (`210-213`, `62-76`).

**Nota de dedupe:** STOP destrutivo e "salvar no meio perde rastreio" aparecem nas três listas
(Código 1/13/14, UI 1/2, QW-9/10); hover inexistente (Código 28?, UI 7), boot sem `_updateUI`
(Código 19, UI 10, QW-1) e ARIA/alvos (Código 28, UI 3/4/5, QW-12) também. Os batches consolidam.

### 👨‍💻 Código — achados

**Crítica**

- **C1.1 · `_stop()` limpa o tracking mesmo com falha no relatório** (`267-290`, `465-467`): `await this._saveReport()` engole o erro e não devolve status; em seguida `noteTimes.clear()` + `clearTrackingData()`. Qualquer falha de backend destrói horas de foco. Correção: `_saveReport()` retorna booleano; só limpar em sucesso. (verificar em runtime com backend falhando)
- **C4.1 · `lastTick` restaurado sem validade infla o relatório offline** (`57`, `75`, `338-348`, `203`): `savedAt` gravado e nunca lido; clique em "pendente" → `_flushNoteTime()` soma `now - lastTick`. Correção: limitar/descartar pela janela (`savedAt`) ou reancorar no restore. (verificar em runtime)

**Alta**

- **C4.2 · Recarga no meio da sessão não retoma o timer e destrói `pomo-session-end`** (`393-406`, `205-208`; README `27`): calcula `remaining` mas não liga `running`/intervalo e remove a chave; UI só repinta se houver pendência. Correção: retomar quando `remaining>0`, `_updateUI()` incondicional e só consumir a chave de fato.
- **C5.1 · `beforeunload` acumulativo e timer sem cleanup de ciclo de vida** (`210-213`, `242`, `328`): listener anônimo por render; `cleanup()` do widget não remove; intervalo sobrevive a unmount/re-render. Correção: referência + `removeEventListener`, init idempotente. (verificar em runtime)
- **C2.1 · Título de nota sem escape no HTML do relatório** (`429-431`): `${title}` cru em `<a>` criado por `createTextNote`. Correção: `esc()` (com aspas) e validar `id`. (verificar em runtime)
- **C4.3 · A pausa do ciclo é contada como tempo de trabalho da nota** (`313-326`): `if (lastNoteId) lastTick = Date.now()` mantém a mesma nota durante o break. Correção: zerar/desancorar no início do break e reancorar no foco.

**Média**

- **C1.2 · `restoreTrackingData` sobrescreve `noteTimes` vivo no remount** (`62-76`, `205-208`): o snapshot persistido não contém os segundos desde o último `persistTrackingData`. Correção: só restaurar com `noteTimes.size === 0` ou merge por soma. (verificar em runtime)
- **C7.1 · i18n ausente** (todo o arquivo; UI + relatório + datas `pt-BR`): diverge do padrão (Canvas/Shared/AI-Chat). Correção: `PM_I18N` + `tr()` + locale. (raiz também em `D2.2`/`QW-18`)
- **C3.1 · `pomo-ticks` gravado a cada 250 ms e nunca lido** (`306`): escrita síncrona 4×/s + lixo. Correção: remover.
- **C3.2 · DOM reescrito 4×/s sem mudança de segundo** (`294-307`): `$timer.text()` a cada tick. Correção: cachear a última string; intervalo de 1 s.
- **C1.3 · `_saveReport` sem guarda de reentrada** (`202-203`, `267-277`, `446-467`): duplo clique → dois relatórios idênticos. Correção: flag `saving` + botões desabilitados.
- **C1.4 · `catch {}` mudo no restore** (`77-79`): JSON corrompido some sem aviso e a chave fica. Correção: avisar/limpar com aviso.
- **C4.4 · Relatório manual durante a sessão perde o trecho até a próxima troca** (`411-412`, `454-458`): `lastNoteId=null`/`lastTick=0` com `running=true`. Correção: reancorar na nota atual. (raiz também em `D5.2`/`QW-10`)
- **C4.5 · `cycleCount` não zera no save manual** (`454-458` × `279-281`, `419-426`): o próximo relatório repete "ciclos completos". Correção: zerar por relatório.
- **C1.5 · `localStorage` sem `try/catch`** (`59`, `83`, `306`, `377`, `384-390`, `394-405`): cota/contexto restrito quebram `_start`/`_pause` no meio. Correção: embrulhar e degradar com aviso.
- **C7.2 · Chaves de storage sem versão/escopo** (`59`, `83`, `306`, `384-390`, `394-405`): duas cópias/contas compartilham estado. Correção: prefixo + `schemaVersion`.
- **C4.6 · `_loadState` monta estado incoerente em storage sujo** (`394-405`): fallback de `seconds` com `isWorkSession` de outra chave → "Pausa" de 25:00. Correção: coerência entre ramos + `Number.isFinite`.
- **C8.1 · Sem testes puros nem smoke** (pasta sem `test-*.js`). Correção: `test-pomodoro.js` (marcadores) + smoke do `doRenderBody` (padrão `QW-14/15`).
- **C1.6 · `_updateUI()` não roda no boot sem pendência** (`205-208`): template fica 25:00/status vazio. Correção: chamar sempre. (raiz também em `D5.4`/`QW-1`)
- **C4.7 · Relatório do cruzamento de meia-noite vai para o dia errado** (`415-417`): `dateStr` calculada no save. Correção: persistir a data de início da sessão.
- **C4.8 · `_start` sem nota ativa mantém `lastNoteId` antigo** (`244-248`, `338-348`): tempo creditado à nota errada. Correção: `lastNoteId = null` sem nota.
- **C6.1 · Destino do relatório nem sempre é a daily note e não é informado** (`444-452`): `getDayNote` pode devolver null → cai no contexto/`root` em silêncio. Correção: informar o destino no toast.
- **C4.9 · `_pause` persiste pendência mesmo sem dados** (`254-265`, `377-378`, `412`): banner "fantasma" que nunca some e cujo clique não faz nada. Correção: persistir só com dados; esconder sem dados. (raiz também em `D5.3`)

**Baixa**

- **C4.10 · `Math.round` por flush acumula deriva** (`224-227`, `341-347`). Correção: guardar ms e arredondar na exibição.
- **C4.11 · Título velho e links mortos no relatório** (`73-75`, `429-431`). Correção: revalidar no flush.
- **C4.12 · Ramo de status `'...'` morto/confuso** (`366-367`). Correção: remover ou nomear ("pronto para a pausa").
- **C5.2/C7.3 · CSS reanexado a cada render e IDs globais** (`191`, `113-158`). Correção: CSS idempotente + classes escopadas. (raiz também em `D2.5`)
- **C7.4 · Versões desalinhadas** (registry `0.8.0`; README "v4"; zip `appVersion 0.103.0`; sem manifest). Correção: alinhar no release.
- **C7.5 · Acessibilidade fora da convenção** (`127-144`, `148-158`, `163-176`). Correção: `aria-label`, ≥40 px, `:focus-visible`. (raiz também em `D3.x`)
- **C3.3 · `_updateUI` relê o localStorage a cada chamada** (`377`). Correção: cache em memória.
- **C1.7 · `catch` assume `Error`** (`465-467`): rejeição sem `message` → "undefined". Correção: `(e && e.message) || e`.
- **C4.13 · `restoreTrackingData` não valida tipos nem descarta `{secs: 0}`** (`67-71`). Correção: `Number.isFinite` + descartar vazios.

**Sugestão**

- **C4.14 · `savedAt` escrito e nunca lido** (`57`): usar no restore (raiz do C4.1).
- **C7.6 · Comentário do topo × README divergem sobre left-pane** (`11-13` × README `36`).
- **C5.3/C4.15 · Autochain infinito e silencioso** (`309-334`): sessões de horas sem aviso; relatório só no stop. Correção: aviso opcional no fim do foco.
- **C8.2 · Helpers não exportados para teste** (`471`): expor condicionalmente (padrão Shared Notes).
- **C6.2 · Dependência silenciosa do rótulo `#widget`** (README `34`, registry): o zip traz `iconClass`/`color` que o fluxo `sourceUrl` não aplica. Correção: labels no registry ou manifest.

### 🎨 UI/UX — achados

**Crítica**

- **D5.1 · STOP destrutivo e silencioso** (`267-290`, `446-467`): salva + zera tudo em um clique, mesmo em falha, sem confirmação/desfazer e com estilo idêntico ao play. Correção: 2 toques quando há dados + reset condicionado ao sucesso. (raiz também em `C1.1`/`QW-9`)

**Alta**

- **D5.2 · Salvar no meio da sessão para o rastreamento da nota atual em silêncio** (`410-412`, `454-458`): só volta a registrar na próxima troca de nota. Correção: reancorar a nota atual. (raiz também em `C4.4`/`QW-10`)
- **D3.1/D4.1 · "Relatório pendente" só de mouse, alvo ~14 px** (`148-158`, `175`, `203`): `<div>` com `cursor:pointer`, sem `role`/tabindex/Enter; é a única via de salvar em alguns estados. Correção: `<button>` real, ≥40 px.
- **D3.2 · Botões ícone-only sem `aria-label`** (`171-173`, `360-363`): nome só por `title` (muda em runtime sem anúncio). Correção: `aria-label` estável + `aria-pressed` no toggle; `title` como dica.
- **D4.2 · Alvos de 32 px** (`122-144`): abaixo da régua de 40 px/44 no mobile. Correção: `min-height` + gap maior.
- **D2.1 · i18n ausente (UI e relatório em PT)** (`166-175`, `360-371`, `416`, `423-425`, `433`, `452`, `460-466`). Correção: `tr()` por locale. (raiz também em `C7.1`/`QW-18`)
- **D7.1/D6.1 · `--button-hover-background-color` não existe no 0.106** (`143`): hover sem efeito e sem fallback. Correção: `--hover-item-background-color`/`--cmd-button-hover-background-color` com fallback. (verificar em runtime)
- **D2.2 · Boot sem `_updateUI()` (status em branco)** (`169`, `205-208`): captura confirma; timer pode divergir do restaurado. Correção: chamar sempre. (raiz também em `C1.6`/`QW-1`)
- **D5.3 · Pendência fantasma** (`254-265`, `377-378`, `412`): aparece sem dados e o clique não faz nada. Correção: persistir/exibir só com dados; avisar quando não há o que salvar. (raiz também em `C4.9`)

**Média**

- **D5.4 · Sem estado "salvando…" nem lock; duplo clique duplica relatório** (`202-203`, `410-412`, `447-454`). Correção: flag + `disabled` + rótulo.
- **D3.3 · Timer sem `role`/`aria`** (`113-121`, `169`, `294-307`): leitor de tela sem acesso ao tempo. Correção: `role="timer"` + nome acessível atualizado por minuto + região `polite` para transições.
- **D5.5 · Trocas de fase silenciosas e sem indicador de ciclo** (`309-334`, `355-372`): `cycleCount` só no relatório. Correção: anúncio `polite` + "Ciclo N".
- **D1.1/D2.3 · Título duplicado** (`166`, `185`): cabeçalho do painel + corpo repetem "Pomodoro". Correção: usar a linha para ciclo/contexto.
- **D2.4 · Emoji 🍅 diverge dos glifos das rodadas 2-5** (`166`). Correção: remover/trocar por ícone monocromático.
- **D2.5 · Estado `'...'` sem significado** (`366-367`). Correção: "Pausa pronta" ou omitir.
- **D2.6 · Terminologia inconsistente** (`171-173`, `360-371`): Iniciar × Iniciar/Retomar × Pausa × Parar. Correção: glossário único ("Encerrar e salvar").
- **D5.6 · Botão de relatório aparece cedo demais e clicar não faz nada** (`374-375`, `412`). Correção: exigir `noteTimes.size > 0` + feedback.
- **D3.4/D5.7 · Pendência não anunciada** (`355-379`): sem `role="status"`. Correção: região `polite`.
- **D7.2 · Borda dos botões < 3:1 (WCAG 1.4.11)** (`133`, `142-144`): `--main-border-color` é o único limite visual (hover morto). Correção: borda de item ativo/fundo acentuado. (verificar em runtime)
- **D3.5 · Sem `:focus-visible` próprio** (`127-144`). Correção: outline 2 px + offset.
- **D5.8 · Sucesso/erro só em toast, sem destino/retry** (`444-466`). Correção: mensagem no widget com referência da nota + "tentar de novo".
- **D6.2 · Sem `prefers-reduced-motion`** (`140`). Correção: bloco de redução.
- **D6.3 · Sem `:active`/`disabled`** (`127-144`): Stop sempre habilitado. Correção: estados coerentes.

**Baixa**

- **D2.7/D3.6 · "clique para salvar" centrado no mouse e sem cara de ação** (`148-158`, `175`).
- **D8.1 · Ícone do relatório menor que os demais** (`138`, `145-147`).
- **D2.8 · Código morto `bx-right-arrow-alt`** (`359`).
- **D5.9 · Tick de 250 ms mexe no DOM e no localStorage à toa** (`294-307`). (raiz também em `C3.1`/`C3.2`)
- **D5.10 · `localStorage` sem tratamento de falha** (`46-84`, `383-406`). (raiz em `C1.5`)
- **D4.3 · Sem ajustes de toque/mobile** (`89-158`): sem `touch-action`/rótulos visíveis.
- **D2.9 · README desatualizado** (left-pane `36`; "restores pending data" `27`; promessas não cumpridas). (raiz em `QW-19`)
- **D5.11 · Estado do widget perdido em re-mount** (mesma raiz do `C5.1`).

**Sugestão**

- **D1.2 · Indicador de ciclos no painel** (`27`, `318`, `374-378`).
- **D5.12 · Prévia do relatório antes de salvar** (`410-442`).
- **D6.4 · Feedback opcional de fim de sessão** (`309-334`): pulso/chime opt-in com reduced-motion.

### ⚡ Quick wins — backlog

| # | Melhoria | Onde | Ganho | Esforço | Risco | Validação |
|---|----------|------|-------|:-------:|:-----:|-----------|
| 1 | Boot mostra o tempo restaurado (`_updateUI` sempre) | `169`, `205-208`, `393-406` | Acaba a UI que "mente" | S | Baixo | smoke (`pomo-seconds=600` → 10:00) |
| 2 | Remover `pomo-ticks` morto | `306` | Menos IO/limpeza | S | Baixo | grep + smoke |
| 3 | Escapar título no relatório | `430` | Fim da injeção/tabela quebrada | S | Baixo | asserção com `<b>&"` |
| 4 | Linhas do relatório em `<tr><td>` de verdade | `428-442` | Tabela renderiza | S | Baixo | teste puro + nota gerada |
| 5 | Toast no fim de foco/pausa + fim do `'...'` | `309-334`, `366-372` | Usuário percebe a transição | S | Baixo | smoke com durações curtas |
| 6 | Ciclos visíveis no cabeçalho | `355-379`, `166-168` | Contexto sem custo | S | Baixo | smoke pós-1 ciclo |
| 7 | Pending corrompido: avisar e permitir descartar | `62-80`, `377-378` | Fim do fantasma silencioso | S | Baixo | stub corrompido |
| 8 | Título do relatório com data/hora + label `#pomodoro` | `452` | Busca/filtro e sem duplicatas | S | Baixo | manual/ETAPI |
| 9 | STOP seguro (2 toques + não limpar em falha) | `267-290`, `465-467` | Fim da perda de dados | S/M | Baixo/Médio | teste com backend rejeitando |
| 10 | Salvar sem parar o timer (reancorar; ciclos por relatório) | `454-458` | Tracking contínuo | S/M | Baixo | sequência save→troca de nota |
| 11 | Atalho de teclado escopado (Espaço/`p`, `s`) | novo | Acesso rápido | S/M | Baixo/Médio | smoke (foco dentro vs. fora) |
| 12 | A11y: `aria-label`, `:focus-visible`, ≥40 px, reduced-motion | `127-144`, `171-173` | Paridade com o toolkit | S/M | Baixo | smoke + inspeção |
| 13 | `beforeunload` idempotente | `210-213` | Fim do acúmulo | S | Baixo | smoke de re-render |
| 14 | Harness `test-pomodoro.js` (puros) | plugin | Rede de proteção | M | Baixo | `bun test-pomodoro.js` |
| 15 | Smoke `test-smoke.js` de `doRenderBody` | plugin | Pega regressão de boot | M | Baixo | Chrome headless |
| 16 | Retomar sessão após reload | `393-406` | Cumpre a promessa | M | Médio | teste de `_loadState` + manual |
| 17 | Durações via labels `#pomoWorkMin`/`#pomoBreakMin` | `18-19`, `421-425` | Flex sem settings | M | Médio | teste puro + manual |
| 18 | i18n PT/EN pelo `locale` | todo o arquivo | Demo EN e paridade | M | Baixo/Médio | paridade + smoke EN |
| 19 | README fiel ao código (left-pane, restore, destino, STOP) | README | Doc confiável | S | Baixo | revisão item a item |
| 20 | Higiene de release (versão/registry/zip) | registry/zip | Consistência | S/M | Baixo | sha256 nas pontas |

**Descartes explícitos:** beep via Web Audio (o toast resolve; som pede toggle — reavaliar opt-in);
trocar Boxicons por emoji (churn; o ganho é o nome acessível, QW-12); UI de settings/modal (os
labels bastam); long break 15 min a cada 4 ciclos (muda o modelo anunciado, sem demanda); migrar
`noteTimes` para backend/sync (sem demanda; localStorage é o padrão do repo); contador no título do
painel (API não documentada; o corpo cobre); "só contar foco, excluir breaks" (decisão de semântica
do dono — vira pergunta na triagem, não quick win).

### Claims do README × código

| README | Promessa | Código | Situação |
|---|---|---|---|
| 3 | "automated report generation" | `267-277`, `410-412` | Parcial: só no STOP ou clique manual |
| 7 | "Standard 25/5 cycles" | `18-19` | Verdade, mas fixo (sem configuração) |
| 8 | "Per-Note Tracking while the timer is running" | `313-351` | Verdade com ressalvas: break conta na nota e há inflação por `lastTick` velho |
| 27 | "timer automatically restores pending data if you reopen the app" | `62-80` × `393-406` | Impreciso: os dados voltam, o **timer não** |
| 28 | "Auto-Reports completed cycles (and if chained)" | `419-426`, `279-286` | Parcial: 2º save manual repete os ciclos |
| 36 | "change `get parentWidget()` to left-pane and base class to NoteContextAwareWidget" | `11-13`, `181-191` | Contraditório: o comentário do código diz que basta o `parentWidget` (e a instância funciona) |
| — | não documentado | `447-452`, `267-290`, `59`, `384-390`, `173` | Destino do relatório, STOP salva+zera, estado em localStorage, botão manual de relatório |

### Pontos fortes (não mexer)

- Wall-clock correto por `sessionEndTime` (`241`, `295`); tick não depende de contagem do intervalo.
- Callback de backend auto-contido com args em array (`447-452`); `api.showError` existe.
- Pausa preserva histórico (`254-265`); restauração de `noteTimes`/ciclos (`62-80`).
- CSS 100% em variáveis do tema (nenhuma cor fixa); classes namespaceadas (`pomo-*`).
- Formato do widget igual ao padrão do repo (`181-185`); zip = repo; sem dependências externas.
- **Bug de formatação real já identificado**: as linhas do relatório usam sintaxe markdown dentro
  de `<tbody>` (`428-442`) — a tabela não renderiza; correção barata no batch.

### Versões/registry/README/artefatos

- Registry `minimalist-pomodoro` **0.8.0** com `sourceUrl` + labels (sem manifest, ok);
  README sem versão; zip `appVersion 0.103.0` com JS idêntico ao repo (`632968db…`).
- `SESSION.md:127` (nota sobre `static get parentWidget()`) **desatualizada** — instância funciona;
  corrigir a nota no próximo toque do SESSION.
- Baseline do runtime: `--button-hover-background-color` inexistente; `bx-*` via `window.glob`;
  `cssBlock` válido (style no widget, reanexado por render).

### Veredito da rodada 6

Widget pequeno e bem comportado no fluxo feliz (wall-clock correto, backend ok, CSS no tema), mas
com um **risco central de perda de dados** no STOP (limpa mesmo em falha) e um **bug de
integridade do relatório** (título sem escape + linhas markdown dentro de `<tbody>`), além de
**inflação do tracking** por `lastTick` restaurado sem validade; a vida útil do widget (reload,
re-render de painel) tem vazamentos (listener/interval) e estado sobrescrito. Acessibilidade e
i18n seguem fora do padrão do toolkit. Nenhuma correção aplicada nesta rodada — batches após
triagem (candidatos: 1) integridade/perda de dados + relatório, 2) a11y/estado/tema + i18n,
3) harness + README/zip).

**Próximo da lista:** Word-Counter (rodada 7 — prioridade do release).

---

## ✅ Correções aplicadas — rodada 6, batches 1-3 (29/09/2026)

### Batch 1 — integridade, perda de dados e relatório

| ID | Correção aplicada | Como foi validado |
|----|-------------------|-------------------|
| C1.1/D5.1 | **STOP condicionado ao sucesso**: `_saveReport()` devolve booleano; `_stop()` só zera a sessão com o relatório salvo (falha mantém os dados e a pendência) | smoke B/E (falha do backend preserva dados, pendência visível, nenhum relatório criado) |
| C4.1 | **Fim da inflação offline**: `lastTick` restaurado é reancorado (`Date.now()`), então tempo com o app fechado não é creditado a nota nenhuma | `test-pomodoro` (guarda estrutural) + smoke B |
| C2.1/QW3-4 | **Relatório corrigido**: linhas viram `<tr><td>` de verdade (era markdown dentro do `<tbody>`), títulos escapados (`escHtml`), id validado; label `#pomodoro`; data de início da sessão (fim do bug de meia-noite); título com data/hora | `test-pomodoro` (7 asserções) + smoke B |
| C4.3 | **Pausa não conta como tempo de nota**: `_finishSession` desancora no break e reancora no foco; `refreshWithNote` ignora o break | `test-pomodoro` (nextSession) + revisão |
| C1.2 | **Restore não sobrescreve estado vivo** no remount (só restaura com `noteTimes` vazio), com merge de ciclos | smoke (re-render) + revisão |
| C5.1 | **Ciclo de vida**: `beforeunload` único por página (`__pomoUnload`), init idempotente (`bootInitialized`), tick via `tickGlobal` no widget atual, DOM só repinta quando o segundo muda e tick de 1 s (fim do `pomo-ticks` 4×/s) | `test-pomodoro` (guardas) + smoke |
| C4.2/C1.6/QW1 | **Recarga retoma a sessão** (`pomo-session-end` futuro religa o timer) e `_updateUI()` roda sempre no boot (fim do 25:00 "mentiroso") | smoke (timerBoot 10:00) + revisão |
| C1.3/D5.4 | **Guarda de reentrada** (`saving`) + botões desabilitados; salvamento manual reancora a nota atual e zera ciclos por relatório | smoke (disabled) + revisão |
| C1.4/C4.9/C4.13 | **Pendência fantasma**: `_pause` só persiste com dados; `parseTrackingData` valida tipos/ids/ms (compatível com `secs` legado) e JSON corrompido avisa e é preservado | `test-pomodoro` + smoke D |
| C1.5/C3.3 | Storage só pelos helpers com try/catch; `_updateUI` não relê o localStorage fora do check da pendência | revisão + smoke |
| C4.4/C4.5 | Salvar no meio não para o tracking (reancora); `cycleCount` zera por relatório | smoke B + revisão |
| C4.7 | Data do relatório usa a **data de início da sessão** (persistida no payload) | `test-pomodoro` + revisão |
| C4.8/C6.1 | `_start` sem nota limpa a âncora; mensagem informa o destino (nota do dia ou nota atual) | smoke B (mensagem "nota do dia") |
| C1.7 | Erro com fallback de mensagem (`(e && e.message) || e`) | `test-pomodoro` (guarda) |

### Batch 2 — a11y, estados, tema e i18n

| ID | Correção aplicada | Como foi validado |
|----|-------------------|-------------------|
| D3.1-D3.5/QW12 | **A11y**: `aria-label` estável nos 3 botões, `role="timer"` com rótulo por minuto, região `role="status" aria-live` para as transições, alvos ≥40 px (44 no mobile), `:focus-visible`, teclado `p`/`s` escopado ao widget | smoke A/C (aria em PT e EN, roles) |
| D5.1/QW9 | STOP em **2 toques** (arma por 4 s com título próprio) e só limpa após salvar | smoke A/B |
| D7.1/D6.1/D6.3 | Hover real (`--hover-item-background-color` com fallbacks), `:active`/`disabled` com opacidade e `prefers-reduced-motion` | revisão + smoke |
| D2.1/D2.4/D2.6/D5.5 | **i18n PT/EN** (30 chaves em paridade, locale do Trilium, datas por idioma), terminologia única (Foco/Pausa, "Encerrar e salvar"), fim do emoji e do título duplicado, indicador de ciclo e anúncio de fase | smoke C (EN) + paridade no `test-pomodoro` |
| D5.3/D5.6/QW7 | Pendência vira `<button>` real, só aparece com dados e tem ação/aviso | smoke B/D |
| D2.5/QW5 | Fim do estado `'...'`; transições anunciadas na live region | smoke + revisão |

### Batch 3 — harness, README e artefatos

| ID | Correção aplicada | Como foi validado |
|----|-------------------|-------------------|
| C8.1/QW14-15 | **`test-pomodoro.js`** (puros: `formatTime`, `nextSession`, relatório com escaping, `parseTrackingData`, 9 guardas estruturais, paridade i18n) e **`test-smoke.js`** (Chrome headless: boot PT/EN, start/stop em 2 toques, estado salvo, pendência corrompida, falha do backend) | `bun test-pomodoro.js` 35 ✅ · `bun test-smoke.js` 30 ✅ |
| C7.4/C7.6/QW19-20 | README reescrito (promessas reais, left-pane, STOP, destino do relatório, testes) e **zip regenerado** (JS sha `cb4fddb6…`, meta `0.106.0`) | sha256 zip = repo |

**Deploy (29/09):** VPS (nota `o6lGc6BE5d9g` "Pomodoro mini") e demo EN (`8a2iAuivWwJE`
"Minimalist Pomodoro and Time Tracker") via ETAPI, **sha256 `cb4fddb6…` idêntico
repo=VPS=demo**; zip regenerado com o mesmo sha.

**Residual:** migrado para o **`ROADMAP-RESIDUAIS.md`** (§ Minimalist Pomodoro): durações
configuráveis (`#pomoWorkMin`/`#pomoBreakMin`), idempotência do `cssBlock` + ids globais,
vínculo para a nota do relatório, prévia do relatório, ícone do relatório, smoke da retomada
após reload e capturas do README.

---

## Rodada 7 — Word-Counter (29/09/2026)

**Escopo:** `Word-Counter/Word count.js` (217 linhas), `README.md`, `Word-counter.zip`;
registry `word-counter`.
**Verificação:** `bun build` (sintaxe) ✅ · **zip defasado**: JS interno `0311e6c9…` (versão de
12/05, sem a meta semanal) × repo `028791b3…` (21/07) · **sem harness de teste** · registry
`0.8.0` com `sourceUrl` + labels (sem manifest, ok) · 3 especialistas (read-only) + conferência
direta dos achados graves.
**Baseline conferido:** `api.dayjs().format('GGGG-WW')` **funciona** no 0.106 (advancedFormat +
isoWeek carregados — não é bug); `getLabelValue` inclui labels herdados; `getNoteComplement()`
está **deprecado** no 0.106 (migrar para `getContent()`); os pesos de contraste da UI foram
medidos nos temas oficiais (light/next-light/dark/next-dark).

### Resumo executivo

| Especialista | Crítica | Alta | Média | Baixa | Sugestão | Total |
|---|---:|---:|---:|---:|---:|---:|
| 👨‍💻 Código | 0 | 4 | 13 | 13 | 4 | 34 |
| 🎨 UI/UX | 1 | 6 | 12 | 7 | 3 | 29 |
| ⚡ Quick wins | — | — | — | — | — | 17 itens |

**Top 5 (triagem sugerida):**
1. **[Alta · C7/D2]** Zip defasado: o README manda importar o zip, que entrega a versão **sem a meta semanal** (`0311e6c9…` × `028791b3…`) — o registry anuncia "daily and weekly goals". Regenerar é a correção mais barata da rodada.
2. **[Alta · C4/D2]** **Semântica do máximo**: abrir uma nota longa credita o tamanho inteiro ao dia (`4222/500` com a nota de 87 palavras na captura); apagar/editar para menos não reduz. **Decisão pendente do dono** (documentar × baseline+delta × só notas editadas).
3. **[Alta · C5]** `entitiesReloadedEvent` **sem `isEnabled()`**: editar/salvar uma nota de **código** com o widget oculto credita as palavras do código no total diário (`99-108`, `110-123`).
4. **[Alta · C5/C4]** **Corrida do `noteId`**: `getNoteComplement()` é aguardado, mas `_trackDaily` lê `this.note.noteId` **depois** do await → palavras da nota A entram na B / UI de B sobrescrita (`113` × `134`/`156`).
5. **[Crítica · D7]** **Barra semanal invisível** em todos os temas: `--accented-background-color` com opacity 0.6 sobre trilho `--main-border-color` mede **1.16–1.93:1** (WCAG pede 3:1); a diária reprova no theme-dark clássico (1.30:1).

**Nota de dedupe:** zip defasado aparece nas três listas (Código 1, UI 7, QW-15/17); semântica do
máximo em Código 2/6, UI 4/17 e QW-11/12; storage/eventos em Código 3-5/11/16 e UI 8/18; i18n em
Código 13, UI 5 e QW-4; barras em Código 27, UI 1/2/12/13 e QW-5.

### 👨‍💻 Código — achados

**Alta**

- **C7.1 · Zip desatualizado** (zip × repo): JS interno de 12/05 (`0311e6c9…`) sem `WEEKLY_GOAL_DEFAULT`/`_trackWeekly`/linha "Semana"; meta `appVersion 0.103.0`. Correção: regenerar do repo. (verificar na instalação)
- **C4.1 · Máximo por nota credita nota pré-existente inteira e nunca reduz** (`137-140`, `159-162`): abrir/tocar uma nota grava o tamanho atual; apagar nota mantém a contribuição. Correção: delta positivo com baseline (`{total,last}`), filtro por `dateModified` de hoje, ou documentar; **decisão de semântica na triagem**.
- **C5.1 · `entitiesReloadedEvent` sem `isEnabled()`** (`99-108`, `110-123`): salvar nota de código credita o conteúdo no total com o widget oculto. Correção: `if (!this.isEnabled()) return;` (ou validar tipo em `_updateNoteCounts`). (verificar em runtime)
- **C5.2/C4.2 · Corrida do `noteId` após o await** (`110-123` × `134`/`156`): troca de nota no meio do fetch credita a nota errada/sobrescreve a UI. Correção: capturar `noteId`/geração antes do await e descartar resultado obsoleto.

**Média**

- **C1.1 · Nota protegida sem sessão exibe 0 em silêncio** (`113-118`; `processContent` devolve `""`): sem aviso e sem recarregar ao desbloquear. Correção: estado "nota protegida" + reagir à sessão protegida. (verificar em runtime)
- **C4.3/C3.1 · localStorage eterno e `setItem` fora do try** (`126`, `139`, `148`, `161`): uma chave por dia/semana para sempre; cota cheia lança e o catch mudo engole, **pulando `_trackWeekly`**. Correção: helpers com try/catch (padrão Pomodoro), poda de chaves antigas, schema versionado.
- **C4.4 · Entidades e `<` cru quebram a contagem** (`18-25`): `<p>&nbsp;</p>` = 1 palavra/6 chars; `foo&nbsp;bar` = 1 palavra; `a < b` = 1 char (a regex engole o resto). Correção: `htmlToText()` com mapa de entidades + parser seguro.
- **C4.5 · `_readGoal` aceita lixo/negativo** (`186-192`): `'500abc'`→500, `'1e3'`→1, `'-100'` passa (percentual negativo). Correção: `Number()` + `Number.isFinite` + clamp `>= 1`/teto.
- **C4.6 · Denominador da meta congelado no 1º render** (`59`, `66` × `173`, `182`): trocar para nota com outro `#dailyGoal` deixa "N/500" com a barra de outro denominador. Correção: spans separados + reagir a recarga de atributos.
- **C5.3 · `_updatePending` global descarta o evento em voo sem trailing** (`16`, `101-107`): o último save só entra no próximo evento/troca; flag compartilhada entre instâncias. Correção: debounce trailing (~150 ms) por instância (é o que o README promete).
- **C6.1 · `getNoteComplement()` deprecado no 0.106** (`113`): funciona hoje, quebra em versão futura. Correção: `await this.note.getContent()`.
- **C7.2 · Sem i18n** (`42`, `57`, `64`, `71`, `75`): "Contagem"/"Hoje/Semana/Palavras/Caracteres" fixos. Correção: `WC_I18N` + `tr()` pelo locale (inclui `widgetTitle`).
- **C8.1 · Sem testes nem funções puras acessíveis** (`18-25`, `217`): extrair `htmlToText`/`countWords`/`countChars`/`parseGoalValue` com marcadores + harness e smoke.
- **C7.3 · README enganoso/defasado** (`3`, `8-11`, `16-18`): falta `#weeklyGoal`; "debounces" falso; "words written" esconde o máximo; "character count" sem critério; aponta o zip defasado.
- **C4.7/C1.2 · Storage sem validação de forma** (`128-132`, `142`, `197-202`): array perde contribuições; valor não numérico vira `NaN` na tela (`NaN%`). Correção: validar objeto + `Number.isFinite`.
- **C4.8/C5.4 · Edição em split não ativo não é contada** (`100`): só a nota ativa; palavras de outro painel entram só quando a nota vira ativa (e nunca se o app fechar antes). Evolução: registrar por nota com o delta (liga ao C4.1).

**Baixa**

- **C1.3 · `_trackDaily`/`_trackWeekly` usam `this.note.noteId` sem guarda** (`134`, `156`): `TypeError` cai no catch mudo se a nota sumir no await.
- **C1.4 · Catch mudo mantém valores antigos/"—"** (`120-122`): sem `console.warn`, sem estado de erro.
- **C4.9 · Virada do dia com o app aberto não re-renderiza** (`126`, `195`): "Hoje" mostra ontem até a próxima troca/save. Correção: `visibilitychange`/timer.
- **C4.10 · Semana ISO não anunciada** (`148`, `206`): troca na segunda (`2027-01-01` → `2026-53`, verificado); a UI só diz "Semana". Documentar/exibir intervalo.
- **C4.11 · `countChars` conta entidades e unidades UTF-16 e não documenta "sem espaços"** (`23-25`).
- **C4.12 · Ruído na contagem** (`18-21`): pontuação isolada conta palavra; CJK = 1; conteúdo de `<style>/<script>` conta.
- **C7.4 · Namespace curto sem versão** (`126`, `148`): `wc-`/`wcw-` no origin do app; sem migração.
- **C7.5 · Lógica de storage duplicada 4×** (`128-132` ≈ `150-154` ≈ `197-201` ≈ `208-212`): helpers `readStore/sumStore/writeStore`.
- **C7.6 · Versões desalinhadas** (header "v0.102+"; registry 0.8.0; zip 0.103.0; README sem versão).
- **C7.7 · Barras sem ARIA e sem reduced-motion** (`30`, `32`, `62`, `69`).
- **C7.8 · CSS com ids globais e token de fundo como preenchimento** (`28-35`).
- **C5.5 · Corrida read-modify-write entre janelas** (`128-139`): última gravação ganha; documentar.
- **C6.2 · `isEnabled()` redundante e doc do `SESSION.md:127` desatualizada** (`40-41`, `45`; nota do `static` já corrigida na rodada 6).
- **C7.9 · `position = 1`** (`40`): único no toolkit (GC=2, Pomodoro/DNN/Canvas=100, Shared=200); documentar slot.

**Sugestão**

- **C7.10 · Registry × zip × manifest** (registry 137-147): decidir entre manifest ou remover o zip do README.
- **C4.13/C7.11 · Meta global vs. da nota ativa** (`186-192`): label na nota do widget ou em opções daria meta estável; documentar o atual (inclui herdados).
- **C2.1 · Superfície limpa** (markup estático, `.text()`, `parseInt`): manter com o validador de forma (C4.7).
- **C3.2 · Sem poda de notas apagadas** (`134-140`, `156-162`): total inflado permanentemente.

### 🎨 UI/UX — achados

**Crítica**

- **D7.1 · Barra semanal invisível** (`32`; trilho `29`/`31`): fill `--accented-background-color` + opacity 0.6 sobre `--main-border-color` = **1.27:1 (light), 1.16:1 (next-light), 1.93:1 (dark), 1.17:1 (next-dark)**. Correção: token de primeiro plano como a diária, sem opacity, ≥3:1. (verificar em runtime)

**Alta**

- **D3.1 · Progresso sem semântica** (`62`, `69`): sem `role="progressbar"`/`aria-valuenow/min/max`/label; WCAG 4.1.2. Correção: ARIA completo com `aria-valuetext` acima de 100%.
- **D5.1 · Meta atingida sem feedback** (`172`, `181`): 100% e 844% renderizam igual. Correção: estado `wc-goal-hit` + texto/✓ + anúncio único.
- **D2.1 · "Hoje/Semana" não são "palavras escritas"** (`137-143`, `159-164`; README 9): máximo por nota; captura 4222/500 com nota de 87. Correção: decidir semântica (ver C4.1) + rotular honestamente.
- **D2.2 · i18n ausente** (`42`, `57`, `64`, `71`, `75`): PT fixo no demo EN. Correção: `tr()` por locale.
- **D5.2 · Erro engolido deixa "—"/valores velhos** (`110-122`). Correção: estado de erro discreto + retry.
- **D2.3 · README/captura/zip sem a linha "Semana" e sem `#weeklyGoal`** (README 3/8-11/18/26; zip): instalação pelo zip entrega UI diferente da documentada. (raiz também em C7.1/C7.3)

**Média**

- **D5.3 · Troca de nota sem estado de carga** (`94-97`, `110-118`): mantém números da nota anterior; usar "…"/skeleton + `aria-busy`.
- **D3.2 · Atualizações não anunciadas; valor × barra sem associação** (`54-77`, `117-118`): `role="status"` nos contadores + `aria-label` referenciando o texto.
- **D1.1 · Hierarquia plana: metas globais × contadores da nota misturados** (`55-77`): a captura precisou de overlay explicativo. Correção: agrupar/rotular "nesta nota".
- **D1.2 · Título "Contagem" vago e PT** (`42`): "Contador de Palavras"/"Word Count".
- **D7.2 · Trilho reprova 3:1 e parece divisor** (`29`, `31`): 1.38–1.61:1 nos temas claros.
- **D7.3 · Barra diária reprova no theme-dark clássico** (`30`): `--main-text-color` 0.7 sobre trilho = 1.30:1.
- **D6.1 · `transition: width` sem reduced-motion** (`30`, `32`).
- **D8.1 · Números sem separador de milhar/locale/unidade** (`59`, `66`, `173`, `182`): "4222/500" sem "palavras".
- **D2.4 · "Caracteres" exclui espaços sem explicar** (`23-25`; README 7).
- **D5.4 · Meta lida só da nota ativa; a barra "salta" ao navegar** (`51-52`, `186-192`): tooltip indicando a origem.
- **D5.5 · Evento descartado durante update** (`16`, `99-108`): defasagem silenciosa; reexecução final. (raiz em C5.3)
- **D4.1 · `.wc-row` sem `gap`/`min-width:0`/`nowrap`** (`33-35`): risco de quebra em painel estreito.

**Baixa**

- **D1.3 · Barras de 5px com margens assimétricas** (`29-32`).
- **D5.6 · Meta inválida sem validação visível** (`186-192`). (raiz em C4.5)
- **D5.7 · "—" inicial sem skeleton/alternativa textual** (`72`, `76`).
- **D2.5 · CSS por ids em vez de classes escopadas** (`28-35`, `54-77`).
- **D6.2 · Animar `width` gera reflow** (`30`, `32`): `transform: scaleX()`.
- **D2.6 · README EN × UI PT; sem versão** (README 1-26).
- **D2.7 · "Semana" ISO sem definição na UI** (`148`).
- **D5.8 · Affordance "?" explicando a metodologia** (regras não documentadas na UI).

**Sugestão**

- **D6.3 · Pulso de "meta atingida"** (`172-183`) com reduced-motion.
- **D7.4 · Fallback nos tokens de tema** (`28-32`).
- **D2.8 · Tooltip "como contamos"** (unidade + semântica + origem da meta).

### ⚡ Quick wins — backlog

| # | Melhoria | Onde | Ganho | Esforço | Risco | Validação |
|---|----------|------|-------|:-------:|:-----:|-----------|
| 1 | Contagem com entidades HTML (`htmlToText` puro) | `18-25` | Fim de `&nbsp;`=palavra e `a < b`=1 char | S/M | Baixo | fixtures CKEditor no harness |
| 2 | Falha de leitura visível (fim do catch mudo) | `110-123` | UI não "mente" | S | Baixo | smoke com rejeição |
| 3 | Estado "meta atingida" (texto/cor + anúncio único) | `168-184` | Fecha o ciclo da meta | S | Baixo | pura `isGoalReached` + smoke |
| 4 | i18n PT/EN pelo `locale` | `42`, `57-75` | Demo EN e paridade | M | Baixo/Médio | paridade + smoke EN |
| 5 | Barras `role=progressbar`/`aria-*` + reduced-motion | `30-32`, `62`, `69` | A11y do dado central | S | Baixo | smoke com atributos |
| 6 | Guard com reexecução final (debounce trailing) | `16`, `99-108` | Fim do evento perdido | S | Baixo | smoke com 2 eventos |
| 7 | Rollover dia/semana ao voltar o foco | `126`, `148` | "Hoje" não fica velho | S | Baixo/Médio | smoke com dayjs fake |
| 8 | Tooltip com detalhes (notas, critério, origem da meta) | `125-145`, `194-214` | Explica o número | S | Baixo | asserção de `title` |
| 9 | Validação/clamp da meta | `186-192` | Fim de `-100`/`500abc` | S | Baixo | puras com casos |
| 10 | Critério de caracteres explícito ("sem espaços" + com espaços) | `23-25`, `75-76` | Fim da desconfiança | S | Baixo | puras com `&nbsp;` |
| 11 | Documentar a semântica no rótulo/tooltip | `125-145` | Honestidade do número | S | Baixo | revisão |
| 12 | Semântica baseline/delta (decisão pendente) | `125-145` | "Escrito hoje" de verdade | M | Médio | `progressUpdate` pura |
| 13 | Harness `test-wordcount.js` | plugin | Rede de proteção | S/M | Baixo | `bun` |
| 14 | Smoke `test-smoke.js` do `doRenderBody` | plugin | Pega regressão de render | M | Baixo | Chrome headless |
| 15 | Zip regenerado do repo | zip | Instalação correta | S | Baixo | sha256 |
| 16 | Higiene de release (versão/captura/labels) | registry/README/imagens | Consistência | S | Baixo | revisão |
| 17 | README fiel ao código | README | Doc confiável | S | Baixo | revisão |

**Descartes explícitos:** contagem da seleção (exige ler o CKEditor; L sem demanda); contador na lista de notas (sem API pública); botão "copiar contagem" (ruído minimalista); exportar histórico CSV/JSON (sem demanda); `aria-live` a cada N palavras / streaks (spam de leitor de tela — o anúncio único da meta basta); trocar ids por classes (churn; os ids já são namespaceados).

### Claims do README × código

| README | Promessa | Código | Situação |
|---|---|---|---|
| 3 | "daily progress bar" | `48-91` | Incompleto: existe barra/meta **semanal** (`64-69`) |
| 7 | "Live Counting" | `94-123` | Verdade com staleness (QW-6) |
| 8 | "`#dailyGoal` … default 500" | `51-52`, `186-192` | Verdade; `#weeklyGoal` (3500) não é documentado |
| 9 | "Tracks **words written** across all notes" | `125-145` | **Não cumprido**: máximo por nota; abrir nota longa credita o total |
| 10 | "monochromatic progress bar" | `27-36` | Duas barras; a semanal é quase invisível (D7.1) |
| 11 | "debounces on content save" | `16`, `99-108` | **Não cumprido**: guard de reentrância descarta eventos |
| 16 | "Paste the code or import the `.zip`" | zip | **Não cumprido**: zip v0.102 sem Semana |
| 18 | "Add `#dailyGoal=N` … to any text note" | `186-192` | Impreciso: vale a nota ativa (com herdados) |
| 26 | captura | UI | Antiga (sem a linha "Semana") |

### Pontos fortes (não mexer)

- Paleta 100% em tokens do tema (sem hardcode; o problema é a escolha de token/opacidade).
- `tabular-nums` nos valores; contraste dos textos passa AA (valor 21:1 no claro; labels 5.7:1+).
- `isEnabled()` restringe a notas de texto; `try/catch` em todas as leituras/parse de storage.
- Markup estático + `.text()` (sem vetor de XSS); `GGGG-WW` válido no 0.106; demo já roda o sha do repo.

### Veredito da rodada 7

Widget pequeno e correto no básico, mas com **um artefato de release quebrado** (zip sem a meta
semanal — a rota de instalação do README), **contagem imprecisa** com entidades HTML, **eventos
creditando nota errada** (código oculto e corrida do `noteId`) e **semântica de "escrito hoje"
enganosa** (máximo por nota) — esta última precisa de decisão do dono antes do batch de correção.
A UI tem uma **crítica de contraste** (barra semanal) e dívidas de a11y/i18n/feedback já
padronizadas nas rodadas anteriores. Nenhuma correção aplicada nesta rodada — batches após
triagem (candidatos: 1) integridade da contagem + eventos + storage, 2) UI/a11y/estado + i18n +
decisão da semântica, 3) harness + README/zip).

**Próximo da lista:** Daily-Note-Navigator (rodada 8 — prioridade do release).

---

## ✅ Correções aplicadas — rodada 7, batches 1-3 (29/09/2026)

### Batch 1 — integridade da contagem, eventos e storage

| ID | Correção aplicada | Como foi validado |
|----|-------------------|-------------------|
| C4.4/QW1 | **Contagem correta**: `htmlToText` decodifica entidades (`&nbsp;` não é palavra nem 6 caracteres), preserva `a < b`, ignora `script/style`; palavras exigem letra/dígito (`— • |` não contam) | `test-wordcount` (fixtures) + smoke |
| C4.1/QW12 | **Semântica baseline + delta por nota** (decisão do Ricardo): a 1ª leitura do período só define a baseline; só o crescimento conta; reduzir reancora sem débito; **migração** do formato antigo preserva o total | puras `progressApply/parseProgressStore` + smoke A/B/E |
| C5.1 | `entitiesReloadedEvent` com **`isEnabled()`** (nota de código não é contada com o widget oculto) | guarda estrutural + smoke |
| C5.2/C4.2 | `noteId` + geração capturados **antes do await**; resultado obsoleto é descartado (fim da nota errada) | guarda + smoke |
| C1.5/C3.1/C4.7/QW15 | Storage só por helpers com try/catch; **payload v2 validado**, migração legada e **poda automática** (14 dias / 8 semanas); `setItem` protegido | puras (parse/prune) + smoke E |
| C6.1 | `getNoteComplement()` (deprecado) → `await this.note.getContent()` | guarda estrutural |
| C4.5/QW9 | `parseGoalValue` puro (`Number`/finite/clamp 1..GOAL_MAX) nos 3 pontos de leitura | puras + smoke B |
| C4.6 | Denominadores das metas em **spans próprios**, atualizados a cada render | smoke B |
| C5.3/QW6 | **Debounce trailing** (~150 ms) por instância no evento de conteúdo (fim do evento descartado) | smoke A (coalesce) |
| C4.9/QW7 | Rollover de dia/semana no `visibilitychange`/`focus` (hook único por página) | revisão (sem teste dedicado) |
| C1.1/C1.4 | Nota **protegida** avisa; falha de leitura vira **estado com retry** clicável (fim do catch mudo) | smoke D |

### Batch 2 — UI, a11y, estados e i18n

| ID | Correção aplicada | Como foi validado |
|----|-------------------|-------------------|
| D7.1/D7.2/D7.3 | **Contraste das barras**: fill `--main-text-color` sem opacity (a semanal era invisível: 1.16–1.93:1) e trilho `color-mix` com fallback — ≥3:1 nos temas | guarda estrutural + QA visual |
| D3.1/D3.2/QW5 | Barras com `role="progressbar"` + `aria-valuenow/max/valuetext`; região `role="status"` para anúncios | smoke A/B |
| D5.1/QW3 | **Meta atingida**: ✓ + cor de destaque + `aria-valuetext` + anúncio único por período | smoke B |
| D2.1/D2.2/D2.3/QW4/17 | **i18n PT/EN** (14 chaves em paridade), números por locale, título "Contador de Palavras"/"Word Counter", "Nesta nota" | smoke C + paridade no harness |
| D8.1/QW8 | Valores com separador de milhar por locale; tooltips com critério de caracteres (com/sem espaços) e nº de notas contadas | smoke C |
| D5.2-D5.7 | Estados: "…" inicial, erro com retry, protegida, aviso de meta, `title` explicativos | smoke D |
| D4.1/D1.3/D6.1/D6.2 | `.wc-row` com `gap`/`min-width:0`/`nowrap`; barras 6 px com margens unificadas; `prefers-reduced-motion`; estilos por classes escopadas | revisão |

### Batch 3 — harness, README e artefatos

| ID | Correção aplicada | Como foi validado |
|----|-------------------|-------------------|
| C8.1/QW13/QW14 | **`test-wordcount.js`** (53 asserções: entidades, palavras/chars, metas, baseline+delta, parse/migração/poda, guardas, paridade i18n) e **`test-smoke.js`** (24 checks: boot PT/EN, delta/debounce, meta, erro/retry/protegida, migração legada) | `bun test-wordcount.js` 53 ✅ · `bun test-smoke.js` 24 ✅ |
| C7.1/C7.3/QW15-17 | **Zip regenerado** (JS `ae638dea…`, meta `0.106.0` — o antigo era de 12/05 e não tinha a meta semanal) e README reescrito (semanal, semântica, critérios, testes, limitações) | sha256 zip = repo |

**Deploy (29/09):** VPS (nota `SpCiIhPakals` "Word count") e demo EN (`7z4UojsgHVCc`
"Word Counter") via ETAPI, **sha256 `ae638dea…` idêntico repo=VPS=demo**; zip regenerado com o
mesmo sha (o demo já rodava o sha antigo do repo; agora ambos estão na versão corrigida).

**Residual:** migrado para o **`ROADMAP-RESIDUAIS.md`** (§ Word Counter): corrida entre janelas,
edição em split não ativo, slot `position`, tooltip da origem da meta, intervalo ISO na UI,
QA visual de contraste, captura do README e bump de release.
