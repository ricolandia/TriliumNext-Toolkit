/**
 * Knowledge Debt — TriliumNext
 * Dashboard de saúde do PKM.
 *
 * Modo: Render Note  →  crie uma nota JS Frontend e aponte ~renderNote para ela.
 *
 * Detecta:
 *   • Notas órfãs     — sem nenhum backlink interno
 *   • Stubs           — conteúdo entre 1–250 chars (rascunhos nunca desenvolvidos)
 *   • Notas vazias    — conteúdo nulo ou parágrafo vazio
 *   • TODOs antigos   — label *todo* sem modificação há > 30 dias
 *   • Abandonadas     — sem filhos, sem modificação há > 90 dias
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
        data: { orphans: [], stubs: [], empty: [], todos: [], abandoned: [] },
        activeTab: 'orphans',
        search: '',
        scanning: false
    };

    /* ── Definições das categorias ──────────────────────────── */
    const TABS = [
        { key: 'orphans',   label: 'Órfãs',         color: '#d97070', icon: '🔴' },
        { key: 'stubs',     label: 'Stubs',          color: '#c9984a', icon: '🟠' },
        { key: 'empty',     label: 'Vazias',         color: '#9b7ec8', icon: '🟣' },
        { key: 'todos',     label: 'TODOs antigos',  color: '#6b95c4', icon: '🔵' },
        { key: 'abandoned', label: 'Abandonadas',    color: '#68a87c', icon: '🟢' },
    ];

    /* ── Header ─────────────────────────────────────────────── */
    const $header = $('<div>').css({
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '10px 16px', borderBottom: '1px solid var(--main-border-color)',
        flexShrink: 0
    });

    const $titleEl = $('<span>').html('🩺&nbsp;<strong>Knowledge Debt</strong>').css({ flex: 1, fontSize: '14px' });

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
        display: 'none', gridTemplateColumns: 'repeat(5,1fr)',
        gap: '8px', padding: '12px 16px', flexShrink: 0
    });

    const $statEls = {};
    TABS.forEach(({ key, label, color, icon }) => {
        const $card = $('<div>').css({
            textAlign: 'center', padding: '10px 4px', borderRadius: '5px',
            background: 'var(--accented-background-color)',
            borderTop: '3px solid ' + color, cursor: 'pointer',
            transition: 'opacity .15s'
        }).on('click', () => setTab(key))
          .hover(function () { $(this).css({ opacity: '.8' }); },
                 function () { $(this).css({ opacity: '1' }); });

        const $num = $('<div>').text('—').css({ fontSize: '24px', fontWeight: 700, color });
        const $lbl = $('<div>').text(icon + ' ' + label).css({
            fontSize: '10px', color: 'var(--muted-text-color)', marginTop: '3px'
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
            padding: '4px 12px', cursor: 'pointer', border: '1px solid transparent',
            borderRadius: '3px', fontSize: '12px', background: 'transparent',
            color: 'var(--muted-text-color)'
        }).on('click', () => setTab(key)).appendTo($tabBar);
    });

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

    $root.append($header, $stats, $tabBar, $tableWrap, $log);

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

    /* ── Render da tabela ───────────────────────────────────── */
    const COLS = {
        orphans:   ['Nota', 'Tipo', 'Última modificação'],
        stubs:     ['Nota', 'Tipo', 'Última modificação', 'Tamanho'],
        empty:     ['Nota', 'Tipo', 'Última modificação'],
        todos:     ['Nota', 'Label', 'Última modificação'],
        abandoned: ['Nota', 'Tipo', 'Última modificação'],
    };

    function renderTable() {
        $tbody.empty();
        $thead.empty();

        const tab  = state.activeTab;
        const srch = state.search.toLowerCase();
        const items = (state.data[tab] || []).filter(n =>
            !srch || (n.title || '').toLowerCase().includes(srch)
        );

        /* cabeçalho */
        const $hrow = $('<tr>').css({ borderBottom: '2px solid var(--main-border-color)' });
        (COLS[tab] || ['Nota']).forEach(h => {
            $hrow.append(
                $('<th>').text(h).css({
                    textAlign: 'left', padding: '6px 8px', fontSize: '11px',
                    color: 'var(--muted-text-color)', fontWeight: 600
                })
            );
        });
        $thead.append($hrow);

        if (!items.length) {
            $tbody.append(
                $('<tr>').append(
                    $('<td colspan="4">').text(
                        state.scanning ? 'Escaneando…' : 'Nenhuma nota encontrada aqui 👌'
                    ).css({ padding: '24px', textAlign: 'center', color: 'var(--muted-text-color)' })
                )
            );
            return;
        }

        const tabColor = TABS.find(t => t.key === tab)?.color || 'var(--main-text-color)';

        items.forEach(n => {
            const $row = $('<tr>').css({ borderBottom: '1px solid var(--main-border-color)' })
                .hover(
                    () => $row.css({ background: 'var(--accented-background-color)' }),
                    () => $row.css({ background: 'transparent' })
                );

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

        /* destaque do card de stat */
        TABS.forEach(({ key }) => {
            $statEls[key].$card.css({ boxShadow: key === tab ? '0 0 0 2px var(--main-border-color)' : 'none' });
        });

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

                /* Helper: executa SQL sem explodir se a tabela não existir */
                function safe(sql, fallback) {
                    try { return api.sql.getRows(sql); }
                    catch (e) { return fallback !== undefined ? fallback : []; }
                }

                /* Descobrir quais tabelas existem nessa versão do TriliumNext */
                const tableNames = new Set(
                    api.sql.getRows("SELECT name FROM sqlite_master WHERE type='table'").map(r => r.name)
                );

                /* Notas a ignorar (sistema/raízes internas) */
                const SYS = `n.noteId NOT IN (
                    'root','_hidden','_share','_search','_lbBookmarks',
                    '_globalNoteMap','_sqlConsole','_help'
                )`;

                /* ① Órfãs — tenta tabelas de links em ordem de preferência */
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
                    /* Fallback: sem tabela de links — usa relations de atributos */
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

                /* tabelas encontradas — enviadas para debug no log */
                const _tables = [...tableNames].sort();

                /* Notas container (têm filhos) — excluir de stubs e empty */
                const HAS_CHILDREN = `n.noteId NOT IN (
                    SELECT DISTINCT parentNoteId FROM branches WHERE isDeleted = 0
                )`;

                /* ② Stubs: texto com 1–250 chars, sem filhos */
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

                /* ③ Vazias: sem conteúdo, sem filhos (não é container/coleção) */
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

                /* ④ TODOs antigos: label com 'todo', sem modificação > 30 dias */
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

                /* ⑤ Abandonadas: sem filhos, sem modificação > 90 dias */
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

                return { orphans, stubs, empty, todos, abandoned, _tables };
            }, []);

            state.data = result;

            /* debug: lista tabelas encontradas */
            if (result._tables && result._tables.length) {
                log('Tabelas DB: ' + result._tables.join(', '));
            }

            /* atualiza contadores */
            TABS.forEach(({ key }) => {
                $statEls[key].$num.text(state.data[key].length);
            });

            $stats.css({ display: 'grid' });
            $tabBar.css({ display: 'flex' });
            $fsearch.show();

            const total = Object.values(result)
                .filter((v, _, arr) => Array.isArray(v))
                .reduce((s, a) => s + a.length, 0);
            const msg = total === 0
                ? 'Base saudável — nenhum item de dívida encontrado.'
                : `${total} itens de dívida encontrados.`;
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

    /* ── Eventos ────────────────────────────────────────────── */
    $btnScan.on('click', runScan);
    $fsearch.on('input', function () {
        state.search = $(this).val();
        renderTable();
    });

    /* ── Init ───────────────────────────────────────────────── */
    log('Pronto. Clique em "▶ Escanear" para analisar sua base de conhecimento.');
})();