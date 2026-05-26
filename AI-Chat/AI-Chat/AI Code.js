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

  /* ── Mensagens ── */
  .chat-toolbar {
    display: flex; align-items: center; gap: 6px;
  }
  .chat-toolbar input {
    flex: 1; padding: 5px 10px; font-size: 13px;
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

  .chat-messages {
    flex: 1; overflow-y: auto; min-height: 140px;
    border: 1px solid var(--main-border-color);
    border-radius: 6px; padding: 10px;
    display: flex; flex-direction: column; gap: 8px;
  }
  .msg { display: flex; flex-direction: column; gap: 2px; }
  .msg-header {
    display: flex; align-items: center; gap: 6px;
    margin-bottom: 1px;
  }
  .msg-label { font-size: 13px; font-weight: 700; opacity: 0.55; text-transform: uppercase; letter-spacing: 0.04em; }
  .msg-actions { display: none; margin-left: auto; gap: 3px; }
  .msg:hover .msg-actions { display: flex; }
  .msg-actions button {
    padding: 1px 6px; font-size: 12px; cursor: pointer;
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
    border-left: 3px solid var(--main-border-color);
    opacity: 0.85;
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
  .msg-body th {
    background: rgba(128,128,128,0.1);
    font-weight: 600;
  }
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
  .typing { display: none; font-size: 13px; color: var(--muted-text-color); font-style: italic; padding: 0 2px; }
  .typing.visible { display: block; }

  /* ── Copiado toast ── */
  .copy-toast {
    position: fixed; bottom: 60px; left: 50%; transform: translateX(-50%);
    background: var(--main-color, #448); color: #fff;
    padding: 6px 16px; border-radius: 6px; font-size: 13px;
    z-index: 999; opacity: 0; transition: opacity 0.25s; pointer-events: none;
  }
  .copy-toast.show { opacity: 1; }
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
      <button class="btn-persona-toggle" id="btn-persona-toggle">✎ Editar</button>
    </div>
    <div class="persona-prompt-wrap" id="persona-prompt-wrap">
      <textarea id="system-prompt-input" rows="3" placeholder="Prompt de sistema personalizado..."></textarea>
      <div class="persona-hint">Substitui o prompt padrão. Altere aqui ou selecione um especialista.</div>
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
    <input id="search-input" placeholder="Buscar na conversa..." style="display:none;" />
    <button class="btn-icon" id="btn-toggle-search" title="Buscar">⌕</button>
  </div>

  <div class="chat-messages" id="messages">
    <div class="msg msg-system"><div class="msg-body">Carregue uma nota como contexto e faça sua pergunta — ou use os botões acima para gerar notas filhas.</div></div>
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

<div class="copy-toast" id="copy-toast">Copiado!</div>
`);

// ═══════════════════════════════════════════════════════════════════
// DEPENDÊNCIAS
// ═══════════════════════════════════════════════════════════════════

async function loadMarked() {
  if (window.marked) return window.marked;
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/marked@5.1.2/marked.min.js';
    s.onload = () => resolve(window.marked);
    s.onerror = () => { console.warn('marked CDN falhou, markdown desativado'); resolve(null); };
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

const STORAGE_KEY = 'ai_chat_state';

function saveState() {
  try {
    const data = {
      history: history.slice(-100),
      ctxNoteId,
      personaId: $c.find('#persona-select').val(),
      systemPrompt: $c.find('#system-prompt-input').val()
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
      restoreMessages();
    }
  } catch {}
}

function restoreMessages() {
  const $msgs = $c.find('#messages');
  $msgs.empty();
  history.forEach((m, i) => {
    if (m.role === 'system') return;
    const role = m.role === 'user' ? 'user' : 'ai';
    appendMsg(role, m.content, i);
  });
  if (!history.length) {
    $msgs.html('<div class="msg msg-system"><div class="msg-body">Carregue uma nota como contexto e faça sua pergunta — ou use os botões acima para gerar notas filhas.</div></div>');
  }
  updateMsgCount();
}

// ═══════════════════════════════════════════════════════════════════
// PERSONAS
// ═══════════════════════════════════════════════════════════════════

const PERSONAS = [
  { id: 'default', label: '\u22A1 Assistente geral', prompt: 'Você é um assistente de conhecimento pessoal integrado ao Trilium Notes. Seja claro e conciso.' },
  { id: 'researcher', label: '\u25C8 Pesquisador', prompt: 'Você é um pesquisador acadêmico rigoroso. Analise o conteúdo com profundidade, cite evidências, aponte lacunas e sugira fontes complementares. Use linguagem precisa e estruturada. Prefira respostas organizadas com subtópicos quando relevante.' },
  { id: 'teacher', label: '\u25B7 Professor', prompt: 'Você é um professor didático e paciente. Explique os conceitos de forma clara, usando analogias e exemplos práticos. Adapte a complexidade à pergunta e sempre verifique se o aluno entendeu antes de avançar. Incentive a curiosidade.' },
  { id: 'critic', label: '\u25CB Crítico', prompt: 'Você é um crítico analítico e construtivo. Identifique pontos fracos, premissas questionáveis, contradições e argumentos que precisam de reforço. Seja direto mas justo. Ao apontar problemas, sugira melhorias concretas.' },
  { id: 'programmer', label: '\u25B8 Programador', prompt: 'Você é um engenheiro de software sênior. Ao responder, prefira código funcional, explique decisões arquiteturais, aponte trade-offs e siga boas práticas. Use blocos de código com a linguagem especificada. Seja preciso e pragmático.' },
  { id: 'writer', label: '\u270E Escritor', prompt: 'Você é um escritor e editor experiente. Ajude a estruturar ideias, melhorar clareza, ritmo e coesão textual. Sugira reformulações quando necessário. Valorize a voz original do autor enquanto eleva a qualidade do texto.' },
  { id: 'socratic', label: '\u25C7 Socrático', prompt: 'Você é um facilitador socrático. Em vez de dar respostas diretas, faça perguntas que estimulem a reflexão e levem o interlocutor a descobrir as respostas por si mesmo. Desafie premissas gentilmente. Só forneça a resposta direta se explicitamente solicitado.' },
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
    'Você é um assistente de conhecimento pessoal integrado ao Trilium Notes. Seja claro e conciso.';
}

// ═══════════════════════════════════════════════════════════════════
// COMANDOS RÁPIDOS
// ═══════════════════════════════════════════════════════════════════

const COMMANDS = [
  {
    id: 'resumo', label: 'Resumo',
    childTitle: (t) => 'Resumo — ' + t,
    prompt: `Crie um resumo completo desta nota preservando:
- O tema central e a linha argumentativa
- Todos os links e URLs mencionados (mantenha-os clicáveis como <a href="...">)
- A bibliografia e referências completas

Formate a resposta em HTML limpo usando <h2>, <p> e <ul> onde adequado.
Não inclua comentários introdutórios — comece direto pelo conteúdo.`,
    noteType: 'text', mime: null, process: (s) => s
  },
  {
    id: 'mermaid', label: 'Mermaid',
    childTitle: (t) => 'Fluxo — ' + t,
    prompt: `Crie um diagrama Mermaid (flowchart LR, mindmap ou sequenceDiagram conforme o mais adequado) representando os conceitos e relações principais desta nota.
Retorne APENAS o código Mermaid puro, sem blocos de markdown (sem \`\`\`), sem explicações, sem texto adicional.`,
    noteType: 'code', mime: 'text/x-mermaid',
    process: (s) => s.replace(/^```(?:mermaid)?\r?\n?/i, '').replace(/\r?\n?```$/i, '').trim()
  },
  {
    id: 'insights', label: 'Insights',
    childTitle: (t) => 'Insights — ' + t,
    prompt: `A partir desta nota, gere:
1. Insights-chave e padrões não óbvios
2. Conexões com outros campos do conhecimento
3. Perguntas abertas que o conteúdo levanta
4. Possíveis pontos cegos ou limitações do argumento

Formate em HTML com <h3> para cada seção e <ul>/<li> para os itens.
Seja analítico e crítico, não apenas descritivo.`,
    noteType: 'text', mime: null, process: (s) => s
  },
  {
    id: 'slides', label: 'Slides',
    childTitle: (t) => 'Slides — ' + t,
    prompt: `Crie o conteúdo textual para uma apresentação de slides a partir desta nota.
Para cada slide use exatamente este formato HTML:

<section>
<h2>Título do Slide</h2>
<ul>
  <li>Ponto principal 1</li>
  <li>Ponto principal 2</li>
</ul>
<p><em>Nota do apresentador (opcional)</em></p>
</section>

Gere entre 6 e 10 slides, incluindo: slide de título, desenvolvimento e slide de conclusão.
Apenas texto — sem imagens, sem código, sem comentários fora do HTML.`,
    noteType: 'text', mime: null, process: (s) => s
  }
];

// ═══════════════════════════════════════════════════════════════════
// FUNÇÕES DE UI
// ═══════════════════════════════════════════════════════════════════

function appendMsg(role, text, historyIdx) {
  const $msgs = $c.find('#messages');
  const filterText = $c.find('#search-input').val().toLowerCase().trim();

  const labels = { user: 'Você', ai: 'IA', error: 'Erro', system: '' };
  const cls = { user: 'msg-user', ai: 'msg-ai', error: 'msg-error', system: 'msg-system' };

  const div = $('<div>').addClass('msg ' + (cls[role] || ''));
  if (historyIdx !== undefined) div.data('history-idx', historyIdx);

  if (labels[role]) {
    const header = $('<div>').addClass('msg-header');
    header.append($('<span>').addClass('msg-label').text(labels[role]));

    if (role === 'ai') {
      const actions = $('<div>').addClass('msg-actions');
      actions.append($('<button>').addClass('btn-copy-msg').html('\u2398').attr('title', 'Copiar').on('click', function(e) {
        e.stopPropagation();
        const txt = text;
        navigator.clipboard.writeText(txt).then(() => showCopyToast()).catch(() => {});
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

  $msgs.append(div);

  if (filterText && !text.toLowerCase().includes(filterText) && role !== 'system') {
    div.addClass('msg-hidden');
  }

  $msgs.scrollTop($msgs[0].scrollHeight);
  updateMsgCount();
}

function addMsg(role, text) {
  if (role === 'user' || role === 'ai') {
    const historyIdx = history.length;
    if (role === 'user') history.push({ role: 'user', content: text });
    else history.push({ role: 'assistant', content: text });
    appendMsg(role, text, historyIdx);
    saveState();
  } else {
    const $msgs = $c.find('#messages');
    const labels = { error: 'Erro', system: '' };
    const cls = { error: 'msg-error', system: 'msg-system' };
    const div = $('<div>').addClass('msg ' + (cls[role] || ''));
    if (labels[role]) {
      const header = $('<div>').addClass('msg-header');
      header.append($('<span>').addClass('msg-label').text(labels[role]));
      div.append(header);
    }
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
  $c.find('#btn-send').prop('disabled', on).text(on ? '...' : 'Enviar');
  $c.find('#typing').toggleClass('visible', on);
  $c.find('#user-input').prop('disabled', on);
}

function showCopyToast() {
  const $t = $c.find('#copy-toast');
  $t.addClass('show');
  setTimeout(() => $t.removeClass('show'), 1800);
}

function updateMsgCount() {
  const count = history.filter(m => m.role !== 'system').length;
  $c.find('.chat-toolbar .chat-label').text(count + ' msgs');
}

// ═══════════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════════

async function loadConfig() {
  const notes = await api.searchForNotes('note.title = "AI Chat - Config"');
  if (!notes.length) throw new Error('Nota "AI Chat - Config" não encontrada.');
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
  if (!keyMatch) throw new Error('Campo openrouter_key não encontrado na nota de config.');

  return {
    key: keyMatch[1],
    model: modelMatch ? modelMatch[1] : 'openrouter/auto',
    temperature: tempMatch ? parseFloat(tempMatch[1]) : 0.7,
    maxTokens: maxMatch ? parseInt(maxMatch[1]) : 4096
  };
}

async function loadNote(noteId) {
  if (!noteId) { alert('Informe um ID de nota.'); return; }
  const note = await api.getNote(noteId);
  if (note) setCtx(note.noteId, note.title);
  else alert('Nota não encontrada: ' + noteId);
}

// ═══════════════════════════════════════════════════════════════════
// CHAT PRINCIPAL
// ═══════════════════════════════════════════════════════════════════

let abortController = null;

async function send() {
  const input = $c.find('#user-input');
  const text = input.val().trim();
  if (!text) return;
  if (text.length > 32000) { alert('Mensagem muito longa (máx 32000 caracteres).'); return; }
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
      const note = await api.getNote(ctxNoteId);
      if (note) {
        const raw = await note.getContent();
        const plain = raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 12000);
        system += '\n\nContexto — nota "' + note.title + '":\n' + plain;
      }
    }

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
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
      try {
        const errData = await res.json();
        errMsg = errData.error?.message || errMsg;
      } catch {}
      throw new Error(errMsg);
    }

    const data = await res.json();
    if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
    const reply = data.choices[0].message.content;
    addMsg('ai', reply);

  } catch (e) {
    if (e.name === 'AbortError') {
      addMsg('error', 'Requisição cancelada (timeout de 90s).');
      history.pop();
    } else {
      addMsg('error', e.message);
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
      const note = await api.getNote(ctxNoteId);
      if (note) {
        const raw = await note.getContent();
        const plain = raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 12000);
        system += '\n\nContexto — nota "' + note.title + '":\n' + plain;
      }
    }

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
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
      try {
        const errData = await res.json();
        errMsg = errData.error?.message || errMsg;
      } catch {}
      throw new Error(errMsg);
    }

    const data = await res.json();
    if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
    const reply = data.choices[0].message.content;
    addMsg('ai', reply);

  } catch (e) {
    if (e.name === 'AbortError') {
      addMsg('error', 'Requisição cancelada (timeout de 90s).');
    } else {
      addMsg('error', e.message);
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
  if (!history.length) { alert('Nenhuma conversa para salvar.'); return; }
  if (!ctxNoteId) { alert('Carregue uma nota de contexto antes de salvar.'); return; }

  const personaLabel = $personaSelect.find('option:selected').text();

  const html = history.map(function(m) {
    const who = m.role === 'user' ? '<strong>Você</strong>' : '<strong>IA</strong>';
    return '<p>' + who + ': ' + m.content.replace(/\n/g, '<br>') + '</p>';
  }).join('<hr>');

  const now = new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  const metaHtml = '<p><em>Especialista: ' + personaLabel + '</em></p><hr>' + html;

  await api.runOnBackend((parentNoteId, title, content) => {
    api.createNewNote({ parentNoteId, title, content, type: 'text' });
  }, [ctxNoteId, 'Chat IA — ' + now, metaHtml]);

  addMsg('system', 'Conversa salva como nota filha.');
}

// ═══════════════════════════════════════════════════════════════════
// COMANDOS RÁPIDOS
// ═══════════════════════════════════════════════════════════════════

async function runCommand(cmd) {
  if (!ctxNoteId) {
    alert('Carregue uma nota como contexto primeiro.');
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
    if (!note) throw new Error('Nota de contexto não encontrada.');

    const raw = await note.getContent();
    const plain = raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 15000);

    const pid = $personaSelect.val();
    let cmdSystem = 'Você é um assistente especializado em processamento de notas de conhecimento. Responda apenas com o conteúdo solicitado, sem comentários adicionais antes ou depois.';
    if (pid !== 'default') {
      const persona = PERSONAS.find(p => p.id === pid);
      const personaPrompt = (pid === 'custom') ? getSystemPrompt() : (persona ? persona.prompt : '');
      if (personaPrompt) {
        cmdSystem = personaPrompt + '\n\nResponda apenas com o conteúdo solicitado, sem comentários adicionais antes ou depois.';
      }
    }

    const userMsg = cmd.prompt + '\n\n--- CONTEÚDO DA NOTA "' + note.title + '" ---\n' + plain;

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
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
        messages: [
          { role: 'system', content: cmdSystem },
          { role: 'user', content: userMsg }
        ]
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

    addMsg('system', '✓ Nota criada: "' + childTitle + '"');

  } catch (e) {
    if (e.name === 'AbortError') {
      addMsg('error', 'Comando cancelado (timeout).');
    } else {
      addMsg('error', e.message);
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
  else alert('Nenhuma nota ativa encontrada.');
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

// Atalhos globais
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

  // Se houver contexto carregado, restaura o título
  if (ctxNoteId) {
    try {
      const note = await api.getNote(ctxNoteId);
      if (note) $c.find('#ctx-title').text(note.title);
    } catch {}
  }
})();