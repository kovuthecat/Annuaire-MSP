# WORKFLOW.md — Modèles, effort, plans, validation, garde-fous

Source unique pour la répartition du travail, le format des plans et les niveaux de validation.
Les autres fichiers y renvoient au lieu de le paraphraser.
Modèles actuels : Fable 5 · Opus 5 · Sonnet 5 · Haiku 4.5.

**Les squelettes de plan ne sont plus ici** : ils vivent dans la skill `/nouveau-plan`, qui ne les
charge qu'au cadrage. Ce fichier reste lisible d'un bout à l'autre sans coûter un plan complet.

## 1. Principe directeur

**Opus pense, les autres font.**

- **Opus** (cher) : design, cadrage, écrit les plans.
- **Fable** (2× Opus, rare) : uniquement les problèmes qu'Opus n'arrive pas à résoudre.
- **Sonnet** : exécute les tâches cadrées de complexité moyenne, juge le code.
- **Haiku** (rapide) : exécute les tâches cadrées et mécaniques.
- **Codex** (hors budget Claude) : régression visuelle scriptée via Playwright (`AGENTS.md`) —
  plus le premier recours depuis que le navigateur in-app couvre le N1 (§6).
- **Claude Design** (claude.ai, humain aux commandes) : maquette UI au cadrage d'un projet ou d'un
  nouvel écran — entrée = `ARCHITECTURE.md` envoyé tel quel, sortie = `design/maquettes/`. Le
  câblage se fait ensuite sur la maquette, jamais l'inverse.

Une fois le plan écrit, chaque exécutant lit **UNIQUEMENT** les fichiers listés dans sa session
(`S<k>.md`) et ne reconçoit pas — le design est fixé.

## 2. Choix du modèle

| Nature de la tâche | Modèle | Exemples |
| --- | --- | --- |
| Problème que même Opus n'a pas résolu (rare, cher) | **Fable** | Bug retors resté sans cause après un passage Opus |
| Design, bug non localisé, scope flou, transverse, arbitrage produit | **Opus** | Architecture, cadrage neuf, plan multi-tâche |
| Cadré, jugement de code, localisé, complexité moyenne | **Sonnet** | Bug isolé, refactor limité, feature moyenne, code review |
| Cadré, mécanique, peu de jugement, petit | **Haiku** | Renommage, purge de contexte, boilerplate, consolidation de fin de plan |
| Régression visuelle scriptée, rapport JSON | **Codex** | Audit Playwright d'un parcours complet |

**Départage une fois le périmètre clair :**

- **Sonnet** si jugement de code, analyse transverse, risque à peser, ou gros volume répétitif.
- **Haiku** si mécanique/simple, petit périmètre (1-2 fichiers), résultat évident.
- **Escalade vers Opus** si la cause d'un bug n'est pas localisée, le scope est flou, ou il reste
  des choix produit.

## 3. Effort — et comment le distinguer du modèle

**Le modèle, c'est la capacité. L'effort, c'est la quantité de travail.** Les deux se diagnostiquent
sur des symptômes différents, et les confondre coûte cher dans les deux sens :

| Symptôme observé | Ce qu'il faut changer |
| --- | --- |
| Il se trompe **alors qu'il avait tout le contexte** — raisonnement faux, domaine mal maîtrisé | **Monter de modèle** |
| Il a **sauté des fichiers**, pas lancé les tests, abandonné une tâche multi-étapes en route | **Monter l'effort** |
| Il tourne en rond sur la même erreur depuis 2 relances | **Monter de modèle, pas l'effort** |
| Il produit du correct mais lentement/verbeusement sur une tâche triviale | **Baisser l'effort** |

Échelle réelle (vérifiée dans la doc Anthropic le 2026-08-22, `model-config`) :
`low · medium · high · xhigh · max` (pas de niveau `minimal`).

- `low` : mécanique, résultat quasi certain (renommage, purge, consolidation).
- `medium` : **défaut du workflow** — implémentation courante.
- `high` : raisonnement soutenu, arbitrages, bug localisé mais subtil.
- `xhigh` : code agentique complexe, bug non localisé, cadrage neuf. Réservé, pas par défaut.
- `max` : au-delà de `xhigh`, mêmes réserves d'usage — jamais par défaut ; non réglable via
  `effortLevel` du projet, seulement via `/effort max` en session (rendements décroissants documentés).

Le défaut vient de `.claude/settings.json` du projet (`"effortLevel": "medium"`), pas de Claude
Code. Chaque session porte **modèle + effort + environnement** dans le bandeau de son `S<k>.md` —
à **régler à la main avant de lancer la session**, aucun routing automatique.

