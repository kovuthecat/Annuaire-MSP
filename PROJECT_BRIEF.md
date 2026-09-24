# PROJECT_BRIEF.md — Annuaire MSP

> Répertoire partagé de correspondants et ressources d'adressage pour une maison de santé
> pluriprofessionnelle (MSP), Paris 20e, ~13 membres. Nom de travail : « Annuaire MSP » (renommable).

## Objectif du projet

Remplacer les carnets d'adresses hétérogènes de chaque membre de la MSP par **une base commune,
enrichie collectivement**, où l'on retrouve en quelques secondes le bon correspondant ou la bonne
ressource d'adressage, avec l'expérience partagée de l'équipe (commentaires typés). L'outil doit
permettre d'**imprimer une liste d'adressage propre pour un patient**. Priorité absolue :
**ergonomie et adoption** — s'il est plus pratique que le carnet perso, tout le monde l'alimente.

## Usage prévu

- Usage personnel : non — outil **collectif** de la MSP.
- Usage local : non — **base partagée en ligne**.
- Déploiement prévu : oui — **en production** (Vercel + Supabase).
- Utilisateurs autres que moi : oui — ~13 membres de la MSP.

## Fonctionnalités MVP

1. **Annuaire consultable** : recherche **multi-termes** tolérante (accents/casse/fautes légères),
   classée par pertinence (recommandations en tête à égalité) et surlignée, portant aussi sur les
   **mots-clés transversaux** et les commentaires ; filtres recentrés **Secteur 1 / Pédiatrie /
   À compléter** + facette **Catégorie** (le reste passe par la recherche texte, ex. « cardio 75020 ») ;
   bascule **mes contacts / tous**.
2. **Fiche flexible** : un contact peut être un praticien **ou** une structure/ressource (type de
   contact). Séparation **coordonnées patient** (imprimables) / **coordonnées pro** (confidentielles,
   jamais imprimées) + tags.
3. **Ajout / édition / suppression collaborative** : tout membre peut créer, corriger ou supprimer
   une fiche ; **très peu de champs obligatoires** ; historique « créé/modifié par ».
4. **« Mes contacts »** = fiches créées **ou adoptées** par le membre (une seule fiche par pro, pas de
   doublon) ; bascule avec « tous les contacts ».
5. **Commentaires typés** (recommandation, avis négatif, spécificité, info pratique… — extensible),
   **signés et datés**, visibles par tous ; **repliés derrière des icônes par type** sur la fiche et
   dans les résultats (on repère recos / avis négatifs d'un coup d'œil, survol/tap pour lire) ; leur
   **contenu est inclus dans la recherche**.
6. **Impression / PDF d'une liste patient** : sélection multiple → feuille propre (en-tête MSP,
   **coords patient uniquement**, **sans commentaires**).
7. **Comptes individuels email + mot de passe** (session persistée sur le poste, connexion par
   prénom), comptes provisionnés par un référent.

## Hors périmètre v1

- Import automatisé des carnets via l'UI — traité **hors app** en migration assistée (carnets
  supplémentaires intégrés au fil de l'eau, même pipeline).
- Consultation hors-ligne / PWA — réseau accessible en pratique ; seule l'icône d'installation
  (manifest) est en place.
