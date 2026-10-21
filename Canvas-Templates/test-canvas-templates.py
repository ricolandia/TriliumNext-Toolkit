#!/usr/bin/env python3
"""Harness do pack Canvas-Templates (rodada 15, batch 3).

Valida os 16 canvas Excalidraw e o artefato do pack SEM abrir o Trilium:

    python3 test-canvas-templates.py

Checa: schema/refs, elementos degenerados, vazamento de texto, contraste WCAG AA
medindo o fundo real, origem negativa, `index`/`seed` duplicados, appState
unificado, lista do README, labels do `!!!meta.json` e zip × repo.

Sai com código 1 se algo falhar (serve de CI).
"""

import json
import glob
import os
import re
import sys
import unicodedata
import zipfile
import hashlib

BASE = os.path.dirname(os.path.abspath(__file__))
DIR = os.path.join(BASE, "Canvas-templates")
ZIP = os.path.join(BASE, "Canvas-templates.zip")
AA = 4.5
OK, FAIL, WARN = [], [], []


def ok(msg):
    OK.append(msg)


def bad(msg):
    FAIL.append(msg)


def warn(msg):
    WARN.append(msg)


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
    return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)


def bg_under(els, txt):
    """(índice, cor) do shape mais ao topo sob o centro do texto."""
    cx = (txt.get("x") or 0) + (txt.get("width") or 0) / 2
    cy = (txt.get("y") or 0) + (txt.get("height") or 0) / 2
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


# ------------------------------------------------------------------ 1. payload


def check_payload(name, path):
    raw = open(path, encoding="utf-8").read()
    doc = json.loads(raw)
    els = doc.get("elements") or []
    if doc.get("type") != "excalidraw" or doc.get("version") is None:
        bad("%s: não é canvas Excalidraw (type/version)" % name)
    if not els:
        bad("%s: sem elementos" % name)
    for k in ("appState", "files"):
        if k not in doc:
            bad("%s: falta `%s`" % (name, k))

    ids = [e.get("id") for e in els]
    dup = {i for i in ids if ids.count(i) > 1}
    if dup:
        bad("%s: %d ids duplicados (%s)" % (name, len(dup), list(dup)[:3]))
    myset = set(ids)

    # refs internas
    dang = []
    for e in els:
        for b in e.get("boundElements") or []:
            if b.get("id") not in myset:
                dang.append((e.get("id"), "boundElements", b.get("id")))
        for k in ("containerId", "frameId"):
            if e.get(k) and e[k] not in myset:
                dang.append((e.get("id"), k, e[k]))
        for k in ("startBinding", "endBinding"):
            v = e.get(k) or {}
            if v.get("elementId") and v["elementId"] not in myset:
                dang.append((e.get("id"), k, v["elementId"]))
    if dang:
        bad("%s: %d referências quebradas (%s)" % (name, len(dang), dang[:2]))
    for e in els:
        if e.get("isDeleted"):
            bad("%s: elemento deletado no template (%s)" % (name, e.get("id")))
        if e.get("type") == "text" and not (e.get("text") or "").strip():
            bad("%s: texto vazio (%s)" % (name, e.get("id")))
        if e.get("type") == "text" and (
            e.get("fontFamily") is None or e.get("fontSize") is None
        ):
            bad("%s: texto sem fontFamily/fontSize (%s)" % (name, e.get("id")))

    # degenerados: shapes com área zero (line/arrow podem ter largura 0, mas não comprimento 0)
    for e in els:
        t = e.get("type")
        if t in ("line", "arrow"):
            pts = e.get("points") or []
            comp = sum(abs(p[0]) + abs(p[1]) for p in pts[1:]) if len(pts) > 1 else 0
            if comp == 0:
                bad(
                    "%s: %s sem comprimento (points=%s) — não desenha nada"
                    % (name, e.get("id"), pts)
                )
        elif t in ("rectangle", "ellipse", "diamond") and (
            (e.get("width") or 0) == 0 or (e.get("height") or 0) == 0
        ):
            bad("%s: %s com área zero" % (name, e.get("id")))

    # `index`/`seed` duplicados
    for field in ("index", "seed"):
        vals = [e.get(field) for e in els]
        d = {v for v in vals if vals.count(v) > 1}
        if d:
            bad("%s: `%s` duplicado (%d valores)" % (name, field, len(d)))

    # appState unificado (B10/D4.2)
    st = doc.get("appState") or {}
    if (st.get("zoom") or {}).get("value") != 1:
        bad(
            "%s: appState.zoom = %s (esperado 1)"
            % (name, (st.get("zoom") or {}).get("value"))
        )
    if st.get("gridModeEnabled") is not True:
        bad(
            "%s: gridModeEnabled = %s (esperado true)"
            % (name, st.get("gridModeEnabled"))
        )
    if (st.get("viewBackgroundColor") or "").lower() != "#ffffff":
        bad(
            "%s: viewBackgroundColor = %s (esperado #ffffff)"
            % (name, st.get("viewBackgroundColor"))
        )

    # origem ≥ 0 (M6)
    xs = [e["x"] for e in els if isinstance(e.get("x"), (int, float))]
    ys = [e["y"] for e in els if isinstance(e.get("y"), (int, float))]
    if min(xs) < 0 or min(ys) < 0:
        bad(
            "%s: origem negativa (minX=%g minY=%g) — em canvas vazio o v8 insere fora da tela"
            % (name, min(xs), min(ys))
        )

    # contraste (mede o fundo real) + vazamento de texto
    page = st.get("viewBackgroundColor") or "#ffffff"
    pior = (99, None)
    for e in els:
        if e.get("type") != "text" or not (e.get("text") or "").strip():
            continue
        i, bg = bg_under(els, e)
        bg = bg or page
        cr = contrast(e.get("strokeColor"), bg)
        if cr is None:
            warn(
                "%s: %s com cor não-hex (%r)"
                % (name, e.get("id"), e.get("strokeColor"))
            )
        elif cr < AA:
            bad(
                "%s: contraste %.2f < %.1f — %r sobre %s (%s)"
                % (name, cr, AA, e.get("text")[:28], bg, e.get("id"))
            )
            pior = min(pior, (cr, e.get("id")))
        if i is None:
            continue
        c = els[i]
        x0, y0 = e.get("x") or 0, e.get("y") or 0
        x1, y1 = x0 + (e.get("width") or 0), y0 + (e.get("height") or 0)
        cx1 = (c.get("x") or 0) + (c.get("width") or 0)
        cy1 = (c.get("y") or 0) + (c.get("height") or 0)
        esc = max(x1 - cx1, y1 - cy1)
        if (
            esc > 8
        ):  # ignora sobras de 1-8px (o placeholder do storyboard passa 5px de propósito)
            warn(
                "%s: %r vaza %.0fpx em %s do shape %s"
                % (
                    name,
                    e.get("text")[:24],
                    esc,
                    "x" if x1 - cx1 >= y1 - cy1 else "y",
                    c.get("id"),
                )
            )
    return doc


