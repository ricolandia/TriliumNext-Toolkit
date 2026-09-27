// shared-notes-widget.js
// ══════════════════════════════════════════════════════════════════════════════
// NOTA TRILIUM:
//   Tipo : Code
//   MIME : application/javascript;env=frontend
//   Label: #widget
//
// DEPENDÊNCIA — nota com label #sharedNotesConfig contendo:
//   #myName     = Seu Nome
//   #myEndpoint = https://seutrilium.com   (necessário para ENVIAR e RECEBER respostas)
//
// SEGURANÇA:
//   - Token efêmero (UUID) por convite — NÃO é o token ETAPI
//   - ETAPI nunca aparece na string de convite
//   - Envio de respostas via api.runAsyncOnBackendWithManualTransactionHandling + fetch
//     (sem CORS; o sandbox de scripts 0.105+ bloqueia require('https'))
//   - Convite multiuso (multi-rodada); revogar = deletar a gate note
//   - Expiração do convite: 7 dias (verificada no handler)
//   - Canal de retorno (myReplyToken): permite o destinatário responder de volta
//   - Endpoint: https sempre; http apenas localhost/rede privada
// ══════════════════════════════════════════════════════════════════════════════

const STYLE = `<style>
.sn-wrap {
    border-bottom: 1px solid var(--main-border-color);
    background: var(--accented-background-color);
    font-size: .88rem;
}
.sn-tabs {
    display: flex; gap: 2px; padding: 5px 12px 0;
    border-bottom: 1px solid var(--main-border-color);
}
.sn-tab {
    padding: 6px 14px; cursor: pointer;
    border-radius: 4px 4px 0 0;
    border: 1px solid transparent; border-bottom: none;
    color: var(--muted-text-color);
    background: transparent; font-size: .84rem; line-height: 1.5;
}
.sn-tab.active {
    background: var(--main-background-color);
    border-color: var(--main-border-color);
    color: var(--main-text-color); font-weight: 600;
}
.sn-tab.hidden { display: none; }
.sn-panel { display: none; padding: 10px 14px 12px; }
.sn-panel.active { display: block; }
.sn-row { display: flex; gap: 8px; align-items: center; margin-bottom: 6px; flex-wrap: wrap; }
.sn-textarea {
    width: 100%; box-sizing: border-box;
    padding: 6px 10px;
    background: var(--input-background-color, #1a1a2e);
    border: 1px solid var(--main-border-color);
    color: var(--main-text-color);
    border-radius: 4px; font-size: .84rem;
    font-family: monospace; resize: vertical; margin-bottom: 6px;
}
.sn-textarea:focus { outline: none; border-color: #7c3aed; }
.sn-btn {
    padding: 7px 16px;
    background: var(--button-background-color);
    color: var(--button-text-color);
    border: 1px solid var(--button-border-color);
    border-radius: 4px; cursor: pointer; font-size: .84rem; white-space: nowrap; line-height: 1.4;
}
.sn-btn:hover { opacity: .85; }
.sn-btn.primary { background: #7c3aed; color: #fff; border-color: #7c3aed; transition: background .15s, opacity .15s; }
.sn-btn.primary:hover { background: #6d28d9; }
.sn-btn:disabled { opacity: .45; cursor: not-allowed; transition: none; }
.sn-status { font-size: .82rem; margin-top: 4px; min-height: 1.2rem; color: var(--muted-text-color); }
.sn-status.ok   { color: #4ade80; }
.sn-status.err  { color: #f87171; }
.sn-status.warn { color: #facc15; }
.sn-badge { display: inline-block; padding: 3px 10px; font-size: .78rem; background: #14532d; color: #4ade80; border-radius: 10px; }
.sn-info { font-size: .82rem; color: var(--muted-text-color); line-height: 1.5; margin-bottom: 8px; }
.sn-icon { vertical-align: middle; margin-right: 4px; }
</style>`;

const ICONS = {
    share: '<svg class="sn-icon" viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M5 3v18h14v-2H7V5h12V3H5zm12 4l-1.41 1.41L18.17 11H9v2h9.17l-2.58 2.58L17 17l5-5-5-5z"/></svg>',
    inbox: '<svg class="sn-icon" viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5v-3h3.56c.69 1.19 1.97 2 3.45 2s2.75-.81 3.45-2H19v3zm0-5h-4.99c0 1.1-.9 2-2 2s-2-.9-2-2H5V5h14v9z"/></svg>',
    reply: '<svg class="sn-icon" viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z"/></svg>',
    copy: '<svg class="sn-icon" viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>',
    ok: '<svg class="sn-icon" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>',
    err: '<svg class="sn-icon" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/></svg>',
    warn: '<svg class="sn-icon" viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>'
};

// ── Helpers (compatíveis com contexto não-seguro: Trilium via http:// na LAN) ─

function snUuid() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        try { return crypto.randomUUID(); } catch(e) { /* usa fallback */ }
    }
    const bytes = new Uint8Array(16);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        crypto.getRandomValues(bytes);
    } else {
        for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
    }
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}

function snEscape(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
}

