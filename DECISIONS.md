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

---

## 2026-07-18 — Connexion par **prénom** (menu déroulant), au lieu de saisir l'email

### Décision
L'écran de connexion propose un **menu déroulant des prénoms** ; le prénom choisi est **résolu en
email côté client** (`src/features/auth/memberLogins.ts`, map statique) avant `signInWithPassword`.
L'authentification Supabase **reste par email** en interne — c'est une couche d'UX, pas un changement
d'auth. Ne remplace donc pas la décision du 2026-07-16, elle la complète.

### Contexte
Pour ~10 membres, choisir son prénom est plus simple et plus rapide que retrouver/saisir l'email
(certains sont peu mémorisables, ex. `ipamspmenilmontant@tuta.com` = Thibault).

### Compromis assumés
- La RLS interdit de lire `members` sans session → la map prénom→email est **statique dans le bundle**
  (les emails sont visibles à qui inspecte la page publique — acceptable pour un outil interne fermé).
- **Prénoms uniques** requis, sinon collision de login. Ajouter/retirer un membre = éditer
  `memberLogins.ts` **et** `supabase/set_member_prenoms.sql`, puis redéployer.
- Alternative écartée au MVP : Edge Function résolvant l'email côté serveur (emails cachés, plus de
  plomberie).

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

## 2026-07-16 — T-005 exécuté : sources réelles, preuve obligatoire, 3 provenances

Amende la décision « Migration des carnets » ci-dessus, confrontée au terrain. Import livré :
`supabase/seed_annuaire.sql` + `supabase/IMPORT.md` (rapport détaillé).

### Décision

1. **`ameli.fr` ne peut PAS être la source de référence** : `annuairesante.ameli.fr` répond
   *socket closed*, `doctolib.fr` renvoie 403, `aphp.fr` est protégé (Radware). Sources réelles
   retenues : **`sante.fr`** (RPPS, adresse) puis **`lemedecin.fr`** (le seul accessible donnant le
   **secteur conventionnel**), puis sites officiels non-AP-HP.
2. **Pas de preuve, pas de valeur** : toute donnée web écrite porte l'URL d'une page *réellement
   ouverte*, champ par champ (`_meta.enriched` dans `annuaire_donnees.json`, `source_url` en base).
3. **La synthèse rédigée d'une recherche n'est pas une preuve** — seuls les titres/URL le sont.
4. **Le web n'écrit jamais dans un champ pro.** Il peut confirmer qu'un numéro est pro, ou prouver
   qu'un mobile est public (le praticien le publie) → requalification `portable` → `tel_secretariat`.
5. **Le carnet fait foi sur le web**, sauf 4 exceptions : placeholder (`doctolib: "Doctolib"`),
   praticien parti (sur preuve), identité erronée (sur 2 critères concordants — le flag `garbled`
   n'est PAS une condition, il a été posé sans recherche), et **carnet qui doute de lui-même**
   (commentaire « à vérifier » + web qui tranche).
6. **Défaut prudent pour un mobile non qualifié** → champ pro, repromu sur preuve seulement.

### Raison du choix

Le point 3 n'est pas une précaution théorique : sur ce jeu, les synthèses de moteur ont produit
**une vingtaine d'erreurs**, dont un **numéro de téléphone inventé** (la page réelle portait celui
du carnet), des numéros faux **à un chiffre près** (Bluets `…41 08` vs `…41 00`), **deux fausses
fermetures** (Récup'air : la « fermeture » était le congé d'été), deux faux déménagements, et un
annuaire (`hopital.fr`) servant le contenu d'un hôpital sur l'URL d'un autre. Chacune, écrite,
envoyait un patient au mauvais endroit.

