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

## Membres

- [ ] Liste des membres : avatar à initiales, nom, `profession · email`, badge « Référent » sur ton compte.
- [ ] « Mon profil » : renseigner prénom / nom / profession → enregistré (confirmer en rechargeant).
      *Important : sans nom, tes commentaires s'afficheront avec ton email.*
- [ ] Changement de mot de passe effectif (se déconnecter puis se reconnecter avec le nouveau).
- [ ] « + Inviter un membre » visible **uniquement en référent** → encart explicatif, aucun appel réseau.

## Écrans encore non câblés (normal à ce stade)

Annuaire, Fiche détail, Ajouter/Modifier, Sélection & impression affichent « Écran … — à câbler ».
