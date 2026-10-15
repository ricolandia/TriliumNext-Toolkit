// ============================================================
// test-kb.js — testes de função pura + guardas estruturais do
// Kanboard Sync (auditoria rodada 12).
//
// Cobre: esc() (XSS/aspas), paridade i18n PT/EN, sentinelas do
// checkConfig alinhadas ao default, totalização das chamadas ao
// backend (runBackend), modal próprio de confirmação e a11y.
//
// As funções vivem no top-level de "Kanboard_Interface.js"; o
// teste as extrai do fonte real por regex.
//
// Uso: bun test-kb.js  (ou: node test-kb.js)
// ============================================================
const fs = require('fs');
const path = require('path');

const ARQUIVO = path.join(__dirname, 'Kanboard_Interface.js');
const src = fs.readFileSync(ARQUIVO, 'utf8');

function extrairFn(nome) {
    const re = new RegExp('function ' + nome + '\\s*\\([\\s\\S]*?\\n\\}');
    const bloco = src.match(re);
    if (!bloco) { console.error('não achei function ' + nome); process.exit(1); }
    return bloco[0];
}

eval(extrairFn('esc') + '\nglobalThis.esc = esc;');

// KB_I18N
const blocoI18n = src.match(/const KB_I18N = (\{[\s\S]*?\n\});/);
if (!blocoI18n) { console.error('não achei KB_I18N'); process.exit(1); }
globalThis.KB_I18N = eval('(' + blocoI18n[1] + ')');

let falhas = 0;
const ok = (nome, cond, extra) => {
    if (cond) console.log('  ✓ ' + nome);
    else { falhas++; console.log('  ✗ ' + nome + (extra !== undefined ? ' → ' + JSON.stringify(extra) : '')); }
};

// ─────────────────────────────────────────────────────────────
console.log('1) esc() — escape de HTML e aspas');
ok('escapa <', esc('<b>') === '&lt;b&gt;');
ok('escapa >', esc('a>b') === 'a&gt;b');
ok('escapa &', esc('a&b') === 'a&amp;b');
ok('escapa aspas duplas', esc('"x"') === '&quot;x&quot;');
ok('escapa aspas simples', esc("it's") === 'it&#39;s');
ok('null/undefined → string vazia', esc(null) === '' && esc(undefined) === '');

// ─────────────────────────────────────────────────────────────
console.log('2) KB_I18N — paridade PT/EN');
const chaves = Object.keys(KB_I18N);
ok('tem chaves (>= 60)', chaves.length >= 60, chaves.length);
const semPT = chaves.filter(k => KB_I18N[k].pt === undefined);
const semEN = chaves.filter(k => KB_I18N[k].en === undefined);
ok('todas com PT', semPT.length === 0, semPT);
ok('todas com EN', semEN.length === 0, semEN);
const vazias = chaves.filter(k => !String(KB_I18N[k].pt).length || !String(KB_I18N[k].en).length);
ok('nenhuma vazia', vazias.length === 0, vazias);

// ─────────────────────────────────────────────────────────────
console.log('3) checkConfig — sentinelas alinhadas ao default');
ok('default apiUrl yourdomain', src.includes("apiUrl:      'https://yourdomain/jsonrpc.php'"));
ok('detecta yourdomain', src.includes("url.includes('yourdomain')"));
ok('aceita grafia do README (YOUR-KANBOARD)', src.includes("url.includes('YOUR-KANBOARD')"));
ok('detecta yourtoken', src.includes("tok === 'yourtoken'"));
ok('detecta noteid', src.includes("nid === 'noteid'"));
ok('aceita ID_DA_NOTA', src.includes("nid.startsWith('ID_DA_NOTA')"));

// ─────────────────────────────────────────────────────────────
console.log('4) Robustez — chamadas ao backend totalizadas');
const nChamadas = (src.match(/api\.runAsyncOnBackendWithManualTransactionHandling\(/g) || []).length;
ok('só 1 chamada direta (dentro de runBackend)', nChamadas === 1, nChamadas);
ok('runBackend presente', src.includes('function runBackend(fn, args)'));
ok('runBackend devolve success:false no catch', src.includes("{ success: false, error: (e && e.message) || String(e) }"));
ok('handlers com try/finally', ['handleSync', 'handleCreateTask', 'handleMoveTask', 'handleDeleteProject', 'handleCreateProject', 'handleProcessQueue']
    .every(fn => (src.match(new RegExp('async function ' + fn + '[\\s\\S]*?\\n\\}')) || [''])[0].includes('finally {')));
ok('sync conta projetos com erro', src.includes('if (pErr) failed.push('));
ok('sync devolve failed', /failed,\n    \};/.test(src));
ok('sem toastTimers morto', !src.includes('toastTimers'));

// ─────────────────────────────────────────────────────────────
console.log('5) Confirmação — modal próprio (sem confirm() nativo)');
ok('sem confirm() nativo', !/confirm\(['"`]/.test(src));
ok('sem prompt()', !/prompt\(/.test(src));
ok('modal confirmKb presente', src.includes('function confirmKb(msg)'));
ok('delete de tarefa usa confirmKb', src.includes("await confirmKb(kbTr('confirm_del_task'))"));
ok('delete de projeto usa confirmKb', src.includes("await confirmKb(kbTr('confirm_del_proj_a')"));
ok('modal com role=dialog + aria-modal', src.includes("role=\"dialog\" aria-modal=\"true\""));
ok('sem toast otimista antes de deletar', !src.includes("toast('⟳ Deletando…'"));

// ─────────────────────────────────────────────────────────────
console.log('6) a11y / i18n / UI');
ok('kbLang/kbTr/KB_LANG presentes', src.includes('function kbLang()') && src.includes('function kbTr(') && src.includes('const KB_LANG = kbLang();'));
ok('uso de kbTr', (src.match(/kbTr\(/g) || []).length >= 40, (src.match(/kbTr\(/g) || []).length);
ok('aria-live no status', src.includes('id="kb-status-text" role="status" aria-live="polite"'));
ok('aria-busy nos botões', src.includes(".attr('aria-busy', 'true')"));
ok('scope=col nas colunas', src.includes('scope="col"'));
ok('th de ações com aria-label', src.includes(".attr('aria-label', kbTr('th_actions'))"));
ok('delete é <button type=button>', src.includes('<button type="button" class="kb-del-btn"'));
ok('badge da fila acessível por teclado', src.includes("role=\"button\" tabindex=\"0\""));
ok('label associado (for)', src.includes(".attr('for', id)"));
ok('foco visível (:focus-visible)', src.includes(':focus-visible'));
ok('prefers-reduced-motion', src.includes('prefers-reduced-motion: reduce'));
ok('cores por token (danger/warn)', src.includes('var(--kb-danger)') && src.includes('var(--kb-warn)'));
ok('botões sem cor inline hardcoded', !src.includes('background:#ef4444') && !src.includes('background:#22c55e'));
ok('type=button nos botões do painel', !/\$\('<button id="kb-(sync-btn|submit-btn)"'\)/.test(src));

// ─────────────────────────────────────────────────────────────
console.log('\nResultado: ' + (falhas === 0 ? 'TODOS PASSARAM ✅' : falhas + ' falha(s) ❌'));
process.exit(falhas === 0 ? 0 : 1);
