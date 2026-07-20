# ARCHITECTURE.md — Annuaire MSP

Écrans, navigation, données, découpage technique. **C'est ce fichier qu'on envoie tel quel à
Claude Design** pour dessiner la maquette écran par écran.

> **Auto-suffisant** : Claude Design ne voit QUE ce fichier. Tout le nécessaire est recopié ici.

## Rappel produit (recopié du brief)

- **Objectif** : répertoire partagé de correspondants et ressources d'adressage d'une maison de santé
  (MSP, Paris 20e, ~10 membres). Remplacer les carnets hétérogènes par une base commune enrichie
  collectivement, avec recherche rapide et impression de listes propres pour les patients.
- **Fonctionnalités MVP** : annuaire recherche/filtres/tags · fiche flexible praticien **ou** structure
  · séparation coords patient / coords pro · ajout-édition collaboratif · « mes contacts » (créées +
  adoptées) vs tous · commentaires typés signés · impression liste patient · connexion email + mot de passe.
- **Plateformes cibles** : **web responsive — desktop d'abord** (usage principal au cabinet), **mobile
  pleinement utilisable** (consultation en visite à domicile). Pas d'app native.
- **Priorité n°1** : ergonomie et **adoption**. La recherche et l'ajout doivent être quasi instantanés.
- **Ton visuel** : sobre, professionnel, rassurant (santé) ; dense mais scannable ; accessible
  (contraste, tailles de police confortables). Pas de couleur « notation » agressive.

## Écrans & vues

> Un bloc par écran — matière première de la maquette.

### Écran 1 — Connexion (email + mot de passe)