- Annuaire interne des membres de la MSP (l'annuaire ne porte que les correspondants externes).
- Base de connaissances / mémos « orphelins » sans correspondant rattaché.
- Intégration serveur avec Doctolib ou un logiciel métier (cf. « À éviter »).
- Notification email des retours membres (demanderait Edge Function / SMTP) — le référent consulte
  `/retours`.

## Stack technique

- Frontend : **Vite + React + TypeScript** (React Router, carte Leaflet/react-leaflet, tests Vitest).
- Backend : **Supabase** (Postgres géré + Auth + Row-Level Security).
- Base de données : Postgres (Supabase) — schéma de référence `supabase/schema.sql`, rejoué à la main.
- Authentification : Supabase Auth — **email + mot de passe** (session persistée, connexion par
  prénom résolu en email côté client), comptes provisionnés par un référent.
- Hébergement : **Vercel** (front) + Supabase (données).
- Autres services : API Adresse (BAN) pour le géocodage, tuiles OpenStreetMap, arrêts IDFM (GTFS,
  Licence Mobilité) embarqués en JSON statique ; `html2canvas` pour la capture d'écran des retours.

## Contraintes et priorités

Priorités génériques (simplicité, maintenabilité, compatibilité IA) : `CONVENTIONS.md`.
Spécifique au projet :

- **Adoption = priorité n°1** : recherche instantanée, ajout ultra-rapide, mobile pleinement utilisable
  (consultation en visite à domicile).
- **Confidentialité** : accès réservé aux membres authentifiés (les commentaires sont des avis
  sensibles sur des confrères). **Aucune donnée de santé de patient stockée** → pas de contrainte HDS.
- **Étanchéité coords patient / coords pro** : une coordonnée « pro » (bip, ligne médecins, portable
  perso, email d'avis) ne doit **jamais** apparaître sur la feuille remise au patient.
- Desktop-first, mais responsive complet.

## Risques connus

- **Dédoublonnage** : mêmes correspondants sous orthographes variées, sans RPPS — à l'import de
  chaque carnet comme à la saisie (détection de doublon heuristique, faux positifs possibles).
- **Enrichissement web** : contacts souvent réduits à un nom → complétés par recherche web ; risque
  d'homonymes (Paris) → ne compléter qu'en cas de **match fiable** (annuaire santé Ameli), sinon
  marquer « à vérifier ». Jamais deviner (adressage médical).
- **Fraîcheur des données** dans le temps (fiches obsolètes) → édition collaborative + statut « à
  vérifier ». Les arrêts de transport sont un instantané GTFS figé, rafraîchi à la main
  (`transit_prep.py`).
- **Migrations de schéma manuelles** : un front poussé sur Vercel avant d'avoir rejoué
  `supabase/schema.sql` en prod casse la fonctionnalité concernée.
- **Bookmarklet Doctolib** dépendant de la structure des pages Doctolib (JSON-LD/DOM) et de leur CSP
  → peut casser sans préavis.
- **RGPD** : fiches, commentaires et captures d'écran des retours nomment des tiers (professionnels)
  → accès restreint aux membres (captures lisibles du seul référent), modération sociale de l'équipe.
- **Adoption** : si la saisie est lourde, l'outil ne sera pas alimenté → minimiser les champs requis.

---

## Roadmap / jalons

### Vision

Devenir le **réflexe d'adressage unique** de la MSP : retrouver en secondes le bon correspondant ou la
bonne ressource, avec l'expérience partagée de l'équipe, et remettre au patient une liste claire.

### MVP — fait, en production

- [x] Annuaire : recherche + filtres + mes/tous + tags
- [x] Fiche flexible (praticien/structure) : coords patient vs pro, infos pratiques, tags
- [x] Ajout / édition / suppression collaborative (peu de champs requis, historique)
- [x] Mes contacts (créées + adoptées)
- [x] Commentaires typés, signés, datés
- [x] Impression / PDF liste patient
- [x] Auth email + mot de passe (session persistée) + provisionnement des membres — connexion par
      prénom (résolu en email côté client, cf. `DECISIONS.md` 2026-07-18)

### Version 1 — fait, en production

- [x] Import assisté des carnets : parse + **enrichissement web** des contacts incomplets, relu
      (migration one-shot) — base 1 226 fiches (4 carnets + répertoire partagé + 2 carnets
      Elena/Maylis, croisés open data CNAM + Doctolib) ; carnet Clara (+7 fiches) préparé, pas
      encore appliqué en prod
- [x] Affinage des filtres et de la recherche à l'usage — recherche multi-termes/tolérante aux
      fautes/pertinence (recommandations en tête à égalité), filtres recentrés (Secteur 1 /
      Pédiatrie / À compléter + facette Catégorie)
- [x] Détection de doublons à la saisie
- [x] **Recueil de retours** — bouton flottant « Un souci ? » (contexte + capture d'écran auto) →
      table `feedback`, écran référent `/retours` (cf. `DECISIONS.md` 2026-07-19)

### Version 2 / idées réalisées ou en cours

- [x] **Carte de proximité** — géocodage BAN, distance à vol d'oiseau, carte Leaflet/OSM (annuaire +
      fiche), arrêts de transport IDFM (plan `plans/P3/`) — reste le backfill géo de masse des
      fiches existantes
- [x] **Ajout assisté depuis Doctolib** (bookmarklet, JSON-LD → préremplissage `/nouveau?prefill=`) —
      reste un test humain (clic réel sur le favori) pour écarter tout blocage CSP (plan `plans/P4/`)
- [x] **Listes d'impression nommées et favorites** (`/listes`) — visibles de tous, éditables par le
      créateur seul, favori ouvert à tous (cf. `DECISIONS.md` 2026-08-07) — migration prod et
      validation visuelle restant à faire
- [ ] PWA / consultation hors-ligne
- [ ] Base de mémos / protocoles
- [ ] Statistiques d'usage

### Critères avant ajout de feature

- Complexité et maintenance proportionnées ;
- découpable en tâches ciblées sans refactor global ;
- documentable dans `PROJECT_MAP.md`.

### À éviter pour l'instant

- Sur-structurer les « infos pratiques » (garder un texte libre).
- Rôles / permissions complexes (~13 membres, confiance mutuelle).
- Intégration serveur avec Doctolib ou un logiciel métier (scraping, API) — reste hors périmètre ;
  le bookmarklet P4 lit uniquement la page déjà ouverte dans le navigateur du membre, sans requête
  serveur vers Doctolib (cf. `DECISIONS.md` 2026-07-17).
