// ============================================================
// LONGFORM COMPILER (GRID) — TriliumNext Notes
// Estrutura esperada:
//   📄 Compilador (esta nota — tipo renderNote)
//     ├── 🧩 js - grade (nota de script — ignorada)
//     └── 📝 Notas de conteúdo (viram cards, arrastáveis)
//
// O documento compilado é criado/atualizado como filha desta
// nota com o label #compiledDoc e NÃO aparece no grid.
// ============================================================

const dashboardNote = api.originEntity;

const CSS = `
  /* Tudo escopado em #lg-root e com classes próprias (lg-*): este CSS não pode
     afetar o app, mesmo que o Trilium não envolva o estilo em @scope */
  #lg-root, #lg-root * { box-sizing: border-box; }

  #lg-root .lg-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    padding: 15px 20px;
    border-bottom: 1px solid var(--main-border-color);
  }
  #lg-root .lg-info { font-family: monospace; font-size: 12px; opacity: 0.6; }
  #lg-root .lg-actions { display: flex; gap: 8px; }

  #lg-root .lg-btn {
    background: var(--button-background-color);
    color: var(--button-text-color);
    border: 1px solid var(--main-border-color);
    padding: 10px 18px;
    border-radius: 6px;
    cursor: pointer;
    font-weight: bold;
    transition: filter 0.15s;
  }
  #lg-root .lg-btn:hover { filter: brightness(1.1); }
  #lg-root .lg-btn:disabled { opacity: 0.6; cursor: default; }
  #lg-root .lg-btn-sec { font-weight: normal; opacity: 0.85; }

  #lg-root .lg-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 20px;
    padding: 20px;
    min-height: 120px;
    border-radius: 8px;
    transition: background 0.15s, box-shadow 0.15s;
  }
  #lg-root .lg-grid.lg-over {
    background: var(--hover-item-background-color, rgba(128,128,128,0.08));
    box-shadow: inset 0 0 0 2px var(--active-item-background-color);
  }

  #lg-root .lg-card {
    background: var(--main-background-color);
    border: 1px solid var(--main-border-color);
    border-radius: 8px;
    padding: 15px;
    cursor: grab;
    transition: opacity 0.15s, border-color 0.15s;
  }
  #lg-root .lg-card:active { cursor: grabbing; }
  #lg-root .lg-card.lg-dragging { opacity: 0.5; }
  #lg-root .lg-card.lg-drop { border: 2px dashed var(--active-item-background-color); }

  #lg-root .lg-card h3 { margin-top: 0; font-size: 16px; overflow-wrap: anywhere; }
  #lg-root .lg-card p  { font-size: 13px; opacity: 0.8; margin-bottom: 8px; overflow-wrap: anywhere; }
  #lg-root .lg-footer { font-family: monospace; font-size: 11px; opacity: 0.55; }

  #lg-root .lg-empty {
    grid-column: 1 / -1;
    padding: 40px 20px;
    text-align: center;
    font-family: monospace;
    font-size: 13px;
    opacity: 0.55;
    line-height: 1.8;
  }

  /* ── Mobile / telas estreitas ── */
  @media (max-width: 600px) {
    #lg-root .lg-header { padding: 12px; gap: 8px; }
    #lg-root .lg-info { font-size: 11px; }
    #lg-root .lg-actions { width: 100%; gap: 6px; }
    #lg-root .lg-btn { flex: 1; padding: 9px 8px; font-size: 13px; }
    #lg-root .lg-grid { padding: 12px; gap: 12px; grid-template-columns: 1fr; }
    #lg-root .lg-card { padding: 12px; }
  }
`;


// ── HELPERS ───────────────────────────────────────────────────────────────────

