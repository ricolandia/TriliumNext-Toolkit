// ============================================================
// test-mobile-launcher.js — testa as 3 ações do Canvas Mobile (v9 MVP)
// extraindo engine + i18n + backends do arquivo gerado (mobile-launcher.js)
// com uma `api` de mentira, como no test-flow-engine.js.
//
// Uso: bun test-mobile-launcher.js
// ============================================================
const fs = require('fs');
const path = require('path');

const dir = __dirname;
const src = fs.readFileSync(path.join(dir, 'mobile-launcher.js'), 'utf8');

// corta o bloco de UI (IIFE) — só engine + i18n + backends são testados aqui
const corte = src.indexOf('* CANVAS MOBILE (v9 MVP) — diálogo acionado por nota launcher');
if (corte < 0) throw new Error('bloco de UI não encontrado');
const nucleo = src.slice(0, src.lastIndexOf('/* ====', corte));

// ── stubs ────────────────────────────────────────────────────
function notaFake(conteudo) {
    let c = conteudo;
    return {
        noteId: 'n1',
        title: 'Fake',
        parentNoteIds: ['p1'],
        getContent: () => c,
        setContent: (novo) => { c = novo; },
        conteudo: () => c,
    };
}

const canvas = notaFake(JSON.stringify({ type: 'excalidraw', version: 2, elements: [] }));
const vinculada = notaFake('<p>Olá mundo — trecho de teste.</p>');
const template = notaFake(JSON.stringify({
    type: 'excalidraw', version: 2,
    elements: [
        { id: 'r1', type: 'rectangle', x: 10, y: 20, width: 100, height: 50, boundElements: [{ id: 't1', type: 'text' }] },
        { id: 't1', type: 'text', x: 15, y: 25, width: 80, height: 20, containerId: 'r1' },
    ],
}));

const globalThisApi = {
    getNote: (id) => ({ n1: canvas, n2: vinculada, n3: template }[id] || null),
    searchForNotes: () => [],
    getOption: () => ({ value: 'pt_BR' }),
};

globalThis.api = globalThisApi;
eval(nucleo + '\nglobalThis.CLW = { CLW_BE_INSERT, CLW_BE_TPL, CLW_BE_FLOW, parseFlowSpec, buildFlowElements, getCleanPatterns, CARD_CONFIG, FLOW_CONFIG, clwNormalizeLang, clwTranslate };');

let falhas = 0;
const ok = (nome, cond, extra) => {
    if (cond) console.log('  ✓ ' + nome);
    else { falhas++; console.log('  ✗ ' + nome + (extra !== undefined ? ' → ' + JSON.stringify(extra) : '')); }
};

const C = CLW;

console.log('\n1) Inserir nota como card');
{
    const labels = { canvasMissing: 'x', tplMissing: 'x', tplInvalid: 'x', whereParent: 'x', whereTemplates: 'x' };
    const antes = JSON.parse(canvas.conteudo()).elements.length;
    C.CLW_BE_INSERT('n1', 'n2', 'Nota de teste', '', C.CARD_CONFIG, C.getCleanPatterns(), labels);
    const els = JSON.parse(canvas.conteudo()).elements;
    ok('adicionou elementos', els.length > antes, els.length);
    ok('tem retângulo com link', els.some((e) => e.type === 'rectangle' && e.link === '#root/n2'), null);
    ok('tem título', els.some((e) => e.type === 'text' && e.text === 'Nota de teste'), null);
    ok('tem trecho', els.some((e) => e.type === 'text' && /Olá mundo/.test(e.text || '')), null);
}

console.log('\n2) Inserir template (com remapeamento de ids)');
{
    const labels = { canvasMissing: 'x', tplMissing: 'x', tplInvalid: 'x', whereParent: 'x', whereTemplates: 'x' };
    const antes = JSON.parse(canvas.conteudo()).elements.length;
    const n = C.CLW_BE_TPL('n1', 'n3', C.FLOW_CONFIG.marginX, labels);
    const els = JSON.parse(canvas.conteudo()).elements;
    const novos = els.slice(antes);
    ok('retornou a contagem', n === 2, n);
    ok('ids remapeados', novos.every((e) => !['r1', 't1'].includes(e.id)), novos.map((e) => e.id));
    ok('referências remapeadas', novos.some((e) => (e.boundElements || []).some((b) => novos.some((x) => x.id === b.id))), null);
    ok('deslocado para a direita', novos.every((e) => e.x >= C.FLOW_CONFIG.marginX), novos.map((e) => e.x));
}

console.log('\n3) Gerar fluxo pela DSL');
{
    const labels = { canvasMissing: 'x', tplMissing: 'x', tplInvalid: 'x', whereParent: 'x', whereTemplates: 'x' };
    const t = (k, v) => C.clwTranslate('pt', k, v);
    const spec = 'Início: Começo [inicio]\nAnálise: Verificar [processo]\nInício -> Análise : sim';
    const parsed = C.parseFlowSpec(spec, t);
    ok('DSL sem erros', parsed.errors.length === 0, parsed.errors);
    ok('2 nós e 1 aresta', parsed.nodes.length === 2 && parsed.edges.length === 1, { n: parsed.nodes.length, e: parsed.edges.length });

    const { elements } = C.buildFlowElements(parsed.nodes, parsed.edges, 'TB', { x: 0, y: 0 });
    const antes = JSON.parse(canvas.conteudo()).elements.length;
    const n = C.CLW_BE_FLOW('n1', elements, C.FLOW_CONFIG.marginX, labels);
    ok('gravou os elementos', n === elements.length, n);
    ok('total cresceu', JSON.parse(canvas.conteudo()).elements.length === antes + n, null);
}

console.log('\n4) Erro em canvas inexistente');
{
    const labels = { canvasMissing: 'canvas sumiu', tplMissing: 'x', tplInvalid: 'x', whereParent: 'x', whereTemplates: 'x' };
    let erro = null;
    try { C.CLW_BE_FLOW('inexistente', [], 60, labels); } catch (e) { erro = e.message; }
    ok('lança erro com a mensagem do label', erro === 'canvas sumiu', erro);
}

console.log('\n' + (falhas === 0 ? '✅ Todos os testes passaram' : `❌ ${falhas} falha(s)`));
process.exit(falhas === 0 ? 0 : 1);
