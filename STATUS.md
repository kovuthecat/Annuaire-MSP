# STATUS.md — Annuaire MSP

> **Dernière mise à jour :** 2026-07-16

## Phase actuelle

**Phase 1 — Câblage (plan `plans/P1/`) en cours.** Supabase créé et branché, schéma + RLS posés.
Fait et commité : **S1** (fondations UI), **S2** (données), **S3** (écran Annuaire), **S7** (auth +
Membres). Restant : **S4** (fiche détail), **S5** (ajout/modif — plan écrit, implémentation en cours),
**S6** (sélection & impression) — cf. `plans/P1/index.md`.

## Ce qui fonctionne

- Fichiers de contexte instanciés (brief, architecture, décisions).
- Squelette Vite + React + TS : `npm run dev` / `npm run build` OK (build vérifié).
- Dépôt GitHub `kovuthecat/Annuaire-MSP` + projet Vercel `kovu-s-projects/annuaire-msp`.
- Supabase branché : schéma + RLS (`supabase/schema.sql`), client, types, hooks d'accès (`src/data/`).
- Auth email + mot de passe (session persistée), garde de route, écran Membres (profil, mot de passe).
- Écran Annuaire : recherche/filtres côté client, bascule mes/tous, sélection pour impression, icônes
  de commentaires.

## Ce qui casse / n'est pas testé

- Écrans Fiche détail, Ajout/Modif, Sélection & impression encore des stubs (« à câbler »).
- Validation visuelle des écrans livrés (S1/S2/S3/S7) pas encore faite par un humain — checklist dans
  `VALIDATION.md`.
- Lint/tests non configurés.

## Bugs connus

- —

## Dette technique

- —
