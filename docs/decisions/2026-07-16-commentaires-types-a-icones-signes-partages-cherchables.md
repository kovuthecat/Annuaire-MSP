# 2026-07-16 — Commentaires typés à icônes, signés, partagés, cherchables

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
