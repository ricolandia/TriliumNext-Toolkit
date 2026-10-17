#!/usr/bin/env python3
"""Renderizador offline do pack Canvas-Templates (rodada 15, batch 2).

Gera, a partir do **estado atual** dos JSONs:

1. o SVG de preview (`canvas-export.svg`) de cada nota;
2. a captura `.webp` do README (1920x1080, canvas ajustado à tela).

O pack é todo `roughness:0` + `fillStyle:solid` + fontes de sistema, então um
render flat reproduz o que o Excalidraw desenha (a régua é o JSON, não o SVG antigo).

Uso:
    python3 render-canvas.py --svg          # regrava os SVGs dos 13 canvas
    python3 render-canvas.py --webp         # regrava imagens/template-N-.webp (usa Chrome)
    python3 render-canvas.py --svg --webp
"""

import glob
import json
import os
import subprocess
import sys

BASE = os.path.dirname(os.path.abspath(__file__))
DIR = os.path.join(BASE, "Canvas-templates")
IMG = os.path.join(BASE, "imagens")
CHROME = "google-chrome"

# ordem do README (template-N-.webp)
ORDEM = [
    "Template - OKR",
    "Template - Feynman",
    "Template - GTD",
    "Template - GTD - Weekly review",
    "Template - storyboard",
    "Template - Cornell",
    "Template - Manual pessoal do u",
    "Template - AIDA",
    "Template - SCAMPER",
    "Template - Design Thinking",
    "Template - Projetos",
    "Template - Character Arc",
    "Template - Plot Timeline",
    "Template - Storyboard (HQ)",
    "Template - Mapa de relações",
    "Template - Mapa de arcos & plotlines",
]

FONTE = {
    1: "Virgil, 'Comic Sans MS', cursive",  # manuscrita (não instalada) → fallback
    2: "Helvetica, Arial, 'Liberation Sans', sans-serif",
    3: "Cascadia, 'Cascadia Code', ui-monospace, Menlo, monospace",
    5: "Nunito, 'Segoe UI', Arial, sans-serif",
    6: "Nunito, 'Segoe UI', Arial, sans-serif",
}
EMOJI = "'Segoe UI Emoji', 'Noto Color Emoji', 'Apple Color Emoji'"


