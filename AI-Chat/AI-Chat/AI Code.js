const $c = $container;
// Hoista <style> de qualquer HTML injetado para o <head> — render notes podem
// ignorar style inline (o layout não pode depender do tema, ex.: Folio).
(function () {
    if (typeof document === 'undefined' || typeof $ === 'undefined' || !$.fn) return;
    if (window.__aicPatched) return;
    window.__aicPatched = true;
    const getStyleEl = () => {
        let el = document.getElementById('aic-chat-css');
        if (!el) {
            el = document.createElement('style');
            el.id = 'aic-chat-css';
            document.head.appendChild(el);
        }
        return el;
    };
    const hoist = (html) => {
        const str = String(html);
        if (!str.includes('<style>')) return str;
        const styleEl = getStyleEl();
        const re = /<style>([\s\S]*?)<\/style>/g;
        let m, css = '';
        while ((m = re.exec(str)) !== null) css += (css ? '\n' : '') + m[1];
        if (css) styleEl.textContent = css;
        return str.replace(re, '');
    };
    const origHtml = $.fn.html;
    const origAppend = $.fn.append;
    $.fn.html = function (arg) {
        if (typeof arg === 'string' && arg.includes('<style>')) arg = hoist(arg);
        return origHtml.apply(this, [arg]);
    };
    $.fn.append = function () {
        const args = Array.prototype.slice.call(arguments).map(function (a) {
            return (typeof a === 'string' && a.includes('<style>')) ? hoist(a) : a;
        });
        return origAppend.apply(this, args);
    };
})();



