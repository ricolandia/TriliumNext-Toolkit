# Escrita-Templates — super-template de projeto de escrita

Pack de **conteúdo** (não é plugin): um template único de projeto de escrita para
o TriliumNext, com as três fases — **prosa, roteiro e HQ** — e um **canon
compartilhado acima das trilhas**, para permitir transmídia.

- Nota mãe: **"Author template master"** (`#template`), no VPS sob
  `wBlaqjho7HNt` ("Modelos Trilium").
- Pasta-destino **dedicada**: **"Projetos de Escrita"** (`N2ipIF2YDJRL` no VPS,
  sob `10-Projetos`) — é ela que leva `~child:template` → mãe. O `+` nessa pasta
  cria o projeto inteiro, com os sub-templates privados da própria instância.
- Detalhes de mecânica (Fase 0, com evidência) e a árvore completa: **SPEC.md**.

## Arquivos

| Arquivo | O que é |
|---|---|
| `SPEC.md` | Mecânica verificada do Trilium (v0.106), a árvore e o porquê de cada fio |
| `content.py` | Estrutura e conteúdo (declarativo: `key` + alvos simbólicos) |
| `build.py` | Builder ETAPI idempotente (demo/VPS), com `--preflight`, `--test`, `--prune` |
| `.state-<target>.json` | Estado `key -> noteId` (evita varredura no VPS) |

## Uso

```bash
python3 -u build.py --target demo --preflight      # checa as notas-script
python3 -u build.py --target demo                 # cria/atualiza no demo
python3 -u build.py --target demo --test          # instancia e audita o remap
python3 -u build.py --target vps --dest-parent bWbXL3ytWhqR
```

- `--prune` remove notas que saíram da spec (destrutivo, mostra antes).
- Alvo de plugin é **capacidade** (`probe:js - grade`), não `#pluginId`: na VPS
  os packs estão instalados como notas, fora do contrato do gerenciador. Se o
  script não existe na instância, a tela vira pasta comum em vez de quebrar.

## Contratos (espelhados dos templates já em uso na VPS)

| Tela | Tipo | Relação | Modelo |
|---|---|---|---|
| Manuscrito (Prosa) | `render` | `~renderNote` → `js - grade` | filhos = cenas (grade + compilação) |
| Roteiro | `render` | `~renderNote` → `js - Fountain 3` | filho único `Rascunho` (`code`) |
