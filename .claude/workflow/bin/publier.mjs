#!/usr/bin/env node
// Publie le payload plugin/ vers le dépôt public de distribution kovuthecat/claude-workflow.
//
// POURQUOI CE FICHIER EXISTE
// Le dépôt public est un artefact de distribution à commit unique, republié à chaque version —
// jamais modifié à la main (voir README §Distribution). La procédure documentée est restée 4
// versions sans tourner : recopier une suite de commandes à la main, dans un clone jetable, avec
// un garde-fou à ne pas oublier, est le genre de tâche qui saute quand on est pressé. Ce script
// l'automatise et rend le garde-fou de sécurité impossible à contourner.
//
// USAGE
//   node publier.mjs [--dry-run]
//
//   --dry-run   fait tout sauf le push : construit le payload temporaire, scanne, affiche ce qui
//               serait poussé, puis nettoie. Aucune écriture réseau.
//
// Idempotent : rejouable à l'identique, le dépôt public n'a pas d'historique à préserver
// (--force assumé, cf. README §Distribution — c'est un artefact, pas un historique).

import { execFileSync } from 'node:child_process';
import { readFileSync, mkdtempSync, rmSync, cpSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

const DEPOT_PUBLIC = 'https://github.com/kovuthecat/claude-workflow.git';

// ── Racine du payload ────────────────────────────────────────────────────────
// Résolue depuis son propre emplacement (plugin/bin/publier.mjs → plugin/), jamais depuis
// process.cwd() : le script doit se lancer identiquement peu importe le dossier courant.
const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE_PAYLOAD = dirname(ICI);

const dryRun = process.argv.includes('--dry-run');

const version = (() => {
  const p = join(RACINE_PAYLOAD, '.claude-plugin', 'plugin.json');
  return JSON.parse(readFileSync(p, 'utf8')).version;
})();

const BINAIRES = /\.(png|jpg|jpeg|gif|ico|woff2?|zip)$/i;
// Chemin utilisateur RÉEL — pas les exemples en ellipse de la doc (`C:\Users\…`). Cette regex
// exige un segment alphanumérique après le séparateur, ce que l'ellipse ne fournit pas : elle
// ne matche donc pas les exemples cités dans README §Distribution.
const CHEMIN_PERSONNEL = /[A-Za-z]:\\Users\\[A-Za-z0-9]|\/home\/[a-z0-9]+\/|\/Users\/[a-z0-9]+\//;

function fichiersDe(racine) {
  const out = [];
  const parcourir = (rel) => {
    const abs = join(racine, rel);
    for (const e of readdirSync(abs)) {
      if (e === '.git') continue;
      const relE = rel ? join(rel, e) : e;
      const absE = join(racine, relE);
      if (statSync(absE).isDirectory()) parcourir(relE);
      else out.push(relE);
    }
  };
  parcourir('');
  return out;
}

function scannerCheminsPersonnels(racine, fichiers) {
  const hits = [];
  for (const f of fichiers) {
    if (BINAIRES.test(f)) continue;
    let txt;
    try { txt = readFileSync(join(racine, f), 'utf8'); } catch { continue; } // illisible en utf8 → pas du texte
    const lignes = txt.split('\n');
    for (let i = 0; i < lignes.length; i++) {
      if (CHEMIN_PERSONNEL.test(lignes[i])) hits.push(`${f}:${i + 1}`);
    }
  }
  return hits;
}

function git(args, options = {}) {
  return execFileSync('git', args, { windowsHide: true, stdio: 'pipe', ...options });
}

let tmp;
try {
  // ── Construction du payload dans un dossier jetable ──────────────────────
  // Tout plugin/ part tel quel : c'est déjà le périmètre exact du dépôt public, rien à exclure.
  tmp = mkdtempSync(join(tmpdir(), 'claude-workflow-publier-'));
  cpSync(RACINE_PAYLOAD, tmp, { recursive: true });

  const fichiers = fichiersDe(tmp);

  // ── Garde-fou bloquant : aucun chemin personnel réel ne doit sortir ──────
  const hits = scannerCheminsPersonnels(tmp, fichiers);
  if (hits.length > 0) {
    console.error('publier: chemin(s) personnel(s) détecté(s) dans le payload — publication annulée, rien poussé');
    for (const h of hits) console.error(`  ${h}`);
    process.exit(1);
  }

  console.log(`publier: payload propre — ${fichiers.length} fichiers, version ${version}`);

  if (dryRun) {
    console.log(`publier: --dry-run — payload construit dans ${tmp}`);
    console.log(`publier: aurait poussé vers ${DEPOT_PUBLIC} (HEAD:main, --force) avec le message :`);
    console.log(`  Plugin workflow — marketplace templates (v${version})`);
    process.exit(0);
  }

  // ── git init + commit unique ──────────────────────────────────────────────
  git(['init', '-q'], { cwd: tmp });
  git(['add', '-A'], { cwd: tmp });
  git(
    ['-c', 'user.email=publier@local', '-c', 'user.name=publier', 'commit', '-q', '-m',
      `Plugin workflow — marketplace templates (v${version})`],
    { cwd: tmp },
  );
  const sha = git(['rev-parse', 'HEAD'], { cwd: tmp }).toString().trim();

  // ── Publication ────────────────────────────────────────────────────────────
  execFileSync('git', ['push', '--force', DEPOT_PUBLIC, 'HEAD:main'], { cwd: tmp, windowsHide: true, stdio: 'inherit' });

  // ── Vérification post-push ──────────────────────────────────────────────────
  const distant = git(['ls-remote', DEPOT_PUBLIC, 'main']).toString().trim();
  const shaDistant = distant.split(/\s+/)[0];

  if (shaDistant !== sha) {
    console.error(`publier: SHA distant (${shaDistant || '(vide)'}) ≠ SHA poussé (${sha}) — vérifier manuellement`);
    process.exit(1);
  }

  console.log(`publier: OK — v${version} · ${fichiers.length} fichiers · ${sha} confirmé sur ${DEPOT_PUBLIC}`);
} finally {
  // Nettoyage systématique, y compris en cas d'échec du push ou du garde-fou.
  if (tmp) rmSync(tmp, { recursive: true, force: true });
}
