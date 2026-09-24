/* ============================================================
 * CANVAS MOBILE (v9) — diálogo acionado por nota launcher
 *
 * Ações: 🪄 Fluxo · 🧩 Templates · 🔗 Inserir · 🛠️ Mais
 *   (Mais: nova nota, sincronizar, longform, editar card, remover card, relações)
 *
 * Depende do bloco gerado antes deste arquivo:
 *   - engine: CARD_CONFIG, FLOW_CONFIG, RELATION_TYPES, getCleanPatterns,
 *             flowDefaultSpec, parseFlowSpec, buildFlowElements, clwOrdenarCards,
 *             relationOptionsHtml, escapeHtml
 *   - i18n:   CLW_I18N, clwNormalizeLang, clwTranslate
 *   - backends: CLW_BE_* (INSERT, TPL, FLOW, CARDS, NEWNOTE, SYNC,
 *               EDITOR_LOAD, EDITOR_SAVE, REMOVE, REL_PAIRS, REL_SAVE, LONGFORM)
 *
 * Roda SEM api.$container (scripts de launcher não têm container) — o diálogo
 * vai para document.body e o CSS é escopado em #clwm-root.
 * ============================================================ */

(function () {
    const CAP = (typeof window !== 'undefined' && window.Capacitor) || null;
    const nativo = !!(CAP && typeof CAP.isNativePlatform === 'function' && CAP.isNativePlatform());

    let lang = clwNormalizeLang(navigator.language);
    const t = (key, vars) => clwTranslate(lang, key, vars);

    function backendLabels() {
        return {
            canvasMissing:  t('flow.canvas_missing'),
            tplMissing:     t('tpl.missing'),
            tplInvalid:     t('tpl.invalid'),
            whereParent:    t('flow.where_parent'),
            whereTemplates: t('flow.where_templates'),
        };
    }

    function canvasAtivo() {
        const nota = api.getActiveContextNote ? api.getActiveContextNote() : null;
        return (nota && nota.type === 'canvas') ? nota : null;
    }

    function status(msg) {
        const el = document.getElementById('clwm-status');
        if (el) el.textContent = String(msg || '');
    }

    function info() {
        const nota = canvasAtivo();
        const el = document.getElementById('clwm-info');
        if (!el) return;
        el.textContent = nota
            ? '🎨 ' + (nota.title || nota.noteId)
            : '⚠️ ' + t('common.no_canvas');
        el.style.opacity = nota ? '.8' : '1';
    }

    const CSS = `
      #clwm-root, #clwm-root * { box-sizing: border-box; }
      #clwm-root {
        position: fixed; inset: 0; z-index: 10000;
        display: flex; align-items: center; justify-content: center;
        background: rgba(0,0,0,.45); padding: 10px;
      }
      #clwm-root .clwm-box {
        background: var(--main-background-color, #fff);
        color: var(--main-text-color, #222);
        width: min(96vw, 540px); max-height: 92vh;
        display: flex; flex-direction: column;
        border-radius: 12px; border: 1px solid var(--main-border-color, #ccc);
        box-shadow: 0 12px 40px rgba(0,0,0,.35); overflow: hidden;
      }
      #clwm-root .clwm-head {
        display: flex; align-items: center; gap: 8px;
        padding: 12px 14px; border-bottom: 1px solid var(--main-border-color, #ccc);
      }
      #clwm-root .clwm-head h2 { margin: 0; font-size: 15px; flex: 1; }
      #clwm-root .clwm-x {
        border: none; background: transparent; color: inherit;
        font-size: 18px; padding: 4px 8px; cursor: pointer;
      }
      #clwm-root .clwm-info {
        padding: 8px 14px 0; font-family: monospace; font-size: 11px;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      #clwm-root .clwm-tabs { display: flex; gap: 5px; padding: 10px 14px 0; }
      #clwm-root .clwm-tab {
        flex: 1; padding: 10px 4px; font-size: 12px; border-radius: 8px;
        border: 1px solid var(--main-border-color, #ccc);
        background: transparent; color: inherit; cursor: pointer;
      }
      #clwm-root .clwm-tab.ativo {
        background: var(--active-item-background-color, #ddd);
        font-weight: bold;
      }
      #clwm-root .clwm-body { padding: 12px 14px; overflow: auto; }
      #clwm-root .clwm-painel { display: none; }
      #clwm-root .clwm-painel.ativo { display: block; }

      #clwm-root textarea, #clwm-root input[type=text], #clwm-root select {
        width: 100%; padding: 10px; font-size: 14px; border-radius: 8px;
        border: 1px solid var(--main-border-color, #ccc);
        background: var(--main-background-color, #fff); color: inherit;
        font-family: monospace;
      }
      #clwm-root textarea { min-height: 150px; resize: vertical; }
      #clwm-root select { font-family: inherit; }

      #clwm-root .clwm-btn {
        display: block; width: 100%; margin-top: 10px; padding: 12px;
        font-size: 14px; border-radius: 8px; font-weight: bold;
        border: 1px solid var(--main-border-color, #ccc);
        background: var(--button-background-color, var(--accented-background-color, #f0f0f0));
        color: var(--button-text-color, var(--main-text-color, inherit));
        cursor: pointer; text-align: left;
      }
      #clwm-root .clwm-btn:active { filter: brightness(.92); }
      #clwm-root .clwm-btn-sec { font-weight: normal; opacity: .85; }

      #clwm-root .clwm-lista { margin-top: 10px; display: flex; flex-direction: column; gap: 6px; }
      #clwm-root .clwm-item {
        padding: 12px; font-size: 14px; text-align: left; border-radius: 8px;
        border: 1px solid var(--main-border-color, #ccc);
        background: transparent; color: inherit; cursor: pointer;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      #clwm-root .clwm-item:active {
        background: var(--hover-item-background-color, rgba(128,128,128,.15));
      }
      #clwm-root .clwm-item.perigo { border-color: #e78284; color: #e78284; }
      #clwm-root .clwm-vazio { font-family: monospace; font-size: 12px; opacity: .6; padding: 6px 2px; }
      #clwm-root .clwm-status {
        padding: 10px 14px; font-family: monospace; font-size: 12px;
        border-top: 1px solid var(--main-border-color, #ccc);
        white-space: pre-wrap; word-break: break-word; min-height: 1.2em;
      }

      /* editor */
      #clwm-root .clwm-ed-conteudo {
        min-height: 220px; max-height: 45vh; overflow-y: auto; margin-top: 8px;
        padding: 10px 12px; border-radius: 8px;
        border: 1px solid var(--main-border-color, #ccc);
        background: var(--main-background-color, #fff); color: inherit;
        font-size: 14px; line-height: 1.6; outline: none;
      }
      #clwm-root .clwm-ed-conteudo img { max-width: 100%; }

      /* relações */
      #clwm-root .clwm-rel {
        margin-top: 10px; padding: 10px; border-radius: 8px;
        border: 1px solid var(--main-border-color, #ccc);
      }
      #clwm-root .clwm-rel-titulo { font-size: 13px; margin-bottom: 8px; }
      #clwm-root .clwm-rel-seta { font-family: monospace; font-size: 11px; opacity: .6; }
    `;

    /* ── Templates (#canvasTemplate) ─────────────────────── */
    let templates = null;

    async function carregarTemplates() {
        if (templates) return templates;
        templates = await api.runOnBackend(() => api.searchForNotes('#canvasTemplate')
            .map((n) => ({ noteId: n.noteId, title: n.title })));
        return templates;
    }

    function renderTemplates() {
        const lista = document.getElementById('clwm-tpl-lista');
        if (!lista) return;
        const filtro = (document.getElementById('clwm-tpl-filtro').value || '').trim().toLowerCase();
        const todos = templates || [];
        const itens = filtro ? todos.filter((x) => (x.title || '').toLowerCase().includes(filtro)) : todos;

        lista.innerHTML = '';
        if (!itens.length) {
            const d = document.createElement('div');
            d.className = 'clwm-vazio';
            d.textContent = todos.length ? t('tpl.no_match') : t('tpl.empty_hint');
            lista.appendChild(d);
            return;
        }

        for (const tpl of itens) {
            const b = document.createElement('button');
            b.className = 'clwm-item';
            b.textContent = '🧩 ' + (tpl.title || tpl.noteId);
            b.addEventListener('click', () => inserirTemplate(tpl.noteId, tpl.title));
            lista.appendChild(b);
        }
    }

    async function abrirTemplates() {
        const lista = document.getElementById('clwm-tpl-lista');
        if (!templates && lista) lista.innerHTML = '<div class="clwm-vazio">…</div>';
        try {
            await carregarTemplates();
            renderTemplates();
        } catch (e) {
            status('❌ ' + ((e && e.message) || e));
        }
    }

    /* ── Lista de cards (rect com link) ──────────────────── */
    async function listarCards(canvasNoteId) {
        return await api.runOnBackend(CLW_BE_CARDS, [canvasNoteId, backendLabels()]);
    }

    /* ── Ações principais ────────────────────────────────── */
    async function gerarFluxo() {
        const nota = canvasAtivo();
        if (!nota) { status('⚠️ ' + t('common.no_canvas')); return; }

        const spec = document.getElementById('clwm-dsl').value || '';
        const dir = document.getElementById('clwm-dir').value === 'LR' ? 'LR' : 'TB';
        const parsed = parseFlowSpec(spec, t);

        if (parsed.errors.length) { status('⚠️ ' + parsed.errors.slice(0, 3).join(' ')); return; }
        if (!parsed.nodes.length) { status('⚠️ ' + t('flow.no_nodes')); return; }

        status('🪄 ' + t('flow.generate') + '…');
        try {
            const { elements, layers } = buildFlowElements(parsed.nodes, parsed.edges, dir, { x: 0, y: 0 });
            const n = await api.runOnBackend(CLW_BE_FLOW, [nota.noteId, elements, FLOW_CONFIG.marginX, backendLabels()]);
            status(t('flow.generated', { n, nodes: parsed.nodes.length, layers }));
        } catch (e) {
            status('❌ ' + ((e && e.message) || e));
        }
    }

    async function inserirTemplate(templateNoteId, templateTitle) {
        const nota = canvasAtivo();
        if (!nota) { status('⚠️ ' + t('common.no_canvas')); return; }
        status(t('tpl.inserting'));
        try {
            const n = await api.runOnBackend(CLW_BE_TPL, [nota.noteId, templateNoteId, FLOW_CONFIG.marginX, backendLabels()]);
            status(t('tpl.inserted', { title: templateTitle, n }));
        } catch (e) {
            status('❌ ' + t('tpl.insert_error') + ((e && e.message) || e));
        }
    }

    async function inserirCard(noteId, title) {
        const nota = canvasAtivo();
        if (!nota) { status('⚠️ ' + t('common.no_canvas')); return; }
        status(t('search.inserting'));
        try {
            await api.runOnBackend(CLW_BE_INSERT, [nota.noteId, noteId, title || '', '', CARD_CONFIG, getCleanPatterns(), backendLabels()]);
            status(t('search.inserted', { title: title || noteId }));
        } catch (e) {
            status('❌ ' + ((e && e.message) || e));
        }
    }

    async function buscarNotas() {
        const termo = (document.getElementById('clwm-busca').value || '').trim();
        if (!termo) return;
        const lista = document.getElementById('clwm-busca-lista');
        lista.innerHTML = '<div class="clwm-vazio">…</div>';
        try {
            const notas = await api.searchForNotes(termo);
            lista.innerHTML = '';
            if (!notas.length) {
                const d = document.createElement('div');
                d.className = 'clwm-vazio';
                d.textContent = '—';
                lista.appendChild(d);
                return;
            }
            for (const n of notas.slice(0, 20)) {
                const b = document.createElement('button');
                b.className = 'clwm-item';
                b.textContent = '🔗 ' + (n.title || n.noteId);
                b.addEventListener('click', () => inserirCard(n.noteId, n.title));
                lista.appendChild(b);
            }
        } catch (e) {
            lista.innerHTML = '';
            status('❌ ' + ((e && e.message) || e));
        }
    }

    /* ── Mais: sub-painéis ───────────────────────────────── */
    function subPainel(html) {
        const menu = document.getElementById('clwm-mais-menu');
        const sub  = document.getElementById('clwm-mais-sub');
        if (!menu || !sub) return;
        menu.style.display = 'none';
        sub.style.display = 'block';
        document.getElementById('clwm-sub-conteudo').innerHTML = html || '';
    }

    function voltarMenu() {
        const menu = document.getElementById('clwm-mais-menu');
        const sub  = document.getElementById('clwm-mais-sub');
        if (!menu || !sub) return;
        sub.style.display = 'none';
        document.getElementById('clwm-sub-conteudo').innerHTML = '';
        menu.style.display = 'block';
    }

    /* ── Mais: nova nota ─────────────────────────────────── */
    async function criarNota() {
        const nota = canvasAtivo();
        if (!nota) { status('⚠️ ' + t('common.no_canvas')); return; }

        const input = document.getElementById('clwm-nova-titulo');
        const titulo = (input.value || '').trim();
        if (!titulo) { status('⚠️ ' + t('newnote.no_title')); input.focus(); return; }

        status('📝 …');
        try {
            const novoId = await api.runOnBackend(CLW_BE_NEWNOTE, [nota.noteId, titulo]);
            await api.runOnBackend(CLW_BE_INSERT, [nota.noteId, novoId, titulo, '', CARD_CONFIG, getCleanPatterns(), backendLabels()]);
            input.value = '';
            status(t('newnote.created', { title: titulo }));
        } catch (e) {
            status('❌ ' + t('newnote.error') + ((e && e.message) || e));
        }
    }

    /* ── Mais: sincronizar cards ─────────────────────────── */
    async function sincronizar() {
        const nota = canvasAtivo();
        if (!nota) { status('⚠️ ' + t('common.no_canvas')); return; }

        status(t('sync.running'));
        try {
            const cards = await listarCards(nota.noteId);
            if (!cards.length) { status('ℹ️ ' + t('sync.none')); return; }
            let n = 0;
            for (const c of cards) {
                n += await api.runOnBackend(CLW_BE_SYNC, [nota.noteId, c.noteId, CARD_CONFIG, getCleanPatterns()]);
            }
            status(t('sync.done', { n }));
        } catch (e) {
            status('❌ ' + t('sync.error') + ((e && e.message) || e));
        }
    }

    /* ── Mais: longform ──────────────────────────────────── */
    async function criarLongform() {
        const nota = canvasAtivo();
        if (!nota) { status('⚠️ ' + t('common.no_canvas')); return; }

        status(t('relations.reading'));
        try {
            const comp = await nota.getNoteComplement();
            const data = JSON.parse(comp.content || '{}');
            const elements = (data.elements || []).filter((e) => !e.isDeleted);

            const cardMap = {};
            const cardPos = {};
            elements.forEach((el) => {
                if (el.type === 'rectangle' && el.link?.startsWith('#root/')) {
                    cardMap[el.id] = el.link.replace('#root/', '');
                    cardPos[el.id] = { x: el.x || 0, y: el.y || 0 };
                }
            });

            if (!Object.keys(cardMap).length) { status('⚠️ ' + t('relations.no_cards')); return; }

            const { noteIds, arrowCount, ordenados, restantes } = clwOrdenarCards(elements, cardMap, cardPos);
            if (arrowCount > 0 && ordenados === 0) status('ℹ️ ' + t('relations.cycle'));

            await api.runOnBackend(CLW_BE_LONGFORM, [nota.noteId, noteIds, nota.title || 'Canvas']);

            const orderSource = arrowCount > 0 && ordenados > 0
                ? t('longform.order_arrows', { arrows: ordenados, rest: restantes })
                : t('longform.order_pos', { n: noteIds.length });
            status('✅ Longform: ' + orderSource);
        } catch (e) {
            status('❌ ' + ((e && e.message) || e));
        }
    }

    /* ── Mais: editar card ───────────────────────────────── */
    async function abrirEditar() {
        const nota = canvasAtivo();
        if (!nota) { status('⚠️ ' + t('common.no_canvas')); return; }

        subPainel('<div class="clwm-vazio">…</div>');
        try {
            const cards = await listarCards(nota.noteId);
            const div = document.getElementById('clwm-sub-conteudo');
            div.innerHTML = '';
            if (!cards.length) { div.innerHTML = '<div class="clwm-vazio">' + t('relations.no_cards') + '</div>'; return; }
            for (const c of cards) {
                const b = document.createElement('button');
                b.className = 'clwm-item';
                b.textContent = '✏️ ' + (c.title || c.noteId);
                b.addEventListener('click', () => abrirEditorCard(nota.noteId, c.noteId));
                div.appendChild(b);
            }
        } catch (e) {
            status('❌ ' + t('cards.list_error') + ((e && e.message) || e));
            voltarMenu();
        }
    }

    async function abrirEditorCard(canvasNoteId, noteId) {
        try {
            const dados = await api.runOnBackend(CLW_BE_EDITOR_LOAD, [noteId]);
            if (!dados) { status('⚠️ ' + t('editor.no_note')); return; }

            const div = document.getElementById('clwm-sub-conteudo');
            div.innerHTML = `
                <input type="text" id="clwm-ed-titulo" value="${escapeHtml(dados.title || '')}" autocomplete="off">
                <div class="clwm-ed-conteudo" id="clwm-ed-conteudo" contenteditable="true" spellcheck="false">${dados.content || ''}</div>
                <button class="clwm-btn" id="clwm-ed-salvar">💾 ${escapeHtml(t('editor.save'))}</button>`;

            document.getElementById('clwm-ed-salvar').addEventListener('click', async () => {
                const titulo = (document.getElementById('clwm-ed-titulo').value || '').trim() || 'Sem título';
                const conteudo = document.getElementById('clwm-ed-conteudo').innerHTML;
                status('💾 …');
                try {
                    await api.runOnBackend(CLW_BE_EDITOR_SAVE, [noteId, titulo, conteudo]);
                    await api.runOnBackend(CLW_BE_SYNC, [canvasNoteId, noteId, CARD_CONFIG, getCleanPatterns()]);
                    status(t('editor.saved'));
                    voltarMenu();
                } catch (e) {
                    status('❌ ' + t('editor.error') + ((e && e.message) || e));
                }
            });
        } catch (e) {
            status('❌ ' + ((e && e.message) || e));
        }
    }

    /* ── Mais: remover card ──────────────────────────────── */
    async function abrirRemover() {
        const nota = canvasAtivo();
        if (!nota) { status('⚠️ ' + t('common.no_canvas')); return; }

        subPainel('<div class="clwm-vazio">…</div>');
        try {
            const cards = await listarCards(nota.noteId);
            const div = document.getElementById('clwm-sub-conteudo');
            div.innerHTML = '';
            if (!cards.length) { div.innerHTML = '<div class="clwm-vazio">' + t('relations.no_cards') + '</div>'; return; }

            for (const c of cards) {
                const b = document.createElement('button');
                b.className = 'clwm-item perigo';
                b.textContent = '🗑️ ' + (c.title || c.noteId);
                let confirmando = false;
                b.addEventListener('click', async () => {
                    if (!confirmando) {
                        confirmando = true;
                        b.textContent = '⚠️ ' + t('remove.title') + '?';
                        setTimeout(() => { if (confirmando) { confirmando = false; b.textContent = '🗑️ ' + (c.title || c.noteId); } }, 3000);
                        return;
                    }
                    try {
                        const n = await api.runOnBackend(CLW_BE_REMOVE, [nota.noteId, c.noteId, backendLabels()]);
                        status(n > 0 ? t('remove.done') : t('remove.not_found'));
                        b.remove();
                    } catch (e) {
                        status('❌ ' + t('remove.error') + ((e && e.message) || e));
                    }
                });
                div.appendChild(b);
            }
        } catch (e) {
            status('❌ ' + t('cards.list_error') + ((e && e.message) || e));
            voltarMenu();
        }
    }

    /* ── Mais: relações por seta ─────────────────────────── */
    async function abrirRelacoes() {
        const nota = canvasAtivo();
        if (!nota) { status('⚠️ ' + t('common.no_canvas')); return; }

        subPainel('<div class="clwm-vazio">…</div>');
        try {
            const { pairs: pares } = await api.runOnBackend(CLW_BE_REL_PAIRS, [nota.noteId, backendLabels()]);
            const div = document.getElementById('clwm-sub-conteudo');
            div.innerHTML = '';
            if (!pares.length) { div.innerHTML = '<div class="clwm-vazio">' + t('relations.empty') + '</div>'; return; }

            const opcoes = relationOptionsHtml(t);

            pares.forEach((p, i) => {
                const bloco = document.createElement('div');
                bloco.className = 'clwm-rel';
                bloco.innerHTML = `
                    <div class="clwm-rel-titulo">${escapeHtml(p.fromTitle)} → ${escapeHtml(p.toTitle)}</div>
                    ${p.arrowText ? `<div class="clwm-rel-seta">“${escapeHtml(p.arrowText)}”</div>` : ''}
                    <select id="clwm-rel-sel-${i}" data-from="${p.fromNoteId}" data-to="${p.toNoteId}" data-textel="${p.arrowTextElId || ''}">${opcoes}</select>`;
                div.appendChild(bloco);

                if (p.arrowText) {
                    const low = p.arrowText.toLowerCase().trim();
                    const achou = RELATION_TYPES.find((r) => r.value === low || t(r.labelKey).toLowerCase() === low);
                    if (achou) bloco.querySelector('select').value = achou.value;
                }
            });

            const salvar = document.createElement('button');
            salvar.className = 'clwm-btn';
            salvar.textContent = '💾 ' + t('relations.save');
            salvar.addEventListener('click', async () => {
                const relations = [];
                pares.forEach((p, i) => {
                    const sel = document.getElementById('clwm-rel-sel-' + i);
                    if (!sel || sel.value === 'none') return;
                    const rel = RELATION_TYPES.find((r) => r.value === sel.value);
                    relations.push({
                        fromNoteId: p.fromNoteId,
                        toNoteId:   p.toNoteId,
                        relType:    sel.value,
                        textElId:   p.arrowTextElId || '',
                        newText:    p.arrowTextElId && rel ? rel.label : '',
                    });
                });
                if (!relations.length) { status('ℹ️ ' + t('relations.none')); return; }
                try {
                    const n = await api.runOnBackend(CLW_BE_REL_SAVE, [nota.noteId, relations]);
                    status(t('relations.saved', { n }));
                    voltarMenu();
                } catch (e) {
                    status('❌ ' + t('relations.error') + ((e && e.message) || e));
                }
            });
            div.appendChild(salvar);
        } catch (e) {
            status('❌ ' + ((e && e.message) || e));
            voltarMenu();
        }
    }

    /* ── Diálogo ─────────────────────────────────────────── */
    function remover() {
        const el = document.getElementById('clwm-root');
        if (el) el.remove();
    }

    function abrir() {
        remover();

        const root = document.createElement('div');
        root.id = 'clwm-root';
        root.innerHTML = `
            <style>${CSS}</style>
            <div class="clwm-box">
                <div class="clwm-head">
                    <h2>🎨 Canvas Mobile</h2>
                    <button class="clwm-x" id="clwm-fechar">✖</button>
                </div>
                <div class="clwm-info" id="clwm-info"></div>
                <div class="clwm-tabs">
                    <button class="clwm-tab ativo" data-painel="fluxo">🪄 Fluxo</button>
                    <button class="clwm-tab" data-painel="tpl">🧩 Templates</button>
                    <button class="clwm-tab" data-painel="inserir">🔗 Inserir</button>
                    <button class="clwm-tab" data-painel="mais">🛠️ Mais</button>
                </div>
                <div class="clwm-body">
                    <div class="clwm-painel ativo" id="clwm-p-fluxo">
                        <textarea id="clwm-dsl" spellcheck="false"></textarea>
                        <div style="display:flex;align-items:center;gap:8px;margin-top:10px">
                            <label style="font-size:13px">${escapeHtml(t('flow.direction'))}</label>
                            <select id="clwm-dir">
                                <option value="TB">${escapeHtml(t('flow.tb'))}</option>
                                <option value="LR">${escapeHtml(t('flow.lr'))}</option>
                            </select>
                        </div>
                        <button class="clwm-btn" id="clwm-gerar">🪄 ${escapeHtml(t('flow.generate'))}</button>
                    </div>
                    <div class="clwm-painel" id="clwm-p-tpl">
                        <input type="text" id="clwm-tpl-filtro" placeholder="${escapeHtml(t('tpl.filter'))}" autocomplete="off">
                        <div class="clwm-lista" id="clwm-tpl-lista"></div>
                    </div>
                    <div class="clwm-painel" id="clwm-p-inserir">
                        <input type="text" id="clwm-busca" placeholder="${escapeHtml(t('search.title'))}" autocomplete="off">
                        <button class="clwm-btn" id="clwm-buscar">🔍 ${escapeHtml(t('btn.insert'))}</button>
                        <div class="clwm-lista" id="clwm-busca-lista"></div>
                    </div>
                    <div class="clwm-painel" id="clwm-p-mais">
                        <div id="clwm-mais-menu">
                            <input type="text" id="clwm-nova-titulo" placeholder="${escapeHtml(t('newnote.placeholder'))}" autocomplete="off">
                            <button class="clwm-btn" id="clwm-nova-criar">📝 ${escapeHtml(t('newnote.create'))}</button>
                            <button class="clwm-btn" id="clwm-sync">⟳ ${escapeHtml(t('btn.sync'))}</button>
                            <button class="clwm-btn" id="clwm-longform">📄 ${escapeHtml(t('btn.longform'))}</button>
                            <button class="clwm-btn" id="clwm-ir-editar">✏️ ${escapeHtml(t('editor.title'))}</button>
                            <button class="clwm-btn" id="clwm-ir-remover">🗑️ ${escapeHtml(t('remove.title'))}</button>
                            <button class="clwm-btn" id="clwm-ir-relacoes">🕸️ ${escapeHtml(t('relations.title'))}</button>
                        </div>
                        <div id="clwm-mais-sub" style="display:none">
                            <button class="clwm-btn clwm-btn-sec" id="clwm-voltar">‹ Voltar</button>
                            <div id="clwm-sub-conteudo"></div>
                        </div>
                    </div>
                </div>
                <div class="clwm-status" id="clwm-status"></div>
            </div>`;

        document.body.appendChild(root);

        // idioma da interface do Trilium (assíncrono; refaz a UI se divergir)
        api.runOnBackend(() => {
            const opt = api.getOption('locale');
            return opt ? opt.value : null;
        }).then((locale) => {
            const novo = clwNormalizeLang(locale || navigator.language);
            if (novo !== lang) { lang = novo; abrir(); }
        }).catch(() => undefined);

        // conteúdo inicial
        const dsl = document.getElementById('clwm-dsl');
        dsl.value = flowDefaultSpec(lang);

        info();

        // eventos
        document.getElementById('clwm-fechar').addEventListener('click', remover);
        root.addEventListener('click', (e) => { if (e.target === root) remover(); });

        root.querySelectorAll('.clwm-tab').forEach((b) => {
            b.addEventListener('click', () => {
                root.querySelectorAll('.clwm-tab').forEach((x) => x.classList.toggle('ativo', x === b));
                root.querySelectorAll('.clwm-painel').forEach((p) => {
                    p.classList.toggle('ativo', p.id === 'clwm-p-' + b.dataset.painel);
                });
                if (b.dataset.painel === 'tpl') abrirTemplates();
                if (b.dataset.painel !== 'mais') voltarMenu();
            });
        });

        document.getElementById('clwm-gerar').addEventListener('click', gerarFluxo);
        document.getElementById('clwm-buscar').addEventListener('click', buscarNotas);
        document.getElementById('clwm-busca').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') buscarNotas();
        });
        document.getElementById('clwm-tpl-filtro').addEventListener('input', renderTemplates);

        document.getElementById('clwm-nova-criar').addEventListener('click', criarNota);
        document.getElementById('clwm-sync').addEventListener('click', sincronizar);
        document.getElementById('clwm-longform').addEventListener('click', criarLongform);
        document.getElementById('clwm-ir-editar').addEventListener('click', abrirEditar);
        document.getElementById('clwm-ir-remover').addEventListener('click', abrirRemover);
        document.getElementById('clwm-ir-relacoes').addEventListener('click', abrirRelacoes);
        document.getElementById('clwm-voltar').addEventListener('click', voltarMenu);
    }

    abrir();
})();