$c.html(`
<style>
  /* Escopado em .chat-wrap: o CSS não vaza para o app nem para outros plugins */
  .chat-wrap {
    box-sizing: border-box;
    display: flex; flex-direction: column; height: 100%;
    padding: 14px; gap: 8px;
    font-family: var(--font-family, sans-serif);
    color: var(--main-text-color);
    position: relative;
    --aic-danger: #e57373;
    --aic-code-bg: rgba(255,255,255,0.07);
  }
  .chat-wrap.aic-light { --aic-danger: #b3261e; --aic-code-bg: rgba(0,0,0,0.06); }
  .chat-wrap, .chat-wrap * { box-sizing: border-box; margin: 0; padding: 0; }
  .chat-wrap :focus-visible { outline: 2px solid var(--main-color, #4477aa) !important; outline-offset: 1px; }

  /* ── Contexto ── */
  .chat-wrap .chat-ctx {
    display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
    padding: 10px 14px;
    background: var(--accented-background-color);
    border: 1px solid var(--main-border-color);
    border-radius: 6px; font-size: 15px;
    color: var(--muted-text-color);
  }
  .chat-wrap .chat-ctx input {
    flex: 1; min-width: 90px; border: none; background: transparent;
    color: var(--main-text-color); font-size: 15px; outline: none;
  }
  .chat-wrap .chat-ctx button {
    padding: 4px 8px; min-height: 32px; font-size: 14px; cursor: pointer;
    background: var(--button-background-color);
    border: 1px solid var(--main-border-color);
    border-radius: 4px; color: var(--main-text-color);
  }
  .chat-wrap .chat-ctx button:hover { filter: brightness(1.1); }
  .chat-wrap .chat-label { font-size: 14px; white-space: nowrap; color: var(--muted-text-color); }
  .chat-wrap .chat-ctx-title {
    font-size: 14px; font-weight: 600; max-width: 180px;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    background: none; border: none; padding: 0; cursor: pointer;
    color: var(--main-text-color); text-align: left;
  }
  .chat-wrap .chat-ctx-title:hover { text-decoration: underline; }
  .chat-wrap .chat-ctx-feedback { font-size: 12px; color: var(--muted-text-color); }

  /* ── Persona / System prompt ── */
  .chat-wrap .chat-persona {
    display: flex; flex-direction: column; gap: 5px;
    padding: 10px 14px;
    background: var(--accented-background-color);
    border: 1px solid var(--main-border-color);
    border-radius: 6px;
  }
  .chat-wrap .persona-row {
    display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  }
  .chat-wrap .persona-row select {
    flex: 1; min-width: 0; min-height: 32px;
    padding: 4px 8px; font-size: 14px;
    background: var(--button-background-color);
    border: 1px solid var(--main-border-color);
    border-radius: 4px; color: var(--main-text-color);
    cursor: pointer;
  }
  .chat-wrap .persona-row select option {
    background: var(--accented-background-color);
    color: var(--main-text-color);
  }
  .chat-wrap .btn-persona-toggle {
    padding: 4px 10px; min-height: 32px; cursor: pointer; font-size: 13px;
    background: var(--button-background-color);
    border: 1px solid var(--main-border-color);
    border-radius: 4px; color: var(--muted-text-color);
    white-space: nowrap; transition: filter 0.1s;
  }
  .chat-wrap .btn-persona-toggle:hover { filter: brightness(1.1); }
  .chat-wrap .persona-prompt-wrap { display: none; }
  .chat-wrap .persona-prompt-wrap.open { display: block; }
  .chat-wrap .persona-prompt-wrap textarea {
    width: 100%; padding: 8px 10px; font-size: 14px; resize: vertical;
    border: 1px solid var(--main-border-color); border-radius: 5px;
    background: var(--accented-background-color);
    color: var(--main-text-color);
    font-family: inherit; line-height: 1.45; min-height: 60px;
  }
  .chat-wrap .persona-hint { font-size: 12px; color: var(--muted-text-color); margin-top: 2px; }

  /* ── Comandos rápidos ── */
  .chat-wrap .chat-cmds {
    display: flex; align-items: center; gap: 5px; flex-wrap: wrap;
    padding: 7px 12px;
    background: var(--accented-background-color);
    border: 1px solid var(--main-border-color);
    border-radius: 6px;
  }
  .chat-wrap .btn-cmd {
    padding: 4px 10px; min-height: 32px; cursor: pointer; font-size: 13px;
    background: var(--button-background-color);
    border: 1px solid var(--main-border-color);
    border-radius: 4px; color: var(--main-text-color);
    white-space: nowrap; transition: filter 0.1s;
  }
  .chat-wrap .btn-cmd:hover:not(:disabled) { filter: brightness(1.15); }
  .chat-wrap .btn-cmd:disabled { opacity: 0.55; cursor: not-allowed; }

  /* ── Toolbar ── */
  .chat-wrap .chat-toolbar {
    display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
  }
  .chat-wrap .chat-toolbar input {
    flex: 1; min-width: 100px; min-height: 32px;
    padding: 5px 10px; font-size: 13px;
    border: 1px solid var(--main-border-color); border-radius: 4px;
    background: var(--accented-background-color);
    color: var(--main-text-color); outline: none;
  }
  .chat-wrap .chat-toolbar .btn-icon {
    padding: 4px 8px; min-height: 32px; cursor: pointer; font-size: 13px;
    background: var(--button-background-color);
    border: 1px solid var(--main-border-color);
    border-radius: 4px; color: var(--muted-text-color);
  }
  .chat-wrap .chat-toolbar .btn-icon:hover { filter: brightness(1.1); }
  .chat-wrap .chat-search-count { font-size: 12px; color: var(--muted-text-color); }
  .chat-wrap .chat-usage { font-size: 12px; color: var(--muted-text-color); margin-left: auto; }
  .chat-wrap .chat-char-count { font-size: 12px; color: var(--muted-text-color); }
  .chat-wrap .chat-char-count.limit { color: var(--aic-danger); }

  .chat-wrap .model-badge {
    font-size: 12px; color: var(--muted-text-color); white-space: nowrap;
    overflow: hidden; text-overflow: ellipsis; max-width: 160px;
  }
  .chat-wrap .chk-subnotes {
    display: flex; align-items: center; gap: 4px;
    font-size: 13px; cursor: pointer;
    white-space: nowrap;
  }
  .chat-wrap .chk-subnotes input { cursor: pointer; }

  .chat-wrap ::placeholder { color: var(--muted-text-color); opacity: 1; }
  .chat-wrap :-ms-input-placeholder { color: var(--muted-text-color); opacity: 1; }

  /* ── Mensagens ── */
  .chat-wrap .chat-messages {
    flex: 1; overflow-y: auto; min-height: 140px;
    border: 1px solid var(--main-border-color);
    border-radius: 6px; padding: 10px;
    display: flex; flex-direction: column; gap: 6px;
    outline-offset: -2px;
  }
  .chat-wrap .msg { display: flex; flex-direction: column; gap: 1px; }
  .chat-wrap .msg-header {
    display: flex; align-items: center; gap: 6px;
  }
  .chat-wrap .msg-label {
    font-size: 12px; font-weight: 700; color: var(--muted-text-color);
    text-transform: uppercase; letter-spacing: 0.04em;
  }
  .chat-wrap .msg-timestamp {
    font-size: 12px; color: var(--muted-text-color); margin-left: 2px;
  }
  .chat-wrap .msg-actions {
    display: flex; margin-left: auto; gap: 3px;
    opacity: 0; visibility: hidden; transition: opacity 0.15s;
  }
  .chat-wrap .msg:hover .msg-actions,
  .chat-wrap .msg:focus-within .msg-actions { opacity: 1; visibility: visible; }
  .chat-wrap .msg-actions button {
    padding: 4px 7px; min-height: 28px; font-size: 12px; cursor: pointer;
    border: none; background: transparent; color: var(--muted-text-color);
    border-radius: 3px;
  }
  .chat-wrap .msg-actions button:hover { background: var(--button-background-color); color: var(--main-text-color); }
  .chat-wrap .msg-body { font-size: 15px; line-height: 1.55; overflow-wrap: anywhere; }
  .chat-wrap .msg-user .msg-body {
    padding: 6px 10px;
    background: var(--accented-background-color);
    border-radius: 6px; cursor: pointer;
  }
  .chat-wrap .msg-user .msg-body:hover { filter: brightness(1.03); }
  .chat-wrap .msg-ai .msg-label { color: var(--muted-text-color); }
  .chat-wrap .msg-ai .msg-body {
    padding: 8px 10px;
    background: var(--accented-background-color);
    border-left: 3px solid var(--main-color, #448);
    border-radius: 0 4px 4px 0;
  }
  .chat-wrap .msg + .msg-user .msg-label,
  .chat-wrap .msg + .msg-ai .msg-label { display: none; }
  .chat-wrap .msg + .msg-user .msg-header,
  .chat-wrap .msg + .msg-ai .msg-header { margin-top: 6px; }
  .chat-wrap .msg-user + .msg-user .msg-header { margin-top: 0; }
  .chat-wrap .msg-ai + .msg-ai .msg-header { margin-top: 0; }

  .chat-wrap .msg-collapse-toggle {
    display: inline-block; margin-top: 4px; padding: 4px 8px; min-height: 28px;
    font-size: 12px; cursor: pointer; border: none; border-radius: 3px;
    background: transparent; color: var(--main-color, #448);
  }
  .chat-wrap .msg-collapse-toggle:hover { text-decoration: underline; }

  .chat-wrap .msg-error .msg-body { color: var(--aic-danger); font-style: italic; font-size: 14px; }
  .chat-wrap .msg-system .msg-body { font-size: 13px; text-align: center; color: var(--muted-text-color); font-style: italic; }
  .chat-wrap .msg-hidden { display: none; }

  .chat-wrap .msg-confirm {
    display: flex; justify-content: center; align-items: center; gap: 6px; flex-wrap: wrap;
  }
  .chat-wrap .msg-confirm .msg-body { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

  .chat-wrap .chat-btn {
    padding: 4px 10px; min-height: 32px; cursor: pointer; font-size: 13px;
    background: var(--button-background-color);
    border: 1px solid var(--main-border-color);
    border-radius: 4px; color: var(--main-text-color);
  }
  .chat-wrap .chat-btn:hover { filter: brightness(1.1); }
  .chat-wrap .chat-btn.primary { background: var(--main-color, #4477aa); border: none; color: #fff; font-weight: 600; }
  .chat-wrap .chat-btn.danger { color: var(--aic-danger); }

  .chat-wrap .chat-alert {
    display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
    padding: 8px 12px; font-size: 13px;
    border: 1px solid var(--aic-danger); border-radius: 6px;
    color: var(--main-text-color);
  }
  .chat-wrap .chat-alert[hidden] { display: none; }

  .chat-wrap .btn-scroll-bottom {
    position: absolute; right: 20px; bottom: 128px; z-index: 5;
    display: none; width: 34px; height: 34px; border-radius: 50%;
    border: 1px solid var(--main-border-color); cursor: pointer;
    background: var(--button-background-color); color: var(--main-text-color);
    font-size: 15px; line-height: 1;
  }
  .chat-wrap .btn-scroll-bottom.visible { display: block; }

  /* ── Markdown ── */
  .chat-wrap .msg-body h1, .chat-wrap .msg-body h2,
  .chat-wrap .msg-body h3, .chat-wrap .msg-body h4 {
    margin: 10px 0 4px; line-height: 1.3;
  }
  .chat-wrap .msg-body h1 { font-size: 1.3em; }
  .chat-wrap .msg-body h2 { font-size: 1.15em; }
  .chat-wrap .msg-body h3 { font-size: 1.05em; }
  .chat-wrap .msg-body h4 { font-size: 1em; }
  .chat-wrap .msg-body h1:first-child, .chat-wrap .msg-body h2:first-child { margin-top: 0; }
  .chat-wrap .msg-body p { margin: 4px 0; }
  .chat-wrap .msg-body p:first-child { margin-top: 0; }
  .chat-wrap .msg-body p:last-child { margin-bottom: 0; }
  .chat-wrap .msg-body ul, .chat-wrap .msg-body ol { margin: 4px 0; padding-left: 22px; }
  .chat-wrap .msg-body li { margin: 2px 0; }
  .chat-wrap .msg-body blockquote {
    margin: 6px 0; padding: 4px 10px;
    border-left: 3px solid var(--main-border-color); color: var(--muted-text-color);
  }
  .chat-wrap .msg-body code {
    padding: 1px 5px; font-size: 0.9em;
    background: var(--aic-code-bg);
    border-radius: 3px; font-family: 'Consolas', 'Monaco', monospace;
  }
  .chat-wrap .msg-body pre {
    margin: 6px 0; padding: 10px;
    background: var(--aic-code-bg);
    border: 1px solid var(--main-border-color);
    border-radius: 5px; overflow-x: auto;
  }
  .chat-wrap .msg-body pre code {
    padding: 0; background: none; font-size: 0.85em;
    line-height: 1.45; white-space: pre;
  }
  .chat-wrap .msg-body table {
    border-collapse: collapse; margin: 6px 0; font-size: 0.9em;
    display: block; overflow-x: auto; max-width: 100%; width: 100%;
  }
  .chat-wrap .msg-body th, .chat-wrap .msg-body td {
    border: 1px solid var(--main-border-color);
    padding: 4px 8px; text-align: left;
  }
  .chat-wrap .msg-body th { background: var(--aic-code-bg); font-weight: 600; }
  .chat-wrap .msg-body hr { margin: 8px 0; border: none; border-top: 1px solid var(--main-border-color); }
  .chat-wrap .msg-body a { color: var(--main-color, #448); text-decoration: underline; }
  .chat-wrap .msg-body img { max-width: 100%; border-radius: 4px; margin: 4px 0; }

  /* ── Footer ── */
  .chat-wrap .chat-footer { display: flex; gap: 8px; align-items: flex-end; }
  .chat-wrap .chat-footer textarea {
    flex: 1; padding: 8px 10px; font-size: 15px; resize: none;
    border: 1px solid var(--main-border-color); border-radius: 6px;
    background: var(--accented-background-color);
    color: var(--main-text-color);
    font-family: inherit; line-height: 1.4; max-height: 180px;
  }
  .chat-wrap .chat-actions { display: flex; flex-direction: column; gap: 4px; }
  .chat-wrap .btn-send {
    padding: 7px 14px; min-height: 36px; cursor: pointer; border: none;
    border-radius: 5px; font-size: 15px; font-weight: 600; white-space: nowrap;
    background: var(--main-color, #4477aa); color: #fff;
  }
  .chat-wrap .btn-send:disabled { opacity: 0.55; cursor: not-allowed; }
  .chat-wrap .btn-send:not(:disabled):hover { filter: brightness(1.1); }
  .chat-wrap .btn-send.stop {
    background: var(--aic-danger); animation: pulseStop 1s ease-in-out infinite;
  }
  @keyframes pulseStop {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }
  .chat-wrap .btn-secondary {
    padding: 7px 14px; min-height: 36px; cursor: pointer;
    border-radius: 5px; font-size: 13px; font-weight: 600; white-space: nowrap;
    background: var(--button-background-color);
    border: 1px solid var(--main-border-color);
    color: var(--main-text-color);
  }
  .chat-wrap .btn-secondary:hover { filter: brightness(1.1); }
  .chat-wrap .btn-danger {
    background: none; border: none; cursor: pointer;
    font-size: 14px; color: var(--muted-text-color);
    padding: 2px 4px; align-self: flex-end;
  }
  .chat-wrap .btn-danger:hover { color: var(--aic-danger); }
  .chat-wrap .typing {
    display: none; font-size: 13px;
    color: var(--muted-text-color); font-style: italic;
    padding: 0 2px;
  }
  .chat-wrap .typing.visible { display: block; }

  /* ── Toast ── */
  .chat-wrap .toast {
    position: fixed; bottom: 60px; left: 50%; transform: translateX(-50%);
    padding: 6px 16px; border-radius: 6px; font-size: 13px;
    z-index: 999; opacity: 0; transition: opacity 0.25s; pointer-events: none;
    white-space: normal; text-align: center;
    max-width: min(90vw, 60ch);
  }
  .chat-wrap .toast.show { opacity: 1; }
  .chat-wrap .toast-info { background: var(--main-color, #448); color: #fff; }
  .chat-wrap .toast-error { background: var(--aic-danger); color: #fff; }

  /* ── Responsivo ── */
  @media (max-width: 500px) {
    .chat-wrap { padding: 8px; gap: 6px; }
    .chat-wrap .chat-ctx { flex-wrap: wrap; font-size: 13px; padding: 8px 10px; }
    .chat-wrap .chat-ctx-title { max-width: 120px; }
    .chat-wrap .chat-persona { padding: 8px 10px; }
    .chat-wrap .chat-cmds { padding: 6px 10px; }
    .chat-wrap .chat-cmds .btn-cmd { font-size: 12px; padding: 4px 8px; }
    .chat-wrap .chat-messages { padding: 8px; min-height: 100px; }
    .chat-wrap .chat-footer textarea,
    .chat-wrap .chat-ctx input,
    .chat-wrap .chat-toolbar input,
    .chat-wrap .persona-prompt-wrap textarea { font-size: 16px; }
    .chat-wrap .btn-send, .chat-wrap .btn-secondary { padding: 7px 10px; font-size: 14px; }
    .chat-wrap .chat-actions { gap: 3px; }
    .chat-wrap .model-badge { max-width: 90px; font-size: 12px; }
    .chat-wrap .chk-subnotes { font-size: 12px; }
    .chat-wrap button { min-height: 40px; }
    .chat-wrap .msg-actions button,
    .chat-wrap .msg-collapse-toggle,
    .chat-wrap .btn-danger { min-height: 36px; }
    .chat-wrap .chat-ctx button,
    .chat-wrap .btn-cmd,
    .chat-wrap .btn-persona-toggle,
    .chat-wrap .btn-icon,
    .chat-wrap .chat-toolbar input { min-height: 40px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .chat-wrap, .chat-wrap * { animation: none !important; transition: none !important; }
  }
</style>

<div class="chat-wrap" role="region" aria-label="AI Chat">
  <div class="chat-alert" id="cfg-banner" role="alert" hidden>
    <span id="cfg-banner-text"></span>
    <button class="chat-btn" id="btn-cfg-retry" type="button"></button>
  </div>

  <div class="chat-ctx">
    <span class="chat-label" id="ctx-label">Contexto:</span>
    <button class="chat-ctx-title" id="ctx-title" type="button" title="">nenhum</button>
    <span class="chat-ctx-feedback" id="ctx-feedback"></span>
    <input id="ctx-id-input" aria-label="ID da nota de contexto" placeholder="ID da nota..." />
    <button id="btn-load" type="button">Carregar</button>
    <button id="btn-active" type="button">Nota ativa</button>
    <button id="btn-clear-ctx" type="button" aria-label="Remover contexto" title="Remover contexto">\u2715</button>
  </div>

  <div class="chat-persona">
    <div class="persona-row">
      <span class="chat-label" id="persona-label">Especialista:</span>
      <select id="persona-select" aria-label="Especialista"></select>
      <button class="btn-persona-toggle" id="btn-persona-toggle" type="button" aria-expanded="false" aria-controls="persona-prompt-wrap">\u270E Editar</button>
    </div>
    <div class="persona-prompt-wrap" id="persona-prompt-wrap">
      <textarea id="system-prompt-input" rows="3" aria-label="Prompt de sistema" placeholder="Prompt de sistema personalizado..."></textarea>
      <div class="persona-hint" id="persona-hint">Substitui o prompt padr\u00E3o. Altere aqui ou selecione um especialista.</div>
    </div>
  </div>

  <div class="chat-cmds">
    <span class="chat-label" id="cmds-label">Gerar:</span>
    <button class="btn-cmd" id="btn-cmd-resumo" type="button">Resumo</button>
    <button class="btn-cmd" id="btn-cmd-mermaid" type="button">Mermaid</button>
    <button class="btn-cmd" id="btn-cmd-insights" type="button">Insights</button>
    <button class="btn-cmd" id="btn-cmd-slides" type="button">Slides</button>
  </div>

  <div class="chat-toolbar">
    <span class="chat-label" id="msg-count">0 msgs</span>
    <span class="model-badge" id="model-badge"></span>
    <label class="chk-subnotes"><input type="checkbox" id="chk-subnotes" checked /> <span id="subnotes-label">Subnotas</span></label>
    <input id="search-input" aria-label="Buscar na conversa" placeholder="Buscar na conversa..." style="display:none;" />
    <span class="chat-search-count" id="search-count" aria-live="polite"></span>
    <span class="chat-usage" id="usage-info"></span>
    <button class="btn-icon" id="btn-export" type="button" aria-label="Exportar conversa" title="Exportar conversa (.md)">\u2913</button>
    <button class="btn-icon" id="btn-toggle-search" type="button" aria-label="Buscar na conversa" aria-expanded="false" title="Buscar">\u2315</button>
  </div>

  <div class="chat-messages" id="messages" role="log" aria-live="polite" tabindex="0">
    <div class="msg msg-system"><div class="msg-body">Carregue uma nota como contexto e fa\u00E7a sua pergunta \u2014 ou use os bot\u00F5es acima para gerar notas filhas.</div></div>
  </div>
  <span class="typing" id="typing" role="status" aria-live="polite">IA processando...</span>

  <div class="chat-footer">
    <textarea id="user-input" rows="2" aria-label="Sua mensagem" placeholder="Digite sua pergunta... (Ctrl+Enter para enviar)"></textarea>
    <div class="chat-actions">
      <span class="chat-char-count" id="char-count"></span>
      <button class="btn-send" id="btn-send" type="button">Enviar</button>
      <button class="btn-secondary" id="btn-save" type="button">Salvar</button>
      <button class="btn-danger" id="btn-clear" type="button">Limpar</button>
    </div>
  </div>

  <button class="btn-scroll-bottom" id="btn-scroll-bottom" type="button" aria-label="Rolar para o fim" title="Rolar para o fim">\u2193</button>
  <div class="toast toast-info" id="toast" role="status" aria-live="polite"></div>
</div>
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

/* AIC-ESCAPE-BE (início) */
function aicEscape(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
/* AIC-ESCAPE-BE (fim) */

// Fail-closed: sem marked E sem DOMPurify, devolve texto escapado (nunca HTML cru).
function renderMarkdown(text) {
  const src = String(text == null ? '' : text);
  const fallback = aicEscape(src).replace(/\r?\n/g, '<br>');
  if (!_marked || !_purify) return fallback;
  try {
    const html = _marked.parse(src, { breaks: true, gfm: true });
    if (!_purify) return fallback;
    return _purify.sanitize(html);
  } catch (_) {
    return fallback;
  }
}

// ═══════════════════════════════════════════════════════════════════
// ESTADO
// ═══════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════
// I18N (PT/EN pelo locale do Trilium; EN completo no batch de paridade)
// ═══════════════════════════════════════════════════════════════════

const AIC_I18N = {
  pt: {
    'btn.send': 'Enviar',
    'btn.stop': 'Parar',
    'btn.save': 'Salvar',
    'btn.clear': 'Limpar',
    'btn.load': 'Carregar',
    'btn.active': 'Nota ativa',
    'label.ctx': 'Contexto:',
    'label.persona': 'Especialista:',
    'label.cmds': 'Gerar:',
    'label.subnotes': 'Subnotas',
    'label.msgcount': '{n} msgs',
    'persona.edit': '\u270E Editar',
    'persona.close': '\u25B2 Fechar',
    'hint.persona': 'Substitui o prompt padr\u00E3o. Altere aqui ou selecione um especialista.',
    'ph.ctx': 'ID da nota...',
    'ph.prompt': 'Prompt de sistema personalizado...',
    'ph.search': 'Buscar na conversa...',
    'ph.input': 'Digite sua pergunta... (Ctrl+Enter para enviar)',
    'ctx.none': 'nenhum',
    'ctx.fb': '[{inc}/{tot} notas{pul}]',
    'ctx.fb.skipped': ', {n} puladas',
    'ctx.activeNone': 'Nenhuma nota ativa encontrada.',
    'cmd.resumo': 'Resumo',
    'cmd.mermaid': 'Mermaid',
    'cmd.insights': 'Insights',
    'cmd.slides': 'Slides',
    'cmd.contentHeader': '--- CONTE\u00DAdo DA NOTA "{title}" ---',
    'prompt.commandBase': 'Voc\u00EA \u00E9 um assistente especializado em processamento de notas de conhecimento. Responda apenas com o conte\u00FAdo solicitado, sem coment\u00E1rios adicionais antes ou depois.',
    'prompt.commandSuffix': 'Responda apenas com o conte\u00FAdo solicitado, sem coment\u00E1rios adicionais antes ou depois.',
    'save.persona': 'Especialista',
    'save.title': 'Chat IA \u2014 {when}',
    'ctx.loaded': 'Contexto carregado: "{title}"',
    'ctx.removed': 'Contexto removido.',
    'ctx.invalid': 'Informe um ID de nota.',
    'ctx.notfound': 'Nota n\u00E3o encontrada: {id}',
    'ctx.confirm': 'Trocar o contexto apaga a conversa atual. Continuar?',
    'ctx.confirmBtn': 'Trocar contexto',
    'ctx.unsupported': 'Nota n\u00E3o textual: o contexto pode ficar ruim.',
    'empty.state': 'Carregue uma nota como contexto e fa\u00E7a sua pergunta \u2014 ou use os bot\u00F5es acima para gerar notas filhas.',
    'clear.confirm': 'Limpar toda a conversa?',
    'clear.confirmBtn': 'Limpar',
    'clear.done': 'Conversa limpa.',
    'edit.confirm': 'Editar apaga {n} mensagens seguintes. Continuar?',
    'edit.confirmBtn': 'Editar',
    'cancel': 'Cancelar',
    'copy.done': 'Copiado!',
    'copy.fail': 'Falha ao copiar.',
    'copy.label': 'Copiar',
    'regen.label': 'Regenerar',
    'edit.label': 'Editar',
    'msg.more': 'Mostrar mais',
    'msg.less': 'Mostrar menos',
    'save.none': 'Nenhuma conversa para salvar.',
    'save.noctx': 'Carregue uma nota de contexto antes de salvar.',
    'save.done': 'Conversa salva como nota filha.',
    'save.fail': 'Falha ao salvar: {msg}',
    'export.done': 'Conversa exportada (.md).',
    'char.count': '{n}/32000',
    'search.count': '{n} de {total}',
    'search.none': 'Nenhuma mensagem encontrada.',
    'usage.tokens': 'tokens: {in} entrada / {out} sa\u00EDda',
    'msg.you': 'Voc\u00EA',
    'msg.ai': 'IA',
    'msg.error': 'Erro',
    'typing': 'IA processando...',
    'scroll.label': 'Rolar para o fim',
    'ctx.remove': 'Remover contexto',
    'export.label': 'Exportar conversa',
    'err.storage': 'Sem espa\u00E7o para salvar o hist\u00F3rico local.',
    'err.timeout': 'Tempo esgotado (90 s). Tente de novo.',
    'err.canceled': 'Requisi\u00E7\u00E3o cancelada.',
    'err.empty': 'Resposta vazia da API.',
    'err.network': 'Falha de rede ao chamar a API.',
    'err.busy': 'Aguarde a opera\u00E7\u00E3o atual terminar.',
    'err.toolong': 'Mensagem muito longa (m\u00E1x 32000 caracteres).',
    'cfg.missing': 'Nota de config n\u00E3o encontrada (label #aiChatConfig ou t\u00EDtulo "AI Chat - Config").',
    'cfg.unreadable': 'N\u00E3o foi poss\u00EDvel ler a nota de config.',
    'cfg.nokey': 'Campo openrouter_key n\u00E3o encontrado na nota de config.',
    'cfg.placeholder': 'A config ainda tem o placeholder "your key". Edite a nota de config.',
    'cfg.banner': 'Configura\u00E7\u00E3o incompleta: {msg}',
    'cfg.retry': 'Verificar de novo',
    'cmd.noctx': 'Carregue uma nota como contexto primeiro.',
    'cmd.notfound': 'Nota de contexto n\u00E3o encontrada.',
    'cmd.created': 'Nota criada: "{title}"',
    'prompt.default': 'Voc\u00EA \u00E9 um assistente de conhecimento pessoal integrado ao Trilium Notes. Seja claro e conciso.'
  },
  en: {
    'btn.send': 'Send',
    'btn.stop': 'Stop',
    'btn.save': 'Save',
    'btn.clear': 'Clear',
    'btn.load': 'Load',
    'btn.active': 'Active note',
    'label.ctx': 'Context:',
    'label.persona': 'Persona:',
    'label.cmds': 'Generate:',
    'label.subnotes': 'Subnotes',
    'label.msgcount': '{n} msgs',
    'persona.edit': '\u270E Edit',
    'persona.close': '\u25B2 Close',
    'hint.persona': 'Replaces the default prompt. Edit here or pick a persona.',
    'ph.ctx': 'Note ID...',
    'ph.prompt': 'Custom system prompt...',
    'ph.search': 'Search conversation...',
    'ph.input': 'Type your question... (Ctrl+Enter to send)',
    'ctx.none': 'none',
    'ctx.fb': '[{inc}/{tot} notes{pul}]',
    'ctx.fb.skipped': ', {n} skipped',
    'ctx.activeNone': 'No active note found.',
    'ctx.loaded': 'Context loaded: "{title}"',
    'ctx.removed': 'Context removed.',
    'ctx.invalid': 'Enter a note ID.',
    'ctx.notfound': 'Note not found: {id}',
    'ctx.confirm': 'Switching the context clears the current conversation. Continue?',
    'ctx.confirmBtn': 'Switch context',
    'ctx.unsupported': 'Non-text note: context may be poor.',
    'ctx.remove': 'Remove context',
    'empty.state': 'Load a note as context and ask your question \u2014 or use the buttons above to generate child notes.',
    'clear.confirm': 'Clear the whole conversation?',
    'clear.confirmBtn': 'Clear',
    'clear.done': 'Conversation cleared.',
    'edit.confirm': 'Editing deletes the {n} following messages. Continue?',
    'edit.confirmBtn': 'Edit',
    'cancel': 'Cancel',
    'copy.done': 'Copied!',
    'copy.fail': 'Copy failed.',
    'copy.label': 'Copy',
    'regen.label': 'Regenerate',
    'edit.label': 'Edit',
    'msg.more': 'Show more',
    'msg.less': 'Show less',
    'save.none': 'No conversation to save.',
    'save.noctx': 'Load a context note before saving.',
    'save.done': 'Conversation saved as a child note.',
    'save.fail': 'Save failed: {msg}',
    'save.persona': 'Persona',
    'save.title': 'AI Chat \u2014 {when}',
    'export.done': 'Conversation exported (.md).',
    'export.label': 'Export conversation',
    'char.count': '{n}/32000',
    'search.count': '{n} of {total}',
    'search.none': 'No messages found.',
    'usage.tokens': 'tokens: {in} in / {out} out',
    'msg.you': 'You',
    'msg.ai': 'AI',
    'msg.error': 'Error',
    'typing': 'AI is processing...',
    'scroll.label': 'Scroll to bottom',
    'err.storage': 'No space to save the local history.',
    'err.timeout': 'Timed out (90 s). Try again.',
    'err.canceled': 'Request canceled.',
    'err.empty': 'Empty API response.',
    'err.network': 'Network failure calling the API.',
    'err.busy': 'Wait for the current operation to finish.',
    'err.toolong': 'Message too long (max 32000 characters).',
    'cfg.missing': 'Config note not found (label #aiChatConfig or title "AI Chat - Config").',
    'cfg.unreadable': 'Could not read the config note.',
    'cfg.nokey': 'openrouter_key not found in the config note.',
    'cfg.placeholder': 'The config still has the "your key" placeholder. Edit the config note.',
    'cfg.banner': 'Incomplete configuration: {msg}',
    'cfg.retry': 'Check again',
    'cmd.noctx': 'Load a note as context first.',
    'cmd.notfound': 'Context note not found.',
    'cmd.created': 'Note created: "{title}"',
    'cmd.resumo': 'Summary',
    'cmd.mermaid': 'Mermaid',
    'cmd.insights': 'Insights',
    'cmd.slides': 'Slides',
    'cmd.contentHeader': '--- NOTE CONTENT "{title}" ---',
    'prompt.commandBase': 'You are an assistant specialized in processing knowledge notes. Answer only with the requested content, without additional comments before or after.',
    'prompt.commandSuffix': 'Answer only with the requested content, without additional comments before or after.',
    'prompt.default': 'You are a personal knowledge assistant integrated into Trilium Notes. Be clear and concise.'
  }
};

function tr(key, vars) {
  const d = AIC_I18N[_lang] || {};
  let s = (d && d[key]) || AIC_I18N.pt[key] || key;
  if (vars) {
    Object.keys(vars).forEach(function (k) {
      s = s.split('{' + k + '}').join(String(vars[k]));
    });
  }
  return s;
}

function aplicarI18n() {
  if (!$c.find('.chat-wrap').length) return;
  $c.find('#ctx-label').text(tr('label.ctx'));
  $c.find('#persona-label').text(tr('label.persona'));
  $c.find('#cmds-label').text(tr('label.cmds'));
  $c.find('#subnotes-label').text(tr('label.subnotes'));
  $c.find('#persona-hint').text(tr('hint.persona'));
  $c.find('#ctx-id-input').attr('placeholder', tr('ph.ctx')).attr('aria-label', tr('ph.ctx'));
  $c.find('#system-prompt-input').attr('placeholder', tr('ph.prompt')).attr('aria-label', tr('ph.prompt'));
  $c.find('#search-input').attr('placeholder', tr('ph.search')).attr('aria-label', tr('ph.search'));
  $c.find('#user-input').attr('placeholder', tr('ph.input')).attr('aria-label', tr('ph.input'));
  $c.find('#persona-select').attr('aria-label', tr('label.persona'));
  $c.find('#btn-load').text(tr('btn.load'));
  $c.find('#btn-active').text(tr('btn.active'));
  $c.find('#btn-save').text(tr('btn.save'));
  $c.find('#btn-clear').text(tr('btn.clear'));
  $c.find('#btn-cfg-retry').text(tr('cfg.retry'));
  $c.find('#btn-send').text(activeOp ? tr('btn.stop') : tr('btn.send'));
  $c.find('#btn-persona-toggle').text($c.find('#persona-prompt-wrap').hasClass('open') ? tr('persona.close') : tr('persona.edit'));
  $c.find('#typing').text(tr('typing'));
  $c.find('#btn-export').attr('aria-label', tr('export.label')).attr('title', tr('export.label'));
  $c.find('#btn-clear-ctx').attr('aria-label', tr('ctx.remove')).attr('title', tr('ctx.remove'));
  $c.find('#btn-scroll-bottom').attr('aria-label', tr('scroll.label')).attr('title', tr('scroll.label'));
  $c.find('#btn-toggle-search').attr('aria-label', tr('ph.search')).attr('title', tr('ph.search'));
  if (!ctxNoteId) $c.find('#ctx-title').text(tr('ctx.none'));
  preencherPersonas();
  COMMANDS.forEach(function (cmd) { $c.find('#btn-cmd-' + cmd.id).text(cmdLabel(cmd)); });
  updateMsgCount();
  if (!history.length) {
    const $vazio = $c.find('#messages .msg-system').first();
    if ($vazio.length && $c.find('#messages .msg').length === 1) $vazio.find('.msg-body').text(tr('empty.state'));
  }
}

async function detectarIdioma() {
  try {
    const loc = await api.runOnBackend(() => api.getOption('locale'));
    if (loc) {
      const s = String(loc).toLowerCase();
      _lang = s.indexOf('en') === 0 ? 'en' : 'pt';
    }
  } catch (_) {}
  aplicarI18n();
}

// ═══════════════════════════════════════════════════════════════════
// ESTADO
// ═══════════════════════════════════════════════════════════════════

let history = [];
let ctxNoteId = null;
let _modelLabel = '';
let _isRestoring = false;
let _midSeq = 0;
let _saveStateFalhou = false;
let _lang = (typeof navigator !== 'undefined' && navigator.language ? String(navigator.language) : 'pt').toLowerCase().indexOf('en') === 0 ? 'en' : 'pt';

const STORAGE_KEY = 'ai_chat_state';
const STORAGE_VERSION = 2;

function novoMid() { return 'm' + (++_midSeq) + '-' + Date.now().toString(36); }

function saveState() {
  try {
    const data = {
      v: STORAGE_VERSION,
      history: history.slice(-100).map(function (m) {
        return { role: m.role, content: m.content, ts: m.ts || null, mid: m.mid || null };
      }),
      ctxNoteId,
      personaId: $c.find('#persona-select').val(),
      systemPrompt: $c.find('#system-prompt-input').val(),
      includeSubnotes: $c.find('#chk-subnotes').is(':checked')
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    _saveStateFalhou = false;
  } catch (e) {
    if (!_saveStateFalhou) {
      _saveStateFalhou = true;
      showToast(tr('err.storage'), 'error');
    }
  }
}

function loadState() {
  let raw = null;
  try { raw = localStorage.getItem(STORAGE_KEY); } catch (_) {}
  if (!raw) return;
  let data = null;
  try { data = JSON.parse(raw); } catch (e) {
    console.warn('AI Chat: estado salvo corrompido (preservado no localStorage).', e);
    return;
  }
  if (!data || typeof data !== 'object') return;
  const limpo = Array.isArray(data.history)
    ? data.history.filter(function (m) {
        return m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string';
      }).slice(-100).map(function (m) {
        return {
          role: m.role,
          content: m.content,
          ts: typeof m.ts === 'string' ? m.ts : null,
          mid: typeof m.mid === 'string' ? m.mid : novoMid()
        };
      })
    : [];
  if (data.ctxNoteId) ctxNoteId = String(data.ctxNoteId);
  if (data.personaId) $c.find('#persona-select').val(data.personaId);
  if (typeof data.systemPrompt === 'string' && data.systemPrompt) $c.find('#system-prompt-input').val(data.systemPrompt);
  if (data.includeSubnotes !== undefined) $c.find('#chk-subnotes').prop('checked', !!data.includeSubnotes);
  if (limpo.length) {
    history = limpo;
    _isRestoring = true;
    try { restoreMessages(); } finally { _isRestoring = false; }
  }
}

function restoreMessages() {
  const $msgs = $c.find('#messages');
  $msgs.empty();
  history.forEach(function (m, i) {
    if (m.role === 'system') return;
    const role = m.role === 'user' ? 'user' : 'ai';
    appendMsg(role, m.content, i, m.ts, m.mid);
  });
  if (!history.length) {
    const $vazio = $('<div class="msg msg-system"><div class="msg-body"></div></div>');
    $vazio.find('.msg-body').text(tr('empty.state'));
    $msgs.append($vazio);
  }
  updateMsgCount();
}

// ═══════════════════════════════════════════════════════════════════
// PERSONAS
// ═══════════════════════════════════════════════════════════════════

const PERSONAS = [
  {
    id: 'default', label: '\u22A1 Assistente geral', labelEn: '\u22A1 General assistant',
    prompt: 'Voc\u00EA \u00E9 um assistente de conhecimento pessoal integrado ao Trilium Notes. Seja claro e conciso.',
    promptEn: 'You are a personal knowledge assistant integrated into Trilium Notes. Be clear and concise.'
  },
  {
    id: 'researcher', label: '\u25C8 Pesquisador', labelEn: '\u25C8 Researcher',
    prompt: 'Voc\u00EA \u00E9 um pesquisador acad\u00EAmico rigoroso. Analise o conte\u00FAdo com profundidade, cite evid\u00EAncias, aponte lacunas e sugira fontes complementares. Use linguagem precisa e estruturada. Prefira respostas organizadas com subt\u00F3picos quando relevante.',
    promptEn: 'You are a rigorous academic researcher. Analyze the content in depth, cite evidence, point out gaps and suggest complementary sources. Use precise, structured language. Prefer answers organized with subheadings when relevant.'
  },
  {
    id: 'teacher', label: '\u25B7 Professor', labelEn: '\u25B7 Teacher',
    prompt: 'Voc\u00EA \u00E9 um professor did\u00E1tico e paciente. Explique os conceitos de forma clara, usando analogias e exemplos pr\u00E1ticos. Adapte a complexidade \u00E0 pergunta e sempre verifique se o aluno entendeu antes de avan\u00E7ar. Incentive a curiosidade.',
    promptEn: 'You are a didactic and patient teacher. Explain concepts clearly using analogies and practical examples. Adapt complexity to the question and always check understanding before moving on. Encourage curiosity.'
  },
  {
    id: 'critic', label: '\u25CB Cr\u00EDtico', labelEn: '\u25CB Critic',
    prompt: 'Voc\u00EA \u00E9 um cr\u00EDtico anal\u00EDtico e construtivo. Identifique pontos fracos, premissas question\u00E1veis, contradi\u00E7\u00F5es e argumentos que precisam de refor\u00E7o. Seja direto mas justo. Ao apontar problemas, sugira melhorias concretas.',
    promptEn: 'You are an analytical and constructive critic. Identify weaknesses, questionable assumptions, contradictions and arguments that need strengthening. Be direct but fair. When pointing out problems, suggest concrete improvements.'
  },
  {
    id: 'programmer', label: '\u25B8 Programador', labelEn: '\u25B8 Programmer',
    prompt: 'Voc\u00EA \u00E9 um engenheiro de software s\u00EAnior. Ao responder, prefira c\u00F3digo funcional, explique decis\u00F5es arquiteturais, aponte trade-offs e siga boas pr\u00E1ticas. Use blocos de c\u00F3digo com a linguagem especificada. Seja preciso e pragm\u00E1tico.',
    promptEn: 'You are a senior software engineer. When answering, prefer working code, explain architectural decisions, point out trade-offs and follow best practices. Use code blocks with the specified language. Be precise and pragmatic.'
  },
  {
    id: 'writer', label: '\u270E Escritor', labelEn: '\u270E Writer',
    prompt: 'Voc\u00EA \u00E9 um escritor e editor experiente. Ajude a estruturar ideias, melhorar clareza, ritmo e coes\u00E3o textual. Sugira reformula\u00E7\u00F5es quando necess\u00E1rio. Valorize a voz original do autor enquanto eleva a qualidade do texto.',
    promptEn: 'You are an experienced writer and editor. Help structure ideas and improve clarity, rhythm and textual cohesion. Suggest rewrites when needed. Value the author\u2019s original voice while raising the quality of the text.'
  },
  {
    id: 'socratic', label: '\u25C7 Socr\u00E1tico', labelEn: '\u25C7 Socratic',
    prompt: 'Voc\u00EA \u00E9 um facilitador socr\u00E1tico. Em vez de dar respostas diretas, fa\u00E7a perguntas que estimulem a reflex\u00E3o e levem o interlocutor a descobrir as respostas por si mesmo. Desafie premissas gentilmente. S\u00F3 forne\u00E7a a resposta direta se explicitamente solicitado.',
    promptEn: 'You are a Socratic facilitator. Instead of giving direct answers, ask questions that stimulate reflection and lead the interlocutor to discover answers on their own. Gently challenge assumptions. Only provide the direct answer if explicitly requested.'
  },
  {
    id: 'custom', label: '\u2699 Personalizado', labelEn: '\u2699 Custom',
    prompt: '', promptEn: ''
  }
];

function personaLabel(p) { return (_lang === 'en' && p.labelEn) ? p.labelEn : p.label; }
function personaPrompt(p) { return (_lang === 'en' && p.promptEn) ? p.promptEn : p.prompt; }

const $personaSelect = $c.find('#persona-select');

function preencherPersonas() {
  const atual = $personaSelect.val();
  $personaSelect.empty();
  PERSONAS.forEach(function (p) {
    $personaSelect.append($('<option>').val(p.id).text(personaLabel(p)));
  });
  if (atual) $personaSelect.val(atual);
}
preencherPersonas();

$personaSelect.on('change', function() {
  const pid = $(this).val();
  const persona = PERSONAS.find(function (p) { return p.id === pid; });
  if (persona && pid !== 'custom') {
    $c.find('#system-prompt-input').val(personaPrompt(persona));
  }
  saveState();
});

$c.find('#system-prompt-input').val(personaPrompt(PERSONAS[0]));

$c.find('#btn-persona-toggle').on('click', function() {
  const $wrap = $c.find('#persona-prompt-wrap');
  const open = $wrap.hasClass('open');
  $wrap.toggleClass('open', !open);
  $(this).attr('aria-expanded', open ? 'false' : 'true');
  $(this).text(open ? tr('persona.edit') : tr('persona.close'));
});

let _savePromptTimer = null;
$c.find('#system-prompt-input').on('input', function() {
  const currentId = $personaSelect.val();
  const persona = PERSONAS.find(function (p) { return p.id === currentId; });
  if (persona && persona.id !== 'custom' && $(this).val() !== personaPrompt(persona)) {
    $personaSelect.val('custom');
  }
  if (_savePromptTimer) clearTimeout(_savePromptTimer);
  _savePromptTimer = setTimeout(saveState, 400);
});

function getSystemPrompt() {
  return $c.find('#system-prompt-input').val().trim() || tr('prompt.default');
}

// ═══════════════════════════════════════════════════════════════════
// COMANDOS RÁPIDOS
// ═══════════════════════════════════════════════════════════════════

const COMMANDS = [
  {
    id: 'resumo', label: 'Resumo', titlePt: 'Resumo', titleEn: 'Summary',
    prompt: 'Crie um resumo completo desta nota preservando:\n- O tema central e a linha argumentativa\n- Todos os links e URLs mencionados (mantenha-os clic\u00E1veis como <a href="...">)\n- A bibliografia e refer\u00EAncias completas\n\nFormate a resposta em HTML limpo usando <h2>, <p> e <ul> onde adequado.\nN\u00E3o inclua coment\u00E1rios introdut\u00F3rios \u2014 comece direto pelo conte\u00FAdo.',
    promptEn: 'Create a complete summary of this note preserving:\n- The central theme and the line of argument\n- All links and URLs mentioned (keep them clickable as <a href="...">)\n- The bibliography and complete references\n\nFormat the response as clean HTML using <h2>, <p> and <ul> where appropriate.\nDo not include introductory comments \u2014 start straight with the content.',
    noteType: 'text', mime: null, process: (s) => s
  },
  {
    id: 'mermaid', label: 'Mermaid', titlePt: 'Fluxo', titleEn: 'Flow',
    prompt: 'Crie um diagrama Mermaid (flowchart LR, mindmap ou sequenceDiagram conforme o mais adequado) representando os conceitos e rela\u00E7\u00F5es principais desta nota.\nRetorne APENAS o c\u00F3digo Mermaid puro, sem blocos de markdown (sem \\`\\`\\`), sem explica\u00E7\u00F5es, sem texto adicional.',
    promptEn: 'Create a Mermaid diagram (flowchart LR, mindmap or sequenceDiagram as most appropriate) representing the main concepts and relations of this note.\nReturn ONLY pure Mermaid code, without markdown code fences (no \\`\\`\\`), no explanations, no extra text.',
    noteType: 'code', mime: 'text/x-mermaid',
    process: (s) => s.replace(/^```(?:mermaid)?\r?\n?/i, '').replace(/\r?\n?```$/i, '').trim()
  },
  {
    id: 'insights', label: 'Insights', titlePt: 'Insights', titleEn: 'Insights',
    prompt: 'A partir desta nota, gere:\n1. Insights-chave e padr\u00F5es n\u00E3o \u00F3bvios\n2. Conex\u00F5es com outros campos do conhecimento\n3. Perguntas abertas que o conte\u00FAdo levanta\n4. Poss\u00EDveis pontos cegos ou limita\u00E7\u00F5es do argumento\n\nFormate em HTML com <h3> para cada se\u00E7\u00E3o e <ul>/<li> para os itens.\nSeja anal\u00EDtico e cr\u00EDtico, n\u00E3o apenas descritivo.',
    promptEn: 'From this note, generate:\n1. Key insights and non-obvious patterns\n2. Connections with other fields of knowledge\n3. Open questions the content raises\n4. Possible blind spots or limitations of the argument\n\nFormat as HTML with <h3> for each section and <ul>/<li> for the items.\nBe analytical and critical, not merely descriptive.',
    noteType: 'text', mime: null, process: (s) => s
  },
  {
    id: 'slides', label: 'Slides', titlePt: 'Slides', titleEn: 'Slides',
    prompt: 'Crie o conte\u00FAdo textual para uma apresenta\u00E7\u00E3o de slides a partir desta nota.\nPara cada slide use exatamente este formato HTML:\n\n<section>\n<h2>T\u00EDtulo do Slide</h2>\n<ul>\n  <li>Ponto principal 1</li>\n  <li>Ponto principal 2</li>\n</ul>\n<p><em>Nota do apresentador (opcional)</em></p>\n</section>\n\nGere entre 6 e 10 slides, incluindo: slide de t\u00EDtulo, desenvolvimento e slide de conclus\u00E3o.\nApenas texto \u2014 sem imagens, sem c\u00F3digo, sem coment\u00E1rios fora do HTML.',
    promptEn: 'Create the textual content for a slide presentation from this note.\nFor each slide use exactly this HTML format:\n\n<section>\n<h2>Slide Title</h2>\n<ul>\n  <li>Main point 1</li>\n  <li>Main point 2</li>\n</ul>\n<p><em>Speaker note (optional)</em></p>\n</section>\n\nGenerate between 6 and 10 slides, including: title slide, development and conclusion slide.\nText only \u2014 no images, no code, no comments outside the HTML.',
    noteType: 'text', mime: null, process: (s) => s
  }
];