# ------------------------------------------------- 2. README × arquivos × meta


def check_readme(titles):
    md = open(os.path.join(BASE, "README.md"), encoding="utf-8").read()
    # toda a seção "Templates included" (aceita grupos com subtítulos **negrito**)
    secao = re.split(r"^## ", md, flags=re.M)
    secao = next((s for s in secao if s.startswith("Templates included")), "")
    bullets = re.findall(r"^- (.+)$", secao, re.M)
    nomes = {t.replace("Template - ", "").strip() for t in titles}
    faltando = sorted(
        n for n in nomes if not any(n.split()[0].lower() in b.lower() for b in bullets)
    )
    if faltando:
        bad("README: %d template(s) fora da lista: %s" % (len(faltando), faltando))
    else:
        ok("README: os %d canvas estão listados" % len(nomes))
    if "Canvas-templates.zip" not in md:
        bad("README: não cita o nome real do zip (`Canvas-templates.zip`)")
    if re.search(r"Canvas_Templates\.zip", md):
        bad("README: ainda cita `Canvas_Templates.zip` (nome inexistente)")


def _notas_canvas(meta):
    notas = []

    def walk(nodes):
        for n in nodes:
            if n.get("type") == "canvas":
                notas.append(n)
            walk(n.get("children") or [])

    walk(meta.get("files") or [])
    return notas


def check_meta():
    meta = json.load(open(os.path.join(DIR, "!!!meta.json"), encoding="utf-8"))
    notas = _notas_canvas(meta)
    for n in notas:
        labs = [a["name"] for a in n.get("attributes") or []]
        if labs.count("canvasTemplate") != 1:
            bad("meta: %s sem exatamente 1 `#canvasTemplate`" % n.get("title"))
        if labs.count("template") != 1:
            bad(
                "meta: %s com %d labels `template` (esperado 1)"
                % (n.get("title"), labs.count("template"))
            )
        fn = next((a.get("dataFileName") for a in n.get("attachments") or []), None)
        if not fn:
            bad("meta: %s sem anexo canvas-export.svg" % n.get("title"))
    if not notas:
        bad("meta: nenhuma nota canvas")
    else:
        ok("meta: %d notas canvas com labels e anexo" % len(notas))
    return [n.get("title") for n in notas]


