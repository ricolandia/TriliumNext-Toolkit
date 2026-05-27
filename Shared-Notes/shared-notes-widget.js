// shared-notes-widget.js
// ══════════════════════════════════════════════════════════════════════════════
// NOTA TRILIUM:
//   Tipo : Code
//   MIME : application/javascript;env=frontend
//   Label: #widget
//
// DEPENDÊNCIA — nota com label #sharedNotesConfig contendo:
//   #myName     = Seu Nome
//   #myEndpoint = https://seutrilium.com   (User A; B pode omitir)
//
// SEGURANÇA:
//   - Token efêmero (UUID) por convite — NÃO é o token ETAPI
//   - ETAPI nunca aparece na string de convite
//   - Envio de respostas via api.runOnBackend + require('https') (sem CORS)
//   - Single-use validado no backend de A
//   - Expiração de 7 dias verificada no handler
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
.sn-btn.primary { background: #7c3aed; color: #fff; border-color: #7c3aed; }
.sn-btn.primary:hover { background: #6d28d9; }
.sn-btn:disabled { opacity: .45; cursor: not-allowed; }
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

const HTML = `${STYLE}
<div class="sn-wrap">
  <div class="sn-tabs">
    <button class="sn-tab active" data-tab="gerar">${ICONS.share} Gerar convite</button>
    <button class="sn-tab"        data-tab="aceitar">${ICONS.inbox} Aceitar convite</button>
    <button class="sn-tab hidden" data-tab="enviar" id="sn-tab-enviar">${ICONS.reply} Enviar respostas</button>
  </div>

  <!-- PAINEL 1: Gerar convite -->
  <div class="sn-panel active" data-panel="gerar">
    <p class="sn-info">
      Serializa a nota atual em uma string segura.<br>
      O token incluído é efêmero e vinculado apenas a esta nota — <strong>não é seu token ETAPI</strong>.
    </p>
    <div class="sn-row">
      <button class="sn-btn primary" id="sn-gerar-btn">Gerar string de convite</button>
      <button class="sn-btn" id="sn-copiar-btn" style="display:none">${ICONS.copy} Copiar</button>
    </div>
    <textarea class="sn-textarea" id="sn-convite-out" rows="3"
      placeholder="A string aparecerá aqui. Copie e envie por email ou mensagem." readonly></textarea>
    <p class="sn-status" id="sn-gerar-status"></p>
  </div>

  <!-- PAINEL 2: Aceitar convite -->
  <div class="sn-panel" data-panel="aceitar">
    <p class="sn-info">Cole a string recebida. A nota será criada em <strong>📥 Shared Inbox</strong> com o conteúdo original.</p>
    <textarea class="sn-textarea" id="sn-convite-in" rows="3"
      placeholder="Cole aqui a string de convite..."></textarea>
    <div class="sn-row">
      <button class="sn-btn primary" id="sn-aceitar-btn">Aceitar e criar nota</button>
    </div>
    <p class="sn-status" id="sn-aceitar-status"></p>
  </div>

  <!-- PAINEL 3: Enviar respostas (só em notas sharedInbox) -->
  <div class="sn-panel" data-panel="enviar">
    <div id="sn-ja-enviado" style="display:none">
      <span class="sn-badge">Respostas já enviadas</span>
      <p class="sn-status warn" style="margin-top:6px">Convite utilizado. Reenvio permanentemente bloqueado.</p>
    </div>
    <div id="sn-enviar-form">
      <p class="sn-info warn" style="color:#facc15">
        Crie notas filhas desta nota como suas respostas.<br>
        O envio é <strong>único e irreversível</strong>.
      </p>
      <div class="sn-row">
        <span class="sn-status" id="sn-replies-count" style="margin:0"></span>
        <button class="sn-btn primary" id="sn-enviar-btn">Enviar respostas</button>
      </div>
    </div>
    <p class="sn-status" id="sn-enviar-status"></p>
  </div>
</div>`;

// ── Widget ────────────────────────────────────────────────────────────────────

class SharedNotesWidget extends api.RightPanelWidget {

    get position()     { return 200; }
    static get parentWidget() { return 'right-pane'; }
    get widgetTitle()  { return '📨 Compartilhar nota'; }
    isEnabled()        { return true; }

    doRenderBody() {
        this.$body.html(HTML);
        this._bindTabs();
        this._bindGerar();
        this._bindAceitar();
        this._bindEnviar();
    }

    async refreshWithNote(note) {
        if (!note) return;
        this._sharedNote = note;

        const isShared    = note.hasLabel('sharedFrom');
        const alreadySent = note.getLabelValue('inviteSent') === 'true';

        // Mostra aba de envio só em notas do Shared Inbox
        this.$widget.find('#sn-tab-enviar').toggleClass('hidden', !isShared);

        if (isShared) {
            this.$widget.find('#sn-ja-enviado').toggle(alreadySent);
            this.$widget.find('#sn-enviar-form').toggle(!alreadySent);

            if (!alreadySent) {
                const count = await api.runOnBackend(
                    (nid) => (api.getNote(nid)?.getChildNotes().length ?? 0),
                    [note.noteId]
                );
                this.$widget.find('#sn-replies-count').text(
                    count === 0 ? 'Nenhuma nota filha ainda.' : `${count} nota(s) filha(s) prontas para envio.`
                );
            }
        }

        // Limpa status ao trocar de nota
        ['gerar','aceitar','enviar'].forEach(p => this._status(p, ''));
    }

    // ── Tabs ──────────────────────────────────────────────────────────────────

    _bindTabs() {
        this.$widget.find('.sn-tab').on('click', (e) => {
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
            navigator.clipboard.writeText(this.$widget.find('#sn-convite-out').val());
            this._status('gerar', 'ok', 'Copiado para a área de transferência!');
        });
    }

    async _gerar() {
        if (!this._sharedNote) return;
        const $btn = this.$widget.find('#sn-gerar-btn').prop('disabled', true);
        this._status('gerar', '', 'Gerando…');

        try {
            // Token efêmero — gerado no frontend, nunca é o ETAPI token
            const inviteToken = crypto.randomUUID();
            const noteId      = this._sharedNote.noteId;

            // Cria gate note e busca config no backend
            const result = await api.runOnBackend((nid, token) => {
                // Configuração
                const cfg = api.searchForNote('#sharedNotesConfig');
                if (!cfg) return { error: 'Nota #sharedNotesConfig não encontrada.' };

                const myName     = cfg.getLabelValue('myName')     || 'Sem nome';
                const myEndpoint = cfg.getLabelValue('myEndpoint') || '';
                if (!myEndpoint) return { error: 'Configure #myEndpoint na nota #sharedNotesConfig.' };

                // Nota e conteúdo
                const note = api.getNote(nid);
                if (!note) return { error: 'Nota não encontrada.' };

                const noteTitle   = note.title;
                const noteContent = note.getContent();

                // Expiração: 7 dias
                const expiresAt = (Date.now() + 7 * 24 * 60 * 60 * 1000).toString();

                // Gate note filha — rastreia uso do convite
                const { note: gate } = api.createNewNote({
                    parentNoteId: nid,
                    title:        '🔒 Convite pendente — ' + new Date().toLocaleString('pt-BR'),
                    content:      '',
                    type:         'text'
                });
                gate.setLabel('inviteGate',           '');
                gate.setLabel('inviteToken',           token);
                gate.setLabel('inviteParentNoteId',    nid);
                gate.setLabel('inviteUsed',            'false');
                gate.setLabel('inviteExpires',         expiresAt);

                return {
                    ok:          true,
                    myName,
                    myEndpoint,
                    noteTitle,
                    noteContent
                };
            }, [noteId, inviteToken]);

            if (result.error) {
                this._status('gerar', 'err', '' + result.error);
                return;
            }

            // Monta payload — SEM token ETAPI
            const payload = {
                v:           2,
                from:        result.myName,
                noteId:      noteId,
                noteTitle:   result.noteTitle,
                noteContent: result.noteContent,
            endpoint:    result.myEndpoint.replace(/\/+$/, '') + '/custom/shared-notes-reply',
                inviteToken: inviteToken
            };

            // Codificação segura para UTF-8 / emojis / acentos
            const str = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));

            this.$widget.find('#sn-convite-out').val(str);
            this.$widget.find('#sn-copiar-btn').show();

            const kb = (str.length / 1024).toFixed(1);
            const aviso = str.length > 5000
                ? ` String grande (${kb} KB) — prefira enviar por email.`
                : ` (${kb} KB)`;
            this._status('gerar', 'ok', 'Convite gerado!' + aviso);

        } catch(e) {
            this._status('gerar', 'err', 'Erro: ' + e.message);
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
        if (!str) { this._status('aceitar', 'warn', 'Cole a string primeiro.'); return; }

        const $btn = this.$widget.find('#sn-aceitar-btn').prop('disabled', true);
        this._status('aceitar', '', 'Decodificando…');

        try {
            // Decodificação segura para UTF-8
            let payload;
            try {
                payload = JSON.parse(decodeURIComponent(escape(atob(str))));
            } catch(e) {
                this._status('aceitar', 'err', 'String inválida ou corrompida.');
                return;
            }

            // Validação mínima do payload
            const required = ['v','from','noteId','noteTitle','noteContent','endpoint','inviteToken'];
            const missing  = required.filter(k => !payload[k]);
            if (missing.length) {
                this._status('aceitar', 'err', 'Payload incompleto. Campos ausentes: ' + missing.join(', '));
                return;
            }

            // Cria nota no Shared Inbox via backend
            const result = await api.runOnBackend((p) => {
                // Busca ou cria #sharedInbox
                let inbox = api.searchForNote('#sharedInbox');
                if (!inbox) {
                    const { note: created } = api.createNewNote({
                        parentNoteId: 'root',
                        title:        '📥 Shared Inbox',
                        content:      '<p>Notas compartilhadas recebidas via convite.</p>',
                        type:         'text'
                    });
                    created.setLabel('sharedInbox', '');
                    inbox = created;
                }

                // Cria nota com conteúdo recebido
                const { note: shared } = api.createNewNote({
                    parentNoteId: inbox.noteId,
                    title:        '📨 ' + p.from + ' — ' + p.noteTitle,
                    content:      p.noteContent,
                    type:         'text'
                });

                // Labels de controle (sem armazenar token ETAPI)
                shared.setLabel('sharedFrom',     p.from);
                shared.setLabel('sharedNoteId',   p.noteId);
                shared.setLabel('replyEndpoint',  p.endpoint);
                shared.setLabel('inviteToken',    p.inviteToken);
                shared.setLabel('inviteSent',     'false');

                return { ok: true, noteId: shared.noteId };
            }, [payload]);

            if (result.error) {
                this._status('aceitar', 'err', '' + result.error);
                return;
            }

            this.$widget.find('#sn-convite-in').val('');
            this._status('aceitar', 'ok',
                `Nota criada em 📥 Shared Inbox! Abra-a na árvore, adicione notas filhas como respostas e use a aba "↩️ Enviar respostas".`
            );

        } catch(e) {
            this._status('aceitar', 'err', 'Erro: ' + e.message);
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
        const $btn = this.$widget.find('#sn-enviar-btn').prop('disabled', true);
        this._status('enviar', '', 'Coletando respostas…');

        try {
            const noteId   = this._sharedNote.noteId;
            const endpoint = this._sharedNote.getLabelValue('replyEndpoint');
            const token    = this._sharedNote.getLabelValue('inviteToken');

            if (!endpoint || !token) {
                this._status('enviar', 'err', 'Metadados de envio ausentes. Esta nota é um convite válido?');
                return;
            }

            // Nome de quem responde
            const myName = await api.runOnBackend(() => {
                const cfg = api.searchForNote('#sharedNotesConfig');
                return cfg?.getLabelValue('myName') || 'Anônimo';
            }, []);

            // Coleta notas filhas
            const children = await api.runOnBackend((nid) => {
                const note = api.getNote(nid);
                if (!note) return [];
                return note.getChildNotes().map(c => ({
                    title:   c.title,
                    content: c.getContent(),
                    type:    c.type
                }));
            }, [noteId]);

            if (!children.length) {
                this._status('enviar', 'warn', 'Nenhuma nota filha para enviar. Crie suas respostas como notas filhas desta nota.');
                $btn.prop('disabled', false);
                return;
            }

            this._status('enviar', '', `Enviando ${children.length} resposta(s) via backend…`);

            // Envio servidor→servidor via require('https') — sem CORS
            const result = await api.runOnBackend((ep, tok, repls, from) => {
                const https = require('https');
                const http  = require('http');
                const url   = new URL(ep);
                const mod   = url.protocol === 'https:' ? https : http;
                const body  = JSON.stringify({ inviteToken: tok, from, replies: repls });

                const REQ_TIMEOUT = 30000; // 30s

                return new Promise((resolve) => {
                    const req = mod.request({
                        hostname: url.hostname,
                        port:     url.port || (url.protocol === 'https:' ? 443 : 80),
                        path:     url.pathname,
                        method:   'POST',
                        headers:  {
                            'Content-Type':   'application/json',
                            'Content-Length': Buffer.byteLength(body)
                        },
                        timeout: REQ_TIMEOUT
                    }, (res) => {
                        let raw = '';
                        res.on('data', d => raw += d);
                        res.on('end', () => {
                            try {
                                resolve({ status: res.statusCode, data: JSON.parse(raw) });
                            } catch(e) {
                                resolve({ status: res.statusCode, data: { raw } });
                            }
                        });
                    });
                    req.on('error', (e) => resolve({ status: 0, error: e.message }));
                    req.on('timeout', () => {
                        req.destroy();
                        resolve({ status: 0, error: 'Timeout: servidor não respondeu em 30s.' });
                    });
                    req.write(body);
                    req.end();
                });
            }, [endpoint, token, children, myName]);

            // Trata resposta do servidor de A
            if (result.error) {
                this._status('enviar', 'err', 'Erro de conexão: ' + result.error);
                $btn.prop('disabled', false);
                return;
            }

            if (result.status === 409) {
                this._status('enviar', 'err', 'Convite já utilizado. Reenvio bloqueado pelo servidor.');
                return;
            }
            if (result.status === 410) {
                this._status('enviar', 'err', 'Convite expirado (mais de 7 dias).');
                return;
            }
            if (result.status !== 200) {
                const msg = result.data?.error || `Erro HTTP ${result.status}`;
                this._status('enviar', 'err', '' + msg);
                $btn.prop('disabled', false);
                return;
            }

            // Marca localmente como enviado — bloqueia reenvio no lado de B
            try {
                await api.runOnBackend((nid) => {
                    api.getNote(nid)?.setLabel('inviteSent', 'true');
                }, [noteId]);
            } catch(e) {
                this._status('enviar', 'warn', 'Respostas enviadas, mas falha ao marcar localmente: ' + e.message);
            }

            const received = result.data?.received ?? children.length;
            this._status('enviar', 'ok', `${received} resposta(s) enviada(s) com sucesso!`);

            // Atualiza UI
            this.$widget.find('#sn-enviar-form').hide();
            this.$widget.find('#sn-ja-enviado').show();

        } catch(e) {
            this._status('enviar', 'err', 'Erro inesperado: ' + e.message);
            $btn.prop('disabled', false);
        }
    }

    // ── Helper de status ──────────────────────────────────────────────────────

    _status(panel, type, msg) {
        const $el = this.$widget.find(`#sn-${panel}-status`);
        const icon = type === 'ok' ? ICONS.ok : type === 'err' ? ICONS.err : type === 'warn' ? ICONS.warn : '';
        $el.html((icon ? icon + ' ' : '') + (msg ?? ''))
           .removeClass('ok err warn').addClass(type || '');
    }
}

module.exports = SharedNotesWidget;