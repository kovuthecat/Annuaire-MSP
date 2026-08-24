---
name: executer-vague
description: Orchestre une vague de sessions d'un plan — voie headless (`claude -p`, verdicts par schéma) pour les sessions sans navigateur, voie Desktop (pastilles `spawn_task`, verdicts lus dans l'index) pour celles qui exigent la validation N1. Ne garde que les verdicts, tient les statuts. À dérouler quand une vague de `plans/P<n>/index.md` est prête. Pendant exécutif de `/nouveau-plan`.
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
ça change *comment*. Une vague mixte déroule les deux voies, dans le même tour.

| | **Voie headless** (`Env. = —`) | **Voie Desktop** (`Env. = Desktop`) |
| --- | --- | --- |
| Lancement | `claude -p` — un processus par session | pastille `spawn_task` — un clic = une session neuve |
| Qui déclenche | l'orchestrateur, tout de suite | l'utilisateur, quand il veut |
| Verdict | schéma JSON, lu à l'Étape 5 | statut `[x]` dans `index.md`, coché par `/fin-de-tache` |
| Parallélisme | réel (`&` + attente des `.exit`) | au rythme humain, une conversation à la fois |
| Fin de vague | dans ce tour | **plus tard** — l'orchestrateur rend la main après avoir posé les pastilles |
| Arrêt au FAIL | mécanique (`break` en séquentiel) | l'utilisateur voit le FAIL dans sa propre session |

La voie Desktop existe parce qu'une session N1 ne peut pas tourner en headless : `claude -p` n'a pas
de navigateur. Elle n'est pas un pis-aller — c'est le mode normal des sessions visuelles, et
l'orchestrateur y garde son rôle : séquencer, tenir le tableau, ne rien exécuter.

## Interdits — la raison d'être de cette skill

- **Ne jamais ouvrir un `S<k>.md`.** C'est la session exécutante qui le lit, dans son propre
  contexte. L'`index.md` suffit à l'orchestrateur.
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

La voie Desktop exige que la session courante dispose de la pastille `spawn_task`
(`mcp__ccd_session__spawn_task`) et du navigateur in-app. **Claude Code Desktop est le seul
environnement à les avoir** — ni VSCode, ni un terminal, ni une session cloud (claude.ai/code,
appli mobile) n'en dispose. Les sessions `Desktop` de la vague n'y sont donc **pas** orchestrables.

Ne pas bloquer la vague pour autant : dérouler la voie headless, et lister les sessions `Desktop`
comme « à lancer depuis Claude Code Desktop ». La voie headless, elle, marche partout où le
préflight 2a est vert — y compris en cloud, où le CLI est présent nativement.

### 2c. Les trois vérifications de plan

- une **dépendance** de la vague n'est pas `[x]` dans l'`index.md` → STOP ;
- `.claude/settings.json` n'a pas d'**allowlist `permissions.allow`** → STOP pour la voie headless
  (en headless personne ne peut confirmer un outil, la session resterait bloquée sans fin) ;
- l'**arbre git n'est pas propre** (demander à `resumeur-git`) → voir ci-dessous.

### 2d. Arbre sale : trancher par les zones, pas en bloc

Le but de la règle est que le diff post-vague soit **attribuable** aux sessions, pas que le dépôt
soit immaculé. Comparer donc les fichiers sales aux colonnes `Zone modifiée` de la vague :

| Intersection avec les zones | Décision |
| --- | --- |
| non vide | **STOP** — une session écrirait par-dessus du travail non commité |
| vide | prendre une **référence** et demander confirmation, puis continuer |

```bash
mkdir -p .claude/vague
git status --porcelain > .claude/vague/avant-vague.txt
```

Cette référence rend le diff attribuable malgré le bruit : en fin de vague, ce qui n'y figurait pas
vient des sessions. Bloquer en bloc sur des fichiers hors zone coûte un commit sans rapport avec le
plan, juste pour débloquer un lancement.

## Étape 3 — Poser le verrou si la vague est parallèle

Parallèle **seulement si** les zones modifiées sont disjointes. Au moindre doute : séquentiel.

