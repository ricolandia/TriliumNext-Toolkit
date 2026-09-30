/**
 * Attribute GC — TriliumNext
 * Scans all notes for broken/rare/unused labels & relations.
 *
 * Two modes:
 *   A) Render Note:  JS Frontend (no #widget) → ~renderNote → Render Note (full page)
 *   B) Widget:       JS Frontend + #widget label → right panel
 */

/* ── Tema claro/escuro + reduced-motion ────────────────────── */
(function(){
    try {
        var el = document.getElementById('agc-theme-css');
        if (!el) { el = document.createElement('style'); el.id = 'agc-theme-css'; document.head.appendChild(el); }
        var bg = getComputedStyle(document.documentElement).getPropertyValue('--main-background-color').trim();
        var light = false;
        var m = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (m) { var lum = 0.299*parseInt(m[1]) + 0.587*parseInt(m[2]) + 0.114*parseInt(m[3]); light = lum > 140; }
        else if (bg === '#ffffff' || bg === '#fff' || bg === 'white') light = true;
        var css = light
            ? ':root{--agc-danger:#b03a3a;--agc-warn:#8a6d1f;--agc-info:#7a6aa8;--agc-blue:#5a6a9e;--agc-success:#3f7d54;}'
            : ':root{--agc-danger:#f08787;--agc-warn:#e3b56a;--agc-info:#b8a3e8;--agc-blue:#a3b8e8;--agc-success:#8ad6a0;}';
        css += '@media (prefers-reduced-motion: reduce){.agc-move{transition:none!important}}';
        if (el.textContent !== css) el.textContent = css;
    } catch (e) {}
})();

const PROT = new Set([
    'template','workspace','iconClass','cssClass','run','runOnInstance','runAtStartup',
    'shareAlias','shareHiddenFromTree','archived','pinned','bookmarked','weight','color',
    'renderNote','child','runOnNoteCreation','noteType','mime','shareCss','shareJs',
    'shareRaw','shareDisallowRobotIndexing','keyboardShortcut','label','relation',
    'promoted','multiplicity','labelDefinition','relationDefinition','toc','readOnly',
    'excludeFromExport','appCss','appTheme','sorted','sortDirection','sortFoldersFirst',
    'top','hide','hidePromotedAttributes','disableVersioning','calendarRoot','dateNote',
    'datePattern','inbox','sqlConsole','searchHome','hoistedNote','similarNotes',
    'versioningLimit','mapRootNoteId','system','root',
    'cover','widget',
]);

const TEMP_RE = /^(temp|tmp|teste?|test|rascunho|draft|bak|backup|lixo|trash|xxx|zzz|abc|foo|bar|qwe|asd|asdf)[_\-0-9]*$/i;

