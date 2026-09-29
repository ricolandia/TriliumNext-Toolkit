// ============================================================
// test-mobile-launcher.js — testa as ações do Canvas Mobile (v9)
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
const corte = src.indexOf('* CANVAS MOBILE (v9) — diálogo acionado por nota launcher');
if (corte < 0) throw new Error('bloco de UI não encontrado');
const nucleo = src.slice(0, src.lastIndexOf('/* ====', corte));

// ── stubs ────────────────────────────────────────────────────
const criadas = [];
const relacoes = [];

function notaFake(id, titulo, conteudo) {
    let c = conteudo;
    return {
        noteId: id,
        title: titulo,
        parentNoteIds: ['p1'],
        getContent: () => c,
        setContent: (novo) => { c = novo; },
        conteudo: () => c,
        addRelation: (nome, valor) => { relacoes.push({ from: id, nome, valor }); },
    };
}

const canvas = notaFake('n1', 'Canvas de teste', JSON.stringify({ type: 'excalidraw', version: 2, elements: [] }));
const vinculada = notaFake('n2', 'Nota vinculada', '<p>Olá mundo — trecho de teste.</p>');
const template = notaFake('n3', 'Template', JSON.stringify({
    type: 'excalidraw', version: 2,
    elements: [
        { id: 'r1', type: 'rectangle', x: 10, y: 20, width: 100, height: 50, groupIds: ['tg1'], boundElements: [{ id: 't1', type: 'text' }] },
        { id: 't1', type: 'text', x: 15, y: 25, width: 80, height: 20, groupIds: ['tg1'], containerId: 'r1' },
    ],
}));

const notas = { n1: canvas, n2: vinculada, n3: template };

const globalThisApi = {
    getNote: (id) => notas[id] || null,
    searchForNotes: () => [],
    getOption: () => ({ value: 'pt_BR' }),
    createNewNote: ({ parentNoteId, title, content }) => {
        const nova = notaFake('novo' + (criadas.length + 1), title, content || '');
        criadas.push(nova);
        notas[nova.noteId] = nova;
        return { note: nova };
    },
};

globalThis.api = globalThisApi;
eval(nucleo + '\nglobalThis.CLW = { CLW_BE_INSERT, CLW_BE_TPL, CLW_BE_FLOW, CLW_BE_CARDS, CLW_BE_NEWNOTE, CLW_BE_SYNC, CLW_BE_EDITOR_LOAD, CLW_BE_EDITOR_SAVE, CLW_BE_REMOVE, CLW_BE_REL_PAIRS, CLW_BE_REL_SAVE, CLW_BE_LONGFORM, parseFlowSpec, buildFlowElements, clwOrdenarCards, getCleanPatterns, CARD_CONFIG, FLOW_CONFIG, clwTranslate, clwArrowLabel };');

const C = CLW;

let falhas = 0;
const ok = (nome, cond, extra) => {
    if (cond) console.log('  ✓ ' + nome);
    else { falhas++; console.log('  ✗ ' + nome + (extra !== undefined ? ' → ' + JSON.stringify(extra) : '')); }
};

const labels = { canvasMissing: 'canvas-missing-msg', tplMissing: 'x', tplInvalid: 'x', whereParent: 'x', whereTemplates: 'x' };
const els = () => JSON.parse(canvas.conteudo()).elements;

console.log('\n1) Inserir nota como card');
{
    C.CLW_BE_INSERT('n1', 'n2', 'Nota de teste', '', C.CARD_CONFIG, C.getCleanPatterns(), labels);
    ok('tem retângulo com link', els().some((e) => e.type === 'rectangle' && e.link === '#root/n2'), null);
    ok('tem título', els().some((e) => e.type === 'text' && e.text === 'Nota de teste'), null);
    ok('tem trecho', els().some((e) => e.type === 'text' && /Olá mundo/.test(e.text || '')), null);
}

console.log('\n2) Inserir template (com remapeamento de ids)');
{
    const antes = els().length;
    const n = C.CLW_BE_TPL('n1', 'n3', C.FLOW_CONFIG.marginX, labels);
    const novos = els().slice(antes);
    ok('retornou a contagem', n === 2, n);
    ok('ids remapeados', novos.every((e) => !['r1', 't1'].includes(e.id)), novos.map((e) => e.id));
    ok('referências remapeadas', novos.some((e) => (e.boundElements || []).some((b) => novos.some((x) => x.id === b.id))), null);
}

