---
name: orchestrer-plan
description: Déroule un plan entier, vague après vague, sans rendre la main entre elles, jusqu'à épuisement, un échec non repris ou une gate humaine déclarée. À dérouler quand `plans/P<n>/index.md` est prêt.
model: haiku
---

# Orchestrer un plan

L'orchestrateur ne fait que deux choses, en boucle : **lancer des sessions** et **collecter des
verdicts**. Ce qu'il lit en plus, il le retraite à chaque vague jusqu'à la fin du plan — c'est ce qui
fait exploser un contexte d'orchestration. Le jugement vit dans les sessions orchestrées (modèle et
effort viennent de l'index), pas ici.

## Boucle, pas récursion

Lire `index.md` **une fois** (Étape 1), en extraire toutes les vagues déclarées et leurs sessions.
Puis, pour chaque vague dans l'ordre : lancer (Étape 3) → collecter (Étape 4) → cocher les statuts
(Étape 5) → passer à la vague suivante. Les vagues déclarées font foi — leur parallélisabilité encode
un jugement de zones que le cadrage porte (`index.md`), pas cette skill : pas d'ordonnanceur
dynamique qui recalculerait un lot prêt à partir des dépendances.

## Interdits — la raison d'être de cette skill

- **Ne jamais ouvrir un `S<k>.md`.** La session exécutante le lit dans son propre contexte.
  L'`index.md` et `git log` suffisent à l'orchestrateur.
- **Ne jamais lire un diff ni une sortie de build.** Déléguer à `resumeur-git` / `verificateur-n0`,
  qui ne rendent que leur conclusion.
- **Ne jamais corriger soi-même, ni reprendre la conversation d'une session en échec.** Une session
  qui échoue rend la main ; l'orchestrateur ne touche ni au code ni au rapport de passation. Ce
  qu'il a le droit de lancer après un `FAIL` : la **reprise automatique** de l'Étape 5c (une seule,
  à froid, dans une session dédiée qui corrige *chez elle*) et la passe de diagnostic optionnelle
  de l'Étape 5b. Jamais un `SendMessage` ou un `fork` vers l'agent en échec.
- **Ne jamais interpréter le rapport d'une session.** Le verdict est extrait par format contraint ou
  schéma, pas relu : un rapport détaillé est une tentation à enquêter plutôt qu'à relayer tel quel.

## Étape 1 — Lire l'index, une fois

Ouvrir `plans/P<n>/index.md` et en extraire, pour **toutes** les vagues : sessions, modèle, effort,
colonne `Env.`, dépendances, zone modifiée, et la ligne d'ordonnancement de chaque vague (dépendances
entre vagues, mots `gate` et `reprise-manuelle` éventuels). Extraire aussi, dans l'Ordonnancement, le
***Pourquoi maintenant*** de chaque vague et la ligne **« en clair »** de chaque session : c'est la
matière de l'annonce (Étape 3), et la seule explication que l'utilisateur recevra — l'orchestrateur
n'ouvre jamais un `S<k>.md` pour la compléter. C'est la seule lecture de l'index en entier de toute
la session d'orchestration — les tours suivants n'y retournent que pour cocher un statut.

## Étape 2 — Préflight (par vague, avant son lancement)

Dans cet ordre :

1. **Arbre sale** — demander à `resumeur-git` : un fichier non commité qui intersecte une `Zone
   modifiée` de la vague → STOP, ne pas écraser du travail non commité. Sinon, référence :
   `git status --porcelain > .claude/vague/avant-vague.txt`.
2. **Verrou si la vague est parallèle** — zones disjointes seulement ; au moindre doute, séquentiel.
   Poser `.claude/wave.lock` juste avant le premier lancement (jamais avant : un préflight rouge le
   laisserait orphelin) — mécanique complète : `WORKFLOW.md` §4b, ne pas la reformuler ici.
