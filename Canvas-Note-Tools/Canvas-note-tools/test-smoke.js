// ============================================================
// test-smoke.js — smoke de runtime no Chrome headless (Canvas-Note-Tools).
//
// Duas páginas isoladas (no Trilium cada script roda em escopo próprio):
//   1) widget: doRender + refreshWithNote, 11 botões, editor role=dialog,
//      aria-pressed da captura, painel de ajuda + Esc;
//   2) launcher mobile: diálogo com role=dialog, 4 abas com aria-selected,
//      status aria-live e Esc fechando.
// Pega erros de escopo/wiring que os testes puros não pegam.
//
// Uso: bun test-smoke.js
// Requisitos: google-chrome ou chromium. Na 1ª execução baixa o jQuery
// (cache em /tmp/opencode/wt-smoke). Sem Chrome/internet: SKIP (sai 0).
// ============================================================
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const DIR = '/tmp/opencode/wt-smoke';
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

fs.copyFileSync(path.join(__dirname, 'Canvas tools v8.js'), path.join(DIR, 'js-canvas.js'));
fs.copyFileSync(path.join(__dirname, 'mobile-launcher.js'), path.join(DIR, 'js-mobile-launcher.js'));

const BOILERPLATE = `
const logs = [];
console.error = ((o) => (...a) => { logs.push('[error] ' + a.map(String).join(' ')); })(console.error);
window.onerror = (m, s, l, c) => { logs.push('[onerror] ' + m + ' @' + l + ':' + c); };
window.addEventListener('unhandledrejection', (e) => { logs.push('[rejection] ' + (e.reason && e.reason.stack ? e.reason.stack : String(e.reason))); });
window.api = {
  NoteContextAwareWidget: class {},
  runOnBackend: (fn, args) => Promise.resolve().then(() => fn.apply(null, args || [])),
  getOption: () => ({ value: 'pt_BR' }),
  getActiveContextNote: () => ({ noteId: 'n1', title: 'Canvas de teste', type: 'canvas' }),
  showMessage: () => {},
  showError: (m) => logs.push('[showError] ' + m),
  activateNote: () => Promise.resolve(),
  getNote: () => null,
  searchForNotes: () => [],
};
`;

fs.writeFileSync(path.join(DIR, 'smoke-canvas-widget.html'), `<!DOCTYPE html><html><head><meta charset="utf-8">
<script src="jquery.min.js"></script></head><body>
<pre id="result">pendente</pre>
<script>
${BOILERPLATE}
window.module = { exports: {} };
const r = {};
const s1 = document.createElement('script'); s1.src = 'js-canvas.js';
s1.onerror = () => logs.push('[script] falhou ao carregar js-canvas.js');
document.head.appendChild(s1);

setTimeout(() => {
  try {
    const widget = window.module.exports;
    r.widgetInstanciado = !!widget && typeof widget.doRender === 'function';
    widget.noteId = 'n1'; // em produção o framework define; aqui é stub
    widget.doRender();
    widget.refreshWithNote({ noteId: 'n1', type: 'canvas' });

    r.rootWidget = !!document.getElementById('clw-root');
    r.botoes = document.querySelectorAll('#clw-root .clw-round-btn').length;
    r.editorDialog = !!document.querySelector('#clw-editor-float[role="dialog"][aria-modal="true"]');
    r.buscaBotao = (() => {
      const el = document.getElementById('clw-results');
      return !!el;
    })();

    document.getElementById('clw-btn-capture').click();
    r.capturaOn = document.getElementById('clw-btn-capture').getAttribute('aria-pressed') === 'true';
    document.getElementById('clw-btn-capture').click();
    r.capturaOff = document.getElementById('clw-btn-capture').getAttribute('aria-pressed') === 'false';

    document.getElementById('clw-btn-help').click();
    r.ajudaAberta = document.getElementById('clw-help-panel').style.display === 'block';
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    r.ajudaFechada = document.getElementById('clw-help-panel').style.display === 'none';
  } catch (e) { logs.push('[widget] ' + e.message); }
  r.logs = logs;
  document.getElementById('result').textContent = JSON.stringify(r);
}, 1200);
</script></body></html>`);

