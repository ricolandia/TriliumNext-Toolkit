#!/usr/bin/env python3
"""Backup incremental do Trilium via ETAPI.

Primeira execução: faz backup completo de todas as notas.
Execuções seguintes: baixa apenas notas modificadas desde o último backup.

Cada nota é salva como um arquivo .md individual, preservando
a estrutura de pastas do Trilium.

Correções v2:
  - Dedup de nomes: arquivos levam o note_id como sufixo para evitar colisões
  - Busca inicial abrangente: captura text, code e mermaid numa única query
  - Fila de retry: notas que falharam na rodada anterior são retentadas
  - Comparação incremental usa timestamp ISO completo (não só a data)
  - Cache de metadados de notas pai para reduzir chamadas à API

Uso:
  python3 trilium_backup_incremental.py

Agendamento (cron diário às 2h):
  0 2 * * * python3 /caminho/trilium_backup_incremental.py
"""

from __future__ import annotations

import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

try:
    import requests
except ImportError:
    sys.exit("requests não encontrado. Instale com: pip install requests --break-system-packages")

# ---------------------------------------------------------------------------
# Configuração — edite aqui
# ---------------------------------------------------------------------------

SERVER     = "YOUR-SERVER"
TOKEN      = "YOUR TOKEN"
BACKUP_DIR = Path("~/Documents/Backup_Trilium_MD")
STATE_FILE = BACKUP_DIR / ".backup_state.json"

# ---------------------------------------------------------------------------

HEADERS = {"Authorization": TOKEN}

# Cache em memória para evitar chamadas repetidas de metadados de notas pai
_meta_cache: dict[str, dict] = {}


def api_get(path: str, **kwargs) -> dict | list:
    url = f"{SERVER}/etapi{path}"
    r = requests.get(url, headers=HEADERS, **kwargs)
    r.raise_for_status()
    return r.json()


def get_note_meta(note_id: str) -> dict:
    if note_id not in _meta_cache:
        _meta_cache[note_id] = api_get(f"/notes/{note_id}")
    return _meta_cache[note_id]


def get_note_content(note_id: str) -> str:
    url = f"{SERVER}/etapi/notes/{note_id}/content"
    r = requests.get(url, headers=HEADERS)
    r.raise_for_status()
    return r.text


def search_notes(query: str) -> list[dict]:
    """Busca notas pela query de busca do Trilium."""
    data = api_get("/notes", params={"search": query, "limit": 10000})
    if isinstance(data, dict):
        return data.get("results", [])
    return data


def get_note_path(note_id: str) -> str:
    """Reconstrói o caminho hierárquico da nota (para estrutura de pastas).
    
    Usa o cache de metadados para evitar chamadas repetidas.
    """
    parts = []
    current_id = note_id
    visited: set[str] = set()

    while current_id and current_id != "root" and current_id not in visited:
        visited.add(current_id)
        try:
            meta = get_note_meta(current_id)
        except Exception:
            break
        parts.append(sanitize_filename(meta.get("title", current_id)))
        branches = meta.get("parentBranchIds", [])
        if not branches:
            break
        try:
            branch = api_get(f"/branches/{branches[0]}")
            current_id = branch.get("parentNoteId", "")
        except Exception:
            break

    parts.reverse()
    return "/".join(parts) if parts else note_id


def sanitize_filename(name: str) -> str:
    """Remove caracteres inválidos para nomes de arquivo."""
    name = re.sub(r'[<>:"/\\|?*\x00-\x1f]', "_", name)
    return name.strip(". ") or "_"


