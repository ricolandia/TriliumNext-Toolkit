#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Estrutura e conteúdo do super-template "Author template master".

A estrutura é declarativa: cada nó tem uma `key` simbólica, e as relações
(`~child:template`, `~template:newNoteDefaultParent`, `~renderNote`) apontam
para keys — o `build.py` resolve para noteId depois de criar tudo. Alvos com o
prefixo `probe:` são scripts de plugin resolvidos por título na instância-alvo
(notas externas, não remapeadas na instanciação).

Regras (ver SPEC.md):
- Relações pasta ↔ sub-template são SEMPRE internas à subárvore (é o que faz o
  remap automático valer por projeto).
- Um único `~child:template` por pasta.
- O briefing mora em nota-filha (`00 Briefing`), nunca só no corpo da mãe:
  no caminho ETAPI o conteúdo da própria nota instanciada não é copiado.
- Contratos de render note espelham os templates já em uso na VPS:
  * Grade (Longform Compiler): `render` + `~renderNote -> js - grade`, filhos = cenas.
  * Roteiro (Fountain Renderer): `render` + `~renderNote -> js - Fountain 3`,
    filho único `Rascunho` (type code).
"""

import json
import os

DEST_TITLE = "Projetos de Escrita"  # pasta-destino dedicada (leva ~child:template)

HERE = os.path.dirname(os.path.abspath(__file__))
CANVAS_DIR = os.path.join(HERE, "Canvas")


def canvas(nome):
    """JSON do canvas gerado por `make-canvas.py` (fonte de verdade do desenho)."""
    with open(os.path.join(CANVAS_DIR, nome + ".json"), encoding="utf-8") as fh:
        return fh.read()


# scripts de plugin já instalados na VPS (notas externas; não são remapeadas)
JS_GRADE = "probe:js - grade"  # Longform Compiler (resolvido por título)
JS_FOUNTAIN = "probe:js - Fountain"  # Fountain Renderer — casa "js - Fountain N"
# e prefere o MAIOR N (a versão nova do script é a numerada)


def N(
    key,
    title,
    html="",
    labels=(),
    relations=(),
    children=(),
    icon=None,
    type="text",
    mime=None,
    content=None,
):
    labels = list(labels)
    if icon and not any(l[0] == "iconClass" for l in labels):
        labels.append(("iconClass", icon, True))
    return {
        "key": key,
        "title": title,
        "html": html,
        "labels": labels,
        "relations": list(relations),
        "children": list(children),
        "type": type,
        "mime": mime,
        "content": content,
    }


# ---------------------------------------------------------------- conteúdos

# `#status` herdável: a definição (promovida na nota) mora em cada raiz de trilha
# e no canon — assim a instância já nasce com o label sem depender do remap da mãe.
# Valores: ideia · esboço · rascunho · revisão · final · arquivada (ver SPEC.md).
STATUS_LABELS = [("label:status", "promoted", True), ("status", "ideia", True)]

MASTER_HTML = """<p><b>Template único de projeto de escrita</b> com as três fases —
prosa, roteiro e HQ — e um canon compartilhado acima das trilhas, para permitir
<b>transmídia</b>: a mesma história em mais de uma mídia sem reescrever a base.</p>
<p>Comece por <b>00 Briefing</b> e <b>01 Canon</b>; depois abra a trilha que vai
usar e apague as outras. O passo a passo está em <i>📖 Como usar este template</i>.</p>"""

COMO_USAR = """<p><b>Pressa?</b> O <b>🚀 Tutorial de uso (primeiro projeto)</b> é o
roteiro do primeiro dia, passo a passo. Esta nota é a referência.</p>
<h3>Passo a passo</h3>
<ol>
<li>Crie o projeto pelo botão <b>+</b> na pasta <i>Projetos de Escrita</i> — a
estrutura inteira vem junto.</li>
<li>Preencha o <b>00 Briefing</b> e o campo promovido <code>#projeto</code> (dá
escopo às buscas de todo o projeto).</li>
<li>Preencha o <b>01 Canon</b> — vale para <b>todas</b> as trilhas.</li>
<li>Escolha a(s) trilha(s) e <b>apague as que não vai usar</b> (inclusive a
pasta <code>_tpl-*</code> interna delas).</li>
<li>Dentro de cada trilha, use <b>+</b> na pasta de destino e <b>escolha o
modelo</b> com o nome "<b>(modelo)</b>" na lista: a unidade (cena / página /
canvas) cai no lugar certo, já no formato.</li>
</ol>
<p><b>Atenção ao criar:</b> o <b>+</b> abre uma lista que começa com os tipos
(<i>Text</i>, <i>Canvas</i>…) — o primeiro, "<i>Text</i>", já vem selecionado, e
confirmar assim cria uma nota <b>vazia comum</b>. Desça até a seção
<i>Templates</i> e escolha o modelo "<b>(modelo)</b>".</p>
<h3>Exemplos prontos</h3>
<p>As notas com <b>◇</b> e "exemplo" no título existem para você ver o formato:
abra, entenda e depois <b>renomeie</b> para o primeiro item real ou <b>apague</b>.</p>
<h3>Os três canvases</h3>
<ul>
<li><b>Mapa de relações</b> (Canon &#8594; Personagens) — quem é o quê de quem.</li>
<li><b>Mapa de arcos &amp; plotlines</b> (Prosa &#8594; Estrutura) — o esqueleto.</li>
<li><b>Storyboard</b> (HQ) — o rascunho visual, página a página.</li>
</ul>
<p>Cada um aparece pelo <b>+</b> da pasta dele, já com um exemplo dentro.</p>
<h3>As duas telas (render notes)</h3>
<ul>
<li><b>Manuscrito</b> (Prosa) — grade das cenas: arraste para reordenar e
compile o documento único (Longform Compiler).</li>
<li><b>Roteiro</b> (Roteiro) — a tela formata o <b>Rascunho</b> em padrão de
roteiro, com estimativa de páginas, <code>.fountain</code> e PDF.</li>
</ul>
<h3>O que apagar</h3>
<ul>
<li>Trilhas não usadas (<b>02 Prosa</b>, <b>03 Roteiro</b>, <b>04 HQ</b>) — os
canvases e as notas "<b>(modelo)</b>" delas vão junto.</li>
<li>Seções do canon que não se aplicam.</li>
<li><code>99 Ferramentas</code> se você já conhece os plugins.</li>
</ul>
<h3>Status (herdável)</h3>
<p>O label <code>#status</code> já vem definido e herdável: começa em
<b>ideia</b> no projeto inteiro e você troca no nó que quiser — a mudança vale
para tudo abaixo dele até alguém trocar de novo. Valores:
<code>ideia · esboço · rascunho · revisão · final · arquivada</code>.</p>
<ul><li>Exemplo de uso: <code>#status=rascunho</code> na trilha Prosa e
<code>#status=final</code> na cena que já passou.</li>
<li>Para listar o que está em revisão: busque
<code>#status=revisão</code> (o herança faz a busca pegar a subárvore).</li></ul>
<h3>Plotlines (relação)</h3>
<p>Cada linha/trama mora em <i>Estrutura &#8594; Linhas (plotlines)</i>. A cena se
liga à linha dela pela <b>relação</b> <code>plotline</code> — não por label. Uma
cena pode apontar para mais de uma linha.</p>
<h3>Regra de ouro da transmídia</h3>
<p>Nada que seja comum às mídias pode morar <i>dentro</i> de uma trilha. Se a
informação vale para a prosa <b>e</b> para a HQ, ela é <b>canon</b>.</p>"""

TUTORIAL = """<p>Roteiro do <b>primeiro dia</b>, na ordem. Cada passo é curto.
Dúvida em algum ponto? O <b>📖 Como usar este template</b> tem os detalhes.</p>
<h3>0 · Como o <b>+</b> funciona (leia uma vez)</h3>
<p>O <b>+</b> abre uma lista: primeiro os <b>tipos</b> de nota (<i>Text</i>,
<i>Canvas</i>…), depois os <b>modelos</b> prontos, na seção <i>Templates</i>. O
primeiro item (<i>Text</i>) já vem selecionado — se você só confirmar, nasce uma
nota <b>vazia comum</b>.</p>
<p>Então: sempre <b>escolha o modelo com o nome "(modelo)"</b> na lista. É ele que
traz o formato, o canvas e as ligações certas.</p>
<h3>1 · Criar (2 min)</h3>
<ol>
<li><b>+</b> na pasta <i>Projetos de Escrita</i> e escolha o modelo
<b>Author template master</b> → nasce o projeto inteiro.</li>
<li>Renomeie a nota do projeto com o nome da obra.</li>
<li>Veja a árvore: <b>00 Briefing</b>, <b>01 Canon</b> e as três trilhas. As que
você não vai usar, apague no passo 3.</li>
</ol>
<h3>2 · Canon (o que vale para tudo)</h3>
<ol>
<li><b>Personagens</b>: abra o exemplo "◇ Personagem 1", veja o formato e
<b>renomeie</b> para o seu protagonista — ou apague e crie com <b>+</b>. Os
outros: <b>+</b>, um por nota.</li>
<li><b>Mapa de relações</b>: <b>+</b> cria o mapa com exemplo — troque os nomes
e as setas (aliado · rival · mentor · família).</li>
<li>Do <b>Mundo</b>, <b>Temas</b>, <b>Linha do tempo</b> e <b>Referências</b>,
preencha o que já sabe. Canon cresce com o projeto.</li>
</ol>
<h3>3 · Escolher a trilha</h3>
<p>Uma para começar. <b>Apague as outras</b> (a nota da trilha, o modelo
"<b>(modelo)</b>" dela e os canvases).</p>
<ul>
<li><b>Prosa</b> → <b>Manuscrito</b>: <b>+</b> cria uma cena no formato certo (há
"◇ Cena 1" de exemplo). Arraste na grade para ordenar e compile o documento
único.</li>
<li><b>Roteiro</b> → escreva no <b>Rascunho</b>; a tela formata, conta páginas e
exporta <code>.fountain</code>/PDF.</li>
<li><b>HQ</b> → <b>Páginas</b> (<b>+</b> cria a página com o Quadro 1 desenhado) e
<b>Storyboard</b> (<b>+</b> cria o canvas da página, com exemplo).</li>
</ul>
<h3>4 · Tramas e esqueleto (Prosa)</h3>
<ol>
<li><b>Estrutura → Linhas (plotlines)</b>: uma nota por trama.</li>
<li>Na nota da cena, ligue a trama pela <b>relação</b> <code>plotline</code>.</li>
<li><b>Mapa de arcos &amp; plotlines</b> (<b>+</b>): nomes das tramas nas faixas,
marcadores nas paradas (inciting · virada 1 · meio · virada 2 · clímax).</li>
</ol>
<h3>5 · Conforme o projeto anda</h3>
<ul>
<li><code>#status</code> no nó que quiser (<code>ideia · esboço · rascunho ·
revisão · final · arquivada</code>) — vale para tudo abaixo até alguém trocar.</li>
<li>Para ver o que está em revisão: busque <code>#status=revisão</code>.</li>
<li>Quer outro canvas (OKR, GTD, storyboard "de filmagem")? Instale o pack
<i>Canvas Templates for Production</i> e use o 🧩. Plugins e telas:
<b>99 Ferramentas</b>.</li>
</ul>"""

BRIEFING = """<h3>Logline</h3><p><i>Uma frase. Protagonista + conflito + o que está em jogo.</i></p>
<h3>Premissa</h3><p>O que acontece, para quem, e por que agora.</p>
<h3>Tom e gênero</h3><p>Ex.: noir melancólico, comédia dramática, aventura YA.</p>
<h3>Público e promessa</h3><p>Quem lê/assiste e o que essa pessoa leva no fim.</p>
<h3>Mídias previstas</h3><ul><li>[ ] Prosa</li><li>[ ] Roteiro (audiovisual)</li><li>[ ] HQ</li></ul>
<h3>Decisões abertas</h3><ul><li>…</li></ul>"""

CANON = """<p>Base compartilhada por todas as trilhas. <b>Se vale para mais de uma mídia,
mora aqui.</b></p>
<ul><li><b>Personagens</b> — ficha por personagem (template ligado).</li>
<li><b>Mundo</b> — lugares, regras, tecnologia, magia.</li>
<li><b>Temas &amp; Motivos</b> — o que a obra discute; imagens que retornam.</li>
<li><b>Linha do tempo</b> — eventos na ordem dos fatos (não na ordem do relato).</li>
<li><b>Referências</b> — obras, imagens, pesquisa.</li></ul>"""

PERSONAGENS = """<p>Cada personagem é uma nota. Use <b>+</b> aqui dentro e, na lista, escolha o
modelo <b>Personagem (modelo)</b> — a ficha já vem no formato certo (Quem é ·
Quer/Precisa · Ferida e mentira · Voz · Arco).</p>
<p>Há um <b>exemplo pronto</b> ao lado — "◇ Personagem 1 — exemplo": abra para ver
o formato, depois <b>renomeie</b> para o seu primeiro personagem ou apague.</p>
<p>Para as <b>relações</b> entre eles (aliado, rival, mentor, família), abra
<b>Mapa de relações</b>: tem exemplo dentro e o <b>+</b> de lá cria um mapa novo.</p>"""

MUNDO = """<h3>Lugares</h3><h3>Regras do mundo</h3>
<p>O que pode e o que não pode acontecer (e as consequências).</p>
<h3>Materiais e pesquisa</h3>"""

TEMAS = """<h3>Temas</h3><p>As perguntas que a obra faz — não as respostas.</p>
<h3>Motivos e imagens</h3><p>Objetos, cores, gestos que voltam e ganham sentido.</p>
<h3>Tom por mídia</h3><p>O mesmo tema na prosa 🡒 na tela 🡒 no quadrinho.</p>"""

TIMELINE = """<p>Ordem dos fatos. Marque com <code>#canon</code> o que já está
travado e <code>#ideia</code> o que ainda é hipótese.</p>
<ul><li>…</li></ul>"""

REFERENCIAS = """<p>Obras, imagens, áudios, links. Uma entrada por referência, com
<b>por que</b> ela serve.</p>"""

PROSA = """<p>Trilha em <b>prosa</b>: notas atômicas (uma cena por nota) compiladas
num documento único pelo <b>Longform Compiler</b>.</p>
<ul><li><b>Manuscrito</b> — grade das cenas + compilação.</li>
<li><b>Estrutura</b> — esqueleto, arcos, plotlines.</li></ul>"""

MANUSCRITO = """<p>Uma <b>cena por nota</b>. Use <b>+</b> aqui e escolha o modelo <b>Cena (modelo)</b>
na lista — a nota vem no formato certo (objetivo · onde/quando · quem · rascunho). Há um exemplo pronto ao
lado ("◇ Cena 1 — exemplo"): renomeie ou apague.</p>
<p>Depois: reordenar na grade e compilar o documento único.</p>"""

ESTRUTURA = """<h3>Arco principal</h3>
<h3>Paradas obrigatórias</h3><ul><li>Inciting incident</li><li>Ponto de virada 1</li>
<li>Meio</li><li>Ponto de virada 2</li><li>Clímax</li></ul>
<p>As linhas/tramas têm nota própria em <b>Linhas (plotlines)</b>: a cena se liga
à linha pela <i>relação</i> <code>plotline</code> (nunca por label solto).</p>
<p>Para <b>ver</b> o esqueleto, abra <i>Mapa de arcos &amp; plotlines</i> — colunas
= atos, linhas = tramas, marcadores = paradas. As tramas são as mesmas notas de
<b>Linhas (plotlines)</b>.</p>"""

LINHAS = """<p>Uma nota por <b>linha</b> (trama): dê o nome da linha no título e use o
corpo para o arco dela (onde começa, onde vira, onde fecha).</p>
<p>Para ligar as cenas: na nota da cena, adicione a <b>relação</b>
<code>plotline</code> apontando para a linha. Para ver as cenas de uma linha,
busque pela relação (<code>~plotline</code>) ou use a grade do Manuscrito.</p>"""

ROTEIRO = """<p>Trilha em <b>roteiro</b> (Fountain): a tela formata o <b>Rascunho</b>
em padrão de roteiro, com estimativa de páginas, lista de cenas, exportação em
<code>.fountain</code> e PDF.</p>
<p><b>Escreva no Rascunho</b> (nota-filha). A tela só mostra.</p>"""

FOUNTAIN_STARTER = """Title: (título do projeto)
Credit: written by
Author: (nome)
Draft date: (data)

INT. LOCAL — DIA

PERSONAGEM
Fala.

INT. OUTRO LOCAL — NOITE

PERSONAGEM
Outra fala.
"""

HQ = """<p>Trilha em <b>quadrinhos</b>: roteiro em HQ → storyboard → páginas.</p>
<ul><li><b>Páginas</b> — uma nota por página (template ligado).</li>
<li><b>Storyboard</b> — canvas de rascunho (Canvas Note Tools).</li></ul>"""

PAGINAS = """<p>Uma <b>página por nota</b>. Use <b>+</b> aqui e escolha o modelo <b>Página
(modelo)</b> na lista — a nota já vem com o Quadro 1 desenhado para você seguir (há um exemplo pronto ao lado: "◇ Página 1 —
exemplo").</p>
<p>Nota pela ordem: página, quadros (descrição + diálogo) e o link para o arquivo
final.</p>"""

STORYBOARD = """<p>Rascunho visual da cena: <b>1 página por linha, 1 quadro por bloco</b>.
Use <b>+</b> aqui e escolha o modelo <b>Storyboard (modelo)</b> na lista — o canvas
vem pronto (página com 4 quadros; o Quadro 1 preenchido de exemplo).</p>
<p>Troque os textos do exemplo: o que <b>se vê</b> (ação), o que <b>se ouve</b>
(balão/som) e quanto <b>tempo</b> o quadro fica. Rascunho é para riscar e
reescrever.</p>
<p>O storyboard <i>não</i> vira página automaticamente: a página oficial é a nota
criada em <b>Páginas</b>.</p>
<p><i>Avançado:</i> para o storyboard "de filmagem" (time code, PAN/TILT), use o
botão 🧩 do <i>Canvas Note Tools</i> e escolha <i>Template - Storyboard</i> do pack
<i>Canvas Templates for Production</i>.</p>"""

FERRAMENTAS = """<h3>Plugins que o template usa</h3>
<table border="1" cellspacing="0" cellpadding="4">
<tr><th>Recurso</th><th>Nota-script</th><th>Onde</th></tr>
<tr><td>Longform Compiler</td><td><code>js - grade</code></td>
<td>Grade + documento compilado (trilha Prosa)</td></tr>
<tr><td>Fountain Renderer</td><td><code>js - Fountain 3</code></td>
<td>Tela do roteiro + PDF (trilha Roteiro)</td></tr>
<tr><td>Canvas Note Tools</td><td>—</td>
<td><b>Opcional</b>: cards e relações nos canvases (Storyboard · Mapa de relações ·
Arcos &amp; plotlines) — os canvases funcionam sem ele</td></tr>
</table>
<h3>Avançado (packs de canvas)</h3>
<p>Quer os 13 templates prontos de canvas (OKR, GTD, storyboard "de filmagem"…)?
Instale o pack <i>Canvas Templates for Production</i> e use o botão 🧩
(<i>Insert template</i>) do Canvas Note Tools. Os canvases do projeto já vêm
prontos pelo <b>+</b> — o pack é para outros desenhos.</p>
<p><b>Preflight:</b> o pack verifica a <b>nota-script</b> (capacidade), não o
label <code>#pluginId</code> — na VPS os packs estão instalados como notas, fora
do contrato do gerenciador. Sem o script, a tela fica vazia.</p>"""

TPL_CENA = """<h3>Objetivo da cena</h3><p>O que muda no fim dela (se nada muda, corte).</p>
<h3>Onde / quando</h3><h3>Quem</h3><h3>Rascunho</h3>"""

TPL_PERSONAGEM = """<h3>Quem é</h3><p>Uma linha.</p>
<h3>Quer / Precisa</h3><p>Desejo consciente × necessidade real.</p>
<h3>Ferida e mentira</h3><h3>Voz</h3><p>Como fala; o que nunca diria.</p>
<h3>Arco</h3><p>De onde sai 🡒 onde chega.</p>"""

TPL_PAGINA = """<h3>Página N</h3>
<h3>Quadro 1</h3><p>Descrição visual.</p><p><b>BALÃO:</b> texto.</p>"""

# --- canvases do próprio template (gerados por `make-canvas.py`; rodada 16) ---
# Sem `#canvasTemplate`: o 🧩 do Canvas Note Tools já lista o catálogo do kit
# (Canvas-Templates 0.9.0 tem estes mesmos três) — aqui eles vêm pelo `+` da pasta.
CANVAS_STORYBOARD = canvas("_tpl-Storyboard")
CANVAS_MAPA = canvas("_tpl-Mapa")
CANVAS_ARCOS = canvas("_tpl-Arcos")

EXEMPLO = "◇"  # selo das notas de exemplo (renomeie ou apague)

MAPA = """<p>Desenho das <b>relações</b> entre personagens: um nó por personagem, uma
seta por relação — escreva o tipo na seta (aliado · rival · mentor · família ·
dívida).</p>
<p><b>+</b> aqui e escolha o modelo <b>Mapa de relações (modelo)</b> na lista:
vem um mapa novo, já com exemplo de 4 nós, para você trocar pelos seus. Dá para arrastar a nota do personagem para dentro do canvas: o Canvas Note
Tools mantém card e nota em sincronia.</p>"""

ARCOS = """<p>O esqueleto da história num só desenho: <b>colunas = atos</b> (1º · 2º · 3º),
<b>linhas = tramas</b> (A-plot, B-plot…) e <b>marcadores = paradas</b> (inciting
incident · virada 1 · meio · virada 2 · clímax).</p>
<p><b>+</b> aqui e escolha <b>Mapa de arcos (modelo)</b> na lista: vem um mapa novo
com esse exemplo montado. Escreva nas faixas os nomes das suas
<b>Linhas (plotlines)</b>.</p>
<p>Serve para ver <b>buracos</b> (trama que some) e <b>cruzamentos</b> (duas tramas
no mesmo ponto). Para listar as cenas de uma trama, use a relação
<code>plotline</code> e a grade do Manuscrito.</p>"""


# ------------------------------------------------------------------- árvore

TREE = N(
    "master",
    "Author template master",
    MASTER_HTML,
    labels=[
        ("template", "", True),
        ("label:projeto", "promoted", True),
        # status: definição (promovível na nota) + valor default herdável
        ("label:status", "promoted", True),
        ("status", "ideia", True),
        # plotline é RELAÇÃO (não label) — definida aqui e na Estrutura
        ("relation:plotline", "promoted", True),
    ],
    icon="bx bx-book-alt",
    children=[
        N(
            "como_usar",
            "📖 Como usar este template",
            COMO_USAR,
            icon="bx bx-info-circle",
        ),
        N("briefing", "00 Briefing", BRIEFING, icon="bx bx-target-lock"),
        N("preflight", "⚙ Preflight", FERRAMENTAS, icon="bx bx-check-shield"),
        N(
            "tutorial",
            "🚀 Tutorial de uso (primeiro projeto)",
            TUTORIAL,
            icon="bx bx-play-circle",
        ),
        N(
            "canon",
            "01 Canon",
            CANON,
            labels=STATUS_LABELS,
            icon="bx bx-book",
            children=[
                N(
                    "personagens",
                    "Personagens",
                    PERSONAGENS,
                    icon="bx bx-user",
                    relations=[("child:template", "tpl_personagem", True)],
                    children=[
                        N(
                            "ex_personagem",
                            EXEMPLO + " Personagem 1 — exemplo",
                            TPL_PERSONAGEM,
                            icon="bx bx-user",
                        ),
                        N(
                            "mapa",
                            "Mapa de relações",
                            MAPA,
                            icon="bx bx-network-chart",
                            relations=[("child:template", "tpl_mapa", True)],
                            children=[
                                N(
                                    "tpl_mapa",
                                    "Mapa de relações (modelo)",
                                    labels=[("template", "", True)],
                                    icon="bx bx-network-chart",
                                    type="canvas",
                                    content=CANVAS_MAPA,
                                    relations=[
                                        ("template:newNoteDefaultParent", "mapa", True)
                                    ],
                                ),
                            ],
                        ),
                    ],
                ),
                N(
                    "tpl_personagem",
                    "Personagem (modelo)",
                    TPL_PERSONAGEM,
                    labels=[("template", "", True)],
                    relations=[("template:newNoteDefaultParent", "personagens", True)],
                    icon="bx bxs-user-detail",
                ),
                N("mundo", "Mundo", MUNDO, icon="bx bx-globe"),
                N("temas", "Temas & Motivos", TEMAS, icon="bx bx-palette"),
                N("timeline", "Linha do tempo", TIMELINE, icon="bx bx-time-five"),
                N("referencias", "Referências", REFERENCIAS, icon="bx bx-link"),
            ],
        ),
        N(
            "prosa",
            "02 Trilha — Prosa",
            PROSA,
            labels=STATUS_LABELS,
            icon="bx bx-edit",
            children=[
                N(
                    "manuscrito",
                    "Manuscrito",
                    MANUSCRITO,
                    icon="bx bx-list-ol",
                    type="render",
                    relations=[
                        ("renderNote", JS_GRADE, True),
                        ("child:template", "tpl_cena", True),
                    ],
                    children=[
                        N(
                            "ex_cena",
                            EXEMPLO + " Cena 1 — exemplo",
                            TPL_CENA,
                            icon="bx bx-file",
                        ),
                    ],
                ),
                N(
                    "estrutura",
                    "Estrutura",
                    ESTRUTURA,
                    labels=[("relation:plotline", "promoted", True)],
                    icon="bx bx-sitemap",
                    children=[
                        N(
                            "linhas",
                            "Linhas (plotlines)",
                            LINHAS,
                            icon="bx bx-git-branch",
                        ),
                        N(
                            "arcos",
                            "Mapa de arcos & plotlines",
                            ARCOS,
                            icon="bx bx-line-chart",
                            relations=[("child:template", "tpl_arcos", True)],
                            children=[
                                N(
                                    "tpl_arcos",
                                    "Mapa de arcos (modelo)",
                                    labels=[("template", "", True)],
                                    icon="bx bx-line-chart",
                                    type="canvas",
                                    content=CANVAS_ARCOS,
                                    relations=[
                                        ("template:newNoteDefaultParent", "arcos", True)
                                    ],
                                ),
                            ],
                        ),
                    ],
                ),
                N(
                    "tpl_cena",
                    "Cena (modelo)",
                    TPL_CENA,
                    labels=[("template", "", True)],
                    relations=[("template:newNoteDefaultParent", "manuscrito", True)],
                    icon="bx bx-file",
                ),
            ],
        ),
        N(
            "roteiro",
            "03 Trilha — Roteiro",
            ROTEIRO,
            labels=STATUS_LABELS,
            icon="bx bx-movie-play",
            children=[
                N(
                    "roteiro_doc",
                    "Roteiro",
                    ROTEIRO,
                    icon="bx bx-file-blank",
                    type="render",
                    relations=[("renderNote", JS_FOUNTAIN, True)],
                    children=[
                        N(
                            "rascunho",
                            "Rascunho",
                            FOUNTAIN_STARTER,
                            icon="bx bx-pencil",
                            type="code",
                            mime="text/plain",
                        ),
                    ],
                ),
            ],
        ),
        N(
            "hq",
            "04 Trilha — HQ",
            HQ,
            labels=STATUS_LABELS,
            icon="bx bx-images",
            children=[
                N(
                    "paginas",
                    "Páginas",
                    PAGINAS,
                    icon="bx bx-book-content",
                    relations=[("child:template", "tpl_pagina", True)],
                    children=[
                        N(
                            "ex_pagina",
                            EXEMPLO + " Página 1 — exemplo",
                            TPL_PAGINA,
                            icon="bx bx-file",
                        ),
                    ],
                ),
                N(
                    "storyboard",
                    "Storyboard",
                    STORYBOARD,
                    icon="bx bx-shape-square",
                    relations=[("child:template", "tpl_storyboard", True)],
                    children=[
                        N(
                            "tpl_storyboard",
                            "Storyboard (modelo)",
                            labels=[("template", "", True)],
                            icon="bx bx-shape-square",
                            type="canvas",
                            content=CANVAS_STORYBOARD,
                            relations=[
                                ("template:newNoteDefaultParent", "storyboard", True)
                            ],
                        ),
                    ],
                ),
                N(
                    "tpl_pagina",
                    "Página (modelo)",
                    TPL_PAGINA,
                    labels=[("template", "", True)],
                    relations=[("template:newNoteDefaultParent", "paginas", True)],
                    icon="bx bx-file",
                ),
            ],
        ),
        N("ferramentas", "99 Ferramentas", FERRAMENTAS, icon="bx bx-wrench"),
    ],
)
