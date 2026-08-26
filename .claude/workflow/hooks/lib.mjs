// Utilitaires communs aux hooks du workflow Templates.
// Aucune dépendance externe (pas de jq, pas de npm install).

import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const ICI = dirname(fileURLToPath(import.meta.url));

export function lirePlafonds() {
  return JSON.parse(readFileSync(join(ICI, 'plafonds.json'), 'utf8'));
}

/** Lit le JSON envoyé sur stdin par Claude Code. Renvoie {} si vide/illisible. */
export async function lireEntree() {
  const morceaux = [];
  for await (const m of process.stdin) morceaux.push(m);
  try {
    return JSON.parse(Buffer.concat(morceaux).toString('utf8') || '{}');
  } catch {
    return {};
  }
}

/** Répertoire du projet : celui fourni par le hook, sinon le cwd du process. */
export function repertoireProjet(entree) {
  return entree.cwd || entree.project_dir || process.cwd();
}

/** Sortie brute de git (non trimée) — indispensable pour --porcelain, dont la 1re colonne est un espace. */
export function gitBrut(cwd, ...args) {
  try {
    return execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      windowsHide: true,
    });
  } catch {
    return null;
  }
}

export function git(cwd, ...args) {
  const sortie = gitBrut(cwd, ...args);
  return sortie === null ? null : sortie.trim();
}

export function estUnDepot(cwd) {
  return git(cwd, 'rev-parse', '--is-inside-work-tree') === 'true';
}

/** Fichiers modifiés/ajoutés/supprimés dans l'arbre de travail (chemins relatifs, / comme séparateur). */
export function fichiersModifies(cwd) {
  const sortie = gitBrut(cwd, 'status', '--porcelain');
  if (!sortie) return [];
  return sortie
    .split('\n')
    .map((l) => l.replace(/\r$/, ''))
    .filter((l) => l.length > 3)
    // Format porcelain v1 : 2 caractères de statut, un espace, puis le chemin.
    .map((l) => l.slice(2).trim())
    .map((f) => (f.includes(' -> ') ? f.split(' -> ')[1] : f))
    .map((f) => f.replace(/^"|"$/g, '').replaceAll('\\', '/'));
}

export function nbLignes(chemin) {
  if (!existsSync(chemin)) return null;
  const contenu = readFileSync(chemin, 'utf8');
  if (contenu === '') return 0;
  const lignes = contenu.split('\n');
  // Un fichier bien formé se termine par \n : le dernier élément du split est alors la chaîne
  // vide APRÈS ce \n, pas une ligne. Le compter rendait le plafond effectif `plafond - 1`, et
  // /purge-contexte insatisfiable — la skill recompte avec wc -l, qui lui ne le compte pas.
  // Symptôme observé : 5 fichiers pile au plafond signalés en dépassement à chaque session.
  if (lignes[lignes.length - 1] === '') lignes.pop();
  return lignes.length;
}

/** Fichiers de contexte dépassant leur plafond. Renvoie [{fichier, lignes, plafond}]. */
export function depassements(cwd) {
  const { plafonds } = lirePlafonds();
  const resultats = [];
  for (const [fichier, plafond] of Object.entries(plafonds)) {
    const n = nbLignes(join(cwd, fichier));
    if (n !== null && n > plafond) resultats.push({ fichier, lignes: n, plafond });
  }
  return resultats;
}

/** true si le fichier appartient au contexte/suivi (par opposition au code applicatif). */
export function estFichierDeSuivi(chemin, fichiersDeSuivi) {
  const base = chemin.split('/').pop();
  return fichiersDeSuivi.includes(base) || chemin.startsWith('plans/');
}

/** Racine du dépôt principal, même appelé depuis un worktree lié : `--git-common-dir` pointe
 *  toujours le `.git` d'origine, là où vivent `.claude/wave.lock` et `.claude/vague/`. */
export function racineDepot(cwd) {
  const commun = git(cwd, 'rev-parse', '--path-format=absolute', '--git-common-dir');
  return commun ? dirname(commun) : cwd;
}

/** Vrai si le cwd est un worktree LIÉ, et non l'arbre principal du dépôt. */
export function worktreeLie(cwd) {
  const propre = git(cwd, 'rev-parse', '--path-format=absolute', '--git-dir');
  const commun = git(cwd, 'rev-parse', '--path-format=absolute', '--git-common-dir');
  return Boolean(propre && commun && resolve(propre) !== resolve(commun));
}

export function vagueParallele(cwd) {
  return existsSync(join(racineDepot(cwd), '.claude', 'wave.lock'));
}

export function repondre(objet) {
  process.stdout.write(JSON.stringify(objet));
  process.exit(0);
}

export function riendafaire() {
  process.exit(0);
}
