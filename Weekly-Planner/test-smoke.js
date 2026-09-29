// ============================================================
// test-smoke.js — smoke de runtime no Chrome headless.
//
// Verifica que o plugin SAI do "carregando" e renderiza o board com
// tarefas — pega erros de execução/escopo no render que `bun build` e os
// testes de funções puras não pegam (ex.: helper sombreado por parâmetro
// de `.map`).
//
// Uso: bun test-smoke.js
// Requisitos: google-chrome ou chromium. Na 1ª execução baixa o jQuery
// (cache em /tmp/opencode/wp-smoke).
// Sem Chrome ou sem internet: imprime SKIP e sai com 0.
// ============================================================
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const DIR = '/tmp/opencode/wp-smoke';
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

fs.copyFileSync(path.join(__dirname, 'js-planejador.js'), path.join(DIR, 'js-planejador.js'));

fs.writeFileSync(path.join(DIR, 'smoke.html'), `<!DOCTYPE html><html><head><meta charset="utf-8">
<script src="jquery.min.js"></script></head><body>
<div id="container" style="width:1200px;height:700px;"></div>
<pre id="result">pendente</pre>
<script>
const logs = [];
console.error = ((o) => (...a) => { logs.push('[error] ' + a.map(String).join(' ')); })(console.error);
console.log = ((o) => (...a) => { logs.push('[log] ' + a.map(String).join(' ')); })(console.log);
window.onerror = (m, s, l, c) => { logs.push('[onerror] ' + m + ' @' + l + ':' + c); };
window.addEventListener('unhandledrejection', (e) => { logs.push('[rejection] ' + (e.reason && e.reason.stack ? e.reason.stack : String(e.reason))); });
const NOTE_HTML = '<ul class="todo-list"><li><label class="todo-list__label"><input type="checkbox" disabled="disabled"><span class="todo-list__label__description">Tarefa um <span style="color:hsl(30,75%,60%);">#todo #upto=09-30-2026</span></span></label></li><li><label class="todo-list__label"><input type="checkbox" disabled="disabled"><span class="todo-list__label__description">Tarefa dois #doing=40%</span></label></li></ul>';
let plannerSalvo = null;
window.api = {
  runOnBackend: (fn, args) => Promise.resolve().then(() => fn.apply(null, args || [])),
  runAsyncOnBackendWithManualTransactionHandling: (fn, args) => Promise.resolve().then(() => fn.apply(null, args || [])),
  getNoteWithLabel: (label) => label === 'plannerdata' ? {
      getContent: () => plannerSalvo || '{}', setContent: (v) => { plannerSalvo = v; }, save: async () => {},
  } : null,
  getNote: (id) => id === 'n1' ? { getContent: () => NOTE_HTML, setContent() {} } : null,
  sql: { getRows: () => [{ noteId: 'n1', title: 'Nota teste' }] },
  getOption: () => 'pt_BR',
  showMessage: (m) => logs.push('[aviso] ' + m),
  activateNote: () => {},
};
window.$container = $('#container');
const s = document.createElement('script'); s.src = 'js-planejador.js';
s.onerror = () => logs.push('[script] falhou ao carregar js-planejador.js');
document.head.appendChild(s);
setTimeout(() => {
  const root = document.getElementById('wp-root');
  const html = root ? root.innerHTML : '';
  document.getElementById('result').textContent = JSON.stringify({
    rootExiste: !!root,
    loading: html.includes('Carregando'),
    temPlanner: !!(root && root.querySelector('.pl-board, .pl-tasks, .mn-grid, .gantt-grid')),
    erroInit: html.includes('Erro ao inicializar'),
    logs,
  });
}, 1800);
</script></body></html>`);

let dom = '';
try {
    dom = execFileSync(CHROME, [
        '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
        `--user-data-dir=${DIR}/profile`, '--virtual-time-budget=8000', '--dump-dom',
        `file://${path.join(DIR, 'smoke.html')}`,
    ], { encoding: 'utf-8', timeout: 90000, stdio: ['ignore', 'pipe', 'ignore'] });
} catch (e) {
    console.log('SKIP: Chrome headless falhou em executar (' + (e.message || e) + ').');
    process.exit(0);
}

const m = dom.match(/<pre id="result">([\s\S]*?)<\/pre>/);
if (!m) { console.log('FALHOU: não achei o resultado no DOM.'); process.exit(1); }
const r = JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&'));

let falhas = 0;
const ok = (nome, cond, extra) => {
    if (cond) console.log('  ✓ ' + nome);
    else { falhas++; console.log('  ✗ ' + nome + (extra !== undefined ? ' → ' + JSON.stringify(extra) : '')); }
};
console.log('Smoke de runtime (Chrome headless):');
ok('root do plugin existe', r.rootExiste);
ok('saiu do "carregando"', r.loading === false);
ok('board renderizou', r.temPlanner === true);
ok('sem tela de erro de init', r.erroInit === false);
ok('sem erros no console', (r.logs || []).length === 0, r.logs);
console.log(falhas === 0 ? '\n>>> SMOKE OK' : `\n>>> ${falhas} FALHA(S)`);
process.exit(falhas === 0 ? 0 : 1);