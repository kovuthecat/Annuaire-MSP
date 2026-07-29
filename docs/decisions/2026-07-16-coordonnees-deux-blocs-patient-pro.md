# 2026-07-16 — Coordonnées : deux blocs patient / pro

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
