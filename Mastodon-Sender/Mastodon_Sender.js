/**
 * Mastodon Sender — TriliumNext Plugin
 *
 * Modo: JS Frontend (renderNote)
 * Crie uma nota JS Frontend, cole este código e aponte ~renderNote para ela.
 *
 * ═══════════════════════════════════════════════════════════════
 *  CONFIGURAÇÃO
 * ═══════════════════════════════════════════════════════════════
 */

const CONFIG = {
  instance: 'https://instance',
  apiToken: 'SEU_TOKEN_DE_ACESSO',
};

const LS_KEY = 'ms_history';

/* ════════════════════════════════════════════════════════
   ESTADO
════════════════════════════════════════════════════════ */

let posting = false;
let history = [];

/* ════════════════════════════════════════════════════════
   PERSISTÊNCIA
════════════════════════════════════════════════════════ */

function loadHistory() {
  try { const r = localStorage.getItem(LS_KEY); history = r ? JSON.parse(r) : []; } catch (_) { history = []; }
}
function saveHistory() {
  try { localStorage.setItem(LS_KEY, JSON.stringify(history.slice(0, 20))); } catch (_) {}
}

/* ════════════════════════════════════════════════════════
   HELPERS DE BACKEND
════════════════════════════════════════════════════════ */

async function postToMastodon(statusText, visibility, spoilerText) {
  return api.runAsyncOnBackendWithManualTransactionHandling(async (cfg, body) => {
    const { instance, apiToken } = cfg;
    let response;
    try {
      response = await fetch(instance.replace(/\/+$/, '') + '/api/v1/statuses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + apiToken,
        },
        body: JSON.stringify(body),
      });
    } catch (e) {
      return { success: false, error: 'Connection failed: ' + e.message };
    }
      const text = await response.text();
      let data;
      try { data = JSON.parse(text); } catch (_) { data = {}; }
      if (!response.ok) {
        const detail = data.error || (data.errors ? data.errors.join(', ') : 'HTTP ' + response.status);
        return { success: false, error: detail };
      }
      return { success: true, data };
  }, [CONFIG, { status: statusText, visibility, spoiler_text: spoilerText || '' }]);
}

async function getCurrentNote() {
  return api.runOnBackend(async () => {
    try {
      const note = api.getActiveContextNote();
      if (!note) return null;
      const content = note.getContent();
      return {
        title: note.title,
        content: content ? content.replace(/<[^>]+>/g, '').trim().slice(0, 1000) : '',
      };
    } catch (_) {
      return null;
    }
  });
}

/* ════════════════════════════════════════════════════════
   CSS
════════════════════════════════════════════════════════ */

