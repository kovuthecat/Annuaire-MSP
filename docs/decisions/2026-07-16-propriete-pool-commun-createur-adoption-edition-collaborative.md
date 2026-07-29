# 2026-07-16 — Propriété : pool commun + créateur + adoption ; édition collaborative

### Décision
**Une seule fiche par correspondant** dans un pool commun visible de tous ; chaque fiche a un
**créateur**. **« Mes contacts » = fiches créées OU adoptées** par le membre. **Tout membre peut
modifier** n'importe quelle fiche (édition collaborative), avec historique « modifié par ».

### Contexte
Objectif d'**harmonisation** : éviter les doublons quand plusieurs membres connaissent le même pro.
Besoin d'une liste personnelle (« mes contacts ») sans recréer les fiches.

### Alternatives envisagées
- Propriété stricte par créateur (mes contacts = seulement mes créations) : recrée des silos + doublons.
- Édition réservée au créateur/admin : infos vite obsolètes.

### Raison du choix
Concilie liste personnelle et base commune à jour. Confiance mutuelle (10 membres) → collaboration.

### Conséquences
Table de liaison `membre ↔ contact` pour l'adoption ; champs créé/modifié par+le sur la fiche.
