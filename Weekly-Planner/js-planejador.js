/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║          Workspace de Tarefas — TriliumNext                 ║
 * ║                                                             ║
 * ║  ┌──────────────────────────┬──────────────┐               ║
 * ║  │   Planejador Semanal     │ Tarefas       │               ║
 * ║  │        (2/3)             │ Abertas (1/3) │               ║
 * ║  └──────────────────────────┴──────────────┘               ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * INTERAÇÕES:
 *   Planner  →  arrastar tarefa entre colunas (desktop)
 *               tap → sheet picker (mobile)
 *   Tarefas  →  ☐ clicar no quadradinho  →  marca como concluída na nota
 *               clicar no texto          →  abre a nota de origem
 *               badge [Qua 14/5]         →  indica dia já planejado
 *
 * SETUP:
 *   1. Nota "JS Frontend" → cole este código
 *   2. Nota "Render"      → ~renderNote → JS acima
 *   3. Crie uma nota de texto qualquer com a label  #plannerdata
 *      (corpo vazio — ela armazena o JSON do planejador)
 *   4. Abra a nota Render (F5 para recarregar)
 *
 * CHANGELOG:
 *   - Suporte a tags: #todo, #doing=N%, #done, #upto=MM-DD-YYYY
 *     com badges coloridos (laranja, amarelo, verde, azul)
 *     e barra de progresso para #doing
 *   - Tags aparecem nos cards do planner e na lista de tarefas
 *   - Cross-theme: cores funcionam em tema claro e escuro
 *   - Fix: ID de tarefa agora usa noteId::cbIndex em vez de
 *          noteId::texto — elimina colisões entre tarefas com
 *          texto parecido na mesma nota.
 *   - Migração automática de IDs antigos na primeira carga.
 */

