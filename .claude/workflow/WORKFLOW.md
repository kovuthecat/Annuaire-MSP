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
sortie (`docs/decisions/`) est l'entrée du plan.

En amont encore : quand la question elle-même n'est pas identifiée — les correctifs et les ajouts se
sont empilés, personne ne sait plus si le chemin pris tient — **`/revue-de-conception`** la trouve.
Elle constate l'écart entre l'intention écrite et le code réel, **recale l'objectif avec
l'utilisateur en interview** (c'est souvent le but qui a bougé, pas le code qui a dérivé), puis sort
un rapport dans `docs/revues/` et remet l'écrit à jour. Tout autre arbitrage sort en `/cadrer`, à
froid.

Puis Opus déroule **`/nouveau-plan`**, qui crée un dossier `plans/P<n>/` :

- **`plans/P<n>/index.md`** — guide d'orchestration : objectif, table des sessions, ordonnancement
  par vagues. **C'est le seul endroit où vit le statut des tâches.**
- **un fichier par session** `S<k>.md` — une session = un lancement de Claude Code (un modèle, un
  effort, un contexte), 1 à n tâches. Contenu = décision finale + chemins + étapes ; **pas** les
  alternatives (elles sont dans `docs/decisions/`).

L'exécutant ouvre **uniquement** son `S<k>.md`. Format, règle de découpage et squelettes :
skill `/nouveau-plan`.

Une correction qui **débloque un plan en cours** s'ajoute à ce plan (sessions suivantes, vague de
remédiation) au lieu de devenir `P<n+1>` : aiguillage et plafond dans `/nouveau-plan` Étape 0.

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
| Incident de workflow (§9b) | `docs/workflow/incidents/<date>-<slug>.md` | `TASKS.md`, `STATUS.md`, la conversation |

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

Un second repère, réservé au commit de tri de la clôture (`/fin-de-tache` point 16) : `Revues:
P<n>/S<k>[, …]`, les revues de session versées dans `TASKS.md` puis supprimées. Le `.revue.md` n'est
jamais commité — ce repère est la seule trace qu'il a existé, et sans lui le hook `Stop` relit sa
suppression comme une revue jamais lancée (§7).

- **Ce qu'une session committe** : les fichiers de ses tâches, son `S<k>.md`, et le fichier
  d'incident si le workflow a cassé pendant la tâche (§9). Rien d'autre.
- **N0 vert d'abord** : `build` + `typecheck` + tests du périmètre. Un commit qui ne compile pas
  transforme le point de retour en piège.
- **À jour avant de commencer.** Vérifier qu'on n'est pas en retard sur `origin/main` et rattraper
  (`git pull --rebase`) **avant la première tâche** — le hook `SessionStart` le constate et le dit
  (§7). Coder sur un arbre en retard, c'est préparer un conflit ou écraser ce qui a été poussé
  d'ailleurs.
- **Le push est groupé, et il va sur `main`.** Ni à chaque tâche ni à chaque session : à la clôture
  d'une **unité de travail** — fin d'orchestration (`/orchestrer-plan` Étape 6), fin de plan
  (`/fin-de-tache` point 17), fin de cadrage (`/cadrer` Étape 5), fin de `/nouveau-plan`. **Session
  cloud comprise** : le travail atterrit sur `main`, jamais sur une branche laissée derrière — une
  branche que personne ne rapatrie est un décalage de plus, pas une précaution.
- **L'`index.md` suit le verrou, pas le mot « vague »** : `.claude/wave.lock` présent → la session
  n'y touche pas, l'orchestrateur coche en fin de vague ; verrou absent → la session coche **sa
  propre ligne** dans le commit de ses tâches. Un statut, une seule main (§4a) — mais la main est
  celle de la session dès qu'il n'y a pas de concurrence, sans quoi la session suivante ne voit
  jamais sa dépendance satisfaite.
- `git add -A`, `git add .` et `git commit -a` restent refusés par hook : sans staging explicite,
  une session emporte les fichiers de ses voisines.

