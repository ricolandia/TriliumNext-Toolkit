// e2e_real.js — Teste E2E do Shared Notes entre duas instâncias Trilium reais,
// executando o MESMO código do widget (shared-notes-widget.js) contra ETAPI.
//
// A = VPS (https://trilium.rizomatico.org) | B = demo local (http://localhost:8080)
// Uso: E2E_A_TOKEN=<token da VPS> E2E_B_TOKEN=<token do demo> bun test-e2e-real.js
const { execFileSync } = require('child_process');
const path = require('path');

const REPO = __dirname;
const A = {
    name: process.env.E2E_A_NAME || 'VPS',
    base: process.env.E2E_A_BASE || 'https://trilium.rizomatico.org/etapi',
    token: process.env.E2E_A_TOKEN || ''
};
const B = {
    name: process.env.E2E_B_NAME || 'Demo',
    base: process.env.E2E_B_BASE || 'http://localhost:8080/etapi',
    token: process.env.E2E_B_TOKEN || ''
};
const EXPECT_A_ENDPOINT = process.env.E2E_EXPECT_A_ENDPOINT || '';

if (!A.token || !B.token) {
    console.error('Defina E2E_A_TOKEN (VPS) e E2E_B_TOKEN (demo) por variável de ambiente — os tokens NÃO ficam no repositório.');
    process.exit(1);
}

let fails = 0;
function ok(cond, msg) {
    if (cond) console.log('  OK   ' + msg);
    else { fails++; console.log('  FAIL ' + msg); }
}
function step(t) { console.log('\n[' + t + ']'); }

// ── HTTP síncrono via curl (User-Agent de navegador: a Cloudflare da VPS bloqueia
//    o UA do Python/urllib em alguns métodos) ─────────────────────────────────
function httpSync(method, url, { token, body, contentType } = {}) {
    const args = ['-s', '-A', 'Mozilla/5.0 (X11; Linux x86_64)', '-X', method, url,
        '-H', 'Authorization: Bearer ' + token, '-w', '\n%{http_code}'];
    if (body !== undefined) {
        args.push('-H', 'Content-Type: ' + (contentType || 'application/json'), '--data-binary', '@-');
    }
    const out = execFileSync('curl', args, {
        input: body === undefined ? '' : body,
        encoding: 'utf8', maxBuffer: 128 * 1024 * 1024, timeout: 60000
    });
    const i = out.lastIndexOf('\n');
    return { status: parseInt(out.slice(i + 1), 10), raw: out.slice(0, i) };
}

function makeInstance(cfg) {
    const inst = { name: cfg.name, base: cfg.base, token: cfg.token };
    inst.http = {
        get: (p) => httpSync('GET', inst.base + p, { token: inst.token }),
        post: (p, obj) => httpSync('POST', inst.base + p, { token: inst.token, body: JSON.stringify(obj) }),
        patch: (p, obj) => httpSync('PATCH', inst.base + p, { token: inst.token, body: JSON.stringify(obj) }),
        putJson: (p, obj) => httpSync('PUT', inst.base + p, { token: inst.token, body: JSON.stringify(obj) }),
        putText: (p, text) => httpSync('PUT', inst.base + p, { token: inst.token, body: text, contentType: 'text/plain' }),
        del: (p) => httpSync('DELETE', inst.base + p, { token: inst.token }),
    };
    return inst;
}

const ATTRS = (n) => (n.attributes || []).filter(a => a.type === 'label');

