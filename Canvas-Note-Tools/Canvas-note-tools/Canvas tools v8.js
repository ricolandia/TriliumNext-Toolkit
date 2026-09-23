console.log("🚀 Canvas Linker widget carregado (v8.0)");
/**
 * ╔══════════════════════════════════════════════════════╗
 * ║        Canvas Note Linker — TriliumNext  v8         ║
 * ║        + Gerador de Fluxos (DSL → layout em        ║
 * ║          camadas, sem setas; ciclos suportados)     ║
 * ║        + Inserir templates #canvasTemplate (🧩)     ║
 * ║        + Criar nota canvas / salvar como template   ║
 * ║        (v6: captura, nova nota, relações por seta,  ║
 * ║         longform, editor, sync, remoção de card)    ║
 * ╚══════════════════════════════════════════════════════╝
 */

// ── Constantes ──────────────────────────────────────────
const CARD_CONFIG = {
    width:           330,
    strokeColor:     '#5c5f77',
    backgroundColor: 'transparent',
    titleFontSize:   24,
    excerptFontSize: 14,
    fontFamily:      2,
    roughness:       0,
    cornerRadius:    { type: 3 },
    cols:            5,
    colGap:          280,
    rowGap:          40,
    originX:         60,
    originY:         60,
    padX:            18,
    padY:            14,
    excerptSlice:    240,
};

const RELATION_TYPES = [
    { value: 'relatedTo',   label: 'Relacionado'  },
    { value: 'inspires',    label: 'Inspira'      },
    { value: 'contradicts', label: 'Contradiz'    },
    { value: 'supports',    label: 'Sustenta'     },
    { value: 'precedes',    label: 'Precede'      },
    { value: 'exemplifies', label: 'Exemplifica'  },
];

const RELATION_OPTIONS_HTML =
    '<option value="none">Pular (sem relação)</option>' +
    RELATION_TYPES.map(r => `<option value="${r.value}">${r.label}</option>`).join('');

const TEXT_TO_RELATION = {
    'inspira':      'inspires',
    'inspires':     'inspires',
    'contradiz':    'contradicts',
    'contradicts':  'contradicts',
    'sustenta':     'supports',
    'supports':     'supports',
    'suporta':      'supports',
    'precede':      'precedes',
    'precedes':     'precedes',
    'exemplifica':  'exemplifies',
    'exemplifies':  'exemplifies',
    'relacionado':  'relatedTo',
    'related':      'relatedTo',
    'relacao':      'relatedTo',
    'causa':        'precedes',
    'exemplo':      'exemplifies',
    'contra':       'contradicts',
    'refuta':       'contradicts',
    'discorda':     'contradicts',
    'apoia':        'supports',
};

