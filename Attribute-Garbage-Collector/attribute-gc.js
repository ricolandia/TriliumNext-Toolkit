/**
 * Attribute GC — TriliumNext
 * Scans all notes for broken/rare/unused labels & relations.
 *
 * Two modes:
 *   A) Render Note:  JS Frontend (no #widget) → ~renderNote → Render Note (full page)
 *   B) Widget:       JS Frontend + #widget label → right panel
 */

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
]);

const TEMP_RE = /^(temp|tmp|teste?|test|rascunho|draft|bak|backup|lixo|trash|xxx|zzz|abc|foo|bar|qwe|asd|asdf)[_\-0-9]*$/i;

function classify(name, type, count, bc) {
    if (!name) return 'ok';
    if (PROT.has(name) || PROT.has(name.toLowerCase())) return 'sys';
    if (type === 'relation' && bc > 0 && bc >= count) return 'broken';
    if (count === 0) return 'unused';
    if (count <= 2 || (count <= 5 && TEMP_RE.test(name))) return 'rare';
    return 'ok';
}

function lev(a, b) {
    const m = a.length, n = b.length;
    const dp = Array.from({length: m+1}, (_,i) => Array.from({length: n+1}, (_,j) => i===0 ? j : j===0 ? i : 0));
    for (let i=1;i<=m;i++) for (let j=1;j<=n;j++)
        dp[i][j] = a[i-1]===b[j-1] ? dp[i-1][j-1] : 1+Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
    return dp[m][n];
}

