---
name: fin-de-tache
description: Checklist de fin de tâche et de fin de session — statuts, fichiers de contexte, rapport, commit. À dérouler quand une tâche T<n> d'une session S<k> est terminée et validée (N0 build + typecheck OK). Le mode (solo ou vague parallèle) est indiqué dans le bandeau du S<k>.md.
---

# Fin de tâche

Lire le bandeau du `S<k>.md` en cours : **parallèle : oui/non** détermine le mode.

**Chaque session committe ses propres tâches** (cf. `WORKFLOW.md` §4b) : c'est elle qui sait quels
fichiers sont les siens. Le push, lui, reste groupé — jamais depuis une session.

**Une seule exception** : `.claude/wave.lock` présent = vague réellement parallèle, plusieurs sessions
écrivent dans le même index git. Un hook refuse alors commit et push, et c'est l'orchestrateur qui
committe en fin de vague. Le verrou est donc aussi le test : présent → je ne committe pas ; absent →
je committe avant de rendre la main.

**Le statut d'une tâche vit dans un seul fichier : l'`index.md` de son plan.** Ne pas le recopier
ailleurs (ni dans le `S<k>.md`, ni dans `TASKS.md`) — c'est la première source de désynchronisation.

## Après CHAQUE tâche (les deux modes)

1. **N0** : `build` + `typecheck` (+ tests unitaires si logique pure) passent. Sinon la tâche n'est
   pas finie.
2. **N1** : si la tâche touchait l'UI, dérouler `/verif-visuelle`. Un défaut N1 se corrige
   maintenant, il ne se reporte pas.
3. **Bilan dans le `S<k>.md`** — section « Bilan de session », complétée au fil des tâches :
   fichiers modifiés · résumé · N0 lancé · N1 constaté · N2 à faire · prochaine action. **Toujours**,
   y compris quand la tâche n'a produit aucun fichier durable (session de vérification, de mesure,
   d'audit). C'est la seule trace dont toutes les sessions disposent, tous modes confondus — et pour
   une session dont le livrable est une *conclusion* et non un diff, c'est le livrable lui-même.
   Le laisser dans la conversation le ferait disparaître avec elle.
4. **Commit de la tâche** — sauf si `.claude/wave.lock` est présent (voir ci-dessus). Staging
   explicite des fichiers de la tâche **et du `S<k>.md`**, message prévu dans le `T<n>`, et le repère
   de tâche en dernière ligne : c'est lui qui rend l'attribution mécanique plus tard.

   ```bash
   git status                       # relire ce qu'on s'apprête à prendre
   git add <fichiers de la tâche>    # jamais -A, jamais -a : les voisines seraient emportées
   git commit -m "<type(scope): message du T<n>>" -m "Plan: P<n>/S<k>/T<m>"
   ```

   **Jamais `git push`.** Un commit qui ne compile pas transforme le point de retour en piège : le
   N0 du point 1 est un prérequis, pas une formalité.

   **Une tâche sans fichier de code committe quand même son `S<k>.md`.** Une session qui ne laisse
   aucun commit est, pour l'orchestrateur, indistinguable d'une session jamais lancée — et il n'a
   ni le droit ni le moyen d'aller vérifier ailleurs. Zéro commit = zéro session.
5. **Rapport court** dans la conversation : le même contenu que le bilan, en trois lignes.
6. **Skill projet ?** : une procédure spécifique au projet a été déroulée ≥ 2 fois ou dictée en
   prompt ? → la proposer comme `.claude/skills/<nom>/` du projet (critères : `/choisir-mecanisme`).
   On PROPOSE, on ne crée JAMAIS silencieusement — chaque skill installée paie sa description à
   toutes les sessions. Lui donner un nom **distinct de ceux du workflow vendoré**, qui vit dans le
   même dossier : un doublon de nom rendrait indistinguables une skill propre au projet et une
   skill gérée par le manifeste.
7. **Un fichier géré a-t-il été modifié ?** Si la tâche a touché un fichier listé dans
   `.claude/workflow/manifest.json`, **c'est une erreur à réparer, pas à committer** : ces fichiers
   appartiennent au dépôt source. Porter la modification là-bas, publier, puis `/maj-workflow` ici.
   Sans ça, la prochaine synchronisation la signalera en dérive — au mieux — ou la perdra.
8. **Le workflow lui-même a changé ?** (tâche menée dans le dépôt source, sous `plugin/`) → bumper
   `version` dans `plugin/.claude-plugin/plugin.json` + une ligne dans `CHANGELOG.md`, puis publier.
   Sans bump, les projets vendorés ne voient jamais la mise à jour : le manifeste compare les
   versions, donc le travail est poussé mais n'arrive nulle part.

## Fin de session — mode SOLO (parallèle : non)

9. **Statut** : passer les tâches à `[x]` dans l'`index.md` du plan (colonne Statut), avec la date —
   hors vague, la session est seule sur ce fichier, donc elle l'écrit et l'inclut dans son commit.
10. **Contexte** : mettre à jour `STATUS.md` ; les autres fichiers **seulement si leur contenu
   change** — un fichier de contexte faux est pire qu'absent.
11. **N2** : consigner dans `VALIDATION.md` **uniquement** ce qui relève du jugement humain
   (esthétique, UX, ton), et supprimer les items N2 déjà tranchés depuis la dernière fois — git
   est l'archive, le fichier ne contient que ce qui est encore EN ATTENTE.
12. **Plafonds** : si le hook signale un dépassement, dérouler `/purge-contexte` — pas plus tard.
13. **Ne pas pusher** si d'autres sessions du plan restent à exécuter : le push est groupé, en fin
    de vague ou de plan.

## Fin de session — mode VAGUE PARALLÈLE (parallèle : oui)

