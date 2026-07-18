# TASKS.md — Annuaire MSP

Index des tâches (backlog + actif). Une ligne par tâche. Le plan `plans/P1/` sera cadré **après la
maquette** (câblage sur la maquette).

> **Frontières** — TASKS : le *quoi* · `STATUS.md` : l'état actuel · `plans/` : le *comment* · `VALIDATION.md` : checklist visuelle.

## Convention de ligne

`- [statut] T-ID — titre · modèle: X, effort: Y · plan: <lien ou —>`
statut : ` ` à faire · `~` en cours · `x` fait

## Tâches

- [ ] T-001 — Maquette UI (Claude Design, humain) à partir d'`ARCHITECTURE.md` → `design/maquettes/` · modèle: — (humain), effort: — · plan: —
- [x] T-002 — Scaffold Vite + React + TS (page « en construction »), GitHub + Vercel branchés · modèle: —, effort: — · plan: —
- [x] T-003 — Schéma Supabase + politiques RLS + client (contact, commentaire, ma-liste, membre) · modèle: Opus/Sonnet, effort: high · plan: → plans/P1/ (S2)
- [x] T-004 — Câblage des écrans sur la maquette (fondations + annuaire, fiche, édition, impression, membres, auth) · modèle: Sonnet, effort: medium/high · plan: → plans/P1/ (S1-S7 faites)
- [~] T-005 — Migration des carnets → fiches : parse + **enrichissement web** des contacts incomplets (annuaire santé Ameli, Doctolib), dédoublonnage, relecture humaine (**volume réel ≫ échantillons**) · modèle: Opus/Sonnet, effort: high · plan: → plans/P2/ (S1 faite : open data CNAM ; S2 Doctolib et S3 consolidation restent)
- [~] T-006 — Proximité & cartographie : géocodage BAN, distance vol d'oiseau, carte Leaflet/OSM (annuaire + fiche), arrêts de transport IDFM, référence MSP/adresse patient · modèle: Opus/Sonnet, effort: high · plan: → plans/P3/ (S1 T1 + S2-S4 faites côté code ; S1 T2/T3 — backfill géo de masse — différées jusqu'à fin P2 ; validation visuelle humaine restante)
- [~] T-007 — Ajout assisté depuis Doctolib : bookmarklet un-clic → préremplissage `/nouveau?prefill=` (liste blanche patient-only, provenance « à vérifier »), extension en repli si CSP · modèle: Sonnet/Opus, effort: medium/high · plan: → plans/P4/ (S1-S2 faites côté code ; test CSP réel restant sur une vraie page Doctolib, décide si S3 se déclenche)
