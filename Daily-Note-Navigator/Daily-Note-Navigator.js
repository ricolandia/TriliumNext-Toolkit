const TPL = `
<style>
  .dnn-bar {
    padding: 6px 10px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    border-top: 1px solid var(--main-border-color);
  }
  .dnn-btn {
    flex: 1;
    background: var(--button-background-color);
    color: var(--button-text-color);
    border: 1px solid var(--main-border-color);
    border-radius: 4px;
    padding: 4px 0;
    cursor: pointer;
    font-size: 18px;
  }
  .dnn-btn:hover { filter: brightness(1.1); }
  .dnn-label {
    font-size: 11px;
    color: var(--muted-text-color);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 120px;
    text-align: center;
  }
</style>
<div class="dnn-bar">
  <button class="dnn-btn" id="prev-day-btn" title="Dia anterior">←</button>
  <span class="dnn-label" id="day-label"></span>
  <button class="dnn-btn" id="next-day-btn" title="Próximo dia">→</button>
</div>`;

class DayNoteNavigatorWidget extends api.NoteContextAwareWidget {
  get position() { return 100; }
  get parentWidget() { return "right-pane"; }
  get widgetTitle() { return "📅 Day Note Nav"; }

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

  doRenderBody() {
    const $el = $(TPL);
    $el.find("#prev-day-btn").on("click", () => this._navigate(-1));
    $el.find("#next-day-btn").on("click", () => this._navigate(+1));
    this.$label = $el.find("#day-label");
    return $el;
  }

  async _navigate(offset) {
    try {
      const dateStr = this._getDateStr();
      if (!dateStr) return;
      const targetDate = this._offsetDate(dateStr, offset);
      const note = await api.getDayNote(targetDate, false);
      if (note) {
        await api.activateNote(note.noteId);
      } else {
        api.showMessage(`Sem nota para ${this._formatLabel(targetDate)}`);
      }
    } catch (err) {
      console.error("[DayNoteNav]", err);
    }
  }

  async refreshWithNote(note) {
    if (!this.$label) return;
    if (!this._isDayNote()) return;
    const dateStr = this._getDateStr();
    if (dateStr) {
      this.$label.text(this._formatLabel(dateStr));
    }
  }
}

module.exports = new DayNoteNavigatorWidget();