Le point 6 suit l'asymétrie du risque : un numéro public classé pro ne s'imprime pas (corrigible
d'un clic) ; un mobile perso de confrère classé patient finit **imprimé sur une feuille remise au
patient** — irrattrapable.

### Conséquences

- **`contacts.email_rdv`** (bloc PATIENT) : le bloc patient n'avait aucun champ mail, ce qui
  forçait les mails **publics** de prise de RDV (`rdv@ghpsj.fr`) dans `email_avis` (pro) — donc
  exclus de la feuille patient alors qu'ils sont faits pour elle. 43 fiches. **À câbler dans l'UI
  et sur la feuille d'impression.**
- **`comments.origine`** + `author_id` **nullable** : un commentaire a soit un auteur humain, soit
  une origine documentée (contrainte `comments_auteur_ou_origine`). Trois provenances :
  `repertoire_partage` (75), `enrichissement_web` (373), `signalement_msp` (1).
  Motif : le xlsx partagé et le web n'ont pas d'auteur, et **signer un avis du nom de quelqu'un qui
  ne l'a pas écrit détruit ce qui fait la valeur d'une reco**. Deux policies rendent ces
  commentaires curables par tout membre (sinon `author_id = auth.uid()` ne matche jamais `null` →
  ineffaçables à vie). **L'UI doit afficher ce libellé au lieu d'un auteur vide.**
- `signalement_msp` existe parce que **le web est en retard sur le terrain** : le centre Haxo a
  fermé (info MSP) alors que les pages en ligne ne documentent que la mobilisation de 2024.
  L'absence de preuve n'est pas une preuve d'absence.
- Reste à faire : `secteur_conv` (120 fiches seulement) et les fiches AP-HP sont le gisement d'une
  seconde passe, si ameli redevient accessible.

### Impact IA

Les 3 spécifications qui ont produit ce jeu sont reproductibles et valent d'être relues avant toute
reprise : elles encodent les pièges réels (homonymes parisiens, `Moisson-Meer`/`Moisson` à la même
adresse, `Néphrologie`/`Neurologie` à une lettre, deux `Alice` gynécologues à la même adresse).

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

## 2026-07-17 — La source **datée** l'emporte : le point 5 de T-005 est amendé

Amende le **point 5** de « T-005 exécuté » (« *Le carnet fait foi sur le web* »). Les points 1 à 4 et 6
sont **inchangés** : ils portent la preuve et l'étanchéité, pas la hiérarchie des sources.

### Décision

**Le critère n'est plus « carnet contre web », c'est « qui est daté, et sur quel champ ».**

1. **Faits administratifs qui dérivent** (`secteur_conv`, `rpps`, `civilite`) : **la source datée la plus
   récente écrit**, y compris contre le carnet. Sur `secteur_conv`, la CNAM n'est pas un témoin —
   **c'est elle qui attribue le statut**.
2. **Jugement, relationnel, consignes, orientation** : **le carnet reste seul.** Aucune source publique
   n'a rien à en dire, donc aucune ne les touche. C'est là qu'était la vraie valeur du point 5.
3. **Rien n'est effacé** : une valeur de carnet remplacée est **antidatée, pas supprimée** — verbatim en
   `_meta` + commentaire `alerte` sourcé portant **les deux valeurs** + `a_verifier`.
4. **Une page déclarative n'écrase rien.** *(arrêté le 2026-07-17 après la mesure de S1 — voir
   l'addendum ci-dessous, qui a annulé le mécanisme « créneaux ouverts → la page écrit » d'abord
   retenu ici.)* Doctolib et les sites de cabinet **remplissent les vides** et **signalent les écarts**
   (commentaire `alerte` sourcé + `a_verifier`) ; **un humain tranche**. Seul un fichier primaire daté
   (CNAM) écrit contre un carnet, et seulement sur `secteur_conv`.
   Corollaire : `mode_rdv` ∈ {en ligne, téléphone, patients adressés, téléconsultation} est une
   **donnée à part entière**, pas un manque — beaucoup de praticiens sont référencés sur Doctolib sans
   prise de RDV en ligne.
5. **Une info de terrain récente prime sur tout** (`signalement_msp`). Ce n'est pas une exception :
   c'est la même règle — la plus récente des sources datées gagne.

### Contexte

Le point 5 a été écrit contre un échec précis : **les synthèses de moteur de recherche**, qui ont
produit un numéro inventé, des numéros faux à un chiffre près, deux fausses fermetures. C'est une règle
de **fiabilité de source**. Elle a été appliquée comme une règle de **fraîcheur** — ce qu'elle n'a
jamais été.

Or les carnets **ne sont pas datés**, et on sait qu'ils ont vieilli : le carnet d'Anne adresse encore
nommément à la **maternité des Lilas, fermée à l'automne 2025** (`IMPORT.md`). Le fichier CNAM, lui,
est daté (2026-07-13) et publié par le producteur de la donnée.

### Alternatives envisagées

- **Garder le point 5 tel quel** : rejeté — il fige `secteur_conv` (la cible de P2) sur la source la
  moins fiable pour ce champ précis, et son motif d'origine ne s'applique pas à un fichier primaire.
- **Inverser en bloc (« toute source publique prime »)** : rejeté — un profil Doctolib à l'abandon est
  *plus vieux* qu'un carnet, et le web ignore les fermetures que la MSP connaît (centre Haxo).
- **Attendre que S1 mesure le taux de désaccord avant de trancher** : rejeté — l'exécutant de S1 lit
  `DECISIONS.md` en contexte et y trouverait la règle contraire. La mesure reste due (S1 §T2), elle
  confirmera ou nuancera l'ampleur, pas le principe.

### Conséquences

- **P2 est cadré là-dessus** : `plans/P2/index.md` §Décisions de cadrage, `S1.md` §« Ce qui change »
  (justification longue), `S2.md` §T3.
- **`IMPORT.md` §Méthode décrit encore le point 5 d'origine** : c'est un **rapport de la première
  passe**, il reste exact *pour ce qu'elle a fait*. À ne pas réécrire — à compléter par la section
  « Seconde passe » (S1) qui porte l'amendement.
- **Passif à rattraper** (mesuré le 2026-07-17 sur `annuaire_donnees.json`) : **156 fiches** portent une
  valeur web vue puis non écrite, dont **59** touchant le secteur. Elles ne vivent **qu'en prose** dans
  `_meta.enrich_note` : aucun champ structuré, et **`_meta` n'est pas importé en base**. Seules **39**
  sont en `a_verifier` et **5** portent un commentaire `alerte` → **115 sont invisibles à la relecture
  humaine**. Rattrapage cadré en S1 §T2 bis.
- **Correction de mesure (2026-07-17)** : `secteur_conv` est renseigné sur **196** fiches, pas 120.
  Le 120 comptait les seules valeurs **écrites par la passe web** (`_meta.enriched`) et oubliait les
  **76 déjà présentes dans les carnets**. Le « 120 » de T-005 §Conséquences et d'`IMPORT.md` §Ce que
  les données ne sont pas est donc **sous-évalué** ; corrigé dans `plans/P2/index.md`. (Le fait que
  `rpps` soit aussi à 196 est une coïncidence : 135 fiches en commun seulement.)