/* ── i18n PT/EN ─────────────────────────────────────────────── */
var AG_I18N = {
    'scan':       { pt: '▶ Escanear', en: '▶ Scan' },
    'dryrun':     { pt: ' Dry Run', en: ' Dry Run' },
    'dryrun_b':   { pt: 'Dry Run ativo. Desative para executar limpeza real.', en: 'Dry Run active. Disable it to run a real cleanup.' },
    'stats':      { pt: ['Atributos','Quebrados','Raros','Sem uso','Similares'], en: ['Attributes','Broken','Rare','Unused','Similar'] },
    'f_all':      { pt: 'Todos', en: 'All' },
    'f_broken':   { pt: 'Quebrados', en: 'Broken' },
    'f_rare':     { pt: 'Raros', en: 'Rare' },
    'f_unused':   { pt: 'Sem uso', en: 'Unused' },
    'f_sys':      { pt: 'Sistema', en: 'System' },
    'f_ok':       { pt: 'Saudáveis', en: 'Healthy' },
    'search_ph':  { pt: 'Buscar…', en: 'Search…' },
    'search_ar':  { pt: 'Buscar atributos', en: 'Search attributes' },
    'th_name':    { pt: 'Nome', en: 'Name' },
    'th_type':    { pt: 'Tipo', en: 'Type' },
    'th_count':   { pt: 'Usos', en: 'Uses' },
    'th_status':  { pt: 'Status', en: 'Status' },
    'th_act':     { pt: 'Ações', en: 'Actions' },
    'sel_all':    { pt: 'Selecionar todos os visíveis', en: 'Select all visible' },
    'sel_row':    { pt: 'Selecionar ', en: 'Select ' },
    'sel_all_btn':{ pt: 'Auto-selecionar', en: 'Auto-select' },
    'exec_btn':   { pt: 'Executar limpeza', en: 'Run cleanup' },
    'exec_btn_go':{ pt: '…', en: '…' },
    'keep':       { pt: 'manter', en: 'keep' },
    'preview':    { pt: 'preview', en: 'preview' },
    'remove':     { pt: 'remover', en: 'remove' },
    'protected':  { pt: 'protegido', en: 'protected' },
    'sim_group':  { pt: 'Grupos Similares', en: 'Similar Groups' },
    'none':       { pt: 'Nenhum resultado', en: 'No results' },
    'selinfo':    { pt: ' selecionados · ', en: ' selected · ' },
    'visible':    { pt: ' visíveis', en: ' visible' },
    'scanning':   { pt: 'Escaneando…', en: 'Scanning…' },
    'scan_ok':    { pt: ' grupos.', en: ' groups.' },
    'scan_debt':  { pt: ' quebrados, ', en: ' broken, ' },
    'scan_debt2': { pt: ' raros, ', en: ' rare, ' },
    'scan_debt3': { pt: ' sem uso.', en: ' unused.' },
    'healthy':    { pt: 'Base saudável!', en: 'Healthy base!' },
    'err':        { pt: 'Erro: ', en: 'Error: ' },
    'dry_remove': { pt: '[DRY RUN] Removeria: ', en: '[DRY RUN] Would remove: ' },
    'removing':   { pt: 'Removendo ', en: 'Removing ' },
    'attr_s':     { pt: ' atributo(s)…', en: ' attribute(s)…' },
    'removed':    { pt: ' instância(s) removidas.', en: ' instance(s) removed.' },
    'confirm_t':  { pt: 'Remover PERMANENTEMENTE ', en: 'PERMANENTLY remove ' },
    'confirm_t2': { pt: ' atributo(s)? Esta operação modifica o banco de dados.', en: ' attribute(s)? This modifies the database.' },
    'confirm_s1': { pt: 'Remover PERMANENTEMENTE o atributo "', en: 'PERMANENTLY remove attribute "' },
    'confirm_s2': { pt: '"?', en: '"? ' },
    'confirm_ok': { pt: 'Sim, remover', en: 'Yes, remove' },
    'confirm_no': { pt: 'Cancelar', en: 'Cancel' },
    'confirm_bo': { pt: '… (mais registros omitidos)', en: '… (more entries omitted)' },
    'broken_sfx': { pt: ' quebradas)', en: ' broken)' },
    'p_sys':      { pt: 'sistema', en: 'system' },
    'p_broken':   { pt: 'quebrado', en: 'broken' },
    'p_rare':     { pt: 'raro', en: 'rare' },
    'p_unused':   { pt: 'sem uso', en: 'unused' },
    'p_ok':       { pt: 'saudável', en: 'healthy' },
};
function agLang() {
    try {
        var loc = api.getOption ? api.getOption('locale') : '';
        if (loc && String(loc).toLowerCase().indexOf('en') === 0) return 'en';
    } catch (e) {}
    var nav = (navigator.language || '').toLowerCase();
    return nav.indexOf('en') === 0 ? 'en' : 'pt';
}
var AG_LANG = agLang();
function agTr(key, i) {
    var e = AG_I18N[key];
    if (!e) return key;
    if (Array.isArray(e[AG_LANG])) return e[AG_LANG][i] !== undefined ? e[AG_LANG][i] : e.pt[i];
    return e[AG_LANG] !== undefined ? e[AG_LANG] : e.pt;
}
function agTrArr(key) {
    var e = AG_I18N[key];
    if (!e) return [];
    return Array.isArray(e[AG_LANG]) ? e[AG_LANG] : (e.pt || []);
}


function classify(name, type, count, bc) {
    if (!name) return 'ok';
    if (PROT.has(name) || PROT.has(name.toLowerCase())) return 'sys';
    if (type === 'relation' && bc > 0) return 'broken';
    if (count === 0) return 'unused';
    if (count <= 2 || (count <= 5 && TEMP_RE.test(name))) return 'rare';
    return 'ok';
}

function lev(a, b) {
    const m = a.length, n = b.length;
    if (m === 0) return n; if (n === 0) return m;
    let prev = Array.from({length: n+1}, (_,j) => j);
    for (let i=1;i<=m;i++) {
        const cur = [i];
        for (let j=1;j<=n;j++)
            cur[j] = a[i-1]===b[j-1] ? prev[j-1] : 1+Math.min(prev[j], cur[j-1], prev[j-1]);
        prev = cur;
    }
    return prev[n];
}

function findDupes(attrs) {
    const items = attrs.filter(a => a.status !== 'sys').map(a => ({ name: a.name, type: a.type }));
    const names = items.map(a => a.name);
    const groups = [], visited = new Set();
    for (let i=0;i<names.length;i++) {
        if (visited.has(names[i])) continue;
        const g = [names[i]], na = names[i].toLowerCase().normalize('NFD').replace(/[_\-\s]/g,'').replace(/[\u0300-\u036f]/g,'');
        for (let j=i+1;j<names.length;j++) {
            if (visited.has(names[j])) continue;
            const nb = names[j].toLowerCase().normalize('NFD').replace(/[_\-\s]/g,'').replace(/[\u0300-\u036f]/g,'');
            const d = lev(na, nb);
            if (d<=2 && Math.max(na.length,nb.length)>3 && d < Math.max(na.length,nb.length)*0.45 && items[i].type === items[j].type) {
                g.push(names[j]); visited.add(names[j]);
            }
        }
        if (g.length>1) { visited.add(names[i]); groups.push(g); }
        if (groups.length>=15) break;
    }
    return groups;
}