(async function () {

    /* ═══════════════════════════════════════════════════════════
       0. ROOT — layout de duas colunas
    ═══════════════════════════════════════════════════════════ */

    const $root = $container;

    /* I18N (início) — PT/EN conforme o idioma da interface do Trilium (locale) */
    const WP_I18N = {
        pt: {
            planner: 'Planejador', tasks: 'Tarefas',
            week: 'Semana', month: 'Mês', gantt: 'Gantt', backlog: 'Backlog',
            noDate: 'sem data', today: 'hoje', backlogCount: '{n} sem data',
            prevWeek: 'Semana anterior', nextWeek: 'Próxima semana',
            prevMonth: 'Mês anterior', nextMonth: 'Próximo mês',
            viewMode: 'Ver {label}',
            clearWeek: 'Limpar esta semana', clearMonth: 'Limpar este mês',
            reload: 'Recarregar tarefas', markDone: 'Marcar como concluída',
            openNote: '↗ Abrir nota', backToBacklog: '↩ Backlog',
            cancel: 'Cancelar', undo: 'Desfazer',
            loading: 'Carregando…',
            untitled: '(sem título)',
            noOpenTasks: '✓ Nenhuma tarefa aberta.',
            dropHere: 'solte uma tarefa aqui',
            noWeekTasks: 'Nenhuma tarefa agendada nesta semana',
            dragFromBacklog: 'Arraste tarefas do backlog para os dias no modo Semana',
            linksInNote: '{n} link(s) interno(s) nesta nota',
            donePrefix: 'Concluída: ',
            cleared: 'Planejamento limpo ({n} tarefa(s))',
            clearAsk: 'Limpar o planejamento de {rotulo}? {n} tarefa(s) serão desagendadas.',
            clearOk: 'Limpar',
            nothingToClear: 'Nada para limpar em {rotulo}.',
            duplicateWeek: 'Rolar para a próxima semana',
            nothingToDuplicate: 'Nada para rolar nesta semana.',
            duplicated: 'Semana rolada ({n} tarefa(s))',
            saveError: 'Erro ao salvar o planejamento: {err} Verifique se a nota com a label #plannerdata existe.',
            reloadError: 'Falha ao recarregar: {err}',
            taskError: 'Não foi possível concluir a tarefa: {err}',
            undoError: 'Não foi possível desfazer: {err}',
            missingData: 'Nota com a label #plannerdata não encontrada: o planejamento não será salvo. Crie uma nota de código (JSON) com as labels #plannerdata e #data.',
            corruptData: 'O planner-data.json está ilegível. O planejamento abriu vazio; o conteúdo antigo está no console.',
            initError: '✗ Erro ao inicializar: {err}',
            retry: 'Tentar de novo',
            saving: 'salvando…', saved: 'salvo ✓', saveFailed: 'erro ✗',
            moreTasks: 'tarefa(s)', moveHint: 'm: mover para outro dia',
        },
        en: {
            planner: 'Planner', tasks: 'Tasks',
            week: 'Week', month: 'Month', gantt: 'Gantt', backlog: 'Backlog',
            noDate: 'no date', today: 'today', backlogCount: '{n} without date',
            prevWeek: 'Previous week', nextWeek: 'Next week',
            prevMonth: 'Previous month', nextMonth: 'Next month',
            viewMode: 'View {label}',
            clearWeek: 'Clear this week', clearMonth: 'Clear this month',
            reload: 'Reload tasks', markDone: 'Mark as done',
            openNote: '↗ Open note', backToBacklog: '↩ Backlog',
            cancel: 'Cancel', undo: 'Undo',
            loading: 'Loading…',
            untitled: '(untitled)',
            noOpenTasks: '✓ No open tasks.',
            dropHere: 'drop a task here',
            noWeekTasks: 'No tasks scheduled this week',
            dragFromBacklog: 'Drag tasks from the backlog onto the days in Week mode',
            linksInNote: '{n} internal link(s) in this note',
            donePrefix: 'Done: ',
            cleared: 'Planning cleared ({n} task(s))',
            clearAsk: 'Clear planning for {rotulo}? {n} task(s) will be unscheduled.',
            clearOk: 'Clear',
            nothingToClear: 'Nothing to clear in {rotulo}.',
            duplicateWeek: 'Roll over to next week',
            nothingToDuplicate: 'Nothing to roll over this week.',
            duplicated: 'Week rolled over ({n} task(s))',
            saveError: 'Failed to save planning: {err} Check that the note labeled #plannerdata exists.',
            reloadError: 'Failed to reload: {err}',
            taskError: 'Could not complete the task: {err}',
            undoError: 'Could not undo: {err}',
            missingData: 'Note labeled #plannerdata not found: planning will not be saved. Create a JSON code note with the labels #plannerdata and #data.',
            corruptData: 'planner-data.json is unreadable. Planning opened empty; the old content is in the console.',
            initError: '✗ Failed to initialize: {err}',
            retry: 'Try again',
            saving: 'saving…', saved: 'saved ✓', saveFailed: 'error ✗',
            moreTasks: 'task(s)', moveHint: 'm: move to another day',
        },
    };
    const WP_DIAS      = { pt: ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'], en: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'] };
    const WP_DIAS_CURTO= { pt: ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'], en: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'] };
    const WP_MESES     = { pt: ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'],
                           en: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'] };
    let wpLang = (typeof navigator !== 'undefined' && /^en/i.test(String(navigator.language || ''))) ? 'en' : 'pt';
    function tr(key, vars) {
        const d = WP_I18N[wpLang] || WP_I18N.pt;
        let s = d[key] != null ? d[key] : (WP_I18N.pt[key] != null ? WP_I18N.pt[key] : key);
        if (vars) for (const k of Object.keys(vars)) s = s.split('{' + k + '}').join(String(vars[k]));
        return s;
    }
    /* I18N (fim) */
    // Data curta conforme o idioma: PT dd/mm, EN mm/dd
    function fmtCurto(d) {
        const dt = d instanceof Date ? d : new Date(d);
        return wpLang === 'en' ? `${dt.getMonth() + 1}/${dt.getDate()}` : `${dt.getDate()}/${dt.getMonth() + 1}`;
    }

    // Hoista <style> de qualquer HTML injetado para o <head> — render notes podem
    // ignorar style inline e o visual não pode depender do tema (ex.: Folio).
    (function () {
        if (typeof document === 'undefined' || typeof $ === 'undefined' || !$.fn) return;
        if (window.__wpPatched) return; // patch global: instala uma única vez por página
        window.__wpPatched = true;
        const getStyleEl = () => {
            let el = document.getElementById('wp-injected-css');
            if (!el) {
                el = document.createElement('style');
                el.id = 'wp-injected-css';
                document.head.appendChild(el);
            }
            return el;
        };
        const hoist = (html) => {
            const str = String(html);
            if (!str.includes('<style>')) return str;
            const styleEl = getStyleEl();
            const re = /<style>([\s\S]*?)<\/style>/g;
            let m;
            while ((m = re.exec(str)) !== null) {
                if (!styleEl.textContent.includes(m[1])) styleEl.textContent += '\n' + m[1];
            }
            return str.replace(re, '');
        };
        const origHtml = $.fn.html;
        const origAppend = $.fn.append;
        $.fn.html = function (arg) {
            if (typeof arg === 'string' && arg.includes('<style>')) arg = hoist(arg);
            return origHtml.apply(this, [arg]);
        };
        $.fn.append = function (arg) {
            if (typeof arg === 'string' && arg.includes('<style>')) arg = hoist(arg);
            return origAppend.apply(this, [arg]);
        };
    })();

    // id fixo no root → especificidade de ID vence qualquer CSS global do Trilium (#app *, button…)
    $root.attr('id', 'wp-root');
    $root.attr('tabindex', '-1'); // permite foco no plugin (atalhos de teclado)

    // Tema claro? (brilho de --main-background-color) → as tags usam cores mais escuras
    (function marcarTemaClaro() {
        try {
            const raw = String(getComputedStyle(document.body).getPropertyValue('--main-background-color') || '').trim();
            let r = null, g = null, b = null;
            let m = raw.match(/^#([0-9a-f]{6})$/i);
            if (m) {
                r = parseInt(m[1].slice(0, 2), 16); g = parseInt(m[1].slice(2, 4), 16); b = parseInt(m[1].slice(4, 6), 16);
            } else {
                m = raw.match(/rgba?\(([^)]+)\)/i);
                if (m) { const p = m[1].split(',').map(s => parseFloat(s)); r = p[0]; g = p[1]; b = p[2]; }
            }
            if (r != null && (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.55) $root.addClass('wp-light');
        } catch (_) {}
    })();

    $root.addClass('wp-root').css({
        display:    'flex',
        height:     '100%',
        overflow:   'hidden',
        position:   'relative',
        fontFamily: 'var(--detail-font-family,"Segoe UI",sans-serif)',
        fontSize:   '14px',
        color:      'var(--main-text-color)',
        boxSizing:  'border-box',
    });

    // Mobile/estreito: empilha planner (acima) + tarefas (abaixo) em vez de duas colunas
    $root.append(`
        <style>
        /* Nunca ultrapassar a largura visível (webview/containers mais largos que a tela) */
        #wp-root { max-width:100vw !important; min-width:0 !important; }

        /* ── Desktop (>1024px): coluna compacta + tipografia normal ──
           Seletores com especificidade alta p/ vencer o CSS global do Trilium */
        @media (min-width:1025px) {
            #wp-root .wp-tk { max-width:280px !important; min-width:0 !important; }
            #wp-root .pl-task { font-size:16px !important; }
            #wp-root.wp-root .wp-tk .tk-head { padding:10px 14px !important; }
            #wp-root.wp-root .wp-tk .tk-head .tk-head-title { font-size:18px !important; }
            #wp-root.wp-root .wp-tk .tk-total { font-size:15px !important; }
            #wp-root.wp-root .wp-tk .tk-list { padding:12px 14px !important; }
            #wp-root.wp-root .wp-tk .tk-list .tk-empty { font-size:16px !important; }
            #wp-root.wp-root .wp-tk .tk-list .tk-note-link { font-size:14px !important; padding:8px 10px !important; }
            #wp-root.wp-root .wp-tk .tk-list .tk-badge { font-size:13px !important; }
            #wp-root.wp-root .wp-tk .tk-list .tk-task-text { font-size:16px !important; line-height:1.5 !important; }
            #wp-root.wp-root .wp-tk .tk-list .tk-tasks .tk-task-row { padding:4px 8px !important; }
            #wp-root.wp-root .wp-tk .tk-list .tk-day-badge { font-size:13px !important; padding:1px 6px !important; }
            #wp-root.wp-root .wp-tk .tk-list .tk-tasks { margin:0 10px !important; padding:6px 0 8px 10px !important; }
            #wp-root.wp-root .wp-tk .tk-list .tk-group { margin-bottom:14px !important; }
        }

        /* ── Mobile/estreito (≤1024px): empilha; planner flex:1; Tarefas 32vh;
              tipografia compacta ── */
        @media (max-width:1024px) {
            #wp-root { flex-direction:column !important; }
            #wp-root .wp-pl { flex:1 1 auto !important; width:100% !important;
                              min-height:0 !important; max-width:none !important;
                              min-width:0 !important; border-right:none !important;
                              border-bottom:1px solid var(--main-border-color,#313244); }
            #wp-root .wp-tk { flex:0 0 32vh !important; width:100% !important;
                              max-width:none !important; min-width:0 !important; }
            #wp-root.wp-root .wp-tk .tk-head { padding:6px 12px !important; }
            #wp-root.wp-root .wp-tk .tk-head .tk-head-title { font-size:12px !important; }
            #wp-root.wp-root .wp-tk .tk-total { font-size:10px !important; }
            #wp-root.wp-root .wp-tk .tk-list { padding:6px 8px !important; }
            #wp-root.wp-root .wp-tk .tk-list .tk-empty { font-size:11px !important; }
            #wp-root.wp-root .wp-tk .tk-list .tk-note-link { font-size:11px !important; padding:5px 8px !important; }
            #wp-root.wp-root .wp-tk .tk-list .tk-badge { font-size:8px !important; }
            #wp-root.wp-root .wp-tk .tk-list .tk-task-text { font-size:11px !important; line-height:1.3 !important; }
            #wp-root.wp-root .wp-tk .tk-list .tk-tasks .tk-task-row { padding:2px 6px !important; }
            #wp-root.wp-root .wp-tk .tk-list .tk-day-badge { font-size:8px !important; padding:0 3px !important; }
            #wp-root.wp-root .wp-tk .tk-list .tk-tasks { margin:0 6px !important; padding:3px 0 5px 8px !important; }
            #wp-root.wp-root .wp-tk .tk-list .tk-group { margin-bottom:8px !important; }
            /* Seletor de modo único: vira uma linha de largura total no fim do cabeçalho */
            #wp-root .pl-mode-switch { display:flex !important; width:100% !important;
                                       margin-left:0 !important; order:10 !important;
                                       gap:4px !important; box-sizing:border-box !important; }
            #wp-root .pl-mode-switch .pl-mode-btn { flex:1 1 0 !important; min-width:0 !important;
                                                    max-width:100% !important; box-sizing:border-box !important;
                                                    text-align:center !important; padding:6px 2px !important;
                                                    font-size:12px !important; white-space:nowrap !important;
                                                    overflow:hidden !important;
                                                    text-overflow:ellipsis !important; }
            #wp-root .pl-mode-btn { cursor:pointer; user-select:none; box-sizing:border-box; }

            /* Alvos de toque maiores no mobile (webview Capacitor) */
            #wp-root .pl-nav-btn { width:36px !important; height:34px !important; }
            #wp-root .pl-icon-btn { padding:7px 11px !important; }
            #wp-root .pl-done-btn { padding:2px 7px !important; font-size:18px !important; }
            #wp-root .gantt-blog-check { width:19px !important; height:19px !important; }
            #wp-root .tk-check { width:19px !important; height:19px !important; }
        }

        /* ── Indicador de links internos (@nota) nos cards ── */
        #wp-root .task-links {
            display:inline-block; margin-top:3px; padding:0 6px;
            font-size:10px; line-height:1.6; border-radius:99px;
            border:1px solid var(--main-border-color,#45475a);
            color:var(--muted-text-color,#888);
            vertical-align:middle; white-space:nowrap;
        }

        /* "+N" — expande listas limitadas */
        #wp-root .wp-mais { display:block; width:100%; margin-top:4px; padding:4px 6px;
                            background:none; border:1px dashed var(--main-border-color,#45475a);
                            border-radius:5px; color:var(--muted-text-color,#888);
                            font-size:12px; cursor:pointer; text-align:center; }
        #wp-root .wp-mais:hover { color:var(--main-text-color); border-color:var(--main-text-color); }
        /* Indicador salvando/salvo/erro no cabeçalho */
        #wp-root .wp-save { font-size:12px; color:var(--muted-text-color,#888); margin-left:4px; white-space:nowrap; }
        #wp-root .wp-save--ok { color:var(--active-item-background-color,#a6e3a1); }
        #wp-root .wp-save--error { color:#e78284; }

        /* Foco visível em todos os controles (a11y) */
        #wp-root .pl-task:focus-visible, #wp-root .mn-task:focus-visible, #wp-root .mn-blog-item:focus-visible,
        #wp-root .gantt-bar:focus-visible, #wp-root .gantt-blog-item:focus-visible,
        #wp-root .pl-done-btn:focus-visible, #wp-root .mn-done-btn:focus-visible,
        #wp-root .gantt-done-btn:focus-visible, #wp-root .gantt-blog-check:focus-visible,
        #wp-root .tk-check:focus-visible, #wp-root .tk-task-text:focus-visible,
        #wp-root .gantt-blog-text:focus-visible, #wp-root .mn-blog-text:focus-visible,
        #wp-root .pl-nav-btn:focus-visible, #wp-root .pl-icon-btn:focus-visible,
        #wp-root .pl-today-btn:focus-visible, #wp-root .wp-undo-btn:focus-visible,
        #wp-root .pl-mode-btn:focus-visible {
            outline:2px solid var(--main-active-border-color,#89b4fa); outline-offset:2px;
        }

        /* Hover/foco do painel de Tarefas em CSS (sem handlers de mouse) */
        #wp-root .tk-task-text:hover { text-decoration:underline; }
        #wp-root .tk-note-link:hover { color:var(--main-text-color); }
        #wp-root .tk-check:not(.completing):hover {
            border-color:var(--main-text-color); background:var(--accented-background-color,#313244);
            color:var(--muted-text-color,#888);
        }

        /* Respeita quem prefere menos movimento */
        @media (prefers-reduced-motion: reduce) {
            #wp-root * { animation-duration:.001ms !important; animation-iteration-count:1 !important;
                         transition-duration:.001ms !important; }
        }
        </style>`);

    // Um único listener nativo (re-execuções do render note não acumulam), com debounce e
    // re-render quando o breakpoint desktop↔mobile é cruzado.
    let wpUltimoMobile = null;
    let wpResizeTimer = null;
    function aoRedimensionar() {
        clearTimeout(wpResizeTimer);
        wpResizeTimer = setTimeout(() => {
            const m = isMobile();
            if (wpUltimoMobile === null) { wpUltimoMobile = m; return; }
            if (m !== wpUltimoMobile) {
                wpUltimoMobile = m;
                renderPlanner();
                renderTasks();
            }
        }, 140);
    }
    window.__wpAoRedimensionar = aoRedimensionar;
    if (!window.__wpResizeBound) {
        window.__wpResizeBound = true;
        window.addEventListener('resize', () => window.__wpAoRedimensionar && window.__wpAoRedimensionar());
    }

    // painel esquerdo — Planejador (2/3)
    const $pl = $('<div class="wp-pl">').css({
        flex:          '2',
        minWidth:      0,
        overflow:      'hidden',
        display:       'flex',
        flexDirection: 'column',
        position:      'relative',
        borderRight:   '1px solid var(--main-border-color,#313244)',
    }).appendTo($root);

    // painel direito — Tarefas Abertas (1/3)
    const $tk = $('<div class="wp-tk">').css({
        flex:          '1',
        minWidth:      '200px',
        maxWidth:      '320px',
        overflow:      'hidden',
        display:       'flex',
        flexDirection: 'column',
    }).appendTo($root);

    const telaCarregando = () => `
        <div style="display:flex;align-items:center;gap:10px;padding:24px;color:var(--muted-text-color)">
            <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none"
                 style="animation:spin 1s linear infinite;flex-shrink:0">
                <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="2"
                        stroke-dasharray="28" stroke-dashoffset="10"/>
            </svg>
            ${tr('loading')}
        </div>`;

    $pl.html(telaCarregando());
    $tk.html(telaCarregando());


    /* ═══════════════════════════════════════════════════════════
       1. ESTADO COMPARTILHADO
    ═══════════════════════════════════════════════════════════ */

    let weekOffset  = 0;
    let monthOffset = 0;
    let allTasks    = [];    // { id, text, tags, checkboxIndex, noteId, noteTitle }
    let plannerData = {};    // { taskId: 'YYYY-MM-DD' }
    let viewMode    = 'kanban'; // 'kanban' | 'gantt' | 'month'
    let cbStats     = {};    // { noteId: { checked, total } }
    let collapsedNotes = new Set(); // noteIds colapsados na lista de tarefas


    /* ═══════════════════════════════════════════════════════════
       2. PERSISTÊNCIA (nota #plannerdata)
    ═══════════════════════════════════════════════════════════ */

    async function loadPlannerData() {
        return await api.runOnBackend(() => {
            const note = api.getNoteWithLabel('plannerdata');
            if (!note) return { ok: false, missing: true, data: {} };
            try {
                const raw = note.getContent();
                return { ok: true, data: raw ? JSON.parse(raw) : {} };
            } catch (e) {
                return { ok: false, corrupt: true, raw: String(e.message || e), data: {} };
            }
        });
    }

    async function save() {
        invalidarIndice();
        saveState = 'saving';
        atualizarSaveStatus();
        try {
            const data = JSON.stringify(plannerData, null, 2);
            await api.runAsyncOnBackendWithManualTransactionHandling(
                async (jsonData) => {
                    const note = api.getNoteWithLabel('plannerdata');
                    if (!note) throw new Error('Nota #plannerdata não encontrada');
                    note.setContent(jsonData);
                    await note.save();
                },
                [data]
            );
            saveState = 'saved';
            atualizarSaveStatus();
            setTimeout(() => {
                if (saveState === 'saved') { saveState = 'idle'; atualizarSaveStatus(); }
            }, 2500);
            return true;
        } catch (err) {
            console.error('save error:', err);
            saveState = 'error';
            atualizarSaveStatus();
            aviso(tr('saveError', { err: err.message || err }));
            return false;
        }
    }

    // Recarrega tarefas + dados (usado pelos botões ⟳ e pelo atalho "r")
    async function recarregarTarefas() {
        try {
            const loaded = await loadPlannerData();
            if (loaded.ok) plannerData = loaded.data || {};
            await fetchTasks();
        } catch (err) {
            console.error('reload error:', err);
            aviso(tr('reloadError', { err: err.message || err }));
        }
        renderPlanner();
        renderTasks();
    }


    /* ═══════════════════════════════════════════════════════════
       2b. PARSE DE TAGS (#todo, #doing=N%, #done, #upto=MM-DD-YYYY)
    ═══════════════════════════════════════════════════════════ */

    /* TAGS (início) — parse das tags #todo/#doing/#done/#upto/#every/#total (pura, testável) */
    function parseTaskTags(text) {
        const tags = [];
        let cleanText = String(text);

        // #doing=N% ou #doing=N (0-100)
        cleanText = cleanText.replace(/#doing=(\d{1,3})%?/gi, (m, n) => {
            const v = Math.max(0, Math.min(100, parseInt(n, 10)));
            tags.push({ type: 'progress', value: v, label: `#doing=${v}%` });
            return '';
        });

        // #upto=MM-DD-YYYY → armazena como YYYY-MM-DD
        cleanText = cleanText.replace(/#upto=(\d{2})-(\d{2})-(\d{4})/gi, (match, mo, d, y) => {
            tags.push({ type: 'deadline', value: `${y}-${mo}-${d}`, label: `#upto=${mo}-${d}-${y}` });
            return '';
        });

        // #todo
        cleanText = cleanText.replace(/#todo\b/gi, () => {
            tags.push({ type: 'status', value: 'todo', label: '#todo' });
            return '';
        });

        // #done
        cleanText = cleanText.replace(/#done\b/gi, () => {
            tags.push({ type: 'status', value: 'done', label: '#done' });
            return '';
        });

        // #every=Nd (recorrência)
        cleanText = cleanText.replace(/#every=(\d+)\s*d\b/gi, (m, n) => {
            tags.push({ type: 'recur', value: parseInt(n, 10), label: `#every=${n}d` });
            return '';
        });

        // #total=N
        cleanText = cleanText.replace(/#total=(\d+)/gi, (m, n) => {
            tags.push({ type: 'total', value: parseInt(n, 10), label: `#total=${n}` });
            return '';
        });

        cleanText = cleanText.replace(/\s+/g, ' ').trim();
        return { cleanText, tags };
    }
    /* TAGS (fim) */


    /* ═══════════════════════════════════════════════════════════
       3. BUSCA DE TAREFAS (rastreia checkboxIndex por nota)
    ═══════════════════════════════════════════════════════════ */

    async function fetchTasks() {

        const data = await api.runOnBackend(() => {

            /* REFS-BE (início) — conta links internos ÚNICOS da nota (@nota) */
            function contarLinksDaNota(html) {
                const seen = new Set();
                const re = /<a\b[^>]*href=["']#root\/([^"']+)["']/gi;
                let m;
                while ((m = re.exec(String(html || ''))) !== null) {
                    const alvo = String(m[1]).split(/[?#]/)[0].split('/').filter(Boolean).pop();
                    if (alvo) seen.add(alvo);
                }
                return seen.size;
            }
            /* REFS-BE (fim) */

            /* SPAN-BE (início) — extrai o innerHTML do primeiro <span> balanceado a partir de pos (pura, testável) */
            function extrairSpanDe(html, pos) {
                const str = String(html || '');
                const ss = str.indexOf('<span', pos != null ? pos : 0);
                if (ss === -1) return '';
                const abre = str.indexOf('>', ss);
                if (abre === -1) return '';
                let depth = 1;
                const re = /<span\b|<!--[\s\S]*?-->|<\/span>/gi;
                re.lastIndex = abre + 1;
                let m;
                while ((m = re.exec(str)) !== null) {
                    if (m[0] === '</span>') {
                        depth--;
                        if (depth === 0) return str.substring(abre + 1, m.index);
                    } else if (m[0].slice(0, 5).toLowerCase() === '<span') {
                        depth++;
                    }
                }
                return str.substring(abre + 1);
            }
            /* SPAN-BE (fim) */

            /* REC-BE (início) — expansão de recorrentes (pura, testável) */
            function expandRecurringInContent(content, noteId) {
                const all = [];
                const inputRe = /<input\s[^>]*type=["']checkbox["'][^>]*>/gi;
                let match;
                let idx = 0;
                while ((match = inputRe.exec(content)) !== null) {
                    const isChecked = /checked/i.test(match[0]);
                    const text = extrairSpanDe(content, match.index)
                        .replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
                    all.push({ cbIndex: idx, isChecked, text });
                    idx++;
                }
                let changed = false;
                let html = content;
                const pending = [];
                for (let i = all.length - 1; i >= 0; i--) {
                    const cb = all[i];
                    if (cb.isChecked || !cb.text) continue;
                    const everyMatch = cb.text.match(/#every=(\d+)\s*d\b/i);
                    const totalMatch = cb.text.match(/#total=(\d+)\b/i);
                    if (!everyMatch || !totalMatch) continue;
                    const every = parseInt(everyMatch[1], 10);
                    const total = parseInt(totalMatch[1], 10);
                    if (total <= 1) continue;
                    if (!(every >= 1)) continue;   // #every=0d não expande
                    if (total > 100) continue;     // trava anti-explosão de clones na nota
                    const uptoMatch = cb.text.match(/#upto=(\d{2})-(\d{2})-(\d{4})/);
                    let baseDate = null;
                    if (uptoMatch) {
                        baseDate = new Date(`${uptoMatch[3]}-${uptoMatch[1]}-${uptoMatch[2]}T12:00:00`);
                        if (isNaN(baseDate.getTime())) baseDate = null; // data impossível (ex. 99-99-2026)
                    }
                    if (!baseDate) {
                        baseDate = new Date();
                        baseDate.setHours(12, 0, 0, 0);
                    }
                    const inpRe = /<input\s[^>]*type=["']checkbox["'][^>]*>/gi;
                    let c = 0;
                    let inpPos;
                    while ((inpPos = inpRe.exec(html)) !== null) {
                        if (c === cb.cbIndex) break;
                        c++;
                    }
                    if (!inpPos) continue;
                    const before = html.substring(0, inpPos.index);
                    const liOpen = before.lastIndexOf('<li');
                    if (liOpen === -1) continue;

                    function findLiClose(h, openPos) {
                        let depth = 1;
                        let p = h.indexOf('>', openPos) + 1;
                        while (depth > 0 && p < h.length) {
                            const nLi = h.indexOf('<li', p);
                            const nCl = h.indexOf('</li>', p);
                            if (nCl === -1) return -1;
                            if (nLi !== -1 && nLi < nCl) {
                                const ch = h.charAt(nLi + 3);
                                if (ch === ' ' || ch === '>' || ch === '\t' || ch === '\n' || ch === '\r') depth++;
                                p = nLi + 4;
                            } else {
                                depth--;
                                p = nCl + 5;
                            }
                        }
                        return depth === 0 ? p - 5 : -1;
                    }

                    const liClose = findLiClose(html, liOpen);
                    if (liClose === -1) continue;

                    const liHtml = html.substring(liOpen, liClose);
                    let clones = '';

                    for (let k = 1; k < total; k++) {
                        const d = new Date(baseDate);
                        d.setDate(d.getDate() + every * k);
                        const nmm = String(d.getMonth() + 1).padStart(2, '0');
                        const ndd = String(d.getDate()).padStart(2, '0');
                        const nyyyy = d.getFullYear();

                        let clone = liHtml
                            .replace(/#every=\d+\s*d/gi, '')
                            .replace(/#total=\d+/gi, '')
                            .replace(/#doing=\d{1,3}%?/gi, '')
                            .replace(/#doing\b/gi, '')
                            .replace(/#done\b/gi, '')
                            .replace(/#upto=\d{2}-\d{2}-\d{4}/g, `#upto=${nmm}-${ndd}-${nyyyy}`)
                            .replace(/(<input[^>]*?)\s+checked\b/gi, '$1');

                        clones += '\n' + clone + '</li>';
                        pending.push({ origIdx: cb.cbIndex, cloneNum: k, date: `${nyyyy}-${nmm}-${ndd}` });
                    }
                    if (clones) {
                        // Remove #every e #total do original (evita re-expansão)
                        const stripped = liHtml.replace(/#every=\d+\s*d/gi, '').replace(/#total=\d+/gi, '');
                        // fecha o original e pula o </li> existente (cada clone fecha o próprio <li>)
                        html = html.substring(0, liOpen) + stripped + '</li>' + clones + html.substring(liClose + 5);
                        changed = true;
                    }
                }

                // Recalcula cbIndex final dos clones considerando todas as inserções
                const generated = [];
                if (changed && pending.length) {
                    pending.sort((a, b) => a.origIdx - b.origIdx || a.cloneNum - b.cloneNum);
                    const clonesPerGroup = {};
                    for (const p of pending) clonesPerGroup[p.origIdx] = (clonesPerGroup[p.origIdx] || 0) + 1;
                    const offsets = {};
                    let cumulative = 0;
                    for (const group of Object.keys(clonesPerGroup).map(Number).sort((a, b) => a - b)) {
                        offsets[group] = cumulative;
                        cumulative += clonesPerGroup[group];
                    }
                    for (const p of pending) {
                        const finalIdx = p.origIdx + (offsets[p.origIdx] || 0) + p.cloneNum;
                        generated.push({ noteId, cbIndex: finalIdx, date: p.date });
                    }
                }

                return { html: changed ? html : content, generated };
            }
            /* REC-BE (fim) */

            const rows = api.sql.getRows(`
                SELECT noteId, title
                FROM notes
                WHERE isDeleted = 0 AND isProtected = 0 AND type = 'text'
                  AND noteId NOT IN (
                      SELECT a.noteId FROM attributes a
                      WHERE a.isDeleted = 0 AND a.name = 'archived'
                  )
                ORDER BY title COLLATE NOCASE
            `);

            const result = [];
            const genMap = new Map();
            const cbStats = {};

            for (const row of rows) {
                let note, content;
                try {
                    note = api.getNote(row.noteId);
                    if (!note) continue;
                    content = note.getContent();
                } catch (e) {
                    // uma nota problemática não pode derrubar o scan inteiro
                    continue;
                }
                if (!content || !content.includes('checkbox')) continue;

                // Links internos da nota toda (indicador 🔗 n nos cards)
                const notaLinkCount = contarLinksDaNota(content);

                // ── Expande tasks recorrentes ANTES da extração ─────────────
                try {
                    const expResult = expandRecurringInContent(content, row.noteId);
                    if (expResult.html !== content) {
                        note.setContent(expResult.html);
                        content = expResult.html;
                        for (const g of expResult.generated) {
                            genMap.set(g.noteId + '::' + g.cbIndex, g.date);
                        }
                    }
                } catch (e) {
                    // expansão falhou: segue com o conteúdo original
                }

                // ── Extrai checkboxes não marcados + estatísticas ──────────
                const tasks = [];
                const re = /<input\s[^>]*type=["']checkbox["'][^>]*>/gi;
                let m;
                let cbIndex = 0;
                let checkedCbs = 0;

                while ((m = re.exec(content)) !== null) {
                    if (/checked/i.test(m[0])) {
                        checkedCbs++;
                    } else {
                        const raw = extrairSpanDe(content, m.index);
                        if (raw) {
                            const text = raw
                                .replace(/<[^>]+>/g, '')
                                .replace(/&nbsp;/g,  ' ')
                                .replace(/&amp;/g,   '&')
                                .replace(/&lt;/g,    '<')
                                .replace(/&gt;/g,    '>')
                                .replace(/&quot;/g,  '"')
                                .replace(/&#39;/g,   "'")
                                .replace(/\s+/g,     ' ')
                                .trim();
                            if (text) tasks.push({ text, cbIndex });
                        }
                    }
                    cbIndex++;
                }

                if (tasks.length) {
                    result.push({
                        noteId: row.noteId,
                        title:  row.title || tr('untitled'),
                        tasks,
                        checkedCbs,
                        totalCbs: cbIndex,
                        noteLinks: notaLinkCount,
                    });
                    cbStats[row.noteId] = { checked: checkedCbs, total: cbIndex };
                }
            }

            return { groups: result, generated: Object.fromEntries(genMap), cbStats };
        });

        allTasks = [];

        for (const g of data.groups) {
            for (const task of g.tasks) {
                            // FIX: ID usa cbIndex em vez de texto — elimina colisões
                const id = `${g.noteId}::${task.cbIndex}`;
                const { cleanText, tags } = parseTaskTags(task.text);
                allTasks.push({
                    id,
                    text:           cleanText,
                    tags,
                    sig:            assinaturaTexto(cleanText),
                    noteLinks:      g.noteLinks || 0,
                    checkboxIndex:  task.cbIndex,
                    noteId:         g.noteId,
                    noteTitle:      g.title,
                });
            }
        }

        // Reconcilia datas quando a nota foi editada acima do checkbox (índices andam)
        const recon = reconciliarDatas(allTasks, plannerData);

        // Auto-insere no plannerData tasks geradas por recorrência (datas específicas)
        const houveGeradas = Object.keys(data.generated).length > 0;
        for (const [id, date] of Object.entries(data.generated)) {
            plannerData[id] = date;
        }

        // Poda entradas órfãs do plannerData (tasks que não existem mais)
        const validIds = new Set(allTasks.map(t => t.id));
        for (const key of Object.keys(plannerData)) {
            if (key.startsWith('_')) continue;
            if (!validIds.has(key)) delete plannerData[key];
        }
        // Poda também a ordem dos dias (ids que não existem mais)
        if (plannerData._order && typeof plannerData._order === 'object') {
            for (const day of Object.keys(plannerData._order)) {
                plannerData._order[day] = (plannerData._order[day] || []).filter(id => validIds.has(id));
            }
        }
        // Poda as assinaturas de tarefas que não existem mais
        if (plannerData._sig && typeof plannerData._sig === 'object') {
            for (const key of Object.keys(plannerData._sig)) {
                if (!validIds.has(key)) delete plannerData._sig[key];
            }
        }

        // Estatísticas de checkboxes por nota
        cbStats = data.cbStats;
        invalidarIndice();
        expandidos.clear();

        // Persiste as mudanças estruturais (datas geradas, reconciliações e assinaturas novas)
        if (houveGeradas || recon.movidas || recon.adotadas) await save();
    }


    /* ═══════════════════════════════════════════════════════════
       3b. MIGRAÇÃO DE IDs ANTIGOS → NOVOS
           Converte plannerData salvo no formato antigo
           (noteId::primeiros_48_chars) para o novo (noteId::cbIndex).
           Mantida por compatibilidade; roda apenas quando há id legado (guard).
    ═══════════════════════════════════════════════════════════ */

    function migrateIds() {
        // Só roda se existir id no formato antigo (noteId::texto...; o novo é noteId::<números>)
        const temLegado = Object.keys(plannerData).some(k => !k.startsWith('_') && /::(?!\d+$)/.test(k));
        if (!temLegado) return;

        let changed = false;

        for (const task of allTasks) {
            // reconstrói o ID antigo da mesma forma que o código anterior fazia
            const oldId = `${task.noteId}::` +
                          task.text.replace(/\s+/g, '_').substring(0, 48);

            if (plannerData[oldId] !== undefined && plannerData[task.id] === undefined) {
                plannerData[task.id] = plannerData[oldId];
                delete plannerData[oldId];
                changed = true;
            }
        }

        // migra _order também
        if (plannerData._order) {
            for (const day of Object.keys(plannerData._order)) {
                plannerData._order[day] = plannerData._order[day].map(oldId => {
                    const task = allTasks.find(t =>
                        oldId === `${t.noteId}::` +
                                   t.text.replace(/\s+/g, '_').substring(0, 48)
                    );
                    return task ? task.id : oldId;
                });
            }
        }

        if (changed) {
            console.log('[Planner] Migração de IDs concluída — salvando...');
            save();
        }
    }


    /* ═══════════════════════════════════════════════════════════
       4. MARCAR COMO CONCLUÍDA
    ═══════════════════════════════════════════════════════════ */

    async function definirCheckbox(task, marcar) {
        await api.runOnBackend((noteId, cbIndex, marcarMarcado) => {
            /* MARCAR-BE (início) — marca/desmarca o checkbox de índice N (pura, testável) */
            function marcarCheckbox(html, cbIndex, marcar) {
                const deveMarcar = marcar !== false;
                let count = 0;
                let found = false;
                // Mesma regex do fetchTasks (ordem de atributos e aspas livres)
                const out = String(html || '').replace(
                    /<input\s[^>]*type=["']checkbox["'][^>]*>/gi,
                    (match) => {
                        if (count++ !== cbIndex) return match;
                        found = true;
                        const estaMarcado = /\bchecked\b/i.test(match);
                        if (deveMarcar && !estaMarcado) return match.replace(/<input\b/i, '<input checked');
                        if (!deveMarcar && estaMarcado) return match.replace(/\s+checked(?:=(?:"[^"]*"|'[^']*'))?/i, '');
                        return match;
                    }
                );
                return { html: out, found };
            }
            /* MARCAR-BE (fim) */

            const note = api.getNote(noteId);
            if (!note) throw new Error('nota de origem não encontrada');
            const res = marcarCheckbox(note.getContent(), cbIndex, marcarMarcado);
            if (!res.found) throw new Error('checkbox de índice ' + cbIndex + ' não encontrada (a nota mudou?)');
            note.setContent(res.html);
        }, [task.noteId, task.checkboxIndex, marcar !== false]);
    }

    async function markDone(task) {
        await definirCheckbox(task, true);

        // snapshot para o "Desfazer"
        const oldDay = plannerData[task.id];
        const oldOrder = oldDay && plannerData._order && plannerData._order[oldDay]
            ? plannerData._order[oldDay].slice() : null;

        // remove do estado compartilhado
        allTasks = allTasks.filter(t => t.id !== task.id);
        delete plannerData[task.id];
        // limpa da ordem do dia
        if (oldDay && plannerData._order && plannerData._order[oldDay]) {
            plannerData._order[oldDay] = plannerData._order[oldDay].filter(id => id !== task.id);
        }
        invalidarIndice();
        // persiste a remoção
        await save();

        oferecerDesfazer(tr('donePrefix') + recortar(task.text, 44), async () => {
            await definirCheckbox(task, false);
            if (oldDay != null) plannerData[task.id] = oldDay;
            if (oldOrder) plannerData._order[oldDay] = oldOrder;
            await fetchTasks();
            await save();
            renderPlanner();
            renderTasks();
        });
    }


    /* ═══════════════════════════════════════════════════════════
       5. HELPERS DE CALENDÁRIO
    ═══════════════════════════════════════════════════════════ */

    let todayBase = new Date();
    todayBase.setHours(0, 0, 0, 0);

    // Recalcula "hoje" a cada render (app aberto após a meia-noite não fica com o dia anterior)
    function atualizarHoje() {
        todayBase = new Date();
        todayBase.setHours(0, 0, 0, 0);
    }

    function getWeekCols(offset) {
        const ref = new Date(todayBase);
        ref.setDate(todayBase.getDate() + offset * 7);
        const dow = ref.getDay();
        const mon = new Date(ref);
        mon.setDate(ref.getDate() + (dow === 0 ? -6 : 1 - dow));
        const labels = WP_DIAS[wpLang];
        return labels.map((label, i) => {
            const d = new Date(mon);
            d.setDate(mon.getDate() + i);
            const iso = isoLocal(d);
            return {
                key:     iso,
                label,
                dateStr: fmtCurto(d),
                isToday: d.getTime() === todayBase.getTime(),
                isWeekend: i >= 5,
            };
        });
    }

    function weekLabel(cols) {
        const m = WP_MESES[wpLang];
        const d0 = new Date(cols[0].key + 'T12:00:00');
        const d1 = new Date(cols[6].key + 'T12:00:00');
        if (wpLang === 'en') {
            if (d0.getMonth() === d1.getMonth())
                return `${m[d0.getMonth()]} ${d0.getDate()}–${d1.getDate()}, ${d1.getFullYear()}`;
            return `${m[d0.getMonth()]} ${d0.getDate()} – ${m[d1.getMonth()]} ${d1.getDate()}, ${d1.getFullYear()}`;
        }
        if (d0.getMonth() === d1.getMonth())
            return `${d0.getDate()}–${d1.getDate()} ${m[d0.getMonth()]} ${d0.getFullYear()}`;
        return `${d0.getDate()} ${m[d0.getMonth()]} – ${d1.getDate()} ${m[d1.getMonth()]} ${d1.getFullYear()}`;
    }

    function dayBadge(isoDate) {
        const d = new Date(isoDate + 'T12:00:00');
        const days = WP_DIAS_CURTO[wpLang];
        return `${days[d.getDay()]} ${fmtCurto(d)}`;
    }


    /* ═══════════════════════════════════════════════════════════
       6. HELPERS GERAIS
    ═══════════════════════════════════════════════════════════ */

    /* ESC (início) — escape HTML (pura, testável) */
    const esc = s => String(s)
        .replace(/&/g,'&amp;').replace(/</g,'&lt;')
        .replace(/>/g,'&gt;').replace(/"/g,'&quot;')
        .replace(/'/g,'&#39;');
    /* ESC (fim) */

    // Aviso visível ao usuário (falhas de save/reload não podem ser só no console)
    function aviso(msg) {
        try { if (api && typeof api.showMessage === 'function') api.showMessage(String(msg), 6000); } catch (_) {}
    }

    // Indicador "salvando…/salvo ✓/erro ✗" no cabeçalho (Q2)
    let saveState = 'idle';
    function renderSaveStatus() {
        if (saveState === 'idle') return '';
        const texto = saveState === 'saving' ? tr('saving') : saveState === 'error' ? tr('saveFailed') : tr('saved');
        const cls = saveState === 'error' ? ' wp-save--error' : ' wp-save--ok';
        return `<span class="wp-save${cls}" id="wp-save-status">${esc(texto)}</span>`;
    }
    function atualizarSaveStatus() {
        const el = $pl.find('#wp-save-status')[0];
        if (!el) return;
        if (saveState === 'idle') { el.remove(); return; }
        const texto = saveState === 'saving' ? tr('saving') : saveState === 'error' ? tr('saveFailed') : tr('saved');
        el.textContent = texto;
        el.className = 'wp-save' + (saveState === 'error' ? ' wp-save--error' : ' wp-save--ok');
    }

    /* DATAS (início) — data local YYYY-MM-DD (pura, testável) */
    function isoLocal(d) {
        const dt = d instanceof Date ? d : new Date(d);
        return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    }
    /* DATAS (fim) */

    /* RECON (início) — assinatura do texto + reconciliação de datas (puras, testáveis) */
    function assinaturaTexto(s) {
        const str = String(s || '');
        let h = 5381;
        for (let i = 0; i < str.length; i++) h = ((h * 33) ^ str.charCodeAt(i)) >>> 0;
        return h.toString(36);
    }

    // Quando a nota é editada acima do checkbox os índices andam e a data ficaria na
    // tarefa errada. A assinatura do texto identifica a tarefa original e move a data.
    function reconciliarDatas(tasks, dados) {
        if (!dados._sig || typeof dados._sig !== 'object') dados._sig = {};
        const porNota = new Map();
        for (const t of tasks) {
            if (!porNota.has(t.noteId)) porNota.set(t.noteId, []);
            porNota.get(t.noteId).push(t);
        }
        const porId = new Map(tasks.map(t => [t.id, t]));
        let movidas = 0, adotadas = 0;
        for (const id of Object.keys(dados)) {
            if (id.startsWith('_')) continue;
            const atual = porId.get(id);
            if (!atual) continue; // órfã: a poda resolve
            const antiga = dados._sig[id];
            if (antiga && antiga !== atual.sig) {
                const candidatos = (porNota.get(atual.noteId) || [])
                    .filter(t => t.sig === antiga && dados[t.id] === undefined);
                if (candidatos.length === 1) {
                    const alvo = candidatos[0];
                    dados[alvo.id] = dados[id];
                    dados._sig[alvo.id] = antiga;
                    delete dados[id];
                    delete dados._sig[id];
                    const dia = dados[alvo.id];
                    const ordem = dados._order && dados._order[dia];
                    if (Array.isArray(ordem)) {
                        const i = ordem.indexOf(id);
                        if (i !== -1) ordem[i] = alvo.id;
                    }
                    movidas++;
                    continue;
                }
            }
            if (dados._sig[id] !== atual.sig) { dados._sig[id] = atual.sig; adotadas++; }
        }
        return { movidas, adotadas };
    }
    /* RECON (fim) */

    /* UI HELPERS (início) — recorte, confirmação estilizada e barra de desfazer */
    function recortar(s, n) {
        const str = String(s || '');
        return str.length > n ? str.slice(0, n - 1) + '…' : str;
    }

    function confirmar(titulo, okLabel) {
        return new Promise(resolve => {
            // anexado ao $root (não ao $pl) para sobreviver a re-renders
            $root.append(`
                <div class="pl-day-picker" id="wp-confirm">
                    <div class="pl-day-sheet">
                        <h4>${esc(titulo)}</h4>
                        <button class="pl-day-btn" id="wp-confirm-ok" style="text-align:center;font-weight:600;">${esc(okLabel)}</button>
                        <button class="pl-cancel-btn" id="wp-confirm-cancel">${tr('cancel')}</button>
                    </div>
                </div>`);
            const fechar = (val) => { $root.find('#wp-confirm').remove(); resolve(val); };
            $root.find('#wp-confirm').on('click', function (e) { if (e.target === this) fechar(false); });
            $root.find('#wp-confirm-cancel').on('click', () => fechar(false));
            $root.find('#wp-confirm-ok').on('click', () => fechar(true));
            $root.find('#wp-confirm-ok').trigger('focus');
        });
    }

    let acaoUndo = null;
    function oferecerDesfazer(rotulo, desfazer) {
        if (acaoUndo && acaoUndo.timer) clearTimeout(acaoUndo.timer);
        acaoUndo = { desfazer, timer: null };
        // anexado ao $root (não ao $pl) para sobreviver a re-renders
        let $bar = $root.find('#wp-undo');
        if (!$bar.length) {
            $root.append(`
                <div id="wp-undo" class="wp-undo">
                    <span class="wp-undo-text"></span>
                    <button type="button" class="wp-undo-btn">${tr('undo')}</button>
                </div>`);
            $bar = $root.find('#wp-undo');
            $bar.on('click', '.wp-undo-btn', async function () {
                const acao = acaoUndo;
                if (!acao) return;
                acaoUndo = null;
                if (acao.timer) clearTimeout(acao.timer);
                $root.find('#wp-undo').removeClass('wp-undo--on');
                try { await acao.desfazer(); }
                catch (err) { console.error('undo error:', err); aviso(tr('undoError', { err: err.message || err })); }
            });
        }
        $bar.find('.wp-undo-text').text(rotulo);
        $bar.addClass('wp-undo--on');
        acaoUndo.timer = setTimeout(() => {
            $root.find('#wp-undo').removeClass('wp-undo--on');
            acaoUndo = null;
        }, 12000);
    }

    // Limpa as datas de um conjunto de dias com contagem + desfazer
    async function limparPlanejamento(keys, rotulo) {
        const afetadas = allTasks.filter(t => keys.has(plannerData[t.id])).length;
        if (!afetadas) { aviso(tr('nothingToClear', { rotulo })); return; }
        const ok = await confirmar(tr('clearAsk', { rotulo, n: afetadas }), tr('clearOk'));
        if (!ok) return;
        const backup = JSON.parse(JSON.stringify(plannerData));
        for (const t of allTasks) {
            if (keys.has(plannerData[t.id])) delete plannerData[t.id];
        }
        if (plannerData._order) {
            for (const k of keys) delete plannerData._order[k];
        }
        invalidarIndice();
        await save();
        renderPlanner();
        renderTasks();
        oferecerDesfazer(tr('cleared', { n: afetadas }), async () => {
            plannerData = backup;
            invalidarIndice();
            await save();
            renderPlanner();
            renderTasks();
        });
    }
    /* LIMITE (início) — evita renderizar milhares de cards; "+N" expande sob demanda (C3.4) */
    const LIMITE_COLUNA = 50;
    const LIMITE_DIA = 8;
    const LIMITE_GRUPO = 40;
    const expandidos = new Set();
    function cortarLista(tasks, limite, chave) {
        if (tasks.length <= limite || expandidos.has(chave)) {
            return { visiveis: tasks, ocultos: 0, chave };
        }
        return { visiveis: tasks.slice(0, limite), ocultos: tasks.length - limite, chave };
    }
    function botaoMais(ocultos, chave) {
        if (!ocultos) return '';
        return `<button type="button" class="wp-mais" data-expandir="${esc(chave)}">+${ocultos} ${esc(tr('moreTasks'))}</button>`;
    }
    /* LIMITE (fim) */

    /* ORDENAR (início) — backlog: vencidos primeiro, sem prazo por último (pura, testável) */
    function ordenarBacklog(tasks) {
        const prazoISO = (tk) => {
            const tag = (tk.tags || []).find(x => x.type === 'deadline');
            if (!tag) return null;
            const v = String(tag.value || '');
            let m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
            if (m) return v;
            m = v.match(/^(\d{2})-(\d{2})-(\d{4})$/);
            if (m) return `${m[3]}-${m[1]}-${m[2]}`;
            return null;
        };
        return tasks.slice().sort((a, b) => {
            const pa = prazoISO(a), pb = prazoISO(b);
            if (pa && pb) return pa < pb ? -1 : pa > pb ? 1 : 0;
            if (pa) return -1;
            if (pb) return 1;
            return 0;
        });
    }
    /* ORDENAR (fim) */

    // Rola (move) o planejamento da semana exibida para +7 dias, com desfazer
    async function rolarSemana(weekCols) {
        const origem = new Set(weekCols.map(c => c.key));
        const afetadas = allTasks.filter(t => origem.has(plannerData[t.id]));
        if (!afetadas.length) { aviso(tr('nothingToDuplicate')); return; }
        const backup = JSON.parse(JSON.stringify(plannerData));
        const mais7 = (iso) => {
            const d = new Date(iso + 'T12:00:00');
            d.setDate(d.getDate() + 7);
            return isoLocal(d);
        };
        for (const t of afetadas) plannerData[t.id] = mais7(plannerData[t.id]);
        if (plannerData._order) {
            const novo = {};
            for (const dia of Object.keys(plannerData._order)) {
                novo[origem.has(dia) ? mais7(dia) : dia] = plannerData._order[dia];
            }
            plannerData._order = novo;
        }
        invalidarIndice();
        await save();
        renderPlanner();
        renderTasks();
        oferecerDesfazer(tr('duplicated', { n: afetadas.length }), async () => {
            plannerData = backup;
            invalidarIndice();
            await save();
            renderPlanner();
            renderTasks();
        });
    }

    /* SCROLL (início) — preserva posição nas re-renderizações e revela "hoje" na 1ª carga (Q9) */
    const SCROLL_SEL = ['.pl-board', '.mn-scroll', '.gantt-scroll', '.tk-list'];
    function capturarScroll() {
        const s = {};
        for (const q of SCROLL_SEL) {
            const el = $root.find(q)[0];
            if (el) s[q] = { top: el.scrollTop, left: el.scrollLeft };
        }
        return s;
    }
    function restaurarScroll(s) {
        for (const q of Object.keys(s)) {
            const el = $root.find(q)[0];
            if (el) { el.scrollTop = s[q].top; el.scrollLeft = s[q].left; }
        }
    }
    let primeiroRender = true;
    function revelarHoje() {
        if (!primeiroRender) return;
        primeiroRender = false;
        const $board = $pl.find('.pl-board');
        const el = $board[0], hoje = $pl.find('.pl-col.today')[0];
        if (!el || !hoje) return;
        if (hoje.offsetLeft < el.scrollLeft || hoje.offsetLeft + hoje.offsetWidth > el.scrollLeft + el.clientWidth) {
            el.scrollLeft = Math.max(0, hoje.offsetLeft - 8);
        }
    }
    /* SCROLL (fim) */

    // Picker de dia compartilhado: toque (mobile) e tecla "m" (qualquer view)
    function opcoesSemana() {
        return [{ key: 'backlog', isBacklog: true },
                ...getWeekCols(weekOffset).map(c => ({ key: c.key, label: c.label, sub: c.dateStr }))];
    }
    function opcoesMes() {
        const dias = [];
        for (const week of getMonthDays(monthOffset).weeks) {
            for (const day of week) {
                dias.push({ key: day.key, label: day.label, sub: fmtCurto(new Date(day.key + 'T12:00:00')) });
            }
        }
        return [{ key: 'backlog', isBacklog: true }, ...dias];
    }
    function abrirSeletorDia(taskId, taskText, current, opcoes) {
        $root.find('#wp-picker').remove();
        $root.append(`
        <div class="pl-day-picker" id="wp-picker">
            <div class="pl-day-sheet">
                <h4>${esc(taskText)}</h4>
                ${opcoes.map(o => `
                <button type="button" class="pl-day-btn${current === o.key ? ' active' : ''}"
                        data-col="${esc(o.key)}">${o.isBacklog
                            ? tr('backToBacklog')
                            : `${esc(o.label)} <span style="opacity:.5;font-size:15px;">${esc(o.sub || '')}</span>`}</button>`).join('')}
                <button type="button" class="pl-cancel-btn" id="wp-picker-cancel">${tr('cancel')}</button>
                <button type="button" class="pl-cancel-btn" style="margin-top:6px;" id="wp-picker-open">${tr('openNote')}</button>
            </div>
        </div>`);
        $root.find('#wp-picker').on('click', function (e) { if (e.target === this) $(this).remove(); });
        $root.find('#wp-picker-cancel').on('click', () => $root.find('#wp-picker').remove());
        $root.find('#wp-picker-open').on('click', () => {
            $root.find('#wp-picker').remove();
            api.activateNote(String(taskId).split('::')[0]);
        });
        $root.find('#wp-picker .pl-day-btn').on('click', async function () {
            const col = $(this).data('col');
            if (col === 'backlog') delete plannerData[taskId];
            else plannerData[taskId] = col;
            $root.find('#wp-picker').remove();
            invalidarIndice();
            await save();
            renderPlanner();
            renderTasks();
        });
        $root.find('#wp-picker-cancel').trigger('focus');
    }

    /* UI HELPERS (fim) */


    function modeSwitcher() {
        const modes = [
            { id: 'kanban', label: tr('week') },
            { id: 'month',  label: tr('month') },
            { id: 'gantt',  label: tr('gantt') },
        ];
        return `<span class="pl-mode-switch">
            ${modes.map(m => `
                <span class="pl-mode-btn${viewMode === m.id ? ' pl-mode-btn--active' : ''}"
                      tabindex="0" role="button" aria-label="${tr('viewMode', { label: m.label })}"
                      aria-current="${viewMode === m.id ? 'true' : 'false'}"
                      data-mode="${m.id}" title="${tr('viewMode', { label: m.label })}">${m.label}</span>
            `).join('')}
        </span>`;
    }


    const MODE_CSS = `
        .pl-mode-switch { display:inline-flex;gap:2px;margin-left:auto; }
        .pl-mode-btn { background:none;border:1px solid var(--main-border-color,#313244);border-radius:4px;
                       color:var(--muted-text-color,#888);font-size:13px;padding:2px 8px;cursor:pointer; }
        .pl-mode-btn:hover { color:var(--main-text-color); }
        .pl-mode-btn:focus-visible { outline:2px solid var(--main-active-border-color,#89b4fa); outline-offset:2px; }
        .pl-mode-btn--active { background:var(--accented-background-color,#313244);
                               color:var(--main-text-color);font-weight:600; }
    `;

    // Padrão de tags/barra de progresso — idêntico ao modelo da guia Semana
    const TAG_CSS = `
        .task-tags  { display:flex;flex-wrap:wrap;gap:3px;margin-top:6px; }
        .tag-badge  { display:inline-flex;align-items:center;font-size:11px;padding:2px 6px;
                      border-radius:3px;font-weight:600;letter-spacing:.02em;border:1px solid;
                      line-height:1.4;user-select:none; }
        .tag-todo   { background:rgba(230,126,34,0.15);color:#e67e22;border-color:rgba(230,126,34,0.3); }
        .tag-doing  { background:rgba(241,196,15,0.15);color:#f1c40f;border-color:rgba(241,196,15,0.3); }
        .tag-done   { background:rgba(46,204,113,0.15);color:#2ecc71;border-color:rgba(46,204,113,0.3); }
        .tag-upto   { background:rgba(52,152,219,0.15);color:#3498db;border-color:rgba(52,152,219,0.3); }
        .doing-bar  { margin-top:6px;height:5px;background:rgba(128,128,128,0.15);border-radius:2px;
                      overflow:hidden; }
        .doing-fill { height:100%;border-radius:2px;background:#f1c40f;transition:width .3s ease; }
        /* Tema claro: tons mais escuros para manter contraste AA */
        #wp-root.wp-light .tag-todo   { color:#a3541a; border-color:rgba(163,84,26,.45); }
        #wp-root.wp-light .tag-doing  { color:#8a6d00; border-color:rgba(138,109,0,.45); }
        #wp-root.wp-light .tag-done   { color:#1c7a44; border-color:rgba(28,122,68,.45); }
        #wp-root.wp-light .tag-upto   { color:#1c6a9e; border-color:rgba(28,106,158,.45); }
        #wp-root.wp-light .doing-fill { background:#b58900; }
    `;

    // Botões de navegação/header — idênticos ao modelo da guia Semana
    const BTN_CSS = `
        .pl-nav-btn { background:none;border:1px solid var(--main-border-color);border-radius:5px;
                      color:var(--main-text-color);font-size:19px;width:28px;height:26px;
                      cursor:pointer;line-height:1;padding:0; }
        .pl-nav-btn:hover { background:var(--accented-background-color); }
        .pl-today-btn { font-size:14px;padding:2px 8px;background:none;
                        border:1px solid var(--main-border-color);border-radius:4px;
                        cursor:pointer;color:var(--muted-text-color); }
        .pl-today-btn:hover { color:var(--main-text-color); }
        .pl-icon-btn { background:none;border:1px solid var(--main-border-color);
                       border-radius:4px;color:var(--muted-text-color);font-size:16px;
                       padding:2px 8px;cursor:pointer; }
        .pl-icon-btn:hover { color:var(--main-text-color); }
    `;

    // Base compartilhada dos cards (kanban + mês) — C7.2
    const CARD_CSS = `
        .pl-task, .mn-task { background:linear-gradient(rgba(0,0,0,.07),rgba(0,0,0,.07)),var(--accented-background-color,#1e1e2e);
                             border:1.5px solid transparent;border-radius:5px;cursor:grab;
                             line-height:1.5;user-select:none;position:relative;
                             transition:border-color .1s,opacity .15s; }
        .pl-task:hover, .mn-task:hover { border-color:var(--main-border-color,#45475a); }
        .pl-task.dragging, .mn-task.dragging { opacity:.35;cursor:grabbing; }
    `;

    // Modal/sheet compartilhado (picker de dia mobile, confirmações e barra de desfazer)
    const PICKER_CSS = `
        .pl-day-picker { position:fixed;inset:0;background:rgba(0,0,0,.6);
                         display:flex;align-items:flex-end;z-index:9999; }
        .pl-day-sheet  { background:var(--main-background-color,#1e1e2e);
                         border-radius:16px 16px 0 0;padding:20px 16px 32px;
                         width:100%;max-height:80vh;overflow-y:auto; }
        .pl-day-sheet h4 { margin:0 0 14px;font-size:18px;font-weight:600;
                           overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }
        .pl-day-btn { display:block;width:100%;padding:11px 14px;margin-bottom:6px;
                      background:var(--accented-background-color,#313244);border:none;
                      border-radius:7px;color:var(--main-text-color);font-size:17px;
                      text-align:left;cursor:pointer; }
        .pl-day-btn:hover  { background:var(--more-accented-background-color); }
        .pl-day-btn.active { color:var(--main-active-border-color,#89b4fa);font-weight:600; }
        .pl-cancel-btn { display:block;width:100%;padding:11px;background:none;
                         border:1px solid var(--main-border-color);border-radius:7px;
                         color:var(--muted-text-color);font-size:17px;cursor:pointer;margin-top:4px; }
        .pl-day-btn:focus-visible, .pl-cancel-btn:focus-visible {
            outline:2px solid var(--main-active-border-color,#89b4fa); outline-offset:2px; }
        .wp-undo { display:none; position:absolute; left:50%; bottom:16px; transform:translateX(-50%);
                   align-items:center; gap:12px; z-index:9000; max-width:92%;
                   background:var(--main-background-color,#1e1e2e);
                   border:1px solid var(--main-border-color,#45475a); border-radius:8px;
                   padding:8px 12px; font-size:14px; box-shadow:0 4px 14px rgba(0,0,0,.35); }
        .wp-undo.wp-undo--on { display:flex; }
        .wp-undo-text { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .wp-undo-btn { background:none; border:1px solid var(--main-border-color,#45475a); border-radius:5px;
                       color:var(--main-active-border-color,#89b4fa); font-size:14px; padding:3px 10px; cursor:pointer; }
        .wp-undo-btn:hover { background:var(--accented-background-color,#313244); }
        @media (max-width:1024px) {
            .pl-day-sheet h4 { font-size:16px; }
            .pl-day-btn, .pl-cancel-btn { font-size:15px; }
        }
    `;

    function renderTagBadges(tags) {
        if (!tags || !tags.length) return '';
        return tags.map(tag => {
            switch (tag.type) {
                case 'status':
                    if (tag.value === 'todo')
                        return '<span class="tag-badge tag-todo">● todo</span>';
                    if (tag.value === 'done')
                        return '<span class="tag-badge tag-done">● done</span>';
                    return '';
                case 'progress':
                    return `<span class="tag-badge tag-doing">◐ ${tag.value}%</span>`;
                case 'deadline': {
                    const parts = tag.value.split('-');
                    return `<span class="tag-badge tag-upto">⇢ ${parts[1]}/${parts[2]}</span>`;
                }
                default:
                    return '';
            }
        }).join('');
    }

    function renderDoingBar(tags) {
        if (!tags || !tags.length) return '';
        const doing = tags.find(t => t.type === 'progress');
        if (!doing) return '';
        return `<div class="doing-bar"><div class="doing-fill" style="width:${doing.value}%"></div></div>`;
    }

    function renderLinkBadge(n) {
        if (!n) return '';
        return `<span class="task-links" title="${tr('linksInNote', { n })}">🔗 ${n}</span>`;
    }

    const isMobile   = () => window.matchMedia('(max-width:1024px)').matches;
    const getBacklog = () => ordenarBacklog(allTasks.filter(t => !plannerData[t.id]));

    /* ÍNDICE (início) — tarefas por dia com ordem, recalculado só quando o estado muda */
    let dayIndex = null;
    function invalidarIndice() { dayIndex = null; }
    function construirIndice() {
        if (dayIndex) return dayIndex;
        const porDia = new Map();
        for (const t of allTasks) {
            const dia = plannerData[t.id];
            if (!dia) continue;
            if (!porDia.has(dia)) porDia.set(dia, []);
            porDia.get(dia).push(t);
        }
        for (const [dia, arr] of porDia) {
            const ordem = (plannerData._order || {})[dia] || [];
            const pos = new Map(ordem.map((id, i) => [id, i]));
            arr.sort((a, b) => {
                const ai = pos.has(a.id) ? pos.get(a.id) : Number.MAX_SAFE_INTEGER;
                const bi = pos.has(b.id) ? pos.get(b.id) : Number.MAX_SAFE_INTEGER;
                return ai - bi;
            });
        }
        dayIndex = porDia;
        return dayIndex;
    }
    function getDayTasks(iso) {
        return (construirIndice().get(iso) || []).slice();
    }
    /* ÍNDICE (fim) */

    function setOrder(col, taskId, insertBeforeId) {
        invalidarIndice(); // o estado pode ter mudado antes do setOrder (drop)
        if (!plannerData._order) plannerData._order = {};
        let order = (plannerData._order[col] || getDayTasks(col).map(t => t.id)).slice();
        order = order.filter(id => id !== taskId);
        if (insertBeforeId) {
            const idx = order.indexOf(insertBeforeId);
            order.splice(idx !== -1 ? idx : order.length, 0, taskId);
        } else {
            order.push(taskId);
        }
        plannerData._order[col] = order;
    }


    /* ═══════════════════════════════════════════════════════════
       7. RENDER — PLANEJADOR ($pl)
    ═══════════════════════════════════════════════════════════ */

    function renderPlanner() {
        const scrollSalvo = capturarScroll();
        renderPlannerInterno();
        restaurarScroll(scrollSalvo);
        revelarHoje();
    }

    function renderPlannerInterno() {
        atualizarHoje();
        if (viewMode === 'gantt')  { renderGantt(); return; }
        if (viewMode === 'month')  { renderMonth(); return; }

        const weekCols      = getWeekCols(weekOffset);
        const label         = weekLabel(weekCols);
        const mobile        = isMobile();
        const isCurrentWeek = weekOffset === 0;
        const total         = allTasks.length;
        const weekKeys      = new Set(weekCols.map(c => c.key));
        const planned       = allTasks.filter(t => weekKeys.has(plannerData[t.id])).length;

        const allCols = [
            { key: 'backlog', label: tr('backlog'), dateStr: tr('noDate'), isToday: false, isBacklog: true },
            ...weekCols.map(c => ({ ...c, isBacklog: false })),
        ];

        let html = `
        <style>
            .pl-board { display:flex;gap:10px;overflow-x:auto;padding:0 16px 20px;flex:1;
                        align-items:flex-start;min-height:0;-webkit-overflow-scrolling:touch; }
            .pl-col   { flex-shrink:0;display:flex;flex-direction:column;border-radius:8px;
                        border:1px solid var(--main-border-color,#313244);
                        background:var(--accented-background-color,#1e1e2e);
                        max-height:calc(100vh - 190px); }
            .pl-col.today { border-color:var(--main-active-border-color,#89b4fa); }
            .pl-col.weekend { background:rgba(128,128,128,.05); }
            .pl-col-empty { font-size:13px;color:var(--muted-text-color,#888);opacity:.55;
                            text-align:center;padding:10px 6px; }
            .pl-col-head  { padding:10px 12px 8px;border-bottom:1px solid var(--main-border-color,#313244);flex-shrink:0; }
            .pl-col-label { font-size:15px;font-weight:700;text-transform:uppercase;
                            letter-spacing:.08em;color:var(--muted-text-color,#888); }
            .pl-col.today .pl-col-label { color:var(--main-active-border-color,#89b4fa); }
            .pl-col-sub   { font-size:15px;color:var(--muted-text-color,#888);margin-top:2px; }
            .pl-tasks { padding:8px;display:flex;flex-direction:column;gap:8px;
                        overflow-y:auto;flex:1;min-height:64px; }
            .pl-task  { padding:10px 12px;font-size:17px; }
            .pl-task-note { font-size:14px;color:var(--muted-text-color,#888);margin-top:6px;
                            overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }
            .pl-drop { display:none;height:40px;border:2px dashed var(--main-border-color,#45475a);
                       border-radius:5px;opacity:.4; }
            .pl-tasks.drag-over { background:rgba(137,180,250,.06); }
            .pl-tasks.drag-over .pl-drop { display:block; }
            .pl-insert-marker { height:2px;border-radius:2px;flex-shrink:0;
                                background:var(--main-active-border-color,#89b4fa);
                                margin:2px 0;pointer-events:none; }
            ${BTN_CSS}
            ${CARD_CSS}
            /* mobile picker + confirmação + desfazer */
            ${PICKER_CSS}
            ${TAG_CSS}
            .pl-done-btn { position:absolute;top:6px;right:8px;font-size:16px;line-height:1;z-index:2;
                           cursor:pointer;user-select:none;color:var(--muted-text-color);opacity:0;
                           transition:opacity .12s,color .12s;border-radius:3px;padding:0 2px; }
            .pl-done-btn:hover { opacity:1 !important;color:var(--active-item-background-color,#a6e3a1) !important; }
            .pl-task:hover .pl-done-btn { opacity:0.45; }
            @media (max-width:1024px) {
                .pl-done-btn { opacity:0.5; }
                .pl-board { align-items:flex-start; }
                .pl-col { max-height:100%;min-height:0; }
                .pl-task { font-size:14px;padding:8px 10px; }
                .pl-task-note { font-size:12px;margin-top:4px; }
                .tag-badge { font-size:10px;padding:1px 5px; }
                .pl-col-label { font-size:13px; }
                .pl-col-sub { font-size:13px; }
                .pl-tasks { gap:6px;min-height:0; }
                .pl-col-empty { display:none; }
                .task-tags { margin-top:4px; }
                .doing-bar { margin-top:4px;height:4px; }
             }
             ${MODE_CSS}
         </style>

        <div style="display:flex;flex-direction:column;height:100%;overflow:hidden;">

            <!-- CABEÇALHO PLANNER -->
            <div style="display:flex;align-items:center;gap:7px;padding:10px 16px;
                        flex-shrink:0;border-bottom:1px solid var(--main-border-color,#313244);
                        flex-wrap:wrap;">
                <span style="font-size:19px;font-weight:700;">${tr('planner')}</span>
                <button class="pl-nav-btn" id="pl-prev" title="${tr('prevWeek')}">‹</button>
                <span style="font-size:16px;color:var(--muted-text-color);white-space:nowrap;">
                    ${esc(label)}
                </span>
                <button class="pl-nav-btn" id="pl-next" title="${tr('nextWeek')}">›</button>
                ${!isCurrentWeek ? `<button class="pl-today-btn" id="pl-now">${tr('today')}</button>` : ''}
                <span style="font-size:14px;color:var(--muted-text-color);margin-left:auto;">
                    ${planned}/${total}
                </span>
                ${renderSaveStatus()}
                <button class="pl-icon-btn" id="pl-clear"  title="${tr('clearWeek')}">↺</button>
                <button class="pl-icon-btn" id="pl-reload" title="${tr('reload')}">⟳</button>
                <button class="pl-icon-btn" id="pl-roll" title="${tr('duplicateWeek')}">⇥</button>
                ${modeSwitcher()}
            </div>

            <!-- BOARD -->
            <div class="pl-board">
        `;

        for (const col of allCols) {

            const tasks = col.isBacklog ? getBacklog() : getDayTasks(col.key);
            const width = col.isBacklog
                ? (mobile ? '150px' : '180px')
                : (mobile ? '130px' : '180px');
            const fimDeSemana = col.isWeekend;
            const corte = cortarLista(tasks, LIMITE_COLUNA, 'kb:' + col.key);

            html += `
            <div class="pl-col${col.isToday ? ' today' : ''}${fimDeSemana ? ' weekend' : ''}" style="width:${width};">
                <div class="pl-col-head">
                    <div class="pl-col-label">${esc(col.label)}</div>
                    <div class="pl-col-sub">
                        ${esc(col.dateStr)}${tasks.length ? ' · ' + tasks.length : ''}
                    </div>
                </div>
                <div class="pl-tasks" data-col="${esc(col.key)}">
                    ${corte.visiveis.map(t => `
                    <div class="pl-task"
                         tabindex="0" role="button" aria-label="${esc(t.text)}"
                         title="${esc(t.text)} · ${esc(tr('moveHint'))}"
                         draggable="${!mobile}"
                         data-task-id="${esc(t.id)}"
                         data-note-id="${esc(t.noteId)}"
                         data-cb-index="${t.checkboxIndex}">
                        <span class="pl-done-btn" tabindex="0" role="button" aria-label="${tr('markDone')}" title="${tr('markDone')}">✓</span>
                        <div>${esc(t.text)}</div>
                        ${renderLinkBadge(t.noteLinks)}
                        ${t.tags && t.tags.length
                            ? `<div class="task-tags">${renderTagBadges(t.tags)}</div>`
                            : ''}
                        ${renderDoingBar(t.tags)}
                        ${!col.isBacklog
                            ? `<div class="pl-task-note" title="${esc(t.noteTitle)}">${esc(t.noteTitle)}</div>`
                            : ''}
                    </div>`).join('')}
                    ${botaoMais(corte.ocultos, corte.chave)}
                    ${!tasks.length ? `<div class="pl-col-empty">${tr('dropHere')}</div>` : ''}
                    <div class="pl-drop"></div>
                </div>
            </div>`;
        }

        html += `</div></div>`;

        $pl.html(html);
        bindPlannerEvents(weekCols);
    }


    /* ═══════════════════════════════════════════════════════════
        7b. RENDER — GANTT (substitui o planner quando viewMode='gantt')
    ═══════════════════════════════════════════════════════════ */

    function renderGantt() {

        const weekCols      = getWeekCols(weekOffset);
        const label         = weekLabel(weekCols);
        const mobile        = isMobile();
        const isCurrentWeek = weekOffset === 0;
        const total         = allTasks.length;
        const weekKeys      = new Set(weekCols.map(c => c.key));
        const planned       = allTasks.filter(t => weekKeys.has(plannerData[t.id])).length;

        // Collect tasks visible in the current week + backlog
        const groups = new Map(); // noteId → { noteTitle, noteId, items[] }
        const backlogBruto = [];

        for (const t of allTasks) {
            const startIso = plannerData[t.id];
            if (!startIso) { backlogBruto.push(t); continue; }

            const startIdx = weekCols.findIndex(c => c.key === startIso);
            if (startIdx === -1) continue;

            const uptoTag  = t.tags.find(tag => tag.type === 'deadline');
            const endIso   = uptoTag ? uptoTag.value : startIso;
            const endIdx   = weekCols.findIndex(c => c.key === endIso);

            const progTag  = t.tags.find(tag => tag.type === 'progress');
            const doneTag  = t.tags.find(tag => tag.type === 'status' && tag.value === 'done');

            const item = {
                id:            t.id,
                text:          t.text,
                tags:          t.tags,
                noteId:        t.noteId,
                noteTitle:     t.noteTitle,
                checkboxIndex: t.checkboxIndex,
                noteLinks:     t.noteLinks || 0,
                startIdx,
                endIdx:        endIdx === -1 ? 6 : endIdx,
                progress:      progTag ? progTag.value : (doneTag ? 100 : 0),
                isOverdue:     uptoTag && endIso < isoLocal(todayBase),
                isDone:        !!doneTag,
            };

            if (!groups.has(t.noteId)) {
                groups.set(t.noteId, { noteTitle: t.noteTitle, noteId: t.noteId, items: [] });
            }
            groups.get(t.noteId).items.push(item);
        }

        /* ── CSS ─────────────────────────────────────────── */
        const css = `
        .gantt-wrap { display:flex;flex-direction:column;height:100%;overflow:hidden; }
        .gantt-scroll { overflow-x:auto;overflow-y:auto;flex:1;padding:0 12px 20px; }
        .gantt-grid { display:grid;grid-template-columns:200px repeat(7,minmax(80px,1fr));min-width:700px;grid-auto-flow:row; }
        .gantt-hdr { position:sticky;top:0;z-index:3;background:var(--main-background-color,#1e1e2e);
                     padding:8px 6px;font-size:12px;font-weight:700;text-transform:uppercase;
                     letter-spacing:.06em;color:var(--muted-text-color,#888);
                     border-bottom:1px solid var(--main-border-color,#313244); }
        .gantt-hdr.today { color:var(--main-active-border-color,#89b4fa); }
        .gantt-hdr-date { font-size:11px;font-weight:400;text-transform:none;letter-spacing:0; }
        .gantt-note { grid-column:1/-1;padding:10px 6px 4px;font-size:15px;font-weight:700;
                      text-transform:uppercase;letter-spacing:.06em;color:var(--muted-text-color,#888);
                      border-bottom:none;display:flex;align-items:center;gap:6px; }
        .gantt-note-count { display:inline-flex;align-items:center;justify-content:center;
                            font-size:12px;background:var(--accented-background-color);
                            padding:0 5px;border-radius:8px;font-weight:600;color:var(--muted-text-color); }
        .gantt-label { grid-column:1;padding:4px 6px;font-size:13px;overflow:hidden;
                       border-bottom:1px solid var(--main-border-color,#313244);
                       display:flex;flex-direction:column; }
        .gantt-cell { position:relative;border-bottom:1px solid var(--main-border-color,#313244);
                      min-height:34px; }
        .gantt-bar { position:absolute;top:3px;bottom:3px;left:3px;right:3px;border-radius:5px;
                     overflow:hidden;cursor:pointer;display:flex;align-items:center;padding:0 6px;
                     transition:opacity .12s; }
        .gantt-bar:hover { opacity:.85; }
        .gantt-bar-done { background:rgba(46,204,113,0.22);border:1px solid rgba(46,204,113,0.35); }
        .gantt-bar-overdue { background:rgba(243,139,168,0.22);border:1px solid rgba(243,139,168,0.35); }
        .gantt-bar-progress { background:rgba(241,196,15,0.18);border:1px solid rgba(241,196,15,0.3); }
        .gantt-bar-todo { background:rgba(137,180,250,0.13);border:1px solid rgba(137,180,250,0.22); }
        .gantt-fill { position:absolute;top:0;left:0;bottom:0;border-radius:4px;pointer-events:none;
                      transition:width .3s ease; }
        .gantt-bar-done .gantt-fill { background:rgba(46,204,113,0.25); }
        .gantt-bar-progress .gantt-fill { background:rgba(241,196,15,0.2); }
        .gantt-bar-label { position:relative;z-index:1;font-size:12px;overflow:hidden;
                           text-overflow:ellipsis;white-space:nowrap;color:var(--main-text-color); }
        .gantt-bar-done .gantt-bar-label { text-decoration:line-through;opacity:.55; }
        .gantt-backlog { padding:12px 16px;border-top:1px solid var(--main-border-color,#313244); }
        .gantt-backlog summary { cursor:pointer;font-weight:600;font-size:14px;color:var(--muted-text-color);
                                 padding:4px 0;user-select:none; }
        .gantt-backlog summary:hover { color:var(--main-text-color); }
        .gantt-blog-item { padding:3px 8px;font-size:14px;display:flex;align-items:center;gap:8px; }
        .gantt-blog-check { flex-shrink:0;width:14px;height:14px;border:1.5px solid var(--main-border-color,#45475a);
                            border-radius:3px;cursor:pointer;display:flex;align-items:center;
                            justify-content:center;font-size:11px;color:transparent;user-select:none; }
        .gantt-blog-check:hover { border-color:var(--main-text-color); }
        .gantt-blog-text { cursor:pointer;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }
        .gantt-blog-text:hover { text-decoration:underline; }
        .gantt-blog-note { font-size:12px;color:var(--muted-text-color,#888);flex-shrink:0; }
        .gantt-blog-tags { display:flex;gap:3px;flex-shrink:0; }
        .gantt-empty { padding:40px 24px;text-align:center;color:var(--muted-text-color);font-size:17px; }
        .gantt-empty-sub { font-size:14px;margin-top:6px;opacity:.7; }
        .gantt-label-tags { display:flex;flex-wrap:wrap;gap:3px;margin-top:2px; }
        .gantt-label-doing { margin-top:2px;height:4px;background:rgba(128,128,128,0.15);border-radius:2px;overflow:hidden; }
        .gantt-label-doing-fill { height:100%;border-radius:2px;background:#f1c40f;transition:width .3s ease; }
        ${TAG_CSS}
        ${BTN_CSS}
        .gantt-today-line { border-left:2px dashed rgba(137,180,250,0.5);pointer-events:none; }
        .gantt-weekend-bg { background:rgba(128,128,128,0.04);pointer-events:none; }
        .gantt-hdr-weekend { background:rgba(128,128,128,0.06); }
        ${MODE_CSS}
        ${PICKER_CSS}
        @media (max-width:1024px) {
            .gantt-grid { grid-template-columns:minmax(70px,120px) repeat(7,minmax(36px,1fr));min-width:0; }
            .gantt-label { font-size:11px;padding:3px 4px; }
            .gantt-bar-label { font-size:10px; }
            .gantt-hdr { font-size:10px;padding:5px 3px; }
            .gantt-hdr-date { font-size:9px; }
            .gantt-note { font-size:12px; }
        }`;

        let html = `<style>${css}</style>
        <div class="gantt-wrap">

            <!-- CABEÇALHO GANTT -->
            <div style="display:flex;align-items:center;gap:7px;padding:10px 16px;
                        flex-shrink:0;border-bottom:1px solid var(--main-border-color,#313244);
                        flex-wrap:wrap;">
                <span style="font-size:19px;font-weight:700;">${tr('gantt')}</span>
                <button class="pl-nav-btn" id="gantt-prev" title="${tr('prevWeek')}">‹</button>
                <span style="font-size:16px;color:var(--muted-text-color);white-space:nowrap;">
                    ${esc(label)}
                </span>
                <button class="pl-nav-btn" id="gantt-next" title="${tr('nextWeek')}">›</button>
                ${!isCurrentWeek ? `<button class="pl-today-btn" id="gantt-now">${tr('today')}</button>` : ''}
                <span style="font-size:14px;color:var(--muted-text-color);margin-left:auto;">
                    ${planned}/${total}
                </span>
                ${renderSaveStatus()}
                <button class="pl-icon-btn" id="gantt-clear" title="${tr('clearWeek')}">↺</button>
                <button class="pl-icon-btn" id="gantt-reload" title="${tr('reload')}">⟳</button>
                <button class="pl-icon-btn" id="gantt-roll" title="${tr('duplicateWeek')}">⇥</button>
                ${modeSwitcher()}
            </div>

            <div class="gantt-scroll">
                <div class="gantt-grid">`;

        // ── GRID (desktop e mobile — rolagem horizontal no celular) ──
        // HEADER ROW
        html += `<div class="gantt-hdr" style="grid-column:1"></div>`;
        for (const [i, col] of weekCols.entries()) {
            const weekend = i >= 5 ? ' gantt-hdr-weekend' : '';
            html += `<div class="gantt-hdr${col.isToday ? ' today' : ''}${weekend}" style="grid-column:span 1">
                ${esc(col.label)}<br><span class="gantt-hdr-date">${esc(col.dateStr)}</span>
            </div>`;
        }

        // TODAY VERTICAL LINE + WEEKEND BACKGROUND
        const todayCol = weekCols.findIndex(c => c.isToday);
        for (const [i] of weekCols.entries()) {
            if (i >= 5) {
                html += `<div class="gantt-weekend-bg" style="grid-column:${i + 2};grid-row:2 / 999"></div>`;
            }
            if (i === todayCol) {
                html += `<div class="gantt-today-line" style="grid-column:${i + 2};grid-row:2 / 999"></div>`;
            }
        }

        // TASK ROWS
        let row = 2;

        if (groups.size === 0) {
            html += `<div class="gantt-empty" style="grid-column:1/-1;grid-row:2">
                <div>${tr('noWeekTasks')}</div>
                <div class="gantt-empty-sub">${tr('dragFromBacklog')}</div>
            </div>`;
        }

        for (const [, group] of groups) {
            html += `<div class="gantt-note" style="grid-row:${row}">
                ${esc(group.noteTitle)}
                <span class="gantt-note-count">${group.items.length}</span>
            </div>`;
            row++;

            for (const item of group.items) {
                const colStart = item.startIdx + 2;
                const colEnd   = item.endIdx + 3;

                let barClass = 'gantt-bar';
                if (item.isDone)               barClass += ' gantt-bar-done';
                else if (item.isOverdue)       barClass += ' gantt-bar-overdue';
                else if (item.progress > 0)    barClass += ' gantt-bar-progress';
                else                           barClass += ' gantt-bar-todo';

                const tagsHtml = renderTagBadges(item.tags);
                const doingHtml = renderDoingBar(item.tags);
                const progTag = item.tags.find(t => t.type === 'progress');
                const uptoTag = item.tags.find(t => t.type === 'deadline');
                const tipParts = [item.text, `Nota: ${item.noteTitle}`];
                if (progTag) tipParts.push(`◐ ${progTag.value}%`);
                if (uptoTag) tipParts.push(`⇢ ${uptoTag.value}`);
                const tooltip = tipParts.join(' · ');

                html += `<div class="gantt-label" style="grid-row:${row}">
                    <div style="display:flex;align-items:center;gap:4px;">
                        <span class="gantt-task-label"
                              tabindex="0" role="link" aria-label="${esc(item.text)}"
                              data-note-id="${esc(item.noteId)}"
                              style="cursor:pointer;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(item.text)}</span>
                        <span class="gantt-done-btn"
                              tabindex="0" role="button" aria-label="${tr('markDone')}"
                              data-task-id="${esc(item.id)}"
                              data-note-id="${esc(item.noteId)}"
                              data-cb-index="${item.checkboxIndex}"
                              style="flex-shrink:0;cursor:pointer;font-size:14px;opacity:.4;
                                     color:var(--muted-text-color);user-select:none;">✓</span>
                    </div>
                    ${tagsHtml ? `<div class="gantt-label-tags">${tagsHtml}</div>` : ''}
                    ${renderLinkBadge(item.noteLinks)}
                    ${doingHtml ? doingHtml.replace('doing-bar', 'gantt-label-doing').replace('doing-fill', 'gantt-label-doing-fill') : ''}
                </div>`;

                html += `<div class="gantt-cell" style="grid-column:${colStart}/${colEnd};grid-row:${row}">
                    <div class="${barClass}"
                         tabindex="0" role="button" aria-label="${esc(item.text)}"
                         data-task-id="${esc(item.id)}"
                         data-note-id="${esc(item.noteId)}"
                         data-cb-index="${item.checkboxIndex}"
                         title="${esc(tooltip)}">
                        <div class="gantt-fill" style="width:${item.progress}%"></div>
                        <span class="gantt-bar-label">${esc(item.text)}</span>
                    </div>
                </div>`;
                row++;
            }
        }

        html += `</div></div>`; // close grid + scroll

        // BACKLOG
        const backlogTasks = ordenarBacklog(backlogBruto);
        if (backlogTasks.length) {
            html += `<div class="gantt-backlog">
                <details>
                    <summary>${tr('backlog')} (${tr('backlogCount', { n: backlogTasks.length })})</summary>
                    <div style="margin-top:6px;">
                    ${backlogTasks.map(t => {
                        const tagsHtml = renderTagBadges(t.tags);
                        return `<div class="gantt-blog-item" tabindex="0" role="button" aria-label="${esc(t.text)}">
                            <span class="gantt-blog-check"
                                  tabindex="0" role="button" aria-label="${tr('markDone')}"
                                  data-task-id="${esc(t.id)}"
                                  data-note-id="${esc(t.noteId)}"
                                  data-cb-index="${t.checkboxIndex}">✓</span>
                            <span class="gantt-blog-text" tabindex="0" role="link" data-note-id="${esc(t.noteId)}">${esc(t.text)}</span>
                            ${renderLinkBadge(t.noteLinks)}
                            <span class="gantt-blog-note" title="${esc(t.noteTitle)}">${esc(t.noteTitle)}</span>
                            ${tagsHtml ? `<span class="gantt-blog-tags">${tagsHtml}</span>` : ''}
                        </div>`;
                    }).join('')}
                    </div>
                </details>
            </div>`;
        }

        html += `</div>`; // close gantt-wrap

        $pl.html(html);
        bindGanttEvents(weekCols);
    }


    /* ═══════════════════════════════════════════════════════════
        7c. EVENTOS DO GANTT
    ═══════════════════════════════════════════════════════════ */

    function bindGanttEvents(weekCols) {

        $pl.find('#gantt-prev').on('click',  () => { weekOffset--; renderPlanner(); });
        $pl.find('#gantt-next').on('click',  () => { weekOffset++; renderPlanner(); });
        $pl.find('#gantt-now').on('click',   () => { weekOffset = 0; renderPlanner(); });

        $pl.find('#gantt-roll').on('click', () => rolarSemana(weekCols));

        $pl.find('#gantt-reload').on('click', async function () {
            const $btn = $(this);
            $btn.text('…');
            await recarregarTarefas();
            if ($btn.parent().length) $btn.text('⟳');
        });

        $pl.find('#gantt-clear').on('click', () => {
            limparPlanejamento(new Set(weekCols.map(c => c.key)), weekLabel(weekCols));
        });

        $pl.find('.pl-mode-btn').on('click', async function () {
            const mode = $(this).data('mode');
            if (mode === viewMode) return;
            viewMode = mode;
            plannerData._viewMode = mode;
            await save();
            renderPlanner();
        });

        // Bar click → open source note
        $pl.find('.gantt-bar').on('click', function () {
            api.activateNote($(this).data('noteId'));
        });

        // Task label click → open source note
        $pl.find('.gantt-task-label').on('click', function () {
            api.activateNote($(this).data('noteId'));
        });

        // Backlog text click → open source note
        $pl.find('.gantt-blog-text').on('click', function () {
            api.activateNote($(this).data('noteId'));
        });

        // Done button on Gantt bars
        $pl.find('.gantt-done-btn').on('click', async function (e) {
            e.stopPropagation();
            const $btn = $(this);
            const taskId  = String($btn.data('taskId'));
            const noteId  = String($btn.data('noteId'));
            const cbIndex = parseInt($btn.data('cbIndex'), 10);
            if (!taskId || !noteId || isNaN(cbIndex)) return;
            try {
                await markDone({ id: taskId, noteId, checkboxIndex: cbIndex });
                renderPlanner();
                renderTasks();
            } catch (err) { console.error('gantt markDone error:', err); aviso(tr('taskError', { err: err.message || err })); }
        });

        // Done on backlog items
        $pl.find('.gantt-blog-check').on('click', async function (e) {
            e.stopPropagation();
            const $btn = $(this);
            const taskId  = String($btn.data('taskId'));
            const noteId  = String($btn.data('noteId'));
            const cbIndex = parseInt($btn.data('cbIndex'), 10);
            if (!taskId || !noteId || isNaN(cbIndex)) return;
            try {
                await markDone({ id: taskId, noteId, checkboxIndex: cbIndex });
                renderPlanner();
                renderTasks();
            } catch (err) { console.error('gantt blog markDone error:', err); aviso(tr('taskError', { err: err.message || err })); }
        });
    }


    /* ═══════════════════════════════════════════════════════════
        7d. RENDER — VISÃO MENSAL (viewMode='month')
    ═══════════════════════════════════════════════════════════ */

    function getMonthDays(offset) {
        const ref = new Date(todayBase);
        ref.setDate(1);
        ref.setMonth(ref.getMonth() + offset);

        const year  = ref.getFullYear();
        const month = ref.getMonth();
        const firstDay = new Date(year, month, 1);

        // Alinha o primeiro dia na segunda-feira (dow: 0=Dom..6=Sáb)
        const lead = (firstDay.getDay() + 6) % 7;
        const start = new Date(firstDay);
        start.setDate(firstDay.getDate() - lead);

        const weeks = [];
        const labels = WP_DIAS[wpLang];
        let d = new Date(start);

        while (weeks.length < 6) {
            const week = [];
            for (let i = 0; i < 7; i++) {
                const iso = isoLocal(d);
                week.push({
                    key:           iso,
                    label:         labels[i],
                    dayNum:        d.getDate(),
                    isToday:       d.getTime() === todayBase.getTime(),
                    isCurrentMonth: d.getMonth() === month,
                    isWeekend:     i >= 5,
                });
                d.setDate(d.getDate() + 1);
            }
            weeks.push(week);
            // Para no fim do mês (5 ou 6 semanas)
            if (weeks.length >= 5 && d.getMonth() !== month && d.getDate() > 1) break;
        }
        return { year, month, weeks };
    }

    function monthLabel(monthView) {
        const months = WP_MESES[wpLang];
        return `${months[monthView.month]} ${monthView.year}`;
    }

    function renderMonth() {

        const monthView = getMonthDays(monthOffset);
        const label     = monthLabel(monthView);
        const mobile    = isMobile();
        const isCurrent = monthOffset === 0;
        const total     = allTasks.length;
        const monthKeys = new Set();
        for (const week of monthView.weeks) {
            for (const day of week) monthKeys.add(day.key);
        }
        const planned = allTasks.filter(t => monthKeys.has(plannerData[t.id])).length;

        const css = `
        .mn-wrap { display:flex;flex-direction:column;height:100%;overflow:hidden; }
        .mn-scroll { overflow-y:auto;overflow-x:auto;flex:1;padding:0 16px 20px; }
        .mn-grid { display:grid;grid-template-columns:repeat(7,1fr);gap:8px;min-width:640px; }
        .mn-weekday { text-align:center;font-size:13px;font-weight:700;text-transform:uppercase;
                      letter-spacing:.08em;color:var(--muted-text-color,#888);
                      padding:8px 0 10px;border-bottom:1px solid var(--main-border-color,#313244); }
        .mn-cell { border:1px solid var(--main-border-color,#313244);border-radius:8px;
                   background:var(--accented-background-color,#1e1e2e);
                   min-height:110px;display:flex;flex-direction:column;
                   padding:7px 8px;gap:4px;transition:border-color .1s; }
        .mn-cell.out { opacity:.35; }
        .mn-cell.today { border-color:var(--main-active-border-color,#89b4fa); }
        .mn-cell.weekend { background:rgba(128,128,128,.05); }
        .mn-daynum { font-size:13px;color:var(--muted-text-color,#888);font-weight:600;
                     padding-bottom:3px;border-bottom:1px solid rgba(128,128,128,.12);
                     margin-bottom:2px; }
        .mn-cell.today .mn-daynum { color:var(--main-active-border-color,#89b4fa); }
        .mn-tasks { display:flex;flex-direction:column;gap:5px;overflow:hidden;flex:1; }
        .mn-task { padding:4px 8px;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }
        .mn-task.done { background:rgba(46,204,113,.12);border-color:rgba(46,204,113,.25);
                        text-decoration:line-through;opacity:.7; }
        .mn-done-btn { position:absolute;top:2px;right:5px;font-size:12px;opacity:0;
                       cursor:pointer;color:var(--muted-text-color);border-radius:3px;
                       padding:0 2px; }
        .mn-task:hover .mn-done-btn { opacity:.6; }
        .mn-done-btn:hover { opacity:1 !important;color:var(--active-item-background-color,#a6e3a1) !important; }
        .mn-drop { display:none;height:20px;border:2px dashed var(--main-border-color,#45475a);
                   border-radius:5px;opacity:.4; }
        .mn-cell.drag-over { border-color:var(--main-active-border-color,#89b4fa); }
        .mn-cell.drag-over .mn-drop { display:block; }
        .mn-backlog { margin-top:16px;border-top:1px solid var(--main-border-color,#313244);
                      padding-top:8px;border-radius:8px;transition:background .12s,border-color .12s; }
        .mn-backlog.drag-over { background:rgba(137,180,250,.08); }
        .mn-backlog summary { cursor:pointer;font-weight:600;font-size:14px;
                              color:var(--muted-text-color,#888);user-select:none; }
        .mn-backlog summary:hover { color:var(--main-text-color); }
        .mn-blog-item { padding:3px 8px;font-size:13px;display:flex;align-items:center;gap:8px;
                        cursor:grab;border-radius:5px;border:1.5px solid transparent;
                        transition:border-color .1s,background .12s; }
        .mn-blog-item:hover { border-color:var(--main-border-color,#45475a); }
        .mn-blog-item.dragging { opacity:.35;cursor:grabbing; }
        .mn-blog-text { cursor:pointer;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }
        .mn-blog-text:hover { text-decoration:underline; }
        .mn-blog-note { font-size:11px;color:var(--muted-text-color,#888);flex-shrink:0; }
        ${BTN_CSS}
        ${CARD_CSS}
        .mn-task.done:hover { border-color:rgba(46,204,113,.35); }
        ${PICKER_CSS}
        ${TAG_CSS}
        ${MODE_CSS}
        @media (max-width:1024px) {
            .mn-grid { min-width:0;gap:4px; }
            .mn-cell { min-height:70px;padding:3px 4px; }
            .mn-weekday { font-size:11px;padding:6px 0 8px; }
            .mn-daynum { font-size:11px;padding-bottom:2px; }
            .mn-task { font-size:11px;padding:2px 4px;line-height:1.4; }
            .mn-done-btn { opacity:.5;padding:0 4px; }
        }`;

        let html = `<style>${css}</style>
        <div class="mn-wrap">

            <!-- CABEÇALHO MÊS -->
            <div style="display:flex;align-items:center;gap:7px;padding:10px 16px;
                        flex-shrink:0;border-bottom:1px solid var(--main-border-color,#313244);
                        flex-wrap:wrap;">
                <span style="font-size:19px;font-weight:700;">${tr('month')}</span>
                <button class="pl-nav-btn" id="month-prev" title="${tr('prevMonth')}">‹</button>
                <span style="font-size:16px;color:var(--muted-text-color);white-space:nowrap;text-transform:capitalize;">
                    ${esc(label)}
                </span>
                <button class="pl-nav-btn" id="month-next" title="${tr('nextMonth')}">›</button>
                ${!isCurrent ? `<button class="pl-today-btn" id="month-now">${tr('today')}</button>` : ''}
                <span style="font-size:14px;color:var(--muted-text-color);margin-left:auto;">
                    ${planned}/${total}
                </span>
                ${renderSaveStatus()}
                <button class="pl-icon-btn" id="month-clear" title="${tr('clearMonth')}">↺</button>
                <button class="pl-icon-btn" id="month-reload" title="${tr('reload')}">⟳</button>
                ${modeSwitcher()}
            </div>

            <div class="mn-scroll">
                <div class="mn-grid">`;

        // Headers dos dias
        for (const day of monthView.weeks[0]) {
            html += `<div class="mn-weekday">${esc(day.label)}</div>`;
        }

        // Células do calendário
        for (const week of monthView.weeks) {
            for (const day of week) {
                const tasks = getDayTasks(day.key);
                const corte = cortarLista(tasks, LIMITE_DIA, 'mn:' + day.key);
                const cls = [
                    'mn-cell',
                    day.isCurrentMonth ? '' : 'out',
                    day.isToday ? 'today' : '',
                    day.isWeekend ? 'weekend' : '',
                ].join(' ').replace(/\s+/g, ' ');

                html += `<div class="${cls}" data-col="${esc(day.key)}">
                    <div class="mn-daynum">${day.dayNum}</div>
                    <div class="mn-tasks">
                        ${corte.visiveis.map(t => {
                            const done = t.tags.some(tag => tag.type === 'status' && tag.value === 'done');
                            return `<div class="mn-task${done ? ' done' : ''}"
                                         tabindex="0" role="button" aria-label="${esc(t.text)}"
                                         title="${esc(t.text)} · ${esc(tr('moveHint'))}"
                                         draggable="${!mobile}"
                                         data-task-id="${esc(t.id)}"
                                         data-note-id="${esc(t.noteId)}"
                                         data-cb-index="${t.checkboxIndex}"
                                         title="${esc(t.text)}">
                                    <span class="mn-done-btn" tabindex="0" role="button" aria-label="${tr('markDone')}" title="${tr('markDone')}">✓</span>
                                    ${esc(t.text)}
                                    ${renderLinkBadge(t.noteLinks)}
                                </div>`;
                        }).join('')}
                        ${botaoMais(corte.ocultos, corte.chave)}
                        <div class="mn-drop"></div>
                    </div>
                </div>`;
            }
        }

        html += `</div>`;

        // Backlog do mês (tasks sem data) — também é zona de drop
        const backlogTasks = ordenarBacklog(allTasks.filter(t => !plannerData[t.id]));
        if (backlogTasks.length) {
            html += `<div class="mn-backlog" data-col="backlog">
                <details>
                    <summary>${tr('backlog')} (${tr('backlogCount', { n: backlogTasks.length })})</summary>
                    <div style="margin-top:6px;">
                    ${backlogTasks.map(t => `
                        <div class="mn-blog-item"
                             tabindex="0" role="button" aria-label="${esc(t.text)}"
                             draggable="${!mobile}"
                             data-task-id="${esc(t.id)}"
                             data-note-id="${esc(t.noteId)}"
                             data-cb-index="${t.checkboxIndex}">
                            <span class="mn-blog-text" tabindex="0" role="link" data-note-id="${esc(t.noteId)}">${esc(t.text)}</span>
                            ${renderLinkBadge(t.noteLinks)}
                            <span class="mn-blog-note" title="${esc(t.noteTitle)}">${esc(t.noteTitle)}</span>
                        </div>`).join('')}
                    </div>
                </details>
            </div>`;
        }

        html += `</div></div>`;

        $pl.html(html);
        bindMonthEvents(monthView);
    }


    /* ═══════════════════════════════════════════════════════════
        7e. EVENTOS DO MÊS
    ═══════════════════════════════════════════════════════════ */

    function bindMonthEvents(monthView) {

        $pl.find('#month-prev').on('click',  () => { monthOffset--; renderPlanner(); });
        $pl.find('#month-next').on('click',  () => { monthOffset++; renderPlanner(); });
        $pl.find('#month-now').on('click',   () => { monthOffset = 0; renderPlanner(); });

        $pl.find('#month-reload').on('click', async function () {
            const $btn = $(this);
            $btn.text('…');
            await recarregarTarefas();
            if ($btn.parent().length) $btn.text('⟳');
        });

        $pl.find('#month-clear').on('click', () => {
            const monthKeys = new Set();
            for (const week of monthView.weeks) {
                for (const day of week) monthKeys.add(day.key);
            }
            limparPlanejamento(monthKeys, monthLabel(monthView));
        });

        $pl.find('.pl-mode-btn').on('click', async function () {
            const mode = $(this).data('mode');
            if (mode === viewMode) return;
            viewMode = mode;
            plannerData._viewMode = mode;
            await save();
            renderPlanner();
        });

        // Clique no item do backlog → abre a nota (desktop; no mobile o tap agenda)
        $pl.find('.mn-blog-item').on('click', function (e) {
            if (isMobile()) return; // no mobile o picker assume
            if (!$(e.target).closest('.mn-blog-item').length) return;
            api.activateNote($(this).data('noteId'));
        });

        // ✓ concluir
        $pl.find('.mn-done-btn').on('click', async function (e) {
            e.stopPropagation();
            const $chip = $(this).closest('.mn-task');
            const taskId  = String($chip.data('taskId'));
            const noteId  = String($chip.data('noteId'));
            const cbIndex = parseInt($chip.data('cbIndex'), 10);
            if (!taskId || !noteId || isNaN(cbIndex)) return;
            try {
                await markDone({ id: taskId, noteId, checkboxIndex: cbIndex });
                renderPlanner();
                renderTasks();
            } catch (err) { console.error('month markDone error:', err); aviso(tr('taskError', { err: err.message || err })); }
        });

        /* ── Desktop: drag-and-drop entre células ───────────── */
        if (!isMobile()) {

            let draggingId = null;

            $pl.find('.mn-task, .mn-blog-item').each(function () {
                this.addEventListener('dragstart', function (e) {
                    draggingId = this.dataset.taskId;
                    this.classList.add('was-dragged');
                    e.dataTransfer.effectAllowed = 'move';
                    setTimeout(() => this.classList.add('dragging'), 0);
                });
                this.addEventListener('dragend', function () {
                    this.classList.remove('dragging');
                    const el = this;
                    setTimeout(() => el.classList.remove('was-dragged'), 250);
                    $pl.find('.mn-cell').removeClass('drag-over');
                    $pl.find('.mn-backlog').removeClass('drag-over');
                    draggingId = null;
                });
            });

            // Click no chip → abre a nota (desktop)
            $pl.find('.mn-task').each(function () {
                this.addEventListener('click', function () {
                    if (!this.classList.contains('was-dragged'))
                        api.activateNote(this.dataset.noteId);
                    this.classList.remove('was-dragged');
                });
            });

            // Drop em células do calendário (dias do mês)
            $pl.find('.mn-cell').each(function () {
                const cell = this;
                cell.addEventListener('dragover', e => {
                    e.preventDefault();
                    cell.classList.add('drag-over');
                });
                cell.addEventListener('dragleave', e => {
                    if (!cell.contains(e.relatedTarget)) cell.classList.remove('drag-over');
                });
                cell.addEventListener('drop', async e => {
                    e.preventDefault();
                    cell.classList.remove('drag-over');
                    if (!draggingId) return;
                    const col = cell.dataset.col;
                    const oldDay = plannerData[draggingId];
                    if (oldDay && oldDay !== col && plannerData._order && plannerData._order[oldDay]) {
                        plannerData._order[oldDay] = plannerData._order[oldDay].filter(id => id !== draggingId);
                    }
                    plannerData[draggingId] = col;
                    await save();
                    renderPlanner();
                    renderTasks();
                });
            });

            // Zona de drop do backlog — desagenda a task (volta para backlog)
            const $backlog = $pl.find('.mn-backlog');
            if ($backlog.length) {
                $backlog[0].addEventListener('dragover', e => {
                    e.preventDefault();
                    $backlog.addClass('drag-over');
                });
                $backlog[0].addEventListener('dragleave', e => {
                    if (!$backlog[0].contains(e.relatedTarget)) $backlog.removeClass('drag-over');
                });
                $backlog[0].addEventListener('drop', async e => {
                    e.preventDefault();
                    $backlog.removeClass('drag-over');
                    if (!draggingId) return;
                    const oldDay = plannerData[draggingId];
                    delete plannerData[draggingId];
                    if (oldDay && plannerData._order && plannerData._order[oldDay]) {
                        plannerData._order[oldDay] = plannerData._order[oldDay].filter(id => id !== draggingId);
                    }
                    await save();
                    renderPlanner();
                    renderTasks();
                });
            }
        }

        /* ── Mobile: tap no chip → sheet picker ─────────────── */
        if (isMobile()) {

            $pl.find('.mn-task').on('click', function () {
                const taskId = $(this).data('taskId');
                abrirSeletorDia(taskId, $(this).text().replace('✓', '').trim(), plannerData[taskId] || 'backlog', opcoesMes());
            });

            $pl.find('.mn-blog-item').on('click', function () {
                const taskId = $(this).data('taskId');
                abrirSeletorDia(taskId, $(this).find('.mn-blog-text').text().trim(), 'backlog', opcoesMes());
            });
        }
    }


    /* ═══════════════════════════════════════════════════════════
        8. EVENTOS DO PLANEJADOR
    ═══════════════════════════════════════════════════════════ */

    function bindPlannerEvents(weekCols) {

        $pl.find('#pl-prev').on('click', () => { weekOffset--; renderPlanner(); });
        $pl.find('#pl-next').on('click', () => { weekOffset++; renderPlanner(); });
        $pl.find('#pl-now').on('click',  () => { weekOffset = 0; renderPlanner(); });

        $pl.find('#pl-roll').on('click', () => rolarSemana(weekCols));

        $pl.find('#pl-reload').on('click', async function () {
            const $btn = $(this);
            $btn.text('…');
            await recarregarTarefas();
            if ($btn.parent().length) $btn.text('⟳');
        });

        $pl.find('.pl-mode-btn').on('click', async function () {
            const mode = $(this).data('mode');
            if (mode === viewMode) return;
            viewMode = mode;
            plannerData._viewMode = mode;
            await save();
            renderPlanner();
        });

        $pl.find('#pl-clear').on('click', () => {
            limparPlanejamento(new Set(weekCols.map(c => c.key)), weekLabel(weekCols));
        });

        /* ── Desktop: drag-and-drop ─────────────────────────── */
        if (!isMobile()) {

            let draggingId       = null;
            let draggingFromCol  = null;
            let insertBeforeId   = null;

            function clearMarkers() {
                $pl.find('.pl-insert-marker').remove();
                $pl.find('.pl-tasks').removeClass('drag-over');
            }

            function getInsertTarget(zone, clientY) {
                const cards = Array.from(zone.querySelectorAll('.pl-task:not(.dragging)'));
                for (const card of cards) {
                    const rect = card.getBoundingClientRect();
                    if (clientY < rect.top + rect.height / 2) {
                        return card.dataset.taskId;
                    }
                }
                return null;
            }

            function showInsertMarker(zone, insertBefore) {
                $pl.find('.pl-insert-marker').remove();
                const $marker = $('<div class="pl-insert-marker">').css({
                    height: '2px',
                    borderRadius: '2px',
                    background: 'var(--main-active-border-color,#89b4fa)',
                    margin: '2px 0',
                    pointerEvents: 'none',
                    flexShrink: 0,
                });
                if (insertBefore) {
                    const $target = $(zone).find(`.pl-task[data-task-id="${CSS.escape(insertBefore)}"]`);
                    if ($target.length) { $marker.insertBefore($target); return; }
                }
                const $drop = $(zone).find('.pl-drop');
                if ($drop.length) $marker.insertBefore($drop);
                else $(zone).append($marker);
            }

            $pl.find('.pl-task').each(function () {

                this.addEventListener('dragstart', function (e) {
                    draggingId = this.dataset.taskId;
                    // FIX: lê a coluna de origem diretamente do elemento pai
                    const zone = this.closest('.pl-tasks');
                    draggingFromCol = zone ? zone.dataset.col : 'backlog';
                    this.classList.add('was-dragged');
                    e.dataTransfer.effectAllowed = 'move';
                    setTimeout(() => this.classList.add('dragging'), 0);
                });

                this.addEventListener('dragend', function () {
                    this.classList.remove('dragging');
                    const el = this;
                    setTimeout(() => el.classList.remove('was-dragged'), 250);
                    clearMarkers();
                    draggingId = draggingFromCol = insertBeforeId = null;
                });

                this.addEventListener('click', function () {
                    if (!this.classList.contains('was-dragged'))
                        api.activateNote(this.dataset.noteId);
                    this.classList.remove('was-dragged');
                });
            });

            $pl.find('.pl-tasks').each(function () {
                const zone = this;

                zone.addEventListener('dragover', e => {
                    e.preventDefault();
                    const col = zone.dataset.col;
                    zone.classList.add('drag-over');
                    if (col !== 'backlog') {
                        insertBeforeId = getInsertTarget(zone, e.clientY);
                        showInsertMarker(zone, insertBeforeId);
                    }
                });

                zone.addEventListener('dragleave', e => {
                    if (!zone.contains(e.relatedTarget)) {
                        zone.classList.remove('drag-over');
                        $pl.find('.pl-insert-marker').remove();
                    }
                });

                zone.addEventListener('drop', async e => {
                    e.preventDefault();
                    if (!draggingId) return;
                    const col = zone.dataset.col;

                    if (col === 'backlog') {
                        const oldDay = plannerData[draggingId];
                        delete plannerData[draggingId];
                        if (oldDay && plannerData._order && plannerData._order[oldDay]) {
                            plannerData._order[oldDay] =
                                plannerData._order[oldDay].filter(id => id !== draggingId);
                        }
                    } else {
                        const oldDay = plannerData[draggingId];
                        if (oldDay && oldDay !== col && plannerData._order && plannerData._order[oldDay]) {
                            plannerData._order[oldDay] =
                                plannerData._order[oldDay].filter(id => id !== draggingId);
                        }
                        plannerData[draggingId] = col;
                        setOrder(col, draggingId, insertBeforeId);
                    }

                    clearMarkers();
                    await save();
                    renderPlanner();
                    renderTasks();
                });
            });
        }

        /* ── Mobile: tap → sheet picker ─────────────────────── */
        if (isMobile()) {
            $pl.find('.pl-task').on('click', function () {
                const taskId   = $(this).data('taskId');
                const taskText = $(this).find('div').first().text();
                abrirSeletorDia(taskId, taskText, plannerData[taskId] || 'backlog', opcoesSemana());
            });
        }

        /* ── Done button on planner cards ────────────────────── */
        $pl.find('.pl-done-btn').on('click', async function (e) {
            e.stopPropagation();
            const $card = $(this).closest('.pl-task');
            const taskId = String($card.data('taskId'));
            const noteId = String($card.data('noteId'));
            const cbIndex = parseInt($card.data('cbIndex'), 10);
            if (!taskId || !noteId || isNaN(cbIndex)) return;
            try {
                await markDone({ id: taskId, noteId, checkboxIndex: cbIndex });
                renderPlanner();
                renderTasks();
            } catch (err) { console.error('markDone error:', err); aviso(tr('taskError', { err: err.message || err })); }
        });
    }


    /* ═══════════════════════════════════════════════════════════
       9. RENDER — TAREFAS ABERTAS ($tk)
    ═══════════════════════════════════════════════════════════ */

    function renderTasks() {
        const scrollSalvo = capturarScroll();

        const total = allTasks.length;

        const grouped = new Map();
        for (const t of allTasks) {
            if (!grouped.has(t.noteId))
                grouped.set(t.noteId, { noteTitle: t.noteTitle, noteId: t.noteId, tasks: [] });
            grouped.get(t.noteId).tasks.push(t);
        }

        let html = `
        <style>
            .tk-head { display:flex;align-items:center;gap:8px;padding:10px 14px;
                       flex-shrink:0;border-bottom:1px solid var(--main-border-color,#313244); }
            .tk-head-title { font-size:19px;font-weight:700; }
            .tk-total { font-size:16px;color:var(--muted-text-color); }
            .tk-list { overflow-y:auto;flex:1;padding:12px 14px; }
            .tk-empty { color:var(--muted-text-color);font-size:17px;margin-top:4px; }
            .tk-group { background:var(--accented-background-color,#1e1e2e);
                        border:1px solid var(--main-border-color,#313244);
                        border-radius:8px;margin-bottom:14px;overflow:hidden; }
            .tk-note-link { display:flex;align-items:center;gap:5px;padding:8px 10px;
                            cursor:pointer;font-size:14px;font-weight:700;text-transform:uppercase;
                            letter-spacing:.06em;color:var(--muted-text-color,#888);
                            background:linear-gradient(rgba(0,0,0,.05),rgba(0,0,0,.05));
                            border-bottom:1px solid var(--main-border-color,#313244);
                            transition:color .15s; }
            .tk-note-link:hover { color:var(--main-text-color); }
            .tk-col-icon { font-size:12px;opacity:.5;width:12px;text-align:center;flex-shrink:0; }
            .tk-note-title { flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }
            .tk-badge { font-size:13px;background:rgba(128,128,128,.15);color:var(--muted-text-color);
                        padding:0 6px;border-radius:8px;white-space:nowrap;flex-shrink:0; }
            .tk-badge.done { background:rgba(46,204,113,.15);color:var(--active-item-background-color,#a6e3a1); }
            .tk-tasks { border-left:2px solid var(--main-border-color,#313244);
                        margin:0 10px;padding:6px 0 8px 10px; }
            .tk-task-row { display:flex;align-items:flex-start;gap:6px;
                           padding:4px 8px;margin:2px 0;border-radius:5px;line-height:1.5;
                           border:1.5px solid transparent;transition:background .12s,border-color .12s; }
            .tk-task-row:hover { background:rgba(0,0,0,.05);border-color:rgba(128,128,128,.18); }
            .tk-check { flex-shrink:0;width:15px;height:15px;margin-top:3px;
                        border:1.5px solid var(--main-border-color,#45475a);
                        border-radius:3px;display:inline-flex;align-items:center;
                        justify-content:center;cursor:pointer;font-size:12px;color:transparent;
                        transition:border-color .15s,background .15s,color .15s;user-select:none; }
            .tk-task-text { cursor:pointer;font-size:17px;transition:color .15s;overflow-wrap:anywhere; }
            .tk-task-text:hover { text-decoration:underline; }
            .tk-day-badge { display:inline-block;font-size:13px;padding:1px 6px;border-radius:3px;
                            margin-left:5px;background:var(--accented-background-color);
                            color:var(--muted-text-color);white-space:nowrap;vertical-align:middle; }
        </style>

            <!-- CABEÇALHO TAREFAS -->
            <div class="tk-head">
                <span class="tk-head-title">${tr('tasks')}</span>
                <span class="tk-total">${total}</span>
            </div>

            <!-- LISTA -->
            <div class="tk-list">
        `;

        if (total === 0) {
            html += `
                <p class="tk-empty">${tr('noOpenTasks')}</p>`;
        } else {
            for (const [, group] of grouped) {
                const stats = cbStats[group.noteId];
                const done = stats ? stats.checked : 0;
                const totalCbs = stats ? stats.total : group.tasks.length;
                const badgeText = done > 0 ? `${done}/${totalCbs}` : `${group.tasks.length}`;
                const collapsed = collapsedNotes.has(group.noteId);
                const corte = cortarLista(group.tasks, LIMITE_GRUPO, 'tk:' + group.noteId);

                html += `
                <div class="tk-group${collapsed ? ' tk-collapsed' : ''}">

                    <div class="tk-note-link" tabindex="0" role="button" data-note-id="${esc(group.noteId)}">
                        <span class="tk-col-icon">${collapsed ? '▸' : '▾'}</span>
                        <span class="tk-note-title" title="${esc(group.noteTitle)}">${esc(group.noteTitle)}</span>
                        <span class="tk-badge${done > 0 ? ' done' : ''}">${badgeText}</span>
                    </div>

                    <div class="tk-tasks"${collapsed ? ' style="display:none;"' : ''}>
                        ${corte.visiveis.map(t => {

                            const day = plannerData[t.id];
                            const badge = day
                                ? `<span class="tk-day-badge">${dayBadge(day)}</span>`
                                : '';

                            return `
                            <div class="tk-task-row"
                                 data-task-id="${esc(t.id)}"
                                 data-note-id="${esc(t.noteId)}"
                                 data-cb-index="${t.checkboxIndex}">

                                <span class="tk-check" tabindex="0" role="button" aria-label="${tr('markDone')}" title="${tr('markDone')}">✓</span>

                                <div style="flex:1;min-width:0;">
                                    <span class="tk-task-text" tabindex="0" role="link" data-note-id="${esc(t.noteId)}">
                                        ${esc(t.text)}${badge}
                                    </span>
                                    ${t.tags && t.tags.length
                                        ? `<div class="task-tags" style="margin-top:2px;">${renderTagBadges(t.tags)}</div>`
                                        : ''}
                                    ${renderDoingBar(t.tags)}
                                    ${renderLinkBadge(t.noteLinks)}
                                </div>

                            </div>`;
                        }).join('')}
                        ${botaoMais(corte.ocultos, corte.chave)}
                    </div>

                </div>`;
            }
        }

        html += `</div>`;
        $tk.html(html);
        restaurarScroll(scrollSalvo);
    }


    /* ═══════════════════════════════════════════════════════════
       10. EVENTOS DO PAINEL DE TAREFAS
    ═══════════════════════════════════════════════════════════ */

    function bindTaskEvents() {

        $tk.on('click', '.tk-note-link', function (e) {
            const noteId = $(this).data('noteId');
            if ($(e.target).hasClass('tk-col-icon')) {
                if (collapsedNotes.has(noteId)) {
                    collapsedNotes.delete(noteId);
                } else {
                    collapsedNotes.add(noteId);
                }
                renderTasks();
                return;
            }
            // Clique no texto → abre a nota
            api.activateNote(noteId);
        });

        $tk.on('click', '.tk-task-text', function () {
            api.activateNote($(this).data('noteId'));
        });

        $tk.on('click', '.tk-check', async function () {

            const $check = $(this);
            if ($check.hasClass('completing')) return;

            const $row    = $check.closest('.tk-task-row');
            const taskId  = String($row.data('taskId'));
            const noteId  = String($row.data('noteId'));
            const cbIndex = parseInt($row.data('cbIndex'), 10);

            $check.addClass('completing').css({
                borderColor:   'var(--active-item-background-color,#a6e3a1)',
                background:    'rgba(166,227,161,.15)',
                color:         'var(--active-item-background-color,#a6e3a1)',
                pointerEvents: 'none',
            });

            try {
                await markDone({ id: taskId, noteId, checkboxIndex: cbIndex });
                renderPlanner();
                renderTasks();
            } catch (err) {
                console.error('markDone error:', err);
                aviso(tr('taskError', { err: err.message || err }));
                $check.removeClass('completing').css({
                    borderColor:   'var(--main-border-color,#45475a)',
                    background:    'transparent',
                    color:         'transparent',
                    pointerEvents: '',
                });
            }
        });
    }


    /* ═══════════════════════════════════════════════════════════
       11. INICIAR
    ═══════════════════════════════════════════════════════════ */

    try {
        // Idioma da interface (o demo é EN; o VPS é PT) — antes do primeiro render de verdade
        try {
            const loc = await api.runOnBackend(() => (typeof api.getOption === 'function' ? (api.getOption('locale') || '') : ''));
            if (loc) wpLang = /^en/i.test(String(loc)) ? 'en' : 'pt';
            $pl.html(telaCarregando());
            $tk.html(telaCarregando());
        } catch (_) {}

        const loaded = await loadPlannerData();
        plannerData = loaded.data || {};
        if (loaded.missing) {
            aviso(tr('missingData'));
        } else if (loaded.corrupt) {
            console.error('planner-data.json ilegível (conteúdo bruto para recuperação):', loaded.raw);
            aviso(tr('corruptData'));
        }
        if (plannerData._viewMode === 'gantt' || plannerData._viewMode === 'kanban' || plannerData._viewMode === 'month') {
            viewMode = plannerData._viewMode;
        }
        await fetchTasks();
        migrateIds(); // converte IDs antigos na primeira carga; inofensivo se já migrado
    } catch (err) {
        const msg = esc(String(err.message || err));
        $pl.html(`<div style="padding:24px;color:var(--main-text-color);font-size:17px">
            ${tr('initError', { err: msg })}
            <div style="margin-top:14px;">
                <button type="button" id="pl-init-retry" style="padding:6px 14px;cursor:pointer;">${tr('retry')}</button>
            </div>
        </div>`);
        $tk.html('');
        $pl.find('#pl-init-retry').on('click', () => location.reload());
        return;
    }

    // Se o primeiro render falhar, mostra o erro em vez de ficar preso no "carregando"
    try {
        renderPlanner();
        renderTasks();
        bindTaskEvents();
    } catch (err) {
        console.error('render error:', err);
        $pl.html(`<div style="padding:24px;color:var(--main-text-color);font-size:17px">
            ${tr('initError', { err: esc(String(err.message || err)) })}
        </div>`);
        $tk.html('');
        return;
    }

    // Enter/Espaço ativam os controles focáveis (a11y)
    $root.on('keydown', function (e) {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        const el = e.target;
        if (!el || !el.matches) return;
        if (!el.matches('.pl-mode-btn, .pl-task, .mn-task, .mn-blog-item, .pl-done-btn, .mn-done-btn, .gantt-done-btn, .gantt-blog-check, .gantt-task-label, .gantt-blog-text, .mn-blog-text, .tk-task-text, .tk-check, .gantt-bar')) return;
        e.preventDefault();
        e.stopPropagation();
        $(el).trigger('click');
    });

    // "+N": expande a lista limitada de cards (C3.4)
    $root.on('click', '.wp-mais', function () {
        expandidos.add(String($(this).data('expandir')));
        renderPlanner();
        renderTasks();
    });

    // Atalhos de teclado (Q8): setas navegam, "t" hoje, "r" recarrega, Esc fecha diálogos
    window.__wpAtalhos = function (e) {
        if (!document.body.contains($root[0])) return;
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        const alvo = e.target;
        if (alvo && alvo.closest && alvo.closest('input, textarea, select, [contenteditable="true"], [contenteditable=""]')) return;
        const aberto = $root.find('#wp-confirm').length > 0 || $root.find('#wp-picker').length > 0;
        if (e.key === 'Escape') {
            if ($root.find('#wp-confirm').length) { $root.find('#wp-confirm-cancel').trigger('click'); return; }
            if (aberto) $root.find('#wp-picker').remove();
            return;
        }
        if (aberto) return;
        if (!$pl.is(':visible')) return;
        // atalhos de navegação só com o foco dentro do plugin (não rouba setas da nota/árvore)
        if (!$root[0].contains(document.activeElement)) return;
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            const dir = e.key === 'ArrowLeft' ? -1 : 1;
            if (viewMode === 'month') monthOffset += dir; else weekOffset += dir;
            renderPlanner();
            e.preventDefault();
        } else if (e.key === 't' || e.key === 'T') {
            weekOffset = 0; monthOffset = 0; renderPlanner();
        } else if (e.key === 'r' || e.key === 'R') {
            recarregarTarefas();
        } else if (e.key === 'm' || e.key === 'M') {
            const el = document.activeElement;
            if (el && el.matches && el.matches('.pl-task, .mn-task')) {
                const taskId = el.dataset.taskId;
                if (taskId) {
                    abrirSeletorDia(taskId, el.textContent.trim(), plannerData[taskId] || 'backlog',
                                    viewMode === 'month' ? opcoesMes() : opcoesSemana());
                    e.preventDefault();
                }
            }
        }
    };
    if (!window.__wpTeclasBound) {
        window.__wpTeclasBound = true;
        document.addEventListener('keydown', (e) => window.__wpAtalhos && window.__wpAtalhos(e));
    }

})();