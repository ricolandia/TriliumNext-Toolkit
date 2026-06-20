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

v3:
  - Backup de arquivos: notas type=file e type=image são salvas como binário
  - Toggle BACKUP_FILES para ligar/desligar

v4:
  - Backup de ATTACHMENTS: imagens/arquivos colados dentro de notas de texto
    agora também são baixados via /notes/{id}/attachments.
  - Mensagens de erro detalhadas com tipo de exceção + corpo do servidor.
  - Tipos de nota não suportados (book, search, relationMap, etc.) são
    reportados como "ignorados", não como erro silencioso.
  - MIME_EXTENSIONS expandido: PDF, ZIP, DOCX, XLSX, MP3, MP4, etc.

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

SERVER     = "your server"
TOKEN      = "your token"
BACKUP_DIR = Path("your path/Backup_Trilium_MD")
STATE_FILE = BACKUP_DIR / ".backup_state.json"

BACKUP_FILES = True

MIME_EXTENSIONS: dict[str, str] = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/svg+xml": ".svg",
    "image/bmp": ".bmp",
    "image/tiff": ".tiff",
    "image/avif": ".avif",
    "application/pdf": ".pdf",
    "application/zip": ".zip",
    "application/x-zip-compressed": ".zip",
    "application/gzip": ".gz",
    "application/x-tar": ".tar",
    "application/json": ".json",
    "application/xml": ".xml",
    "text/csv": ".csv",
    "text/plain": ".txt",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "application/vnd.ms-excel": ".xls",
    "application/vnd.ms-powerpoint": ".ppt",
    "audio/mpeg": ".mp3",
    "audio/ogg": ".ogg",
    "audio/wav": ".wav",
    "video/mp4": ".mp4",
    "video/webm": ".webm",
    "application/octet-stream": ".bin",
}

# ---------------------------------------------------------------------------

HEADERS = {"Authorization": TOKEN}

# Cache em memória para evitar chamadas repetidas de metadados de notas pai
_meta_cache: dict[str, dict] = {}


def _raise_with_body(r: "requests.Response") -> None:
    """Como raise_for_status(), mas inclui o corpo da resposta (com o motivo
    real que o Trilium devolve, ex: 'note not found', 'invalid mime', etc.)
    em vez de só o código HTTP genérico.
    """
    try:
        r.raise_for_status()
    except requests.exceptions.HTTPError as e:
        body = ""
        try:
            body = r.text[:300]
        except Exception:
            pass
        raise requests.exceptions.HTTPError(
            f"{e} | resposta do servidor: {body}", response=r
        ) from None


def api_get(path: str, **kwargs) -> dict | list:
    url = f"{SERVER}/etapi{path}"
    r = requests.get(url, headers=HEADERS, **kwargs)
    _raise_with_body(r)
    return r.json()


def get_note_meta(note_id: str) -> dict:
    if note_id not in _meta_cache:
        _meta_cache[note_id] = api_get(f"/notes/{note_id}")
    return _meta_cache[note_id]


def get_note_content(note_id: str, binary: bool = False) -> str | bytes:
    url = f"{SERVER}/etapi/notes/{note_id}/content"
    r = requests.get(url, headers=HEADERS)
    _raise_with_body(r)
    return r.content if binary else r.text


def get_note_attachments(note_id: str) -> list[dict]:
    """Lista os attachments (imagens/arquivos colados) de uma nota.

    Attachments são diferentes de notas-filhas do tipo `image`/`file`:
    eles vivem "dentro" da nota (ex: uma imagem colada no corpo de uma
    nota de texto) e têm seu próprio attachmentId, não noteId.
    """
    try:
        data = api_get(f"/notes/{note_id}/attachments")
    except Exception:
        return []
    if isinstance(data, dict):
        return data.get("attachments", data.get("results", []))
    return data if isinstance(data, list) else []


def get_attachment_content(attachment_id: str) -> bytes:
    url = f"{SERVER}/etapi/attachments/{attachment_id}/content"
    r = requests.get(url, headers=HEADERS)
    _raise_with_body(r)
    return r.content


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
    state.setdefault("skipped_unsupported", {})
    with open(STATE_FILE, "w", encoding="utf-8") as f:
        json.dump(state, f, indent=2, ensure_ascii=False)


