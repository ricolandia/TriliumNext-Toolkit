// ============================================================
// test-wordcount.js — testes das funções puras do Word Counter
// (auditoria rodada 7: contagem com entidades, metas, semântica
//  baseline+delta, poda de storage e guardas estruturais).
//
// As funções vivem no "Word count.js" delimitadas por marcadores
// (WC-PURE, WC-GOAL, WC-PROG, WC-PRUNE); o teste as extrai do
// fonte real.
//
// Uso: bun test-wordcount.js  (ou: node test-wordcount.js)
// ============================================================
const fs = require('fs');
const path = require('path');

const ARQUIVO = path.join(__dirname, 'Word count.js');
const src = fs.readFileSync(ARQUIVO, 'utf8');

function extrair(marcador) {
    const re = new RegExp('/\\* ' + marcador + ' \\(início\\)[\\s\\S]*?/\\* ' + marcador + ' \\(fim\\) \\*/');
    const bloco = src.match(re);
    if (!bloco) { console.error('não achei o bloco ' + marcador + ' no fonte'); process.exit(1); }
    return bloco[0];
}

globalThis.GOAL_MAX = 1000000;
globalThis.DAY_KEEP = 14;
globalThis.WEEK_KEEP = 8;

eval(extrair('WC-PURE') + '\nglobalThis.decodeEntities = decodeEntities; globalThis.htmlToText = htmlToText; globalThis.countWords = countWords; globalThis.countChars = countChars;');
eval(extrair('WC-GOAL') + '\nglobalThis.parseGoalValue = parseGoalValue;');
eval(extrair('WC-PROG') + '\nglobalThis.parseProgressStore = parseProgressStore; globalThis.progressTotal = progressTotal; globalThis.progressApply = progressApply;');
eval(extrair('WC-PRUNE') + '\nglobalThis.pruneOldKeys = pruneOldKeys;');

const blocoI18n = src.match(/const WC_I18N = (\{[\s\S]*?\n\});/);
if (!blocoI18n) { console.error('não achei o bloco WC_I18N'); process.exit(1); }
globalThis.WC_I18N = eval('(' + blocoI18n[1] + ')');

let falhas = 0;
const ok = (nome, cond, extra) => {
    if (cond) console.log('  ✓ ' + nome);
    else { falhas++; console.log('  ✗ ' + nome + (extra !== undefined ? ' → ' + JSON.stringify(extra) : '')); }
};

// ─────────────────────────────────────────────────────────────
console.log('1) decodeEntities()');
ok('&nbsp; vira espaço', decodeEntities('a&nbsp;b') === 'a b');
ok('&amp; e &lt;', decodeEntities('Tom &amp; Jerry &lt;3') === 'Tom & Jerry <3');
ok('numérica &#65;', decodeEntities('&#65;') === 'A');
ok('hex &#x1F600;', decodeEntities('&#x1F600;') === '\u{1F600}');
ok('desconhecida vira espaço', decodeEntities('a&foo;b') === 'a b');
ok('null/undefined não quebram', decodeEntities(null) === '' && decodeEntities(undefined) === '');

// ─────────────────────────────────────────────────────────────
console.log('2) htmlToText()');
ok('remove tags', htmlToText('<p>Olá <b>mundo</b></p>').replace(/\s+/g, ' ').trim() === 'Olá mundo');
ok('preserva "a < b"', htmlToText('<p>a < b</p>').indexOf('a < b') !== -1);
ok('ignora script/style', htmlToText('<style>x{}</style><script>y()</script><p>ok</p>').indexOf('ok') !== -1 && htmlToText('<style>x{}</style>').indexOf('x{}') === -1);
ok('decodifica entidades', htmlToText('<p>a&nbsp;b</p>').indexOf('a b') !== -1);

// ─────────────────────────────────────────────────────────────
console.log('3) countWords()');
ok('duas palavras', countWords('<p>Olá mundo</p>') === 2);
ok('&nbsp; sozinho não conta', countWords('<p>&nbsp;</p>') === 0);
ok('foo&nbsp;bar = 2', countWords('foo&nbsp;bar') === 2);
ok('"a & b" = 2 (o & não é palavra)', countWords('<p>a &amp; b</p>') === 2);
ok('pontuação isolada não conta', countWords('<p>— • |</p>') === 0);
ok('números contam', countWords('<p>123 456</p>') === 2);
ok('CJK = 1', countWords('<p>日本語のテキストです</p>') === 1);
ok('vazio = 0', countWords('') === 0);

// ─────────────────────────────────────────────────────────────
console.log('4) countChars() — com/sem espaços e code points');
ok('sem espaços = 8', countChars('<p>Olá mundo</p>', false) === 8);
ok('com espaços = 9', countChars('<p>Olá mundo</p>', true) === 9);
ok('&nbsp; não vira 6 chars', countChars('foo&nbsp;bar', false) === 6 && countChars('foo&nbsp;bar', true) === 7);
ok('parágrafo vazio = 0', countChars('<p>&nbsp;</p>', false) === 0 && countChars('<p>&nbsp;</p>', true) === 0);
ok('emoji = 1 code point', countChars('😀', true) === 1);

