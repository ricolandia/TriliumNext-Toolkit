/**
 * Kanboard Sync — TriliumNext Plugin
 *
 * Modo: JS Frontend (renderNote)
 * Crie uma nota JS Frontend, cole este código e aponte ~renderNote para ela.
 *
 * ═══════════════════════════════════════════════════════════════
 *  CONFIGURAÇÃO
 * ═══════════════════════════════════════════════════════════════
 */

const CONFIG = {
  apiUrl: 'https://SEU-KANBOARD.com/jsonrpc.php',
  apiToken: 'SEU_TOKEN_AQUI',
  cacheNoteId: 'ID_DA_NOTA_CACHE',
};

const LS_KEY = 'kb_cache';

/* ── State ──────────────────────────────────────────────── */
let cache = null;
let loading = false;

/* ── LocalStorage ────────────────────────────────────────── */

function loadFromStorage() {
  try { const r = localStorage.getItem(LS_KEY); return r ? JSON.parse(r) : null; } catch (_) { return null; }
}
function saveToStorage(d) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(d)); } catch (_) {}
}

/* ── Backend helpers ──────────────────────────────────────── */

async function loadCacheFromNote() {
  return api.runAsyncOnBackendWithManualTransactionHandling(async (noteId) => {
    try {
      const raw = await api.getNoteContent(noteId);
      return { success: true, data: JSON.parse(raw) };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }, [CONFIG.cacheNoteId]);
}

async function syncFromKanboard() {
  return api.runAsyncOnBackendWithManualTransactionHandling(async (cfg) => {
    const { apiUrl, apiToken } = cfg;
    async function rpc(mP, p) {
      const r = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Basic ' + Buffer.from('jsonrpc:' + apiToken).toString('base64') },
        body: JSON.stringify({ jsonrpc: '2.0', method: mP, id: Date.now(), params: p }),
      });
      const d = await r.json();
      if (d.error) throw new Error(d.error.message);
      return d.result;
    }
    const projects = await rpc('getAllProjects');
    let columns = [], tasks = [];
    for (const p of projects) {
      try {
        const pc = await rpc('getColumns', { project_id: p.id });
        columns = columns.concat(pc.map(c => ({ ...c, project_id: p.id })));
      } catch (_) {}
      try {
        const pt = await rpc('getAllTasks', { project_id: p.id, status_id: 1 });
        tasks = tasks.concat(pt);
      } catch (_) {}
    }
    return { success: true, data: { projects, columns, tasks, lastSync: new Date().toISOString() } };
  }, [CONFIG]);
}

async function createKanboardTask(data) {
  return api.runAsyncOnBackendWithManualTransactionHandling(async (cfg, d) => {
    const { apiUrl, apiToken } = cfg;
    async function rpc(mP, p) {
      const r = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Basic ' + Buffer.from('jsonrpc:' + apiToken).toString('base64') },
        body: JSON.stringify({ jsonrpc: '2.0', method: mP, id: Date.now(), params: p }),
      });
      const j = await r.json();
      if (j.error) throw new Error(j.error.message);
      return j.result;
    }
    const cp = { title: d.title, project_id: d.projectId, description: d.description || '' };
    if (d.colorId) cp.color_id = d.colorId;
    if (d.columnId) cp.column_id = d.columnId;
    const taskId = await rpc('createTask', cp);
    const fullTask = await rpc('getTask', { task_id: taskId });
    return { success: true, task: fullTask };
  }, [CONFIG, data]);
}

/* ── Small CSS polish ────────────────────────────────────── */

