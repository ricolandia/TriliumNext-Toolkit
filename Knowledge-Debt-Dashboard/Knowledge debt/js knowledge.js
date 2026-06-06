/**
 * Knowledge Dashboard — TriliumNext Toolkit
 * Dashboard de saúde + consultas do PKM.
 *
 * Modo: Render Note  →  crie uma nota JS Frontend e aponte ~renderNote para ela.
 *
 * Abas:
 *   • Órfãs         — notas sem backlink interno
 *   • Stubs         — conteúdo entre 1–250 chars
 *   • Vazias        — conteúdo nulo ou parágrafo vazio
 *   • TODOs antigos — label *todo* sem modificação há > 30 dias
 *   • Abandonadas   — sem filhos, sem modificação há > 90 dias
 *   • Imagens Órfãs — imagens não referenciadas em nenhuma nota
 *   • Consulta Livre— query customizada com filtros e SQL
 */

(async function () {
    const $root = $container;
    $root.empty().css({
        display: 'flex', flexDirection: 'column', height: '100%',
        fontFamily: 'var(--detail-font-family,"Segoe UI",sans-serif)',
        fontSize: '13px', color: 'var(--main-text-color)',
        background: 'var(--main-background-color)', overflow: 'hidden'
    });

    /* ── State ──────────────────────────────────────────────── */
    const state = {
        data: { orphans: [], stubs: [], empty: [], todos: [], abandoned: [], images: [], query: [] },
        activeTab: 'orphans',
        search: '',
        scanning: false,
        savedQueries: JSON.parse(localStorage.getItem('kd_savedQueries') || '[]'),
        queryCols: [],
        selectedQueryIdx: -1
    };

    /* ── Definições das categorias ──────────────────────────── */
    const TABS = [
        { key: 'orphans',   label: 'Órfãs',         color: '#d97070', icon: '🔴' },
        { key: 'stubs',     label: 'Stubs',          color: '#c9984a', icon: '🟠' },
        { key: 'empty',     label: 'Vazias',         color: '#9b7ec8', icon: '🟣' },
        { key: 'todos',     label: 'TODOs antigos',  color: '#6b95c4', icon: '🔵' },
        { key: 'abandoned', label: 'Abandonadas',    color: '#68a87c', icon: '🟢' },
        { key: 'images',    label: 'Imagens Órfãs',  color: '#e08f5c', icon: '🖼️' },
        { key: 'query',     label: 'Consulta Livre', color: '#5ca0e0', icon: '🔎' },
    ];

    /* ── Header ─────────────────────────────────────────────── */
    const $header = $('<div>').css({
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '10px 16px', borderBottom: '1px solid var(--main-border-color)',
        flexShrink: 0
    });

    const $titleEl = $('<span>').html('📊&nbsp;<strong>Knowledge Dashboard</strong>').css({ flex: 1, fontSize: '14px' });

    const $fsearch = $('<input type="text" placeholder="🔍 filtrar por título…">').css({
        padding: '4px 8px', borderRadius: '4px', fontSize: '12px',
        background: 'var(--accented-background-color)',
        color: 'var(--main-text-color)', border: '1px solid var(--main-border-color)',
        width: '220px', display: 'none'
    });

    const $btnScan = $('<button>').text('▶ Escanear').css({
        padding: '6px 16px', cursor: 'pointer', borderRadius: '4px', fontSize: '12px',
        background: 'var(--accented-background-color)', color: 'var(--main-text-color)',
        border: '1px solid var(--main-border-color)', fontWeight: 500
    });

    $header.append($titleEl, $fsearch, $btnScan);

    /* ── Stats bar ──────────────────────────────────────────── */
    const $stats = $('<div>').css({
        display: 'none', gridTemplateColumns: 'repeat(7,1fr)',
        gap: '6px', padding: '10px 16px 6px', flexShrink: 0
    });

    const $statEls = {};
    TABS.forEach(({ key, label, color, icon }) => {
        const $card = $('<div>').css({
            textAlign: 'center', padding: '8px 4px', borderRadius: '5px',
            background: 'var(--accented-background-color)',
            borderTop: '3px solid ' + color, cursor: 'pointer',
            transition: 'opacity .15s'
        }).on('click', () => setTab(key))
          .hover(function () { $(this).css({ opacity: '.8' }); },
                 function () { $(this).css({ opacity: '1' }); });

        const $num = $('<div>').text('—').css({ fontSize: '20px', fontWeight: 700, color });
        const $lbl = $('<div>').text(icon + ' ' + label).css({
            fontSize: '9px', color: 'var(--muted-text-color)', marginTop: '2px'
        });
        $card.append($num, $lbl);
        $statEls[key] = { $card, $num };
        $stats.append($card);
    });

    /* ── Tabs ───────────────────────────────────────────────── */
    const $tabBar = $('<div>').css({
        display: 'none', alignItems: 'center', gap: '4px',
        padding: '0 16px 8px', flexShrink: 0, flexWrap: 'wrap'
    });

    TABS.forEach(({ key, label, icon }) => {
        $('<button>').text(icon + ' ' + label).data('tab', key).css({
            padding: '4px 10px', cursor: 'pointer', border: '1px solid transparent',
            borderRadius: '3px', fontSize: '11px', background: 'transparent',
            color: 'var(--muted-text-color)'
        }).on('click', () => setTab(key)).appendTo($tabBar);
    });

    /* ── Query Builder (hidden by default) ──────────────────── */
    const $queryBuilder = $('<div>').css({
        display: 'none', flexShrink: 0,
        padding: '0 16px 8px', gap: '6px', flexWrap: 'wrap', alignItems: 'end'
    });

    const QB_FIELDS = [
        { key: 'noteType', label: 'Tipo', type: 'select', options: ['','text','code','image','file','book','canvas','search','relationMap','render'] },
        { key: 'labelName', label: 'Label', type: 'text', placeholder: 'ex: projeto' },
        { key: 'labelValue', label: 'Valor', type: 'text', placeholder: 'ex: meu-projeto' },
        { key: 'dateFrom', label: 'De', type: 'date' },
        { key: 'dateTo', label: 'Até', type: 'date' },
    ];

    const $qbInputs = {};
    QB_FIELDS.forEach(f => {
        const $wrap = $('<div>').css({ display: 'flex', flexDirection: 'column', gap: '2px' });
        const $label = $('<label>').text(f.label).css({ fontSize: '10px', color: 'var(--muted-text-color)' });
        let $input;
        if (f.type === 'select') {
            $input = $('<select>').css({
                padding: '4px 6px', borderRadius: '3px', fontSize: '11px',
                background: 'var(--accented-background-color)',
                color: 'var(--main-text-color)', border: '1px solid var(--main-border-color)'
            });
            f.options.forEach(o => {
                $input.append($('<option>').val(o).text(o || '(todos)'));
            });
        } else if (f.type === 'date') {
            $input = $('<input type="date">').css({
                padding: '3px 6px', borderRadius: '3px', fontSize: '11px',
                background: 'var(--accented-background-color)',
                color: 'var(--main-text-color)', border: '1px solid var(--main-border-color)'
            });
        } else {
            $input = $('<input type="text">').css({
                padding: '4px 6px', borderRadius: '3px', fontSize: '11px',
                background: 'var(--accented-background-color)',
                color: 'var(--main-text-color)', border: '1px solid var(--main-border-color)',
                width: '120px'
            }).attr('placeholder', f.placeholder || '');
        }
        $wrap.append($label, $input);
        $qbInputs[f.key] = $input;
        $queryBuilder.append($wrap);
    });

    /* WHERE custom textarea */
    const $qbWhereWrap = $('<div>').css({ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: '160px' });
    const $qbWhereLabel = $('<label>').text('WHERE (custom)').css({ fontSize: '10px', color: 'var(--muted-text-color)' });
    const $qbWhere = $('<textarea rows="1">').css({
        padding: '4px 6px', borderRadius: '3px', fontSize: '11px',
        background: 'var(--accented-background-color)',
        color: 'var(--main-text-color)', border: '1px solid var(--main-border-color)',
        resize: 'vertical', fontFamily: 'monospace', minHeight: '22px', lineHeight: '1.4'
    }).attr('placeholder', 'n.type = \'text\' AND ...');
    $qbWhereWrap.append($qbWhereLabel, $qbWhere);
    $queryBuilder.append($qbWhereWrap);

    /* buttons */
    const $qbBtnExec = $('<button>').text('▶ Executar').css({
        padding: '5px 14px', cursor: 'pointer', borderRadius: '3px', fontSize: '11px',
        background: 'var(--accented-background-color)', color: '#5ca0e0',
        border: '1px solid var(--main-border-color)', fontWeight: 600, whiteSpace: 'nowrap'
    });
    const $qbBtnSave = $('<button>').text('💾 Salvar').css({
        padding: '5px 10px', cursor: 'pointer', borderRadius: '3px', fontSize: '11px',
        background: 'transparent', color: 'var(--muted-text-color)',
        border: '1px solid transparent', whiteSpace: 'nowrap'
    });
    const $qbSavedSelect = $('<select>').css({
        padding: '4px 6px', borderRadius: '3px', fontSize: '11px',
        background: 'var(--accented-background-color)',
        color: 'var(--main-text-color)', border: '1px solid var(--main-border-color)',
        minWidth: '120px'
    });
    $qbSavedSelect.append($('<option>').val('-1').text('📂 Carregar salva…'));

    const $qbBtnDel = $('<button>').text('✕').css({
        padding: '5px 8px', cursor: 'pointer', borderRadius: '3px', fontSize: '11px',
        background: 'transparent', color: '#d97070',
        border: '1px solid transparent', display: 'none'
    });

    $queryBuilder.append($qbBtnExec, $qbSavedSelect, $qbBtnSave, $qbBtnDel);

    /* ── Tabela ─────────────────────────────────────────────── */
    const $tableWrap = $('<div>').css({ flex: 1, overflowY: 'auto', padding: '0 16px 8px' });
    const $table = $('<table>').css({ width: '100%', borderCollapse: 'collapse' });
    const $thead = $('<thead>');
    const $tbody = $('<tbody>');
    $table.append($thead, $tbody);
    $tableWrap.append($table);

    /* ── Log ────────────────────────────────────────────────── */
    const $log = $('<div>').css({
        padding: '6px 16px', fontSize: '11px', color: 'var(--muted-text-color)',
        borderTop: '1px solid var(--main-border-color)', flexShrink: 0,
        maxHeight: '64px', overflowY: 'auto', fontFamily: 'monospace'
    });

    $root.append($header, $stats, $tabBar, $queryBuilder, $tableWrap, $log);

    /* ── Helpers ────────────────────────────────────────────── */
    function log(msg, type = 'info') {
        const c = { ok: '#68a87c', warn: '#c9984a', err: '#d97070', info: 'var(--muted-text-color)' };
        $log.append(
            $('<div>').text('[' + new Date().toLocaleTimeString() + '] ' + msg).css({ color: c[type], marginBottom: '1px' })
        );
        $log.scrollTop($log[0].scrollHeight);
    }

    function openNote(noteId) {
        try {
            if (api.activateNote) api.activateNote(noteId);
        } catch (_) {}
    }

    function daysSince(dateStr) {
        if (!dateStr) return null;
        return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
    }

    function daysLabel(dateStr) {
        const d = daysSince(dateStr);
        if (d === null) return '—';
        if (d === 0) return 'hoje';
        if (d === 1) return 'ontem';
        return `há ${d} dias`;
    }

    function fmtBytes(bytes) {
        if (!bytes && bytes !== 0) return '—';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1048576).toFixed(1) + ' MB';
    }

    /* ── Render da tabela ───────────────────────────────────── */
    const COLS = {
        orphans:   ['Nota', 'Tipo', 'Última modificação'],
        stubs:     ['Nota', 'Tipo', 'Última modificação', 'Tamanho'],
        empty:     ['Nota', 'Tipo', 'Última modificação'],
        todos:     ['Nota', 'Label', 'Última modificação'],
        abandoned: ['Nota', 'Tipo', 'Última modificação'],
        images:    ['Nota', 'Tamanho', 'Última modificação', ''],
    };

    function renderTable() {
        $tbody.empty();
        $thead.empty();

        const tab  = state.activeTab;

        /* query tab tem colunas dinâmicas */
        const cols = tab === 'query' ? (state.queryCols.length ? state.queryCols : ['Resultado']) : (COLS[tab] || ['Nota']);
        const srch = state.search.toLowerCase();
        const items = (state.data[tab] || []).filter(n => {
            if (!srch) return true;
            return (n.title || '').toLowerCase().includes(srch);
        });

        /* cabeçalho */
        const $hrow = $('<tr>').css({ borderBottom: '2px solid var(--main-border-color)' });
        cols.forEach(h => {
            $hrow.append(
                $('<th>').text(h).css({
                    textAlign: 'left', padding: '6px 8px', fontSize: '11px',
                    color: 'var(--muted-text-color)', fontWeight: 600
                })
            );
        });
        /* imagem: coluna extra de ação sempre no fim */
        if (tab === 'images') {
            $hrow.append(
                $('<th>').css({ width: '40px' })
            );
        }
        $thead.append($hrow);

        if (!items.length) {
            $tbody.append(
                $('<tr>').append(
                    $('<td colspan="99">').text(
                        state.scanning ? 'Escaneando…' : 'Nenhuma nota encontrada aqui 👌'
                    ).css({ padding: '24px', textAlign: 'center', color: 'var(--muted-text-color)' })
                )
            );
            return;
        }

        const tabColor = TABS.find(t => t.key === tab)?.color || 'var(--main-text-color)';

        items.forEach((n, idx) => {
            const $row = $('<tr>').css({ borderBottom: '1px solid var(--main-border-color)' })
                .hover(
                    () => $row.css({ background: 'var(--accented-background-color)' }),
                    () => $row.css({ background: 'transparent' })
                );

            if (tab === 'query') {
                /* colunas dinâmicas */
                cols.forEach((col, ci) => {
                    const val = n[col] !== undefined ? n[col] : (Object.values(n)[ci] ?? '');
                    $row.append(
                        $('<td>').text(String(val).substring(0, 200)).css({
                            padding: '5px 8px', fontSize: '11px',
                            color: col === 'noteId' ? '#5ca0e0' : 'var(--main-text-color)',
                            maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                        })
                    );
                });
                $tbody.append($row);
                return;
            }

            /* célula do título */
            const $link = $('<a>').text(n.title || '(sem título)').css({
                color: 'var(--main-text-color)', cursor: 'pointer',
                textDecoration: 'none', fontWeight: 500
            }).on('click', () => openNote(n.noteId))
              .hover(
                function () { $(this).css('text-decoration', 'underline'); },
                function () { $(this).css('text-decoration', 'none'); }
              );

            const $noteCell = $('<td>').css({ padding: '5px 8px' }).append($link);

            const $mod = $('<td>').text(daysLabel(n.dateModified)).css({
                padding: '5px 8px', color: 'var(--muted-text-color)', fontSize: '11px',
                whiteSpace: 'nowrap'
            });

            if (tab === 'stubs') {
                $row.append(
                    $noteCell,
                    $('<td>').text(n.type || '—').css({ padding: '5px 8px', color: 'var(--muted-text-color)', fontSize: '11px' }),
                    $mod,
                    $('<td>').text(n.contentLen + ' chars').css({ padding: '5px 8px', color: tabColor, fontSize: '11px', fontVariantNumeric: 'tabular-nums' })
                );
            } else if (tab === 'todos') {
                $row.append(
                    $noteCell,
                    $('<td>').text('#' + (n.todoLabel || 'todo')).css({ padding: '5px 8px', fontSize: '11px', color: tabColor }),
                    $mod
                );
            } else if (tab === 'images') {
                const $delBtn = $('<button>').html('🗑').css({
                    padding: '2px 6px', cursor: 'pointer', borderRadius: '3px', fontSize: '11px',
                    background: 'transparent', color: '#d97070',
                    border: '1px solid var(--main-border-color)', opacity: 0.5
                }).hover(
                    function () { $(this).css({ opacity: 1 }); },
                    function () { $(this).css({ opacity: 0.5 }); }
                ).on('click', async function () {
                    if (!confirm(`Deletar imagem "${n.title}"?`)) return;
                    $(this).text('…').prop('disabled', true);
                    try {
                        await api.runOnBackend(id => {
                            const note = api.getNoteWithLabel('noteId', id);
                            if (note) api.deleteNote(note.noteId);
                        }, n.noteId);
                        state.data.images.splice(idx, 1);
                        $statEls.images.$num.text(state.data.images.length);
                        renderTable();
                        log(`Imagem "${n.title}" deletada.`, 'ok');
                    } catch (err) {
                        log('Erro ao deletar: ' + err.message, 'err');
                    }
                });

                $row.append(
                    $noteCell,
                    $('<td>').text(fmtBytes(n.fileSize)).css({
                        padding: '5px 8px', color: 'var(--muted-text-color)', fontSize: '11px', fontVariantNumeric: 'tabular-nums'
                    }),
                    $mod,
                    $('<td>').css({ padding: '2px 8px', textAlign: 'center' }).append($delBtn)
                );
            } else {
                $row.append(
                    $noteCell,
                    $('<td>').text(n.type || '—').css({ padding: '5px 8px', color: 'var(--muted-text-color)', fontSize: '11px' }),
                    $mod
                );
            }

            $tbody.append($row);
        });
    }

    /* ── Troca de aba ───────────────────────────────────────── */
    function setTab(tab) {
        state.activeTab = tab;

        $tabBar.find('button').each(function () {
            const isActive = $(this).data('tab') === tab;
            const color = TABS.find(t => t.key === tab)?.color;
            $(this).css({
                background: isActive ? 'var(--accented-background-color)' : 'transparent',
                color: isActive ? color : 'var(--muted-text-color)',
                border: isActive ? '1px solid var(--main-border-color)' : '1px solid transparent',
                fontWeight: isActive ? 600 : 400
            });
        });

        TABS.forEach(({ key }) => {
            $statEls[key].$card.css({ boxShadow: key === tab ? '0 0 0 2px var(--main-border-color)' : 'none' });
        });

        /* mostra/esconde search e query builder */
        const isQuery = tab === 'query';
        $fsearch.css({ display: isQuery ? 'none' : '' });
        $queryBuilder.css({ display: isQuery ? 'flex' : 'none' });

        renderTable();
    }

    /* ── Scan (backend) ─────────────────────────────────────── */
    async function runScan() {
        if (state.scanning) return;
        state.scanning = true;
        $btnScan.text('…').prop('disabled', true);
        $tbody.empty();
        log('Iniciando análise da base…');

        try {
            const result = await api.runOnBackend(() => {

                function safe(sql, fallback) {
                    try { return api.sql.getRows(sql); }
                    catch (e) { return fallback !== undefined ? fallback : []; }
                }

                const tableNames = new Set(
                    api.sql.getRows("SELECT name FROM sqlite_master WHERE type='table'").map(r => r.name)
                );

                const SYS = `n.noteId NOT IN (
                    'root','_hidden','_share','_search','_lbBookmarks',
                    '_globalNoteMap','_sqlConsole','_help'
                )`;

                /* ① Órfãs */
                let orphans = [];
                const linksTable = ['note_links','links','internal_links','note_link']
                    .find(t => tableNames.has(t));

                if (linksTable) {
                    const cols = api.sql.getRows(`PRAGMA table_info(${linksTable})`).map(r => r.name);
                    const targetCol = cols.includes('targetNoteId') ? 'targetNoteId'
                                    : cols.includes('noteId_to')   ? 'noteId_to'
                                    : cols.includes('targetId')    ? 'targetId'
                                    : null;
                    const deletedWhere = cols.includes('isDeleted') ? 'WHERE isDeleted = 0' : '';
                    if (targetCol) {
                        orphans = safe(`
                            SELECT n.noteId, n.title, n.type, n.dateModified
                            FROM notes n
                            WHERE n.isDeleted = 0 AND ${SYS}
                              AND n.type NOT IN ('search','launcher','book')
                              AND n.noteId NOT IN (
                                  SELECT DISTINCT ${targetCol} FROM ${linksTable} ${deletedWhere}
                              )
                            ORDER BY n.dateModified ASC LIMIT 200
                        `, []);
                    }
                } else {
                    orphans = safe(`
                        SELECT n.noteId, n.title, n.type, n.dateModified
                        FROM notes n
                        WHERE n.isDeleted = 0 AND ${SYS}
                          AND n.type NOT IN ('search','launcher','book')
                          AND n.noteId NOT IN (
                              SELECT DISTINCT value FROM attributes
                              WHERE type = 'relation' AND isDeleted = 0 AND value != ''
                          )
                        ORDER BY n.dateModified ASC LIMIT 200
                    `, []);
                }

                const _tables = [...tableNames].sort();

                const HAS_CHILDREN = `n.noteId NOT IN (
                    SELECT DISTINCT parentNoteId FROM branches WHERE isDeleted = 0
                )`;

                /* ② Stubs */
                const stubs = api.sql.getRows(`
                    SELECT n.noteId, n.title, n.type, n.dateModified,
                           LENGTH(b.content) AS contentLen
                    FROM notes n
                    JOIN blobs b ON n.blobId = b.blobId
                    WHERE n.isDeleted = 0
                      AND ${SYS}
                      AND n.type = 'text'
                      AND ${HAS_CHILDREN}
                      AND LENGTH(b.content) BETWEEN 1 AND 250
                    ORDER BY LENGTH(b.content) ASC
                    LIMIT 150
                `);

                /* ③ Vazias */
                const empty = api.sql.getRows(`
                    SELECT n.noteId, n.title, n.type, n.dateModified
                    FROM notes n
                    LEFT JOIN blobs b ON n.blobId = b.blobId
                    WHERE n.isDeleted = 0
                      AND ${SYS}
                      AND n.type = 'text'
                      AND ${HAS_CHILDREN}
                      AND (
                          b.content IS NULL
                          OR TRIM(b.content) = ''
                          OR b.content = '<p></p>'
                          OR b.content = '<p><br></p>'
                          OR b.content = '<p><br class="ProseMirror-trailingBreak"></p>'
                      )
                    ORDER BY n.dateModified DESC
                    LIMIT 150
                `);

                /* ④ TODOs antigos */
                const todos = api.sql.getRows(`
                    SELECT DISTINCT n.noteId, n.title, n.type, n.dateModified,
                                    a.name AS todoLabel
                    FROM notes n
                    JOIN attributes a ON n.noteId = a.noteId AND a.isDeleted = 0
                    WHERE n.isDeleted = 0
                      AND ${SYS}
                      AND LOWER(a.name) LIKE '%todo%'
                      AND CAST((julianday('now') - julianday(n.dateModified)) AS INTEGER) > 30
                    ORDER BY n.dateModified ASC
                    LIMIT 150
                `);

                /* ⑤ Abandonadas */
                const abandoned = api.sql.getRows(`
                    SELECT n.noteId, n.title, n.type, n.dateModified
                    FROM notes n
                    WHERE n.isDeleted = 0
                      AND ${SYS}
                      AND n.type = 'text'
                      AND CAST((julianday('now') - julianday(n.dateModified)) AS INTEGER) > 90
                      AND n.noteId NOT IN (
                          SELECT DISTINCT parentNoteId FROM branches WHERE isDeleted = 0
                      )
                    ORDER BY n.dateModified ASC
                    LIMIT 150
                `);

                /* ⑥ Imagens Órfãs */
                let images = [];
                try {
                    images = api.sql.getRows(`
                        SELECT n.noteId, n.title, n.dateModified,
                               LENGTH(b.content) AS fileSize
                        FROM notes n
                        JOIN blobs b ON n.blobId = b.blobId
                        WHERE n.isDeleted = 0 AND n.type = 'image'
                          AND NOT EXISTS (
                              SELECT 1 FROM blobs b2
                              JOIN notes n2 ON n2.blobId = b2.blobId
                              WHERE n2.isDeleted = 0 AND n2.type = 'text'
                                AND b2.content LIKE '%' || n.noteId || '%'
                          )
                        ORDER BY n.dateModified DESC
                        LIMIT 100
                    `);
                } catch (e) {
                    images = [];
                }

                return { orphans, stubs, empty, todos, abandoned, images, _tables };
            }, []);

            state.data = result;

            if (result._tables && result._tables.length) {
                log('Tabelas DB: ' + result._tables.join(', '));
            }

            TABS.forEach(({ key }) => {
                if (key !== 'query') {
                    $statEls[key].$num.text(state.data[key].length);
                }
            });

            $stats.css({ display: 'grid' });
            $tabBar.css({ display: 'flex' });
            $fsearch.show();

            const total = Object.entries(result)
                .filter(([k, v]) => k !== '_tables' && Array.isArray(v))
                .reduce((s, [, a]) => s + a.length, 0);
            const msg = total === 0
                ? 'Base saudável — nenhum item de dívida encontrado.'
                : `${total} itens encontrados.`;
            log(msg, total === 0 ? 'ok' : 'warn');

            setTab(state.activeTab);

        } catch (err) {
            log('Erro: ' + err.message, 'err');
            console.error(err);
        } finally {
            state.scanning = false;
            $btnScan.text('▶ Escanear').prop('disabled', false);
        }
    }

    /* ── Query Builder: Executar ────────────────────────────── */
    async function runQuery() {
        const type   = $qbInputs.noteType.val();
        const label  = $qbInputs.labelName.val().trim();
        const val    = $qbInputs.labelValue.val().trim();
        const from   = $qbInputs.dateFrom.val();
        const to     = $qbInputs.dateTo.val();
        const custom = $qbWhere.val().trim();

        const wheres = [];
        const params = {};

        if (type) {
            wheres.push("n.type = $type");
            params.type = type;
        }
        if (label) {
            if (val) {
                wheres.push(`n.noteId IN (SELECT noteId FROM attributes WHERE isDeleted = 0 AND name = $lname AND value = $lval)`);
                params.lname = label;
                params.lval = val;
            } else {
                wheres.push(`n.noteId IN (SELECT noteId FROM attributes WHERE isDeleted = 0 AND name = $lname)`);
                params.lname = label;
            }
        }
        if (from) {
            wheres.push("n.dateCreated >= $from");
            params.from = from;
        }
        if (to) {
            wheres.push("n.dateCreated <= $to || 'T23:59:59'");
            params.to = to;
        }
        if (custom) {
            wheres.push(`(${custom})`);
        }

        if (!wheres.length) {
            log('Preencha ao menos um filtro para consultar.', 'warn');
            return;
        }

        const whereSQL = wheres.join(' AND ');
        const sql = `
            SELECT n.noteId, n.title, n.type, n.dateCreated, n.dateModified
            FROM notes n
            WHERE n.isDeleted = 0
              AND n.noteId NOT IN ('root','_hidden','_share','_search','_lbBookmarks','_globalNoteMap','_sqlConsole','_help')
              AND ${whereSQL}
            ORDER BY n.dateModified DESC
            LIMIT 200
        `;

        log('Executando consulta…');
        state.queryCols = ['noteId', 'title', 'type', 'dateCreated', 'dateModified'];

        try {
            const rows = await api.runOnBackend((q, p) => {
                return api.sql.getRows(q, p);
            }, sql, params);

            state.data.query = rows;
            log(`${rows.length} resultados encontrados.`, rows.length ? 'ok' : 'info');
            $statEls.query.$num.text(rows.length);
            renderTable();
        } catch (err) {
            log('Erro na consulta: ' + err.message, 'err');
            console.error(err);
        }
    }

    /* ── Query Builder: Salvar / Carregar ───────────────────── */
    function rebuildSavedSelect() {
        $qbSavedSelect.empty();
        $qbSavedSelect.append($('<option>').val('-1').text('📂 Carregar salva…'));
        state.savedQueries.forEach((q, i) => {
            $qbSavedSelect.append(
                $('<option>').val(i).text(q.name || `Consulta #${i + 1}`)
            );
        });
    }

    function saveCurrentQuery() {
        const name = prompt('Nome da consulta:');
        if (!name) return;
        const q = {
            name,
            type: $qbInputs.noteType.val(),
            label: $qbInputs.labelName.val().trim(),
            value: $qbInputs.labelValue.val().trim(),
            from: $qbInputs.dateFrom.val(),
            to: $qbInputs.dateTo.val(),
            where: $qbWhere.val().trim()
        };
        state.savedQueries.push(q);
        localStorage.setItem('kd_savedQueries', JSON.stringify(state.savedQueries));
        rebuildSavedSelect();
        $qbSavedSelect.val(state.savedQueries.length - 1);
        $qbBtnDel.css({ display: 'inline' });
        log('Consulta salva: ' + name, 'ok');
    }

    function loadQuery(idx) {
        const q = state.savedQueries[idx];
        if (!q) return;
        $qbInputs.noteType.val(q.type || '');
        $qbInputs.labelName.val(q.label || '');
        $qbInputs.labelValue.val(q.value || '');
        $qbInputs.dateFrom.val(q.from || '');
        $qbInputs.dateTo.val(q.to || '');
        $qbWhere.val(q.where || '');
        $qbBtnDel.css({ display: 'inline' });
        state.selectedQueryIdx = idx;
    }

    function deleteSavedQuery() {
        if (state.selectedQueryIdx < 0) return;
        if (!confirm('Deletar "' + state.savedQueries[state.selectedQueryIdx].name + '"?')) return;
        state.savedQueries.splice(state.selectedQueryIdx, 1);
        localStorage.setItem('kd_savedQueries', JSON.stringify(state.savedQueries));
        rebuildSavedSelect();
        state.selectedQueryIdx = -1;
        $qbBtnDel.css({ display: 'none' });
        log('Consulta removida.', 'info');
    }

    /* ── Eventos ────────────────────────────────────────────── */
    $btnScan.on('click', runScan);
    $fsearch.on('input', function () {
        state.search = $(this).val();
        renderTable();
    });

    $qbBtnExec.on('click', runQuery);
    $qbBtnSave.on('click', saveCurrentQuery);
    $qbBtnDel.on('click', deleteSavedQuery);
    $qbSavedSelect.on('change', function () {
        const idx = parseInt($(this).val());
        if (idx >= 0) loadQuery(idx);
    });

    rebuildSavedSelect();

    /* ── Init ───────────────────────────────────────────────── */
    log('Pronto. Clique em "▶ Escanear" para analisar sua base de conhecimento.');
})();
