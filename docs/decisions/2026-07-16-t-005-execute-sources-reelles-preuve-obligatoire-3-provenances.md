# 2026-07-16 — T-005 exécuté : sources réelles, preuve obligatoire, 3 provenances

Amende la décision « Migration des carnets » ci-dessus, confrontée au terrain. Import livré :
`supabase/seed_annuaire.sql` + `supabase/IMPORT.md` (rapport détaillé).

### Décision

1. **`ameli.fr` ne peut PAS être la source de référence** : `annuairesante.ameli.fr` répond
   *socket closed*, `doctolib.fr` renvoie 403, `aphp.fr` est protégé (Radware). Sources réelles
   retenues : **`sante.fr`** (RPPS, adresse) puis **`lemedecin.fr`** (le seul accessible donnant le
   **secteur conventionnel**), puis sites officiels non-AP-HP.
2. **Pas de preuve, pas de valeur** : toute donnée web écrite porte l'URL d'une page *réellement
   ouverte*, champ par champ (`_meta.enriched` dans `annuaire_donnees.json`, `source_url` en base).
3. **La synthèse rédigée d'une recherche n'est pas une preuve** — seuls les titres/URL le sont.
4. **Le web n'écrit jamais dans un champ pro.** Il peut confirmer qu'un numéro est pro, ou prouver
   qu'un mobile est public (le praticien le publie) → requalification `portable` → `tel_secretariat`.
5. **Le carnet fait foi sur le web**, sauf 4 exceptions : placeholder (`doctolib: "Doctolib"`),
   praticien parti (sur preuve), identité erronée (sur 2 critères concordants — le flag `garbled`
   n'est PAS une condition, il a été posé sans recherche), et **carnet qui doute de lui-même**
   (commentaire « à vérifier » + web qui tranche).
6. **Défaut prudent pour un mobile non qualifié** → champ pro, repromu sur preuve seulement.

### Raison du choix

Le point 3 n'est pas une précaution théorique : sur ce jeu, les synthèses de moteur ont produit
**une vingtaine d'erreurs**, dont un **numéro de téléphone inventé** (la page réelle portait celui
du carnet), des numéros faux **à un chiffre près** (Bluets `…41 08` vs `…41 00`), **deux fausses
fermetures** (Récup'air : la « fermeture » était le congé d'été), deux faux déménagements, et un
annuaire (`hopital.fr`) servant le contenu d'un hôpital sur l'URL d'un autre. Chacune, écrite,
envoyait un patient au mauvais endroit.

Le point 6 suit l'asymétrie du risque : un numéro public classé pro ne s'imprime pas (corrigible
d'un clic) ; un mobile perso de confrère classé patient finit **imprimé sur une feuille remise au
patient** — irrattrapable.

### Conséquences

- **`contacts.email_rdv`** (bloc PATIENT) : le bloc patient n'avait aucun champ mail, ce qui
  forçait les mails **publics** de prise de RDV (`rdv@ghpsj.fr`) dans `email_avis` (pro) — donc
  exclus de la feuille patient alors qu'ils sont faits pour elle. 43 fiches. **À câbler dans l'UI
  et sur la feuille d'impression.**
- **`comments.origine`** + `author_id` **nullable** : un commentaire a soit un auteur humain, soit
  une origine documentée (contrainte `comments_auteur_ou_origine`). Trois provenances :
  `repertoire_partage` (75), `enrichissement_web` (373), `signalement_msp` (1).
  Motif : le xlsx partagé et le web n'ont pas d'auteur, et **signer un avis du nom de quelqu'un qui
  ne l'a pas écrit détruit ce qui fait la valeur d'une reco**. Deux policies rendent ces
  commentaires curables par tout membre (sinon `author_id = auth.uid()` ne matche jamais `null` →
  ineffaçables à vie). **L'UI doit afficher ce libellé au lieu d'un auteur vide.**
- `signalement_msp` existe parce que **le web est en retard sur le terrain** : le centre Haxo a
  fermé (info MSP) alors que les pages en ligne ne documentent que la mobilisation de 2024.
  L'absence de preuve n'est pas une preuve d'absence.
- Reste à faire : `secteur_conv` (120 fiches seulement) et les fiches AP-HP sont le gisement d'une
  seconde passe, si ameli redevient accessible.

### Impact IA

Les 3 spécifications qui ont produit ce jeu sont reproductibles et valent d'être relues avant toute
reprise : elles encodent les pièges réels (homonymes parisiens, `Moisson-Meer`/`Moisson` à la même
adresse, `Néphrologie`/`Neurologie` à une lettre, deux `Alice` gynécologues à la même adresse).
