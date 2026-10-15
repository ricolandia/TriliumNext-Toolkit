/**
 * Kanboard Sync — TriliumNext Render Note
 *
 * Modo: JS Frontend (renderNote)
 * Crie uma nota JS Frontend, cole este código e aponte ~renderNote para ela.
 *
 * ⚠️  SEGURANÇA: O token da API fica visível nesta nota.
 *     Para maior proteção, crie uma nota separada (ex: "kb_config") com conteúdo
 *     JSON {"apiUrl":"...","apiToken":"..."} e leia via api.getNoteContent().
 *
 * ═══════════════════════════════════════════════════════════════
 *  CONFIGURAÇÃO
 * ═══════════════════════════════════════════════════════════════
 */

const CONFIG = {
  apiUrl:      'https://yourdomain/jsonrpc.php',
  apiToken:    'yourtoken',
  cacheNoteId: 'noteid',
};

// status_id: 1 = tarefas ativas; 0 = tarefas arquivadas
const ACTIVE_STATUS = 1;

const LS_KEY   = 'kb_cache_v2';
const QUEUE_KEY = 'kb_pending_ops';

/* ── i18n (PT/EN) — mesmo padrão do toolkit ─────────────── */
const KB_I18N = {
  'title':            { pt: 'Kanboard', en: 'Kanboard' },
  'btn_sync':         { pt: '↻ Sincronizar', en: '↻ Sync' },
  'sync_busy':        { pt: '⟳ Sincronizando…', en: '⟳ Syncing…' },
  'sync_ok':          { pt: ' tarefas · ', en: ' tasks · ' },
  'sync_ok2':         { pt: ' projetos', en: ' projects' },
  'sync_err':         { pt: '✗ Erro na sincronização', en: '✗ Sync error' },
  'sync_fail':        { pt: 'Falha na sincronização', en: 'Sync failed' },
  'sync_partial':     { pt: ' projeto(s) com erro', en: ' project(s) with errors' },
  'f_all':            { pt: 'Todos os projetos', en: 'All projects' },
  'search_ph':        { pt: 'Buscar tarefas…', en: 'Search tasks…' },
  'search_ar':        { pt: 'Buscar tarefas', en: 'Search tasks' },
  'th_project':       { pt: 'Projeto', en: 'Project' },
  'th_task':          { pt: 'Tarefa', en: 'Task' },
  'th_column':        { pt: 'Coluna', en: 'Column' },
  'th_color':         { pt: 'Cor', en: 'Color' },
  'th_actions':       { pt: 'Ações', en: 'Actions' },
  'stat_projects':    { pt: 'Projetos', en: 'Projects' },
  'stat_tasks':       { pt: 'Tarefas', en: 'Tasks' },
  'stat_columns':     { pt: 'Colunas', en: 'Columns' },
  'stat_sync':        { pt: 'Sync', en: 'Sync' },
  'never':            { pt: 'nunca', en: 'never' },
  'empty_none':       { pt: 'Nenhuma tarefa encontrada', en: 'No tasks found' },
  'empty_a':          { pt: 'Clique em ', en: 'Click ' },
  'empty_b':          { pt: ' para buscar dados', en: ' to fetch data' },
  'form_new':         { pt: '✏ Nova Tarefa', en: '✏ New Task' },
  'lbl_project':      { pt: 'Projeto', en: 'Project' },
  'lbl_column':       { pt: 'Coluna', en: 'Column' },
  'lbl_color':        { pt: 'Cor', en: 'Color' },
  'lbl_title':        { pt: 'Título', en: 'Title' },
  'lbl_desc':         { pt: 'Descrição', en: 'Description' },
  'ph_title':         { pt: 'Título da tarefa', en: 'Task title' },
  'ph_desc':          { pt: 'Descrição (opcional)', en: 'Description (optional)' },
  'btn_create_task':  { pt: '+ Criar Tarefa', en: '+ Create Task' },
  'creating':         { pt: 'Criando…', en: 'Creating…' },
  'created':          { pt: '✓ Criada (ID ', en: '✓ Created (ID ' },
  'sel_ph':           { pt: 'Selecione…', en: 'Select…' },
  'no_projects':      { pt: 'Nenhum projeto disponível', en: 'No projects available' },
  'sec_new_proj':     { pt: '📁 Novo Projeto', en: '📁 New Project' },
  'ph_proj_name':     { pt: 'Nome do projeto', en: 'Project name' },
  'btn_create_proj':  { pt: '+ Criar Projeto', en: '+ Create Project' },
  'sec_del_proj':     { pt: '🗑️ Deletar Projeto', en: '🗑️ Delete Project' },
  'btn_del_proj':     { pt: '🗑️ Deletar Projeto', en: '🗑️ Delete Project' },
  'ar_del_proj':      { pt: 'Deletar projeto selecionado', en: 'Delete selected project' },
  'ar_del_task':      { pt: 'Deletar tarefa', en: 'Delete task' },
  'queue_n':          { pt: ' pendente', en: ' pending' },
  'queue_s':          { pt: 's', en: 's' },
  'err_sel_proj':     { pt: 'Selecione um projeto.', en: 'Select a project.' },
  'err_title':        { pt: 'Digite um título.', en: 'Enter a title.' },
  'err_proj_name':    { pt: 'Digite um nome para o projeto.', en: 'Enter a project name.' },
  'col_updated':      { pt: 'Coluna atualizada', en: 'Column updated' },
  'err_move':         { pt: 'Erro ao mover tarefa: ', en: 'Error moving task: ' },
  'err_del':          { pt: 'Erro ao deletar: ', en: 'Error deleting: ' },
  'err_generic':      { pt: 'Erro: ', en: 'Error: ' },
  'task_created_a':   { pt: 'Tarefa "', en: 'Task "' },
  'task_created_b':   { pt: '" criada!', en: '" created!' },
  'task_deleted':     { pt: '🗑️ Tarefa deletada', en: '🗑️ Task deleted' },
  'proj_deleted_a':   { pt: '🗑️ Projeto "', en: '🗑️ Project "' },
  'proj_deleted_b':   { pt: '" deletado', en: '" deleted' },
  'proj_exists_a':    { pt: 'Projeto "', en: 'Project "' },
  'proj_exists_b':    { pt: '" já existia', en: '" already existed' },
  'proj_created_a':   { pt: 'Projeto "', en: 'Project "' },
  'proj_created_b':   { pt: '" criado!', en: '" created!' },
  'offline_queued':   { pt: '⏳ Sem conexão — adicionado à fila', en: '⏳ Offline — added to queue' },
  'offline_toast':    { pt: 'Sem conexão. Projeto será criado quando sincronizar.', en: 'Offline. The project will be created on the next sync.' },
  'no_pending':       { pt: 'Nenhuma operação pendente.', en: 'No pending operations.' },
  'queue_result':     { pt: 'Fila: ', en: 'Queue: ' },
  'queue_ok':         { pt: ' ok', en: ' ok' },
  'queue_erros':      { pt: ' erro(s)', en: ' error(s)' },
  'err_queue':        { pt: 'Erro ao processar fila: ', en: 'Error processing queue: ' },
  'confirm_title':    { pt: 'Confirmar', en: 'Confirm' },
  'confirm_del_task': { pt: 'Deletar esta tarefa permanentemente?', en: 'Permanently delete this task?' },
  'confirm_del_proj_a': { pt: 'Deletar o projeto "', en: 'Permanently delete the project "' },
  'confirm_del_proj_b': { pt: '" permanentemente?\nTodas as tarefas serão removidas.', en: '"?\nAll of its tasks will be removed.' },
  'confirm_ok':       { pt: 'Deletar', en: 'Delete' },
  'confirm_no':       { pt: 'Cancelar', en: 'Cancel' },
  'cfg_title':        { pt: '⚠️ Configuração necessária', en: '⚠️ Configuration required' },
  'cfg_intro':        { pt: 'Edite as constantes no início do código:', en: 'Edit the constants at the top of the script:' },
  'cfg_url':          { pt: 'CONFIG.apiUrl — URL do seu Kanboard', en: 'CONFIG.apiUrl — your Kanboard URL' },
  'cfg_token':        { pt: 'CONFIG.apiToken — Token da API', en: 'CONFIG.apiToken — API token' },
  'cfg_noteid':       { pt: 'CONFIG.cacheNoteId — ID da nota kanboard_cache', en: 'CONFIG.cacheNoteId — ID of the kanboard_cache note' },
  'cfg_hint':         { pt: 'Para copiar o ID: clique com o direito na nota → Copiar ID da nota', en: 'To copy the ID: right-click the note → Copy note ID' },
  'c_default':        { pt: 'Padrão', en: 'Default' },
  'c_yellow':         { pt: 'Amarelo', en: 'Yellow' },
  'c_red':            { pt: 'Vermelho', en: 'Red' },
  'c_green':          { pt: 'Verde', en: 'Green' },
  'c_blue':           { pt: 'Azul', en: 'Blue' },
  'c_orange':         { pt: 'Laranja', en: 'Orange' },
  'c_purple':         { pt: 'Roxo', en: 'Purple' },
  'c_brown':          { pt: 'Marrom', en: 'Brown' },
  'c_grey':           { pt: 'Cinza', en: 'Grey' },
  'c_pink':           { pt: 'Rosa', en: 'Pink' },
};
function kbLang() {
  try {
    const loc = api.getOption ? api.getOption('locale') : '';
    if (loc && String(loc).toLowerCase().indexOf('en') === 0) return 'en';
  } catch (_) {}
  const nav = (navigator.language || '').toLowerCase();
  return nav.indexOf('en') === 0 ? 'en' : 'pt';
}
const KB_LANG = kbLang();
function kbTr(key, i) {
  const e = KB_I18N[key];
  if (!e) return key;
  if (Array.isArray(e[KB_LANG])) return e[KB_LANG][i] !== undefined ? e[KB_LANG][i] : e.pt[i];
  return e[KB_LANG] !== undefined ? e[KB_LANG] : e.pt;
}

