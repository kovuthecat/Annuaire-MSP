# PROJECT_MAP.md — Annuaire MSP

Carte synthétique du projet — reflète le code réellement en place (V1 en production).

## Vue d'ensemble

- **Type** : web app (Vite + React + TS) à données partagées via Supabase (Postgres + Auth + RLS).
- **Grandes zones** : annuaire (recherche/filtres/carte), fiche (détail), édition (ajout/modif +
  import Doctolib), commentaires (intégrés à fiche/édition), ma-liste (intégrée à annuaire/fiche),
  impression, membres, auth, proximité (distance/carte/transports), feedback (retours V1).
- **Flux principal** : connexion (email + mot de passe, résolu depuis un prénom) → annuaire → fiche →
  adopter/commenter, ou sélection multiple → impression liste patient.
- **Contrainte structurante** : accès réservé aux membres (RLS) ; étanchéité coords patient / coords pro.
- **Outil satellite hors app** : `tools/doctolib-bookmarklet/` — bookmarklet qui préremplit l'écran
  Ajouter depuis une page Doctolib ouverte (pas de scraping serveur).

---

## Arborescence (réelle)

```text
src/
  app/             # Layout (barre du haut + nav mobile), routing, SelectionProvider, hooks partagés
    Layout.tsx
    router.tsx
    SelectionProvider.tsx     # sélection d'impression (état client transitoire, sessionStorage)
    useMediaQuery.ts          # useIsMobile
    useSessionState.ts        # état persistant sessionStorage (recherche, filtres, tri…)
  features/
    auth/          # connexion par prénom → email (memberLogins.ts), session persistée, RequireAuth
    annuaire/      # AnnuairePage, FiltersBar, ContactRow, recherche/tri/surlignage
    fiche/         # FichePage : coords patient/pro, commentaires, blocs adressage/accès
    edition/       # EditionPage (ajout/modif), formState, détection de doublon, DoctolibImportPanel
    impression/    # ImpressionPage, SelectionPanel, SheetPreview, print.css
    membres/       # MembresPage : liste, profil, mot de passe, « inviter » (procédure Supabase)
    proximite/     # géocodage BAN, Haversine, ReferenceProvider (MSP / adresse patient), transit IDFM
    feedback/      # FeedbackWidget (bouton « Un souci ? ») + RetoursPage (référent)
  components/      # UI partagée (Avatar, Badge, CommentIcons, StarToggle, Map/, ui/)
  data/            # DirectoryProvider, directory.ts (accès contacts), auth.ts, feedback.ts
  lib/             # client Supabase
  theme/           # tokens.ts (couleurs/radii), global.css (police self-hostée)
  types/           # db.ts — types partagés (Contact, Comment, Member, Feedback…)

supabase/
  schema.sql        # tables members/contacts/comments/list_entries/feedback + RLS (source de vérité)
  seed_annuaire.sql, seed_split/   # import initial des carnets (rejouable, résout les membres par email)
  set_member_prenoms.sql           # mapping prénom → membre (connexion par prénom)
  import/           # scripts Python rejouables : jointure CNAM, corrections, worklist Doctolib…
  IMPORT.md          # rapport détaillé de l'import + de la seconde passe (CNAM)

tools/
  doctolib-bookmarklet/  # extract.js (source), bookmarklet.txt (généré), tests, README d'install

plans/P1-P4/         # plans de câblage par session (S1, S2…) — le *comment*, historique d'exécution
design/maquettes/     # maquette Claude Design (référence visuelle figée, cf. ARCHITECTURE.md)
```

---

## Features principales

### Feature — annuaire (`src/features/annuaire/`)
Rôle : point d'entrée, recherche tolérante multi-termes + filtres (Secteur 1 / Pédiatrie /
À compléter + facette Catégorie) + bascule mes/tous + carte partagée (Leaflet) + tri (pertinence /
nom / arrondissement / distance).
Points de vigilance : la carte exclut du cadrage automatique les contacts à plus de 60 km de la MSP
(`MAP_FIT_RADIUS_KM`, `proximite/geo.ts`) — sans quoi quelques fiches éloignées dézoomaient la carte
sur toute l'Europe (audit pré-partage #9). Panneau de filtres repliable sur mobile.

### Feature — fiche (`src/features/fiche/`)
Rôle : détail d'un contact — bloc patient (vert) / bloc pro (ambre, cadenas) strictement séparés,
commentaires typés à icônes (reco/alerte/spec/info), transports à proximité, actions (ma liste,
sélection impression, modifier, signaler à vérifier).

