# Spec d'extraction — Annuaire MSP

Tu extrais des contacts depuis un répertoire médical brut (notes libres d'un médecin généraliste
de la MSP Ménilmontant, Paris 20e) vers du JSON structuré, en vue d'un import Supabase.

## Règle absolue n°1 — NE RIEN INVENTER

Tu ne recopies QUE ce qui est écrit dans la source. Aucun numéro, aucune adresse, aucun mail
ne doit être « complété de mémoire » ou deviné. Un champ inconnu = `null`. **Un numéro de
téléphone inventé dans un annuaire médical est un dommage réel.** Si tu hésites, mets `null`
et signale via `_meta.needs_web = true`.

Les fautes de frappe de la source se corrigent UNIQUEMENT quand la correction est certaine et
purement orthographique (« Hopital » → « Hôpital », « doctolib » → Doctolib). Un nom propre
douteux (« Jesoph Krolu », « cardio Besnenou », « Marina badasourian ») se recopie **tel quel**
avec `statut: "a_verifier"` et `_meta.garbled = true`. Ne « répare » jamais un nom propre par
conjecture.

## Règle absolue n°2 — Étanchéité coordonnées patient / pro

C'est une règle produit non négociable du projet. Deux familles de champs :

**Coordonnées PATIENT** (imprimables, communicables au patient) :
`tel_secretariat`, `doctolib`, `site_web`
→ standard, secrétariat, numéro public du cabinet, lien Doctolib, site web.

**Coordonnées PRO** (confidentielles, jamais imprimées côté patient) :
`ligne_directe`, `bip`, `portable`, `fax`, `email_avis`, `mssante`, `consignes_pro`

Indices qui imposent le classement en PRO (liste non exhaustive, raisonne au cas par cas) :
- mention `(perso)`, `perso`, `portable perso`, `numéro pro`, `ligne directe`, `direct`
- `bip XXXX`, `DECT XXXXX`, `poste XX`
- « appelle-le de ma part », « tu peux l'appeler de ma part »
- « numéro d'avis », « avis par mail », « pour les correspondants », « ligne médecins »
- mail nominatif d'un praticien hospitalier servant à demander un avis (`x.y@aphp.fr`)
- mobile personnel d'un confrère nommé

Indices PATIENT : « numéro à communiquer aux patients », standard, secrétariat, Doctolib, accueil.

⚠️ Cas piégeux réels de ces sources :
- `Jean Manuel FAINTICH faintuch@orange.fr 06 09 65 64 92 (perso)` → `email_avis` + `portable`, PAS `tel_secretariat`.
- `STEIN Sophie numéro pour patients ... : 06.84.68.07.09` → là c'est explicitement patient → `tel_secretariat`.
- `geraud Gaube psychiatre numéro pro 07 66 63 32 16` → `portable` (pro).
- `Marie LE FLOCH ... tu peux l'appeler direct ou de ma part 07 88 04 20 92` → `portable` (pro).
- `Tenon 01 56 01 70 00 bip 5757` → `01 56 01 70 00` = standard (patient), `5757` = `bip` (pro).
- `permanence psy ... (06 86 67 06 38). Le numéro de portable c'est aussi un numéro qu'on peut donner aux patients.` → explicitement patient → `tel_secretariat`.

En cas de doute réel sur une coordonnée → classe en **PRO** (le défaut prudent) et note-le
dans `consignes_pro`.

## Schéma de sortie

Un tableau JSON d'objets. Champs (tous optionnels sauf `nom` et `type`) :

```jsonc
{
  "type": "praticien|structure|labo|autre",   // requis
  "sous_type": "hôpital|centre de santé|CPTS|clinique|CSAPA|PMI|association|réseau|PASS|ambulance|... ou null",
  "civilite": "Dr|Pr|M.|Mme|null",
  "nom": "SIDIBE",                            // requis — NOM de famille (praticien) ou nom de la structure
  "prenom": "Bénédicte",
  "profession": "Dermatologue",               // spécialité
  "orientation": "spé endométriose",          // surspécialité / créneau
  "etablissement": "Centre de santé Marie-Thérèse",
  "adresse": "1 bis allée Alquier-Debrousse",
  "arrondissement": "75020",                  // code postal ; null si inconnu
  "secteur_conv": "1|2|centre|non_conv|null", // "centre" = pas d'avance de frais / centre de santé
  "tel_secretariat": null, "doctolib": null, "site_web": null,
  "ligne_directe": null, "bip": null, "portable": null, "fax": null,
  "email_avis": null, "mssante": null, "consignes_pro": null,
  "prend_nouveaux": "oui|non|liste_attente|inconnu",   // défaut "inconnu"
  "delai": null,                              // "15 jours", "5 mois"
  "vad": false,                               // visite à domicile
  "ame_cmu": false,                           // accepte AME/CMU/C2S explicitement
  "pmr": false,
  "langues": null,                            // "anglais"
  "tele_expertise": null,                     // modalité d'avis à distance (Omnidoc, mail, fax...)
  "tarif": null,                              // "70 €", "90 €"
  "tags": ["endométriose", "colposcopie"],    // mots-clés libres, minuscules
  "statut": "actif|a_verifier|ne_prend_plus",
  "rpps": null,
  "comments": [
    { "type": "reco|alerte|spec|info", "texte": "Reco par Antonin, bon pour les problèmes d'alcool" }
  ],
  "_meta": {
    "source_owner": "anne|charlene|aurelien|antonin|partage",
    "source_line": 42,                        // n° de ligne dans le fichier raw
    "source_text": "…verbatim de la ligne…",  // la ligne brute, pour audit
    "needs_web": true,                        // données manquantes qu'une recherche web pourrait combler
    "garbled": false,                         // nom propre douteux / texte corrompu
    "confidence": "high|medium|low"
  }
}
```

