#!/usr/bin/env python3
"""Corretor do pack Canvas-Templates (rodada 15, batch 1).

Edita os 13 canvas Excalidraw por `id`/regra — nunca reescreve o arquivo à mão —
e passa um verificador de contraste WCAG que mede o **fundo real** sob cada texto
(o shape mais ao topo que contém o centro do texto; senão, a cor da página).

Uso:
    python3 fix-canvas-templates.py            # dry-run: mostra o que mudaria
    python3 fix-canvas-templates.py --apply    # grava os 13 JSONs
"""

import json
import glob
import os
import sys
import colorsys

BASE = os.path.dirname(os.path.abspath(__file__))
DIR = os.path.join(BASE, "Canvas-templates")
AA = 4.6  # alvo com folga: o harness exige o mínimo AA (4.5)
APPLY = "--apply" in sys.argv


# ----------------------------------------------------------------- utilidades


def files():
    out = {}
    for f in sorted(glob.glob(os.path.join(DIR, "**", "*.json"), recursive=True)):
        if f.endswith("!!!meta.json"):
            continue
        out[os.path.basename(f).replace(".json", "")] = f
    return out


def hex2rgb(h):
    h = (h or "").lstrip("#")
    if len(h) != 6:
        return None
    try:
        return tuple(int(h[i : i + 2], 16) / 255 for i in (0, 2, 4))
    except ValueError:
        return None


