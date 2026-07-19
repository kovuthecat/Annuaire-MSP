# Bookmarklet Doctolib → Annuaire MSP

Un favori (« bookmarklet ») qui lit la fiche Doctolib **déjà ouverte dans votre navigateur** et
ouvre l'écran « Ajouter » de l'annuaire, **prérempli**. Vous relisez, corrigez si besoin, et
enregistrez. Rien n'est envoyé sur le réseau par le bookmarklet lui-même : il ouvre juste un nouvel
onglet vers l'annuaire, avec les informations dans le lien.

> **Statut au 2026-07-19** : l'extraction a été testée sur **2 vraies pages Doctolib** (un centre
> sans praticien identifié, une praticienne individuelle) — voir §Vérification avant diffusion pour
> le détail et un bug trouvé et corrigé (nom de structure redécoupé en faux prénom/nom sur les pages
> centre/structure). **Reste à faire par un humain** : un clic réel sur le favori installé (le test
> du 2026-07-19 a exécuté le même code que le favori, mais pas via un clic `javascript:` littéral
> depuis la barre de favoris — cf. la nuance en fin de section ci-dessous) pour écarter tout blocage
> CSP au clic.

## Installation (30 secondes, une fois pour toutes)

Le fichier [`bookmarklet.txt`](./bookmarklet.txt) contient le lien complet (il commence par
`javascript:`). Il est volontairement long (~4,8 Ko) — copiez-le en entier.

### Chrome / Edge

1. Affichez la barre des favoris si elle est cachée : `Ctrl+Maj+B` (Windows) ou `Cmd+Maj+B` (Mac).
2. Clic droit sur la barre des favoris → **« Ajouter une page… »** (ou **« Ajouter un favori »**).
3. **Nom** : `→ Annuaire MSP` (ou ce que vous voulez, c'est juste une étiquette).
4. **URL** : ouvrez `bookmarklet.txt`, sélectionnez tout le contenu (`Ctrl+A`), copiez-le
   (`Ctrl+C`), puis collez-le (`Ctrl+V`) dans le champ URL du favori.
5. Enregistrer. Le favori apparaît dans la barre.

### Firefox

1. Affichez la barre personnelle : `Ctrl+Maj+B` (Windows) ou `Cmd+Maj+B` (Mac).
2. Clic droit sur la barre → **« Nouveau signet… »**.
3. **Nom** : `→ Annuaire MSP`. **URL/Emplacement** : coller le contenu de `bookmarklet.txt`
   (mêmes étapes de copier-coller que ci-dessus).
4. Enregistrer.

### Safari

1. Menu **Signets → Ajouter un signet** (ou `Cmd+D`) sur n'importe quelle page, pour créer un
   signet dans la barre de favoris.
2. Menu **Signets → Éditer les signets**, retrouver le signet créé.
3. Modifier son **adresse** pour y coller le contenu de `bookmarklet.txt` (Safari est plus
   restrictif : si le collage est refusé, utiliser Chrome/Edge/Firefox pour ce bookmarklet).

## Utilisation

1. Ouvrez la **fiche Doctolib** du praticien ou du centre (page publique, celle que vous
   consulteriez normalement pour trouver un numéro ou une adresse).
2. Cliquez sur le favori **« → Annuaire MSP »**.
3. Un nouvel onglet s'ouvre sur l'annuaire, écran « Ajouter », avec ce qui a pu être lu sur la page
   (nom, spécialité, adresse, lien Doctolib…) déjà rempli. Un bandeau rappelle que c'est un
   préremplissage à vérifier.
4. **Relisez chaque champ avant d'enregistrer.** Doctolib est une source déclarative (ce que le
   praticien a saisi lui-même), pas datée, pas vérifiée — exactement comme une donnée de carnet non
   confirmée. La fiche s'enregistre en statut **« à vérifier »**.
5. Complétez à la main ce qui manque (le bookmarklet ne devine jamais un champ absent — il le
   laisse vide plutôt que d'inventer).

**Rappel important** : le bookmarklet ne peut produire **que** des champs patient (nom,
spécialité, adresse, lien Doctolib, site web, langues…). Aucun champ « pro » (bip, ligne directe,
portable, fax, email d'avis…) n'est jamais rempli par ce chemin — même si vous le retrouviez par
erreur, il faudrait le supprimer manuellement, mais il ne doit normalement jamais apparaître.

## Que faire si rien ne se passe

- **Un nouvel onglet s'ouvre, vide (sans préremplissage)** : la page ne portait pas de données
  exploitables (pas de JSON-LD, structure inattendue) — normal sur certaines pages, saisissez à la
  main comme avant. Rien de cassé.
- **Aucun onglet ne s'ouvre du tout, et rien ne semble se passer** (parfois un message dans la
  console du navigateur mentionnant *"Content Security Policy"* ou *"CSP"*) : c'est le signe que
  Doctolib bloque l'exécution du bookmarklet. **Notez-le et signalez-le** — c'est exactement le
  constat qui déclenche la session de secours (mini-extension navigateur, cf. `plans/P4/S3.md`).
  Ce n'est pas grave, ça veut juste dire qu'on change d'outil pour la même tâche.

## Vérification avant diffusion (à faire par Thibault)

Avant de partager ce favori aux ~10 membres, tester sur **au moins 2 pages Doctolib réelles** (un
praticien, un centre) :

1. Le bookmarklet s'exécute-t-il (nouvel onglet qui s'ouvre) ou est-il bloqué par la CSP de
   Doctolib ?
