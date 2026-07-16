import type { PrendNouveaux, SecteurConv } from '../../types/db'

/**
 * Petits utilitaires purs partagés par les sous-composants de la fiche (cf. plans/P1/S4.md T7).
 * Même format de date que `ContactRow.formatDate` (S3) — cohérence entre ligne d'annuaire et fiche.
 */

/** "12/03/2026" — même format court que `ContactRow` (compact) pour la fiche (detailed). */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR')
}

/** Une valeur "ressemble" à une URL http(s) → rendue en lien cliquable plutôt qu'en texte brut. */
export function isUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim())
}

export const PREND_NOUVEAUX_LABELS: Record<PrendNouveaux, string> = {
  oui: 'Oui',
  non: 'Non',
  liste_attente: "Liste d'attente",
  inconnu: 'Inconnu',
}

export const SECTEUR_CONV_LABELS: Record<SecteurConv, string> = {
  '1': 'Secteur 1',
  '2': 'Secteur 2',
  centre: 'Centre',
  non_conv: 'Non conventionné',
}