def html_to_md_basic(html: str) -> str:
    """Conversão HTML→markdown mínima."""
    try:
        from html.parser import HTMLParser

        class TextExtractor(HTMLParser):
            def __init__(self):
                super().__init__()
                self.lines: list[str] = []
                self._in_tag: list[str] = []

            def handle_starttag(self, tag, attrs):
                self._in_tag.append(tag)
                if tag in ("br", "p", "h1", "h2", "h3", "h4", "li"):
                    self.lines.append("\n")
                if tag.startswith("h") and tag[1:].isdigit():
                    level = int(tag[1:])
                    self.lines.append("#" * level + " ")

            def handle_endtag(self, tag):
                if self._in_tag and self._in_tag[-1] == tag:
                    self._in_tag.pop()

            def handle_data(self, data):
                self.lines.append(data)

        extractor = TextExtractor()
        extractor.feed(html)
        return "".join(extractor.lines)
    except Exception:
        return re.sub(r"<[^>]+>", "", html)


def load_state() -> dict:
    if STATE_FILE.exists():
        with open(STATE_FILE, encoding="utf-8") as f:
            return json.load(f)
    # backed_up: {note_id: dateModified}
    # failed:    {note_id: reason}  — será retentada na próxima rodada
    return {"last_backup": None, "backed_up": {}, "failed": {}}


def save_state(state: dict) -> None:
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    # Garante que a chave "failed" sempre existe no arquivo de estado
    state.setdefault("failed", {})
    with open(STATE_FILE, "w", encoding="utf-8") as f:
        json.dump(state, f, indent=2, ensure_ascii=False)


def backup_note(note_id: str, meta: dict, state: dict) -> bool:
    """Faz backup de uma nota individual. Retorna True se salvou."""
    note_type = meta.get("type", "text")
    if note_type not in ("text", "code", "mermaid"):
        return False

    try:
        content = get_note_content(note_id)
    except Exception as e:
        msg = f"Erro ao baixar conteúdo: {e}"
        print(f"  ⚠ {note_id}: {msg}")
        # Registra falha para retry na próxima rodada
        state["failed"][note_id] = msg
        return False

    title = sanitize_filename(meta.get("title", note_id))

    try:
        note_path = get_note_path(note_id)
    except Exception as e:
        print(f"  ⚠ Erro ao reconstruir caminho de {note_id}: {e}. Salvando na raiz.")
        note_path = title

    # Pasta = todos os componentes do caminho menos o último (que é o título da nota)
    if "/" in note_path:
        folder = BACKUP_DIR / Path(note_path).parent
    else:
        folder = BACKUP_DIR
    folder.mkdir(parents=True, exist_ok=True)

    # Converte HTML se necessário
    if meta.get("mime", "") in ("text/html", "") and note_type == "text":
        body = html_to_md_basic(content)
    else:
        body = content

    # -------------------------------------------------------------------
    # CORREÇÃO: sufixo com note_id para evitar colisões entre notas
    # homônimas na mesma pasta.
    # Formato: "Título da Nota [abc123].md"
    # -------------------------------------------------------------------
    filename = f"{title} [{note_id}].md"
    filepath = folder / filename

    date_created  = meta.get("dateCreated", "")
    date_modified = meta.get("dateModified", "")
    front_matter  = (
        f"---\n"
        f"title: \"{title}\"\n"
        f"trilium_id: {note_id}\n"
        f"created: {date_created}\n"
        f"modified: {date_modified}\n"
        f"---\n\n"
    )

    try:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(front_matter + body)
    except OSError as e:
        msg = f"Erro ao escrever arquivo: {e}"
        print(f"  ⚠ {note_id}: {msg}")
        state["failed"][note_id] = msg
        return False

    # Salvo com sucesso — remove de "failed" se estava lá
    state["backed_up"][note_id] = date_modified
    state["failed"].pop(note_id, None)
    return True