### `type`
- `praticien` : une personne physique identifiée (Dr X, une sage-femme nommée, un kiné nommé).
- `structure` : hôpital, service hospitalier, centre de santé, clinique, PMI, CSAPA, association,
  réseau, CPTS, PASS, planning, maison des femmes, ambulance, plateforme d'orientation.
- `labo` : laboratoire de biologie.
- `autre` : ressource inclassable (site web, annuaire en ligne, appli, protocole, note administrative).

Imagerie/radiologie = `structure` (sous_type « imagerie ») sauf si c'est un radiologue nommé → `praticien`.

### `comments` — c'est là que va la valeur humaine
Les sources sont pleines de jugement clinique. **Préserve-le**, c'est le cœur de l'outil.
- `reco` : « reco par Antonin », « bon retour patient », « super top », « +++ », « très bien », « safe »
- `alerte` : « à éviter », « surchargés », « retard ++ », « cher », « un peu expéditif », « froide »,
  « comportement de drague très déplacé », « ne pose pas de DIU aux nullipares »
- `spec` : précision de surspécialité ou de pratique (« fait des colpo », « pose des DIU »)
- `info` : modalités pratiques (horaires, comment obtenir un RDV, procédure d'avis)

Reformule en français correct et lisible, **sans jamais changer le sens ni le degré**
(« bon » ne devient pas « excellent »). Garde l'attribution quand elle est présente
(« reco par Antonin », « selon Mr Salinas », « bon retour du père de Judith » → garde
« bon retour patient » et laisse tomber l'identification du patient, cf. règle n°3).

`JM LUPOGLAZOFF à éviter comportement de drague très déplacé… (MMe Loiseau)` →
comment `alerte`, texte « À éviter : comportement de drague très déplacé (signalé par une patiente). »
→ l'identité de la patiente est retirée.

## Règle absolue n°3 — Aucune donnée de patient

Les sources citent des patients par leur nom (« Mme Bouayad », « Mme HAPPE », « le père de Judith »,
« MMe Loiseau », « selon Mr Delfolie », « le dermato de Géraldine »). **Ne recopie jamais un nom de
patient.** Remplace par « une patiente » / « un patient » / « signalé par un patient ».
Les prénoms de collègues MSP (Antonin, Anne, Charlène, Elena, Mady Denantes…) peuvent rester :
ce sont les auteurs des recos, pas des patients.

## Découpage : une ligne peut contenir plusieurs contacts

Très fréquent chez Anne. Exemple :

> `- Colpo : Croix St Simon-Avron ; Anne-Sophie Michel à Trousseau ; Laure Paturel aux Bluets site Netter`

→ **3 contacts distincts** (1 structure + 2 praticiennes), chacun avec `tags: ["colposcopie"]`.

> `- Psychotrauma : Marie Moquet, 3e, EMDR 06 51 96 72 59 ; Stéphanie François, 18e, EMDR 06 66 70 41 85`

→ 2 praticiennes, `tags: ["psychotraumatisme","emdr"]`.

En revanche un bloc multi-lignes décrivant UN contact (nom / adresse / téléphone sur 3 lignes,
très fréquent chez Charlène et Aurélien) = **1 seul contact**.

## Titres de section = contexte

Les intitulés en majuscules (`DERMATOLOGIE`, `KINÉSITHÉRAPIE`, `VIOLENCE`) donnent la `profession`
et/ou un `tag` aux contacts qui suivent, jusqu'au titre suivant. Un sous-titre (`Dermato vulvaire :`,
`Épaule :`, `Balnéothérapie :`) donne l'`orientation` / des `tags`.

## Doublons internes

Certaines sources répètent des blocs entiers (Charlène : bloc GYNECOLOGUE répété 5×, bloc
ÉCHOGRAPHIE 3×). **Extrais chaque contact une seule fois.** La déduplication inter-fichiers
est faite plus tard — ne t'en occupe pas, occupe-toi seulement des répétitions internes.

## Bruit à ignorer

Ne crée PAS de contact pour :
- les scories de copier-coller Google (`Itinéraire`, `Enregistrer`, `Appeler`, `4,0`, `9 avis Google`,
  `Horaires : Ouvert ⋅ Ferme à 18:00`)
- les fragments vides ou inintelligibles (`radio secteur`, `es )`, `-`, `3`, `4`)
- les en-têtes de tableau du template xlsx (`Nom ;; Prénom ;; Structure ;;…`), `<< Retour à la page d'accueil`,
  les cellules de légende (`A jour`, `Vide`, `A completer/Mettre en forme`)
- les notes purement personnelles sans correspondant (brouillon de mail, `planning midi`,
  `règle de 3 du réseau d'ultra proximité`, critères ALD, règles de facturation NIR)

En revanche une **ressource utile sans personne** (protocole CPTS-UMP, formulaire de prélèvement,
`Inzee.care`, `monpsy.sante.gouv.fr`, `soliguide.fr`, annuaire Resendo, liste McKenzie) →
`type: "autre"`, avec `site_web` si une URL est présente. Ça a de la valeur pour la MSP.

## Sortie

Écris le tableau JSON dans le fichier de sortie indiqué, en UTF-8, sans BOM.
Pas de markdown, pas de ```json, juste le tableau JSON.
Ton message final = un résumé court : nombre de contacts, répartition par `type`, nombre
`needs_web`, nombre `garbled`, et les 3-5 cas qui t'ont posé le plus de problème.
