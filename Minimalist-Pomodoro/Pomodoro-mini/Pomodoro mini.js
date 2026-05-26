/**
 * Pomodoro Timer + Time Tracker for TriliumNext
 * Widget de painel — right-pane (ou left-pane).
 *
 * Como usar:
 * 1. Crie uma nota "JS Frontend" no TriliumNext
 * 2. Cole este arquivo inteiro na nota
 * 3. Adicione a etiqueta: #widget
 * 4. Recarregue o Trilium (Ctrl+R)
 *
 * Para mudar o posicionamento, altere get parentWidget():
 *   'right-pane'  → painel lateral direito (padrão aqui)
 *   'left-pane'   → seção fixa no painel esquerdo
 */

// ─── Constantes ──────────────────────────────────────────────────────────────

const WORK_SECS  = 25 * 60;
const BREAK_SECS =  5 * 60;

// ─── Estado global ───────────────────────────────────────────────────────────

let timerInterval  = null;
let running        = false;
let seconds        = WORK_SECS;
let isWorkSession  = true;
let cycleCount     = 0;

let sessionEndTime = null;

const noteTimes   = new Map();
let lastNoteId    = null;
let lastNoteTitle = '';
let lastTick      = 0;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(s) {
    const m   = Math.floor(s / 60);
    const sec = s % 60;
    return m + ':' + (sec < 10 ? '0' : '') + sec;
}

// ─── Persistência de rastreamento ────────────────────────────────────────────

function persistTrackingData() {
    const obj = {};
    for (const [id, { title, secs }] of noteTimes) {
        obj[id] = { title, secs };
    }
    const payload = {
        noteTimes: obj,
        cycleCount,
        lastNoteId,
        lastNoteTitle,
        lastTick,
        savedAt: Date.now()
    };
    localStorage.setItem('pomo-report-pending', JSON.stringify(payload));
}

function restoreTrackingData() {
    try {
        const raw = localStorage.getItem('pomo-report-pending');
        if (!raw) return false;
        const data = JSON.parse(raw);
        if (data.noteTimes) {
            for (const [id, { title, secs }] of Object.entries(data.noteTimes)) {
                noteTimes.set(id, { title, secs: secs || 0 });
            }
        }
        cycleCount    = data.cycleCount    || 0;
        lastNoteId    = data.lastNoteId    || null;
        lastNoteTitle = data.lastNoteTitle || '';
        lastTick      = data.lastTick      || 0;
        return Object.keys(data.noteTimes || {}).length > 0;
    } catch (_e) {
        return false;
    }
}

function clearTrackingData() {
    localStorage.removeItem('pomo-report-pending');
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
}
.pomo-title {
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
    height: 32px;
    border: 1px solid var(--main-border-color);
    border-radius: 6px;
    background: transparent;
    color: var(--main-text-color);
    cursor: pointer;
    font-size: 18px;
    line-height: 1;
    transition: background 0.15s;
}
.pomo-row button:hover {
    background: var(--button-hover-background-color);
}
#pomo-report {
    font-size: 16px;
}
#pomo-pending {
    font-size: 10px;
    color: var(--muted-text-color);
    text-align: center;
    cursor: pointer;
    display: none;
    padding: 2px 0;
}
#pomo-pending:hover {
    color: var(--main-text-color);
}
`;

// ─── Template HTML ────────────────────────────────────────────────────────────

const TPL = `
<div class="pomo-widget">
    <div class="pomo-header">
        <span class="pomo-title">🍅 Pomodoro</span>
        <span id="pomo-status"></span>
    </div>
    <div id="pomo-timer">${formatTime(WORK_SECS)}</div>
    <div class="pomo-row">
        <button id="pomo-toggle" class="bx bx-play" title="Iniciar"></button>
        <button id="pomo-stop"   class="bx bx-stop" title="Parar e salvar"></button>
        <button id="pomo-report" class="bx bx-file" title="Salvar relatório" style="display:none"></button>
    </div>
    <div id="pomo-pending">Relatório pendente — clique para salvar</div>
