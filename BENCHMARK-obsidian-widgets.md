# BENCHMARK — Obsidian (referência) × widgets do TriliumNext-Toolkit

> Trilha B do briefing `Estudo_REA_ ideias/BRIEFING-sessao-trilium-toolkit.md`.
> **Documento de estudo** — não toca código nem deploy. Alimentado pela **Fase 0.5** de cada rodada
> de auditoria (referência just-in-time) e fechado antes da **triagem única pós-rodada-15**.
> Método: **Plano B — sem REA** (nada de `asar`/engenharia reversa). Fontes: READMEs de repo, docs
> publicadas e `package.json`/`LICENSE` reais.

## Como ler

Cada widget tem: **o que a referência faz melhor · o que temos · lacuna · evidência · esforço ·
prioridade · licença**. Evidência = `arquivo:linha` no **nosso** widget; quando é o plugin do
Obsidian, cito repo + arquivo/doc (linha instável em doc publicado é sinalizada). **Regra 2/3 do
briefing:** portar **ideia, não código**; nunca copiar UI/ícones/arte.

## Mapa de licenças (regra 2 do briefing)

| Referência | Licença | O que é permitido portar |
|---|---|---|
| `obsidian-kanban` (mgmeyers → `community-archive`) | **MIT** (`package.json:license`) | Poderia portar código com atribuição — mas a regra é **ideia, não código**. |
| `obsidian-tasks` (obsidian-tasks-group) | **MIT** (arquivo `LICENSE`) | Idem. |
| Demais candidatos (Longform, Dataview, Advanced Canvas, Style Settings…) | ver `Trilium-plugin-manager/BENCHMARK-obsidian.md` §Mapa de licenças | ⚠️ Style Settings é GPL-3.0 (copyleft) — só ideias. |

**Transversal:** copiar UI/ícones/arte é proibido em qualquer caso.

## Fila de widgets (referências a confirmar na rodada de cada um)

| Nosso widget | Rodada | Plugins do Obsidian a investigar | Status |
|---|---|---|:--:|
| Kanboard-Integration | 12 | **Kanban** (mgmeyers), Tasks | ✅ abaixo |
| Mastodon-Sender | 13 | plugins de Mastodon/social | pendente |
| Canvas-Template-Loader | 14 | **Advanced Canvas**, Templater (canvas) | pendente |
| Canvas-Templates | 15 | **Advanced Canvas**, Excalidraw | pendente |
| Knowledge-Debt-Dashboard | 9 | Dataview + bases de dados | pendente (retroativo) |
| UI-Tweaks | 11 | Style Settings, snippets de CSS | pendente (retroativo) |
| Attribute-Garbage-Collector | 10 | Janitor, Note Refactor | pendente (retroativo) |
| *(demais rodadas 1-8 conforme tabela do briefing)* | | | pendente |

---

## Kanboard-Integration × Obsidian Kanban + Tasks (Fase 0.5 da rodada 12, 14/10/2026)

**Referências:** `mgmeyers/obsidian-kanban` (hoje `community-archive/obsidian-kanban`, v2.0.51,
**MIT**, mantenedor buscando sucessor) e `obsidian-tasks-group/obsidian-tasks` (**MIT**). Fontes:
`README.md` dos repos, `docs/How do I/` (7 páginas) e guia publicado do Tasks. **Confiança: alta**
nas features (docs oficiais), **alta** nas licenças (`package.json`/`LICENSE`).

**Diferença de fundação (limite honesto):** o Kanban/Tasks do Obsidian é **local-first** — o board é
um arquivo markdown no vault, cards são itens de lista, e a "verdade" mora no cofre. Nosso widget é
**remoto-first**: a verdade é um **Kanboard externo** (JSON-RPC), e o Trilium é um cliente. Nada de
arquitetura é portável; só feature/UX/semântica.

| Eixo | Referência (Kanban / Tasks) | O que temos (nosso) | Lacuna | Evidência (nosso) | Esforço | Prio |
|---|---|---|---|---|:--:|:--:|
| Mover card | **arrastar-e-soltar** entre colunas/raias + reordenar | `<select>` por linha; `moveTaskPosition` com `position:1` | sem DnD; sempre ao **topo** | `207-213`, `944-972`, `834` | L | P2 |
| Estrutura | *swimlanes*, **WIP limits**, arquivo de cards, ordenação de raia | 1 raia fixa (`swimlane_id:0`), sem WIP/arquivo | Kanboard **já tem** raias/WIP — não expomos | `212` | M | P2 |
| Metadados do card | datas/horas, imagens, "criar nota a partir do card", checkboxes (progresso) | título, descrição (curta), cor | Kanboard tem due date/assignee/priority/tags — não surfacados | `174-180`, `824-851` | M | P2 |
| Consulta/filtro | linguagem completa (`not done`, `due before tomorrow`, `group/sort/limit`) | filtro por projeto + busca textual | sem query/datas/prioridade | `806-810` | M | P3 |
| Offline | 100% local (o board é o arquivo) | fila offline só p/ `createProject` | move/delete/create-task não enfileiram | `1050`, `1137` | M | P2 |
| A11y/i18n | teclado, traduções | sem `:focus-visible`, sem i18n | — | rodada 12 (D3.4/C7.1) | M | P1¹ |

¹ P1 porque é **batch** da rodada 12 (ortogonal à referência), não feature nova.

**Veredito da Fase 0.5:** nenhuma decisão de **correção** da rodada 12 muda (robustez, `confirm`,
a11y, i18n e harness são ortogonais ao produto). A referência **confirma** que o diferencial dela
(DnD / raias / WIP / query / metadados) é trabalho de **produto** → candidatos da triagem pós-15, não
de batch.

---
*Em construção — cada rodada de auditoria acrescenta a seção do seu widget via Fase 0.5.*
