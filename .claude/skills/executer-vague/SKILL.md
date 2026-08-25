---
name: executer-vague
description: Orchestre une vague de sessions d'un plan de bout en bout sans intervention, ne gardant que les verdicts. À dérouler quand une vague de `plans/P<n>/index.md` est prête.
model: haiku
---

# Exécuter une vague

L'orchestrateur ne fait que deux choses : **lancer des sessions** et **collecter des verdicts**.
Tout ce qu'il lit en plus, il le retraîne à chaque tour jusqu'à la fin de la vague — c'est ce qui
fait exploser un contexte d'orchestration.

Le frontmatter demande Haiku, effort `low`. Le jugement vit dans les sessions orchestrées (elles
reçoivent leur propre modèle en argument), pas ici. **La bascule n'est pas garantie** : selon le
harnais, `model:` peut ne pas s'appliquer et la skill tourne sur le modèle actif. Ça ne casse rien —
les interdits ci-dessous ne dépendent pas du modèle — mais l'économie annoncée, si.

## Les deux voies

Une session exige le navigateur in-app (`Env. = Desktop`) ou non. Ça ne change pas *si* on orchestre,
ça change *comment*. Une vague mixte déroule les deux voies, dans le même tour — et **les deux vont
jusqu'au bout sans intervention humaine**.

| | **Voie headless** (`Env. = —`) | **Voie sous-agent** (`Env. = Desktop`) |
| --- | --- | --- |
| Lancement | `claude -p` — un processus par session | outil `Agent`, `run_in_background: true` |
| Navigateur | absent — mesuré, pas supposé | **hérité de la session d'orchestration** |
| Modèle | `--model`, depuis l'index | `model`, depuis l'index |
| Effort | `--effort`, depuis l'index | **non réglable** — voir ci-dessous |
| Verdict | schéma JSON, lu à l'Étape 5 | ligne de verdict rendue par l'agent + ses commits |
| Contexte | processus neuf | contexte propre au sous-agent, seul le verdict remonte |
| Parallélisme | réel (`&` + attente des `.exit`) | réel (plusieurs agents en arrière-plan) |
| Fin de vague | dans ce tour | dans ce tour |

**Pourquoi deux voies et pas une.** Mesuré le 2026-08-24 : une session `claude -p` répond `NON` à
« as-tu des outils `mcp__Claude_Browser__` ou `preview_start` ». Le N1 y est donc impossible, et ce
n'est pas une précaution — c'est une limite. Un sous-agent, lui, hérite des 18 outils navigateur de
sa session parente : il peut faire le N1 sans qu'on lui ouvre une conversation.

**Ce que la voie sous-agent coûte.** L'outil `Agent` accepte un `model`, pas un `effort` : une
session `high` lancée en sous-agent tournera à l'effort ambiant. Quand une session `Env. = Desktop`
porte un effort `high`/`xhigh`, deux issues honnêtes — la passer en headless si son N1 est en réalité
dispensable (et le dire), ou accepter l'effort ambiant et l'écrire dans le rapport final. Ne pas
faire comme si la colonne avait été respectée.

**Ce qu'elle exige.** La session d'orchestration doit rester ouverte pendant la vague : les
sous-agents vivent en elle. Une vague longue se lance donc quand on peut laisser la fenêtre
tranquille — mais sans avoir à y revenir.

La pastille `spawn_task` n'est plus la voie normale : elle ne subsiste qu'en **repli manuel**
(Étape 2b), quand l'orchestrateur ne tourne pas dans Claude Code Desktop et ne peut donc ni ouvrir un
navigateur ni en donner un à un sous-agent.

## Interdits — la raison d'être de cette skill

- **Ne jamais ouvrir un `S<k>.md`.** C'est la session exécutante qui le lit, dans son propre
  contexte. L'`index.md`, `git log` et les fichiers `.claude/vague/` suffisent à l'orchestrateur.
