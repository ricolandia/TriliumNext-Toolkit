# Roadmap de Residuais — TriliumNext Toolkit

Residuais das rodadas de auditoria por especialistas (`AUDITORIA-ESPECIALISTAS.md`).
**Regra:** durante as rodadas (3 a 16) só os achados de alto valor viram batch de
correção; o que ficar de fora é migrado para cá. A execução deste roadmap acontece
**depois da rodada 16** (todos os plugins auditados), com uma **triagem única** de
prioridade.

- **Estado:** 🔲 a fazer (nada executado ainda — o roadmap começa a ser pago só na volta).
- **Ordem sugerida na volta:** integridade > UX > manutenção; agrupar por plugin
  (1 deploy por plugin, com testes + smoke, padrão dos batches das rodadas 1-2).
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

| ID | Item | Plugin | Categoria | Esforço | Risco | Onde (ocasião do relatório) | Validação |
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

## Como executar na volta (após a rodada 16)

1. **Triagem única:** revalidar cada item no código atual (linhas/relevância mudaram),
   descartar o que perdeu sentido e confirmar esforço/risco com o dono.
2. **Lotes por plugin**, na ordem integridade > UX > manutenção; cada lote com testes
   (`bun`), `bun build`, smoke de runtime quando for plugin de render, e atualização
   do README.
3. **Deploy** (ETAPI VPS + demo, sha256 idêntico, zips regerados) só quando o plugin
   entrar em release; marcar o item como ✅ aqui e registrar no `SESSION.md`.

## Histórico

- **29/09/2026** — criado com os residuais das rodadas 1 (Weekly Planner) e 2
  (Writers-Tools); regra de execução pós-rodada 16 registrada no método do
  `AUDITORIA-ESPECIALISTAS.md`.
