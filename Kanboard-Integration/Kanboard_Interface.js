/**
 * Kanboard Sync — TriliumNext Plugin
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

const LS_KEY = 'kb_cache_v2';

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

/* ════════════════════════════════════════════════════════
   HELPERS DE BACKEND

   makeRpcBody() é serializado como string e avaliado no
   contexto do backend, onde Buffer e fetch estão disponíveis.
════════════════════════════════════════════════════════ */

/** Cria um executor JSON-RPC. Deve ser chamado dentro de runAsyncOnBackend. */
function makeRpc(apiUrl, apiToken) {
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
      throw new Error('Sem conexão com o Kanboard: ' + e.message);
    }
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return data.result;
  };
}

/* ── Leitura do cache salvo na nota ──────────────────────── */

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

/* ── Sincronização completa ──────────────────────────────── */

async function syncFromKanboard() {
  return api.runAsyncOnBackendWithManualTransactionHandling(async (cfg, activeStatus, mkRpcSrc) => {
    // eslint-disable-next-line no-eval
    const makeRpcFn = eval('(' + mkRpcSrc + ')');
    const rpc = makeRpcFn(cfg.apiUrl, cfg.apiToken);

    const projects = await rpc('getAllProjects');
    // Normaliza IDs para Number na entrada
    for (const p of projects) p.id = Number(p.id);

    let columns = [], tasks = [];

    for (const p of projects) {
      try {
        const pc = await rpc('getColumns', { project_id: p.id });
        columns = columns.concat(pc.map(c => ({ ...c, id: Number(c.id), project_id: Number(c.project_id) })));
      } catch (_) {}
      try {
        const pt = await rpc('getAllTasks', { project_id: p.id, status_id: activeStatus });
        tasks = tasks.concat(pt.map(t => ({
          ...t,
          id:         Number(t.id),
          project_id: Number(t.project_id),
          column_id:  Number(t.column_id),
        })));
      } catch (_) {}
    }

    return {
      success: true,
      data: { projects, columns, tasks, lastSync: new Date().toISOString() },
    };
  }, [CONFIG, ACTIVE_STATUS, makeRpc.toString()]);
}

/* ── Criar tarefa ───────────────────────────────────────── */

