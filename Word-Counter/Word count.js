/**
 * Word Counter + Daily/Weekly Goal for TriliumNext
 * Minimalist right-pane widget. v0.102+ (audit round 7)
 *
 * How to use:
 * 1. Create a "JS Frontend" code note in Trilium
 * 2. Paste this entire file content into that note
 * 3. Add label: #widget
 * 4. Optional: add label #dailyGoal=500 to any text note (default 500)
 * 5. Optional: add label #weeklyGoal=3500 to any text note (default 3500)
 * 6. Reload Trilium (Ctrl+R)
 *
 * Progress semantics (baseline + delta per note):
 * - The first read of a note in the period sets its baseline (no credit);
 * - afterwards only positive growth is added ("words written").
 */

const GOAL_DEFAULT = 500;
const WEEKLY_GOAL_DEFAULT = 3500;
const GOAL_MAX = 1000000;
const DAY_KEEP = 14;
const WEEK_KEEP = 8;
const UPDATE_DEBOUNCE_MS = 150;

let _lang = (typeof navigator !== 'undefined' && navigator.language ? String(navigator.language) : 'pt').toLowerCase().indexOf('en') === 0 ? 'en' : 'pt';
let currentWidget = null;
let bootInitialized = false;

// ─── Storage helpers (degradação segura) ─────────────────────────────────────

function lsGet(k) {
    try { return localStorage.getItem(k); } catch (_) { return null; }
}
function lsSet(k, v) {
    try { localStorage.setItem(k, v); return true; } catch (_) { return false; }
}
function lsRemove(k) {
    try { localStorage.removeItem(k); } catch (_) {}
}
function lsKeys() {
    try {
        const out = [];
        for (let i = 0; i < localStorage.length; i++) out.push(localStorage.key(i));
        return out.filter(function (k) { return k !== null; });
    } catch (_) { return []; }
}

// ─── Funções puras (marcadores usados pelo harness) ──────────────────────────

/* WC-PURE (início) */
const WC_ENTITIES = {
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
    ndash: '\u2013', mdash: '\u2014', hellip: '\u2026',
    laquo: '\u00AB', raquo: '\u00BB', copy: '\u00A9', reg: '\u00AE',
    trade: '\u2122', deg: '\u00B0', middot: '\u00B7', bull: '\u2022'
};

function decodeEntities(s) {
    return String(s == null ? '' : s).replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, function (m, corpo) {
        if (corpo.charAt(0) === '#') {
            const hex = corpo.charAt(1) === 'x' || corpo.charAt(1) === 'X';
            const num = parseInt(corpo.slice(hex ? 2 : 1), hex ? 16 : 10);
            if (!Number.isFinite(num) || num < 0 || num > 0x10FFFF) return ' ';
            try { return String.fromCodePoint(num); } catch (_) { return ' '; }
        }
        return Object.prototype.hasOwnProperty.call(WC_ENTITIES, corpo) ? WC_ENTITIES[corpo] : ' ';
    });
}

function htmlToText(html) {
    let s = String(html == null ? '' : html);
    s = s.replace(/<(script|style|head)[\s\S]*?<\/\1>/gi, ' ');
    s = s.replace(/<[a-zA-Z/!][^>]*>/g, ' ');
    return decodeEntities(s);
}

function countWords(html) {
    const tokens = htmlToText(html).split(/\s+/);
    let n = 0;
    for (const t of tokens) {
        if (/[\p{L}\p{N}]/u.test(t)) n++;
    }
    return n;
}

function countChars(html, comEspacos) {
    const texto = htmlToText(html);
    if (comEspacos) return Array.from(texto.trim()).length;
    return Array.from(texto.replace(/\s+/g, '')).length;
}
/* WC-PURE (fim) */

/* WC-GOAL (início) */
function parseGoalValue(raw, fallback) {
    if (raw == null || String(raw).trim() === '') return fallback;
    const n = Number(String(raw).trim());
    if (!Number.isFinite(n) || n < 1) return fallback;
    return Math.min(GOAL_MAX, Math.floor(n));
}
/* WC-GOAL (fim) */

