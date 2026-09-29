/**
 * Daily Note Navigator — TriliumNext Widget
 * MIME: application/javascript;env=frontend
 * Label: #widget
 *
 * Navigate between daily journal notes with keyboard, cache, and monthly jumps.
 *
 * Navigation is READ-ONLY: it never creates day notes by itself. Days without a
 * note show a notice with a "Create note" action (audit round 8, decision by the owner).
 * Keyboard is scoped to the widget (it does not steal arrows from the editor).
 */

const DNN_DAY_CACHE_MAX = 60;

let _lang = (typeof navigator !== 'undefined' && navigator.language ? String(navigator.language) : 'pt').toLowerCase().indexOf('en') === 0 ? 'en' : 'pt';
let currentWidget = null;
let bootInitialized = false;

// ─── Funções puras (marcadores usados pelo harness) ──────────────────────────

/* DNN-DATE (início) */
function pad2(n) { return (n < 10 ? '0' : '') + n; }

function isoLocal(d) {
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
}

function parseIso(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso == null ? '' : iso));
    if (!m) return null;
    const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
    const dt = new Date(y, mo - 1, d, 12, 0, 0);
    if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
    return { y: y, m: mo, d: d };
}

function addDays(iso, n) {
    const p = parseIso(iso);
    if (!p) return null;
    return isoLocal(new Date(p.y, p.m - 1, p.d + n, 12, 0, 0));
}

function addMonthsClamped(iso, n) {
    const p = parseIso(iso);
    if (!p) return null;
    const alvo = new Date(p.y, p.m - 1 + n, 1, 12, 0, 0);
    const ultimoDia = new Date(alvo.getFullYear(), alvo.getMonth() + 1, 0, 12, 0, 0).getDate();
    return isoLocal(new Date(alvo.getFullYear(), alvo.getMonth(), Math.min(p.d, ultimoDia), 12, 0, 0));
}

function todayIso(now) {
    return isoLocal(now instanceof Date ? now : new Date());
}
/* DNN-DATE (fim) */

/* DNN-FMT (início) */
const DNN_DIAS = {
    pt: ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 's\u00E1b'],
    en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
};

function formatLabel(iso, lang) {
    const p = parseIso(iso);
    if (!p) return String(iso == null ? '' : iso);
    const dt = new Date(p.y, p.m - 1, p.d, 12, 0, 0);
    const L = lang === 'en' ? 'en' : 'pt';
    const data = L === 'en' ? pad2(p.m) + '/' + pad2(p.d) + '/' + p.y : pad2(p.d) + '/' + pad2(p.m) + '/' + p.y;
    return DNN_DIAS[L][dt.getDay()] + ' ' + data;
}
/* DNN-FMT (fim) */

// ─── I18N ────────────────────────────────────────────────────────────────────

const DNN_I18N = {
    pt: {
        'title': 'Navegador de Di\u00E1rio',
        'prevDay': 'Dia anterior',
        'nextDay': 'Pr\u00F3ximo dia',
        'prevMonth': 'M\u00EAs anterior',
        'nextMonth': 'Pr\u00F3ximo m\u00EAs',
        'today': 'Ir para hoje',
        'barLabel': 'Navega\u00E7\u00E3o do di\u00E1rio',
        'missingDay': 'Sem nota para {date}.',
        'missingMonth': 'Sem nota em {date}.',
        'invalid': 'Data do di\u00E1rio inv\u00E1lida.',
        'navError': 'Falha ao navegar \u2014 tente de novo.',
        'createError': 'Falha ao criar a nota.',
        'create': 'Criar nota',
        'created': 'Nota do dia criada.'
    },
    en: {
        'title': 'Daily Note Navigator',
        'prevDay': 'Previous day',
        'nextDay': 'Next day',
        'prevMonth': 'Previous month',
        'nextMonth': 'Next month',
        'today': 'Go to today',
        'barLabel': 'Daily note navigation',
        'missingDay': 'No note for {date}.',
        'missingMonth': 'No note in {date}.',
        'invalid': 'Invalid day note date.',
        'navError': 'Navigation failed \u2014 try again.',
        'createError': 'Failed to create the note.',
        'create': 'Create note',
        'created': 'Day note created.'
    }
};

function tr(key, vars) {
    const d = DNN_I18N[_lang] || {};
    let s = (d && d[key]) || DNN_I18N.pt[key] || key;
    if (vars) {
        Object.keys(vars).forEach(function (k) {
            s = s.split('{' + k + '}').join(String(vars[k]));
        });
    }
    return s;
}