// o backend recebe CONFIG como cfg (funções serializadas)
CONFIG.lang = KB_LANG;

/* ════════════════════════════════════════════════════════
   ESTADO
════════════════════════════════════════════════════════ */

let cache   = null;
let loading = false;

/* ════════════════════════════════════════════════════════
   PERSISTÊNCIA
════════════════════════════════════════════════════════ */

function loadFromStorage() {
  try {
    const r = localStorage.getItem(LS_KEY);
    return r ? JSON.parse(r) : null;
  } catch (_) { return null; }
}

function saveToStorage(d) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(d)); } catch (_) {}
}

/* ── Fila de operações offline ──────────────────────────── */

function loadQueue() {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY)) || []; } catch (_) { return []; }
}
function saveQueue(q) {
  try { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); } catch (_) {}
}
function addToQueue(op) {
  const q = loadQueue();
  q.push({ id: Date.now() + '_' + Math.random().toString(36).slice(2, 6), timestamp: new Date().toISOString(), ...op });
  saveQueue(q);
  refreshQueueBadge();
}
function removeFromQueue(id) {
  const q = loadQueue().filter(i => i.id !== id);
  saveQueue(q);
  refreshQueueBadge();
}

function refreshQueueBadge() {
  const q = loadQueue();
  const $badge = $container.find('#kb-queue-badge');
  if (q.length) {
    const txt = q.length + kbTr('queue_n') + (q.length > 1 ? kbTr('queue_s') : '');
    $badge.text(txt).attr('aria-label', txt).show();
  } else {
    $badge.hide();
  }
}

/* ════════════════════════════════════════════════════════
   HELPERS DE BACKEND

   makeRpcBody() é serializado como string e avaliado no
   contexto do backend, onde Buffer e fetch estão disponíveis.
════════════════════════════════════════════════════════ */

/** Cria um executor JSON-RPC. Deve ser chamado dentro de runAsyncOnBackend. */
function makeRpc(apiUrl, apiToken, lang) {
  return async function rpc(method, params) {
    let response;
    try {
      response = await fetch(apiUrl, {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Basic ' + Buffer.from('jsonrpc:' + apiToken).toString('base64'),
        },
        body: JSON.stringify({ jsonrpc: '2.0', method, id: Date.now(), params: params || {} }),
      });
    } catch (e) {
      throw new Error((lang === 'en' ? 'No connection to Kanboard: ' : 'Sem conexão com o Kanboard: ') + e.message);
    }
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return data.result;
  };
}

/**
 * Executa uma chamada ao backend garantindo que erros (rede/sandbox)
 * virem { success:false, error } em vez de rejeitar a promise — os
 * handlers tratam pelo ramo else e a UI nunca fica travada.
 */
function runBackend(fn, args) {
  return Promise.resolve()
    .then(function () { return api.runAsyncOnBackendWithManualTransactionHandling(fn, args); })
    .catch(function (e) { return { success: false, error: (e && e.message) || String(e) }; });
}

/* ── Leitura do cache salvo na nota ──────────────────────── */

