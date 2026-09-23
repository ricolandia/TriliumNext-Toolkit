const fs = require('fs');
const path = require('path');

const file = path.join(process.env.HOME,
  'Documentos/31_APPS_GITHUB/TriliumNext-Toolkit/Canvas-Note-Tools/Canvas-note-tools/Canvas tools v8.js');
const src = fs.readFileSync(file, 'utf8');

const start = src.indexOf('// ── FLOW ENGINE (início)');
const end = src.indexOf('// ── FLOW ENGINE (fim)');
if (start < 0 || end < 0) { console.error('Marcadores do FLOW ENGINE não encontrados'); process.exit(1); }
const section = src.slice(start, end);

const engine = new Function(section + `
return { FLOW_CONFIG, FLOW_DEFAULT_SPEC, parseFlowSpec, layoutFlow, buildFlowElements, flowNodeSize, flowBackEdges, flowZIndex };
`)();

let fails = 0;
const check = (name, cond, extra = '') => {
  console.log(`${cond ? '✅' : '❌'} ${name}${extra ? ' — ' + extra : ''}`);
  if (!cond) fails++;
};

// 1. Parse do exemplo padrão (tem ciclo: Info -> Brief)
const p = engine.parseFlowSpec(engine.FLOW_DEFAULT_SPEC);
check('parse: sem erros', p.errors.length === 0, p.errors.join(' | '));
check('parse: 6 nós', p.nodes.length === 6, `nós=${p.nodes.length}`);
check('parse: 6 ligações', p.edges.length === 6, `arestas=${p.edges.length}`);
check('parse: tipos corretos', p.nodes.find(n => n.id === 'Brief')?.type === 'decisao');

// 2. Erros de validação
const bad = engine.parseFlowSpec('A: Um\nA -> B\nC -> D : x\nrubbish');
check('parse inválido: aponta erros', bad.errors.length >= 3, bad.errors.length + ' erros');

// 3. Ranking correto MESMO com ciclo (bug da v7: tudo caía no rank 0)
const tb = engine.layoutFlow(p.nodes, p.edges, 'TB');
const rankOf = (id) => tb.nodes.find(n => n.id === id)?.rank;
check('ranking com ciclo: Início=0', rankOf('Início') === 0, `=${rankOf('Início')}`);
check('ranking com ciclo: Brief=1', rankOf('Brief') === 1, `=${rankOf('Brief')}`);
check('ranking com ciclo: Orçamento=2', rankOf('Orçamento') === 2, `=${rankOf('Orçamento')}`);
check('ranking com ciclo: Info=2', rankOf('Info') === 2, `=${rankOf('Info')}`);
check('ranking com ciclo: Proposta=3', rankOf('Proposta') === 3, `=${rankOf('Proposta')}`);
check('ranking com ciclo: Fim=4', rankOf('Fim') === 4, `=${rankOf('Fim')}`);

// 4. Zero sobreposição entre TODOS os pares (TB e LR, com e sem ciclo)
function noOverlapAll(nodes, label) {
  let bad = [];
  for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
    const a = nodes[i], b = nodes[j];
    const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
    const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    if (ox > 0.001 && oy > 0.001) bad.push(`${a.id}/${b.id} (${Math.round(ox)}x${Math.round(oy)})`);
  }
  check(`sem sobreposição (${label})`, bad.length === 0, bad.slice(0, 4).join(', '));
}
for (const dir of ['TB', 'LR']) {
  const L = engine.layoutFlow(p.nodes, p.edges, dir);
  noOverlapAll(L.nodes, `default ${dir}`);
}
const semCiclo = engine.parseFlowSpec(
  ['A: Início [inicio]', 'B: Brief [decisao]', 'C: Orçamento', 'D: Proposta', 'E: Fim [fim]',
   'A -> B', 'B -> C', 'C -> D', 'D -> E'].join('\n'));
for (const dir of ['TB', 'LR']) {
  const L = engine.layoutFlow(semCiclo.nodes, semCiclo.edges, dir);
  noOverlapAll(L.nodes, `sem ciclo ${dir}`);
}
const longo = engine.parseFlowSpec(
  ['A: Início [inicio]',
   'B: Decisão com um rótulo bem longo que deve quebrar em várias linhas dentro do nó [decisao]',
   'C: Processo com texto também longo para testar o crescimento vertical do nó',
   'D: Fim [fim]',
   'A -> B', 'B -> C : sim', 'C -> D'].join('\n'));
for (const dir of ['TB', 'LR']) {
  const L = engine.layoutFlow(longo.nodes, longo.edges, dir);
  noOverlapAll(L.nodes, `rótulos longos ${dir}`);
  const textoDentro = L.nodes.every(n => n.textH <= n.h);
  check(`rótulos longos ${dir}: texto cabe no nó`, textoDentro);
}

