# VALIDATION.md — checklist visuelle / UX (passe humaine)

> Validation **visuelle** déléguée à l'humain, **non bloquante** pour les commits.
> Légende : [ ] à valider · [x] OK · [!] à corriger (décrire dessous).
> Un bloc par écran/module courant. Purger les blocs entièrement `[x]`.
>
> **Comment tester** : sur le déploiement Vercel, ou en local `npm run dev`.
> **Pré-requis** : avoir rejoué `supabase/schema.sql` et avoir un compte (Auth → Users → Add user).

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
- [ ] Chips Secteur 1 / VAD / AME-CMU / + Nouveaux patients : couleur pleine à l'activation.
- [ ] Sélecteurs Arrondissement / Profession / Tag filtrent correctement.
- [ ] Bascule Mes contacts / Tous : style actif (fond blanc + ombre) vs inactif conforme.
- [ ] Compteur de résultats + tri (Pertinence / Nom A→Z / Arrondissement) fonctionnent.
- [ ] Case à cocher d'une ligne → indicateur « N sélectionné(s) → Imprimer » dans la barre du haut.
- [ ] Clic sur une ligne → navigue vers `/contact/:id` (stub tant que S4 n'est pas fait).
- [ ] Étoile (StarToggle) → adopte/retire de « Mes contacts » (persiste après rechargement).
- [ ] État base vide, état recherche sans résultat : messages + boutons de sortie utiles.
- [ ] Responsive mobile : recherche/toggle/chips en colonne, ligne de contact reste lisible.

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

## Membres

- [ ] Liste des membres : avatar à initiales, nom, `profession · email`, badge « Référent » sur ton compte.
- [ ] « Mon profil » : renseigner prénom / nom / profession → enregistré (confirmer en rechargeant).
      *Important : sans nom, tes commentaires s'afficheront avec ton email.*
- [ ] Changement de mot de passe effectif (se déconnecter puis se reconnecter avec le nouveau).
- [ ] « + Inviter un membre » visible **uniquement en référent** → encart explicatif, aucun appel réseau.
