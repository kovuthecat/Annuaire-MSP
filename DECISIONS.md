# DECISIONS.md — Annuaire MSP — registre

**Une décision = une ligne ici, le détail dans `docs/decisions/`.** Ce registre est relu à chaque
cadrage : il doit tenir sous 150 lignes (plafond appliqué par hook). Journal des décisions
**transverses / architecturales** ; les plans pointent vers une section précise.

## Format d'un fichier de détail (`docs/decisions/YYYY-MM-DD-<slug>.md`)

Cf. gabarit `Templates/DECISIONS.md` (Décision · Contexte · Alternatives · Raison · Conséquences ·
Impact IA).

---

## Décisions

- 2026-07-16 — **Stack** — Vite + React + TS + Supabase + Vercel → [détail](docs/decisions/2026-07-16-stack-vite-react-ts-supabase-vercel.md)
- 2026-07-16 — **Périmètre** — répertoire de ressources large, fiche flexible typée → [détail](docs/decisions/2026-07-16-perimetre-repertoire-de-ressources-large-fiche-flexible-typee.md)
- 2026-07-16 — **Propriété** — pool commun + créateur + adoption, édition collaborative → [détail](docs/decisions/2026-07-16-propriete-pool-commun-createur-adoption-edition-collaborative.md)
- 2026-07-16 — **Coordonnées** — deux blocs patient / pro → [détail](docs/decisions/2026-07-16-coordonnees-deux-blocs-patient-pro.md)
- 2026-07-16 — **Commentaires** — typés à icônes, signés, partagés, cherchables → [détail](docs/decisions/2026-07-16-commentaires-types-a-icones-signes-partages-cherchables.md)
- 2026-07-16 — **Auth** — email + mot de passe, session persistante (remplace « lien magique ») → [détail](docs/decisions/2026-07-16-auth-email-mot-de-passe-session-persistante-remplace-lien-magique.md)
- 2026-07-18 — **Connexion par prénom** (menu déroulant), au lieu de saisir l'email → [détail](docs/decisions/2026-07-18-connexion-par-prenom-menu-deroulant-au-lieu-de-saisir-l-email.md)
- 2026-07-16 — **Mots-clés transversaux** (tags libres) → [détail](docs/decisions/2026-07-16-mots-cles-transversaux-tags-libres.md)
- 2026-07-16 — **Migration des carnets** — parse + enrichissement web, hors app → [détail](docs/decisions/2026-07-16-migration-des-carnets-parse-enrichissement-web-hors-app.md)
- 2026-07-16 — **T-005 exécuté** — sources réelles, preuve obligatoire, 3 provenances → [détail](docs/decisions/2026-07-16-t-005-execute-sources-reelles-preuve-obligatoire-3-provenances.md)
- 2026-07-16 — **Décisions issues de la maquette** (commentaires, types de contact) → [détail](docs/decisions/2026-07-16-decisions-issues-de-la-maquette-commentaires-types-de-contact.md)
- 2026-07-16 — **Recherche et filtres côté client** (MVP) → [détail](docs/decisions/2026-07-16-recherche-et-filtres-cote-client-mvp.md)
- 2026-07-17 — **La source datée l'emporte** — amende T-005 point 5 → [détail](docs/decisions/2026-07-17-la-source-datee-l-emporte-le-point-5-de-t-005-est-amende.md)
- 2026-07-17 — **Claude in Chrome ne prend pas ses consignes dans une page** — le protocole revient dans le prompt → [détail](docs/decisions/2026-07-17-claude-in-chrome-ne-prend-pas-ses-consignes-dans-une-page-le-protocole.md)
- 2026-07-17 — **Proximité & cartographie** (plan P3) — géo par vol d'oiseau, Leaflet/OSM, BAN, IDFM → [détail](docs/decisions/2026-07-17-proximite-cartographie-plan-p3-geo-par-vol-d-oiseau-leaflet-osm-ban-id.md)
- 2026-07-18 — **Arrêts de transport** (P3/S4) — GTFS complet + Licence Mobilité, à la place du jeu « arrêts » en licence ouverte → [détail](docs/decisions/2026-07-18-arrets-de-transport-p3-s4-gtfs-complet-licence-mobilite-a-la-place-du.md)
- 2026-07-17 — **Ajout assisté depuis Doctolib** (plan P4) — bookmarklet, pas de scraping serveur → [détail](docs/decisions/2026-07-17-ajout-assiste-depuis-doctolib-plan-p4-bookmarklet-pas-de-scraping-serv.md)
- 2026-07-18 — **Recherche multi-termes**, tolérante aux fautes, classée et surlignée + tests → [détail](docs/decisions/2026-07-18-recherche-multi-termes-tolerante-aux-fautes-classee-et-surlignee-tests.md)
- 2026-07-18 — **Filtres de l'annuaire recentrés** — Secteur 1 / Pédiatrie / Avis → [détail](docs/decisions/2026-07-18-filtres-de-l-annuaire-recentres-secteur-1-pediatrie-avis.md)
- 2026-07-19 — **Recueil de retours V1** — bouton flottant + table `feedback` (vue référent) → [détail](docs/decisions/2026-07-19-recueil-de-retours-v1-bouton-flottant-table-feedback-vue-referent.md)
- 2026-08-07 — **Listes d'impression nommées et favorites** — visibles de tous, éditables par le créateur seul, favori ouvert à tous → [détail](docs/decisions/2026-08-07-listes-impression-nommees-favorites.md)

---

## Archives

> Une ligne par décision caduque : `YYYY-MM-DD — Titre — remplacée par <décision/date>`.

- 2026-07-16 — *T-005, point 5 : « le carnet fait foi sur le web »* — amendée par « La source datée
  l'emporte » (2026-07-17). Les points 1-4 et 6 de T-005 restent en vigueur.
