---
name: nouveau-carnet
description: Intègre un nouveau carnet de contacts (PDF, texte, xlsx...) transmis par un membre de la MSP dans le répertoire partagé — extraction, dédoublonnage contre la base existante, enrichissement web (dont Doctolib), géocodage, et génération du SQL incrémental pour la prod. À dérouler chaque fois qu'un membre transmet ses correspondants pour ajout à l'annuaire.
---

# Nouveau carnet — intégration dans l'annuaire partagé

Pipeline en 6 étapes. Les règles détaillées d'extraction et d'enrichissement vivent dans
`supabase/import/EXTRACTION_SPEC.md` et `supabase/import/ENRICH_SPEC.md` — **cette skill
orchestre, elle ne les recopie pas.** Relire ces deux fichiers avant de commencer : ils peuvent
avoir changé depuis la dernière intégration (corrigés une fois déjà, cf. `git log` sur
`ENRICH_SPEC.md`).

## Avant de commencer

- **Qui est la source ?** Un membre déjà enregistré (`supabase/set_member_prenoms.sql`,
  `src/features/auth/memberLogins.ts`) a déjà un slug + email → `_meta.source_owner` = son
  prénom en minuscules, sans accent. Sinon, demander à Thibault : un compte Supabase doit être
  provisionné avant tout SQL (`seed_owner_map` échoue sinon, par construction).
- **Taille de la source** : moins d'une cinquantaine de lignes → dérouler à la main dans la
  session (patron : intégration du carnet de Clara, 2026-08-10). Beaucoup plus gros (un carnet
  complet façon Elena/Maylis, des centaines de lignes) → passer par `/nouveau-plan`, ce n'est
  plus une tâche d'une session.

## 1. Extraction (`EXTRACTION_SPEC.md`)

Source brute → tableau JSON. Une ligne peut contenir plusieurs contacts distincts. Ne rien
inventer, `null` si inconnu. Retirer tout nom de patient cité. `_meta.source_owner` = le slug
déterminé ci-dessus, `_meta.source_text` = la ligne verbatim (trace d'audit).

## 2. Dédoublonnage contre `supabase/annuaire_donnees.json`

Chaque fiche extraite doit être confrontée à la base existante avant toute décision.

- Normaliser (minuscules, sans accents) et chercher par mots-clés sur `nom`, `prenom`,
  `etablissement`, `adresse`. Pas de fuzzy-matching automatique sur un petit lot : un script
  Python jetable dans le scratchpad de session (grep normalisé par mot-clé, puis lecture humaine
  des candidats) suffit très largement — voir la session Clara (2026-08-10) pour le patron.
- **Doublon confirmé** (même personne/structure : adresse, téléphone ou établissement
  cohérents) :
  - ajouter le slug à `_meta.owners` de la fiche existante — **jamais** créer une nouvelle
    fiche pour un doublon ;
  - ne remplir un champ existant que s'il est **vide** — ne jamais écraser une valeur déjà
    présente, elle vient d'un carnet qui fait autorité (même règle qu'en enrichissement web) ;
  - toute info neuve (horaires, sans rendez-vous, accepte les nouveaux patients...) devient un
    nouveau `comment` `{type:"info", author:<slug>}`, jamais une réécriture d'un champ existant.
- **Fiche vraiment nouvelle** : `idx` = **`max(idx sur toute la base) + 1`**, jamais dérivé du
  compte de fiches. ⚠️ **Piège vérifié le 2026-08-10** : la base a des trous (idx de fiches
  supprimées en triage, ex. `743, 753, 942, 993, 996, 1000, 1030`) — `idx = len(data) + 1`
  retomberait sur un idx déjà attribué à une fiche existante. Toujours calculer
  `max(c["_meta"]["idx"] for c in data) + 1`.
- **Info trop mince pour trancher seul** (un seul mot, aucune coordonnée, pertinence ambiguë —
  cf. la fiche IAPR de la session Clara) : garder `statut: "a_verifier"` et signaler le doute à
  Thibault en fin de session plutôt que de deviner.

## 3. Enrichissement web (`ENRICH_SPEC.md`)

Pour les fiches nouvelles ou aux champs encore vides. Règles clés (le détail complet est dans le
fichier, à relire) :

- **Pas de preuve, pas de valeur.** Un champ rempli doit venir d'une page **réellement ouverte**
  (`WebFetch`, ou le navigateur in-app pour Doctolib — voir plus bas). **La synthèse rédigée par
  `WebSearch` n'est jamais une preuve**, même quand elle cite une URL fiable (sante.fr, aphp.fr…) :
  ouvrir la page avant d'écrire quoi que ce soit. ⚠️ Piège vécu le 2026-08-10 : un numéro de
  téléphone accepté sur la seule synthèse `WebSearch` s'est révélé faux une fois la page (sante.fr)
  réellement ouverte par `WebFetch` — deux sources primaires en désaccord, ni l'une ni l'autre
  n'était la synthèse.
