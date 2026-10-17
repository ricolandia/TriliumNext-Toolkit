# Escrita-Templates — spec do "super-template" de escrita

Template **único** de projeto de escrita para o TriliumNext, com as três fases
(prosa / roteiro / HQ) e um canon compartilhado acima das trilhas, para permitir
**transmídia** (a mesma história em mais de uma mídia) sem quebrar as trilhas.

- Nota mãe: **"Author template master"** (label `#template`).
- Casa no VPS: sob `wBlaqjho7HNt` ("Modelos Trilium", em `30-Recursos`).
- Instanciação: a pasta-destino **dedicada** (`Projetos de Escrita/`) leva
  `~child:template` → mãe. `+` na pasta cria o projeto já estruturado.

---

## Fase 0 — mecânica do Trilium (verificada)

Fontes: doc `Templates.md` do **v0.106.0** (tag do repo TriliumNext),
`apps/client/src/services/note_create.ts`, `etapi.openapi.yaml` do container
`trilium-demo`, e **testes empíricos no demo** (ETAPI, notas de teste removidas).

### 1. Vários templates na mesma pasta → o menu de criação escolhe

A doc v0.106.0 (Templates.md): *"Selecting a specific template from the creation
menu always takes precedence over `child:template`"*. Ou seja: a lista do menu
de criação é a autoridade, e `~child:template` é só o **default** quando não se
escolhe nada explicitamente. Consequência prática: **não precisamos de 2+
`~child:template` na mesma pasta** — o desenho usa **um** `~child:template` por
pasta de destino. A dúvida deixa de existir por construção.

Também do v0.106.0 (relevante e novo):
- `~template:newNoteDefaultParent` na própria nota-template define **onde** as
  instâncias dela caem (repetível → clona); herdável da cadeia de ancestrais.
- Se o tipo escolhido na criação divergir do tipo do template, o template é
  **descartado inteiro** (a nota nasce vazia do tipo escolhido) — cuidado com
  templates `canvas`/`code`.
- `#titleTemplate` (título padrão), `#iconClass`, `#cssClass` também valem.

### 2. Instanciação NÃO é um "clone": as relações internas são **remapeadas**

Teste empírico no demo (ETAPI `POST /etapi/create-note` sob um pai com
`~child:template`). Template → pasta → sub-template:

```
T (template)  Gv8prIrJHCs4
├── F  "02 Cenas"   ZzMMxFF9WuoI   ~child:template → IT
└── IT "_tpl-Cena"  XrK8T2wUE61t   #template, ~template:newNoteDefaultParent → F
D (destino)      BLAZA9iOityI   ~child:template → T
```

Instância `xzGPqGX7OuVd` criada sob `D` — **atributos PRÓPRIOS** (dono = a
própria nota):

```
xzGPqGX7OuVd   ~template → Gv8prIrJHCs4          (aponta para o template ORIGINAL)
nLUGueySFI03  "02 Cenas"   ~child:template → 8TcalTknmZwa   (cópia de IT, DENTRO da instância)
8TcalTknmZwa  "_tpl-Cena"  #template + ~template:newNoteDefaultParent → nLUGueySFI03 (cópia de F)
```

- Rede de relações internas **remapeada para as cópias** (mesmo teste com
  relação arbitrária `zzlink`: `A' → B'`, não → B original) ✔
- Filhos **duplicados em profundidade**, com conteúdo copiado (`AAA`, `BBB`) ✔
- `~template` da instância aponta para o template **original** ✔

⇒ O projeto instanciado fica **autossuficiente**: cada pasta aponta para os
sub-templates privados da própria instância. Nada aponta de volta para a mãe
(além do `~template`, que é o vínculo correto).

### 3. Busca por label **herdável** casa a subárvore

Teste: pai com `#zzprobe=yes` (`isInheritable=true`), filha sem o label.
`#zzprobe=yes` e `#zzprobe` retornaram **pai e filha**.

⇒ `#projeto` herdável na mãe dá **escopo grátis** às buscas do projeto
(o inverso do `isInheritable=false` que já usamos em status/prioridade).

### 4. Nuances que o desenho precisa respeitar

