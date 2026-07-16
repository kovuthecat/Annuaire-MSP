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

**Phase 0 — cadrage.** Prochaine étape : maquette UI (Claude Design) → `design/maquettes/`, puis
scaffolding et câblage. Voir `STATUS.md`.

## Stack cible

Vite + React + TypeScript · Supabase (Postgres + Auth email/mot de passe + RLS) · Vercel.
