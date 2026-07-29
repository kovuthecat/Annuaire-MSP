# 2026-07-18 — Recherche multi-termes, tolérante aux fautes, classée et surlignée + tests

Affine la décision « Recherche et filtres côté client » (2026-07-16) sans en changer l'architecture
(toujours 100 % en mémoire, `src/data/search.ts`, fonction pure).

### Décision
La barre de recherche passe d'un **match sous-chaîne unique** à une **recherche multi-termes en ET** :
la requête est découpée en mots, et un contact est retenu si **chaque** mot apparaît quelque part dans
sa fiche (nom, profession, adresse, arrondissement, tags, **texte des commentaires**), **quel que soit
l'ordre ou le champ**. Un mot d'au moins 4 caractères qui ne matche pas exactement est repêché par
**distance de Levenshtein** (≤ 1 édition de 4 à 6 lettres, ≤ 2 au-delà) pour absorber les fautes de
frappe. Deux ajouts complètent l'expérience :

1. **Classement par pertinence** — l'index est **segmenté et pondéré par champ** (nom 100 >
   profession 60 > méta/tags 40 > localisation 25 > commentaires 15) avec une **qualité de match**
   (exact 1.5 > préfixe 1.2 > sous-chaîne 1.0 > flou 0.6). `relevanceScore()` somme, par terme, le
   meilleur score pondéré ; le tri « Pertinence » l'utilise **dès qu'une requête est saisie** (sans
   requête, l'ordre de `filterContacts` est conservé). Un match sur le nom prime sur un match enfoui
   dans un commentaire.
2. **Surlignage** des termes trouvés dans le nom et la ligne profession/arrondissement des résultats
   (`highlight.ts`, fonction pure ; alignement caractère par caractère pour respecter accents/casse).

La logique de recherche est **couverte par des tests unitaires (Vitest)**.

### Contexte
Avant, taper « kiné 20e » cherchait la sous-chaîne littérale `kine 20e` — jamais présente telle quelle
dans le texte concaténé → 0 résultat. La combinaison profession + arrondissement + tag n'était possible
que par les chips/sélecteurs. Une faute de frappe (« cardilogue ») ne renvoyait rien non plus.

### Alternatives envisagées
- **Full-text Postgres (tsvector)** : réévalué, toujours écarté à cette échelle (cf. 2026-07-16).
- **Fuzzy sur tous les termes, y compris courts** : écarté — trop de faux positifs (« line » ≈ « kine »).
  Le repêchage flou est réservé aux mots ≥ 4 caractères ; les courts restent en sous-chaîne exacte.
- **Surlignage des matches flous** : écarté — on ne sait pas quelles lettres marquer ; seules les
  correspondances exactes en sous-chaîne sont surlignées (le flou reste dans le classement, pas dans
  le rendu).

### Raison du choix
Rend la barre unique réellement combinatoire (le point fort attendu de l'outil) tout en restant trivial
et sans latence. La tolérance aux fautes et le classement réutilisent la distance de Levenshtein déjà
présente pour l'anti-doublon — pas de nouvelle dépendance.

### Conséquences
- Perf : un **index de recherche mémoïsé par contact** (`WeakMap` ; segments pondérés = texte + mots
  uniques par champ) évite de reconstruire le haystack à chaque frappe ; le repêchage flou n'intervient
  qu'après échec des tests exact/préfixe/sous-chaîne et court-circuite dès qu'un terme manque. Le tri
  « Pertinence » calcule le score une fois par contact (décoration) avant de trier.
- **`sort.ts` étendu** : `sortContacts(contacts, sort, reference, query)` ; le cas « pertinence »
  délègue à `relevanceScore` (search.ts). La note « le tri ne touche pas search.ts » (zone S2) est
  **levée par cette décision** : la pertinence *est* une notion de recherche, elle vit dans search.ts
  et sort.ts ne fait que l'appeler.
- **Vitest** ajouté en devDependency ; scripts `npm run test` / `test:watch`. **31 cas** :
  `src/data/search.test.ts` (filtre, multi-termes, flou, `relevanceScore`) +
  `src/features/annuaire/highlight.test.ts`. `tsc` (build) type-checke aussi les tests.
- UI : bouton **« effacer »** (×) dans la barre ; **surlignage** des termes dans les lignes de résultat
  (composant local à `ContactRow`, logique pure dans `highlight.ts`).

### Impact IA
`filterContacts` garde sa signature `(contacts, query, filters)`. Nouveaux exports de search.ts :
`relevanceScore`, `queryTerms`, `normalizeChar`. Toute évolution de la recherche doit passer les tests
existants avant d'ajouter du comportement.
