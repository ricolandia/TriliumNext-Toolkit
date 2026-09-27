// shared-notes-handler.js
// ══════════════════════════════════════════════════════════════════════════════
// NOTA TRILIUM:
//   Tipo : Code
//   MIME : application/javascript;env=backend
//   Label: #customRequestHandler=shared-notes-reply
//
// Rota: POST /custom/shared-notes-reply
//
// Recebe respostas de qualquer peer e cria notas filhas na nota âncora
// (original de quem convidou ou recebida de quem aceitou).
// Valida: token efêmero (multiuso), expiração e vínculo com a nota âncora.
// Endpoints: https sempre; http apenas localhost/rede privada.
// NENHUM token ETAPI é exposto ou necessário nesta rota.
// ══════════════════════════════════════════════════════════════════════════════

// Guard de boot: absorve o erro do getter sem contexto HTTP
let req, res;
try {
    req = api.req;
    res = api.res;
} catch(e) { return; }
if (!req || !res) return;

res.setHeader('Content-Type', 'application/json');

function reply(code, data) {
    res.status(code).send(JSON.stringify(data));
}

// ── I18N do handler: segue o idioma DESTA instância (opção `locale`) ──────
const SN_H = {
    pt: {
        'resposta':        '↩️ {from} — {data} | {titulo}',
        'sem_titulo':      'Sem título',
        'respostas_de':    '💬 Respostas de {from} — {data}',
        'err.metodo':      'Método não permitido.',
        'err.json':        'JSON inválido.',
        'err.payload':     'Payload inválido. Necessário: inviteToken, from, replies[].',
        'err.replytoken':  'replyToken inválido.',
        'err.token':       'Token de convite inválido ou não encontrado.',
        'err.expirado':    'Convite expirado.',
        'err.gate_vinculo':'Gate note sem vínculo com nota original.',
        'err.nota_original':'Nota original não encontrada (pode ter sido deletada).',
        'err.nenhuma':     'Nenhuma nota criada. Erros: {erros}',
        'err.endpoint_vazio': 'Endpoint vazio.',
        'err.endpoint_url':   'URL de endpoint inválida.',
        'err.endpoint_proto': 'Endpoint deve usar https:// (ou http:// apenas em rede local).',
        'err.endpoint_link':  'http:// em 169.254.x.x (link-local) não é permitido.',
        'err.endpoint_http':  'http:// só é permitido para localhost, rede privada ou Tailscale.',
    },
    en: {
        'resposta':        '↩️ {from} — {data} | {titulo}',
        'sem_titulo':      'Untitled',
        'respostas_de':    '💬 Replies from {from} — {data}',
        'err.metodo':      'Method not allowed.',
        'err.json':        'Invalid JSON.',
        'err.payload':     'Invalid payload. Required: inviteToken, from, replies[].',
        'err.replytoken':  'Invalid replyToken.',
        'err.token':       'Invalid invite token or not found.',
        'err.expirado':    'Invite expired.',
        'err.gate_vinculo':'Gate note has no link to the original note.',
        'err.nota_original':'Original note not found (it may have been deleted).',
        'err.nenhuma':     'No notes created. Errors: {erros}',
        'err.endpoint_vazio': 'Empty endpoint.',
        'err.endpoint_url':   'Invalid endpoint URL.',
        'err.endpoint_proto': 'Endpoint must use https:// (or http:// only on a local network).',
        'err.endpoint_link':  'http:// on 169.254.x.x (link-local) is not allowed.',
        'err.endpoint_http':  'http:// is only allowed for localhost, private networks or Tailscale.',
    }
};

function hLocale() {
    try {
        const opt = api.getOption('locale');
        return String(opt && opt.value ? opt.value : '').toLowerCase().startsWith('pt') ? 'pt' : 'en';
    } catch(e) { return 'pt'; }
}
const HLANG = hLocale();

function hT(key, vars) {
    const dict = SN_H[HLANG] || SN_H.en;
    let str = dict[key];
    if (str === undefined) str = SN_H.pt[key];
    if (str === undefined) return key;
    if (vars) {
        for (const k of Object.keys(vars)) str = str.split('{' + k + '}').join(String(vars[k]));
    }
    return str;
}

