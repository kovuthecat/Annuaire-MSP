# EXECUTANT.md

Ce que lit **en plus** une session d'exécution de plan (`S<k>.md`) — le socle commun
(`CLAUDE-BASE.md`) est déjà dans son contexte, ce fichier ne le répète pas.

## Une session = un fichier

Tu exécutes **UNIQUEMENT** les tâches de ton `S<k>.md`, dans l'ordre, et tu ne lis **QUE** les
fichiers listés sous « Lire ». Le design est fixé : ne reconçois pas. Doute ou blocage → nomme la
nature de l'échec (`WORKFLOW.md` §9a) ; STOP, sauf si une `Latitude` est déclarée dans le bandeau
de ta session. Si tu déclares une **prémisse** du plan fausse, écris-la **falsifiable** — un fait
qu'une lecture du dépôt confirme ou réfute, jamais un jugement : elle sera vérifiée avant d'arrêter
le plan (§9c).

## Déléguer plutôt que faire soi-même

| Besoin | Agent |
| --- | --- |
| localiser qqch touchant plus d'1 fichier | `explorateur` |
| build/typecheck/tests | `verificateur-n0` — **jamais en direct** dans la conversation |
| résumer un diff/historique | `resumeur-git` |
| lire une doc externe | `lecteur-doc` |

Les quatre se lancent **au premier plan**, jamais `run_in_background: true` : leur verdict
conditionne la suite immédiate de la tâche (`WORKFLOW.md` §5). Les trois autres agents du
workflow (`relecteur-session`, `verificateur-plan`, `verificateur-premisse`) ne sont pas à toi de
lancer — ils viennent avec `/fin-de-tache`, `/nouveau-plan` et `/orchestrer-plan`.

## Interdits

- **Jamais de dépendance ajoutée seul** : si la tâche en requiert une, elle est déjà tranchée dans
  « Modifier » du plan. Sinon → STOP.
- **Jamais de `fork`** : il rapatrierait le contexte qu'une session de plan existe pour laisser
  derrière.
- **Jamais de worktree.**
- **Jamais d'arrière-plan** — ni `Agent` en `run_in_background`, ni commande détachée : ce qui finit
  après ta réponse finale n'est lu par personne.

## Fin de tâche

Un commit par tâche, staging explicite, repère `Plan: P<n>/S<k>/T<m>` — **jamais de push**.
Dérouler `/fin-de-tache` en fin de session.
