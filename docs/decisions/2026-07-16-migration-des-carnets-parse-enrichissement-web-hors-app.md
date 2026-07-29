# 2026-07-16 — Migration des carnets : parse + enrichissement web, hors app

### Décision
Migration **one-shot assistée hors app** : (1) parser les dumps texte en fiches structurées ;
(2) **beaucoup de contacts sont incomplets (parfois un simple nom)** → les **compléter par recherche
web** (adresse, téléphone, spécialité, secteur de conventionnement, RPPS, Doctolib…) ; (3) dédoublonner ;
(4) **relecture humaine avant chargement**. Source de référence : **Annuaire Santé de la CNAM /
ameli.fr** (fait foi : identité, adresse, secteur 1/2), complétée par pages cabinet / Doctolib.

### Contexte
Volume réel ≫ échantillons, formats hétérogènes, orthographes variables, souvent juste un nom.
Adressage médical → une coordonnée erronée envoie le patient au mauvais endroit : l'exactitude prime.

### Raison du choix
La valeur de l'annuaire tient à sa complétude ; l'enrichissement web est faisable (WebSearch/WebFetch).

### Conséquences
- **Ne jamais deviner** : match unique et fiable → on complète ; nom ambigu / homonymes (fréquents à
  Paris) → **laissé « à vérifier »** pour relecture humaine, pas rempli au hasard.
- Fiche enrichie automatiquement → **statut « à vérifier »** + provenance notée, jusqu'à confirmation d'un membre.
  Provenance = colonnes `source_url` · `source_type` (`doctolib|annuaire_sante|site_officiel|carnet_membre|autre`)
  · `source_checked_at` sur `contacts` : d'où vient la donnée et quand elle a été vérifiée → point d'entrée
  d'une future fonction « revérifier la fiche » (index `contacts_checked_idx`, `nulls first`).
- Pipeline = parse → enrichir (avec niveau de confiance) → dédoublonner → relire → charger. Mécanique
  fine décidée à **T-005** ; l'app garde une saisie manuelle simple + détection de doublon.