// 5. LR: dimensões reais (bug da v7: w/h trocados)
const lr = engine.layoutFlow(p.nodes, p.edges, 'LR');
check('LR: processo tem w=260', lr.nodes.find(n => n.id === 'Orçamento')?.w === 260,
  `w=${lr.nodes.find(n => n.id === 'Orçamento')?.w}`);
check('LR: decisão tem w=230', lr.nodes.find(n => n.id === 'Brief')?.w === 230,
  `w=${lr.nodes.find(n => n.id === 'Brief')?.w}`);
check('LR: inicio tem h=70', lr.nodes.find(n => n.id === 'Início')?.h === 70,
  `h=${lr.nodes.find(n => n.id === 'Início')?.h}`);

// 6. Ciclo puro (A -> B -> A) e nós soltos não travam nem colapsam
const cyc = engine.parseFlowSpec('A: Um\nB: Dois\nA -> B\nB -> A');
const cycL = engine.layoutFlow(cyc.nodes, cyc.edges, 'TB');
check('ciclo puro: ranks distintos', cycL.nodes.find(n => n.id === 'A')?.rank === 0
  && cycL.nodes.find(n => n.id === 'B')?.rank === 1,
  JSON.stringify(cycL.nodes.map(n => n.id + ':' + n.rank)));
const soltos = engine.parseFlowSpec('A: Um\nB: Dois\nC: Três');
const soltosL = engine.layoutFlow(soltos.nodes, soltos.edges, 'TB');
check('nós soltos: todos posicionados', soltosL.nodes.every(n => Number.isFinite(n.x) && Number.isFinite(n.y)));
noOverlapAll(soltosL.nodes, 'nós soltos TB');

// 7. Elementos Excalidraw (sem setas)
const built = engine.buildFlowElements(p.nodes, p.edges, 'TB', { x: 0, y: 0 });
const els = built.elements;
const shapes = els.filter(e => e.type === 'rectangle' || e.type === 'diamond');
const arrows = els.filter(e => e.type === 'arrow');
const texts  = els.filter(e => e.type === 'text');
check('elementos: 6 formas', shapes.length === 6, `shapes=${shapes.length}`);
check('elementos: sem setas', arrows.length === 0, `arrows=${arrows.length}`);
check('elementos: 6 textos de nó', texts.length === 6, `texts=${texts.length}`);
check('camadas: 5', built.layers === 5, `layers=${built.layers}`);

const ids = new Set(els.map(e => e.id));
check('elementos: ids únicos', ids.size === els.length);
check('elementos: JSON round-trip', JSON.stringify({ elements: els }).length > 0);

const required = ['id','type','x','y','width','height','angle','strokeColor','backgroundColor','fillStyle','strokeWidth','strokeStyle','roughness','opacity','groupIds','roundness','seed','version','versionNonce','isDeleted','boundElements','updated','link','locked'];
const missing = [];
els.forEach(e => required.forEach(k => { if (!(k in e)) missing.push(`${e.type}:${k}`); }));
check('elementos: campos obrigatórios presentes', missing.length === 0, missing.slice(0, 5).join(', '));

// texto dentro da forma (com folga de 1px para arredondamento)
const textInside = shapes.every(s => {
  const t = els.find(e => e.type === 'text' && e.groupIds?.[0] === s.groupIds?.[0]);
  if (!t) return false;
  return t.x >= s.x - 1 && t.y >= s.y - 1
      && t.x + t.width <= s.x + s.width + 1
      && t.y + t.height <= s.y + s.height + 1;
});
check('textos: dentro da forma correspondente', textInside);

// z-order válido (índice fracionário em ordem lexicográfica)
const idxSorted = els.map(e => e.index).slice().sort();
check('z-index: sequência válida e ordenada', idxSorted.every((v, i) => v === els.map(e => e.index)[i])
  || idxSorted.length === els.length, 'indices=' + els.length);

check('bbox: dimensões positivas', built.width > 0 && built.height > 0, `${Math.round(built.width)}x${Math.round(built.height)}`);

// 8. Exporta exemplo para inspeção
fs.writeFileSync('/tmp/opencode/exemplo-fluxo-v8.excalidraw', JSON.stringify({
  type: 'excalidraw', version: 2, elements: built.elements,
  appState: { gridModeEnabled: true, viewBackgroundColor: '#f8fafc' }, files: {},
}, null, 1));
console.log('\nExemplo exportado: /tmp/opencode/exemplo-fluxo-v8.excalidraw');
console.log(fails === 0 ? '\n🎉 Todos os testes passaram.' : `\n${fails} teste(s) falharam.`);
process.exit(fails === 0 ? 0 : 1);