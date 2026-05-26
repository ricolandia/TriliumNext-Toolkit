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

    $root.css({
        display:    'flex',
        height:     '100%',
        overflow:   'hidden',
        fontFamily: 'var(--detail-font-family,"Segoe UI",sans-serif)',
        fontSize:   '14px',
        color:      'var(--main-text-color)',
        boxSizing:  'border-box',
    });

    // painel esquerdo — Planejador (2/3)
    const $pl = $('<div>').css({
        flex:          '2',
        minWidth:      0,
        overflow:      'hidden',
        display:       'flex',
        flexDirection: 'column',
        borderRight:   '1px solid var(--main-border-color,#313244)',
    }).appendTo($root);

    // painel direito — Tarefas Abertas (1/3)
    const $tk = $('<div>').css({
        flex:          '1',
        minWidth:      '200px',
        maxWidth:      '320px',
        overflow:      'hidden',
        display:       'flex',
        flexDirection: 'column',
    }).appendTo($root);

    const loadingHtml = `
        <div style="display:flex;align-items:center;gap:10px;padding:24px;color:var(--muted-text-color)">
            <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none"
                 style="animation:spin 1s linear infinite;flex-shrink:0">
                <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="2"
                        stroke-dasharray="28" stroke-dashoffset="10"/>
            </svg>
            Carregando…
        </div>`;

    $pl.html(loadingHtml);
    $tk.html(loadingHtml);


    /* ═══════════════════════════════════════════════════════════
       1. ESTADO COMPARTILHADO
    ═══════════════════════════════════════════════════════════ */

    let weekOffset  = 0;
    let allTasks    = [];    // { id, text, tags, checkboxIndex, noteId, noteTitle }
    let plannerData = {};    // { taskId: 'YYYY-MM-DD' }


    /* ═══════════════════════════════════════════════════════════
       2. PERSISTÊNCIA (nota #plannerdata)
    ═══════════════════════════════════════════════════════════ */

    async function loadPlannerData() {
        return await api.runOnBackend(() => {
            const note = api.getNoteWithLabel('plannerdata');
            if (!note) return {};
            try {
                const raw = note.getContent();
                return raw ? JSON.parse(raw) : {};
            } catch (_) { return {}; }
        });
    }

    async function save() {
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
        } catch (err) { console.error('save error:', err); }
    }


    /* ═══════════════════════════════════════════════════════════
       2b. PARSE DE TAGS (#todo, #doing=N%, #done, #upto=MM-DD-YYYY)
    ═══════════════════════════════════════════════════════════ */

    function parseTaskTags(text) {
        const tags = [];
        let cleanText = String(text);

        // #doing=N% ou #doing=N (0-100)
        cleanText = cleanText.replace(/#doing=(\d{1,3})%?/gi, (m, n) => {
            const v = Math.max(0, Math.min(100, parseInt(n, 10)));
            tags.push({ type: 'progress', value: v, label: `#doing=${v}%` });
            return '';
        });

        // #upto=MM-DD-YYYY
        cleanText = cleanText.replace(/#upto=(\d{2}-\d{2}-\d{4})/gi, (m, d) => {
            tags.push({ type: 'deadline', value: d, label: `#upto=${d}` });
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

        cleanText = cleanText.replace(/\s+/g, ' ').trim();
        return { cleanText, tags };
    }


    /* ═══════════════════════════════════════════════════════════
       3. BUSCA DE TAREFAS (rastreia checkboxIndex por nota)
    ═══════════════════════════════════════════════════════════ */

    async function fetchTasks() {

        const groups = await api.runOnBackend(() => {

            const rows = api.sql.getRows(`
                SELECT noteId, title
                FROM notes
                WHERE isDeleted = 0 AND type = 'text'
                ORDER BY title COLLATE NOCASE
            `);

            const result = [];

            for (const row of rows) {
                const note = api.getNote(row.noteId);
                if (!note) continue;
                const content = note.getContent();
                if (!content || !content.includes('checkbox')) continue;

                const tasks = [];
                const re = /<input\s[^>]*type=["']checkbox["'][^>]*>/gi;
                let m;
                let cbIndex = 0; // conta TODOS os checkboxes da nota (incl. marcados)

                while ((m = re.exec(content)) !== null) {

                    const isChecked = /checked/i.test(m[0]);

                    if (!isChecked) {
                        const ss = content.indexOf('<span', m.index);
                        const se = content.indexOf('</span>', ss);
                        if (ss !== -1 && se !== -1) {
                            const raw = content.substring(
                                content.indexOf('>', ss) + 1, se
                            );
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

                    cbIndex++; // incrementa sempre, mesmo para marcados
                }

                if (tasks.length) {
                    result.push({
                        noteId: row.noteId,
                        title:  row.title || '(sem título)',
                        tasks,
                    });
                }
            }

            return result;
        });

        allTasks = [];

        for (const g of groups) {
            for (const task of g.tasks) {
                            // FIX: ID usa cbIndex em vez de texto — elimina colisões
                const id = `${g.noteId}::${task.cbIndex}`;
                const { cleanText, tags } = parseTaskTags(task.text);
                allTasks.push({
                    id,
                    text:           cleanText,
                    tags,
                    checkboxIndex:  task.cbIndex,
                    noteId:         g.noteId,
                    noteTitle:      g.title,
                });
            }
        }
    }


    /* ═══════════════════════════════════════════════════════════
       3b. MIGRAÇÃO DE IDs ANTIGOS → NOVOS
           Converte plannerData salvo no formato antigo
           (noteId::primeiros_48_chars) para o novo (noteId::cbIndex).
           Roda uma única vez; pode ser removida após uma semana de uso.
    ═══════════════════════════════════════════════════════════ */

    function migrateIds() {
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

    async function markDone(task) {

        await api.runOnBackend((noteId, cbIndex) => {
            const note = api.getNote(noteId);
            let content = note.getContent();
            let count = 0;
            content = content.replace(
                /<input\s+type="checkbox"([^>]*?)>/gi,
                (match, attrs) => {
                    if (count++ === cbIndex) {
                        if (/\bchecked\b/i.test(attrs)) return match;
                        return `<input type="checkbox"${attrs} checked>`;
                    }
                    return match;
                }
            );
            note.setContent(content);
        }, [task.noteId, task.checkboxIndex]);

        // remove do estado compartilhado
        allTasks = allTasks.filter(t => t.id !== task.id);
        const oldDay = plannerData[task.id];
        delete plannerData[task.id];
        // limpa da ordem do dia
        if (oldDay && plannerData._order && plannerData._order[oldDay]) {
            plannerData._order[oldDay] = plannerData._order[oldDay].filter(id => id !== task.id);
        }
    }


    /* ═══════════════════════════════════════════════════════════
       5. HELPERS DE CALENDÁRIO
    ═══════════════════════════════════════════════════════════ */

    const todayBase = new Date();
    todayBase.setHours(0, 0, 0, 0);

    function getWeekCols(offset) {
        const ref = new Date(todayBase);
        ref.setDate(todayBase.getDate() + offset * 7);
        const dow = ref.getDay();
        const mon = new Date(ref);
        mon.setDate(ref.getDate() + (dow === 0 ? -6 : 1 - dow));
        const labels = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];
        return labels.map((label, i) => {
            const d = new Date(mon);
            d.setDate(mon.getDate() + i);
            const iso = d.toISOString().slice(0, 10);
            return {
                key:     iso,
                label,
                dateStr: `${d.getDate()}/${d.getMonth() + 1}`,
                isToday: d.getTime() === todayBase.getTime(),
            };
        });
    }

    function weekLabel(cols) {
        const months = ['jan','fev','mar','abr','mai','jun',
                        'jul','ago','set','out','nov','dez'];
        const d0 = new Date(cols[0].key + 'T12:00:00');
        const d1 = new Date(cols[6].key + 'T12:00:00');
        if (d0.getMonth() === d1.getMonth())
            return `${d0.getDate()}–${d1.getDate()} ${months[d0.getMonth()]} ${d0.getFullYear()}`;
        return `${d0.getDate()} ${months[d0.getMonth()]} – ${d1.getDate()} ${months[d1.getMonth()]} ${d1.getFullYear()}`;
    }

    function dayBadge(isoDate) {
        const d = new Date(isoDate + 'T12:00:00');
        const days = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
        return `${days[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;
    }


    /* ═══════════════════════════════════════════════════════════
       6. HELPERS GERAIS
    ═══════════════════════════════════════════════════════════ */

    const esc = s => String(s)
        .replace(/&/g,'&amp;').replace(/</g,'&lt;')
        .replace(/>/g,'&gt;').replace(/"/g,'&quot;');

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
                    return `<span class="tag-badge tag-upto">⇢ ${parts[1]}/${parts[0]}</span>`;
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

    const isMobile   = () => window.innerWidth < 700;
    const getBacklog = () => allTasks.filter(t => !plannerData[t.id]);

    function getDayTasks(iso) {
        const tasks = allTasks.filter(t => plannerData[t.id] === iso);
        const order = ((plannerData._order || {})[iso]) || [];
        tasks.sort((a, b) => {
            const ai = order.indexOf(a.id);
            const bi = order.indexOf(b.id);
            if (ai === -1 && bi === -1) return 0;
            if (ai === -1) return 1;
            if (bi === -1) return -1;
            return ai - bi;
        });
        return tasks;
    }

    function setOrder(col, taskId, insertBeforeId) {
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

        const weekCols      = getWeekCols(weekOffset);
        const label         = weekLabel(weekCols);
        const mobile        = isMobile();
        const isCurrentWeek = weekOffset === 0;
        const total         = allTasks.length;
        const weekKeys      = new Set(weekCols.map(c => c.key));
        const planned       = allTasks.filter(t => weekKeys.has(plannerData[t.id])).length;

        const allCols = [
            { key: 'backlog', label: 'Backlog', dateStr: 'sem data', isToday: false, isBacklog: true },
            ...weekCols.map(c => ({ ...c, isBacklog: false })),
        ];

        let html = `
        <style>
            .pl-board { display:flex;gap:10px;overflow-x:auto;padding:0 16px 20px;flex:1;
                        align-items:flex-start;-webkit-overflow-scrolling:touch; }
            .pl-col   { flex-shrink:0;display:flex;flex-direction:column;border-radius:8px;
                        border:1px solid var(--main-border-color,#313244);
                        background:var(--accented-background-color,#1e1e2e);
                        max-height:calc(100vh - 190px); }
            .pl-col.today { border-color:var(--main-active-border-color,#89b4fa); }
            .pl-col-head  { padding:10px 12px 8px;border-bottom:1px solid var(--main-border-color,#313244);flex-shrink:0; }
            .pl-col-label { font-size:15px;font-weight:700;text-transform:uppercase;
                            letter-spacing:.08em;color:var(--muted-text-color,#888); }
            .pl-col.today .pl-col-label { color:var(--main-active-border-color,#89b4fa); }
            .pl-col-sub   { font-size:15px;color:var(--muted-text-color,#888);margin-top:2px; }
            .pl-tasks { padding:8px;display:flex;flex-direction:column;gap:8px;
                        overflow-y:auto;flex:1;min-height:64px; }
            .pl-task  { background:linear-gradient(rgba(0,0,0,.07),rgba(0,0,0,.07)),var(--accented-background-color,#1e1e2e);border-radius:5px;
                        padding:10px 12px;font-size:17px;line-height:1.5;cursor:grab;
                        border:1.5px solid transparent;transition:border-color .1s,opacity .15s;
                        user-select:none; }
            .pl-task:hover   { border-color:var(--main-border-color,#45475a); }
            .pl-task.dragging { opacity:.35;cursor:grabbing; }
            .pl-task-note { font-size:14px;color:var(--muted-text-color,#888);margin-top:6px;
                            overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }
            .pl-drop { display:none;height:40px;border:2px dashed var(--main-border-color,#45475a);
                       border-radius:5px;opacity:.4; }
            .pl-tasks.drag-over { background:rgba(137,180,250,.06); }
            .pl-tasks.drag-over .pl-drop { display:block; }
            .pl-insert-marker { height:2px;border-radius:2px;flex-shrink:0;
                                background:var(--main-active-border-color,#89b4fa);
                                margin:2px 0;pointer-events:none; }
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
            /* mobile picker */
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
        </style>

        <div style="display:flex;flex-direction:column;height:100%;overflow:hidden;">

            <!-- CABEÇALHO PLANNER -->
            <div style="display:flex;align-items:center;gap:7px;padding:10px 16px;
                        flex-shrink:0;border-bottom:1px solid var(--main-border-color,#313244);
                        flex-wrap:wrap;">
                <span style="font-size:19px;font-weight:700;">Planejador</span>
                <button class="pl-nav-btn" id="pl-prev" title="Semana anterior">‹</button>
                <span style="font-size:16px;color:var(--muted-text-color);white-space:nowrap;">
                    ${esc(label)}
                </span>
                <button class="pl-nav-btn" id="pl-next" title="Próxima semana">›</button>
                ${!isCurrentWeek ? `<button class="pl-today-btn" id="pl-now">hoje</button>` : ''}
                <span style="font-size:14px;color:var(--muted-text-color);margin-left:auto;">
                    ${planned}/${total}
                </span>
                <button class="pl-icon-btn" id="pl-clear"  title="Limpar esta semana">↺</button>
                <button class="pl-icon-btn" id="pl-reload" title="Recarregar tarefas">⟳</button>
            </div>

            <!-- BOARD -->
            <div class="pl-board">
        `;

        for (const col of allCols) {

            const tasks = col.isBacklog ? getBacklog() : getDayTasks(col.key);
            const width = col.isBacklog
                ? (mobile ? '150px' : '180px')
                : (mobile ? '130px' : '180px');

            html += `
            <div class="pl-col${col.isToday ? ' today' : ''}" style="width:${width};">
                <div class="pl-col-head">
                    <div class="pl-col-label">${esc(col.label)}</div>
                    <div class="pl-col-sub">
                        ${esc(col.dateStr)}${tasks.length ? ' · ' + tasks.length : ''}
                    </div>
                </div>
                <div class="pl-tasks" data-col="${esc(col.key)}">
                    ${tasks.map(t => `
                    <div class="pl-task"
                         draggable="${!mobile}"
                         data-task-id="${esc(t.id)}"
                         data-note-id="${esc(t.noteId)}">
                        <div>${esc(t.text)}</div>
                        ${t.tags && t.tags.length
                            ? `<div class="task-tags">${renderTagBadges(t.tags)}</div>`
                            : ''}
                        ${renderDoingBar(t.tags)}
                        ${!col.isBacklog
                            ? `<div class="pl-task-note">${esc(t.noteTitle)}</div>`
                            : ''}
                    </div>`).join('')}
                    <div class="pl-drop"></div>
                </div>
            </div>`;
        }

        html += `</div></div>`;

        $pl.html(html);
        bindPlannerEvents(weekCols, allCols);
    }


    /* ═══════════════════════════════════════════════════════════
       8. EVENTOS DO PLANEJADOR
    ═══════════════════════════════════════════════════════════ */

    function bindPlannerEvents(weekCols, allCols) {

        $pl.find('#pl-prev').on('click', () => { weekOffset--; renderPlanner(); });
        $pl.find('#pl-next').on('click', () => { weekOffset++; renderPlanner(); });
        $pl.find('#pl-now').on('click',  () => { weekOffset = 0; renderPlanner(); });

        $pl.find('#pl-reload').on('click', async function () {
            $(this).text('…');
            try { await fetchTasks(); } catch (_) {}
            renderPlanner();
            renderTasks();
        });

        $pl.find('#pl-clear').on('click', () => {
            if (!confirm(`Limpar planejamento de ${weekLabel(weekCols)}?`)) return;
            const weekKeys = new Set(weekCols.map(c => c.key));
            for (const t of allTasks) {
                if (weekKeys.has(plannerData[t.id])) delete plannerData[t.id];
            }
            save();
            renderPlanner();
            renderTasks();
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
                    e.dataTransfer.effectAllowed = 'move';
                    setTimeout(() => this.classList.add('dragging'), 0);
                });

                this.addEventListener('dragend', function () {
                    this.classList.remove('dragging');
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
                const noteId   = $(this).data('noteId');
                const taskText = $(this).find('div').first().text();
                const current  = plannerData[taskId] || 'backlog';

                $pl.append(`
                <div class="pl-day-picker" id="pl-picker">
                    <div class="pl-day-sheet">
                        <h4>${esc(taskText)}</h4>
                        ${allCols.map(col => `
                        <button class="pl-day-btn${current === col.key ? ' active' : ''}"
                                data-col="${esc(col.key)}">
                            ${col.isBacklog
                                ? '↩ Backlog'
                                : `${esc(col.label)} <span style="opacity:.5;font-size:15px;">${esc(col.dateStr)}</span>`}
                        </button>`).join('')}
                        <button class="pl-cancel-btn" id="pl-picker-cancel">Cancelar</button>
                        <button class="pl-cancel-btn" style="margin-top:6px;" id="pl-picker-open">
                            ↗ Abrir nota
                        </button>
                    </div>
                </div>`);

                $pl.find('#pl-picker').on('click', function (e) {
                    if (e.target === this) $(this).remove();
                });
                $pl.find('#pl-picker-cancel').on('click', () =>
                    $pl.find('#pl-picker').remove()
                );
                $pl.find('#pl-picker-open').on('click', () => {
                    $pl.find('#pl-picker').remove();
                    api.activateNote(noteId);
                });

                $pl.find('.pl-day-btn').on('click', async function () {
                    const col = $(this).data('col');
                    if (col === 'backlog') delete plannerData[taskId];
                    else plannerData[taskId] = col;
                    await save();
                    $pl.find('#pl-picker').remove();
                    renderPlanner();
                    renderTasks();
                });
            });
        }
    }


    /* ═══════════════════════════════════════════════════════════
       9. RENDER — TAREFAS ABERTAS ($tk)
    ═══════════════════════════════════════════════════════════ */

    function renderTasks() {

        const total = allTasks.length;

        const grouped = new Map();
        for (const t of allTasks) {
            if (!grouped.has(t.noteId))
                grouped.set(t.noteId, { noteTitle: t.noteTitle, noteId: t.noteId, tasks: [] });
            grouped.get(t.noteId).tasks.push(t);
        }

        let html = `
            <!-- CABEÇALHO TAREFAS -->
            <div style="display:flex;align-items:center;gap:8px;padding:10px 14px;
                        flex-shrink:0;border-bottom:1px solid var(--main-border-color,#313244);">
                <span style="font-size:19px;font-weight:700;">Tarefas</span>
                <span class="tk-total" style="font-size:16px;color:var(--muted-text-color);">
                    ${total}
                </span>
            </div>

            <!-- LISTA -->
            <div style="overflow-y:auto;flex:1;padding:12px 14px;">
        `;

        if (total === 0) {
            html += `
                <p style="color:var(--muted-text-color);font-size:17px;margin-top:4px;">
                    ✓ Nenhuma tarefa aberta.
                </p>`;
        } else {
            for (const [, group] of grouped) {
                html += `
                <div class="tk-group" style="margin-bottom:18px;">

                    <div class="tk-note-link"
                         data-note-id="${esc(group.noteId)}"
                         style="display:inline-flex;align-items:center;gap:5px;
                                margin-bottom:5px;cursor:pointer;
                                 font-size:15px;font-weight:700;text-transform:uppercase;
                                 letter-spacing:.06em;color:var(--muted-text-color,#888);
                                 transition:color .15s;">
                        ${esc(group.noteTitle)}
                        <span style="font-size:15px;background:var(--accented-background-color);
                                     padding:0 5px;border-radius:8px;">
                            ${group.tasks.length}
                        </span>
                    </div>

                    <div style="border-left:2px solid var(--main-border-color,#313244);
                                padding-left:10px;">
                        ${group.tasks.map(t => {

                            const day = plannerData[t.id];
                            const badge = day
                                ? `<span style="
                                        display:inline-block;font-size:13px;
                                        padding:1px 6px;border-radius:3px;margin-left:5px;
                                        background:var(--accented-background-color);
                                        color:var(--muted-text-color);white-space:nowrap;
                                        vertical-align:middle;">
                                        ${dayBadge(day)}
                                   </span>`
                                : '';

                            return `
                            <div class="tk-task-row"
                                 data-task-id="${esc(t.id)}"
                                 data-note-id="${esc(t.noteId)}"
                                 data-cb-index="${t.checkboxIndex}"
                                 style="display:flex;align-items:flex-start;gap:6px;
                                        padding:4px 0;line-height:1.5;">

                                <span class="tk-check"
                                      title="Marcar como concluída"
                                      style="
                                        flex-shrink:0;width:14px;height:14px;margin-top:4px;
                                        border:1.5px solid var(--main-border-color,#45475a);
                                          border-radius:3px;display:inline-flex;
                                          align-items:center;justify-content:center;
                                          cursor:pointer;font-size:12px;color:transparent;
                                          transition:border-color .15s,background .15s,color .15s;
                                          user-select:none;">✓</span>

                                <div style="flex:1;min-width:0;">
                                    <span class="tk-task-text"
                                          data-note-id="${esc(t.noteId)}"
                                          style="cursor:pointer;font-size:17px;
                                                 transition:color .15s;">
                                        ${esc(t.text)}${badge}
                                    </span>
                                    ${t.tags && t.tags.length
                                        ? `<div class="task-tags">${renderTagBadges(t.tags)}</div>`
                                        : ''}
                                    ${renderDoingBar(t.tags)}
                                </div>

                            </div>`;
                        }).join('')}
                    </div>

                </div>`;
            }
        }

        html += `</div>`;
        $tk.html(html);
    }


    /* ═══════════════════════════════════════════════════════════
       10. EVENTOS DO PAINEL DE TAREFAS
    ═══════════════════════════════════════════════════════════ */

    function bindTaskEvents() {

        $tk.on('mouseenter', '.tk-note-link', function () {
            $(this).css('color', 'var(--main-text-color)');
        }).on('mouseleave', '.tk-note-link', function () {
            $(this).css('color', 'var(--muted-text-color)');
        });

        $tk.on('click', '.tk-note-link', function () {
            api.activateNote($(this).data('noteId'));
        });

        $tk.on('mouseenter', '.tk-task-text', function () {
            $(this).css('text-decoration', 'underline');
        }).on('mouseleave', '.tk-task-text', function () {
            $(this).css('text-decoration', 'none');
        });

        $tk.on('click', '.tk-task-text', function () {
            api.activateNote($(this).data('noteId'));
        });

        $tk.on('mouseenter', '.tk-check', function () {
            $(this).css({
                borderColor: 'var(--main-text-color)',
                background:  'var(--accented-background-color,#313244)',
                color:       'var(--muted-text-color,#888)',
            });
        }).on('mouseleave', '.tk-check', function () {
            if (!$(this).hasClass('completing')) {
                $(this).css({
                    borderColor: 'var(--main-border-color,#45475a)',
                    background:  'transparent',
                    color:       'transparent',
                });
            }
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
        plannerData = await loadPlannerData();
        await fetchTasks();
        migrateIds(); // converte IDs antigos na primeira carga; inofensivo se já migrado
    } catch (err) {
        const msg = String(err.message || err);
        $pl.html(`<div style="padding:24px;color:#f38ba8;font-size:17px">
            ✗ Erro ao inicializar: ${msg}
        </div>`);
        $tk.html('');
        return;
    }

    renderPlanner();
    renderTasks();
    bindTaskEvents();

})();