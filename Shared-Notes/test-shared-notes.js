// test-shared-notes.js
// Simulador A/B do Shared Notes: roda os arquivos reais (widget + handler) com
// stubs do Trilium (api, notas, gate notes) e fetch roteado em memória.
// Uso: node test-shared-notes.js  (ou: bun test-shared-notes.js)
// Cobre: convite, aceite, A→B, B→A (canal de retorno), v2 in-place,
// revogação (404), filtros de snSent/gates, validação de endpoints
// (incl. http em Tailscale 100.64/10), guarda de backend scripting off,
// i18n e smoke de inicialização (doRenderBody).

// Simulador A/B do Shared Notes — roda os arquivos reais com stubs do Trilium.
const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');

const DIR = '/home/ricardo/Documentos/31_APPS_GITHUB/TriliumNext-Toolkit/Shared-Notes';
const widgetSrc = fs.readFileSync(path.join(DIR, 'shared-notes-widget.js'), 'utf8');
const handlerSrc = fs.readFileSync(path.join(DIR, 'shared-notes-handler.js'), 'utf8');

let fails = 0;
function ok(cond, msg) {
    if (cond) console.log('  OK  ' + msg);
    else { fails++; console.log('  FAIL ' + msg); }
}

// ── Modelo de instância ─────────────────────────────────────────────────────
class Note {
    constructor(inst, id, title, content, type) {
        this.inst = inst; this.id = id; this.title = title;
        this.content = content; this.type = type || 'text';
        this.labels = {}; this.children = [];
    }
    get noteId() { return this.id; }
    hasLabel(n) { return n in this.labels; }
    getLabelValue(n) { return n in this.labels ? this.labels[n] : null; }
    setLabel(n, v) { this.labels[n] = v == null ? '' : String(v); }
    getContent() { return this.content; }
    setContent(c) { this.content = c; }
    getChildNotes() { return this.children.map(id => this.inst.notes[id]).filter(Boolean); }
    save() {}
}

