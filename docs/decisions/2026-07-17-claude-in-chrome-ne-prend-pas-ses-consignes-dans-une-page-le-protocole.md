# 2026-07-17 — Claude in Chrome ne prend pas ses consignes dans une page : le protocole revient dans le prompt

### Décision

**Le protocole d'une séance S2 est un prompt**, collé en entier par Thibault au début de chaque
séance : `plans/P2/S2_PROMPT.md`. **L'onglet « Protocole » du Sheet est abandonné comme exécutable** —
il reste comme référence humaine et comme source du texte du prompt.

### Contexte

`S2.md` §T4.4 et `plans/P2/index.md` prescrivaient l'inverse : « le protocole doit vivre dans le
Sheet, pas dans le dépôt », amorce d'une séance = **une phrase**. `gen_worklist_s2.py` produisait
`s2_protocole.csv` pour ça.

**Essayé le 2026-07-17 : Claude in Chrome refuse de travailler à partir du protocole inséré dans le
classeur.** Il traite délibérément tout contenu de page — onglet Google Sheets compris — comme **des
données**, jamais comme **des instructions**. C'est sa **défense contre l'injection de prompt** : sans
elle, n'importe quelle page web pourrait lui donner des ordres. **Ce n'est pas un bug, et ça ne se
contourne pas** — c'est même exactement la propriété qu'on veut d'un agent qui navigue.

**Un second refus a suivi**, de nature différente : sans le contexte du travail, la tâche se présente
comme « ouvre 20 pages Doctolib et extrais-en les données ». Le prompt porte donc aussi la
**justification** — les quatre clauses de `S2.md` §« Pourquoi un navigateur » (fiches ciblées, une par
une, navigateur et session de Thibault, humain présent, outil interne à la MSP) et le risque patient
concret qui motive la session (`Dr Balmain` : un lien pointant sur le profil d'un confrère).

### Alternatives envisagées

- **Onglet « Protocole »** : ne fonctionne pas, cf. ci-dessus. Écartée par constat, pas par arbitrage.
- **Protocole dans le dépôt, lu par Claude in Chrome** : impossible, il n'a pas le système de
  fichiers. C'était le motif d'origine, et il reste vrai.
- **Prompt collé à chaque séance** : retenue. Coût = recoller une page de texte ~12 fois.

### Raison du choix

C'est la seule qui marche, et le coût est payable. **Le raisonnement d'origine était juste sur la
prémisse et faux sur la conclusion** : « il n'a pas le disque, donc mettons les consignes dans la
page » confond *ce qu'il peut lire* et *ce dont il prend ordre*. La bonne conclusion de la même
prémisse était : **les consignes viennent de l'utilisateur, les données viennent de la page.**

### Conséquences

- **Ce que ça ne casse pas — et c'est l'essentiel** : le Sheet reste la mémoire des **données**, ce
  qui était le vrai enjeu de T4 (une séance perdue ne coûte qu'elle-même, écriture après chaque
  fiche). **Seule l'amorce change**, d'une phrase à une page.
- **Deux sources à tenir synchronisées** : `s2_protocole.csv` (via `PROTOCOLE` dans
  `gen_worklist_s2.py`) et `S2_PROMPT.md`. Toute règle modifiée doit l'être aux deux endroits.
- Corrigés sur place : `S2.md` §T4.3, §T4.4, amorce, critères de fin, contexte à lire ;
  `plans/P2/index.md` §Sessions ; commentaire de `gen_worklist_s2.py`.
- **Vagues B et C** : le prompt est réutilisable **à deux mots près** (la vague filtrée, et le
  garde-fou correspondant). Ne pas en réécrire un neuf — c'est celui-ci qui porte la justification du
  travail, la partie la plus coûteuse à reconstituer.

### Impact IA

**Une règle générale, au-delà de S2 : on ne pilote pas un agent navigateur par un document qu'il
navigue.** Tout protocole destiné à Claude in Chrome doit venir du prompt. Un fichier, un onglet, une
page — quelle que soit sa provenance et même si c'est nous qui l'avons écrit — est **de la donnée pour
lui**. La règle à retenir pour tout futur usage : **ce qu'il lit ne le commande jamais.**

Corollaire moins évident, et c'est le second refus : **un agent navigateur a besoin du *pourquoi*, pas
seulement du *quoi*.** Une consigne d'ouvrir des pages en série, présentée nue, est indistinguable
d'une collecte de masse — et refusée à juste titre. Le contexte n'est pas de l'ornement dans le
prompt : c'est ce qui rend la tâche évaluable.
