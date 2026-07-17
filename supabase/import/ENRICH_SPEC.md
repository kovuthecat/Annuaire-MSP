# Spec d'enrichissement web — Annuaire MSP

Tu complètes des fiches de praticiens/structures **à partir de sources web réelles que tu as
effectivement consultées**. Tu reçois un lot de fiches en JSON ; tu produis les mêmes fiches
enrichies.

## Règle absolue — zéro invention, provenance obligatoire

**Chaque valeur que tu ajoutes doit provenir d'une page que tu as réellement ouverte
(WebSearch puis WebFetch), et tu dois citer son URL.** Pas d'URL vérifiable = pas de valeur.

Tu n'écris JAMAIS un numéro, une adresse ou un mail « de mémoire », par déduction, par analogie
avec une autre fiche, ou parce qu'il « ressemble » à ce qui est attendu. Un numéro de téléphone
inventé dans un annuaire médical envoie un patient dans le mur — c'est le risque n°1 de cette
tâche, devant l'exhaustivité. **Une fiche incomplète est un succès ; une fiche inventée est un
échec.**

Ne devine jamais une URL Doctolib par construction (`doctolib.fr/dermatologue/paris/prenom-nom`).
Tu ne la retiens que si tu as atterri dessus depuis une recherche et que la page existe vraiment.

## Vérification d'identité avant tout ajout

Avant de compléter une fiche, assure-toi que la page trouvée concerne **bien la même personne**.
Faisceau d'indices : nom + prénom, spécialité, arrondissement/adresse, établissement.

- Si la spécialité de la page contredit celle de la fiche → **ce n'est pas la même personne**,
  n'ajoute rien.
- Homonymes fréquents en région parisienne : en cas de doute, **n'ajoute rien** et note pourquoi.
- Piège réel de ce jeu de données : `Moisson-Meer Anne` (endocrinologue, 10 allée Darius Milhaud
  75019) et `Moisson Yves Frédéric` (dermatologue, **même adresse**) sont **deux personnes
  différentes**. Même nom + même adresse ≠ même personne.
- Un praticien peut exercer sur **plusieurs sites** : n'écrase pas une adresse existante, ajoute
  le site secondaire en `consignes_pro` ou en comment `info`.

## Ce que tu peux compléter

Uniquement des champs **vides** (`null`) de la fiche. **Tu ne modifies jamais une valeur déjà
présente** : elle vient du carnet d'un médecin qui connaît ce correspondant, elle fait autorité
sur le web.

Exceptions — dans TOUS les cas : garde la valeur d'origine dans un comment `info`, passe
`statut` à `"a_verifier"`, et mets l'URL dans `_meta.enriched.<champ>`.

1. **Le praticien est parti / a cessé** → ne modifie rien, `statut: "a_verifier"` +
   comment `alerte` sourcé.

2. **Placeholder** — la valeur présente n'est pas une donnée mais un marqueur de saisie :
   `doctolib` valant `"Doctolib"`, ou un champ valant `"-"`, `"."`, `"?"`, `"à compléter"`.
   Tu peux l'écraser par une vraie valeur sourcée. `doctolib: "Doctolib"` signifie « ce praticien
   est sur Doctolib », pas « voici son lien » : le remplacer par l'URL réelle est un gain net.

3. **Le carnet doute de lui-même** — la fiche porte un commentaire du type « code postal à
   vérifier », « incohérence signalée », « à confirmer », ou `statut` vaut déjà `"a_verifier"`,
   **et** le web tranche clairement. Exemple réel : adresse « 46 bd de Reuilly » avec
   `arrondissement: "75020"` alors que ce boulevard est dans le 12e. Corriger, c'est **respecter**
   le carnet — le médecin a écrit noir sur blanc qu'il n'était pas sûr. Ne t'en sers PAS pour
   contredire une donnée que le carnet affirme sans réserve.