async function loadCacheFromNote() {
  return runBackend(async (noteId) => {
    try {
      const raw = await api.getNoteContent(noteId);
      return { success: true, data: JSON.parse(raw) };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }, [CONFIG.cacheNoteId]);
}

/* ── Sincronização completa ──────────────────────────────── */

async function syncFromKanboard() {
  return runBackend(async (cfg, activeStatus, mkRpcSrc) => {
    // eslint-disable-next-line no-eval
    const makeRpcFn = eval('(' + mkRpcSrc + ')');
    const rpc = makeRpcFn(cfg.apiUrl, cfg.apiToken, cfg.lang);

    const allProjects = await rpc('getAllProjects');
    // Filtra apenas projetos ativos (não finalizados)
    const projects = (allProjects || []).filter(p => p.is_active !== 0 && p.is_active !== false);
    // Normaliza IDs para Number na entrada
    for (const p of projects) p.id = Number(p.id);

    let columns = [], tasks = [];
    const failed = [];

    for (const p of projects) {
      let pErr = null;
      try {
        const pc = await rpc('getColumns', { project_id: p.id });
        columns = columns.concat(pc.map(c => ({ ...c, id: Number(c.id), project_id: Number(c.project_id) })));
      } catch (e) { pErr = e; }
      try {
        const pt = await rpc('getAllTasks', { project_id: p.id, status_id: activeStatus });
        tasks = tasks.concat(pt.map(t => ({
          ...t,
          id:         Number(t.id),
          project_id: Number(t.project_id),
          column_id:  Number(t.column_id),
        })));
      } catch (e) { pErr = e; }
      if (pErr) failed.push(p.name || p.title || String(p.id));
    }

    // Limpa cache de projetos fechados
    const activeIds = new Set(projects.map(p => p.id));
    columns = columns.filter(c => activeIds.has(c.project_id));
    tasks = tasks.filter(t => activeIds.has(t.project_id));

    return {
      success: true,
      data: { projects, columns, tasks, lastSync: new Date().toISOString() },
      failed,
    };
  }, [CONFIG, ACTIVE_STATUS, makeRpc.toString()]);
}

/* ── Criar tarefa ───────────────────────────────────────── */

async function createKanboardTask(data) {
  return runBackend(async (cfg, d, mkRpcSrc) => {
    // eslint-disable-next-line no-eval
    const makeRpcFn = eval('(' + mkRpcSrc + ')');
    const rpc = makeRpcFn(cfg.apiUrl, cfg.apiToken, cfg.lang);

    const params = {
      title:      d.title,
      project_id: d.projectId,
      description: d.description || '',
    };
    if (d.colorId)  params.color_id  = d.colorId;
    if (d.columnId) params.column_id = d.columnId;

    const taskId  = await rpc('createTask', params);
    const fullTask = await rpc('getTask', { task_id: taskId });

    return {
      success: true,
      task: {
        ...fullTask,
        id:         Number(fullTask.id),
        project_id: Number(fullTask.project_id),
        column_id:  Number(fullTask.column_id),
      },
    };
  }, [CONFIG, data, makeRpc.toString()]);
}

/* ── Mover tarefa de coluna ─────────────────────────────── */
// Nota: updateTask NÃO aceita column_id — é necessário usar moveTaskPosition.
// swimlane_id: 0 = swimlane padrão; position: 1 = topo da coluna destino.

async function moveTaskColumn(taskId, projectId, columnId) {
  return runBackend(async (cfg, tId, pId, cId, mkRpcSrc) => {
    // eslint-disable-next-line no-eval
    const makeRpcFn = eval('(' + mkRpcSrc + ')');
    const rpc = makeRpcFn(cfg.apiUrl, cfg.apiToken, cfg.lang);

    const ok = await rpc('moveTaskPosition', {
      project_id:  pId,
      task_id:     tId,
      column_id:   cId,
      position:    1,
      swimlane_id: 0,
    });
    return { success: !!ok };
  }, [CONFIG, taskId, projectId, columnId, makeRpc.toString()]);
}

/* ── Deletar tarefa ─────────────────────────────────────── */

async function removeKanboardTask(taskId) {
  return runBackend(async (cfg, tId, mkRpcSrc) => {
    const makeRpcFn = eval('(' + mkRpcSrc + ')');
    const rpc = makeRpcFn(cfg.apiUrl, cfg.apiToken, cfg.lang);
    await rpc('removeTask', { task_id: tId });
    return { success: true };
  }, [CONFIG, taskId, makeRpc.toString()]);
}

/* ── Deletar projeto ────────────────────────────────────── */

async function removeKanboardProject(projectId) {
  return runBackend(async (cfg, pId, mkRpcSrc) => {
    const makeRpcFn = eval('(' + mkRpcSrc + ')');
    const rpc = makeRpcFn(cfg.apiUrl, cfg.apiToken, cfg.lang);
    await rpc('removeProject', { project_id: pId });
    return { success: true };
  }, [CONFIG, projectId, makeRpc.toString()]);
}

/* ════════════════════════════════════════════════════════
   UTILITÁRIOS
════════════════════════════════════════════════════════ */

function esc(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const COLORS = {
  '':       '#94a3b8',
  yellow:   '#f59e0b',
  red:      '#ef4444',
  green:    '#22c55e',
  blue:     '#3b82f6',
  orange:   '#f97316',
  purple:   '#a855f7',
  brown:    '#92400e',
  grey:     '#6b7280',
  pink:     '#ec4899',
};

const COLORS_LIST = [
  { value: '',       key: 'c_default' },
  { value: 'yellow', key: 'c_yellow'  },
  { value: 'red',    key: 'c_red'     },
  { value: 'green',  key: 'c_green'   },
  { value: 'blue',   key: 'c_blue'    },
  { value: 'orange', key: 'c_orange'  },
  { value: 'purple', key: 'c_purple'  },
  { value: 'brown',  key: 'c_brown'   },
  { value: 'grey',   key: 'c_grey'    },
  { value: 'pink',   key: 'c_pink'    },
];

/* Toast com controle de timeout */
function toast(msg, type = 'info') {
  const bg = type === 'error' ? '#b91c1c' : type === 'success' ? '#15803d' : '#1d4ed8';
  const id = 'toast_' + Date.now();
  const $t = $('<div>').attr('id', id).text(msg).css({
    position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
    padding: '10px 18px', borderRadius: 8, fontSize: 12, fontWeight: 600,
    color: '#fff', maxWidth: 360, background: bg,
    boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
    opacity: 0, transform: 'translateY(8px)',
    transition: 'opacity 0.25s, transform 0.25s',
    fontFamily: 'var(--kb-font)',
  });
  $('body').append($t);
  setTimeout(() => $t.css({ opacity: 1, transform: 'translateY(0)' }), 10);
  setTimeout(() => {
    $t.css({ opacity: 0, transform: 'translateY(8px)' });
    setTimeout(() => $t.remove(), 300);
  }, 3500);
}

/* ── Confirmação (modal próprio — confirm() não funciona em iframe sandboxed) ── */

function confirmKb(msg) {
  return new Promise(function (resolve) {
    const $ov = $('<div class="kb-overlay">');
    const $box = $('<div class="kb-dialog" role="dialog" aria-modal="true">').attr('aria-labelledby', 'kb-confirm-title');
    const $ok = $('<button type="button" class="kb-dialog-ok">').text(kbTr('confirm_ok'));
    const $no = $('<button type="button" class="kb-dialog-no">').text(kbTr('confirm_no'));
    $box.append(
      $('<div class="kb-dialog-title">').attr('id', 'kb-confirm-title').text(kbTr('confirm_title')),
      $('<div class="kb-dialog-msg">').text(msg),
      $('<div class="kb-dialog-actions">').append($ok, $no)
    );
    $ov.append($box);
    $('body').append($ov);

    let done = false;
    const fechar = function (v) {
      if (done) return;
      done = true;
      $ov.remove();
      $(document).off('keydown.kbconfirm');
      resolve(v);
    };
    $ok.on('click', function () { fechar(true); });
    $no.on('click', function () { fechar(false); });
    $ov.on('click', function (e) { if (e.target === $ov[0]) fechar(false); });
    $(document).on('keydown.kbconfirm', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); fechar(false); }
      else if (e.key === 'Enter') { e.preventDefault(); fechar(true); }
    });
    $no.focus();
  });
}

let statusTimer = null;
function setStatus($el, msg) {
  if (statusTimer) clearTimeout(statusTimer);
  $el.text(msg);
  if (msg && !msg.startsWith('⟳')) {
    statusTimer = setTimeout(() => $el.text(''), 5000);
  }
}

function buildColMap() {
  const m = {};
  if (cache?.columns) for (const c of cache.columns) m[c.id] = c;
  return m;
}

function buildProjMap() {
  const m = {};
  if (cache?.projects) for (const p of cache.projects) m[p.id] = p.name || p.title || '';
  return m;
}

/* ════════════════════════════════════════════════════════
   CSS
════════════════════════════════════════════════════════ */

