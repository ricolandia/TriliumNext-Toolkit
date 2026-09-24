# Canvas Note Tools

A custom Canvas workflow for TriliumNext focused on visual thinking, writing flow, and longform organization. It acts as a bridge between visual thinking, non-linear outlining, and knowledge management.

## Features

* **🔍 Quick Search:** Find and insert notes directly onto your canvas using a floating search window.
* **🎯 Capture Mode:** Toggle to navigate your tree — every note clicked is inserted as a card. Persists across reloads via `sessionStorage`.
* **📝 Create on the Fly:** Draft and add new child notes without leaving the canvas.
* **✏️ Floating Editor:** Edit any card's linked note without leaving the canvas. The editor opens centered as a floating window with the note's title and HTML content (`contenteditable`). Closing saves directly to the note and refreshes the card.
* **⟳ Sync Cards:** Regenerate all cards from their linked notes in one click. Title and excerpt are refreshed from the current note content (no comparison — always updates).
* **🕸️ Smart Relations:** Detects arrow connections between cards. Auto-detects relation types from text written on arrows (`inspira`, `contradiz`, etc.) and updates labels on save.
* **🗑️ Remove Cards:** List all linked cards and remove individual ones directly from the canvas.
* **📄 Longform Synthesis:** Generate comprehensive documents by combining canvas cards in arrow-based order (topological sort).
* **🪄 Flow Generator:** Turn a tiny text DSL (nodes + arrows) into a clean Excalidraw flowchart with auto layered layout (vertical or horizontal). The DSL arrows define the layers and the order — **no arrows are drawn**, so the result stays tidy even with loops (`A -> B`, `B -> A`). Draw it into the current canvas, create it as a new canvas note, or save it as a `#canvasTemplate`.
* **🧩 Template Inserter:** List every canvas note tagged `#canvasTemplate` and insert any of them into the current canvas (element ids, arrow bindings, bound texts and frames are remapped, so nothing breaks).
* **⌨️ Keyboard:** Press `Escape` to dismiss any open panel. Click outside panels to close them.
* **⚡ Local & Fast:** Lightweight, fully local, clean floating UI with glass-morphism design.

## Installation

1. Create a new note of type `JS Frontend`.
2. Add the label: `#widget`.
3. Paste the full code or import the `.zip` release.
4. Reload TriliumNext (`F5`).

## Mobile & launcher (v9)

The floating toolbar is a desktop/web widget: the **mobile layout has no widget panes**, so it cannot appear there. The same engine and backends are also available as a **launcher dialog**, which works on desktop, web and the mobile app:

1. Import the generated script `Canvas-note-tools/mobile-launcher.js` as a `JS Frontend` note.
2. Create a note of type `launcher` with:
   * label `#launcherType=script`
   * relation `~script` → the script note
3. Place the launcher note in the launcher bar (desktop: the *Visible launchers* subtree; mobile: *Mobile visible launchers*).

The dialog offers: 🪄 Flow (DSL) · 🧩 Templates · 🔗 Insert note · 📝 New child note · ⟳ Sync cards · 📄 Longform · ✏️ Edit card · 🗑️ Remove card · 🕸️ Relations. Capture mode (🎯) stays desktop-only: it works by browsing the tree and clicking notes, which does not map to a dialog.

> **Single source of truth:** `mobile-launcher.src.js` (UI) plus the engine, i18n and backend functions extracted from `Canvas tools v8.js` (markers `CLW-BE-*`) → regenerate with `bun build-mobile-launcher.js`; test with `bun test-mobile-launcher.js` and `bun test-flow-engine.js`.

## Usage
Open any Canvas note. Use the floating toolbar:

