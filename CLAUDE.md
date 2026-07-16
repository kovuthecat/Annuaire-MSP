# CLAUDE.md — Annuaire MSP

Instructions permanentes pour Claude Code. Seul fichier chargé automatiquement : il pointe vers le
reste sans le recopier.

## Commandes

Stack : Vite + React + TS (Supabase à brancher à T-003). Lint/tests non encore configurés.

```bash
# Dev / serveur local
npm run dev

# Build (typecheck + bundle) — c'est ce que Vercel exécute
npm run build

# Typecheck seul
npm run typecheck   # (tsc --noEmit)

# Aperçu du build de prod
npm run preview
```

- Variables d'environnement : `.env.local` (clés Supabase) — voir `.env.example`. Sur Vercel :
  Project Settings → Environment Variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
- Ne jamais committer de secret (`.env*`, clés, tokens).

@C:\Users\kovu\SynologyDrive\Thibault\Projets\Templates\CLAUDE-BASE.md

## Règles spécifiques au projet

- **Étanchéité coords patient / coords pro** : une coordonnée « pro » (bip, ligne médecins, portable
  perso, email d'avis, fax) ne doit **jamais** apparaître dans la feuille d'impression patient ni être
  présentée comme communicable au patient.
- **Adoption d'abord** : garder la saisie d'une fiche à friction minimale (peu de champs requis).
- **Accès réservé aux membres** : toute lecture/écriture passe par un membre authentifié (RLS).
- **Aucune donnée de santé de patient** stockée (le champ « Pour : [patient] » de l'impression n'est
  pas enregistré).
- Une seule entité « contact » (fiche flexible typée) — cf. `DECISIONS.md`.
