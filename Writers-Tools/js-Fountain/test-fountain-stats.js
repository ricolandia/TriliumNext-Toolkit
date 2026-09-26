// ============================================================
// test-fountain-stats.js — valida extrairLocal + calcularStats
// (locais e atos) extraindo as funções do fonte real.
//
// Uso: bun test-fountain-stats.js
// ============================================================
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, 'js - Fountain 3.js'), 'utf8');

function extrairFuncao(nome) {
    const m = src.match(new RegExp(`function ${nome}\\([^)]*\\) \\{[\\s\\S]*?\\n\\}`, 'm'));
    if (!m) throw new Error('não achei ' + nome);
    return m[0];
}

const iife = src.match(/const Fountain = \(function \(\) \{[\s\S]*?\n\}\)\(\);/)[0];
eval(
    iife + '\n' +
    extrairFuncao('extrairLocal') + '\n' +
    extrairFuncao('tokensEmOrdem') + '\n' +
    extrairFuncao('contarPalavras') + '\n' +
    extrairFuncao('calcularStats') + '\n' +
    'globalThis.Fountain = Fountain; globalThis.calcularStats = calcularStats; globalThis.extrairLocal = extrairLocal;'
);

let falhas = 0;
const ok = (nome, cond, extra) => {
    if (cond) console.log('  ✓ ' + nome);
    else { falhas++; console.log('  ✗ ' + nome + (extra !== undefined ? ' → ' + JSON.stringify(extra) : '')); }
};

console.log('1) extrairLocal');
ok('INT. APARTAMENTO DE JOÃO — NOITE → APARTAMENTO DE JOÃO',
    extrairLocal('INT. APARTAMENTO DE JOÃO — NOITE') === 'APARTAMENTO DE JOÃO',
    extrairLocal('INT. APARTAMENTO DE JOÃO — NOITE'));
ok('EXT. TERRAÇO — AMANHÃ → TERRAÇO',
    extrairLocal('EXT. TERRAÇO — AMANHÃ') === 'TERRAÇO',
    extrairLocal('EXT. TERRAÇO — AMANHÃ'));
ok('I/E SALA → SALA', extrairLocal('I/E SALA') === 'SALA', extrairLocal('I/E SALA'));
ok('EST. CAMPO → CAMPO', extrairLocal('EST. CAMPO') === 'CAMPO', extrairLocal('EST. CAMPO'));
ok('INT/EXT. PONTE → PONTE', extrairLocal('INT/EXT. PONTE') === 'PONTE', extrairLocal('INT/EXT. PONTE'));
ok('texto sem local → null', extrairLocal('O CARRO EXPLODE') === null);

console.log('\n2) calcularStats — locais e atos');
const roteiro = [
    '# Ato 1 — O início',
    '',
    'INT. COZINHA — DIA',
    '',
    'JOÃO',
    'Olá.',
    '',
    'EXT. RUA — NOITE',
    '',
    'AÇÃO aqui.',
    '',
    'INT. COZINHA — NOITE',
    '',
    'MARIA',
    'Voltamos.',
    '',
    '# Ato 2 — O fim',
    '',
    'EXT. PRAIA — DIA',
    '',
    'JOÃO',
    'Acabou.',
].join('\n');

const r = Fountain.parse(roteiro, true);
const s = calcularStats(r.tokens);
ok('locais: COZINHA(2), PRAIA(1), RUA(1)',
    JSON.stringify(s.locais.map((l) => [l.local, l.n])) === JSON.stringify([['COZINHA', 2], ['PRAIA', 1], ['RUA', 1]]),
    s.locais);
ok('atos: 2 atos', s.atos.length === 2, s.atos);
ok('ato 1 = "Ato 1 — O início"', s.atos[0] === 'Ato 1 — O início', s.atos);

console.log('\n3) sections de nível 1 ganham id no HTML');
ok('tem id="sec-0"', r.html.script.includes('id="sec-0"'), r.html.script.match(/<p class="section"[^>]*>/g));
ok('tem data-idx="0"', r.html.script.includes('data-idx="0"'), null);

console.log('\n' + (falhas === 0 ? '✅ Todos os testes passaram' : `❌ ${falhas} falha(s)`));
process.exit(falhas === 0 ? 0 : 1);