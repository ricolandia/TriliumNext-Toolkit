// ============================================================
// CANVAS MOBILE (v9) — GERADO AUTOMATICAMENTE
// NÃO EDITE ESTE ARQUIVO: edite mobile-launcher.src.js (UI/ações) ou
// "Canvas tools v8.js" (engine/i18n/backends) e rode: bun build-mobile-launcher.js
// Gerado em: 2026-09-24T11:22:56.155Z
// ============================================================

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
    { value: 'relatedTo',   labelKey: 'relation.relatedTo'   },
    { value: 'inspires',    labelKey: 'relation.inspires'    },
    { value: 'contradicts', labelKey: 'relation.contradicts' },
    { value: 'supports',    labelKey: 'relation.supports'    },
    { value: 'precedes',    labelKey: 'relation.precedes'    },
    { value: 'exemplifies', labelKey: 'relation.exemplifies' },
];

function relationOptionsHtml(t) {
    return '<option value="none">' + t('relations.skip') + '</option>' +
        RELATION_TYPES.map(r => `<option value="${r.value}">${t(r.labelKey)}</option>`).join('');
}

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

const FLOW_DEFAULT_SPEC_PT = [
    '# Exemplo — edite ou apague. Tipos: inicio | processo | decisao | fim (ou start | process | decision | end)',
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

const FLOW_DEFAULT_SPEC_EN = [
    '# Example — edit or delete. Types: start | process | decision | end (or inicio | processo | decisao | fim)',
    'Start: Receive request [start]',
    'Brief: Has a briefing? [decision]',
    'Quote: Build quote and proposal [process]',
    'Info: Ask for more information [process]',
    'Proposal: Send proposal [process]',
    'End: Approved and delivered [end]',
    '',
    'Start -> Brief',
    'Brief -> Quote',
    'Brief -> Info',
    'Info -> Brief',
    'Quote -> Proposal',
    'Proposal -> End',
].join('\n');

/** Exemplo padrão da DSL conforme o idioma (fallback: PT). */
function flowDefaultSpec(lang) {
    return lang === 'en' ? FLOW_DEFAULT_SPEC_EN : FLOW_DEFAULT_SPEC_PT;
}

const FLOW_DEFAULT_SPEC = FLOW_DEFAULT_SPEC_PT;

const FLOW_ID = '[\\p{L}\\p{N}_.\\-]+';
const FLOW_NODE_RE = new RegExp('^(' + FLOW_ID + ')\\s*:\\s*(.+?)(?:\\s*\\[(inicio|processo|decisao|fim|start|process|decision|end)\\])?\\s*$', 'iu');
const FLOW_EDGE_RE = new RegExp('^(' + FLOW_ID + ')\\s*->\\s*(' + FLOW_ID + ')\\s*(?::\\s*(.+))?$', 'u');

// Sinônimos em inglês para os tipos de nó (mesmos tipos internos)
const FLOW_TYPE_ALIASES = { start: 'inicio', process: 'processo', decision: 'decisao', end: 'fim' };

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
function parseFlowSpec(text, t) {
    const nodes = new Map();
    const edges = [];
    const errors = [];
    const tr = typeof t === 'function' ? t : null;
    const msg = (key, fallback, vars) => (tr ? tr(key, vars) : fallback);

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
            if (nodes.has(id)) {
                errors.push(msg('flow.err.dup', `Linha ${idx + 1}: nó "${id}" duplicado.`, { n: idx + 1, id }));
                return;
            }
            const rawType = (node[3] || 'processo').toLowerCase();
            nodes.set(id, { id, label: node[2].trim(), type: FLOW_TYPE_ALIASES[rawType] || rawType });
            return;
        }

        errors.push(msg('flow.err.unknown', `Linha ${idx + 1}: não entendi "${line.slice(0, 40)}". Use "ID: Rótulo [tipo]" ou "ID -> ID : rótulo".`, { n: idx + 1, line: line.slice(0, 40) }));
    });

    for (const e of edges) {
        if (!nodes.has(e.from)) errors.push(msg('flow.err.from', `Linha ${e.line}: origem "${e.from}" não foi definida.`, { n: e.line, id: e.from }));
        if (!nodes.has(e.to))   errors.push(msg('flow.err.to', `Linha ${e.line}: destino "${e.to}" não foi definido.`, { n: e.line, id: e.to }));
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
/**
 * Ordena os cards do canvas: segue as setas quando existem (ordem topológica) e
 * completa pela posição (y, x). Puro (sem api/DOM).
 * Devolve { noteIds, arrowCount, ordenados, restantes }.
 */
function clwOrdenarCards(elements, cardMap, cardPos) {
    const groupToCard = {};
    Object.keys(cardMap).forEach((rectId) => {
        const el = elements.find((e) => e.id === rectId);
        if (el?.groupIds) el.groupIds.forEach((gid) => { groupToCard[gid] = rectId; });
    });

    const resolveToCard = (elId) => {
        if (cardMap[elId]) return elId;
        const el = elements.find((e) => e.id === elId);
        if (el?.groupIds) {
            for (const gid of el.groupIds) { if (groupToCard[gid]) return groupToCard[gid]; }
        }
        return null;
    };

    const adjList  = {};
    const inDegree = {};
    Object.keys(cardMap).forEach((id) => { adjList[id] = []; inDegree[id] = 0; });

    let arrowCount = 0;
    elements.forEach((el) => {
        if (el.type === 'arrow' && el.startBinding?.elementId && el.endBinding?.elementId) {
            const from = resolveToCard(el.startBinding.elementId);
            const to   = resolveToCard(el.endBinding.elementId);
            if (from && to && from !== to) { adjList[from].push(to); inDegree[to]++; arrowCount++; }
        }
    });

    const ordered = [];
    const visited = new Set();
    if (arrowCount > 0) {
        const queue = Object.keys(cardMap).filter((id) => inDegree[id] === 0 && adjList[id].length > 0);
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

    const remaining = Object.keys(cardMap)
        .filter((id) => !visited.has(id))
        .sort((a, b) => {
            const dy = cardPos[a].y - cardPos[b].y;
            return dy !== 0 ? dy : cardPos[a].x - cardPos[b].x;
        });

    const finalOrder = [...ordered, ...remaining];
    return {
        noteIds: finalOrder.map((elId) => cardMap[elId]),
        arrowCount,
        ordenados: ordered.length,
        restantes: remaining.length,
    };
}
// ── FLOW ENGINE (fim) ───────────────────────────────────

// ── I18N (início) ───────────────────────────────────────
// PT/EN. A UI segue o idioma da interface do Trilium (opção `locale`,
// a mesma que o Excalidraw usa). Funções puras (sem DOM/api) para teste.

const CLW_I18N = {
    pt: {
        /* toolbar (tooltips) */
        'btn.insert':            'Inserir nota no Canvas',
        'btn.capture':           'Modo Captura',
        'btn.newnote':           'Criar nova nota filha',
        'btn.relations':         'Relações por setas',
        'btn.edit':              'Editar nota do card',
        'btn.sync':              'Atualizar cards das notas',
        'btn.longform':          'Gerar Longform',
        'btn.flow':              'Gerar fluxo (diagrama)',
        'btn.tpl':               'Inserir template no canvas',
        'btn.remove':            'Remover card do Canvas',
        'btn.help':              'Ajuda — o que faz cada botão',

        /* comum */
        'common.no_canvas':      'Nenhuma nota Canvas ativa.',
        'common.error':          '✗ Erro: ',

        /* busca / inserir nota */
        'search.title':          'Inserir nota no Canvas',
        'search.placeholder':    'Buscar nota por título…',
        'search.empty':          'Nenhuma nota encontrada.',
        'search.searching':      'Buscando…',
        'search.error':          'Erro na busca: ',
        'search.inserting':      'Inserindo card…',
        'search.captured':       '📌 "{title}" capturada',
        'search.inserted':       'Card "{title}" inserido!',

        /* nova nota */
        'newnote.title':         'Nova nota filha',
        'newnote.placeholder':   'Título da nota…',
        'newnote.create':        'Criar',
        'newnote.no_title':      'Digite um título para a nova nota.',
        'newnote.created':       '✅ Nota "{title}" criada e inserida no canvas.',
        'newnote.error':         'Erro ao criar nota: ',

        /* modo captura */
        'capture.no_canvas':     'Abra um Canvas para ativar a captura.',
        'capture.on':            '🎯 Modo Captura ativado — navegue pelas notas.',
        'capture.off':           '⏹ Modo Captura desativado.',
        'capture.banner':        'Modo Captura ativo — toda nota clicada entra no canvas',

        /* relações */
        'relations.title':       'Relações detectadas',
        'relations.empty':       'Nenhuma seta conectando cards encontrada.',
        'relations.save':        'Salvar relações',
        'relations.skip':        'Pular (sem relação)',
        'relations.none':        'ℹ️ Nenhuma relação selecionada.',
        'relations.saved':       '✅ {n} relação(ões) salvas.',
        'relations.error':       'Erro ao salvar relações: ',
        'relations.reading':     'Lendo canvas…',
        'relations.no_cards':    'Nenhum card com nota vinculada encontrado no canvas.',
        'relations.cycle':       '⚠️ Ciclo nas setas — ordenando por posição.',
        'relation.relatedTo':    'Relacionado',
        'relation.inspires':     'Inspira',
        'relation.contradicts':  'Contradiz',
        'relation.supports':     'Sustenta',
        'relation.precedes':     'Precede',
        'relation.exemplifies':  'Exemplifica',

        /* remover card */
        'remove.title':          'Remover card do canvas',
        'remove.empty':          'Nenhum card vinculado encontrado.',
        'remove.btn':            'Remover',
        'remove.done':           '🗑️ Card removido do canvas.',
        'remove.not_found':      'ℹ️ Card não encontrado no canvas.',
        'remove.error':          'Erro ao remover card: ',
        'cards.list_error':      'Erro ao listar cards: ',

        /* editar card / editor */
        'edit.title':            'Editar nota do card',
        'edit.btn':              'Editar',
        'editor.title':          'Editar nota',
        'editor.save':           'Salvar',
        'editor.no_note':        'Nota não encontrada.',
        'editor.saved':          '✏️ Nota salva e card atualizado.',
        'editor.error':          'Erro ao salvar: ',

        /* sincronizar */
        'sync.running':          '⟳ Atualizando cards…',
        'sync.none':             'ℹ️ Nenhum card vinculado no canvas.',
        'sync.done':             '⟳ {n} card(s) atualizado(s).',
        'sync.error':            'Erro ao sincronizar cards: ',

        /* longform */
        'longform.read_error':   'Erro ao ler canvas: ',
        'longform.error':        'Erro ao gerar longform: ',
        'longform.order_arrows': '{arrows} via setas + {rest} por posição',
        'longform.order_pos':    '{n} por posição (nenhuma seta detectada)',

        /* fluxo */
        'flow.title':            'Gerar fluxo',
        'flow.direction':        'Direção',
        'flow.tb':               'Vertical (TB)',
        'flow.lr':               'Horizontal (LR)',
        'flow.title_placeholder':'Título (para criar nota ou salvar template)…',
        'flow.generate':         'Gerar no canvas',
        'flow.example':          'Exemplo',
        'flow.create_note':      'Criar nota',
        'flow.template':         'Template',
        'flow.no_nodes':         '⚠️ Nenhum nó definido. Use "ID: Rótulo [tipo]".',
        'flow.need_title':       '⚠️ Informe o título no campo acima para criar a nota.',
        'flow.generated':        '✅ {n} elementos ({nodes} nós, {layers} camadas) — sem setas.',
        'flow.generated_msg':    '🪄 Fluxo gerado no canvas.',
        'flow.generate_error':   'Erro ao gerar fluxo: ',
        'flow.note_created':     '✅ Nota "{title}" criada em "{parent}".',
        'flow.note_created_msg': '🗂️ Nota de fluxo criada.',
        'flow.note_error':       'Erro ao criar nota: ',
        'flow.tpl_saved':        '✅ Template "Template - {name}" salvo ({where}).',
        'flow.tpl_saved_msg':    '🧩 Template de fluxo salvo.',
        'flow.tpl_error':        'Erro ao salvar template: ',
        'flow.where_templates':  'pasta dos templates',
        'flow.where_parent':     'pasta do canvas atual',
        'flow.canvas_missing':   'Nota canvas não encontrada.',
        'flow.err.dup':          'Linha {n}: nó "{id}" duplicado.',
        'flow.err.unknown':      'Linha {n}: não entendi "{line}". Use "ID: Rótulo [tipo]" ou "ID -> ID : rótulo".',
        'flow.err.from':         'Linha {n}: origem "{id}" não foi definida.',
        'flow.err.to':           'Linha {n}: destino "{id}" não foi definido.',

        /* templates */
        'tpl.title':             'Inserir template',
        'tpl.filter':            'Filtrar templates…',
        'tpl.empty':             'Nenhum template encontrado.',
        'tpl.empty_hint':        'Nenhum template encontrado. Crie um canvas e marque com #canvasTemplate.',
        'tpl.no_match':          'Nenhum template corresponde ao filtro.',
        'tpl.loading':           'Carregando templates…',
        'tpl.load_error':        'Erro ao carregar templates.',
        'tpl.inserting':         'Inserindo template…',
        'tpl.inserted':          '🧩 Template "{title}" inserido ({n} elementos).',
        'tpl.insert_error':      'Erro ao inserir template: ',
        'tpl.missing':           'Template não encontrado.',
        'tpl.invalid':           'Template inválido.',

        /* ajuda */
        'help.title':            'Ajuda — o que faz cada botão',
        'help.foot':             '<b>Esc</b> ou clique fora fecha os painéis.',
        'help.insert.name':      'Inserir nota',
        'help.insert.desc':      'Busca e insere a nota como card.',
        'help.capture.name':     'Modo captura',
        'help.capture.desc':     'Cada nota clicada entra como card.',
        'help.newnote.name':     'Nova nota',
        'help.newnote.desc':     'Cria nota filha e insere como card.',
        'help.relations.name':   'Relações por setas',
        'help.relations.desc':   'Detecta setas e salva a relação.',
        'help.edit.name':        'Editar cards',
        'help.edit.desc':        'Abre o editor da nota do card.',
        'help.sync.name':        'Sincronizar cards',
        'help.sync.desc':        'Atualiza título e resumo dos cards.',
        'help.longform.name':    'Longform',
        'help.longform.desc':    'Gera documento na ordem das setas.',
        'help.flow.name':        'Gerar fluxo',
        'help.flow.desc':        'DSL em texto → diagrama em camadas; sem setas.',
        'help.tpl.name':         'Templates',
        'help.tpl.desc':         'Insere uma nota <b>#canvasTemplate</b>.',
        'help.remove.name':      'Remover card',
        'help.remove.desc':      'Lista e remove cards do canvas.',
    },

    en: {
        /* toolbar (tooltips) */
        'btn.insert':            'Insert note into Canvas',
        'btn.capture':           'Capture mode',
        'btn.newnote':           'Create new child note',
        'btn.relations':         'Relations from arrows',
        'btn.edit':              'Edit card note',
        'btn.sync':              'Refresh cards from notes',
        'btn.longform':          'Generate longform',
        'btn.flow':              'Generate flow (diagram)',
        'btn.tpl':               'Insert template into canvas',
        'btn.remove':            'Remove card from Canvas',
        'btn.help':              'Help — what each button does',

        /* common */
        'common.no_canvas':      'No active Canvas note.',
        'common.error':          '✗ Error: ',

        /* search / insert note */
        'search.title':          'Insert note into Canvas',
        'search.placeholder':    'Search notes by title…',
        'search.empty':          'No notes found.',
        'search.searching':      'Searching…',
        'search.error':          'Search error: ',
        'search.inserting':      'Inserting card…',
        'search.captured':       '📌 "{title}" captured',
        'search.inserted':       'Card "{title}" inserted!',

        /* new note */
        'newnote.title':         'New child note',
        'newnote.placeholder':   'Note title…',
        'newnote.create':        'Create',
        'newnote.no_title':      'Type a title for the new note.',
        'newnote.created':       '✅ Note "{title}" created and inserted into the canvas.',
        'newnote.error':         'Error creating note: ',

        /* capture mode */
        'capture.no_canvas':     'Open a Canvas to enable capture.',
        'capture.on':            '🎯 Capture mode on — browse your notes.',
        'capture.off':           '⏹ Capture mode off.',
        'capture.banner':        'Capture mode active — every note you click goes into the canvas',

        /* relations */
        'relations.title':       'Detected relations',
        'relations.empty':       'No arrows connecting cards found.',
        'relations.save':        'Save relations',
        'relations.skip':        'Skip (no relation)',
        'relations.none':        'ℹ️ No relation selected.',
        'relations.saved':       '✅ {n} relation(s) saved.',
        'relations.error':       'Error saving relations: ',
        'relations.reading':     'Reading canvas…',
        'relations.no_cards':    'No card with a linked note found in the canvas.',
        'relations.cycle':       '⚠️ Cycle in arrows — ordering by position.',
        'relation.relatedTo':    'Related',
        'relation.inspires':     'Inspires',
        'relation.contradicts':  'Contradicts',
        'relation.supports':     'Supports',
        'relation.precedes':     'Precedes',
        'relation.exemplifies':  'Exemplifies',

        /* remove card */
        'remove.title':          'Remove card from canvas',
        'remove.empty':          'No linked card found.',
        'remove.btn':            'Remove',
        'remove.done':           '🗑️ Card removed from the canvas.',
        'remove.not_found':      'ℹ️ Card not found in the canvas.',
        'remove.error':          'Error removing card: ',
        'cards.list_error':      'Error listing cards: ',

        /* edit card / editor */
        'edit.title':            'Edit card note',
        'edit.btn':              'Edit',
        'editor.title':          'Edit note',
        'editor.save':           'Save',
        'editor.no_note':        'Note not found.',
        'editor.saved':          '✏️ Note saved and card refreshed.',
        'editor.error':          'Error saving: ',

        /* sync */
        'sync.running':          '⟳ Updating cards…',
        'sync.none':             'ℹ️ No linked card in the canvas.',
        'sync.done':             '⟳ {n} card(s) updated.',
        'sync.error':            'Error syncing cards: ',

        /* longform */
        'longform.read_error':   'Error reading canvas: ',
        'longform.error':        'Error generating longform: ',
        'longform.order_arrows': '{arrows} via arrows + {rest} by position',
        'longform.order_pos':    '{n} by position (no arrows detected)',

        /* flow */
        'flow.title':            'Generate flow',
        'flow.direction':        'Direction',
        'flow.tb':               'Vertical (TB)',
        'flow.lr':               'Horizontal (LR)',
        'flow.title_placeholder':'Title (to create a note or save a template)…',
        'flow.generate':         'Draw on canvas',
        'flow.example':          'Example',
        'flow.create_note':      'Create note',
        'flow.template':         'Template',
        'flow.no_nodes':         '⚠️ No nodes defined. Use "ID: Label [type]".',
        'flow.need_title':       '⚠️ Enter the title above to create the note.',
        'flow.generated':        '✅ {n} elements ({nodes} nodes, {layers} layers) — no arrows.',
        'flow.generated_msg':    '🪄 Flow drawn on the canvas.',
        'flow.generate_error':   'Error generating flow: ',
        'flow.note_created':     '✅ Note "{title}" created in "{parent}".',
        'flow.note_created_msg': '🗂️ Flow note created.',
        'flow.note_error':       'Error creating note: ',
        'flow.tpl_saved':        '✅ Template "Template - {name}" saved ({where}).',
        'flow.tpl_saved_msg':    '🧩 Flow template saved.',
        'flow.tpl_error':        'Error saving template: ',
        'flow.where_templates':  'templates folder',
        'flow.where_parent':     'current canvas folder',
        'flow.canvas_missing':   'Canvas note not found.',
        'flow.err.dup':          'Line {n}: duplicate node "{id}".',
        'flow.err.unknown':      'Line {n}: could not parse "{line}". Use "ID: Label [type]" or "ID -> ID : label".',
        'flow.err.from':         'Line {n}: source "{id}" was not defined.',
        'flow.err.to':           'Line {n}: target "{id}" was not defined.',

        /* templates */
        'tpl.title':             'Insert template',
        'tpl.filter':            'Filter templates…',
        'tpl.empty':             'No template found.',
        'tpl.empty_hint':        'No template found. Create a canvas note and tag it #canvasTemplate.',
        'tpl.no_match':          'No template matches the filter.',
        'tpl.loading':           'Loading templates…',
        'tpl.load_error':        'Error loading templates.',
        'tpl.inserting':         'Inserting template…',
        'tpl.inserted':          '🧩 Template "{title}" inserted ({n} elements).',
        'tpl.insert_error':      'Error inserting template: ',
        'tpl.missing':           'Template not found.',
        'tpl.invalid':           'Invalid template.',

        /* help */
        'help.title':            'Help — what each button does',
        'help.foot':             '<b>Esc</b> or click outside closes the panels.',
        'help.insert.name':      'Insert note',
        'help.insert.desc':      'Searches and inserts the note as a card.',
        'help.capture.name':     'Capture mode',
        'help.capture.desc':     'Every note you click becomes a card.',
        'help.newnote.name':     'New note',
        'help.newnote.desc':     'Creates a child note and inserts it as a card.',
        'help.relations.name':   'Relations from arrows',
        'help.relations.desc':   'Detects arrows and saves the relation.',
        'help.edit.name':        'Edit cards',
        'help.edit.desc':        'Opens the editor for the card note.',
        'help.sync.name':        'Refresh cards',
        'help.sync.desc':        'Updates card titles and excerpts.',
        'help.longform.name':    'Longform',
        'help.longform.desc':    'Builds a document in arrow order.',
        'help.flow.name':        'Generate flow',
        'help.flow.desc':        'Text DSL → layered diagram; no arrows.',
        'help.tpl.name':         'Templates',
        'help.tpl.desc':         'Inserts a <b>#canvasTemplate</b> note.',
        'help.remove.name':      'Remove card',
        'help.remove.desc':      'Lists and removes cards from the canvas.',
    },
};

// Ordem das linhas do painel de ajuda (ícone + chaves de nome/descrição)
const CLW_HELP_ITEMS = [
    { ic: '🔗', name: 'help.insert.name',    desc: 'help.insert.desc'    },
    { ic: '🎯', name: 'help.capture.name',   desc: 'help.capture.desc'   },
    { ic: '📝', name: 'help.newnote.name',   desc: 'help.newnote.desc'   },
    { ic: '🕸️', name: 'help.relations.name', desc: 'help.relations.desc' },
    { ic: '✏️', name: 'help.edit.name',      desc: 'help.edit.desc'      },
    { ic: '⟳',  name: 'help.sync.name',      desc: 'help.sync.desc'      },
    { ic: '📄', name: 'help.longform.name',  desc: 'help.longform.desc'  },
    { ic: '🪄', name: 'help.flow.name',      desc: 'help.flow.desc'      },
    { ic: '🧩', name: 'help.tpl.name',       desc: 'help.tpl.desc'       },
    { ic: '🗑️', name: 'help.remove.name',    desc: 'help.remove.desc'    },
];

/** Normaliza o locale do Trilium (ex.: pt_br, en-GB) para um idioma suportado. */
function clwNormalizeLang(locale) {
    return String(locale || '').toLowerCase().startsWith('pt') ? 'pt' : 'en';
}

/** Traduz uma chave. Fallback: idioma → EN → PT → a própria chave. Interpola {vars}. */
function clwTranslate(lang, key, vars) {
    const dict = CLW_I18N[lang] || CLW_I18N.en;
    let s = dict[key];
    if (s === undefined) s = CLW_I18N.pt[key];
    if (s === undefined) return key;
    if (vars) {
        for (const k of Object.keys(vars)) s = s.split('{' + k + '}').join(String(vars[k]));
    }
    return s;
}
// ── I18N (fim) ──────────────────────────────────────────

const CLW_BE_INSERT = (canvasNoteId, linkedNoteId, title, excerpt, cfg, cleanPatterns, L) => {
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
                if (!canvasNote) throw new Error(L.canvasMissing + ' (' + canvasNoteId + ')');

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
            };

const CLW_BE_TPL = (canvasNoteId, templateNoteId, margin, L) => {
                const canvasNote = api.getNote(canvasNoteId);
                if (!canvasNote) throw new Error(L.canvasMissing);
                const templateNote = api.getNote(templateNoteId);
                if (!templateNote) throw new Error(L.tplMissing);

                let canvasData;
                try { canvasData = JSON.parse(canvasNote.getContent() || '{}'); } catch (_) { canvasData = {}; }
                if (!canvasData.type)     canvasData.type     = 'excalidraw';
                if (!canvasData.version)  canvasData.version  = 2;
                if (!canvasData.elements) canvasData.elements = [];

                let templateData;
                try { templateData = JSON.parse(templateNote.getContent() || '{}'); } catch (_) { throw new Error(L.tplInvalid); }
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
            };

const CLW_BE_FLOW = (canvasNoteId, newEls, margin, L) => {
                const canvasNote = api.getNote(canvasNoteId);
                if (!canvasNote) throw new Error(L.canvasMissing);
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
            };

const CLW_BE_CARDS = (canvasNoteId, L) => {
                const note = api.getNote(canvasNoteId);
                if (!note) throw new Error(L.canvasMissing);
                let data;
                try { data = JSON.parse(note.getContent() || '{}'); } catch (_) { data = {}; }
                return (data.elements || [])
                    .filter(e => !e.isDeleted && e.type === 'rectangle' && e.link?.startsWith('#root/'))
                    .map(e => {
                        const noteId = e.link.replace('#root/', '');
                        const linked = api.getNote(noteId);
                        return { noteId, title: linked?.title || noteId };
                    });
            };

const CLW_BE_NEWNOTE = (canvasNoteId, title) => {
                const result = api.createNewNote({
                    parentNoteId: canvasNoteId, title,
                    content: '', type: 'text',
                });
                return result.note.noteId;
            };

const CLW_BE_SYNC = (canvasNoteId, noteId, cfg, cleanPatterns) => {
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
        };

const CLW_BE_EDITOR_LOAD = (noteId) => {
            const n = api.getNote(noteId);
            if (!n) return null;
            return { title: n.title, content: n.getContent() || '' };
        };

const CLW_BE_EDITOR_SAVE = (noteId, title, content) => {
                const n = api.getNote(noteId);
                if (!n) return;
                n.title = title;
                n.setContent(content);
            };

const CLW_BE_REMOVE = (canvasNoteId, targetNoteId, L) => {
                const canvasNote = api.getNote(canvasNoteId);
                if (!canvasNote) throw new Error(L.canvasMissing);
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
            };

const CLW_BE_REL_PAIRS = (canvasNoteId, L) => {
                const note = api.getNote(canvasNoteId);
                if (!note) throw new Error(L.canvasMissing);
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
            };

const CLW_BE_REL_SAVE = (canvasNoteId, relations) => {
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
            };

const CLW_BE_LONGFORM = (canvasNoteId, noteIds, canvasTitle) => {
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
            };

/* ============================================================
 * CANVAS MOBILE (v9) — diálogo acionado por nota launcher
 *
 * Ações: 🪄 Fluxo · 🧩 Templates · 🔗 Inserir · 🛠️ Mais
 *   (Mais: nova nota, sincronizar, longform, editar card, remover card, relações)
 *
 * Depende do bloco gerado antes deste arquivo:
 *   - engine: CARD_CONFIG, FLOW_CONFIG, RELATION_TYPES, getCleanPatterns,
 *             flowDefaultSpec, parseFlowSpec, buildFlowElements, clwOrdenarCards,
 *             relationOptionsHtml, escapeHtml
 *   - i18n:   CLW_I18N, clwNormalizeLang, clwTranslate
 *   - backends: CLW_BE_* (INSERT, TPL, FLOW, CARDS, NEWNOTE, SYNC,
 *               EDITOR_LOAD, EDITOR_SAVE, REMOVE, REL_PAIRS, REL_SAVE, LONGFORM)
 *
 * Roda SEM api.$container (scripts de launcher não têm container) — o diálogo
 * vai para document.body e o CSS é escopado em #clwm-root.
 * ============================================================ */

(function () {
    const CAP = (typeof window !== 'undefined' && window.Capacitor) || null;
    const nativo = !!(CAP && typeof CAP.isNativePlatform === 'function' && CAP.isNativePlatform());

    let lang = clwNormalizeLang(navigator.language);
    const t = (key, vars) => clwTranslate(lang, key, vars);

    function backendLabels() {
        return {
            canvasMissing:  t('flow.canvas_missing'),
            tplMissing:     t('tpl.missing'),
            tplInvalid:     t('tpl.invalid'),
            whereParent:    t('flow.where_parent'),
            whereTemplates: t('flow.where_templates'),
        };
    }

    function canvasAtivo() {
        const nota = api.getActiveContextNote ? api.getActiveContextNote() : null;
        return (nota && nota.type === 'canvas') ? nota : null;
    }

    function status(msg) {
        const el = document.getElementById('clwm-status');
        if (el) el.textContent = String(msg || '');
    }

    function info() {
        const nota = canvasAtivo();
        const el = document.getElementById('clwm-info');
        if (!el) return;
        el.textContent = nota
            ? '🎨 ' + (nota.title || nota.noteId)
            : '⚠️ ' + t('common.no_canvas');
        el.style.opacity = nota ? '.8' : '1';
    }

    const CSS = `
      #clwm-root, #clwm-root * { box-sizing: border-box; }
      #clwm-root {
        position: fixed; inset: 0; z-index: 10000;
        display: flex; align-items: center; justify-content: center;
        background: rgba(0,0,0,.45); padding: 10px;
      }
      #clwm-root .clwm-box {
        background: var(--main-background-color, #fff);
        color: var(--main-text-color, #222);
        width: min(96vw, 540px); max-height: 92vh;
        display: flex; flex-direction: column;
        border-radius: 12px; border: 1px solid var(--main-border-color, #ccc);
        box-shadow: 0 12px 40px rgba(0,0,0,.35); overflow: hidden;
      }
      #clwm-root .clwm-head {
        display: flex; align-items: center; gap: 8px;
        padding: 12px 14px; border-bottom: 1px solid var(--main-border-color, #ccc);
      }
      #clwm-root .clwm-head h2 { margin: 0; font-size: 15px; flex: 1; }
      #clwm-root .clwm-x {
        border: none; background: transparent; color: inherit;
        font-size: 18px; padding: 4px 8px; cursor: pointer;
      }
      #clwm-root .clwm-info {
        padding: 8px 14px 0; font-family: monospace; font-size: 11px;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      #clwm-root .clwm-tabs { display: flex; gap: 5px; padding: 10px 14px 0; }
      #clwm-root .clwm-tab {
        flex: 1; padding: 10px 4px; font-size: 12px; border-radius: 8px;
        border: 1px solid var(--main-border-color, #ccc);
        background: transparent; color: inherit; cursor: pointer;
      }
      #clwm-root .clwm-tab.ativo {
        background: var(--active-item-background-color, #ddd);
        font-weight: bold;
      }
      #clwm-root .clwm-body { padding: 12px 14px; overflow: auto; }
      #clwm-root .clwm-painel { display: none; }
      #clwm-root .clwm-painel.ativo { display: block; }

      #clwm-root textarea, #clwm-root input[type=text], #clwm-root select {
        width: 100%; padding: 10px; font-size: 14px; border-radius: 8px;
        border: 1px solid var(--main-border-color, #ccc);
        background: var(--main-background-color, #fff); color: inherit;
        font-family: monospace;
      }
      #clwm-root textarea { min-height: 150px; resize: vertical; }
      #clwm-root select { font-family: inherit; }

      #clwm-root .clwm-btn {
        display: block; width: 100%; margin-top: 10px; padding: 12px;
        font-size: 14px; border-radius: 8px; font-weight: bold;
        border: 1px solid var(--main-border-color, #ccc);
        background: var(--button-background-color, var(--accented-background-color, #f0f0f0));
        color: var(--button-text-color, var(--main-text-color, inherit));
        cursor: pointer; text-align: left;
      }
      #clwm-root .clwm-btn:active { filter: brightness(.92); }
      #clwm-root .clwm-btn-sec { font-weight: normal; opacity: .85; }

      #clwm-root .clwm-lista { margin-top: 10px; display: flex; flex-direction: column; gap: 6px; }
      #clwm-root .clwm-item {
        padding: 12px; font-size: 14px; text-align: left; border-radius: 8px;
        border: 1px solid var(--main-border-color, #ccc);
        background: transparent; color: inherit; cursor: pointer;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      #clwm-root .clwm-item:active {
        background: var(--hover-item-background-color, rgba(128,128,128,.15));
      }
      #clwm-root .clwm-item.perigo { border-color: #e78284; color: #e78284; }
      #clwm-root .clwm-vazio { font-family: monospace; font-size: 12px; opacity: .6; padding: 6px 2px; }
      #clwm-root .clwm-status {
        padding: 10px 14px; font-family: monospace; font-size: 12px;
        border-top: 1px solid var(--main-border-color, #ccc);
        white-space: pre-wrap; word-break: break-word; min-height: 1.2em;
      }

      /* editor */
      #clwm-root .clwm-ed-conteudo {
        min-height: 220px; max-height: 45vh; overflow-y: auto; margin-top: 8px;
        padding: 10px 12px; border-radius: 8px;
        border: 1px solid var(--main-border-color, #ccc);
        background: var(--main-background-color, #fff); color: inherit;
        font-size: 14px; line-height: 1.6; outline: none;
      }
      #clwm-root .clwm-ed-conteudo img { max-width: 100%; }

      /* relações */
      #clwm-root .clwm-rel {
        margin-top: 10px; padding: 10px; border-radius: 8px;
        border: 1px solid var(--main-border-color, #ccc);
      }
      #clwm-root .clwm-rel-titulo { font-size: 13px; margin-bottom: 8px; }
      #clwm-root .clwm-rel-seta { font-family: monospace; font-size: 11px; opacity: .6; }
    `;

    /* ── Templates (#canvasTemplate) ─────────────────────── */
    let templates = null;

    async function carregarTemplates() {
        if (templates) return templates;
        templates = await api.runOnBackend(() => api.searchForNotes('#canvasTemplate')
            .map((n) => ({ noteId: n.noteId, title: n.title })));
        return templates;
    }

    function renderTemplates() {
        const lista = document.getElementById('clwm-tpl-lista');
        if (!lista) return;
        const filtro = (document.getElementById('clwm-tpl-filtro').value || '').trim().toLowerCase();
        const todos = templates || [];
        const itens = filtro ? todos.filter((x) => (x.title || '').toLowerCase().includes(filtro)) : todos;

        lista.innerHTML = '';
        if (!itens.length) {
            const d = document.createElement('div');
            d.className = 'clwm-vazio';
            d.textContent = todos.length ? t('tpl.no_match') : t('tpl.empty_hint');
            lista.appendChild(d);
            return;
        }

        for (const tpl of itens) {
            const b = document.createElement('button');
            b.className = 'clwm-item';
            b.textContent = '🧩 ' + (tpl.title || tpl.noteId);
            b.addEventListener('click', () => inserirTemplate(tpl.noteId, tpl.title));
            lista.appendChild(b);
        }
    }

    async function abrirTemplates() {
        const lista = document.getElementById('clwm-tpl-lista');
        if (!templates && lista) lista.innerHTML = '<div class="clwm-vazio">…</div>';
        try {
            await carregarTemplates();
            renderTemplates();
        } catch (e) {
            status('❌ ' + ((e && e.message) || e));
        }
    }

    /* ── Lista de cards (rect com link) ──────────────────── */
    async function listarCards(canvasNoteId) {
        return await api.runOnBackend(CLW_BE_CARDS, [canvasNoteId, backendLabels()]);
    }

    /* ── Ações principais ────────────────────────────────── */
    async function gerarFluxo() {
        const nota = canvasAtivo();
        if (!nota) { status('⚠️ ' + t('common.no_canvas')); return; }

        const spec = document.getElementById('clwm-dsl').value || '';
        const dir = document.getElementById('clwm-dir').value === 'LR' ? 'LR' : 'TB';
        const parsed = parseFlowSpec(spec, t);

        if (parsed.errors.length) { status('⚠️ ' + parsed.errors.slice(0, 3).join(' ')); return; }
        if (!parsed.nodes.length) { status('⚠️ ' + t('flow.no_nodes')); return; }

        status('🪄 ' + t('flow.generate') + '…');
        try {
            const { elements, layers } = buildFlowElements(parsed.nodes, parsed.edges, dir, { x: 0, y: 0 });
            const n = await api.runOnBackend(CLW_BE_FLOW, [nota.noteId, elements, FLOW_CONFIG.marginX, backendLabels()]);
            status(t('flow.generated', { n, nodes: parsed.nodes.length, layers }));
        } catch (e) {
            status('❌ ' + ((e && e.message) || e));
        }
    }

    async function inserirTemplate(templateNoteId, templateTitle) {
        const nota = canvasAtivo();
        if (!nota) { status('⚠️ ' + t('common.no_canvas')); return; }
        status(t('tpl.inserting'));
        try {
            const n = await api.runOnBackend(CLW_BE_TPL, [nota.noteId, templateNoteId, FLOW_CONFIG.marginX, backendLabels()]);
            status(t('tpl.inserted', { title: templateTitle, n }));
        } catch (e) {
            status('❌ ' + t('tpl.insert_error') + ((e && e.message) || e));
        }
    }

    async function inserirCard(noteId, title) {
        const nota = canvasAtivo();
        if (!nota) { status('⚠️ ' + t('common.no_canvas')); return; }
        status(t('search.inserting'));
        try {
            await api.runOnBackend(CLW_BE_INSERT, [nota.noteId, noteId, title || '', '', CARD_CONFIG, getCleanPatterns(), backendLabels()]);
            status(t('search.inserted', { title: title || noteId }));
        } catch (e) {
            status('❌ ' + ((e && e.message) || e));
        }
    }

    async function buscarNotas() {
        const termo = (document.getElementById('clwm-busca').value || '').trim();
        if (!termo) return;
        const lista = document.getElementById('clwm-busca-lista');
        lista.innerHTML = '<div class="clwm-vazio">…</div>';
        try {
            const notas = await api.searchForNotes(termo);
            lista.innerHTML = '';
            if (!notas.length) {
                const d = document.createElement('div');
                d.className = 'clwm-vazio';
                d.textContent = '—';
                lista.appendChild(d);
                return;
            }
            for (const n of notas.slice(0, 20)) {
                const b = document.createElement('button');
                b.className = 'clwm-item';
                b.textContent = '🔗 ' + (n.title || n.noteId);
                b.addEventListener('click', () => inserirCard(n.noteId, n.title));
                lista.appendChild(b);
            }
        } catch (e) {
            lista.innerHTML = '';
            status('❌ ' + ((e && e.message) || e));
        }
    }

    /* ── Mais: sub-painéis ───────────────────────────────── */
    function subPainel(html) {
        const menu = document.getElementById('clwm-mais-menu');
        const sub  = document.getElementById('clwm-mais-sub');
        if (!menu || !sub) return;
        menu.style.display = 'none';
        sub.style.display = 'block';
        document.getElementById('clwm-sub-conteudo').innerHTML = html || '';
    }

    function voltarMenu() {
        const menu = document.getElementById('clwm-mais-menu');
        const sub  = document.getElementById('clwm-mais-sub');
        if (!menu || !sub) return;
        sub.style.display = 'none';
        document.getElementById('clwm-sub-conteudo').innerHTML = '';
        menu.style.display = 'block';
    }

    /* ── Mais: nova nota ─────────────────────────────────── */
    async function criarNota() {
        const nota = canvasAtivo();
        if (!nota) { status('⚠️ ' + t('common.no_canvas')); return; }

        const input = document.getElementById('clwm-nova-titulo');
        const titulo = (input.value || '').trim();
        if (!titulo) { status('⚠️ ' + t('newnote.no_title')); input.focus(); return; }

        status('📝 …');
        try {
            const novoId = await api.runOnBackend(CLW_BE_NEWNOTE, [nota.noteId, titulo]);
            await api.runOnBackend(CLW_BE_INSERT, [nota.noteId, novoId, titulo, '', CARD_CONFIG, getCleanPatterns(), backendLabels()]);
            input.value = '';
            status(t('newnote.created', { title: titulo }));
        } catch (e) {
            status('❌ ' + t('newnote.error') + ((e && e.message) || e));
        }
    }

    /* ── Mais: sincronizar cards ─────────────────────────── */
    async function sincronizar() {
        const nota = canvasAtivo();
        if (!nota) { status('⚠️ ' + t('common.no_canvas')); return; }

        status(t('sync.running'));
        try {
            const cards = await listarCards(nota.noteId);
            if (!cards.length) { status('ℹ️ ' + t('sync.none')); return; }
            let n = 0;
            for (const c of cards) {
                n += await api.runOnBackend(CLW_BE_SYNC, [nota.noteId, c.noteId, CARD_CONFIG, getCleanPatterns()]);
            }
            status(t('sync.done', { n }));
        } catch (e) {
            status('❌ ' + t('sync.error') + ((e && e.message) || e));
        }
    }

    /* ── Mais: longform ──────────────────────────────────── */
    async function criarLongform() {
        const nota = canvasAtivo();
        if (!nota) { status('⚠️ ' + t('common.no_canvas')); return; }

        status(t('relations.reading'));
        try {
            const comp = await nota.getNoteComplement();
            const data = JSON.parse(comp.content || '{}');
            const elements = (data.elements || []).filter((e) => !e.isDeleted);

            const cardMap = {};
            const cardPos = {};
            elements.forEach((el) => {
                if (el.type === 'rectangle' && el.link?.startsWith('#root/')) {
                    cardMap[el.id] = el.link.replace('#root/', '');
                    cardPos[el.id] = { x: el.x || 0, y: el.y || 0 };
                }
            });

            if (!Object.keys(cardMap).length) { status('⚠️ ' + t('relations.no_cards')); return; }

            const { noteIds, arrowCount, ordenados, restantes } = clwOrdenarCards(elements, cardMap, cardPos);
            if (arrowCount > 0 && ordenados === 0) status('ℹ️ ' + t('relations.cycle'));

            await api.runOnBackend(CLW_BE_LONGFORM, [nota.noteId, noteIds, nota.title || 'Canvas']);

            const orderSource = arrowCount > 0 && ordenados > 0
                ? t('longform.order_arrows', { arrows: ordenados, rest: restantes })
                : t('longform.order_pos', { n: noteIds.length });
            status('✅ Longform: ' + orderSource);
        } catch (e) {
            status('❌ ' + ((e && e.message) || e));
        }
    }

    /* ── Mais: editar card ───────────────────────────────── */
    async function abrirEditar() {
        const nota = canvasAtivo();
        if (!nota) { status('⚠️ ' + t('common.no_canvas')); return; }

        subPainel('<div class="clwm-vazio">…</div>');
        try {
            const cards = await listarCards(nota.noteId);
            const div = document.getElementById('clwm-sub-conteudo');
            div.innerHTML = '';
            if (!cards.length) { div.innerHTML = '<div class="clwm-vazio">' + t('relations.no_cards') + '</div>'; return; }
            for (const c of cards) {
                const b = document.createElement('button');
                b.className = 'clwm-item';
                b.textContent = '✏️ ' + (c.title || c.noteId);
                b.addEventListener('click', () => abrirEditorCard(nota.noteId, c.noteId));
                div.appendChild(b);
            }
        } catch (e) {
            status('❌ ' + t('cards.list_error') + ((e && e.message) || e));
            voltarMenu();
        }
    }

    async function abrirEditorCard(canvasNoteId, noteId) {
        try {
            const dados = await api.runOnBackend(CLW_BE_EDITOR_LOAD, [noteId]);
            if (!dados) { status('⚠️ ' + t('editor.no_note')); return; }

            const div = document.getElementById('clwm-sub-conteudo');
            div.innerHTML = `
                <input type="text" id="clwm-ed-titulo" value="${escapeHtml(dados.title || '')}" autocomplete="off">
                <div class="clwm-ed-conteudo" id="clwm-ed-conteudo" contenteditable="true" spellcheck="false">${dados.content || ''}</div>
                <button class="clwm-btn" id="clwm-ed-salvar">💾 ${escapeHtml(t('editor.save'))}</button>`;

            document.getElementById('clwm-ed-salvar').addEventListener('click', async () => {
                const titulo = (document.getElementById('clwm-ed-titulo').value || '').trim() || 'Sem título';
                const conteudo = document.getElementById('clwm-ed-conteudo').innerHTML;
                status('💾 …');
                try {
                    await api.runOnBackend(CLW_BE_EDITOR_SAVE, [noteId, titulo, conteudo]);
                    await api.runOnBackend(CLW_BE_SYNC, [canvasNoteId, noteId, CARD_CONFIG, getCleanPatterns()]);
                    status(t('editor.saved'));
                    voltarMenu();
                } catch (e) {
                    status('❌ ' + t('editor.error') + ((e && e.message) || e));
                }
            });
        } catch (e) {
            status('❌ ' + ((e && e.message) || e));
        }
    }

    /* ── Mais: remover card ──────────────────────────────── */
    async function abrirRemover() {
        const nota = canvasAtivo();
        if (!nota) { status('⚠️ ' + t('common.no_canvas')); return; }

        subPainel('<div class="clwm-vazio">…</div>');
        try {
            const cards = await listarCards(nota.noteId);
            const div = document.getElementById('clwm-sub-conteudo');
            div.innerHTML = '';
            if (!cards.length) { div.innerHTML = '<div class="clwm-vazio">' + t('relations.no_cards') + '</div>'; return; }

            for (const c of cards) {
                const b = document.createElement('button');
                b.className = 'clwm-item perigo';
                b.textContent = '🗑️ ' + (c.title || c.noteId);
                let confirmando = false;
                b.addEventListener('click', async () => {
                    if (!confirmando) {
                        confirmando = true;
                        b.textContent = '⚠️ ' + t('remove.title') + '?';
                        setTimeout(() => { if (confirmando) { confirmando = false; b.textContent = '🗑️ ' + (c.title || c.noteId); } }, 3000);
                        return;
                    }
                    try {
                        const n = await api.runOnBackend(CLW_BE_REMOVE, [nota.noteId, c.noteId, backendLabels()]);
                        status(n > 0 ? t('remove.done') : t('remove.not_found'));
                        b.remove();
                    } catch (e) {
                        status('❌ ' + t('remove.error') + ((e && e.message) || e));
                    }
                });
                div.appendChild(b);
            }
        } catch (e) {
            status('❌ ' + t('cards.list_error') + ((e && e.message) || e));
            voltarMenu();
        }
    }

    /* ── Mais: relações por seta ─────────────────────────── */
    async function abrirRelacoes() {
        const nota = canvasAtivo();
        if (!nota) { status('⚠️ ' + t('common.no_canvas')); return; }

        subPainel('<div class="clwm-vazio">…</div>');
        try {
            const { pairs: pares } = await api.runOnBackend(CLW_BE_REL_PAIRS, [nota.noteId, backendLabels()]);
            const div = document.getElementById('clwm-sub-conteudo');
            div.innerHTML = '';
            if (!pares.length) { div.innerHTML = '<div class="clwm-vazio">' + t('relations.empty') + '</div>'; return; }

            const opcoes = relationOptionsHtml(t);

            pares.forEach((p, i) => {
                const bloco = document.createElement('div');
                bloco.className = 'clwm-rel';
                bloco.innerHTML = `
                    <div class="clwm-rel-titulo">${escapeHtml(p.fromTitle)} → ${escapeHtml(p.toTitle)}</div>
                    ${p.arrowText ? `<div class="clwm-rel-seta">“${escapeHtml(p.arrowText)}”</div>` : ''}
                    <select id="clwm-rel-sel-${i}" data-from="${p.fromNoteId}" data-to="${p.toNoteId}" data-textel="${p.arrowTextElId || ''}">${opcoes}</select>`;
                div.appendChild(bloco);

                if (p.arrowText) {
                    const low = p.arrowText.toLowerCase().trim();
                    const achou = RELATION_TYPES.find((r) => r.value === low || t(r.labelKey).toLowerCase() === low);
                    if (achou) bloco.querySelector('select').value = achou.value;
                }
            });

            const salvar = document.createElement('button');
            salvar.className = 'clwm-btn';
            salvar.textContent = '💾 ' + t('relations.save');
            salvar.addEventListener('click', async () => {
                const relations = [];
                pares.forEach((p, i) => {
                    const sel = document.getElementById('clwm-rel-sel-' + i);
                    if (!sel || sel.value === 'none') return;
                    const rel = RELATION_TYPES.find((r) => r.value === sel.value);
                    relations.push({
                        fromNoteId: p.fromNoteId,
                        toNoteId:   p.toNoteId,
                        relType:    sel.value,
                        textElId:   p.arrowTextElId || '',
                        newText:    p.arrowTextElId && rel ? rel.label : '',
                    });
                });
                if (!relations.length) { status('ℹ️ ' + t('relations.none')); return; }
                try {
                    const n = await api.runOnBackend(CLW_BE_REL_SAVE, [nota.noteId, relations]);
                    status(t('relations.saved', { n }));
                    voltarMenu();
                } catch (e) {
                    status('❌ ' + t('relations.error') + ((e && e.message) || e));
                }
            });
            div.appendChild(salvar);
        } catch (e) {
            status('❌ ' + ((e && e.message) || e));
            voltarMenu();
        }
    }

    /* ── Diálogo ─────────────────────────────────────────── */
    function remover() {
        const el = document.getElementById('clwm-root');
        if (el) el.remove();
    }

    function abrir() {
        remover();

        const root = document.createElement('div');
        root.id = 'clwm-root';
        root.innerHTML = `
            <style>${CSS}</style>
            <div class="clwm-box">
                <div class="clwm-head">
                    <h2>🎨 Canvas Mobile</h2>
                    <button class="clwm-x" id="clwm-fechar">✖</button>
                </div>
                <div class="clwm-info" id="clwm-info"></div>
                <div class="clwm-tabs">
                    <button class="clwm-tab ativo" data-painel="fluxo">🪄 Fluxo</button>
                    <button class="clwm-tab" data-painel="tpl">🧩 Templates</button>
                    <button class="clwm-tab" data-painel="inserir">🔗 Inserir</button>
                    <button class="clwm-tab" data-painel="mais">🛠️ Mais</button>
                </div>
                <div class="clwm-body">
                    <div class="clwm-painel ativo" id="clwm-p-fluxo">
                        <textarea id="clwm-dsl" spellcheck="false"></textarea>
                        <div style="display:flex;align-items:center;gap:8px;margin-top:10px">
                            <label style="font-size:13px">${escapeHtml(t('flow.direction'))}</label>
                            <select id="clwm-dir">
                                <option value="TB">${escapeHtml(t('flow.tb'))}</option>
                                <option value="LR">${escapeHtml(t('flow.lr'))}</option>
                            </select>
                        </div>
                        <button class="clwm-btn" id="clwm-gerar">🪄 ${escapeHtml(t('flow.generate'))}</button>
                    </div>
                    <div class="clwm-painel" id="clwm-p-tpl">
                        <input type="text" id="clwm-tpl-filtro" placeholder="${escapeHtml(t('tpl.filter'))}" autocomplete="off">
                        <div class="clwm-lista" id="clwm-tpl-lista"></div>
                    </div>
                    <div class="clwm-painel" id="clwm-p-inserir">
                        <input type="text" id="clwm-busca" placeholder="${escapeHtml(t('search.title'))}" autocomplete="off">
                        <button class="clwm-btn" id="clwm-buscar">🔍 ${escapeHtml(t('btn.insert'))}</button>
                        <div class="clwm-lista" id="clwm-busca-lista"></div>
                    </div>
                    <div class="clwm-painel" id="clwm-p-mais">
                        <div id="clwm-mais-menu">
                            <input type="text" id="clwm-nova-titulo" placeholder="${escapeHtml(t('newnote.placeholder'))}" autocomplete="off">
                            <button class="clwm-btn" id="clwm-nova-criar">📝 ${escapeHtml(t('newnote.create'))}</button>
                            <button class="clwm-btn" id="clwm-sync">⟳ ${escapeHtml(t('btn.sync'))}</button>
                            <button class="clwm-btn" id="clwm-longform">📄 ${escapeHtml(t('btn.longform'))}</button>
                            <button class="clwm-btn" id="clwm-ir-editar">✏️ ${escapeHtml(t('editor.title'))}</button>
                            <button class="clwm-btn" id="clwm-ir-remover">🗑️ ${escapeHtml(t('remove.title'))}</button>
                            <button class="clwm-btn" id="clwm-ir-relacoes">🕸️ ${escapeHtml(t('relations.title'))}</button>
                        </div>
                        <div id="clwm-mais-sub" style="display:none">
                            <button class="clwm-btn clwm-btn-sec" id="clwm-voltar">‹ Voltar</button>
                            <div id="clwm-sub-conteudo"></div>
                        </div>
                    </div>
                </div>
                <div class="clwm-status" id="clwm-status"></div>
            </div>`;

        document.body.appendChild(root);

        // idioma da interface do Trilium (assíncrono; refaz a UI se divergir)
        api.runOnBackend(() => {
            const opt = api.getOption('locale');
            return opt ? opt.value : null;
        }).then((locale) => {
            const novo = clwNormalizeLang(locale || navigator.language);
            if (novo !== lang) { lang = novo; abrir(); }
        }).catch(() => undefined);

        // conteúdo inicial
        const dsl = document.getElementById('clwm-dsl');
        dsl.value = flowDefaultSpec(lang);

        info();

        // eventos
        document.getElementById('clwm-fechar').addEventListener('click', remover);
        root.addEventListener('click', (e) => { if (e.target === root) remover(); });

        root.querySelectorAll('.clwm-tab').forEach((b) => {
            b.addEventListener('click', () => {
                root.querySelectorAll('.clwm-tab').forEach((x) => x.classList.toggle('ativo', x === b));
                root.querySelectorAll('.clwm-painel').forEach((p) => {
                    p.classList.toggle('ativo', p.id === 'clwm-p-' + b.dataset.painel);
                });
                if (b.dataset.painel === 'tpl') abrirTemplates();
                if (b.dataset.painel !== 'mais') voltarMenu();
            });
        });

        document.getElementById('clwm-gerar').addEventListener('click', gerarFluxo);
        document.getElementById('clwm-buscar').addEventListener('click', buscarNotas);
        document.getElementById('clwm-busca').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') buscarNotas();
        });
        document.getElementById('clwm-tpl-filtro').addEventListener('input', renderTemplates);

        document.getElementById('clwm-nova-criar').addEventListener('click', criarNota);
        document.getElementById('clwm-sync').addEventListener('click', sincronizar);
        document.getElementById('clwm-longform').addEventListener('click', criarLongform);
        document.getElementById('clwm-ir-editar').addEventListener('click', abrirEditar);
        document.getElementById('clwm-ir-remover').addEventListener('click', abrirRemover);
        document.getElementById('clwm-ir-relacoes').addEventListener('click', abrirRelacoes);
        document.getElementById('clwm-voltar').addEventListener('click', voltarMenu);
    }

    abrir();
})();

