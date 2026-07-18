# Plan P3 — Proximité & cartographie   (rédigé par Opus)

## Objectif d'ensemble

Donner à chaque fiche une **position géographique** et exploiter cette position dans trois endroits :

1. **Annuaire** : une **pastille de distance** par ligne (par rapport à un point de référence) + un **tri
   par distance** + une **carte partagée** montrant tous les résultats filtrés.
2. **Fiche détail** : une **carte** (praticien + MSP), la **distance à la MSP**, et les **arrêts de
   transport** (métro / bus / tram) à proximité.
3. **Point de référence modifiable** : par défaut la MSP (24 rue des Plâtrières, 75020) ; on peut saisir
   **une autre adresse** (domicile d'un patient) → **toutes les distances se recalculent**.

Cette fonctionnalité figurait déjà en **Version 2** du brief (« Carte de proximité »). Elle ne redessine
aucun écran existant : elle **ajoute** une couche géo par-dessus l'annuaire et la fiche.

## Décisions de cadrage (valables pour tout le plan)

Arbitrées avec Thibault le 2026-07-17 (à reporter dans `DECISIONS.md` en fin de plan) :

- **Carte : Leaflet + tuiles OpenStreetMap** (`react-leaflet`). Gratuit, **sans clé API ni compte de
  facturation** — écarte Google Maps (clé + Google Cloud) et reste cohérent avec l'esprit du projet
  (sources publiques). *Nuance RGPD assumée* : les **tuiles sont chargées depuis openstreetmap.org au
  rendu de la carte** (un appel réseau tiers, contrairement aux fonts self-hostées). C'est inhérent à
  toute carte, ça ne concerne qu'un **membre authentifié** qui ouvre une carte, et **aucune donnée
  patient n'y transite**. Trade-off conscient, pas un oubli. Si besoin plus tard : basculer sur une clé
  gratuite (MapTiler/Stadia) ou les tuiles IGN, sans rien changer d'autre.
- **Distance : à vol d'oiseau (Haversine)**. Fonction **pure**, 100 % côté client, instantanée, se
  recalcule en mémoire à chaque changement de référence. Le temps de trajet réel (transports) est hors
  périmètre P3 (nécessiterait une API de routage) — envisageable en V2 par-dessus.
- **Géocodage : Base Adresse Nationale** (`api-adresse.data.gouv.fr`), **sans clé**, service public FR.
  Renvoie un **`score` de confiance**. **Doctrine identique à l'import** (`DECISIONS.md` §T-005, « ne
  jamais deviner ») : **`score ≥ 0,6` → on place le point** ; en dessous → `geocode_score` stocké mais
  **pas d'épingle** (« position à préciser »). On ne plante jamais une épingle au mauvais endroit.
- **Point de référence MSP** : constante obtenue en **géocodant une seule fois** « 24 rue des
  Plâtrières, 75020 Paris » via la BAN (coordonnées **relevées**, jamais inventées), figée en dur.
- **Adresse de référence alternative (patient)** : **état client transitoire, jamais stocké** — même
  régime que le champ « Pour : [patient] » de l'impression (`DECISIONS.md` : aucune donnée patient
  stockée).
- **Arrêts de transport** : jeu **open data Île-de-France Mobilités** (arrêts + lignes + coordonnées),
  **embarqué** dans l'app, **borné à Paris + communes limitrophes** (confirmé avec Thibault), arrêts les
  plus proches calculés **en mémoire** (Haversine). Même pattern que l'open data CNAM joint hors ligne.
- **Géocodage à la saisie** (confirmé) : à la création/édition d'une fiche, si l'adresse est présente et
  nouvelle/modifiée, on géocode **en arrière-plan, sans bloquer** l'enregistrement (échec silencieux →
  coordonnées laissées `null`).
- **Étanchéité inchangée** : la couche géo ne lit que l'`adresse` (bloc Lieu) ; elle ne touche à aucune
  coordonnée pro et n'apparaît jamais sur la feuille patient.

## Schéma — 4 colonnes ajoutées (S1)

```sql
alter table public.contacts add column if not exists latitude      double precision;
alter table public.contacts add column if not exists longitude     double precision;
alter table public.contacts add column if not exists geocode_score real;          -- confiance BAN 0..1
alter table public.contacts add column if not exists geocoded_at   timestamptz;
```