def lum(h):
    rgb = hex2rgb(h)
    if not rgb:
        return None
    f = lambda c: c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = (f(c) for c in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(a, b):
    la, lb = lum(a), lum(b)
    if la is None or lb is None:
        return None
    return round((max(la, lb) + 0.05) / (min(la, lb) + 0.05), 2)


def b62(n):
    """Índice fracionário do Excalidraw-ish: a0, a1… aZ, aa… (ordem lexicográfica)."""
    ds = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
    s = ""
    n += 1
    while n:
        n, r = divmod(n, 62)
        s = ds[r] + s
    return "a" + s


def walk_lightness(color, bg, direction, target=AA):
    """Anda na luminosidade (mesma matiz) na direção pedida até passar o alvo."""
    rgb = hex2rgb(color)
    if not rgb or not bg:
        return None
    h, l, s = colorsys.rgb_to_hls(*rgb)
    for i in range(1, 101):
        cand = l + i / 100 * (1 if direction > 0 else -1)
        if not 0 <= cand <= 1:
            break
        r, g, b = colorsys.hls_to_rgb(h, cand, s)
        hexv = "#%02x%02x%02x" % (round(r * 255), round(g * 255), round(b * 255))
        if (contrast(hexv, bg) or 0) >= target:
            return hexv
    return None


def fix_foreground(fg, bg, target=AA):
    """Escurece OU clareia o texto — o que chegar ao alvo com menor mudança."""
    down, up = walk_lightness(fg, bg, -1, target), walk_lightness(fg, bg, +1, target)
    rgb_d, rgb_u = hex2rgb(down) if down else None, hex2rgb(up) if up else None
    if not rgb_d and not rgb_u:
        return None
    if not rgb_d:
        return up
    if not rgb_u:
        return down
    base = hex2rgb(fg)
    d = sum(abs(a - b) for a, b in zip(rgb_d, base))
    u = sum(abs(a - b) for a, b in zip(rgb_u, base))
    return down if d <= u else up


def fix_background(fg, bg, target=AA):
    """Mantém o texto (já no extremo) e move o FUNDO na direção que resolve."""
    direction = -1 if (lum(fg) or 0) > 0.5 else +1
    rgb = hex2rgb(bg)
    if not rgb:
        return None
    h, l, s = colorsys.rgb_to_hls(*rgb)
    for i in range(1, 101):
        cand = l + i / 100 * direction
        if not 0 <= cand <= 1:
            break
        r, g, b = colorsys.hls_to_rgb(h, cand, s)
        hexv = "#%02x%02x%02x" % (round(r * 255), round(g * 255), round(b * 255))
        if (contrast(fg, hexv) or 0) >= target:
            return hexv
    return None


def bg_under(els, txt):
    """(índice, cor do fundo) do shape mais ao topo sob o centro do texto."""
    cx, cy = (
        (txt.get("x") or 0) + (txt.get("width") or 0) / 2,
        (txt.get("y") or 0) + (txt.get("height") or 0) / 2,
    )
    best = None
    for i, e in enumerate(els):
        if e.get("type") not in ("rectangle", "ellipse", "diamond") or e.get(
            "isDeleted"
        ):
            continue
        fill = e.get("backgroundColor")
        if not fill or fill == "transparent":
            continue
        if (e.get("x") or 0) <= cx <= (e.get("x") or 0) + (e.get("width") or 0) and (
            e.get("y") or 0
        ) <= cy <= (e.get("y") or 0) + (e.get("height") or 0):
            best = (i, fill)
    return best if best else (None, None)


# ------------------------------------------------------- edições declarativas


def edits(els, name):
    """Aplica as correções de geometria/estilo. Devolve a lista de mudanças (log)."""
    log = []
    byid = {e.get("id"): e for e in els}

    def setf(e, **kw):
        for k, v in kw.items():
            if e.get(k) != v:
                log.append(
                    "%s · %s.%s: %s → %s"
                    % (name, e["id"][:18], k, json.dumps(e.get(k)), json.dumps(v))
                )
                e[k] = v

    # --- A1: storyboard, 12 "line" de comprimento zero → divisórias reais da barra
    if name == "Template - storyboard":
        for e in els:
            if e.get("type") == "line" and [
                tuple(p) for p in (e.get("points") or [])
            ] == [(0, 0), (0, 0)]:
                bar_top = 200 if (e.get("y") or 0) < 500 else 680
                setf(e, y=bar_top, points=[[0, 0], [0, 60]], height=60)
        # o rótulo/valor PLANO (x=200) ficava a cavalo da divisória de x=226 → 240
        for e in els:
            if (
                e.get("type") == "text"
                and (e.get("x") or 0) == 200
                and e.get("text") in ("PLANO", "___")
            ):
                setf(e, x=240)
        # barras cinza: branco 9px sobre #868e96 = 3.32 → escurece a barra (mantém o branco)
        for e in els:
            if e.get("backgroundColor") == "#868e96":
                setf(e, backgroundColor="#495057")

    # --- A2: GTD, os dois rótulos de fluxo vazam do nó (o texto é LIVRE, não bound)
    if name == "Template - GTD":
        t = byid.get("esclarecer_txt")
        if t:
            setf(t, fontSize=14, width=196, x=402)  # centraliza no diamond (400..600)
        t = byid.get("acao_txt")
        if t:
            setf(t, fontSize=14, width=269, x=375.5)  # centraliza na caixa (360..660)

    # --- A3/B7: Manual, rodapé fora do painel + sombras em 4 direções
    if name == "Template - Manual pessoal do u":
        t = byid.get("5sasYEeHekpEsYqj9qsM")
        if t:
            setf(t, x=1060)  # borda direita 1339 < 1388 (painel)
        for e in els:  # só a intro, que está sobre a elipse #a78bfa (1.27:1)
            if e.get("id") == "lxBRr5OL3zZyOhTJdAj1":
                setf(e, strokeColor="#2d1b69")
        shadows = [
            e
            for e in els
            if e.get("type") == "rectangle" and e.get("backgroundColor") == "#e5e0f5"
        ]
        cards = [
            e
            for e in els
            if e.get("type") == "rectangle"
            and e.get("backgroundColor") == "#fdfcff"
            and 200 < (e.get("height") or 0) < 400
        ]
        for s in shadows:
            scx, scy = s["x"] + s["width"] / 2, s["y"] + s["height"] / 2
            card = min(
                cards,
                key=lambda c: (
                    (c["x"] + c["width"] / 2 - scx) ** 2
                    + (c["y"] + c["height"] / 2 - scy) ** 2
                ),
            )
            setf(s, x=round(card["x"] + 6, 2), y=round(card["y"] + 6, 2))

    # --- M5: Design Thinking, texto da "Declaração do Problema" vaza do post-it
    if name == "Template - Design Thinking":
        t = byid.get("pi_left_text")
        if t:
            setf(t, fontSize=18, width=152, x=104, height=108)

    # --- M3/M4/D5.3: OKR, texto fora da escala, caixa desalinhada, emoji × cor
    if name == "Template - OKR":
        t, b = byid.get("obj_desc"), byid.get("obj_box")
        if t and b:
            k = 13.0 / 16.0  # cabe em obj_box (418 de largura)
            setf(
                t,
                fontSize=13,
                width=round(t["width"] * k, 0),
                height=round(t["height"] * k, 0),
                x=round(b["x"] + (b["width"] - t["width"] * k) / 2, 1),
            )
        if byid.get("kr2_box"):
            setf(byid["kr2_box"], x=381.87)  # alinha com kr1/kr3/kr4
        for kid, emo in (
            ("kr1_pb_txt", "🟢"),
            ("kr2_pb_txt", "🔴"),
            ("kr3_pb_txt", "🔵"),
            ("kr4_pb_txt", "🟡"),
        ):
            e = byid.get(kid)
            if e:
                setf(
                    e,
                    text=("0%% %s" % emo)
                    if e.get("text", "").startswith("0%")
                    else e.get("text"),
                )

    # --- M1/M2: SCAMPER, boundElements fantasma + "miolo" com estilo de outro canvas
    if name == "Template - SCAMPER":
        t = byid.get("txt_e_desc")
        if t and t.get("boundElements"):
            setf(t, boundElements=[])
        for e in els:
            if e.get("roughness") == 1:
                setf(e, roughness=0)
            if e.get("strokeColor") == "#1e1e1e" and e.get("type") != "text":
                setf(e, strokeColor="#0f172a")
            if e.get("fontFamily") == 6:
                setf(e, fontFamily=2)

    # --- Projetos: "+ novo projeto" em #94a3b8 (2.56) → #475569
    if name == "Template - Projetos":
        for e in els:
            if e.get("type") == "text" and e.get("strokeColor") == "#94a3b8":
                setf(e, strokeColor="#475569")

    return log


def structural(doc, name, log):
    """appState unificado, `index` único (B4), `seed` renovado (B5), origem ≥ 0 (M6)."""
    els = doc["elements"]
    st = doc.setdefault("appState", {})

    # B10/D4.2 — fundo, grade e zoom iguais nos 13
    for k, v in (
        ("viewBackgroundColor", "#ffffff"),
        ("gridModeEnabled", True),
        ("zoom", {"value": 1}),
    ):
        if st.get(k) != v:
            log.append(
                "%s · appState.%s: %s → %s"
                % (name, k, json.dumps(st.get(k)), json.dumps(v))
            )
            st[k] = v

    # B4 — `index` duplicado (elementos colados de outro canvas mantêm a chave)
    idx = [e.get("index") for e in els]
    if len(set(idx)) != len(idx):
        for i, e in enumerate(els):
            e["index"] = b62(i)
        log.append(
            "%s · index: %d duplicados → reindexado em ordem de array"
            % (name, len(idx) - len(set(idx)))
        )

    # B5/estilo — `roughness` 1 em 2 linhas do Plot Timeline destoava do resto (0 nos 823)
    for e in els:
        if e.get("roughness") == 1:
            e["roughness"] = 0
            log.append(
                "%s · %s.roughness: 1 → 0 (padrão do pack; torna o `seed` inerte)"
                % (name, e["id"][:18])
            )

    # M6 — origem negativa: em canvas vazio o v8 insere fora do viewport
    xs = [e["x"] for e in els if isinstance(e.get("x"), (int, float))]
    ys = [e["y"] for e in els if isinstance(e.get("y"), (int, float))]
    dx, dy = -min(0, min(xs)), -min(0, min(ys))
    if dx or dy:
        for e in els:
            if isinstance(e.get("x"), (int, float)):
                e["x"] = round(e["x"] + dx, 2)
            if isinstance(e.get("y"), (int, float)):
                e["y"] = round(e["y"] + dy, 2)
        st["scrollX"], st["scrollY"] = 0, 0
        log.append(
            "%s · origem: transladado (+%g, +%g) → minX/minY = 0" % (name, dx, dy)
        )


def contrast_pass(doc, name, log):
    """Garante AA ≥ 4.5 medindo o fundo REAL sob cada texto.

    Ordem: (1) ajusta a cor do texto; (2) se o texto já está no extremo
    (branco/preto), escurece/clareia o FUNDO do shape sob ele.
    """
    els = doc["elements"]
    page = doc.get("appState", {}).get("viewBackgroundColor") or "#ffffff"
    n = 0
    for e in els:
        if e.get("type") != "text" or e.get("isDeleted"):
            continue
        if (e.get("text") or "").strip() == "":
            continue
        i, bg = bg_under(els, e)
        bg = bg or page
        cr = contrast(e.get("strokeColor"), bg)
        if cr is None or cr >= AA:
            continue
        novo = None
        novo_bg = None
        texto_claro = (lum(e.get("strokeColor")) or 0) > 0.85
        if (
            texto_claro and i is not None
        ):  # branco sobre cor: mantém o branco e escurece o FUNDO
            novo_bg = fix_background(e.get("strokeColor"), bg)
        if not novo_bg:
            novo = fix_foreground(e.get("strokeColor"), bg)
        if not novo and not novo_bg and i is not None:
            novo_bg = fix_background(e.get("strokeColor"), bg)
        if novo:
            log.append(
                "%s · %s: texto %s → %s (sobre %s: %.2f → %.2f) %r"
                % (
                    name,
                    e["id"][:18],
                    e.get("strokeColor"),
                    novo,
                    bg,
                    cr,
                    contrast(novo, bg),
                    (e.get("text") or "")[:24],
                )
            )
            e["strokeColor"] = novo
            n += 1
            continue
        novo_bg = fix_background(e.get("strokeColor"), bg) if i is not None else None
        if novo_bg:
            els[i]["backgroundColor"] = novo_bg
            log.append(
                "%s · %s: FUNDO %s → %s (texto %s passa de %.2f p/ %.2f) %r"
                % (
                    name,
                    els[i]["id"][:18],
                    bg,
                    novo_bg,
                    e.get("strokeColor"),
                    cr,
                    contrast(e.get("strokeColor"), novo_bg),
                    (e.get("text") or "")[:24],
                )
            )
            n += 1
        else:
            log.append(
                "%s · %s: %s sobre %s = %.2f — SEM solução (texto no extremo, sem fill sob ele)"
                % (name, e["id"][:18], e.get("strokeColor"), bg, cr)
            )
    return n


# ------------------------------------------------- Q5/Q6 · tipografia e cantos

FONT_MIN = 12  # Q5 (a11y): nenhum texto abaixo disso
PILL = 30  # Q6: roundness >= isso é pílula/badge de propósito — não tocar
# Q6: onde o template misturava valores "de meio" (4–16), colapsar no dominante
ROUNDNESS = {
    "Manual pessoal": 10,
    "Projetos": 7,
    "Cornell": 0,
    "OKR": 7,
    "GTD - Weekly": 4,
    "SCAMPER": 8,
}
# Q5: exceções medidas — um passo a 12px já encosta no vizinho, então o teto é 11px
# (Cornell: os 5 cabeçalhos de passo, na grade de 300px, e o par "RESUMO/SÍNTESE").
TETO_FONTE = {
    "LD2ho5avogfLiXirYuPu": 11,
    "NwLZ76OqlytTYtTzA0MJ": 11,
    "ghFax4zjL6XxVJLuNnS9": 11,
    "Il6dhQZNx3TIrdONNoh2": 11,
    "yQBQZGXmXzbU4ZBbeP8l": 11,
    "679fJak7fq0q3AY6nmAs": 11,
    "k1CVsxHaooiTUylakdzK": 11,
}
# Q5: a faixa-índice do storyboard (2 linhas) a 12px fica 1533px de largura numa
# faixa de 1260 — e já vazava 15px a 9px (warn aceito). Fica como está.
SEM_BUMP = {"lzwTVEsYrnXfPX29xHPe"}


def tipografia(doc, name, log):
    """Q5: `fontSize` < 12 → 12 (ou o teto da exceção), escalando a caixa e
    PRESERVANDO o alinhamento (centro/direita recuam em x). Q6: roundness do
    miolo → valor dominante do template."""
    for e in doc["elements"]:
        if e.get("type") == "text":
            fs = e.get("fontSize") or 0
            alvo_f = TETO_FONTE.get(e["id"], FONT_MIN)
            if 0 < fs < alvo_f and e["id"] not in SEM_BUMP:
                k = alvo_f / float(fs)
                w = e.get("width") or 0
                novo_w = round(w * k, 2)
                novo_h = round((e.get("height") or 0) * k, 2)
                if e.get("textAlign") == "center":
                    e["x"] = round((e.get("x") or 0) - (novo_w - w) / 2, 2)
                elif e.get("textAlign") == "right":
                    e["x"] = round((e.get("x") or 0) - (novo_w - w), 2)
                if isinstance(e.get("baseline"), (int, float)):
                    e["baseline"] = round(e["baseline"] * k, 2)
                log.append(
                    "%s · %s fontSize %g→%d (caixa ×%.2f, align=%s)"
                    % (
                        name,
                        e["id"][:18],
                        fs,
                        alvo_f,
                        k,
                        e.get("textAlign") or "left",
                    )
                )
                e["width"], e["height"] = novo_w, novo_h
                e["fontSize"] = alvo_f
            continue
        r = e.get("roundness")
        if not isinstance(r, dict):
            continue
        alvo = next((v for k, v in ROUNDNESS.items() if k in name), None)
        v = r.get("value")
        if alvo is None or not isinstance(v, (int, float)):
            continue
        if v != alvo and v < PILL:
            log.append("%s · %s roundness %g → %g" % (name, e["id"][:18], v, alvo))
            r["value"] = alvo


PLACEHOLDERS = {"⬜": "☐"}  # Q6: caixa de marcar como TEXTO (não emoji, que sai grande)


def placeholders(doc, name, log):
    """Q6: normaliza o token de caixa de marcar em todos os campos de texto
    do elemento (o renderer usa `lines`, a busca usa `text`)."""
    n = 0
    for e in doc["elements"]:
        if e.get("type") != "text":
            continue
        for campo in ("text", "originalText", "rawText"):
            t = e.get(campo)
            if isinstance(t, str):
                for de, para in PLACEHOLDERS.items():
                    if de in t:
                        n += t.count(de)
                        e[campo] = t.replace(de, para)
                        t = e[campo]
        linhas = e.get("lines")
        if isinstance(linhas, list):
            for i, l in enumerate(linhas):
                if isinstance(l, str):
                    for de, para in PLACEHOLDERS.items():
                        if de in l:
                            linhas[i] = l.replace(de, para)
    if n:
        log.append("%s · %d caixa(s) de marcar: %s" % (name, n, " ".join(PLACEHOLDERS)))


# Q5: o rótulo continuou maior que a célula (o bump não cabe): recentraliza na
# vertical em vez de deixá-lo montar na linha de baixo. Só mexe quando a célula é
# do tamanho do texto (célula <= 2× a altura do texto) — cartão grande fica quieto.
def encaixe(doc, name, log):
    for e in doc["elements"]:
        if e.get("type") != "text" or not (e.get("text") or "").strip():
            continue
        tx0, ty0 = e.get("x") or 0, e.get("y") or 0
        tw, th = e.get("width") or 0, e.get("height") or 0
        cx, cy = tx0 + tw / 2, ty0 + th / 2
        melhor = None
        for o in doc["elements"]:
            if o.get("type") not in ("rectangle", "ellipse", "diamond"):
                continue
            if o.get("isDeleted") or o["id"] == e["id"]:
                continue
            fill = o.get("backgroundColor")
            if not fill or fill == "transparent":
                continue
            ox, oy = o.get("x") or 0, o.get("y") or 0
            ow, oh = o.get("width") or 0, o.get("height") or 0
            if ox <= cx <= ox + ow and oy <= cy <= oy + oh:
                if melhor is None or ow * oh < melhor[0]:
                    melhor = (ow * oh, ox, oy, ow, oh)
        if not melhor:
            continue
        _, ox, oy, ow, oh = melhor
        if th > oh or oh > 2 * th:
            continue
        vaza = max(ox - tx0, oy - ty0, (tx0 + tw) - (ox + ow), (ty0 + th) - (oy + oh))
        if vaza > 8:
            novo_y = round(oy + (oh - th) / 2, 2)
            log.append(
                "%s · %s centrado na célula (vazava %.0fpx; y %g→%g)"
                % (name, e["id"][:18], vaza, ty0, novo_y)
            )
            e["y"] = novo_y


# ------------------------------------------------------------------------ main


def main():
    total = 0
    for name, path in files().items():
        doc = json.load(open(path))
        log = edits(doc["elements"], name)
        structural(doc, name, log)
        tipografia(doc, name, log)
        encaixe(doc, name, log)
        placeholders(doc, name, log)
        n = 0
        for _ in range(
            3
        ):  # converge: mudar um FUNDO pode afetar outro texto que o usava
            m = contrast_pass(doc, name, log)
            n += m
            if not m:
                break
        total += n
        if log:
            print("── %s" % name)
            for l in log:
                print("   ", l)
        if APPLY:
            doc["elements"] = doc["elements"]
            with open(path, "w") as fh:
                json.dump(doc, fh, ensure_ascii=False, separators=(",", ":"))
    print(
        "\n%s · %d correções de contraste"
        % ("APLICADO" if APPLY else "DRY-RUN (nada gravado)", total)
    )


if __name__ == "__main__":
    main()
