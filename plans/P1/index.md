# Plan P1 — Câblage de l'annuaire MSP sur la maquette   (rédigé par Opus)

## Objectif d'ensemble

Implémenter les écrans de la maquette (`design/maquettes/design-annuaire-msp/`, design system dans
`ARCHITECTURE.md` §Maquette) en Vite + React + TS, branchés sur Supabase (Postgres + Auth lien magique
+ RLS). Le design est fixé : **on câble sur la maquette, on ne redessine pas**.

## Décisions de cadrage (valables pour tout le plan)

- **Recherche/filtres côté client** sur le dataset chargé (fiches + commentaires + « ma liste »), cf.
  `DECISIONS.md` §Recherche. Pas de full-text serveur.
- **4 types de commentaire** : `reco` (vert) · `alerte` (orange) · `spec` (violet) · `info` (bleu) —
  chacun avec **icône + compteur + popover**. Cf. `DECISIONS.md`.
- **Type de contact** : 4 groupes (`praticien`/`structure`/`labo`/`autre`) + `sous_type` optionnel.
- **Fonts self-hostées** via `@fontsource/plus-jakarta-sans` (RGPD : pas de CDN Google au runtime).
- **Routing** via `react-router-dom` (routes : `/connexion`, `/` annuaire, `/contact/:id`, `/nouveau`,
  `/contact/:id/modifier`, `/impression`, `/membres`).
- **Coords patient / pro étanches** : les coords pro ne partent jamais vers la feuille d'impression.

## Sessions

| Session | Tâches | Titre | Modèle | Effort | Dépend de | Zone modifiée | Statut |
| --- | --- | --- | --- | --- | --- | --- | --- |
| [S1](S1.md) | T1-T3 | Fondations UI : deps, theme/fonts, routing+layout, composants partagés | Sonnet | high | — | `package.json`, `index.html`, `src/theme/`, `src/components/`, `src/app/`, `src/App.tsx`, `src/main.tsx` | [ ] |
| S2 | T4-T5 | Données : schéma Supabase + RLS + client + types + hooks d'accès | Opus/Sonnet | high | Supabase créé | `supabase/`, `src/lib/supabase.ts`, `src/types/`, `src/data/` | [ ] |
| S3 | T6 | Écran Annuaire (recherche client, filtres, mes/tous, sélection, icônes) | Sonnet | high | S1, S2 | `src/features/annuaire/` | [ ] |
| S4 | T7 | Écran Fiche détail (coords patient/pro, 4 icônes commentaires, actions) | Sonnet | medium | S1, S2 | `src/features/fiche/` | [ ] |
| S5 | T8 | Écran Ajout/Modif (essentiel, type+sous-type, sections, coords, tags, commentaires, doublon) | Sonnet | high | S1, S2 | `src/features/edition/` | [ ] |
| S6 | T9 | Écran Sélection & impression (panneau, options, feuille patient, CSS print/PDF) | Sonnet | medium | S1, S2 | `src/features/impression/` | [ ] |
| S7 | T10 | Auth lien magique + garde de route + Membres (liste, invitation) | Sonnet | high | S2 | `src/features/auth/`, `src/features/membres/`, `src/app/` | [ ] |

> S2–S7 : détail rédigé **juste avant leur vague** (S2 une fois les identifiants Supabase en main — le
> schéma les précise). L'index fait foi pour le périmètre et l'ordonnancement.

## Ordonnancement

- **Vague 1** : **S1** (démarrable tout de suite) ∥ **S2** (dès que Supabase est créé — zones disjointes :
  composants/théme vs base/types). Si Supabase pas prêt, S1 seul.
- **Vague 2 — parallélisable** : **S3 ∥ S4 ∥ S5 ∥ S6** (après S1+S2 ; features disjointes) et **S7**
  (après S2).
- **Vague 3 — consolidation** : commits tâche par tâche, `STATUS.md`, `TASKS.md`, `VALIDATION.md`, push
  (humain ou session Haiku `minimal`), cf. `WORKFLOW.md` §4d.

## Pré-requis externe

**Créer le projet Supabase** (région Europe) et fournir `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`
(dans `.env.local` et Vercel). Ne bloque que S2 (et par ricochet les données de S3–S7) ; S1 n'en dépend pas.
