// ============================================================
// test-smoke.js — smoke de runtime no Chrome headless
// (Kanboard Sync, auditoria rodada 12).
//
// Pega erros de escopo/wiring que os testes puros não pegam:
//   boot do render note ($container), i18n (kbTr), a11y e,
//   principalmente, que o painel NÃO trava quando o backend
//   falha (api.runAsync… rejeita → runBackend devolve
//   { success:false }).
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

const DIR = '/tmp/opencode/kb-smoke';
fs.mkdirSync(DIR, { recursive: true });

const CACHE_JQ = path.join(DIR, 'jquery.min.js');
if (!fs.existsSync(CACHE_JQ) || fs.statSync(CACHE_JQ).size < 50000) {
    try { execFileSync('curl', ['-sL', '-o', CACHE_JQ, 'https://code.jquery.com/jquery-3.7.1.min.js'], { stdio: 'pipe' }); } catch (_) {}
}
if (!fs.existsSync(CACHE_JQ) || fs.statSync(CACHE_JQ).size < 50000) {
    console.log('SKIP: jQuery indisponível (sem internet?) — smoke não executado.');
    process.exit(0);
}

const fonte = fs.readFileSync(path.join(__dirname, 'Kanboard_Interface.js'), 'utf8');

// ── Página A: CONFIG "real" (sem placeholders) + backend que FALHA ──
const fonteOk = fonte
    .replace("apiUrl:      'https://yourdomain/jsonrpc.php'", "apiUrl:      'http://localhost:8080/jsonrpc.php'")
    .replace("apiToken:    'yourtoken'", "apiToken:    'smoke-token'")
    .replace("cacheNoteId: 'noteid'", "cacheNoteId: 'smoke-note'");
fs.writeFileSync(path.join(DIR, 'js-kb-ok.js'), fonteOk);
fs.writeFileSync(path.join(DIR, 'js-kb-orig.js'), fonte); // placeholders → aviso de config

const STUB = `window.$container = $('#container');
window.api = {
    getOption: (k) => (k === 'locale' ? 'pt_BR' : null),
    // simula backend indisponível/offline
    runAsyncOnBackendWithManualTransactionHandling: () => Promise.reject(new Error('offline-smoke')),
};`;

function pagina(js) {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><div id="container"></div>
<script>window.__consoleErrors = [];
const origErr = console.error; console.error = (...a) => { window.__consoleErrors.push(a.join(' ')); origErr.apply(console, a); };
</script>
<script src="jquery.min.js"></script>
<script>${STUB}</script>
<script src="${js}"></script>
</body></html>`;
}

function dump(paginaHtml, nome) {
    const p = path.join(DIR, nome);
    fs.writeFileSync(p, paginaHtml);
    return execFileSync(CHROME, [
        '--headless=new', '--disable-gpu', '--no-sandbox', '--virtual-time-budget=15000',
        '--dump-dom', 'file://' + p
    ], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
}

let falhas = 0;
const ok = (nome, cond, extra) => {
    if (cond) console.log('  ✓ ' + nome);
    else { falhas++; console.log('  ✗ ' + nome + (extra !== undefined ? ' → ' + JSON.stringify(extra) : '')); }
};

// ─────────────────────────────────────────────────────────────
console.log('1) Boot com backend offline (não deve travar)');
const dA = dump(pagina('js-kb-ok.js'), 'smoke-a.html');
ok('app renderizado (#kb-app)', /id="kb-app"/.test(dA));
ok('botão Sincronizar', /Sincronizar|Sync/.test(dA));
ok('thead com scope=col', /scope="col"/.test(dA));
ok('estado vazio com CTA', /Clique em|Click /.test(dA));
ok('status com aria-live', /aria-live="polite"/.test(dA));
ok('aria-busy não ficou preso', !/aria-busy="true"/.test(dA));
ok('sem Uncaught/ReferenceError/TypeError', !/Uncaught|ReferenceError|TypeError/.test(dA));

// ─────────────────────────────────────────────────────────────
console.log('2) Boot com placeholders → aviso de configuração');
const dB = dump(pagina('js-kb-orig.js'), 'smoke-b.html');
ok('aviso de configuração presente (#kb-config-warn)', /id="kb-config-warn"/.test(dB));
ok('texto do aviso', /Configuração necessária|Configuration required/.test(dB));

console.log('\n3) Guardas de fonte (runtime-afetantes)');
ok('sem confirm() nativo', !/confirm\(['"`]/.test(fonte));
ok('modal confirmKb', fonte.includes('function confirmKb(msg)'));
ok('runBackend presente', fonte.includes('function runBackend(fn, args)'));
ok('i18n kbTr', fonte.includes('function kbTr('));
ok('reduced-motion', fonte.includes('prefers-reduced-motion: reduce'));

console.log('\nResultado: ' + (falhas === 0 ? 'SMOKE OK ✅' : falhas + ' falha(s) ❌'));
process.exit(falhas === 0 ? 0 : 1);
