// ============================================================
// test-pomodoro.js — testes das funções puras do Minimalist Pomodoro
// (auditoria rodada 6: formatação, transição de ciclo, relatório,
//  restauração de estado e guardas estruturais).
//
// As funções vivem no "Pomodoro-mini/Pomodoro mini.js" delimitadas por
// marcadores (POMO-FMT, POMO-NEXT, POMO-REPORT, POMO-RESTORE); o teste
// as extrai do fonte real.
//
// Uso: bun test-pomodoro.js  (ou: node test-pomodoro.js)
// ============================================================
const fs = require('fs');
const path = require('path');

const ARQUIVO = path.join(__dirname, 'Pomodoro-mini', 'Pomodoro mini.js');
const src = fs.readFileSync(ARQUIVO, 'utf8');

function extrair(marcador) {
    const re = new RegExp('/\\* ' + marcador + ' \\(início\\)[\\s\\S]*?/\\* ' + marcador + ' \\(fim\\) \\*/');
    const bloco = src.match(re);
    if (!bloco) { console.error('não achei o bloco ' + marcador + ' no fonte'); process.exit(1); }
    return bloco[0];
}

const blocoI18n = src.match(/const POMO_I18N = (\{[\s\S]*?\n\});/);
if (!blocoI18n) { console.error('não achei o bloco POMO_I18N'); process.exit(1); }
globalThis.POMO_I18N = eval('(' + blocoI18n[1] + ')');
globalThis.tr = (key, vars) => {
    let s = POMO_I18N.pt[key] || key;
    if (vars) Object.keys(vars).forEach((k) => { s = s.split('{' + k + '}').join(String(vars[k])); });
    return s;
};

eval(extrair('POMO-FMT') + '\nglobalThis.formatTime = formatTime;');
globalThis.WORK_SECS = 25 * 60;
globalThis.BREAK_SECS = 5 * 60;
eval(extrair('POMO-NEXT') + '\nglobalThis.nextSession = nextSession;');
eval(extrair('POMO-REPORT') + '\nglobalThis.escHtml = escHtml; globalThis.buildReportRows = buildReportRows; globalThis.buildReportHtml = buildReportHtml;');
eval(extrair('POMO-RESTORE') + '\nglobalThis.parseTrackingData = parseTrackingData;');

let falhas = 0;
const ok = (nome, cond, extra) => {
    if (cond) console.log('  ✓ ' + nome);
    else { falhas++; console.log('  ✗ ' + nome + (extra !== undefined ? ' → ' + JSON.stringify(extra) : '')); }
};

// ─────────────────────────────────────────────────────────────
console.log('1) formatTime()');
ok('0 → 0:00', formatTime(0) === '0:00');
ok('59 → 0:59', formatTime(59) === '0:59');
ok('60 → 1:00', formatTime(60) === '1:00');
ok('1500 → 25:00', formatTime(1500) === '25:00');
ok('3661 → 61:01', formatTime(3661) === '61:01');
ok('negativo/NaN → 0:00', formatTime(-5) === '0:00' && formatTime('x') === '0:00');

// ─────────────────────────────────────────────────────────────
console.log('2) nextSession() — transições do ciclo');
const a = nextSession(true, 0);
ok('foco → pausa e ciclo+1', a.isWork === false && a.seconds === 5 * 60 && a.cycle === 1);
const b = nextSession(false, 1);
ok('pausa → foco mantém ciclo', b.isWork === true && b.seconds === 25 * 60 && b.cycle === 1);

// ─────────────────────────────────────────────────────────────
console.log('3) escHtml()');
ok('tags e &', escHtml('<b>&"x"</b>') === '&lt;b&gt;&amp;&quot;x&quot;&lt;/b&gt;');
ok('aspas simples', escHtml("a 'b'") === 'a &#39;b&#39;');
ok('null/undefined → string vazia', escHtml(null) === '' && escHtml(undefined) === '');

// ─────────────────────────────────────────────────────────────
console.log('4) buildReportRows()/buildReportHtml() — tabela e escaping');
const rows = buildReportRows([
    { id: 'n1', title: 'Nota <b>&"x"', ms: 65000 },
    { id: 'id-invalido!', title: 'Sem link', ms: 2000 },
    { id: 'n2', title: 'Zero', ms: 0 }
]);
ok('gera <tr><td> (não markdown)', rows.indexOf('<tr><td>') !== -1 && rows.indexOf('| ') === -1);
ok('título escapado', rows.indexOf('&lt;b&gt;') !== -1 && rows.indexOf('<b>') === -1);
ok('link só com id válido', rows.indexOf('href="#root/n1"') !== -1 && rows.indexOf('href="#root/id-invalido!"') === -1);
ok('tempo em mm:ss', rows.indexOf('<td>1:05</td>') !== -1 && rows.indexOf('<td>0:02</td>') !== -1);