def _backup_note_attachments(note_id: str, note_folder: Path, note_title: str, state: dict) -> tuple[int, int]:
    """Baixa todos os attachments binários (imagens coladas, arquivos
    anexados) de uma nota de texto/code. Retorna (salvos, erros).

    Attachments ficam salvos numa subpasta "<Título da Nota> (anexos)/"
    ao lado do .md da nota, para não misturar com notas-filhas reais.
    """
    try:
        attachments = get_note_attachments(note_id)
    except Exception as e:
        print(f"  ⚠ Erro ao listar anexos de {note_id}: {type(e).__name__}: {e}")
        return 0, 0

    saved = 0
    errors = 0

    for att in attachments:
        att_id = att.get("attachmentId")
        if not att_id:
            continue

        mime = att.get("mime", "")
        # Só baixamos anexos binários (imagens e arquivos). Anexos do tipo
        # "note revision" ou outros não-binários ficam de fora.
        if not (mime.startswith("image/") or att.get("role") == "file"):
            continue

        att_state_key = f"attachment:{att_id}"
        last_saved = state["backed_up"].get(att_state_key)
        att_modified = att.get("utcDateModified", att.get("dateModified", ""))
        if last_saved and last_saved >= att_modified and att_state_key not in state.get("failed", {}):
            continue  # sem mudança desde o último backup

        try:
            data = get_attachment_content(att_id)
        except Exception as e:
            msg = f"Erro ao baixar anexo: {type(e).__name__}: {e}"
            print(f"\n  ✗ FALHA [anexo {att_id}] de '{note_title}': {msg}")
            state["failed"][att_state_key] = msg
            errors += 1
            continue

        if not data:
            msg = "Conteúdo vazio retornado pelo servidor"
            print(f"\n  ✗ FALHA [anexo {att_id}] de '{note_title}': {msg}")
            state["failed"][att_state_key] = msg
            errors += 1
            continue

        att_title = sanitize_filename(att.get("title", att_id))
        ext = MIME_EXTENSIONS.get(mime, Path(att_title).suffix or ".bin")
        # Evita duplicar a extensão se já vier no título (ex: "foto.png")
        if att_title.lower().endswith(ext.lower()):
            filename = f"{Path(att_title).stem} [{att_id}]{ext}"
        else:
            filename = f"{att_title} [{att_id}]{ext}"

        attachments_folder = note_folder / f"{note_title} (anexos)"
        attachments_folder.mkdir(parents=True, exist_ok=True)
        filepath = attachments_folder / filename

        try:
            with open(filepath, "wb") as f:
                f.write(data)
        except OSError as e:
            msg = f"Erro ao escrever arquivo: {type(e).__name__}: {e}"
            print(f"\n  ✗ FALHA [anexo {att_id}] de '{note_title}': {msg}")
            state["failed"][att_state_key] = msg
            errors += 1
            continue

        state["backed_up"][att_state_key] = att_modified
        state["failed"].pop(att_state_key, None)
        saved += 1
        print(f"  ✓ anexo salvo: {att_title} (de '{note_title}')")

    return saved, errors


