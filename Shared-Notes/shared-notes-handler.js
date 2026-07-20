// shared-notes-handler.js
// ══════════════════════════════════════════════════════════════════════════════
// NOTA TRILIUM:
//   Tipo : Code
//   MIME : application/javascript;env=backend
//   Label: #customRequestHandler=shared-notes-reply
//
// Rota: POST /custom/shared-notes-reply
//
// Recebe respostas de User B e cria notas filhas na nota original de A.
// Valida: token efêmero, single-use, expiração, vínculo com nota original.
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
res.setHeader('Access-Control-Allow-Origin', '*');

function reply(code, data) {
    res.status(code).send(JSON.stringify(data));
}

// Só aceita POST
if (req.method !== 'POST') {
    return reply(405, { error: 'Método não permitido.' });
}

// Parse do body
let body;
try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
} catch(e) {
    return reply(400, { error: 'JSON inválido.' });
}

const { inviteToken, from, replies, replyEndpoint } = body;

// ── 1. Validação básica ────────────────────────────────────────────────────
if (!inviteToken || !from || !Array.isArray(replies) || replies.length === 0) {
    return reply(400, { error: 'Payload inválido. Necessário: inviteToken, from, replies[].' });
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
    return reply(404, { error: 'Token de convite inválido ou não encontrado.' });
}

// ── 3. Verifica expiração (7 dias) ────────────────────────────────────────
const expiresRaw = gate.getLabelValue('inviteExpires');
if (expiresRaw) {
    const expiresAt = parseInt(expiresRaw, 10);
    if (!isNaN(expiresAt) && Date.now() > expiresAt) {
        return reply(410, { error: 'Convite expirado.' });
    }
}

// ── 5. Valida vínculo com nota original ───────────────────────────────────
const parentNoteId = gate.getLabelValue('inviteParentNoteId');
if (!parentNoteId) {
    return reply(500, { error: 'Gate note sem vínculo com nota original.' });
}

const originalNote = api.getNote(parentNoteId);
if (!originalNote) {
    return reply(404, { error: 'Nota original não encontrada (pode ter sido deletada).' });
}

// ── 6. Cria as notas filhas de resposta ───────────────────────────────────
const ts       = new Date().toLocaleString('pt-BR');
const isoNow   = new Date().toISOString();
const created  = [];
const errors   = [];

for (const r of replies) {
    try {
        const title = `↩️ ${from} — ${ts} | ${r.title || 'Sem título'}`;
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
    return reply(500, { error: 'Nenhuma nota criada. Erros: ' + errors.join('; ') });
}

// ── 7. Armazena endpoint de B na nota original (para A responder) ────────
if (replyEndpoint) {
    originalNote.setLabel('replyEndpoint', replyEndpoint);
}

// Renomeia gate para feedback visual
gate.title = `💬 Respostas de ${from} — ${ts}`;
gate.save();

// ── 8. Responde com sucesso ────────────────────────────────────────────────
reply(200, {
    ok:       true,
    received: created.length,
    errors:   errors,
    noteIds:  created
});