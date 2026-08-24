---
name: choisir-mecanisme
description: Choisir le bon mécanisme Claude Code (règle, rule scopée, skill, hook, subagent, MCP, plugin, /goal, scheduling) et auditer la config .claude/ d'un projet. À dérouler quand on hésite entre plusieurs mécanismes, avant de créer de l'infrastructure custom, ou pour un audit périodique de workflow.
---

# Choisir le bon mécanisme Claude Code

Cette skill ne décrit AUCUNE fonctionnalité en détail (ça se périme vite). Pour une question
pointue et à jour → agent `claude-code-guide`. Pour l'intégralité du rapport source →
`docs/references/claude-code-capabilities-2026-08.md` (archive figée).

## Arbre de choix

```text
Déterministe (code/script peut le garantir) ?
  → OUI : code / script / test / validateur
  → NON ↓
Connaissance permanente du projet ou d'un scope de fichiers ?
  → OUI, globale : CLAUDE.md   |   OUI, scopée à un chemin : .claude/rules/
  → NON ↓
Procédure réutilisable, multi-étapes, appelée plus d'une fois ?
  → OUI : Skill
  → NON ↓
Doit se déclencher à CHAQUE occurrence d'un événement, sans dépendre d'y penser ?
  → OUI : Hook
  → NON ↓
Exploration/recherche isolée dont la sortie brute polluerait le contexte principal ?
  → OUI : Subagent
  → NON ↓
Intégration avec un service externe structuré (API, données, outils tiers) ?
  → OUI : MCP   (si une simple CLI/API suffit, ne pas passer par MCP — cf. Critères rapides)
  → NON ↓
Endpoint ou critère de complétion vérifiable automatiquement (tests passent, build OK, N items validés) ?
  → OUI : /goal
  → NON ↓
Répétition/surveillance strictement temporaire, utile seulement pour la session en cours ?
  → OUI : /loop ou tâche planifiée ponctuelle
  → NON ↓
Automatisation durable, récurrente, doit survivre à la session ?
  → OUI : Routine / cron
```

Cas annexes non couverts par l'arbre linéaire :

```text
Changements concurrents indépendants        → worktrees / sessions parallèles
Workers qui doivent coordonner entre eux    → Agent Team
Orchestration à grande échelle              → Dynamic Workflow
Restriction d'outils / machine              → permissions + sandbox
Composants React à synchroniser à une maquette → /design-sync
```

## Hiérarchie de complexité

Du plus simple au plus lourd — toujours choisir le mécanisme LE PLUS SIMPLE qui résout le
problème de façon fiable, jamais le plus impressionnant :

```text
1. Code déterministe existant
2. Petit script déterministe
3. Test / validateur
4. CLAUDE.md / rule scopée
5. Hook
6. Skill
7. Agent Claude Code principal (faire soi-même)
8. Un subagent
9. Plusieurs subagents
10. Parallélisme par worktree
11. Agent Team
12. Dynamic Workflow / Ultracode
```

## Critères rapides

**Créer une skill PROJET quand** : la procédure a plusieurs étapes · elle sera répétée au moins
2 fois · elle est spécifique à ce projet (sinon candidate à une skill globale) · **coût** : chaque
skill installée paie sa description à CHAQUE session, même non utilisée — ne pas en créer « au cas où ».

**Hook plutôt qu'instruction écrite quand** : l'événement doit être GARANTI à chaque occurrence,
pas seulement probable · une instruction en prose du type « toujours / ne jamais » a déjà été
oubliée une fois · le déclencheur est mécanique (avant commit, après édition d'un type de fichier).

**Agent plutôt que le faire soi-même quand** : la tâche est mécanique et répétitive · sa sortie
brute (logs, recherche large, lecture de code volumineuse) polluerait le contexte principal sans
valeur ajoutée à y garder · le résultat attendu est un résumé court, pas le détail brut.

**NE PAS utiliser de MCP quand** : une simple CLI ou un appel API direct suffit · l'intégration est
utilisée une seule fois · le service n'a pas besoin d'état ou de contexte structuré entre appels ·
un wrapper MCP ajouterait de la complexité sans bénéfice récurrent.

## Audit express d'un projet

1. Inventaire de `.claude/` : `rules/`, `skills/`, `agents/`, hooks, settings, MCP, plugin config,
   plus `CLAUDE.md`, `CLAUDE.local.md`, fichiers de contexte (BRIEF/DECISIONS/TASKS).
2. Classer chaque instruction trouvée : règle globale / règle scopée / procédure répétable / état
   temporaire / décision d'architecture / mémoire d'agent / validation déterministe.
3. Chercher les duplications entre ces fichiers (CLAUDE.md vs BRIEF vs skills vs rules) — trancher
   une source de vérité unique avant de dédupliquer.
4. Repérer les formulations « toujours / ne jamais / avant de continuer / vérifier que » écrites en
   prose : chacune est candidate à devenir hook, validateur ou test déterministe.
5. Identifier les candidats skill (procédure répétée, plusieurs étapes) ou subagent (recherche
   large, revue indépendante, exploration qui polluerait le contexte principal).
6. Repérer les gaspillages de quota : re-exploration répétée du même code, gros modèle utilisé sur
   une tâche simple, fichier de contexte obèse rechargé à chaque session, agents redondants.
7. Classer chaque proposition A (gain fort/complexité faible, à faire en premier) / B (gain
   net/complexité modérée, si l'usage le justifie) / C (gain marginal, ne pas implémenter par
   défaut) / D (sur-ingénierie, à rejeter explicitement).

## Vérifier avant de construire

Avant de faire confiance à une connaissance sur Claude Code (elle évolue vite) : llms.txt → page de
doc dédiée → page « feature availability » → changelog / What's New → version locale installée →
seulement alors, construire de l'infrastructure custom.

| Sujet | URL |
| --- | --- |
| Index LLM complet | <https://code.claude.com/docs/llms.txt> |
| Vue d'ensemble | <https://code.claude.com/docs/en/overview> |
| Commandes | <https://code.claude.com/docs/en/commands> |
| Mémoire / CLAUDE.md | <https://code.claude.com/docs/en/memory> |
| Répertoire `.claude` | <https://code.claude.com/docs/en/claude-directory> |
| Skills | <https://code.claude.com/docs/en/skills> |
| Subagents | <https://code.claude.com/docs/en/sub-agents> |
| Agent Teams | <https://code.claude.com/docs/en/agent-teams> |
| Dynamic Workflows | <https://code.claude.com/docs/en/workflows> |
| Hooks | <https://code.claude.com/docs/en/hooks-guide> |
| Permissions | <https://code.claude.com/docs/en/permissions> |
| MCP | <https://code.claude.com/docs/en/mcp> |
| Goal | <https://code.claude.com/docs/en/goal> |
| Tâches planifiées / loop | <https://code.claude.com/docs/en/scheduled-tasks> |
| Routines | <https://code.claude.com/docs/en/routines> |
| Plugins | <https://code.claude.com/docs/en/plugins> |
| Disponibilité des fonctionnalités | <https://code.claude.com/docs/en/feature-availability> |
| Changelog | <https://code.claude.com/docs/en/changelog> |

**Renvoi** : question pointue et précise sur une fonctionnalité → agent `claude-code-guide`.
Besoin de l'intégralité du rapport (contexte, détails, exemples) →
`docs/references/claude-code-capabilities-2026-08.md`.