class Instance {
    constructor(name) { this.name = name; this.notes = {}; this.seq = 0; }
    createNote(parentId, title, content, type) {
        const id = this.name + '-' + (++this.seq);
        const n = new Note(this, id, title, content, type);
        this.notes[id] = n;
        if (parentId && this.notes[parentId]) this.notes[parentId].children.push(id);
        return n;
    }
    search(q) {
        const label = q.replace(/^#/, '');
        return Object.values(this.notes).filter(n => n.hasLabel(label));
    }
    api() {
        const self = this;
        return {
            isBackendScriptingEnabled: () => self.backendScripting !== false,
            runOnBackend: (fn, args) => {
                try { return Promise.resolve(fn(...(args || []))); }
                catch(e) { return Promise.reject(e); }
            },
            runAsyncOnBackendWithManualTransactionHandling: async (fn, args) => fn(...(args || [])),
            getNote: (id) => self.notes[id] || null,
            createNewNote: ({ parentNoteId, title, content, type }) => ({ note: self.createNote(parentNoteId, title, content, type) }),
            searchForNotes: (q) => self.search(q),
            searchForNote: (q) => self.search(q)[0],
        };
    }
}

// ── jQuery stub ─────────────────────────────────────────────────────────────
function makeJq() {
    const store = {};
    function el(sel) {
        if (!store[sel]) store[sel] = {
            sel, _val: '', _text: '', _html: '', _disabled: false, _shown: true,
            val(v) { if (v === undefined) return this._val; this._val = v; return this; },
            text(t) { this._text = t; return this; },
            html(h) { this._html = h; return this; },
            prop(k, v) { this['_' + k] = v; return this; },
            show() { this._shown = true; return this; },
            hide() { this._shown = false; return this; },
            toggleClass() { return this; },
            removeClass() { return this; },
            addClass() { return this; },
            on() { return this; },
        };
        return store[sel];
    }
    return { store, find: (sel) => el(sel) };
}

// ── Carga do widget (uma vez) ───────────────────────────────────────────────
global.api = { RightPanelWidget: class {} };
delete require.cache[require.resolve(path.join(DIR, 'shared-notes-widget.js'))];
const SharedNotesWidget = require(path.join(DIR, 'shared-notes-widget.js'));

function makeWidget(inst) {
    const w = new SharedNotesWidget();
    const jq = makeJq();
    w.$widget = { find: (sel) => jq.find(sel) };
    w.$body = { html: (h) => { w._bodyHtml = h; return w.$body; } };
    w._store = jq.store;
    w._inst = inst;
    w._lang = 'pt';
    return w;
}

// ── Executa o handler real de uma instância ────────────────────────────────
function runHandler(inst, payload) {
    const fakeReq = { method: 'POST', body: JSON.stringify(payload) };
    let captured = null;
    const fakeRes = {
        setHeader() {},
        status(code) { return { send(raw) { captured = { status: code, raw }; } }; },
    };
    const apiObj = Object.assign({}, inst.api(), { req: fakeReq, res: fakeRes });
    new Function('api', handlerSrc)(apiObj);
    if (!captured) throw new Error('handler não respondeu');
    return { status: captured.status, data: JSON.parse(captured.raw) };
}

// ── Patch do fetch: roteia a.test → A, b.test → B ───────────────────────────
const rotas = {};
global.fetch = async (url, opts) => {
    const u = new URL(url);
    const inst = rotas[u.hostname];
    if (!inst) throw new Error('ENOTFOUND ' + u.hostname);
    const out = runHandler(inst, JSON.parse(opts.body));
    return { status: out.status, json: async () => out.data };
};

function frontNote(inst, n) {
    return {
        noteId: n.id,
        hasLabel: (l) => n.hasLabel(l),
        getLabelValue: (l) => n.getLabelValue(l),
        _backend: n,
    };
}
const b64 = (o) => Buffer.from(JSON.stringify(o), 'utf8').toString('base64');

// ── Setup ───────────────────────────────────────────────────────────────────
const A = new Instance('A');
const B = new Instance('B');
rotas['a.test'] = A; rotas['b.test'] = B;

const cfgA = A.createNote('root', 'Config A', ''); cfgA.setLabel('sharedNotesConfig', ''); cfgA.setLabel('myName', 'Alice'); cfgA.setLabel('myEndpoint', 'https://a.test');
const cfgB = B.createNote('root', 'Config B', ''); cfgB.setLabel('sharedNotesConfig', ''); cfgB.setLabel('myName', 'Bruno'); cfgB.setLabel('myEndpoint', 'https://b.test');

const noteA = A.createNote('root', 'Documento Original', '<p>conteúdo v1</p>');
const wa = makeWidget(A);
const wb = makeWidget(B);

(async () => {
    console.log('\n[1] A gera convite');
    global.api = A.api();
    wa._sharedNote = frontNote(A, noteA);
    await wa._gerar();
    const convite1 = wa.$widget.find('#sn-convite-out')._val;
    ok(!!convite1, 'string gerada');
    ok(noteA.getLabelValue('myReplyToken'), 'myReplyToken gravado na nota de A');
    ok(noteA.getLabelValue('snVersion') === '1', 'snVersion = 1');
    ok(noteA.getChildNotes().filter(c => c.hasLabel('inviteGate')).length === 1, 'gate de convite criada');
    const p1 = JSON.parse(Buffer.from(convite1, 'base64').toString('utf8'));
    ok(p1.endpoint === 'https://a.test/custom/shared-notes-reply', 'endpoint do convite normalizado');
    ok(p1.v === 2 && !!p1.inviteToken, 'payload v2 com token');

    console.log('\n[2] B aceita o convite');
    global.api = B.api();
    wb.$widget.find('#sn-convite-in').val(convite1);
    await wb._aceitar();
    const inboxB = B.search('#sharedInbox')[0];
    ok(!!inboxB, 'Shared Inbox criada');
    const recebida = inboxB.getChildNotes()[0];
    ok(recebida.getLabelValue('sharedNoteId') === noteA.id, 'nota recebida aponta para a original');
    ok(recebida.getLabelValue('replyEndpoint') === 'https://a.test/custom/shared-notes-reply', 'replyEndpoint = A');
    ok(recebida.getLabelValue('inviteToken') === p1.inviteToken, 'inviteToken = token de A');
    const T_B = recebida.getLabelValue('myReplyToken');
    ok(!!T_B && T_B !== p1.inviteToken, 'canal de retorno de B criado');
    const gateB = recebida.getChildNotes().filter(c => c.hasLabel('inviteGate'));
    ok(gateB.length === 1 && gateB[0].getLabelValue('inviteToken') === T_B, 'gate de retorno de B = T_B');

    console.log('\n[3] B envia 2 respostas para A');
    recebida.inst.createNote(recebida.id, 'Resposta 1', '<p>r1</p>');
    recebida.inst.createNote(recebida.id, 'Resposta 2', '<p>r2</p>');
    global.api = B.api();
    wb._sharedNote = frontNote(B, recebida);
    await wb._enviar();
    const respostasEmA = noteA.getChildNotes().filter(c => c.hasLabel('sharedReply'));
    ok(respostasEmA.length === 2, 'A recebeu 2 respostas (handler de A)');
    ok(noteA.getLabelValue('replyEndpoint') === 'https://b.test/custom/shared-notes-reply', 'A guardou endpoint de B');
    ok(noteA.getLabelValue('replyToken') === T_B, 'A guardou token de retorno de B');
    ok(recebida.getChildNotes().filter(c => c.getLabelValue('snSent') === 'true').length === 2, 'B marcou as 2 como enviadas');
    ok(gateB[0].getLabelValue('snSent') === null, 'gate de retorno NÃO foi marcada como enviada');
    ok(recebida.getLabelValue('myReplyToken') === T_B, 'myReplyToken de B preservado');

    console.log('\n[4] A responde de volta para B (fluxo antes quebrado)');
    noteA.inst.createNote(noteA.id, 'Réplica de Alice', '<p>réplica</p>');
    global.api = A.api();
    wa._sharedNote = frontNote(A, noteA);
    await wa._enviar();
    ok(wa.$widget.find('#sn-enviar-status')._html.includes('enviada'), 'envio A→B sem erro: ' + wa.$widget.find('#sn-enviar-status')._text);
    const recebidasEmB = recebida.getChildNotes().filter(c => c.hasLabel('sharedReply'));
    ok(recebidasEmB.length === 1 && recebidasEmB[0].title.includes('Alice'), 'B recebeu a réplica (handler de B)');
    ok(recebida.getLabelValue('replyToken') === p1.inviteToken, 'B recebeu/atualizou replyToken com token de A');
    ok(recebida.getChildNotes().filter(c => c.getLabelValue('snSent') === 'true').length === 2, 'réplica recebida NÃO foi marcada como enviada por B');

    console.log('\n[5] Contagem/pendências não incluem gates nem respostas recebidas');
    global.api = B.api();
    await wb.refreshWithNote(frontNote(B, recebida));
    ok(wb.$widget.find('#sn-replies-count')._text.includes('Todas'), 'pendentes = 0 na nota de B');
    ok(wb.$widget.find('#sn-reply-notif')._text === '1 resposta(s) recebida(s)' && wb.$widget.find('#sn-reply-notif')._shown, 'notificação de 1 resposta recebida');

    console.log('\n[6] A envia snapshot v2 e B atualiza in-place');
    global.api = A.api();
    noteA.setContent('<p>conteúdo v2</p>');
    await wa._gerar();
    const convite2 = wa.$widget.find('#sn-convite-out')._val;
    const p2 = JSON.parse(Buffer.from(convite2, 'base64').toString('utf8'));
    ok(p2.snapshotVersion === 2, 'versão 2 do snapshot');
    const T_A2 = p2.inviteToken;
    global.api = B.api();
    wb.$widget.find('#sn-convite-in').val(convite2);
    await wb._aceitar();
    ok(recebida.getContent() === '<p>conteúdo v2</p>', 'conteúdo atualizado in-place');
    ok(recebida.title.includes('[v2]') && recebida.title.includes('Alice'), 'título com versão: ' + recebida.title);
    ok(recebida.getLabelValue('inviteToken') === T_A2, 'inviteToken de B renovado (T_A2)');
    ok(recebida.getLabelValue('myReplyToken') === T_B, 'myReplyToken de B segue o mesmo');
    ok(recebida.getChildNotes().filter(c => c.hasLabel('sharedReply')).length === 1, 'respostas anteriores preservadas');
    ok(B.search('#sharedNoteId').length === 1, 'sem duplicata: update in-place mesmo fora da Inbox');

    console.log('\n[7] B responde após v2 usando o token renovado');
    global.api = B.api();
    recebida.inst.createNote(recebida.id, 'Resposta pós-v2', '<p>r3</p>');
    await wb._enviar();
    ok(noteA.getChildNotes().filter(c => c.hasLabel('sharedReply')).length === 3, 'A tem 3 respostas recebidas (2 do passo 3 + r3); a réplica de A é enviada, não recebida');
    ok(noteA.getChildNotes().some(c => c.title === 'Réplica de Alice' && c.getLabelValue('snSent') === 'true'), 'réplica própria de A marcada como enviada');

    console.log('\n[8] Revogação: deletar a gate de retorno de B → A não consegue mais responder');
    delete B.notes[gateB[0].id];
    recebida.children = recebida.children.filter(id => id !== gateB[0].id);
    global.api = A.api();
    noteA.inst.createNote(noteA.id, 'Réplica 2', '<p>r</p>');
    await wa._enviar();
    ok(wa.$widget.find('#sn-enviar-status')._html.includes('inválido'), 'handler de B retorna 404 e o widget mostra erro');

    console.log('\n[9] Endpoints: validação no aceite');
    const basePayload = { v: 2, from: 'X', noteId: 'n1', noteTitle: 'T', noteContent: 'c', inviteToken: 'tok-x' };
    global.api = B.api();

    wb.$widget.find('#sn-convite-in').val(b64(Object.assign({}, basePayload, { endpoint: 'http://169.254.169.254/latest' })));
    await wb._aceitar();
    ok(wb.$widget.find('#sn-aceitar-status')._html.includes('169.254'), 'bloqueia link-local (metadados)');

    wb.$widget.find('#sn-convite-in').val(b64(Object.assign({}, basePayload, { endpoint: 'http://evil.example.com' })));
    await wb._aceitar();
    ok(wb.$widget.find('#sn-aceitar-status')._html.includes('rede privada'), 'bloqueia http em host público');

    wb.$widget.find('#sn-convite-in').val(b64(Object.assign({}, basePayload, { endpoint: 'http://192.168.0.10:8081' })));
    await wb._aceitar();
    ok(wb.$widget.find('#sn-aceitar-status')._html.includes('criada'), 'aceita http em rede privada');
    wb.$widget.find('#sn-convite-in').val(b64(Object.assign({}, basePayload, { noteId: 'n-ts', endpoint: 'http://100.105.36.128:8080' })));
    await wb._aceitar();
    ok(wb.$widget.find('#sn-aceitar-status')._html.includes('criada'), 'aceita http em IP Tailscale (100.64/10)');

    wb.$widget.find('#sn-convite-in').val(b64(Object.assign({}, basePayload, { endpoint: 'https://ok.example.com', v: 3 })));
    await wb._aceitar();
    ok(wb.$widget.find('#sn-aceitar-status')._html.includes('versão mais nova'), 'recusa payload de versão futura');

    console.log('\n[10] i18n');
    const { snTranslate } = require(path.join(DIR, 'shared-notes-widget.js'));
    ok(snTranslate('pt', 'tab.gerar') === 'Gerar convite', 'pt: tab.gerar');
    ok(snTranslate('en', 'tab.gerar') === 'Generate invite', 'en: tab.gerar');
    ok(snTranslate('fr', 'tab.gerar') === 'Generate invite', 'fallback para en');
    ok(snTranslate('pt', 'enviar.pendentes', { n: 3 }) === '3 nota(s) filha(s) não enviada(s).', 'interpolação pt');
    ok(snTranslate('en', 'enviar.pendentes', { n: 3 }) === '3 unsent child note(s).', 'interpolação en');

    console.log('\n[10] Guarda de backend scripting desabilitado');
    B.backendScripting = false;
    global.api = B.api();
    wb._status('gerar', '');
    wb._sharedNote = frontNote(B, recebida);
    await wb._gerar();
    ok(wb.$widget.find('#sn-gerar-status')._html.includes('desabilitado'), 'mostra aviso amigável quando backend scripting está off');
    B.backendScripting = true;

    console.log('\n[11] Smoke de inicialização (doRenderBody)');
    let okBody = true, errBody = '';
    try { wb.doRenderBody(); } catch(e) { okBody = false; errBody = e.message; }
    ok(okBody, 'doRenderBody roda sem erro' + (errBody ? ' (' + errBody + ')' : ''));
    ok(!!wb._bodyHtml && wb._bodyHtml.includes('sn-wrap'), 'HTML do widget montado');

    console.log('\n' + (fails === 0 ? '>>> TODOS OS TESTES PASSARAM' : '>>> ' + fails + ' FALHA(S)'));
    process.exit(fails === 0 ? 0 : 1);
})().catch(e => { console.error('ERRO NO HARNESS:', e); process.exit(2); });
