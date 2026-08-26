# STATUS.md — Annuaire MSP

Photo à l'instant T : ce qui marche, ce qui casse. Mis à jour en fin de session.
Plafond : 80 lignes (appliqué par hook). Historique détaillé : `git log` + `docs/decisions/`.

> **Dernière mise à jour :** 2026-07-21

## Phase actuelle

**V1 en production**, utilisée par les membres de la MSP avec des données réelles (**1 226
contacts**). Dépôt `kovuthecat/Annuaire-MSP`, déployé sur Vercel (`annuaire-msp.vercel.app`),
données sur Supabase. `npm run build` / `typecheck` / `test` passent à 0 erreur.

## Ce qui fonctionne (vérifié en production)

- **Auth** : connexion par prénom (résolu en email côté client) → email + mot de passe Supabase,
  session persistée. Écran Membres (liste, profil, mot de passe, « inviter »).
- **Annuaire** : recherche multi-termes tolérante aux fautes + pertinence + surlignage, filtres
  (Secteur 1 / Pédiatrie / À compléter + facette Catégorie), tri, carte partagée Leaflet.
- **Fiche détail** : coords patient/pro étanches, commentaires typés, ma liste, sélection
  impression, « signaler à vérifier », carte + arrêts de transport à proximité.
- **Ajout/Modification** : saisie rapide, détection de doublon, préremplissage Doctolib
  (`?prefill=`), suppression de fiche (cascade commentaires + « ma liste »).
- **Icône d'installation** (mobile et desktop, pas une PWA hors-ligne — toujours besoin du réseau).
- **Sélection & impression** : feuille patient sans coordonnée pro ni commentaire.
- **Retours V1** (« Un souci ? ») : bouton flottant, table `feedback`, écran `/retours` référent —
  actif en production.
- **Bookmarklet Doctolib** : testé sur 2 pages réelles (praticien individuel, centre).
- **Import/enrichissement des données** : base à 1 226 contacts (import initial T-005 + seconde
  passe open data CNAM + enrichissement Doctolib/web + 2 carnets supplémentaires) — détail des
  étapes dans `git log` et `supabase/IMPORT.md`. Chargement de l'annuaire paginé côté client (le
  client Supabase plafonne à 1000 lignes/requête).

## Ce qui reste (réel, pas hypothétique)

- **Backfill géo de masse** : différé, non lancé. Fiches sans adresse géocodée → « Position à préciser ».
- **Test humain bloquant du bookmarklet Doctolib** : un clic réel sur le favori installé (le test
  fait a exécuté le même code par injection DevTools, pas un clic `javascript:` littéral) — à faire
  avant diffusion aux ~10 membres.
- **Décisions de triage en attente** : quelques cas non tranchés du travail Doctolib/web restent à
  statuer avec Thibault.

## Non encore déployé

- **Correctifs retours V1 mobile** (2026-07-20) : popover commentaires qui débordait, carte Leaflet
  sous la barre de nav, « Paris 20 » ≠ « 75020 » à la recherche — corrigés côté code, build/typecheck/
  test verts, **validation visuelle humaine à faire** (`VALIDATION.md`) avant déploiement.
- **Téléphone pro/perso des membres** (2026-07-21) : colonnes + UI faites, build/typecheck/test
  verts. **Migration prod à appliquer avant déploiement** (rejouer `supabase/schema.sql`, idempotent)
  + validation visuelle à faire.
- **Listes d'impression nommées et favorites** (2026-08-07) : tables `print_lists`/`print_list_items`/
  `print_list_favorites` + RLS, écrans `/listes` et `/listes/:id`, raccourci « Enregistrer comme
  liste » depuis l'écran impression — cf. `docs/decisions/2026-08-07-…`. Build/typecheck/test verts ;
  N1 partiel (écran de connexion vérifié au navigateur, flux authentifié non testé — pas
  d'identifiants). **Migration prod à appliquer avant déploiement** (rejouer `supabase/schema.sql`) +
  validation visuelle humaine à faire (cf. `VALIDATION.md`).
- **4e carnet supplémentaire intégré — Clara** (2026-08-10) : `Downloads/Correspondants Clara.pdf`
  (24 lignes), pipeline extraction+dédup+enrichissement web (jamais Doctolib comme source) rejouée à
  la main vu le petit volume. 13 fiches déjà connues enrichies (owner clara + quelques champs/comments
  neufs) + 7 fiches vraiment nouvelles (dont 2 entièrement complétées par recherche web, carnet trop
  mince). 1 fiche laissée `a_verifier` (IAPR — pertinence patient vs équipe MSP ambiguë, à trancher
  avec Clara). `supabase/annuaire_donnees.json` mis à jour (1226→1233 fiches, backup
  `annuaire_donnees.bak-clara-2026-08-10.json`). **Pas encore appliqué en base de prod** :
  `supabase/import/seed_clara_incremental.sql` généré (script `gen_sql_clara_incremental.py`,
  incrémental et idempotent — ne touche que les 20 fiches concernées, pas un reseed complet) mais pas
  exécuté, en attente de confirmation.

## Bugs connus

- **Détection de doublon — faux positif sur sous-chaîne** (`findSimilarContacts`) : un nom saisi
  peut matcher un nom existant si ce dernier est une sous-chaîne d'un mot du texte saisi. Pas encore
  corrigé.

## Dette technique

- Chunk JS principal > 500 kB au build — pas de code-splitting supplémentaire au-delà du lazy-load
  déjà en place (carte Leaflet, `html2canvas`, arrêts IDFM).
