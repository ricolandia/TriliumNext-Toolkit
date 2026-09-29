# Auditoria por Especialistas — TriliumNext Toolkit

Este arquivo define os perfis dos especialistas que avaliam os plugins do
TriliumNext-Toolkit, seus critérios, e o resultado de cada rodada. **Uma rodada
por plugin** (o próximo da lista fica anotado abaixo). Método: leitura do código
com evidência (`arquivo:linha`), harness estático (`bun test-*.js`,
`bun build` para sintaxe, greps de padrões) e conferência humana dos achados de
maior severidade. **Nenhuma correção é feita durante a auditoria** — os fixes
saem em rodada própria, após triagem do dono.

**Fluxo dos residuais:** o que não entra nos batches de correção de cada rodada é
migrado para o **`ROADMAP-RESIDUAIS.md`**. A execução do roadmap acontece **depois
da rodada 16** (todos os plugins auditados), com uma triagem única de prioridade.

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

### 🔁 Fila proposta (ajustável)

~~2. Writers-Tools (Fountain + Longform)~~ ✅ 29/09 · **3. Canvas-Note-Tools
(próximo)** · 4. Shared-Notes · 5. AI-Chat · 6. Daily-Note-Map · 7.
Knowledge-Dashboard · 8. Attribute-GC · 9. Pomodoro · 10. Word-Counter · 11.
Daily-Note-Navigator · 12. UI-Tweaks · 13. Kanboard · 14. Mastodon · 15.
Canvas-Template-Loader · 16. Canvas-Templates.

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