// https sempre; http apenas localhost/rede privada/Tailscale (169.254/16 bloqueado — metadados de nuvem)
function snValidarEndpoint(raw, lang) {
    const url = String(raw || '').trim().replace(/\/+$/, '');
    if (!url) return { ok: false, erro: snTranslate(lang, 'endpoint.vazio') };
    let u;
    try { u = new URL(url); } catch(e) { return { ok: false, erro: snTranslate(lang, 'endpoint.invalida', { url }) }; }
    if (u.protocol !== 'https:' && u.protocol !== 'http:') {
        return { ok: false, erro: snTranslate(lang, 'endpoint.protocolo') };
    }
    if (u.protocol === 'https:') return { ok: true, url, aviso: '' };
    const h = u.hostname.toLowerCase().replace(/^\[|\]$/g, '');
    if (/^169\.254\./.test(h)) {
        return { ok: false, erro: snTranslate(lang, 'endpoint.linklocal') };
    }
    const ehLocal = h === 'localhost' || h === '127.0.0.1' || h === '::1' ||
        /^10\./.test(h) || /^192\.168\./.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h) ||
        /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(h);
    if (!ehLocal) {
        return { ok: false, erro: snTranslate(lang, 'endpoint.http_publico') };
    }
    return { ok: true, url, aviso: snTranslate(lang, 'endpoint.http_aviso') };
}

function snCopiar(texto) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(texto);
    }
    return new Promise((resolve, reject) => {
        try {
            const ta = document.createElement('textarea');
            ta.value = texto;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            const ok = document.execCommand('copy');
            document.body.removeChild(ta);
            ok ? resolve() : reject(new Error('execCommand("copy") falhou.'));
        } catch(e) { reject(e); }
    });
}

// ── I18N (início) ───────────────────────────────────────────────────────
// PT/EN. A UI segue o idioma da interface do Trilium (opção `locale`,
// a mesma que o Excalidraw usa). Funções puras (sem DOM/api) para teste.

