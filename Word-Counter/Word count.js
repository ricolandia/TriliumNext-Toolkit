/**
 * Word Counter + Daily Goal for TriliumNext
 * Minimalist right-pane widget. v0.102+
 *
 * How to use:
 * 1. Create a "JS Frontend" code note in Trilium
 * 2. Paste this entire file content into that note
 * 3. Add label: #widget
 * 4. Optional: add label #dailyGoal=500 to any text note (default 500)
 * 5. Reload Trilium (Ctrl+R)
 */

const GOAL_DEFAULT = 500;
const WEEKLY_GOAL_DEFAULT = 3500;

let _updatePending = false;

function countWords(html) {
    const text = html.replace(/<\/?[^>]+(>|$)/g, ' ');
    return text.split(/\s+/).filter(function (w) { return w.length > 0; }).length;
}

function countChars(html) {
    return html.replace(/<\/?[^>]+(>|$)/g, '').replace(/\s/g, '').length;
}

const CSS = `
#wc-root { padding: 6px 12px 10px; font-size: 13px; color: var(--main-text-color); }
#wc-daily-bar { height: 5px; border-radius: 3px; background: var(--main-border-color); margin: 4px 0 2px; }
#wc-daily-fill { height: 100%; border-radius: 3px; background: var(--main-text-color); opacity: 0.7; transition: width 0.3s; }
#wc-weekly-bar { height: 5px; border-radius: 3px; background: var(--main-border-color); margin: 4px 0 8px; }
#wc-weekly-fill { height: 100%; border-radius: 3px; background: var(--accented-background-color); opacity: 0.6; transition: width 0.3s; }
.wc-row { display: flex; justify-content: space-between; align-items: center; margin: 2px 0; }
.wc-label { color: var(--muted-text-color); font-size: 12px; }
.wc-value { font-variant-numeric: tabular-nums; font-size: 13px; }
`;

class WordCountWidget extends api.RightPanelWidget {

    get position() { return 1; }
    get parentWidget() { return 'right-pane'; }
    get widgetTitle() { return 'Contagem'; }

    isEnabled() {
        return super.isEnabled() && !!this.note && this.note.type === 'text';
    }

    doRenderBody() {
        this.$body.empty();

        const dailyGoal = this._readGoal('dailyGoal', GOAL_DEFAULT);
        const weeklyGoal = this._readGoal('weeklyGoal', WEEKLY_GOAL_DEFAULT);

        this.$body.append($(`
            <div id="wc-root">
                <div class="wc-row">
                    <span class="wc-label">Hoje</span>
                    <span class="wc-value">
                        <span id="wc-total">0</span>/${dailyGoal}
                    </span>
                </div>
                <div id="wc-daily-bar"><div id="wc-daily-fill" style="width:0%"></div></div>
                <div class="wc-row">
                    <span class="wc-label">Semana</span>
                    <span class="wc-value">
                        <span id="wc-weekly">0</span>/${weeklyGoal}
                    </span>
                </div>
                <div id="wc-weekly-bar"><div id="wc-weekly-fill" style="width:0%"></div></div>
                <div class="wc-row">
                    <span class="wc-label">Palavras</span>
                    <span class="wc-value" id="wc-words">—</span>
                </div>
                <div class="wc-row">
                    <span class="wc-label">Caracteres</span>
                    <span class="wc-value" id="wc-chars">—</span>
                </div>
            </div>
        `));

        this.cssBlock(CSS);

        this.$total = this.$body.find('#wc-total');
        this.$fill  = this.$body.find('#wc-daily-fill');
        this.$weekly = this.$body.find('#wc-weekly');
        this.$wfill = this.$body.find('#wc-weekly-fill');
        this.$words = this.$body.find('#wc-words');
        this.$chars = this.$body.find('#wc-chars');

        this._renderDaily();
        this._renderWeekly();
    }

