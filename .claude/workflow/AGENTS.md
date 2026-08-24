# AGENTS.md

Instructions permanentes pour **Codex** (Claude Code ne lit pas ce fichier — il lit `CLAUDE.md`).
Codex charge ce fichier automatiquement ; il ne charge PAS les autres — ce fichier pointe vers eux.

## Rôle de Codex

**Régression visuelle scriptée via Playwright, sur un parcours complet.**
Codex n'implémente pas de features et ne modifie pas le code applicatif — c'est le rôle de Claude
(plans dans `plans/`, commandes du projet dans `CLAUDE.md`). Ne jamais committer de secret.

> **Périmètre réduit depuis le 2026-07-28.** La vérification d'un écran isolé (erreurs console,
> contenu présent, 4xx/5xx, responsive) est désormais le **N1**, fait par Claude via le navigateur
> in-app de Claude Code Desktop (`WORKFLOW.md` §6). Codex garde ce que le N1 ne couvre pas :
> parcours multi-écrans scriptés, comparaison avant/après, rapport JSON rejouable.

## Audits UI (Playwright)

Ne pas installer Playwright dans le projet. Utiliser le runner partagé depuis la racine du projet à
auditer — son emplacement est **local à la machine**, donné par `PLAYWRIGHT_AUDIT_RUNNER` :

```powershell
node "$env:PLAYWRIGHT_AUDIT_RUNNER" <url>
```

Variable non définie ? Le runner vit dans `.tooling/playwright-audit/audit.mjs` du dossier Projets ;
la définir une fois pour toutes dans le profil PowerShell plutôt que de coller un chemin absolu dans
un fichier versionné.

`--headed` affiche le navigateur ; `--output <dossier>` change la sortie (défaut : `output/playwright/`).
Démarrer d'abord le serveur du projet (commande dans son `CLAUDE.md`), puis auditer l'URL locale ;
consulter le rapport JSON (erreurs console/page, requêtes échouées, débordements horizontaux).
Si le projet a déjà une suite E2E `@playwright/test`, utiliser sa version locale — le runner partagé
sert aux audits ponctuels, pas à remplacer les tests versionnés.

## Restitution

Consigner les constats **techniques** (erreur, requête échouée, débordement) dans le rapport rendu à
l'utilisateur, **sans modifier le code** : ce sont des défauts N1, ils deviennent des tâches, pas des
lignes de `VALIDATION.md` (qui ne porte que le jugement humain N2).
Si la tâche dépasse l'audit (correctif, refactor, choix produit) : s'arrêter, résumer, rendre la main.
