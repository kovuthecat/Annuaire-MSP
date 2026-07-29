# 2026-07-16 — Stack : Vite + React + TS + Supabase + Vercel

### Décision
Front **Vite + React + TypeScript**, backend **Supabase** (Postgres + Auth + RLS), hébergement
**Vercel** (front) + Supabase (données).

### Contexte
Outil **multi-utilisateurs à données partagées** (≠ apps local-first du reste de l'écosystème). Il faut
une base commune en ligne, de l'auth et des règles d'accès. Stack déjà rodée sur S&C et Cosme DIY.

### Alternatives envisagées
- Local-first (Dexie) : exclu — les données doivent être partagées entre les 10 membres.
- Backend maison : surdimensionné pour ~10 utilisateurs.

### Raison du choix
Supabase fournit Postgres, Auth (email/mot de passe) et **Row-Level Security** clés en main ; compatible avec
le savoir-faire existant. Vercel = déploiement connu.

### Conséquences
Schéma + politiques RLS à concevoir tôt (tâche dédiée). Secrets côté env (jamais commités).