const SN_I18N = {
    pt: {
        'widget.title':       'Compartilhar nota',
        'tab.gerar':          'Gerar convite',
        'tab.aceitar':        'Aceitar convite',
        'tab.enviar':         'Responder',
        'gerar.info':         'Serializa a nota atual em uma string segura.<br>O token incluído é efêmero e vinculado apenas a esta nota — <strong>não é seu token ETAPI</strong>.',
        'gerar.btn':          'Gerar string de convite',
        'gerar.copiar':       'Copiar',
        'gerar.placeholder':  'A string aparecerá aqui. Copie e envie por email ou mensagem.',
        'gerar.copiado':      'Copiado para a área de transferência!',
        'gerar.copiar_falhou':'Não foi possível copiar. Selecione o texto e use Ctrl+C.',
        'gerar.gerando':      'Gerando…',
        'gerar.erro':         'Erro: {msg}',
        'gerar.config_missing': 'Nota #sharedNotesConfig não encontrada.',
        'gerar.nota_missing': 'Nota não encontrada.',
        'aceitar.nota_missing': 'Nota não encontrada',
        'gerar.endpoint_missing': 'Configure #myEndpoint na nota #sharedNotesConfig.',
        'gerar.endpoint_invalido': '#myEndpoint inválido: {msg}',
        'gerar.pronto':       'Convite gerado!',
        'gerar.string_grande': 'String grande ({kb} KB) — prefira enviar por email.',
        'gerar.tamanho':      ' ({kb} KB)',
        'aceitar.info':       'Cole a string recebida. A nota será criada em <strong>📥 Shared Inbox</strong> com o conteúdo original.',
        'aceitar.placeholder':'Cole aqui a string de convite...',
        'aceitar.btn':        'Aceitar e criar nota',
        'aceitar.vazio':      'Cole a string primeiro.',
        'aceitar.decodificando': 'Decodificando…',
        'aceitar.invalida':   'String inválida ou corrompida.',
        'aceitar.incompleta': 'Payload incompleto. Campos ausentes: {campos}',
        'aceitar.versao_nova':'String gerada por uma versão mais nova do plugin. Atualize o widget.',
        'aceitar.criada':     'Nota criada em 📥 Shared Inbox (v{versao})! Crie notas filhas e use "↩️ Responder". O canal de retorno já está ativo: o remetente poderá responder de volta.',
        'aceitar.atualizada': 'Nota atualizada para versão {versao}!',
        'aceitar.erro':       'Erro: {msg}',
        'enviar.info':        'Crie notas filhas desta nota como suas respostas.<br>O envio é <strong>cumulativo</strong> — apenas notas não enviadas serão transmitidas.',
        'enviar.btn':         'Enviar respostas',
        'enviar.coletando':   'Coletando respostas…',
        'enviar.metadados':   'Metadados de envio ausentes. Esta nota é um convite válido?',
        'enviar.vazio':       'Nenhuma nota filha nova para enviar. Crie respostas como notas filhas desta nota.',
        'enviar.enviando':    'Enviando {n} resposta(s) via backend…',
        'enviar.erro_conexao':'Erro de conexão: {msg}',
        'enviar.expirado':    'Convite expirado (mais de 7 dias).',
        'enviar.erro_http':   'Erro HTTP {status}',
        'enviar.marcar_falhou':'Respostas enviadas, mas falha ao marcar localmente: {msg}',
        'enviar.sucesso':     '{n} resposta(s) enviada(s) com sucesso!',
        'enviar.inesperado':  'Erro inesperado: {msg}',
        'enviar.me_invalido': '#myEndpoint inválido: o peer não poderá responder de volta.',
        'enviar.sem_endpoint':'Sem #myEndpoint configurado: o peer não poderá responder de volta.',
        'enviar.todas_enviadas': 'Todas as notas filhas já foram enviadas.',
        'enviar.pendentes':   '{n} nota(s) filha(s) não enviada(s).',
        'notif.respostas':   '{n} resposta(s) recebida(s)',
        'backend.off':       'Backend scripting está desabilitado nesta instância. Ative em Options → Security (ou [Security] backendScriptingEnabled=true) para o plugin funcionar.',
        'anonimo':           'Anônimo',
        'sem_nome':          'Sem nome',
        'nota.convite':      '🔒 Convite pendente — {data}',
        'nota.retorno':      '🔒 Canal de retorno — {data}',
        'nota.inbox':        '📥 Shared Inbox',
        'nota.inbox_desc':   '<p>Notas compartilhadas recebidas via convite.</p>',
        'nota.recebida':     '📨 {from} — {titulo}',
        'endpoint.vazio':    'Endpoint vazio.',
        'endpoint.invalida': 'URL de endpoint inválida: {url}',
        'endpoint.protocolo':'Endpoint deve usar https:// (ou http:// apenas em rede local).',
        'endpoint.linklocal':'http:// em 169.254.x.x (link-local) não é permitido.',
        'endpoint.http_publico': 'http:// só é permitido para localhost, rede privada ou Tailscale. Use https:// para hosts públicos.',
        'endpoint.http_aviso': 'Endpoint em http:// (rede local/Tailscale, sem TLS).',
    },
    en: {
        'widget.title':       'Share note',
        'tab.gerar':          'Generate invite',
        'tab.aceitar':        'Accept invite',
        'tab.enviar':         'Reply',
        'gerar.info':         'Serializes the current note into a safe string.<br>The token included is ephemeral and bound to this note only — <strong>it is not your ETAPI token</strong>.',
        'gerar.btn':          'Generate invite string',
        'gerar.copiar':       'Copy',
        'gerar.placeholder':  'The string will appear here. Copy and send it by email or message.',
        'gerar.copiado':      'Copied to the clipboard!',
        'gerar.copiar_falhou':'Could not copy automatically. Select the text and press Ctrl+C.',
        'gerar.gerando':      'Generating…',
        'gerar.erro':         'Error: {msg}',
        'gerar.config_missing': 'Note #sharedNotesConfig not found.',
        'gerar.nota_missing': 'Note not found.',
        'aceitar.nota_missing': 'Note not found',
        'gerar.endpoint_missing': 'Set #myEndpoint on the #sharedNotesConfig note.',
        'gerar.endpoint_invalido': '#myEndpoint is invalid: {msg}',
        'gerar.pronto':       'Invite generated!',
        'gerar.string_grande': 'Large string ({kb} KB) — prefer sending by email.',
        'gerar.tamanho':      ' ({kb} KB)',
        'aceitar.info':       'Paste the received string. The note will be created in <strong>📥 Shared Inbox</strong> with the original content.',
        'aceitar.placeholder':'Paste the invite string here...',
        'aceitar.btn':        'Accept and create note',
        'aceitar.vazio':      'Paste a string first.',
        'aceitar.decodificando': 'Decoding…',
        'aceitar.invalida':   'Invalid or corrupted string.',
        'aceitar.incompleta': 'Incomplete payload. Missing fields: {campos}',
        'aceitar.versao_nova':'String generated by a newer version of the plugin. Update the widget.',
        'aceitar.criada':     'Note created in 📥 Shared Inbox (v{versao})! Create child notes and use "↩️ Reply". The return channel is already active: the sender will be able to reply back.',
        'aceitar.atualizada': 'Note updated to version {versao}!',
        'aceitar.erro':       'Error: {msg}',
        'enviar.info':        'Create child notes of this note as your replies.<br>Sending is <strong>cumulative</strong> — only unsent notes will be transmitted.',
        'enviar.btn':         'Send replies',
        'enviar.coletando':   'Collecting replies…',
        'enviar.metadados':   'Sending metadata missing. Is this note a valid invite?',
        'enviar.vazio':       'No new child notes to send. Create replies as child notes of this note.',
        'enviar.enviando':    'Sending {n} reply(ies) via backend…',
        'enviar.erro_conexao':'Connection error: {msg}',
        'enviar.expirado':    'Invite expired (more than 7 days).',
        'enviar.erro_http':   'HTTP error {status}',
        'enviar.marcar_falhou':'Replies sent, but failed to mark them locally: {msg}',
        'enviar.sucesso':     '{n} reply(ies) sent successfully!',
        'enviar.inesperado':  'Unexpected error: {msg}',
        'enviar.me_invalido': '#myEndpoint is invalid: the peer will not be able to reply back.',
        'enviar.sem_endpoint':'No #myEndpoint configured: the peer will not be able to reply back.',
        'enviar.todas_enviadas': 'All child notes have already been sent.',
        'enviar.pendentes':   '{n} unsent child note(s).',
        'notif.respostas':   '{n} reply(ies) received',
        'backend.off':       'Backend scripting is disabled on this instance. Enable it in Options → Security (or [Security] backendScriptingEnabled=true) for the plugin to work.',
        'anonimo':           'Anonymous',
        'sem_nome':          'Unnamed',
        'nota.convite':      '🔒 Pending invite — {data}',
        'nota.retorno':      '🔒 Return channel — {data}',
        'nota.inbox':        '📥 Shared Inbox',
        'nota.inbox_desc':   '<p>Shared notes received via invite.</p>',
        'nota.recebida':     '📨 {from} — {titulo}',
        'endpoint.vazio':    'Empty endpoint.',
        'endpoint.invalida': 'Invalid endpoint URL: {url}',
        'endpoint.protocolo':'Endpoint must use https:// (or http:// only on a local network).',
        'endpoint.linklocal':'http:// on 169.254.x.x (link-local) is not allowed.',
        'endpoint.http_publico': 'http:// is only allowed for localhost, private networks or Tailscale. Use https:// for public hosts.',
        'endpoint.http_aviso': 'Endpoint over http:// (local network/Tailscale, no TLS).',
    }
};

