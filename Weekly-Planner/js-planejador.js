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
    // id fixo no root → especificidade de ID vence qualquer CSS global do Trilium (#app *, button…)
    $root.attr('id', 'wp-root');
    const WP_VERSION = '8b4fc6d'; // ⚠️ versão do build no badge (diagnóstico de importação)

    $root.addClass('wp-root').css({
        display:    'flex',
        height:     '100%',
        overflow:   'hidden',
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
        /* Barra de modo (Semana/Mês/Gantt): oculta no desktop, dedicada no mobile */
        #wp-root .pl-mode-bar { display:none !important; }

        /* ── Tipografia compacta do painel de Tarefas — TODAS as larguras ──
           Seletores com especificidade alta (#wp-root.wp-root .wp-tk .tk-list …)
           para vencer o CSS global do Trilium (ex.: #app .note-detail span),
           que força 17px/14px nos textos do painel. */
        #wp-root.wp-root .wp-tk .tk-head { padding:6px 12px !important; }
        #wp-root.wp-root .wp-tk .tk-head .tk-head-title { font-size:12px !important; }
        #wp-root.wp-root .wp-tk .tk-total { font-size:10px !important; }
        #wp-root.wp-root .wp-tk .tk-list { padding:6px 8px !important; }
        #wp-root.wp-root .wp-tk .tk-list .tk-empty { font-size:11px !important; }
        #wp-root.wp-root .wp-tk .tk-list .tk-note-link { font-size:9px !important; padding:4px 8px !important; }
        #wp-root.wp-root .wp-tk .tk-list .tk-badge { font-size:8px !important; }
        #wp-root.wp-root .wp-tk .tk-list .tk-task-text { font-size:11px !important; line-height:1.3 !important; }
        #wp-root.wp-root .wp-tk .tk-list .tk-tasks .tk-task-row { padding:2px 6px !important; }
        #wp-root.wp-root .wp-tk .tk-list .tk-day-badge { font-size:8px !important; padding:0 3px !important; }
        #wp-root.wp-root .wp-tk .tk-list .tk-tasks { margin:0 6px !important; padding:3px 0 5px 8px !important; }
        #wp-root.wp-root .wp-tk .tk-list .tk-group { margin-bottom:8px !important; }

        /* ⚠️ Badge diagnóstico TEMPORÁRIO (remover após confirmar fontes) */
        .wp-diag-badge { position:fixed;bottom:4px;left:4px;z-index:99999;font-size:10px;
                         font-family:monospace;color:#fff;background:rgba(0,0,0,.7);
                         padding:2px 6px;border-radius:4px;pointer-events:none; }

        /* ── Desktop (>1024px): coluna compacta ── */
        @media (min-width:1025px) {
            #wp-root .wp-tk { max-width:280px !important; min-width:0 !important; }
            #wp-root .pl-task { font-size:16px !important; }
        }

        /* ── Mobile/estreito (≤1024px): empilha; planner flex:1; Tarefas 32vh ── */
        @media (max-width:1024px) {
            #wp-root { flex-direction:column !important; }
            #wp-root .wp-pl { flex:1 1 auto !important; width:100% !important;
                              min-height:0 !important; max-width:none !important;
                              min-width:0 !important; border-right:none !important;
                              border-bottom:1px solid var(--main-border-color,#313244); }
            #wp-root .wp-tk { flex:0 0 32vh !important; width:100% !important;
                              max-width:none !important; min-width:0 !important; }
            #wp-root .pl-mode-bar { display:flex !important; flex-direction:row !important;
                                    gap:4px !important; padding:7px 10px !important;
                                    flex-shrink:0 !important; flex-wrap:nowrap !important;
                                    min-width:0 !important; width:100% !important;
                                    max-width:100% !important; box-sizing:border-box !important;
                                    border-bottom:1px solid var(--main-border-color,#313244) !important; }
            #wp-root .pl-mode-bar .pl-mode-btn { flex:1 1 0 !important; min-width:0 !important;
                                                 max-width:100% !important;
                                                 box-sizing:border-box !important;
                                                 text-align:center !important; padding:6px 2px !important;
                                                 font-size:12px !important; white-space:nowrap !important;
                                                 overflow:hidden !important;
                                                 text-overflow:ellipsis !important; }
            #wp-root .pl-mode-btn { cursor:pointer; user-select:none; box-sizing:border-box; }
            #wp-root .pl-mode-switch { display:none !important; }
        }
        </style>`);

    // ⚠️ Badge diagnóstico TEMPORÁRIO — fontes reais do painel de Tarefas + versão
    function updateDiagBadge() {
        let $badge = $root.find('.wp-diag-badge');
        if (!$badge.length) $badge = $('<div class="wp-diag-badge">').appendTo($root);
        const task = $root.find('.tk-task-text')[0];
        const note = $root.find('.tk-note-link')[0];
        const f  = task ? getComputedStyle(task).fontSize : '?';
        const nf = note ? getComputedStyle(note).fontSize : '?';
        $badge.text(`v:${WP_VERSION} t:${f} n:${nf} vw:${window.innerWidth} mm:${window.matchMedia('(max-width:1024px)').matches}`);
    }
    window.addEventListener('resize', updateDiagBadge);

    // Aplica tipografia compacta via INLINE !important (setProperty 'important'):
    // prioridade máxima do cascade — vence qualquer CSS global do Trilium,
    // inclusive regras com !important e especificidade maior.
    function applyCompactTaskFonts() {
        const set = (sel, prop, val) => {
            $tk.find(sel).each(function () {
                this.style.setProperty(prop, val, 'important');
            });
        };
        set('.tk-task-text',  'font-size',    '11px');
        set('.tk-note-link',  'font-size',     '9px');
        set('.tk-head-title', 'font-size',    '12px');
        set('.tk-total',      'font-size',    '10px');
        set('.tk-badge',      'font-size',     '8px');
        set('.tk-day-badge',  'font-size',     '8px');
        set('.tk-empty',      'font-size',    '11px');
        set('.tk-task-row',   'padding',      '2px 6px');
        set('.tk-note-link',  'padding',      '4px 8px');
        set('.tk-head',       'padding',      '6px 12px');
        set('.tk-list',       'padding',      '6px 8px');
        set('.tk-group',      'margin-bottom', '8px');
        set('.tk-tasks',      'margin',       '0 6px');
        set('.tk-tasks',      'padding',      '3px 0 5px 8px');
    }

    // painel esquerdo — Planejador (2/3)
    const $pl = $('<div class="wp-pl">').css({
        flex:          '2',
        minWidth:      0,
        overflow:      'hidden',
        display:       'flex',
        flexDirection: 'column',
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


    /* ═══════════════════════════════════════════════════════════
       3. BUSCA DE TAREFAS (rastreia checkboxIndex por nota)
    ═══════════════════════════════════════════════════════════ */

    async function fetchTasks() {

        const data = await api.runOnBackend(() => {

            function expandRecurringInContent(content, noteId) {
                const all = [];
                const inputRe = /<input\s[^>]*type=["']checkbox["'][^>]*>/gi;
                let match;
                let idx = 0;
                while ((match = inputRe.exec(content)) !== null) {
                    const isChecked = /checked/i.test(match[0]);
                    const ss = content.indexOf('<span', match.index);
                    const se = content.indexOf('</span>', ss);
                    let text = '';
                    if (ss !== -1 && se !== -1) {
                        text = content.substring(content.indexOf('>', ss) + 1, se)
                            .replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
                    }
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
                    const totalMatch = cb.text.match(/#total=(\d+)/i);
                    if (!everyMatch || !totalMatch) continue;
                    const every = parseInt(everyMatch[1], 10);
                    const total = parseInt(totalMatch[1], 10);
                    if (total <= 1) continue;
                    const uptoMatch = cb.text.match(/#upto=(\d{2})-(\d{2})-(\d{4})/);
                    let baseDate;
                    if (uptoMatch) {
                        baseDate = new Date(`${uptoMatch[3]}-${uptoMatch[1]}-${uptoMatch[2]}T12:00:00`);
                    } else {
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

                        clones += '\n' + clone;
                        pending.push({ origIdx: cb.cbIndex, cloneNum: k, date: `${nyyyy}-${nmm}-${ndd}` });
                    }
                    if (clones) {
                        // Remove #every e #total do original (evita re-expansão)
                        const stripped = liHtml.replace(/#every=\d+\s*d/gi, '').replace(/#total=\d+/gi, '');
                        html = html.substring(0, liOpen) + stripped + clones + html.substring(liClose);
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

            const rows = api.sql.getRows(`
                SELECT noteId, title
                FROM notes
                WHERE isDeleted = 0 AND type = 'text'
                ORDER BY title COLLATE NOCASE
            `);

            const result = [];
            const genMap = new Map();
            const cbStats = {};

            for (const row of rows) {
                const note = api.getNote(row.noteId);
                if (!note) continue;
                let content = note.getContent();
                if (!content || !content.includes('checkbox')) continue;

                // ── Expande tasks recorrentes ANTES da extração ─────────────
                const expResult = expandRecurringInContent(content, row.noteId);
                if (expResult.html !== content) {
                    content = expResult.html;
                    note.setContent(content);
                    for (const g of expResult.generated) {
                        genMap.set(g.noteId + '::' + g.cbIndex, g.date);
                    }
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
                    cbIndex++;
                }

                if (tasks.length) {
                    result.push({
                        noteId: row.noteId,
                        title:  row.title || '(sem título)',
                        tasks,
                        checkedCbs,
                        totalCbs: cbIndex,
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
                    checkboxIndex:  task.cbIndex,
                    noteId:         g.noteId,
                    noteTitle:      g.title,
                });
            }
        }

        // Auto-insere no plannerData tasks geradas por recorrência (datas específicas)
        for (const [id, date] of Object.entries(data.generated)) {
            plannerData[id] = date;
        }

        // Poda entradas órfãs do plannerData (tasks que não existem mais)
        const validIds = new Set(allTasks.map(t => t.id));
        for (const key of Object.keys(plannerData)) {
            if (key.startsWith('_')) continue;
            if (!validIds.has(key)) delete plannerData[key];
        }

        // Estatísticas de checkboxes por nota
        cbStats = data.cbStats;
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

    function modeSwitcher() {
        const modes = [
            { id: 'kanban', label: 'Semana' },
            { id: 'month',  label: 'Mês' },
            { id: 'gantt',  label: 'Gantt' },
        ];
        return `<span class="pl-mode-switch">
            ${modes.map(m => `
                <span class="pl-mode-btn${viewMode === m.id ? ' pl-mode-btn--active' : ''}"
                      tabindex="0" data-mode="${m.id}" title="Ver ${m.label}">${m.label}</span>
            `).join('')}
        </span>`;
    }

    // Barra de modo dedicada (mobile): largura total, botões flex:1, sem quebrar/cortar.
    // Botões são <span role="button"> — o CSS global do Trilium (button { min-width })
    // inflava os <button> e cortava o Gantt em telas estreitas.
    function modeBar() {
        const modes = [
            { id: 'kanban', label: 'Semana' },
            { id: 'month',  label: 'Mês' },
            { id: 'gantt',  label: 'Gantt' },
        ];
        return `<div class="pl-mode-bar">
            ${modes.map(m => `
                <span class="pl-mode-btn${viewMode === m.id ? ' pl-mode-btn--active' : ''}"
                      tabindex="0" data-mode="${m.id}" title="Ver ${m.label}">${m.label}</span>
            `).join('')}
        </div>`;
    }

    const MODE_CSS = `
        .pl-mode-switch { display:inline-flex;gap:2px;margin-left:auto; }
        .pl-mode-btn { background:none;border:1px solid var(--main-border-color,#313244);border-radius:4px;
                       color:var(--muted-text-color,#888);font-size:13px;padding:2px 8px;cursor:pointer; }
        .pl-mode-btn:hover { color:var(--main-text-color); }
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

    const isMobile   = () => window.matchMedia('(max-width:1024px)').matches;
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
            { key: 'backlog', label: 'Backlog', dateStr: 'sem data', isToday: false, isBacklog: true },
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
                        user-select:none;position:relative; }
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
            ${BTN_CSS}
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
                .task-tags { margin-top:4px; }
                .doing-bar { margin-top:4px;height:4px; }
                 .pl-day-sheet h4 { font-size:16px; }
                 .pl-day-btn,.pl-cancel-btn { font-size:15px; }
             }
             ${MODE_CSS}
         </style>

        <div style="display:flex;flex-direction:column;height:100%;overflow:hidden;">

            ${mobile ? modeBar() : ''}
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
                ${mobile ? '' : modeSwitcher()}
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
                         data-note-id="${esc(t.noteId)}"
                         data-cb-index="${t.checkboxIndex}">
                        <span class="pl-done-btn" title="Marcar como concluída">✓</span>
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
        const backlogTasks = [];

        for (const t of allTasks) {
            const startIso = plannerData[t.id];
            if (!startIso) { backlogTasks.push(t); continue; }

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
                startIdx,
                endIdx:        endIdx === -1 ? 6 : endIdx,
                progress:      progTag ? progTag.value : (doneTag ? 100 : 0),
                isOverdue:     uptoTag && endIso < todayBase.toISOString().slice(0, 10),
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

            ${mobile ? modeBar() : ''}
            <!-- CABEÇALHO GANTT -->
            <div style="display:flex;align-items:center;gap:7px;padding:10px 16px;
                        flex-shrink:0;border-bottom:1px solid var(--main-border-color,#313244);
                        flex-wrap:wrap;">
                <span style="font-size:19px;font-weight:700;">Gantt</span>
                <button class="pl-nav-btn" id="gantt-prev" title="Semana anterior">‹</button>
                <span style="font-size:16px;color:var(--muted-text-color);white-space:nowrap;">
                    ${esc(label)}
                </span>
                <button class="pl-nav-btn" id="gantt-next" title="Próxima semana">›</button>
                ${!isCurrentWeek ? `<button class="pl-today-btn" id="gantt-now">hoje</button>` : ''}
                <span style="font-size:14px;color:var(--muted-text-color);margin-left:auto;">
                    ${planned}/${total}
                </span>
                <button class="pl-icon-btn" id="gantt-clear" title="Limpar esta semana">↺</button>
                <button class="pl-icon-btn" id="gantt-reload" title="Recarregar tarefas">⟳</button>
                ${mobile ? '' : modeSwitcher()}
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
                <div>Nenhuma tarefa agendada nesta semana</div>
                <div class="gantt-empty-sub">Arraste tarefas do backlog para os dias no modo Quadro</div>
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
                              data-note-id="${esc(item.noteId)}"
                              style="cursor:pointer;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(item.text)}</span>
                        <span class="gantt-done-btn"
                              data-task-id="${esc(item.id)}"
                              data-note-id="${esc(item.noteId)}"
                              data-cb-index="${item.checkboxIndex}"
                              style="flex-shrink:0;cursor:pointer;font-size:14px;opacity:.4;
                                     color:var(--muted-text-color);user-select:none;">✓</span>
                    </div>
                    ${tagsHtml ? `<div class="gantt-label-tags">${tagsHtml}</div>` : ''}
                    ${doingHtml ? doingHtml.replace('doing-bar', 'gantt-label-doing').replace('doing-fill', 'gantt-label-doing-fill') : ''}
                </div>`;

                html += `<div class="gantt-cell" style="grid-column:${colStart}/${colEnd};grid-row:${row}">
                    <div class="${barClass}"
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
        if (backlogTasks.length) {
            html += `<div class="gantt-backlog">
                <details>
                    <summary>Backlog (${backlogTasks.length} tarefa${backlogTasks.length !== 1 ? 's' : ''} sem data)</summary>
                    <div style="margin-top:6px;">
                    ${backlogTasks.map(t => {
                        const tagsHtml = renderTagBadges(t.tags);
                        return `<div class="gantt-blog-item">
                            <span class="gantt-blog-check"
                                  data-task-id="${esc(t.id)}"
                                  data-note-id="${esc(t.noteId)}"
                                  data-cb-index="${t.checkboxIndex}">✓</span>
                            <span class="gantt-blog-text" data-note-id="${esc(t.noteId)}">${esc(t.text)}</span>
                            <span class="gantt-blog-note">${esc(t.noteTitle)}</span>
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

        $pl.find('#gantt-reload').on('click', async function () {
            $(this).text('…');
            try { await fetchTasks(); } catch (_) {}
            renderPlanner();
            renderTasks();
        });

        $pl.find('#gantt-clear').on('click', () => {
            if (!confirm(`Limpar planejamento de ${weekLabel(weekCols)}?`)) return;
            const weekKeys = new Set(weekCols.map(c => c.key));
            for (const t of allTasks) {
                if (weekKeys.has(plannerData[t.id])) delete plannerData[t.id];
            }
            save();
            renderPlanner();
            renderTasks();
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
            } catch (err) { console.error('gantt markDone error:', err); }
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
            } catch (err) { console.error('gantt blog markDone error:', err); }
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
        const labels = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];
        let d = new Date(start);

        while (weeks.length < 6) {
            const week = [];
            for (let i = 0; i < 7; i++) {
                const iso = d.toISOString().slice(0, 10);
                week.push({
                    key:           iso,
                    label:         labels[i],
                    dayNum:        d.getDate(),
                    isToday:       d.getTime() === todayBase.getTime(),
                    isCurrentMonth: d.getMonth() === month,
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
        const months = ['jan','fev','mar','abr','mai','jun',
                        'jul','ago','set','out','nov','dez'];
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
        .mn-task { background:linear-gradient(rgba(0,0,0,.07),rgba(0,0,0,.07)),var(--accented-background-color,#1e1e2e);
                   border:1.5px solid transparent;border-radius:5px;padding:4px 8px;
                   font-size:13px;line-height:1.5;cursor:grab;position:relative;
                   overflow:hidden;text-overflow:ellipsis;white-space:nowrap;user-select:none;
                   transition:border-color .1s,opacity .15s; }
        .mn-task:hover { border-color:var(--main-border-color,#45475a); }
        .mn-task.done { background:rgba(46,204,113,.12);border-color:rgba(46,204,113,.25);
                        text-decoration:line-through;opacity:.7; }
        .mn-task.dragging { opacity:.35;cursor:grabbing; }
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
        .pl-day-picker { position:fixed;inset:0;background:rgba(0,0,0,.6);
                         display:flex;align-items:flex-end;z-index:9999; }
        .pl-day-sheet { background:var(--main-background-color,#1e1e2e);
                        border-radius:16px 16px 0 0;padding:20px 16px 32px;
                        width:100%;max-height:80vh;overflow-y:auto; }
        .pl-day-sheet h4 { margin:0 0 14px;font-size:18px;font-weight:600;
                           overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }
        .pl-day-btn { display:block;width:100%;padding:11px 14px;margin-bottom:6px;
                      background:var(--accented-background-color,#313244);border:none;
                      border-radius:7px;color:var(--main-text-color);font-size:17px;
                      text-align:left;cursor:pointer; }
        .pl-day-btn.active { color:var(--main-active-border-color,#89b4fa);font-weight:600; }
        .pl-cancel-btn { display:block;width:100%;padding:11px;background:none;
                         border:1px solid var(--main-border-color);border-radius:7px;
                         color:var(--muted-text-color);font-size:17px;cursor:pointer;margin-top:4px; }
        ${TAG_CSS}
        ${MODE_CSS}
        @media (max-width:1024px) {
            .mn-grid { min-width:0;gap:4px; }
            .mn-cell { min-height:70px;padding:3px 4px; }
            .mn-weekday { font-size:11px;padding:6px 0 8px; }
            .mn-daynum { font-size:11px;padding-bottom:2px; }
            .mn-task { font-size:11px;padding:2px 4px;line-height:1.4; }
        }`;

        let html = `<style>${css}</style>
        <div class="mn-wrap">

            ${mobile ? modeBar() : ''}
            <!-- CABEÇALHO MÊS -->
            <div style="display:flex;align-items:center;gap:7px;padding:10px 16px;
                        flex-shrink:0;border-bottom:1px solid var(--main-border-color,#313244);
                        flex-wrap:wrap;">
                <span style="font-size:19px;font-weight:700;">Mês</span>
                <button class="pl-nav-btn" id="month-prev" title="Mês anterior">‹</button>
                <span style="font-size:16px;color:var(--muted-text-color);white-space:nowrap;text-transform:capitalize;">
                    ${esc(label)}
                </span>
                <button class="pl-nav-btn" id="month-next" title="Próximo mês">›</button>
                ${!isCurrent ? `<button class="pl-today-btn" id="month-now">hoje</button>` : ''}
                <span style="font-size:14px;color:var(--muted-text-color);margin-left:auto;">
                    ${planned}/${total}
                </span>
                <button class="pl-icon-btn" id="month-clear" title="Limpar este mês">↺</button>
                <button class="pl-icon-btn" id="month-reload" title="Recarregar tarefas">⟳</button>
                ${mobile ? '' : modeSwitcher()}
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
                const cls = [
                    'mn-cell',
                    day.isCurrentMonth ? '' : 'out',
                    day.isToday ? 'today' : '',
                    (day.label === 'Sáb' || day.label === 'Dom') ? 'weekend' : '',
                ].join(' ').replace(/\s+/g, ' ');

                html += `<div class="${cls}" data-col="${esc(day.key)}">
                    <div class="mn-daynum">${day.dayNum}</div>
                    <div class="mn-tasks">
                        ${tasks.map(t => {
                            const done = t.tags.some(tag => tag.type === 'status' && tag.value === 'done');
                            return `<div class="mn-task${done ? ' done' : ''}"
                                         draggable="${!mobile}"
                                         data-task-id="${esc(t.id)}"
                                         data-note-id="${esc(t.noteId)}"
                                         data-cb-index="${t.checkboxIndex}"
                                         title="${esc(t.text)}">
                                    <span class="mn-done-btn" title="Marcar como concluída">✓</span>
                                    ${esc(t.text)}
                                </div>`;
                        }).join('')}
                        <div class="mn-drop"></div>
                    </div>
                </div>`;
            }
        }

        html += `</div>`;

        // Backlog do mês (tasks sem data) — também é zona de drop
        const backlogTasks = allTasks.filter(t => !plannerData[t.id]);
        if (backlogTasks.length) {
            html += `<div class="mn-backlog" data-col="backlog">
                <details>
                    <summary>Backlog (${backlogTasks.length} tarefa${backlogTasks.length !== 1 ? 's' : ''} sem data)</summary>
                    <div style="margin-top:6px;">
                    ${backlogTasks.map(t => `
                        <div class="mn-blog-item"
                             draggable="${!mobile}"
                             data-task-id="${esc(t.id)}"
                             data-note-id="${esc(t.noteId)}"
                             data-cb-index="${t.checkboxIndex}">
                            <span class="mn-blog-text" data-note-id="${esc(t.noteId)}">${esc(t.text)}</span>
                            <span class="mn-blog-note">${esc(t.noteTitle)}</span>
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
            $(this).text('…');
            try { await fetchTasks(); } catch (_) {}
            renderPlanner();
            renderTasks();
        });

        $pl.find('#month-clear').on('click', () => {
            if (!confirm(`Limpar planejamento de ${monthLabel(monthView)}?`)) return;
            const monthKeys = new Set();
            for (const week of monthView.weeks) {
                for (const day of week) monthKeys.add(day.key);
            }
            for (const t of allTasks) {
                if (monthKeys.has(plannerData[t.id])) delete plannerData[t.id];
            }
            save();
            renderPlanner();
            renderTasks();
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
            } catch (err) { console.error('month markDone error:', err); }
        });

        /* ── Desktop: drag-and-drop entre células ───────────── */
        if (!isMobile()) {

            let draggingId = null;

            $pl.find('.mn-task, .mn-blog-item').each(function () {
                this.addEventListener('dragstart', function (e) {
                    draggingId = this.dataset.taskId;
                    e.dataTransfer.effectAllowed = 'move';
                    setTimeout(() => this.classList.add('dragging'), 0);
                });
                this.addEventListener('dragend', function () {
                    this.classList.remove('dragging');
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

            function openMonthPicker(taskId, taskText, current) {
                const allDays = [];
                for (const week of monthView.weeks) {
                    for (const day of week) {
                        const mm = Number(day.key.split('-')[1]);
                        allDays.push({ key: day.key, label: `${day.dayNum}/${mm}` });
                    }
                }

                $pl.append(`
                <div class="pl-day-picker" id="month-picker">
                    <div class="pl-day-sheet">
                        <h4>${esc(taskText)}</h4>
                        <button class="pl-day-btn${current === 'backlog' ? ' active' : ''}"
                                data-col="backlog">↩ Backlog</button>
                        ${allDays.map(d => `
                        <button class="pl-day-btn${current === d.key ? ' active' : ''}"
                                data-col="${esc(d.key)}">${esc(d.label)}</button>`).join('')}
                        <button class="pl-cancel-btn" id="month-picker-cancel">Cancelar</button>
                    </div>
                </div>`);

                $pl.find('#month-picker').on('click', function (e2) {
                    if (e2.target === this) $(this).remove();
                });
                $pl.find('#month-picker-cancel').on('click', () =>
                    $pl.find('#month-picker').remove()
                );

                $pl.find('.pl-day-btn').on('click', async function () {
                    const col = $(this).data('col');
                    if (col === 'backlog') delete plannerData[taskId];
                    else plannerData[taskId] = col;
                    await save();
                    $pl.find('#month-picker').remove();
                    renderPlanner();
                    renderTasks();
                });
            }

            $pl.find('.mn-task').on('click', function () {
                openMonthPicker(
                    $(this).data('taskId'),
                    $(this).text().replace('✓', '').trim(),
                    plannerData[$(this).data('taskId')] || 'backlog'
                );
            });

            $pl.find('.mn-blog-item').on('click', function () {
                openMonthPicker(
                    $(this).data('taskId'),
                    $(this).find('.mn-blog-text').text().trim(),
                    'backlog'
                );
            });
        }
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

        $pl.find('.pl-mode-btn').on('click', async function () {
            const mode = $(this).data('mode');
            if (mode === viewMode) return;
            viewMode = mode;
            plannerData._viewMode = mode;
            await save();
            renderPlanner();
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
            } catch (err) { console.error('markDone error:', err); }
        });
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
                <span class="tk-head-title">Tarefas</span>
                <span class="tk-total">${total}</span>
            </div>

            <!-- LISTA -->
            <div class="tk-list">
        `;

        if (total === 0) {
            html += `
                <p class="tk-empty">✓ Nenhuma tarefa aberta.</p>`;
        } else {
            for (const [, group] of grouped) {
                const stats = cbStats[group.noteId];
                const done = stats ? stats.checked : 0;
                const totalCbs = stats ? stats.total : group.tasks.length;
                const badgeText = done > 0 ? `${done}/${totalCbs}` : `${group.tasks.length}`;
                const collapsed = collapsedNotes.has(group.noteId);

                html += `
                <div class="tk-group${collapsed ? ' tk-collapsed' : ''}">

                    <div class="tk-note-link" data-note-id="${esc(group.noteId)}">
                        <span class="tk-col-icon">${collapsed ? '▸' : '▾'}</span>
                        <span class="tk-note-title">${esc(group.noteTitle)}</span>
                        <span class="tk-badge${done > 0 ? ' done' : ''}">${badgeText}</span>
                    </div>

                    <div class="tk-tasks"${collapsed ? ' style="display:none;"' : ''}>
                        ${group.tasks.map(t => {

                            const day = plannerData[t.id];
                            const badge = day
                                ? `<span class="tk-day-badge">${dayBadge(day)}</span>`
                                : '';

                            return `
                            <div class="tk-task-row"
                                 data-task-id="${esc(t.id)}"
                                 data-note-id="${esc(t.noteId)}"
                                 data-cb-index="${t.checkboxIndex}">

                                <span class="tk-check" title="Marcar como concluída">✓</span>

                                <div style="flex:1;min-width:0;">
                                    <span class="tk-task-text" data-note-id="${esc(t.noteId)}">
                                        ${esc(t.text)}${badge}
                                    </span>
                                    ${t.tags && t.tags.length
                                        ? `<div class="task-tags" style="margin-top:2px;">${renderTagBadges(t.tags)}</div>`
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
        applyCompactTaskFonts();
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
        if (plannerData._viewMode === 'gantt' || plannerData._viewMode === 'kanban' || plannerData._viewMode === 'month') {
            viewMode = plannerData._viewMode;
        }
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
    updateDiagBadge(); // ⚠️ temporário — remover com o badge

    // spans role=button (barra de modo): suporte a Enter/Espaço
    $pl.on('keydown', '.pl-mode-btn', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $(this).trigger('click'); }
    });

})();