| Nuance (verificada) | Consequência no desenho |
|---|---|
| ETAPI **não** tem campo `template` no `CreateNoteDef` (só o interno `templateNoteId`) | O script **cria a estrutura** (notas + relações); a instanciação é o `~child:template` reagindo à criação |
| No caminho ETAPI, o **conteúdo da própria nota-mãe não é copiado** para a instância (só o conteúdo da subárvore) — a doc diz que copia quando ela está vazia, no caminho interno/UI | O briefing mora numa **filha** (`00 Briefing`), nunca só no corpo da mãe |
| `PATCH` de attribute no 0.106 não aceita `value`/`isInheritable` | Usar DELETE+POST (`replace_attr`, como no `fase1a.py`) |
| `create-note` exige `content` (mesmo `book`) | Passar `content: ''` |
| O `GET /content` do demo devolve um **PDF** para nota sem conteúdo — e o `root` do demo **tem esse PDF como conteúdo** | Ruído do demo, não do Trilium: **limpar o root do demo** antes de validar conteúdo; nunca comparar conteúdo vazio |

---

## Estrutura (o que o template cria)

```
Author template master            #template · #iconClass · #label:projeto=promoted
│                                 · #label:status=promoted · #status=ideia (herdável)
│                                 · #relation:plotline=promoted
├── 📖 Como usar este template
├── 00 Briefing                   (logline, premissa, tom, público, promessa)
├── 01 Canon                      ← compartilhado pelas TRÊS trilhas
│   ├── Personagens               ~child:template → _tpl-Personagem
│   ├── Mundo
│   ├── Temas & Motivos
│   ├── Linha do tempo
│   └── Referências
├── 02 Trilha — Prosa             #status (herdável) · #label:status=promoted
│   ├── Manuscrito                ~child:template → _tpl-Cena
│   ├── Estrutura                 ~relation:plotline (promovida)
│   │   └── Linhas (plotlines)    uma nota por trama (alvo da relação `plotline`)
│   └── _tpl-Cena                 #template · ~template:newNoteDefaultParent → Manuscrito
├── 03 Trilha — Roteiro
│   ├── Roteiro                   ~child:template → _tpl-Cena-Roteiro
│   └── _tpl-Cena-Roteiro         #template · #fountainDraft
├── 04 Trilha — HQ
│   ├── Páginas                   ~child:template → _tpl-Pagina
│   ├── Storyboard
│   └── _tpl-Pagina               #template
└── 99 Ferramentas                (packs: Canvas Note Tools / Longform / Fountain)
```

Regras do desenho:
- **Transmídia sem quebra**: o canon fica acima; as trilhas só *consomem*. Cada
  trilha é deletável (instrução na nota `📖 Como usar`).
- Relações internas (pasta → sub-template, sub-template → pasta) são **todas
  internas à subárvore** — é o que faz o remap da Fase 0 valer por projeto.
- Um único `~child:template` por pasta; nada de pilha de templates.
- `#projeto` promovido na mãe (`#label:projeto=promoted`) → o Ricardo digita o
  nome do projeto na instância e as buscas ficam escopadas.

## Preflight de plugins (contrato `#pluginId`, nunca título)

| Recurso | pluginId | Uso no template |
|---|---|---|
| Longform Compiler | `longform-compiler` | `#gridOrder` / `#compiledDoc` na trilha Prosa |
| Fountain Renderer | `fountain-renderer` | `#fountainDraft` na trilha Roteiro |
| Canvas Note Tools | `canvas-note-tools` | canvas do Storyboard / Estrutura |

Checar por `#pluginId`/`#installedPlugins` (ver
`Trilium-plugin-manager/trilium-plugin-manager-v4.js:539-543, 994-996,
1012-1052`). Relação pendurada em render note = nota vazia (falha silenciosa).

## Decidido e aplicado (17/10/2026)

1. **6 status** — `#status` é **herdável** e nasce em *ideia* no projeto inteiro:
   definição `#label:status=promoted` + valor `#status=ideia` na mãe, no `01 Canon` e
   nas três trilhas. Valores: `ideia · esboço · rascunho · revisão · final · arquivada`.
   Verificado por instanciação (demo): as notas fundas herdam (`#status=ideia` casa 48
   notas da instância, incluindo `Rascunho` e `Linhas (plotlines)`); trocar num nó vale
   daí para baixo até alguém trocar de novo.
