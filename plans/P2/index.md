# Plan P2 — Seconde passe d'enrichissement : open data CNAM, puis Doctolib au navigateur   (rédigé par Opus)

## Objectif d'ensemble

**Passer les 1 052 fiches au crible des deux sources** — pas seulement celles que la première passe
n'a pas résolues. Y compris les 500 déjà vérifiées sur le web : la CNAM peut les **contredire**, et
c'est précisément ce qu'on veut savoir.

Cible prioritaire : **`secteur_conv`** (**196** fiches sur 1 052 aujourd'hui — pas 120, cf. §État de
départ) et **les modalités concrètes de prise de RDV**.

Deux sources, dans cet ordre — l'ordre compte :

1. **Open data CNAM** (`Annuaire santé Ameli`, data.gouv.fr) : hors ligne, exhaustif, autoritaire,
   Licence Ouverte 2.0. Fait foi sur `secteur_conv`.
   > **Corrigé après S1 :** ~~adresse, RPPS~~. **Le fichier ne contient aucun RPPS ni aucun
   > identifiant** — la jointure exacte annoncée était impossible, elle a été remplacée par un palier
   > nom+prénom+CP+n° de voie+spécialité. Et l'adresse CNAM est celle *déclarée à la caisse* : elle ne
   > fait pas foi, elle n'écrase rien (cf. `IMPORT.md` §Seconde passe).
2. **Doctolib, via Claude in Chrome** : ce que l'open data n'a pas — modalités de prise de RDV, motifs
   de consultation, délais, langues, accessibilité PMR, lieux multiples.

## Pourquoi cet ordre

L'open data d'abord parce qu'il est **gratuit en effort** (une jointure) et qu'il **réduit le travail
Doctolib** : chaque fiche dont l'open data donne déjà le secteur, l'adresse et le RPPS n'a plus besoin
d'être ouverte au navigateur pour ça. Doctolib ne sert plus qu'à ce que lui seul possède.

Ne pas inverser : ouvrir 500 fiches Doctolib à la main pour y lire un secteur conventionnel qu'un CSV
donne en une seconde serait du gâchis.

## Décisions de cadrage (valables pour tout le plan)

- **Le socle de T-005 reste la règle** (cf. `DECISIONS.md` §T-005 exécuté) : *pas de preuve, pas de
  valeur* ; une synthèse de moteur n'est pas une preuve ; les sources publiques n'écrivent que dans les
  champs **PATIENT** ; toute valeur ajoutée porte sa provenance.
- **⚠️ Le point 5 de T-005 (« le carnet fait foi ») est amendé pour P2.** Il avait été calibré contre
  des **synthèses de moteur** qui inventaient — pas contre des sources primaires datées. **Le critère
  devient : qui est daté, et sur quel champ.** Justification complète en `S1.md` §« Ce qui change ».
  > **⚠️ Mesuré après S1 — l'hypothèse qui a motivé cet amendement était fausse.** On croyait les
  > carnets vieillis : **ils sont d'accord avec la CNAM 118 fois sur 119** (1,3 % de désaccord au
  > palier haut, 0 % au palier bas). Le gain n'a pas été la correction (**1** valeur) mais le
  > **remplissage** (`secteur_conv` 196 → 307). La règle tient ; **sa portée est minuscule.**
  > Ce que l'amendement a vraiment rapporté, c'est d'avoir débloqué 4 noms, 7 arrondissements
  > incohérents et 13 fiches contredites rendues visibles. Cf. `DECISIONS.md` §Addendum du 2026-07-17.
- **⚠️ Doctolib (S2) n'écrase rien** *(révisé après S1)*. Le carnet a tenu tête à la source
  **autoritaire** dans 98,7 % des cas ; Doctolib est **déclarative et non datée**. En cas de
  contradiction, le pari le plus probable est que **Doctolib a tort**. Il remplit les vides, signale
  les écarts, **un humain tranche**. Le mécanisme « créneaux ouverts → la page écrit » est **annulé**.
- **Faits administratifs → la source datée gagne** (`secteur_conv`) : la CNAM ne témoigne pas du
  secteur conventionnel, **elle l'attribue**. Elle écrit, y compris contre le carnet.
  > **Corrigé après S1 :** ~~`rpps`, `civilite`~~ sortent de cette liste. Le fichier ne porte pas de
  > RPPS, et sa « civilité » vaut H/F — c'est le **genre**, pas le titre : écrire « M. » par-dessus le
  > « Dr » d'un carnet aurait été une régression de précision.
