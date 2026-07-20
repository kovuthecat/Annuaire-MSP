# VALIDATION.md — checklist visuelle / UX (passe humaine)

> Validation **visuelle** déléguée à l'humain, **non bloquante** pour les commits.
> Légende : [ ] à valider · [x] OK · [!] à corriger (décrire dessous).
> Un bloc par écran/module courant. Purger les blocs entièrement `[x]`.
>
> **Comment tester** : sur le déploiement Vercel, ou en local `npm run dev`.
> **Pré-requis** : avoir rejoué `supabase/schema.sql` et avoir un compte (Auth → Users → Add user).
>
> **Note (2026-07-19)** : la V1 est en production et utilisée avec des données réelles — l'essentiel
> a donc forcément été vu à l'usage. Cette checklist n'a jamais été formellement parcourue point par
> point : les blocs restent `[ ]` par défaut de bonne foi (pas de faux `[x]` fabriqué), à cocher au
> fil de l'eau si un doute se présente sur un écran précis, plutôt qu'à traiter comme un blocage.

## Recueil de retours V1 — bouton « Un souci ? » + écran /retours (T-008)

> **Pré-requis spécifiques** : avoir **rejoué `supabase/schema.sql`** (nouvelle section 6) et avoir
> **au moins un compte `role='referent'`** (le vôtre) pour tester `/retours`.

Bouton flottant (toutes les pages sauf connexion) :

- [ ] Le bouton **« 💬 Un souci ? »** est visible en **bas à droite** de l'Annuaire, la Fiche,
      l'Édition, l'Impression, les Membres — et **absent** de l'écran de **connexion**.
- [ ] **Au survol**, un **popover** explique la fonction (contexte + capture joints automatiquement).
- [ ] **Au clic** : le panneau s'ouvre, on choisit une **catégorie** (Problème / Donnée erronée /
      Suggestion), on tape un message ; **« Capture de la page en cours… »** puis une **vignette**
      d'aperçu apparaît avec la case **« Joindre cette capture »** cochée.
- [ ] La ligne de contexte affiche le **bon libellé d'écran** et le **chemin** (ex. depuis une fiche :
      « 📄 Fiche contact · /contact/… »).
