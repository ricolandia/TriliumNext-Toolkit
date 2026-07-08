# TriliumNext Plugins & Tools Collection

A collection of plugins, widgets, and scripts for TriliumNext, focused on writing, productivity, canvas workflows, and note organization.
This repository serves as a centralized hub for all these projects.

---

**Note:** This project is mirrored on my personal **Forgejo server**. You can also access the repository by clicking below:

[![Forgejo MIRROR](https://img.shields.io/badge/Mirror-Forgejo-orange?logo=gitea)](https://repo.rizomatico.org/ricograca/TriliumNext-Toolkit)

---

## 📦 How to Install

1. Navigate to the folder of the plugin you want.
2. Download the `.zip` release.
3. Import it into Trilium. (The imported notes behave like a custom plugin).
4. To import correctly, right-click a parent note on Windows/Linux (or Control-click on macOS) and choose **Import**.

> **Tip:** For better organization, you may want to import everything inside a dedicated parent note such as “Tools”, “Plugins”, or “Addons”.
>
> **💡 Bulk install all plugins:** Use the [Trilium Plugin Manager](https://github.com/ricolandia/Trilium-plugin-manager) — it automates the download, import, and update of every plugin in this collection with a single command.

---

## 🛠️ Collection Index

### Productivity & Workflow
* **[Weekly Planner & Open Tasks Panel](./Weekly-Planner)** - A drag-and-drop task board integrated with a global open tasks searcher.
* **[Daily Note Navigator](./Daily-Note-Navigator)** - Navigate daily journal notes with keyboard arrows, monthly jumps, and cache.
* **[Minimalist Pomodoro + Time Tracker](./Minimalist-Pomodoro)** - A monochromatic Pomodoro timer widget with per-note time tracking and report generation.
* **[Kanboard Sync](./Kanboard-Integration)** - Bidirectional Kanboard integration with a visual dashboard and inline task creation.
* **[Mastodon Sender](./Mastodon-Sender)** - Compose and post toots directly from Trilium, with visibility control and current note support.

### Canvas & Note Organization
* **[Canvas Note Tools](./Canvas-Note-Tools)** - Insert notes as interactive cards, create on the fly, and synthesize knowledge directly on the canvas.
* **[Canvas Template Loader Widget](./Canvas-Template-Loader)** - Insert reusable Excalidraw templates into any canvas with a single click.
* **[Canvas Templates Pack](./Canvas-Templates)** - A collection of ready-to-use frameworks (OKR, GTD, Feynman, SCAMPER, etc.) for visual thinking.

### Writing & Creative Tools
* **[Word Counter + Daily Goal](./Word-Counter)** - A compact right-pane widget tracking your daily writing progress.
* **[Custom Scripts for Writers](./Writers-Tools)** - Includes a Longform Compiler (Grid View) and a Fountain Screenplay Renderer.
* **[AI Chat inside Trilium](./AI-Chat)** - A no-code approach to interacting with AI directly within your notes.

### UI
* **[CSS Tweaks: Polished UI](./UI-Tweaks)** - Polishing the UI for better readability and elegance.


### Maintenance Tools
* **[Attribute-Garbage-Collector](./Attribute-Garbage-Collector)** - A TriliumNext garbage collector that finds broken, unused, or duplicate attributes, letting you safely preview and delete them individually or in bulk.

* **[Knowledge-Debt-Dashboard](./Knowledge-Debt-Dashboard)** - A full-page Render Note dashboard that audits your knowledge base for orphan notes, stubs, empty notes, old TODOs, and abandoned notes.

### Backup & External Scripts

* **[Incremental Markdown Backup](./Incremental-Markdown-Backup)** - A lightweight Python script that uses the ETAPI to incrementally back up your notes as individual, folder-organized `.md` files (only downloading what has changed).

### Collaboration & Sharing
* **[Shared Notes P2P](./Shared-Notes)** - A secure, serverless peer-to-peer sharing and commenting system to exchange notes between different Trilium instances without exposing your ETAPI token.

---

## 🌐 Language / Idioma

**Note on language:** Since I am from Brazil, the interface and text within all these tools are currently in **Brazilian Portuguese (PT-BR)**. 
However, you can easily translate them to English or your preferred language by simply opening the code files inside Trilium and replacing the text strings.


---
*I will continue updating this collection as new tools and experiments are developed.*

## ☕ Support this project

**🇧🇷 Pix:** `ricardograca@ricolandia.com`  
**💳 PayPal:** [Donate](https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=ricolandia%40gmail.com&currency_code=BRL)  
**🧡 GitHub Sponsors:** [github.com/sponsors/ricolandia](https://github.com/sponsors/ricolandia)
