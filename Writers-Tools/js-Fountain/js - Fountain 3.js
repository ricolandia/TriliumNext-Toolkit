// ============================================================
// VISOR FOUNTAIN — TriliumNext Notes
// Estrutura esperada:
//   📄 Visor (esta nota — tipo renderNote)
//     └── 📝 Rascunho (filha — tipo text ou code)
//
// Abra Rascunho e Visor em split view.
// Pressione F5 no Visor para atualizar após editar o Rascunho.
// ============================================================


// ── 1. BIBLIOTECA FOUNTAIN ────────────────────────────────────────────────────
const Fountain = (function () {

    const regex = {
        title_page:            /^((?:title|credit|author[s]?|source|notes|draft date|date|contact|copyright)\:)/gim,
        scene_heading:         /^((?:\*{0,3}_?)?(?:(?:int|ext|est|i\/e)[. ]).+)|^(?:\.(?!\.+))(.+)/i,
        scene_number:          / *#(.+)# */,
        transition:            /^((?:FADE (?:TO BLACK|OUT)|CUT TO BLACK)\.|.+ TO\:)|^(?:> *)(.+)/,
        dialogue:              /^([A-Z*_]+[0-9A-Z (._\-')]*)(\^?)?(?:\n(?!\n+))([\s\S]+)/,
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

    const INLINE_ORDER = [
        'underline','italic','bold','bold_italic',
        'italic_underline','bold_underline','bold_italic_underline'
    ];

    const inlineReplace = {
        note:                 '<!-- $1 -->',
        line_break:           '<br />',
        bold_italic_underline:'<span class="bold italic underline">$2</span>',
        bold_underline:       '<span class="bold underline">$2</span>',
        italic_underline:     '<span class="italic underline">$2</span>',
        bold_italic:          '<span class="bold italic">$2</span>',
        bold:                 '<span class="bold">$2</span>',
        italic:               '<span class="italic">$2</span>',
        underline:            '<span class="underline">$2</span>',
    };

    function lexer(text) {
        if (!text) return text;
        text = text
            .replace(regex.note_inline, inlineReplace.note)
            .replace(/\\\*/g, '[STAR]')
            .replace(/\\_/g,  '[UL]')
            .replace(/\n/g,   inlineReplace.line_break);
        for (const key of INLINE_ORDER) {
            if (regex[key].test(text)) text = text.replace(regex[key], inlineReplace[key]);
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
            if (regex.title_page.test(line)) {
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

        for (let i = tokens.length - 1; i >= 0; i--) {
            const t = tokens[i];
            if (t.text !== undefined) t.text = lexer(t.text);

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
                    scriptHtml.push(`<p class="section" data-depth="${t.depth}">${t.text}</p>`);
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
                    scriptHtml.push('<hr />');
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

    return { parse };
})();


// ── 2. CSS ────────────────────────────────────────────────────────────────────
const CSS = `
  * { box-sizing: border-box; }

  #fv-root {
    min-height: 100vh;
    padding: 32px 16px 64px;
  }

  #fv-toolbar {
    max-width: 740px;
    margin: 0 auto 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  #fv-aviso-f5 {
    font-family: monospace;
    font-size: 11px;
    opacity: 0.45;
    user-select: none;
  }

  #fv-btn-download {
    padding: 7px 16px;
    border-radius: 5px;
    border: 1px solid var(--main-border-color);
    cursor: pointer;
    font-size: 12px;
    font-weight: bold;
    background: var(--button-background-color);
    color: var(--button-text-color);
    transition: filter 0.15s;
  }
  #fv-btn-download:hover { filter: brightness(1.15); }

  /* ── Layout: sidebar + página ── */
  #fv-body {
    display: flex;
    align-items: flex-start;
    gap: 20px;
    max-width: 980px;
    margin: 0 auto;
  }

  /* ── Sidebar ── */
  #fv-sidebar {
    width: 200px;
    flex-shrink: 0;
    position: sticky;
    top: 16px;
    background: var(--accented-background-color, var(--main-background-color));
    border: 1px solid var(--main-border-color);
    border-radius: 6px;
    overflow: hidden;
  }

  #fv-sidebar-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    border-bottom: 1px solid var(--main-border-color);
    font-family: monospace;
    font-size: 11px;
    font-weight: bold;
    opacity: 0.7;
    cursor: pointer;
    user-select: none;
  }
  #fv-sidebar-header:hover { opacity: 1; }
  #fv-sidebar-toggle { font-size: 10px; }

  #fv-sidebar-list {
    list-style: none;
    margin: 0;
    padding: 6px 0;
    max-height: 75vh;
    overflow-y: auto;
  }
  #fv-sidebar-list.collapsed { display: none; }

  #fv-sidebar-list li a {
    display: block;
    padding: 5px 12px;
    font-family: monospace;
    font-size: 10px;
    color: var(--text-color);
    text-decoration: none;
    opacity: 0.65;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    transition: opacity 0.15s, background 0.15s;
  }
  #fv-sidebar-list li a:hover {
    opacity: 1;
    background: var(--hover-item-background-color, rgba(128,128,128,0.1));
  }
  #fv-sidebar-list li a.ativa {
    opacity: 1;
    font-weight: bold;
    border-left: 2px solid var(--main-accent-color, #888);
    padding-left: 10px;
  }

  /* ── Stats ── */
  #fv-stats {
    max-width: 980px;
    margin: 0 auto 12px;
    display: flex;
    gap: 20px;
    font-family: monospace;
    font-size: 11px;
    opacity: 0.55;
    user-select: none;
  }
  #fv-stats span b { opacity: 0.9; font-weight: bold; }

  /* ── Toolbar e page: limitados pela sidebar ── */
  #fv-toolbar { max-width: 980px; }
  #fv-page    { flex: 1; min-width: 0; margin: 0; }

  /* Página do roteiro */
  #fv-page {
    font-family: 'Courier Prime', 'Courier New', Courier, monospace;
    font-size: 12pt;
    line-height: 1.2;
    max-width: 740px;
    margin: 0 auto;
    padding: 72px 96px;
    background: var(--main-background-color);
    color: var(--text-color);
    border: 1px solid var(--main-border-color);
    box-shadow: 0 2px 12px rgba(0,0,0,0.12);
  }

  /* ── Title page ── */
  #fv-page h1             { text-align: center; font-size: 14pt; margin: 0 0 0.25em; }
  #fv-page .credit        { text-align: center; margin: 0.1em 0; }
  #fv-page .authors       { text-align: center; margin: 0.1em 0; }
  #fv-page .source        { text-align: center; margin: 0.1em 0; }
  #fv-page .date,
  #fv-page .draft-date    { text-align: center; margin: 0.5em 0 0; }
  #fv-page .contact       { margin-top: 4em; font-size: 10pt; }
  #fv-page .notes,
  #fv-page .copyright     { text-align: center; font-size: 10pt; margin: 0.25em 0; }

  /* Separador title page / script */
  #fv-page hr {
    border: none;
    border-top: 1px solid var(--main-border-color);
    margin: 3em 0;
  }

  /* ── Scene heading ── */
  #fv-page h3 {
    font-size: 12pt;
    font-weight: bold;
    text-transform: uppercase;
    margin: 2.5em 0 0.25em;
  }

  /* ── Action ── */
  #fv-page p.action { margin: 1em 0; }

  /* ── Transition ── */
  #fv-page h2 {
    font-size: 12pt;
    font-weight: normal;
    text-transform: uppercase;
    text-align: right;
    margin: 2em 0;
  }

  /* ── Dialogue wrapper ── */
  #fv-page .dialogue { margin: 1em 0; }

  /* ── Character name ── */
  #fv-page .dialogue h4 {
    font-size: 12pt;
    font-weight: normal;
    text-transform: uppercase;
    margin: 0 0 0 37%;
  }

  /* ── Parenthetical ── */
  #fv-page .dialogue p.parenthetical {
    margin: 0 33% 0 31%;
  }

  /* ── Dialogue line ── */
  #fv-page .dialogue p:not(.parenthetical) {
    margin: 0.1em 20% 0.5em 20%;
  }

  /* ── Dual dialogue ── */
  #fv-page .dual-dialogue {
    display: flex;
    gap: 2%;
    margin: 1em 0;
  }
  #fv-page .dual-dialogue .dialogue        { flex: 1; margin: 0; }
  #fv-page .dual-dialogue .dialogue h4     { margin-left: 0; }
  #fv-page .dual-dialogue .dialogue p:not(.parenthetical) { margin-left: 0; margin-right: 0; }
  #fv-page .dual-dialogue .dialogue p.parenthetical       { margin-left: 0; margin-right: 5%; }

  /* ── Centered ── */
  #fv-page p.centered { text-align: center; margin: 1em 0; }

  /* ── Section / Synopsis ── */
  #fv-page p.section  { color: var(--muted-text-color, #888); font-style: italic; margin: 1.5em 0 0.25em; }
  #fv-page p.synopsis { color: var(--muted-text-color, #888); font-style: italic; margin-left: 8%; }

  /* ── Ênfase inline ── */
  #fv-page .bold       { font-weight: bold; }
  #fv-page .italic     { font-style: italic; }
  #fv-page .underline  { text-decoration: underline; }
`;


// ── 3. HELPERS ────────────────────────────────────────────────────────────────

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


// ── 4. ESTATÍSTICAS ───────────────────────────────────────────────────────────

/**
 * Recebe os tokens do Fountain.parse e devolve um objeto com contagens.
 * Estimativa de páginas: padrão WGA = ~55 linhas de texto por página.
 * Usamos contagem de cenas + palavras de ação como proxy confiável.
 */
function calcularStats(textoCru, tokens) {
    // Cenas: tokens do tipo scene_heading
    const cenas = tokens.filter(t => t.type === 'scene_heading').length;

    // Palavras: só texto de action + dialogue (ignora didascálias e títulos)
    const tiposTexto = new Set(['action', 'dialogue', 'parenthetical']);
    const palavras = tokens
        .filter(t => tiposTexto.has(t.type) && t.text)
        .reduce((acc, t) => {
            const limpo = t.text.replace(/<[^>]+>/g, '').trim();
            return acc + (limpo ? limpo.split(/\s+/).length : 0);
        }, 0);

    // Personagens únicos com fala
    const personagens = new Set(
        tokens
            .filter(t => t.type === 'character' && t.text)
            .map(t => t.text.replace(/<[^>]+>/g, '').trim().toUpperCase())
    ).size;

    // Páginas estimadas: ~200 palavras por página é uma estimativa razoável
    // para a mistura de ação + diálogo de um roteiro padrão
    const paginas = Math.max(1, Math.round(palavras / 200));

    // Lista de cenas para o índice (texto limpo)
    const cenasList = tokens
        .filter(t => t.type === 'scene_heading' && t.text)
        .map(t => t.text.replace(/<[^>]+>/g, '').trim());

    return { cenas, palavras, personagens, paginas, cenasList };
}


// ── 5. RENDERIZAÇÃO ───────────────────────────────────────────────────────────
async function renderizar() {
    try {
        const notaMae  = api.originEntity;
        const filhas   = await notaMae.getChildNotes();

        // Primeira filha de texto/código = o Rascunho
        const rascunho = filhas.find(n =>
            n.type === 'text' || n.type === 'code' || n.mime === 'text/plain'
        );

        if (!rascunho) {
            api.$container.html(`
                <div style="padding:24px;font-family:monospace;color:var(--text-color)">
                    ⚠ Nenhuma nota de rascunho encontrada.<br><br>
                    Crie uma nota filha do tipo <b>text</b> ou <b>code</b> dentro desta nota.
                </div>
            `);
            return;
        }

        const complemento  = await rascunho.getNoteComplement();
        const textoCru     = htmlParaTexto(complemento.content || '');
        const resultado    = Fountain.parse(textoCru, true); // true = retorna tokens
        const nomeArquivo  = nomeSeguro(notaMae.title || rascunho.title);
        const stats        = calcularStats(textoCru, resultado.tokens || []);

        api.$container.html(`
            <style>${CSS}</style>
            <div id="fv-root">
                <div id="fv-toolbar">
                    <span id="fv-aviso-f5">⟳ F5 para atualizar</span>
                    <div>
                        <button id="fv-btn-download">📥 Salvar .fountain</button>
                    </div>
                </div>
                <div id="fv-stats">
                    <span>📄 <b>${stats.paginas}</b> pág. estimada${stats.paginas !== 1 ? 's' : ''}</span>
                    <span>🎬 <b>${stats.cenas}</b> cena${stats.cenas !== 1 ? 's' : ''}</span>
                    <span>💬 <b>${stats.personagens}</b> personage${stats.personagens !== 1 ? 'ns' : 'm'}</span>
                    <span>📝 <b>${stats.palavras.toLocaleString('pt-BR')}</b> palavras</span>
                </div>
                <div id="fv-body">
                    <nav id="fv-sidebar">
                        <div id="fv-sidebar-header">
                            🎬 CENAS
                            <span id="fv-sidebar-toggle">▼</span>
                        </div>
                        <ul id="fv-sidebar-list">
                            ${stats.cenasList.map((c, i) =>
                                `<li><a href="#cena-${i}" data-idx="${i}">${c}</a></li>`
                            ).join('')}
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

        api.$container.find('#fv-btn-download').on('click', () => {
            const blob = new Blob([textoCru], { type: 'text/plain;charset=utf-8' });
            const url  = URL.createObjectURL(blob);
            const a    = document.createElement('a');
            a.href     = url;
            a.download = nomeArquivo + '.fountain';
            a.click();
            URL.revokeObjectURL(url);
        });

    } catch (err) {
        api.$container.html(
            `<div style="padding:24px;color:red;font-family:monospace">
                Erro: ${err.message}
             </div>`
        );
    }
}

renderizar();