- **Ne jamais lire un diff ni une sortie de build.** Déléguer à `resumeur-git` et `verificateur-n0`,
  qui ne rendent que leur conclusion. *Seule exception, ajoutée le 2026-08-24* : le `.stderr.log`
  d'une session en **PANNE** (Étape 5) — il ne contient pas de contexte de tâche, seulement la
  raison pour laquelle le processus n'a pas démarré.
- **Ne jamais corriger soi-même.** Une session qui échoue rend la main à l'utilisateur ;
  l'orchestrateur n'implémente rien, ne relance rien. La seule chose qu'il ait le droit de lancer
  après un FAIL est la passe de **diagnostic** de l'Étape 5b — qui ne corrige rien non plus.
- **Ne jamais interpréter le rapport d'une session.** Le verdict est extrait par schéma, pas relu :
  un rapport d'échec détaillé est une tentation à enquêter plutôt qu'à relayer tel quel. La mécanique
  de l'Étape 4 retire le rapport brut de portée avant même que l'orchestrateur y touche.

## Étape 1 — Lire l'index, rien d'autre

Ouvrir `plans/P<n>/index.md` et en extraire, **pour la vague demandée uniquement** : sessions,
modèle, effort, colonne `Env.`, dépendances, zone modifiée. Répartir les sessions dans les deux
voies selon `Env.`.

## Étape 2 — Préflight

Dans cet ordre : le moins cher et le plus fatal d'abord.

### 2a. Le binaire, avant tout le reste *(voie headless uniquement)*

Tout le mécanisme headless repose sur un CLI `claude` résolvable. S'il manque, chaque lancement meurt
en `command not found` (exit 127) **sans qu'aucun fichier ne soit lu** — et, sans le garde-fou
ci-dessous, la règle fail-closed de l'Étape 5 convertirait cette panne en un `FAIL` indiscernable
d'une vraie session en échec, avec renvoi vers un rapport de passation qui n'existe pas.

```bash
if ! command -v claude >/dev/null 2>&1; then
  echo "STOP · CLI claude introuvable sur le PATH"
else
  # Les flags que le gabarit suppose — un CLI trop ancien les ignore silencieusement.
  aide=$(claude --help 2>&1)
  for f in --session-id --output-format --json-schema --model --effort; do
    printf '%s' "$aide" | grep -q -- "$f" || echo "STOP · flag absent de ce CLI : $f"
  done
fi
```

Le `else` n'est pas cosmétique : sans lui, un binaire absent fait échouer les cinq contrôles de flags
et noie la cause unique sous cinq symptômes.

Rien à la sortie = préflight vert. Sinon STOP, en donnant la remédiation
(`npm i -g @anthropic-ai/claude-code`, ou mise à jour du CLI) — **et pas de verrou posé** (Étape 3).

### 2b. Le navigateur, pour l'autre voie

La voie sous-agent exige que **cette conversation** ait le navigateur in-app : un sous-agent hérite
des outils de sa session parente, il ne peut pas en inventer. **Claude Code Desktop est le seul
environnement à l'avoir** — ni VSCode, ni un terminal, ni une session cloud (claude.ai/code, appli
mobile) n'en dispose.

Contrôle : les outils `mcp__Claude_Browser__*` sont-ils disponibles ici ? Vérifié le 2026-08-24 —
un sous-agent lancé depuis une session Desktop reçoit bien les 18 outils navigateur, directement et
non en différé.

Si le navigateur manque, les sessions `Env. = Desktop` ne sont **pas** orchestrables ici. Ne pas
bloquer la vague pour autant : dérouler la voie headless, et poser les sessions `Desktop` en repli
manuel (pastilles, Étape 4b) ou les lister comme « à lancer depuis Claude Code Desktop ». La voie
headless, elle, marche partout où le préflight 2a est vert — y compris en cloud, où le CLI est
présent nativement.

### 2c. Les trois vérifications de plan

