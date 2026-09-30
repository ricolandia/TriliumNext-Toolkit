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
/* KD-PURE (início) — funções puras (testáveis fora do runtime) */
function kdSqlList(arr) { return arr.map(function(v) { return "'" + String(v).replace(/'/g, "''") + "'"; }).join(','); }
function kdDaysSince(d) { if (!d) return null; var t = Date.now() - new Date(d).getTime(); return isNaN(t) ? null : Math.floor(t / 86400000); }
function kdFmtBytes(b) { if (!b && b !== 0) return '—'; if (b < 1024) return b + ' B'; if (b < 1048576) return (b / 1024).toFixed(1) + ' KB'; return (b / 1048576).toFixed(1) + ' MB'; }
function kdCountTotal(result) { var total = 0; for (var k in result) { if (['_tables','typeCounts','errors'].indexOf(k) < 0 && Array.isArray(result[k])) total += result[k].length; } return total; }
/* KD-PURE (fim) */

const KD_CSS = `
.kd-root { display:flex;flex-direction:column;height:100%;font-family:var(--detail-font-family,"Segoe UI",sans-serif);font-size:15px;color:var(--main-text-color);background:var(--main-background-color);overflow:hidden; }
.kd-header { display:flex;align-items:center;gap:10px;padding:10px 16px;border-bottom:1px solid var(--main-border-color);flex-shrink:0;flex-wrap:wrap; }
.kd-title { flex:1;font-size:20px; }
.kd-input { padding:5px 10px;border-radius:5px;font-size:14px;min-width:140px;background:var(--accented-background-color);color:var(--main-text-color);border:1px solid var(--main-border-color);outline:none;transition:border-color .15s; }
.kd-input:focus-visible { border-color:var(--muted-text-color); outline:2px solid var(--active-item-background-color); outline-offset:1px; }
.kd-btn { padding:10px 16px;cursor:pointer;border-radius:5px;font-size:14px;font-weight:500;min-height:40px;background:var(--accented-background-color);color:var(--main-text-color);border:1px solid var(--main-border-color);transition:opacity .15s,transform .1s; }
.kd-btn:hover { opacity:.85;transform:translateY(-1px); }
.kd-btn:active { transform:translateY(0); }
.kd-btn:disabled { opacity:.5;cursor:wait;transform:none; }
.kd-btn:focus-visible, .kd-tab:focus-visible, .kd-stat-card:focus-visible { outline:2px solid var(--active-item-background-color); outline-offset:1px; }
.kd-stats { display:none;grid-template-columns:repeat(auto-fit,minmax(72px,1fr));gap:6px;padding:10px 16px 6px;flex-shrink:0; }
.kd-stat-card { text-align:center;padding:10px 4px;min-height:48px;border-radius:6px;background:var(--accented-background-color);cursor:pointer;border:1px solid transparent;font:inherit;transition:opacity .15s,box-shadow .15s,transform .1s; }
.kd-stat-card:hover { opacity:.85;transform:translateY(-1px); }
.kd-stat-num { font-size:24px;font-weight:700; }
.kd-stat-label { font-size:12px;color:var(--muted-text-color);margin-top:3px; }
.kd-tab-bar { display:none;align-items:center;gap:4px;padding:0 16px 8px;flex-shrink:0;flex-wrap:wrap; }
.kd-tab { padding:10px 12px;cursor:pointer;border:1px solid transparent;border-radius:4px;font-size:13px;min-height:40px;background:transparent;color:var(--muted-text-color);transition:all .15s; }
.kd-tab:hover { color:var(--main-text-color); }
.kd-tab.active { border-color:var(--main-border-color);font-weight:600; }
.kd-qb { display:none;flex-shrink:0;padding:0 16px 8px;gap:8px;flex-wrap:wrap;align-items:end; }
.kd-qb-field { display:flex;flex-direction:column;gap:3px; }
.kd-qb-label { font-size:12px;color:var(--muted-text-color); }
.kd-qb-input { padding:5px 8px;border-radius:4px;font-size:14px;background:var(--accented-background-color);color:var(--main-text-color);border:1px solid var(--main-border-color);outline:none; }
.kd-qb-input:focus-visible { border-color:var(--muted-text-color); outline:2px solid var(--active-item-background-color); outline-offset:1px; }
.kd-qb-where { padding:5px 8px;border-radius:4px;font-size:13px;background:var(--accented-background-color);color:var(--main-text-color);border:1px solid var(--main-border-color);resize:vertical;font-family:monospace;line-height:1.4;outline:none; }
.kd-qb-where:focus-visible { border-color:var(--muted-text-color); outline:2px solid var(--active-item-background-color); outline-offset:1px; }
.kd-qb-save { display:flex;gap:6px;align-items:center; }
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
.kd-link { color:var(--main-text-color);cursor:pointer;text-decoration:none;font-weight:500;max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:inline-block;vertical-align:bottom; }
.kd-link:hover { text-decoration:underline; }
.kd-link:focus-visible { outline:2px solid var(--active-item-background-color); outline-offset:1px; }
.kd-empty { padding:32px;text-align:center;color:var(--muted-text-color);font-size:15px; }
.kd-log { padding:6px 16px;font-size:13px;color:var(--muted-text-color);border-top:1px solid var(--main-border-color);flex-shrink:0;max-height:72px;overflow-y:auto;font-family:monospace; }
.kd-log-line { margin-bottom:1px; }
.kd-log-ok { color:#68a87c; }
.kd-log-warn { color:#c9984a; }
.kd-log-err { color:#d97070; }
@media (prefers-reduced-motion: reduce) { .kd-btn,.kd-tab,.kd-stat-card,.kd-row { transition:none; } .kd-btn:hover,.kd-stat-card:hover { transform:none; } }
.kd-root[data-kd-theme="light"] .kd-log-ok { color:#3f7d54; }
.kd-root[data-kd-theme="light"] .kd-log-warn { color:#8a6d1f; }
.kd-root[data-kd-theme="light"] .kd-log-err { color:#a93c3c; }
.kd-root[data-kd-theme="light"] .kd-stat-num { filter:saturate(.7) brightness(.85); }
`;

/* ── i18n PT/EN ─────────────────────────────────────────────── */
var KD_I18N = {
    'title':        { pt: '📊&nbsp;<strong>Knowledge Dashboard</strong>', en: '📊&nbsp;<strong>Knowledge Dashboard</strong>' },
    'scan':         { pt: '▶ Escanear', en: '▶ Scan' },
    'search_ph':    { pt: '🔍 filtrar por título…', en: '🔍 filter by title…' },
    'orphans':      { pt: 'Órfãs', en: 'Orphans' },
    'stubs':        { pt: 'Stubs', en: 'Stubs' },
    'empty':        { pt: 'Vazias', en: 'Empty' },
    'todos':        { pt: 'TODOs antigos', en: 'Old TODOs' },
    'abandoned':    { pt: 'Abandonadas', en: 'Abandoned' },
    'pdfs':         { pt: 'PDFs', en: 'PDFs' },
    'query':        { pt: 'Consulta Livre', en: 'Custom Query' },
    'exec':         { pt: '▶ Executar', en: '▶ Run' },
    'save':         { pt: '💾 Salvar', en: '💾 Save' },
    'del':          { pt: '✕', en: '✕' },
    'del_aria':     { pt: 'Excluir consulta salva', en: 'Delete saved query' },
    'load':         { pt: '📂 Carregar salva…', en: '📂 Load saved…' },
    'where_label':  { pt: 'WHERE (custom)', en: 'WHERE (custom)' },
    'where_ph':     { pt: "n.type = 'text' AND ...", en: "n.type = 'text' AND ..." },
    'scanning':     { pt: 'Escaneando…', en: 'Scanning…' },
    'none':         { pt: 'Nenhuma nota encontrada aqui 👌', en: 'No notes found here 👌' },
    'scan_start':   { pt: 'Iniciando análise da base…', en: 'Starting knowledge base scan…' },
    'tables':       { pt: 'Tabelas DB: ', en: 'DB tables: ' },
    'by_type':      { pt: 'Notas por tipo: ', en: 'Notes by type: ' },
    'healthy':      { pt: 'Base saudável — nenhum item encontrado.', en: 'Healthy base — nothing found.' },
    'items':        { pt: ' itens encontrados.', en: ' items found.' },
    'err':          { pt: 'Erro: ', en: 'Error: ' },
    'query_run':    { pt: 'Executando consulta…', en: 'Running query…' },
    'query_empty':  { pt: 'Preencha ao menos um filtro para consultar.', en: 'Fill at least one filter to query.' },
    'query_res':    { pt: ' resultados encontrados.', en: ' results found.' },
    'query_saved':  { pt: 'Consulta salva: ', en: 'Query saved: ' },
    'query_removed':{ pt: 'Consulta removida.', en: 'Query removed.' },
    'save_fail':    { pt: 'Falha ao salvar consultas: ', en: 'Failed to save queries: ' },
    'today':        { pt: 'hoje', en: 'today' },
    'yesterday':    { pt: 'ontem', en: 'yesterday' },
    'days_ago':     { pt: 'há ', en: '' },
    'days_suffix':  { pt: ' dias', en: 'd ago' },
    'ready':        { pt: 'Pronto. Clique em "▶ Escanear" para analisar sua base de conhecimento.', en: 'Ready. Click "▶ Scan" to analyze your knowledge base.' },
};
function kdLang() {
    try {
        var loc = api.getOption ? api.getOption('locale') : '';
        if (loc && String(loc).toLowerCase().indexOf('en') === 0) return 'en';
    } catch (e) {}
    var nav = (navigator.language || '').toLowerCase();
    return nav.indexOf('en') === 0 ? 'en' : 'pt';
}
var KD_LANG = kdLang();
function tr(key) { var e = KD_I18N[key]; return e ? (e[KD_LANG] !== undefined ? e[KD_LANG] : e.pt) : key; }
function kdIcon(emoji) { return '<span aria-hidden="true">' + emoji + '</span>'; }


function injectKDStyles() {
    var el = document.getElementById('kd-styles');
    if (!el) { el = document.createElement('style'); el.id = 'kd-styles'; document.head.appendChild(el); }
    if (el.textContent !== KD_CSS) el.textContent = KD_CSS;
}
injectKDStyles();

(async function () {
    var $root = $container;
    $root.empty().addClass('kd-root');
    (function() {
        try {
            var bg = getComputedStyle(document.documentElement).getPropertyValue('--main-background-color').trim();
            var m = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
            if (m) { var lum = 0.299*parseInt(m[1]) + 0.587*parseInt(m[2]) + 0.114*parseInt(m[3]); $root.attr('data-kd-theme', lum > 140 ? 'light' : 'dark'); }
            else if (bg === '#ffffff' || bg === '#fff' || bg === 'white') $root.attr('data-kd-theme', 'light');
        } catch (e) {}
    })();

    var state = {
        data: { orphans: [], stubs: [], empty: [], todos: [], abandoned: [], pdfs: [], query: [] },
        activeTab: 'orphans',
        search: '',
        scanning: false,
        savedQueries: (function(){ try { var v = JSON.parse(localStorage.getItem('kd_savedQueries') || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } })(),
        queryCols: [],
        selectedQueryIdx: -1
    };

    var TABS = [
        { key: 'orphans',   label: tr('orphans'),   color: '#d97070', icon: '🔴' },
        { key: 'stubs',     label: tr('stubs'),     color: '#c9984a', icon: '🟠' },
        { key: 'empty',     label: tr('empty'),     color: '#9b7ec8', icon: '🟣' },
        { key: 'todos',     label: tr('todos'),     color: '#6b95c4', icon: '🔵' },
        { key: 'abandoned', label: tr('abandoned'), color: '#68a87c', icon: '🟢' },
        { key: 'pdfs',      label: tr('pdfs'),      color: '#e05c5c', icon: '📄' },
        { key: 'query',     label: tr('query'),     color: '#5ca0e0', icon: '🔎' },
    ];

    /* ── Header ─────────────────────────────────────────────── */
    var $header = $('<div class="kd-header">');
    var $titleEl = $('<span class="kd-title">').html(tr('title'));
    var $fsearch = $('<input class="kd-input" type="text" placeholder="' + tr('search_ph') + '" aria-label="' + tr('search_ph') + '">').hide();
    var $btnScan = $('<button class="kd-btn">').text(tr('scan'));
    $header.append($titleEl, $fsearch, $btnScan);

    /* ── Stats bar ──────────────────────────────────────────── */
    var $stats = $('<div class="kd-stats">');
    var $statEls = {};
    TABS.forEach(function(t) {
        var $card = $('<button type="button" class="kd-stat-card">').css({ borderTop: '3px solid ' + t.color, width: '100%' })
            .attr('aria-pressed', 'false').on('click', function() { setTab(t.key); });
        var $num = $('<div class="kd-stat-num">').text('—').css({ color: t.color });
        var $lbl = $('<div class="kd-stat-label">').html(kdIcon(t.icon) + ' ' + t.label);
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
        var $label = $('<label class="kd-qb-label">').text(f.label).attr('for', 'kd-qb-' + f.key);
        var $input;
        if (f.type === 'select') {
            $input = $('<select class="kd-qb-input" id="kd-qb-' + f.key + '">');
            f.options.forEach(function(o) { $input.append($('<option>').val(o).text(o || '(todos)')); });
        } else if (f.type === 'date') {
            $input = $('<input class="kd-qb-input" type="date" id="kd-qb-' + f.key + '">');
        } else {
            $input = $('<input class="kd-qb-input" type="text" id="kd-qb-' + f.key + '">').attr('placeholder', f.placeholder || '');
        }
        $wrap.append($label, $input);
        $qbInputs[f.key] = $input;
        $queryBuilder.append($wrap);
    });
    var $qbWhereWrap = $('<div class="kd-qb-field">').css({ flex: 1, minWidth: '180px' });
    var $qbWhereLabel = $('<label class="kd-qb-label">').text(tr('where_label')).attr('for', 'kd-qb-where');
    var $qbWhere = $('<textarea class="kd-qb-where" rows="1" id="kd-qb-where">').attr('placeholder', tr('where_ph'));
    $qbWhereWrap.append($qbWhereLabel, $qbWhere);
    $queryBuilder.append($qbWhereWrap);
    var $qbBtnExec = $('<button class="kd-btn">').text(tr('exec')).css({ color: '#5ca0e0', fontWeight: 600 });
    var $qbBtnSave = $('<button class="kd-btn kd-btn-ghost">').text(tr('save'));
    var $qbSavedSelect = $('<select class="kd-qb-input">').css({ minWidth: '140px' });
    $qbSavedSelect.append($('<option>').val('-1').text(tr('load')));
    var $qbBtnDel = $('<button class="kd-btn kd-btn-ghost">').text(tr('del')).attr('aria-label', tr('del_aria')).css({ color: '#d97070' }).hide();
    $queryBuilder.append($qbBtnExec, $qbSavedSelect, $qbBtnSave, $qbBtnDel);

    /* ── Tabela ─────────────────────────────────────────────── */
    var $tableWrap = $('<div class="kd-table-wrap">');
    var $table = $('<table class="kd-table">');
    var $thead = $('<thead>');
    var $tbody = $('<tbody>');
    $table.append($thead, $tbody);
    $tableWrap.append($table);

    /* ── Log ────────────────────────────────────────────────── */
    var $log = $('<div class="kd-log" role="status" aria-live="polite">');
    $root.append($header, $stats, $tabBar, $queryBuilder, $tableWrap, $log);

    /* ── Helpers ────────────────────────────────────────────── */
    function log(msg, type) {
        type = type || 'info';
        var c = { ok: '#68a87c', warn: '#c9984a', err: '#d97070', info: 'var(--muted-text-color)' };
        $log.append($('<div class="kd-log-line">').text('[' + new Date().toLocaleTimeString() + '] ' + msg).css({ color: c[type] }));
        $log.scrollTop($log[0].scrollHeight);
    }

    function openNote(noteId) { try { if (api.openTabWithNote) api.openTabWithNote(noteId, true); else if (api.activateNote) api.activateNote(noteId); } catch (e) { console.warn('[KD] openNote falhou:', e); } }
    function daysSince(d) { return kdDaysSince(d); }
    function daysLabel(d) { var n = daysSince(d); if (n === null) return '—'; if (n === 0) return tr('today'); if (n === 1) return tr('yesterday'); return tr('days_ago') + n + tr('days_suffix'); }
    function fmtBytes(b) { return kdFmtBytes(b); }
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

        if (state.scanning) {
            $tbody.append($('<tr>').append($('<td class="kd-empty" colspan="99">').text(tr('scanning'))));
            return;
        }
        if (!items.length) {
            $tbody.append($('<tr>').append($('<td class="kd-empty" colspan="99">').text(tr('none'))));
            return;
        }

        var tabColor = null;
        TABS.forEach(function(t) { if (t.key === tab) tabColor = t.color; });
        if (!tabColor) tabColor = 'var(--main-text-color)';

        items.forEach(function(n, idx) {
            var $row = $('<tr class="kd-row">');

            if (tab === 'query') {
                cols.forEach(function(col, ci) {
                    var val = n[col] !== undefined ? n[col] : '';
                    var $cell;
                    if (col === 'title' || col === 'noteId') {
                        $cell = $('<td class="kd-td">').append(
                            $('<a class="kd-link" href="#">').text(String(val).substring(0, 200)).on('click', function(e) { e.preventDefault(); openNote(n.noteId); })
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

            var $link = $('<a class="kd-link" href="#">').text(n.title || '(sem título)').on('click', function(e) { e.preventDefault(); openNote(n.noteId); });
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
        TABS.forEach(function(t) { $statEls[t.key].$card.css({ boxShadow: t.key === tab ? '0 0 0 2px var(--main-border-color)' : 'none' }).attr('aria-pressed', t.key === tab ? 'true' : 'false'); });
        var isQuery = tab === 'query';
        $fsearch.toggle(!isQuery);
        $queryBuilder.toggle(isQuery);
        if (isQuery) { state.search = ''; $fsearch.val(''); }
        renderTable();
    }

    /* ── Scan ───────────────────────────────────────────────── */
    async function runScan() {
        if (state.scanning) return;
        state.scanning = true;
        $btnScan.text('…').prop('disabled', true);
        state.data.query = [];
        $tbody.empty();
        renderTable();
        log(tr('scan_start'));

        try {
            var selfNoteId = (api.getActiveContextNote && api.getActiveContextNote().noteId) || '';
            var result = await api.runOnBackend(function(selfId) {

                var errors = [];
                function safe(label, sql, fb) { try { return api.sql.getRows(sql); } catch (e) { errors.push(label + ': ' + e.message); return fb !== undefined ? fb : []; } }
                var tableNames = new Set(api.sql.getRows("SELECT name FROM sqlite_master WHERE type='table'").map(function(r) { return r.name; }));
                var NOT_SELF = selfId ? "n.noteId != '" + selfId + "'" : '1=1';
                var NOT_SYSTEM = "(n.noteId NOT LIKE '\\_%' ESCAPE '\\' AND n.noteId != 'root' AND " + NOT_SELF + ")";
                var HAS_CHILDREN = "n.noteId NOT IN (SELECT DISTINCT parentNoteId FROM branches WHERE isDeleted = 0)";
                var NOT_PROTECTED = "n.isProtected = 0";
                var NOT_ARCHIVED = "n.noteId NOT IN (SELECT noteId FROM attributes WHERE name = 'archived' AND isDeleted = 0)";
                var USER_TYPES = "n.type IN (" + kdSqlList(['text', 'code']) + ")";
                var BASE = "n.isDeleted = 0 AND " + NOT_SYSTEM + " AND " + NOT_PROTECTED + " AND " + NOT_ARCHIVED + " AND " + USER_TYPES;
                var _tables = [...tableNames].sort();

                /* ① Órfãs */
                var orphans = [];
                var linksTable = ['note_links','links','internal_links','note_link'].find(function(t) { return tableNames.has(t); });
                var linksCol = null;
                if (linksTable) {
                    try {
                        var cols = api.sql.getRows("PRAGMA table_info(" + linksTable + ")").map(function(r) { return r.name; });
                        linksCol = cols.indexOf('targetNoteId') >= 0 ? 'targetNoteId' : cols.indexOf('noteId_to') >= 0 ? 'noteId_to' : cols.indexOf('targetId') >= 0 ? 'targetId' : null;
                    } catch (e) { errors.push('links: ' + e.message); }
                }
                if (linksTable && linksCol) {
                    var delWhere = (function(){ try { return api.sql.getRows("PRAGMA table_info(" + linksTable + ")").map(function(r) { return r.name; }).indexOf('isDeleted') >= 0 ? 'WHERE isDeleted = 0' : ''; } catch (e) { return ''; } })();
                    orphans = safe('orphans', "SELECT n.noteId,n.title,n.type,n.dateModified FROM notes n WHERE " + BASE + " AND n.type NOT IN ('search','launcher','book') AND n.noteId NOT IN (SELECT DISTINCT " + linksCol + " FROM " + linksTable + " " + delWhere + ") ORDER BY n.dateModified ASC LIMIT 200", []);
                } else {
                    if (linksTable) errors.push('orphans: tabela ' + linksTable + ' sem coluna alvo reconhecida — usando fallback de relations');
                    orphans = safe('orphans', "SELECT n.noteId,n.title,n.type,n.dateModified FROM notes n WHERE " + BASE + " AND n.type NOT IN ('search','launcher','book') AND n.noteId NOT IN (SELECT DISTINCT value FROM attributes WHERE type = 'relation' AND isDeleted = 0 AND value != '') ORDER BY n.dateModified ASC LIMIT 200", []);
                }

                /* ② Stubs */
                var stubs = safe('stubs', "SELECT n.noteId,n.title,n.type,n.dateModified,LENGTH(b.content) AS contentLen FROM notes n JOIN blobs b ON n.blobId = b.blobId WHERE " + BASE + " AND " + HAS_CHILDREN + " AND LENGTH(b.content) BETWEEN 1 AND 250 ORDER BY LENGTH(b.content) ASC LIMIT 150", []);

                /* ③ Vazias */
                var empty = safe('empty', "SELECT n.noteId,n.title,n.type,n.dateModified FROM notes n LEFT JOIN blobs b ON n.blobId = b.blobId WHERE " + BASE + " AND " + HAS_CHILDREN + " AND (b.content IS NULL OR TRIM(b.content) = '' OR b.content = '<p></p>' OR b.content = '<p><br></p>' OR b.content = '<p><br class=\"ProseMirror-trailingBreak\"></p>') ORDER BY n.dateModified DESC LIMIT 150", []);

                /* ④ TODOs antigos */
                var todos = safe('todos', "SELECT DISTINCT n.noteId,n.title,n.type,n.dateModified,a.name AS todoLabel FROM notes n JOIN attributes a ON n.noteId = a.noteId AND a.isDeleted = 0 WHERE " + BASE + " AND LOWER(a.name) LIKE '%todo%' AND CAST((julianday('now') - julianday(n.dateModified)) AS INTEGER) > 30 ORDER BY n.dateModified ASC LIMIT 150", []);

                /* ⑤ Abandonadas */
                var abandoned = safe('abandoned', "SELECT n.noteId,n.title,n.type,n.dateModified FROM notes n WHERE " + BASE + " AND " + HAS_CHILDREN + " AND CAST((julianday('now') - julianday(n.dateModified)) AS INTEGER) > 90 ORDER BY n.dateModified ASC LIMIT 150", []);

                /* ⑥ PDFs */
                var pdfs = safe('pdfs', "SELECT n.noteId,n.title,n.dateModified,LENGTH(b.content) AS fileSize FROM notes n JOIN blobs b ON n.blobId = b.blobId WHERE n.isDeleted = 0 AND " + NOT_SYSTEM + " AND " + NOT_PROTECTED + " AND n.noteId NOT IN (SELECT noteId FROM attributes WHERE name = 'archived' AND isDeleted = 0) AND n.type = 'file' AND (LOWER(n.mime) = 'application/pdf' OR LOWER(n.title) LIKE '%.pdf') ORDER BY n.dateModified DESC LIMIT 200", []);

                var typeCounts = safe('typeCounts', "SELECT type,COUNT(*) AS cnt FROM notes WHERE isDeleted = 0 GROUP BY type ORDER BY cnt DESC LIMIT 20", []);

                return { orphans: orphans, stubs: stubs, empty: empty, todos: todos, abandoned: abandoned, pdfs: pdfs, _tables: _tables, typeCounts: typeCounts, errors: errors };
            }, [selfNoteId]);

            state.data = result;
            if (result.errors && result.errors.length) result.errors.forEach(function(e) { log('Erro: ' + e, 'err'); });
            if (result._tables && result._tables.length) log(tr('tables') + result._tables.join(', '));
            if (result.typeCounts && result.typeCounts.length) log(tr('by_type') + result.typeCounts.map(function(r) { return r.type + '=' + r.cnt; }).join(', '), 'info');

            TABS.forEach(function(t) { if (t.key !== 'query') $statEls[t.key].$num.text(state.data[t.key].length); });
            $stats.css({ display: 'grid' });
            $tabBar.css({ display: 'flex' });
            $fsearch.show();

            var total = kdCountTotal(result);
            log(total === 0 ? tr('healthy') : total + tr('items'), total === 0 ? 'ok' : 'warn');
            setTab(state.activeTab);
        } catch (err) {
            log(tr('err') + err.message, 'err'); console.error(err);
            $tbody.empty();
            $tbody.append($('<tr>').append($('<td class="kd-empty" colspan="99" role="alert">').text(tr('err') + err.message)));
        }
        finally { state.scanning = false; $btnScan.text(tr('scan')).prop('disabled', false); }
    }

    /* ── Query Builder ──────────────────────────────────────── */
    async function runQuery() {
        var type = $qbInputs.noteType.val();
        var label = $qbInputs.labelName.val().trim();
        var val = $qbInputs.labelValue.val().trim();
        var from = $qbInputs.dateFrom.val();
        var to = $qbInputs.dateTo.val();
        var custom = $qbWhere.val().trim();

        if (!type && !label && !from && !to && !custom) { log(tr('query_empty'), 'warn'); return; }

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

        log(tr('query_run'));
        state.queryCols = ['noteId', 'title', 'type', 'dateCreated', 'dateModified'];

        try {
            var rows = await api.runOnBackend(function(sql) { return api.sql.getRows(sql); }, [sql]);
            state.data.query = rows;
            log(rows.length + tr('query_res'), rows.length ? 'ok' : 'info');
            $statEls.query.$num.text(rows.length);
            renderTable();
        } catch (err) {
            log(tr('err') + err.message, 'err'); console.error(err);
            $tbody.empty();
            $tbody.append($('<tr>').append($('<td class="kd-empty" colspan="99" role="alert">').text(tr('err') + err.message)));
        }
    }

    /* ── Salvar / Carregar queries ──────────────────────────── */
    function saveQueries() { try { localStorage.setItem('kd_savedQueries', JSON.stringify(state.savedQueries)); } catch (e) { log('Falha ao salvar consultas: ' + e.message, 'err'); } }
    function rebuildSavedSelect() {
        $qbSavedSelect.empty();
        $qbSavedSelect.append($('<option>').val('-1').text(tr('load')));
        state.savedQueries.forEach(function(q, i) { $qbSavedSelect.append($('<option>').val(i).text(q.name || ('Consulta #' + (i + 1)))); });
    }
    function saveCurrentQuery() {
        var $nameWrap = $('<div class="kd-qb-save">');
        var $nameInput = $('<input class="kd-qb-input" type="text" id="kd-qb-name">').attr('placeholder', 'Nome…');
        var $nameOk = $('<button class="kd-btn">').text('Salvar');
        var $nameCancel = $('<button class="kd-btn kd-btn-ghost">').text('✕').attr('aria-label', 'Cancelar');
        var nomear = function() {
            var name = $nameInput.val().trim();
            if (!name) return;
            $nameWrap.remove();
            state.savedQueries.push({ name: name, type: $qbInputs.noteType.val(), label: $qbInputs.labelName.val().trim(), value: $qbInputs.labelValue.val().trim(), from: $qbInputs.dateFrom.val(), to: $qbInputs.dateTo.val(), where: $qbWhere.val().trim() });
            saveQueries(); rebuildSavedSelect(); $qbSavedSelect.val(state.savedQueries.length - 1); $qbBtnDel.show(); log(tr('query_saved') + name, 'ok');
        };
        $nameOk.on('click', nomear);
        $nameInput.on('keydown', function(e) { if (e.key === 'Enter') { e.preventDefault(); nomear(); } if (e.key === 'Escape') $nameWrap.remove(); });
        $nameCancel.on('click', function() { $nameWrap.remove(); });
        $nameWrap.append($nameInput, $nameOk, $nameCancel);
        $queryBuilder.append($nameWrap);
        $nameInput.focus();
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
        if ($qbBtnDel.data('armed')) {
            state.savedQueries.splice(state.selectedQueryIdx, 1);
            saveQueries();
            rebuildSavedSelect(); state.selectedQueryIdx = -1; $qbBtnDel.hide().data('armed', false).text(tr('del')); log(tr('query_removed'), 'info');
        } else {
            $qbBtnDel.data('armed', true).text('Confirmar?');
            setTimeout(function() { if ($qbBtnDel.data('armed')) { $qbBtnDel.data('armed', false).text(tr('del')); } }, 4000);
        }
    }

    /* ── Eventos ────────────────────────────────────────────── */
    $btnScan.on('click', runScan);
    $fsearch.on('input', function() { state.search = $(this).val(); renderTable(); });
    $qbBtnExec.on('click', runQuery);
    $qbBtnSave.on('click', saveCurrentQuery);
    $qbBtnDel.on('click', deleteSavedQuery);
    $qbSavedSelect.on('change', function() { var idx = parseInt($(this).val()); if (idx >= 0) loadQuery(idx); });
    rebuildSavedSelect();

    log(tr('ready'));
})();
