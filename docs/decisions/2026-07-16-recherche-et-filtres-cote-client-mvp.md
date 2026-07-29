# 2026-07-16 — Recherche et filtres côté client (MVP)

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