**Rappel systématique à l'humain qui lance** — *domicile de cette règle, les skills y renvoient.*
Une pastille `spawn_task`, une commande affichée ou un « lance S3 » démarre avec les **réglages
ambiants de l'application**, jamais avec ceux du plan : rien, dans le lancement, ne pose le modèle
ni l'effort à la place de l'utilisateur. Toute skill qui rend la main pour qu'un humain lance une
session écrit donc, juste avant, cette ligne — valeurs prises dans l'`index.md` :

```
À régler AVANT de lancer — S<k> : modèle <M> · effort <E>   (la pastille hérite des réglages courants)
```

Seule exception : une session lancée en `claude -p` porte `--model`/`--effort` dans sa commande,
donc la commande affichée suffit — le rappel devient inutile.

Un effort élevé consomme plus de tokens sur *chaque* tour de la session : le laisser à `xhigh` en
permanence est le poste de dépense le plus silencieux du workflow.

## 4. Plans

Le backlog vit dans `TASKS.md` (index global). Un plan est toujours précédé d'une **décision écrite** :
si le QUOI ou le POURQUOI n'est pas tranché, dérouler **`/cadrer`** dans une session séparée — sa
sortie (`docs/decisions/`) est l'entrée du plan. Puis Opus déroule **`/nouveau-plan`**, qui crée un
dossier `plans/P<n>/` :

- **`plans/P<n>/index.md`** — guide d'orchestration : objectif, table des sessions, ordonnancement
  par vagues. **C'est le seul endroit où vit le statut des tâches.**
- **un fichier par session** `S<k>.md` — une session = un lancement de Claude Code (un modèle, un
  effort, un contexte), 1 à n tâches. Contenu = décision finale + chemins + étapes ; **pas** les
  alternatives (elles sont dans `docs/decisions/`).

L'exécutant ouvre **uniquement** son `S<k>.md`. Format, règle de découpage et squelettes :
skill `/nouveau-plan`.

### 4a. Un statut, un seul endroit

*Domicile de cette règle : les autres fichiers renvoient ici, ne la reformulent pas.*

Le suivi a échoué chaque fois qu'une même information a dû être écrite à plusieurs endroits. Donc :

| Information | Vit dans | Ne vit PAS dans |
| --- | --- | --- |
| Avancement d'une tâche d'un plan | `plans/P<n>/index.md` | `S<k>.md`, `TASKS.md` |
| Backlog non planifié | `TASKS.md` | ailleurs |
| État actuel de l'app | `STATUS.md` | `TASKS.md`, historique |
| Décision (verdict) | registre `DECISIONS.md` | plans, `CLAUDE.md` |
| Décision (justification) | `docs/decisions/<date>-<slug>.md` | registre |
| Jugement visuel en attente | `VALIDATION.md` | `S<k>.md` (sauf vague parallèle) |

**Qui a le droit de cocher `index.md`** : un seul juge à la fois, décidé par `.claude/wave.lock` —
mécanisme complet en §4b, ne pas le reformuler ici.

### 4b. Commits & parallélisation

*Domicile de cette règle : les autres fichiers renvoient ici, ne la reformulent pas.*

**Chaque session committe son propre travail**, tâche par tâche, avant de rendre la main : staging
explicite, message prévu dans le `T<n>`. La session qui vient d'écrire le code est la seule à savoir
quels fichiers sont les siens — le faire reconstituer plus tard, par un autre modèle, coûte plus cher
et se trompe.

*Renversement du 2026-08-24.* La règle précédente reportait tous les commits en fin de plan. Le prix
réel s'est vu sur MYO P1 : un arbre de travail où trois sessions avaient déposé leurs fichiers, et une
consolidation qui devenait une fouille — confiée, qui plus est, au modèle le moins cher du plan.

Chaque commit porte le repère de sa tâche en dernière ligne. C'est ce qui rend l'attribution mécanique
après coup (`git log --grep`), au lieu de la faire deviner :

```
Plan: P<n>/S<k>/T<m>
```

- **Ce qu'une session committe** : les fichiers de ses tâches, et son `S<k>.md`. Rien d'autre.
- **N0 vert d'abord** : `build` + `typecheck` + tests du périmètre. Un commit qui ne compile pas
  transforme le point de retour en piège.
- **Jamais `git push`** depuis une session : le push est groupé, en fin de vague ou de plan.
- **L'`index.md` suit le verrou, pas le mot « vague »** : `.claude/wave.lock` présent → la session
  n'y touche pas, l'orchestrateur coche en fin de vague ; verrou absent → la session coche **sa
  propre ligne** dans le commit de ses tâches. Un statut, une seule main (§4a) — mais la main est
  celle de la session dès qu'il n'y a pas de concurrence, sans quoi la session suivante ne voit
  jamais sa dépendance satisfaite.
- `git add -A`, `git add .` et `git commit -a` restent refusés par hook : sans staging explicite,
  une session emporte les fichiers de ses voisines.

