# VALIDATION.md — jugement humain en attente (N2 uniquement)

> Ce fichier ne contient que du N2 : jugement esthétique/UX. Ce qu'un navigateur peut constater
> seul (rendu correct, élément présent/absent, comportement d'écran) est du **N1** — vérifié par
> Claude via `/verif-visuelle`, jamais consigné ici durablement. Cf. `WORKFLOW.md` §6.
> Plafond : 120 lignes (appliqué par hook). Un bloc par écran/module courant.
>
> **Comment tester** : sur le déploiement Vercel, ou en local `npm run dev`. Pré-requis : avoir
> rejoué `supabase/schema.sql` et avoir un compte (Auth → Users → Add user).

## Purge du 2026-07-29 (migration workflow N0/N1/N2)

Les checklists de Connexion, Layout, Annuaire, Fiche détail, Ajouter/Modifier, Sélection &
impression, Proximité & cartographie, Ajout Doctolib, Membres, facette Catégorie et les deux audits
d'ergonomie mobile ont été retirées : `STATUS.md` les liste toutes comme **« vérifié en
production »** (données réelles, usage quotidien MSP depuis le 2026-07-19) — les garder ici comme
« en attente » aurait été inexact. Détail entier : `git log -- VALIDATION.md` + `docs/decisions/`.
Seuls restent les deux chantiers **pas encore déployés**.

## Coordonnées des membres — tél. pro / perso (2026-07-21, non déployé)

> **Pré-requis DB** : rejouer `supabase/schema.sql` (ajoute `members.tel_pro`/`tel_perso`,
> idempotent) sur la base de prod **avant** de tester l'écriture.

- [ ] Écran Membres → « Mon profil » : les deux champs apparaissent, se remplissent, persistent
      après rechargement ; vider un champ le remet bien à vide.
- [ ] Liste des membres : ligne « Pro : … · Perso : … » n'affiche que les numéros renseignés ; liens
      `tel:` cliquables ; un autre membre voit mes numéros mais ne peut pas éditer ma fiche.

## Retours V1 mobile — 4 correctifs (2026-07-20, non déployé)

> Diagnostic overflow confirmé en direct dans le navigateur (popover à `left:-32px`).

- [ ] Popover de commentaires (annuaire + fiche, iPhone) : reste entièrement dans l'écran, plus de
      débordement gauche/droite.
- [ ] Largeur d'écran (annuaire, iPhone) : contenu occupe toute la largeur, plus de bande blanche.
- [ ] Carte sur une fiche : ne passe plus au-dessus de la barre de navigation basse.
- [ ] Recherche « Paris 20 » = « 75020 » = « 20e » = « 20ème » : même liste de résultats ; « Paris
      11 » ne ramène pas ceux du 20e.
