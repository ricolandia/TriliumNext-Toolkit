# Kanboard Sync — TriliumNext Plugin

Bidirectional integration between **TriliumNext** and **Kanboard** via the JSON-RPC API. View projects, columns, and tasks — and create new tasks — directly from your notes, without leaving Trilium.

## How it works

```
[JS Frontend (renderNote)] → api.runAsyncOnBackendWithManualTransactionHandling() → Kanboard API (server-to-server)
                                                                                      ↕
                                                                              [JSON cache note]
```

- **Single JS Frontend note** (`Kanboard_Interface.js`): contains all logic — UI, API calls, and cache management. Uses `api.runAsyncOnBackendWithManualTransactionHandling()` to execute backend code securely.
- **JSON cache note** (`kanboard_cache.json`): stores synced data locally for fast access and offline resilience.

All communication with Kanboard is **server-to-server** (Trilium backend → Kanboard), keeping your API token off the frontend.

## Features

- **Dashboard** — visual panel showing projects, columns, and tasks from Kanboard
- **Sync** — fetch all Kanboard data with one click
- **Search** — filter tasks by title or description in real time
- **Filter** — narrow tasks by project via dropdown
- **Move tasks between columns** — inline dropdown on each task row instantly moves it to another column (uses Kanboard's `moveTaskPosition` API)
- **Create tasks** — choose project, column, color, title, and description
- **Responsive** — adapts to screen width, form stacks below tasks on mobile
- **Theme-aware** — uses Trilium's CSS variables, blends with any theme

## Prerequisites

- **TriliumNext** (any recent version)
- **Kanboard** with API enabled (network-accessible)
- API token generated in Kanboard (Settings → API → Create token)

## Installation

### 1. Create the notes in Trilium

Create **3 notes**:

| Note | Type | MIME | Instructions |
|------|------|------|--------------|
| `kanboard_cache` | Code | `application/json` | Paste `kanboard_cache.json` content |
| `KB Sync` | Script | `application/javascript;env=frontend` | Paste `Kanboard_Interface.js` content |
| `Kanboard Integration` | Text | — | Leave blank (this will be your dashboard) |

### 2. Set up the render relation

On the **Kanboard Integration** note, add:
```
~renderNote = KB Sync
```
This makes the dashboard render when you open the note.

### 3. Configure the plugin

Edit the `CONFIG` constants at the top of the **KB Sync** note:

```javascript
const CONFIG = {
  apiUrl: 'https://YOUR-KANBOARD.com/jsonrpc.php',
  apiToken: 'YOUR_API_TOKEN',
  cacheNoteId: 'ID_OF_CACHE_NOTE',   // ← ID of the kanboard_cache note
};
```

To copy a note ID: right-click on the note → **Copy Note ID**.

### 4. Open the dashboard

Open the **Kanboard Integration** note. Click **Synchronize** to pull data from Kanboard.

## Usage

### Synchronize

Click **🔄 Synchronize** in the header. All projects, columns, and tasks are fetched and cached locally.

### Filter tasks

Use the **"All projects"** dropdown to filter the task table by project.

### Search tasks

Type in the **search box** above the table to filter tasks by title or description in real time, across all projects.

### Move tasks between columns

Each task row has an inline **column dropdown** in the "Coluna" column. Select a new column and the task is moved instantly via Kanboard's `moveTaskPosition` API. The local cache updates automatically.

### Create a task

Fill out the **New Task** form (right sidebar):
1. Select a **project**
2. Choose a **column**
3. Pick a **color** (optional)
4. Enter a **title**
5. Add a **description** (optional)
6. Click **Create Task**

The task is created in Kanboard and the local cache updates immediately.

## File structure

```
Kanboard-Integration/
├── README.md                 ← This file
├── manifest.json             ← Trilium import manifest
├── kanboard_cache.json       ← JSON cache template
├── Kanboard_Interface.js     ← JS Frontend note (all logic)
├── CONTEXTO.md               ← Original idea document (Portuguese)
└── imagens/
    └── screenshot.webp       ← Screenshot (to be added)
```

## Kanboard API methods used

| Method | Description |
|--------|-------------|
| `getAllProjects` | List all projects |
| `getColumns` | List columns for a project |
| `getAllTasks` | List tasks for a project |
| `createTask` | Create a new task |
| `getTask` | Get task details |
| `moveTaskPosition` | Move a task to a different column |

Full API docs: [docs.kanboard.org](https://docs.kanboard.org/en/latest/api/)

## Troubleshooting

| Issue | Likely cause | Solution |
|-------|-------------|----------|
| "Error" on sync | Wrong URL or token | Check `apiUrl` and `apiToken` in CONFIG |
| Blank dashboard | Missing `~renderNote` | Add `~renderNote = KB Sync` to the dashboard note |
| No tasks appear | Cache empty | Click **Synchronize** |
| "Access Forbidden" | Invalid token | Generate a new token in Kanboard settings |

## License

MIT