Bloc idempotent, **même pattern que `email_rdv`/`source_url`** (`supabase/schema.sql`). Pas d'index
(tout le calcul de distance est côté client, cf. `DECISIONS.md` §Recherche côté client).

## Sessions

| Session | Titre | Modèle | Effort | Dépend de | Zone modifiée | Statut |
| --- | --- | --- | --- | --- | --- | --- |
| [S1](S1.md) | Schéma géo + géocodage BAN hors app (backfill + rapport) | Opus/Sonnet | high | schéma seedé | `supabase/schema.sql`, `supabase/import/geocode.py`, `supabase/geo_backfill.sql` | [ ] |
| [S2](S2.md) | Distance (Haversine) + géocodage à la saisie + pastille/tri annuaire + sélecteur de référence | Sonnet | high | S1 (schéma) | `src/types/db.ts`, `src/features/proximite/`, `src/app/`, `src/features/annuaire/`, `src/features/edition/` | [ ] |
| [S3](S3.md) | Carte Leaflet réutilisable + carte annuaire (épingles) + carte fiche | Sonnet | high | S2 | `package.json`, `src/components/Map/`, `src/features/annuaire/`, `src/features/fiche/` | [ ] |
| [S4](S4.md) | Arrêts de transport à proximité (open data IDFM embarqué) sur la fiche | Sonnet | medium/high | S2 | `supabase/import/transit_prep.py`, `src/features/proximite/`, `src/features/fiche/` | [ ] |

> Le détail de chaque session est rédigé avant sa vague. L'index fait foi pour le périmètre et
> l'ordonnancement. S3 introduit une **surface visuelle nouvelle** (panneau carte) : pas de maquette
> Claude Design dédiée — rester **sobre et cohérent avec le design system** (`src/theme/tokens.ts`).
> Une micro-maquette est possible mais optionnelle (peu de surface).

## Ordonnancement

- **Vague 1** : **S1** seule. Hors ligne (schéma + script BAN), aucune dépendance au front.
  - Le **schéma** (colonnes géo) peut être ajouté **quand on veut**, en parallèle de tout le reste.
  - ⚠️ **Le *backfill* géo (géocodage en masse des adresses) doit tourner APRÈS la fin de la
    réconciliation des extractions Doctolib (P2) ET web dans `annuaire_donnees.json`** *(noté le
    2026-07-18)*. Ces passes **corrigent et complètent les adresses** ; géocoder avant, c'est géocoder
    des adresses non finales et devoir tout relancer. Ordre imposé : *réconcilier Doctolib + web →
    **puis** backfill géo*. (Le géocodage à la saisie de S2 reste incrémental et couvre les fiches
    ajoutées ou modifiées ensuite.)
- **Vague 2** : **S2**, après le schéma de S1. *Le code de S2 ne dépend pas des données de backfill* :
  tant qu'une fiche n'a pas de coordonnées, sa distance affiche « — ». Le backfill peut donc tourner en
  parallèle ou après **le code de S2** — mais **jamais avant la réconciliation Doctolib + web** (cf. Vague 1).
- **Vague 3 — parallélisable** : **S3 ∥ S4** (après S2 ; zones disjointes — S3 = carte, S4 = transports).

## Pré-requis externe

- **BAN** (S1, S2 à la saisie) : rien, API publique sans clé. Débit raisonnable (l'annuaire fait
  quelques centaines d'adresses) — le backfill respecte un throttling léger.
- **Tuiles OSM** (S3) : rien, mais **respecter la politique d'usage** d'openstreetmap.org (usage
  interne ~10 personnes = OK). Prévoir la bascule vers un fournisseur à clé si le volume monte.
- **IDF Mobilités** (S4) : téléchargement libre du jeu « arrêts » (data.iledefrance-mobilites.fr,
  licence ouverte). Aucune clé.

## Ce que P3 ne fait pas

- **Pas de temps de trajet / itinéraire** (pas d'API de routage) — vol d'oiseau uniquement.
- **Pas de correction d'adresses** : une adresse fausse ou incomplète produit un géocodage faible ou nul
  (« position à préciser »), pas une fausse position. La correction reste un travail d'édition humaine.
- **Pas de stockage de l'adresse patient** : transitoire, en mémoire, jamais en base.
- **Pas de refonte des écrans** : la couche géo s'ajoute par-dessus l'annuaire et la fiche existants.
