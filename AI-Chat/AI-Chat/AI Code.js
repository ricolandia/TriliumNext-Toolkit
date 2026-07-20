const $c = $container;

$c.html(`
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  .chat-wrap {
    display: flex; flex-direction: column; height: 100%;
    padding: 14px; gap: 8px;
    font-family: var(--font-family, sans-serif);
    color: var(--main-text-color);
  }

  /* ── Contexto ── */
  .chat-ctx {
    display: flex; align-items: center; gap: 6px;
    padding: 10px 14px;
    background: var(--accented-background-color);
    border: 1px solid var(--main-border-color);
    border-radius: 6px; font-size: 15px;
    color: var(--muted-text-color);
  }
  .chat-ctx input {
    flex: 1; border: none; background: transparent;
    color: var(--main-text-color); font-size: 15px; outline: none;
  }
  .chat-ctx button {
    padding: 2px 8px; font-size: 14px; cursor: pointer;
    background: var(--button-background-color);
    border: 1px solid var(--main-border-color);
    border-radius: 4px; color: var(--main-text-color);
  }
  .chat-ctx button:hover { filter: brightness(1.1); }
  .chat-label { font-size: 14px; white-space: nowrap; opacity: 0.7; }
  .chat-ctx-title {
    font-size: 14px; font-weight: 600;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    max-width: 180px;
  }

  /* ── Persona / System prompt ── */
  .chat-persona {
    display: flex; flex-direction: column; gap: 5px;
    padding: 10px 14px;
    background: var(--accented-background-color);
    border: 1px solid var(--main-border-color);
    border-radius: 6px;
  }
  .persona-row {
    display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  }
  .persona-row select {
    flex: 1; min-width: 0;
    padding: 4px 8px; font-size: 14px;
    background: var(--button-background-color);
    border: 1px solid var(--main-border-color);
    border-radius: 4px; color: var(--main-text-color);
    cursor: pointer;
  }
  .persona-row select:focus { outline: none; border-color: var(--main-color, #448); }
  .persona-row select option {
    background: var(--accented-background-color);
    color: var(--main-text-color);
  }
  .btn-persona-toggle {
    padding: 4px 10px; cursor: pointer; font-size: 13px;
    background: var(--button-background-color);
    border: 1px solid var(--main-border-color);
    border-radius: 4px; color: var(--muted-text-color);
    white-space: nowrap; transition: filter 0.1s;
  }
  .btn-persona-toggle:hover { filter: brightness(1.1); }
  .persona-prompt-wrap { display: none; }
  .persona-prompt-wrap.open { display: block; }
  .persona-prompt-wrap textarea {
    width: 100%; padding: 8px 10px; font-size: 14px; resize: vertical;
    border: 1px solid var(--main-border-color); border-radius: 5px;
    background: var(--accented-background-color);
    color: var(--main-text-color);
    font-family: inherit; line-height: 1.45; min-height: 60px;
  }
  .persona-prompt-wrap textarea:focus { outline: none; border-color: var(--main-color, #448); }
  .persona-hint { font-size: 12px; color: var(--muted-text-color); opacity: 0.8; margin-top: 2px; }

  /* ── Comandos rápidos ── */
  .chat-cmds {
    display: flex; align-items: center; gap: 5px; flex-wrap: wrap;
    padding: 7px 12px;
    background: var(--accented-background-color);
    border: 1px solid var(--main-border-color);
    border-radius: 6px;
  }
  .btn-cmd {
    padding: 4px 10px; cursor: pointer; font-size: 13px;
    background: var(--button-background-color);
    border: 1px solid var(--main-border-color);
    border-radius: 4px; color: var(--main-text-color);
    white-space: nowrap; transition: filter 0.1s;
  }
  .btn-cmd:hover:not(:disabled) { filter: brightness(1.15); }
  .btn-cmd:disabled { opacity: 0.45; cursor: not-allowed; }

  /* ── Toolbar ── */
  .chat-toolbar {
    display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
  }
  .chat-toolbar input {
    flex: 1; min-width: 100px; padding: 5px 10px; font-size: 13px;
    border: 1px solid var(--main-border-color); border-radius: 4px;
    background: var(--accented-background-color);
    color: var(--main-text-color); outline: none;
  }
  .chat-toolbar .btn-icon {
    padding: 4px 8px; cursor: pointer; font-size: 13px;
    background: var(--button-background-color);
    border: 1px solid var(--main-border-color);
    border-radius: 4px; color: var(--muted-text-color);
  }
  .chat-toolbar .btn-icon:hover { filter: brightness(1.1); }

  .model-badge {
    font-size: 11px; opacity: 0.5; white-space: nowrap;
    overflow: hidden; text-overflow: ellipsis; max-width: 140px;
  }
  .chk-subnotes {
    display: flex; align-items: center; gap: 4px;
    font-size: 12px; opacity: 0.55; cursor: pointer;
    white-space: nowrap;
  }
  .chk-subnotes input { cursor: pointer; }

  ::placeholder { color: var(--muted-text-color); opacity: 0.5; }
  :-ms-input-placeholder { color: var(--muted-text-color); opacity: 0.5; }

  /* ── Mensagens ── */
  .chat-messages {
    flex: 1; overflow-y: auto; min-height: 140px;
    border: 1px solid var(--main-border-color);
    border-radius: 6px; padding: 10px;
    display: flex; flex-direction: column; gap: 6px;
  }
  .msg { display: flex; flex-direction: column; gap: 1px; }
  .msg-header {
    display: flex; align-items: center; gap: 6px;
  }
  .msg-label {
    font-size: 12px; font-weight: 700; opacity: 0.55;
    text-transform: uppercase; letter-spacing: 0.04em;
  }
  .msg-timestamp {
    font-size: 11px; opacity: 0.35; margin-left: 2px;
  }
  .msg-actions { display: none; margin-left: auto; gap: 3px; }
  .msg:hover .msg-actions { display: flex; }
  .msg-actions button {
    padding: 1px 6px; font-size: 11px; cursor: pointer;
    border: none; background: transparent; color: var(--muted-text-color);
    border-radius: 3px; opacity: 0.6;
  }
  .msg-actions button:hover { opacity: 1; background: var(--button-background-color); }
  .msg-body { font-size: 15px; line-height: 1.55; }
  .msg-user .msg-body {
    padding: 6px 10px;
    background: var(--accented-background-color);
    border-radius: 6px; cursor: pointer;
  }
  .msg-user .msg-body:hover { filter: brightness(1.03); }
  .msg-ai .msg-label { color: var(--muted-text-color); }
  .msg-ai .msg-body {
    padding: 8px 10px;
    background: var(--accented-background-color);
    border-left: 3px solid var(--main-color, #448);
    border-radius: 0 4px 4px 0;
  }
  .msg + .msg-user .msg-label,
  .msg + .msg-ai .msg-label { display: none; }
  .msg + .msg-user .msg-header,
  .msg + .msg-ai .msg-header { margin-top: 6px; }
  .msg-user + .msg-user .msg-header { margin-top: 0; }
  .msg-ai + .msg-ai .msg-header { margin-top: 0; }

  .msg-collapse-toggle {
    display: inline-block; margin-top: 4px; padding: 2px 8px;
    font-size: 12px; cursor: pointer; border: none; border-radius: 3px;
    background: transparent; color: var(--main-color, #448); opacity: 0.7;
  }
  .msg-collapse-toggle:hover { opacity: 1; text-decoration: underline; }

  .msg-error .msg-body { color: #c0392b; font-style: italic; font-size: 14px; }
  .msg-system .msg-body { font-size: 13px; text-align: center; opacity: 0.45; font-style: italic; }
  .msg-hidden { display: none; }

  /* ── Markdown ── */
  .msg-body h1, .msg-body h2, .msg-body h3, .msg-body h4 {
    margin: 10px 0 4px; line-height: 1.3;
  }
  .msg-body h1 { font-size: 1.3em; }
  .msg-body h2 { font-size: 1.15em; }
  .msg-body h3 { font-size: 1.05em; }
  .msg-body h4 { font-size: 1em; }
  .msg-body h1:first-child, .msg-body h2:first-child { margin-top: 0; }
  .msg-body p { margin: 4px 0; }
  .msg-body p:first-child { margin-top: 0; }
  .msg-body p:last-child { margin-bottom: 0; }
  .msg-body ul, .msg-body ol { margin: 4px 0; padding-left: 22px; }
  .msg-body li { margin: 2px 0; }
  .msg-body blockquote {
    margin: 6px 0; padding: 4px 10px;
    border-left: 3px solid var(--main-border-color); opacity: 0.85;
  }
  .msg-body code {
    padding: 1px 5px; font-size: 0.9em;
    background: rgba(128,128,128,0.15);
    border-radius: 3px; font-family: 'Consolas', 'Monaco', monospace;
  }
  .msg-body pre {
    margin: 6px 0; padding: 10px;
    background: rgba(0,0,0,0.07);
    border: 1px solid var(--main-border-color);
    border-radius: 5px; overflow-x: auto;
  }
  .msg-body pre code {
    padding: 0; background: none; font-size: 0.85em;
    line-height: 1.45; white-space: pre;
  }
  .msg-body table {
    border-collapse: collapse; margin: 6px 0; font-size: 0.9em;
    width: 100%;
  }
  .msg-body th, .msg-body td {
    border: 1px solid var(--main-border-color);
    padding: 4px 8px; text-align: left;
  }
  .msg-body th { background: rgba(128,128,128,0.1); font-weight: 600; }
  .msg-body hr { margin: 8px 0; border: none; border-top: 1px solid var(--main-border-color); }
  .msg-body a { color: var(--main-color, #448); text-decoration: underline; }
  .msg-body img { max-width: 100%; border-radius: 4px; margin: 4px 0; }

  /* ── Footer ── */
  .chat-footer { display: flex; gap: 8px; align-items: flex-end; }
  .chat-footer textarea {
    flex: 1; padding: 8px 10px; font-size: 15px; resize: none;
    border: 1px solid var(--main-border-color); border-radius: 6px;
    background: var(--accented-background-color);
    color: var(--main-text-color);
    font-family: inherit; line-height: 1.4; max-height: 180px;
  }
  .chat-footer textarea:focus { outline: none; border-color: var(--main-color, #448); }
  .chat-actions { display: flex; flex-direction: column; gap: 4px; }
  .btn-send {
    padding: 7px 14px; cursor: pointer; border: none;
    border-radius: 5px; font-size: 15px; font-weight: 600; white-space: nowrap;
    background: var(--main-color, #4477aa); color: #fff;
  }
  .btn-send:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-send:not(:disabled):hover { filter: brightness(1.1); }
  .btn-send.stop {
    background: #c0392b; animation: pulseStop 1s ease-in-out infinite;
  }
  @keyframes pulseStop {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }
  .btn-secondary {
    padding: 7px 14px; cursor: pointer;
    border-radius: 5px; font-size: 13px; font-weight: 600; white-space: nowrap;
    background: var(--button-background-color);
    border: 1px solid var(--main-border-color);
    color: var(--main-text-color);
  }
  .btn-secondary:hover { filter: brightness(1.1); }
  .btn-danger {
    background: none; border: none; cursor: pointer;
    font-size: 14px; color: var(--muted-text-color);
    padding: 2px 4px; align-self: flex-end;
  }
  .btn-danger:hover { color: #c0392b; }
  .typing {
    display: none; font-size: 13px;
    color: var(--muted-text-color); font-style: italic;
    padding: 0 2px; opacity: 0.6;
  }
  .typing.visible { display: block; }

  /* ── Toast ── */
  .toast {
    position: fixed; bottom: 60px; left: 50%; transform: translateX(-50%);
    padding: 6px 16px; border-radius: 6px; font-size: 13px;
    z-index: 999; opacity: 0; transition: opacity 0.25s; pointer-events: none;
    white-space: nowrap;
  }
  .toast.show { opacity: 1; }
  .toast-info { background: var(--main-color, #448); color: #fff; }
  .toast-error { background: #c0392b; color: #fff; }

  /* ── Responsivo ── */
  @media (max-width: 500px) {
    .chat-wrap { padding: 8px; gap: 6px; }
    .chat-ctx { flex-wrap: wrap; font-size: 13px; padding: 8px 10px; }
    .chat-ctx-title { max-width: 120px; }
    .chat-persona { padding: 8px 10px; }
    .chat-cmds { padding: 6px 10px; }
    .chat-cmds .btn-cmd { font-size: 12px; padding: 3px 8px; }
    .chat-messages { padding: 8px; min-height: 100px; }
    .chat-footer textarea { font-size: 14px; }
    .btn-send, .btn-secondary { padding: 6px 10px; font-size: 13px; }
    .chat-actions { gap: 3px; }
    .model-badge { max-width: 80px; font-size: 10px; }
    .chk-subnotes { font-size: 11px; }
  }
</style>

<div class="chat-wrap">
  <div class="chat-ctx">
    <span class="chat-label">Contexto:</span>
    <span class="chat-ctx-title" id="ctx-title">nenhum</span>
    <input id="ctx-id-input" placeholder="ID da nota..." />
    <button id="btn-load">Carregar</button>
    <button id="btn-active">Nota ativa</button>
  </div>

  <div class="chat-persona">
    <div class="persona-row">
      <span class="chat-label">Especialista:</span>
      <select id="persona-select"></select>
      <button class="btn-persona-toggle" id="btn-persona-toggle">\u270E Editar</button>
    </div>
    <div class="persona-prompt-wrap" id="persona-prompt-wrap">
      <textarea id="system-prompt-input" rows="3" placeholder="Prompt de sistema personalizado..."></textarea>
      <div class="persona-hint">Substitui o prompt padr\u00E3o. Altere aqui ou selecione um especialista.</div>
    </div>
  </div>

  <div class="chat-cmds">
    <span class="chat-label">Gerar:</span>
    <button class="btn-cmd" id="btn-cmd-resumo">Resumo</button>
    <button class="btn-cmd" id="btn-cmd-mermaid">Mermaid</button>
    <button class="btn-cmd" id="btn-cmd-insights">Insights</button>
    <button class="btn-cmd" id="btn-cmd-slides">Slides</button>
  </div>

  <div class="chat-toolbar">
    <span class="chat-label" style="opacity:0.5;font-size:12px;">0 msgs</span>
    <span class="model-badge" id="model-badge"></span>
    <label class="chk-subnotes"><input type="checkbox" id="chk-subnotes" checked /> Subnotas</label>
    <input id="search-input" placeholder="Buscar na conversa..." style="display:none;" />
    <button class="btn-icon" id="btn-toggle-search" title="Buscar">\u2315</button>
  </div>

  <div class="chat-messages" id="messages">
    <div class="msg msg-system"><div class="msg-body">Carregue uma nota como contexto e fa\u00E7a sua pergunta — ou use os bot\u00F5es acima para gerar notas filhas.</div></div>
  </div>
  <span class="typing" id="typing">IA processando...</span>

  <div class="chat-footer">
    <textarea id="user-input" rows="2" placeholder="Digite sua pergunta... (Ctrl+Enter para enviar)"></textarea>
    <div class="chat-actions">
      <button class="btn-send" id="btn-send">Enviar</button>
      <button class="btn-secondary" id="btn-save">Salvar</button>
      <button class="btn-danger" id="btn-clear">Limpar</button>
    </div>
  </div>
</div>

<div class="toast toast-info" id="toast"></div>
`);

