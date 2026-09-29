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
// Hoista <style> de qualquer HTML injetado para o <head> — render notes podem
// ignorar style inline (o layout não pode depender do tema, ex.: Folio).
(function () {
    if (typeof document === 'undefined' || typeof $ === 'undefined' || !$.fn) return;
    // Instala UMA vez por página: o script pode re-executar (refresh do render note)
    // e os wrappers não podem se acumular (senão o CSS duplica e a corrente de
    // patches entre plugins cresce a cada refresh).
    if (window.__fvPatched) return;
    window.__fvPatched = true;

    const getStyleEl = () => {
        let el = document.getElementById('fv-styles');
        if (!el) {
            el = document.createElement('style');
            el.id = 'fv-styles';
            document.head.appendChild(el);
        }
        return el;
    };
    const hoist = (html) => {
        const str = String(html);
        if (!str.includes('<style>')) return str;
        const styleEl = getStyleEl();
        const re = /<style>([\s\S]*?)<\/style>/g;
        let css = '';
        let m;
        while ((m = re.exec(str)) !== null) css += '\n' + m[1];
        // Idempotente: substitui o conteúdo em vez de acumular a cada render
        if (styleEl.textContent !== css) styleEl.textContent = css;
        return str.replace(re, '');
    };
    const origHtml = $.fn.html;
    const origAppend = $.fn.append;
    $.fn.html = function (arg) {
        if (typeof arg === 'string' && arg.includes('<style>')) arg = hoist(arg);
        return origHtml.apply(this, [arg]);
    };
    $.fn.append = function () {
        const args = Array.prototype.slice.call(arguments);
        if (typeof args[0] === 'string' && args[0].includes('<style>')) args[0] = hoist(args[0]);
        return origAppend.apply(this, args);
    };
})();



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
        boneyard:              /(^\/\*|^\*\/)$/gm,
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
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
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
            .replace(/^[ \t\u00a0]+$/gm, '')   // linhas só com espaço/NBSP não separam blocos
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
                if (text.endsWith('  ')) { tokens.push({ type: 'action', text }); continue; } // dois espaços = ação forçada
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
                    title = t.text.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]*>/g, '');
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
                    scriptHtml.push(`<h3 id="cena-${cenaIdx++}"${t.scene_number ? ` data-scene="${escaparHtml(t.scene_number)}"` : ''}>${t.text}</h3>`);
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
    opacity: 0.75;
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
    max-height: calc(100vh - 40px); /* a sidebar inteira rola em telas baixas */
    background: var(--accented-background-color, var(--main-background-color));
    border: 1px solid var(--main-border-color);
    border-radius: 6px;
    overflow: auto;
  }

  #fv-root .fv-section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 9px 12px;
    width: 100%;
    background: none;
    color: var(--main-text-color);
    border: 0;
    border-bottom: 1px solid var(--main-border-color);
    text-align: left;
    font-family: monospace;
    font-size: 13px;
    font-weight: bold;
    opacity: 0.85;
    cursor: pointer;
    user-select: none;
  }
  #fv-root .fv-section-header:hover { opacity: 1; }
  #fv-root .fv-section-header:focus-visible {
    outline: 2px solid var(--main-accent-color, var(--active-item-background-color, #4a90d9));
    outline-offset: -2px;
  }
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
  #fv-root .fv-num { color: var(--muted-text-color, #767676); flex-shrink: 0; }
  #fv-root .fv-txt { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
  #fv-root .fv-char-nome { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
  #fv-root .fv-char-count { margin-left: auto; color: var(--muted-text-color, #767676); flex-shrink: 0; }

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
    #fv-root #fv-page { border: none; box-shadow: none; padding: 0; max-width: none; color: #000; background: #fff; }
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
    #fv-root .fv-btn { flex: 1 1 auto; padding: 9px 8px; font-size: 12px; text-align: center; min-height: 44px; }
    #fv-root .fv-btn-peq { flex: 0 0 auto; padding: 9px 8px; min-height: 44px; }
    #fv-root .fv-section-header { padding: 12px; min-height: 44px; }
    #fv-root .fv-list li a, #fv-root .fv-list li .fv-item { padding: 10px 12px; font-size: 13px; }
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

  /* ── Acessibilidade: menos movimento quando o sistema pede ── */
  @media (prefers-reduced-motion: reduce) {
    #fv-root *, #fv-root *::before, #fv-root *::after {
      transition: none !important;
      animation: none !important;
      scroll-behavior: auto !important;
    }
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
    const seguro = (titulo || 'roteiro')
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
    return seguro || 'roteiro';
}

