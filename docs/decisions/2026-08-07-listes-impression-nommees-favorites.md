# 2026-08-07 — Listes d'impression nommées et favorites

## Décision
Nouvelle entité **liste d'impression nommée** (`print_lists` + `print_list_items` +
`print_list_favorites`), distincte de « ma liste » (`list_entries`, adoption d'UNE fiche). Visible
de **tous les membres** (« Mes listes » / « Toutes les listes », même bascule que Mes contacts/Tous),
mais **éditable (renommer/contenu/suppression) par son créateur seul** — pas d'édition collaborative
comme sur les contacts. N'importe quel membre peut la mettre en **favori** (même principe que
`StarToggle`/`list_entries`, appliqué à la liste plutôt qu'au contact).

## Contexte
Demande Thibault : pouvoir enregistrer une sélection d'impression sous un nom réutilisable (« Adressage
cardio », « Adressage pneumo »…), la retrouver, la partager avec l'équipe, et la marquer en favori.
L'existant (`SelectionProvider`) est un panier de travail **transitoire** (sessionStorage, non nommé,
non partagé) — insuffisant pour un usage répété dans le temps.

## Alternatives envisagées
- Étendre `list_entries` avec un groupement par nom : rejeté — `list_entries` a une sémantique figée
  (« adoption d'une fiche par moi », clé primaire `(member_id, contact_id)`), la détourner en porteur
  de listes nommées aurait cassé cette sémantique et sa RLS.
- Édition collaborative des listes (comme les contacts) : écartée pour la V1 — une liste nommée est un
  outil de travail personnel qu'on partage en lecture/impression, pas une fiche à enrichir
  collectivement ; réévaluable si un besoin réel de coédition apparaît.

## Raison du choix
Garder `list_entries` intact (un seul rôle : adoption). Les listes nommées sont un objet à part,
avec son propre cycle de vie (créer/renommer/supprimer par le propriétaire) et sa propre relation de
favori (comme les contacts), sans complexifier ni l'un ni l'autre modèle.

## Conséquences
- RLS : `print_lists`/`print_list_items` lisibles par tout membre, écrits seulement par le
  propriétaire (vérifié par sous-requête sur `print_lists.owner_id`) ; `print_list_favorites` suit le
  principe self-only de `list_entries`.
- `SelectionProvider` gagne `setSelection(ids)` pour charger le contenu d'une liste dans la sélection
  d'impression courante (« Imprimer cette liste »).
- Écrans `/listes` et `/listes/:id` + raccourci « Enregistrer comme liste » dans
  `SelectionPanel` (écran impression).

## Impact IA
`PROJECT_MAP.md` à mettre à jour (nouvelle feature `listes/`, nouvelles tables schema.sql) à la
prochaine purge de contexte.
