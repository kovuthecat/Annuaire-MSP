---
name: fin-de-tache
description: Checklist de fin de tâche et de fin de session — statuts, fichiers de contexte, rapport, commit. À dérouler quand une tâche T<n> d'une session S<k> est terminée et validée (N0 OK).
---

# Fin de tâche

Lire le bandeau du `S<k>.md` en cours : **parallèle : oui/non** détermine le mode.

Qui committe, quand, et l'exception `.claude/wave.lock` : `WORKFLOW.md` §4b (domicile), ne pas le
reformuler ici. Où vit le statut d'une tâche : `WORKFLOW.md` §4a (domicile) — jamais recopié dans
un `S<k>.md` ni dans `TASKS.md`.

## Après CHAQUE tâche (les deux modes)

1. **N0** : `build` + `typecheck` (+ tests unitaires si logique pure) passent. Sinon la tâche n'est
   pas finie.
2. **N1** : si la tâche touchait l'UI, dérouler `/verif-visuelle`. Un défaut N1 se corrige
   maintenant, il ne se reporte pas.
3. **Bilan dans le `S<k>.md`** — section « Bilan de session », complétée au fil des tâches :
   fichiers modifiés · résumé · N0 lancé · N1 constaté · N2 à faire · prochaine action. **Toujours**,
   y compris quand la tâche n'a produit aucun fichier durable (session de vérification, de mesure,
   d'audit) : c'est alors le livrable lui-même, la conversation qui l'a produit disparaît.
4. **Commit de la tâche** — sauf si `.claude/wave.lock` est présent (§4b). Staging explicite des
   fichiers de la tâche **et du `S<k>.md`**, message prévu dans le `T<n>`, repère de tâche en
   dernière ligne :

   ```bash
   git status                       # relire ce qu'on s'apprête à prendre
   git add <fichiers de la tâche>    # jamais -A, jamais -a : les voisines seraient emportées
   git commit -m "<type(scope): message du T<n>>" -m "Plan: P<n>/S<k>/T<m>"
   ```

   Jamais `git push`. **Une tâche sans fichier de code committe quand même son `S<k>.md`** : zéro
   commit est, pour l'orchestrateur, indistinguable d'une session jamais lancée.
5. **Rapport court** dans la conversation : le même contenu que le bilan, en trois lignes.
6. **Skill projet ?** : une procédure spécifique au projet a été déroulée ≥ 2 fois ou dictée en
   prompt ? → la proposer comme `.claude/skills/<nom>/` du projet (critères : `/choisir-mecanisme`).
   On PROPOSE, on ne crée JAMAIS silencieusement ; nom **distinct** de ceux du workflow vendoré.
7. **Un fichier géré a-t-il été modifié ?** Si la tâche a touché un fichier listé dans
   `.claude/workflow/manifest.json`, **c'est une erreur à réparer, pas à committer** : porter la
   modification dans le dépôt source, publier, puis `/maj-workflow` ici.
8. **Le workflow lui-même a changé ?** (tâche menée dans le dépôt source, sous `plugin/`) → bumper
   `version` dans `plugin/.claude-plugin/plugin.json` + une ligne dans `CHANGELOG.md`, **puis**
   `node plugin/bin/publier.mjs` (le dépôt source n'est pas vendoré — `publier.mjs` n'existe qu'à
   cet emplacement, jamais sous `.claude/workflow/bin/`). Sans bump, les projets vendorés ne voient
   jamais la mise à jour ; sans publication, toute machine neuve embarque une version périmée.

## Fin de session — mode SOLO (parallèle : non)

9. **Statut** : passer les tâches à `[x]` dans l'`index.md` du plan (colonne Statut), avec la date —
   hors vague, la session est seule sur ce fichier, donc elle l'écrit et l'inclut dans son commit.
10. **Contexte** : mettre à jour `STATUS.md` ; les autres fichiers **seulement si leur contenu
    change** — un fichier de contexte faux est pire qu'absent.
