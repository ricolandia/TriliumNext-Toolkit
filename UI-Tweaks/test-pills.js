// ============================================================
// test-pills.js — testes do Pills-effect.js (UI-Tweaks, rodada 11)
//
// Testa a lógica pura de parsing/extracção de nome (o bug C4.1:
// OCULTOS com valor quotado) e as guardas estruturais, sem DOM real.
//
// Uso: bun test-pills.js
// ============================================================
const fs = require('fs');
const path = require('path');

const ARQUIVO = path.join(__dirname, 'Pills-effect.js');
const src = fs.readFileSync(ARQUIVO, 'utf8');

let falhas = 0;
const ok = (nome, cond, extra) => {
    if (cond) console.log('  ✓ ' + nome);
    else { falhas++; console.log('  ✗ ' + nome + (extra !== undefined ? ' → ' + JSON.stringify(extra) : '')); }
};

// ─────────────────────────────────────────────────────────────
console.log('1) Lógica de extração de nome (bug C4.1: valor quotado)');
// A correção aplicada: `nome = (pill.prefix||'').split('=')[0].replace(/^[~#]/,'')`
// Reproduzimos a lógica exata do fonte para validar os casos.
const extraiNome = (prefix) => String(prefix || '').split('=')[0].replace(/^[~#]/, '');
ok('label simples', extraiNome('#color') === 'color');
ok('relation simples', extraiNome('~cliente') === 'cliente');
ok('label com valor quotado', extraiNome('#color="#4de64d"') === 'color');
ok('relation com valor', extraiNome('~renderNote=') === 'renderNote');
ok('label com valor aspas simples', extraiNome("#foo='bar'") === 'foo');
ok('sem prefixo', extraiNome('abc') === 'abc');

// OCULTOS — validar que os nomes extraídos batem
const mOcult = src.match(/const OCULTOS = new Set\(\[([\s\S]*?)\]\);/);
if (mOcult) {
    globalThis.OCULTOS = eval('new Set([' + mOcult[1] + '])');
    ok('OCULTOS tem color', OCULTOS.has('color'));
    ok('OCULTOS tem subtreeHidden', OCULTOS.has('subtreeHidden'));
    ok('OCULTOS tem iconClass', OCULTOS.has('iconClass'));
    ok('oculta color quotado', OCULTOS.has(extraiNome('#color="#4de64d"')) === true);
} else {
    console.log('  ✗ não achei OCULTOS');
    falhas++;
}

// ─────────────────────────────────────────────────────────────
console.log('2) Guardas estruturais (rodada 11)');
ok('split(\'=\')[0] no fonte', src.includes("split('=')[0].replace"));
ok('observer com flag window.__uiTwPillsObserver', src.includes('window.__uiTwPillsObserver'));
ok('observer filtra childList', src.includes("m.type !== 'childList'"));
ok('sem innerHTML=', !src.includes('el.innerHTML ='));
ok('sem confirm/prompt', !/confirm\(|prompt\(/.test(src));
ok('label #run=frontendStartup no topo', src.includes('#run=frontendStartup'));
ok('sem data-pillified fixo "1"', !src.includes("dataset.pillified === '1'"));

// ─────────────────────────────────────────────────────────────
console.log('3) Referências do CSS (cores por color-mix)');
const css = fs.readFileSync(path.join(__dirname, 'CSS-Tweaks.css'), 'utf8');
ok('tabela cores por color-mix', css.includes('color-mix(in srgb, var(--main-text-color)'));
ok('pills label por color-mix', css.includes('.attr-pill-label') && css.includes('color-mix(in srgb, var(--main-text-color) 72%'));
ok('prefers-reduced-motion', css.includes('prefers-reduced-motion: reduce'));
ok('reset de fonte escopado (sem body, body *)', !css.includes('body,\nbody *'));
ok('sem #e2e8f0 (cor ilegível no claro)', !css.includes('#e2e8f0'));
ok('frozen-left opacity subida', css.includes('opacity: 0.75'));
ok('board new item opacity 0.7', (css.match(/opacity: 0\.7/g) || []).length >= 2);

// ─────────────────────────────────────────────────────────────
console.log('\nResultado: ' + (falhas === 0 ? 'TODOS PASSARAM ✅' : falhas + ' falha(s) ❌'));
process.exit(falhas === 0 ? 0 : 1);