</div>
`;

// ─── Widget ───────────────────────────────────────────────────────────────────

class PomodoroWidget extends api.RightPanelWidget {

    get position()     { return 100; }
    get parentWidget() { return 'right-pane'; }
    get widgetTitle()  { return 'Pomodoro'; }

    isEnabled() { return true; }

    doRenderBody() {
        this.$widget  = $(TPL);
        this.cssBlock(CSS);

        this.$timer   = this.$widget.find('#pomo-timer');
        this.$status  = this.$widget.find('#pomo-status');
        this.$toggle  = this.$widget.find('#pomo-toggle');
        this.$stop    = this.$widget.find('#pomo-stop');
        this.$report  = this.$widget.find('#pomo-report');
        this.$pending = this.$widget.find('#pomo-pending');

        this.$toggle.on('click', () => running ? this._pause() : this._start());
        this.$stop.on('click',   () => this._stop());
        this.$report.on('click', () => this._saveReport());
        this.$pending.on('click',() => this._saveReport());

        this._loadState();

        const hasPending = restoreTrackingData();
        if (hasPending) this._updateUI();

        window.addEventListener('beforeunload', () => {
            this._flushNoteTime();
            if (noteTimes.size > 0) persistTrackingData();
        });

        return this.$widget;
    }

    async refreshWithNote(note) {
        if (!running || !note) return;

        const now = Date.now();

        if (lastNoteId && lastNoteId !== note.noteId && lastTick > 0) {
            const elapsed = Math.round((now - lastTick) / 1000);
            const prev = noteTimes.get(lastNoteId) || { title: lastNoteTitle, secs: 0 };
            prev.secs += elapsed;
            noteTimes.set(lastNoteId, prev);
        }

        lastNoteId    = note.noteId;
        lastNoteTitle = note.title;
        lastTick      = now;
    }

    // ── Controles ────────────────────────────────────────────────────────────

    _start() {
        if (running) return;
        running = true;

        sessionEndTime = Date.now() + seconds * 1000;
        timerInterval  = setInterval(() => this._tick(), 250);

        if (this.note) {
            lastNoteId    = this.note.noteId;
            lastNoteTitle = this.note.title;
        }
        lastTick = Date.now();

        this._persist();
        this._updateUI();
    }

    _pause() {
        if (!running) return;
        running = false;
        clearInterval(timerInterval);
        timerInterval  = null;
        sessionEndTime = null;

        this._flushNoteTime();
        persistTrackingData();
        this._persist();
        this._updateUI();
    }

    async _stop() {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        running        = false;
        sessionEndTime = null;

        this._flushNoteTime();

        if (noteTimes.size > 0) await this._saveReport();

        seconds       = WORK_SECS;
        isWorkSession = true;
        cycleCount    = 0;
        noteTimes.clear();
        lastNoteId    = null;
        lastNoteTitle = '';
        lastTick      = 0;
        clearTrackingData();

        this._persist();
        this._updateUI();
    }

    // ── Tick (wall-clock) ─────────────────────────────────────────────────────

    _tick() {
        const remaining = Math.max(0, Math.round((sessionEndTime - Date.now()) / 1000));

        if (remaining <= 0) {
            seconds = 0;
            this.$timer.text(formatTime(0));
            this._finishSession();
            return;
        }

        seconds = remaining;
        this.$timer.text(formatTime(seconds));
        localStorage.setItem('pomo-ticks', seconds.toString());
    }

    _finishSession() {
        clearInterval(timerInterval);
        timerInterval = null;

        this._flushNoteTime();

        if (isWorkSession) {
            isWorkSession = false;
            seconds       = BREAK_SECS;
            cycleCount++;
        } else {
            isWorkSession = true;
            seconds       = WORK_SECS;
        }

        sessionEndTime = Date.now() + seconds * 1000;

        if (lastNoteId) lastTick = Date.now();

        timerInterval = setInterval(() => this._tick(), 250);

        this.$timer.text(formatTime(seconds));
        this._persist();
        this._updateUI();
        persistTrackingData();
    }

    // ── Rastreamento de notas ─────────────────────────────────────────────────

    _flushNoteTime() {
        if (!lastNoteId || lastTick === 0) return;

        const now     = Date.now();
        const elapsed = Math.round((now - lastTick) / 1000);

        if (elapsed > 0) {
            const prev = noteTimes.get(lastNoteId) || { title: lastNoteTitle, secs: 0 };
            prev.secs += elapsed;
            noteTimes.set(lastNoteId, prev);
        }

        lastTick = 0;
    }

    // ── UI ────────────────────────────────────────────────────────────────────

    _updateUI() {
        this.$timer.text(formatTime(seconds));

        if (running) {
            this.$toggle.removeClass('bx-play bx-right-arrow-alt').addClass('bx-pause');
            this.$toggle.attr('title', 'Pausar');
        } else {
            this.$toggle.removeClass('bx-pause').addClass('bx-play');
            this.$toggle.attr('title', 'Iniciar / Retomar');
        }

        if (!isWorkSession && !running && seconds === BREAK_SECS) {
            this.$status.text('...');
        } else if (isWorkSession) {
            this.$status.text('Foco');
        } else {
            this.$status.text('Pausa');
        }

        const hasData = noteTimes.size > 0 || (lastNoteId && lastTick > 0);
        this.$report.toggle(hasData);

        const hasPending = !!localStorage.getItem('pomo-report-pending');
        this.$pending.toggle(hasPending);
    }

    // ── Persistência de estado do timer ──────────────────────────────────────

    _persist() {
        localStorage.setItem('pomo-seconds', seconds.toString());
        localStorage.setItem('pomo-isWork',  isWorkSession ? '1' : '0');
        if (sessionEndTime) {
            localStorage.setItem('pomo-session-end', sessionEndTime.toString());
        } else {
            localStorage.removeItem('pomo-session-end');
        }
    }

    _loadState() {
        const savedEnd = localStorage.getItem('pomo-session-end');
        if (savedEnd) {
            const remaining = Math.max(0, Math.round((parseInt(savedEnd, 10) - Date.now()) / 1000));
            seconds = remaining > 0 ? remaining : WORK_SECS;
            localStorage.removeItem('pomo-session-end');
        } else {
            const savedSecs = localStorage.getItem('pomo-seconds');
            if (savedSecs !== null) seconds = parseInt(savedSecs, 10) || WORK_SECS;
        }

        const savedWork = localStorage.getItem('pomo-isWork');
        if (savedWork !== null) isWorkSession = savedWork === '1';
    }

    // ── Relatório ─────────────────────────────────────────────────────────────

    async _saveReport() {
        this._flushNoteTime();
        if (noteTimes.size === 0) return;

        const totalSecs = [...noteTimes.values()].reduce((s, v) => s + v.secs, 0);
        const now       = new Date();
        const ts        = now.toLocaleString('pt-BR');
        const dateStr   = api.dayjs().format('YYYY-MM-DD');

        let cyclesLine = '';
        if (cycleCount > 0) {
            const workMin  = Math.round(WORK_SECS / 60);
            const breakMin = Math.round(BREAK_SECS / 60);
            cyclesLine = `<p><strong>Ciclos completos:</strong> ${cycleCount}`;
            if (cycleCount > 1) cyclesLine += ` (emendados em sequência)`;
            cyclesLine += ` — ${workMin}min foco + ${breakMin}min pausa cada</p>`;
        }

        let rows = '';
        for (const [id, { title, secs }] of noteTimes) {
            rows += `| <a class="reference-link" href="#root/${id}">${title}</a> | ${formatTime(secs)} |\n`;
        }

        const html = `<h1>Relatório Pomodoro — ${ts}</h1>
${cyclesLine}
<p><strong>Tempo total:</strong> ${formatTime(totalSecs)}</p>
<table>
<thead><tr><th>Nota</th><th>Tempo</th></tr></thead>
<tbody>
${rows}
<tr><td><strong>Total</strong></td><td><strong>${formatTime(totalSecs)}</strong></td></tr>
</tbody>
</table>`;

        const ctxNoteId = this.note ? this.note.noteId : 'root';

        try {
            await api.runOnBackend(function (content, title, date, ctxId) {
                const dayNote = api.getDayNote(date);
                const parentId = dayNote ? dayNote.noteId : ctxId;
                const ret = api.createTextNote(parentId, title, content);
                return ret.note.noteId;
            }, [html, `Pomodoro ${ts}`, dateStr, ctxNoteId]);

            clearTrackingData();
            noteTimes.clear();
            lastNoteId    = null;
            lastNoteTitle = '';
            lastTick      = 0;

            api.showMessage(cycleCount > 1
                ? `Relatório salvo — ${cycleCount} ciclos emendados.`
                : 'Relatório salvo.');

            this._updateUI();
        } catch (e) {
            api.showError('Erro ao salvar relatório: ' + e.message);
        }
    }
}

module.exports = new PomodoroWidget();