- [ ] **Envoyer** → message **« Merci ! Votre retour a bien été envoyé. »** puis fermeture auto.
- [ ] Envoyer avec un message **vide** est refusé (message d'erreur sous la zone de texte).
- [ ] **Sur une fiche avec carte** (Leaflet) : la capture peut montrer la carte **vide/incomplète** —
      c'est **attendu** (html2canvas redessine le DOM, cf. `DECISIONS.md`). Le reste de la page doit
      être lisible.
- [ ] **Impression** (Ctrl+P sur n'importe quelle page, et l'écran Sélection & impression) : le
      bouton et le panneau **n'apparaissent pas** sur l'aperçu d'impression.

Écran /retours (référent) :

- [ ] La pastille **« Retours »** apparaît dans la barre du haut **uniquement pour un référent** ;
      un membre non référent qui ouvre `/retours` est **redirigé** vers l'annuaire.
- [ ] La liste montre les retours **les plus récents d'abord**, avec **catégorie**, **statut**,
      **auteur + date**, message, contexte (📄 écran · URL), et 🖥️ le viewport.
- [ ] Changer le **statut** (Nouveau → En cours → Résolu) met à jour les **compteurs** des filtres.
- [ ] **« Voir la capture »** (présent seulement si une capture existe) ouvre l'image en grand ;
      clic pour fermer.
- [ ] **« Ouvrir la fiche concernée »** (si le retour venait d'une fiche) mène à la bonne fiche.
- [ ] **Supprimer** demande confirmation puis retire le retour de la liste.

## Données — seconde passe open data CNAM (P2/S1)

> Cette session ne touche aucun écran : elle change ce que les écrans **affichent**. À vérifier
> **après avoir rejoué `schema.sql` puis `seed_annuaire.sql`** (le seed est validé au parseur
> PostgreSQL, mais n'a **jamais** été exécuté sur une vraie base : c'est le premier Run qui éprouve
> les `check`, les clés étrangères et les policies RLS).
> Les fiches se retrouvent par leur nom dans la recherche de l'annuaire.

- [ ] **Le seed s'exécute sans erreur** sur la base, et le bloc de contrôle final affiche
      **1 052 contacts · 1 237 commentaires · 1 018 entrées « mes contacts »**.
- [ ] **Dr Wolf** (psychiatre, 12e) — l'unique valeur de carnet écrasée de la passe : la fiche affiche
      **secteur 2**, est en **à vérifier**, et porte une **alerte** citant **les deux** valeurs
      (« le carnet indiquait secteur 1 … la CNAM indique secteur 2 »). *Si l'alerte n'y est pas, c'est
      un bug, pas un détail.*
- [ ] **Dr Echegut** (angiologue, ex-« Etchegut ») — le nom **corrigé** s'affiche, et la graphie
      fautive du carnet **n'apparaît nulle part** dans l'app. Idem **SCHAAN** (ex-SHAAN),
      **HANSS** (ex-HANNS), **FAOUZI Touria** (ex-« FAOUZIA TOURIA »).
      *(Elle reste dans la trace d'audit JSON, `_meta.verbatim_carnet` — non importée en base.)*
- [ ] **Plus aucune fiche n'affiche la graphie fautive d'un nom corrigé**, sous aucune forme (il y en
      avait 3 : « Graphie d'origine dans le carnet… », « Fiche identifiée depuis la note d'origine
      « … » », et une isolée). Vérifiable sur **Dr HAMNY** : le commentaire doit dire
      « Identification : Dr Illias HAMNY, endocrinologue à la Maison de Santé Pelleport… Le carnet
      portait une graphie approchante du nom. » — et **ne plus citer « Amny »**.
- [ ] **Le raisonnement d'identification est resté** : ces fiches sont en « à vérifier » parce que le
      nom a été corrigé ; le commentaire doit toujours dire **qui** est la personne et **sur quelle
      source**, sinon il n'y a pas de quoi trancher. À regarder sur **Dr CORTESSE** (urologue) et
      **Eléonore JUILLARD** (sage-femme), deux identifications données comme « très probables ».
- [ ] **À l'inverse, ne pas s'alarmer** si un commentaire cite une graphie du carnet **là où le nom
      affiché est celui du carnet** : ex. **Dr POPESCU** (« Andreea » sur sante.fr contre « Andrea »
      au carnet — valeur du carnet conservée) et **Dr PETIT** (« Erik »/« Erick »). Là, le
      commentaire explique pourquoi le carnet a gagné. C'est voulu.
- [ ] **Dr Legeais** (cardiologue) — arrondissement **75012** (et non 75020), adresse inchangée
      (« 46 bd de Reuilly »), commentaire expliquant l'incohérence corrigée.
- [ ] **Dr Daval** (ORL, 12e) — l'adresse du carnet (**125** rue de Charenton) est **toujours
      affichée**, avec une alerte signalant le **228** déclaré à l'Assurance Maladie. On ne devait
      **rien** écraser ici : c'est un humain qui tranche.
- [ ] **Étanchéité, le test qui compte** : ouvrir une fiche riche en coordonnées pro (p. ex.
      **Dr Bottero**, infectiologie Saint-Antoine, qui porte deux lignes directes) → lancer
      « Sélection & impression » → **la feuille patient ne montre ni ligne directe, ni bip, ni mail
      d'avis, ni consigne pro**. La passe n'a écrit que dans des champs patient, mais c'est le
      rendu imprimé qui fait foi.
- [ ] **Commentaires sans auteur humain** : les commentaires ajoutés par la passe s'affichent avec
      leur signature d'origine (« Trouvé sur le web » / « Signalé par la MSP ») et **pas** un auteur
      vide — cf. `STATUS.md` §« Deux évolutions de schéma pas encore câblées ».
- [ ] **Centre de santé Haxo** (fiche **Moustin**) : **une seule** alerte de fermeture, pas cinq
      (bug d'idempotence corrigé — c'est le contrôle de non-régression).
- [ ] Coup d'œil général : sur 3-4 fiches au hasard, le secteur affiché est cohérent avec ce que
      Thibault/les médecins savent du praticien. **111 secteurs ont été ajoutés** : si l'un d'eux
      est manifestement faux, le dire — c'est le signal qu'un appariement a dérapé.

## Connexion — écran de connexion

- [ ] Carte centrée fidèle à la maquette (≈380 px, radius 20, pastille « M » en dégradé teal→bleu,
      « MSP Ménilmontant », « Réservé aux membres de la MSP »).
- [ ] Champs **email** + **mot de passe**, bouton « Se connecter » en dégradé pleine largeur.
- [ ] Mauvais mot de passe → message d'erreur lisible, pas de plantage.
- [ ] Connexion réussie → arrivée sur l'annuaire.
- [ ] Mention discrète « Mot de passe oublié ? Contactez le référent ».
- [ ] Sans session, ouvrir `/` redirige vers `/connexion` (sans flash de contenu).
- [ ] **Après F5, on reste connecté** (session persistée sur le poste).
- [ ] Mobile : carte lisible et centrée.

## Layout — barre du haut

- [ ] Dégradé teal→bleu, logo « M » + « MSP Ménilmontant ».
- [ ] Pills de nav (Annuaire · Ajouter/Modifier · Sélection & impression · Membres) ; la pill active
      est plus claire. (Pas d'entrée « Fiche détail » : normal, on ouvre une fiche en cliquant un contact.)
- [ ] Pastille profil = tes initiales (repli sur l'email si profil vide) → menu « Mon profil » / « Se déconnecter ».
- [ ] Déconnexion → retour à `/connexion`.
- [ ] Police Plus Jakarta Sans partout, fond beige `#efece5`.
- [ ] Mobile : la barre ne déborde pas horizontalement.

## Annuaire — écran central (recherche, filtres, sélection)

> La base étant vide au démarrage, prévoir quelques contacts de test (avec commentaires des 4 types,
> `secteur_conv`, `vad`, `ame_cmu`, `tags`, `tel_secretariat`) pour juger les points ci-dessous.

- [ ] Rendu d'une ligne conforme aux 2 PNG de référence (`design/.../project/uploads/pasted-...png`) :
      avatar, nom/profession/arrondissement, badges, icônes de commentaires, téléphone, étoile.
- [ ] Popover au survol (desktop) et au tap (mobile) d'une icône de commentaire.
- [ ] Chips **Secteur 1 / Pédiatrie / Avis** (et **rien d'autre** — VAD, AME/CMU, + Nouveaux patients
      et les 3 menus déroulants ont été retirés, cf. `DECISIONS.md` 2026-07-18) : couleur pleine à
      l'activation (teal / vert / bleu), cumulables entre eux et avec la recherche.
- [ ] **Pédiatrie** : fiches pédiatriques au sens large — pédiatres, spécialistes tagués « pédiatrie »,
      **et** motifs « enfants/adolescents » ou « prend les enfants » (y compris repérés dans un
      commentaire). Vérifier que des psychologues « enfants, adolescents » remontent ; qu'une fiche
      « protection de l'enfance » (social) **ne** remonte **pas**.
- [ ] **Avis** : fiches avec tag « avis » ou télé-expertise / email d'avis / ligne directe (services
      AP-HP inclus). Un badge VAD/AME reste visible sur une ligne concernée même s'il n'y a plus de
      filtre correspondant.
- [ ] Bascule Mes contacts / Tous : style actif (fond blanc + ombre) vs inactif conforme.
- [ ] Compteur de résultats + tri (Pertinence / Nom A→Z / Arrondissement) fonctionnent.
- [ ] Case à cocher d'une ligne → indicateur « N sélectionné(s) → Imprimer » dans la barre du haut.
- [ ] Clic sur une ligne → navigue vers `/contact/:id` (stub tant que S4 n'est pas fait).
- [ ] Étoile (StarToggle) → adopte/retire de « Mes contacts » (persiste après rechargement).
- [ ] État base vide, état recherche sans résultat : messages + boutons de sortie utiles.
- [ ] Responsive mobile : recherche/toggle/chips en colonne, ligne de contact reste lisible.

> Recherche multi-termes + tolérance aux fautes + bouton effacer (cf. `DECISIONS.md` 2026-07-18).
> Auto vert : `npm run test` (20 cas), `npm run typecheck`, `npm run build`.

- [ ] **Multi-termes (ET)** : « kiné 20e » ne renvoie que les kinés du 20e ; « 20e kiné » (ordre
      inverse) donne le même résultat ; « kiné 75e » (arrondissement absent d'une même fiche) → 0.
- [ ] **Fiche + commentaire combinés** : un mot présent seulement dans un commentaire, associé à un mot
      du nom/profession (ex. « dupont diabète »), retrouve bien la fiche.
- [ ] **Faute de frappe** : « cardilogue » remonte les cardiologues, « kinesiterapeute » (h manquant)
      les kinés ; un mot court mal tapé (« line ») ne crée **pas** de faux positif.
- [ ] **Bouton effacer (×)** : apparaît dès qu'on tape, aligné proprement dans la barre ; clic → vide le
      champ et restaure la liste complète.
- [ ] **Classement « Pertinence »** : avec une requête et le tri « Pertinence », les fiches qui matchent
      par le **nom** remontent avant celles qui ne matchent que par un **commentaire**. Sans requête, le
      tri « Pertinence » n'altère pas l'ordre.
- [ ] **Surlignage** : les mots recherchés sont surlignés (fond bleu léger) dans le nom et la ligne
      profession/arrondissement des résultats ; accents et casse d'origine préservés (« Kiné » surligné
      dans « Kinésithérapeute » même si on a tapé « kine »). Un match par faute de frappe n'est pas
      surligné (normal), mais la fiche apparaît quand même.

## Fiche détail (`/contact/:id`)

> Checklist complète : `plans/P1/S4.md` §Bilan de session.

- [ ] En-tête (avatar, identité, badges, tags), « À vérifier » si `statut === 'a_verifier'`.
- [ ] Bloc patient (vert) vs bloc pro (ambre, cadenas) : **étanchéité** — `email_rdv` seulement côté
      patient, `email_avis` seulement côté pro, jamais mélangés.
- [ ] Barre d'actions : ma liste (étoile persistante), sélection impression (reflète la barre du haut),
      Modifier (→ `/contact/:id/modifier`), Signaler à vérifier (devient « Marquée à vérifier »).
- [ ] Commentaires (icônes détaillées + popover), ajout immédiat (4 types), commentaire sans auteur →
      « Extrait de l'ancien répertoire ».
- [ ] États : chargement, erreur, fiche introuvable (id invalide) → retour annuaire.

## Ajouter / Modifier (`/nouveau`, `/contact/:id/modifier`)

> Checklist complète : `plans/P1/S5.md` §Bilan de session.

- [ ] Carte « Essentiel » requise d'emblée ; saisir un nom proche d'une fiche existante → encart
      doublon actionnable (lien « ouvrir »).
- [ ] Sections repliables (Lieu, Adressage & accès, Coordonnées patient/pro, Tags, Commentaires).
- [ ] Tags : ajout/retrait par puce + autocomplétion sur les tags existants.
- [ ] Validation bloquante si type/nom/profession/(création) moyen de contact manquant.
- [ ] Création → retour annuaire, fiche + commentaires en brouillon bien présents ensuite.
- [ ] Édition : formulaire préchargé, pas de champ « moyen de contact », commentaire ajouté visible
      immédiatement sans clignotement de l'écran.

## Sélection & impression (`/impression`)

> Checklist complète : `plans/P1/S6.md` §Bilan de session.

- [ ] Panneau de sélection réordonnable (↑/↓) et retirable ; pilote l'aperçu en direct.
- [ ] **Feuille sans aucune coordonnée pro ni commentaire**, même sur un contact qui en a.
- [ ] Options (en-tête MSP, « Pour : … » non persisté, note libre) reflétées sur l'aperçu.
- [ ] Imprimer / Export PDF (`window.print()`) : seule la feuille est visible dans l'aperçu avant
      impression (barre du haut et panneau masqués).
- [ ] État vide (aucune sélection) → message + retour annuaire.

## Proximité & cartographie (P3) — annuaire + fiche

> Checklists complètes : `plans/P3/S2.md`, `plans/P3/S3.md`, `plans/P3/S4.md` §Checklist visuelle.
> **Pré-requis** : le backfill géo de masse (P3/S1 T2/T3) n'a **pas encore tourné** (différé jusqu'à
> la fin de P2 — Doctolib+web) : les fiches existantes affichent « — »/« Position à préciser » tant
> qu'elles n'ont pas été géocodées individuellement (à la création/modification d'une fiche).

- [ ] Une ligne d'annuaire affiche une distance plausible depuis la MSP ; une fiche sans coordonnées
      affiche « — » (jamais un chiffre inventé).
- [ ] Tri « Distance » (proches en tête, sans-coordonnées en fin) et sélecteur de référence (MSP /
      autre adresse) fonctionnent, avec rappel « adresse non enregistrée ».
- [ ] Créer/modifier une fiche avec adresse → acquiert une position après quelques secondes (géocodage
      en arrière-plan, non bloquant pour l'enregistrement).
- [ ] Annuaire : « Afficher la carte » → carte unique avec les épingles des résultats filtrés + MSP ;
      cliquer une épingle met en évidence la ligne correspondante.
- [ ] Fiche : carte praticien + MSP avec distance affichée, ou « Position à préciser » si pas de
      coordonnées (jamais de carte vide).
- [ ] Fiche : bloc « Transports à proximité » (arrêts + lignes réelles, via le GTFS IDFM — cf.
      `DECISIONS.md` 2026-07-18) cohérent, absent si pas de coordonnées.
- [ ] Responsive mobile sur les 3 points ci-dessus (carte repliée par défaut, pastilles/sélecteur
      lisibles, pas de débordement horizontal).

## Ajout assisté Doctolib (P4)

> Checklist complète : `plans/P4/S1.md`, `plans/P4/S2.md` §Checklist.
> **Test humain restant, décisif pour juger P4 complet** : installer le bookmarklet
> (`tools/doctolib-bookmarklet/README.md`) et le tester sur ≥ 2 vraies pages Doctolib. Si la CSP de
> Doctolib bloque son exécution → P4/S3 (extension navigateur) est à cadrer/exécuter en repli.

- [ ] `/nouveau` sans `prefill` : strictement identique à l'actuel (aucune régression).
- [ ] Bookmarklet sur une vraie page Doctolib → `/nouveau?prefill=…` pré-rempli, bandeau « pré-rempli
      depuis Doctolib — à vérifier » visible, **aucun champ pro rempli**.
- [ ] Enregistrement d'une fiche pré-remplie → statut « à vérifier », provenance Doctolib visible
      (fiche ou base).
- [ ] **Verdict CSP à consigner ici une fois testé** : bookmarklet OK, ou bloqué → déclenche S3.

## Membres

- [ ] Liste des membres : avatar à initiales, nom, `profession · email`, badge « Référent » sur ton compte.
- [ ] « Mon profil » : renseigner prénom / nom / profession → enregistré (confirmer en rechargeant).
      *Important : sans nom, tes commentaires s'afficheront avec ton email.*
- [ ] Changement de mot de passe effectif (se déconnecter puis se reconnecter avec le nouveau).
- [ ] « + Inviter un membre » visible **uniquement en référent** → encart explicatif, aucun appel réseau.

## Facette « Catégorie » + fiches grisées (2026-07-19)

**Automatique (fait) :** `npm run build` + `npm run typecheck` OK ; `npm test` 40/40 vert (le filtre
catégorie est couvert par la logique `matchesFilters`).

**Visuel à vérifier (humain) — écran Annuaire :**
- [ ] Le select **« Toutes catégories »** apparaît dans la rangée de filtres, après la puce « Avis ».
- [ ] Choisir **Ressource** / **Transport sanitaire** (ou une autre) restreint bien la liste ; le
      select passe en surbrillance bleue quand une catégorie est active ; « Réinitialiser les filtres »
      le remet à « Toutes ».
- [ ] Une **fiche grisée** (ex. rechercher « Spolnik » ou « Les Lilas ») s'affiche sur fond beige,
      nom/spécialité en retrait, **sans téléphone**, avec une puce **« ⚠ Ne pas adresser »** (ambre,
      motif `parti`) ou **« À compléter »** (gris, motif `incomplet`) ; le **survol** de la puce montre
      le texte d'alerte (ex. « déménagé à Bordeaux »).
- [ ] Sur une fiche grisée `incomplet`, ajouter une adresse/téléphone (édition) puis recharger →
      elle **n'est plus grisée** (dégrisage auto par le trigger `contacts_clear_grise`).

## Audit pré-partage — ergonomie mobile + desktop (2026-07-19)

**Automatique (fait) :** `npm run build` + `npm run typecheck` OK ; `npm test` 50/50 vert.

**Visuel à vérifier (humain), en particulier sur téléphone (≤ 640 px) :**
- [ ] **Barre de navigation en bas** (mobile) : Annuaire / Ajouter / Impression (+ pastille du nombre
      sélectionné) / « ☰ Plus » ; « Plus » ouvre Membres (+ Retours si référent) ; l'onglet actif est en
      bleu. La barre du haut ne garde que le logo + le profil (plus de nav empilée sur 5 lignes).
- [ ] **Ligne de résultat sur mobile** : repliée en deux niveaux (nom/sous-titre en haut, badges ·
      distance · icônes · tél · étoile en dessous) — **plus aucun chevauchement** du badge « À compléter »
      sur le sous-titre. Desktop : toujours sur une seule ligne.
- [ ] **Toute la ligne ouvre la fiche** (survol = léger relief bleu) ; cliquer la case, le téléphone,
      l'étoile ou une icône de commentaire n'ouvre **pas** la fiche.
- [ ] **Initiales** dans les avatars (annuaire + fiche).
- [ ] **Icônes de commentaires** : survol/tap ouvre le popover titré ; l'infobulle native indique le
      type et le nombre.
- [ ] **Feuille d'impression** : la modalité RDV affiche « RDV : Doctolib » (plus « Doctolib : Doctolib »
      ni d'URL à rallonge).
- [ ] **Ajouter sur mobile** : le hint « Vous pourrez compléter… » est masqué ; Annuler/Enregistrer au
      complet ; le bouton « Un souci ? » ne masque ni la barre d'enregistrement ni la barre du bas.
- [ ] **Premier login** (« Mes contacts » vide, sans recherche) : message d'accueil + bouton « Voir tous
      les contacts », au lieu de « Aucun résultat ».
- [ ] Compteur carte : « N fiches sans adresse localisée ».

## Audit pré-partage #9 — carte, FAB mobile, filtres repliables, sélection, casse, « à compléter »

**Automatique (fait) :** `npm run build` + `npm run typecheck` OK ; `npm run test` 64/64 vert (7 cas
`normalizeNameCasing`, 1 cas filtre `incomplet`).

**Visuel à vérifier (humain) :**
- [ ] **Carte annuaire** : avec un filtre large (ex. aucun filtre), « Afficher la carte » cadre sur
      Paris/petite couronne — **plus de dézoom sur toute l'Europe**. Si des fiches sont géocodées à
      plus de 60 km de la MSP, un second compteur apparaît (« N fiches trop loin de Paris pour la
      carte (> 60 km) ») à côté de « N fiches sans adresse localisée ».
- [ ] **Mobile, bouton « Un souci ? »** : passé à **gauche** en bas (au lieu de droite) sur toutes les
      pages sauf Ajouter/Modifier. Ouvrir le menu **« ☰ Plus »** (bottom nav) : ses entrées (Membres,
      Retours) sont **entièrement visibles**, plus aucun chevauchement avec le FAB. Le popover
      d'explication au survol s'ouvre bien côté gauche (pas de débordement hors écran).
- [ ] **Mobile, filtres repliables** : sous le bandeau recherche/Mes contacts, un bouton **« Filtres
      ▼ »** (avec une pastille du nombre de filtres actifs) remplace le cartouche complet. Cliquer
      l'ouvre/le referme ; sur desktop, le cartouche reste toujours ouvert (pas de bouton visible).
- [ ] **Impression, « Tout vider »** : avec ≥ 1 fiche sélectionnée, un lien **« Tout vider »** apparaît
      à côté de « Sélection (N) » ; cliquer vide la sélection et bascule sur l'état « Aucun contact
      sélectionné ». Absent quand la sélection est vide.
- [ ] **Casse du nom à l'enregistrement** : créer une fiche avec un nom tapé tout en minuscules (ex.
      « jean dupont ») → enregistrée en **« Jean Dupont »**. Un sigle en majuscules (« CSAPA Test »)
      ou une casse déjà posée (« McDonald ») **n'est pas modifié**.
- [ ] **Filtre « À compléter »** : nouvelle puce grise à côté de « Pédiatrie » dans le cartouche de
      filtres ; l'activer ne montre que les fiches grisées `incomplet` (celles qui portent déjà la
      puce « À compléter » sur leur ligne).