/* WC-PROG (início) */
// Store v2: { v: 2, notes: { noteId: { delta, last } } }
// Legado v1: { noteId: number } (máximo) → delta preservado, last desconhecido (baseline futuro).
function parseProgressStore(raw) {
    let data = null;
    try { data = JSON.parse(raw); } catch (_) { return null; }
    if (!data || typeof data !== 'object' || Array.isArray(data)) return null;

    const notes = {};
    const fonte = (Number(data.v) === 2 && data.notes && typeof data.notes === 'object' && !Array.isArray(data.notes))
        ? data.notes : null;

    if (fonte) {
        for (const [id, v] of Object.entries(fonte)) {
            if (!v || typeof v !== 'object') continue;
            const delta = Number(v.delta);
            const last = (v.last === null || v.last === undefined) ? null : Number(v.last);
            notes[id] = {
                delta: (Number.isFinite(delta) && delta >= 0) ? delta : 0,
                last: (last === null || (Number.isFinite(last) && last >= 0)) ? last : null
            };
        }
        return { v: 2, notes: notes };
    }

    for (const [id, v] of Object.entries(data)) {
        if (id === 'v' || id === 'notes') continue;
        const n = Number(v);
        if (!Number.isFinite(n) || n < 0) continue;
        notes[id] = { delta: n, last: null };
    }
    return { v: 2, notes: notes };
}

function progressTotal(store) {
    let t = 0;
    for (const id of Object.keys(store.notes)) t += store.notes[id].delta;
    return t;
}

function progressApply(store, noteId, currentWords) {
    const entrada = store.notes[noteId] || { delta: 0, last: null };
    if (entrada.last === null) {
        entrada.last = currentWords;                       // baseline: não credita
    } else if (currentWords > entrada.last) {
        entrada.delta += currentWords - entrada.last;      // só o crescimento conta
        entrada.last = currentWords;
    } else {
        entrada.last = currentWords;                       // diminuiu: reancora sem débito
    }
    store.notes[noteId] = entrada;
    return store;
}
/* WC-PROG (fim) */

/* WC-PRUNE (início) */
function pruneOldKeys(keys, hojeIso, anoAtual, semanaAtual) {
    const limite = new Date(hojeIso + 'T00:00:00Z');
    limite.setUTCDate(limite.getUTCDate() - DAY_KEEP);
    const limiteIso = limite.toISOString().slice(0, 10);

    const removidas = [];
    for (const k of keys) {
        if (k.indexOf('wcw-') === 0) {
            const m = k.slice(4).match(/^(\d{4})-(\d{2})$/);
            if (!m) continue;
            const ano = Number(m[1]);
            const semana = Number(m[2]);
            if (ano < anoAtual || (ano === anoAtual && semana < semanaAtual - WEEK_KEEP)) removidas.push(k);
        } else if (k.indexOf('wc-') === 0) {
            const d = k.slice(3);
            if (/^\d{4}-\d{2}-\d{2}$/.test(d) && d < limiteIso) removidas.push(k);
        }
    }
    return removidas;
}
/* WC-PRUNE (fim) */

// ─── Datas (dayjs do Trilium) ────────────────────────────────────────────────

function isoHoje() { return api.dayjs().format('YYYY-MM-DD'); }
function isoSemana() { return api.dayjs().format('GGGG-WW'); }

// ─── I18N ────────────────────────────────────────────────────────────────────

const WC_I18N = {
    pt: {
        'title': 'Contador de Palavras',
        'today': 'Hoje',
        'week': 'Semana',
        'inNote': 'Nesta nota',
        'words': 'Palavras',
        'chars': 'Caracteres',
        'charsTip': 'Sem espa\u00E7os: {a} \u00B7 com espa\u00E7os: {b}',
        'todayTip': 'Maior contagem vista por nota no per\u00EDodo \u00B7 {n} nota(s) contada(s)',
        'weekTip': 'Semana ISO (segunda a domingo) \u00B7 {n} nota(s) contada(s)',
        'goalHit': 'meta atingida',
        'goalAnnounce': 'Meta atingida: {n} de {goal}.',
        'protected': 'Nota protegida \u2014 desbloqueie a sess\u00E3o para contar.',
        'readError': 'N\u00E3o foi poss\u00EDvel ler a nota.',
        'retry': 'Tentar de novo'
    },
    en: {
        'title': 'Word Counter',
        'today': 'Today',
        'week': 'Week',
        'inNote': 'In this note',
        'words': 'Words',
        'chars': 'Characters',
        'charsTip': 'Without spaces: {a} \u00B7 with spaces: {b}',
        'todayTip': 'Highest count seen per note in the period \u00B7 {n} note(s) counted',
        'weekTip': 'ISO week (Monday to Sunday) \u00B7 {n} note(s) counted',
        'goalHit': 'goal reached',
        'goalAnnounce': 'Goal reached: {n} of {goal}.',
        'protected': 'Protected note \u2014 unlock the session to count.',
        'readError': 'Could not read the note.',
        'retry': 'Try again'
    }
};

