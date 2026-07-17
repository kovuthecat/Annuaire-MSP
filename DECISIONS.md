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

## Archives

> Une ligne par décision caduque : `YYYY-MM-DD — Titre — remplacée par <décision/date>`.

- 2026-07-16 — *T-005, point 5 : « le carnet fait foi sur le web »* — amendée par « La source datée
  l'emporte » (2026-07-17). Les points 1-4 et 6 de T-005 restent en vigueur.