**Parallélisme réel — l'unique exception.** Deux sessions lancées en même temps partagent un
seul index git — sous-agents concurrents comme processus `claude -p` concurrents, indépendamment de
la voie (§5b) : `git commit` prend l'état du dépôt, pas celui de la session, donc chacune emporterait
le travail en cours de l'autre. Pour ces vagues-là **seulement**, poser `.claude/wave.lock` (à mettre
en `.gitignore` — marqueur local, pas du contenu de projet) : un hook refuse alors commit et push
(§7), les sessions laissent leur diff dans l'arbre, et **l'orchestrateur committe pour elles en fin
de vague**, tâche par tâche, guidé par les colonnes `Zone modifiée`. Une vague dont les sessions se
suivent, quelle que soit la voie, n'a pas besoin du verrou.

Le filet de sécurité intra-plan est désormais git lui-même : chaque session laisse un point de retour
nommé. `/rewind` reste utile **dans** une session ; il n'a jamais rien pu pour ce qui se passe entre
deux conversations parallèles.

- **Fin de plan** : plus de consolidation de commits à faire. Restent `STATUS.md`, `TASKS.md`,
  `VALIDATION.md` à mettre à jour, et **un seul push**.

## 5. Déléguer au lieu de faire

Chercher, lancer une commande verbeuse ou lire une doc externe remplit le contexte de traces
(chemins, sorties, fausses pistes) qu'on paie ensuite à chaque tour — et c'est justement en cadrage
Opus, le contexte le plus cher, qu'on en accumule le plus.

Quatre agents du plugin, chacun ne rend que sa **conclusion** — jamais les traces brutes :

- `explorateur` → localiser quelque chose qui touche plus d'1 fichier.
- `verificateur-n0` → lancer build/typecheck/tests (jamais ces commandes en direct dans la
  conversation principale).
- `resumeur-git` → résumer un diff ou un historique.
- `lecteur-doc` → lire une doc externe.

Table de délégation détaillée : `CLAUDE-BASE.md` (section « Avant de coder »).

## 5b. Sessions & voies d'orchestration

*Domicile de cette règle : les autres fichiers renvoient ici, ne la reformulent pas.*

**Jamais deux sessions d'un même plan dans une seule conversation** — chacune démarre à froid, pour
ne pas traîner le contexte de l'une dans l'autre.

- **Session par session, à la main** : la skill `/fin-de-tache` pose une pastille qui lance la
  suivante.
- **Vague entière, sans intervention** : dérouler `/orchestrer-plan`.

**Voie normale : sous-agent.** Toute session orchestrée se lance avec l'outil `Agent`, en
arrière-plan — c'est le défaut, quel que soit l'environnement, `Env. = —` dans l'index. Le
sous-agent hérite du navigateur in-app de la session d'orchestration (donc son N1) et de tout son
environnement (permissions, MCP) : zéro préflight, zéro clic. Le verdict est celui de ses commits
(§4b). La session d'orchestration doit rester ouverte pendant ce temps : les sous-agents vivent en
elle.

**Exception headless**, à déclarer et justifier dans la colonne `Env.` de l'index (`headless`) —
jamais par défaut. Légitime dans exactement deux cas :

| Cas | Pourquoi le sous-agent ne suffit pas |
| --- | --- |
| Effort `high`/`xhigh` à appliquer réellement | l'outil `Agent` règle le modèle, pas l'effort |
| Vague à lancer sans garder la fenêtre ouverte | un `claude -p` détaché survit à la fermeture, un sous-agent non |

Une vague headless lance un processus `claude -p` par session ; le verdict reste lu dans les commits
(§4b) — un motif de sortie absent n'est qu'une information manquante, pas une panne à instruire.

**Repli — hors Claude Code Desktop** (VSCode, terminal, session cloud), quand aucune pastille ni
navigateur in-app n'est disponible : revenir au chaînage manuel du premier point, une pastille
`spawn_task` (ou la commande du bandeau) par session terminée. La vague ne se termine alors plus
dans le même tour — c'est un repli, pas le fonctionnement normal.

## 6. Validation — trois niveaux

| Niveau | Qui | Bloquant | Contenu |
| --- | --- | --- | --- |
| **N0 — auto** | Claude, toujours | **oui** | `build` + `typecheck` + tests du périmètre touché (`—` justifié sinon) |
| **N1 — visuel auto** | Claude, si navigateur in-app | non | erreurs console, contenu présent, requêtes 4xx/5xx, responsive |
| **N2 — humain** | l'utilisateur | non | jugement esthétique / UX / ton — **rien d'autre** |