- **Doctolib** : `WebFetch` échoue toujours dessus (HTTP 403 systématique). Le navigateur in-app
  (`mcp__Claude_Browser__*`) ouvre les pages Doctolib sans blocage — mais **seulement en
  extraction sur une URL déjà identifiée** par un `WebSearch` classique (titre concordant
  nom+spécialité+ville), **jamais en recherche** sur Doctolib lui-même (risque anti-bot, jugement
  d'appariement à l'échelle — écarté par le plan). Une fois la page ouverte, **vérifier que le nom
  affiché correspond** avant d'écrire quoi que ce soit, puis lire les blocs
  `<script type="application/ld+json">` via `javascript_tool` : `Physician.availableService`
  donne les actes/compétences (→ `tags`), `telephone`/`address` les coordonnées structurées. Le
  champ `telephone` structuré est parfois vide ; un numéro trouvé dans le texte libre de la bio
  compte comme une source plus faible qu'une autre page réellement ouverte — en cas de désaccord
  entre deux sources primaires, ne tranche pas seul : note les deux avec leurs sources, passe
  `statut: "a_verifier"`.
- **Étanchéité patient/pro** vaut aussi pour le web : rien trouvé en ligne n'entre jamais dans un
  champ pro (`ligne_directe`, `bip`, `portable`, `fax`, `email_avis`, `mssante`, `consignes_pro`).
- **Géocodage** (si une adresse est confirmée) : `api-adresse.data.gouv.fr/search/?q=<adresse>`,
  ne retenir que si `score >= 0.6`, sinon laisser vide plutôt que deviner un point sur la carte.

## 4. Écriture locale — `supabase/annuaire_donnees.json`

1. **Backup d'abord**, systématique : copier vers `annuaire_donnees.bak-<slug>-<date>.json`.
2. Script Python jetable (scratchpad) : ajoute les fiches vraiment nouvelles en fin de tableau,
   patch les fiches doublons (owners + comments + champs vides uniquement, jamais un champ déjà
   rempli).
3. Vérifier après coup : `len(data)` a augmenté exactement du nombre de fiches nouvelles, et
   aucune fiche hors du lot traité n'a été touchée.

## 5. SQL incrémental — jamais un reseed complet

**L'app est en production depuis le 2026-07-19** (`STATUS.md`) : des membres réels ont pu
ajouter ou modifier des fiches depuis le dernier export local. Rejouer `gen_sql.py` sur
l'intégralité des 1200+ fiches régénérerait un reseed complet — risque de collision avec des
éditions faites en direct par un membre, et un fichier dépassant la limite ~1 Mo du SQL Editor
Supabase (déjà rencontrée, cf. `supabase/seed_split/`). **Toujours un script scoped aux seules
fiches touchées par cette intégration**, sur le patron de
`supabase/import/gen_sql_clara_incremental.py` (2026-08-10) :

- réutilise `cid()` / `q()` / `qarr()` de `gen_sql.py` (mêmes UUID déterministes uuid5, donc
  `on conflict (id) do nothing` reste valable et le script est rejouable sans doublon) ;
- 3 blocs d'insertion : les fiches **vraiment nouvelles**, les **commentaires nouveaux**
  (dédoublonnés par `(contact_id, texte, author)` — un commentaire déjà en base est ignoré
  automatiquement par le `where not exists`), les **`list_entries`** pour le nouveau
  propriétaire (et pour les propriétaires des fiches neuves) ;
- pour un **champ complété sur une fiche existante** : toujours
  `update ... set champ = coalesce(champ, 'valeur')` — jamais un `set champ = 'valeur'` nu, qui
  écraserait silencieusement une édition faite depuis l'appli par un membre ;
- ajouter le nouveau slug à `seed_owner_map`, avec son email (cf.
  `supabase/set_member_prenoms.sql` pour le retrouver) ;
- bloc de contrôle final (compte des fiches neuves présentes en base, compte dans « mes
  contacts » du nouveau membre).

Écrire dans `supabase/import/seed_<slug>_incremental.sql`.

## 6. Fin

- **Ne jamais exécuter le SQL en base de prod sans confirmation explicite de Thibault** —
  écriture visible par ~10 membres réels de la MSP, et Claude n'a de toute façon pas les
  identifiants Supabase en session normale. Présenter le fichier généré, laisser Thibault choisir
  comment l'exécuter (SQL Editor lui-même, le plus souvent).
- Noter l'intégration dans `STATUS.md` §« Non encore déployé », une entrée courte dans le même
  format que les autres (pas un nouveau sous-titre) — si ça fait dépasser le plafond de 80
  lignes, dérouler `/purge-contexte` avant de committer.
- Résumé de fin de session : nombre de fiches doublons enrichies / fiches vraiment nouvelles /
  fiches laissées `a_verifier`, et toute décision qui a besoin de l'avis de Thibault (identité
  douteuse, pertinence d'une ressource ambiguë, désaccord de sources non tranché).
