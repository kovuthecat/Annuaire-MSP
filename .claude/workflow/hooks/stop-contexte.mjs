// Hook Stop — garde-fou de fin de session.
// Deux vérifications mécaniques (cf. WORKFLOW.md §7) :
//   1. du code a été modifié mais aucun fichier de suivi ne l'a été → /fin-de-tache non déroulée ;
//   2. un fichier de contexte dépasse son plafond de lignes → archivage dû.
// Ne bloque qu'UNE fois par session : si la seconde tentative d'arrêt arrive, on laisse passer
// (l'exécutant a pu avoir une raison légitime — on ne veut pas d'une boucle infinie).

import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  lireEntree, repertoireProjet, estUnDepot, fichiersModifies,
  depassements, estFichierDeSuivi, lirePlafonds, repondre, riendafaire,
  vagueParallele,
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
const marqueurs = join(tmpdir(), 'claude-hooks-templates');
const marqueur = join(marqueurs, `${(entree.session_id || cwd).replace(/[^\w-]/g, '_')}.stop`);
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