function snNormalizeLang(locale) {
    return String(locale || '').toLowerCase().startsWith('pt') ? 'pt' : 'en';
}

/** Traduz uma chave. Fallback: idioma → EN → PT → a própria chave. Interpola {vars}. */
function snTranslate(lang, key, vars) {
    const dict = SN_I18N[lang] || SN_I18N.en;
    let str = dict[key];
    if (str === undefined) str = SN_I18N.pt[key];
    if (str === undefined) return key;
    if (vars) {
        for (const k of Object.keys(vars)) str = str.split('{' + k + '}').join(String(vars[k]));
    }
    return str;
}

// Cache do locale detectado via backend (uma chamada por carregamento da página)
let SN_LANG_CACHE = null;

// ── I18N (fim) ────────────────────────────────────────────────────────────

function snHtml(lang) {
    const t = (k, v) => snTranslate(lang, k, v);
    return `${STYLE}
<div class="sn-wrap">
  <div class="sn-tabs">
    <button class="sn-tab active" data-tab="gerar">${ICONS.share} ${t('tab.gerar')}</button>
    <button class="sn-tab"        data-tab="aceitar">${ICONS.inbox} ${t('tab.aceitar')}</button>
    <button class="sn-tab hidden" data-tab="enviar" id="sn-tab-enviar">${ICONS.reply} ${t('tab.enviar')}</button>
  </div>

  <!-- PAINEL 1: Gerar convite -->
  <div class="sn-panel active" data-panel="gerar">
    <div id="sn-reply-notif" style="display:none;margin-bottom:6px;padding:6px 10px;background:rgba(46,204,113,0.15);color:#4ade80;border-radius:4px;font-size:13px;"></div>
    <p class="sn-info">${t('gerar.info')}</p>
    <div class="sn-row">
      <button class="sn-btn primary" id="sn-gerar-btn">${t('gerar.btn')}</button>
      <button class="sn-btn" id="sn-copiar-btn" style="display:none">${ICONS.copy} ${t('gerar.copiar')}</button>
    </div>
    <textarea class="sn-textarea" id="sn-convite-out" rows="3"
      placeholder="${t('gerar.placeholder')}" readonly></textarea>
    <p class="sn-status" id="sn-gerar-status"></p>
  </div>

  <!-- PAINEL 2: Aceitar convite -->
  <div class="sn-panel" data-panel="aceitar">
    <p class="sn-info">${t('aceitar.info')}</p>
    <textarea class="sn-textarea" id="sn-convite-in" rows="3"
      placeholder="${t('aceitar.placeholder')}"></textarea>
    <div class="sn-row">
      <button class="sn-btn primary" id="sn-aceitar-btn">${t('aceitar.btn')}</button>
    </div>
    <p class="sn-status" id="sn-aceitar-status"></p>
  </div>

  <!-- PAINEL 3: Responder (notas com replyEndpoint) -->
  <div class="sn-panel" data-panel="enviar">
    <div id="sn-enviar-form">
      <p class="sn-info" style="color:var(--muted-text-color)">${t('enviar.info')}</p>
      <div class="sn-row">
        <span class="sn-status" id="sn-replies-count" style="margin:0"></span>
        <button class="sn-btn primary" id="sn-enviar-btn">${t('enviar.btn')}</button>
      </div>
    </div>
    <p class="sn-status" id="sn-enviar-status"></p>
  </div>
</div>`;
}

// ── Widget ────────────────────────────────────────────────────────────────────

class SharedNotesWidget extends api.RightPanelWidget {

    get position()     { return 200; }
    static get parentWidget() { return 'right-pane'; }
    get widgetTitle()  {
        return snTranslate(this._lang || snNormalizeLang(typeof navigator !== 'undefined' ? navigator.language : ''), 'widget.title');
    }
    isEnabled()        { return true; }

    _t(key, vars) { return snTranslate(this._lang || 'en', key, vars); }

    doRenderBody() {
        if (!this._lang) {
            this._lang = snNormalizeLang(typeof navigator !== 'undefined' ? navigator.language : '');
        }
        this.$body.html(snHtml(this._lang));
        this._bindTabs();
        this._bindGerar();
        this._bindAceitar();
        this._bindEnviar();
        this._refineLang();
    }

    /* Idiomas: segue a opção `locale` do Trilium (a mesma que o Excalidraw usa),
       com palpite síncrono por navigator.language e re-render se divergir. */
    async _refineLang() {
        try {
            if (SN_LANG_CACHE === null) {
                SN_LANG_CACHE = await api.runOnBackend(() => {
                    const opt = api.getOption('locale');
                    return opt ? opt.value : null;
                });
            }
            const lang = snNormalizeLang(SN_LANG_CACHE || (typeof navigator !== 'undefined' ? navigator.language : ''));
            if (lang === this._lang) return;
            this._lang = lang;
            if (this.$widgetTitle && this.$widgetTitle.text) this.$widgetTitle.text(this._t('widget.title'));
            this.doRenderBody();
        } catch(e) {
            console.warn('[SharedNotes] locale detection failed:', e);
        }
    }

