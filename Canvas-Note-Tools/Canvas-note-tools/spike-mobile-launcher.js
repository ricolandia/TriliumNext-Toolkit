// ============================================================
// SPIKE — Canvas Tools mobile (Fase 0)
//
// Nota launcher: type=launcher, #launcherType=script, ~script → esta nota.
// Objetivo: validar nos 3 ambientes (desktop, web e app mobile):
//   1. o launcher aparece e executa o script
//   2. o diálogo abre (document.body, CSS auto-escopado em #spike-root)
//   3. a nota ativa é obtida (api.getActiveContextNote)
//   4. escrever no JSON do canvas + recarga do canvas aberto
//   5. download: Capacitor (Filesystem + Share) × anchor (data URL)
//
// Este arquivo é temporário (spike). O script roda SEM api.$container.
// ============================================================

(function () {
    const CAP = (typeof window !== 'undefined' && window.Capacitor) || null;
    const nativo = !!(CAP && typeof CAP.isNativePlatform === 'function' && CAP.isNativePlatform());

    const CSS = `
      #spike-root, #spike-root * { box-sizing: border-box; }
      #spike-root {
        position: fixed; inset: 0; z-index: 10000;
        display: flex; align-items: center; justify-content: center;
        background: rgba(0,0,0,.45); padding: 12px;
      }
      #spike-root .spk-box {
        background: var(--main-background-color, #fff);
        color: var(--main-text-color, #222);
        width: min(94vw, 480px); max-height: 88vh; overflow: auto;
        border-radius: 10px; border: 1px solid var(--main-border-color, #ccc);
        box-shadow: 0 12px 40px rgba(0,0,0,.35); padding: 16px;
      }
      #spike-root h2 { margin: 0 0 10px; font-size: 16px; }
      #spike-root .spk-info {
        font-family: monospace; font-size: 12px; line-height: 1.65;
        background: var(--hover-item-background-color, rgba(128,128,128,.12));
        border-radius: 6px; padding: 8px 10px; margin-bottom: 12px;
        white-space: pre-wrap; word-break: break-word;
      }
      #spike-root button {
        display: block; width: 100%; margin: 6px 0; padding: 12px;
        font-size: 14px; border-radius: 8px;
        border: 1px solid var(--main-border-color, #ccc);
        background: var(--button-background-color, var(--accented-background-color, #f0f0f0));
        color: var(--button-text-color, var(--main-text-color, inherit));
        cursor: pointer; text-align: left;
      }
      #spike-root button:active { filter: brightness(.92); }
      #spike-root .spk-status {
        font-family: monospace; font-size: 12px; margin-top: 10px;
        white-space: pre-wrap; word-break: break-word; min-height: 1.2em; opacity: .9;
      }
    `;

    function remover() {
        const antigo = document.getElementById('spike-root');
        if (antigo) antigo.remove();
    }

    function status(msg) {
        const el = document.getElementById('spk-status');
        if (el) el.textContent = String(msg);
    }

    /** Plugin nativo: Plugins[X] só tem o core; o resto vem de registerPlugin() */
    function getPlugin(nome) {
        if (!CAP) return null;
        try {
            return (CAP.Plugins && CAP.Plugins[nome])
                || (typeof CAP.registerPlugin === 'function' ? CAP.registerPlugin(nome) : null);
        } catch (e) {
            return null;
        }
    }

    function infoAmbiente() {
        const nota = api.getActiveContextNote ? api.getActiveContextNote() : null;
        const temPlugins = !!(CAP && CAP.Plugins);
        return [
            'nativo (Capacitor): ' + nativo,
            'device: ' + ((window.glob && window.glob.device) || '?'),
            'tela: ' + window.innerWidth + '×' + window.innerHeight,
            'Plugins core: ' + temPlugins + ' | registerPlugin: ' + !!(CAP && typeof CAP.registerPlugin === 'function'),
            'Filesystem: ' + (getPlugin('Filesystem') ? 'ok' : 'ausente') + ' | Share: ' + (getPlugin('Share') ? 'ok' : 'ausente'),
            'nota ativa: ' + (nota ? nota.title + ' [' + nota.type + '] ' + nota.noteId : '(nenhuma)'),
        ].join('\n');
    }

    function baixarDataUrl(nome, dataUrl) {
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = nome;
        document.body.appendChild(a);
        a.click();
        a.remove();
    }

    async function testarDownload() {
        const nome = 'spike-canvas.txt';
        const texto = 'Spike Canvas Tools — download OK — ' + new Date().toISOString();
        const base64 = btoa(unescape(encodeURIComponent(texto)));
        const dataUrl = 'data:text/plain;charset=utf-8;base64,' + base64;

        if (nativo) {
            const fs = getPlugin('Filesystem');
            const share = getPlugin('Share');

            if (!fs) {
                status('❌ Filesystem indisponível (Plugins e registerPlugin).');
            } else if (!share) {
                status('❌ Share indisponível (Plugins e registerPlugin).');
            } else {
                try {
                    const res = await fs.writeFile({
                        path: nome,
                        data: base64,
                        directory: 'CACHE',
                        recursive: true,
                    });
                    status('• Filesystem OK: ' + res.uri + '\n• Abrindo Share…');
                    await share.share({ title: nome, files: [res.uri] });
                    status('✅ Capacitor: Filesystem + Share OK.');
                    return;
                } catch (e) {
                    const detalhe = (e && (e.message || e.errorMessage)) || JSON.stringify(e);
                    status('⚠️ Capacitor falhou: ' + detalhe + '\nTentando data URL…');
                }
            }
        }

        baixarDataUrl(nome, dataUrl);
        status((nativo ? '⚠️ ' : '') + 'Anchor com data URL disparado. Se nada apareceu, o ambiente bloqueou.');
    }

    function elementoTeste() {
        const agora = Date.now();
        const x = 120, y = 120, w = 240, h = 90;
        return [
            {
                id: 'spike-r-' + agora, type: 'rectangle',
                x, y, width: w, height: h, angle: 0,
                strokeColor: '#1e1e1e', backgroundColor: '#a5d8ff', fillStyle: 'solid',
                strokeWidth: 2, strokeStyle: 'solid', roughness: 0, opacity: 100,
                groupIds: [], roundness: { type: 3 },
                seed: agora % 999999, version: 1, versionNonce: (agora + 7) % 999999,
                isDeleted: false, boundElements: [], updated: agora, link: null, locked: false, index: 'a1',
            },
            {
                id: 'spike-t-' + agora, type: 'text',
                x: x + 20, y: y + 30, width: w - 40, height: 25, angle: 0,
                strokeColor: '#1e1e1e', backgroundColor: 'transparent', fillStyle: 'solid',
                strokeWidth: 1, strokeStyle: 'solid', roughness: 0, opacity: 100,
                groupIds: [], roundness: null,
                seed: (agora + 13) % 999999, version: 1, versionNonce: (agora + 21) % 999999,
                isDeleted: false, boundElements: [], updated: agora, link: null, locked: false,
                text: 'Spike Canvas ✅', fontSize: 20, fontFamily: 2, textAlign: 'center',
                verticalAlign: 'middle', originalText: 'Spike Canvas ✅', lineHeight: 1.25,
                autoResize: false, index: 'a2',
            },
        ];
    }

    async function escreverNoCanvas() {
        const nota = api.getActiveContextNote ? api.getActiveContextNote() : null;
        if (!nota) { status('❌ Nenhuma nota ativa.'); return; }
        if (nota.type !== 'canvas') { status('❌ A nota ativa não é canvas (é ' + nota.type + ').'); return; }

        try {
            const total = await api.runOnBackend((noteId, novos) => {
                const n = api.getNote(noteId);
                let data = {};
                try { data = JSON.parse(n.getContent() || '{}'); } catch (e) { data = {}; }
                if (!data.type) data.type = 'excalidraw';
                if (!data.version) data.version = 2;
                if (!Array.isArray(data.elements)) data.elements = [];
                data.elements = data.elements.concat(novos);
                n.setContent(JSON.stringify(data));
                return data.elements.length;
            }, [nota.noteId, elementoTeste()]);

            status('✅ Escrito no canvas. Total de elementos: ' + total +
                '.\nO retângulo azul "Spike Canvas ✅" apareceu no canvas aberto?');
        } catch (e) {
            status('❌ Falha ao escrever: ' + ((e && e.message) || e));
        }
    }

    function abrir() {
        remover();

        const root = document.createElement('div');
        root.id = 'spike-root';
        root.innerHTML = `
            <style>${CSS}</style>
            <div class="spk-box">
                <h2>🧪 Spike Canvas — Fase 0</h2>
                <div class="spk-info">${infoAmbiente().replace(/</g, '&lt;')}</div>
                <button id="spk-write">🖊️ Escrever elemento de teste no canvas ativo</button>
                <button id="spk-download">⬇️ Testar download (Capacitor × data URL)</button>
                <button id="spk-close">✖️ Fechar</button>
                <div class="spk-status" id="spk-status"></div>
            </div>`;

        document.body.appendChild(root);

        root.querySelector('#spk-write').addEventListener('click', escreverNoCanvas);
        root.querySelector('#spk-download').addEventListener('click', testarDownload);
        root.querySelector('#spk-close').addEventListener('click', remover);
        root.addEventListener('click', (e) => { if (e.target === root) remover(); });
    }

    abrir();
})();