def check_svg():
    """O SVG de preview anexado está em sincronia com o JSON atual?"""
    meta = json.load(open(os.path.join(DIR, "!!!meta.json"), encoding="utf-8"))

    def palavras(s):
        return [w for w in re.findall(r"[\wÀ-ÿ]{5,}", unicodedata.normalize("NFKC", s))]

    n = 0
    for nota in _notas_canvas(meta):
        js = nota.get("dataFileName")
        sv = next((a.get("dataFileName") for a in nota.get("attachments") or []), None)
        if not js or not sv:
            continue
        pj = next(iter(glob.glob(os.path.join(DIR, "**", js), recursive=True)), None)
        pv = next(iter(glob.glob(os.path.join(DIR, "**", sv), recursive=True)), None)
        if not pj or not pv:
            bad("svg: %s ou o anexo não existe" % nota.get("title"))
            continue
        doc = json.load(open(pj, encoding="utf-8"))
        txt = unicodedata.normalize(
            "NFKC", open(pv, encoding="utf-8", errors="replace").read()
        )
        falhas = []
        for e in doc["elements"]:
            if e.get("type") != "text":
                continue
            for w in palavras(e.get("text") or ""):
                if w not in txt:
                    falhas.append((nota.get("title"), w))
        if falhas:
            bad(
                "svg: preview defasado em %s (%d palavras do JSON ausentes, ex.: %s)"
                % (nota.get("title"), len(falhas), falhas[0][1])
            )
        else:
            n += 1
    ok("svg: %d previews em sincronia com o JSON" % n)


def check_kit():
    """Os 3 canvases de "Templates - Escrita" são espelho do super-template de escrita
    (`make-canvas.py --kit`): compara com `Escrita-Templates/Canvas/*.json` — o appState
    do pack não tem `gridSize`."""
    base = os.path.join(BASE, "..", "Escrita-Templates", "Canvas")
    pares = [
        ("Template - Storyboard (HQ)", "_tpl-Storyboard.json"),
        ("Template - Mapa de relações", "_tpl-Mapa.json"),
        ("Template - Mapa de arcos & plotlines", "_tpl-Arcos.json"),
    ]
    if not os.path.isdir(base):
        warn("kit: Escrita-Templates/Canvas não está ao lado — espelho não conferido")
        return
    for titulo, origem in pares:
        p_kit = os.path.join(DIR, "Canvas - templates", "Templates - Escrita", titulo + ".json")
        p_esc = os.path.join(base, origem)
        if not os.path.exists(p_kit) or not os.path.exists(p_esc):
            bad("kit: %s sem par (%s)" % (titulo, "falta no pack" if not os.path.exists(p_kit) else "falta na origem"))
            continue
        a = json.load(open(p_kit, encoding="utf-8"))
        b = json.load(open(p_esc, encoding="utf-8"))
        for d in (a, b):
            (d.get("appState") or {}).pop("gridSize", None)
        if json.dumps(a, sort_keys=True, ensure_ascii=False) != json.dumps(b, sort_keys=True, ensure_ascii=False):
            bad("kit: %s divergiu do Escrita-Templates — rode `make-canvas.py --write --kit`" % titulo)
        else:
            ok("kit: %s espelhado de %s" % (titulo, origem))


def check_zip(titles):
    if not os.path.exists(ZIP):
        bad("zip: %s não existe" % ZIP)
        return
    z = zipfile.ZipFile(ZIP)
    names = [n for n in z.namelist() if not n.endswith("/")]
    for f in glob.glob(os.path.join(DIR, "**", "*"), recursive=True):
        if os.path.isdir(f):
            continue
        rel = os.path.relpath(f, DIR)
        if rel not in names:
            bad("zip: %s não está no zip (regenerar)" % rel)
            continue
        a = hashlib.sha256(open(f, "rb").read()).hexdigest()
        b = hashlib.sha256(z.read(rel)).hexdigest()
        if a != b:
            bad("zip: %s difere do repo (zip defasado)" % rel)
            break
    else:
        ok("zip: %d arquivos idênticos ao repo" % len(names))


def main():
    paths = sorted(
        f
        for f in glob.glob(os.path.join(DIR, "**", "*.json"), recursive=True)
        if not f.endswith("!!!meta.json")
    )
    titles = []
    for p in paths:
        titles.append(os.path.basename(p).replace(".json", ""))
        check_payload(os.path.basename(p).replace(".json", ""), p)
    if len(paths) != 16:
        bad("pack: %d canvas (esperado 16)" % len(paths))
    meta_titles = check_meta()
    if len(meta_titles) != len(titles):
        bad(
            "meta × arquivos: %d notas canvas × %d arquivos"
            % (len(meta_titles), len(titles))
        )
    check_readme(titles)
    check_svg()
    check_kit()
    check_zip(titles)

    print("PASS  %d" % len(OK))
    for m in OK:
        print("  ok   %s" % m)
    if WARN:
        print("WARN  %d" % len(WARN))
        for m in WARN:
            print("  warn %s" % m)
    print("FAIL  %d" % len(FAIL))
    for m in FAIL:
        print("  FAIL %s" % m)
    return 1 if FAIL else 0


if __name__ == "__main__":
    sys.exit(main())
