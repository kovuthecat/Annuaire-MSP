import { normalize, relevanceScore } from '../../data/search'
import { coordsOf, haversineKm } from '../proximite/geo'
import type { LatLng } from '../proximite/geo'
import type { ContactWithMeta } from '../../types/db'

/**
 * Tri de la liste annuaire (maquette l.84 « Tri ▾ », cf. plans/P1/S3.md T6 étape 4 ;
 * option « Distance » ajoutée en plans/P3/S2.md T4).
 * "pertinence" = classement par `relevanceScore` (search.ts) **quand une requête est saisie** — un
 * match sur le nom prime sur un match dans un commentaire (cf. DECISIONS.md 2026-07-18) ; sans
 * requête, on garde l'ordre déjà produit par `filterContacts` (aucune pertinence à départager).
 */
export type SortOption = 'pertinence' | 'nom' | 'arrondissement' | 'distance'

/** Extrait la partie numérique d'un arrondissement ("20e" -> 20) ; sinon +Infinity (classé après). */
function arrondissementRank(value: string | null): number {
  if (!value) return Number.POSITIVE_INFINITY
  const match = /\d+/.exec(value)
  return match ? Number(match[0]) : Number.POSITIVE_INFINITY
}

/**
 * `reference` n'est utilisé que par le tri "distance", `query` que par le tri "pertinence" (ignorés
 * sinon). Les fiches sans coordonnées vont toujours en fin de liste (jamais une fausse distance).
 */
export function sortContacts(
  contacts: ContactWithMeta[],
  sort: SortOption,
  reference: LatLng,
  query = '',
): ContactWithMeta[] {
  if (sort === 'pertinence') {
    // Sans requête, aucun signal de pertinence : on garde l'ordre de `filterContacts`.
    if (!query.trim()) return contacts
    // Score calculé une fois par contact (décoration), puis tri décroissant, nom en départage.
    return contacts
      .map((contact) => ({ contact, score: relevanceScore(contact, query) }))
      .sort((a, b) => b.score - a.score || normalize(a.contact.nom).localeCompare(normalize(b.contact.nom)))
      .map((entry) => entry.contact)
  }

  const sorted = [...contacts]
  if (sort === 'nom') {
    sorted.sort((a, b) => normalize(a.nom).localeCompare(normalize(b.nom)))
    return sorted
  }
  if (sort === 'distance') {
    sorted.sort((a, b) => {
      const coordsA = coordsOf(a)
      const coordsB = coordsOf(b)
      if (!coordsA && !coordsB) return normalize(a.nom).localeCompare(normalize(b.nom))
      if (!coordsA) return 1
      if (!coordsB) return -1
      const diff = haversineKm(reference, coordsA) - haversineKm(reference, coordsB)
      if (diff !== 0) return diff
      return normalize(a.nom).localeCompare(normalize(b.nom))
    })
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