$('<style>').text(`
#kanboard-app { max-width: 1300px; margin: 0 auto; }
#kanboard-app select:focus, #kanboard-app input:focus, #kanboard-app textarea:focus {
  outline: none; border-color: var(--accent-color) !important;
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-color) 20%, transparent);
}
#kanboard-app tbody tr { transition: background 0.15s; border-bottom: 1px solid color-mix(in srgb, var(--main-border-color) 25%, transparent); }
#kanboard-app tbody tr:last-child { border-bottom: none; }
#kanboard-app tbody tr:hover { background: color-mix(in srgb, var(--accent-color) 6%, transparent); }
#kanboard-app tbody tr:nth-child(even) { background: color-mix(in srgb, var(--main-border-color) 6%, transparent); }
#kanboard-app tbody tr:nth-child(even):hover { background: color-mix(in srgb, var(--accent-color) 6%, color-mix(in srgb, var(--main-border-color) 6%, transparent)); }
#kanboard-app .kb-table td { padding: 10px 10px; vertical-align: middle; }
#kanboard-app .kb-table th { padding: 8px 10px; }
.kb-badge { display:inline-block; padding:2px 10px; border-radius:12px; font-size:12px; font-weight:600; color:#fff; line-height:1.6; }
.kb-desc { font-size:12px; color:var(--muted-text-color); }
.kb-scroll { overflow-y: auto; min-height: 200px; flex: 1; }
@media (max-width: 800px) {
  #kanboard-app .kb-row { flex-direction: column !important; }
  #kanboard-app .kb-right { width: 100% !important; }
}
`).appendTo('head');

/* ── Colors ───────────────────────────────────────────────── */

const COLORS = {
  '': '#999', yellow: '#f1c40f', red: '#e74c3c', green: '#2ecc71',
  blue: '#3498db', orange: '#e67e22', purple: '#9b59b6',
  brown: '#a05020', grey: '#95a5a6', pink: '#e91e8a',
};
const COLORS_LIST = [
  { value: '', label: 'Padrão' },
  { value: 'yellow', label: 'Amarelo' }, { value: 'red', label: 'Vermelho' },
  { value: 'green', label: 'Verde' }, { value: 'blue', label: 'Azul' },
  { value: 'orange', label: 'Laranja' }, { value: 'purple', label: 'Roxo' },
  { value: 'brown', label: 'Marrom' }, { value: 'grey', label: 'Cinza' },
  { value: 'pink', label: 'Rosa' },
];