/* ── Detect context: widget vs render note ────────── */
const IS_RENDER = typeof $container !== 'undefined' && $container;

if (IS_RENDER) {
    /* ══════════════════════════════════════════════════════
       MODE A: Render Note (full page via ~renderNote)
       ══════════════════════════════════════════════════════ */
    (async function () {
        const $root = $container;
        $root.css({ display:'flex',flexDirection:'column',height:'100%',fontFamily:'var(--detail-font-family,"Segoe UI",sans-serif)',fontSize:'12px',color:'var(--main-text-color)',background:'var(--main-background-color)',overflow:'hidden' });
        const state = { _allAttrs:[],_visible:[],_selected:new Set(),_sortKey:'count',_sortDir:1,_curFilter:'all',_dryRun:true,_scanning:false };
        buildUI($root, state);
    })();

} else {
    /* ══════════════════════════════════════════════════════
       MODE B: Right-panel widget (#widget)
       ══════════════════════════════════════════════════════ */
    class AttributeGCWidget extends api.RightPanelWidget {
        get position() { return 2; }
        get parentWidget() { return 'right-pane'; }
        get widgetTitle() { return AG_LANG === 'en' ? 'Attribute GC' : 'Attribute GC'; }
        isEnabled() { return super.isEnabled() && !!this.note; }

        _allAttrs = []; _visible = []; _selected = new Set();
        _sortKey = 'count'; _sortDir = 1; _curFilter = 'all';
        _dryRun = true; _scanning = false;

        doRenderBody() {
            this.$body.empty().css({ padding:0,overflow:'hidden',display:'flex',flexDirection:'column',height:'100%' });
            const $root = $('<div>').css({ display:'flex',flexDirection:'column',height:'100%',fontSize:'11.5px',fontFamily:'var(--detail-font-family,"Segoe UI",sans-serif)',color:'var(--main-text-color)',background:'var(--main-background-color)' });
            buildUI($root, this);
            this.$body.append($root);
        }

        _log(msg, t) { this._widgetLog.show().append($('<div>').text('['+new Date().toLocaleTimeString()+'] '+msg).css({color:{ok:'var(--agc-success,#68a87c)',warn:'var(--agc-warn,#c9984a)',err:'var(--agc-danger,#d97070)',info:'var(--muted-text-color)'}[t||'info'],marginBottom:'1px'})); this._widgetLog.scrollTop(this._widgetLog[0].scrollHeight); }
        _updateFooter() {
            this._$selInfo.html('<strong>'+this._selected.size+'</strong>'+agTr('selinfo')+'<strong>'+this._visible.length+'</strong>'+agTr('visible'));
            this._$execBtn.prop('disabled', this._selected.size === 0);
        }
    }
    module.exports = new AttributeGCWidget();
}

/* ══════════════════════════════════════════════════════
   SHARED UI BUILDER
   ══════════════════════════════════════════════════════ */
