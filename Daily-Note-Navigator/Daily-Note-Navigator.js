// ════════════════════════════════════════════════════════════════
//  Daily Note Navigator — TriliumNext Widget
//  MIME: application/javascript;env=frontend
//  Label: #widget
//
//  Navegação entre notas de diário (dias anterior/seguinte)
//  Exibido no painel direito quando a nota ativa tem #dateNote
// ════════════════════════════════════════════════════════════════

const TPL = `
<div style="
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 10px;
">
  <button id="prev-day-btn" title="Dia anterior" style="
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
    font-size: 11px;
    color: var(--muted-text-color);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 120px;
    text-align: center;
  "></span>

  <button id="next-day-btn" title="Próximo dia" style="
    flex: 1;
    background: var(--button-background-color);
    color: var(--button-text-color);
    border: 1px solid var(--main-border-color);
    border-radius: 4px;
    padding: 4px 0;
    cursor: pointer;
    font-size: 18px;
  ">→</button>
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
    this.$widget = $(TPL);
    this.$prevBtn = this.$widget.find("#prev-day-btn");
    this.$nextBtn = this.$widget.find("#next-day-btn");
    this.$label   = this.$widget.find("#day-label");

    this.$prevBtn.on("click", () => this._navigate(-1));
    this.$nextBtn.on("click", () => this._navigate(+1));

    return this.$widget;
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
