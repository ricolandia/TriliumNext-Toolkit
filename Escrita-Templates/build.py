#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Constrói o super-template de escrita no Trilium (demo ou VPS) via ETAPI.

Uso:
    python3 -u build.py --target demo                     # cria/atualiza
    python3 -u build.py --target demo --preflight         # checa as notas-script
    python3 -u build.py --target demo --test              # instancia e audita o remap
    python3 -u build.py --target vps --dest-parent <id>   # publica + pasta-destino
    python3 -u build.py --target vps --dest-parent <id> --prune

Notas de campo (0.106):
- `create-note` exige `content` (mesmo vazio) e NÃO aceita `template`.
- `PATCH` de attribute não aceita `value`/`isInheritable` -> DELETE + POST.
- Atributos vêm no GET da nota (não há `GET /notes/{id}/attributes`).
- Busca com valor contendo hífen precisa de aspas (`#x="a-b"`), senão o valor é
  quebrado e a busca cai em texto livre.
- Relação apontando para nota inexistente falha (400/404): os scripts de plugin
  são resolvidos por capacidade (`probe:`) e, se faltarem, a tela vira pasta.
- Estado em `.state-<target>.json` (key -> noteId) evita varreduras no VPS.
"""

import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import content  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))

DEMO = (
    "http://localhost:8080",
    None,
)  # token em TRILIUM_DEMO_TOKEN (env/~/.hermes/.env)
AGENDA = "/home/ricardo/Documentos/50_Criativo/Scripts_PY_/trilium_agenda_diaria.py"
UA = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/124.0 Safari/537.36"
)

# atributos que o build gerencia (removidos se saírem da spec)
MANAGED = {
    "template",
    "iconClass",
    "label:projeto",
    "label:status",
    "status",
    "relation:plotline",
    "child:template",
    "renderNote",
    "template:newNoteDefaultParent",
}
# capacidade -> título da nota-script que a oferece
SCRIPTS = [
    ("Longform Compiler (grade)", "js - grade"),
    ("Fountain Renderer (roteiro)", "js - Fountain"),
    ("Canvas Note Tools (opcional)", "#canvasTemplate"),
]


def env_token(nome):
    """Token por variável de ambiente -> ~/.hermes/.env (nunca no repositório)."""
    tok = os.environ.get(nome)
    if tok:
        return tok.strip()
    envfile = os.path.expanduser("~/.hermes/.env")
    if os.path.exists(envfile):
        for line in open(envfile, encoding="utf-8"):
            if line.strip().startswith(nome + "="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    return None


def vps_token():
    """Token do VPS: env -> env(...) no script da agenda -> ~/.hermes/.env."""
    tok = os.environ.get("TRILIUM_TOKEN")
    if tok:
        return tok.strip()
    src = open(AGENDA, encoding="utf-8").read()
    m = re.search(r'TTOKEN\s*=\s*(?:env\("[^"]+",\s*)?"([^"]+)"', src)
    if m:
        return m.group(1)
    tok = env_token("TRILIUM_TOKEN")
    if not tok:
        raise SystemExit("TRILIUM_TOKEN não encontrado (env, agenda, ~/.hermes/.env)")
    return tok


def target(name):
    if name == "demo":
        return (DEMO[0], env_token("TRILIUM_DEMO_TOKEN") or _die("TRILIUM_DEMO_TOKEN"))

    return ("https://trilium.rizomatico.org", vps_token())


def _die(nome):
    raise SystemExit("%s não encontrado (env ou ~/.hermes/.env)" % nome)


class Trilium:
    def __init__(self, base, token):
        self.base, self.token = base.rstrip("/") + "/etapi", token

    def req(self, path, method="GET", body=None, raw=None):
        data, headers = (
            None,
            {"Authorization": "Bearer " + self.token, "User-Agent": UA},
        )
        if raw is not None:
            data = raw.encode("utf-8")
            headers["Content-Type"] = "text/plain; charset=utf-8"
        elif body is not None:
            data = json.dumps(body).encode("utf-8")
            headers["Content-Type"] = "application/json"
        r = urllib.request.Request(
            self.base + path, data=data, method=method, headers=headers
        )
        with urllib.request.urlopen(r, timeout=60) as resp:
            b = resp.read()
            if not b:
                return None
            try:
                return json.loads(b)
            except Exception:
                return b.decode("utf-8", "replace")

    def note(self, nid):
        return self.req("/notes/" + nid)

    def create(self, parent, title, html="", note_type="text", mime=None):
        body = {
            "parentNoteId": parent,
            "title": title,
            "type": note_type,
            "content": html or "",
        }
        if mime:
            body["mime"] = mime
        return self.req("/create-note", "POST", body)["note"]["noteId"]

    def add_attr(self, nid, a_type, name, value="", inheritable=False):
        self.req(
            "/attributes",
            "POST",
            {
                "noteId": nid,
                "type": a_type,
                "name": name,
                "value": value,
                "isInheritable": inheritable,
                "position": 100,
            },
        )

    def del_attr(self, aid):
        self.req("/attributes/" + aid, "DELETE")

    def owned(self, nid):
        """Atributos PRÓPRIOS da nota: [(type, name, value, id)]."""
        n = self.note(nid) or {}
        return [
            (a["type"], a["name"], a.get("value", ""), a["attributeId"])
            for a in n.get("attributes", [])
            if a.get("noteId") == nid
        ]

    def search(self, q):
        d = (
            self.req("/notes?search=" + urllib.parse.quote(q) + "&fastSearch=false")
            or {}
        )
        return d.get("results", [])


# ------------------------------------------------------- conteúdo (texto/JSON)


def canon_json(v):
    """JSON canônico: o ETAPI devolve `dict` para nota canvas e `str` para o resto."""
    if isinstance(v, (dict, list)):
        return json.dumps(v, sort_keys=True, ensure_ascii=False, separators=(",", ":"))
    return json.dumps(
        json.loads(v), sort_keys=True, ensure_ascii=False, separators=(",", ":")
    )


def conteudo_igual(atual, novo, eh_canvas):
    if atual is None:
        return False
    if eh_canvas:
        try:
            return canon_json(atual) == canon_json(novo)
        except Exception:
            return False
    if isinstance(atual, dict):  # canvas chegou como dict e o nó não é canvas
        return False
    return (atual or "").strip() == (novo or "").strip()


# ------------------------------------------------------------------ probes


def resolve_probes(tl):
    """Resolve os alvos `probe:<título>` (scripts de plugin) por busca."""
    probes = {}
    for node in flatten([content.TREE]):
        for _, tkey, _ in node["relations"]:
            if not tkey.startswith("probe:") or tkey in probes:
                continue
            want = tkey[6:]
            hits = [
                r
                for r in tl.search('"%s"' % want)
                if r["title"] == want or r["title"].startswith(want)
            ]
            exact = [h for h in hits if h["title"] == want]

            def num(h):
                m = re.search(r"(\d+)\s*$", h["title"])
                return int(m.group(1)) if m else -1

            # réplica numerada ("js - Fountain 3") é a versão nova do script —
            # preferir o MAIOR número; sem numerada, o título exato.
            numeradas = [h for h in hits if num(h) > 0]
            if numeradas:
                escolha = max(numeradas, key=num)
            elif exact:
                escolha = exact[0]
            else:
                escolha = hits[0] if hits else None
            if escolha:
                probes[tkey] = escolha["noteId"]
                print(
                    "   probe %-16s -> %-22s %s"
                    % (want, escolha["title"], escolha["noteId"])
                )
            else:
                print("   probe %-16s -> AUSENTE" % want)
    return probes


def resolve(tkey, ids, probes):
    if tkey.startswith("probe:"):
        return probes.get(tkey)
    if tkey.startswith("ext:"):
        return tkey[4:]
    return ids.get(tkey)


# ------------------------------------------------------------------ estado


def load_state(tgt):
    p = os.path.join(HERE, ".state-%s.json" % tgt)
    if os.path.exists(p):
        with open(p, encoding="utf-8") as f:
            return json.load(f)
    return {}


def save_state(tgt, st):
    with open(os.path.join(HERE, ".state-%s.json" % tgt), "w", encoding="utf-8") as f:
        json.dump(st, f, ensure_ascii=False, indent=1, sort_keys=True)


def flatten(nodes, out=None):
    out = [] if out is None else out
    for n in nodes:
        out.append(n)
        flatten(n["children"], out)
    return out


# ------------------------------------------------------------------ build


def walk(nodes, parent, tl, st, probes, prefix=""):
    """Cria/atualiza recursivamente; devolve {key: noteId}."""
    ids = {}
    for node in nodes:
        wants_render = any(r[0] == "renderNote" for r in node["relations"])
        pode_render = all(
            resolve(r[1], {}, probes) for r in node["relations"] if r[0] == "renderNote"
        )
        tipo = node["type"]
        if tipo == "render" and not pode_render:
            tipo = "text"
            print(
                '    ! %s: sem "%s" nesta instância -> pasta comum'
                % (node["title"], "renderNote")
            )
        corpo = node.get("content")
        if corpo is None:
            corpo = node.get("html") or ""
        nid = st.get(node["key"])
        if nid:
            try:
                cur = tl.note(nid)
            except urllib.error.HTTPError:
                nid = None
            else:
                if cur["type"] != tipo:
                    tl.req("/notes/" + nid, "PATCH", {"type": tipo})
                    print(
                        "    ~ %-24s type %s -> %s" % (node["title"], cur["type"], tipo)
                    )
                if cur["title"] != node["title"]:
                    tl.req("/notes/" + nid, "PATCH", {"title": node["title"]})
                    print(
                        "    ~ %-24s título %r -> %r"
                        % (node["title"], cur["title"][:22], node["title"])
                    )
                # conteúdo: o build sincroniza texto/código/canvas. Render note
                # NÃO (o conteúdo dela é gerado pelo script do plugin).
                if tipo != "render":
                    atual = tl.req("/notes/%s/content" % nid)
                    if not conteudo_igual(atual, corpo, tipo == "canvas"):
                        tl.req("/notes/%s/content" % nid, "PUT", raw=corpo)
                        print(
                            "    ~ %-24s conteúdo atualizado (%d B)"
                            % (node["title"], len(corpo))
                        )
        if not nid:
            nid = tl.create(parent, node["title"], corpo, tipo, node.get("mime"))
            print("  + %s%-28s %s" % (prefix, node["title"], nid))
        ids[node["key"]] = nid
        ids.update(walk(node["children"], nid, tl, st, probes, prefix + "  "))
    return ids


def wire(nodes, ids, tl, probes):
    """Sincroniza labels/relações (remove o que saiu da spec) e resolve keys."""
    for node in nodes:
        nid = ids[node["key"]]
        quer_labels = [(l[0], l[1]) for l in node["labels"]]
        quer_rels = [
            (r[0], resolve(r[1], ids, probes))
            for r in node["relations"]
            if resolve(r[1], ids, probes)
        ]
        have = {(t, n, v) for t, n, v, _ in tl.owned(nid)}
        nomes_quer = {l[0] for l in node["labels"]} | {r[0] for r in node["relations"]}
        # probes: nome do atributo -> noteId resolvido (None se a capacidade falta)
        alvos_probe = {
            r[0]: resolve(r[1], ids, probes)
            for r in node["relations"]
            if r[1].startswith("probe:")
        }
        for t, n, v, aid in tl.owned(nid):
            if n not in MANAGED:
                continue
            if n not in nomes_quer:  # a spec não declara mais este atributo
                tl.del_attr(aid)
                print("    - %-12s %s %s (saiu da spec)" % (node["title"], n, v))
            elif n in alvos_probe:
                # alvo por capacidade: só mexer se o probe RESOLVEU e o valor
                # atual aponta para outro script (senão ficam dois renderNote).
                if alvos_probe[n] and v != alvos_probe[n]:
                    tl.del_attr(aid)
                    print(
                        "    - %-12s %s %s (script antigo; o probe aponta para outro)"
                        % (node["title"], n, v)
                    )
                continue
            elif (t, n, v) not in (
                {("label", a, b) for a, b in quer_labels}
                | {("relation", a, b) for a, b in quer_rels}
            ):
                tl.del_attr(aid)
                print("    - %-12s %s %s (saiu da spec)" % (node["title"], n, v))
        for name, value, inh in node["labels"]:
            if ("label", name, value) not in have:
                tl.add_attr(nid, "label", name, value, inh)
                print("    ~ %-12s #%s=%s" % (node["title"], name, value))
        for name, tkey, inh in node["relations"]:
            tgt = resolve(tkey, ids, probes)
            if not tgt:
                print(
                    "    ! %s: relação %s -> %s não resolvida"
                    % (node["title"], name, tkey)
                )
                continue
            if ("relation", name, tgt) not in have:
                tl.add_attr(nid, "relation", name, tgt, inh)
                print("    ~ %-12s %s -> %s" % (node["title"], name, tgt))
        wire(node["children"], ids, tl, probes)


def prune(state, tl, dry=True):
    """Notas no estado que saíram da árvore -> candidatas a remoção."""
    keys_now = {n["key"] for n in flatten([content.TREE])}
    orphans = [k for k in state if not k.startswith("_") and k not in keys_now]
    for k in orphans:
        print("   órfã: %-20s %s" % (k, state[k]))
        if not dry:
            try:
                tl.req("/notes/" + state[k], "DELETE")
                print("        removida")
                del state[k]
            except urllib.error.HTTPError as e:
                print("        falha %s" % e.code)
    return orphans


def preflight(tl):
    print("== preflight (por CAPACIDADE, não por #pluginId)")
    ok = True
    for rotulo, probe in SCRIPTS:
        if probe.startswith("#"):
            hits = tl.search(probe)
        else:
            hits = [
                r for r in tl.search('"%s"' % probe) if r["title"].startswith(probe)
            ]
        print(
            "   %-30s %s"
            % (rotulo, "OK (%s)" % hits[0]["title"][:28] if hits else "AUSENTE")
        )
        ok = ok and bool(hits)
    return ok


def test_instancia(tl, mother, dest_parent):
    """Cria destino + instância e audita o remap das relações internas."""
    dest = tl.create(dest_parent, "Projetos de Escrita (teste)")
    tl.add_attr(dest, "relation", "child:template", mother, True)
    inst = tl.create(dest, "ZZ Projeto de teste")
    print("== destino %s | instância %s" % (dest, inst))
    print(
        "   próprios da instância: %s"
        % [(n, v) for t, n, v, _ in tl.owned(inst) if t == "relation"]
    )

    def spelunk(nid, depth=1):
        for c in (tl.note(nid) or {}).get("childNoteIds", []):
            n = tl.note(c)
            rels = [(n2, v) for t, n2, v, _ in tl.owned(c) if t == "relation"]
            print("   %s%-22s %s  rels=%s" % ("  " * depth, n["title"], c, rels))
            spelunk(c, depth + 1)

    spelunk(inst)
    return dest, inst


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--target", choices=["demo", "vps"], default="demo")
    ap.add_argument(
        "--dest-parent",
        default=None,
        help="pai da pasta-destino (default: o pai da mãe)",
    )
    ap.add_argument("--preflight", action="store_true")
    ap.add_argument("--test", action="store_true")
    ap.add_argument(
        "--prune",
        action="store_true",
        help="remove notas que saíram da spec (destrutivo)",
    )
    a = ap.parse_args()

    base, token = target(a.target)
    tl = Trilium(base, token)
    st = load_state(a.target)
    print("== %s (%s)" % (a.target, base))

    if a.preflight:
        preflight(tl)
        return

    print("   resolvendo scripts de plugin:")
    probes = resolve_probes(tl)

    # casa no VPS: mãe sob wBlaqjho7HNt ("Modelos Trilium")
    mother_parent = st.get("_parent") or (
        "wBlaqjho7HNt" if a.target == "vps" else "root"
    )
    if a.target == "vps":
        tl.note(mother_parent)  # sanity
    ids = walk([content.TREE], mother_parent, tl, st, probes)
    st.update(ids)
    st["_parent"] = mother_parent
    save_state(a.target, st)  # antes do wire: se o wire falhar, nada duplica
    wire([content.TREE], ids, tl, probes)
    save_state(a.target, st)
    print("   mãe: %s" % ids["master"])

    if a.prune:
        prune(st, tl, dry=False)
        save_state(a.target, st)

    if a.test:
        test_instancia(tl, ids["master"], a.dest_parent or mother_parent)
    elif a.dest_parent:
        # pasta-destino DEDICADA: é ela que leva ~child:template (nunca a pasta
        # genérica de projetos). Idempotente pelo título.
        dest = st.get("_dest")
        if not dest:
            for c in tl.note(a.dest_parent).get("childNoteIds", []):
                if tl.note(c)["title"] == content.DEST_TITLE:
                    dest = c
                    break
        if not dest:
            dest = tl.create(a.dest_parent, content.DEST_TITLE)
            tl.add_attr(dest, "label", "iconClass", "bx bx-pencil", True)
            print("   + destino %s" % dest)
        if not any(
            t == "relation" and n == "child:template" for t, n, _, _ in tl.owned(dest)
        ):
            tl.add_attr(dest, "relation", "child:template", ids["master"], True)
            print("   ~ destino ~child:template -> %s" % ids["master"])
        st["_dest"] = dest
        save_state(a.target, st)
        print("   destino: %s" % dest)
    print("== ok")


if __name__ == "__main__":
    main()
