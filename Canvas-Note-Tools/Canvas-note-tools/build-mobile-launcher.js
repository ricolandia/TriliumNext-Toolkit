// ============================================================
// build-mobile-launcher.js — gera mobile-launcher.js (Canvas Mobile v9 MVP)
//
// Fonte única da verdade:
//   - "Canvas tools v8.js"  → engine (constantes → FLOW ENGINE fim), i18n e
//                             as 3 funções de backend marcadas com CLW-BE-*-START/END
//   - mobile-launcher.src.js → UI do diálogo + ações
//
// Uso: bun build-mobile-launcher.js
// ============================================================
const fs = require('fs');
const path = require('path');

const dir = __dirname;
const V8 = path.join(dir, 'Canvas tools v8.js');
const SRC = path.join(dir, 'mobile-launcher.src.js');
const OUT = path.join(dir, 'mobile-launcher.js');

const v8 = fs.readFileSync(V8, 'utf8');
const src = fs.readFileSync(SRC, 'utf8');

function blocoPorLinhas(inicio, fim) {
    const linhas = v8.split('\n');
    const i = linhas.findIndex((l) => l.includes(inicio));
    const f = linhas.findIndex((l) => l.includes(fim));
    if (i < 0 || f < 0 || f <= i) throw new Error(`marcadores não encontrados: "${inicio}" / "${fim}"`);
    return linhas.slice(i, f + 1).join('\n');
}

function backend(nome) {
    const ini = `/* CLW-BE-${nome}-START */`;
    const fim = `/* CLW-BE-${nome}-END */`;
    const i = v8.indexOf(ini);
    const f = v8.indexOf(fim);
    if (i < 0 || f < 0 || f <= i) throw new Error(`backend não encontrado: ${nome}`);
    // o marcador fica entre "}," e "[params]" — tira a vírgula final
    return v8.slice(i + ini.length, f).trim().replace(/,$/, '').trim();
}

const engine = blocoPorLinhas('// ── Constantes', '// ── FLOW ENGINE (fim)');
const i18n = blocoPorLinhas('// ── I18N (início)', '// ── I18N (fim)');

const saida = `// ============================================================
// CANVAS MOBILE (v9 MVP) — GERADO AUTOMATICAMENTE
// NÃO EDITE ESTE ARQUIVO: edite mobile-launcher.src.js (UI/ações) ou
// "Canvas tools v8.js" (engine/i18n/backends) e rode: bun build-mobile-launcher.js
// Gerado em: ${new Date().toISOString()}
// ============================================================

${engine}

${i18n}

const CLW_BE_INSERT = ${backend('INSERT')};

const CLW_BE_TPL = ${backend('TPL')};

const CLW_BE_FLOW = ${backend('FLOW')};

${src}
`;

fs.writeFileSync(OUT, saida);
console.log(`mobile-launcher.js gerado: ${saida.length} bytes (${saida.split('\n').length} linhas)`);
