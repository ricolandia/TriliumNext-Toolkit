# Weekly Planner & Open Tasks Panel

A unified workspace for TriliumNext featuring a drag-and-drop weekly planner and a global open tasks panel.

## Features

* **Shared Architecture:** A unified system that feeds both the planner and the tasks list. Any action in one panel re-renders the other.
* **Drag and Drop:** Dragging in the planner automatically updates the day badges in the tasks panel.
* **Global Synchronization:** The Open Tasks panel scans every note across the entire database to locate all pending tasks.
* **Contextual Badges:** Tasks allocated in the planner display a discreet badge (e.g., Wed 14/5) in the tasks panel.
* **Mark as Done:** Check off individual tasks directly from the panel, or click to enter the source note. Marking as done removes the task from the backlog.


## Installation

1. Download the `Task_Planner.zip` and `Open_tasks_list.zip` (if kept separate, or the unified zip) and import it into Trilium.
2. **Data Storage:** Create a note named "Planner Data" of type `Code - JSON`, and assign the labels `#plannerdata` and `#data`.
3. **Render:** Create a Render note to show the planner. On the Render note, add the relation: `~renderNote` pointing to the JS Frontend note.

## Changelog

### Features

- **Tag parsing**: `#todo`, `#doing=N%`, `#done`, `#upto=MM-DD-YYYY` in task text are extracted and displayed as colored badges
- **Planner badges**: tags show up on draggable kanban cards in the weekly board
- **Task list badges**: tags show up in the right sidebar task list
- **Progress bars**: tasks with `#doing=N%` get a thin proportional fill bar
- **Cross-theme**: colors use `rgba()` with opacity — works on both light and dark themes

### Visual tweaks

- **Bigger cards**: padding 7×10 → 10×12 px, line-height 1.4 → 1.5
- **Larger fonts**: task text 16→17px, badges 10→11px, headers 18→19px
- **More spacing**: card gap 6→8px, increased internal margins
- **Darker card background**: overlay on `--accented-background-color` for better contrast on both themes
- **Monochrome icon**: `⇢` instead of `⏰` for terminal-friendly display

### Tag color palette

| Tag      | Color   | Display |
|----------|---------|---------|
| `#todo`  | Orange  | ● todo  |
| `#doing=N%` | Yellow | ◐ N% + bar |
| `#done`  | Green   | ● done  |
| `#upto`  | Blue    | ⇢ DD/MM |

### Code

- `parseTaskTags(text)` → `{ cleanText, tags[] }`
- `renderTagBadges(tags)`, `renderDoingBar(tags)` helpers
- Cross-theme CSS with CSS variables + fallbacks + overlay

## Original link
[https://github.com/orgs/TriliumNext/discussions/9676](https://github.com/orgs/TriliumNext/discussions/9676)

### Images  

![screen capture](imagens/weekly-1-.webp)
![screen capture](imagens/weekly-2-.webp)
![screen capture](imagens/weekly-3-.webp)


