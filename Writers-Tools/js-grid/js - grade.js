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
// Hoista <style> de qualquer HTML injetado para o <head> — render notes podem
// ignorar style inline (o layout não pode depender do tema, ex.: Folio).
(function () {
    if (typeof document === 'undefined' || typeof $ === 'undefined' || !$.fn) return;
    // Instala UMA vez por página: o script pode re-executar (refresh do render note)
    // e os wrappers não podem se acumular (senão o CSS duplica e a corrente de
    // patches entre plugins cresce a cada refresh).
    if (window.__lgPatched) return;
    window.__lgPatched = true;

    const getStyleEl = () => {
        let el = document.getElementById('lg-styles');
        if (!el) {
            el = document.createElement('style');
            el.id = 'lg-styles';
            document.head.appendChild(el);
        }
        return el;
    };
    const hoist = (html) => {
        const str = String(html);
        if (!str.includes('<style>')) return str;
        const styleEl = getStyleEl();
        const re = /<style>([\s\S]*?)<\/style>/g;
        let css = '';
        let m;
        while ((m = re.exec(str)) !== null) css += '\n' + m[1];
        // Idempotente: substitui o conteúdo em vez de acumular a cada render
        if (styleEl.textContent !== css) styleEl.textContent = css;
        return str.replace(re, '');
    };
    const origHtml = $.fn.html;
    const origAppend = $.fn.append;
    $.fn.html = function (arg) {
        if (typeof arg === 'string' && arg.includes('<style>')) arg = hoist(arg);
        return origHtml.apply(this, [arg]);
    };
    $.fn.append = function () {
        const args = Array.prototype.slice.call(arguments);
        if (typeof args[0] === 'string' && args[0].includes('<style>')) args[0] = hoist(args[0]);
        return origAppend.apply(this, args);
    };
})();



const CSS = `
  /* Tudo escopado em #lg-root e com classes próprias (lg-*): este CSS não pode
     afetar o app, mesmo que o Trilium não envolva o estilo em @scope */
  #lg-root, #lg-root * { box-sizing: border-box; }
  #lg-root { max-width: 1500px; margin: 0 auto; }

  #lg-root .lg-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    padding: 15px 20px;
    border-bottom: 1px solid var(--main-border-color);
  }
  #lg-root .lg-info { font-family: monospace; font-size: 12px; color: var(--muted-text-color, #6b6b6b); }
  #lg-root .lg-actions { display: flex; gap: 8px; }

  #lg-root .lg-btn {
    background: var(--button-background-color, var(--accented-background-color, #e8e8e8));
    color: var(--button-text-color, var(--main-text-color, #222));
    border: 1px solid var(--main-border-color);
    padding: 10px 18px;
    border-radius: 6px;
    cursor: pointer;
    font-weight: bold;
    transition: filter 0.15s;
  }
  #lg-root .lg-btn:not(:disabled):hover { filter: brightness(1.1); }
  #lg-root .lg-btn:disabled { opacity: 0.6; cursor: not-allowed; }
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
    box-shadow: inset 0 0 0 2px var(--active-item-background-color, var(--main-border-color, #888));
  }

  #lg-root .lg-card {
    display: flex;
    flex-direction: column;
    position: relative;
    background: var(--main-background-color);
    border: 1px solid var(--main-border-color);
    border-radius: 8px;
    padding: 15px;
    cursor: grab;
    transition: opacity 0.15s, border-color 0.15s;
  }
  #lg-root .lg-card:active { cursor: grabbing; }
  #lg-root .lg-card.lg-dragging { opacity: 0.5; }
  #lg-root .lg-card.lg-drop { border: 2px dashed var(--active-item-background-color, var(--main-border-color, #888)); }
  #lg-root .lg-card:focus-visible {
    outline: 2px solid var(--active-item-background-color, #4a90d9);
    outline-offset: 2px;
  }

  #lg-root .lg-card h3 { margin-top: 0; font-size: 16px; overflow-wrap: anywhere; }
  #lg-root .lg-card p  { font-size: 13px; opacity: 0.85; margin-bottom: 8px; overflow-wrap: anywhere; }
  #lg-root .lg-footer { font-family: monospace; font-size: 12px; color: var(--muted-text-color, #6b6b6b); margin-top: auto; }

  /* Botões de mover (alternativa ao drag no teclado e no toque) */
  #lg-root .lg-mover {
    position: absolute;
    top: 8px;
    right: 8px;
    display: flex;
    gap: 4px;
    opacity: 0;
    transition: opacity 0.15s;
  }
  #lg-root .lg-card:hover .lg-mover,
  #lg-root .lg-card:focus-within .lg-mover { opacity: 1; }
  #lg-root .lg-mover-btn {
    width: 30px;
    height: 30px;
    line-height: 1;
    border-radius: 6px;
    border: 1px solid var(--main-border-color);
    background: var(--button-background-color, var(--accented-background-color, #e8e8e8));
    color: var(--button-text-color, var(--main-text-color, #222));
    cursor: pointer;
    font-size: 14px;
  }
  #lg-root .lg-mover-btn:hover { filter: brightness(1.1); }
  #lg-root .lg-mover-btn:focus-visible {
    outline: 2px solid var(--active-item-background-color, #4a90d9);
    outline-offset: 1px;
  }

  #lg-root .lg-empty {
    grid-column: 1 / -1;
    padding: 40px 20px;
    text-align: center;
    font-family: monospace;
    font-size: 13px;
    color: var(--muted-text-color, #6b6b6b);
    line-height: 1.8;
  }

  /* ── Mobile / telas estreitas ── */
  @media (max-width: 600px) {
    #lg-root .lg-header { padding: 12px; gap: 8px; }
    #lg-root .lg-info { font-size: 11px; }
    #lg-root .lg-actions { width: 100%; gap: 6px; }
    #lg-root .lg-btn { flex: 1; padding: 9px 8px; font-size: 13px; min-height: 44px; }
    #lg-root .lg-grid { padding: 12px; gap: 12px; grid-template-columns: 1fr; }
    #lg-root .lg-card { padding: 12px; }
    #lg-root .lg-mover { opacity: 1; } /* sem hover no toque: sempre visível */
    #lg-root .lg-mover-btn { width: 40px; height: 40px; }
  }

  /* ── Acessibilidade: menos movimento quando o sistema pede ── */
  @media (prefers-reduced-motion: reduce) {
    #lg-root *, #lg-root *::before, #lg-root *::after {
      transition: none !important;
      animation: none !important;
    }
  }
`;