async function initI18n() {
    try {
        const loc = await api.runOnBackend(() => api.getOption('locale'));
        if (loc) _lang = String(loc).toLowerCase().indexOf('en') === 0 ? 'en' : 'pt';
    } catch (_) {}
    aplicarI18n();
}

function aplicarI18n() {
    const w = currentWidget;
    if (!w || !w.$widget || !w.$bar) return;
    w.$bar.attr('aria-label', tr('barLabel'));
    w.$prevDay.attr({ 'aria-label': tr('prevDay'), 'title': tr('prevDay') });
    w.$nextDay.attr({ 'aria-label': tr('nextDay'), 'title': tr('nextDay') });
    w.$prevMonth.attr({ 'aria-label': tr('prevMonth'), 'title': tr('prevMonth') });
    w.$nextMonth.attr({ 'aria-label': tr('nextMonth'), 'title': tr('nextMonth') });
    w.$today.attr({ 'aria-label': tr('today'), 'title': tr('today') });
    w.$create.text(tr('create'));
    w.refreshWithNote(w.note);
}

// ─── CSS ─────────────────────────────────────────────────────────────────────

const CSS = `
.dnn-root { padding: 0; --dnn-danger: #e57373; }
.dnn-root.dnn-light { --dnn-danger: #b3261e; }
.dnn-bar {
    display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
    padding: 6px 10px;
}
.dnn-btn {
    display: flex; align-items: center; justify-content: center;
    min-height: 36px; min-width: 32px; padding: 4px 8px;
    background: var(--button-background-color, var(--accented-background-color, transparent));
    color: var(--main-text-color);
    border: 1px solid var(--main-border-color);
    border-radius: 4px; cursor: pointer; font-size: 14px; line-height: 1;
    transition: background 0.15s;
}
.dnn-btn:hover:not(:disabled) {
    background: var(--hover-item-background-color, var(--accented-background-color));
}
.dnn-btn:disabled { opacity: 0.55; cursor: not-allowed; }
.dnn-btn:focus-visible,
.dnn-create:focus-visible { outline: 2px solid var(--main-color, #4477aa) !important; outline-offset: 1px; }
.dnn-btn-day { flex: 1; font-size: 16px; }
.dnn-label {
    flex: 2; min-width: 0;
    font-size: 12px; color: var(--main-text-color);
    text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    font-variant-numeric: tabular-nums;
}
.dnn-label.dnn-today { font-weight: 600; }
.dnn-msg {
    display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
    padding: 0 10px 8px; font-size: 12px; color: var(--muted-text-color);
}
.dnn-msg[hidden] { display: none; }
.dnn-msg.dnn-msg-error #dnn-msg-text { color: var(--dnn-danger); }
.dnn-create {
    min-height: 32px; padding: 4px 10px; font-size: 12px; cursor: pointer;
    background: var(--button-background-color, var(--accented-background-color, transparent));
    color: var(--main-text-color);
    border: 1px solid var(--main-border-color); border-radius: 4px;
}
.dnn-create:hover { background: var(--hover-item-background-color, var(--accented-background-color)); }
.dnn-create[hidden] { display: none; }
@media (max-width: 500px) {
    .dnn-bar .dnn-btn { min-height: 44px; min-width: 40px; }
    .dnn-create { min-height: 40px; }
}
@media (prefers-reduced-motion: reduce) {
    .dnn-root, .dnn-root * { transition: none !important; animation: none !important; }
}
`;

// ─── Template ────────────────────────────────────────────────────────────────

function buildTpl() {
    return `
<div class="dnn-root">
    <div class="dnn-bar" role="group" aria-label="${tr('barLabel')}">
        <button class="dnn-btn" id="dnn-prev-month" type="button" aria-label="${tr('prevMonth')}" title="${tr('prevMonth')}"><span aria-hidden="true">\u00AB</span></button>
        <button class="dnn-btn dnn-btn-day" id="dnn-prev-day" type="button" aria-label="${tr('prevDay')}" title="${tr('prevDay')}"><span aria-hidden="true">\u2190</span></button>
        <span class="dnn-label" id="dnn-label" role="status" aria-live="polite" title=""></span>
        <button class="dnn-btn dnn-btn-day" id="dnn-next-day" type="button" aria-label="${tr('nextDay')}" title="${tr('nextDay')}"><span aria-hidden="true">\u2192</span></button>
        <button class="dnn-btn" id="dnn-next-month" type="button" aria-label="${tr('nextMonth')}" title="${tr('nextMonth')}"><span aria-hidden="true">\u00BB</span></button>
        <button class="dnn-btn" id="dnn-today" type="button" aria-label="${tr('today')}" title="${tr('today')}"><span class="bx bx-calendar" aria-hidden="true"></span></button>
    </div>
    <div class="dnn-msg" id="dnn-msg" hidden>
        <span id="dnn-msg-text"></span>
        <button class="dnn-create" id="dnn-create" type="button" hidden>${tr('create')}</button>
    </div>
</div>`;
}

