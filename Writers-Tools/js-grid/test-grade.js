// ============================================================
// test-grade.js — funções puras/isoláveis do Longform Compiler
// Extrai as funções do fonte real de "js - grade.js" e valida
// também o escopo do CSS (classes lg-* dentro de #lg-root).
//
// Uso: bun test-grade.js
// ============================================================
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, 'js - grade.js'), 'utf8');

function extrairFuncao(nome) {
    const m = src.match(new RegExp(`function ${nome}\\([^)]*\\) \\{[\\s\\S]*?\\n\\}`, 'm'));
    if (!m) throw new Error('não achei ' + nome);
    return m[0];
}

// Stub do api do Trilium (as funções conversam com ele em runtime)
const chamadas = { openTab: [], activate: [], mensagens: [] };
globalThis.api = {
    openTabWithNote: (id, flag) => chamadas.openTab.push([id, flag]),
    activateNote: (id) => chamadas.activate.push(id),
    showMessage: (msg) => chamadas.mensagens.push(msg),
};

// Bloco de i18n (consts + tr/lgPlural/lgCultura) extraído por marcadores
const i18nBloco = src.slice(src.indexOf('const LG_I18N = {'), src.indexOf('function escaparHtml'));
if (!i18nBloco.includes('function tr(')) throw new Error('não achei o bloco de i18n');

eval(
    i18nBloco + '\n' +
    extrairFuncao('escaparHtml') + '\n' +
    extrairFuncao('contarPalavras') + '\n' +
    extrairFuncao('avisar') + '\n' +
    extrairFuncao('sanitizarHtml') + '\n' +
    extrairFuncao('ehNotaDeScript') + '\n' +
    extrairFuncao('ehCompilado') + '\n' +
    extrairFuncao('abrirNota') + '\n' +
    'globalThis.tr = tr; globalThis.lgPlural = lgPlural; globalThis.lgCultura = lgCultura;' +
    'globalThis.escaparHtml = escaparHtml; globalThis.contarPalavras = contarPalavras;' +
    'globalThis.avisar = avisar; globalThis.sanitizarHtml = sanitizarHtml;' +
    'globalThis.ehNotaDeScript = ehNotaDeScript;' +
    'globalThis.ehCompilado = ehCompilado; globalThis.abrirNota = abrirNota;'
);

let falhas = 0;
const ok = (nome, cond, extra) => {
    if (cond) console.log('  ✓ ' + nome);
    else { falhas++; console.log('  ✗ ' + nome + (extra !== undefined ? ' → ' + JSON.stringify(extra) : '')); }
};

console.log('1) escaparHtml');
ok('escapa & < >', escaparHtml('<b>Olá & "mundo"</b>') === '&lt;b&gt;Olá &amp; &quot;mundo&quot;&lt;/b&gt;',
    escaparHtml('<b>Olá & "mundo"</b>'));
ok('escapa aspas duplas (atributo title)', escaparHtml('a" onmouseover="x') === 'a&quot; onmouseover=&quot;x', escaparHtml('a" onmouseover="x'));
ok('escapa aspas simples', escaparHtml("d'água") === 'd&#39;água', escaparHtml("d'água"));
ok('null → ""', escaparHtml(null) === '', escaparHtml(null));
ok('undefined → ""', escaparHtml(undefined) === '', escaparHtml(undefined));
ok('0 → "0"', escaparHtml(0) === '0', escaparHtml(0));

console.log('\n2) contarPalavras');
ok('"" → 0', contarPalavras('') === 0);
ok('só espaços → 0', contarPalavras('   \n\t ') === 0);
ok('"uma duas três" → 3', contarPalavras('uma duas três') === 3);
ok('quebras de linha contam como separador', contarPalavras('linha\ncom\nquebras') === 3);
ok('null → 0', contarPalavras(null) === 0);

console.log('\n3) ehNotaDeScript');
ok('mime javascript → true', ehNotaDeScript({ mime: 'application/javascript;env=frontend' }) === true);
ok('mime text/css → true', ehNotaDeScript({ mime: 'text/css' }) === true);
ok('mime Text/CSS (case-insensitive) → true', ehNotaDeScript({ mime: 'Text/CSS' }) === true);
ok('mime text/html → false', ehNotaDeScript({ mime: 'text/html' }) === false);
ok('nota sem mime → false', ehNotaDeScript({}) === false);

console.log('\n4) ehCompilado');
ok('com #compiledDoc → true', ehCompilado({ hasLabel: (l) => l === 'compiledDoc' }) === true);
ok('sem #compiledDoc → false', ehCompilado({ hasLabel: () => false }) === false);

