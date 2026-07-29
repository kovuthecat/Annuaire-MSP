# 2026-07-18 — Arrêts de transport (P3/S4) : GTFS complet + Licence Mobilité, à la place du jeu « arrêts » en licence ouverte

Amende le point 5 de la décision « Proximité & cartographie (plan P3) » ci-dessus (« open data
**Île-de-France Mobilités** embarqué »), qui sous-entendait implicitement la licence ouverte —
seule licence évoquée dans ce document jusqu'ici pour l'open data IDFM/CNAM.

### Décision
Le jeu d'arrêts embarqué de S4 (`src/features/proximite/data/arrets.json`) est construit à partir
du **GTFS complet IDFM** `offre-horaires-tc-gtfs-idfm` (data.iledefrance-mobilites.fr, **Licence
Mobilité**), et non du jeu « arrêts » en Licence Ouverte visé implicitement au cadrage. Le fichier
ne retient que la **topologie statique arrêt↔ligne** (nom, coordonnées, modes, indicatifs de
ligne) — **aucune donnée d'horaire, aucun calendrier**. `stop_times.txt` (la table GTFS qui relie
un arrêt à un trajet, donc à une ligne) n'est qu'un moyen de jointure dans le script de préparation
(`supabase/import/transit_prep.py`), jamais une donnée conservée en sortie.

### Contexte
Au moment de l'implémentation (2026-07-18), le jeu qui aurait permis de rester en Licence Ouverte
tout en reliant arrêt et ligne — `arrets-lignes` (« Arrêts et lignes associées ») — est **vide**
côté IDFM (`records_count = 0`, export CSV sans ligne de données, page d'exploration signalant
elle-même un repeuplement en cours). Aucune autre source `data.iledefrance-mobilites.fr` ne relie
les deux : `arrets` (Licence Ouverte, à jour, 37 956 enregistrements) a les coordonnées mais aucun
champ ligne ; `referentiel-des-lignes` a les lignes mais aucune référence à un arrêt. Détail complet
de cette diligence dans `plans/P3/S4.md` §Bilan de session.

### Alternatives envisagées
- **Attendre le repeuplement d'`arrets-lignes`** : coût nul mais sans date connue ; aurait bloqué la
  fonctionnalité indéfiniment sans garantie.
- **Fabriquer/deviner un mapping arrêt↔ligne** à partir d'une autre source non vérifiée : rejeté —
  viole la règle « ne jamais inventer/deviner » (cf. T-005, mêmes principes que pour les données de
  contact).
- **Livrer un jeu dégradé** (arrêts sans indicatif de ligne) : rejeté — contredit l'objectif même de
  la fonctionnalité (l'exemple UI du plan, « Bus 60, 64 · 150 m », suppose la ligne connue).

### Raison du choix
Présenté à Thibault avec 3 options (attendre, jeu dégradé, GTFS complet) : **choix du GTFS complet**,
en bornant explicitement le travail à la topologie statique — c'est la seule source qui relie
réellement arrêt et ligne aujourd'hui, et se limiter aux fichiers structurels (`stops.txt`,
`trips.txt`, `routes.txt`) plus une lecture en flux de `stop_times.txt` (sans en retenir les
horaires) évite d'importer une complexité (calendriers, exceptions, temps réel) dont la
fonctionnalité n'a pas besoin. Licence vérifiée avant exécution (texte complet de la Licence
Mobilité, version février 2021) : l'Article 5.6.c exempte explicitement l'« Utilisation d'une Base
de données dérivée en interne, au sein d'une organisation » des obligations de partage à
l'identique — couvre exactement le cas d'un outil interne MSP (~10 membres authentifiés, aucune
redistribution publique, aucun usage commercial). Aucune clause bloquante trouvée.

### Conséquences
- **Écart tracé, pas discret** : `plans/P3/S4.md` (§Décision clé de T1 et §Bilan de session) décrit
  la source réelle, l'URL de téléchargement, la taille (~106 Mo compressé), et le pipeline de
  jointure — à relire avant toute reprise ou rafraîchissement du jeu.
- **Approximation assumée sur le mode « rer »** : le `route_type` GTFS ne distingue pas RER de
  Transilien/TER (tous deux `route_type=2`, rail) — le bucket « rer » du fichier généré peut donc
  recouvrir une desserte Transilien/TER (ex. grandes gares parisiennes). Les indicatifs de ligne
  affichés restent exacts ; seule l'étiquette de mode simplifie.
- **Bbox, pas un polygone de commune** : le bornage « Paris + communes limitrophes » est approximé
  par une emprise rectangulaire (Paris intra-muros + marge ~2-3 km), faute de source fiable pour un
  tracé exact — sur-inclusion mineure sans conséquence fonctionnelle (`nearestStops()` filtre de
  toute façon par rayon en mètres).
- **Rafraîchissement futur** : si `arrets-lignes` (Licence Ouverte) redevient non vide, revenir sur
  cette décision est possible sans casser l'existant (même format de sortie `arrets.json`) — mais
  ce n'est pas fait automatiquement, une session dédiée devra retrancher `transit_prep.py`.

### Impact IA
Le script `supabase/import/transit_prep.py` documente cette diligence (source, licence, ce que le
fichier contient/ne contient pas) dans son en-tête, comme les autres scripts de `supabase/import/` —
à lire avant toute reprise plutôt que de redécouvrir la même recherche.
