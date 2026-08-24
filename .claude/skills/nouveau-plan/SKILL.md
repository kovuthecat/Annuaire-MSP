---
name: nouveau-plan
description: Découper un chantier en sessions et générer le dossier plans/P<n>/ (index d'orchestration + un fichier par session). À dérouler par Opus quand une tâche demande plusieurs sessions. Contient la checklist d'investigation, les règles de découpage en sessions et les squelettes index.md / S<k>.md.
model: opus
---

# Découper un plan en sessions

Le frontmatter bascule sur Opus pour ce tour. **Ça ne couvre que l'investigation** (Étape 1,
avant le Plan Mode) : une fois le plan approuvé par l'utilisateur, l'écriture (Phase suivante)
reprend dans un nouveau tour, sur le modèle actif de la session — sans gravité, c'est mécanique.
Sortie = un dossier `plans/P<n>/`. Les squelettes vivent ici (et non dans `WORKFLOW.md`) : ils ne
coûtent des tokens qu'au découpage.

**Le QUOI et le POURQUOI doivent déjà être tranchés.** Si le scope est flou ou l'approche non
décidée, ce n'est pas ce plan qu'il faut écrire : dérouler `/cadrer` d'abord, dans une session
séparée, et repartir de la décision écrite qu'elle produit.

## Étape 1 — Investiguer (jamais modifier)

Se mettre en **Plan Mode** pour toute la phase d'investigation — ce mode interdit l'écriture de
fichiers, donc la consigne « jamais modifier » devient structurelle plutôt que déclarative.

1. **Flux** : chemin complet du problème/feature, où il commence et se termine.
2. **Fichiers probables** sans tout ouvrir : `PROJECT_MAP.md`, `ARCHITECTURE.md`, registre `DECISIONS.md` d'abord.
3. **Rôle** de chaque fichier clé : pourquoi il est pertinent.
4. **Dépendances directes** utiles.
5. **1-2 hypothèses racines** (bug : ce qui peut mal tourner ; feature : choix archi critiques).
6. **Verdict** : plan rédigeable maintenant, ou ambiguïté à lever avec l'utilisateur d'abord ?

**Déléguer** dès que les points 2-3 demandent de balayer le repo ou l'historique : exploration de
fichiers → agent `explorateur` ; résumé de diff/historique git → agent `resumeur-git`. Chacun ne
rend que sa conclusion, l'exploration ne pollue pas le contexte Opus (qui est le plus cher). Garder
pour soi les points 1, 5 et 6 — c'est le raisonnement, pas la recherche.

## Étape 2 — Découper en sessions (règle de coût)

Un démarrage froid a un prix fixe (prompt système + `CLAUDE.md` + lectures) ; enchaîner dans une
même session fait re-payer le contexte accumulé à chaque tour. Le découpage arbitre entre les deux.

**Regrouper** plusieurs tâches dans une même session si TOUT est vrai :

- même modèle **et** même effort ;
- tâches courtes (`low`) **ou** lectures/fichiers largement partagés ;
- aucune validation humaine requise entre elles ;
- le lot reste raisonnable (~3-5 tâches courtes, ou 2 moyennes liées).

**Séparer** dès qu'un critère tombe, et notamment : toute tâche `high`/`xhigh` est **seule dans sa
session** · changement de modèle ou d'effort · gate humaine entre deux tâches · la séparation
**débloque une parallélisation**.

Deux sessions sont **parallélisables** ssi aucune dépendance **et** zones modifiées disjointes
(fichiers de « Modifier »). La colonne « Zone modifiée » sert à ce contrôle : y mettre les
répertoires/fichiers réellement touchés, pas des généralités.

**Une session dont la zone est « aucune » demande un soin particulier.** Vérification, mesure, audit :
son livrable est une **conclusion**, pas un diff. Écrire alors dans le `S<k>.md` ce que le bilan devra
contenir — le corpus exact, le critère, le résultat attendu — parce que c'est la seule chose qui
restera. Sans ça, la session rend « ça marche » dans une conversation qui disparaît, et le plan ne
peut plus la distinguer d'une session jamais lancée (constaté sur MYO P1/S5, 2026-08-24).

Modèle et effort : grille dans `.claude/workflow/WORKFLOW.md` §2-3.

## Étape 3 — Écrire `plans/P<n>/index.md`

**Le statut des tâches vit ICI et nulle part ailleurs** (source unique — cf. `WORKFLOW.md` §4a).

```md
# Plan P<n> — <titre du plan>   (rédigé par Opus)

## Objectif d'ensemble
<2-3 lignes : le but global du plan>

## Sessions
| Session | Tâches | Titre | Modèle | Effort | Env. | Dépend de | Zone modifiée | Statut |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| [S1](S1.md) | T1-T3 | … | Haiku | low | — | — | `css/`, `index.html` | [ ] |
| [S2](S2.md) | T5 | … | Sonnet | high | Desktop | S1 | `js/edit/` | [ ] |

## Ordonnancement
- **Vague 1 — parallélisable** : S1 · S3 (zones disjointes, aucune dépendance).
- **Vague 2** : S2 (après S1) · S4 (après S3).
- **Vague 3 — clôture** : contexte (`STATUS.md`, `TASKS.md`, `VALIDATION.md`) et push. Pas de
  commits de code à rattraper : chaque session a commité les siens.
```