*Précision du 2026-09-09.* Le push était dit « groupé, en fin de vague ou de plan » — mais `/cadrer`
et `/nouveau-plan` n'en parlaient nulle part : leurs écrits (une décision, un dossier de plan)
pouvaient rester locaux indéfiniment, et l'entrée dans un plan ne vérifiait rien. Le prix s'est vu le
2026-09-09 : un clone du dépôt de distribution resté deux semaines sur une version périmée, et — déjà
le 2026-08-28 — un dépôt source publié en `--force` depuis un arbre en retard, qui avait amputé le
miroir public (d'où le garde-fou de `bin/publier.mjs`). Un commit qui dort en local n'existe pour
aucune autre machine : ni le poste voisin, ni une session cloud, ni le mobile.

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

Cinq agents du plugin, chacun ne rend que sa **conclusion** — jamais les traces brutes :

- `explorateur` → localiser quelque chose qui touche plus d'1 fichier.
- `verificateur-n0` → lancer build/typecheck/tests (jamais ces commandes en direct dans la
  conversation principale).
- `resumeur-git` → résumer un diff ou un historique.
- `lecteur-doc` → lire une doc externe.
- `relecteur-session` → relire le diff d'une session close et **déposer** son `.revue.md`
  (`/fin-de-tache`).

Les cinq se lancent **au premier plan** (jamais `run_in_background: true`) : leur verdict
conditionne la suite de la même tâche — une session ne rend la main qu'après l'avoir lu. Le
cinquième est le dernier geste de la session : lancé en arrière-plan, son retour n'atteindrait
aucun tour et la revue ne serait jamais déposée.

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

**Cet arrière-plan-là est celui de la session entière — pas celui de ses délégations internes.**
Une fois lancée, la session exécutante reste soumise à §5 : ses propres appels à `verificateur-n0`
et aux trois autres agents restent au premier plan, qu'elle ait été lancée à la main ou par
l'orchestrateur. Confondre les deux a déjà coûté plusieurs échecs — une session qui lance son N0 en
arrière-plan avant de committer se referme, elle aussi, sans rien avoir committé
(`docs/decisions/2026-09-04-delegation-au-premier-plan.md`).

**L'effort d'un sous-agent est celui de la conversation qui le lance.** L'outil `Agent` règle le
modèle, pas l'effort : le sous-agent hérite de l'effort **ambiant** de la session d'orchestration.
Régler cette conversation à l'effort le plus haut de la vague **avant** de dérouler
`/orchestrer-plan` (le rappel « À régler AVANT de lancer » de §3 vaut pour l'orchestrateur
lui-même) couvre donc `high` sans sortir de la voie normale — l'orchestrateur tourne sur Haiku et
ne fait que lancer et collecter, l'effort élevé lui coûte peu.

**Exception headless**, à déclarer et justifier dans la colonne `Env.` de l'index (`headless`) —
jamais par défaut. Légitime dans exactement deux cas :

| Cas | Pourquoi le sous-agent ne suffit pas |
| --- | --- |
| Effort **strictement supérieur** à l'effort ambiant de l'orchestration (en pratique `xhigh`) | le sous-agent hérite de l'effort ambiant, il ne le dépasse pas |
| Vague à lancer sans garder la fenêtre ouverte | un `claude -p` détaché survit à la fermeture, un sous-agent non |

Une vague headless lance un processus `claude -p` par session ; le verdict reste lu dans les commits
(§4b) — un motif de sortie absent n'est qu'une information manquante, pas une panne à instruire.

**Un `claude -p` n'a personne pour approuver un outil.** Tout ce qui n'est ni dans
`permissions.allow` du projet ni dans les options de lancement est **refusé**, et la session échoue
sans avoir pu écrire une ligne — constaté sur une session dont l'allowlist ne portait pas `Edit`.
Trois garde-fous, tous appliqués par `/orchestrer-plan` : l'allowlist du gabarit
`project-settings.json` porte le socle (`Edit`, `Write`, `git add`, `git commit`, `git pull`) ; le
lancement ajoute `--permission-mode acceptEdits` et les commandes git de base en `--allowedTools`
(elles s'**ajoutent** à l'allowlist du projet, sans la remplacer) ; et le préflight **sonde**
l'écriture réelle avec ces mêmes options avant de lancer la vague. Un refus qui passe quand même
est un échec d'**environnement** (§9) : la reprise se lance en sous-agent, qui hérite des
permissions de la conversation — jamais en montant de modèle.

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
| `sessionstart-contexte.mjs` | SessionStart | Signale : retard sur `origin/main` (après un `git fetch` plafonné à 6 s) et branche autre que celle d'intégration (§4b), vague en cours, `STATUS.md` en retard de ≥3 commits, plafonds dépassés. Silencieux si tout est sain, et sans objet sur un dépôt sans remote. Mémorise `HEAD` au démarrage — c'est ce repère qui permet au hook `Stop` de savoir ce que la session a commité. |
| `pretooluse-git.mjs` | PreToolUse (Bash/PowerShell/EnterWorktree) | Refuse `git add -A`/`.`/`--all` et `git commit -a` ; refuse commit, push et ouverture de worktree tant que `.claude/wave.lock` existe. |
| `posttooluse-format.mjs` | PostToolUse (Edit/Write) | Formate via prettier si configuré dans le projet, silencieux sinon. |
| `stop-contexte.mjs` | Stop | Refuse de rendre la main si du code a été modifié sans qu'aucun fichier de suivi ne le soit, si une session de plan a commité du code sans laisser trace de sa revue (ni `.revue.md` sur disque, ni repère `Revues:` de tri de clôture — §4b), ou si un plafond est dépassé. Ne bloque qu'une fois par session, et ne rappelle ensuite que si la liste des manquements a changé. **Sous `.claude/wave.lock`, seuls les plafonds sont signalés** : un diff non commité et une revue absente y sont le fonctionnement normal (§4b), pas un manquement — les signaler à chaque tour ne faisait que polluer l'orchestrateur. |

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
- Reprendre un échec d'environnement ou de prémisse avec un modèle au-dessus (§9) : le modèle n'y
  était pour rien, l'escalade paie deux fois le même diagnostic.
- Conclure `FAIL` sans avoir nommé la nature de l'échec, ou s'entêter au-delà d'une correction sur
  la même hypothèse (§9).
- Signaler un incident de workflow en prose dans une conversation, ou dans `TASKS.md` : il ne
  remonte jamais au dépôt source (§9).
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
- Reporter ses commits à plus tard (§4b) — une session committe le sien, et lui seul.
- Ouvrir une session sans vérifier qu'on est à jour, ou clore une unité de travail sans pousser sur `main` (§4b).
- Écrire dans `VALIDATION.md` ce qu'un navigateur constate seul (§6).
- Recopier un statut à deux endroits (§4a).
- Recopier du texte au lieu de pointer vers la source (`WORKFLOW.md`, `docs/decisions/`…).
- Laisser grossir un fichier de contexte au-delà de son plafond « juste pour cette fois ».

## 9. Échecs et incidents

*Domicile de cette règle : les autres fichiers renvoient ici, ne la reformulent pas.*

### 9a. Diagnostiquer avant de conclure

Une session qui échoue ne rend pas `FAIL` sur un symptôme : elle nomme d'abord la **nature** de
l'échec, parce que c'est elle — pas le modèle en place — qui décide de ce qui doit suivre.

| Nature | Ce que c'est | Ce que la session fait | Reprise (`/orchestrer-plan` 5c) |
| --- | --- | --- | --- |
| **environnement** | l'outillage a empêché la tâche, pas la tâche elle-même : permission refusée, outil absent (`Agent`, navigateur), hook qui refuse, verrou, worktree, dépendance non installée, humain requis absent | à portée → **corriger et continuer**, ce n'est pas un échec ; hors de portée → `FAIL` avec la remédiation nommée, **et un fichier d'incident** (§9b) | **même modèle**, en sous-agent (hérite de l'environnement) |
| **exécution** | tentée dans un environnement sain, elle n'aboutit pas : N0 rouge, résultat faux, bug non localisé | **une** correction sur l'hypothèse principale, N0 juge ; encore rouge → `FAIL`, la tentative va dans « Déjà écarté » | **un cran au-dessus** (règle de 2026-08-30) |
| **prémisse** | le diagnostic montre qu'une hypothèse du plan est fausse : attendu contredit par la mesure, contrat à changer, tâche irréalisable dans son périmètre | `FAIL` **sans corriger** — on ne corrige pas un plan dans une session | **aucune** : `ARBITRAGE` direct → `/nouveau-plan` Étape 0 |

