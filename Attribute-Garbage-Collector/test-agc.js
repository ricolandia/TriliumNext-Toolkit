// ============================================================
// test-agc.js — testes das funções puras do Attribute-GC
// (auditoria rodada 10: classify, levenshtein, findDupes,
//  paridade i18n PT/EN e guardas estruturais).
//
// As funções vivem no "attribute-gc.js" no top-level; o teste as
// extrai do fonte real por regex.
//
// Uso: bun test-agc.js  (ou: node test-agc.js)
// ============================================================
const fs = require('fs');
const path = require('path');

const ARQUIVO = path.join(__dirname, 'attribute-gc.js');
const src = fs.readFileSync(ARQUIVO, 'utf8');

function extrairFn(nome) {
    const re = new RegExp('function ' + nome + '\\s*\\([\\s\\S]*?\\n}');
    const bloco = src.match(re);
    if (!bloco) { console.error('não achei function ' + nome); process.exit(1); }
    return bloco[0];
}

eval(extrairFn('classify') + '\nglobalThis.classify = classify;');
const iTemp = src.indexOf('const TEMP_RE = ');
const iTempEnd = src.indexOf(';', iTemp);
const TEMP_SRC = src.slice(iTemp + 'const TEMP_RE = '.length, iTempEnd);
// TEMP_SRC é o literal de regex (ex.: /^...$/i) — avaliamos num contexto de regex
const tRe = /^\/([\s\S]*)\/([a-z]*)$/.exec(TEMP_SRC);
if (!tRe) { console.error('não achei TEMP_RE como literal'); process.exit(1); }
globalThis.TEMP_RE = new RegExp(tRe[1], tRe[2]);
eval(extrairFn('lev') + '\nglobalThis.lev = lev;');
eval(extrairFn('findDupes') + '\nglobalThis.findDupes = findDupes;');

// PROT (const SET no topo)
const mProt = src.match(/const PROT = new Set\(\[([\s\S]*?)\]\);/);
if (!mProt) { console.error('não achei PROT'); process.exit(1); }
globalThis.PROT = eval('new Set([' + mProt[1] + '])');

// AG_I18N
const blocoI18n = src.match(/(?:var|const) AG_I18N = (\{[\s\S]*?\n\});/);
if (!blocoI18n) { console.error('não achei AG_I18N'); process.exit(1); }
globalThis.AG_I18N = eval('(' + blocoI18n[1] + ')');

let falhas = 0;
const ok = (nome, cond, extra) => {
    if (cond) console.log('  ✓ ' + nome);
    else { falhas++; console.log('  ✗ ' + nome + (extra !== undefined ? ' → ' + JSON.stringify(extra) : '')); }
};

// ─────────────────────────────────────────────────────────────
console.log('1) classify() — status por uso/saúde');
ok('protegido → sys', classify('template', 'label', 100, 0) === 'sys');
ok('relação toda quebrada → broken', classify('rel', 'relation', 5, 5) === 'broken');
ok('relação parcialmente quebrada → broken', classify('rel', 'relation', 10, 3) === 'broken');
ok('sem uso → unused', classify('foo', 'label', 0, 0) === 'unused');
ok('uso 1 → rare', classify('marca1', 'label', 1, 0) === 'rare');
ok('uso 2 → rare', classify('marca2', 'label', 2, 0) === 'rare');
ok('uso 3 nome normal → ok', classify('nome', 'label', 3, 0) === 'ok');
ok('uso 3 com temp (TESTE_1) → rare', classify('TESTE_1', 'label', 3, 0) === 'rare');
ok('vazio → ok', classify('', 'label', 1, 0) === 'ok');

// ─────────────────────────────────────────────────────────────
console.log('2) lev() — distância de Levenshtein');
ok('iguais → 0', lev('abc','abc') === 0);
ok('1 substituição → 1', lev('pipelne','pipeline') === 1);
ok('vazios → 0', lev('','') === 0);
ok('a vs vazio → len', lev('abc','') === 3);
ok('custo real', lev('kitten','sitting') === 3);

// ─────────────────────────────────────────────────────────────
console.log('3) findDupes() — quase-duplicatas (sem falsos positivos de acento/s)');
// "autor" vs "autores" (letra s era removida → agora NÃO cola por acaso; mas distância real?)
const dupes = findDupes([
    { name:'pipelne', type:'label', status:'rare' },
    { name:'pipeline', type:'label', status:'rare' },
    { name:'status', type:'label', status:'rare' },   // não deve parear com nada
    { name:'case', type:'label', status:'rare' },     // não deve parear com nada
]);
ok('pipeline ≈ pipelne agrupados', dupes.length === 1 && dupes[0].includes('pipelne'));
ok('tipos diferentes não viram dupe', findDupes([
    { name:'abc', type:'label', status:'rare' },
    { name:'abc', type:'relation', status:'rare' },
]).length === 0);
ok('prot não entra', findDupes([
    { name:'template', type:'label', status:'sys' },
    { name:'templat', type:'label', status:'rare' },
]).length === 0);

// ─────────────────────────────────────────────────────────────
console.log('4) AG_I18N — paridade PT/EN');
const chaves = Object.keys(AG_I18N);
ok('tem chaves', chaves.length >= 30);
const semEN = chaves.filter(k => AG_I18N[k].en === undefined);
const semPT = chaves.filter(k => AG_I18N[k].pt === undefined);
ok('todas com EN', semEN.length === 0, semEN);
ok('todas com PT', semPT.length === 0, semPT);

// ─────────────────────────────────────────────────────────────
console.log('5) Guardas estruturais (rodada 10)');
ok('sem confirm() nativo', !/confirm\(['"`]/.test(src));
ok('sem prompt()', !/prompt\(/.test(src));
ok('modal confirmAgc presente', src.includes('function confirmAgc('));
ok('delSingle com confirmação', src.includes('confirmAgc(agTr(\'confirm_s1\')'));
ok('XSS: a.name via .text()', src.includes("$('<span>').text(a.name)"));
ok('bMap chave name::type', src.includes("bMap[r.name + '::' + r.type]"));
ok('classify parcial (bc>0)', src.includes('bc > 0) return \'broken\''));
ok('PROT inclui widget e cover', PROT.has('widget') && PROT.has('cover'));
ok('sort toggle (_sortDir*= -1)', src.includes('_sortDir*=-1'));
ok('renderTable vazio', src.includes("text(agTr('none'))"));
ok('_deleting flag', src.includes('ctx._deleting = true'));
ok('bLog truncado', src.includes('bLog.length > 200'));
ok('i18n tr presente', src.includes('function agTr(') && src.includes('AG_LANG'));
ok('filtro por data-filter', src.includes("$(this).attr('data-filter')===ctx._curFilter"));
ok('type=button em todos', !/\$\('<button>'\)/.test(src));
ok('aria-live no log', src.includes('role="status" aria-live="polite"'));
ok('erro role=alert', src.includes('role="alert"'));
ok('reduced-motion', src.includes('prefers-reduced-motion: reduce'));
ok('cores por token', src.includes('var(--agc-danger') && src.includes('var(--agc-success'));

// ─────────────────────────────────────────────────────────────
console.log('\nResultado: ' + (falhas === 0 ? 'TODOS PASSARAM ✅' : falhas + ' falha(s) ❌'));
process.exit(falhas === 0 ? 0 : 1);