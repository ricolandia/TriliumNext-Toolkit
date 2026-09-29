// ============================================================
// test-smoke.js — smoke de runtime do Word Counter (Chrome headless).
//
// Roda o widget real com stubs de `api`/jQuery/localStorage:
// (A) boot + baseline/delta + debounce de eventos; (B) meta atingida
// (classe/aviso/ARIA); (C) boot em EN; (D) erro de leitura + retry +
// nota protegida; (E) migração do formato legado.
//
// Uso: bun test-smoke.js
// Requisitos: google-chrome ou chromium. Na 1ª execução baixa o jQuery
// (cache em /tmp/opencode/wc-smoke). Sem Chrome/internet: SKIP e sai 0.
// ============================================================
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const DIR = '/tmp/opencode/wc-smoke';
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

fs.copyFileSync(path.join(__dirname, 'Word count.js'), path.join(DIR, 'wordcount-widget.js'));
fs.copyFileSync(CACHE_JQ, path.join(DIR, 'jquery.min.js'));

function pagina(opts) {
    const lang = opts.lang || 'pt_BR';
    const seed = JSON.stringify(opts.seed || {});
    const cenario = opts.cenario;
    const notaBase = JSON.stringify(opts.nota || {});
    return `<!DOCTYPE html><html><head><meta charset="utf-8">
<script src="jquery.min.js"></script></head><body>
<div id="widget-body"></div><pre id="result">pendente</pre>
<script>
const logs = [];
console.error = ((o) => (...a) => { logs.push('[error] ' + a.map(String).join(' ')); })(console.error);
console.warn  = ((o) => (...a) => { logs.push('[warn] '  + a.map(String).join(' ')); })(console.warn);
window.onerror = (m, s, l, c) => { logs.push('[onerror] ' + m + ' @' + l + ':' + c); };
window.addEventListener('unhandledrejection', (e) => { logs.push('[rejection] ' + (e.reason && e.reason.stack ? e.reason.stack : String(e.reason))); });
const loja = {};
Object.defineProperty(window, 'localStorage', { value: {
  get length() { return Object.keys(loja).length; },
  key: (i) => Object.keys(loja)[i] || null,
  getItem: (k) => (k in loja ? loja[k] : null),
  setItem: (k, v) => { loja[k] = String(v); },
  removeItem: (k) => { delete loja[k]; }
}});
const SEED = ${seed};
Object.keys(SEED).forEach((k) => { loja[k] = SEED[k]; });
window.api = {
  RightPanelWidget: class { cssBlock(css) { this._css = css; return this; } },
  showMessage: (m) => logs.push('[msg] ' + m),
  dayjs: () => ({ format: (f) => f === 'GGGG-WW' ? '2026-40' : '2026-09-29' }),
  runOnBackend: (fn, args) => Promise.resolve().then(() => fn.apply(null, args || [])),
  getOption: () => ${JSON.stringify(lang)}
};
window.module = { exports: {} };
</script>
<script src="wordcount-widget.js"></script>
<script>
(async () => {
  const $ = window.jQuery;
  const wait = (ms) => new Promise((res) => setTimeout(res, ms));
  const r = { logs };
  try {
    const base = ${notaBase};
    const nota = Object.assign({
      noteId: 'n1', title: 'Nota', type: 'text', isProtected: false,
      conteudo: '<p>Olá mundo</p>', leituras: 0
    }, base);
    nota.getContent = () => { nota.leituras++; return (nota.rejeitar ? Promise.reject(new Error('boom')) : Promise.resolve(nota.conteudo)); };
    nota.getLabelValue = (l) => (nota.labels && l in nota.labels) ? nota.labels[l] : null;
    window.__nota = nota;

    const w = window.module.exports;
    w.note = nota;
    w.$body = $('#widget-body');
    w.doRenderBody();
    await wait(120);
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
    console.log('A) boot PT + baseline/delta + debounce');
    const a = rodar('smoke-a.html', pagina({
        cenario: `
    r.titulo = w.widgetTitle;
    r.words1 = $('#wc-words').text();
    r.chars1 = $('#wc-chars').text();
    r.total1 = $('#wc-total').text();
    r.barRole = $('#wc-daily-bar').attr('role');
    r.barNow = $('#wc-daily-bar').attr('aria-valuenow');
    r.barMax = $('#wc-daily-bar').attr('aria-valuemax');
    r.leiturasBoot = nota.leituras;
    // cresce de 2 para 3 palavras, com dois eventos seguidos (debounce)
    nota.conteudo = '<p>Olá mundo novo</p>';
    w.entitiesReloadedEvent({ loadResults: { isNoteContentReloaded: () => true } });
    w.entitiesReloadedEvent({ loadResults: { isNoteContentReloaded: () => true } });
    await wait(300);
    r.leiturasApos = nota.leituras;
    r.words2 = $('#wc-words').text();
    r.total2 = $('#wc-total').text();
    r.storageV2 = JSON.parse(loja['wc-2026-09-29'] || '{}').v === 2;
`
    }));
    if (a.erroExec) { console.log('  ✗ exceção → ' + a.erroExec); falhas++; }
    ok('título e contagem inicial', a.titulo === 'Contador de Palavras' && a.words1 === '2' && a.chars1 === '8', [a.titulo, a.words1, a.chars1]);
    ok('baseline não credita (0)', a.total1 === '0', a.total1);
    ok('barra com role/ARIA', a.barRole === 'progressbar' && a.barNow === '0' && a.barMax === '500', [a.barRole, a.barNow, a.barMax]);
    ok('debounce coalesce eventos', (a.leiturasApos - a.leiturasBoot) === 1, [a.leiturasBoot, a.leiturasApos]);
    ok('delta soma o crescimento (1)', a.words2 === '3' && a.total2 === '1', [a.words2, a.total2]);
    ok('payload v2 no storage', a.storageV2 === true, a.storageV2);
    ok('console limpo (A)', semErros(a).length === 0, semErros(a));

    console.log('B) meta atingida (classe + aviso + ARIA)');
    const b = rodar('smoke-b.html', pagina({
        nota: { labels: { dailyGoal: '2' } },
        cenario: `
    r.total1 = $('#wc-total').text();
    nota.conteudo = '<p>a b c</p>';   // baseline 2 → +1
    await w._updateNoteCounts();
    r.totalMeio = $('#wc-total').text();
    nota.conteudo = '<p>a b c d</p>'; // +1 → total 2 = meta
    await w._updateNoteCounts();
    r.total2 = $('#wc-total').text();
    r.goalTxt = $('#wc-daily-goal').text();
    r.hitClasse = $('#wc-daily-row').hasClass('wc-goal-hit');
    r.hitVisivel = !$('#wc-daily-hit').prop('hidden');
    r.ariaTexto = $('#wc-daily-bar').attr('aria-valuetext') || '';
    r.status = $('#wc-status').text();
`
    }));
    if (b.erroExec) { console.log('  ✗ exceção → ' + b.erroExec); falhas++; }
    ok('meta do label (2)', b.goalTxt === '2', b.goalTxt);
    ok('deltas parciais (1 e 2)', b.totalMeio === '1' && b.total2 === '2', [b.totalMeio, b.total2]);
    ok('estado de meta atingida', b.hitClasse === true && b.hitVisivel === true, [b.hitClasse, b.hitVisivel]);
    ok('aria-valuetext e anúncio', /meta atingida/.test(b.ariaTexto) && /Meta atingida/.test(b.status || ''), [b.ariaTexto, b.status]);
    ok('console limpo (B)', semErros(b).length === 0, semErros(b));

    console.log('C) boot em EN (locale)');
    const c = rodar('smoke-c.html', pagina({
        lang: 'en_US',
        cenario: `
    r.titulo = w.widgetTitle;
    r.labels = $('#wc-root .wc-label').map(function () { return $(this).text(); }).get().join('|');
    r.sub = $('#wc-root .wc-sub').text();
    r.charsTitle = $('#wc-chars-row').attr('title') || '';
`
    }));
    if (c.erroExec) { console.log('  ✗ exceção → ' + c.erroExec); falhas++; }
    ok('título em EN', c.titulo === 'Word Counter', c.titulo);
    ok('rélulos em EN', c.labels === 'Today|Week|Words|Characters', c.labels);
    ok('subtítulo e tooltip em EN', c.sub === 'In this note' && /Without spaces/.test(c.charsTitle), [c.sub, c.charsTitle]);
    ok('console limpo (C)', semErros(c).length === 0, semErros(c));

    console.log('D) erro de leitura + retry + nota protegida');
    const d = rodar('smoke-d.html', pagina({
        cenario: `
    nota.rejeitar = true;
    await w._updateNoteCounts();
    r.erroVisivel = !$('#wc-status').prop('hidden');
    r.erroTexto = $('#wc-status').text();
    nota.rejeitar = false;
    $('#wc-status').trigger('click');
    await wait(80);
    r.wordsAposRetry = $('#wc-words').text();
    r.statusAposRetry = $('#wc-status').prop('hidden');
    nota.isProtected = true;
    nota.conteudo = '';
    await w._updateNoteCounts();
    r.protegida = $('#wc-status').text();
`
    }));
    if (d.erroExec) { console.log('  ✗ exceção → ' + d.erroExec); falhas++; }
    ok('erro visível com retry', d.erroVisivel === true && /Tentar de novo/.test(d.erroTexto || ''), [d.erroVisivel, d.erroTexto]);
    ok('retry recupera', d.wordsAposRetry === '2' && d.statusAposRetry === true, [d.wordsAposRetry, d.statusAposRetry]);
    ok('nota protegida avisa', /Nota protegida/.test(d.protegida || ''), d.protegida);
    ok('console limpo (D)', semErros(d).length === 0, semErros(d));

    console.log('E) migração do formato legado');
    const e = rodar('smoke-e.html', pagina({
        seed: { 'wc-2026-09-29': JSON.stringify({ n9: 500 }) },
        nota: { noteId: 'n9' },
        cenario: `
    r.totalBoot = $('#wc-total').text();
    nota.conteudo = '<p>' + Array(10).fill('w').join(' ') + '</p>'; // 10 palavras
    await w._updateNoteCounts();
    r.totalDepois = $('#wc-total').text();
    r.v2 = JSON.parse(loja['wc-2026-09-29'] || '{}').v === 2;
`
    }));
    if (e.erroExec) { console.log('  ✗ exceção → ' + e.erroExec); falhas++; }
    ok('total legado preservado (500)', e.totalBoot === '500', e.totalBoot);
    ok('delta soma sobre o legado (508)', e.totalDepois === '508', e.totalDepois);
    ok('storage migra para v2', e.v2 === true, e.v2);
    ok('console limpo (E)', semErros(e).length === 0, semErros(e));
} catch (e) {
    falhas++;
    console.log('  ✗ falha inesperada: ' + ((e && e.stack) || e));
}

console.log('');
if (falhas) { console.log(falhas + ' falha(s)'); process.exit(1); }
console.log('smoke OK');
