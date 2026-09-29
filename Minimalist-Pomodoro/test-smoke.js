// ============================================================
// test-smoke.js — smoke de runtime do Minimalist Pomodoro (Chrome headless).
//
// Roda o widget real com stubs de `api`/jQuery/localStorage:
// (A) boot + start + stop sem dados; (B) estado salvo (10:00 + pendência),
// 2 toques no STOP e relatório com tabela/escaping; (C) boot em EN;
// (D) pendência corrompida (aviso + sem fantasma).
//
// Uso: bun test-smoke.js
// Requisitos: google-chrome ou chromium. Na 1ª execução baixa o jQuery
// (cache em /tmp/opencode/pomo-smoke). Sem Chrome/internet: SKIP e sai 0.
// ============================================================
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const DIR = '/tmp/opencode/pomo-smoke';
const CACHE_JQ = path.join(DIR, 'jquery.min.js');

function temBinario(bin) {
    try { execFileSync('which', [bin], { stdio: 'pipe' }); return true; } catch (_) { return false; }
}
const CHROME = ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'].find(temBinario);
if (!CHROME) {
    console.log('SKIP: Chrome/Chromium não encontrado — smoke de runtime não executado.');
    process.exit(0);
}

fs.mkdirSync(DIR, { recursive: true });
if (!fs.existsSync(CACHE_JQ)) {
    try {
        execFileSync('curl', ['-sL', '-o', CACHE_JQ, 'https://code.jquery.com/jquery-3.7.1.min.js'], { stdio: 'pipe' });
    } catch (_) {}
}
if (!fs.existsSync(CACHE_JQ) || fs.statSync(CACHE_JQ).size < 10000) {
    console.log('SKIP: jQuery indisponível (sem internet?) — smoke de runtime não executado.');
    process.exit(0);
}

fs.copyFileSync(path.join(__dirname, 'Pomodoro-mini', 'Pomodoro mini.js'), path.join(DIR, 'pomodoro-widget.js'));
fs.copyFileSync(CACHE_JQ, path.join(DIR, 'jquery.min.js'));

function pagina(opts) {
    const lang = opts.lang || 'pt_BR';
    const seed = JSON.stringify(opts.seed || {});
    const cenario = opts.cenario;
    return `<!DOCTYPE html><html><head><meta charset="utf-8">
<script src="jquery.min.js"></script></head><body>
<div id="container"></div><pre id="result">pendente</pre>
<script>
const logs = [];
console.error = ((o) => (...a) => { logs.push('[error] ' + a.map(String).join(' ')); })(console.error);
console.warn  = ((o) => (...a) => { logs.push('[warn] '  + a.map(String).join(' ')); })(console.warn);
window.onerror = (m, s, l, c) => { logs.push('[onerror] ' + m + ' @' + l + ':' + c); };
window.addEventListener('unhandledrejection', (e) => { logs.push('[rejection] ' + (e.reason && e.reason.stack ? e.reason.stack : String(e.reason))); });
const loja = {};
Object.defineProperty(window, 'localStorage', { value: {
  getItem: (k) => (k in loja ? loja[k] : null),
  setItem: (k, v) => { loja[k] = String(v); },
  removeItem: (k) => { delete loja[k]; }
}});
const SEED = ${seed};
Object.keys(SEED).forEach((k) => { loja[k] = SEED[k]; });
window.api = {
  RightPanelWidget: class { cssBlock(css) { this._css = css; return this; } },
  showMessage: (m) => logs.push('[msg] ' + m),
  showError: (m) => logs.push('[errmsg] ' + m),
  dayjs: () => ({ format: (f) => f === 'YYYY-MM-DD' ? '2026-09-29' : (${JSON.stringify(lang)}.indexOf('en') === 0 ? '09/29/2026 14:30' : '29/09/2026 14:30') }),
  runOnBackend: (fn, args) => Promise.resolve().then(() => fn.apply(null, args || [])),
  getOption: () => ${JSON.stringify(lang)},
  getDayNote: () => ({ noteId: 'day1' }),
  createTextNote: (parentId, title, content) => {
    window.__lastReport = { parentId: parentId, title: title, content: content };
    return { note: { noteId: 'rep1', addLabel: () => {} } };
  }
};
window.module = { exports: {} };
</script>
<script src="pomodoro-widget.js"></script>
<script>
(async () => {
  const $ = window.jQuery;
  const wait = (ms) => new Promise((res) => setTimeout(res, ms));
  const r = { logs };
  try {
    const w = window.module.exports;
    w.note = { noteId: 'n1', title: 'Nota A' };
    $('#container').append(w.doRenderBody());
    await wait(80);
${cenario}
  } catch (e) { r.erroExec = String((e && e.stack) || e); }
  document.getElementById('result').textContent = JSON.stringify(r);
})();
</script></body></html>`;
}