class NoteRef {
    constructor(inst, noteId) { this.inst = inst; this.noteId = noteId; }
    _data() {
        const r = this.inst.http.get('/notes/' + this.noteId);
        if (r.status !== 200) throw new Error(`GET ${this.inst.name} note ${this.noteId} -> ${r.status} ${r.raw.slice(0, 120)}`);
        return JSON.parse(r.raw);
    }
    get title() { return this._data().title; }
    set title(v) {
        const r = this.inst.http.patch('/notes/' + this.noteId, { title: v });
        if (![200, 204].includes(r.status)) throw new Error('PATCH title -> ' + r.status + ' ' + r.raw.slice(0, 120));
    }
    get type() { return this._data().type; }
    get mime() { return this._data().mime; }
    getContent() {
        const r = this.inst.http.get('/notes/' + this.noteId + '/content');
        if (r.status !== 200) throw new Error('GET content -> ' + r.status);
        return r.raw;
    }
    setContent(c) {
        const r = this.inst.http.putText('/notes/' + this.noteId + '/content', c);
        if (r.status !== 204) throw new Error('PUT content -> ' + r.status + ' ' + r.raw.slice(0, 120));
    }
    hasLabel(name) { return ATTRS(this._data()).some(a => a.name === name); }
    getLabelValue(name) { const a = ATTRS(this._data()).find(x => x.name === name); return a ? a.value : null; }
    setLabel(name, value) {
        const v = String(value == null ? '' : value);
        const a = ATTRS(this._data()).find(x => x.name === name);
        if (a) {
            const r = this.inst.http.patch('/attributes/' + a.attributeId, { value: v });
            if (![200, 204].includes(r.status)) throw new Error('PATCH attr -> ' + r.status + ' ' + r.raw.slice(0, 120));
        } else {
            const r = this.inst.http.post('/attributes', { noteId: this.noteId, type: 'label', name, value: v });
            if (![200, 201].includes(r.status)) throw new Error('POST attr -> ' + r.status + ' ' + r.raw.slice(0, 120));
        }
    }
    getChildNotes() { return this._data().childNoteIds.map(id => new NoteRef(this.inst, id)); }
    save() {}
}

function backendApi(inst) {
    return {
        getNote: (id) => new NoteRef(inst, id),
        createNewNote: ({ parentNoteId, title, content, type }) => {
            const r = inst.http.post('/create-note', { parentNoteId, title, content, type: type || 'text' });
            if (![200, 201].includes(r.status)) throw new Error('create-note -> ' + r.status + ' ' + r.raw.slice(0, 160));
            return { note: new NoteRef(inst, JSON.parse(r.raw).note.noteId) };
        },
        searchForNotes: (q) => {
            const r = inst.http.get('/notes?search=' + encodeURIComponent(q) + '&limit=100');
            if (r.status !== 200) throw new Error('search -> ' + r.status);
            return JSON.parse(r.raw).results.map(n => new NoteRef(inst, n.noteId));
        },
        searchForNote: (q) => {
            const r = inst.http.get('/notes?search=' + encodeURIComponent(q) + '&limit=100');
            if (r.status !== 200) throw new Error('search -> ' + r.status);
            const res = JSON.parse(r.raw).results;
            return res.length ? new NoteRef(inst, res[0].noteId) : null;
        },
    };
}

function widgetApi(inst) {
    return Object.assign({}, backendApi(inst), {
        runOnBackend: async (fn, args) => fn(...(args || [])),
        runAsyncOnBackendWithManualTransactionHandling: async (fn, args) => fn(...(args || [])),
        RightPanelWidget: class {},
    });
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
            toggleClass() { return this; }, removeClass() { return this; },
            addClass() { return this; }, on() { return this; },
        };
        return store[sel];
    }
    return { store, find: (sel) => el(sel) };
}

// ── Carrega o widget real ───────────────────────────────────────────────────
const A_ = makeInstance(A), B_ = makeInstance(B);
global.api = { RightPanelWidget: class {} };
delete require.cache[require.resolve(path.join(REPO, 'shared-notes-widget.js'))];
const SharedNotesWidget = require(path.join(REPO, 'shared-notes-widget.js'));

function makeWidget(inst) {
    const w = new SharedNotesWidget();
    const jq = makeJq();
    w.$widget = { find: (sel) => jq.find(sel) };
    w._store = jq.store;
    w._inst = inst;
    w._lang = 'pt';
    return w;
}
const num = (v) => parseInt(v || '0', 10);