- une **dépendance** de la vague n'est pas `[x]` dans l'`index.md` → STOP ;
- `.claude/settings.json` n'a pas d'**allowlist `permissions.allow`** → STOP pour la voie headless
  (en headless personne ne peut confirmer un outil, la session resterait bloquée sans fin) ;
- l'**allowlist n'est pas seulement présente, elle est effective**. Le premier lancement headless le
  dit dans son stderr : `Ignoring N permissions.allow entries: this workspace has not been trusted`.
  La confiance est indexée sur la **chaîne** du chemin, pas sur le dossier : lancé depuis un shell
  qui résout `C:/Users/.../MYO` alors que l'entrée de confiance porte `C:\Users\...\MYO`, le même
  projet passe pour un autre et perd son allowlist en silence. Contrôle :

  ```bash
  claude -p "Reponds uniquement par OK." --model claude-haiku-4-5-20251001 2>&1 | head -2
  ```

  Une ligne `Ignoring ... not been trusted` → STOP : poser `hasTrustDialogAccepted: true` sur cette
  forme du chemin dans `~/.claude.json`, ou ouvrir le projet une fois en interactif. Sans ça, chaque
  session de la vague bute sur des outils refusés qu'aucun humain n'est là pour autoriser (mesuré
  sur MYO le 2026-08-24, à la veille de lancer P2).
- l'**arbre git n'est pas propre** (demander à `resumeur-git`) → voir ci-dessous.

### 2d. Arbre sale

Depuis `WORKFLOW.md` §4b (2026-08-24), chaque session committe ses propres tâches : un arbre propre
avant la vague n'est plus une commodité, c'est ce qui rend chaque commit lisible. Un fichier sale qui
intersecte une `Zone modifiée` de la vague → **STOP** : une session écrirait par-dessus du travail
non commité. Sinon, prendre une référence, demander confirmation et continuer.

```bash
mkdir -p .claude/vague
git status --porcelain > .claude/vague/avant-vague.txt
```

La table d'arbitrage par zones qui vivait ici a disparu avec la consolidation de fin de plan : elle
servait à rendre attribuable, après coup, un diff que plus personne ne savait rattacher. Ce problème
n'existe plus — le commit se fait au moment où l'information est encore là.

## Étape 3 — Poser le verrou si la vague est parallèle

Parallèle **seulement si** les zones modifiées sont disjointes. Au moindre doute : séquentiel.

Le verrou ne sert plus qu'à **un seul** cas : plusieurs sessions headless lancées **en même temps**
dans le même arbre. Elles partagent un index git, donc aucune ne peut committer sans emporter le
travail en cours des autres — leurs commits sont reportés, et c'est l'orchestrateur qui les fait en
fin de vague (Étape 6). Une vague dont les sessions se suivent — voie Desktop, ou headless séquentiel
— **ne prend pas de verrou** : chaque session committe la sienne, et tout ce que le verrou bloquerait
là serait du confort perdu.

Si et seulement si le parallélisme est réel, créer `.claude/wave.lock` **après le préflight vert et
juste avant le premier lancement** — il bloque commit et push pendant la vague (hook `pretooluse-git`). L'ordre compte :
posé avant un préflight qui échoue, le verrou reste orphelin et gèle git pour rien.

**Le retirer en fin de vague**, une fois les commits faits (Étape 6) : il ne protège rien entre deux
vagues, et le laisser gèle git pour la suivante. Cas particulier : **aucune session n'a démarré** —
rien à clore, retirer le verrou immédiatement.

## Étape 4a — Voie headless : lancer

Une session = un processus. Jamais deux sessions dans une même conversation (`WORKFLOW.md` §5b).

**Deux rapports, deux destinataires.** Un échec doit rester réparable, mais son contexte n'a rien
à faire dans l'orchestrateur :

