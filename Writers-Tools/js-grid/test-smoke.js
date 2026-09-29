// ============================================================
// test-smoke.js — smoke de runtime no Chrome headless (Longform).
//
// Verifica que o grid renderiza de verdade: cards (notas de script e o
// compilado ficam de fora), contagem/total de palavras, botões ↑/↓ e a
// reordenação por clique (alternativa ao drag no toque/teclado).
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

fs.copyFileSync(path.join(__dirname, 'js - grade.js'), path.join(DIR, 'js-grade.js'));

fs.writeFileSync(path.join(DIR, 'smoke-grade.html'), `<!DOCTYPE html><html><head><meta charset="utf-8">
<script src="jquery.min.js"></script></head><body>
<div id="container" style="width:1200px;height:800px;"></div>
<pre id="result">pendente</pre>
<script>
const logs = [];
console.error = ((o) => (...a) => { logs.push('[error] ' + a.map(String).join(' ')); })(console.error);
window.onerror = (m, s, l, c) => { logs.push('[onerror] ' + m + ' @' + l + ':' + c); };
window.addEventListener('unhandledrejection', (e) => { logs.push('[rejection] ' + (e.reason && e.reason.stack ? e.reason.stack : String(e.reason))); });
try { Object.defineProperty(navigator, 'language', { get: () => 'pt-BR' }); } catch (e) {}

const salvamentos = [];
const avisos = [];
const mk = (id, title, content) => ({
  noteId: id, title, type: 'text', mime: 'text/html',
  hasLabel: () => false,
  getNoteComplement: async () => ({ content }),
});
const notaMae = {
  noteId: 'mae1', title: 'Longform',
  getChildNotes: async () => [
    { noteId: 's1', title: 'js - grade', type: 'code', mime: 'application/javascript;env=frontend', hasLabel: () => false, getNoteComplement: async () => ({ content: '' }) },
    mk('n1', 'Introdução', '<p>uma duas três</p>'),
    mk('n2', 'Capítulo 2', '<p>quatro cinco</p>'),
    { noteId: 'c1', title: '📄 Longform', type: 'text', mime: 'text/html', hasLabel: (l) => l === 'compiledDoc', getNoteComplement: async () => ({ content: '' }) },
  ],
  getLabelValue: () => null,
};
window.api = {
  originEntity: notaMae,
  runOnBackend: (fn, args) => {
    if (args && Array.isArray(args[1])) salvamentos.push(args[1]);
    return Promise.resolve().then(() => fn.apply(null, args || []));
  },
  getOption: () => 'pt_BR',
  getNote: () => ({ setLabel: () => {}, getNoteComplement: async () => ({ content: '' }), title: 'x' }),
  showMessage: (m) => avisos.push(m),
  openTabWithNote: () => {},
  activateNote: () => {},
  $container: $('#container'),
};

const s = document.createElement('script'); s.src = 'js-grade.js';
s.onerror = () => logs.push('[script] falhou ao carregar js-grade.js');
document.head.appendChild(s);

setTimeout(() => {
  const r = { rootExiste: !!document.getElementById('lg-root') };
  const $cards = $('#grid .lg-card');
  r.cards = $cards.length;
  r.info = document.querySelector('.lg-info') ? document.querySelector('.lg-info').textContent : '';
  r.moverBtns = $('.lg-mover-btn').length;
  // reordena: ↑ no segundo card (n2) deve trocar com n1 e salvar
  $cards.eq(1).find('.lg-mover-btn[data-dir="up"]').trigger('click');
  setTimeout(() => {
    r.ordemDepois = $('#grid .lg-card').map((i, el) => el.getAttribute('data-id')).get();
    r.salvamentos = salvamentos;
    r.avisos = avisos;
    r.logs = logs;
    document.getElementById('result').textContent = JSON.stringify(r);
  }, 400);
}, 1400);
</script></body></html>`);

let dom = '';
try {
    dom = execFileSync(CHROME, [
        '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
        `--user-data-dir=${DIR}/profile`, '--virtual-time-budget=9000', '--dump-dom',
        `file://${path.join(DIR, 'smoke-grade.html')}`,
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
console.log('Smoke de runtime — Longform (Chrome headless):');
ok('root do plugin existe', r.rootExiste);
ok('2 cards (script e compilado fora)', r.cards === 2, r.cards);
ok('cabeçalho com contagem e total de palavras', /2 notas/.test(r.info) && /5 palavras/.test(r.info), r.info);
ok('botões ↑/↓ nos cards (2 por card)', r.moverBtns === 4, r.moverBtns);
ok('↑ reordena os cards', JSON.stringify(r.ordemDepois) === JSON.stringify(['n2', 'n1']), r.ordemDepois);
ok('ordem salva no backend', JSON.stringify(r.salvamentos[0]) === JSON.stringify(['n2', 'n1']), r.salvamentos);
ok('aviso "Ordem salva"', (r.avisos || []).some((a) => /Ordem salva/.test(a)), r.avisos);
ok('sem erros no console', (r.logs || []).length === 0, r.logs);
console.log(falhas === 0 ? '\n>>> SMOKE OK' : `\n>>> ${falhas} FALHA(S)`);
process.exit(falhas === 0 ? 0 : 1);
