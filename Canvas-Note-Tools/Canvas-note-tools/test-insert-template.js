// Testes do backend "Insert template" (CLW-BE-TPL) — sem Trilium, com stubs de `api`.
//
// Cobre o residual CT15-Q14: o z-order dos elementos inseridos precisa começar
// DEPOIS do maior índice já existente no canvas (antes começava em a00 e empatava
// com o conteúdo já posto) e o `appState` do template vale quando o canvas está vazio.
//
//   node test-insert-template.js
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'Canvas tools v8.js');
const src = fs.readFileSync(file, 'utf8');

const ini = '/* CLW-BE-TPL-START */';
const fim = '/* CLW-BE-TPL-END */';
const i = src.indexOf(ini);
const f = src.indexOf(fim);
if (i < 0 || f < 0) {
    console.error('Marcadores CLW-BE-TPL não encontrados');
    process.exit(1);
}
const bloco = src.slice(i + ini.length, f).replace(/,?\s*$/, '');
const compila = (api) => new Function('api', 'return (' + bloco + ')')(api);

let fails = 0;
const check = (nome, cond, extra = '') => {
    console.log(`${cond ? '✅' : '❌'} ${nome}${extra ? ' — ' + extra : ''}`);
    if (!cond) fails++;
};

// nota falsa: getContent/setContent em memória
function nota(id, content) {
    return { noteId: id, _c: content, getContent() { return this._c; }, setContent(v) { this._c = v; } };
}

const L = { canvasMissing: 'sem canvas', tplMissing: 'sem template', canvasJson: 'json', tplInvalid: 'tpl' };
const A = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const num = (idx) => {
    const m = /^a(.)(.)$/.exec(idx);
    return m ? A.indexOf(m[1]) * A.length + A.indexOf(m[2]) : -1;
};

const TPL = {
    type: 'excalidraw',
    version: 2,
    appState: { viewBackgroundColor: '#fff8e8', gridSize: 37, gridStep: 37, zoom: { value: 0.5 }, scrollX: 12, scrollY: 34, currentItemStrokeColor: '#ff0000' },
    elements: [
        { id: 'r1', type: 'rectangle', x: 0, y: 0, width: 100, height: 50, index: 'a05', groupIds: ['g1'], strokeColor: '#000', backgroundColor: '#fff', boundElements: [{ id: 't1', type: 'text' }], frameId: null, seed: 1, versionNonce: 1, updated: 0 },
        { id: 't1', type: 'text', x: 4, y: 6, width: 90, height: 20, index: 'a06', containerId: 'r1', groupIds: ['g1'], text: 'OKR', strokeColor: '#000', backgroundColor: 'transparent', boundElements: [], seed: 2, versionNonce: 2, updated: 0 },
        { id: 'a1', type: 'arrow', x: 0, y: 60, width: 80, height: 0, index: 'a07', groupIds: [], startBinding: { elementId: 'r1' }, endBinding: { elementId: 'r1' }, strokeColor: '#000', backgroundColor: 'transparent', seed: 3, versionNonce: 3, updated: 0 },
        { id: 'x1', type: 'rectangle', x: 0, y: 0, width: 10, height: 10, isDeleted: true, index: 'a08', seed: 4, versionNonce: 4, updated: 0 },
    ],
};

// ---------------------------------------------------------------- 1. canvas vazio
{
    const canvas = nota('c1', '');
    const api = { getNote: (id) => (id === 'c1' ? canvas : id === 't1' ? nota('t1', JSON.stringify(TPL)) : null) };
    const run = compila(api);

    const n = run('c1', 't1', 60, L);
    const out = JSON.parse(canvas.getContent());
    const novos = out.elements.slice();

    check('vazio: insere os elementos vivos (isDeleted fora)', n === 3 && novos.length === 3, `n=${n} len=${novos.length}`);
    const idxs = novos.map((e) => e.index);
    check('vazio: índices começam em a00', idxs[0] === 'a00', idxs.join(','));
    check('vazio: índices estritamente crescentes', idxs.every((v, k) => k === 0 || num(v) === num(idxs[k - 1]) + 1), idxs.join(','));
    const ap = out.appState || {};
    const zoom = ap.zoom || {};
    check('vazio: appState do template adotado (fundo/grid/zoom/scroll)', ap.viewBackgroundColor === '#fff8e8' && ap.gridSize === 37 && zoom.value === 0.5 && ap.scrollX === 12 && ap.scrollY === 34);
    check('vazio: currentItemStrokeColor (cor de desenho do usuário) NÃO é copiado', ap.currentItemStrokeColor === undefined);
    check('vazio: x/y preservados (dx=dy=0)', novos[0].x === 0 && novos[0].y === 0);
    check('vazio: ids remapeados', novos.every((e) => e.id !== 'r1' && e.id !== 't1' && e.id !== 'a1'), novos.map((e) => e.id).join(','));
    const ids = novos.map((e) => e.id);
    check('vazio: containerId aponta para o clone do retângulo', ids.includes(novos[1].containerId));
    check('vazio: boundElements aponta para o clone do texto', novos[0].boundElements[0].id === novos[1].id);
    check('vazio: startBinding/endBinding remapeados', novos[2].startBinding.elementId === novos[0].id && novos[2].endBinding.elementId === novos[0].id);
    check('vazio: groupIds remapeados (e iguais entre si)', novos[0].groupIds[0] === novos[1].groupIds[0] && novos[0].groupIds[0] !== 'g1', novos[0].groupIds[0]);
    check('vazio: seed/versionNonce/updated novos', novos[0].seed !== 1 && novos[0].versionNonce !== 1 && novos[0].updated > 0);
}