    async refreshWithNote(note) {
        if (!note) return;
        this._sharedNote = note;

        const hasReplyEp = note.hasLabel('replyEndpoint');

        // Aba "Responder" aparece quando há endpoint de reply (B ou A podem responder)
        this.$widget.find('#sn-tab-enviar').toggleClass('hidden', !hasReplyEp);

        // Uma única chamada: pendentes de envio (ignora gates e respostas recebidas)
        // + respostas recebidas (notificação)
        const counters = await api.runOnBackend((nid) => {
            const n = api.getNote(nid);
            if (!n) return { pending: 0, received: 0 };
            const filhas = n.getChildNotes();
            const responde = (c) => c.getLabelValue('snSent') === 'true'
                || c.getLabelValue('inviteGate') !== null
                || c.getLabelValue('sharedReply') !== null;
            return {
                pending:  filhas.filter(c => !responde(c)).length,
                received: filhas.filter(c => c.getLabelValue('sharedReply') !== null).length
            };
        }, [note.noteId]);

        if (hasReplyEp) {
            this.$widget.find('#sn-replies-count').text(
                counters.pending === 0
                    ? this._t('enviar.todas_enviadas')
                    : this._t('enviar.pendentes', { n: counters.pending })
            );
        }

        const $notif = this.$widget.find('#sn-reply-notif');
        if (counters.received > 0) {
            $notif.text(this._t('notif.respostas', { n: counters.received })).show();
        } else {
            $notif.hide();
        }

        // Limpa status ao trocar de nota
        ['gerar','aceitar','enviar'].forEach(p => this._status(p, ''));
    }

    // Backend scripting é requisito do plugin (Options → Security / config.ini)
    _backendOk(panel) {
        try {
            if (typeof api.isBackendScriptingEnabled === 'function' && !api.isBackendScriptingEnabled()) {
                this._status(panel, 'err', this._t('backend.off'));
                return false;
            }
        } catch(e) { /* versões antigas não expõem a checagem */ }
        return true;
    }

    // ── Tabs ──────────────────────────────────────────────────────────────────

    _bindTabs() {        this.$widget.find('.sn-tab').on('click', (e) => {
            const tab = $(e.currentTarget).data('tab');
            this.$widget.find('.sn-tab').removeClass('active');
            this.$widget.find('.sn-panel').removeClass('active');
            $(e.currentTarget).addClass('active');
            this.$widget.find(`[data-panel="${tab}"]`).addClass('active');
        });
    }

    // ── Gerar convite ─────────────────────────────────────────────────────────

    _bindGerar() {
        this.$widget.find('#sn-gerar-btn').on('click',  () => this._gerar());
        this.$widget.find('#sn-copiar-btn').on('click', () => {
            snCopiar(this.$widget.find('#sn-convite-out').val())
                .then(() => this._status('gerar', 'ok', this._t('gerar.copiado')))
                .catch(() => this._status('gerar', 'warn', this._t('gerar.copiar_falhou')));
        });
    }

