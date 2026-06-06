/**
 * Knowledge Dashboard — TriliumNext Toolkit
 * Dashboard de saúde + consultas do PKM.
 *
 * Abas:
 *   • Órfãs          — notas sem backlink interno
 *   • Stubs          — conteúdo entre 1–250 chars
 *   • Vazias         — conteúdo nulo ou parágrafo vazio
 *   • TODOs antigos  — label *todo* sem modificação há > 30 dias
 *   • Abandonadas    — sem filhos, sem modificação há > 90 dias
 *   • PDFs           — arquivos PDF espalhados pela base
 *   • Consulta Livre — query customizada com filtros e SQL
 *
 * Créditos:
 *   Inspirado pelo ecodiv/Trilium_scripts — NOT_SYSTEM com ESCAPE,
 *   exclusão de notas protegidas/arquivadas/infraestrutura.
 */

/* ═══════════════════════════════════════════════════════════════
   CSS
══════════════════════════════════════════════════════════════════ */
const KD_CSS = `
.kd-root { display:flex;flex-direction:column;height:100%;font-family:var(--detail-font-family,"Segoe UI",sans-serif);font-size:15px;color:var(--main-text-color);background:var(--main-background-color);overflow:hidden; }
.kd-header { display:flex;align-items:center;gap:10px;padding:10px 16px;border-bottom:1px solid var(--main-border-color);flex-shrink:0; }
.kd-title { flex:1;font-size:20px; }
.kd-input { padding:5px 10px;border-radius:5px;font-size:14px;background:var(--accented-background-color);color:var(--main-text-color);border:1px solid var(--main-border-color);outline:none;transition:border-color .15s; }
.kd-input:focus { border-color:var(--muted-text-color); }
.kd-btn { padding:6px 16px;cursor:pointer;border-radius:5px;font-size:14px;font-weight:500;background:var(--accented-background-color);color:var(--main-text-color);border:1px solid var(--main-border-color);transition:opacity .15s,transform .1s; }
.kd-btn:hover { opacity:.85;transform:translateY(-1px); }
.kd-btn:active { transform:translateY(0); }
.kd-btn:disabled { opacity:.5;cursor:wait;transform:none; }
.kd-stats { display:none;grid-template-columns:repeat(7,1fr);gap:6px;padding:10px 16px 6px;flex-shrink:0; }
.kd-stat-card { text-align:center;padding:8px 4px;border-radius:6px;background:var(--accented-background-color);cursor:pointer;transition:opacity .15s,box-shadow .15s,transform .1s; }
.kd-stat-card:hover { opacity:.85;transform:translateY(-1px); }
.kd-stat-num { font-size:24px;font-weight:700; }
.kd-stat-label { font-size:12px;color:var(--muted-text-color);margin-top:3px; }
.kd-tab-bar { display:none;align-items:center;gap:4px;padding:0 16px 8px;flex-shrink:0;flex-wrap:wrap; }
.kd-tab { padding:4px 10px;cursor:pointer;border:1px solid transparent;border-radius:4px;font-size:13px;background:transparent;color:var(--muted-text-color);transition:all .15s; }
.kd-tab:hover { color:var(--main-text-color); }
.kd-tab.active { border-color:var(--main-border-color);font-weight:600; }
.kd-qb { display:none;flex-shrink:0;padding:0 16px 8px;gap:8px;flex-wrap:wrap;align-items:end; }
.kd-qb-field { display:flex;flex-direction:column;gap:3px; }
.kd-qb-label { font-size:12px;color:var(--muted-text-color); }
.kd-qb-input { padding:5px 8px;border-radius:4px;font-size:14px;background:var(--accented-background-color);color:var(--main-text-color);border:1px solid var(--main-border-color);outline:none; }
.kd-qb-input:focus { border-color:var(--muted-text-color); }
.kd-qb-where { padding:5px 8px;border-radius:4px;font-size:13px;background:var(--accented-background-color);color:var(--main-text-color);border:1px solid var(--main-border-color);resize:vertical;font-family:monospace;line-height:1.4;outline:none; }
.kd-qb-where:focus { border-color:var(--muted-text-color); }
.kd-table-wrap { flex:1;overflow-y:auto;padding:0 16px 8px; }
.kd-table { width:100%;border-collapse:collapse; }
.kd-th { text-align:left;padding:7px 10px;font-size:14px;color:var(--muted-text-color);font-weight:600;border-bottom:2px solid var(--main-border-color);white-space:nowrap; }
.kd-td { padding:6px 10px;font-size:14px; }
.kd-td-muted { padding:6px 10px;font-size:14px;color:var(--muted-text-color);white-space:nowrap; }
.kd-td-num { padding:6px 10px;font-size:14px;font-variant-numeric:tabular-nums; }
.kd-row { border-bottom:1px solid var(--main-border-color);transition:background .1s; }
.kd-row:hover { background:var(--accented-background-color); }
.kd-row:nth-child(even) { background:rgba(128,128,128,.03); }
.kd-row:nth-child(even):hover { background:var(--accented-background-color); }
.kd-link { color:var(--main-text-color);cursor:pointer;text-decoration:none;font-weight:500; }
.kd-link:hover { text-decoration:underline; }
.kd-empty { padding:32px;text-align:center;color:var(--muted-text-color);font-size:15px; }
.kd-log { padding:6px 16px;font-size:13px;color:var(--muted-text-color);border-top:1px solid var(--main-border-color);flex-shrink:0;max-height:72px;overflow-y:auto;font-family:monospace; }
.kd-log-line { margin-bottom:1px; }
.kd-log-ok { color:#68a87c; }
.kd-log-warn { color:#c9984a; }
.kd-log-err { color:#d97070; }
`;