// ═══════════════════════════════════════════════════════════════════
// DEPENDÊNCIAS
// ═══════════════════════════════════════════════════════════════════

async function loadMarked() {
  if (window.marked) return window.marked;
  return new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/marked@5.1.2/marked.min.js';
    s.onload = () => resolve(window.marked);
    s.onerror = () => { console.warn('marked CDN falhou'); resolve(null); };
    document.head.appendChild(s);
  });
}

async function loadDOMPurify() {
  if (window.DOMPurify) return window.DOMPurify;
  return new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/dompurify@3.1.6/dist/purify.min.js';
    s.onload = () => resolve(window.DOMPurify);
    s.onerror = () => { console.warn('DOMPurify CDN falhou'); resolve(null); };
    document.head.appendChild(s);
  });
}

let _marked = null;
let _purify = null;

async function initDeps() {
  _marked = await loadMarked();
  _purify = await loadDOMPurify();
}

function renderMarkdown(text) {
  if (!_marked) return text.replace(/\n/g, '<br>');
  let html;
  try {
    html = _marked.parse(text, { breaks: true, gfm: true });
  } catch {
    return text.replace(/\n/g, '<br>');
  }
  if (_purify) html = _purify.sanitize(html);
  return html;
}

// ═══════════════════════════════════════════════════════════════════
// ESTADO
// ═══════════════════════════════════════════════════════════════════

