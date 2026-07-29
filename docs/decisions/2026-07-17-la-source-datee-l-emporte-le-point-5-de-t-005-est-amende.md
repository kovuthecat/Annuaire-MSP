# 2026-07-17 — La source **datée** l'emporte : le point 5 de T-005 est amendé

Amende le **point 5** de « T-005 exécuté » (« *Le carnet fait foi sur le web* »). Les points 1 à 4 et 6
sont **inchangés** : ils portent la preuve et l'étanchéité, pas la hiérarchie des sources.

### Décision

**Le critère n'est plus « carnet contre web », c'est « qui est daté, et sur quel champ ».**

1. **Faits administratifs qui dérivent** (`secteur_conv`, `rpps`, `civilite`) : **la source datée la plus
   récente écrit**, y compris contre le carnet. Sur `secteur_conv`, la CNAM n'est pas un témoin —
   **c'est elle qui attribue le statut**.
2. **Jugement, relationnel, consignes, orientation** : **le carnet reste seul.** Aucune source publique
   n'a rien à en dire, donc aucune ne les touche. C'est là qu'était la vraie valeur du point 5.
3. **Rien n'est effacé** : une valeur de carnet remplacée est **antidatée, pas supprimée** — verbatim en
   `_meta` + commentaire `alerte` sourcé portant **les deux valeurs** + `a_verifier`.
4. **Une page déclarative n'écrase rien.** *(arrêté le 2026-07-17 après la mesure de S1 — voir
   l'addendum ci-dessous, qui a annulé le mécanisme « créneaux ouverts → la page écrit » d'abord
   retenu ici.)* Doctolib et les sites de cabinet **remplissent les vides** et **signalent les écarts**
   (commentaire `alerte` sourcé + `a_verifier`) ; **un humain tranche**. Seul un fichier primaire daté
   (CNAM) écrit contre un carnet, et seulement sur `secteur_conv`.
   Corollaire : `mode_rdv` ∈ {en ligne, téléphone, patients adressés, téléconsultation} est une
   **donnée à part entière**, pas un manque — beaucoup de praticiens sont référencés sur Doctolib sans
   prise de RDV en ligne.
5. **Une info de terrain récente prime sur tout** (`signalement_msp`). Ce n'est pas une exception :
   c'est la même règle — la plus récente des sources datées gagne.

### Contexte

Le point 5 a été écrit contre un échec précis : **les synthèses de moteur de recherche**, qui ont
produit un numéro inventé, des numéros faux à un chiffre près, deux fausses fermetures. C'est une règle
de **fiabilité de source**. Elle a été appliquée comme une règle de **fraîcheur** — ce qu'elle n'a
jamais été.

Or les carnets **ne sont pas datés**, et on sait qu'ils ont vieilli : le carnet d'Anne adresse encore
nommément à la **maternité des Lilas, fermée à l'automne 2025** (`IMPORT.md`). Le fichier CNAM, lui,
est daté (2026-07-13) et publié par le producteur de la donnée.

### Alternatives envisagées

- **Garder le point 5 tel quel** : rejeté — il fige `secteur_conv` (la cible de P2) sur la source la
  moins fiable pour ce champ précis, et son motif d'origine ne s'applique pas à un fichier primaire.
- **Inverser en bloc (« toute source publique prime »)** : rejeté — un profil Doctolib à l'abandon est
  *plus vieux* qu'un carnet, et le web ignore les fermetures que la MSP connaît (centre Haxo).
- **Attendre que S1 mesure le taux de désaccord avant de trancher** : rejeté — l'exécutant de S1 lit
  `DECISIONS.md` en contexte et y trouverait la règle contraire. La mesure reste due (S1 §T2), elle
  confirmera ou nuancera l'ampleur, pas le principe.

### Conséquences

- **P2 est cadré là-dessus** : `plans/P2/index.md` §Décisions de cadrage, `S1.md` §« Ce qui change »
  (justification longue), `S2.md` §T3.
- **`IMPORT.md` §Méthode décrit encore le point 5 d'origine** : c'est un **rapport de la première
  passe**, il reste exact *pour ce qu'elle a fait*. À ne pas réécrire — à compléter par la section
  « Seconde passe » (S1) qui porte l'amendement.
- **Passif à rattraper** (mesuré le 2026-07-17 sur `annuaire_donnees.json`) : **156 fiches** portent une
  valeur web vue puis non écrite, dont **59** touchant le secteur. Elles ne vivent **qu'en prose** dans
  `_meta.enrich_note` : aucun champ structuré, et **`_meta` n'est pas importé en base**. Seules **39**
  sont en `a_verifier` et **5** portent un commentaire `alerte` → **115 sont invisibles à la relecture
  humaine**. Rattrapage cadré en S1 §T2 bis.
- **Correction de mesure (2026-07-17)** : `secteur_conv` est renseigné sur **196** fiches, pas 120.
  Le 120 comptait les seules valeurs **écrites par la passe web** (`_meta.enriched`) et oubliait les
  **76 déjà présentes dans les carnets**. Le « 120 » de T-005 §Conséquences et d'`IMPORT.md` §Ce que
  les données ne sont pas est donc **sous-évalué** ; corrigé dans `plans/P2/index.md`. (Le fait que
  `rpps` soit aussi à 196 est une coïncidence : 135 fiches en commun seulement.)
