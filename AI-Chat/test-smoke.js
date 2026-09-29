// ============================================================
// test-smoke.js — smoke de runtime do AI-Chat no Chrome headless.
//
// Roda o plugin real com stubs de `api`, jQuery e localStorage:
// (cena 1) boot com config OK, envio com sucesso (user + IA + uso),
// colapso/aria, erro de rede restaura o texto e mostra o balão de
// erro; (cena 2) boot sem config mostra o banner acionável.
//
// Uso: bun test-smoke.js
// Requisitos: google-chrome ou chromium. Na 1ª execução baixa o
// jQuery (cache em /tmp/opencode/aic-smoke).
// Sem Chrome ou sem internet: imprime SKIP e sai com 0.
// ============================================================
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const DIR = '/tmp/opencode/aic-smoke';
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

fs.copyFileSync(path.join(__dirname, 'AI-Chat', 'AI Code.js'), path.join(DIR, 'ai-code.js'));
fs.copyFileSync(CACHE_JQ, path.join(DIR, 'jquery.min.js'));

const CFG_TEXTO = 'openrouter_key: sk-teste\nmodel: modelo/teste\ntemperature: 0.3\nmax_tokens: 128';

function pagina(opts) {
    const temConfig = opts.temConfig !== false;
    const idioma = opts.lang || 'pt_BR';
    return `<!DOCTYPE html><html><head><meta charset="utf-8">
<script src="jquery.min.js"></script></head><body>
<div id="container" style="width:900px;height:700px;"></div>
<pre id="result">pendente</pre>
<script>
const logs = [];
console.error = ((o) => (...a) => { logs.push('[error] ' + a.map(String).join(' ')); })(console.error);
window.onerror = (m, s, l, c) => { logs.push('[onerror] ' + m + ' @' + l + ':' + c); };
window.addEventListener('unhandledrejection', (e) => { logs.push('[rejection] ' + (e.reason && e.reason.stack ? e.reason.stack : String(e.reason))); });
const loja = {};
Object.defineProperty(window, 'localStorage', { value: {
  getItem: (k) => (k in loja ? loja[k] : null),
  setItem: (k, v) => { loja[k] = String(v); },
  removeItem: (k) => { delete loja[k]; }
}});
window.marked = { parse: (t) => String(t) };
window.DOMPurify = { sanitize: (h) => String(h) };
const cfgNota = {
  noteId: 'cfg1', title: 'AI Chat Config', type: 'text',
  getProtectedContent: () => { throw new Error('sem master password'); },
  getContent: () => ${JSON.stringify(CFG_TEXTO)}
};
const notaCtx = {
  noteId: 'n1', title: 'Nota de teste', type: 'text',
  getContent: () => '<p>Conteudo da nota de teste</p>',
  getChildNotes: () => []
};
window.api = {
  runOnBackend: (fn, args) => Promise.resolve().then(() => fn.apply(null, args || [])),
  getNotesWithLabel: (l) => (l === 'aiChatConfig' && ${temConfig}) ? [cfgNota] : [],
  searchForNotes: () => ${temConfig} ? [cfgNota] : [],
  getNote: (id) => (id === 'n1' ? notaCtx : (id === 'cfg1' ? cfgNota : null)),
  getActiveContextNote: () => null,
  getOption: () => ${JSON.stringify(idioma)},
  openTabWithNote: () => {},
  showMessage: () => {}
};
let modoFetch = 'ok';
window.fetch = (url, opt) => {
  if (modoFetch === 'falha') return Promise.reject(new TypeError('Failed to fetch'));
  return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({
    choices: [{ message: { content: 'Resposta **teste** com detalhes' } }],
    usage: { prompt_tokens: 12, completion_tokens: 7 }
  })});
};
window.$container = $('#container');
const s = document.createElement('script'); s.src = 'ai-code.js';
s.onerror = () => logs.push('[script] falhou ao carregar ai-code.js');
document.head.appendChild(s);
setTimeout(async () => {
  const $ = window.jQuery;
  const r = { logs };
  try {
    r.wrap = $('.chat-wrap').length;
    r.temConfig = ${temConfig};
    r.bannerVisivel = !$('#cfg-banner').prop('hidden');
    r.badge = $('#model-badge').text();
    r.emptyState = $('#messages').text().indexOf('Carregue uma nota') !== -1;
    r.roleLog = $('#messages').attr('role');
    r.btnSend = $('#btn-send').text();
    r.btnLoad = $('#btn-load').text();
    r.personaOpt = $('#persona-select option').first().text();
    r.msgTexto = $('#messages').text();

    if (r.temConfig) {
      // cena 1a: envio com sucesso
      $('#ctx-id-input').val('n1');
      $('#btn-load').trigger('click');
      await new Promise((res) => setTimeout(res, 30));
      $('#user-input').val('Pergunta de teste');
      $('#btn-send').trigger('click');
      await new Promise((res) => setTimeout(res, 80));
      r.msgUser = $('.msg-user').length;
      r.msgAi = $('.msg-ai').length;
      r.aiTexto = $('.msg-ai .msg-body').text();
      r.uso = $('#usage-info').text();
      r.ariaCopy = $('.btn-copy-msg').attr('aria-label') || '';
      r.loadingFim = $('#typing').hasClass('visible');
      r.histSalvo = !!loja['ai_chat_state'];

      // cena 1b: erro de rede → balão de erro + texto restaurado
      modoFetch = 'falha';
      $('#user-input').val('Mensagem que falha');
      $('#btn-send').trigger('click');
      await new Promise((res) => setTimeout(res, 80));
      r.msgErro = $('.msg-error').length;
      r.inputRestaurado = $('#user-input').val();
      r.userBubbleAposErro = $('.msg-user').length;

      // cena 1c: busca com contagem
      $('#btn-toggle-search').trigger('click');
      $('#search-input').val('teste').trigger('input');
      r.buscaCount = $('#search-count').text();
    }
  } catch (e) { r.erroExec = String(e && e.stack || e); }
  document.getElementById('result').textContent = JSON.stringify(r);
}, 450);
</script></body></html>`;
}

