---
name: orchestrer-plan
description: Déroule un plan entier, vague après vague, sans rendre la main entre elles, jusqu'à épuisement, un échec ou une gate humaine déclarée. À dérouler quand `plans/P<n>/index.md` est prêt.
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
- **Ne jamais corriger soi-même, ni relancer une session en échec.** Une session qui échoue rend la
  main ; la seule chose que l'orchestrateur ait le droit de lancer après un `FAIL` est la passe de
  diagnostic optionnelle de l'Étape 5b, qui ne corrige rien non plus.
- **Ne jamais interpréter le rapport d'une session.** Le verdict est extrait par format contraint ou
  schéma, pas relu : un rapport détaillé est une tentation à enquêter plutôt qu'à relayer tel quel.

## Étape 1 — Lire l'index, une fois

Ouvrir `plans/P<n>/index.md` et en extraire, pour **toutes** les vagues : sessions, modèle, effort,
colonne `Env.`, dépendances, zone modifiée, et la ligne d'ordonnancement de chaque vague (dépendances
entre vagues, mot `gate` éventuel). C'est la seule lecture de l'index en entier de toute la session
d'orchestration — les tours suivants n'y retournent que pour cocher un statut.

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
interdit — la vague partage un arbre. Ne jamais recopier le contenu du `S<k>.md` dans le prompt.
Attendre la notification de fin ; ne pas sonder.

**Bloc headless**, uniquement pour les sessions déclarées `Env. = headless` — effort réellement
appliqué, ou vague à lancer sans garder la fenêtre ouverte (`WORKFLOW.md` §5b) :

```bash
claude -p "Ouvre plans/P<n>/S<k>.md et exécute-le. [même consigne d'échec que ci-dessus]" \
  --session-id "$(node -e "console.log(require('crypto').randomUUID())")" \
  --model <modèle index> --effort <effort index> \
  --output-format json \
  --json-schema '{"type":"object","properties":{"verdict":{"type":"string","enum":["PASS","FAIL"]},"motif":{"type":"string"},"rapport":{"type":"string"}},"required":["verdict","motif","rapport"]}' \
  > ".claude/vague/$k.json" 2> ".claude/vague/$k.stderr.log"; echo $? > ".claude/vague/$k.exit"
```

Lancer détaché (arrière-plan du harnais) et sonder `.exit` plutôt qu'un `wait` bloquant : un appel
Bash plafonné tuerait une session longue et produirait un JSON vide.

**Repli pastille**, uniquement hors Claude Code Desktop (aucun navigateur à transmettre, ni pour un
sous-agent ni pour cette conversation) : une pastille `spawn_task` par session, « Démarrer
localement » — jamais le worktree proposé par défaut — puis rendre la main : la vague ne finit plus
dans ce tour.

## Étape 4 — Collecter le verdict de chaque session

**Sous-agent** : lire la ligne `VERDICT: … · MOTIF: … · RAPPORT: …`, rien d'autre.

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

### Échec — finir la vague, arrêter le plan

Un `FAIL` ne tue pas les sous-agents déjà lancés de la vague en cours : ils vont au bout, on ne peut
pas les rappeler et leur travail est déjà commencé. La vague se collecte normalement (Étape 4), puis
**le plan s'arrête** — la vague suivante n'est pas lancée. Le rapport final (Étape 6) distingue les
sessions **bloquées** par l'échec (qui en dépendent, directement ou transitivement, via la colonne
Dépend de) des sessions **encore indépendantes** — pour que l'utilisateur choisisse entre réparer
d'abord ou relancer le reste.

### Gate humaine

Une vague dont la ligne d'ordonnancement de l'index porte le mot **`gate`** arrête l'orchestrateur
**après** l'avoir collectée, même si tout est `PASS` : il rend la main avec l'état et ce qui reste. La
vague suivante ne se lance qu'à une relance explicite de cette skill.

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

## Étape 6 — Rapport final

Une ligne par session lancée (`S<k> · PASS/FAIL · motif`), les deux voies confondues. Signaler tout
écart entre effort demandé et effort réellement appliqué (le sous-agent ne règle pas l'effort, §5b).
Sur `FAIL` : chemin du rapport de passation + `/reprendre-echec`, jamais le contenu ouvert ici ;
`claude --resume <uuid>` en dernier recours seulement. Push groupé une fois le plan fini ou arrêté —
jamais depuis une session, jamais si une vague reste `EN ATTENTE`.
