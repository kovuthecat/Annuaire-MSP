// Hook PreToolUse (Bash | PowerShell) — applique les règles git de WORKFLOW.md §4b.
// Ces règles étaient jusqu'ici de la prose répétée dans 3 fichiers ; elles sont ici appliquées.
//   1. staging global interdit (git add -A / . / --all, git commit -a) ;
//   2. commit et push interdits tant qu'une vague parallèle est en cours (.claude/wave.lock).

import { lireEntree, repertoireProjet, vagueParallele, repondre, riendafaire } from './lib.mjs';

const entree = await lireEntree();
const commande = entree?.tool_input?.command;
if (typeof commande !== 'string' || !/\bgit\b/.test(commande)) riendafaire();

const cwd = repertoireProjet(entree);

function refuser(raison) {
  repondre({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: raison,
    },
  });
}

if (/\bgit\s+add\s+(-A\b|--all\b|\.(?:\s|$))/.test(commande)) {
  refuser(
    "WORKFLOW.md §4b : staging global interdit. Stage explicitement les fichiers de la tâche " +
    '(`git add <fichier> <fichier>`) — jamais `git add -A`, `--all` ni `.`.'
  );
}

if (/\bgit\s+commit\b/.test(commande) && /\s-(?:a|[a-zA-Z]*a[a-zA-Z]*)\b|--all\b/.test(commande) && !/--amend/.test(commande)) {
  refuser(
    "WORKFLOW.md §4b : `git commit -a` interdit. Stage explicitement les fichiers de la tâche, " +
    'puis `git commit -m "…"`.'
  );
}

if (vagueParallele(cwd) && /\bgit\s+(commit|push)\b/.test(commande)) {
  refuser(
    'Vague parallèle en cours (`.claude/wave.lock` présent) : ni commit ni push tant que toutes les ' +
    'sessions du plan ne sont pas exécutées (WORKFLOW.md §4b). La consolidation se fait en fin de plan, ' +
    'tâche par tâche. Supprime `.claude/wave.lock` pour clore la vague.'
  );
}

riendafaire();
