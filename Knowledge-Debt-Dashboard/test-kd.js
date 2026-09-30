// ============================================================
// test-kd.js — testes das funções puras do Knowledge-Dashboard
// (auditoria rodada 9: escaping SQL, dias desde, bytes, total,
//  paridade i18n PT/EN e guardas estruturais).
//
// As funções vivem no "js knowledge.js" no bloco /* KD-PURE */;
// o teste extrai do fonte real e também valida o KD_I18N.
//
// Uso: bun test-kd.js  (ou: node test-kd.js)
// ============================================================
const fs = require('fs');
const path = require('path');

const ARQUIVO = path.join(__dirname, 'Knowledge debt/js knowledge.js');
const src = fs.readFileSync(ARQUIVO, 'utf8');

function extrair(marcador) {
    const re = new RegExp('/\\* ' + marcador + ' \\(início\\)[\\s\\S]*?/\\* ' + marcador + ' \\(fim\\) \\*/');
    const bloco = src.match(re);
    if (!bloco) { console.error('não achei o bloco ' + marcador + ' no fonte'); process.exit(1); }
    return bloco[0];
}

eval(extrair('KD-PURE') + '\nglobalThis.kdSqlList = kdSqlList; globalThis.kdDaysSince = kdDaysSince; globalThis.kdFmtBytes = kdFmtBytes; globalThis.kdCountTotal = kdCountTotal;');

const blocoI18n = src.match(/(?:var|const) KD_I18N = (\{[\s\S]*?\n\});/);
if (!blocoI18n) { console.error('não achei o bloco KD_I18N'); process.exit(1); }
globalThis.KD_I18N = eval('(' + blocoI18n[1] + ')');

let falhas = 0;
const ok = (nome, cond, extra) => {
    if (cond) console.log('  ✓ ' + nome);
    else { falhas++; console.log('  ✗ ' + nome + (extra !== undefined ? ' → ' + JSON.stringify(extra) : '')); }
};

// ─────────────────────────────────────────────────────────────
console.log('1) kdSqlList() — escaping SQL');
ok('aspas simples dobradas', kdSqlList(["a'b"]) === "'a''b'");
ok('lista simples', kdSqlList(['text','code']) === "'text','code'");
ok('vazia', kdSqlList([]) === '');
ok('número vira string', kdSqlList([1]) === "'1'");

// ─────────────────────────────────────────────────────────────
console.log('2) kdDaysSince() — dias desde a data');
const ontem = new Date(Date.now() - 86400000).toISOString();
const h3 = new Date(Date.now() - 3 * 86400000).toISOString();
ok('null → null', kdDaysSince(null) === null);
ok('data inválida → null', kdDaysSince('not-a-date') === null);
ok('ontem → 1', kdDaysSince(ontem) === 1);
ok('3 dias → 3', kdDaysSince(h3) === 3);

// ─────────────────────────────────────────────────────────────
console.log('3) kdFmtBytes() — formatação de tamanho');
ok('null → —', kdFmtBytes(null) === '—');
ok('0 → 0 B', kdFmtBytes(0) === '0 B');
ok('500 → 500 B', kdFmtBytes(500) === '500 B');
ok('2KB → 2.0 KB', kdFmtBytes(2048) === '2.0 KB');
ok('1MB → 1.0 MB', kdFmtBytes(1048576) === '1.0 MB');

// ─────────────────────────────────────────────────────────────
console.log('4) kdCountTotal() — total exclui _tables/typeCounts/errors');
ok('soma só os scans', kdCountTotal({ orphans: [1,2], stubs: [3], _tables: ['a','b'], typeCounts: [{cnt:5}], errors: ['x'] }) === 3);
ok('zero', kdCountTotal({}) === 0);
ok('saudável sem typeCounts inflar', kdCountTotal({ orphans: [], stubs: [], empty: [], todos: [], abandoned: [], pdfs: [], typeCounts: [{cnt:15}] }) === 0);

// ─────────────────────────────────────────────────────────────
console.log('5) KD_I18N — paridade PT/EN');
const chaves = Object.keys(KD_I18N);
ok('tem chaves', chaves.length >= 20);
const semEN = chaves.filter(k => KD_I18N[k].en === undefined);
const semPT = chaves.filter(k => KD_I18N[k].pt === undefined);
ok('todas as chaves têm EN', semEN.length === 0, semEN);
ok('todas as chaves têm PT', semPT.length === 0, semPT);

// ─────────────────────────────────────────────────────────────
console.log('6) Guardas estruturais (rodada 9)');
ok('sem eval no fonte', !/eval\(/.test(src));
ok('runOnBackend com args array (scan)', /\}, \[selfNoteId\]\);/.test(src));
ok('safe() por query (stubs/empty/todos/abandoned/pdfs)', ["safe('stubs'", "safe('empty'", "safe('todos'", "safe('abandoned'", "safe('pdfs'"].every(m => src.includes(m)));
ok('PDFs com NOT_PROTECTED + NOT_ARCHIVED', src.includes('n.isProtected = 0') && src.includes("name = 'archived'"));
ok('NOT_SELF exclui a nota atual', src.includes('NOT_SELF'));
ok('localStorage parse com guarda', src.includes('Array.isArray(v) ? v : []'));
ok('total exclui typeCounts', src.includes("['_tables','typeCounts','errors'].indexOf(k)"));
ok('links com href + preventDefault', src.includes('href="#"') && src.includes('e.preventDefault()'));
ok('stats cards são button', src.includes('<button type="button" class="kd-stat-card">'));
ok('i18n tr() presente', src.includes('function tr(') && src.includes('KD_LANG'));
ok('aria-live no log', src.includes('role="status" aria-live="polite"'));
ok('filtro fantasma limpo na query', src.includes("if (isQuery) { state.search = ''"));
ok('query stale zerada no scan', src.includes('state.data.query = [];'));
ok('foco visível', src.includes(':focus-visible'));
ok('prefers-reduced-motion', src.includes('prefers-reduced-motion: reduce'));
ok('sem confirm()/prompt() nativos', !/confirm\(/.test(src) && !/prompt\(/.test(src));

// ─────────────────────────────────────────────────────────────
console.log('\nResultado: ' + (falhas === 0 ? 'TODOS PASSARAM ✅' : falhas + ' falha(s) ❌'));
process.exit(falhas === 0 ? 0 : 1);