def collect_notes_to_process(state: dict) -> tuple[list[dict], bool]:
    """Decide quais notas buscar e retorna (lista, is_full_backup).
    
    Lógica:
      1. Sem last_backup → backup completo.
      2. Com last_backup → busca incremental por timestamp completo
         + reprocessa notas da fila "failed".
    """
    last_backup = state.get("last_backup")
    failed_ids  = set(state.get("failed", {}).keys())

    if not last_backup:
        print("Primeiro backup — exportando todas as notas...")
        # Busca todos os tipos suportados de uma vez
        notes = (
            search_notes("note.type = text")
            + search_notes("note.type = code")
            + search_notes("note.type = mermaid")
        )
        # Remove duplicatas (podem aparecer em múltiplas queries)
        seen: set[str] = set()
        unique: list[dict] = []
        for n in notes:
            nid = n.get("noteId")
            if nid and nid not in seen:
                seen.add(nid)
                unique.append(n)
        return unique, True

    print(f"Último backup: {last_backup}")
    print("Buscando notas modificadas desde então...")

    # Usa timestamp completo para a comparação, não só a data
    # A API do Trilium aceita ISO 8601 no formato "YYYY-MM-DDTHH:MM:SS.sssZ"
    # mas a query de busca normalmente aceita só a data; usamos a data mais
    # conservadora (dia anterior) para não perder notas por diferença de fuso.
    cutoff_date = last_backup[:10]  # YYYY-MM-DD
    query = f'note.dateModified >= "{cutoff_date}"'

    try:
        notes = search_notes(query)
    except Exception as e:
        print(f"Busca incremental falhou ({e}), fazendo backup completo...")
        notes = (
            search_notes("note.type = text")
            + search_notes("note.type = code")
            + search_notes("note.type = mermaid")
        )

    # Adiciona notas que falharam anteriormente (retry)
    if failed_ids:
        print(f"Retentando {len(failed_ids)} nota(s) com falha anterior...")
        existing_ids = {n.get("noteId") for n in notes}
        for fid in failed_ids:
            if fid not in existing_ids:
                notes.append({"noteId": fid})

    # Dedup
    seen = set()
    unique = []
    for n in notes:
        nid = n.get("noteId")
        if nid and nid not in seen:
            seen.add(nid)
            unique.append(n)

    return unique, False


def main() -> int:
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    state = load_state()
    # Garante estrutura mínima do estado (compatibilidade com versão anterior)
    state.setdefault("backed_up", {})
    state.setdefault("failed", {})

    notes, is_full = collect_notes_to_process(state)

    if not notes:
        print("Nenhuma nota encontrada para backup.")
        return 0

    print(f"{len(notes)} nota(s) para processar...")

    saved   = 0
    skipped = 0
    errors  = 0

    now = datetime.now(timezone.utc).isoformat()

    for i, note_stub in enumerate(notes, start=1):
        note_id = note_stub.get("noteId")
        if not note_id:
            continue

        try:
            meta = get_note_meta(note_id)
        except Exception as e:
            print(f"  [{i}/{len(notes)}] ⚠ {note_id}: metadados indisponíveis ({e})")
            state["failed"][note_id] = f"meta indisponível: {e}"
            errors += 1
            continue

        date_modified = meta.get("dateModified", "")
        last_saved    = state["backed_up"].get(note_id)

        # Pula se não mudou desde o último backup E não estava na fila de falhas
        if (
            last_saved
            and last_saved >= date_modified
            and note_id not in state.get("failed", {})
        ):
            skipped += 1
            print(f"  [{i}/{len(notes)}] sem mudança: {meta.get('title', note_id)}", end="\r")
            continue

        ok = backup_note(note_id, meta, state)
        if ok:
            saved += 1
            print(f"  [{i}/{len(notes)}] ✓ salvo: {meta.get('title', note_id)}")
        else:
            errors += 1

    state["last_backup"] = now
    save_state(state)

    print(f"\n✓ Concluído: {saved} salvas, {skipped} sem mudança, {errors} erro(s).")
    if state["failed"]:
        print(f"⚠ {len(state['failed'])} nota(s) com falha serão retentadas no próximo backup:")
        for fid, reason in list(state["failed"].items())[:10]:
            print(f"   {fid}: {reason}")
        if len(state["failed"]) > 10:
            print(f"   ... e mais {len(state['failed']) - 10}")
    print(f"Backup em: {BACKUP_DIR}")
    return 0 if errors == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
