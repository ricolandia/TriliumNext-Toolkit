// ════════════════════════════════════════════════════════════════
//  Daily Note Navigator — TriliumNext Widget
//  MIME: application/javascript;env=frontend
//  Label: #widget
//
//  Navigate between daily journal notes with keyboard, cache, and monthly jumps
// ════════════════════════════════════════════════════════════════

const TPL = `
<div style="
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
">
  <button id="prev-month-btn" title="Previous month" style="
    flex: 0;
    background: var(--button-background-color);
    color: var(--muted-text-color);
    border: 1px solid var(--main-border-color);
    border-radius: 4px;
    padding: 4px 6px;
    cursor: pointer;
    font-size: 12px;
  ">«</button>

  <button id="prev-day-btn" title="Previous day" style="
    flex: 1;
    background: var(--button-background-color);
    color: var(--button-text-color);
    border: 1px solid var(--main-border-color);
    border-radius: 4px;
    padding: 4px 0;
    cursor: pointer;
    font-size: 18px;
  ">←</button>

  <span id="day-label" style="
    flex: 2;
    font-size: 11px;
    color: var(--muted-text-color);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-align: center;
  "></span>

  <button id="next-day-btn" title="Next day" style="
    flex: 1;
    background: var(--button-background-color);
    color: var(--button-text-color);
    border: 1px solid var(--main-border-color);
    border-radius: 4px;
    padding: 4px 0;
    cursor: pointer;
    font-size: 18px;
  ">→</button>

  <button id="next-month-btn" title="Next month" style="
    flex: 0;
    background: var(--button-background-color);
    color: var(--muted-text-color);
    border: 1px solid var(--main-border-color);
    border-radius: 4px;
    padding: 4px 6px;
    cursor: pointer;
    font-size: 12px;
  ">»</button>

  <button id="today-btn" title="Go to today" style="
    flex: 0;
    background: transparent;
    color: var(--muted-text-color);
    border: 1px solid var(--main-border-color);
    border-radius: 4px;
    padding: 4px 6px;
    cursor: pointer;
    font-size: 13px;
  ">📅</button>
</div>`;

class DayNoteNavigatorWidget extends api.NoteContextAwareWidget {
  get position() { return 100; }
  get parentWidget() { return "right-pane"; }
  get widgetTitle() { return "📅 Day Note Nav"; }

  constructor() {
    super();
    this._dayCache = {};
    this._resetTimer = null;
  }

  isEnabled() {
    return super.isEnabled() && this._isDayNote();
  }

  _isDayNote() {
    return !!this.note?.getLabelValue("dateNote");
  }

  _getDateStr() {
    return this.note?.getLabelValue("dateNote") || null;
  }

  _offsetDate(dateStr, days) {
    const d = new Date(dateStr + "T12:00:00");
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  _formatLabel(dateStr) {
    const [y, m, d] = dateStr.split("-");
    return `${d}/${m}/${y}`;
  }

  _todayIso() {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }

  doRenderBody() {
    this.$widget = $(TPL);

    this.$prevMonthBtn = this.$widget.find("#prev-month-btn");
    this.$prevDayBtn   = this.$widget.find("#prev-day-btn");
    this.$nextDayBtn   = this.$widget.find("#next-day-btn");
    this.$nextMonthBtn = this.$widget.find("#next-month-btn");
    this.$todayBtn     = this.$widget.find("#today-btn");
    this.$label        = this.$widget.find("#day-label");

    this.$prevDayBtn.on("click",   () => this._navigate(-1));
    this.$nextDayBtn.on("click",   () => this._navigate(+1));
    this.$prevMonthBtn.on("click", () => this._navigateMonth(-1));
    this.$nextMonthBtn.on("click", () => this._navigateMonth(+1));
    this.$todayBtn.on("click",     () => this._goToday());

    $(document).on("keydown.dnn", (e) => {
      if (e.key === "ArrowLeft")  { e.preventDefault(); this._navigate(-1); }
      if (e.key === "ArrowRight") { e.preventDefault(); this._navigate(+1); }
    });

    return this.$widget;
  }

  async _navigate(offset) {
    try {
      const dateStr = this._getDateStr();
      if (!dateStr) return;
      const targetDate = this._offsetDate(dateStr, offset);
      const note = await this._getCachedNote(targetDate);
      if (note) {
        await api.activateNote(note.noteId);
      } else {
        this._showInlineMsg(`No note for ${this._formatLabel(targetDate)}`);
      }
    } catch (err) {
      console.error("[DayNoteNav] navigate:", err);
    }
  }

  async _navigateMonth(offset) {
    try {
      const dateStr = this._getDateStr();
      if (!dateStr) return;
      const d = new Date(dateStr + "T12:00:00");
      d.setMonth(d.getMonth() + offset);
      const targetDate = d.toISOString().slice(0, 10);
      const note = await this._getCachedNote(targetDate);
      if (note) {
        await api.activateNote(note.noteId);
      } else {
        this._showInlineMsg(`No note in ${this._formatLabel(targetDate)}`);
      }
    } catch (err) {
      console.error("[DayNoteNav] month:", err);
    }
  }

  async _goToday() {
    try {
      const iso = this._todayIso();
      const note = await this._getCachedNote(iso);
      if (note) await api.activateNote(note.noteId);
    } catch (err) {
      console.error("[DayNoteNav] today:", err);
    }
  }

  async _getCachedNote(iso) {
    if (this._dayCache[iso]) return this._dayCache[iso];
    const note = await api.getDayNote(iso, false);
    if (note) this._dayCache[iso] = note;
    return note;
  }

  _showInlineMsg(msg) {
    if (!this.$label) return;
    this.$label.text(msg);
    this.$label.css("color", "#f87171");
    clearTimeout(this._resetTimer);
    this._resetTimer = setTimeout(() => {
      const dateStr = this._getDateStr();
      if (dateStr && this.$label) {
        this.$label.text(this._formatLabel(dateStr)).css("color", "");
      }
    }, 2500);
  }

  refreshWithNote(note) {
    if (!this.$label) return;
    if (!this._isDayNote()) {
      this.$label.text("");
      $(document).off("keydown.dnn");
      return;
    }
    const dateStr = this._getDateStr();
    if (dateStr) {
      this.$label.text(this._formatLabel(dateStr)).css("color", "");
    }
    $(document).off("keydown.dnn").on("keydown.dnn", (e) => {
      if (e.key === "ArrowLeft")  { e.preventDefault(); this._navigate(-1); }
      if (e.key === "ArrowRight") { e.preventDefault(); this._navigate(+1); }
    });
  }
}

module.exports = new DayNoteNavigatorWidget();
