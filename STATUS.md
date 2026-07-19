# STATUS.md — Annuaire MSP

> **Dernière mise à jour :** 2026-07-18

## Phase actuelle

**Phase 1 — Câblage (plan `plans/P1/`) terminée côté code.** Les 7 sessions (S1-S7) sont faites :
fondations UI, données Supabase, Annuaire, Fiche détail, Ajout/Modif, Sélection & impression, Auth +
Membres. `npm run build` / `npm run typecheck` passent à 0 erreur sur l'état combiné. Reste : validation
visuelle humaine (`VALIDATION.md`) et push.

**Phase 2 — Seconde passe d'enrichissement (plan `plans/P2/`) : S1 faite, S2 et S3 restent.**
L'open data CNAM est joint aux 1 052 fiches (hors ligne, Licence Ouverte). Reste S2 (Doctolib au
navigateur, avec Thibault) puis S3 (consolidation + commit). **Rien n'est encore commité.**

**Phases 3 & 4 — câblées côté code le 2026-07-18, validation visuelle humaine restante.** Deux
nouvelles fonctionnalités cadrées à la demande de Thibault le 2026-07-17, implémentées le lendemain :

- **P3 — Proximité & cartographie** (`plans/P3/`, T-006) : géocodage BAN + distance vol d'oiseau +
  carte Leaflet/OSM (annuaire + fiche) + arrêts de transport IDFM + référence MSP/adresse patient.
  S1 (T1 schéma géo seul), S2 (distance/géocodage à la saisie/pastille-tri/référence), S3 (cartes
  Leaflet annuaire+fiche), S4 (arrêts de transport) faites. **S1 T2/T3 (géocodage BAN en masse +
  rapport) différées** : le backfill doit attendre la fin de la réconciliation Doctolib+web de P2,
  non terminée — sans backfill, les fiches existantes affichent « — »/« Position à préciser » jusqu'à
  géocodage individuel (à la création/modification). **S4 a dû dévier du cadrage** : le jeu open data
  IDFM prévu (`arrets-lignes`, Licence Ouverte) était vide côté IDFM au moment de l'implémentation
  (en cours de repeuplement) ; construit à la place sur le GTFS complet IDFM (Licence Mobilité,
  topologie arrêt↔ligne seulement, sans horaires) — licence vérifiée compatible avec un usage interne
  (`DECISIONS.md`, entrée du 2026-07-18).
- **P4 — Ajout assisté depuis Doctolib** (`plans/P4/`, T-007) : bookmarklet un-clic →
  `/nouveau?prefill=` (liste blanche patient-only, provenance « à vérifier »), extension en repli si
  CSP. S1 (lecteur prefill) et S2 (extracteur + bookmarklet + notice) faits côté code. **Testé le
  2026-07-19 sur 2 vraies pages Doctolib** (audit pré-partage) : praticienne individuelle → quasi
  parfait ; page centre/structure sans praticien → bug trouvé (nom de structure redécoupé en faux
  prénom/nom) et **corrigé** (`extract.js` + `bookmarklet.txt` régénéré + tests
  `extract.test.js`, fixtures = JSON-LD réel des 2 pages). **Reste un test humain bloquant** : un
  clic réel sur le favori installé (le test du 2026-07-19 a exécuté le même code en injection
  script, pas via un clic `javascript:` littéral) — si la CSP de Doctolib bloque ce clic, S3
  (extension navigateur) se déclenche ; sinon P4 est fonctionnellement complet.