- **Jugement, relationnel, consignes → le carnet reste seul.** Aucune source publique n'a rien à en
  dire, donc aucune ne les touche.
- **Rien n'est effacé** : une valeur de carnet écrasée reste en `_meta` + commentaire `alerte` sourcé
  portant les deux valeurs. Le carnet est **antidaté, pas supprimé**.
- **Une info de terrain récente bat tout** (`signalement_msp` : le centre Haxo est fermé, le web ne le
  sait pas). Ce n'est pas une exception à la règle — c'est la règle : la plus récente des sources
  datées gagne.
- **`source_type` distingue les deux passes** : `annuaire_sante` pour l'open data, `doctolib` pour la
  passe navigateur. Le champ existe déjà et son enum les couvre.
- **Aucune donnée de patient**, jamais. Invariant du projet.
- **L'open data prime sur le web** pour `secteur_conv` : c'est la CNAM qui produit la donnée. En cas de
  conflit CNAM ≠ Doctolib, la CNAM gagne et l'écart part en commentaire.
- **Relecture humaine** : toute fiche modifiée passe ou reste en `a_verifier`. C'est elle qui rattrape
  un antidatage abusif — d'où l'exigence de trace.

## Sessions

| Session | Titre | Modèle | Effort | Dépend de | Zone modifiée | Statut |
| --- | --- | --- | --- | --- | --- | --- |
| [S1](S1.md) | Open data CNAM : récupération, jointure, application hors ligne | Opus | xhigh | — | `supabase/import/`, `supabase/annuaire_donnees.json`, `supabase/seed_annuaire.sql` | [x] exécutée le 2026-07-17 (commit à renseigner en fin de plan) |
| [S2](S2.md) | Doctolib via Claude in Chrome — **vague A : 200 fiches en ~10 micro-séances de 20** | Opus | xhigh | S1 | `supabase/import/doctolib_worklist.json`, `annuaire_donnees.json` | [ ] |
| [S3](S3.md) | Consolidation : audit, regen du seed, `STATUS`/`DECISIONS`/`IMPORT.md`, commit | Sonnet | medium | S1, S2 | fichiers de contexte | [ ] |

> S2 n'est **pas une session unique** : c'est un protocole rejoué autant de fois que nécessaire, en
> micro-séances de **20 fiches maximum** (cf. S2 §T4). Son cadrage définitif est écrit juste avant sa
> vague, une fois S1 rendue — c'est S1 qui produit la worklist.
>
> **Le découpage en séances ne s'écrit nulle part : il émerge du tri** (« les 20 premières `a_faire`
> par `priorite` »). Et le protocole **ne vit pas dans le dépôt** — Claude in Chrome n'a pas le
> système de fichiers : il vit dans un **onglet « Protocole » du Sheet**, à côté des données
> (cf. S2 §T4.4). Amorcer une séance = coller une phrase.

## Ordonnancement

- **Vague 1** : S1 seule. Hors ligne, aucune dépendance externe.
- **Vague 2** : S2, après S1. **Non parallélisable** : un seul navigateur, piloté par un humain,
  en micro-sessions successives.
- **Vague 3** : S3, consolidation — une fois la worklist épuisée **ou** Thibault satisfait de la
  couverture (elle est utile dès la première micro-session).

## Pré-requis externe

