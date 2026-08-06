# Daily Note Map

A visual map of everything you edited on a given day, with your daily journal note at the center. Built for TriliumNext.

## Features

* **🗺️ Map View** — The journal note (`#dateNote=YYYY-MM-DD`) sits at the center; every note edited that day orbits around it as a satellite.
* **🔗 Real Connections** — Arrows connect satellites that share actual relations (`~relation`) or `[[links]]` between them, so you see the real graph of your day.
* **🗓️ Date Navigation** — `‹ ›` moves day by day, `hoje` jumps back to today. One render note covers every day.
* **🕐 Edit Times** — Each satellite shows the `HH:MM` of its last edit, ordered by time around the center.
* **🎨 Group Colors** — Satellites are tinted by their parent folder, with a legend showing which folder each color maps to.
* **🖱️ Open in New Tab** — Click any node to open the note in a new tab (`api.openTabWithNote`, with fallback).

## Installation

1. Import the `manifest.json` (or paste the JS into a Code note with MIME `application/javascript;env=frontend`).
2. Create a note of type **Render** and add the relation `~renderNote` pointing to the JS note.
3. Reload TriliumNext (`F5`) and open the Render note.

## Usage

Open the **Daily Note Map** render note:

```
‹  Qua 6/8/2026  ›  hoje    12 notas editadas
┌───────────────────────────────────────────────┐
│            [Projeto X] ─── [Ideia Y]          │
│                 │                             │
│         [Reunião]──[📅 Diário]──[Nota solta]  │
│                 │                             │
│              [Leitura]                        │
└───────────────────────────────────────────────┘
● Projetos   ● Ideias   ● Geral
```

- **Satellites** = notes edited that day (excluding system notes and the journal itself).
- **Arrows** = relations or links between two edited notes (hover to see the relation type).
- **Dashed center** = the journal note for that date (hidden if it doesn't exist).

## Notes & Limitations

- Only notes modified on the selected date are shown (`date(dateModified)`).
- Notes with relations to notes *outside* the day are shown but not connected (connections only draw between satellites).
- Max visual size is fine up to ~100 notes; very heavy days may be dense.
- Links (`[[ ]]`) use Trilium's internal `links` table when available; relations come from `attributes type='relation'`.

## Original discussion
[Journals and note maps](https://github.com/TriliumNext/Notes/discussions)