function cmdPrompt(cmd) { return (_lang === 'en' && cmd.promptEn) ? cmd.promptEn : cmd.prompt; }
function cmdChildTitle(cmd, t) {
  const prefixo = (_lang === 'en' && cmd.titleEn) ? cmd.titleEn : cmd.titlePt;
  return prefixo + ' \u2014 ' + t;
}

// ═══════════════════════════════════════════════════════════════════
// FUNÇÕES DE UI
// ═══════════════════════════════════════════════════════════════════

const COLLAPSE_LIMIT = 1000;
const SCROLL_THRESHOLD = 120;
const TREE_DEPTH = 3;
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
  return new Date().toLocaleString(_lang === 'en' ? 'en-US' : 'pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function aicCopiar(texto) {
  const done = function () { showToast(tr('copy.done'), 'info'); };
  const fail = function () { showToast(tr('copy.fail'), 'error'); };
  const legado = function () {
    try {
      const ta = document.createElement('textarea');
      ta.value = texto;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      if (ok) done(); else fail();
    } catch (_) { fail(); }
  };
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(texto).then(done).catch(legado);
      return;
    }
  } catch (_) {}
  legado();
}

function appendMsg(role, text, historyIdx, ts, mid) {
  const $msgs = $c.find('#messages');
  const filterText = $c.find('#search-input').val().toLowerCase().trim();

  const labels = { user: tr('msg.you'), ai: tr('msg.ai'), error: tr('msg.error'), system: '' };
  const cls = { user: 'msg-user', ai: 'msg-ai', error: 'msg-error', system: 'msg-system' };

  const div = $('<div>').addClass('msg ' + (cls[role] || ''));
  if (historyIdx !== undefined) div.data('history-idx', historyIdx);
  if (mid) div.data('mid', mid);
  if (role === 'user' || role === 'ai') div.data('full-text', String(text));

  if (labels[role]) {
    const header = $('<div>').addClass('msg-header');
    header.append($('<span>').addClass('msg-label').text(labels[role]));

    const timeStr = ts || makeTimestamp();
    header.append($('<span>').addClass('msg-timestamp').text(timeStr));

    if (role === 'ai') {
      const actions = $('<div>').addClass('msg-actions');
      actions.append($('<button>').attr({ type: 'button', 'aria-label': tr('copy.label'), title: tr('copy.label') }).addClass('btn-copy-msg').html('\u2398').on('click', function(e) {
        e.stopPropagation();
        aicCopiar(text);
      }));
      actions.append($('<button>').attr({ type: 'button', 'aria-label': tr('regen.label'), title: tr('regen.label') }).addClass('btn-regen-msg').html('\u21BB').on('click', function(e) {
        e.stopPropagation();
        regeneratePorMid(mid);
      }));
      header.append(actions);
    }
    if (role === 'user') {
      const actions = $('<div>').addClass('msg-actions');
      actions.append($('<button>').attr({ type: 'button', 'aria-label': tr('edit.label'), title: tr('edit.label') }).addClass('btn-edit-msg').html('\u270E').on('click', function(e) {
        e.stopPropagation();
        editarPorMid(mid);
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

  if (role === 'user') {
    body.on('click', function () {
      const selecao = typeof window.getSelection === 'function' ? String(window.getSelection()) : '';
      if (selecao) return;
      editarPorMid(mid);
    });
  }

  if (role === 'ai' && text.length > COLLAPSE_LIMIT) {
    const fullHtml = body.html();
    const shortHtml = renderMarkdown(text.slice(0, COLLAPSE_LIMIT)) + '...';
    body.data('full-html', fullHtml);
    body.data('short-html', shortHtml);
    body.html(shortHtml);
    const toggle = $('<button>').attr('type', 'button').addClass('msg-collapse-toggle').text(tr('msg.more'));
    toggle.on('click', function() {
      const expanded = $(this).text() === tr('msg.less');
      if (expanded) {
        body.html(body.data('short-html'));
        $(this).text(tr('msg.more'));
      } else {
        body.html(body.data('full-html'));
        $(this).text(tr('msg.less'));
      }
    });
    div.append(toggle);
  }

  $msgs.append(div);

  if (filterText && role !== 'system' && String(text).toLowerCase().indexOf(filterText) === -1) {
    div.addClass('msg-hidden');
  }

  scrollToBottom($msgs, _isRestoring);
  updateMsgCount();
}

function addMsg(role, text) {
  const $msgs = $c.find('#messages');
  if (role === 'user' || role === 'ai') {
    const ts = makeTimestamp();
    const mid = novoMid();
    const msg = role === 'user'
      ? { role: 'user', content: text, ts, mid }
      : { role: 'assistant', content: text, ts, mid };
    history.push(msg);
    appendMsg(role, text, history.length - 1, ts, mid);
    saveState();
    return msg;
  }
  const div = $('<div>').addClass('msg ' + (role === 'error' ? 'msg-error' : 'msg-system'));
  if (role === 'error') {
    const header = $('<div>').addClass('msg-header');
    header.append($('<span>').addClass('msg-label').text(tr('msg.error')));
    header.append($('<span>').addClass('msg-timestamp').text(makeTimestamp()));
    div.append(header);
  }
  div.append($('<div>').addClass('msg-body').text(text));
  $msgs.append(div);
  scrollToBottom($msgs, false);
  return null;
}

function setCtx(id, title) {
  ctxNoteId = id;
  const titulo = title || id;
  $c.find('#ctx-title').text(titulo).attr('title', titulo);
  $c.find('#ctx-id-input').val(id);
  history = [];
  $c.find('#messages').empty();
  setCtxFeedback('');
  addMsg('system', tr('ctx.loaded', { title: titulo }));
  saveState();
}

function setCtxFeedback(txt) {
  $c.find('#ctx-feedback').text(txt || '');
}

function setConfigBanner(msg) {
  const $b = $c.find('#cfg-banner');
  if (msg) {
    $c.find('#cfg-banner-text').text(tr('cfg.banner', { msg }));
    $b.prop('hidden', false);
  } else {
    $b.prop('hidden', true);
  }
}

function pedirConfirmacao(msg, okLabel, onOk) {
  const $msgs = $c.find('#messages');
  const $bar = $('<div>').addClass('msg msg-system msg-confirm').attr('role', 'alert');
  const $body = $('<div>').addClass('msg-body');
  $body.append($('<span>').text(msg));
  const $ok = $('<button>').attr('type', 'button').addClass('chat-btn primary').text(okLabel || 'OK');
  const $cancel = $('<button>').attr('type', 'button').addClass('chat-btn').text(tr('cancel'));
  $body.append($ok, $cancel);
  $bar.append($body);
  $msgs.append($bar);
  scrollToBottom($msgs, false);
  $ok.on('click', function () { $bar.remove(); if (onOk) onOk(); });
  $cancel.on('click', function () { $bar.remove(); });
  $cancel.trigger('focus');
}

function setLoading(on) {
  const $btn = $c.find('#btn-send');
  $btn.toggleClass('stop', !!on).text(on ? tr('btn.stop') : tr('btn.send'));
  $c.find('#typing').toggleClass('visible', !!on);
  $c.find('#messages').attr('aria-busy', on ? 'true' : 'false');
}

function showToast(msg, type) {
  const $t = $c.find('#toast');
  $t.text(msg).attr('class', 'toast toast-' + type + ' show');
  clearTimeout($t.data('timer'));
  $t.data('timer', setTimeout(function () { $t.removeClass('show'); }, 2500));
}

function updateMsgCount() {
  const count = history.filter(function (m) { return m.role !== 'system'; }).length;
  $c.find('#msg-count').text(tr('label.msgcount', { n: count }));
}

function atualizarContador() {
  const n = Array.from(String($c.find('#user-input').val() || '')).length;
  const $cc = $c.find('#char-count');
  if (n > 25600) {
    $cc.text(tr('char.count', { n })).toggleClass('limit', n > 32000);
  } else {
    $cc.text('').removeClass('limit');
  }
}

function mostrarUso(usage) {
  const $u = $c.find('#usage-info');
  if (usage && (usage.prompt_tokens || usage.completion_tokens)) {
    $u.text(tr('usage.tokens', { in: usage.prompt_tokens || 0, out: usage.completion_tokens || 0 }));
  } else if (!usage) {
    $u.text('');
  }
}

function mensagemErro(e) {
  const code = e && e.message ? String(e.message) : '';
  const mapa = { CFG_MISSING: 'cfg.missing', CFG_UNREADABLE: 'cfg.unreadable', CFG_NOKEY: 'cfg.nokey', CFG_PLACEHOLDER: 'cfg.placeholder', ERR_EMPTY: 'err.empty' };
  if (mapa[code]) return tr(mapa[code]);
  if (typeof TypeError !== 'undefined' && e instanceof TypeError) return tr('err.network');
  return code || tr('err.network');
}

function atualizarScrollBotao() {
  const $msgs = $c.find('#messages');
  const $btn = $c.find('#btn-scroll-bottom');
  if (!$msgs.length || !$msgs[0]) return;
  const longe = !isNearBottom($msgs);
  $btn.toggleClass('visible', longe && $msgs[0].scrollHeight > $msgs[0].clientHeight + 40);
}

function detectarTema() {
  try {
    const bg = getComputedStyle(document.documentElement).getPropertyValue('--main-background-color') || '#ffffff';
    const nums = bg.match(/\d+/g);
    if (!nums) return;
    const l = (0.299 * Number(nums[0]) + 0.587 * Number(nums[1] || nums[0]) + 0.114 * Number(nums[2] || nums[0])) / 255;
    $c.find('.chat-wrap').toggleClass('aic-light', l > 0.6);
  } catch (_) {}
}

// ═══════════════════════════════════════════════════════════════════
// RAG (ÁRVORE DE NOTAS)
// ═══════════════════════════════════════════════════════════════════

async function getNoteTreeBackend(noteId, maxDepth) {
  return await api.runOnBackend((nid, depth) => {
    const MAX_NOTES = 40;
    const MAX_CHARS_POR_NOTA = 2000;
    const TIPOS = ['text', 'code', 'render'];
    const out = [];
    let skipped = 0;
    function arquivada(note) {
      try { return note.getLabelValue ? note.getLabelValue('archived') != null : false; } catch (_) { return false; }
    }
    function walk(id, d) {
      if (d <= 0 || out.length >= MAX_NOTES) return;
      let note = null;
      try { note = api.getNote(id); } catch (_) { note = null; }
      if (!note || note.isDeleted) { skipped++; return; }
      let tipo = '';
      let protegida = false;
      try {
        tipo = note.type || '';
        protegida = !!note.isProtected;
      } catch (_) {}
      if (protegida || arquivada(note) || TIPOS.indexOf(tipo) === -1) { skipped++; return; }
      let plain = '';
      try {
        const raw = note.getContent() || '';
        plain = String(raw).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_CHARS_POR_NOTA);
      } catch (_) { skipped++; return; }
      out.push({ title: note.title, content: plain });
      try {
        const children = note.getChildNotes();
        for (const child of children) walk(child.noteId, d - 1);
      } catch (_) { skipped++; }
    }
    walk(nid, depth);
    return { items: out, skipped: skipped };
  }, [noteId, maxDepth]);
}

async function buildContextText(noteId) {
  const includeSub = $c.find('#chk-subnotes').is(':checked');
  let note = null;
  try { note = await api.getNote(noteId); } catch (_) {}
  if (!note) return { text: '', feedback: '' };

  if (!includeSub) {
    let plain = '';
    try {
      const raw = await note.getContent();
      plain = String(raw || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_CTX_CHARS);
    } catch (_) { plain = ''; }
    return { text: 'Contexto \u2014 nota "' + note.title + '":\n' + plain, feedback: '' };
  }

  let tree = { items: [], skipped: 0 };
  try { tree = await getNoteTreeBackend(noteId, TREE_DEPTH); } catch (_) {}
  const items = Array.isArray(tree && tree.items) ? tree.items : [];
  const erros = (tree && tree.skipped) ? tree.skipped : 0;
  const total = items.length + erros;
  let combined = '';
  let included = 0;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item.content) continue;
    const block = '\n\n--- ' + item.title + ' ---\n' + item.content;
    if (!combined && block.length > MAX_CTX_CHARS) {
      combined = block.slice(0, MAX_CTX_CHARS);
      included++;
      continue;
    }
    if ((combined.length + block.length) <= MAX_CTX_CHARS) {
      combined += block;
      included++;
    }
  }
  const puladas = total - included;
  const feedback = tr('ctx.fb', {
    inc: included,
    tot: total,
    pul: puladas > 0 ? tr('ctx.fb.skipped', { n: puladas }) : ''
  });
  return { text: 'Contexto \u2014 nota "' + note.title + '"' + feedback + ':\n' + combined, feedback: feedback };
}

// ═══════════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════════

const CONFIG_LABEL = 'aiChatConfig';
const CONFIG_TITLES = ['AI Chat - Config', 'AI Chat Config', 'AI Chat - config'];

/* AIC-CONFIG-BE (início) */
function parseAiChatConfig(content) {
  const ativo = String(content == null ? '' : content)
    .split(/\r?\n/)
    .filter(function (l) { return !/^\s*#/.test(l); })
    .join('\n');
  const pick = function (re) {
    const m = ativo.match(re);
    return m ? m[1].trim() : null;
  };
  const key = pick(/(?:^|\n)\s*openrouter_key:\s*(\S+)/);
  const model = pick(/(?:^|\n)\s*model:\s*(\S+)/);
  const temp = pick(/(?:^|\n)\s*temperature:\s*(-?[\d.]+)/);
  const maxTok = pick(/(?:^|\n)\s*max_tokens:\s*(\d+)/);
  const base = pick(/(?:^|\n)\s*api_base:\s*(\S+)/);
  const tempNum = temp != null ? parseFloat(temp) : NaN;
  const maxNum = maxTok != null ? parseInt(maxTok, 10) : NaN;
  return {
    key: key,
    model: model || 'openrouter/auto',
    temperature: Number.isFinite(tempNum) ? Math.min(2, Math.max(0, tempNum)) : 0.7,
    maxTokens: Number.isFinite(maxNum) ? Math.min(32000, Math.max(1, maxNum)) : 4096,
    apiBase: (base || 'https://openrouter.ai/api/v1').replace(/\/+$/, ''),
    placeholderKey: !key || /^your([-_ ]|$)/i.test(key) || key === 'YOUR_API_KEY_HERE'
  };
}
/* AIC-CONFIG-BE (fim) */

async function acharNotaConfig() {
  try {
    if (api.getNotesWithLabel) {
      const porLabel = api.getNotesWithLabel(CONFIG_LABEL);
      if (porLabel && porLabel.length) return porLabel[0];
    }
  } catch (_) {}
  for (let i = 0; i < CONFIG_TITLES.length; i++) {
    try {
      const notes = await api.searchForNotes('note.title = ' + JSON.stringify(CONFIG_TITLES[i]));
      if (notes && notes.length) return notes[0];
    } catch (_) {}
  }
  return null;
}

async function loadConfig() {
  const note = await acharNotaConfig();
  if (!note) throw new Error('CFG_MISSING');
  let content = null;
  try { content = await note.getProtectedContent(); } catch (_) {}
  if (typeof content !== 'string' || !content) {
    try { content = await note.getContent(); } catch (_) { content = null; }
  }
  if (typeof content !== 'string') throw new Error('CFG_UNREADABLE');
  const cfg = parseAiChatConfig(content);
  if (!cfg.key) throw new Error('CFG_NOKEY');
  if (cfg.placeholderKey) throw new Error('CFG_PLACEHOLDER');
  _modelLabel = cfg.model;
  $c.find('#model-badge').text(cfg.model).attr('title', cfg.model);
  setConfigBanner('');
  return cfg;
}

async function verificarConfig() {
  try {
    await loadConfig();
    return true;
  } catch (e) {
    setConfigBanner(mensagemErro(e));
    $c.find('#model-badge').text('').attr('title', '');
    return false;
  }
}

async function loadNote(noteId) {
  if (!noteId) { showToast(tr('ctx.invalid'), 'error'); return; }
  let note = null;
  try { note = await api.getNote(noteId); } catch (_) {}
  if (!note) { showToast(tr('ctx.notfound', { id: noteId }), 'error'); return; }
  if (history.length) {
    pedirConfirmacao(tr('ctx.confirm'), tr('ctx.confirmBtn'), function () { aplicarContexto(note); });
    return;
  }
  aplicarContexto(note);
}

function aplicarContexto(note) {
  try {
    if (note.type && ['text', 'code', 'render'].indexOf(note.type) === -1) {
      showToast(tr('ctx.unsupported'), 'error');
    }
  } catch (_) {}
  setCtx(note.noteId, note.title);
}

// ═══════════════════════════════════════════════════════════════════
// CHAT PRINCIPAL
// ═══════════════════════════════════════════════════════════════════

let activeOp = null;
const MAX_HISTORY_CHARS = 40000;

function beginOp(kind) {
  const controller = new AbortController();
  const op = { kind: kind, controller: controller, timer: null, timedOut: false };
  op.timer = setTimeout(function () {
    op.timedOut = true;
    try { controller.abort(); } catch (_) {}
  }, 90000);
  activeOp = op;
  return op;
}

function endOp(op) {
  if (op && op.timer) clearTimeout(op.timer);
  if (activeOp === op) activeOp = null;
}

function historicoJanela(maxChars) {
  const budget = maxChars || MAX_HISTORY_CHARS;
  const out = [];
  let total = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    const m = history[i];
    const len = String(m.content || '').length + 8;
    if (out.length && total + len > budget) break;
    total += len;
    out.unshift(m);
  }
  return out;
}

function mensagensApi(system) {
  return [{ role: 'system', content: system }].concat(historicoJanela().map(function (m) {
    return { role: m.role, content: m.content };
  }));
}

async function callApi(cfg, messages, signal) {
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
      messages: messages
    }),
    signal: signal
  });
  if (!res.ok) {
    let errMsg = 'HTTP ' + res.status;
    try {
      const errData = await res.json();
      errMsg = (errData && errData.error && errData.error.message) || errMsg;
    } catch (_) {}
    throw new Error(errMsg);
  }
  const data = await res.json();
  if (data && data.error) throw new Error(data.error.message || JSON.stringify(data.error));
  const reply = data && data.choices && data.choices[0] && data.choices[0].message
    ? data.choices[0].message.content
    : null;
  if (typeof reply !== 'string' || !reply.trim()) throw new Error('ERR_EMPTY');
  return { reply: reply, usage: (data && data.usage) || null };
}

