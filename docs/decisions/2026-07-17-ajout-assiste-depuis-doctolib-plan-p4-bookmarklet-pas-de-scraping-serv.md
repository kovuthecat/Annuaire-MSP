# 2026-07-17 — Ajout assisté depuis Doctolib (plan P4) : bookmarklet, pas de scraping serveur

Cadre le plan `plans/P4/`. But : **alléger la saisie** d'un nouveau contact en pré-remplissant le
formulaire depuis une page Doctolib. Rien n'est encore implémenté.

### Décision
Pré-remplir l'écran « Ajouter » via un **bookmarklet un-clic** qui lit la page Doctolib **déjà ouverte
dans le navigateur du membre** et rebondit vers `/nouveau?prefill=<payload>`.

1. **Pas de scraping serveur** : récupérer la page depuis l'app est impossible (T-005 : Doctolib
   renvoie **403**, anti-bot ; le CORS l'interdirait aussi). On passe par le **navigateur du membre**,
   sur une page qu'il consulte légitimement — même philosophie que P2/S2.
2. **Extraction JSON-LD d'abord, DOM en repli**, **heuristique, sans IA, sans donnée qui sort**.
3. **Relais par URL** (`?prefill=` base64url) : une navigation, pas une requête de fond → **pas de
   CORS** ; la session persistée du membre fait le reste.
4. **Provenance & prudence** : fiche pré-remplie en **`statut = 'a_verifier'`**, `source_url` = l'URL
   Doctolib, `source_type = 'doctolib'` ; Doctolib étant **déclaratif et non daté**, **jamais
   d'écrasement** ; relecture humaine obligatoire.
5. **Étanchéité par double barrière** : Doctolib est **destiné aux patients** → n'expose que
   identité/adresse/lien patient ; **et** le lecteur de `prefill` applique une **liste blanche** qui
   rejette tout champ pro. Aucune coordonnée pro ne peut entrer par ce canal.

### Contexte
La saisie manuelle est la friction n°1 de l'adoption. Beaucoup de correspondants ont une page Doctolib
qui porte déjà nom, spécialité, adresse (et souvent des coordonnées GPS en JSON-LD).

### Alternatives envisagées
- **Scraping serveur / fetch de la page** : bloqué (403 + CORS + CGU). Déjà constaté en T-005.
- **Coller-pour-préremplir** (copier le texte de la page) : plus robuste et universel, mais Thibault a
  choisi le **confort du un-clic**. Conservé comme **repli ultime** si l'extension elle-même échoue.
- **Parsing par IA** du texte collé : très robuste mais clé API + coût + latence + **sortie de données**
  → écarté au profit de l'heuristique locale.

### Raison du choix
C'est la seule voie qui « autocomplète depuis une page Doctolib » **sans** violer l'anti-bot ni les
CGU, et sans infrastructure. Le JSON-LD (schema.org) est un point d'extraction **stable**.

### Conséquences
- **Contrat `prefill`** figé en S1 : clés en **liste blanche** patient/identité/lieu, base64url,
  assainissement + bornes de longueur (entrée non fiable). Route `/nouveau` rétrocompatible sans le
  paramètre.
- **Provenance écrite uniquement par ce chemin** : la saisie manuelle reste sans provenance (P1/S5).
- **CSP** : un bookmarklet peut être bloqué par la CSP de Doctolib → **repli mini-extension** (P4/S3,
  **conditionnelle**, déclenchée seulement sur constat), qui réutilise le **même extracteur**
  (`extract.js`, source unique).
- **Synergie P3, non bloquante** : l'`adresse` alimente le géocodage ; le GPS du JSON-LD peut être
  transporté si les colonnes géo existent (dégradation gracieuse sinon).
- **Maintenance continue** assumée : Doctolib change son HTML → adapter l'extracteur (JSON-LD limite la
  casse). Même leçon que P2/S2.

### Impact IA
Le code vit hors de l'app (`tools/doctolib-bookmarklet/`, `tools/doctolib-extension/`) ; la logique
d'extraction est **pure et testable** hors navigateur (fixtures HTML). Le risque d'entrée non fiable est
traité côté app par la liste blanche, pas par la confiance au payload.