- **Portée réelle des deux sources** (mesurée le 2026-07-17) : elles tranchent l'administratif des
  **571 praticiens** et des centres — **pas tout l'annuaire**. Absents des deux par construction :
  **~250 fiches** (111 hôpitaux, 91 services hospitaliers, 30 associations, PMI/réseaux/CPTS/PASS).
  Et **aucune ne porte les champs qui font la valeur de l'outil** : `consignes_pro` (112),
  `email_avis` (108), `ligne_directe` (64), `orientation` (332), `comments` (685) — que l'étanchéité
  interdit d'écrire de toute façon. P2 fiabilise l'administratif autour du cœur ; il ne touche pas au
  cœur.
- **Deux bugs d'exécution de la 1ʳᵉ passe, indépendants de cet amendement** (cadrés en S1 §T2 ter) :
  1. **8 noms non corrigés** au motif que `_meta.garbled = false` — alors qu'`ENRICH_SPEC.md` l. 170
     dit **« `garbled` n'est PAS une condition d'entrée »** et cite `Boursounian`→Doursounian et
     `SHAAN`→SCHAAN comme exemples. **Ce sont précisément les deux fiches refusées** (idx 72, idx 42) :
     la passe a refusé les cas que la spec avait écrits pour elle.
  2. **Incohérences internes `adresse` ↔ `arrondissement`** (idx 31, 40, 296) verrouillées par « only
     null » : une fiche qui se contredit elle-même n'a pas besoin d'arbitrage de source.
- **Garde-fou contre la sur-correction** : *le carnet plus précis n'est pas le carnet périmé*. Une
  ligne directe rachis (idx 989) bat le standard de sante.fr ; deux numéros peuvent être deux canaux
  (idx 38). L'amendement porte sur la **fraîcheur**, jamais sur la **précision**.
- **La règle « ne remplir que les champs `null` » cesse d'être absolue** : elle bloquait des corrections
  que la première passe savait justes (fiche Legeais : le web tranchait un doute que le carnet
  signalait lui-même — exception 4 de T-005 — et la spec interdisait quand même d'écrire).
  L'écrasement passe **par** le garde-fou « refus d'écraser sans motif » de `recombine.py`, jamais à
  côté.

### Impact IA

Le risque bascule de côté. Avant : écrire une valeur inventée. Maintenant : **écraser sur un faux
match**. Un désaccord CNAM/carnet a deux causes — le carnet a vieilli, **ou ce n'est pas la même
personne** (homonymes parisiens : `Moisson-Meer`/`Moisson`, deux `Alice` gynécologues à la même
adresse). D'où : écrasement autorisé **seulement sur match sûr** (RPPS, ou nom+prénom+CP/adresse), et
calibrage du taux de désaccord sur les matchs RPPS **avant** d'écrire.

### ⚠️ Addendum du 2026-07-17 (soir) — S1 a mesuré, et l'hypothèse était fausse

**Cette décision reposait sur une hypothèse — « les carnets ont vieilli » — que S1 a testée et
réfutée.** La décision **tient**, mais son motif était faux et sa portée est bien plus étroite que
prévu. C'est consigné ici plutôt que réécrit : *l'entrée ci-dessus est ce qu'on croyait, ceci est ce
qu'on a mesuré.*

| Palier de match CNAM | Comparables | Désaccords `secteur_conv` |
|---|---|---|
| haut (nom+prénom+CP+voie+spécialité) | 78 | **1** — 1,3 % |
| bas (nom+prénom+CP) | 41 | **0** |

**Sur 119 fiches où le carnet et la CNAM donnent tous deux un secteur, elles sont d'accord 118 fois.**
Les médecins de la MSP connaissent leurs correspondants. Le gain de S1 n'a pas été la **correction**
(1 valeur — idx 547, Dr Wolf) mais le **remplissage** : `secteur_conv` 196 → 307.

**Ce que l'amendement a réellement rapporté**, ce n'est donc pas la fraîcheur : c'est d'avoir
**débloqué** ce qu'une règle mal appliquée interdisait — 4 noms (dont `HANNS`→`HANSS`, qui a débloqué
son propre match CNAM), 7 arrondissements incohérents avec leur propre adresse, et 13 fiches à valeur
contredite rendues visibles. **12 valeurs remplacées sur 1 052 fiches.**

**Conséquence pour S2 — le pari s'inverse.** Le carnet a tenu tête à la source **autoritaire** dans
98,7 % des cas. Doctolib est **déclarative, non datée, moins autoritaire que la CNAM**. En cas de
contradiction Doctolib ≠ carnet, **le pari le plus probable est que Doctolib a tort.** → Le mécanisme
« créneaux ouverts → la page écrit », retenu au point 4, est **annulé** : Doctolib ne fait que remplir
les vides et signaler les écarts. Voir `plans/P2/S2.md` §T3.

**La leçon de méthode** : la règle « qui est daté l'emporte » reste juste ; c'est la **prémisse
factuelle** (« le carnet est vieux ») qui était une intuition non vérifiée. Elle a tenu quatre échanges
avant qu'une mesure la démente. **Le contrôle de calibrage de S1 a payé son coût à lui seul** — il
existait pour valider la règle, il a servi à la borner.

