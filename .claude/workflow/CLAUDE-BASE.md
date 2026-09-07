# CLAUDE-BASE.md

Règles communes à tous les projets — source unique, importée par le CLAUDE.md de chaque
projet ; ne pas copier. Chargé à **chaque** session : rester court.

## Règles générales

- Modifier le minimum de fichiers, garder le style existant. Simplicité > cosmétique.
- Pas de refactor global, changement de stack ou dépendance sans validation. Conventions :
  `.claude/workflow/CONVENTIONS.md`.
- **Cadrage uniquement** (pas de plan existant) : lire `PROJECT_BRIEF.md` (produit), `ARCHITECTURE.md`
  (écrans, maquette UI), `DECISIONS.md` (registre — le détail est dans `docs/decisions/`, à n'ouvrir
  que si la décision est en jeu), `PROJECT_MAP.md` (localisation). Un exécutant qui a un `S<k>.md`
  ne lit QUE les fichiers listés dans sa session.
- Instruction utile seulement sur un sous-ensemble de fichiers d'un projet → `.claude/rules/` de CE
  projet (règle scopée), pas une ligne ajoutée à `CLAUDE.md` (voir `CONVENTIONS.md`).

## Écrire pour qui décide

Le lecteur connaît son projet, pas le code. Tout ce qu'il lit — proposition, option, annonce de
vague, rapport, décision — dit d'abord **ce que ça change et à quoi il le verra**, et seulement
ensuite comment. Un terme technique inévitable est suivi une fois de ce qu'il désigne. Une
recommandation énonce son revers, sinon elle ne laisse rien à arbitrer.

Ce n'est pas un cours : on explique ce que fait la chose et ce qu'elle coûte, jamais comment le
langage ou l'outil fonctionne. Ce qui est déjà écrit dans un fichier ne se recopie pas ici — le
registre s'applique à ce qu'on rédige, pas au volume.

## Dépendances

Un exécutant n'ajoute **jamais** de dépendance de lui-même : si une tâche en requiert une, elle
est déjà tranchée dans « Modifier » de son plan. Sinon → **STOP**.

## Validation — trois niveaux

- **N0 auto (bloque le commit)** : `build` + `typecheck` + les tests du périmètre touché — à créer
  si la tâche introduit de la logique testable ; un `—` (aucun test) doit être justifié
  explicitement dans le plan.
  Un `typecheck` qui ne compile **aucun** fichier rend un vert vide et ne bloque plus rien : le
  vérifier une fois par projet (`--listFiles | wc -l` non nul) — cf. le gabarit `CLAUDE.md`.
- **N1 visuel auto (non bloquant)** : erreurs console, contenu présent, 4xx/5xx, responsive —
  **uniquement** via le navigateur in-app de Claude Code Desktop, en déroulant `/verif-visuelle`.
  Indisponible partout ailleurs (VSCode, terminal, cloud, mobile) : la skill sort alors la
  checklist à dérouler à la main.
- **N2 humain (non bloquant)** : jugement esthétique / UX / ton. Claude ne l'évalue pas, il le
  consigne dans `VALIDATION.md` — et **rien d'autre** n'y va.

Jamais de Playwright, de script de capture ni d'automatisation de navigateur hors outils in-app :
la régression visuelle scriptée est le rôle de Codex
(`.claude/workflow/AGENTS.md`).

**La grille s'arrête à trois.** La relecture de fin de session (`/fin-de-tache`, agent
`relecteur-session`) est automatique et non bloquante, mais **n'est pas un niveau** : elle se lance
APRÈS commits et statuts, **au premier plan**, et c'est l'agent qui dépose
`plans/P<n>/S<k>.revue.md` — **toujours**, même sans trouvaille (`Bloquant : 0`), pour qu'un fichier
absent ne veuille dire qu'une chose : la revue n'a pas tourné. Versé dans `TASKS.md` au tri de
clôture du plan (classé bloquant/backlog), jamais dans `VALIDATION.md`.

En mode autonome : enchaîner les tâches (gate = N0), accumuler les points N2, rendre la main en fin de lot.

## Avant de coder