- **Rôle** : authentifier un membre de la MSP avec une friction minimale.
- **Contenu** : nom/logo de l'outil ; mention « Réservé aux membres de la MSP » ; champ **email** ;
  champ **mot de passe** ; bouton « Se connecter ». Lien discret « Mot de passe oublié ? » (le référent
  réinitialise). *(≠ maquette, qui montrait un lien magique — changé pour éviter la limite d'emails Supabase.)*
- **Actions** : saisir email + mot de passe → connexion. **La session reste ouverte sur le poste**
  (persistée + rafraîchie automatiquement) → on ne se reconnecte quasiment jamais.

### Écran 2 — Annuaire (accueil, écran central)

- **Rôle** : retrouver en quelques secondes un correspondant ou une ressource. **C'est l'écran clé.**
- **Contenu** :
  - **Barre de recherche proéminente** en haut (recherche tolérante accents/casse/fautes ; porte sur
    nom, spécialité, structure, ville, tags **et le contenu des commentaires** — l'info y est parfois notée).
  - **Bascule « Mes contacts / Tous »** bien visible (segmented control).
  - **Filtres** (colonne latérale sur desktop, panneau repliable sur mobile) : type de contact ·
    profession/spécialité · secteur/arrondissement · prend de nouveaux patients · visites à domicile
    (VAD) · accepte AME/CMU · secteur conventionnement (1/2) · mots-clés (tags).
  - **Résultats** en liste de lignes/cartes compactes et scannables. Chaque item : nom (Dr ou
    structure), profession/spécialité ou type, secteur/arrondissement, **badges** (secteur 1/2, VAD,
    AME/CMU, prend nouveaux patients), les **icônes de commentaire par type** (uniquement les types
    présents — ex. 👍 reco, ⚠️ avis négatif — pour repérer d'un coup d'œil), un **téléphone patient
    cliquable**, une **étoile « dans ma liste »** (toggle), une **case à cocher « sélection impression »**.
  - **Tri** (pertinence / nom / arrondissement) · compteur de résultats · bouton **« + Ajouter un contact »**.
  - **Barre de sélection d'impression** qui apparaît dès qu'au moins une case est cochée :
    « N sélectionné·s → Imprimer la liste ».
- **Actions** : rechercher, filtrer, basculer mes/tous, ouvrir une fiche, ajouter/retirer de ma liste,
  cocher pour impression, ajouter un contact.
- **Mobile** : recherche + résultats prioritaires ; filtres dans un panneau ; barre de sélection en bas.

### Écran 3 — Fiche détail

- **Rôle** : toute l'information sur un correspondant/ressource + l'expérience partagée de l'équipe.
- **Contenu** :
  - **En-tête** : nom, profession/spécialité (ou type de structure), badges (secteur, VAD, AME/CMU,
    prend de nouveaux patients, éventuel « à vérifier »), tags.
  - **Bloc « Pour le patient »** (coords patient) — clairement libellé comme communicable : adresse(s),
    téléphone secrétariat, prise de RDV (bouton Doctolib / lien), **email de RDV** public (`email_rdv`,
    à ne pas confondre avec `email_avis` qui est un canal pro confidentiel), site web.
  - **Bloc « Réservé aux pros »** (coords pro) — **visuellement distinct** (teinte différente + icône
    cadenas), avec mention « ne pas communiquer au patient » : ligne directe médecins, bip, portable
    perso, fax, email d'avis / MSSanté, consignes type « préciser être adressé par la CPTS ».
  - **Adressage & accès** : délai indicatif, secteur conventionnement, tarif indicatif, langues, accès
    PMR, télé-expertise/avis rapide.
  - **Commentaires typés, repliés derrière des icônes** : chaque commentaire a un **type**
    (Recommandation · Avis négatif / mise en garde · Spécificité · Info pratique — liste extensible),
    un **auteur** et une **date**. La fiche affiche une **rangée d'icônes, une par type, uniquement
    pour les types présents** (avec compteur) : on voit immédiatement si le pro a des recommandations
    (icône verte) ou des avis négatifs (icône rouge) **sans noyer la fiche**. **Survol (desktop) /
    tap (mobile)** sur une icône → **popover** listant les commentaires de ce type (texte, auteur, date).
    Ajout d'un commentaire : choisir le type + saisir le texte (formulaire compact).
    *Les « infos pratiques » (mode d'emploi, protocole d'accès) sont un type de commentaire, pas un
    champ séparé — elles restent ainsi datées, signées et cherchables.*
  - **Méta** : créé par/le, modifié par/le.
- **Actions (barre)** : « Ajouter à ma liste » (toggle) · « Ajouter à la sélection d'impression » ·
  « Modifier » · « Signaler à vérifier ». Copier un numéro, ouvrir Doctolib, commenter.

### Écran 4 — Ajouter / Modifier une fiche

- **Rôle** : créer ou mettre à jour une fiche ; saisie rapide, enrichissement progressif.
- **Contenu** (formulaire à **sections repliables**) :
  - **Essentiel** (seuls champs vraiment requis, visibles d'emblée) : type de contact · nom ·
    profession/spécialité · au moins un moyen de contact.
  - **Lieu** : établissement/structure, adresse(s), arrondissement/secteur.
  - **Coordonnées patient** / **Coordonnées pro** : deux sous-sections distinctes, chaque coordonnée
    avec son libellé (secrétariat, Doctolib… vs ligne médecins, bip, portable, fax, email d'avis).
  - **Adressage & accès** : prend de nouveaux patients (oui/non/liste d'attente/inconnu), délai, VAD,
    secteur conventionnement, tarif, accepte AME/CMU, PMR, langues, télé-expertise.
  - **Tags** (multi, avec autocomplétion sur tags existants) · RPPS/ADELI (facultatif).
    *(Les infos pratiques et les avis se saisissent en **commentaires typés** depuis la fiche, pas ici.)*
  - Boutons **Enregistrer / Annuler**. En édition : « dernière modification par X le … ».
- **Détail clé** : à la saisie d'un nom proche d'une fiche existante, **proposer d'ouvrir la fiche
  existante** plutôt que d'en créer une en double.

### Écran 5 — Sélection & impression (liste patient)

- **Rôle** : produire une feuille d'adressage propre à remettre au patient.
- **Contenu** :
  - **Panneau de sélection** : contacts cochés, **réordonnables** et retirables.
  - **Options** : en-tête MSP (logo + nom + adresse de la MSP) ; « Établi le … » ; champ libre
    optionnel « Pour : [prénom du patient] » (non enregistré) ; note libre en bas de page.
  - **Aperçu de la feuille** : par contact, **uniquement les infos patient** (nom, spécialité,
    adresse, téléphone patient, modalité de RDV / Doctolib), éventuellement groupées par spécialité.
    **Aucun commentaire, aucune coordonnée pro.**
  - Boutons **Imprimer** / **Exporter en PDF**.
- **Actions** : réordonner, retirer, régler les options, imprimer/PDF.

### Écran 6 — Membres (léger)

- **Rôle** : gérer qui accède à l'outil.
- **Contenu** : liste des membres (nom, profession, email) ; bouton **« Inviter un membre »** (email →
  crée le compte + mot de passe initial) ; marquage « référent » optionnel ; édition de son propre profil.
- **Actions** : inviter un membre, modifier son profil.

## Navigation & parcours

- **Écran d'entrée** : Annuaire (après connexion).
- **Flux principal** : Annuaire → (recherche/filtre) → Fiche détail → (adopter / commenter / sélectionner).
- **Flux impression** : Annuaire → cocher plusieurs contacts → Sélection & impression → PDF/impression.
- **Navigation secondaire** : barre supérieure persistante — accueil/logo, recherche, bascule mes/tous,
  « + Ajouter », **sélection d'impression avec compteur**, menu compte/membres.

## Données affichées

> Entités et champs visibles à l'UI (pas le schéma complet).

- **Contact / Ressource** : type (praticien · établissement/service hospitalier · centre de santé ·
  structure médico-sociale · laboratoire · imagerie · transport · ressource admin/réseau · autre) ;
  nom (personne ou structure) ; civilité, prénom (si praticien) ; profession/spécialité ; orientation
  libre (« spé endométriose ») ; établissement ; adresse(s) ; arrondissement/secteur ;
  **coords patient** (secrétariat, Doctolib/lien, site, **email de RDV** public) ; **coords pro** (ligne médecins, bip,
  portable, fax, email d'avis/MSSanté) ; prend de nouveaux patients (oui/non/liste/inconnu) ; délai ;
  VAD (oui/non) ; secteur conventionnement (1/2/centre/non conv.) ; tarif indicatif ; accepte AME/CMU
  (oui/non/inconnu) ; PMR ; langues ; télé-expertise ; tags (multi) ;
  statut (actif / à vérifier / ne prend plus) ; créé & modifié par/le ; « dans ma liste » (indicateur) ;
  sélection impression (état transitoire) ; icônes de commentaire présentes (dérivées des commentaires).
- **Commentaire** : type (recommandation / avis négatif / spécificité / info pratique — extensible) ;
  auteur ; date ; texte. **Contenu indexé par la recherche.**
- **Membre** : nom ; profession ; email ; rôle (membre / référent).

## Contraintes UI

- **Recherche instantanée et tolérante** (accents, casse, fautes légères) = priorité absolue.
- **Desktop-first**, **responsive mobile complet** (visite à domicile).
- **Distinction visuelle forte coords patient ↔ coords pro** (couleur + icône cadenas) ; les coords pro
  ne doivent jamais apparaître sur la feuille patient.
- **Commentaires repliés derrière des icônes par type** (une par type, seulement si présent, avec
  compteur ; survol/tap pour révéler) : la fiche signale l'existence d'une reco / d'un avis négatif
  sans afficher tout le texte. La **recherche** porte aussi sur leur contenu.
- **Ajout d'une fiche à friction minimale** : peu de champs requis, sections repliables.
- Densité maîtrisée : badges lisibles, listes scannables ; commentaires distingués par un badge discret.
- Ton sobre, professionnel, rassurant ; accessible.

---

## Découpage technique

> Sans effet sur la maquette — fixe la structure du code (feature-first : `CONVENTIONS.md`).

- **Features** : `annuaire` (liste/recherche/filtres) · `fiche` (détail, coords patient/pro, infos
  pratiques) · `edition` (formulaire ajout/édition + détection de doublon) · `commentaires` (typés) ·
  `ma-liste` (adoption, bascule mes/tous) · `impression` (sélection + feuille patient) · `membres`
  (invitations, profil) · `auth` (email + mot de passe).
- **État / persistance** : Supabase (Postgres + **RLS** restreignant l'accès aux membres authentifiés).
  Auth via Supabase email + mot de passe (session persistée). La sélection d'impression est un **état client transitoire**.
- Arbitrages structurants → `DECISIONS.md`.

---

## Maquette UI

- **Statut** : [ ] à dessiner · [x] dessinée (Claude Design, 2026-07-16) · [x] **câblée** (plan P1,
  puis étendue par P2-P4 et l'audit pré-partage — cf. `STATUS.md` pour l'état courant)
- **Exports** : `design/maquettes/design-annuaire-msp/` — écran principal (tous les écrans via états) :
  `project/MSP Annuaire.dc.html` ; variante `project/MSP Annuaire - Options.dc.html` ; logo
  `project/uploads/Logo MSP Ménilmontant couleur.jpg` ; aperçus PNG des lignes d'annuaire.
  **Le câblage recrée le rendu fidèlement** (les `.dc.html` sont des prototypes, pas du code de prod).

### Design system (extrait des maquettes — référence de câblage)

- **Police** : Plus Jakarta Sans (400→800). **Fond app** : `#efece5` (beige chaud). Cartes `#fff`,
  bordures `#efe9dc`/`#e6e2d8`, radius 12–16 px, ombres très douces.
- **Dégradé primaire** : `#0f9f8e` (teal) → `#1f7fd6` (bleu) — barre du haut, boutons principaux,
  avatars. Liens `#1f7fd6` (hover `#0f9f8e`).
- **Couleurs sémantiques** : Secteur 1 vert (`#0f9f8e` / fond `#e4f5f2`) · Secteur 2 violet (`#7a6ec9`
  / `#eeecfb`) · AME/CMU ambre (`#b8894a` / `#fbf0e0`) · VAD bleu (`#1f7fd6` / `#e7f1fc`) · Prend
  nouveaux patients vert (`#3aa876` / `#e9f7ef`).
- **Commentaires — 4 types** : **Recommandation** pastille verte `#3aa876` · **Alerte** (= avis
  négatif / mise en garde) triangle orange `#d3843d` · **Spécificité** losange violet `#7a6ec9` ·
  **Info pratique** bleu `#1f7fd6`. Affichage : icône + compteur, popover au survol (desktop) / tap.
- **Coordonnées** : bloc **patient** sur fond vert (`#f4f9f8`), bloc **pro** sur fond ambre (`#fbf5ea`)
  avec icône cadenas + « Réservé aux pros — ne pas communiquer au patient ».
- **Écrans** : Connexion (email + mot de passe) · Annuaire (recherche mentionnant « un commentaire » + toggle
  Mes contacts/Tous + chips de filtres + lignes) · Fiche (2 blocs coords + rangée d'icônes commentaires
  + « Signaler à vérifier ») · Ajout/Modif (carte « Essentiel » requise + `<details>` repliables +
  détection de doublon + barre d'enregistrement collante) · Sélection & impression (panneau gauche +
  aperçu feuille patient, en-tête MSP, sans commentaires ni coords pro) · Membres (liste + inviter).

### Écarts maquette ↔ architecture (à câbler / trancher)

1. **Types de contact** : la maquette regroupe en **4 boutons** (Praticien · Structure/établissement ·
   Laboratoire/imagerie · Autre ressource) au lieu de la liste fine (9) de « Données affichées ».
   → **tranché** : 4 groupes en surface + `sous_type` fin optionnel en base (cf. `DECISIONS.md`).
2. **Commentaire « Info pratique »** : → **tranché** — **4ᵉ icône** (bleu `#1f7fd6`) sur liste **et**
   fiche, comme reco/alerte/spécificité (survol/popover). Cf. `DECISIONS.md`.
3. **Terminologie** : « **Alerte** » (maquette) = « avis négatif / mise en garde » (archi) → on retient
   **Alerte** partout.
4. **Barre de nav** : les pills incluent « Fiche détail » = **artefact de démo** ; en prod la fiche
   s'ouvre en cliquant un contact (pas d'entrée de menu).
5. **Filtres** : la maquette montre quelques chips (Secteur 1, VAD, AME/CMU, +Nouveaux patients,
   Arrondissement) ; **profession/spécialité et tags** à ajouter au câblage (panneau de filtres complet).
6. **Connexion** : la maquette montre un **lien magique** ; on câble **email + mot de passe** (session
   persistée) — la limite d'emails Supabase (~2/h) rend le magique peu fiable. Cf. `DECISIONS.md` §Auth.
