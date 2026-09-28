// ============================================================
// test-refs.js — valida o indicador de links internos (@nota):
//   extrairSpanDescricao() (span balanceado) + contarLinksInternos()
// extraindo as funções puras do fonte real (padrão test-fountain-stats.js).
//
// Uso: node test-refs.js  (ou: bun test-refs.js)
// ============================================================
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, 'js-planejador.js'), 'utf8');
const bloco = src.match(/\/\* REFS \(início\)[\s\S]*?\/\* REFS \(fim\) \*\//);
if (!bloco) { console.error('não achei o bloco REFS no js-planejador.js'); process.exit(1); }
eval(bloco[0] + '\nglobalThis.extrairSpanDescricao = extrairSpanDescricao; globalThis.contarLinksInternos = contarLinksInternos;');

let falhas = 0;
const ok = (nome, cond, extra) => {
    if (cond) console.log('  ✓ ' + nome);
    else { falhas++; console.log('  ✗ ' + nome + (extra !== undefined ? ' → ' + JSON.stringify(extra) : '')); }
};

// ── amostras REAIS (extraídas da base do Ricardo) ───────────────────────────
const REAL_SIMPLES = '<input type="checkbox" checked="checked" disabled="disabled">' +
    '<span class="todo-list__label__description">' +
    '<a class="reference-link" href="#root/LCuq6PVnN9TL/VWxAoKFRWRWZ/eqb3BvbssDyh/ZYfZxCrKZBP4">Workana - Prompt mágico - Redator</a>' +
    '</span></label>';

const REAL_ANINHADO = '<input type="checkbox" checked="checked" disabled="disabled">' +
    '<span class="todo-list__label__description">' +
    '<span style="color:hsl(120, 75%, 60%);">&nbsp;Jabuti character sheet -Teaser 2</span>&nbsp;' +
    '<a class="reference-link" href="#root/bWbXL3ytWhqR/DET9Qvd3PUtO/WRmcRsre46zC">Em busca do Céu</a>' +
    '</span></label>';

console.log('1) extrairSpanDescricao (balanceado)');
const inner1 = extrairSpanDescricao(REAL_SIMPLES);
ok('inner contém o link real', inner1.includes('ZYfZxCrKZBP4'), inner1.slice(0, 120));
const inner2 = extrairSpanDescricao(REAL_ANINHADO);
ok('span aninhado não trunca (link depois aparece)', inner2.includes('Em busca do Céu') && inner2.includes('bWbXL3ytWhqR'), inner2.slice(0, 160));
ok('sem span → string vazia', extrairSpanDescricao('texto puro') === '' && extrairSpanDescricao('') === '');

console.log('2) contarLinksInternos (formato real multi-segmento)');
ok('link real simples → 1', contarLinksInternos(inner1) === 1, contarLinksInternos(inner1));
ok('link real após span aninhado → 1', contarLinksInternos(inner2) === 1, contarLinksInternos(inner2));

console.log('3) contagem e dedupe');
const dois = '<a href="#root/a1/b2/c3">A</a> e <a href="#root/x9/y8">B</a>';
ok('dois alvos → 2', contarLinksInternos(dois) === 2, contarLinksInternos(dois));
const dup = '<a href="#root/a1/b2/c3">A</a> <a href="#root/zz/b2/c3">A de novo</a>';
ok('mesmo alvo (último id) → 1', contarLinksInternos(dup) === 1, contarLinksInternos(dup));

console.log('4) ?bookmark= e variações');
ok('?bookmark= ignorado', contarLinksInternos('<a href="#root/a1/b2/c3?bookmark=xyz">X</a>') === 1);
ok('aspas simples OK', contarLinksInternos("<a href='#root/q1/w2'>X</a>") === 1);
ok('link externo ignorado', contarLinksInternos('<a href="https://x.com">X</a>') === 0);
ok('sem links → 0', contarLinksInternos('Só texto') === 0 && contarLinksInternos('') === 0);

console.log('5) integração (span + contagem, como no card)');
const contarTarefa = (html) => contarLinksInternos(extrairSpanDescricao(html) || html);
ok('tarefa real simples → 1', contarTarefa(REAL_SIMPLES) === 1);
ok('tarefa real com aninhado → 1', contarTarefa(REAL_ANINHADO) === 1);
ok('tarefa sem link → 0', contarTarefa('<span class="todo-list__label__description">Só texto</span>') === 0);

console.log(falhas === 0 ? '\n>>> TODOS OS TESTES PASSARAM' : `\n>>> ${falhas} FALHA(S)`);
process.exit(falhas === 0 ? 0 : 1);