3. **CLI/trust/allowlist — uniquement pour les sessions `Env. = headless` déclarées de cette vague**
   (`WORKFLOW.md` §5b, cas d'exception). Un sous-agent n'a besoin d'aucun de ces trois contrôles : il
   hérite de l'environnement de cette conversation.
   - `command -v claude` sur le PATH, sinon STOP sans poser de verrou ;
   - `.claude/settings.json` porte une `permissions.allow` non vide ;
   - elle est **effective** : `claude -p "Reponds uniquement par OK." --model
     claude-haiku-4-5-20251001 2>&1 | head -2` — une ligne `Ignoring ... not been trusted` → STOP,
     poser `hasTrustDialogAccepted: true` sur cette forme exacte du chemin.

## Étape 3 — Lancer la vague

**Annoncer d'abord, lancer ensuite.** Avant le premier lancement de la vague, écrire dans la
conversation ce qui part — uniquement depuis l'`index.md` déjà lu (Étape 1), **jamais en ouvrant un
`S<k>.md`**. L'utilisateur doit pouvoir suivre une vague **sans ouvrir un seul fichier** : savoir ce
qui va changer, ce qu'il retrouvera commité, et ce qui se passera si une session rate. Format
imposé, une strophe par session :

```
▶ Vague <w>/<W> — <n> session(s) en <parallèle|séquentiel>
   Pourquoi cette vague maintenant : <« Pourquoi maintenant » de l'ordonnancement, tel quel>
   Si une session échoue : <une reprise automatique en <modèle du cran au-dessus>, puis arbitrage
     humain si elle échoue aussi | reprise manuelle — je m'arrête et je te rends la main>
   Fin de vague : <gate — je m'arrête même si tout passe | j'enchaîne sur la vague <w+1>>

   S<k> · <titre>
      En clair : <ligne « en clair » de l'index, relayée mot pour mot>
      Tâches <T<a>-T<b>> · <Modèle>/<effort> · <sous-agent|headless>
      Fichiers touchés : `<zone modifiée>` · Dépend de : <S<j>, déjà passée | —>

   <une strophe par session de la vague, dans l'ordre de l'index>

   Pendant que ça tourne : ne pas modifier les fichiers listés — les sessions y écrivent.
   À la fin : un commit par tâche, retrouvable par son repère `Plan: P<n>/S<k>/T<m>`.
```

**Relayer, jamais reformuler.** La ligne « en clair » et le *Pourquoi maintenant* sont recopiés tels
quels : les récrire, c'est réinterpréter un plan qu'Opus a rédigé pour être lu — et l'orchestrateur
tourne sur Haiku. Le reste de la strophe est de la donnée de table.

**Index sans ligne « en clair »** (plan rédigé avant cette règle) : annoncer la strophe sans elle et
le signaler **une fois** pour la vague — « index antérieur : pas de résumé en clair disponible ».
**Ne jamais ouvrir le `S<k>.md` pour la reconstituer**, ni l'inventer depuis le titre : l'interdit
prime sur le confort de lecture, et un index incomplet se corrige dans l'index, pas au lancement.

Une vague qui s'enchaîne dans le même tour (Étape 5) réécrit ce bloc en entier : c'est le seul
repère de l'utilisateur entre deux vagues, et il ne coûte que des lignes déjà en contexte.

**Repli pastille uniquement** (voir plus bas) : ajouter à l'annonce la consigne `/rename P<n>·S<k>`
— trois sessions ouvertes en parallèle sont indistinguables dans la liste, et le nom suit la session
jusqu'à son `--resume`. Inutile pour un sous-agent ou un `claude -p`, qui n'ont pas de fenêtre.

**Sous-agent, la voie par défaut** (`WORKFLOW.md` §5b) — pour toute session, quel que soit `Env.`,
sauf déclaration explicite `headless` :

```
Agent({
  description: "P<n>/S<k>",
  subagent_type: "claude",
  model: <modèle lu dans l'index>,
  run_in_background: true,
  prompt: "Ouvre plans/P<n>/S<k>.md et exécute-le. Reste dans l'arbre de travail courant : n'ouvre
AUCUN worktree. Déroule /fin-de-tache en fin de session.
En cas d'ÉCHEC, écris d'abord un rapport de passation dans plans/P<n>/S<k>.echec.md
(gabarit : skill /reprendre-echec), puis renvoie son chemin.
Réponse finale en UNE ligne, exactement : VERDICT: PASS|FAIL · MOTIF: <une phrase> · RAPPORT: <chemin, ou ->"
})
```

Un agent par session, dans l'ordre de l'index ; vague parallèle → tous en arrière-plan d'affilée,
vague séquentielle → un seul à la fois, arrêt au premier `FAIL` (Étape 5). `isolation: "worktree"`
interdit — la vague partage un arbre. **`subagent_type: "fork"` interdit** : un fork hérite de toute
la conversation d'orchestration, alors que l'invariant du workflow est qu'un exécutant ne connaisse
que son `S<k>.md`. Ne jamais recopier le contenu du `S<k>.md` dans le prompt.
Attendre la notification de fin ; ne pas sonder.

**Bloc headless**, uniquement pour les sessions déclarées `Env. = headless` — effort réellement
appliqué, ou vague à lancer sans garder la fenêtre ouverte (`WORKFLOW.md` §5b) :

```bash
claude -p "Ouvre plans/P<n>/S<k>.md et exécute-le. [même consigne d'échec que ci-dessus]" \
  --session-id "$(node -e "console.log(require('crypto').randomUUID())")" \
  --model <modèle index> --effort <effort index> \
  --settings '{"outputStyle":"Concise"}' \
  --output-format json \
  --json-schema '{"type":"object","properties":{"verdict":{"type":"string","enum":["PASS","FAIL"]},"motif":{"type":"string"},"rapport":{"type":"string"}},"required":["verdict","motif","rapport"]}' \
  > ".claude/vague/$k.json" 2> ".claude/vague/$k.stderr.log"; echo $? > ".claude/vague/$k.exit"
```

Lancer détaché (arrière-plan du harnais) et sonder `.exit` plutôt qu'un `wait` bloquant : un appel
Bash plafonné tuerait une session longue et produirait un JSON vide. Le `--settings` neutralise
l'`outputStyle` de l'utilisateur pour ce processus : un exécutant headless n'a pas de lecteur, ses
explications ne seraient que des tokens de sortie. `Concise` plutôt que `Default` — style intégré
depuis v2.1.237, qui attaque par le résultat et supprime préambule et narration sans toucher au
travail. Sur une version antérieure le nom serait inconnu et le réglage silencieusement sans effet :
repasser à `Default` en cas de doute. Un sous-agent n'en a pas besoin — un style ne
s'applique jamais à un sous-agent, qui a son propre prompt système.

**Repli pastille**, uniquement hors Claude Code Desktop (aucun navigateur à transmettre, ni pour un
sous-agent ni pour cette conversation) : une pastille `spawn_task` par session, « Démarrer
localement » — jamais le worktree proposé par défaut — puis rendre la main : la vague ne finit plus
dans ce tour. C'est un humain qui lance : titrer la pastille `P<n> · S<k> — <titre> · <M>/<E>` et
sortir la ligne « À régler AVANT de lancer » de chaque session (`WORKFLOW.md` §3) — la pastille
hérite des réglages courants, elle ne pose ni le modèle ni l'effort du plan.

## Étape 4 — Collecter le verdict de chaque session

**Sous-agent** : lire la ligne `VERDICT: … · MOTIF: … · RAPPORT: …`, rien d'autre.

**Un retour marqué `partial` n'est jamais un `PASS`.** Depuis 2.1.246, un sous-agent qui épuise son
`maxTurns` rend ce qu'il a en le marquant partiel, au lieu d'avoir l'air d'avoir fini — c'est
exactement le faux vert que le recoupement par les commits existe pour attraper, et il vaut mieux le
lire directement. Le traiter comme un `FAIL`, motif « tours épuisés », et **ne pas le reprendre par
`SendMessage`** : continuer l'agent rapatrierait ses fausses pistes, alors que la réparation passe
par le rapport de passation et un démarrage à froid (`/reprendre-echec`).

**Headless** : lecteur réduit à l'extraction, ~30 lignes — les commits jugent déjà (§4b), donc plus
de verdict `PANNE` élaboré, plus de fail-closed à trois branches :

```bash
lire() { node -e "
  const fs=require('fs');
  const [fj,fe]=process.argv.slice(1);
  let s={};
  try{ s=(JSON.parse(fs.readFileSync(fj,'utf8')).structured_output)??{}; }catch(e){}
  const complet = typeof s.verdict==='string' && typeof s.motif==='string' && typeof s.rapport==='string';
  const l = t => String(t??'').replace(/[\r\n]+/g,' ').trim();
  console.log(complet && s.verdict==='PASS' ? 'PASS' : 'FAIL');
  console.log(complet ? l(s.motif) : 'motif absent');
  console.log(complet ? l(s.rapport) : '');
" "$1" "$2"; }
{ read -r verdict; read -r motif; read -r rapport; } < <(lire ".claude/vague/$k.json" ".claude/vague/$k.exit")
```

Passer des **chemins** en argument, jamais du contenu (dépassement de taille) ; lire les trois champs
avec `read -r` un par un, jamais un split sur tabulation (IFS l'effondre si deux se suivent).

**Dans les deux voies : recoupement obligatoire par les commits avant de conclure `FAIL`** (§4b) —
`git log --oneline --grep "P<n>/S<k>/"` par tâche listée dans l'index. Toutes les tâches ont leur
commit → `PASS`, motif « verdict perdu en route ». Aucun commit → `FAIL` inchangé. Un `FAIL` rendu par
un JSON ou une ligne **lisible** ne se recoupe pas : la session a parlé.

Si l'enveloppe JSON porte `permission_denials`, le lister dans le rapport final avec la remédiation
(compléter `permissions.allow`, après la vague).

## Étape 5 — Statuts, puis vague suivante ou arrêt

**Vague verrouillée — l'ordre n'est pas négociable.** Sous verrou, aucune session n'a commité : c'est
à l'orchestrateur de le faire, et le hook `pretooluse-git` refuse tout commit tant que le marqueur
existe. Donc, dans cet ordre :

1. **Retirer `.claude/wave.lock`** — la vague est collectée, le verrou n'a plus d'objet.
2. **Committer pour les sessions**, tâche par tâche, staging explicite des seuls fichiers de chaque
   tâche, message et repère `Plan: P<n>/S<k>/T<m>` pris dans le `S<k>.md` (`WORKFLOW.md` §4b). Le
   bilan de session se joint au commit de la dernière tâche de sa session.
3. **Cocher `[x]`** dans `index.md`, date à l'appui, les sessions `PASS`.

Faire l'inverse (committer avant de retirer le verrou) échoue systématiquement : le hook évalue la
commande **avant** exécution, donc un `rm wave.lock && git commit` dans le même appel est refusé lui
aussi — il faut deux appels distincts.

**Vague non verrouillée** → chaque session a commité et coché la sienne (`WORKFLOW.md` §4a) : relire
l'index, ne rien réécrire.

### Revues de session — relayer, sans ouvrir

Une fois la vague collectée, lister les `plans/P<n>/S<k>.revue.md` déposés par ses sessions
(`/fin-de-tache`, relecture qualité — fichiers non commités, c'est normal). Pour chacun dont la
première ligne `Bloquant : <n>` porte n > 0 : **une ligne** dans le bloc de fin de vague et le
rapport final — `Revue S<k> : <n> bloquant(s) → plans/P<n>/S<k>.revue.md` — rien de plus. Ne
jamais ouvrir les trouvailles (relayer, jamais reformuler) ; **non bloquant** : la vague suivante
s'enchaîne, l'arbitrage appartient à l'humain, le versement dans `TASKS.md` au tri de clôture
(`/fin-de-tache` point 16). Un bloquant qui invalide une hypothèse du plan suit le chemin déjà
écrit : extension (`/nouveau-plan` Étape 0), sur décision humaine.

**Une revue absente se relaie comme un manque, pas comme un silence.** Le dépôt est inconditionnel
(`Bloquant : 0` quand il n'y a rien à dire) : un `.revue.md` manquant veut donc dire que la revue
n'a pas tourné, jamais qu'elle n'a rien trouvé. Pour chaque session de la vague dont la colonne
« Zone modifiée » de l'`index.md` n'est pas `aucune`, qui n'a pas de `.echec.md`, et dont le
`.revue.md` manque : une ligne `Revue S<k> : absente` — au même endroit que les autres, **non
bloquante** elle aussi. C'est le seul signal qui rende visible une panne du canal de revue ; sans
lui, un plan entier peut se clore sans qu'aucune relecture n'ait été déposée, sans que personne ne
s'en aperçoive.

### Échec — finir la vague, puis une reprise automatique

Un `FAIL` ne tue pas les sous-agents déjà lancés de la vague en cours : ils vont au bout, on ne peut
pas les rappeler et leur travail est déjà commencé. La vague se collecte et se clôt normalement
(Étapes 4 et 5 — verrou retiré, commits des `PASS` faits), puis chaque session `FAIL` a droit à
**une reprise automatique** (Étape 5c) — sauf si la ligne d'ordonnancement de la vague porte le mot
**`reprise-manuelle`**, auquel cas le plan s'arrête directement, comportement historique.

**Le plan ne s'arrête que si une reprise rend autre chose que `PASS`** (ou en `reprise-manuelle`).
Le rapport final (Étape 6) distingue alors les sessions **bloquées** par l'échec (qui en dépendent,
directement ou transitivement, via la colonne Dépend de) des sessions **encore indépendantes** —
pour que l'utilisateur choisisse entre réparer d'abord ou relancer le reste.

### Gate humaine

Une vague dont la ligne d'ordonnancement de l'index porte le mot **`gate`** arrête l'orchestrateur
**après** l'avoir collectée — reprise automatique (Étape 5c) comprise —, même si tout est `PASS` :
il rend la main avec l'état et ce qui reste. La vague suivante ne se lance qu'à une relance
explicite de cette skill.

**Sinon** : dépendances de la vague suivante satisfaites (toutes `[x]`) → l'enchaîner dans le même
tour, retour à l'Étape 2. Plan épuisé (dernière vague collectée) → Étape 6 puis fin.

## Étape 5b — Diagnostic escaladé (optionnel, à la demande)

Désactivé par défaut ; utile pour une vague headless lancée sans surveillance. N'enrichit que le
rapport de passation, ne corrige rien, ne relance rien. Escalade d'un cran au-dessus du modèle en
échec (Haiku→Sonnet, Sonnet→Opus, Opus→Fable en le signalant, Fable→rien) :

```bash
claude -p "Lis plans/P<n>/S<k>.echec.md et la tâche visée. NE CORRIGE RIEN. Approfondis le
diagnostic et réécris le rapport au même format. Seul fichier autorisé en écriture :
plans/P<n>/S<k>.echec.md" --model <cran au-dessus> --effort high --disallowed-tools Edit
```

`--disallowed-tools Edit` n'est pas une preuve : diffs `avant`/`après` (`git status --porcelain`) à
comparer — tout écart hors `S<k>.echec.md` → arrêter et signaler.

## Étape 5c — Reprise automatique (une par session, à froid)

Activée par défaut ; opt-out par le mot `reprise-manuelle` sur la ligne d'ordonnancement de la
vague. Elle ne change rien aux invariants : l'orchestrateur lance et collecte, la correction vit
dans la session de reprise — qui ne connaît que le rapport de passation, jamais cette conversation.

**Quand** : après la clôture de la vague (Étape 5 — verrou retiré, arbre propre), avant la vague
suivante. Une reprise à la fois, dans l'ordre de l'index, **jamais en parallèle** — l'arbre est
partagé et la vague est déjà close. Rapport `S<k>.echec.md` absent (session tuée avant de
l'écrire) : lancer quand même, `/reprendre-echec` couvre ce cas.

**Modèle** : un cran au-dessus du modèle de l'index, plancher Sonnet (Haiku→Sonnet, Sonnet→Opus,
Opus→Fable en le signalant). Session Fable en échec → pas de reprise auto, `ARBITRAGE` direct :
il n'y a pas de cran au-dessus.

```
Agent({
  description: "P<n>/S<k> reprise",
  subagent_type: "claude",
  model: <cran au-dessus, plancher Sonnet>,
  run_in_background: true,
  prompt: "Déroule la skill /reprendre-echec pour plans/P<n>/S<k>.echec.md (session S<k> du plan
P<n>). Mode orchestré. Reste dans l'arbre de travail courant : n'ouvre AUCUN worktree.
Réponse finale en UNE ligne, exactement : VERDICT: PASS|FAIL|ARBITRAGE · MOTIF: <une phrase> · RAPPORT: <chemin, ou ->"
})
```

`fork` interdit, `SendMessage` vers l'agent en échec interdit — le démarrage à froid est le point
de la reprise. Ne jamais recopier le contenu du `.echec.md` dans le prompt, ne jamais l'ouvrir ici.

**Collecte** : mêmes règles que l'Étape 4 — ligne de verdict seule, `partial` = `FAIL`, recoupement
par les commits avant de conclure `FAIL`. Trois issues :

- **`PASS`** — la reprise a elle-même commité, supprimé le `.echec.md` et coché `[x]`
  (`/reprendre-echec` Étape 5) : vérifier la coche dans l'index, puis reprendre le plan là où il
  s'était arrêté — les sessions **jamais lancées** de la même vague d'abord (vague séquentielle
  arrêtée au `FAIL`, retour Étape 3), sinon la vague suivante (Étape 5, cas « Sinon » — la gate
  d'une vague `gate` s'applique toujours).
- **`FAIL`** — deuxième échec consécutif sur la même session : **jamais de seconde reprise auto**,
  arrêt du plan, arbitrage humain. Le `.echec.md` mis à jour (section « Déjà écarté » enrichie) est
  le point de départ de l'humain.
- **`ARBITRAGE`** — une gate de `/reprendre-echec` demande une décision humaine avant toute
  correction (annulation destructive, prémisse de plan fausse → `/nouveau-plan` en extension,
  hypothèse épuisée) : arrêt du plan, motif relayé tel quel, sans l'interpréter.

Plusieurs `FAIL` dans la même vague : reprises une par une ; la première qui rend autre chose que
`PASS` arrête le plan, les reprises restantes ne se lancent pas (leurs sessions restent `FAIL` au
rapport, avec leur `.echec.md` intact).

## Étape 6 — Rapport final

Une ligne par session lancée (`S<k> · PASS/FAIL · motif`), les deux voies confondues ; une session
reprise porte les deux verdicts (`S<k> · FAIL → reprise PASS/FAIL/ARBITRAGE · motif`). Signaler tout
écart entre effort demandé et effort réellement appliqué (le sous-agent ne règle pas l'effort, §5b).
Une ligne par revue à bloquants — **et par revue absente** — non encore relayée (Étape 5,
« Revues de session »).

**Écrit pour qui n'a pas suivi la vague.** Sur `PASS`, le titre suffit — le travail est commité, il
se relit. C'est sur `FAIL` et `ARBITRAGE` que l'utilisateur a besoin de comprendre : ajouter, en
français et sans jargon, **ce que ça l'empêche de faire** — quelles sessions restantes sont bloquées
(colonne Dépend de) et lesquelles restent lançables. Le motif technique reste relayé tel quel à
côté, jamais traduit : c'est une citation de la session, pas une interprétation de l'orchestrateur.
Sur `FAIL` ou `ARBITRAGE` non résolu : chemin du rapport de passation + `/reprendre-echec`, jamais
le contenu ouvert ici ;
`claude --resume <uuid>` en dernier recours seulement. Push groupé une fois le plan fini ou arrêté —
jamais depuis une session, jamais si une vague reste `EN ATTENTE`.

**Ce qui reste à lancer à la main** — sessions restantes après une gate, un `FAIL` ou un repli
pastille : une ligne « À régler AVANT de lancer » par session prête (`WORKFLOW.md` §3), modèle et
effort pris dans l'index. Une relance de cette skill ne dispense pas du rappel : son frontmatter
fixe son propre modèle, pas l'effort de la conversation qui l'accueille.