---

## 2026-07-17 — Claude in Chrome ne prend pas ses consignes dans une page : le protocole revient dans le prompt

### Décision

**Le protocole d'une séance S2 est un prompt**, collé en entier par Thibault au début de chaque
séance : `plans/P2/S2_PROMPT.md`. **L'onglet « Protocole » du Sheet est abandonné comme exécutable** —
il reste comme référence humaine et comme source du texte du prompt.

### Contexte

`S2.md` §T4.4 et `plans/P2/index.md` prescrivaient l'inverse : « le protocole doit vivre dans le
Sheet, pas dans le dépôt », amorce d'une séance = **une phrase**. `gen_worklist_s2.py` produisait
`s2_protocole.csv` pour ça.

**Essayé le 2026-07-17 : Claude in Chrome refuse de travailler à partir du protocole inséré dans le
classeur.** Il traite délibérément tout contenu de page — onglet Google Sheets compris — comme **des
données**, jamais comme **des instructions**. C'est sa **défense contre l'injection de prompt** : sans
elle, n'importe quelle page web pourrait lui donner des ordres. **Ce n'est pas un bug, et ça ne se
contourne pas** — c'est même exactement la propriété qu'on veut d'un agent qui navigue.

**Un second refus a suivi**, de nature différente : sans le contexte du travail, la tâche se présente
comme « ouvre 20 pages Doctolib et extrais-en les données ». Le prompt porte donc aussi la
**justification** — les quatre clauses de `S2.md` §« Pourquoi un navigateur » (fiches ciblées, une par
une, navigateur et session de Thibault, humain présent, outil interne à la MSP) et le risque patient
concret qui motive la session (`Dr Balmain` : un lien pointant sur le profil d'un confrère).

### Alternatives envisagées

- **Onglet « Protocole »** : ne fonctionne pas, cf. ci-dessus. Écartée par constat, pas par arbitrage.
- **Protocole dans le dépôt, lu par Claude in Chrome** : impossible, il n'a pas le système de
  fichiers. C'était le motif d'origine, et il reste vrai.
- **Prompt collé à chaque séance** : retenue. Coût = recoller une page de texte ~12 fois.

### Raison du choix

C'est la seule qui marche, et le coût est payable. **Le raisonnement d'origine était juste sur la
prémisse et faux sur la conclusion** : « il n'a pas le disque, donc mettons les consignes dans la
page » confond *ce qu'il peut lire* et *ce dont il prend ordre*. La bonne conclusion de la même
prémisse était : **les consignes viennent de l'utilisateur, les données viennent de la page.**

### Conséquences

- **Ce que ça ne casse pas — et c'est l'essentiel** : le Sheet reste la mémoire des **données**, ce
  qui était le vrai enjeu de T4 (une séance perdue ne coûte qu'elle-même, écriture après chaque
  fiche). **Seule l'amorce change**, d'une phrase à une page.
- **Deux sources à tenir synchronisées** : `s2_protocole.csv` (via `PROTOCOLE` dans
  `gen_worklist_s2.py`) et `S2_PROMPT.md`. Toute règle modifiée doit l'être aux deux endroits.
- Corrigés sur place : `S2.md` §T4.3, §T4.4, amorce, critères de fin, contexte à lire ;
  `plans/P2/index.md` §Sessions ; commentaire de `gen_worklist_s2.py`.
- **Vagues B et C** : le prompt est réutilisable **à deux mots près** (la vague filtrée, et le
  garde-fou correspondant). Ne pas en réécrire un neuf — c'est celui-ci qui porte la justification du
  travail, la partie la plus coûteuse à reconstituer.

### Impact IA

**Une règle générale, au-delà de S2 : on ne pilote pas un agent navigateur par un document qu'il
navigue.** Tout protocole destiné à Claude in Chrome doit venir du prompt. Un fichier, un onglet, une
page — quelle que soit sa provenance et même si c'est nous qui l'avons écrit — est **de la donnée pour
lui**. La règle à retenir pour tout futur usage : **ce qu'il lit ne le commande jamais.**

Corollaire moins évident, et c'est le second refus : **un agent navigateur a besoin du *pourquoi*, pas
seulement du *quoi*.** Une consigne d'ouvrir des pages en série, présentée nue, est indistinguable
d'une collecte de masse — et refusée à juste titre. Le contexte n'est pas de l'ornement dans le
prompt : c'est ce qui rend la tâche évaluable.

---

## 2026-07-17 — Proximité & cartographie (plan P3) : géo par vol d'oiseau, Leaflet/OSM, BAN, IDFM

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

---

## 2026-07-18 — Arrêts de transport (P3/S4) : GTFS complet + Licence Mobilité, à la place du jeu « arrêts » en licence ouverte

Amende le point 5 de la décision « Proximité & cartographie (plan P3) » ci-dessus (« open data
**Île-de-France Mobilités** embarqué »), qui sous-entendait implicitement la licence ouverte —
seule licence évoquée dans ce document jusqu'ici pour l'open data IDFM/CNAM.

### Décision
Le jeu d'arrêts embarqué de S4 (`src/features/proximite/data/arrets.json`) est construit à partir
du **GTFS complet IDFM** `offre-horaires-tc-gtfs-idfm` (data.iledefrance-mobilites.fr, **Licence
Mobilité**), et non du jeu « arrêts » en Licence Ouverte visé implicitement au cadrage. Le fichier
ne retient que la **topologie statique arrêt↔ligne** (nom, coordonnées, modes, indicatifs de
ligne) — **aucune donnée d'horaire, aucun calendrier**. `stop_times.txt` (la table GTFS qui relie
un arrêt à un trajet, donc à une ligne) n'est qu'un moyen de jointure dans le script de préparation
(`supabase/import/transit_prep.py`), jamais une donnée conservée en sortie.

