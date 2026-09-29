// ============================================================
// test-smoke.js — smoke de runtime do Daily-Note-Navigator (Chrome headless).
//
// Roda o widget real com stubs de `api`/jQuery:
// (A) navegação read-only + criar nota + teclado escopado; (B) estado
// "hoje"; (C) boot em EN; (D) falha de busca com aviso.
//
// Uso: bun test-smoke.js
// Requisitos: google-chrome ou chromium. Na 1ª execução baixa o jQuery
// (cache em /tmp/opencode/dnn-smoke). Sem Chrome/internet: SKIP e sai 0.
// ============================================================
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const DIR = '/tmp/opencode/dnn-smoke';
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

fs.copyFileSync(path.join(__dirname, 'Daily-Note-Navigator.js'), path.join(DIR, 'dnn-widget.js'));
fs.copyFileSync(CACHE_JQ, path.join(DIR, 'jquery.min.js'));

function pagina(opts) {
    const lang = opts.lang || 'pt_BR';
    const cenario = opts.cenario;
    return `<!DOCTYPE html><html><head><meta charset="utf-8">
<script src="jquery.min.js"></script></head><body>
<div id="widget-body"></div><pre id="result">pendente</pre>
<script>
const logs = [];
console.error = ((o) => (...a) => { logs.push('[error] ' + a.map(String).join(' ')); })(console.error);
console.warn  = ((o) => (...a) => { logs.push('[warn] '  + a.map(String).join(' ')); })(console.warn);
window.onerror = (m, s, l, c) => { logs.push('[onerror] ' + m + ' @' + l + ':' + c); };
window.addEventListener('unhandledrejection', (e) => { logs.push('[rejection] ' + (e.reason && e.reason.stack ? e.reason.stack : String(e.reason))); });
window.__nav = { activated: [], created: [] };
window.__notas = {};
window.__falharBusca = false;
const notaDia = (iso) => ({ noteId: 'd' + iso, getLabelValue: (l) => l === 'dateNote' ? iso : null });
window.api = {
  RightPanelWidget: class { cssBlock(css) { this._css = css; return this; } },
  runOnBackend: (fn, args) => Promise.resolve().then(() => fn.apply(null, args || [])),
  getOption: () => ${JSON.stringify(lang)},
  searchForNote: (q) => {
    if (window.__falharBusca) return Promise.reject(new Error('boom'));
    const m = new RegExp('#dateNote="(\\\\d{4}-\\\\d{2}-\\\\d{2})"').exec(q);
    const iso = m ? m[1] : null;
    return Promise.resolve(iso && window.__notas[iso] ? window.__notas[iso] : null);
  },
  getDayNote: (iso) => { window.__nav.created.push(iso); const n = notaDia(iso); window.__notas[iso] = n; return Promise.resolve(n); },
  activateNote: (id) => { window.__nav.activated.push(id); return Promise.resolve(); },
  showMessage: (m) => logs.push('[msg] ' + m)
};
window.module = { exports: {} };
</script>
<script src="dnn-widget.js"></script>
<script>
(async () => {
  const $ = window.jQuery;
  const wait = (ms) => new Promise((res) => setTimeout(res, ms));
  const r = { logs };
  try {
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

const BOOT = `
    const w = window.module.exports;
    w.note = { noteId: 'nAtual', getLabelValue: (l) => l === 'dateNote' ? window.__dataNote : null };
    $('#widget-body').append(w.doRenderBody());
    await wait(120);
`;

try {
    console.log('A) navegação read-only + criar nota + teclado escopado');
    const a = rodar('smoke-a.html', pagina({
        cenario: `
    window.__dataNote = '2026-09-20';
    window.__notas['2026-09-21'] = { noteId: 'd2026-09-21', getLabelValue: (l) => l === 'dateNote' ? '2026-09-21' : null };
${BOOT}
    r.label = $('#dnn-label').text();
    r.labelTitle = $('#dnn-label').attr('title') || '';
    r.barAria = $('.dnn-bar').attr('aria-label');
    r.btnAria = $('#dnn-next-day').attr('aria-label');
    r.msgHidden = $('#dnn-msg').prop('hidden');
    // dia seguinte existe → navega
    $('#dnn-next-day').trigger('click');
    await wait(80);
    r.act1 = window.__nav.activated.slice();
    r.label2 = $('#dnn-label').text();
    // simula o framework: a nota ativa passa a ser a do dia 21
    w.note = window.__notas['2026-09-21'];
    w.refreshWithNote(w.note);
    // próximo dia NÃO existe → aviso + criar
    $('#dnn-next-day').trigger('click');
    await wait(80);
    r.msgTexto = $('#dnn-msg-text').text();
    r.createVisivel = !$('#dnn-create').prop('hidden');
    r.naoCriouAinda = window.__nav.created.length === 0;
    $('#dnn-create').trigger('click');
    await wait(80);
    r.created = window.__nav.created.slice();
    r.act2 = window.__nav.activated.slice();
    r.msgAposCriar = $('#dnn-msg').prop('hidden');
    r.msgSucesso = logs.some((l) => l.indexOf('[msg]') === 0 && /criada/.test(l));
    // simula o framework de novo (nota do dia 22 criada/ativa)
    w.note = window.__notas['2026-09-22'];
    w.refreshWithNote(w.note);
    // teclado: no document NÃO navega; no widget navega
    const antes = window.__nav.activated.length;
    $(document).trigger($.Event('keydown', { key: 'ArrowLeft' }));
    await wait(60);
    r.docNaoNavegou = window.__nav.activated.length === antes;
    $('#dnn-prev-day').trigger($.Event('keydown', { key: 'ArrowLeft', bubbles: true }));
    await wait(80);
    r.widgetNavegou = window.__nav.activated.length > antes;
`
    }));
    if (a.erroExec) { console.log('  ✗ exceção → ' + a.erroExec); falhas++; }
    ok('label com dia da semana (PT)', a.label === 'dom 20/09/2026', a.label);
    ok('title longo e aria do grupo', /domingo, 20 de setembro de 2026/.test(a.labelTitle || '') && a.barAria === 'Navegação do diário', [a.labelTitle, a.barAria]);
    ok('aria-label do botão', a.btnAria === 'Próximo dia', a.btnAria);
    ok('navega para dia existente (sem criar)', a.act1.length === 1 && a.act1[0] === 'd2026-09-21' && a.naoCriouAinda === true, [a.act1, a.naoCriouAinda]);
    ok('dia sem nota → aviso com ação', /Sem nota para ter 22\/09\/2026/.test(a.msgTexto || '') && a.createVisivel === true, [a.msgTexto, a.createVisivel]);
    ok('criar só na ação explícita', a.created.length === 1 && a.created[0] === '2026-09-22' && a.act2.indexOf('d2026-09-22') !== -1, [a.created, a.act2]);
    ok('aviso some + mensagem de sucesso', a.msgAposCriar === true && a.msgSucesso === true, [a.msgAposCriar, a.msgSucesso]);
    ok('seta no document NÃO navega', a.docNaoNavegou === true, a.docNaoNavegou);
    ok('seta no widget navega', a.widgetNavegou === true, a.widgetNavegou);
    ok('console limpo (A)', semErros(a).length === 0, semErros(a));

    console.log('B) estado "hoje"');
    const b = rodar('smoke-b.html', pagina({
        cenario: `
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    window.__dataNote = d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
${BOOT}
    r.todayClasse = $('#dnn-label').hasClass('dnn-today');
    r.ariaCurrent = $('#dnn-label').attr('aria-current') || '';
`
    }));
    if (b.erroExec) { console.log('  ✗ exceção → ' + b.erroExec); falhas++; }
    ok('marca o dia atual (classe + aria-current)', b.todayClasse === true && b.ariaCurrent === 'date', [b.todayClasse, b.ariaCurrent]);
    ok('console limpo (B)', semErros(b).length === 0, semErros(b));

    console.log('C) boot em EN');
    const c = rodar('smoke-c.html', pagina({
        lang: 'en_US',
        cenario: `
    window.__dataNote = '2026-09-20';
${BOOT}
    r.titulo = w.widgetTitle;
    r.btnAria = $('#dnn-prev-day').attr('aria-label');
    r.barAria = $('.dnn-bar').attr('aria-label');
    $('#dnn-next-day').trigger('click');
    await wait(80);
    r.msgTexto = $('#dnn-msg-text').text();
    r.createTexto = $('#dnn-create').text();
`
    }));
    if (c.erroExec) { console.log('  ✗ exceção → ' + c.erroExec); falhas++; }
    ok('título/aria em EN', c.titulo === 'Daily Note Navigator' && c.btnAria === 'Previous day' && c.barAria === 'Daily note navigation', [c.titulo, c.btnAria, c.barAria]);
    ok('aviso e ação em EN', /No note for Mon 09\/21\/2026/.test(c.msgTexto || '') && c.createTexto === 'Create note', [c.msgTexto, c.createTexto]);
    ok('console limpo (C)', semErros(c).length === 0, semErros(c));

    console.log('D) falha de busca → aviso de erro');
    const d = rodar('smoke-d.html', pagina({
        cenario: `
    window.__dataNote = '2026-09-20';
${BOOT}
    window.__falharBusca = true;
    $('#dnn-next-day').trigger('click');
    await wait(80);
    r.msgTexto = $('#dnn-msg-text').text();
    r.erroClasse = $('#dnn-msg').hasClass('dnn-msg-error');
    r.botoesHabilitados = !$('#dnn-next-day').prop('disabled');
`
    }));
    if (d.erroExec) { console.log('  ✗ exceção → ' + d.erroExec); falhas++; }
    ok('aviso de erro de navegação', /Falha ao navegar/.test(d.msgTexto || '') && d.erroClasse === true, [d.msgTexto, d.erroClasse]);
    ok('botões reabilitam após o erro', d.botoesHabilitados === true, d.botoesHabilitados);
    ok('console limpo (D)', semErros(d).length === 0, semErros(d));
} catch (e) {
    falhas++;
    console.log('  ✗ falha inesperada: ' + ((e && e.stack) || e));
}

console.log('');
if (falhas) { console.log(falhas + ' falha(s)'); process.exit(1); }
console.log('smoke OK');
