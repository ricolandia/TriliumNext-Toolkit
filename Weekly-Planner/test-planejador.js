// ============================================================
// test-planejador.js — testes das funções puras do Weekly Planner
// (batch 1 da auditoria: marcarCheckbox, recorrentes, esc)
//
// As funções vivem no js-planejador.js delimitadas por marcadores
// (MARCAR-BE, REC-BE, ESC); o teste as extrai do fonte real.
//
// Uso: bun test-planejador.js  (ou: node test-planejador.js)
// ============================================================
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, 'js-planejador.js'), 'utf8');

function extrair(marcador) {
    const re = new RegExp('/\\* ' + marcador + ' \\(início\\)[\\s\\S]*?/\\* ' + marcador + ' \\(fim\\) \\*/');
    const bloco = src.match(re);
    if (!bloco) { console.error('não achei o bloco ' + marcador + ' no js-planejador.js'); process.exit(1); }
    return bloco[0];
}

eval(extrair('ESC') + '\nglobalThis.esc = esc;');
eval(extrair('MARCAR-BE') + '\nglobalThis.marcarCheckbox = marcarCheckbox;');
eval(extrair('REC-BE') + '\nglobalThis.expandRecurringInContent = expandRecurringInContent;');

let falhas = 0;
const ok = (nome, cond, extra) => {
    if (cond) console.log('  ✓ ' + nome);
    else { falhas++; console.log('  ✗ ' + nome + (extra !== undefined ? ' → ' + JSON.stringify(extra) : '')); }
};

// ─────────────────────────────────────────────────────────────
console.log('1) esc() cobre aspas simples e duplas');
ok('aspas duplas', esc('a "b"') === 'a &quot;b&quot;');
ok("aspas simples", esc("a 'b'") === 'a &#39;b&#39;');
ok('tags e &', esc('<b>&</b>') === '&lt;b&gt;&amp;&lt;/b&gt;');
ok('null/undefined viram string (sem quebrar)', esc(null) === 'null' && esc(undefined) === 'undefined');

// ─────────────────────────────────────────────────────────────
console.log('2) marcarCheckbox() — mesma regex da extração');
const NOTA = `
<ul><li><input disabled="disabled" type="checkbox"><span>T1</span></li>
<li><input type='checkbox'><span>T2</span></li>
<li><input type="checkbox" checked><span>T3</span></li></ul>`;

const r0 = marcarCheckbox(NOTA, 0);
ok('marca atributo fora de ordem (disabled antes de type)', r0.html.includes('<input checked disabled="disabled" type="checkbox">'), r0.html.slice(0, 90));
ok('índice 2 já marcado → não duplica checked', (r0.html.match(/checked/gi) || []).length === 2);

const r1 = marcarCheckbox(NOTA, 1);
ok("marca aspas simples (índice 1)", r1.html.includes("<input checked type='checkbox'>"), r1.html.slice(0, 140));

const rFora = marcarCheckbox(NOTA, 9);
ok('índice fora do range → found=false e html intacto', rFora.found === false && rFora.html === NOTA);

// ─────────────────────────────────────────────────────────────
console.log('3) expandRecurringInContent() — caso base');
const TAREFA = `<ul class="todo-list"><li data-list-item-id="abc"><label class="todo-list__label"><input type="checkbox" disabled="disabled"><span class="todo-list__label__description">Revisar senhas #every=7d #total=3 #upto=01-01-2026</span></label></li></ul>`;
const exp = expandRecurringInContent(TAREFA, 'notaX');
ok('gera 2 clones', exp.generated.length === 2, exp.generated);
ok('datas +7d e +14d', exp.generated.map(g => g.date).join(',') === '2026-01-08,2026-01-15', exp.generated.map(g => g.date));
ok('original perde #every/#total', !exp.html.split('</li>')[0].includes('#every') && !exp.html.split('</li>')[0].includes('#total'));
ok('clones têm #upto novo (MM-DD-YYYY) e sem #every', exp.html.includes('#upto=01-08-2026') && exp.html.includes('#upto=01-15-2026') && !exp.html.includes('#every'));
ok('idempotente: rodar de novo não gera nada', expandRecurringInContent(exp.html, 'notaX').generated.length === 0);

console.log('4) expandRecurringInContent() — travas e validações');
const semExp = (texto) => {
    const html = TAREFA.replace('#every=7d #total=3 #upto=01-01-2026', texto);
    return expandRecurringInContent(html, 'notaX').generated.length === 0;
};
ok('#every=0d não expande', semExp('#every=0d #total=3 #upto=01-01-2026'));
ok('#total=200 (acima do teto de 100) não expande', semExp('#every=7d #total=200 #upto=01-01-2026'));
ok('#total=2x não casa (\\b)', semExp('#every=7d #total=2x #upto=01-01-2026'));
const ru = expandRecurringInContent(TAREFA.replace('#upto=01-01-2026', '#upto=99-99-2026'), 'notaX');
ok('data impossível cai para hoje (sem NaN)', ru.generated.length === 2 && ru.generated.every(g => /^\d{4}-\d{2}-\d{2}$/.test(g.date)), ru.generated);
const b2 = expandRecurringInContent(TAREFA.replace('#total=3', '#total=2'), 'notaX');
ok('#total=2 (limite válido) expande 1 clone', b2.generated.length === 1, b2.generated);

console.log(falhas === 0 ? '\n>>> TODOS OS TESTES PASSARAM' : `\n>>> ${falhas} FALHA(S)`);
process.exit(falhas === 0 ? 0 : 1);