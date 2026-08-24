---
name: fin-de-tache
description: Checklist de fin de tâche et de fin de session — statuts, fichiers de contexte, rapport, commit. À dérouler quand une tâche T<n> d'une session S<k> est terminée et validée (N0 build + typecheck OK). Le mode (solo ou vague parallèle) est indiqué dans le bandeau du S<k>.md.
---

# Fin de tâche

Lire le bandeau du `S<k>.md` en cours : **parallèle : oui/non** détermine le mode.

**Commit et push n'ont lieu qu'en fin de plan** (cf. `WORKFLOW.md` §4b), jamais après une tâche ni
une session. En vague parallèle, un hook les refuse tant que `.claude/wave.lock` existe.

**Le statut d'une tâche vit dans un seul fichier : l'`index.md` de son plan.** Ne pas le recopier
ailleurs (ni dans le `S<k>.md`, ni dans `TASKS.md`) — c'est la première source de désynchronisation.

## Après CHAQUE tâche (les deux modes)

1. **N0** : `build` + `typecheck` (+ tests unitaires si logique pure) passent. Sinon la tâche n'est
   pas finie.
2. **N1** : si la tâche touchait l'UI, dérouler `/verif-visuelle`. Un défaut N1 se corrige
   maintenant, il ne se reporte pas.
3. **Rapport court** : Fichiers modifiés · Résumé · N0 lancé · N1 constaté · N2 à faire ·
   Prochaine action. Laisser le diff non commité dans l'arbre de travail.
4. **Skill projet ?** : une procédure spécifique au projet a été déroulée ≥ 2 fois ou dictée en
   prompt ? → la proposer comme `.claude/skills/<nom>/` du projet (critères : `/choisir-mecanisme`).
   On PROPOSE, on ne crée JAMAIS silencieusement — chaque skill installée paie sa description à
   toutes les sessions. Lui donner un nom **distinct de ceux du workflow vendoré**, qui vit dans le
   même dossier : un doublon de nom rendrait indistinguables une skill propre au projet et une
   skill gérée par le manifeste.
5. **Un fichier géré a-t-il été modifié ?** Si la tâche a touché un fichier listé dans
   `.claude/workflow/manifest.json`, **c'est une erreur à réparer, pas à committer** : ces fichiers
   appartiennent au dépôt source. Porter la modification là-bas, publier, puis `/maj-workflow` ici.
   Sans ça, la prochaine synchronisation la signalera en dérive — au mieux — ou la perdra.
6. **Le workflow lui-même a changé ?** (tâche menée dans le dépôt source, sous `plugin/`) → bumper
   `version` dans `plugin/.claude-plugin/plugin.json` + une ligne dans `CHANGELOG.md`, puis publier.
   Sans bump, les projets vendorés ne voient jamais la mise à jour : le manifeste compare les
   versions, donc le travail est poussé mais n'arrive nulle part.

## Fin de session — mode SOLO (parallèle : non)

7. **Statut** : passer les tâches à `[x]` dans l'`index.md` du plan (colonne Statut), avec la date.
8. **Contexte** : mettre à jour `STATUS.md` ; les autres fichiers **seulement si leur contenu
   change** — un fichier de contexte faux est pire qu'absent.
9. **N2** : consigner dans `VALIDATION.md` **uniquement** ce qui relève du jugement humain
   (esthétique, UX, ton), et supprimer les items N2 déjà tranchés depuis la dernière fois — git
   est l'archive, le fichier ne contient que ce qui est encore EN ATTENTE.
10. **Plafonds** : si le hook signale un dépassement, dérouler `/purge-contexte` — pas plus tard.
11. **Ne pas committer ni pusher** si d'autres sessions du plan restent à exécuter.

## Fin de session — mode VAGUE PARALLÈLE (parallèle : oui)

7. **Ne toucher AUCUN fichier partagé** : ni `STATUS.md`, ni `TASKS.md`, ni `index.md`, ni
   `VALIDATION.md`.
8. Consigner le bilan de session et les points N2 **dans le `S<k>.md`** (il n'appartient qu'à cette
   session) — ils seront reversés à la consolidation.
9. **Ni commit ni push** (bloqués par hook tant que `.claude/wave.lock` est présent).

## Fin de plan (toutes les sessions exécutées et validées)

10. Supprimer `.claude/wave.lock` s'il existe (clôt la vague, débloque git), ainsi que
   `.claude/vague/` (verdicts bruts et identifiants de session de la vague — transitoires). Un
   `plans/P<n>/S<k>.echec.md` encore présent signale un échec non résolu : ne pas le supprimer,
   et ne pas clore le plan (`/reprendre-echec`).
11. **Commit tâche par tâche, staging explicite** : `git status`, relire le diff, puis
   `git add <fichiers de la tâche>` — `git add -A` et `git commit -a` sont refusés par hook.
   Message = celui prévu dans chaque `T<n>`.
12. **Consolider** : statuts `[x]` dans `index.md`, lignes purgées de `TASKS.md`, `STATUS.md` à
    jour, points N2 des `S<k>.md` reversés dans `VALIDATION.md`.
13. **Un seul push** pour l'ensemble du plan.

## Enchaînement — session suivante du plan

S'il reste des sessions prêtes dans l'`index.md` du plan (dépendances satisfaites) :

- **Desktop** : poser une pastille via `spawn_task` — titre `P<n> · S<k> — <titre>`, prompt
  « Ouvre plans/P<n>/S<k>.md et exécute-le. Modèle/effort : voir bandeau du fichier. »
- **Hors Desktop** : afficher la commande de lancement du bandeau du `S<k>.md` suivant, pour que
  l'utilisateur la lance lui-même.
- **Jamais dans la même conversation** : le contexte de la session qui vient de finir polluerait la
  suivante — démarrage froid systématique.
