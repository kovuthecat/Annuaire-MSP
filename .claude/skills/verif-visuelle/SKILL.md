---
name: verif-visuelle
description: Vérification visuelle d'un écran ou d'un parcours — niveau N1 automatique via le navigateur in-app de Claude Code Desktop, ou sortie d'une checklist à dérouler à la main quand le navigateur n'est pas disponible (VSCode, terminal, session cloud, appli mobile). À utiliser après une tâche qui change l'UI, avant de consigner quoi que ce soit dans VALIDATION.md.
---

# Vérification visuelle

Trois niveaux (cf. `.claude/workflow/WORKFLOW.md` §6) :

| Niveau | Qui | Bloquant | Contenu |
| --- | --- | --- | --- |
| **N0** | Claude, toujours | oui | `build` + `typecheck` (+ tests unitaires si logique pure) |
| **N1** | Claude si navigateur dispo | non | erreurs console, contenu présent, requêtes 4xx/5xx, responsive |
| **N2** | l'utilisateur | non | jugement esthétique / UX / ton — rien d'autre |

Cette skill couvre **N1**. Elle ne fait jamais de N2 : Claude n'évalue pas si c'est beau.

## Étape 0 — Déterminer l'environnement

Regarde si les outils `preview_start` / `read_page` / `read_console_messages` sont disponibles
dans ta session.

- **Disponibles → Claude Code Desktop** : dérouler le mode A.
- **Absents → tout le reste** (VSCode, terminal, session cloud `claude.ai/code`, appli mobile) :
  dérouler le mode B. Ne pas tenter de contourner (pas de
  Playwright, pas de capture par script) — le navigateur in-app est le seul outil visuel autorisé
  à Claude.

Si le bandeau de la session indique `Environnement : Desktop` et que les outils sont absents, la
session a été lancée au mauvais endroit → **STOP**, signale-le, rends la main.

## Mode A — Navigateur in-app (Desktop)

1. **Ouvrir la preview** : `preview_start` avec le `name` de `.claude/launch.json`. Si le fichier
   n'existe pas, le créer à partir de la commande dev du `CLAUDE.md` du projet :

   ```json
   {
     "version": "0.0.1",
     "configurations": [
       { "name": "dev", "runtimeExecutable": "npm", "runtimeArgs": ["run", "dev"], "port": 5173 }
     ]
   }
   ```

2. **Naviguer** vers l'écran concerné par la tâche (`navigate`).
3. **Relever** — dans cet ordre, en s'arrêtant au premier échec bloquant :
   - `read_console_messages` (`onlyErrors: true`) → **aucune erreur**.
   - `read_page` → les textes/éléments attendus de la tâche sont **présents** (c'est ce qui attrape
     les écrans blancs et les composants qui ne montent pas).
   - `read_network_requests` → **aucun 4xx/5xx** sur les appels de l'écran.
   - `resize_window` mobile (375×812) puis desktop → **pas de débordement horizontal**,
     à ne faire que si la tâche touchait la mise en page.
4. **Interagir** seulement si la tâche portait sur une interaction : `computer` (clic/saisie) ou
   `form_input`, puis `read_page` pour confirmer l'effet.
5. **Capture** (`computer` `screenshot`) **uniquement** si un constat visuel doit être montré à
   l'utilisateur — une capture coûte cher en tokens, elle n'est pas le mode de vérification par défaut.

**Si un défaut N1 est trouvé** : lire le code, corriger, relancer l'étape 3. Un défaut N1 se
corrige dans la session, il ne se consigne **pas** dans `VALIDATION.md`.

**Si tout passe** : le noter dans le rapport de fin de tâche (« N1 OK : <écran>, console propre,
<élément> présent »). Ne rien écrire dans `VALIDATION.md`.

## Mode B — Pas de navigateur (VSCode, terminal, cloud, mobile)

Ne rien vérifier soi-même. Produire, dans la réponse, un bloc prêt à dérouler :

```
### Vérification visuelle à faire (N1 + N2) — <écran concerné>
Lancer : <commande dev exacte du CLAUDE.md du projet>
Ouvrir : <URL locale + route>

N1 (ce qui doit être vrai) :
- [ ] aucune erreur dans la console
- [ ] <élément/texte attendu de la tâche> visible
- [ ] <appel réseau clé> répond 200
N2 (jugement) :
- [ ] <ce qui relève du goût / de l'UX>
```

Puis **consigner uniquement la partie N2 dans `VALIDATION.md`** (bloc par écran, cf. l'en-tête du
fichier). La partie N1 reste dans la réponse : soit l'utilisateur la déroule tout de suite, soit la
session est rejouée depuis Desktop.

> Une session dont la validation N1 est structurante (nouvel écran, refonte de mise en page) gagne
> à être lancée depuis Desktop. C'est ce que déclare la colonne **Env.** de l'`index.md` du plan.