function rodar(nomeArquivo, html) {
    fs.writeFileSync(path.join(DIR, nomeArquivo), html);
    const out = execFileSync(CHROME, [
        '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
        '--user-data-dir=' + path.join(DIR, 'profile'), '--virtual-time-budget=9000', '--dump-dom',
        'file://' + path.join(DIR, nomeArquivo)
    ], { stdio: 'pipe', timeout: 60000 }).toString();
    const m = out.match(/<pre id="result">([\s\S]*?)<\/pre>/);
    if (!m) throw new Error('sem resultado na página ' + nomeArquivo);
    const bruto = m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'");
    return JSON.parse(bruto);
}

let falhas = 0;
const ok = (nome, cond, extra) => {
    if (cond) console.log('  ✓ ' + nome);
    else { falhas++; console.log('  ✗ ' + nome + (extra !== undefined ? ' → ' + JSON.stringify(extra) : '')); }
};
const semErros = (r) => (r.logs || []).filter((l) => l.indexOf('[error]') === 0 || l.indexOf('[onerror]') === 0 || l.indexOf('[rejection]') === 0);

try {
    console.log('A) boot (PT) + start + stop sem dados');
    const a = rodar('smoke-a.html', pagina({
        cenario: `
    r.timer = $('#pomo-timer').text();
    r.status = $('#pomo-status').text();
    r.toggleAria = $('#pomo-toggle').attr('aria-label');
    r.stopAria = $('#pomo-stop').attr('aria-label');
    r.cycle = $('#pomo-cycle').text();
    r.pendingVisible = $('#pomo-pending').is(':visible');
    r.buttons = $('.pomo-row button').length;
    r.liveRole = $('#pomo-live').attr('role');
    r.timerRole = $('#pomo-timer').attr('role');
    // stop antes de iniciar: sem âncora → reset imediato e sem relatório
    $('#pomo-stop').trigger('click');
    await wait(120);
    r.stopAntesDeIniciar = !window.__lastReport && $('#pomo-timer').text() === '25:00';
    // start + stop em 2 toques
    $('#pomo-toggle').trigger('click');
    r.running = $('#pomo-toggle').hasClass('bx-pause');
    r.toggleAriaRunning = $('#pomo-toggle').attr('aria-label');
    await wait(150);
    $('#pomo-stop').trigger('click');
    r.armed = $('#pomo-stop').hasClass('armed');
    r.armedTitle = $('#pomo-stop').attr('title');
    $('#pomo-stop').trigger('click');
    await wait(300);
    r.resetou = $('#pomo-timer').text() === '25:00' && !$('#pomo-toggle').hasClass('bx-pause') && !$('#pomo-pending').is(':visible');
    r.salvouNoStop = !!window.__lastReport;
`
    }));
    if (a.erroExec) { console.log('  ✗ exceção → ' + a.erroExec); falhas++; }
    ok('timer inicial 25:00', a.timer === '25:00', a.timer);
    ok('status "Foco"', a.status === 'Foco', a.status);
    ok('3 botões + pendência escondida', a.buttons === 3 && a.pendingVisible === false, [a.buttons, a.pendingVisible]);
    ok('aria do toggle/stop em PT', a.toggleAria === 'Iniciar' && a.stopAria === 'Encerrar sessão e salvar relatório', [a.toggleAria, a.stopAria]);
    ok('role=timer e role=status', a.timerRole === 'timer' && a.liveRole === 'status', [a.timerRole, a.liveRole]);
    ok('start deixa em execução', a.running === true && a.toggleAriaRunning === 'Pausar', [a.running, a.toggleAriaRunning]);
    ok('stop antes de iniciar não gera relatório', a.stopAntesDeIniciar === true, a.stopAntesDeIniciar);
    ok('stop em 2 toques: arma e depois reseta/salva', a.armed === true && /Clique de novo/.test(a.armedTitle || '') && a.resetou === true && a.salvouNoStop === true, [a.armed, a.armedTitle, a.resetou, a.salvouNoStop]);
    ok('console limpo (A)', semErros(a).length === 0, semErros(a));

    console.log('B) estado salvo (10:00 + pendência) + 2 toques + relatório');
    const b = rodar('smoke-b.html', pagina({
        seed: {
            'pomo-seconds': '600',
            'pomo-isWork': '1',
            'pomo-report-pending': JSON.stringify({
                v: 1,
                noteTimes: { n9: { title: 'Nota P', ms: 65000 } },
                cycleCount: 0,
                lastNoteId: 'n9',
                lastNoteTitle: 'Nota P',
                lastTick: Date.now() - 60000,
                sessionStartDate: '2026-09-29',
                savedAt: Date.now()
            })
        },
        cenario: `
    r.timerBoot = $('#pomo-timer').text();
    r.pendingVisible = $('#pomo-pending').is(':visible');
    r.pendingText = $('#pomo-pending').text();
    $('#pomo-stop').trigger('click');
    r.armed = $('#pomo-stop').hasClass('armed');
    r.armedTitle = $('#pomo-stop').attr('title');
    $('#pomo-stop').trigger('click');
    await wait(300);
    r.reportTitle = window.__lastReport && window.__lastReport.title;
    r.reportParent = window.__lastReport && window.__lastReport.parentId;
    r.reportContent = window.__lastReport && window.__lastReport.content;
    r.pendingApos = $('#pomo-pending').is(':visible');
    r.timerApos = $('#pomo-timer').text();
    r.msgs = logs.filter((l) => l.indexOf('[msg]') === 0).join(' | ');
`
    }));
    if (b.erroExec) { console.log('  ✗ exceção → ' + b.erroExec); falhas++; }
    ok('boot restaura 10:00', b.timerBoot === '10:00', b.timerBoot);
    ok('pendência visível com texto', b.pendingVisible === true && /Relat.rio pendente/.test(b.pendingText || ''), [b.pendingVisible, b.pendingText]);
    ok('1º clique arma o STOP', b.armed === true && /Clique de novo/.test(b.armedTitle || ''), [b.armed, b.armedTitle]);
    ok('2º clique salva o relatório', String(b.reportTitle || '').indexOf('Pomodoro \u2014') === 0 && b.reportParent === 'day1', [b.reportTitle, b.reportParent]);
    ok('relatório em <tr> com link e tempo', String(b.reportContent || '').indexOf('<tr><td><a class="reference-link" href="#root/n9">') !== -1 && String(b.reportContent || '').indexOf('<td>1:05</td>') !== -1 && String(b.reportContent || '').indexOf('<tbody>') !== -1);
    ok('mensagem de destino (nota do dia)', /Relat.rio salvo na nota do dia/.test(b.msgs || ''), b.msgs);
    ok('pós-stop: pendência escondida e 25:00', b.pendingApos === false && b.timerApos === '25:00', [b.pendingApos, b.timerApos]);
    ok('console limpo (B)', semErros(b).length === 0, semErros(b));

    console.log('C) boot em EN (locale)');
    const c = rodar('smoke-c.html', pagina({
        lang: 'en_US',
        cenario: `
    await wait(150);
    r.toggleAria = $('#pomo-toggle').attr('aria-label');
    r.stopAria = $('#pomo-stop').attr('aria-label');
    r.reportAria = $('#pomo-report').attr('aria-label');
    r.status = $('#pomo-status').text();
    r.pendingText = $('#pomo-pending').text();
    r.timerAria = $('#pomo-timer').attr('aria-label');
`
    }));
    if (c.erroExec) { console.log('  ✗ exceção → ' + c.erroExec); falhas++; }
    ok('aria em EN', c.toggleAria === 'Start' && c.stopAria === 'Stop the session and save the report' && c.reportAria === 'Save the report now', [c.toggleAria, c.stopAria, c.reportAria]);
    ok('status/pendência em EN', c.status === 'Focus' && /Pending report/.test(c.pendingText || ''), [c.status, c.pendingText]);
    ok('timer aria em EN', /remaining/.test(c.timerAria || ''), c.timerAria);
    ok('console limpo (C)', semErros(c).length === 0, semErros(c));

    console.log('D) pendência corrompida');
    const d = rodar('smoke-d.html', pagina({
        seed: { 'pomo-report-pending': 'lixo{lixo' },
        cenario: `
    r.pendingVisible = $('#pomo-pending').is(':visible');
    r.timer = $('#pomo-timer').text();
    r.warn = logs.some((l) => l.indexOf('[warn]') === 0 && /corrompido/.test(l));
`
    }));
    if (d.erroExec) { console.log('  ✗ exceção → ' + d.erroExec); falhas++; }
    ok('sem fantasma de pendência', d.pendingVisible === false, d.pendingVisible);
    ok('aviso de corrupção', d.warn === true, d.warn);
    ok('boot segue em 25:00', d.timer === '25:00', d.timer);
    ok('console limpo (D)', semErros(d).length === 0, semErros(d));
    console.log('E) falha no backend preserva os dados');
    const e = rodar('smoke-e.html', pagina({
        seed: {
            'pomo-report-pending': JSON.stringify({
                v: 1,
                noteTimes: { n9: { title: 'Nota P', ms: 65000 } },
                cycleCount: 0,
                lastNoteId: 'n9',
                lastNoteTitle: 'Nota P',
                lastTick: 0,
                sessionStartDate: '2026-09-29',
                savedAt: Date.now()
            })
        },
        cenario: `
    window.api.runOnBackend = () => Promise.reject(new Error('boom'));
    $('#pomo-pending').trigger('click');
    await wait(250);
    r.erroMsg = logs.some((l) => l.indexOf('[errmsg]') === 0 && /boom/.test(l));
    r.pendingAposFalha = $('#pomo-pending').is(':visible');
    r.pendingSalvo = !!loja['pomo-report-pending'];
    r.semReport = !window.__lastReport;
`
    }));
    if (e.erroExec) { console.log('  ✗ exceção → ' + e.erroExec); falhas++; }
    ok('erro reportado (showError)', e.erroMsg === true, e.erroMsg);
    ok('pendência continua visível', e.pendingAposFalha === true, e.pendingAposFalha);
    ok('dados preservados no localStorage', e.pendingSalvo === true, e.pendingSalvo);
    ok('nenhum relatório criado', e.semReport === true, e.semReport);
    ok('console limpo (E)', semErros(e).length === 0, semErros(e));
} catch (e) {
    falhas++;
    console.log('  ✗ falha inesperada: ' + ((e && e.stack) || e));
}

console.log('');
if (falhas) { console.log(falhas + ' falha(s)'); process.exit(1); }
console.log('smoke OK');