    async _gerar() {
        if (!this._sharedNote) return;
        if (!this._backendOk('gerar')) return;
        const $btn = this.$widget.find('#sn-gerar-btn').prop('disabled', true);
        this._status('gerar', '', this._t('gerar.gerando'));

        try {
            // Token efêmero — gerado no frontend, nunca é o ETAPI token
            const inviteToken = snUuid();
            const noteId      = this._sharedNote.noteId;

            // 1) Config: valida o endpoint ANTES de criar qualquer nota
            const cfg = await api.runOnBackend(() => {
                const lista = api.searchForNotes('#sharedNotesConfig');
                // prefere a nota com #myName/#myEndpoint (evita colisão com outros plugins)
                const c = lista.find(n => n.getLabelValue('myName') || n.getLabelValue('myEndpoint')) || lista[0];
                if (!c) return { error: 'gerar.config_missing' };
                return {
                    myName:     c.getLabelValue('myName')     || 'sem_nome',
                    myEndpoint: c.getLabelValue('myEndpoint') || ''
                };
            }, []);
            if (cfg.error) { this._status('gerar', 'err', this._t(cfg.error)); return; }
            if (!cfg.myEndpoint) { this._status('gerar', 'err', this._t('gerar.endpoint_missing')); return; }

            const epCheck = snValidarEndpoint(cfg.myEndpoint, this._lang);
            if (!epCheck.ok) { this._status('gerar', 'err', this._t('gerar.endpoint_invalido', { msg: epCheck.erro })); return; }

            // 2) Cria a gate note (rastreia uso e revogação) + lê o conteúdo
            const localeBcp = this._lang === 'pt' ? 'pt-BR' : 'en-US';
            const result = await api.runOnBackend((nid, token, sGate, locale) => {
                const note = api.getNote(nid);
                if (!note) return { error: 'gerar.nota_missing' };

                const noteTitle   = note.title;
                const noteContent = note.getContent();

                // Versionamento de snapshot
                const prevVer = parseInt(note.getLabelValue('snVersion') || '0', 10);
                const snapVer = prevVer + 1;
                note.setLabel('snVersion', String(snapVer));

                // Canal de retorno: o peer usa este token para responder de volta
                note.setLabel('myReplyToken', token);

                // Expiração: 7 dias
                const expiresAt = (Date.now() + 7 * 24 * 60 * 60 * 1000).toString();

                // Gate note filha — rastreia uso do convite
                const { note: gate } = api.createNewNote({
                    parentNoteId: nid,
                    title:        sGate.replace('{data}', new Date().toLocaleString(locale)),
                    content:      '',
                    type:         'text'
                });
                gate.setLabel('inviteGate',           '');
                gate.setLabel('inviteToken',           token);
                gate.setLabel('inviteParentNoteId',    nid);
                gate.setLabel('inviteExpires',         expiresAt);

                return { ok: true, noteTitle, noteContent, snapshotVersion: snapVer };
            }, [noteId, inviteToken, this._t('nota.convite'), localeBcp]);

            if (result.error) {
                this._status('gerar', 'err', this._t(result.error));
                return;
            }

            // Monta payload — SEM token ETAPI
            const payload = {
                v:               2,
                from:            cfg.myName === 'sem_nome' ? this._t('sem_nome') : cfg.myName,
                noteId:          noteId,
                noteTitle:       result.noteTitle,
                noteContent:     result.noteContent,
                endpoint:        epCheck.url + '/custom/shared-notes-reply',
                inviteToken:     inviteToken,
                snapshotVersion: result.snapshotVersion
            };

            // Codificação segura para UTF-8 / emojis / acentos
            const encoder = new TextEncoder();
            const utf8 = encoder.encode(JSON.stringify(payload));
            let binary = '';
            for (let i = 0; i < utf8.length; i++) binary += String.fromCharCode(utf8[i]);
            const str = btoa(binary);

            this.$widget.find('#sn-convite-out').val(str);
            this.$widget.find('#sn-copiar-btn').show();

            const kb = (str.length / 1024).toFixed(1);
            const avisoTam = str.length > 5000
                ? this._t('gerar.string_grande', { kb })
                : this._t('gerar.tamanho', { kb });
            const aviso = [epCheck.aviso, avisoTam].filter(Boolean).join(' ');
            this._status('gerar', epCheck.aviso ? 'warn' : 'ok', this._t('gerar.pronto') + aviso);

        } catch(e) {
            this._status('gerar', 'err', this._t('gerar.erro', { msg: e.message }));
        } finally {
            $btn.prop('disabled', false);
        }
    }

    // ── Aceitar convite ───────────────────────────────────────────────────────

    _bindAceitar() {
        this.$widget.find('#sn-aceitar-btn').on('click', () => this._aceitar());
    }