console.log('\n3) Gerar fluxo pela DSL');
{
    const t = (k, v) => C.clwTranslate('pt', k, v);
    const parsed = C.parseFlowSpec('Início: Começo [inicio]\nAnálise: Verificar [processo]\nInício -> Análise : sim', t);
    ok('DSL sem erros', parsed.errors.length === 0, parsed.errors);
    const { elements } = C.buildFlowElements(parsed.nodes, parsed.edges, 'TB', { x: 0, y: 0 });
    const n = C.CLW_BE_FLOW('n1', elements, C.FLOW_CONFIG.marginX, labels);
    ok('gravou os elementos', n === elements.length, n);
}

console.log('\n4) Listar cards');
{
    const cards = C.CLW_BE_CARDS('n1', labels);
    ok('lista o card vinculado', cards.some((c) => c.noteId === 'n2'), cards);
    ok('traz o título da nota', cards.some((c) => c.title === 'Nota vinculada'), cards);
}

console.log('\n5) Nova nota filha');
{
    const novoId = C.CLW_BE_NEWNOTE('n1', 'Nota nova');
    ok('criou a nota', novoId === 'novo1', novoId);
    ok('título correto', notas[novoId].title === 'Nota nova', notas[novoId].title);
}

console.log('\n6) Sincronizar card (título/trecho a partir da nota)');
{
    vinculada.setContent('<p>Conteúdo atualizado do card.</p>');
    vinculada.title = 'Nota vinculada (v2)';
    const n = C.CLW_BE_SYNC('n1', 'n2', C.CARD_CONFIG, C.getCleanPatterns());
    ok('atualizou 1 card', n === 1, n);
    ok('título novo no canvas', els().some((e) => e.type === 'text' && e.text === 'Nota vinculada (v2)'), null);
    ok('trecho novo no canvas', els().some((e) => e.type === 'text' && /Conteúdo atualizado/.test(e.text || '')), null);
}

console.log('\n7) Editor de card');
{
    const dados = C.CLW_BE_EDITOR_LOAD('n2');
    ok('carregou título', dados.title === 'Nota vinculada (v2)', dados.title);
    ok('carregou conteúdo', /Conteúdo atualizado/.test(dados.content), dados.content);

    C.CLW_BE_EDITOR_SAVE('n2', 'Editada', '<p>Novo conteúdo pelo editor.</p>');
    ok('salvou título', vinculada.title === 'Editada', vinculada.title);
    ok('salvou conteúdo', /Novo conteúdo pelo editor/.test(vinculada.conteudo()), vinculada.conteudo());
}

console.log('\n8) Remover card (soft-delete dos elementos)');
{
    const n = C.CLW_BE_REMOVE('n1', 'n2', labels);
    ok('removeu elementos', n > 0, n);
    const ativos = els().filter((e) => !e.isDeleted);
    ok('não há mais retângulo do n2', !ativos.some((e) => e.type === 'rectangle' && e.link === '#root/n2'), null);
}

console.log('\n9) Relações (pares e salvamento)');
{
    const resultado = C.CLW_BE_REL_PAIRS('n1', labels);
    ok('sem setas → lista vazia', !!resultado && Array.isArray(resultado.pairs) && resultado.pairs.length === 0, resultado);

    const n = C.CLW_BE_REL_SAVE('n1', [{ fromNoteId: 'n2', toNoteId: 'n3', relType: 'inspires', textElId: '', newText: '' }]);
    ok('salvou a relação', n === 1, n);
    ok('addRelation chamado', relacoes.some((r) => r.from === 'n2' && r.nome === 'inspires' && r.valor === 'n3'), relacoes);
}

console.log('\n10) Longform (ordenação por setas/posição)');
{
    const cards = {
        a: 'n2', b: 'n3',
    };
    const pos = { a: { x: 0, y: 100 }, b: { x: 0, y: 0 } };
    const semSetas = C.clwOrdenarCards([], cards, pos);
    ok('sem setas → ordem por posição (y)', semSetas.noteIds[0] === 'n3', semSetas.noteIds);

    const elements = [{
        id: 'arr1', type: 'arrow',
        startBinding: { elementId: 'a' }, endBinding: { elementId: 'b' },
    }];
    const comSeta = C.clwOrdenarCards(elements, cards, pos);
    ok('com seta → segue a seta (a antes de b)', comSeta.noteIds[0] === 'n2', comSeta.noteIds);
    ok('contou a seta', comSeta.arrowCount === 1, comSeta.arrowCount);

    const antes = criadas.length;
    const novoId = C.CLW_BE_LONGFORM('n1', comSeta.noteIds, 'Canvas de teste');
    ok('criou a nota longform', criadas.length === antes + 1, criadas.length);
    const conteudo = notas[novoId].conteudo();
    ok('conteúdo tem os títulos', /Nota vinculada \(v2\)|Editada/.test(conteudo) && /Template/.test(conteudo), conteudo.slice(0, 120));
    ok('título da longform', notas[novoId].title === '📄 Canvas de teste', notas[novoId].title);
}

