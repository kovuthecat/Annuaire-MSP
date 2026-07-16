# DECISIONS.md — Annuaire MSP

Journal des décisions **transverses / architecturales**. Les plans pointent vers une section précise.

## Format recommandé

Cf. gabarit `Templates/DECISIONS.md` (Décision · Contexte · Alternatives · Raison · Conséquences · Impact IA).

---

## Décisions

## 2026-07-16 — Stack : Vite + React + TS + Supabase + Vercel

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
Supabase fournit Postgres, Auth (lien magique) et **Row-Level Security** clés en main ; compatible avec
le savoir-faire existant. Vercel = déploiement connu.

### Conséquences
Schéma + politiques RLS à concevoir tôt (tâche dédiée). Secrets côté env (jamais commités).

---

## 2026-07-16 — Périmètre : répertoire de ressources large (fiche flexible typée)

### Décision
Une **fiche unique flexible** avec un champ **type de contact** (praticien · établissement/service
hospitalier · centre de santé · structure médico-sociale · labo · imagerie · transport · ressource
admin/réseau · autre), plutôt qu'un annuaire limité aux praticiens individuels.

### Contexte
Les carnets réels mélangent praticiens, lignes d'avis hospitalières, PASS, centres de santé,
structures médico-sociales, labos, imagerie, transport, protocoles CPTS/UMP. Exclure ces ressources
ferait garder à chacun ses notes à côté → adoption ratée.

### Alternatives envisagées
- Praticiens d'abord, ressources plus tard : plus simple mais couvre mal le besoin réel.

### Raison du choix
Coller à la réalité des données, tout au même endroit. Une seule entité, la plupart des champs
optionnels ; une structure laisse simplement les champs « praticien » vides.

### Conséquences
Champs très majoritairement optionnels ; l'UI adapte l'affichage selon le type.

### Impact IA
Une seule entité « contact » → `PROJECT_MAP.md` simple, pas de polymorphisme lourd.

---

## 2026-07-16 — Propriété : pool commun + créateur + adoption ; édition collaborative

### Décision
**Une seule fiche par correspondant** dans un pool commun visible de tous ; chaque fiche a un
**créateur**. **« Mes contacts » = fiches créées OU adoptées** par le membre. **Tout membre peut
modifier** n'importe quelle fiche (édition collaborative), avec historique « modifié par ».

### Contexte
Objectif d'**harmonisation** : éviter les doublons quand plusieurs membres connaissent le même pro.
Besoin d'une liste personnelle (« mes contacts ») sans recréer les fiches.

### Alternatives envisagées
- Propriété stricte par créateur (mes contacts = seulement mes créations) : recrée des silos + doublons.
- Édition réservée au créateur/admin : infos vite obsolètes.

### Raison du choix
Concilie liste personnelle et base commune à jour. Confiance mutuelle (10 membres) → collaboration.

### Conséquences
Table de liaison `membre ↔ contact` pour l'adoption ; champs créé/modifié par+le sur la fiche.

---

## 2026-07-16 — Coordonnées : deux blocs patient / pro

### Décision
Chaque fiche sépare **coordonnées patient** (imprimables) et **coordonnées pro** (confidentielles).
L'impression patient n'affiche **jamais** les coords pro.