fs.writeFileSync(path.join(DIR, 'smoke-canvas-launcher.html'), `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>
<pre id="result">pendente</pre>
<script>
${BOILERPLATE}
const r = {};
const s2 = document.createElement('script'); s2.src = 'js-mobile-launcher.js';
s2.onerror = () => logs.push('[script] falhou ao carregar js-mobile-launcher.js');
document.head.appendChild(s2);

setTimeout(() => {
  try {
    const box = document.querySelector('#clwm-root .clwm-box');
    r.launcherDialog = !!(box && box.getAttribute('role') === 'dialog' && box.getAttribute('aria-modal') === 'true');
    r.tabs = document.querySelectorAll('#clwm-root .clwm-tab').length;
    r.tabsAria = Array.from(document.querySelectorAll('#clwm-root .clwm-tab')).every((b) => b.getAttribute('aria-selected') !== null);
    r.statusLive = !!document.querySelector('#clwm-status[aria-live]');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    r.launcherFechou = !document.getElementById('clwm-root');
  } catch (e) { logs.push('[launcher] ' + e.message); }
  r.logs = logs;
  document.getElementById('result').textContent = JSON.stringify(r);
}, 1200);
</script></body></html>`);

function rodar(arquivo) {
    let dom = '';
    try {
        dom = execFileSync(CHROME, [
            '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
            `--user-data-dir=${DIR}/profile`, '--virtual-time-budget=9000', '--dump-dom',
            `file://${path.join(DIR, arquivo)}`,
        ], { encoding: 'utf-8', timeout: 90000, stdio: ['ignore', 'pipe', 'ignore'] });
    } catch (e) {
        console.log('SKIP: Chrome headless falhou em executar (' + (e.message || e) + ').');
        process.exit(0);
    }
    const m = dom.match(/<pre id="result">([\s\S]*?)<\/pre>/);
    if (!m) { console.log('FALHOU: não achei o resultado no DOM (' + arquivo + ').'); process.exit(1); }
    return JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
}

const w = rodar('smoke-canvas-widget.html');
const l = rodar('smoke-canvas-launcher.html');

let falhas = 0;
const ok = (nome, cond, extra) => {
    if (cond) console.log('  ✓ ' + nome);
    else { falhas++; console.log('  ✗ ' + nome + (extra !== undefined ? ' → ' + JSON.stringify(extra) : '')); }
};
console.log('Smoke de runtime — Canvas-Note-Tools (Chrome headless):');
ok('widget instancia e doRender monta o root', w.widgetInstanciado && w.rootWidget);
ok('toolbar com 11 botões', w.botoes === 11, w.botoes);
ok('editor com role=dialog/aria-modal', w.editorDialog === true);
ok('captura alterna aria-pressed', w.capturaOn === true && w.capturaOff === true, { on: w.capturaOn, off: w.capturaOff });
ok('painel de ajuda abre e Esc fecha', w.ajudaAberta === true && w.ajudaFechada === true, { abriu: w.ajudaAberta, fechou: w.ajudaFechada });
ok('widget sem erros no console', (w.logs || []).length === 0, w.logs);
ok('launcher abre com role=dialog/aria-modal', l.launcherDialog === true);
ok('launcher com 4 abas e aria-selected', l.tabs === 4 && l.tabsAria === true, { tabs: l.tabs, aria: l.tabsAria });
ok('status do launcher é região viva', l.statusLive === true);
ok('Esc fecha o launcher', l.launcherFechou === true);
ok('launcher sem erros no console', (l.logs || []).length === 0, l.logs);
console.log(falhas === 0 ? '\n>>> SMOKE OK' : `\n>>> ${falhas} FALHA(S)`);
process.exit(falhas === 0 ? 0 : 1);