/** Aviso nativo do Trilium (com fallback no console quando indisponível) */
function avisar(mensagem) {
    try { api.showMessage(mensagem); return; } catch (e) { /* opcional */ }
    try { console.warn('[Fountain]', mensagem); } catch (e) { /* sem console */ }
}

// ── i18n (segue o idioma do Trilium; palpite síncrono e confirmação no boot) ──
const FV_I18N = {
    pt: {
        f5: '⟳ F5 também atualiza',
        selectRascunho: 'Escolher a nota de rascunho',
        sairFoco: '✕ Sair do foco',
        sairFocoTitle: 'Voltar ao modo normal',
        zoomOutTitle: 'Diminuir fonte (Ctrl+-)',
        zoomResetTitle: 'Fonte padrão (Ctrl+0)',
        zoomInTitle: 'Aumentar fonte (Ctrl+=)',
        zoomOutAria: 'Diminuir fonte',
        zoomResetAria: 'Fonte padrão',
        zoomInAria: 'Aumentar fonte',
        foco: '⛶ Foco',
        focoTitle: 'Só o roteiro (sem sidebar)',
        html: '📃 HTML',
        htmlTitle: 'Baixar o roteiro em HTML formatado',
        importar: '📂 Importar',
        importarTitle: 'Importar um arquivo .fountain para o rascunho',
        atualizar: '⟳ Atualizar',
        atualizarTitle: 'Recarregar o rascunho',
        atualizando: '⏳ Atualizando…',
        pdf: '📄 PDF',
        pdfTitle: 'Baixar o roteiro em PDF (A4, Courier)',
        imprimir: '🖨 Imprimir',
        imprimirTitle: 'Abrir a impressão do navegador',
        baixarFountain: '📥 .fountain',
        baixarFountainTitle: 'Baixar o texto Fountain',
        pagTitle: 'Estimativa por linhas (padrão WGA: ~55 linhas/página)',
        pag: 'pág.',
        min: 'min',
        cenas: 'cenas',
        personagens: 'personagens',
        dialogo: 'diálogo',
        palavras: 'palavras',
        indice: 'Índice do roteiro',
        secCenas: '🎬 CENAS',
        secPersonagens: '👥 PERSONAGENS',
        secLocais: '📍 LOCAIS',
        secAtos: '📑 ATOS',
        vazio: '⚠ Nenhuma nota de rascunho encontrada.<br>Crie uma nota filha do tipo <b>text</b> ou <b>code</b> dentro desta nota.<br><span style="opacity:.6">Dica: com várias notas, use o label <b>#fountainDraft</b> na nota desejada.</span>',
        erroCarregar: '⚠ Erro ao carregar o roteiro: {msg}',
        tentar: '⟳ Tentar de novo',
        erroImpressao: 'Não foi possível abrir a impressão.',
        pdfGerado: 'PDF gerado.',
        erroPdf: 'Não foi possível gerar o PDF.',
        fountainBaixado: 'Fountain baixado.',
        htmlGerado: 'HTML gerado.',
        erroHtml: 'Não foi possível gerar o HTML.',
        importConfirm: 'Substituir o rascunho atual pelo conteúdo de "{nome}"?',
        importado: 'Rascunho importado.',
        erroImportar: 'Não foi possível importar: {msg}',
        erroRascunho: 'Não foi possível salvar a escolha do rascunho.',
    },
    en: {
        f5: '⟳ F5 also refreshes',
        selectRascunho: 'Choose the draft note',
        sairFoco: '✕ Exit focus',
        sairFocoTitle: 'Back to normal view',
        zoomOutTitle: 'Smaller font (Ctrl+-)',
        zoomResetTitle: 'Default font (Ctrl+0)',
        zoomInTitle: 'Larger font (Ctrl+=)',
        zoomOutAria: 'Smaller font',
        zoomResetAria: 'Default font',
        zoomInAria: 'Larger font',
        foco: '⛶ Focus',
        focoTitle: 'Script only (no sidebar)',
        html: '📃 HTML',
        htmlTitle: 'Download the script as formatted HTML',
        importar: '📂 Import',
        importarTitle: 'Import a .fountain file into the draft',
        atualizar: '⟳ Refresh',
        atualizarTitle: 'Reload the draft',
        atualizando: '⏳ Refreshing…',
        pdf: '📄 PDF',
        pdfTitle: 'Download the script as PDF (A4, Courier)',
        imprimir: '🖨 Print',
        imprimirTitle: 'Open the browser print dialog',
        baixarFountain: '📥 .fountain',
        baixarFountainTitle: 'Download the Fountain text',
        pagTitle: 'Line-based estimate (WGA style: ~55 lines/page)',
        pag: 'pg.',
        min: 'min',
        cenas: 'scenes',
        personagens: 'characters',
        dialogo: 'dialogue',
        palavras: 'words',
        indice: 'Script index',
        secCenas: '🎬 SCENES',
        secPersonagens: '👥 CHARACTERS',
        secLocais: '📍 LOCATIONS',
        secAtos: '📑 ACTS',
        vazio: '⚠ No draft note found.<br>Create a child note of type <b>text</b> or <b>code</b> under this one.<br><span style="opacity:.6">Tip: with several notes, use the <b>#fountainDraft</b> label on the desired note.</span>',
        erroCarregar: '⚠ Error loading the script: {msg}',
        tentar: '⟳ Try again',
        erroImpressao: 'Could not open the print dialog.',
        pdfGerado: 'PDF generated.',
        erroPdf: 'Could not generate the PDF.',
        fountainBaixado: 'Fountain downloaded.',
        htmlGerado: 'HTML generated.',
        erroHtml: 'Could not generate the HTML.',
        importConfirm: 'Replace the current draft with the contents of "{nome}"?',
        importado: 'Draft imported.',
        erroImportar: 'Could not import: {msg}',
        erroRascunho: 'Could not save the draft choice.',
    },
};