Plan court (max 5 lignes) : objectif, fichiers concernés, 3-5 étapes, risques. Pas d'analyse longue.
Déléguer plutôt que faire soi-même (le contexte accumulé se paie à chaque tour) :

- localiser qqch touchant plus d'1 fichier → agent `explorateur`
- build/typecheck/tests → agent `verificateur-n0` (JAMAIS en direct dans la conversation principale)
- résumer un diff/historique → agent `resumeur-git`
- lire une doc externe → agent `lecteur-doc`
- relire le diff d'une session close → agent `relecteur-session`, qui écrit lui-même son `.revue.md`
- besoin du contexte courant **et** travail bruyant (outils, itérations) → sous-agent `fork`, qui
  hérite la conversation et réutilise le cache : seul son résultat revient, ses appels restent dehors

**Les cinq premiers tournent au premier plan, jamais en arrière-plan** (pas de
`run_in_background: true` sur l'outil `Agent`) : leur conclusion conditionne la suite immédiate de
la tâche en cours — N0 bloque le commit (ci-dessus), une localisation conditionne le code qui suit,
et le `relecteur-session` est le **dernier** geste de la session, donc aucun tour ne s'ouvrira après
lui pour lire un retour. Les lancer en arrière-plan puis rendre la main revient, pour le harnais, à
clore une session : le verdict arrive dans un tour que plus personne ne lit — pour les quatre
premiers sans que rien soit commité, pour le cinquième sans que la revue soit déposée.
L'arrière-plan est
réservé à la voie sous-agent de **session entière** (`WORKFLOW.md` §5b), où c'est la conversation
d'orchestration — pas l'exécutant — qui reste ouverte à attendre la notification.

**La délégation empêche le contexte d'entrer, elle ne l'évacue pas** : un agent neuf ne peut pas
alléger une conversation déjà chargée, il devrait tout relire pour reconstruire ce qu'on a sous la
main. Ce qui est entré ne se retire que par un démarrage à froid. Un `fork` échappe à ce coût
(il hérite), mais **jamais pour une session de plan ni une reprise d'échec** — il rapatrierait le
contexte que ces deux-là existent pour laisser derrière — **ni pour une restitution pure** sans
appel d'outil, où écrire soi-même reste moins cher. Détail :
`docs/decisions/2026-08-30-contexte-des-sous-agents.md` du dépôt source.

**Pas de `memory:` sur les agents du plugin.** Une mémoire d'agent n'est légitime que pour une
information dont **aucun fichier du dépôt n'est déjà la source** — commandes (`CLAUDE.md`),
localisation (`PROJECT_MAP.md`) et état git n'en sont pas.

**Une session = un fichier `S<k>.md`** (1 à n tâches). `/clear` (ou nouvelle session) entre deux
sessions : ne pas traîner le contexte d'une session dans la suivante, ni improviser hors plan.
Session suivante d'un plan = toujours une nouvelle conversation, jamais la même — voie et mécanique :
`WORKFLOW.md` §5b.

## Plans, modèles, garde-fous

Backlog : `TASKS.md`. Un plan = un dossier `plans/P<n>/` : un `index.md` (orchestration **et seul
porteur des statuts**) + un `S<k>.md` par session. Cadrage : skill `/nouveau-plan`.
Grille modèle/effort, niveaux de validation, règles de commit, plafonds de lignes :
`.claude/workflow/WORKFLOW.md`.

Quatre hooks appliquent ces règles (git, contexte à jour, plafonds, format) : ce ne sont pas des conseils,
ils refusent l'action. Un plafond dépassé → `/purge-contexte` avant de continuer.

## Fin de tâche

Dérouler la skill `/fin-de-tache`.

## Compactage

Préserver en priorité : les **décisions prises et leur justification**, les **chemins des fichiers
modifiés**, les **résultats de validation** N0/N1, et les **tâches du plan restant à faire**.
Élaguer le reste : exploration, fausses pistes, sorties de commandes, contenus déjà écrits sur
disque (ils se relisent).

En session `/cadrer`, la question et le critère de fin survivent au compactage, toujours.
