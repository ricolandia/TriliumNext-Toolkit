# 📊 Knowledge Dashboard — TriliumNext Plugin

A **Render Note** dashboard that audits the health of your knowledge base, finds PDFs, and lets you run custom SQL queries.

---

## Features

| # | Tab | What it does |
|---|-----|-------------|
| 🔴 | **Orphans** | No other note links to them (no backlinks) |
| 🟠 | **Stubs** | Text content between 1–250 characters, no children |
| 🟣 | **Empty** | Null or blank content, no children (containers excluded) |
| 🔵 | **Old TODOs** | Has a `#todo`-style label, unmodified for > 30 days |
| 🟢 | **Abandoned** | No children, unmodified for > 90 days |
| 📄 | **PDFs** | PDF file notes scattered across the knowledge base |
| 🔎 | **Custom Query** | Filter by type, label, date — or write your own SQL WHERE clause. Save/load presets. |

All debt scans exclude: system notes (`_` prefix), protected/encrypted notes, archived notes (`#archived`), and the dashboard note itself.

---

## Custom Query (Dataview-like)

Build queries visually or with raw SQL:

- **Tipo** — filter by note type (text, code, file, book, canvas, etc.)
- **Label** — notes with a specific label (optionally with value)
- **De / Até** — date range filter
- **WHERE (custom)** — write any SQL WHERE clause for the `notes` table
- **💾 Salvar** — save your query as a preset (stored in localStorage)
- **📂 Carregar salva…** — load a previously saved query

Results are **clickable** — clicking a title opens the note.

Examples:
| Goal | Type | Label | Custom WHERE |
|------|------|-------|-------------|
| Notes created this week | text | — | `dateCreated >= date('now', '-7 days')` |
| Canvas with label "projeto" | canvas | projeto | — |
| Large code notes (>10KB) | code | — | `LENGTH(b.content) > 10000` |

---

## Installation

1. Create a new **JS Frontend** note and paste the contents of `js knowledge.js`
2. Create a second note (any type) — this will be your dashboard page
3. On the dashboard note, add the relation attribute:
   ```
   ~renderNote = <your JS note>
   ```
4. Open the dashboard note and click **▶ Escanear**

---

## Compatibility

Tested on **TriliumNext** (post-Trilium fork). The plugin auto-detects the internal links table name across different versions (`note_links`, `links`, etc.) and falls back gracefully to relation attributes if no links table is found. All available tables are logged after each scan for debugging.

---

## Thresholds

All thresholds are defined directly in the SQL queries and easy to adjust:

```js
// Stubs: notes shorter than this (in raw HTML characters) are flagged
LENGTH(b.content) BETWEEN 1 AND 250

// Old TODOs: flagged after this many days without modification
julianday('now') - julianday(n.dateModified) > 30

// Abandoned: flagged after this many days without modification
julianday('now') - julianday(n.dateModified) > 90
```

---

## Credits

- **ecodiv/Trilium_scripts** — inspiration for NOT_SYSTEM with ESCAPE, exclusion of protected/archived/infrastructure notes, and config panel ideas.
- **Obsidian's Dataview** — inspiration for the custom query builder.

Licensed under MIT.


### Screenshot

![screen capture](imagens/pkm-dbt-1-.webp)
