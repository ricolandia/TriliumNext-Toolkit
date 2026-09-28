// ============================================================
// test-refs.js — valida extrairRefs() (chips de @nota nos cards)
// extraindo a função pura do fonte real (padrão test-fountain-stats.js).
//
// Uso: node test-refs.js  (ou: bun test-refs.js)
// ============================================================
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, 'js-planejador.js'), 'utf8');
const bloco = src.match(/\/\* REFS \(início\)[\s\S]*?\/\* REFS \(fim\) \*\//);
if (!bloco) { console.error('não achei o bloco REFS no js-planejador.js'); process.exit(1); }
eval(bloco[0] + '\nglobalThis.extrairRefs = extrairRefs;');

let falhas = 0;
const ok = (nome, cond, extra) => {
    if (cond) console.log('  ✓ ' + nome);
    else { falhas++; console.log('  ✗ ' + nome + (extra !== undefined ? ' → ' + JSON.stringify(extra) : '')); }
};

console.log('1) link único (@nota)');
const r1 = extrairRefs('Revisar proposta <a class="reference-link" href="#root/abc123XYZ">Projeto Aurora</a> até sexta');
ok('extrai 1 ref', r1.length === 1, r1);
ok('noteId correto', r1[0] && r1[0].noteId === 'abc123XYZ', r1);
ok('título correto', r1[0] && r1[0].title === 'Projeto Aurora', r1);

console.log('2) vários links (ordem preservada)');
const r2 = extrairRefs('<a href="#root/aaa111">Projeto A</a> e <a href="#root/bbb222">Projeto B</a>');
ok('extrai 2 refs', r2.length === 2, r2);
ok('ordem preservada', r2[0].noteId === 'aaa111' && r2[1].noteId === 'bbb222', r2);

console.log('3) dedupe por noteId');
const r3 = extrairRefs('<a href="#root/aaa111">A</a> <a href="#root/aaa111">A de novo</a>');
ok('deduplica', r3.length === 1, r3);

console.log('4) rótulo com HTML e entidades');
const r4 = extrairRefs('<a href="#root/ccc333"><strong>Projeto</strong> &amp; Cia&nbsp;X</a>');
ok('limpa tags e entidades', r4[0] && r4[0].title === 'Projeto & Cia X', r4);

console.log('5) casos sem link');
ok('texto puro → []', extrairRefs('Só texto').length === 0);
ok('link externo ignorado', extrairRefs('<a href="https://x.com">X</a>').length === 0);
ok('href não-#root ignorado', extrairRefs('<a href="#notaX">X</a>').length === 0);
ok('vazio/null → []', extrairRefs('').length === 0 && extrairRefs(null).length === 0);

console.log('6) aspas simples');
const r6 = extrairRefs("<a href='#root/ddd444'>D</a>");
ok('aceita href com aspas simples', r6.length === 1 && r6[0].noteId === 'ddd444', r6);

console.log(falhas === 0 ? '\n>>> TODOS OS TESTES PASSARAM' : `\n>>> ${falhas} FALHA(S)`);
process.exit(falhas === 0 ? 0 : 1);