// ─────────────────────────────────────────────────────────────
console.log('5) parseGoalValue()');
ok('"500" → 500', parseGoalValue('500', 42) === 500);
ok('"0"/"-5"/"abc" → fallback', parseGoalValue('0', 42) === 42 && parseGoalValue('-5', 42) === 42 && parseGoalValue('abc', 42) === 42);
ok('"12.5" → 12', parseGoalValue('12.5', 42) === 12);
ok('teto GOAL_MAX', parseGoalValue('99999999', 42) === GOAL_MAX);
ok('null/vazio → fallback', parseGoalValue(null, 42) === 42 && parseGoalValue('  ', 42) === 42);

// ─────────────────────────────────────────────────────────────
console.log('6) parseProgressStore() — v2 + legado + corrompido');
const v2 = parseProgressStore(JSON.stringify({ v: 2, notes: { n1: { delta: 120, last: 300 }, n2: { delta: 'x', last: null } } }));
ok('v2 lê delta/last', v2.notes.n1.delta === 120 && v2.notes.n1.last === 300);
ok('v2 saneia inválidos', v2.notes.n2.delta === 0 && v2.notes.n2.last === null);
const legacy = parseProgressStore(JSON.stringify({ n1: 500, n2: 'abc', n3: -20 }));
ok('legado vira delta com last nulo', legacy.notes.n1.delta === 500 && legacy.notes.n1.last === null);
ok('legado descarta lixo', !legacy.notes.n2 && !legacy.notes.n3);
ok('corrompido/array → null', parseProgressStore('lixo') === null && parseProgressStore('[1,2]') === null && parseProgressStore('null') === null);

// ─────────────────────────────────────────────────────────────
console.log('7) progressApply() — baseline + delta');
let store = { v: 2, notes: {} };
progressApply(store, 'n1', 200);
ok('1ª leitura = baseline (delta 0)', store.notes.n1.delta === 0 && store.notes.n1.last === 200);
progressApply(store, 'n1', 260);
ok('crescimento soma delta', store.notes.n1.delta === 60 && store.notes.n1.last === 260);
progressApply(store, 'n1', 210);
ok('reduzir reancora sem débito', store.notes.n1.delta === 60 && store.notes.n1.last === 210);
progressApply(store, 'n1', 230);
ok('crescer de novo soma', store.notes.n1.delta === 80);
progressApply(store, 'n2', 9999);
ok('outra nota: baseline não credita', progressTotal(store) === 80);

// ─────────────────────────────────────────────────────────────
console.log('8) pruneOldKeys()');
const removidas = pruneOldKeys(
    ['wc-2026-09-10', 'wc-2026-09-20', 'wcw-2026-20', 'wcw-2026-38', 'wcw-2025-50', 'outra-chave', 'wc-x'],
    '2026-09-29', 2026, 40
);
ok('remove dia antigo (>14d)', removidas.indexOf('wc-2026-09-10') !== -1);
ok('mantém dia recente', removidas.indexOf('wc-2026-09-20') === -1);
ok('remove semana antiga', removidas.indexOf('wcw-2026-20') !== -1 && removidas.indexOf('wcw-2025-50') !== -1);
ok('mantém semana recente e outras chaves', removidas.indexOf('wcw-2026-38') === -1 && removidas.indexOf('outra-chave') === -1 && removidas.indexOf('wc-x') === -1);

// ─────────────────────────────────────────────────────────────
console.log('9) guardas estruturais (regressões da rodada 7)');
ok('sem getNoteComplement (deprecado)', src.indexOf('getNoteComplement') === -1 && src.indexOf('await this.note.getContent()') !== -1);
ok('evento com guarda isEnabled', src.indexOf('async entitiesReloadedEvent') !== -1 && src.indexOf('if (!this.isEnabled()) return;') !== -1);
ok('corrida do noteId protegida', src.indexOf('this.note.noteId !== noteId') !== -1);
ok('localStorage só pelos helpers', (src.match(/localStorage\.setItem/g) || []).length === 1 && (src.match(/localStorage\.getItem/g) || []).length === 1);
ok('sem locale fixo pt-BR', src.indexOf("toLocaleString('pt-BR')") === -1 && src.indexOf("toLocaleString(_lang === 'en' ? 'en-US' : 'pt-BR')") !== -1);
ok('barras com role=progressbar', (src.match(/role="progressbar"/g) || []).length === 2);
ok('fill sem token de fundo (contraste)', src.indexOf('accented-background-color') === -1 && src.indexOf('.wc-fill { height: 100%; border-radius: 3px; background: var(--main-text-color)') !== -1);
ok('reduced-motion presente', src.indexOf('prefers-reduced-motion') !== -1);
ok('contagem via htmlToText', src.indexOf('const tokens = htmlToText(html)') !== -1 && src.indexOf('const texto = htmlToText(html)') !== -1);

// ─────────────────────────────────────────────────────────────
console.log('10) i18n — paridade PT/EN');
const pt = Object.keys(WC_I18N.pt).sort();
const en = Object.keys(WC_I18N.en).sort();
const faltamEn = pt.filter((k) => !(k in WC_I18N.en));
const sobramEn = en.filter((k) => !(k in WC_I18N.pt));
ok('mesmas chaves em PT e EN (' + pt.length + ')', faltamEn.length === 0 && sobramEn.length === 0, { faltamEn, sobramEn });
ok('nenhum valor vazio', pt.every((k) => WC_I18N.pt[k].length > 0 && WC_I18N.en[k].length > 0));

// ─────────────────────────────────────────────────────────────
console.log('');
if (falhas) { console.log(falhas + ' falha(s)'); process.exit(1); }
console.log('todas as asserções passaram');
