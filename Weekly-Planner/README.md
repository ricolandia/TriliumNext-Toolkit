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

## Original link
[https://github.com/orgs/TriliumNext/discussions/9676](https://github.com/orgs/TriliumNext/discussions/9676)
