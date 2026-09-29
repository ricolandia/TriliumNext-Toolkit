// ============================================================
// test-chat.js — testes das funções puras do AI-Chat
// (auditoria rodada 5: escaping, parser de config e guardas
//  estruturais contra as regressões encontradas).
//
// As funções vivem no "AI-Chat/AI Code.js" delimitadas por
// marcadores (AIC-ESCAPE-BE, AIC-CONFIG-BE); o teste as extrai
// do fonte real.
//
// Uso: bun test-chat.js  (ou: node test-chat.js)
// ============================================================
const fs = require('fs');
const path = require('path');

const ARQUIVO = path.join(__dirname, 'AI-Chat', 'AI Code.js');
const src = fs.readFileSync(ARQUIVO, 'utf8');

function extrair(marcador) {
    const re = new RegExp('/\\* ' + marcador + ' \\(início\\)[\\s\\S]*?/\\* ' + marcador + ' \\(fim\\) \\*/');
    const bloco = src.match(re);
    if (!bloco) { console.error('não achei o bloco ' + marcador + ' no AI Code.js'); process.exit(1); }
    return bloco[0];
}

eval(extrair('AIC-ESCAPE-BE') + '\nglobalThis.aicEscape = aicEscape;');
eval(extrair('AIC-CONFIG-BE') + '\nglobalThis.parseAiChatConfig = parseAiChatConfig;');

let falhas = 0;
const ok = (nome, cond, extra) => {
    if (cond) console.log('  ✓ ' + nome);
    else { falhas++; console.log('  ✗ ' + nome + (extra !== undefined ? ' → ' + JSON.stringify(extra) : '')); }
};

// ─────────────────────────────────────────────────────────────
console.log('1) aicEscape() — cobre &, <, >, aspas simples e duplas');
ok('tags e &', aicEscape('<b>&"x"</b>') === '&lt;b&gt;&amp;&quot;x&quot;&lt;/b&gt;');
ok('aspas simples', aicEscape("a 'b'") === 'a &#39;b&#39;');
ok('null/undefined não quebram', aicEscape(null) === '' && aicEscape(undefined) === '');
ok('números viram string', aicEscape(42) === '42');

// ─────────────────────────────────────────────────────────────
console.log('2) parseAiChatConfig() — comentários, limites e placeholder');
const CFG = [
    '# AI Chat - Config',
    'openrouter_key: sk-or-v1-abc123',
    'model: deepseek/deepseek-v4-flash',
    'temperature: 0.5',
    'max_tokens: 8192',
    '# api_base: https://api.deepseek.com/v1',
    'api_base: https://openrouter.ai/api/v1/'
].join('\n');
const c1 = parseAiChatConfig(CFG);
ok('lê a key ativa', c1.key === 'sk-or-v1-abc123');
ok('lê o model', c1.model === 'deepseek/deepseek-v4-flash');
ok('temperature numérica', c1.temperature === 0.5);
ok('max_tokens inteiro', c1.maxTokens === 8192);
ok('linha comentada de api_base é ignorada', c1.apiBase === 'https://openrouter.ai/api/v1', c1.apiBase);
ok('api_base sem barra final', !c1.apiBase.endsWith('/'));

const c2 = parseAiChatConfig('openrouter_key: your key\nmodel: x');
ok('placeholder "your key" detectado', c2.placeholderKey === true);
const c3 = parseAiChatConfig('# api_base: https://x\n# openrouter_key: sk-y\nmodel: y');
ok('só comentários → sem key', c3.key === null && c3.placeholderKey === true);
const c4 = parseAiChatConfig('openrouter_key: sk-real\nmodel: y\ntemperature: 5\nmax_tokens: 999999');
ok('temperature limitada a 2', c4.temperature === 2, c4.temperature);
ok('max_tokens limitado a 32000', c4.maxTokens === 32000, c4.maxTokens);
const c5 = parseAiChatConfig('');
ok('vazio → defaults e sem key', c5.key === null && c5.model === 'openrouter/auto' && c5.temperature === 0.7);
const c6 = parseAiChatConfig('openrouter_key: sk-1\nmodel: m\ntemperature: abc\nmax_tokens: -5');
ok('números inválidos caem no default', c6.temperature === 0.7 && c6.maxTokens === 4096, [c6.temperature, c6.maxTokens]);

// ─────────────────────────────────────────────────────────────
console.log('3) guardas estruturais (regressões da rodada 5)');
ok('reset CSS escopado (sem `* {` global)', !/\n\s*\* \{/.test(src) && src.indexOf('.chat-wrap, .chat-wrap *') !== -1);
ok('placeholder escopado', !/\n\s*::placeholder/.test(src) && src.indexOf('.chat-wrap ::placeholder') !== -1);
ok('patch global com guarda de idempotência', src.indexOf('window.__aicPatched') !== -1);
ok('CSS hoistado com textContent = (não +=)', src.indexOf("styleEl.textContent = css") !== -1 && src.indexOf("textContent += ") === -1);
ok('sem confirm() nativo', src.indexOf('confirm(') === -1);
ok('atalhos escopados (sem $(document).on)', src.indexOf("$(document).on('keydown'") === -1 && src.indexOf('keydown.aichat') !== -1);
ok('renderMarkdown falha fechado sem sanitizador', src.indexOf('if (!_marked || !_purify) return fallback') !== -1);
ok('config buscada por label com fallback', src.indexOf("getNotesWithLabel(CONFIG_LABEL)") !== -1 && src.indexOf("'AI Chat - Config'") !== -1);
ok('sem abortController global', src.indexOf('let abortController') === -1 && src.indexOf('beginOp(') !== -1);
ok('payload sem metadados (mapeia role/content)', src.indexOf('return { role: m.role, content: m.content }') !== -1);

// ─────────────────────────────────────────────────────────────
console.log('');
if (falhas) { console.log(falhas + ' falha(s)'); process.exit(1); }
console.log('todas as asserções passaram');
