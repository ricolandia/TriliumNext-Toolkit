// ============================================================
// VISOR FOUNTAIN — TriliumNext Notes
// Estrutura esperada:
//   📄 Visor (esta nota — tipo renderNote)
//     └── 📝 Rascunho (filha — tipo text ou code/plain)
//
// Abra Rascunho e Visor em split view e use ⟳ Atualizar (ou F5)
// no Visor depois de editar o Rascunho.
// Com várias candidatas, o seletor na barra define o rascunho e
// grava a escolha no label #fountainDraft do Visor (também vale
// marcar a própria nota de rascunho com #fountainDraft).
// ============================================================


// ── 1. BIBLIOTECA FOUNTAIN ────────────────────────────────────────────────────
const Fountain = (function () {

    const regex = {
        title_page:            /^((?:title|credit|author[s]?|source|notes|draft date|date|contact|copyright)\:)/gim,
        scene_heading:         /^((?:\*{0,3}_?)?(?:(?:int|ext|est|i\/e)[. ]).+)|^(?:\.(?!\.+))(.+)/i,
        scene_number:          / *#(.+)# */,
        transition:            /^((?:FADE (?:TO BLACK|OUT)|CUT TO BLACK)\.|.+ TO\:)|^(?:> *)(.+)/,
        // \p{Lu} (com /u) reconhece nomes acentuados: JOÃO, ANTÔNIO, LUÍSA…
        dialogue:              /^([\p{Lu}*_]+[0-9\p{Lu} (._\-')]*)(\^?)?(?:\n(?!\n+))([\s\S]+)/u,
        parenthetical:         /^(\(.+\))$/,
        centered:              /^(?:> *)(.+)(?: *<)(\n.+)*/g,
        section:               /^(#+)(?: *)(.*)/,
        synopsis:              /^(?:=(?!=+) *)(.*)/,
        note:                  /^(?:\[{2}(?!\[+))(.+)(?:\]{2}(?!\[+))$/,
        note_inline:           /(?:\[{2}(?!\[+))([\s\S]+?)(?:\]{2}(?!\[+))/g,
        boneyard:              /(^\/\*|^\*\/)$/g,
        page_break:            /^={3,}$/,
        line_break:            /^ {2}$/,
        bold_italic_underline: /(_{1}\*{3}(?=.+\*{3}_{1})|\*{3}_{1}(?=.+_{1}\*{3}))(.+?)(\*{3}_{1}|_{1}\*{3})/g,
        bold_underline:        /(_{1}\*{2}(?=.+\*{2}_{1})|\*{2}_{1}(?=.+_{1}\*{2}))(.+?)(\*{2}_{1}|_{1}\*{2})/g,
        italic_underline:      /(?:_{1}\*{1}(?=.+\*{1}_{1})|\*{1}_{1}(?=.+_{1}\*{1}))(.+?)(\*{1}_{1}|_{1}\*{1})/g,
        bold_italic:           /(\*{3}(?=.+\*{3}))(.+?)(\*{3})/g,
        bold:                  /(\*{2}(?=.+\*{2}))(.+?)(\*{2})/g,
        italic:                /(\*{1}(?=.+\*{1}))(.+?)(\*{1})/g,
        underline:             /(_{1}(?=.+_{1}))(.+?)(_{1})/g,
        splitter:              /\n{2,}/g,
        cleaner:               /^\n+|\n+$/,
        standardizer:          /\r\n|\r/g,
        whitespacer:           /^\t+|^ {3,}/gm,
    };

    // .test() em loop com regex /g sofre de lastIndex residual — variante sem /g
    const reTitlePageTest = /^((?:title|credit|author[s]?|source|notes|draft date|date|contact|copyright)\:)/im;

    function escaparHtml(texto) {
        return String(texto == null ? '' : texto)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    // Ênfase inline — marcador mais longo primeiro, para **negrito** não ser
    // capturado pela regra de *itálico* (bug do port antigo)
    const ENFASES = [
        [/\*\*\*(?=\S)([^*\n]+?)(?<=\S)\*\*\*/g,  'bold italic'],
        [/_\*\*(?=\S)([^*_\n]+?)(?<=\S)\*\*_/g,  'bold underline'],
        [/\*_(?=\S)([^*_\n]+?)(?<=\S)_\*/g,      'italic underline'],
        [/\*\*(?=\S)([^*\n]+?)(?<=\S)\*\*/g,     'bold'],
        [/\*(?=\S)([^*\n]+?)(?<=\S)\*/g,         'italic'],
        [/_(?=\S)([^_\n]+?)(?<=\S)_/g,           'underline'],
    ];

    function lexer(text) {
        if (!text) return text;
        text = text
            .replace(regex.note_inline, '<!-- $1 -->')
            .replace(/\\\*/g, '[STAR]')
            .replace(/\\_/g,  '[UL]')
            .replace(/\n/g,   '<br />');
        for (const [re, classe] of ENFASES) {
            text = text.replace(re, (m, conteudo) => `<span class="${classe}">${conteudo}</span>`);
        }
        return text.replace(/\[STAR\]/g, '*').replace(/\[UL\]/g, '_').trim();
    }

    function parse(script, includeTokens) {
        const blocks = script
            .replace(regex.boneyard,     '\n$1\n')
            .replace(regex.standardizer, '\n')
            .replace(regex.cleaner,      '')
            .replace(regex.whitespacer,  '')
            .split(regex.splitter);

        const tokens   = [];
        let dualRight  = false;

        for (let i = blocks.length - 1; i >= 0; i--) {
            const line = blocks[i];
            let match;

            // Title page
            if (reTitlePageTest.test(line)) {
                const pairs = line
                    .replace(regex.title_page, '\n$1')
                    .split(regex.splitter)
                    .reverse();
                for (const pair of pairs) {
                    const parts = pair.replace(regex.cleaner, '').split(/:\n*/);
                    tokens.push({
                        type: parts[0].trim().toLowerCase().replace(' ', '_'),
                        text: (parts[1] || '').trim()
                    });
                }
                continue;
            }

            // Scene heading
            if ((match = line.match(regex.scene_heading))) {
                let text = match[1] || match[2];
                if (text.endsWith('  ')) continue;           // força action
                let sceneNum;
                const sn = text.match(regex.scene_number);
                if (sn) { sceneNum = sn[1]; text = text.replace(regex.scene_number, ''); }
                tokens.push({ type: 'scene_heading', text, scene_number: sceneNum });
                continue;
            }

            // Centered
            if ((match = line.match(/^(?:> *)(.+)(?: *<)$/))) {
                tokens.push({ type: 'centered', text: match[1] });
                continue;
            }

            // Transition
            if ((match = line.match(regex.transition))) {
                tokens.push({ type: 'transition', text: match[1] || match[2] });
                continue;
            }

            // Dialogue block
            if ((match = line.match(regex.dialogue)) && !match[1].endsWith('  ')) {
                if (match[2]) tokens.push({ type: 'dual_dialogue_end' });
                tokens.push({ type: 'dialogue_end' });

                const parts = match[3].split(/(\(.+\))(?:\n+)/).reverse();
                for (const part of parts) {
                    if (part.trim().length > 0) {
                        tokens.push({
                            type: regex.parenthetical.test(part.trim()) ? 'parenthetical' : 'dialogue',
                            text: part
                        });
                    }
                }

                tokens.push({ type: 'character', text: match[1].trim() });
                tokens.push({
                    type: 'dialogue_begin',
                    dual: match[2] ? 'right' : dualRight ? 'left' : undefined
                });
                if (dualRight) tokens.push({ type: 'dual_dialogue_begin' });
                dualRight = !!match[2];
                continue;
            }

            // Section
            if ((match = line.match(regex.section))) {
                tokens.push({ type: 'section', text: match[2], depth: match[1].length });
                continue;
            }

            // Synopsis
            if ((match = line.match(regex.synopsis))) {
                tokens.push({ type: 'synopsis', text: match[1] });
                continue;
            }

            // Note
            if ((match = line.match(regex.note))) {
                tokens.push({ type: 'note', text: match[1] });
                continue;
            }

            // Boneyard
            if ((match = line.match(regex.boneyard))) {
                tokens.push({ type: match[0][0] === '/' ? 'boneyard_begin' : 'boneyard_end' });
                continue;
            }

            // Page break
            if (regex.page_break.test(line)) { tokens.push({ type: 'page_break' }); continue; }

            // Line break (two trailing spaces)
            if (regex.line_break.test(line)) { tokens.push({ type: 'line_break' }); continue; }

            // Action (fallback)
            tokens.push({ type: 'action', text: line });
        }

        // Tokens → HTML
        const titleHtml  = [];
        const scriptHtml = [];
        let   title      = '';
        let   cenaIdx    = 0;
        let   secIdx     = 0;

        for (let i = tokens.length - 1; i >= 0; i--) {
            const t = tokens[i];
            // escapar ANTES do lexer: a sintaxe (>, <, etc.) já foi interpretada
            // acima; o que sobrou é conteúdo literal
            if (t.text !== undefined) t.text = lexer(escaparHtml(t.text));

            switch (t.type) {
                // Title page
                case 'title':
                    titleHtml.push(`<h1>${t.text}</h1>`);
                    title = t.text.replace('<br />', ' ').replace(/<[^>]*>/g, '');
                    break;
                case 'credit':    titleHtml.push(`<p class="credit">${t.text}</p>`);    break;
                case 'author':
                case 'authors':   titleHtml.push(`<p class="authors">${t.text}</p>`);   break;
                case 'source':    titleHtml.push(`<p class="source">${t.text}</p>`);    break;
                case 'notes':     titleHtml.push(`<p class="notes">${t.text}</p>`);     break;
                case 'draft_date':titleHtml.push(`<p class="draft-date">${t.text}</p>`);break;
                case 'date':      titleHtml.push(`<p class="date">${t.text}</p>`);      break;
                case 'contact':   titleHtml.push(`<p class="contact">${t.text}</p>`);   break;
                case 'copyright': titleHtml.push(`<p class="copyright">${t.text}</p>`); break;

                // Script
                case 'scene_heading':
                    scriptHtml.push(`<h3 id="cena-${cenaIdx++}"${t.scene_number ? ` data-scene="${t.scene_number}"` : ''}>${t.text}</h3>`);
                    break;
                case 'transition':
                    scriptHtml.push(`<h2>${t.text}</h2>`);
                    break;
                case 'dual_dialogue_begin':
                    scriptHtml.push('<div class="dual-dialogue">');
                    break;
                case 'dialogue_begin':
                    scriptHtml.push(`<div class="dialogue${t.dual ? ' ' + t.dual : ''}">`);
                    break;
                case 'character':
                    scriptHtml.push(`<h4>${t.text}</h4>`);
                    break;
                case 'parenthetical':
                    scriptHtml.push(`<p class="parenthetical">${t.text}</p>`);
                    break;
                case 'dialogue':
                    scriptHtml.push(`<p>${t.text}</p>`);
                    break;
                case 'dialogue_end':
                case 'dual_dialogue_end':
                    scriptHtml.push('</div>');
                    break;
                case 'section':
                    if (t.depth === 1) {
                        // Atos (nível 1) ganham id/data-idx para o índice e o scrollspy
                        scriptHtml.push(`<p class="section" id="sec-${secIdx}" data-idx="${secIdx}" data-depth="1">${t.text}</p>`);
                        secIdx++;
                    } else {
                        scriptHtml.push(`<p class="section" data-depth="${t.depth}">${t.text}</p>`);
                    }
                    break;
                case 'synopsis':
                    scriptHtml.push(`<p class="synopsis">${t.text}</p>`);
                    break;
                case 'note':
                    scriptHtml.push(`<!-- ${t.text} -->`);
                    break;
                case 'boneyard_begin': scriptHtml.push('<!-- ');  break;
                case 'boneyard_end':   scriptHtml.push(' -->');   break;
                case 'action':
                    scriptHtml.push(`<p class="action">${t.text}</p>`);
                    break;
                case 'centered':
                    scriptHtml.push(`<p class="centered">${t.text}</p>`);
                    break;
                case 'page_break':
                    scriptHtml.push('<div class="page-break"></div>');
                    break;
                case 'line_break':
                    scriptHtml.push('<br />');
                    break;
            }
        }

        return {
            title,
            html: {
                title_page: titleHtml.join('\n'),
                script:     scriptHtml.join('\n'),
            },
            tokens: includeTokens ? tokens : undefined,
        };
    }

    return { parse, escaparHtml };
})();


// ── 2. CSS ────────────────────────────────────────────────────────────────────
const CSS = `
  /* Tudo escopado em #fv-root: o CSS não pode afetar o app, mesmo que o
     Trilium não envolva o estilo em @scope (versões antigas) */
  #fv-root, #fv-root * { box-sizing: border-box; }

  #fv-root {
    min-height: 100vh;
    padding: 32px 16px 64px;
  }

  #fv-root #fv-toolbar {
    max-width: 980px;
    margin: 0 auto 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }
  #fv-root #fv-toolbar-esq { display: flex; align-items: center; gap: 10px; min-width: 0; }
  #fv-root #fv-toolbar-dir { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

  #fv-root #fv-aviso-f5 {
    font-family: monospace;
    font-size: 12px;
    opacity: 0.5;
    user-select: none;
  }

  #fv-root .fv-btn {
    padding: 7px 14px;
    border-radius: 5px;
    border: 1px solid var(--main-border-color);
    cursor: pointer;
    font-size: 13px;
    font-weight: bold;
    background: var(--button-background-color, var(--accented-background-color, #f0f0f0));
    color: var(--button-text-color);
    transition: filter 0.15s;
  }
  #fv-root .fv-btn:hover { filter: brightness(1.15); }

  /* Botões compactos (zoom) */
  #fv-root .fv-btn-peq {
    padding: 7px 10px;
    font-size: 12px;
    border-radius: 5px;
    border: 1px solid var(--main-border-color);
    cursor: pointer;
    background: var(--button-background-color, var(--accented-background-color, #f0f0f0));
    color: var(--button-text-color);
    transition: filter 0.15s;
    font-family: monospace;
  }
  #fv-root .fv-btn-peq:hover { filter: brightness(1.15); }
  #fv-root .fv-zoom-reset { font-size: 10px; padding: 7px 6px; opacity: .85; }
  #fv-root .fv-zoom-grupo { display: flex; gap: 4px; align-items: center; }

  /* ── Modo foco: só o roteiro ── */
  #fv-root.fv-foco #fv-toolbar,
  #fv-root.fv-foco #fv-stats,
  #fv-root.fv-foco #fv-sidebar { display: none !important; }
  #fv-root.fv-foco #fv-body { display: block; max-width: none; }
  #fv-root.fv-foco #fv-page {
    border: none;
    box-shadow: none;
    max-width: none;
    padding: 24px 8vw;
  }

  /* Botão para sair do foco (só aparece no modo foco).
   Sticky em vez de fixed: gruda no scroller real do Trilium e não depende
   de nenhum containing block dos containers da nota. */
  #fv-root #fv-btn-foco-sair {
    display: none;
    position: sticky;
    top: 8px;
    z-index: 10001;
    margin-left: auto;
    padding: 8px 12px;
    border-radius: 6px;
    border: 1px solid var(--main-border-color);
    background: var(--button-background-color, var(--accented-background-color, #f0f0f0));
    color: var(--button-text-color);
    cursor: pointer;
    font-size: 13px;
    font-weight: bold;
    opacity: .85;
  }
  #fv-root #fv-btn-foco-sair:hover { opacity: 1; filter: brightness(1.1); }
  #fv-root.fv-foco #fv-btn-foco-sair { display: block; }

  /* ── Número de cena na margem (produção) ── */
  #fv-root #fv-page h3[data-scene] { position: relative; }
  #fv-root #fv-page h3[data-scene]::before {
    content: attr(data-scene);
    position: absolute;
    right: 100%;
    top: 0;
    margin-right: 10px;
    width: 42px;
    text-align: right;
    font-size: 10pt;
    font-weight: normal;
    color: var(--muted-text-color, #888);
  }

  #fv-root #fv-select-rascunho {
    max-width: 240px;
    padding: 6px 8px;
    border-radius: 5px;
    border: 1px solid var(--main-border-color);
    background: var(--button-background-color, var(--accented-background-color, #f0f0f0));
    color: var(--button-text-color);
    font-size: 12px;
  }

  /* ── Layout: sidebar + página ── */
  #fv-root #fv-body {
    display: flex;
    align-items: flex-start;
    gap: 20px;
    max-width: 980px;
    margin: 0 auto;
  }

  /* ── Sidebar ── */
  #fv-root #fv-sidebar {
    width: 240px;
    flex-shrink: 0;
    position: sticky;
    top: 16px;
    background: var(--accented-background-color, var(--main-background-color));
    border: 1px solid var(--main-border-color);
    border-radius: 6px;
    overflow: hidden;
  }

  #fv-root .fv-section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 9px 12px;
    border-bottom: 1px solid var(--main-border-color);
    font-family: monospace;
    font-size: 13px;
    font-weight: bold;
    opacity: 0.75;
    cursor: pointer;
    user-select: none;
  }
  #fv-root .fv-section-header:hover { opacity: 1; }
  #fv-root .fv-section-header + .fv-list { border-bottom: 1px solid var(--main-border-color); }
  #fv-root .fv-toggle { font-size: 11px; }

  #fv-root .fv-list {
    list-style: none;
    margin: 0;
    padding: 6px 0;
    max-height: 38vh;
    overflow-y: auto;
  }
  #fv-root .fv-list.collapsed { display: none; }

  #fv-root .fv-list li a,
  #fv-root .fv-list li .fv-item {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    font-family: monospace;
    font-size: 12px;
    color: var(--main-text-color);
    text-decoration: none;
    opacity: 0.75;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    transition: opacity 0.15s, background 0.15s;
  }
  #fv-root .fv-list li a:hover,
  #fv-root .fv-list li .fv-item:hover {
    opacity: 1;
    background: var(--hover-item-background-color, rgba(128,128,128,0.1));
  }
  #fv-root .fv-list li a.ativa {
    opacity: 1;
    font-weight: bold;
    border-left: 2px solid var(--main-accent-color, var(--active-item-background-color, #888));
    padding-left: 10px;
  }
  #fv-root .fv-num { opacity: 0.55; flex-shrink: 0; }
  #fv-root .fv-txt { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
  #fv-root .fv-char-nome { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
  #fv-root .fv-char-count { margin-left: auto; opacity: 0.6; flex-shrink: 0; }

  /* ── Stats ── */
  #fv-root #fv-stats {
    max-width: 980px;
    margin: 0 auto 14px;
    display: flex;
    flex-wrap: wrap;
    gap: 10px 22px;
    font-family: monospace;
    font-size: 13px;
    opacity: 0.7;
    user-select: none;
  }
  #fv-root #fv-stats span b { opacity: 1; font-weight: bold; }

  /* ── Toolbar e page: limitados pela sidebar ── */
  #fv-root #fv-page { flex: 1; min-width: 0; margin: 0; }

  /* Página do roteiro */
  #fv-root #fv-page {
    font-family: 'Courier Prime', 'Courier New', Courier, monospace;
    font-size: 12pt;
    line-height: 1.2;
    max-width: 740px;
    margin: 0 auto;
    padding: 72px 96px;
    background: var(--main-background-color);
    color: var(--main-text-color);
    border: 1px solid var(--main-border-color);
    box-shadow: 0 2px 12px rgba(0,0,0,0.12);
    overflow-wrap: break-word;
  }

  /* ── Title page ── */
  #fv-root #fv-page h1             { text-align: center; font-size: 14pt; margin: 0 0 0.25em; }
  #fv-root #fv-page .credit        { text-align: center; margin: 0.1em 0; }
  #fv-root #fv-page .authors       { text-align: center; margin: 0.1em 0; }
  #fv-root #fv-page .source        { text-align: center; margin: 0.1em 0; }
  #fv-root #fv-page .date,
  #fv-root #fv-page .draft-date    { text-align: center; margin: 0.5em 0 0; }
  #fv-root #fv-page .contact       { margin-top: 4em; font-size: 10pt; }
  #fv-root #fv-page .notes,
  #fv-root #fv-page .copyright     { text-align: center; font-size: 10pt; margin: 0.25em 0; }

  /* Separador title page / script */
  #fv-root #fv-page hr {
    border: none;
    border-top: 1px solid var(--main-border-color);
    margin: 3em 0;
  }

  /* ── Scene heading ── */
  #fv-root #fv-page h3 {
    font-size: 12pt;
    font-weight: bold;
    text-transform: uppercase;
    margin: 2.5em 0 0.25em;
    scroll-margin-top: 16px;
  }

  /* ── Action ── */
  #fv-root #fv-page p.action { margin: 1em 0; }

  /* ── Transition ── */
  #fv-root #fv-page h2 {
    font-size: 12pt;
    font-weight: normal;
    text-transform: uppercase;
    text-align: right;
    margin: 2em 0;
  }

  /* ── Dialogue wrapper ── */
  #fv-root #fv-page .dialogue { margin: 1em 0; }

  /* ── Character name ── */
  #fv-root #fv-page .dialogue h4 {
    font-size: 12pt;
    font-weight: normal;
    text-transform: uppercase;
    margin: 0 0 0 37%;
  }

  /* ── Parenthetical ── */
  #fv-root #fv-page .dialogue p.parenthetical {
    margin: 0 33% 0 31%;
  }

  /* ── Dialogue line ── */
  #fv-root #fv-page .dialogue p:not(.parenthetical) {
    margin: 0.1em 20% 0.5em 20%;
  }

  /* ── Dual dialogue ── */
  #fv-root #fv-page .dual-dialogue {
    display: flex;
    gap: 2%;
    margin: 1em 0;
  }
  #fv-root #fv-page .dual-dialogue .dialogue        { flex: 1; margin: 0; }
  #fv-root #fv-page .dual-dialogue .dialogue h4     { margin-left: 0; }
  #fv-root #fv-page .dual-dialogue .dialogue p:not(.parenthetical) { margin-left: 0; margin-right: 0; }
  #fv-root #fv-page .dual-dialogue .dialogue p.parenthetical       { margin-left: 0; margin-right: 5%; }

  /* ── Centered ── */
  #fv-root #fv-page p.centered { text-align: center; margin: 1em 0; }

  /* ── Section / Synopsis ── */
  #fv-root #fv-page p.section  { color: var(--muted-text-color, #888); font-style: italic; margin: 1.5em 0 0.25em; }
  #fv-root #fv-page p.synopsis { color: var(--muted-text-color, #888); font-style: italic; margin-left: 8%; }

  /* ── Quebra de página do Fountain (===) ── */
  #fv-root #fv-page .page-break {
    border-top: 1px dashed var(--main-border-color);
    margin: 2.5em 0;
  }

  /* ── Ênfase inline ── */
  #fv-root #fv-page .bold       { font-weight: bold; }
  #fv-root #fv-page .italic     { font-style: italic; }
  #fv-root #fv-page .underline  { text-decoration: underline; }

  /* ── Impressão direta (Ctrl+P) ── */
  @media print {
    #fv-root #fv-toolbar, #fv-root #fv-stats, #fv-root #fv-sidebar { display: none !important; }
    #fv-root { padding: 0; }
    #fv-root #fv-body { display: block; max-width: none; }
    #fv-root #fv-page { border: none; box-shadow: none; padding: 0; max-width: none; }
    #fv-root #fv-page h3 { page-break-after: avoid; }
    #fv-root #fv-page .dialogue, #fv-root #fv-page .dual-dialogue { page-break-inside: avoid; }
    #fv-root #fv-page .page-break { border: none; margin: 0; page-break-before: always; }
  }

  /* ── Mobile / telas estreitas ── */
  @media (max-width: 700px) {
    #fv-root { padding: 12px 8px 32px; }

    #fv-root #fv-toolbar { gap: 8px; margin-bottom: 10px; }
    #fv-root #fv-aviso-f5 { display: none; }
    #fv-root #fv-toolbar-esq { width: 100%; }
    #fv-root #fv-select-rascunho { max-width: none; width: 100%; }
    #fv-root #fv-toolbar-dir { width: 100%; gap: 6px; }
    #fv-root .fv-btn { flex: 1 1 auto; padding: 9px 8px; font-size: 12px; text-align: center; }
    #fv-root .fv-btn-peq { flex: 0 0 auto; padding: 9px 8px; }
    #fv-root #fv-btn-print { display: none; } /* no mobile, o caminho é o 📄 PDF */
    #fv-root.fv-foco #fv-page { padding: 16px 10px; }
    #fv-root #fv-page h3[data-scene]::before { display: none; }

    #fv-root #fv-stats { gap: 6px 14px; font-size: 12px; margin-bottom: 10px; }

    /* roteiro primeiro; índice (cenas/personagens) depois */
    #fv-root #fv-body { flex-direction: column; gap: 12px; }
    #fv-root #fv-page { order: 1; width: 100%; max-width: none; padding: 28px 18px; font-size: 11pt; }
    #fv-root #fv-sidebar { order: 2; position: static; width: 100%; }
    #fv-root .fv-list { max-height: 32vh; }

    /* menos recuo para o diálogo caber na largura do celular */
    #fv-root #fv-page h3 { margin: 1.8em 0 0.25em; }
    #fv-root #fv-page .dialogue h4 { margin-left: 12%; }
    #fv-root #fv-page .dialogue p.parenthetical { margin: 0 12% 0 10%; }
    #fv-root #fv-page .dialogue p:not(.parenthetical) { margin: 0.1em 4% 0.5em 4%; }
    #fv-root #fv-page .dual-dialogue { display: block; }
  }
`;


// CSS autossuficiente para a janela de impressão/PDF (sem variáveis do Trilium)
const CSS_IMPRESSAO = `
  @page { size: A4; margin: 2.2cm 2.4cm; }
  * { box-sizing: border-box; }
  body {
    font-family: 'Courier Prime', 'Courier New', Courier, monospace;
    font-size: 12pt;
    line-height: 1.2;
    color: #000;
    background: #fff;
    margin: 0;
  }
  h1             { text-align: center; font-size: 14pt; margin: 0 0 0.25em; }
  .credit, .authors, .source { text-align: center; margin: 0.1em 0; }
  .date, .draft-date { text-align: center; margin: 0.5em 0 0; }
  .contact       { margin-top: 4em; font-size: 10pt; }
  .notes, .copyright { text-align: center; font-size: 10pt; margin: 0.25em 0; }
  hr { border: none; border-top: 1px solid #000; margin: 3em 0; }
  h3 {
    font-size: 12pt; font-weight: bold; text-transform: uppercase;
    margin: 2.5em 0 0.25em; page-break-after: avoid;
  }
  p.action { margin: 1em 0; }
  h2 {
    font-size: 12pt; font-weight: normal; text-transform: uppercase;
    text-align: right; margin: 2em 0;
  }
  .dialogue { margin: 1em 0; page-break-inside: avoid; }
  .dialogue h4 { font-size: 12pt; font-weight: normal; text-transform: uppercase; margin: 0 0 0 37%; }
  .dialogue p.parenthetical { margin: 0 33% 0 31%; }
  .dialogue p:not(.parenthetical) { margin: 0.1em 20% 0.5em 20%; }
  .dual-dialogue { display: flex; gap: 2%; margin: 1em 0; page-break-inside: avoid; }
  .dual-dialogue .dialogue { flex: 1; margin: 0; }
  .dual-dialogue .dialogue h4 { margin-left: 0; }
  .dual-dialogue .dialogue p:not(.parenthetical) { margin-left: 0; margin-right: 0; }
  .dual-dialogue .dialogue p.parenthetical { margin-left: 0; margin-right: 5%; }
  p.centered { text-align: center; margin: 1em 0; }
  p.section  { color: #555; font-style: italic; margin: 1.5em 0 0.25em; }
  p.synopsis { color: #555; font-style: italic; margin-left: 8%; }
  .page-break { border: none; margin: 0; height: 0; page-break-before: always; }
  .bold { font-weight: bold; }
  .italic { font-style: italic; }
  .underline { text-decoration: underline; }
`;


// ── 3. HELPERS ────────────────────────────────────────────────────────────────

const escaparHtml = Fountain.escaparHtml;

/** Desktop (Electron): impressão de iframe não funciona — lá usamos o PDF direto */
const ehElectron = typeof window !== 'undefined' && !!window.electronApi;

/** Converte HTML do Trilium em texto plano preservando quebras de parágrafo */
function htmlParaTexto(html) {
    return (html || '')
        .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, '\n')
        .replace(/<br\s*\/?>/gi,                '\n')
        .replace(/<[^>]+>/g,                    '')
        .replace(/&nbsp;/g,  ' ')
        .replace(/&amp;/g,   '&')
        .replace(/&lt;/g,    '<')
        .replace(/&gt;/g,    '>')
        .replace(/&quot;/g,  '"')
        .replace(/&#39;/g,   "'")
        .replace(/&apos;/g,  "'")
        .replace(/\n{3,}/g,  '\n\n')
        .trim();
}

/** Gera nome de arquivo seguro, sem acentos ou caracteres especiais */
function nomeSeguro(titulo) {
    return (titulo || 'roteiro')
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
}

/** Aviso nativo do Trilium (silencioso em versões antigas) */
function avisar(mensagem) {
    try { api.showMessage(mensagem); } catch (e) { /* opcional */ }
}

/** Bytes → base64 (em blocos, para não estourar a pilha em arquivos maiores) */
function bytesParaBase64(bytes) {
    let binario = '';
    const bloco = 0x8000;
    for (let i = 0; i < bytes.length; i += bloco) {
        binario += String.fromCharCode.apply(null, bytes.subarray(i, i + bloco));
    }
    return btoa(binario);
}

/** Texto UTF-8 → base64 */
function textoParaBase64(texto) {
    return btoa(unescape(encodeURIComponent(texto)));
}

/** Anchor com data URL — é o caminho que o próprio Trilium usa (blob URL é bloqueado no Electron) */
function baixarDataUrl(nome, dataUrl) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = nome;
    document.body.appendChild(a);
    a.click();
    a.remove();
}

/** Plugin nativo via bridge do Capacitor (Plugins[X] só tem o core; o resto vem de registerPlugin) */
function pluginCapacitor(nome) {
    const cap = typeof window !== 'undefined' ? window.Capacitor : null;
    if (!cap) return null;
    return (cap.Plugins && cap.Plugins[nome])
        || (typeof cap.registerPlugin === 'function' ? cap.registerPlugin(nome) : null);
}

/**
 * Baixa um arquivo nos 3 ambientes:
 * - app mobile (Capacitor): Filesystem + Share (o WebView descarta downloads nativos);
 * - desktop/web: anchor com data URL.
 * `base64` é usado só no caminho nativo; `dataUrl` é o fallback universal.
 */
function baixarArquivo(nome, dataUrl, base64) {
    const cap = typeof window !== 'undefined' ? window.Capacitor : null;
    const nativo = !!(cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform());

    if (nativo) {
        const fs = pluginCapacitor('Filesystem');
        const share = pluginCapacitor('Share');
        if (fs && share) {
            (async () => {
                const res = await fs.writeFile({
                    path: nome,
                    data: base64,
                    directory: 'CACHE',
                    recursive: true,
                });
                await share.share({ title: nome, files: [res.uri] });
            })().catch(() => baixarDataUrl(nome, dataUrl));
            return;
        }
    }

    baixarDataUrl(nome, dataUrl);
}

/** Nota candidata a rascunho: texto ou código (menos as notas de script) */
function ehRascunho(note) {
    const mime = (note.mime || '').toLowerCase();
    if (mime.includes('javascript') || mime.includes('css')) return false;
    return note.type === 'text' || note.type === 'code' || mime === 'text/plain';
}


// ── 4. ESTATÍSTICAS ───────────────────────────────────────────────────────────

/** Os tokens saem do parser em ordem reversa — devolve em ordem de leitura */
function tokensEmOrdem(tokens) {
    const ordem = [];
    for (let i = tokens.length - 1; i >= 0; i--) ordem.push(tokens[i]);
    return ordem;
}

function contarPalavras(texto) {
    const limpo = String(texto || '').trim();
    return limpo ? limpo.split(/\s+/).length : 0;
}

/** Extrai o local (INT./EXT./EST./I/E) de um scene heading, sem o período do dia */
function extrairLocal(sceneHeading) {
    const m = String(sceneHeading || '').match(
        /^\s*(?:INT\.?\/EXT\.?|INT\.?|EXT\.?|EST\.?|I\/E)[.\s]+(.+?)(?:\s*[—–-]\s*.*)?\s*$/i
    );
    if (!m) return null;
    const local = m[1].replace(/[.,:;!?]+$/g, '').trim();
    return local ? local.toUpperCase() : null;
}

/**
 * Estatísticas a partir dos tokens do Fountain.parse.
 * Páginas: estimativa por linhas (padrão WGA: ~55 linhas/página em Courier 12pt).
 * Duração: ~1 minuto por página.
 */
function calcularStats(tokens) {
    const limpar = (t) => (t.text || '')
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .trim();

    const LPP = 55;
    let linhas = 0;
    let palavras = 0;
    let palavrasDialogo = 0;

    const cenasList = [];
    const falas = new Map();
    const locais = new Map();
    const atos = [];
    let personagemAtual = null;

    for (const t of tokensEmOrdem(tokens)) {
        const texto = limpar(t);

        switch (t.type) {
            case 'scene_heading': {
                cenasList.push(texto);
                linhas += 2;
                const local = extrairLocal(texto);
                if (local) locais.set(local, (locais.get(local) || 0) + 1);
                break;
            }

            case 'character':
                personagemAtual = texto.toUpperCase();
                if (!falas.has(personagemAtual)) falas.set(personagemAtual, 0);
                linhas += 1;
                break;

            case 'dialogue': {
                const n = contarPalavras(texto);
                palavras += n;
                palavrasDialogo += n;
                linhas += Math.max(1, Math.ceil(texto.length / 35));
                if (personagemAtual) {
                    falas.set(personagemAtual, (falas.get(personagemAtual) || 0) + 1);
                }
                break;
            }

            case 'parenthetical': {
                const n = contarPalavras(texto);
                palavras += n;
                palavrasDialogo += n;
                linhas += 1;
                break;
            }

            case 'action': {
                const n = contarPalavras(texto);
                palavras += n;
                linhas += Math.max(1, Math.ceil(texto.length / 60)) + 0.5;
                break;
            }

            case 'transition': linhas += 1.5; break;
            case 'centered':   linhas += 1;   break;

            case 'section':
                if ((t.depth || 0) === 1) atos.push(texto);
                break;

            case 'page_break':
                linhas = Math.ceil(linhas / LPP) * LPP;
                break;

            default: break; // synopsis, note, title page…
        }
    }

    const paginas = Math.max(1, Math.round(linhas / LPP));

    const ranking = [...falas.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pt-BR'));

    return {
        cenas: cenasList.length,
        palavras,
        personagens: ranking.length,
        paginas,
        duracao: paginas, // ~1 min por página
        pctDialogo: palavras > 0 ? Math.round((palavrasDialogo / palavras) * 100) : 0,
        cenasList,
        ranking,
        locais: [...locais.entries()]
            .map(([local, n]) => ({ local, n }))
            .sort((a, b) => a.local.localeCompare(b.local, 'pt-BR')),
        atos,
    };
}


// ── 5. SIDEBAR (scrollspy + seções) ──────────────────────────────────────────

const estadoSidebar = { cenas: true, personagens: true, locais: true, atos: true };
let observerCenas = null;

function marcarAtivo(raiz, id) {
    if (!raiz) return;
    raiz.querySelectorAll('.fv-list a.ativa').forEach((a) => a.classList.remove('ativa'));
    const link = raiz.querySelector(`.fv-list a[href="#${id}"]`);
    if (link) link.classList.add('ativa');
}

function configurarScrollSpy() {
    if (typeof IntersectionObserver === 'undefined') return;

    const raiz = api.$container[0];
    if (!raiz) return;

    // Cenas (h3) e atos (seções # de nível 1) — todos com id para o índice
    const alvos = Array.from(raiz.querySelectorAll('#fv-page h3[id], #fv-page .section[data-idx]'));
    if (!alvos.length) return;

    // Descobre o contêiner rolável da nota (Trilium rola dentro de um painel)
    let scroller = null;
    for (let p = raiz.parentElement; p && p !== document.body; p = p.parentElement) {
        const estilo = getComputedStyle(p);
        if (/(auto|scroll)/.test(estilo.overflowY) && p.scrollHeight > p.clientHeight + 4) {
            scroller = p;
            break;
        }
    }

    observerCenas = new IntersectionObserver((entradas) => {
        for (const entrada of entradas) {
            if (entrada.isIntersecting) { marcarAtivo(raiz, entrada.target.id); break; }
        }
    }, { root: scroller, rootMargin: '0px 0px -75% 0px', threshold: 0 });

    alvos.forEach((t) => observerCenas.observe(t));
}


// ── 6. IMPRESSÃO / PDF ────────────────────────────────────────────────────────

function imprimirRoteiro(titulo, htmlRoteiro) {
    const doc = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>${escaparHtml(titulo)}</title>
<style>${CSS_IMPRESSAO}</style>
</head>
<body>${htmlRoteiro}</body>
</html>`;

    // iframe fora da tela, mas com tamanho real (iframe 0×0 pode paginar em branco)
    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.cssText = 'position:fixed;top:0;left:-10000px;width:794px;height:1123px;border:0;';

    let removido = false;
    const remover = () => {
        if (removido) return;
        removido = true;
        try { iframe.remove(); } catch (e) { /* já removido */ }
    };

    iframe.onload = () => {
        try {
            const win = iframe.contentWindow;
            if (!win) throw new Error('iframe sem janela');

            // Só remove DEPOIS que o diálogo fecha — remover cedo gera PDF em branco
            win.onafterprint = () => setTimeout(remover, 1000);

            win.focus();
            win.print();

            // Rede de segurança: se onafterprint não disparar, limpa em 10 min
            setTimeout(remover, 10 * 60 * 1000);
        } catch (e) {
            remover();
            avisar('Não foi possível abrir a impressão.');
        }
    };

    document.body.appendChild(iframe);
    iframe.srcdoc = doc;
}


// ── 7. GERADOR DE PDF (sem bibliotecas) ──────────────────────────────────────
// PDF 1.4 mínimo com a fonte Courier (padrão do formato, WinAnsiEncoding).
// Gera o arquivo direto no renderer — sem diálogo de impressão e sem impressora,
// então funciona também no desktop (Electron), onde a impressão de iframe falha.

const PDF_PAGINA = { largura: 595.28, altura: 841.89 }; // A4 em pontos
const PDF_MARGEM = 72;                                   // 1 polegada
const PDF_FONTE = 12;
const PDF_ALTURA_LINHA = 12;
const PDF_LINHAS_PAGINA = Math.floor((PDF_PAGINA.altura - 2 * PDF_MARGEM) / PDF_ALTURA_LINHA); // 58
const PDF_LARGURA_CHAR = 0.6;                            // Courier: 600/1000 em

const PDF_TIPOS_TITULO = new Set([
    'title', 'credit', 'author', 'authors', 'source',
    'draft_date', 'date', 'contact', 'notes', 'copyright',
]);

// Unicode → WinAnsi (fora da faixa Latin-1, que é idêntica)
const PDF_WINANSI = {
    '\u20AC': 0x80, '\u201A': 0x82, '\u0192': 0x83, '\u201E': 0x84,
    '\u2026': 0x85, '\u2020': 0x86, '\u2021': 0x87, '\u02C6': 0x88,
    '\u2030': 0x89, '\u0160': 0x8A, '\u2039': 0x8B, '\u0152': 0x8C,
    '\u017D': 0x8E, '\u2018': 0x91, '\u2019': 0x92, '\u201C': 0x93,
    '\u201D': 0x94, '\u2022': 0x95, '\u2013': 0x96, '\u2014': 0x97,
    '\u02DC': 0x98, '\u2122': 0x99, '\u0161': 0x9A, '\u203A': 0x9B,
    '\u0153': 0x9C, '\u017E': 0x9E, '\u0178': 0x9F,
};

function pdfWinAnsi(texto) {
    let saida = '';
    for (const ch of String(texto == null ? '' : texto)) {
        const cp = ch.codePointAt(0);
        if (cp >= 32 && cp <= 126) { saida += ch; continue; }
        if (PDF_WINANSI[ch] !== undefined) { saida += String.fromCharCode(PDF_WINANSI[ch]); continue; }
        if (cp >= 0xA0 && cp <= 0xFF) { saida += ch; continue; }
        saida += '?';
    }
    return saida;
}

function pdfEscapar(texto) {
    return pdfWinAnsi(texto).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function pdfLargura(texto, tamanho) {
    return String(texto).length * tamanho * PDF_LARGURA_CHAR;
}

function pdfQuebrar(texto, maxChars) {
    const palavras = String(texto || '').split(/\s+/).filter(Boolean);
    const linhas = [];
    let atual = '';
    const fechar = () => { if (atual) { linhas.push(atual); atual = ''; } };

    for (let palavra of palavras) {
        while (palavra.length > maxChars) {
            fechar();
            linhas.push(palavra.slice(0, maxChars));
            palavra = palavra.slice(maxChars);
        }
        if (!atual) { atual = palavra; continue; }
        if (atual.length + 1 + palavra.length <= maxChars) atual += ' ' + palavra;
        else { fechar(); atual = palavra; }
    }
    fechar();
    return linhas.length ? linhas : [''];
}

function pdfLimparToken(t) {
    return (t.text || '')
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/\s+/g, ' ')
        .trim();
}

/** Tokens → páginas de operações de texto {texto, x, y, tamanho} */
function pdfGerar(tokens) {
    const ordem = tokensEmOrdem(tokens);
    const larguraUtil = PDF_PAGINA.largura - 2 * PDF_MARGEM;
    const maxChars = (frac) => Math.max(8, Math.floor((larguraUtil * frac) / (PDF_FONTE * PDF_LARGURA_CHAR)));

    const paginas = [];
    let pagina = [];
    const fecharPagina = () => { if (pagina.length) { paginas.push(pagina); pagina = []; } };
    const addTexto = (texto, x, y, tamanho) => {
        if (texto) pagina.push({ texto, x, y, tamanho: tamanho || PDF_FONTE });
    };

    // ── Capa (title page) ──
    const capa = ordem.filter((t) => PDF_TIPOS_TITULO.has(t.type));
    if (capa.length) {
        const paginaCapa = [];
        const centro = (texto, tamanho) => (PDF_PAGINA.largura - pdfLargura(texto, tamanho)) / 2;
        let y = PDF_PAGINA.altura - 200;

        for (const t of capa) {
            if (t.type === 'contact') continue;
            const texto = pdfLimparToken(t);
            if (!texto) continue;
            const tamanho = t.type === 'title' ? 14 : (t.type === 'notes' || t.type === 'copyright' ? 10 : 12);
            for (const linha of pdfQuebrar(texto, maxChars(0.9))) {
                paginaCapa.push({ texto: linha, x: centro(linha, tamanho), y, tamanho });
                y -= tamanho + 6;
            }
            y -= 4;
        }

        let yContato = PDF_MARGEM + 120;
        for (const t of capa.filter((x) => x.type === 'contact')) {
            const texto = pdfLimparToken(t);
            if (!texto) continue;
            for (const linha of pdfQuebrar(texto, maxChars(0.6))) {
                paginaCapa.push({ texto: linha, x: PDF_MARGEM, y: yContato, tamanho: 10 });
                yContato -= 14;
            }
        }

        paginas.push(paginaCapa);
    }

    // ── Roteiro ──
    const inicioRoteiro = paginas.length;
    let linha = 0;
    const proximaLinha = () => {
        if (linha >= PDF_LINHAS_PAGINA) { fecharPagina(); linha = 0; }
        const y = PDF_PAGINA.altura - PDF_MARGEM - PDF_FONTE - linha * PDF_ALTURA_LINHA;
        linha++;
        return y;
    };
    const pular = (n) => { for (let i = 0; i < n; i++) proximaLinha(); };
    const escrever = (linhas, x) => { for (const l of linhas) addTexto(l, x, proximaLinha()); };

    const xDialogo = PDF_MARGEM + larguraUtil * 0.20;
    const xParentetico = PDF_MARGEM + larguraUtil * 0.31;
    const xPersonagem = PDF_MARGEM + larguraUtil * 0.37;

    for (const t of ordem) {
        if (PDF_TIPOS_TITULO.has(t.type)) continue;
        const texto = pdfLimparToken(t);

        switch (t.type) {
            case 'scene_heading':
                if (linha > 0) pular(1);
                escrever(pdfQuebrar(texto.toUpperCase(), maxChars(1)), PDF_MARGEM);
                pular(1);
                break;

            case 'action':
                if (linha > 0) pular(1);
                escrever(pdfQuebrar(texto, maxChars(1)), PDF_MARGEM);
                pular(1);
                break;

            case 'character':
                pular(1);
                escrever(pdfQuebrar(texto.toUpperCase(), maxChars(0.63)), xPersonagem);
                break;

            case 'parenthetical':
                escrever(pdfQuebrar(texto, maxChars(0.36)), xParentetico);
                break;

            case 'dialogue':
                escrever(pdfQuebrar(texto, maxChars(0.60)), xDialogo);
                pular(1);
                break;

            case 'transition': {
                if (linha > 0) pular(1);
                for (const l of pdfQuebrar(texto.toUpperCase(), maxChars(1))) {
                    addTexto(l, PDF_PAGINA.largura - PDF_MARGEM - pdfLargura(l, PDF_FONTE), proximaLinha());
                }
                pular(1);
                break;
            }

            case 'centered': {
                if (linha > 0) pular(1);
                for (const l of pdfQuebrar(texto, maxChars(1))) {
                    addTexto(l, (PDF_PAGINA.largura - pdfLargura(l, PDF_FONTE)) / 2, proximaLinha());
                }
                pular(1);
                break;
            }

            case 'page_break':
                fecharPagina();
                linha = 0;
                break;

            default:
                break; // section, synopsis, note, line_break…
        }
    }
    fecharPagina();

    // ── Números de página (a partir da primeira do roteiro) ──
    for (let i = inicioRoteiro; i < paginas.length; i++) {
        const numero = `${i - inicioRoteiro + 1}.`;
        paginas[i].push({
            texto: numero,
            x: PDF_PAGINA.largura - PDF_MARGEM - pdfLargura(numero, PDF_FONTE),
            y: PDF_PAGINA.altura - 36,
            tamanho: PDF_FONTE,
        });
    }

    return paginas;
}

/** Páginas de operações → bytes de um arquivo PDF */
function pdfMontar(paginas) {
    const paraBytes = (texto) => {
        const arr = new Uint8Array(texto.length);
        for (let i = 0; i < texto.length; i++) arr[i] = texto.charCodeAt(i) & 0xFF;
        return arr;
    };
    const juntar = (partes) => {
        let total = 0;
        for (const p of partes) total += p.length;
        const saida = new Uint8Array(total);
        let offset = 0;
        for (const p of partes) { saida.set(p, offset); offset += p.length; }
        return saida;
    };

    const objetos = [];
    objetos.push(null, null, paraBytes('<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>'));

    const idsPaginas = [];
    for (const ops of paginas) {
        let conteudo = '';
        for (const op of ops) {
            if (!op.texto) continue;
            conteudo += `BT /F1 ${op.tamanho} Tf ${op.x.toFixed(2)} ${op.y.toFixed(2)} Td (${pdfEscapar(op.texto)}) Tj ET\n`;
        }
        const conteudoBytes = paraBytes(conteudo);
        const idConteudo = objetos.length + 1;
        objetos.push(juntar([paraBytes(`<< /Length ${conteudoBytes.length} >>\nstream\n`), conteudoBytes, paraBytes('\nendstream')]));

        const idPagina = objetos.length + 1;
        objetos.push(paraBytes(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PDF_PAGINA.largura.toFixed(2)} ${PDF_PAGINA.altura.toFixed(2)}] /Resources << /Font << /F1 3 0 R >> >> /Contents ${idConteudo} 0 R >>`));
        idsPaginas.push(idPagina);
    }

    objetos[0] = paraBytes('<< /Type /Catalog /Pages 2 0 R >>');
    objetos[1] = paraBytes(`<< /Type /Pages /Kids [${idsPaginas.map((id) => `${id} 0 R`).join(' ')}] /Count ${idsPaginas.length} >>`);

    const partes = [paraBytes('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n')];
    const offsets = [];
    let posicao = partes[0].length;

    for (let i = 0; i < objetos.length; i++) {
        const cabecalho = paraBytes(`${i + 1} 0 obj\n`);
        const rodape = paraBytes('\nendobj\n');
        offsets.push(posicao);
        partes.push(cabecalho, objetos[i], rodape);
        posicao += cabecalho.length + objetos[i].length + rodape.length;
    }

    const inicioXref = posicao;
    let xref = `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
    for (const offset of offsets) xref += `${String(offset).padStart(10, '0')} 00000 n \n`;
    partes.push(paraBytes(xref));
    partes.push(paraBytes(`trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${inicioXref}\n%%EOF\n`));

    return juntar(partes);
}


// ── ZOOM (fonte do roteiro) ─────────────────────────────────
let zoomFonte = 12;

function aplicarZoom() {
    const page = api.$container[0]?.querySelector('#fv-page');
    if (page) page.style.fontSize = zoomFonte + 'pt';
}

// Registrado uma vez (o visor permanece montado no app).
// ⚠️ No desktop o Ctrl+= também é o zoom do Trilium/Electron: se conflitar,
// remover estes atalhos (os botões −/+ continuam).
document.addEventListener('keydown', (e) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    if (e.key === '=' || e.key === '+') { e.preventDefault(); zoomFonte = Math.min(24, zoomFonte + 1); aplicarZoom(); }
    else if (e.key === '-') { e.preventDefault(); zoomFonte = Math.max(8, zoomFonte - 1); aplicarZoom(); }
    else if (e.key === '0') { e.preventDefault(); zoomFonte = 12; aplicarZoom(); }
});

// Esc sai do modo foco (sem roubar o Esc de um campo de texto/editor)
document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const root = api.$container[0]?.querySelector('#fv-root');
    if (!root || !root.classList.contains('fv-foco')) return;
    const alvo = document.activeElement;
    const emCampo = alvo && (alvo.tagName === 'INPUT' || alvo.tagName === 'TEXTAREA' || alvo.tagName === 'SELECT' || alvo.isContentEditable);
    if (!emCampo) {
        root.classList.remove('fv-foco');
        root.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
});


// ── 8. RENDERIZAÇÃO ───────────────────────────────────────────────────────────
async function renderizar() {
    try {
        if (observerCenas) { observerCenas.disconnect(); observerCenas = null; }

        const notaMae  = api.originEntity;
        const filhas   = await notaMae.getChildNotes();
        const candidatas = filhas.filter(ehRascunho);

        const idSalvo = notaMae.getLabelValue('fountainDraft');
        const rascunho = candidatas.find((n) => n.noteId === idSalvo)
            || candidatas.find((n) => n.hasLabel('fountainDraft'))
            || candidatas[0];

        if (!rascunho) {
            api.$container.html(`
                <div style="padding:24px;font-family:monospace;color:var(--main-text-color);line-height:1.8">
                    ⚠ Nenhuma nota de rascunho encontrada.<br>
                    Crie uma nota filha do tipo <b>text</b> ou <b>code</b> dentro desta nota.<br>
                    <span style="opacity:.6">Dica: com várias notas, use o label <b>#fountainDraft</b> na nota desejada.</span>
                </div>
            `);
            return;
        }

        const complemento = await rascunho.getNoteComplement();
        const ehHtml = rascunho.type === 'text' || (rascunho.mime || '').includes('html');
        const textoCru = ehHtml
            ? htmlParaTexto(complemento.content || '')
            : String(complemento.content || '');

        const resultado   = Fountain.parse(textoCru, true); // true = retorna tokens
        const nomeArquivo = nomeSeguro(notaMae.title || rascunho.title);
        const stats       = calcularStats(resultado.tokens || []);

        const seletorRascunho = candidatas.length > 1 ? `
            <select id="fv-select-rascunho" title="Escolher a nota de rascunho">
                ${candidatas.map((n) => `
                    <option value="${n.noteId}"${n.noteId === rascunho.noteId ? ' selected' : ''}>
                        ${escaparHtml(n.title)}
                    </option>`).join('')}
            </select>` : '';

        const listaCenas = stats.cenasList.map((c, i) => `
            <li><a href="#cena-${i}" data-cena="${i}">
                <span class="fv-num">${String(i + 1).padStart(2, '0')}</span><span class="fv-txt">${escaparHtml(c)}</span>
            </a></li>`).join('');

        const listaPersonagens = stats.ranking.map(([nome, n]) => `
            <li><span class="fv-item" title="${escaparHtml(nome)}">
                <span class="fv-char-nome">${escaparHtml(nome)}</span>
                <span class="fv-char-count">${n}</span>
            </span></li>`).join('');

        const listaLocais = stats.locais.map(({ local, n }) => `
            <li><span class="fv-item" title="${escaparHtml(local)}">
                <span class="fv-char-nome">${escaparHtml(local)}</span>
                <span class="fv-char-count">${n}</span>
            </span></li>`).join('');

        const listaAtos = stats.atos.map((a, i) => `
            <li><a href="#sec-${i}" data-ato="${i}">${escaparHtml(a)}</a></li>`).join('');

        api.$container.html(`
            <style>${CSS}</style>
            <div id="fv-root">
                <button id="fv-btn-foco-sair" title="Voltar ao modo normal">✕ Sair do foco</button>
                <div id="fv-toolbar">
                    <div id="fv-toolbar-esq">
                        <span id="fv-aviso-f5">⟳ F5 também atualiza</span>
                        ${seletorRascunho}
                    </div>
                    <div id="fv-toolbar-dir">
                        <span class="fv-zoom-grupo">
                            <button id="fv-btn-zoom-out" class="fv-btn-peq" title="Diminuir fonte (Ctrl+-)">−</button>
                            <button id="fv-btn-zoom-reset" class="fv-btn-peq fv-zoom-reset" title="Fonte padrão (Ctrl+0)">100%</button>
                            <button id="fv-btn-zoom-in" class="fv-btn-peq" title="Aumentar fonte (Ctrl+=)">+</button>
                        </span>
                        <button id="fv-btn-foco" class="fv-btn" title="Só o roteiro (sem sidebar)">⛶ Foco</button>
                        <button id="fv-btn-html" class="fv-btn" title="Baixar o roteiro em HTML formatado">📄 HTML</button>
                        <button id="fv-btn-import" class="fv-btn" title="Importar um arquivo .fountain para o rascunho">⬆ Importar</button>
                        <button id="fv-btn-refresh" class="fv-btn" title="Recarregar o rascunho">⟳ Atualizar</button>
                        <button id="fv-btn-pdf" class="fv-btn" title="Baixar o roteiro em PDF (A4, Courier)">📄 PDF</button>
                        ${ehElectron ? '' : '<button id="fv-btn-print" class="fv-btn" title="Abrir a impressão do navegador">🖨 Imprimir</button>'}
                        <button id="fv-btn-download" class="fv-btn" title="Baixar o texto Fountain">📥 .fountain</button>
                    </div>
                </div>
                <div id="fv-stats">
                    <span title="Estimativa por linhas (padrão WGA: ~55 linhas/página)">📄 <b>${stats.paginas}</b> pág.</span>
                    <span>⏱ ~<b>${stats.duracao}</b> min</span>
                    <span>🎬 <b>${stats.cenas}</b> cenas</span>
                    <span>💬 <b>${stats.personagens}</b> personagens</span>
                    <span>🗣 <b>${stats.pctDialogo}%</b> diálogo</span>
                    <span>📝 <b>${stats.palavras.toLocaleString('pt-BR')}</b> palavras</span>
                </div>
                <div id="fv-body">
                    <nav id="fv-sidebar">
                        <div class="fv-section-header" data-alvo="cenas">
                            🎬 CENAS
                            <span class="fv-toggle">${estadoSidebar.cenas ? '▼' : '▶'}</span>
                        </div>
                        <ul class="fv-list${estadoSidebar.cenas ? '' : ' collapsed'}" id="fv-list-cenas">
                            ${listaCenas}
                        </ul>
                        <div class="fv-section-header" data-alvo="personagens">
                            👥 PERSONAGENS
                            <span class="fv-toggle">${estadoSidebar.personagens ? '▼' : '▶'}</span>
                        </div>
                        <ul class="fv-list${estadoSidebar.personagens ? '' : ' collapsed'}" id="fv-list-personagens">
                            ${listaPersonagens}
                        </ul>
                        <div class="fv-section-header" data-alvo="locais">
                            📍 LOCAIS
                            <span class="fv-toggle">${estadoSidebar.locais ? '▼' : '▶'}</span>
                        </div>
                        <ul class="fv-list${estadoSidebar.locais ? '' : ' collapsed'}" id="fv-list-locais">
                            ${listaLocais}
                        </ul>
                        <div class="fv-section-header" data-alvo="atos">
                            📑 ATOS
                            <span class="fv-toggle">${estadoSidebar.atos ? '▼' : '▶'}</span>
                        </div>
                        <ul class="fv-list${estadoSidebar.atos ? '' : ' collapsed'}" id="fv-list-atos">
                            ${listaAtos || '<li><span class="fv-item" style="opacity:.5">Nenhum ato (use # Ato N)</span></li>'}
                        </ul>
                    </nav>
                    <div id="fv-page">
                        ${resultado.html.title_page
                            ? resultado.html.title_page + '\n<hr />'
                            : ''}
                        ${resultado.html.script}
                    </div>
                </div>
            </div>
        `);

        // ── Ações da barra ──
        api.$container.find('#fv-btn-refresh').on('click', () => renderizar());

        api.$container.find('#fv-btn-pdf').on('click', () => {
            try {
                const bytes = pdfMontar(pdfGerar(resultado.tokens || []));
                const base64 = bytesParaBase64(bytes);
                baixarArquivo(nomeArquivo + '.pdf', 'data:application/pdf;base64,' + base64, base64);
                avisar('PDF gerado.');
            } catch (e) {
                avisar('Não foi possível gerar o PDF.');
            }
        });

        api.$container.find('#fv-btn-print').on('click', () => {
            const corpo = (resultado.html.title_page
                ? resultado.html.title_page + '\n<hr />'
                : '') + resultado.html.script;
            imprimirRoteiro(resultado.title || notaMae.title || rascunho.title, corpo);
        });

        api.$container.find('#fv-btn-download').on('click', () => {
            const base64 = textoParaBase64(textoCru);
            baixarArquivo(nomeArquivo + '.fountain', 'data:text/plain;charset=utf-8;base64,' + base64, base64);
        });

        // ── Zoom ──
        api.$container.find('#fv-btn-zoom-out').on('click', () => { zoomFonte = Math.max(8, zoomFonte - 1); aplicarZoom(); });
        api.$container.find('#fv-btn-zoom-in').on('click', () => { zoomFonte = Math.min(24, zoomFonte + 1); aplicarZoom(); });
        api.$container.find('#fv-btn-zoom-reset').on('click', () => { zoomFonte = 12; aplicarZoom(); });

        // ── Foco (só o roteiro) ──
        const alternarFoco = (ativo) => {
            const root = api.$container[0]?.querySelector('#fv-root');
            if (!root) return;
            const ligar = ativo === undefined ? !root.classList.contains('fv-foco') : ativo;
            root.classList.toggle('fv-foco', ligar);
            // rola o topo do root à vista (no foco mostra a página; ao sair mostra a toolbar)
            root.scrollIntoView({ behavior: 'smooth', block: 'start' });
        };
        api.$container.find('#fv-btn-foco').on('click', () => alternarFoco());
        api.$container.find('#fv-btn-foco-sair').on('click', () => alternarFoco(false));

        // ── Export HTML ──
        api.$container.find('#fv-btn-html').on('click', () => {
            try {
                const corpo = (resultado.html.title_page
                    ? resultado.html.title_page + '\n<hr />'
                    : '') + resultado.html.script;
                const doc = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>${escaparHtml(resultado.title || notaMae.title || rascunho.title)}</title>
<style>${CSS_IMPRESSAO}</style>
</head>
<body>${corpo}</body>
</html>`;
                const base64 = textoParaBase64(doc);
                baixarArquivo(nomeArquivo + '.html', 'data:text/html;charset=utf-8;base64,' + base64, base64);
                avisar('HTML gerado.');
            } catch (e) {
                avisar('Não foi possível gerar o HTML.');
            }
        });

        // ── Importar .fountain para o rascunho ──
        const inputArquivo = document.createElement('input');
        inputArquivo.type = 'file';
        inputArquivo.accept = '.fountain,text/plain';
        inputArquivo.addEventListener('change', async () => {
            const arquivo = inputArquivo.files && inputArquivo.files[0];
            inputArquivo.value = '';
            if (!arquivo) return;
            try {
                const texto = await arquivo.text();
                if (!confirm('Substituir o rascunho atual pelo conteúdo de "' + arquivo.name + '"?')) return;
                await api.runOnBackend((noteId, conteudo) => {
                    api.getNote(noteId).setContent(conteudo);
                }, [rascunho.noteId, texto]);
                avisar('Rascunho importado.');
                renderizar();
            } catch (e) {
                avisar('Não foi possível importar: ' + ((e && e.message) || e));
            }
        });
        api.$container.find('#fv-btn-import').on('click', () => inputArquivo.click());

        // ── Sidebar: navegação pelos atos ──
        api.$container.find('.fv-list a[href^="#sec-"]').on('click', function (e) {
            e.preventDefault();
            const id = $(this).attr('href').slice(1);
            const alvo = api.$container[0].querySelector('#' + id);
            if (alvo) alvo.scrollIntoView({ behavior: 'smooth', block: 'start' });
            marcarAtivo(api.$container[0], id);
        });

        // ── Seletor de rascunho ──
        api.$container.find('#fv-select-rascunho').on('change', async function () {
            const id = $(this).val();
            try {
                await api.runOnBackend((notaId, rascunhoId) => {
                    api.getNote(notaId).setLabel('fountainDraft', rascunhoId);
                }, [notaMae.noteId, id]);
                renderizar();
            } catch (e) {
                avisar('Não foi possível salvar a escolha do rascunho.');
            }
        });

        // ── Sidebar: recolher/expandir seções ──
        api.$container.find('.fv-section-header').on('click', function () {
            const alvo = $(this).data('alvo');
            const aberto = !estadoSidebar[alvo];
            estadoSidebar[alvo] = aberto;
            api.$container.find('#fv-list-' + alvo).toggleClass('collapsed', !aberto);
            $(this).find('.fv-toggle').text(aberto ? '▼' : '▶');
        });

        // ── Sidebar: navegação pelas cenas ──
        api.$container.find('.fv-list a[href^="#cena-"]').on('click', function (e) {
            e.preventDefault();
            const id = $(this).attr('href').slice(1);
            const alvo = api.$container[0].querySelector('#' + id);
            if (alvo) alvo.scrollIntoView({ behavior: 'smooth', block: 'start' });
            marcarCenaAtiva(id);
        });

        configurarScrollSpy();
        aplicarZoom();

    } catch (err) {
        api.$container.html(
            `<div style="padding:24px;color:red;font-family:monospace">
                Erro: ${escaparHtml(err.message)}
             </div>`
        );
    }
}

renderizar();