async function montarSystemPrompt() {
  let system = getSystemPrompt();
  if (ctxNoteId) {
    const ctx = await buildContextText(ctxNoteId);
    if (ctx && ctx.text) {
      system += '\n\n' + ctx.text;
      if (ctx.feedback) setCtxFeedback(ctx.feedback);
    }
  }
  return system;
}

function tratarFalhaChat(e, op, restaurarTexto) {
  const msg = mensagemErro(e);
  const code = e && e.message ? String(e.message) : '';
  if (code.indexOf('CFG_') === 0) setConfigBanner(msg);
  if (e && e.name === 'AbortError') {
    if (op && op.timedOut) addMsg('error', tr('err.timeout'));
    else addMsg('system', tr('err.canceled'));
  } else {
    addMsg('error', msg);
  }
  if (restaurarTexto) {
    const input = $c.find('#user-input');
    input.val(restaurarTexto);
    try { autoResize.call(input[0]); } catch (_) {}
    input.trigger('focus');
  }
}

function removerUltimaDoUsuario(text) {
  const last = history[history.length - 1];
  if (last && last.role === 'user' && last.content === text) history.pop();
  const $alvo = $c.find('#messages .msg-user').last();
  if ($alvo.length && $alvo.find('.msg-body').text() === text) $alvo.remove();
  updateMsgCount();
}