| Sortie | Destinataire | Contenu |
| --- | --- | --- |
| **Verdict** (contraint par schéma) | l'orchestrateur | `PASS`/`FAIL` + un motif d'une ligne + le chemin du rapport |
| **Rapport de passation** (fichier sur disque) | la session de réparation, plus tard | tout le contexte utile à la correction — **jamais lu ici** |

L'orchestrateur relaie un **chemin**, il ne l'ouvre pas. Chaque session reçoit un **identifiant
propre** (`--session-id`) : sans lui, une session headless peut hériter de la session ambiante, et
son transcript devient impossible à retrouver.

```bash
lancer_session() {            # $1 = S<k>   $2 = modèle   $3 = effort
  local k=$1 uuid
  uuid=$(node -e "console.log(require('crypto').randomUUID())")
  echo "$uuid" > ".claude/vague/$k.session"

  claude -p "Ouvre plans/P<n>/$k.md et exécute-le.
En cas d'ÉCHEC, écrire d'abord un rapport de passation dans plans/P<n>/$k.echec.md
(voir le gabarit dans \.claude/skills/reprendre-echec/SKILL.md), puis
renvoyer son chemin dans le champ 'rapport'. En cas de succès, 'rapport' vaut ''." \
    --session-id "$uuid" \
    --model "$2" --effort "$3" \
    --output-format json \
    --json-schema '{"type":"object","properties":{"verdict":{"type":"string","enum":["PASS","FAIL"]},"motif":{"type":"string"},"rapport":{"type":"string"}},"required":["verdict","motif","rapport"]}' \
    > ".claude/vague/$k.json" 2> ".claude/vague/$k.stderr.log"
  echo $? > ".claude/vague/$k.exit"       # ← preuve de démarrage ET marqueur de fin
}
```

Modèle et effort viennent de l'`index.md` — identiques au bandeau du `S<k>.md`.

**`stderr` et le code de sortie ne sont pas du confort** : sans eux, une panne d'environnement est
indiscernable d'un échec de tâche (Étape 5). Le `.exit` sert deux fois — il distingue les deux cas,
et il signale la fin du processus à qui attend.

**Séquentiel par défaut, et l'arrêt au premier FAIL vit dans la boucle, pas dans une consigne** :

```bash
for k in <liste des S<k> headless de la vague, dans l'ordre>; do
  lancer_session "$k" <modèle> <effort>
  { read -r verdict; read -r motif; read -r rapport; } < <(lire ".claude/vague/$k.json" ".claude/vague/$k.exit")
  echo "$k · $verdict · $motif" >> .claude/vague/verdicts.txt
  [ "$verdict" = "PASS" ] || break        # ← l'arrêt de la vague est ICI
done
```

**En parallèle**, l'arrêt anticipé n'existe pas : suffixer chaque lancement de `&` (chacun écrit dans
ses propres fichiers, donc pas de collision), puis attendre. Les sessions déjà lancées vont au bout —
c'est le prix du parallèle, et la raison pour laquelle il exige des zones disjointes (Étape 3).

> **Attendre sans se faire tuer.** Un `wait` bloquant tient dans un seul appel shell, or beaucoup de
> harnais plafonnent la durée d'un appel (10 min pour l'outil Bash de Claude Code) — une session plus
> longue serait tuée en vol, et rendrait un JSON vide, donc un faux « sortie non conforme ». Lancer
> **détaché** (mode background du harnais, ou `nohup … &`) et **sonder les `.exit`**, qui n'apparaissent
> qu'à la fin de chaque processus :
>
> ```bash
> ls .claude/vague/*.exit 2>/dev/null | wc -l     # == nombre de sessions lancées → vague finie
> ```

## Étape 4b — Voie sous-agent : lancer les sessions `Desktop`

Un sous-agent par session, en arrière-plan. Il hérite du navigateur in-app de cette conversation,
donc il peut faire son N1 ; il a son propre contexte, donc le « jamais deux sessions d'un même plan
dans une seule conversation » (`WORKFLOW.md` §5b) est respecté aussi bien que par `claude -p`.