console.log('\n4b) sanitizarHtml (notas do compilado)');
ok('remove <script>…</script>', !sanitizarHtml('<p>ok</p><script>alert(1)</script>').includes('<script'),
    sanitizarHtml('<p>ok</p><script>alert(1)</script>'));
ok('remove <script src>', !sanitizarHtml('<script src="x.js"></script>').includes('script'));
ok('remove atributo on*', !sanitizarHtml('<img src=x onerror="alert(1)">').includes('onerror'),
    sanitizarHtml('<img src=x onerror="alert(1)">'));
ok('neutraliza javascript: em href', !/javascript:/i.test(sanitizarHtml('<a href="javascript:alert(1)">x</a>')),
    sanitizarHtml('<a href="javascript:alert(1)">x</a>'));
ok('preserva HTML normal', sanitizarHtml('<p>texto <b>forte</b></p>') === '<p>texto <b>forte</b></p>',
    sanitizarHtml('<p>texto <b>forte</b></p>'));

console.log('\n5) avisar e abrirNota (api stubado)');
avisar('teste');
ok('avisar chama api.showMessage', chamadas.mensagens[0] === 'teste', chamadas.mensagens);

chamadas.openTab = []; chamadas.activate = [];
abrirNota('ABC');
ok('abrirNota usa openTabWithNote(id, true)', JSON.stringify(chamadas.openTab[0]) === JSON.stringify(['ABC', true]), chamadas.openTab);
ok('abrirNota não usa o fallback quando o principal funciona', chamadas.activate.length === 0, chamadas.activate);

api.openTabWithNote = () => { throw new Error('sem openTab'); };
chamadas.activate = [];
abrirNota('DEF');
ok('abrirNota cai para activateNote quando o principal falha', chamadas.activate[0] === 'DEF', chamadas.activate);

api.activateNote = () => { throw new Error('sem activate'); };
chamadas.mensagens = [];
let lancou = false;
try { abrirNota('GHI'); } catch (e) { lancou = true; }
ok('abrirNota não lança quando os dois caminhos falham', !lancou);
ok('abrirNota avisa quando os dois caminhos falham', chamadas.mensagens.length === 1, chamadas.mensagens);

console.log('\n5b) i18n (PT padrão + interpolação)');
ok('tr("ordemSalva") → PT', tr('ordemSalva') === 'Ordem salva', tr('ordemSalva'));
ok('tr interpola {n} e {s}', tr('palavras', { n: '5', s: 's' }) === '5 palavras', tr('palavras', { n: '5', s: 's' }));
ok('lgPlural(1) → "" e (2) → "s"', lgPlural(1) === '' && lgPlural(2) === 's');
ok('lgCultura() → pt-BR por padrão', lgCultura() === 'pt-BR', lgCultura());
ok('dicionário EN completo (mesmas chaves do PT)', (() => {
    const bloco = src.slice(src.indexOf('const LG_I18N = {'), src.indexOf('let lgLocale'));
    const chaves = (nome) => {
        const m = bloco.match(new RegExp(nome + ': \\{([\\s\\S]*?)\\n    \\},'));
        return m ? [...m[1].matchAll(/^\s{8}(\w+):/gm)].map((x) => x[1]).sort() : [];
    };
    const pt = chaves('pt');
    const en = chaves('en');
    return pt.length > 15 && JSON.stringify(pt) === JSON.stringify(en);
})(), null);

console.log('\n6) CSS escopado em #lg-root (não pode vazar para o app)');
const css = src.match(/const CSS = `([\s\S]*?)`;/);
ok('CSS extraído do fonte', !!css);
if (css) {
    const semComentarios = css[1].replace(/\/\*[\s\S]*?\*\//g, '');
    const seletorRuim = [];
    for (const m of semComentarios.matchAll(/([^{}]+)\{/g)) {
        for (const sel of m[1].split(',')) {
            const s = sel.trim();
            if (!s || s.startsWith('@')) continue;
            if (!s.startsWith('#lg-root')) seletorRuim.push(s);
        }
    }
    ok('nenhum seletor fora de #lg-root', seletorRuim.length === 0, seletorRuim);
    ok('classes do plugin usam prefixo lg-', /\.lg-btn/.test(semComentarios) && !/\.btn[^-\w]/.test(semComentarios));
}

console.log('\n' + (falhas === 0 ? '✅ Todos os testes passaram' : `❌ ${falhas} falha(s)`));
process.exit(falhas === 0 ? 0 : 1);
