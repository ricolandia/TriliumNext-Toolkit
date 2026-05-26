const dashboardNote = api.originEntity;
let children = await dashboardNote.getChildNotes();

// --- carregar ordem salva ---
let savedOrder = [];
try {
    const label = dashboardNote.getLabelValue("gridOrder");
    if (label) savedOrder = JSON.parse(label);
} catch(e) {}

// --- ordenar filhos ---
if (savedOrder.length > 0) {
    const map = {};
    children.forEach(n => map[n.noteId] = n);

    const ordered = [];
    savedOrder.forEach(id => {
        if (map[id]) {
            ordered.push(map[id]);
            delete map[id];
        }
    });

    children = ordered.concat(Object.values(map));
}

// --- UI ---
const html = `
<style>
.corkboard-header {
    padding: 15px;
    text-align: right;
    border-bottom: 1px solid var(--main-border-color);
}

.btn {
    background: var(--button-background-color);
    color: var(--button-text-color);
    border: none;
    padding: 10px 18px;
    border-radius: 6px;
    cursor: pointer;
    font-weight: bold;
}

.corkboard-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 20px;
    padding: 20px;
}

.card {
    background: var(--main-background-color);
    border: 1px solid var(--main-border-color);
    border-radius: 8px;
    padding: 15px;
    cursor: grab;
}

.card:active { cursor: grabbing; }

.card h3 {
    margin-top: 0;
    font-size: 16px;
}

.card p {
    font-size: 13px;
    opacity: 0.8;
}

.over {
    border: 2px dashed var(--active-item-background-color);
}
</style>

<div class="corkboard-header">
    <button id="btn-generate" class="btn">📝 Gerar documento</button>
</div>

<div class="corkboard-grid" id="grid"></div>
`;

api.$container.html(html);
const $grid = api.$container.find('#grid');

// --- render ---
for (const child of children) {
    if (child.type === 'code') continue;

    const contentData = await child.getNoteComplement();
    let text = (contentData.content || "")
        .replace(/<\/(p|div|h[1-6]|li)>/gi, '\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]*>/g, '')
        .trim();

    const preview = text.length > 180 ? text.substring(0, 180) + "..." : text;

    $grid.append(`
        <div class="card" data-id="${child.noteId}" draggable="true">
            <h3>${child.title}</h3>
            <p>${preview || "Nota vazia..."}</p>
        </div>
    `);
}

// --- drag ---
let dragged;

api.$container.on('dragstart', '.card', function(e) {
    dragged = this;
    $(this).css('opacity', '0.5');
});

api.$container.on('dragover', '.card', function(e) {
    e.preventDefault();
});

api.$container.on('dragenter', '.card', function() {
    $(this).addClass('over');
});

api.$container.on('dragleave', '.card', function() {
    $(this).removeClass('over');
});

api.$container.on('drop', '.card', function(e) {
    e.stopPropagation();
    if (dragged !== this) {
        $(dragged).insertBefore(this);
    }
});

api.$container.on('dragend', '.card', async function() {
    $(this).css('opacity', '1');
    $('.card').removeClass('over');
    await saveOrder();
});

// --- salvar ordem ---
async function saveOrder() {
    const order = [];
    $grid.find('.card').each(function() {
        order.push($(this).data('id'));
    });

    await api.runOnBackend((noteId, order) => {
        const note = api.getNote(noteId);
        note.setLabel("gridOrder", JSON.stringify(order));
    }, [dashboardNote.noteId, order]);
}

// --- gerar documento ---
api.$container.find('#btn-generate').click(async () => {
    let content = "";

    const ids = [];
    $grid.find('.card').each(function() {
        ids.push($(this).data('id'));
    });

    for (const id of ids) {
        const note = await api.getNote(id);
        const data = await note.getNoteComplement();

        content += `<h2>${note.title}</h2><br>${data.content}<br><br><hr><br>`;
    }

    await api.runOnBackend((parentId, title, content) => {
        api.createNewNote({
            parentNoteId: parentId,
            title: title,
            content: content,
            type: 'text'
        });
    }, [dashboardNote.noteId, "📄 " + dashboardNote.title, content]);

    alert("Documento gerado!");
});