// ─── Widget ──────────────────────────────────────────────────────────────────

class DayNoteNavigatorWidget extends api.RightPanelWidget {
    get position() { return 110; }
    get parentWidget() { return 'right-pane'; }
    get widgetTitle() { return tr('title'); }

    constructor() {
        super();
        this._dayCache = new Map();
        this._resetTimer = null;
        this._busy = false;
        this._createIso = null;
    }

    _dateOf(note) {
        try { return note ? note.getLabelValue('dateNote') : null; } catch (_) { return null; }
    }

    isEnabled() {
        return !!this.note && !!parseIso(this._dateOf(this.note));
    }

    _getDateStr() {
        return this._dateOf(this.note);
    }

    doRenderBody() {
        currentWidget = this;

        this.$widget = $(buildTpl());
        this.cssBlock(CSS);

        this.$root = this.$widget.find('.dnn-root');
        this.$bar = this.$widget.find('.dnn-bar');
        this.$label = this.$widget.find('#dnn-label');
        this.$prevDay = this.$widget.find('#dnn-prev-day');
        this.$nextDay = this.$widget.find('#dnn-next-day');
        this.$prevMonth = this.$widget.find('#dnn-prev-month');
        this.$nextMonth = this.$widget.find('#dnn-next-month');
        this.$today = this.$widget.find('#dnn-today');
        this.$msg = this.$widget.find('#dnn-msg');
        this.$msgText = this.$widget.find('#dnn-msg-text');
        this.$create = this.$widget.find('#dnn-create');

        this.$prevDay.on('click', () => this._navigate(-1));
        this.$nextDay.on('click', () => this._navigate(+1));
        this.$prevMonth.on('click', () => this._navigateMonth(-1));
        this.$nextMonth.on('click', () => this._navigateMonth(+1));
        this.$today.on('click', () => this._goToday());
        this.$create.on('click', () => this._criarNota(this._createIso));
        this.$msg.on('click', (e) => { if (e.target === this.$msg[0]) this._ocultarMsg(); });

        // Teclado escopado ao widget (não sequestra setas do editor/árvore).
        this.$widget.on('keydown.dnn', (e) => {
            if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
            const k = e.key;
            if (k === 'ArrowLeft') { e.preventDefault(); this._navigate(-1); }
            else if (k === 'ArrowRight') { e.preventDefault(); this._navigate(+1); }
            else if (k === 'PageUp') { e.preventDefault(); this._navigateMonth(-1); }
            else if (k === 'PageDown') { e.preventDefault(); this._navigateMonth(+1); }
            else if (k === 't' || k === 'T') { e.preventDefault(); this._goToday(); }
        });

        detectarTema(this.$root);

        if (!bootInitialized) {
            bootInitialized = true;
            initI18n();
        }

        this.refreshWithNote(this.note);

        return this.$widget;
    }

    cleanup() {
        if (this._resetTimer) { clearTimeout(this._resetTimer); this._resetTimer = null; }
        if (this.$widget) this.$widget.off('.dnn');
    }

    refreshWithNote(note) {
        currentWidget = this;
        if (!this.$widget) return;
        const dateStr = this._dateOf(note || this.note);
        this._ocultarMsg();
        this._setBusy(false);
        this._renderLabel(dateStr);
    }

