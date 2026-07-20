# Shared-notes — Secure P2P exchange between TriliumNext instances

Bidirectional sharing and commenting system between Trilium instances.
No external server. No CORS. ETAPI token never exposed.

## Features

- **Secure invite** — ephemeral UUID token per note; ETAPI token never shared
- **Bidirectional replies** — both A and B can reply to each other, multiple rounds
- **Cumulative sending** — only new child notes are transmitted each round
- **Versioned snapshots** — A can send updated versions of a note; B's copy updates in-place
- **7-day expiration** — invites expire; delete the gate note to revoke instantly

## Security Architecture

```text
Invite string contains:
  ✅ Note content (title + HTML)
  ✅ Public endpoint of A's handler
  ✅ Ephemeral UUID token (per invite, not the ETAPI)
  ✅ Snapshot version number
  ❌ ETAPI token — never included

Sending replies:
  B → api.runOnBackend → require('https') → POST A's handler
  A → api.runOnBackend → require('https') → POST B's handler
  (server→server, no CORS, without exposing token)

Validation in A's handler:
  ✓ Token matches the gate note
  ✓ 7-day expiration (410 if expired)
  ✓ Token bound to the original note (rejects tokens from other notes)

Tracking:
  ✓ snSent label on each child note (cumulative sending)
  ✓ snVersion label on shared notes (versioned snapshots)
  ✓ replyEndpoint stored on original note (bidirectional replies)
```

## Installation

1. Import the `import/` folder into Trilium: Right-click on a folder → Import into note

2. Verify the `shared-notes-handler` note:
   - Type: Code
   - MIME: `application/javascript;env=backend`
   - Label: `#customRequestHandler = shared-notes-reply`

3. Verify the `shared-notes-widget` note:
   - Type: Code
   - MIME: `application/javascript;env=frontend`
   - Label: `#widget`

4. Create a configuration note (both users):
   Add the label `#sharedNotesConfig` with:
   - `#myName = Your Name` (required for both)
   - `#myEndpoint = https://yourtrilium.com` (required to **receive** replies)

5. Restart Trilium → F5

## Usage

### User A — sharing a note

1. Open the desired note
2. Tab 📤 **Gerar convite** → click "Gerar string"
3. Copy and send the string (email, Signal, any channel)
4. Each new invite increments the snapshot version (`snVersion` label)

### User B — accepting a snapshot

1. Tab 📥 **Aceitar convite** → paste string → "Aceitar"
2. Note appears in 📥 **Shared Inbox** with full content
3. If a note with the same `sharedNoteId` already exists, its content is **updated in-place** (child notes preserved)

### Sending replies (both users)

1. Open the shared/received note (must have `replyEndpoint` label)
2. Create child notes as your replies
3. Tab ↩️ **Responder** → "Enviar respostas"
4. Only **unsent** child notes are transmitted (`snSent` label)
5. Subsequent rounds will only send new child notes

### User A — receiving and replying back

