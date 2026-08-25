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

En mode autonome : enchaîner les tâches (gate = N0), accumuler les points N2, rendre la main en fin de lot.

## Avant de coder

Plan court (max 5 lignes) : objectif, fichiers concernés, 3-5 étapes, risques. Pas d'analyse longue.
Déléguer plutôt que faire soi-même (le contexte accumulé se paie à chaque tour) :

- localiser qqch touchant plus d'1 fichier → agent `explorateur`
- build/typecheck/tests → agent `verificateur-n0` (JAMAIS en direct dans la conversation principale)
- résumer un diff/historique → agent `resumeur-git`
- lire une doc externe → agent `lecteur-doc`

**La délégation empêche le contexte d'entrer, elle ne l'évacue pas** : un agent ne peut pas alléger
une conversation déjà chargée, il devrait tout relire pour reconstruire ce qu'on a sous la main.
Ce qui est entré ne se retire que par un démarrage à froid.

**Une session = un fichier `S<k>.md`** (1 à n tâches). `/clear` (ou nouvelle session) entre deux
sessions : ne pas traîner le contexte d'une session dans la suivante, ni improviser hors plan.
Session suivante d'un plan = toujours une nouvelle conversation, jamais la même (sous-agent quand
`/executer-vague` orchestre, pastille ou commande du bandeau en lancement manuel — voir
`WORKFLOW.md` §5b).

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