function buildUI($root, ctx) {
    const isWidget = !IS_RENDER;
    const fs = isWidget ? '11.5px' : '13px';

    const $toolbar = $('<div>').css({ display:'flex',alignItems:'center',gap:'10px',padding:isWidget?'6px 8px':'10px 14px',borderBottom:'1px solid var(--main-border-color)',flexShrink:0 });
    const $btnScan = $('<button type="button">').text(agTr('scan')).css({ padding:isWidget?'4px 10px':'6px 16px',cursor:'pointer',borderRadius:'4px',fontSize:isWidget?'11px':fs,background:'var(--accented-background-color)',color:'var(--main-text-color)',border:'1px solid var(--main-border-color)',fontWeight:500 });
    const $lblDry = $('<label>').css({ display:'flex',alignItems:'center',gap:'5px',cursor:'pointer',fontSize:isWidget?'11px':fs,color:'var(--muted-text-color)' });
    const $chkDry = $('<input type="checkbox">').prop('checked', true).attr('aria-label', agTr('dryrun'));
    $lblDry.append($chkDry, $('<span>').text(agTr('dryrun')));
    $toolbar.append($btnScan, $lblDry, $('<span>').css({flex:1}));

    const $banner = $('<div>').css({ padding:isWidget?'4px 8px':'6px 14px',margin:isWidget?'4px 6px':'6px 14px',borderRadius:'4px',background:'rgba(201,152,74,.08)',border:'1px solid rgba(201,152,74,.2)',color:'var(--agc-warn,#c9984a)',fontSize:isWidget?'10px':'11px',flexShrink:0 }).html('<strong>' + agTr('dryrun_b') + '</strong>');

    const $stats = $('<div>').css({ display:'none',gridTemplateColumns:'repeat(5,1fr)',gap:isWidget?'3px':'6px',padding:isWidget?'4px 6px':'10px 14px',flexShrink:0 });
    ['total','broken','rare','unused','dupes'].forEach((k,i) => {
        const cols = ['var(--agc-success,#4a9)','var(--agc-danger,#d97070)','var(--agc-warn,#c9984a)','var(--agc-info,#9b7ec8)','var(--agc-blue,#6b95c4)'];
        const labels = agTrArr('stats');
        const $s = $('<div>').css({ textAlign:'center',padding:isWidget?'5px 2px':'8px 4px',borderRadius:'4px',background:'var(--accented-background-color)',borderTop:'2px solid '+cols[i] });
        $s.append($('<div>').css({fontSize:isWidget?'18px':'24px',fontWeight:600}).attr('id','ags-'+k), $('<div>').css({fontSize:isWidget?'8px':'9px',color:'var(--muted-text-color)',textTransform:'uppercase',letterSpacing:'.04em'}).text(labels[i]));
        $stats.append($s);
    });

    const $fbar = $('<div>').css({ display:'none',gap:isWidget?'3px':'5px',padding:isWidget?'0 6px 4px':'0 14px 6px',flexWrap:'wrap',flexShrink:0 });
    ['all','broken','rare','unused','sys','ok'].forEach(f => {
        const lb = {all:agTr('f_all'),broken:agTr('f_broken'),rare:agTr('f_rare'),unused:agTr('f_unused'),sys:agTr('f_sys'),ok:agTr('f_ok')};
        const $b = $('<button type="button" data-filter="'+f+'">').text(lb[f]).attr('aria-pressed', f==='all'?'true':'false').css({ padding:isWidget?'2px 7px':'3px 10px',borderRadius:isWidget?'10px':'14px',border:'1px solid var(--main-border-color)',background:f==='all'?'var(--accented-background-color)':'transparent',color:f==='all'?'var(--main-text-color)':'var(--muted-text-color)',cursor:'pointer',fontSize:isWidget?'9.5px':'10.5px' });
        $b.on('click', () => { ctx._curFilter = f; applyUIFilters(); });
        $fbar.append($b);
    });
    const $fsearch = $('<input type="text" placeholder="'+agTr('search_ph')+'" aria-label="'+agTr('search_ar')+'">').css({ marginLeft:'auto',padding:isWidget?'2px 6px':'3px 8px',border:'1px solid var(--main-border-color)',borderRadius:'4px',background:'var(--accented-background-color)',color:'var(--main-text-color)',fontSize:isWidget?'10px':'11px',width:isWidget?'100px':'140px',outline:'none' }).on('input', applyUIFilters);
    $fbar.append($fsearch);

    const $tblWrap = $('<div>').css({ display:'none',overflow:'auto',flex:1,padding:isWidget?'0 6px':'0 14px' });
    const $table = $('<table>').css({ width:'100%',borderCollapse:'collapse' });
    const $thead = $('<thead>').css({ position:'sticky',top:0,zIndex:1,background:'var(--main-background-color)' });
    $thead.append($('<tr>').append(
        $('<th scope="col" style="width:20px">').append($('<input type="checkbox" id="agc-selall" aria-label="'+agTr('sel_all')+'">')),
        $('<th scope="col">').text(agTr('th_name')).css({cursor:'pointer',fontSize:isWidget?'9px':'10px',color:'var(--muted-text-color)',textTransform:'uppercase',letterSpacing:'.06em',padding:isWidget?'5px 6px':'6px 8px'}).on('click',()=>{ctx._sortKey='name';ctx._sortDir*=-1;applyUIFilters();}),
        $('<th scope="col">').text(agTr('th_type')).css({fontSize:isWidget?'9px':'10px',color:'var(--muted-text-color)',textTransform:'uppercase',letterSpacing:'.06em',padding:isWidget?'5px 6px':'6px 8px'}),
        $('<th scope="col" style="text-align:right">').text(agTr('th_count')).css({cursor:'pointer',fontSize:isWidget?'9px':'10px',color:'var(--muted-text-color)',textTransform:'uppercase',letterSpacing:'.06em',padding:isWidget?'5px 6px':'6px 8px'}).on('click',()=>{ctx._sortKey='count';ctx._sortDir*=-1;applyUIFilters();}),
        $('<th scope="col">').text(agTr('th_status')).css({fontSize:isWidget?'9px':'10px',color:'var(--muted-text-color)',textTransform:'uppercase',letterSpacing:'.06em',padding:isWidget?'5px 6px':'6px 8px'}),
        $('<th scope="col" style="text-align:right">').text(agTr('th_act')).css({fontSize:isWidget?'9px':'10px',color:'var(--muted-text-color)',textTransform:'uppercase',letterSpacing:'.06em',padding:isWidget?'5px 6px':'6px 8px'}),
    ));
    $table.append($thead, $('<tbody id="agc-tbody">'));
    $tblWrap.append($table);

    const $footer = $('<div>').css({ display:'none',alignItems:'center',gap:isWidget?'6px':'10px',padding:isWidget?'5px 6px':'8px 14px',borderTop:'1px solid var(--main-border-color)',flexShrink:0 });
    const $selInfo = $('<span>').css({ fontSize:isWidget?'10px':'11px',color:'var(--muted-text-color)',flex:1 });
    const $execBtn = $('<button type="button">').text(agTr('exec_btn')).css({ padding:isWidget?'3px 10px':'5px 14px',cursor:'pointer',borderRadius:'4px',fontSize:isWidget?'10px':'12px',fontWeight:500,background:'rgba(217,112,112,.1)',color:'#d97070',border:'1px solid rgba(217,112,112,.25)' }).prop('disabled',true);
    $footer.append(
        $selInfo,
        $('<button type="button">').text(agTr('sel_all_btn')).css({ padding:isWidget?'3px 8px':'5px 12px',cursor:'pointer',borderRadius:'4px',fontSize:isWidget?'10px':'12px',background:'var(--accented-background-color)',color:'var(--muted-text-color)',border:'1px solid var(--main-border-color)' }).on('click', selectSuggested),
        $execBtn,
    );

    const $dupes = $('<div>').css({ display:'none',padding:isWidget?'0 6px 6px':'0 14px 8px',flexShrink:0 });
    const $log = $('<div role="status" aria-live="polite">').css({ display:'none',maxHeight:isWidget?'90px':'120px',overflowY:'auto',padding:isWidget?'3px 6px':'4px 14px',borderTop:'1px solid var(--main-border-color)',fontSize:isWidget?'9.5px':'10px',color:'var(--muted-text-color)',flexShrink:0 });

    $root.append($toolbar, $banner, $stats, $fbar, $tblWrap, $footer, $dupes, $log);

    // Store refs on context
    ctx._$btnScan = $btnScan; ctx._$chkDry = $chkDry; ctx._$banner = $banner;
    ctx._$stats = $stats; ctx._$fbar = $fbar; ctx._$fsearch = $fsearch;
    ctx._$tblWrap = $tblWrap; ctx._$selInfo = $selInfo; ctx._$execBtn = $execBtn;
    ctx._$dupes = $dupes; ctx._$log = $log;
    ctx._$footer = $footer;

    // Events
    $btnScan.on('click', () => runScan());
    $chkDry.on('change', function() { ctx._dryRun = this.checked; $banner.toggle(ctx._dryRun); renderTable(); });
    $('#agc-selall').on('change', function() {
        $('#agc-tbody input[type="checkbox"]').each((_,cb) => {
            const k = $(cb).data('key');
            this.checked ? ctx._selected.add(k) : ctx._selected.delete(k);
            cb.checked = this.checked;
        });
        updateFooter();
    });


    /* ── CONFIRMAÇÃO (modal próprio — confirm() não funciona em iframe sandboxed) ── */
    function confirmAgc(msg, onOk) {
        var $ov = $('<div>').css({ position:'fixed', inset:0, zIndex:10000, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,.45)', padding:'10px' });
        var $box = $('<div>').css({ background:'var(--main-background-color)', color:'var(--main-text-color)', border:'1px solid var(--main-border-color)', borderRadius:'8px', padding:'16px', maxWidth:'420px', width:'100%', boxShadow:'0 8px 24px rgba(0,0,0,.25)' });
        $box.append($('<div>').css({ fontSize:isWidget?'12px':'14px', fontWeight:600, marginBottom:'8px' }).text(msg));
        var $ok = $('<button type="button">').text(agTr('confirm_ok')).css({ padding:isWidget?'6px 12px':'8px 16px', marginRight:'8px', borderRadius:'4px', cursor:'pointer', background:'rgba(217,112,112,.15)', color:'#d97070', border:'1px solid rgba(217,112,112,.3)' });
        var $no = $('<button type="button">').text(agTr('confirm_no')).css({ padding:isWidget?'6px 12px':'8px 16px', borderRadius:'4px', cursor:'pointer', background:'var(--accented-background-color)', color:'var(--main-text-color)', border:'1px solid var(--main-border-color)' });
        $box.append($ok, $no);
        $ov.append($box);
        $('body').append($ov);
        var fechar = function() { $ov.remove(); };
        $ok.on('click', function() { fechar(); onOk(); });
        $no.on('click', fechar);
        $ov.on('click', function(e) { if (e.target === $ov[0]) fechar(); });
        $ok.focus();
    }

    /* ── LOG ──────────────────────────────────── */
    function log(msg, t) {
        t = t || 'info';
        const colors = { ok:'var(--agc-success,#68a87c)', warn:'var(--agc-warn,#c9984a)', err:'var(--agc-danger,#d97070)', info:'var(--muted-text-color)' };
        $log.show().append($('<div>').text('['+new Date().toLocaleTimeString()+'] '+msg).css({ color:colors[t], marginBottom:'1px' }));
        $log.scrollTop($log[0].scrollHeight);
    }

    /* ── SCAN ─────────────────────────────────── */
    async function runScan() {
        if (ctx._scanning) return;
        ctx._scanning = true;
        $btnScan.text(agTr('exec_btn_go')).prop('disabled', true);
        $log.empty().show();
        $('#agc-tbody').empty().append($('<tr>').append($('<td colspan="6">').css({textAlign:'center',padding:'20px',color:'var(--muted-text-color)',fontStyle:'italic'}).text(agTr('scanning'))));
        log(agTr('scanning'));

        try {
            const data = await api.runOnBackend(() => {
                const groups = api.sql.getRows(`SELECT a.name, a.type, COUNT(*) AS count FROM attributes a INNER JOIN notes n ON a.noteId = n.noteId WHERE a.isDeleted = 0 AND n.isDeleted = 0 GROUP BY a.name, a.type ORDER BY count ASC, a.name`);
                const broken = api.sql.getRows(`SELECT a.name, COUNT(*) AS bc FROM attributes a INNER JOIN notes n ON a.noteId = n.noteId LEFT JOIN notes t ON a.value = t.noteId WHERE a.type = 'relation' AND a.isDeleted = 0 AND n.isDeleted = 0 AND (t.noteId IS NULL OR t.isDeleted = 1) GROUP BY a.name`);
                const bMap = {}; for (const r of broken) bMap[r.name + '::' + r.type] = r.bc;
                return { groups, bMap };
            });

            ctx._allAttrs = data.groups.map(r => {
                const bc = data.bMap[r.name + '::' + r.type] || 0;
                return {
                    name: r.name, type: r.type, count: r.count, bc: bc,
                    status: classify(r.name, r.type, r.count, bc),
                    prot: PROT.has(r.name) || PROT.has(r.name.toLowerCase()),
                };
            });

            const b = ctx._allAttrs.filter(a => a.status === 'broken').length;
            const r = ctx._allAttrs.filter(a => a.status === 'rare').length;
            const u = ctx._allAttrs.filter(a => a.status === 'unused').length;
            const d = findDupes(ctx._allAttrs);

            $('#ags-total').text(ctx._allAttrs.length); $('#ags-broken').text(b);
            $('#ags-rare').text(r); $('#ags-unused').text(u); $('#ags-dupes').text(d.length);

            $stats.show(); $fbar.show(); $tblWrap.show(); $footer.show();

            $dupes.empty();
            if (d.length) {
                $dupes.show().append($('<div>').css({ fontSize:isWidget?'9px':'10px',color:'var(--muted-text-color)',fontWeight:600,marginBottom:'3px' }).text(agTr('sim_group')));
                d.forEach(g => {
                    const $dg = $('<div>').css({ display:'flex',gap:'3px',flexWrap:'wrap',marginBottom:'2px' });
                    g.forEach((n,i) => { $dg.append($('<span>').text(n).css({ background:'var(--accented-background-color)',padding:'1px 4px',borderRadius:'2px',fontSize:isWidget?'9px':'10px',border:'1px solid var(--main-border-color)' })); if (i<g.length-1) $dg.append($('<span>').text('≈').css({color:'var(--muted-text-color)',fontSize:isWidget?'9px':'10px'})); });
                    $dupes.append($dg);
                });
            } else $dupes.hide();

            ctx._curFilter = 'all'; ctx._sortKey = 'count'; ctx._sortDir = 1; applyUIFilters();
            log('Scan: '+ctx._allAttrs.length+agTr('scan_ok'), 'ok');
            if (b+r+u>0) log(b+agTr('scan_debt')+r+agTr('scan_debt2')+u+agTr('scan_debt3'), 'warn');
            else log(agTr('healthy'), 'ok');
        } catch(err) {
            log(agTr('err')+err.message, 'err');
            $('#agc-tbody').empty().append($('<tr>').append($('<td colspan="6" role="alert">').css({textAlign:'center',padding:'20px',color:'var(--agc-danger,#d97070)'}).text(agTr('err')+err.message)));
        }
        finally { ctx._scanning = false; $btnScan.text(agTr('scan')).prop('disabled', false); }
    }

    /* ── FILTERS ──────────────────────────────── */
    function applyUIFilters() {
        const srch = ($fsearch.val() || '').toLowerCase();
        ctx._visible = ctx._allAttrs.filter(a => {
            if (srch && !a.name.toLowerCase().includes(srch)) return false;
            return ctx._curFilter === 'all' ? true : a.status === ctx._curFilter;
        });
        ctx._visible.sort((a,b)=>{
            let va=a[ctx._sortKey],vb=b[ctx._sortKey];
            if(typeof va==='string'){va=va.toLowerCase();vb=vb.toLowerCase();}
            return ctx._sortDir*(va<vb?-1:va>vb?1:0);
        });
        $fbar.find('button').each(function(){
            const m=$(this).attr('data-filter')===ctx._curFilter;
            $(this).attr('aria-pressed', m?'true':'false').css({background:m?'var(--accented-background-color)':'transparent',color:m?'var(--main-text-color)':'var(--muted-text-color)'});
        });
        renderTable(); updateFooter();
    }

    /* ── TABLE ────────────────────────────────── */
    function renderTable() {
        const $tbody = $('#agc-tbody').empty();
        if (!ctx._visible || !ctx._visible.length) {
            $tbody.append($('<tr>').append($('<td colspan="6">').css({textAlign:'center',padding:'20px',color:'var(--muted-text-color)'}).text(agTr('none'))));
            return;
        }
        const pills = { sys:agTr('p_sys'),broken:agTr('p_broken'),rare:agTr('p_rare'),unused:agTr('p_unused'),ok:agTr('p_ok') };
        const cntC = { unused:'var(--agc-info,#9b7ec8)',rare:'var(--agc-warn,#c9984a)' };
        const pColors = { broken:['color-mix(in srgb, var(--agc-danger,#d97070) 10%, transparent)','var(--agc-danger,#d97070)','var(--agc-danger,#d97070)'],rare:['color-mix(in srgb, var(--agc-warn,#c9984a) 10%, transparent)','var(--agc-warn,#c9984a)','var(--agc-warn,#c9984a)'],unused:['color-mix(in srgb, var(--agc-info,#9b7ec8) 10%, transparent)','var(--agc-info,#9b7ec8)','var(--agc-info,#9b7ec8)'],sys:['color-mix(in srgb, var(--agc-blue,#6b95c4) 10%, transparent)','var(--agc-blue,#6b95c4)','var(--agc-blue,#6b95c4)'],ok:['color-mix(in srgb, var(--agc-success,#68a87c) 10%, transparent)','var(--agc-success,#68a87c)','var(--agc-success,#68a87c)'] };

        ctx._visible.forEach(a => {
            const key = a.type+'::'+a.name, chk = ctx._selected.has(key);
            const $tr = $('<tr>').css({borderBottom:'1px solid var(--main-border-color)'}).hover(function(){$(this).css({background:'var(--accented-background-color)'});},function(){$(this).css({background:'transparent'});});
            $tr.append(
                $('<td>').append(a.prot?'':$('<input type="checkbox" aria-label="'+agTr('sel_row')+a.name+'">').data('key',key).prop('checked',chk).on('change',function(){this.checked?ctx._selected.add(key):ctx._selected.delete(key);updateFooter();})),
                $('<td>').css({padding:isWidget?'4px 6px':'5px 8px'}).append($('<span>').css({display:'inline-block',fontSize:isWidget?'8px':'9px',padding:'1px 3px',borderRadius:'2px',marginRight:'4px',background:a.type==='label'?'rgba(107,149,196,.15)':'rgba(155,126,200,.15)',color:a.type==='label'?'var(--agc-blue,#6b95c4)':'var(--agc-info,#9b7ec8)'}).text(a.type==='label'?'# label':'~ rel'),$('<span>').text(a.name),a.bc>0?$('<span>').css({color:'var(--agc-danger,#d97070)',fontSize:isWidget?'8px':'9px'}).text(' ('+a.bc+agTr('broken_sfx')):''),
                $('<td>').text(a.type).css({color:'var(--muted-text-color)',padding:isWidget?'4px 6px':'5px 8px'}),
                $('<td>').text(a.count).css({textAlign:'right',fontWeight:600,color:cntC[a.status]||'var(--agc-success,#68a87c)',padding:isWidget?'4px 6px':'5px 8px'}),
                $('<td>').css({padding:isWidget?'4px 6px':'5px 8px'}).append($('<span>').text(pills[a.status]).css({fontSize:isWidget?'8px':'9px',padding:'1px 5px',borderRadius:'8px',background:(pColors[a.status]||pColors.ok)[0],color:(pColors[a.status]||pColors.ok)[1],border:'1px solid '+(pColors[a.status]||pColors.ok)[2]})),
            );
            const $act = $('<td>').css({textAlign:'right',padding:isWidget?'4px 6px':'5px 8px'});
            if (a.prot) {
                $act.append($('<button type="button">').text(agTr('protected')).css({padding:'1px 4px',fontSize:isWidget?'8px':'9px',opacity:.4,background:'none',border:'1px solid var(--main-border-color)',borderRadius:'2px',color:'var(--muted-text-color)'}).prop('disabled',true));
            } else {
                $act.append(
                    $('<button type="button">').text(ctx._dryRun?agTr('preview'):agTr('remove')).css({padding:isWidget?'1px 5px':'2px 7px',cursor:'pointer',fontSize:isWidget?'8px':'9px',fontWeight:500,background:'rgba(217,112,112,.1)',color:'var(--agc-danger,#d97070)',border:'1px solid var(--agc-danger,#d97070)',borderRadius:'2px',marginRight:'3px'}).on('click',()=>delSingle(a.name,a.type)),
                    $('<button type="button">').text(agTr('keep')).css({padding:isWidget?'1px 5px':'2px 7px',cursor:'pointer',fontSize:isWidget?'8px':'9px',background:'transparent',color:'var(--muted-text-color)',border:'1px solid var(--main-border-color)',borderRadius:'2px'}).on('click',()=>{ctx._selected.delete(key);renderTable();updateFooter();}),
                );
            }
            $tr.append($act); $tbody.append($tr);
        });
    }

    function updateFooter() {
        $selInfo.html('<strong>'+ctx._selected.size+'</strong>'+agTr('selinfo')+'<strong>'+ctx._visible.length+'</strong>'+agTr('visible'));
        $execBtn.prop('disabled', ctx._selected.size === 0);
    }

    function selectSuggested() {
        ctx._allAttrs.forEach(a=>{if(!a.prot&&['broken','unused','rare'].includes(a.status))ctx._selected.add(a.type+'::'+a.name);});
        renderTable(); updateFooter();
    }

    /* ── DELETE ───────────────────────────────── */
    async function delSingle(name, type) {
        if (ctx._dryRun) { log(agTr('dry_remove')+type+'::'+name,'warn'); return; }
        confirmAgc(agTr('confirm_s1')+name+'" ('+type+agTr('confirm_s2'), function(){ doDelete([[name, type]]); });
    }

    async function doDelete(pairs) {
        if (ctx._deleting) return; ctx._deleting = true;
        $execBtn.prop('disabled',true).text('…');
        const names = pairs.map(p=>p[0]), types = pairs.map(p=>p[1]);
        log(agTr('removing')+pairs.length+agTr('attr_s'));
        try {
            const result = await api.runOnBackend((names, types) => {
                let bLog = []; let count = 0;
                for (let i=0;i<names.length;i++) {
                    const name=names[i],type=types[i];
                    try {
                        if (type==='relation') {
                            const notes=api.getNotesWithRelation(name);
                            bLog.push('rel "'+name+'": '+notes.length+' notas');
                            for(const n of notes){if(!n||n.isDeleted)continue;try{n.removeRelation(name);count++;}catch(e){bLog.push('  ✗: '+e.message);}}
                        } else {
                            const notes=api.getNotesWithLabel(name);
                            bLog.push('label "'+name+'": '+notes.length+' notas');
                            for(const n of notes){if(!n||n.isDeleted)continue;try{n.removeLabel(name);count++;}catch(e){bLog.push('  ✗: '+e.message);}}
                        }
                    } catch(e){bLog.push('✗ "'+name+'": '+e.message);}
                }
                if (bLog.length > 200) { bLog = bLog.slice(0,200); bLog.push(agTr('confirm_bo')); }
                return {count,log:bLog};
            }, [names, types]);
            log(result.count+agTr('removed'),'ok');
            (result.log||[]).forEach(l=>log('  '+l));
            ctx._selected.clear();
            await runScan();
        } catch(err) {
            log(agTr('err')+err.message,'err');
            $('#agc-tbody').empty().append($('<tr>').append($('<td colspan="6" role="alert">').css({textAlign:'center',padding:'20px',color:'var(--agc-danger,#d97070)'}).text(agTr('err')+err.message)));
        }
        finally { ctx._deleting = false; $execBtn.prop('disabled',ctx._selected.size===0).text(agTr('exec_btn')); }
    }

    // Expose execCleanup for widget mode compatibility
    ctx._execCleanup = function() {
        if (!ctx._selected.size) return;
        if (ctx._dryRun) { log('[DRY RUN] '+ctx._selected.size+' atributo(s) seriam removidos.','warn'); return; }
        const pairs = [...ctx._selected].map(k=>{const i=k.indexOf('::');return[k.slice(i+2),k.slice(0,i)];});
        confirmAgc(agTr('confirm_t')+pairs.length+agTr('confirm_t2'), function(){ doDelete(pairs); });
    };
    $execBtn.on('click', ctx._execCleanup);
}