- **S1** : rien. Le fichier est en téléchargement libre.
- **S2** : Claude in Chrome installé, session Doctolib ouverte dans le navigateur de Thibault,
  **Thibault présent** (c'est son navigateur, sa session, son rythme).

## ⚠️ Contrainte dure de S2 — Claude in Chrome perd les sessions au compactage

**Une session qui atteint la limite de compactage est perdue**, pas dégradée : tout ce qui n'est pas
déjà sur le disque disparaît.

Le plan est construit autour de ça :

- **Sauvegarde après chaque fiche** (pas tous les 5 : la perte n'est pas partielle, elle est totale).
- **20 fiches par session, puis arrêt net** — même si tout va bien, même s'il « reste de la place ».
  À calibrer à la baisse (10-15) si le contexte grossit vite ; **jamais à la hausse**.
- **L'état vit dans un Google Sheet**, jamais dans le contexte. Claude in Chrome n'a pas le disque :
  sa mémoire durable, c'est la feuille, qu'il a nativement sous la main. Une session perdue ne coûte
  alors qu'elle-même, et la suivante rouvre le Sheet sans rien savoir de la précédente.

**La feuille est déjà écrite et pré-remplie** : ~~`supabase/import/doctolib_worklist.csv` — 693
lignes~~ → **remplacée par `supabase/import/s2_worklist.csv`, produite par S1** (1 052 lignes, une par
fiche). Importable tel quel dans Google Sheets (*Fichier → Importer*). Colonnes de contexte en lecture
seule (elles viennent des carnets : c'est le point de comparaison, pas l'arbitre) + colonnes de saisie.
`idx` est la clé de recollage : ne jamais la modifier.

Elle apporte en plus, pour chaque fiche, **l'état de jointure CNAM** et la colonne
`apport_doctolib_attendu`.

> ### ⚠️ « Absente de la CNAM » ne veut PAS dire « inutile de chercher sur Doctolib »
>
> **Les deux sources ont des couvertures complémentaires, pas emboîtées.** La CNAM référence
> l'exercice **libéral conventionné** ; Doctolib référence **qui prend des RDV en ligne** — y compris
> tout le paramédical non conventionné.
>
> Une absence CNAM recouvre des situations au pronostic Doctolib **opposé**. Le classement ci-dessous
> est celui que la worklist affiche désormais, fiche par fiche :
>
> | Pronostic Doctolib | Fiches | Qui |
> |---|---|---|
> | **seule source possible** | **80** | professions non référencées (psychologues, ostéos…) |
> | **souvent référencées** | **289** | services hospitaliers · centres de santé · imagerie · cliniques · cabinets |
> | faible | 124 | praticiens hospitaliers salariés |
> | quasi nul | 75 | associations · réseaux · PMI · CSAPA · ambulances · PASS · CPTS |
>
> ⚠️ **Les services hospitaliers et les centres de santé sont souvent sur Doctolib** (Thibault,
> 2026-07-17). Ne pas les écarter parce que ce sont des « structures » : Doctolib référence **qui
> prend des RDV**, pas qui est conventionné. Le pronostic est **advisory — aucune fiche n'est exclue
> de la liste.**
>
> Les **80 « professions non référencées »** sont **30 psychologues, 9 ostéopathes, 8 sexologues,
> 7 doulas, 6 psychomotriciennes, 3 diététiciennes…** — exactement le monde qui vit sur Doctolib.
> Elles sont absentes du fichier **parce que la CNAM ne les référence pas**, pas parce qu'elles
> n'existent pas. **Pour elles, Doctolib n'est pas une source d'appoint : c'est la seule qui existe.**
> Leur absence de la CNAM est un argument **pour** les ouvrir, pas contre.
>
> `IMPORT.md` conclut « inutile de les rechercher en S2 » : **vrai pour les 124 hospitaliers, faux
> pour ces 80.** Or **51 d'entre elles sont reléguées en priorité 4-7**, en queue de vague B.
> À corriger dans `gen_worklist_s2.py` (cf. S2 §T2).

Les **140 « non résolues »** sont l'autre gisement : des praticiens libéraux qui *devraient* figurer au
fichier et n'y ont pas été retrouvés — donc à identifier au navigateur (priorité 3).

C'est la même leçon qu'en T-005, en plus sévère : là-bas deux lots ont été perdus faute de sauvegarde
précoce, et la reprise à budget serré a été 6× plus productive que l'acharnement.

## État de départ (mesuré au 2026-07-16)

| | |
|---|---|
| Contacts | 1 052 |
| Avec `source_url` | 500 |
| Cherchées sans résultat | 266 |
| Jamais cherchées (hors cible) | 286 — dont 228 ont déjà une adresse, 37 hors Paris |
| **`secteur_conv` renseigné** | **196 / 1 052** ← la cible n°1 (dont 120 écrits par le web, **76 déjà dans les carnets**) |
| `rpps` renseigné | 196 ← les clés de jointure exacte (coïncidence de nombre : ce ne sont pas les mêmes fiches, 135 en commun) |
| `doctolib` renseigné | 200 (liens issus de résultats indexés, **jamais ouverts**) |
| `a_verifier` | 250 |

## Couverture : toutes les fiches, mais pas au même coût

**Consigne : chaque entrée de l'annuaire est confrontée aux deux sources.**

- **Open data (S1) : les 1 052, sans exception.** C'est une jointure — traiter 1 052 fiches ne coûte
  pas plus que 552. Les 500 déjà vérifiées sur le web y passent aussi : si la CNAM contredit ce
  qu'une page web a donné, on veut le savoir. Toutes ne matcheront pas (le fichier couvre les
  **libéraux et les centres de santé** — ni les services hospitaliers, ni les associations, ni les
  ressources en ligne) : une non-correspondance est un résultat, pas un échec.
- **Doctolib (S2) : deux vagues, pas un balayage** *(resserré le 2026-07-17)*. La worklist mêle trois
  travaux de valeur très inégale, et les faire d'un bloc coûte **~35 séances au navigateur avec
  Thibault présent** — le coût dominant de P2, et ce n'est pas des tokens, c'est son temps.
  - **Vague A — 232 fiches, ~12 séances** : les **142** liens jamais ouverts (risque actif : `Dr
    Balmain` prouve qu'un lien peut pointer sur un confrère) + les **58** dont un médecin affirme
    qu'ils existent (gain sûr) + les **32** « exerce-t-il encore ? » — absents du fichier national
    des libéraux conventionnés alors que leur profession y est référencée, **13 encore marqués
    `actif`**. Adresser un patient à quelqu'un qui est parti est un risque du même ordre qu'un
    lien faux. Vérifié : ce n'est pas un bug de jointure (cf. S2 §T2).
  - **Vague B — 127 fiches, ~7 séances : différée, non abandonnée.** De la prospection : rien
    n'indique que ces fiches soient sur Doctolib, et **S1 leur a déjà retiré l'essentiel** (secteur,
    adresse, RPPS). Elles restent `a_faire` dans le Sheet ; leur sort se décide **sur le bilan
    chiffré de la vague A**, pas aujourd'hui.
  - Les fiches non traitées sont **listées**, jamais silencieusement abandonnées.

## Ce que les deux sources **ne peuvent pas** trancher (mesuré le 2026-07-17)

Sur les praticiens libéraux et les centres, CNAM + Doctolib tranchent — c'est le gros de l'annuaire
(**571 praticiens**) et c'est l'hypothèse de travail de P2. Mais **« trancher toutes les données » est
faux sur deux fronts**, et le plan doit le dire pour ne pas promettre une complétude qu'il n'atteindra
pas :

**1. Des fiches absentes des deux sources par construction.** Le fichier CNAM couvre les **libéraux et
les centres de santé** ; Doctolib couvre les **praticiens et centres réservables**. Ni l'un ni l'autre
ne porte :

| Type | Fiches |
|---|---|
| hôpital | 111 |
| service hospitalier | 91 |
| association | 30 |
| imagerie (partiel) | 31 |
| réseau · CPTS · PMI · PASS · centre social · protocole · annuaire en ligne | ~35 |

→ **~250 fiches** (un canal d'avis Tenon, une PMI, un protocole CPTS) resteront exactement ce que le
carnet en dit. Une non-correspondance y est un **résultat attendu**, pas un échec (cf. S1 §T2).

**2. Des champs qu'aucune source publique ne porte** — et que l'étanchéité interdit d'écrire de toute
façon : `consignes_pro` (112), `email_avis` (108), `ligne_directe` (64), `portable` (61), `bip` (11).
Plus le jugement : `orientation` (332), `comments` (685).

**C'est la vraie valeur de l'annuaire, et elle est hors de portée des deux sources.** Ce que la MSP a
et que personne d'autre n'a, c'est précisément ce qu'aucun fichier ne peut produire. P2 fiabilise
l'administratif autour ; il ne touche pas au cœur.

## Ce que P2 ne fait pas

- **Pas de reprise de l'extraction** : les carnets sont extraits, fusionnés, arbitrés. P2 enrichit
  l'existant, il ne re-parse rien.
- **Pas de modification de l'UI.** Les deux champs ajoutés en T-005 (`email_rdv`, `comments.origine`)
  restent à câbler — c'est un chantier P1, tracé dans `STATUS.md`.