let history = [];
let ctxNoteId = null;
let _modelLabel = '';
let _isRestoring = false;

const STORAGE_KEY = 'ai_chat_state';

function saveState() {
  try {
    const data = {
      history: history.slice(-100),
      ctxNoteId,
      personaId: $c.find('#persona-select').val(),
      systemPrompt: $c.find('#system-prompt-input').val(),
      includeSubnotes: $c.find('#chk-subnotes').is(':checked')
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (Array.isArray(data.history) && data.history.length) {
      history = data.history;
      ctxNoteId = data.ctxNoteId || null;
      if (data.personaId) $c.find('#persona-select').val(data.personaId);
      if (data.systemPrompt) $c.find('#system-prompt-input').val(data.systemPrompt);
      if (data.includeSubnotes !== undefined) $c.find('#chk-subnotes').prop('checked', data.includeSubnotes);
      _isRestoring = true;
      restoreMessages();
      _isRestoring = false;
    }
  } catch {}
}

function restoreMessages() {
  const $msgs = $c.find('#messages');
  $msgs.empty();
  history.forEach((m, i) => {
    if (m.role === 'system') return;
    const role = m.role === 'user' ? 'user' : 'ai';
    appendMsg(role, m.content, i, m.ts);
  });
  if (!history.length) {
    $msgs.html('<div class="msg msg-system"><div class="msg-body">Carregue uma nota como contexto e fa\u00E7a sua pergunta — ou use os bot\u00F5es acima para gerar notas filhas.</div></div>');
  }
  updateMsgCount();
}

// ═══════════════════════════════════════════════════════════════════
// PERSONAS
// ═══════════════════════════════════════════════════════════════════

const PERSONAS = [
  { id: 'default', label: '\u22A1 Assistente geral', prompt: 'Voc\u00EA \u00E9 um assistente de conhecimento pessoal integrado ao Trilium Notes. Seja claro e conciso.' },
  { id: 'researcher', label: '\u25C8 Pesquisador', prompt: 'Voc\u00EA \u00E9 um pesquisador acad\u00EAmico rigoroso. Analise o conte\u00FAdo com profundidade, cite evid\u00EAncias, aponte lacunas e sugira fontes complementares. Use linguagem precisa e estruturada. Prefira respostas organizadas com subt\u00F3picos quando relevante.' },
  { id: 'teacher', label: '\u25B7 Professor', prompt: 'Voc\u00EA \u00E9 um professor did\u00E1tico e paciente. Explique os conceitos de forma clara, usando analogias e exemplos pr\u00E1ticos. Adapte a complexidade \u00E0 pergunta e sempre verifique se o aluno entendeu antes de avan\u00E7ar. Incentive a curiosidade.' },
  { id: 'critic', label: '\u25CB Cr\u00EDtico', prompt: 'Voc\u00EA \u00E9 um cr\u00EDtico anal\u00EDtico e construtivo. Identifique pontos fracos, premissas question\u00E1veis, contradi\u00E7\u00F5es e argumentos que precisam de refor\u00E7o. Seja direto mas justo. Ao apontar problemas, sugira melhorias concretas.' },
  { id: 'programmer', label: '\u25B8 Programador', prompt: 'Voc\u00EA \u00E9 um engenheiro de software s\u00EAnior. Ao responder, prefira c\u00F3digo funcional, explique decis\u00F5es arquiteturais, aponte trade-offs e siga boas pr\u00E1ticas. Use blocos de c\u00F3digo com a linguagem especificada. Seja preciso e pragm\u00E1tico.' },
  { id: 'writer', label: '\u270E Escritor', prompt: 'Voc\u00EA \u00E9 um escritor e editor experiente. Ajude a estruturar ideias, melhorar clareza, ritmo e coes\u00E3o textual. Sugira reformula\u00E7\u00F5es quando necess\u00E1rio. Valorize a voz original do autor enquanto eleva a qualidade do texto.' },
  { id: 'socratic', label: '\u25C7 Socr\u00E1tico', prompt: 'Voc\u00EA \u00E9 um facilitador socr\u00E1tico. Em vez de dar respostas diretas, fa\u00E7a perguntas que estimulem a reflex\u00E3o e levem o interlocutor a descobrir as respostas por si mesmo. Desafie premissas gentilmente. S\u00F3 forne\u00E7a a resposta direta se explicitamente solicitado.' },
  { id: 'custom', label: '\u2699 Personalizado', prompt: '' }
];

const $personaSelect = $c.find('#persona-select');
PERSONAS.forEach((p) => {
  $personaSelect.append($('<option>').val(p.id).text(p.label));
});

$personaSelect.on('change', function() {
  const pid = $(this).val();
  const persona = PERSONAS.find(p => p.id === pid);
  if (persona && pid !== 'custom') {
    $c.find('#system-prompt-input').val(persona.prompt);
  }
  saveState();
});

$c.find('#system-prompt-input').val(PERSONAS[0].prompt);

$c.find('#btn-persona-toggle').on('click', function() {
  const $wrap = $c.find('#persona-prompt-wrap');
  const open = $wrap.hasClass('open');
  $wrap.toggleClass('open', !open);
  $(this).text(open ? '\u270E Editar' : '\u25B2 Fechar');
});

$c.find('#system-prompt-input').on('input', function() {
  const currentId = $personaSelect.val();
  const persona = PERSONAS.find(p => p.id === currentId);
  if (persona && persona.id !== 'custom' && $(this).val() !== persona.prompt) {
    $personaSelect.val('custom');
  }
  saveState();
});

function getSystemPrompt() {
  return $c.find('#system-prompt-input').val().trim() ||
    'Voc\u00EA \u00E9 um assistente de conhecimento pessoal integrado ao Trilium Notes. Seja claro e conciso.';
}

// ═══════════════════════════════════════════════════════════════════
// COMANDOS RÁPIDOS
// ═══════════════════════════════════════════════════════════════════

const COMMANDS = [
  {
    id: 'resumo', label: 'Resumo',
    childTitle: (t) => 'Resumo \u2014 ' + t,
    prompt: 'Crie um resumo completo desta nota preservando:\n- O tema central e a linha argumentativa\n- Todos os links e URLs mencionados (mantenha-os clic\u00E1veis como <a href="...">)\n- A bibliografia e refer\u00EAncias completas\n\nFormate a resposta em HTML limpo usando <h2>, <p> e <ul> onde adequado.\nN\u00E3o inclua coment\u00E1rios introdut\u00F3rios \u2014 comece direto pelo conte\u00FAdo.',
    noteType: 'text', mime: null, process: (s) => s
  },
  {
    id: 'mermaid', label: 'Mermaid',
    childTitle: (t) => 'Fluxo \u2014 ' + t,
    prompt: 'Crie um diagrama Mermaid (flowchart LR, mindmap ou sequenceDiagram conforme o mais adequado) representando os conceitos e rela\u00E7\u00F5es principais desta nota.\nRetorne APENAS o c\u00F3digo Mermaid puro, sem blocos de markdown (sem \\`\\`\\`), sem explica\u00E7\u00F5es, sem texto adicional.',
    noteType: 'code', mime: 'text/x-mermaid',
    process: (s) => s.replace(/^```(?:mermaid)?\r?\n?/i, '').replace(/\r?\n?```$/i, '').trim()
  },
  {
    id: 'insights', label: 'Insights',
    childTitle: (t) => 'Insights \u2014 ' + t,
    prompt: 'A partir desta nota, gere:\n1. Insights-chave e padr\u00F5es n\u00E3o \u00F3bvios\n2. Conex\u00F5es com outros campos do conhecimento\n3. Perguntas abertas que o conte\u00FAdo levanta\n4. Poss\u00EDveis pontos cegos ou limita\u00E7\u00F5es do argumento\n\nFormate em HTML com <h3> para cada se\u00E7\u00E3o e <ul>/<li> para os itens.\nSeja anal\u00EDtico e cr\u00EDtico, n\u00E3o apenas descritivo.',
    noteType: 'text', mime: null, process: (s) => s
  },
  {
    id: 'slides', label: 'Slides',
    childTitle: (t) => 'Slides \u2014 ' + t,
    prompt: 'Crie o conte\u00FAdo textual para uma apresenta\u00E7\u00E3o de slides a partir desta nota.\nPara cada slide use exatamente este formato HTML:\n\n<section>\n<h2>T\u00EDtulo do Slide</h2>\n<ul>\n  <li>Ponto principal 1</li>\n  <li>Ponto principal 2</li>\n</ul>\n<p><em>Nota do apresentador (opcional)</em></p>\n</section>\n\nGere entre 6 e 10 slides, incluindo: slide de t\u00EDtulo, desenvolvimento e slide de conclus\u00E3o.\nApenas texto \u2014 sem imagens, sem c\u00F3digo, sem coment\u00E1rios fora do HTML.',
    noteType: 'text', mime: null, process: (s) => s
  }
];

// ═══════════════════════════════════════════════════════════════════
// FUNÇÕES DE UI
// ═══════════════════════════════════════════════════════════════════

const COLLAPSE_LIMIT = 1000;
const SCROLL_THRESHOLD = 120;
const TREE_DEPTH = 2;
const MAX_CTX_CHARS = 15000;

function isNearBottom($el) {
  return $el[0].scrollHeight - $el[0].scrollTop - $el[0].clientHeight < SCROLL_THRESHOLD;
}

function scrollToBottom($el, force) {
  if (force || isNearBottom($el)) {
    $el.scrollTop($el[0].scrollHeight);
  }
}

function makeTimestamp() {
  return new Date().toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function appendMsg(role, text, historyIdx, ts) {
  const $msgs = $c.find('#messages');
  const filterText = $c.find('#search-input').val().toLowerCase().trim();

  const labels = { user: 'Voc\u00EA', ai: 'IA', error: 'Erro', system: '' };
  const cls = { user: 'msg-user', ai: 'msg-ai', error: 'msg-error', system: 'msg-system' };

  const div = $('<div>').addClass('msg ' + (cls[role] || ''));
  if (historyIdx !== undefined) div.data('history-idx', historyIdx);

  if (labels[role]) {
    const header = $('<div>').addClass('msg-header');
    header.append($('<span>').addClass('msg-label').text(labels[role]));

    const timeStr = ts || makeTimestamp();
    header.append($('<span>').addClass('msg-timestamp').text(timeStr));

    if (role === 'ai') {
      const actions = $('<div>').addClass('msg-actions');
      actions.append($('<button>').addClass('btn-copy-msg').html('\u2398').attr('title', 'Copiar').on('click', function(e) {
        e.stopPropagation();
        navigator.clipboard.writeText(text).then(() => showToast('Copiado!', 'info')).catch(() => {});
      }));
      actions.append($('<button>').addClass('btn-regen-msg').html('\u21BB').attr('title', 'Regenerar').on('click', function(e) {
        e.stopPropagation();
        regenerate();
      }));
      header.append(actions);
    }
    if (role === 'user') {
      const actions = $('<div>').addClass('msg-actions');
      actions.append($('<button>').addClass('btn-edit-msg').html('\u270E').attr('title', 'Editar').on('click', function(e) {
        e.stopPropagation();
        editMessage(historyIdx);
      }));
      header.append(actions);
    }
    div.append(header);
  }

  const body = $('<div>').addClass('msg-body');
  if (role === 'ai') {
    body.html(renderMarkdown(text));
  } else {
    body.text(text);
  }
  div.append(body);

  if (role === 'ai' && text.length > COLLAPSE_LIMIT) {
    body.data('full-html', body.html());
    const short = text.slice(0, COLLAPSE_LIMIT);
    body.html(renderMarkdown(short) + '...');
    const toggle = $('<button>').addClass('msg-collapse-toggle').text('Mostrar mais');
    toggle.on('click', function() {
      const expanded = $(this).text() === 'Mostrar menos';
      if (expanded) {
        body.html(body.data('full-html').slice(0, COLLAPSE_LIMIT) + '...');
        $(this).text('Mostrar mais');
      } else {
        body.html(body.data('full-html'));
        $(this).text('Mostrar menos');
      }
    });
    div.append(toggle);
  }

  $msgs.append(div);

  if (filterText && !text.toLowerCase().includes(filterText) && role !== 'system') {
    div.addClass('msg-hidden');
  }

  scrollToBottom($msgs, _isRestoring);
  updateMsgCount();
}

function addMsg(role, text) {
  if (role === 'user' || role === 'ai') {
    const historyIdx = history.length;
    const ts = makeTimestamp();
    if (role === 'user') history.push({ role: 'user', content: text, ts });
    else history.push({ role: 'assistant', content: text, ts });
    appendMsg(role, text, historyIdx, ts);
    saveState();
  } else {
    if (role === 'error') {
      showToast(text, 'error');
      return;
    }
    const $msgs = $c.find('#messages');
    const labels = { system: '' };
    const cls = { system: 'msg-system' };
    const div = $('<div>').addClass('msg ' + (cls[role] || ''));
    const body = $('<div>').addClass('msg-body').text(text);
    div.append(body);
    $msgs.append(div);
    $msgs.scrollTop($msgs[0].scrollHeight);
  }
}

function setCtx(id, title) {
  ctxNoteId = id;
  $c.find('#ctx-title').text(title || id);
  $c.find('#ctx-id-input').val(id);
  history = [];
  $c.find('#messages').empty();
  addMsg('system', 'Contexto carregado: "' + (title || id) + '"');
  saveState();
}

function setLoading(on) {
  const $btn = $c.find('#btn-send');
  if (on) {
    $btn.addClass('stop').text('Parar');
    $btn.prop('disabled', false);
  } else {
    $btn.removeClass('stop').text('Enviar');
    $btn.prop('disabled', false);
  }
  $c.find('#typing').toggleClass('visible', on);
  $c.find('#user-input').prop('disabled', on);
}

function showToast(msg, type) {
  const $t = $c.find('#toast');
  $t.text(msg).attr('class', 'toast toast-' + type + ' show');
  clearTimeout($t.data('timer'));
  $t.data('timer', setTimeout(() => $t.removeClass('show'), 2500));
}

function updateMsgCount() {
  const count = history.filter(m => m.role !== 'system').length;
  $c.find('.chat-toolbar .chat-label').first().text(count + ' msgs');
}

// ═══════════════════════════════════════════════════════════════════
// RAG (ÁRVORE DE NOTAS)
// ═══════════════════════════════════════════════════════════════════

async function getNoteTreeBackend(noteId, maxDepth) {
  return await api.runOnBackend((nid, depth) => {
    function walk(id, d) {
      if (d <= 0) return [];
      const note = api.getNote(id);
      if (!note) return [];
      const raw = note.getContent() || '';
      const plain = raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      const results = [{ title: note.title, content: plain || '' }];
      try {
        const children = note.getChildNotes();
        for (const child of children) {
          results.push(...walk(child.noteId, d - 1));
        }
      } catch (e) {
        results.push({ title: '(erro ao ler filhas)', content: '' });
      }
      return results;
    }
    return walk(nid, depth);
  }, [noteId, maxDepth]);
}

async function buildContextText(noteId) {
  const includeSub = $c.find('#chk-subnotes').is(':checked');
  const note = await api.getNote(noteId);
  if (!note) return '';

  if (!includeSub) {
    const raw = await note.getContent();
    const plain = raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_CTX_CHARS);
    return 'Contexto \u2014 nota "' + note.title + '":\n' + plain;
  }

  const tree = await getNoteTreeBackend(noteId, TREE_DEPTH);

  let combined = '';
  let skipped = 0;
  for (const item of tree) {
    if (!item.content) { skipped++; continue; }
    const block = '\n\n--- ' + item.title + ' ---\n' + item.content;
    if ((combined.length + block.length) > MAX_CTX_CHARS && combined) { skipped++; break; }
    combined += block;
  }

  const totalItems = tree.length;
  const included = totalItems - skipped;
  const feedback = ' [' + included + '/' + totalItems + ' notas' + (skipped ? ', ' + skipped + ' puladas' : '') + ']';
  return 'Contexto \u2014 nota "' + note.title + '"' + feedback + ':\n' + combined;
}

// ═══════════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════════

async function loadConfig() {
  const notes = await api.searchForNotes('note.title = "AI Chat - Config"');
  if (!notes.length) throw new Error('Nota "AI Chat - Config" n\u00E3o encontrada.');
  let content;
  try {
    content = await notes[0].getProtectedContent();
  } catch {
    content = await notes[0].getContent();
  }
  const keyMatch = content.match(/openrouter_key:\s*(\S+)/);
  const modelMatch = content.match(/model:\s*(\S+)/);
  const tempMatch = content.match(/temperature:\s*([\d.]+)/);
  const maxMatch = content.match(/max_tokens:\s*(\d+)/);
  const baseMatch = content.match(/api_base:\s*(\S+)/);
  if (!keyMatch) throw new Error('Campo openrouter_key n\u00E3o encontrado na nota de config.');

  const modelId = modelMatch ? modelMatch[1] : 'openrouter/auto';
  _modelLabel = modelId;
  $c.find('#model-badge').text(modelId);

  return {
    key: keyMatch[1],
    model: modelId,
    temperature: tempMatch ? parseFloat(tempMatch[1]) : 0.7,
    maxTokens: maxMatch ? parseInt(maxMatch[1]) : 4096,
    apiBase: baseMatch ? baseMatch[1].replace(/\/+$/, '') : 'https://openrouter.ai/api/v1'
  };
}

async function loadNote(noteId) {
  if (!noteId) { showToast('Informe um ID de nota.', 'error'); return; }
  const note = await api.getNote(noteId);
  if (note) setCtx(note.noteId, note.title);
  else showToast('Nota n\u00E3o encontrada: ' + noteId, 'error');
}

// ═══════════════════════════════════════════════════════════════════
// CHAT PRINCIPAL
// ═══════════════════════════════════════════════════════════════════

let abortController = null;

async function send() {
  if (abortController) {
    abortController.abort();
    return;
  }

  const input = $c.find('#user-input');
  const text = input.val().trim();
  if (!text) return;
  if (text.length > 32000) { showToast('Mensagem muito longa (m\u00E1x 32000 caracteres).', 'error'); return; }
  input.val('');
  input.css('height', 'auto');

  addMsg('user', text);
  setLoading(true);

  abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), 90000);

  try {
    const cfg = await loadConfig();

    let system = getSystemPrompt();
    if (ctxNoteId) {
      const ctx = await buildContextText(ctxNoteId);
      if (ctx) system += '\n\n' + ctx;
    }

    const res = await fetch(cfg.apiBase + '/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + cfg.key,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://trilium.local',
        'X-Title': 'Trilium AI Chat'
      },
      body: JSON.stringify({
        model: cfg.model,
        temperature: cfg.temperature,
        max_tokens: cfg.maxTokens,
        messages: [{ role: 'system', content: system }].concat(history)
      }),
      signal: abortController.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      let errMsg = 'Erro HTTP ' + res.status;
      try { const errData = await res.json(); errMsg = errData.error?.message || errMsg; } catch {}
      throw new Error(errMsg);
    }

    const data = await res.json();
    if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
    const reply = data.choices[0].message.content;
    addMsg('ai', reply);

  } catch (e) {
    if (e.name === 'AbortError') {
      if (abortController && abortController.signal.aborted) {
        showToast('Requisi\u00E7\u00E3o cancelada.', 'error');
      }
      history.pop();
    } else {
      showToast(e.message, 'error');
      history.pop();
    }
  }

  setLoading(false);
  abortController = null;
  input.trigger('focus');
}

