# TASKS.md — Annuaire MSP

Index des tâches (backlog + actif). Une ligne par tâche. V1 en production — cf. `STATUS.md` pour
l'état réel (reconstitué depuis les commits).

> **Frontières** — TASKS : le *quoi* · `STATUS.md` : l'état actuel · `plans/` : le *comment* · `VALIDATION.md` : checklist visuelle.

## Convention de ligne

`- [statut] T-ID — titre · modèle: X, effort: Y · plan: <lien ou —>`
statut : ` ` à faire · `~` en cours · `x` fait

## Tâches

- [ ] T-001 — Maquette UI (Claude Design, humain) à partir d'`ARCHITECTURE.md` → `design/maquettes/` · modèle: — (humain), effort: — · plan: —
- [x] T-002 — Scaffold Vite + React + TS (page « en construction »), GitHub + Vercel branchés · modèle: —, effort: — · plan: —
- [x] T-003 — Schéma Supabase + politiques RLS + client (contact, commentaire, ma-liste, membre) · modèle: Opus/Sonnet, effort: high · plan: → plans/P1/ (S2)
- [x] T-004 — Câblage des écrans sur la maquette (fondations + annuaire, fiche, édition, impression, membres, auth) · modèle: Sonnet, effort: medium/high · plan: → plans/P1/ (S1-S7 faites)
- [x] T-005 — Migration des carnets → fiches : parse + **enrichissement web** des contacts incomplets (annuaire santé Ameli, Doctolib), dédoublonnage, relecture humaine (**volume réel ≫ échantillons**) · modèle: Opus/Sonnet, effort: high · plan: → plans/P2/ (S1 open data CNAM faite ; enrichissement Doctolib/web + intégration de 2 carnets supplémentaires faits — base stabilisée à 1 232 fiches, cf. STATUS.md ; quelques décisions de triage restent à statuer avec Thibault, S3 consolidation formelle du plan non close)
- [~] T-006 — Proximité & cartographie : géocodage BAN, distance vol d'oiseau, carte Leaflet/OSM (annuaire + fiche), arrêts de transport IDFM, référence MSP/adresse patient · modèle: Opus/Sonnet, effort: high · plan: → plans/P3/ (S1 T1 + S2-S4 faites côté code et en production ; S1 T2/T3 — backfill géo de masse — non lancé)
- [~] T-007 — Ajout assisté depuis Doctolib : bookmarklet un-clic → préremplissage `/nouveau?prefill=` (liste blanche patient-only, provenance « à vérifier »), extension en repli si CSP · modèle: Sonnet/Opus, effort: medium/high · plan: → plans/P4/ (S1-S2 faites côté code ; testé le 2026-07-19 sur 2 vraies pages, un bug trouvé et corrigé ; reste un clic réel sur le favori installé pour écarter tout blocage CSP)
- [x] T-008 — Recueil de retours V1 : bouton flottant « Un souci ? » (popover au survol) + capture contexte/écran auto → table `feedback` + vue référent `/retours` · modèle: Opus, effort: high · plan: — (hors plan, cf. `DECISIONS.md` 2026-07-19 ; **actif en production**)
- [x] T-009 — Audit pré-partage (desktop + mobile) : parcours, robustesse, ergonomie, frictions · modèle: Sonnet, effort: medium/high · plan: — (hors plan ; carte/FAB mobile/filtres repliables/sélection/casse/filtre « à compléter » livrés le 2026-07-19 ; bug de détection de doublon trouvé, pas encore corrigé — cf. STATUS.md §Bugs connus)