function injectKDStyles() {
    var el = document.getElementById('kd-styles');
    if (!el) { el = document.createElement('style'); el.id = 'kd-styles'; document.head.appendChild(el); }
    if (el.textContent !== KD_CSS) el.textContent = KD_CSS;
}
injectKDStyles();

(async function () {
    var $root = $container;
    $root.empty().addClass('kd-root');

    var INFRA_IDS = new Set();

    var state = {
        data: { orphans: [], stubs: [], empty: [], todos: [], abandoned: [], pdfs: [], query: [] },
        activeTab: 'orphans',
        search: '',
        scanning: false,
        savedQueries: JSON.parse(localStorage.getItem('kd_savedQueries') || '[]'),
        queryCols: [],
        selectedQueryIdx: -1
    };

    var TABS = [
        { key: 'orphans',   label: 'Órfãs',        color: '#d97070', icon: '🔴' },
        { key: 'stubs',     label: 'Stubs',         color: '#c9984a', icon: '🟠' },
        { key: 'empty',     label: 'Vazias',        color: '#9b7ec8', icon: '🟣' },
        { key: 'todos',     label: 'TODOs antigos', color: '#6b95c4', icon: '🔵' },
        { key: 'abandoned', label: 'Abandonadas',   color: '#68a87c', icon: '🟢' },
        { key: 'pdfs',      label: 'PDFs',          color: '#e05c5c', icon: '📄' },
        { key: 'query',     label: 'Consulta Livre',color: '#5ca0e0', icon: '🔎' },
    ];

    /* ── Header ─────────────────────────────────────────────── */
    var $header = $('<div class="kd-header">');
    var $titleEl = $('<span class="kd-title">').html('📊&nbsp;<strong>Knowledge Dashboard</strong>');
    var $fsearch = $('<input class="kd-input" type="text" placeholder="🔍 filtrar por título…">').hide();
    var $btnScan = $('<button class="kd-btn">').text('▶ Escanear');
    $header.append($titleEl, $fsearch, $btnScan);

    /* ── Stats bar ──────────────────────────────────────────── */
    var $stats = $('<div class="kd-stats">');
    var $statEls = {};
    TABS.forEach(function(t) {
        var $card = $('<div class="kd-stat-card">').css({ borderTop: '3px solid ' + t.color })
            .on('click', function() { setTab(t.key); });
        var $num = $('<div class="kd-stat-num">').text('—').css({ color: t.color });
        var $lbl = $('<div class="kd-stat-label">').text(t.icon + ' ' + t.label);
        $card.append($num, $lbl);
        $statEls[t.key] = { $card: $card, $num: $num };
        $stats.append($card);
    });

    /* ── Tabs ───────────────────────────────────────────────── */
    var $tabBar = $('<div class="kd-tab-bar">');
    TABS.forEach(function(t) {
        $('<button class="kd-tab">').text(t.icon + ' ' + t.label).data('tab', t.key)
            .on('click', function() { setTab(t.key); }).appendTo($tabBar);
    });

    /* ── Query Builder ──────────────────────────────────────── */
    var $queryBuilder = $('<div class="kd-qb">');
    var QB_FIELDS = [
        { key: 'noteType', label: 'Tipo', type: 'select', options: ['','text','code','file','book','canvas','search','relationMap','render'] },
        { key: 'labelName', label: 'Label', type: 'text', placeholder: 'ex: projeto' },
        { key: 'labelValue', label: 'Valor', type: 'text', placeholder: 'ex: meu-projeto' },
        { key: 'dateFrom', label: 'De', type: 'date' },
        { key: 'dateTo', label: 'Até', type: 'date' },
    ];
    var $qbInputs = {};
    QB_FIELDS.forEach(function(f) {
        var $wrap = $('<div class="kd-qb-field">');
        var $label = $('<label class="kd-qb-label">').text(f.label);
        var $input;
        if (f.type === 'select') {
            $input = $('<select class="kd-qb-input">');
            f.options.forEach(function(o) { $input.append($('<option>').val(o).text(o || '(todos)')); });
        } else if (f.type === 'date') {
            $input = $('<input class="kd-qb-input" type="date">');
        } else {
            $input = $('<input class="kd-qb-input" type="text">').attr('placeholder', f.placeholder || '');
        }
        $wrap.append($label, $input);
        $qbInputs[f.key] = $input;
        $queryBuilder.append($wrap);
    });
    var $qbWhereWrap = $('<div class="kd-qb-field">').css({ flex: 1, minWidth: '180px' });
    var $qbWhereLabel = $('<label class="kd-qb-label">').text('WHERE (custom)');
    var $qbWhere = $('<textarea class="kd-qb-where" rows="1">').attr('placeholder', "n.type = 'text' AND ...");
    $qbWhereWrap.append($qbWhereLabel, $qbWhere);
    $queryBuilder.append($qbWhereWrap);
    var $qbBtnExec = $('<button class="kd-btn">').text('▶ Executar').css({ color: '#5ca0e0', fontWeight: 600 });
    var $qbBtnSave = $('<button class="kd-btn kd-btn-ghost">').text('💾 Salvar');
    var $qbSavedSelect = $('<select class="kd-qb-input">').css({ minWidth: '140px' });
    $qbSavedSelect.append($('<option>').val('-1').text('📂 Carregar salva…'));
    var $qbBtnDel = $('<button class="kd-btn kd-btn-ghost">').text('✕').css({ color: '#d97070' }).hide();
    $queryBuilder.append($qbBtnExec, $qbSavedSelect, $qbBtnSave, $qbBtnDel);

    /* ── Tabela ─────────────────────────────────────────────── */
    var $tableWrap = $('<div class="kd-table-wrap">');
    var $table = $('<table class="kd-table">');
    var $thead = $('<thead>');
    var $tbody = $('<tbody>');
    $table.append($thead, $tbody);
    $tableWrap.append($table);

    /* ── Log ────────────────────────────────────────────────── */
    var $log = $('<div class="kd-log">');
    $root.append($header, $stats, $tabBar, $queryBuilder, $tableWrap, $log);

    /* ── Helpers ────────────────────────────────────────────── */
    function log(msg, type) {
        type = type || 'info';
        var c = { ok: '#68a87c', warn: '#c9984a', err: '#d97070', info: 'var(--muted-text-color)' };
        $log.append($('<div class="kd-log-line">').text('[' + new Date().toLocaleTimeString() + '] ' + msg).css({ color: c[type] }));
        $log.scrollTop($log[0].scrollHeight);
    }

    function openNote(noteId) { try { if (api.openTabWithNote) api.openTabWithNote(noteId, true); else if (api.activateNote) api.activateNote(noteId); } catch (_) {} }
    function daysSince(d) { return d ? Math.floor((Date.now() - new Date(d).getTime()) / 86400000) : null; }
    function daysLabel(d) { var n = daysSince(d); return n === null ? '—' : n === 0 ? 'hoje' : n === 1 ? 'ontem' : 'há ' + n + ' dias'; }
    function fmtBytes(b) { if (!b && b !== 0) return '—'; if (b < 1024) return b + ' B'; if (b < 1048576) return (b / 1024).toFixed(1) + ' KB'; return (b / 1048576).toFixed(1) + ' MB'; }
    function isSystemNote(id) { return id === 'root' || id.charAt(0) === '_' || INFRA_IDS.has(id); }

    /* ── Render da tabela ───────────────────────────────────── */
    var COLS = {
        orphans:   ['Nota', 'Tipo', 'Última modificação'],
        stubs:     ['Nota', 'Tipo', 'Última modificação', 'Tamanho'],
        empty:     ['Nota', 'Tipo', 'Última modificação'],
        todos:     ['Nota', 'Label', 'Última modificação'],
        abandoned: ['Nota', 'Tipo', 'Última modificação'],
        pdfs:      ['Nota', 'Tamanho', 'Última modificação'],
    };

    function renderTable() {
        $tbody.empty(); $thead.empty();
        var tab = state.activeTab;
        var cols = tab === 'query' ? (state.queryCols.length ? state.queryCols : ['Resultado']) : (COLS[tab] || ['Nota']);
        var srch = state.search.toLowerCase();
        var items = (state.data[tab] || []).filter(function(n) { return !srch || (n.title || '').toLowerCase().indexOf(srch) >= 0; });

        var $hrow = $('<tr>');
        cols.forEach(function(h) { $hrow.append($('<th class="kd-th">').text(h)); });
        $thead.append($hrow);

        if (!items.length) {
            $tbody.append($('<tr>').append($('<td class="kd-empty" colspan="99">').text(state.scanning ? 'Escaneando…' : 'Nenhuma nota encontrada aqui 👌')));
            return;
        }

        var tabColor = null;
        TABS.forEach(function(t) { if (t.key === tab) tabColor = t.color; });
        if (!tabColor) tabColor = 'var(--main-text-color)';

        items.forEach(function(n, idx) {
            var $row = $('<tr class="kd-row">');

            if (tab === 'query') {
                cols.forEach(function(col, ci) {
                    var val = n[col] !== undefined ? n[col] : (Object.values(n)[ci] || '');
                    var $cell;
                    if (col === 'title' || col === 'noteId') {
                        $cell = $('<td class="kd-td">').append(
                            $('<a class="kd-link">').text(String(val).substring(0, 200)).on('click', function() { openNote(n.noteId); })
                        );
                    } else {
                        $cell = $('<td class="kd-td">').text(String(val).substring(0, 200));
                    }
                    $cell.css({ color: col === 'noteId' ? '#5ca0e0' : '', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' });
                    $row.append($cell);
                });
                $tbody.append($row);
                return;
            }

            var $link = $('<a class="kd-link">').text(n.title || '(sem título)').on('click', function() { openNote(n.noteId); });
            var $noteCell = $('<td class="kd-td">').append($link);
            var $mod = $('<td class="kd-td-muted">').text(daysLabel(n.dateModified));

            if (tab === 'stubs') {
                $row.append($noteCell, $('<td class="kd-td-muted">').text(n.type || '—'), $mod, $('<td class="kd-td-num">').text(n.contentLen + ' chars').css({ color: tabColor }));
            } else if (tab === 'todos') {
                $row.append($noteCell, $('<td class="kd-td-num">').text('#' + (n.todoLabel || 'todo')).css({ color: tabColor }), $mod);
            } else if (tab === 'pdfs') {
                $row.append($noteCell, $('<td class="kd-td-num">').text(fmtBytes(n.fileSize)), $mod);
            } else {
                $row.append($noteCell, $('<td class="kd-td-muted">').text(n.type || '—'), $mod);
            }
            $tbody.append($row);
        });
    }

    /* ── Troca de aba ───────────────────────────────────────── */
    function setTab(tab) {
        state.activeTab = tab;
        $tabBar.find('button').each(function() {
            var active = $(this).data('tab') === tab;
            var color = null; TABS.forEach(function(t) { if (t.key === tab) color = t.color; });
            $(this).toggleClass('active', active).css({ color: active ? color : '', background: active ? 'var(--accented-background-color)' : '' });
        });
        TABS.forEach(function(t) { $statEls[t.key].$card.css({ boxShadow: t.key === tab ? '0 0 0 2px var(--main-border-color)' : 'none' }); });
        var isQuery = tab === 'query';
        $fsearch.toggle(!isQuery);
        $queryBuilder.toggle(isQuery);
        renderTable();
    }

    /* ── Scan ───────────────────────────────────────────────── */
    async function runScan() {
        if (state.scanning) return;
        state.scanning = true;
        $btnScan.text('…').prop('disabled', true);
        $tbody.empty();
        log('Iniciando análise da base…');

        try {
            var result = await api.runOnBackend(function() {

                function safe(sql, fb) { try { return api.sql.getRows(sql); } catch (e) { return fb !== undefined ? fb : []; } }
                function sqlList(arr) { return arr.map(function(v) { return "'" + String(v).replace(/'/g, "''") + "'"; }).join(','); }

                var tableNames = new Set(api.sql.getRows("SELECT name FROM sqlite_master WHERE type='table'").map(function(r) { return r.name; }));
                var NOT_SYSTEM = "(n.noteId NOT LIKE '\\_%' ESCAPE '\\' AND n.noteId != 'root')";
                var HAS_CHILDREN = "n.noteId NOT IN (SELECT DISTINCT parentNoteId FROM branches WHERE isDeleted = 0)";
                var NOT_PROTECTED = "n.isProtected = 0";
                var NOT_ARCHIVED = "n.noteId NOT IN (SELECT noteId FROM attributes WHERE name = 'archived' AND isDeleted = 0)";
                var USER_TYPES = "n.type IN (" + sqlList(['text', 'code']) + ")";
                var BASE = "n.isDeleted = 0 AND " + NOT_SYSTEM + " AND " + NOT_PROTECTED + " AND " + NOT_ARCHIVED + " AND " + USER_TYPES;
                var _tables = [...tableNames].sort();

                /* ① Órfãs */
                var orphans = [];
                var linksTable = ['note_links','links','internal_links','note_link'].find(function(t) { return tableNames.has(t); });
                if (linksTable) {
                    var cols = api.sql.getRows("PRAGMA table_info(" + linksTable + ")").map(function(r) { return r.name; });
                    var targetCol = cols.indexOf('targetNoteId') >= 0 ? 'targetNoteId' : cols.indexOf('noteId_to') >= 0 ? 'noteId_to' : cols.indexOf('targetId') >= 0 ? 'targetId' : null;
                    var delWhere = cols.indexOf('isDeleted') >= 0 ? 'WHERE isDeleted = 0' : '';
                    if (targetCol) orphans = safe("SELECT n.noteId,n.title,n.type,n.dateModified FROM notes n WHERE " + BASE + " AND n.type NOT IN ('search','launcher','book') AND n.noteId NOT IN (SELECT DISTINCT " + targetCol + " FROM " + linksTable + " " + delWhere + ") ORDER BY n.dateModified ASC LIMIT 200", []);
                } else {
                    orphans = safe("SELECT n.noteId,n.title,n.type,n.dateModified FROM notes n WHERE " + BASE + " AND n.type NOT IN ('search','launcher','book') AND n.noteId NOT IN (SELECT DISTINCT value FROM attributes WHERE type = 'relation' AND isDeleted = 0 AND value != '') ORDER BY n.dateModified ASC LIMIT 200", []);
                }

                /* ② Stubs */
                var stubs = api.sql.getRows("SELECT n.noteId,n.title,n.type,n.dateModified,LENGTH(b.content) AS contentLen FROM notes n JOIN blobs b ON n.blobId = b.blobId WHERE " + BASE + " AND " + HAS_CHILDREN + " AND LENGTH(b.content) BETWEEN 1 AND 250 ORDER BY LENGTH(b.content) ASC LIMIT 150");

                /* ③ Vazias */
                var empty = api.sql.getRows("SELECT n.noteId,n.title,n.type,n.dateModified FROM notes n LEFT JOIN blobs b ON n.blobId = b.blobId WHERE " + BASE + " AND " + HAS_CHILDREN + " AND (b.content IS NULL OR TRIM(b.content) = '' OR b.content = '<p></p>' OR b.content = '<p><br></p>' OR b.content = '<p><br class=\"ProseMirror-trailingBreak\"></p>') ORDER BY n.dateModified DESC LIMIT 150");

                /* ④ TODOs antigos */
                var todos = api.sql.getRows("SELECT DISTINCT n.noteId,n.title,n.type,n.dateModified,a.name AS todoLabel FROM notes n JOIN attributes a ON n.noteId = a.noteId AND a.isDeleted = 0 WHERE " + BASE + " AND LOWER(a.name) LIKE '%todo%' AND CAST((julianday('now') - julianday(n.dateModified)) AS INTEGER) > 30 ORDER BY n.dateModified ASC LIMIT 150");

                /* ⑤ Abandonadas */
                var abandoned = api.sql.getRows("SELECT n.noteId,n.title,n.type,n.dateModified FROM notes n WHERE " + BASE + " AND " + HAS_CHILDREN + " AND CAST((julianday('now') - julianday(n.dateModified)) AS INTEGER) > 90 ORDER BY n.dateModified ASC LIMIT 150");

                /* ⑥ PDFs */
                var pdfs = [];
                try { pdfs = api.sql.getRows("SELECT n.noteId,n.title,n.dateModified,LENGTH(b.content) AS fileSize FROM notes n JOIN blobs b ON n.blobId = b.blobId WHERE n.isDeleted = 0 AND " + NOT_SYSTEM + " AND n.type = 'file' AND (LOWER(n.mime) = 'application/pdf' OR LOWER(n.title) LIKE '%.pdf') ORDER BY n.dateModified DESC LIMIT 200"); } catch (e) { pdfs = []; }

                var typeCounts = safe("SELECT type,COUNT(*) AS cnt FROM notes WHERE isDeleted = 0 GROUP BY type ORDER BY cnt DESC LIMIT 20", []);

                return { orphans: orphans, stubs: stubs, empty: empty, todos: todos, abandoned: abandoned, pdfs: pdfs, _tables: _tables, typeCounts: typeCounts };
            });

            state.data = result;
            if (result._tables && result._tables.length) log('Tabelas DB: ' + result._tables.join(', '));
            if (result.typeCounts && result.typeCounts.length) log('Notas por tipo: ' + result.typeCounts.map(function(r) { return r.type + '=' + r.cnt; }).join(', '), 'info');

            TABS.forEach(function(t) { if (t.key !== 'query') $statEls[t.key].$num.text(state.data[t.key].length); });
            $stats.css({ display: 'grid' });
            $tabBar.css({ display: 'flex' });
            $fsearch.show();

            var total = 0;
            for (var k in result) { if (k !== '_tables' && Array.isArray(result[k])) total += result[k].length; }
            log(total === 0 ? 'Base saudável — nenhum item encontrado.' : total + ' itens encontrados.', total === 0 ? 'ok' : 'warn');
            setTab(state.activeTab);
        } catch (err) { log('Erro: ' + err.message, 'err'); console.error(err); }
        finally { state.scanning = false; $btnScan.text('▶ Escanear').prop('disabled', false); }
    }

    /* ── Query Builder ──────────────────────────────────────── */
    async function runQuery() {
        var type = $qbInputs.noteType.val();
        var label = $qbInputs.labelName.val().trim();
        var val = $qbInputs.labelValue.val().trim();
        var from = $qbInputs.dateFrom.val();
        var to = $qbInputs.dateTo.val();
        var custom = $qbWhere.val().trim();

        if (!type && !label && !from && !to && !custom) { log('Preencha ao menos um filtro para consultar.', 'warn'); return; }

        /* monta SQL no frontend */
        var sq = function(v) { return "'" + String(v).replace(/'/g, "''") + "'"; };
        var w = [];
        if (type)     w.push("n.type = " + sq(type));
        if (label) {
            if (val)   w.push("n.noteId IN (SELECT noteId FROM attributes WHERE isDeleted = 0 AND name = " + sq(label) + " AND value = " + sq(val) + ")");
            else       w.push("n.noteId IN (SELECT noteId FROM attributes WHERE isDeleted = 0 AND name = " + sq(label) + ")");
        }
        if (from)     w.push("n.dateCreated >= " + sq(from));
        if (to)       w.push("n.dateCreated <= " + sq(to) + " || 'T23:59:59'");
        if (custom)   w.push("(" + custom + ")");

        var sql = "SELECT n.noteId,n.title,n.type,n.dateCreated,n.dateModified FROM notes n WHERE n.isDeleted = 0 AND n.noteId NOT LIKE '\\_%' ESCAPE '\\' AND n.noteId != 'root' AND " + w.join(' AND ') + " ORDER BY n.dateModified DESC LIMIT 200";

        log('Executando consulta…');
        state.queryCols = ['noteId', 'title', 'type', 'dateCreated', 'dateModified'];

        try {
            /* cria função com SQL embutido via eval → .toString() igual hardcoded */
            var fn;
            eval("fn = function() { return api.sql.getRows(" + JSON.stringify(sql) + "); }");
            var rows = await api.runOnBackend(fn);
            state.data.query = rows;
            log(rows.length + ' resultados encontrados.', rows.length ? 'ok' : 'info');
            $statEls.query.$num.text(rows.length);
            renderTable();
        } catch (err) { log('Erro na consulta: ' + err.message, 'err'); console.error(err); }
    }

    /* ── Salvar / Carregar queries ──────────────────────────── */
    function rebuildSavedSelect() {
        $qbSavedSelect.empty();
        $qbSavedSelect.append($('<option>').val('-1').text('📂 Carregar salva…'));
        state.savedQueries.forEach(function(q, i) { $qbSavedSelect.append($('<option>').val(i).text(q.name || ('Consulta #' + (i + 1)))); });
    }
    function saveCurrentQuery() {
        var name = prompt('Nome da consulta:');
        if (!name) return;
        state.savedQueries.push({ name: name, type: $qbInputs.noteType.val(), label: $qbInputs.labelName.val().trim(), value: $qbInputs.labelValue.val().trim(), from: $qbInputs.dateFrom.val(), to: $qbInputs.dateTo.val(), where: $qbWhere.val().trim() });
        localStorage.setItem('kd_savedQueries', JSON.stringify(state.savedQueries));
        rebuildSavedSelect(); $qbSavedSelect.val(state.savedQueries.length - 1); $qbBtnDel.show(); log('Consulta salva: ' + name, 'ok');
    }
    function loadQuery(idx) {
        var q = state.savedQueries[idx]; if (!q) return;
        $qbInputs.noteType.val(q.type || '');
        $qbInputs.labelName.val(q.label || ''); $qbInputs.labelValue.val(q.value || '');
        $qbInputs.dateFrom.val(q.from || ''); $qbInputs.dateTo.val(q.to || '');
        $qbWhere.val(q.where || ''); $qbBtnDel.show(); state.selectedQueryIdx = idx;
    }
    function deleteSavedQuery() {
        if (state.selectedQueryIdx < 0) return;
        if (!confirm('Deletar "' + state.savedQueries[state.selectedQueryIdx].name + '"?')) return;
        state.savedQueries.splice(state.selectedQueryIdx, 1);
        localStorage.setItem('kd_savedQueries', JSON.stringify(state.savedQueries));
        rebuildSavedSelect(); state.selectedQueryIdx = -1; $qbBtnDel.hide(); log('Consulta removida.', 'info');
    }

    /* ── Eventos ────────────────────────────────────────────── */
    $btnScan.on('click', runScan);
    $fsearch.on('input', function() { state.search = $(this).val(); renderTable(); });
    $qbBtnExec.on('click', runQuery);
    $qbBtnSave.on('click', saveCurrentQuery);
    $qbBtnDel.on('click', deleteSavedQuery);
    $qbSavedSelect.on('change', function() { var idx = parseInt($(this).val()); if (idx >= 0) loadQuery(idx); });
    rebuildSavedSelect();

    log('Pronto. Clique em "▶ Escanear" para analisar sua base de conhecimento.');
})();
