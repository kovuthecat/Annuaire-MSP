# Import des carnets d'adresses — mode d'emploi et rapport

> Généré le 2026-07-16. Sources : les 4 carnets individuels (Anne, Charlène, Aurélien, Antonin)
> + l'ancien répertoire partagé `Répertoire partagé MSPM V2.xlsx`.
>
> ⚠️ **Les chiffres de cette première partie sont ceux du 2026-07-16 et n'ont pas été retouchés :
> c'est le rapport de la 1re passe.** L'état courant du jeu est donné par la section
> [« Seconde passe — open data CNAM »](#seconde-passe--open-data-cnam-2026-07-17), en bas de ce
> fichier, qui donne l'avant/après de chaque champ.

## Ce qu'il y a dans le dossier

| Fichier | Rôle |
|---|---|
| `schema.sql` | Schéma + RLS. **À exécuter en premier.** Ré-exécutable sans casse. |
| `seed_annuaire.sql` | Import des données. **À exécuter après `schema.sql`.** Ré-exécutable (id déterministes + `on conflict do nothing`). |
| `annuaire_donnees.json` | Le même jeu de données en JSON, avec la métadonnée d'audit (`_meta`) : provenance par champ, verbatim du carnet d'origine, hypothèses non tranchées. Pas importé — c'est la trace. |

### Exécution

1. Supabase → SQL Editor → coller `schema.sql` → Run.
2. Coller `seed_annuaire.sql` → Run.
   Le script **lève une exception** si un carnet ne correspond à aucun compte de `public.members`,
   plutôt que d'importer 300 fiches dans la liste de personne. La correspondance est faite par
   email, en tête de fichier (`seed_owner_map`).
3. Lire le bloc de contrôle final (compte des fiches, commentaires, provenances).

## Ce qui a été importé

| | |
|---|---|
| **Contacts** | **1 052** (571 praticiens · 420 structures · 50 ressources · 11 labos) |
| **Commentaires** | **1 117** — 668 signés par un médecin · 373 trouvés sur le web · 75 de l'ancien répertoire · 1 signalé par la MSP |
| **« Mes contacts »** | **1 018** entrées — Anne 313 · Antonin 338 · Charlène 201 · Aurélien 166 |
| Fiches vérifiées sur le web | 500 / 1052, chacune avec sa `source_url` |
| Fiches `a_verifier` | 250 |

**1 157 fiches brutes → 1 052 uniques.** 56 fiches sont connues de plusieurs médecins : elles
existent **une seule fois**, portent les avis de chacun, et apparaissent dans « mes contacts »
de tous ceux qui les avaient. C'est l'objectif d'harmonisation de `DECISIONS.md`.

Les 128 fiches issues du seul répertoire partagé n'entrent dans la liste perso de personne :
ce n'est le carnet de personne.

## Ce qu'il faut savoir avant de s'en servir

### Étanchéité patient / pro
Vérifiée par un audit indépendant sur les 1 052 fiches : **aucun marqueur pro**
(`bip`, `perso`, `de ma part`, « réservé aux professionnels ») **dans un champ patient**.
Le capital relationnel est intact : 64 lignes directes, 11 bips, 108 mails d'avis, 112 consignes.

Une fuite a été trouvée et corrigée : le numéro d'**ISM Interprétariat** figurait en
`tel_secretariat` alors que le site officiel le réserve aux professionnels (code d'accès 13142).

**37 mobiles restent en `portable` par défaut prudent** : la source ne disait pas s'ils étaient
publics, et le web ne l'a pas confirmé. Si l'un d'eux est en réalité le numéro public du
praticien, un membre peut le déplacer d'un clic. L'inverse — un mobile perso de confrère imprimé
sur une feuille patient — ne se rattrape pas.

### Aucune donnée de patient
Les carnets citaient des patients par leur nom (« Mme Loiseau », « le père de Judith »,
« selon Mr Salinas »). Tous ont été retirés, y compris dans les verbatims d'audit.
Vérifié sur le jeu final : **0 occurrence**.

### `source_url` : la fiche sait d'où elle vient
Chaque fiche vérifiée porte l'URL de la page qui l'a confirmée, et `_meta.enriched` (dans le JSON)
donne l'URL **champ par champ**. `source_checked_at` est `null` pour les 552 fiches jamais
vérifiées — l'index `contacts_checked_idx` les remonte en tête. C'est le point d'entrée de la
fonction « revérifier cette fiche ».

## À faire relire par un humain

| Quoi | Combien | Où |
|---|---|---|
| Fiches `a_verifier` | 250 | `statut = 'a_verifier'` |
| Noms encore douteux | 91 | `_meta.garbled` dans le JSON |
| Hypothèses non tranchées | 96 | `_meta.hypotheses` dans le JSON |
| Fiches sans aucune coordonnée | 106 | souvent un nom seul, jeté dans une note |
| Alertes | 44 | `comments.type = 'alerte'` |

### Les cas qui méritent un coup d'œil en priorité

- **Maternité des Lilas — fermée à l'automne 2025** (source : ville des Lilas). 3 fiches. Le carnet
  d'Anne y adresse encore nommément (Stéphanie, Céline, Karim / retrait d'implants profonds).
- **Centre de santé Haxo — fermé** (signalé par la MSP ; le web ne le confirme pas encore, les
  pages en ligne ne documentent que la mobilisation de 2024). La praticienne concernée
  (D. Moustin, écho endométriose) est à relocaliser. Piste : reprise du site par la MSP Paris Lilas.
- **CATRED** (soutien juridique) : `catred.org` **redirige vers un site commercial brésilien**.
  Domaine perdu ou détourné — à ne plus communiquer. Aucun `site_web` enregistré sur la fiche.
- **« CSAPA Beaurepaire » est en réalité un CAARUD** (Oppelia). Le drug-checking noté dans le
  carnet est bien une activité CAARUD. Étiquette à corriger — arbitrage métier.
- **Alice Choisi / Alice Seroka** : **deux gynécologues distinctes, même prénom, même adresse**
  (22 av. du Bel Air). Non fusionnées. Le DIU de colposcopie pointe vers Choisi, sans certitude.
- **Moisson-Meer Anne** (endocrino) et **Moisson Yves Frédéric** (dermato) : deux personnes
  différentes à la **même adresse** (10 allée Darius Milhaud). Volontairement non fusionnées.
- **Deux mails malformés**, recopiés tels quels plutôt qu'« arrangés » :
  `accueil-hope.beaujon.fr` (sans `@`) et `sgrimbert@hopîtal-dcss.org` (circonflexe parasite).

### Écarté de l'import
Les **11 portables personnels de collègues** (section « CONTACTS PARTICIPANTS PDSA » du carnet de
Charlène). Ce sont des membres, pas des contacts : ils relèvent de `public.members`, et chacun
devrait consentir avant publication dans le pool commun.

## Méthode — pourquoi on peut faire confiance à ces données

**Règle unique : pas de preuve, pas de valeur.** Aucune donnée web n'a été écrite sans l'URL d'une
page réellement ouverte. Une fiche incomplète est un succès ; une fiche inventée serait un échec —
un numéro faux dans un annuaire médical envoie un patient dans le mur.

**La synthèse d'un moteur de recherche n'est pas une preuve.** Cette règle a coûté cher en temps.
Elle a évité **une vingtaine d'erreurs concrètes**, dont :

- un **numéro de téléphone inventé** de toutes pièces (la page réelle portait celui du carnet) ;
- des numéros faux à **un chiffre près** — les plus dangereux, ils ont l'air justes
  (Bluets `…41 08` vs `…41 00` ; Diaconesses ; PMI Vaucouleurs 30 vs 28 rue de Vaucouleurs) ;
- **deux fausses fermetures** (centre Curnonsky, Récup'air — dont la « fermeture » était en fait
  le congé d'été du 1er au 16 août) ;
- deux faux déménagements, une confusion entre les deux hôpitaux Rothschild, un ambulancier
  domicilié à Bordeaux ;
- `hopital.fr` servant le contenu d'un hôpital sur l'URL d'un autre.

**Le web n'écrit jamais dans un champ pro.** Il peut en revanche *confirmer* qu'un numéro est pro :
la page AP-HP de la Pitié labellise le mobile du carnet « RÉSERVÉ AUX PROFESSIONNELS » → il reste
en `ligne_directe`. Et il peut *infirmer* : le cabinet d'Azam publie lui-même son 06 pour les RDV
→ requalifié patient. Même donnée, conclusions opposées, dictées par la preuve. 11 requalifications
au total.

**Le carnet fait foi sur le web**, sauf quatre exceptions : un placeholder (`doctolib: "Doctolib"`),
un praticien parti (sur preuve), une identité manifestement erronée (sur 2 critères concordants),
et **quand le carnet doute de lui-même** — une fiche portant « code postal à vérifier » et
démentie par le web est corrigée : c'est respecter le médecin qui a écrit qu'il n'était pas sûr.

**Ce que les données ne sont pas.** Le seed est validé au parseur PostgreSQL réel (`pglast`), pas à
l'œil — mais la syntaxe n'est pas l'exécution : les `check`, les clés étrangères et les policies RLS
ne seront éprouvées qu'au premier Run. `annuairesante.ameli.fr`, `doctolib.fr` et `aphp.fr` étant
inaccessibles aux robots, `secteur_conv` (120 fiches) et les fiches AP-HP sont le gisement le plus
évident d'une seconde passe.

---

# Seconde passe — open data CNAM (2026-07-17)

> Le mur de la 1re passe était `annuairesante.ameli.fr`, injoignable aux robots. Or **la CNAM publie
> le contenu de cet annuaire en open data**, sous Licence Ouverte 2.0. On a pris la donnée à la
> source au lieu de la gratter à travers un anti-bot.

**Source** : jeu [« Annuaire santé Ameli »](https://www.data.gouv.fr/datasets/annuaire-sante-ameli),
Caisse nationale de l'Assurance Maladie, fichier du **2026-07-13** (rafraîchi chaque dimanche soir).
2 CSV : 550 587 professionnels de santé libéraux, 3 600 centres de santé.
Rejouable : `supabase/import/cnam_join.py` (mode d'emploi dans son en-tête).

## Ce qu'on a gagné

| Champ | Avant | Après | |
|---|---|---|---|
| **`secteur_conv`** | **196** | **307** | **+111** — c'était la cible |
| `civilite` | 262 | 309 | +47 |
| `tel_secretariat` | 607 | 644 | +37 |
| `adresse` | 767 | 772 | +5 |
| Commentaires | 1 117 | 1 217 | +100 |
| Fiches `a_verifier` | 250 | 313 | +63 |

**Aucun champ PRO n'a bougé, au champ près** : `ligne_directe` 64, `bip` 11, `portable` 61,
`email_avis` 108, `consignes_pro` 112, `orientation` 332 — identiques. Le fichier CNAM n'en porte
d'ailleurs aucun.

## Le chiffre à retenir : les carnets n'avaient pas vieilli

Le plan de session attendait du taux de désaccord CNAM/carnet sur `secteur_conv` qu'il mesure le
vieillissement des carnets. **Il le mesure, et il dit l'inverse de ce qu'on croyait :**

| Palier de match | Comparables | Désaccords | |
|---|---|---|---|
| **haut** (nom+prénom+CP+n° de voie+spécialité) | 78 | **1** | **1,3 %** |
| **bas** (nom+prénom+CP) | 41 | **0** | 0 % |

Sur 119 fiches où le carnet ET la CNAM donnent un secteur, **elles sont d'accord 118 fois**. Les
médecins de la MSP connaissent leurs correspondants : le vrai gain n'est pas la correction, c'est le
**remplissage** (+111 valeurs là où il n'y avait rien).

Le désaccord des matchs `bas` (0 %) n'excède pas celui des matchs `haut` (1,3 %) : **rien n'indique
de faux appariements** dans le palier le plus faible. C'était le seuil d'alerte prévu.

**L'unique désaccord — idx 547, Dr Wolf, psychiatre — vaut mieux qu'une statistique.** La 1re passe
avait *déjà vu* le secteur 2 sur sante.fr et l'avait rejeté au motif « le carnet fait foi ». La CNAM,
qui *attribue* ce statut, le confirme indépendamment, sur un match du palier haut. La valeur du
carnet est conservée en `_meta.verbatim_carnet` et dans un commentaire `alerte` portant les deux
valeurs. Le carnet n'est pas supprimé : il est **antidaté**.

## Les 1 052 fiches face au fichier

| État | Fiches | |
|---|---|---|
| **Matchées** | **234** | 135 (nom+prénom+CP+voie) · 92 (nom+prénom+CP) · 7 centres de santé |
| **Absentes — attendu** | **678** | 413 structures · 124 praticiens hospitaliers · 80 professions non référencées · 50 ressources/assos · 11 labos |
| **Non résolues** | **140** | devraient y figurer, introuvables → **c'est le travail de S2** |

**Une absence n'est pas un échec.** Le descriptif CNAM est explicite : l'Annuaire santé ne référence
que l'exercice **libéral** (cabinet ou centre de santé). Les salariés exerçant uniquement en
établissement, les remplaçants et SOS Médecins n'y sont pas — et les psychologues, ostéopathes,
doulas, diététiciennes et psychomotriciennes non plus. Nos 124 praticiens hospitaliers et nos 80
fiches hors nomenclature **n'y seront jamais** : inutile de les rechercher en S2.

## Ce qui a été corrigé, et pourquoi c'était bloqué

**12 valeurs de carnet remplacées sur 1 052 fiches. Les 12 portent leur trace** (verbatim en
`_meta.verbatim_carnet` + commentaire) : 4 noms, 7 arrondissements, 1 secteur. Tout le reste n'est
que remplissage de champs vides.

- **4 noms** (`Etchegut`→**Echegut**, `SHAAN`→**SCHAAN**, `HANNS`→**HANSS**,
  `FAOUZIA TOURIA`→**FAOUZI Touria**). La 1re passe les avait refusés au motif « `_meta.garbled =
  false` » — **une règle qui n'existe pas** : `ENRICH_SPEC.md` l. 170 dit noir sur blanc que
  « `garbled` n'est PAS une condition d'entrée », et cite `SHAAN`→`SCHAAN` parmi ses exemples. La
  CNAM apporte le 2e critère et il est primaire : la graphie fautive est **absente du fichier
  national**, la graphie corrigée y figure avec la bonne spécialité et la bonne adresse.
  Corriger `HANNS`→`HANSS` a **débloqué son match CNAM** : le nom faux le rendait introuvable.
- **7 arrondissements** incohérents avec leur propre adresse (dont les 3 cas connus : Alperin,
  Legeais, André). Une fiche qui se contredit elle-même est fausse sur l'un des deux champs, sans
  qu'aucun arbitrage de fraîcheur soit nécessaire. Arbitrés par un **index adresse → code postal**
  construit sur les 550 587 déclarations du fichier (cf. les garde-fous dans `cnam_join.py` : CEDEX,
  CP alternatifs, seuil de déclarants **distincts**).
- **13 fiches à valeur contredite** (classe C) sont passées en `a_verifier` avec le désaccord porté
  en commentaire. Elles ne vivaient qu'en prose libre dans `_meta`, **qui n'est pas importé en
  base** : un membre voyait la valeur du carnet sans le moindre indice qu'une source l'avait
  contredite. Aucune valeur n'a été modifiée — seulement rendue visible.

## Ce qui a été volontairement laissé

- **Les adresses ne sont jamais écrasées.** L'adresse CNAM est celle *déclarée à la caisse* : elle
  peut n'être qu'un des lieux d'exercice. **56 divergences** sont signalées en commentaire + `a_verifier`.
  Le cas le plus net : **Dr Daval (idx 65)**, où la CNAM déclare le **228 rue de Charenton** quand le
  carnet porte le 125 — quatre sources concordent sur le 228, aucune sur le 125. Un humain tranche.
- **`Boursounian`→Doursounian (idx 72)** et **`SABINIEN`→Sabinen (idx 342)** : hypothèses solides,
  **non sourçables par l'open data**. Doursounian est PU-PH hospitalier (hors périmètre, absence
  attendue) ; le seul Sabinen du fichier est dans les Alpes-Maritimes. Le refus ne tient plus à
  `garbled` mais à « pas de preuve, pas de valeur » — règle inchangée. **À reprendre en S2, sur le web.**
- **`Besnenou` (33), `Turpin` (78), `ALAIN` (97), `Viano` (186)** : refus **confirmés**. Le fichier
  national corrobore le constat de la 1re passe (aucun Turpin orthopédiste, aucun Viano
  gastro-entérologue). Une ressemblance phonétique sans point d'ancrage ne suffit pas.
- **Le carnet plus précis gagne toujours.** Écartés après lecture : idx 38 et idx 964 (le web donne
  un *autre* numéro — deux canaux distincts, pas une contradiction), idx 259 (75116 = 75016, même
  arrondissement), et toutes les fiches où la source apporte le numéro de voie que le carnet omettait
  — c'est une précision, pas un démenti. Ces décisions sont listées dans `classe_c.py`.

## Ce que le fichier ne contient pas — et que le plan croyait y trouver

- **Aucun RPPS, aucun identifiant.** La jointure exacte par RPPS était impossible : elle a été
  remplacée par un **palier haut** (nom+prénom+CP+n° de voie+spécialité concordants), qui joue le
  même rôle de jeu de contrôle. `rpps` reste à 196 fiches.
- **`ps_activite_civilite` vaut H/F** : c'est le *genre*, pas le titre. Écrire « M. » par-dessus le
  « Dr » d'un carnet aurait été une régression. La civilité n'a donc été renseignée que pour les
  professions où « Dr » n'est pas l'usage (kinés, sages-femmes, orthophonistes…).
- **Ni délai, ni motif de consultation, ni langue, ni accès PMR, ni modalité de RDV** : c'est
  exactement ce que Doctolib apporte, et c'est le périmètre de S2.

## Garde-fous : ce qui a changé dans `recombine.py`

Les règles n'ont pas été désactivées, elles ont été **resserrées** — et le contrôle a été *testé*
(12 tentatives d'écrasement illégitime, 12 refus, aucune écriture) :

1. **Motif « source datée »** : n'autorise l'écrasement que sur `secteur_conv`, sur un match sûr, et
   avec une source portant sa date. C'est le garde-fou lui-même qui écrit le verbatim et le
   commentaire — aucun lot ne peut « oublier » de conserver ce qu'un médecin a écrit.
2. **Resserrage** : sur `secteur_conv`, le doute assumé par le carnet ne suffit plus à autoriser un
   écrasement. Sans ce verrou, un lot pouvait écraser le secteur d'une des 250 fiches `a_verifier`
   **sans laisser de trace**.
3. **Deux pertes de trace corrigées** : la graphie d'origine d'un nom n'était pas conservée si la
   fiche était déjà `a_verifier` (le doute justifie qu'on corrige, pas qu'on efface) ; et
   `_meta.enrich_note` était **remplacée** au lieu d'être empilée, ce qui effaçait le raisonnement de
   la 1re passe — y compris les refus qu'elle documentait.

## Une graphie erronée est remplacée, pas exposée (arbitrage du 2026-07-17)

**Un nom faux n'a pas à rester lisible dans l'app.** Quand le nom d'une fiche a été corrigé, la
graphie du carnet est rangée dans `_meta.verbatim_carnet` — la trace d'audit, qui n'est **pas**
importée en base. Le membre voit le nom juste ; le relecteur retrouve dans le JSON ce que le carnet
disait. Rien n'est perdu : la ligne brute du carnet reste de toute façon en `_meta.source_text`.

La graphie fautive s'affichait sous **trois formes différentes**, ce qui est la vraie leçon du
chantier — d'où un invariant dans `audit.py` (contrôle n°6) plutôt qu'un nettoyage ponctuel : la
prochaine passe en inventerait une quatrième.

| Forme | Nb | Traitement |
|---|---|---|
| « Graphie d'origine dans le carnet : « HANNS ». » | 16 | **Supprimée** — elle ne portait que la graphie, il n'y avait rien d'autre à sauver. |
| « Fiche identifiée depuis la note d'origine « Dr Illias **Amny** endocrinolgue » : il s'agit du Dr HAMNY… » | 45 | **Réécrite** — la citation part, le raisonnement reste. |
| « Nom orthographié « FREITAG » dans le carnet ; le web donne… » (idx 530) | 1 | **Réécrite** — forme isolée, débusquée par le contrôle n°6. |

**Pourquoi réécrire plutôt que supprimer la 2e famille** : à la différence de la 1re, elle porte le
**raisonnement d'identification**, et ces fiches sont en `a_verifier` *précisément parce que* le nom
a été corrigé. Sans le pourquoi, le relecteur voit un nom à confirmer sans savoir sur quoi trancher.

> Avant : *« Fiche identifiée depuis la note d'origine « Dr Illias Amny endocrinolgue » : il s'agit
> du Dr Illias HAMNY, endocrinologue à la Maison de Santé Pelleport (77 rue Pelleport, 75020). »*
>
> Après : *« Identification : Dr Illias HAMNY, endocrinologue à la Maison de Santé Pelleport (77 rue
> Pelleport, 75020). Le carnet portait une graphie approchante du nom. À confirmer. »*

**Aucun contenu médical n'a été perdu** — vérifié avant réécriture. Les deux notes qui en portaient
le dupliquaient déjà en commentaire propre : idx 133 « Ne pèse pas les patients (phrase interrompue
dans la source) » et idx 361 « Ne prend que les patients autour de leur centre ».

**Ce qui n'est PAS concerné, et qu'il ne faut pas « rattraper »** : les commentaires qui documentent
une divergence où **le carnet a gagné** — idx 95 (« Andreea » sur sante.fr contre « Andrea » au
carnet, valeur du carnet conservée), idx 975 (« Erik »/« Erick »), idx 96 (ordre nom/prénom). Là, le
commentaire explique pourquoi le nom affiché est celui du carnet : le retirer rendrait la fiche
incompréhensible.

Textes réécrits à la main dans `import/notes_origine.py`, appliqués par `recombine.py` (bloc
idempotent, qui **plante** si une fiche porte un commentaire de la famille sans réécriture
correspondante). Règle inscrite dans `import/ENRICH_SPEC.md` §« Noms erronés » — sans quoi la
prochaine passe la réintroduirait.

## Contrôles

- `audit.py` : **strictement identique à l'état d'avant-passe** (0 fuite pro, 0 nom de patient ;
  les 8 signalements restants sont préexistants et sont des heuristiques de relecture).
- Seed régénéré (1 052 contacts, 1 217 commentaires, 1 018 entrées) et **validé au parseur
  PostgreSQL** (`pglast`).
- **Un bug d'idempotence trouvé et corrigé au passage** : le bloc « signalement MSP » de
  `recombine.py` réécrivait son alerte à chaque exécution. Inoffensif tant que le script ne tournait
  qu'une fois ; cette passe, qui enchaîne trois étages, l'avait dupliqué 5 fois sur la fiche Moustin.
  Le jeu final ne contient **aucun commentaire en doublon**.
- **0 écrasement sans trace, 0 note d'audit perdue, 0 commentaire perdu** (vérifié par diff contre le
  jeu d'avant-passe).

## Suite : `import/s2_worklist.csv`

Les **1 052 fiches** avec leur état de jointure, ce que Doctolib apporterait en plus de la CNAM, et
un ordre de travail par **risque** — un lien faux déjà en base (142 fiches) est un risque actif ; une
fiche vide n'est qu'incomplète.