Si parallèle, créer `.claude/wave.lock` **après le préflight vert et juste avant le premier
lancement** — il bloque commit et push pendant la vague (hook `pretooluse-git`). L'ordre compte :
posé avant un préflight qui échoue, le verrou reste orphelin et gèle git pour rien.

**Ne pas le retirer** en fin de vague : c'est `/fin-de-tache` qui le fait en fin de plan. Unique
exception, à l'Étape 6 : **aucune session n'a démarré** — rien à clore, donc rien à verrouiller.

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

## Étape 4b — Voie Desktop : poser les pastilles

Aucun processus ici. Pour **chaque** session `Desktop` de la vague, poser une pastille `spawn_task` —
un clic ouvre une conversation neuve, ce qui satisfait « jamais deux sessions d'un même plan dans une
seule conversation » aussi bien que `claude -p` le fait pour la voie headless.

- **Titre** : `P<n>/S<k> — <titre de l'index>`.
- **Prompt** : `Ouvre plans/P<n>/S<k>.md et exécute-le.` — rien de plus. La session lit son propre
  fichier ; recopier son contenu dans le prompt le ferait payer deux fois.
- **Ordre** : une pastille par session, dans l'ordre de l'index. Si la vague Desktop est séquentielle,
  le dire dans le rapport final — les pastilles ne s'enchaînent pas toutes seules.

Puis **rendre la main**. Une vague Desktop ne se termine pas dans ce tour : l'utilisateur clique quand
il veut, et chaque session clôt sa tâche par `/fin-de-tache`, qui coche l'`index.md`. L'orchestrateur
n'attend pas, ne relance pas, ne surveille pas.

## Étape 5 — Collecter les verdicts

### Voie headless — par schéma

Quatre champs, et seulement ceux-là : `is_error`, `structured_output.verdict`, `.motif`, `.rapport`.
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

> Trois pièges que ce code évite. Découper sur une tabulation (elle est *IFS whitespace* : deux
> tabulations consécutives s'effondrent en une et décalent tous les champs). Accepter un
> `verdict: PASS` arrivé sans les autres champs requis. Et passer le **contenu** en argument : les
> deux arguments ci-dessus sont des **chemins** — une sortie longue dépasse la taille max d'un
> argument (leçon du 2026-08-23).

### Voie Desktop — par l'index

Rien à extraire : relire la colonne Statut de `plans/P<n>/index.md`. Une session Desktop terminée y
est `[x]` (posé par son propre `/fin-de-tache`) ; une session encore `[ ]` n'a pas été lancée, ou pas
finie. C'est tout — ne pas aller chercher plus loin, ne pas ouvrir le `S<k>.md`.

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

1. **Verrou.** Si **aucune** session n'a démarré (toutes en `PANNE`, ou préflight rouge après pose),
   retirer `.claude/wave.lock` : il n'y a pas de vague à clore, et le laisser gèlerait commit et push
   jusqu'à un `/fin-de-tache` qui ne viendra jamais. Dans tous les autres cas, le laisser.
2. **Statuts.** Passer à `[x]` dans l'`index.md` les sessions headless `PASS`, avec la date (statut =
   source unique, `WORKFLOW.md` §4a). En vague parallèle les sessions headless n'y touchent pas
   (`/fin-de-tache`) : c'est l'orchestrateur qui le fait. **Ne rien cocher pour la voie Desktop** —
   chaque session Desktop coche la sienne.
3. **Rapport final** : une ligne par session — `S<k> · PASS/FAIL/PANNE · motif` (déjà dans
   `.claude/vague/verdicts.txt`), voie Desktop incluse avec son statut lu dans l'index. Puis la vague
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
6. **Sur une vague Desktop ou mixte**, dire explicitement que la vague n'est **pas** finie : les
   pastilles attendent un clic. La collecte se refait en relançant `/executer-vague` sur la même
   vague, qui lira les statuts mis à jour.
7. **Ni commit ni push** — ils ont lieu en fin de plan, via `/fin-de-tache`.
