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
        'err.token_formato': 'Token de convite em formato inválido.',
        'err.from_longo':  'Nome do remetente muito longo (máx. 80 caracteres).',
        'err.item_invalido': 'Item de resposta inválido (precisa ser objeto com title/content em texto).',
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
        'err.token_formato': 'Invite token has an invalid format.',
        'err.from_longo':  'Sender name too long (max. 80 characters).',
        'err.item_invalido': 'Invalid reply item (must be an object with text title/content).',
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

// Só aceita POST (OPTIONS responde para diagnóstico/preflight)
if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(204).send('');
}
if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
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

// ── 1. Validação básica (campo a campo, com motivo específico) ────────────
const fromLimpo = (typeof from === 'string' ? from : '')
    .replace(/[\r\n\t\u0000-\u001F]+/g, ' ').trim();

if (!inviteToken || typeof inviteToken !== 'string' || !/^[A-Za-z0-9+/=_-]{4,128}$/.test(inviteToken)) {
    return reply(400, { error: hT('err.token_formato') });
}
if (!fromLimpo) {
    return reply(400, { error: hT('err.payload') });
}
if (fromLimpo.length > 80) {
    return reply(400, { error: hT('err.from_longo') });
}
if (!Array.isArray(replies) || replies.length === 0 || replies.length > 200) {
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

// ── 2. Localiza a gate note pelo token (lookup direto, com fallback) ──────
let gate = null;
try {
    gate = api.getNotesWithLabel('inviteToken', inviteToken).find(n => n.hasLabel('inviteGate')) || null;
} catch(e) { gate = null; }
if (!gate) {
    for (const c of api.searchForNotes(`#inviteGate`)) {
        if (c.getLabelValue('inviteToken') === inviteToken) { gate = c; break; }
    }
}

if (!gate) {
    return reply(404, { error: hT('err.token') });
}

// ── 3. Verifica expiração (label corrompida = expirado, nunca eterno) ─────
const expiresRaw = gate.getLabelValue('inviteExpires');
if (expiresRaw) {
    const expiresAt = parseInt(expiresRaw, 10);
    if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) {
        return reply(410, { error: hT('err.expirado') });
    }
}

// ── 4. Valida vínculo com a nota âncora ───────────────────────────────────
const parentNoteId = gate.getLabelValue('inviteParentNoteId');
if (!parentNoteId || !(gate.parentNoteIds || []).includes(parentNoteId)) {
    return reply(409, { error: hT('err.gate_vinculo') });
}

const originalNote = api.getNote(parentNoteId);
if (!originalNote || originalNote.isDeleted) {
    return reply(404, { error: hT('err.nota_original') });
}

// ── 5–7. Cria as notas filhas, registra uso e responde (com rede de segurança) ──
try {
    const ts        = new Date().toLocaleString(HLANG === 'pt' ? 'pt-BR' : 'en-US');
    const isoNow    = new Date().toISOString();
    const created   = [];
    const errors    = [];
    const sourceIds = [];

    for (const r of replies) {
        const tituloItem = (r && typeof r === 'object' && typeof r.title === 'string') ? r.title : '';
        try {
            if (!r || typeof r !== 'object'
                || (r.title != null && typeof r.title !== 'string')
                || (r.content != null && typeof r.content !== 'string')) {
                errors.push((tituloItem || '?') + ': ' + hT('err.item_invalido'));
                continue;
            }

            const title   = hT('resposta', { from: fromLimpo, data: ts, titulo: tituloItem || hT('sem_titulo') });
            const content = r.content || '';

            const { note: child } = api.createNewNote({
                parentNoteId: originalNote.noteId,
                title:        title,
                content:      content,
                type:         'text'
            });

            child.setLabel('sharedReply', '');
            child.setLabel('replyFrom',   fromLimpo);
            child.setLabel('replyDate',   isoNow);

            created.push(child.noteId);
            if (r.noteId && typeof r.noteId === 'string') sourceIds.push(r.noteId);
        } catch(e) {
            errors.push((tituloItem || '?') + ': ' + ((e && e.message) || e));
        }
    }

    if (created.length === 0) {
        return reply(422, { error: hT('err.nenhuma', { erros: errors.join('; ') }) });
    }

    // ── 6. Guarda o canal de retorno do peer na nota âncora ───────────────
    if (endpointOk) {
        originalNote.setLabel('replyEndpoint', endpointOk);
    }
    if (replyToken) {
        originalNote.setLabel('replyToken', replyToken);
    }

    // Registro de uso + feedback visual na árvore (a atribuição de título
    // já persiste na transação — sem save() redundante)
    gate.setLabel('inviteLastUsed', isoNow);
    gate.setLabel('inviteLastFrom', fromLimpo);
    gate.title = hT('respostas_de', { from: fromLimpo, data: ts });

    // ── 7. Responde com sucesso (sourceIds = quais itens do remetente foram criados) ──
    reply(200, {
        ok:        true,
        received:  created.length,
        errors:    errors,
        noteIds:   created,
        sourceIds: sourceIds
    });
} catch(e) {
    try { reply(500, { error: hT('err.nenhuma', { erros: (e && e.message) || e }) }); } catch(e2) { /* já respondido */ }
}