// ── HELPERS ───────────────────────────────────────────────────────────────────

// ── i18n (segue o idioma do Trilium; palpite síncrono e confirmação no boot) ──
const LG_I18N = {
    pt: {
        notas: '{n} nota{s}',
        palavras: '{n} palavra{s}',
        dica: 'arraste (ou ↑/↓) para ordenar · clique para abrir',
        atualizar: '⟳ Atualizar',
        gerar: '📝 Gerar documento',
        gerando: '⏳ Gerando…',
        vazio: 'Nenhuma nota de conteúdo ainda.<br>Crie notas filhas desta para montar o seu documento.',
        erroCarregar: 'Erro ao carregar o grid: {msg}',
        tentar: '⟳ Tentar de novo',
        ordemSalva: 'Ordem salva',
        ordemErro: 'Não foi possível salvar a ordem: {msg}',
        semNotas: 'Não há notas para compilar.',
        criado: 'Documento criado ({n} nota{s}).',
        atualizado: 'Documento atualizado ({n} nota{s}).',
        erroGerar: 'Erro ao gerar: {msg}',
        erroAbrir: 'Não foi possível abrir a nota.',
        moverCima: 'Mover para cima',
        moverBaixo: 'Mover para baixo',
        notaVazia: 'Nota vazia…',
        ariaCard: '{titulo} (Enter abre · setas movem)',
        titleCard: '{titulo} · Enter abre · ↑/↓ reordena',
    },
    en: {
        notas: '{n} note{s}',
        palavras: '{n} word{s}',
        dica: 'drag (or ↑/↓) to reorder · click to open',
        atualizar: '⟳ Refresh',
        gerar: '📝 Generate document',
        gerando: '⏳ Generating…',
        vazio: 'No content notes yet.<br>Create child notes under this one to build your document.',
        erroCarregar: 'Error loading the grid: {msg}',
        tentar: '⟳ Try again',
        ordemSalva: 'Order saved',
        ordemErro: 'Could not save the order: {msg}',
        semNotas: 'There are no notes to compile.',
        criado: 'Document created ({n} note{s}).',
        atualizado: 'Document updated ({n} note{s}).',
        erroGerar: 'Error generating: {msg}',
        erroAbrir: 'Could not open the note.',
        moverCima: 'Move up',
        moverBaixo: 'Move down',
        notaVazia: 'Empty note…',
        ariaCard: '{titulo} (Enter opens · arrows move)',
        titleCard: '{titulo} · Enter opens · ↑/↓ reorders',
    },
};

