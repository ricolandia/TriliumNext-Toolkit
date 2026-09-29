// ============================================================
// test-dnn.js — testes das funções puras do Daily-Note-Navigator
// (auditoria rodada 8: datas locais, clamp de mês, formatação,
//  paridade i18n e guardas estruturais).
//
// As funções vivem no "Daily-Note-Navigator.js" delimitadas por
// marcadores (DNN-DATE, DNN-FMT); o teste as extrai do fonte real.
//
// Uso: bun test-dnn.js  (ou: node test-dnn.js)
// Dica: rode também com fusos extremos:
//   TZ=America/Sao_Paulo bun test-dnn.js && TZ=Pacific/Auckland bun test-dnn.js
// ============================================================
const fs = require('fs');
const path = require('path');

const ARQUIVO = path.join(__dirname, 'Daily-Note-Navigator.js');
const src = fs.readFileSync(ARQUIVO, 'utf8');

function extrair(marcador) {
    const re = new RegExp('/\\* ' + marcador + ' \\(início\\)[\\s\\S]*?/\\* ' + marcador + ' \\(fim\\) \\*/');
    const bloco = src.match(re);
    if (!bloco) { console.error('não achei o bloco ' + marcador + ' no fonte'); process.exit(1); }
    return bloco[0];
}

eval(extrair('DNN-DATE') + '\nglobalThis.pad2 = pad2; globalThis.isoLocal = isoLocal; globalThis.parseIso = parseIso; globalThis.addDays = addDays; globalThis.addMonthsClamped = addMonthsClamped; globalThis.todayIso = todayIso;');
eval(extrair('DNN-FMT') + '\nglobalThis.formatLabel = formatLabel;');

const blocoI18n = src.match(/const DNN_I18N = (\{[\s\S]*?\n\});/);
if (!blocoI18n) { console.error('não achei o bloco DNN_I18N'); process.exit(1); }
globalThis.DNN_I18N = eval('(' + blocoI18n[1] + ')');

let falhas = 0;
const ok = (nome, cond, extra) => {
    if (cond) console.log('  ✓ ' + nome);
    else { falhas++; console.log('  ✗ ' + nome + (extra !== undefined ? ' → ' + JSON.stringify(extra) : '')); }
};

// ─────────────────────────────────────────────────────────────
console.log('1) parseIso() — validação real de datas');
ok('data válida', JSON.stringify(parseIso('2026-09-29')) === '{"y":2026,"m":9,"d":29}');
ok('formato inválido → null', parseIso('29/09/2026') === null && parseIso('abc') === null && parseIso('') === null && parseIso(null) === null);
ok('dia inexistente → null', parseIso('2026-02-30') === null && parseIso('2026-13-01') === null);
ok('bissexto válido', parseIso('2024-02-29') !== null && parseIso('2026-02-29') === null);

// ─────────────────────────────────────────────────────────────
console.log('2) addDays() — aritmética local');
ok('+1 dia', addDays('2026-09-29', 1) === '2026-09-30');
ok('-1 dia', addDays('2026-09-01', -1) === '2026-08-31');
ok('virada de ano', addDays('2026-12-31', 1) === '2027-01-01' && addDays('2027-01-01', -1) === '2026-12-31');
ok('virada de mês', addDays('2026-01-31', 1) === '2026-02-01');
ok('data inválida → null', addDays('abc', 1) === null);

// ─────────────────────────────────────────────────────────────
console.log('3) addMonthsClamped() — fim de mês');
ok('31/01 +1 → 28/02', addMonthsClamped('2026-01-31', 1) === '2026-02-28');
ok('31/01 +1 em bissexto → 29/02', addMonthsClamped('2024-01-31', 1) === '2024-02-29');
ok('31/03 +1 → 30/04', addMonthsClamped('2026-03-31', 1) === '2026-04-30');
ok('31/03 -1 → 28/02', addMonthsClamped('2026-03-31', -1) === '2026-02-28');
ok('virada de ano', addMonthsClamped('2026-12-15', 1) === '2027-01-15');
ok('31/01 -1 → 31/12', addMonthsClamped('2026-01-31', -1) === '2025-12-31');
ok('dia normal preservado', addMonthsClamped('2026-09-15', 2) === '2026-11-15');

// ─────────────────────────────────────────────────────────────
console.log('4) todayIso() com data injetada');
ok('usa componentes locais', todayIso(new Date(2026, 8, 29, 23, 30)) === '2026-09-29');
ok('antes da meia-noite não vira amanhã', todayIso(new Date(2026, 8, 29, 0, 5)) === '2026-09-29');

// ─────────────────────────────────────────────────────────────
console.log('5) formatLabel() — locale');
ok('PT: dia da semana + DD/MM/YYYY', formatLabel('2026-09-29', 'pt') === 'ter 29/09/2026');
ok('EN: dia da semana + MM/DD/YYYY', formatLabel('2026-09-29', 'en') === 'Tue 09/29/2026');
ok('domingo em PT', formatLabel('2026-09-27', 'pt') === 'dom 27/09/2026');
ok('inválida devolve o bruto', formatLabel('abc', 'pt') === 'abc');

// ─────────────────────────────────────────────────────────────
console.log('6) guardas estruturais (regressões da rodada 8)');
ok('sem listener global de teclado', src.indexOf('$(document).on') === -1 && src.indexOf("this.$widget.on('keydown.dnn'") !== -1);
ok('sem toISOString', src.indexOf('toISOString') === -1);
ok('navegação read-only (searchForNote)', src.indexOf("api.searchForNote('#dateNote=\"'") !== -1);
ok('getDayNote só na ação de criar', (src.match(/getDayNote\(/g) || []).length === 1 && src.indexOf('_criarNota') !== -1);
ok('clamp de mês em uso', src.indexOf('addMonthsClamped(dateStr, offset)') !== -1);
ok('base RightPanelWidget + position 110', src.indexOf('extends api.RightPanelWidget') !== -1 && src.indexOf('return 110') !== -1);
ok('cssBlock + classes (sem style inline)', src.indexOf('this.cssBlock(CSS)') !== -1 && (src.match(/style="/g) || []).length === 0);
ok('ARIA (group/status/labels)', src.indexOf('role="group"') !== -1 && src.indexOf('aria-live="polite"') !== -1 && src.indexOf('aria-label') !== -1);
ok('token de perigo por tema (sem hex fixo)', src.indexOf('--dnn-danger') !== -1 && src.indexOf('#f87171') === -1);
ok('reduced-motion presente', src.indexOf('prefers-reduced-motion') !== -1);
ok('cleanup com off', src.indexOf('cleanup()') !== -1 && src.indexOf("off('.dnn')") !== -1);
ok('cache com teto', src.indexOf('DNN_DAY_CACHE_MAX') !== -1);

// ─────────────────────────────────────────────────────────────
console.log('7) i18n — paridade PT/EN');
const pt = Object.keys(DNN_I18N.pt).sort();
const en = Object.keys(DNN_I18N.en).sort();
const faltamEn = pt.filter((k) => !(k in DNN_I18N.en));
const sobramEn = en.filter((k) => !(k in DNN_I18N.pt));
ok('mesmas chaves em PT e EN (' + pt.length + ')', faltamEn.length === 0 && sobramEn.length === 0, { faltamEn, sobramEn });
ok('nenhum valor vazio', pt.every((k) => DNN_I18N.pt[k].length > 0 && DNN_I18N.en[k].length > 0));

// ─────────────────────────────────────────────────────────────
console.log('');
if (falhas) { console.log(falhas + ' falha(s)'); process.exit(1); }
console.log('todas as asserções passaram');