// https sempre; http apenas localhost/rede privada/Tailscale (169.254/16 bloqueado — metadados de nuvem)
function validarEndpoint(raw) {
    const url = String(raw || '').trim().replace(/\/+$/, '');
    if (!url) return { ok: false, erro: hT('err.endpoint_vazio') };
    let u;
    try { u = new URL(url); } catch(e) { return { ok: false, erro: hT('err.endpoint_url') }; }
    if (u.protocol !== 'https:' && u.protocol !== 'http:') {
        return { ok: false, erro: hT('err.endpoint_proto') };
    }
    if (u.protocol === 'https:') return { ok: true, url };
    const h = u.hostname.toLowerCase().replace(/^\[|\]$/g, '');
    if (/^169\.254\./.test(h)) {
        return { ok: false, erro: hT('err.endpoint_link') };
    }
    const ehLocal = h === 'localhost' || h === '127.0.0.1' || h === '::1' ||
        /^10\./.test(h) || /^192\.168\./.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h) ||
        /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(h);
    if (!ehLocal) {
        return { ok: false, erro: hT('err.endpoint_http') };
    }
    return { ok: true, url };
}

// Só aceita POST
if (req.method !== 'POST') {
    return reply(405, { error: hT('err.metodo') });
}

// Parse do body
let body;
try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
} catch(e) {
    return reply(400, { error: hT('err.json') });
}

const { inviteToken, from, replies, replyEndpoint, replyToken } = body;

// ── 1. Validação básica ────────────────────────────────────────────────────
if (!inviteToken || !from || typeof from !== 'string' || from.length > 80
    || !Array.isArray(replies) || replies.length === 0) {
    return reply(400, { error: hT('err.payload') });
}

if (replyToken !== undefined && replyToken !== null && replyToken !== '' &&
    (typeof replyToken !== 'string' || replyToken.length > 128 || !/^[A-Za-z0-9-]+$/.test(replyToken))) {
    return reply(400, { error: hT('err.replytoken') });
}

let endpointOk = '';
if (replyEndpoint) {
    const check = validarEndpoint(replyEndpoint);
    if (!check.ok) return reply(400, { error: check.erro });
    endpointOk = check.url;
}

// ── 2. Localiza a gate note pelo token ────────────────────────────────────
let gate = null;
const candidates = api.searchForNotes(`#inviteGate`);
for (const c of candidates) {
    if (c.getLabelValue('inviteToken') === inviteToken) {
        gate = c;
        break;
    }
}

if (!gate) {
    return reply(404, { error: hT('err.token') });
}

// ── 3. Verifica expiração (7 dias) ────────────────────────────────────────
const expiresRaw = gate.getLabelValue('inviteExpires');
if (expiresRaw) {
    const expiresAt = parseInt(expiresRaw, 10);
    if (!isNaN(expiresAt) && Date.now() > expiresAt) {
        return reply(410, { error: hT('err.expirado') });
    }
}

// ── 4. Valida vínculo com a nota âncora ───────────────────────────────────
const parentNoteId = gate.getLabelValue('inviteParentNoteId');
if (!parentNoteId) {
    return reply(500, { error: hT('err.gate_vinculo') });
}

const originalNote = api.getNote(parentNoteId);
if (!originalNote) {
    return reply(404, { error: hT('err.nota_original') });
}

// ── 5. Cria as notas filhas de resposta ───────────────────────────────────
const ts       = new Date().toLocaleString(HLANG === 'pt' ? 'pt-BR' : 'en-US');
const isoNow   = new Date().toISOString();
const created  = [];
const errors   = [];

for (const r of replies) {
    try {
        const title = hT('resposta', { from, data: ts, titulo: r.title || hT('sem_titulo') });
        const content = r.content || '';

        const { note: child } = api.createNewNote({
            parentNoteId: originalNote.noteId,
            title:        title,
            content:      content,
            type:         'text'
        });

        child.setLabel('sharedReply', '');
        child.setLabel('replyFrom',   from);
        child.setLabel('replyDate',   isoNow);

        created.push(child.noteId);
    } catch(e) {
        errors.push((r.title || '?') + ': ' + e.message);
    }
}

if (created.length === 0) {
    return reply(500, { error: hT('err.nenhuma', { erros: errors.join('; ') }) });
}

// ── 6. Guarda o canal de retorno do peer na nota âncora ───────────────────
if (endpointOk) {
    originalNote.setLabel('replyEndpoint', endpointOk);
}
if (replyToken) {
    originalNote.setLabel('replyToken', replyToken);
}

// Registro de uso + feedback visual na árvore
gate.setLabel('inviteLastUsed', isoNow);
gate.setLabel('inviteLastFrom', from);
gate.title = hT('respostas_de', { from, data: ts });
gate.save();

// ── 7. Responde com sucesso ────────────────────────────────────────────────
reply(200, {
    ok:       true,
    received: created.length,
    errors:   errors,
    noteIds:  created
});