let lgLocale = (() => {
    try { return String(navigator.language || '').toLowerCase().startsWith('en') ? 'en' : 'pt'; } catch (e) { return 'pt'; }
})();

/** Traduz com interpolação {var} — chamado de tr() para não colidir com mapas */
function tr(chave, vars) {
    const dic = LG_I18N[lgLocale] || LG_I18N.pt;
    let txt = dic[chave] || LG_I18N.pt[chave] || chave;
    if (vars) for (const k of Object.keys(vars)) txt = txt.replace('{' + k + '}', vars[k]);
    return txt;
}
function lgPlural(n) { return n === 1 ? '' : 's'; }
function lgCultura() { return lgLocale === 'en' ? 'en-US' : 'pt-BR'; }

function escaparHtml(texto) {
    return String(texto == null ? '' : texto)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function contarPalavras(texto) {
    const limpo = String(texto || '').trim();
    return limpo ? limpo.split(/\s+/).length : 0;
}

/** Aviso nativo do Trilium (com fallback no console quando indisponível) */
function avisar(mensagem) {
    try { api.showMessage(mensagem); return; } catch (e) { /* opcional */ }
    try { console.warn('[Longform]', mensagem); } catch (e) { /* sem console */ }
}

/** Sanitização defensiva do HTML das filhas antes de entrar no compilado:
 *  remove scripts/frames, atributos on* e URLs javascript: (mitigação de
 *  conteúdo importado; o conteúdo é do próprio usuário). */
function sanitizarHtml(html) {
    return String(html || '')
        .replace(/<\s*script\b[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, '')
        .replace(/<\s*script\b[^>]*\/?>/gi, '')
        .replace(/<\s*(iframe|object|embed)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
        .replace(/<\s*(iframe|object|embed)\b[^>]*\/?>/gi, '')
        .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
        .replace(/(href|src)\s*=\s*(?:"\s*javascript:[^"]*"|'\s*javascript:[^']*'|javascript:[^\s>]+)/gi, '$1="#"');
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
    try { api.activateNote(noteId); } catch (e) { avisar(tr('erroAbrir')); }
}


// ── ESTADO ────────────────────────────────────────────────────────────────────

let dragged = null;
let ultimoDrag = 0;


// ── RENDER ────────────────────────────────────────────────────────────────────

let renderizando = false;
let ultimaOrdem = null;

async function renderizar() {
    if (renderizando) return; // evita renders concorrentes (duplicar cards)
    renderizando = true;
    try {
        const todas = await dashboardNote.getChildNotes();
        let children = todas.filter((n) => !ehNotaDeScript(n) && !ehCompilado(n));

        // ordem salva (label com JSON válido; se não for array, ignora)
        let savedOrder = [];
        try {
            const label = dashboardNote.getLabelValue('gridOrder');
            if (label) savedOrder = JSON.parse(label);
        } catch (e) { /* ordem corrompida: segue a ordem natural */ }
        if (!Array.isArray(savedOrder)) savedOrder = [];

        if (savedOrder.length > 0) {
            const map = {};
            children.forEach((n) => { map[n.noteId] = n; });

            const ordered = [];
            savedOrder.forEach((id) => {
                if (map[id]) { ordered.push(map[id]); delete map[id]; }
            });

            children = ordered.concat(Object.values(map));
        }
        ultimaOrdem = JSON.stringify(children.map((n) => n.noteId));

        // Conteúdo das filhas em paralelo; uma nota problemática não derruba o grid
        const cards = await Promise.all(children.map(async (child) => {
            let text = '';
            try {
                const contentData = await child.getNoteComplement();
                text = (contentData.content || '')
                    .replace(/<\/(p|div|h[1-6]|li)>/gi, '\n')
                    .replace(/<br\s*\/?>/gi, '\n')
                    .replace(/<[^>]*>/g, '')
                    .replace(/&nbsp;/g, ' ')
                    .replace(/&amp;/g, '&')
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .trim();
            } catch (e) { /* segue com a nota vazia */ }

            const palavras = contarPalavras(text);
            const preview = text.length > 180 ? text.substring(0, 180) + '…' : text;

            return {
                palavras,
                html: `
            <div class="lg-card" data-id="${child.noteId}" draggable="true" tabindex="0" role="group" aria-label="${escaparHtml(tr('ariaCard', { titulo: child.title }))}" title="${escaparHtml(tr('titleCard', { titulo: child.title }))}">
                <div class="lg-mover">
                    <button type="button" class="lg-mover-btn" data-dir="up" aria-label="${tr('moverCima')}">↑</button>
                    <button type="button" class="lg-mover-btn" data-dir="down" aria-label="${tr('moverBaixo')}">↓</button>
                </div>
                <h3>${escaparHtml(child.title)}</h3>
                <p>${escaparHtml(preview) || tr('notaVazia')}</p>
                <div class="lg-footer">📝 ${tr('palavras', { n: palavras.toLocaleString(lgCultura()), s: lgPlural(palavras) })}</div>
            </div>`,
            };
        }));

        const totalPalavras = cards.reduce((soma, c) => soma + c.palavras, 0);

        api.$container.html(`
        <style>${CSS}</style>
        <div id="lg-root">
                <div class="lg-header">
                    <div class="lg-info">
                        ${tr('notas', { n: children.length, s: lgPlural(children.length) })} · 📝 ${tr('palavras', { n: totalPalavras.toLocaleString(lgCultura()), s: lgPlural(totalPalavras) })} · ${tr('dica')}
                    </div>
                    <div class="lg-actions">
                        <button id="btn-refresh" class="lg-btn lg-btn-sec">${tr('atualizar')}</button>
                        <button id="btn-generate" class="lg-btn">${tr('gerar')}</button>
                    </div>
                </div>
            <div class="lg-grid" id="grid"></div>
        </div>
    `);

        const $grid = api.$container.find('#grid');

        if (!children.length) {
            $grid.html(`<div class="lg-empty">${tr('vazio')}</div>`);
            return;
        }

        $grid.append(cards.map((c) => c.html).join(''));

    } catch (err) {
        api.$container.html(`
            <style>${CSS}</style>
            <div id="lg-root">
                <div class="lg-empty">
                    ${tr('erroCarregar', { msg: escaparHtml(err.message) })}<br><br>
                    <button id="btn-retry" class="lg-btn">${tr('tentar')}</button>
                </div>
            </div>
        `);
    } finally {
        renderizando = false;
    }
}


// ── ORDEM (drag & drop) ───────────────────────────────────────────────────────

async function salvarOrdem() {
    const order = api.$container.find('#grid .lg-card').map(function () {
        return $(this).attr('data-id');
    }).get();
    const json = JSON.stringify(order);
    if (json === ultimaOrdem) return; // nada mudou: não escreve nem avisa

    try {
        await api.runOnBackend((noteId, order) => {
            api.getNote(noteId).setLabel('gridOrder', JSON.stringify(order));
        }, [dashboardNote.noteId, order]);
        ultimaOrdem = json;
        avisar(tr('ordemSalva'));
    } catch (e) {
        avisar(tr('ordemErro', { msg: (e && e.message) || e }));
    }
}

// Handlers delegados no container (sobrevivem ao re-render). O `.off('.lg')`
// evita acúmulo quando o script re-executa (refresh do render note).
api.$container.off('.lg');

api.$container.on('dragstart.lg', '.lg-card', function (e) {
    dragged = this;
    const dt = e.originalEvent && e.originalEvent.dataTransfer;
    if (dt) {
        dt.effectAllowed = 'move';
        try { dt.setData('text/plain', $(this).attr('data-id')); } catch (err) {}
    }
    $(this).addClass('lg-dragging');
});

api.$container.on('dragover.lg', '.lg-card', function (e) {
    e.preventDefault();
    if (e.originalEvent && e.originalEvent.dataTransfer) e.originalEvent.dataTransfer.dropEffect = 'move';
});

api.$container.on('dragenter.lg', '.lg-card', function () {
    $(this).addClass('lg-drop');
});

api.$container.on('dragleave.lg', '.lg-card', function () {
    $(this).removeClass('lg-drop');
});

api.$container.on('drop.lg', '.lg-card', function (e) {
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

api.$container.on('dragover.lg', '#grid', function (e) {
    e.preventDefault();
    if (!$(e.target).closest('.lg-card').length) $(this).addClass('lg-over');
});

api.$container.on('dragleave.lg', '#grid', function (e) {
    const para = e.relatedTarget;
    if (!para || !$.contains(this, para)) $(this).removeClass('lg-over');
});

api.$container.on('drop.lg', '#grid', function (e) {
    e.preventDefault();
    $(this).removeClass('lg-over');
    // soltar na área vazia (ou depois do último card) move para o fim
    if (dragged && !$(e.target).closest('.lg-card').length) $(this).append(dragged);
});

api.$container.on('dragend.lg', '.lg-card', async function () {
    ultimoDrag = Date.now();
    $(this).removeClass('lg-dragging');
    api.$container.find('.lg-card').removeClass('lg-drop');
    api.$container.find('#grid').removeClass('lg-over');
    dragged = null;
    await salvarOrdem();
});

// Clique abre a nota (ignora o clique que encerra um arraste e os botões de mover)
api.$container.on('click.lg', '.lg-card', function (e) {
    if (Date.now() - ultimoDrag < 250) return;
    if ($(e.target).closest('.lg-mover').length) return;
    abrirNota($(this).attr('data-id'));
});

/** Move o card uma posição (↑/↓) e salva — usado pelo teclado e pelos botões */
function moverCard($card, dir) {
    const $irmaos = $card.parent().find('.lg-card');
    const pos = $irmaos.index($card);
    if (dir === 'up' && pos > 0) $card.insertBefore($irmaos.eq(pos - 1));
    else if (dir === 'down' && pos < $irmaos.length - 1) $card.insertAfter($irmaos.eq(pos + 1));
    else return false;
    $card.trigger('focus');
    salvarOrdem();
    return true;
}

// Teclado: Enter/Espaço abre; ↑/↓ move o card (alternativa sem mouse)
api.$container.on('keydown.lg', '.lg-card', function (e) {
    const $card = $(this);
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        abrirNota($card.attr('data-id'));
        return;
    }
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        moverCard($card, e.key === 'ArrowUp' ? 'up' : 'down');
    }
});

// Botões ↑/↓: reordenar por clique/toque (funciona onde o drag não vai)
api.$container.on('click.lg', '.lg-mover-btn', function (e) {
    e.stopPropagation();
    moverCard($(this).closest('.lg-card'), $(this).data('dir'));
});

api.$container.on('click.lg', '#btn-refresh', () => renderizar());
api.$container.on('click.lg', '#btn-retry', () => renderizar());


// ── GERAR DOCUMENTO ───────────────────────────────────────────────────────────

async function gerarDocumento() {
    const $btn = api.$container.find('#btn-generate');
    if ($btn.prop('disabled')) return;
    $btn.prop('disabled', true).text(tr('gerando'));
    api.$container.find('#btn-refresh').prop('disabled', true);

    try {
        const ids = api.$container.find('#grid .lg-card').map(function () {
            return $(this).attr('data-id');
        }).get();

        if (!ids.length) {
            avisar(tr('semNotas'));
            return;
        }

        let content = '';
        for (const id of ids) {
            const note = await api.getNote(id);
            const data = await note.getNoteComplement();
            content += `<h2>${escaparHtml(note.title)}</h2>${sanitizarHtml(data.content || '')}<br><hr><br>`;
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

            // Nota + label na MESMA transação: se o label falhar, nada fica
            // para trás (senão a nota viraria card e se auto-compilaria)
            api.transactional(() => {
                const { note } = api.createNewNote({
                    parentNoteId: parentId,
                    title: title,
                    content: content,
                    type: 'text'
                });
                note.setLabel('compiledDoc', '');
            });
            return 'criado';
        }, [dashboardNote.noteId, titulo, content]);

        avisar(tr(acao === 'criado' ? 'criado' : 'atualizado', { n: ids.length, s: lgPlural(ids.length) }));
        await renderizar();

    } catch (err) {
        avisar(tr('erroGerar', { msg: err.message }));
    } finally {
        api.$container.find('#btn-generate').prop('disabled', false).text(tr('gerar'));
        api.$container.find('#btn-refresh').prop('disabled', false);
    }
}

api.$container.on('click.lg', '#btn-generate', gerarDocumento);


// ── START ─────────────────────────────────────────────────────────────────────
// Confere o idioma real do Trilium (o palpite pode errar) e re-renderiza se mudar
(async () => {
    try {
        const loc = await api.runOnBackend(() => api.getOption('locale'));
        const novo = String(loc || '').toLowerCase().startsWith('en') ? 'en' : 'pt';
        if (novo !== lgLocale) { lgLocale = novo; renderizar(); }
    } catch (e) { /* mantém o palpite */ }
})();

renderizar();