**N1 est nouveau et change la règle précédente** : Claude Code Desktop dispose d'un navigateur
in-app (`preview_start`, `read_page`, `read_console_messages`…). Ce qu'un navigateur peut constater
seul n'a plus à être délégué à un humain — et ne doit donc plus atterrir dans `VALIDATION.md`, qui
gonflait de checklists jamais dépilées.

**L'environnement conditionne N1** : le navigateur in-app n'existe **que** dans Claude Code Desktop —
ni VSCode, ni terminal, ni session cloud (`claude.ai/code`, appli mobile). D'où :

- le bandeau de chaque `S<k>.md` porte `Environnement : Desktop (navigateur requis) | indifférent`,
  et l'`index.md` a une colonne **Env.** ;
- une session dont le N1 est structurant (nouvel écran, refonte de mise en page) se lance depuis
  Desktop ;
- lancée ailleurs, la skill `/verif-visuelle` bascule en mode B : elle **sort la commande dev et la
  checklist** au lieu de vérifier, et rend la main.

Hors navigateur in-app, Claude ne valide **jamais** l'UI autrement : pas de Playwright, pas de
capture par script. Les audits Playwright restent le rôle de Codex (`AGENTS.md`), pour la
régression scriptée.

Protocole complet : skill **`/verif-visuelle`**.

## 7. Garde-fous appliqués (hooks)

Les règles ci-dessus qui comptent vraiment ne sont pas seulement écrites : elles sont **appliquées**
par quatre hooks (`.claude/workflow/hooks/`). Le câblage réel vit désormais dans `hooks.json` du
plugin (chemins `.claude/workflow`) — le `settings.json` d'un projet n'en porte plus la
définition. Une instruction ne contraint rien ; un hook si.

| Hook | Événement | Ce qu'il fait |
| --- | --- | --- |
| `sessionstart-contexte.mjs` | SessionStart | Signale : vague en cours, `STATUS.md` en retard de ≥3 commits, plafonds dépassés. Silencieux si tout est sain. |
| `pretooluse-git.mjs` | PreToolUse (Bash/PowerShell/EnterWorktree) | Refuse `git add -A`/`.`/`--all` et `git commit -a` ; refuse commit, push et ouverture de worktree tant que `.claude/wave.lock` existe. |
| `posttooluse-format.mjs` | PostToolUse (Edit/Write) | Formate via prettier si configuré dans le projet, silencieux sinon. |
| `stop-contexte.mjs` | Stop | Refuse de rendre la main si du code a été modifié sans qu'aucun fichier de suivi ne le soit, ou si un plafond est dépassé. Ne bloque qu'une fois par session. |

### Plafonds de lignes

Source unique : `.claude/workflow/hooks/plafonds.json`.

| Fichier | Plafond |
| --- | --- |
| `STATUS.md` | 80 |
| `TASKS.md` | 60 |
| `VALIDATION.md` | 60 |
| `DECISIONS.md` (registre) | 150 |
| `PROJECT_MAP.md` | 200 |
| `CLAUDE.md` | 200 |

Un dépassement n'est pas une suggestion : il déclenche `/purge-contexte` avant de continuer.
Ces fichiers sont relus à chaque session — leur longueur est un coût récurrent, pas un détail.

## 8. Anti-patterns

- Lancer Opus sur une tâche déjà cadrée ; lancer Fable sans passage Opus préalable.
- **Relancer une 3ᵉ fois la même session en montant l'effort** alors que le modèle est le problème
  (§3) : sur du multi-étapes, un modèle plus capable coûte souvent moins cher au total qu'une suite
  d'allers-retours ratés.
- Laisser `xhigh` comme effort permanent « au cas où ».
- Envoyer à Sonnet/Haiku un scope flou ou trop large → dérive.
- Empiler dans une session des tâches qui ne remplissent pas les critères de regroupement — ou, à
  l'inverse, payer un démarrage froid pour une tâche `low` qui aurait dû s'adosser à un lot.
- Explorer le repo dans le contexte Opus au lieu de déléguer à un subagent (§5).
- Faire soi-même ce qu'un agent mécanique rendrait en 10 lignes (sortie de build verbeuse,
  exploration de fichiers, lecture de doc externe).
- Improviser des tâches hors du `S<k>.md` en cours ; mélanger deux sessions dans un même lancement.
- Enchaîner deux sessions d'un même plan dans une seule et même conversation (§5b).
- Reporter ses commits à plus tard, ou pusher depuis une session (§4b) — une session committe le sien, et lui seul.
- Écrire dans `VALIDATION.md` ce qu'un navigateur constate seul (§6).
- Recopier un statut à deux endroits (§4a).
- Recopier du texte au lieu de pointer vers la source (`WORKFLOW.md`, `docs/decisions/`…).
- Laisser grossir un fichier de contexte au-delà de son plafond « juste pour cette fois ».