$('<style id="kb-styles">').text(`
  :root {
    --kb-font: 'DM Sans', 'Segoe UI', sans-serif;
    --kb-radius: 10px;
    --kb-radius-sm: 6px;
    --kb-transition: 0.18s ease;
    --kb-shadow: 0 2px 12px rgba(0,0,0,0.07);
    --kb-shadow-md: 0 4px 24px rgba(0,0,0,0.11);
    --kb-danger: #dc2626;
    --kb-warn: #b45309;
  }

  #kb-app {
    max-width: 1400px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 16px 20px;
    box-sizing: border-box;
    font-family: var(--kb-font);
    font-size: 15px;
    color: var(--main-text-color);
    background: transparent;
    overflow: hidden;
    gap: 14px;
  }

  /* ── Header ── */
  #kb-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding-bottom: 14px;
    border-bottom: 1.5px solid color-mix(in srgb, var(--main-border-color) 60%, transparent);
  }
  #kb-title {
    font-size: 20px;
    font-weight: 700;
    letter-spacing: -0.3px;
    color: var(--main-text-color);
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
  }
  #kb-title .kb-dot {
    width: 8px; height: 8px; border-radius: 50%;
    background: var(--accent-color);
    box-shadow: 0 0 6px color-mix(in srgb, var(--accent-color) 60%, transparent);
  }
  #kb-status-text {
    font-size: 13px;
    color: var(--muted-text-color);
    font-style: italic;
    transition: color var(--kb-transition);
  }
  #kb-sync-btn {
    display: flex; align-items: center; gap: 6px;
    padding: 7px 16px;
    border: none; border-radius: var(--kb-radius-sm);
    background: var(--accent-color);
    color: #fff; font-size: 14px; font-weight: 600;
    cursor: pointer; white-space: nowrap;
    transition: opacity var(--kb-transition), transform var(--kb-transition);
    font-family: var(--kb-font);
  }
  #kb-sync-btn:hover  { opacity: 0.88; transform: translateY(-1px); }
  #kb-sync-btn:active { transform: translateY(0); }
  #kb-sync-btn:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }

  /* ── Stats bar ── */
  #kb-stats {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }
  .kb-stat {
    display: flex; align-items: center; gap: 6px;
    padding: 6px 12px;
    background: color-mix(in srgb, var(--main-border-color) 18%, transparent);
    border-radius: 20px;
    font-size: 13px;
    font-weight: 500;
    color: var(--muted-text-color);
    border: 1px solid color-mix(in srgb, var(--main-border-color) 40%, transparent);
  }
  .kb-stat strong { color: var(--main-text-color); font-weight: 700; }
  .kb-stat-icon { font-size: 15px; }

  /* ── Main layout ── */
  #kb-body {
    display: flex;
    gap: 16px;
    flex: 1;
    min-height: 0;
  }

  /* ── Left panel (table) ── */
  #kb-left {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-width: 0;
  }
  #kb-toolbar {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .kb-select {
    padding: 6px 10px;
    border: 1px solid var(--main-border-color);
    border-radius: var(--kb-radius-sm);
    font-size: 14px;
    background: var(--main-background-color);
    color: var(--main-text-color);
    font-family: var(--kb-font);
    cursor: pointer;
    transition: border-color var(--kb-transition), box-shadow var(--kb-transition);
    outline: none;
  }
  .kb-select:focus {
    border-color: var(--accent-color);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-color) 18%, transparent);
  }
  #kb-proj-filter { min-width: 160px; }
  #kb-search {
    flex: 1;
    max-width: 280px;
    padding: 6px 10px 6px 30px;
    border: 1px solid var(--main-border-color);
    border-radius: var(--kb-radius-sm);
    font-size: 14px;
    background: var(--main-background-color);
    color: var(--main-text-color);
    font-family: var(--kb-font);
    outline: none;
    transition: border-color var(--kb-transition), box-shadow var(--kb-transition);
  }
  #kb-search:focus {
    border-color: var(--accent-color);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-color) 18%, transparent);
  }
  .kb-search-wrap {
    position: relative;
    display: flex; align-items: center;
    flex: 1; max-width: 280px;
  }
  .kb-search-icon {
    position: absolute; left: 9px;
    font-size: 14px; opacity: 0.45; pointer-events: none;
  }

  /* ── Table ── */
  #kb-table-wrap {
    flex: 1;
    overflow-y: auto;
    border: 1px solid color-mix(in srgb, var(--main-border-color) 60%, transparent);
    border-radius: var(--kb-radius);
    box-shadow: var(--kb-shadow);
    background: color-mix(in srgb, var(--main-background-color) 90%, transparent);
  }
  #kb-table-wrap::-webkit-scrollbar { width: 5px; }
  #kb-table-wrap::-webkit-scrollbar-thumb {
    background: color-mix(in srgb, var(--main-border-color) 80%, transparent);
    border-radius: 10px;
  }
  .kb-table { width: 100%; border-collapse: collapse; }
  .kb-table thead { position: sticky; top: 0; z-index: 2; }
  .kb-table th {
    padding: 10px 12px;
    text-align: left;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.7px;
    font-weight: 700;
    color: var(--muted-text-color);
    background: color-mix(in srgb, var(--main-background-color) 97%, var(--main-border-color));
    border-bottom: 1.5px solid color-mix(in srgb, var(--main-border-color) 50%, transparent);
    white-space: nowrap;
  }
  .kb-table td {
    padding: 10px 12px;
    vertical-align: middle;
    border-bottom: 1px solid color-mix(in srgb, var(--main-border-color) 20%, transparent);
  }
  .kb-table tbody tr { transition: background var(--kb-transition); }
  .kb-table tbody tr:last-child td { border-bottom: none; }
  .kb-table tbody tr:hover { background: color-mix(in srgb, var(--accent-color) 5%, transparent); }

  .kb-task-title { font-weight: 600; font-size: 14.5px; line-height: 1.3; }
  .kb-task-desc  { font-size: 12.5px; color: var(--muted-text-color); margin-top: 2px; line-height: 1.4; }
  .kb-proj-label {
    font-size: 12.5px; font-weight: 600;
    padding: 3px 9px; border-radius: 12px;
    background: color-mix(in srgb, var(--accent-color) 12%, transparent);
    color: var(--accent-color);
    white-space: nowrap;
  }
  .kb-color-dot {
    display: inline-block; width: 10px; height: 10px;
    border-radius: 50%; vertical-align: middle; margin-right: 5px;
    box-shadow: 0 0 0 2px rgba(255,255,255,0.25);
    flex-shrink: 0;
  }
  .kb-color-label {
    display: inline-flex; align-items: center;
    font-size: 13px; font-weight: 500;
    color: var(--muted-text-color);
  }

  /* ── Inline column selector ── */
  .kb-col-select {
    padding: 5px 7px;
    border: 1px solid color-mix(in srgb, var(--main-border-color) 50%, transparent);
    border-radius: 5px;
    font-size: 13px;
    background: var(--main-background-color);
    color: var(--main-text-color);
    font-family: var(--kb-font);
    cursor: pointer;
    max-width: 160px;
    transition: border-color var(--kb-transition), box-shadow var(--kb-transition), opacity var(--kb-transition);
    outline: none;
  }
  .kb-col-select:focus {
    border-color: var(--accent-color);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-color) 18%, transparent);
  }
  .kb-col-select:disabled { opacity: 0.45; cursor: not-allowed; }
  .kb-col-select.kb-saving { opacity: 0.6; }

  /* ── Empty state ── */
  .kb-empty {
    text-align: center;
    padding: 48px 20px;
    color: var(--muted-text-color);
    font-style: italic;
    font-size: 14px;
    line-height: 1.8;
  }
  .kb-empty-icon { font-size: 30px; display: block; margin-bottom: 10px; opacity: 0.5; }

  /* ── Right panel (form) ── */
  #kb-right {
    width: 300px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 0;
    border: 1px solid color-mix(in srgb, var(--main-border-color) 60%, transparent);
    border-radius: var(--kb-radius);
    box-shadow: var(--kb-shadow);
    background: color-mix(in srgb, var(--main-background-color) 90%, transparent);
    overflow: hidden;
  }
  #kb-form-header {
    padding: 12px 16px;
    font-weight: 700;
    letter-spacing: 0.3px;
    border-bottom: 1px solid color-mix(in srgb, var(--main-border-color) 40%, transparent);
    background: color-mix(in srgb, var(--main-border-color) 8%, transparent);
    display: flex; align-items: center; gap: 7px;
    text-transform: uppercase; letter-spacing: 0.6px; font-size: 12px;
    color: var(--muted-text-color);
  }
  #kb-form-body {
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 11px;
    overflow-y: auto;
    flex: 1;
  }
  #kb-form-body::-webkit-scrollbar { width: 4px; }
  #kb-form-body::-webkit-scrollbar-thumb {
    background: color-mix(in srgb, var(--main-border-color) 80%, transparent);
    border-radius: 10px;
  }
  .kb-field { display: flex; flex-direction: column; gap: 4px; }
  .kb-label {
    font-size: 11.5px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.5px; color: var(--muted-text-color);
  }
  .kb-input {
    padding: 7px 9px;
    border: 1px solid var(--main-border-color);
    border-radius: var(--kb-radius-sm);
    font-size: 14px;
    background: var(--main-background-color);
    color: var(--main-text-color);
    font-family: var(--kb-font);
    outline: none;
    width: 100%; box-sizing: border-box;
    transition: border-color var(--kb-transition), box-shadow var(--kb-transition);
  }
  .kb-input:focus {
    border-color: var(--accent-color);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-color) 18%, transparent);
  }
  textarea.kb-input { resize: vertical; min-height: 64px; }
  .kb-color-preview {
    display: flex; align-items: center; gap: 6px;
  }
  .kb-color-preview-dot {
    width: 13px; height: 13px; border-radius: 50%;
    background: var(--main-border-color);
    flex-shrink: 0; transition: background 0.2s;
    box-shadow: 0 0 0 2px rgba(255,255,255,0.2);
  }
  #kb-submit-btn {
    padding: 10px 14px;
    border: none; border-radius: var(--kb-radius-sm);
    background: var(--accent-color); color: #fff;
    font-size: 14px; font-weight: 700;
    cursor: pointer; width: 100%;
    font-family: var(--kb-font);
    transition: opacity var(--kb-transition), transform var(--kb-transition);
    margin-top: 2px;
  }
  #kb-submit-btn:hover  { opacity: 0.88; transform: translateY(-1px); }
  #kb-submit-btn:active { transform: translateY(0); }
  #kb-submit-btn:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }
  #kb-create-status {
    font-size: 12.5px; text-align: center;
    color: var(--muted-text-color); min-height: 16px;
    transition: color var(--kb-transition);
  }

  /* ── Project form ── */
  #kb-proj-section {
    border-top: 1px solid color-mix(in srgb, var(--main-border-color) 40%, transparent);
    margin-top: 4px;
    padding: 14px 16px;
    display: flex; flex-direction: column; gap: 9px;
  }
  #kb-proj-section .kb-label { margin-bottom: 0; }
  #kb-proj-status {
    font-size: 12px; text-align: center;
    color: var(--muted-text-color); min-height: 14px;
  }
  #kb-proj-btn { width: 100%; }

  /* ── Queue badge ── */
  #kb-queue-badge {
    display: none;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 12px; font-weight: 600;
    background: var(--kb-warn); color: #fff;
    cursor: pointer;
    transition: opacity var(--kb-transition);
  }
  #kb-queue-badge:hover { opacity: 0.85; }

  /* ── Hover delete ── */
  .kb-del-btn {
    cursor:pointer; opacity:0.15; transition:opacity 0.15s; font-size:13px;
    background:none; border:none; padding:4px 6px; line-height:1;
    color:inherit; font-family:inherit; border-radius:4px;
  }
  tr:hover .kb-del-btn, .kb-del-btn:focus-visible { opacity:1; }
  .kb-del-btn:hover { opacity:1; }
  .kb-del-proj-btn:hover { opacity:0.88; }
  .kb-del-proj-btn:active { transform:translateY(1px); }

  /* ── Config warning ── */
  #kb-config-warn {
    margin: 24px;
    padding: 18px 20px;
    border: 1.5px solid var(--kb-warn);
    border-radius: var(--kb-radius);
    background: color-mix(in srgb, #f59e0b 8%, transparent);
    font-size: 12.5px; line-height: 1.7;
  }
  #kb-config-warn strong { color: var(--main-text-color); }
  #kb-config-warn code {
    background: color-mix(in srgb, #f59e0b 15%, transparent);
    padding: 1px 5px; border-radius: 3px; font-size: 11.5px;
  }

  /* ── Botões do painel ── */
  .kb-btn-primary, .kb-btn-danger {
    padding: 8px 14px; border: none; border-radius: var(--kb-radius-sm);
    color: #fff; font-size: 14px; font-weight: 600; cursor: pointer; width: 100%;
    font-family: var(--kb-font);
  }
  .kb-btn-primary { background: var(--accent-color); }
  .kb-btn-danger  { background: var(--kb-danger); }
  .kb-btn-primary:hover, .kb-btn-danger:hover { opacity: 0.88; }
  .kb-btn-primary:active, .kb-btn-danger:active { transform: translateY(1px); }
  .kb-sep { border:none; border-top:1px solid color-mix(in srgb, var(--main-border-color) 40%, transparent); margin:8px 0; }

  /* ── Foco visível (teclado) ── */
  button:focus-visible,
  .kb-select:focus-visible,
  .kb-input:focus-visible,
  .kb-col-select:focus-visible,
  #kb-queue-badge:focus-visible {
    outline: 2px solid var(--accent-color);
    outline-offset: 1px;
  }

  /* ── Modal de confirmação ── */
  .kb-overlay {
    position: fixed; inset: 0; z-index: 10000; display: flex;
    align-items: center; justify-content: center;
    background: rgba(0,0,0,.45); padding: 16px;
  }
  .kb-dialog {
    background: var(--main-background-color); color: var(--main-text-color);
    border: 1px solid var(--main-border-color); border-radius: var(--kb-radius);
    padding: 16px; max-width: 420px; width: 100%; box-shadow: var(--kb-shadow-md);
  }
  .kb-dialog-title { font-weight: 700; font-size: 14px; margin-bottom: 8px; }
  .kb-dialog-msg { font-size: 14px; line-height: 1.5; white-space: pre-line; margin-bottom: 14px; }
  .kb-dialog-actions { display: flex; gap: 8px; justify-content: flex-end; }
  .kb-dialog-ok, .kb-dialog-no {
    padding: 8px 16px; border-radius: var(--kb-radius-sm); cursor: pointer;
    font-family: var(--kb-font); font-size: 14px; font-weight: 600;
    border: 1px solid var(--main-border-color);
  }
  .kb-dialog-ok { background: var(--kb-danger); color: #fff; border-color: var(--kb-danger); }
  .kb-dialog-no { background: var(--main-background-color); color: var(--main-text-color); }

  @media (prefers-reduced-motion: reduce) {
    #kb-app, #kb-app * { transition: none !important; animation: none !important; }
  }

  /* ── Responsive ── */
  @media (max-width: 820px) {
    #kb-body { flex-direction: column; }
    #kb-right { width: 100%; }
  }
`).appendTo('head');