- **Portée réelle des deux sources** (mesurée le 2026-07-17) : elles tranchent l'administratif des
  **571 praticiens** et des centres — **pas tout l'annuaire**. Absents des deux par construction :
  **~250 fiches** (111 hôpitaux, 91 services hospitaliers, 30 associations, PMI/réseaux/CPTS/PASS).
  Et **aucune ne porte les champs qui font la valeur de l'outil** : `consignes_pro` (112),
  `email_avis` (108), `ligne_directe` (64), `orientation` (332), `comments` (685) — que l'étanchéité
  interdit d'écrire de toute façon. P2 fiabilise l'administratif autour du cœur ; il ne touche pas au
  cœur.
- **Deux bugs d'exécution de la 1ʳᵉ passe, indépendants de cet amendement** (cadrés en S1 §T2 ter) :
  1. **8 noms non corrigés** au motif que `_meta.garbled = false` — alors qu'`ENRICH_SPEC.md` l. 170
     dit **« `garbled` n'est PAS une condition d'entrée »** et cite `Boursounian`→Doursounian et
     `SHAAN`→SCHAAN comme exemples. **Ce sont précisément les deux fiches refusées** (idx 72, idx 42) :
     la passe a refusé les cas que la spec avait écrits pour elle.
  2. **Incohérences internes `adresse` ↔ `arrondissement`** (idx 31, 40, 296) verrouillées par « only
     null » : une fiche qui se contredit elle-même n'a pas besoin d'arbitrage de source.
- **Garde-fou contre la sur-correction** : *le carnet plus précis n'est pas le carnet périmé*. Une
  ligne directe rachis (idx 989) bat le standard de sante.fr ; deux numéros peuvent être deux canaux
  (idx 38). L'amendement porte sur la **fraîcheur**, jamais sur la **précision**.
- **La règle « ne remplir que les champs `null` » cesse d'être absolue** : elle bloquait des corrections
  que la première passe savait justes (fiche Legeais : le web tranchait un doute que le carnet
  signalait lui-même — exception 4 de T-005 — et la spec interdisait quand même d'écrire).
  L'écrasement passe **par** le garde-fou « refus d'écraser sans motif » de `recombine.py`, jamais à
  côté.

### Impact IA

Le risque bascule de côté. Avant : écrire une valeur inventée. Maintenant : **écraser sur un faux
match**. Un désaccord CNAM/carnet a deux causes — le carnet a vieilli, **ou ce n'est pas la même
personne** (homonymes parisiens : `Moisson-Meer`/`Moisson`, deux `Alice` gynécologues à la même
adresse). D'où : écrasement autorisé **seulement sur match sûr** (RPPS, ou nom+prénom+CP/adresse), et
calibrage du taux de désaccord sur les matchs RPPS **avant** d'écrire.

### ⚠️ Addendum du 2026-07-17 (soir) — S1 a mesuré, et l'hypothèse était fausse

**Cette décision reposait sur une hypothèse — « les carnets ont vieilli » — que S1 a testée et
réfutée.** La décision **tient**, mais son motif était faux et sa portée est bien plus étroite que
prévu. C'est consigné ici plutôt que réécrit : *l'entrée ci-dessus est ce qu'on croyait, ceci est ce
qu'on a mesuré.*

| Palier de match CNAM | Comparables | Désaccords `secteur_conv` |
|---|---|---|
| haut (nom+prénom+CP+voie+spécialité) | 78 | **1** — 1,3 % |
| bas (nom+prénom+CP) | 41 | **0** |

**Sur 119 fiches où le carnet et la CNAM donnent tous deux un secteur, elles sont d'accord 118 fois.**
Les médecins de la MSP connaissent leurs correspondants. Le gain de S1 n'a pas été la **correction**
(1 valeur — idx 547, Dr Wolf) mais le **remplissage** : `secteur_conv` 196 → 307.

**Ce que l'amendement a réellement rapporté**, ce n'est donc pas la fraîcheur : c'est d'avoir
**débloqué** ce qu'une règle mal appliquée interdisait — 4 noms (dont `HANNS`→`HANSS`, qui a débloqué
son propre match CNAM), 7 arrondissements incohérents avec leur propre adresse, et 13 fiches à valeur
contredite rendues visibles. **12 valeurs remplacées sur 1 052 fiches.**

**Conséquence pour S2 — le pari s'inverse.** Le carnet a tenu tête à la source **autoritaire** dans
98,7 % des cas. Doctolib est **déclarative, non datée, moins autoritaire que la CNAM**. En cas de
contradiction Doctolib ≠ carnet, **le pari le plus probable est que Doctolib a tort.** → Le mécanisme
« créneaux ouverts → la page écrit », retenu au point 4, est **annulé** : Doctolib ne fait que remplir
les vides et signaler les écarts. Voir `plans/P2/S2.md` §T3.

**La leçon de méthode** : la règle « qui est daté l'emporte » reste juste ; c'est la **prémisse
factuelle** (« le carnet est vieux ») qui était une intuition non vérifiée. Elle a tenu quatre échanges
avant qu'une mesure la démente. **Le contrôle de calibrage de S1 a payé son coût à lui seul** — il
existait pour valider la règle, il a servi à la borner.
