# STATUS.md — Annuaire MSP

> **Dernière mise à jour :** 2026-07-16

## Phase actuelle

**Phase 1 — Câblage (plan `plans/P1/`) terminée côté code.** Les 7 sessions (S1-S7) sont faites :
fondations UI, données Supabase, Annuaire, Fiche détail, Ajout/Modif, Sélection & impression, Auth +
Membres. `npm run build` / `npm run typecheck` passent à 0 erreur sur l'état combiné. Reste : validation
visuelle humaine (`VALIDATION.md`) et push.

## Ce qui fonctionne

- Fichiers de contexte instanciés (brief, architecture, décisions).
- Squelette Vite + React + TS : `npm run dev` / `npm run build` OK (build vérifié).
- Dépôt GitHub `kovuthecat/Annuaire-MSP` + projet Vercel `kovu-s-projects/annuaire-msp`.
- Supabase branché : schéma + RLS (`supabase/schema.sql`), client, types, hooks d'accès (`src/data/`).
- Auth email + mot de passe (session persistée), garde de route, écran Membres (profil, mot de passe).
- Écran Annuaire : recherche/filtres côté client, bascule mes/tous, sélection pour impression, icônes
  de commentaires.
- Écran Fiche détail : coords patient/pro étanches, commentaires typés, actions (ma liste, sélection
  impression, modifier, signaler à vérifier).
- Écran Ajout/Modifier : saisie essentielle rapide, sections repliables, détection de doublon,
  commentaires en brouillon (création) ou immédiats (édition).
- Écran Sélection & impression : panneau réordonnable, options, feuille patient (aucune coordonnée pro
  ni commentaire), impression/export PDF via `window.print()`.

## Ce qui casse / n'est pas testé

- Validation visuelle des 7 écrans pas encore faite par un humain — checklist dans `VALIDATION.md`.
- Lint/tests non configurés.
- Un diff non commité traîne sur `supabase/schema.sql` (colonne `comments.origine`, hors périmètre P1,
  lié à T-005) — à vérifier avec Thibault avant tout commit.

## Bugs connus

- —

## Dette technique

- —