function acharIndicePorMid(mid) {
  if (!mid) return -1;
  for (let i = 0; i < history.length; i++) {
    if (history[i].mid === mid) return i;
  }
  return -1;
}

function editarPorMid(mid) {
  const idx = acharIndicePorMid(mid);
  if (idx >= 0) editMessage(idx);
}

function regeneratePorMid(mid) {
  const idx = mid ? acharIndicePorMid(mid) : history.length - 1;
  if (idx >= 0) regenerate(idx);
}

async function send() {
  if (activeOp) {
    if (activeOp.kind === 'chat') {
      try { activeOp.controller.abort(); } catch (_) {}
      return;
    }
    showToast(tr('err.busy'), 'error');
    return;
  }

  const input = $c.find('#user-input');
  const text = input.val().trim();
  if (!text) return;
  if (Array.from(text).length > 32000) { showToast(tr('err.toolong'), 'error'); return; }
  input.val('');
  input.css('height', 'auto');
  atualizarContador();

  addMsg('user', text);
  setLoading(true);
  const op = beginOp('chat');

  try {
    const cfg = await loadConfig();
    const system = await montarSystemPrompt();
    const resposta = await callApi(cfg, mensagensApi(system), op.controller.signal);
    addMsg('ai', resposta.reply);
    mostrarUso(resposta.usage);
  } catch (e) {
    removerUltimaDoUsuario(text);
    tratarFalhaChat(e, op, text);
  } finally {
    setLoading(false);
    endOp(op);
    input.trigger('focus');
  }
}