def esc(s):
    return (
        str(s)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def bbox(els, pad=16):
    xs = [(e.get("x") or 0) for e in els] + [
        (e.get("x") or 0) + (e.get("width") or 0) for e in els
    ]
    ys = [(e.get("y") or 0) for e in els] + [
        (e.get("y") or 0) + (e.get("height") or 0) for e in els
    ]
    return min(xs) - pad, min(ys) - pad, max(xs) + pad, max(ys) + pad


def rot(e):
    a = e.get("angle") or 0
    if not a:
        return ""
    cx, cy = (
        (e.get("x") or 0) + (e.get("width") or 0) / 2,
        (e.get("y") or 0) + (e.get("height") or 0) / 2,
    )
    return ' transform="rotate(%.2f %.2f %.2f)"' % (a * 180 / 3.141592653589793, cx, cy)


def opac(e):
    o = e.get("opacity")
    return "" if o is None or o == 100 else ' opacity="%.2f"' % (o / 100)


def dash(e):
    s = e.get("strokeStyle")
    if s == "dashed":
        return ' stroke-dasharray="8 8"'
    if s == "dotted":
        return ' stroke-dasharray="2 6"'
    return ""


def geom(e, out):
    t = e.get("type")
    x, y = e.get("x") or 0, e.get("y") or 0
    w, h = e.get("width") or 0, e.get("height") or 0
    fill = e.get("backgroundColor") or "transparent"
    stroke = e.get("strokeColor") or "#1e1e1e"
    sw = e.get("strokeWidth") or 1
    common = 'fill="%s" stroke="%s" stroke-width="%s"%s%s%s' % (
        fill if fill != "transparent" else "none",
        stroke,
        sw,
        dash(e),
        opac(e),
        rot(e),
    )

    if t == "rectangle":
        r = e.get("roundness") or {}
        rx = min(r.get("value", 0) or 0, w / 2, h / 2) if r.get("type") else 0
        out.append(
            '<rect x="%.2f" y="%.2f" width="%.2f" height="%.2f" rx="%.2f" %s/>'
            % (x, y, w, h, rx, common)
        )
    elif t == "ellipse":
        out.append(
            '<ellipse cx="%.2f" cy="%.2f" rx="%.2f" ry="%.2f" %s/>'
            % (x + w / 2, y + h / 2, w / 2, h / 2, common)
        )
    elif t == "diamond":
        out.append(
            '<polygon points="%.2f,%.2f %.2f,%.2f %.2f,%.2f %.2f,%.2f" %s/>'
            % (x + w / 2, y, x + w, y + h / 2, x + w / 2, y + h, x, y + h / 2, common)
        )
    elif t in ("line", "arrow"):
        pts = e.get("points") or []
        if len(pts) < 2:
            return
        d = " ".join("%.2f,%.2f" % (x + p[0], y + p[1]) for p in pts)
        mk = ""
        if e.get("endArrowhead"):
            mk += ' marker-end="url(#seta-%s)"' % stroke.lstrip("#")
        if e.get("startArrowhead"):
            mk += ' marker-start="url(#seta-%s)"' % stroke.lstrip("#")
        out.append(
            '<polyline points="%s" fill="none" stroke="%s" stroke-width="%s" stroke-linecap="round"%s%s%s/>'
            % (d, stroke, sw, dash(e), opac(e), mk)
        )
    elif t == "text":
        lines = (e.get("text") or "").split("\n")
        fs = e.get("fontSize") or 16
        lh = max((e.get("height") or 0) / max(1, len(lines)), fs * 1.25)
        bloco = lh * len(lines)
        top = y + (h - bloco) / 2 if e.get("verticalAlign") == "middle" else y
        align = e.get("textAlign") or "left"
        anchor = {"left": "start", "center": "middle", "right": "end"}.get(
            align, "start"
        )
        tx = x if anchor == "start" else (x + w / 2 if anchor == "middle" else x + w)
        fam = FONTE.get(e.get("fontFamily"), FONTE[2])
        out.append('<g fill="%s"%s%s>' % (stroke, opac(e), rot(e)))
        for i, ln in enumerate(lines):
            if not ln.strip():
                continue
            out.append(
                '<text x="%.2f" y="%.2f" font-family="%s, %s" font-size="%.2f" text-anchor="%s" xml:space="preserve">%s</text>'
                % (tx, top + i * lh + fs * 0.9, fam, EMOJI, fs, anchor, esc(ln))
            )
        out.append("</g>")


def svg(doc, scale=1.0):
    els = doc["elements"]
    x0, y0, x1, y1 = bbox(els)
    w, h = x1 - x0, y1 - y0
    cores = {
        e.get("strokeColor")
        for e in els
        if e.get("type") in ("line", "arrow") and e.get("strokeColor")
    }
    out = [
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="%.2f %.2f %.2f %.2f" width="%d" height="%d">'
        % (x0, y0, w, h, round(w * scale), round(h * scale))
    ]
    out.append("<defs>")
    for c in sorted(cores):
        out.append(
            '<marker id="seta-%s" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">'
            '<path d="M0,0 L10,5 L0,10 z" fill="%s"/></marker>' % (c.lstrip("#"), c)
        )
    out.append("</defs>")
    out.append(
        '<rect x="%.2f" y="%.2f" width="%.2f" height="%.2f" fill="%s"/>'
        % (
            x0,
            y0,
            w,
            h,
            doc.get("appState", {}).get("viewBackgroundColor") or "#ffffff",
        )
    )
    for e in els:
        if not e.get("isDeleted"):
            geom(e, out)
    out.append("</svg>")
    return "\n".join(out)


def escreve(name, path, svg_text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    open(path, "w", encoding="utf-8").write(svg_text)
    print("  svg  %-34s %6d B" % (os.path.basename(path), len(svg_text)))


def captura(name, svg_text, destino, MAXW=1600, MAXH=2200):
    import re

    m = re.search(r'viewBox="([-\d.]+) ([-\d.]+) ([\d.]+) ([\d.]+)"', svg_text)
    vw, vh = float(m.group(3)), float(m.group(4))
    k = min(
        MAXW / vw, MAXH / vh, 1.6
    )  # preserva a proporção do canvas (senão o texto fica ilegível)
    W, H = round(vw * k), round(vh * k)
    s = svg_text.replace(
        m.group(0),
        'viewBox="%s %s %s %s" width="%d" height="%d"'
        % (
            m.group(1),
            m.group(2),
            m.group(3),
            m.group(4),
            W,
            H,
        ),
        1,
    )
    html = (
        "<html><head><meta charset='utf-8'><style>html,body{margin:0;width:%dpx;height:%dpx;"
        "background:#fff;display:flex;align-items:center;justify-content:center;overflow:hidden}"
        "svg{display:block}</style></head><body>%s</body></html>" % (W, H, s)
    )
    tmp = "/tmp/opencode/ct-preview.html"
    open(tmp, "w", encoding="utf-8").write(html)
    png = "/tmp/opencode/ct-preview.png"
    subprocess.run(
        [
            CHROME,
            "--headless=new",
            "--no-sandbox",
            "--disable-gpu",
            "--hide-scrollbars",
            "--force-device-scale-factor=1",
            "--window-size=%d,%d" % (W, H),
            "--screenshot=" + png,
            "file://" + tmp,
        ],
        check=True,
        capture_output=True,
    )
    from PIL import Image

    Image.open(png).convert("RGB").save(destino, "WEBP", quality=82, method=5)
    print(
        "  webp %-34s %6.1f KB"
        % (os.path.basename(destino), os.path.getsize(destino) / 1024)
    )


def main():
    quer_svg, quer_webp = "--svg" in sys.argv, "--webp" in sys.argv
    docs = {}
    for f in sorted(glob.glob(os.path.join(DIR, "**", "*.json"), recursive=True)):
        if f.endswith("!!!meta.json"):
            continue
        docs[os.path.basename(f).replace(".json", "")] = (f, json.load(open(f)))
    # nome do anexo vem do !!!meta.json (o export trunca nomes de forma imprevisível)
    anexos = {}
    meta = json.load(open(os.path.join(DIR, "!!!meta.json")))

    def walk(nodes):
        for n in nodes:
            for a in n.get("attachments") or []:
                if n.get("dataFileName"):
                    anexos[n["dataFileName"]] = a.get("dataFileName")
            walk(n.get("children") or [])

    walk(meta.get("files") or [])
    if quer_svg:
        for name, (path, doc) in docs.items():
            svgname = anexos.get(os.path.basename(path))
            alvo = os.path.join(os.path.dirname(path), svgname or "")
            if not svgname or not os.path.exists(alvo):
                print("  !! sem SVG mapeado para", name)
                continue
            escreve(name, alvo, svg(doc))
    if quer_webp:
        os.makedirs(IMG, exist_ok=True)
        for i, tpl in enumerate(ORDEM, start=1):
            if tpl not in docs:
                print("  !! template não encontrado:", tpl)
                continue
            captura(tpl, svg(docs[tpl][1]), os.path.join(IMG, "template-%d-.webp" % i))


if __name__ == "__main__":
    main()