### Contexte
Les carnets distinguent partout « à donner au patient » (secrétariat, Doctolib) de « réservé aux
pros » (ligne médecins, bip, portable perso, email d'avis, fax).

### Raison du choix
Sert directement la fonction d'impression sans risque de fuite d'une ligne confidentielle.

### Conséquences
Modèle : coordonnées portant un attribut de visibilité (patient/pro). Distinction visuelle forte à l'UI.

---

## 2026-07-16 — Commentaires typés à icônes, signés, partagés, cherchables

### Décision
Commentaires **catégorisés par type** (recommandation, avis négatif/mise en garde, spécificité, info
pratique — **liste extensible**), **signés + datés**, **visibles par tous**. À l'affichage : une
**rangée d'icônes, une par type, uniquement pour les types présents** (avec compteur), sur la fiche
**et** sur chaque ligne de résultat ; **survol (desktop) / tap (mobile)** révèle les commentaires du
type dans un popover. Le **contenu des commentaires est indexé par la recherche**.

### Contexte
Les carnets sont riches en « reco par X », « à éviter (Mme Y) », spécificités et infos pratiques
(mode d'emploi). Tout afficher noierait la fiche ; et l'info recherchée est parfois dans un commentaire.

### Alternatives envisagées
- Champ « infos pratiques » séparé sur la fiche : redondant avec un type de commentaire → **supprimé**,
  fusionné dans le type « info pratique » (reste daté, signé, cherchable).
- Tout le texte des commentaires affiché inline : noie la fiche.

### Raison du choix
Signal immédiat (a-t-il des recos ? un avis négatif ?) sans encombrement ; la signature responsabilise ;
la recherche dans les commentaires colle à l'endroit réel de l'info.

### Conséquences
Entité `commentaire` (type, auteur, date, texte) liée à la fiche ; la fiche **dérive** ses icônes des
commentaires. Recherche = full-text sur champs fiche + tags + **contenu des commentaires**. RGPD :
accès restreint aux membres. Le jeu de types est extensible (référentiel).

---

## 2026-07-16 — Auth : lien magique, comptes provisionnés

### Décision
**Comptes individuels** via **lien magique** (Supabase Auth), **session longue**, comptes créés à
l'avance par un référent (ou invitation par un membre).

### Contexte
« Comptes individuels mais aussi simple que possible » : il faut l'attribution (commentaires, mes
contacts) sans imposer un mot de passe à retenir.

### Raison du choix
Zéro mot de passe + session persistante = friction quasi nulle tout en gardant l'identité.

### Conséquences
Provisionnement des membres (écran Membres). Accès strictement réservé aux comptes de la MSP (RLS).

---

## 2026-07-16 — Mots-clés transversaux (tags libres)

### Décision
Système de **tags libres multi-valués** par fiche (endométriose, violences, précarité, VAD, pédiatrie,
sommeil, TDAH…), avec autocomplétion sur les tags existants.

### Contexte
De nombreux thèmes traversent les spécialités et ne rentrent pas dans « une profession ».

### Raison du choix
Retrouver d'un coup tout ce qui touche un thème, au-delà de la spécialité, vu la diversité des carnets.

### Conséquences
Tags partagés (référentiel souple) ; éviter la prolifération via l'autocomplétion.

---

## 2026-07-16 — Migration des carnets : parse + enrichissement web, hors app

### Décision
Migration **one-shot assistée hors app** : (1) parser les dumps texte en fiches structurées ;
(2) **beaucoup de contacts sont incomplets (parfois un simple nom)** → les **compléter par recherche
web** (adresse, téléphone, spécialité, secteur de conventionnement, RPPS, Doctolib…) ; (3) dédoublonner ;
(4) **relecture humaine avant chargement**. Source de référence : **Annuaire Santé de la CNAM /
ameli.fr** (fait foi : identité, adresse, secteur 1/2), complétée par pages cabinet / Doctolib.

### Contexte
Volume réel ≫ échantillons, formats hétérogènes, orthographes variables, souvent juste un nom.
Adressage médical → une coordonnée erronée envoie le patient au mauvais endroit : l'exactitude prime.

### Raison du choix
La valeur de l'annuaire tient à sa complétude ; l'enrichissement web est faisable (WebSearch/WebFetch).

### Conséquences
- **Ne jamais deviner** : match unique et fiable → on complète ; nom ambigu / homonymes (fréquents à
  Paris) → **laissé « à vérifier »** pour relecture humaine, pas rempli au hasard.
- Fiche enrichie automatiquement → **statut « à vérifier »** + provenance notée, jusqu'à confirmation d'un membre.
- Pipeline = parse → enrichir (avec niveau de confiance) → dédoublonner → relire → charger. Mécanique
  fine décidée à **T-005** ; l'app garde une saisie manuelle simple + détection de doublon.

---

## Archives

> Une ligne par décision caduque : `YYYY-MM-DD — Titre — remplacée par <décision/date>`.