Le plafond d'une correction n'est pas négociable : au-delà, c'est l'anti-pattern de §3 (tourner en
rond sur la même erreur), et c'est précisément ce qu'un modèle au-dessus règle mieux qu'une
troisième tentative. Le rapport `plans/P<n>/S<k>.echec.md` porte la nature en ligne mécanique
(`Nature : …`, gabarit dans `/reprendre-echec`) : l'orchestrateur ne lit que cette ligne, comme il
ne lit que `Bloquant :` d'une revue.

*Pourquoi.* Sur neuf rapports d'échec relus le 2026-09-09 dans quatre projets, la majorité étaient
des prémisses fausses ou des blocages d'environnement (permission `Edit` absente en headless,
humain requis absent) — et chacun avait déclenché une reprise un cran au-dessus, parfois Fable sur
Opus, qui n'a fait que refaire le diagnostic avant de rendre `ARBITRAGE`. Le modèle n'était jamais
la cause. Une session qui corrige elle-même ce qui est à sa portée économise en plus le démarrage à
froid de la reprise.

### 9b. Incident de workflow — le fichier qui remonte

**Quand le workflow lui-même casse** — hook qui refuse à tort, permission manquante, outil absent
du bac à sable, verdict perdu en route, revue non déposée, cache périmé, préflight rouge — le
signaler en prose ne sert à rien : la conversation disparaît, et le dépôt source ne le saura
jamais. Le mainteneur du workflow ne maîtrise pas le contexte de chaque projet ; c'est le fichier,
précis et versionné, qui rend l'analyse possible depuis le dépôt source (`bin/collecter-incidents.mjs`).