```
Agent({
  description: "P<n>/S<k>",
  subagent_type: "claude",
  model: <modèle lu dans l'index>,
  run_in_background: true,
  prompt: "Ouvre plans/P<n>/S<k>.md et exécute-le.
Tu es une session de plan : déroule /fin-de-tache en fin de session.
N'ouvre AUCUN worktree — la vague partage un seul arbre de travail.
En cas d'ÉCHEC, écris d'abord un rapport de passation dans plans/P<n>/S<k>.echec.md
(gabarit dans .claude/skills/reprendre-echec/SKILL.md).
Ta réponse finale doit tenir en UNE ligne, exactement dans ce format, et rien d'autre :
VERDICT: PASS|FAIL · MOTIF: <une phrase> · RAPPORT: <chemin du .echec.md, ou ->"
})
```

- **Un agent par session de la vague**, lancés dans l'ordre de l'index. En vague parallèle, tous en
  arrière-plan d'affilée ; en séquentiel, un seul à la fois, et on s'arrête au premier FAIL.
- **`isolation: "worktree"` est interdit** — la vague partage un arbre de travail (Étape 2d).
- **Ne jamais recopier le contenu du `S<k>.md` dans le prompt** : l'agent le lit lui-même, sinon il
  est payé deux fois.
- **Ne pas relire le rapport de l'agent au-delà de sa ligne de verdict.** Le format contraint est ce
  qui remplace ici le schéma JSON de la voie headless : un rapport d'échec détaillé est une
  tentation à enquêter, et l'orchestrateur n'enquête pas (Interdits).

**Attendre.** Les sous-agents en arrière-plan notifient à leur terme : ne pas sonder, ne pas
relancer, ne pas envoyer « c'est fini ? ». Rien à faire jusqu'à la notification.