// ------------------------------------------------- 2. canvas com conteúdo (a05/a06)
{
    const jaTem = [
        { id: 'old1', type: 'rectangle', x: 0, y: 0, width: 200, height: 100, index: 'a04', seed: 9, versionNonce: 9, updated: 1 },
        { id: 'old2', type: 'rectangle', x: 0, y: 200, width: 200, height: 100, index: 'a06', seed: 9, versionNonce: 9, updated: 1 },
    ];
    const canvas = nota('c2', JSON.stringify({ type: 'excalidraw', version: 2, appState: { viewBackgroundColor: '#ffffff', gridSize: 20, gridStep: 20 }, elements: jaTem }));
    const api = { getNote: (id) => (id === 'c2' ? canvas : id === 't1' ? nota('t1', JSON.stringify(TPL)) : null) };
    const run = compila(api);

    const n = run('c2', 't1', 60, L);
    const out = JSON.parse(canvas.getContent());
    const novos = out.elements.slice(-3);

    check('com conteúdo: insere os 3', n === 3);
    check('com conteúdo: primeiro índice vem DEPOIS do maior existente (a07)', novos[0].index === 'a07', novos.map((e) => e.index).join(','));
    check('com conteúdo: crescentes e sem empate com o que já existia', novos.every((e, k) => k === 0 || num(e.index) === num(novos[k - 1].index) + 1) && novos.every((e) => !jaTem.some((o) => o.index === e.index)));
    check('com conteúdo: appState do canvas preservado', out.appState.viewBackgroundColor === '#ffffff' && out.appState.gridSize === 20);
    check('com conteúdo: deslocado para a direita (maxX + margin)', novos[0].x === 200 + 60, `x=${novos[0].x}`);
    check('com conteúdo: y alinhado ao topo do conteúdo', novos[0].y === 0);
    check('com conteúdo: nada perdido no canvas', out.elements.length === 5);
}

// ------------------------------------------------------------- 3. duas inserções
{
    const canvas = nota('c3', JSON.stringify({ type: 'excalidraw', version: 2, appState: {}, elements: [] }));
    const api = { getNote: (id) => (id === 'c3' ? canvas : id === 't1' ? nota('t1', JSON.stringify(TPL)) : null) };
    const run = compila(api);

    run('c3', 't1', 60, L);
    run('c3', 't1', 60, L);
    const els = JSON.parse(canvas.getContent()).elements;
    const idxs = els.map((e) => e.index);
    check('duas vezes: 6 elementos', els.length === 6);
    check('duas vezes: sem índice repetido', new Set(idxs).size === 6, idxs.join(','));
    check('duas vezes: ordem crescente geral', idxs.every((v, k) => k === 0 || num(v) > num(idxs[k - 1])));
    check('duas vezes: ids todos únicos', new Set(els.map((e) => e.id)).size === 6);
}

// ----------------------------------------------------------- 4. template inválido
{
    const canvas = nota('c4', '');
    const api = { getNote: (id) => (id === 'c4' ? canvas : id === 'bad' ? nota('bad', '{nope') : null) };
    const run = compila(api);
    let erro = null;
    try { run('c4', 'bad', 60, L); } catch (e) { erro = e.message; }
    check('template inválido: lança erro (não grava lixo)', !!erro && canvas.getContent() === '', String(erro));
}

// ------------------------------------------- 5. pack real (se estiver ao lado)
{
    const dir = path.join(__dirname, '..', '..', 'Canvas-Templates', 'Canvas-templates');
    const alvo = fs.existsSync(dir)
        ? require('child_process').execSync(`find '${dir}' -name 'Template - OKR.json'`).toString().trim().split('\n')[0]
        : null;
    if (alvo) {
        const real = JSON.parse(fs.readFileSync(alvo, 'utf8'));
        const canvas = nota('c5', '');
        const api = { getNote: (id) => (id === 'c5' ? canvas : id === 'tpl' ? nota('tpl', JSON.stringify(real)) : null) };
        const run = compila(api);
        const n = run('c5', 'tpl', 60, L);
        const out = JSON.parse(canvas.getContent());
        const vivos = real.elements.filter((e) => !e.isDeleted).length;
        check('pack OKR: insere todos os vivos', n === vivos, `n=${n} vivos=${vivos}`);
        check('pack OKR: appState do pack adotado', out.appState.viewBackgroundColor === real.appState.viewBackgroundColor && out.appState.gridSize === real.appState.gridSize);
        const idxs = out.elements.map((e) => e.index);
        check('pack OKR: índices crescentes sem buraco', idxs.every((v, k) => k === 0 || num(v) === num(idxs[k - 1]) + 1));
    } else {
        console.log('ℹ️  pack Canvas-Templates não encontrado ao lado — pulando o caso do OKR');
    }
}

console.log(fails ? `\n${fails} falha(s)` : '\nTudo ok');
process.exit(fails ? 1 : 0);