$('<style id="ms-styles">').text(`
  :root {
    --ms-font: 'DM Sans', 'Segoe UI', sans-serif;
    --ms-radius: 10px;
    --ms-radius-sm: 6px;
    --ms-transition: 0.18s ease;
    --ms-shadow: 0 2px 12px rgba(0,0,0,0.07);
  }

  #ms-app {
    max-width: 680px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 20px 24px;
    box-sizing: border-box;
    font-family: var(--ms-font);
    font-size: 15px;
    color: var(--main-text-color);
    background: transparent;
    overflow: hidden;
    gap: 16px;
  }

  /* ── Header ── */
  #ms-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding-bottom: 14px;
    border-bottom: 1.5px solid color-mix(in srgb, var(--main-border-color) 60%, transparent);
  }
  #ms-title {
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -0.3px;
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 1;
  }
  #ms-title .ms-dot {
    width: 10px; height: 10px; border-radius: 50%;
    background: #6364ff;
    box-shadow: 0 0 8px color-mix(in srgb, #6364ff 60%, transparent);
  }
  #ms-status-text {
    font-size: 14px;
    color: var(--muted-text-color);
    font-style: italic;
    transition: color var(--ms-transition);
  }

  /* ── Compose card ── */
  #ms-card {
    border: 1px solid color-mix(in srgb, var(--main-border-color) 60%, transparent);
    border-radius: var(--ms-radius);
    box-shadow: var(--ms-shadow);
    background: color-mix(in srgb, var(--main-background-color) 90%, transparent);
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  #ms-card-header {
    padding: 14px 18px;
    font-size: 13px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    color: var(--muted-text-color);
    border-bottom: 1px solid color-mix(in srgb, var(--main-border-color) 40%, transparent);
    background: color-mix(in srgb, var(--main-border-color) 6%, transparent);
    display: flex; align-items: center; gap: 8px;
  }
  #ms-card-body {
    padding: 18px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  #ms-textarea {
    width: 100%;
    box-sizing: border-box;
    padding: 12px 14px;
    border: 1px solid var(--main-border-color);
    border-radius: var(--ms-radius-sm);
    font-size: 16px;
    line-height: 1.5;
    font-family: var(--ms-font);
    background: var(--main-background-color);
    color: var(--main-text-color);
    resize: vertical;
    min-height: 120px;
    outline: none;
    transition: border-color var(--ms-transition), box-shadow var(--ms-transition);
  }
  #ms-textarea:focus {
    border-color: #6364ff;
    box-shadow: 0 0 0 3px color-mix(in srgb, #6364ff 18%, transparent);
  }
  #ms-textarea::placeholder {
    color: var(--muted-text-color);
    opacity: 0.6;
  }

  .ms-row {
    display: flex;
    gap: 10px;
    align-items: center;
    flex-wrap: wrap;
  }

  .ms-input {
    padding: 8px 10px;
    border: 1px solid var(--main-border-color);
    border-radius: var(--ms-radius-sm);
    font-size: 15px;
    font-family: var(--ms-font);
    background: var(--main-background-color);
    color: var(--main-text-color);
    outline: none;
    transition: border-color var(--ms-transition), box-shadow var(--ms-transition);
  }
  .ms-input:focus {
    border-color: #6364ff;
    box-shadow: 0 0 0 3px color-mix(in srgb, #6364ff 18%, transparent);
  }
  #ms-cw {
    flex: 1;
    min-width: 120px;
  }

  .ms-select {
    padding: 8px 10px;
    border: 1px solid var(--main-border-color);
    border-radius: var(--ms-radius-sm);
    font-size: 15px;
    font-family: var(--ms-font);
    background: var(--main-background-color);
    color: var(--main-text-color);
    cursor: pointer;
    outline: none;
    transition: border-color var(--ms-transition), box-shadow var(--ms-transition);
  }
  .ms-select:focus {
    border-color: #6364ff;
    box-shadow: 0 0 0 3px color-mix(in srgb, #6364ff 18%, transparent);
  }

  .ms-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 9px 18px;
    border: none;
    border-radius: var(--ms-radius-sm);
    font-size: 15px;
    font-weight: 600;
    font-family: var(--ms-font);
    cursor: pointer;
    white-space: nowrap;
    transition: opacity var(--ms-transition), transform var(--ms-transition);
  }
  .ms-btn:hover  { opacity: 0.88; transform: translateY(-1px); }
  .ms-btn:active { transform: translateY(0); }
  .ms-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

  .ms-btn-primary {
    background: #6364ff;
    color: #fff;
  }
  .ms-btn-secondary {
    background: color-mix(in srgb, var(--main-border-color) 30%, transparent);
    color: var(--main-text-color);
    border: 1px solid color-mix(in srgb, var(--main-border-color) 50%, transparent);
  }
  .ms-btn-note {
    background: color-mix(in srgb, #6364ff 12%, transparent);
    color: #6364ff;
    border: 1px solid color-mix(in srgb, #6364ff 25%, transparent);
  }

  #ms-counter {
    font-size: 14px;
    font-weight: 600;
    color: var(--muted-text-color);
    margin-left: auto;
  }
  #ms-counter.ms-warn { color: #f59e0b; }
  #ms-counter.ms-over { color: #ef4444; }

  #ms-create-status {
    font-size: 14px;
    text-align: center;
    color: var(--muted-text-color);
    min-height: 20px;
    transition: color var(--ms-transition);
  }

  /* ── History ── */
  #ms-history {
    border: 1px solid color-mix(in srgb, var(--main-border-color) 60%, transparent);
    border-radius: var(--ms-radius);
    box-shadow: var(--ms-shadow);
    background: color-mix(in srgb, var(--main-background-color) 90%, transparent);
    overflow: hidden;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
  #ms-history-header {
    padding: 14px 18px;
    font-size: 13px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    color: var(--muted-text-color);
    border-bottom: 1px solid color-mix(in srgb, var(--main-border-color) 40%, transparent);
    background: color-mix(in srgb, var(--main-border-color) 6%, transparent);
    display: flex; align-items: center; gap: 8px;
  }
  #ms-history-list {
    overflow-y: auto;
    padding: 6px 0;
    flex: 1;
  }
  #ms-history-list::-webkit-scrollbar { width: 4px; }
  #ms-history-list::-webkit-scrollbar-thumb {
    background: color-mix(in srgb, var(--main-border-color) 80%, transparent);
    border-radius: 10px;
  }
  .ms-history-empty {
    text-align: center;
    padding: 32px 20px;
    color: var(--muted-text-color);
    font-style: italic;
    font-size: 14px;
  }
  .ms-history-item {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 10px 18px;
    border-bottom: 1px solid color-mix(in srgb, var(--main-border-color) 12%, transparent);
    transition: background var(--ms-transition);
  }
  .ms-history-item:last-child { border-bottom: none; }
  .ms-history-item:hover { background: color-mix(in srgb, var(--accent-color) 4%, transparent); }
  .ms-history-icon {
    font-size: 16px;
    margin-top: 1px;
    flex-shrink: 0;
  }
  .ms-history-body {
    flex: 1;
    min-width: 0;
  }
  .ms-history-text {
    font-size: 15px;
    line-height: 1.4;
    color: var(--main-text-color);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .ms-history-meta {
    font-size: 13px;
    color: var(--muted-text-color);
    margin-top: 2px;
  }
  .ms-history-meta a {
    color: #6364ff;
    text-decoration: none;
  }
  .ms-history-meta a:hover {
    text-decoration: underline;
  }

  /* ── Config warning ── */
  #ms-config-warn {
    margin: 24px;
    padding: 18px 20px;
    border: 1.5px solid #f59e0b;
    border-radius: var(--ms-radius);
    background: color-mix(in srgb, #f59e0b 8%, transparent);
    font-size: 13px; line-height: 1.7;
  }
  #ms-config-warn strong { color: #d97706; }
  #ms-config-warn code {
    background: color-mix(in srgb, #f59e0b 15%, transparent);
    padding: 1px 5px; border-radius: 3px;
  }

  /* ── Toast ── */
  .ms-toast {
    position: fixed; bottom: 24px; right: 24px; z-index: 9999;
    padding: 12px 20px; border-radius: var(--ms-radius-sm);
    font-size: 14px; font-weight: 600; color: #fff; max-width: 380px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.18);
    opacity: 0; transform: translateY(8px);
    transition: opacity 0.25s, transform 0.25s;
    font-family: var(--ms-font);
  }
`).appendTo('head');