- Décisions de cadrage consignées dans `DECISIONS.md` (2 entrées du 2026-07-17 + 1 du 2026-07-18 sur
  la déviation IDFM). **4 colonnes géo ajoutées à `contacts`** (`supabase/schema.sql`, P3/S1 T1) — pas
  encore appliquées à une vraie base (cf. §Ce qui casse, le seed n'a jamais été exécuté).

**Audit pré-partage #9 (2026-07-19) — carte/FAB/filtres/sélection/casse/« à compléter », câblé côté
code.** Suite à un audit desktop+mobile de la V1 déployée (parcours, robustesse, ergonomie,
frictions) : (1) la carte annuaire exclut désormais du cadrage automatique les contacts géocodés à
plus de 60 km de la MSP (`MAP_FIT_RADIUS_KM`, `geo.ts`) — évitait un dézoom sur toute l'Europe à
cause de quelques fiches éloignées ; (2) le bouton flottant « Un souci ? » passe à gauche sur mobile
(hors Ajouter/Modifier) pour ne plus chevaucher le menu « ☰ Plus » de la barre de navigation basse ;
(4) le cartouche de filtres (Filtres + Catégorie) est repliable sur mobile derrière un bouton
« Filtres (N) », ouvert par défaut sur desktop ; (5) un lien « Tout vider » sur l'écran Sélection &
impression vide la sélection en un clic (`useSelection().clear`, déjà existant, juste câblé côté
UI) ; (6) le nom saisi à la création/édition est normalisé en Title Case si tapé tout en minuscules,
sans jamais toucher un mot portant déjà une majuscule (sigle, casse mixte) — `normalizeNameCasing`,
testé ; (7) nouvelle puce de filtre « À compléter » (fiches `grise_reason = 'incomplet'`), pour
orienter l'enrichissement collaboratif. `build`/`typecheck`/64 tests OK. Validation visuelle humaine
restante — cf. `VALIDATION.md` §Audit pré-partage #9.

**Recueil de retours V1 (T-008) — câblé côté code le 2026-07-19, à activer côté base.** Avant le
partage aux membres : bouton flottant « Un souci ? » sur chaque page (popover au survol) → panneau
(catégorie + message + contexte de page capturé auto + capture d'écran `html2canvas`) → table
`feedback`. Vue référent `/retours` (statut, capture à la demande, suppression). `DECISIONS.md`
(2026-07-19) détaille les 2 arbitrages (capture auto ; vue in-app référent). `build`/`typecheck`/45
tests OK. **Bloquant avant usage : rejouer `supabase/schema.sql`** (nouvelle section 6 : table
`feedback`, fonction `is_referent()`, RLS) **et s'assurer que le compte de Thibault est
`role='referent'`** — sinon `/retours` redirige et la liste est vide. Validation visuelle humaine
restante (cf. `VALIDATION.md`).

## Ce qui fonctionne

- Fichiers de contexte instanciés (brief, architecture, décisions).
- Squelette Vite + React + TS : `npm run dev` / `npm run build` OK (build vérifié).
- Dépôt GitHub `kovuthecat/Annuaire-MSP` + projet Vercel `kovu-s-projects/annuaire-msp`.
- Supabase branché : schéma + RLS (`supabase/schema.sql`), client, types, hooks d'accès (`src/data/`).
- Auth email + mot de passe (session persistée), garde de route, écran Membres (profil, mot de passe).
- Écran Annuaire : recherche/filtres côté client, bascule mes/tous, sélection pour impression, icônes
  de commentaires.
- Écran Fiche détail : coords patient/pro étanches, commentaires typés, actions (ma liste, sélection
  impression, modifier, signaler à vérifier).
- Écran Ajout/Modifier : saisie essentielle rapide, sections repliables, détection de doublon,
  commentaires en brouillon (création) ou immédiats (édition).
- Écran Sélection & impression : panneau réordonnable, options, feuille patient (aucune coordonnée pro
  ni commentaire), impression/export PDF via `window.print()`.

## Import des carnets (T-005) — fait, prêt à exécuter

Les 4 carnets individuels + l'ancien répertoire partagé sont extraits, fusionnés, enrichis et prêts
à importer. **Tout est dans `supabase/` — lire `supabase/IMPORT.md` avant d'exécuter.**

- **1 052 contacts** (1 157 fiches brutes dédoublonnées), **1 217 commentaires**, **1 018 entrées
  « mes contacts »** (Anne 313 · Antonin 338 · Charlène 201 · Aurélien 166).
- 56 fiches connues de plusieurs médecins → une seule fiche, les avis de chacun, dans la liste de
  chacun (harmonisation, cf. `DECISIONS.md`).
- 539 fiches portent une `source_url` ; 313 en `a_verifier`.
- `seed_annuaire.sql` s'exécute après `schema.sql`, résout les membres **par email**, et lève une
  exception si un compte manque plutôt que d'importer dans le vide. Ré-exécutable sans doublon.

## Seconde passe — open data CNAM (P2/S1, 2026-07-17)

Les 1 052 fiches ont été confrontées à l'open data « Annuaire santé Ameli » (CNAM, Licence Ouverte,
fichier du 2026-07-13). **Rapport complet : `supabase/IMPORT.md` §Seconde passe.**

- **`secteur_conv` : 196 → 307 fiches** (+111). C'était la cible n°1 du plan.
- **234 fiches matchées**, 678 absentes du fichier (attendu : l'Annuaire santé ne référence que
  l'exercice libéral), **140 non résolues** → c'est le gisement de S2.
- **Les carnets n'avaient pas vieilli sur le secteur** : 1 seul désaccord CNAM/carnet sur 119 fiches
  comparables (1,3 % sur les matchs sûrs). Le gain est le **remplissage**, pas la correction.
- **12 valeurs de carnet remplacées en tout** (4 noms, 7 arrondissements, 1 secteur), **toutes
  tracées** en `_meta.verbatim_carnet`. Aucun champ PRO touché.
- **Une graphie erronée est remplacée, pas exposée** (arbitrage du 2026-07-17) : la graphie fautive
  du carnet ne s'affiche plus nulle part ; elle est rangée dans `_meta.verbatim_carnet` (non importé).
  Elle apparaissait sous 3 formes : 16 commentaires « Graphie d'origine dans le carnet » (supprimés),
  45 « Fiche identifiée depuis la note d'origine « … » » (**réécrits** — la citation part, le
  raisonnement d'identification reste, sans quoi le `a_verifier` serait intranchable), 1 forme isolée.
  Règle inscrite dans `import/ENRICH_SPEC.md`, textes dans `import/notes_origine.py`, **invariant
  vérifié par `audit.py` (contrôle n°6)**.
- Scripts rejouables dans `supabase/import/` : `cnam_join.py` (mode d'emploi en en-tête),
  `corrections_noms.py`, `classe_c.py`, `gen_worklist_s2.py`.
- **Liste de travail de S2 : `supabase/import/s2_worklist.csv`** (1 052 lignes) — elle **remplace**
  `doctolib_worklist.csv` (693 lignes, produite avant la jointure).

## Ce qui casse / n'est pas testé

- Validation visuelle des 7 écrans pas encore faite par un humain — checklist dans `VALIDATION.md`.
- Lint/tests non configurés.
- **Le seed n'a jamais été exécuté sur une vraie base.** Il est validé au parseur PostgreSQL réel
  (`pglast`), mais la syntaxe n'est pas l'exécution : `check`, clés étrangères et policies RLS ne
  seront éprouvées qu'au premier Run.
- **Deux évolutions de schéma (T-005) ne sont pas encore câblées dans l'UI de P1** :
  - `contacts.email_rdv` — mail **public** de prise de RDV (`rdv@ghpsj.fr`, `allergo.tnn@aphp.fr`).
    Champ **PATIENT** : 43 fiches en portent un, et il **doit apparaître sur la feuille patient**.
    Il a été ajouté parce que le bloc patient n'avait aucun champ mail, ce qui forçait ces adresses
    dans `email_avis` (pro) — donc invisibles à l'impression alors qu'elles sont faites pour ça.
  - `comments.origine` — signature d'un commentaire sans auteur humain :
    `repertoire_partage` (« Extrait de l'ancien répertoire », 75 comm.),
    `enrichissement_web` (« Trouvé sur le web », 373), `signalement_msp` (1).
    `author_id` est désormais **nullable** ; l'UI doit afficher ce libellé au lieu d'un auteur vide.
    Les commentaires saisis dans l'app restent signés (la policy `comments_insert` l'impose).

## Bugs connus

- —

## Dette technique

- **`supabase/import/doctolib_worklist.csv` est périmé** : produit avant la jointure CNAM, il ignore
  les 678 fiches que l'open data a classées « absentes du fichier, attendu ». Utiliser
  `s2_worklist.csv`. À supprimer en S3 une fois S2 lancée sur la nouvelle feuille.
- **Deux corrections de nom restent en suspens, faute de source ouvrable** : `Boursounian` →
  Doursounian (idx 72) et `SABINIEN` → Sabinen (idx 342). Hypothèses solides, mais l'open data ne peut
  pas les trancher (l'un est PU-PH hospitalier, hors périmètre CNAM ; le seul Sabinen du fichier est
  dans les Alpes-Maritimes). **À reprendre en S2, sur le web.**