2. Les champs récupérés sont-ils cohérents (nom, spécialité, adresse, lien Doctolib) ?
3. Sur une page de centre/structure : le nom part-il bien dans « établissement » et pas dans
   « nom » d'un praticien qui n'existe pas ?
4. Sur une page sans JSON-LD exploitable : pas de plantage, formulaire vide.

Consigner le verdict (OK / bloqué par la CSP) dans `plans/P4/S2.md` §Bilan de session — c'est ce
verdict qui décide si `plans/P4/S3.md` (mini-extension) doit être lancée.

### Résultat du test du 2026-07-19 (audit pré-partage)

Testé sur 2 pages réelles en exécutant le code de `extract.js` directement dans le contexte de la
page ouverte (équivalent fonctionnel à un clic sur le favori, à une nuance près expliquée plus bas) :

1. **Page praticienne individuelle** (`doctolib.fr/sage-femme/paris/anne-kammerer`) : extraction
   quasi parfaite — nom/prénom séparés correctement, profession (via le fil d'Ariane), adresse,
   arrondissement parisien bien déduit du code postal, téléphone patient, lien Doctolib canonique,
   et **14 tags** repris depuis les actes proposés (`availableService`). Aucune coordonnée pro
   remplie.
2. **Page centre/structure sans praticien identifié**
   (`doctolib.fr/cabinet-medical/boulogne-billancourt/centre-de-specialites-pediatriques-de-boulogne`) :
   **bug trouvé et corrigé** — le nom de la structure se retrouvait redécoupé en un faux
   prénom/nom de personne (« Centre » / « de Spécialités Pédiatriques de Boulogne ») par le repli
   DOM, qui ne savait pas qu'un nœud `MedicalOrganization` avait déjà identifié la page comme une
   structure. Corrigé le 2026-07-19 : `nom` reprend désormais le nom complet de la structure (comme
   `etablissement`), le repli DOM ne tente plus de deviner un nom de personne quand JSON-LD a déjà
   tranché. Re-testé sur la même page après correctif : conforme. Couvert par
   `tools/doctolib-bookmarklet/extract.test.js` (fixtures = JSON-LD réel des 2 pages).

**Nuance sur la méthode** : le test exécute le script avec les pleins privilèges de la page (comme
les DevTools), ce qui prouve que l'extraction fonctionne, mais diffère légèrement d'un clic réel sur
un favori `javascript:` depuis la barre de favoris. Les navigateurs bloquent rarement ce cas via CSP,
mais un clic réel par un membre reste la vérification qui lève le doute à 100 % avant diffusion.

## Maintenance

`extract.js` est la **source lisible** qu'on maintient (commentée, mapping JSON-LD → contrat
`prefill`, repli DOM). `bookmarklet.txt` est une version **minifiée générée automatiquement** — ne
jamais l'éditer à la main.

Après toute modification d'`extract.js`, régénérer le bookmarklet depuis la racine du repo :

```bash
node tools/doctolib-bookmarklet/build.cjs
```

Ce script réutilise `esbuild` (déjà présent dans `node_modules`, dépendance de Vite) — aucune
dépendance ajoutée, aucun `package.json` modifié. Si `esbuild` venait à disparaître des
dépendances, le script l'indique clairement plutôt que d'échouer silencieusement ; à défaut, une
minification manuelle reste possible pour ce volume de code (~350 lignes commentées).

## Ce que ce bookmarklet fait et ne fait pas

- **Ne fait aucune requête réseau vers Doctolib.** Il lit uniquement la page déjà chargée dans
  votre navigateur, sous votre session — pas de scraping serveur (qui échouerait de toute façon :
  `DECISIONS.md` §T-005, Doctolib renvoie 403 aux requêtes automatisées).
  Il ne contourne aucune protection anti-bot.
- **Priorité au JSON-LD** (données structurées schema.org que Doctolib insère dans la page pour
  les moteurs de recherche — `Physician`/`MedicalBusiness`/`MedicalClinic`/`Person`), stable et
  fiable. Le repli DOM (h1, liens `tel:`/`mailto:`, microdonnées d'adresse) ne joue que pour les
  champs qu'aucun JSON-LD ne fournit, et n'est **pas encore validé sur une vraie page** (cf.
  §Statut ci-dessus) — il pourra être affiné après le premier test réel.
- **N'invente jamais une donnée absente** : un champ non trouvé reste simplement vide dans le
  formulaire, à compléter à la main.
- **Passage de relais sans CORS** : le bookmarklet encode le résultat en base64url et **ouvre**
  `https://annuaire-msp.vercel.app/nouveau?prefill=<data>` dans un nouvel onglet — une navigation,
  pas un appel réseau de fond. La session de l'annuaire (connexion membre) fait le reste.