    _renderLabel(iso) {
        if (!this.$label) return;
        if (!parseIso(iso)) { this.$label.text(''); return; }
        this.$label.text(formatLabel(iso, _lang));
        try {
            this.$label.attr('title', new Date(iso + 'T12:00:00').toLocaleDateString(_lang === 'en' ? 'en-US' : 'pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
        } catch (_) { this.$label.attr('title', formatLabel(iso, _lang)); }
        const hoje = iso === todayIso();
        this.$label.toggleClass('dnn-today', hoje).attr('aria-current', hoje ? 'date' : null);
        const anterior = addDays(iso, -1), proximo = addDays(iso, +1);
        const mesAnterior = addMonthsClamped(iso, -1), mesProximo = addMonthsClamped(iso, +1);
        if (anterior) this.$prevDay.attr('title', tr('prevDay') + ' \u2014 ' + formatLabel(anterior, _lang));
        if (proximo) this.$nextDay.attr('title', tr('nextDay') + ' \u2014 ' + formatLabel(proximo, _lang));
        if (mesAnterior) this.$prevMonth.attr('title', tr('prevMonth') + ' \u2014 ' + formatLabel(mesAnterior, _lang));
        if (mesProximo) this.$nextMonth.attr('title', tr('nextMonth') + ' \u2014 ' + formatLabel(mesProximo, _lang));
    }

    _setBusy(on) {
        this._busy = on;
        if (!this.$bar) return;
        this.$bar.attr('aria-busy', on ? 'true' : 'false');
        [this.$prevDay, this.$nextDay, this.$prevMonth, this.$nextMonth, this.$today, this.$create].forEach(($b) => {
            if ($b) $b.prop('disabled', on);
        });
    }

    _mostrarMsg(texto, erro, criarIso) {
        if (!this.$msg) return;
        this.$msgText.text(texto || '');
        this.$msg.toggleClass('dnn-msg-error', !!erro).prop('hidden', !texto);
        this._createIso = criarIso || null;
        this.$create.prop('hidden', !criarIso);
        clearTimeout(this._resetTimer);
        if (!criarIso && texto && !erro) {
            this._resetTimer = setTimeout(() => this._ocultarMsg(), 2500);
        }
    }

    _ocultarMsg() {
        if (!this.$msg) return;
        this.$msg.prop('hidden', true);
        this._createIso = null;
        if (this.$create) this.$create.prop('hidden', true);
    }

    async _navigate(offset) {
        const dateStr = this._getDateStr();
        if (!parseIso(dateStr)) { this._mostrarMsg(tr('invalid'), true); return; }
        await this._goTo(addDays(dateStr, offset), 'day');
    }

    async _navigateMonth(offset) {
        const dateStr = this._getDateStr();
        if (!parseIso(dateStr)) { this._mostrarMsg(tr('invalid'), true); return; }
        await this._goTo(addMonthsClamped(dateStr, offset), 'month');
    }

    async _goToday() {
        await this._goTo(todayIso(), 'day');
    }

    async _goTo(iso, tipo) {
        if (!parseIso(iso)) { this._mostrarMsg(tr('invalid'), true); return; }
        if (this._busy) return;
        this._setBusy(true);
        try {
            const nota = await this._findDayNote(iso);
            if (nota) {
                this._ocultarMsg();
                this._renderLabel(iso);
                await api.activateNote(nota.noteId);
            } else {
                this._mostrarMsg(
                    tr(tipo === 'month' ? 'missingMonth' : 'missingDay', { date: formatLabel(iso, _lang) }),
                    false,
                    tipo === 'day' ? iso : null
                );
            }
        } catch (e) {
            console.warn('[DayNoteNav] navegação falhou:', e);
            this._mostrarMsg(tr('navError'), true);
        } finally {
            this._setBusy(false);
        }
    }

    async _findDayNote(iso) {
        if (this._dayCache.has(iso)) return this._dayCache.get(iso);
        const achado = await api.searchForNote('#dateNote="' + iso + '"');
        let nota = null;
        if (achado && typeof achado.getLabelValue === 'function' && achado.getLabelValue('dateNote') === iso) {
            nota = achado;
        }
        if (nota) {
            this._dayCache.set(iso, nota);
            if (this._dayCache.size > DNN_DAY_CACHE_MAX) {
                this._dayCache.delete(this._dayCache.keys().next().value);
            }
        }
        return nota;
    }

    async _criarNota(iso) {
        if (!parseIso(iso) || this._busy) return;
        this._setBusy(true);
        try {
            const nota = await api.getDayNote(iso); // ação explícita do usuário
            if (nota) {
                this._dayCache.set(iso, nota);
                this._ocultarMsg();
                this._renderLabel(iso);
                await api.activateNote(nota.noteId);
                try { api.showMessage(tr('created')); } catch (_) {}
            } else {
                this._mostrarMsg(tr('createError'), true);
            }
        } catch (e) {
            console.warn('[DayNoteNav] criar nota falhou:', e);
            this._mostrarMsg(tr('createError'), true);
        } finally {
            this._setBusy(false);
        }
    }
}

function detectarTema($root) {
    try {
        const bg = getComputedStyle(document.documentElement).getPropertyValue('--main-background-color') || '#ffffff';
        const nums = bg.match(/\d+/g);
        if (!nums) return;
        const l = (0.299 * Number(nums[0]) + 0.587 * Number(nums[1] || nums[0]) + 0.114 * Number(nums[2] || nums[0])) / 255;
        $root.toggleClass('dnn-light', l > 0.6);
    } catch (_) {}
}

module.exports = new DayNoteNavigatorWidget();
