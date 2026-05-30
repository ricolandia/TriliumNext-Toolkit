// #run=frontendStartup
// Pillifica os atributos da list view do TriliumNext. Precisa ter o CSS também aplicado( código está no CSS Interno de polimento.

const OCULTOS = new Set(['subtreeHidden', 'color', 'iconClass', 'viewType']);

function parsePills(el) {
  if (el.dataset.pillified === '1') return;
  el.dataset.pillified = '1';

  const pills = [];
  let pendente = null;

  for (const node of el.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      for (const part of node.textContent.split(/\s+/).filter(Boolean)) {
        if (pendente) { pills.push(pendente); pendente = null; }

        if (part.endsWith('=')) {
          pendente = { type: 'relation', prefix: part, link: null };
        } else {
          pills.push({
            type: part.startsWith('~') ? 'relation' : 'label',
            prefix: part,
            link: null
          });
        }
      }
    } else if (node.tagName === 'A') {
      if (pendente) {
        pendente.link = node.cloneNode(true);
        pills.push(pendente);
        pendente = null;
      } else {
        pills.push({ type: 'relation', prefix: '~', link: node.cloneNode(true) });
      }
    }
  }
  if (pendente) pills.push(pendente);

  el.innerHTML = '';

  for (const pill of pills) {
    const nome = (pill.prefix || '').replace(/^[~#]/, '').replace(/=$/, '');
    if (OCULTOS.has(nome)) continue;

    const span = document.createElement('span');
    span.className = `attr-pill attr-pill-${pill.type}`;

    if (pill.link) {
      span.appendChild(document.createTextNode(pill.prefix));
      span.appendChild(pill.link);
    } else {
      span.textContent = pill.prefix;
    }
    el.appendChild(span);
  }
}

function processarTodos() {
  document.querySelectorAll('.rendered-note-attributes:not([data-pillified])').forEach(parsePills);
}

processarTodos();

new MutationObserver(mutations => {
  for (const m of mutations) {
    m.addedNodes.forEach(node => {
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      if (node.matches?.('.rendered-note-attributes')) parsePills(node);
      node.querySelectorAll?.('.rendered-note-attributes:not([data-pillified])').forEach(parsePills);
    });
  }
}).observe(document.body, { childList: true, subtree: true });