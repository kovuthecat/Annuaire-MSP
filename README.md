# Annuaire MSP

Répertoire partagé de correspondants et ressources d'adressage pour une maison de santé
pluriprofessionnelle (Paris 20e, ~10 membres). Nom de travail — renommable.

## Fichiers de contexte

- `PROJECT_BRIEF.md` — objectif, MVP, hors périmètre, stack.
- `ARCHITECTURE.md` — écrans, navigation, données (= document envoyé à Claude Design pour la maquette).
- `DECISIONS.md` — arbitrages produit/technique.
- `PROJECT_MAP.md` · `STATUS.md` · `TASKS.md` · `VALIDATION.md` — carte, état, backlog, checklist visuelle.
- `CLAUDE.md` — instructions Claude Code + commandes du projet.

## État

**V1 en production**, utilisée par les membres de la MSP avec des données réelles (1 226
correspondants). Annuaire, fiche, ajout/édition, sélection & impression, membres, recueil de
retours (« Un souci ? »), proximité/carte, ajout assisté depuis Doctolib : tous câblés et déployés.
Détail à jour dans `STATUS.md` ; backlog dans `TASKS.md`.

- Dépôt GitHub : `kovuthecat/Annuaire-MSP`.
- Déploiement : Vercel, projet `kovu-s-projects/annuaire-msp` → https://annuaire-msp.vercel.app.
- Données : Supabase (Postgres + Auth + RLS).

## Stack

Vite + React + TypeScript · Supabase (Postgres + Auth email/mot de passe + RLS) · Vercel · Vitest.