1. After B sends replies, the original note gains a `replyEndpoint` label (B's endpoint)
2. Tab ↩️ **Responder** appears on the original note
3. Create child notes, click "Enviar respostas" → replies go back to B
4. This works **multilple rounds** — A and B can exchange replies freely

### Versioned snapshots (A → B updates)

1. A edits the note and generates a **new invite** (snapshot version increments)
2. B pastes the new string in 📥 **Aceitar convite**
3. The handler finds the existing note by `sharedNoteId` and **updates its content**
4. Child notes (previous replies) are **preserved**
5. Note title shows the new version: `📨 A — Title [v2]`

## Revoking an invite

Deleting the child gate note (🔒 Convite pendente…) invalidates the token.
The handler will return 404 on any attempt to use it.

---

# Shared-notes — Troca P2P segura entre instâncias TriliumNext

Sistema bidirecional de compartilhamento e comentários entre instâncias Trilium.
Sem servidor externo. Sem CORS. Token ETAPI nunca exposto.

## Funcionalidades

- **Convite seguro** — token UUID efêmero por nota; ETAPI nunca compartilhado
- **Respostas bidirecionais** — A e B podem responder múltiplas rodadas
- **Envio cumulativo** — apenas notas filhas novas são transmitidas a cada rodada
- **Snapshots versionados** — A pode enviar versões atualizadas; B recebe in-place
- **Expiração 7 dias** — convites expiram; deletar a gate note revoga instantaneamente

## Arquitetura de segurança

```
String de convite contém:
  ✅ Conteúdo da nota (título + HTML)
  ✅ Endpoint público do handler de A
  ✅ Token efêmero UUID (por convite, não é o ETAPI)
  ✅ Número da versão do snapshot
  ❌ Token ETAPI — nunca incluído

Envio de respostas:
  B → api.runOnBackend → require('https') → POST handler de A
  A → api.runOnBackend → require('https') → POST handler de B
  (servidor→servidor, sem CORS, sem expor token)

Validação no handler de A:
  ✓ Token bate com gate note
  ✓ Expiração 7 dias (410 se expirado)
  ✓ Token vinculado à nota original

Rastreamento:
  ✓ Label snSent em cada child note (envio cumulativo)
  ✓ Label snVersion nas notas (snapshots versionados)
  ✓ replyEndpoint armazenado na nota original (reply bidirecional)
```

## Instalação

1. Importar a pasta `import/` no Trilium: Botão direito → Import into note

2. Verificar nota `shared-notes-handler`:
   - Tipo: Code
   - MIME: `application/javascript;env=backend`
   - Label: `#customRequestHandler = shared-notes-reply`

3. Verificar nota `shared-notes-widget`:
   - Tipo: Code
   - MIME: `application/javascript;env=frontend`
   - Label: `#widget`

4. Criar nota de configuração (ambos os usuários):
   Label `#sharedNotesConfig` com:
   - `#myName = Seu Nome` (obrigatório para ambos)
   - `#myEndpoint = https://seutrilium.com` (obrigatório para **receber** respostas)

5. Reiniciar o Trilium → F5

## Uso

### User A — compartilhar nota

1. Abrir a nota desejada
2. Aba 📤 **Gerar convite** → clicar "Gerar string"
3. Copiar e enviar a string (email, Signal, qualquer canal)
4. Cada novo convite incrementa a versão do snapshot (label `snVersion`)

### User B — aceitar snapshot

1. Aba 📥 **Aceitar convite** → colar string → "Aceitar"
2. Nota aparece em 📥 **Shared Inbox** com conteúdo completo
3. Se já existe nota com o mesmo `sharedNoteId`, o conteúdo é **atualizado in-place** (child notes preservadas)

### Enviar respostas (ambos os usuários)

1. Abrir a nota compartilhada/recebida (precisa ter label `replyEndpoint`)
2. Criar notas filhas como suas respostas
3. Aba ↩️ **Responder** → "Enviar respostas"
4. Apenas notas filhas **não enviadas** são transmitidas (label `snSent`)
5. Rodadas subsequentes enviam apenas notas filhas novas

### User A — receber e responder de volta

1. Após B enviar respostas, a nota original ganha label `replyEndpoint` (endpoint de B)
2. Aba ↩️ **Responder** aparece na nota original
3. Criar notas filhas, clicar "Enviar respostas" → respostas vão para B
4. Funciona em **múltiplas rodadas** — A e B trocam respostas livremente

### Snapshots versionados (A → B atualizações)

1. A edita a nota e gera um **novo convite** (versão do snapshot incrementa)
2. B cola a nova string em 📥 **Aceitar convite**
3. O handler encontra a nota existente pelo `sharedNoteId` e **atualiza o conteúdo**
4. Notas filhas (respostas anteriores) são **preservadas**
5. Título da nota mostra a nova versão: `📨 A — Título [v2]`

## Revogar convite

Deletar a gate note filha (🔒 Convite pendente…) invalida o token.
O handler retornará 404 em qualquer tentativa de uso.

### Images  

![screen capture](imagens/shared-1-.webp)