const html = buildReportHtml({
    when: '29/09/2026 14:30', cycleCount: 2,
    entries: [{ id: 'n1', title: 'Nota A', ms: 60000 }],
    workSecs: 25 * 60, breakSecs: 5 * 60
});
ok('título e total', html.indexOf('Relat\u00F3rio Pomodoro') !== -1 && html.indexOf('1:00') !== -1);
ok('ciclos emendados', html.indexOf('2') !== -1 && html.indexOf('(emendados') !== -1);
ok('tbody com linhas', html.indexOf('<tbody>') !== -1 && html.indexOf('<tr><td>') !== -1);

// ─────────────────────────────────────────────────────────────
console.log('5) parseTrackingData() — restauração validada');
const valido = parseTrackingData(JSON.stringify({
    v: 1, noteTimes: { n1: { title: 'A', ms: 65000 }, n2: { title: 'B', secs: 30 }, n3: { title: 'C', ms: 0 }, 'id!': { title: 'D', ms: 5000 } },
    cycleCount: 3, lastNoteId: 'n1', lastNoteTitle: 'A', lastTick: 123, sessionStartDate: '2026-09-29'
}));
ok('ms direto', valido.noteTimes.get('n1').ms === 65000);
ok('legado em secs converte', valido.noteTimes.get('n2').ms === 30000);
ok('zero e id inválido descartados', !valido.noteTimes.has('n3') && !valido.noteTimes.has('id!'));
ok('ciclos e âncora', valido.cycleCount === 3 && valido.lastNoteId === 'n1' && valido.sessionStartDate === '2026-09-29');
ok('JSON corrompido → null', parseTrackingData('lixo{lixo') === null && parseTrackingData('null') === null);
const vazio = parseTrackingData('{}');
ok('objeto vazio → estruturas vazias', vazio.noteTimes.size === 0 && vazio.cycleCount === 0 && vazio.lastTick === 0);

// ─────────────────────────────────────────────────────────────
console.log('6) guardas estruturais (regressões da rodada 6)');
ok('sem pomo-ticks', src.indexOf('pomo-ticks') === -1);
ok('beforeunload único (flag)', src.indexOf('window.__pomoUnload') !== -1 && (src.match(/addEventListener\('beforeunload'/g) || []).length === 1);
ok('relatório em <tr> e com escape', src.indexOf("'<tr><td>'") !== -1 && src.indexOf('escHtml(e.title') !== -1 && src.indexOf('>${title}</a>') === -1);
ok('stop condiciona a limpeza ao sucesso', src.indexOf('if (!ok) {') !== -1 && src.indexOf('persistTrackingData();') !== -1);
ok('restauração reancora o relógio', src.indexOf('lastTick = parsed.lastTick > 0 ? Date.now() : 0') !== -1);
ok('localStorage só pelos helpers', (src.match(/localStorage\.setItem/g) || []).length === 1 && (src.match(/localStorage\.getItem/g) || []).length === 1);
ok('sem toLocaleString/pt-BR fixo', src.indexOf('toLocaleString') === -1 && src.indexOf("'pt-BR'") === -1);
ok('erro com fallback de mensagem', src.indexOf('(e && e.message) || e') !== -1);
ok('i18n presente (tr + locale)', src.indexOf('function tr(') !== -1 && src.indexOf("api.getOption('locale')") !== -1);

// ─────────────────────────────────────────────────────────────
console.log('7) i18n — paridade PT/EN');
const pt = Object.keys(POMO_I18N.pt).sort();
const en = Object.keys(POMO_I18N.en).sort();
const faltamEn = pt.filter((k) => !(k in POMO_I18N.en));
const sobramEn = en.filter((k) => !(k in POMO_I18N.pt));
ok('mesmas chaves em PT e EN (' + pt.length + ')', faltamEn.length === 0 && sobramEn.length === 0, { faltamEn, sobramEn });
ok('nenhum valor vazio', pt.every((k) => POMO_I18N.pt[k].length > 0 && POMO_I18N.en[k].length > 0));

// ─────────────────────────────────────────────────────────────
console.log('');
if (falhas) { console.log(falhas + ' falha(s)'); process.exit(1); }
console.log('todas as asserções passaram');