4. **Nom manifestement erroné, `garbled` ou non** — cf. section « noms corrompus » ci-dessous.

Champs enrichissables, par priorité :
1. `adresse`, `arrondissement` (code postal)
2. `tel_secretariat` — ⚠️ **numéro public du cabinet/standard UNIQUEMENT**
3. `doctolib` (URL complète), `site_web`, `email_rdv`
4. `secteur_conv` — `"1"` / `"2"` / `"non_conv"` ; **`"centre"`** = centre de santé /
   « pas d'avance de frais » (structure conventionnée sans dépassement, pas un secteur au sens
   ordinal)
5. `etablissement` — souvent le seul apport utile pour un hospitalier : rattacher le praticien à
   son service/hôpital
6. `profession` / `civilite` / `prenom` si absents et confirmés
7. `rpps` si affiché
8. `pmr`, `langues`, `tarif`, `delai` — seulement si explicitement indiqués

Champs enrichissables, par priorité :
1. `adresse`, `arrondissement` (code postal)
2. `tel_secretariat` — ⚠️ **numéro public du cabinet/standard UNIQUEMENT**
3. `doctolib` (URL complète du profil), `site_web`
4. `secteur_conv` — depuis annuairesante.ameli.fr : « Conventionné secteur 1 » → `"1"`,
   « secteur 2 » → `"2"`, « non conventionné » → `"non_conv"`
5. `profession` / `civilite` si absents et affichés sans ambiguïté
6. `prenom` si absent et confirmé
7. `rpps` si affiché (annuaire santé)
8. `pmr` (accès handicapé), `langues` — seulement si explicitement indiqués

## ⚠️ Étanchéité patient / pro — vaut aussi pour le web

Tout ce que tu trouves sur le web public est par nature une **coordonnée PATIENT** →
`tel_secretariat`, `doctolib`, `site_web`, `email_rdv`.

`email_rdv` = adresse mail **publique de prise de RDV**, publiée pour les patients
(`rdv@ghpsj.fr`, `rhumatologie@hopital-dcss.org`, `allergo.tnn@aphp.fr`). À ne pas confondre avec
`email_avis`, qui est un canal **pro confidentiel** (mail nominatif d'un PH pour demander un avis
confraternel, boîte des internes). Le critère est l'usage affiché par la source, pas le domaine :
une adresse `@aphp.fr` publiée sur la page « prendre rendez-vous » d'un service est un `email_rdv`.