    async _aceitar() {
        const str = this.$widget.find('#sn-convite-in').val().trim();
        if (!str) { this._status('aceitar', 'warn', this._t('aceitar.vazio')); return; }
        if (!this._backendOk('aceitar')) return;

        const $btn = this.$widget.find('#sn-aceitar-btn').prop('disabled', true);
        this._status('aceitar', '', this._t('aceitar.decodificando'));

        try {
            // Decodificação segura para UTF-8
            let payload;
            try {
                const raw = atob(str);
                const bytes = new Uint8Array(raw.length);
                for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
                payload = JSON.parse(new TextDecoder().decode(bytes));
            } catch(e) {
                this._status('aceitar', 'err', this._t('aceitar.invalida'));
                return;
            }

            // Validação mínima do payload
            const required = ['v','from','noteId','noteTitle','noteContent','endpoint','inviteToken'];
            const missing  = required.filter(k => !payload[k]);
            if (missing.length) {
                this._status('aceitar', 'err', this._t('aceitar.incompleta', { campos: missing.join(', ') }));
                return;
            }
            if (payload.v > 2) {
                this._status('aceitar', 'err', this._t('aceitar.versao_nova'));
                return;
            }
            const epCheck = snValidarEndpoint(payload.endpoint, this._lang);
            if (!epCheck.ok) {
                this._status('aceitar', 'err', epCheck.erro);
                return;
            }

            // Canal de retorno próprio (permite o remetente responder de volta)
            const replyToken = snUuid();

            // Já temos esta nota (mesmo sharedNoteId)? Busca global, não só na Inbox
            const existing = await api.runOnBackend((p) => {
                for (const c of api.searchForNotes('#sharedNoteId')) {
                    if (c.getLabelValue('sharedNoteId') === p.noteId) {
                        return {
                            noteId: c.noteId,
                            version: parseInt(c.getLabelValue('snVersion') || '1', 10)
                        };
                    }
                }
                return null;
            }, [payload]);

            if (existing) {
                // Atualiza nota existente (mesmo sharedNoteId)
                const newVer = payload.snapshotVersion || existing.version + 1;
                const localeBcp = this._lang === 'pt' ? 'pt-BR' : 'en-US';
                const upResult = await api.runOnBackend((nid, p, endpoint, ver, meuToken, sRecebida, sRetorno, locale) => {
                    const note = api.getNote(nid);
                    if (!note) return { error: 'aceitar.nota_missing' };
                    note.setContent(p.noteContent);
                    note.title = sRecebida.replace('{from}', p.from).replace('{titulo}', p.noteTitle);
                    if (ver > 1) note.title += ' [v' + ver + ']';
                    note.setLabel('snVersion', String(ver));
                    note.setLabel('inviteToken', p.inviteToken);
                    note.setLabel('replyEndpoint', endpoint);

                    // Garante canal de retorno (conversas aceitas antes desta versão)
                    if (!note.getLabelValue('myReplyToken')) {
                        note.setLabel('myReplyToken', meuToken);
                        const { note: gate } = api.createNewNote({
                            parentNoteId: nid,
                            title:        sRetorno.replace('{data}', new Date().toLocaleString(locale)),
                            content:      '',
                            type:         'text'
                        });
                        gate.setLabel('inviteGate',        '');
                        gate.setLabel('inviteToken',        meuToken);
                        gate.setLabel('inviteParentNoteId', nid);
                    }

                    return { ok: true, noteId: nid };
                }, [existing.noteId, payload, epCheck.url, newVer, replyToken,
                    this._t('nota.recebida'), this._t('nota.retorno'), localeBcp]);

                if (upResult.error) {
                    this._status('aceitar', 'err', this._t(upResult.error));
                    return;
                }

                this.$widget.find('#sn-convite-in').val('');
                this._status('aceitar', 'ok', this._t('aceitar.atualizada', { versao: newVer }));
                return;
            }

            // Primeiro recebimento — cria nota nova + canal de retorno
            const localeBcp = this._lang === 'pt' ? 'pt-BR' : 'en-US';
            const result = await api.runOnBackend((p, endpoint, token, sInbox, sInboxDesc, sRecebida, sRetorno, locale) => {
                let inbox = api.searchForNote('#sharedInbox');
                if (!inbox) {
                    const { note: created } = api.createNewNote({
                        parentNoteId: 'root',
                        title:        sInbox,
                        content:      sInboxDesc,
                        type:         'text'
                    });
                    created.setLabel('sharedInbox', '');
                    inbox = created;
                }

                const { note: shared } = api.createNewNote({
                    parentNoteId: inbox.noteId,
                    title:        sRecebida.replace('{from}', p.from).replace('{titulo}', p.noteTitle),
                    content:      p.noteContent,
                    type:         'text'
                });

                shared.setLabel('sharedFrom',     p.from);
                shared.setLabel('sharedNoteId',   p.noteId);
                shared.setLabel('replyEndpoint',  endpoint);
                shared.setLabel('inviteToken',    p.inviteToken);
                shared.setLabel('snVersion',      String(p.snapshotVersion || 1));
                shared.setLabel('myReplyToken',   token);

                // Canal de retorno: permite o remetente responder de volta
                const { note: gate } = api.createNewNote({
                    parentNoteId: shared.noteId,
                    title:        sRetorno.replace('{data}', new Date().toLocaleString(locale)),
                    content:      '',
                    type:         'text'
                });
                gate.setLabel('inviteGate',        '');
                gate.setLabel('inviteToken',        token);
                gate.setLabel('inviteParentNoteId', shared.noteId);

                return { ok: true, noteId: shared.noteId, version: p.snapshotVersion || 1 };
            }, [payload, epCheck.url, replyToken,
                this._t('nota.inbox'), this._t('nota.inbox_desc'),
                this._t('nota.recebida'), this._t('nota.retorno'), localeBcp]);

            if (result.error) {
                this._status('aceitar', 'err', this._t(result.error));
                return;
            }

            this.$widget.find('#sn-convite-in').val('');
            this._status('aceitar', 'ok', this._t('aceitar.criada', { versao: result.version }));

        } catch(e) {
            this._status('aceitar', 'err', this._t('aceitar.erro', { msg: e.message }));
        } finally {
            $btn.prop('disabled', false);
        }
    }

    // ── Enviar respostas ──────────────────────────────────────────────────────

    _bindEnviar() {
        this.$widget.find('#sn-enviar-btn').on('click', () => this._enviar());
    }

