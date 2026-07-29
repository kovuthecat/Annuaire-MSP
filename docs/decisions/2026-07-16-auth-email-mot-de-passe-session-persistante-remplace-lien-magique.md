# 2026-07-16 — Auth : email + mot de passe, session persistante (remplace « lien magique »)

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