### Feature — edition (`src/features/edition/`)
Rôle : créer/modifier une fiche. Carte « Essentiel » requise d'emblée, sections repliables,
détection de doublon en temps réel (`findSimilarContacts`, `src/data/search.ts`), normalisation
douce de la casse du nom à l'enregistrement (`normalizeNameCasing`). `DoctolibImportPanel` explique
le bookmarklet ; le formulaire lit un `?prefill=` (contrat figé, liste blanche patient-only,
`formState.ts`).

### Feature — impression (`src/features/impression/`)
Rôle : produire la feuille patient. **Ne doit jamais inclure coords pro ni commentaires** — vérifié
par test manuel réel (audit du 2026-07-19). Panneau de sélection réordonnable, bouton « Tout vider »
(`useSelection().clear`).

### Feature — proximite (`src/features/proximite/`)
Rôle : géocodage BAN à la saisie, distance à vol d'oiseau (Haversine), sélecteur de référence
(MSP par défaut / adresse patient transitoire, jamais stockée), arrêts de transport IDFM (GTFS
complet, Licence Mobilité) sur la fiche. Carte Leaflet/OSM partagée (`components/Map/`).
Point de vigilance : le backfill géo en masse des fiches existantes (`plans/P3/S1.md` T2/T3) n'a pas
encore tourné — géocodage individuel à la création/modification en attendant.

### Feature — feedback (retours V1, `src/features/feedback/`)
Rôle : recueillir les retours des membres à faible friction. Bouton flottant (`FeedbackWidget`,
`data-feedback-ui` → ignoré à la capture, masqué à l'impression, à gauche sur mobile pour ne pas
chevaucher la nav basse) ; `context.ts` capture le contexte de page (pur, testé) + capture d'écran
(`html2canvas`, import dynamique) ; `src/data/feedback.ts` écrit dans `feedback` (RLS
insert=membre, lecture=référent) ; écran `/retours` réservé au référent.

### Outil — Doctolib bookmarklet (`tools/doctolib-bookmarklet/`)
Rôle : préremplir l'écran Ajouter depuis une page Doctolib déjà ouverte (JSON-LD en priorité, repli
DOM). Testé le 2026-07-19 sur 2 pages réelles ; un bug (structure sans praticien → faux prénom/nom)
trouvé et corrigé, couvert par `extract.test.js`. Hors du bundle app (`esbuild --format=iife`).

---

## Fichiers transversaux importants

### Schéma / persistance
- `supabase/schema.sql` — source de vérité du schéma : `members`, `contacts` (fiche flexible typée +
  colonnes géo + provenance), `comments` (typés, `author_id` nullable + `origine`), `list_entries`
  (adoption), `feedback` (retours V1). RLS partout : accès réservé aux membres authentifiés.
- `src/types/db.ts` — types miroir du schéma, consommés par tout `src/`.
- `src/data/directory.ts` + `DirectoryProvider.tsx` — chargement paginé (le client Supabase plafonne
  à 1000 lignes/requête) et accès aux contacts + agrégation des commentaires/compteurs côté client.

### Recherche
- `src/data/search.ts` — fonctions pures et testées : `filterContacts`, `relevanceScore`,
  `findSimilarContacts` (détection de doublon), `isPediatrie`/`isAvis` (filtres dérivés). 100 % côté
  client (dataset chargé une fois), cf. `DECISIONS.md`.

---

## Zones à risque ou coûteuses en contexte IA

- Politiques RLS (`supabase/schema.sql` §5) — correction = accès/données, à relire avant toute
  modification de schéma.
- Étanchéité coords patient/pro dans la chaîne fiche → sélection → impression (`patientView.ts`,
  `SheetPreview.tsx`) — point vérifié manuellement à plusieurs reprises, ne pas régresser.
- `findSimilarContacts` (détection de doublon) : le test de sous-chaîne peut donner des faux positifs
  sur des noms courts inclus dans un mot plus long (ex. « rime » dans « supprimer ») — connu, pas
  encore corrigé (cf. audit du 2026-07-19).
- `tools/doctolib-bookmarklet/extract.js` : source unique à maintenir, `bookmarklet.txt` est
  **généré** (`node tools/doctolib-bookmarklet/build.cjs`) — ne jamais l'éditer à la main.

---

## Règles locales importantes

- Coords pro : jamais imprimées, jamais communiquées au patient.
- Peu de champs obligatoires à la saisie (adoption).
- Ne jamais deviner une donnée (adresse, nom, secteur…) — laisser vide / marquer « à vérifier »
  plutôt qu'inventer (doctrine posée en migration, tenue depuis dans P3/P4).