| Button | Action |
|---|---|
| 🔗 | Search and insert notes into the canvas |
| 🎯 | Toggle capture mode (click notes in the tree) |
| 📝 | Create a new child note and insert as card |
| 🕸️ | Detect and edit relations from arrow connections |
| ✏️ | List cards and edit the linked note in a floating editor |
| ⟳ | Sync all cards from their linked notes |
| 🗑️ | List and remove cards from the canvas |
| 📄 | Generate longform document from card order |
| 🪄 | Generate a flowchart from a text DSL (nodes + arrows) |
| 🧩 | Insert a `#canvasTemplate` into the canvas |
| ? | Open the help panel (what each button does) |

### Floating Editor (✏️)

1. Click the ✏️ button → a panel lists all cards linked to notes
2. Click **Edit** on a card → a floating editor opens centered on screen
3. Edit the title and content (HTML preserved via `contenteditable`)
4. Close (✕) or click **Save** → the note is saved and the card text is refreshed automatically

### Sync Cards (⟳)

Regenerates the title and excerpt of **every** card directly from its linked note. Use this when you edited notes outside the canvas (opening them normally) and want the cards up to date. It always updates (no diff) and keeps card positions intact.

### Flow Generator (🪄)

Write a small text spec and generate a ready-to-edit Excalidraw flowchart
(rounded boxes, decision diamonds, layered layout with no arrows —
the DSL connections are used only to compute the layers/order, so the
diagram stays clean even when the flow has loops).

**Spec format**

```
# comment
ID: Label [type]      → defines a node. Types: inicio | processo | decisao | fim
                        (English aliases: start | process | decision | end). Default: processo
A -> B : label        → connects two nodes (label optional; accepted but NOT drawn)
```

Example:

```
Início: Recebe pedido [inicio]
Brief: Tem briefing? [decisao]
Orçamento: Montar orçamento [processo]
Info: Pedir mais informações [processo]
Proposta: Enviar proposta [processo]
Fim: Aprovado e entregue [fim]

Início -> Brief
Brief -> Orçamento
Brief -> Info
Info -> Brief
Orçamento -> Proposta
Proposta -> Fim
```

**Buttons**

| Button | Action |
|---|---|
| **Gerar no canvas** | Draws the flow beside the existing content of the current canvas (auto offset) |
| **Criar nota** | Creates a new canvas note (uses the title field). Parent defaults to a note titled `Fluxos`; falls back to the current canvas' parent |
| **Template** | Saves the flow as a `#canvasTemplate` note, in the same folder as your other templates |
| **Exemplo** | Fills the spec box with a ready example |

Direction (vertical/horizontal) is selectable. Node IDs may contain accented
letters, digits, `.`, `_` and `-` (tested with names like `Início`, `Orçamento`).
Flows with cycles work: back edges are detected and only used for ordering.

### Templates (🧩)

1. Create a normal **Canvas** note and design anything you want to reuse
   (GTD board, SWOT, OKR, storyboard grid…).
2. Add the label **`#canvasTemplate`** to the note — the title becomes the
   template name.
3. In any canvas, click **🧩** → pick the template. It is inserted to the
   right of the current content with all references remapped
   (arrow bindings, bound texts, frames), ready to edit.
4. Flows saved with **Template** in the Flow Generator appear here too.

### Help (?)

The **?** button opens a compact panel describing every tool in the toolbar
(icon + name + one-line description) plus the shortcuts (`Esc` closes panels;
closing the ✏️ editor saves the note).

### Interface language

The whole UI (toolbar tooltips, panels, help, status messages and the DSL
example) follows Trilium's interface language: **Portuguese** when the app is
in `pt`/`pt_br`, **English** for every other language. The DSL node types
accept both the Portuguese and the English names.

## Original link
[https://github.com/orgs/TriliumNext/discussions/9668](https://github.com/orgs/TriliumNext/discussions/9668)


### Images  

![screen capture](imagens/canvas-1-.webp)
![screen capture](imagens/canvas-2-.webp)
![screen capture](imagens/canvas-3-.webp)
![screen capture](imagens/canvas-4-.webp)
![screen capture](imagens/canvas-5-.webp)
![screen capture](imagens/canvas-6-.webp)
![screen capture](imagens/canvas-7-.webp)