### Contexte
Au moment de l'implémentation (2026-07-18), le jeu qui aurait permis de rester en Licence Ouverte
tout en reliant arrêt et ligne — `arrets-lignes` (« Arrêts et lignes associées ») — est **vide**
côté IDFM (`records_count = 0`, export CSV sans ligne de données, page d'exploration signalant
elle-même un repeuplement en cours). Aucune autre source `data.iledefrance-mobilites.fr` ne relie
les deux : `arrets` (Licence Ouverte, à jour, 37 956 enregistrements) a les coordonnées mais aucun
champ ligne ; `referentiel-des-lignes` a les lignes mais aucune référence à un arrêt. Détail complet
de cette diligence dans `plans/P3/S4.md` §Bilan de session.

### Alternatives envisagées
- **Attendre le repeuplement d'`arrets-lignes`** : coût nul mais sans date connue ; aurait bloqué la
  fonctionnalité indéfiniment sans garantie.
- **Fabriquer/deviner un mapping arrêt↔ligne** à partir d'une autre source non vérifiée : rejeté —
  viole la règle « ne jamais inventer/deviner » (cf. T-005, mêmes principes que pour les données de
  contact).
- **Livrer un jeu dégradé** (arrêts sans indicatif de ligne) : rejeté — contredit l'objectif même de
  la fonctionnalité (l'exemple UI du plan, « Bus 60, 64 · 150 m », suppose la ligne connue).

### Raison du choix
Présenté à Thibault avec 3 options (attendre, jeu dégradé, GTFS complet) : **choix du GTFS complet**,
en bornant explicitement le travail à la topologie statique — c'est la seule source qui relie
réellement arrêt et ligne aujourd'hui, et se limiter aux fichiers structurels (`stops.txt`,
`trips.txt`, `routes.txt`) plus une lecture en flux de `stop_times.txt` (sans en retenir les
horaires) évite d'importer une complexité (calendriers, exceptions, temps réel) dont la
fonctionnalité n'a pas besoin. Licence vérifiée avant exécution (texte complet de la Licence
Mobilité, version février 2021) : l'Article 5.6.c exempte explicitement l'« Utilisation d'une Base
de données dérivée en interne, au sein d'une organisation » des obligations de partage à
l'identique — couvre exactement le cas d'un outil interne MSP (~10 membres authentifiés, aucune
redistribution publique, aucun usage commercial). Aucune clause bloquante trouvée.

### Conséquences
- **Écart tracé, pas discret** : `plans/P3/S4.md` (§Décision clé de T1 et §Bilan de session) décrit
  la source réelle, l'URL de téléchargement, la taille (~106 Mo compressé), et le pipeline de
  jointure — à relire avant toute reprise ou rafraîchissement du jeu.
- **Approximation assumée sur le mode « rer »** : le `route_type` GTFS ne distingue pas RER de
  Transilien/TER (tous deux `route_type=2`, rail) — le bucket « rer » du fichier généré peut donc
  recouvrir une desserte Transilien/TER (ex. grandes gares parisiennes). Les indicatifs de ligne
  affichés restent exacts ; seule l'étiquette de mode simplifie.
- **Bbox, pas un polygone de commune** : le bornage « Paris + communes limitrophes » est approximé
  par une emprise rectangulaire (Paris intra-muros + marge ~2-3 km), faute de source fiable pour un
  tracé exact — sur-inclusion mineure sans conséquence fonctionnelle (`nearestStops()` filtre de
  toute façon par rayon en mètres).
- **Rafraîchissement futur** : si `arrets-lignes` (Licence Ouverte) redevient non vide, revenir sur
  cette décision est possible sans casser l'existant (même format de sortie `arrets.json`) — mais
  ce n'est pas fait automatiquement, une session dédiée devra retrancher `transit_prep.py`.

### Impact IA
Le script `supabase/import/transit_prep.py` documente cette diligence (source, licence, ce que le
fichier contient/ne contient pas) dans son en-tête, comme les autres scripts de `supabase/import/` —
à lire avant toute reprise plutôt que de redécouvrir la même recherche.

---

## 2026-07-17 — Ajout assisté depuis Doctolib (plan P4) : bookmarklet, pas de scraping serveur

Cadre le plan `plans/P4/`. But : **alléger la saisie** d'un nouveau contact en pré-remplissant le
formulaire depuis une page Doctolib. Rien n'est encore implémenté.

### Décision
Pré-remplir l'écran « Ajouter » via un **bookmarklet un-clic** qui lit la page Doctolib **déjà ouverte
dans le navigateur du membre** et rebondit vers `/nouveau?prefill=<payload>`.

1. **Pas de scraping serveur** : récupérer la page depuis l'app est impossible (T-005 : Doctolib
   renvoie **403**, anti-bot ; le CORS l'interdirait aussi). On passe par le **navigateur du membre**,
   sur une page qu'il consulte légitimement — même philosophie que P2/S2.