function rodar(nomeArquivo, html) {
    fs.writeFileSync(path.join(DIR, nomeArquivo), html);
    const out = execFileSync(CHROME, [
        '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
        '--user-data-dir=' + path.join(DIR, 'profile'), '--virtual-time-budget=8000', '--dump-dom',
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

try {
    console.log('1) boot com config OK + envio + erro de rede');
    const r = rodar('smoke-com-config.html', pagina({ temConfig: true }));
    if (r.erroExec) { console.log('  ✗ exceção no smoke → ' + r.erroExec); falhas++; }
    ok('root .chat-wrap renderizou', r.wrap === 1, r.wrap);
    ok('banner escondido com config OK', r.bannerVisivel === false, r.bannerVisivel);
    ok('badge com o modelo', r.badge === 'modelo/teste', r.badge);
    ok('#messages é role=log', r.roleLog === 'log', r.roleLog);
    ok('UI em PT (Enviar/Carregar)', r.btnSend === 'Enviar' && r.btnLoad === 'Carregar', [r.btnSend, r.btnLoad]);
    ok('contexto carregou + envio gerou user e IA', r.msgUser >= 1 && r.msgAi >= 1, [r.msgUser, r.msgAi]);
    ok('resposta renderizada', String(r.aiTexto || '').indexOf('Resposta') !== -1, r.aiTexto);
    ok('uso (tokens) exibido', String(r.uso || '').indexOf('12') !== -1 && String(r.uso || '').indexOf('7') !== -1, r.uso);
    ok('botão copiar com aria-label', String(r.ariaCopy).length > 0, r.ariaCopy);
    ok('loading encerrou', r.loadingFim === false, r.loadingFim);
    ok('histórico persistido', r.histSalvo === true);
    ok('erro de rede → balão de erro', r.msgErro >= 1, r.msgErro);
    ok('erro de rede → texto restaurado no input', r.inputRestaurado === 'Mensagem que falha', r.inputRestaurado);
    ok('busca mostra contagem', String(r.buscaCount || '').length > 0, r.buscaCount);
    const erros1 = (r.logs || []).filter((l) => l.indexOf('[error]') === 0 || l.indexOf('[onerror]') === 0 || l.indexOf('[rejection]') === 0);
    ok('console limpo (sem errors/rejections)', erros1.length === 0, erros1);

    console.log('2) boot sem config → banner acionável');
    const r2 = rodar('smoke-sem-config.html', pagina({ temConfig: false }));
    if (r2.erroExec) { console.log('  ✗ exceção no smoke → ' + r2.erroExec); falhas++; }
    ok('banner visível sem config', r2.bannerVisivel === true, r2.bannerVisivel);
    ok('banner tem texto orientando', String(r2.badge || '') === '' && r2.wrap === 1);

    console.log('3) boot em EN → UI traduzida pelo locale');
    const r3 = rodar('smoke-en.html', pagina({ temConfig: true, lang: 'en_US' }));
    if (r3.erroExec) { console.log('  ✗ exceção no smoke → ' + r3.erroExec); falhas++; }
    ok('botões em EN (Send/Load)', r3.btnSend === 'Send' && r3.btnLoad === 'Load', [r3.btnSend, r3.btnLoad]);
    ok('persona em EN', String(r3.personaOpt || '').indexOf('General assistant') !== -1, r3.personaOpt);
    ok('estado vazio em EN', String(r3.msgTexto || '').indexOf('Load a note as context') !== -1, r3.msgTexto);
} catch (e) {
    falhas++;
    console.log('  ✗ falha inesperada: ' + (e && e.stack || e));
}

console.log('');
if (falhas) { console.log(falhas + ' falha(s)'); process.exit(1); }
console.log('smoke OK');
