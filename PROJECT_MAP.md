# PROJECT_MAP.md — Annuaire MSP

Carte synthétique du projet. **À compléter au scaffolding** (pas encore de code — phase de cadrage).

## Vue d'ensemble

- **Type** : web app (Vite + React + TS) à données partagées via Supabase (Postgres + Auth + RLS).
- **Grandes zones** : annuaire (recherche/filtres), fiche (détail), édition, commentaires, ma-liste,
  impression, membres, auth.
- **Flux principal** : connexion (email + mot de passe) → annuaire → fiche → adopter/commenter, ou
  sélection multiple → impression liste patient.
- **Contrainte structurante** : accès réservé aux membres (RLS) ; étanchéité coords patient / coords pro.

---

## Arborescence utile (prévue)

```text
src/
  features/
    auth/          # connexion email + mot de passe, session persistée
    annuaire/      # liste, recherche, filtres, tags, bascule mes/tous
    fiche/         # détail : coords patient/pro, icônes de commentaires, badges
    edition/       # formulaire ajout/édition + détection de doublon
    commentaires/  # commentaires typés à icônes (reco / avis négatif / spécificité / info pratique)
    ma-liste/      # adoption d'une fiche, indicateur "dans ma liste"
    impression/    # sélection + feuille patient (coords patient seules)
    membres/       # invitations, profil, référent
  components/      # UI partagée
  lib/             # client Supabase, helpers
  types/           # types partagés (Contact, Commentaire, Membre)
```

---

## Features principales

> À détailler au fur et à mesure de l'implémentation.

### Feature — annuaire
Rôle : point d'entrée, recherche tolérante + filtres + tags + bascule mes/tous.
Points de vigilance : performance et tolérance de la recherche (accents/fautes) sur plusieurs centaines de fiches.

### Feature — impression
Rôle : produire la feuille patient. **Ne doit jamais inclure coords pro ni commentaires.**

---

## Fichiers transversaux importants

### API / persistance
- Client Supabase + politiques RLS (à concevoir tôt).

---

## Zones à risque ou coûteuses en contexte IA

- Politiques RLS (correction = accès/données) — à documenter précisément une fois écrites.
- Étanchéité coords patient/pro dans la chaîne fiche → sélection → impression.

---

## Règles locales importantes

- Coords pro : jamais imprimées, jamais communiquées au patient.
- Peu de champs obligatoires à la saisie (adoption).