2. **Extraction JSON-LD d'abord, DOM en repli**, **heuristique, sans IA, sans donnée qui sort**.
3. **Relais par URL** (`?prefill=` base64url) : une navigation, pas une requête de fond → **pas de
   CORS** ; la session persistée du membre fait le reste.
4. **Provenance & prudence** : fiche pré-remplie en **`statut = 'a_verifier'`**, `source_url` = l'URL
   Doctolib, `source_type = 'doctolib'` ; Doctolib étant **déclaratif et non daté**, **jamais
   d'écrasement** ; relecture humaine obligatoire.
5. **Étanchéité par double barrière** : Doctolib est **destiné aux patients** → n'expose que
   identité/adresse/lien patient ; **et** le lecteur de `prefill` applique une **liste blanche** qui
   rejette tout champ pro. Aucune coordonnée pro ne peut entrer par ce canal.

### Contexte
La saisie manuelle est la friction n°1 de l'adoption. Beaucoup de correspondants ont une page Doctolib
qui porte déjà nom, spécialité, adresse (et souvent des coordonnées GPS en JSON-LD).

### Alternatives envisagées
- **Scraping serveur / fetch de la page** : bloqué (403 + CORS + CGU). Déjà constaté en T-005.
- **Coller-pour-préremplir** (copier le texte de la page) : plus robuste et universel, mais Thibault a
  choisi le **confort du un-clic**. Conservé comme **repli ultime** si l'extension elle-même échoue.
- **Parsing par IA** du texte collé : très robuste mais clé API + coût + latence + **sortie de données**
  → écarté au profit de l'heuristique locale.

### Raison du choix
C'est la seule voie qui « autocomplète depuis une page Doctolib » **sans** violer l'anti-bot ni les
CGU, et sans infrastructure. Le JSON-LD (schema.org) est un point d'extraction **stable**.

### Conséquences
- **Contrat `prefill`** figé en S1 : clés en **liste blanche** patient/identité/lieu, base64url,
  assainissement + bornes de longueur (entrée non fiable). Route `/nouveau` rétrocompatible sans le
  paramètre.
- **Provenance écrite uniquement par ce chemin** : la saisie manuelle reste sans provenance (P1/S5).
- **CSP** : un bookmarklet peut être bloqué par la CSP de Doctolib → **repli mini-extension** (P4/S3,
  **conditionnelle**, déclenchée seulement sur constat), qui réutilise le **même extracteur**
  (`extract.js`, source unique).
- **Synergie P3, non bloquante** : l'`adresse` alimente le géocodage ; le GPS du JSON-LD peut être
  transporté si les colonnes géo existent (dégradation gracieuse sinon).
- **Maintenance continue** assumée : Doctolib change son HTML → adapter l'extracteur (JSON-LD limite la
  casse). Même leçon que P2/S2.

### Impact IA
Le code vit hors de l'app (`tools/doctolib-bookmarklet/`, `tools/doctolib-extension/`) ; la logique
d'extraction est **pure et testable** hors navigateur (fixtures HTML). Le risque d'entrée non fiable est
traité côté app par la liste blanche, pas par la confiance au payload.

---

## 2026-07-18 — Recherche multi-termes, tolérante aux fautes, classée et surlignée + tests

Affine la décision « Recherche et filtres côté client » (2026-07-16) sans en changer l'architecture
(toujours 100 % en mémoire, `src/data/search.ts`, fonction pure).

### Décision
La barre de recherche passe d'un **match sous-chaîne unique** à une **recherche multi-termes en ET** :
la requête est découpée en mots, et un contact est retenu si **chaque** mot apparaît quelque part dans
sa fiche (nom, profession, adresse, arrondissement, tags, **texte des commentaires**), **quel que soit
l'ordre ou le champ**. Un mot d'au moins 4 caractères qui ne matche pas exactement est repêché par
**distance de Levenshtein** (≤ 1 édition de 4 à 6 lettres, ≤ 2 au-delà) pour absorber les fautes de
frappe. Deux ajouts complètent l'expérience :