/* ════════════════════════════════════════════════════════
   CHECAGEM DE CONFIG
════════════════════════════════════════════════════════ */

function checkConfig() {
  const url = String(CONFIG.apiUrl || '');
  const tok = String(CONFIG.apiToken || '');
  const nid = String(CONFIG.cacheNoteId || '');
  const badUrl = url.includes('yourdomain') || url.includes('YOUR-KANBOARD');
  const badTok = tok === 'yourtoken' || tok === 'YOUR_API_TOKEN';
  const badNid = nid === 'noteid' || nid.startsWith('ID_DA_NOTA');

  if (badUrl || badTok || badNid) {
    const $warn = $('<div id="kb-config-warn">').append(
      $('<strong>').text(kbTr('cfg_title')),
      $('<br>'), $('<br>'),
      document.createTextNode(kbTr('cfg_intro')),
      $('<br>')
    );
    if (badUrl) $warn.append($('<div>').text('• ' + kbTr('cfg_url')));
    if (badTok) $warn.append($('<div>').text('• ' + kbTr('cfg_token')));
    if (badNid) $warn.append($('<div>').text('• ' + kbTr('cfg_noteid')));
    $warn.append($('<br>'), $('<em style="font-size:11.5px">').text(kbTr('cfg_hint')));
    $container.empty().css({ padding: 0 }).append($warn);
    return false;
  }
  return true;
}

/* ════════════════════════════════════════════════════════
   RENDER
════════════════════════════════════════════════════════ */

