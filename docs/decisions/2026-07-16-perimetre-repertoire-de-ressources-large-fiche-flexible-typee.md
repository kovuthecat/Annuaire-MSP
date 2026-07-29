# 2026-07-16 — Périmètre : répertoire de ressources large (fiche flexible typée)

### Décision
Une **fiche unique flexible** avec un champ **type de contact** (praticien · établissement/service
hospitalier · centre de santé · structure médico-sociale · labo · imagerie · transport · ressource
admin/réseau · autre), plutôt qu'un annuaire limité aux praticiens individuels.

### Contexte
Les carnets réels mélangent praticiens, lignes d'avis hospitalières, PASS, centres de santé,
structures médico-sociales, labos, imagerie, transport, protocoles CPTS/UMP. Exclure ces ressources
ferait garder à chacun ses notes à côté → adoption ratée.

### Alternatives envisagées
- Praticiens d'abord, ressources plus tard : plus simple mais couvre mal le besoin réel.

### Raison du choix
Coller à la réalité des données, tout au même endroit. Une seule entité, la plupart des champs
optionnels ; une structure laisse simplement les champs « praticien » vides.

### Conséquences
Champs très majoritairement optionnels ; l'UI adapte l'affichage selon le type.

### Impact IA
Une seule entité « contact » → `PROJECT_MAP.md` simple, pas de polymorphisme lourd.