async function regenerate() {
  if (history.length < 2) return;
  if (history[history.length - 1].role !== 'assistant') return;

  const lastMsg = history.pop();
  restoreMessages();

  const lastUserMsg = history[history.length - 1];
  if (!lastUserMsg || lastUserMsg.role !== 'user') return;

  const $msgs = $c.find('#messages');
  $msgs.find('.msg:last-child').remove();

  setLoading(true);

  abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), 90000);

  try {
    const cfg = await loadConfig();

    let system = getSystemPrompt();
    if (ctxNoteId) {
      const ctx = await buildContextText(ctxNoteId);
      if (ctx) system += '\n\n' + ctx;
    }

    const res = await fetch(cfg.apiBase + '/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + cfg.key,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://trilium.local',
        'X-Title': 'Trilium AI Chat'
      },
      body: JSON.stringify({
        model: cfg.model,
        temperature: cfg.temperature,
        max_tokens: cfg.maxTokens,
        messages: [{ role: 'system', content: system }].concat(history)
      }),
      signal: abortController.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      let errMsg = 'Erro HTTP ' + res.status;
      try { const errData = await res.json(); errMsg = errData.error?.message || errMsg; } catch {}
      throw new Error(errMsg);
    }

    const data = await res.json();
    if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
    const reply = data.choices[0].message.content;
    addMsg('ai', reply);

  } catch (e) {
    if (e.name === 'AbortError') {
      showToast('Requisi\u00E7\u00E3o cancelada.', 'error');
    } else {
      showToast(e.message, 'error');
    }
    history.push(lastMsg);
  }

  setLoading(false);
  abortController = null;
}