Un incident = un fichier `docs/workflow/incidents/YYYY-MM-DD-<slug>.md`, **commité et poussé avec
le projet** (§4b : il entre dans ce qu'une session committe ; sous verrou, l'orchestrateur le
committe en fin de vague ; c'est le push de fin d'unité de travail qui le fait sortir). Plafond
25 lignes, en-tête mécanique, faits bruts, aucune interprétation :

```md
# Incident workflow — YYYY-MM-DD — <titre court>

- Projet : <nom du dépôt>
- Workflow : v<version, lue dans .claude/workflow/manifest.json>
- Plan : P<n>/S<k>[/T<m>] ou —
- Environnement : <Desktop | VSCode | cloud> · <sous-agent | headless | à la main>
- Étape : <skill et étape — /orchestrer-plan Étape 4, /fin-de-tache relecture, hook Stop…>
- Nature : <environnement | exécution | prémisse | orchestration>

## Symptôme
<ce qui a été observé, tel quel : message d'erreur, refus de hook, verdict — 5 lignes max>

## Preuve
<commande, chemin ou sortie brute courte qui permet de le vérifier — pas d'interprétation>

## Sur place
<contournement appliqué, ou « rien »>
```

Qui écrit : la session qui rencontre l'incident (`/fin-de-tache`, avant son commit) ; la session en
échec d'environnement, à côté de son `.echec.md` ; l'orchestrateur pour ce que lui seul voit
(verdict perdu, `partial`, `permission_denials`, revue qu'il n'a pas pu lancer, préflight rouge).
Ni `TASKS.md` ni `STATUS.md` : un incident n'est pas une tâche du projet, c'est une donnée pour le
dépôt source. Un `.echec.md` se supprime quand l'échec est résolu ; un incident **reste** — c'est
sa raison d'être.