    async _enviar() {
        if (!this._sharedNote) return;
        if (!this._backendOk('enviar')) return;
        const $btn = this.$widget.find('#sn-enviar-btn').prop('disabled', true);
        this._status('enviar', '', this._t('enviar.coletando'));

        try {
            const noteId   = this._sharedNote.noteId;
            const endpoint = this._sharedNote.getLabelValue('replyEndpoint');
            // inviteToken = token do peer recebido no convite (nota recebida)
            // replyToken  = token do peer gravado pelo handler (nota original)
            const peerToken = this._sharedNote.getLabelValue('inviteToken')
                           || this._sharedNote.getLabelValue('replyToken');
            const myToken   = this._sharedNote.getLabelValue('myReplyToken') || '';

            if (!endpoint || !peerToken) {
                this._status('enviar', 'err', this._t('enviar.metadados'));
                $btn.prop('disabled', false);
                return;
            }

            const epCheck = snValidarEndpoint(endpoint, this._lang);
            if (!epCheck.ok) {
                this._status('enviar', 'err', epCheck.erro);
                $btn.prop('disabled', false);
                return;
            }

            // Nome + endpoint de quem responde
            const config = await api.runOnBackend(() => {
                const lista = api.searchForNotes('#sharedNotesConfig');
                const cfg = lista.find(n => n.getLabelValue('myName') || n.getLabelValue('myEndpoint')) || lista[0];
                return {
                    name:     cfg?.getLabelValue('myName')     || 'anonimo',
                    endpoint: cfg?.getLabelValue('myEndpoint') || ''
                };
            }, []);

            // Coleta apenas notas filhas NÃO enviadas (ignora gates e respostas recebidas)
            const children = await api.runOnBackend((nid) => {
                const note = api.getNote(nid);
                if (!note) return [];
                return note.getChildNotes()
                    .filter(c => c.getLabelValue('snSent') !== 'true'
                              && c.getLabelValue('inviteGate') === null
                              && c.getLabelValue('sharedReply') === null)
                    .map(c => ({
                        noteId:  c.noteId,
                        title:   c.title,
                        content: c.getContent()
                    }));
            }, [noteId]);

            if (!children.length) {
                this._status('enviar', 'warn', this._t('enviar.vazio'));
                $btn.prop('disabled', false);
                return;
            }

            this._status('enviar', '', this._t('enviar.enviando', { n: children.length }));

            // Endpoint de retorno (para o peer responder de volta)
            let myEndpoint = '';
            let aviso = '';
            if (config.endpoint) {
                const myCheck = snValidarEndpoint(config.endpoint, this._lang);
                if (myCheck.ok) {
                    myEndpoint = myCheck.url + '/custom/shared-notes-reply';
                    aviso = myCheck.aviso;
                } else {
                    aviso = this._t('enviar.me_invalido');
                }
            } else {
                aviso = this._t('enviar.sem_endpoint');
            }

            // Envio servidor→servidor via fetch — o sandbox de scripts do Trilium
            // (0.105+) bloqueia require('https'), mas expõe fetch/AbortController.
            const result = await api.runAsyncOnBackendWithManualTransactionHandling(
                async (ep, tok, repls, from, replyEp, replyTok) => {
                    const body = JSON.stringify({
                        inviteToken: tok,
                        from,
                        replies: repls,
                        replyEndpoint: replyEp,
                        replyToken: replyTok
                    });

                    const REQ_TIMEOUT = 30000;
                    const controller = new AbortController();
                    const timer = setTimeout(() => controller.abort(), REQ_TIMEOUT);
                    try {
                        const resp = await fetch(ep, {
                            method:  'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body,
                            signal:  controller.signal
                        });
                        let data;
                        try { data = await resp.json(); } catch(e) { data = {}; }
                        return { status: resp.status, data };
                    } catch(e) {
                        const msg = (e && e.name === 'AbortError')
                            ? 'Timeout: servidor não respondeu em 30s.'
                            : (e.message || String(e));
                        return { status: 0, error: msg };
                    } finally {
                        clearTimeout(timer);
                    }
                },
                [epCheck.url, peerToken, children,
                 config.name === 'anonimo' ? this._t('anonimo') : config.name,
                 myEndpoint, myToken]
            );

            if (result.error) {
                this._status('enviar', 'err', this._t('enviar.erro_conexao', { msg: result.error }));
                $btn.prop('disabled', false);
                return;
            }

            if (result.status === 410) {
                this._status('enviar', 'err', this._t('enviar.expirado'));
                return;
            }
            if (result.status !== 200) {
                const msg = result.data?.error || this._t('enviar.erro_http', { status: result.status });
                this._status('enviar', 'err', msg);
                $btn.prop('disabled', false);
                return;
            }

            // Marca como enviadas apenas as notas efetivamente transmitidas
            try {
                await api.runOnBackend((nid, ids) => {
                    const note = api.getNote(nid);
                    if (!note) return;
                    const alvo = new Set(ids);
                    note.getChildNotes().forEach(c => {
                        if (alvo.has(c.noteId)) c.setLabel('snSent', 'true');
                    });
                }, [noteId, children.map(c => c.noteId)]);
            } catch(e) {
                this._status('enviar', 'warn', this._t('enviar.marcar_falhou', { msg: e.message }));
            }

            const received = result.data?.received ?? children.length;
            const avisoTxt = [epCheck.aviso, aviso].filter(Boolean).join(' ');
            this._status('enviar', avisoTxt ? 'warn' : 'ok',
                this._t('enviar.sucesso', { n: received }) + (avisoTxt ? ' ' + avisoTxt : ''));

            // Atualiza contagem de não-enviadas
            const remaining = await api.runOnBackend((nid) => {
                const n = api.getNote(nid);
                if (!n) return 0;
                return n.getChildNotes().filter(c => c.getLabelValue('snSent') !== 'true'
                                                  && c.getLabelValue('inviteGate') === null
                                                  && c.getLabelValue('sharedReply') === null).length;
            }, [noteId]);

            this.$widget.find('#sn-replies-count').text(
                remaining === 0
                    ? this._t('enviar.todas_enviadas')
                    : this._t('enviar.pendentes', { n: remaining })
            );

        } catch(e) {
            this._status('enviar', 'err', this._t('enviar.inesperado', { msg: e.message }));
        } finally {
            $btn.prop('disabled', false);
        }
    }

    // ── Helper de status ──────────────────────────────────────────────────────

    _status(panel, type, msg) {
        const $el = this.$widget.find(`#sn-${panel}-status`);
        const icon = type === 'ok' ? ICONS.ok : type === 'err' ? ICONS.err : type === 'warn' ? ICONS.warn : '';
        $el.html((icon ? icon + ' ' : '') + snEscape(msg ?? ''))
           .removeClass('ok err warn').addClass(type || '');
    }
}

module.exports = SharedNotesWidget;
module.exports.snTranslate = snTranslate;
module.exports.SN_I18N = SN_I18N;