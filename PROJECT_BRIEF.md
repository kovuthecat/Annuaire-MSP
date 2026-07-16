# PROJECT_BRIEF.md — Annuaire MSP

> Répertoire partagé de correspondants et ressources d'adressage pour une maison de santé
> pluriprofessionnelle (MSP), Paris 20e, ~10 membres. Nom de travail : « Annuaire MSP » (renommable).

## Objectif du projet

Remplacer les carnets d'adresses hétérogènes de chaque membre de la MSP par **une base commune,
enrichie collectivement**, où l'on retrouve en quelques secondes le bon correspondant ou la bonne
ressource d'adressage, avec l'expérience partagée de l'équipe (commentaires typés). L'outil doit
permettre d'**imprimer une liste d'adressage propre pour un patient**. Priorité absolue :
**ergonomie et adoption** — s'il est plus pratique que le carnet perso, tout le monde l'alimente.

## Usage prévu

- Usage personnel : non — outil **collectif** de la MSP.
- Usage local : non — **base partagée en ligne**.
- Déploiement prévu : oui (Vercel + Supabase).
- Utilisateurs autres que moi : oui — ~10 membres de la MSP.

## Fonctionnalités MVP

1. **Annuaire consultable** : recherche tolérante (accents/casse/fautes légères) + filtres (type,
   profession/spécialité, secteur/arrondissement, prend de nouveaux patients, visites à domicile,
   accepte AME/CMU, secteur conventionnement) + **mots-clés transversaux** + bascule **mes contacts / tous**.
2. **Fiche flexible** : un contact peut être un praticien **ou** une structure/ressource (type de
   contact). Séparation **coordonnées patient** (imprimables) / **coordonnées pro** (confidentielles,
   jamais imprimées) + tags.
3. **Ajout / édition collaborative** : tout membre peut créer et corriger une fiche ; **très peu de
   champs obligatoires** ; historique « créé/modifié par ».
4. **« Mes contacts »** = fiches créées **ou adoptées** par le membre (une seule fiche par pro, pas de
   doublon) ; bascule avec « tous les contacts ».
5. **Commentaires typés** (recommandation, avis négatif, spécificité, info pratique… — extensible),
   **signés et datés**, visibles par tous ; **repliés derrière des icônes par type** sur la fiche et
   dans les résultats (on repère recos / avis négatifs d'un coup d'œil, survol/tap pour lire) ; leur
   **contenu est inclus dans la recherche**.
6. **Impression / PDF d'une liste patient** : sélection multiple → feuille propre (en-tête MSP,
   **coords patient uniquement**, **sans commentaires**).
7. **Comptes individuels par lien magique** (session longue), comptes provisionnés par un référent.

## Hors périmètre v1

- Import automatisé des carnets via l'UI — traité **hors app** en migration assistée one-shot.
- Consultation hors-ligne / PWA — réseau accessible en pratique (à reconsidérer plus tard).
- Carte géographique de proximité.
- Annuaire interne des membres de la MSP (l'annuaire ne porte que les correspondants externes).
- Base de connaissances / mémos « orphelins » sans correspondant rattaché.
- Intégration Doctolib ou logiciel métier.

## Stack technique

- Frontend : **Vite + React + TypeScript**.
- Backend : **Supabase** (Postgres géré + Auth + Row-Level Security).
- Base de données : Postgres (Supabase).
- Authentification : Supabase Auth — **lien magique**, comptes provisionnés par un référent.
- Hébergement : **Vercel** (front) + Supabase (données).
- Autres services : —

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

- **Dédoublonnage à l'import** : mêmes correspondants sous orthographes variées, sans RPPS.
- **Enrichissement web** : contacts souvent réduits à un nom → complétés par recherche web ; risque
  d'homonymes (Paris) → ne compléter qu'en cas de **match fiable** (annuaire santé Ameli), sinon
  marquer « à vérifier ». Jamais deviner (adressage médical).
- **Fraîcheur des données** dans le temps (fiches obsolètes) → édition collaborative + statut « à vérifier ».
- **RGPD** : fiches et commentaires nomment des tiers (professionnels) → accès restreint aux membres,
  modération sociale de l'équipe.
- **Adoption** : si la saisie est lourde, l'outil ne sera pas alimenté → minimiser les champs requis.

---

## Roadmap / jalons

### Vision

Devenir le **réflexe d'adressage unique** de la MSP : retrouver en secondes le bon correspondant ou la
bonne ressource, avec l'expérience partagée de l'équipe, et remettre au patient une liste claire.

### MVP

- [ ] Annuaire : recherche + filtres + mes/tous + tags
- [ ] Fiche flexible (praticien/structure) : coords patient vs pro, infos pratiques, tags
- [ ] Ajout / édition collaborative (peu de champs requis, historique)
- [ ] Mes contacts (créées + adoptées)
- [ ] Commentaires typés, signés, datés
- [ ] Impression / PDF liste patient
- [ ] Auth lien magique + provisionnement des membres

### Version 1

- [ ] Import assisté des carnets : parse + **enrichissement web** des contacts incomplets, relu (migration one-shot)
- [ ] Affinage des filtres et de la recherche à l'usage
- [ ] Détection de doublons à la saisie

### Version 2 / idées futures

- [ ] PWA / consultation hors-ligne
- [ ] Carte de proximité
- [ ] Base de mémos / protocoles
- [ ] Statistiques d'usage

### Critères avant ajout de feature

- Complexité et maintenance proportionnées ;
- découpable en tâches ciblées sans refactor global ;
- documentable dans `PROJECT_MAP.md`.

### À éviter pour l'instant

- Sur-structurer les « infos pratiques » (garder un texte libre).
- Rôles / permissions complexes (10 membres, confiance mutuelle).
- Intégrations externes (Doctolib, logiciel métier).
