# Plan P4 — Ajout assisté : autocomplétion depuis une page Doctolib   (rédigé par Opus)

## Objectif d'ensemble

**Alléger la saisie d'un nouveau contact** en pré-remplissant le formulaire d'ajout à partir d'une
**page Doctolib déjà ouverte** dans le navigateur du membre. Un clic sur un **bookmarklet** lit la page,
en extrait les champs, et ouvre l'écran « Ajouter » de l'annuaire déjà rempli. Le membre relit, corrige,
enregistre.

**Ce que P4 n'est pas** : ce n'est **pas du scraping serveur**. Aller chercher une page Doctolib depuis
l'app ne marche pas — `DECISIONS.md` §T-005 le documente déjà (« doctolib.fr renvoie 403 » ;
anti-bot DataDome) — et le CORS l'interdirait de toute façon. On passe par **le navigateur du membre,
sur une page qu'il consulte légitimement** — même philosophie que la passe P2/S2 (Claude in Chrome :
navigateur et session de l'humain, une page à la fois).

## Décisions de cadrage (valables pour tout le plan)

Arbitrées avec Thibault le 2026-07-17 (à reporter dans `DECISIONS.md` en fin de plan) :

- **Forme : bookmarklet un-clic** (choix de Thibault), pas le copier-coller manuel. Un `javascript:` dans
  la barre de favoris qui, sur une page Doctolib ouverte, lit la page et rebondit vers l'annuaire.
- **Extraction : JSON-LD d'abord, DOM en repli** — **heuristique, aucune IA, aucune donnée qui sort**
  (choix de Thibault). Doctolib insère des données structurées schema.org (`Physician` /
  `MedicalBusiness` / `MedicalClinic`) : nom, spécialité, adresse, souvent **coordonnées GPS**. On les
  lit en priorité (stable) ; repli sur quelques repères du DOM pour les champs manquants.
- **Passage de relais sans CORS** : le bookmarklet **n'envoie rien par le réseau**. Il **ouvre**
  `${APP_ORIGIN}/nouveau?prefill=<payload>` (une navigation, pas une requête de fond → pas de CORS). La
  session persistée du membre fait le reste.
- **Provenance & prudence (doctrine T-005)** : une fiche pré-remplie arrive en **`statut = 'a_verifier'`**,
  avec **`source_url` = l'URL Doctolib** et **`source_type = 'doctolib'`**. Doctolib est **déclaratif et
  non daté** (`DECISIONS.md` 2026-07-17) → **jamais d'écrasement d'une valeur existante** ; relecture
  humaine avant enregistrement.
- **Étanchéité garantie par construction** : Doctolib est **destiné aux patients** → tout ce qu'on en
  tire est **identité / adresse / lien patient**, jamais une coordonnée pro. Le lecteur de `prefill`
  applique en plus une **liste blanche** de champs (T1) : même si un payload contenait un champ pro, il
  serait **ignoré**. Aucune coordonnée pro ne peut entrer par ce canal.
- **Synergie P3** : l'`adresse` récupérée alimentera le géocodage (P3) ; si le JSON-LD porte déjà des
  coordonnées GPS, on peut les passer directement — **mais P4 ne dépend pas de P3** (dégradation
  gracieuse si les colonnes géo n'existent pas encore).
- **Sécurité d'entrée** : le `prefill` est une **entrée non fiable** (il vient d'un bookmarklet). Le
  lecteur **valide, liste-blanche, borne les longueurs**, et n'injecte jamais dans un champ pro ni dans
  du HTML. On ne fait pas confiance au payload.

## Le contrat `prefill` (défini en S1, consommé par S2)

- URL : `${APP_ORIGIN}/nouveau?prefill=<data>` où `<data>` = JSON **encodé URL-safe** (base64url).
- **Clés autorisées (liste blanche)** — patient / identité / lieu uniquement :
  `nom, prenom, civilite, profession, etablissement, adresse, arrondissement, doctolib, site_web,
  tel_secretariat, email_rdv, secteur_conv, langues` + méta `source_url` + (optionnel, si P3)
  `latitude, longitude, geocode_score`.
- **Interdit** : tout champ pro (`ligne_directe, bip, portable, fax, email_avis, mssante,
  consignes_pro`) — rejeté par la liste blanche.

## Sessions

| Session | Titre | Modèle | Effort | Dépend de | Zone modifiée | Statut |
| --- | --- | --- | --- | --- | --- | --- |
| [S1](S1.md) | L'écran « Ajouter » lit un préremplissage `?prefill=` (contrat + liste blanche + bandeau « à vérifier ») | Sonnet | medium/high | — | `src/features/edition/`, `src/data/directory.ts` (au besoin) | [ ] |
| [S2](S2.md) | L'extracteur Doctolib + le bookmarklet + notice d'installation | Sonnet/Opus | high | S1 (contrat) + app déployée | `tools/doctolib-bookmarklet/` | [ ] |
| [S3](S3.md) | *Conditionnelle* — mini-extension navigateur, **seulement si la CSP de Doctolib bloque le bookmarklet** | Sonnet | medium | S2 (constat CSP) | `tools/doctolib-extension/` | [ ] |

## Ordonnancement

- **Vague 1** : **S1** — purement dans l'app, aucune dépendance externe. Elle **fige le contrat**
  `prefill` que S2 devra respecter.
- **Vague 2** : **S2**, après S1 (elle a besoin du contrat) et une fois **l'URL de prod connue**
  (`APP_ORIGIN` Vercel).
- **Vague 3 — conditionnelle** : **S3** n'existe que **si** S2 constate que la CSP de Doctolib empêche
  le bookmarklet de s'exécuter. Différée, non abandonnée (même logique que P2/S2 : on décide sur le
  constat, pas d'avance).

## Pré-requis externe

- **S1** : rien.
- **S2** : l'app **déployée** (URL Vercel stable pour `APP_ORIGIN`) ; un accès à une **vraie page
  Doctolib** de praticien pour relever la structure JSON-LD réelle (Thibault, dans son navigateur).
- **S3** : seulement si déclenchée.

## Risque connu (à assumer)

**Maintenance continue** : extraire d'un site tiers dépend de son HTML. Doctolib change sa page → il
faut adapter l'extracteur. Le **JSON-LD est plus stable que le DOM**, ce qui limite la casse, mais ce
n'est pas « posé une fois pour toutes ». C'est la même leçon que P2/S2. À l'échelle de la MSP, gérable.