11. **N2** : consigner dans `VALIDATION.md` **uniquement** ce qui relève du jugement humain
    (esthétique, UX, ton), et supprimer les items déjà tranchés — git est l'archive, le fichier ne
    contient que ce qui est encore EN ATTENTE.
12. **Plafonds** : si le hook signale un dépassement, dérouler `/purge-contexte` — pas plus tard.
13. **Ne pas pusher** si d'autres sessions du plan restent à exécuter : le push est groupé, en fin
    de vague ou de plan.

## Fin de session — mode VAGUE PARALLÈLE (parallèle : oui)

9. **Fichiers partagés : c'est le verrou qui décide, pas le mot « vague ».** `STATUS.md`, `TASKS.md`
   et `VALIDATION.md` restent hors de portée dans les deux cas (ils se remplissent à la clôture).
   Pour l'`index.md` (§4a/§4b) :

   | `.claude/wave.lock` | `index.md` |
   | --- | --- |
   | **présent** (sessions concurrentes) | ne pas y toucher — l'orchestrateur coche en fin de vague |
   | **absent** (voie séquentielle) | cocher **sa propre ligne**, et elle seule, dans le commit du point 12 |
10. Les points **N2** restent dans le `S<k>.md` (à côté du bilan du point 3) — reversés dans
    `VALIDATION.md` en fin de plan.
11. **Ce que l'orchestrateur lira** : les commits du point 12, et rien d'autre. Ni le `S<k>.md`, ni
    une confirmation verbale.
12. **Commit ou pas, selon le verrou.** Absent → committer ses tâches comme au point 4, `S<k>.md`
    compris, sans toucher aux fichiers partagés. Présent → ne rien committer : l'orchestrateur le
    fera en fin de vague. Dans les deux cas, **jamais de push**.
13. **Ne pas travailler dans un worktree** (§7, appliqué par `pretooluse-git.mjs`). Un diff commité
    sur la branche d'un worktree n'est vu par personne. Si la session a déjà commencé dans un
    worktree, le **signaler** au lieu de clore : le travail doit d'abord revenir dans l'arbre
    principal.

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

**D'abord : suis-je orchestrée ?** Si cette session a été lancée par `/orchestrer-plan` — sous-agent
ou `claude -p` (§5b) — l'enchaînement ne la regarde pas : l'orchestrateur collecte les verdicts et
ouvre la vague suivante lui-même. Rendre la main, point.

Le reste ne vaut que pour une session **lancée à la main**, ou par une pastille de repli (§5b, repli
hors Desktop) :

- S'il reste des sessions prêtes dans l'`index.md` (dépendances satisfaites, vague en cours ou
  suivante) : poser une pastille via `spawn_task` — titre `P<n> · S<k> — <titre> · <M>/<E>`, prompt
  « Ouvre plans/P<n>/S<k>.md et exécute-le. » — ou, hors Desktop, afficher la commande de lancement
  du bandeau du `S<k>.md` suivant. Jamais dans la même conversation : démarrage froid systématique
  (§5b).
- **Avec la pastille, la ligne « À régler AVANT de lancer »** (`WORKFLOW.md` §3, domicile) : modèle
  et effort de la session suivante, lus dans l'`index.md`. Une pastille démarre sur les réglages
  courants de l'application — sans ce rappel, une session `Sonnet`/`high` part au hasard de ce qui
  était réglé la veille, et personne ne s'en aperçoit avant le résultat.
- **Si cette session était la dernière `[ ]` de sa vague**, poser en plus une pastille de collecte —
  titre `P<n> — collecter la vague <w>`, prompt « Déroule /orchestrer-plan sur la vague <w> du plan
  P<n> : collecte et vague suivante. »

**Ne pas essayer de prévenir l'orchestrateur par message** (`SendMessage` ne résout pas
l'auto-identification d'une session, et un message reste éphémère). La pastille, elle, attend.
