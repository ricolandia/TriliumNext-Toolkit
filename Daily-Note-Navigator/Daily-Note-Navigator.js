const TPL = `
<div>
  <div style="
    padding: 6px 10px 4px;
    font-size: 11px;
    font-weight: 600;
    color: var(--muted-text-color);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-bottom: 1px solid var(--main-border-color);
  ">📅 Day Note Nav</div>

  <div style="
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 6px 10px;
    border-top: 1px solid var(--main-border-color);
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
  </div>
</div>`;

class DayNoteNavigatorWidget extends api.NoteContextAwareWidget {
  get position() { return 100; }
get parentWidget() { return "right-pane"; }
get name() { return "Day Note Navigator"; }  // ← adiciona esta linha

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

  // ✅ RightPanelWidget usa doRenderBody, não doRender
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
    const dateStr = this._getDateStr();
    if (!dateStr) return;
    const targetDate = this._offsetDate(dateStr, offset);
    const note = await api.getDayNote(targetDate, false);
    if (note) {
      await api.activateNote(note.noteId);
    } else {
      api.showMessage(`Sem nota para ${this._formatLabel(targetDate)}`);
    }
  }

  async refreshWithNote(note) {
    // ✅ Guard: aguarda o render ter sido chamado antes
    if (!this.$label) return;
    if (!this._isDayNote()) return;

    const dateStr = this._getDateStr();
    if (dateStr) {
      this.$label.text(this._formatLabel(dateStr));
    }
  }
}

module.exports = new DayNoteNavigatorWidget();