function tr(key, vars) {
    const d = WC_I18N[_lang] || {};
    let s = (d && d[key]) || WC_I18N.pt[key] || key;
    if (vars) {
        Object.keys(vars).forEach(function (k) {
            s = s.split('{' + k + '}').join(String(vars[k]));
        });
    }
    return s;
}

function fmtNum(n) {
    try { return Number(n).toLocaleString(_lang === 'en' ? 'en-US' : 'pt-BR'); }
    catch (_) { return String(n); }
}

async function initI18n() {
    try {
        const loc = await api.runOnBackend(() => api.getOption('locale'));
        if (loc) _lang = String(loc).toLowerCase().indexOf('en') === 0 ? 'en' : 'pt';
    } catch (_) {}
    if (currentWidget && currentWidget.doRenderBody && currentWidget.$body) {
        currentWidget.doRenderBody();
        if (currentWidget.isEnabled()) currentWidget._updateNoteCounts();
    }
}

// ─── CSS ─────────────────────────────────────────────────────────────────────

const CSS = `
#wc-root { padding: 6px 12px 10px; font-size: 13px; color: var(--main-text-color); }
.wc-row { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin: 2px 0; }
.wc-label { color: var(--muted-text-color); font-size: 12px; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.wc-value { font-variant-numeric: tabular-nums; font-size: 13px; white-space: nowrap; }
.wc-row.wc-goal-hit .wc-value { color: var(--main-color, #4477aa); font-weight: 600; }
.wc-hit { font-size: 11px; color: var(--muted-text-color); margin-left: 4px; }
.wc-bar { height: 6px; border-radius: 3px; margin: 4px 0 8px; overflow: hidden;
    background: var(--main-border-color);
    background: color-mix(in srgb, var(--main-text-color) 22%, transparent); }
.wc-fill { height: 100%; border-radius: 3px; background: var(--main-text-color); transition: width 0.3s; }
.wc-sub { color: var(--muted-text-color); font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin: 8px 0 2px; }
.wc-status { font-size: 12px; color: var(--muted-text-color); margin-top: 6px; }
.wc-status[hidden] { display: none; }
.wc-status.wc-error { color: var(--main-text-color); }
.wc-status.wc-error:hover { text-decoration: underline; cursor: pointer; }
@media (prefers-reduced-motion: reduce) {
    .wc-fill { transition: none !important; }
}
`;

// ─── Template ────────────────────────────────────────────────────────────────

function buildTpl() {
    return `
<div id="wc-root">
    <div class="wc-row" id="wc-daily-row" title="">
        <span class="wc-label">${tr('today')}</span>
        <span class="wc-value"><span id="wc-total">0</span>/<span id="wc-daily-goal">${GOAL_DEFAULT}</span><span class="wc-hit" id="wc-daily-hit" hidden>\u2713 ${tr('goalHit')}</span></span>
    </div>
    <div class="wc-bar" id="wc-daily-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${GOAL_DEFAULT}" aria-valuenow="0" aria-label="${tr('today')}"><div class="wc-fill"></div></div>
    <div class="wc-row" id="wc-weekly-row" title="">
        <span class="wc-label">${tr('week')}</span>
        <span class="wc-value"><span id="wc-weekly">0</span>/<span id="wc-weekly-goal">${WEEKLY_GOAL_DEFAULT}</span><span class="wc-hit" id="wc-weekly-hit" hidden>\u2713 ${tr('goalHit')}</span></span>
    </div>
    <div class="wc-bar" id="wc-weekly-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${WEEKLY_GOAL_DEFAULT}" aria-valuenow="0" aria-label="${tr('week')}"><div class="wc-fill"></div></div>
    <div class="wc-sub">${tr('inNote')}</div>
    <div class="wc-row">
        <span class="wc-label">${tr('words')}</span>
        <span class="wc-value" id="wc-words">\u2026</span>
    </div>
    <div class="wc-row" id="wc-chars-row" title="">
        <span class="wc-label">${tr('chars')}</span>
        <span class="wc-value" id="wc-chars">\u2026</span>
    </div>
    <div class="wc-status" id="wc-status" role="status" aria-live="polite" hidden></div>
</div>`;
}

