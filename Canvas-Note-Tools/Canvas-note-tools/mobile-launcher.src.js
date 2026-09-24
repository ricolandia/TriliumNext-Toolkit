/* ============================================================
 * CANVAS MOBILE (v9 MVP) — diálogo acionado por nota launcher
 *
 * Ações desta versão: 🪄 Fluxo (DSL) · 🧩 Templates · 🔗 Inserir nota
 * Depende do bloco gerado antes deste arquivo:
 *   - engine: CARD_CONFIG, FLOW_CONFIG, getCleanPatterns, flowDefaultSpec,
 *             parseFlowSpec, buildFlowElements, escapeHtml
 *   - i18n:   CLW_I18N, clwNormalizeLang, clwTranslate
 *   - backends: CLW_BE_INSERT, CLW_BE_TPL, CLW_BE_FLOW
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
      #clwm-root .clwm-tabs { display: flex; gap: 6px; padding: 10px 14px 0; }
      #clwm-root .clwm-tab {
        flex: 1; padding: 10px 6px; font-size: 13px; border-radius: 8px;
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

      #clwm-root textarea, #clwm-root input[type=text] {
        width: 100%; padding: 10px; font-size: 14px; border-radius: 8px;
        border: 1px solid var(--main-border-color, #ccc);
        background: var(--main-background-color, #fff); color: inherit;
        font-family: monospace;
      }
      #clwm-root textarea { min-height: 150px; resize: vertical; }

      #clwm-root .clwm-btn {
        display: block; width: 100%; margin-top: 10px; padding: 12px;
        font-size: 14px; border-radius: 8px; font-weight: bold;
        border: 1px solid var(--main-border-color, #ccc);
        background: var(--button-background-color, var(--accented-background-color, #f0f0f0));
        color: var(--button-text-color, var(--main-text-color, inherit));
        cursor: pointer;
      }
      #clwm-root .clwm-btn:active { filter: brightness(.92); }

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
      #clwm-root .clwm-vazio { font-family: monospace; font-size: 12px; opacity: .6; padding: 6px 2px; }
      #clwm-root .clwm-status {
        padding: 10px 14px; font-family: monospace; font-size: 12px;
        border-top: 1px solid var(--main-border-color, #ccc);
        white-space: pre-wrap; word-break: break-word; min-height: 1.2em;
      }
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

    /* ── Ações ───────────────────────────────────────────── */
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
                </div>
                <div class="clwm-body">
                    <div class="clwm-painel ativo" id="clwm-p-fluxo">
                        <textarea id="clwm-dsl" spellcheck="false"></textarea>
                        <div class="clwm-row" style="display:flex;align-items:center;gap:8px;margin-top:10px">
                            <label style="font-size:13px">${escapeHtml(t('flow.direction'))}</label>
                            <select id="clwm-dir" style="flex:1;padding:10px;border-radius:8px;border:1px solid var(--main-border-color,#ccc);background:var(--main-background-color,#fff);color:inherit">
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
            });
        });

        document.getElementById('clwm-gerar').addEventListener('click', gerarFluxo);
        document.getElementById('clwm-buscar').addEventListener('click', buscarNotas);
        document.getElementById('clwm-busca').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') buscarNotas();
        });
        document.getElementById('clwm-tpl-filtro').addEventListener('input', renderTemplates);
    }

    abrir();
})();
