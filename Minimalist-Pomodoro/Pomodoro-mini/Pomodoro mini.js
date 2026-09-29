/**
 * Pomodoro Timer + Time Tracker for TriliumNext
 * Widget de painel — right-pane (ou left-pane).
 *
 * Como usar:
 * 1. Crie uma nota "JS Frontend" no TriliumNext
 * 2. Cole este arquivo inteiro na nota
 * 3. Adicione a etiqueta: #widget
 * 4. Recarregue o Trilium (Ctrl+R)
 */

// ─── Constantes ──────────────────────────────────────────────────────────────

const WORK_SECS  = 25 * 60;
const BREAK_SECS =  5 * 60;
const TICK_MS    = 1000;

const STORAGE = {
    pending: 'pomo-report-pending',
    seconds: 'pomo-seconds',
    isWork: 'pomo-isWork',
    sessionEnd: 'pomo-session-end'
};

// ─── Estado global ───────────────────────────────────────────────────────────

let timerInterval  = null;
let running        = false;
let seconds        = WORK_SECS;
let isWorkSession  = true;
let cycleCount     = 0;

let sessionEndTime   = null;
let sessionStartDate = null;

let noteTimes     = new Map();   // noteId -> { title, ms }
let lastNoteId    = null;
let lastNoteTitle = '';
let lastTick      = 0;           // timestamp (ms) da âncora atual; 0 = sem âncora

let currentWidget    = null;
let saving           = false;
let bootInitialized  = false;
let _lastShownTime   = '';
let _lastShownMinute = -1;
let _lang = (typeof navigator !== 'undefined' && navigator.language ? String(navigator.language) : 'pt').toLowerCase().indexOf('en') === 0 ? 'en' : 'pt';

// ─── Storage com degradação segura ───────────────────────────────────────────

function storageGet(k) {
    try { return localStorage.getItem(k); } catch (_) { return null; }
}
function storageSet(k, v) {
    try { localStorage.setItem(k, v); return true; } catch (_) { return false; }
}
function storageRemove(k) {
    try { localStorage.removeItem(k); } catch (_) {}
}

// ─── Helpers puros (marcadores usados pelo harness) ──────────────────────────

/* POMO-FMT (início) */
function formatTime(secs) {
    const s = Number.isFinite(Number(secs)) && Number(secs) > 0 ? Math.floor(Number(secs)) : 0;
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m + ':' + (sec < 10 ? '0' : '') + sec;
}
/* POMO-FMT (fim) */

/* POMO-NEXT (início) */
function nextSession(isWork, cycle) {
    if (isWork) return { isWork: false, seconds: BREAK_SECS, cycle: cycle + 1 };
    return { isWork: true, seconds: WORK_SECS, cycle: cycle };
}
/* POMO-NEXT (fim) */