2. **`plotline` como relação** — `#relation:plotline=promoted` na mãe e na `Estrutura`;
   os alvos moram em `Estrutura → Linhas (plotlines)` (uma nota por trama). A cena
   aponta para a linha pela relação, nunca por label solto.
3. **Sem entrada no `registry.json`** — o pack vive como conteúdo no VPS (não é plugin).
4. Pasta-destino `Projetos de Escrita/` — **feito**: sob `10-Projetos` (`bWbXL3ytWhqR`),
   id `N2ipIf2YDJRL` (é ela que leva `~child:template`).
5. Canvas/rodada 15 auditado — o texto do `Storyboard` já aponta para o *Insert template*
   do Canvas Note Tools; falta decidir se a pasta Storyboard vira uma **nota canvas** própria.

---

## Resultado (17/10/2026) — construído e validado

**VPS** (`https://trilium.rizomatico.org`):

| Peça | noteId |
|---|---|
| Mãe "Author template master" (sob `wBlaqjho7HNt`) | `3205BequZUs1` |
| Pasta-destino "Projetos de Escrita" (sob `10-Projetos`) | `N2ipIf2YDJRL` |
| Manuscrito (`render`, `~renderNote` → `js - grade`) | `uIgNEhW6EDnT` |
| Roteiro (`render`, `~renderNote` → `js - Fountain 3`) + `Rascunho` | `Zw29ZrSMulSE` + `0Tm6BwTX4QX6` |
| Sub-templates privados | `_tpl-Cena` `TBC6bfkkWp9g` · `_tpl-Página` `0plFv00tiNNZ` · `_tpl-Personagem` `Dg9199ryng1B` |
| `Linhas (plotlines)` (sob `Estrutura`) | `clpPPFDw0jkj` |

**Demo** espelhado (ids de script próprios, resolvidos por capacidade):
mãe `NZSjCETPrwH3`.

**Validação end-to-end** (instância real, depois removida): numa instância do
VPS, `Manuscrito → child:template` aponta para o `_tpl-Cena` **da instância** e
`_tpl-Cena → template:newNoteDefaultParent` aponta para o `Manuscrito` **da
instância**; `~renderNote` continua apontando para o script externo. Mesmo
resultado no demo, agora com as duas telas.

**Lições desta execução**

- O estado tem de ser salvo **antes** do `wire`: se o `wire` falhar e o estado
  não estiver gravado, a próxima execução duplica as notas criadas.
- Relação para nota inexistente falha (400/404) → resolver os scripts por
  **capacidade** (`probe:`), nunca por id fixo (demo e VPS têm ids diferentes).
- Busca de valor com hífen precisa de aspas (`#pluginId="canvas-note-tools"`);
  sem aspas o valor é quebrado e a busca cai em texto livre (4686 falsos).
- O `#pluginId` do gerenciador praticamente não existe na VPS (só `shared-notes`)
  → preflight por **nota-script**, não por `#pluginId`.
- O `root` do **demo** tem um PDF (de rodada antiga) como conteúdo, e notas
  criadas vazias herdam esse conteúdo: **não** usar conteúdo para validar no demo.
- **Probe com réplica numerada**: `probe:js - Fountain` casava o título *exato*
  (`js - Fountain`, de 30/04 — 10 KB) em vez de `js - Fountain 3` (atual, 75 KB): o
  resolver passou a preferir o **maior número** do sufixo. E o `wire` só preserva
  atributo vindo de probe quando o probe **não** resolve — senão o Roteiro ficava com
  **dois** `~renderNote` (o antigo e o novo).
- O `POST /etapi/notes/{id}/import` (importar ZIP) dá erro interno na 0.106 com corpo
  binário (`req.body` não é o `ZipSource` esperado): por ETAPI, publicar/escrever por
  conteúdo (`PUT /notes/{id}/content`) — e no VPS isso também evita duplicar as notas.

**Aberto / próximos passos**

- Confirmar: 6 status, `plotline` como relação, entrada no `registry.json`.
- Rodadas 14 (Canvas-Template-Loader) e 15 (Canvas-Templates) alimentam o
  `99 Ferramentas` e o `Storyboard`.
- Registrar StoryLine / Canvas2Document no `BENCHMARK-obsidian-widgets.md`.