function findDupes(attrs) {
    const names = attrs.filter(a => a.status !== 'sys').map(a => a.name);
    const groups = [], visited = new Set();
    for (let i=0;i<names.length;i++) {
        if (visited.has(names[i])) continue;
        const g = [names[i]], na = names[i].toLowerCase().replace(/[_\-s]/g,'');
        for (let j=i+1;j<names.length;j++) {
            if (visited.has(names[j])) continue;
            const nb = names[j].toLowerCase().replace(/[_\-s]/g,'');
            const d = lev(na, nb);
            if (d<=2 && Math.max(na.length,nb.length)>3 && d < Math.max(na.length,nb.length)*0.45) {
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
        get widgetTitle() { return 'Attribute GC'; }
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

        _log(msg, t) { this._widgetLog.show().append($('<div>').text('['+new Date().toLocaleTimeString()+'] '+msg).css({color:{ok:'#68a87c',warn:'#c9984a',err:'#d97070',info:'var(--muted-text-color)'}[t||'info'],marginBottom:'1px'})); this._widgetLog.scrollTop(this._widgetLog[0].scrollHeight); }
        _updateFooter() {
            this._$selInfo.html('<strong>'+this._selected.size+'</strong> selecionados · <strong>'+this._visible.length+'</strong> visíveis');
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
    const $btnScan = $('<button>').text('▶ Escanear').css({ padding:isWidget?'4px 10px':'6px 16px',cursor:'pointer',borderRadius:'4px',fontSize:isWidget?'11px':fs,background:'var(--accented-background-color)',color:'var(--main-text-color)',border:'1px solid var(--main-border-color)',fontWeight:500 });
    const $lblDry = $('<label>').css({ display:'flex',alignItems:'center',gap:'5px',cursor:'pointer',fontSize:isWidget?'11px':fs,color:'var(--muted-text-color)' });
    const $chkDry = $('<input type="checkbox">').prop('checked', true);
    $lblDry.append($chkDry, ' Dry Run');
    $toolbar.append($btnScan, $lblDry, $('<span>').css({flex:1}));

    const $banner = $('<div>').css({ padding:isWidget?'4px 8px':'6px 14px',margin:isWidget?'4px 6px':'6px 14px',borderRadius:'4px',background:'rgba(201,152,74,.08)',border:'1px solid rgba(201,152,74,.2)',color:'#c9984a',fontSize:isWidget?'10px':'11px',flexShrink:0 }).html('<strong>Dry Run ativo.</strong> Desative para executar limpeza real.');

    const $stats = $('<div>').css({ display:'none',gridTemplateColumns:'repeat(5,1fr)',gap:isWidget?'3px':'6px',padding:isWidget?'4px 6px':'10px 14px',flexShrink:0 });
    ['total','broken','rare','unused','dupes'].forEach((k,i) => {
        const cols = ['#4a9','#d97070','#c9984a','#9b7ec8','#6b95c4'];
        const labels = ['Atributos','Quebrados','Raros','Sem uso','Similares'];
        const $s = $('<div>').css({ textAlign:'center',padding:isWidget?'5px 2px':'8px 4px',borderRadius:'4px',background:'var(--accented-background-color)',borderTop:'2px solid '+cols[i] });
        $s.append($('<div>').css({fontSize:isWidget?'18px':'24px',fontWeight:600}).attr('id','ags-'+k), $('<div>').css({fontSize:isWidget?'8px':'9px',color:'var(--muted-text-color)',textTransform:'uppercase',letterSpacing:'.04em'}).text(labels[i]));
        $stats.append($s);
    });

    const $fbar = $('<div>').css({ display:'none',gap:isWidget?'3px':'5px',padding:isWidget?'0 6px 4px':'0 14px 6px',flexWrap:'wrap',flexShrink:0 });
    ['all','broken','rare','unused','sys','ok'].forEach(f => {
        const lb = {all:'Todos',broken:'Quebrados',rare:'Raros',unused:'Sem uso',sys:'Sistema',ok:'Saudáveis'};
        const $b = $('<button>').text(lb[f]).css({ padding:isWidget?'2px 7px':'3px 10px',borderRadius:isWidget?'10px':'14px',border:'1px solid var(--main-border-color)',background:f==='all'?'var(--accented-background-color)':'transparent',color:f==='all'?'var(--main-text-color)':'var(--muted-text-color)',cursor:'pointer',fontSize:isWidget?'9.5px':'10.5px' });
        $b.on('click', () => { ctx._curFilter = f; applyUIFilters(); });
        $fbar.append($b);
    });
    const $fsearch = $('<input type="text" placeholder="Buscar…">').css({ marginLeft:'auto',padding:isWidget?'2px 6px':'3px 8px',border:'1px solid var(--main-border-color)',borderRadius:'4px',background:'var(--accented-background-color)',color:'var(--main-text-color)',fontSize:isWidget?'10px':'11px',width:isWidget?'100px':'140px',outline:'none' }).on('input', applyUIFilters);
    $fbar.append($fsearch);

    const $tblWrap = $('<div>').css({ display:'none',overflow:'auto',flex:1,padding:isWidget?'0 6px':'0 14px' });
    const $table = $('<table>').css({ width:'100%',borderCollapse:'collapse' });
    const $thead = $('<thead>').css({ position:'sticky',top:0,zIndex:1,background:'var(--main-background-color)' });
    $thead.append($('<tr>').append(
        $('<th style="width:20px">').append($('<input type="checkbox" id="agc-selall">')),
        $('<th>').text('Nome').css({cursor:'pointer',fontSize:isWidget?'9px':'10px',color:'var(--muted-text-color)',textTransform:'uppercase',letterSpacing:'.06em',padding:isWidget?'5px 6px':'6px 8px'}).on('click',()=>{ctx._sortKey='name';applyUIFilters();}),
        $('<th>').text('Tipo').css({fontSize:isWidget?'9px':'10px',color:'var(--muted-text-color)',textTransform:'uppercase',letterSpacing:'.06em',padding:isWidget?'5px 6px':'6px 8px'}),
        $('<th style="text-align:right">').text('Usos').css({cursor:'pointer',fontSize:isWidget?'9px':'10px',color:'var(--muted-text-color)',textTransform:'uppercase',letterSpacing:'.06em',padding:isWidget?'5px 6px':'6px 8px'}).on('click',()=>{ctx._sortKey='count';applyUIFilters();}),
        $('<th>').text('Status').css({fontSize:isWidget?'9px':'10px',color:'var(--muted-text-color)',textTransform:'uppercase',letterSpacing:'.06em',padding:isWidget?'5px 6px':'6px 8px'}),
        $('<th style="text-align:right">').text('Ações').css({fontSize:isWidget?'9px':'10px',color:'var(--muted-text-color)',textTransform:'uppercase',letterSpacing:'.06em',padding:isWidget?'5px 6px':'6px 8px'}),
    ));
    $table.append($thead, $('<tbody id="agc-tbody">'));
    $tblWrap.append($table);

    const $footer = $('<div>').css({ display:'none',alignItems:'center',gap:isWidget?'6px':'10px',padding:isWidget?'5px 6px':'8px 14px',borderTop:'1px solid var(--main-border-color)',flexShrink:0 });
    const $selInfo = $('<span>').css({ fontSize:isWidget?'10px':'11px',color:'var(--muted-text-color)',flex:1 });
    const $execBtn = $('<button>').text('Executar limpeza').css({ padding:isWidget?'3px 10px':'5px 14px',cursor:'pointer',borderRadius:'4px',fontSize:isWidget?'10px':'12px',fontWeight:500,background:'rgba(217,112,112,.1)',color:'#d97070',border:'1px solid rgba(217,112,112,.25)' }).prop('disabled',true);
    $footer.append(
        $selInfo,
        $('<button>').text('Auto-selecionar').css({ padding:isWidget?'3px 8px':'5px 12px',cursor:'pointer',borderRadius:'4px',fontSize:isWidget?'10px':'12px',background:'var(--accented-background-color)',color:'var(--muted-text-color)',border:'1px solid var(--main-border-color)' }).on('click', selectSuggested),
        $execBtn,
    );

    const $dupes = $('<div>').css({ display:'none',padding:isWidget?'0 6px 6px':'0 14px 8px',flexShrink:0 });
    const $log = $('<div>').css({ display:'none',maxHeight:isWidget?'90px':'120px',overflowY:'auto',padding:isWidget?'3px 6px':'4px 14px',borderTop:'1px solid var(--main-border-color)',fontSize:isWidget?'9.5px':'10px',color:'var(--muted-text-color)',flexShrink:0 });

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

    /* ── LOG ──────────────────────────────────── */
    function log(msg, t) {
        t = t || 'info';
        const colors = { ok:'#68a87c', warn:'#c9984a', err:'#d97070', info:'var(--muted-text-color)' };
        $log.show().append($('<div>').text('['+new Date().toLocaleTimeString()+'] '+msg).css({ color:colors[t], marginBottom:'1px' }));
        $log.scrollTop($log[0].scrollHeight);
    }

    /* ── SCAN ─────────────────────────────────── */
    async function runScan() {
        if (ctx._scanning) return;
        ctx._scanning = true;
        $btnScan.text('…').prop('disabled', true);
        $log.empty().show();
        log('Escaneando…');

        try {
            const data = await api.runOnBackend(() => {
                const groups = api.sql.getRows(`SELECT a.name, a.type, COUNT(*) AS count FROM attributes a INNER JOIN notes n ON a.noteId = n.noteId WHERE a.isDeleted = 0 AND n.isDeleted = 0 GROUP BY a.name, a.type ORDER BY count ASC, a.name`);
                const broken = api.sql.getRows(`SELECT a.name, COUNT(*) AS bc FROM attributes a INNER JOIN notes n ON a.noteId = n.noteId LEFT JOIN notes t ON a.value = t.noteId WHERE a.type = 'relation' AND a.isDeleted = 0 AND n.isDeleted = 0 AND (t.noteId IS NULL OR t.isDeleted = 1) GROUP BY a.name`);
                const bMap = {}; for (const r of broken) bMap[r.name] = r.bc;
                return { groups, bMap };
            });

            ctx._allAttrs = data.groups.map(r => ({
                name: r.name, type: r.type, count: r.count,
                bc: data.bMap[r.name] || 0,
                status: classify(r.name, r.type, r.count, data.bMap[r.name] || 0),
                prot: PROT.has(r.name) || PROT.has(r.name.toLowerCase()),
            }));

            const b = ctx._allAttrs.filter(a => a.status === 'broken').length;
            const r = ctx._allAttrs.filter(a => a.status === 'rare').length;
            const u = ctx._allAttrs.filter(a => a.status === 'unused').length;
            const d = findDupes(ctx._allAttrs);

            $('#ags-total').text(ctx._allAttrs.length); $('#ags-broken').text(b);
            $('#ags-rare').text(r); $('#ags-unused').text(u); $('#ags-dupes').text(d.length);

            $stats.show(); $fbar.show(); $tblWrap.show(); $footer.show();

            $dupes.empty();
            if (d.length) {
                $dupes.show().append($('<div>').css({ fontSize:isWidget?'9px':'10px',color:'var(--muted-text-color)',fontWeight:600,marginBottom:'3px' }).text('Grupos Similares'));
                d.forEach(g => {
                    const $dg = $('<div>').css({ display:'flex',gap:'3px',flexWrap:'wrap',marginBottom:'2px' });
                    g.forEach((n,i) => { $dg.append($('<span>').text(n).css({ background:'var(--accented-background-color)',padding:'1px 4px',borderRadius:'2px',fontSize:isWidget?'9px':'10px',border:'1px solid var(--main-border-color)' })); if (i<g.length-1) $dg.append($('<span>').text('≈').css({color:'var(--muted-text-color)',fontSize:isWidget?'9px':'10px'})); });
                    $dupes.append($dg);
                });
            } else $dupes.hide();

            ctx._curFilter = 'all'; ctx._sortKey = 'count'; ctx._sortDir = 1; applyUIFilters();
            log('Scan: '+ctx._allAttrs.length+' grupos.', 'ok');
            if (b+r+u>0) log(b+' quebrados, '+r+' raros, '+u+' sem uso.', 'warn');
            else log('Base saudável!', 'ok');
        } catch(err) { log('Erro: '+err.message, 'err'); }
        finally { ctx._scanning = false; $btnScan.text('▶ Escanear').prop('disabled', false); }
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
            const t=$(this).text().toLowerCase();
            const m=ctx._curFilter==='all'?t==='todos':t.includes(ctx._curFilter==='ok'?'saud':ctx._curFilter);
            $(this).css({background:m?'var(--accented-background-color)':'transparent',color:m?'var(--main-text-color)':'var(--muted-text-color)'});
        });
        renderTable(); updateFooter();
    }

    /* ── TABLE ────────────────────────────────── */
    function renderTable() {
        if (!ctx._visible || !ctx._visible.length) return;
        const $tbody = $('#agc-tbody').empty();
        const pills = { sys:'sistema',broken:'quebrado',rare:'raro',unused:'sem uso',ok:'saudável' };
        const cntC = { unused:'#9b7ec8',rare:'#c9984a' };
        const pColors = { broken:['rgba(217,112,112,.1)','#d97070','rgba(217,112,112,.25)'],rare:['rgba(201,152,74,.1)','#c9984a','rgba(201,152,74,.25)'],unused:['rgba(155,126,200,.1)','#9b7ec8','rgba(155,126,200,.25)'],sys:['rgba(107,149,196,.1)','#6b95c4','rgba(107,149,196,.25)'],ok:['rgba(104,168,124,.1)','#68a87c','rgba(104,168,124,.25)'] };

        ctx._visible.forEach(a => {
            const key = a.type+'::'+a.name, chk = ctx._selected.has(key);
            const $tr = $('<tr>').css({borderBottom:'1px solid var(--main-border-color)'}).hover(function(){$(this).css({background:'var(--accented-background-color)'});},function(){$(this).css({background:'transparent'});});
            $tr.append(
                $('<td>').append(a.prot?'':$('<input type="checkbox">').data('key',key).prop('checked',chk).on('change',function(){this.checked?ctx._selected.add(key):ctx._selected.delete(key);updateFooter();})),
                $('<td>').css({padding:isWidget?'4px 6px':'5px 8px'}).append($('<span>').css({display:'inline-block',fontSize:isWidget?'8px':'9px',padding:'1px 3px',borderRadius:'2px',marginRight:'4px',background:a.type==='label'?'rgba(107,149,196,.15)':'rgba(155,126,200,.15)',color:a.type==='label'?'#6b95c4':'#9b7ec8'}).text(a.type==='label'?'# label':'~ rel'),a.name,a.bc>0?$('<span>').css({color:'#d97070',fontSize:isWidget?'8px':'9px'}).text(' ('+a.bc+' quebradas)'):''),
                $('<td>').text(a.type).css({color:'var(--muted-text-color)',padding:isWidget?'4px 6px':'5px 8px'}),
                $('<td>').text(a.count).css({textAlign:'right',fontWeight:600,color:cntC[a.status]||'#68a87c',padding:isWidget?'4px 6px':'5px 8px'}),
                $('<td>').css({padding:isWidget?'4px 6px':'5px 8px'}).append($('<span>').text(pills[a.status]).css({fontSize:isWidget?'8px':'9px',padding:'1px 5px',borderRadius:'8px',background:(pColors[a.status]||pColors.ok)[0],color:(pColors[a.status]||pColors.ok)[1],border:'1px solid '+(pColors[a.status]||pColors.ok)[2]})),
            );
            const $act = $('<td>').css({textAlign:'right',padding:isWidget?'4px 6px':'5px 8px'});
            if (a.prot) {
                $act.append($('<button>').text('protegido').css({padding:'1px 4px',fontSize:isWidget?'8px':'9px',opacity:.4,background:'none',border:'1px solid var(--main-border-color)',borderRadius:'2px',color:'var(--muted-text-color)'}).prop('disabled',true));
            } else {
                $act.append(
                    $('<button>').text(ctx._dryRun?'preview':'remover').css({padding:isWidget?'1px 5px':'2px 7px',cursor:'pointer',fontSize:isWidget?'8px':'9px',fontWeight:500,background:'rgba(217,112,112,.1)',color:'#d97070',border:'1px solid rgba(217,112,112,.25)',borderRadius:'2px',marginRight:'3px'}).on('click',()=>delSingle(a.name,a.type)),
                    $('<button>').text('manter').css({padding:isWidget?'1px 5px':'2px 7px',cursor:'pointer',fontSize:isWidget?'8px':'9px',background:'transparent',color:'var(--muted-text-color)',border:'1px solid var(--main-border-color)',borderRadius:'2px'}).on('click',()=>{ctx._selected.delete(key);renderTable();updateFooter();}),
                );
            }
            $tr.append($act); $tbody.append($tr);
        });
    }

    function updateFooter() {
        $selInfo.html('<strong>'+ctx._selected.size+'</strong> selecionados · <strong>'+ctx._visible.length+'</strong> visíveis');
        $execBtn.prop('disabled', ctx._selected.size === 0);
    }

    function selectSuggested() {
        ctx._allAttrs.forEach(a=>{if(!a.prot&&['broken','unused','rare'].includes(a.status))ctx._selected.add(a.type+'::'+a.name);});
        renderTable(); updateFooter();
    }

    /* ── DELETE ───────────────────────────────── */
    async function delSingle(name, type) {
        if (ctx._dryRun) { log('[DRY RUN] Removeria: '+type+'::'+name,'warn'); return; }
        await doDelete([[name, type]]);
    }

    async function doDelete(pairs) {
        $execBtn.prop('disabled',true).text('…');
        const names = pairs.map(p=>p[0]), types = pairs.map(p=>p[1]);
        log('Removendo '+pairs.length+' atributo(s)…');
        try {
            const result = await api.runOnBackend((names, types) => {
                const bLog = []; let count = 0;
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
                return {count,log:bLog};
            }, [names, types]);
            log(result.count+' instância(s) removidas.','ok');
            (result.log||[]).forEach(l=>log('  '+l));
            ctx._selected.clear();
            await runScan();
        } catch(err) { log('Erro: '+err.message,'err'); }
        finally { $execBtn.prop('disabled',ctx._selected.size===0).text('Executar limpeza'); }
    }

    // Expose execCleanup for widget mode compatibility
    ctx._execCleanup = function() {
        if (!ctx._selected.size) return;
        if (ctx._dryRun) { log('[DRY RUN] '+ctx._selected.size+' atributo(s) seriam removidos.','warn'); return; }
        const pairs = [...ctx._selected].map(k=>{const i=k.indexOf('::');return[k.slice(i+2),k.slice(0,i)];});
        if (!confirm('Remover PERMANENTEMENTE '+pairs.length+' atributo(s)?\n\nEsta operação modifica o banco de dados.')) return;
        doDelete(pairs);
    };
    $execBtn.on('click', ctx._execCleanup);
}
