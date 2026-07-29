# 2026-07-16 — Décisions issues de la maquette (commentaires, types de contact)

### Décision
- **Info pratique** = 4ᵉ type de commentaire avec **sa propre icône** (bleu `#1f7fd6`), même traitement
  que reco/alerte/spécificité sur la liste **et** la fiche (icône + compteur + popover au survol/tap).
- **Types de contact** : **4 groupes** en surface (Praticien · Structure/établissement ·
  Laboratoire/imagerie · Autre ressource) **+ un sous-type fin optionnel en base** (hôpital, centre de
  santé, structure médico-sociale, transport, réseau/CPTS…) pour filtrer/organiser plus tard.
- **Terminologie** : le type négatif s'appelle **« Alerte »** (= avis négatif / mise en garde).

### Contexte
Retour de la maquette Claude Design : elle surface 3 icônes (reco/alerte/spéc) et 4 boutons de type.

### Raison du choix
Cohérence d'affichage (4 icônes, rien ne passe inaperçu) ; taxonomie souple sans alourdir la saisie.

### Conséquences
Modèle : `comment.type ∈ {reco, alerte, spec, info}` ; `contact.type ∈ {praticien, structure, labo,
autre}` + `contact.sous_type` optionnel. Le composant d'icônes de commentaire gère **4** types.
