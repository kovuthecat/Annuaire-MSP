// Hook SessionStart — rend visible la dérive du contexte au lieu de la laisser se découvrir
// trois semaines plus tard, ET injecte les règles communes (CLAUDE-BASE.md) dans le contexte
// de session (D-P2-2 : remplace l'import `@C:\...\CLAUDE-BASE.md` du CLAUDE.md projet, qui ne
// fonctionne pas en cloud). Les vérifications de dérive n'écrivent RIEN si tout est sain ;
// l'émission de CLAUDE-BASE.md, elle, a lieu à chaque session (coût token assumé, D-P2-2).

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  lireEntree, repertoireProjet, estUnDepot, git, depassements, vagueParallele, worktreeLie,
  repondre, riendafaire,
} from './lib.mjs';

const ICI = dirname(fileURLToPath(import.meta.url));

const entree = await lireEntree();
const cwd = repertoireProjet(entree);

if (!estUnDepot(cwd)) riendafaire();

const lignes = [];

// Émission de CLAUDE-BASE.md — chemin relatif au fichier du hook (comme lib.mjs pour plafonds.json),
// jamais de chemin absolu : portable en cloud comme dans un plugin installé depuis le cache.
// Sautée sur `resume` : les règles sont déjà dans le contexte repris, les réinjecter les duplique.
// Émise en revanche sur `compact` — après compaction, le contexte a justement été élagué.
// Le champ est `session_start_reason` ; `source` est lu en repli, la doc étant ambiguë sur le nom
// et un faux négatif ici ne coûtant qu'une réinjection (le comportement d'avant cette ligne).
const reprise = (entree.session_start_reason ?? entree.source) === 'resume';
const cheminClaudeBase = join(ICI, '..', 'CLAUDE-BASE.md');
let claudeBase = '';
if (reprise) {
  claudeBase = '';
} else if (existsSync(cheminClaudeBase)) {
  try {
    const contenu = readFileSync(cheminClaudeBase, 'utf8');
    claudeBase =
      '<!-- règles communes injectées par le plugin workflow -->\n' + contenu;
  } catch {
    claudeBase = '**Avertissement** : CLAUDE-BASE.md illisible malgré sa présence.';
  }
} else {
  claudeBase =
    '**Avertissement** : CLAUDE-BASE.md introuvable à la racine du plugin (.claude/workflow/CLAUDE-BASE.md).';
}

if (vagueParallele(cwd)) {
  lignes.push(
    '**Vague parallèle en cours** (`.claude/wave.lock`) : ne touche ni STATUS.md, ni TASKS.md, ' +
    "ni plans/P*/index.md ; ni commit ni push (ils sont bloqués par hook)."
  );
  // Le PreToolUse ne voit que ce qui passe par un outil : une pastille lancée « avec worktree »
  // crée l'arbre AVANT le premier tour, hors de sa portée. Ce contrôle-ci est le seul qui l'attrape,
  // et il tombe au premier tour — pas après une session de travail perdue d'avance.
  if (worktreeLie(cwd)) {
    lignes.push(
      "**STOP — session de vague ouverte dans un worktree.** Une vague partage un seul arbre de " +
      "travail : le diff produit ici ne sera vu ni par l'orchestrateur ni par la consolidation, et " +
      "le verrou interdit le commit qui permettrait de le rapatrier. Ne code pas : signale-le, et " +
      "redemande la session dans l'arbre principal (pastille → « Démarrer localement »)."
    );
  }
}

const dernierStatus = git(cwd, 'log', '-1', '--format=%H', '--', 'STATUS.md');
if (dernierStatus) {
  const retard = git(cwd, 'rev-list', '--count', `${dernierStatus}..HEAD`);
  if (retard && Number(retard) >= 3) {
    lignes.push(`**STATUS.md a ${retard} commits de retard** — vérifie qu'il décrit encore l'état réel.`);
  }
}

for (const d of depassements(cwd)) {
  lignes.push(`**${d.fichier} : ${d.lignes}/${d.plafond} lignes** — archivage dû (/purge-contexte).`);
}

const blocs = [];
if (claudeBase) blocs.push(claudeBase);
if (lignes.length > 0) {
  blocs.push(`État du contexte projet (hook workflow) :\n- ${lignes.join('\n- ')}`);
}

// Reprise sans dérive à signaler : rien à dire, on n'écrit pas.
if (blocs.length === 0) riendafaire();

repondre({
  hookSpecificOutput: {
    hookEventName: 'SessionStart',
    additionalContext: blocs.join('\n\n'),
  },
});