    async refreshWithNote() {
        if (!this.isEnabled()) return;
        await this._updateNoteCounts();
    }

    async entitiesReloadedEvent({ loadResults }) {
        if (!loadResults.isNoteContentReloaded(this.noteId)) return;
        if (_updatePending) return;
        _updatePending = true;
        try {
            await this._updateNoteCounts();
        } finally {
            _updatePending = false;
        }
    }

    async _updateNoteCounts() {
        if (!this.note) return;
        try {
            const complement = await this.note.getNoteComplement();
            const content = (complement && complement.content) ? complement.content : '';
            const words = countWords(content);
            const chars = countChars(content);
            if (this.$words) this.$words.text(words);
            if (this.$chars) this.$chars.text(chars);
            this._trackDaily(words);
        } catch (_e) {
            // note may not be fully loaded yet
        }
    }

    _trackDaily(currentWords) {
        const dateKey = 'wc-' + api.dayjs().format('YYYY-MM-DD');
        let stored;
        try {
            stored = JSON.parse(localStorage.getItem(dateKey)) || {};
        } catch (_e) {
            stored = {};
        }

        const noteId = this.note.noteId;
        const prev = stored[noteId] || 0;

        if (currentWords > prev) {
            stored[noteId] = currentWords;
            localStorage.setItem(dateKey, JSON.stringify(stored));
        }

        const total = Object.values(stored).reduce(function (s, v) { return s + Number(v); }, 0);
        this._renderDaily(total);
        this._trackWeekly(currentWords);
    }

    _trackWeekly(currentWords) {
        const weekKey = 'wcw-' + api.dayjs().format('GGGG-WW');
        let stored;
        try {
            stored = JSON.parse(localStorage.getItem(weekKey)) || {};
        } catch (_e) {
            stored = {};
        }

        const noteId = this.note.noteId;
        const prev = stored[noteId] || 0;

        if (currentWords > prev) {
            stored[noteId] = currentWords;
            localStorage.setItem(weekKey, JSON.stringify(stored));
        }

        const total = Object.values(stored).reduce(function (s, v) { return s + Number(v); }, 0);
        this._renderWeekly(total);
    }

    _renderDaily(total) {
        if (!this.$total || !this.$fill) return;
        const goal = this._readGoal('dailyGoal', GOAL_DEFAULT);
        const t = (total !== undefined) ? total : this._dailyTotal();
        const pct = Math.min(100, Math.round((t / goal) * 100));
        this.$total.text(t);
        this.$fill.css('width', pct + '%');
    }

    _renderWeekly(total) {
        if (!this.$weekly || !this.$wfill) return;
        const goal = this._readGoal('weeklyGoal', WEEKLY_GOAL_DEFAULT);
        const t = (total !== undefined) ? total : this._weeklyTotal();
        const pct = Math.min(100, Math.round((t / goal) * 100));
        this.$weekly.text(t);
        this.$wfill.css('width', pct + '%');
    }

    _readGoal(label, fallback) {
        if (this.note) {
            const v = this.note.getLabelValue(label);
            if (v) return parseInt(v, 10) || fallback;
        }
        return fallback;
    }

    _dailyTotal() {
        const dateKey = 'wc-' + api.dayjs().format('YYYY-MM-DD');
        let stored;
        try {
            stored = JSON.parse(localStorage.getItem(dateKey)) || {};
        } catch (_e) {
            return 0;
        }
        return Object.values(stored).reduce(function (s, v) { return s + Number(v); }, 0);
    }

    _weeklyTotal() {
        const weekKey = 'wcw-' + api.dayjs().format('GGGG-WW');
        let stored;
        try {
            stored = JSON.parse(localStorage.getItem(weekKey)) || {};
        } catch (_e) {
            return 0;
        }
        return Object.values(stored).reduce(function (s, v) { return s + Number(v); }, 0);
    }
}

module.exports = new WordCountWidget();