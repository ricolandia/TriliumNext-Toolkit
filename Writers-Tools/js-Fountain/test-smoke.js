// ============================================================
// test-smoke.js — smoke de runtime no Chrome headless (Fountain).
//
// Verifica que o visor renderiza de verdade (não só que o parser
// funciona): toolbar, página com o roteiro, sidebar e o clique numa
// cena (regressão do marcarCenaAtiva inexistente). Também garante
// que o boneyard não vaza para a página e que o console fica limpo.
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

fs.copyFileSync(path.join(__dirname, 'js - Fountain 3.js'), path.join(DIR, 'js-fountain.js'));

fs.writeFileSync(path.join(DIR, 'smoke-fountain.html'), `<!DOCTYPE html><html><head><meta charset="utf-8">
<script src="jquery.min.js"></script></head><body>
<div id="container" style="width:1200px;height:800px;"></div>
<pre id="result">pendente</pre>
<script>
const logs = [];
console.error = ((o) => (...a) => { logs.push('[error] ' + a.map(String).join(' ')); })(console.error);
window.onerror = (m, s, l, c) => { logs.push('[onerror] ' + m + ' @' + l + ':' + c); };
window.addEventListener('unhandledrejection', (e) => { logs.push('[rejection] ' + (e.reason && e.reason.stack ? e.reason.stack : String(e.reason))); });
try { Object.defineProperty(navigator, 'language', { get: () => 'pt-BR' }); } catch (e) {}

const CONTEUDO = [
  '# Ato 1',
  '',
  'INT. SALA #1# — DIA',
  '',
  'JOÃO',
  'Olá, mundo.',
  '',
  '/*',
  'ESCONDIDO NO BONEYARD',
  '*/',
  '',
  'EXT. RUA — NOITE',
  '',
  'Ação final.',
].join('\\n');

const rascunho = {
  noteId: 'd1', title: 'Rascunho', type: 'code', mime: 'text/plain',
  hasLabel: () => false,
  getNoteComplement: async () => ({ content: CONTEUDO }),
};
const notaMae = {
  noteId: 'mae1', title: 'FountainRenderer',
  getChildNotes: async () => [rascunho],
  getLabelValue: () => null,
};
window.api = {
  originEntity: notaMae,
  runOnBackend: (fn, args) => Promise.resolve().then(() => fn.apply(null, args || [])),
  getOption: () => 'pt_BR',
  showMessage: (m) => logs.push('[aviso] ' + m),
  openTabWithNote: () => {},
  activateNote: () => {},
  $container: $('#container'),
};

const s = document.createElement('script'); s.src = 'js-fountain.js';
s.onerror = () => logs.push('[script] falhou ao carregar js-fountain.js');
document.head.appendChild(s);

setTimeout(() => {
  const root = document.getElementById('fv-root');
  const page = document.getElementById('fv-page');
  const r = { rootExiste: !!root };
  r.temToolbar = !!document.getElementById('fv-toolbar');
  r.temPage = !!page;
  r.temCena = !!page && page.innerHTML.includes('INT. SALA');
  r.boneyardVisivel = !!page && page.textContent.includes('ESCONDIDO');
  r.sections = document.querySelectorAll('.fv-section-header').length;
  r.aria = Array.from(document.querySelectorAll('.fv-section-header')).every((b) => b.getAttribute('aria-expanded') !== null);
  r.cenasLista = document.querySelectorAll('.fv-list a[href^="#cena-"]').length;
  try {
    const link = document.querySelector('.fv-list a[href^="#cena-"]');
    if (link) link.click();
    r.clicouCena = !!link;
  } catch (e) { r.clicouCena = false; logs.push('[click] ' + e.message); }
  setTimeout(() => { r.logs = logs; document.getElementById('result').textContent = JSON.stringify(r); }, 200);
}, 1400);
</script></body></html>`);

let dom = '';
try {
    dom = execFileSync(CHROME, [
        '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
        `--user-data-dir=${DIR}/profile`, '--virtual-time-budget=9000', '--dump-dom',
        `file://${path.join(DIR, 'smoke-fountain.html')}`,
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
console.log('Smoke de runtime — Fountain (Chrome headless):');
ok('root do visor existe', r.rootExiste);
ok('toolbar renderizou', r.temToolbar);
ok('página do roteiro renderizou', r.temPage && r.temCena, { temPage: r.temPage, temCena: r.temCena });
ok('boneyard não aparece no texto da página', r.boneyardVisivel === false);
ok('sidebar com 4 seções em <button> com aria-expanded', r.sections === 4 && r.aria, { sections: r.sections, aria: r.aria });
ok('lista de cenas populada', r.cenasLista >= 1, r.cenasLista);
ok('clique numa cena não quebra (marcarAtivo)', r.clicouCena === true);
ok('sem erros no console', (r.logs || []).length === 0, r.logs);
console.log(falhas === 0 ? '\n>>> SMOKE OK' : `\n>>> ${falhas} FALHA(S)`);
process.exit(falhas === 0 ? 0 : 1);