/* POMO-REPORT (início) */
function escHtml(s) {
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function buildReportRows(entries) {
    let rows = '';
    for (const e of entries) {
        const secs = Math.round((e.ms || 0) / 1000);
        const id = /^[A-Za-z0-9_]+$/.test(String(e.id || '')) ? String(e.id) : '';
        const label = escHtml(e.title || '');
        rows += '<tr><td>' + (id ? '<a class="reference-link" href="#root/' + id + '">' + label + '</a>' : label) +
            '</td><td>' + formatTime(secs) + '</td></tr>\n';
    }
    return rows;
}

function buildReportHtml(opts) {
    const entries = opts.entries || [];
    const totalSecs = entries.reduce(function (s, e) { return s + Math.round((e.ms || 0) / 1000); }, 0);
    let cycles = '';
    if (opts.cycleCount > 0) {
        cycles = '<p><strong>' + tr('report.cycles') + ':</strong> ' + opts.cycleCount +
            (opts.cycleCount > 1 ? ' ' + tr('report.chained') : '') + ' \u2014 ' +
            Math.round(opts.workSecs / 60) + 'min ' + tr('focus') + ' + ' +
            Math.round(opts.breakSecs / 60) + 'min ' + tr('pausa') + '</p>\n';
    }
    return '<h1>' + tr('report.title') + ' \u2014 ' + escHtml(opts.when) + '</h1>\n' +
        cycles +
        '<p><strong>' + tr('report.total') + ':</strong> ' + formatTime(totalSecs) + '</p>\n' +
        '<table>\n<thead><tr><th>' + tr('report.note') + '</th><th>' + tr('report.time') + '</th></tr></thead>\n<tbody>\n' +
        buildReportRows(entries) +
        '<tr><td><strong>' + tr('report.total') + '</strong></td><td><strong>' + formatTime(totalSecs) + '</strong></td></tr>\n' +
        '</tbody>\n</table>';
}
/* POMO-REPORT (fim) */

/* POMO-RESTORE (início) */
function parseTrackingData(raw) {
    let data = null;
    try { data = JSON.parse(raw); } catch (_) { return null; }
    if (!data || typeof data !== 'object') return null;

    const notas = new Map();
    if (data.noteTimes && typeof data.noteTimes === 'object') {
        for (const [id, v] of Object.entries(data.noteTimes)) {
            if (!v || typeof v !== 'object') continue;
            if (!/^[A-Za-z0-9_]+$/.test(String(id))) continue;
            const msDireto = Number(v.ms);
            const ms = Number.isFinite(msDireto) ? msDireto
                : (Number.isFinite(Number(v.secs)) ? Number(v.secs) * 1000 : 0);
            if (!(ms > 0)) continue;
            notas.set(String(id), { title: typeof v.title === 'string' ? v.title : '', ms: ms });
        }
    }
    const num = function (x, d) { return Number.isFinite(Number(x)) ? Number(x) : d; };
    return {
        noteTimes: notas,
        cycleCount: Math.max(0, Math.floor(num(data.cycleCount, 0))),
        lastNoteId: typeof data.lastNoteId === 'string' ? data.lastNoteId : null,
        lastNoteTitle: typeof data.lastNoteTitle === 'string' ? data.lastNoteTitle : '',
        lastTick: num(data.lastTick, 0),
        sessionStartDate: typeof data.sessionStartDate === 'string' ? data.sessionStartDate : null
    };
}
/* POMO-RESTORE (fim) */

// ─── Persistência ────────────────────────────────────────────────────────────

function persistTrackingData() {
    const obj = {};
    for (const [id, v] of noteTimes) obj[id] = { title: v.title, ms: v.ms };
    return storageSet(STORAGE.pending, JSON.stringify({
        v: 1,
        noteTimes: obj,
        cycleCount: cycleCount,
        lastNoteId: lastNoteId,
        lastNoteTitle: lastNoteTitle,
        lastTick: lastTick,
        sessionStartDate: sessionStartDate,
        savedAt: Date.now()
    }));
}

function clearTrackingData() {
    storageRemove(STORAGE.pending);
}

function restoreTrackingData() {
    const raw = storageGet(STORAGE.pending);
    if (!raw) return false;
    const parsed = parseTrackingData(raw);
    if (!parsed) {
        console.warn('Pomodoro: estado pendente corrompido (preservado no localStorage).');
        return false;
    }
    if (noteTimes.size === 0) {
        noteTimes = parsed.noteTimes;
        cycleCount = Math.max(cycleCount, parsed.cycleCount);
        lastNoteId = parsed.lastNoteId;
        lastNoteTitle = parsed.lastNoteTitle;
        // Reancora o relógio: o tempo offline não é creditado a nenhuma nota.
        lastTick = parsed.lastTick > 0 ? Date.now() : 0;
        if (!sessionStartDate) sessionStartDate = parsed.sessionStartDate;
    }
    return noteTimes.size > 0;
}

function persistTimerState() {
    storageSet(STORAGE.seconds, String(seconds));
    storageSet(STORAGE.isWork, isWorkSession ? '1' : '0');
    if (sessionEndTime) storageSet(STORAGE.sessionEnd, String(sessionEndTime));
    else storageRemove(STORAGE.sessionEnd);
}

// Instalado uma única vez por página (sem acúmulo em re-render do widget).
function installUnloadHook() {
    if (typeof window === 'undefined' || window.__pomoUnload) return;
    window.__pomoUnload = true;
    window.addEventListener('beforeunload', function () {
        flushNoteTime();
        if (noteTimes.size > 0) persistTrackingData();
    });
}

// ─── Tempo por nota ──────────────────────────────────────────────────────────

function flushNoteTime(now) {
    if (!lastNoteId || !lastTick) return;
    const delta = (now || Date.now()) - lastTick;
    if (delta > 0) {
        const prev = noteTimes.get(lastNoteId) || { title: lastNoteTitle, ms: 0 };
        prev.ms += delta;
        if (!prev.title) prev.title = lastNoteTitle;
        noteTimes.set(lastNoteId, prev);
    }
    lastTick = 0;
}

function hasTrackingData() {
    return noteTimes.size > 0 || (lastNoteId && lastTick > 0);
}

function anchorToNote(note) {
    if (!note) { lastNoteId = null; lastNoteTitle = ''; lastTick = 0; return; }
    lastNoteId = note.noteId;
    lastNoteTitle = note.title;
    lastTick = Date.now();
}

// ─── I18N ────────────────────────────────────────────────────────────────────

const POMO_I18N = {
    pt: {
        'focus': 'Foco',
        'pausa': 'Pausa',
        'idle': 'Parado',
        'cycle': 'Ciclo {n}',
        'start': 'Iniciar',
        'resume': 'Retomar',
        'pause': 'Pausar',
        'stop': 'Encerrar e salvar',
        'stop.confirm': 'Confirmar? Clique de novo para encerrar',
        'report.btn': 'Salvar relatório',
        'report.pending': 'Relatório pendente \u2014 salvar',
        'report.saving': 'Salvando\u2026',
        'report.empty': 'Nada para salvar ainda.',
        'report.saved': 'Relatório salvo.',
        'report.saved.day': 'Relatório salvo na nota do dia.',
        'report.saved.ctx': 'Relatório salvo como filha da nota atual.',
        'report.error': 'Erro ao salvar relatório: {msg}',
        'report.title': 'Relat\u00F3rio Pomodoro',
        'report.cycles': 'Ciclos completos',
        'report.chained': '(emendados em sequ\u00EAncia)',
        'report.total': 'Tempo total',
        'report.note': 'Nota',
        'report.time': 'Tempo',
        'live.focus': 'Foco de {n} minuto(s) iniciado.',
        'live.break': 'Pausa de {n} minuto(s) iniciada.',
        'live.stopped': 'Sess\u00E3o encerrada.',
        'live.pending': 'Relat\u00F3rio pendente.',
        'timer.aria': '{time} restantes',
        'stop.aria': 'Encerrar sess\u00E3o e salvar relatório',
        'report.aria': 'Salvar relatório agora'
    },
    en: {
        'focus': 'Focus',
        'pausa': 'Break',
        'idle': 'Stopped',
        'cycle': 'Cycle {n}',
        'start': 'Start',
        'resume': 'Resume',
        'pause': 'Pause',
        'stop': 'Stop and save',
        'stop.confirm': 'Confirm? Click again to stop',
        'report.btn': 'Save report',
        'report.pending': 'Pending report \u2014 save',
        'report.saving': 'Saving\u2026',
        'report.empty': 'Nothing to save yet.',
        'report.saved': 'Report saved.',
        'report.saved.day': 'Report saved to the day note.',
        'report.saved.ctx': 'Report saved as a child of the current note.',
        'report.error': 'Failed to save report: {msg}',
        'report.title': 'Pomodoro Report',
        'report.cycles': 'Completed cycles',
        'report.chained': '(chained in sequence)',
        'report.total': 'Total time',
        'report.note': 'Note',
        'report.time': 'Time',
        'live.focus': '{n}-minute focus started.',
        'live.break': '{n}-minute break started.',
        'live.stopped': 'Session stopped.',
        'live.pending': 'Pending report.',
        'timer.aria': '{time} remaining',
        'stop.aria': 'Stop the session and save the report',
        'report.aria': 'Save the report now'
    }
};

function tr(key, vars) {
    const d = POMO_I18N[_lang] || {};
    let s = (d && d[key]) || POMO_I18N.pt[key] || key;
    if (vars) {
        Object.keys(vars).forEach(function (k) {
            s = s.split('{' + k + '}').join(String(vars[k]));
        });
    }
    return s;
}

function applyI18n() {
    if (!currentWidget) return;
    currentWidget.$pending.text(tr('report.pending'));
    _lastShownTime = '';
    _lastShownMinute = -1;
    currentWidget._updateUI();
}

async function initI18n() {
    try {
        const loc = await api.runOnBackend(() => api.getOption('locale'));
        if (loc) _lang = String(loc).toLowerCase().indexOf('en') === 0 ? 'en' : 'pt';
    } catch (_) {}
    applyI18n();
}

// ─── CSS ─────────────────────────────────────────────────────────────────────

const CSS = `
.pomo-widget {
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
}
.pomo-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
}
.pomo-cycle {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--muted-text-color);
    font-weight: 600;
}
#pomo-status {
    font-size: 11px;
    color: var(--muted-text-color);
    text-transform: uppercase;
    letter-spacing: 1px;
}
#pomo-timer {
    font-size: 32px;
    text-align: center;
    font-variant-numeric: tabular-nums;
    color: var(--main-text-color);
    font-weight: 600;
    line-height: 1;
    padding: 4px 0;
}
.pomo-row {
    display: flex;
    gap: 6px;
    justify-content: center;
}
.pomo-row button {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1;
    min-height: 40px;
    border: 1px solid var(--main-border-color);
    border-radius: 6px;
    background: var(--button-background-color);
    color: var(--main-text-color);
    cursor: pointer;
    font-size: 18px;
    line-height: 1;
    transition: background 0.15s;
}
.pomo-row button:hover:not(:disabled) {
    background: var(--hover-item-background-color, var(--cmd-button-hover-background-color, var(--accented-background-color)));
}
.pomo-row button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}
.pomo-row button.armed {
    background: var(--main-color, #4477aa);
    border-color: var(--main-color, #4477aa);
    color: #fff;
}
.pomo-row button:focus-visible,
.pomo-pending:focus-visible {
    outline: 2px solid var(--main-color, #4477aa) !important;
    outline-offset: 1px;
}
#pomo-report {
    font-size: 16px;
}
.pomo-pending {
    display: none;
    width: 100%;
    padding: 4px 8px;
    min-height: 32px;
    border: 1px dashed var(--main-border-color);
    border-radius: 6px;
    background: transparent;
    color: var(--muted-text-color);
    font-size: 12px;
    cursor: pointer;
    text-align: center;
}
.pomo-pending:hover:not(:disabled) {
    color: var(--main-text-color);
    background: var(--hover-item-background-color, var(--accented-background-color));
}
.pomo-sr-only {
    position: absolute;
    width: 1px; height: 1px;
    margin: -1px; padding: 0;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
    border: 0;
}
@media (max-width: 500px) {
    .pomo-row button { min-height: 44px; }
    .pomo-pending { min-height: 40px; font-size: 13px; }
}
@media (prefers-reduced-motion: reduce) {
    .pomo-widget, .pomo-widget * { transition: none !important; animation: none !important; }
}
`;

// ─── Template HTML ────────────────────────────────────────────────────────────

function buildTpl() {
    return `
<div class="pomo-widget">
    <div class="pomo-header">
        <span class="pomo-cycle" id="pomo-cycle"></span>
        <span id="pomo-status"></span>
    </div>
    <div id="pomo-timer" role="timer">${formatTime(WORK_SECS)}</div>
    <div class="pomo-row">
        <button id="pomo-toggle" class="bx bx-play" type="button" aria-label="${tr('start')}"></button>
        <button id="pomo-stop" class="bx bx-stop" type="button" aria-label="${tr('stop.aria')}"></button>
        <button id="pomo-report" class="bx bx-file" type="button" aria-label="${tr('report.aria')}" style="display:none"></button>
    </div>
    <button id="pomo-pending" class="pomo-pending" type="button">${tr('report.pending')}</button>
    <span id="pomo-live" class="pomo-sr-only" role="status" aria-live="polite"></span>
</div>
`;
}

// ─── Widget ───────────────────────────────────────────────────────────────────

class PomodoroWidget extends api.RightPanelWidget {

    get position()     { return 100; }
    get parentWidget() { return 'right-pane'; }
    get widgetTitle()  { return 'Pomodoro'; }

    isEnabled() { return true; }

    doRenderBody() {
        currentWidget = this;

        this.$widget  = $(buildTpl());
        this.cssBlock(CSS);

        this.$timer   = this.$widget.find('#pomo-timer');
        this.$status  = this.$widget.find('#pomo-status');
        this.$cycle   = this.$widget.find('#pomo-cycle');
        this.$toggle  = this.$widget.find('#pomo-toggle');
        this.$stop    = this.$widget.find('#pomo-stop');
        this.$report  = this.$widget.find('#pomo-report');
        this.$pending = this.$widget.find('#pomo-pending');
        this.$live    = this.$widget.find('#pomo-live');
        this._stopArmed = false;

        this.$toggle.on('click', () => running ? this._pause() : this._start());
        this.$stop.on('click',   () => this._stop());
        this.$report.on('click', () => this._saveReport());
        this.$pending.on('click',() => this._saveReport());

        this.$widget.on('keydown', (e) => {
            if (e.target === this.$widget[0]) return;
            const k = String(e.key || '').toLowerCase();
            if (k === 'p') { e.preventDefault(); running ? this._pause() : this._start(); }
            else if (k === 's') { e.preventDefault(); this._saveReport(); }
        });

        if (!bootInitialized) {
            bootInitialized = true;
            installUnloadHook();
            this._loadState();
            restoreTrackingData();
            persistTimerState();
            initI18n();
        }

        this._updateUI();

        return this.$widget;
    }

    refreshWithNote(note) {
        if (!running || !note || !isWorkSession) return;

        const now = Date.now();
        if (lastNoteId && lastNoteId !== note.noteId && lastTick > 0) {
            flushNoteTime(now);
        }
        anchorToNote(note);
    }

    // ── Controles ────────────────────────────────────────────────────────────

    _start() {
        if (running) return;
        running = true;

        if (!sessionStartDate) sessionStartDate = api.dayjs().format('YYYY-MM-DD');
        sessionEndTime = Date.now() + seconds * 1000;

        if (this.note) anchorToNote(this.note);
        else anchorToNote(null);

        timerInterval = setInterval(tickGlobal, TICK_MS);

        persistTimerState();
        persistTrackingData();
        this._updateUI();
    }

    _pause() {
        if (!running) return;
        running = false;
        clearInterval(timerInterval);
        timerInterval  = null;
        sessionEndTime = null;

        flushNoteTime();
        if (noteTimes.size > 0) persistTrackingData();
        else clearTrackingData();
        persistTimerState();
        this._updateUI();
    }

    _disarmStop() {
        if (!this._stopArmed) return;
        this._stopArmed = false;
        if (this._stopTimer) { clearTimeout(this._stopTimer); this._stopTimer = null; }
        this.$stop.removeClass('armed');
    }

    async _stop() {
        if (saving) return;
        if (!this._stopArmed && hasTrackingData()) {
            this._stopArmed = true;
            this.$stop.addClass('armed').attr('title', tr('stop.confirm'));
            clearTimeout(this._stopTimer);
            const self = this;
            this._stopTimer = setTimeout(function () {
                self._stopArmed = false;
                self.$stop.removeClass('armed').attr('title', '');
            }, 4000);
            return;
        }
        this._disarmStop();

        clearInterval(timerInterval);
        timerInterval  = null;
        running        = false;
        sessionEndTime = null;

        flushNoteTime();

        let ok = true;
        if (noteTimes.size > 0) ok = await this._saveReport();

        if (!ok) {
            persistTrackingData();
            this._updateUI();
            return;
        }

        seconds        = WORK_SECS;
        isWorkSession  = true;
        cycleCount     = 0;
        noteTimes.clear();
        lastNoteId     = null;
        lastNoteTitle  = '';
        lastTick       = 0;
        sessionStartDate = null;
        clearTrackingData();

        persistTimerState();
        this._updateUI();
        this._setLive(tr('live.stopped'));
    }

    // ── Tick (wall-clock) ─────────────────────────────────────────────────────

    _tick() {
        if (!sessionEndTime) return;
        const remaining = Math.max(0, Math.round((sessionEndTime - Date.now()) / 1000));

        if (remaining <= 0) {
            seconds = 0;
            this._renderTimer(0);
            this._finishSession();
            return;
        }

        seconds = remaining;
        this._renderTimer(seconds);
    }

    _renderTimer(secs) {
        const texto = formatTime(secs);
        if (texto !== _lastShownTime) {
            _lastShownTime = texto;
            this.$timer.text(texto);
        }
        const minuto = Math.floor(secs / 60);
        if (minuto !== _lastShownMinute) {
            _lastShownMinute = minuto;
            this.$timer.attr('aria-label', tr('timer.aria', { time: texto }));
        }
    }

    _finishSession() {
        flushNoteTime();

        const proxima = nextSession(isWorkSession, cycleCount);
        const entrandoEmPausa = isWorkSession;
        isWorkSession = proxima.isWork;
        seconds       = proxima.seconds;
        cycleCount    = proxima.cycle;

        sessionEndTime = Date.now() + seconds * 1000;

        if (entrandoEmPausa) {
            lastTick = 0; // pausa não é tempo de trabalho de nenhuma nota
        } else if (this.note) {
            anchorToNote(this.note);
        }

        if (!timerInterval) timerInterval = setInterval(tickGlobal, TICK_MS);

        _lastShownTime = '';
        _lastShownMinute = -1;
        this._renderTimer(seconds);
        persistTimerState();
        persistTrackingData();
        this._updateUI();
        this._setLive(entrandoEmPausa
            ? tr('live.break', { n: Math.round(BREAK_SECS / 60) })
            : tr('live.focus', { n: Math.round(WORK_SECS / 60) }));
    }

    // ── UI ────────────────────────────────────────────────────────────────────

    _setLive(texto) {
        if (this.$live) this.$live.text(texto || '');
    }

    _updateUI() {
        this._renderTimer(seconds);

        if (running) {
            this.$toggle.removeClass('bx-play').addClass('bx-pause').attr('title', tr('pause'));
            this.$toggle.attr('aria-label', tr('pause'));
        } else {
            this.$toggle.removeClass('bx-pause').addClass('bx-play').attr('title', tr('start'));
            this.$toggle.attr('aria-label', seconds < WORK_SECS || !isWorkSession ? tr('resume') : tr('start'));
        }

        this.$cycle.text(cycleCount > 0 ? tr('cycle', { n: cycleCount }) : '');
        this.$status.text(isWorkSession ? tr('focus') : tr('pausa'));

        const hasData = noteTimes.size > 0;
        this.$report.toggle(hasData && !saving).prop('disabled', saving).attr('aria-label', tr('report.aria'));
        this.$stop.prop('disabled', saving).attr({
            'aria-label': tr('stop.aria'),
            'title': this._stopArmed ? tr('stop.confirm') : ''
        });
        this.$pending
            .toggle(hasData && !!storageGet(STORAGE.pending))
            .prop('disabled', saving)
            .text(saving ? tr('report.saving') : tr('report.pending'));
    }

    // ── Persistência do estado do timer ──────────────────────────────────────

    _loadState() {
        const savedEnd = Number(storageGet(STORAGE.sessionEnd));
        const savedSecs = Number(storageGet(STORAGE.seconds));
        const savedWork = storageGet(STORAGE.isWork);

        if (savedWork !== null) isWorkSession = savedWork !== '0';

        if (Number.isFinite(savedEnd) && savedEnd > 0) {
            const remaining = Math.max(0, Math.round((savedEnd - Date.now()) / 1000));
            if (remaining > 0) {
                seconds = remaining;
                sessionEndTime = savedEnd;
                running = true;
                if (this.note) anchorToNote(this.note);
                timerInterval = setInterval(tickGlobal, TICK_MS);
                return;
            }
            seconds = isWorkSession ? WORK_SECS : BREAK_SECS;
            return;
        }

        if (Number.isFinite(savedSecs) && savedSecs > 0) seconds = savedSecs;
        else seconds = isWorkSession ? WORK_SECS : BREAK_SECS;
    }

    // ── Relatório ─────────────────────────────────────────────────────────────

    async _saveReport() {
        if (saving) return false;

        flushNoteTime();
        if (noteTimes.size === 0) {
            api.showMessage(tr('report.empty'));
            return true;
        }

        saving = true;
        this._updateUI();

        try {
            const entries = [];
            for (const [id, v] of noteTimes) entries.push({ id: id, title: v.title, ms: v.ms });
            entries.sort(function (a, b) { return b.ms - a.ms; });

            const fmt = _lang === 'en' ? 'MM/DD/YYYY HH:mm' : 'DD/MM/YYYY HH:mm';
            const when = api.dayjs().format(fmt);
            const dateStr = sessionStartDate || api.dayjs().format('YYYY-MM-DD');
            const html = buildReportHtml({
                when: when,
                cycleCount: cycleCount,
                entries: entries,
                workSecs: WORK_SECS,
                breakSecs: BREAK_SECS
            });
            const titulo = 'Pomodoro \u2014 ' + when;
            const ctxNoteId = this.note ? this.note.noteId : 'root';

            const destino = await api.runOnBackend(function (content, title, date, ctxId) {
                const dayNote = api.getDayNote(date);
                const parentId = dayNote ? dayNote.noteId : ctxId;
                const ret = api.createTextNote(parentId, title, content);
                const note = ret && ret.note;
                if (note && note.noteId && typeof note.addLabel === 'function') {
                    try { note.addLabel('pomodoro'); } catch (_) {}
                }
                return { noteId: note ? note.noteId : null, dia: !!dayNote };
            }, [html, titulo, dateStr, ctxNoteId]);

            noteTimes.clear();
            cycleCount = 0;
            if (running && isWorkSession && this.note) {
                anchorToNote(this.note);
            } else {
                lastNoteId = null;
                lastNoteTitle = '';
                lastTick = 0;
            }
            clearTrackingData();
            persistTrackingData();

            api.showMessage(destino && destino.dia ? tr('report.saved.day') : tr('report.saved.ctx'));
            return true;
        } catch (e) {
            api.showError(tr('report.error', { msg: (e && e.message) || e }));
            return false;
        } finally {
            saving = false;
            this._updateUI();
        }
    }
}

function tickGlobal() {
    if (currentWidget) currentWidget._tick();
}

module.exports = new PomodoroWidget();
