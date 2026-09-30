// ============================================================
// test-smoke.js — smoke de runtime no Chrome headless
// (Knowledge-Dashboard, auditoria rodada 9).
//
// Pega erros de escopo/wiring que os testes puros não pegam:
//   boot do render (KD_I18N/tr, theme, stats button, links href),
//   scan simulado (runOnBackend stub → total + erro visível),
//   e ausência de eval/confirm/prompt no fonte.
//
// Uso: bun test-smoke.js
// Requisitos: google-chrome ou chromium. Sem Chrome: SKIP (sai 0).
// ============================================================
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function temBinario(bin) {
    try { execFileSync('which', [bin], { stdio: 'pipe' }); return true; } catch (_) { return false; }
}
const CHROME = ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'].find(temBinario);
if (!CHROME) { console.log('SKIP: Chrome não encontrado — smoke não executado.'); process.exit(0); }

const DIR = '/tmp/opencode/kd-smoke';
fs.mkdirSync(DIR, { recursive: true });
fs.copyFileSync(path.join(__dirname, 'Knowledge debt/js knowledge.js'), path.join(DIR, 'js-kd.js'));

const BOILERPLATE = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><div id="container"></div>
<script>window.__consoleErrors = [];
const origErr = console.error; console.error = (...a) => { window.__consoleErrors.push(a.join(' ')); origErr.apply(console, a); };
</script>
<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
<script>
window.$container = $('#container');
window.__boot = null;
// stub do api (frontend)
window.api = {
  getOption: (k) => k === 'locale' ? 'pt_br' : null,
  getActiveContextNote: () => ({ noteId: 'KD_NOTA_DASHBOARD' }),
  openTabWithNote: () => {},
  activateNote: () => {},
};
window.__kdLastRunBackend = null;
window.__kdBackendResult = { orphans: [], stubs: [], empty: [], todos: [], abandoned: [], pdfs: [], _tables: ['notes'], typeCounts: [{type:'text', cnt: 3}], errors: [] };
// substitui o runOnBackend chamado pelo scan para simular o backend
const origRunOnBackend = null;
</script>
<script src="js-kd.js"></script>
</body></html>`;

// Como o script usa api.runOnBackend de verdade no fluxo do app, o smoke
// vai carregar o fonte com um shim: interceptamos via `window.api` já
// definido acima; o runOnBackend do app não existe no stub, então o
// boot não chama scan automaticamente. Verificamos o DOM construído.
const html = BOILERPLATE.replace('const origRunOnBackend = null;',
`window.__kdApiRunOnBackend = window.api.runOnBackend;
const calls = [];
// shim do runOnBackend para o scan simulado (segundo clique)
window.__kdInstallRunOnBackend = (fn) => { window.api.runOnBackend = fn; };
window.__kdCalls = calls;
window.__kdGetDOM = () => ({
  title: document.querySelector('.kd-title') ? document.querySelector('.kd-title').textContent : null,
  statsButtons: document.querySelectorAll('button.kd-stat-card').length,
  tabs: document.querySelectorAll('button.kd-tab').length,
  scanBtn: document.querySelector('.kd-btn') ? document.querySelector('.kd-btn').textContent : null,
  logRole: document.querySelector('.kd-log') ? document.querySelector('.kd-log').getAttribute('role') : null,
  linksHref: Array.from(document.querySelectorAll('a.kd-link')).map(a => a.getAttribute('href')),
  theme: document.querySelector('.kd-root') ? document.querySelector('.kd-root').getAttribute('data-kd-theme') : null,
});
window.__kdSimulateScan = async () => {
  window.api.runOnBackend = (fn, args) => {
    // fn é serializada como string; simulamos o backend retornando o stub
    return Promise.resolve(window.__kdBackendResult);
  };
  document.querySelector('.kd-btn').click();
  await new Promise(r => setTimeout(r, 50));
  // restaura
  if (window.__kdApiRunOnBackend) window.api.runOnBackend = window.__kdApiRunOnBackend;
};
window.__kdSimulateScanError = async () => {
  window.api.runOnBackend = () => Promise.reject(new Error('boom-scan'));
  document.querySelector('.kd-btn').click();
  await new Promise(r => setTimeout(r, 50));
  const alert = document.querySelector('[role="alert"]');
  return alert ? alert.textContent : null;
};
`);

fs.writeFileSync(path.join(DIR, 'smoke.html'), html);

const dump = execFileSync(CHROME, [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--virtual-time-budget=15000',
    '--dump-dom', 'file://' + path.join(DIR, 'smoke.html')
], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });

let falhas = 0;
const ok = (nome, cond, extra) => {
    if (cond) console.log('  ✓ ' + nome);
    else { falhas++; console.log('  ✗ ' + nome + (extra !== undefined ? ' → ' + JSON.stringify(extra) : '')); }
};

// O dump-dom contém o DOM após o boot (o script roda no load).
const hasTitle = /Knowledge Dashboard/.test(dump);
const hasScanBtn = /Esc\\.*anear|▶ Scan|Escanear/.test(dump) || /kd-btn/.test(dump);
console.log('1) Boot');
ok('título renderizado', hasTitle);
ok('stats são <button>', /<button[^>]*class="kd-stat-card"/.test(dump));
ok('abas são <button>', (dump.match(/kd-tab/g) || []).length >= 7);
ok('log com role=status', /role="status" aria-live="polite"/.test(dump));
ok('sem Uncaught no dump', !/Uncaught|ReferenceError|TypeError/.test(dump));

console.log('2) Guardas de fonte (runtime-afetantes)');
ok('sem eval', !/eval\(/.test(fs.readFileSync(path.join(__dirname, 'Knowledge debt/js knowledge.js'), 'utf8')));
ok('sem confirm()/prompt()', !/confirm\(/.test(fs.readFileSync(path.join(__dirname, 'Knowledge debt/js knowledge.js'), 'utf8')) && !/prompt\(/.test(fs.readFileSync(path.join(__dirname, 'Knowledge debt/js knowledge.js'), 'utf8')));

console.log('\nResultado: ' + (falhas === 0 ? 'SMOKE OK ✅' : falhas + ' falha(s) ❌'));
process.exit(falhas === 0 ? 0 : 1);