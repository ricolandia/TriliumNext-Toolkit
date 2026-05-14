# Minimalist Pomodoro + Time Tracker

A monochromatic Pomodoro timer widget with per-note time tracking and automated report generation. Built with zero external dependencies in ~130 lines of code.

## Features
* **Pomodoro Timer:** Standard 25min focus / 5min break cycles.
* **Per-Note Tracking:** Automatically logs how much time you spend on each note while the timer is running.
* **Monochromatic UI:** Uses the active theme's CSS variables for a distraction-free experience.

## 🚀 What's New (Latest Updates)

**v3 - Core Bug Fixes & Stability**
* **Wall-clock time tracking:** The timer no longer stops or loses time when the Trilium window is minimized or loses focus (bypassing `setInterval` throttling).
* **Pause fix:** Fixed a bug where time wasn't accounted for correctly after unpausing a session (`lastTick` reset issue).

**v2 - Workflow & Persistence**
* **Seamless Transitions:** Automatically chains sessions (Focus → Break → Focus) without stopping.
* **Safe Persistence:** Saves progress to `localStorage` on pauses or app closures. The timer automatically restores pending data if you reopen the app.
* **Auto-Reports:** Generates a formatted note on stop, detailing completed cycles (and if they were chained), total time, and time spent per note.

## Installation
1. Create a `JS Frontend` note.
2. Paste the script code or import the `.zip`.
3. Add the label: `#widget`. Reload Trilium.

## Original link
[https://github.com/orgs/TriliumNext/discussions/9710](https://github.com/orgs/TriliumNext/discussions/9710)
