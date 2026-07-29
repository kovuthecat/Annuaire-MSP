# 2026-07-17 — Proximité & cartographie (plan P3) : géo par vol d'oiseau, Leaflet/OSM, BAN, IDFM

Cadre le plan `plans/P3/`. Fonctionnalité prévue de longue date au brief (« Carte de proximité »,
Version 2). Rien n'est encore implémenté ; ceci fige les arbitrages avant le premier commit.

### Décision
Ajouter une **couche géographique** par-dessus l'annuaire et la fiche : distance de chaque fiche à un
**point de référence**, carte, et arrêts de transport proches. Cinq choix structurants :

1. **Distance à vol d'oiseau (Haversine)**, fonction **pure** 100 % côté client — pas de temps de
   trajet (qui exigerait une API de routage). Se recalcule en mémoire à chaque changement de référence.
2. **Carte : Leaflet + tuiles OpenStreetMap** (`react-leaflet`), **sans clé ni facturation**.
3. **Géocodage : Base Adresse Nationale** (`api-adresse.data.gouv.fr`, sans clé), avec **seuil de
   confiance `score ≥ 0,6`** — en dessous, pas d'épingle (« position à préciser »).
4. **Point de référence** : la MSP par défaut (24 rue des Plâtrières, coordonnées **relevées** via la
   BAN, jamais inventées) ; **une autre adresse** (domicile patient) est saisissable → **état client
   transitoire, jamais stocké**.
5. **Arrêts de transport** : open data **Île-de-France Mobilités** embarqué, borné **Paris + communes
   limitrophes**, plus proches calculés en mémoire.

### Contexte
Le champ `adresse` est un texte libre sans coordonnées. Tout (carte, distance, arrêts, recalcul en
direct) repose sur une brique unique : **géocoder chaque fiche**. Une fois lat/lng en base, les
affichages sont quasi gratuits à calculer.

### Alternatives envisagées
- **Google Maps** : rendu familier + Street View, mais **clé API + compte Google Cloud facturé** ;
  écarté au profit du gratuit-sans-clé, cohérent avec les sources publiques FR du reste du projet.
- **Temps de trajet réel** (transports/à pied) : plus parlant à Paris, mais API de routage
  (coût/clé/latence) → reporté en V2 par-dessus le vol d'oiseau.
- **Mini-carte par ligne d'annuaire** (formulation initiale) : ~1000 cartes = perf et coûts
  catastrophiques → remplacé par **une carte partagée** + pastille de distance par ligne.
- **Overpass/Google Places pour les arrêts** : dépendance réseau + quotas → embarquer l'open data IDFM
  (même pattern que l'open data CNAM joint hors ligne).

### Raison du choix
Gratuit, sans clé, RGPD-friendly, cohérent avec l'écosystème du projet ; le vol d'oiseau suffit à
classer proche/loin et se recalcule sans serveur (aligné avec la recherche/filtres côté client). Le
seuil BAN applique la doctrine « ne jamais deviner » de T-005 : pas de fausse position.

### Conséquences
- **Schéma** : 4 colonnes nullable sur `contacts` — `latitude`, `longitude`, `geocode_score`,
  `geocoded_at` (bloc idempotent, pattern `email_rdv`). Pas d'index (calcul client).
- **Géocodage à la saisie** : à la création/édition, si l'adresse est présente/modifiée, géocodage **en
  arrière-plan non bloquant** ; échec silencieux → coordonnées `null`.
- **Nuance RGPD assumée** : les **tuiles OSM sont chargées depuis openstreetmap.org au rendu** (appel
  tiers, contrairement aux fonts self-hostées). Inhérent à toute carte, ne concerne qu'un membre
  authentifié ouvrant une carte, aucune donnée patient n'y transite. Bascule possible vers un
  fournisseur à clé (MapTiler/Stadia) ou IGN si le volume monte.
- **Étanchéité intacte** : la couche géo ne lit que l'`adresse` (bloc Lieu), ne touche aucun champ pro,
  n'apparaît jamais sur la feuille patient.

### Impact IA
Découpage en 4 sessions à zones disjointes (`plans/P3/`), fonctions géo **pures et testables**
(Haversine, plus-proches-arrêts) isolées dans `src/features/proximite/`. Le géocodage initial est un
script hors app rejouable, dans la lignée de `supabase/import/`.