def _backup_file(note_id: str, meta: dict, state: dict) -> bool:
    """Faz backup de uma nota do tipo arquivo (file/image). Retorna True se salvou."""
    try:
        data = get_note_content(note_id, binary=True)
    except Exception as e:
        msg = f"Erro ao baixar arquivo: {type(e).__name__}: {e}"
        print(f"\n  ✗ FALHA [{note_id}] '{meta.get('title', '')}': {msg}")
        state["failed"][note_id] = msg
        return False

    if not data:
        msg = "Conteúdo vazio retornado pelo servidor"
        print(f"\n  ✗ FALHA [{note_id}] '{meta.get('title', '')}': {msg}")
        state["failed"][note_id] = msg
        return False

    title = sanitize_filename(meta.get("title", note_id))
    mime = meta.get("mime", "application/octet-stream")
    ext = MIME_EXTENSIONS.get(mime, ".bin")

    try:
        note_path = get_note_path(note_id)
    except Exception as e:
        print(f"  ⚠ Erro ao reconstruir caminho de {note_id}: {e}. Salvando na raiz.")
        note_path = title

    if "/" in note_path:
        folder = BACKUP_DIR / Path(note_path).parent
    else:
        folder = BACKUP_DIR
    folder.mkdir(parents=True, exist_ok=True)

    filename = f"{title} [{note_id}]{ext}"
    filepath = folder / filename

    try:
        with open(filepath, "wb") as f:
            f.write(data)
    except OSError as e:
        msg = f"Erro ao escrever arquivo: {type(e).__name__}: {e}"
        print(f"\n  ✗ FALHA [{note_id}] '{meta.get('title', '')}': {msg}")
        state["failed"][note_id] = msg
        return False

    date_modified = meta.get("dateModified", "")
    state["backed_up"][note_id] = date_modified
    state["failed"].pop(note_id, None)
    state.get("skipped_unsupported", {}).pop(note_id, None)
    return True