async function createKanboardTask(data) {
  return api.runAsyncOnBackendWithManualTransactionHandling(async (cfg, d, mkRpcSrc) => {
    // eslint-disable-next-line no-eval
    const makeRpcFn = eval('(' + mkRpcSrc + ')');
    const rpc = makeRpcFn(cfg.apiUrl, cfg.apiToken);

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
  return api.runAsyncOnBackendWithManualTransactionHandling(async (cfg, tId, pId, cId, mkRpcSrc) => {
    // eslint-disable-next-line no-eval
    const makeRpcFn = eval('(' + mkRpcSrc + ')');
    const rpc = makeRpcFn(cfg.apiUrl, cfg.apiToken);

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

/* ════════════════════════════════════════════════════════
   UTILITÁRIOS
════════════════════════════════════════════════════════ */

function esc(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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
  { value: '',       label: 'Padrão'    },
  { value: 'yellow', label: 'Amarelo'   },
  { value: 'red',    label: 'Vermelho'  },
  { value: 'green',  label: 'Verde'     },
  { value: 'blue',   label: 'Azul'      },
  { value: 'orange', label: 'Laranja'   },
  { value: 'purple', label: 'Roxo'      },
  { value: 'brown',  label: 'Marrom'    },
  { value: 'grey',   label: 'Cinza'     },
  { value: 'pink',   label: 'Rosa'      },
];

/* Toast com controle de timeout */
const toastTimers = {};
function toast(msg, type = 'info') {
  const bg = type === 'error' ? '#ef4444' : type === 'success' ? '#22c55e' : '#3b82f6';
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
  const timer = setTimeout(() => {
    $t.css({ opacity: 0, transform: 'translateY(8px)' });
    setTimeout(() => $t.remove(), 300);
  }, 3500);
  toastTimers[id] = timer;
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

  /* ── Config warning ── */
  #kb-config-warn {
    margin: 24px;
    padding: 18px 20px;
    border: 1.5px solid #f59e0b;
    border-radius: var(--kb-radius);
    background: color-mix(in srgb, #f59e0b 8%, transparent);
    font-size: 12.5px; line-height: 1.7;
  }
  #kb-config-warn strong { color: #d97706; }
  #kb-config-warn code {
    background: color-mix(in srgb, #f59e0b 15%, transparent);
    padding: 1px 5px; border-radius: 3px; font-size: 11.5px;
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
  const bad =
    CONFIG.apiUrl.includes('SEU-KANBOARD') ||
    CONFIG.apiToken === 'SEU_TOKEN_AQUI' ||
    CONFIG.cacheNoteId.startsWith('ID_DA_NOTA');

  if (bad) {
    $container.empty().css({ padding: 0 }).append(
      $('<div id="kb-config-warn">').html(
        '<strong>⚠️ Configuração necessária</strong><br><br>' +
        'Edite as constantes no início do código:<br>' +
        (CONFIG.apiUrl.includes('SEU-KANBOARD')
          ? '• <code>CONFIG.apiUrl</code> — URL do seu Kanboard<br>' : '') +
        (CONFIG.apiToken === 'SEU_TOKEN_AQUI'
          ? '• <code>CONFIG.apiToken</code> — Token da API<br>' : '') +
        (CONFIG.cacheNoteId.startsWith('ID_DA_NOTA')
          ? '• <code>CONFIG.cacheNoteId</code> — ID da nota kanboard_cache<br>' : '') +
        '<br><em style="font-size:11.5px">Para copiar o ID: clique com direito na nota → Copiar ID da nota</em>'
      )
    );
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
    ? new Date(cache.lastSync).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })
    : 'nunca';

  $container.find('#kb-stats').html(
    `<span class="kb-stat"><span class="kb-stat-icon">📦</span>Projetos <strong>${p}</strong></span>` +
    `<span class="kb-stat"><span class="kb-stat-icon">📋</span>Tarefas <strong>${t}</strong></span>` +
    `<span class="kb-stat"><span class="kb-stat-icon">📌</span>Colunas <strong>${c}</strong></span>` +
    `<span class="kb-stat"><span class="kb-stat-icon">🕐</span>Sync <strong>${ts}</strong></span>`
  );
}

function refreshProjFilter() {
  const $sel = $container.find('#kb-proj-filter');
  const cur  = $sel.val();
  let h = '<option value="">Todos os projetos</option>';
  if (cache?.projects) for (const p of cache.projects)
    h += `<option value="${p.id}">${esc(p.name || p.title)}</option>`;
  $sel.html(h).val(cur || '');
}

function refreshFormProjs() {
  const $sel = $container.find('#kb-f-proj');
  let h = '<option value="">Selecione…</option>';
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
      `<option value="${c.value}">${c.label}</option>`
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
    $tb.html(
      `<tr><td colspan="5">
        <div class="kb-empty">
          <span class="kb-empty-icon">🗂️</span>
          ${cache ? 'Nenhuma tarefa encontrada' : 'Clique em <strong>Sincronizar</strong> para buscar dados'}
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
      ? `<select class="kb-col-select" data-task-id="${t.id}" data-project-id="${t.project_id}">
          ${projCols.map(c =>
            `<option value="${c.id}" ${c.id === t.column_id ? 'selected' : ''}>${esc(c.title)}</option>`
          ).join('')}
        </select>`
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
    </tr>`;
  }).join(''));

  // Delegação: mudança de coluna inline
  $tb.find('.kb-col-select').off('change').on('change', handleMoveTask);
}

function refreshAll() {
  refreshStats();
  refreshProjFilter();
  refreshFormProjs();
  refreshFormCols();
  renderTasks();
}

/* ════════════════════════════════════════════════════════
   EVENTOS
════════════════════════════════════════════════════════ */

async function handleSync() {
  if (loading) return;
  loading = true;
  const $btn = $container.find('#kb-sync-btn').prop('disabled', true);
  const $st  = $container.find('#kb-status-text');
  setStatus($st, '⟳ Sincronizando…');

  const r = await syncFromKanboard();
  if (r.success) {
    cache = r.data;
    saveToStorage(cache);
    setStatus($st, `✓ ${r.data.tasks.length} tarefas · ${r.data.projects.length} projetos`);
    refreshAll();
  } else {
    setStatus($st, '✗ Erro na sync');
    toast(r.error || 'Falha na sincronização', 'error');
  }

  $btn.prop('disabled', false);
  loading = false;
}

async function handleCreateTask(e) {
  e.preventDefault();
  const pid    = Number($container.find('#kb-f-proj').val());
  const cid    = Number($container.find('#kb-f-col').val()) || null;
  const title  = $container.find('#kb-f-title').val().trim();
  const desc   = $container.find('#kb-f-desc').val().trim();
  const colorId = $container.find('#kb-f-color').val();

  if (!pid)   { toast('Selecione um projeto.', 'error');  return; }
  if (!title) { toast('Digite um título.',     'error');  return; }

  const $btn = $container.find('#kb-submit-btn').prop('disabled', true);
  const $st  = $container.find('#kb-create-status');
  $st.text('Criando…');

  const r = await createKanboardTask({ projectId: pid, columnId: cid, title, description: desc, colorId });

  if (r.success) {
    toast(`Tarefa "${title}" criada!`, 'success');
    $container.find('#kb-f-title').val('');
    $container.find('#kb-f-desc').val('');
    $st.text(`✓ Criada (ID ${r.task.id})`);
    if (cache) {
      cache.tasks.push(r.task);
      cache.lastSync = new Date().toISOString();
      saveToStorage(cache);
      refreshAll();
    }
  } else {
    toast('Erro: ' + (r.error || 'desconhecido'), 'error');
    $st.text('✗ ' + (r.error || 'Erro'));
  }

  $btn.prop('disabled', false);
  setTimeout(() => $st.text(''), 4000);
}

async function handleMoveTask(e) {
  const $sel    = $(e.target);
  const taskId  = Number($sel.data('task-id'));
  const colId   = Number($sel.val());
  const projId  = Number($sel.data('project-id'));

  $sel.addClass('kb-saving').prop('disabled', true);

  const r = await moveTaskColumn(taskId, projId, colId);

  if (r.success) {
    // Atualiza cache local
    const task = cache.tasks.find(t => t.id === taskId);
    if (task) {
      task.column_id = colId;
      cache.lastSync = new Date().toISOString();
      saveToStorage(cache);
    }
    toast('Coluna atualizada', 'success');
    refreshStats();
  } else {
    toast('Erro ao mover tarefa: ' + (r.error || ''), 'error');
    // Reverte o select visualmente
    const task = cache.tasks.find(t => t.id === taskId);
    if (task) $sel.val(task.column_id);
  }

  $sel.removeClass('kb-saving').prop('disabled', false);
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
    $('<span id="kb-title">').html('<span class="kb-dot"></span> Kanboard'),
    $('<span id="kb-status-text">'),
    $('<button id="kb-sync-btn">').html('↻ Sincronizar').on('click', handleSync)
  );

  /* ── Stats ── */
  const $stats = $('<div id="kb-stats">');

  /* ── Toolbar ── */
  const $toolbar = $('<div id="kb-toolbar">').append(
    $('<select id="kb-proj-filter" class="kb-select">').on('change', renderTasks),
    $('<div class="kb-search-wrap">').append(
      $('<span class="kb-search-icon">').text('🔍'),
      $('<input id="kb-search" type="text" placeholder="Buscar tarefas…">').on('input', renderTasks)
    )
  );

  /* ── Table ── */
  const $table = $('<table class="kb-table">').append(
    $('<thead>').append(
      $('<tr>').append(
        $('<th>').text('Projeto').css('width','110px'),
        $('<th>').text('Tarefa'),
        $('<th>').text('Coluna').css('width','165px'),
        $('<th>').text('Cor').css('width','90px')
      )
    ),
    $('<tbody id="kb-tbody">')
  );
  const $tableWrap = $('<div id="kb-table-wrap">').append($table);

  /* ── Left panel ── */
  const $left = $('<div id="kb-left">').append($toolbar, $tableWrap);

  /* ── Form ── */
  const mkField = (label, el) =>
    $('<div class="kb-field">').append($('<label class="kb-label">').text(label), el);

  const $fProj  = $('<select id="kb-f-proj" class="kb-input">').on('change', () => refreshFormCols());
  const $fCol   = $('<select id="kb-f-col" class="kb-input">').prop('disabled', true);
  const $fColor = $('<select id="kb-f-color" class="kb-input">').on('change', function () {
    $container.find('.kb-color-preview-dot')
      .css('background', COLORS[$(this).val()] || COLORS['']);
  });
  const $fTitle = $('<input id="kb-f-title" type="text" class="kb-input" placeholder="Título da tarefa" required>');
  const $fDesc  = $('<textarea id="kb-f-desc" class="kb-input" placeholder="Descrição (opcional)" rows="3">');

  const $colorWrap = $('<div class="kb-color-preview">').append(
    $('<span class="kb-color-preview-dot">'),
    $fColor
  );

  const $form = $('<form>').css({ display:'flex', flexDirection:'column', gap:11 })
    .append(
      mkField('Projeto', $fProj),
      mkField('Coluna',  $fCol),
      mkField('Cor',     $colorWrap),
      mkField('Título',  $fTitle),
      mkField('Descrição', $fDesc),
      $('<button id="kb-submit-btn" type="submit">').text('+ Criar Tarefa'),
      $('<div id="kb-create-status">')
    )
    .on('submit', handleCreateTask);

  const $right = $('<div id="kb-right">').append(
    $('<div id="kb-form-header">').html('✏ Nova Tarefa'),
    $('<div id="kb-form-body">').append($form)
  );

  /* ── Body ── */
  const $body = $('<div id="kb-body">').append($left, $right);

  /* ── App root ── */
  $root.append(
    $('<div id="kb-app">').append($hdr, $stats, $body)
  );

  refreshFormColors();
  refreshAll();

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