**N'ÉCRIS JAMAIS dans les champs PRO** (`ligne_directe`, `bip`, `portable`, `fax`, `email_avis`,
`mssante`, `consignes_pro`) depuis une source web. Ces champs contiennent le capital relationnel
des médecins de la MSP (bips, mobiles perso de confrères, lignes d'avis) — le web n'a rien à y
faire, et un numéro public promu en « ligne directe » ferait croire à un accès privilégié
inexistant.

Inversement : ne recopie pas dans `tel_secretariat` un numéro trouvé sur une page qui le présente
comme réservé aux professionnels.

### Cas particulier — requalifier un mobile ambigu (et uniquement sur preuve)

Certaines fiches portent un mobile `06`/`07` dans `portable` (champ PRO) **par défaut prudent** :
la source ne disait pas s'il était public ou privé. C'est fréquent chez les psychologues,
diététiciennes et kinés en ville, dont le mobile est souvent l'**unique numéro public**.

Tu peux requalifier `portable` → `tel_secretariat` **si et seulement si** tu constates que
**ce même numéro** (mêmes 10 chiffres) est **publié sur une page publique du praticien**
(profil Doctolib, site du cabinet, annuaire santé, page de la structure). C'est une preuve :
un numéro que le praticien publie lui-même est un numéro patient.

- Numéro publié et identique → déplace-le dans `tel_secretariat`, vide `portable`,
  et documente l'URL dans `_meta.enriched.tel_secretariat`.
- Le web affiche un numéro **différent** → mets le numéro public dans `tel_secretariat` et
  **laisse le mobile d'origine dans `portable`** : ce sont deux canaux distincts, et celui du
  carnet est probablement une ligne privilégiée. Ne perds jamais le numéro du carnet.
- Tu ne trouves rien → **ne touche à rien**. Le défaut prudent reste le bon.

Cette requalification ne s'applique **jamais** à un numéro portant un marqueur pro explicite dans
la source (`perso`, `numéro pro`, `de ma part`, bip, DECT), même s'il apparaît aussi sur le web.
Note ces requalifications dans `_meta.enrich_note`.

## Sources — état réel du terrain (vérifié le 2026-07-16)

⚠️ Deux sources « évidentes » sont **inaccessibles depuis cet environnement**. Ne perds pas de
temps dessus :

| Source | État | Usage |
|---|---|---|
| `annuairesante.ameli.fr` | ❌ **socket fermé** | inutilisable, n'essaie pas |
| `doctolib.fr` | ❌ **HTTP 403** au fetch | cf. règle Doctolib ci-dessous |
| `aphp.fr` et sous-domaines | ❌ anti-robot (Radware) | inutilisable, n'essaie pas |
| `sante.fr` | ⚠️ marche, 403 par intermittence | bonne source : RPPS, adresse, secteur |
| **`lemedecin.fr`** | ✅ **fetchable** | **la meilleure dispo pour `secteur_conv`** |
| `mablouseblanche.fr`, `doctoome.com`, `keskeces.com` | ⚠️ 429 possible | repli honnête |
| Site officiel non-AP-HP (`hopital-dcss.org`, `bluets.org`, assos…) | ✅ | le meilleur pour les structures |

Ordre conseillé : **`sante.fr` → `lemedecin.fr` → site officiel → autres agrégateurs**.
`lemedecin.fr` rend typiquement : nom exact, spécialité, adresse complète, **« Secteur 1 »**, tarif.

Ignore : avis patients, forums, e-réputation, annuaires scrapés douteux.

### Règle Doctolib (le fetch est bloqué)

Tu ne pourras jamais ouvrir une page Doctolib. Donc :
- Tu peux retenir une URL Doctolib **uniquement** si elle apparaît dans un résultat de recherche
  dont le **titre concorde** (nom + spécialité + ville). Tu la copies telle quelle.
- **Ne construis jamais** une URL Doctolib à la main, et ne la « devine » pas.
- Si plusieurs profils Doctolib concurrents existent pour un même nom → **n'en retiens aucun**.
- Note dans `enrich_note` que l'URL vient d'un résultat indexé et n'a pas pu être ouverte.
- **Ne lis jamais l'adresse ou le secteur « dans » un résultat Doctolib** : le texte de synthèse
  d'un moteur de recherche n'est pas une source primaire. Ces valeurs doivent venir d'une page
  réellement ouverte.

### Le texte de synthèse d'une recherche n'est pas une preuve

`WebSearch` renvoie des titres, des URL, **et** une synthèse rédigée. Les titres et URL sont
fiables ; **la synthèse ne l'est pas** (elle est générée). Ne remplis jamais un champ à partir de
la seule synthèse : ouvre la page. Si aucune page n'est ouvrable, n'écris rien.

## Noms erronés — que `_meta.garbled` soit à `true` ou non

Fiches issues de notes prises à la volée : « Jesoph Krolu », « cardio Besnenou »,
« Marina badasourian », « Amaselem orl.vigienie ». Objectif : **identifier** la personne réelle.

⚠️ **`garbled` n'est PAS une condition d'entrée.** Ce flag signale « note prise à la volée », pas
« nom faux » — et il a été posé à l'extraction, sans recherche web. Des noms manifestement erronés
portent `garbled: false` (`Boursounian` pour **Doursounian**, `SHAAN` pour **SCHAAN**). La règle
ci-dessous s'applique **à toute fiche**, quel que soit le flag.

- Utilise le contexte disponible (spécialité, arrondissement, établissement, un bout de numéro,
  un binôme cité — « Sénéchal et Etchegut », « Maigne → Boursounian »).
- **Critère de correction : au moins DEUX éléments concordants** (typiquement spécialité +
  localisation, ou spécialité + établissement, ou un binôme nommé confirmé). Alors :
  corrige `nom`/`prenom`, **ajoute un comment `info`** disant depuis quelle note la fiche a
  été identifiée — ex. « Fiche identifiée depuis la note d'origine « Marina badasourian ». » —
  et laisse `statut: "a_verifier"` (un humain confirme ; ne passe PAS à `"actif"` de ta propre
  autorité). Le médecin qui a écrit la note doit pouvoir reconnaître la sienne.

  ⚠️ **Une graphie erronée est REMPLACÉE, pas exposée** (arbitrage Thibault, 2026-07-17).
  N'écris **pas** de commentaire du type « Graphie d'origine dans le carnet : « X » » : un nom
  faux n'a pas à rester lisible dans l'app. Il n'est pas perdu pour autant — `recombine.py`
  le range dans `_meta.verbatim_carnet`, et la ligne brute du carnet reste dans
  `_meta.source_text`. Ce qu'un membre voit, c'est le nom juste ; ce qu'un relecteur retrouve
  dans le JSON, c'est ce que le carnet disait.

  **Ne pas confondre les deux** : le commentaire d'identification ci-dessus porte la **note
  entière** et le raisonnement (« Dr Illias Amny endocrinolgue » → HAMNY) — c'est ce qui rend
  la fiche reconnaissable à son auteur, et il reste. Ce qui disparaît de l'affichage, c'est la
  seule **graphie fautive isolée**.
- **Un seul élément concordant, ou simple ressemblance phonétique → ne corrige rien.** Laisse le
  nom tel quel et mets tes hypothèses dans `_meta.hypotheses` (tableau de chaînes).
  Rappel du piège : une lettre sépare parfois deux entités réelles et distinctes
  (Néphrologie/Neurologie, LUP 77/LUP 93). La ressemblance n'est pas une preuve.

## Sortie

Renvoie le même tableau JSON, mêmes fiches dans le même ordre, avec en plus par fiche :

```jsonc
{
  // …champs de la fiche, complétés…
  "source_url": "https://annuairesante.ameli.fr/…",   // page principale ayant servi
  "source_type": "doctolib|annuaire_sante|site_officiel|autre",
  "_meta": {
    // …méta existante conservée telle quelle…
    "enriched": {
      "adresse":        "https://annuairesante.ameli.fr/…",   // URL par champ ajouté
      "secteur_conv":   "https://annuairesante.ameli.fr/…"
    },
    "hypotheses": ["…"],          // si garbled non résolu
    "enrich_note": "Non trouvé : 2 homonymes dermatologues à Paris, aucun dans le 20e."
  }
}
```

`_meta.enriched` mappe **chaque champ que tu as rempli** vers l'URL exacte d'où vient la valeur.
C'est ce qui rendra possible la future fonction « revérifier cette fiche ». Un champ rempli sans
entrée dans `_meta.enriched` est un bug.

Si tu ne trouves rien pour une fiche : renvoie-la **inchangée**, avec `_meta.enrich_note`
expliquant ce que tu as cherché. C'est un résultat parfaitement acceptable et attendu pour une
bonne partie du lot.

## Budget

~2-4 recherches par fiche. Ne t'acharne pas : au-delà, note `enrich_note` et passe à la suivante.
Traite **toutes** les fiches du lot.

## Résumé final

Nombre de fiches traitées / enrichies / non trouvées, champs les plus souvent complétés,
noms corrompus résolus (avec la correspondance ancien → nouveau), et les cas douteux
que tu as volontairement laissés en l'état.