**Repli manuel** — uniquement si l'Étape 2b a conclu que cette conversation n'a pas de navigateur.
Poser alors une pastille `spawn_task` par session (`titre : P<n>/S<k> — <titre de l'index>`, prompt
« Ouvre plans/P<n>/S<k>.md et exécute-le. Reste dans l'arbre de travail courant : pas de worktree. »),
préciser « **Démarrer localement** », et rendre la main : la vague se terminera plus tard, au rythme
des clics.

## Étape 5 — Collecter les verdicts

### Voie headless — par schéma

Cinq champs, et seulement ceux-là : `is_error`, `structured_output.verdict`, `.motif`, `.rapport`,
et `permission_denials` (voir plus bas — il décrit l'environnement, pas la tâche).
**Jamais `result`** ni aucun autre champ de l'enveloppe — c'est là que vivent le texte libre et les
métadonnées que le schéma a justement pour rôle d'écarter.

**La décision se prend dans Node, pas en bash**, et la sortie est faite d'une valeur par ligne :

```bash
lire() { node -e "
  const fs=require('fs');
  const [fj,fe]=process.argv.slice(1);
  const brut = fs.existsSync(fj) ? fs.readFileSync(fj,'utf8') : '';
  const code = fs.existsSync(fe) ? parseInt(fs.readFileSync(fe,'utf8').trim(),10) : null;
  let s={}, err=true, lisible=false;
  try{ const j=JSON.parse(brut); lisible=true; err = j.is_error !== false; s = j.structured_output ?? {}; }catch(e){}
  const complet = typeof s.verdict==='string' && typeof s.motif==='string' && typeof s.rapport==='string';
  const l = t => String(t ?? '').replace(/[\r\n]+/g,' ').trim();
  if (!lisible && code !== 0) {
    console.log('PANNE');
    console.log('session non démarrée (exit ' + code + ') — cf. ' + fe.replace('.exit','.stderr.log'));
    console.log('');
  } else {
    console.log(!err && complet && s.verdict==='PASS' ? 'PASS' : 'FAIL');
    console.log(complet ? l(s.motif) : 'sortie non conforme');
    console.log(complet ? l(s.rapport) : '');
  }
" "$1" "$2"; }

{ read -r verdict; read -r motif; read -r rapport; } < <(lire ".claude/vague/S<k>.json" ".claude/vague/S<k>.exit")
```

**Trois verdicts, parce que deux mentaient.**

| Verdict | Signification | Suite |
| --- | --- | --- |
| `PASS` | `is_error === false`, les trois champs présents et typés, `verdict === "PASS"` | cocher l'index |
| `FAIL` | la session a tourné et a échoué (ou a rendu une sortie non conforme) | `/reprendre-echec` |
| `PANNE` | JSON illisible **et** exit ≠ 0 : le processus n'a rien produit d'analysable | réparer l'environnement, pas le code |

`PANNE` ne renvoie **jamais** vers un rapport de passation : aucune session n'a tourné, donc aucun
rapport n'existe. Proposer `/reprendre-echec` dans ce cas envoie réparer du code qui n'a pas été lu.

**Fail-closed maintenu** : hors panne franche, tout ce qui n'est pas un `PASS` complet ressort en
`FAIL`, motif « sortie non conforme ». Une sortie illisible produit littéralement un FAIL au lieu de
déclencher une interprétation.

### Recoupement par les commits — obligatoire avant de conclure FAIL ou PANNE

Le canal JSON meurt plus souvent que les sessions : processus tué après la fin du travail mais avant
l'émission du JSON, refus de permission sur le dernier outil, timeout du harnais. Constaté sur MYO
P2/S9 puis P3/S1 (2026-08-24-25) : bilan écrit, N0 vert — et verdict perdu en route. Depuis 0.13.0,
**les commits sont la vérité** ; le JSON n'est que le messager. Donc, pour tout verdict `FAIL` à
motif « sortie non conforme » ou `PANNE` :

```bash
# Une tâche = un commit portant son repère. Comparer aux tâches listées dans l'index.
for m in <liste des T<m> de la session, depuis l'index>; do
  n=$(git log --oneline --grep "P<n>/S<k>/$m" | wc -l)
  echo "$m : $n commit(s)"
done
```

| Résultat | Verdict corrigé | Motif à consigner |
| --- | --- | --- |
| toutes les tâches ont leur commit | **PASS** | `verdict perdu en route — commits complets` |
| une partie seulement | **FAIL** | `interrompue après <T<m>…> — reprendre au premier manquant` |
| aucun commit | FAIL ou PANNE, inchangé | celui du JSON |

Ce n'est pas un adoucissement du fail-closed : un commit est une preuve mécanique, pas une
déclaration. C'est le même recoupement que la voie sous-agent impose depuis 0.14.0 — dans les deux
sens. Ne **jamais** appliquer ce rattrapage à un JSON lisible qui dit `FAIL` : la session a parlé,
on ne la contredit pas avec ses propres commits (elle peut avoir commité T1 puis échoué T2 en
le sachant).

### Refus de permission — la cause récurrente, à rendre visible

Un refus d'outil en cours de session laisse une trace dans l'enveloppe : `permission_denials`.
C'est le **cinquième champ** que l'orchestrateur a le droit de lire — il décrit l'environnement,
pas la tâche :

```bash
node -e "
  const j=JSON.parse(require('fs').readFileSync('.claude/vague/S<k>.json','utf8'));
  const d=j.permission_denials ?? [];
  if (d.length) console.log(d.length + ' refus : ' + d.map(x=>x.tool_name ?? x).join(', '));
" 2>/dev/null
```

S'il y a des refus, les lister dans le rapport final avec la remédiation : compléter
`permissions.allow` du projet, **après** la vague — jamais en préventif large (règle de
l'allowlist), mais toujours quand un refus réel a été observé. Un refus non traité reviendra à
chaque vague.

> Trois pièges que ce code évite. Découper sur une tabulation (elle est *IFS whitespace* : deux
> tabulations consécutives s'effondrent en une et décalent tous les champs). Accepter un
> `verdict: PASS` arrivé sans les autres champs requis. Et passer le **contenu** en argument : les
> deux arguments ci-dessus sont des **chemins** — une sortie longue dépasse la taille max d'un
> argument (leçon du 2026-08-23).

### Voie sous-agent — par la ligne de verdict, recoupée par les commits

L'agent rend une ligne au format imposé à l'Étape 4b. La lire, ne rien lire d'autre :

```
VERDICT: PASS · MOTIF: … · RAPPORT: -
```

**Fail-closed, comme la voie headless** : tout ce qui n'est pas un `VERDICT: PASS` lisible ressort en
`FAIL`, motif « sortie non conforme ». Un agent mort en cours de route ne rend rien — c'est un `FAIL`,
pas une session en attente.

**Recoupement obligatoire avec les commits.** Un `PASS` annoncé sans commit correspondant est un
`FAIL` : la session n'a pas déroulé `/fin-de-tache` jusqu'au bout, donc son travail n'est pas dans
l'arbre et rien ne le distingue de travail jamais fait.

```bash
git log --oneline --grep "P<n>/S<k>/" | wc -l     # 0 => FAIL, quoi qu'ait dit l'agent
```

C'est la leçon du 2026-08-24 : une déclaration de fin n'est pas une preuve de fin, qu'elle vienne
d'un humain ou d'un agent. La seule chose qui compte est ce que le dépôt porte.

**Cas du repli manuel par pastille** : aucun agent n'a tourné, donc aucune ligne de verdict. Le
verdict est alors dans les commits seuls — au moins un commit `P<n>/S<k>/` → `PASS` ; un
`plans/P<n>/S<k>.echec.md` → `FAIL` ; rien du tout → `EN ATTENTE`, la pastille n'a pas été cliquée.

## Étape 5b — Diagnostic escaladé *(optionnel, à demander explicitement)*

**Désactivé par défaut.** À n'activer que pour une vague headless lancée sans surveillance, quand
personne ne lira le FAIL avant plusieurs heures. Ce que ça achète : se réveiller devant un échec
**diagnostiqué** plutôt que devant un motif d'une ligne. Sans objet sur un `PANNE` (rien à
diagnostiquer côté code) et sur la voie Desktop (l'utilisateur est là).

Ce n'est **pas** une réparation automatique. L'orchestrateur ne corrige rien et ne relance aucune
session (Interdits) : il lance une passe qui **enrichit le rapport de passation**, et s'arrête là.

**Escalader d'un cran au-dessus du modèle qui a échoué**, lu dans l'`index.md` — jamais un Opus codé
en dur : si c'est déjà Opus qui a échoué, remonter à Opus ne sert à rien (`WORKFLOW.md` §2).

| Modèle en échec | Diagnostic lancé avec |
| --- | --- |
| Haiku | Sonnet |
| Sonnet | Opus |
| Opus | Fable — et le signaler : on est dans le cas « rare, cher » de `WORKFLOW.md` §2 |
| Fable | aucun. Rendre la main, point. |

```bash
git status --porcelain > .claude/vague/avant-diagnostic.txt

claude -p "Lis plans/P<n>/S<k>.echec.md et la tâche visée dans plans/P<n>/S<k>.md.
NE CORRIGE RIEN. Approfondis le diagnostic et réécris le rapport de passation au même
format (\.claude/skills/reprendre-echec/SKILL.md), en enrichissant
'Déjà écarté' et 'Hypothèse en cours'. Seul fichier que tu as le droit d'écrire :
plans/P<n>/S<k>.echec.md" \
  --session-id "$(node -e "console.log(require('crypto').randomUUID())")" \
  --model <cran au-dessus> --effort high \
  --disallowed-tools Edit \
  > /dev/null

git status --porcelain > .claude/vague/apres-diagnostic.txt
diff .claude/vague/avant-diagnostic.txt .claude/vague/apres-diagnostic.txt
```

`--disallowed-tools Edit` retire le principal vecteur de modification de code. **Ce n'est pas une
preuve** : `Write` reste nécessaire pour réécrire le rapport, et rien n'empêche techniquement
d'écrire ailleurs — d'où le `diff`, lui mécanique. Un écart portant sur autre chose que
`S<k>.echec.md` → **arrêter tout et le signaler** : l'état du dépôt n'est plus celui que le rapport
décrit.

## Étape 6 — Rendre la main

1. **Commits des sessions parallèles, puis verrou.** Si un `.claude/wave.lock` a été posé (Étape 3),
   les sessions headless n'ont rien pu committer : le faire **ici**, tâche par tâche, en s'appuyant
   sur les colonnes `Zone modifiée` et les messages prévus dans les `T<n>`, avec le repère
   `Plan: P<n>/S<k>/T<m>` en dernière ligne. Puis retirer le verrou — il ne protège rien entre deux
   vagues. Si aucune session n'a démarré (toutes en `PANNE`, ou préflight rouge après pose), retirer
   le verrou sans rien committer. Les sessions non verrouillées, elles, ont déjà commité les leurs :
   **ne rien refaire pour elles**.
2. **Statuts.** Passer à `[x]` dans l'`index.md`, avec la date, les sessions `PASS` **que le verrou a
   empêchées de le faire elles-mêmes** — c'est-à-dire celles d'une vague qui a posé un
   `.claude/wave.lock` (statut = source unique, `WORKFLOW.md` §4a). Les sessions non verrouillées
   (sous-agents hors verrou, headless séquentiel) ont coché leur propre ligne dans leur commit : **relire
   l'index, ne pas le réécrire**. Une session sans commit reste `[ ]`.
3. **Rapport final** : une ligne par session — `S<k> · PASS/FAIL/PANNE · motif` (déjà dans
   `.claude/vague/verdicts.txt`), voie sous-agent incluse. Signaler tout écart entre effort demandé
   et effort réellement appliqué (l'outil `Agent` ne règle pas l'effort). Puis la vague
   suivante prête, ou le blocage rencontré. Préciser si l'Étape 5b a tourné, et avec quel modèle : le
   rapport de passation n'est plus celui qu'a écrit la session en échec.
4. **Sur FAIL, donner les deux points d'entrée de la réparation, sans les ouvrir** :
   - le chemin du rapport de passation (`$rapport`), et la commande qui l'exploite :
     `/reprendre-echec plans/P<n>/S<k>.echec.md` ;
   - l'identifiant de la session (`.claude/vague/S<k>.session`), **uniquement comme recours** si le
     rapport s'avère insuffisant : `claude --resume <uuid>` rouvre le transcript complet. À ne pas
     proposer par défaut — reprendre une session en échec rapatrie aussi toutes ses fausses pistes,
     ce que le démarrage à froid existe précisément pour éviter (`WORKFLOW.md` §5b).
5. **Sur PANNE, donner la remédiation d'environnement** — jamais `/reprendre-echec`. Le
   `.stderr.log` de la session porte la cause ; c'est le seul log que l'orchestrateur ait le droit de
   citer, et une ligne suffit.
6. **Seul le repli manuel laisse une vague inachevée.** Une vague orchestrée par sous-agents se
   termine dans ce tour, les deux voies confondues : le dire, et enchaîner sur la vague suivante si
   ses dépendances sont satisfaites. Si des pastilles ont été posées faute de navigateur (Étape 2b),
   dire au contraire que la vague **n'est pas** finie et qu'elle se collecte en relançant
   `/executer-vague` sur la même vague, depuis Claude Code Desktop cette fois.
7. **Push groupé, jamais depuis une session.** Une fois la vague close et l'index à jour, un push
   pour l'ensemble de la vague. Si des sessions restent en `EN ATTENTE` ou en `FAIL`, ne pas pusher :
   attendre la fin de la vague.
