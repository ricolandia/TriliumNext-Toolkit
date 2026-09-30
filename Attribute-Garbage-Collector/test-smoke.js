// ============================================================
// test-smoke.js — smoke de runtime no Chrome headless
// (Attribute-GC, auditoria rodada 10).
//
// Pega erros de escopo/wiring que os testes puros não pegam:
//   boot do render note ($container), i18n (tr), modal de
//   confirmação, e ausência de confirm/prompt no fonte.
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

const DIR = '/tmp/opencode/agc-smoke';
fs.mkdirSync(DIR, { recursive: true });
fs.copyFileSync(path.join(__dirname, 'attribute-gc.js'), path.join(DIR, 'js-agc.js'));
const CACHE_JQ = path.join(DIR, 'jquery.min.js');
if (!fs.existsSync(CACHE_JQ) || fs.statSync(CACHE_JQ).size < 50000) {
    try { execFileSync('curl', ['-sL', '-o', CACHE_JQ, 'https://code.jquery.com/jquery-3.7.1.min.js'], { stdio: 'pipe' }); } catch (_) {}
}
if (!fs.existsSync(CACHE_JQ) || fs.statSync(CACHE_JQ).size < 50000) {
    console.log('SKIP: jQuery indisponível (sem internet?) — smoke não executado.');
    process.exit(0);
}

const BOILERPLATE = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><div id="container"></div>
<script>window.__consoleErrors = [];
const origErr = console.error; console.error = (...a) => { window.__consoleErrors.push(a.join(' ')); origErr.apply(console, a); };
</script>
<script src="jquery.min.js"></script>
<script>
window.$container = $('#container');
// stub do api (frontend) — modo render note
window.api = { getOption: (k) => k === 'locale' ? 'pt_br' : null };
</script>
<script src="js-agc.js"></script>
</body></html>`;

fs.writeFileSync(path.join(DIR, 'smoke.html'), BOILERPLATE);

const dump = execFileSync(CHROME, [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--virtual-time-budget=15000',
    '--dump-dom', 'file://' + path.join(DIR, 'smoke.html')
], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });

let falhas = 0;
const ok = (nome, cond, extra) => {
    if (cond) console.log('  ✓ ' + nome);
    else { falhas++; console.log('  ✗ ' + nome + (extra !== undefined ? ' → ' + JSON.stringify(extra) : '')); }
};

const src = fs.readFileSync(path.join(__dirname, 'attribute-gc.js'), 'utf8');

console.log('1) Boot (modo render note)');
ok('botão Escanear renderizado', /Escanear|Scan/.test(dump));
ok('checkbox Dry Run', /Dry Run/.test(dump));
ok('stats renderizados', /Atributos|Attributes/.test(dump));
ok('thead com scope=col', /scope="col"/.test(dump));
ok('sem Uncaught no dump', !/Uncaught|ReferenceError|TypeError/.test(dump));

console.log('2) Guardas de fonte (runtime-afetantes)');
ok('sem confirm() nativo', !/confirm\(['"`]/.test(src));
ok('sem prompt()', !/prompt\(/.test(src));
ok('modal confirmAgc', src.includes('function confirmAgc('));
ok('i18n agTr', src.includes('function agTr('));
ok('type=button em todos', !/\$\('<button>'\)/.test(src));

console.log('\nResultado: ' + (falhas === 0 ? 'SMOKE OK ✅' : falhas + ' falha(s) ❌'));
process.exit(falhas === 0 ? 0 : 1);