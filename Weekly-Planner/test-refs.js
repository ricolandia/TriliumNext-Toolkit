// ============================================================
// test-refs.js — valida contarLinksDaNota() (badge 🔗 n nos cards):
// conta links internos ÚNICOS da NOTA (não da linha da tarefa).
// A função vive no callback backend, delimitada por marcadores
// REFS-BE (início/fim); o teste a extrai do fonte real.
//
// Uso: node test-refs.js  (ou: bun test-refs.js)
// ============================================================
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, 'js-planejador.js'), 'utf8');
const bloco = src.match(/\/\* REFS-BE \(início\)[\s\S]*?\/\* REFS-BE \(fim\) \*\//);
if (!bloco) { console.error('não achei o bloco REFS-BE no js-planejador.js'); process.exit(1); }
eval(bloco[0] + '\nglobalThis.contarLinksDaNota = contarLinksDaNota;');

let falhas = 0;
const ok = (nome, cond, extra) => {
    if (cond) console.log('  ✓ ' + nome);
    else { falhas++; console.log('  ✗ ' + nome + (extra !== undefined ? ' → ' + JSON.stringify(extra) : '')); }
};

// ── fixture REAL: trecho da nota diária do Ricardo (3 links de projetos) ────
const NOTA_REAL = `
<table><tbody><tr>
<td><h3><a class="reference-link" href="#root/L84YPic0h0Se/vYHHgwRrR6Kc">Faculdade</a></h3></td>
<td><h3><a class="reference-link" href="#root/bWbXL3ytWhqR/DET9Qvd3PUtO">Freela</a></h3></td>
<td><h3><a class="reference-link" href="#root/bWbXL3ytWhqR/WGycD5ksCshb">Autorais</a></h3></td>
</tr><tr><td><ul><li>Editar vídeo</li></ul></td><td></td><td></td></tr></tbody></table>
<h2>Tarefas do Dia</h2>
<ul class="todo-list"><li><label class="todo-list__label"><input type="checkbox" disabled="disabled">
<span class="todo-list__label__description">Cancela google <span style="color:hsl(30,75%,60%);">#todo</span></span></label></li></ul>
`;

console.log('1) nota real (tabela de projetos) → 3 alvos únicos');
ok('conta 3', contarLinksDaNota(NOTA_REAL) === 3, contarLinksDaNota(NOTA_REAL));

console.log('2) formato real multi-segmento');
const UM = '<a class="reference-link" href="#root/LCuq6PVnN9TL/VWxAoKFRWRWZ/eqb3BvbssDyh/ZYfZxCrKZBP4">Workana</a>';
ok('um link → 1', contarLinksDaNota(UM) === 1, contarLinksDaNota(UM));

console.log('3) dedupe por alvo (último segmento)');
const DUP = '<a href="#root/a1/b2/c3">A</a> <a href="#root/zz/b2/c3">A de novo</a> <a href="#root/x9/y8">B</a>';
ok('mesmo alvo repetido conta 1; dois alvos → 2', contarLinksDaNota(DUP) === 2, contarLinksDaNota(DUP));

console.log('4) ?bookmark= e variações');
ok('?bookmark= ignorado', contarLinksDaNota('<a href="#root/a1/b2/c3?bookmark=xyz">X</a>') === 1);
ok('aspas simples OK', contarLinksDaNota("<a href='#root/q1/w2'>X</a>") === 1);
ok('link externo ignorado', contarLinksDaNota('<a href="https://x.com">X</a>') === 0);

console.log('5) casos vazios');
ok('nota sem links → 0', contarLinksDaNota('<p>Só texto e checkboxes</p>') === 0);
ok('vazio/null → 0', contarLinksDaNota('') === 0 && contarLinksDaNota(null) === 0);

console.log(falhas === 0 ? '\n>>> TODOS OS TESTES PASSARAM' : `\n>>> ${falhas} FALHA(S)`);
process.exit(falhas === 0 ? 0 : 1);