// ─── Widget ──────────────────────────────────────────────────────────────────

class WordCountWidget extends api.RightPanelWidget {

    get position() { return 1; }
    get parentWidget() { return 'right-pane'; }
    get widgetTitle() { return tr('title'); }

    isEnabled() {
        return !!this.note && this.note.type === 'text';
    }

    doRenderBody() {
        currentWidget = this;
        this.$body.empty();
        this.$body.append($(buildTpl()));
        this.cssBlock(CSS);

        this.$total = this.$body.find('#wc-total');
        this.$dailyGoal = this.$body.find('#wc-daily-goal');
        this.$dailyRow = this.$body.find('#wc-daily-row');
        this.$dailyBar = this.$body.find('#wc-daily-bar');
        this.$dailyFill = this.$dailyBar.find('.wc-fill');
        this.$dailyHit = this.$body.find('#wc-daily-hit');
        this.$weekly = this.$body.find('#wc-weekly');
        this.$weeklyGoal = this.$body.find('#wc-weekly-goal');
        this.$weeklyRow = this.$body.find('#wc-weekly-row');
        this.$weeklyBar = this.$body.find('#wc-weekly-bar');
        this.$weeklyFill = this.$weeklyBar.find('.wc-fill');
        this.$weeklyHit = this.$body.find('#wc-weekly-hit');
        this.$words = this.$body.find('#wc-words');
        this.$chars = this.$body.find('#wc-chars');
        this.$charsRow = this.$body.find('#wc-chars-row');
        this.$status = this.$body.find('#wc-status');

        this._anunciado = this._anunciado || { daily: false, weekly: false };
        this._periodo = this._periodo || { daily: isoHoje(), weekly: isoSemana() };

        this.$status.on('click', () => {
            if (this.$status.hasClass('wc-error')) this._updateNoteCounts();
        });

        if (!bootInitialized) {
            bootInitialized = true;
            ensureRolloverHook();
            pruneStorage();
            initI18n();
        }

        this._renderProgress('daily');
        this._renderProgress('weekly');
    }

    async refreshWithNote() {
        if (!this.isEnabled()) return;
        await this._updateNoteCounts();
    }

    async entitiesReloadedEvent({ loadResults }) {
        if (!this.isEnabled()) return;
        if (!loadResults.isNoteContentReloaded(this.noteId)) return;
        this._scheduleUpdate();
    }

    _scheduleUpdate() {
        if (this._timer) clearTimeout(this._timer);
        const self = this;
        this._timer = setTimeout(function () {
            self._timer = null;
            if (self.isEnabled()) self._updateNoteCounts();
        }, UPDATE_DEBOUNCE_MS);
    }

    async _updateNoteCounts() {
        if (!this.note || this.note.type !== 'text') return;

        const noteId = this.note.noteId;
        const geracao = (this._geracao || 0) + 1;
        this._geracao = geracao;
        this._setStatus('');

        let content = null;
        try {
            content = await this.note.getContent();
        } catch (e) {
            if (geracao !== this._geracao) return;
            console.warn('Word Counter: falha ao ler a nota', e);
            this._setStatus(tr('readError') + ' \u2014 ' + tr('retry'), true);
            return;
        }
        if (geracao !== this._geracao) return;
        if (!this.note || this.note.noteId !== noteId) return;

        if (this.note.isProtected && !content) {
            this._setStatus(tr('protected'), true);
            return;
        }

        const html = content || '';
        const words = countWords(html);
        const charsSem = countChars(html, false);
        const charsCom = countChars(html, true);

        this.$words.text(fmtNum(words));
        this.$chars.text(fmtNum(charsSem));
        this.$charsRow.attr('title', tr('charsTip', { a: fmtNum(charsSem), b: fmtNum(charsCom) }));

        this._track('daily', noteId, words);
        this._track('weekly', noteId, words);
    }