async function regenerate(historyIdx) {
  if (activeOp) { showToast(tr('err.busy'), 'error'); return; }
  if (historyIdx === undefined) historyIdx = history.length - 1;
  const alvo = history[historyIdx];
  if (!alvo || alvo.role !== 'assistant') return;
  const anterior = history[historyIdx - 1];
  if (!anterior || anterior.role !== 'user') return;

  const snapshot = history.slice();
  history = history.slice(0, historyIdx);
  restoreMessages();
  setLoading(true);
  const op = beginOp('chat');

  try {
    const cfg = await loadConfig();
    const system = await montarSystemPrompt();
    const resposta = await callApi(cfg, mensagensApi(system), op.controller.signal);
    addMsg('ai', resposta.reply);
    mostrarUso(resposta.usage);
  } catch (e) {
    history = snapshot;
    restoreMessages();
    const msg = mensagemErro(e);
    const code = e && e.message ? String(e.message) : '';
    if (code.indexOf('CFG_') === 0) setConfigBanner(msg);
    if (e && e.name === 'AbortError') {
      if (op.timedOut) addMsg('error', tr('err.timeout'));
      else addMsg('system', tr('err.canceled'));
    } else {
      addMsg('error', msg);
    }
  } finally {
    setLoading(false);
    endOp(op);
  }
}