function refreshStats() {
  const p = (cache?.projects || []).length;
  const t = (cache?.tasks    || []).length;
  const c = (cache?.columns  || []).length;
  const ts = cache?.lastSync
    ? new Date(cache.lastSync).toLocaleString(KB_LANG === 'en' ? 'en-US' : 'pt-BR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })
    : kbTr('never');
  const tsSafe = (ts === 'Invalid Date') ? kbTr('never') : ts;

  $container.find('#kb-stats').html(
    `<span class="kb-stat"><span class="kb-stat-icon">📦</span>${kbTr('stat_projects')} <strong>${p}</strong></span>` +
    `<span class="kb-stat"><span class="kb-stat-icon">📋</span>${kbTr('stat_tasks')} <strong>${t}</strong></span>` +
    `<span class="kb-stat"><span class="kb-stat-icon">📌</span>${kbTr('stat_columns')} <strong>${c}</strong></span>` +
    `<span class="kb-stat"><span class="kb-stat-icon">🕐</span>${kbTr('stat_sync')} <strong>${tsSafe}</strong></span>`
  );
}

function refreshProjFilter() {
  const $sel = $container.find('#kb-proj-filter');
  const cur  = $sel.val();
  let h = '<option value="">' + esc(kbTr('f_all')) + '</option>';
  if (cache?.projects) for (const p of cache.projects)
    h += `<option value="${p.id}">${esc(p.name || p.title)}</option>`;
  $sel.html(h).val(cur || '');
}

function refreshFormProjs() {
  const $sel = $container.find('#kb-f-proj');
  let h = '<option value="">' + esc(kbTr('sel_ph')) + '</option>';
  if (cache?.projects) for (const p of cache.projects)
    h += `<option value="${p.id}">${esc(p.name || p.title)}</option>`;
  $sel.html(h);
}

function refreshFormCols(keepVal) {
  const $sel = $container.find('#kb-f-col');
  const pid  = Number($container.find('#kb-f-proj').val());
  if (!pid || !cache?.columns) {
    $sel.html('<option value="">—</option>').prop('disabled', true);
    return;
  }
  const cols = cache.columns.filter(c => c.project_id === pid);
  $sel.html(cols.map(c => `<option value="${c.id}">${esc(c.title)}</option>`).join(''))
      .prop('disabled', false);
  if (keepVal) $sel.val(keepVal);
}

function refreshFormColors() {
  $container.find('#kb-f-color').html(
    COLORS_LIST.map(c =>
      `<option value="${c.value}">${esc(kbTr(c.key))}</option>`
    ).join('')
  );
}

function renderTasks() {
  const $tb    = $container.find('#kb-tbody');
  const projId = $container.find('#kb-proj-filter').val();
  const search = ($container.find('#kb-search').val() || '').toLowerCase().trim();
  const cMap   = buildColMap();
  const pMap   = buildProjMap();

  let tasks = cache ? [...(cache.tasks || [])] : [];
  if (projId) tasks = tasks.filter(t => String(t.project_id) === projId);
  if (search) tasks = tasks.filter(t =>
    (t.title || '').toLowerCase().includes(search) ||
    (t.description || '').toLowerCase().includes(search)
  );

  if (!tasks.length) {
    const msg = cache
      ? esc(kbTr('empty_none'))
      : esc(kbTr('empty_a')) + '<strong>' + esc(kbTr('btn_sync')) + '</strong>' + esc(kbTr('empty_b'));
    $tb.html(
      `<tr><td colspan="5">
        <div class="kb-empty">
          <span class="kb-empty-icon">🗂️</span>
          ${msg}
        </div>
      </td></tr>`
    );
    return;
  }

  $tb.html(tasks.map(t => {
    const color    = COLORS[t.color_id] || COLORS[''];
    const desc     = t.description
      ? `<div class="kb-task-desc">${esc(t.description.slice(0, 70))}${t.description.length > 70 ? '…' : ''}</div>`
      : '';
    const projName = esc(pMap[t.project_id] || '');

    // Coluna: dropdown inline com todas as colunas do projeto
    const projCols = cache.columns.filter(c => c.project_id === t.project_id);
    const colSelect = projCols.length
      ? `<select class="kb-col-select" data-task-id="${t.id}" data-project-id="${t.project_id}" aria-label="${esc(kbTr('lbl_column'))}">${projCols.map(c =>
          `<option value="${c.id}" ${c.id === t.column_id ? 'selected' : ''}>${esc(c.title)}</option>`
        ).join('')}</select>`
      : (cMap[t.column_id] ? esc(cMap[t.column_id].title) : '—');

    return `<tr>
      <td><span class="kb-proj-label">${projName}</span></td>
      <td><div class="kb-task-title">${esc(t.title)}</div>${desc}</td>
      <td>${colSelect}</td>
      <td>
        <span class="kb-color-label">
          <span class="kb-color-dot" style="background:${color}"></span>
          ${esc(t.color_id || '—')}
        </span>
      </td>
      <td><button type="button" class="kb-del-btn" data-task-id="${t.id}" aria-label="${esc(kbTr('ar_del_task'))}" title="${esc(kbTr('ar_del_task'))}">🗑️</button></td>
    </tr>`;
  }).join(''));

  // Delegação: mudança de coluna inline
  $tb.find('.kb-col-select').off('change').on('change', handleMoveTask);
  // Delegação: deletar tarefa
  $tb.find('.kb-del-btn').off('click').on('click', function () {
    handleDeleteTask(Number($(this).data('task-id')));
  });
}

function refreshAll() {
  refreshStats();
  refreshProjFilter();
  refreshFormProjs();
  refreshFormCols();
  refreshDelProj();
  renderTasks();
}

function refreshDelProj() {
  const $sel = $container.find('#kb-del-proj');
  if (!$sel.length) return;
  if (!cache?.projects?.length) {
    $sel.html('<option value="">' + esc(kbTr('no_projects')) + '</option>');
    return;
  }
  $sel.html('<option value="">' + esc(kbTr('sel_ph')) + '</option>' +
    cache.projects.map(p => `<option value="${p.id}">${esc(p.name||p.title)}</option>`).join(''));
}

/* ════════════════════════════════════════════════════════
   EVENTOS
════════════════════════════════════════════════════════ */

async function handleSync() {
  if (loading) return;
  loading = true;
  const $btn = $container.find('#kb-sync-btn').prop('disabled', true).attr('aria-busy', 'true');
  const $st  = $container.find('#kb-status-text');
  setStatus($st, kbTr('sync_busy'));

  try {
    const r = await syncFromKanboard();
    if (r.success) {
      cache = r.data;
      saveToStorage(cache);
      setStatus($st, '✓ ' + r.data.tasks.length + kbTr('sync_ok') + r.data.projects.length + kbTr('sync_ok2'));
      if (r.failed && r.failed.length) toast(r.failed.length + kbTr('sync_partial'), 'error');
      refreshAll();
    } else {
      setStatus($st, kbTr('sync_err'));
      toast(r.error || kbTr('sync_fail'), 'error');
    }
  } finally {
    $btn.prop('disabled', false).removeAttr('aria-busy');
    loading = false;
  }
}

async function handleCreateTask(e) {
  e.preventDefault();
  const pid    = Number($container.find('#kb-f-proj').val());
  const cid    = Number($container.find('#kb-f-col').val()) || null;
  const title  = String($container.find('#kb-f-title').val() || '').trim();
  const desc   = String($container.find('#kb-f-desc').val() || '').trim();
  const colorId = $container.find('#kb-f-color').val();

  if (!pid)   { toast(kbTr('err_sel_proj'), 'error');  return; }
  if (!title) { toast(kbTr('err_title'),     'error');  return; }

  const $btn = $container.find('#kb-submit-btn').prop('disabled', true).attr('aria-busy', 'true');
  const $st  = $container.find('#kb-create-status');
  $st.text(kbTr('creating'));

  try {
    const r = await createKanboardTask({ projectId: pid, columnId: cid, title, description: desc, colorId });
    if (r.success) {
      toast(kbTr('task_created_a') + title + kbTr('task_created_b'), 'success');
      $container.find('#kb-f-title').val('');
      $container.find('#kb-f-desc').val('');
      $st.text(kbTr('created') + r.task.id + ')');
      if (cache) {
        cache.tasks.push(r.task);
        cache.lastSync = new Date().toISOString();
        saveToStorage(cache);
        refreshAll();
      }
    } else {
      toast(kbTr('err_generic') + (r.error || ''), 'error');
      $st.text('✗ ' + (r.error || kbTr('err_generic')));
    }
  } finally {
    $btn.prop('disabled', false).removeAttr('aria-busy');
    setTimeout(() => $st.text(''), 4000);
  }
}

async function handleMoveTask(e) {
  const $sel    = $(e.target);
  const taskId  = Number($sel.data('task-id'));
  const colId   = Number($sel.val());
  const projId  = Number($sel.data('project-id'));

  $sel.addClass('kb-saving').prop('disabled', true);

  try {
    const r = await moveTaskColumn(taskId, projId, colId);
    if (r.success) {
      // Atualiza cache local
      const task = cache && cache.tasks.find(t => t.id === taskId);
      if (task) {
        task.column_id = colId;
        cache.lastSync = new Date().toISOString();
        saveToStorage(cache);
      }
      toast(kbTr('col_updated'), 'success');
      refreshStats();
    } else {
      toast(kbTr('err_move') + (r.error || ''), 'error');
      // Reverte o select visualmente
      const task = cache && cache.tasks.find(t => t.id === taskId);
      if (task) $sel.val(task.column_id);
    }
  } finally {
    $sel.removeClass('kb-saving').prop('disabled', false);
  }
}

async function handleDeleteTask(taskId) {
  const okDel = await confirmKb(kbTr('confirm_del_task'));
  if (!okDel) return;
  const r = await removeKanboardTask(taskId);
  if (r.success) {
    if (cache) {
      cache.tasks = cache.tasks.filter(t => t.id !== taskId);
      cache.lastSync = new Date().toISOString();
      saveToStorage(cache);
      renderTasks();
      refreshStats();
    }
    toast(kbTr('task_deleted'), 'success');
  } else {
    toast(kbTr('err_del') + (r.error || ''), 'error');
  }
}

async function handleDeleteProject() {
  const pid = Number($container.find('#kb-del-proj').val());
  if (!pid) { toast(kbTr('err_sel_proj'), 'error'); return; }
  const projName = $container.find('#kb-del-proj option:selected').text();
  const okDel = await confirmKb(kbTr('confirm_del_proj_a') + projName + kbTr('confirm_del_proj_b'));
  if (!okDel) return;

  const $btn = $container.find('#kb-del-proj-btn').prop('disabled', true).attr('aria-busy', 'true');
  try {
    const r = await removeKanboardProject(pid);
    if (r.success) {
      if (cache) {
        cache.projects = cache.projects.filter(p => p.id !== pid);
        cache.tasks = cache.tasks.filter(t => t.project_id !== pid);
        cache.columns = cache.columns.filter(c => c.project_id !== pid);
        cache.lastSync = new Date().toISOString();
        saveToStorage(cache);
        refreshAll();
        refreshFormCols();
      }
      toast(kbTr('proj_deleted_a') + projName + kbTr('proj_deleted_b'), 'success');
    } else {
      toast(kbTr('err_del') + (r.error || ''), 'error');
    }
  } finally {
    $btn.prop('disabled', false).removeAttr('aria-busy');
  }
}

async function handleCreateProject() {
  const name = String($container.find('#kb-new-proj-name').val() || '').trim();
  if (!name) { toast(kbTr('err_proj_name'), 'error'); return; }

  const $btn = $container.find('#kb-proj-btn').prop('disabled', true).attr('aria-busy', 'true');
  const $st  = $container.find('#kb-proj-status');
  $st.text(kbTr('creating'));

  try {
    const r = await createKanboardProject(name);
    if (r.success) {
      $container.find('#kb-new-proj-name').val('');
      const msg = r.existed ? (kbTr('proj_exists_a') + name + kbTr('proj_exists_b')) : (kbTr('proj_created_a') + name + kbTr('proj_created_b'));
      $st.text('✓ ' + msg);
      toast(msg, r.existed ? 'info' : 'success');
      // Atualiza cache com o projeto e suas colunas
      if (cache) {
        if (r.project) {
          const exists = cache.projects.find(p => p.id === r.project.id);
          if (!exists) cache.projects.push(r.project);
        }
        if (r.columns && r.columns.length) {
          for (const c of r.columns) {
            const cExists = cache.columns.find(x => x.id === c.id);
            if (!cExists) cache.columns.push({ ...c, project_id: c.project_id || r.project.id });
          }
        }
        cache.lastSync = new Date().toISOString();
        saveToStorage(cache);
        refreshAll();
        refreshFormCols();
      }
    } else {
      // Offline — adiciona à fila
      addToQueue({ op: 'createProject', name });
      $st.text(kbTr('offline_queued'));
      toast(kbTr('offline_toast'), 'info');
    }
  } finally {
    $btn.prop('disabled', false).removeAttr('aria-busy');
    setTimeout(() => $st.text(''), 4000);
  }
}

async function handleProcessQueue() {
  const q = loadQueue();
  if (!q.length) { toast(kbTr('no_pending'), 'info'); return; }

  const $badge = $container.find('#kb-queue-badge');
  $badge.text(kbTr('sync_busy'));

  try {
    const r = await processPendingOps();
    if (r.success) {
      let ok = 0, fail = 0;
      for (const res of (r.results || [])) {
        if (res.success) {
          ok++;
          removeFromQueue(res.id);
          if (cache) {
            if (res.project) {
              const exists = cache.projects.find(p => p.id === res.project.id);
              if (!exists) cache.projects.push(res.project);
            }
            if (res.columns && res.columns.length) {
              for (const c of res.columns) {
                const cExists = cache.columns.find(x => x.id === c.id);
                if (!cExists) cache.columns.push({ ...c, project_id: c.project_id || res.project.id });
              }
            }
          }
        } else {
          fail++;
        }
      }
      if (cache) { cache.lastSync = new Date().toISOString(); saveToStorage(cache); }
      refreshAll();
      refreshFormCols();
      refreshQueueBadge();
      toast(kbTr('queue_result') + ok + kbTr('queue_ok') + (fail ? ', ' + fail + kbTr('queue_erros') : ''), fail ? 'error' : 'success');
    } else {
      toast(kbTr('err_queue') + (r.error || ''), 'error');
      refreshQueueBadge();
    }
  } finally {
    refreshQueueBadge();
  }
}

/* ── Criar projeto ──────────────────────────────────────── */

async function createKanboardProject(name) {
  return runBackend(async (cfg, projName, mkRpcSrc) => {
    const makeRpcFn = eval('(' + mkRpcSrc + ')');
    const rpc = makeRpcFn(cfg.apiUrl, cfg.apiToken, cfg.lang);
    const existing = await rpc('getProjectByName', { name: projName });
    if (existing) {
      const cols = await rpc('getColumns', { project_id: existing.id });
      return { success: true, project: existing, columns: cols, existed: true };
    }
    const projectId = await rpc('createProject', { name: projName });
    // Adiciona o dono como membro para aparecer no dashboard do Kanboard
    try {
      const me = await rpc('getMe');
      if (me && me.id) await rpc('addProjectUser', { project_id: projectId, user_id: me.id, role: 'project-manager' });
    } catch (_) {}
    const full = await rpc('getProjectById', { project_id: projectId });
    const cols = await rpc('getColumns', { project_id: projectId });
    return { success: true, project: full, columns: cols, existed: false };
  }, [CONFIG, name, makeRpc.toString()]);
}

/* ── Processar fila de operações pendentes ───────────────── */

async function processPendingOps() {
  const q = loadQueue();
  if (!q.length) return { success: true, processed: 0 };

  return runBackend(async (cfg, ops, mkRpcSrc) => {
    const makeRpcFn = eval('(' + mkRpcSrc + ')');
    const rpc = makeRpcFn(cfg.apiUrl, cfg.apiToken, cfg.lang);
    const results = [];

    for (const op of ops) {
      try {
        switch (op.op) {
          case 'createProject': {
            const existing = await rpc('getProjectByName', { name: op.name });
            if (existing) {
              const cols = await rpc('getColumns', { project_id: existing.id });
              results.push({ id: op.id, success: true, existed: true, project: existing, columns: cols });
            } else {
              const pid = await rpc('createProject', { name: op.name });
              try {
                const me = await rpc('getMe');
                if (me && me.id) await rpc('addProjectUser', { project_id: pid, user_id: me.id, role: 'project-manager' });
              } catch (_) {}
              const full = await rpc('getProjectById', { project_id: pid });
              const cols = await rpc('getColumns', { project_id: pid });
              results.push({ id: op.id, success: true, existed: false, project: full, columns: cols });
            }
            break;
          }
          default:
            results.push({ id: op.id, success: false, error: 'Unknown operation: ' + op.op });
        }
      } catch (e) {
        results.push({ id: op.id, success: false, error: e.message });
      }
    }
    return { success: true, results };
  }, [CONFIG, q, makeRpc.toString()]);
}

/* ════════════════════════════════════════════════════════
   INIT
════════════════════════════════════════════════════════ */

(async function () {
  const $root = $container;
  $root.empty().css({ padding: 0, overflow: 'hidden', height: '100%' });

  if (!checkConfig()) return;

  /* ── Header ── */
  const $hdr = $('<div id="kb-header">').append(
    $('<span id="kb-title">').html('<span class="kb-dot"></span> ' + esc(kbTr('title'))),
    $('<span id="kb-status-text" role="status" aria-live="polite">'),
    $('<span id="kb-queue-badge" role="button" tabindex="0">')
      .on('click', handleProcessQueue)
      .on('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleProcessQueue(); } }),
    $('<button id="kb-sync-btn" type="button">').text(kbTr('btn_sync')).on('click', handleSync)
  );

  /* ── Stats ── */
  const $stats = $('<div id="kb-stats">');

  /* ── Toolbar ── */
  const $toolbar = $('<div id="kb-toolbar">').append(
    $('<select id="kb-proj-filter" class="kb-select" aria-label="' + esc(kbTr('f_all')) + '">').on('change', renderTasks),
    $('<div class="kb-search-wrap">').append(
      $('<span class="kb-search-icon" aria-hidden="true">').text('🔍'),
      $('<input id="kb-search" type="text" placeholder="' + esc(kbTr('search_ph')) + '" aria-label="' + esc(kbTr('search_ar')) + '">').on('input', renderTasks)
    )
  );

  /* ── Table ── */
  const $table = $('<table class="kb-table">').append(
    $('<thead>').append(
      $('<tr>').append(
        $('<th scope="col">').text(kbTr('th_project')).css('width','110px'),
        $('<th scope="col">').text(kbTr('th_task')),
        $('<th scope="col">').text(kbTr('th_column')).css('width','155px'),
        $('<th scope="col">').text(kbTr('th_color')).css('width','85px'),
        $('<th scope="col">').attr('aria-label', kbTr('th_actions')).css('width','36px')
      )
    ),
    $('<tbody id="kb-tbody">')
  );
  const $tableWrap = $('<div id="kb-table-wrap">').append($table);

  /* ── Left panel ── */
  const $left = $('<div id="kb-left">').append($toolbar, $tableWrap);

  /* ── Form ── */
  const mkField = (label, el) => {
    const id = el.attr('id');
    const $lbl = $('<label class="kb-label">').text(label);
    if (id) $lbl.attr('for', id);
    return $('<div class="kb-field">').append($lbl, el);
  };

  const $fProj  = $('<select id="kb-f-proj" class="kb-input" aria-label="' + esc(kbTr('lbl_project')) + '">').on('change', () => refreshFormCols());
  const $fCol   = $('<select id="kb-f-col" class="kb-input" aria-label="' + esc(kbTr('lbl_column')) + '">').prop('disabled', true);
  const $fColor = $('<select id="kb-f-color" class="kb-input" aria-label="' + esc(kbTr('lbl_color')) + '">').on('change', function () {
    $container.find('.kb-color-preview-dot')
      .css('background', COLORS[$(this).val()] || COLORS['']);
  });
  const $fTitle = $('<input id="kb-f-title" type="text" class="kb-input" placeholder="' + esc(kbTr('ph_title')) + '" required>');
  const $fDesc  = $('<textarea id="kb-f-desc" class="kb-input" placeholder="' + esc(kbTr('ph_desc')) + '" rows="3">');

  const $colorWrap = $('<div class="kb-color-preview">').append(
    $('<span class="kb-color-preview-dot">'),
    $fColor
  );

  const $form = $('<div>').css({ display:'flex', flexDirection:'column', gap:11 })
    .append(
      mkField(kbTr('lbl_project'), $fProj),
      mkField(kbTr('lbl_column'),  $fCol),
      mkField(kbTr('lbl_color'),   $colorWrap),
      mkField(kbTr('lbl_title'),   $fTitle),
      mkField(kbTr('lbl_desc'),    $fDesc),
      $('<button id="kb-submit-btn" type="button">').text(kbTr('btn_create_task')).on('click', handleCreateTask),
      $('<div id="kb-create-status" role="status" aria-live="polite">')
    );

  const $right = $('<div id="kb-right">').append(
    $('<div id="kb-form-header">').text(kbTr('form_new')),
    $('<div id="kb-form-body">').append($form),
    $('<div id="kb-proj-section">').append(
      $('<div class="kb-label">').text(kbTr('sec_new_proj')),
      $('<input id="kb-new-proj-name" class="kb-input" type="text" placeholder="' + esc(kbTr('ph_proj_name')) + '" aria-label="' + esc(kbTr('ph_proj_name')) + '">'),
      $('<button id="kb-proj-btn" type="button" class="kb-btn-primary">').text(kbTr('btn_create_proj')).on('click', handleCreateProject),
      $('<div id="kb-proj-status" role="status" aria-live="polite">'),
      $('<hr class="kb-sep">'),
      $('<div class="kb-label" style="margin-bottom:4px">').text(kbTr('sec_del_proj')),
      $('<select id="kb-del-proj" class="kb-input" aria-label="' + esc(kbTr('ar_del_proj')) + '">').append(
        cache?.projects?.length
          ? '<option value="">' + esc(kbTr('sel_ph')) + '</option>' + cache.projects.map(p => `<option value="${p.id}">${esc(p.name||p.title)}</option>`).join('')
          : '<option value="">' + esc(kbTr('no_projects')) + '</option>'
      ),
      $('<button id="kb-del-proj-btn" type="button" class="kb-btn-danger">').text(kbTr('btn_del_proj')).on('click', handleDeleteProject)
    )
  );

  /* ── Body ── */
  const $body = $('<div id="kb-body">').append($left, $right);

  /* ── App root ── */
  $root.append(
    $('<div id="kb-app">').append($hdr, $stats, $body)
  );

  refreshFormColors();
  refreshAll();
  refreshQueueBadge();

  /* ── Carrega cache ── */
  // 1. localStorage (imediato)
  const stored = loadFromStorage();
  if (stored) { cache = stored; refreshAll(); }

  // 2. Nota (fonte canônica — sobrescreve se mais recente)
  try {
    const r = await loadCacheFromNote();
    if (r.success && r.data?.lastSync) {
      const noteIsNewer = !cache?.lastSync || new Date(r.data.lastSync) > new Date(cache.lastSync);
      if (noteIsNewer) {
        cache = r.data;
        saveToStorage(cache);
        refreshAll();
      }
    }
  } catch (_) {}
})();
