#!/usr/bin/env python3
"""Publica os 13 canvas do pack no Trilium (demo ou VPS) via ETAPI.

    python3 -u deploy-canvas-templates.py --target vps                 # dry-run
    python3 -u deploy-canvas-templates.py --target vps --apply --svg   # publica
    python3 -u deploy-canvas-templates.py --target demo --create --parent <id>

Por que PATCH e não importar o zip: no VPS as notas **já existem** (a importação
do zip criaria duplicatas). A referência é o `!!!meta.json` do pack, que guarda
os `noteId`/`attachmentId` de origem (= inventário do VPS); no demo esses ids não
existem, então cai na busca por `#canvasTemplate` + título e, com `--create`,
cria as notas sob `--parent`.

O conteúdo de uma nota `type=canvas` É o JSON do Excalidraw (não é HTML) e o
anexo `canvas-export.svg` é o preview da árvore — os dois são sincronizados aqui.
"""

import argparse
import glob
import hashlib
import json
import os
import sys
import urllib.error

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "Escrita-Templates"))
import build  # noqa: E402  (cliente ETAPI + tokens demo/VPS — ver Escrita-Templates/build.py)

DIR = os.path.join(HERE, "Canvas-templates")
SVG_TITLE = "canvas-export.svg"


def achar(nome):
    """Caminho do arquivo do pack pelo `dataFileName` (nome truncado pelo export)."""
    hits = glob.glob(os.path.join(DIR, "**", nome), recursive=True)
    return hits[0] if hits else None


def canon(b):
    """JSON canônico (para comparar conteúdo sem depender de formatação)."""
    if isinstance(b, (dict, list)):
        return json.dumps(b, sort_keys=True, ensure_ascii=False)
    return json.dumps(json.loads(b), sort_keys=True, ensure_ascii=False)


def igual_json(atual, local_bytes):
    """O ETAPI devolve `dict` para nota canvas (mime JSON) e `str` para o resto."""
    if atual is None:
        return False
    try:
        return canon(atual) == canon(local_bytes)
    except Exception:
        return False


def notas_do_meta():
    meta = json.load(open(os.path.join(DIR, "!!!meta.json"), encoding="utf-8"))
    notas = []

    def walk(ns):
        for n in ns:
            if n.get("type") == "canvas":
                notas.append(n)
            walk(n.get("children") or [])

    walk(meta.get("files") or [])
    return notas


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--target", choices=["demo", "vps"], default="vps")
    ap.add_argument("--apply", action="store_true", help="sem isso é dry-run")
    ap.add_argument(
        "--svg", action="store_true", help="também atualiza o anexo do preview"
    )
    ap.add_argument("--create", action="store_true", help="cria a nota se não existir")
    ap.add_argument("--parent", help="pai para --create (ex.: 'root')")
    a = ap.parse_args()

    base, token = build.target(a.target)
    tl = build.Trilium(base, token)
    print("== alvo %s (%s)%s" % (a.target, base, "" if a.apply else " · DRY-RUN"))

    # índice do alvo: título -> noteId (busca por label; casa herdável também)
    indice = {}
    for r in tl.search("#canvasTemplate") or []:
        indice.setdefault(r["title"], r["noteId"])

    criadas = atualizadas = iguais = 0
    for n in sorted(notas_do_meta(), key=lambda x: x["title"]):
        titulo, nid = n["title"], n["noteId"]
        arq_json = achar(n["dataFileName"])
        anexo = (n.get("attachments") or [{}])[0]
        arq_svg = achar(anexo.get("dataFileName") or "")
        if not arq_json:
            print(
                "  !! %s: JSON local não encontrado (%s)" % (titulo, n["dataFileName"])
            )
            continue
        local_json = open(arq_json, "rb").read()

        # 1) resolve a nota no alvo (id do meta -> busca -> criar)
        destino, como = None, ""
        try:
            viva = tl.note(nid)
            if viva and viva.get("title") == titulo:
                destino, como = nid, "meta"
        except urllib.error.HTTPError:
            pass
        if not destino and titulo in indice:
            destino, como = indice[titulo], "busca"
        if not destino:
            if not (a.create and a.parent):
                print(
                    "  !! %s: nota não existe no alvo (use --create --parent)" % titulo
                )
                continue
            if not a.apply:
                print("  +  %-32s criaria sob %s" % (titulo[:31], a.parent))
                criadas += 1
                continue
            destino = tl.create(
                a.parent,
                titulo,
                local_json.decode("utf-8"),
                "canvas",
                mime="application/json",
            )
            tl.add_attr(destino, "label", "template")
            tl.add_attr(destino, "label", "canvasTemplate")
            como = "criada"
            print("  +  %-32s %s (nova)" % (titulo[:31], destino))

        # 2) conteúdo da nota
        atual = tl.req("/notes/%s/content" % destino)
        if igual_json(atual, local_json):
            iguais += 1
            print(
                "  =  %-32s %s [%s] conteúdo já é o atual"
                % (titulo[:31], destino, como)
            )
        else:
            if a.apply:
                tl.req(
                    "/notes/%s/content" % destino, "PUT", raw=local_json.decode("utf-8")
                )
            atualizadas += 1
            print(
                "  ~  %-32s %s [%s] conteúdo %s"
                % (
                    titulo[:31],
                    destino,
                    como,
                    "atualizado" if a.apply else "seria atualizado",
                )
            )

        # 3) anexo canvas-export.svg (preview da árvore)
        if not a.svg or not arq_svg:
            continue
        local_svg = open(arq_svg, "rb").read()
        aid = None
        for att in tl.req("/notes/%s/attachments" % destino) or []:
            if att.get("title") == SVG_TITLE:
                aid = att["attachmentId"]
                break
        if not aid:
            if not a.apply:
                print("       anexo %s: criaria" % SVG_TITLE)
                continue
            r = tl.req(
                "/attachments",
                "POST",
                {
                    "ownerId": destino,
                    "title": SVG_TITLE,
                    "role": "image",
                    "mime": "image/svg+xml",
                    "position": 0,
                },
            )
            aid = r["attachmentId"]
        atual_svg = tl.req("/attachments/%s/content" % aid)
        if isinstance(atual_svg, str) and canon_svg(atual_svg) == canon_svg(
            local_svg.decode("utf-8", "replace")
        ):
            print("       anexo já atual")
        elif a.apply:
            tl.req(
                "/attachments/%s/content" % aid, "PUT", raw=local_svg.decode("utf-8")
            )
            print("       anexo atualizado (%s, %d B)" % (aid, len(local_svg)))
        else:
            print("       anexo seria atualizado (%s)" % aid)

    print(
        "== fim: %d atualizadas · %d criadas · %d já iguais%s"
        % (atualizadas, criadas, iguais, "" if a.apply else " (dry-run)")
    )


def canon_svg(s):
    """Compara SVG ignorando o rodapé de assinatura do Trilium (se houver)."""
    import re

    s = re.sub(r"\s+", " ", s).strip()
    return hashlib.sha256(s.encode("utf-8")).hexdigest()


if __name__ == "__main__":
    main()