// ═══════════════════════════════════════════════════════════════════
// EDITAR MENSAGEM
// ═══════════════════════════════════════════════════════════════════

function editMessage(historyIdx) {
  const msg = history[historyIdx];
  if (!msg || msg.role !== 'user') return;

  const remaining = history.length - historyIdx - 1;
  if (remaining > 0 && !confirm('Editar esta mensagem apagar\u00E1 as ' + remaining + ' mensagens seguintes. Continuar?')) return;

  const $input = $c.find('#user-input');
  $input.val(msg.content);
  autoResize.call($input[0]);
  $input.trigger('focus');

  history.splice(historyIdx);
  restoreMessages();
  saveState();
}

// ═══════════════════════════════════════════════════════════════════
// SALVAR NOTA
// ═══════════════════════════════════════════════════════════════════

async function saveNote() {
  if (!history.length) { showToast('Nenhuma conversa para salvar.', 'error'); return; }
  if (!ctxNoteId) { showToast('Carregue uma nota de contexto antes de salvar.', 'error'); return; }

  const personaLabel = $personaSelect.find('option:selected').text();

  const html = history.map(function(m) {
    const who = m.role === 'user' ? '<strong>Voc\u00EA</strong>' : '<strong>IA</strong>';
    return '<p>' + who + ': ' + m.content.replace(/\n/g, '<br>') + '</p>';
  }).join('<hr>');

  const now = new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  const metaHtml = '<p><em>Especialista: ' + personaLabel + '</em></p><hr>' + html;

  await api.runOnBackend((parentNoteId, title, content) => {
    api.createNewNote({ parentNoteId, title, content, type: 'text' });
  }, [ctxNoteId, 'Chat IA \u2014 ' + now, metaHtml]);

  showToast('Conversa salva como nota filha.', 'info');
}