function esc(s) {
  if (!s) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function toast(msg, type) {
  const bg = type === 'error' ? '#e74c3c' : type === 'success' ? '#27ae60' : '#4a9eff';
  const $t = $('<div>').text(msg).css({ position:'fixed', bottom:20, right:20, zIndex:9999,
    padding:'10px 18px', borderRadius:6, fontSize:12, fontWeight:500, color:'#fff', maxWidth:350,
    background:bg, opacity:0, transition:'opacity 0.3s' });
  $('body').append($t);
  setTimeout(() => $t.css('opacity',1), 10);
  setTimeout(() => $t.css('opacity',0), 3000);
  setTimeout(() => $t.remove(), 3300);
}

/* ── UI functions ──────────────────────────────────────────── */

function buildColMap() {
  const m = {};
  if (cache && cache.columns) for (const c of cache.columns) m[c.id] = c;
  return m;
}

function buildProjMap() {
  const m = {};
  if (cache && cache.projects) for (const p of cache.projects) m[p.id] = p.name || p.title;
  return m;
}

function refreshUI() {
  const $r = $container;
  const s = cache ? '<span>📦 Projetos: <strong>' + (cache.projects||[]).length + '</strong></span>' +
    '<span>📋 Tarefas: <strong>' + (cache.tasks||[]).length + '</strong></span>' +
    '<span>📌 Colunas: <strong>' + (cache.columns||[]).length + '</strong></span>' +
    '<span>🕐 Última sync: <strong>' + (cache.lastSync ? new Date(cache.lastSync).toLocaleString() : 'nunca') + '</strong></span>'
    : '<span>📦 Projetos: <strong>—</strong></span><span>📋 Tarefas: <strong>—</strong></span>' +
    '<span>📌 Colunas: <strong>—</strong></span><span>🕐 Última sync: <strong>nunca</strong></span>';
  $r.find('.kb-summary').html(s);
  renderProjFilter();
  renderFormProjs();
  renderFormCols();
  renderTasks();
}

function renderProjFilter() {
  const $sel = $container.find('#kb-proj-filter');
  const cur = $sel.val();
  let h = '<option value="">Todos os projetos</option>';
  if (cache && cache.projects) for (const p of cache.projects) h += '<option value="' + p.id + '">' + esc(p.name||p.title) + '</option>';
  $sel.html(h).val(cur || '');
}

function renderFormProjs() {
  const $sel = $container.find('#kb-f-proj');
  let h = '<option value="">Selecione…</option>';
  if (cache && cache.projects) for (const p of cache.projects) h += '<option value="' + p.id + '">' + esc(p.name||p.title) + '</option>';
  $sel.html(h);
}

function renderFormCols() {
  const $sel = $container.find('#kb-f-col');
  const pid = $container.find('#kb-f-proj').val();
  if (!pid || !cache || !cache.columns) {
    $sel.html('<option value="">—</option>').prop('disabled', true); return;
  }
  const cols = cache.columns.filter(c => c.project_id === parseInt(pid));
  $sel.html(cols.map(c => '<option value="' + c.id + '">' + esc(c.title) + '</option>').join('')).prop('disabled', false);
}

function renderFormColors() {
  $container.find('#kb-f-color').html(COLORS_LIST.map(c => '<option value="' + c.value + '">' + c.label + '</option>').join(''));
}

function renderTasks() {
  const $tb = $container.find('#kb-tbody');
  const filterVal = $container.find('#kb-proj-filter').val() || '';
  let tasks = cache ? (cache.tasks || []) : [];
  if (filterVal) tasks = tasks.filter(t => String(t.project_id) === filterVal);

  if (!tasks.length) {
    $tb.html('<tr><td colspan="4" style="text-align:center;padding:30px;color:var(--muted-text-color,#888);font-style:italic">' +
      (cache ? 'Nenhuma tarefa encontrada' : 'Clique em <strong>Sincronizar</strong> para buscar dados') + '</td></tr>');
    return;
  }

  const pMap = buildProjMap();
  const cMap = buildColMap();

  $tb.html(tasks.map((t, i) => {
    const color = COLORS[t.color_id] || '#999';
    const colName = cMap[t.column_id] ? esc(cMap[t.column_id].title) : '—';
    const desc = t.description ? '<br><span class="kb-desc">' + esc(t.description.slice(0, 60)) + (t.description.length > 60 ? '…' : '') + '</span>' : '';
    return '<tr>' +
      '<td>' + esc(pMap[t.project_id] || '') + '</td>' +
      '<td><strong>' + esc(t.title) + '</strong>' + desc + '</td>' +
      '<td>' + colName + '</td>' +
      '<td><span class="kb-badge" style="background:' + color + '">' + esc(t.color_id || '—') + '</span></td>' +
      '</tr>';
  }).join(''));
}

/* ── Event handlers ────────────────────────────────────────── */

async function handleSync() {
  if (loading) return;
  loading = true;
  const $btn = $container.find('#kb-sync-btn').prop('disabled', true);
  const $st = $container.find('#kb-status').text('Sincronizando…');

  const r = await syncFromKanboard();
  if (r.success) {
    cache = r.data;
    saveToStorage(cache);
    $st.text('✅ ' + r.data.tasks.length + ' tarefas, ' + r.data.projects.length + ' projetos');
    refreshUI();
    setTimeout(() => $st.text(''), 5000);
  } else {
    $st.text('❌ ' + (r.error || 'Erro'));
    toast(r.error || 'Falha na sincronização', 'error');
  }
  $btn.prop('disabled', false);
  loading = false;
}

async function handleCreateTask(e) {
  e.preventDefault();
  const pid = $container.find('#kb-f-proj').val();
  const cid = $container.find('#kb-f-col').val();
  const title = $container.find('#kb-f-title').val().trim();
  const desc = $container.find('#kb-f-desc').val().trim();
  const colorId = $container.find('#kb-f-color').val();

  if (!pid) { toast('Selecione um projeto.', 'error'); return; }
  if (!title) { toast('Digite um título.', 'error'); return; }

  const $btn = $container.find('#kb-create-btn').prop('disabled', true);
  const $st = $container.find('#kb-create-status').text('Criando…');

  const r = await createKanboardTask({
    projectId: parseInt(pid),
    columnId: cid ? parseInt(cid) : null,
    title, description: desc, colorId,
  });

  if (r.success) {
    toast('Tarefa "' + title + '" criada!', 'success');
    $container.find('#kb-f-title').val('');
    $container.find('#kb-f-desc').val('');
    $st.text('✅ Criada (ID ' + r.task.id + ')');
    if (cache) {
      cache.tasks.push(r.task);
      cache.lastSync = new Date().toISOString();
      saveToStorage(cache);
      renderTasks();
      renderFormCols();
    }
  } else {
    toast('Erro: ' + (r.error || 'desconhecido'), 'error');
    $st.text('❌ ' + (r.error || ''));
  }
  $btn.prop('disabled', false);
  setTimeout(() => $st.text(''), 4000);
}

function checkConfig() {
  const bad = CONFIG.apiUrl.includes('SEU-KANBOARD') || CONFIG.apiToken === 'SEU_TOKEN_AQUI' || CONFIG.cacheNoteId.startsWith('ID_DA_NOTA');
  if (bad) {
    $container.empty().css({ padding: 16 }).append(
      $('<div>').css({ padding:20, border:'1px solid #f39c12', borderRadius:6, background:'#fef9e7', fontSize:13 }).html(
        '<strong>⚠️ Configuração necessária</strong><br><br>Edite as constantes no início do código:<br><br>' +
        (CONFIG.apiUrl.includes('SEU-KANBOARD') ? '• <code>CONFIG.apiUrl</code> — URL do seu Kanboard<br>' : '') +
        (CONFIG.apiToken === 'SEU_TOKEN_AQUI' ? '• <code>CONFIG.apiToken</code> — Token da API<br>' : '') +
        (CONFIG.cacheNoteId.startsWith('ID_DA_NOTA') ? '• <code>CONFIG.cacheNoteId</code> — ID da nota kanboard_cache<br>' : '') +
        '<br><em>Para copiar o ID: clique com o direito na nota → Copiar ID da nota</em>'
      )
    );
    return false;
  }
  return true;
}

/* ── Init ────────────────────────────────────────────────── */

(async function () {
  const $root = $container;
  $root.empty().css({
    display:'flex', flexDirection:'column', height:'100%',
    fontFamily:'var(--detail-font-family,"Segoe UI",sans-serif)',
    fontSize:13, color:'var(--main-text-color)',
    background:'transparent', overflow:'hidden', padding:12,
  });
  $root.attr('id', 'kanboard-app');

  if (!checkConfig()) return;

  /* ── Header ── */
  const $hdr = $('<div>').css({ display:'flex', alignItems:'center', gap:12, paddingBottom:10, marginBottom:14, borderBottom:'1px solid var(--main-border-color)' })
    .append(
      $('<span>').html('📋&nbsp;<strong>Kanboard</strong>').css({ fontSize:16, flex:1 }),
      $('<span>').attr('id','kb-status').css({ fontSize:12, color:'var(--muted-text-color)' }),
      $('<button>').attr('id','kb-sync-btn').text('🔄 Sincronizar').css({
        padding:'6px 14px', border:'1px solid var(--main-border-color)', borderRadius:6, cursor:'pointer',
        fontSize:12, fontWeight:500, background:'var(--accent-color)', color:'#fff', whiteSpace:'nowrap',
      }).on('click', handleSync)
    );

  /* ── Summary ── */
  const $sum = $('<div>').addClass('kb-summary').css({ display:'flex', gap:20, marginBottom:12, fontSize:12, color:'var(--muted-text-color)' });

  /* ── Project filter ── */
  const $flt = $('<div>').append(
    $('<select>').attr('id','kb-proj-filter').css({
      padding:'4px 8px', border:'1px solid var(--main-border-color)', borderRadius:6, fontSize:12, maxWidth:220,
      background:'var(--main-background-color)', color:'var(--main-text-color)',
    }).on('change', renderTasks)
  );

  /* ── Table ── */
  const $tbl = $('<table>').addClass('kb-table').css({ width:'100%', borderCollapse:'collapse', fontSize:12 });
  const th = (txt, w) => $('<th>').text(txt).css({ width:w, textAlign:'left', padding:'8px 10px', fontSize:12,
    textTransform:'uppercase', letterSpacing:0.5, borderBottom:'1px solid var(--main-border-color)',
    color:'var(--muted-text-color)', fontWeight:600 });
  $tbl.append(
    $('<thead>').append($('<tr>').append(th('Projeto','120px'), th('Tarefa'), th('Coluna','140px'), th('Cor','70px'))),
    $('<tbody>').attr('id','kb-tbody')
  );
  const $tableWrap = $('<div>').addClass('kb-scroll').css({ border:'1px solid var(--main-border-color)', borderRadius:6, flex:1 }).append($tbl);

  /* ── New task form ── */
  const $ft = $('<div>').html('✏️&nbsp;<strong>Nova Tarefa</strong>').css({ fontSize:14, marginBottom:10, paddingBottom:6, borderBottom:'1px solid var(--main-border-color)' });
  const $form = $('<form>').css({ display:'flex', flexDirection:'column', gap:10 }).on('submit', handleCreateTask);
  const iSty = { width:'100%', padding:'6px 8px', border:'1px solid var(--main-border-color)', borderRadius:6, fontSize:12,
    background:'var(--main-background-color)', color:'var(--main-text-color)', fontFamily:'inherit', boxSizing:'border-box' };
  const lSty = { display:'block', fontSize:11, fontWeight:600, color:'var(--muted-text-color)', marginBottom:3, textTransform:'uppercase', letterSpacing:0.3 };
  const fd = (label, el) => $('<div>').append($('<label>').text(label).css(lSty), el);

  $form.append(
    fd('Projeto', $('<select>').attr('id','kb-f-proj').attr('required',true).css(iSty).on('change', renderFormCols)),
    fd('Coluna', $('<select>').attr('id','kb-f-col').css(iSty).prop('disabled', true)),
    fd('Cor', $('<select>').attr('id','kb-f-color').css(iSty)),
    fd('Título', $('<input>').attr({ id:'kb-f-title', type:'text', placeholder:'Título da tarefa', required:true }).css(iSty)),
    fd('Descrição', $('<textarea>').attr({ id:'kb-f-desc', placeholder:'Descrição (opcional)', rows:3 }).css({ ...iSty, resize:'vertical', minHeight:60 })),
    $('<button>').attr({ id:'kb-create-btn', type:'submit' }).text('➕ Criar Tarefa').css({
      padding:'7px 14px', border:'1px solid var(--main-border-color)', borderRadius:6, cursor:'pointer',
      fontSize:12, fontWeight:500, background:'var(--accent-color)', color:'#fff', width:'100%',
    }),
    $('<span>').attr('id','kb-create-status').css({ fontSize:11, color:'var(--muted-text-color)', textAlign:'center' })
  );

  /* ── Side-by-side layout ── */
  const $left = $('<div>').css({ flex:1, display:'flex', flexDirection:'column', minWidth:0, gap:10 });
  const $right = $('<div>').addClass('kb-right').css({ width:300, flexShrink:0 });
  const $row = $('<div>').addClass('kb-row').css({ display:'flex', gap:20, flex:1, minHeight:0 });

  $left.append($flt, $tableWrap);
  $right.append($ft, $form);
  $row.append($left, $right);
  $root.append($hdr, $sum, $row);

  renderFormColors();
  refreshUI();

  const stored = loadFromStorage();
  if (stored) { cache = stored; refreshUI(); }

  try {
    const r = await loadCacheFromNote();
    if (r.success && r.data.lastSync && (!cache || new Date(r.data.lastSync) > new Date(cache.lastSync))) {
      cache = r.data; saveToStorage(cache); refreshUI();
    }
  } catch (_) {}
})();
