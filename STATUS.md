# STATUS.md — Annuaire MSP

> **Dernière mise à jour :** 2026-07-19 — reconstituée depuis l'état des commits (les sessions
> précédentes de ce fichier avaient dérivé de la réalité, notamment sur « rien n'est commité » /
> « le seed n'a jamais tourné » : les deux sont faux, l'app est en production avec des données réelles).

## Phase actuelle

**V1 en production**, utilisée par les membres de la MSP avec des données réelles (base de
**1 226 contacts**, `supabase/annuaire_donnees.json`, confirmé en base). Dépôt GitHub
`kovuthecat/Annuaire-MSP`, déployé sur Vercel
(`kovu-s-projects/annuaire-msp`, https://annuaire-msp.vercel.app), données sur Supabase.
`npm run build` / `npm run typecheck` / `npm run test` passent à 0 erreur sur l'état courant du dépôt.

## Ce qui fonctionne (vérifié en production, pas seulement au build)

- **Auth** : connexion par prénom (résolu en email côté client, `memberLogins.ts`) → email + mot de
  passe Supabase, session persistée. Écran Membres (liste, profil, mot de passe, « inviter »).
- **Annuaire** : recherche multi-termes tolérante aux fautes + pertinence + surlignage, filtres
  (Secteur 1 / Pédiatrie / À compléter + facette Catégorie, repliables sur mobile), bascule
  mes/tous, tri (pertinence/nom/arrondissement/distance), carte partagée Leaflet (cadrée sur
  Île-de-France, exclut les fiches à >60 km de la MSP du cadrage automatique).
- **Fiche détail** : coords patient/pro étanches, commentaires typés (icônes + popover), ma liste,
  sélection impression, « signaler à vérifier », carte + arrêts de transport à proximité.
- **Ajout/Modification** : saisie essentielle rapide, détection de doublon en temps réel,
  normalisation de la casse du nom, préremplissage depuis Doctolib (`?prefill=`, bandeau « à
  vérifier »), commentaires (brouillon en création, immédiats en édition), **suppression d'une
  fiche** (bouton dans l'écran Modifier, confirmation obligatoire — supprime aussi ses commentaires
  et son statut « ma liste » chez tous les membres, `on delete cascade`).
- **Icône d'installation** (mobile *et* desktop) : manifest (`public/manifest.webmanifest`) + jeu
  d'icônes générées depuis le pictogramme du logo (`public/icon-*.png`, `apple-touch-icon.png`,
  favicons) — l'app affiche sa propre icône à l'ajout sur l'écran d'accueil (mobile) ou à
  l'installation (Chrome/Edge desktop, icône barre des tâches). **Ce n'est pas une PWA hors-ligne**
  (pas de service worker) — l'app a toujours besoin du réseau, seul l'habillage change.
- **Sélection & impression** : panneau réordonnable, bouton « Tout vider », feuille patient sans
  coordonnée pro ni commentaire (vérifié manuellement avec une vraie fiche, audit du 2026-07-19),
  impression/export PDF (`window.print()`).
- **Retours V1** (« Un souci ? ») : bouton flottant sur toutes les pages authentifiées, capture de
  contexte + écran, table `feedback`, écran `/retours` réservé au référent — **actif en production**
  (schéma déjà rejoué, un retour réel y figure).
- **Bookmarklet Doctolib** (`tools/doctolib-bookmarklet/`) : testé le 2026-07-19 sur 2 vraies pages
  (une praticienne individuelle, un centre sans praticien identifié) — extraction correcte sur les
  deux ; un bug trouvé sur le cas structure (nom redécoupé en faux prénom/nom) a été corrigé et
  couvert par un test (`extract.test.js`).

## Import des carnets et enrichissement des données

- **Import initial** (T-005, `supabase/IMPORT.md`) : 4 carnets individuels + l'ancien répertoire
  partagé, dédoublonnés, enrichis, relus → seed exécuté sur la vraie base.