// ═══════════════════════════════════════════════════════════════════
// COMANDOS RÁPIDOS
// ═══════════════════════════════════════════════════════════════════

async function runCommand(cmd) {
  if (!ctxNoteId) {
    showToast('Carregue uma nota como contexto primeiro.', 'error');
    return;
  }

  const $btn = $c.find('#btn-cmd-' + cmd.id);
  const originalLabel = cmd.label;
  $btn.prop('disabled', true).text('...');

  abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), 90000);

  try {
    const cfg = await loadConfig();
    const note = await api.getNote(ctxNoteId);
    if (!note) throw new Error('Nota de contexto n\u00E3o encontrada.');

    const plain = await buildContextText(ctxNoteId);

    const pid = $personaSelect.val();
    let cmdSystem = 'Voc\u00EA \u00E9 um assistente especializado em processamento de notas de conhecimento. Responda apenas com o conte\u00FAdo solicitado, sem coment\u00E1rios adicionais antes ou depois.';
    if (pid !== 'default') {
      const persona = PERSONAS.find(p => p.id === pid);
      const personaPrompt = (pid === 'custom') ? getSystemPrompt() : (persona ? persona.prompt : '');
      if (personaPrompt) {
        cmdSystem = personaPrompt + '\n\nResponda apenas com o conte\u00FAdo solicitado, sem coment\u00E1rios adicionais antes ou depois.';
      }
    }

    const userMsg = cmd.prompt + '\n\n--- CONTE\u00DADO DA NOTA "' + note.title + '" ---\n' + plain;

    const res = await fetch(cfg.apiBase + '/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + cfg.key,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://trilium.local',
        'X-Title': 'Trilium AI Chat'
      },
      body: JSON.stringify({
        model: cfg.model,
        temperature: cfg.temperature,
        max_tokens: cfg.maxTokens,
        messages: [{ role: 'system', content: cmdSystem }, { role: 'user', content: userMsg }]
      }),
      signal: abortController.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      let errMsg = 'Erro HTTP ' + res.status;
      try { const errData = await res.json(); errMsg = errData.error?.message || errMsg; } catch {}
      throw new Error(errMsg);
    }

    const data = await res.json();
    if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));

    const rawContent = data.choices[0].message.content.trim();
    const content = cmd.process(rawContent);
    const childTitle = cmd.childTitle(note.title);

    await api.runOnBackend((parentNoteId, title, noteContent, type, mime) => {
      api.createNewNote({ parentNoteId, title, content: noteContent, type, mime: mime || undefined });
    }, [ctxNoteId, childTitle, content, cmd.noteType, cmd.mime]);

    showToast('Nota criada: "' + childTitle + '"', 'info');

  } catch (e) {
    if (e.name === 'AbortError') {
      showToast('Comando cancelado (timeout).', 'error');
    } else {
      showToast(e.message, 'error');
    }
  }

  $btn.prop('disabled', false).text(originalLabel);
  abortController = null;
}