9. **Fichiers partagés : c'est le verrou qui décide, pas le mot « vague ».** `STATUS.md`, `TASKS.md`
   et `VALIDATION.md` restent hors de portée dans les deux cas (ils se remplissent à la clôture).
   Pour l'`index.md` :

   | `.claude/wave.lock` | `index.md` |
   | --- | --- |
   | **présent** (sessions concurrentes) | ne pas y toucher — l'orchestrateur coche en fin de vague |
   | **absent** (Desktop, ou headless séquentiel) | cocher **sa propre ligne**, et elle seule, dans le commit du point 12 |

   Le verrou existe parce que deux sessions simultanées écriraient dans le même fichier. Sans
   concurrence, ce risque n'existe pas — et interdire quand même la coche a un coût direct : la
   session suivante ne voit jamais sa dépendance satisfaite, donc l'enchaînement casse et il faut
   revenir informer l'orchestrateur à la main (constaté le 2026-08-24).
10. Les points **N2** restent eux aussi dans le `S<k>.md` (à côté du bilan du point 3) — ils seront
    reversés dans `VALIDATION.md` en fin de plan.
11. **Ce que l'orchestrateur lira** : les commits du point 12, et rien d'autre. Ni le `S<k>.md` (il
    n'a pas le droit de l'ouvrir), ni une confirmation verbale. Une session qui rend la main sans
    avoir commité est, pour lui, une session jamais lancée.
12. **Commit ou pas, selon le verrou.** `.claude/wave.lock` absent (voie Desktop, ou headless
    séquentiel) → committer ses tâches comme au point 4, `S<k>.md` compris, sans toucher aux fichiers
    partagés. Verrou présent (parallélisme réel) → ne rien committer : l'orchestrateur le fera en fin
    de vague. Dans les deux cas, **jamais de push**.
13. **Ne pas travailler dans un worktree.** Une vague partage un seul arbre de travail, sur la
    branche du plan : c'est là que l'Étape 2d de `/executer-vague` a pris sa référence, et là que la
    vague suivante ira chercher le code dont elle dépend. Un commit posé sur la branche d'un worktree
    n'est vu par personne, et un diff non commité y disparaît au premier nettoyage. Si la session a
    déjà commencé dans un worktree, le **signaler** au lieu de clore : le travail doit d'abord revenir
    dans l'arbre principal. À la pastille, c'est « Démarrer localement », jamais le worktree proposé
    par défaut.

## Fin de plan (toutes les sessions exécutées et validées)

Le travail de code est déjà commité — chaque session a pris le sien. Il ne reste que le rangement.

14. **Vérifier qu'il ne reste rien.** `git status` doit être propre hors fichiers de contexte. Ce qui
    traîne encore appartient à une session qui n'a pas déroulé cette checklist : la retrouver plutôt
    que de balayer le reste dans un commit fourre-tout. Un `plans/P<n>/S<k>.echec.md` encore présent
    signale un échec non résolu → ne pas clore le plan (`/reprendre-echec`).
15. **Nettoyer les marqueurs** : `.claude/wave.lock` s'il existe, et `.claude/vague/` (sorties brutes
    et identifiants de session — transitoires).
16. **Ranger le contexte** : statuts `[x]` complets dans l'`index.md`, lignes purgées de `TASKS.md`,
    `STATUS.md` à jour, points N2 des `S<k>.md` reversés dans `VALIDATION.md`. Un commit dédié.
17. **Un seul push** pour l'ensemble du plan.

## Enchaînement — session suivante du plan

**D'abord : suis-je orchestrée ?** Si cette session a été lancée par `/executer-vague` — sous-agent
ou `claude -p` — l'enchaînement ne la regarde pas : l'orchestrateur collecte les verdicts et ouvre
la vague suivante lui-même. Rendre la main, point. Poser une pastille ici doublerait le lancement.

Le reste de cette section ne vaut donc que pour une session **lancée à la main**, ou par une pastille
de repli (Étape 4b de `/executer-vague`, quand l'orchestrateur n'avait pas de navigateur).

S'il reste des sessions prêtes dans l'`index.md` du plan (dépendances satisfaites — celles de la
vague en cours **comme** celles de la vague suivante, si cette session était la dernière qui les
bloquait) :

- **Desktop** : poser une pastille via `spawn_task` — titre `P<n> · S<k> — <titre>`, prompt
  « Ouvre plans/P<n>/S<k>.md et exécute-le. Modèle/effort : voir bandeau du fichier. »
- **Hors Desktop** : afficher la commande de lancement du bandeau du `S<k>.md` suivant, pour que
  l'utilisateur la lance lui-même.
- **Jamais dans la même conversation** : le contexte de la session qui vient de finir polluerait la
  suivante — démarrage froid systématique.

**Si cette session était la dernière `[ ]` de sa vague**, poser en plus une pastille de collecte —
titre `P<n> — collecter la vague <w>`, prompt « Déroule /executer-vague sur la vague <w> du plan
P<n> : collecte et vague suivante. » L'orchestrateur repart alors à froid, ce qui est de toute façon
préférable à réveiller une conversation qui traîne le contexte du lancement.

**Ne pas essayer de le prévenir par message.** `SendMessage` traverse bien les sessions, mais aucune
session ne peut s'identifier elle-même (`list_sessions` exclut la session courante, `get_session`
refuse son propre id) : l'orchestrateur ne peut donc pas laisser son adresse, et une fille qui
appelle `ListAgents` ne voit que des noms auto-générés qu'elle ne sait pas rattacher. Même résolu, un
message reste éphémère — une vague de repli s'étale sur des heures, la conversation d'orchestration
sera fermée. La pastille, elle, attend.