- **Seconde passe open data CNAM** (P2/S1, 2026-07-17) : jointure avec l'Annuaire santé Ameli,
  `secteur_conv` 196 → 307 fiches, 12 valeurs de carnet remplacées (tracées), détail dans
  `supabase/IMPORT.md` §Seconde passe.
- **Enrichissement Doctolib + triage web** (P2/S2, poursuivi après le point du 2026-07-17 consigné
  dans `plans/P2/S2.md`) et **intégration de 2 carnets supplémentaires** (Elena, Maylis) ont fait
  évoluer la base en plusieurs étapes, toutes committées le 2026-07-18/19 : 1 052 → 1 233 → 1 232
  (intégration Elena/Maylis, retrait d'une fiche vétérinaire hors périmètre, commit `fe47f1d`,
  2026-07-18) → **1 226** (triage + passe web par sous-agents sourcée, facette Catégorie, fiches
  grisées ; 6 fiches vides supprimées, 46 grisées, 49 corrections de noms ; commit `5cfd441`,
  2026-07-19 14:27). Le seed a ensuite dû être **découpé en plusieurs fichiers**
  (`supabase/seed_split/`, commit `d6265df`) pour passer dans l'éditeur SQL Supabase, et le
  chargement de l'annuaire **paginé côté client** une fois le seed rejoué (`34ad0f1` — le client
  Supabase plafonne à 1000 lignes par requête, la base dépasse ce seuil). **Le suivi séance par
  séance dans `plans/P2/S2.md` est en retard sur ce qui a réellement été fait** (il s'arrêtait à
  « ≈50 fiches ») — se fier aux commits et à `IMPORT.md` pour l'état réel, pas au tableau de statut
  du plan.
- Fiches grisées (`grise_reason`) pour signaler un départ/une cessation (`parti`) ou une fiche
  encore incomplète (`incomplet`, filtrable dans l'annuaire).

## Ce qui reste (réel, pas hypothétique)

- **Backfill géo de masse** (`plans/P3/S1.md` T2/T3) : différé, non lancé. Les fiches sans adresse
  géocodée individuellement affichent « — » / « Position à préciser ».
- **Test humain bloquant du bookmarklet Doctolib** : un clic réel sur le favori installé (le test du
  2026-07-19 a exécuté le même code en injection script depuis les DevTools, pas via un clic
  `javascript:` littéral) — pour écarter tout blocage CSP avant diffusion aux ~10 membres.
- **Validation visuelle humaine** : checklist vivante dans `VALIDATION.md`, jamais formellement
  purgée malgré l'usage en production — à parcourir si un doute apparaît sur un écran précis.
- **Décisions de triage en attente** (buckets d'arbitrage du travail Doctolib/web, cf.
  `plans/P2/S2.md`) — quelques cas non tranchés restent à statuer avec Thibault.

## Bugs connus

- **Détection de doublon — faux positif sur sous-chaîne** (`findSimilarContacts`,
  `src/data/search.ts`) : un nom saisi peut matcher un nom existant simplement parce que ce dernier
  est une sous-chaîne d'un mot du texte saisi (ex. « supprimer » contient « rime » → propose « Rime »
  comme doublon). Trouvé lors de l'audit du 2026-07-19, **pas encore corrigé**.

## Dette technique

- **Deux corrections de nom historiquement en suspens ont été soldées** dans le triage du
  2026-07-19 (commit `5cfd441`) : `Boursounian` → Doursounian (idx 72) et `SABINIEN` → Sabinen
  (idx 342) sont corrigées, graphie carnet conservée en `_meta.verbatim_carnet`. Aucune correction de
  nom connue en suspens à ce jour.
- Chunk JS principal > 500 kB au build (`vite build` le signale) — pas encore de code-splitting
  supplémentaire au-delà du lazy-load déjà en place (carte Leaflet, `html2canvas`, arrêts IDFM).