    _track(scope, noteId, currentWords) {
        const key = this._periodKey(scope);
        const store = this._readStore(key);
        progressApply(store, noteId, currentWords);
        this._writeStore(key, store);
        this._renderProgress(scope, progressTotal(store));
    }

    _periodKey(scope) {
        return scope === 'daily' ? 'wc-' + isoHoje() : 'wcw-' + isoSemana();
    }

    _readStore(key) {
        const raw = lsGet(key);
        const parsed = raw ? parseProgressStore(raw) : null;
        return parsed || { v: 2, notes: {} };
    }

    _writeStore(key, store) {
        lsSet(key, JSON.stringify(store));
    }

    _renderProgress(scope, total) {
        const diario = scope === 'daily';
        const $row = diario ? this.$dailyRow : this.$weeklyRow;
        const $bar = diario ? this.$dailyBar : this.$weeklyBar;
        const $fill = diario ? this.$dailyFill : this.$weeklyFill;
        const $num = diario ? this.$total : this.$weekly;
        const $goalTxt = diario ? this.$dailyGoal : this.$weeklyGoal;
        const $hit = diario ? this.$dailyHit : this.$weeklyHit;
        const chave = this._periodKey(scope);

        if (this._periodo[scope] !== chave) {
            this._periodo[scope] = chave;
            this._anunciado[scope] = false;
        }

        const goal = this._readGoal(diario ? 'dailyGoal' : 'weeklyGoal', diario ? GOAL_DEFAULT : WEEKLY_GOAL_DEFAULT);
        const store = (total !== undefined) ? null : this._readStore(chave);
        const t = (total !== undefined) ? total : progressTotal(store);
        const nNotas = store ? Object.keys(store.notes).length : 0;
        const atingiu = t >= goal;
        const pct = goal > 0 ? Math.min(100, Math.round((t / goal) * 100)) : 0;

        $num.text(fmtNum(t));
        $goalTxt.text(fmtNum(goal));
        $fill.css('width', pct + '%');
        $row.toggleClass('wc-goal-hit', atingiu);
        $hit.prop('hidden', !atingiu);
        $row.attr('title', tr(diario ? 'todayTip' : 'weekTip', { n: nNotas }));
        $bar.attr({
            'aria-valuemax': goal,
            'aria-valuenow': t,
            'aria-valuetext': fmtNum(t) + ' / ' + fmtNum(goal) + (atingiu ? ' \u2014 ' + tr('goalHit') : '')
        });

        if (atingiu && !this._anunciado[scope]) {
            this._anunciado[scope] = true;
            this._anunciar(tr('goalAnnounce', { n: fmtNum(t), goal: fmtNum(goal) }));
        }
    }

    _anunciar(texto) {
        if (this.$status) this.$status.prop('hidden', false).text(texto).removeClass('wc-error');
    }

    _setStatus(texto, erro) {
        if (!this.$status) return;
        this.$status.text(texto || '')
            .toggleClass('wc-error', !!erro)
            .prop('hidden', !texto);
        if (texto && erro) this.$status.attr('title', tr('retry'));
    }

    _readGoal(label, fallback) {
        if (this.note) {
            try {
                const v = this.note.getLabelValue(label);
                if (v !== null && v !== undefined) return parseGoalValue(v, fallback);
            } catch (_) {}
        }
        return fallback;
    }
}

function ensureRolloverHook() {
    if (typeof window === 'undefined' || window.__wcRollover) return;
    window.__wcRollover = true;
    const handler = function () {
        if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
        if (currentWidget && currentWidget.isEnabled && currentWidget.isEnabled()) {
            currentWidget.doRenderBody();
            currentWidget._updateNoteCounts();
        }
    };
    window.addEventListener('visibilitychange', handler);
    window.addEventListener('focus', handler);
}

function pruneStorage() {
    try {
        const hoje = isoHoje();
        const semana = isoSemana();
        const partes = semana.split('-');
        const removidas = pruneOldKeys(lsKeys(), hoje, Number(partes[0]), Number(partes[1]));
        removidas.forEach(lsRemove);
    } catch (_) {}
}

module.exports = new WordCountWidget();
