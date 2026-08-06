// Daily Note Map — TriliumNext Render Note
// ══════════════════════════════════════════════════════════════════════════
// NOTA TRILIUM:
//   Tipo : Code
//   MIME : application/javascript;env=frontend
//   Uso  : Nota tipo Render com ~renderNote → este JS
//
// Mostra um mapa visual das notas editadas no dia, com a nota do diário
// (#dateNote=YYYY-MM-DD) ao centro e as notas editadas como satélites.
// Setas conectam notas que têm relações (~tipo) ou links [[ ]] entre si.
// Navegação por data embutida (‹ › / hoje). Clique no nó abre em nova aba.
// ══════════════════════════════════════════════════════════════════════════

(async function () {

    const $root = $container;

    const esc = s => String(s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    const PALETTE = ['#89b4fa', '#a6e3a1', '#f9e2af', '#f38ba8',
                     '#cba6f7', '#94e2d5', '#fab387', '#eba0ac'];

    let offset = 0; // dias a partir de hoje

    function dayIso(off) {
        const d = new Date();
        d.setHours(12, 0, 0, 0);
        d.setDate(d.getDate() + (off || 0));
        return d.toISOString().slice(0, 10);
    }

    function dayLabel(off) {
        const d = new Date(dayIso(off) + 'T12:00:00');
        const days = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
        const months = ['jan','fev','mar','abr','mai','jun',
                        'jul','ago','set','out','nov','dez'];
        return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    }

    function openNote(noteId) {
        try {
            if (api.openTabWithNote) api.openTabWithNote(noteId, true);
            else if (api.activateNote) api.activateNote(noteId);
        } catch (_) {}
    }

    const CSS = `
    .dmn-wrap { display:flex;flex-direction:column;height:100%;overflow:hidden;
                font-family:var(--detail-font-family,'Segoe UI',sans-serif);
                color:var(--main-text-color); }
    .dmn-header { display:flex;align-items:center;gap:8px;padding:10px 16px;
                  flex-shrink:0;border-bottom:1px solid var(--main-border-color,#313244);
                  flex-wrap:wrap; }
    .dmn-title { font-size:19px;font-weight:700; }
    .dmn-nav-btn { background:none;border:1px solid var(--main-border-color);border-radius:5px;
                   color:var(--main-text-color);font-size:19px;width:28px;height:26px;
                   cursor:pointer;line-height:1;padding:0; }
    .dmn-nav-btn:hover { background:var(--accented-background-color); }
    .dmn-today-btn { font-size:14px;padding:2px 8px;background:none;
                     border:1px solid var(--main-border-color);border-radius:4px;
                     cursor:pointer;color:var(--muted-text-color); }
    .dmn-today-btn:hover { color:var(--main-text-color); }
    .dmn-label { font-size:16px;color:var(--muted-text-color,#888);white-space:nowrap;
                 text-transform:capitalize; }
    .dmn-count { font-size:14px;color:var(--muted-text-color,#888);margin-left:auto; }
    .dmn-body { flex:1;overflow:auto;padding:12px 16px;display:flex;align-items:center;
                justify-content:center; }
    .dmn-svg { width:100%;height:100%;min-height:480px; }
    .dmn-node { cursor:pointer;transition:opacity .15s; }
    .dmn-node:hover { opacity:.85; }
    .dmn-node-rect { fill:var(--accented-background-color,#1e1e2e);
                     stroke-width:1.5; }
    .dmn-node-rect:hover { stroke-width:2.5; }
    .dmn-node-title { fill:var(--main-text-color);font-size:14px;font-weight:600;
                      pointer-events:none; }
    .dmn-node-time { fill:var(--muted-text-color,#888);font-size:11px;
                     pointer-events:none; }
    .dmn-journal { cursor:pointer; }
    .dmn-journal-rect { fill:rgba(137,180,250,.12);stroke:#89b4fa;stroke-width:2;
                        stroke-dasharray:6 4; }
    .dmn-journal-title { fill:#89b4fa;font-size:17px;font-weight:700;pointer-events:none; }
    .dmn-journal-sub { fill:var(--muted-text-color,#888);font-size:12px;pointer-events:none; }
    .dmn-edge { stroke:var(--main-border-color,#45475a);stroke-width:1.5;
                fill:none;opacity:.7; }
    .dmn-arrow { fill:var(--main-border-color,#45475a); }
    .dmn-empty { color:var(--muted-text-color,#888);font-size:17px;text-align:center;
                 padding:60px 20px; }
    .dmn-legend { display:flex;flex-wrap:wrap;gap:6px;padding:0 16px 8px;flex-shrink:0; }
    .dmn-legend-item { display:inline-flex;align-items:center;gap:5px;font-size:12px;
                       color:var(--muted-text-color,#888); }
    .dmn-legend-dot { width:10px;height:10px;border-radius:3px;flex-shrink:0; }
    `;

    async function loadDayData(iso) {
        return await api.runOnBackend((iso) => {
            const result = { journal: null, notes: [], relations: [], parents: {}, parentTitles: {} };

            try {
                const journal = api.searchForNote(`#dateNote=${iso}`);
                if (journal) result.journal = { noteId: journal.noteId, title: journal.title };
            } catch (_) {}

            const rows = api.sql.getRows(`
                SELECT noteId, title, type, dateModified
                FROM notes
                WHERE isDeleted = 0
                  AND noteId NOT LIKE '\\_%' ESCAPE '\\'
                  AND date(dateModified) = date(?)
                ORDER BY dateModified ASC
            `, [iso]);

            const ids = new Set();
            for (const r of rows) {
                if (result.journal && r.noteId === result.journal.noteId) continue;
                ids.add(r.noteId);
                result.notes.push({
                    noteId: r.noteId,
                    title:  r.title || '(sem título)',
                    type:   r.type,
                    time:   (r.dateModified || '').slice(11, 16),
                });
            }

            if (ids.size === 0) return result;

            const ph = Array.from(ids).map(() => '?').join(',');

            try {
                const rels = api.sql.getRows(`
                    SELECT noteId AS source, value AS target, name AS relType
                    FROM attributes
                    WHERE isDeleted = 0 AND type = 'relation'
                      AND noteId IN (${ph}) AND value IN (${ph})
                `, [...ids, ...ids]);
                for (const rel of rels) {
                    if (rel.source === rel.target) continue;
                    result.relations.push({
                        source: rel.source,
                        target: rel.target,
                        type:   rel.relType || 'relation',
                    });
                }
            } catch (_) {}

            // Links [[ ]] entre notas do dia (detecção dinâmica da tabela)
            try {
                const tables = api.sql.getRows(
                    "SELECT name FROM sqlite_master WHERE type='table'"
                ).map(r => r.name);
                const linksTable = ['note_links','links','internal_links','note_link']
                    .find(t => tables.includes(t));
                if (linksTable) {
                    const cols = api.sql.getRows("PRAGMA table_info(" + linksTable + ")")
                        .map(r => r.name);
                    const sourceCol = cols.includes('noteId') ? 'noteId'
                        : cols.includes('sourceNoteId') ? 'sourceNoteId'
                        : cols.includes('noteId_from') ? 'noteId_from' : null;
                    const targetCol = cols.includes('targetNoteId') ? 'targetNoteId'
                        : cols.includes('noteId_to') ? 'noteId_to'
                        : cols.includes('targetId') ? 'targetId' : null;
                    if (sourceCol && targetCol) {
                        const links = api.sql.getRows(`
                            SELECT ${sourceCol} AS source, ${targetCol} AS target
                            FROM ${linksTable}
                            WHERE ${sourceCol} IN (${ph}) AND ${targetCol} IN (${ph})
                        `, [...ids, ...ids]);
                        for (const lk of links) {
                            if (lk.source === lk.target) continue;
                            result.relations.push({
                                source: lk.source,
                                target: lk.target,
                                type:   'link',
                            });
                        }
                    }
                }
            } catch (_) {}

            try {
                const brs = api.sql.getRows(`
                    SELECT noteId, parentNoteId FROM branches
                    WHERE isDeleted = 0 AND noteId IN (${ph})
                `, [...ids]);
                const pids = new Set();
                for (const b of brs) {
                    result.parents[b.noteId] = b.parentNoteId;
                    if (b.parentNoteId) pids.add(b.parentNoteId);
                }
                if (pids.size) {
                    const pph = Array.from(pids).map(() => '?').join(',');
                    const pt = api.sql.getRows(`
                        SELECT noteId, title FROM notes
                        WHERE isDeleted = 0 AND noteId IN (${pph})
                    `, [...pids]);
                    for (const p of pt) result.parentTitles[p.noteId] = p.title || p.noteId;
                }
            } catch (_) {}

            return result;
        }, [iso]);
    }

    function render() {
        const iso = dayIso(offset);
        const $body = $root.find('.dmn-body');

        $root.find('.dmn-label').text(dayLabel(offset));
        $root.find('#dmn-count').text('carregando…');
        $root.find('.dmn-legend').empty();

        loadDayData(iso).then(data => {
            const total = data.notes.length;
            $root.find('#dmn-count').text(
                total === 0 ? 'nenhuma nota editada'
                             : `${total} nota${total !== 1 ? 's' : ''} editada${total !== 1 ? 's' : ''}`
            );

            if (total === 0 && !data.journal) {
                $body.html(`<div class="dmn-empty">Nenhuma nota editada em ${esc(dayLabel(offset))}.</div>`);
                return;
            }

            const W = 1200, H = 700;
            const CX = W / 2, CY = H / 2;
            const RX = 420, RY = 240;
            const N = data.notes.length;

            // Posições dos satélites (elipse)
            const pos = {};
            data.notes.forEach((n, i) => {
                const angle = (i / Math.max(1, N)) * 2 * Math.PI - Math.PI / 2;
                pos[n.noteId] = {
                    x: CX + RX * Math.cos(angle),
                    y: CY + RY * Math.sin(angle),
                };
            });

            // Cores por pasta pai
            const colorByParent = {};
            let ci = 0;
            for (const pid of Object.values(data.parents)) {
                if (pid && !colorByParent[pid]) colorByParent[pid] = PALETTE[ci++ % PALETTE.length];
            }
            const colorOf = noteId => {
                const pid = data.parents[noteId];
                return pid && colorByParent[pid] ? colorByParent[pid] : '#6c7086';
            };

            let svg = `<svg class="dmn-svg" viewBox="0 0 ${W} ${H}"
                           xmlns="http://www.w3.org/2000/svg">`;

            // Setas entre notas relacionadas
            for (const rel of data.relations) {
                const a = pos[rel.source], b = pos[rel.target];
                if (!a || !b) continue;
                const mx = (a.x + b.x) / 2;
                const my = (a.y + b.y) / 2 - 24;
                svg += `<path class="dmn-edge"
                             d="M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}"
                             marker-end="url(#dmn-arrow)">
                        <title>${esc(rel.type)}</title>
                        </path>`;
            }

            svg += `<defs>
                    <marker id="dmn-arrow" viewBox="0 0 10 10" refX="9" refY="5"
                            markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                        <path class="dmn-arrow" d="M 0 0 L 10 5 L 0 10 z"/>
                    </marker>
                </defs>`;

            // Nó central — nota do diário
            if (data.journal) {
                const jw = 260, jh = 84;
                const jx = CX - jw / 2, jy = CY - jh / 2;
                svg += `<g class="dmn-journal" data-note-id="${esc(data.journal.noteId)}">
                    <rect class="dmn-journal-rect" x="${jx}" y="${jy}"
                          width="${jw}" height="${jh}" rx="12"/>
                    <text class="dmn-journal-title" x="${CX}" y="${jy + 40}"
                          text-anchor="middle">${esc(data.journal.title)}</text>
                    <text class="dmn-journal-sub" x="${CX}" y="${jy + 62}"
                          text-anchor="middle">diário · ${esc(dayLabel(offset))}</text>
                </g>`;
            }

            // Satélites
            for (const n of data.notes) {
                const p = pos[n.noteId];
                const color = colorOf(n.noteId);
                const w = 190, h = 56;
                const x = p.x - w / 2, y = p.y - h / 2;
                svg += `<g class="dmn-node" data-note-id="${esc(n.noteId)}">
                    <rect class="dmn-node-rect" x="${x}" y="${y}" width="${w}" height="${h}"
                          rx="8" stroke="${color}"/>
                    <text class="dmn-node-title" x="${p.x}" y="${y + 24}"
                          text-anchor="middle">${esc(n.title.length > 24 ? n.title.slice(0, 24) + '…' : n.title)}</text>
                    <text class="dmn-node-time" x="${p.x}" y="${y + 42}"
                          text-anchor="middle">${esc(n.time || '')}</text>
                </g>`;
            }

            svg += `</svg>`;

            $body.html(svg);

            // Legendas por pasta
            const legendItems = new Map();
            for (const n of data.notes) {
                const pid = data.parents[n.noteId];
                if (!pid || legendItems.has(pid)) continue;
                legendItems.set(pid, {
                    pid,
                    color: colorOf(n.noteId),
                    title: data.parentTitles[pid] || pid,
                });
            }
            let legendHtml = '';
            for (const [, item] of legendItems) {
                legendHtml += `<span class="dmn-legend-item">
                    <span class="dmn-legend-dot" style="background:${item.color}"></span>
                    ${esc(item.title.length > 24 ? item.title.slice(0, 24) + '…' : item.title)}
                </span>`;
            }
            $root.find('.dmn-legend').html(legendHtml);

            // Interação
            $body.find('.dmn-node, .dmn-journal').on('click', function () {
                openNote($(this).data('noteId'));
            });

        }).catch(err => {
            $body.html(`<div class="dmn-empty">✗ Erro ao carregar: ${esc(String(err.message || err))}</div>`);
        });
    }

    /* ── Render inicial ─────────────────────────────────── */
    $root.html(`
        <style>${CSS}</style>
        <div class="dmn-wrap">
            <div class="dmn-header">
                <span class="dmn-title">🗺️ Daily Note Map</span>
                <button class="dmn-nav-btn" id="dmn-prev" title="Dia anterior">‹</button>
                <span class="dmn-label" id="dmn-label"></span>
                <button class="dmn-nav-btn" id="dmn-next" title="Próximo dia">›</button>
                <button class="dmn-today-btn" id="dmn-now">hoje</button>
                <span class="dmn-count" id="dmn-count"></span>
            </div>
            <div class="dmn-legend"></div>
            <div class="dmn-body">
                <div class="dmn-empty">Carregando…</div>
            </div>
        </div>
    `);

    $root.find('#dmn-prev').on('click', () => { offset--; render(); });
    $root.find('#dmn-next').on('click', () => { offset++; render(); });
    $root.find('#dmn-now').on('click',  () => { offset = 0; render(); });

    render();

})();
