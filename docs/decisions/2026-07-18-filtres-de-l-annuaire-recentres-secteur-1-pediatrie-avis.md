# 2026-07-18 — Filtres de l'annuaire recentrés : Secteur 1 / Pédiatrie / Avis

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