let fvLocale = (() => {
    try { return String(navigator.language || '').toLowerCase().startsWith('en') ? 'en' : 'pt'; } catch (e) { return 'pt'; }
})();

/** Traduz com interpolação {var} — chamado de tr() para não colidir com mapas */
function tr(chave, vars) {
    const dic = FV_I18N[fvLocale] || FV_I18N.pt;
    let txt = dic[chave] || FV_I18N.pt[chave] || chave;
    if (vars) for (const k of Object.keys(vars)) txt = txt.replace('{' + k + '}', vars[k]);
    return txt;
}
function fvCultura() { return fvLocale === 'en' ? 'en-US' : 'pt-BR'; }

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
    let emBoneyard = false;

    for (const t of tokensEmOrdem(tokens)) {
        // Conteúdo entre /* e */ (boneyard) não entra nas estatísticas
        if (t.type === 'boneyard_begin') { emBoneyard = true; continue; }
        if (t.type === 'boneyard_end')   { emBoneyard = false; continue; }
        if (emBoneyard) continue;

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
            avisar(tr('erroImpressao'));
        }
    };

    // Rede de segurança: mesmo que o load/onafterprint nunca disparem, o iframe não fica órfão
    setTimeout(remover, 15 * 60 * 1000);

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

    let emBoneyard = false;
    for (const t of ordem) {
        // Boneyard (/* … */) fica fora do PDF (só o HTML o esconde em comentário)
        if (t.type === 'boneyard_begin') { emBoneyard = true; continue; }
        if (t.type === 'boneyard_end')   { emBoneyard = false; continue; }
        if (emBoneyard) continue;
        if (PDF_TIPOS_TITULO.has(t.type)) continue;
        const texto = pdfLimparToken(t);

        switch (t.type) {
            case 'scene_heading':
                if (linha > 0) pular(1);
                if (t.scene_number) {
                    // número de cena na margem, como no HTML (paridade de produção)
                    if (linha >= PDF_LINHAS_PAGINA) { fecharPagina(); linha = 0; }
                    const yNum = PDF_PAGINA.altura - PDF_MARGEM - PDF_FONTE - linha * PDF_ALTURA_LINHA;
                    addTexto(t.scene_number, PDF_MARGEM - 26, yNum, 9);
                }
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
    if (!paginas.length) paginas.push([]); // rascunho vazio ainda gera um PDF de 1 página válido
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
let zoomUsuario = false; // até o usuário mexer no zoom, o CSS decide (11pt no mobile)

function aplicarZoom() {
    const page = api.$container[0]?.querySelector('#fv-page');
    if (page) page.style.fontSize = zoomUsuario ? zoomFonte + 'pt' : '';
    const rotulo = api.$container[0]?.querySelector('#fv-btn-zoom-reset');
    if (rotulo) rotulo.textContent = Math.round((zoomFonte / 12) * 100) + '%';
}

/** Rola até o elemento respeitando prefers-reduced-motion */
function rolarAte(alvo) {
    if (!alvo) return;
    const reduzir = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    alvo.scrollIntoView({ behavior: reduzir ? 'auto' : 'smooth', block: 'start' });
}

// Atalhos globais (zoom Ctrl+=/−/0, F5 e Esc): só agem com o visor montado no
// documento — fora dele, não roubam teclas do app (Ctrl+= é o zoom do Electron).
// Re-executar o script troca o listener (remove o anterior pelo window), então
// não acumula cópias e as closures apontam sempre para o render atual.
function fvTratarAtalhos(e) {
    const root = api.$container[0]?.querySelector('#fv-root');
    if (!root || !document.body.contains(root)) return;

    if ((e.ctrlKey || e.metaKey) && !e.altKey) {
        if (e.key === '=' || e.key === '+') { e.preventDefault(); zoomFonte = Math.min(24, zoomFonte + 1); zoomUsuario = true; aplicarZoom(); return; }
        if (e.key === '-') { e.preventDefault(); zoomFonte = Math.max(8, zoomFonte - 1); zoomUsuario = true; aplicarZoom(); return; }
        if (e.key === '0') { e.preventDefault(); zoomFonte = 12; zoomUsuario = false; aplicarZoom(); return; }
        return;
    }

    if (e.key === 'F5' && !e.shiftKey) { e.preventDefault(); renderizar(); return; }

    if (e.key === 'Escape') {
        if (!root.classList.contains('fv-foco')) return;
        const alvo = document.activeElement;
        const emCampo = alvo && (alvo.tagName === 'INPUT' || alvo.tagName === 'TEXTAREA' || alvo.tagName === 'SELECT' || alvo.isContentEditable);
        if (!emCampo) {
            root.classList.remove('fv-foco');
            rolarAte(root);
        }
    }
}
if (window.__fvKeydown) document.removeEventListener('keydown', window.__fvKeydown);
window.__fvKeydown = fvTratarAtalhos;
document.addEventListener('keydown', fvTratarAtalhos);


// ── 8. RENDERIZAÇÃO ───────────────────────────────────────────────────────────
let renderizando = false;

async function renderizar() {
    if (renderizando) return; // evita renders concorrentes (ex.: clique duplo no ⟳)
    renderizando = true;
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
                    ${tr('vazio')}
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
        const nomeArquivo = nomeSeguro(resultado.title || rascunho.title || notaMae.title);
        const stats       = calcularStats(resultado.tokens || []);

        const seletorRascunho = candidatas.length > 1 ? `
            <select id="fv-select-rascunho" title="${tr('selectRascunho')}">
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
                <button id="fv-btn-foco-sair" title="${tr('sairFocoTitle')}">${tr('sairFoco')}</button>
                <div id="fv-toolbar">
                    <div id="fv-toolbar-esq">
                        <span id="fv-aviso-f5">${tr('f5')}</span>
                        ${seletorRascunho}
                    </div>
                    <div id="fv-toolbar-dir">
                        <span class="fv-zoom-grupo">
                            <button id="fv-btn-zoom-out" class="fv-btn-peq" title="${tr('zoomOutTitle')}" aria-label="${tr('zoomOutAria')}">−</button>
                            <button id="fv-btn-zoom-reset" class="fv-btn-peq fv-zoom-reset" title="${tr('zoomResetTitle')}" aria-label="${tr('zoomResetAria')}">${Math.round((zoomFonte / 12) * 100)}%</button>
                            <button id="fv-btn-zoom-in" class="fv-btn-peq" title="${tr('zoomInTitle')}" aria-label="${tr('zoomInAria')}">+</button>
                        </span>
                        <button id="fv-btn-foco" class="fv-btn" title="${tr('focoTitle')}">${tr('foco')}</button>
                        <button id="fv-btn-html" class="fv-btn" title="${tr('htmlTitle')}">${tr('html')}</button>
                        <button id="fv-btn-import" class="fv-btn" title="${tr('importarTitle')}">${tr('importar')}</button>
                        <button id="fv-btn-refresh" class="fv-btn" title="${tr('atualizarTitle')}">${tr('atualizar')}</button>
                        <button id="fv-btn-pdf" class="fv-btn" title="${tr('pdfTitle')}">${tr('pdf')}</button>
                        ${ehElectron ? '' : `<button id="fv-btn-print" class="fv-btn" title="${tr('imprimirTitle')}">${tr('imprimir')}</button>`}
                        <button id="fv-btn-download" class="fv-btn" title="${tr('baixarFountainTitle')}">${tr('baixarFountain')}</button>
                    </div>
                </div>
                <div id="fv-stats">
                    <span title="${tr('pagTitle')}">📄 <b>${stats.paginas}</b> ${tr('pag')}</span>
                    <span>⏱ ~<b>${stats.duracao}</b> ${tr('min')}</span>
                    <span>🎬 <b>${stats.cenas}</b> ${tr('cenas')}</span>
                    <span>💬 <b>${stats.personagens}</b> ${tr('personagens')}</span>
                    <span>🗣 <b>${stats.pctDialogo}%</b> ${tr('dialogo')}</span>
                    <span>📝 <b>${stats.palavras.toLocaleString(fvCultura())}</b> ${tr('palavras')}</span>
                </div>
                <div id="fv-body">
                    <nav id="fv-sidebar" aria-label="${tr('indice')}">
                        <button type="button" class="fv-section-header" data-alvo="cenas" aria-expanded="${estadoSidebar.cenas}" aria-controls="fv-list-cenas">
                            ${tr('secCenas')} (${stats.cenas})
                            <span class="fv-toggle" aria-hidden="true">${estadoSidebar.cenas ? '▼' : '▶'}</span>
                        </button>
                        <ul class="fv-list${estadoSidebar.cenas ? '' : ' collapsed'}" id="fv-list-cenas">
                            ${listaCenas}
                        </ul>
                        <button type="button" class="fv-section-header" data-alvo="personagens" aria-expanded="${estadoSidebar.personagens}" aria-controls="fv-list-personagens">
                            ${tr('secPersonagens')} (${stats.personagens})
                            <span class="fv-toggle" aria-hidden="true">${estadoSidebar.personagens ? '▼' : '▶'}</span>
                        </button>
                        <ul class="fv-list${estadoSidebar.personagens ? '' : ' collapsed'}" id="fv-list-personagens">
                            ${listaPersonagens}
                        </ul>
                        <button type="button" class="fv-section-header" data-alvo="locais" aria-expanded="${estadoSidebar.locais}" aria-controls="fv-list-locais">
                            ${tr('secLocais')} (${stats.locais.length})
                            <span class="fv-toggle" aria-hidden="true">${estadoSidebar.locais ? '▼' : '▶'}</span>
                        </button>
                        <ul class="fv-list${estadoSidebar.locais ? '' : ' collapsed'}" id="fv-list-locais">
                            ${listaLocais}
                        </ul>
                        <button type="button" class="fv-section-header" data-alvo="atos" aria-expanded="${estadoSidebar.atos}" aria-controls="fv-list-atos">
                            ${tr('secAtos')} (${stats.atos.length})
                            <span class="fv-toggle" aria-hidden="true">${estadoSidebar.atos ? '▼' : '▶'}</span>
                        </button>
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
        api.$container.find('#fv-btn-refresh').on('click', function () {
            $(this).prop('disabled', true).text(tr('atualizando'));
            renderizar();
        });

        api.$container.find('#fv-btn-pdf').on('click', function () {
            const $btn = $(this);
            if ($btn.prop('disabled')) return;
            // Deixa o navegador pintar o "gerando" antes da geração (que é síncrona)
            $btn.prop('disabled', true).text('⏳ …');
            setTimeout(() => {
                try {
                    const bytes = pdfMontar(pdfGerar(resultado.tokens || []));
                    const base64 = bytesParaBase64(bytes);
                    baixarArquivo(nomeArquivo + '.pdf', 'data:application/pdf;base64,' + base64, base64);
                    avisar(tr('pdfGerado'));
                } catch (e) {
                    avisar(tr('erroPdf'));
                } finally {
                    $btn.prop('disabled', false).text(tr('pdf'));
                }
            }, 0);
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
            avisar(tr('fountainBaixado'));
        });

        // ── Zoom ──
        api.$container.find('#fv-btn-zoom-out').on('click', () => { zoomFonte = Math.max(8, zoomFonte - 1); zoomUsuario = true; aplicarZoom(); });
        api.$container.find('#fv-btn-zoom-in').on('click', () => { zoomFonte = Math.min(24, zoomFonte + 1); zoomUsuario = true; aplicarZoom(); });
        api.$container.find('#fv-btn-zoom-reset').on('click', () => { zoomFonte = 12; zoomUsuario = false; aplicarZoom(); });

        // ── Foco (só o roteiro) ──
        const alternarFoco = (ativo) => {
            const root = api.$container[0]?.querySelector('#fv-root');
            if (!root) return;
            const ligar = ativo === undefined ? !root.classList.contains('fv-foco') : ativo;
            root.classList.toggle('fv-foco', ligar);
            // rola o topo do root à vista (no foco mostra a página; ao sair mostra a toolbar)
            rolarAte(root);
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
                avisar(tr('htmlGerado'));
            } catch (e) {
                avisar(tr('erroHtml'));
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
                if (!confirm(tr('importConfirm', { nome: arquivo.name }))) return;
                await api.runOnBackend((noteId, conteudo) => {
                    api.getNote(noteId).setContent(conteudo);
                }, [rascunho.noteId, texto]);
                avisar(tr('importado'));
                renderizar();
            } catch (e) {
                avisar(tr('erroImportar', { msg: (e && e.message) || e }));
            }
        });
        api.$container.find('#fv-btn-import').on('click', () => inputArquivo.click());

        // ── Sidebar: navegação pelos atos ──
        api.$container.find('.fv-list a[href^="#sec-"]').on('click', function (e) {
            e.preventDefault();
            const id = $(this).attr('href').slice(1);
            const alvo = api.$container[0].querySelector('#' + id);
            rolarAte(alvo);
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
                avisar(tr('erroRascunho'));
            }
        });

        // ── Sidebar: recolher/expandir seções ──
        api.$container.find('.fv-section-header').on('click', function () {
            const alvo = $(this).data('alvo');
            const aberto = !estadoSidebar[alvo];
            estadoSidebar[alvo] = aberto;
            $(this).attr('aria-expanded', String(aberto));
            api.$container.find('#fv-list-' + alvo).toggleClass('collapsed', !aberto);
            $(this).find('.fv-toggle').text(aberto ? '▼' : '▶');
        });

        // ── Sidebar: navegação pelas cenas ──
        api.$container.find('.fv-list a[href^="#cena-"]').on('click', function (e) {
            e.preventDefault();
            const id = $(this).attr('href').slice(1);
            const alvo = api.$container[0].querySelector('#' + id);
            rolarAte(alvo);
            marcarAtivo(api.$container[0], id);
        });

        configurarScrollSpy();
        aplicarZoom();

    } catch (err) {
        api.$container.html(`
            <div style="padding:24px;font-family:monospace;color:var(--main-text-color,#222);line-height:1.8">
                ${tr('erroCarregar', { msg: escaparHtml(err.message) })}<br>
                <button id="fv-btn-retry" class="fv-btn" style="margin-top:8px">${tr('tentar')}</button>
            </div>
        `);
        api.$container.find('#fv-btn-retry').on('click', () => renderizar());
    } finally {
        renderizando = false;
    }
}

// Confere o idioma real do Trilium (o palpite pode errar) e re-renderiza se mudar
(async () => {
    try {
        const loc = await api.runOnBackend(() => api.getOption('locale'));
        const novo = String(loc || '').toLowerCase().startsWith('en') ? 'en' : 'pt';
        if (novo !== fvLocale) { fvLocale = novo; renderizar(); }
    } catch (e) { /* mantém o palpite */ }
})();

renderizar();