// ═══════════════════════════════════════════════════════════════════
// EDITAR MENSAGEM
// ═══════════════════════════════════════════════════════════════════

function editMessage(historyIdx) {
  const msg = history[historyIdx];
  if (!msg || msg.role !== 'user') return;

  const remaining = history.length - historyIdx - 1;
  const aplicar = function () {
    const $input = $c.find('#user-input');
    $input.val(msg.content);
    autoResize.call($input[0]);
    $input.trigger('focus');
    history.splice(historyIdx);
    restoreMessages();
    saveState();
  };
  if (remaining > 0) {
    pedirConfirmacao(tr('edit.confirm', { n: remaining }), tr('edit.confirmBtn'), aplicar);
    return;
  }
  aplicar();
}

// ═══════════════════════════════════════════════════════════════════
// SALVAR NOTA
// ═══════════════════════════════════════════════════════════════════

async function saveNote() {
  if (!history.length) { showToast(tr('save.none'), 'error'); return; }
  if (!ctxNoteId) { showToast(tr('save.noctx'), 'error'); return; }

  const personaLabel = aicEscape($personaSelect.find('option:selected').text());

  const html = history.map(function (m) {
    const who = m.role === 'user' ? '<strong>' + tr('msg.you') + '</strong>' : '<strong>' + tr('msg.ai') + '</strong>';
    return '<p>' + who + ': ' + aicEscape(m.content).replace(/\r?\n/g, '<br>') + '</p>';
  }).join('<hr>');

  const now = new Date().toLocaleString(_lang === 'en' ? 'en-US' : 'pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  const metaHtml = '<p><em>' + tr('save.persona') + ': ' + personaLabel + '</em></p><hr>' + html;

  try {
    const noteId = await api.runOnBackend((parentNoteId, title, content) => {
      const nova = api.createNewNote({ parentNoteId, title, content, type: 'text' });
      return nova && nova.noteId ? nova.noteId : null;
    }, [ctxNoteId, tr('save.title', { when: now }), metaHtml]);
    showToast(tr('save.done'), 'info');
    if (noteId && typeof api.openTabWithNote === 'function') {
      try { api.openTabWithNote(noteId); } catch (_) {}
    }
  } catch (e) {
    showToast(tr('save.fail', { msg: (e && e.message) || '' }), 'error');
  }
}

// ═══════════════════════════════════════════════════════════════════
// COMANDOS RÁPIDOS
// ═══════════════════════════════════════════════════════════════════

function cmdLabel(cmd) {
  const s = tr('cmd.' + cmd.id);
  return s === 'cmd.' + cmd.id ? cmd.label : s;
}

function setCommandsBusy(on, excecao) {
  COMMANDS.forEach(function (cmd) {
    const $b = $c.find('#btn-cmd-' + cmd.id);
    $b.prop('disabled', !!on);
    $b.text(on && cmd.id === excecao ? '\u2026' : cmdLabel(cmd));
  });
}

async function runCommand(cmd) {
  if (!ctxNoteId) {
    showToast(tr('cmd.noctx'), 'error');
    return;
  }
  if (activeOp) {
    showToast(tr('err.busy'), 'error');
    return;
  }

  setCommandsBusy(true, cmd.id);
  const op = beginOp('command');

  try {
    const cfg = await loadConfig();
    const note = await api.getNote(ctxNoteId);
    if (!note) throw new Error('CMD_NOTFOUND');
    const ctx = await buildContextText(ctxNoteId);
    if (ctx && ctx.feedback) setCtxFeedback(ctx.feedback);

    const pid = $personaSelect.val();
    let cmdSystem = tr('prompt.commandBase');
    if (pid !== 'default') {
      const persona = PERSONAS.find(function (p) { return p.id === pid; });
      const promptPersona = (pid === 'custom') ? getSystemPrompt() : (persona ? personaPrompt(persona) : '');
      if (promptPersona) {
        cmdSystem = promptPersona + '\n\n' + tr('prompt.commandSuffix');
      }
    }

    const userMsg = cmdPrompt(cmd) + '\n\n' + tr('cmd.contentHeader', { title: note.title }) + '\n' + (ctx && ctx.text ? ctx.text : '');

    const resposta = await callApi(cfg, [
      { role: 'system', content: cmdSystem },
      { role: 'user', content: userMsg }
    ], op.controller.signal);

    const content = cmd.process(resposta.reply);
    const childTitle = cmdChildTitle(cmd, note.title);
    const safeContent = (cmd.noteType === 'text' && _purify) ? _purify.sanitize(content) : content;

    const noteId = await api.runOnBackend((parentNoteId, title, noteContent, type, mime) => {
      const nova = api.createNewNote({ parentNoteId, title, content: noteContent, type: type, mime: mime || undefined });
      return nova && nova.noteId ? nova.noteId : null;
    }, [ctxNoteId, childTitle, safeContent, cmd.noteType, cmd.mime]);

    showToast(tr('cmd.created', { title: childTitle }), 'info');
    if (noteId && typeof api.openTabWithNote === 'function') {
      try { api.openTabWithNote(noteId); } catch (_) {}
    }

  } catch (e) {
    const msg = mensagemErro(e);
    const code = e && e.message ? String(e.message) : '';
    if (code.indexOf('CFG_') === 0) setConfigBanner(msg);
    if (code === 'CMD_NOTFOUND') {
      showToast(tr('cmd.notfound'), 'error');
    } else if (e && e.name === 'AbortError') {
      showToast(op.timedOut ? tr('err.timeout') : tr('err.canceled'), 'error');
    } else {
      showToast(msg, 'error');
    }
  } finally {
    setCommandsBusy(false);
    endOp(op);
  }
}

// ═══════════════════════════════════════════════════════════════════
// SEARCH / FILTRO
// ═══════════════════════════════════════════════════════════════════

let searchVisible = false;
$c.find('#btn-toggle-search').on('click', function() {
  searchVisible = !searchVisible;
  $(this).attr('aria-expanded', searchVisible ? 'true' : 'false');
  $c.find('#search-input').toggle(searchVisible);
  if (searchVisible) {
    $c.find('#search-input').trigger('focus');
  } else {
    $c.find('#search-input').val('');
    filterMessages('');
  }
});

$c.find('#search-input').on('input', function() {
  filterMessages($(this).val());
});

function filterMessages(query) {
  const q = String(query || '').toLowerCase().trim();
  let visiveis = 0;
  let totalMsg = 0;
  $c.find('#messages .msg').each(function() {
    const $msg = $(this);
    if ($msg.hasClass('msg-system')) return;
    totalMsg++;
    const texto = String($msg.data('full-text') || $msg.find('.msg-body').text());
    if (!q || texto.toLowerCase().indexOf(q) !== -1) {
      $msg.removeClass('msg-hidden');
      visiveis++;
    } else {
      $msg.addClass('msg-hidden');
    }
  });
  const $cnt = $c.find('#search-count');
  if (!q || !totalMsg) { $cnt.text(''); return; }
  $cnt.text(visiveis ? tr('search.count', { n: visiveis, total: totalMsg }) : tr('search.none'));
}

function exportarConversa() {
  if (!history.length) { showToast(tr('save.none'), 'error'); return; }
  const linhas = history.map(function (m) {
    const quem = m.role === 'user' ? tr('msg.you') : tr('msg.ai');
    return '**' + quem + '** (' + (m.ts || '') + '):\n' + m.content;
  }).join('\n\n---\n\n');
  try {
    const blob = new Blob([linhas], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'chat-ia-' + new Date().toISOString().slice(0, 10) + '.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
    showToast(tr('export.done'), 'info');
  } catch (_) {
    showToast(tr('copy.fail'), 'error');
  }
}

// ═══════════════════════════════════════════════════════════════════
// AUTO-RESIZE TEXTAREA
// ═══════════════════════════════════════════════════════════════════

function autoResize() {
  this.style.height = 'auto';
  this.style.height = Math.min(this.scrollHeight, 180) + 'px';
}

$c.find('#user-input').on('input', function () {
  autoResize.call(this);
  atualizarContador();
});

// ═══════════════════════════════════════════════════════════════════
// EVENT LISTENERS
// ═══════════════════════════════════════════════════════════════════

$c.find('#btn-send').on('click', function () { send(); });

$c.find('#btn-save').on('click', function () { saveNote(); });

$c.find('#btn-clear').on('click', function () {
  if (!history.length) return;
  pedirConfirmacao(tr('clear.confirm'), tr('clear.confirmBtn'), function () {
    history = [];
    $c.find('#messages').empty();
    $c.find('#search-input').val('').hide();
    $c.find('#search-count').text('');
    searchVisible = false;
    $c.find('#btn-toggle-search').attr('aria-expanded', 'false');
    addMsg('system', tr('clear.done'));
    saveState();
    updateMsgCount();
  });
});

$c.find('#btn-load').on('click', function() {
  loadNote(String($c.find('#ctx-id-input').val() || '').trim());
});

$c.find('#ctx-id-input').on('keydown', function (e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    $c.find('#btn-load').trigger('click');
  }
});

$c.find('#btn-active').on('click', async function() {
  let note = null;
  try { note = api.getActiveContextNote(); } catch (_) {}
  if (note) await loadNote(note.noteId);
  else showToast(tr('ctx.activeNone'), 'error');
});

$c.find('#ctx-title').on('click', function () {
  if (!ctxNoteId) return;
  try {
    if (typeof api.openTabWithNote === 'function') api.openTabWithNote(ctxNoteId);
  } catch (_) {}
});

$c.find('#btn-clear-ctx').on('click', function () {
  if (!ctxNoteId) return;
  ctxNoteId = null;
  $c.find('#ctx-title').text(tr('ctx.none')).attr('title', '');
  $c.find('#ctx-id-input').val('');
  setCtxFeedback('');
  showToast(tr('ctx.removed'), 'info');
  saveState();
});

$c.find('#btn-export').on('click', exportarConversa);

$c.find('#btn-cfg-retry').on('click', function () { verificarConfig(); });

$c.find('#btn-scroll-bottom').on('click', function () {
  const $msgs = $c.find('#messages');
  if ($msgs.length) $msgs.scrollTop($msgs[0].scrollHeight);
  atualizarScrollBotao();
});

$c.find('#messages').on('scroll', function () {
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(atualizarScrollBotao);
  else atualizarScrollBotao();
});

$c.find('#user-input').on('keydown', function(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    send();
  }
  if (e.key === 'Escape') {
    if (searchVisible) {
      $c.find('#btn-toggle-search').trigger('click');
    } else {
      $(this).blur();
    }
  }
});

// Atalhos escopados ao plugin (não sequestram o app; sem acúmulo em re-render)
$c.off('keydown.aichat').on('keydown.aichat', function(e) {
  const mod = e.ctrlKey || e.metaKey;
  if (!mod || !e.shiftKey) return;
  const k = String(e.key || '').toLowerCase();
  if (k === 'c') {
    e.preventDefault();
    $c.find('#btn-clear').trigger('click');
  } else if (k === 's') {
    e.preventDefault();
    saveNote();
  } else if (k === 'f') {
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
  await detectarIdioma();
  detectarTema();
  loadState();

  if (ctxNoteId) {
    try {
      const note = await api.getNote(ctxNoteId);
      if (note) $c.find('#ctx-title').text(note.title).attr('title', note.title);
    } catch {}
  }

  await verificarConfig();
  atualizarContador();
  atualizarScrollBotao();
})();