**Vagues orchestrées (optionnel)** — toute vague s'exécute via `/executer-vague`, orchestrateur
Haiku `low` qui ne conserve que les verdicts. La colonne `Env.` décide de la **voie**, pas du droit
d'orchestrer :

- sessions `—` → voie **headless**, un processus `claude -p` chacune, verdicts par schéma, arrêt au
  premier FAIL. Prérequis impératif : une allowlist `permissions.allow` dans `.claude/settings.json`
  (pas d'humain disponible pour confirmer un outil en headless) ;
- sessions `Desktop` → voie **pastilles** `spawn_task`, un clic = une session neuve, verdict lu dans
  la colonne Statut. Se lance depuis Claude Code Desktop uniquement.

**Ce que le découpage doit peser** : une vague mixte est valide, mais elle ne se termine pas d'un
bloc — la voie headless finit dans le tour, la voie Desktop attend des clics. Grouper les sessions
`Desktop` entre elles quand le graphe de dépendances le permet donne des vagues qui se closent
franchement ; les mélanger est un choix, pas un accident à éviter.

Colonne **Env.** : `Desktop` si la session exige la validation visuelle N1 (navigateur in-app),
`—` sinon. Une session `Desktop` se lance **depuis Claude Code Desktop uniquement** — ni VSCode, ni
terminal, ni cloud/mobile n'ont le navigateur in-app (cf. `/verif-visuelle`). Une session `—` se
lance de partout, cloud compris.

L'index ne contient **rien d'autre** : pas de détail d'exécution, il pointe vers les sessions.

## Étape 4 — Écrire un `plans/P<n>/S<k>.md` par session

```md
# P<n> · S<k> — <titre>   (rédigé par Opus)

> **Modèle : <Sonnet/Haiku/Codex> · effort : <low|medium|high|xhigh> · Vague : <v> (parallèle : oui/non)**
> **Environnement : <Desktop (navigateur in-app requis) | indifférent>**
> **Lancement : `claude --model <modèle>` · effort : /effort si ≠ défaut · autonome : /goal « toutes les tâches de ce fichier faites, N0 vert »**
> Exécutant : UNIQUEMENT les tâches ci-dessous, dans l'ordre ; fichiers sous « Lire » / « Modifier ».
> Design fixé — ne reconçois pas. Doute ou blocage → STOP, signale, rends la main.

- Date : YYYY-MM-DD · Branche : <ou —>

## Lire (commun à la session)
<fichiers + portée précise (section / fonction / lignes) — RIEN d'autre>

## Hors périmètre
<ce qu'il ne faut PAS toucher / faire — vaut pour toute la session>

---

## T<n> — <titre>

### Objectif
<1-2 lignes : le quoi>

### Décision clé
<ce qu'il faut savoir sans relire le repo ; pointer une décision précise, ex. « docs/decisions/2026-07-12-auth.md »>

### Lire / Modifier
<en plus du commun : lectures spécifiques ; fichiers à modifier/créer — liste exhaustive>

### Étapes
1. …

### Validation
- **N0 auto (bloque le commit)** : `<commande>` → <résultat attendu>
- **Tests** : <créés/mis à jour : fichiers, cas couverts> — ou « — » justifié en 1 ligne
- **N1 visuel auto** : <écran/parcours à vérifier au navigateur in-app, ou `—`> → `/verif-visuelle`
- **N2 humain (jugement esthétique/UX)** : <checklist ou `—`> → à consigner dans `VALIDATION.md`

### Si bloqué
<condition d'arrêt SPÉCIFIQUE → STOP + quoi signaler>

### Message de commit (appliqué par la session elle-même)
`<type(scope): message>`
Dernière ligne du commit, obligatoire : `Plan: P<n>/S<k>/T<m>` — c'est le repère qui rend la tâche
retrouvable ensuite (`git log --grep`), et par lequel l'orchestrateur lit le verdict d'une session
Desktop.

---

<répéter le bloc T<n> pour chaque tâche de la session>

## Fin de session
Dérouler `/fin-de-tache` (mode selon « parallèle : oui/non » du bandeau).
```

**Pas de bloc « Statut » dans le `S<k>.md`** : il vit dans l'`index.md`. Une information de suivi
écrite à deux endroits finit toujours par diverger.

Principes :

- **Le bandeau est auto-suffisant** : modèle, effort, environnement, mode parallèle — jamais besoin
  de retourner à l'index pour lancer la session.
- **« Lire » est restrictif et porté** : que ces fichiers, à la section/fonction près.
- **« Étapes » = le comment**, ordonné. Plus le modèle est faible, plus elles sont fines ; si une
  tâche demande trop de jugement pour le modèle visé → la **découper**.
- **« Validation » = critères vérifiables** (commande + résultat, ou écran + attendu), jamais « ça marche ».
- **N1 ≠ N2** : ce qu'un navigateur peut constater (erreur console, texte absent, 404, débordement)
  est N1 et ne va **jamais** dans `VALIDATION.md`. N2 = uniquement le jugement humain.

## Étape 5 — Reporter dans `TASKS.md`

Une ligne par tâche du plan, statut remplacé par le renvoi : `- T-012 — <titre> · → plans/P2/S1.md`.
Le suivi d'avancement se lit dans l'`index.md`.
