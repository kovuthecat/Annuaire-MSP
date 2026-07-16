import { normalize } from '../../data/search'
import type { ContactWithMeta } from '../../types/db'

/**
 * Tri de la liste annuaire (maquette l.84 « Tri ▾ », cf. plans/P1/S3.md T6 étape 4).
 * "pertinence" = pas de tri additionnel, on garde l'ordre déjà produit par `filterContacts`
 * (S2, zone verrouillée — cf. plans/P1/S3.md §Si bloqué : le tri ne modifie pas `src/data/search.ts`).
 */
export type SortOption = 'pertinence' | 'nom' | 'arrondissement'

/** Extrait la partie numérique d'un arrondissement ("20e" -> 20) ; sinon +Infinity (classé après). */
function arrondissementRank(value: string | null): number {
  if (!value) return Number.POSITIVE_INFINITY
  const match = /\d+/.exec(value)
  return match ? Number(match[0]) : Number.POSITIVE_INFINITY
}

export function sortContacts(contacts: ContactWithMeta[], sort: SortOption): ContactWithMeta[] {
  if (sort === 'pertinence') return contacts

  const sorted = [...contacts]
  if (sort === 'nom') {
    sorted.sort((a, b) => normalize(a.nom).localeCompare(normalize(b.nom)))
    return sorted
  }
  // arrondissement
  sorted.sort((a, b) => {
    const diff = arrondissementRank(a.arrondissement) - arrondissementRank(b.arrondissement)
    if (diff !== 0) return diff
    return normalize(a.nom).localeCompare(normalize(b.nom))
  })
  return sorted
}
