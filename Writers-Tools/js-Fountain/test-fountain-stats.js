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

// Extrai a IIFE por marcadores de seção: a regex lazy parava no })() da IIFE
// interna de hoist de CSS (primeira ocorrência) e o eval quebrava.
const inicioIife = src.indexOf('const Fountain = (function () {');
const fimIife = src.indexOf('// ── 2. CSS');
if (inicioIife < 0 || fimIife <= inicioIife) throw new Error('não achei o bloco do Fountain');
const iife = src.slice(inicioIife, fimIife);
eval(
    iife + '\n' +
    extrairFuncao('extrairLocal') + '\n' +
    extrairFuncao('tokensEmOrdem') + '\n' +
    extrairFuncao('contarPalavras') + '\n' +
    extrairFuncao('calcularStats') + '\n' +
    extrairFuncao('nomeSeguro') + '\n' +
    'globalThis.Fountain = Fountain; globalThis.calcularStats = calcularStats;' +
    'globalThis.extrairLocal = extrairLocal; globalThis.nomeSeguro = nomeSeguro;'
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

console.log('\n4) boneyard (/* … */) fora do render e das estatísticas');
const roteiroBoneyard = [
    'INT. SALA - DIA',
    '',
    '/*',
    '',
    'ESCONDIDO NO BONEYARD',
    '',
    '*/',
    '',
    'AÇÃO VISÍVEL',
].join('\n');
const rb = Fountain.parse(roteiroBoneyard, true);
const sb = calcularStats(rb.tokens);
ok('tokens marcam começo e fim do boneyard',
    rb.tokens.some((t) => t.type === 'boneyard_begin') && rb.tokens.some((t) => t.type === 'boneyard_end'));
ok('conteúdo do boneyard não infla as palavras', sb.palavras === 2, sb.palavras);
ok('boneyard não cria cena', sb.cenas === 1, sb.cenas);

const rb2 = Fountain.parse(['INT. SALA - DIA', '', '/*', 'ESCONDIDO COMPACTO', '*/', '', 'AÇÃO VISÍVEL'].join('\n'), true);
ok('boneyard compacto (sem linha em branco) também é reconhecido',
    rb2.tokens.some((t) => t.type === 'boneyard_begin') && rb2.tokens.some((t) => t.type === 'boneyard_end'));
ok('boneyard compacto não infla as palavras', calcularStats(rb2.tokens).palavras === 2, calcularStats(rb2.tokens).palavras);

console.log('\n5) scene heading com dois espaços vira ação (força action)');
const rf = Fountain.parse(['INT. CASA - DIA  ', '', 'AÇÃO DEPOIS'].join('\n'), true);
ok('o heading forçado virou token de ação',
    rf.tokens.some((t) => t.type === 'action' && (t.text || '').includes('INT. CASA - DIA')),
    rf.tokens.map((t) => t.type + (t.text ? ':' + t.text : '')));

console.log('\n5b) parágrafos separados por linha só com espaço/NBSP (nota text)');
const rws = Fountain.parse(['INT. SALA - DIA', ' ', 'AÇÃO UM', '\u00a0', 'AÇÃO DOIS'].join('\n'), true);
ok('os dois blocos continuam separados (2 ações)', rws.tokens.filter((t) => t.type === 'action').length === 2,
    rws.tokens.map((t) => t.type));

console.log('\n6) nomeSeguro (nome de arquivo) e escaparHtml');
ok('nomeSeguro("!!!") → "roteiro"', nomeSeguro('!!!') === 'roteiro', nomeSeguro('!!!'));
ok('nomeSeguro("") → "roteiro"', nomeSeguro('') === 'roteiro', nomeSeguro(''));
ok('nomeSeguro("Meu Roteiro 2") → "meu_roteiro_2"', nomeSeguro('Meu Roteiro 2') === 'meu_roteiro_2', nomeSeguro('Meu Roteiro 2'));
ok('aspas duplas escapadas', Fountain.escaparHtml('a" onmouseover="x') === 'a&quot; onmouseover=&quot;x', Fountain.escaparHtml('a" onmouseover="x'));
ok('aspas simples escapadas', Fountain.escaparHtml("d'água") === 'd&#39;água', Fountain.escaparHtml("d'água"));

console.log('\n' + (falhas === 0 ? '✅ Todos os testes passaram' : `❌ ${falhas} falha(s)`));
process.exit(falhas === 0 ? 0 : 1);