// ═══════════════════════════════════════════════════════════════════
// SEARCH / FILTRO
// ═══════════════════════════════════════════════════════════════════

let searchVisible = false;
$c.find('#btn-toggle-search').on('click', function() {
  searchVisible = !searchVisible;
  $c.find('#search-input').toggle(searchVisible).trigger('focus');
  if (!searchVisible) {
    $c.find('#search-input').val('');
    filterMessages('');
  }
});

$c.find('#search-input').on('input', function() {
  filterMessages($(this).val());
});

function filterMessages(query) {
  const q = query.toLowerCase().trim();
  $c.find('#messages .msg').each(function() {
    const $msg = $(this);
    const text = $msg.find('.msg-body').text().toLowerCase();
    if (!q || text.includes(q)) {
      $msg.removeClass('msg-hidden');
    } else {
      $msg.addClass('msg-hidden');
    }
  });
}

// ═══════════════════════════════════════════════════════════════════
// AUTO-RESIZE TEXTAREA
// ═══════════════════════════════════════════════════════════════════

function autoResize() {
  this.style.height = 'auto';
  this.style.height = Math.min(this.scrollHeight, 180) + 'px';
}

$c.find('#user-input').on('input', autoResize);

// ═══════════════════════════════════════════════════════════════════
// EVENT LISTENERS
// ═══════════════════════════════════════════════════════════════════

