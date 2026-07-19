# SESSION.md — TriliumNext Plugins & Tools Collection

Este arquivo é carregado automaticamente pelo `opencode.jsonc`.
Contém o setup do projeto, plugin listing, padrões de código, e histórico de decisões.

---

## Stack

| Componente | Tecnologia |
|---|---|
| Plataforma | TriliumNext (fork do Trilium Notes) |
| Scripting | JavaScript (vanilla, sem bundler) |
| Widgets | `api.RightPanelWidget`, `api.NoteContextAwareWidget` |
| Render Notes | `~renderNote` → JS Frontend |
| CSS | Trilium CSS variables (`--main-text-color`, `--accented-background-color`, etc.) |
| UI | jQuery (`$()`, `.on()`, `.css()`, `.append()`) |
| Backend | `api.runOnBackend(callback, [args])` |
| Repositório | GitHub: `ricolandia/TriliumNext-Toolkit` |

---

## Plugins

### Productivity & Workflow
| Plugin | Tipo | Descrição |
|--------|------|-----------|
| **Weekly Planner** | Render Note | Drag-and-drop task board + global open tasks panel |
| **Daily Note Navigator** | Widget (`NoteContextAwareWidget`) | Navegação por diário com setas, cache, salto mensal |
| **Pomodoro** | Widget (`RightPanelWidget`) | Timer + time tracking por nota |
| **Kanboard Sync** | Render Note | Integração bidirecional com Kanboard |
| **Mastodon Sender** | Render Note | Postar toots diretamente do Trilium |

### Canvas
| Plugin | Tipo | Descrição |
|--------|------|-----------|
| **Canvas Note Tools** | Widget | Barra flutuante para inserir cards no canvas |
| **Canvas Template Loader** | Widget | Inserir templates Excalidraw |
| **Canvas Templates** | Content Pack | 9 templates pré-prontos (OKR, GTD, etc.) |

### Writing & Creative
| Plugin | Tipo | Descrição |
|--------|------|-----------|
| **Word Counter** | Widget | Contagem de palavras + meta diário |
| **Writers Tools** | Render Note | Longform Grid + Fountain Screenplay |
| **AI Chat** | Render Note | Chat com OpenRouter, RAG, geração de diagramas |

### UI
| Plugin | Tipo | Descrição |
|--------|------|-----------|
| **UI Tweaks** | CSS + JS | CSS polish + attribute pills |

### Maintenance
| Plugin | Tipo | Descrição |
|--------|------|-----------|
| **Attribute GC** | Widget / Render Note | Limpeza de atributos quebrados/duplicados |
| **Knowledge Dashboard** | Render Note | Auditoria de saúde do PKM + PDFs + Consulta Livre |

### Collaboration
| Plugin | Tipo | Descrição |
|--------|------|-----------|
| **Shared Notes P2P** | Widget + Backend | Compartilhamento de notas P2P |

### External Scripts
| Script | O que faz | Dep |
|--------|-----------|-----|
| `trilium_backup_incremental.py` | Backup via ETAPI | `requests` |

---

## Padrões de Código (IMPORTANTE para sessões futuras)

### `api.runOnBackend` — como passar argumentos

**CORRETO** (sempre usar array):
```javascript
api.runOnBackend((param1, param2) => {
    // backend code
}, [arg1, arg2]);
//           ^^^^^^^^^^  sempre array
```

**ERRADO** (causa `e.map is not a function`):
```javascript
api.runOnBackend((param1) => {...}, arg1);
//                                   ^^^^ sem array = ERRO
```

**SEM argumentos** (funciona):
```javascript
api.runOnBackend(() => {
    // sem parâmetros
});
```

### CSS

- **USAR classes** no `KD_CSS` (stylesheet estático com `injectKDStyles()`)
- **EVITAR** `.css({prop: val})` inline — só usar para valores DINÂMICOS (cores, larguras)
- Classes disponíveis: `.kd-root`, `.kd-header`, `.kd-btn`, `.kd-tab`, `.kd-stat-card`, `.kd-row`, `.kd-td`, `.kd-td-muted`, `.kd-td-num`, `.kd-input`, `.kd-qb-*`, `.kd-log-*`

### Widget Patterns

**RightPanelWidget** (sempre visível):
```javascript
class MyWidget extends api.RightPanelWidget {
    get position() { return 200; }
    static get parentWidget() { return 'right-pane'; }
    get widgetTitle() { return 'Title'; }
    isEnabled() { return true; }
    doRenderBody() { this.$body = $(this.body); ... }
}
```

**NoteContextAwareWidget** (só aparece em certos tipos de nota):
```javascript
class MyWidget extends api.NoteContextAwareWidget {
    static get parentWidget() { return 'right-pane'; }
    isEnabled() { return api.currentNote && api.currentNote.type === 'text'; }
    doRenderBody() { ... }
    refreshWithNote(note) { ... }
}
```

### Observações

- **`static get parentWidget()`** — precisa ser STATIC, não getter normal
- **`doRender()` vs `doRenderBody()`** — o framework chama ambos. Use `doRenderBody()` para o conteúdo, ou sobrescreva `doRender()` se precisar de controle total.
- Template literais no SQL funcionam dentro de `runOnBackend(() => { const sql = \`...\`; })` porque a função é serializada como string.

---

## Histórico de Decisões Recentes (v0.7.1)

| Data | Decisão | Motivo |
|------|---------|--------|
| Jul/2026 | CSS refactor: inline → stylesheet estático | Manutenibilidade, performance, pseudo-classes (:hover, :nth-child) |
| Jul/2026 | `NOT_SYSTEM` usa `LIKE '\\_%' ESCAPE '\\'` | `GLOB '_*'` não funciona corretamente no SQLite |
| Jul/2026 | Adicionar `isProtected = 0`, `#archived`, type whitelist | Evitar notas criptografadas/sistema nos scans |
| Jul/2026 | Remover abas de imagens + compressão | Simplificação, escopo focado em documentos |
| Jul/2026 | `runQuery` com SQL montada no frontend + eval() | `runOnBackend` não aceita argumentos separados |
| Jul/2026 | `openTabWithNote` em vez de `activateNote` | Evitar scrollIntoView errors no note_tree |
| Jul/2026 | Créditos para ecodiv/Trilium_scripts | Ética open-source, ideias de NOT_SYSTEM e filtros |

---

## Scripts Globais

Scripts reutilizáveis estão em:
```
/home/ricardo/Documentos/50_Criativo/Scripts_PY_/
```
Listagem completa no `AGENTS.md` (carregado automaticamente pelo opencode global).

Principais destaques:
- `llm_client.py` — LLM client genérico (DeepSeek/OpenRouter)
- `sqlite_helper.py` — SQLite connection helper
- `trilium_backup_incremental.py` — Backup incremental TriliumNext (cópia do toolkit)
- `gsc_client.py` — Google Search Console API
- WordPress helpers: `wp_api.py`, `wp_plugin.py`, `wp_content.py`

---

## Dell TitanRender (Render PC)

```bash
ssh ricardo@100.69.82.99
# senha: 12345
```

Serviços: ComfyUI (:8188), Ollama (:11434), VNC (:5900), Chatterbox (:7860)