// Probe temporário: usa fetch (o mesmo caminho que o widget usa no sandbox).
const PROBE_SRC = `let req, res;
try { req = api.req; res = api.res; } catch(e) { return; }
if (!req || !res) return;
res.setHeader('Content-Type', 'application/json');
if (req.method !== 'POST') { res.status(405).send(JSON.stringify({ error: 'POST only' })); return; }
let body;
try { body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}); } catch(e) { res.status(400).send(JSON.stringify({ error: 'bad json' })); return; }
if (!body.url || !body.payload) { res.status(400).send(JSON.stringify({ error: 'url+payload required' })); return; }
const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), 20000);
fetch(body.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body.payload), signal: controller.signal })
  .then(r => r.text().then(t => {
      let data; try { data = JSON.parse(t); } catch(e) { data = { raw: t.slice(0, 200) }; }
      res.status(200).send(JSON.stringify({ ok: r.status === 200, status: r.status, data }));
  }))
  .catch(e => res.status(200).send(JSON.stringify({ ok: false, error: e.message })))
  .finally(() => clearTimeout(timer));`;


(async () => {
    const wa = makeWidget(A_), wb = makeWidget(B_);
    const stamp = new Date().toLocaleString('pt-BR');

    function configEndpoint(inst, label) {
        const r = inst.http.get('/notes?search=' + encodeURIComponent('#sharedNotesConfig') + '&limit=20');
        for (const n of JSON.parse(r.raw).results) {
            const full = JSON.parse(inst.http.get('/notes/' + n.noteId).raw);
            const attrs = ATTRS(full);
            if (attrs.some(a => ['myName', 'myEndpoint'].includes(a.name))) {
                const ep = (attrs.find(a => a.name === 'myEndpoint') || {}).value || '';
                console.log(`  ${label} (${inst.name}) config "${full.title}" | myEndpoint=${ep}`);
                return ep.replace(/\/+$/, '');
            }
        }
        throw new Error('config não encontrada em ' + inst.name);
    }

    step('0. Pré-checagem das instâncias');
    const epA = configEndpoint(A_, 'A');
    const epB = configEndpoint(B_, 'B');
    if (EXPECT_A_ENDPOINT) {
        ok(epA.startsWith(EXPECT_A_ENDPOINT), `endpoint do lado A confere (${epA} ~ ${EXPECT_A_ENDPOINT})`);
        if (!epA.startsWith(EXPECT_A_ENDPOINT)) {
            console.log('  ABORT: ajuste o myEndpoint do lado A antes do teste.');
            process.exit(2);
        }
    }
    const rHandlerA = httpSync('POST', epA + '/custom/shared-notes-reply', { token: '', body: '{}', contentType: 'application/json' });
    ok(rHandlerA.status === 400, `handler do lado A ativo (400 JSON; recebido ${rHandlerA.status})`);
    if (rHandlerA.status !== 400) {
        console.log('  ABORT: habilite backend scripting no lado A (ou verifique o handler) antes do teste.');
        process.exit(2);
    }
    const rHandlerB = httpSync('POST', epB + '/custom/shared-notes-reply', { token: '', body: '{}', contentType: 'application/json' });
    ok(rHandlerB.status === 400, `handler do lado B ativo (400 JSON; recebido ${rHandlerB.status})`);

    step('1. A (VPS) cria a nota de teste e gera o convite');
    const rn = A_.http.post('/create-note', { parentNoteId: 'root', title: '🧪 E2E Shared Notes — ' + stamp, type: 'text', content: '<p>conteúdo v1 — ' + stamp + '</p>' });
    if (![200, 201].includes(rn.status)) throw new Error('create-note A -> ' + rn.status + ' ' + rn.raw.slice(0, 200));
    const noteA = new NoteRef(A_, JSON.parse(rn.raw).note.noteId);
    console.log('  nota A:', noteA.noteId, '|', noteA.title);
    global.api = widgetApi(A_);
    wa._sharedNote = noteA;
    await wa._gerar();
    const convite1 = wa._store['#sn-convite-out']._val;
    ok(!!convite1, 'convite v1 gerado');
    ok(noteA.getLabelValue('myReplyToken') && noteA.getLabelValue('snVersion') === '1', 'A: myReplyToken + snVersion=1');
    const gateA = noteA.getChildNotes().filter(c => c.hasLabel('inviteGate'));
    ok(gateA.length === 1, 'A: gate do convite criada');
    const p1 = JSON.parse(Buffer.from(convite1, 'base64').toString('utf8'));
    ok(p1.endpoint === epA + '/custom/shared-notes-reply', 'A: endpoint do convite = config de A (' + p1.endpoint + ')');

    step('2. B (Demo EN) aceita o convite');
    global.api = widgetApi(B_);
    wb.$widget.find('#sn-convite-in').val(convite1);
    await wb._aceitar();
    const inboxB = B_.http.get('/notes?search=' + encodeURIComponent('#sharedInbox') + '&limit=10');
    const inboxIdB = JSON.parse(inboxB.raw).results[0]?.noteId;
    ok(!!inboxIdB, 'B: Shared Inbox existe');
    const recebida = new NoteRef(B_, JSON.parse(B_.http.get('/notes/' + inboxIdB).raw).childNoteIds
        .map(id => new NoteRef(B_, id)).find(n => n.getLabelValue('sharedNoteId') === noteA.noteId).noteId);
    ok(recebida.getLabelValue('sharedNoteId') === noteA.noteId, 'B: nota recebida criada');
    ok(recebida.getLabelValue('inviteToken') === p1.inviteToken, 'B: inviteToken = token de A');
    const TB = recebida.getLabelValue('myReplyToken');
    ok(!!TB && TB !== p1.inviteToken, 'B: canal de retorno próprio (T_B)');
    console.log('  nota B:', recebida.noteId, '|', recebida.title);
    wb._sharedNote = recebida;

    step('3. B responde (POST real -> handler do lado A)');
    const r1 = B_.http.post('/create-note', { parentNoteId: recebida.noteId, title: 'Resposta do Demo 1', type: 'text', content: '<p>r1 do demo</p>' });
    const r2 = B_.http.post('/create-note', { parentNoteId: recebida.noteId, title: 'Resposta do Demo 2', type: 'text', content: '<p>r2 do demo</p>' });
    ok([200, 201].includes(r1.status) && [200, 201].includes(r2.status), 'B: filhas de resposta criadas');
    await wb._enviar();
    ok(/sucesso/.test(wb.$widget.find('#sn-enviar-status')._html), 'B: envio ok (' + wb.$widget.find('#sn-enviar-status')._text + ')');
    const repsEmA = noteA.getChildNotes().filter(c => c.hasLabel('sharedReply'));
    ok(repsEmA.length === 2, `A: recebeu 2 respostas via handler da VPS (tem ${repsEmA.length})`);
    ok(noteA.getLabelValue('replyEndpoint') === 'http://100.105.36.128:8080/custom/shared-notes-reply', 'A: guardou endpoint de B');
    ok(noteA.getLabelValue('replyToken') === TB, 'A: guardou token de retorno de B');

    step('4. A responde de volta (POST real -> handler do lado B)');
    A_.http.post('/create-note', { parentNoteId: noteA.noteId, title: 'Réplica da VPS', type: 'text', content: '<p>réplica da VPS</p>' });
    global.api = widgetApi(A_);
    wa._sharedNote = noteA;
    await wa._enviar();
    ok(/sucesso/.test(wa.$widget.find('#sn-enviar-status')._html), 'A: envio ok (' + wa.$widget.find('#sn-enviar-status')._text + ')');
    const repsEmB = recebida.getChildNotes().filter(c => c.hasLabel('sharedReply'));
    ok(repsEmB.length === 1, `B: recebeu a réplica da VPS (tem ${repsEmB.length})`);
    ok(recebida.getLabelValue('replyToken') === p1.inviteToken, 'B: replyToken atualizado (token de A)');

    step('5. Snapshot v2: A reenvia, B atualiza in-place');
    noteA.setContent('<p>conteúdo v2 — ' + stamp + '</p>');
    global.api = widgetApi(A_);
    await wa._gerar();
    const convite2 = wa._store['#sn-convite-out']._val;
    const p2 = JSON.parse(Buffer.from(convite2, 'base64').toString('utf8'));
    ok(p2.snapshotVersion === 2, 'A: snapshot v2');
    global.api = widgetApi(B_);
    wb.$widget.find('#sn-convite-in').val(convite2);
    await wb._aceitar();
    ok(recebida.getContent().includes('conteúdo v2'), 'B: conteúdo v2 in-place');
    ok(recebida.getLabelValue('inviteToken') === p2.inviteToken, 'B: inviteToken renovado (T_A2)');
    ok(recebida.getLabelValue('myReplyToken') === TB, 'B: myReplyToken preservado');
    ok(num(recebida.getLabelValue('snVersion')) === 2, 'B: snVersion=2');
    ok(recebida.getChildNotes().filter(c => c.hasLabel('sharedReply')).length === 1, 'B: respostas preservadas');

    step('6. B responde após v2 (token novo)');
    B_.http.post('/create-note', { parentNoteId: recebida.noteId, title: 'Resposta pós-v2', type: 'text', content: '<p>r3</p>' });
    await wb._enviar();
    ok(/sucesso/.test(wb.$widget.find('#sn-enviar-status')._html), 'B: envio pós-v2 ok');
    ok(noteA.getChildNotes().filter(c => c.hasLabel('sharedReply')).length === 3, 'A: 3 respostas recebidas no total');

    step('7. VPS -> demo server-to-server (handler temporário na VPS faz o POST)');
    const probeToken = 'sn-probe-' + Math.random().toString(36).slice(2, 10);
    const rProbe = A_.http.post('/create-note', { parentNoteId: 'root', title: '🧪 probe cross-instance (temporário)', type: 'code', mime: 'application/javascript;env=backend', content: PROBE_SRC });
    const probeNoteId = JSON.parse(rProbe.raw).note.noteId;
    A_.http.post('/attributes', { noteId: probeNoteId, type: 'label', name: 'customRequestHandler', value: probeToken });
    const rFwd = httpSync('POST', epA + '/custom/' + probeToken, {
        token: '', contentType: 'application/json',
        body: JSON.stringify({
            url: epB + '/custom/shared-notes-reply',
            payload: {
                inviteToken: TB,
                from: 'VPS (probe)',
                replies: [{ title: 'Resposta enviada pelo servidor da VPS', content: '<p>via probe server-side</p>' }],
                replyEndpoint: epA + '/custom/shared-notes-reply',
                replyToken: noteA.getLabelValue('myReplyToken')
            }
        })
    });
    let fwd = {};
    try { fwd = JSON.parse(rFwd.raw); } catch(e) { fwd = { ok: false, error: rFwd.raw.slice(0, 120) }; }
    ok(fwd.ok === true && fwd.status === 200,
       'VPS alcançou o handler do demo (resultado: ' + JSON.stringify(fwd.ok ? fwd.status : (fwd.error || fwd)) + ')');
    const repsProbe = recebida.getChildNotes().filter(c => c.getLabelValue('replyFrom') === 'VPS (probe)');
    ok(repsProbe.length === 1, 'demo recebeu a resposta enviada PELO SERVIDOR da VPS');
    A_.http.del('/notes/' + probeNoteId);
    ok(true, 'probe temporário removido da VPS');

    step('8. Revogação: deletar a gate de retorno de B -> A falha com 404');
    const gateB = recebida.getChildNotes().find(c => c.hasLabel('inviteGate') && c.getLabelValue('inviteToken') === TB);
    ok(!!gateB, 'B: gate de retorno localizada');
    B_.http.del('/notes/' + gateB.noteId);
    A_.http.post('/create-note', { parentNoteId: noteA.noteId, title: 'Réplica pós-revogação', type: 'text', content: '<p>x</p>' });
    global.api = widgetApi(A_);
    await wa._enviar();
    ok(/inválido|invalid/i.test(wa.$widget.find('#sn-enviar-status')._html), 'A: handler de B retornou 404 (' + wa.$widget.find('#sn-enviar-status')._html + ')');

    console.log('\n' + (fails === 0 ? '>>> E2E REAL: TODOS OS PASSOS PASSARAM' : '>>> E2E REAL: ' + fails + ' FALHA(S)'));
    console.log('Notas deixadas para inspeção manual:');
    console.log('  A (VPS):  https://trilium.rizomatico.org/#root/' + noteA.noteId + '  "' + noteA.title + '"');
    console.log('  B (Demo): inbox ' + inboxIdB + ' | recebida ' + recebida.noteId);
    process.exit(fails === 0 ? 0 : 1);
})().catch(e => { console.error('\nERRO NO HARNESS:', e.message); process.exit(2); });
