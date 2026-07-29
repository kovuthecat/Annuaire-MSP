# 2026-07-18 — Connexion par **prénom** (menu déroulant), au lieu de saisir l'email

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