/* ════════════════════════════════════════════════════════
   UTILITÁRIOS
════════════════════════════════════════════════════════ */

function esc(s) {
  if (s == null) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function toast(msg, type) {
  const bg = type === 'error' ? '#ef4444' : type === 'success' ? '#22c55e' : '#6364ff';
  const $t = $('<div class="ms-toast">').text(msg).css('background', bg);
  $('body').append($t);
  setTimeout(() => $t.css({ opacity: 1, transform: 'translateY(0)' }), 10);
  setTimeout(() => {
    $t.css({ opacity: 0, transform: 'translateY(8px)' });
    setTimeout(() => $t.remove(), 300);
  }, 3500);
}

let statusTimer = null;
function setStatus($el, msg) {
  if (statusTimer) clearTimeout(statusTimer);
  $el.text(msg);
  if (msg && !msg.startsWith('⟳')) {
    statusTimer = setTimeout(() => $el.text(''), 5000);
  }
}

function updateCounter() {
  const len = $container.find('#ms-textarea').val().length;
  const $counter = $container.find('#ms-counter');
  $counter.text(len + '/500');
  $counter.removeClass('ms-warn ms-over');
  if (len > 480) $counter.addClass('ms-warn');
  if (len > 500) $counter.addClass('ms-over');
}

function refreshHistory() {
  const $list = $container.find('#ms-history-list');
  if (!history.length) {
    $list.html('<div class="ms-history-empty">No posts yet</div>');
    return;
  }
  $list.html(history.map(h =>
    '<div class="ms-history-item">' +
      '<span class="ms-history-icon">✓</span>' +
      '<div class="ms-history-body">' +
        '<div class="ms-history-text">' + esc(h.text) + '</div>' +
        '<div class="ms-history-meta">' +
          new Date(h.date).toLocaleString() +
          (h.url ? ' · <a href="' + esc(h.url) + '" target="_blank">' + esc(h.url) + '</a>' : '') +
        '</div>' +
      '</div>' +
    '</div>'
  ).join(''));
}

/* ════════════════════════════════════════════════════════
   CHECAGEM DE CONFIG
════════════════════════════════════════════════════════ */

function checkConfig() {
  const bad = CONFIG.apiToken === 'SEU_TOKEN_DE_ACESSO' || CONFIG.instance.includes('SEU');
  if (bad) {
    $container.empty().append(
      $('<div id="ms-config-warn">').html(
        '<strong>⚠️ Configuration required</strong><br><br>' +
        'Edit the constants at the top of the code:<br>' +
        '• <code>CONFIG.instance</code> — your Mastodon instance URL (e.g. https://bolha.us)<br>' +
        '• <code>CONFIG.apiToken</code> — your access token<br><br>' +
        '<em>Get a token: Mastodon → Preferences → Development → New Application → generate token with <code>read write</code></em>'
      )
    );
    return false;
  }
  return true;
}

/* ════════════════════════════════════════════════════════
   EVENTOS
════════════════════════════════════════════════════════ */

async function handlePost() {
  if (posting) return;
  const text = $container.find('#ms-textarea').val().trim();
  if (!text) { toast('Write something first!', 'error'); return; }
  if (text.length > 500) { toast('Toot is too long (' + text.length + '/500)', 'error'); return; }

  posting = true;
  const $btn = $container.find('#ms-post-btn').prop('disabled', true);
  const $st  = $container.find('#ms-create-status');
  const visibility = $container.find('#ms-visibility').val();
  const cw = $container.find('#ms-cw').val().trim();
  $st.text('⟳ Posting…');

  const r = await postToMastodon(text, visibility, cw);
  if (r.success) {
    const url = r.data.url || r.data.uri || '';
    history.unshift({ text: text.slice(0, 100), date: new Date().toISOString(), url });
    saveHistory();
    refreshHistory();
    $container.find('#ms-textarea').val('');
    $container.find('#ms-cw').val('');
    updateCounter();
    $st.text('✓ Posted!');
    toast('Posted successfully!', 'success');
  } else {
    $st.text('✗ Error: ' + r.error);
    toast('Error: ' + r.error, 'error');
  }

  $btn.prop('disabled', false);
  posting = false;
  setTimeout(() => $st.text(''), 5000);
}

async function handleCurrentNote() {
  const $st = $container.find('#ms-create-status');
  $st.text('⟳ Loading note…');
  const note = await getCurrentNote();
  if (!note || !note.title) {
    $st.text('✗ Could not get current note');
    setTimeout(() => $st.text(''), 3000);
    return;
  }
  let text = note.title;
  if (note.content) text += '\n\n' + note.content.slice(0, 480);
  if (text.length > 500) text = text.slice(0, 497) + '…';
  $container.find('#ms-textarea').val(text);
  updateCounter();
  $st.text('✓ Note loaded — review and post');
  setTimeout(() => $st.text(''), 4000);
}

/* ════════════════════════════════════════════════════════
   INIT
════════════════════════════════════════════════════════ */

(async function () {
  const $root = $container;
  $root.empty().css({ padding: 0, overflow: 'hidden', height: '100%' });

  if (!checkConfig()) return;

  loadHistory();

  /* ── Header ── */
  const $hdr = $('<div id="ms-header">').append(
    $('<div id="ms-title">').html('<span class="ms-dot"></span> Mastodon'),
    $('<span id="ms-status-text">')
  );

  /* ── Compose card ── */
  const $textarea = $('<textarea id="ms-textarea" placeholder="What\'s on your mind?">')
    .on('input', updateCounter);
  const $cw = $('<input id="ms-cw" class="ms-input" placeholder="Content warning (optional)">');
  const $vis = $('<select id="ms-visibility" class="ms-select">').html(
    '<option value="public">🌍 Public</option>' +
    '<option value="unlisted">🔓 Unlisted</option>' +
    '<option value="private">🔒 Followers only</option>' +
    '<option value="direct">✉ Direct</option>'
  );
  const $counter = $('<span id="ms-counter">').text('0/500');
  const $postBtn = $('<button id="ms-post-btn" class="ms-btn ms-btn-primary">').html('📤 Post').on('click', handlePost);
  const $noteBtn = $('<button class="ms-btn ms-btn-note">').html('📋 Current note').on('click', handleCurrentNote);
  const $status = $('<div id="ms-create-status">');

  const $cardBody = $('<div id="ms-card-body">').append(
    $textarea,
    $('<div class="ms-row">').append(
      $('<span style="font-size:14px;font-weight:600;color:var(--muted-text-color)">⚠️ CW</span>'),
      $cw,
      $('<span style="font-size:14px;font-weight:600;color:var(--muted-text-color)">🔒</span>'),
      $vis,
      $counter
    ),
    $('<div class="ms-row">').append($postBtn, $noteBtn, $status)
  );

  const $card = $('<div id="ms-card">').append(
    $('<div id="ms-card-header">').html('✏ Compose'),
    $cardBody
  );

  /* ── History ── */
  const $historyList = $('<div id="ms-history-list">');
  const $historyPanel = $('<div id="ms-history">').append(
    $('<div id="ms-history-header">').html('📜 Recent posts'),
    $historyList
  );

  /* ── App ── */
  const $app = $('<div id="ms-app">').append($hdr, $card, $historyPanel);
  $root.append($app);

  updateCounter();
  refreshHistory();
})();
