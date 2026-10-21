#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Gera os canvases do super-template de escrita (rodada 16).

Três moldes, todos com exemplo dentro (decisão do Ricardo, 17/10):

  _tpl-Storyboard  (HQ)        página com 4 quadros (ação · balão · tempo)
  _tpl-Mapa        (Canon)     4 nós + setas tipadas (relações)
  _tpl-Arcos       (Prosa)     3 atos × 3 tramas + paradas (esqueleto)

O JSON é o formato do Excalidraw usado pelo Trilium: `{"type":"excalidraw",
"version":2,"elements":[...],"files":{},"appState":{...}}`. Regras herdadas da
rodada 15 (pack Canvas-Templates): texto >= 12px, contraste WCAG AA, origem >= 0,
`index` sequencial (a00, a01, ...), `roundness` consistente.

Uso:
    python3 make-canvas.py --write        # grava Canvas/*.json
    python3 make-canvas.py --png          # gera Canvas/*.png (conferência visual)
    python3 make-canvas.py --check        # valida (fonte, contraste, origem, ids)
    python3 make-canvas.py --write --kit  # grava também no pack do kit (fonte única)

O `--kit` espelha os três no `Canvas-Templates` (pasta "Templates - Escrita"), com o
appState do pack (sem `gridSize`). Depois de mudar o desenho, rode também
`Canvas-Templates/render-canvas.py --svg` e regenere o zip (o harness do pack checa o
espelho, não o SVG).
"""

import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "Canvas")
# Espelho no pack do kit (fonte única é este script; o harness do pack confere)
KIT_DIR = os.path.join(
    HERE, "..", "Canvas-Templates", "Canvas-templates", "Canvas - templates",
    "Templates - Escrita",
)
KIT = {
    "_tpl-Storyboard": "Template - Storyboard (HQ)",
    "_tpl-Mapa": "Template - Mapa de relações",
    "_tpl-Arcos": "Template - Mapa de arcos & plotlines",
}
STAMP = 1780000000000  # determinístico: o JSON não muda entre execuções
FONT = 2  # 2 = Helvetica (neutro); o pack da rodada 15 usa isto no grosso
LINE_H = 1.2857142857142858


class Gen:
    """Contador de ids/seed/index — determinístico por canvas."""

    def __init__(self):
        self.n = 0
        self.els = []

    def _base(self, tipo, x, y, w, h, **kw):
        self.n += 1
        e = {
            "id": kw.pop("id", "%s-%02d" % (tipo, self.n)),
            "type": tipo,
            "x": x,
            "y": y,
            "width": w,
            "height": h,
            "strokeColor": kw.pop("stroke", "#1f2937"),
            "backgroundColor": kw.pop("fill", "transparent"),
            "fillStyle": "solid",
            "strokeWidth": kw.pop("sw", 2),
            "roughness": 0,
            "opacity": 100,
            "angle": 0,
            "seed": 10000 + self.n,
            "version": 1,
            "versionNonce": 1000 + self.n,
            "groupIds": [],
            "boundElements": [],
            "index": "a%02d" % (self.n - 1),
            "isDeleted": False,
            "strokeStyle": "solid",
            "frameId": None,
            "roundness": kw.pop("roundness", None),
            "updated": STAMP,
            "link": None,
            "locked": False,
        }
        if tipo == "text":
            fs = kw.pop("fs", 14)
            e.update(
                {
                    "text": kw.pop("text", ""),
                    "fontSize": fs,
                    "fontFamily": kw.pop("family", FONT),
                    "textAlign": kw.pop("align", "left"),
                    "verticalAlign": "top",
                    "baseline": round(fs * LINE_H, 2),
                    "containerId": None,
                    "originalText": None,
                    "autoResize": True,
                    "lineHeight": LINE_H,
                }
            )
            e["originalText"] = e["text"]
        if tipo == "arrow":
            e.update(
                {
                    "points": kw.pop("points", [[0, 0], [0, 40]]),
                    "startBinding": None,
                    "endBinding": None,
                    "startArrowhead": None,
                    "endArrowhead": kw.pop("ponta", "arrow"),
                    "lastCommittedPoint": None,
                }
            )
        assert not kw, "sobraram campos: %s" % list(kw)
        self.els.append(e)
        return e

    def rect(self, x, y, w, h, **kw):
        return self._base("rectangle", x, y, w, h, **kw)

    def ellipse(self, x, y, w, h, **kw):
        return self._base("ellipse", x, y, w, h, **kw)

    def text(self, x, y, s, fs=14, **kw):
        largura = round(len(s) * fs * 0.55, 2)
        return self._base(
            "text", x, y, largura, round(fs * LINE_H, 2), text=s, fs=fs, **kw
        )

    def seta(self, x0, y0, x1, y1, **kw):
        return self._base(
            "arrow",
            x0,
            y0,
            abs(x1 - x0),
            abs(y1 - y0),
            points=[[0, 0], [x1 - x0, y1 - y0]],
            **kw,
        )

    def doc(self):
        return {
            "type": "excalidraw",
            "version": 2,
            "elements": self.els,
            "files": {},
            "appState": {
                "viewBackgroundColor": "#ffffff",
                "gridModeEnabled": True,
                "gridSize": 20,
                "zoom": {"value": 1},
                "scrollX": 40,
                "scrollY": 20,
            },
        }


# ------------------------------------------------------------------ paleta
TINTA = "#1f2937"  # 14.6:1 sobre branco
TINTA_FRACA = "#4b5563"  # 8.6:1
TRACO = "#94a3b8"
AZUL_BG, AZUL_BORDA = "#e0f2fe", "#0369a1"
AMBAR_BG, AMBAR_BORDA = "#fef3c7", "#92400e"
VERDE_BG, VERDE_BORDA = "#dcfce7", "#166534"
CINZA_BG = "#f1f5f9"


# ------------------------------------------------------------------ canvases


def storyboard():
    g = Gen()
    g.text(40, 20, "Storyboard — página 1", fs=24, stroke=TINTA)
    g.text(
        40,
        55,
        "rascunho livre — risque, reescreva e desenhe por cima",
        fs=12,
        stroke=TINTA_FRACA,
    )
    # a página
    g.rect(40, 90, 1000, 720, stroke=TRACO, roundness={"type": 3, "value": 6})
    quadros = [
        (60, 110, "Q1", True),
        (550, 110, "Q2", False),
        (60, 450, "Q3", False),
        (550, 450, "Q4", False),
    ]
    for x, y, rot, exemplo in quadros:
        g.rect(
            x,
            y,
            470,
            320,
            stroke=AZUL_BORDA,
            fill=AZUL_BG if exemplo else CINZA_BG,
            roundness={"type": 3, "value": 8},
        )
        g.text(x + 14, y + 10, rot, fs=14, stroke=TINTA, fill="transparent")
        g.text(
            x + 14,
            y + 45,
            "AÇÃO: "
            + ("Ela abre a porta; a sala está vazia." if exemplo else "(o que se vê)"),
            fs=12,
            stroke=TINTA,
        )
        g.text(
            x + 14,
            y + 75,
            "BALÃO: " + ("— Cheguei." if exemplo else "(fala ou som)"),
            fs=12,
            stroke=TINTA,
        )
        g.text(
            x + 14,
            y + 105,
            "TEMPO: " + ("3s" if exemplo else "(ex.: 2s)"),
            fs=12,
            stroke=TINTA,
        )
        g.text(
            x + 14,
            y + 145,
            "(desenhe o quadro aqui)",
            fs=12,
            stroke=TINTA_FRACA,
        )
    g.text(
        40,
        830,
        "AÇÃO · BALÃO · TEMPO — um quadro por bloco de leitura",
        fs=12,
        stroke=TINTA_FRACA,
    )
    return g.doc()


def mapa():
    g = Gen()
    g.text(40, 20, "Mapa de relações", fs=24, stroke=TINTA)
    g.text(
        40,
        55,
        "um nó por personagem · escreva o tipo na seta",
        fs=12,
        stroke=TINTA_FRACA,
    )

    nos = [
        (380, 300, "Protagonista", AZUL_BG, AZUL_BORDA),
        (760, 170, "Aliado", VERDE_BG, VERDE_BORDA),
        (760, 470, "Rival", AMBAR_BG, AMBAR_BORDA),
        (60, 300, "Mentor", CINZA_BG, TRACO),
    ]
    for x, y, nome, bg, borda in nos:
        g.rect(x, y, 240, 90, stroke=borda, fill=bg, roundness={"type": 3, "value": 12})
        g.text(x + 20, y + 33, nome, fs=16, stroke=TINTA)

    g.seta(620, 345, 760, 215, stroke=TRACO)
    g.text(640, 245, "aliado", fs=12, stroke=TINTA)
    g.seta(620, 375, 760, 470, stroke=TRACO)
    g.text(650, 440, "rival", fs=12, stroke=TINTA)
    g.seta(300, 345, 380, 345, stroke=TRACO)
    g.text(305, 310, "mentor", fs=12, stroke=TINTA)

    g.rect(
        40, 640, 960, 90, stroke=TRACO, fill=CINZA_BG, roundness={"type": 3, "value": 8}
    )
    g.text(
        60,
        660,
        "Tipos: aliado · rival · mentor · família · dívida · segredo",
        fs=14,
        stroke=TINTA,
    )
    g.text(
        60,
        690,
        "Dá para arrastar a nota do personagem para dentro do canvas: o card fica em sincronia com a nota.",
        fs=12,
        stroke=TINTA_FRACA,
    )
    return g.doc()


def arcos():
    g = Gen()
    g.text(40, 20, "Mapa de arcos & plotlines", fs=24, stroke=TINTA)
    g.text(
        40,
        55,
        "colunas = atos · linhas = tramas · marcadores = paradas",
        fs=12,
        stroke=TINTA_FRACA,
    )

    atos = [
        ("ATO 1", 60, CINZA_BG),
        ("ATO 2", 440, "#ffffff"),
        ("ATO 3", 820, CINZA_BG),
    ]
    for nome, x, bg in atos:
        g.rect(
            x, 100, 360, 560, stroke=TRACO, fill=bg, roundness={"type": 3, "value": 4}
        )
        g.text(x + 130, 112, nome, fs=14, stroke=TINTA_FRACA)

    paradas = [
        ("inciting", 130),
        ("virada 1", 390),
        ("meio", 620),
        ("virada 2", 890),
        ("clímax", 1090),
    ]
    for _, px in paradas:  # guias verticais, atrás das tramas
        g.seta(px, 115, px, 655, stroke="#e2e8f0", sw=1, ponta=None)

    tramas = [
        ("A-plot (principal)", 170, AMBAR_BG, AMBAR_BORDA, [0, 1, 2, 3, 4]),
        ("B-plot (romance)", 330, AZUL_BG, AZUL_BORDA, [0, 2, 4]),
        ("C-plot (mistério)", 490, VERDE_BG, VERDE_BORDA, [3]),
    ]
    for nome, y, bg, borda, marcas in tramas:
        g.rect(
            60, y, 1120, 120, stroke=borda, fill=bg, roundness={"type": 3, "value": 6}
        )
        g.text(76, y + 10, nome, fs=13, stroke=TINTA)
        for i in marcas:
            px = paradas[i][1]
            g.ellipse(px - 9, y + 50, 18, 18, stroke=borda, fill="#ffffff")
    for nome, px in paradas:
        g.text(px - 24, 680, nome, fs=12, stroke=TINTA_FRACA)
    return g.doc()


# ------------------------------------------------------------------ checagem
AA = 4.5


def _lum(h):
    h = h.lstrip("#")
    if len(h) != 6:
        return None
    c = [int(h[i : i + 2], 16) / 255 for i in (0, 2, 4)]
    c = [(v / 12.92) if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in c]
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]


def _controle(c1, c2):
    a, b = _lum(c1), _lum(c2)
    if a is None or b is None:
        return None
    hi, lo = max(a, b), min(a, b)
    return (hi + 0.05) / (lo + 0.05)


def _fundo(doc, e):
    """Fundo real sob o texto: shape (com fill) mais ao topo que contém o centro."""
    cx = e["x"] + e["width"] / 2
    cy = e["y"] + e["height"] / 2
    achado = doc["appState"]["viewBackgroundColor"]
    for o in doc["elements"]:
        if o["type"] not in ("rectangle", "ellipse", "diamond"):
            continue
        if not (
            o["x"] <= cx <= o["x"] + o["width"] and o["y"] <= cy <= o["y"] + o["height"]
        ):
            continue
        if o["backgroundColor"] and o["backgroundColor"] != "transparent":
            achado = o["backgroundColor"]
    return achado


def check(nome, doc):
    falhas = []
    ids = [e["id"] for e in doc["elements"]]
    if len(set(ids)) != len(ids):
        falhas.append("ids repetidos")
    for i, e in enumerate(doc["elements"]):
        if e["index"] != "a%02d" % i:
            falhas.append("%s: index fora de sequência (%s)" % (e["id"], e["index"]))
        if e["x"] < 0 or e["y"] < 0:
            falhas.append("%s: origem negativa" % e["id"])
    for e in doc["elements"]:
        if e["type"] != "text":
            continue
        if (e.get("fontSize") or 0) < 12:
            falhas.append("%s: fontSize %s < 12" % (e["id"], e.get("fontSize")))
        cr = _controle(e["strokeColor"], _fundo(doc, e))
        if cr is None:
            falhas.append("%s: cor não-hex" % e["id"])
        elif cr < AA:
            falhas.append("%s: contraste %.2f (%r)" % (e["id"], cr, e["text"][:30]))
    return falhas


# ------------------------------------------------------------------ saída


def png(nome, doc, escala=1.0):
    """PNG de conferência (PIL): retângulos/elipses + textos, fundo branco."""
    from PIL import Image, ImageDraw, ImageFont

    def fonte(px):
        for p in (
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            "/usr/share/fonts/TTF/DejaVuSans.ttf",
        ):
            if os.path.exists(p):
                return ImageFont.truetype(p, px)
        return ImageFont.load_default()

    larg = int(max(e["x"] + e["width"] for e in doc["elements"]) + 60)
    alt = int(max(e["y"] + e["height"] for e in doc["elements"]) + 60)
    im = Image.new(
        "RGB",
        (int(larg * escala), int(alt * escala)),
        doc["appState"]["viewBackgroundColor"],
    )
    d = ImageDraw.Draw(im)
    for e in doc["elements"]:
        x, y, w, h = (v * escala for v in (e["x"], e["y"], e["width"], e["height"]))
        if e["type"] == "rectangle":
            d.rectangle(
                [x, y, x + w, y + h],
                fill=e["backgroundColor"]
                if e["backgroundColor"] != "transparent"
                else None,
                outline=e["strokeColor"],
                width=1,
            )
        elif e["type"] == "ellipse":
            d.ellipse(
                [x, y, x + w, y + h],
                fill=e["backgroundColor"]
                if e["backgroundColor"] != "transparent"
                else None,
                outline=e["strokeColor"],
                width=1,
            )
        elif e["type"] == "arrow":
            px, py = x, y
            for dx, dy in e["points"][1:]:
                d.line(
                    [px, py, x + dx * escala, y + dy * escala],
                    fill=e["strokeColor"],
                    width=1,
                )
                px, py = x + dx * escala, y + dy * escala
        elif e["type"] == "text":
            d.text(
                (x, y + 2),
                e["text"],
                fill=e["strokeColor"],
                font=fonte(int(e["fontSize"] * escala)),
            )
    p = os.path.join(OUT, nome + ".png")
    im.save(p)
    print("   png %-28s %dx%d -> %s" % (nome, im.width, im.height, os.path.basename(p)))


def escreve_kit(nome, doc):
    """Espelha o canvas no pack (appState do pack não tem gridSize). Devolve True se mudou."""
    d = json.loads(json.dumps(doc))
    d["appState"].pop("gridSize", None)
    p = os.path.join(KIT_DIR, KIT[nome] + ".json")
    texto = json.dumps(d, ensure_ascii=False, separators=(",", ":"))
    antes = open(p, encoding="utf-8").read() if os.path.exists(p) else None
    if antes == texto:
        print("   kit  %-40s já igual" % KIT[nome])
        return False
    os.makedirs(KIT_DIR, exist_ok=True)
    with open(p, "w", encoding="utf-8") as fh:
        fh.write(texto)
    print("   kit  %-40s ATUALIZADO (%d B)" % (KIT[nome], len(texto)))
    return True


CANVASES = {
    "_tpl-Storyboard": storyboard,
    "_tpl-Mapa": mapa,
    "_tpl-Arcos": arcos,
}


def main():
    quer_write = "--write" in sys.argv
    quer_png = "--png" in sys.argv
    quer_kit = "--kit" in sys.argv
    quer_check = "--check" in sys.argv or not (quer_write or quer_png)
    os.makedirs(OUT, exist_ok=True)
    falhas = 0
    for nome, fn in CANVASES.items():
        doc = fn()
        if quer_check:
            f = check(nome, doc)
            print(
                "%-16s %2d elementos  %s"
                % (
                    nome,
                    len(doc["elements"]),
                    "OK" if not f else "FALHAS: " + "; ".join(f),
                )
            )
            falhas += len(f)
        if quer_write:
            p = os.path.join(OUT, nome + ".json")
            with open(p, "w", encoding="utf-8") as fh:
                json.dump(doc, fh, ensure_ascii=False, separators=(",", ":"))
            print(
                "   json %-28s %6d B -> %s"
                % (nome, os.path.getsize(p), os.path.basename(p))
            )
        if quer_png:
            png(nome, doc)
        if quer_kit:
            mudou_kit = escreve_kit(nome, doc) or globals().get("_mudou_kit", False)
            globals()["_mudou_kit"] = mudou_kit
    if quer_kit and globals().get("_mudou_kit"):
        print(
            "\n   kit mudou: rode `python3 ../Canvas-Templates/render-canvas.py --svg`"
            " e regenere o zip (o harness do pack checa o espelho)."
        )
    return 1 if falhas else 0


if __name__ == "__main__":
    sys.exit(main())