console.log('\n11) Erro em canvas inexistente');
{
    let erro = null;
    try { C.CLW_BE_FLOW('inexistente', [], 60, labels); } catch (e) { erro = e.message; }
    ok('lança erro com a mensagem do label', erro === 'canvas-missing-msg', erro);
}

console.log('\n12) Rótulo da seta (clwArrowLabel) e atualização do texto');
{
    const t = (k, v) => C.clwTranslate('pt', k, v);
    ok('tipo padrão → rótulo traduzido', C.clwArrowLabel('inspires', t) === t('relation.inspires'), C.clwArrowLabel('inspires', t));
    ok('valor custom volta como está', C.clwArrowLabel('causa', t) === 'causa', C.clwArrowLabel('causa', t));

    const data = JSON.parse(canvas.conteudo());
    data.elements.push({ id: 'txt1', type: 'text', x: 0, y: 0, width: 50, height: 10, text: 'antigo', originalText: 'antigo' });
    canvas.setContent(JSON.stringify(data));
    const n = C.CLW_BE_REL_SAVE('n1', [{
        fromNoteId: 'n2', toNoteId: 'n3', relType: 'inspires',
        textElId: 'txt1', newText: C.clwArrowLabel('inspires', t),
    }], labels);
    ok('salvou a relação com rótulo', n === 1, n);
    const el = JSON.parse(canvas.conteudo()).elements.find((e) => e.id === 'txt1');
    ok('texto da seta atualizado com o rótulo', el && el.text === t('relation.inspires'), el && el.text);
}

console.log('\n13) Template clonado: grupos com ids próprios');
{
    const antes = els().length;
    C.CLW_BE_TPL('n1', 'n3', C.FLOW_CONFIG.marginX, labels);
    const copia1 = els().slice(antes, antes + 2);
    const antes2 = els().length;
    C.CLW_BE_TPL('n1', 'n3', C.FLOW_CONFIG.marginX, labels);
    const copia2 = els().slice(antes2, antes2 + 2);
    const g1 = [...new Set(copia1.flatMap((e) => e.groupIds || []))];
    const g2 = [...new Set(copia2.flatMap((e) => e.groupIds || []))];
    ok('cada cópia tem um grupo próprio', g1.length === 1 && g2.length === 1 && g1[0] !== g2[0], { g1, g2 });
    ok('grupo não é o id original do template', !g1.includes('tg1') && !g2.includes('tg1'), { g1, g2 });
}

console.log('\n14) Sync cria o trecho quando a nota vazia ganha conteúdo');
{
    const vazia = notaFake('n4', 'Nota vazia', '');
    notas.n4 = vazia;
    C.CLW_BE_INSERT('n1', 'n4', 'Nota vazia', '', C.CARD_CONFIG, C.getCleanPatterns(), labels);
    let textos = els().filter((e) => e.type === 'text' && e.text === 'Nota vazia');
    ok('card criado sem trecho (nota vazia)', textos.length === 1, textos.length);

    vazia.setContent('<p>Conteúdo que apareceu depois.</p>');
    C.CLW_BE_SYNC('n1', 'n4', C.CARD_CONFIG, C.getCleanPatterns(), labels);
    textos = els().filter((e) => e.type === 'text' && /Conteúdo que apareceu/.test(e.text || ''));
    ok('sync criou o elemento de trecho', textos.length === 1, textos.length);
}

console.log('\n15) Canvas com JSON corrompido: erro em vez de sobrescrever');
{
    canvas.setContent('isto não é JSON');
    let erro = null;
    try { C.CLW_BE_REMOVE('n1', 'n2', labels); } catch (e) { erro = e.message; }
    ok('lança erro (não sobrescreve)', erro !== null, erro);
    ok('conteúdo do canvas intacto', canvas.conteudo() === 'isto não é JSON', canvas.conteudo());
}

console.log('\n' + (falhas === 0 ? '✅ Todos os testes passaram' : `❌ ${falhas} falha(s)`));
process.exit(falhas === 0 ? 0 : 1);