function escaparHtml(texto) {
    return String(texto == null ? '' : texto)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function contarPalavras(texto) {
    const limpo = String(texto || '').trim();
    return limpo ? limpo.split(/\s+/).length : 0;
}

/** Aviso nativo do Trilium (silencioso em versões antigas) */
function avisar(mensagem) {
    try { api.showMessage(mensagem); } catch (e) { /* opcional */ }
}

/** Notas de script (JS/CSS) não entram no grid */
function ehNotaDeScript(note) {
    const mime = (note.mime || '').toLowerCase();
    return mime.includes('javascript') || mime.includes('css');
}

/** Documento compilado fica fora do grid (senão entraria na próxima compilação) */
function ehCompilado(note) {
    return note.hasLabel('compiledDoc');
}

function abrirNota(noteId) {
    try {
        if (api.openTabWithNote) { api.openTabWithNote(noteId, true); return; }
    } catch (e) { /* tenta o fallback */ }
    try { api.activateNote(noteId); } catch (e) { avisar('Não foi possível abrir a nota.'); }
}


// ── ESTADO ────────────────────────────────────────────────────────────────────

let dragged = null;
let ultimoDrag = 0;


// ── RENDER ────────────────────────────────────────────────────────────────────

async function renderizar() {
    const todas = await dashboardNote.getChildNotes();
    let children = todas.filter((n) => !ehNotaDeScript(n) && !ehCompilado(n));

    // ordem salva
    let savedOrder = [];
    try {
        const label = dashboardNote.getLabelValue('gridOrder');
        if (label) savedOrder = JSON.parse(label);
    } catch (e) {}

    if (savedOrder.length > 0) {
        const map = {};
        children.forEach((n) => { map[n.noteId] = n; });

        const ordered = [];
        savedOrder.forEach((id) => {
            if (map[id]) { ordered.push(map[id]); delete map[id]; }
        });

        children = ordered.concat(Object.values(map));
    }

    api.$container.html(`
        <style>${CSS}</style>
        <div id="lg-root">
            <div class="lg-header">
                <div class="lg-info">
                    ${children.length} nota${children.length !== 1 ? 's' : ''} · arraste para ordenar · clique para abrir
                </div>
                <div class="lg-actions">
                    <button id="btn-refresh" class="lg-btn lg-btn-sec">⟳ Atualizar</button>
                    <button id="btn-generate" class="lg-btn">📝 Gerar documento</button>
                </div>
            </div>
            <div class="lg-grid" id="grid"></div>
        </div>
    `);

    const $grid = api.$container.find('#grid');

    if (!children.length) {
        $grid.html('<div class="lg-empty">Nenhuma nota de conteúdo ainda.<br>Crie notas filhas desta para montar o seu documento.</div>');
        return;
    }

    for (const child of children) {
        const contentData = await child.getNoteComplement();
        const text = (contentData.content || '')
            .replace(/<\/(p|div|h[1-6]|li)>/gi, '\n')
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<[^>]*>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .trim();

        const palavras = contarPalavras(text);
        const preview = text.length > 180 ? text.substring(0, 180) + '…' : text;

        $grid.append(`
            <div class="lg-card" data-id="${child.noteId}" draggable="true">
                <h3>${escaparHtml(child.title)}</h3>
                <p>${escaparHtml(preview) || 'Nota vazia…'}</p>
                <div class="lg-footer">📝 ${palavras.toLocaleString('pt-BR')} palavra${palavras !== 1 ? 's' : ''}</div>
            </div>
        `);
    }
}


// ── ORDEM (drag & drop) ───────────────────────────────────────────────────────

async function salvarOrdem() {
    const order = api.$container.find('#grid .lg-card').map(function () {
        return $(this).attr('data-id');
    }).get();

    await api.runOnBackend((noteId, order) => {
        api.getNote(noteId).setLabel('gridOrder', JSON.stringify(order));
    }, [dashboardNote.noteId, order]);

    avisar('Ordem salva');
}

// Handlers delegados no container (sobrevivem ao re-render)
api.$container.on('dragstart', '.lg-card', function (e) {
    dragged = this;
    const dt = e.originalEvent && e.originalEvent.dataTransfer;
    if (dt) {
        dt.effectAllowed = 'move';
        try { dt.setData('text/plain', $(this).attr('data-id')); } catch (err) {}
    }
    $(this).addClass('lg-dragging');
});

api.$container.on('dragover', '.lg-card', function (e) {
    e.preventDefault();
    if (e.originalEvent && e.originalEvent.dataTransfer) e.originalEvent.dataTransfer.dropEffect = 'move';
});

api.$container.on('dragenter', '.lg-card', function () {
    $(this).addClass('lg-drop');
});

api.$container.on('dragleave', '.lg-card', function () {
    $(this).removeClass('lg-drop');
});

api.$container.on('drop', '.lg-card', function (e) {
    e.preventDefault();
    e.stopPropagation();
    $(this).removeClass('lg-drop');
    if (!dragged || dragged === this) return;

    // solta antes ou depois conforme a metade em que o mouse está
    const rect = this.getBoundingClientRect();
    const antes = (e.originalEvent.clientX - rect.left) < rect.width / 2;
    if (antes) $(dragged).insertBefore(this);
    else $(dragged).insertAfter(this);
});

api.$container.on('dragover', '#grid', function (e) {
    e.preventDefault();
    if (!$(e.target).closest('.lg-card').length) $(this).addClass('lg-over');
});

api.$container.on('dragleave', '#grid', function (e) {
    const para = e.relatedTarget;
    if (!para || !$.contains(this, para)) $(this).removeClass('lg-over');
});

api.$container.on('drop', '#grid', function (e) {
    e.preventDefault();
    $(this).removeClass('lg-over');
    // soltar na área vazia (ou depois do último card) move para o fim
    if (dragged && !$(e.target).closest('.lg-card').length) $(this).append(dragged);
});

api.$container.on('dragend', '.lg-card', async function () {
    ultimoDrag = Date.now();
    $(this).removeClass('lg-dragging');
    api.$container.find('.lg-card').removeClass('lg-drop');
    api.$container.find('#grid').removeClass('lg-over');
    dragged = null;
    await salvarOrdem();
});

// Clique abre a nota (ignora o clique que encerra um arraste)
api.$container.on('click', '.lg-card', function () {
    if (Date.now() - ultimoDrag < 250) return;
    abrirNota($(this).attr('data-id'));
});

api.$container.on('click', '#btn-refresh', () => renderizar());


// ── GERAR DOCUMENTO ───────────────────────────────────────────────────────────

async function gerarDocumento() {
    const $btn = api.$container.find('#btn-generate');
    if ($btn.prop('disabled')) return;
    $btn.prop('disabled', true).text('⏳ Gerando…');

    try {
        const ids = api.$container.find('#grid .lg-card').map(function () {
            return $(this).attr('data-id');
        }).get();

        if (!ids.length) {
            avisar('Não há notas para compilar.');
            return;
        }

        let content = '';
        for (const id of ids) {
            const note = await api.getNote(id);
            const data = await note.getNoteComplement();
            content += `<h2>${escaparHtml(note.title)}</h2>${data.content || ''}<br><hr><br>`;
        }

        const titulo = '📄 ' + dashboardNote.title;

        const acao = await api.runOnBackend((parentId, title, content) => {
            const parent = api.getNote(parentId);
            const existente = parent.getChildNotes().find((n) => n.hasLabel('compiledDoc'));

            if (existente) {
                existente.setContent(content);
                try {
                    if (existente.title !== title) { existente.title = title; existente.save(); }
                } catch (e) { /* título é opcional */ }
                return 'atualizado';
            }

            const { note } = api.createNewNote({
                parentNoteId: parentId,
                title: title,
                content: content,
                type: 'text'
            });
            note.setLabel('compiledDoc', '');
            return 'criado';
        }, [dashboardNote.noteId, titulo, content]);

        avisar(`Documento ${acao} (${ids.length} nota${ids.length !== 1 ? 's' : ''}).`);
        await renderizar();

    } catch (err) {
        avisar('Erro ao gerar: ' + err.message);
    } finally {
        api.$container.find('#btn-generate').prop('disabled', false).text('📝 Gerar documento');
    }
}

api.$container.on('click', '#btn-generate', gerarDocumento);


// ── START ─────────────────────────────────────────────────────────────────────
renderizar();