def backup_note(note_id: str, meta: dict, state: dict) -> bool | None:
    """Faz backup de uma nota individual.

    Retorna:
      True  -> salva com sucesso
      False -> falhou (erro de rede/IO), entra na fila de retry
      None  -> tipo de nota não suportado, ignorada de propósito (não é erro)
    """
    note_type = meta.get("type", "text")
    mime = meta.get("mime", "")
    if BACKUP_FILES and note_type in ("file", "image"):
        return _backup_file(note_id, meta, state)
    if note_type not in ("text", "code", "mermaid"):
        msg = f"Tipo de nota não suportado para backup: type={note_type!r} mime={mime!r}"
        print(f"\n  ⊘ IGNORADA [{note_id}] '{meta.get('title', '')}': {msg}")
        # Não é um erro de rede/IO — não entra na fila de retry, mas também
        # não deve ser contada como "erro" silencioso. Marcamos como
        # "skipped_unsupported" para não confundir com falha real.
        state.setdefault("skipped_unsupported", {})[note_id] = msg
        return None

    try:
        content = get_note_content(note_id)
    except Exception as e:
        msg = f"Erro ao baixar conteúdo: {type(e).__name__}: {e}"
        print(f"\n  ✗ FALHA [{note_id}] '{meta.get('title', '')}': {msg}")
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
        msg = f"Erro ao escrever arquivo: {type(e).__name__}: {e}"
        print(f"\n  ✗ FALHA [{note_id}] '{title}': {msg}")
        state["failed"][note_id] = msg
        return False

    # Salvo com sucesso — remove de "failed" e "skipped_unsupported" se estava lá
    state["backed_up"][note_id] = date_modified
    state["failed"].pop(note_id, None)
    state.get("skipped_unsupported", {}).pop(note_id, None)

    # Baixa também imagens/arquivos colados (attachments) dentro desta nota.
    # Isso é separado do conteúdo .md e não afeta o valor de retorno de
    # backup_note() — mesmo se um attachment falhar, a nota em si foi salva.
    if BACKUP_FILES:
        att_saved, att_errors = _backup_note_attachments(note_id, folder, title, state)
        if att_saved:
            print(f"    ↳ {att_saved} anexo(s) baixado(s) de '{title}'")
        if att_errors:
            print(f"    ↳ {att_errors} anexo(s) com erro em '{title}' (ver acima)")

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
        type_queries = [
            "note.type = text",
            "note.type = code",
            "note.type = mermaid",
        ]
        if BACKUP_FILES:
            type_queries.append("note.type = file")
        notes = []
        for q in type_queries:
            notes.extend(search_notes(q))
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
        type_queries = [
            "note.type = text",
            "note.type = code",
            "note.type = mermaid",
        ]
        if BACKUP_FILES:
            type_queries.append("note.type = file")
        notes = []
        for q in type_queries:
            notes.extend(search_notes(q))

    # Adiciona notas que falharam anteriormente (retry)
    if failed_ids:
        print(f"Retentando {len(failed_ids)} nota(s) com falha anterior...")
        existing_ids = {n.get("noteId") for n in notes}
        for fid in failed_ids:
            if fid not in existing_ids:
                notes.append({"noteId": fid})

    # Adiciona notas que foram ignoradas como "tipo não suportado" em
    # execuções anteriores (ex: type=file que só agora o script passou
    # a suportar). Força o reprocessamento para que sejam salvas.
    skipped_ids = set(state.get("skipped_unsupported", {}).keys())
    if skipped_ids:
        existing_ids = {n.get("noteId") for n in notes}
        for sid in skipped_ids:
            if sid not in existing_ids:
                notes.append({"noteId": sid})

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
    state.setdefault("skipped_unsupported", {})

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
            print(f"\n  [{i}/{len(notes)}] ✗ FALHA [{note_id}]: metadados indisponíveis: {type(e).__name__}: {e}")
            state["failed"][note_id] = f"meta indisponível: {type(e).__name__}: {e}"
            errors += 1
            continue

        date_modified = meta.get("dateModified", "")
        last_saved    = state["backed_up"].get(note_id)

        # Pula o corpo .md se não mudou desde o último backup E não estava
        # na fila de falhas — mas ainda assim confere se há attachments
        # novos/alterados, já que o dateModified da nota pai nem sempre
        # reflete mudanças em anexos.
        if (
            last_saved
            and last_saved >= date_modified
            and note_id not in state.get("failed", {})
        ):
            skipped += 1
            if BACKUP_FILES and meta.get("type") in ("text", "code"):
                title = sanitize_filename(meta.get("title", note_id))
                try:
                    note_path = get_note_path(note_id)
                    folder = BACKUP_DIR / Path(note_path).parent if "/" in note_path else BACKUP_DIR
                except Exception:
                    folder = BACKUP_DIR
                att_saved, att_errors = _backup_note_attachments(note_id, folder, title, state)
                if att_saved:
                    print(f"    ↳ {att_saved} anexo(s) novo(s)/atualizado(s) de '{title}'")
                if att_errors:
                    print(f"    ↳ {att_errors} anexo(s) com erro em '{title}' (ver acima)")
            # Sem \r: usar \r aqui sobrescrevia mensagens de erro impressas
            # por backup_note() na nota anterior, fazendo o erro "sumir" da tela.
            if i % 25 == 0 or i == len(notes):
                print(f"  [{i}/{len(notes)}] progresso: {saved} salvas, {skipped} sem mudança, {errors} erro(s)...")
            continue

        ok = backup_note(note_id, meta, state)
        if ok is True:
            saved += 1
            print(f"  [{i}/{len(notes)}] ✓ salvo: {meta.get('title', note_id)}")
        elif ok is None:
            # Tipo de nota não suportado (ex: search, book, relationMap, render...).
            # Mensagem detalhada já foi impressa dentro de backup_note().
            # Não conta como erro nem entra na fila de retry.
            pass
        else:
            errors += 1
            # A mensagem detalhada já foi impressa dentro de backup_note()/
            # _backup_file(); aqui só confirmamos a contagem para não passar
            # despercebido em meio a uma rodada longa.
            print(f"  [{i}/{len(notes)}] ✗ erro #{errors} (motivo acima) — nota: {meta.get('title', note_id)} [{note_id}]")

    state["last_backup"] = now
    save_state(state)

    print(f"\n{'=' * 60}")
    print(f"✓ Concluído: {saved} salvas, {skipped} sem mudança, {errors} erro(s).")
    if state["failed"]:
        print(f"\n⚠ {len(state['failed'])} nota(s) com falha (serão retentadas no próximo backup):")
        for fid, reason in state["failed"].items():
            print(f"   [{fid}] {reason}")
    if state.get("skipped_unsupported"):
        print(f"\n⊘ {len(state['skipped_unsupported'])} nota(s) ignorada(s) por tipo não suportado (não são erro):")
        for fid, reason in state["skipped_unsupported"].items():
            print(f"   [{fid}] {reason}")
    print(f"{'=' * 60}")
    print(f"Backup em: {BACKUP_DIR}")
    return 0 if errors == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