$c.find('#btn-send').on('click', send);

$c.find('#btn-save').on('click', saveNote);

$c.find('#btn-clear').on('click', function() {
  if (history.length && !confirm('Tem certeza que deseja limpar toda a conversa?')) return;
  history = [];
  $c.find('#messages').empty();
  $c.find('#search-input').val('').hide();
  searchVisible = false;
  addMsg('system', 'Conversa limpa.');
  saveState();
  updateMsgCount();
});

$c.find('#btn-load').on('click', function() {
  loadNote($c.find('#ctx-id-input').val().trim());
});

$c.find('#btn-active').on('click', async function() {
  const note = api.getActiveContextNote();
  if (note) await loadNote(note.noteId);
  else showToast('Nenhuma nota ativa encontrada.', 'error');
});

$c.find('#user-input').on('keydown', function(e) {
  if (e.ctrlKey && e.key === 'Enter') {
    e.preventDefault();
    send();
  }
  if (e.key === 'Escape') {
    $(this).blur();
  }
});

$(document).on('keydown', function(e) {
  if (e.ctrlKey && e.shiftKey && e.key === 'C') {
    e.preventDefault();
    $c.find('#btn-clear').trigger('click');
  }
  if (e.ctrlKey && e.shiftKey && e.key === 'S') {
    e.preventDefault();
    saveNote();
  }
  if (e.ctrlKey && e.shiftKey && e.key === 'F') {
    e.preventDefault();
    $c.find('#btn-toggle-search').trigger('click');
  }
});

COMMANDS.forEach(function(cmd) {
  $c.find('#btn-cmd-' + cmd.id).on('click', function() { runCommand(cmd); });
});

// ═══════════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════════

(async function init() {
  await initDeps();
  loadState();

  if (ctxNoteId) {
    try {
      const note = await api.getNote(ctxNoteId);
      if (note) $c.find('#ctx-title').text(note.title);
    } catch {}
  }
})();