1. **Classement par pertinence** — l'index est **segmenté et pondéré par champ** (nom 100 >
   profession 60 > méta/tags 40 > localisation 25 > commentaires 15) avec une **qualité de match**
   (exact 1.5 > préfixe 1.2 > sous-chaîne 1.0 > flou 0.6). `relevanceScore()` somme, par terme, le
   meilleur score pondéré ; le tri « Pertinence » l'utilise **dès qu'une requête est saisie** (sans
   requête, l'ordre de `filterContacts` est conservé). Un match sur le nom prime sur un match enfoui
   dans un commentaire.
2. **Surlignage** des termes trouvés dans le nom et la ligne profession/arrondissement des résultats
   (`highlight.ts`, fonction pure ; alignement caractère par caractère pour respecter accents/casse).

La logique de recherche est **couverte par des tests unitaires (Vitest)**.

### Contexte
Avant, taper « kiné 20e » cherchait la sous-chaîne littérale `kine 20e` — jamais présente telle quelle
dans le texte concaténé → 0 résultat. La combinaison profession + arrondissement + tag n'était possible
que par les chips/sélecteurs. Une faute de frappe (« cardilogue ») ne renvoyait rien non plus.

### Alternatives envisagées
- **Full-text Postgres (tsvector)** : réévalué, toujours écarté à cette échelle (cf. 2026-07-16).
- **Fuzzy sur tous les termes, y compris courts** : écarté — trop de faux positifs (« line » ≈ « kine »).
  Le repêchage flou est réservé aux mots ≥ 4 caractères ; les courts restent en sous-chaîne exacte.
- **Surlignage des matches flous** : écarté — on ne sait pas quelles lettres marquer ; seules les
  correspondances exactes en sous-chaîne sont surlignées (le flou reste dans le classement, pas dans
  le rendu).

### Raison du choix
Rend la barre unique réellement combinatoire (le point fort attendu de l'outil) tout en restant trivial
et sans latence. La tolérance aux fautes et le classement réutilisent la distance de Levenshtein déjà
présente pour l'anti-doublon — pas de nouvelle dépendance.

### Conséquences
- Perf : un **index de recherche mémoïsé par contact** (`WeakMap` ; segments pondérés = texte + mots
  uniques par champ) évite de reconstruire le haystack à chaque frappe ; le repêchage flou n'intervient
  qu'après échec des tests exact/préfixe/sous-chaîne et court-circuite dès qu'un terme manque. Le tri
  « Pertinence » calcule le score une fois par contact (décoration) avant de trier.
- **`sort.ts` étendu** : `sortContacts(contacts, sort, reference, query)` ; le cas « pertinence »
  délègue à `relevanceScore` (search.ts). La note « le tri ne touche pas search.ts » (zone S2) est
  **levée par cette décision** : la pertinence *est* une notion de recherche, elle vit dans search.ts
  et sort.ts ne fait que l'appeler.
- **Vitest** ajouté en devDependency ; scripts `npm run test` / `test:watch`. **31 cas** :
  `src/data/search.test.ts` (filtre, multi-termes, flou, `relevanceScore`) +
  `src/features/annuaire/highlight.test.ts`. `tsc` (build) type-checke aussi les tests.
- UI : bouton **« effacer »** (×) dans la barre ; **surlignage** des termes dans les lignes de résultat
  (composant local à `ContactRow`, logique pure dans `highlight.ts`).

### Impact IA
`filterContacts` garde sa signature `(contacts, query, filters)`. Nouveaux exports de search.ts :
`relevanceScore`, `queryTerms`, `normalizeChar`. Toute évolution de la recherche doit passer les tests
existants avant d'ajouter du comportement.

---

## 2026-07-18 — Filtres de l'annuaire recentrés : Secteur 1 / Pédiatrie / Avis

Complète la refonte recherche (même date). Objectif : des filtres **pertinents pour l'adressage**,
pas un tableau de bord.

### Décision
La rangée de filtres passe de « Secteur 1 · VAD · AME/CMU · + Nouveaux patients · Arrondissement ·
Profession · Tag » à **trois chips** : **Secteur 1**, **Pédiatrie**, **Avis**. Tout le reste passe par
la recherche texte (multi-termes), plus rapide à taper (« cardio 75020 ») qu'à sélectionner.

- **Pédiatrie** (`isPediatrie`) = « pédiatr* » **ou** « enfant(s) » dans profession / orientation /
  sous-type / tags **et le texte des commentaires** (beaucoup de motifs disent « enfants, adolescents »
  ou « prend aussi les enfants » sans écrire « pédiatrie »). Volontairement large (~112 fiches) :
  pédiatres, spécialistes à orientation pédiatrique, consultations ouvertes aux enfants. « enfant »
  n'attrape pas « enfance » → la protection de l'enfance (social) reste hors périmètre. Rançon assumée :
  quelques mentions de commentaire non cliniques (ex. hôpital « Necker-Enfants Malades ») peuvent entrer.
- **Avis** (`isAvis`) = tag « avis » **ou** un canal pro d'avis renseigné : télé-expertise, email
  d'avis, **ou ligne directe**. La ligne directe est incluse car elle est à **92 % hospitalière**
  (Tenon, Saint-Antoine… — la ligne d'avis d'un service AP-HP). Union ≈ 192 fiches. Ces champs sont
  **confidentiels** (jamais imprimés côté patient) ; seule leur **présence** sert au filtre.

### Contexte
Sur 1232 fiches : VAD = 13, AME/CMU = 13 (marginaux ; et l'AME ne peut techniquement pas être refusée,
la VAD n'a pas de sens pour un adressage) ; « prend nouveaux patients » = 96 % « inconnu » (filtre
vide de sens) ; 578 tags distincts (un menu déroulant est inutilisable). Les avis étaient répartis, non
unifiés : champs `tele_expertise` (36) / `email_avis` (124) **et** un tag « avis » déjà posé (67).

### Alternatives envisagées
- **Garder les menus Profession/Arrondissement** : redondants avec la recherche texte désormais
  multi-termes ; « cardio 75020 » est plus rapide. Retirés.
- **Avis = tag seul (67)** ou **champs seuls (134)** : chacun rate une partie du réel. L'union (tag +
  champs + ligne directe) maximise le rappel ; sa complétude s'améliorera par curation.
- **Filtre « + Nouveaux patients »** : conservable en théorie, mais 96 % de données « inconnu » → sans
  valeur aujourd'hui. Retiré (réintégrable si la donnée se renseigne).

### Conséquences
- `ContactFilters` réduit à `{ mineOnly, secteurConv, pediatrie, avis }` ; `matchesFilters` allégé
  d'autant. Nouveaux prédicats **purs et testés** `isPediatrie` / `isAvis` (search.ts).
- Les **badges** VAD / AME restent affichés sur les lignes et fiches (on retire le *filtre*, pas
  l'information). Tokens couleur `sector.pediatrie` / `sector.avis` = **réemploi** de teintes existantes
  (vert / bleu), aucune couleur inventée.
- `FiltersBar` et `AnnuairePage` allégés (états, options `distinctValues` supprimées). 6 tests ajoutés.

### Impact IA
« Avis » et « Pédiatrie » sont des **notions dérivées** (pas des colonnes) : leur définition vit dans
`isAvis` / `isPediatrie`. Toute évolution (ex. exiger un tag « avis » explicite) se fait là, avec test.

---

## 2026-07-19 — Recueil de retours V1 : bouton flottant + table `feedback` (vue référent)

Avant de partager la V1 aux ~10 membres, se donner un canal de **retour à faible friction** pour
corriger vite. Cadré et implémenté le même jour (hors plan `P<n>` : petite fonctionnalité à zone
disjointe — 1 table, 1 widget, 1 écran).

### Décision
Un **bouton flottant « Un souci ? »** monté dans le `Layout` (donc sur toutes les pages
authentifiées, jamais sur `/connexion`), avec **popover explicatif au survol**. Au clic, un panneau :
catégorie (🐞 Problème · ✏️ Donnée erronée · 💡 Suggestion), message libre, et **contexte de page
capturé automatiquement** (URL, écran lisible, **fiche concernée** si `/contact/:id`, viewport,
user-agent) + **capture d'écran**. Stockage dans une nouvelle table `public.feedback`. Relecture par
le **référent seul**, sur un écran `/retours` (statut nouveau/en cours/résolu, capture à la demande,
suppression).

Deux arbitrages tranchés avec Thibault :
1. **Capture d'écran = automatique en 1 clic** (`html2canvas`), pas une pièce jointe manuelle : les
   membres sont non techniques, le « zéro geste » prime. Réserves assumées : `html2canvas` **redessine
   le DOM** (ne photographie pas les pixels) → la **carte Leaflet** (tuiles d'un domaine tiers) et
   parfois les polices rendent mal ; la capture est un **indice**, pas une preuve. Image **recadrée sur
   la zone visible** puis **downscalée (≤1400 px) + JPEG q=0.7** avant envoi.
2. **Récupération = vue in-app réservée au référent**, pas seulement le Table Editor Supabase (qui
   reste le filet de secours). Plus confortable pour trier sans quitter l'app.

### Alternatives écartées
- **Pièce jointe manuelle (coller/upload)** : plus fidèle et sans dépendance, mais un geste de plus →
  écarté au profit du confort (audience non technique).
- **Aucune capture (métadonnées seules)** : trop pauvre pour corriger un bug d'affichage décrit par un
  non-technicien.
- **Table Editor Supabase seul** : zéro écran mais oblige à ouvrir Supabase et lire des lignes brutes.
- **Notification e-mail à chaque retour** : demanderait une Edge Function / SMTP (cf. limite d'envoi
  Supabase, §Auth) — hors périmètre V1 ; le référent consulte `/retours`. Réintroductible plus tard.

### Conséquences
- **Nouvelle dépendance `html2canvas`** (1.4.1, types inclus) — tranchée ici, pas ajoutée par un
  exécutant. **Import dynamique** (`import('html2canvas')` au clic) → chunk séparé (~48 Ko gzip),
  **hors du bundle initial**.
- **Schéma** (`supabase/schema.sql` §6) : table `feedback` (RLS **insert = tout membre**,
  **select/update/delete = référent**) + fonction `public.is_referent()` (security definer, même motif
  que `is_member()`). Colonne `screenshot` (data URL) **jamais** sélectionnée en liste ; drapeau léger
  `has_screenshot` pour savoir qu'une capture existe sans la charger ; `loadFeedbackScreenshot` la
  récupère au clic. **`schema.sql` doit être rejoué** sur la base, et le compte de Thibault doit être
  `role='referent'`, sinon `/retours` redirige et la liste reste vide.
- **Étanchéité intacte** : le widget ne lit que l'URL/le contexte d'affichage, ne touche aucun champ
  pro, n'apparaît jamais sur la feuille patient (auto-masqué à l'impression via un `<style>` scopé
  `[data-feedback-ui]`, sans toucher `global.css`).
- **RGPD / interne** : retours **signés** (`author_id` = membre courant, comme les commentaires) ;
  aucune donnée patient. La capture peut montrer l'écran courant (fiches de correspondants) — reste
  entre membres authentifiés, lisible du seul référent.

### Impact IA
Zone isolée `src/features/feedback/` (widget, écran, `context.ts` pur + testé) + `src/data/feedback.ts`
+ `types/db.ts`. Le contexte de page est dérivé du pathname (`pageLabelFor`/`contactIdFrom`, purs,
testés). Évolutions (nouvelle catégorie, notification) se font là, sans toucher au reste.

---

## Archives

> Une ligne par décision caduque : `YYYY-MM-DD — Titre — remplacée par <décision/date>`.

- 2026-07-16 — *T-005, point 5 : « le carnet fait foi sur le web »* — amendée par « La source datée
  l'emporte » (2026-07-17). Les points 1-4 et 6 de T-005 restent en vigueur.
