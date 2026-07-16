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
Supabase fournit Postgres, Auth (email/mot de passe) et **Row-Level Security** clés en main ; compatible avec
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

## 2026-07-16 — Auth : email + mot de passe, session persistante (remplace « lien magique »)

### Décision
**Comptes individuels email + mot de passe** (Supabase `signInWithPassword`), **session persistée sur
le poste** (`persistSession` + `autoRefreshToken` : on se connecte une fois par appareil et on y reste).
Comptes **créés à l'avance par un référent** (Auth → Users → Add user, « Auto Confirm », mot de passe
initial) ; chacun peut changer son mot de passe dans l'app (`updateUser`).

### Contexte
Le lien magique (intention initiale) dépend de l'email ; l'envoi intégré Supabase est **fortement limité
(~2/h)** → risque de blocage pour 10 membres. Le login par mot de passe **n'envoie aucun email**.

### Alternatives envisagées
- **Lien magique** : élégant mais bloqué par la limite d'emails (sauf SMTP custom).
- **SMTP custom** (Resend…) pour garder le magique / le reset : possible plus tard, non requis au MVP.

### Raison du choix
Fiabilité (aucun email au login) + friction faible grâce à la session persistante ; attribution
(commentaires, « ma liste ») préservée.

### Conséquences
Écran connexion = email + mot de passe (**écart maquette** qui montrait le lien magique). Mot de passe
oublié : réinitialisé par le référent au dashboard (ou SMTP custom plus tard). Poste partagé : se
déconnecter / profils navigateur. **Schéma SQL inchangé** (trigger + RLS identiques).

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
  Provenance = colonnes `source_url` · `source_type` (`doctolib|annuaire_sante|site_officiel|carnet_membre|autre`)
  · `source_checked_at` sur `contacts` : d'où vient la donnée et quand elle a été vérifiée → point d'entrée
  d'une future fonction « revérifier la fiche » (index `contacts_checked_idx`, `nulls first`).
- Pipeline = parse → enrichir (avec niveau de confiance) → dédoublonner → relire → charger. Mécanique
  fine décidée à **T-005** ; l'app garde une saisie manuelle simple + détection de doublon.

---

## 2026-07-16 — Décisions issues de la maquette (commentaires, types de contact)

### Décision
- **Info pratique** = 4ᵉ type de commentaire avec **sa propre icône** (bleu `#1f7fd6`), même traitement
  que reco/alerte/spécificité sur la liste **et** la fiche (icône + compteur + popover au survol/tap).
- **Types de contact** : **4 groupes** en surface (Praticien · Structure/établissement ·
  Laboratoire/imagerie · Autre ressource) **+ un sous-type fin optionnel en base** (hôpital, centre de
  santé, structure médico-sociale, transport, réseau/CPTS…) pour filtrer/organiser plus tard.
- **Terminologie** : le type négatif s'appelle **« Alerte »** (= avis négatif / mise en garde).

### Contexte
Retour de la maquette Claude Design : elle surface 3 icônes (reco/alerte/spéc) et 4 boutons de type.

### Raison du choix
Cohérence d'affichage (4 icônes, rien ne passe inaperçu) ; taxonomie souple sans alourdir la saisie.

### Conséquences
Modèle : `comment.type ∈ {reco, alerte, spec, info}` ; `contact.type ∈ {praticien, structure, labo,
autre}` + `contact.sous_type` optionnel. Le composant d'icônes de commentaire gère **4** types.

---

## 2026-07-16 — Recherche et filtres côté client (MVP)

### Décision
La recherche et les filtres s'exécutent **côté client** sur le jeu de fiches chargé (le dataset entier,
commentaires inclus, est chargé à l'ouverture), plutôt qu'en full-text Postgres.

### Contexte
Quelques centaines de fiches, ~10 utilisateurs. La recherche doit inclure le **texte des commentaires**.

### Alternatives envisagées
- Full-text Postgres (tsvector) + recherche serveur : plus lourd, inutile à cette échelle.

### Raison du choix
Simplicité maximale ; recherche tolérante (accents/casse) et recherche dans les commentaires triviales
en JS ; latence nulle. À réévaluer si le volume explose.

### Conséquences
Un chargement initial (fiches + commentaires agrégés + « ma liste »), filtrage en mémoire. Impact IA :
pas de couche FTS à maintenir ; logique de recherche isolée et testable (fonction pure).

---

## Archives

> Une ligne par décision caduque : `YYYY-MM-DD — Titre — remplacée par <décision/date>`.
