// Hook Stop — garde-fou de fin de session.
// Trois vérifications mécaniques (cf. WORKFLOW.md §7) :
//   1. du code a été modifié mais aucun fichier de suivi ne l'a été → /fin-de-tache non déroulée ;
//   2. une session de plan a commité du code sans déposer son S<k>.revue.md → revue jamais lancée ;
//   3. un fichier de contexte dépasse son plafond de lignes → archivage dû.
// Ne bloque qu'UNE fois par session : si la seconde tentative d'arrêt arrive, on laisse passer
// (l'exécutant a pu avoir une raison légitime — on ne veut pas d'une boucle infinie).

import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import {
  lireEntree, repertoireProjet, estUnDepot, fichiersModifies,
  depassements, estFichierDeSuivi, lirePlafonds, repondre, riendafaire,
  vagueParallele, repereSession, revuesManquantes,
} from './lib.mjs';

const entree = await lireEntree();
const cwd = repertoireProjet(entree);

if (!estUnDepot(cwd)) riendafaire();

const { fichiersDeSuivi } = lirePlafonds();
// `.claude/` n'est ni du code ni du suivi (wave.lock, settings, launch.json) : hors comptage.
const modifies = fichiersModifies(cwd).filter((f) => !f.startsWith('.claude/'));
const code = modifies.filter((f) => !estFichierDeSuivi(f, fichiersDeSuivi));
const suivi = modifies.filter((f) => estFichierDeSuivi(f, fichiersDeSuivi));

const problemes = [];

if (code.length > 0 && suivi.length === 0) {
  const apercu = code.slice(0, 5).join(', ') + (code.length > 5 ? `, … (${code.length} au total)` : '');
  problemes.push(
    `**Fin de session non consignée.** ${code.length} fichier(s) modifié(s) (${apercu}) ` +
    `sans qu'aucun fichier de suivi (statut dans plans/, STATUS.md, VALIDATION.md) ne soit touché. ` +
    `Déroule la skill /fin-de-tache avant de rendre la main.`
  );
}

// Revue de session : le dépôt du `.revue.md` est inconditionnel (`Bloquant : 0` quand il n'y a rien
// à dire), donc un fichier absent ne veut dire qu'une chose — la revue n'a pas tourné. Le mode
// d'échec est silencieux par construction : la revue lancée en arrière-plan en dernier geste tourne
// vraiment, mais son retour arrive dans un tour que plus personne ne lit
// (docs/decisions/2026-09-07-revue-orpheline.md). Sans ce contrôle, un plan entier se clôt sans
// qu'aucune relecture n'ait été déposée.
let repereHead = null;
try {
  const { chemin } = repereSession(entree, cwd, 'head');
  if (existsSync(chemin)) repereHead = readFileSync(chemin, 'utf8').trim();
} catch { /* repère illisible : contrôle désactivé, jamais de faux positif */ }

for (const ref of revuesManquantes(cwd, repereHead)) {
  problemes.push(
    `**Revue de session absente — ${ref}.** Des commits de cette session portent du code sous ` +
    `\`Plan: ${ref}/\`, mais \`plans/${ref}.revue.md\` n'existe pas. Lance l'agent ` +
    `\`relecteur-session\` AU PREMIER PLAN (/fin-de-tache, « Relecture de session ») : c'est LUI qui ` +
    `dépose le fichier. Une revue lancée en arrière-plan comme dernier geste tourne pour rien — ` +
    `son retour arrive dans un tour que plus personne ne lit.`
  );
}

for (const d of depassements(cwd)) {
  problemes.push(
    `**${d.fichier} : ${d.lignes} lignes (plafond ${d.plafond}).** ` +
    `Déroule /purge-contexte sur ce fichier — un fichier de contexte trop long est relu à chaque session.`
  );
}

if (problemes.length === 0) riendafaire();

// Vague parallèle en cours : les fichiers de suivi appartiennent aux sessions de la vague et à
// /fin-de-tache, pas à la session courante (l'orchestrateur a même interdiction d'y toucher).
// La condition est mécanique — ne pas la laisser à la charge du modèle, qui devrait sinon plaider
// « c'est volontaire » en prose contre ce hook.
if (vagueParallele(cwd)) {
  repondre({
    systemMessage:
      `⚠ Vague parallèle en cours (\`.claude/wave.lock\`) — rappel NON bloquant :\n- ${problemes.join('\n- ')}\n` +
      `À traiter en fin de plan, via /fin-de-tache puis /purge-contexte.`,
  });
}

// Garde anti-boucle : un seul blocage par session.
const { dossier: marqueurs, chemin: marqueur } = repereSession(entree, cwd, 'stop');
if (existsSync(marqueur)) {
  repondre({
    systemMessage: `⚠ Contexte encore non conforme (rappel non bloquant) :\n- ${problemes.join('\n- ')}`,
  });
}
mkdirSync(marqueurs, { recursive: true });
writeFileSync(marqueur, new Date().toISOString());

repondre({
  decision: 'block',
  reason:
    `Avant de rendre la main :\n- ${problemes.join('\n- ')}\n\n` +
    `Si c'est volontaire (session d'exploration, vague parallèle en cours), dis-le explicitement ` +
    `et arrête-toi — ce garde-fou ne se redéclenchera pas.`,
});
