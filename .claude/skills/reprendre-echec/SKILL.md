---
name: reprendre-echec
description: Reprendre une session de plan qui a échoué, à partir de son rapport de passation — lecture du rapport, vérification de l'état laissé derrière, diagnostic, correction, puis relance de la validation N0. À dérouler après un FAIL remonté par `/executer-vague`, ou après une session lancée à la main qui s'est arrêtée sans finir sa tâche. Porte aussi le gabarit du rapport de passation que toute session en échec doit écrire.
model: sonnet
---

# Reprendre une session en échec

Une session qui échoue rend la main sans corriger (`/executer-vague`, Interdits). Cette skill est
ce qui vient après : elle transforme un rapport de passation en correction validée.

**Démarrage à froid, toujours.** Ne jamais reprendre la conversation de la session en échec pour
la réparer : elle traîne toutes ses fausses pistes, et c'est justement ce que le rapport de
passation existe pour éviter (`WORKFLOW.md` §5b). Le rapport est la seule entrée normale.
`claude --resume <uuid>` (identifiant dans `.claude/vague/S<k>.session`) reste un **recours**, à
n'ouvrir que si le rapport s'avère insuffisant — et à refermer sans y corriger quoi que ce soit.

---

## Gabarit — le rapport de passation

> Cette section est la référence citée par `/executer-vague` Étape 4. Une session qui échoue écrit
> ce fichier dans `plans/P<n>/S<k>.echec.md` **avant** de renvoyer son verdict.

Il est écrit pour quelqu'un qui n'a rien vu de la session. Il ne raconte pas ce qui s'est passé :
il donne ce qu'il faut pour reprendre. **Plafond : 40 lignes** — au-delà, c'est un journal, et un
journal se relit intégralement à chaque tentative.

```md
# S<k> — échec du YYYY-MM-DD

## Tâche visée
<la tâche T<n>, en une ligne — pas le S<k>.md recopié>

## Où ça a cassé
<commande ou étape exacte, message d'erreur en 3 lignes maximum>

## État laissé derrière
- Fichiers modifiés non commités : <liste, ou « aucun »>
- Migration/build/artefact à demi fait : <oui, quoi — ou « non »>
- **Faut-il annuler quelque chose avant de reprendre ?** <oui/non, quoi>

## Déjà écarté
<les pistes explorées et invalidées, une ligne chacune, AVEC la raison.
 C'est la section qui a le plus de valeur : elle évite de refaire le chemin.>

## Hypothèse en cours
<la cause la plus probable au moment de l'arrêt, et ce qui la confirmerait>
```

La section **Déjà écarté** est la raison d'être du rapport. Un verdict d'une ligne fait recommencer
l'enquête à zéro ; ces lignes-là sont ce qu'on a payé pour apprendre.

---

## Étape 1 — Lire le rapport, et seulement lui

Ouvrir `plans/P<n>/S<k>.echec.md`, puis le `S<k>.md` de la session **uniquement pour la tâche
concernée** (pas les autres tâches du fichier). Rien d'autre : ni l'`index.md` du plan, ni le code,
ni l'historique. Ce qui manque se délègue (`explorateur`, `resumeur-git`), on ne le lit pas ici.

Rapport absent ou vide (session tuée avant de l'écrire) → le dire, et repartir de la tâche du
`S<k>.md` comme si elle n'avait jamais été lancée, après avoir fait l'Étape 2 avec d'autant plus
de soin : c'est le cas où l'état laissé derrière est le moins connu.

## Étape 2 — Vérifier l'état réel avant de toucher à quoi que ce soit

Le rapport dit ce que la session **croyait** avoir laissé. Le constater :

- `git status` — l'arbre correspond-il à la section « État laissé derrière » ?
- Un écart entre les deux est en soi un signal : la session s'est arrêtée plus tôt ou plus tard
  qu'elle ne le pense.
- Si le rapport signale quelque chose à annuler, le faire **maintenant**, avant tout diagnostic.
- `.claude/wave.lock` présent → la vague n'est pas close ; ne pas la clore ici, c'est le rôle de
  `/fin-de-tache`.

**Gate** : si l'état à annuler dépasse un `git checkout` d'un fichier (migration jouée, données
écrites, artefact publié), **s'arrêter et rendre la main** — une annulation destructive se décide,
elle ne s'improvise pas dans une reprise.

## Étape 3 — Diagnostiquer sans refaire le chemin

Partir de **Hypothèse en cours**, et traiter **Déjà écarté** comme acquis : ne pas réexplorer une
piste invalidée sans une raison explicite de douter de son invalidation. Le dire si on en a une.

Si l'hypothèse tombe et qu'aucune autre ne se présente en une passe : ne pas s'entêter. Écrire un
rapport de passation **mis à jour** (même gabarit, section « Déjà écarté » enrichie de ce qui vient
d'être invalidé) et rendre la main. Deux tentatives sur la même hypothèse coûtent plus qu'un
cadrage (`/cadrer`).

## Étape 4 — Corriger, puis prouver

1. Corriger — périmètre de la tâche d'origine, rien de plus. Une correction qui déborde est une
   nouvelle tâche : la noter dans `TASKS.md`, ne pas la faire ici.
2. **N0** : `build` + `typecheck` (+ tests du périmètre) via `verificateur-n0`. Sans N0 vert, la
   session est toujours en échec — on ne remonte pas un PASS sur une intuition.
3. La tâche touchait l'UI → `/verif-visuelle` pour le N1.

## Étape 5 — Clore l'échec

1. **Supprimer `plans/P<n>/S<k>.echec.md`** : le problème est résolu, le rapport devient faux. Git
   garde la trace (`STATUS.md` §Ce qui casse ne porte que l'actuel).
2. Passer la session à `[x]` dans l'`index.md` du plan, avec la date — statut à un seul endroit
   (`WORKFLOW.md` §4a).
3. Dérouler `/fin-de-tache` pour la suite (contexte, N2, enchaînement).

Échec **non** résolu → laisser le `.echec.md` à jour en place, la session non cochée, et dire
explicitement ce qui bloque. Un échec mal fermé se repaie au plan suivant.