// Regex para limpeza de HTML (usada nos callbacks de runOnBackend)
const HTML_CLEAN_PATTERN = [
    [/<style[^>]*>[\s\S]*?<\/style>/gi, ''],
    [/<script[^>]*>[\s\S]*?<\/script>/gi, ''],
    [/<\/(p|div|li|h[1-6]|br)>/gi, ' '],
    [/<[^>]+>/g, ''],
    [/&nbsp;/g, ' '],
    [/&amp;/g, '&'],
    [/&lt;/g, '<'],
    [/&gt;/g, '>'],
    [/&quot;/g, '"'],
    [/&#39;/g, "'"],
    [/&[a-z]+;/g, ' '],
    [/&#\d+;/g, ' '],
    [/\s+/g, ' '],
];

// ── Helpers ──────────────────────────────────────────────
/**
 * Escapa caracteres especiais de HTML para evitar XSS
 * ao inserir strings não-confiáveis em innerHTML.
 */
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Serializa HTML_CLEAN_PATTERN para passagem via runOnBackend.
 * Centraliza a lógica que antes era duplicada em _onSearch e _insertCard.
 */
function getCleanPatterns() {
    return HTML_CLEAN_PATTERN.map(([reSrc, repl]) => [reSrc.source, reSrc.flags, repl]);
}

// ── FLOW ENGINE (início) ────────────────────────────────
// Gerador de fluxos: DSL → layout em camadas → elementos Excalidraw.
// As ligações (A -> B) servem apenas para calcular as camadas e a
// ordem dos nós — nenhuma seta é desenhada. Funções puras (sem acesso
// a api/DOM) para permitir teste isolado.

const FLOW_CONFIG = {
    nodeW: 260, nodeH: 84,
    startW: 220, startH: 70,
    decisionW: 230, decisionH: 120,
    gapX: 90, gapY: 70,
    padX: 14, padY: 14,
    grid: 10,
    decisionTextRatio: 0.62,
    fontSize: 15, lineHeight: 1.35,
    fontFamily: 2, roughness: 0,
    strokeWidth: 2,
    marginX: 160, marginY: 0,
    colors: {
        inicio:   { bg: '#d0ebff', stroke: '#1c7ed6', text: '#0b4a82' },
        processo: { bg: '#f1f3f5', stroke: '#495057', text: '#212529' },
        decisao:  { bg: '#fff3bf', stroke: '#e8590c', text: '#7c3a00' },
        fim:      { bg: '#d3f9d8', stroke: '#2f9e44', text: '#1b5e20' },
    },
};

const FLOW_DEFAULT_SPEC = [
    '# Exemplo — edite ou apague. Tipos: inicio | processo | decisao | fim',
    'Início: Recebe pedido [inicio]',
    'Brief: Tem briefing? [decisao]',
    'Orçamento: Montar orçamento [processo]',
    'Info: Pedir mais informações [processo]',
    'Proposta: Enviar proposta [processo]',
    'Fim: Aprovado e entregue [fim]',
    '',
    'Início -> Brief',
    'Brief -> Orçamento',
    'Brief -> Info',
    'Info -> Brief',
    'Orçamento -> Proposta',
    'Proposta -> Fim',
].join('\n');

const FLOW_ID = '[\\p{L}\\p{N}_.\\-]+';
const FLOW_NODE_RE = new RegExp('^(' + FLOW_ID + ')\\s*:\\s*(.+?)(?:\\s*\\[(inicio|processo|decisao|fim)\\])?\\s*$', 'iu');
const FLOW_EDGE_RE = new RegExp('^(' + FLOW_ID + ')\\s*->\\s*(' + FLOW_ID + ')\\s*(?::\\s*(.+))?$', 'u');

function flowRand() { return Math.floor(Math.random() * 999999); }

// Índices fracionários válidos para z-order do Excalidraw (ordem lexicográfica).
const FLOW_INDEX_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
function flowZIndex(n) {
    const A = FLOW_INDEX_ALPHABET;
    return 'a' + A[Math.floor(n / A.length)] + A[n % A.length];
}

function flowWrapText(text, maxLen) {
    if (!text || text.length <= maxLen) return text || '';
    const words = String(text).split(' ');
    const lines = [];
    let current = '';
    for (const word of words) {
        const test = current ? current + ' ' + word : word;
        if (test.length > maxLen && current) { lines.push(current); current = word; }
        else { current = test; }
    }
    if (current) lines.push(current);
    return lines.join('\n');
}

/**
 * Interpreta a DSL:
 *   ID: Rótulo [tipo]        → define nó (tipo padrão: processo)
 *   A -> B : rótulo          → ligação (rótulo opcional)
 *   # comentário             → ignorado
 */
function parseFlowSpec(text) {
    const nodes = new Map();
    const edges = [];
    const errors = [];

    (text || '').split('\n').forEach((raw, idx) => {
        const line = raw.trim();
        if (!line || line.startsWith('#')) return;

        const edge = line.match(FLOW_EDGE_RE);
        if (edge) {
            edges.push({ from: edge[1], to: edge[2], label: (edge[3] || '').trim(), line: idx + 1 });
            return;
        }

        const node = line.match(FLOW_NODE_RE);
        if (node) {
            const id = node[1];
            if (nodes.has(id)) { errors.push(`Linha ${idx + 1}: nó "${id}" duplicado.`); return; }
            nodes.set(id, { id, label: node[2].trim(), type: (node[3] || 'processo').toLowerCase() });
            return;
        }

        errors.push(`Linha ${idx + 1}: não entendi "${line.slice(0, 40)}". Use "ID: Rótulo [tipo]" ou "ID -> ID : rótulo".`);
    });

    for (const e of edges) {
        if (!nodes.has(e.from)) errors.push(`Linha ${e.line}: origem "${e.from}" não foi definida.`);
        if (!nodes.has(e.to))   errors.push(`Linha ${e.line}: destino "${e.to}" não foi definido.`);
    }

    return {
        nodes: [...nodes.values()],
        edges: edges.filter(e => nodes.has(e.from) && nodes.has(e.to)),
        errors,
    };
}

function flowNodeSize(node) {
    const cfg = FLOW_CONFIG;
    const base = node.type === 'decisao' ? [cfg.decisionW, cfg.decisionH]
               : (node.type === 'inicio' || node.type === 'fim') ? [cfg.startW, cfg.startH]
               : [cfg.nodeW, cfg.nodeH];
    const textW = node.type === 'decisao'
        ? Math.round(base[0] * cfg.decisionTextRatio)
        : base[0] - cfg.padX * 2;
    const charsPerLine = Math.max(6, Math.floor(textW / (cfg.fontSize * 0.60)));
    const wrapped = flowWrapText(node.label, charsPerLine);
    const lines = wrapped.split('\n').length;
    const textH = Math.ceil(lines * cfg.fontSize * cfg.lineHeight);
    return { w: base[0], h: Math.max(base[1], textH + cfg.padY * 2 + 14), wrapped, textH, textW };
}

/**
 * Detecta arestas de retorno (as que fecham ciclos) via DFS com cores.
 * Retorna um Set com os índices dessas arestas em `edges`.
 */
function flowBackEdges(nodes, edges) {
    const adj = new Map(nodes.map(n => [n.id, []]));
    edges.forEach((e, i) => { if (adj.has(e.from)) adj.get(e.from).push(i); });
    const color = new Map(nodes.map(n => [n.id, 0])); // 0 branco, 1 cinza, 2 preto
    const back = new Set();
    const visit = (id) => {
        color.set(id, 1);
        for (const i of adj.get(id) || []) {
            const to = edges[i].to;
            if (color.get(to) === 1) back.add(i);
            else if (color.get(to) === 0) visit(to);
        }
        color.set(id, 2);
    };
    for (const n of nodes) if (color.get(n.id) === 0) visit(n.id);
    return back;
}

/**
 * Ranking por longest-path sobre o DAG (sem as arestas de retorno).
 * Todo nó recebe uma camada; nós sem precedentes vão para a camada 0.
 */
function flowRank(nodes, edges, backSet) {
    const preds = new Map(nodes.map(n => [n.id, []]));
    const succs = new Map(nodes.map(n => [n.id, []]));
    const indeg = new Map(nodes.map(n => [n.id, 0]));
    edges.forEach((e, i) => {
        if (backSet.has(i)) return;
        succs.get(e.from).push(e.to);
        preds.get(e.to).push(e.from);
        indeg.set(e.to, indeg.get(e.to) + 1);
    });
    const rank = new Map(nodes.map(n => [n.id, 0]));
    const pending = new Map(indeg);
    const queue = nodes.filter(n => pending.get(n.id) === 0).map(n => n.id);
    while (queue.length) {
        const id = queue.shift();
        for (const nb of succs.get(id)) {
            rank.set(nb, Math.max(rank.get(nb), rank.get(id) + 1));
            pending.set(nb, pending.get(nb) - 1);
            if (pending.get(nb) === 0) queue.push(nb);
        }
    }
    return { rank, preds, succs };
}

/**
 * Layout em camadas (Sugiyama-lite): arestas de retorno por DFS, ranking
 * por longest-path, ordenação por mediana (menos cruzamentos) e posições
 * com faixas centralizadas + nudge para o barycenter dos pais.
 * Tudo é calculado em espaço abstrato (camada × eixo cruzado) e transposto
 * no final — o modo LR nunca troca largura/altura. Sem sobreposição por
 * construção. Retorna nós posicionados + arestas.
 */
function layoutFlow(nodes, edges, direction = 'TB') {
    const cfg = FLOW_CONFIG;
    const sizes = new Map(nodes.map(n => [n.id, flowNodeSize(n)]));
    const gapMain = cfg.gapY;    // entre camadas (eixo principal)
    const gapCross = cfg.gapX;   // dentro da camada (eixo cruzado)

    const backSet = flowBackEdges(nodes, edges);
    const { rank, preds, succs } = flowRank(nodes, edges, backSet);

    // agrupa por camada, preservando a ordem do spec
    const ranks = new Map();
    for (const n of nodes) {
        const r = rank.get(n.id);
        if (!ranks.has(r)) ranks.set(r, []);
        ranks.get(r).push(n.id);
    }
    const rankKeys = [...ranks.keys()].sort((a, b) => a - b);

    // ordena dentro de cada camada: mediana da posição dos vizinhos da
    // camada adjacente (passadas para baixo e para cima, ordem estável)
    const order = new Map();
    const median = (vals) => {
        const s = [...vals].sort((a, b) => a - b);
        const m = s.length >> 1;
        return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
    };
    for (const rk of rankKeys) ranks.get(rk).forEach((id, i) => order.set(id, i));
    for (let pass = 0; pass < 4; pass++) {
        const down = pass % 2 === 0;
        const rks = down ? rankKeys.slice(1) : rankKeys.slice(0, -1).reverse();
        for (const rk of rks) {
            const ids = ranks.get(rk);
            const score = new Map();
            for (const id of ids) {
                const neigh = (down ? preds.get(id) : succs.get(id)) || [];
                const vals = neigh.map(nb => order.get(nb)).filter(v => v !== undefined);
                score.set(id, vals.length ? median(vals) : order.get(id));
            }
            ids.sort((a, b) => (score.get(a) - score.get(b)) || (order.get(a) - order.get(b)));
            ids.forEach((id, i) => order.set(id, i));
        }
    }

    // eixos abstratos: main (camada) e cross (dentro da camada).
    // No TB o eixo principal é vertical (altura); no LR é horizontal (largura).
    const mainSize = (id) => direction === 'TB' ? sizes.get(id).h : sizes.get(id).w;
    const crossSize = (id) => direction === 'TB' ? sizes.get(id).w : sizes.get(id).h;
    const crossCenter = new Map();

    for (const rk of rankKeys) {
        const ids = ranks.get(rk);
        // posição inicial: empilhados com gap, faixa centralizada em 0
        const total = ids.reduce((s, id) => s + crossSize(id), 0) + gapCross * (ids.length - 1);
        let cur = -total / 2;
        const centers = new Map();
        for (const id of ids) {
            centers.set(id, cur + crossSize(id) / 2);
            cur += crossSize(id) + gapCross;
        }
        // nudge: puxa cada nó para o barycenter dos pais, sem cruzar vizinhos
        for (let i = 0; i < ids.length; i++) {
            const id = ids[i];
            const ps = (preds.get(id) || []).map(p => crossCenter.get(p)).filter(v => v !== undefined);
            if (!ps.length) continue;
            const want = ps.reduce((a, b) => a + b, 0) / ps.length;
            const lo = i > 0
                ? centers.get(ids[i - 1]) + crossSize(ids[i - 1]) / 2 + gapCross + crossSize(id) / 2
                : -Infinity;
            const hi = i < ids.length - 1
                ? centers.get(ids[i + 1]) - crossSize(ids[i + 1]) / 2 - gapCross - crossSize(id) / 2
                : Infinity;
            centers.set(id, Math.max(lo, Math.min(want, hi)));
        }
        // garante o gap mínimo (L→R) e re-centraliza a faixa
        for (let i = 1; i < ids.length; i++) {
            const prev = ids[i - 1], id = ids[i];
            const minC = centers.get(prev) + crossSize(prev) / 2 + gapCross + crossSize(id) / 2;
            if (centers.get(id) < minC) centers.set(id, minC);
        }
        const first = centers.get(ids[0]) - crossSize(ids[0]) / 2;
        const last = centers.get(ids[ids.length - 1]) + crossSize(ids[ids.length - 1]) / 2;
        const shift = -(first + last) / 2;
        ids.forEach(id => crossCenter.set(id, centers.get(id) + shift));
    }

    // eixo principal: uma faixa por camada, com o nó centralizado na banda
    const mainAxis = new Map();
    let cursor = 0;
    for (const rk of rankKeys) {
        const extent = Math.max(...ranks.get(rk).map(mainSize));
        for (const id of ranks.get(rk)) mainAxis.set(id, cursor + (extent - mainSize(id)) / 2);
        cursor += extent + gapMain;
    }

    // monta os nós posicionados (dimensões reais; transposição só aqui)
    const placed = nodes.map(n => {
        const s = sizes.get(n.id);
        const cross = crossCenter.get(n.id) - crossSize(n.id) / 2;
        const main = mainAxis.get(n.id);
        const x = direction === 'TB' ? cross : main;
        const y = direction === 'TB' ? main : cross;
        return { ...n, x, y, w: s.w, h: s.h, rank: rank.get(n.id), wrapped: s.wrapped, textH: s.textH, textW: s.textW };
    });

    // grade e normalização para origem 0,0
    const g = cfg.grid;
    for (const p of placed) { p.x = Math.round(p.x / g) * g; p.y = Math.round(p.y / g) * g; }
    const dx = Math.min(...placed.map(p => p.x));
    const dy = Math.min(...placed.map(p => p.y));
    for (const p of placed) { p.x -= dx; p.y -= dy; }

    return { nodes: placed, edges };
}

function flowBaseEl(type, o) {
    const cfg = FLOW_CONFIG;
    return {
        id: o.id, type,
        x: o.x, y: o.y, width: o.width, height: o.height, angle: 0,
        strokeColor: o.strokeColor, backgroundColor: o.backgroundColor,
        fillStyle: 'solid', strokeWidth: o.strokeWidth ?? cfg.strokeWidth, strokeStyle: 'solid',
        roughness: cfg.roughness, opacity: 100,
        groupIds: o.groupIds || [], roundness: o.roundness ?? null,
        seed: flowRand(), version: 1, versionNonce: flowRand(),
        isDeleted: false, boundElements: o.boundElements || [],
        updated: Date.now(), link: null, locked: false,
        index: o.index,
    };
}

function flowTextEl(o) {
    const cfg = FLOW_CONFIG;
    return {
        id: o.id, type: 'text',
        x: o.x, y: o.y, width: o.width, height: o.height, angle: 0,
        strokeColor: o.strokeColor, backgroundColor: 'transparent',
        fillStyle: 'solid', strokeWidth: 1, strokeStyle: 'solid',
        roughness: cfg.roughness, opacity: 100,
        groupIds: o.groupIds || [], roundness: null,
        seed: flowRand(), version: 1, versionNonce: flowRand(),
        isDeleted: false, boundElements: [],
        updated: Date.now(), link: null, locked: false,
        text: o.text, fontSize: o.fontSize, fontFamily: cfg.fontFamily,
        textAlign: o.textAlign || 'center', verticalAlign: 'middle',
        originalText: o.text, lineHeight: cfg.lineHeight, autoResize: false,
        index: o.index,
    };
}

/**
 * Gera os elementos Excalidraw do fluxo (formas + texto; sem setas).
 * `origin` desloca o conjunto todo. Retorna { elements, width, height, layers }.
 */
function buildFlowElements(nodes, edges, direction = 'TB', origin = { x: 0, y: 0 }) {
    const cfg = FLOW_CONFIG;
    const { nodes: placed } = layoutFlow(nodes, edges, direction);

    const els = [];
    let seq = 0;
    const nextIndex = () => flowZIndex(seq++);

    const bbox = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
    const grow = (x, y, w, h) => {
        bbox.minX = Math.min(bbox.minX, x);
        bbox.minY = Math.min(bbox.minY, y);
        bbox.maxX = Math.max(bbox.maxX, x + w);
        bbox.maxY = Math.max(bbox.maxY, y + h);
    };

    for (const n of placed) {
        const color = cfg.colors[n.type] || cfg.colors.processo;
        const groupId = 'flw_g_' + Math.random().toString(36).slice(2, 14);
        const shapeId = 'flw_s_' + Math.random().toString(36).slice(2, 14);

        const shapeType = n.type === 'decisao' ? 'diamond' : 'rectangle';
        els.push(flowBaseEl(shapeType, {
            id: shapeId,
            x: origin.x + n.x, y: origin.y + n.y, width: n.w, height: n.h,
            strokeColor: color.stroke, backgroundColor: color.bg,
            roundness: shapeType === 'rectangle' ? { type: 3 } : null,
            groupIds: [groupId],
            index: nextIndex(),
        }));
        grow(n.x, n.y, n.w, n.h);

        els.push(flowTextEl({
            id: 'flw_t_' + Math.random().toString(36).slice(2, 14),
            x: origin.x + n.x + (n.w - n.textW) / 2,
            y: origin.y + n.y + Math.max(2, (n.h - n.textH) / 2),
            width: n.textW,
            height: n.textH,
            text: n.wrapped, fontSize: cfg.fontSize,
            strokeColor: color.text,
            groupIds: [groupId],
            index: nextIndex(),
        }));
    }

    const layers = new Set(placed.map(n => n.rank)).size;
    const width  = isFinite(bbox.minX) ? bbox.maxX - bbox.minX : 0;
    const height = isFinite(bbox.minY) ? bbox.maxY - bbox.minY : 0;
    return { elements: els, width, height, layers };
}
// ── FLOW ENGINE (fim) ───────────────────────────────────

// ────────────────────────────────────────────────────────
class CanvasLinkerWidget extends api.NoteContextAwareWidget {
    get position()     { return 100; }
    get parentWidget() { return 'center-pane'; }
    isEnabled()        { return true; }

    _captureMode         = false;
    _captureCanvasNoteId = null;

    /* ── Ciclo de vida ─────────────────────────────────── */
    doRender() {
        this.$widget = $('<div style="display:none;height:0;overflow:hidden;">');
        if (!document.getElementById('clw-root')) {
            this._injectFloat();
        }
        window._clw = {
            search:               (q)                  => this._onSearch(q),
            insert:               (id, title, excerpt) => this._insertCard(id, title, excerpt),
            generateLongform:     ()                   => this._generateLongform(),
            toggleCapture:        ()                   => this._toggleCapture(),
            createNote:           ()                   => this._createNote(),
            openRelationsPanel:   ()                   => this._openRelationsPanel(),
            confirmSaveRelations: ()                   => this._confirmSaveRelations(),
            removeCard:           ()                   => this._openRemovePanel(),
            editCard:             ()                   => this._openEditPanel(),
            syncCards:            ()                   => this._syncCards(),
            saveEditor:           ()                   => this._saveEditor(),
            openFlowPanel:        ()                   => this._toggleFlowPanel(),
            openTplPanel:         ()                   => this._toggleTplPanel(),
            openHelpPanel:        ()                   => this._toggleHelpPanel(),
            filterTemplates:      ()                   => this._renderTemplates(),
            generateFlow:         ()                   => this._generateFlowToCanvas(),
            createFlowNote:       ()                   => this._createFlowNote(),
            saveFlowTemplate:     ()                   => this._saveFlowTemplate(),
        };
        // Restaura modo captura se estava ativo antes de um hot-reload
        setTimeout(() => this._restoreCaptureState(), 200);
        return this.$widget;
    }

    /* ── Helpers de DOM ────────────────────────────────── */
    _el(id) { return document.getElementById(id); }
    _els(sel, parent) { return (parent || document).querySelectorAll(sel); }
    _show(id) { const el = this._el(id); if (el) el.style.display = 'block'; }
    _hide(id) { const el = this._el(id); if (el) el.style.display = 'none'; }

    /* ── UI: Injeção da estrutura flutuante ────────────── */
    _injectFloat() {
        const html = /* html */`
        <div id="clw-root">
            <!-- Painel de busca -->
            <div id="clw-panel" class="clw-panel" style="width:340px">
                <div class="clw-panel-header">
                    <span class="clw-panel-icon">🔗</span>
                    <span class="clw-panel-title">Inserir nota no Canvas</span>
                </div>
                <input id="clw-search" class="clw-input" type="text"
                    placeholder="Buscar nota por título…"
                    autocomplete="off" spellcheck="false" />
                <div id="clw-results" class="clw-scroll"></div>
                <div id="clw-status" class="clw-status">Nenhuma nota encontrada.</div>
            </div>

            <!-- Painel de nova nota -->
            <div id="clw-newnote-float" class="clw-panel" style="width:340px">
                <div class="clw-panel-title">Nova nota filha</div>
                <div class="clw-row">
                    <input id="clw-newnote-title" class="clw-input" type="text"
                        placeholder="Título da nota…"
                        autocomplete="off" spellcheck="false" />
                    <button id="clw-newnote-confirm" class="clw-btn-primary">Criar</button>
                </div>
            </div>

            <!-- Painel de relações -->
            <div id="clw-relmap-panel" class="clw-panel clw-panel--green" style="width:340px">
                <div class="clw-panel-header">
                    <span class="clw-panel-icon">🕸️</span>
                    <span class="clw-panel-title">Relações detectadas</span>
                    <button id="clw-relmap-close" class="clw-panel-close">✕</button>
                </div>
                <div id="clw-relmap-list" class="clw-scroll clw-rel-list"></div>
                <div id="clw-relmap-empty" class="clw-status">
                    Nenhuma seta conectando cards encontrada.
                </div>
                <button id="clw-relmap-save" class="clw-btn-primary clw-btn--green clw-btn-block">
                    Salvar relações
                </button>
            </div>

            <!-- Painel de remoção de card -->
            <div id="clw-remove-panel" class="clw-panel clw-panel--danger" style="width:300px">
                <div class="clw-panel-header">
                    <span class="clw-panel-icon">🗑️</span>
                    <span class="clw-panel-title">Remover card do canvas</span>
                    <button id="clw-remove-close" class="clw-panel-close">✕</button>
                </div>
                <div id="clw-remove-results" class="clw-scroll" style="max-height:280px"></div>
                <div id="clw-remove-empty" class="clw-status">Nenhum card vinculado encontrado.</div>
            </div>

            <!-- Painel de edição de card -->
            <div id="clw-edit-panel" class="clw-panel clw-panel--edit" style="width:300px">
                <div class="clw-panel-header">
                    <span class="clw-panel-icon">✏️</span>
                    <span class="clw-panel-title">Editar nota do card</span>
                    <button id="clw-edit-close" class="clw-panel-close">✕</button>
                </div>
                <div id="clw-edit-results" class="clw-scroll" style="max-height:280px"></div>
                <div id="clw-edit-empty" class="clw-status">Nenhum card vinculado encontrado.</div>
            </div>

            <!-- Painel gerador de fluxos -->
            <div id="clw-flow-panel" class="clw-panel clw-panel--flow" style="width:560px">
                <div class="clw-panel-header">
                    <span class="clw-panel-icon">🪄</span>
                    <span class="clw-panel-title">Gerar fluxo</span>
                    <button id="clw-flow-close" class="clw-panel-close">✕</button>
                </div>
                <textarea id="clw-flow-spec" class="clw-textarea" rows="14" spellcheck="false"
                    placeholder="Início: Recebe pedido [inicio]&#10;Brief: Tem briefing? [decisao]&#10;&#10;Início -> Brief&#10;Brief -> Orçamento"></textarea>
                <div class="clw-row" style="margin-top:10px">
                    <label class="clw-flow-label">Direção</label>
                    <select id="clw-flow-dir" class="clw-rel-select" style="margin-top:0">
                        <option value="TB">Vertical (TB)</option>
                        <option value="LR">Horizontal (LR)</option>
                    </select>
                </div>
                <div class="clw-row" style="margin-top:8px">
                    <input id="clw-flow-title" class="clw-input" type="text"
                        placeholder="Título (para criar nota ou salvar template)…"
                        autocomplete="off" spellcheck="false" />
                </div>
                <div class="clw-row" style="margin-top:8px; gap:7px">
                    <button id="clw-flow-generate" class="clw-btn-primary" style="flex:1">Gerar no canvas</button>
                </div>
                <div class="clw-row" style="margin-top:8px; gap:7px">
                    <button id="clw-flow-example" class="clw-btn-ghost" style="flex:1">Exemplo</button>
                    <button id="clw-flow-savenote" class="clw-btn-ghost" style="flex:1">Criar nota</button>
                    <button id="clw-flow-savetpl" class="clw-btn-ghost" style="flex:1">Template</button>
                </div>
                <div id="clw-flow-status" class="clw-status"></div>
            </div>

            <!-- Painel de templates -->
            <div id="clw-tpl-panel" class="clw-panel" style="width:380px">
                <div class="clw-panel-header">
                    <span class="clw-panel-icon">🧩</span>
                    <span class="clw-panel-title">Inserir template</span>
                    <button id="clw-tpl-close" class="clw-panel-close">✕</button>
                </div>
                <input id="clw-tpl-filter" class="clw-input" type="text"
                    placeholder="Filtrar templates…" autocomplete="off" spellcheck="false" />
                <div id="clw-tpl-list" class="clw-scroll" style="max-height:320px"></div>
                <div id="clw-tpl-status" class="clw-status">Nenhum template encontrado.</div>
            </div>

            <!-- Painel de ajuda -->
            <div id="clw-help-panel" class="clw-panel" style="width:550px">
                <div class="clw-panel-header">
                    <span class="clw-panel-icon">❓</span>
                    <span class="clw-panel-title">Ajuda — o que faz cada botão</span>
                    <button id="clw-help-close" class="clw-panel-close">✕</button>
                </div>
                <div class="clw-help-list clw-scroll">
                    <div class="clw-help-row"><span class="clw-help-ic">🔗</span><div>
                        <div class="clw-help-name">Inserir nota</div>
                        <div class="clw-help-desc">Busca e insere a nota como card.</div>
                    </div></div>
                    <div class="clw-help-row"><span class="clw-help-ic">🎯</span><div>
                        <div class="clw-help-name">Modo captura</div>
                        <div class="clw-help-desc">Cada nota clicada entra como card.</div>
                    </div></div>
                    <div class="clw-help-row"><span class="clw-help-ic">📝</span><div>
                        <div class="clw-help-name">Nova nota</div>
                        <div class="clw-help-desc">Cria nota filha e insere como card.</div>
                    </div></div>
                    <div class="clw-help-row"><span class="clw-help-ic">🕸️</span><div>
                        <div class="clw-help-name">Relações por setas</div>
                        <div class="clw-help-desc">Detecta setas e salva a relação.</div>
                    </div></div>
                    <div class="clw-help-row"><span class="clw-help-ic">✏️</span><div>
                        <div class="clw-help-name">Editar cards</div>
                        <div class="clw-help-desc">Abre o editor da nota do card.</div>
                    </div></div>
                    <div class="clw-help-row"><span class="clw-help-ic">⟳</span><div>
                        <div class="clw-help-name">Sincronizar cards</div>
                        <div class="clw-help-desc">Atualiza título e resumo dos cards.</div>
                    </div></div>
                    <div class="clw-help-row"><span class="clw-help-ic">📄</span><div>
                        <div class="clw-help-name">Longform</div>
                        <div class="clw-help-desc">Gera documento na ordem das setas.</div>
                    </div></div>
                    <div class="clw-help-row"><span class="clw-help-ic">🪄</span><div>
                        <div class="clw-help-name">Gerar fluxo</div>
                        <div class="clw-help-desc">DSL em texto → diagrama em camadas; sem setas.</div>
                    </div></div>
                    <div class="clw-help-row"><span class="clw-help-ic">🧩</span><div>
                        <div class="clw-help-name">Templates</div>
                        <div class="clw-help-desc">Insere uma nota <b>#canvasTemplate</b>.</div>
                    </div></div>
                    <div class="clw-help-row"><span class="clw-help-ic">🗑️</span><div>
                        <div class="clw-help-name">Remover card</div>
                        <div class="clw-help-desc">Lista e remove cards do canvas.</div>
                    </div></div>
                </div>
                <div class="clw-help-foot">
                    <b>Esc</b> ou clique fora fecha os painéis.
                </div>
            </div>

            <!-- Editor flutuante -->
            <div id="clw-editor-float" class="clw-editor-overlay">
                <div class="clw-editor-box">
                    <div class="clw-editor-header">
                        <span class="clw-panel-icon">✏️</span>
                        <span class="clw-editor-title">Editar nota</span>
                        <button id="clw-editor-close" class="clw-panel-close">✕</button>
                    </div>
                    <input id="clw-editor-note-title" class="clw-input" type="text"
                        placeholder="Título da nota…" autocomplete="off" spellcheck="false" />
                    <div id="clw-editor-content" class="clw-editor-content"
                        contenteditable="true" spellcheck="false"></div>
                    <div class="clw-editor-actions">
                        <button id="clw-editor-save" class="clw-btn-primary">Salvar</button>
                    </div>
                </div>
            </div>

            <!-- Banner captura -->
            <div id="clw-capture-banner" class="clw-banner">
                <span class="clw-banner-icon">🎯</span>
                <span>Modo Captura ativo &mdash; toda nota clicada entra no canvas</span>
            </div>

            <!-- Toolbar de botões -->
            <div class="clw-toolbar">
                <button id="clw-btn"          class="clw-round-btn" title="Inserir nota no Canvas">🔗</button>
                <button id="clw-btn-capture"  class="clw-round-btn" title="Modo Captura">🎯</button>
                <button id="clw-btn-newnote"  class="clw-round-btn" title="Criar nova nota filha">📝</button>
                <button id="clw-btn-saverel"  class="clw-round-btn" title="Relações por setas">🕸️</button>
                <button id="clw-btn-edit"     class="clw-round-btn" title="Editar nota do card">✏️</button>
                <button id="clw-btn-sync"     class="clw-round-btn" title="Atualizar cards das notas">⟳</button>
                <button id="clw-btn-longform" class="clw-round-btn" title="Gerar Longform">📄</button>
                <button id="clw-btn-flow"     class="clw-round-btn" title="Gerar fluxo (diagrama)">🪄</button>
                <button id="clw-btn-tpl"      class="clw-round-btn" title="Inserir template no canvas">🧩</button>
                <button id="clw-btn-remove"   class="clw-round-btn clw-round-btn--danger" title="Remover card do Canvas">🗑️</button>
                <button id="clw-btn-help"     class="clw-round-btn clw-round-btn--help" title="Ajuda — o que faz cada botão">?</button>
            </div>
        </div>
        `;

        document.body.insertAdjacentHTML('beforeend', html);

        // Injeta CSS como stylesheet para melhor organização e performance
        const style = document.createElement('style');
        style.id = 'clw-style';
        style.textContent = /* css */`
/* ═══════════════════ CLW — CSS ═══════════════════ */
@keyframes clwSlideIn {
    from { opacity:0; transform:translateY(10px) scale(0.96); }
    to   { opacity:1; transform:translateY(0)   scale(1);    }
}
@keyframes clwPulse {
    0%   { box-shadow:0 0 0 0    rgba(243,139,168,0.7); }
    70%  { box-shadow:0 0 0 10px rgba(243,139,168,0);   }
    100% { box-shadow:0 0 0 0    rgba(243,139,168,0);   }
}
@keyframes clwFadeIn {
    from { opacity:0; }
    to   { opacity:1; }
}

/* ── Root container ── */
#clw-root {
    position:fixed; left:0; right:0; bottom:40px; z-index:9999;
    display:none; flex-direction:column; align-items:center; gap:12px;
    font-family:var(--detail-font-family,'Segoe UI',system-ui,sans-serif);
    font-size:13px; pointer-events:none;
}
#clw-root > * { pointer-events:auto; }

/* ── Painéis ── */
.clw-panel {
    display:none;
    background:var(--accented-background-color,#1e1e2e);
    border:1px solid var(--main-border-color,#45475a);
    border-radius:14px; padding:16px; width:300px;
    max-width:calc(100vw - 32px);
    box-sizing:border-box;
    box-shadow:
        0 0 0 1px rgba(203,166,247,0.06),
        0 4px 24px rgba(0,0,0,0.45),
        0 1px 4px  rgba(0,0,0,0.3);
    animation:clwSlideIn 0.18s cubic-bezier(0.16,1,0.3,1);
    backdrop-filter:blur(8px);
}
.clw-panel--green {
    box-shadow:
        0 0 0 1px rgba(166,227,161,0.06),
        0 4px 24px rgba(0,0,0,0.45),
        0 1px 4px  rgba(0,0,0,0.3);
}
.clw-panel-header {
    display:flex; align-items:center; gap:8px; margin-bottom:12px;
}
.clw-panel-icon   { font-size:16px; line-height:1; }
.clw-panel-title  {
    font-size:11px; font-weight:600; text-transform:uppercase;
    letter-spacing:0.08em; color:var(--muted-text-color,#6c7086);
}
.clw-panel-close {
    margin-left:auto; background:none; border:none;
    color:var(--muted-text-color,#6c7086); cursor:pointer;
    font-size:16px; line-height:1; padding:2px 6px; border-radius:5px;
    transition:color 0.15s, background 0.15s;
}
.clw-panel-close:hover {
    color:var(--main-text-color,#cdd6f4); background:var(--hover-item-background-color,#313244);
}

/* ── Inputs ── */
.clw-input {
    width:100%; padding:9px 12px; border:1px solid var(--main-border-color,#45475a);
    border-radius:8px; background:var(--main-background-color,#181825);
    color:var(--main-text-color,#cdd6f4); font-size:13px;
    box-sizing:border-box; outline:none;
    transition:border-color 0.2s, box-shadow 0.2s;
}
.clw-input:focus {
    border-color:#cba6f7 !important;
    box-shadow:0 0 0 3px rgba(203,166,247,0.15);
}
.clw-input::placeholder { color:var(--muted-text-color,#585b70); opacity:0.7; }

/* ── Status ── */
#clw-status {
    display:none; margin-top:10px; font-size:12px;
    color:var(--muted-text-color,#6c7086); text-align:center; padding:6px 0;
}

/* ── Scroll container ── */
.clw-scroll {
    overflow-y:auto; scrollbar-width:thin;
    scrollbar-color:var(--main-border-color,#45475a) transparent;
}
.clw-scroll::-webkit-scrollbar       { width:5px; }
.clw-scroll::-webkit-scrollbar-track { background:transparent; }
.clw-scroll::-webkit-scrollbar-thumb {
    background:var(--main-border-color,#45475a); border-radius:6px;
}
.clw-scroll::-webkit-scrollbar-thumb:hover {
    background:var(--muted-text-color,#6c7086);
}

/* ── Search results ── */
#clw-results {
    margin-top:10px; max-height:320px;
    display:flex; flex-direction:column; gap:2px;
}
.clw-result-item {
    padding:8px 11px; border-radius:7px; cursor:pointer;
    color:var(--main-text-color,#cdd6f4); line-height:1.4;
    transition:background 0.12s, border-color 0.12s;
    border:1px solid transparent;
    animation:clwFadeIn 0.15s ease both;
}
.clw-result-item:hover, .clw-result-item:focus-visible {
    background:var(--hover-item-background-color,#313244) !important;
    border-color:var(--main-border-color,#45475a) !important;
}
.clw-result-title {
    font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
}
.clw-result-excerpt {
    font-size:11px; color:var(--muted-text-color,#6c7086);
    margin-top:3px; display:-webkit-box; -webkit-line-clamp:2;
    -webkit-box-orient:vertical; overflow:hidden; line-height:1.4;
}

/* ── Row / Toolbar ── */
.clw-row  { display:flex; gap:7px; align-items:center; }
.clw-toolbar {
    display:flex; gap:10px; padding:2px;
    flex-wrap:wrap; justify-content:center;
    max-width:calc(100vw - 32px);
}

/* ── Round buttons ── */
.clw-round-btn {
    width:46px; height:46px; border-radius:50%;
    background:var(--button-background-color,#313244);
    border:1px solid var(--main-border-color,#45475a);
    color:var(--main-text-color,#cdd6f4);
    cursor:pointer; font-size:19px; line-height:1;
    display:flex; align-items:center; justify-content:center;
    box-shadow:
        0 2px 8px  rgba(0,0,0,0.35),
        0 0 0 1px  rgba(255,255,255,0.04);
    transition: transform 0.18s cubic-bezier(0.16,1,0.3,1),
                box-shadow 0.18s, background 0.15s, border-color 0.15s;
    flex-shrink:0; user-select:none;
    -webkit-tap-highlight-color:transparent;
}
.clw-round-btn:hover {
    transform:scale(1.1);
    box-shadow:
        0 4px 16px rgba(0,0,0,0.5),
        0 0 0 1px  rgba(255,255,255,0.08);
    background:var(--hover-item-background-color,#45475a);
    border-color:var(--muted-text-color,#6c7086);
}
.clw-round-btn:active { transform:scale(0.95); }

/* ── Capture button active state ── */
#clw-btn-capture.clw-capture-active {
    background:#f38ba8 !important; border-color:#f38ba8 !important;
    color:#1e1e2e !important;
    animation:clwPulse 2s ease-out infinite;
}

/* ── Danger (remove) button ── */
.clw-round-btn--danger:hover {
    background:rgba(243,139,168,0.18) !important;
    border-color:#f38ba8 !important;
}

/* ── Painel danger (remoção) ── */
.clw-panel--danger {
    box-shadow:
        0 0 0 1px rgba(243,139,168,0.08),
        0 4px 24px rgba(0,0,0,0.45),
        0 1px 4px  rgba(0,0,0,0.3);
}
.clw-remove-item {
    display:flex; align-items:center; justify-content:space-between;
    padding:8px 10px; border-radius:7px; cursor:default;
    border:1px solid transparent;
    animation:clwFadeIn 0.15s ease both;
}
.clw-remove-item:nth-child(even) { background:rgba(243,139,168,0.03); }
.clw-remove-item-title {
    font-size:12px; color:var(--main-text-color,#cdd6f4);
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
    flex:1; margin-right:8px;
}
.clw-remove-item-btn {
    flex-shrink:0; padding:4px 10px; border-radius:6px;
    background:rgba(243,139,168,0.15); border:1px solid rgba(243,139,168,0.3);
    color:#f38ba8; font-size:11px; font-weight:600; cursor:pointer;
    transition:background 0.15s, border-color 0.15s;
    white-space:nowrap;
}
.clw-remove-item-btn:hover {
    background:rgba(243,139,168,0.3); border-color:#f38ba8;
}

/* ── Primary buttons ── */
.clw-btn-primary {
    padding:8px 14px; border-radius:8px;
    background:#cba6f7; border:none; color:#1e1e2e;
    font-size:13px; font-weight:700; cursor:pointer;
    white-space:nowrap; transition:background 0.15s, transform 0.1s, box-shadow 0.15s;
    box-shadow:0 1px 3px rgba(0,0,0,0.2);
}
.clw-btn-primary:hover   { background:#d4b8ff; }
.clw-btn-primary:active  { transform:scale(0.97); }
.clw-btn-block            { width:100%; text-align:center; }

.clw-btn--green           { background:#a6e3a1; }
.clw-btn--green:hover     { background:#b9f0b4; }

/* ── Banner ── */
.clw-banner {
    display:none;
    background:rgba(243,139,168,0.08);
    border:1px solid rgba(243,139,168,0.25);
    border-radius:10px; padding:8px 14px;
    font-size:12px; color:#f38ba8; text-align:center;
    width:260px; box-sizing:border-box; line-height:1.5;
    backdrop-filter:blur(4px);
}
.clw-banner-icon { margin-right:4px; }

/* ── Relations panel ── */
.clw-rel-list {
    max-height:360px; display:flex; flex-direction:column; gap:8px;
}
.clw-rel-row {
    display:grid;
    grid-template-columns:1fr 18px 1fr;
    align-items:center; gap:4px;
    padding:8px 10px; border-radius:8px;
    border:1px solid var(--main-border-color,#45475a);
    background:var(--main-background-color,#181825);
    animation:clwFadeIn 0.15s ease both;
}
.clw-rel-row:nth-child(even) { background:rgba(166,227,161,0.03); }
.clw-rel-name {
    font-size:12px; color:var(--main-text-color,#cdd6f4);
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
    font-weight:500;
}
.clw-rel-arrow {
    font-size:13px; text-align:center;
    color:var(--muted-text-color,#6c7086);
}
.clw-rel-select {
    grid-column:1 / -1; margin-top:6px;
    padding:6px 8px;
    border:1px solid var(--main-border-color,#45475a);
    border-radius:7px;
    background:var(--accented-background-color,#1e1e2e);
    color:var(--main-text-color,#cdd6f4);
    font-size:12px; outline:none; cursor:pointer; width:100%;
    transition:border-color 0.2s, box-shadow 0.2s;
}
.clw-rel-select:focus {
    border-color:#a6e3a1 !important;
    box-shadow:0 0 0 3px rgba(166,227,161,0.15);
}
.clw-rel-select option {
    background:var(--accented-background-color,#1e1e2e);
    color:var(--main-text-color,#cdd6f4);
}

/* ── Botão de salvar posicionamento ── */
#clw-relmap-save   { margin-top:14px; display:none; }
#clw-relmap-empty   { display:none; }
.clw-status {
    font-size:12px; color:var(--muted-text-color,#6c7086);
    text-align:center; padding:16px 0;
}

/* ── Painel edit ── */
.clw-panel--edit {
    box-shadow:
        0 0 0 1px rgba(203,166,247,0.08),
        0 4px 24px rgba(0,0,0,0.45),
        0 1px 4px  rgba(0,0,0,0.3);
}
.clw-edit-item {
    display:flex; align-items:center; justify-content:space-between;
    padding:8px 10px; border-radius:7px; cursor:default;
    border:1px solid transparent; animation:clwFadeIn 0.15s ease both;
}
.clw-edit-item:nth-child(even) { background:rgba(203,166,247,0.03); }
.clw-edit-item-title {
    font-size:12px; color:var(--main-text-color,#cdd6f4);
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
    flex:1; margin-right:8px;
}
.clw-edit-item-btn {
    flex-shrink:0; padding:4px 10px; border-radius:6px;
    background:rgba(203,166,247,0.15); border:1px solid rgba(203,166,247,0.3);
    color:#cba6f7; font-size:11px; font-weight:600; cursor:pointer;
    transition:background 0.15s, border-color 0.15s;
    white-space:nowrap;
}
.clw-edit-item-btn:hover { background:rgba(203,166,247,0.3); border-color:#cba6f7; }

/* ── Editor flutuante ── */
.clw-editor-overlay {
    position:fixed; inset:0; z-index:10000; display:none;
    background:rgba(0,0,0,0.45); backdrop-filter:blur(2px);
    align-items:center; justify-content:center;
}
.clw-editor-box {
    width:760px; max-width:92vw; max-height:88vh;
    display:flex; flex-direction:column; gap:10px;
    background:var(--accented-background-color,#1e1e2e);
    border:1px solid var(--main-border-color,#45475a);
    border-radius:14px; padding:16px;
    box-shadow:0 8px 40px rgba(0,0,0,0.55);
    animation:clwSlideIn 0.18s cubic-bezier(0.16,1,0.3,1);
}
.clw-editor-header { display:flex; align-items:center; gap:8px; }
.clw-editor-title { font-size:13px; font-weight:600; color:var(--main-text-color,#cdd6f4); }
.clw-editor-content {
    min-height:380px; max-height:70vh; overflow-y:auto;
    padding:10px 12px; border:1px solid var(--main-border-color,#45475a);
    border-radius:8px; background:var(--main-background-color,#181825);
    color:var(--main-text-color,#cdd6f4); font-size:14px; line-height:1.6;
    outline:none; font-family:var(--detail-font-family,'Segoe UI',system-ui,sans-serif);
}
.clw-editor-content:focus {
    border-color:#cba6f7; box-shadow:0 0 0 3px rgba(203,166,247,0.15);
}
.clw-editor-content img { max-width:100%; }
.clw-editor-actions { display:flex; justify-content:flex-end; gap:8px; }

/* ── Gerador de fluxos ── */
.clw-textarea {
    width:100%; min-height:280px; max-height:55vh; resize:vertical; padding:9px 12px;
    border:1px solid var(--main-border-color,#45475a); border-radius:8px;
    background:var(--main-background-color,#181825);
    color:var(--main-text-color,#cdd6f4);
    font-size:12px; line-height:1.5;
    font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
    box-sizing:border-box; outline:none;
    transition:border-color 0.2s, box-shadow 0.2s;
}
.clw-textarea:focus {
    border-color:#cba6f7 !important;
    box-shadow:0 0 0 3px rgba(203,166,247,0.15);
}
.clw-textarea::placeholder { color:var(--muted-text-color,#585b70); opacity:0.7; }
.clw-flow-label {
    font-size:11px; color:var(--muted-text-color,#6c7086);
    text-transform:uppercase; letter-spacing:0.06em; white-space:nowrap;
}
.clw-btn-ghost {
    padding:8px 12px; border-radius:8px; background:transparent;
    border:1px solid var(--main-border-color,#45475a);
    color:var(--main-text-color,#cdd6f4);
    font-size:12px; font-weight:600; cursor:pointer; white-space:nowrap;
    transition:background 0.15s, border-color 0.15s, transform 0.1s;
}
.clw-btn-ghost:hover {
    background:var(--hover-item-background-color,#313244);
    border-color:var(--muted-text-color,#6c7086);
}
.clw-btn-ghost:active { transform:scale(0.97); }
.clw-panel--flow {
    box-shadow:
        0 0 0 1px rgba(137,180,250,0.08),
        0 4px 24px rgba(0,0,0,0.45),
        0 1px 4px  rgba(0,0,0,0.3);
}
#clw-flow-panel .clw-rel-select { grid-column:auto; margin-top:0; flex:1; }
#clw-flow-panel .clw-status   { display:none; text-align:left; padding:8px 0 0; }

/* ── Templates ── */
.clw-tpl-item {
    padding:9px 11px; border-radius:7px; cursor:pointer;
    border:1px solid transparent; color:var(--main-text-color,#cdd6f4);
    font-size:13px; font-weight:600; margin-top:4px;
    display:flex; align-items:center; gap:8px;
    animation:clwFadeIn 0.15s ease both;
    transition:background 0.12s, border-color 0.12s;
}
.clw-tpl-item:first-child { margin-top:8px; }
.clw-tpl-item:hover {
    background:var(--hover-item-background-color,#313244);
    border-color:var(--main-border-color,#45475a);
}
.clw-tpl-item-ic { font-size:14px; line-height:1; }
#clw-tpl-list { margin-top:8px; }
#clw-tpl-panel .clw-status { display:none; }

/* ── Ajuda ── */
.clw-round-btn--help { font-weight:700; font-size:17px; }
#clw-help-panel .clw-panel-icon  { font-size:24px; }
#clw-help-panel .clw-panel-title { font-size:15px; }
#clw-help-panel .clw-panel-close { font-size:22px; }
.clw-help-list {
    max-height:min(660px,72vh);
    display:flex; flex-direction:column; gap:2px; margin-top:2px;
    -webkit-mask-image:linear-gradient(to bottom, #000 calc(100% - 26px), transparent 100%);
    mask-image:linear-gradient(to bottom, #000 calc(100% - 26px), transparent 100%);
}
.clw-help-row {
    display:flex; gap:14px; align-items:flex-start;
    padding:8px 12px; border-radius:8px;
    animation:clwFadeIn 0.15s ease both;
}
.clw-help-row:nth-child(even) { background:rgba(203,166,247,0.035); }
.clw-help-ic { font-size:34px; line-height:1.1; margin-top:2px; width:44px; text-align:center; flex-shrink:0; }
.clw-help-name { font-size:24px; font-weight:700; color:var(--main-text-color,#cdd6f4); }
.clw-help-desc {
    font-size:22px; color:var(--main-text-color,#cdd6f4);
    opacity:1; line-height:1.4; margin-top:4px;
}
.clw-help-desc b { color:var(--main-text-color,#cdd6f4); font-weight:700; }
.clw-help-foot {
    margin-top:12px; padding-top:10px;
    border-top:1px solid var(--main-border-color,#45475a);
    font-size:20px; color:var(--main-text-color,#cdd6f4); opacity:.9; line-height:1.45;
}
.clw-help-foot b { opacity:1; font-weight:700; }
        `;
        document.head.appendChild(style);

        // ── Event listeners ──
        this._el('clw-btn').addEventListener('click', () => this._togglePanel());
        this._el('clw-btn-longform').addEventListener('click', () => window._clw.generateLongform());
        this._el('clw-btn-capture').addEventListener('click', () => window._clw.toggleCapture());
        this._el('clw-btn-newnote').addEventListener('click', () => this._toggleNewNotePanel());
        this._el('clw-newnote-confirm').addEventListener('click', () => window._clw.createNote());
        this._el('clw-newnote-title').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') window._clw.createNote();
        });
        this._el('clw-btn-saverel').addEventListener('click', () => window._clw.openRelationsPanel());
        this._el('clw-relmap-close').addEventListener('click', () => this._hide('clw-relmap-panel'));
        this._el('clw-relmap-save').addEventListener('click', () => window._clw.confirmSaveRelations());
        this._el('clw-btn-remove').addEventListener('click', () => window._clw.removeCard());
        this._el('clw-remove-close').addEventListener('click', () => this._hide('clw-remove-panel'));
        this._el('clw-btn-edit').addEventListener('click', () => window._clw.editCard());
        this._el('clw-edit-close').addEventListener('click', () => this._hide('clw-edit-panel'));
        this._el('clw-btn-sync').addEventListener('click', () => window._clw.syncCards());
        this._el('clw-editor-save').addEventListener('click', () => window._clw.saveEditor());
        this._el('clw-editor-close').addEventListener('click', () => window._clw.saveEditor());
        this._el('clw-btn-flow').addEventListener('click', () => window._clw.openFlowPanel());
        this._el('clw-btn-tpl').addEventListener('click', () => window._clw.openTplPanel());
        this._el('clw-btn-help').addEventListener('click', () => window._clw.openHelpPanel());
        this._el('clw-help-close').addEventListener('click', () => this._hide('clw-help-panel'));
        this._el('clw-flow-close').addEventListener('click', () => this._hide('clw-flow-panel'));
        this._el('clw-tpl-close').addEventListener('click', () => this._hide('clw-tpl-panel'));
        this._el('clw-flow-generate').addEventListener('click', () => window._clw.generateFlow());
        this._el('clw-flow-savenote').addEventListener('click', () => window._clw.createFlowNote());
        this._el('clw-flow-savetpl').addEventListener('click', () => window._clw.saveFlowTemplate());
        this._el('clw-flow-example').addEventListener('click', () => {
            const spec = this._el('clw-flow-spec');
            if (spec) spec.value = FLOW_DEFAULT_SPEC;
            this._flowStatus('');
        });

        // Fecha painéis com Escape
        document.addEventListener('keydown', (e) => {
            if (e.key !== 'Escape') return;
            this._hide('clw-panel');
            this._hide('clw-newnote-float');
            this._hide('clw-relmap-panel');
            this._hide('clw-remove-panel');
            this._hide('clw-edit-panel');
            this._hide('clw-flow-panel');
            this._hide('clw-tpl-panel');
            this._hide('clw-help-panel');
        });

        let searchTimer;
        this._el('clw-search').addEventListener('input', (e) => {
            clearTimeout(searchTimer);
            const q = e.target.value;
            searchTimer = setTimeout(() => window._clw?.search(q), 280);
        });

        let tplTimer;
        this._el('clw-tpl-filter').addEventListener('input', () => {
            clearTimeout(tplTimer);
            tplTimer = setTimeout(() => window._clw?.filterTemplates(), 200);
        });

        // Fecha painéis ao clicar fora
        document.addEventListener('click', (e) => {
            const root = this._el('clw-root');
            if (root && !root.contains(e.target)) {
                this._hide('clw-panel');
                this._hide('clw-newnote-float');
                this._hide('clw-remove-panel');
                this._hide('clw-edit-panel');
                this._hide('clw-flow-panel');
                this._hide('clw-tpl-panel');
                this._hide('clw-help-panel');
            }
        });
    }

    /* ── Toggle do painel de busca ─────────────────────── */
    _togglePanel() {
        const panel = this._el('clw-panel');
        if (!panel) return;
        if (panel.style.display === 'block') {
            panel.style.display = 'none';
        } else {
            panel.style.display = 'block';
            const input = this._el('clw-search');
            if (input) { input.value = ''; }
            const results = this._el('clw-results');
            if (results) results.innerHTML = '';
            this._hide('clw-status');
            this._hide('clw-newnote-float');
            setTimeout(() => input?.focus(), 60);
        }
    }

    /* ── Toggle do painel de nova nota ─────────────────── */
    _toggleNewNotePanel() {
        const float = this._el('clw-newnote-float');
        if (!float) return;
        this._hide('clw-panel');
        if (float.style.display === 'block') {
            float.style.display = 'none';
        } else {
            float.style.display = 'block';
            const titleInput = this._el('clw-newnote-title');
            if (titleInput) { titleInput.value = ''; setTimeout(() => titleInput.focus(), 60); }
        }
    }

    /* ── MODO CAPTURA ──────────────────────────────────── */
    _toggleCapture() {
        if (!this._captureMode) {
            if (!this.noteId) { api.showError('Abra um Canvas para ativar a captura.'); return; }
            this._captureMode         = true;
            this._captureCanvasNoteId = this.noteId;
            this._el('clw-btn-capture').classList.add('clw-capture-active');
            this._show('clw-capture-banner');
            // Persiste o ID do canvas ativo para sobreviver a hot-reloads
            try { sessionStorage.setItem('clw_capture_canvas', this.noteId); } catch (_) {}
            api.showMessage('🎯 Modo Captura ativado — navegue pelas notas.');
        } else {
            this._captureMode         = false;
            this._captureCanvasNoteId = null;
            this._el('clw-btn-capture').classList.remove('clw-capture-active');
            this._hide('clw-capture-banner');
            try { sessionStorage.removeItem('clw_capture_canvas'); } catch (_) {}
            api.showMessage('⏹ Modo Captura desativado.');
        }
    }

    /* ── RESTAURA estado de captura após reload ────────── */
    _restoreCaptureState() {
        try {
            const savedId = sessionStorage.getItem('clw_capture_canvas');
            if (!savedId) return;
            this._captureMode         = true;
            this._captureCanvasNoteId = savedId;
            const btn = this._el('clw-btn-capture');
            if (btn) btn.classList.add('clw-capture-active');
            this._show('clw-capture-banner');
        } catch (_) {}
    }

    /* ── CRIAR NOVA NOTA FILHA ─────────────────────────── */
    async _createNote() {
        const canvasNoteId = this.noteId;
        if (!canvasNoteId) { api.showError('Nenhuma nota Canvas ativa.'); return; }

        const titleInput = this._el('clw-newnote-title');
        const title = titleInput?.value.trim() || '';
        if (!title) { api.showError('Digite um título para a nova nota.'); titleInput?.focus(); return; }

        try {
            const newNoteId = await api.runOnBackend((canvasNoteId, title) => {
                const result = api.createNewNote({
                    parentNoteId: canvasNoteId, title,
                    content: '', type: 'text',
                });
                return result.note.noteId;
            }, [canvasNoteId, title]);

            if (titleInput) titleInput.value = '';
            this._hide('clw-newnote-float');
            await this._insertCard(newNoteId, title, '');
            api.showMessage(`✅ Nota "${title}" criada e inserida no canvas.`);
        } catch (err) {
            console.error('[CanvasLinker] createNote error:', err);
            api.showError('Erro ao criar nota: ' + err.message);
        }
    }

    /* ── REMOVER CARD DO CANVAS ────────────────────────── */
    /**
     * Abre painel listando todos os cards vinculados no canvas atual.
     * O usuário clica em "Remover" ao lado do card desejado.
     */
    async _openRemovePanel() {
        const canvasNoteId = this.noteId;
        if (!canvasNoteId) { api.showError('Nenhuma nota Canvas ativa.'); return; }

        const $results = this._el('clw-remove-results');
        const $empty   = this._el('clw-remove-empty');
        const $panel   = this._el('clw-remove-panel');

        $results.innerHTML      = '';
        $empty.style.display    = 'none';
        $panel.style.display    = 'block';

        // Fecha outros painéis
        this._hide('clw-panel');
        this._hide('clw-newnote-float');
        this._hide('clw-relmap-panel');

        try {
            // Lê todos os cards (rect + link) do canvas
            const cards = await api.runOnBackend((canvasNoteId) => {
                const note = api.getNote(canvasNoteId);
                if (!note) throw new Error('Nota canvas não encontrada.');
                let data;
                try { data = JSON.parse(note.getContent() || '{}'); } catch (_) { data = {}; }
                return (data.elements || [])
                    .filter(e => !e.isDeleted && e.type === 'rectangle' && e.link?.startsWith('#root/'))
                    .map(e => {
                        const noteId = e.link.replace('#root/', '');
                        const linked = api.getNote(noteId);
                        return { noteId, title: linked?.title || noteId };
                    });
            }, [canvasNoteId]);

            if (!cards || cards.length === 0) {
                $empty.style.display = 'block';
                return;
            }

            const fragment = document.createDocumentFragment();
            cards.forEach((card, i) => {
                const row = document.createElement('div');
                row.className = 'clw-remove-item';
                row.style.animationDelay = `${i * 25}ms`;
                row.innerHTML = `
                    <span class="clw-remove-item-title" title="${escapeHtml(card.title)}">${escapeHtml(card.title)}</span>
                    <button class="clw-remove-item-btn">Remover</button>
                `;
                row.querySelector('button').addEventListener('click', async () => {
                    if (!confirm('Remover este card do canvas?\nA nota continuará existindo no Trilium.')) return;
                    row.style.opacity = '0.4';
                    row.style.pointerEvents = 'none';
                    await this._doRemoveCard(canvasNoteId, card.noteId);
                    row.remove();
                    if (!this._el('clw-remove-results').children.length) {
                        $empty.style.display = 'block';
                    }
                });
                fragment.appendChild(row);
            });
            $results.appendChild(fragment);

        } catch (err) {
            console.error('[CanvasLinker] openRemovePanel error:', err);
            api.showError('Erro ao listar cards: ' + err.message);
            $panel.style.display = 'none';
        }
    }

    /**
     * Faz o soft-delete dos elementos do grupo vinculado à nota alvo.
     * Não deleta a nota do Trilium.
     */
    async _doRemoveCard(canvasNoteId, targetNoteId) {
        try {
            const removed = await api.runOnBackend((canvasNoteId, targetNoteId) => {
                const canvasNote = api.getNote(canvasNoteId);
                if (!canvasNote) throw new Error('Nota canvas não encontrada.');
                let data;
                try { data = JSON.parse(canvasNote.getContent() || '{}'); } catch (_) { data = {}; }
                const elements = data.elements || [];

                const link = '#root/' + targetNoteId;
                const rect = elements.find(e => !e.isDeleted && e.type === 'rectangle' && e.link === link);
                if (!rect) return 0;

                const groupIds = new Set(rect.groupIds || []);
                let count = 0;
                for (const el of elements) {
                    if (el.isDeleted) continue;
                    if (el.id === rect.id || el.groupIds?.some(gid => groupIds.has(gid))) {
                        el.isDeleted = true;
                        el.updated   = Date.now();
                        count++;
                    }
                }
                if (count > 0) canvasNote.setContent(JSON.stringify(data));
                return count;
            }, [canvasNoteId, targetNoteId]);

            if (removed > 0) {
                api.showMessage('🗑️ Card removido do canvas.');
            } else {
                api.showMessage('ℹ️ Card não encontrado no canvas.');
            }
        } catch (err) {
            console.error('[CanvasLinker] doRemoveCard error:', err);
            api.showError('Erro ao remover card: ' + err.message);
        }
    }

    /* ── PAINEL DE EDIÇÃO ────────────────────────────── */
    async _openEditPanel() {
        const canvasNoteId = this.noteId;
        if (!canvasNoteId) { api.showError('Nenhuma nota Canvas ativa.'); return; }

        const $results = this._el('clw-edit-results');
        const $empty   = this._el('clw-edit-empty');
        const $panel   = this._el('clw-edit-panel');

        $results.innerHTML      = '';
        $empty.style.display    = 'none';
        $panel.style.display    = 'block';

        this._hide('clw-panel');
        this._hide('clw-newnote-float');
        this._hide('clw-relmap-panel');
        this._hide('clw-remove-panel');

        try {
            const cards = await api.runOnBackend((canvasNoteId) => {
                const note = api.getNote(canvasNoteId);
                if (!note) throw new Error('Nota canvas não encontrada.');
                let data;
                try { data = JSON.parse(note.getContent() || '{}'); } catch (_) { data = {}; }
                return (data.elements || [])
                    .filter(e => !e.isDeleted && e.type === 'rectangle' && e.link?.startsWith('#root/'))
                    .map(e => {
                        const noteId = e.link.replace('#root/', '');
                        const linked = api.getNote(noteId);
                        return { noteId, title: linked?.title || noteId };
                    });
            }, [canvasNoteId]);

            if (!cards || cards.length === 0) {
                $empty.style.display = 'block';
                return;
            }

            const fragment = document.createDocumentFragment();
            cards.forEach((card, i) => {
                const row = document.createElement('div');
                row.className = 'clw-edit-item';
                row.style.animationDelay = `${i * 25}ms`;
                row.innerHTML = `
                    <span class="clw-edit-item-title" title="${escapeHtml(card.title)}">${escapeHtml(card.title)}</span>
                    <button class="clw-edit-item-btn">✏️ Editar</button>
                `;
                row.querySelector('button').addEventListener('click', async () => {
                    await this._openEditor(canvasNoteId, card.noteId, card.title);
                });
                fragment.appendChild(row);
            });
            $results.appendChild(fragment);

        } catch (err) {
            console.error('[CanvasLinker] openEditPanel error:', err);
            api.showError('Erro ao listar cards: ' + err.message);
            $panel.style.display = 'none';
        }
    }

    async _openEditor(canvasNoteId, noteId, currentTitle) {
        const note = await api.runOnBackend((noteId) => {
            const n = api.getNote(noteId);
            if (!n) return null;
            return { title: n.title, content: n.getContent() || '' };
        }, [noteId]);

        if (!note) { api.showError('Nota não encontrada.'); return; }

        this._editorCanvasId = canvasNoteId;
        this._editorNoteId   = noteId;

        const $float   = this._el('clw-editor-float');
        const $title   = this._el('clw-editor-note-title');
        const $content = this._el('clw-editor-content');

        $title.value       = note.title;
        $content.innerHTML = note.content;

        this._hide('clw-edit-panel');
        this._hide('clw-panel');
        this._hide('clw-relmap-panel');
        this._hide('clw-remove-panel');

        $float.style.display = 'flex';
        setTimeout(() => $title.focus(), 50);
    }

    async _saveEditor() {
        const canvasNoteId = this._editorCanvasId;
        const noteId       = this._editorNoteId;
        if (!canvasNoteId || !noteId) return;

        const newTitle   = this._el('clw-editor-note-title').value.trim() || 'Sem título';
        const newContent = this._el('clw-editor-content').innerHTML;

        const $save = this._el('clw-editor-save');
        $save.disabled = true;

        try {
            await api.runOnBackend((noteId, title, content) => {
                const n = api.getNote(noteId);
                if (!n) return;
                n.title = title;
                n.setContent(content);
            }, [noteId, newTitle, newContent]);

            await this._updateCardText(canvasNoteId, noteId);

            this._el('clw-editor-float').style.display = 'none';
            api.showMessage('✏️ Nota salva e card atualizado.');
        } catch (err) {
            console.error('[CanvasLinker] saveEditor error:', err);
            api.showError('Erro ao salvar: ' + err.message);
        } finally {
            $save.disabled = false;
        }
    }

    /**
     * Atualiza os elementos de texto do card (título + excerpt) e a altura
     * do rect a partir do conteúdo atual da nota vinculada.
     * Retorna 1 se o card foi encontrado, 0 caso contrário.
     */
    async _updateCardText(canvasNoteId, noteId) {
        const cleanConfig = getCleanPatterns();
        return await api.runOnBackend((canvasNoteId, noteId, cfg, cleanPatterns) => {
            const patterns = cleanPatterns.map(([src, flags, repl]) => [new RegExp(src, flags), repl]);

            function clean(raw, max) {
                if (!raw) return '';
                let t = raw;
                for (const [re, r] of patterns) t = t.replace(re, r);
                t = t.trim();
                return max ? t.slice(0, max) : t;
            }

            function estimateTextHeight(text, fontSize, lineHeightRatio, availableWidth) {
                if (!text) return 0;
                const avgCharWidth = fontSize * 0.60;
                const charsPerLine = Math.max(1, Math.floor(availableWidth / avgCharWidth));
                const lines = text.split('\n').reduce((acc, paragraph) => {
                    return acc + Math.max(1, Math.ceil(paragraph.length / charsPerLine));
                }, 0);
                return Math.ceil(lines * fontSize * lineHeightRatio) + 20;
            }

            function wrapText(text, maxLen) {
                if (!text || text.length <= maxLen) return text || '';
                const words = text.split(' ');
                const lines = [];
                let current = '';
                for (const word of words) {
                    const test = current ? current + ' ' + word : word;
                    if (test.length > maxLen && current) {
                        lines.push(current);
                        current = word;
                    } else {
                        current = test;
                    }
                }
                if (current) lines.push(current);
                return lines.join('\n');
            }

            const canvasNote = api.getNote(canvasNoteId);
            if (!canvasNote) return 0;
            let data;
            try { data = JSON.parse(canvasNote.getContent() || '{}'); } catch (_) { data = {}; }

            const link = '#root/' + noteId;
            const rect = (data.elements || []).find(e => !e.isDeleted && e.type === 'rectangle' && e.link === link);
            if (!rect) return 0;

            const groupIds = new Set(rect.groupIds || []);

            const linkedNote = api.getNote(noteId);
            if (!linkedNote) return 0;
            const newTitle = linkedNote.title || 'Sem título';
            const excerpt = wrapText(clean(linkedNote.getContent() || '', cfg.excerptSlice), 40);

            const texts = (data.elements || []).filter(e =>
                !e.isDeleted && e.type === 'text' && e.groupIds?.some(gid => groupIds.has(gid))
            ).sort((a, b) => a.y - b.y);

            const now  = Date.now();
            const bump = () => ({ version: (rect.version || 1) + 1, versionNonce: Math.floor(Math.random() * 999999), updated: now });

            let count = 0;

            if (texts.length > 0) {
                const titleEl = texts[0];
                titleEl.text = newTitle;
                titleEl.originalText = newTitle;
                Object.assign(titleEl, bump());
                count++;
            }

            if (texts.length > 1) {
                const excrEl = texts[1];
                const excrH = excerpt
                    ? estimateTextHeight(excerpt, cfg.excerptFontSize, 1.3, cfg.width - cfg.padX * 2)
                    : 0;
                excrEl.text = excerpt;
                excrEl.originalText = excerpt;
                excrEl.height = excrH;
                Object.assign(excrEl, bump());
                count++;
            }

            const titleH = Math.ceil(cfg.titleFontSize * 1.25) + 4;
            const excerptH = excerpt
                ? estimateTextHeight(excerpt, cfg.excerptFontSize, 1.3, cfg.width - cfg.padX * 2)
                : 0;
            const totalH = cfg.padY + titleH + (excerpt ? 6 + excerptH : 0) + cfg.padY;
            rect.height = totalH;
            Object.assign(rect, bump());
            count++;

            if (count > 0) canvasNote.setContent(JSON.stringify(data));
            return 1;
        }, [canvasNoteId, noteId, CARD_CONFIG, cleanConfig]);
    }

    async _syncCards() {
        const canvasNoteId = this.noteId;
        if (!canvasNoteId) { api.showError('Nenhuma nota Canvas ativa.'); return; }

        api.showMessage('⟳ Atualizando cards…');

        try {
            const cards = await api.runOnBackend((canvasNoteId) => {
                const note = api.getNote(canvasNoteId);
                if (!note) return [];
                let data;
                try { data = JSON.parse(note.getContent() || '{}'); } catch (_) { data = {}; }
                return (data.elements || [])
                    .filter(e => !e.isDeleted && e.type === 'rectangle' && e.link?.startsWith('#root/'))
                    .map(e => e.link.replace('#root/', ''));
            }, [canvasNoteId]);

            if (!cards || cards.length === 0) {
                api.showMessage('ℹ️ Nenhum card vinculado no canvas.');
                return;
            }

            let found = 0;
            for (const noteId of cards) {
                found += await this._updateCardText(canvasNoteId, noteId);
            }

            api.showMessage(`⟳ ${found} card(s) atualizado(s).`);
        } catch (err) {
            console.error('[CanvasLinker] syncCards error:', err);
            api.showError('Erro ao sincronizar cards: ' + err.message);
        }
    }

    /* ── PAINEL DE RELAÇÕES ────────────────────────────── */
    async _openRelationsPanel() {
        const canvasNoteId = this.noteId;
        if (!canvasNoteId) { api.showError('Nenhuma nota Canvas ativa.'); return; }

        const $list  = this._el('clw-relmap-list');
        const $empty = this._el('clw-relmap-empty');
        const $save  = this._el('clw-relmap-save');
        const $panel = this._el('clw-relmap-panel');

        $list.innerHTML      = '';
        $empty.style.display = 'none';
        $save.style.display  = 'none';
        $panel.style.display = 'block';

        try {
            const { pairs } = await api.runOnBackend((canvasNoteId) => {
                const note = api.getNote(canvasNoteId);
                if (!note) throw new Error('Nota canvas não encontrada.');
                let data;
                try { data = JSON.parse(note.getContent() || '{}'); }
                catch (_) { data = {}; }
                const elements = (data.elements || []).filter(e => !e.isDeleted);

                const cardMap = {};
                elements.forEach(el => {
                    if (el.type === 'rectangle' && el.link?.startsWith('#root/')) {
                        cardMap[el.id] = el.link.replace('#root/', '');
                    }
                });

                const groupToCard = {};
                Object.keys(cardMap).forEach(rectId => {
                    const el = elements.find(e => e.id === rectId);
                    if (el?.groupIds) el.groupIds.forEach(gid => { groupToCard[gid] = rectId; });
                });

                const resolveToCard = (elId) => {
                    if (cardMap[elId]) return elId;
                    const el = elements.find(e => e.id === elId);
                    if (el?.groupIds) {
                        for (const gid of el.groupIds) {
                            if (groupToCard[gid]) return groupToCard[gid];
                        }
                    }
                    return null;
                };

                const pairs = [];
                const seen  = new Set();
                elements.forEach(el => {
                    if (
                        el.type === 'arrow' &&
                        el.startBinding?.elementId &&
                        el.endBinding?.elementId
                    ) {
                        const fromEl = resolveToCard(el.startBinding.elementId);
                        const toEl   = resolveToCard(el.endBinding.elementId);
                        if (!fromEl || !toEl || fromEl === toEl) return;
                        const key = cardMap[fromEl] + '→' + cardMap[toEl];
                        if (seen.has(key)) return;
                        seen.add(key);

                        // ── Extrai texto da seta ──
                        let arrowText = '';
                        let arrowTextElId = '';
                        if (el.boundElements && el.boundElements.length > 0) {
                            for (const be of el.boundElements) {
                                const textEl = elements.find(e => e.id === be.id);
                                if (textEl && textEl.type === 'text' && textEl.text) {
                                    arrowText = textEl.text.trim();
                                    arrowTextElId = textEl.id;
                                    break;
                                }
                            }
                        }

                        const fromNoteId = cardMap[fromEl];
                        const toNoteId   = cardMap[toEl];
                        const fromNote   = api.getNote(fromNoteId);
                        const toNote     = api.getNote(toNoteId);
                        pairs.push({
                            fromNoteId,
                            toNoteId,
                            fromTitle: fromNote?.title || fromNoteId,
                            toTitle:   toNote?.title   || toNoteId,
                            arrowText,
                            arrowTextElId: arrowTextElId || '',
                        });
                    }
                });
                return { pairs };
            }, [canvasNoteId]);

            if (!pairs || pairs.length === 0) {
                $empty.style.display = 'block';
                return;
            }

            const standardOptions = RELATION_OPTIONS_HTML;

            const fragment = document.createDocumentFragment();
            pairs.forEach((pair, i) => {
                const row = document.createElement('div');
                row.className    = 'clw-rel-row';
                row.dataset.from = pair.fromNoteId;
                row.dataset.to   = pair.toNoteId;
                row.dataset.textElId = pair.arrowTextElId || '';
                row.style.animationDelay = `${i * 30}ms`;

                const arrowText = pair.arrowText || '';
                let selectedValue = '';
                let customOption = '';

                if (arrowText) {
                    const lower = arrowText.toLowerCase().trim();

                    // 1. Match direto por valor
                    const direct = RELATION_TYPES.find(r => r.value === lower);
                    if (direct) {
                        selectedValue = direct.value;
                    } else {
                        // 2. Match por label traduzida (ex: "Inspira" → inspira)
                        const byLabel = RELATION_TYPES.find(r => r.label.toLowerCase() === lower);
                        if (byLabel) {
                            selectedValue = byLabel.value;
                        } else {
                            // 3. Match via tabela de mapeamento
                            const mapped = TEXT_TO_RELATION[lower];
                            if (mapped) {
                                selectedValue = mapped;
                            }
                        }
                    }

                    // 4. Se não casou com nenhum, vira opção custom
                    if (!selectedValue && lower) {
                        const safeValue = lower.replace(/"/g, '').slice(0, 60);
                        customOption = `<option value="${safeValue}" selected>${safeValue} (custom)</option>`;
                        selectedValue = safeValue;
                    }
                }

                row.innerHTML = `
                    <div class="clw-rel-name" title="${escapeHtml(pair.fromTitle)}">${escapeHtml(pair.fromTitle)}</div>
                    <div class="clw-rel-arrow">→</div>
                    <div class="clw-rel-name" title="${escapeHtml(pair.toTitle)}">${escapeHtml(pair.toTitle)}</div>
                    <select class="clw-rel-select" id="clw-rel-sel-${i}">
                        ${customOption}
                        ${standardOptions}
                    </select>
                `;

                // Pré-seleciona se for valor padrão (custom já está selected via atributo)
                if (selectedValue && !customOption) {
                    const sel = row.querySelector('select');
                    if (sel) {
                        const opt = [...sel.options].find(o => o.value === selectedValue);
                        if (opt) opt.selected = true;
                    }
                }

                fragment.appendChild(row);
            });
            $list.appendChild(fragment);
            $save.style.display = 'block';
        } catch (err) {
            console.error('[CanvasLinker] openRelationsPanel error:', err);
            api.showError('Erro ao ler canvas: ' + err.message);
            $panel.style.display = 'none';
        }
    }

    async _confirmSaveRelations() {
        const canvasNoteId = this.noteId;
        if (!canvasNoteId) { api.showError('Nenhuma nota Canvas ativa.'); return; }

        const rows = this._els('.clw-rel-row', this._el('clw-relmap-list'));
        if (rows.length === 0) return;

        const relations = [];
        rows.forEach((row, i) => {
            const select = this._el(`clw-rel-sel-${i}`);
            if (!select || select.value === 'none') return;

            const textElId = row.dataset.textElId;
            let newText = '';
            if (textElId) {
                const rel = RELATION_TYPES.find(r => r.value === select.value);
                newText = rel ? rel.label : select.value;
            }

            relations.push({
                fromNoteId: row.dataset.from,
                toNoteId:   row.dataset.to,
                relType:    select.value,
                textElId:   textElId || '',
                newText,
            });
        });

        if (relations.length === 0) {
            this._hide('clw-relmap-panel');
            api.showMessage('ℹ️ Nenhuma relação selecionada.');
            return;
        }

        try {
            const saved = await api.runOnBackend((canvasNoteId, relations) => {
                let count = 0;
                for (const { fromNoteId, toNoteId, relType } of relations) {
                    try {
                        const note = api.getNote(fromNoteId);
                        if (!note) continue;
                        note.addRelation(relType, toNoteId);
                        count++;
                    } catch (err) {
                        console.error(
                            `[CanvasLinker] addRelation failed: ${fromNoteId} → ${toNoteId}`, err
                        );
                    }
                }

                const canvasNote = api.getNote(canvasNoteId);
                if (canvasNote) {
                    let data;
                    try { data = JSON.parse(canvasNote.getContent() || '{}'); } catch (_) { data = {}; }
                    let dirty = false;
                    for (const { textElId, newText } of relations) {
                        if (!textElId || !newText) continue;
                        const el = (data.elements || []).find(e => e.id === textElId);
                        if (el && el.type === 'text' && el.text !== newText) {
                            el.text = newText;
                            el.originalText = newText;
                            dirty = true;
                        }
                    }
                    if (dirty) canvasNote.setContent(JSON.stringify(data));
                }

                return count;
            }, [canvasNoteId, relations]);

            this._hide('clw-relmap-panel');
            api.showMessage(`✅ ${saved} relação(ões) salvas.`);
        } catch (err) {
            console.error('[CanvasLinker] confirmSaveRelations error:', err);
            api.showError('Erro ao salvar relações: ' + err.message);
        }
    }

    /* ── GERADOR DE LONGFORM ───────────────────────────── */
    async _generateLongform() {
        const canvasNoteId = this.noteId;
        if (!canvasNoteId) { api.showError('Nenhuma nota Canvas ativa.'); return; }
        api.showMessage('Lendo canvas…');

        try {
            const { elements, canvasTitle } = await api.runOnBackend((canvasNoteId) => {
                const note = api.getNote(canvasNoteId);
                if (!note) throw new Error('Nota canvas não encontrada.');
                let data;
                try { data = JSON.parse(note.getContent() || '{}'); } catch (_) { data = {}; }
                return {
                    elements:    (data.elements || []).filter(e => !e.isDeleted),
                    canvasTitle: note.title
                };
            }, [canvasNoteId]);

            const cardMap = {};
            const cardPos = {};
            elements.forEach(el => {
                if (el.type === 'rectangle' && el.link?.startsWith('#root/')) {
                    cardMap[el.id] = el.link.replace('#root/', '');
                    cardPos[el.id] = { x: el.x || 0, y: el.y || 0 };
                }
            });

            const totalCards = Object.keys(cardMap).length;
            if (totalCards === 0) {
                api.showError('Nenhum card com nota vinculada encontrado no canvas.');
                return;
            }

            const groupToCard = {};
            Object.keys(cardMap).forEach(rectId => {
                const el = elements.find(e => e.id === rectId);
                if (el?.groupIds) el.groupIds.forEach(gid => { groupToCard[gid] = rectId; });
            });

            const resolveToCard = (elId) => {
                if (cardMap[elId]) return elId;
                const el = elements.find(e => e.id === elId);
                if (el?.groupIds) {
                    for (const gid of el.groupIds) { if (groupToCard[gid]) return groupToCard[gid]; }
                }
                return null;
            };

            const adjList  = {};
            const inDegree = {};
            Object.keys(cardMap).forEach(id => { adjList[id] = []; inDegree[id] = 0; });

            let arrowCount = 0;
            elements.forEach(el => {
                if (el.type === 'arrow' && el.startBinding?.elementId && el.endBinding?.elementId) {
                    const from = resolveToCard(el.startBinding.elementId);
                    const to   = resolveToCard(el.endBinding.elementId);
                    if (from && to && from !== to) {
                        adjList[from].push(to); inDegree[to]++; arrowCount++;
                    }
                }
            });

            console.log(`[CanvasLinker] Longform: ${totalCards} cards, ${arrowCount} setas.`);

            const ordered = [];
            const visited = new Set();
            if (arrowCount > 0) {
                const queue = Object.keys(cardMap)
                    .filter(id => inDegree[id] === 0 && adjList[id].length > 0);
                if (queue.length === 0) {
                    console.warn('[CanvasLinker] Ciclo detectado — usando ordem por posição.');
                    api.showMessage('⚠️ Ciclo nas setas — ordenando por posição.');
                } else {
                    while (queue.length > 0) {
                        const current = queue.shift();
                        if (visited.has(current)) continue;
                        visited.add(current);
                        ordered.push(current);
                        for (const neighbor of adjList[current]) {
                            inDegree[neighbor]--;
                            if (inDegree[neighbor] === 0) queue.push(neighbor);
                        }
                    }
                }
            }

            const remaining = Object.keys(cardMap)
                .filter(id => !visited.has(id))
                .sort((a, b) => {
                    const dy = cardPos[a].y - cardPos[b].y;
                    return dy !== 0 ? dy : cardPos[a].x - cardPos[b].x;
                });

            const finalOrder = [...ordered, ...remaining];
            const noteIds    = finalOrder.map(elId => cardMap[elId]);

            const orderSource = arrowCount > 0 && ordered.length > 0
                ? `${ordered.length} via setas + ${remaining.length} por posição`
                : `${noteIds.length} por posição (nenhuma seta detectada)`;

            const newNoteId = await api.runOnBackend((canvasNoteId, noteIds, canvasTitle) => {
                let content = '';
                for (const nid of noteIds) {
                    const note = api.getNote(nid);
                    if (!note) continue;
                    // Remove apenas style/script embutidos — preserva o HTML estrutural da nota
                    const raw = (note.getContent() || '')
                        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
                    content += `<h2>${note.title}</h2>\n${raw}\n<br><hr><br>\n`;
                }
                const result = api.createNewNote({
                    parentNoteId: canvasNoteId,
                    title:        '📄 ' + canvasTitle,
                    content, type: 'text'
                });
                return result.note.noteId;
            }, [canvasNoteId, noteIds, canvasTitle]);

            api.showMessage(`✅ Longform: ${orderSource}`);
            setTimeout(() => api.activateNote(newNoteId), 300);
        } catch (err) {
            console.error('[CanvasLinker] longform error:', err);
            api.showError('Erro ao gerar longform: ' + err.message);
        }
    }

    /* ── GERADOR DE FLUXOS ─────────────────────────────── */
    _toggleFlowPanel() {
        const panel = this._el('clw-flow-panel');
        if (!panel) return;
        const isOpen = panel.style.display === 'block';

        this._hide('clw-panel');
        this._hide('clw-newnote-float');
        this._hide('clw-relmap-panel');
        this._hide('clw-remove-panel');
        this._hide('clw-edit-panel');
        this._hide('clw-tpl-panel');
        this._hide('clw-help-panel');

        if (isOpen) { panel.style.display = 'none'; return; }

        panel.style.display = 'block';
        const spec = this._el('clw-flow-spec');
        if (spec && !spec.value.trim()) spec.value = FLOW_DEFAULT_SPEC;
        this._flowStatus('');
    }

    /* ── AJUDA ──────────────────────────────────────────── */
    _toggleHelpPanel() {
        const panel = this._el('clw-help-panel');
        if (!panel) return;
        const isOpen = panel.style.display === 'block';

        this._hide('clw-panel');
        this._hide('clw-newnote-float');
        this._hide('clw-relmap-panel');
        this._hide('clw-remove-panel');
        this._hide('clw-edit-panel');
        this._hide('clw-flow-panel');
        this._hide('clw-tpl-panel');

        panel.style.display = isOpen ? 'none' : 'block';
    }

    /* ── TEMPLATES (#canvasTemplate) ───────────────────── */
    _toggleTplPanel() {
        const panel = this._el('clw-tpl-panel');
        if (!panel) return;
        const isOpen = panel.style.display === 'block';

        this._hide('clw-panel');
        this._hide('clw-newnote-float');
        this._hide('clw-relmap-panel');
        this._hide('clw-remove-panel');
        this._hide('clw-edit-panel');
        this._hide('clw-flow-panel');
        this._hide('clw-help-panel');

        if (isOpen) { panel.style.display = 'none'; return; }

        panel.style.display = 'block';
        this._tplStatus('');
        const filter = this._el('clw-tpl-filter');
        if (filter) filter.value = '';
        if (!this._templatesLoaded) this._loadTemplates();
        else this._renderTemplates();
    }

    _tplStatus(msg, isError) {
        const el = this._el('clw-tpl-status');
        if (!el) return;
        el.textContent = msg || '';
        el.style.color = isError ? '#f38ba8' : 'var(--muted-text-color,#6c7086)';
        el.style.display = msg ? 'block' : 'none';
    }

    async _loadTemplates() {
        const list = this._el('clw-tpl-list');
        if (list) list.innerHTML = '';
        this._tplStatus('Carregando templates…');
        try {
            this._templates = await api.runOnBackend(() => api.searchForNotes('#canvasTemplate')
                .map(note => ({ noteId: note.noteId, title: note.title || '(sem título)' }))
                .sort((a, b) => a.title.localeCompare(b.title)));
            this._templatesLoaded = true;
            this._renderTemplates();
        } catch (err) {
            console.error('[CanvasLinker] loadTemplates error:', err);
            this._tplStatus('Erro ao carregar templates.', true);
        }
    }

    _renderTemplates() {
        const list = this._el('clw-tpl-list');
        if (!list) return;
        const filterEl = this._el('clw-tpl-filter');
        const filter = (filterEl?.value || '').trim().toLowerCase();
        const all = this._templates || [];
        const items = filter
            ? all.filter(t => (t.title || '').toLowerCase().includes(filter))
            : all;
        list.innerHTML = '';
        if (!items.length) {
            this._tplStatus(all.length
                ? 'Nenhum template corresponde ao filtro.'
                : 'Nenhum template encontrado. Crie um canvas e marque com #canvasTemplate.');
            return;
        }
        this._tplStatus('');
        for (const tpl of items) {
            const item = document.createElement('div');
            item.className = 'clw-tpl-item';
            item.innerHTML = '<span class="clw-tpl-item-ic">🧩</span>' + escapeHtml(tpl.title);
            item.title = 'Inserir template no canvas';
            item.addEventListener('click', () => this._insertTemplate(tpl.noteId, tpl.title));
            list.appendChild(item);
        }
    }

    async _insertTemplate(templateNoteId, templateTitle) {
        const canvasNoteId = this.noteId;
        if (!canvasNoteId) { api.showError('Nenhuma nota Canvas ativa.'); return; }
        this._tplStatus('Inserindo template…');
        try {
            const count = await api.runOnBackend((canvasNoteId, templateNoteId, margin) => {
                const canvasNote = api.getNote(canvasNoteId);
                if (!canvasNote) throw new Error('Canvas atual não encontrado.');
                const templateNote = api.getNote(templateNoteId);
                if (!templateNote) throw new Error('Template não encontrado.');

                let canvasData;
                try { canvasData = JSON.parse(canvasNote.getContent() || '{}'); } catch (_) { canvasData = {}; }
                if (!canvasData.type)     canvasData.type     = 'excalidraw';
                if (!canvasData.version)  canvasData.version  = 2;
                if (!canvasData.elements) canvasData.elements = [];

                let templateData;
                try { templateData = JSON.parse(templateNote.getContent() || '{}'); } catch (_) { throw new Error('Template inválido.'); }
                const src = (templateData.elements || []).filter(e => e && !e.isDeleted);

                // posiciona à direita do conteúdo existente (convenção do gerador de fluxos)
                const active = canvasData.elements.filter(e => !e.isDeleted);
                let dx = 0, dy = 0;
                if (active.length) {
                    const maxX = Math.max(...active.map(e => (e.x || 0) + (e.width || 0)));
                    const minY = Math.min(...active.map(e => (e.y || 0)));
                    dx = maxX + margin; dy = minY;
                }

                // clona com ids novos e remapeia referências (boundElements, bindings, container, frame)
                const idMap = new Map();
                for (const el of src) if (el.id) idMap.set(el.id, 'tpl_' + Math.random().toString(36).slice(2, 14));
                const mapRef = (v) => (v && idMap.get(v)) || v;

                const now = Date.now();
                const clones = [];
                const A = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
                let seq = 0;
                for (const el of src) {
                    const c = JSON.parse(JSON.stringify(el));
                    c.id = mapRef(c.id);
                    if (Array.isArray(c.boundElements)) c.boundElements = c.boundElements.map(b => ({ ...b, id: mapRef(b.id) }));
                    if (c.startBinding) c.startBinding = { ...c.startBinding, elementId: mapRef(c.startBinding.elementId) };
                    if (c.endBinding)   c.endBinding   = { ...c.endBinding,   elementId: mapRef(c.endBinding.elementId) };
                    if (c.containerId)  c.containerId  = mapRef(c.containerId);
                    if (c.frameId)      c.frameId      = mapRef(c.frameId);
                    if (typeof c.x === 'number') c.x += dx;
                    if (typeof c.y === 'number') c.y += dy;
                    c.seed = Math.floor(Math.random() * 999999);
                    c.versionNonce = Math.floor(Math.random() * 999999);
                    c.updated = now;
                    c.index = 'a' + A[Math.floor(seq / A.length)] + A[seq % A.length];
                    seq++;
                    clones.push(c);
                }

                canvasData.elements.push(...clones);
                canvasNote.setContent(JSON.stringify(canvasData));
                return clones.length;
            }, [canvasNoteId, templateNoteId, FLOW_CONFIG.marginX]);

            this._hide('clw-tpl-panel');
            api.showMessage(`🧩 Template "${templateTitle}" inserido (${count} elementos).`);
            await api.activateNote(canvasNoteId);
        } catch (err) {
            console.error('[CanvasLinker] insertTemplate error:', err);
            this._tplStatus('✗ Erro: ' + err.message, true);
            api.showError('Erro ao inserir template: ' + err.message);
        }
    }

    _flowStatus(msg, isError) {
        const el = this._el('clw-flow-status');
        if (!el) return;
        el.textContent = msg || '';
        el.style.color = isError ? '#f38ba8' : 'var(--muted-text-color,#6c7086)';
        el.style.display = msg ? 'block' : 'none';
    }

    _flowSpec() {
        const spec = this._el('clw-flow-spec')?.value || '';
        const direction = this._el('clw-flow-dir')?.value === 'LR' ? 'LR' : 'TB';
        const parsed = parseFlowSpec(spec);
        if (parsed.errors.length) {
            this._flowStatus('⚠️ ' + parsed.errors.slice(0, 3).join(' '), true);
            return null;
        }
        if (!parsed.nodes.length) {
            this._flowStatus('⚠️ Nenhum nó definido. Use "ID: Rótulo [tipo]".', true);
            return null;
        }
        return { ...parsed, direction };
    }

    _flowScene(parsed) {
        const { elements, layers } = buildFlowElements(parsed.nodes, parsed.edges, parsed.direction, { x: 0, y: 0 });
        return {
            elements, layers,
            scene: JSON.stringify({
                type: 'excalidraw', version: 2, elements,
                appState: { gridModeEnabled: true, viewBackgroundColor: '#f8fafc' },
                files: {},
            }),
        };
    }

    async _generateFlowToCanvas() {
        const canvasNoteId = this.noteId;
        if (!canvasNoteId) { api.showError('Nenhuma nota Canvas ativa.'); return; }

        const parsed = this._flowSpec();
        if (!parsed) return;

        try {
            const { elements, layers } = this._flowScene(parsed);

            const count = await api.runOnBackend((canvasNoteId, newEls, margin) => {
                const canvasNote = api.getNote(canvasNoteId);
                if (!canvasNote) throw new Error('Nota canvas não encontrada.');
                let data;
                try { data = JSON.parse(canvasNote.getContent() || '{}'); } catch (_) { data = {}; }
                if (!data.type)     data.type     = 'excalidraw';
                if (!data.version)  data.version  = 2;
                if (!data.elements) data.elements = [];

                const active = data.elements.filter(e => !e.isDeleted);
                let dx = 0, dy = 0;
                if (active.length > 0) {
                    const maxX = Math.max(...active.map(e => (e.x || 0) + (e.width || 0)));
                    const minY = Math.min(...active.map(e => (e.y || 0)));
                    dx = maxX + margin;
                    dy = minY;
                }
                const now = Date.now();
                for (const el of newEls) { el.x += dx; el.y += dy; el.updated = now; }

                data.elements.push(...newEls);
                canvasNote.setContent(JSON.stringify(data));
                return newEls.length;
            }, [canvasNoteId, elements, FLOW_CONFIG.marginX]);

            this._flowStatus(`✅ ${count} elementos (${parsed.nodes.length} nós, ${layers} camadas) — sem setas.`);
            api.showMessage('🪄 Fluxo gerado no canvas.');
            await api.activateNote(canvasNoteId);
        } catch (err) {
            console.error('[CanvasLinker] generateFlow error:', err);
            this._flowStatus('✗ Erro: ' + err.message, true);
            api.showError('Erro ao gerar fluxo: ' + err.message);
        }
    }

    async _createFlowNote() {
        const canvasNoteId = this.noteId;
        if (!canvasNoteId) { api.showError('Nenhuma nota Canvas ativa.'); return; }

        const title = this._el('clw-flow-title')?.value.trim();
        if (!title) { this._flowStatus('⚠️ Informe o título no campo acima para criar a nota.', true); return; }

        const parsed = this._flowSpec();
        if (!parsed) return;

        try {
            const { scene } = this._flowScene(parsed);

            const info = await api.runOnBackend((canvasNoteId, title, scene) => {
                const canvasNote = api.getNote(canvasNoteId);
                let parentId = canvasNote?.parentNoteIds?.[0];
                let parentTitle = 'pasta do canvas atual';
                const found = api.searchForNotes('Fluxos')
                    .find(n => (n.title || '').trim().toLowerCase() === 'fluxos');
                if (found) { parentId = found.noteId; parentTitle = found.title; }
                const res = api.createNewNote({
                    parentNoteId: parentId, title,
                    content: scene, type: 'canvas', mime: 'application/json',
                });
                return { noteId: res.note.noteId, parentTitle };
            }, [canvasNoteId, title, scene]);

            this._flowStatus(`✅ Nota "${title}" criada em "${info.parentTitle}".`);
            api.showMessage('🗂️ Nota de fluxo criada.');
            setTimeout(() => api.activateNote(info.noteId), 250);
        } catch (err) {
            console.error('[CanvasLinker] createFlowNote error:', err);
            this._flowStatus('✗ Erro: ' + err.message, true);
            api.showError('Erro ao criar nota: ' + err.message);
        }
    }

    async _saveFlowTemplate() {
        const canvasNoteId = this.noteId;
        if (!canvasNoteId) { api.showError('Nenhuma nota Canvas ativa.'); return; }

        const name = this._el('clw-flow-title')?.value.trim() || 'Fluxo';

        const parsed = this._flowSpec();
        if (!parsed) return;

        try {
            const { scene } = this._flowScene(parsed);

            const info = await api.runOnBackend((canvasNoteId, name, scene) => {
                const canvasNote = api.getNote(canvasNoteId);
                let parentId = canvasNote?.parentNoteIds?.[0];
                let where = 'pasta do canvas atual';
                const tpls = api.searchForNotes('#canvasTemplate');
                if (tpls && tpls.length > 0) {
                    parentId = tpls[0].parentNoteIds?.[0] || parentId;
                    where = 'pasta dos templates';
                }
                const res = api.createNewNote({
                    parentNoteId: parentId, title: 'Template - ' + name,
                    content: scene, type: 'canvas', mime: 'application/json',
                });
                const note = api.getNote(res.note.noteId);
                note.addLabel('canvasTemplate', '');
                return { noteId: res.note.noteId, where };
            }, [canvasNoteId, name, scene]);

            this._flowStatus(`✅ Template "Template - ${name}" salvo (${info.where}).`);
            api.showMessage('🧩 Template de fluxo salvo.');
            setTimeout(() => api.activateNote(info.noteId), 250);
        } catch (err) {
            console.error('[CanvasLinker] saveFlowTemplate error:', err);
            this._flowStatus('✗ Erro: ' + err.message, true);
            api.showError('Erro ao salvar template: ' + err.message);
        }
    }

    /* ── BUSCA ──────────────────────────────────────────── */
    async _onSearch(query) {
        const $results = this._el('clw-results');
        const $status  = this._el('clw-status');
        $results.innerHTML = '';

        if (!query || query.trim().length < 2) {
            $status.style.display = 'none';
            return;
        }

        $status.textContent = 'Buscando…';
        $status.style.display = 'block';

        try {
            const sliceLen = CARD_CONFIG.excerptSlice;
            // Usa helper centralizado — elimina duplicação com _insertCard
            const cleanPatterns = getCleanPatterns();

            const notes = await api.runOnBackend((q, sliceLen, cleanPatterns) => {
                const patterns = cleanPatterns.map(([src, flags, repl]) => [new RegExp(src, flags), repl]);
                function clean(raw, max) {
                    if (!raw) return '';
                    let t = raw;
                    for (const [re, r] of patterns) t = t.replace(re, r);
                    t = t.trim();
                    return max ? t.slice(0, max) : t;
                }
                return api.searchForNotes(q).slice(0, 15).map(n => ({
                    noteId: n.noteId,
                    title: n.title,
                    excerpt: clean(n.getContent() || '', sliceLen)
                }));
            }, [query.trim(), sliceLen, cleanPatterns]);

            $status.style.display = 'none';
            if (!notes || notes.length === 0) {
                $status.textContent = 'Nenhuma nota encontrada.';
                $status.style.display = 'block';
                return;
            }

            const fragment = document.createDocumentFragment();
            notes.forEach((note, i) => {
                const title   = note.title   || '(sem título)';
                const excerpt = note.excerpt || '';
                const item    = document.createElement('div');
                item.className  = 'clw-result-item';
                item.title      = title;
                item.style.animationDelay = `${i * 30}ms`;
                item.dataset.noteId  = note.noteId;
                item.dataset.title   = title;
                item.dataset.excerpt = excerpt;

                // FIX: escapa HTML para prevenir XSS caso título/excerpt contenha tags
                item.innerHTML = [
                    `<div class="clw-result-title">${escapeHtml(title)}</div>`,
                    excerpt ? `<div class="clw-result-excerpt">${escapeHtml(excerpt)}</div>` : ''
                ].join('');

                item.addEventListener('click', () => {
                    window._clw?.insert(note.noteId, title, excerpt);
                });
                fragment.appendChild(item);
            });
            $results.appendChild(fragment);
        } catch (err) {
            $status.textContent = 'Erro na busca: ' + err.message;
            $status.style.display = 'block';
            console.error('[CanvasLinker] search error', err);
        }
    }

    /* ── INSERÇÃO DE CARDS ──────────────────────────────── */
    async _insertCard(noteId, title, excerpt) {
        const canvasNoteId = this._captureMode ? this._captureCanvasNoteId : this.noteId;
        if (!canvasNoteId) { api.showError('Nenhuma nota Canvas ativa.'); return; }

        const $status = this._el('clw-status');
        if ($status) {
            $status.textContent = 'Inserindo card…';
            $status.style.display = 'block';
            const results = this._el('clw-results');
            if (results) results.innerHTML = '';
        }

        try {
            // Usa helper centralizado — elimina duplicação com _onSearch
            const cleanConfig = getCleanPatterns();

            await api.runOnBackend((canvasNoteId, linkedNoteId, title, excerpt, cfg, cleanPatterns) => {
                // Reconstrói regexes
                const patterns = cleanPatterns.map(([src, flags, repl]) => [new RegExp(src, flags), repl]);

                function clean(raw, max) {
                    if (!raw) return '';
                    let t = raw;
                    for (const [re, r] of patterns) t = t.replace(re, r);
                    t = t.trim();
                    return max ? t.slice(0, max) : t;
                }

                function estimateTextHeight(text, fontSize, lineHeightRatio, availableWidth) {
                    if (!text) return 0;
                    const avgCharWidth = fontSize * 0.60;
                    const charsPerLine = Math.max(1, Math.floor(availableWidth / avgCharWidth));
                    const lines = text.split('\n').reduce((acc, paragraph) => {
                        return acc + Math.max(1, Math.ceil(paragraph.length / charsPerLine));
                    }, 0);
                    return Math.ceil(lines * fontSize * lineHeightRatio) + 20;
                }

                function wrapText(text, maxLen) {
                    if (!text || text.length <= maxLen) return text || '';
                    const words = text.split(' ');
                    const lines = [];
                    let current = '';
                    for (const word of words) {
                        const test = current ? current + ' ' + word : word;
                        if (test.length > maxLen && current) {
                            lines.push(current);
                            current = word;
                        } else {
                            current = test;
                        }
                    }
                    if (current) lines.push(current);
                    return lines.join('\n');
                }

                if (!excerpt) {
                    try {
                        const linkedNote = api.getNote(linkedNoteId);
                        excerpt = clean(linkedNote.getContent() || '', cfg.excerptSlice);
                    } catch (_) {}
                }

                if (excerpt) { excerpt = wrapText(excerpt, 40); }

                const canvasNote = api.getNote(canvasNoteId);
                if (!canvasNote) throw new Error('Nota canvas não encontrada: ' + canvasNoteId);

                let data;
                try { data = JSON.parse(canvasNote.getContent() || '{}'); } catch (_) { data = {}; }
                if (!data.type)     data.type     = 'excalidraw';
                if (!data.version)  data.version  = 2;
                if (!data.elements) data.elements = [];

                // FIX: conta apenas cards CLW (retângulos com link #root/) para não
                // desalinhar o grid quando o canvas tem formas, textos ou setas avulsas.
                const active = data.elements.filter(
                    e => !e.isDeleted && e.type === 'rectangle' && e.link?.startsWith('#root/')
                ).length;
                const col    = active % cfg.cols;
                const row    = Math.floor(active / cfg.cols);

                const estimatedCardH = cfg.padY + 36 + 6
                    + (excerpt ? estimateTextHeight(excerpt, cfg.excerptFontSize, 1.3, cfg.width - cfg.padX * 2) : 0)
                    + cfg.padY;

                const x = cfg.originX + col * cfg.colGap;
                const y = cfg.originY + row * (estimatedCardH + cfg.rowGap);

                const titleH = Math.ceil(cfg.titleFontSize * 1.25) + 4;
                const excerptH = excerpt
                    ? estimateTextHeight(excerpt, cfg.excerptFontSize, 1.3, cfg.width - cfg.padX * 2)
                    : 0;
                const totalH = cfg.padY + titleH + (excerpt ? 6 + excerptH : 0) + cfg.padY;

                const now     = Date.now();
                const groupId = 'clw_g_' + Math.random().toString(36).substr(2, 14);
                const rectId  = 'clw_r_' + Math.random().toString(36).substr(2, 14);
                const titleId = 'clw_t_' + Math.random().toString(36).substr(2, 14);
                const excrId  = 'clw_e_' + Math.random().toString(36).substr(2, 14);

                const makeSeed  = () => Math.floor(Math.random() * 999999);
                const makeNonce = () => Math.floor(Math.random() * 999999);

                data.elements.push({
                    id: rectId, type: 'rectangle',
                    x, y, width: cfg.width, height: totalH, angle: 0,
                    strokeColor: cfg.strokeColor, backgroundColor: cfg.backgroundColor,
                    fillStyle: 'solid', strokeWidth: 1, strokeStyle: 'solid',
                    roughness: cfg.roughness, opacity: 100, groupIds: [groupId],
                    roundness: cfg.cornerRadius,
                    seed: makeSeed(), version: 1,
                    versionNonce: makeNonce(),
                    isDeleted: false, boundElements: [], updated: now,
                    link: '#root/' + linkedNoteId, locked: false
                });

                data.elements.push({
                    id: titleId, type: 'text',
                    x: x + cfg.padX, y: y + cfg.padY,
                    width: cfg.width - cfg.padX * 2, height: titleH, angle: 0,
                    strokeColor: cfg.strokeColor, backgroundColor: 'transparent',
                    fillStyle: 'solid', strokeWidth: 1, strokeStyle: 'solid',
                    roughness: cfg.roughness, opacity: 100, groupIds: [groupId],
                    seed: makeSeed(), version: 1,
                    versionNonce: makeNonce(),
                    isDeleted: false, updated: now,
                    text: title, fontSize: cfg.titleFontSize, fontFamily: cfg.fontFamily,
                    textAlign: 'left', verticalAlign: 'top',
                    originalText: title, lineHeight: 1.25, autoResize: false
                });

                if (excerpt) {
                    data.elements.push({
                        id: excrId, type: 'text',
                        x: x + cfg.padX, y: y + cfg.padY + titleH + 6,
                        width: cfg.width - cfg.padX * 2, height: excerptH, angle: 0,
                        strokeColor: '#6c7086', backgroundColor: 'transparent',
                        fillStyle: 'solid', strokeWidth: 1, strokeStyle: 'solid',
                        roughness: cfg.roughness, opacity: 100, groupIds: [groupId],
                        seed: makeSeed(), version: 1,
                        versionNonce: makeNonce(),
                        isDeleted: false, updated: now,
                        text: excerpt, fontSize: cfg.excerptFontSize, fontFamily: cfg.fontFamily,
                        textAlign: 'left', verticalAlign: 'top',
                        originalText: excerpt, lineHeight: 1.3, autoResize: false
                    });
                }

                canvasNote.setContent(JSON.stringify(data));
            }, [canvasNoteId, noteId, title, excerpt || '', CARD_CONFIG, cleanConfig]);

            if (this._captureMode) {
                api.showMessage(`📌 "${title}" capturada`);
            } else {
                this._hide('clw-panel');
                api.showMessage(`Card "${title}" inserido!`);
                await api.activateNote(canvasNoteId);
            }
        } catch (err) {
            console.error('[CanvasLinker] insert error', err);
            if ($status) {
                $status.textContent = '✗ Erro: ' + err.message;
                $status.style.display = 'block';
            }
            api.showError('CanvasLinker: ' + err.message);
        }
    }

    /* ── REFRESH ────────────────────────────────────────── */
    async refreshWithNote(note) {
        const root = this._el('clw-root');
        if (!root) return;

        if (this._captureMode && note && note.noteId !== this._captureCanvasNoteId) {
            if (note.type === 'canvas') return;
            await this._insertCard(note.noteId, note.title, '');
            await api.activateNote(this._captureCanvasNoteId);
            return;
        }

        if (note && note.type === 'canvas') {
            root.style.display = 'flex';
        } else {
            root.style.display = 'none';
            this._hide('clw-panel');
            this._hide('clw-relmap-panel');
            this._hide('clw-remove-panel');
            this._hide('clw-flow-panel');
            this._hide('clw-tpl-panel');
            this._hide('clw-help-panel');
        }
    }

    entitledToRefreshWithNote() { return true; }
}

module.exports = new CanvasLinkerWidget();
